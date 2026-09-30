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
import { RestaurantSelectorCompact } from '../components/RestaurantSelector';
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
    <View>
      {/* Money Card - same shape as st.moneyCard */}
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(14) }}>
        <View style={[st.moneyCard, { backgroundColor: C.ink }]}>
          <View style={st.moneyTabRow}>
            {PERIOD_TABS.map(tab => (
              <View key={tab.key} style={st.moneyTab} />
            ))}
          </View>
          <Animated.View style={[st.skelLineOnDark, { width: '50%', marginTop: scale(12), opacity: pulse }]} />
          <Animated.View style={[st.skelLineOnDark, { width: '65%', height: scale(22), marginTop: scale(8), opacity: pulse }]} />
          <Animated.View style={[st.skelLineOnDark, { width: '40%', height: scale(10), marginTop: scale(8), opacity: pulse }]} />
          <View style={st.moneyStatsRow}>
            {[1, 2, 3].map(i => <View key={i} style={st.moneyStat} />)}
          </View>
        </View>
      </View>

      {/* Quick Actions - same shape as st.actionsStrip */}
      <View style={st.sectionHeader}>
        <Animated.View style={[st.skelLine, { width: scale(100), opacity: pulse }]} />
      </View>
      <View style={st.actionsStrip}>
        {QUICK_ACTIONS.map((action, i) => (
          <React.Fragment key={action.key}>
            {i > 0 && <View style={st.actionsDivider} />}
            <View style={st.actionStripItem}>
              <Animated.View style={[st.actionStripIcon, st.skelFillGray, { opacity: pulse }]} />
              <Animated.View style={[st.skelLine, { width: '70%', height: scale(8), opacity: pulse }]} />
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Breakdown Sections - same shape as collapsed st.breakdownCard */}
      {[1, 2, 3].map(i => (
        <View key={i} style={st.breakdownCard}>
          <Animated.View style={[st.breakdownAccent, st.skelFillGray, { opacity: pulse }]} />
          <View style={st.accordionHeader}>
            <Animated.View style={[st.breakdownHeaderIcon, st.skelFillGray, { opacity: pulse }]} />
            <Animated.View style={[st.skelLine, { flex: 1, opacity: pulse }]} />
            <Animated.View style={[st.skelLine, { width: scale(50), opacity: pulse }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function KhatabookScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [menuVisible, setMenuVisible] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const toggleSection = (idx) => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }));

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
    if (!selectedRestaurantId) { setLoading(false); return; }
    try {
      setLoading(true);
      // Backend only filters on startDate/endDate, not a period-in-days param.
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - selectedPeriod);
      const res = await api.get(
        `/owner/finance-reports?restaurantId=${selectedRestaurantId}&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}`
      );
      if (res.data.ok) setData(res.data.data);
    } catch (e) {
      console.error('Error loading khatabook:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedPeriod]);

  useEffect(() => {
    loadData();
  }, [selectedRestaurantId, selectedPeriod, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const netRevenue = data?.summary?.netBalance ?? ((data?.summary?.totalIncome || 0) - (data?.summary?.totalExpenses || 0));
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
        summaryValue: fmtFull((cb.cashBalance || 0) + (cb.bankBalance || 0)),
        summaryColor: C.info,
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

    if (data.vendors) {
      const vl = data.vendors;
      sections.push({
        title: 'Vendor Ledger',
        icon: 'people',
        gradient: ['#A78BFA', '#7C3AED'],
        summaryValue: fmtFull(vl.totalDue),
        summaryColor: C.danger,
        rows: [
          { label: 'Total Due', value: fmtFull(vl.totalDue), icon: 'alert-circle', color: C.danger },
          { label: 'Purchases', value: fmtFull(vl.totalPurchases), icon: 'cart', color: C.warning },
          { label: 'Payments', value: fmtFull(vl.totalPayments), icon: 'checkmark-circle', color: C.success },
          { label: 'Vendors', value: String(vl.vendorCount || 0), icon: 'people', color: C.info },
        ].filter(r => r.value !== '₹0' && r.value !== '0'),
      });
    }

    if (data.salary) {
      const ss = data.salary;
      sections.push({
        title: 'Staff Salary',
        icon: 'briefcase',
        gradient: ['#F472B6', '#EC4899'],
        summaryValue: fmtFull(ss.totalPayable),
        summaryColor: C.warning,
        rows: [
          { label: 'Payable', value: fmtFull(ss.totalPayable), icon: 'time', color: C.warning },
          { label: 'Paid', value: fmtFull(ss.totalPaid), icon: 'checkmark-circle', color: C.success },
          { label: 'Pending', value: fmtFull(ss.pending), icon: 'alert-circle', color: C.danger },
        ].filter(r => r.value !== '₹0'),
      });
    }

    if (data.expenses?.byCategory && data.expenses.byCategory.length > 0) {
      const maxCategoryTotal = Math.max(...data.expenses.byCategory.map(cat => cat.total || cat.amount || 0), 1);
      const categoryTotalSum = data.expenses.byCategory.reduce((sum, cat) => sum + (cat.total || cat.amount || 0), 0);
      sections.push({
        title: 'Expense Categories',
        icon: 'pie-chart',
        gradient: ['#FBBF24', '#F59E0B'],
        summaryValue: fmtFull(categoryTotalSum),
        summaryColor: C.warning,
        isBarChart: true,
        rows: data.expenses.byCategory.map(cat => ({
          label: cat.category || cat.name || 'Other',
          value: fmtFull(cat.total || cat.amount),
          barPct: Math.max(4, Math.round(((cat.total || cat.amount || 0) / maxCategoryTotal) * 100)),
          color: C.warning,
        })),
      });
    }

    return sections;
  }, [data]);

  /* ─── LOADING STATE ─── */
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient
          colors={[C.gradient1, C.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[st.heroSection, { paddingTop: insets.top + scale(8) }]}
        >
          <View style={st.heroBlobA} pointerEvents="none" />
          <View style={st.heroBlobB} pointerEvents="none" />
          <View style={st.heroContent}>
            <TouchableOpacity style={[st.heroIconBtn, { marginRight: scale(10) }]} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(16)} color="#fff" />
            </TouchableOpacity>
            <View style={st.heroTextContainer}>
              <Text style={st.heroTitle}>Khatabook</Text>
              <RestaurantSelectorCompact dark style={st.heroRestaurantPill} />
            </View>
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}>
          <SkeletonLoader pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  /* ─── MAIN RENDER ─── */
  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* ═══ Premium Gradient Hero Header ═══ */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.heroSection, { paddingTop: insets.top + scale(8) }]}
      >
        <View style={st.heroBlobA} pointerEvents="none" />
        <View style={st.heroBlobB} pointerEvents="none" />
        <View style={st.heroContent}>
          <TouchableOpacity style={[st.heroIconBtn, { marginRight: scale(10) }]} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(16)} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>Khatabook</Text>
            <RestaurantSelectorCompact dark style={st.heroRestaurantPill} />
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity
              onPress={onRefresh}
              style={[st.heroIconBtn, refreshing && { opacity: 0.5 }]}
              disabled={refreshing}
            >
              <Icon name="refresh" size={scale(16)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* ═══ Scrollable Content ═══ */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}
      >
        {/* ─── Money Card: period tabs + Net Revenue + stats (same system as Home/Analytics) ─── */}
        <View style={{ paddingHorizontal: scale(16), paddingTop: scale(14) }}>
          <LinearGradient colors={[C.ink, '#2E3470']} style={st.moneyCard}>
            <View style={st.moneyTabRow}>
              {PERIOD_TABS.map(tab => {
                const isActive = selectedPeriod === tab.key;
                return (
                  <TouchableOpacity
                    key={tab.key}
                    style={[st.moneyTab, isActive && st.moneyTabOn]}
                    onPress={() => setSelectedPeriod(tab.key)}
                    activeOpacity={0.7}
                  >
                    <Text style={[st.moneyTabTxt, isActive && st.moneyTabTxtOn]}>{tab.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <Text style={st.moneyLabel}>NET REVENUE · {selectedPeriod} DAYS</Text>
            <Text style={st.moneyValue}>{fmtFull(Math.abs(netRevenue))}</Text>
            <View style={st.moneyTrendRow}>
              <Icon name={isProfit ? 'trending-up' : 'trending-down'} size={scale(13)} color={isProfit ? '#6EE7B7' : '#FCA5A5'} />
              <Text style={[st.moneyTrendTxt, { color: isProfit ? '#6EE7B7' : '#FCA5A5' }]}>
                {isProfit ? 'Profit' : 'Loss'} for {selectedPeriod} days
              </Text>
            </View>

            <View style={st.moneyStatsRow}>
              <View style={st.moneyStat}>
                <Text style={st.moneyStatLabel}>EXPENSES</Text>
                <Text style={st.moneyStatValue} numberOfLines={1}>{fmt(data?.summary?.totalExpenses)}</Text>
              </View>
              <View style={st.moneyStat}>
                <Text style={st.moneyStatLabel}>DUES</Text>
                <Text style={st.moneyStatValue} numberOfLines={1}>{fmt(data?.vendors?.totalDue)}</Text>
              </View>
              <View style={st.moneyStat}>
                <Text style={st.moneyStatLabel}>BALANCE</Text>
                <Text style={st.moneyStatValue} numberOfLines={1}>{fmt(data?.cashbook?.cashBalance)}</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* ─── Quick Actions ─── */}
        <View style={st.sectionHeader}>
          <Text style={st.sectionTitle}>Quick Actions</Text>
        </View>
        <View style={st.actionsStrip}>
          {QUICK_ACTIONS.map((action, i) => (
            <React.Fragment key={action.key}>
              {i > 0 && <View style={st.actionsDivider} />}
              <TouchableOpacity
                style={st.actionStripItem}
                onPress={() => navigation.navigate(action.key)}
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={action.gradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={st.actionStripIcon}
                >
                  <Icon name={action.icon} size={scale(16)} color="#fff" />
                </LinearGradient>
                <Text style={st.actionStripLabel} numberOfLines={1}>{action.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>

        {/* ─── Breakdown Sections (collapsible accordion) ─── */}
        {breakdownSections.map((section, idx) => {
          const isExpanded = !!expandedSections[idx];
          return (
          <View key={idx} style={st.breakdownCard}>
            <LinearGradient
              colors={section.gradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.breakdownAccent}
            />
            <TouchableOpacity
              style={st.accordionHeader}
              onPress={() => toggleSection(idx)}
              activeOpacity={0.7}
            >
              <LinearGradient colors={section.gradient} style={st.breakdownHeaderIcon}>
                <Icon name={section.icon} size={scale(16)} color="#fff" />
              </LinearGradient>
              <Text style={st.breakdownHeaderTitle}>{section.title}</Text>
              <Text style={[st.accordionSummaryValue, { color: section.summaryColor }]} numberOfLines={1}>
                {section.summaryValue}
              </Text>
              <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={scale(16)} color={C.muted} />
            </TouchableOpacity>

            {isExpanded && (
              <View style={st.breakdownBody}>
                {section.isBarChart ? (
                  section.rows.map((row, ri) => (
                    <View key={ri} style={ri > 0 ? { marginTop: scale(12) } : null}>
                      <View style={st.categoryBarRow}>
                        <Text style={st.categoryBarLabel}>{row.label}</Text>
                        <Text style={st.categoryBarValue}>{row.value}</Text>
                      </View>
                      <View style={st.categoryBarTrack}>
                        <View style={[st.categoryBarFill, { width: `${row.barPct}%`, backgroundColor: row.color }]} />
                      </View>
                    </View>
                  ))
                ) : (
                  section.rows.map((row, ri) => (
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
                  ))
                )}
              </View>
            )}
          </View>
          );
        })}

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
    paddingTop: scale(6),
    paddingBottom: scale(10),
    borderBottomLeftRadius: scale(16),
    borderBottomRightRadius: scale(16),
    overflow: 'hidden',
  },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    marginBottom: scale(8),
  },
  backBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  heroTextContainer: { flex: 1 },
  heroTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroRestaurantPill: {
    alignSelf: 'flex-start',
    marginTop: scale(4),
  },
  heroActions: {
    flexDirection: 'row',
    gap: scale(6),
  },
  heroIconBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ═══ Money Card (Net Revenue + period tabs, same system as Home/Analytics) ═══
  moneyCard: {
    borderRadius: scale(18),
    padding: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.18,
    shadowRadius: scale(14),
    elevation: 6,
  },
  moneyTabRow: { flexDirection: 'row', gap: scale(6), marginBottom: scale(4) },
  moneyTab: {
    flex: 1,
    paddingVertical: scale(7),
    borderRadius: scale(9),
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
  },
  moneyTabOn: { backgroundColor: '#fff' },
  moneyTabTxt: { fontSize: moderateScale(10.5), fontWeight: '700', color: 'rgba(255,255,255,0.65)' },
  moneyTabTxtOn: { color: C.ink },
  moneyLabel: { fontSize: moderateScale(11), color: 'rgba(255,255,255,0.6)', fontWeight: '700', letterSpacing: 0.4, marginTop: scale(10) },
  moneyValue: { fontSize: moderateScale(24), fontWeight: '900', color: '#fff', marginTop: scale(2) },
  moneyTrendRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), marginTop: scale(4) },
  moneyTrendTxt: { fontSize: moderateScale(11.5), fontWeight: '700' },
  moneyStatsRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(14) },
  moneyStat: { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: scale(10), padding: scale(9) },
  moneyStatLabel: { fontSize: moderateScale(9), color: 'rgba(255,255,255,0.6)', fontWeight: '700' },
  moneyStatValue: { fontSize: moderateScale(13.5), color: '#fff', fontWeight: '800', marginTop: scale(3) },

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
  // ═══ Quick Actions (compact strip) ═══
  actionsStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(16),
    backgroundColor: C.card,
    borderRadius: scale(14),
    paddingVertical: scale(10),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(1) },
    shadowOpacity: 0.05,
    shadowRadius: scale(4),
    elevation: 1,
  },
  actionsDivider: {
    width: 1,
    height: scale(30),
    backgroundColor: C.border,
  },
  actionStripItem: {
    flex: 1,
    alignItems: 'center',
    gap: scale(5),
  },
  actionStripIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionStripLabel: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // ═══ Breakdown Card (collapsible accordion) ═══
  breakdownCard: {
    marginHorizontal: scale(16),
    marginTop: scale(12),
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
    paddingTop: 0,
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(14),
  },
  breakdownHeaderIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  breakdownHeaderTitle: {
    flex: 1,
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  accordionSummaryValue: {
    fontSize: moderateScale(13),
    fontWeight: '800',
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

  // ═══ Category Bar Ranking ═══
  categoryBarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(6),
  },
  categoryBarLabel: { fontSize: moderateScale(13), fontWeight: '600', color: C.text },
  categoryBarValue: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },
  categoryBarTrack: { height: scale(6), backgroundColor: C.bg, borderRadius: scale(3) },
  categoryBarFill: { height: '100%', borderRadius: scale(3) },

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
  skelFillGray: { backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(12), borderRadius: scale(6), backgroundColor: '#E2E8F0' },
  skelLineOnDark: { height: scale(12), borderRadius: scale(6), backgroundColor: 'rgba(255,255,255,0.18)' },
});
