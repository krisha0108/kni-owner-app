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
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Spending Reports</Text>
          <View style={{ width: 40 }} />
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
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Spending Reports</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyState}>
          <Icon name="restaurant-outline" size={64} color={C.muted} />
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
          <Icon name="arrow-back" size={22} color={C.ink} />
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
              <Icon name="download-outline" size={22} color={C.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
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
            <Icon name="wallet-outline" size={24} color={C.primary} />
            <Text style={st.summaryValue}>
              {summary?.total_spent > 0 ? `₹${summary.total_spent.toLocaleString()}` : '₹0'}
            </Text>
            <Text style={st.summaryLabel}>Total Spent</Text>
          </View>
          <View style={[st.summaryCard, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="construct-outline" size={24} color={C.info} />
            <Text style={st.summaryValue}>{summary?.total_services || 0}</Text>
            <Text style={st.summaryLabel}>Services</Text>
          </View>
          <View style={[st.summaryCard, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="calculator-outline" size={24} color={C.ok} />
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
                  size={16}
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
            <Icon name="bar-chart-outline" size={18} color={activeTab === 'overview' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'overview' && st.tabTextActive]}>Monthly</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[st.tab, activeTab === 'equipment' && st.tabActive]}
            onPress={() => setActiveTab('equipment')}
          >
            <Icon name="hardware-chip-outline" size={18} color={activeTab === 'equipment' ? C.primary : C.muted} />
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
                      style: { borderRadius: 16 },
                      barPercentage: 0.6,
                      propsForLabels: { fontSize: 10 },
                    }}
                    style={{ borderRadius: 16 }}
                    showValuesOnTopOfBars
                    fromZero
                  />
                </ScrollView>
              </View>
            ) : (
              <View style={st.noDataCard}>
                <Icon name="bar-chart-outline" size={40} color={C.muted} />
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
                <Icon name="pie-chart-outline" size={40} color={C.muted} />
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

        <View style={{ height: 100 }} />
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.muted },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },
  exportBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: 32 },

  // Empty state
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, marginTop: 8 },

  yearSelector: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: 16, paddingHorizontal: 16
  },
  yearBtn: {
    paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border
  },
  yearBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  yearText: { fontSize: 14, fontWeight: '700', color: C.ink },
  yearTextActive: { color: '#fff' },

  monthScroll: { marginBottom: 12 },
  monthScrollContent: { paddingHorizontal: 16 },
  monthBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  monthBtnActive: { backgroundColor: C.info, borderColor: C.info },
  monthText: { fontSize: 12, fontWeight: '600', color: C.muted },
  monthTextActive: { color: '#fff' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 10 },
  summaryCard: {
    flex: 1, alignItems: 'center', padding: 16, borderRadius: 16
  },
  summaryValue: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 8 },
  summaryLabel: { fontSize: 11, color: C.muted, marginTop: 4 },

  comparisonCard: {
    margin: 16, backgroundColor: C.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border
  },
  comparisonRow: { flexDirection: 'row', alignItems: 'center' },
  comparisonItem: { flex: 1, alignItems: 'center' },
  comparisonDivider: { width: 1, height: 40, backgroundColor: C.border },
  comparisonLabel: { fontSize: 11, color: C.muted },
  comparisonValue: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 4 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  changeValue: { fontSize: 16, fontWeight: '700' },

  tabBar: {
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.card,
    borderRadius: 12, padding: 4
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 10
  },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  section: { padding: 16 },

  // Chart Card
  chartCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: C.border
  },
  chartTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 12 },

  // No Data
  noDataCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 32,
    marginBottom: 16, borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  noDataText: { fontSize: 14, color: C.muted, marginTop: 12 },

  // List Card
  listCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden'
  },
  listCardTitle: { fontSize: 14, fontWeight: '700', color: C.ink, padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  listItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderTopWidth: 1, borderTopColor: C.border
  },
  listItemLeft: {},
  listItemMonth: { fontSize: 14, fontWeight: '600', color: C.ink },
  listItemCount: { fontSize: 12, color: C.muted, marginTop: 2 },
  listItemAmount: { fontSize: 15, fontWeight: '700', color: C.primary },

  // Equipment Item
  equipmentItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  equipmentHeader: { flexDirection: 'row', alignItems: 'center' },
  equipmentDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  equipmentName: { fontSize: 14, fontWeight: '600', color: C.ink, flex: 1, marginRight: 12 },
  equipmentAmount: { fontSize: 14, fontWeight: '700', color: C.primary },
  progressBar: { height: 6, backgroundColor: C.bg, borderRadius: 3, marginTop: 10, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  equipmentCount: { fontSize: 11, color: C.muted, marginTop: 6 },

  // Empty List
  emptyList: { padding: 32, alignItems: 'center' },
  emptyListText: { fontSize: 14, color: C.muted },
});
