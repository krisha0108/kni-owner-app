import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../../utils/responsive';

export default function LineChartCard({ title, data, labelKey, valueKey, containerWidth }) {
  const { width: screenWidth } = useWindowDimensions();

  // Responsive sizing (tablet detection always uses the real screen width)
  const isTabletDevice = isTablet(screenWidth);
  // When embedded (containerWidth given, e.g. Home screen), keep it compact.
  const compact = !!containerWidth;
  const containerPadding = compact ? scale(12) : (isTabletDevice ? scale(24) : scale(16));
  // When containerWidth is given, the caller already measured the exact box
  // this card gets to fill, so no extra outer margin is needed.
  const horizontalMargin = containerWidth ? 0 : (isTabletDevice ? scale(24) : scale(16));
  const chartHeight = compact ? scale(150) : (isTabletDevice ? scale(280) : scale(220));

  // Calculate chart width based on container constraints
  const containerMaxWidth = getContainerMaxWidth(screenWidth);
  const baseWidth = containerWidth || Math.min(screenWidth, containerMaxWidth);
  const chartWidth = baseWidth - (horizontalMargin * 2) - (containerPadding * 2);

  // When nested inside another card (containerWidth given), skip this
  // card's own background/shadow so it doesn't double up with the parent's.
  const cardStyle = containerWidth ? styles.chartCardFlat : styles.chartCard;

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <View style={[cardStyle, { padding: containerPadding, marginHorizontal: horizontalMargin, marginVertical: compact ? scale(4) : undefined }]}>
        <Text style={[styles.chartTitle, { fontSize: moderateScale(compact ? 13 : 18) }]}>{title}</Text>
        <View style={[styles.noDataContainer, { height: chartHeight }]}>
          <Text style={[styles.noDataText, { fontSize: moderateScale(compact ? 12 : 16) }]}>No data available</Text>
        </View>
      </View>
    );
  }

  const formatLabel = (value) => {
    if (!value) return '';
    const parsed = new Date(value);
    if (isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  };

  const chartData = {
    labels: data.map(d => formatLabel(d[labelKey])),
    datasets: [
      {
        data: data.map(d => d[valueKey] || 0),
        color: (opacity = 1) => `rgba(239, 58, 58, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={[cardStyle, { padding: containerPadding, marginHorizontal: horizontalMargin, marginVertical: compact ? scale(4) : undefined }]}>
      <Text style={[styles.chartTitle, { fontSize: moderateScale(compact ? 13 : 18), marginBottom: compact ? scale(6) : scale(12) }]}>{title}</Text>
      <LineChart
        data={chartData}
        width={chartWidth}
        height={chartHeight}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(239, 58, 58, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: scale(16)
          },
          propsForDots: {
            r: compact ? '3' : (isTabletDevice ? '5' : '4'),
            strokeWidth: '2',
            stroke: '#EF3A3A'
          },
          propsForLabels: compact ? { fontSize: 9 } : undefined,
        }}
        bezier
        style={[styles.chart, { borderRadius: scale(16), marginVertical: compact ? scale(4) : scale(8) }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    marginVertical: scale(8),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartCardFlat: {
    marginVertical: scale(8),
  },
  chartTitle: {
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: scale(12),
  },
  chart: {
    marginVertical: scale(8),
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: scale(12),
  },
  noDataText: {
    color: '#6B7280',
  },
});
