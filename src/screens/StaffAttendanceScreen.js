import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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

const attendanceStatusLabels = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  HALF_DAY: 'Half Day',
  LEAVE: 'Leave',
  HOLIDAY: 'Holiday',
  WEEKLY_OFF: 'Weekly Off',
};

const getStatusStyle = (status) => {
  const configs = {
    PRESENT: { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-circle' },
    ABSENT: { bg: '#FEF2F2', text: C.danger, icon: 'close-circle' },
    HALF_DAY: { bg: '#FFFBEB', text: C.warn, icon: 'time' },
    LEAVE: { bg: '#EFF6FF', text: C.info, icon: 'calendar' },
    HOLIDAY: { bg: '#F3E8FF', text: '#9333EA', icon: 'sunny' },
    WEEKLY_OFF: { bg: '#F1F5F9', text: '#64748B', icon: 'cafe' },
  };
  return configs[status] || { bg: '#F3F4F6', text: C.muted, icon: 'help-circle' };
};

export default function StaffAttendanceScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState([]);
  const [attendance, setAttendance] = useState({});
  const [attendanceData, setAttendanceData] = useState({}); // Full attendance data with times
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [saving, setSaving] = useState(false);

  // Time tracking modal
  const [timeModal, setTimeModal] = useState(null);
  const [checkInTime, setCheckInTime] = useState('09:00');
  const [checkOutTime, setCheckOutTime] = useState('18:00');

  // Status picker modal
  const [statusModal, setStatusModal] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);

      // Fetch staff
      const staffRes = await api.get(`/owner/staff?restaurantId=${selectedRestaurantId}&status=ACTIVE`);
      if (staffRes.data.ok) {
        setStaff(staffRes.data.data || []);
      }

      // Fetch attendance for the date
      const attendanceRes = await api.get(
        `/owner/staff-attendance?restaurantId=${selectedRestaurantId}&startDate=${selectedDate}&endDate=${selectedDate}`
      );

      if (attendanceRes.data.ok) {
        const records = attendanceRes.data.data || [];
        const attendanceMap = {};
        const fullDataMap = {};

        records.forEach(a => {
          attendanceMap[a.staffId] = a.status;
          fullDataMap[a.staffId] = {
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

  // Load data when restaurant or date changes
  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, selectedDate, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const openStatusPicker = (member) => {
    setStatusModal(member);
    // Pre-fill times if editing
    const existing = attendanceData[member.id];
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

    // Mark without time
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
        Alert.alert('Success', 'Attendance marked successfully');
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to mark attendance');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to mark attendance');
    } finally {
      setSaving(false);
      setTimeModal(null);
    }
  };

  const handleBulkMark = async (status) => {
    const statusLabel = attendanceStatusLabels[status];
    const unmarkedStaff = staff.filter(s => !attendance[s.id]);

    if (unmarkedStaff.length === 0) {
      Alert.alert('Info', 'All staff members already have attendance marked');
      return;
    }

    Alert.alert(
      `Mark All ${statusLabel}`,
      `Mark ${unmarkedStaff.length} staff members as ${statusLabel}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setSaving(true);
            try {
              // Build bulk records for single API call
              const records = unmarkedStaff.map(member => {
                const checkInDateTime = status === 'PRESENT' ? `${selectedDate}T09:00:00` : undefined;
                const checkOutDateTime = status === 'PRESENT' ? `${selectedDate}T18:00:00` : undefined;

                return {
                  staffId: member.id,
                  status,
                  checkInTime: checkInDateTime,
                  checkOutTime: checkOutDateTime,
                };
              });

              // Single bulk API call instead of loop
              const response = await api.post('/owner/staff-attendance/bulk', {
                restaurantId: selectedRestaurantId,
                attendanceDate: selectedDate,
                records,
              });

              if (response.data.ok) {
                Alert.alert('Success', response.data.message || `Marked ${records.length} staff member(s) as ${statusLabel}`);
                loadData();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to mark attendance');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to mark bulk attendance');
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
    // Don't allow future dates
    if (date <= today) {
      setSelectedDate(date.toISOString().split('T')[0]);
    }
  };

  const formatTime = (dateTimeStr) => {
    if (!dateTimeStr) return '-';
    const date = new Date(dateTimeStr);
    return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Staff Attendance</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const presentCount = Object.values(attendance).filter(s => s === 'PRESENT').length;
  const absentCount = Object.values(attendance).filter(s => s === 'ABSENT').length;
  const halfDayCount = Object.values(attendance).filter(s => s === 'HALF_DAY').length;
  const markedCount = Object.keys(attendance).length;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Staff Attendance</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Date Selector */}
        <View style={styles.dateSelector}>
          <TouchableOpacity style={styles.dateBtn} onPress={() => changeDate(-1)}>
            <Icon name="chevron-back" size={20} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.dateBox}>
            <Icon name="calendar" size={20} color={C.primary} />
            <Text style={styles.dateText}>
              {new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.dateBtn, new Date(selectedDate) >= new Date(new Date().toISOString().split('T')[0]) && { opacity: 0.3 }]}
            onPress={() => changeDate(1)}
            disabled={new Date(selectedDate) >= new Date(new Date().toISOString().split('T')[0])}
          >
            <Icon name="chevron-forward" size={20} color={C.ink} />
          </TouchableOpacity>
        </View>

        {/* Summary Cards */}
        {staff.length > 0 && (
          <>
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="checkmark-circle" size={24} color={C.ok} />
                <Text style={[styles.summaryValue, { color: C.ok }]}>{presentCount}</Text>
                <Text style={styles.summaryLabel}>Present</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
                <Icon name="close-circle" size={24} color={C.danger} />
                <Text style={[styles.summaryValue, { color: C.danger }]}>{absentCount}</Text>
                <Text style={styles.summaryLabel}>Absent</Text>
              </View>
              <View style={[styles.summaryCard, { backgroundColor: '#FFFBEB' }]}>
                <Icon name="time" size={24} color={C.warn} />
                <Text style={[styles.summaryValue, { color: C.warn }]}>{halfDayCount}</Text>
                <Text style={styles.summaryLabel}>Half Day</Text>
              </View>
            </View>

            {/* Progress indicator */}
            <View style={styles.progressContainer}>
              <Text style={styles.progressText}>
                {markedCount} of {staff.length} staff members marked
              </Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(markedCount / staff.length) * 100}%` }]} />
              </View>
            </View>

            {/* Bulk Action Buttons */}
            <View style={styles.bulkActions}>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: '#ECFDF5', borderColor: C.ok }]}
                onPress={() => handleBulkMark('PRESENT')}
                disabled={saving || markedCount === staff.length}
              >
                <Icon name="checkmark-circle" size={18} color={C.ok} />
                <Text style={[styles.bulkBtnText, { color: C.ok }]}>Mark All Present</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: '#F1F5F9', borderColor: '#64748B' }]}
                onPress={() => handleBulkMark('WEEKLY_OFF')}
                disabled={saving || markedCount === staff.length}
              >
                <Icon name="cafe" size={18} color="#64748B" />
                <Text style={[styles.bulkBtnText, { color: '#64748B' }]}>Mark All Weekly Off</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Staff List */}
        {staff.length === 0 ? (
          <View style={styles.emptyBox}>
            <Icon name="people-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Staff Found</Text>
            <Text style={styles.emptyText}>Add staff members to mark attendance</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Staff')}
            >
              <Icon name="add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Add Staff</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.staffList}>
            {staff.map(member => {
              const status = attendance[member.id];
              const data = attendanceData[member.id];
              const statusStyle = status ? getStatusStyle(status) : null;

              return (
                <View key={member.id} style={styles.staffCard}>
                  <View style={styles.staffHeader}>
                    <View style={styles.staffInfo}>
                      <View style={styles.staffAvatar}>
                        <Icon name="person" size={20} color={C.primary} />
                      </View>
                      <View style={styles.staffDetails}>
                        <Text style={styles.staffName}>{member.name}</Text>
                        {member.designation && <Text style={styles.staffRole}>{member.designation}</Text>}
                      </View>
                    </View>

                    {status ? (
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
                        <Text style={[styles.statusBadgeText, { color: statusStyle.text }]}>
                          {attendanceStatusLabels[status]}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.markBtn}
                        onPress={() => openStatusPicker(member)}
                      >
                        <Icon name="add-circle" size={18} color={C.primary} />
                        <Text style={styles.markBtnText}>Mark</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Time info for marked attendance */}
                  {status && (status === 'PRESENT' || status === 'HALF_DAY') && (
                    <View style={styles.timeRow}>
                      <View style={styles.timeItem}>
                        <Icon name="log-in-outline" size={14} color={C.muted} />
                        <Text style={styles.timeLabel}>In:</Text>
                        <Text style={styles.timeValue}>{formatTime(data?.checkInTime)}</Text>
                      </View>
                      <View style={styles.timeItem}>
                        <Icon name="log-out-outline" size={14} color={C.muted} />
                        <Text style={styles.timeLabel}>Out:</Text>
                        <Text style={styles.timeValue}>{formatTime(data?.checkOutTime)}</Text>
                      </View>
                      {data?.workHours > 0 && (
                        <View style={styles.timeItem}>
                          <Icon name="time-outline" size={14} color={C.muted} />
                          <Text style={styles.timeLabel}>Hours:</Text>
                          <Text style={styles.timeValue}>{(data.workHours / 60).toFixed(1)}h</Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Status Picker Modal */}
      <Modal visible={!!statusModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Mark Attendance</Text>
              <TouchableOpacity onPress={() => setStatusModal(null)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Select attendance status for {statusModal?.name}
            </Text>

            <View style={styles.statusGrid}>
              {Object.entries(attendanceStatusLabels).map(([key, label]) => {
                const style = getStatusStyle(key);
                return (
                  <TouchableOpacity
                    key={key}
                    style={[styles.statusOption, { backgroundColor: style.bg }]}
                    onPress={() => markAttendance(statusModal.id, key)}
                  >
                    <Icon name={style.icon} size={24} color={style.text} />
                    <Text style={[styles.statusOptionText, { color: style.text }]}>{label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>

      {/* Time Input Modal */}
      <Modal visible={!!timeModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set Time</Text>
              <TouchableOpacity onPress={() => setTimeModal(null)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={styles.modalSubtitle}>
              Enter check-in and check-out times for {timeModal?.status === 'HALF_DAY' ? 'half day' : 'full day'}
            </Text>

            <View style={styles.timeInputs}>
              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Check In Time</Text>
                <View style={styles.timeInputBox}>
                  <Icon name="log-in-outline" size={20} color={C.muted} />
                  <TextInput
                    style={styles.timeInput}
                    value={checkInTime}
                    onChangeText={setCheckInTime}
                    placeholder="HH:MM"
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>

              <View style={styles.timeInputGroup}>
                <Text style={styles.timeInputLabel}>Check Out Time</Text>
                <View style={styles.timeInputBox}>
                  <Icon name="log-out-outline" size={20} color={C.muted} />
                  <TextInput
                    style={styles.timeInput}
                    value={checkOutTime}
                    onChangeText={setCheckOutTime}
                    placeholder="HH:MM"
                    placeholderTextColor={C.muted}
                  />
                </View>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setTimeModal(null)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmBtn, saving && { opacity: 0.7 }]}
                onPress={() => saveAttendanceRecord(timeModal.staffId, timeModal.status, checkInTime, checkOutTime)}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark" size={18} color="#fff" />
                    <Text style={styles.confirmBtnText}>Save</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  dateBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateText: { fontSize: 15, fontWeight: '700', color: C.ink },

  summaryRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  summaryValue: { fontSize: 22, fontWeight: '700', marginTop: 6 },
  summaryLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  progressContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  progressText: {
    fontSize: 12,
    color: C.muted,
    marginBottom: 6,
  },
  progressBar: {
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: C.ok,
    borderRadius: 2,
  },

  bulkActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 8,
  },
  bulkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  bulkBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },

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

  staffList: { paddingHorizontal: 16, paddingTop: 8 },
  staffCard: {
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  staffHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffInfo: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  staffAvatar: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffDetails: { flex: 1 },
  staffName: { fontSize: 15, fontWeight: '700', color: C.ink },
  staffRole: { fontSize: 12, color: C.muted, marginTop: 2 },

  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: { fontSize: 12, fontWeight: '600' },

  markBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#FFE8E8',
  },
  markBtnText: { fontSize: 13, fontWeight: '600', color: C.primary },

  timeRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
    gap: 16,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  timeLabel: { fontSize: 12, color: C.muted },
  timeValue: { fontSize: 12, fontWeight: '600', color: C.text },

  emptyBox: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 32 },
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

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 32 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalSubtitle: { fontSize: 14, color: C.muted, paddingHorizontal: 16, marginTop: 12 },

  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 10,
  },
  statusOption: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 6,
  },
  statusOptionText: { fontSize: 12, fontWeight: '600' },

  timeInputs: {
    padding: 16,
    gap: 16,
  },
  timeInputGroup: {
    gap: 8,
  },
  timeInputLabel: { fontSize: 14, fontWeight: '600', color: C.text },
  timeInputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  timeInput: { flex: 1, color: C.text, fontSize: 16 },

  modalActions: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: C.ink },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.ok,
  },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
