import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { colors, typography, shadows } from '../theme';
import { spacing, radius } from '../utils/responsive';
import AppAlert from '../utils/AppAlert';

function resolveIcon(title, buttons) {
  if (buttons.some((b) => b.style === 'destructive')) {
    return { name: 'alert-circle', color: colors.danger, bg: colors.dangerLight };
  }
  const t = (title || '').toLowerCase();
  if (/error|failed|fail|invalid|wrong|unable/.test(t)) {
    return { name: 'close-circle', color: colors.danger, bg: colors.dangerLight };
  }
  if (/success|done|complete|verified|sent|saved|added|updated|approved/.test(t)) {
    return { name: 'checkmark-circle', color: colors.success, bg: colors.successLight };
  }
  if (/warning|caution|expir/.test(t)) {
    return { name: 'warning', color: colors.warning, bg: colors.warningLight };
  }
  if (buttons.length >= 2) {
    return { name: 'help-circle', color: colors.secondary, bg: '#E8E9F5' };
  }
  return { name: 'information-circle', color: colors.info, bg: colors.infoLight };
}

export default function AppAlertHost() {
  const [alertState, setAlertState] = useState(null);
  const scale = useRef(new Animated.Value(0.9)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    AppAlert._setListener((next) => setAlertState(next));
    return () => AppAlert._setListener(null);
  }, []);

  useEffect(() => {
    if (alertState) {
      scale.setValue(0.9);
      opacity.setValue(0);
      Animated.parallel([
        Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 8, tension: 65 }),
        Animated.timing(opacity, { toValue: 1, duration: 180, useNativeDriver: true }),
      ]).start();
    }
  }, [alertState, scale, opacity]);

  if (!alertState) return null;

  const { title, message, buttons, options } = alertState;
  const cancelable = options.cancelable !== false;
  const icon = resolveIcon(title, buttons);
  const stacked = buttons.length > 2;

  const close = (button) => {
    setAlertState(null);
    if (button && button.onPress) {
      setTimeout(() => button.onPress(), 50);
    }
  };

  const handleBackdropPress = () => {
    if (!cancelable) return;
    // Mirrors native Alert's back-button dismissal: closes without firing
    // any button's onPress, so existing call-site logic isn't surprised by
    // an unexpected callback.
    setAlertState(null);
  };

  return (
    <Modal
      visible
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleBackdropPress}
    >
      <TouchableWithoutFeedback onPress={handleBackdropPress}>
        <View style={styles.backdrop}>
          <TouchableWithoutFeedback>
            <Animated.View style={[styles.card, { opacity, transform: [{ scale }] }]}>
              <View style={[styles.iconCircle, { backgroundColor: icon.bg }]}>
                <Icon name={icon.name} size={32} color={icon.color} />
              </View>
              {!!title && <Text style={styles.title}>{title}</Text>}
              {!!message && <Text style={styles.message}>{message}</Text>}
              <View style={[styles.buttonRow, stacked && styles.buttonColumn]}>
                {buttons.map((btn, i) => {
                  const isLast = i === buttons.length - 1;
                  const variant =
                    btn.style === 'cancel'
                      ? 'text'
                      : btn.style === 'destructive'
                      ? 'destructive'
                      : isLast
                      ? 'primary'
                      : 'outline';
                  return (
                    <TouchableOpacity
                      key={i}
                      onPress={() => close(btn)}
                      activeOpacity={0.75}
                      style={[
                        styles.button,
                        variant === 'primary' && styles.buttonPrimary,
                        variant === 'destructive' && styles.buttonDestructive,
                        variant === 'outline' && styles.buttonOutline,
                        variant === 'text' && styles.buttonText,
                        !stacked && (buttons.length > 1 ? { flex: 1 } : { width: '100%' }),
                        stacked && { width: '100%' },
                        !stacked && i > 0 && { marginLeft: spacing.sm },
                        stacked && i > 0 && { marginTop: spacing.sm },
                      ]}
                    >
                      <Text
                        style={[
                          styles.buttonLabel,
                          (variant === 'primary' || variant === 'destructive') &&
                            styles.buttonLabelLight,
                          variant === 'text' && styles.buttonLabelMuted,
                        ]}
                        numberOfLines={1}
                      >
                        {btn.text || 'OK'}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </Animated.View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.xl,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h4,
    color: colors.secondary,
    textAlign: 'center',
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    width: '100%',
  },
  buttonColumn: {
    flexDirection: 'column',
  },
  button: {
    height: 46,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
  },
  buttonPrimary: {
    backgroundColor: colors.secondary,
  },
  buttonDestructive: {
    backgroundColor: colors.primary,
  },
  buttonOutline: {
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.backgroundSecondary,
  },
  buttonText: {
    backgroundColor: 'transparent',
  },
  buttonLabel: {
    ...typography.button,
    color: colors.secondary,
  },
  buttonLabelLight: {
    color: colors.textInverse,
  },
  buttonLabelMuted: {
    color: colors.textMuted,
  },
});
