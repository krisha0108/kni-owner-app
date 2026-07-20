// Drop-in replacement for React Native's native Alert.alert, backed by a
// custom-branded modal (see components/AppAlertHost.js) instead of the OS
// system dialog. Same signature as Alert.alert(title, message, buttons,
// options) so call sites only need `Alert.alert(` -> `AppAlert.alert(`.

let listener = null;
let currentId = 0;

const AppAlert = {
  alert(title, message, buttons, options) {
    const resolvedButtons = buttons && buttons.length ? buttons : [{ text: 'OK' }];

    if (!listener) {
      // Host not mounted yet (e.g. called before App.js renders) - fall back
      // to the native dialog rather than silently dropping the alert.
      const { Alert } = require('react-native');
      Alert.alert(title, message, buttons, options);
      return;
    }

    currentId += 1;
    listener({
      id: currentId,
      title,
      message,
      buttons: resolvedButtons,
      options: options || {},
    });
  },

  _setListener(fn) {
    listener = fn;
  },
};

export default AppAlert;
