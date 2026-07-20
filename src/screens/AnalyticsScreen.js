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
import { isStale, markFetched } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';

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
      const key = `Analytics-${selectedRestaurant}-${selectedPeriod}`;
      if (isStale(key) || !analytics) {
        loadData();
        markFetched(key);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant, selectedPeriod, analytics])
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
    await loadRestaurants({ force: true });
    await loadData();
    markFetched(`Analytics-${selectedRestaurant}-${selectedPeriod}`);
  };

  const handleExportPDF = async () => {
    if (!selectedRestaurant) {
      AppAlert.alert('Error', 'Please select a restaurant first');
      return;
    }

    setExporting(true);
    try {
      const filePath = await exportAnalyticsPDF(selectedRestaurant);
      AppAlert.alert(
        'Export Successful',
        'Analytics report has been exported',
        [
          { text: 'Open', onPress: () => openPDF(filePath) },
          { text: 'OK', style: 'cancel' }
        ]
      );
    } catch (error) {
      AppAlert.alert('Export Failed', error.message || 'Could not export analytics');
    } finally {
      setExporting(false);
    }
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
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
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={{ width: scale(48) }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={scale(80)} color={C.muted} />
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
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
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
              <Icon name="download-outline" size={scale(20)} color={C.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
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
              <Icon name="calendar" size={scale(24)} color={C.primary} />
              <Text style={styles.overviewValue}>₹{summary.bookings?.revenue || 0}</Text>
              <Text style={styles.overviewLabel}>Revenue</Text>
            </View>

            <View style={[styles.overviewCard, { borderLeftColor: C.warn }]}>
              <Icon name="cash" size={scale(24)} color={C.warn} />
              <Text style={styles.overviewValue}>₹{summary.expenses?.total || 0}</Text>
              <Text style={styles.overviewLabel}>Expenses</Text>
            </View>
          </View>

          <View style={styles.overviewGrid}>
            <View style={[styles.overviewCard, { borderLeftColor: C.ok }]}>
              <Icon name="trending-up" size={scale(24)} color={C.ok} />
              <Text style={styles.overviewValue}>₹{summary.netRevenue || 0}</Text>
              <Text style={styles.overviewLabel}>Net Revenue</Text>
            </View>

            <View style={[styles.overviewCard, { borderLeftColor: C.info }]}>
              <Icon name="receipt" size={scale(24)} color={C.info} />
              <Text style={styles.overviewValue}>{summary.bookings?.count || 0}</Text>
              <Text style={styles.overviewLabel}>Bookings</Text>
            </View>
          </View>
        </View>

        {/* Charts Section */}
        {analytics?.trends && (
          <>
            {/* Booking Trends Line Chart */}
            {trends.dailyBookings && trends.dailyBookings.length > 0 && (
              <LineChartCard
                title="Booking Trends"
                data={trends.dailyBookings}
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

            {/* Daily Revenue Bar Chart - dailyBookings carries per-day revenue too */}
            {trends.dailyBookings && trends.dailyBookings.length > 0 && (
              <BarChartCard
                title="Daily Revenue"
                data={trends.dailyBookings}
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
                  <Icon name="hardware-chip" size={scale(20)} color={C.primary} />
                  <Text style={styles.metricLabel}>Total Equipment</Text>
                </View>
                <Text style={styles.metricValue}>{summary.equipment?.count || 0}</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Icon name="shield-checkmark" size={scale(20)} color={C.info} />
                  <Text style={styles.metricLabel}>Active AMCs</Text>
                </View>
                <Text style={styles.metricValue}>{summary.amcSubscriptions?.count || 0}</Text>
              </View>
              <View style={styles.metricRow}>
                <View style={styles.metricLeft}>
                  <Icon name="cart-outline" size={scale(20)} color={C.ok} />
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

        <View style={{ height: scale(100) }} />
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

// Keyed on the real ServiceBookingStatus enum (prisma/schema.prisma).
const getStatusColor = (status) => {
  const statusColors = {
    DRAFT: '#94A3B8',
    SLOT_SELECTED: '#F59E0B',
    PAYMENT_UPLOADED: '#3B82F6',
    PAYMENT_VERIFIED: '#10B981',
    PAYMENT_REJECTED: '#EF4444',
    ENGINEER_ASSIGNED: '#6366F1',
    ACCEPTED_BY_ENGINEER: '#6366F1',
    IN_PROGRESS: '#F59E0B',
    REJECTED_BY_ENGINEER: '#EF4444',
    COMPLETED: '#3B82F6',
    CANCELLED: '#EF4444',
  };
  return statusColors[status] || '#6B7280';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(32) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8) },

  periodSelector: { flexDirection: 'row', padding: scale(16), gap: scale(8) },
  periodButton: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(8),
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { fontSize: moderateScale(13), color: C.text },
  periodTextActive: { color: C.card, fontWeight: '600' },

  filterRow: { paddingHorizontal: scale(16), marginBottom: scale(12) },
  filterChip: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: scale(8),
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  section: { paddingHorizontal: scale(16), marginBottom: scale(24) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(12) },

  overviewGrid: { flexDirection: 'row', gap: scale(12), marginBottom: scale(12) },
  overviewCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: scale(16),
    borderRadius: scale(12),
    borderLeftWidth: 4,
  },
  overviewValue: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginTop: scale(8) },
  overviewLabel: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(8),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(8),
    alignSelf: 'flex-start',
  },
  trendUp: { backgroundColor: '#ECFDF5' },
  trendDown: { backgroundColor: '#FEF2F2' },
  trendText: { fontSize: moderateScale(11), fontWeight: '600' },

  metricCard: {
    backgroundColor: C.card,
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  metricLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  metricLabel: { fontSize: moderateScale(14), color: C.text },
  metricValue: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },

  categoriesCard: {
    backgroundColor: C.card,
    padding: scale(16),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  categoryDot: { width: scale(12), height: scale(12), borderRadius: scale(6) },
  categoryName: { fontSize: moderateScale(14), color: C.text },
  categoryAmount: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  categoryCount: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2), textAlign: 'right' },

  insightCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: '#FFFBEB',
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(12),
  },
  insightText: { flex: 1, fontSize: moderateScale(13), color: C.text, lineHeight: moderateScale(18) },
});
