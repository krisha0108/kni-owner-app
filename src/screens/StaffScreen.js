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

const ROLES = ['Chef', 'Waiter', 'Manager', 'Cleaner', 'Kitchen Helper', 'Cashier', 'Other'];

const STAFF_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time', icon: 'briefcase' },
  { value: 'PART_TIME', label: 'Part Time', icon: 'time' },
  { value: 'CONTRACT', label: 'Contract', icon: 'document-text' },
  { value: 'INTERN', label: 'Intern', icon: 'school' },
];

const STAFF_STATUSES = [
  { value: 'ACTIVE', label: 'Active', color: '#10B981' },
  { value: 'ON_LEAVE', label: 'On Leave', color: '#F59E0B' },
  { value: 'RESIGNED', label: 'Resigned', color: '#6B7280' },
  { value: 'TERMINATED', label: 'Terminated', color: '#EF4444' },
];

export default function StaffScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);

  const [form, setForm] = useState({
    id: null,
    name: '',
    phone: '',
    role: '',
    staffType: 'FULL_TIME',
    status: 'ACTIVE',
    salary: '',
    joiningDate: new Date().toISOString().split('T')[0],
    restaurantId: '',
  });

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Load restaurants first
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok) {
        const approvedRestaurants = restaurantsRes.data.data.filter(r => r.status === 'APPROVED');
        setRestaurants(approvedRestaurants);

        if (approvedRestaurants.length > 0 && !selectedRestaurant) {
          setSelectedRestaurant(approvedRestaurants[0].id);
        }
      }

      // Load staff if restaurant is selected
      if (selectedRestaurant) {
        const response = await api.get(`/owner/staff?restaurantId=${selectedRestaurant}`);
        if (response.data.ok) {
          setStaff(response.data.data);
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
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
      const salaryValue = item.monthlySalary ? item.monthlySalary.toString() :
                          item.dailyWage ? item.dailyWage.toString() : '';
      setForm({
        id: item.id,
        name: item.name || '',
        phone: item.phone || '',
        role: item.designation || '',
        staffType: item.staffType || 'FULL_TIME',
        status: item.status || 'ACTIVE',
        salary: salaryValue,
        joiningDate: item.joiningDate ? item.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
        restaurantId: item.restaurantId || selectedRestaurant || '',
      });
    } else {
      setForm({
        id: null,
        name: '',
        phone: '',
        role: '',
        staffType: 'FULL_TIME',
        status: 'ACTIVE',
        salary: '',
        joiningDate: new Date().toISOString().split('T')[0],
        restaurantId: selectedRestaurant || '',
      });
    }
    setModalVisible(true);
  };

  const saveStaff = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter staff name');
      return;
    }
    if (!form.phone || form.phone.length < 10) {
      Alert.alert('Error', 'Please enter a valid phone number (min 10 digits)');
      return;
    }
    if (!form.role) {
      Alert.alert('Error', 'Please select a role/designation');
      return;
    }
    if ((form.staffType === 'FULL_TIME' || form.staffType === 'CONTRACT') && !form.salary) {
      Alert.alert('Error', 'Please enter monthly salary');
      return;
    }
    if (form.staffType === 'PART_TIME' && !form.salary) {
      Alert.alert('Error', 'Please enter daily wage');
      return;
    }

    setSaving(true);
    try {
      const salaryValue = form.salary ? parseFloat(form.salary) : null;

      const payload = {
        restaurantId: form.restaurantId || selectedRestaurant,
        name: form.name,
        phone: form.phone,
        designation: form.role,
        staffType: form.staffType,
        joiningDate: form.joiningDate,
        ...(form.staffType === 'PART_TIME'
          ? { dailyWage: salaryValue }
          : { monthlySalary: salaryValue }
        ),
      };

      if (form.id) {
        await api.patch(`/owner/staff/${form.id}`, payload);
        Alert.alert('Success', 'Staff updated successfully');
      } else {
        await api.post('/owner/staff', payload);
        Alert.alert('Success', 'Staff added successfully');
      }

      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const deleteStaff = (item) => {
    Alert.alert(
      'Delete Staff',
      `Are you sure you want to delete ${item.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/staff/${item.id}`);
              Alert.alert('Success', 'Staff deleted');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete staff');
            }
          }
        }
      ]
    );
  };

  const renderStaffCard = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Icon name="person" size={24} color={C.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.role && <Text style={styles.cardSub}>{item.role}</Text>}
          {item.phone && (
            <View style={styles.phoneRow}>
              <Icon name="call-outline" size={12} color={C.muted} />
              <Text style={styles.phoneText}>{item.phone}</Text>
            </View>
          )}
        </View>
      </View>

      {item.salary && (
        <View style={styles.salaryBox}>
          <Text style={styles.salaryLabel}>Monthly Salary</Text>
          <Text style={styles.salaryValue}>₹{item.salary}</Text>
        </View>
      )}

      <View style={styles.cardActions}>
        <TouchableOpacity style={styles.editBtn} onPress={() => openForm(item)}>
          <Icon name="pencil-outline" size={16} color={C.info} />
          <Text style={[styles.actionText, { color: C.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteBtn} onPress={() => deleteStaff(item)}>
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
          <Text style={styles.headerTitle}>Staff Management</Text>
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
          <Text style={styles.headerTitle}>Staff Management</Text>
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
        <Text style={styles.headerTitle}>Staff Management</Text>
        <TouchableOpacity onPress={() => openForm()}>
          <Icon name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
          {restaurants.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.filterChip, selectedRestaurant === r.id && styles.filterChipActive]}
              onPress={() => {
                setSelectedRestaurant(r.id);
                setLoading(true);
                loadData();
              }}
            >
              <Text style={[styles.filterText, selectedRestaurant === r.id && styles.filterTextActive]}>
                {r.name}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      <FlatList
        data={staff}
        keyExtractor={item => item.id.toString()}
        renderItem={renderStaffCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="people-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Staff Yet</Text>
            <Text style={styles.emptyText}>Add your first staff member</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => openForm()}>
              <Icon name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Staff</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{form.id ? 'Edit Staff' : 'Add Staff'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Staff Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter name"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.label}>Phone *</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter phone number (min 10 digits)"
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              />

              <Text style={styles.label}>Role / Designation *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {ROLES.map(role => (
                  <TouchableOpacity
                    key={role}
                    style={[styles.roleChip, form.role === role && styles.roleChipActive]}
                    onPress={() => setForm(f => ({ ...f, role }))}
                  >
                    <Text style={[styles.roleText, form.role === role && styles.roleTextActive]}>
                      {role}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.label}>Employment Type</Text>
              <View style={styles.typeRow}>
                {STAFF_TYPES.map(type => (
                  <TouchableOpacity
                    key={type.value}
                    style={[styles.typeChip, form.staffType === type.value && styles.typeChipActive]}
                    onPress={() => setForm(f => ({ ...f, staffType: type.value }))}
                  >
                    <Icon
                      name={type.icon}
                      size={14}
                      color={form.staffType === type.value ? '#fff' : C.ink}
                    />
                    <Text style={[styles.typeText, form.staffType === type.value && styles.typeTextActive]}>
                      {type.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Status</Text>
              <View style={styles.statusRow}>
                {STAFF_STATUSES.map(s => (
                  <TouchableOpacity
                    key={s.value}
                    style={[
                      styles.statusChip,
                      form.status === s.value && { backgroundColor: s.color, borderColor: s.color }
                    ]}
                    onPress={() => setForm(f => ({ ...f, status: s.value }))}
                  >
                    <View style={[styles.statusDot, { backgroundColor: form.status === s.value ? '#fff' : s.color }]} />
                    <Text style={[styles.statusText, form.status === s.value && { color: '#fff' }]}>
                      {s.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Joining Date *</Text>
              <TextInput
                style={styles.input}
                placeholder="YYYY-MM-DD"
                value={form.joiningDate}
                onChangeText={v => setForm(f => ({ ...f, joiningDate: v }))}
              />

              <Text style={styles.label}>
                {form.staffType === 'PART_TIME' ? 'Daily Wage (₹) *' : 'Monthly Salary (₹) *'}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={form.staffType === 'PART_TIME' ? 'Enter daily wage' : 'Enter monthly salary'}
                keyboardType="numeric"
                value={form.salary}
                onChangeText={v => setForm(f => ({ ...f, salary: v }))}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveStaff} disabled={saving}>
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
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneText: { fontSize: 12, color: C.muted },

  salaryBox: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  salaryLabel: { fontSize: 13, color: C.muted },
  salaryValue: { fontSize: 16, fontWeight: '700', color: C.ok },

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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  roleChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  roleText: { fontSize: 13, fontWeight: '600', color: C.ink },
  roleTextActive: { color: '#fff' },

  // Staff type styles
  typeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  typeChipActive: { backgroundColor: C.info, borderColor: C.info },
  typeText: { fontSize: 12, fontWeight: '600', color: C.ink },
  typeTextActive: { color: '#fff' },

  // Staff status styles
  statusRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: { fontSize: 12, fontWeight: '600', color: C.ink },

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
