/**
 * @format
 */

// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';

// AppRegistry.registerComponent(appName, () => App);
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import messaging from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

// Register background handler - MUST be done at top level
messaging().setBackgroundMessageHandler(async remoteMessage => {
  console.log('📩 Background message received:', remoteMessage);

  // Show a local notification using Notifee
  await notifee.displayNotification({
    title: remoteMessage.notification?.title || remoteMessage.data?.title || 'KNI Notification',
    body: remoteMessage.notification?.body || remoteMessage.data?.body || 'You have a new message',
    android: {
      channelId: 'high_importance_channel',
      pressAction: {
        id: 'default',
      },
    },
  });
});

// Handle notification click when app closed (quit state)
messaging()
  .getInitialNotification()
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('🚀 App opened from quit state:', remoteMessage);
      // yaha navigate kara sakti ho based on remoteMessage.data.screen
    }
  });

AppRegistry.registerComponent(appName, () => App);
