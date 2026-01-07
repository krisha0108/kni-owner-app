import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Production URLs
const API_BASE_URL = 'https://app.kitchennetworkinternational.com/api';
const IMAGE_BASE_URL = 'https://app.kitchennetworkinternational.com/storage';

// Local development URLs (uncomment for local testing):
// const API_BASE_URL = 'http://192.168.29.54:8000/api';
// const IMAGE_BASE_URL = 'http://192.168.29.54:8000/storage';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
});

// Automatically attach token if it exists in AsyncStorage
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken');
    console.log('Fetched token from storage:', token);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.log('Error fetching token:', err);
  }
  return config;
});

export { api, IMAGE_BASE_URL };
