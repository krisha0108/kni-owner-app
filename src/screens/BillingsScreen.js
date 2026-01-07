// src/screens/BillingsScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  StatusBar,
  Modal,
  Linking,
  Share,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../api/client';
import { WebView } from 'react-native-webview';

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FF6B6B',
  secondary: '#1D2254',
  accent: '#FFD166',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#E2E8F0',
  success: '#10B981',
  warning: '#F59E0B',
  info: '#3B82F6',
  error: '#EF4444',
};

const BillingsScreen = ({ navigation }) => {
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billHtml, setBillHtml] = useState('');
  const [loadingPdf, setLoadingPdf] = useState(false);

  useEffect(() => {
    fetchBills();
  }, []);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await api.get('/restaurant-owner/bills');
      setBills(response.data || []);
    } catch (error) {
      console.log('Error fetching bills:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchBills();
    setRefreshing(false);
  }, []);

  const viewBillDetails = async (bill) => {
    setSelectedBill(bill);
    setShowBillModal(true);

    try {
      setLoadingPdf(true);
      const response = await api.get(`/restaurant-owner/bills/${bill.id}/pdf`);
      setBillHtml(response.data.html || '');
    } catch (error) {
      console.log('Error fetching bill PDF:', error);
    } finally {
      setLoadingPdf(false);
    }
  };

  const shareBill = async () => {
    if (!selectedBill) return;

    try {
      await Share.share({
        message: `KNI Invoice\nBill Number: ${selectedBill.bill_number}\nAmount: Rs. ${parseFloat(selectedBill.total_amount).toFixed(2)}\nDate: ${formatDate(selectedBill.bill_date || selectedBill.created_at)}`,
        title: `Invoice ${selectedBill.bill_number}`,
      });
    } catch (error) {
      console.log('Error sharing:', error);
    }
  };

  const emailBill = async () => {
    if (!selectedBill) return;

    const subject = encodeURIComponent(`KNI Invoice - ${selectedBill.bill_number}`);
    const body = encodeURIComponent(
      `Dear Sir/Madam,\n\n` +
      `Please find the invoice details below:\n\n` +
      `Invoice Number: ${selectedBill.bill_number}\n` +
      `Date: ${formatDate(selectedBill.bill_date || selectedBill.created_at)}\n` +
      `Restaurant: ${selectedBill.restaurant_name || 'N/A'}\n\n` +
      `--- Breakdown ---\n` +
      `Services Total: Rs. ${parseFloat(selectedBill.services_total || 0).toFixed(2)}\n` +
      `Parts Total: Rs. ${parseFloat(selectedBill.parts_total || 0).toFixed(2)}\n` +
      `Labour Charge: Rs. ${parseFloat(selectedBill.labour_charge || 0).toFixed(2)}\n` +
      `Visit Charge: Rs. ${parseFloat(selectedBill.visit_charge || 0).toFixed(2)}\n` +
      `GST (${selectedBill.gst_percentage || 18}%): Rs. ${parseFloat(selectedBill.gst_amount || 0).toFixed(2)}\n\n` +
      `Total Amount: Rs. ${parseFloat(selectedBill.total_amount).toFixed(2)}\n\n` +
      `Thank you for choosing KNI Services.\n\n` +
      `Regards,\nKNI Team`
    );

    const mailUrl = `mailto:?subject=${subject}&body=${body}`;

    try {
      const canOpen = await Linking.canOpenURL(mailUrl);
      if (canOpen) {
        await Linking.openURL(mailUrl);
      } else {
        console.log('Cannot open mail app');
      }
    } catch (error) {
      console.log('Error opening email:', error);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatCurrency = (amount) => {
    return `Rs. ${parseFloat(amount || 0).toFixed(2)}`;
  };

  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return C.success;
      case 'pending':
        return C.warning;
      case 'overdue':
        return C.error;
      default:
        return C.muted;
    }
  };

  const getPaymentStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'paid':
        return C.success;
      case 'pending':
        return C.warning;
      case 'overdue':
        return C.error;
      case 'send':
        return C.info;
      default:
        return C.muted;
    }
  };

  const renderBillCard = (bill) => {
    const breakdown = bill.breakdown || {};

    return (
      <TouchableOpacity
        key={bill.id}
        style={styles.billCard}
        onPress={() => viewBillDetails(bill)}
      >
        <View style={styles.billHeader}>
          <View style={styles.billInfo}>
            <Text style={styles.billNumber}>{bill.bill_number || `BILL-${bill.id}`}</Text>
            <Text style={styles.billDate}>{formatDate(bill.bill_date || bill.created_at)}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: getPaymentStatusColor(bill.payment_status) + '20' }]}>
            <Text style={[styles.statusText, { color: getPaymentStatusColor(bill.payment_status) }]}>
              {(bill.payment_status || 'Pending').toUpperCase()}
            </Text>
          </View>
        </View>

        <View style={styles.billBody}>
          <View style={styles.billRow}>
            <Icon name="business-outline" size={16} color={C.muted} />
            <Text style={styles.billLabel}>{bill.restaurant_name || 'N/A'}</Text>
          </View>
          <View style={styles.billRow}>
            <Icon name="person-outline" size={16} color={C.muted} />
            <Text style={styles.billLabel}>Engineer: {bill.engineer_name || 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.billBreakdown}>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Services</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(bill.services_total || breakdown?.services?.total)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Parts</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(bill.parts_total || breakdown?.parts?.total)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Labour</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(bill.labour_charge)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>Visit</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(bill.visit_charge)}</Text>
          </View>
          <View style={styles.breakdownRow}>
            <Text style={styles.breakdownLabel}>GST ({bill.gst_percentage || 18}%)</Text>
            <Text style={styles.breakdownValue}>{formatCurrency(bill.gst_amount)}</Text>
          </View>
        </View>

        <View style={styles.billFooter}>
          <Text style={styles.totalLabel}>Total Amount</Text>
          <Text style={styles.totalAmount}>{formatCurrency(bill.total_amount)}</Text>
        </View>

        <View style={styles.viewDetails}>
          <Text style={styles.viewDetailsText}>Tap to view full invoice</Text>
          <Icon name="chevron-forward" size={16} color={C.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const renderBillModal = () => (
    <Modal
      visible={showBillModal}
      animationType="slide"
      onRequestClose={() => setShowBillModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={() => setShowBillModal(false)} style={styles.closeButton}>
            <Icon name="close" size={24} color={C.text} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Invoice</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={emailBill} style={styles.actionButton}>
              <Icon name="mail-outline" size={22} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareBill} style={styles.actionButton}>
              <Icon name="share-outline" size={22} color={C.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {loadingPdf ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Loading invoice...</Text>
          </View>
        ) : billHtml ? (
          <WebView
            source={{ html: billHtml }}
            style={styles.webView}
            scalesPageToFit={true}
            javaScriptEnabled={true}
          />
        ) : (
          <View style={styles.loadingContainer}>
            <Icon name="document-text-outline" size={64} color={C.muted} />
            <Text style={styles.loadingText}>Invoice not available</Text>
          </View>
        )}

        {selectedBill && (
          <View style={styles.modalFooter}>
            <View style={styles.modalTotal}>
              <Text style={styles.modalTotalLabel}>Total</Text>
              <Text style={styles.modalTotalValue}>{formatCurrency(selectedBill.total_amount)}</Text>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading bills...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-back" size={24} color={C.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Bills</Text>
        <TouchableOpacity
          onPress={() => navigation.navigate('SpendingReports')}
          style={styles.reportsButton}
        >
          <Icon name="bar-chart-outline" size={20} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{bills.length}</Text>
          <Text style={styles.summaryLabel}>Total Bills</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {bills.filter(b => b.payment_status === 'paid').length}
          </Text>
          <Text style={styles.summaryLabel}>Paid</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>
            {bills.filter(b => b.payment_status !== 'paid').length}
          </Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
      </View>

      {/* Bills List */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {bills.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="receipt-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Bills Yet</Text>
            <Text style={styles.emptySubtitle}>Your service bills will appear here</Text>
          </View>
        ) : (
          bills.map(renderBillCard)
        )}
        <View style={{ height: 20 }} />
      </ScrollView>

      {renderBillModal()}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.muted,
    fontSize: 14,
  },
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
  backButton: {
    padding: 8,
  },
  reportsButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: C.secondary,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 20,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  summaryDivider: {
    width: 1,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: 16,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  billCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  billInfo: {},
  billNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
  },
  billDate: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  billBody: {
    marginBottom: 12,
  },
  billRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  billLabel: {
    fontSize: 13,
    color: C.muted,
    marginLeft: 8,
  },
  billBreakdown: {
    backgroundColor: C.bg,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: {
    fontSize: 13,
    color: C.muted,
  },
  breakdownValue: {
    fontSize: 13,
    color: C.text,
    fontWeight: '500',
  },
  billFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
  },
  totalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: C.primary,
  },
  viewDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  viewDetailsText: {
    fontSize: 13,
    color: C.primary,
    marginRight: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: C.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 4,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: C.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  closeButton: {
    padding: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.text,
  },
  shareButton: {
    padding: 8,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
  },
  webView: {
    flex: 1,
  },
  modalFooter: {
    backgroundColor: C.card,
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  modalTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
  },
  modalTotalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: C.primary,
  },
});

export default BillingsScreen;
