import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { PieChart } from 'react-native-chart-kit';
import Svg, { Circle } from 'react-native-svg';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../../utils/responsive';

export default function PieChartCard({ title, data, containerWidth, totalLabel = 'Total' }) {
  const { width: screenWidth } = useWindowDimensions();

  // Responsive sizing (tablet detection always uses the real screen width)
  const isTabletDevice = isTablet(screenWidth);
  // When embedded (containerWidth given, e.g. Home screen), keep it compact.
  const compact = !!containerWidth;
  const containerPadding = compact ? scale(12) : (isTabletDevice ? scale(24) : scale(16));
  // When containerWidth is given, the caller already measured the exact box
  // this card gets to fill, so no extra outer margin is needed.
  const horizontalMargin = containerWidth ? 0 : (isTabletDevice ? scale(24) : scale(16));
  const chartHeight = compact ? scale(130) : (isTabletDevice ? scale(280) : scale(220));

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

  const formatName = (name) => String(name)
    .split('_')
    .map(w => w.charAt(0) + w.slice(1).toLowerCase())
    .join(' ');

  // Format data for PieChart. The built-in legend can't wrap or truncate its
  // text, so it's turned off here and replaced with our own legend below,
  // which can shrink/ellipsize properly on narrow screens.
  const chartData = data.map((item, index) => ({
    name: formatName(item.name || 'Unknown'),
    population: item.count || 0,
    color: item.color || `hsl(${index * 60}, 70%, 50%)`,
    legendFontColor: '#1F2937',
    legendFontSize: isTabletDevice ? moderateScale(14) : moderateScale(12),
  }));

  // Compact (embedded, e.g. Home screen): a donut ring with the total in the
  // centre and the legend beside it, instead of chart-kit's pie + legend
  // (which can't wrap/truncate and used to overflow narrow screens).
  if (compact) {
    const total = chartData.reduce((sum, d) => sum + d.population, 0) || 1;
    const donutRadius = scale(34);
    const strokeWidth = scale(12);
    const circumference = 2 * Math.PI * donutRadius;
    const svgSize = (donutRadius + strokeWidth) * 2;
    const center = svgSize / 2;

    let cumulative = 0;
    const segments = chartData.map(d => {
      const length = (d.population / total) * circumference;
      const segment = { ...d, dashoffset: -cumulative };
      cumulative += length;
      return segment;
    });

    return (
      <View style={[cardStyle, { padding: containerPadding, marginHorizontal: horizontalMargin, marginVertical: scale(4) }]}>
        <Text style={[styles.chartTitle, { fontSize: moderateScale(13), marginBottom: scale(10) }]}>{title}</Text>
        <View style={styles.donutRow}>
          <View style={{ width: svgSize, height: svgSize }}>
            <Svg width={svgSize} height={svgSize}>
              {segments.map((s, i) => {
                const length = (s.population / total) * circumference;
                return (
                  <Circle
                    key={i}
                    cx={center}
                    cy={center}
                    r={donutRadius}
                    stroke={s.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={`${length} ${circumference - length}`}
                    strokeDashoffset={s.dashoffset}
                    fill="none"
                    rotation={-90}
                    origin={`${center}, ${center}`}
                  />
                );
              })}
            </Svg>
            <View style={styles.donutCenter} pointerEvents="none">
              <Text style={styles.donutCenterValue}>{total}</Text>
              <Text style={styles.donutCenterLabel} numberOfLines={1}>{totalLabel}</Text>
            </View>
          </View>
          <View style={styles.donutLegend}>
            {chartData.map((d, i) => (
              <View key={i} style={styles.legendRow}>
                <View style={[styles.legendDot, { backgroundColor: d.color }]} />
                <Text style={[styles.legendLabel, { fontSize: moderateScale(10.5) }]} numberOfLines={1} ellipsizeMode="tail">
                  {d.name}
                </Text>
                <Text style={[styles.legendValue, { fontSize: moderateScale(10.5) }]}>{d.population}</Text>
              </View>
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[cardStyle, { padding: containerPadding, marginHorizontal: horizontalMargin, marginVertical: compact ? scale(4) : undefined }]}>
      <Text style={[styles.chartTitle, { fontSize: moderateScale(compact ? 13 : 18), marginBottom: compact ? scale(6) : scale(12) }]}>{title}</Text>
      <PieChart
        data={chartData}
        width={chartWidth}
        height={chartHeight}
        chartConfig={{
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
        }}
        accessor="population"
        backgroundColor="transparent"
        paddingLeft={String(Math.round(chartWidth / 4))}
        hasLegend={false}
        absolute
        style={[styles.chart, { borderRadius: scale(16), marginVertical: compact ? scale(4) : scale(8) }]}
      />
      <View style={styles.legend}>
        {chartData.map((d, i) => (
          <View key={i} style={[styles.legendRow, compact && { paddingVertical: scale(3) }]}>
            <View style={[styles.legendDot, { backgroundColor: d.color }]} />
            <Text style={[styles.legendLabel, compact && { fontSize: moderateScale(11) }]} numberOfLines={1} ellipsizeMode="tail">
              {d.name}
            </Text>
            <Text style={[styles.legendValue, compact && { fontSize: moderateScale(11) }]}>{d.population}</Text>
          </View>
        ))}
      </View>
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
  legend: {
    marginTop: scale(4),
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingVertical: scale(5),
  },
  legendDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    flexShrink: 0,
  },
  legendLabel: {
    flex: 1,
    fontSize: moderateScale(12.5),
    color: '#1F2937',
    fontWeight: '500',
  },
  legendValue: {
    fontSize: moderateScale(12.5),
    color: '#1F2937',
    fontWeight: '700',
  },
  donutRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
  },
  donutCenter: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterValue: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#1D2254',
  },
  donutCenterLabel: {
    fontSize: moderateScale(8),
    color: '#94A3B8',
    fontWeight: '600',
  },
  donutLegend: {
    flex: 1,
    gap: scale(4),
  },
});
