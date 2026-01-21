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

const PAYMENT_METHODS = ['Cash', 'Bank', 'UPI', 'Card', 'Other'];
const TRANSACTION_TYPES = ['CREDIT', 'DEBIT'];

export default function CashbookScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [summary, setSummary] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedType, setSelectedType] = useState('all');

  const [form, setForm] = useState({
    id: null,
    type: 'CREDIT',
    amount: '',
    description: '',
    paymentMethod: 'Cash',
    date: new Date().toISOString().split('T')[0],
    restaurantId: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant, selectedType])
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
        const params = new URLSearchParams({ restaurantId: selectedRestaurant });
        if (selectedType && selectedType !== 'all') {
          params.append('type', selectedType);
        }

        const response = await api.get(`/owner/cashbook?${params}`);
        if (response.data.ok) {
          setTransactions(response.data.data.transactions || []);
          setSummary(response.data.data.summary || {});
        }
      }
    } catch (error) {
      console.error('Error loading cashbook:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openForm = (item = null) => {
    if (item) {
      setForm({
        id: item.id,
        type: item.type || 'CREDIT',
        amount: item.amount?.toString() || '',
        description: item.description || '',
        paymentMethod: item.paymentMethod || 'Cash',
        date: item.date?.split('T')[0] || new Date().toISOString().split('T')[0],
        restaurantId: item.restaurantId?.toString() || selectedRestaurant?.toString() || '',
      });
    } else {
      setForm({
        id: null,
        type: 'CREDIT',
        amount: '',
        description: '',
        paymentMethod: 'Cash',
        date: new Date().toISOString().split('T')[0],
        restaurantId: selectedRestaurant?.toString() || '',
      });
    }
    setModalVisible(true);
  };

  const saveTransaction = async () => {
    if (!form.amount || !form.description) {
      Alert.alert('Error', 'Please fill in amount and description');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        type: form.type,
        amount: parseFloat(form.amount),
        description: form.description,
        paymentMethod: form.paymentMethod,
        date: form.date,
        restaurantId: parseInt(form.restaurantId),
      };

      if (form.id) {
        await api.put(`/owner/cashbook/${form.id}`, payload);
        Alert.alert('Success', 'Transaction updated successfully');
      } else {
        await api.post('/owner/cashbook', payload);
        Alert.alert('Success', 'Transaction added successfully');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = (item) => {
    Alert.alert(
      'Delete Transaction',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/cashbook/${item.id}`);
              Alert.alert('Success', 'Transaction deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete transaction');
            }
          }
        }
      ]
    );
  };

  const renderTransactionCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, item.type === 'CREDIT' ? styles.creditBg : styles.debitBg]}>
          <Icon
            name={item.type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
            size={24}
            color={item.type === 'CREDIT' ? C.ok : C.danger}
          />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.description}</Text>
          <View style={styles.metaRow}>
            <Icon name="calendar-outline" size={12} color={C.muted} />
            <Text style={styles.metaText}>{new Date(item.date).toLocaleDateString()}</Text>
            <Icon name="wallet-outline" size={12} color={C.muted} style={{ marginLeft: 12 }} />
            <Text style={styles.metaText}>{item.paymentMethod}</Text>
          </View>
        </View>
        <Text
          style={[
            styles.amountText,
            { color: item.type === 'CREDIT' ? C.ok : C.danger }
          ]}
        >
          {item.type === 'CREDIT' ? '+' : '-'}₹{item.amount}
        </Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}>
          <Icon name="pencil-outline" size={16} color={C.info} />
          <Text style={[styles.actionText, { color: C.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteTransaction(item)}>
          <Icon name="trash-outline" size={16} color={C.danger} />
          <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cashbook</Text>
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
          <Text style={styles.headerTitle}>Cashbook</Text>
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

  const balance = (summary.totalCredit || 0) - (summary.totalDebit || 0);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cashbook</Text>
        <TouchableOpacity onPress={() => openForm()}>
          <Icon name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Balance Card */}
      <View style={[styles.balanceCard, balance >= 0 ? styles.profit : styles.loss]}>
        <View style={styles.balanceHeader}>
          <Icon name="wallet" size={28} color={C.card} />
          <Text style={styles.balanceLabel}>Current Balance</Text>
        </View>
        <Text style={styles.balanceValue}>₹{Math.abs(balance).toFixed(2)}</Text>
        <View style={styles.balanceBreakdown}>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>In: ₹{summary.totalCredit || 0}</Text>
          </View>
          <View style={styles.breakdownItem}>
            <Text style={styles.breakdownLabel}>Out: ₹{summary.totalDebit || 0}</Text>
          </View>
        </View>
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

      {/* Type Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.typeRow}>
        <TouchableOpacity
          style={[styles.typeChip, selectedType === 'all' && styles.typeChipActive]}
          onPress={() => setSelectedType('all')}
        >
          <Text style={[styles.typeText, selectedType === 'all' && styles.typeTextActive]}>All</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeChip, selectedType === 'CREDIT' && styles.creditActive]}
          onPress={() => setSelectedType('CREDIT')}
        >
          <Icon name="arrow-down" size={14} color={selectedType === 'CREDIT' ? '#fff' : C.ok} />
          <Text style={[styles.typeText, selectedType === 'CREDIT' && styles.typeTextActive]}>Credit</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.typeChip, selectedType === 'DEBIT' && styles.debitActive]}
          onPress={() => setSelectedType('DEBIT')}
        >
          <Icon name="arrow-up" size={14} color={selectedType === 'DEBIT' ? '#fff' : C.danger} />
          <Text style={[styles.typeText, selectedType === 'DEBIT' && styles.typeTextActive]}>Debit</Text>
        </TouchableOpacity>
      </ScrollView>

      <FlatList
        data={transactions}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTransactionCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Transactions Yet</Text>
            <Text style={styles.emptyText}>Start tracking your cash flow</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Transaction</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Transaction' : 'Add Transaction'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Type *</Text>
              <View style={styles.typeSelector}>
                {TRANSACTION_TYPES.map(type => (
                  <TouchableOpacity
                    key={type}
                    style={[
                      styles.typeSelectorBtn,
                      form.type === type && (type === 'CREDIT' ? styles.creditSelected : styles.debitSelected)
                    ]}
                    onPress={() => setForm(f => ({ ...f, type }))}
                  >
                    <Icon
                      name={type === 'CREDIT' ? 'arrow-down' : 'arrow-up'}
                      size={20}
                      color={form.type === type ? '#fff' : C.muted}
                    />
                    <Text style={[styles.typeSelectorText, form.type === type && styles.typeSelectorTextActive]}>
                      {type}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />

              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={styles.input}
                placeholder="What is this for?"
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />

              <Text style={styles.label}>Payment Method</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {PAYMENT_METHODS.map(method => (
                  <TouchableOpacity
                    key={method}
                    style={[styles.methodChip, form.paymentMethod === method && styles.methodChipActive]}
                    onPress={() => setForm(f => ({ ...f, paymentMethod: method }))}
                  >
                    <Text style={[styles.methodText, form.paymentMethod === method && styles.methodTextActive]}>
                      {method}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-01-17"
                value={form.date}
                onChangeText={v => setForm(f => ({ ...f, date: v }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveTransaction} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>{form.id ? 'Save' : 'Add'}</Text>
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
  menuBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  balanceCard: {
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  profit: { backgroundColor: C.ok },
  loss: { backgroundColor: C.danger },
  balanceHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  balanceLabel: { fontSize: 15, color: C.card, marginLeft: 12, fontWeight: '600' },
  balanceValue: { fontSize: 36, fontWeight: '700', color: C.card },
  balanceBreakdown: { flexDirection: 'row', gap: 16, marginTop: 12 },
  breakdownItem: { flex: 1 },
  breakdownLabel: { fontSize: 13, color: C.card, opacity: 0.9 },

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

  typeRow: { paddingHorizontal: 16, paddingBottom: 12 },
  typeChip: {
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
  typeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  creditActive: { backgroundColor: C.ok, borderColor: C.ok },
  debitActive: { backgroundColor: C.danger, borderColor: C.danger },
  typeText: { fontSize: 13, fontWeight: '600', color: C.ink },
  typeTextActive: { color: '#fff' },

  list: { padding: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  creditBg: { backgroundColor: '#ECFDF5' },
  debitBg: { backgroundColor: '#FEF2F2' },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  metaText: { fontSize: 12, color: C.muted },
  amountText: { fontSize: 18, fontWeight: '700' },

  cardActions: { flexDirection: 'row', gap: 8 },
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

  emptyBox: { alignItems: 'center', paddingTop: 80 },
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

  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 8, marginTop: 12 },
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

  typeSelector: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  typeSelectorBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  creditSelected: { backgroundColor: C.ok, borderColor: C.ok },
  debitSelected: { backgroundColor: C.danger, borderColor: C.danger },
  typeSelectorText: { fontSize: 15, fontWeight: '600', color: C.muted },
  typeSelectorTextActive: { color: '#fff' },

  methodChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  methodChipActive: { backgroundColor: C.info, borderColor: C.info },
  methodText: { fontSize: 13, fontWeight: '600', color: C.ink },
  methodTextActive: { color: '#fff' },

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
});
