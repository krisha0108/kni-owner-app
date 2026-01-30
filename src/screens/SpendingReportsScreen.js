import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Dimensions, Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import BarChartCard from '../components/charts/BarChartCard';
import PieChartCard from '../components/charts/PieChartCard';
import { exportSpendingReportPDF, openPDF } from '../services/analyticsService';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

const { width } = Dimensions.get('window');

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

const monthsChart = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

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

export default function SpendingReportsScreen({ navigation }) {
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
    try {
      const params = { year: selectedYear };
      if (selectedMonth) params.month = selectedMonth;

      const { data: res } = await api.get('/restaurant-owner/reports/spending-summary', { params });
      setData(res);
    } catch (error) {
      console.log('Error fetching report:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedYear, selectedMonth]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchReport();
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const filters = { year: selectedYear };
      if (selectedMonth) filters.month = selectedMonth;

      const filePath = await exportSpendingReportPDF(null, filters);
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

  // Simple bar chart component (kept for fallback)
  const BarChart = ({ data, maxValue }) => {
    const max = maxValue || Math.max(...data.map(d => d.amount), 1);
    return (
      <View style={st.chartContainer}>
        {data.map((item, index) => (
          <View key={index} style={st.barWrapper}>
            <View style={st.barContainer}>
              <View
                style={[
                  st.bar,
                  {
                    height: `${Math.max(5, (item.amount / max) * 100)}%`,
                    backgroundColor: item.amount > 0 ? C.primary : C.border,
                  }
                ]}
              />
            </View>
            <Text style={st.barLabel}>{item.month}</Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const { summary, monthly_spending, by_equipment } = data || {};

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

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
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
        {activeTab === 'overview' && monthly_spending && (
          <View style={st.section}>
            <BarChartCard
              title="Monthly Spending"
              data={monthly_spending}
              labelKey="month"
              valueKey="amount"
            />

            {/* Monthly Details */}
            <View style={st.listCard}>
              {monthly_spending.filter(m => m.amount > 0).map((month, index) => (
                <View key={index} style={[st.listItem, index === 0 && { borderTopWidth: 0 }]}>
                  <View style={st.listItemLeft}>
                    <Text style={st.listItemMonth}>{month.month} {selectedYear}</Text>
                    <Text style={st.listItemCount}>{month.count} service(s)</Text>
                  </View>
                  <Text style={st.listItemAmount}>₹{month.amount.toLocaleString()}</Text>
                </View>
              ))}
              {monthly_spending.filter(m => m.amount > 0).length === 0 && (
                <View style={st.emptyList}>
                  <Text style={st.emptyText}>No spending data for {selectedYear}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'equipment' && by_equipment && (
          <View style={st.section}>
            {/* Equipment Pie Chart */}
            {by_equipment.length > 0 && (
              <PieChartCard
                title="Spending by Equipment"
                data={by_equipment.map((item, index) => ({
                  name: item.name,
                  count: item.amount,
                  color: getEquipmentColor(index)
                }))}
              />
            )}

            {/* Equipment Details List */}
            <View style={st.listCard}>
              {by_equipment.length > 0 ? (
                by_equipment.map((item, index) => {
                  const maxAmount = Math.max(...by_equipment.map(e => e.amount), 1);
                  const percentage = (item.amount / maxAmount) * 100;

                  return (
                    <View key={index} style={st.equipmentItem}>
                      <View style={st.equipmentHeader}>
                        <Text style={st.equipmentName} numberOfLines={1}>{item.name}</Text>
                        <Text style={st.equipmentAmount}>₹{item.amount.toLocaleString()}</Text>
                      </View>
                      <View style={st.progressBar}>
                        <View style={[st.progressFill, { width: `${percentage}%` }]} />
                      </View>
                      <Text style={st.equipmentCount}>{item.count} service(s)</Text>
                    </View>
                  );
                })
              ) : (
                <View style={st.emptyList}>
                  <Text style={st.emptyText}>No equipment spending data</Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const getEquipmentColor = (index) => {
  const colors = [C.primary, C.info, C.warn, C.ok, '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];
  return colors[index % colors.length];
};

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },
  exportBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: 32 },

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

  monthScroll: { marginBottom: 8 },
  monthScrollContent: { paddingHorizontal: 16, gap: 6 },
  monthBtn: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 6
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
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 12 },

  chartCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    marginBottom: 16, borderWidth: 1, borderColor: C.border
  },
  chartContainer: { flexDirection: 'row', height: 150, alignItems: 'flex-end', justifyContent: 'space-between' },
  barWrapper: { flex: 1, alignItems: 'center' },
  barContainer: { flex: 1, width: '70%', justifyContent: 'flex-end' },
  bar: { width: '100%', borderRadius: 4, minHeight: 4 },
  barLabel: { fontSize: 9, color: C.muted, marginTop: 4 },

  listCard: {
    backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden'
  },
  listItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderTopWidth: 1, borderTopColor: C.border
  },
  listItemLeft: {},
  listItemMonth: { fontSize: 14, fontWeight: '600', color: C.ink },
  listItemCount: { fontSize: 12, color: C.muted, marginTop: 2 },
  listItemAmount: { fontSize: 15, fontWeight: '700', color: C.primary },

  equipmentItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: C.border },
  equipmentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  equipmentName: { fontSize: 14, fontWeight: '600', color: C.ink, flex: 1, marginRight: 12 },
  equipmentAmount: { fontSize: 14, fontWeight: '700', color: C.primary },
  progressBar: { height: 6, backgroundColor: C.bg, borderRadius: 3, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: C.primary, borderRadius: 3 },
  equipmentCount: { fontSize: 11, color: C.muted, marginTop: 4 },

  emptyList: { padding: 32, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted },
});
