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
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
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

const CATEGORIES = [
  'Rent',
  'Utilities',
  'Groceries',
  'Staff Salary',
  'Equipment',
  'Maintenance',
  'Marketing',
  'Transportation',
  'Other',
];

const getCategoryIcon = (category) => {
  const icons = {
    'Rent': 'home-outline',
    'Utilities': 'flash-outline',
    'Groceries': 'cart-outline',
    'Staff Salary': 'people-outline',
    'Equipment': 'hardware-chip-outline',
    'Maintenance': 'construct-outline',
    'Marketing': 'megaphone-outline',
    'Transportation': 'car-outline',
    'Other': 'ellipsis-horizontal-outline',
  };
  return icons[category] || 'cash-outline';
};

export default function ExpensesScreen({ navigation }) {
  // Global restaurant context
  const {
    restaurants,
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState({});
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  const [form, setForm] = useState({
    id: null,
    category: '',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    restaurantId: '',
    receiptUrl: '',
  });
  const [receiptImage, setReceiptImage] = useState(null);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant, selectedCategory])
  );

  const loadData = async () => {
    if (!selectedRestaurant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({ restaurantId: selectedRestaurant });
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('category', selectedCategory);
      }

      const response = await api.get(`/owner/expenses?${params}`);
      if (response.data.ok) {
        setExpenses(response.data.data.expenses || []);
        setSummary(response.data.data.summary || {});
      }
    } catch (error) {
      console.error('Error loading expenses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const openForm = (item = null) => {
    if (item) {
      setForm({
        id: item.id,
        category: item.category || '',
        amount: item.amount?.toString() || '',
        description: item.description || '',
        expenseDate: item.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
        restaurantId: item.restaurantId?.toString() || selectedRestaurant?.toString() || '',
        receiptUrl: item.receiptUrl || '',
      });
      setReceiptImage(item.receiptUrl ? { uri: item.receiptUrl } : null);
    } else {
      setForm({
        id: null,
        category: '',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0],
        restaurantId: selectedRestaurant?.toString() || '',
        receiptUrl: '',
      });
      setReceiptImage(null);
    }
    setModalVisible(true);
  };

  const pickReceipt = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      (response) => {
        if (response.didCancel) {
          console.log('User cancelled receipt picker');
        } else if (response.error) {
          console.log('Receipt Picker Error:', response.error);
          Alert.alert('Error', 'Failed to select receipt image');
        } else if (response.assets && response.assets[0]) {
          setReceiptImage(response.assets[0]);
        }
      }
    );
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
      Alert.alert('Error', 'Please fill in category and amount');
      return;
    }

    setSaving(true);
    try {
      // Convert receipt to base64 if a new image was selected
      const receiptData = await convertReceiptToBase64();

      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || null,
        expenseDate: form.expenseDate,
        restaurantId: parseInt(form.restaurantId),
        receiptUrl: receiptData,
      };

      if (form.id) {
        await api.put(`/owner/expenses/${form.id}`, payload);
        Alert.alert('Success', 'Expense updated successfully');
      } else {
        await api.post('/owner/expenses', payload);
        Alert.alert('Success', 'Expense added successfully');
      }

      setModalVisible(false);
      setReceiptImage(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const deleteExpense = (item) => {
    Alert.alert(
      'Delete Expense',
      'Are you sure you want to delete this expense?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/expenses/${item.id}`);
              Alert.alert('Success', 'Expense deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete expense');
            }
          }
        }
      ]
    );
  };

  const renderExpenseCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Icon name={getCategoryIcon(item.category)} size={24} color={C.warn} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.category}</Text>
          {item.description && <Text style={styles.cardSub} numberOfLines={2}>{item.description}</Text>}
          <Text style={styles.dateText}>{new Date(item.expenseDate).toLocaleDateString()}</Text>
        </View>
        <Text style={styles.amountText}>₹{item.amount}</Text>
      </View>

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}>
          <Icon name="pencil-outline" size={16} color={C.info} />
          <Text style={[styles.actionText, { color: C.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteExpense(item)}>
          <Icon name="trash-outline" size={16} color={C.danger} />
          <Text style={[styles.actionText, { color: C.danger }]}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expenses</Text>
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

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expenses</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
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
        <Text style={styles.headerTitle}>Expenses</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => navigation.navigate('ExpenseReports')}
            style={styles.headerBtn}
          >
            <Icon name="bar-chart-outline" size={22} color={C.info} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openForm()} style={styles.headerBtn}>
            <Icon name="add-circle" size={28} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Summary Card */}
      {summary.total > 0 && (
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <Icon name="cash" size={28} color={C.card} />
            <Text style={styles.summaryLabel}>Total Expenses</Text>
          </View>
          <Text style={styles.summaryValue}>₹{summary.total}</Text>
          <Text style={styles.summarySubtext}>{summary.count} expenses recorded</Text>
        </View>
      )}

      {/* Restaurant Selector - Global */}
      <RestaurantSelectorBar />

      {/* Category Filter */}
      <View style={styles.filterSection}>
        <View style={styles.filterHeader}>
          <Icon name="pricetag" size={14} color={C.warn} />
          <Text style={styles.filterLabel}>Category</Text>
          {selectedCategory !== 'all' && (
            <TouchableOpacity
              style={styles.clearFilterBtn}
              onPress={() => setSelectedCategory('all')}
            >
              <Icon name="close-circle" size={16} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScrollContent}
        >
          <TouchableOpacity
            style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <View style={[styles.categoryIconBox, selectedCategory === 'all' && styles.categoryIconBoxActive]}>
              <Icon name="grid" size={14} color={selectedCategory === 'all' ? '#fff' : C.warn} />
            </View>
            <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
              All
            </Text>
            {selectedCategory === 'all' && (
              <View style={styles.categoryCheckIcon}>
                <Icon name="checkmark" size={10} color={C.warn} />
              </View>
            )}
          </TouchableOpacity>
          {CATEGORIES.map((cat, index) => {
            const isActive = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                onPress={() => setSelectedCategory(cat)}
              >
                <View style={[styles.categoryIconBox, isActive && styles.categoryIconBoxActive]}>
                  <Icon
                    name={getCategoryIcon(cat)}
                    size={14}
                    color={isActive ? '#fff' : C.warn}
                  />
                </View>
                <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                  {cat}
                </Text>
                {isActive && (
                  <View style={styles.categoryCheckIcon}>
                    <Icon name="checkmark" size={10} color={C.warn} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <FlatList
        data={expenses}
        keyExtractor={item => item.id.toString()}
        renderItem={renderExpenseCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Expenses Yet</Text>
            <Text style={styles.emptyText}>Track your expenses to manage finances</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Expense</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Expense' : 'Add Expense'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Category *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.roleChip, form.category === cat && styles.roleChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Icon
                      name={getCategoryIcon(cat)}
                      size={14}
                      color={form.category === cat ? '#fff' : C.ink}
                    />
                    <Text style={[styles.roleText, form.category === cat && styles.roleTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Amount (₹) *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter amount"
                keyboardType="numeric"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />

              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2026-01-17"
                value={form.expenseDate}
                onChangeText={v => setForm(f => ({ ...f, expenseDate: v }))}
              />

              <Text style={styles.label}>Description</Text>
              <TextInput
                style={[styles.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Add notes about this expense"
                multiline
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />

              <Text style={styles.label}>Receipt (Optional)</Text>
              {receiptImage ? (
                <View style={styles.receiptPreview}>
                  <Image
                    source={{ uri: receiptImage.uri }}
                    style={styles.receiptImage}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.receiptRemoveBtn}
                    onPress={() => setReceiptImage(null)}
                  >
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.receiptChangeBtn}
                    onPress={pickReceipt}
                  >
                    <Icon name="camera" size={16} color={C.primary} />
                    <Text style={styles.receiptChangeBtnText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.receiptUploadBtn} onPress={pickReceipt}>
                  <View style={styles.receiptUploadIcon}>
                    <Icon name="receipt-outline" size={28} color={C.muted} />
                  </View>
                  <Text style={styles.receiptUploadText}>Tap to upload receipt</Text>
                  <Text style={styles.receiptUploadHint}>PNG, JPG up to 5MB</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveExpense} disabled={saving}>
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
      <KniBottomNav navigation={navigation} active="khatabook" />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
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
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  summaryCard: {
    backgroundColor: C.warn,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
  },
  summaryHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: C.card, marginLeft: 8, fontWeight: '600' },
  summaryValue: { fontSize: 32, fontWeight: '700', color: C.card },
  summarySubtext: { fontSize: 13, color: C.card, opacity: 0.9, marginTop: 4 },

  filterSection: { marginBottom: 12 },
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
  categoryScrollContent: { paddingHorizontal: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryChipActive: { backgroundColor: C.warn, borderColor: C.warn },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryIconBoxActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.ink },
  categoryTextActive: { color: '#fff' },
  categoryCheckIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

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
    backgroundColor: '#FFFBEB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  dateText: { fontSize: 12, color: C.muted, marginTop: 4 },
  amountText: { fontSize: 18, fontWeight: '700', color: C.warn },

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

  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  roleChipActive: { backgroundColor: C.warn, borderColor: C.warn },
  roleText: { fontSize: 13, fontWeight: '600', color: C.ink },
  roleTextActive: { color: '#fff' },

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

  // Receipt upload styles
  receiptUploadBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
    backgroundColor: '#FAFAFA',
    marginBottom: 16,
  },
  receiptUploadIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  receiptUploadText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  receiptUploadHint: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
  },
  receiptPreview: {
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  receiptImage: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  receiptRemoveBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiptChangeBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#fff',
  },
  receiptChangeBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
});
