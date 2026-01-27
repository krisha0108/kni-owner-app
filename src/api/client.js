import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// KNI-Super-App Backend Integration
// ============================================

// NOTE: Update LOCAL_IP with your computer's local IP address
// To find your IP: Windows (ipconfig) | Mac/Linux (ifconfig)
const LOCAL_IP = '192.168.29.54';

// API URLs
const DEV_API_BASE_URL = `http://${LOCAL_IP}:3000/api`;
const DEV_IMAGE_BASE_URL = `http://${LOCAL_IP}:3000`;
const PROD_API_BASE_URL = 'https://kitchennetworkinternational.com/api';
const PROD_IMAGE_BASE_URL = 'https://kitchennetworkinternational.com';

// ⚠️ SWITCH: true = LOCAL, false = PRODUCTION
const IS_DEV = false;

const API_BASE_URL = IS_DEV ? DEV_API_BASE_URL : PROD_API_BASE_URL;
const IMAGE_BASE_URL = IS_DEV ? DEV_IMAGE_BASE_URL : PROD_IMAGE_BASE_URL;

console.log('🔧 API Configuration:', {
  environment: IS_DEV ? 'DEVELOPMENT' : 'PRODUCTION',
  baseURL: API_BASE_URL,
  imageBaseURL: IMAGE_BASE_URL,
});

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
        console.log('📤 Request with token:', config.method.toUpperCase(), config.url);
      } else {
        console.log('📤 Request without token:', config.method.toUpperCase(), config.url);
      }
    } catch (err) {
      console.error('❌ Error fetching token:', err);
    }
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor - Handle errors and session expiry
api.interceptors.response.use(
  (response) => {
    console.log('✅ Response:', response.config.method.toUpperCase(), response.config.url, response.status);
    return response;
  },
  async (error) => {
    const errorDetails = {
      url: error.config?.url,
      status: error.response?.status,
      data: error.response?.data,
      message: error.response?.data?.error || error.message,
    };
    console.error('❌ Response error:', JSON.stringify(errorDetails, null, 2));

    if (error.response?.status === 401) {
      console.log('🔒 Unauthorized - Clearing session');
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }

    if (error.response?.status === 403) {
      console.log('🚫 Forbidden - Account may be pending approval or rejected');
    }

    return Promise.reject(error);
  }
);

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

export { api, API_BASE_URL, IMAGE_BASE_URL };
