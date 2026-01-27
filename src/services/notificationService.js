import { getMessaging, requestPermission, getToken, onTokenRefresh, onMessage, setBackgroundMessageHandler, onNotificationOpenedApp, getInitialNotification, hasPermission, AuthorizationStatus } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Notification Service for KNI Owner App
 * Handles Firebase Cloud Messaging (FCM) and local notifications
 */

class NotificationService {
  navigationRef = null;

  /**
   * Initialize notification service
   * Call this in App.js on mount
   */
  async initialize() {
    try {
      console.log('🔔 Initializing notification service');
      await this.setupFCM();
      await this.setupNotificationListeners();

      // If user is already logged in, register the FCM token
      const userToken = await AsyncStorage.getItem('userToken');
      const fcmTokenRegistered = await AsyncStorage.getItem('fcmTokenRegistered');
      if (userToken && !fcmTokenRegistered) {
        console.log('📤 User already logged in, registering FCM token');
        await this.registerTokenAfterLogin();
      }

      console.log('✅ Notification service initialized');
    } catch (error) {
      console.error('❌ Notification service initialization error:', error);
    }
  }

  /**
   * Set navigation reference for handling notification taps
   * @param {Object} ref - Navigation ref from React Navigation
   */
  setNavigationRef(ref) {
    this.navigationRef = ref;
  }

  /**
   * Setup Firebase Cloud Messaging
   * Note: Token registration with backend is deferred until user is authenticated
   */
  async setupFCM() {
    try {
      // Request permission
      const authStatus = await requestPermission(getMessaging());
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        console.log('🚫 Push notification permission denied');
        return;
      }

      console.log('✅ Push notification permission granted');

      // Get FCM token and store locally (don't register with backend yet)
      const token = await getToken(getMessaging());
      console.log('📱 FCM Token:', token);

      // Store token locally for later registration after login
      await AsyncStorage.setItem('fcmToken', token);

      // Listen for token refresh - only register if user is authenticated
      onTokenRefresh(getMessaging(), async (newToken) => {
        console.log('🔄 FCM token refreshed:', newToken);
        await AsyncStorage.setItem('fcmToken', newToken);

        // Only register with backend if user is authenticated
        const userToken = await AsyncStorage.getItem('userToken');
        if (userToken) {
          await this.registerToken(newToken);
        }
      });

    } catch (error) {
      console.error('❌ FCM setup error:', error);
    }
  }

  /**
   * Register FCM token with backend
   * @param {string} token - FCM token
   */
  async registerToken(token) {
    try {
      console.log('📤 Registering FCM token with backend');

      const response = await api.post('/notifications/register-token', {
        token: token,
      });

      if (response.data.ok) {
        await AsyncStorage.setItem('fcmTokenRegistered', 'true');
        console.log('✅ FCM token registered successfully');
      } else {
        console.error('❌ Failed to register FCM token:', response.data.error);
      }
    } catch (error) {
      console.error('❌ Register FCM token error:', error);
    }
  }

  /**
   * Register stored FCM token after user login
   * Call this method after successful authentication
   */
  async registerTokenAfterLogin() {
    try {
      const token = await AsyncStorage.getItem('fcmToken');
      if (token) {
        console.log('📤 Registering FCM token after login');
        await this.registerToken(token);
      } else {
        console.log('⚠️ No FCM token found to register');
      }
    } catch (error) {
      console.error('❌ Register token after login error:', error);
    }
  }

  /**
   * Unregister FCM token from backend
   */
  async unregisterToken() {
    try {
      const token = await AsyncStorage.getItem('fcmToken');
      if (!token) return;

      console.log('📤 Unregistering FCM token from backend');

      await api.post('/notifications/unregister-token', {
        token: token,
      });

      // Clear the registered flag so it can be re-registered on next login
      await AsyncStorage.removeItem('fcmTokenRegistered');
      console.log('✅ FCM token unregistered successfully');
    } catch (error) {
      console.error('❌ Unregister FCM token error:', error);
    }
  }

  /**
   * Setup notification listeners
   */
  async setupNotificationListeners() {
    // Foreground messages
    onMessage(getMessaging(), async (remoteMessage) => {
      console.log('📬 Foreground notification received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Background messages (when app is in background but not killed)
    setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
      console.log('📬 Background notification received:', remoteMessage);
      await this.displayNotification(remoteMessage);
    });

    // Handle notification opened app from background/killed state
    onNotificationOpenedApp(getMessaging(), (remoteMessage) => {
      console.log('📱 Notification opened app from background:', remoteMessage);
      this.handleNotificationNavigation(remoteMessage);
    });

    // Check if app was opened by a notification when completely killed
    const initialNotification = await getInitialNotification(getMessaging());
    if (initialNotification) {
      console.log('📱 App opened by notification (killed state):', initialNotification);
      // Handle navigation after a slight delay to ensure app is ready
      setTimeout(() => {
        this.handleNotificationNavigation(initialNotification);
      }, 2000);
    }
  }

  /**
   * Display local notification using Notifee
   * @param {Object} remoteMessage - FCM remote message
   */
  async displayNotification(remoteMessage) {
    try {
      // Create notification channel (Android)
      const channelId = await notifee.createChannel({
        id: 'kni-owner-default',
        name: 'KNI Owner Notifications',
        importance: 4, // High importance
        sound: 'default',
      });

      // Display notification
      await notifee.displayNotification({
        title: remoteMessage.notification?.title || 'Notification',
        body: remoteMessage.notification?.body || '',
        data: remoteMessage.data,
        android: {
          channelId,
          smallIcon: 'ic_launcher',
          importance: 4,
          pressAction: {
            id: 'default',
          },
        },
        ios: {
          sound: 'default',
        },
      });

      console.log('✅ Notification displayed');
    } catch (error) {
      console.error('❌ Display notification error:', error);
    }
  }

  /**
   * Handle notification tap navigation
   * @param {Object} remoteMessage - FCM remote message
   */
  handleNotificationNavigation(remoteMessage) {
    const { data } = remoteMessage;

    if (!this.navigationRef || !this.navigationRef.current) {
      console.log('⚠️ Navigation ref not set, cannot navigate');
      return;
    }

    console.log('🧭 Handling notification navigation:', data);

    try {
      // Navigate based on notification type
      if (data?.type === 'booking' && data?.bookingId) {
        this.navigationRef.current.navigate('RequestDetail', {
          id: data.bookingId,
        });
      } else if (data?.type === 'order' && data?.orderId) {
        this.navigationRef.current.navigate('OrderTracking', {
          orderId: data.orderId,
        });
      } else if (data?.type === 'equipment' && data?.equipmentId) {
        this.navigationRef.current.navigate('EquipmentProfile', {
          equipmentId: data.equipmentId,
        });
      } else if (data?.type === 'amc' && data?.amcId) {
        this.navigationRef.current.navigate('MyAmcs');
      } else {
        // Default: Navigate to notifications screen
        this.navigationRef.current.navigate('Notifications');
      }
    } catch (error) {
      console.error('❌ Notification navigation error:', error);
    }
  }

  /**
   * Request notification permissions (iOS)
   */
  async requestPermissions() {
    try {
      const authStatus = await requestPermission(getMessaging());
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('❌ Request permissions error:', error);
      return false;
    }
  }

  /**
   * Check if notifications are enabled
   */
  async checkPermissions() {
    try {
      const authStatus = await hasPermission(getMessaging());
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error('❌ Check permissions error:', error);
      return false;
    }
  }
}

// Export singleton instance
export default new NotificationService();
