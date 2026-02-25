/**
 * ============================================================================
 * STAFF MANAGEMENT SCREEN - PREMIUM GOD LEVEL DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
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
  Platform,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
// Premium Color Palette
const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEE2E2',
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
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
};

const ROLES = [
  { value: 'Chef', icon: 'restaurant', color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'Waiter', icon: 'cafe', color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'Manager', icon: 'briefcase', color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'Cleaner', icon: 'sparkles', color: '#06B6D4', bg: '#CFFAFE' },
  { value: 'Kitchen Helper', icon: 'flame', color: '#EF4444', bg: '#FEE2E2' },
  { value: 'Cashier', icon: 'cash', color: '#10B981', bg: '#D1FAE5' },
  { value: 'Other', icon: 'person', color: '#6B7280', bg: '#F3F4F6' },
];

const STAFF_TYPES = [
  { value: 'FULL_TIME', label: 'Full Time', icon: 'briefcase', color: C.info, bg: C.infoLight },
  { value: 'PART_TIME', label: 'Part Time', icon: 'time', color: C.warning, bg: C.warningLight },
  { value: 'CONTRACT', label: 'Contract', icon: 'document-text', color: C.purple, bg: C.purpleLight },
  { value: 'INTERN', label: 'Intern', icon: 'school', color: C.success, bg: C.successLight },
];

const STAFF_STATUSES = [
  { value: 'ACTIVE', label: 'Active', icon: 'checkmark-circle', color: '#10B981', bg: '#D1FAE5' },
  { value: 'ON_LEAVE', label: 'On Leave', icon: 'airplane', color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'RESIGNED', label: 'Resigned', icon: 'exit', color: '#6B7280', bg: '#F3F4F6' },
  { value: 'TERMINATED', label: 'Terminated', icon: 'close-circle', color: '#EF4444', bg: '#FEE2E2' },
];

const getRoleConfig = (role) => ROLES.find(r => r.value === role) || ROLES[6];
const getTypeConfig = (type) => STAFF_TYPES.find(t => t.value === type) || STAFF_TYPES[0];
const getStatusConfig = (status) => STAFF_STATUSES.find(s => s.value === status) || STAFF_STATUSES[0];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatSalary = (item) => {
  if (item.monthlySalary) return `₹${item.monthlySalary.toLocaleString('en-IN')}/mo`;
  if (item.dailyWage) return `₹${item.dailyWage.toLocaleString('en-IN')}/day`;
  return '-';
};

export default function StaffScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const isLargePhone = width >= 400;

  const {
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
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [modalKey, setModalKey] = useState(0);

  const statusCounts = useMemo(() => {
    const counts = { all: staff.length, ACTIVE: 0, ON_LEAVE: 0, RESIGNED: 0, TERMINATED: 0 };
    staff.forEach(s => { if (counts[s.status] !== undefined) counts[s.status]++; });
    return counts;
  }, [staff]);

  const filteredStaff = useMemo(() => {
    if (activeStatusTab === 'all') return staff;
    return staff.filter(s => s.status === activeStatusTab);
  }, [staff, activeStatusTab]);

  const [form, setForm] = useState({
    id: null, name: '', phone: '', role: '', staffType: 'FULL_TIME',
    status: 'ACTIVE', salary: '', joiningDate: new Date().toISOString().split('T')[0],
    restaurantId: '',
  });

  const isEditMode = form.id !== null;

  useFocusEffect(useCallback(() => { loadData(); }, [selectedRestaurant]));

  const loadData = async () => {
    if (!selectedRestaurant) { setLoading(false); return; }
    try {
      setLoading(true);
      const response = await api.get(`/owner/staff?restaurantId=${selectedRestaurant}`);
      if (response.data.ok) setStaff(response.data.data);
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

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm(f => ({ ...f, joiningDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const openForm = (item = null) => {
    setModalKey(k => k + 1); // Force ScrollView re-render
    if (item) {
      const salaryValue = item.monthlySalary ? item.monthlySalary.toString() : item.dailyWage ? item.dailyWage.toString() : '';
      setForm({
        id: item.id, name: item.name || '', phone: item.phone || '',
        role: item.designation || '', staffType: item.staffType || 'FULL_TIME',
        status: item.status || 'ACTIVE', salary: salaryValue,
        joiningDate: item.joiningDate ? item.joiningDate.split('T')[0] : new Date().toISOString().split('T')[0],
        restaurantId: item.restaurantId || selectedRestaurant || '',
      });
    } else {
      setForm({
        id: null, name: '', phone: '', role: '', staffType: 'FULL_TIME',
        status: 'ACTIVE', salary: '', joiningDate: new Date().toISOString().split('T')[0],
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
    if (!form.name.trim()) { Alert.alert('Error', 'Please enter staff name'); return; }
    if (!form.phone || form.phone.length < 10) { Alert.alert('Error', 'Please enter valid phone (min 10 digits)'); return; }
    if (!form.role) { Alert.alert('Error', 'Please select a role'); return; }
    if (!form.salary) { Alert.alert('Error', 'Please enter salary/wage'); return; }

    setSaving(true);
    try {
      const salaryValue = parseFloat(form.salary);
      const payload = {
        restaurantId: form.restaurantId || selectedRestaurant,
        name: form.name, phone: form.phone, designation: form.role,
        staffType: form.staffType, status: form.status, joiningDate: form.joiningDate,
        ...(form.staffType === 'PART_TIME' ? { dailyWage: salaryValue } : { monthlySalary: salaryValue }),
      };

      if (isEditMode) {
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

  const handleStatusChange = async (newStatus) => {
    if (!selectedStaff) return;
    try {
      await api.patch(`/owner/staff/${selectedStaff.id}`, { status: newStatus });
      Alert.alert('Success', `Status updated to ${getStatusConfig(newStatus).label}`);
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
    if (!selectedStaff || selectedStaff.status === 'TERMINATED') return;
    Alert.alert('Terminate Staff', `Are you sure you want to terminate ${selectedStaff.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/owner/staff/${selectedStaff.id}`);
            Alert.alert('Success', 'Staff terminated');
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
    ]);
  };

  // ==================== RENDER STAFF CARD ====================
  const renderStaffCard = ({ item }) => {
    const roleConfig = getRoleConfig(item.designation);
    const statusConfig = getStatusConfig(item.status);
    const typeConfig = getTypeConfig(item.staffType);

    return (
      <TouchableOpacity style={[st.card, isTablet && st.cardTablet]} onPress={() => openActionModal(item)} activeOpacity={0.7}>
        {/* Header */}
        <View style={st.cardHeader}>
          <View style={[st.avatar, { backgroundColor: roleConfig.bg }]}>
            <Icon name={roleConfig.icon} size={scale(24)} color={roleConfig.color} />
          </View>
          <View style={st.cardInfo}>
            <Text style={st.cardName}>{item.name}</Text>
            <Text style={st.cardRole}>{item.designation || 'No Role'}</Text>
          </View>
          <View style={[st.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <View style={[st.statusDot, { backgroundColor: statusConfig.color }]} />
            <Text style={[st.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Details Grid */}
        <View style={st.detailsGrid}>
          <View style={st.detailItem}>
            <View style={st.detailIconBox}>
              <Icon name="call-outline" size={scale(14)} color={C.muted} />
            </View>
            <Text style={st.detailValue}>{item.phone || '-'}</Text>
          </View>
          <View style={st.detailItem}>
            <View style={st.detailIconBox}>
              <Icon name="calendar-outline" size={scale(14)} color={C.muted} />
            </View>
            <Text style={st.detailValue}>{formatDate(item.joiningDate)}</Text>
          </View>
        </View>

        {/* Salary & Type Row */}
        <View style={st.infoRow}>
          <View style={[st.infoChip, { backgroundColor: C.successLight }]}>
            <Icon name="cash-outline" size={scale(14)} color={C.success} />
            <Text style={[st.infoChipText, { color: C.success }]}>{formatSalary(item)}</Text>
          </View>
          <View style={[st.infoChip, { backgroundColor: typeConfig.bg }]}>
            <Icon name={typeConfig.icon} size={scale(14)} color={typeConfig.color} />
            <Text style={[st.infoChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(item)}>
            <Icon name="pencil" size={scale(16)} color={C.info} />
            <Text style={[st.actionBtnText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.bg }]} onPress={() => openActionModal(item)}>
            <Icon name="ellipsis-horizontal" size={scale(16)} color={C.muted} />
            <Text style={[st.actionBtnText, { color: C.muted }]}>More</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Stats Summary */}
      <View style={st.statsContainer}>
        <View style={[st.statCard, { backgroundColor: C.primaryLight }]}>
          <Icon name="people" size={scale(24)} color={C.primary} />
          <Text style={[st.statValue, { color: C.primary }]}>{staff.length}</Text>
          <Text style={st.statLabel}>Total Staff</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: C.successLight }]}>
          <Icon name="checkmark-circle" size={scale(24)} color={C.success} />
          <Text style={[st.statValue, { color: C.success }]}>{statusCounts.ACTIVE}</Text>
          <Text style={st.statLabel}>Active</Text>
        </View>
        <View style={[st.statCard, { backgroundColor: C.warningLight }]}>
          <Icon name="airplane" size={scale(24)} color={C.warning} />
          <Text style={[st.statValue, { color: C.warning }]}>{statusCounts.ON_LEAVE}</Text>
          <Text style={st.statLabel}>On Leave</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={st.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
          {['all', ...STAFF_STATUSES.map(s => s.value)].map(statusKey => {
            const isActive = activeStatusTab === statusKey;
            const config = statusKey === 'all'
              ? { label: 'All', color: C.ink, bg: C.bg, icon: 'grid' }
              : getStatusConfig(statusKey);
            const count = statusCounts[statusKey] || 0;

            return (
              <TouchableOpacity
                key={statusKey}
                style={[st.filterChip, isActive && { backgroundColor: config.color, borderColor: config.color }]}
                onPress={() => setActiveStatusTab(statusKey)}
              >
                <Icon name={config.icon} size={scale(16)} color={isActive ? '#fff' : config.color} />
                <Text style={[st.filterChipText, isActive && { color: '#fff' }]}>{config.label} ({count})</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Count */}
      <View style={st.resultsRow}>
        <Text style={st.resultsText}>{filteredStaff.length} Staff Member{filteredStaff.length !== 1 ? 's' : ''}</Text>
        {activeStatusTab !== 'all' && (
          <TouchableOpacity style={st.clearBtn} onPress={() => setActiveStatusTab('all')}>
            <Icon name="close-circle" size={scale(14)} color={C.primary} />
            <Text style={st.clearBtnText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Staff Management</Text>
            <Text style={st.headerSubtitle}>Manage your team</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading staff...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Staff Management</Text>
            <Text style={st.headerSubtitle}>Manage your team</Text>
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
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Staff Management</Text>
          <Text style={st.headerSubtitle}>Manage your team</Text>
        </View>
        <View style={st.headerActions}>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="person-add" size={scale(20)} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Staff List */}
      <FlatList
        data={filteredStaff}
        keyExtractor={item => item.id.toString()}
        renderItem={renderStaffCard}
        numColumns={isTablet ? 2 : 1}
        key={`grid-${isTablet ? 2 : 1}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={isTablet ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Icon name="people-outline" size={scale(64)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>{staff.length === 0 ? 'No Staff Yet' : 'No Results'}</Text>
            <Text style={st.emptySubtitle}>
              {staff.length === 0 ? 'Add your first team member' : 'No matching staff found'}
            </Text>
            {staff.length === 0 && (
              <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
                <Icon name="add" size={scale(18)} color="#fff" />
                <Text style={st.emptyBtnText}>Add Staff</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* ========== ADD/EDIT MODAL ========== */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{isEditMode ? 'Edit Staff' : 'Add Staff'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              key={`modal-scroll-${modalKey}`}
              style={st.modalBody}
              contentContainerStyle={st.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled={true}
              bounces={true}
            >
              <View style={{ minHeight: scale(650) }}>
              {/* Name */}
              <Text style={st.label}>Full Name *</Text>
              <TextInput
                style={st.input}
                placeholder="Enter staff name"
                placeholderTextColor={C.muted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              {/* Phone */}
              <Text style={st.label}>Phone Number *</Text>
              <TextInput
                style={st.input}
                placeholder="Enter phone number"
                placeholderTextColor={C.muted}
                keyboardType="phone-pad"
                value={form.phone}
                onChangeText={v => setForm(f => ({ ...f, phone: v }))}
              />

              {/* Role */}
              <Text style={st.label}>Role / Designation *</Text>
              <View style={st.roleGrid}>
                {ROLES.map(role => {
                  const isSelected = form.role === role.value;
                  return (
                    <TouchableOpacity
                      key={role.value}
                      style={[st.roleChip, isSelected && { backgroundColor: role.color, borderColor: role.color }]}
                      onPress={() => setForm(f => ({ ...f, role: role.value }))}
                    >
                      <Icon name={role.icon} size={scale(16)} color={isSelected ? '#fff' : role.color} />
                      <Text style={[st.roleChipText, isSelected && { color: '#fff' }]}>{role.value}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Employment Type */}
              <Text style={st.label}>Employment Type</Text>
              <View style={st.typeGrid}>
                {STAFF_TYPES.map(type => {
                  const isSelected = form.staffType === type.value;
                  return (
                    <TouchableOpacity
                      key={type.value}
                      style={[st.typeChip, isSelected && { backgroundColor: type.color, borderColor: type.color }]}
                      onPress={() => setForm(f => ({ ...f, staffType: type.value }))}
                    >
                      <Icon name={type.icon} size={scale(16)} color={isSelected ? '#fff' : type.color} />
                      <Text style={[st.typeChipText, isSelected && { color: '#fff' }]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status (Edit Mode) */}
              {isEditMode && (
                <>
                  <Text style={st.label}>Status</Text>
                  <View style={st.statusGrid}>
                    {STAFF_STATUSES.map(s => {
                      const isSelected = form.status === s.value;
                      return (
                        <TouchableOpacity
                          key={s.value}
                          style={[st.statusChip, isSelected && { backgroundColor: s.color, borderColor: s.color }]}
                          onPress={() => setForm(f => ({ ...f, status: s.value }))}
                        >
                          <Icon name={s.icon} size={scale(14)} color={isSelected ? '#fff' : s.color} />
                          <Text style={[st.statusChipText, isSelected && { color: '#fff' }]}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Joining Date */}
              <Text style={st.label}>Joining Date</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowDatePicker(true)}>
                <Icon name="calendar" size={scale(20)} color={C.primary} />
                <Text style={st.dateBtnText}>{formatDate(form.joiningDate)}</Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
              {showDatePicker && (
                <DateTimePicker
                  value={form.joiningDate ? new Date(form.joiningDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Salary */}
              <Text style={st.label}>{form.staffType === 'PART_TIME' ? 'Daily Wage (₹) *' : 'Monthly Salary (₹) *'}</Text>
              <View style={st.salaryInputRow}>
                <View style={st.currencyBox}>
                  <Text style={st.currencyText}>₹</Text>
                </View>
                <TextInput
                  style={st.salaryInput}
                  placeholder={form.staffType === 'PART_TIME' ? 'Enter daily wage' : 'Enter monthly salary'}
                  placeholderTextColor={C.muted}
                  keyboardType="numeric"
                  value={form.salary}
                  onChangeText={v => setForm(f => ({ ...f, salary: v }))}
                />
              </View>

              <View style={{ height: scale(30) }} />
              </View>
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveStaff} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name={isEditMode ? 'checkmark' : 'add'} size={scale(18)} color="#fff" />
                    <Text style={st.saveBtnText}>{isEditMode ? 'Update' : 'Add Staff'}</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== ACTION MODAL ========== */}
      <Modal visible={actionModalVisible} animationType="fade" transparent>
        <TouchableOpacity style={st.actionOverlay} activeOpacity={1} onPress={() => setActionModalVisible(false)}>
          <View style={st.actionContent}>
            {/* Header */}
            <View style={st.actionHeader}>
              <Text style={st.actionTitle}>{selectedStaff?.name}</Text>
              <Text style={st.actionSubtitle}>{selectedStaff?.designation}</Text>
            </View>

            {/* Edit Option */}
            <TouchableOpacity style={st.actionItem} onPress={handleEdit}>
              <Icon name="pencil-outline" size={scale(20)} color={C.info} />
              <Text style={st.actionItemText}>Edit Details</Text>
            </TouchableOpacity>

            <View style={st.actionDivider} />
            <Text style={st.actionSectionTitle}>Change Status</Text>

            {/* Status Options */}
            {STAFF_STATUSES.map(status => (
              <TouchableOpacity
                key={status.value}
                style={[st.actionItem, selectedStaff?.status === status.value && st.actionItemDisabled]}
                onPress={() => handleStatusChange(status.value)}
                disabled={selectedStaff?.status === status.value}
              >
                <View style={[st.statusIndicator, { backgroundColor: status.color }]} />
                <Text style={[st.actionItemText, selectedStaff?.status === status.value && st.actionItemTextDisabled]}>
                  {status.label}
                  {selectedStaff?.status === status.value && ' (Current)'}
                </Text>
              </TouchableOpacity>
            ))}

            <View style={st.actionDivider} />

            {/* Terminate Option */}
            <TouchableOpacity
              style={[st.actionItem, st.actionItemDanger]}
              onPress={handleDelete}
              disabled={deleting || selectedStaff?.status === 'TERMINATED'}
            >
              {deleting ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <>
                  <Icon name="trash-outline" size={scale(20)} color={C.danger} />
                  <Text style={[st.actionItemText, { color: C.danger }]}>
                    {selectedStaff?.status === 'TERMINATED' ? 'Already Terminated' : 'Terminate Staff'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity style={st.actionCancelBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={st.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
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

  // Stats
  statsContainer: { flexDirection: 'row', paddingHorizontal: scale(16), paddingVertical: scale(16) },
  statCard: { flex: 1, alignItems: 'center', padding: scale(12), borderRadius: scale(12), marginHorizontal: scale(4) },
  statValue: { fontSize: moderateScale(24), fontWeight: '800', marginTop: scale(6) },
  statLabel: { fontSize: moderateScale(11), fontWeight: '600', color: C.muted, marginTop: scale(2) },

  // Filters
  filterContainer: { paddingVertical: scale(12), backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { paddingHorizontal: scale(16) },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), paddingVertical: scale(10), marginRight: scale(8), borderRadius: scale(20), backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink, marginLeft: scale(6) },

  // Results
  resultsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12) },
  resultsText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.primaryLight, borderRadius: scale(8) },
  clearBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.primary, marginLeft: scale(4) },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { backgroundColor: C.card, borderRadius: scale(16), padding: scale(16), marginBottom: scale(12), borderWidth: 1, borderColor: C.border },
  cardTablet: { flex: 1, marginHorizontal: scale(6), maxWidth: '48%' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
  avatar: { width: scale(52), height: scale(52), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: scale(12) },
  cardName: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  cardRole: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(20) },
  statusDot: { width: scale(6), height: scale(6), borderRadius: scale(3), marginRight: scale(6) },
  statusText: { fontSize: moderateScale(11), fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', marginBottom: scale(12) },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  detailIconBox: { width: scale(28), height: scale(28), borderRadius: scale(8), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: scale(8) },
  detailValue: { fontSize: moderateScale(13), fontWeight: '600', color: C.text },

  infoRow: { flexDirection: 'row', marginBottom: scale(14) },
  infoChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8), marginRight: scale(8) },
  infoChipText: { fontSize: moderateScale(12), fontWeight: '700', marginLeft: scale(5) },

  cardActions: { flexDirection: 'row', paddingTop: scale(12), borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), borderRadius: scale(10), marginHorizontal: scale(4) },
  actionBtnText: { fontSize: moderateScale(13), fontWeight: '600', marginLeft: scale(6) },

  // Empty & Loading
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.primary, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(20), borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  modalClose: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: scale(20), paddingBottom: scale(30) },
  modalFooter: { flexDirection: 'row', padding: scale(20), borderTopWidth: 1, borderTopColor: C.border },

  // Form
  label: { fontSize: moderateScale(13), fontWeight: '700', color: C.text, marginBottom: scale(10), marginTop: scale(16) },
  input: { backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(14), fontSize: moderateScale(15), color: C.text, borderWidth: 1.5, borderColor: C.border },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  roleChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  roleChipText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginLeft: scale(6) },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  typeChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  typeChipText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginLeft: scale(6) },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: scale(-4) },
  statusChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border, margin: scale(4) },
  statusChipText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginLeft: scale(6) },

  dateBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  dateBtnText: { flex: 1, fontSize: moderateScale(15), fontWeight: '600', color: C.ink, marginLeft: scale(10) },

  salaryInputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: scale(50), height: scale(50), backgroundColor: C.successLight, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: moderateScale(18), fontWeight: '700', color: C.success },
  salaryInput: { flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(15), fontWeight: '600', color: C.ink },

  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', marginRight: scale(8) },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.primary, marginLeft: scale(8) },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Action Modal
  actionOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  actionContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), paddingTop: scale(8), paddingBottom: scale(24) },
  actionHeader: { alignItems: 'center', paddingVertical: scale(16), borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: scale(8) },
  actionTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  actionSubtitle: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(4) },

  actionItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: scale(14), paddingHorizontal: scale(20) },
  actionItemText: { fontSize: moderateScale(15), color: C.ink, marginLeft: scale(12) },
  actionItemDisabled: { opacity: 0.5 },
  actionItemTextDisabled: { color: C.muted },
  actionItemDanger: { marginTop: scale(8) },

  actionDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(8), marginHorizontal: scale(20) },
  actionSectionTitle: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted, paddingHorizontal: scale(20), paddingVertical: scale(8), textTransform: 'uppercase' },
  statusIndicator: { width: scale(10), height: scale(10), borderRadius: scale(5) },

  actionCancelBtn: { marginHorizontal: scale(20), marginTop: scale(16), paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center' },
  actionCancelText: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
});
