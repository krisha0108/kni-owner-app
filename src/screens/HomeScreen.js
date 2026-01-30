// screens/HomeScreen.js - Unified Home with Dashboard & Analytics
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity,
  ScrollView, FlatList, Animated, Easing, RefreshControl, Linking,
  useWindowDimensions, Alert, ActivityIndicator, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { RestaurantSelectorCompact, RestaurantSelectorChips } from '../components/RestaurantSelector';
import { useRestaurant } from '../context/RestaurantContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api, IMAGE_BASE_URL } from '../api/client';

// Chart components (imported from Analytics)
import LineChartCard from '../components/charts/LineChartCard';
import PieChartCard from '../components/charts/PieChartCard';
import BarChartCard from '../components/charts/BarChartCard';
import { exportAnalyticsPDF, openPDF } from '../services/analyticsService';

const ION_GLYPHS = (Icon.getRawGlyphMap?.() ?? {});
const hasIonicon = (name) => !!name && Object.prototype.hasOwnProperty.call(ION_GLYPHS, name);
const TONE_ICON = {
  ok: 'shield-checkmark-outline',
  info: 'information-circle-outline',
  warn: 'alert-circle-outline',
  danger: 'alert-outline',
};

/* ---------------- THEME ---------------- */
const C = {
  primary: '#EF3A3A', ink: '#1D2254', text: '#0F172A', muted: '#6B7280',
  bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', ok: '#10B981',
  info: '#3B82F6', warn: '#F59E0B', danger: '#EF4444'
};
const R = 20;

/* ---------------- HELPERS ---------------- */
const open = async (url) => { try { await Linking.openURL(url); } catch { } };

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

/* ======================================================================= */
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  // Global restaurant context
  const {
    restaurants,
    selectedRestaurantId: restaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
    hasMultipleRestaurants,
  } = useRestaurant();

  /* State for Home content */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sponsoredData, setSponsoredData] = useState([]);
  const [banners, setBanners] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [guides, setGuides] = useState([]);
  const [feed, setFeed] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  /* State for Analytics/Dashboard */
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [showCharts, setShowCharts] = useState(false);
  const [exporting, setExporting] = useState(false);

  const showSkel = loading || refreshing;

  const PERIOD_OPTIONS = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 },
  ];

  /* =========== HOME DATA FETCHING =========== */
  const fetchSponsored = useCallback(async () => {
    try {
      const res = await api.get('/app_api/sponsored');
      setSponsoredData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching sponsored:", error.message);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
    // Default feeds to show if none exist in database
    const defaultFeeds = [
      { id: 'default-1', txt: 'Welcome to KNI Super App!', tone: 'ok', icon: 'checkmark-circle-outline' },
      { id: 'default-2', txt: 'Book equipment services easily', tone: 'info', icon: 'construct-outline' },
      { id: 'default-3', txt: 'Track your expenses and bookings', tone: 'info', icon: 'analytics-outline' },
    ];

    try {
      const response = await api.get('/app_api/feeds', { params: { per_page: 10 } });
      const data = response.data;
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);

      if (list.length > 0) {
        setFeed(list.map((f) => {
          const tone = String(f.tone || 'info').toLowerCase();
          const safeTone = ['ok', 'info', 'warn', 'danger'].includes(tone) ? tone : 'info';
          const iconFromApi = (f.icon || '').trim();
          const icon = hasIonicon(iconFromApi) ? iconFromApi : TONE_ICON[safeTone];
          return { id: String(f.id), txt: f.txt, tone: safeTone, icon };
        }));
      } else {
        // Use default feeds if none exist
        setFeed(defaultFeeds);
      }
    } catch (e) {
      console.error('Feed error:', e?.response?.data || e.message);
      // Use default feeds on error
      setFeed(defaultFeeds);
    }
  }, []);

  const fetchGuides = useCallback(async () => {
    try {
      const { data } = await api.get('/app_api/guides', { params: { per_page: 10 } });
      const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
      setGuides(list.map(g => ({
        id: String(g.id),
        thumb: g.thumb_url,
        title: g.title,
        min: Number(g.minutes),
        link: g.link,
      })));
    } catch (e) {
      console.error('Guides error', e);
    }
  }, []);

  const fetchBanners = useCallback(async () => {
    try {
      const { data } = await api.get('/app_api/banners', {
        params: { per_page: 10, status: 'published' }
      });
      const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
      const published = list
        .filter(b => (b.status || '').toLowerCase() === 'published')
        .sort((a, b) => (Number(a.sort_order) || 9999) - (Number(b.sort_order) || 9999));
      setBanners(published);
      setHeroIdx(0);
    } catch (e) {
      console.error('Banner load error', e);
    }
  }, []);

  const calculateCartCount = useCallback(async () => {
    try {
      // ONE-TIME CLEANUP: Clear all old cart data
      const cleanupDone = await AsyncStorage.getItem('cart_cleanup_v2_done');
      if (!cleanupDone) {
        console.log('[Home] Running one-time cart cleanup...');
        const allKeysForCleanup = await AsyncStorage.getAllKeys();
        const cartKeys = allKeysForCleanup.filter(k =>
          k.startsWith('rdraft:') ||
          k.startsWith('pmeta:') ||
          k.startsWith('rservices:') ||
          k.startsWith('rparts:')
        );
        if (cartKeys.length > 0) {
          await AsyncStorage.multiRemove(cartKeys);
          console.log('[Home] Cleaned up', cartKeys.length, 'old cart keys');
        }
        await AsyncStorage.setItem('cart_cleanup_v2_done', 'true');
        setCartCount(0);
        return;
      }

      const a = await AsyncStorage.getItem('owner_id');
      const b = await AsyncStorage.getItem('restaurant_owner_id');
      const c = await AsyncStorage.getItem('ownerId');
      const ownerId = String(a || b || c || '').trim();
      const ownerKey = ownerId ? `owner:${ownerId}` : 'global';
      const allKeys = await AsyncStorage.getAllKeys();
      const myPrefix = `rdraft:${ownerKey}:`;
      const rdraftKeys = allKeys.filter(k => k.startsWith(myPrefix));

      // Clean up legacy 'global' cart data and related keys
      const globalKey = `${myPrefix}global`;
      if (rdraftKeys.includes(globalKey)) {
        await AsyncStorage.multiRemove([
          globalKey,
          `pmeta:${ownerKey}:global`,
          `rservices:${ownerKey}:global`,
          `rparts:${ownerKey}:global`,
        ]).catch(() => {});
      }

      let totalCount = 0;
      const keysToRemove = [];
      console.log('[Home] calculateCartCount - ownerKey:', ownerKey, 'rdraftKeys:', rdraftKeys);
      for (const key of rdraftKeys) {
        // Skip 'global' keys - they are legacy data
        const pid = key.slice(myPrefix.length);
        if (pid === 'global') continue;

        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const cartObj = JSON.parse(raw);
          const itemCount = Object.values(cartObj || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
          console.log('[Home] Cart for pid:', pid, 'items:', itemCount, 'cart:', cartObj);
          if (itemCount > 0) {
            totalCount += itemCount;
          } else {
            // Mark empty carts for cleanup
            keysToRemove.push(key);
            keysToRemove.push(`pmeta:${ownerKey}:${pid}`);
            keysToRemove.push(`rservices:${ownerKey}:${pid}`);
            keysToRemove.push(`rparts:${ownerKey}:${pid}`);
          }
        }
      }
      // Clean up empty cart entries
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove).catch(() => {});
      }
      console.log('[Home] Total cart count:', totalCount);
      setCartCount(totalCount);
    } catch (e) {
      setCartCount(0);
    }
  }, []);

  /* =========== ANALYTICS DATA FETCHING =========== */
  const loadAnalytics = useCallback(async () => {
    if (!restaurantId) {
      setAnalyticsLoading(false);
      return;
    }

    try {
      setAnalyticsLoading(true);

      const response = await api.get(
        `/owner/analytics?restaurantId=${restaurantId}&period=${selectedPeriod}`
      );
      if (response.data.ok) {
        setAnalyticsData(response.data.data);
      }
    } catch (error) {
      console.error('Analytics error:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [restaurantId, selectedPeriod]);

  /* =========== COMBINED DATA LOADING =========== */
  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchBanners(),
        fetchFeed(),
        fetchSponsored(),
        fetchGuides(),
      ]);
      setLoading(false);
    };
    loadAll();
  }, [fetchBanners, fetchFeed, fetchSponsored, fetchGuides]);

  useFocusEffect(
    useCallback(() => {
      calculateCartCount();
      loadAnalytics();
    }, [calculateCartCount, loadAnalytics])
  );

  useEffect(() => {
    if (restaurantId) {
      loadAnalytics();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, selectedPeriod]);

  /* =========== HERO BANNER ANIMATION =========== */
  const pulse = useRef(new Animated.Value(0.5)).current;
  const bar = useRef(new Animated.Value(0)).current;
  const DURATION = 10000;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.5, duration: 850, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cycle = useCallback(() => {
    if (!banners.length) return;
    bar.setValue(0);
    Animated.timing(bar, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setHeroIdx(i => (i + 1) % banners.length);
    });
  }, [banners.length, bar]);

  useEffect(() => {
    bar.stopAnimation();
    if (!showSkel && banners.length) cycle();
    return () => bar.stopAnimation();
  }, [heroIdx, showSkel, cycle, banners.length, bar]);

  /* =========== REFRESH =========== */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      await Promise.all([
        fetchBanners(),
        fetchFeed(),
        fetchSponsored(),
        fetchGuides(),
        loadRestaurants(), // Reload restaurants from context
        loadAnalytics(),
      ]);
      setTimeout(() => setRefreshing(false), 300);
    })();
  }, [fetchBanners, fetchFeed, fetchSponsored, fetchGuides, loadRestaurants, loadAnalytics]);

  /* =========== EXPORT PDF =========== */
  const handleExportPDF = async () => {
    if (!restaurantId) {
      Alert.alert('Error', 'Please select a restaurant first');
      return;
    }
    setExporting(true);
    try {
      const filePath = await exportAnalyticsPDF(restaurantId);
      Alert.alert('Export Successful', 'Analytics report has been exported', [
        { text: 'Open', onPress: () => openPDF(filePath) },
        { text: 'OK', style: 'cancel' }
      ]);
    } catch (error) {
      Alert.alert('Export Failed', error.message || 'Could not export analytics');
    } finally {
      setExporting(false);
    }
  };

  /* =========== QUICK NAVIGATION =========== */
  const goSupport = () => navigation.navigate?.('SupportCenter');
  const goRestaurants = () => navigation.navigate?.('MyRestaurants');
  const goBookings = () => navigation.navigate?.('MyBookings');
  const goGuide = () => open(guides?.[0]?.link);

  /* =========== ANALYTICS DATA =========== */
  const summary = analyticsData?.summary || {};
  const trends = analyticsData?.trends || {};
  const breakdowns = analyticsData?.breakdowns || {};
  const recent = analyticsData?.recent || {};
  const topCategories = breakdowns.expensesByCategory || [];

  /* =========== RENDER =========== */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Top bar */}
      <View style={[st.top, { paddingTop: 6 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.hBtn}>
            <Icon name="menu" size={20} color={C.ink} />
          </TouchableOpacity>
          <RestaurantSelectorCompact style={{ marginLeft: 10 }} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <TouchableOpacity
            onPress={handleExportPDF}
            disabled={exporting || !restaurantId}
            style={st.hBtn}
          >
            {exporting ? (
              <ActivityIndicator size="small" color={C.primary} />
            ) : (
              <Icon name="download-outline" size={18} color={restaurantId ? C.primary : C.muted} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate?.('Notifications')} style={st.hBtn}>
            <Icon name="notifications-outline" size={18} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate?.('Cart')} style={st.hBtn}>
            <Icon name="cart-outline" size={18} color={C.ink} />
            {cartCount > 0 && (
              <View style={st.cartBadge}>
                <Text style={st.cartBadgeText}>{cartCount > 99 ? '99+' : cartCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {showSkel ? (
          <SkeletonHome width={width} pulse={pulse} />
        ) : (
          <>
            {/* ANALYTICS SECTION */}
            <View style={st.sectionBox}>
              <TouchableOpacity
                style={st.sectionHeaderRow}
                onPress={() => setShowAnalytics(!showAnalytics)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Icon name="analytics" size={20} color={C.primary} />
                  <Text style={st.sectionTitle}>Analytics Overview</Text>
                </View>
                <Icon name={showAnalytics ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
              </TouchableOpacity>

              {showAnalytics && (
                <>
                  {/* Period Selector */}
                  <View style={st.periodSelector}>
                    {PERIOD_OPTIONS.map((option) => (
                      <TouchableOpacity
                        key={option.value}
                        style={[st.periodButton, selectedPeriod === option.value && st.periodButtonActive]}
                        onPress={() => setSelectedPeriod(option.value)}
                      >
                        <Text style={[st.periodText, selectedPeriod === option.value && st.periodTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Restaurant Selector - Uses Global Context */}
                  {hasMultipleRestaurants && (
                    <RestaurantSelectorChips style={{ marginBottom: 12 }} />
                  )}

                  {analyticsLoading ? (
                    <View style={{ padding: 20, alignItems: 'center' }}>
                      <ActivityIndicator color={C.primary} />
                    </View>
                  ) : !restaurantId ? (
                    <View style={st.emptyAnalytics}>
                      <Icon name="restaurant-outline" size={40} color={C.muted} />
                      <Text style={st.emptyText}>Add a restaurant to view analytics</Text>
                      <TouchableOpacity style={st.addRestBtn} onPress={() => navigation.navigate('MyRestaurants')}>
                        <Text style={st.addRestBtnText}>Add Restaurant</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {/* Summary Cards */}
                      <View style={st.summaryGrid}>
                        <View style={[st.summaryCard, { borderLeftColor: C.primary }]}>
                          <Icon name="calendar" size={20} color={C.primary} />
                          <Text style={st.summaryValue}>₹{summary.bookings?.revenue || 0}</Text>
                          <Text style={st.summaryLabel}>{summary.bookings?.count || 0} Bookings</Text>
                        </View>
                        <View style={[st.summaryCard, { borderLeftColor: C.warn }]}>
                          <Icon name="cash" size={20} color={C.warn} />
                          <Text style={st.summaryValue}>₹{summary.expenses?.total || 0}</Text>
                          <Text style={st.summaryLabel}>{summary.expenses?.count || 0} Expenses</Text>
                        </View>
                      </View>

                      <View style={st.summaryGrid}>
                        <View style={[st.summaryCard, { borderLeftColor: C.ok }]}>
                          <Icon name="hardware-chip" size={20} color={C.ok} />
                          <Text style={st.summaryValue}>{summary.equipment?.count || 0}</Text>
                          <Text style={st.summaryLabel}>Equipment</Text>
                        </View>
                      </View>

                      {/* Net Revenue */}
                      <View style={[st.netRevenueCard, summary.netRevenue >= 0 ? st.profit : st.loss]}>
                        <View style={st.netRevenueHeader}>
                          <Icon name={summary.netRevenue >= 0 ? 'trending-up' : 'trending-down'} size={24} color="#fff" />
                          <Text style={st.netRevenueLabel}>Net Revenue</Text>
                        </View>
                        <Text style={st.netRevenueValue}>₹{Math.abs(summary.netRevenue || 0)}</Text>
                        <Text style={st.netRevenueSubtext}>
                          {summary.netRevenue >= 0 ? 'Profit' : 'Loss'} for {selectedPeriod} days
                        </Text>
                      </View>
                    </>
                  )}
                </>
              )}
            </View>

            {/* CHARTS SECTION (Collapsible) */}
            {restaurantId && analyticsData && (
              <View style={st.sectionBox}>
                <TouchableOpacity
                  style={st.sectionHeaderRow}
                  onPress={() => setShowCharts(!showCharts)}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Icon name="bar-chart" size={20} color={C.primary} />
                    <Text style={st.sectionTitle}>Charts & Trends</Text>
                  </View>
                  <Icon name={showCharts ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
                </TouchableOpacity>

                {showCharts && (
                  <View style={{ marginTop: 12 }}>
                    {trends.bookingsByDay && trends.bookingsByDay.length > 0 && (
                      <LineChartCard
                        title="Booking Trends"
                        data={trends.bookingsByDay}
                        labelKey="date"
                        valueKey="count"
                      />
                    )}
                    {breakdowns.bookingsByStatus && breakdowns.bookingsByStatus.length > 0 && (
                      <PieChartCard
                        title="Bookings by Status"
                        data={breakdowns.bookingsByStatus.map((item) => ({
                          name: item.status,
                          count: item.count,
                          color: getStatusColor(item.status)
                        }))}
                      />
                    )}
                    {trends.dailyRevenue && trends.dailyRevenue.length > 0 && (
                      <BarChartCard
                        title="Daily Revenue"
                        data={trends.dailyRevenue}
                        labelKey="date"
                        valueKey="revenue"
                      />
                    )}
                    {topCategories.length > 0 && (
                      <View style={st.categoriesCard}>
                        <Text style={st.chartCardTitle}>Top Expense Categories</Text>
                        {topCategories.slice(0, 5).map((category, index) => (
                          <View key={index} style={st.categoryRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={[st.categoryDot, { backgroundColor: getCategoryColor(index) }]} />
                              <Text style={st.categoryName}>{category.category}</Text>
                            </View>
                            <Text style={st.categoryAmount}>₹{category.total || 0}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* HERO BANNER */}
            <View style={{ paddingHorizontal: 16 }}>
              {banners.length ? (
                <ImageBackground
                  source={{ uri: banners[heroIdx]?.image_url }}
                  style={[st.hero, { height: 180 }]}
                  imageStyle={{ borderRadius: R }}
                >
                  <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)', borderRadius: R }]} />
                  {banners[heroIdx]?.badge ? (
                    <View style={st.heroBadge}>
                      <Text style={st.heroBadgeTxt}>{banners[heroIdx].badge}</Text>
                    </View>
                  ) : null}
                  <View style={st.heroText}>
                    <Text style={st.heroH} numberOfLines={2}>{banners[heroIdx]?.title ?? ''}</Text>
                    {!!banners[heroIdx]?.subtitle && (
                      <Text style={st.heroP} numberOfLines={2}>{banners[heroIdx].subtitle}</Text>
                    )}
                    {!!banners[heroIdx]?.cta_text && !!banners[heroIdx]?.cta_link && (
                      <TouchableOpacity onPress={() => open(banners[heroIdx].cta_link)} style={st.heroBtn}>
                        <Text style={st.heroBtnTxt}>{banners[heroIdx].cta_text}</Text>
                        <Icon name="arrow-forward" size={14} color="#fff" />
                      </TouchableOpacity>
                    )}
                  </View>
                  <View style={st.heroProgWrap}>
                    <Animated.View style={[st.heroProgBar, { width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }) }]} />
                  </View>
                </ImageBackground>
              ) : (
                <View style={[st.hero, { height: 180, backgroundColor: '#E9EEF5', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ color: C.muted, fontWeight: '700' }}>No banners yet</Text>
                </View>
              )}
            </View>

            {/* Quick navigation */}
            <View style={st.quickRow}>
              <QuickNav icon="calendar-outline" label="My Bookings" onPress={goBookings} />
              <QuickNav icon="storefront-outline" label="My Restaurants" onPress={goRestaurants} />
              <QuickNav icon="headset-outline" label="Support" onPress={goSupport} />
            </View>

            {/* Feed pills */}
            {feed.length > 0 && (
              <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  {feed.map(f => (
                    <View
                      key={f.id}
                      style={[
                        st.pill,
                        f.tone === 'ok' ? { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' } :
                          f.tone === 'warn' ? { backgroundColor: '#FFFBEB', borderColor: '#FDE68A' } :
                            f.tone === 'danger' ? { backgroundColor: '#FEF2F2', borderColor: '#FECACA' } :
                              { backgroundColor: '#EFF6FF', borderColor: '#BFDBFE' }
                      ]}
                    >
                      <Icon
                        name={f.icon}
                        size={14}
                        color={
                          f.tone === 'ok' ? C.ok :
                            f.tone === 'warn' ? '#F59E0B' :
                              f.tone === 'danger' ? '#EF4444' :
                                C.info
                        }
                      />
                      <Text style={st.pillTxt}>{f.txt}</Text>
                    </View>
                  ))}
                </ScrollView>
              </View>
            )}

            {/* RECENT ACTIVITY */}
            {(recent.bookings?.length > 0 || recent.expenses?.length > 0) && (
              <View style={st.sectionBox}>
                <Text style={[st.sectionTitle, { marginBottom: 12 }]}>Recent Activity</Text>

                {recent.bookings && recent.bookings.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={st.recentHeader}>
                      <Text style={st.recentTitle}>Recent Bookings</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                        <Text style={st.link}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    {recent.bookings.slice(0, 3).map((booking) => (
                      <View key={booking.id} style={st.recentItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Icon name="calendar-outline" size={18} color={C.primary} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={st.recentItemTitle}>Booking #{booking.id.slice(0, 8)}</Text>
                            <Text style={st.recentItemDate}>
                              {new Date(booking.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <View>
                          <Text style={st.recentItemAmount}>₹{booking.totalAmount}</Text>
                          <Text style={[st.recentItemStatus, { color: getStatusColor(booking.status) }]}>
                            {booking.status}
                          </Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {recent.expenses && recent.expenses.length > 0 && (
                  <View>
                    <View style={st.recentHeader}>
                      <Text style={st.recentTitle}>Recent Expenses</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                        <Text style={st.link}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    {recent.expenses.slice(0, 3).map((expense) => (
                      <View key={expense.id} style={st.recentItem}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                          <Icon name="cash-outline" size={18} color={C.warn} />
                          <View style={{ marginLeft: 10, flex: 1 }}>
                            <Text style={st.recentItemTitle}>{expense.category}</Text>
                            <Text style={st.recentItemDate}>
                              {new Date(expense.expenseDate).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>
                        <Text style={st.recentItemAmount}>₹{expense.amount}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* Sponsored */}
            {sponsoredData.length > 0 && (
              <View style={{ marginTop: 16 }}>
                <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
                  <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#000' }}>Sponsored</Text>
                </View>
                <FlatList
                  horizontal
                  data={sponsoredData}
                  keyExtractor={(item) => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 2 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.link)}
                      activeOpacity={0.9}
                      style={{
                        width: Math.min(280, width * 0.75),
                        marginRight: 10,
                        borderRadius: 12,
                        overflow: 'hidden',
                        backgroundColor: '#fff',
                        elevation: 2,
                      }}
                    >
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}/${item.image}` }}
                        style={{ width: '100%', height: 120 }}
                        resizeMode="cover"
                      />
                      <View style={{ padding: 10 }}>
                        <Text style={{ color: "#333", fontWeight: 'bold', fontSize: 15 }} numberOfLines={1}>
                          {item.title}
                        </Text>
                        <Text style={{ color: '#666', fontSize: 13 }} numberOfLines={1}>
                          {item.description}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* Guides */}
            {guides.length > 0 && (
              <>
                <View style={st.sectionHdr}>
                  <Text style={st.sectionTitle}>Quick guides</Text>
                  <TouchableOpacity onPress={goGuide}><Text style={st.link}>View all</Text></TouchableOpacity>
                </View>
                <FlatList
                  horizontal
                  data={guides}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(i) => i.id}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => open(item.link)} style={[st.guideCard, { width: Math.min(260, width * 0.68) }]}>
                      <ImageBackground source={{ uri: item.thumb }} style={st.guideImg} imageStyle={{ borderTopLeftRadius: R, borderTopRightRadius: R }}>
                        <View style={st.play}><Icon name="play" size={14} color="#fff" /></View>
                      </ImageBackground>
                      <View style={{ padding: 12 }}>
                        <Text style={st.guideTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6 }}>
                          <Icon name="time-outline" size={14} color={C.muted} />
                          <Text style={st.guideMeta}>  {item.min} min</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </>
            )}

            {/* Announcements */}
            <View style={st.sectionHdr}>
              <Text style={st.sectionTitle}>From KNI</Text>
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              <Announcement icon="rocket-outline" title="Faster approvals" text="Keep your restaurant profile complete to unlock same-day service." />
              <Announcement icon="sparkles-outline" title="New: Inventory Timeline" text="Track spend & parts history across all equipment." />
            </View>
          </>
        )}
      </ScrollView>

      <KniBottomNav navigation={navigation} active="home" cartCount={cartCount} notifCount={0} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

/* ---------------- SKELETON ---------------- */
function SkeletonHome({ width, pulse }) {
  return (
    <>
      {/* Analytics skeleton */}
      <View style={st.sectionBox}>
        <Animated.View style={[stSK.h2, { opacity: pulse, width: 180, marginBottom: 12 }]} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
          {[0, 1, 2, 3].map(i => (
            <Animated.View key={i} style={[stSK.periodBtn, { opacity: pulse }]} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Animated.View style={[stSK.summaryCard, { opacity: pulse }]} />
          <Animated.View style={[stSK.summaryCard, { opacity: pulse }]} />
        </View>
      </View>

      {/* Hero */}
      <View style={{ paddingHorizontal: 16 }}>
        <Animated.View style={[stSK.hero, { opacity: pulse }]} />
      </View>

      {/* Quick nav */}
      <View style={st.quickRow}>
        {[0, 1, 2].map(i => (
          <View key={i} style={st.qItem}>
            <Animated.View style={[stSK.qIcon, { opacity: pulse }]} />
            <Animated.View style={[stSK.lineXs, { opacity: pulse, width: 60, marginTop: 6 }]} />
          </View>
        ))}
      </View>

      {/* Pills */}
      <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[0, 1, 2].map(i => (
            <Animated.View key={i} style={[stSK.pill, { opacity: pulse }]} />
          ))}
        </ScrollView>
      </View>
    </>
  );
}

/* ---------------- SUB-COMPONENTS ---------------- */
const QuickNav = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={st.qItem} activeOpacity={0.9}>
    <View style={st.qIcon}><Icon name={icon} size={18} color={C.primary} /></View>
    <Text style={st.qTxt}>{label}</Text>
  </TouchableOpacity>
);

const Announcement = ({ icon, title, text }) => (
  <View style={st.annCard}>
    <View style={st.annIcon}><Icon name={icon} size={16} color={C.primary} /></View>
    <View style={{ flex: 1 }}>
      <Text style={st.annTitle}>{title}</Text>
      <Text style={st.annText}>{text}</Text>
    </View>
  </View>
);

/* ---------------- STYLES ---------------- */
const st = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 10, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  hBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#EEF2F7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  cartBadge: { position: 'absolute', top: 2, right: 2, backgroundColor: C.primary, borderRadius: 10, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  cartBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },

  // Section box
  sectionBox: { backgroundColor: C.card, marginHorizontal: 16, marginTop: 16, borderRadius: 16, padding: 16 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { color: C.ink, fontWeight: '900', fontSize: 16 },

  // Period selector
  periodSelector: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  periodButton: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, alignItems: 'center' },
  periodButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { fontSize: 13, color: C.text, fontWeight: '600' },
  periodTextActive: { color: '#fff' },

  // Filter chips
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, marginRight: 8 },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  // Summary cards
  summaryGrid: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  summaryCard: { flex: 1, backgroundColor: C.bg, padding: 14, borderRadius: 12, borderLeftWidth: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 6 },
  summaryLabel: { fontSize: 12, color: C.muted, marginTop: 2 },

  // Net revenue
  netRevenueCard: { padding: 16, borderRadius: 12 },
  profit: { backgroundColor: C.ok },
  loss: { backgroundColor: C.danger },
  netRevenueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  netRevenueLabel: { fontSize: 13, color: '#fff', marginLeft: 8, fontWeight: '600' },
  netRevenueValue: { fontSize: 28, fontWeight: '700', color: '#fff' },
  netRevenueSubtext: { fontSize: 12, color: '#fff', opacity: 0.9, marginTop: 2 },

  // Empty analytics
  emptyAnalytics: { alignItems: 'center', padding: 20 },
  emptyText: { color: C.muted, marginTop: 8, marginBottom: 12 },
  addRestBtn: { backgroundColor: C.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  addRestBtnText: { color: '#fff', fontWeight: '600' },

  // Categories
  categoriesCard: { backgroundColor: C.bg, padding: 14, borderRadius: 12, marginTop: 12 },
  chartCardTitle: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 12 },
  categoryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  categoryDot: { width: 10, height: 10, borderRadius: 5 },
  categoryName: { fontSize: 13, color: C.text },
  categoryAmount: { fontSize: 14, fontWeight: '700', color: C.ink },

  // Recent activity
  recentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  recentTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  recentItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: C.bg, padding: 12, borderRadius: 10, marginBottom: 8 },
  recentItemTitle: { fontSize: 13, fontWeight: '600', color: C.ink },
  recentItemDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  recentItemAmount: { fontSize: 14, fontWeight: '700', color: C.ink, textAlign: 'right' },
  recentItemStatus: { fontSize: 10, marginTop: 2, textAlign: 'right', fontWeight: '600' },

  // Hero
  hero: { borderRadius: R, overflow: 'hidden', marginTop: 6 },
  heroBadge: { position: 'absolute', left: 12, top: 12, backgroundColor: '#FFFFFFE6', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  heroBadgeTxt: { color: C.ink, fontWeight: '900', fontSize: 12 },
  heroText: { position: 'absolute', left: 12, right: 12, bottom: 36 },
  heroH: { color: '#fff', fontWeight: '900', fontSize: 18 },
  heroP: { color: '#E5E7EB', marginTop: 2, fontSize: 13 },
  heroBtn: { marginTop: 8, alignSelf: 'flex-start', backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 6, flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroBtnTxt: { color: '#fff', fontWeight: '700', fontSize: 13 },
  heroProgWrap: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 3, backgroundColor: '#FFFFFF55', borderRadius: 2, overflow: 'hidden' },
  heroProgBar: { height: 3, backgroundColor: '#fff' },

  // Quick nav
  quickRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, marginTop: 16, gap: 10 },
  qItem: { flex: 1, backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, alignItems: 'center' },
  qIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  qTxt: { color: C.ink, fontWeight: '700', fontSize: 12 },

  // Pills
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, marginRight: 8 },
  pillTxt: { color: C.ink, fontWeight: '600', fontSize: 12 },

  // Section headers
  sectionHdr: { paddingHorizontal: 16, marginTop: 20, marginBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  link: { color: C.primary, fontWeight: '700', fontSize: 13 },

  // Guides
  guideCard: { backgroundColor: '#fff', borderRadius: R, borderWidth: 1, borderColor: '#EEF2F7', marginRight: 12, overflow: 'hidden' },
  guideImg: { width: '100%', height: 110, alignItems: 'center', justifyContent: 'center' },
  play: { width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center' },
  guideTitle: { color: C.text, fontWeight: '700', fontSize: 13 },
  guideMeta: { color: C.muted, fontWeight: '600', fontSize: 12 },

  // Announcements
  annCard: { backgroundColor: '#fff', borderRadius: R, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 },
  annIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
  annTitle: { color: C.ink, fontWeight: '700', fontSize: 14 },
  annText: { color: C.muted, marginTop: 2, fontSize: 12 },
});

/* ---------------- SKELETON STYLES ---------------- */
const stSK = StyleSheet.create({
  hero: { height: 180, backgroundColor: '#E9EEF5', borderRadius: R, marginTop: 6 },
  h2: { height: 18, borderRadius: 8, backgroundColor: '#E9EEF5' },
  periodBtn: { flex: 1, height: 36, borderRadius: 8, backgroundColor: '#E9EEF5' },
  summaryCard: { flex: 1, height: 90, borderRadius: 12, backgroundColor: '#E9EEF5' },
  qIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#F1F5F9' },
  pill: { width: 160, height: 34, borderRadius: 999, backgroundColor: '#EFF6FF', borderWidth: 1, borderColor: '#BFDBFE', marginRight: 8 },
  lineXs: { height: 10, borderRadius: 8, backgroundColor: '#E9EEF5' },
});
