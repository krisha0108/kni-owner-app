import { useEffect, useRef } from 'react';
import { useWindowDimensions } from 'react-native';
import useKeyboardHeight from './useKeyboardHeight';

/**
 * Like useKeyboardHeight, but corrected for Android devices where
 * windowSoftInputMode="adjustResize" has already resized the window when
 * the keyboard opens (useWindowDimensions().height already shrunk by
 * roughly the keyboard's height). Whether a given device actually resizes
 * for adjustResize is inconsistent across Android versions/OEMs, so this
 * detects it live by comparing the window height just before the keyboard
 * opened to the current one, instead of assuming either way.
 *
 * Without this, adding the raw keyboardHeight to a bottom margin/padding/
 * height calculation double-compensates on devices that DO resize -
 * pushing a bottom-pinned bar (or shrinking a modal) too far, leaving a
 * visible empty gap above the keyboard that isn't reproducible on every
 * device (reported on a client's phone, not the dev's).
 *
 * Returns { keyboardHeight, keyboardCompensation }:
 *  - keyboardHeight: the raw keyboard height (use this when you just need
 *    to know whether the keyboard is open, e.g. a maxHeight cap's fallback
 *    branch).
 *  - keyboardCompensation: the amount to actually add to your own layout -
 *    0 when the OS already made room for it. Drop-in replacement for
 *    keyboardHeight in any margin/padding/height/bottom calculation.
 */
export default function useKeyboardCompensation() {
  const keyboardHeight = useKeyboardHeight();
  const { height } = useWindowDimensions();
  const baselineHeightRef = useRef(height);

  useEffect(() => {
    if (keyboardHeight === 0) baselineHeightRef.current = height;
  }, [keyboardHeight, height]);

  const windowAlreadyResized = keyboardHeight > 0 && (baselineHeightRef.current - height) >= keyboardHeight * 0.6;
  const keyboardCompensation = windowAlreadyResized ? 0 : keyboardHeight;

  return { keyboardHeight, keyboardCompensation };
}
