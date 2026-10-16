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
import React, { useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import AppNavigator from './src/navigation/AppNavigator';
import { RestaurantProvider } from './src/context/RestaurantContext';
import ErrorBoundary from './src/components/ErrorBoundary';
import OfflineBanner from './src/components/OfflineBanner';
import AppAlertHost from './src/components/AppAlertHost';
import AppAlert from './src/utils/AppAlert';
import { getMessaging, requestPermission as requestFCMPermission, onNotificationOpenedApp, getInitialNotification, AuthorizationStatus } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import { PermissionsAndroid, Platform, Modal } from 'react-native';
import notificationService from './src/services/notificationService';
import { checkForceUpdate, checkPlayStoreUpdate } from './src/services/appUpdateService';
import ForceUpdateScreen from './src/screens/ForceUpdateScreen';

export default function App() {
  const navigationRef = useRef(null);
  const [updateInfo, setUpdateInfo] = useState(null);
  const [showReminder, setShowReminder] = useState(false);

  useNotifications(); // app-wide notification handling

  // Set navigation ref for notification service
  useEffect(() => {
    if (navigationRef.current) {
      notificationService.setNavigationRef(navigationRef);
    }
  }, []);

  // App Version / Force Update - see src/services/appUpdateService.js for
  // the two checks this combines (Admin Panel kill-switch + Play Store's
  // own automatic update detection).
  useEffect(() => {
    (async () => {
      const info = await checkForceUpdate();
      if (info) {
        setUpdateInfo(info);
        if (!info.blocking) setShowReminder(true);
      }
      checkPlayStoreUpdate();
    })();
  }, []);

  // A mandatory update replaces the entire app - nothing else should be
  // reachable (no navigation, no back button) until the user updates.
  if (updateInfo?.blocking) {
    return (
      <ForceUpdateScreen
        message={updateInfo.message}
        storeUrl={updateInfo.storeUrl}
        latestVersionName={updateInfo.latestVersionName}
        dismissible={false}
      />
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <KeyboardProvider statusBarTranslucent navigationBarTranslucent>
          <OfflineBanner />
          <RestaurantProvider>
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </RestaurantProvider>
          <AppAlertHost />
          {updateInfo && !updateInfo.blocking && (
            <Modal visible={showReminder} animationType="slide" onRequestClose={() => setShowReminder(false)}>
              <ForceUpdateScreen
                message={updateInfo.message}
                storeUrl={updateInfo.storeUrl}
                latestVersionName={updateInfo.latestVersionName}
                dismissible
                onDismiss={() => setShowReminder(false)}
              />
            </Modal>
          )}
        </KeyboardProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function useNotifications() {
  useEffect(() => {
    console.log('🔔 useNotifications hook started');

    const requestPermission = async () => {
      try {
        console.log('📋 Starting permission request...');
        console.log('📱 Platform:', Platform.OS, 'Version:', Platform.Version);

        // Create notification channel for Android
        console.log('📢 Creating notification channel...');
        await notifee.createChannel({
          id: 'high_importance_channel',
          name: 'High Importance Notifications',
          importance: AndroidImportance.HIGH,
        });
        console.log('✅ Notification channel created');

        // For Android 13+ request POST_NOTIFICATIONS permission
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          console.log('📋 Requesting Android POST_NOTIFICATIONS permission...');
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
          console.log('📋 Android permission result:', granted);

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('❌ Android notification permission denied');
            AppAlert.alert(
              'Notification Permission Required',
              'Please enable notifications in settings to receive updates about your restaurant.',
            );
            return;
          }
          console.log('✅ Android notification permission granted');
        }

        // Request Firebase messaging permission (iOS)
        console.log('🔥 Requesting Firebase messaging permission...');
        const authStatus = await requestFCMPermission(getMessaging(), {
          alert: true,
          badge: true,
          sound: true,
        });
        console.log('🔥 Firebase auth status:', authStatus);

        const enabled =
          authStatus === AuthorizationStatus.AUTHORIZED ||
          authStatus === AuthorizationStatus.PROVISIONAL;

        if (enabled) {
          console.log('✅ Push permission granted:', authStatus);

          // Initialize notification service (registers token with backend)
          console.log('🔔 Calling notificationService.initialize()...');
          await notificationService.initialize();
          console.log('✅ notificationService.initialize() completed');
        } else {
          console.log('❌ Push permission denied:', authStatus);
        }
      } catch (error) {
        console.log('❌ Permission request error:', error);
        console.log('❌ Error details:', error.message, error.code);
      }
    };

    requestPermission();

    // NOTE: Foreground notification display is handled by notificationService.js
    // Do NOT add onMessage display here - it causes duplicate notifications

    // App opened from background
    const unsubscribeOpened = onNotificationOpenedApp(getMessaging(), remoteMessage => {
      console.log('🚀 App opened from background:', remoteMessage);
      if (remoteMessage.data?.screen) {
        console.log('👉 Navigate to:', remoteMessage.data.screen);
      }
    });

    // App opened from quit state
    getInitialNotification(getMessaging())
      .then(remoteMessage => {
        if (remoteMessage) {
          console.log('🚀 App opened from quit state:', remoteMessage);
          if (remoteMessage.data?.screen) {
            console.log('👉 Navigate to:', remoteMessage.data.screen);
          }
        }
      });

    return () => {
      unsubscribeOpened();
    };
  }, []);
}
