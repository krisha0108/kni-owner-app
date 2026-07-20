/**
 * ============================================================================
 * EXPENSES SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, TextInput, ScrollView, Image,
  StatusBar, useWindowDimensions, Platform, KeyboardAvoidingView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import { api, API_BASE_URL } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
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

export default function ExpensesScreen({ navigation }) {
  const { width } = useWindowDimensions();
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
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [menuVisible, setMenuVisible] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [receiptImage, setReceiptImage] = useState(null);

  const [form, setForm] = useState({
    id: null, category: '', amount: '', description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    restaurantId: '', receiptUrl: '',
  });

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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setForm(f => ({ ...f, expenseDate: dateStr }));
    }
  };

  const openForm = (item = null) => {
    if (item) {
      setForm({
        id: item.id, category: item.category || '',
        amount: item.amount?.toString() || '',
        description: item.description || '',
        expenseDate: item.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        restaurantId: item.restaurantId?.toString() || selectedRestaurant?.toString() || '',
        receiptUrl: item.receiptUrl || '',
      });
      setReceiptImage(item.receiptUrl ? { uri: item.receiptUrl } : null);
    } else {
      setForm({
        id: null, category: '', amount: '', description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        restaurantId: selectedRestaurant?.toString() || '', receiptUrl: '',
      });
      setReceiptImage(null);
    }
    setModalVisible(true);
  };

  const pickReceipt = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: scale(1024), maxHeight: scale(1024) }, (response) => {
      if (response.assets && response.assets[0]) setReceiptImage(response.assets[0]);
    });
  };

  const convertReceiptToBase64 = async () => {
    if (!receiptImage || !receiptImage.uri || receiptImage.uri.startsWith('http')) {
      return form.receiptUrl || null;
    }
    try {
      const fileUri = receiptImage.uri;
      const filePath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
      const base64Data = await RNFS.readFile(filePath, 'base64');
      return `data:image/jpeg;base64,${base64Data}`;
    } catch (error) {
      console.log('Error converting receipt to base64:', error);
      return null;
    }
  };

  const saveExpense = async () => {
    if (!form.category || !form.amount) {
      AppAlert.alert('Error', 'Please fill in category and amount');
      return;
    }
    setSaving(true);
    try {
      const receiptData = await convertReceiptToBase64();
      const expenseDateISO = new Date(form.expenseDate).toISOString();
      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || '',
        expenseDate: expenseDateISO,
        restaurantId: form.restaurantId,
      };
      if (receiptData) payload.receiptUrl = receiptData;

      if (form.id) {
        await api.put(`/owner/expenses/${form.id}`, payload);
        AppAlert.alert('Success', 'Expense updated successfully');
      } else {
        await api.post('/owner/expenses', payload);
        AppAlert.alert('Success', 'Expense added successfully');
      }
      setModalVisible(false);
      setReceiptImage(null);
      loadData();
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
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
            <Icon name={cat.icon} size={scale(24)} color={cat.color} />
          </View>

          {/* Info */}
          <View style={st.cardInfo}>
            <Text style={st.cardTitle}>{cat.label}</Text>
            {item.description && <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>}
            <View style={st.cardMeta}>
              <Icon name="calendar-outline" size={scale(12)} color={C.muted} />
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
            style={[st.actionBtn, { backgroundColor: C.warningLight, flex: 0, paddingHorizontal: scale(12) }]}
            onPress={() => Linking.openURL(`${API_BASE_URL}/owner/expenses/${item.id}/receipt`)}
          >
            <Icon name="document-text-outline" size={scale(16)} color={C.warning} />
          </TouchableOpacity>
          {can('expenses:update') && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(item)}>
            <Icon name="pencil" size={scale(16)} color={C.info} />
            <Text style={[st.actionText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          )}
          {can('expenses:delete') && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.dangerLight }]} onPress={() => deleteExpense(item)}>
            <Icon name="trash" size={scale(16)} color={C.danger} />
            <Text style={[st.actionText, { color: C.danger }]}>Delete</Text>
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
              <Icon name="wallet" size={scale(24)} color="#fff" />
              <Text style={st.summaryLabel}>Total Expenses</Text>
            </View>
            <TouchableOpacity
              style={st.reportsBtn}
              onPress={() => navigation.navigate('ExpenseReports')}
            >
              <Icon name="bar-chart" size={scale(16)} color={C.warning} />
              <Text style={st.reportsBtnText}>Reports</Text>
            </TouchableOpacity>
          </View>
          <Text style={st.summaryValue}>{formatPrice(summary.total)}</Text>
          <Text style={st.summaryCount}>{summary.count} expense{summary.count !== 1 ? 's' : ''} recorded</Text>
        </View>
      )}

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

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
                onPress={() => setSelectedCategory(cat.value)}
              >
                <Icon name={cat.icon} size={scale(16)} color={isActive ? '#fff' : cat.color} />
                <Text style={[st.filterChipText, isActive && { color: '#fff' }]}>
                  {cat.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results Header */}
      <View style={st.resultsHeader}>
        <Text style={st.resultsTitle}>{filtered.length} Expense{filtered.length !== 1 ? 's' : ''}</Text>
        {selectedCategory !== 'all' && (
          <TouchableOpacity style={st.clearBtn} onPress={() => setSelectedCategory('all')}>
            <Icon name="close-circle" size={scale(14)} color={C.warning} />
            <Text style={st.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Expenses</Text>
            <Text style={st.headerSubtitle}>Track your spending</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.warning} />
          <Text style={st.loadingText}>Loading expenses...</Text>
        </View>
        <KniBottomNav navigation={navigation} active="khatabook" />
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT STATE ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Expenses</Text>
            <Text style={st.headerSubtitle}>Track your spending</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
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
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* White Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Expenses</Text>
          <Text style={st.headerSubtitle}>Track your spending</Text>
        </View>
        <View style={st.headerActions}>
          {can('expenses:create') && (
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="add" size={scale(20)} color={C.primary} />
          </TouchableOpacity>
          )}
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

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

      {/* Add/Edit Modal - Full screen (no transparent) to fix Android scroll */}
      <Modal visible={modalVisible} animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.card }} edges={['top']}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
            {/* Modal Header */}
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.modalHeader}>
              <Text style={st.modalTitle}>{form.id ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={st.modalBody} contentContainerStyle={{ paddingBottom: scale(30) }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
              {/* Category Selection */}
              <Text style={st.label}>Category *</Text>
              <View style={st.categoryGrid}>
                {CATEGORIES.map(cat => {
                  const isActive = form.category === cat.value;
                  return (
                    <TouchableOpacity
                      key={cat.value}
                      style={[st.categoryChip, isActive && { backgroundColor: cat.color, borderColor: cat.color }]}
                      onPress={() => setForm(f => ({ ...f, category: cat.value }))}
                    >
                      <Icon name={cat.icon} size={scale(18)} color={isActive ? '#fff' : cat.color} />
                      <Text style={[st.categoryChipText, isActive && { color: '#fff' }]}>{cat.label}</Text>
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

              {/* Date */}
              <Text style={st.label}>Date</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Icon name="calendar" size={scale(20)} color={C.warning} />
                <Text style={st.dateBtnText}>{form.expenseDate ? formatDate(form.expenseDate) : 'Select date'}</Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.expenseDate ? new Date(form.expenseDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Description */}
              <Text style={st.label}>Description</Text>
              <TextInput
                style={st.textArea}
                placeholder="Add notes about this expense"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />

              {/* Receipt */}
              <Text style={st.label}>Receipt (Optional)</Text>
              {receiptImage ? (
                <View style={st.receiptPreview}>
                  <Image source={{ uri: receiptImage.uri }} style={st.receiptImage} resizeMode="cover" />
                  <TouchableOpacity style={st.receiptRemove} onPress={() => setReceiptImage(null)}>
                    <Icon name="close" size={scale(16)} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity style={st.receiptChange} onPress={pickReceipt}>
                    <Icon name="camera" size={scale(14)} color={C.warning} />
                    <Text style={st.receiptChangeText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={st.receiptUpload} onPress={pickReceipt}>
                  <View style={st.receiptUploadIcon}>
                    <Icon name="cloud-upload" size={scale(28)} color={C.muted} />
                  </View>
                  <Text style={st.receiptUploadText}>Tap to upload receipt</Text>
                  <Text style={st.receiptUploadHint}>PNG, JPG up to 5MB</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            {/* Modal Footer */}
            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveExpense} disabled={saving}>
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
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="khatabook" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header Section
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  headerBackBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(10), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

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
  summaryCard: { backgroundColor: C.warning, marginHorizontal: scale(16), marginTop: scale(16), padding: scale(20), borderRadius: scale(16) },
  summaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(8) },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  summaryLabel: { fontSize: moderateScale(14), color: '#fff', fontWeight: '600' },
  reportsBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(12), paddingVertical: scale(6), backgroundColor: '#fff', borderRadius: scale(20) },
  reportsBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: C.warning },
  summaryValue: { fontSize: moderateScale(32), fontWeight: '800', color: '#fff' },
  summaryCount: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.85)', marginTop: scale(4) },

  // Filters
  filterSection: { paddingVertical: scale(12), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border, marginTop: scale(12) },
  filterScroll: { paddingHorizontal: scale(16) },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(14), paddingVertical: scale(10), marginRight: scale(8), backgroundColor: C.card, borderRadius: scale(20), borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },

  // Results Header
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  resultsTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  clearBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.warningLight, borderRadius: scale(8) },
  clearBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.warning },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3, overflow: 'hidden', padding: scale(16) },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(12) },
  categoryIcon: { width: scale(48), height: scale(48), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  cardDesc: { fontSize: moderateScale(13), color: C.text, marginTop: scale(4) },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(6) },
  cardDate: { fontSize: moderateScale(12), color: C.muted },
  amountBox: { alignItems: 'flex-end' },
  amountText: { fontSize: moderateScale(18), fontWeight: '800' },
  cardActions: { flexDirection: 'row', gap: scale(8), marginTop: scale(14), paddingTop: scale(14), borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(10), borderRadius: scale(10) },
  actionText: { fontSize: moderateScale(13), fontWeight: '600' },

  // Loading & Empty
  loadingHero: { paddingVertical: scale(24), paddingHorizontal: scale(20), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.warning, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Modal
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(20) },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '800', color: '#fff' },
  modalClose: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1, padding: scale(20) },
  modalFooter: { flexDirection: 'row', gap: scale(12), padding: scale(20), borderTopWidth: 1, borderTopColor: C.border },

  // Form
  label: { fontSize: moderateScale(13), fontWeight: '700', color: C.text, marginBottom: scale(10), marginTop: scale(16) },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(14), paddingVertical: scale(10), borderRadius: scale(12), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  categoryChipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: scale(48), height: scale(48), backgroundColor: C.warningLight, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: moderateScale(18), fontWeight: '700', color: C.warning },
  amountInput: { flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(16), fontWeight: '600', color: C.ink },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  dateBtnText: { flex: 1, fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  textArea: { backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(14), color: C.text, borderWidth: 1.5, borderColor: C.border, minHeight: scale(80), textAlignVertical: 'top' },

  // Receipt
  receiptUpload: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: scale(14), paddingVertical: scale(28), backgroundColor: C.bg },
  receiptUploadIcon: { width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: scale(10), shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.1, shadowRadius: scale(4), elevation: 2 },
  receiptUploadText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  receiptUploadHint: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },
  receiptPreview: { position: 'relative', borderRadius: scale(14), overflow: 'hidden' },
  receiptImage: { width: '100%', height: scale(160), borderRadius: scale(14) },
  receiptRemove: { position: 'absolute', top: scale(10), right: scale(10), width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  receiptChange: { position: 'absolute', bottom: scale(10), right: scale(10), flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(20), backgroundColor: '#fff' },
  receiptChangeText: { fontSize: moderateScale(12), fontWeight: '600', color: C.warning },

  // Buttons
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center' },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.warning },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },
});
