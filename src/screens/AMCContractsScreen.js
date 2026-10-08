/**
 * ============================================================================
 * AMC CONTRACTS LIST SCREEN - PREMIUM DESIGN
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
  ok: '#10B981', warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6', purple: '#7C3AED',
};

const CONTRACT_STATUS = {
  all:       { bg: '#F1F5F9', color: C.ink, icon: 'apps', label: 'All' },
  ACTIVE:    { bg: '#D1FAE5', color: '#059669', icon: 'shield-checkmark', label: 'Active' },
  EXPIRED:   { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Expired' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled' },
  RENEWED:   { bg: '#DBEAFE', color: '#2563EB', icon: 'refresh', label: 'Renewed' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatCurrency = (amount) => '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN');

/* ─── Skeleton ─── */
function SkeletonContractsList({ pulse }) {
  return (
    <View style={styles.listContent}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.contractCard}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <Animated.View style={[styles.skelIconBox, { opacity: pulse }]} />
              <View>
                <Animated.View style={[styles.skelLine, { opacity: pulse, width: scale(90) }]} />
                <Animated.View style={[styles.skelLine, { opacity: pulse, width: scale(60), marginTop: scale(6) }]} />
              </View>
            </View>
            <Animated.View style={[styles.skelPill, { opacity: pulse }]} />
          </View>
          <View style={styles.cardBody}>
            <Animated.View style={[styles.skelLine, { opacity: pulse, width: '80%' }]} />
            <Animated.View style={[styles.skelProgressBar, { opacity: pulse }]} />
            <Animated.View style={[styles.skelLine, { opacity: pulse, width: '60%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AMCContractsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTabletDevice = isTablet(width);

  const {
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contracts, setContracts] = useState([]);
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
    const counts = { all: contracts.length };
    contracts.forEach(c => { counts[c.status] = (counts[c.status] || 0) + 1; });
    return counts;
  }, [contracts]);

  useFocusEffect(
    useCallback(() => {
      const key = `AMCContracts-${selectedRestaurant}`;
      if (isStale(key) || contracts.length === 0) {
        loadData();
        markFetched(key);
      }
    }, [selectedRestaurant, contracts.length])
  );

  const loadData = async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = { page: pageNum, pageSize: 20 };
      if (selectedRestaurant) params.restaurantId = selectedRestaurant;
      const response = await api.get('/owner/amc-contracts', { params });
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
          if (append) {
            setContracts(prev => {
              const existingIds = new Set(prev.map(c => c.id));
              const uniqueNew = items.filter(c => !existingIds.has(c.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setContracts(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setContracts(responseData || []);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading AMC contracts:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return contracts;
    return contracts.filter(c => c.status === activeTab);
  }, [contracts, activeTab]);

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
    markFetched(`AMCContracts-${selectedRestaurant}`);
  };

  const renderStatusTab = (statusKey) => {
    const config = CONTRACT_STATUS[statusKey];
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

  const renderContractCard = ({ item, index }) => {
    const config = CONTRACT_STATUS[item.status] || CONTRACT_STATUS.ACTIVE;
    // Calculate from scheduledVisits array (API doesn't return pre-computed counts)
    const completedVisits = item.scheduledVisits?.filter(v => v.status === 'COMPLETED').length || 0;
    const totalVisits = item.scheduledVisits?.filter(v => v.visitType === 'PREVENTIVE').length || 0;
    const progress = totalVisits ? completedVisits / totalVisits : 0;
    const daysRemaining = item.endDate ? Math.max(0, Math.ceil((new Date(item.endDate) - new Date()) / (1000 * 60 * 60 * 24))) : 0;
    const contractNum = item.contractNumber || `AMC-${item.id.slice(0, 6).toUpperCase()}`;

    return (
      <TouchableOpacity
        style={[
          styles.contractCard,
          isTabletDevice && { width: (width - 48) / 2 - 6 },
          isTabletDevice && index % 2 === 0 && { marginRight: scale(12) },
        ]}
        onPress={() => navigation.navigate('AMCContractDetail', { contractId: item.id })}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.iconBox, { backgroundColor: config.bg }]}>
              <Icon name={config.icon} size={scale(15)} color={config.color} />
            </View>
            <View>
              <Text style={styles.contractNum}>{contractNum}</Text>
              <Text style={styles.contractDate}>{formatDate(item.startDate)}</Text>
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
              <Icon name="chevron-forward" size={scale(14)} color={C.ok} />
            </View>
          </View>

          {/* Visit Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressHeader}>
              <Text style={styles.progressLabel}>Visit Progress</Text>
              <Text style={styles.progressCount}>{completedVisits}/{totalVisits}</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
            </View>
          </View>

          {/* Date range & Days remaining */}
          <View style={styles.dateRow}>
            <View style={styles.dateItem}>
              <Icon name="calendar-outline" size={scale(12)} color={C.muted} />
              <Text style={styles.dateText}>{formatDate(item.startDate)} → {formatDate(item.endDate)}</Text>
            </View>
          </View>

          <View style={[styles.daysChip, daysRemaining > 30 ? { backgroundColor: C.ok + '15' } : daysRemaining > 0 ? { backgroundColor: C.warn + '15' } : { backgroundColor: C.danger + '15' }]}>
            <Icon name="time-outline" size={scale(12)} color={daysRemaining > 30 ? C.ok : daysRemaining > 0 ? C.warn : C.danger} />
            <Text style={{ color: daysRemaining > 30 ? C.ok : daysRemaining > 0 ? C.warn : C.danger, fontSize: moderateScale(12), fontWeight: '600' }}>
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
            </Text>
          </View>
        </View>

      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <LinearGradient colors={['#059669', '#047857']} style={[styles.heroHeader, { paddingTop: insets.top }]}>
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
            <Text style={[styles.heroTitle, { flex: 1, marginLeft: scale(10) }]}>AMC Contracts</Text>
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonContractsList pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />

      <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroHeader, { paddingTop: insets.top }]}>
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
            <Text style={styles.heroTitle}>AMC Contracts</Text>
            <RestaurantSelectorCompact dark style={styles.heroRestaurantPill} />
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['ACTIVE'] || 0}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{totalCount || contracts.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{statusCounts['EXPIRED'] || 0}</Text>
            <Text style={styles.statLabel}>Expired</Text>
          </View>
        </View>
      </LinearGradient>

      <View style={styles.statusTabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.statusTabsScroll}>
          {Object.keys(CONTRACT_STATUS).map(renderStatusTab)}
        </ScrollView>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        renderItem={renderContractCard}
        numColumns={isTabletDevice ? 2 : 1}
        key={isTabletDevice ? 'tablet' : 'phone'}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.ok]} />}
        ListEmptyComponent={
          <View style={styles.emptyList}>
            <View style={styles.emptyIconBox}>
              <Icon name="shield-checkmark-outline" size={scale(32)} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Contracts Found</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab !== 'all' ? 'No contracts with this status' : 'Your AMC contracts will appear here'}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  heroHeader: { paddingBottom: scale(10), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20), overflow: 'hidden', position: 'relative' },
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

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24) },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: moderateScale(10.5), color: 'rgba(255,255,255,0.8)', marginTop: scale(1) },
  statDivider: { width: 1, height: scale(22), backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: scale(16) },

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

  listContent: { paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(100) },

  contractCard: {
    backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  iconBox: { width: scale(32), height: scale(32), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  contractNum: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  contractDate: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  statusPill: { paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(12) },
  statusPillText: { fontSize: moderateScale(11), fontWeight: '600' },

  cardBody: { padding: scale(16), gap: scale(10) },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  infoText: { fontSize: moderateScale(14), color: C.text, fontWeight: '500', flex: 1 },

  progressSection: { marginTop: scale(4) },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(6) },
  progressLabel: { fontSize: moderateScale(12), color: C.muted },
  progressCount: { fontSize: moderateScale(12), fontWeight: '700', color: C.ink },
  progressBarBg: { height: scale(6), backgroundColor: C.border, borderRadius: scale(3), overflow: 'hidden' },
  progressBarFill: { height: scale(6), backgroundColor: C.ok, borderRadius: scale(3) },

  dateRow: { flexDirection: 'row', alignItems: 'center' },
  dateItem: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  dateText: { fontSize: moderateScale(12), color: C.muted },

  daysChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6), alignSelf: 'flex-start',
    paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(10),
  },

  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: C.ok + '15', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(16),
  },
  viewBtnText: { fontSize: moderateScale(11), fontWeight: '600', color: C.ok },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  emptyList: { alignItems: 'center', paddingTop: scale(60) },
  emptyIconBox: {
    width: scale(64), height: scale(64), borderRadius: scale(32),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(16),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },

  // ═══ Skeleton ═══
  skelIconBox: { width: scale(32), height: scale(32), borderRadius: scale(10), backgroundColor: '#E2E8F0' },
  skelPill: { width: scale(60), height: scale(22), borderRadius: scale(12), backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(12), backgroundColor: '#E2E8F0', borderRadius: scale(4) },
  skelProgressBar: { height: scale(6), backgroundColor: '#E2E8F0', borderRadius: scale(3), marginTop: scale(10) },
});
