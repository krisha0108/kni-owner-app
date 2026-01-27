import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  TextInput,
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

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const getStatusConfig = (status) => {
  const configs = {
    PENDING: { bg: '#FFFBEB', color: C.warn, icon: 'time', label: 'Pending' },
    PARTIAL: { bg: '#EFF6FF', color: C.info, icon: 'pie-chart', label: 'Partial' },
    PARTIALLY_PAID: { bg: '#EFF6FF', color: C.info, icon: 'pie-chart', label: 'Partial' },
    PAID: { bg: '#ECFDF5', color: C.ok, icon: 'checkmark-circle', label: 'Paid' },
  };
  return configs[status] || configs.PENDING;
};

const formatPrice = (amount) => {
  // Convert from paise to rupees (API stores amounts in paise)
  const num = (amount || 0) / 100;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
};

export default function StaffSalaryScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [salaries, setSalaries] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [restaurants, setRestaurants] = useState([]);
  const [detailModal, setDetailModal] = useState(null);
  const [generating, setGenerating] = useState(false);

  // Payment dialog state
  const [paymentModal, setPaymentModal] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [isRecordingPayment, setIsRecordingPayment] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant, selectedMonth, selectedYear])
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
        const response = await api.get(
          `/owner/staff-salary?restaurantId=${selectedRestaurant}&month=${selectedMonth}&year=${selectedYear}`
        );

        if (response.data.ok) {
          setSalaries(response.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading salaries:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
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
                restaurantId: selectedRestaurant,
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
    const remaining = (record.totalPayable - record.totalPaid) / 100;
    setPaymentAmount(remaining.toFixed(2));
    setPaymentModal(record);
  };

  const handleRecordPayment = async () => {
    if (!paymentModal) return;

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid payment amount');
      return;
    }

    const remainingAmount = (paymentModal.totalPayable - paymentModal.totalPaid) / 100;
    if (amount > remainingAmount) {
      Alert.alert('Error', `Payment amount cannot exceed remaining amount (${formatPrice(paymentModal.totalPayable - paymentModal.totalPaid)})`);
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
      `Delete salary record for ${record.staff?.name}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/owner/staff-salary/${record.id}`);
              if (response.data.ok) {
                Alert.alert('Success', 'Salary record deleted successfully');
                loadData();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to delete salary record');
              }
            } catch (error) {
              Alert.alert('Error', error.response?.data?.error || 'Failed to delete salary record');
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

  const calculateSummary = () => {
    const totalPayable = salaries.reduce((sum, record) => sum + (record.totalPayable || 0), 0);
    const totalPaid = salaries.reduce((sum, record) => sum + (record.totalPaid || 0), 0);
    const totalPending = totalPayable - totalPaid;
    const staffCount = salaries.length;

    return { totalPayable, totalPaid, totalPending, staffCount };
  };

  const summary = calculateSummary();

  const renderSalaryCard = ({ item }) => {
    const statusConfig = getStatusConfig(item.status);
    const remaining = item.totalPayable - item.totalPaid;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.iconBox}>
            <Icon name="person" size={24} color={C.primary} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{item.staff?.name || 'Staff'}</Text>
            <Text style={styles.cardSub}>{item.staff?.designation || 'Staff'}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
            <Text style={[styles.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
        </View>

        <View style={styles.detailsRow}>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Basic Salary</Text>
            <Text style={styles.detailValue}>{formatPrice(item.basicSalary)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Total Payable</Text>
            <Text style={[styles.detailValue, { color: C.ink }]}>{formatPrice(item.totalPayable)}</Text>
          </View>
          <View style={styles.detailBox}>
            <Text style={styles.detailLabel}>Paid</Text>
            <Text style={[styles.detailValue, { color: C.ok }]}>{formatPrice(item.totalPaid)}</Text>
          </View>
        </View>

        {/* Allowances/Deductions Row */}
        {(item.allowances > 0 || item.deductions > 0) && (
          <View style={styles.allowanceRow}>
            {item.allowances > 0 && (
              <View style={styles.allowanceItem}>
                <Icon name="add-circle" size={14} color={C.ok} />
                <Text style={styles.allowanceText}>Allowances: {formatPrice(item.allowances)}</Text>
              </View>
            )}
            {item.deductions > 0 && (
              <View style={styles.allowanceItem}>
                <Icon name="remove-circle" size={14} color={C.danger} />
                <Text style={styles.allowanceText}>Deductions: {formatPrice(item.deductions)}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.viewBtn}
            onPress={() => setDetailModal(item)}
          >
            <Icon name="eye-outline" size={16} color={C.info} />
            <Text style={[styles.actionText, { color: C.info }]}>Details</Text>
          </TouchableOpacity>

          {item.status !== 'PAID' && (
            <TouchableOpacity
              style={styles.payBtn}
              onPress={() => openPaymentDialog(item)}
            >
              <Icon name="cash" size={16} color="#fff" />
              <Text style={[styles.actionText, { color: '#fff' }]}>Pay {formatPrice(remaining)}</Text>
            </TouchableOpacity>
          )}

          {item.totalPaid === 0 && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteRecord(item)}
            >
              <Icon name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
          )}
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
          <Text style={styles.headerTitle}>Staff Salary</Text>
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
          <Text style={styles.headerTitle}>Staff Salary</Text>
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
        <Text style={styles.headerTitle}>Staff Salary</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Month Selector */}
      <View style={styles.monthSelector}>
        <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(-1)}>
          <Icon name="chevron-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.monthBox}>
          <Icon name="calendar" size={20} color={C.primary} />
          <Text style={styles.monthText}>
            {monthNames[selectedMonth - 1]} {selectedYear}
          </Text>
        </View>
        <TouchableOpacity style={styles.monthBtn} onPress={() => changeMonth(1)}>
          <Icon name="chevron-forward" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Summary Cards - Same as Web */}
      {salaries.length > 0 && (
        <View style={styles.summaryGrid}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIcon}>
              <Icon name="people" size={18} color={C.info} />
            </View>
            <Text style={styles.summaryLabel}>Staff Count</Text>
            <Text style={styles.summaryValue}>{summary.staffCount}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FFE8E8' }]}>
              <Icon name="wallet" size={18} color={C.primary} />
            </View>
            <Text style={styles.summaryLabel}>Total Payable</Text>
            <Text style={styles.summaryValue}>{formatPrice(summary.totalPayable)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#ECFDF5' }]}>
              <Icon name="trending-up" size={18} color={C.ok} />
            </View>
            <Text style={styles.summaryLabel}>Total Paid</Text>
            <Text style={[styles.summaryValue, { color: C.ok }]}>{formatPrice(summary.totalPaid)}</Text>
          </View>
          <View style={styles.summaryCard}>
            <View style={[styles.summaryIcon, { backgroundColor: '#FFFBEB' }]}>
              <Icon name="time" size={18} color={C.warn} />
            </View>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: C.warn }]}>{formatPrice(summary.totalPending)}</Text>
          </View>
        </View>
      )}

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

      <FlatList
        data={salaries}
        keyExtractor={item => item.id.toString()}
        renderItem={renderSalaryCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="cash-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Salaries Generated</Text>
            <Text style={styles.emptyText}>Generate salaries for {monthNames[selectedMonth - 1]} {selectedYear}</Text>
            <TouchableOpacity
              style={styles.generateBtn}
              onPress={generateSalaries}
              disabled={generating}
            >
              {generating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="add-circle" size={18} color="#fff" />
                  <Text style={styles.generateBtnText}>Generate Salary</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        }
      />

      {/* Detail Modal */}
      <Modal visible={!!detailModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Salary Details</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Staff Name</Text>
                <Text style={styles.detailRowValue}>{detailModal?.staff?.name}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Designation</Text>
                <Text style={styles.detailRowValue}>{detailModal?.staff?.designation || 'N/A'}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Month/Year</Text>
                <Text style={styles.detailRowValue}>
                  {monthNames[(detailModal?.month || 1) - 1]} {detailModal?.year}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Basic Salary</Text>
                <Text style={styles.detailRowValue}>{formatPrice(detailModal?.basicSalary)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Allowances</Text>
                <Text style={[styles.detailRowValue, { color: C.ok }]}>
                  +{formatPrice(detailModal?.allowances)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Deductions</Text>
                <Text style={[styles.detailRowValue, { color: C.danger }]}>
                  -{formatPrice(detailModal?.deductions)}
                </Text>
              </View>
              <View style={[styles.detailRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Payable</Text>
                <Text style={styles.totalValue}>{formatPrice(detailModal?.totalPayable)}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Total Paid</Text>
                <Text style={[styles.detailRowValue, { color: C.ok }]}>
                  {formatPrice(detailModal?.totalPaid)}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Remaining</Text>
                <Text style={[styles.detailRowValue, { color: C.warn }]}>
                  {formatPrice((detailModal?.totalPayable || 0) - (detailModal?.totalPaid || 0))}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailRowLabel}>Status</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusConfig(detailModal?.status).bg }]}>
                  <Icon
                    name={getStatusConfig(detailModal?.status).icon}
                    size={14}
                    color={getStatusConfig(detailModal?.status).color}
                  />
                  <Text style={[styles.statusText, { color: getStatusConfig(detailModal?.status).color }]}>
                    {getStatusConfig(detailModal?.status).label}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {detailModal?.status !== 'PAID' && (
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  style={styles.modalPayBtn}
                  onPress={() => {
                    setDetailModal(null);
                    openPaymentDialog(detailModal);
                  }}
                >
                  <Icon name="cash" size={20} color="#fff" />
                  <Text style={styles.modalPayBtnText}>Record Payment</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* Payment Modal - Supports Partial Payments */}
      <Modal visible={!!paymentModal} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Record Payment</Text>
              <TouchableOpacity onPress={() => { setPaymentModal(null); setPaymentAmount(''); }}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.paymentSubtitle}>
                Record salary payment for {paymentModal?.staff?.name}
              </Text>

              {/* Payment Summary */}
              <View style={styles.paymentSummary}>
                <View style={styles.paymentSummaryItem}>
                  <Text style={styles.paymentSummaryLabel}>Total Payable</Text>
                  <Text style={styles.paymentSummaryValue}>{formatPrice(paymentModal?.totalPayable)}</Text>
                </View>
                <View style={styles.paymentSummaryItem}>
                  <Text style={styles.paymentSummaryLabel}>Already Paid</Text>
                  <Text style={styles.paymentSummaryValue}>{formatPrice(paymentModal?.totalPaid)}</Text>
                </View>
                <View style={styles.paymentSummaryItem}>
                  <Text style={styles.paymentSummaryLabel}>Remaining</Text>
                  <Text style={[styles.paymentSummaryValue, { color: C.warn }]}>
                    {formatPrice((paymentModal?.totalPayable || 0) - (paymentModal?.totalPaid || 0))}
                  </Text>
                </View>
              </View>

              {/* Payment Amount Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Payment Amount (₹) *</Text>
                <View style={styles.inputBox}>
                  <Icon name="cash-outline" size={18} color={C.muted} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={paymentAmount}
                    onChangeText={setPaymentAmount}
                    keyboardType="decimal-pad"
                    placeholder="Enter payment amount"
                    placeholderTextColor={C.muted}
                  />
                </View>
                <Text style={styles.inputHint}>
                  Enter full amount for complete payment or partial amount
                </Text>
              </View>
            </View>

            <View style={styles.modalFooter}>
              <View style={styles.footerActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => { setPaymentModal(null); setPaymentAmount(''); }}
                  disabled={isRecordingPayment}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.confirmPayBtn, isRecordingPayment && { opacity: 0.7 }]}
                  onPress={handleRecordPayment}
                  disabled={isRecordingPayment}
                >
                  {isRecordingPayment ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Icon name="checkmark-circle" size={18} color="#fff" />
                      <Text style={styles.confirmPayBtnText}>Record Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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

  monthSelector: {
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
  monthBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthBox: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  monthText: { fontSize: 16, fontWeight: '700', color: C.ink },

  // Summary Grid - 4 cards like web
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    marginTop: 12,
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: C.card,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: '700', color: C.ink },

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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
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
  cardSub: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  detailsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  detailBox: { flex: 1, backgroundColor: C.bg, padding: 10, borderRadius: 8 },
  detailLabel: { fontSize: 10, color: C.muted, marginBottom: 4 },
  detailValue: { fontSize: 13, fontWeight: '700', color: C.ink },

  allowanceRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  allowanceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  allowanceText: { fontSize: 12, color: C.text },

  cardActions: { flexDirection: 'row', gap: 8 },
  viewBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
  },
  payBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.ok,
  },
  deleteBtn: {
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  actionText: { fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingTop: 80 },
  generateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  generateBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '85%' },
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
  modalFooter: { padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailRowLabel: { fontSize: 14, color: C.muted },
  detailRowValue: { fontSize: 14, fontWeight: '600', color: C.ink },
  totalRow: { backgroundColor: C.bg, paddingHorizontal: 12, borderRadius: 8, marginTop: 8 },
  totalLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  totalValue: { fontSize: 18, fontWeight: '700', color: C.primary },

  modalPayBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.ok,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalPayBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Payment Modal Styles
  paymentSubtitle: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 16,
  },
  paymentSummary: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  paymentSummaryItem: {
    flex: 1,
    backgroundColor: C.bg,
    padding: 12,
    borderRadius: 10,
  },
  paymentSummaryLabel: { fontSize: 11, color: C.muted, marginBottom: 4 },
  paymentSummaryValue: { fontSize: 14, fontWeight: '700', color: C.ink },

  inputGroup: { marginBottom: 16 },
  inputLabel: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, color: C.text, fontSize: 16 },
  inputHint: { fontSize: 12, color: C.muted, marginTop: 6 },

  footerActions: {
    flexDirection: 'row',
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
  confirmPayBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.ok,
  },
  confirmPayBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
