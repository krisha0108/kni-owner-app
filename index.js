/**
 * @format
 */

// IMPORTANT: Must be first import for gesture-handler to work
import 'react-native-gesture-handler';

import { AppRegistry, Platform } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler, getInitialNotification } from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

// Create notification channel immediately for Android
// This ensures the channel exists before any background messages arrive
async function createNotificationChannel() {
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'high_importance_channel',
      name: 'High Importance Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
    console.log('📢 Notification channel created');
  }
}
createNotificationChannel();

// Register background handler - MUST be done at top level
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
  console.log('📩 Background message received:', remoteMessage);

  // Ensure channel exists before displaying notification
  if (Platform.OS === 'android') {
    await notifee.createChannel({
      id: 'high_importance_channel',
      name: 'High Importance Notifications',
      importance: AndroidImportance.HIGH,
      sound: 'default',
      vibration: true,
    });
  }

  // Show a local notification using Notifee
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || remoteMessage.data?.title || 'KNI Notification',
    body: remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new message',
    android: {
      channelId: 'high_importance_channel',
      importance: AndroidImportance.HIGH,
      pressAction: {
        id: 'default',
      },
      sound: 'default',
    },
    ios: {
      sound: 'default',
    },
  });
});

// Handle notification click when app closed (quit state)
getInitialNotification(getMessaging())
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('🚀 App opened from quit state:', remoteMessage);
      // yaha navigate kara sakti ho based on remoteMessage.data.screen
    }
  });

AppRegistry.registerComponent(appName, () => App);
