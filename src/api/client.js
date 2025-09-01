// import axios from 'axios';
// const api = axios.create({
//   baseURL: 'http://192.168.29.222:8000/api', // :point_left: yahan apne PC ka Wi-Fi IP daalo
//   timeout: 10000,
// });
// export default api;


import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
const api = axios.create({
  baseURL: 'http://192.168.29.222:8000/api', // :point_left: your backend base
  timeout: 20000,
});
// Automatically attach token if it exists in AsyncStorage
api.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem('ownerToken'); // we set this in login/register
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (err) {
    console.log('Error fetching token:', err);
  }
  return config;
});
export default api;