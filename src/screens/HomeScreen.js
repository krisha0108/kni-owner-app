// screens/HomeScreen.js — God-Level Home Dashboard
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity,
  ScrollView, FlatList, Animated, Easing, RefreshControl, Linking,
  useWindowDimensions, ActivityIndicator, Dimensions, StatusBar
} from 'react-native';
import AppAlert from '../utils/AppAlert';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import NavigationMenu from '../components/NavigationMenu';
import SearchOverlay from '../components/SearchOverlay';
import { RestaurantSelectorCard, RestaurantSelectorCompact } from '../components/RestaurantSelector';
import { useRestaurant } from '../context/RestaurantContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api, IMAGE_BASE_URL } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { isStale, markFetched } from '../utils/focusCache';

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
// Width is now obtained dynamically from useWindowDimensions()

/* ──────── HELPERS ──────── */
const open = async (url) => { try { await Linking.openURL(url); } catch { } };
// Keyed on the real ServiceBookingStatus enum (prisma/schema.prisma).
const getStatusColor = (s) =>
  ({
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
  })[s] || '#6B7280';

/* ──────── QUICK ACTION DATA ──────── */
const QA = [
  { icon: 'calendar-outline', label: 'Bookings', desc: 'Manage bookings & reservations', tint: '#EF3A3A', tintBg: '#FDEAEA', screen: 'MyBookings', permission: 'bookings:read' },
  { icon: 'receipt-outline', label: 'Expenses', desc: 'Track & manage expenses', tint: '#4F63D2', tintBg: '#E7ECFB', screen: 'Expenses', permission: 'expenses:read' },
  { icon: 'shield-checkmark-outline', label: 'AMC', desc: 'Maintenance & service', tint: '#EF3A3A', tintBg: '#FDEAEA', screen: 'AMCDashboard', permission: 'amc:read' },
  { icon: 'headset-outline', label: 'Support', desc: 'Get help & raise tickets', tint: '#4F63D2', tintBg: '#E7ECFB', screen: 'SupportCenter', permission: 'support:read' },
];

/* ======================================================================= */
export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { can } = usePermissions();

  const {
    restaurants,
    selectedRestaurantId: restaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  /* ─── State ─── */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sponsoredData, setSponsoredData] = useState([]);
  const [offers, setOffers] = useState([]);
  const [heroIdx, setHeroIdx] = useState(0);
  const [guides, setGuides] = useState([]);
  const [feed, setFeed] = useState([]);
  const [cartCount, setCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  const [searchVisible, setSearchVisible] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(0);

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [amcUpcomingCount, setAmcUpcomingCount] = useState(0);

  const isFirstLoad = useRef(true);
  const showSkel = loading || refreshing;

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const PERIOD_OPTIONS = [
    { label: '7D', value: 7 },
    { label: '30D', value: 30 },
    { label: '90D', value: 90 },
    { label: '1Y', value: 365 },
  ];

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

  const fetchOffers = useCallback(async () => {
    try {
      const { data } = await api.get('/owner/offers', {
        params: restaurantId ? { restaurantId } : {}
      });
      setOffers(Array.isArray(data?.data) ? data.data : []);
      setHeroIdx(0);
    } catch (e) {
      console.error('Offers load error', e);
    }
  }, [restaurantId]);

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
      AppAlert.alert('Error', 'Failed to load analytics data');
    } finally {
      setAnalyticsLoading(false);
    }
  }, [restaurantId, selectedPeriod]);

  /* ═══════════ AMC UPCOMING VISITS (for the Home banner's count tag) ═══════════ */
  const fetchAmcUpcoming = useCallback(async () => {
    if (!restaurantId || !can('amc:read')) { setAmcUpcomingCount(0); return; }
    try {
      const response = await api.get(`/owner/amc-dashboard?restaurantId=${restaurantId}`);
      if (response.data.ok) {
        setAmcUpcomingCount(response.data.data?.upcomingVisits?.length || 0);
      }
    } catch (error) {
      setAmcUpcomingCount(0);
    }
  }, [restaurantId, can]);

  const fetchNotifCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      if (response.data?.ok) {
        setNotifCount(response.data.data?.count || 0);
      }
    } catch (error) {
      // silently fail
    }
  }, []);

  /* ═══════════ LIFECYCLE ═══════════ */
  // Load all home data on screen focus (covers first mount + every tab switch)
  useFocusEffect(
    useCallback(() => {
      const contentKey = 'Home-content';
      const loadAll = async () => {
        if (isFirstLoad.current) setLoading(true);
        loadRestaurants(); // internally staleness-guarded
        if (isStale(contentKey)) {
          await Promise.all([fetchOffers(), fetchFeed(), fetchSponsored(), fetchGuides()]);
          markFetched(contentKey);
        }
        if (isFirstLoad.current) {
          setLoading(false);
          isFirstLoad.current = false;
        }
      };
      loadAll();
      calculateCartCount();

      const notifKey = 'Home-notifCount';
      if (isStale(notifKey)) { fetchNotifCount(); markFetched(notifKey); }

      const analyticsKey = `Home-analytics-${restaurantId}-${selectedPeriod}`;
      if (isStale(analyticsKey)) { loadAnalytics(); markFetched(analyticsKey); }

      const amcKey = `Home-amcUpcoming-${restaurantId}`;
      if (isStale(amcKey)) { fetchAmcUpcoming(); markFetched(amcKey); }
    }, [loadRestaurants, fetchOffers, fetchFeed, fetchSponsored, fetchGuides, calculateCartCount, restaurantId, loadAnalytics, fetchNotifCount, selectedPeriod, fetchAmcUpcoming])
  );

  // Reload analytics when restaurant or period changes
  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, selectedPeriod, loadAnalytics]);

  // Reload AMC upcoming-visits count when restaurant changes
  useEffect(() => {
    fetchAmcUpcoming();
  }, [restaurantId, fetchAmcUpcoming]);

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
    if (!offers.length) return;
    bar.setValue(0);
    Animated.timing(bar, {
      toValue: 1,
      duration: DURATION,
      easing: Easing.linear,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (!finished) return;
      setHeroIdx(i => (i + 1) % offers.length);
    });
  }, [offers.length, bar]);

  useEffect(() => {
    bar.stopAnimation();
    if (!showSkel && offers.length) cycle();
    return () => bar.stopAnimation();
  }, [heroIdx, showSkel, cycle, offers.length, bar]);

  /* ═══════════ ACTIONS ═══════════ */
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      await Promise.all([
        fetchOffers(),
        fetchFeed(),
        fetchSponsored(),
        fetchGuides(),
        loadRestaurants({ force: true }),
        loadAnalytics(),
        calculateCartCount(),
        fetchAmcUpcoming(),
      ]);
      markFetched('Home-content');
      markFetched('Home-notifCount');
      if (restaurantId) {
        markFetched(`Home-analytics-${restaurantId}-${selectedPeriod}`);
        markFetched(`Home-amcUpcoming-${restaurantId}`);
      }
      setTimeout(() => setRefreshing(false), 300);
    })();
  }, [fetchOffers, fetchFeed, fetchSponsored, fetchGuides, loadRestaurants, loadAnalytics, calculateCartCount, restaurantId, selectedPeriod, fetchAmcUpcoming]);

  const goGuide = () => open(guides?.[0]?.link);

  /* ═══════════ ANALYTICS DATA ═══════════ */
  const summary = analyticsData?.summary || {};
  const recent = analyticsData?.recent || {};

  /* ═══════════════════════════════════════════════════════════════════════
     ░░░ R E N D E R ░░░
     ═══════════════════════════════════════════════════════════════════════ */
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ══════ GRADIENT HEADER ══════ */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        style={[st.headerGrad, { paddingTop: insets.top + scale(8) }]}
        onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
      >
        {/* Decorative blobs */}
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />

        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.headerBtnMenu}>
            <Icon name="menu" size={scale(17)} color={C.primary} />
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginLeft: scale(8) }}>
            <View style={{ flex: 1 }}>
              <Text style={st.headerGreet}>{greeting}</Text>
              <Text style={st.headerRestName} numberOfLines={1}>
                {selectedRest?.name || 'KNI Super App'}
              </Text>
            </View>
          </View>

          <View style={st.headerIconPill}>
            <TouchableOpacity
              onPress={() => setSearchVisible((v) => !v)}
              style={[st.headerBtnSm, searchVisible && st.headerBtnSmActive]}
            >
              <Icon name="search" size={scale(15)} color={searchVisible ? C.primary : '#fff'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => navigation.navigate?.('Notifications')} style={st.headerBtnSm}>
              <Icon name="notifications-outline" size={scale(15)} color="#fff" />
              {notifCount > 0 && (
                <View style={{position:'absolute',top:-4,right:-4,backgroundColor:'#FF3B30',borderRadius:10,minWidth:18,height:18,justifyContent:'center',alignItems:'center',paddingHorizontal:4}}>
                  <Text style={{color:'#fff',fontSize:10,fontWeight:'700'}}>{notifCount > 99 ? '99+' : notifCount}</Text>
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
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(120) }}
        showsVerticalScrollIndicator={false}
      >
        {showSkel ? (
          <SkeletonHome pulse={pulse} />
        ) : (
          <>
            {/* Current Restaurant -- light/compact card instead of the
                bolder full-width bar, per the client's redesign brief. */}
            <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
              <RestaurantSelectorCard />
            </View>

            {/* ══════ HERO OFFER ══════ */}
            {offers.length > 0 && (
            <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
              {(() => {
                const activeOffer = offers[heroIdx];
                const rawUrl = activeOffer?.imageUrl || '';
                const offerImgUri = rawUrl ? (rawUrl.startsWith('http') ? rawUrl : `${IMAGE_BASE_URL}${rawUrl}`) : null;
                const InnerContent = (
                  <>
                    <LinearGradient
                      colors={['transparent', 'rgba(0,0,0,0.6)']}
                      style={st.bannerOverlay}
                    />
                    <View style={st.bannerBadge}>
                      <Text style={st.bannerBadgeTxt}>{activeOffer.discountPercent}% OFF</Text>
                    </View>
                    <View style={st.bannerContent}>
                      <Text style={st.bannerTitle} numberOfLines={2}>
                        {activeOffer?.name ?? ''}
                      </Text>
                      {!!activeOffer?.description && (
                        <Text style={st.bannerSub} numberOfLines={2}>{activeOffer.description}</Text>
                      )}
                      <TouchableOpacity onPress={() => navigation.navigate('Offers')} style={st.bannerCta}>
                        <Text style={st.bannerCtaTxt}>View Offer</Text>
                        <Icon name="arrow-forward" size={scale(14)} color="#fff" />
                      </TouchableOpacity>
                    </View>

                    {/* Dots + Progress */}
                    <View style={st.bannerBottom}>
                      {offers.length > 1 && (
                        <View style={st.dotsRow}>
                          {offers.map((_, i) => (
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
                  </>
                );
                return (
                <View style={st.bannerWrap}>
                  {offerImgUri ? (
                    <ImageBackground
                      source={{ uri: offerImgUri }}
                      style={st.bannerImg}
                      imageStyle={{ borderRadius: scale(20) }}
                    >
                      {InnerContent}
                    </ImageBackground>
                  ) : (
                    <LinearGradient
                      colors={[C.ink, C.primary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={[st.bannerImg, { borderRadius: scale(20) }]}
                    >
                      {InnerContent}
                    </LinearGradient>
                  )}
                </View>
                );
              })()}
            </View>
            )}

            {/* ══════ UPDATES (feed pills) ══════ */}
            {feed.length > 0 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: scale(16), paddingBottom: scale(2) }}
                style={{ marginTop: scale(16) }}
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
                      size={scale(14)}
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

            {/* ══════ QUICK ACTIONS ══════ */}
            <View style={st.sectionHdr}>
              <Text style={st.sectionTitle}>Quick Actions</Text>
              <TouchableOpacity onPress={() => setMenuVisible(true)}>
                <Text style={st.link}>View All</Text>
              </TouchableOpacity>
            </View>
            <View style={st.qaRow}>
              {QA.filter(q => !q.permission || can(q.permission)).map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={st.qaItem}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(q.screen)}
                >
                  <View style={[st.qaIcon, { backgroundColor: q.tintBg }]}>
                    <Icon name={q.icon} size={scale(14)} color={q.tint} />
                  </View>
                  <Text style={st.qaLabel}>{q.label}</Text>
                  <Text style={st.qaDesc}>{q.desc}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* ══════ AMC BANNER ══════ */}
            {can('amc:read') && (
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => navigation.navigate('AMCDashboard')}
              style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}
            >
              <LinearGradient
                colors={['#FDEAEA', '#FFF4F0']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
                style={st.amcBanner}
              >
                <View style={st.amcBannerLeft}>
                  <View style={st.amcIconBg}>
                    <Icon name="shield-checkmark" size={scale(20)} color="#fff" />
                  </View>
                  <View style={{ flex: 1, marginLeft: scale(12) }}>
                    <Text style={st.amcBannerTitle}>AMC Management</Text>
                    <Text style={st.amcBannerSub}>Annual maintenance contracts, visits & breakdowns</Text>
                    {amcUpcomingCount > 0 && (
                      <View style={st.amcTag}>
                        <Text style={st.amcTagTxt}>{amcUpcomingCount} Upcoming Visit{amcUpcomingCount !== 1 ? 's' : ''}</Text>
                      </View>
                    )}
                  </View>
                </View>
                <Icon name="chevron-forward" size={scale(18)} color={C.primary} />
              </LinearGradient>
            </TouchableOpacity>
            )}

            {/* ══════ BUSINESS OVERVIEW ══════ */}
            <View style={{ paddingHorizontal: scale(16), marginTop: scale(16) }}>
            <View style={st.boCard}>
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Business Overview</Text>
                <RestaurantSelectorCompact />
              </View>

              {/* Period selector - its own light track, sitting above the
                  dark stats card instead of inside it. */}
              <View style={[st.periodTrack, { marginTop: scale(12) }]}>
                {PERIOD_OPTIONS.map(opt => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[st.periodTab, selectedPeriod === opt.value && st.periodTabOn]}
                    onPress={() => setSelectedPeriod(opt.value)}
                  >
                    <Text style={[st.periodTabTxt, selectedPeriod === opt.value && st.periodTabTxtOn]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={{ marginTop: scale(14) }}>
                {analyticsLoading ? (
                  <View style={{ paddingVertical: scale(24), alignItems: 'center' }}>
                    <ActivityIndicator color={C.ink} />
                  </View>
                ) : !restaurantId ? (
                  <View style={st.moneyEmpty}>
                    <Icon name="restaurant-outline" size={scale(26)} color={C.muted} />
                    <Text style={st.moneyEmptyTitle}>No Restaurant Selected</Text>
                    <Text style={st.moneyEmptySub}>Add a restaurant to view analytics</Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('MyRestaurants')} style={st.moneyEmptyBtn}>
                      <Icon name="add" size={scale(15)} color="#fff" />
                      <Text style={st.moneyEmptyBtnTxt}>Add Restaurant</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <View style={st.moneyLabelRow}>
                      <Text style={st.moneyLabel}>NET REVENUE · {selectedPeriod} DAYS</Text>
                      <Icon name="information-circle-outline" size={scale(13)} color={C.muted} />
                    </View>
                    <Text style={st.moneyValue}>₹{Math.abs(summary.netRevenue || 0).toLocaleString()}</Text>
                    <View style={st.moneyTrendRow}>
                      <Icon
                        name={summary.netRevenue >= 0 ? 'trending-up' : 'trending-down'}
                        size={scale(13)}
                        color={summary.netRevenue >= 0 ? '#10B981' : '#EF4444'}
                      />
                      <Text style={[st.moneyTrendTxt, { color: summary.netRevenue >= 0 ? '#10B981' : '#EF4444' }]}>
                        {summary.netRevenue >= 0 ? 'Profit' : 'Loss'} for {selectedPeriod} days
                      </Text>
                    </View>

                    <View style={st.moneyDivider} />

                    <View style={st.moneyStatsRow}>
                      <TouchableOpacity
                        style={st.moneyStat}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('MyBookings')}
                      >
                        <View style={st.moneyStatIcon}>
                          <Icon name="calendar-outline" size={scale(12)} color={C.primary} />
                        </View>
                        <Text style={st.moneyStatValue}>{summary.bookings?.count || 0}</Text>
                        <Text style={st.moneyStatLabel}>Booking{summary.bookings?.count === 1 ? '' : 's'}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={st.moneyStat}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Expenses')}
                      >
                        <View style={st.moneyStatIcon}>
                          <Icon name="cash-outline" size={scale(12)} color={C.primary} />
                        </View>
                        <Text style={st.moneyStatValue}>₹{(summary.expenses?.total || 0).toLocaleString()}</Text>
                        <Text style={st.moneyStatLabel}>Expenses</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={st.moneyStat}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('Home', { screen: 'EquipmentTab' })}
                      >
                        <View style={st.moneyStatIcon}>
                          <Icon name="hardware-chip-outline" size={scale(12)} color={C.primary} />
                        </View>
                        <Text style={st.moneyStatValue}>{summary.equipment?.count || 0}</Text>
                        <Text style={st.moneyStatLabel}>Equipment</Text>
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity
                      style={st.moneyViewAnalyticsBtn}
                      onPress={() => navigation.navigate('Analytics')}
                      activeOpacity={0.7}
                    >
                      <Icon name="stats-chart" size={scale(14)} color={C.ink} />
                      <Text style={st.moneyChartsToggleTxt}>View Full Analytics</Text>
                      <Icon
                        name="arrow-forward"
                        size={scale(14)}
                        color={C.ink}
                        style={{ marginLeft: 'auto' }}
                      />
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
            </View>

            {/* ══════ RECENT ACTIVITY ══════ */}
            {(recent.bookings?.length > 0 || recent.expenses?.length > 0) && (
              <View style={st.section}>
                <View style={[st.sectionHead, { marginBottom: scale(14) }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
                    <LinearGradient colors={['#60A5FA', '#3B82F6']} style={st.sectionBadge}>
                      <Icon name="time" size={scale(15)} color="#fff" />
                    </LinearGradient>
                    <Text style={st.sectionTitle}>Recent Activity</Text>
                  </View>
                </View>

                {recent.bookings?.length > 0 && (
                  <View style={{ marginBottom: scale(16) }}>
                    <View style={st.recentSubHead}>
                      <Text style={st.recentSubTitle}>Bookings</Text>
                      <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                        <Text style={st.link}>View All</Text>
                      </TouchableOpacity>
                    </View>
                    {recent.bookings.slice(0, 3).map(b => (
                      <TouchableOpacity
                        key={b.id}
                        style={st.recentItem}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('BookingDetail', { bookingId: b.id })}
                      >
                        <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.recentIconBg}>
                          <Icon name="calendar-outline" size={scale(16)} color={C.primary} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: scale(12) }}>
                          <Text style={st.recentName}>Booking #{b.bookingNumber ?? b.id.slice(0, 8)}</Text>
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
                      </TouchableOpacity>
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
                      <TouchableOpacity
                        key={e.id}
                        style={st.recentItem}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('AddExpense', { restaurantId, expense: e })}
                      >
                        <LinearGradient colors={['#FFFBEB', '#FEF3C7']} style={st.recentIconBg}>
                          <Icon name="cash-outline" size={scale(16)} color={C.warn} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: scale(12) }}>
                          <Text style={st.recentName}>{e.category}</Text>
                          <Text style={st.recentDate}>
                            {new Date(e.expenseDate).toLocaleDateString()}
                          </Text>
                        </View>
                        <Text style={st.recentAmt}>₹{e.amount}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* ══════ SPONSORED ══════ */}
            {sponsoredData.length > 0 && (
              <View style={{ marginTop: scale(20) }}>
                <View style={st.sectionHdr}>
                  <Text style={st.sectionTitle}>Sponsored</Text>
                </View>
                <FlatList
                  horizontal
                  data={sponsoredData}
                  keyExtractor={(item) => item.id.toString()}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingHorizontal: scale(16) }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      onPress={() => item.link && open(item.link)}
                      activeOpacity={0.9}
                      style={[st.sponsorCard, { width: Math.min(scale(280), width * 0.75) }]}
                    >
                      <Image
                        source={{ uri: `${IMAGE_BASE_URL}/${item.image}` }}
                        style={st.sponsorImg}
                        resizeMode="cover"
                      />
                      <View style={{ padding: scale(12) }}>
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
              <View style={{ marginTop: scale(20) }}>
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
                  contentContainerStyle={{ paddingHorizontal: scale(16) }}
                  renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => open(item.link)} style={[st.guideCard, { width: Math.min(scale(260), width * 0.68) }]}>
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
                          <Icon name="play" size={scale(16)} color="#fff" />
                        </View>
                      </ImageBackground>
                      <View style={{ padding: scale(12) }}>
                        <Text style={st.guideTitle} numberOfLines={2}>{item.title}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(6), gap: scale(4) }}>
                          <Icon name="time-outline" size={scale(13)} color={C.muted} />
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
            <View style={{ paddingHorizontal: scale(16) }}>
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

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <SearchOverlay
        visible={searchVisible}
        onClose={() => setSearchVisible(false)}
        navigation={navigation}
        restaurantId={restaurantId}
        topOffset={headerHeight}
      />
    </SafeAreaView>
  );
}

/* ──────────────────── SKELETON ──────────────────── */
function SkeletonHome({ pulse }) {
  const Bone = ({ style }) => <Animated.View style={[stSK.bone, style, { opacity: pulse }]} />;
  return (
    <>
      {/* Current Restaurant card skeleton */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
        <View style={stSK.cardShell}>
          <Bone style={{ width: scale(32), height: scale(32), borderRadius: scale(9) }} />
          <View style={{ flex: 1, marginLeft: scale(10) }}>
            <Bone style={{ width: scale(90), height: scale(8), borderRadius: scale(4) }} />
            <Bone style={{ width: scale(130), height: scale(13), borderRadius: scale(6), marginTop: scale(6) }} />
          </View>
          <Bone style={{ width: scale(72), height: scale(28), borderRadius: scale(20) }} />
        </View>
      </View>

      {/* Offer banner skeleton */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
        <Bone style={{ height: scale(190), borderRadius: scale(20) }} />
      </View>

      {/* Updates pills skeleton */}
      <View style={{ flexDirection: 'row', paddingHorizontal: scale(16), marginTop: scale(16), gap: scale(8) }}>
        {[0, 1, 2].map(i => (
          <Bone key={i} style={{ width: scale(140), height: scale(34), borderRadius: 999 }} />
        ))}
      </View>

      {/* Quick Actions heading skeleton */}
      <View style={[st.sectionHdr, { marginTop: scale(20) }]}>
        <Bone style={{ width: scale(110), height: scale(16), borderRadius: scale(8) }} />
        <Bone style={{ width: scale(50), height: scale(12), borderRadius: scale(6) }} />
      </View>

      {/* Quick actions skeleton */}
      <View style={st.qaRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={st.qaItem}>
            <Bone style={{ width: scale(32), height: scale(32), borderRadius: scale(10) }} />
            <Bone style={{ width: scale(44), height: scale(10), borderRadius: scale(5), marginTop: scale(8) }} />
            <Bone style={{ width: scale(56), height: scale(8), borderRadius: scale(4), marginTop: scale(4) }} />
          </View>
        ))}
      </View>

      {/* AMC banner skeleton */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
        <View style={stSK.amcShell}>
          <Bone style={{ width: scale(44), height: scale(44), borderRadius: scale(14) }} />
          <View style={{ flex: 1, marginLeft: scale(12) }}>
            <Bone style={{ width: scale(120), height: scale(14), borderRadius: scale(6) }} />
            <Bone style={{ width: '85%', height: scale(10), borderRadius: scale(5), marginTop: scale(7) }} />
            <Bone style={{ width: scale(100), height: scale(18), borderRadius: scale(20), marginTop: scale(8) }} />
          </View>
        </View>
      </View>

      {/* Business Overview card skeleton (light card, matches the white stats redesign) */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(16) }}>
        <View style={st.boCard}>
          <View style={st.sectionHead}>
            <Bone style={{ width: scale(130), height: scale(16), borderRadius: scale(8) }} />
            <Bone style={{ width: scale(90), height: scale(24), borderRadius: scale(20) }} />
          </View>
          <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(12) }}>
            {[0, 1, 2, 3].map(i => (
              <Bone key={i} style={{ flex: 1, height: scale(28), borderRadius: scale(9) }} />
            ))}
          </View>
          <Bone style={{ width: scale(120), height: scale(10), borderRadius: scale(5), marginTop: scale(16) }} />
          <Bone style={{ width: scale(150), height: scale(24), borderRadius: scale(6), marginTop: scale(7) }} />
          <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(16) }}>
            {[0, 1, 2].map(i => (
              <Bone key={i} style={{ flex: 1, height: scale(44), borderRadius: scale(10) }} />
            ))}
          </View>
          <Bone style={{ height: scale(40), borderRadius: scale(12), marginTop: scale(14) }} />
        </View>
      </View>

      {/* Recent activity skeleton */}
      <View style={[st.section, { marginTop: scale(16) }]}>
        <Bone style={{ width: scale(140), height: scale(16), borderRadius: scale(8), marginBottom: scale(14) }} />
        {[0, 1].map(i => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12), marginBottom: scale(12) }}>
            <Bone style={{ width: scale(38), height: scale(38), borderRadius: scale(12) }} />
            <View style={{ flex: 1 }}>
              <Bone style={{ width: '70%', height: scale(12), borderRadius: scale(6) }} />
              <Bone style={{ width: '40%', height: scale(10), borderRadius: scale(5), marginTop: scale(6) }} />
            </View>
            <Bone style={{ width: scale(50), height: scale(14), borderRadius: scale(6) }} />
          </View>
        ))}
      </View>
    </>
  );
}

/* ──────────────────── SUBCOMPONENTS ──────────────────── */
const AnnCard = ({ icon, grad, title, text }) => (
  <View style={st.annCard}>
    <LinearGradient colors={grad} style={st.annIconBg}>
      <Icon name={icon} size={scale(16)} color="#fff" />
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
    paddingHorizontal: scale(16),
    paddingBottom: scale(10),
    overflow: 'hidden',
  },
  headerBlobA: {
    position: 'absolute',
    width: scale(140),
    height: scale(140),
    borderRadius: scale(70),
    backgroundColor: 'rgba(255,255,255,0.08)',
    top: scale(-50),
    right: scale(-30),
  },
  headerBlobB: {
    position: 'absolute',
    width: scale(90),
    height: scale(90),
    borderRadius: scale(45),
    backgroundColor: 'rgba(255,255,255,0.06)',
    bottom: scale(-40),
    left: scale(40),
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(2),
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: scale(12),
    padding: scale(3),
  },
  headerBtnSm: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnSmActive: {
    backgroundColor: '#fff',
  },
  headerBtnMenu: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerGreet: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: moderateScale(9.5),
    fontWeight: '600',
  },
  headerRestName: {
    color: '#fff',
    fontSize: moderateScale(15),
    fontWeight: '900',
    marginTop: scale(1),
  },
  cartBadge: {
    position: 'absolute',
    top: scale(2),
    right: scale(2),
    backgroundColor: '#FFD700',
    borderRadius: scale(10),
    minWidth: scale(16),
    height: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  cartBadgeTxt: {
    color: C.ink,
    fontSize: moderateScale(9),
    fontWeight: '800',
  },

  /* ── Banner ── */
  bannerWrap: {
    borderRadius: scale(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.12,
    shadowRadius: scale(14),
    elevation: 8,
  },
  bannerImg: {
    width: '100%',
    height: scale(190),
    justifyContent: 'flex-end',
  },
  bannerOverlay: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: scale(20),
  },
  bannerBadge: {
    position: 'absolute',
    left: scale(14),
    top: scale(14),
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: 999,
  },
  bannerBadgeTxt: {
    color: C.ink,
    fontWeight: '900',
    fontSize: moderateScale(11),
  },
  bannerContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(32),
  },
  bannerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: moderateScale(18),
    lineHeight: moderateScale(24),
  },
  bannerSub: {
    color: '#E5E7EB',
    marginTop: scale(3),
    fontSize: moderateScale(13),
  },
  bannerCta: {
    marginTop: scale(10),
    alignSelf: 'flex-start',
    backgroundColor: C.primary,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(7),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  bannerCtaTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  bannerBottom: {
    position: 'absolute',
    left: scale(14),
    right: scale(14),
    bottom: scale(10),
    gap: scale(6),
  },
  dotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  dot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  dotActive: {
    width: scale(20),
    backgroundColor: '#fff',
    borderRadius: scale(4),
  },
  progWrap: {
    height: scale(3),
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: scale(2),
    overflow: 'hidden',
  },
  progBar: {
    height: scale(3),
    backgroundColor: '#fff',
  },

  /* ── Quick Actions ── */
  qaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    gap: scale(10),
  },
  qaItem: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    paddingVertical: scale(10),
    paddingHorizontal: scale(5),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(6),
    elevation: 2,
  },
  qaIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  qaLabel: {
    color: C.ink,
    fontWeight: '700',
    fontSize: moderateScale(11),
  },
  qaDesc: {
    color: C.muted,
    fontSize: moderateScale(8.5),
    marginTop: scale(1),
    lineHeight: moderateScale(11),
    textAlign: 'center',
  },

  /* ── AMC Banner ── */
  amcBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    borderRadius: scale(16),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#FBDADA',
    shadowColor: '#141432',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  amcBannerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  amcTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FBD9D9',
    borderRadius: 20,
    paddingHorizontal: scale(9),
    paddingVertical: scale(3),
    marginTop: scale(7),
  },
  amcTagTxt: {
    color: '#C21F1F',
    fontWeight: '700',
    fontSize: moderateScale(10),
  },
  amcIconBg: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  amcBannerTitle: {
    color: C.ink,
    fontWeight: '900',
    fontSize: moderateScale(14.5),
  },
  amcBannerSub: {
    color: C.muted,
    fontSize: moderateScale(11),
    fontWeight: '500',
    marginTop: scale(2),
  },
  amcArrowBg: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },

  /* ── Money Card (Net Revenue + Analytics, tabs lead) ── */
  /* Period selector - light track above the dark card, not inside it. */
  periodTrack: {
    flexDirection: 'row',
    backgroundColor: '#E7ECFB',
    borderRadius: scale(12),
    padding: scale(4),
    gap: scale(4),
  },
  periodTab: {
    flex: 1,
    paddingVertical: scale(7),
    borderRadius: scale(9),
    alignItems: 'center',
  },
  periodTabOn: {
    backgroundColor: C.ink,
  },
  periodTabTxt: {
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    color: '#5B5E80',
  },
  periodTabTxtOn: {
    color: '#fff',
  },
  moneyEmpty: {
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  moneyEmptyTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: moderateScale(15),
    marginTop: scale(10),
  },
  moneyEmptySub: {
    color: C.muted,
    fontSize: moderateScale(12.5),
    marginTop: scale(4),
    marginBottom: scale(14),
  },
  moneyEmptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(16),
    paddingVertical: scale(9),
    borderRadius: scale(10),
    backgroundColor: C.primary,
  },
  moneyEmptyBtnTxt: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  moneyLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  moneyLabel: {
    fontSize: moderateScale(11),
    color: C.muted,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  moneyValue: {
    fontSize: moderateScale(26),
    fontWeight: '900',
    color: C.ink,
    marginTop: scale(2),
  },
  moneyTrendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    marginTop: scale(4),
  },
  moneyTrendTxt: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  moneyDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: scale(12),
  },
  moneyStatsRow: {
    flexDirection: 'row',
  },
  moneyStat: {
    flex: 1,
  },
  moneyStatIcon: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(8),
    backgroundColor: '#FDEAEA',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  moneyStatLabel: {
    fontSize: moderateScale(9),
    color: C.muted,
    fontWeight: '600',
  },
  moneyStatValue: {
    fontSize: moderateScale(14.5),
    color: C.ink,
    fontWeight: '800',
  },
  moneyChartsToggleTxt: {
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: C.ink,
  },
  moneyViewAnalyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    marginTop: scale(14),
    backgroundColor: '#E7ECFB',
    borderRadius: scale(12),
    paddingVertical: scale(11),
    paddingHorizontal: scale(12),
  },
  /* ── Feed Pills ── */
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: 999,
    borderWidth: 1,
    marginRight: scale(8),
  },
  pillTxt: {
    color: C.ink,
    fontWeight: '600',
    fontSize: moderateScale(12),
  },

  /* ── Business Overview (outer white card wrapping heading + tabs + dark stats card) ── */
  boCard: {
    backgroundColor: C.card,
    borderRadius: scale(20),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.05,
    shadowRadius: scale(10),
    elevation: 3,
  },

  /* ── Sections ── */
  section: {
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(18),
    borderRadius: scale(20),
    padding: scale(16),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.05,
    shadowRadius: scale(10),
    elevation: 3,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionBadge: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: C.ink,
    fontWeight: '900',
    fontSize: moderateScale(16),
  },
  sectionHdr: {
    paddingHorizontal: scale(16),
    marginBottom: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  link: {
    color: C.primary,
    fontWeight: '700',
    fontSize: moderateScale(13),
  },


  /* ── Recent Activity ── */
  recentSubHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(10),
  },
  recentSubTitle: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.ink,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(14),
    padding: scale(12),
    marginBottom: scale(8),
  },
  recentIconBg: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  recentName: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.ink,
  },
  recentDate: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(2),
  },
  recentAmt: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: C.ink,
  },
  statusChip: {
    borderRadius: scale(6),
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    marginTop: scale(3),
  },
  statusChipTxt: {
    fontSize: moderateScale(9),
    fontWeight: '800',
  },

  /* ── Sponsored ── */
  sponsorCard: {
    marginRight: scale(12),
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  sponsorImg: {
    width: '100%',
    height: scale(120),
  },
  sponsorTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: moderateScale(14),
  },
  sponsorDesc: {
    color: C.muted,
    fontSize: moderateScale(12),
    marginTop: scale(3),
  },

  /* ── Guides ── */
  guideCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    marginRight: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(6),
    elevation: 2,
  },
  guideImg: {
    width: '100%',
    height: scale(120),
    alignItems: 'center',
    justifyContent: 'center',
  },
  playBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: scale(2),
    borderColor: 'rgba(255,255,255,0.3)',
  },
  guideTitle: {
    color: C.ink,
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  guideMeta: {
    color: C.muted,
    fontWeight: '600',
    fontSize: moderateScale(12),
  },

  /* ── Announcements ── */
  annCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: scale(14),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(6),
    elevation: 2,
  },
  annIconBg: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  annTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: moderateScale(14),
  },
  annText: {
    color: C.muted,
    marginTop: scale(2),
    fontSize: moderateScale(12),
    lineHeight: moderateScale(17),
  },
});

/* ──────────────────── SKELETON STYLES ──────────────────── */
const stSK = StyleSheet.create({
  bone: {
    backgroundColor: '#E2E8F0',
  },
  cardShell: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(12),
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  amcShell: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: scale(20),
    padding: scale(14),
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
});
