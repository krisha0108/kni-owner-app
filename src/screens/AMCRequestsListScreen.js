/**
 * ============================================================================
 * AMC REQUESTS LIST SCREEN - PREMIUM DESIGN
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

export default function AMCRequestsListScreen({ navigation }) {
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
  const [menuVisible, setMenuVisible] = useState(false);

  const statusCounts = useMemo(() => {
    const counts = { all: requests.length };
    requests.forEach(r => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return counts;
  }, [requests]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [selectedRestaurant])
  );

  const loadData = async () => {
    try {
      setLoading(true);
      const params = { ...(selectedRestaurant ? { restaurantId: selectedRestaurant } : {}) };
      const response = await api.get('/owner/amc-requests', { params });
      if (response.data.ok) {
        setRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading AMC requests:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const filtered = useMemo(() => {
    if (activeTab === 'all') return requests;
    return requests.filter(r => r.status === activeTab);
  }, [requests, activeTab]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
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
        <Icon name={config.icon} size={16} color={isActive ? '#fff' : config.color} />
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
              <Icon name={config.icon} size={20} color={config.color} />
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
            <Icon name="restaurant-outline" size={16} color={C.muted} />
            <Text style={styles.infoText} numberOfLines={1}>{item.restaurant?.name || 'Restaurant'}</Text>
          </View>
          <View style={styles.infoRow}>
            <View style={[styles.planPill, { backgroundColor: planBadge.bg }]}>
              <Text style={{ color: planBadge.color, fontSize: moderateScale(11), fontWeight: '600' }}>{item.planType}</Text>
            </View>
            <Text style={styles.frequencyText}>{item.visitFrequency}</Text>
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Icon name="chevron-forward" size={16} color={C.purple} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.purple} />
        <LinearGradient colors={[C.purple, C.purpleDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>AMC Requests</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={styles.loadingText}>Loading requests...</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.purple} />

      <LinearGradient
        colors={[C.purple, C.purpleDark]}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>AMC Requests</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{requests.length}</Text>
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

      <RestaurantSelectorBar />

      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>{filtered.length} request{filtered.length !== 1 ? 's' : ''}</Text>
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
              <Icon name="shield-outline" size={48} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No AMC Requests</Text>
            <Text style={styles.emptySubtitle}>
              {activeTab !== 'all' ? 'No requests with this status' : 'Create your first AMC request'}
            </Text>
          </View>
        }
      />

      {/* FAB */}
      <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('AMCRequest')} activeOpacity={0.8}>
        <LinearGradient colors={[C.purple, C.purpleDark]} style={styles.fabGrad}>
          <Icon name="add" size={28} color="#fff" />
        </LinearGradient>
      </TouchableOpacity>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero
  heroHeader: {
    paddingBottom: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24),
  },
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

  // Stats
  statsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(24),
  },
  statItem: { flex: 1, alignItems: 'center' },
  statValue: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  statDivider: {
    width: 1, height: scale(32), backgroundColor: 'rgba(255,255,255,0.3)', marginHorizontal: scale(16),
  },

  // Status Tabs
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

  // Results
  resultsRow: { paddingHorizontal: scale(16), paddingVertical: scale(10) },
  resultsText: { fontSize: moderateScale(13), color: C.muted, fontWeight: '500' },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(100) },

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
    width: scale(44), height: scale(44), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center',
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

  // Card Footer
  cardFooter: {
    padding: scale(16), backgroundColor: '#F8FAFC', borderTopWidth: 1, borderTopColor: C.border,
    alignItems: 'flex-end',
  },
  viewBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    backgroundColor: '#F3E8FF', paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(20),
  },
  viewBtnText: { fontSize: moderateScale(13), fontWeight: '600', color: C.purple },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  // Empty
  emptyList: { alignItems: 'center', paddingTop: scale(60) },
  emptyIconBox: {
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },

  // FAB
  fab: {
    position: 'absolute', bottom: scale(110), right: scale(20),
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 8,
  },
  fabGrad: {
    width: scale(56), height: scale(56), borderRadius: scale(28), alignItems: 'center', justifyContent: 'center',
  },
});
