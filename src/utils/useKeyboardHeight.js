import { useKeyboardState } from 'react-native-keyboard-controller';

/**
 * Returns the current on-screen keyboard height (0 when hidden).
 *
 * Backed by react-native-keyboard-controller's native WindowInsets-based
 * measurement instead of the core Keyboard module's keyboardDidShow event.
 * The core module's endCoordinates.height is known to be unreliable on
 * several Android OEM skins (reported inflated on Vivo/FuntouchOS in
 * particular - a client's phone kept getting a visible gap above the
 * keyboard even after the layout-side double-compensation bug was fixed,
 * because the raw reported height was simply wrong going in). This reads
 * the real IME inset directly from the OS, so it's accurate across OEMs.
 *
 * Requires the app root to be wrapped in <KeyboardProvider> from
 * react-native-keyboard-controller (see App.js).
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
  return useKeyboardState((state) => state.height || 0);
}
