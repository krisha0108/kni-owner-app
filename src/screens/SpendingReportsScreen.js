import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { BarChart, PieChart } from 'react-native-chart-kit';
import { exportSpendingReportPDF, openPDF } from '../services/analyticsService';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const monthFilters = [
  { value: '', label: 'All' },
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
];

const equipmentColors = [C.primary, C.info, C.warn, C.ok, '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

export default function SpendingReportsScreen({ navigation }) {
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - 64; // Account for padding

  // Restaurant context
  const { selectedRestaurantId, loading: restaurantsLoading, hasRestaurants } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const years = [2024, 2025, 2026];

  const fetchReport = useCallback(async () => {
    if (!selectedRestaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const params = { year: selectedYear, restaurantId: selectedRestaurantId };
      if (selectedMonth) params.month = selectedMonth;

      const { data: res } = await api.get('/restaurant-owner/reports/spending-summary', { params });
      setData(res);
    } catch (error) {
      console.log('Error fetching report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth, selectedRestaurantId]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const handleExportPDF = async () => {
    if (!selectedRestaurantId) {
      Alert.alert('Error', 'Please select a restaurant first');
      return;
    }

    setExporting(true);
    try {
      const filters = { year: selectedYear };
      if (selectedMonth) filters.month = selectedMonth;

      const filePath = await exportSpendingReportPDF(selectedRestaurantId, filters);
      Alert.alert(
        'Export Successful',
        'Spending report has been exported',
        [
          { text: 'Open', onPress: () => openPDF(filePath) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Could not export report');
    } finally {
      setExporting(false);
    }
  };

  // Prepare chart data
  const getBarChartData = () => {
    const monthlyData = data?.monthly_spending || [];
    const filteredData = monthlyData.filter(m => m.amount > 0);

    if (filteredData.length === 0) {
      return null;
    }

    return {
      labels: filteredData.map(d => d.month),
      datasets: [{ data: filteredData.map(d => d.amount || 0) }]
    };
  };

  const getPieChartData = () => {
    const equipment = data?.by_equipment || [];
    if (equipment.length === 0) return null;

    return equipment.slice(0, 6).map((item, index) => ({
      name: item.name.length > 12 ? item.name.substring(0, 12) + '...' : item.name,
      amount: item.amount,
      color: equipmentColors[index % equipmentColors.length],
      legendFontColor: C.text,
      legendFontSize: 11
    }));
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Spending Reports</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading report...</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Spending Reports</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.emptyState}>
          <Icon name="restaurant-outline" size={scale(64)} color={C.muted} />
          <Text style={st.emptyTitle}>No Restaurant Found</Text>
          <Text style={st.emptyText}>Please add a restaurant first</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  const { summary, monthly_spending, by_equipment } = data || {};
  const barChartData = getBarChartData();
  const pieChartData = getPieChartData();

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Spending Reports</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={exporting}
            style={st.exportBtn}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Icon name="download-outline" size={scale(22)} color={C.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Year Selector */}
        <View style={st.yearSelector}>
          {years.map(year => (
            <TouchableOpacity
              key={year}
              style={[st.yearBtn, selectedYear === year && st.yearBtnActive]}
              onPress={() => setSelectedYear(year)}
            >
              <Text style={[st.yearText, selectedYear === year && st.yearTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.monthScroll} contentContainerStyle={st.monthScrollContent}>
          {monthFilters.map(month => (
            <TouchableOpacity
              key={month.value}
              style={[st.monthBtn, selectedMonth === month.value && st.monthBtnActive]}
              onPress={() => setSelectedMonth(month.value)}
            >
              <Text style={[st.monthText, selectedMonth === month.value && st.monthTextActive]}>{month.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Summary Cards */}
        <View style={st.summaryRow}>
          <View style={[st.summaryCard, { backgroundColor: '#FEF2F2' }]}>
            <Icon name="wallet-outline" size={scale(24)} color={C.primary} />
            <Text style={st.summaryValue}>
              {summary?.total_spent > 0 ? `₹${summary.total_spent.toLocaleString()}` : '₹0'}
            </Text>
            <Text style={st.summaryLabel}>Total Spent</Text>
          </View>
          <View style={[st.summaryCard, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="construct-outline" size={scale(24)} color={C.info} />
            <Text style={st.summaryValue}>{summary?.total_services || 0}</Text>
            <Text style={st.summaryLabel}>Services</Text>
          </View>
          <View style={[st.summaryCard, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="calculator-outline" size={scale(24)} color={C.ok} />
            <Text style={st.summaryValue}>
              {summary?.avg_per_service > 0 ? `₹${Math.round(summary.avg_per_service)}` : '₹0'}
            </Text>
            <Text style={st.summaryLabel}>Avg/Service</Text>
          </View>
        </View>

        {/* Monthly Comparison */}
        <View style={st.comparisonCard}>
          <View style={st.comparisonRow}>
            <View style={st.comparisonItem}>
              <Text style={st.comparisonLabel}>This Month</Text>
              <Text style={st.comparisonValue}>
                ₹{(summary?.current_month || 0).toLocaleString()}
              </Text>
            </View>
            <View style={st.comparisonDivider} />
            <View style={st.comparisonItem}>
              <Text style={st.comparisonLabel}>Last Month</Text>
              <Text style={st.comparisonValue}>
                ₹{(summary?.last_month || 0).toLocaleString()}
              </Text>
            </View>
            <View style={st.comparisonDivider} />
            <View style={st.comparisonItem}>
              <Text style={st.comparisonLabel}>Change</Text>
              <View style={st.changeRow}>
                <Icon
                  name={summary?.month_change >= 0 ? 'trending-up' : 'trending-down'}
                  size={scale(16)}
                  color={summary?.month_change >= 0 ? C.danger : C.ok}
                />
                <Text style={[
                  st.changeValue,
                  { color: summary?.month_change >= 0 ? C.danger : C.ok }
                ]}>
                  {Math.abs(summary?.month_change || 0)}%
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={st.tabBar}>
          <TouchableOpacity
            style={[st.tab, activeTab === 'overview' && st.tabActive]}
            onPress={() => setActiveTab('overview')}
          >
            <Icon name="bar-chart-outline" size={scale(18)} color={activeTab === 'overview' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'overview' && st.tabTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'equipment' && st.tabActive]}
            onPress={() => setActiveTab('equipment')}
          >
            <Icon name="hardware-chip-outline" size={scale(18)} color={activeTab === 'equipment' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'equipment' && st.tabTextActive]}>By Equipment</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <View style={st.section}>
            {/* Bar Chart */}
            {barChartData ? (
              <View style={st.chartCard}>
                <Text style={st.chartTitle}>Monthly Spending</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <BarChart
                    data={barChartData}
                    width={Math.max(chartWidth, barChartData.labels.length * 50)}
                    height={200}
                    chartConfig={{
                      backgroundColor: '#fff',
                      backgroundGradientFrom: '#fff',
                      backgroundGradientTo: '#fff',
                      decimalPlaces: 0,
                      color: (opacity = 1) => `rgba(239, 58, 58, ${opacity})`,
                      labelColor: () => C.muted,
                      style: { borderRadius: scale(16) },
                      barPercentage: 0.6,
                      propsForLabels: { fontSize: moderateScale(10) },
                    }}
                    style={{ borderRadius: scale(16) }}
                    showValuesOnTopOfBars
                    fromZero
                  />
                </ScrollView>
              </View>
            ) : (
              <View style={st.noDataCard}>
                <Icon name="bar-chart-outline" size={scale(40)} color={C.muted} />
                <Text style={st.noDataText}>No spending data for {selectedYear}</Text>
              </View>
            )}

            {/* Monthly Details */}
            <View style={st.listCard}>
              <Text style={st.listCardTitle}>Monthly Breakdown</Text>
              {monthly_spending && monthly_spending.filter(m => m.amount > 0).length > 0 ? (
                monthly_spending.filter(m => m.amount > 0).map((month, index) => (
                  <View key={index} style={[st.listItem, index === 0 && { borderTopWidth: 0 }]}>
                    <View style={st.listItemLeft}>
                      <Text style={st.listItemMonth}>{month.month} {selectedYear}</Text>
                      <Text style={st.listItemCount}>{month.count} service(s)</Text>
                    </View>
                    <Text style={st.listItemAmount}>₹{month.amount.toLocaleString()}</Text>
                  </View>
                ))
              ) : (
                <View style={st.emptyList}>
                  <Text style={st.emptyListText}>No spending data for {selectedYear}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'equipment' && (
          <View style={st.section}>
            {/* Pie Chart */}
            {pieChartData ? (
              <View style={st.chartCard}>
                <Text style={st.chartTitle}>Spending by Equipment</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ alignItems: 'center' }}>
                  <PieChart
                    data={pieChartData}
                    width={Math.max(chartWidth, 320)}
                    height={200}
                    chartConfig={{
                      color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                    }}
                    accessor="amount"
                    backgroundColor="transparent"
                    paddingLeft="0"
                    absolute
                  />
                </ScrollView>
              </View>
            ) : (
              <View style={st.noDataCard}>
                <Icon name="pie-chart-outline" size={scale(40)} color={C.muted} />
                <Text style={st.noDataText}>No equipment spending data</Text>
              </View>
            )}

            {/* Equipment Details List */}
            <View style={st.listCard}>
              <Text style={st.listCardTitle}>Equipment Breakdown</Text>
              {by_equipment && by_equipment.length > 0 ? (
                by_equipment.map((item, index) => {
                  const maxAmount = Math.max(...by_equipment.map(e => e.amount), 1);
                  const percentage = (item.amount / maxAmount) * 100;

                  return (
                    <View key={index} style={st.equipmentItem}>
                      <View style={st.equipmentHeader}>
                        <View style={[st.equipmentDot, { backgroundColor: equipmentColors[index % equipmentColors.length] }]} />
                        <Text style={st.equipmentName} numberOfLines={1}>{item.name}</Text>
                        <Text style={st.equipmentAmount}>₹{item.amount.toLocaleString()}</Text>
                      </View>
                      <View style={st.progressBar}>
                        <View style={[st.progressFill, { width: `${percentage}%`, backgroundColor: equipmentColors[index % equipmentColors.length] }]} />
                      </View>
                      <Text style={st.equipmentCount}>{item.count} service(s)</Text>
                    </View>
                  );
                })
              ) : (
                <View style={st.emptyList}>
                  <Text style={st.emptyListText}>No equipment spending data</Text>
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(12), fontSize: moderateScale(14), color: C.muted },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },
  exportBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: scale(32) },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(40) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8) },

  yearSelector: {
    flexDirection: 'row', justifyContent: 'center', gap: scale(8),
    paddingVertical: scale(16), paddingHorizontal: scale(16)
  },
  yearBtn: {
    paddingHorizontal: scale(20), paddingVertical: scale(10), borderRadius: scale(12),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border
  },
  yearBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  yearText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  yearTextActive: { color: '#fff' },

  monthScroll: { marginBottom: scale(12) },
  monthScrollContent: { paddingHorizontal: scale(16) },
  monthBtn: {
    paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(10),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: scale(8)
  },
  monthBtnActive: { backgroundColor: C.info, borderColor: C.info },
  monthText: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  monthTextActive: { color: '#fff' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: scale(16), gap: scale(10) },
  summaryCard: {
    flex: 1, alignItems: 'center', padding: scale(16), borderRadius: scale(16)
  },
  summaryValue: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink, marginTop: scale(8) },
  summaryLabel: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(4) },

  comparisonCard: {
    margin: scale(16), backgroundColor: C.card, borderRadius: scale(16),
    padding: scale(16), borderWidth: 1, borderColor: C.border
  },
  comparisonRow: { flexDirection: 'row', alignItems: 'center' },
  comparisonItem: { flex: 1, alignItems: 'center' },
  comparisonDivider: { width: 1, height: scale(40), backgroundColor: C.border },
  comparisonLabel: { fontSize: moderateScale(11), color: C.muted },
  comparisonValue: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginTop: scale(4) },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
  changeValue: { fontSize: moderateScale(16), fontWeight: '700' },

  tabBar: {
    flexDirection: 'row', marginHorizontal: scale(16), backgroundColor: C.card,
    borderRadius: scale(12), padding: scale(4)
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: scale(6), paddingVertical: scale(10), borderRadius: scale(10)
  },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: moderateScale(13), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  section: { padding: scale(16) },

  // Chart Card
  chartCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16),
    marginBottom: scale(16), borderWidth: 1, borderColor: C.border
  },
  chartTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(12) },

  // No Data
  noDataCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(32),
    marginBottom: scale(16), borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  noDataText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  // List Card
  listCard: {
    backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1, borderColor: C.border, overflow: 'hidden'
  },
  listCardTitle: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, padding: scale(14), borderBottomWidth: 1, borderBottomColor: C.border },
  listItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(14), borderTopWidth: 1, borderTopColor: C.border
  },
  listItemLeft: {},
  listItemMonth: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  listItemCount: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  listItemAmount: { fontSize: moderateScale(15), fontWeight: '700', color: C.primary },

  // Equipment Item
  equipmentItem: { padding: scale(14), borderBottomWidth: 1, borderBottomColor: C.border },
  equipmentHeader: { flexDirection: 'row', alignItems: 'center' },
  equipmentDot: { width: scale(10), height: scale(10), borderRadius: scale(5), marginRight: scale(10) },
  equipmentName: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, flex: 1, marginRight: scale(12) },
  equipmentAmount: { fontSize: moderateScale(14), fontWeight: '700', color: C.primary },
  progressBar: { height: scale(6), backgroundColor: C.bg, borderRadius: scale(3), marginTop: scale(10), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: scale(3) },
  equipmentCount: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(6) },

  // Empty List
  emptyList: { padding: scale(32), alignItems: 'center' },
  emptyListText: { fontSize: moderateScale(14), color: C.muted },
});
