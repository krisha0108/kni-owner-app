module.exports = {
  presets: ['module:@react-native/babel-preset'],
  // react-native-reanimated/plugin (for react-native-keyboard-controller's
  // KeyboardProvider) MUST be listed last.
  plugins: ['react-native-reanimated/plugin'],
};
