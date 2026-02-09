// screens/HomeScreen.js — God-Level Home Dashboard
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity,
  ScrollView, FlatList, Animated, Easing, RefreshControl, Linking,
  useWindowDimensions, Alert, ActivityIndicator, Dimensions, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { RestaurantSelectorCompact, RestaurantSelectorChips } from '../components/RestaurantSelector';
import { useRestaurant } from '../context/RestaurantContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api, IMAGE_BASE_URL } from '../api/client';

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

/* ──────── THEME ──────── */
const C = {
  primary: '#EF3A3A', primaryDark: '#C62828', ink: '#1D2254', text: '#0F172A',
  muted: '#6B7280', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB',
  ok: '#10B981', info: '#3B82F6', warn: '#F59E0B', danger: '#EF4444',
};
const { width: W } = Dimensions.get('window');

/* ──────── HELPERS ──────── */
const open = async (url) => { try { await Linking.openURL(url); } catch { } };
const getCategoryColor = (i) => [C.primary, C.info, C.warn, C.ok, C.danger][i % 5];
const getStatusColor = (s) =>
  ({ PENDING: '#F59E0B', CONFIRMED: '#10B981', COMPLETED: '#3B82F6', CANCELLED: '#EF4444' })[s] || '#6B7280';

/* ──────── QUICK ACTION DATA ──────── */
const QA = [
  { icon: 'calendar-outline', label: 'Bookings', grad: ['#FF6B6B', '#EF3A3A'], screen: 'MyBookings' },
  { icon: 'storefront-outline', label: 'Restaurants', grad: ['#818CF8', '#6366F1'], screen: 'MyRestaurants' },
  { icon: 'construct-outline', label: 'Equipment', grad: ['#34D399', '#10B981'], screen: 'MyEquipment' },
  { icon: 'headset-outline', label: 'Support', grad: ['#FBBF24', '#F59E0B'], screen: 'SupportCenter' },
];

/* ======================================================================= */
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const {
    restaurants,
    selectedRestaurantId: restaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
    hasMultipleRestaurants,
  } = useRestaurant();

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sponsoredData, setSponsoredData] = useState([]);
  const [banners, setBanners] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [guides, setGuides] = useState([]);
  const [feed, setFeed] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

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

  /* ─── Greeting ─── */
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';
  const greetIcon = hour < 12 ? 'sunny' : hour < 17 ? 'partly-sunny' : 'moon';

  const selectedRest = restaurants?.find(r => r.id === restaurantId);

  /* ═══════════ HOME DATA FETCHING ═══════════ */
  const fetchSponsored = useCallback(async () => {
    try {
      const res = await api.get('/app_api/sponsored');
      setSponsoredData(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error("Error fetching sponsored:", error.message);
    }
  }, []);

  const fetchFeed = useCallback(async () => {
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
        setFeed(defaultFeeds);
      }
    } catch (e) {
      console.error('Feed error:', e?.response?.data || e.message);
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
            keysToRemove.push(key);
            keysToRemove.push(`pmeta:${ownerKey}:${pid}`);
            keysToRemove.push(`rservices:${ownerKey}:${pid}`);
            keysToRemove.push(`rparts:${ownerKey}:${pid}`);
          }
        }
      }
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove).catch(() => {});
      }
      console.log('[Home] Total cart count:', totalCount);
      setCartCount(totalCount);
    } catch (e) {
      setCartCount(0);
    }
  }, []);

  /* ═══════════ ANALYTICS ═══════════ */
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

  /* ═══════════ LIFECYCLE ═══════════ */
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

  /* ═══════════ BANNER ANIMATION ═══════════ */
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

  /* ═══════════ ACTIONS ═══════════ */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      await Promise.all([
        fetchBanners(),
        fetchFeed(),
        fetchSponsored(),
        fetchGuides(),
        loadRestaurants(),
        loadAnalytics(),
      ]);
      setTimeout(() => setRefreshing(false), 300);
    })();
  }, [fetchBanners, fetchFeed, fetchSponsored, fetchGuides, loadRestaurants, loadAnalytics]);

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

  const goGuide = () => open(guides?.[0]?.link);

  /* ═══════════ ANALYTICS DATA ═══════════ */
  const summary = analyticsData?.summary || {};
  const trends = analyticsData?.trends || {};
  const breakdowns = analyticsData?.breakdowns || {};
  const recent = analyticsData?.recent || {};
  const topCategories = breakdowns.expensesByCategory || [];

  /* ═══════════════════════════════════════════════════════════════════════
     ░░░ R E N D E R ░░░
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* ══════ GRADIENT HEADER ══════ */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={[st.headerGrad, { paddingTop: insets.top + 10 }]}
      >
        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.headerBtn}>
            <Icon name="menu" size={22} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 14 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Icon name={greetIcon} size={15} color="#FFD700" />
              <Text style={st.greetText}>{greeting}</Text>
            </View>
            <Text style={st.headerRestName} numberOfLines={1}>
              {selectedRest?.name || 'KNI Super App'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={handleExportPDF}
              disabled={exporting || !restaurantId}
              style={st.headerBtn}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="download-outline" size={18} color={restaurantId ? '#fff' : 'rgba(255,255,255,0.35)'} />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate?.('Notifications')} style={st.headerBtn}>
              <Icon name="notifications-outline" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate?.('Cart')} style={st.headerBtn}>
              <Icon name="cart-outline" size={18} color="#fff" />
              {cartCount > 0 && (
                <View style={st.cartBadge}>
                  <Text style={st.cartBadgeTxt}>{cartCount > 99 ? '99+' : cartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ══════ SCROLLABLE CONTENT ══════ */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {showSkel ? (
          <SkeletonHome pulse={pulse} />
        ) : (
          <>
            {/* Restaurant Selector (for multi-restaurant owners) */}
            {hasMultipleRestaurants && (
              <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
                <RestaurantSelectorCompact />
              </View>
            )}

            {/* ══════ HERO BANNER ══════ */}
            <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
              {banners.length ? (() => {
                const rawUrl = banners[heroIdx]?.image_url || '';
                const bannerImgUri = rawUrl.startsWith('http') ? rawUrl : `${IMAGE_BASE_URL}${rawUrl}`;
                return (
                <View style={st.bannerWrap}>
                  <ImageBackground
                    source={{ uri: bannerImgUri }}
                    style={st.bannerImg}
                    imageStyle={{ borderRadius: 20 }}
                  >
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={st.bannerOverlay}
                    />
                    {banners[heroIdx]?.badge ? (
                      <View style={st.bannerBadge}>
                        <Text style={st.bannerBadgeTxt}>{banners[heroIdx].badge}</Text>
                      </View>
                    ) : null}
                    <View style={st.bannerContent}>
                      <Text style={st.bannerTitle} numberOfLines={2}>
                        {banners[heroIdx]?.title ?? ''}
                      </Text>
                      {!!banners[heroIdx]?.subtitle && (
                        <Text style={st.bannerSub} numberOfLines={2}>{banners[heroIdx].subtitle}</Text>
                      )}
                      {!!banners[heroIdx]?.cta_text && !!banners[heroIdx]?.cta_link && (
                        <TouchableOpacity onPress={() => open(banners[heroIdx].cta_link)} style={st.bannerCta}>
                          <Text style={st.bannerCtaTxt}>{banners[heroIdx].cta_text}</Text>
                          <Icon name="arrow-forward" size={14} color="#fff" />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Dots + Progress */}
                    <View style={st.bannerBottom}>
                      {banners.length > 1 && (
                        <View style={st.dotsRow}>
                          {banners.map((_, i) => (
                            <View key={i} style={[st.dot, i === heroIdx && st.dotActive]} />
                          ))}
                        </View>
                      )}
                      <View style={st.progWrap}>
                        <Animated.View
                          style={[st.progBar, {
                            width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] })
                          }]}
                        />
                      </View>
                    </View>
                  </ImageBackground>
                </View>
                );
              })() : (
                <View style={st.bannerEmpty}>
                  <Icon name="image-outline" size={36} color={C.muted} />
                  <Text style={{ color: C.muted, fontWeight: '700', marginTop: 8 }}>No banners yet</Text>
                </View>
              )}
            </View>

            {/* ══════ QUICK ACTIONS ══════ */}
            <View style={st.qaRow}>
              {QA.map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={st.qaItem}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(q.screen)}
                >
                  <LinearGradient colors={q.grad} style={st.qaIcon}>
                    <Icon name={q.icon} size={20} color="#fff" />
                  </LinearGradient>
                  <Text style={st.qaLabel}>{q.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ══════ FEED PILLS ══════ */}
            {feed.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 2 }}
                style={{ marginTop: 16 }}
              >
                {feed.map(f => (
                  <View
                    key={f.id}
                    style={[
                      st.pill,
                      f.tone === 'ok' ? { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' } :
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
                          f.tone === 'warn' ? C.warn :
                            f.tone === 'danger' ? C.danger : C.info
                      }
                    />
                    <Text style={st.pillTxt}>{f.txt}</Text>
                  </View>
                ))}
              </ScrollView>
            )}

            {/* ══════ ANALYTICS DASHBOARD ══════ */}
            <View style={st.section}>
              <TouchableOpacity
                style={st.sectionHead}
                onPress={() => setShowAnalytics(!showAnalytics)}
                activeOpacity={0.7}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <LinearGradient colors={[C.primary, C.primaryDark]} style={st.sectionBadge}>
                    <Icon name="analytics" size={15} color="#fff" />
                  </LinearGradient>
                  <Text style={st.sectionTitle}>Analytics Overview</Text>
                </View>
                <Icon name={showAnalytics ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
              </TouchableOpacity>

              {showAnalytics && (
                <>
                  {/* Period selector */}
                  <View style={st.periodRow}>
                    {PERIOD_OPTIONS.map(opt => (
                      <TouchableOpacity
                        key={opt.value}
                        style={[st.periodChip, selectedPeriod === opt.value && st.periodChipOn]}
                        onPress={() => setSelectedPeriod(opt.value)}
                      >
                        <Text style={[st.periodTxt, selectedPeriod === opt.value && st.periodTxtOn]}>
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {hasMultipleRestaurants && (
                    <RestaurantSelectorChips style={{ marginBottom: 12 }} />
                  )}

                  {analyticsLoading ? (
                    <View style={{ padding: 28, alignItems: 'center' }}>
                      <ActivityIndicator color={C.primary} />
                    </View>
                  ) : !restaurantId ? (
                    <View style={st.emptyAna}>
                      <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.emptyIconBg}>
                        <Icon name="restaurant-outline" size={28} color={C.primary} />
                      </LinearGradient>
                      <Text style={st.emptyTitle}>No Restaurant Selected</Text>
                      <Text style={st.emptySubtitle}>Add a restaurant to view analytics</Text>
                      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('MyRestaurants')}>
                        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.emptyBtn}>
                          <Icon name="add" size={16} color="#fff" />
                          <Text style={st.emptyBtnTxt}>Add Restaurant</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      {/* Summary Cards */}
                      <View style={st.statsGrid}>
                        <StatCard
                          icon="calendar"
                          gradColors={['#FEF2F2', '#FFE4E6']}
                          iconColor={C.primary}
                          value={`₹${(summary.bookings?.revenue || 0).toLocaleString()}`}
                          label={`${summary.bookings?.count || 0} Bookings`}
                        />
                        <StatCard
                          icon="cash"
                          gradColors={['#FFFBEB', '#FEF3C7']}
                          iconColor={C.warn}
                          value={`₹${(summary.expenses?.total || 0).toLocaleString()}`}
                          label={`${summary.expenses?.count || 0} Expenses`}
                        />
                      </View>
                      <View style={st.statsGrid}>
                        <StatCard
                          icon="hardware-chip"
                          gradColors={['#ECFDF5', '#D1FAE5']}
                          iconColor={C.ok}
                          value={`${summary.equipment?.count || 0}`}
                          label="Equipment"
                        />
                        <View style={{ flex: 1 }} />
                      </View>

                      {/* Net Revenue */}
                      <LinearGradient
                        colors={summary.netRevenue >= 0 ? ['#10B981', '#059669'] : ['#EF4444', '#DC2626']}
                        style={st.netCard}
                      >
                        <View style={st.netTop}>
                          <View style={st.netIconBg}>
                            <Icon
                              name={summary.netRevenue >= 0 ? 'trending-up' : 'trending-down'}
                              size={20}
                              color="#fff"
                            />
                          </View>
                          <Text style={st.netLabel}>Net Revenue</Text>
                        </View>
                        <Text style={st.netValue}>
                          ₹{Math.abs(summary.netRevenue || 0).toLocaleString()}
                        </Text>
                        <Text style={st.netSub}>
                          {summary.netRevenue >= 0 ? 'Profit' : 'Loss'} for {selectedPeriod} days
                        </Text>
                      </LinearGradient>
                    </>
                  )}
                </>
              )}
            </View>

            {/* ══════ CHARTS (Collapsible) ══════ */}
            {restaurantId && analyticsData && (
              <View style={st.section}>
                <TouchableOpacity
                  style={st.sectionHead}
                  onPress={() => setShowCharts(!showCharts)}
                  activeOpacity={0.7}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LinearGradient colors={['#818CF8', '#6366F1']} style={st.sectionBadge}>
                      <Icon name="bar-chart" size={15} color="#fff" />
                    </LinearGradient>
                    <Text style={st.sectionTitle}>Charts & Trends</Text>
                  </View>
                  <Icon name={showCharts ? 'chevron-up' : 'chevron-down'} size={18} color={C.muted} />
                </TouchableOpacity>

                {showCharts && (
                  <View style={{ marginTop: 12, marginHorizontal: -16, overflow: 'hidden' }}>
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
                      <View style={st.catCard}>
                        <Text style={st.catCardTitle}>Top Expense Categories</Text>
                        {topCategories.slice(0, 5).map((cat, idx) => (
                          <View key={idx} style={st.catRow}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                              <View style={[st.catDot, { backgroundColor: getCategoryColor(idx) }]} />
                              <Text style={st.catName}>{cat.category}</Text>
                            </View>
                            <Text style={st.catAmt}>₹{cat.total || 0}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}

            {/* ══════ RECENT ACTIVITY ══════ */}
            {(recent.bookings?.length > 0 || recent.expenses?.length > 0) && (
              <View style={st.section}>
                <View style={[st.sectionHead, { marginBottom: 14 }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <LinearGradient colors={['#60A5FA', '#3B82F6']} style={st.sectionBadge}>
                      <Icon name="time" size={15} color="#fff" />
                    </LinearGradient>
                    <Text style={st.sectionTitle}>Recent Activity</Text>
                  </View>
                </View>

                {recent.bookings?.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <View style={st.recentSubHead}>
                      <Text style={st.recentSubTitle}>Bookings</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                        <Text style={st.link}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    {recent.bookings.slice(0, 3).map(b => (
                      <View key={b.id} style={st.recentItem}>
                        <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.recentIconBg}>
                          <Icon name="calendar-outline" size={16} color={C.primary} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={st.recentName}>Booking #{b.id.slice(0, 8)}</Text>
                          <Text style={st.recentDate}>
                            {new Date(b.createdAt).toLocaleDateString()}
                          </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={st.recentAmt}>₹{b.totalAmount}</Text>
                          <View style={[st.statusChip, { backgroundColor: getStatusColor(b.status) + '20' }]}>
                            <Text style={[st.statusChipTxt, { color: getStatusColor(b.status) }]}>
                              {b.status}
                            </Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}

                {recent.expenses?.length > 0 && (
                  <View>
                    <View style={st.recentSubHead}>
                      <Text style={st.recentSubTitle}>Expenses</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                        <Text style={st.link}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    {recent.expenses.slice(0, 3).map(e => (
                      <View key={e.id} style={st.recentItem}>
                        <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={st.recentIconBg}>
                          <Icon name="cash-outline" size={16} color={C.warn} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: 12 }}>
                          <Text style={st.recentName}>{e.category}</Text>
                          <Text style={st.recentDate}>
                            {new Date(e.expenseDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={st.recentAmt}>₹{e.amount}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ══════ SPONSORED ══════ */}
            {sponsoredData.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <View style={st.sectionHdr}>
                  <Text style={st.sectionTitle}>Sponsored</Text>
                </View>
                <FlatList
                  horizontal
                  data={sponsoredData}
                  keyExtractor={(item) => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => Linking.openURL(item.link)}
                      activeOpacity={0.9}
                      style={st.sponsorCard}
                    >
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}/${item.image}` }}
                        style={st.sponsorImg}
                        resizeMode="cover"
                      />
                      <View style={{ padding: 12 }}>
                        <Text style={st.sponsorTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={st.sponsorDesc} numberOfLines={1}>{item.description}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* ══════ QUICK GUIDES ══════ */}
            {guides.length > 0 && (
              <View style={{ marginTop: 20 }}>
                <View style={st.sectionHdr}>
                  <Text style={st.sectionTitle}>Quick Guides</Text>
                  <TouchableOpacity onPress={goGuide}>
                    <Text style={st.link}>View all</Text>
                  </TouchableOpacity>
                </View>
                <FlatList
                  horizontal
                  data={guides}
                  showsHorizontalScrollIndicator={false}
                  keyExtractor={(i) => i.id}
                  contentContainerStyle={{ paddingHorizontal: 16 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => open(item.link)} style={st.guideCard}>
                      <ImageBackground
                        source={{ uri: item.thumb }}
                        style={st.guideImg}
                        imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}
                      >
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.3)']}
                          style={StyleSheet.absoluteFill}
                        />
                        <View style={st.playBtn}>
                          <Icon name="play" size={16} color="#fff" />
                        </View>
                      </ImageBackground>
                      <View style={{ padding: 12 }}>
                        <Text style={st.guideTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 }}>
                          <Icon name="time-outline" size={13} color={C.muted} />
                          <Text style={st.guideMeta}>{item.min} min</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            )}

            {/* ══════ FROM KNI ══════ */}
            <View style={st.sectionHdr}>
              <Text style={st.sectionTitle}>From KNI</Text>
            </View>
            <View style={{ paddingHorizontal: 16 }}>
              <AnnCard
                icon="rocket-outline"
                grad={['#818CF8', '#6366F1']}
                title="Faster approvals"
                text="Keep your restaurant profile complete to unlock same-day service."
              />
              <AnnCard
                icon="sparkles-outline"
                grad={['#F472B6', '#EC4899']}
                title="New: Inventory Timeline"
                text="Track spend & parts history across all equipment."
              />
            </View>
          </>
        )}
      </ScrollView>

      <KniBottomNav navigation={navigation} active="home" cartCount={cartCount} notifCount={0} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

/* ──────────────────── SKELETON ──────────────────── */
function SkeletonHome({ pulse }) {
  const Bone = ({ style }) => <Animated.View style={[stSK.bone, style, { opacity: pulse }]} />;
  return (
    <>
      {/* Banner skeleton */}
      <View style={{ paddingHorizontal: 16, marginTop: 14 }}>
        <Bone style={{ height: 190, borderRadius: 20 }} />
      </View>

      {/* Quick actions skeleton */}
      <View style={st.qaRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={st.qaItem}>
            <Bone style={{ width: 48, height: 48, borderRadius: 16 }} />
            <Bone style={{ width: 50, height: 10, borderRadius: 5, marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Pills skeleton */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 16, marginTop: 16, gap: 8 }}>
        {[0, 1, 2].map(i => (
          <Bone key={i} style={{ width: 140, height: 34, borderRadius: 999 }} />
        ))}
      </View>

      {/* Analytics skeleton */}
      <View style={[st.section, { marginTop: 16 }]}>
        <Bone style={{ width: 180, height: 18, borderRadius: 8, marginBottom: 14 }} />
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
          {[0, 1, 2, 3].map(i => (
            <Bone key={i} style={{ flex: 1, height: 36, borderRadius: 10 }} />
          ))}
        </View>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Bone style={{ flex: 1, height: 100, borderRadius: 16 }} />
          <Bone style={{ flex: 1, height: 100, borderRadius: 16 }} />
        </View>
        <Bone style={{ height: 80, borderRadius: 16, marginTop: 12 }} />
      </View>
    </>
  );
}

/* ──────────────────── SUBCOMPONENTS ──────────────────── */
const StatCard = ({ icon, gradColors, iconColor, value, label }) => (
  <View style={st.statCard}>
    <LinearGradient colors={gradColors} style={st.statIconBg}>
      <Icon name={icon} size={16} color={iconColor} />
    </LinearGradient>
    <Text style={st.statValue}>{value}</Text>
    <Text style={st.statLabel}>{label}</Text>
  </View>
);

const AnnCard = ({ icon, grad, title, text }) => (
  <View style={st.annCard}>
    <LinearGradient colors={grad} style={st.annIconBg}>
      <Icon name={icon} size={16} color="#fff" />
    </LinearGradient>
    <View style={{ flex: 1 }}>
      <Text style={st.annTitle}>{title}</Text>
      <Text style={st.annText}>{text}</Text>
    </View>
  </View>
);

/* ════════════════════════════════════════════════════════
   ░░░ S T Y L E S ░░░
   ════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  /* ── Header ── */
  headerGrad: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  greetText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 12,
    fontWeight: '600',
  },
  headerRestName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 2,
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#FFD700',
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeTxt: {
    color: C.ink,
    fontSize: 9,
    fontWeight: '800',
  },

  /* ── Banner ── */
  bannerWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 8,
  },
  bannerImg: {
    width: '100%',
    height: 190,
    justifyContent: 'flex-end',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 20,
  },
  bannerBadge: {
    position: 'absolute',
    left: 14,
    top: 14,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  bannerBadgeTxt: {
    color: C.ink,
    fontWeight: '900',
    fontSize: 11,
  },
  bannerContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    lineHeight: 24,
  },
  bannerSub: {
    color: '#E5E7EB',
    marginTop: 3,
    fontSize: 13,
  },
  bannerCta: {
    marginTop: 10,
    alignSelf: 'flex-start',
    backgroundColor: C.primary,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bannerCtaTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 13,
  },
  bannerBottom: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 10,
    gap: 6,
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: 20,
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  progWrap: {
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progBar: {
    height: 3,
    backgroundColor: '#fff',
  },
  bannerEmpty: {
    height: 190,
    borderRadius: 20,
    backgroundColor: '#E9EEF5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  /* ── Quick Actions ── */
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginTop: 18,
    gap: 10,
  },
  qaItem: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  qaIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  qaLabel: {
    color: C.ink,
    fontWeight: '700',
    fontSize: 11,
  },

  /* ── Feed Pills ── */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    marginRight: 8,
  },
  pillTxt: {
    color: C.ink,
    fontWeight: '600',
    fontSize: 12,
  },

  /* ── Sections ── */
  section: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 18,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionBadge: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: C.ink,
    fontWeight: '900',
    fontSize: 16,
  },
  sectionHdr: {
    paddingHorizontal: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    color: C.primary,
    fontWeight: '700',
    fontSize: 13,
  },

  /* ── Period selector ── */
  periodRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    marginBottom: 14,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1.2,
    borderColor: C.border,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  periodChipOn: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodTxt: {
    fontSize: 13,
    color: C.text,
    fontWeight: '700',
  },
  periodTxtOn: {
    color: '#fff',
  },

  /* ── Empty analytics ── */
  emptyAna: {
    alignItems: 'center',
    paddingVertical: 28,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 16,
    marginBottom: 4,
  },
  emptySubtitle: {
    color: C.muted,
    fontSize: 13,
    marginBottom: 16,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  emptyBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },

  /* ── Stats Cards ── */
  statsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 16,
    padding: 14,
  },
  statIconBg: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  statLabel: {
    fontSize: 12,
    color: C.muted,
    fontWeight: '600',
    marginTop: 2,
  },

  /* ── Net Revenue ── */
  netCard: {
    borderRadius: 16,
    padding: 18,
  },
  netTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  netIconBg: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  netLabel: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: '700',
  },
  netValue: {
    fontSize: 30,
    fontWeight: '900',
    color: '#fff',
  },
  netSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    fontWeight: '600',
    marginTop: 4,
  },

  /* ── Categories ── */
  catCard: {
    backgroundColor: C.bg,
    padding: 14,
    borderRadius: 14,
    marginTop: 12,
  },
  catCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 12,
  },
  catRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  catDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  catName: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  catAmt: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },

  /* ── Recent Activity ── */
  recentSubHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  recentSubTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  recentIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  recentDate: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  recentAmt: {
    fontSize: 14,
    fontWeight: '800',
    color: C.ink,
  },
  statusChip: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 3,
  },
  statusChipTxt: {
    fontSize: 9,
    fontWeight: '800',
  },

  /* ── Sponsored ── */
  sponsorCard: {
    width: Math.min(280, W * 0.75),
    marginRight: 12,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sponsorImg: {
    width: '100%',
    height: 120,
  },
  sponsorTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 14,
  },
  sponsorDesc: {
    color: C.muted,
    fontSize: 12,
    marginTop: 3,
  },

  /* ── Guides ── */
  guideCard: {
    width: Math.min(260, W * 0.68),
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginRight: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  guideImg: {
    width: '100%',
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  guideTitle: {
    color: C.ink,
    fontWeight: '700',
    fontSize: 13,
  },
  guideMeta: {
    color: C.muted,
    fontWeight: '600',
    fontSize: 12,
  },

  /* ── Announcements ── */
  annCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  annIconBg: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  annTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 14,
  },
  annText: {
    color: C.muted,
    marginTop: 2,
    fontSize: 12,
    lineHeight: 17,
  },
});

/* ──────────────────── SKELETON STYLES ──────────────────── */
const stSK = StyleSheet.create({
  bone: {
    backgroundColor: '#E2E8F0',
  },
});
