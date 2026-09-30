/**
 * ============================================================================
 * EXPENSES SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, StatusBar, useWindowDimensions, Platform, Animated,
} from 'react-native';
import Share from 'react-native-share';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, downloadAuthenticatedFile } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorCompact } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { isStale, markFetched } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
// Premium Color Palette
const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#F59E0B',
  gradient2: '#D97706',
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

// Categories with colors and icons
const CATEGORIES = [
  { value: 'RENT', label: 'Rent', icon: 'home', color: '#EF4444', bg: '#FEE2E2' },
  { value: 'UTILITIES', label: 'Utilities', icon: 'flash', color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'FOOD', label: 'Groceries', icon: 'cart', color: '#10B981', bg: '#D1FAE5' },
  { value: 'SALARIES', label: 'Staff Salary', icon: 'people', color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'SUPPLIES', label: 'Equipment', icon: 'cube', color: '#06B6D4', bg: '#CFFAFE' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: 'construct', color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'MARKETING', label: 'Marketing', icon: 'megaphone', color: '#EC4899', bg: '#FCE7F3' },
  { value: 'TRANSPORT', label: 'Transport', icon: 'car', color: '#6366F1', bg: '#E0E7FF' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280', bg: '#F3F4F6' },
];

const getCategoryConfig = (value) => CATEGORIES.find(c => c.value === value) || CATEGORIES[8];

const formatPrice = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${Number(amount).toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

function SkeletonExpenses({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(10) }}>
      <Animated.View style={[st.skelSummary, { opacity: pulse }]} />
      <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(14) }}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelChip, { opacity: pulse }]} />
        ))}
      </View>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={st.skelCard}>
          <View style={st.cardRow}>
            <Animated.View style={[st.skelIcon, { opacity: pulse }]} />
            <View style={st.cardInfo}>
              <Animated.View style={[st.skelLineWide, { opacity: pulse }]} />
              <Animated.View style={[st.skelLineNarrow, { opacity: pulse }]} />
            </View>
            <Animated.View style={[st.skelAmount, { opacity: pulse }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function ExpensesScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const { can } = usePermissions();
  const gridColumns = isTablet ? 2 : 1;

  const {
    restaurants, selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading, loadRestaurants, hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [page, setPage] = useState(1);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [downloadingReceiptId, setDownloadingReceiptId] = useState(null);

  // Calculate summary
  const summary = useMemo(() => {
    const total = expenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
    return { total, count: expenses.length };
  }, [expenses]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts = { all: expenses.length };
    expenses.forEach(exp => {
      counts[exp.category] = (counts[exp.category] || 0) + 1;
    });
    return counts;
  }, [expenses]);

  // Filter expenses
  const filtered = useMemo(() => {
    if (selectedCategory === 'all') return expenses;
    return expenses.filter(exp => exp.category === selectedCategory);
  }, [expenses, selectedCategory]);

  useFocusEffect(useCallback(() => {
    const key = `Expenses-${selectedRestaurant}`;
    // A stale-cache "hit" only means "don't bother refetching" - it says nothing
    // about whether THIS component instance actually has data to show. A fresh
    // mount within the cache TTL (e.g. after a JS reload, or quick nav away/back)
    // starts with an empty expenses array and would otherwise be stuck showing
    // the loading spinner forever since loadData() (which clears it) never runs.
    if (isStale(key) || expenses.length === 0) { loadData(); markFetched(key); }
  }, [selectedRestaurant, expenses.length]));

  const loadData = async (pageNum = 1, append = false) => {
    if (!selectedRestaurant) { setLoading(false); return; }
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const params = new URLSearchParams({ restaurantId: selectedRestaurant, page: pageNum.toString(), pageSize: '20' });
      const response = await api.get(`/owner/expenses?${params}`);
      if (response.data.ok) {
        const items = response.data.data?.expenses || response.data.data?.items || [];
        const total = response.data.data?.total || 0;
        if (append) {
          setExpenses(prev => {
            const ids = new Set(prev.map(i => i.id));
            return [...prev, ...items.filter(i => !ids.has(i.id))];
          });
        } else {
          setExpenses(items);
        }
        setPage(pageNum);
        setHasMore(pageNum * 20 < total);
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1, true);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#EF3A3A" /></View>;
  };

  const onRefresh = async () => { setRefreshing(true); setPage(1); setHasMore(true); await loadRestaurants({ force: true }); await loadData(1, false); markFetched(`Expenses-${selectedRestaurant}`); };

  const openForm = (item = null) => {
    navigation.navigate('AddExpense', { restaurantId: selectedRestaurant, expense: item });
  };

  const downloadReceipt = async (item) => {
    if (downloadingReceiptId) return;
    setDownloadingReceiptId(item.id);
    try {
      const path = await downloadAuthenticatedFile(`/owner/expenses/${item.id}/receipt`, `expense-receipt-${item.id}.pdf`);
      await Share.open({
        url: Platform.OS === 'ios' ? path : `file://${path}`,
        title: 'Expense Receipt',
        type: 'application/pdf',
        failOnCancel: false,
      });
    } catch (error) {
      console.error('Download receipt error:', error);
      AppAlert.alert('Error', 'Failed to generate receipt');
    } finally {
      setDownloadingReceiptId(null);
    }
  };

  const deleteExpense = (item) => {
    AppAlert.alert('Delete Expense', 'Are you sure you want to delete this expense?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/expenses/${item.id}`);
            AppAlert.alert('Success', 'Expense deleted');
            loadData();
          } catch (error) {
            AppAlert.alert('Error', 'Failed to delete expense');
          }
        }
      }
    ]);
  };

  // ==================== RENDER EXPENSE CARD ====================
  const renderExpenseCard = ({ item, index }) => {
    const cat = getCategoryConfig(item.category);
    return (
      <View style={[st.card, isTablet && { marginHorizontal: scale(6) }]}>
        <View style={st.cardRow}>
          {/* Category Icon */}
          <View style={[st.categoryIcon, { backgroundColor: cat.bg }]}>
            <Icon name={cat.icon} size={scale(15)} color={cat.color} />
          </View>

          {/* Info */}
          <View style={st.cardInfo}>
            <Text style={st.cardTitle}>{cat.label}</Text>
            {item.description && <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>}
            <View style={st.cardMeta}>
              <Icon name="calendar-outline" size={scale(10)} color={C.muted} />
              <Text style={st.cardDate}>{formatDate(item.expenseDate)}</Text>
            </View>
          </View>

          {/* Amount */}
          <View style={st.amountBox}>
            <Text style={[st.amountText, { color: cat.color }]}>{formatPrice(item.amount)}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={[st.actionIconBtn, { backgroundColor: C.warningLight }]}
            onPress={() => downloadReceipt(item)}
            disabled={downloadingReceiptId === item.id}
          >
            {downloadingReceiptId === item.id ? (
              <ActivityIndicator size="small" color={C.warning} />
            ) : (
              <Icon name="document-text-outline" size={scale(13)} color={C.warning} />
            )}
          </TouchableOpacity>
          {can('expenses:update') && (
          <TouchableOpacity style={[st.actionIconBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(item)}>
            <Icon name="pencil" size={scale(13)} color={C.info} />
          </TouchableOpacity>
          )}
          {can('expenses:delete') && (
          <TouchableOpacity style={[st.actionIconBtn, { backgroundColor: C.dangerLight }]} onPress={() => deleteExpense(item)}>
            <Icon name="trash" size={scale(13)} color={C.danger} />
          </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ==================== HEADER COMPONENT ====================
  const renderHeader = () => (
    <>
      {/* Summary Card */}
      {summary.total > 0 && (
        <View style={st.summaryCard}>
          <View style={st.summaryRow}>
            <View style={st.summaryLeft}>
              <Icon name="wallet" size={scale(18)} color="#fff" />
              <Text style={st.summaryLabel}>Total Expenses</Text>
            </View>
            <TouchableOpacity
              style={st.reportsBtn}
              onPress={() => navigation.navigate('ExpenseReports')}
            >
              <Icon name="bar-chart" size={scale(13)} color={C.warning} />
              <Text style={st.reportsBtnText}>Reports</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.summaryValue}>{formatPrice(summary.total)}</Text>
          <Text style={st.summaryCount}>{summary.count} expense{summary.count !== 1 ? 's' : ''} recorded</Text>
        </View>
      )}

      {/* Category Filter */}
      <View style={st.filterSection}>
        <FlatList
          horizontal
          data={[{ value: 'all', label: 'All', icon: 'grid', color: C.ink, bg: C.bg }, ...CATEGORIES]}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScroll}
          renderItem={({ item: cat }) => {
            const isActive = selectedCategory === cat.value;
            const count = categoryCounts[cat.value] || 0;
            return (
              <TouchableOpacity
                style={[st.filterChip, isActive && { backgroundColor: cat.color, borderColor: cat.color }]}
                onPress={() => setSelectedCategory(isActive && cat.value !== 'all' ? 'all' : cat.value)}
              >
                <Icon name={cat.icon} size={scale(13)} color={isActive ? '#fff' : cat.color} />
                <Text style={[st.filterChipText, isActive && { color: '#fff' }]}>
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(9) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Expenses</Text>
            <Text style={st.headerSubtitle}>Track your spending</Text>
          </View>
          <View style={st.headerActions} />
        </LinearGradient>
        <SkeletonExpenses pulse={pulse} />
        <KniBottomNav navigation={navigation} active="khatabook" />
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT STATE ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(9) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Expenses</Text>
            <Text style={st.headerSubtitle}>Track your spending</Text>
          </View>
          <View style={st.headerActions} />
        </LinearGradient>
        <View style={st.emptyState}>
          <View style={st.emptyIcon}>
            <Icon name="restaurant-outline" size={scale(64)} color={C.muted} />
          </View>
          <Text style={st.emptyTitle}>No Restaurant Found</Text>
          <Text style={st.emptySubtitle}>Please add a restaurant first</Text>
        </View>
        <KniBottomNav navigation={navigation} active="khatabook" />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />

      {/* Gradient Header */}
      <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(9) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Expenses</Text>
          <RestaurantSelectorCompact dark style={st.headerRestaurantPill} />
        </View>
        <View style={st.headerActions}>
          {can('expenses:create') && (
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="add" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Fixed Summary, Restaurant Selector & Filters */}
      {renderHeader()}

      {/* Expense List - Only this scrolls */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderExpenseCard}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={gridColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.warning]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderFooter}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Icon name="receipt-outline" size={scale(64)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>No Expenses Yet</Text>
            <Text style={st.emptySubtitle}>Track your expenses to manage finances</Text>
            {can('expenses:create') && (
            <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={scale(18)} color="#fff" />
              <Text style={st.emptyBtnText}>Add Expense</Text>
            </TouchableOpacity>
            )}
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="khatabook" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header Section
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingBottom: scale(9), overflow: 'hidden' },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  headerBackBtn: { width: scale(34), height: scale(34), borderRadius: scale(11), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  backBtnPlain: { width: scale(22), height: scale(32), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerTitle: { fontSize: moderateScale(17), fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  headerRestaurantPill: { alignSelf: 'flex-start', marginTop: scale(4) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(34), height: scale(34), borderRadius: scale(11), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Hero Section (kept for modal header)
  heroSection: { paddingTop: scale(8), paddingBottom: scale(16), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  heroActions: { flexDirection: 'row' },
  heroIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Summary Card
  summaryCard: { backgroundColor: C.warning, marginHorizontal: scale(16), marginTop: scale(10), padding: scale(14), borderRadius: scale(14) },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(4) },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  summaryLabel: { fontSize: moderateScale(12.5), color: '#fff', fontWeight: '600' },
  reportsBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(10), paddingVertical: scale(5), backgroundColor: '#fff', borderRadius: scale(16) },
  reportsBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: C.warning },
  summaryValue: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff' },
  summaryCount: { fontSize: moderateScale(11.5), color: 'rgba(255,255,255,0.85)', marginTop: scale(2) },

  // Filters
  filterSection: { paddingVertical: scale(7), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, marginTop: scale(8) },
  filterScroll: { paddingHorizontal: scale(16) },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: scale(5), paddingHorizontal: scale(10), paddingVertical: scale(6), marginRight: scale(6), backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: moderateScale(11.5), fontWeight: '600', color: C.ink },

  // List
  listContent: { paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: scale(12), marginBottom: scale(8), shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.08, shadowRadius: scale(5), elevation: 3, overflow: 'hidden', padding: scale(9) },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  categoryIcon: { width: scale(32), height: scale(32), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: moderateScale(12.5), fontWeight: '700', color: C.ink },
  cardDesc: { fontSize: moderateScale(10), color: C.text, marginTop: scale(2) },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(3), marginTop: scale(3) },
  cardDate: { fontSize: moderateScale(9), color: C.muted },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: moderateScale(13.5), fontWeight: '800' },
  cardActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: scale(6), marginTop: scale(7), paddingTop: scale(7), borderTopWidth: 1, borderTopColor: C.border },
  actionIconBtn: { width: scale(28), height: scale(28), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },

  // Loading & Empty
  loadingHero: { paddingVertical: scale(24), paddingHorizontal: scale(20), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },

  // Skeleton
  skelSummary: { height: scale(78), backgroundColor: '#E2E8F0', borderRadius: scale(14) },
  skelChip: { flex: 1, height: scale(28), backgroundColor: '#E2E8F0', borderRadius: scale(16) },
  skelCard: { backgroundColor: C.card, borderRadius: scale(12), marginTop: scale(10), padding: scale(9) },
  skelIcon: { width: scale(32), height: scale(32), borderRadius: scale(10), backgroundColor: '#E2E8F0' },
  skelLineWide: { height: scale(12), width: '55%', backgroundColor: '#E2E8F0', borderRadius: scale(6), marginBottom: scale(6) },
  skelLineNarrow: { height: scale(10), width: '35%', backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelAmount: { width: scale(50), height: scale(14), backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.warning, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

});
