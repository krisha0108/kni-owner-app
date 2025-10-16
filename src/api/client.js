// import axios from 'axios';
// const api = axios.create({
//   baseURL: 'http://192.168.29.222:8000/api', // :point_left: yahan apne PC ka Wi-Fi IP daalo
//   timeout: 10000,
// });
// export default api;


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const API_BASE_URL = 'http://192.168.29.54:8000/api';
const IMAGE_BASE_URL = 'http://192.168.29.54:8000/storage'; 
const api = axios.create({
  baseURL: API_BASE_URL, // :point_left: your backend base
  timeout: 20000,
});
// Automatically attach token if it exists in AsyncStorage
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('userToken'); // we set this in login/register
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