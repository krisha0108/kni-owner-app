// screens/OrderTrackingScreen.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image,
  RefreshControl, Animated, Dimensions, Linking, Alert, TextInput, Modal, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, IMAGE_BASE_URL } from '../api/client';

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A', ink: '#0F172A', bg: '#F5F7FA', card: '#FFFFFF',
  text: '#111827', muted: '#6B7280', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', info: '#3B82F6', indigo: '#6366F1', danger: '#EF4444'
};
const R = 20;
const { width: W } = Dimensions.get('window');

/* ---------- STATUS MAP ---------- */
const STATUS_MAP = {
  pending: { label: 'Pending', bg: '#FFF7ED', fg: C.warn, icon: 'time-outline' },
  accepted: { label: 'Accepted', bg: '#EFF6FF', fg: C.info, icon: 'checkmark-circle-outline' },
  engineer_assigned: { label: 'Engineer Assigned', bg: '#EEF2FF', fg: C.indigo, icon: 'person-outline' },
  in_progress: { label: 'In Progress', bg: '#F0FDFA', fg: '#14B8A6', icon: 'construct-outline' },
  working: { label: 'Working', bg: '#F0FDFA', fg: '#14B8A6', icon: 'hammer-outline' },
  pending_approval: { label: 'Pending Approval', bg: '#FEF3C7', fg: '#D97706', icon: 'hourglass-outline' },
  completed: { label: 'Completed', bg: '#ECFDF5', fg: C.ok, icon: 'checkmark-done-circle' },
};

/* ---------- UTILS ---------- */
const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

const formatDuration = (seconds) => {
  if (!seconds) return '0m';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) {
    return s;
  }
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  const cleanTail = tail.replace(/^\/+/, '');
  return `${base}/${cleanTail}`;
};

/* ---------- SKELETON ---------- */
function SkeletonLoader({ pulse }) {
  return (
    <View style={{ paddingHorizontal: 16 }}>
      <Animated.View style={[st.skelHero, { opacity: pulse }]} />
      <Animated.View style={[st.skelLine, { opacity: pulse, width: '70%' }]} />
      <Animated.View style={[st.skelCard, { opacity: pulse }]} />
      <Animated.View style={[st.skelCard, { opacity: pulse, marginTop: 12 }]} />
    </View>
  );
}

/* ---------- TIMELINE STEP ---------- */
function TimelineStep({ step, isLast }) {
  const isCompleted = step.completed;
  return (
    <View style={st.timelineRow}>
      <View style={st.timelineLeft}>
        <View style={[st.timelineDot, isCompleted && st.timelineDotActive]}>
          <Icon
            name={isCompleted ? 'checkmark' : 'ellipse-outline'}
            size={12}
            color={isCompleted ? '#fff' : C.muted}
          />
        </View>
        {!isLast && <View style={[st.timelineLine, isCompleted && st.timelineLineActive]} />}
      </View>
      <View style={st.timelineContent}>
        <Text style={[st.timelineTitle, isCompleted && st.timelineTitleActive]}>
          {step.title}
        </Text>
        <Text style={st.timelineDesc}>{step.description}</Text>
        {step.timestamp && (
          <Text style={st.timelineTime}>{formatDate(step.timestamp)}</Text>
        )}
      </View>
    </View>
  );
}

/* ---------- MAIN COMPONENT ---------- */
export default function OrderTrackingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const orderId = route?.params?.orderId;

  const [order, setOrder] = useState(null);
  const [payment, setPayment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  // skeleton pulse
  const pulse = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, []);

  useEffect(() => {
    if (orderId) {
      loadOrderDetails();
    }
  }, [orderId]);

  const loadOrderDetails = async () => {
    try {
      setLoading(true);
      const [orderRes, paymentRes] = await Promise.all([
        api.get(`/app_api/owner/orders/${orderId}`),
        api.get(`/restaurant-owner/equipment-requests/${orderId}/payment`).catch(() => null)
      ]);
      console.log('Order tracking response:', orderRes.data);
      if (orderRes.data?.success) {
        setOrder(orderRes.data.data);
      }
      if (paymentRes?.data) {
        setPayment(paymentRes.data);
      }
    } catch (e) {
      console.log('Failed to load order details:', e?.response?.data || e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrderDetails();
  };

  const callEngineer = async () => {
    if (order?.engineer?.phone) {
      try {
        await Linking.openURL(`tel:${order.engineer.phone}`);
      } catch { }
    }
  };

  const handleApprove = async () => {
    Alert.alert(
      'Approve Completion',
      'Are you sure you want to approve this order completion?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          style: 'default',
          onPress: async () => {
            try {
              setApproving(true);
              const res = await api.post(`/app_api/owner/orders/${orderId}/approve-completion`);
              if (res.data?.success) {
                Alert.alert('Success', 'Order completion approved successfully');
                loadOrderDetails();
              } else {
                Alert.alert('Error', res.data?.message || 'Failed to approve completion');
              }
            } catch (e) {
              console.log('Approve error:', e?.response?.data || e?.message);
              Alert.alert('Error', e?.response?.data?.message || 'Failed to approve completion');
            } finally {
              setApproving(false);
            }
          }
        }
      ]
    );
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      Alert.alert('Error', 'Please provide a reason for rejection');
      return;
    }

    try {
      setRejecting(true);
      const res = await api.post(`/app_api/owner/orders/${orderId}/reject-completion`, {
        rejection_reason: rejectionReason.trim()
      });
      if (res.data?.success) {
        Alert.alert('Success', 'Order completion rejected');
        setShowRejectModal(false);
        setRejectionReason('');
        loadOrderDetails();
      } else {
        Alert.alert('Error', res.data?.message || 'Failed to reject completion');
      }
    } catch (e) {
      console.log('Reject error:', e?.response?.data || e?.message);
      Alert.alert('Error', e?.response?.data?.message || 'Failed to reject completion');
    } finally {
      setRejecting(false);
    }
  };

  const isPendingApproval = order?.completion_approval_status === 'pending';
  const statusMeta = STATUS_MAP[order?.tracking_status] || STATUS_MAP.pending;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* HEADER */}
      <View style={st.header}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
            <Icon name="chevron-back" size={20} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.hTitle}>Order Tracking</Text>
        </View>
        {order?.engineer?.phone && (
          <TouchableOpacity onPress={callEngineer} style={st.hBtn}>
            <Icon name="call-outline" size={18} color={C.ink} />
          </TouchableOpacity>
        )}
      </View>

      {/* BODY */}
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} />
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <SkeletonLoader pulse={pulse} />
        ) : order ? (
          <>
            {/* Order Summary Card */}
            <View style={st.card}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <View style={{ flex: 1, paddingRight: 12 }}>
                  <Text style={st.orderId}>{order.order_id}</Text>
                  <Text style={st.title}>{order.product_name}</Text>
                  <Text style={st.sub}>{order.description}</Text>
                </View>
                <View style={[st.badge, { backgroundColor: statusMeta.bg }]}>
                  <Icon name={statusMeta.icon} size={14} color={statusMeta.fg} />
                  <Text style={[st.badgeTxt, { color: statusMeta.fg }]}>{statusMeta.label}</Text>
                </View>
              </View>

              {/* Order Image */}
              {order.image && (
                <Image
                  source={{ uri: toStorageUrl(order.image) }}
                  style={st.orderImage}
                  resizeMode="cover"
                />
              )}

              {/* Meta Info */}
              <View style={st.metaRow}>
                <View style={st.metaItem}>
                  <Icon name="location-outline" size={14} color={C.muted} />
                  <Text style={st.metaText}>{order.location || '—'}</Text>
                </View>
                <View style={st.metaItem}>
                  <Icon name="calendar-outline" size={14} color={C.muted} />
                  <Text style={st.metaText}>{formatDate(order.service_date)}</Text>
                </View>
              </View>
            </View>

            {/* Engineer Card */}
            {order.engineer && (
              <View style={st.card}>
                <Text style={st.sectionTitle}>Assigned Engineer</Text>
                <View style={st.engineerRow}>
                  <View style={st.engineerAvatar}>
                    {order.engineer.photo ? (
                      <Image
                        source={{ uri: toStorageUrl(order.engineer.photo) }}
                        style={{ width: '100%', height: '100%', borderRadius: 24 }}
                      />
                    ) : (
                      <Icon name="person" size={24} color={C.muted} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.engineerName}>{order.engineer.name}</Text>
                    {order.engineer.email && (
                      <Text style={st.engineerEmail}>{order.engineer.email}</Text>
                    )}
                    {order.engineer.rating > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Icon name="star" size={14} color="#F59E0B" />
                        <Text style={st.engineerRating}>{order.engineer.rating.toFixed(1)}</Text>
                      </View>
                    )}
                  </View>
                  {order.engineer.phone && (
                    <TouchableOpacity onPress={callEngineer} style={st.callBtn}>
                      <Icon name="call" size={18} color="#fff" />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Work Details */}
            {order.tracking && (
              <View style={st.card}>
                <Text style={st.sectionTitle}>Work Details</Text>

                {/* Time Spent */}
                <View style={st.workRow}>
                  <Icon name="time-outline" size={18} color={C.primary} />
                  <Text style={st.workLabel}>Time Spent:</Text>
                  <Text style={st.workValue}>{formatDuration(order.tracking.time_spent_seconds)}</Text>
                </View>

                {/* Used Parts */}
                {order.tracking.used_parts && order.tracking.used_parts.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={st.subSectionTitle}>Parts Used</Text>
                    {order.tracking.used_parts.map((part, idx) => (
                      <View key={idx} style={st.partRow}>
                        <Icon name="cube-outline" size={14} color={C.muted} />
                        <Text style={st.partName}>{part.name || part.part_name}</Text>
                        <Text style={st.partQty}>x{part.quantity || 1}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Work Photos */}
                {order.tracking.work_photos && order.tracking.work_photos.length > 0 && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={st.subSectionTitle}>Work Photos</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                      {order.tracking.work_photos.map((photo, idx) => (
                        <Image
                          key={idx}
                          source={{ uri: photo.uri }}
                          style={st.workPhoto}
                          resizeMode="cover"
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            )}

            {/* Approval Card - Show when pending approval */}
            {isPendingApproval && (
              <View style={[st.card, { borderColor: '#D97706', borderWidth: 2 }]}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <Icon name="hourglass-outline" size={22} color="#D97706" />
                  <Text style={[st.sectionTitle, { marginLeft: 8, color: '#D97706' }]}>
                    Approval Required
                  </Text>
                </View>
                <Text style={{ color: C.text, marginBottom: 16, lineHeight: 20 }}>
                  The engineer has completed the work. Please review the work details and photos above,
                  then approve or reject the completion.
                </Text>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity
                    onPress={() => setShowRejectModal(true)}
                    disabled={approving || rejecting}
                    style={[st.actionBtn, st.rejectBtn, (approving || rejecting) && { opacity: 0.5 }]}
                  >
                    <Icon name="close-circle-outline" size={18} color={C.danger} />
                    <Text style={[st.actionBtnText, { color: C.danger }]}>Reject</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={handleApprove}
                    disabled={approving || rejecting}
                    style={[st.actionBtn, st.approveBtn, (approving || rejecting) && { opacity: 0.5 }]}
                  >
                    {approving ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Icon name="checkmark-circle-outline" size={18} color="#fff" />
                        <Text style={[st.actionBtnText, { color: '#fff' }]}>Approve</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Timeline */}
            {order.timeline && order.timeline.length > 0 && (
              <View style={st.card}>
                <Text style={st.sectionTitle}>Order Timeline</Text>
                <View style={{ marginTop: 12 }}>
                  {order.timeline.map((step, idx) => (
                    <TimelineStep
                      key={step.status}
                      step={step}
                      isLast={idx === order.timeline.length - 1}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* Restaurant Info */}
            {order.restaurant && (
              <View style={st.card}>
                <Text style={st.sectionTitle}>Restaurant</Text>
                <View style={st.restaurantRow}>
                  <Icon name="restaurant-outline" size={18} color={C.primary} />
                  <View style={{ marginLeft: 10 }}>
                    <Text style={st.restaurantName}>{order.restaurant.name}</Text>
                    <Text style={st.restaurantAddress}>{order.restaurant.address}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Payment Information */}
            <View style={st.card}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={st.paymentIconBox}>
                  <Icon name="card-outline" size={20} color={C.ok} />
                </View>
                <Text style={[st.sectionTitle, { marginLeft: 10 }]}>Payment Information</Text>
              </View>

              {payment ? (
                <>
                  {/* Payment Status & Amount */}
                  <View style={st.paymentHeader}>
                    <View>
                      <Text style={st.paymentLabel}>Status</Text>
                      <View style={[
                        st.paymentStatusBadge,
                        { backgroundColor: payment.payment_status?.toLowerCase() === 'completed' || payment.payment_status?.toLowerCase() === 'paid' || payment.payment_status?.toLowerCase() === 'approved'
                          ? '#ECFDF5' : payment.payment_status?.toLowerCase() === 'pending' || payment.payment_status?.toLowerCase() === 'send'
                          ? '#FEF3C7' : '#FEE2E2'
                        }
                      ]}>
                        <Icon
                          name={payment.payment_status?.toLowerCase() === 'completed' || payment.payment_status?.toLowerCase() === 'paid' || payment.payment_status?.toLowerCase() === 'approved'
                            ? 'checkmark-circle' : payment.payment_status?.toLowerCase() === 'pending' || payment.payment_status?.toLowerCase() === 'send'
                            ? 'time' : 'close-circle'
                          }
                          size={14}
                          color={payment.payment_status?.toLowerCase() === 'completed' || payment.payment_status?.toLowerCase() === 'paid' || payment.payment_status?.toLowerCase() === 'approved'
                            ? C.ok : payment.payment_status?.toLowerCase() === 'pending' || payment.payment_status?.toLowerCase() === 'send'
                            ? C.warn : C.danger
                          }
                        />
                        <Text style={[
                          st.paymentStatusText,
                          { color: payment.payment_status?.toLowerCase() === 'completed' || payment.payment_status?.toLowerCase() === 'paid' || payment.payment_status?.toLowerCase() === 'approved'
                            ? C.ok : payment.payment_status?.toLowerCase() === 'pending' || payment.payment_status?.toLowerCase() === 'send'
                            ? C.warn : C.danger
                          }
                        ]}>
                          {payment.payment_status}
                        </Text>
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={st.paymentLabel}>Amount</Text>
                      <Text style={st.paymentAmount}>₹{payment.amount?.toLocaleString() || 0}</Text>
                    </View>
                  </View>

                  {/* Payment Details Grid */}
                  <View style={st.paymentGrid}>
                    <View style={st.paymentGridItem}>
                      <Icon name="wallet-outline" size={16} color={C.info} />
                      <Text style={st.paymentGridLabel}>Payment Method</Text>
                      <Text style={st.paymentGridValue}>{payment.payment_method || 'N/A'}</Text>
                    </View>
                    <View style={st.paymentGridItem}>
                      <Icon name="receipt-outline" size={16} color={C.info} />
                      <Text style={st.paymentGridLabel}>Transaction ID</Text>
                      <Text style={st.paymentGridValue} numberOfLines={1}>{payment.transaction_id || 'N/A'}</Text>
                    </View>
                    <View style={st.paymentGridItem}>
                      <Icon name="calendar-outline" size={16} color={C.info} />
                      <Text style={st.paymentGridLabel}>Payment Date</Text>
                      <Text style={st.paymentGridValue}>{formatDate(payment.created_at)}</Text>
                    </View>
                    <View style={st.paymentGridItem}>
                      <Icon name="time-outline" size={16} color={C.info} />
                      <Text style={st.paymentGridLabel}>Last Updated</Text>
                      <Text style={st.paymentGridValue}>{formatDate(payment.updated_at)}</Text>
                    </View>
                  </View>

                  {/* Payment Note */}
                  {payment.payment_note && (
                    <View style={st.paymentNoteBox}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 6 }}>
                        <Icon name="chatbubble-outline" size={14} color={C.muted} />
                        <Text style={st.paymentNoteLabel}>Payment Note</Text>
                      </View>
                      <Text style={st.paymentNoteText}>{payment.payment_note}</Text>
                    </View>
                  )}

                  {/* Payment Screenshot */}
                  {payment.payment_screenshot && (
                    <View style={{ marginTop: 12 }}>
                      <Text style={st.subSectionTitle}>Payment Screenshot</Text>
                      <TouchableOpacity
                        onPress={() => {
                          const url = toStorageUrl(payment.payment_screenshot);
                          if (url) Linking.openURL(url);
                        }}
                      >
                        <Image
                          source={{ uri: toStorageUrl(payment.payment_screenshot) }}
                          style={st.paymentScreenshot}
                          resizeMode="cover"
                        />
                        <Text style={st.screenshotHint}>Tap to view full size</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              ) : (
                <View style={st.noPaymentBox}>
                  <View style={st.noPaymentIcon}>
                    <Icon name="card-outline" size={32} color={C.muted} />
                  </View>
                  <Text style={st.noPaymentTitle}>No Payment Details</Text>
                  <Text style={st.noPaymentText}>Payment information will appear here once available</Text>
                </View>
              )}
            </View>
          </>
        ) : (
          <View style={st.emptyState}>
            <Icon name="cube-outline" size={48} color={C.muted} />
            <Text style={st.emptyText}>Order not found</Text>
          </View>
        )}
      </ScrollView>

      {/* Rejection Reason Modal */}
      <Modal
        visible={showRejectModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRejectModal(false)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <Text style={st.modalTitle}>Reject Completion</Text>
              <TouchableOpacity onPress={() => setShowRejectModal(false)}>
                <Icon name="close" size={24} color={C.muted} />
              </TouchableOpacity>
            </View>
            <Text style={{ color: C.muted, marginBottom: 12 }}>
              Please provide a reason for rejecting this completion:
            </Text>
            <TextInput
              style={st.textInput}
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChangeText={setRejectionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
            <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
              <TouchableOpacity
                onPress={() => setShowRejectModal(false)}
                style={[st.modalBtn, { backgroundColor: '#F3F4F6' }]}
              >
                <Text style={{ color: C.text, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleReject}
                disabled={rejecting}
                style={[st.modalBtn, { backgroundColor: C.danger }, rejecting && { opacity: 0.5 }]}
              >
                {rejecting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Reject</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, paddingTop: 6 },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hBtn: { width: 38, height: 38, borderRadius: 12, borderWidth: 1, borderColor: '#EEF2F7', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  hTitle: { color: '#1D2254', fontWeight: '900', fontSize: 22 },

  skelHero: { height: 120, backgroundColor: '#E9EEF5', borderRadius: R, marginTop: 12, marginBottom: 10 },
  skelLine: { height: 14, backgroundColor: '#E9EEF5', borderRadius: 8, marginBottom: 10 },
  skelCard: { height: 100, backgroundColor: '#E9EEF5', borderRadius: R },

  card: { backgroundColor: '#fff', borderRadius: R, borderWidth: 1, borderColor: '#EEF2F7', padding: 14, marginHorizontal: 16, marginTop: 12 },

  orderId: { color: C.primary, fontWeight: '700', fontSize: 13, marginBottom: 4 },
  title: { color: C.text, fontWeight: '900', fontSize: 18 },
  sub: { color: C.muted, marginTop: 4 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  badgeTxt: { fontWeight: '800', fontSize: 12 },

  orderImage: { width: '100%', height: 150, borderRadius: 12, marginTop: 12 },

  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { color: C.muted, fontSize: 13 },

  sectionTitle: { color: C.ink, fontWeight: '900', fontSize: 16 },
  subSectionTitle: { color: C.text, fontWeight: '700', fontSize: 14, marginBottom: 8 },

  engineerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12 },
  engineerAvatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  engineerName: { color: C.text, fontWeight: '700', fontSize: 15 },
  engineerEmail: { color: C.muted, fontSize: 13 },
  engineerRating: { color: C.text, fontWeight: '600', marginLeft: 4 },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ok, alignItems: 'center', justifyContent: 'center' },

  workRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  workLabel: { color: C.text, fontWeight: '600' },
  workValue: { color: C.primary, fontWeight: '700' },

  partRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  partName: { flex: 1, color: C.text },
  partQty: { color: C.muted, fontWeight: '600' },

  workPhoto: { width: 80, height: 80, borderRadius: 10, marginRight: 8, borderWidth: 1, borderColor: '#E5E7EB' },

  timelineRow: { flexDirection: 'row' },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#E5E7EB', alignItems: 'center', justifyContent: 'center' },
  timelineDotActive: { backgroundColor: C.ok },
  timelineLine: { width: 2, flex: 1, backgroundColor: '#E5E7EB', marginVertical: 4 },
  timelineLineActive: { backgroundColor: C.ok },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineTitle: { color: C.muted, fontWeight: '700', fontSize: 14 },
  timelineTitleActive: { color: C.text },
  timelineDesc: { color: C.muted, fontSize: 13, marginTop: 2 },
  timelineTime: { color: C.muted, fontSize: 12, marginTop: 4 },

  restaurantRow: { flexDirection: 'row', alignItems: 'flex-start', marginTop: 10 },
  restaurantName: { color: C.text, fontWeight: '700' },
  restaurantAddress: { color: C.muted, fontSize: 13, marginTop: 2 },

  emptyState: { alignItems: 'center', marginTop: 80 },
  emptyText: { color: C.muted, marginTop: 12, fontSize: 15 },

  // Approval styles
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12 },
  rejectBtn: { backgroundColor: '#FEE2E2', borderWidth: 1, borderColor: '#FECACA' },
  approveBtn: { backgroundColor: C.ok },
  actionBtnText: { fontWeight: '700', fontSize: 14 },

  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalContent: { backgroundColor: '#fff', borderRadius: R, padding: 20, width: '100%', maxWidth: 400 },
  modalTitle: { color: C.ink, fontWeight: '900', fontSize: 18 },
  textInput: { borderWidth: 1, borderColor: C.border, borderRadius: 12, padding: 12, fontSize: 14, minHeight: 100, color: C.text },
  modalBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12 },

  // Payment styles
  paymentIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#ECFDF5', alignItems: 'center', justifyContent: 'center' },
  paymentHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', backgroundColor: '#F0FDF4', borderRadius: 12, padding: 14, marginBottom: 12 },
  paymentLabel: { fontSize: 12, color: C.muted, marginBottom: 4 },
  paymentStatusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  paymentStatusText: { fontWeight: '700', fontSize: 13 },
  paymentAmount: { fontSize: 22, fontWeight: '900', color: C.ok },
  paymentGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  paymentGridItem: { width: '48%', backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  paymentGridLabel: { fontSize: 11, color: C.muted, marginTop: 6 },
  paymentGridValue: { fontSize: 13, fontWeight: '700', color: C.text, marginTop: 2 },
  paymentNoteBox: { marginTop: 12, backgroundColor: '#F8FAFC', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#E2E8F0' },
  paymentNoteLabel: { fontSize: 12, color: C.muted, marginLeft: 6 },
  paymentNoteText: { fontSize: 13, color: C.text, lineHeight: 20 },
  paymentScreenshot: { width: '100%', height: 200, borderRadius: 12, borderWidth: 1, borderColor: '#E5E7EB' },
  screenshotHint: { fontSize: 11, color: C.muted, textAlign: 'center', marginTop: 6 },
  noPaymentBox: { alignItems: 'center', paddingVertical: 24 },
  noPaymentIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  noPaymentTitle: { fontSize: 16, fontWeight: '700', color: C.muted, marginBottom: 4 },
  noPaymentText: { fontSize: 13, color: C.muted, textAlign: 'center' },
});
