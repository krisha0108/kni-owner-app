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

  // Proportional, not a yes/no switch - subtract however much the window
  // has ALREADY shrunk from the keyboard height, rather than deciding
  // "resized" vs "not resized" off a fixed threshold. A binary threshold is
  // fragile to timing: the keyboard-height listener and useWindowDimensions
  // update from two separate native events and don't always land in the
  // same render, so a render caught between them can wrongly read "not
  // resized yet" and hand back full compensation even on a device that
  // does resize - reproducing the exact double-push gap this hook exists
  // to prevent. This formula instead self-corrects once both values have
  // settled (which they have by the time anyone is looking at the screen):
  // no resize yet -> full keyboardHeight; full resize -> ~0; partial ->
  // just the remainder still needed.
  const alreadyMadeRoom = Math.max(0, baselineHeightRef.current - height);
  const keyboardCompensation = Math.max(0, keyboardHeight - alreadyMadeRoom);

  return { keyboardHeight, keyboardCompensation };
}
