import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';

// ============================================
// KNI-Super-App Backend Integration
// ============================================

// NOTE: Update LOCAL_IP with your computer's local IP address
// To find your IP: Windows (ipconfig) | Mac/Linux (ifconfig)
// Using 'localhost' here requires `adb reverse tcp:3000 tcp:3000` (USB-tethered device) —
// avoids the WiFi-adapter flakiness that causes intermittent "Network Error" over LAN.

// const LOCAL_IP = '192.168.29.54';

const LOCAL_IP = 'localhost';

// API URLs
const DEV_API_BASE_URL = `http://${LOCAL_IP}:3000/api`;
const DEV_IMAGE_BASE_URL = `http://${LOCAL_IP}:3000`;
const PROD_API_BASE_URL = 'https://kitchennetworkinternational.com/api';
const PROD_IMAGE_BASE_URL = 'https://kitchennetworkinternational.com';

// ⚠️ SWITCH: true = LOCAL, false = PRODUCTION
const IS_DEV = false;

const API_BASE_URL = IS_DEV ? DEV_API_BASE_URL : PROD_API_BASE_URL;
const IMAGE_BASE_URL = IS_DEV ? DEV_IMAGE_BASE_URL : PROD_IMAGE_BASE_URL;

if (__DEV__) {
  console.log('🔧 API Configuration:', {
    environment: IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION',
    baseURL: API_BASE_URL,
    imageBaseURL: IMAGE_BASE_URL,
  });
}

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Request interceptor - Add token from AsyncStorage
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        if (__DEV__) console.log('📤 Request with token:', config.method.toUpperCase(), config.url);
      } else {
        if (__DEV__) console.log('📤 Request without token:', config.method.toUpperCase(), config.url);
      }
    } catch (err) {
      if (__DEV__) console.error('❌ Error fetching token:', err);
    }

    // For FormData uploads, remove Content-Type so React Native
    // auto-sets it with the correct multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => {
    if (__DEV__) console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and session expiry
api.interceptors.response.use(
  (response) => {
    if (__DEV__) console.log('✅ Response:', response.config.method.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    if (__DEV__) {
      const errorDetails = {
        url: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.response?.data?.error || error.message,
      };
      // Requests the backend rejected with a known, app-handled reason (e.g. pending
      // approval, unverified email) aren't bugs — log them quietly instead of as a
      // LogBox red-screen error so real failures stay easy to spot.
      const isExpectedAppError = !!error.response?.data?.code;
      if (isExpectedAppError) {
        console.log('ℹ️ Response error (handled):', JSON.stringify(errorDetails, null, 2));
      } else {
        console.error('❌ Response error:', JSON.stringify(errorDetails, null, 2));
      }
    }

    if (error.response?.status === 401) {
      if (__DEV__) console.log('🔒 Unauthorized - Clearing session');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }

    if (error.response?.status === 403) {
      if (__DEV__) console.log('🚫 Forbidden - Account may be pending approval or rejected');
    }

    return Promise.reject(error);
  }
);

/**
 * Upload file using native fetch (axios FormData is unreliable on Android).
 * Usage: const data = await uploadFile(formData);
 * Returns the parsed JSON response (same format as api.post would return).
 */
const uploadFile = async (formData) => {
  const token = await AsyncStorage.getItem('userToken');
  console.log('📤 Upload via fetch: POST /upload');

  const response = await fetch(`${API_BASE_URL}/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();
  console.log(response.ok ? '✅ Upload success' : '❌ Upload failed:', response.status);

  if (!response.ok) {
    throw { response: { status: response.status, data } };
  }
  return { data };
};

// Helper function to get full image URL
export const getImageUrl = (relativePath) => {
  if (!relativePath) return null;

  if (relativePath.startsWith('http://') || relativePath.startsWith('https://')) {
    return relativePath;
  }

  if (relativePath.startsWith('/uploads') || relativePath.startsWith('/public')) {
    return `${IMAGE_BASE_URL}${relativePath}`;
  }

  return `${IMAGE_BASE_URL}/uploads/${relativePath}`;
};

// Helper function to format currency
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/**
 * Upload document (image or PDF) using /upload-document endpoint.
 */
const uploadDocument = async (formData) => {
  const token = await AsyncStorage.getItem('userToken');
  console.log('📤 Upload via fetch: POST /upload-document');

  const response = await fetch(`${API_BASE_URL}/upload-document`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  const data = await response.json();
  console.log(response.ok ? '✅ Doc upload success' : '❌ Doc upload failed:', response.status);

  if (!response.ok) {
    throw { response: { status: response.status, data } };
  }
  return { data };
};

/**
 * Download an authenticated file (PDF, invoice, etc.) to local storage.
 * Opening a protected download URL directly via Linking.openURL() carries no
 * auth header and always 401s - this goes through RNFS with the Bearer token
 * attached instead, and returns a local file:// path the caller can pass to
 * Share.share().
 * `apiPath` is relative to API_BASE_URL, e.g. `/owner/amc-contracts/{id}/document`.
 *
 * Saved under CachesDirectoryPath, not DocumentDirectoryPath - react-native-share's
 * bundled Android FileProvider (share_download_paths.xml) only exposes the cache
 * dir and external Download/, not the app's files dir. A file saved outside those
 * paths makes FileProvider.getUriForFile() throw for every configured authority,
 * which silently resolves to a null Uri and crashes deeper in ClipData.newUri()
 * with "Attempt to invoke virtual method '...Uri.getScheme()' on a null object
 * reference" - a very indirect symptom of the real (wrong directory) cause.
 */
const downloadAuthenticatedFile = async (apiPath, filename) => {
  const token = await AsyncStorage.getItem('userToken');
  const toFile = `${RNFS.CachesDirectoryPath}/${filename}`;

  const result = await RNFS.downloadFile({
    fromUrl: `${API_BASE_URL}${apiPath}`,
    toFile,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  }).promise;

  if (result.statusCode && result.statusCode >= 400) {
    throw new Error(`Download failed (${result.statusCode})`);
  }

  return toFile;
};

export { api, API_BASE_URL, IMAGE_BASE_URL, uploadFile, uploadDocument, downloadAuthenticatedFile };
