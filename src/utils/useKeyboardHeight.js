import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * Returns the current on-screen keyboard height (0 when hidden).
 *
 * Use it to pad/lift form content above the keyboard without relying on
 * KeyboardAvoidingView (which is unreliable on Android + the new architecture).
 *
 * Examples:
 *   const kb = useKeyboardHeight();
 *   // inline ScrollView form:
 *   contentContainerStyle={[styles.scroll, { paddingBottom: scale(40) + kb }]}
 *   // modal overlay (centered or bottom sheet):
 *   style={[styles.overlay, { paddingBottom: kb }]}
 *   // bottom-docked composer bar:
 *   style={[styles.composerWrap, { marginBottom: kb }]}
 */
export default function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e?.endCoordinates?.height || 0)
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return keyboardHeight;
}
