/**
 * ============================================================================
 * DAILY CASHBOOK SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Animated, Modal, TextInput, ScrollView, StatusBar,
  useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import AppAlert from '../utils/AppAlert';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
// Premium Color Palette
const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#6366F1',
  gradient2: '#4F46E5',
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

const ENTRY_TYPES = [
  { value: 'CASH_IN', label: 'Cash In', icon: 'arrow-down-circle', color: C.success, bg: C.successLight },
  { value: 'CASH_OUT', label: 'Cash Out', icon: 'arrow-up-circle', color: C.danger, bg: C.dangerLight },
  { value: 'BANK_IN', label: 'Bank In', icon: 'arrow-down-circle', color: C.info, bg: C.infoLight },
  { value: 'BANK_OUT', label: 'Bank Out', icon: 'arrow-up-circle', color: C.warning, bg: C.warningLight },
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash', icon: 'cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'swap-horizontal' },
  { value: 'UPI', label: 'UPI', icon: 'phone-portrait' },
  { value: 'CHEQUE', label: 'Cheque', icon: 'document-text' },
  { value: 'CARD', label: 'Card', icon: 'card' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

const EXPENSE_CATEGORIES = [
  'Groceries', 'Utilities', 'Rent', 'Salaries', 'Equipment', 'Marketing', 'Transport', 'Other'
];

const formatPrice = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const getEntryConfig = (entryType) => ENTRY_TYPES.find(t => t.value === entryType) || ENTRY_TYPES[0];

/* ─── Skeleton ─── */
function SkeletonCashbook({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
      <Animated.View style={[st.skelBalanceStrip, { opacity: pulse }]} />
      <View style={{ flexDirection: 'row', gap: scale(8), marginTop: scale(16) }}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelQuickCard, { opacity: pulse }]} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', gap: scale(6), marginTop: scale(16) }}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelChip, { opacity: pulse }]} />
        ))}
      </View>
      {[1, 2, 3].map(i => (
        <Animated.View key={i} style={[st.skelEntryCard, { opacity: pulse }]} />
      ))}
    </View>
  );
}

export default function CashbookScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height: winHeight } = useWindowDimensions();
  const isTablet = width >= 768;
  const { can } = usePermissions();
  const gridColumns = isTablet ? 2 : 1;
  const { keyboardHeight, keyboardCompensation } = useKeyboardCompensation();
  const formScrollRef = useRef(null);

  const {
    restaurants, selectedRestaurantId, loading: restaurantsLoading,
    loadRestaurants, hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const [form, setForm] = useState({
    id: null, entryType: 'CASH_IN', amount: '', paymentMode: 'CASH',
    category: '', description: '', referenceNo: '',
    entryDate: new Date().toISOString().split('T')[0],
  });

  // Calculate counts
  const entryCounts = useMemo(() => {
    const counts = { all: entries.length, CASH_IN: 0, CASH_OUT: 0, BANK_IN: 0, BANK_OUT: 0 };
    entries.forEach(e => { if (counts[e.entryType] !== undefined) counts[e.entryType]++; });
    return counts;
  }, [entries]);

  // Filter entries
  const filteredEntries = useMemo(() => {
    if (filterType === 'all') return entries;
    return entries.filter(e => e.entryType === filterType);
  }, [entries, filterType]);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (!selectedRestaurantId) { setLoading(false); return; }
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const [entriesRes, statsRes] = await Promise.all([
        api.get(`/owner/cashbook?restaurantId=${selectedRestaurantId}&page=${pageNum}&pageSize=20`),
        pageNum === 1 ? api.get(`/owner/cashbook/stats?restaurantId=${selectedRestaurantId}`) : Promise.resolve(null),
      ]);
      if (entriesRes.data.ok) {
        const items = entriesRes.data.data?.items || entriesRes.data.data || [];
        const total = entriesRes.data.data?.total || 0;
        if (append) {
          setEntries(prev => {
            const ids = new Set(prev.map(i => i.id));
            return [...prev, ...items.filter(i => !ids.has(i.id))];
          });
        } else {
          setEntries(items);
        }
        setPage(pageNum);
        setHasMore(pageNum * 20 < total);
      }
      if (statsRes?.data?.ok) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading cashbook:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    loadData();
  }, [selectedRestaurantId, loadData]);

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1, true);
    }
  };

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#EF3A3A" /></View>;
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadRestaurants();
    await loadData(1, false);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setForm(f => ({ ...f, entryDate: dateStr }));
    }
  };

  const openForm = (entryType = null, item = null) => {
    if (item) {
      setForm({
        id: item.id, entryType: item.entryType,
        amount: (item.amount || 0).toString(),
        paymentMode: item.paymentMode || 'CASH',
        category: item.category || '', description: item.description || '',
        referenceNo: item.referenceNo || '',
        entryDate: item.entryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({
        id: null, entryType: entryType || 'CASH_IN', amount: '',
        paymentMode: 'CASH', category: '', description: '', referenceNo: '',
        entryDate: new Date().toISOString().split('T')[0],
      });
    }
    setModalVisible(true);
  };

  const saveEntry = async () => {
    if (!form.amount || !form.description) {
      AppAlert.alert('Error', 'Amount and description are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        entryType: form.entryType, amount: parseFloat(form.amount),
        paymentMode: form.paymentMode, description: form.description,
        entryDate: form.entryDate,
      };
      if (!form.id) payload.restaurantId = selectedRestaurantId;
      if (form.category) payload.category = form.category;
      if (form.referenceNo) payload.referenceNo = form.referenceNo;

      if (form.id) {
        await api.patch(`/owner/cashbook/${form.id}`, payload);
        AppAlert.alert('Success', 'Entry updated');
      } else {
        await api.post('/owner/cashbook', payload);
        AppAlert.alert('Success', 'Entry added');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (item) => {
    AppAlert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/cashbook/${item.id}`);
            AppAlert.alert('Success', 'Entry deleted');
            loadData();
          } catch (error) {
            AppAlert.alert('Error', 'Failed to delete');
          }
        },
      },
    ]);
  };

  // ==================== RENDER ENTRY CARD ====================
  const renderEntryCard = ({ item, index }) => {
    const config = getEntryConfig(item.entryType);
    const isIncome = item.entryType.includes('IN');

    return (
      <View style={[st.card, isTablet && { marginHorizontal: scale(6) }]}>
        <View style={st.cardRow}>
          <View style={[st.entryIcon, { backgroundColor: config.bg }]}>
            <Icon name={config.icon} size={scale(24)} color={config.color} />
          </View>
          <View style={st.cardInfo}>
            <Text style={st.cardTitle} numberOfLines={1}>{item.description}</Text>
            <View style={st.cardMeta}>
              <View style={[st.typeBadge, { backgroundColor: config.bg }]}>
                <Text style={[st.typeBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
              {item.category && (
                <View style={st.categoryBadge}>
                  <Text style={st.categoryBadgeText}>{item.category}</Text>
                </View>
              )}
            </View>
            <View style={st.cardMetaRow}>
              <Icon name="calendar-outline" size={scale(12)} color={C.muted} />
              <Text style={st.cardMetaText}>{formatDate(item.entryDate)}</Text>
              <Text style={st.cardMetaDot}>•</Text>
              <Text style={st.cardMetaText}>{item.paymentMode?.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={[st.cardAmount, { color: isIncome ? C.success : C.danger }]}>
            {isIncome ? '+' : '-'}{formatPrice(item.amount)}
          </Text>
        </View>
        {(can('cashbook:update') || can('cashbook:delete')) && (
        <View style={st.cardActions}>
          {can('cashbook:update') && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(null, item)}>
            <Icon name="pencil" size={scale(16)} color={C.info} />
            <Text style={[st.actionText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          )}
          {can('cashbook:delete') && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.dangerLight }]} onPress={() => deleteEntry(item)}>
            <Icon name="trash" size={scale(16)} color={C.danger} />
            <Text style={[st.actionText, { color: C.danger }]}>Delete</Text>
          </TouchableOpacity>
          )}
        </View>
        )}
      </View>
    );
  };

  // Filter chips row -- extracted so the sticky overlay copy (rendered once
  // scroll passes the inline copy's position) can reuse the exact same JSX.
  // minWidth forces the row to span the full screen width; combined with
  // justifyContent:'space-between' that spreads the chips evenly across it
  // on wider screens (no dead space), while on narrow screens where the
  // chips' natural width already exceeds the screen, minWidth/space-between
  // become moot and it just scrolls normally -- responsive either way.
  const renderFilterBar = () => (
    <FlatList
      horizontal
      data={[{ value: 'all', label: 'All', icon: 'grid', color: C.ink }, ...ENTRY_TYPES]}
      keyExtractor={(item) => item.value}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={[st.filterScroll, { minWidth: width - scale(24) }]}
      renderItem={({ item: filter }) => {
        const isActive = filterType === filter.value;
        const count = entryCounts[filter.value] || 0;
        return (
          <TouchableOpacity
            style={[st.filterChip, isActive && { backgroundColor: filter.color || C.gradient1, borderColor: filter.color || C.gradient1 }]}
            onPress={() => setFilterType(filter.value)}
          >
            <Icon name={filter.icon} size={scale(12)} color={isActive ? '#fff' : filter.color || C.ink} />
            <Text style={[st.filterChipText, isActive && { color: '#fff' }]} numberOfLines={1}>
              {filter.label} ({count})
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Balance Strip -- one compact non-scrolling row of 3 tiles instead
          of 3 wide horizontally-scrolling gradient cards. */}
      {stats && (
        <View style={st.balanceStrip}>
          {[
            { key: 'cash', icon: 'wallet', color: C.success, label: 'Cash', value: stats.cashBalance },
            { key: 'bank', icon: 'business', color: C.info, label: 'Bank', value: stats.bankBalance },
            { key: 'total', icon: 'cash', color: C.gradient1, label: 'Total', value: stats.totalBalance },
          ].map((t, i) => (
            <React.Fragment key={t.key}>
              {i > 0 && <View style={st.balanceDivider} />}
              <View style={st.balanceTile}>
                <View style={[st.balanceTileIcon, { backgroundColor: t.color + '20' }]}>
                  <Icon name={t.icon} size={scale(14)} color={t.color} />
                </View>
                <Text style={st.balanceTileValue} numberOfLines={1} adjustsFontSizeToFit>
                  {formatPrice(t.value)}
                </Text>
                <Text style={st.balanceTileLabel} numberOfLines={1}>{t.label} Balance</Text>
              </View>
            </React.Fragment>
          ))}
        </View>
      )}

      {/* Quick Actions - Premium Grid Design */}
      {can('cashbook:create') && (
      <View style={st.quickSection}>
        <View style={st.quickTitleRow}>
          <Icon name="flash" size={scale(18)} color={C.warning} />
          <Text style={st.quickTitle}>Quick Add</Text>
        </View>
        <View style={st.quickGrid}>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('CASH_IN')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.success, '#059669']} style={st.quickCardGradient}>
              <Icon name="arrow-down-circle" size={scale(28)} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Cash In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('CASH_OUT')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.danger, '#DC2626']} style={st.quickCardGradient}>
              <Icon name="arrow-up-circle" size={scale(28)} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Cash Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('BANK_IN')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.info, '#2563EB']} style={st.quickCardGradient}>
              <Icon name="arrow-down-circle" size={scale(28)} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Bank In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('BANK_OUT')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.warning, '#D97706']} style={st.quickCardGradient}>
              <Icon name="arrow-up-circle" size={scale(28)} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Bank Out</Text>
          </TouchableOpacity>
        </View>
      </View>
      )}

      {/* Filter Chips + Results -- on phone these are injected as sticky
          data-array items instead (see listItems/renderListItem below), so
          native stickyHeaderIndices can make just the filter row stick.
          numColumns>1 (tablet) can't mix with stickyHeaderIndices cleanly,
          so it keeps the old always-inline behavior here. */}
      {gridColumns > 1 && (
        <>
          <View style={st.filterSection}>
            {renderFilterBar()}
          </View>
          <View style={st.resultsHeader}>
            <Text style={st.resultsTitle}>{filteredEntries.length} Entr{filteredEntries.length !== 1 ? 'ies' : 'y'}</Text>
            {filterType !== 'all' && (
              <TouchableOpacity style={st.clearBtn} onPress={() => setFilterType('all')}>
                <Icon name="close-circle" size={scale(14)} color={C.gradient1} />
                <Text style={st.clearBtnText}>Clear</Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </>
  );

  // Empty state, reused both as FlatList's ListEmptyComponent (tablet) and
  // as the 'empty' sentinel row (phone, since listItems is never truly
  // empty there once the sticky-filter/results sentinels are injected).
  const renderEmptyState = () => (
    <View style={st.emptyState}>
      <View style={st.emptyIcon}>
        <Icon name="wallet-outline" size={scale(64)} color={C.muted} />
      </View>
      <Text style={st.emptyTitle}>No Entries Yet</Text>
      <Text style={st.emptySubtitle}>Start tracking your cash and bank transactions</Text>
      {can('cashbook:create') && (
        <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
          <Icon name="add" size={scale(18)} color="#fff" />
          <Text style={st.emptyBtnText}>Add First Entry</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Phone: real data items get a couple of sentinel rows prepended so the
  // filter row can be a genuine, separate FlatList cell -- which is what
  // makes native `stickyHeaderIndices` able to target just that row instead
  // of the whole scrolling header. Tablet (numColumns>1) skips all this
  // since stickyHeaderIndices doesn't reliably combine with numColumns.
  const listItems = useMemo(() => {
    if (gridColumns > 1) return filteredEntries;
    const items = [{ __type: 'sticky-filter' }, { __type: 'results' }];
    if (filteredEntries.length === 0) items.push({ __type: 'empty' });
    else items.push(...filteredEntries);
    return items;
  }, [gridColumns, filteredEntries]);

  const listKeyExtractor = (item) => item.__type || item.id;

  const renderListItem = (info) => {
    const { item } = info;
    if (item.__type === 'sticky-filter') {
      return (
        <View style={st.filterSection}>
          {renderFilterBar()}
        </View>
      );
    }
    if (item.__type === 'results') {
      return (
        <View style={st.resultsHeader}>
          <Text style={st.resultsTitle}>{filteredEntries.length} Entr{filteredEntries.length !== 1 ? 'ies' : 'y'}</Text>
          {filterType !== 'all' && (
            <TouchableOpacity style={st.clearBtn} onPress={() => setFilterType('all')}>
              <Icon name="close-circle" size={scale(14)} color={C.gradient1} />
              <Text style={st.clearBtnText}>Clear</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }
    if (item.__type === 'empty') return renderEmptyState();
    return renderEntryCard(info);
  };

  // ==================== LOADING STATE ====================
  if (loading && !refreshing && entries.length === 0) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
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
            <Text style={st.headerTitle}>Daily Cashbook</Text>
            <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
          </View>
          <View style={st.headerActions} />
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonCashbook pulse={pulse} />
        </ScrollView>
        <KniBottomNav navigation={navigation} active="khatabook" />
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT STATE ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
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
            <Text style={st.headerTitle}>Daily Cashbook</Text>
            <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
          </View>
          <View style={st.headerActions} />
        </LinearGradient>
        <View style={st.emptyState}>
          <View style={st.emptyIcon}>
            <Icon name="business-outline" size={scale(64)} color={C.muted} />
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
      <StatusBar translucent barStyle="light-content" backgroundColor={C.gradient1} />

      {/* Header */}
      <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
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
          <Text style={st.headerTitle}>Daily Cashbook</Text>
          <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
        </View>
        <View style={st.headerActions}>
          {can('cashbook:create') && (
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="add" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Entry List -- on phone, the filter row is a real sentinel item in
          `data` (see listItems above) at index 1 (index 0 is the
          ListHeaderComponent cell), so native stickyHeaderIndices can dock
          just that row to the top: it stays put while scrolling down past
          it, and scrolls away normally as soon as you scroll back up past
          it -- smooth, since it's the platform's own sticky-header
          implementation, not a hand-rolled show/hide on JS scroll events. */}
      <FlatList
        data={listItems}
        keyExtractor={listKeyExtractor}
        renderItem={renderListItem}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={gridColumns === 1 ? [1] : undefined}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={gridColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.gradient1]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={gridColumns > 1 ? renderEmptyState : undefined}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="khatabook" />

      {/* Add/Edit Modal - Fixed Scroll */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
        onShow={() => {
          // Same stale-measurement issue as StaffScreen's modal: nudge the
          // scroll position once the modal has fully shown so the
          // ScrollView remeasures against its final layout.
          requestAnimationFrame(() => {
            formScrollRef.current?.scrollTo({ y: 1, animated: false });
            requestAnimationFrame(() => formScrollRef.current?.scrollTo({ y: 0, animated: false }));
          });
        }}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { height: Math.round(keyboardHeight > 0 ? winHeight - keyboardCompensation - scale(24) : winHeight * 0.85) }]}>
            {/* Modal Header */}
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.modalHeader}>
              <Text style={st.modalTitle}>{form.id ? 'Edit Entry' : 'Add Entry'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Scrollable Form Body */}
            <ScrollView
              ref={formScrollRef}
              style={st.modalBody}
              contentContainerStyle={st.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              {/* Entry Type */}
              <Text style={st.label}>Entry Type *</Text>
              <View style={st.typeRow}>
                {ENTRY_TYPES.map((type) => {
                  const isActive = form.entryType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[st.typeChip, isActive && { backgroundColor: type.color, borderColor: type.color }]}
                      onPress={() => setForm(f => ({ ...f, entryType: type.value }))}
                    >
                      <Icon name={type.icon} size={scale(16)} color={isActive ? '#fff' : type.color} />
                      <Text style={[st.typeChipText, isActive && { color: '#fff' }]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Amount */}
              <Text style={st.label}>Amount (₹) *</Text>
              <View style={st.inputRow}>
                <View style={st.currencyBox}>
                  <Text style={st.currencyText}>₹</Text>
                </View>
                <TextInput
                  style={st.amountInput}
                  placeholder="Enter amount"
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={form.amount}
                  onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                />
              </View>

              {/* Payment Mode */}
              <Text style={st.label}>Payment Mode</Text>
              <View style={st.modeGrid}>
                {PAYMENT_MODES.map((mode) => {
                  const isActive = form.paymentMode === mode.value;
                  return (
                    <TouchableOpacity
                      key={mode.value}
                      style={[st.modeBtn, isActive && st.modeBtnActive]}
                      onPress={() => setForm(f => ({ ...f, paymentMode: mode.value }))}
                    >
                      <Icon name={mode.icon} size={scale(16)} color={isActive ? '#fff' : C.ink} />
                      <Text style={[st.modeBtnText, isActive && st.modeBtnTextActive]}>{mode.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Category */}
              <Text style={st.label}>Category</Text>
              <View style={st.catGrid}>
                <TouchableOpacity
                  style={[st.catBtn, !form.category && st.catBtnActive]}
                  onPress={() => setForm(f => ({ ...f, category: '' }))}
                >
                  <Text style={[st.catBtnText, !form.category && st.catBtnTextActive]}>None</Text>
                </TouchableOpacity>
                {EXPENSE_CATEGORIES.map((cat) => {
                  const isActive = form.category === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[st.catBtn, isActive && st.catBtnActive]}
                      onPress={() => setForm(f => ({ ...f, category: cat }))}
                    >
                      <Text style={[st.catBtnText, isActive && st.catBtnTextActive]}>{cat}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Description */}
              <Text style={st.label}>Description *</Text>
              <TextInput
                style={st.textArea}
                placeholder="e.g., Monthly electricity bill"
                placeholderTextColor={C.muted}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
              />

              {/* Reference Number */}
              <Text style={st.label}>Reference No. (Optional)</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., INV-12345"
                placeholderTextColor={C.muted}
                value={form.referenceNo}
                onChangeText={v => setForm(f => ({ ...f, referenceNo: v }))}
              />

              {/* Date */}
              <Text style={st.label}>Date</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Icon name="calendar" size={scale(20)} color={C.gradient1} />
                <Text style={st.dateBtnText}>{formatDate(form.entryDate)}</Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.entryDate ? new Date(form.entryDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Bottom spacing for scroll */}
              <View style={{ height: scale(20) }} />
            </ScrollView>

            {/* Fixed Footer */}
            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveEntry} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name={form.id ? 'checkmark' : 'add'} size={scale(18)} color="#fff" />
                    <Text style={st.saveBtnText}>{form.id ? 'Update' : 'Add'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header Section
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingBottom: scale(12), overflow: 'hidden' },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  headerBackBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  backBtnPlain: { width: scale(22), height: scale(32), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Hero Section (kept for loading state)
  heroSection: { paddingTop: scale(8), paddingBottom: scale(16), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  heroActions: { flexDirection: 'row' },
  heroIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Balance Section
  // Balance Strip -- one compact non-scrolling row of 3 tiles
  balanceStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    marginHorizontal: scale(12), marginTop: scale(12), marginBottom: scale(4), borderRadius: scale(14),
    paddingVertical: scale(10), paddingHorizontal: scale(2),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05, shadowRadius: scale(6), elevation: 2,
  },
  balanceTile: { flex: 1, alignItems: 'center', paddingHorizontal: scale(2) },
  balanceDivider: { width: 1, height: scale(30), backgroundColor: C.border },
  balanceTileIcon: {
    width: scale(26), height: scale(26), borderRadius: scale(8),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  balanceTileValue: { fontSize: moderateScale(12.5), fontWeight: '800', color: C.ink },
  balanceTileLabel: { fontSize: moderateScale(8.5), color: C.muted, marginTop: scale(1), fontWeight: '500' },

  // Quick Section - Premium Grid
  quickSection: { marginHorizontal: scale(16), marginTop: scale(16), marginBottom: scale(12) },
  quickTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
  quickTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginLeft: scale(8) },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickCard: { width: '23%', alignItems: 'center' },
  quickCardGradient: { width: scale(56), height: scale(56), borderRadius: scale(16), alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: scale(4) }, shadowOpacity: 0.15, shadowRadius: scale(8), elevation: 4 },
  quickCardLabel: { fontSize: moderateScale(11), fontWeight: '600', color: C.text, marginTop: scale(8), textAlign: 'center' },

  // Filters
  filterSection: { paddingVertical: scale(7), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { paddingHorizontal: scale(12), gap: scale(6), justifyContent: 'space-between' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: moderateScale(11.5), fontWeight: '600', color: C.ink, marginLeft: scale(4) },

  // Results
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  resultsTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: '#EEF2FF', borderRadius: scale(8) },
  clearBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.gradient1, marginLeft: scale(4) },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3, padding: scale(16) },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryIcon: { width: scale(48), height: scale(48), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  cardInfo: { flex: 1, marginRight: scale(8) },
  cardTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: scale(6) },
  typeBadge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(6), marginRight: scale(6), marginBottom: scale(4) },
  typeBadgeText: { fontSize: moderateScale(10), fontWeight: '700' },
  categoryBadge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(6), backgroundColor: C.bg, marginBottom: scale(4) },
  categoryBadgeText: { fontSize: moderateScale(10), fontWeight: '600', color: C.muted },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: scale(6) },
  cardMetaText: { fontSize: moderateScale(11), color: C.muted, marginLeft: scale(4) },
  cardMetaDot: { color: C.muted, marginHorizontal: scale(4) },
  cardAmount: { fontSize: moderateScale(16), fontWeight: '800' },
  cardActions: { flexDirection: 'row', marginTop: scale(14), paddingTop: scale(14), borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), borderRadius: scale(10), marginHorizontal: scale(4) },
  actionText: { fontSize: moderateScale(13), fontWeight: '600', marginLeft: scale(6) },

  // Loading & Empty
  loadingHero: { paddingVertical: scale(24), paddingHorizontal: scale(20), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.gradient1, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Modal - Fixed Scroll
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(16), borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },
  modalClose: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: scale(16), paddingBottom: scale(30) },
  modalFooter: { flexDirection: 'row', padding: scale(16), borderTopWidth: 1, borderTopColor: C.border },

  // Form - Compact Layout
  label: { fontSize: moderateScale(12), fontWeight: '700', color: C.text, marginBottom: scale(8), marginTop: scale(14) },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(8), borderRadius: scale(8), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  typeChipText: { fontSize: moderateScale(11), fontWeight: '600', color: C.ink, marginLeft: scale(5) },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(10), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: scale(44), height: scale(44), backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: moderateScale(16), fontWeight: '700', color: C.gradient1 },
  amountInput: { flex: 1, paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  input: { backgroundColor: C.bg, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: moderateScale(13), color: C.text, borderWidth: 1.5, borderColor: C.border },
  textArea: { backgroundColor: C.bg, borderRadius: scale(10), paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: moderateScale(13), color: C.text, borderWidth: 1.5, borderColor: C.border, minHeight: scale(70), textAlignVertical: 'top' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(12), borderRadius: scale(10), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  dateBtnText: { flex: 1, fontSize: moderateScale(13), fontWeight: '600', color: C.ink, marginLeft: scale(8) },
  // Payment Mode Grid
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(8), borderRadius: scale(8), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  modeBtnActive: { backgroundColor: C.gradient1, borderColor: C.gradient1 },
  modeBtnText: { fontSize: moderateScale(11), fontWeight: '600', color: C.ink, marginLeft: scale(5) },
  modeBtnTextActive: { color: '#fff' },
  // Category Grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  catBtn: { paddingHorizontal: scale(10), paddingVertical: scale(7), borderRadius: scale(8), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  catBtnActive: { backgroundColor: C.warning, borderColor: C.warning },
  catBtnText: { fontSize: moderateScale(11), fontWeight: '600', color: C.ink },
  catBtnTextActive: { color: '#fff' },

  // Buttons
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', marginRight: scale(6) },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.gradient1, marginLeft: scale(6) },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // ─── Skeleton ───
  skelBalanceStrip: { height: scale(76), backgroundColor: '#E2E8F0', borderRadius: scale(14) },
  skelQuickCard: { flex: 1, height: scale(80), backgroundColor: '#E2E8F0', borderRadius: scale(16) },
  skelChip: { flex: 1, height: scale(30), backgroundColor: '#E2E8F0', borderRadius: scale(16) },
  skelEntryCard: { height: scale(90), backgroundColor: '#E2E8F0', borderRadius: scale(16), marginTop: scale(12) },
});
