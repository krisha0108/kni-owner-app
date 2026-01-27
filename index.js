/**
 * @format
 */

// IMPORTANT: Must be first import for gesture-handler to work
import 'react-native-gesture-handler';

// import { AppRegistry } from 'react-native';
// import App from './App';
// import { name as appName } from './app.json';

// AppRegistry.registerComponent(appName, () => App);
import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import { getMessaging, setBackgroundMessageHandler, getInitialNotification } from '@react-native-firebase/messaging';
import notifee from '@notifee/react-native';

// Register background handler - MUST be done at top level
setBackgroundMessageHandler(getMessaging(), async remoteMessage => {
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
getInitialNotification(getMessaging())
  .then(remoteMessage => {
    if (remoteMessage) {
      console.log('🚀 App opened from quit state:', remoteMessage);
      // yaha navigate kara sakti ho based on remoteMessage.data.screen
    }
  });

AppRegistry.registerComponent(appName, () => App);
