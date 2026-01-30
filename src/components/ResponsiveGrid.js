import React, { useMemo } from 'react';
import { View, FlatList, StyleSheet, useWindowDimensions } from 'react-native';
import { scale, isTablet, getContainerMaxWidth } from '../utils/responsive';

/**
 * ResponsiveGrid - A responsive grid component that adjusts columns based on screen size
 *
 * @param {Array} data - Array of items to render
 * @param {Function} renderItem - Function to render each item
 * @param {number} minItemWidth - Minimum width for each item (default: 160)
 * @param {number} maxColumns - Maximum number of columns (default: 4)
 * @param {number} gap - Gap between items (default: 12)
 * @param {Object} contentContainerStyle - Additional styles for the container
 * @param {Object} style - Additional styles for the wrapper
 * @param {Function} keyExtractor - Function to extract unique key
 * @param {React.Component} ListEmptyComponent - Component to render when list is empty
 * @param {React.Component} ListHeaderComponent - Component to render at the top
 * @param {React.Component} ListFooterComponent - Component to render at the bottom
 * @param {boolean} refreshing - Whether the list is refreshing
 * @param {Function} onRefresh - Callback when refresh is triggered
 */
export default function ResponsiveGrid({
  data = [],
  renderItem,
  minItemWidth = 160,
  maxColumns = 4,
  gap = 12,
  contentContainerStyle,
  style,
  keyExtractor,
  ListEmptyComponent,
  ListHeaderComponent,
  ListFooterComponent,
  refreshing,
  onRefresh,
  ...props
}) {
  const { width } = useWindowDimensions();

  const gridConfig = useMemo(() => {
    const isTabletDevice = isTablet(width);
    const containerMaxWidth = getContainerMaxWidth(width);
    const containerWidth = Math.min(width, containerMaxWidth);
    const padding = isTabletDevice ? scale(24) : scale(16);
    const availableWidth = containerWidth - (padding * 2);

    // Calculate optimal number of columns
    let columns = Math.max(1, Math.floor(availableWidth / minItemWidth));
    columns = Math.min(columns, maxColumns);

    // Calculate item width
    const totalGaps = (columns - 1) * gap;
    const itemWidth = (availableWidth - totalGaps) / columns;

    return {
      columns,
      itemWidth,
      padding,
      containerMaxWidth,
      isTablet: isTabletDevice,
    };
  }, [width, minItemWidth, maxColumns, gap]);

  const renderGridItem = ({ item, index }) => {
    const isLastInRow = (index + 1) % gridConfig.columns === 0;
    const isFirstInRow = index % gridConfig.columns === 0;

    return (
      <View
        style={[
          styles.itemContainer,
          {
            width: gridConfig.itemWidth,
            marginBottom: gap,
            marginRight: isLastInRow ? 0 : gap,
          },
        ]}
      >
        {renderItem({ item, index, itemWidth: gridConfig.itemWidth })}
      </View>
    );
  };

  return (
    <View style={[styles.wrapper, { maxWidth: gridConfig.containerMaxWidth, alignSelf: 'center' }, style]}>
      <FlatList
        data={data}
        renderItem={renderGridItem}
        keyExtractor={keyExtractor || ((item, index) => item?.id?.toString() || index.toString())}
        numColumns={gridConfig.columns}
        key={`grid-${gridConfig.columns}`} // Force re-render when columns change
        contentContainerStyle={[
          styles.contentContainer,
          { paddingHorizontal: gridConfig.padding, paddingTop: scale(8), paddingBottom: scale(100) },
          contentContainerStyle,
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={ListEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        refreshing={refreshing}
        onRefresh={onRefresh}
        {...props}
      />
    </View>
  );
}

/**
 * ResponsiveCardGrid - A simpler version for card-based layouts
 */
export function ResponsiveCardGrid({
  children,
  minItemWidth = 280,
  maxColumns = 3,
  gap = 16,
  style,
}) {
  const { width } = useWindowDimensions();

  const gridConfig = useMemo(() => {
    const isTabletDevice = isTablet(width);
    const containerMaxWidth = getContainerMaxWidth(width);
    const containerWidth = Math.min(width, containerMaxWidth);
    const padding = isTabletDevice ? scale(24) : scale(16);
    const availableWidth = containerWidth - (padding * 2);

    let columns = Math.max(1, Math.floor(availableWidth / minItemWidth));
    columns = Math.min(columns, maxColumns);

    const totalGaps = (columns - 1) * gap;
    const itemWidth = (availableWidth - totalGaps) / columns;

    return { columns, itemWidth, padding, gap };
  }, [width, minItemWidth, maxColumns, gap]);

  const childrenArray = React.Children.toArray(children);

  return (
    <View style={[styles.cardGrid, { paddingHorizontal: gridConfig.padding, gap: gridConfig.gap }, style]}>
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={{
            width: gridConfig.itemWidth,
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

/**
 * ResponsiveStatsGrid - For displaying stats cards in a responsive grid
 */
export function ResponsiveStatsGrid({ children, style }) {
  const { width } = useWindowDimensions();

  const gridConfig = useMemo(() => {
    const isTabletDevice = isTablet(width);
    const padding = isTabletDevice ? scale(24) : scale(16);

    // Stats cards: 2 columns on phone, 4 on tablet
    const columns = isTabletDevice ? 4 : 2;

    return { columns, padding };
  }, [width]);

  const childrenArray = React.Children.toArray(children);

  return (
    <View
      style={[
        styles.statsGrid,
        {
          paddingHorizontal: gridConfig.padding,
        },
        style,
      ]}
    >
      {childrenArray.map((child, index) => (
        <View
          key={index}
          style={{
            width: `${100 / gridConfig.columns}%`,
            paddingHorizontal: scale(4),
            marginBottom: scale(8),
          }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: '100%',
  },
  contentContainer: {
    flexGrow: 1,
  },
  itemContainer: {},
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
