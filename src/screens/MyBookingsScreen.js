/**
 * ============================================================================
 * MY BOOKINGS SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
  useWindowDimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorCompact } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';
import { isStale, markFetched } from '../utils/focusCache';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
};

// Keys match the real ServiceBookingStatus enum in prisma/schema.prisma.
const STATUS_CONFIG = {
  all: { bg: '#F1F5F9', color: C.ink, icon: 'apps', label: 'All' },
  DRAFT: { bg: '#F1F5F9', color: '#64748B', icon: 'document-outline', label: 'Draft' },
  SLOT_SELECTED: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Pending' },
  PAYMENT_UPLOADED: { bg: '#DBEAFE', color: '#2563EB', icon: 'cloud-upload', label: 'Uploaded' },
  PAYMENT_VERIFIED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Verified' },
  PAYMENT_REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Payment Rejected' },
  ENGINEER_ASSIGNED: { bg: '#E0E7FF', color: '#4F46E5', icon: 'person', label: 'Assigned' },
  ACCEPTED_BY_ENGINEER: { bg: '#E0E7FF', color: '#4F46E5', icon: 'checkmark-done', label: 'Accepted' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#D97706', icon: 'construct', label: 'In Progress' },
  REJECTED_BY_ENGINEER: { bg: '#FEE2E2', color: '#DC2626', icon: 'alert-circle', label: 'Engineer Rejected' },
  COMPLETED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done-circle', label: 'Completed' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPrice = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

function SkeletonBookings({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(12) }}>
      <View style={{ flexDirection: 'row', gap: scale(8), marginBottom: scale(12) }}>
        {[1, 2, 3].map(i => (
          <Animated.View key={i} style={[styles.skelTab, { opacity: pulse }]} />
        ))}
      </View>
      {Array.from({ length: 6 }).map((_, i) => (
        <View key={i} style={styles.skelRow}>
          <Animated.View style={[styles.skelIconBox, { opacity: pulse }]} />
          <View style={styles.rowInfo}>
            <Animated.View style={[styles.skelLineWide, { opacity: pulse }]} />
            <Animated.View style={[styles.skelLineNarrow, { opacity: pulse }]} />
          </View>
          <Animated.View style={[styles.skelAmount, { opacity: pulse }]} />
        </View>
      ))}
    </View>
  );
}

export default function MyBookingsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTabletDevice = isTablet(width);

  const {
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [serverStatusCounts, setServerStatusCounts] = useState({});
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Status counts across ALL matching bookings, from the server - not just
  // whatever page has loaded so far via infinite scroll. Using a client-side
  // count over `bookings` here would make the header "Active"/"Completed"
  // stats and tab-pill counts silently grow as the user scrolls, understating
  // the true numbers until every page has loaded.
  const statusCounts = useMemo(
    () => ({ all: totalCount, ...serverStatusCounts }),
    [totalCount, serverStatusCounts]
  );

  useFocusEffect(
    useCallback(() => {
      const key = `MyBookings-${selectedRestaurant}`;
      if (isStale(key) || bookings.length === 0) {
        loadData();
        markFetched(key);
      }
    }, [selectedRestaurant, bookings.length])
  );

  const loadData = async (pageNum = 1, append = false) => {
    if (!selectedRestaurant) {
      setLoading(false);
      return;
    }

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ restaurantId: selectedRestaurant, page: pageNum.toString(), pageSize: '20' });
      const response = await api.get(`/owner/bookings?${params}`);
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize, statusCounts: newStatusCounts } = responseData;
          setTotalCount(total);
          setServerStatusCounts(newStatusCounts || {});
          if (append) {
            setBookings(prev => {
              const existingIds = new Set(prev.map(b => b.id));
              const uniqueNew = items.filter(b => !existingIds.has(b.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setBookings(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setBookings(responseData || []);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const filteredBookings = useMemo(() => {
    if (activeStatusTab === 'all') return bookings;
    return bookings.filter(b => (b.status || 'SLOT_SELECTED') === activeStatusTab);
  }, [bookings, activeStatusTab]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1, true);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#EF3A3A" />
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadRestaurants({ force: true });
    await loadData(1, false);
    markFetched(`MyBookings-${selectedRestaurant}`);
  };

  // Render status tab
  const renderStatusTab = (statusKey) => {
    const config = STATUS_CONFIG[statusKey];
    const isActive = activeStatusTab === statusKey;
    const count = statusCounts[statusKey] || 0;

    return (
      <TouchableOpacity
        key={statusKey}
        style={[styles.statusTab, isActive && { backgroundColor: config.color }]}
        onPress={() => setActiveStatusTab(isActive && statusKey !== 'all' ? 'all' : statusKey)}
        activeOpacity={0.7}
      >
        <Icon
          name={config.icon}
          size={16}
          color={isActive ? '#fff' : config.color}
        />
        <Text style={[styles.statusTabLabel, isActive && { color: '#fff' }]}>
          {config.label}
        </Text>
        <View style={[styles.statusTabCount, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
          <Text style={[styles.statusTabCountText, isActive && { color: '#fff' }]}>
            {count}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Render booking card
  const renderBookingCard = ({ item, index }) => {
    const config = STATUS_CONFIG[item.status] || STATUS_CONFIG.SLOT_SELECTED;
    const itemCount = (item.items || []).length;
    const dateLabel = formatDate(item.slotStartDateTime || item.createdAt);

    return (
      <TouchableOpacity
        style={[
          styles.bookingCard,
          isTabletDevice && { width: (width - 48) / 2 - 6 },
          isTabletDevice && index % 2 === 0 && { marginRight: scale(12) },
        ]}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
        activeOpacity={0.7}
      >
        <View style={[styles.rowIconBox, { backgroundColor: config.bg }]}>
          <Icon name={config.icon} size={15} color={config.color} />
        </View>
        <View style={styles.rowInfo}>
          <Text style={styles.rowId} numberOfLines={1}>#{item.bookingNumber ?? item.id.slice(0, 8).toUpperCase()}</Text>
          <Text style={styles.rowMeta} numberOfLines={1}>{dateLabel} · {itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
        </View>
        <View style={styles.rowRight}>
          <Text style={styles.rowAmount} numberOfLines={1}>{formatPrice(item.totalAmount)}</Text>
          <Text style={[styles.rowStatus, { color: config.color }]} numberOfLines={1}>● {config.label}</Text>
        </View>
        <Icon name="chevron-forward" size={14} color={C.muted} />
      </TouchableOpacity>
    );
  };

  // Loading state
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.heroHeader, { paddingTop: insets.top + scale(6) }]}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={styles.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.menuBtn, { marginRight: scale(10) }]}>
              <Icon name="menu" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.heroTitle, { flex: 1 }]}>My Bookings</Text>
          </View>
        </LinearGradient>
        <SkeletonBookings pulse={pulse} />
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  // No restaurant state
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.heroHeader, { paddingTop: insets.top + scale(6) }]}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={styles.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={[styles.menuBtn, { marginRight: scale(10) }]}>
              <Icon name="menu" size={16} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.heroTitle, { flex: 1 }]}>My Bookings</Text>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Icon name="restaurant-outline" size={48} color={C.muted} />
          </View>
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptySubtitle}>Please add a restaurant first</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
        <KniBottomNav navigation={navigation} active="home" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />

      {/* Hero Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { paddingTop: insets.top + scale(6) }]}
      >
        <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={styles.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={18} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>My Bookings</Text>
            <RestaurantSelectorCompact dark style={styles.heroRestaurantPill} />
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount || bookings.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['IN_PROGRESS'] || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['COMPLETED'] || 0}</Text>
            <Text style={styles.statLabel}>Completed</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Status Tabs */}
      <View style={styles.statusTabsContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusTabsScroll}
        >
          {Object.keys(STATUS_CONFIG).map(renderStatusTab)}
        </ScrollView>
      </View>

      {/* Bookings List */}
      <FlatList
        data={filteredBookings}
        keyExtractor={item => item.id}
        renderItem={renderBookingCard}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'tablet' : 'phone'}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <View style={styles.emptyIconBox}>
              <Icon name="calendar-outline" size={48} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Bookings Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeStatusTab !== 'all'
                ? 'No bookings with this status'
                : 'Your service bookings will appear here'}
            </Text>
          </View>
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Hero Header
  heroHeader: {
    paddingBottom: scale(10),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
    overflow: 'hidden',
  },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(8),
  },
  backBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlain: { width: scale(24), height: scale(34), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  heroTextContainer: {
    flex: 1,
    marginHorizontal: scale(12),
  },
  heroTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#fff',
  },
  heroRestaurantPill: {
    alignSelf: 'flex-start',
    marginTop: scale(4),
  },
  menuBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: moderateScale(10.5),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(1),
  },
  statDivider: {
    width: 1,
    height: scale(22),
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: scale(16),
  },

  // Status Tabs
  statusTabsContainer: {},
  statusTabsScroll: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  statusTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.bg,
    marginRight: scale(8),
    gap: scale(6),
  },
  statusTabLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
  },
  statusTabCount: {
    backgroundColor: C.border,
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    minWidth: scale(20),
    alignItems: 'center',
  },
  statusTabCountText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.muted,
  },

  // List
  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    paddingBottom: scale(100),
  },

  // Booking Card — compact row
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(12),
    padding: scale(10),
    marginBottom: scale(8),
    gap: scale(9),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 3,
  },
  rowIconBox: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowId: { fontSize: moderateScale(11.5), fontWeight: '800', color: C.ink },
  rowMeta: { fontSize: moderateScale(9), color: C.muted, marginTop: scale(1) },
  rowRight: { alignItems: 'flex-end', marginRight: scale(4) },
  rowAmount: { fontSize: moderateScale(12), fontWeight: '800', color: C.ink },
  rowStatus: { fontSize: moderateScale(8), fontWeight: '700', marginTop: scale(1) },

  // Loading
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginTop: scale(12),
  },

  // Skeleton
  skelTab: { flex: 1, height: scale(32), backgroundColor: '#E2E8F0', borderRadius: scale(16) },
  skelRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: scale(12), padding: scale(10), marginBottom: scale(8) },
  skelIconBox: { width: scale(34), height: scale(34), borderRadius: scale(10), backgroundColor: '#E2E8F0' },
  skelLineWide: { height: scale(11), width: '60%', backgroundColor: '#E2E8F0', borderRadius: scale(6), marginLeft: scale(10), marginBottom: scale(6) },
  skelLineNarrow: { height: scale(9), width: '40%', backgroundColor: '#E2E8F0', borderRadius: scale(6), marginLeft: scale(10) },
  skelAmount: { width: scale(50), height: scale(14), backgroundColor: '#E2E8F0', borderRadius: scale(6) },

  // Empty States
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(32),
  },
  emptyList: {
    alignItems: 'center',
    paddingTop: scale(60),
  },
  emptyIconBox: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
  },
});
