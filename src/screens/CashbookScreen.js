import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const ENTRY_TYPES = [
  { value: 'CASH_IN', label: 'Cash In', icon: 'arrow-down', color: C.ok, bgColor: '#ECFDF5' },
  { value: 'CASH_OUT', label: 'Cash Out', icon: 'arrow-up', color: C.danger, bgColor: '#FEF2F2' },
  { value: 'BANK_IN', label: 'Bank In', icon: 'arrow-down', color: C.ok, bgColor: '#ECFDF5' },
  { value: 'BANK_OUT', label: 'Bank Out', icon: 'arrow-up', color: C.danger, bgColor: '#FEF2F2' },
];

// Filter config for stylish summary tabs
const FILTER_CONFIG = {
  all: { bg: '#F3F4F6', color: C.ink, icon: 'list-outline', label: 'All' },
  CASH_IN: { bg: '#ECFDF5', color: '#10B981', icon: 'arrow-down-circle-outline', label: 'Cash In' },
  CASH_OUT: { bg: '#FEE2E2', color: '#EF4444', icon: 'arrow-up-circle-outline', label: 'Cash Out' },
  BANK_IN: { bg: '#DBEAFE', color: '#2563EB', icon: 'arrow-down-circle-outline', label: 'Bank In' },
  BANK_OUT: { bg: '#FEF3C7', color: '#D97706', icon: 'arrow-up-circle-outline', label: 'Bank Out' },
};

const FILTER_OPTIONS = ['all', 'CASH_IN', 'CASH_OUT', 'BANK_IN', 'BANK_OUT'];

const PAYMENT_MODES = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER'];

const EXPENSE_CATEGORIES = [
  'Groceries',
  'Utilities',
  'Rent',
  'Salaries',
  'Equipment Maintenance',
  'Marketing',
  'Transportation',
  'Other',
];

const formatPrice = (amount) => {
  const num = Number(amount) || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export default function CashbookScreen({ navigation }) {
  // Global restaurant context
  const {
    restaurants,
    selectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
    selectRestaurant,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [entries, setEntries] = useState([]);
  const [stats, setStats] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const [form, setForm] = useState({
    id: null,
    entryType: 'CASH_IN',
    amount: '',
    paymentMode: 'CASH',
    category: '',
    description: '',
    referenceNo: '',
    entryDate: new Date().toISOString().split('T')[0],
  });
  const [menuVisible, setMenuVisible] = useState(false);

  // Calculate entry counts for summary tabs
  const entryCounts = useMemo(() => {
    const counts = { all: entries.length, CASH_IN: 0, CASH_OUT: 0, BANK_IN: 0, BANK_OUT: 0 };
    entries.forEach(e => {
      if (counts[e.entryType] !== undefined) {
        counts[e.entryType]++;
      }
    });
    return counts;
  }, [entries]);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);

      // Fetch entries
      let url = `/owner/cashbook?restaurantId=${selectedRestaurantId}`;
      if (filterType !== 'all') {
        url += `&entryType=${filterType}`;
      }

      const [entriesRes, statsRes] = await Promise.all([
        api.get(url),
        api.get(`/owner/cashbook/stats?restaurantId=${selectedRestaurantId}`),
      ]);

      if (entriesRes.data.ok) {
        setEntries(entriesRes.data.data || []);
      }

      if (statsRes.data.ok) {
        setStats(statsRes.data.data);
      }
    } catch (error) {
      console.error('Error loading cashbook:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, filterType]);

  // Load data when restaurant changes
  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const openForm = (entryType = null, item = null) => {
    if (item) {
      setForm({
        id: item.id,
        entryType: item.entryType,
        amount: (item.amount || 0).toString(),
        paymentMode: item.paymentMode || 'CASH',
        category: item.category || '',
        description: item.description || '',
        referenceNo: item.referenceNo || '',
        entryDate: item.entryDate?.split('T')[0] || new Date().toISOString().split('T')[0],
      });
    } else {
      setForm({
        id: null,
        entryType: entryType || 'CASH_IN',
        amount: '',
        paymentMode: 'CASH',
        category: '',
        description: '',
        referenceNo: '',
        entryDate: new Date().toISOString().split('T')[0],
      });
    }
    setModalVisible(true);
  };

  const saveEntry = async () => {
    if (!form.amount || !form.description) {
      Alert.alert('Validation Error', 'Amount and description are required');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        entryType: form.entryType,
        amount: parseFloat(form.amount),
        paymentMode: form.paymentMode,
        description: form.description,
        entryDate: form.entryDate,
      };

      if (!form.id) {
        payload.restaurantId = selectedRestaurantId;
      }
      if (form.category) payload.category = form.category;
      if (form.referenceNo) payload.referenceNo = form.referenceNo;

      if (form.id) {
        await api.patch(`/owner/cashbook/${form.id}`, payload);
        Alert.alert('Success', 'Entry updated successfully');
      } else {
        await api.post('/owner/cashbook', payload);
        Alert.alert('Success', 'Entry added successfully');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save entry');
    } finally {
      setSaving(false);
    }
  };

  const deleteEntry = (item) => {
    Alert.alert(
      'Delete Entry',
      'This will permanently delete this cashbook entry. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/cashbook/${item.id}`);
              Alert.alert('Success', 'Entry deleted successfully');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  };

  const getEntryConfig = (entryType) => {
    return ENTRY_TYPES.find(t => t.value === entryType) || ENTRY_TYPES[0];
  };

  const renderStatsCards = () => {
    if (!stats) return null;

    return (
      <View style={styles.statsContainer}>
        {/* Cash Balance Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Icon name="wallet-outline" size={18} color={C.ink} />
            <Text style={styles.statsLabel}>Cash Balance</Text>
          </View>
          <Text style={styles.statsValue}>{formatPrice(stats.cashBalance)}</Text>
          <View style={styles.statsBreakdown}>
            <Text style={[styles.statsIn, { color: C.ok }]}>In: {formatPrice(stats.cashIn)}</Text>
            <Text style={[styles.statsOut, { color: C.danger }]}>Out: {formatPrice(stats.cashOut)}</Text>
          </View>
        </View>

        {/* Bank Balance Card */}
        <View style={styles.statsCard}>
          <View style={styles.statsHeader}>
            <Icon name="business-outline" size={18} color={C.ink} />
            <Text style={styles.statsLabel}>Bank Balance</Text>
          </View>
          <Text style={styles.statsValue}>{formatPrice(stats.bankBalance)}</Text>
          <View style={styles.statsBreakdown}>
            <Text style={[styles.statsIn, { color: C.ok }]}>In: {formatPrice(stats.bankIn)}</Text>
            <Text style={[styles.statsOut, { color: C.danger }]}>Out: {formatPrice(stats.bankOut)}</Text>
          </View>
        </View>

        {/* Total Balance Card */}
        <View style={[styles.statsCard, styles.totalCard]}>
          <View style={styles.statsHeader}>
            <Icon name="cash-outline" size={18} color={C.ink} />
            <Text style={styles.statsLabel}>Total Balance</Text>
          </View>
          <Text style={[
            styles.statsValue,
            { color: (stats.totalBalance || 0) >= 0 ? C.ok : C.danger }
          ]}>
            {formatPrice(stats.totalBalance)}
          </Text>
          <Text style={styles.statsCount}>{stats.totalEntries || 0} entries recorded</Text>
        </View>
      </View>
    );
  };

  const renderQuickActions = () => (
    <View style={styles.quickActionsCard}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <Text style={styles.sectionSubtitle}>Add common transactions quickly</Text>
      <View style={styles.quickActionsGrid}>
        {ENTRY_TYPES.map((type) => (
          <TouchableOpacity
            key={type.value}
            style={styles.quickActionBtn}
            onPress={() => openForm(type.value)}
          >
            <View style={[styles.quickActionIcon, { backgroundColor: type.bgColor }]}>
              <Icon name={type.icon} size={20} color={type.color} />
            </View>
            <Text style={styles.quickActionLabel}>{type.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const renderFilters = () => (
    <View style={styles.summaryFilterSection}>
      <View style={styles.filterHeader}>
        <Icon name="funnel" size={14} color={C.primary} />
        <Text style={styles.filterLabel}>Filter by Type</Text>
        {filterType !== 'all' && (
          <TouchableOpacity style={styles.clearFilterBtn} onPress={() => setFilterType('all')}>
            <Icon name="close-circle" size={16} color={C.muted} />
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryScroll}
      >
        {FILTER_OPTIONS.map(filterKey => {
          const config = FILTER_CONFIG[filterKey];
          const count = entryCounts[filterKey] || 0;
          const isActive = filterType === filterKey;

          return (
            <TouchableOpacity
              key={filterKey}
              onPress={() => setFilterType(filterKey)}
              style={[
                styles.summaryCard,
                isActive && styles.summaryCardActive,
                { borderColor: isActive ? config.color : C.border },
              ]}
              activeOpacity={0.7}
            >
              <View style={[styles.summaryIcon, { backgroundColor: config.bg }]}>
                <Icon name={config.icon} size={16} color={config.color} />
              </View>
              <Text style={[styles.summaryCount, isActive && { color: config.color }]}>
                {count}
              </Text>
              <Text style={[styles.summaryLabel, isActive && { color: config.color }]}>
                {config.label}
              </Text>
              {isActive && (
                <View style={[styles.summaryActiveBar, { backgroundColor: config.color }]} />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderEntryCard = ({ item }) => {
    const config = getEntryConfig(item.entryType);
    const isIncome = item.entryType.includes('IN');

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={[styles.entryIcon, { backgroundColor: config.bgColor }]}>
            <Icon name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.entryInfo}>
            <View style={styles.entryTitleRow}>
              <Text style={styles.entryTitle} numberOfLines={1}>{item.description}</Text>
              <View style={[styles.entryBadge, { backgroundColor: config.bgColor }]}>
                <Text style={[styles.entryBadgeText, { color: config.color }]}>{config.label}</Text>
              </View>
            </View>
            {item.category && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryText}>{item.category}</Text>
              </View>
            )}
            <View style={styles.entryMeta}>
              <Icon name="calendar-outline" size={12} color={C.muted} />
              <Text style={styles.entryMetaText}>
                {new Date(item.entryDate).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric'
                })}
              </Text>
              <Text style={styles.entryMetaDivider}>•</Text>
              <Text style={styles.entryMetaText}>{item.paymentMode?.replace('_', ' ')}</Text>
              {item.referenceNo && (
                <>
                  <Text style={styles.entryMetaDivider}>•</Text>
                  <Text style={styles.entryMetaText}>Ref: {item.referenceNo}</Text>
                </>
              )}
            </View>
          </View>
          <Text style={[styles.entryAmount, { color: isIncome ? C.ok : C.danger }]}>
            {isIncome ? '+' : '-'}{formatPrice(item.amount)}
          </Text>
        </View>
        <View style={styles.entryActions}>
          <TouchableOpacity style={styles.editBtn} onPress={() => openForm(null, item)}>
            <Icon name="pencil-outline" size={16} color={C.info} />
            <Text style={[styles.actionText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteEntry(item)}>
            <Icon name="trash-outline" size={16} color={C.danger} />
            <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {renderStatsCards()}
      {renderQuickActions()}
      {renderFilters()}
    </View>
  );

  if (loading && !refreshing && entries.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Cashbook</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (restaurants.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Cashbook</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="business-outline" size={80} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Please select a restaurant to view cashbook</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Cashbook</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => openForm()}>
            <Icon name="add-circle" size={28} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      <FlatList
        data={entries}
        keyExtractor={(item) => item.id}
        renderItem={renderEntryCard}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="wallet-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Entries Found</Text>
            <Text style={styles.emptyText}>Start tracking your cash and bank transactions</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add First Entry</Text>
            </TouchableOpacity>
          </View>
        }
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Entry' : 'Add New Entry'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {/* Entry Type Selector */}
              <Text style={styles.label}>Entry Type *</Text>
              <View style={styles.entryTypeGrid}>
                {ENTRY_TYPES.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.entryTypeBtn,
                      form.entryType === type.value && { backgroundColor: type.color, borderColor: type.color }
                    ]}
                    onPress={() => setForm(f => ({ ...f, entryType: type.value }))}
                  >
                    <Icon
                      name={type.icon}
                      size={18}
                      color={form.entryType === type.value ? '#fff' : type.color}
                    />
                    <Text style={[
                      styles.entryTypeBtnText,
                      form.entryType === type.value && { color: '#fff' }
                    ]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Amount */}
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount (e.g., 1000)"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={(v) => setForm(f => ({ ...f, amount: v }))}
              />

              {/* Payment Mode */}
              <Text style={styles.label}>Payment Mode</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {PAYMENT_MODES.map((mode) => (
                  <TouchableOpacity
                    key={mode}
                    style={[styles.modeChip, form.paymentMode === mode && styles.modeChipActive]}
                    onPress={() => setForm(f => ({ ...f, paymentMode: mode }))}
                  >
                    <Text style={[styles.modeText, form.paymentMode === mode && styles.modeTextActive]}>
                      {mode.replace('_', ' ')}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category */}
              <Text style={styles.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                <TouchableOpacity
                  style={[styles.categoryChip, !form.category && styles.categoryChipActive]}
                  onPress={() => setForm(f => ({ ...f, category: '' }))}
                >
                  <Text style={[styles.categoryChipText, !form.category && styles.categoryChipTextActive]}>
                    None
                  </Text>
                </TouchableOpacity>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryChip, form.category === cat && styles.categoryChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={[styles.categoryChipText, form.category === cat && styles.categoryChipTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Description */}
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]}
                placeholder="e.g., Monthly electricity bill"
                value={form.description}
                onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
                multiline
              />

              {/* Reference Number */}
              <Text style={styles.label}>Reference Number</Text>
              <TextInput
                style={styles.input}
                placeholder="Optional reference number"
                value={form.referenceNo}
                onChangeText={(v) => setForm(f => ({ ...f, referenceNo: v }))}
              />

              {/* Entry Date */}
              <Text style={styles.label}>Entry Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={form.entryDate}
                onChangeText={(v) => setForm(f => ({ ...f, entryDate: v }))}
              />

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveEntry} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{form.id ? 'Update' : 'Add Entry'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  list: { paddingBottom: 20 },

  // Restaurant selector
  restaurantRow: { paddingHorizontal: 16, paddingVertical: 12 },
  restaurantChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  restaurantChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  restaurantText: { fontSize: 13, fontWeight: '600', color: C.ink },
  restaurantTextActive: { color: '#fff' },

  // Stats cards
  statsContainer: { paddingHorizontal: 16, paddingTop: 12, gap: 12 },
  statsCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  totalCard: { marginBottom: 4 },
  statsHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  statsLabel: { fontSize: 13, fontWeight: '600', color: C.muted },
  statsValue: { fontSize: 24, fontWeight: '700', color: C.ink },
  statsBreakdown: { flexDirection: 'row', gap: 16, marginTop: 8 },
  statsIn: { fontSize: 12, fontWeight: '500' },
  statsOut: { fontSize: 12, fontWeight: '500' },
  statsCount: { fontSize: 12, color: C.muted, marginTop: 8 },

  // Quick Actions
  quickActionsCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  sectionSubtitle: { fontSize: 13, color: C.muted, marginTop: 2, marginBottom: 12 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  quickActionBtn: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  quickActionLabel: { fontSize: 13, fontWeight: '600', color: C.ink },

  // Stylish summary filter cards
  summaryFilterSection: { marginBottom: 12 },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  clearFilterBtn: { padding: 4 },
  summaryScroll: { paddingHorizontal: 16, gap: 10 },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    minWidth: 70,
    borderWidth: 2,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  summaryCardActive: {
    backgroundColor: '#FAFAFA',
    shadowOpacity: 0.1,
    elevation: 5,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '900',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
    textAlign: 'center',
  },
  summaryActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  // Legacy filters (keeping for reference)
  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  // Entry cards
  entryCard: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  entryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  entryInfo: { flex: 1 },
  entryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  entryTitle: { fontSize: 15, fontWeight: '600', color: C.ink, flex: 1 },
  entryBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  entryBadgeText: { fontSize: 11, fontWeight: '600' },
  categoryBadge: {
    backgroundColor: C.bg,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  categoryText: { fontSize: 11, fontWeight: '500', color: C.muted },
  entryMeta: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  entryMetaText: { fontSize: 11, color: C.muted },
  entryMetaDivider: { color: C.muted, marginHorizontal: 4 },
  entryAmount: { fontSize: 16, fontWeight: '700' },
  entryActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  editBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  deleteBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  actionText: { fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingVertical: 60 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalBody: { padding: 16 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 8, marginTop: 4 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 12,
  },

  entryTypeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  entryTypeBtn: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  entryTypeBtnText: { fontSize: 13, fontWeight: '600', color: C.ink },

  modeChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  modeChipActive: { backgroundColor: C.info, borderColor: C.info },
  modeText: { fontSize: 13, fontWeight: '600', color: C.ink },
  modeTextActive: { color: '#fff' },

  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  categoryChipActive: { backgroundColor: C.warn, borderColor: C.warn },
  categoryChipText: { fontSize: 12, fontWeight: '500', color: C.ink },
  categoryChipTextActive: { color: '#fff' },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
