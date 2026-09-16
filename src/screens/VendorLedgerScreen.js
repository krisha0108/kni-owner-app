/**
 * ============================================================================
 * VENDOR LEDGER SCREEN - Premium Redesign (Scroll Fixed)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, ScrollView, StatusBar,
  useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import AppAlert from '../utils/AppAlert';
// Keep original colors - not flashy
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  okLight: '#ECFDF5',
  warn: '#F59E0B',
  warnLight: '#FFFBEB',
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

const ENTRY_TYPES = [
  { value: 'PURCHASE', label: 'Purchase', icon: 'cart', color: C.danger, bg: C.dangerLight },
  { value: 'PAYMENT', label: 'Payment', icon: 'wallet', color: C.ok, bg: C.okLight },
  { value: 'CREDIT_NOTE', label: 'Credit Note', icon: 'document-text', color: C.info, bg: C.infoLight },
  { value: 'DEBIT_NOTE', label: 'Debit Note', icon: 'document', color: C.warn, bg: C.warnLight },
];

const PAYMENT_MODES = [
  { value: 'CASH', label: 'Cash', icon: 'cash' },
  { value: 'BANK_TRANSFER', label: 'Bank Transfer', icon: 'swap-horizontal' },
  { value: 'UPI', label: 'UPI', icon: 'phone-portrait' },
  { value: 'CHEQUE', label: 'Cheque', icon: 'document-text' },
  { value: 'CARD', label: 'Card', icon: 'card' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal' },
];

const getEntryConfig = (type) => ENTRY_TYPES.find(t => t.value === type) || ENTRY_TYPES[0];

const formatPrice = (amount) => {
  const value = Number(amount) || 0;
  return `₹${value.toLocaleString('en-IN')}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function VendorLedgerScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const { can } = usePermissions();

  const { selectedRestaurantId, loading: restaurantsLoading, loadRestaurants, hasRestaurants } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
  const [activeTab, setActiveTab] = useState('summary');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Modal states
  const [entryModal, setEntryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorName: '', vendorPhone: '', vendorGST: '',
    entryType: 'PURCHASE', amount: '', paymentMode: 'CASH',
    description: '', billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '', entryDate: new Date().toISOString().split('T')[0],
  });

  // Date Picker states
  const [showBillDatePicker, setShowBillDatePicker] = useState(false);
  const [showDueDatePicker, setShowDueDatePicker] = useState(false);
  const [showEntryDatePicker, setShowEntryDatePicker] = useState(false);

  // Date picker handlers
  const onBillDateChange = (event, selectedDate) => {
    setShowBillDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm(f => ({ ...f, billDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const onDueDateChange = (event, selectedDate) => {
    setShowDueDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm(f => ({ ...f, dueDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const onEntryDateChange = (event, selectedDate) => {
    setShowEntryDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm(f => ({ ...f, entryDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (!selectedRestaurantId) { setLoading(false); return; }
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const [summaryRes, entriesRes] = await Promise.all([
        pageNum === 1 ? api.get(`/owner/vendor-ledger/summary?restaurantId=${selectedRestaurantId}`) : Promise.resolve(null),
        api.get(`/owner/vendor-ledger?restaurantId=${selectedRestaurantId}&page=${pageNum}&pageSize=20`),
      ]);
      if (summaryRes?.data?.ok) {
        setVendors(summaryRes.data.data.vendors || []);
        setSummary(summaryRes.data.data.summary || { totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
      }
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
    } catch (error) {
      console.error('Error loading vendor ledger:', error);
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
    if (!loadingMore && hasMore && !loading) loadData(page + 1, true);
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

  const openEntryModal = (type = 'PURCHASE', vendor = null) => {
    setForm({
      vendorName: vendor?.vendorName || '',
      vendorPhone: vendor?.vendorPhone || '',
      vendorGST: vendor?.vendorGST || '',
      entryType: type, amount: '', paymentMode: 'CASH',
      description: '', billNumber: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: '', entryDate: new Date().toISOString().split('T')[0],
    });
    setEntryModal(true);
  };

  const saveEntry = async () => {
    if (!form.vendorName.trim()) { AppAlert.alert('Error', 'Vendor name is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { AppAlert.alert('Error', 'Please enter a valid amount'); return; }
    if (!form.description.trim()) { AppAlert.alert('Error', 'Description is required'); return; }

    setSaving(true);
    try {
      const response = await api.post('/owner/vendor-ledger', {
        restaurantId: selectedRestaurantId,
        vendorName: form.vendorName.trim(),
        vendorPhone: form.vendorPhone.trim() || undefined,
        vendorGST: form.vendorGST.trim() || undefined,
        entryType: form.entryType,
        amount: parseFloat(form.amount),
        paymentMode: (form.entryType === 'PAYMENT' && form.paymentMode) || undefined,
        description: form.description.trim(),
        billNumber: form.billNumber.trim() || undefined,
        billDate: form.billDate || undefined,
        dueDate: form.dueDate || undefined,
        entryDate: form.entryDate,
      });
      if (response.data.ok) {
        AppAlert.alert('Success', 'Entry added successfully');
        setEntryModal(false);
        loadData();
      } else {
        AppAlert.alert('Error', response.data.error || 'Failed to add entry');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER VENDOR CARD ====================
  const renderVendorCard = ({ item }) => (
    <View style={[st.vendorCard, isTablet && { marginHorizontal: scale(6) }]}>
      <View style={st.vendorHeader}>
        <View style={st.vendorIconBox}>
          <Icon name="business" size={scale(22)} color={C.info} />
        </View>
        <View style={st.vendorInfo}>
          <Text style={st.vendorName} numberOfLines={1}>{item.vendorName}</Text>
          {item.vendorPhone && <Text style={st.vendorMeta}>{item.vendorPhone}</Text>}
          {item.vendorGST && <Text style={st.vendorMeta}>GST: {item.vendorGST}</Text>}
        </View>
        <View style={[st.balanceBadge, { backgroundColor: item.balance > 0 ? C.dangerLight : item.balance < 0 ? C.okLight : C.bg }]}>
          <Text style={[st.balanceBadgeText, { color: item.balance > 0 ? C.danger : item.balance < 0 ? C.ok : C.muted }]}>
            {formatPrice(Math.abs(item.balance))}
          </Text>
          <Text style={[st.balanceBadgeLabel, { color: item.balance > 0 ? C.danger : item.balance < 0 ? C.ok : C.muted }]}>
            {item.balance > 0 ? 'Due' : item.balance < 0 ? 'Advance' : 'Settled'}
          </Text>
        </View>
      </View>

      <View style={st.vendorStats}>
        <View style={st.statBox}>
          <Icon name="cart-outline" size={scale(14)} color={C.danger} />
          <Text style={st.statLabel}>Purchases</Text>
          <Text style={[st.statValue, { color: C.danger }]}>{formatPrice(item.totalPurchases)}</Text>
        </View>
        <View style={st.statBox}>
          <Icon name="wallet-outline" size={scale(14)} color={C.ok} />
          <Text style={st.statLabel}>Payments</Text>
          <Text style={[st.statValue, { color: C.ok }]}>{formatPrice(item.totalPayments)}</Text>
        </View>
      </View>

      <View style={st.vendorFooter}>
        <Text style={st.lastTxn}>Last: {formatDate(item.lastTransactionDate)}</Text>
        {can('vendor-ledger:create') && (
        <View style={st.vendorActions}>
          <TouchableOpacity style={[st.vendorBtn, { backgroundColor: C.dangerLight }]} onPress={() => openEntryModal('PURCHASE', item)}>
            <Icon name="cart" size={scale(14)} color={C.danger} />
            <Text style={[st.vendorBtnText, { color: C.danger }]}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.vendorBtn, { backgroundColor: C.okLight }]} onPress={() => openEntryModal('PAYMENT', item)}>
            <Icon name="wallet" size={scale(14)} color={C.ok} />
            <Text style={[st.vendorBtnText, { color: C.ok }]}>Payment</Text>
          </TouchableOpacity>
        </View>
        )}
      </View>
    </View>
  );

  // ==================== RENDER ENTRY CARD ====================
  const renderEntryCard = ({ item }) => {
    const config = getEntryConfig(item.entryType);
    const isDebit = item.entryType === 'PURCHASE' || item.entryType === 'DEBIT_NOTE';

    return (
      <View style={[st.entryCard, isTablet && { marginHorizontal: scale(6) }]}>
        <View style={st.entryHeader}>
          <View style={[st.entryIcon, { backgroundColor: config.bg }]}>
            <Icon name={config.icon} size={scale(18)} color={config.color} />
          </View>
          <View style={st.entryInfo}>
            <Text style={st.entryVendor} numberOfLines={1}>{item.vendorName}</Text>
            <Text style={st.entryDate}>{formatDate(item.entryDate)}</Text>
          </View>
          <View style={[st.entryBadge, { backgroundColor: config.bg }]}>
            <Text style={[st.entryBadgeText, { color: config.color }]}>{config.label}</Text>
          </View>
        </View>

        <Text style={st.entryDesc} numberOfLines={2}>{item.description}</Text>
        {item.billNumber && <Text style={st.entryBill}>Bill #: {item.billNumber}</Text>}

        <View style={st.entryFooter}>
          <View>
            <Text style={st.entryAmtLabel}>Amount</Text>
            <Text style={[st.entryAmt, { color: isDebit ? C.danger : C.ok }]}>
              {isDebit ? '+' : '-'}{formatPrice(item.amount)}
            </Text>
          </View>
          <View style={st.entryBalBox}>
            <Text style={st.entryBalLabel}>Balance</Text>
            <Text style={[st.entryBal, { color: item.balanceAfter > 0 ? C.danger : item.balanceAfter < 0 ? C.ok : C.text }]}>
              {formatPrice(item.balanceAfter)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Summary tiles data -- compact single-row strip instead of 4 big
  // horizontally-scrolling cards.
  const summaryTiles = [
    { key: 'vendors', icon: 'people', color: C.info, label: 'Vendors', value: String(summary.totalVendors) },
    { key: 'due', icon: 'trending-up', color: C.danger, label: 'Total Due', value: formatPrice(summary.totalDue) },
    { key: 'advance', icon: 'trending-down', color: C.ok, label: 'Advance', value: formatPrice(summary.totalAdvance) },
    { key: 'net', icon: 'wallet', color: C.warn, label: 'Net Balance', value: formatPrice(summary.netBalance), valueColor: summary.netBalance > 0 ? C.danger : C.ok },
  ];

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Summary Strip */}
      <View style={st.summaryStrip}>
        {summaryTiles.map((t, i) => (
          <React.Fragment key={t.key}>
            {i > 0 && <View style={st.summaryDivider} />}
            <View style={st.summaryTile}>
              <View style={[st.summaryTileIcon, { backgroundColor: t.color + '20' }]}>
                <Icon name={t.icon} size={scale(14)} color={t.color} />
              </View>
              <Text style={[st.summaryTileValue, t.valueColor && { color: t.valueColor }]} numberOfLines={1} adjustsFontSizeToFit>
                {t.value}
              </Text>
              <Text style={st.summaryTileLabel} numberOfLines={1}>{t.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Quick Actions -- Q1 "Solid Buttons": full solid color instead of
          light-tint + border, white icon and text, icon+label side by side. */}
      {can('vendor-ledger:create') && (
      <View style={st.quickRow}>
        <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.danger }]} onPress={() => openEntryModal('PURCHASE')} activeOpacity={0.85}>
          <Icon name="cart" size={scale(17)} color="#fff" />
          <Text style={st.quickBtnText}>Add Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.ok }]} onPress={() => openEntryModal('PAYMENT')} activeOpacity={0.85}>
          <Icon name="wallet" size={scale(17)} color="#fff" />
          <Text style={st.quickBtnText}>Add Payment</Text>
        </TouchableOpacity>
      </View>
      )}
    </>
  );

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading...</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT STATE ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.emptyState}>
          <Icon name="business-outline" size={scale(64)} color={C.muted} />
          <Text style={st.emptyTitle}>No Restaurant Found</Text>
          <Text style={st.emptySubtitle}>Please add a restaurant first</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  const listData = activeTab === 'summary' ? vendors : entries;
  const renderItem = activeTab === 'summary' ? renderVendorCard : renderEntryCard;
  const keyExtractor = activeTab === 'summary' ? (item) => item.vendorName : (item) => item.id;
  const numColumns = isTablet ? 2 : 1;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <Text style={st.headerSubtitle}>Manage vendor accounts</Text>
        </View>
        <View style={st.headerActions}>
          {can('vendor-ledger:create') && (
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openEntryModal()}>
            <Icon name="add" size={scale(20)} color={C.primary} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Tabs -- static here (not inside the scrolling list header) so it
          stays visible while switching between Vendors and Transactions.
          Underline style with a count badge, instead of a solid-fill
          segmented control. */}
      <View style={st.tabsContainer}>
        <TouchableOpacity style={st.tab} onPress={() => setActiveTab('summary')} activeOpacity={0.7}>
          <View style={st.tabTop}>
            <Icon name="people" size={scale(15)} color={activeTab === 'summary' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'summary' && st.tabTextActive]}>Vendors</Text>
            <View style={[st.tabBadge, activeTab === 'summary' && st.tabBadgeActive]}>
              <Text style={[st.tabBadgeText, activeTab === 'summary' && st.tabBadgeTextActive]}>{vendors.length}</Text>
            </View>
          </View>
          <View style={[st.tabUnderline, activeTab === 'summary' && st.tabUnderlineActive]} />
        </TouchableOpacity>
        <TouchableOpacity style={st.tab} onPress={() => setActiveTab('transactions')} activeOpacity={0.7}>
          <View style={st.tabTop}>
            <Icon name="list" size={scale(15)} color={activeTab === 'transactions' ? C.primary : C.muted} />
            <Text style={[st.tabText, activeTab === 'transactions' && st.tabTextActive]}>Transactions</Text>
            <View style={[st.tabBadge, activeTab === 'transactions' && st.tabBadgeActive]}>
              <Text style={[st.tabBadgeText, activeTab === 'transactions' && st.tabBadgeTextActive]}>{entries.length}</Text>
            </View>
          </View>
          <View style={[st.tabUnderline, activeTab === 'transactions' && st.tabUnderlineActive]} />
        </TouchableOpacity>
      </View>

      {/* Main List */}
      <FlatList
        data={listData}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        numColumns={numColumns}
        key={`grid-${numColumns}-${activeTab}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={numColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderListFooter}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <Icon name={activeTab === 'summary' ? 'business-outline' : 'document-text-outline'} size={scale(64)} color={C.muted} />
            <Text style={st.emptyTitle}>{activeTab === 'summary' ? 'No Vendors Yet' : 'No Transactions Yet'}</Text>
            <Text style={st.emptySubtitle}>Add a purchase or payment to get started</Text>
            {can('vendor-ledger:create') && (
            <TouchableOpacity style={st.emptyBtn} onPress={() => openEntryModal()}>
              <Icon name="add" size={scale(18)} color="#fff" />
              <Text style={st.emptyBtnText}>Add Entry</Text>
            </TouchableOpacity>
            )}
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />

      {/* Add Entry Modal - Full screen (no transparent) to fix Android scroll */}
      <Modal visible={entryModal} animationType="slide" onRequestClose={() => setEntryModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top']}>
            {/* Modal Header */}
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Add {getEntryConfig(form.entryType).label}</Text>
              <TouchableOpacity onPress={() => setEntryModal(false)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            {/* Modal Body - Scrollable */}
            <ScrollView
              style={st.modalBody}
              contentContainerStyle={st.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              <View>
                {/* Entry Type Selection */}
                <Text style={st.label}>Entry Type *</Text>
              <View style={st.typeGrid}>
                {ENTRY_TYPES.map((type) => {
                  const isActive = form.entryType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[st.typeBtn, isActive && { backgroundColor: type.color, borderColor: type.color }]}
                      onPress={() => setForm(f => ({ ...f, entryType: type.value }))}
                    >
                      <Icon name={type.icon} size={scale(16)} color={isActive ? '#fff' : type.color} />
                      <Text style={[st.typeBtnText, isActive && { color: '#fff' }]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Vendor Name */}
              <Text style={st.label}>Vendor Name *</Text>
              <TextInput
                style={st.input}
                placeholder="Enter vendor name"
                placeholderTextColor={C.muted}
                value={form.vendorName}
                onChangeText={v => setForm(f => ({ ...f, vendorName: v }))}
              />

              {/* Phone & GST */}
              <View style={st.rowFields}>
                <View style={st.halfField}>
                  <Text style={st.label}>Phone</Text>
                  <TextInput
                    style={st.input}
                    placeholder="Phone number"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    value={form.vendorPhone}
                    onChangeText={v => setForm(f => ({ ...f, vendorPhone: v }))}
                  />
                </View>
                <View style={st.halfField}>
                  <Text style={st.label}>GST No.</Text>
                  <TextInput
                    style={st.input}
                    placeholder="GST Number"
                    placeholderTextColor={C.muted}
                    value={form.vendorGST}
                    onChangeText={v => setForm(f => ({ ...f, vendorGST: v }))}
                  />
                </View>
              </View>

              {/* Amount */}
              <Text style={st.label}>Amount (₹) *</Text>
              <View style={st.amountRow}>
                <View style={st.currencyBox}>
                  <Text style={st.currencyText}>₹</Text>
                </View>
                <TextInput
                  style={st.amountInput}
                  placeholder="Enter amount"
                  placeholderTextColor={C.muted}
                  keyboardType="decimal-pad"
                  value={form.amount}
                  onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                />
              </View>

              {/* Payment Mode (only for PAYMENT) */}
              {form.entryType === 'PAYMENT' && (
                <>
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
                          <Icon name={mode.icon} size={scale(14)} color={isActive ? '#fff' : C.ink} />
                          <Text style={[st.modeBtnText, isActive && st.modeBtnTextActive]}>{mode.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Description */}
              <Text style={st.label}>Description *</Text>
              <TextInput
                style={st.textArea}
                placeholder="Enter description or notes"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />

              {/* Bill Details */}
              <View style={st.rowFields}>
                <View style={st.halfField}>
                  <Text style={st.label}>Bill Number</Text>
                  <TextInput
                    style={st.input}
                    placeholder="Bill/Invoice #"
                    placeholderTextColor={C.muted}
                    value={form.billNumber}
                    onChangeText={v => setForm(f => ({ ...f, billNumber: v }))}
                  />
                </View>
                <View style={st.halfField}>
                  <Text style={st.label}>Bill Date</Text>
                  <TouchableOpacity style={st.dateBtn} onPress={() => setShowBillDatePicker(true)}>
                    <Icon name="calendar" size={scale(18)} color={C.info} />
                    <Text style={st.dateBtnText}>{form.billDate ? formatDate(form.billDate) : 'Select Date'}</Text>
                  </TouchableOpacity>
                  {showBillDatePicker && (
                    <DateTimePicker
                      value={form.billDate ? new Date(form.billDate) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onBillDateChange}
                    />
                  )}
                </View>
              </View>

              {/* Entry Date */}
              <Text style={st.label}>Entry Date *</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowEntryDatePicker(true)}>
                <Icon name="calendar" size={scale(18)} color={C.info} />
                <Text style={st.dateBtnText}>{form.entryDate ? formatDate(form.entryDate) : 'Select Date'}</Text>
              </TouchableOpacity>
              {showEntryDatePicker && (
                <DateTimePicker
                  value={form.entryDate ? new Date(form.entryDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onEntryDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Due Date (only for PURCHASE) */}
              {form.entryType === 'PURCHASE' && (
                <>
                  <Text style={st.label}>Due Date</Text>
                  <TouchableOpacity style={st.dateBtn} onPress={() => setShowDueDatePicker(true)}>
                    <Icon name="calendar" size={scale(18)} color={C.warn} />
                    <Text style={st.dateBtnText}>{form.dueDate ? formatDate(form.dueDate) : 'Select Due Date'}</Text>
                  </TouchableOpacity>
                  {showDueDatePicker && (
                    <DateTimePicker
                      value={form.dueDate ? new Date(form.dueDate) : new Date()}
                      mode="date"
                      display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                      onChange={onDueDateChange}
                      minimumDate={new Date()}
                    />
                  )}
                </>
              )}

                <View style={{ height: scale(60) }} />
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setEntryModal(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[st.saveBtn, saving && { opacity: 0.7 }]} onPress={saveEntry} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark" size={scale(18)} color="#fff" />
                    <Text style={st.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Summary Strip -- one compact non-scrolling row of 4 tiles
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    marginHorizontal: scale(4), marginTop: scale(4), borderRadius: scale(14),
    paddingVertical: scale(10), paddingHorizontal: scale(2),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05, shadowRadius: scale(6), elevation: 2,
  },
  summaryTile: { flex: 1, alignItems: 'center', paddingHorizontal: scale(1) },
  summaryDivider: { width: 1, height: scale(30), backgroundColor: C.border },
  summaryTileIcon: {
    width: scale(26), height: scale(26), borderRadius: scale(8),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  summaryTileValue: { fontSize: moderateScale(13), fontWeight: '800', color: C.ink },
  summaryTileLabel: { fontSize: moderateScale(8.5), color: C.muted, marginTop: scale(1), fontWeight: '500' },

  // Quick Actions
  quickRow: { flexDirection: 'row', gap: scale(10), paddingHorizontal: scale(16), marginTop: scale(12), marginBottom: scale(16) },
  quickBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    borderRadius: scale(12), paddingVertical: scale(13),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, shadowRadius: 6, elevation: 3,
  },
  quickBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#fff' },

  // Tabs -- static, sits right under the restaurant selector. Underline
  // style (flat, colored bottom bar on the active tab) with a small count
  // badge, instead of a solid-fill segmented control.
  tabsContainer: {
    flexDirection: 'row', marginHorizontal: scale(16), marginTop: scale(4), marginBottom: scale(8),
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, overflow: 'hidden',
  },
  tab: { flex: 1, alignItems: 'center', paddingTop: scale(11), paddingBottom: scale(9) },
  tabTop: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  tabText: { fontSize: moderateScale(12.5), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary, fontWeight: '800' },
  tabBadge: {
    minWidth: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(4),
  },
  tabBadgeActive: { backgroundColor: C.primary + '18' },
  tabBadgeText: { fontSize: moderateScale(10), fontWeight: '700', color: C.muted },
  tabBadgeTextActive: { color: C.primary },
  tabUnderline: { height: scale(3), width: '55%', borderRadius: 2, backgroundColor: 'transparent', marginTop: scale(8) },
  tabUnderlineActive: { backgroundColor: C.primary },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120), paddingTop: scale(16) },
  columnWrapper: { justifyContent: 'space-between' },

  // Vendor Card
  vendorCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), padding: scale(14), marginBottom: scale(12), borderWidth: 1, borderColor: C.border },
  vendorHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: scale(12) },
  vendorIconBox: { width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  vendorMeta: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },
  balanceBadge: { paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), alignItems: 'flex-end' },
  balanceBadgeText: { fontSize: moderateScale(14), fontWeight: '700' },
  balanceBadgeLabel: { fontSize: moderateScale(9), fontWeight: '600', marginTop: scale(2) },
  vendorStats: { flexDirection: 'row', marginBottom: scale(12) },
  statBox: { flex: 1, backgroundColor: C.bg, borderRadius: scale(8), padding: scale(10), marginRight: scale(8), alignItems: 'center' },
  statLabel: { fontSize: moderateScale(10), color: C.muted, marginTop: scale(4), marginBottom: scale(2) },
  statValue: { fontSize: moderateScale(13), fontWeight: '700' },
  vendorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: scale(12), borderTopWidth: 1, borderTopColor: C.border },
  lastTxn: { fontSize: moderateScale(10), color: C.muted },
  vendorActions: { flexDirection: 'row' },
  vendorBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), marginLeft: scale(6) },
  vendorBtnText: { fontSize: moderateScale(11), fontWeight: '600', marginLeft: scale(4) },

  // Entry Card
  entryCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(12), padding: scale(14), marginBottom: scale(10), borderWidth: 1, borderColor: C.border },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(10) },
  entryIcon: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
  entryInfo: { flex: 1 },
  entryVendor: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  entryDate: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },
  entryBadge: { paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(6) },
  entryBadgeText: { fontSize: moderateScale(10), fontWeight: '600' },
  entryDesc: { fontSize: moderateScale(13), color: C.text, marginBottom: scale(6) },
  entryBill: { fontSize: moderateScale(11), color: C.muted, marginBottom: scale(6) },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: scale(10), borderTopWidth: 1, borderTopColor: C.border },
  entryAmtLabel: { fontSize: moderateScale(10), color: C.muted },
  entryAmt: { fontSize: moderateScale(15), fontWeight: '700', marginTop: scale(2) },
  entryBalBox: { alignItems: 'flex-end' },
  entryBalLabel: { fontSize: moderateScale(10), color: C.muted },
  entryBal: { fontSize: moderateScale(14), fontWeight: '700', marginTop: scale(2) },

  // Loading & Empty
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(14), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptySubtitle: { fontSize: moderateScale(13), color: C.muted, textAlign: 'center', marginTop: scale(6) },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: scale(20), paddingHorizontal: scale(20), paddingVertical: scale(12), backgroundColor: C.primary, borderRadius: scale(10) },
  emptyBtnText: { fontSize: moderateScale(14), fontWeight: '600', color: '#fff', marginLeft: scale(8) },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  modalClose: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: scale(16), paddingBottom: scale(80) },
  modalFooter: { flexDirection: 'row', padding: scale(16), borderTopWidth: 1, borderTopColor: C.border },

  // Form
  label: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted, marginBottom: scale(8), marginTop: scale(14) },
  input: { backgroundColor: C.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(14), color: C.text, borderWidth: 1, borderColor: C.border },
  textArea: { backgroundColor: C.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(14), color: C.text, borderWidth: 1, borderColor: C.border, minHeight: scale(80), textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', marginHorizontal: scale(-6) },
  halfField: { flex: 1, marginHorizontal: scale(6) },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(10), borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: scale(44), height: scale(48), backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: moderateScale(16), fontWeight: '700', color: C.info },
  amountInput: { flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(15), fontWeight: '600', color: C.ink },

  // Date Button
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(14), borderWidth: 1, borderColor: C.border },
  dateBtnText: { flex: 1, fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginLeft: scale(10) },

  // Type Grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  typeBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginLeft: scale(6) },

  // Mode Grid
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(8), borderRadius: scale(8), backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, margin: scale(4) },
  modeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  modeBtnText: { fontSize: moderateScale(11), fontWeight: '600', color: C.ink, marginLeft: scale(5) },
  modeBtnTextActive: { color: '#fff' },

  // Buttons
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', marginRight: scale(6) },
  cancelBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(10), backgroundColor: C.primary, marginLeft: scale(6) },
  saveBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff', marginLeft: scale(8) },
});
