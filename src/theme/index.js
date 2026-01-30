import { Platform } from 'react-native';
import { spacing, radius, fontSize, iconSize, buttonHeight, scale } from '../utils/responsive';

// Color palette - centralized colors for the entire app
export const colors = {
  // Primary brand colors
  primary: '#EF3A3A',
  primaryLight: '#FF6B6B',
  primaryDark: '#CC2222',

  // Secondary colors
  secondary: '#1D2254',
  secondaryLight: '#2E3470',
  secondaryDark: '#141840',

  // Text colors
  text: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#6B7280',
  textLight: '#94A3B8',
  textInverse: '#FFFFFF',

  // Background colors
  background: '#F5F7FA',
  backgroundSecondary: '#FFFFFF',
  card: '#FFFFFF',
  cardHover: '#F9FAFB',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  borderDark: '#D1D5DB',

  // Status colors
  success: '#10B981',
  successLight: '#D1FAE5',
  successDark: '#059669',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  warningDark: '#D97706',

  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  dangerDark: '#DC2626',

  info: '#3B82F6',
  infoLight: '#DBEAFE',
  infoDark: '#2563EB',

  // Special purpose
  overlay: 'rgba(0, 0, 0, 0.5)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  transparent: 'transparent',
};

// Typography styles
export const typography = {
  h1: {
    fontSize: fontSize(28),
    fontWeight: '700',
    lineHeight: fontSize(36),
    color: colors.text,
  },
  h2: {
    fontSize: fontSize(24),
    fontWeight: '700',
    lineHeight: fontSize(32),
    color: colors.text,
  },
  h3: {
    fontSize: fontSize(20),
    fontWeight: '600',
    lineHeight: fontSize(28),
    color: colors.text,
  },
  h4: {
    fontSize: fontSize(18),
    fontWeight: '600',
    lineHeight: fontSize(26),
    color: colors.text,
  },
  body: {
    fontSize: fontSize(14),
    fontWeight: '400',
    lineHeight: fontSize(22),
    color: colors.text,
  },
  bodyLarge: {
    fontSize: fontSize(16),
    fontWeight: '400',
    lineHeight: fontSize(24),
    color: colors.text,
  },
  bodySmall: {
    fontSize: fontSize(12),
    fontWeight: '400',
    lineHeight: fontSize(18),
    color: colors.textSecondary,
  },
  label: {
    fontSize: fontSize(13),
    fontWeight: '500',
    lineHeight: fontSize(20),
    color: colors.textSecondary,
  },
  caption: {
    fontSize: fontSize(11),
    fontWeight: '400',
    lineHeight: fontSize(16),
    color: colors.textMuted,
  },
  button: {
    fontSize: fontSize(15),
    fontWeight: '600',
    lineHeight: fontSize(22),
  },
};

// Shadow styles
export const shadows = {
  none: {},
  sm: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
    },
    android: {
      elevation: 1,
    },
  }),
  md: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
    },
    android: {
      elevation: 3,
    },
  }),
  lg: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
    },
    android: {
      elevation: 6,
    },
  }),
  xl: Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 16,
    },
    android: {
      elevation: 12,
    },
  }),
};

// Common component styles
export const components = {
  // Card styles
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    ...shadows.md,
  },
  cardFlat: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },

  // Button styles
  buttonPrimary: {
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: buttonHeight.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonSecondary: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    height: buttonHeight.lg,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderWidth: 1,
    borderColor: colors.border,
  },
  buttonGhost: {
    backgroundColor: colors.transparent,
    borderRadius: radius.md,
    height: buttonHeight.lg,
    paddingHorizontal: spacing.lg,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  buttonSmall: {
    height: buttonHeight.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
  },

  // Input styles
  input: {
    backgroundColor: colors.backgroundSecondary,
    borderRadius: radius.md,
    height: buttonHeight.lg,
    paddingHorizontal: spacing.lg,
    fontSize: fontSize(14),
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  inputFocused: {
    borderColor: colors.primary,
  },

  // Badge styles
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.backgroundSecondary,
  },
  badgeText: {
    fontSize: fontSize(11),
    fontWeight: '500',
  },

  // List item styles
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
};

// Layout constants
export const layout = {
  screenPadding: spacing.lg,
  cardGap: spacing.md,
  sectionGap: spacing.xl,
  headerHeight: scale(56),
  bottomNavHeight: scale(74),
  tabBarHeight: scale(48),
};

// Export everything
export default {
  colors,
  typography,
  shadows,
  components,
  layout,
  spacing,
  radius,
  fontSize,
  iconSize,
  buttonHeight,
};
