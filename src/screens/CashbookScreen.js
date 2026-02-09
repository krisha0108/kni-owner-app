/**
 * ============================================================================
 * DAILY CASHBOOK SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, ScrollView, Alert, StatusBar,
  useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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

export default function CashbookScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gridColumns = isTablet ? 2 : 1;

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
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) { setLoading(false); return; }
    try {
      setLoading(true);
      const [entriesRes, statsRes] = await Promise.all([
        api.get(`/owner/cashbook?restaurantId=${selectedRestaurantId}`),
        api.get(`/owner/cashbook/stats?restaurantId=${selectedRestaurantId}`),
      ]);
      if (entriesRes.data.ok) setEntries(entriesRes.data.data || []);
      if (statsRes.data.ok) setStats(statsRes.data.data);
    } catch (error) {
      console.error('Error loading cashbook:', error);
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
      Alert.alert('Error', 'Amount and description are required');
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
        Alert.alert('Success', 'Entry updated');
      } else {
        await api.post('/owner/cashbook', payload);
        Alert.alert('Success', 'Entry added');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (item) => {
    Alert.alert('Delete Entry', 'Are you sure you want to delete this entry?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/cashbook/${item.id}`);
            Alert.alert('Success', 'Entry deleted');
            loadData();
          } catch (error) {
            Alert.alert('Error', 'Failed to delete');
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
      <View style={[st.card, isTablet && { marginHorizontal: 6 }]}>
        <View style={st.cardRow}>
          <View style={[st.entryIcon, { backgroundColor: config.bg }]}>
            <Icon name={config.icon} size={24} color={config.color} />
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
              <Icon name="calendar-outline" size={12} color={C.muted} />
              <Text style={st.cardMetaText}>{formatDate(item.entryDate)}</Text>
              <Text style={st.cardMetaDot}>•</Text>
              <Text style={st.cardMetaText}>{item.paymentMode?.replace('_', ' ')}</Text>
            </View>
          </View>
          <Text style={[st.cardAmount, { color: isIncome ? C.success : C.danger }]}>
            {isIncome ? '+' : '-'}{formatPrice(item.amount)}
          </Text>
        </View>
        <View style={st.cardActions}>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(null, item)}>
            <Icon name="pencil" size={16} color={C.info} />
            <Text style={[st.actionText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.dangerLight }]} onPress={() => deleteEntry(item)}>
            <Icon name="trash" size={16} color={C.danger} />
            <Text style={[st.actionText, { color: C.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Balance Cards */}
      {stats && (
        <View style={st.balanceSection}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.balanceScroll}>
            {/* Cash Balance */}
            <LinearGradient colors={[C.success, '#059669']} style={st.balanceCard}>
              <View style={st.balanceIconBox}>
                <Icon name="wallet" size={20} color="#fff" />
              </View>
              <Text style={st.balanceLabel}>Cash Balance</Text>
              <Text style={st.balanceValue}>{formatPrice(stats.cashBalance)}</Text>
              <View style={st.balanceBreakdown}>
                <Text style={st.balanceIn}>↓ {formatPrice(stats.cashIn)}</Text>
                <Text style={st.balanceOut}>↑ {formatPrice(stats.cashOut)}</Text>
              </View>
            </LinearGradient>

            {/* Bank Balance */}
            <LinearGradient colors={[C.info, '#2563EB']} style={st.balanceCard}>
              <View style={st.balanceIconBox}>
                <Icon name="business" size={20} color="#fff" />
              </View>
              <Text style={st.balanceLabel}>Bank Balance</Text>
              <Text style={st.balanceValue}>{formatPrice(stats.bankBalance)}</Text>
              <View style={st.balanceBreakdown}>
                <Text style={st.balanceIn}>↓ {formatPrice(stats.bankIn)}</Text>
                <Text style={st.balanceOut}>↑ {formatPrice(stats.bankOut)}</Text>
              </View>
            </LinearGradient>

            {/* Total Balance */}
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.balanceCard}>
              <View style={st.balanceIconBox}>
                <Icon name="cash" size={20} color="#fff" />
              </View>
              <Text style={st.balanceLabel}>Total Balance</Text>
              <Text style={st.balanceValue}>{formatPrice(stats.totalBalance)}</Text>
              <Text style={st.balanceCount}>{stats.totalEntries || 0} entries</Text>
            </LinearGradient>
          </ScrollView>
        </View>
      )}

      {/* Quick Actions - Premium Grid Design */}
      <View style={st.quickSection}>
        <View style={st.quickTitleRow}>
          <Icon name="flash" size={18} color={C.warning} />
          <Text style={st.quickTitle}>Quick Add</Text>
        </View>
        <View style={st.quickGrid}>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('CASH_IN')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.success, '#059669']} style={st.quickCardGradient}>
              <Icon name="arrow-down-circle" size={28} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Cash In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('CASH_OUT')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.danger, '#DC2626']} style={st.quickCardGradient}>
              <Icon name="arrow-up-circle" size={28} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Cash Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('BANK_IN')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.info, '#2563EB']} style={st.quickCardGradient}>
              <Icon name="arrow-down-circle" size={28} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Bank In</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.quickCard}
            onPress={() => openForm('BANK_OUT')}
            activeOpacity={0.8}
          >
            <LinearGradient colors={[C.warning, '#D97706']} style={st.quickCardGradient}>
              <Icon name="arrow-up-circle" size={28} color="#fff" />
            </LinearGradient>
            <Text style={st.quickCardLabel}>Bank Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Chips */}
      <View style={st.filterSection}>
        <FlatList
          horizontal
          data={[{ value: 'all', label: 'All', icon: 'grid', color: C.ink }, ...ENTRY_TYPES]}
          keyExtractor={(item) => item.value}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScroll}
          renderItem={({ item: filter }) => {
            const isActive = filterType === filter.value;
            const count = entryCounts[filter.value] || 0;
            return (
              <TouchableOpacity
                style={[st.filterChip, isActive && { backgroundColor: filter.color || C.gradient1, borderColor: filter.color || C.gradient1 }]}
                onPress={() => setFilterType(filter.value)}
              >
                <Icon name={filter.icon} size={16} color={isActive ? '#fff' : filter.color || C.ink} />
                <Text style={[st.filterChipText, isActive && { color: '#fff' }]}>
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results */}
      <View style={st.resultsHeader}>
        <Text style={st.resultsTitle}>{filteredEntries.length} Entr{filteredEntries.length !== 1 ? 'ies' : 'y'}</Text>
        {filterType !== 'all' && (
          <TouchableOpacity style={st.clearBtn} onPress={() => setFilterType('all')}>
            <Icon name="close-circle" size={14} color={C.gradient1} />
            <Text style={st.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if (loading && !refreshing && entries.length === 0) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Daily Cashbook</Text>
            <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={20} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.gradient1} />
          <Text style={st.loadingText}>Loading entries...</Text>
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Daily Cashbook</Text>
            <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={20} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.emptyState}>
          <View style={st.emptyIcon}>
            <Icon name="business-outline" size={64} color={C.muted} />
          </View>
          <Text style={st.emptyTitle}>No Restaurant Found</Text>
          <Text style={st.emptySubtitle}>Please add a restaurant first</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* White Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.headerBackBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Daily Cashbook</Text>
          <Text style={st.headerSubtitle}>Track cash & bank transactions</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="add" size={20} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Entry List */}
      <FlatList
        data={filteredEntries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntryCard}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={gridColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.gradient1]} />}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Icon name="wallet-outline" size={64} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>No Entries Yet</Text>
            <Text style={st.emptySubtitle}>Start tracking your cash and bank transactions</Text>
            <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={st.emptyBtnText}>Add First Entry</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />

      {/* Add/Edit Modal - Fixed Scroll */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={() => setModalVisible(false)}>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            {/* Modal Header */}
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.modalHeader}>
              <Text style={st.modalTitle}>{form.id ? 'Edit Entry' : 'Add Entry'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalClose}>
                <Icon name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            {/* Scrollable Form Body */}
            <ScrollView
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
                      <Icon name={type.icon} size={16} color={isActive ? '#fff' : type.color} />
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
                      <Icon name={mode.icon} size={16} color={isActive ? '#fff' : C.ink} />
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
                <Icon name="calendar" size={20} color={C.gradient1} />
                <Text style={st.dateBtnText}>{formatDate(form.entryDate)}</Text>
                <Icon name="chevron-down" size={18} color={C.muted} />
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
              <View style={{ height: 20 }} />
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
                    <Icon name={form.id ? 'checkmark' : 'add'} size={18} color="#fff" />
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
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBackBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Hero Section (kept for loading state)
  heroSection: { paddingTop: 8, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroActions: { flexDirection: 'row' },
  heroIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginLeft: 8 },

  // Balance Section
  balanceSection: { marginTop: 16 },
  balanceScroll: { paddingHorizontal: 16 },
  balanceCard: { width: 160, borderRadius: 16, padding: 16, marginRight: 12 },
  balanceIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  balanceLabel: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  balanceValue: { fontSize: 22, fontWeight: '800', color: '#fff', marginTop: 4 },
  balanceBreakdown: { flexDirection: 'row', marginTop: 8 },
  balanceIn: { fontSize: 11, color: 'rgba(255,255,255,0.8)', marginRight: 12 },
  balanceOut: { fontSize: 11, color: 'rgba(255,255,255,0.8)' },
  balanceCount: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 8 },

  // Quick Section - Premium Grid
  quickSection: { marginHorizontal: 16, marginTop: 16 },
  quickTitleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  quickTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginLeft: 8 },
  quickGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  quickCard: { width: '23%', alignItems: 'center' },
  quickCardGradient: { width: 56, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  quickCardLabel: { fontSize: 11, fontWeight: '600', color: C.text, marginTop: 8, textAlign: 'center' },

  // Filters
  filterSection: { paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, marginTop: 12 },
  filterScroll: { paddingHorizontal: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: 13, fontWeight: '600', color: C.ink, marginLeft: 6 },

  // Results
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  resultsTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, backgroundColor: '#EEF2FF', borderRadius: 8 },
  clearBtnText: { fontSize: 12, fontWeight: '600', color: C.gradient1, marginLeft: 4 },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: 16, marginBottom: 12, shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, padding: 16 },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start' },
  entryIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardInfo: { flex: 1, marginRight: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  cardMeta: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, marginRight: 6, marginBottom: 4 },
  typeBadgeText: { fontSize: 10, fontWeight: '700' },
  categoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: C.bg, marginBottom: 4 },
  categoryBadgeText: { fontSize: 10, fontWeight: '600', color: C.muted },
  cardMetaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  cardMetaText: { fontSize: 11, color: C.muted, marginLeft: 4 },
  cardMetaDot: { color: C.muted, marginHorizontal: 4 },
  cardAmount: { fontSize: 16, fontWeight: '800' },
  cardActions: { flexDirection: 'row', marginTop: 14, paddingTop: 14, borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 10, borderRadius: 10, marginHorizontal: 4 },
  actionText: { fontSize: 13, fontWeight: '600', marginLeft: 6 },

  // Loading & Empty
  loadingHero: { paddingVertical: 24, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: C.gradient1, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 },

  // Modal - Fixed Scroll
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, height: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff' },
  modalClose: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: 16, paddingBottom: 30 },
  modalFooter: { flexDirection: 'row', padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  // Form - Compact Layout
  label: { fontSize: 12, fontWeight: '700', color: C.text, marginBottom: 8, marginTop: 14 },
  typeRow: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: 4 },
  typeChipText: { fontSize: 11, fontWeight: '600', color: C.ink, marginLeft: 5 },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: 44, height: 44, backgroundColor: '#EEF2FF', alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: 16, fontWeight: '700', color: C.gradient1 },
  amountInput: { flex: 1, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: C.ink },
  input: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text, borderWidth: 1.5, borderColor: C.border },
  textArea: { backgroundColor: C.bg, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13, color: C.text, borderWidth: 1.5, borderColor: C.border, minHeight: 70, textAlignVertical: 'top' },
  dateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 12, borderRadius: 10, borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  dateBtnText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.ink, marginLeft: 8 },
  // Payment Mode Grid
  modeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  modeBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: 4 },
  modeBtnActive: { backgroundColor: C.gradient1, borderColor: C.gradient1 },
  modeBtnText: { fontSize: 11, fontWeight: '600', color: C.ink, marginLeft: 5 },
  modeBtnTextActive: { color: '#fff' },
  // Category Grid
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -4 },
  catBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8, backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: 4 },
  catBtnActive: { backgroundColor: C.warning, borderColor: C.warning },
  catBtnText: { fontSize: 11, fontWeight: '600', color: C.ink },
  catBtnTextActive: { color: '#fff' },

  // Buttons
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', marginRight: 6 },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, backgroundColor: C.gradient1, marginLeft: 6 },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff', marginLeft: 8 },
});
