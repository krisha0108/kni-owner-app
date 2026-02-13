/**
 * ============================================================================
 * VENDOR LEDGER SCREEN - Premium Redesign (Scroll Fixed)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert, StatusBar,
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

  const { selectedRestaurantId, loading: restaurantsLoading, loadRestaurants, hasRestaurants } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({ totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
  const [activeTab, setActiveTab] = useState('summary');
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

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [summaryRes, entriesRes] = await Promise.all([
        api.get(`/owner/vendor-ledger/summary?restaurantId=${selectedRestaurantId}`),
        api.get(`/owner/vendor-ledger?restaurantId=${selectedRestaurantId}`),
      ]);
      if (summaryRes.data.ok) {
        setVendors(summaryRes.data.data.vendors || []);
        setSummary(summaryRes.data.data.summary || { totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
      }
      if (entriesRes.data.ok) setEntries(entriesRes.data.data || []);
    } catch (error) {
      console.error('Error loading vendor ledger:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    if (selectedRestaurantId) loadData();
  }, [selectedRestaurantId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
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
    if (!form.vendorName.trim()) { Alert.alert('Error', 'Vendor name is required'); return; }
    if (!form.amount || parseFloat(form.amount) <= 0) { Alert.alert('Error', 'Please enter a valid amount'); return; }
    if (!form.description.trim()) { Alert.alert('Error', 'Description is required'); return; }

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
        Alert.alert('Success', 'Entry added successfully');
        setEntryModal(false);
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to add entry');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to add entry');
    } finally {
      setSaving(false);
    }
  };

  // ==================== RENDER VENDOR CARD ====================
  const renderVendorCard = ({ item }) => (
    <View style={[st.vendorCard, isTablet && { marginHorizontal: 6 }]}>
      <View style={st.vendorHeader}>
        <View style={st.vendorIconBox}>
          <Icon name="business" size={22} color={C.info} />
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
          <Icon name="cart-outline" size={14} color={C.danger} />
          <Text style={st.statLabel}>Purchases</Text>
          <Text style={[st.statValue, { color: C.danger }]}>{formatPrice(item.totalPurchases)}</Text>
        </View>
        <View style={st.statBox}>
          <Icon name="wallet-outline" size={14} color={C.ok} />
          <Text style={st.statLabel}>Payments</Text>
          <Text style={[st.statValue, { color: C.ok }]}>{formatPrice(item.totalPayments)}</Text>
        </View>
      </View>

      <View style={st.vendorFooter}>
        <Text style={st.lastTxn}>Last: {formatDate(item.lastTransactionDate)}</Text>
        <View style={st.vendorActions}>
          <TouchableOpacity style={[st.vendorBtn, { backgroundColor: C.dangerLight }]} onPress={() => openEntryModal('PURCHASE', item)}>
            <Icon name="cart" size={14} color={C.danger} />
            <Text style={[st.vendorBtnText, { color: C.danger }]}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.vendorBtn, { backgroundColor: C.okLight }]} onPress={() => openEntryModal('PAYMENT', item)}>
            <Icon name="wallet" size={14} color={C.ok} />
            <Text style={[st.vendorBtnText, { color: C.ok }]}>Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // ==================== RENDER ENTRY CARD ====================
  const renderEntryCard = ({ item }) => {
    const config = getEntryConfig(item.entryType);
    const isDebit = item.entryType === 'PURCHASE' || item.entryType === 'DEBIT_NOTE';

    return (
      <View style={[st.entryCard, isTablet && { marginHorizontal: 6 }]}>
        <View style={st.entryHeader}>
          <View style={[st.entryIcon, { backgroundColor: config.bg }]}>
            <Icon name={config.icon} size={18} color={config.color} />
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

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Summary Cards */}
      <View style={st.summarySection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.summaryScroll}>
          <View style={[st.summaryCard, { borderLeftColor: C.info }]}>
            <View style={[st.summaryIcon, { backgroundColor: C.infoLight }]}>
              <Icon name="people" size={18} color={C.info} />
            </View>
            <Text style={st.summaryLabel}>Vendors</Text>
            <Text style={st.summaryValue}>{summary.totalVendors}</Text>
          </View>
          <View style={[st.summaryCard, { borderLeftColor: C.danger }]}>
            <View style={[st.summaryIcon, { backgroundColor: C.dangerLight }]}>
              <Icon name="trending-up" size={18} color={C.danger} />
            </View>
            <Text style={st.summaryLabel}>Total Due</Text>
            <Text style={[st.summaryValue, { color: C.danger }]}>{formatPrice(summary.totalDue)}</Text>
          </View>
          <View style={[st.summaryCard, { borderLeftColor: C.ok }]}>
            <View style={[st.summaryIcon, { backgroundColor: C.okLight }]}>
              <Icon name="trending-down" size={18} color={C.ok} />
            </View>
            <Text style={st.summaryLabel}>Advance</Text>
            <Text style={[st.summaryValue, { color: C.ok }]}>{formatPrice(summary.totalAdvance)}</Text>
          </View>
          <View style={[st.summaryCard, { borderLeftColor: C.warn }]}>
            <View style={[st.summaryIcon, { backgroundColor: C.warnLight }]}>
              <Icon name="wallet" size={18} color={C.warn} />
            </View>
            <Text style={st.summaryLabel}>Net Balance</Text>
            <Text style={[st.summaryValue, { color: summary.netBalance > 0 ? C.danger : C.ok }]}>{formatPrice(summary.netBalance)}</Text>
          </View>
        </ScrollView>
      </View>

      {/* Quick Actions */}
      <View style={st.quickRow}>
        <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.dangerLight, borderColor: C.danger }]} onPress={() => openEntryModal('PURCHASE')}>
          <Icon name="cart" size={18} color={C.danger} />
          <Text style={[st.quickBtnText, { color: C.danger }]}>Add Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.quickBtn, { backgroundColor: C.okLight, borderColor: C.ok }]} onPress={() => openEntryModal('PAYMENT')}>
          <Icon name="wallet" size={18} color={C.ok} />
          <Text style={[st.quickBtnText, { color: C.ok }]}>Add Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={st.tabsContainer}>
        <TouchableOpacity style={[st.tab, activeTab === 'summary' && st.tabActive]} onPress={() => setActiveTab('summary')}>
          <Icon name="people" size={16} color={activeTab === 'summary' ? '#fff' : C.muted} />
          <Text style={[st.tabText, activeTab === 'summary' && st.tabTextActive]}>Vendors ({vendors.length})</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[st.tab, activeTab === 'transactions' && st.tabActive]} onPress={() => setActiveTab('transactions')}>
          <Icon name="list" size={16} color={activeTab === 'transactions' ? '#fff' : C.muted} />
          <Text style={[st.tabText, activeTab === 'transactions' && st.tabTextActive]}>Transactions ({entries.length})</Text>
        </TouchableOpacity>
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: 40 }} />
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
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyState}>
          <Icon name="business-outline" size={64} color={C.muted} />
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
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Vendor Ledger</Text>
          <Text style={st.headerSubtitle}>Manage vendor accounts</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openEntryModal()}>
            <Icon name="add" size={20} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

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
        ListEmptyComponent={
          <View style={st.emptyState}>
            <Icon name={activeTab === 'summary' ? 'business-outline' : 'document-text-outline'} size={64} color={C.muted} />
            <Text style={st.emptyTitle}>{activeTab === 'summary' ? 'No Vendors Yet' : 'No Transactions Yet'}</Text>
            <Text style={st.emptySubtitle}>Add a purchase or payment to get started</Text>
            <TouchableOpacity style={st.emptyBtn} onPress={() => openEntryModal()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={st.emptyBtnText}>Add Entry</Text>
            </TouchableOpacity>
          </View>
        }
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
                <Icon name="close" size={24} color={C.ink} />
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
                      <Icon name={type.icon} size={16} color={isActive ? '#fff' : type.color} />
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
                          <Icon name={mode.icon} size={14} color={isActive ? '#fff' : C.ink} />
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
                    <Icon name="calendar" size={18} color={C.info} />
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
                <Icon name="calendar" size={18} color={C.info} />
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
                    <Icon name="calendar" size={18} color={C.warn} />
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

                <View style={{ height: 60 }} />
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
                    <Icon name="checkmark" size={18} color="#fff" />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  backBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Summary Section
  summarySection: { marginTop: 16, marginBottom: 4 },
  summaryScroll: { paddingHorizontal: 16, paddingBottom: 8 },
  summaryCard: { width: 140, backgroundColor: C.card, borderRadius: 12, padding: 14, marginRight: 10, marginBottom: 4, borderLeftWidth: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2 },
  summaryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  summaryLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: C.ink },

  // Quick Actions
  quickRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 16 },
  quickBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, marginRight: 8 },
  quickBtnText: { fontSize: 13, fontWeight: '600', marginLeft: 8 },

  // Tabs
  tabsContainer: { flexDirection: 'row', marginHorizontal: 16, marginTop: 16, marginBottom: 16, backgroundColor: C.card, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: C.border },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10 },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 12, fontWeight: '600', color: C.muted, marginLeft: 6 },
  tabTextActive: { color: '#fff' },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 120, paddingTop: 16 },
  columnWrapper: { justifyContent: 'space-between' },

  // Vendor Card
  vendorCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  vendorHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  vendorIconBox: { width: 44, height: 44, borderRadius: 12, backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 15, fontWeight: '700', color: C.ink },
  vendorMeta: { fontSize: 11, color: C.muted, marginTop: 2 },
  balanceBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignItems: 'flex-end' },
  balanceBadgeText: { fontSize: 14, fontWeight: '700' },
  balanceBadgeLabel: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  vendorStats: { flexDirection: 'row', marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: C.bg, borderRadius: 8, padding: 10, marginRight: 8, alignItems: 'center' },
  statLabel: { fontSize: 10, color: C.muted, marginTop: 4, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700' },
  vendorFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
  lastTxn: { fontSize: 10, color: C.muted },
  vendorActions: { flexDirection: 'row' },
  vendorBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, marginLeft: 6 },
  vendorBtnText: { fontSize: 11, fontWeight: '600', marginLeft: 4 },

  // Entry Card
  entryCard: { flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: C.border },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  entryIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  entryInfo: { flex: 1 },
  entryVendor: { fontSize: 14, fontWeight: '700', color: C.ink },
  entryDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  entryBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  entryBadgeText: { fontSize: 10, fontWeight: '600' },
  entryDesc: { fontSize: 13, color: C.text, marginBottom: 6 },
  entryBill: { fontSize: 11, color: C.muted, marginBottom: 6 },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border },
  entryAmtLabel: { fontSize: 10, color: C.muted },
  entryAmt: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  entryBalBox: { alignItems: 'flex-end' },
  entryBalLabel: { fontSize: 10, color: C.muted },
  entryBal: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  // Loading & Empty
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptySubtitle: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 6 },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, paddingHorizontal: 20, paddingVertical: 12, backgroundColor: C.primary, borderRadius: 10 },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', marginLeft: 8 },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16, paddingBottom: 80 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  // Form
  label: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8, marginTop: 14 },
  input: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border },
  textArea: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border, minHeight: 80, textAlignVertical: 'top' },
  rowFields: { flexDirection: 'row', marginHorizontal: -6 },
  halfField: { flex: 1, marginHorizontal: 6 },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: 44, height: 48, backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: 16, fontWeight: '700', color: C.info },
  amountInput: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, fontWeight: '600', color: C.ink },

  // Date Button
  dateBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 14, borderWidth: 1, borderColor: C.border },
  dateBtnText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink, marginLeft: 10 },

  // Type Grid
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  typeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10, borderRadius: 10, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: 4 },
  typeBtnText: { fontSize: 12, fontWeight: '600', color: C.ink, marginLeft: 6 },

  // Mode Grid
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1, borderColor: C.border, margin: 4 },
  modeBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: C.ink, marginLeft: 5 },
  modeBtnTextActive: { color: '#fff' },

  // Buttons
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', marginRight: 6 },
  cancelBtnText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 10, backgroundColor: C.primary, marginLeft: 6 },
  saveBtnText: { fontSize: 14, fontWeight: '700', color: '#fff', marginLeft: 8 },
});
