import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { launchImageLibrary } from 'react-native-image-picker';
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

const formatPrice = (amount) => {
  return `₹${(amount || 0).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getPaymentStatusStyle = (status) => {
  switch (status) {
    case 'VERIFIED':
    case 'PAID':
      return { bg: '#ECFDF5', color: C.ok, icon: 'checkmark-circle', label: 'Verified' };
    case 'UPLOADED':
    case 'PENDING_VERIFICATION':
      return { bg: '#FFFBEB', color: C.warn, icon: 'time', label: 'Pending Verification' };
    case 'REJECTED':
      return { bg: '#FEF2F2', color: C.danger, icon: 'close-circle', label: 'Rejected' };
    case 'PENDING':
    default:
      return { bg: '#EFF6FF', color: C.info, icon: 'hourglass', label: 'Awaiting Payment' };
  }
};

const getBookingStatusStyle = (status) => {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#ECFDF5', color: C.ok, label: 'Completed' };
    case 'IN_PROGRESS':
    case 'ACCEPTED':
      return { bg: '#EFF6FF', color: C.info, label: 'In Progress' };
    case 'CANCELLED':
    case 'REJECTED':
      return { bg: '#FEF2F2', color: C.danger, label: 'Cancelled' };
    case 'PENDING':
    default:
      return { bg: '#FFFBEB', color: C.warn, label: 'Pending' };
  }
};

export default function PaymentTrackingScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [booking, setBooking] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchBooking = useCallback(async () => {
    if (!bookingId) return;

    try {
      setLoading(true);
      const response = await api.get(`/owner/bookings/${bookingId}`);
      if (response.data.ok) {
        setBooking(response.data.data);
      }
    } catch (error) {
      console.log('Error fetching booking:', error);
      Alert.alert('Error', 'Failed to load booking details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useFocusEffect(
    useCallback(() => {
      fetchBooking();
    }, [fetchBooking])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchBooking();
  };

  const handleUploadProof = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to select image');
        return;
      }

      const image = result.assets?.[0];
      if (!image) return;

      setUploading(true);

      const formData = new FormData();
      formData.append('paymentProof', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || 'payment_proof.jpg',
      });

      const response = await api.post(`/owner/bookings/${bookingId}/payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (response.data.ok) {
        Alert.alert('Success', 'Payment proof uploaded successfully');
        fetchBooking();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to upload payment proof');
      }
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', error.response?.data?.error || 'Failed to upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Payment Status</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Payment Status</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.emptyBox}>
          <Icon name="receipt-outline" size={64} color={C.muted} />
          <Text style={st.emptyTitle}>Booking Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const paymentStatus = getPaymentStatusStyle(booking.paymentStatus);
  const bookingStatus = getBookingStatusStyle(booking.status);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Payment Status</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
      >
        {/* Payment Status Card */}
        <View style={[st.statusCard, { borderColor: paymentStatus.color }]}>
          <View style={[st.statusIconBox, { backgroundColor: paymentStatus.bg }]}>
            <Icon name={paymentStatus.icon} size={32} color={paymentStatus.color} />
          </View>
          <Text style={[st.statusLabel, { color: paymentStatus.color }]}>{paymentStatus.label}</Text>
          <Text style={st.bookingId}>Booking #{booking.id?.slice(-8)}</Text>
        </View>

        {/* Booking Summary */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Booking Summary</Text>
          <View style={st.summaryCard}>
            <View style={st.summaryRow}>
              <Text style={st.summaryLabel}>Restaurant</Text>
              <Text style={st.summaryValue}>{booking.restaurant?.name || '-'}</Text>
            </View>
            <View style={st.summaryRow}>
              <Text style={st.summaryLabel}>Service Date</Text>
              <Text style={st.summaryValue}>{formatDate(booking.slotStartDateTime)}</Text>
            </View>
            <View style={st.summaryRow}>
              <Text style={st.summaryLabel}>Booking Status</Text>
              <View style={[st.statusBadge, { backgroundColor: bookingStatus.bg }]}>
                <Text style={[st.statusBadgeText, { color: bookingStatus.color }]}>{bookingStatus.label}</Text>
              </View>
            </View>
            <View style={[st.summaryRow, st.summaryRowLast]}>
              <Text style={st.summaryLabelLg}>Total Amount</Text>
              <Text style={st.summaryValueLg}>{formatPrice(booking.totalAmount || 0)}</Text>
            </View>
          </View>
        </View>

        {/* Items */}
        {booking.items && booking.items.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Items ({booking.items.length})</Text>
            <View style={st.itemsCard}>
              {booking.items.map((item, index) => {
                const itemData = item.serviceItem || item.partItem;
                return (
                  <View key={item.id || index} style={st.itemRow}>
                    <View style={st.itemInfo}>
                      <Text style={st.itemName}>{itemData?.name || 'Item'}</Text>
                      <Text style={st.itemQty}>Qty: {item.qty}</Text>
                    </View>
                    <Text style={st.itemPrice}>{formatPrice(item.totalPrice || 0)}</Text>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Payment Proof Section */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Payment Proof</Text>
          {booking.paymentProofUrl ? (
            <View style={st.proofCard}>
              <Image
                source={{ uri: getImageUrl(booking.paymentProofUrl) }}
                style={st.proofImage}
                resizeMode="cover"
              />
              <View style={st.proofInfo}>
                <View style={[st.proofStatus, { backgroundColor: paymentStatus.bg }]}>
                  <Icon name={paymentStatus.icon} size={14} color={paymentStatus.color} />
                  <Text style={[st.proofStatusText, { color: paymentStatus.color }]}>
                    {paymentStatus.label}
                  </Text>
                </View>
                {booking.paymentVerifiedAt && (
                  <Text style={st.proofDate}>Verified: {formatDate(booking.paymentVerifiedAt)}</Text>
                )}
                {!booking.paymentVerifiedAt && (
                  <Text style={st.proofDate}>Uploaded: {formatDate(booking.updatedAt)}</Text>
                )}
              </View>
              {booking.paymentStatus === 'REJECTED' && (
                <TouchableOpacity style={st.reuploadBtn} onPress={handleUploadProof} disabled={uploading}>
                  {uploading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <Icon name="cloud-upload-outline" size={18} color={C.primary} />
                      <Text style={st.reuploadText}>Re-upload</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={st.uploadCard}>
              <Icon name="cloud-upload-outline" size={48} color={C.muted} />
              <Text style={st.uploadTitle}>No Payment Proof</Text>
              <Text style={st.uploadText}>Upload a screenshot or photo of your payment</Text>
              <TouchableOpacity
                style={[st.uploadBtn, uploading && st.uploadBtnDisabled]}
                onPress={handleUploadProof}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="camera" size={20} color="#fff" />
                    <Text style={st.uploadBtnText}>Upload Payment Proof</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Payment History */}
        {booking.paymentHistory && booking.paymentHistory.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>Payment History</Text>
            <View style={st.historyCard}>
              {booking.paymentHistory.map((entry, index) => (
                <View key={index} style={st.historyRow}>
                  <View style={st.historyDot} />
                  <View style={st.historyContent}>
                    <Text style={st.historyAction}>{entry.action}</Text>
                    <Text style={st.historyDate}>{formatDate(entry.date)}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Help Section */}
        <View style={st.helpCard}>
          <Icon name="help-circle-outline" size={24} color={C.info} />
          <View style={st.helpContent}>
            <Text style={st.helpTitle}>Need Help?</Text>
            <Text style={st.helpText}>Contact support if you have any payment issues</Text>
          </View>
          <TouchableOpacity style={st.helpBtn} onPress={() => navigation.navigate('SupportCenter')}>
            <Text style={st.helpBtnText}>Contact</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },

  scrollContent: { padding: 16 },

  statusCard: {
    alignItems: 'center', padding: 24, backgroundColor: C.card,
    borderRadius: 20, borderWidth: 2, marginBottom: 16,
  },
  statusIconBox: {
    width: 72, height: 72, borderRadius: 36,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  statusLabel: { fontSize: 18, fontWeight: '900', marginBottom: 4 },
  bookingId: { fontSize: 13, color: C.muted },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 12 },

  summaryCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  summaryRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  summaryRowLast: { borderBottomWidth: 0, paddingTop: 16 },
  summaryLabel: { fontSize: 14, color: C.muted },
  summaryValue: { fontSize: 14, fontWeight: '600', color: C.ink },
  summaryLabelLg: { fontSize: 16, fontWeight: '700', color: C.ink },
  summaryValueLg: { fontSize: 20, fontWeight: '900', color: C.primary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700' },

  itemsCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 12,
    borderWidth: 1, borderColor: C.border,
  },
  itemRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: C.ink },
  itemQty: { fontSize: 12, color: C.muted, marginTop: 2 },
  itemPrice: { fontSize: 14, fontWeight: '700', color: C.ink },

  proofCard: {
    backgroundColor: C.card, borderRadius: 16, overflow: 'hidden',
    borderWidth: 1, borderColor: C.border,
  },
  proofImage: { width: '100%', height: 200 },
  proofInfo: { padding: 16 },
  proofStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start',
  },
  proofStatusText: { fontSize: 12, fontWeight: '700' },
  proofDate: { fontSize: 12, color: C.muted, marginTop: 8 },
  reuploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderTopWidth: 1, borderTopColor: C.border,
  },
  reuploadText: { fontSize: 14, fontWeight: '700', color: C.primary },

  uploadCard: {
    alignItems: 'center', padding: 32, backgroundColor: C.card,
    borderRadius: 16, borderWidth: 2, borderStyle: 'dashed', borderColor: C.border,
  },
  uploadTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  uploadText: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4 },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16,
    paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, backgroundColor: C.primary,
  },
  uploadBtnDisabled: { opacity: 0.6 },
  uploadBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  historyCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border,
  },
  historyRow: { flexDirection: 'row', marginBottom: 12 },
  historyDot: {
    width: 10, height: 10, borderRadius: 5, backgroundColor: C.primary, marginTop: 4, marginRight: 12,
  },
  historyContent: { flex: 1 },
  historyAction: { fontSize: 14, fontWeight: '600', color: C.ink },
  historyDate: { fontSize: 12, color: C.muted, marginTop: 2 },

  helpCard: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    backgroundColor: '#EFF6FF', borderRadius: 16, marginTop: 8,
  },
  helpContent: { flex: 1, marginLeft: 12 },
  helpTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  helpText: { fontSize: 12, color: C.muted, marginTop: 2 },
  helpBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, backgroundColor: C.info },
  helpBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
});
