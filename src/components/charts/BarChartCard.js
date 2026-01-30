import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-chart-kit';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../../utils/responsive';

export default function BarChartCard({ title, data, labelKey, valueKey }) {
  const { width } = useWindowDimensions();

  // Responsive sizing
  const isTabletDevice = isTablet(width);
  const containerPadding = isTabletDevice ? scale(24) : scale(16);
  const horizontalMargin = isTabletDevice ? scale(24) : scale(16);
  const chartHeight = isTabletDevice ? scale(280) : scale(220);

  // Calculate chart width based on container constraints
  const containerMaxWidth = getContainerMaxWidth(width);
  const chartWidth = Math.min(width, containerMaxWidth) - (horizontalMargin * 2) - (containerPadding * 2);

  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <View style={[styles.chartCard, { padding: containerPadding, marginHorizontal: horizontalMargin }]}>
        <Text style={[styles.chartTitle, { fontSize: moderateScale(18) }]}>{title}</Text>
        <View style={[styles.noDataContainer, { height: chartHeight }]}>
          <Text style={[styles.noDataText, { fontSize: moderateScale(16) }]}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => d[labelKey] || ''),
    datasets: [
      {
        data: data.map(d => d[valueKey] || 0)
      }
    ]
  };

  return (
    <View style={[styles.chartCard, { padding: containerPadding, marginHorizontal: horizontalMargin }]}>
      <Text style={[styles.chartTitle, { fontSize: moderateScale(18) }]}>{title}</Text>
      <BarChart
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
          barPercentage: isTabletDevice ? 0.6 : 0.7,
        }}
        style={[styles.chart, { borderRadius: scale(16) }]}
        showValuesOnTopOfBars
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
