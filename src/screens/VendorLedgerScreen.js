import React, { useState, useCallback } from 'react';
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

const entryTypeLabels = {
  PURCHASE: 'Purchase',
  PAYMENT: 'Payment',
  CREDIT_NOTE: 'Credit Note',
  DEBIT_NOTE: 'Debit Note',
};

const entryTypeConfig = {
  PURCHASE: { bg: '#FEF2F2', color: C.danger, icon: 'arrow-down-circle' },
  PAYMENT: { bg: '#ECFDF5', color: C.ok, icon: 'arrow-up-circle' },
  CREDIT_NOTE: { bg: '#F3F4F6', color: C.muted, icon: 'document-text' },
  DEBIT_NOTE: { bg: '#FFFBEB', color: C.warn, icon: 'document' },
};

const paymentModes = ['CASH', 'BANK_TRANSFER', 'UPI', 'CHEQUE', 'CARD', 'OTHER'];

const formatPrice = (amount) => {
  const value = (amount || 0);
  return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export default function VendorLedgerScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [vendors, setVendors] = useState([]);
  const [entries, setEntries] = useState([]);
  const [summary, setSummary] = useState({
    totalVendors: 0,
    totalDue: 0,
    totalAdvance: 0,
    netBalance: 0,
  });
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' or 'transactions'
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  // Entry modal state
  const [entryModal, setEntryModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendorName: '',
    vendorPhone: '',
    vendorGST: '',
    entryType: 'PURCHASE',
    amount: '',
    paymentMode: 'CASH',
    description: '',
    billNumber: '',
    billDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    entryDate: new Date().toISOString().split('T')[0],
  });

  // Entry type picker modal
  const [entryTypePicker, setEntryTypePicker] = useState(false);
  const [paymentModePicker, setPaymentModePicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok) {
        const approvedRestaurants = restaurantsRes.data.data.filter(r => r.status === 'APPROVED');
        setRestaurants(approvedRestaurants);

        if (approvedRestaurants.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(approvedRestaurants[0].id);
          return;
        }
      }

      if (selectedRestaurant) {
        // Fetch vendor summary
        const summaryRes = await api.get(`/owner/vendor-ledger/summary?restaurantId=${selectedRestaurant}`);
        if (summaryRes.data.ok) {
          setVendors(summaryRes.data.data.vendors || []);
          setSummary(summaryRes.data.data.summary || { totalVendors: 0, totalDue: 0, totalAdvance: 0, netBalance: 0 });
        }

        // Fetch entries
        const entriesRes = await api.get(`/owner/vendor-ledger?restaurantId=${selectedRestaurant}`);
        if (entriesRes.data.ok) {
          setEntries(entriesRes.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading vendor ledger:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openEntryModal = (type = 'PURCHASE') => {
    setForm({
      vendorName: '',
      vendorPhone: '',
      vendorGST: '',
      entryType: type,
      amount: '',
      paymentMode: 'CASH',
      description: '',
      billNumber: '',
      billDate: new Date().toISOString().split('T')[0],
      dueDate: '',
      entryDate: new Date().toISOString().split('T')[0],
    });
    setEntryModal(true);
  };

  const saveEntry = async () => {
    if (!form.vendorName.trim()) {
      Alert.alert('Error', 'Vendor name is required');
      return;
    }

    if (!form.amount || parseFloat(form.amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    if (!form.description.trim()) {
      Alert.alert('Error', 'Description is required');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post('/owner/vendor-ledger', {
        restaurantId: selectedRestaurant,
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

  const selectVendorFromList = (vendor) => {
    setForm({
      ...form,
      vendorName: vendor.vendorName,
      vendorPhone: vendor.vendorPhone || '',
      vendorGST: vendor.vendorGST || '',
    });
  };

  const renderVendorCard = ({ item }) => (
    <View style={styles.vendorCard}>
      <View style={styles.vendorHeader}>
        <View style={styles.iconBox}>
          <Icon name="business" size={24} color={C.info} />
        </View>
        <View style={styles.vendorInfo}>
          <Text style={styles.vendorName}>{item.vendorName}</Text>
          {item.vendorGST && (
            <Text style={styles.vendorGST}>GST: {item.vendorGST}</Text>
          )}
          {item.vendorPhone && (
            <Text style={styles.vendorPhone}>{item.vendorPhone}</Text>
          )}
        </View>
      </View>

      <View style={styles.vendorStats}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Purchases</Text>
          <Text style={[styles.statValue, { color: C.danger }]}>{formatPrice(item.totalPurchases)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Payments</Text>
          <Text style={[styles.statValue, { color: C.ok }]}>{formatPrice(item.totalPayments)}</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Balance</Text>
          <Text style={[styles.statValue, { color: item.balance > 0 ? C.danger : item.balance < 0 ? C.ok : C.text }]}>
            {formatPrice(item.balance)}
          </Text>
        </View>
      </View>

      <View style={styles.vendorFooter}>
        <Text style={styles.lastTransaction}>
          Last: {formatDate(item.lastTransactionDate)}
        </Text>
        <View style={styles.vendorActions}>
          <TouchableOpacity
            style={[styles.vendorActionBtn, { backgroundColor: '#FEF2F2' }]}
            onPress={() => {
              selectVendorFromList(item);
              setForm(f => ({ ...f, entryType: 'PURCHASE' }));
              setEntryModal(true);
            }}
          >
            <Icon name="arrow-down-circle" size={16} color={C.danger} />
            <Text style={[styles.vendorActionText, { color: C.danger }]}>Purchase</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.vendorActionBtn, { backgroundColor: '#ECFDF5' }]}
            onPress={() => {
              selectVendorFromList(item);
              setForm(f => ({ ...f, entryType: 'PAYMENT' }));
              setEntryModal(true);
            }}
          >
            <Icon name="arrow-up-circle" size={16} color={C.ok} />
            <Text style={[styles.vendorActionText, { color: C.ok }]}>Payment</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderEntryCard = ({ item }) => {
    const config = entryTypeConfig[item.entryType] || entryTypeConfig.PURCHASE;
    const isDebit = item.entryType === 'PURCHASE' || item.entryType === 'DEBIT_NOTE';

    return (
      <View style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <View style={[styles.entryIconBox, { backgroundColor: config.bg }]}>
            <Icon name={config.icon} size={20} color={config.color} />
          </View>
          <View style={styles.entryInfo}>
            <Text style={styles.entryVendor}>{item.vendorName}</Text>
            <Text style={styles.entryDate}>{formatDate(item.entryDate)}</Text>
          </View>
          <View style={[styles.entryBadge, { backgroundColor: config.bg }]}>
            <Text style={[styles.entryBadgeText, { color: config.color }]}>
              {entryTypeLabels[item.entryType]}
            </Text>
          </View>
        </View>

        <Text style={styles.entryDescription} numberOfLines={2}>
          {item.description}
        </Text>

        {item.billNumber && (
          <Text style={styles.entryBill}>Bill #: {item.billNumber}</Text>
        )}

        <View style={styles.entryFooter}>
          <View>
            <Text style={styles.entryAmountLabel}>Amount</Text>
            <Text style={[styles.entryAmount, { color: isDebit ? C.danger : C.ok }]}>
              {isDebit ? '+' : '-'}{formatPrice(item.amount)}
            </Text>
          </View>
          <View style={styles.entryBalanceBox}>
            <Text style={styles.entryBalanceLabel}>Balance After</Text>
            <Text style={[styles.entryBalance, { color: item.balanceAfter > 0 ? C.danger : item.balanceAfter < 0 ? C.ok : C.text }]}>
              {formatPrice(item.balanceAfter)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: 40 }} />
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
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Vendor Ledger</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={80} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Please add a restaurant first</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Vendor Ledger</Text>
        <TouchableOpacity onPress={() => openEntryModal()}>
          <Icon name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards - Same as Web */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#EFF6FF' }]}>
            <Icon name="people" size={18} color={C.info} />
          </View>
          <Text style={styles.summaryLabel}>Vendors</Text>
          <Text style={styles.summaryValue}>{summary.totalVendors}</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEF2F2' }]}>
            <Icon name="trending-up" size={18} color={C.danger} />
          </View>
          <Text style={styles.summaryLabel}>Total Due</Text>
          <Text style={[styles.summaryValue, { color: C.danger }]}>{formatPrice(summary.totalDue)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#ECFDF5' }]}>
            <Icon name="trending-down" size={18} color={C.ok} />
          </View>
          <Text style={styles.summaryLabel}>Advance</Text>
          <Text style={[styles.summaryValue, { color: C.ok }]}>{formatPrice(summary.totalAdvance)}</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#F3F4F6' }]}>
            <Icon name="wallet" size={18} color={C.muted} />
          </View>
          <Text style={styles.summaryLabel}>Net</Text>
          <Text style={[styles.summaryValue, { color: summary.netBalance > 0 ? C.danger : C.ok }]}>
            {formatPrice(summary.netBalance)}
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#FEF2F2', borderColor: C.danger }]}
          onPress={() => openEntryModal('PURCHASE')}
        >
          <Icon name="arrow-down-circle" size={18} color={C.danger} />
          <Text style={[styles.actionBtnText, { color: C.danger }]}>Add Purchase</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: '#ECFDF5', borderColor: C.ok }]}
          onPress={() => openEntryModal('PAYMENT')}
        >
          <Icon name="arrow-up-circle" size={18} color={C.ok} />
          <Text style={[styles.actionBtnText, { color: C.ok }]}>Add Payment</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'summary' && styles.tabActive]}
          onPress={() => setActiveTab('summary')}
        >
          <Text style={[styles.tabText, activeTab === 'summary' && styles.tabTextActive]}>
            Vendor Summary
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'transactions' && styles.tabActive]}
          onPress={() => setActiveTab('transactions')}
        >
          <Text style={[styles.tabText, activeTab === 'transactions' && styles.tabTextActive]}>
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {restaurants.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterChip, selectedRestaurant === r.id && styles.filterChipActive]}
              onPress={() => setSelectedRestaurant(r.id)}
            >
              <Text style={[styles.filterText, selectedRestaurant === r.id && styles.filterTextActive]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Content based on tab */}
      {activeTab === 'summary' ? (
        <FlatList
          data={vendors}
          keyExtractor={item => item.vendorName}
          renderItem={renderVendorCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="business-outline" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Vendors Yet</Text>
              <Text style={styles.emptyText}>Add your first vendor transaction</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={entries}
          keyExtractor={item => item.id}
          renderItem={renderEntryCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="document-text-outline" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Transactions Yet</Text>
              <Text style={styles.emptyText}>Add a purchase or payment to get started</Text>
            </View>
          }
        />
      )}

      {/* Add Entry Modal */}
      <Modal visible={entryModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Add {entryTypeLabels[form.entryType] || 'Entry'}
              </Text>
              <TouchableOpacity onPress={() => setEntryModal(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              {/* Entry Type Selector */}
              <Text style={styles.label}>Entry Type *</Text>
              <TouchableOpacity
                style={styles.selectInput}
                onPress={() => setEntryTypePicker(true)}
              >
                <Text style={styles.selectText}>{entryTypeLabels[form.entryType]}</Text>
                <Icon name="chevron-down" size={20} color={C.muted} />
              </TouchableOpacity>

              {/* Vendor Name */}
              <Text style={styles.label}>Vendor Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter vendor name"
                value={form.vendorName}
                onChangeText={v => setForm(f => ({ ...f, vendorName: v }))}
                placeholderTextColor={C.muted}
              />

              {/* Vendor Phone & GST */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Phone</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Phone"
                    keyboardType="phone-pad"
                    value={form.vendorPhone}
                    onChangeText={v => setForm(f => ({ ...f, vendorPhone: v }))}
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>GST No.</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="GST Number"
                    value={form.vendorGST}
                    onChangeText={v => setForm(f => ({ ...f, vendorGST: v }))}
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>

              {/* Amount */}
              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="decimal-pad"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
                placeholderTextColor={C.muted}
              />

              {/* Payment Mode (only for PAYMENT type) */}
              {form.entryType === 'PAYMENT' && (
                <>
                  <Text style={styles.label}>Payment Mode</Text>
                  <TouchableOpacity
                    style={styles.selectInput}
                    onPress={() => setPaymentModePicker(true)}
                  >
                    <Text style={styles.selectText}>{form.paymentMode.replace('_', ' ')}</Text>
                    <Icon name="chevron-down" size={20} color={C.muted} />
                  </TouchableOpacity>
                </>
              )}

              {/* Description */}
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Enter description or notes"
                multiline
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
                placeholderTextColor={C.muted}
              />

              {/* Bill Details */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Bill Number</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Bill/Invoice #"
                    value={form.billNumber}
                    onChangeText={v => setForm(f => ({ ...f, billNumber: v }))}
                    placeholderTextColor={C.muted}
                  />
                </View>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Bill Date</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.billDate}
                    onChangeText={v => setForm(f => ({ ...f, billDate: v }))}
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>

              {/* Entry & Due Date */}
              <View style={styles.row}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Entry Date *</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    value={form.entryDate}
                    onChangeText={v => setForm(f => ({ ...f, entryDate: v }))}
                    placeholderTextColor={C.muted}
                  />
                </View>
                {form.entryType === 'PURCHASE' && (
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Due Date</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="YYYY-MM-DD"
                      value={form.dueDate}
                      onChangeText={v => setForm(f => ({ ...f, dueDate: v }))}
                      placeholderTextColor={C.muted}
                    />
                  </View>
                )}
              </View>

              <View style={{ height: 20 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setEntryModal(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}
                onPress={saveEntry}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Save Entry</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Entry Type Picker Modal */}
      <Modal visible={entryTypePicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setEntryTypePicker(false)}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Select Entry Type</Text>
            {Object.entries(entryTypeLabels).map(([key, label]) => {
              const config = entryTypeConfig[key];
              return (
                <TouchableOpacity
                  key={key}
                  style={[styles.pickerOption, form.entryType === key && styles.pickerOptionActive]}
                  onPress={() => {
                    setForm(f => ({ ...f, entryType: key }));
                    setEntryTypePicker(false);
                  }}
                >
                  <View style={[styles.pickerIconBox, { backgroundColor: config.bg }]}>
                    <Icon name={config.icon} size={20} color={config.color} />
                  </View>
                  <Text style={[styles.pickerOptionText, form.entryType === key && { color: C.primary }]}>
                    {label}
                  </Text>
                  {form.entryType === key && (
                    <Icon name="checkmark" size={20} color={C.primary} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Payment Mode Picker Modal */}
      <Modal visible={paymentModePicker} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setPaymentModePicker(false)}
        >
          <View style={styles.pickerContent}>
            <Text style={styles.pickerTitle}>Select Payment Mode</Text>
            {paymentModes.map(mode => (
              <TouchableOpacity
                key={mode}
                style={[styles.pickerOption, form.paymentMode === mode && styles.pickerOptionActive]}
                onPress={() => {
                  setForm(f => ({ ...f, paymentMode: mode }));
                  setPaymentModePicker(false);
                }}
              >
                <Text style={[styles.pickerOptionText, form.paymentMode === mode && { color: C.primary }]}>
                  {mode.replace('_', ' ')}
                </Text>
                {form.paymentMode === mode && (
                  <Icon name="checkmark" size={20} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
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
  menuBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  // Summary Grid
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: C.card,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryLabel: { fontSize: 11, color: C.muted, marginBottom: 2 },
  summaryValue: { fontSize: 16, fontWeight: '700', color: C.ink },

  // Action Row
  actionRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionBtnText: { fontSize: 13, fontWeight: '600' },

  // Tabs
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 12,
    backgroundColor: C.card,
    borderRadius: 10,
    padding: 4,
    borderWidth: 1,
    borderColor: C.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: { backgroundColor: C.primary },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: '#fff' },

  filterRow: { paddingHorizontal: 16, paddingVertical: 12 },
  filterChip: {
    paddingHorizontal: 16,
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

  list: { padding: 16, paddingBottom: 100 },

  // Vendor Card
  vendorCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  vendorHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: { flex: 1 },
  vendorName: { fontSize: 16, fontWeight: '700', color: C.ink },
  vendorGST: { fontSize: 11, color: C.muted, marginTop: 2 },
  vendorPhone: { fontSize: 12, color: C.muted, marginTop: 2 },
  vendorStats: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  statItem: { flex: 1, backgroundColor: C.bg, padding: 10, borderRadius: 8 },
  statLabel: { fontSize: 10, color: C.muted, marginBottom: 2 },
  statValue: { fontSize: 13, fontWeight: '700' },
  vendorFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  lastTransaction: { fontSize: 11, color: C.muted },
  vendorActions: { flexDirection: 'row', gap: 6 },
  vendorActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  vendorActionText: { fontSize: 12, fontWeight: '600' },

  // Entry Card
  entryCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  entryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  entryIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  entryInfo: { flex: 1 },
  entryVendor: { fontSize: 14, fontWeight: '700', color: C.ink },
  entryDate: { fontSize: 11, color: C.muted, marginTop: 2 },
  entryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  entryBadgeText: { fontSize: 10, fontWeight: '600' },
  entryDescription: { fontSize: 13, color: C.text, marginBottom: 8 },
  entryBill: { fontSize: 11, color: C.muted, marginBottom: 8 },
  entryFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  entryAmountLabel: { fontSize: 10, color: C.muted },
  entryAmount: { fontSize: 15, fontWeight: '700', marginTop: 2 },
  entryBalanceBox: { alignItems: 'flex-end' },
  entryBalanceLabel: { fontSize: 10, color: C.muted },
  entryBalance: { fontSize: 14, fontWeight: '700', marginTop: 2 },

  emptyBox: { alignItems: 'center', paddingTop: 60 },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
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
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  selectInput: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: C.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectText: { fontSize: 14, color: C.text },
  row: { flexDirection: 'row', gap: 12 },
  halfField: { flex: 1 },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
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

  // Picker Modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  pickerContent: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    width: '100%',
    maxWidth: 320,
  },
  pickerTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 16 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerOptionActive: { backgroundColor: '#FFF5F5' },
  pickerIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  pickerOptionText: { flex: 1, fontSize: 14, fontWeight: '600', color: C.text },
});
