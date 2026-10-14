/**
 * ============================================================================
 * STAFF MANAGEMENT SCREEN - PREMIUM GOD LEVEL DESIGN
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Animated,
  Modal,
  TextInput,
  ScrollView,
  Platform,
  useWindowDimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import AppAlert from '../utils/AppAlert';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
import { isStale, markFetched } from '../utils/focusCache';
// Premium Color Palette
const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
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

const QA = [
  { icon: 'calendar-outline', label: 'Attendance', grad: ['#3B82F6', '#2563EB'], screen: 'StaffAttendance', permission: 'staff:read' },
  { icon: 'card-outline', label: 'Salary', grad: ['#10B981', '#059669'], screen: 'StaffSalary', permission: 'staff:read' },
  { icon: 'receipt-outline', label: 'Vendor Ledger', grad: ['#7C3AED', '#6D28D9'], screen: 'VendorLedger', permission: 'vendor-ledger:read' },
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

/* ─── Skeleton ─── */
function SkeletonStaff({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(12) }}>
      <Animated.View style={[st.skelStrip, { opacity: pulse }]} />
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={st.skelCard}>
          <View style={st.skelRow}>
            <Animated.View style={[st.skelAvatar, { opacity: pulse }]} />
            <View style={st.skelInfoCol}>
              <Animated.View style={[st.skelLine, st.skelLineLg, { opacity: pulse }]} />
              <Animated.View style={[st.skelLine, st.skelLineSm, { opacity: pulse }]} />
            </View>
            <Animated.View style={[st.skelBadge, { opacity: pulse }]} />
          </View>
          <View style={st.skelChipRow}>
            <Animated.View style={[st.skelChip, { opacity: pulse }]} />
            <Animated.View style={[st.skelChip, { marginLeft: scale(8), opacity: pulse }]} />
          </View>
          <Animated.View style={[st.skelActions, { opacity: pulse }]} />
        </View>
      ))}
    </View>
  );
}

export default function StaffScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width, height: winHeight } = useWindowDimensions();
  const isTablet = width >= 768;
  const { keyboardHeight, keyboardCompensation } = useKeyboardCompensation();
  const { can } = usePermissions();
  const formScrollRef = useRef(null);

  const {
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [actionModalVisible, setActionModalVisible] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeStatusTab, setActiveStatusTab] = useState('all');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (!selectedRestaurant) { setLoading(false); return; }

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ restaurantId: selectedRestaurant, page: pageNum.toString(), pageSize: '20' });
      const response = await api.get(`/owner/staff?${params}`);
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
          if (append) {
            setStaff(prev => {
              const existingIds = new Set(prev.map(s => s.id));
              const uniqueNew = items.filter(s => !existingIds.has(s.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setStaff(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setStaff(responseData || []);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading staff:', error);
      AppAlert.alert('Error', 'Failed to load staff data');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedRestaurant]);

  useFocusEffect(useCallback(() => {
    const key = `Staff-${selectedRestaurant}`;
    if (isStale(key) || staff.length === 0) { loadData(); markFetched(key); }
  }, [selectedRestaurant, staff.length, loadData]));

  // Status tab is now client-side only — no refetch needed

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1, true);
    }
  };

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={st.listFooterLoader}>
        <ActivityIndicator size="small" color="#EF3A3A" />
      </View>
    );
  };

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadRestaurants({ force: true });
    await loadData(1, false);
    markFetched(`Staff-${selectedRestaurant}`);
  };

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setForm(f => ({ ...f, joiningDate: selectedDate.toISOString().split('T')[0] }));
    }
  };

  const openForm = (item = null) => {
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
    if (!form.name.trim()) { AppAlert.alert('Error', 'Please enter staff name'); return; }
    if (!form.phone || form.phone.length < 10) { AppAlert.alert('Error', 'Please enter valid phone (min 10 digits)'); return; }
    if (!form.role) { AppAlert.alert('Error', 'Please select a role'); return; }
    if (!form.salary) { AppAlert.alert('Error', 'Please enter salary/wage'); return; }

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
        AppAlert.alert('Success', 'Staff updated successfully');
      } else {
        await api.post('/owner/staff', payload);
        AppAlert.alert('Success', 'Staff added successfully');
      }
      setModalVisible(false);
      loadData();
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to save staff');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    if (!selectedStaff) return;
    try {
      await api.patch(`/owner/staff/${selectedStaff.id}`, { status: newStatus });
      AppAlert.alert('Success', `Status updated to ${getStatusConfig(newStatus).label}`);
      setActionModalVisible(false);
      setSelectedStaff(null);
      loadData();
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to update status');
    }
  };

  const handleEdit = () => {
    setActionModalVisible(false);
    openForm(selectedStaff);
    setSelectedStaff(null);
  };

  const handleDelete = () => {
    if (!selectedStaff || selectedStaff.status === 'TERMINATED') return;
    AppAlert.alert('Terminate Staff', `Are you sure you want to terminate ${selectedStaff.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Terminate', style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await api.delete(`/owner/staff/${selectedStaff.id}`);
            AppAlert.alert('Success', 'Staff terminated');
            setActionModalVisible(false);
            setSelectedStaff(null);
            loadData();
          } catch (error) {
            AppAlert.alert('Error', 'Failed to terminate staff');
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
            <Icon name={roleConfig.icon} size={scale(18)} color={roleConfig.color} />
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
              <Icon name="call-outline" size={scale(11)} color={C.muted} />
            </View>
            <Text style={st.detailValue}>{item.phone || '-'}</Text>
          </View>
          <View style={st.detailItem}>
            <View style={st.detailIconBox}>
              <Icon name="calendar-outline" size={scale(11)} color={C.muted} />
            </View>
            <Text style={st.detailValue}>{formatDate(item.joiningDate)}</Text>
          </View>
        </View>

        {/* Salary & Type Row */}
        <View style={st.infoRow}>
          <View style={[st.infoChip, { backgroundColor: C.successLight }]}>
            <Icon name="cash-outline" size={scale(11)} color={C.success} />
            <Text style={[st.infoChipText, { color: C.success }]}>{formatSalary(item)}</Text>
          </View>
          <View style={[st.infoChip, { backgroundColor: typeConfig.bg }]}>
            <Icon name={typeConfig.icon} size={scale(11)} color={typeConfig.color} />
            <Text style={[st.infoChipText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.cardActions}>
          {can('staff:update') && (
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.infoLight }]} onPress={() => openForm(item)}>
            <Icon name="pencil" size={scale(13)} color={C.info} />
            <Text style={[st.actionBtnText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
          )}
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: C.bg }]} onPress={() => openActionModal(item)}>
            <Icon name="ellipsis-horizontal" size={scale(13)} color={C.muted} />
            <Text style={[st.actionBtnText, { color: C.muted }]}>More</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Filter chips row -- extracted so it can be reused both inline (tablet)
  // and as the sticky sentinel item (phone, see listItems below).
  const renderFilterBar = () => (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[st.filterScroll, { minWidth: width - scale(24) }]}>
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
            <Icon name={config.icon} size={scale(12)} color={isActive ? '#fff' : config.color} />
            <Text style={[st.filterChipText, isActive && st.chipTextActive]} numberOfLines={1}>{config.label} ({count})</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );

  const renderResultsRow = () => (
    <View style={st.resultsRow}>
      {activeStatusTab !== 'all' && (
        <TouchableOpacity style={st.clearBtn} onPress={() => setActiveStatusTab('all')}>
          <Icon name="close-circle" size={scale(14)} color={C.primary} />
          <Text style={st.clearBtnText}>Clear</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==================== RENDER HEADER ====================
  const renderHeader = () => (
    <>
      {/* Stats Strip -- one compact non-scrolling row of 3 tiles instead of
          3 wide cards. */}
      <View style={st.statsStrip}>
        {[
          { key: 'total', icon: 'people', color: C.primary, label: 'Total Staff', value: totalCount || staff.length },
          { key: 'active', icon: 'checkmark-circle', color: C.success, label: 'Active', value: statusCounts.ACTIVE },
          { key: 'leave', icon: 'airplane', color: C.warning, label: 'On Leave', value: statusCounts.ON_LEAVE },
        ].map((t, i) => (
          <React.Fragment key={t.key}>
            {i > 0 && <View style={st.statsDivider} />}
            <View style={st.statsTile}>
              <View style={[st.statsTileIcon, { backgroundColor: t.color + '20' }]}>
                <Icon name={t.icon} size={scale(14)} color={t.color} />
              </View>
              <Text style={st.statsTileValue} numberOfLines={1}>{t.value}</Text>
              <Text style={st.statsTileLabel} numberOfLines={1}>{t.label}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {/* Quick Actions -- shortcuts to the other staff-related screens */}
      <Text style={st.sectionTitle}>Quick Actions</Text>
      <View style={st.qaRow}>
        {QA.filter(q => !q.permission || can(q.permission)).map((q, i) => (
          <TouchableOpacity
            key={i}
            style={st.qaItem}
            activeOpacity={0.8}
            onPress={() => navigation.navigate(q.screen)}
          >
            <LinearGradient colors={q.grad} style={st.qaIcon}>
              <Icon name={q.icon} size={scale(16)} color="#fff" />
            </LinearGradient>
            <Text style={st.qaLabel}>{q.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filter Tabs + Results -- on phone these are injected as sticky
          data-array items instead (see listItems/renderListItem below).
          Tablet (2-column grid) keeps the old always-inline behavior since
          stickyHeaderIndices doesn't combine cleanly with numColumns. */}
      {isTablet && (
        <>
          <View style={st.filterContainer}>{renderFilterBar()}</View>
          {renderResultsRow()}
        </>
      )}
    </>
  );

  const renderEmptyState = () => (
    <View style={st.emptyState}>
      <View style={st.emptyIcon}>
        <Icon name="people-outline" size={scale(64)} color={C.muted} />
      </View>
      <Text style={st.emptyTitle}>{staff.length === 0 ? 'No Staff Yet' : 'No Results'}</Text>
      <Text style={st.emptySubtitle}>
        {staff.length === 0 ? 'Add your first team member' : 'No matching staff found'}
      </Text>
      {staff.length === 0 && can('staff:create') && (
        <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
          <Icon name="add" size={scale(18)} color="#fff" />
          <Text style={st.emptyBtnText}>Add Staff</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // Phone: prepend sentinel rows so the filter row is a genuine, separate
  // FlatList cell -- which is what lets native `stickyHeaderIndices` dock
  // just that row to the top instead of the whole scrolling header.
  const listItems = useMemo(() => {
    if (isTablet) return filteredStaff;
    const items = [{ __type: 'sticky-filter' }, { __type: 'results' }];
    if (filteredStaff.length === 0) items.push({ __type: 'empty' });
    else items.push(...filteredStaff);
    return items;
  }, [isTablet, filteredStaff]);

  const listKeyExtractor = (item) => item.__type || item.id.toString();

  const renderListItem = (info) => {
    const { item } = info;
    if (item.__type === 'sticky-filter') return <View style={st.filterContainer}>{renderFilterBar()}</View>;
    if (item.__type === 'results') return renderResultsRow();
    if (item.__type === 'empty') return renderEmptyState();
    return renderStaffCard(info);
  };

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Staff Management</Text>
            <Text style={st.headerSubtitle}>Manage your team</Text>
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonStaff pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT ====================
  if (!hasRestaurants) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Staff Management</Text>
            <Text style={st.headerSubtitle}>Manage your team</Text>
          </View>
        </LinearGradient>
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
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={scale(18)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Staff Management</Text>
          <Text style={st.headerSubtitle}>Manage your team</Text>
        </View>
        <View style={st.headerActions}>
          {can('staff:create') && (
          <TouchableOpacity style={st.headerIconBtn} onPress={() => openForm()}>
            <Icon name="person-add" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Staff List -- on phone, the filter row is a real sentinel item in
          `data` at index 1 (index 0 is the ListHeaderComponent cell), so
          native stickyHeaderIndices docks just that row to the top while
          scrolling past it, releasing it again once scrolled back up. */}
      <FlatList
        data={listItems}
        keyExtractor={listKeyExtractor}
        renderItem={renderListItem}
        numColumns={isTablet ? 2 : 1}
        key={`grid-${isTablet ? 2 : 1}`}
        ListHeaderComponent={renderHeader}
        stickyHeaderIndices={isTablet ? undefined : [1]}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={isTablet ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={isTablet ? renderEmptyState : undefined}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        ListFooterComponent={renderListFooter}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      {/* ========== ADD/EDIT MODAL ========== */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onShow={() => {
          // The ScrollView's scrollable height can be measured against a
          // stale/transient size while the Modal is still sliding in,
          // leaving it unable to scroll to the bottom of the form until
          // something forces a fresh layout pass. Nudging the scroll
          // position once the modal has fully shown forces that remeasure.
          requestAnimationFrame(() => {
            formScrollRef.current?.scrollTo({ y: 1, animated: false });
            requestAnimationFrame(() => formScrollRef.current?.scrollTo({ y: 0, animated: false }));
          });
        }}
      >
        <View style={st.modalOverlay}>
          <View style={[st.modalContent, { height: Math.round(keyboardHeight > 0 ? winHeight - keyboardCompensation - scale(24) : winHeight * 0.9) }]}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{isEditMode ? 'Edit Staff' : 'Add Staff'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={formScrollRef}
              style={st.modalBody}
              contentContainerStyle={st.modalBodyContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
            >
              {/* Name & Phone Row */}
              <View style={st.formRow}>
                <View style={st.formCol}>
                  <Text style={st.label}>Full Name *</Text>
                  <TextInput
                    style={st.input}
                    placeholder="Staff name"
                    placeholderTextColor={C.muted}
                    value={form.name}
                    onChangeText={v => setForm(f => ({ ...f, name: v }))}
                  />
                </View>
                <View style={st.formCol}>
                  <Text style={st.label}>Phone Number *</Text>
                  <TextInput
                    style={st.input}
                    placeholder="Phone number"
                    placeholderTextColor={C.muted}
                    keyboardType="phone-pad"
                    value={form.phone}
                    onChangeText={v => setForm(f => ({ ...f, phone: v }))}
                  />
                </View>
              </View>

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
                      <Text style={[st.roleChipText, isSelected && st.chipTextActive]}>{role.value}</Text>
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
                      <Text style={[st.typeChipText, isSelected && st.chipTextActive]}>{type.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Status (Edit Mode) */}
              {isEditMode && can('staff:update') && (
                <>
                  <Text style={st.label}>Status</Text>
                  <View style={st.statusGrid}>
                    {STAFF_STATUSES.filter(s => s.value !== 'TERMINATED' || can('staff:delete')).map(s => {
                      const isSelected = form.status === s.value;
                      return (
                        <TouchableOpacity
                          key={s.value}
                          style={[st.statusChip, isSelected && { backgroundColor: s.color, borderColor: s.color }]}
                          onPress={() => setForm(f => ({ ...f, status: s.value }))}
                        >
                          <Icon name={s.icon} size={scale(14)} color={isSelected ? '#fff' : s.color} />
                          <Text style={[st.statusChipText, isSelected && st.chipTextActive]}>{s.label}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </>
              )}

              {/* Joining Date & Salary Row */}
              <View style={st.formRow}>
                <View style={st.formCol}>
                  <Text style={st.label}>Joining Date</Text>
                  <TouchableOpacity style={st.dateBtn} onPress={() => setShowDatePicker(true)}>
                    <Icon name="calendar" size={scale(20)} color={C.primary} />
                    <Text style={st.dateBtnText} numberOfLines={1}>{formatDate(form.joiningDate)}</Text>
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
                </View>
                <View style={st.formCol}>
                  <Text style={st.label} numberOfLines={1}>{form.staffType === 'PART_TIME' ? 'Daily Wage (₹) *' : 'Monthly Salary (₹) *'}</Text>
                  <View style={st.salaryInputRow}>
                    <View style={st.currencyBox}>
                      <Text style={st.currencyText}>₹</Text>
                    </View>
                    <TextInput
                      style={st.salaryInput}
                      placeholder={form.staffType === 'PART_TIME' ? 'Daily wage' : 'Monthly salary'}
                      placeholderTextColor={C.muted}
                      keyboardType="numeric"
                      value={form.salary}
                      onChangeText={v => setForm(f => ({ ...f, salary: v }))}
                    />
                  </View>
                </View>
              </View>

              <View style={{ height: scale(30) }} />
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
            {can('staff:update') && (
            <TouchableOpacity style={st.actionItem} onPress={handleEdit}>
              <Icon name="pencil-outline" size={scale(20)} color={C.info} />
              <Text style={st.actionItemText}>Edit Details</Text>
            </TouchableOpacity>
            )}

            {can('staff:update') && (
            <>
            <View style={st.actionDivider} />
            <Text style={st.actionSectionTitle}>Change Status</Text>

            {/* Status Options */}
            {STAFF_STATUSES.filter(s => s.value !== 'TERMINATED' || can('staff:delete')).map(status => (
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
            </>
            )}

            <View style={st.actionDivider} />

            {/* Terminate Option */}
            {can('staff:delete') && (
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
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={st.actionCancelBtn} onPress={() => setActionModalVisible(false)}>
              <Text style={st.actionCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="home" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingBottom: scale(12), overflow: 'hidden' },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  backBtnPlain: { width: scale(26), height: scale(40), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  headerSubtitle: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginLeft: scale(8) },

  // Stats
  // Stats Strip -- one compact non-scrolling row of 3 tiles instead of 3
  // wide cards.
  statsStrip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    marginHorizontal: scale(12), marginTop: scale(12), marginBottom: scale(12), borderRadius: scale(14),
    paddingVertical: scale(10), paddingHorizontal: scale(2),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05, shadowRadius: scale(6), elevation: 2,
  },
  statsTile: { flex: 1, alignItems: 'center', paddingHorizontal: scale(2) },
  statsDivider: { width: 1, height: scale(30), backgroundColor: C.border },
  statsTileIcon: {
    width: scale(26), height: scale(26), borderRadius: scale(8),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  statsTileValue: { fontSize: moderateScale(12.5), fontWeight: '800', color: C.ink },
  statsTileLabel: { fontSize: moderateScale(8.5), color: C.muted, marginTop: scale(1), fontWeight: '500' },

  // Quick Actions
  sectionTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, marginHorizontal: scale(12), marginBottom: scale(10) },
  qaRow: { flexDirection: 'row', gap: scale(8), marginHorizontal: scale(12), marginBottom: scale(14) },
  qaItem: {
    flex: 1, backgroundColor: C.card, borderRadius: scale(12), paddingVertical: scale(9),
    alignItems: 'center', borderWidth: 1, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 6, elevation: 2,
  },
  qaIcon: {
    width: scale(32), height: scale(32), borderRadius: scale(9),
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  qaLabel: { fontSize: moderateScale(10), fontWeight: '700', color: C.ink, textAlign: 'center' },

  // Filters
  filterContainer: { paddingVertical: scale(7), backgroundColor: C.bg },
  filterScroll: { paddingHorizontal: scale(12), gap: scale(6), justifyContent: 'space-between' },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(16), backgroundColor: C.card, borderWidth: 1.5, borderColor: C.border },
  filterChipText: { fontSize: moderateScale(11.5), fontWeight: '600', color: C.ink, marginLeft: scale(4) },

  // Results
  resultsRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: scale(16), paddingTop: scale(10), paddingBottom: scale(4), minHeight: scale(14) },
  clearBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.primaryLight, borderRadius: scale(8) },
  clearBtnText: { fontSize: moderateScale(12), fontWeight: '600', color: C.primary, marginLeft: scale(4) },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { backgroundColor: C.card, borderRadius: scale(13), padding: scale(11), marginBottom: scale(9), borderWidth: 1, borderColor: C.border },
  cardTablet: { flex: 1, marginHorizontal: scale(6), maxWidth: '48%' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(9) },
  avatar: { width: scale(40), height: scale(40), borderRadius: scale(11), alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, marginLeft: scale(9) },
  cardName: { fontSize: moderateScale(13.5), fontWeight: '700', color: C.ink },
  cardRole: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(1) },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(20) },
  statusDot: { width: scale(5), height: scale(5), borderRadius: scale(3), marginRight: scale(5) },
  statusText: { fontSize: moderateScale(9.5), fontWeight: '700' },

  detailsGrid: { flexDirection: 'row', marginBottom: scale(9) },
  detailItem: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  detailIconBox: { width: scale(22), height: scale(22), borderRadius: scale(7), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', marginRight: scale(6) },
  detailValue: { fontSize: moderateScale(11), fontWeight: '600', color: C.text },

  infoRow: { flexDirection: 'row', marginBottom: scale(10) },
  infoChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(7), marginRight: scale(6) },
  infoChipText: { fontSize: moderateScale(10.5), fontWeight: '700', marginLeft: scale(4) },

  cardActions: { flexDirection: 'row', paddingTop: scale(9), borderTopWidth: 1, borderTopColor: C.border },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(7), borderRadius: scale(9), marginHorizontal: scale(3) },
  actionBtnText: { fontSize: moderateScale(11), fontWeight: '600', marginLeft: scale(5) },

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
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(20), borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  modalClose: { width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalBody: { flex: 1 },
  modalBodyContent: { padding: scale(20), paddingBottom: scale(30) },
  modalFooter: { flexDirection: 'row', padding: scale(20), borderTopWidth: 1, borderTopColor: C.border },

  // Form
  label: { fontSize: moderateScale(13), fontWeight: '700', color: C.text, marginBottom: scale(10), marginTop: scale(16) },
  input: { backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(16), paddingVertical: scale(14), fontSize: moderateScale(15), color: C.text, borderWidth: 1.5, borderColor: C.border },
  formRow: { flexDirection: 'row', gap: scale(12) },
  formCol: { flex: 1 },

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

  // ═══ Skeleton ═══
  skelStrip: { height: scale(64), backgroundColor: '#E2E8F0', borderRadius: scale(14) },
  skelCard: { backgroundColor: C.card, borderRadius: scale(13), padding: scale(11), marginTop: scale(12), borderWidth: 1, borderColor: C.border },
  skelAvatar: { width: scale(40), height: scale(40), borderRadius: scale(11), backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(11), backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelLineLg: { width: '50%' },
  skelLineSm: { width: '30%', marginTop: scale(6) },
  skelBadge: { width: scale(60), height: scale(18), borderRadius: scale(20), backgroundColor: '#E2E8F0' },
  skelChip: { width: scale(90), height: scale(22), borderRadius: scale(7), backgroundColor: '#E2E8F0' },
  skelActions: { height: scale(32), backgroundColor: '#E2E8F0', borderRadius: scale(9), marginTop: scale(10) },
  skelRow: { flexDirection: 'row', alignItems: 'center' },
  skelInfoCol: { marginLeft: scale(9), flex: 1 },
  skelChipRow: { flexDirection: 'row', marginTop: scale(10) },
  listFooterLoader: { padding: 16, alignItems: 'center' },
  chipTextActive: { color: '#fff' },
});
