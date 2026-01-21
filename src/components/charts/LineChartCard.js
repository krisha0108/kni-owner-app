import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';

export default function LineChartCard({ title, data, labelKey, valueKey }) {
  // Handle empty or invalid data
  if (!data || data.length === 0) {
    return (
      <View style={styles.chartCard}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available</Text>
        </View>
      </View>
    );
  }

  const chartData = {
    labels: data.map(d => d[labelKey] || ''),
    datasets: [
      {
        data: data.map(d => d[valueKey] || 0),
        color: (opacity = 1) => `rgba(239, 58, 58, ${opacity})`,
        strokeWidth: 2
      }
    ]
  };

  return (
    <View style={styles.chartCard}>
      <Text style={styles.chartTitle}>{title}</Text>
      <LineChart
        data={chartData}
        width={Dimensions.get('window').width - 48}
        height={220}
        chartConfig={{
          backgroundColor: '#FFFFFF',
          backgroundGradientFrom: '#FFFFFF',
          backgroundGradientTo: '#FFFFFF',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(239, 58, 58, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          },
          propsForDots: {
            r: '4',
            strokeWidth: '2',
            stroke: '#EF3A3A'
          }
        }}
        bezier
        style={styles.chart}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  noDataContainer: {
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
  },
});
