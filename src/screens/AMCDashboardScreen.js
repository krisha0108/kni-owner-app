/**
 * ============================================================================
 * AMC DASHBOARD SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, StatusBar, useWindowDimensions,
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
import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { isStale, markFetched } from '../utils/focusCache';

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#334155',
  muted: '#94A3B8', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  ok: '#10B981', warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6',
  purple: '#7C3AED', purpleDark: '#6D28D9',
};

const VISIT_STATUS = {
  SCHEDULED:   { bg: '#DBEAFE', color: '#2563EB' },
  COMPLETED:   { bg: '#D1FAE5', color: '#059669' },
  MISSED:      { bg: '#FEE2E2', color: '#DC2626' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#D97706' },
};

const BREAKDOWN_STATUS = {
  REQUESTED:   { bg: '#FEF3C7', color: '#D97706', label: 'Requested', icon: 'time-outline' },
  ASSIGNED:    { bg: '#DBEAFE', color: '#2563EB', label: 'Assigned', icon: 'person-outline' },
  IN_PROGRESS: { bg: '#FEF3C7', color: '#D97706', label: 'In Progress', icon: 'construct-outline' },
  RESOLVED:    { bg: '#D1FAE5', color: '#059669', label: 'Resolved', icon: 'checkmark-circle-outline' },
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const QA = [
  { icon: 'add-circle-outline', label: 'New Request', grad: ['#7C3AED', '#6D28D9'], screen: 'AMCRequest', permission: 'amc:create' },
  { icon: 'document-text-outline', label: 'My Requests', grad: ['#3B82F6', '#2563EB'], screen: 'AMCRequestsList' },
  { icon: 'shield-checkmark-outline', label: 'My Contracts', grad: ['#10B981', '#059669'], screen: 'AMCContracts' },
];

export default function AMCDashboardScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const { can } = usePermissions();
  const {
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [breakdowns, setBreakdowns] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const params = { ...(selectedRestaurant ? { restaurantId: selectedRestaurant } : {}) };
      const [dashRes, bdRes] = await Promise.all([
        api.get('/owner/amc-dashboard', { params }),
        api.get('/owner/amc-breakdown', { params }),
      ]);
      if (dashRes.data.ok) setData(dashRes.data.data);
      if (bdRes.data.ok) {
        // Show only active breakdowns (not resolved)
        const active = (bdRes.data.data || []).filter(
          b => ['REQUESTED', 'ASSIGNED', 'IN_PROGRESS'].includes(b.status)
        );
        setBreakdowns(active);
      }
    } catch (error) {
      console.error('AMC Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurant]);

  useFocusEffect(
    useCallback(() => {
      const key = `AMCDashboard-${selectedRestaurant}`;
      if (isStale(key) || !data) {
        loadData();
        markFetched(key);
      }
    }, [loadData, selectedRestaurant, data])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants({ force: true });
    await loadData();
    markFetched(`AMCDashboard-${selectedRestaurant}`);
  };

  // API returns fields directly on data (not nested under stats)
  const upcomingVisits = data?.upcomingVisits || [];

  // Loading state
  if ((loading || restaurantsLoading) && !refreshing && !data) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.purple} />
        <LinearGradient colors={[C.purple, C.purpleDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={scale(24)} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroTitleRow}>
              <Icon name="shield-checkmark-outline" size={scale(22)} color="#fff" />
              <Text style={styles.heroTitle}>AMC Management</Text>
            </View>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={scale(24)} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.purple} />
          <Text style={styles.loadingText}>Loading AMC dashboard...</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.purple} />

      {/* Hero Header */}
      <LinearGradient
        colors={[C.purple, C.purpleDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(24)} color="#fff" />
          </TouchableOpacity>
          <View style={styles.heroTitleRow}>
            <Icon name="shield-checkmark-outline" size={scale(22)} color="#fff" />
            <Text style={styles.heroTitle}>AMC Management</Text>
          </View>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={scale(24)} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.purple]} tintColor={C.purple} />
        }
      >
        {/* Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: C.ok + '20' }]}>
              <Icon name="shield-checkmark" size={scale(22)} color={C.ok} />
            </View>
            <Text style={styles.statValue}>{data?.activeContracts || 0}</Text>
            <Text style={styles.statLabel}>Active Contracts</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: C.info + '20' }]}>
              <Icon name="checkmark-done-circle" size={scale(22)} color={C.info} />
            </View>
            <Text style={styles.statValue}>{data?.completedVisits || 0}</Text>
            <Text style={styles.statLabel}>Completed Visits</Text>
          </View>
        </View>
        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: C.warn + '20' }]}>
              <Icon name="time-outline" size={scale(22)} color={C.warn} />
            </View>
            <Text style={styles.statValue}>{data?.pendingRequests || 0}</Text>
            <Text style={styles.statLabel}>Pending Requests</Text>
          </View>
          <View style={styles.statCard}>
            <View style={[styles.statIconBox, { backgroundColor: C.danger + '20' }]}>
              <Icon name="construct-outline" size={scale(22)} color={C.danger} />
            </View>
            <Text style={styles.statValue}>{data?.activeBreakdowns || 0}</Text>
            <Text style={styles.statLabel}>Active Breakdowns</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.qaRow}>
          {QA.filter(q => !q.permission || can(q.permission)).map((q, i) => (
            <TouchableOpacity
              key={i}
              style={styles.qaItem}
              activeOpacity={0.8}
              onPress={() => navigation.navigate(q.screen)}
            >
              <LinearGradient colors={q.grad} style={styles.qaIcon}>
                <Icon name={q.icon} size={scale(22)} color="#fff" />
              </LinearGradient>
              <Text style={styles.qaLabel}>{q.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Upcoming Visits */}
        {upcomingVisits.length > 0 && (
          <View style={styles.visitsSection}>
            <Text style={styles.sectionTitle}>Upcoming Visits</Text>
            {upcomingVisits.slice(0, 5).map((visit, idx) => {
              const vs = VISIT_STATUS[visit.status] || VISIT_STATUS.SCHEDULED;
              return (
                <TouchableOpacity
                  key={`${visit.contractId}-${idx}`}
                  style={styles.visitCard}
                  onPress={() => visit.contractId && navigation.navigate('AMCContractDetail', { contractId: visit.contractId })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.visitIconBox, { backgroundColor: vs.bg }]}>
                    <Icon name="calendar-outline" size={scale(18)} color={vs.color} />
                  </View>
                  <View style={styles.visitInfo}>
                    <Text style={styles.visitDate}>{formatDate(visit.scheduledDate)}</Text>
                    <Text style={styles.visitRestaurant} numberOfLines={1}>
                      {visit.restaurant || 'AMC Visit'}
                    </Text>
                  </View>
                  <View style={[styles.visitStatusPill, { backgroundColor: vs.bg }]}>
                    <Text style={[styles.visitStatusText, { color: vs.color }]}>
                      {visit.status}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Active Breakdowns */}
        {breakdowns.length > 0 && (
          <View style={styles.breakdownSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Active Breakdowns</Text>
              <View style={[styles.bdCountBadge, { backgroundColor: C.danger + '15' }]}>
                <Text style={{ fontSize: moderateScale(12), fontWeight: '700', color: C.danger }}>{breakdowns.length}</Text>
              </View>
            </View>
            {breakdowns.map((bd) => {
              const bs = BREAKDOWN_STATUS[bd.status] || BREAKDOWN_STATUS.REQUESTED;
              return (
                <TouchableOpacity
                  key={bd.id}
                  style={styles.bdCard}
                  onPress={() => bd.contractId && navigation.navigate('AMCContractDetail', { contractId: bd.contractId })}
                  activeOpacity={0.7}
                >
                  <View style={[styles.bdIconBox, { backgroundColor: bs.bg }]}>
                    <Icon name="warning" size={scale(18)} color={bs.color} />
                  </View>
                  <View style={styles.bdInfo}>
                    <Text style={styles.bdEquipment} numberOfLines={1}>{bd.equipmentName}</Text>
                    <Text style={styles.bdRestaurant} numberOfLines={1}>
                      {bd.contract?.restaurant?.name || ''} {bd.contract?.contractNumber ? `• ${bd.contract.contractNumber}` : ''}
                    </Text>
                    <Text style={styles.bdProblem} numberOfLines={1}>{bd.problemDesc}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: scale(4) }}>
                    <View style={[styles.bdStatusPill, { backgroundColor: bs.bg }]}>
                      <Text style={[styles.bdStatusText, { color: bs.color }]}>{bs.label}</Text>
                    </View>
                    <View style={[styles.bdUrgencyPill, {
                      backgroundColor: bd.urgency === 'HIGH' ? C.danger + '15' : bd.urgency === 'LOW' ? C.ok + '15' : C.warn + '15',
                    }]}>
                      <Text style={{
                        fontSize: moderateScale(10), fontWeight: '600',
                        color: bd.urgency === 'HIGH' ? C.danger : bd.urgency === 'LOW' ? C.ok : C.warn,
                      }}>{bd.urgency}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Empty state if no data */}
        {!data && !loading && (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBox}>
              <Icon name="shield-outline" size={scale(48)} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No AMC Data</Text>
            <Text style={styles.emptySubtitle}>Start by creating an AMC request</Text>
          </View>
        )}

        <View style={{ height: scale(20) }} />
      </ScrollView>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero Header
  heroHeader: {
    paddingBottom: scale(20),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  heroContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(8),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },
  heroTitleRow: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
  },
  heroTitle: {
    fontSize: moderateScale(20), fontWeight: '700', color: '#fff',
  },
  menuBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center',
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: scale(16), paddingBottom: scale(100) },

  // Loading
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  // Stats Grid
  statsGrid: {
    flexDirection: 'row', gap: scale(12), marginBottom: scale(12),
  },
  statCard: {
    flex: 1, backgroundColor: C.card, borderRadius: scale(16), padding: scale(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIconBox: {
    width: scale(44), height: scale(44), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(10),
  },
  statValue: {
    fontSize: moderateScale(24), fontWeight: '800', color: C.ink,
  },
  statLabel: {
    fontSize: moderateScale(12), color: C.muted, marginTop: scale(2), fontWeight: '500',
  },

  // Section Title
  sectionTitle: {
    fontSize: moderateScale(16), fontWeight: '700', color: C.ink,
    marginBottom: scale(12), marginTop: scale(8),
  },

  // Quick Actions
  qaRow: {
    flexDirection: 'row', gap: scale(12), marginBottom: scale(20),
  },
  qaItem: {
    flex: 1, backgroundColor: C.card, borderRadius: scale(16), paddingVertical: scale(16),
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  qaIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(8),
  },
  qaLabel: {
    fontSize: moderateScale(12), fontWeight: '700', color: C.ink, textAlign: 'center',
  },

  // Visits
  visitsSection: { marginBottom: scale(16) },
  visitCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(14), padding: scale(14), marginBottom: scale(8),
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  visitIconBox: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center',
  },
  visitInfo: { flex: 1, marginLeft: scale(12) },
  visitDate: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  visitRestaurant: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  visitStatusPill: {
    paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(10),
  },
  visitStatusText: { fontSize: moderateScale(11), fontWeight: '600' },

  // Breakdowns
  breakdownSection: { marginBottom: scale(16) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12), marginTop: scale(8) },
  bdCountBadge: {
    width: scale(24), height: scale(24), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center',
  },
  bdCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(14), padding: scale(12), marginBottom: scale(8),
    borderLeftWidth: 3, borderLeftColor: C.danger,
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  bdIconBox: {
    width: scale(38), height: scale(38), borderRadius: scale(10),
    alignItems: 'center', justifyContent: 'center',
  },
  bdInfo: { flex: 1, marginHorizontal: scale(10) },
  bdEquipment: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  bdRestaurant: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },
  bdProblem: { fontSize: moderateScale(12), color: C.text, marginTop: scale(2) },
  bdStatusPill: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(8) },
  bdStatusText: { fontSize: moderateScale(10), fontWeight: '600' },
  bdUrgencyPill: { paddingHorizontal: scale(6), paddingVertical: scale(2), borderRadius: scale(6) },

  // Empty
  emptyContainer: { alignItems: 'center', paddingTop: scale(40) },
  emptyIconBox: {
    width: scale(100), height: scale(100), borderRadius: scale(50),
    backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
});
