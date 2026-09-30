import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
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
  primaryDark: '#DC2626',
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

/* ─── Skeleton ─── */
function SkeletonAnalytics({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
      <Animated.View style={[styles.skelMoneyCard, { opacity: pulse }]} />
      <Animated.View style={[styles.skelChart, { opacity: pulse }]} />
      <Animated.View style={[styles.skelChart, { opacity: pulse }]} />
      <Animated.View style={[styles.skelChart, { opacity: pulse }]} />
      <View style={styles.skelMetricCard}>
        {[1, 2, 3].map(i => (
          <Animated.View key={i} style={[styles.skelMetricRow, { opacity: pulse }]} />
        ))}
      </View>
    </View>
  );
}

export default function AnalyticsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
  const [revenueData, setRevenueData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [chartsWidth, setChartsWidth] = useState(0);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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

      const [response, revenueRes] = await Promise.all([
        api.get(`/owner/analytics?restaurantId=${selectedRestaurant}&period=${selectedPeriod}`),
        api.get(`/owner/analytics/revenue?restaurantId=${selectedRestaurant}&period=${selectedPeriod}`),
      ]);

      if (response.data.ok) {
        setAnalytics(response.data.data);
      }
      if (revenueRes.data.ok) {
        setRevenueData(revenueRes.data.data);
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
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={styles.headerBlobA} pointerEvents="none" />
          <View style={styles.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={styles.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={styles.headerActions}>
            <View style={styles.headerIconBtn}>
              <Icon name="download-outline" size={scale(20)} color="rgba(255,255,255,0.5)" />
            </View>
          </View>
        </LinearGradient>
        <SkeletonAnalytics pulse={pulse} />
      </SafeAreaView>
    );
  }

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={styles.headerBlobA} pointerEvents="none" />
          <View style={styles.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Analytics</Text>
            <Text style={styles.headerSubtitle}>Business insights & reports</Text>
          </View>
          <View style={{ width: scale(48) }} />
        </LinearGradient>
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={styles.headerBlobA} pointerEvents="none" />
        <View style={styles.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={styles.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={scale(18)} color="#fff" />
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
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Icon name="download-outline" size={scale(20)} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Restaurant Selector - Global */}
        <RestaurantSelectorBar />

        {/* Money card — period tabs + Net Revenue + stats (same system as Home) */}
        <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
          <LinearGradient colors={[C.ink, '#2E3470']} style={styles.moneyCard}>
            <View style={styles.moneyTabRow}>
              {PERIOD_OPTIONS.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[styles.moneyTab, selectedPeriod === option.value && styles.moneyTabOn]}
                  onPress={() => setSelectedPeriod(option.value)}
                >
                  <Text style={[styles.moneyTabTxt, selectedPeriod === option.value && styles.moneyTabTxtOn]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.moneyLabel}>NET REVENUE · {selectedPeriod} DAYS</Text>
            <Text style={styles.moneyValue}>₹{(summary.netRevenue || 0).toLocaleString()}</Text>

            <View style={styles.moneyStatsRow}>
              <View style={styles.moneyStat}>
                <Text style={styles.moneyStatLabel}>REVENUE</Text>
                <Text style={styles.moneyStatValue} numberOfLines={1}>₹{(summary.bookings?.revenue || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.moneyStat}>
                <Text style={styles.moneyStatLabel}>EXPENSES</Text>
                <Text style={styles.moneyStatValue} numberOfLines={1}>₹{(summary.expenses?.total || 0).toLocaleString()}</Text>
              </View>
              <View style={styles.moneyStat}>
                <Text style={styles.moneyStatLabel}>EQUIPMENT</Text>
                <Text style={styles.moneyStatValue}>{summary.equipment?.count || 0}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Charts Section */}
        {analytics?.trends && (
          <View onLayout={(e) => setChartsWidth(e.nativeEvent.layout.width)}>
            {/* Booking Trends Line Chart */}
            {trends.dailyBookings && trends.dailyBookings.length > 0 && (
              <LineChartCard
                title="Booking Trends"
                data={trends.dailyBookings}
                labelKey="date"
                valueKey="count"
                containerWidth={chartsWidth || undefined}
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
                containerWidth={chartsWidth || undefined}
                totalLabel="bookings"
              />
            )}

            {/* Daily Revenue Bar Chart - dailyBookings carries per-day revenue too */}
            {trends.dailyBookings && trends.dailyBookings.length > 0 && (
              <BarChartCard
                title="Daily Revenue"
                data={trends.dailyBookings}
                labelKey="date"
                valueKey="revenue"
                containerWidth={chartsWidth || undefined}
              />
            )}
          </View>
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

        {/* Top Expense Categories — proportional bar ranking */}
        {topCategories.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Expense Categories</Text>
            <View style={styles.categoriesCard}>
              {topCategories.slice(0, 5).map((category, index) => {
                const maxTotal = Math.max(...topCategories.slice(0, 5).map(c => c.total || 0), 1);
                const barPct = Math.max(4, Math.round(((category.total || 0) / maxTotal) * 100));
                return (
                  <View key={index} style={index > 0 ? { marginTop: scale(12) } : null}>
                    <View style={styles.categoryRow}>
                      <Text style={styles.categoryName}>{category.category}</Text>
                      <Text style={styles.categoryAmount}>₹{(category.total || 0).toLocaleString()}</Text>
                    </View>
                    <View style={styles.categoryBarTrack}>
                      <View style={[styles.categoryBarFill, { width: `${barPct}%`, backgroundColor: getCategoryColor(index) }]} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Equipment Maintenance Cost */}
        {revenueData?.equipmentMaintenanceCost && revenueData.equipmentMaintenanceCost.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Equipment Maintenance Cost</Text>
            <View style={styles.categoriesCard}>
              {revenueData.equipmentMaintenanceCost.map((equip, index) => (
                <View key={index} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <Icon name="construct-outline" size={scale(18)} color={C.warn} />
                    <View style={styles.listRowText}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>{equip.equipmentName}</Text>
                      <Text style={styles.listRowSub}>{equip.serviceCount || 0} services</Text>
                    </View>
                  </View>
                  <Text style={styles.listRowAmount}>₹{(equip.totalCost || 0).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Vendor Spending */}
        {revenueData?.vendorSpendingComparison && revenueData.vendorSpendingComparison.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Top Vendors</Text>
            <View style={styles.categoriesCard}>
              {revenueData.vendorSpendingComparison.map((vendor, index) => (
                <View key={index} style={styles.listRow}>
                  <View style={styles.listRowLeft}>
                    <Icon name="storefront-outline" size={scale(18)} color={C.primary} />
                    <View style={styles.listRowText}>
                      <Text style={styles.listRowTitle} numberOfLines={1}>{vendor.vendorName}</Text>
                      <Text style={styles.listRowSub}>{vendor.orderCount || 0} orders</Text>
                    </View>
                  </View>
                  <Text style={styles.listRowAmount}>₹{(vendor.totalSpent || 0).toLocaleString('en-IN')}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>
      <KniBottomNav navigation={navigation} active="home" />
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
    paddingBottom: scale(12),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backBtnPlain: { width: scale(26), height: scale(40), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(32) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8) },

  /* ── Money Card (Net Revenue + period tabs) ── */
  moneyCard: {
    borderRadius: scale(18),
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.18,
    shadowRadius: scale(14),
    elevation: 6,
  },
  moneyTabRow: { flexDirection: 'row', gap: scale(6), marginBottom: scale(4) },
  moneyTab: {
    flex: 1,
    paddingVertical: scale(8),
    borderRadius: scale(9),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  moneyTabOn: { backgroundColor: '#fff' },
  moneyTabTxt: { fontSize: moderateScale(11.5), fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  moneyTabTxtOn: { color: C.ink },
  moneyLabel: { fontSize: moderateScale(11), color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.4, marginTop: scale(12) },
  moneyValue: { fontSize: moderateScale(26), fontWeight: '900', color: '#fff', marginTop: scale(2) },
  moneyStatsRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(16) },
  moneyStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(10), padding: scale(9) },
  moneyStatLabel: { fontSize: moderateScale(9), color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  moneyStatValue: { fontSize: moderateScale(13.5), color: '#fff', fontWeight: '800', marginTop: scale(3) },

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
    marginBottom: scale(6),
  },
  categoryName: { fontSize: moderateScale(13), fontWeight: '600', color: C.text },
  categoryAmount: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },
  categoryBarTrack: { height: scale(6), backgroundColor: C.bg, borderRadius: scale(3) },
  categoryBarFill: { height: '100%', borderRadius: scale(3) },

  listRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  listRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: scale(8) },
  listRowText: { marginLeft: scale(10), flex: 1 },
  listRowTitle: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  listRowSub: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },
  listRowAmount: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },

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

  // ═══ Skeleton ═══
  skelMoneyCard: { height: scale(150), backgroundColor: '#E2E8F0', borderRadius: scale(18), marginBottom: scale(16) },
  skelChart: { height: scale(180), backgroundColor: '#E2E8F0', borderRadius: scale(12), marginBottom: scale(16) },
  skelMetricCard: { backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(16) },
  skelMetricRow: { height: scale(20), backgroundColor: '#E2E8F0', borderRadius: scale(6), marginVertical: scale(10) },
});
