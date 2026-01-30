import { Dimensions, PixelRatio, Platform } from 'react-native';

// Base design dimensions (based on iPhone 11/12/13 standard)
const BASE_WIDTH = 375;
const BASE_HEIGHT = 812;

// Get current screen dimensions
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Breakpoints for different device sizes
export const BREAKPOINTS = {
  small: 320,    // Small phones (iPhone SE, older Android)
  medium: 375,   // Standard phones (iPhone 11/12/13, most Android)
  large: 414,    // Large phones (iPhone Plus/Max, larger Android)
  tablet: 768,   // Tablets (iPad Mini, Android tablets)
  largeTablet: 1024, // Large tablets (iPad Pro)
};

// Device type detection
export const getDeviceType = (width = SCREEN_WIDTH) => {
  if (width >= BREAKPOINTS.largeTablet) return 'largeTablet';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  if (width >= BREAKPOINTS.large) return 'largePhone';
  if (width >= BREAKPOINTS.medium) return 'phone';
  return 'smallPhone';
};

export const isTablet = (width = SCREEN_WIDTH) => width >= BREAKPOINTS.tablet;
export const isSmallPhone = (width = SCREEN_WIDTH) => width < BREAKPOINTS.medium;
export const isLargePhone = (width = SCREEN_WIDTH) => width >= BREAKPOINTS.large && width < BREAKPOINTS.tablet;

// Responsive width scaling (percentage of screen width)
export const wp = (percentage) => {
  return (percentage * SCREEN_WIDTH) / 100;
};

// Responsive height scaling (percentage of screen height)
export const hp = (percentage) => {
  return (percentage * SCREEN_HEIGHT) / 100;
};

// Scale based on base design width (for consistent scaling)
export const scale = (size) => {
  return (SCREEN_WIDTH / BASE_WIDTH) * size;
};

// Vertical scale based on base design height
export const verticalScale = (size) => {
  return (SCREEN_HEIGHT / BASE_HEIGHT) * size;
};

// Moderate scale - less aggressive scaling for fonts
export const moderateScale = (size, factor = 0.5) => {
  return size + (scale(size) - size) * factor;
};

// Font size scaling with min/max bounds
export const fontSize = (size, minSize = 10, maxSize = 40) => {
  const scaledSize = moderateScale(size, 0.3);
  return Math.max(minSize, Math.min(maxSize, scaledSize));
};

// Responsive spacing (maintains design proportions)
export const spacing = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
};

// Responsive border radius
export const radius = {
  sm: scale(4),
  md: scale(8),
  lg: scale(12),
  xl: scale(16),
  xxl: scale(20),
  round: 999,
};

// Get number of columns for grid layouts
export const getGridColumns = (width = SCREEN_WIDTH, itemMinWidth = 160) => {
  if (width >= BREAKPOINTS.largeTablet) return 4;
  if (width >= BREAKPOINTS.tablet) return 3;
  if (width >= BREAKPOINTS.large) return 2;
  return Math.max(1, Math.floor(width / itemMinWidth));
};

// Get container max width for centered layouts
export const getContainerMaxWidth = (width = SCREEN_WIDTH) => {
  if (width >= BREAKPOINTS.largeTablet) return 1200;
  if (width >= BREAKPOINTS.tablet) return 720;
  return width;
};

// Responsive icon sizes
export const iconSize = {
  xs: scale(14),
  sm: scale(18),
  md: scale(22),
  lg: scale(26),
  xl: scale(32),
  xxl: scale(40),
};

// Responsive button heights
export const buttonHeight = {
  sm: scale(32),
  md: scale(40),
  lg: scale(48),
  xl: scale(56),
};

// Responsive card dimensions
export const getCardWidth = (columns = 1, gap = spacing.md, containerWidth = SCREEN_WIDTH) => {
  const totalGap = gap * (columns + 1);
  return (containerWidth - totalGap) / columns;
};

// Check if orientation is landscape
export const isLandscape = () => SCREEN_WIDTH > SCREEN_HEIGHT;

// Platform-specific sizing
export const platformSelect = (ios, android, defaultValue) => {
  if (Platform.OS === 'ios') return ios;
  if (Platform.OS === 'android') return android;
  return defaultValue || ios;
};

// Create responsive style based on device type
export const createResponsiveStyle = (baseStyle, tabletStyle = {}, largeTabletStyle = {}) => {
  const deviceType = getDeviceType();

  if (deviceType === 'largeTablet') {
    return { ...baseStyle, ...tabletStyle, ...largeTabletStyle };
  }
  if (deviceType === 'tablet') {
    return { ...baseStyle, ...tabletStyle };
  }
  return baseStyle;
};

// Export dimensions for direct use
export { SCREEN_WIDTH, SCREEN_HEIGHT };

export default {
  wp,
  hp,
  scale,
  verticalScale,
  moderateScale,
  fontSize,
  spacing,
  radius,
  iconSize,
  buttonHeight,
  getGridColumns,
  getContainerMaxWidth,
  getCardWidth,
  getDeviceType,
  isTablet,
  isSmallPhone,
  isLargePhone,
  isLandscape,
  platformSelect,
  createResponsiveStyle,
  BREAKPOINTS,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
};
