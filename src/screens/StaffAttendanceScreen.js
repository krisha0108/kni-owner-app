/**
 * ============================================================================
 * STAFF ATTENDANCE SCREEN - PREMIUM DESIGN WITH BUG FIXES
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  FlatList,
  useWindowDimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
import AppAlert from '../utils/AppAlert';
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

const ATTENDANCE_STATUSES = [
  { value: 'PRESENT', label: 'Present', icon: 'checkmark-circle', color: C.success, bg: C.successLight },
  { value: 'ABSENT', label: 'Absent', icon: 'close-circle', color: C.danger, bg: C.dangerLight },
  { value: 'HALF_DAY', label: 'Half Day', icon: 'time', color: C.warning, bg: C.warningLight },
  { value: 'LEAVE', label: 'Leave', icon: 'calendar', color: C.info, bg: C.infoLight },
  { value: 'HOLIDAY', label: 'Holiday', icon: 'sunny', color: C.purple, bg: C.purpleLight },
  { value: 'WEEKLY_OFF', label: 'Weekly Off', icon: 'cafe', color: '#64748B', bg: '#F1F5F9' },
];

const getStatusConfig = (status) => ATTENDANCE_STATUSES.find(s => s.value === status) || ATTENDANCE_STATUSES[0];

const formatTime = (dateTimeStr) => {
  if (!dateTimeStr) return '-';
  const date = new Date(dateTimeStr);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

/* ─── Skeleton ─── */
function SkeletonAttendance({ pulse }) {
  return (
    <View style={{ paddingBottom: scale(16) }}>
      <Animated.View style={[st.skelDateSelector, { opacity: pulse }]} />
      <View style={st.statsRow}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelStatCard, { opacity: pulse }]} />
        ))}
      </View>
      <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
        {[1, 2, 3, 4].map(i => (
          <View key={i} style={st.skelStaffCard}>
            <Animated.View style={[st.skelAvatar, { opacity: pulse }]} />
            <View style={{ flex: 1, marginLeft: scale(10) }}>
              <Animated.View style={[st.skelLine, { opacity: pulse, width: '55%' }]} />
              <Animated.View style={[st.skelLineSm, { opacity: pulse, width: '35%' }]} />
            </View>
            <Animated.View style={[st.skelBadge, { opacity: pulse }]} />
          </View>
        ))}
      </View>
    </View>
  );
}

export default function StaffAttendanceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const keyboardHeight = useKeyboardHeight();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({}); // staffId -> status
  const [attendanceData, setAttendanceData] = useState({}); // staffId -> full data
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Status picker modal
  const [statusModal, setStatusModal] = useState(null);

  // Time input modal
  const [timeModal, setTimeModal] = useState(null);
  const [checkInTime, setCheckInTime] = useState('09:00');

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const [checkOutTime, setCheckOutTime] = useState('18:00');

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) { setLoading(false); return; }

    try {
      setLoading(true);

      // Fetch active staff
      const staffRes = await api.get(`/owner/staff?restaurantId=${selectedRestaurantId}&status=ACTIVE&pageSize=500`);
      if (staffRes.data.ok) {
        setStaff(staffRes.data.data?.items || staffRes.data.data || []);
      }

      // Fetch attendance for selected date
      const attendanceRes = await api.get(
        `/owner/staff-attendance?restaurantId=${selectedRestaurantId}&startDate=${selectedDate}&endDate=${selectedDate}`
      );

      if (attendanceRes.data.ok) {
        const records = attendanceRes.data.data || [];
        const attendanceMap = {};
        const fullDataMap = {};

        records.forEach(a => {
          const staffIdKey = String(a.staffId);
          attendanceMap[staffIdKey] = a.status;
          fullDataMap[staffIdKey] = {
            id: a.id,
            status: a.status,
            checkInTime: a.checkInTime,
            checkOutTime: a.checkOutTime,
            workHours: a.workHours,
          };
        });

        setAttendance(attendanceMap);
        setAttendanceData(fullDataMap);
      }
    } catch (error) {
      console.error('Error loading attendance:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedDate]);

  useEffect(() => {
    loadData();
  }, [selectedRestaurantId, selectedDate, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  // Check if staff has attendance marked
  const hasAttendance = (staffId) => !!attendance[String(staffId)];

  // Get attendance status for staff
  const getAttendanceStatus = (staffId) => {
    const key = String(staffId);
    return attendance[key];
  };

  // Get full attendance data for staff
  const getAttendanceData = (staffId) => {
    const key = String(staffId);
    return attendanceData[key];
  };

  const openStatusPicker = (member) => {
    setStatusModal(member);
    const existing = getAttendanceData(member.id);
    if (existing?.checkInTime) {
      const inTime = new Date(existing.checkInTime);
      setCheckInTime(inTime.toTimeString().slice(0, 5));
    } else {
      setCheckInTime('09:00');
    }
    if (existing?.checkOutTime) {
      const outTime = new Date(existing.checkOutTime);
      setCheckOutTime(outTime.toTimeString().slice(0, 5));
    } else {
      setCheckOutTime('18:00');
    }
  };

  const markAttendance = async (staffId, status) => {
    const needsTime = status === 'PRESENT' || status === 'HALF_DAY';

    if (needsTime) {
      setTimeModal({ staffId, status });
      setStatusModal(null);
      return;
    }

    await saveAttendanceRecord(staffId, status, null, null);
    setStatusModal(null);
  };

  const saveAttendanceRecord = async (staffId, status, inTime, outTime) => {
    setSaving(true);
    try {
      const checkInDateTime = inTime ? `${selectedDate}T${inTime}:00` : undefined;
      const checkOutDateTime = outTime ? `${selectedDate}T${outTime}:00` : undefined;

      const response = await api.post('/owner/staff-attendance', {
        staffId,
        restaurantId: selectedRestaurantId,
        attendanceDate: selectedDate,
        status,
        checkInTime: checkInDateTime,
        checkOutTime: checkOutDateTime,
      });

      if (response.data.ok) {
        AppAlert.alert('Success', 'Attendance marked successfully');
        await loadData(); // Reload to get fresh data
      } else {
        AppAlert.alert('Error', response.data.error || 'Failed to mark attendance');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setSaving(false);
      setTimeModal(null);
    }
  };

  const handleBulkMark = async (status) => {
    const statusConfig = getStatusConfig(status);

    // Get unmarked staff based on current state
    const unmarkedStaff = staff.filter(s => !attendance[String(s.id)]);

    if (unmarkedStaff.length === 0) {
      AppAlert.alert('Info', 'All staff members already have attendance marked for today');
      return;
    }

    AppAlert.alert(
      `Mark All ${statusConfig.label}`,
      `Mark ${unmarkedStaff.length} unmarked staff member(s) as ${statusConfig.label}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving(true);
            try {
              const records = unmarkedStaff.map(member => ({
                staffId: member.id,
                status,
                checkInTime: status === 'PRESENT' ? `${selectedDate}T09:00:00` : undefined,
                checkOutTime: status === 'PRESENT' ? `${selectedDate}T18:00:00` : undefined,
              }));

              const response = await api.post('/owner/staff-attendance/bulk', {
                restaurantId: selectedRestaurantId,
                attendanceDate: selectedDate,
                records,
              });

              if (response.data.ok) {
                AppAlert.alert('Success', response.data.message || `Marked ${records.length} staff as ${statusConfig.label}`);
                await loadData(); // Reload data
              } else {
                AppAlert.alert('Error', response.data.error || 'Failed to mark attendance');
              }
            } catch (error) {
              AppAlert.alert('Error', error.response?.data?.error || 'Failed to mark bulk attendance');
            } finally {
              setSaving(false);
            }
          }
        }
      ]
    );
  };

  const changeDate = (days) => {
    const date = new Date(selectedDate);
    date.setDate(date.getDate() + days);
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    if (date <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  // Calculate counts
  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const halfDayCount = Object.values(attendance).filter(s => s === 'HALF_DAY').length;
  const markedCount = Object.keys(attendance).length;
  const unmarkedCount = staff.length - markedCount;

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
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
            <Text style={st.headerTitle}>Staff Attendance</Text>
            <Text style={st.headerSubtitle}>Mark daily attendance</Text>
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonAttendance pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== RENDER STAFF ITEM ====================
  const renderStaffItem = (member) => {
    const status = getAttendanceStatus(member.id);
    const data = getAttendanceData(member.id);
    const statusConfig = status ? getStatusConfig(status) : null;
    const isMarked = hasAttendance(member.id);

    return (
      <View key={member.id} style={[st.staffCard, isTablet && st.staffCardTablet]}>
        <View style={st.staffHeader}>
          <View style={st.staffInfo}>
            <View style={st.staffAvatar}>
              <Icon name="person" size={scale(16)} color={C.primary} />
            </View>
            <View style={st.staffDetails}>
              <Text style={st.staffName}>{member.name}</Text>
              {member.designation && <Text style={st.staffRole}>{member.designation}</Text>}
            </View>
          </View>

          {isMarked ? (
            <TouchableOpacity
              style={[st.statusBadge, { backgroundColor: statusConfig.bg }]}
              onPress={() => openStatusPicker(member)}
            >
              <Icon name={statusConfig.icon} size={scale(14)} color={statusConfig.color} />
              <Text style={[st.statusBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
              <Icon name="pencil" size={scale(12)} color={statusConfig.color} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={st.markBtn} onPress={() => openStatusPicker(member)}>
              <Icon name="add-circle" size={scale(18)} color={C.primary} />
              <Text style={st.markBtnText}>Mark</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Time info for marked attendance */}
        {isMarked && (status === 'PRESENT' || status === 'HALF_DAY') && (
          <View style={st.timeRow}>
            <View style={st.timeItem}>
              <Icon name="log-in-outline" size={scale(14)} color={C.muted} />
              <Text style={st.timeLabel}>In:</Text>
              <Text style={st.timeValue}>{formatTime(data?.checkInTime)}</Text>
            </View>
            <View style={st.timeItem}>
              <Icon name="log-out-outline" size={scale(14)} color={C.muted} />
              <Text style={st.timeLabel}>Out:</Text>
              <Text style={st.timeValue}>{formatTime(data?.checkOutTime)}</Text>
            </View>
            {data?.workHours > 0 && (
              <View style={st.timeItem}>
                <Icon name="time-outline" size={scale(14)} color={C.muted} />
                <Text style={st.timeLabel}>Hours:</Text>
                <Text style={st.timeValue}>{data.workHours.toFixed(1)}h</Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

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
          <Text style={st.headerTitle}>Staff Attendance</Text>
          <Text style={st.headerSubtitle}>Mark daily attendance</Text>
        </View>
      </LinearGradient>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        style={st.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Date Selector */}
        <View style={st.dateSelector}>
          <TouchableOpacity style={st.dateBtn} onPress={() => changeDate(-1)}>
            <Icon name="chevron-back" size={scale(14)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.dateBox}>
            <Icon name="calendar" size={scale(14)} color={C.primary} />
            <Text style={st.dateText}>
              {isToday ? 'Today, ' : ''}
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[st.dateBtn, isToday && { opacity: 0.3 }]}
            onPress={() => changeDate(1)}
            disabled={isToday}
          >
            <Icon name="chevron-forward" size={scale(14)} color={C.ink} />
          </TouchableOpacity>
        </View>

        {staff.length > 0 && (
          <>
            {/* Summary Stats */}
            <View style={st.statsRow}>
              <View style={[st.statCard, { backgroundColor: '#ECFDF5', borderColor: '#CFEFDD' }]}>
                <View style={st.statIconWrap}><Icon name="checkmark-circle" size={scale(14)} color={C.success} /></View>
                <Text style={[st.statValue, { color: '#15803D' }]} numberOfLines={1}>{presentCount}</Text>
                <Text style={[st.statLabel, { color: '#15803D' }]} numberOfLines={1}>Present</Text>
              </View>
              <View style={[st.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FBD9D9' }]}>
                <View style={st.statIconWrap}><Icon name="close-circle" size={scale(14)} color={C.danger} /></View>
                <Text style={[st.statValue, { color: '#B91C1C' }]} numberOfLines={1}>{absentCount}</Text>
                <Text style={[st.statLabel, { color: '#B91C1C' }]} numberOfLines={1}>Absent</Text>
              </View>
              <View style={[st.statCard, { backgroundColor: '#FFFBEB', borderColor: '#FBE6B8' }]}>
                <View style={st.statIconWrap}><Icon name="time" size={scale(14)} color={C.warning} /></View>
                <Text style={[st.statValue, { color: '#92400E' }]} numberOfLines={1}>{halfDayCount}</Text>
                <Text style={[st.statLabel, { color: '#92400E' }]} numberOfLines={1}>Half Day</Text>
              </View>
              <View style={[st.statCard, { backgroundColor: '#EFF3FC', borderColor: '#DCE3F5' }]}>
                <View style={st.statIconWrap}><Icon name="help-circle" size={scale(14)} color="#4F63D2" /></View>
                <Text style={[st.statValue, { color: '#3B4C9E' }]} numberOfLines={1}>{unmarkedCount}</Text>
                <Text style={[st.statLabel, { color: '#3B4C9E' }]} numberOfLines={1}>Pending</Text>
              </View>
            </View>

            {/* Progress */}
            <LinearGradient colors={['#ECFDF5', '#F0FDF4']} style={st.progressContainer}>
              <View style={st.progressHeader}>
                <Text style={st.progressPercent}>
                  {staff.length > 0 ? Math.round((markedCount / staff.length) * 100) : 0}
                  <Text style={st.progressPercentSign}>%</Text>
                </Text>
                <Text style={st.progressText}>{markedCount} of {staff.length} staff{'\n'}marked today</Text>
              </View>
              <View style={st.progressTrackWrap}>
                <View style={st.progressBar}>
                  <LinearGradient colors={['#4ADE80', '#16A34A']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={[st.progressFill, { width: `${staff.length > 0 ? (markedCount / staff.length) * 100 : 0}%` }]} />
                </View>
                <View style={[st.progressKnob, { left: `${staff.length > 0 ? (markedCount / staff.length) * 100 : 0}%` }]} />
              </View>
            </LinearGradient>

            {/* Bulk Actions - Only show if there are unmarked staff */}
            {unmarkedCount > 0 && (
              <View style={st.bulkActions}>
                <TouchableOpacity
                  style={[st.bulkBtn, { backgroundColor: C.successLight, borderColor: C.success }]}
                  onPress={() => handleBulkMark('PRESENT')}
                  disabled={saving}
                >
                  <Icon name="checkmark-circle" size={scale(16)} color={C.success} />
                  <Text style={[st.bulkBtnText, { color: C.success }]}>All Present ({unmarkedCount})</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[st.bulkBtn, { backgroundColor: '#F1F5F9', borderColor: '#64748B' }]}
                  onPress={() => handleBulkMark('WEEKLY_OFF')}
                  disabled={saving}
                >
                  <Icon name="cafe" size={scale(16)} color="#64748B" />
                  <Text style={[st.bulkBtnText, { color: '#64748B' }]}>All Off ({unmarkedCount})</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* All Marked Message */}
            {unmarkedCount === 0 && staff.length > 0 && (
              <View style={st.allMarkedBox}>
                <Icon name="checkmark-done-circle" size={scale(20)} color={C.success} />
                <Text style={st.allMarkedText}>All attendance marked for today!</Text>
              </View>
            )}
          </>
        )}

        {/* Staff List */}
        {staff.length === 0 ? (
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Icon name="people-outline" size={scale(40)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>No Active Staff</Text>
            <Text style={st.emptySubtitle}>Add staff members to mark attendance</Text>
            <TouchableOpacity style={st.emptyBtn} onPress={() => navigation.navigate('Staff')}>
              <Icon name="add" size={scale(18)} color="#fff" />
              <Text style={st.emptyBtnText}>Add Staff</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[st.staffList, isTablet && st.staffListTablet]}>
            {staff.map(member => renderStaffItem(member))}
          </View>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Status Picker Modal */}
      <Modal visible={!!statusModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity onPress={() => setStatusModal(null)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalSubtitle}>Select status for {statusModal?.name}</Text>

            <View style={st.statusGrid}>
              {ATTENDANCE_STATUSES.map(status => (
                <TouchableOpacity
                  key={status.value}
                  style={[st.statusOption, { backgroundColor: status.bg }]}
                  onPress={() => markAttendance(statusModal.id, status.value)}
                >
                  <Icon name={status.icon} size={scale(18)} color={status.color} />
                  <Text style={[st.statusOptionText, { color: status.color }]}>{status.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Input Modal */}
      <Modal visible={!!timeModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Set Time</Text>
              <TouchableOpacity onPress={() => setTimeModal(null)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalSubtitle}>
              Enter times for {timeModal?.status === 'HALF_DAY' ? 'half day' : 'full day'}
            </Text>

            <View style={st.timeInputs}>
              <View style={st.timeInputGroup}>
                <Text style={st.timeInputLabel}>Check In Time</Text>
                <View style={st.timeInputBox}>
                  <Icon name="log-in-outline" size={scale(20)} color={C.success} />
                  <TextInput
                    style={st.timeInput}
                    value={checkInTime}
                    onChangeText={setCheckInTime}
                    placeholder="HH:MM"
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>

              <View style={st.timeInputGroup}>
                <Text style={st.timeInputLabel}>Check Out Time</Text>
                <View style={st.timeInputBox}>
                  <Icon name="log-out-outline" size={scale(20)} color={C.danger} />
                  <TextInput
                    style={st.timeInput}
                    value={checkOutTime}
                    onChangeText={setCheckOutTime}
                    placeholder="HH:MM"
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>
            </View>

            <View style={st.modalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setTimeModal(null)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.saveBtn, saving && { opacity: 0.7 }]}
                onPress={() => saveAttendanceRecord(timeModal.staffId, timeModal.status, checkInTime, checkOutTime)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark" size={scale(18)} color="#fff" />
                    <Text style={st.saveBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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

  content: { flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },

  // ─── Skeleton ───
  skelDateSelector: {
    height: scale(68),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(14),
    backgroundColor: '#E2E8F0',
  },
  skelStatCard: {
    flex: 1,
    height: scale(56),
    borderRadius: scale(11),
    marginHorizontal: scale(3),
    backgroundColor: '#E2E8F0',
  },
  skelStaffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: scale(14),
    borderRadius: scale(12),
    marginBottom: scale(10),
    borderWidth: 1,
    borderColor: C.border,
  },
  skelAvatar: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    backgroundColor: '#E2E8F0',
  },
  skelLine: {
    height: scale(13),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
  },
  skelLineSm: {
    height: scale(10),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    marginTop: scale(6),
  },
  skelBadge: {
    width: scale(64),
    height: scale(28),
    borderRadius: scale(10),
    backgroundColor: '#E2E8F0',
  },

  // Date Selector
  dateSelector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(10), paddingVertical: scale(8), backgroundColor: C.card, marginHorizontal: scale(16), marginTop: scale(16), borderRadius: scale(11), borderWidth: 1, borderColor: C.border },
  dateBtn: { width: scale(28), height: scale(28), borderRadius: scale(7), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  dateBox: { flexDirection: 'row', alignItems: 'center' },
  dateText: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginLeft: scale(6) },

  // Stats
  statsRow: { flexDirection: 'row', gap: scale(7), paddingHorizontal: scale(16), paddingTop: scale(16) },
  statCard: { flex: 1, alignItems: 'center', paddingVertical: scale(8), paddingHorizontal: scale(4), borderRadius: scale(11), borderWidth: 1 },
  statIconWrap: { width: scale(20), height: scale(20), borderRadius: scale(6), alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.65)' },
  statValue: { fontSize: moderateScale(13), fontWeight: '800', marginTop: scale(5) },
  statLabel: { fontSize: moderateScale(8.5), fontWeight: '600', marginTop: scale(1) },

  // Progress
  progressContainer: { marginHorizontal: scale(16), marginTop: scale(14), padding: scale(14), borderRadius: scale(16), borderWidth: 1, borderColor: '#CFEFDD' },
  progressHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: scale(10) },
  progressText: { fontSize: moderateScale(9.5), color: '#15803D', fontWeight: '600', textAlign: 'right', lineHeight: moderateScale(13) },
  progressPercent: { fontSize: moderateScale(26), fontWeight: '800', color: C.success, lineHeight: moderateScale(26) },
  progressPercentSign: { fontSize: moderateScale(13), fontWeight: '700' },
  progressTrackWrap: { justifyContent: 'center' },
  progressBar: { height: scale(10), backgroundColor: '#D7F0DF', borderRadius: scale(5), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: scale(5) },
  progressKnob: { position: 'absolute', width: scale(16), height: scale(16), borderRadius: scale(8), backgroundColor: '#fff', borderWidth: 3, borderColor: '#16A34A', marginLeft: -scale(8), shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.2, shadowRadius: 3, elevation: 3 },

  // Bulk Actions
  bulkActions: { flexDirection: 'row', paddingHorizontal: scale(16), paddingTop: scale(12) },
  bulkBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(10), borderRadius: scale(10), borderWidth: 1.5, marginHorizontal: scale(4) },
  bulkBtnText: { fontSize: moderateScale(12), fontWeight: '700', marginLeft: scale(6) },

  // All Marked
  allMarkedBox: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: scale(16), marginTop: scale(12), padding: scale(12), backgroundColor: C.successLight, borderRadius: scale(10) },
  allMarkedText: { fontSize: moderateScale(13), fontWeight: '600', color: C.success, marginLeft: scale(8) },

  // Staff List
  staffList: { paddingHorizontal: scale(16), paddingTop: scale(12) },
  staffListTablet: { flexDirection: 'row', flexWrap: 'wrap' },
  staffCard: { backgroundColor: C.card, padding: scale(14), borderRadius: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: C.border },
  staffCardTablet: { width: '48%', marginHorizontal: '1%' },
  staffHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  staffInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  staffAvatar: { width: scale(32), height: scale(32), borderRadius: scale(9), backgroundColor: C.primaryLight, alignItems: 'center', justifyContent: 'center' },
  staffDetails: { flex: 1, marginLeft: scale(10) },
  staffName: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  staffRole: { fontSize: moderateScale(11), color: C.muted, marginTop: 1 },

  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(10) },
  statusBadgeText: { fontSize: moderateScale(11), fontWeight: '700', marginHorizontal: scale(4) },

  markBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(8), backgroundColor: C.primaryLight },
  markBtnText: { fontSize: moderateScale(13), fontWeight: '600', color: C.primary, marginLeft: scale(4) },

  timeRow: { flexDirection: 'row', marginTop: scale(10), paddingTop: scale(10), borderTopWidth: 1, borderTopColor: C.border },
  timeItem: { flexDirection: 'row', alignItems: 'center', marginRight: scale(14) },
  timeLabel: { fontSize: moderateScale(11), color: C.muted, marginLeft: scale(3) },
  timeValue: { fontSize: moderateScale(11), fontWeight: '600', color: C.text, marginLeft: scale(2) },

  // Empty
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: { width: scale(80), height: scale(80), borderRadius: scale(40), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.primary, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), paddingBottom: scale(30) },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(20), borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  modalClose: { width: scale(36), height: scale(36), borderRadius: scale(18), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  modalSubtitle: { fontSize: moderateScale(14), color: C.muted, paddingHorizontal: scale(20), marginTop: scale(10) },

  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: scale(16) },
  statusOption: { width: '31%', alignItems: 'center', paddingVertical: scale(10), borderRadius: scale(12), margin: '1%' },
  statusOptionText: { fontSize: moderateScale(11), fontWeight: '700', marginTop: scale(6) },

  timeInputs: { padding: scale(20) },
  timeInputGroup: { marginBottom: scale(16) },
  timeInputLabel: { fontSize: moderateScale(13), fontWeight: '600', color: C.text, marginBottom: scale(8) },
  timeInputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(12) },
  timeInput: { flex: 1, color: C.text, fontSize: moderateScale(16), marginLeft: scale(10) },

  modalActions: { flexDirection: 'row', paddingHorizontal: scale(20) },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, marginRight: scale(8) },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.success, marginLeft: scale(8) },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },
});
