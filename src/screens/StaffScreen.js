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

const getStatusColor = (status) => {
  const found = STAFF_STATUSES.find(s => s.value === status);
  return found?.color || C.muted;
};

const getStatusLabel = (status) => {
  const found = STAFF_STATUSES.find(s => s.value === status);
  return found?.label || status;
};

export default function StaffScreen({ navigation }) {
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
  const [staff, setStaff] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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

  const isEditMode = form.id !== null;

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant])
  );

  const loadData = async () => {
    if (!selectedRestaurant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(`/owner/staff?restaurantId=${selectedRestaurant}`);
      if (response.data.ok) {
        setStaff(response.data.data);
      }
    } catch (error) {
      console.error('Error loading staff:', error);
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
      // Convert from paise to rupees for display (divide by 100)
      const salaryValue = item.monthlySalary ? (item.monthlySalary / 100).toString() :
                          item.dailyWage ? (item.dailyWage / 100).toString() : '';
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

  const openActionModal = (item) => {
    setSelectedStaff(item);
    setActionModalVisible(true);
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
        status: form.status,
        joiningDate: form.joiningDate,
        ...(form.staffType === 'PART_TIME'
          ? { dailyWage: salaryValue }
          : { monthlySalary: salaryValue }
        ),
      };

      if (isEditMode) {
        // Update existing staff
        await api.patch(`/owner/staff/${form.id}`, payload);
        Alert.alert('Success', 'Staff updated successfully');
      } else {
        // Create new staff
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

  const handleStatusChange = async (newStatus) => {
    if (!selectedStaff) return;

    try {
      await api.patch(`/owner/staff/${selectedStaff.id}`, { status: newStatus });
      Alert.alert('Success', `Status updated to ${getStatusLabel(newStatus)}`);
      setActionModalVisible(false);
      setSelectedStaff(null);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleEdit = () => {
    setActionModalVisible(false);
    openForm(selectedStaff);
    setSelectedStaff(null);
  };

  const handleDelete = () => {
    if (!selectedStaff) return;

    if (selectedStaff.status === 'TERMINATED') {
      Alert.alert('Info', 'Staff member is already terminated');
      return;
    }

    Alert.alert(
      'Terminate Staff',
      `Are you sure you want to terminate ${selectedStaff.name}? This will mark them as terminated.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Terminate',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              await api.delete(`/owner/staff/${selectedStaff.id}`);
              Alert.alert('Success', 'Staff member terminated');
              setActionModalVisible(false);
              setSelectedStaff(null);
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to terminate staff');
            } finally {
              setDeleting(false);
            }
          }
        }
      ]
    );
  };

  const formatSalary = (item) => {
    if (item.monthlySalary) {
      return `₹${(item.monthlySalary / 100).toLocaleString('en-IN')}/month`;
    }
    if (item.dailyWage) {
      return `₹${(item.dailyWage / 100).toLocaleString('en-IN')}/day`;
    }
    return '-';
  };

  const renderStaffCard = ({ item }) => (
    <TouchableOpacity style={styles.card} onPress={() => openActionModal(item)}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <Icon name="person" size={24} color={C.primary} />
        </View>
        <View style={styles.cardInfo}>
          <Text style={styles.cardTitle}>{item.name}</Text>
          {item.designation && <Text style={styles.cardSub}>{item.designation}</Text>}
          {item.phone && (
            <View style={styles.phoneRow}>
              <Icon name="call-outline" size={12} color={C.muted} />
              <Text style={styles.phoneText}>{item.phone}</Text>
            </View>
          )}
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
          <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
            {getStatusLabel(item.status)}
          </Text>
        </View>
      </View>

      <View style={styles.salaryBox}>
        <View style={styles.salaryItem}>
          <Text style={styles.salaryLabel}>
            {item.monthlySalary ? 'Monthly Salary' : item.dailyWage ? 'Daily Wage' : 'Salary'}
          </Text>
          <Text style={styles.salaryValue}>{formatSalary(item)}</Text>
        </View>
        <View style={styles.salaryItem}>
          <Text style={styles.salaryLabel}>Type</Text>
          <Text style={styles.salaryValue}>
            {STAFF_TYPES.find(t => t.value === item.staffType)?.label || item.staffType}
          </Text>
        </View>
      </View>

      <View style={styles.cardFooter}>
        <TouchableOpacity style={styles.actionBtn} onPress={() => { setSelectedStaff(item); handleEdit(); }}>
          <Icon name="pencil-outline" size={16} color={C.info} />
          <Text style={[styles.actionText, { color: C.info }]}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={() => openActionModal(item)}>
          <Icon name="ellipsis-horizontal" size={16} color={C.muted} />
          <Text style={[styles.actionText, { color: C.muted }]}>More</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  if ((loading || restaurantsLoading) && !refreshing) {
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

  if (!hasRestaurants) {
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
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Restaurant Selector - Global */}
      <RestaurantSelectorBar />

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
              <Text style={styles.modalTitle}>{isEditMode ? 'Edit Staff' : 'Add Staff'}</Text>
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

              {isEditMode && (
                <>
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
                        <Text style={[styles.statusChipText, form.status === s.value && { color: '#fff' }]}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

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
                  <Text style={styles.saveText}>{isEditMode ? 'Save Changes' : 'Add Staff'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Action Modal */}
      <Modal visible={actionModalVisible} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.actionModalOverlay}
          activeOpacity={1}
          onPress={() => setActionModalVisible(false)}
        >
          <View style={styles.actionModalContent}>
            <View style={styles.actionModalHeader}>
              <Text style={styles.actionModalTitle}>{selectedStaff?.name}</Text>
              <Text style={styles.actionModalSubtitle}>{selectedStaff?.designation}</Text>
            </View>

            <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
              <Icon name="pencil-outline" size={20} color={C.info} />
              <Text style={styles.actionItemText}>Edit Details</Text>
            </TouchableOpacity>

            <View style={styles.actionDivider} />
            <Text style={styles.actionSectionTitle}>Change Status</Text>

            {STAFF_STATUSES.map(status => (
              <TouchableOpacity
                key={status.value}
                style={[
                  styles.actionItem,
                  selectedStaff?.status === status.value && styles.actionItemDisabled
                ]}
                onPress={() => handleStatusChange(status.value)}
                disabled={selectedStaff?.status === status.value}
              >
                <View style={[styles.statusIndicator, { backgroundColor: status.color }]} />
                <Text style={[
                  styles.actionItemText,
                  selectedStaff?.status === status.value && styles.actionItemTextDisabled
                ]}>
                  {status.label}
                  {selectedStaff?.status === status.value && ' (Current)'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={styles.actionDivider} />

            <TouchableOpacity
              style={[styles.actionItem, styles.actionItemDanger]}
              onPress={handleDelete}
              disabled={deleting || selectedStaff?.status === 'TERMINATED'}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <>
                  <Icon name="trash-outline" size={20} color={C.danger} />
                  <Text style={[styles.actionItemText, { color: C.danger }]}>
                    {selectedStaff?.status === 'TERMINATED' ? 'Already Terminated' : 'Terminate Staff'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCancelBtn}
              onPress={() => setActionModalVisible(false)}
            >
              <Text style={styles.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
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
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  phoneText: { fontSize: 12, color: C.muted },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  salaryBox: {
    flexDirection: 'row',
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  salaryItem: { flex: 1 },
  salaryLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  salaryValue: { fontSize: 14, fontWeight: '700', color: C.ink },

  cardFooter: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.bg,
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
  statusChipText: { fontSize: 12, fontWeight: '600', color: C.ink },

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

  // Action Modal Styles
  actionModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  actionModalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  actionModalHeader: {
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 8,
  },
  actionModalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  actionModalSubtitle: { fontSize: 14, color: C.muted, marginTop: 4 },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  actionItemDisabled: { opacity: 0.5 },
  actionItemDanger: { marginTop: 8 },
  actionItemText: { fontSize: 15, color: C.ink },
  actionItemTextDisabled: { color: C.muted },
  actionDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 8,
    marginHorizontal: 20,
  },
  actionSectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    paddingHorizontal: 20,
    paddingVertical: 8,
    textTransform: 'uppercase',
  },
  statusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  actionCancelBtn: {
    marginHorizontal: 20,
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  actionCancelText: { fontSize: 15, fontWeight: '600', color: C.ink },
});
