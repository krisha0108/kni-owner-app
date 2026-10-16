/**
 * ============================================================================
 * AMC REQUESTS LIST SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, StatusBar,
  useWindowDimensions, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorCompact } from '../components/RestaurantSelector';
import { scale, moderateScale, isTablet } from '../utils/responsive';
import { isStale, markFetched } from '../utils/focusCache';

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#334155',
  muted: '#94A3B8', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  ok: '#10B981', warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6',
  purple: '#7C3AED', purpleDark: '#6D28D9',
};

const AMC_STATUS_CONFIG = {
  all:               { bg: '#F1F5F9', color: C.ink, icon: 'apps', label: 'All' },
  REQUESTED:         { bg: '#FEF3C7', color: '#D97706', icon: 'shield-outline', label: 'Requested' },
  SURVEY_SCHEDULED:  { bg: '#DBEAFE', color: '#2563EB', icon: 'calendar-outline', label: 'Survey' },
  SURVEY_COMPLETED:  { bg: '#D1FAE5', color: '#059669', icon: 'clipboard-outline', label: 'Surveyed' },
  PROPOSAL_SENT:     { bg: '#E0E7FF', color: '#4F46E5', icon: 'document-text-outline', label: 'Proposal' },
  PROPOSAL_ACCEPTED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle-outline', label: 'Accepted' },
  PROPOSAL_REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Rejected' },
  PAYMENT_PENDING:   { bg: '#FEF3C7', color: '#D97706', icon: 'card-outline', label: 'Payment' },
  PAYMENT_UPLOADED:  { bg: '#DBEAFE', color: '#2563EB', icon: 'cloud-upload-outline', label: 'Uploaded' },
  CONTRACT_ACTIVE:   { bg: '#D1FAE5', color: '#059669', icon: 'shield-checkmark-outline', label: 'Active' },
  CANCELLED:         { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled' },
};

const PLAN_BADGE = {
  BASIC:    { bg: '#D1FAE5', color: '#059669' },
  STANDARD: { bg: '#DBEAFE', color: '#2563EB' },
  PREMIUM:  { bg: '#F3E8FF', color: '#7C3AED' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

/* ─── Skeleton ─── */
function SkeletonRequestsList({ pulse }) {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.requestCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Animated.View style={[styles.skelIconBox, { opacity: pulse }]} />
              <View>
                <Animated.View style={[styles.skelLine, { opacity: pulse, width: scale(80) }]} />
                <Animated.View style={[styles.skelLine, { opacity: pulse, width: scale(60), marginTop: scale(6) }]} />
              </View>
            </View>
            <Animated.View style={[styles.skelPill, { opacity: pulse }]} />
          </View>
          <View style={styles.cardBody}>
            <Animated.View style={[styles.skelLine, { opacity: pulse, width: '70%' }]} />
            <Animated.View style={[styles.skelLine, { opacity: pulse, width: '40%', marginTop: scale(10) }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AMCRequestsListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
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
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const statusCounts = useMemo(() => {
    const counts = { all: requests.length };
    requests.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  useFocusEffect(
    useCallback(() => {
      const key = `AMCRequestsList-${selectedRestaurant}`;
      if (isStale(key) || requests.length === 0) {
        loadData();
        markFetched(key);
      }
    }, [selectedRestaurant, requests.length])
  );

  const loadData = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page: pageNum, pageSize: 20 };
      if (selectedRestaurant) params.restaurantId = selectedRestaurant;
      const response = await api.get('/owner/amc-requests', { params });
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
          if (append) {
            setRequests(prev => {
              const existingIds = new Set(prev.map(r => r.id));
              const uniqueNew = items.filter(r => !existingIds.has(r.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setRequests(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setRequests(responseData || []);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading AMC requests:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

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
    markFetched(`AMCRequestsList-${selectedRestaurant}`);
  };

  const renderStatusTab = (statusKey) => {
    const config = AMC_STATUS_CONFIG[statusKey];
    const isActive = activeTab === statusKey;
    const count = statusCounts[statusKey] || 0;

    return (
      <TouchableOpacity
        key={statusKey}
        style={[styles.statusTab, isActive && { backgroundColor: config.color }]}
        onPress={() => setActiveTab(statusKey)}
        activeOpacity={0.7}
      >
        <Icon name={config.icon} size={scale(12)} color={isActive ? '#fff' : config.color} />
        <Text style={[styles.statusTabLabel, isActive && { color: '#fff' }]}>{config.label}</Text>
        <View style={[styles.statusTabCount, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
          <Text style={[styles.statusTabCountText, isActive && { color: '#fff' }]}>{count}</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRequestCard = ({ item, index }) => {
    const config = AMC_STATUS_CONFIG[item.status] || AMC_STATUS_CONFIG.REQUESTED;
    const planBadge = PLAN_BADGE[item.planType] || PLAN_BADGE.BASIC;

    return (
      <TouchableOpacity
        style={[
          styles.requestCard,
          isTabletDevice && { width: (width - 48) / 2 - 6 },
          isTabletDevice && index % 2 === 0 && { marginRight: scale(12) },
        ]}
        onPress={() => navigation.navigate('AMCRequestDetail', { requestId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
              <Icon name={config.icon} size={scale(15)} color={config.color} />
            </View>
            <View>
              <Text style={styles.requestId}>#{item.id.slice(0, 8).toUpperCase()}</Text>
              <Text style={styles.requestDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusPill, { backgroundColor: config.bg }]}>
            <Text style={[styles.statusPillText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <View style={styles.cardBody}>
          <View style={styles.infoRow}>
            <Icon name="restaurant-outline" size={scale(14)} color={C.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.restaurant?.name || 'Restaurant'}</Text>
            <View style={styles.viewBtn}>
              <Text style={styles.viewBtnText}>View Details</Text>
              <Icon name="chevron-forward" size={scale(14)} color={C.purple} />
            </View>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.planPill, { backgroundColor: planBadge.bg }]}>
              <Text style={{ color: planBadge.color, fontSize: moderateScale(11), fontWeight: '600' }}>{item.planType}</Text>
            </View>
            <Text style={styles.frequencyText}>{item.visitFrequency}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.purple} />
        <LinearGradient colors={[C.purple, C.purpleDark]} style={[styles.heroHeader, { paddingTop: insets.top }]}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={styles.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={scale(18)} color="#fff" />
            </TouchableOpacity>
            <Text style={[styles.heroTitle, { flex: 1, marginLeft: scale(10) }]}>AMC Requests</Text>
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonRequestsList pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.purple} />

      <LinearGradient
        colors={[C.purple, C.purpleDark]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={[styles.heroHeader, { paddingTop: insets.top }]}
      >
        <View style={styles.heroBlobA} pointerEvents="none" />
        <View style={styles.heroBlobB} pointerEvents="none" />
        <View style={styles.heroContent}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={styles.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTextContainer}>
            <Text style={styles.heroTitle}>AMC Requests</Text>
            <RestaurantSelectorCompact dark style={styles.heroRestaurantPill} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount || requests.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['REQUESTED'] || 0}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['CONTRACT_ACTIVE'] || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statusTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
          {Object.keys(AMC_STATUS_CONFIG).map(renderStatusTab)}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderRequestCard}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'tablet' : 'phone'}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.purple]} tintColor={C.purple} />
        }
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <View style={styles.emptyIconBox}>
              <Icon name="shield-outline" size={scale(32)} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No AMC Requests</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab !== 'all' ? 'No requests with this status' : 'Create your first AMC request'}
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

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AMCRequest')} activeOpacity={0.8}>
        <LinearGradient colors={[C.purple, C.purpleDark]} style={styles.fabGrad}>
          <Icon name="add" size={scale(18)} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero
  heroHeader: {
    paddingBottom: scale(10), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20),
    overflow: 'hidden', position: 'relative',
  },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(8),
  },
  backBtn: {
    width: scale(34), height: scale(34), borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnPlain: { width: scale(20), height: scale(30), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  heroTextContainer: { flex: 1, marginHorizontal: scale(12) },
  heroTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  heroRestaurantPill: { alignSelf: 'flex-start', marginTop: scale(4) },

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: moderateScale(10.5), color: 'rgba(255,255,255,0.8)', marginTop: scale(1) },
  statDivider: {
    width: 1, height: scale(22), backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: scale(16),
  },

  // Status Tabs
  statusTabsContainer: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  statusTabsScroll: { paddingHorizontal: scale(16), paddingVertical: scale(7) },
  statusTab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6),
    borderRadius: scale(16), backgroundColor: C.bg, marginRight: scale(6), gap: scale(5),
  },
  statusTabLabel: { fontSize: moderateScale(11.5), fontWeight: '600', color: C.ink },
  statusTabCount: {
    backgroundColor: C.border, paddingHorizontal: scale(5), paddingVertical: scale(1),
    borderRadius: scale(9), minWidth: scale(17), alignItems: 'center',
  },
  statusTabCountText: { fontSize: moderateScale(9.5), fontWeight: '700', color: C.muted },

  // List
  listContent: { paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(100) },

  // Card
  requestCard: {
    backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  iconBox: {
    width: scale(32), height: scale(32), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center',
  },
  requestId: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  requestDate: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  statusPill: { paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(12) },
  statusPillText: { fontSize: moderateScale(11), fontWeight: '600' },

  // Card Body
  cardBody: { padding: scale(16), gap: scale(10) },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  infoText: { fontSize: moderateScale(14), color: C.text, fontWeight: '500', flex: 1 },
  planPill: { paddingHorizontal: scale(10), paddingVertical: scale(3), borderRadius: scale(8) },
  frequencyText: { fontSize: moderateScale(13), color: C.muted, fontWeight: '500' },

  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: '#F3E8FF', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(16),
  },
  viewBtnText: { fontSize: moderateScale(11), fontWeight: '600', color: C.purple },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  // Empty
  emptyList: { alignItems: 'center', paddingTop: scale(60) },
  emptyIconBox: {
    width: scale(64), height: scale(64), borderRadius: scale(32),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: scale(110), right: scale(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  fabGrad: {
    width: scale(40), height: scale(40), borderRadius: scale(20), alignItems: 'center', justifyContent: 'center',
  },

  // ═══ Skeleton ═══
  skelIconBox: { width: scale(32), height: scale(32), borderRadius: scale(10), backgroundColor: '#E2E8F0' },
  skelPill: { width: scale(60), height: scale(22), borderRadius: scale(12), backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(12), backgroundColor: '#E2E8F0', borderRadius: scale(4) },
});
