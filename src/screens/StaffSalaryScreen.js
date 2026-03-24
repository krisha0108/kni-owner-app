/**
 * ============================================================================
 * STAFF SALARY SCREEN - PREMIUM REDESIGN
 * ============================================================================
 */

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
  useWindowDimensions,
  StatusBar,
  Dimensions,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, API_BASE_URL } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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
};

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getStatusConfig = (status) => {
  const configs = {
    PENDING: { bg: C.warningLight, color: C.warning, icon: 'time', label: 'Pending' },
    PARTIAL: { bg: C.infoLight, color: C.info, icon: 'pie-chart', label: 'Partial' },
    PARTIALLY_PAID: { bg: C.infoLight, color: C.info, icon: 'pie-chart', label: 'Partial' },
    PAID: { bg: C.successLight, color: C.success, icon: 'checkmark-circle', label: 'Paid' },
  };
  return configs[status] || configs.PENDING;
};

const formatPrice = (amount) => {
  const num = amount || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export default function StaffSalaryScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salaries, setSalaries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [detailModal, setDetailModal] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Payment dialog state
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const response = await api.get(
        `/owner/staff-salary?restaurantId=${selectedRestaurantId}&month=${selectedMonth}&year=${selectedYear}`
      );

      if (response.data.ok) {
        setSalaries(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading salaries:', error);
      Alert.alert('Error', 'Failed to load salary data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedMonth, selectedYear]);

  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, selectedMonth, selectedYear, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const generateSalaries = async () => {
    const monthName = monthNames[selectedMonth - 1];
    Alert.alert(
      'Generate Salary',
      `Generate salary for all active staff for ${monthName} ${selectedYear}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          onPress: async () => {
            setGenerating(true);
            try {
              const response = await api.post('/owner/staff-salary/generate', {
                restaurantId: selectedRestaurantId,
                month: selectedMonth,
                year: selectedYear,
              });

              if (response.data.ok) {
                Alert.alert('Success', response.data.message || 'Salaries generated successfully');
                loadData();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to generate salaries');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to generate salaries');
            } finally {
              setGenerating(false);
            }
          }
        }
      ]
    );
  };

  const openPaymentDialog = (record) => {
    const remaining = record.totalPayable - record.totalPaid;
    setPaymentAmount(remaining.toString());
    setPaymentModal(record);
  };

  const handleRecordPayment = async () => {
    if (!paymentModal) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const remainingAmount = paymentModal.totalPayable - paymentModal.totalPaid;
    if (amount > remainingAmount) {
      Alert.alert('Error', `Payment cannot exceed remaining amount (${formatPrice(remainingAmount)})`);
      return;
    }

    setIsRecordingPayment(true);
    try {
      const response = await api.patch(`/owner/staff-salary/${paymentModal.id}?action=payment`, {
        amountPaid: amount,
      });

      if (response.data.ok) {
        Alert.alert('Success', response.data.message || 'Payment recorded successfully');
        setPaymentModal(null);
        setPaymentAmount('');
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to record payment');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to record payment');
    } finally {
      setIsRecordingPayment(false);
    }
  };

  const handleDeleteRecord = (record) => {
    if (record.totalPaid > 0) {
      Alert.alert('Cannot Delete', 'Cannot delete salary record with payments made');
      return;
    }

    Alert.alert(
      'Delete Salary Record',
      `Delete salary record for ${record.staff?.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/owner/staff-salary/${record.id}`);
              if (response.data.ok) {
                Alert.alert('Success', 'Salary record deleted');
                loadData();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete');
            }
          }
        }
      ]
    );
  };

  const changeMonth = (direction) => {
    let newMonth = selectedMonth + direction;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  // Summary calculations
  const totalPayable = salaries.reduce((sum, r) => sum + (r.totalPayable || 0), 0);
  const totalPaid = salaries.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
  const totalPending = totalPayable - totalPaid;
  const staffCount = salaries.length;

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Staff Salary</Text>
            <Text style={st.headerSubtitle}>Manage monthly payments</Text>
          </View>
          <View style={st.headerActions}>
            <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading salaries...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ==================== RENDER SALARY CARD ====================
  const renderSalaryCard = (item) => {
    const statusConfig = getStatusConfig(item.status);
    const remaining = item.totalPayable - item.totalPaid;
    const progressPercent = item.totalPayable > 0 ? (item.totalPaid / item.totalPayable) * 100 : 0;

    return (
      <View key={item.id} style={[st.card, isTablet && st.cardTablet]}>
        {/* Card Header */}
        <View style={st.cardHeader}>
          <View style={st.staffInfo}>
            <View style={st.staffAvatar}>
              <Icon name="person" size={scale(20)} color={C.primary} />
            </View>
            <View style={st.staffDetails}>
              <Text style={st.staffName}>{item.staff?.name || 'Staff'}</Text>
              <Text style={st.staffRole}>{item.staff?.designation || 'Staff Member'}</Text>
            </View>
          </View>
          <View style={[st.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={scale(12)} color={statusConfig.color} />
            <Text style={[st.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        {/* Amount Details */}
        <View style={st.amountRow}>
          <View style={st.amountItem}>
            <Text style={st.amountLabel}>Payable</Text>
            <Text style={st.amountValue}>{formatPrice(item.totalPayable)}</Text>
          </View>
          <View style={st.amountItem}>
            <Text style={st.amountLabel}>Paid</Text>
            <Text style={[st.amountValue, { color: C.success }]}>{formatPrice(item.totalPaid)}</Text>
          </View>
          <View style={st.amountItem}>
            <Text style={st.amountLabel}>Remaining</Text>
            <Text style={[st.amountValue, { color: remaining > 0 ? C.warning : C.success }]}>
              {formatPrice(remaining)}
            </Text>
          </View>
        </View>

        {/* Progress Bar */}
        <View style={st.progressContainer}>
          <View style={st.progressBar}>
            <View style={[st.progressFill, { width: `${Math.min(progressPercent, 100)}%` }]} />
          </View>
          <Text style={st.progressText}>{progressPercent.toFixed(0)}% paid</Text>
        </View>

        {/* Allowances/Deductions */}
        {(item.allowances > 0 || item.deductions > 0) && (
          <View style={st.extraRow}>
            {item.allowances > 0 && (
              <View style={st.extraItem}>
                <Icon name="add-circle" size={scale(14)} color={C.success} />
                <Text style={st.extraText}>+{formatPrice(item.allowances)}</Text>
              </View>
            )}
            {item.deductions > 0 && (
              <View style={st.extraItem}>
                <Icon name="remove-circle" size={scale(14)} color={C.danger} />
                <Text style={st.extraText}>-{formatPrice(item.deductions)}</Text>
              </View>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={st.slipBtn}
            onPress={() => Linking.openURL(`${API_BASE_URL}/owner/staff-salary/${item.id}/slip`)}
          >
            <Icon name="document-text-outline" size={scale(16)} color={C.warning} />
          </TouchableOpacity>
          <TouchableOpacity style={st.detailBtn} onPress={() => setDetailModal(item)}>
            <Icon name="eye-outline" size={scale(16)} color={C.info} />
            <Text style={[st.actionBtnText, { color: C.info }]}>Details</Text>
          </TouchableOpacity>

          {item.status !== 'PAID' && (
            <TouchableOpacity style={st.payBtn} onPress={() => openPaymentDialog(item)}>
              <Icon name="cash" size={scale(16)} color="#fff" />
              <Text style={st.payBtnText}>Pay {formatPrice(remaining)}</Text>
            </TouchableOpacity>
          )}

          {item.totalPaid === 0 && (
            <TouchableOpacity style={st.deleteBtn} onPress={() => handleDeleteRecord(item)}>
              <Icon name="trash-outline" size={scale(16)} color={C.danger} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Staff Salary</Text>
          <Text style={st.headerSubtitle}>Manage monthly payments</Text>
        </View>
        <View style={st.headerActions}>
          {salaries.length > 0 && (
            <TouchableOpacity
              style={[st.headerIconBtn, { backgroundColor: C.primaryLight }]}
              onPress={generateSalaries}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color={C.primary} />
              ) : (
                <Icon name="add" size={scale(20)} color={C.primary} />
              )}
            </TouchableOpacity>
          )}
          <TouchableOpacity style={st.headerIconBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        style={st.content}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Month Selector */}
        <View style={st.monthSelector}>
          <TouchableOpacity style={st.monthBtn} onPress={() => changeMonth(-1)}>
            <Icon name="chevron-back" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
          <View style={st.monthBox}>
            <Icon name="calendar" size={scale(20)} color={C.primary} />
            <Text style={st.monthText}>{monthNames[selectedMonth - 1]} {selectedYear}</Text>
          </View>
          <TouchableOpacity style={st.monthBtn} onPress={() => changeMonth(1)}>
            <Icon name="chevron-forward" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>

        {/* Summary Stats */}
        {salaries.length > 0 && (
          <View style={st.statsRow}>
            <View style={[st.statCard, { backgroundColor: C.infoLight }]}>
              <Icon name="people" size={scale(20)} color={C.info} />
              <Text style={[st.statValue, { color: C.info }]}>{staffCount}</Text>
              <Text style={st.statLabel}>Staff</Text>
            </View>
            <View style={[st.statCard, { backgroundColor: C.primaryLight }]}>
              <Icon name="wallet" size={scale(20)} color={C.primary} />
              <Text style={[st.statValue, { color: C.primary }]}>{formatPrice(totalPayable)}</Text>
              <Text style={st.statLabel}>Payable</Text>
            </View>
            <View style={[st.statCard, { backgroundColor: C.successLight }]}>
              <Icon name="checkmark-done" size={scale(20)} color={C.success} />
              <Text style={[st.statValue, { color: C.success }]}>{formatPrice(totalPaid)}</Text>
              <Text style={st.statLabel}>Paid</Text>
            </View>
            <View style={[st.statCard, { backgroundColor: C.warningLight }]}>
              <Icon name="time" size={scale(20)} color={C.warning} />
              <Text style={[st.statValue, { color: C.warning }]}>{formatPrice(totalPending)}</Text>
              <Text style={st.statLabel}>Pending</Text>
            </View>
          </View>
        )}

        {/* Salary Cards or Empty State */}
        {salaries.length === 0 ? (
          <View style={st.emptyState}>
            <View style={st.emptyIcon}>
              <Icon name="cash-outline" size={scale(64)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>No Salaries Generated</Text>
            <Text style={st.emptySubtitle}>
              Generate salaries for {monthNames[selectedMonth - 1]} {selectedYear}
            </Text>
            <TouchableOpacity
              style={st.generateBtn}
              onPress={generateSalaries}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="add-circle" size={scale(18)} color="#fff" />
                  <Text style={st.generateBtnText}>Generate Salary</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[st.cardList, isTablet && st.cardListTablet]}>
            {salaries.map(item => renderSalaryCard(item))}
          </View>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!detailModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Salary Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)} style={st.modalClose}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
              <View style={st.detailCard}>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Staff Name</Text>
                  <Text style={st.detailValue}>{detailModal?.staff?.name}</Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Designation</Text>
                  <Text style={st.detailValue}>{detailModal?.staff?.designation || 'N/A'}</Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Period</Text>
                  <Text style={st.detailValue}>
                    {monthNames[(detailModal?.month || 1) - 1]} {detailModal?.year}
                  </Text>
                </View>
              </View>

              <View style={st.detailCard}>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Basic Salary</Text>
                  <Text style={st.detailValue}>{formatPrice(detailModal?.basicSalary)}</Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Allowances</Text>
                  <Text style={[st.detailValue, { color: C.success }]}>
                    +{formatPrice(detailModal?.allowances)}
                  </Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Deductions</Text>
                  <Text style={[st.detailValue, { color: C.danger }]}>
                    -{formatPrice(detailModal?.deductions)}
                  </Text>
                </View>
                <View style={[st.detailRow, st.totalRow]}>
                  <Text style={st.totalLabel}>Total Payable</Text>
                  <Text style={st.totalValue}>{formatPrice(detailModal?.totalPayable)}</Text>
                </View>
              </View>

              <View style={st.detailCard}>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Total Paid</Text>
                  <Text style={[st.detailValue, { color: C.success }]}>
                    {formatPrice(detailModal?.totalPaid)}
                  </Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Remaining</Text>
                  <Text style={[st.detailValue, { color: C.warning }]}>
                    {formatPrice((detailModal?.totalPayable || 0) - (detailModal?.totalPaid || 0))}
                  </Text>
                </View>
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Status</Text>
                  <View style={[st.statusBadge, { backgroundColor: getStatusConfig(detailModal?.status).bg }]}>
                    <Icon
                      name={getStatusConfig(detailModal?.status).icon}
                      size={scale(12)}
                      color={getStatusConfig(detailModal?.status).color}
                    />
                    <Text style={[st.statusText, { color: getStatusConfig(detailModal?.status).color }]}>
                      {getStatusConfig(detailModal?.status).label}
                    </Text>
                  </View>
                </View>
              </View>
            </ScrollView>

            {detailModal?.status !== 'PAID' && (
              <View style={st.modalFooter}>
                <TouchableOpacity
                  style={st.modalPayBtn}
                  onPress={() => {
                    setDetailModal(null);
                    openPaymentDialog(detailModal);
                  }}
                >
                  <Icon name="cash" size={scale(20)} color="#fff" />
                  <Text style={st.modalPayBtnText}>Record Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal visible={!!paymentModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Record Payment</Text>
              <TouchableOpacity
                onPress={() => { setPaymentModal(null); setPaymentAmount(''); }}
                style={st.modalClose}
              >
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} showsVerticalScrollIndicator={false}>
              <Text style={st.paymentSubtitle}>
                Record salary payment for {paymentModal?.staff?.name}
              </Text>

              {/* Payment Summary */}
              <View style={st.paymentSummary}>
                <View style={st.paymentSummaryItem}>
                  <Text style={st.paymentSummaryLabel}>Total</Text>
                  <Text style={st.paymentSummaryValue}>{formatPrice(paymentModal?.totalPayable)}</Text>
                </View>
                <View style={st.paymentSummaryItem}>
                  <Text style={st.paymentSummaryLabel}>Paid</Text>
                  <Text style={[st.paymentSummaryValue, { color: C.success }]}>
                    {formatPrice(paymentModal?.totalPaid)}
                  </Text>
                </View>
                <View style={st.paymentSummaryItem}>
                  <Text style={st.paymentSummaryLabel}>Due</Text>
                  <Text style={[st.paymentSummaryValue, { color: C.warning }]}>
                    {formatPrice((paymentModal?.totalPayable || 0) - (paymentModal?.totalPaid || 0))}
                  </Text>
                </View>
              </View>

              {/* Payment Amount Input */}
              <View style={st.inputGroup}>
                <Text style={st.inputLabel}>Payment Amount (₹)</Text>
                <View style={st.inputBox}>
                  <Icon name="cash-outline" size={scale(20)} color={C.muted} />
                  <TextInput
                    style={st.input}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="Enter amount"
                    placeholderTextColor={C.muted}
                  />
                </View>
                <Text style={st.inputHint}>Enter full or partial payment amount</Text>
              </View>
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity
                style={st.cancelBtn}
                onPress={() => { setPaymentModal(null); setPaymentAmount(''); }}
                disabled={isRecordingPayment}
              >
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.confirmPayBtn, isRecordingPayment && { opacity: 0.7 }]}
                onPress={handleRecordPayment}
                disabled={isRecordingPayment}
              >
                {isRecordingPayment ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="checkmark-circle" size={scale(18)} color="#fff" />
                    <Text style={st.confirmPayBtnText}>Record Payment</Text>
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

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  headerSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  headerActions: { flexDirection: 'row' },
  headerIconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },

  content: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },

  // Month Selector
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
  },
  monthBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBox: { flexDirection: 'row', alignItems: 'center' },
  monthText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, marginLeft: scale(8) },

  // Stats
  statsRow: { flexDirection: 'row', paddingHorizontal: scale(16), paddingTop: scale(16) },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: scale(10),
    borderRadius: scale(12),
    marginHorizontal: scale(3),
  },
  statValue: { fontSize: moderateScale(14), fontWeight: '800', marginTop: scale(4) },
  statLabel: { fontSize: moderateScale(9), fontWeight: '600', color: C.muted, marginTop: scale(2) },

  // Card List
  cardList: { paddingHorizontal: scale(16), paddingTop: scale(16) },
  cardListTablet: { flexDirection: 'row', flexWrap: 'wrap' },

  // Salary Card
  card: {
    backgroundColor: C.card,
    padding: scale(16),
    borderRadius: scale(14),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTablet: { width: '48%', marginHorizontal: '1%' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(12) },
  staffInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  staffAvatar: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  staffDetails: { flex: 1, marginLeft: scale(12) },
  staffName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  staffRole: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusText: { fontSize: moderateScale(11), fontWeight: '600', marginLeft: scale(4) },

  // Amount Row
  amountRow: { flexDirection: 'row', marginBottom: scale(12) },
  amountItem: { flex: 1, backgroundColor: C.bg, padding: scale(10), borderRadius: scale(8), marginHorizontal: scale(2) },
  amountLabel: { fontSize: moderateScale(10), color: C.muted, marginBottom: scale(2) },
  amountValue: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },

  // Progress
  progressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) },
  progressBar: { flex: 1, height: scale(6), backgroundColor: C.border, borderRadius: scale(3), overflow: 'hidden', marginRight: scale(10) },
  progressFill: { height: '100%', backgroundColor: C.success, borderRadius: scale(3) },
  progressText: { fontSize: moderateScale(11), color: C.muted, fontWeight: '600' },

  // Extra Row (Allowances/Deductions)
  extraRow: { flexDirection: 'row', marginBottom: scale(12) },
  extraItem: { flexDirection: 'row', alignItems: 'center', marginRight: scale(16) },
  extraText: { fontSize: moderateScale(12), color: C.text, marginLeft: scale(4) },

  // Card Actions
  cardActions: { flexDirection: 'row', marginTop: scale(4) },
  detailBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: C.infoLight,
    marginRight: scale(8),
  },
  actionBtnText: { fontSize: moderateScale(12), fontWeight: '600', marginLeft: scale(4) },
  payBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: C.success,
    marginRight: scale(8),
  },
  payBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: '#fff', marginLeft: scale(4) },
  deleteBtn: {
    width: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: C.dangerLight,
  },
  slipBtn: {
    width: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: C.warningLight,
    marginRight: scale(8),
  },

  // Empty State
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIcon: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(24),
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
    backgroundColor: C.primary,
    borderRadius: scale(14),
  },
  generateBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  modalClose: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: { padding: scale(20) },
  modalFooter: {
    flexDirection: 'row',
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // Detail Card
  detailCard: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailLabel: { fontSize: moderateScale(13), color: C.muted },
  detailValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  totalRow: {
    backgroundColor: C.card,
    marginTop: scale(8),
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    borderBottomWidth: 0,
  },
  totalLabel: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  totalValue: { fontSize: moderateScale(18), fontWeight: '800', color: C.primary },

  modalPayBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.success,
    paddingVertical: scale(14),
    borderRadius: scale(12),
  },
  modalPayBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },

  // Payment Modal
  paymentSubtitle: { fontSize: moderateScale(14), color: C.muted, marginBottom: scale(16) },
  paymentSummary: { flexDirection: 'row', marginBottom: scale(20) },
  paymentSummaryItem: {
    flex: 1,
    backgroundColor: C.bg,
    padding: scale(12),
    borderRadius: scale(10),
    marginHorizontal: scale(3),
  },
  paymentSummaryLabel: { fontSize: moderateScale(11), color: C.muted, marginBottom: scale(4) },
  paymentSummaryValue: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },

  inputGroup: { marginBottom: scale(16) },
  inputLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.text, marginBottom: scale(8) },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: C.bg,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  input: { flex: 1, color: C.text, fontSize: moderateScale(16), marginLeft: scale(10) },
  inputHint: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(6) },

  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    marginRight: scale(8),
  },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  confirmPayBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.success,
  },
  confirmPayBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff', marginLeft: scale(8) },
});
