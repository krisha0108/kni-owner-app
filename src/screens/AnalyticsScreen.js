import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import LineChartCard from '../components/charts/LineChartCard';
import PieChartCard from '../components/charts/PieChartCard';
import BarChartCard from '../components/charts/BarChartCard';
import { exportAnalyticsPDF, openPDF } from '../services/analyticsService';
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

const { width } = Dimensions.get('window');

export default function AnalyticsScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const PERIOD_OPTIONS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
  ];

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant, selectedPeriod])
  );

  const loadData = async () => {
    if (!selectedRestaurant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(
        `/owner/analytics?restaurantId=${selectedRestaurant}&period=${selectedPeriod}`
      );

      if (response.data.ok) {
        setAnalytics(response.data.data);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const handleExportPDF = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant first');
      return;
    }

    setExporting(true);
    try {
      const filePath = await exportAnalyticsPDF(selectedRestaurant);
      Alert.alert(
        'Export Successful',
        'Analytics report has been exported',
        [
          { text: 'Open', onPress: () => openPDF(filePath) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Could not export analytics');
    } finally {
      setExporting(false);
    }
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={20} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={{ width: 48 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={80} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Please add a restaurant first</Text>
        </View>
      </SafeAreaView>
    );
  }

  const summary = analytics?.summary || {};
  const trends = analytics?.trends || {};
  const breakdowns = analytics?.breakdowns || {};
  const topCategories = breakdowns.expensesByCategory || [];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Analytics</Text>
          <Text style={styles.headerSubtitle}>Business insights & reports</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerIconBtn}
            onPress={handleExportPDF}
            disabled={exporting}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Icon name="download-outline" size={20} color={C.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.periodButton, selectedPeriod === option.value && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(option.value)}
            >
              <Text style={[styles.periodText, selectedPeriod === option.value && styles.periodTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Restaurant Selector - Global */}
        <RestaurantSelectorBar style={{ marginHorizontal: 0, marginTop: 0 }} />

        {/* Overview Cards */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Overview</Text>
          <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, { borderLeftColor: C.primary }]}>
              <Icon name="calendar" size={24} color={C.primary} />
              <Text style={styles.overviewValue}>₹{summary.bookings?.revenue || 0}</Text>
              <Text style={styles.overviewLabel}>Revenue</Text>
            </View>

            <View style={[styles.overviewCard, { borderLeftColor: C.warn }]}>
              <Icon name="cash" size={24} color={C.warn} />
              <Text style={styles.overviewValue}>₹{summary.expenses?.total || 0}</Text>
              <Text style={styles.overviewLabel}>Expenses</Text>
            </View>
          </View>

          <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, { borderLeftColor: C.ok }]}>
              <Icon name="trending-up" size={24} color={C.ok} />
              <Text style={styles.overviewValue}>₹{summary.netRevenue || 0}</Text>
              <Text style={styles.overviewLabel}>Net Revenue</Text>
            </View>

            <View style={[styles.overviewCard, { borderLeftColor: C.info }]}>
              <Icon name="receipt" size={24} color={C.info} />
              <Text style={styles.overviewValue}>{summary.bookings?.count || 0}</Text>
              <Text style={styles.overviewLabel}>Bookings</Text>
            </View>
          </View>
        </View>

        {/* Charts Section */}
        {analytics?.trends && (
          <>
            {/* Booking Trends Line Chart */}
            {trends.bookingsByDay && trends.bookingsByDay.length > 0 && (
              <LineChartCard
                title="Booking Trends"
                data={trends.bookingsByDay}
                labelKey="date"
                valueKey="count"
              />
            )}

            {/* Bookings by Status Pie Chart */}
            {breakdowns.bookingsByStatus && breakdowns.bookingsByStatus.length > 0 && (
              <PieChartCard
                title="Bookings by Status"
                data={breakdowns.bookingsByStatus.map((item, index) => ({
                  name: item.status,
                  count: item.count,
                  color: getStatusColor(item.status)
                }))}
              />
            )}

            {/* Revenue vs Expenses Bar Chart */}
            {trends.dailyRevenue && trends.dailyRevenue.length > 0 && (
              <BarChartCard
                title="Daily Revenue"
                data={trends.dailyRevenue}
                labelKey="date"
                valueKey="revenue"
              />
            )}
          </>
        )}

        {/* Equipment & AMC */}
        {(summary.equipment?.count > 0 || summary.amcSubscriptions?.count > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment & Services</Text>
            <View style={styles.metricCard}>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Icon name="hardware-chip" size={20} color={C.primary} />
                  <Text style={styles.metricLabel}>Total Equipment</Text>
                </View>
                <Text style={styles.metricValue}>{summary.equipment?.count || 0}</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Icon name="shield-checkmark" size={20} color={C.info} />
                  <Text style={styles.metricLabel}>Active AMCs</Text>
                </View>
                <Text style={styles.metricValue}>{summary.amcSubscriptions?.count || 0}</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Icon name="cart-outline" size={20} color={C.ok} />
                  <Text style={styles.metricLabel}>Marketplace Orders</Text>
                </View>
                <Text style={styles.metricValue}>{summary.marketplaceOrders?.count || 0}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Top Expense Categories */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Expense Categories</Text>
            <View style={styles.categoriesCard}>
              {topCategories.slice(0, 5).map((category, index) => (
                <View key={index} style={styles.categoryRow}>
                  <View style={styles.categoryLeft}>
                    <View style={[styles.categoryDot, { backgroundColor: getCategoryColor(index) }]} />
                    <Text style={styles.categoryName}>{category.category}</Text>
                  </View>
                  <View>
                    <Text style={styles.categoryAmount}>₹{category.total || 0}</Text>
                    <Text style={styles.categoryCount}>{category.count} items</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Booking Status Breakdown */}
        {breakdowns.bookingsByStatus && breakdowns.bookingsByStatus.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Bookings by Status</Text>
            <View style={styles.metricCard}>
              {breakdowns.bookingsByStatus.map((item, index) => (
                <View key={index} style={styles.metricRow}>
                  <Text style={styles.metricLabel}>{item.status}</Text>
                  <Text style={styles.metricValue}>{item.count}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <KniBottomNav navigation={navigation} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

const getCategoryColor = (index) => {
  const colors = [C.primary, C.info, C.warn, C.ok, C.danger];
  return colors[index % colors.length];
};

const getStatusColor = (status) => {
  const statusColors = {
    'PENDING': '#F59E0B',
    'CONFIRMED': '#10B981',
    'COMPLETED': '#3B82F6',
    'CANCELLED': '#EF4444',
  };
  return statusColors[status] || '#6B7280';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  periodSelector: { flexDirection: 'row', padding: 16, gap: 8 },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { fontSize: 13, color: C.text },
  periodTextActive: { color: C.card, fontWeight: '600' },

  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  section: { paddingHorizontal: 16, marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 12 },

  overviewGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  overviewCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  overviewValue: { fontSize: 20, fontWeight: '700', color: C.ink, marginTop: 8 },
  overviewLabel: { fontSize: 12, color: C.muted, marginTop: 4 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  trendUp: { backgroundColor: '#ECFDF5' },
  trendDown: { backgroundColor: '#FEF2F2' },
  trendText: { fontSize: 11, fontWeight: '600' },

  metricCard: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricLabel: { fontSize: 14, color: C.text },
  metricValue: { fontSize: 16, fontWeight: '700', color: C.ink },

  categoriesCard: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryDot: { width: 12, height: 12, borderRadius: 6 },
  categoryName: { fontSize: 14, color: C.text },
  categoryAmount: { fontSize: 15, fontWeight: '700', color: C.ink },
  categoryCount: { fontSize: 11, color: C.muted, marginTop: 2, textAlign: 'right' },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#FFFBEB',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  insightText: { flex: 1, fontSize: 13, color: C.text, lineHeight: 18 },
});
