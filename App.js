// // App.js
// import React from 'react';
// import { NavigationContainer } from '@react-navigation/native';
// import AppNavigator from './src/navigation/AppNavigator';

// export default function App() {
//   return (
//     <NavigationContainer>
//       <AppNavigator />
//     </NavigationContainer>
//   );
// }
import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { Alert, PermissionsAndroid, Platform } from 'react-native';
import notificationService from './src/services/notificationService';

export default function App() {
  const navigationRef = useRef(null);

  useNotifications(); // app-wide notification handling

  // Set navigation ref for notification service
  useEffect(() => {
    if (navigationRef.current) {
      notificationService.setNavigationRef(navigationRef);
    }
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
        <AppNavigator />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
}

function useNotifications() {
  useEffect(() => {
    const requestPermission = async () => {
      try {
        // Create notification channel for Android
        await notifee.createChannel({
          id: 'high_importance_channel',
          name: 'High Importance Notifications',
          importance: AndroidImportance.HIGH,
        });

        // For Android 13+ request POST_NOTIFICATIONS permission
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            {
              title: 'Notification Permission',
              message: 'This app needs permission to send you notifications about restaurant approvals and updates.',
              buttonNeutral: 'Ask Me Later',
              buttonNegative: 'Cancel',
              buttonPositive: 'OK',
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('❌ Android notification permission denied');
            Alert.alert(
              'Notification Permission Required',
              'Please enable notifications in settings to receive updates about your restaurant.',
            );
            return;
          }
        }

        // Request Firebase messaging permission (iOS)
        const authStatus = await messaging().requestPermission({
          alert: true,
          badge: true,
          sound: true,
        });

        const enabled =
          authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
          authStatus === messaging.AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Push permission granted:', authStatus);

          // Initialize notification service (registers token with backend)
          await notificationService.initialize();
        } else {
          console.log('❌ Push permission denied:', authStatus);
        }
      } catch (error) {
        console.log('Permission request error:', error);
      }
    };

    requestPermission();

    // Foreground notifications
    const unsubscribe = messaging().onMessage(async remoteMessage => {
      console.log('📩 Foreground message:', remoteMessage);

      // Show notification with Notifee
      await notifee.displayNotification({
        title: remoteMessage.notification?.title || remoteMessage.data?.title || 'Notification',
        body: remoteMessage.notification?.body || remoteMessage.data?.body || '',
        android: {
          channelId: 'high_importance_channel',
        },
      });
    });

    // App opened from background
    const unsubscribeOpened = messaging().onNotificationOpenedApp(remoteMessage => {
      console.log('🚀 App opened from background:', remoteMessage);
      if (remoteMessage.data?.screen) {
        console.log('👉 Navigate to:', remoteMessage.data.screen);
      }
    });

    // App opened from quit state
    messaging()
      .getInitialNotification()
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 App opened from quit state:', remoteMessage);
          if (remoteMessage.data?.screen) {
            console.log('👉 Navigate to:', remoteMessage.data.screen);
          }
        }
      });

    return () => {
      unsubscribe();
      unsubscribeOpened();
    };
  }, []);
}
