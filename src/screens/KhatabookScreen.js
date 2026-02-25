/**
 * ============================================================================
 * KHATABOOK SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Dimensions, StatusBar, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width: W } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#EF3A3A',
  gradient2: '#DC2626',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  shadow: '#64748B',
};

const PERIOD_TABS = [
  { key: 7,   label: '7 Days',  icon: 'today-outline' },
  { key: 30,  label: '30 Days', icon: 'calendar-outline' },
  { key: 90,  label: '90 Days', icon: 'calendar' },
  { key: 365, label: '1 Year',  icon: 'time-outline' },
];

const QUICK_ACTIONS = [
  { key: 'Expenses',     label: 'Expenses',  icon: 'cash-outline',        gradient: ['#FBBF24', '#F59E0B'] },
  { key: 'Cashbook',     label: 'Cashbook',  icon: 'wallet-outline',      gradient: ['#60A5FA', '#3B82F6'] },
  { key: 'VendorLedger', label: 'Vendors',   icon: 'people-outline',      gradient: ['#A78BFA', '#7C3AED'] },
  { key: 'Analytics',    label: 'Analytics',  icon: 'stats-chart-outline', gradient: ['#34D399', '#10B981'] },
];

const fmt = (val) => {
  const n = Number(val) || 0;
  if (n >= 10000000) return `₹${(n / 10000000).toFixed(1)}Cr`;
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${n.toLocaleString('en-IN')}`;
};

const fmtFull = (val) => `₹${(Number(val) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

const fmtDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

/* ─── Skeleton ─── */
function SkeletonLoader({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
      <Animated.View style={[st.skelHero, { opacity: pulse }]} />
      <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(14) }}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelCard, { opacity: pulse }]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: scale(10), marginTop: scale(14) }}>
        {[1, 2].map(i => (
          <Animated.View key={i} style={[st.skelAction, { opacity: pulse }]} />
        ))}
      </View>
      {[1, 2, 3].map(i => (
        <Animated.View key={i} style={[st.skelItem, { opacity: pulse }]} />
      ))}
    </View>
  );
}

export default function KhatabookScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    selectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [menuVisible, setMenuVisible] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;
    try {
      setLoading(true);
      const res = await api.get(`/owner/finance-reports?restaurantId=${selectedRestaurantId}&period=${selectedPeriod}`);
      if (res.data.ok) setData(res.data.data);
    } catch (e) {
      console.error('Error loading khatabook:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedPeriod]);

  useEffect(() => {
    if (selectedRestaurantId) loadData();
  }, [selectedRestaurantId, selectedPeriod, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const netRevenue = (data?.totalRevenue || 0) - (data?.totalExpenses || 0);
  const isProfit = netRevenue >= 0;

  /* ─── Breakdown sections ─── */
  const breakdownSections = useMemo(() => {
    if (!data) return [];
    const sections = [];

    if (data.cashbook) {
      const cb = data.cashbook;
      sections.push({
        title: 'Cashbook',
        icon: 'wallet',
        gradient: ['#60A5FA', '#3B82F6'],
        rows: [
          { label: 'Cash In', value: fmtFull(cb.cashIn), icon: 'arrow-down-circle', color: C.success },
          { label: 'Cash Out', value: fmtFull(cb.cashOut), icon: 'arrow-up-circle', color: C.danger },
          { label: 'Bank In', value: fmtFull(cb.bankIn), icon: 'arrow-down-circle', color: C.success },
          { label: 'Bank Out', value: fmtFull(cb.bankOut), icon: 'arrow-up-circle', color: C.danger },
          { label: 'Cash Balance', value: fmtFull(cb.cashBalance), icon: 'cash', color: C.info, bold: true },
          { label: 'Bank Balance', value: fmtFull(cb.bankBalance), icon: 'card', color: C.info, bold: true },
        ].filter(r => r.value !== '₹0'),
      });
    }

    if (data.vendorLedger) {
      const vl = data.vendorLedger;
      sections.push({
        title: 'Vendor Ledger',
        icon: 'people',
        gradient: ['#A78BFA', '#7C3AED'],
        rows: [
          { label: 'Total Due', value: fmtFull(vl.totalDue), icon: 'alert-circle', color: C.danger },
          { label: 'Purchases', value: fmtFull(vl.totalPurchases), icon: 'cart', color: C.warning },
          { label: 'Payments', value: fmtFull(vl.totalPayments), icon: 'checkmark-circle', color: C.success },
          { label: 'Vendors', value: String(vl.vendorCount || 0), icon: 'people', color: C.info },
        ].filter(r => r.value !== '₹0' && r.value !== '0'),
      });
    }

    if (data.staffSalary) {
      const ss = data.staffSalary;
      sections.push({
        title: 'Staff Salary',
        icon: 'briefcase',
        gradient: ['#F472B6', '#EC4899'],
        rows: [
          { label: 'Payable', value: fmtFull(ss.payable), icon: 'time', color: C.warning },
          { label: 'Paid', value: fmtFull(ss.paid), icon: 'checkmark-circle', color: C.success },
          { label: 'Pending', value: fmtFull(ss.pending), icon: 'alert-circle', color: C.danger },
        ].filter(r => r.value !== '₹0'),
      });
    }

    if (data.categoryExpenses && data.categoryExpenses.length > 0) {
      sections.push({
        title: 'Expense Categories',
        icon: 'pie-chart',
        gradient: ['#FBBF24', '#F59E0B'],
        rows: data.categoryExpenses.map(cat => ({
          label: cat.category || cat.name || 'Other',
          value: fmtFull(cat.total || cat.amount),
          icon: 'pricetag',
          color: C.warning,
        })),
      });
    }

    return sections;
  }, [data]);

  /* ─── LOADING STATE ─── */
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.loadingHero}>
          <Text style={st.heroTitle}>Khatabook</Text>
        </LinearGradient>
        <RestaurantSelectorBar />
        <SkeletonLoader pulse={pulse} />
        <KniBottomNav navigation={navigation} active="khatabook" />
      </SafeAreaView>
    );
  }

  /* ─── MAIN RENDER ─── */
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ═══ Premium Gradient Hero Header ═══ */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroSection}
      >
        <View style={st.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>Khatabook</Text>
            <Text style={st.heroSubtitle}>{selectedRestaurant?.name || 'Financial Overview'}</Text>
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity
              onPress={onRefresh}
              style={[st.heroIconBtn, refreshing && { opacity: 0.5 }]}
              disabled={refreshing}
            >
              <Icon name="refresh" size={scale(20)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={st.heroIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Net Revenue Summary inside Hero */}
        <View style={st.heroSummaryCard}>
          <View style={st.heroSummaryLeft}>
            <View style={[st.heroSummaryIcon, { backgroundColor: isProfit ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)' }]}>
              <Icon name={isProfit ? 'trending-up' : 'trending-down'} size={scale(20)} color={isProfit ? '#10B981' : '#EF4444'} />
            </View>
            <View>
              <Text style={st.heroSummaryLabel}>Net Revenue</Text>
              <Text style={st.heroSummaryValue}>{fmtFull(Math.abs(netRevenue))}</Text>
            </View>
          </View>
          <View style={[st.heroSummaryBadge, { backgroundColor: isProfit ? C.successLight : C.dangerLight }]}>
            <Icon name={isProfit ? 'arrow-up' : 'arrow-down'} size={scale(12)} color={isProfit ? C.success : C.danger} />
            <Text style={[st.heroSummaryBadgeText, { color: isProfit ? C.success : C.danger }]}>
              {isProfit ? 'Profit' : 'Loss'}
            </Text>
          </View>
        </View>
      </LinearGradient>

      {/* ═══ Restaurant Selector ═══ */}
      <RestaurantSelectorBar />

      {/* ═══ Period Filter ═══ */}
      <View style={st.periodSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.periodScroll}>
          {PERIOD_TABS.map(tab => {
            const isActive = selectedPeriod === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.periodChip, isActive && st.periodChipActive]}
                onPress={() => setSelectedPeriod(tab.key)}
                activeOpacity={0.7}
              >
                <Icon name={tab.icon} size={scale(14)} color={isActive ? '#fff' : C.muted} />
                <Text style={[st.periodChipText, isActive && st.periodChipTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ═══ Scrollable Content ═══ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}
      >
        {/* ─── Revenue / Expense Mini Cards ─── */}
        <View style={st.miniCardsRow}>
          <View style={st.miniCard}>
            <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={st.miniCardIcon}>
              <Icon name="arrow-down-circle" size={scale(18)} color={C.success} />
            </LinearGradient>
            <Text style={st.miniCardValue}>{fmt(data?.totalRevenue)}</Text>
            <Text style={st.miniCardLabel}>REVENUE</Text>
          </View>

          <View style={st.miniCard}>
            <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.miniCardIcon}>
              <Icon name="arrow-up-circle" size={scale(18)} color={C.danger} />
            </LinearGradient>
            <Text style={st.miniCardValue}>{fmt(data?.totalExpenses)}</Text>
            <Text style={st.miniCardLabel}>EXPENSES</Text>
          </View>

          <View style={st.miniCard}>
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={st.miniCardIcon}>
              <Icon name="time" size={scale(18)} color={C.warning} />
            </LinearGradient>
            <Text style={st.miniCardValue}>{fmt(data?.pendingDues)}</Text>
            <Text style={st.miniCardLabel}>DUES</Text>
          </View>

          <View style={st.miniCard}>
            <LinearGradient colors={['#DBEAFE', '#BFDBFE']} style={st.miniCardIcon}>
              <Icon name="wallet" size={scale(18)} color={C.info} />
            </LinearGradient>
            <Text style={st.miniCardValue}>{fmt(data?.cashBalance)}</Text>
            <Text style={st.miniCardLabel}>BALANCE</Text>
          </View>
        </View>

        {/* ─── Quick Actions ─── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={st.actionsGrid}>
          {QUICK_ACTIONS.map(action => (
            <TouchableOpacity
              key={action.key}
              style={st.actionCard}
              onPress={() => navigation.navigate(action.key)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={action.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={st.actionIconBox}
              >
                <Icon name={action.icon} size={scale(24)} color="#fff" />
              </LinearGradient>
              <Text style={st.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ─── Breakdown Sections ─── */}
        {breakdownSections.map((section, idx) => (
          <View key={idx}>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>{section.title}</Text>
              <View style={st.sectionCountPill}>
                <Text style={st.sectionCountText}>{section.rows.length}</Text>
              </View>
            </View>

            <View style={st.breakdownCard}>
              <LinearGradient
                colors={section.gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={st.breakdownAccent}
              />
              <View style={st.breakdownBody}>
                <View style={st.breakdownHeader}>
                  <LinearGradient colors={section.gradient} style={st.breakdownHeaderIcon}>
                    <Icon name={section.icon} size={scale(16)} color="#fff" />
                  </LinearGradient>
                  <Text style={st.breakdownHeaderTitle}>{section.title}</Text>
                </View>

                {section.rows.map((row, ri) => (
                  <View key={ri}>
                    {ri > 0 && <View style={st.breakdownDivider} />}
                    <View style={st.breakdownRow}>
                      <View style={[st.breakdownRowIcon, { backgroundColor: row.color + '18' }]}>
                        <Icon name={row.icon} size={scale(14)} color={row.color} />
                      </View>
                      <Text style={[st.breakdownRowLabel, row.bold && { fontWeight: '700', color: C.ink }]}>
                        {row.label}
                      </Text>
                      <Text style={[st.breakdownRowValue, { color: row.color }, row.bold && { fontWeight: '800', fontSize: moderateScale(15) }]}>
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        ))}

        {/* ─── Recent Transactions ─── */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <View>
            <View style={st.sectionHeader}>
              <Text style={st.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity
                style={st.viewAllBtn}
                onPress={() => navigation.navigate('Cashbook')}
                activeOpacity={0.7}
              >
                <Text style={st.viewAllText}>View All</Text>
                <Icon name="chevron-forward" size={scale(14)} color={C.primary} />
              </TouchableOpacity>
            </View>

            {data.recentTransactions.map((txn, idx) => {
              const isCredit = txn.type === 'CREDIT';
              return (
                <View key={idx} style={st.txnCard}>
                  <View style={st.txnRow}>
                    <View style={[st.txnIcon, { backgroundColor: isCredit ? C.successLight : C.dangerLight }]}>
                      <Icon name={isCredit ? 'arrow-down-circle' : 'arrow-up-circle'} size={scale(20)} color={isCredit ? C.success : C.danger} />
                    </View>
                    <View style={st.txnInfo}>
                      <Text style={st.txnTitle} numberOfLines={1}>
                        {txn.description || (isCredit ? 'Income' : 'Expense')}
                      </Text>
                      <View style={st.txnMeta}>
                        <View style={[st.txnTypeBadge, { backgroundColor: isCredit ? C.successLight : C.dangerLight }]}>
                          <Text style={[st.txnTypeText, { color: isCredit ? C.success : C.danger }]}>
                            {isCredit ? 'CREDIT' : 'DEBIT'}
                          </Text>
                        </View>
                        <Text style={st.txnDate}>{fmtDate(txn.date)}</Text>
                      </View>
                    </View>
                    <Text style={[st.txnAmount, { color: isCredit ? C.success : C.danger }]}>
                      {isCredit ? '+' : '-'}{fmtFull(txn.amount)}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* ─── Help Card ─── */}
        <View style={st.helpCard}>
          <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={st.helpGradient}>
            <View style={st.helpIconBox}>
              <Icon name="help-circle" size={scale(24)} color={C.info} />
            </View>
            <Text style={st.helpTitle}>Need Help?</Text>
            <Text style={st.helpText}>
              Track your restaurant finances, manage vendor payments, and view detailed analytics all in one place.
            </Text>
            <TouchableOpacity
              style={st.helpBtn}
              onPress={() => navigation.navigate('SupportCenter')}
              activeOpacity={0.85}
            >
              <Icon name="chatbubbles" size={scale(16)} color="#fff" />
              <Text style={st.helpBtnText}>Contact Support</Text>
            </TouchableOpacity>
          </LinearGradient>
        </View>

        {/* ─── Empty State ─── */}
        {!data && !loading && (
          <View style={st.emptyBox}>
            <View style={st.emptyIconCircle}>
              <Icon name="wallet-outline" size={scale(56)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>No Financial Data</Text>
            <Text style={st.emptySubtitle}>
              Start recording transactions to see your financial overview here
            </Text>
            <TouchableOpacity style={st.emptyBtn} onPress={onRefresh}>
              <Icon name="refresh" size={scale(18)} color="#fff" />
              <Text style={st.emptyBtnText}>Refresh</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="khatabook" />
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════════════════ */
/*                         STYLES                            */
/* ═══════════════════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ═══ Hero Section ═══
  heroSection: {
    paddingTop: scale(8),
    paddingBottom: scale(16),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(14),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  heroTextContainer: { flex: 1 },
  heroTitle: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  heroActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  heroIconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Hero Summary Card (inside gradient)
  heroSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: scale(16),
    backgroundColor: '#fff',
    borderRadius: scale(16),
    padding: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale(12),
    elevation: 5,
  },
  heroSummaryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  heroSummaryIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroSummaryLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroSummaryValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: -0.3,
  },
  heroSummaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
  },
  heroSummaryBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },

  // Loading
  loadingHero: {
    paddingVertical: scale(24),
    paddingHorizontal: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },

  // ═══ Period Chips ═══
  periodSection: {
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  periodScroll: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  periodChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(9),
    backgroundColor: C.card,
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.border,
  },
  periodChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodChipText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
  },
  periodChipTextActive: {
    color: '#fff',
  },

  // ═══ Mini Cards ═══
  miniCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    gap: scale(8),
  },
  miniCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    elevation: 1,
  },
  miniCardIcon: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  miniCardValue: {
    fontSize: moderateScale(13),
    fontWeight: '800',
    color: C.ink,
  },
  miniCardLabel: {
    fontSize: moderateScale(8),
    fontWeight: '700',
    color: C.muted,
    marginTop: scale(2),
    letterSpacing: 0.5,
  },

  // ═══ Section Header ═══
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    marginTop: scale(20),
    marginBottom: scale(10),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  sectionCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(10),
  },
  sectionCountText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.muted,
  },

  // ═══ Quick Actions ═══
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: scale(16),
    justifyContent: 'space-between',
    rowGap: scale(10),
  },
  actionCard: {
    width: '48%',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(8),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    elevation: 1,
  },
  actionIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  actionLabel: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // ═══ Breakdown Card ═══
  breakdownCard: {
    marginHorizontal: scale(16),
    backgroundColor: C.card,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 2,
  },
  breakdownAccent: {
    height: scale(3),
  },
  breakdownBody: {
    padding: scale(14),
  },
  breakdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  breakdownHeaderIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownHeaderTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(7),
  },
  breakdownRowIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownRowLabel: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: C.text,
  },
  breakdownRowValue: {
    fontSize: moderateScale(14),
    fontWeight: '700',
  },
  breakdownDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginLeft: scale(38),
  },

  // ═══ Transactions ═══
  viewAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  viewAllText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.primary,
  },
  txnCard: {
    marginHorizontal: scale(16),
    marginBottom: scale(8),
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: scale(4),
    elevation: 1,
  },
  txnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  txnIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  txnInfo: { flex: 1 },
  txnTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    marginBottom: scale(4),
  },
  txnMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  txnTypeBadge: {
    paddingHorizontal: scale(7),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  txnTypeText: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  txnDate: {
    fontSize: moderateScale(11),
    color: C.muted,
  },
  txnAmount: {
    fontSize: moderateScale(16),
    fontWeight: '800',
  },

  // ═══ Help Card ═══
  helpCard: {
    marginHorizontal: scale(16),
    marginTop: scale(24),
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  helpGradient: {
    padding: scale(20),
    alignItems: 'center',
    borderRadius: scale(16),
  },
  helpIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  helpTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(6),
  },
  helpText: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(19),
    marginBottom: scale(16),
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: C.info,
  },
  helpBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#fff',
  },

  // ═══ Empty State ═══
  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(50),
    paddingHorizontal: scale(40),
  },
  emptyIconCircle: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(24),
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
    backgroundColor: C.primary,
    borderRadius: scale(14),
  },
  emptyBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // ═══ Skeleton ═══
  skelHero: {
    height: scale(80),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(16),
  },
  skelCard: {
    flex: 1,
    height: scale(80),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(14),
  },
  skelAction: {
    flex: 1,
    height: scale(56),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(14),
  },
  skelItem: {
    height: scale(90),
    backgroundColor: '#E2E8F0',
    borderRadius: scale(14),
    marginTop: scale(10),
  },
});
