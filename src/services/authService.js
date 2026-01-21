import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Authentication Service for KNI Owner App
 * Handles login, OTP verification, session management
 */

class AuthService {

  /**
   * Send OTP to phone number
   * @param {string} phone - Phone number (10-15 digits)
   * @returns {Promise<string>} OTP ID for verification
   */
  async sendOTP(phone) {
    try {
      console.log('📱 Sending OTP to:', phone);

      const response = await api.post('/auth/send-otp', {
        phone: phone,
        purpose: 'LOGIN'
      });

      if (response.data.ok) {
        console.log('✅ OTP sent successfully');
        return response.data.data.otpId;
      } else {
        throw new Error(response.data.error || 'Failed to send OTP');
      }
    } catch (error) {
      console.error('❌ Send OTP error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to send OTP'
      );
    }
  }

  /**
   * Verify OTP code
   * @param {string} phone - Phone number
   * @param {string} code - OTP code (6 digits)
   * @returns {Promise<Object>} User data
   */
  async verifyOTP(phone, code) {
    try {
      console.log('🔐 Verifying OTP for:', phone);

      const response = await api.post('/auth/verify-otp', {
        phone: phone,
        code: code,
        purpose: 'LOGIN'
      });

      if (response.data.ok) {
        console.log('✅ OTP verified successfully');

        // Get user session after OTP verification
        const userData = await this.getCurrentUser();

        // Check if user is OWNER role
        if (userData && userData.role === 'OWNER') {
          await this.saveUserSession(userData);
          return userData;
        } else {
          throw new Error('Invalid user role. This app is for restaurant owners only.');
        }
      } else {
        throw new Error(response.data.error || 'Invalid OTP');
      }
    } catch (error) {
      console.error('❌ Verify OTP error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to verify OTP'
      );
    }
  }

  /**
   * Login with email and password
   * @param {string} email - Email address
   * @param {string} password - Password
   * @returns {Promise<Object>} User data
   */
  async loginWithPassword(email, password) {
    try {
      console.log('🔐 Logging in with email:', email);

      const response = await api.post('/auth/login', {
        email: email,
        password: password
      });

      if (response.data.ok) {
        const userData = response.data.data.user;
        const token = response.data.data.token;

        // Check if user is OWNER role
        if (userData.role === 'OWNER') {
          // Store the session token for mobile auth
          if (token) {
            await AsyncStorage.setItem('userToken', token);
            // Set the token in axios default headers
            api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          }

          await this.saveUserSession(userData);
          console.log('✅ Login successful');
          return userData;
        } else {
          throw new Error('Invalid user role. This app is for restaurant owners only.');
        }
      } else {
        throw new Error(response.data.error || 'Invalid credentials');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Login failed'
      );
    }
  }

  /**
   * Get current logged-in user from session
   * @returns {Promise<Object>} User data
   */
  async getCurrentUser() {
    try {
      console.log('👤 Fetching current user session');

      const response = await api.get('/auth/me');

      if (response.data.ok) {
        return response.data.data.user;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Get current user error:', error);
      return null;
    }
  }

  /**
   * Save user session to AsyncStorage
   * @param {Object} userData - User data to save
   */
  async saveUserSession(userData) {
    try {
      await AsyncStorage.setItem('userData', JSON.stringify(userData));
      console.log('💾 User session saved');
    } catch (error) {
      console.error('❌ Save session error:', error);
    }
  }

  /**
   * Get user session from AsyncStorage
   * @returns {Promise<Object|null>} User data or null
   */
  async getUserSession() {
    try {
      const userDataJson = await AsyncStorage.getItem('userData');
      if (userDataJson) {
        return JSON.parse(userDataJson);
      }
      return null;
    } catch (error) {
      console.error('❌ Get session error:', error);
      return null;
    }
  }

  /**
   * Logout user and clear session
   */
  async logout() {
    try {
      console.log('👋 Logging out');

      // Call backend logout endpoint
      await api.post('/auth/logout');

      // Clear local storage
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');

      console.log('✅ Logout successful');
    } catch (error) {
      console.error('❌ Logout error:', error);
      // Still clear local storage even if backend call fails
      await AsyncStorage.removeItem('userToken');
      await AsyncStorage.removeItem('userData');
    }
  }

  /**
   * Check if user session is valid
   * @returns {Promise<boolean>} True if session is valid
   */
  async isSessionValid() {
    try {
      const userData = await this.getCurrentUser();
      return userData !== null && userData.role === 'OWNER';
    } catch (error) {
      return false;
    }
  }

  /**
   * Get user's restaurants (accessible restaurants)
   * @returns {Promise<Array>} List of restaurants
   */
  async getAccessibleRestaurants() {
    try {
      console.log('🏪 Fetching accessible restaurants');

      const response = await api.get('/owner/restaurants/accessible');

      if (response.data.ok) {
        return response.data.data;
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Get restaurants error:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new AuthService();
