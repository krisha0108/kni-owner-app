/**
 * ============================================================================
 * MY BOOKINGS SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
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

export default function MyBookingsScreen({ navigation }) {
  const { width } = useWindowDimensions();
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

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { all: bookings.length };
    bookings.forEach((b) => {
      const status = b.status || 'SLOT_SELECTED';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [bookings]);

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
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
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
        onPress={() => setActiveStatusTab(statusKey)}
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
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.bookingIconBox, { backgroundColor: config.bg }]}>
              <Icon name={config.icon} size={20} color={config.color} />
            </View>
            <View>
              <Text style={styles.bookingId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.bookingDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusPillText, { color: config.color }]}>
              {config.label}
            </Text>
          </View>
        </View>

        {/* Card Body */}
        <View style={styles.cardBody}>
          {/* Items Summary */}
          <View style={styles.itemsSummary}>
            <Icon name="cube-outline" size={16} color={C.muted} />
            <Text style={styles.itemsText}>
              {itemCount} item{itemCount !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Schedule if exists */}
          {item.slotStartDateTime && (
            <View style={styles.scheduleRow}>
              <Icon name="calendar-outline" size={16} color={C.info} />
              <Text style={styles.scheduleText}>{formatDate(item.slotStartDateTime)}</Text>
            </View>
          )}

          {/* Engineer if assigned */}
          {item.engineerAssignments?.length > 0 && (
            <View style={styles.engineerRow}>
              <Icon name="person-outline" size={16} color={C.purple} />
              <Text style={styles.engineerText} numberOfLines={1}>
                {item.engineerAssignments[0].engineer?.name || 'Engineer Assigned'}
              </Text>
            </View>
          )}
        </View>

        {/* Card Footer */}
        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={styles.amountValue}>{formatPrice(item.totalAmount)}</Text>
              {!!item.discountAmount && item.discountAmount > 0 && (
                <View style={{ backgroundColor: C.ok + '15', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: C.ok }}>{item.discountPercent}% off</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.viewDetailsBtn}>
            <Text style={styles.viewDetailsText}>View</Text>
            <Icon name="chevron-forward" size={16} color={C.primary} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  // Loading state
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>My Bookings</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading bookings...</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  // No restaurant state
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>My Bookings</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
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
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Hero Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>My Bookings</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
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

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''}
        </Text>
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
      <KniBottomNav navigation={navigation} />
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
    paddingBottom: scale(20),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(16),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: '#fff',
  },
  menuBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  statDivider: {
    width: 1,
    height: scale(32),
    backgroundColor: 'rgba(255,255,255,0.3)',
    marginHorizontal: scale(16),
  },

  // Status Tabs
  statusTabsContainer: {
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  statusTabsScroll: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
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

  // Results Row
  resultsRow: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  resultsText: {
    fontSize: moderateScale(13),
    color: C.muted,
    fontWeight: '500',
  },

  // List
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(100),
  },

  // Booking Card
  bookingCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  bookingIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookingId: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  bookingDate: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
  statusPill: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(12),
  },
  statusPillText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },

  // Card Body
  cardBody: {
    padding: scale(16),
    gap: scale(10),
  },
  itemsSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  itemsText: {
    fontSize: moderateScale(14),
    color: C.text,
    fontWeight: '500',
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  scheduleText: {
    fontSize: moderateScale(13),
    color: C.info,
    fontWeight: '500',
  },
  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  engineerText: {
    fontSize: moderateScale(13),
    color: C.purple,
    fontWeight: '500',
    flex: 1,
  },

  // Card Footer
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(16),
    backgroundColor: '#F8FAFC',
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  amountLabel: {
    fontSize: moderateScale(11),
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  amountValue: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
    marginTop: scale(2),
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#FEE2E2',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  viewDetailsText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.primary,
  },

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
