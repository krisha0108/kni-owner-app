import { useState, useEffect, useCallback, useMemo } from 'react';
import { Dimensions, useWindowDimensions } from 'react-native';
import {
  BREAKPOINTS,
  getDeviceType,
  isTablet,
  isSmallPhone,
  isLargePhone,
  getGridColumns,
  getContainerMaxWidth,
  spacing,
  fontSize,
  scale,
  moderateScale,
} from './responsive';

/**
 * Custom hook for responsive layouts that updates on dimension changes
 * @returns {Object} Responsive utilities and current dimensions
 */
export const useResponsive = () => {
  const { width, height } = useWindowDimensions();

  // Memoized device info
  const deviceInfo = useMemo(() => ({
    width,
    height,
    deviceType: getDeviceType(width),
    isTablet: isTablet(width),
    isSmallPhone: isSmallPhone(width),
    isLargePhone: isLargePhone(width),
    isLandscape: width > height,
    isPortrait: height > width,
  }), [width, height]);

  // Memoized layout helpers
  const layout = useMemo(() => ({
    gridColumns: getGridColumns(width),
    containerMaxWidth: getContainerMaxWidth(width),
    contentPadding: isTablet(width) ? spacing.xl : spacing.lg,
    cardGap: isTablet(width) ? spacing.lg : spacing.md,
  }), [width]);

  // Dynamic spacing based on screen size
  const responsiveSpacing = useMemo(() => ({
    xs: scale(4),
    sm: scale(8),
    md: scale(12),
    lg: scale(16),
    xl: scale(20),
    xxl: scale(24),
    xxxl: scale(32),
  }), []);

  // Responsive font sizes
  const responsiveFontSize = useCallback((size) => fontSize(size), []);

  // Get number of columns for a given minimum item width
  const getColumns = useCallback((minItemWidth = 160) => {
    return getGridColumns(width, minItemWidth);
  }, [width]);

  // Calculate item width for grid layouts
  const getItemWidth = useCallback((columns, gap = spacing.md, padding = spacing.lg) => {
    const availableWidth = Math.min(width, getContainerMaxWidth(width)) - (padding * 2);
    const totalGaps = (columns - 1) * gap;
    return (availableWidth - totalGaps) / columns;
  }, [width]);

  // Responsive style helper
  const responsive = useCallback((phoneStyle, tabletStyle = {}, largeTabletStyle = {}) => {
    if (width >= BREAKPOINTS.largeTablet) {
      return { ...phoneStyle, ...tabletStyle, ...largeTabletStyle };
    }
    if (width >= BREAKPOINTS.tablet) {
      return { ...phoneStyle, ...tabletStyle };
    }
    return phoneStyle;
  }, [width]);

  // Responsive value helper
  const value = useCallback((phoneValue, tabletValue, largeTabletValue) => {
    if (width >= BREAKPOINTS.largeTablet) {
      return largeTabletValue ?? tabletValue ?? phoneValue;
    }
    if (width >= BREAKPOINTS.tablet) {
      return tabletValue ?? phoneValue;
    }
    return phoneValue;
  }, [width]);

  return {
    ...deviceInfo,
    ...layout,
    spacing: responsiveSpacing,
    fontSize: responsiveFontSize,
    getColumns,
    getItemWidth,
    responsive,
    value,
    scale,
    moderateScale,
  };
};

/**
 * Hook for responsive grid layouts
 * @param {number} minItemWidth - Minimum width for each grid item
 * @param {number} gap - Gap between items
 * @returns {Object} Grid configuration
 */
export const useResponsiveGrid = (minItemWidth = 160, gap = 12) => {
  const { width, isTablet, isLandscape } = useResponsive();

  return useMemo(() => {
    let columns = Math.max(1, Math.floor(width / minItemWidth));

    // Limit columns based on device type
    if (!isTablet) {
      columns = Math.min(columns, isLandscape ? 3 : 2);
    } else {
      columns = Math.min(columns, isLandscape ? 4 : 3);
    }

    const containerWidth = Math.min(width, getContainerMaxWidth(width));
    const padding = isTablet ? 24 : 16;
    const availableWidth = containerWidth - (padding * 2);
    const totalGaps = (columns - 1) * gap;
    const itemWidth = (availableWidth - totalGaps) / columns;

    return {
      columns,
      itemWidth,
      gap,
      padding,
      containerWidth,
    };
  }, [width, minItemWidth, gap, isTablet, isLandscape]);
};

/**
 * Hook for responsive text sizing
 * @returns {Object} Text size helpers
 */
export const useResponsiveText = () => {
  const { width, isSmallPhone, isTablet } = useResponsive();

  return useMemo(() => {
    const sizeFactor = isSmallPhone ? 0.9 : isTablet ? 1.1 : 1;

    return {
      // Headers
      h1: Math.round(28 * sizeFactor),
      h2: Math.round(24 * sizeFactor),
      h3: Math.round(20 * sizeFactor),
      h4: Math.round(18 * sizeFactor),

      // Body text
      body: Math.round(14 * sizeFactor),
      bodyLarge: Math.round(16 * sizeFactor),
      bodySmall: Math.round(12 * sizeFactor),

      // Labels and captions
      label: Math.round(13 * sizeFactor),
      caption: Math.round(11 * sizeFactor),

      // Special
      button: Math.round(15 * sizeFactor),
      badge: Math.round(10 * sizeFactor),
    };
  }, [width, isSmallPhone, isTablet]);
};

export default useResponsive;
