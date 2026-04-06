/**
 * ============================================================================
 * BOOKING DETAIL SCREEN - PREMIUM DESIGN
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Linking,
  Alert,
  useWindowDimensions,
  StatusBar,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { api, getImageUrl } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, verticalScale, moderateScale, isTablet } from '../utils/responsive';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  ok: '#10B981',
  okLight: '#D1FAE5',
  warn: '#F59E0B',
  warnLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  purple: '#8B5CF6',
  purpleLight: '#EDE9FE',
  serviceBlue: '#3B82F6',
  partOrange: '#F97316',
};

const GST_RATE = 0.18;

const STATUS_CONFIG = {
  DRAFT: { bg: '#F1F5F9', color: C.muted, icon: 'document-outline', label: 'Draft', step: 0 },
  SLOT_SELECTED: { bg: C.infoLight, color: C.info, icon: 'calendar-outline', label: 'Slot Selected', step: 1 },
  PENDING_PAYMENT: { bg: C.warnLight, color: C.warn, icon: 'time-outline', label: 'Pending Payment', step: 1 },
  PAYMENT_UPLOADED: { bg: C.infoLight, color: C.info, icon: 'cloud-upload-outline', label: 'Payment Uploaded', step: 2 },
  PAYMENT_VERIFIED: { bg: C.okLight, color: C.ok, icon: 'checkmark-circle-outline', label: 'Payment Verified', step: 2 },
  PAYMENT_REJECTED: { bg: C.dangerLight, color: C.danger, icon: 'close-circle-outline', label: 'Payment Rejected', step: 2 },
  ENGINEER_ASSIGNED: { bg: C.purpleLight, color: C.purple, icon: 'person-outline', label: 'Engineer Assigned', step: 3 },
  ACCEPTED_BY_ENGINEER: { bg: C.okLight, color: C.ok, icon: 'checkmark-outline', label: 'Engineer Accepted', step: 3 },
  IN_PROGRESS: { bg: C.warnLight, color: C.warn, icon: 'construct-outline', label: 'In Progress', step: 4 },
  REJECTED_BY_ENGINEER: { bg: C.dangerLight, color: C.danger, icon: 'close-outline', label: 'Engineer Rejected', step: 3 },
  COMPLETED: { bg: C.okLight, color: C.ok, icon: 'checkmark-done-circle-outline', label: 'Completed', step: 5 },
  CANCELLED: { bg: C.dangerLight, color: C.danger, icon: 'close-circle-outline', label: 'Cancelled', step: -1 },
};

const TIMELINE_STEPS = [
  { key: 'booked', icon: 'cart-outline', label: 'Booked' },
  { key: 'payment', icon: 'card-outline', label: 'Payment' },
  { key: 'verified', icon: 'checkmark-circle-outline', label: 'Verified' },
  { key: 'assigned', icon: 'person-outline', label: 'Assigned' },
  { key: 'progress', icon: 'construct-outline', label: 'In Progress' },
  { key: 'completed', icon: 'trophy-outline', label: 'Completed' },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatPrice = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

export default function BookingDetailScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const { width } = useWindowDimensions();
  const isTabletDevice = isTablet(width);

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPayingRazorpay, setIsPayingRazorpay] = useState(false);
  const isPayingRef = useRef(false);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/bookings/${bookingId}`);
      if (response.data.ok) {
        setBooking(response.data.data);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId, loadBooking]);

  // Auto-refresh polling every 30 seconds for active bookings
  const TERMINAL_BOOKING_STATUSES = ['COMPLETED', 'CANCELLED'];
  const appStateRef = useRef(AppState.currentState);

  useEffect(() => {
    if (!bookingId) return;
    if (booking && TERMINAL_BOOKING_STATUSES.includes(booking.status)) return;

    const silentRefresh = async () => {
      try {
        const response = await api.get(`/owner/bookings/${bookingId}`);
        if (response.data.ok) {
          setBooking(response.data.data);
        }
      } catch (err) {
        console.warn('[BookingDetail] Silent refresh failed:', err?.message);
      }
    };

    const intervalId = setInterval(() => {
      if (appStateRef.current === 'active') {
        silentRefresh();
      }
    }, 30000);

    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      appStateRef.current = nextAppState;
    });

    return () => {
      clearInterval(intervalId);
      appStateSubscription.remove();
    };
  }, [bookingId, booking?.status]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBooking();
  };

  const callEngineer = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  // ==================== RAZORPAY PAYMENT FOR BOOKING ====================
  const handleBookingRazorpayPayment = async () => {
    if (isPayingRef.current || !booking) return;
    isPayingRef.current = true;
    setIsPayingRazorpay(true);

    try {
      // totalAmount already includes GST + tip from backend
      const totalPayable = booking.totalAmount || 0;

      // 1. Create Razorpay order
      const orderRes = await api.post('/razorpay/create-order', {
        amount: totalPayable,
        type: 'SERVICE_BOOKING',
        referenceId: booking.id,
      });

      if (!orderRes.data.ok) {
        Alert.alert('Error', orderRes.data.error || 'Failed to create payment order');
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderRes.data.data;

      // 2. Open Razorpay checkout
      let paymentData;
      try {
        paymentData = await RazorpayCheckout.open({
          key: keyId,
          amount,
          currency,
          name: 'KNI Super App',
          description: `Service Booking - ${booking.restaurant?.name || 'Booking'}`,
          order_id: orderId,
          prefill: prefill || {},
          theme: { color: '#EF3A3A' },
        });
      } catch (checkoutError) {
        const dismissed = checkoutError.code === 0 || checkoutError.code === 2 || checkoutError.code === 'PAYMENT_CANCELLED';
        if (dismissed) {
          Alert.alert('Payment Cancelled', 'You cancelled the payment. You can try again anytime.');
        } else {
          Alert.alert('Payment Failed', checkoutError.description || 'Payment was not completed.', [
            { text: 'Retry', onPress: handleBookingRazorpayPayment },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
        return;
      }

      // 3. Verify payment with retry
      const RETRY_DELAYS = [2000, 4000, 8000];
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          const verifyRes = await api.post('/razorpay/verify', {
            type: 'SERVICE_BOOKING',
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
            bookingId: booking.id,
          });

          if (verifyRes.data.ok) {
            Alert.alert('Payment Successful!', 'Your booking payment has been verified. An engineer will be assigned shortly.', [
              { text: 'OK', onPress: () => loadBooking() },
            ]);
            return;
          } else {
            throw new Error(verifyRes.data.error || 'Verification failed');
          }
        } catch (err) {
          if (attempt < 3) {
            await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]));
            continue;
          }
          Alert.alert(
            'Payment Verification Pending',
            `Your payment of ${formatPrice(booking.totalAmount || 0)} was charged but verification could not be completed. It will be processed automatically. Contact support if not reflected within 15 minutes.`,
            [{ text: 'OK', onPress: () => loadBooking() }]
          );
        }
      }
    } catch (error) {
      console.error('Booking payment error:', error);
      Alert.alert('Error', 'Something went wrong. Please try again or contact support.');
    } finally {
      isPayingRef.current = false;
      setIsPayingRazorpay(false);
    }
  };

  // Loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Booking Details</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  // Not found state
  if (!booking) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.heroHeader}>
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>Booking Details</Text>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconBox}>
            <Icon name="alert-circle-outline" size={48} color={C.muted} />
          </View>
          <Text style={styles.emptyTitle}>Booking Not Found</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[booking.status] || STATUS_CONFIG.DRAFT;
  const currentStep = statusConfig.step;

  // Group items by category
  const groupedItems = {};
  (booking.items || []).forEach((item) => {
    const itemData = item.serviceItem || item.partItem;
    const category = itemData?.category;
    const categoryId = category?.id || 'uncategorized';
    const categoryName = category?.name || 'Uncategorized';

    if (!groupedItems[categoryId]) {
      groupedItems[categoryId] = { categoryId, categoryName, services: [], parts: [] };
    }

    if (item.serviceItem) {
      groupedItems[categoryId].services.push(item);
    } else {
      groupedItems[categoryId].parts.push(item);
    }
  });

  // Calculate payment breakdown (use DB values if available, else reverse-calculate)
  const itemSubtotal = (booking.items || []).reduce(
    (sum, item) => sum + item.priceSnapshot * item.qty, 0
  );
  const gstAmount = booking.gstAmount || Math.round(itemSubtotal * GST_RATE);
  const tipAmount = booking.tipAmount != null
    ? Math.max(0, booking.tipAmount)
    : Math.max(0, (booking.totalAmount || 0) - itemSubtotal - gstAmount);

  const engineer = booking.engineerAssignments?.[0];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Hero Header with Status */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroHeader}
      >
        <View style={styles.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.heroTitle}>#{booking.id.slice(0, 8).toUpperCase()}</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Status Badge */}
        <View style={styles.heroStatusRow}>
          <View style={[styles.heroBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={18} color={statusConfig.color} />
            <Text style={[styles.heroBadgeText, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
          <Text style={styles.heroDate}>{formatDate(booking.createdAt)}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      >
        {/* Timeline Stepper */}
        {booking.status !== 'CANCELLED' && (
          <View style={styles.timelineCard}>
            <Text style={styles.sectionTitle}>Progress Timeline</Text>
            <View style={styles.timeline}>
              {TIMELINE_STEPS.map((step, index) => {
                const isCompleted = index < currentStep;
                const isCurrent = index === currentStep;
                const isLast = index === TIMELINE_STEPS.length - 1;

                return (
                  <View key={step.key} style={styles.timelineStep}>
                    <View style={styles.timelineStepContent}>
                      <View
                        style={[
                          styles.timelineCircle,
                          isCompleted && styles.timelineCircleCompleted,
                          isCurrent && styles.timelineCircleCurrent,
                        ]}
                      >
                        {isCompleted ? (
                          <Icon name="checkmark" size={14} color="#fff" />
                        ) : (
                          <Icon
                            name={step.icon}
                            size={14}
                            color={isCurrent ? C.primary : C.muted}
                          />
                        )}
                      </View>
                      <Text
                        style={[
                          styles.timelineLabel,
                          isCompleted && styles.timelineLabelCompleted,
                          isCurrent && styles.timelineLabelCurrent,
                        ]}
                      >
                        {step.label}
                      </Text>
                    </View>
                    {!isLast && (
                      <View
                        style={[
                          styles.timelineLine,
                          isCompleted && styles.timelineLineCompleted,
                        ]}
                      />
                    )}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Restaurant Info */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.primaryDark + '15' }]}>
              <Icon name="restaurant" size={20} color={C.primary} />
            </View>
            <Text style={styles.cardTitle}>Restaurant</Text>
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.restaurantName}>{booking.restaurant?.name}</Text>
            {booking.restaurant?.address && (
              <View style={styles.infoRow}>
                <Icon name="location-outline" size={16} color={C.muted} />
                <Text style={styles.infoText}>{booking.restaurant.address}</Text>
              </View>
            )}
            {booking.restaurant?.city && (
              <View style={styles.infoRow}>
                <Icon name="navigate-outline" size={16} color={C.muted} />
                <Text style={styles.infoText}>{booking.restaurant.city}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Schedule Info */}
        {(booking.slotStartDateTime || booking.adminAdjustedSlotStart) && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.info + '15' }]}>
                <Icon name="calendar" size={20} color={C.info} />
              </View>
              <Text style={styles.cardTitle}>Schedule</Text>
            </View>
            <View style={styles.cardBody}>
              {booking.slotStartDateTime && (
                <View style={styles.scheduleItem}>
                  <Text style={styles.scheduleLabel}>Requested</Text>
                  <Text style={styles.scheduleValue}>{formatDateTime(booking.slotStartDateTime)}</Text>
                </View>
              )}
              {booking.adminAdjustedSlotStart && (
                <View style={[styles.scheduleItem, { backgroundColor: C.okLight, borderRadius: scale(8), padding: scale(10) }]}>
                  <Text style={[styles.scheduleLabel, { color: C.ok }]}>Confirmed</Text>
                  <Text style={[styles.scheduleValue, { color: C.ok }]}>
                    {formatDateTime(booking.adminAdjustedSlotStart)}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Engineer Assignment */}
        {engineer && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.purple + '15' }]}>
                <Icon name="person" size={20} color={C.purple} />
              </View>
              <Text style={styles.cardTitle}>Assigned Engineer</Text>
            </View>
            <View style={styles.engineerCard}>
              <View style={styles.engineerAvatar}>
                <Icon name="person" size={28} color={C.purple} />
              </View>
              <View style={styles.engineerInfo}>
                <Text style={styles.engineerName}>{engineer.engineer?.name || 'Engineer'}</Text>
                {engineer.engineer?.phone && (
                  <Text style={styles.engineerPhone}>{engineer.engineer.phone}</Text>
                )}
                <View style={[styles.assignmentBadge, { backgroundColor: engineer.status === 'ACCEPTED' ? C.okLight : C.warnLight }]}>
                  <Text style={[styles.assignmentBadgeText, { color: engineer.status === 'ACCEPTED' ? C.ok : C.warn }]}>
                    {engineer.status}
                  </Text>
                </View>
              </View>
              {engineer.engineer?.phone && (
                <TouchableOpacity
                  style={styles.callBtn}
                  onPress={() => callEngineer(engineer.engineer.phone)}
                >
                  <Icon name="call" size={22} color="#fff" />
                </TouchableOpacity>
              )}
            </View>

            {/* Work Log */}
            {engineer.workLog && (
              <View style={styles.workLogSection}>
                <View style={styles.workLogHeader}>
                  <Icon name="checkmark-done-circle" size={18} color={C.ok} />
                  <Text style={styles.workLogTitle}>Work Completed</Text>
                </View>
                {engineer.workLog.completionNote && (
                  <Text style={styles.workLogNote}>{engineer.workLog.completionNote}</Text>
                )}
                {engineer.workLog.proofImageUrls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.proofImages}>
                    {engineer.workLog.proofImageUrls.map((url, idx) => (
                      <Image
                        key={idx}
                        source={{ uri: getImageUrl(url) }}
                        style={styles.proofImage}
                        resizeMode="cover"
                      />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}

        {/* Service PIN Card */}
        {engineer && engineer.servicePin && engineer.servicePinExpiresAt && new Date() < new Date(engineer.servicePinExpiresAt) && (
          <View style={styles.pinCard}>
            <View style={styles.pinHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="shield-checkmark" size={20} color="#D97706" />
              </View>
              <Text style={[styles.cardTitle, { color: '#92400E' }]}>Service PIN</Text>
            </View>
            <View style={styles.pinBody}>
              <Text style={styles.pinDescription}>
                {engineer.servicePinPurpose === 'START'
                  ? 'Engineer wants to START work. Share this PIN:'
                  : 'Engineer wants to COMPLETE work. Share this PIN:'}
              </Text>
              <View style={styles.pinDisplay}>
                <Text style={styles.pinText}>{engineer.servicePin}</Text>
              </View>
              <Text style={styles.pinWarning}>
                Share this PIN only when engineer is physically present.{'\n'}
                Expires at {new Date(engineer.servicePinExpiresAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
          </View>
        )}

        {/* Items by Category */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.ink + '15' }]}>
              <Icon name="cube" size={20} color={C.ink} />
            </View>
            <Text style={styles.cardTitle}>Items</Text>
            <Text style={styles.cardSubtitle}>{(booking.items || []).length} items</Text>
          </View>

          {Object.values(groupedItems).map((category) => {
            const categoryTotal = [...category.services, ...category.parts].reduce(
              (sum, item) => sum + item.priceSnapshot * item.qty, 0
            );

            return (
              <View key={category.categoryId} style={styles.categorySection}>
                <View style={styles.categoryHeader}>
                  <Icon name="folder-outline" size={16} color={C.ink} />
                  <Text style={styles.categoryName}>{category.categoryName}</Text>
                  <Text style={styles.categoryTotal}>{formatPrice(categoryTotal)}</Text>
                </View>

                {/* Services */}
                {category.services.length > 0 && (
                  <View style={styles.itemGroup}>
                    <View style={styles.itemGroupHeader}>
                      <View style={[styles.itemGroupDot, { backgroundColor: C.serviceBlue }]} />
                      <Text style={[styles.itemGroupTitle, { color: C.serviceBlue }]}>Services</Text>
                    </View>
                    {category.services.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemRowLeft}>
                          <Text style={styles.itemName}>{item.serviceItem?.name}</Text>
                          <Text style={styles.itemMeta}>x{item.qty}</Text>
                        </View>
                        <Text style={[styles.itemPrice, { color: C.serviceBlue }]}>
                          {formatPrice(item.priceSnapshot * item.qty)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Parts */}
                {category.parts.length > 0 && (
                  <View style={styles.itemGroup}>
                    <View style={styles.itemGroupHeader}>
                      <View style={[styles.itemGroupDot, { backgroundColor: C.partOrange }]} />
                      <Text style={[styles.itemGroupTitle, { color: C.partOrange }]}>Parts</Text>
                    </View>
                    {category.parts.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <View style={styles.itemRowLeft}>
                          <Text style={styles.itemName}>{item.partItem?.name}</Text>
                          <Text style={styles.itemMeta}>x{item.qty}</Text>
                        </View>
                        <Text style={[styles.itemPrice, { color: C.partOrange }]}>
                          {formatPrice(item.priceSnapshot * item.qty)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Payment Breakdown */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.ok + '15' }]}>
              <Icon name="card" size={20} color={C.ok} />
            </View>
            <Text style={styles.cardTitle}>Payment Summary</Text>
          </View>
          <View style={styles.paymentBreakdown}>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Subtotal</Text>
              <Text style={styles.breakdownValue}>{formatPrice(itemSubtotal)}</Text>
            </View>
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>GST (18%)</Text>
              <Text style={styles.breakdownValue}>{formatPrice(gstAmount)}</Text>
            </View>
            {tipAmount > 0 && (
              <View style={styles.breakdownRow}>
                <View style={styles.tipLabel}>
                  <Icon name="heart" size={14} color={C.ok} />
                  <Text style={[styles.breakdownLabel, { color: C.ok }]}>Tip</Text>
                </View>
                <Text style={[styles.breakdownValue, { color: C.ok }]}>{formatPrice(tipAmount)}</Text>
              </View>
            )}
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>{formatPrice(booking.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Proof */}
        {booking.paymentProof && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.info + '15' }]}>
                <Icon name="receipt" size={20} color={C.info} />
              </View>
              <Text style={styles.cardTitle}>Payment Proof</Text>
              <View
                style={[
                  styles.proofStatusBadge,
                  { backgroundColor: booking.paymentProof.status === 'VERIFIED' ? C.okLight : booking.paymentProof.status === 'REJECTED' ? C.dangerLight : C.warnLight },
                ]}
              >
                <Text
                  style={[
                    styles.proofStatusText,
                    { color: booking.paymentProof.status === 'VERIFIED' ? C.ok : booking.paymentProof.status === 'REJECTED' ? C.danger : C.warn },
                  ]}
                >
                  {booking.paymentProof.status}
                </Text>
              </View>
            </View>
            {booking.paymentProof.screenshotUrl && (
              <Image
                source={{ uri: getImageUrl(booking.paymentProof.screenshotUrl) }}
                style={styles.paymentImage}
                resizeMode="contain"
              />
            )}
            {booking.paymentProof.status === 'REJECTED' && (
              <TouchableOpacity
                style={[styles.payNowBtn, isPayingRazorpay && { opacity: 0.6 }]}
                onPress={handleBookingRazorpayPayment}
                disabled={isPayingRazorpay}
              >
                {isPayingRazorpay ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="card" size={scale(18)} color="#fff" />
                    <Text style={styles.payNowBtnText}>Retry Payment</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payment Required - Pay via Razorpay */}
        {!booking.paymentProof && (booking.status === 'SLOT_SELECTED' || booking.status === 'PAYMENT_REJECTED') && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.warn + '15' }]}>
                <Icon name="card" size={20} color={C.warn} />
              </View>
              <Text style={styles.cardTitle}>Payment Required</Text>
            </View>
            <Text style={{ color: C.muted, fontSize: moderateScale(13), marginBottom: scale(12), paddingHorizontal: scale(4) }}>
              {booking.status === 'PAYMENT_REJECTED'
                ? 'Your previous payment was rejected. Please retry payment.'
                : 'Please complete payment to proceed with your booking.'}
            </Text>
            <TouchableOpacity
              style={[styles.payNowBtn, isPayingRazorpay && { opacity: 0.6 }]}
              onPress={handleBookingRazorpayPayment}
              disabled={isPayingRazorpay}
            >
              {isPayingRazorpay ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="card" size={scale(18)} color="#fff" />
                  <Text style={styles.payNowBtnText}>
                    {booking.status === 'PAYMENT_REJECTED' ? 'Retry Payment' : 'Pay Now'}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Problem Description */}
        {booking.problemDescription && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.warn + '15' }]}>
                <Icon name="document-text" size={20} color={C.warn} />
              </View>
              <Text style={styles.cardTitle}>Problem Description</Text>
            </View>
            <View style={styles.problemBox}>
              <Text style={styles.problemText}>{booking.problemDescription}</Text>
            </View>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={{ height: scale(100) }} />
      </ScrollView>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Hero Header
  heroHeader: {
    paddingBottom: scale(20),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(12),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#fff',
    letterSpacing: scale(1),
  },
  menuBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
  },
  heroBadgeText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },
  heroDate: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },

  // Loading & Empty
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: scale(32),
  },
  emptyIconBox: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },

  // Timeline
  timelineCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  sectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(16),
  },
  timeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  timelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  timelineStepContent: {
    alignItems: 'center',
  },
  timelineCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.bg,
    borderWidth: scale(2),
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  timelineCircleCompleted: {
    backgroundColor: C.ok,
    borderColor: C.ok,
  },
  timelineCircleCurrent: {
    backgroundColor: '#fff',
    borderColor: C.primary,
    borderWidth: scale(3),
  },
  timelineLabel: {
    fontSize: moderateScale(9),
    color: C.muted,
    textAlign: 'center',
    maxWidth: scale(50),
  },
  timelineLabelCompleted: {
    color: C.ok,
    fontWeight: '600',
  },
  timelineLabelCurrent: {
    color: C.primary,
    fontWeight: '700',
  },
  timelineLine: {
    position: 'absolute',
    top: scale(15),
    left: '50%',
    right: '-50%',
    height: scale(2),
    backgroundColor: C.border,
    zIndex: -1,
  },
  timelineLineCompleted: {
    backgroundColor: C.ok,
  },

  // Cards
  card: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: scale(12),
  },
  cardIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    flex: 1,
  },
  cardSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
  },
  cardBody: {
    padding: scale(16),
  },

  // Restaurant
  restaurantName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.ink,
    marginBottom: scale(10),
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(6),
  },
  infoText: {
    fontSize: moderateScale(14),
    color: C.text,
    flex: 1,
  },

  // Schedule
  scheduleItem: {
    marginBottom: scale(10),
  },
  scheduleLabel: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginBottom: scale(4),
  },
  scheduleValue: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: C.ink,
  },

  // Engineer
  engineerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: C.bg,
    margin: scale(16),
    marginTop: 0,
    borderRadius: scale(12),
  },
  engineerAvatar: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: C.purpleLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineerInfo: {
    flex: 1,
    marginLeft: scale(14),
  },
  engineerName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.ink,
  },
  engineerPhone: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginTop: scale(2),
  },
  assignmentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
    marginTop: scale(6),
  },
  assignmentBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  callBtn: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: C.ok,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Work Log
  workLogSection: {
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  workLogHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
  },
  workLogTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ok,
  },
  workLogNote: {
    fontSize: moderateScale(14),
    color: C.text,
    lineHeight: scale(20),
    marginBottom: scale(12),
  },
  proofImages: {
    marginTop: scale(8),
  },
  proofImage: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(10),
    marginRight: scale(10),
  },

  // Category Section
  categorySection: {
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    backgroundColor: '#F9FAFB',
    gap: scale(8),
  },
  categoryName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    flex: 1,
  },
  categoryTotal: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.primary,
  },

  // Item Group
  itemGroup: {
    padding: scale(14),
  },
  itemGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(10),
  },
  itemGroupDot: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
  },
  itemGroupTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: scale(8),
  },
  itemName: {
    fontSize: moderateScale(14),
    color: C.text,
    flex: 1,
  },
  itemMeta: {
    fontSize: moderateScale(12),
    color: C.muted,
    backgroundColor: C.bg,
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  itemPrice: {
    fontSize: moderateScale(14),
    fontWeight: '600',
  },

  // Payment
  paymentBreakdown: {
    padding: scale(16),
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
  },
  breakdownLabel: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  breakdownValue: {
    fontSize: moderateScale(14),
    color: C.text,
  },
  tipLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(14),
    marginTop: scale(10),
    borderTopWidth: scale(2),
    borderTopColor: C.border,
  },
  totalLabel: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  totalValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.primary,
  },

  // Payment Proof
  proofStatusBadge: {
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  proofStatusText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
  },
  paymentImage: {
    width: '100%',
    height: scale(200),
    backgroundColor: C.bg,
  },
  payNowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(14),
    marginHorizontal: scale(16),
    marginBottom: scale(16),
    gap: scale(8),
  },
  payNowBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(15),
  },

  // Problem
  problemBox: {
    padding: scale(16),
    backgroundColor: C.warnLight,
    margin: scale(16),
    marginTop: 0,
    borderRadius: scale(12),
  },
  problemText: {
    fontSize: moderateScale(14),
    color: C.text,
    lineHeight: scale(22),
  },

  // Service PIN Card
  pinCard: {
    backgroundColor: '#FFFBEB',
    borderRadius: scale(16),
    marginBottom: scale(16),
    overflow: 'hidden',
    borderWidth: scale(2),
    borderColor: '#FCD34D',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 3,
  },
  pinHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    gap: scale(12),
  },
  pinBody: {
    padding: scale(16),
    alignItems: 'center',
  },
  pinDescription: {
    fontSize: moderateScale(13),
    color: '#92400E',
    textAlign: 'center',
    marginBottom: scale(12),
  },
  pinDisplay: {
    backgroundColor: '#FFFFFF',
    borderRadius: scale(12),
    borderWidth: scale(2),
    borderColor: '#FCD34D',
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    marginBottom: scale(12),
  },
  pinText: {
    fontSize: moderateScale(36),
    fontWeight: '800',
    color: '#92400E',
    letterSpacing: scale(16),
    textAlign: 'center',
  },
  pinWarning: {
    fontSize: moderateScale(11),
    color: '#B45309',
    textAlign: 'center',
    lineHeight: scale(18),
  },
});
