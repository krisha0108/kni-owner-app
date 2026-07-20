/**
 * ============================================================================
 * AMC CONTRACTS LIST SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  RefreshControl, ActivityIndicator, ScrollView, StatusBar,
  useWindowDimensions,
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

export default function AMCContractsScreen({ navigation }) {
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
  const [menuVisible, setMenuVisible] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

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
        <Icon name={config.icon} size={16} color={isActive ? '#fff' : config.color} />
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
              <Icon name={config.icon} size={20} color={config.color} />
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
            <Icon name="restaurant-outline" size={16} color={C.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.restaurant?.name || 'Restaurant'}</Text>
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
              <Icon name="calendar-outline" size={14} color={C.muted} />
              <Text style={styles.dateText}>{formatDate(item.startDate)} → {formatDate(item.endDate)}</Text>
            </View>
          </View>

          <View style={[styles.daysChip, daysRemaining > 30 ? { backgroundColor: C.ok + '15' } : daysRemaining > 0 ? { backgroundColor: C.warn + '15' } : { backgroundColor: C.danger + '15' }]}>
            <Icon name="time-outline" size={14} color={daysRemaining > 30 ? C.ok : daysRemaining > 0 ? C.warn : C.danger} />
            <Text style={{ color: daysRemaining > 30 ? C.ok : daysRemaining > 0 ? C.warn : C.danger, fontSize: moderateScale(12), fontWeight: '600' }}>
              {daysRemaining > 0 ? `${daysRemaining} days remaining` : 'Expired'}
            </Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Icon name="chevron-forward" size={16} color={C.ok} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor="#059669" />
        <LinearGradient colors={['#059669', '#047857']} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>AMC Contracts</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.ok} />
          <Text style={styles.loadingText}>Loading contracts...</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor="#059669" />

      <LinearGradient colors={['#059669', '#047857']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.heroHeader}>
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>AMC Contracts</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
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

      <RestaurantSelectorBar />

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{filtered.length} contract{filtered.length !== 1 ? 's' : ''}</Text>
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
              <Icon name="shield-checkmark-outline" size={48} color={C.muted} />
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

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  heroHeader: { paddingBottom: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24) },
  heroContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(16),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroTitle: { fontSize: moderateScale(20), fontWeight: '700', color: '#fff' },
  menuBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },

  statsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24) },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  statDivider: { width: 1, height: scale(32), backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: scale(16) },

  statusTabsContainer: { backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  statusTabsScroll: { paddingHorizontal: scale(16), paddingVertical: scale(12) },
  statusTab: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(8),
    borderRadius: scale(20), backgroundColor: C.bg, marginRight: scale(8), gap: scale(6),
  },
  statusTabLabel: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  statusTabCount: {
    backgroundColor: C.border, paddingHorizontal: scale(6), paddingVertical: scale(2),
    borderRadius: scale(10), minWidth: scale(20), alignItems: 'center',
  },
  statusTabCountText: { fontSize: moderateScale(11), fontWeight: '700', color: C.muted },

  resultsRow: { paddingHorizontal: scale(16), paddingVertical: scale(10) },
  resultsText: { fontSize: moderateScale(13), color: C.muted, fontWeight: '500' },

  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(100) },

  contractCard: {
    backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  cardHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(12) },
  iconBox: { width: scale(44), height: scale(44), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
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

  cardFooter: {
    padding: scale(16), backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: C.border, alignItems: 'flex-end',
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: C.ok + '15', paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(20),
  },
  viewBtnText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ok },

  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  emptyList: { alignItems: 'center', paddingTop: scale(60) },
  emptyIconBox: {
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
});
