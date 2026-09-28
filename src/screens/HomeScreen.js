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
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { RestaurantSelectorBar, RestaurantSelectorChips } from '../components/RestaurantSelector';
import { useRestaurant } from '../context/RestaurantContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api, IMAGE_BASE_URL } from '../api/client';

import { exportAnalyticsPDF, openPDF } from '../services/analyticsService';
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
  { icon: 'calendar-outline', label: 'Bookings', grad: ['#FF6B6B', '#EF3A3A'], screen: 'MyBookings', permission: 'bookings:read' },
  { icon: 'storefront-outline', label: 'Restaurants', grad: ['#818CF8', '#6366F1'], screen: 'MyRestaurants', permission: 'restaurant:read' },
  { icon: 'cash-outline', label: 'Expenses', grad: ['#34D399', '#10B981'], screen: 'Expenses', permission: 'expenses:read' },
  { icon: 'headset-outline', label: 'Support', grad: ['#FBBF24', '#F59E0B'], screen: 'SupportCenter', permission: 'support:read' },
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
    hasMultipleRestaurants,
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
  const [marketplaceCartCount, setMarketplaceCartCount] = useState(0);
  const [notifCount, setNotifCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [analyticsData, setAnalyticsData] = useState(null);
  const [exporting, setExporting] = useState(false);

  const isFirstLoad = useRef(true);
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

  /* ═══════════ MARKETPLACE CART COUNT ═══════════ */
  const loadMarketplaceCartCount = useCallback(async () => {
    try {
      if (!restaurantId) { setMarketplaceCartCount(0); return; }
      const cartService = require('../services/marketplaceCartService').default;
      const items = await cartService.getCart(restaurantId);
      setMarketplaceCartCount(items.length || 0);
    } catch { setMarketplaceCartCount(0); }
  }, [restaurantId]);

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

      const cartKey = `Home-marketplaceCart-${restaurantId}`;
      if (isStale(cartKey)) { loadMarketplaceCartCount(); markFetched(cartKey); }

      const analyticsKey = `Home-analytics-${restaurantId}-${selectedPeriod}`;
      if (isStale(analyticsKey)) { loadAnalytics(); markFetched(analyticsKey); }
    }, [loadRestaurants, fetchOffers, fetchFeed, fetchSponsored, fetchGuides, calculateCartCount, loadMarketplaceCartCount, restaurantId, loadAnalytics, fetchNotifCount, selectedPeriod])
  );

  // Reload analytics when restaurant or period changes
  useEffect(() => {
    loadAnalytics();
  }, [restaurantId, selectedPeriod, loadAnalytics]);

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
        loadMarketplaceCartCount(),
      ]);
      markFetched('Home-content');
      markFetched('Home-notifCount');
      if (restaurantId) {
        markFetched(`Home-marketplaceCart-${restaurantId}`);
        markFetched(`Home-analytics-${restaurantId}-${selectedPeriod}`);
      }
      setTimeout(() => setRefreshing(false), 300);
    })();
  }, [fetchOffers, fetchFeed, fetchSponsored, fetchGuides, loadRestaurants, loadAnalytics, calculateCartCount, loadMarketplaceCartCount, restaurantId, selectedPeriod]);

  const handleExportPDF = async () => {
    if (!restaurantId) {
      AppAlert.alert('Error', 'Please select a restaurant first');
      return;
    }
    setExporting(true);
    try {
      const filePath = await exportAnalyticsPDF(restaurantId);
      AppAlert.alert('Export Successful', 'Analytics report has been exported', [
        { text: 'Open', onPress: () => openPDF(filePath) },
        { text: 'OK', style: 'cancel' }
      ]);
    } catch (error) {
      AppAlert.alert('Export Failed', error.message || 'Could not export analytics');
    } finally {
      setExporting(false);
    }
  };

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
        style={[st.headerGrad, { paddingTop: insets.top + scale(10) }]}
      >
        {/* Decorative blobs */}
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />

        <View style={st.headerRow}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.headerBtn}>
            <Icon name="menu" size={scale(22)} color="#fff" />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: scale(14) }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
              <Icon name={greetIcon} size={scale(15)} color="#FFD700" />
              <Text style={st.greetText}>{greeting}</Text>
            </View>
            <Text style={st.headerRestName} numberOfLines={1}>
              {selectedRest?.name || 'KNI Super App'}
            </Text>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
            <TouchableOpacity onPress={() => navigation.navigate('Search')} style={st.headerBtnSm}>
              <Icon name="search" size={scale(15)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleExportPDF}
              disabled={exporting || !restaurantId}
              style={st.headerBtnSm}
            >
              {exporting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Icon name="download-outline" size={scale(15)} color={restaurantId ? '#fff' : 'rgba(255,255,255,0.35)'} />
              )}
            </TouchableOpacity>
            {can('marketplace:create') && (
            <TouchableOpacity
              onPress={() => restaurantId && navigation.navigate('MarketplaceCart', { restaurantId })}
              disabled={!restaurantId}
              style={st.headerBtnSm}
            >
              <Icon name="cart-outline" size={scale(15)} color={restaurantId ? '#fff' : 'rgba(255,255,255,0.35)'} />
              {marketplaceCartCount > 0 && (
                <View style={st.headerCartBadge}>
                  <Text style={st.headerCartBadgeText}>{marketplaceCartCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            )}
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
            {/* Restaurant Selector -- shared component, shared AsyncStorage
                "seen" flag for the first-time coach mark. */}
            <RestaurantSelectorBar />

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
            <View style={st.qaRow}>
              {QA.filter(q => !q.permission || can(q.permission)).map((q, i) => (
                <TouchableOpacity
                  key={i}
                  style={st.qaItem}
                  activeOpacity={0.8}
                  onPress={() => navigation.navigate(q.screen)}
                >
                  <LinearGradient colors={q.grad} style={st.qaIcon}>
                    <Icon name={q.icon} size={scale(20)} color="#fff" />
                  </LinearGradient>
                  <Text style={st.qaLabel}>{q.label}</Text>
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
                colors={['#A855F7', '#9333EA', '#7E22CE']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0.5 }}
                style={st.amcBanner}
              >
                <View style={st.amcBannerLeft}>
                  <View style={st.amcIconBg}>
                    <Icon name="shield-checkmark" size={scale(22)} color="#9333EA" />
                  </View>
                  <View style={{ flex: 1, marginLeft: scale(12) }}>
                    <Text style={st.amcBannerTitle}>AMC Management</Text>
                    <Text style={st.amcBannerSub}>Annual maintenance contracts, visits & breakdowns</Text>
                  </View>
                </View>
                <View style={st.amcArrowBg}>
                  <Icon name="chevron-forward" size={scale(16)} color="#fff" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
            )}

            {/* ══════ MONEY CARD (Net Revenue + Analytics, tabs lead) ══════ */}
            <View style={{ paddingHorizontal: scale(16), marginTop: scale(16) }}>
              <LinearGradient
                colors={[C.ink, '#2E3470']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.moneyCard}
              >
                <View style={st.moneyTabRow}>
                  {PERIOD_OPTIONS.map(opt => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[st.moneyTab, selectedPeriod === opt.value && st.moneyTabOn]}
                      onPress={() => setSelectedPeriod(opt.value)}
                    >
                      <Text style={[st.moneyTabTxt, selectedPeriod === opt.value && st.moneyTabTxtOn]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {hasMultipleRestaurants && (
                  <RestaurantSelectorChips style={{ marginBottom: scale(10) }} />
                )}

                {analyticsLoading ? (
                  <View style={{ paddingVertical: scale(24), alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" />
                  </View>
                ) : !restaurantId ? (
                  <View style={st.moneyEmpty}>
                    <Icon name="restaurant-outline" size={scale(26)} color="rgba(255,255,255,0.5)" />
                    <Text style={st.moneyEmptyTitle}>No Restaurant Selected</Text>
                    <Text style={st.moneyEmptySub}>Add a restaurant to view analytics</Text>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('MyRestaurants')} style={st.moneyEmptyBtn}>
                      <Icon name="add" size={scale(15)} color={C.ink} />
                      <Text style={st.moneyEmptyBtnTxt}>Add Restaurant</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <>
                    <Text style={st.moneyLabel}>NET REVENUE · {selectedPeriod} DAYS</Text>
                    <Text style={st.moneyValue}>₹{Math.abs(summary.netRevenue || 0).toLocaleString()}</Text>
                    <View style={st.moneyTrendRow}>
                      <Icon
                        name={summary.netRevenue >= 0 ? 'trending-up' : 'trending-down'}
                        size={scale(13)}
                        color={summary.netRevenue >= 0 ? '#6EE7B7' : '#FCA5A5'}
                      />
                      <Text style={[st.moneyTrendTxt, { color: summary.netRevenue >= 0 ? '#6EE7B7' : '#FCA5A5' }]}>
                        {summary.netRevenue >= 0 ? 'Profit' : 'Loss'} for {selectedPeriod} days
                      </Text>
                    </View>

                    <View style={st.moneyStatsRow}>
                      <View style={st.moneyStat}>
                        <Text style={st.moneyStatLabel}>BOOKINGS</Text>
                        <Text style={st.moneyStatValue}>{summary.bookings?.count || 0}</Text>
                      </View>
                      <View style={st.moneyStat}>
                        <Text style={st.moneyStatLabel}>EXPENSES</Text>
                        <Text style={st.moneyStatValue}>₹{(summary.expenses?.total || 0).toLocaleString()}</Text>
                      </View>
                      <View style={st.moneyStat}>
                        <Text style={st.moneyStatLabel}>EQUIPMENT</Text>
                        <Text style={st.moneyStatValue}>{summary.equipment?.count || 0}</Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={st.moneyViewAnalyticsBtn}
                      onPress={() => navigation.navigate('Analytics')}
                      activeOpacity={0.7}
                    >
                      <Icon name="stats-chart" size={scale(14)} color="rgba(255,255,255,0.85)" />
                      <Text style={st.moneyChartsToggleTxt}>View Full Analytics</Text>
                      <Icon
                        name="arrow-forward"
                        size={scale(14)}
                        color="rgba(255,255,255,0.6)"
                        style={{ marginLeft: 'auto' }}
                      />
                    </TouchableOpacity>
                  </>
                )}
              </LinearGradient>
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
                      <View key={b.id} style={st.recentItem}>
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
                          <Icon name="cash-outline" size={scale(16)} color={C.warn} />
                        </LinearGradient>
                        <View style={{ flex: 1, marginLeft: scale(12) }}>
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

      <KniBottomNav navigation={navigation} active="home" cartCount={cartCount} notifCount={notifCount} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

/* ──────────────────── SKELETON ──────────────────── */
function SkeletonHome({ pulse }) {
  const Bone = ({ style }) => <Animated.View style={[stSK.bone, style, { opacity: pulse }]} />;
  return (
    <>
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

      {/* Quick actions skeleton */}
      <View style={st.qaRow}>
        {[0, 1, 2, 3].map(i => (
          <View key={i} style={st.qaItem}>
            <Bone style={{ width: scale(48), height: scale(48), borderRadius: scale(16) }} />
            <Bone style={{ width: scale(50), height: scale(10), borderRadius: scale(5), marginTop: scale(8) }} />
          </View>
        ))}
      </View>

      {/* AMC banner skeleton */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(14) }}>
        <Bone style={{ height: scale(76), borderRadius: scale(16) }} />
      </View>

      {/* Money card skeleton (period tabs + revenue + stats) */}
      <View style={{ paddingHorizontal: scale(16), marginTop: scale(16) }}>
        <View style={[stSK.moneyCardShell]}>
          <View style={{ flexDirection: 'row', gap: scale(6) }}>
            {[0, 1, 2, 3].map(i => (
              <Bone key={i} style={{ flex: 1, height: scale(28), borderRadius: scale(9), backgroundColor: 'rgba(255,255,255,0.15)' }} />
            ))}
          </View>
          <Bone style={{ width: scale(120), height: scale(10), borderRadius: scale(5), marginTop: scale(14), backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <Bone style={{ width: scale(150), height: scale(22), borderRadius: scale(6), marginTop: scale(6), backgroundColor: 'rgba(255,255,255,0.15)' }} />
          <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(14) }}>
            {[0, 1, 2].map(i => (
              <Bone key={i} style={{ flex: 1, height: scale(44), borderRadius: scale(10), backgroundColor: 'rgba(255,255,255,0.15)' }} />
            ))}
          </View>
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
    paddingBottom: scale(16),
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
  headerBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnSm: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCartBadge: {
    position: 'absolute',
    top: scale(-4),
    right: scale(-4),
    backgroundColor: C.primary,
    borderRadius: scale(10),
    minWidth: scale(18),
    height: scale(18),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(4),
  },
  headerCartBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#fff',
  },
  greetText: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: moderateScale(12),
    fontWeight: '600',
  },
  headerRestName: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '900',
    marginTop: scale(2),
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
    marginTop: scale(18),
    gap: scale(10),
  },
  qaItem: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(16),
    paddingVertical: scale(14),
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
    width: scale(48),
    height: scale(48),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  qaLabel: {
    color: C.ink,
    fontWeight: '700',
    fontSize: moderateScale(11),
  },

  /* ── AMC Banner ── */
  amcBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.25,
    shadowRadius: scale(10),
    elevation: 6,
  },
  amcBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  amcIconBg: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.95)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amcBannerTitle: {
    color: '#fff',
    fontWeight: '900',
    fontSize: moderateScale(15),
  },
  amcBannerSub: {
    color: 'rgba(255,255,255,0.75)',
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
  moneyCard: {
    borderRadius: scale(18),
    padding: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.18,
    shadowRadius: scale(14),
    elevation: 6,
  },
  moneyTabRow: {
    flexDirection: 'row',
    gap: scale(6),
    marginBottom: scale(4),
  },
  moneyTab: {
    flex: 1,
    paddingVertical: scale(7),
    borderRadius: scale(9),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  moneyTabOn: {
    backgroundColor: '#fff',
  },
  moneyTabTxt: {
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
  },
  moneyTabTxtOn: {
    color: C.ink,
  },
  moneyEmpty: {
    alignItems: 'center',
    paddingVertical: scale(24),
  },
  moneyEmptyTitle: {
    color: '#fff',
    fontWeight: '800',
    fontSize: moderateScale(15),
    marginTop: scale(10),
  },
  moneyEmptySub: {
    color: 'rgba(255,255,255,0.65)',
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
    backgroundColor: '#fff',
  },
  moneyEmptyBtnTxt: {
    color: C.ink,
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  moneyLabel: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
    letterSpacing: 0.4,
    marginTop: scale(10),
  },
  moneyValue: {
    fontSize: moderateScale(26),
    fontWeight: '900',
    color: '#fff',
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
  moneyStatsRow: {
    flexDirection: 'row',
    gap: scale(8),
    marginTop: scale(14),
  },
  moneyStat: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: scale(10),
    padding: scale(8),
  },
  moneyStatLabel: {
    fontSize: moderateScale(9),
    color: 'rgba(255,255,255,0.6)',
    fontWeight: '700',
  },
  moneyStatValue: {
    fontSize: moderateScale(14),
    color: '#fff',
    fontWeight: '800',
    marginTop: scale(2),
  },
  moneyChartsToggleTxt: {
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: 'rgba(255,255,255,0.9)',
  },
  moneyViewAnalyticsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    marginTop: scale(12),
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.15)',
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
  moneyCardShell: {
    backgroundColor: '#1D2254',
    borderRadius: scale(18),
    padding: scale(14),
  },
});
