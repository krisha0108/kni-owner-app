/**
 * ============================================================================
 * AMC REQUEST DETAIL SCREEN - FULL LIFECYCLE VIEW
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Image, TextInput,
  StatusBar, Modal, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import Clipboard from '@react-native-clipboard/clipboard';
import RazorpayCheckout from 'react-native-razorpay';
import { api, getImageUrl } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import CounterOfferModal from '../components/CounterOfferModal';
import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#334155',
  muted: '#94A3B8', bg: '#F8FAFC', card: '#FFFFFF', border: '#E2E8F0',
  ok: '#10B981', okLight: '#D1FAE5', warn: '#F59E0B', warnLight: '#FEF3C7',
  danger: '#EF4444', dangerLight: '#FEE2E2', info: '#3B82F6', infoLight: '#DBEAFE',
  purple: '#7C3AED', purpleLight: '#F3E8FF', purpleDark: '#6D28D9',
};

const AMC_STATUS_CONFIG = {
  REQUESTED:         { bg: '#FEF3C7', color: '#D97706', icon: 'shield-outline', label: 'Requested', step: 0 },
  SURVEY_SCHEDULED:  { bg: '#DBEAFE', color: '#2563EB', icon: 'calendar-outline', label: 'Survey Scheduled', step: 1 },
  SURVEY_COMPLETED:  { bg: '#D1FAE5', color: '#059669', icon: 'clipboard-outline', label: 'Survey Done', step: 1 },
  PROPOSAL_SENT:     { bg: '#E0E7FF', color: '#4F46E5', icon: 'document-text-outline', label: 'Proposal Sent', step: 2 },
  PROPOSAL_ACCEPTED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle-outline', label: 'Accepted', step: 2 },
  PROPOSAL_REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Rejected', step: 2 },
  PAYMENT_PENDING:   { bg: '#FEF3C7', color: '#D97706', icon: 'card-outline', label: 'Payment Pending', step: 3 },
  PAYMENT_UPLOADED:  { bg: '#DBEAFE', color: '#2563EB', icon: 'cloud-upload-outline', label: 'Payment Uploaded', step: 3 },
  CONTRACT_ACTIVE:   { bg: '#D1FAE5', color: '#059669', icon: 'shield-checkmark-outline', label: 'Contract Active', step: 4 },
  CANCELLED:         { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled', step: -1 },
};

const TIMELINE_STEPS = [
  { key: 'requested', icon: 'shield-outline', label: 'Requested' },
  { key: 'survey', icon: 'clipboard-outline', label: 'Survey' },
  { key: 'proposal', icon: 'document-text-outline', label: 'Proposal' },
  { key: 'payment', icon: 'card-outline', label: 'Payment' },
  { key: 'contract', icon: 'shield-checkmark', label: 'Contract' },
];

const PLAN_BADGE = {
  BASIC:    { bg: '#D1FAE5', color: '#059669' },
  STANDARD: { bg: '#DBEAFE', color: '#2563EB' },
  PREMIUM:  { bg: '#F3E8FF', color: '#7C3AED' },
};

const formatDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';
const formatPrice = (amount) => '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN');

/* ─── Skeleton ─── */
function SkeletonRequestDetail({ pulse }) {
  return (
    <View style={styles.scrollContent}>
      {/* Timeline */}
      <View style={styles.timelineCard}>
        <Animated.View style={[styles.skelSectionTitle, { opacity: pulse }]} />
        <View style={styles.timeline}>
          {[1, 2, 3, 4, 5].map(i => (
            <View key={i} style={styles.timelineStep}>
              <Animated.View style={[styles.skelTimelineCircle, { opacity: pulse }]} />
              <Animated.View style={[styles.skelTimelineLabel, { opacity: pulse }]} />
            </View>
          ))}
        </View>
      </View>
      {/* Cards */}
      {[1, 2].map(i => (
        <View key={i} style={styles.card}>
          <View style={styles.cardHeader}>
            <Animated.View style={[styles.skelCardIcon, { opacity: pulse }]} />
            <Animated.View style={[styles.skelCardTitle, { opacity: pulse }]} />
          </View>
          <View style={styles.cardBody}>
            <Animated.View style={[styles.skelDetailLine, { opacity: pulse }]} />
            <Animated.View style={[styles.skelDetailLine, { opacity: pulse, width: '65%' }]} />
            <Animated.View style={[styles.skelDetailLine, { opacity: pulse, width: '80%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function AMCRequestDetailScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { requestId } = route.params || {};

  const keyboardHeight = useKeyboardHeight();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);

  // Reject modal state (Alert.prompt is iOS-only)
  const [rejectModalVisible, setRejectModalVisible] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [isCounterOfferOpen, setIsCounterOfferOpen] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadRequest = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/amc-requests/${requestId}`);
      if (response.data.ok) {
        setRequest(response.data.data);
      }
    } catch (error) {
      console.error('Error loading AMC request:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [requestId]);

  useEffect(() => {
    if (requestId) loadRequest();
  }, [requestId, loadRequest]);


  useEffect(() => {
    // Load categories to map IDs to names
    api.get('/app/categories').then(r => {
      if (r.data?.ok) setCategories(r.data.data || []);
    }).catch(() => {});
  }, []);

  const onRefresh = () => { setRefreshing(true); loadRequest(); };

  const handleAcceptProposal = async () => {
    AppAlert.alert('Accept Proposal', 'Are you sure you want to accept this proposal?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Accept', onPress: async () => {
          setSubmitting(true);
          try {
            await api.post(`/owner/amc-proposals/${request.proposal.id}/accept`);
            invalidate(`AMCRequestsList-${request.restaurant?.id}`);
            AppAlert.alert('Success', 'Proposal accepted!');
            loadRequest();
          } catch (e) {
            AppAlert.alert('Error', e.response?.data?.error || 'Failed to accept proposal');
          } finally { setSubmitting(false); }
        }
      },
    ]);
  };

  const openRejectModal = () => {
    setRejectReason('');
    setRejectModalVisible(true);
  };

  const handleRejectProposal = async () => {
    if (!rejectReason.trim()) {
      AppAlert.alert('Error', 'Please provide a reason for rejection');
      return;
    }
    setRejectModalVisible(false);
    setSubmitting(true);
    try {
      await api.post(`/owner/amc-proposals/${request.proposal.id}/reject`, { reason: rejectReason.trim() });
      invalidate(`AMCRequestsList-${request.restaurant?.id}`);
      AppAlert.alert('Done', 'Proposal rejected');
      loadRequest();
    } catch (e) {
      AppAlert.alert('Error', e.response?.data?.error || 'Failed to reject proposal');
    } finally { setSubmitting(false); }
  };

  const paymentInProgressRef = useRef(false);

  const handleRazorpayPayment = async () => {
    if (!request?.payment || paymentInProgressRef.current) return;
    paymentInProgressRef.current = true;
    setIsProcessingPayment(true);

    try {
      // 1. Create Razorpay order
      const orderRes = await api.post('/razorpay/create-order', {
        amount: request.payment.amount,
        type: 'AMC_PAYMENT',
        referenceId: request.payment.id,
      });
      if (!orderRes.data.ok) {
        AppAlert.alert('Error', orderRes.data.error || 'Failed to create payment order');
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderRes.data.data;

      // 2. Open Razorpay checkout (no money charged if this fails)
      let paymentData;
      try {
        paymentData = await RazorpayCheckout.open({
          key: keyId,
          amount,
          currency,
          name: 'KNI Super App',
          description: 'AMC Contract Payment',
          order_id: orderId,
          prefill: prefill || {},
          theme: { color: '#7C3AED' },
        });
      } catch (checkoutError) {
        const dismissed = checkoutError.code === 0 || checkoutError.code === 2 || checkoutError.code === 'PAYMENT_CANCELLED';
        if (dismissed) {
          AppAlert.alert('Payment Cancelled', 'You cancelled the payment. You can try again whenever you\'re ready.', [{ text: 'OK' }]);
        } else {
          AppAlert.alert('Payment Failed', checkoutError.description || checkoutError.message || 'Payment was not completed.', [
            { text: 'Retry', onPress: handleRazorpayPayment },
            { text: 'Cancel', style: 'cancel' },
          ]);
        }
        return;
      }

      // 3. Verify payment with retry (money IS charged at this point)
      const RETRY_DELAYS = [2000, 4000, 8000];
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          const verifyRes = await api.post('/razorpay/verify', {
            type: 'AMC_PAYMENT',
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
            amcPaymentId: request.payment.id,
          });

          if (verifyRes.data.ok) {
            const rId = request.restaurant?.id;
            invalidate(`AMCRequestsList-${rId}`);
            invalidate(`AMCContracts-${rId}`);
            invalidate(`AMCDashboard-${rId}`);
            AppAlert.alert('Payment Successful!', 'Your AMC contract is now active.', [
              { text: 'OK', onPress: () => loadRequest() },
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
          AppAlert.alert(
            'Payment Verification Pending',
            `Your payment of ₹${(request.payment.amount || 0).toLocaleString('en-IN')} was charged but verification could not be completed. It will be processed automatically. Contact support if not reflected within 15 minutes.`,
            [{ text: 'OK', onPress: () => loadRequest() }]
          );
        }
      }
    } catch (error) {
      console.error('AMC payment error:', error);
      AppAlert.alert('Error', 'Something went wrong. Please try again or contact support.');
    } finally {
      paymentInProgressRef.current = false;
      setIsProcessingPayment(false);
    }
  };

  const handleCancelRequest = () => {
    AppAlert.alert('Cancel Request', 'Are you sure you want to cancel this AMC request?', [
      { text: 'No', style: 'cancel' },
      {
        text: 'Yes, Cancel', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/owner/amc-requests/${requestId}`);
            invalidate(`AMCRequestsList-${request.restaurant?.id}`);
            AppAlert.alert('Cancelled', 'AMC request cancelled');
            (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));
          } catch (e) {
            AppAlert.alert('Error', e.response?.data?.error || 'Failed to cancel');
          }
        }
      },
    ]);
  };

  const copyUpiId = () => {
    if (paymentSettings?.upiId) {
      Clipboard.setString(paymentSettings.upiId);
      AppAlert.alert('Copied!', 'UPI ID copied to clipboard');
    }
  };

  // Map category IDs to names
  const getCategoryNames = () => {
    const eqCats = request?.equipmentCategories;
    if (!eqCats || !Array.isArray(eqCats) || eqCats.length === 0) return '';
    if (categories.length > 0) {
      return eqCats.map(id => {
        const found = categories.find(c => c.id === id);
        return found ? found.name : id;
      }).join(', ');
    }
    return eqCats.join(', ');
  };

  // Loading
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.purple} />
        <LinearGradient colors={[C.purple, C.purpleDark]} style={[styles.heroHeader, { paddingTop: insets.top }]}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity
                onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
                style={styles.backBtnPlain}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon name="chevron-back" size={24} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
                <Icon name="menu" size={24} color="#fff" />
              </TouchableOpacity>
            </View>
            <Text style={styles.heroTitle}>AMC Request</Text>
            <View style={{ width: scale(64) }} />
          </View>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonRequestDetail pulse={pulse} />
        </ScrollView>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  if (!request) {
    return (
      <SafeAreaView style={styles.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.purple} />
        <LinearGradient colors={[C.purple, C.purpleDark]} style={[styles.heroHeader, { paddingTop: insets.top }]}>
          <View style={styles.heroBlobA} pointerEvents="none" />
          <View style={styles.heroBlobB} pointerEvents="none" />
          <View style={styles.heroContent}>
            <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
              <Icon name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.heroTitle}>AMC Request</Text>
            <View style={{ width: scale(40) }} />
          </View>
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={styles.emptyTitle}>Request Not Found</Text>
        </View>
        <KniBottomNav navigation={navigation} active="equipment" />
      </SafeAreaView>
    );
  }

  const statusConfig = AMC_STATUS_CONFIG[request.status] || AMC_STATUS_CONFIG.REQUESTED;
  const currentStep = statusConfig.step;
  const planBadge = PLAN_BADGE[request.planType] || PLAN_BADGE.BASIC;
  const proposal = request.proposal;
  const survey = request.survey;
  const payment = request.payment;
  const contract = proposal?.contract;
  const isPaymentRejected = payment?.status === 'REJECTED';
  const isPaymentPhase = ['PAYMENT_PENDING', 'PAYMENT_UPLOADED'].includes(request.status) || isPaymentRejected;
  const canPayNow = request.status === 'PAYMENT_PENDING' || isPaymentRejected;

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.purple} />

      {/* Hero */}
      <LinearGradient colors={[C.purple, C.purpleDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.heroHeader, { paddingTop: insets.top }]}>
        <View style={styles.heroBlobA} pointerEvents="none" />
        <View style={styles.heroBlobB} pointerEvents="none" />
        <View style={styles.heroContent}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={styles.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
              <Icon name="menu" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text style={styles.heroTitle}>AMC Request</Text>
          <View style={{ width: scale(64) }} />
        </View>
        <View style={styles.heroStatusRow}>
          <View style={[styles.heroBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={18} color={statusConfig.color} />
            <Text style={[styles.heroBadgeText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={styles.heroDate}>{formatDate(request.createdAt)}</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.purple]} />}
      >
        {/* Timeline */}
        {request.status !== 'CANCELLED' && (
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
                      <View style={[styles.timelineCircle, isCompleted && styles.timelineCircleCompleted, isCurrent && styles.timelineCircleCurrent]}>
                        {isCompleted ? <Icon name="checkmark" size={14} color="#fff" /> : <Icon name={step.icon} size={14} color={isCurrent ? C.purple : C.muted} />}
                      </View>
                      <Text style={[styles.timelineLabel, isCompleted && styles.timelineLabelCompleted, isCurrent && styles.timelineLabelCurrent]}>{step.label}</Text>
                    </View>
                    {!isLast && <View style={[styles.timelineLine, isCompleted && styles.timelineLineCompleted]} />}
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Request Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={[styles.cardIconBox, { backgroundColor: C.purpleLight }]}>
              <Icon name="shield-outline" size={20} color={C.purple} />
            </View>
            <Text style={styles.cardTitle}>Request Details</Text>
          </View>
          <View style={styles.cardBody}>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Restaurant</Text>
              <Text style={styles.detailValue}>{request.restaurant?.name || '-'}</Text>
            </View>
            {request.restaurant?.city && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>City</Text>
                <Text style={styles.detailValue}>{request.restaurant.city}</Text>
              </View>
            )}
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Kitchen Type</Text>
              <Text style={styles.detailValue}>{(request.kitchenType || '-').replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Plan Type</Text>
              <View style={[styles.detailBadge, { backgroundColor: planBadge.bg }]}>
                <Text style={{ color: planBadge.color, fontWeight: '600', fontSize: moderateScale(12) }}>{request.planType}</Text>
              </View>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Frequency</Text>
              <Text style={styles.detailValue}>{(request.visitFrequency || '-').replace(/_/g, ' ')}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Start Date</Text>
              <Text style={styles.detailValue}>{formatDate(request.preferredStartDate)}</Text>
            </View>
            {request.equipmentCategories?.length > 0 && (
              <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Equipment Categories</Text>
                <Text style={[styles.detailValue, { textAlign: 'left', marginTop: scale(4) }]}>{getCategoryNames()}</Text>
              </View>
            )}
            {request.notes && (
              <View style={[styles.detailRow, { flexDirection: 'column', alignItems: 'flex-start' }]}>
                <Text style={styles.detailLabel}>Notes</Text>
                <Text style={[styles.detailValue, { textAlign: 'left', marginTop: scale(4) }]}>{request.notes}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Survey Card */}
        {survey && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.infoLight }]}>
                <Icon name="clipboard-outline" size={20} color={C.info} />
              </View>
              <Text style={styles.cardTitle}>Survey</Text>
            </View>
            <View style={styles.cardBody}>
              {survey.engineer?.name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Engineer</Text>
                  <Text style={styles.detailValue}>{survey.engineer.name}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Scheduled</Text>
                <Text style={styles.detailValue}>{formatDate(survey.scheduledDate)}</Text>
              </View>
              {survey.completedDate && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Completed</Text>
                  <Text style={styles.detailValue}>{formatDate(survey.completedDate)}</Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status</Text>
                <View style={[styles.detailBadge, { backgroundColor: survey.status === 'COMPLETED' ? C.okLight : C.warnLight }]}>
                  <Text style={{ color: survey.status === 'COMPLETED' ? C.ok : C.warn, fontWeight: '600', fontSize: moderateScale(12) }}>{survey.status}</Text>
                </View>
              </View>
              {survey.overallCondition && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Condition</Text>
                  <Text style={styles.detailValue}>{survey.overallCondition}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {/* Proposal Card */}
        {proposal && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: '#E0E7FF' }]}>
                <Icon name="document-text-outline" size={20} color="#4F46E5" />
              </View>
              <Text style={styles.cardTitle}>Proposal</Text>
              {proposal.status && (
                <View style={[styles.detailBadge, {
                  backgroundColor: proposal.status === 'ACCEPTED' ? C.okLight : proposal.status === 'REJECTED' ? C.dangerLight : proposal.status === 'COUNTERED' ? C.warnLight : '#E0E7FF',
                }]}>
                  <Text style={{
                    color: proposal.status === 'ACCEPTED' ? C.ok : proposal.status === 'REJECTED' ? C.danger : proposal.status === 'COUNTERED' ? C.warn : '#4F46E5',
                    fontWeight: '600', fontSize: moderateScale(11),
                  }}>{proposal.status}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              {/* Pricing */}
              <Text style={styles.pricingTitle}>Pricing</Text>
              <View style={[styles.pricingItem, { borderWidth: 1, borderColor: '#DBEAFE', alignSelf: 'flex-start', minWidth: scale(140) }]}>
                <Text style={styles.pricingLabel}>{proposal.contractPeriod === '2 YEAR' ? 'For 2 years' : 'For 1 year'}</Text>
                <Text style={[styles.pricingValue, { color: C.info }]}>{formatPrice(proposal.price)}</Text>
              </View>

              {/* Coverage */}
              <Text style={[styles.pricingTitle, { marginTop: scale(16) }]}>Coverage</Text>
              <View style={styles.coverageGrid}>
                <View style={styles.coverageItem}>
                  <Icon name="calendar-outline" size={16} color={C.info} />
                  <Text style={styles.coverageText}>{proposal.preventiveVisits || 0} preventive visits</Text>
                </View>
                <View style={styles.coverageItem}>
                  <Icon name="construct-outline" size={16} color={C.warn} />
                  <Text style={styles.coverageText}>{proposal.freeBreakdownVisits || 0} free breakdowns</Text>
                </View>
                {proposal.responseTimeSLA && (
                  <View style={styles.coverageItem}>
                    <Icon name="time-outline" size={16} color={C.ok} />
                    <Text style={styles.coverageText}>{proposal.responseTimeSLA} response SLA</Text>
                  </View>
                )}
                {proposal.resolutionTimeSLA && (
                  <View style={styles.coverageItem}>
                    <Icon name="checkmark-done-outline" size={16} color={C.purple} />
                    <Text style={styles.coverageText}>{proposal.resolutionTimeSLA} resolution SLA</Text>
                  </View>
                )}
                {proposal.contractPeriod && (
                  <View style={styles.coverageItem}>
                    <Icon name="document-outline" size={16} color={C.ink} />
                    <Text style={styles.coverageText}>Contract: {proposal.contractPeriod}</Text>
                  </View>
                )}
              </View>

              {/* Covered Equipment */}
              {Array.isArray(proposal.coveredEquipment) && proposal.coveredEquipment.length > 0 && (
                <>
                  <Text style={[styles.pricingTitle, { marginTop: scale(16) }]}>Covered Equipment</Text>
                  {proposal.coveredEquipment.map((eq, idx) => (
                    <View key={idx} style={styles.equipItem}>
                      <Icon name="hardware-chip-outline" size={14} color={C.purple} />
                      <Text style={styles.equipText}>
                        {typeof eq === 'string' ? eq : `${eq.name || ''}${eq.brand ? ` - ${eq.brand}` : ''}${eq.model ? ` (${eq.model})` : ''}`}
                      </Text>
                    </View>
                  ))}
                </>
              )}

              {/* Exclusions */}
              {Array.isArray(proposal.exclusions) && proposal.exclusions.length > 0 && (
                <>
                  <Text style={[styles.pricingTitle, { marginTop: scale(16) }]}>Exclusions</Text>
                  <View style={[styles.noteBox, { backgroundColor: C.warnLight }]}>
                    {proposal.exclusions.map((ex, idx) => (
                      <View key={idx} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: scale(6), marginBottom: scale(4) }}>
                        <Icon name="close-circle-outline" size={14} color={C.warn} style={{ marginTop: 2 }} />
                        <Text style={{ color: '#92400E', fontSize: moderateScale(13), flex: 1 }}>{typeof ex === 'string' ? ex : JSON.stringify(ex)}</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}

              {/* Spare Parts Policy */}
              {proposal.sparePartsPolicy && (
                <>
                  <Text style={[styles.pricingTitle, { marginTop: scale(16) }]}>Spare Parts Policy</Text>
                  <View style={[styles.noteBox, { backgroundColor: '#EEF2FF' }]}>
                    <Text style={{ color: '#4F46E5', fontSize: moderateScale(13) }}>{proposal.sparePartsPolicy}</Text>
                  </View>
                </>
              )}

              {/* Rejection reason */}
              {proposal.rejectionReason && (
                <View style={[styles.noteBox, { backgroundColor: C.dangerLight, marginTop: scale(12) }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: scale(4) }}>
                    <Icon name="alert-circle" size={16} color={C.danger} />
                    <Text style={{ color: C.danger, fontWeight: '700', fontSize: moderateScale(13) }}>Rejection Reason</Text>
                  </View>
                  <Text style={{ color: C.danger, fontSize: moderateScale(13) }}>{proposal.rejectionReason}</Text>
                </View>
              )}

              {/* Admin note (e.g. after revising a countered price) */}
              {proposal.adminNote && (
                <View style={[styles.noteBox, { backgroundColor: C.infoLight, marginTop: scale(12) }]}>
                  <Text style={{ color: C.info, fontWeight: '700', fontSize: moderateScale(13), marginBottom: scale(4) }}>Note from admin</Text>
                  <Text style={{ color: C.info, fontSize: moderateScale(13) }}>{proposal.adminNote}</Text>
                </View>
              )}

              {/* Accept/Reject/Negotiate buttons */}
              {request.status === 'PROPOSAL_SENT' && proposal.status === 'SENT' && (
                <>
                  <View style={styles.proposalActions}>
                    <TouchableOpacity style={styles.rejectBtn} onPress={openRejectModal} disabled={submitting}>
                      <Icon name="close-circle-outline" size={20} color={C.danger} />
                      <Text style={styles.rejectBtnText}>Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptProposal} disabled={submitting}>
                      {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                        <>
                          <Icon name="checkmark-circle-outline" size={20} color="#fff" />
                          <Text style={styles.acceptBtnText}>Accept</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), marginTop: scale(10), paddingVertical: scale(10), borderRadius: scale(10), borderWidth: 1, borderColor: C.primary }}
                    onPress={() => setIsCounterOfferOpen(true)}
                    disabled={submitting}
                  >
                    <Icon name="pricetag-outline" size={18} color={C.primary} />
                    <Text style={{ color: C.primary, fontWeight: '700', fontSize: moderateScale(14) }}>Found it cheaper? Negotiate Price</Text>
                  </TouchableOpacity>
                </>
              )}

              {/* Owner's pending counter-offer */}
              {proposal.status === 'COUNTERED' && (
                <View style={[styles.noteBox, { backgroundColor: C.warnLight, marginTop: scale(12) }]}>
                  <Text style={{ color: '#92400E', fontWeight: '700', fontSize: moderateScale(13), marginBottom: scale(4) }}>
                    You proposed {formatPrice(proposal.ownerCounterPrice)} — awaiting admin's response
                  </Text>
                  {proposal.ownerCounterMessage && (
                    <Text style={{ color: '#92400E', fontSize: moderateScale(13) }}>{proposal.ownerCounterMessage}</Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        {/* Payment Card */}
        {isPaymentPhase && payment && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.warnLight }]}>
                <Icon name="card-outline" size={20} color={C.warn} />
              </View>
              <Text style={styles.cardTitle}>Payment</Text>
              {payment.status && (
                <View style={[styles.detailBadge, {
                  backgroundColor: payment.status === 'VERIFIED' ? C.okLight : payment.status === 'REJECTED' ? C.dangerLight : payment.status === 'UPLOADED' ? C.infoLight : C.warnLight,
                }]}>
                  <Text style={{
                    color: payment.status === 'VERIFIED' ? C.ok : payment.status === 'REJECTED' ? C.danger : payment.status === 'UPLOADED' ? C.info : C.warn,
                    fontWeight: '600', fontSize: moderateScale(11),
                  }}>{payment.status}</Text>
                </View>
              )}
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.paymentAmount}>{formatPrice(payment.amount)}</Text>
              <Text style={styles.paymentSubtext}>Amount to pay</Text>

              {/* Payment Rejected Reason */}
              {isPaymentRejected && payment.rejectionReason && (
                <View style={[styles.noteBox, { backgroundColor: C.dangerLight }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: scale(4) }}>
                    <Icon name="alert-circle" size={16} color={C.danger} />
                    <Text style={{ color: C.danger, fontWeight: '700', fontSize: moderateScale(13) }}>Payment Rejected</Text>
                  </View>
                  <Text style={{ color: C.danger, fontSize: moderateScale(13) }}>{payment.rejectionReason}</Text>
                </View>
              )}

              {/* Payment Uploaded - waiting for verification */}
              {payment.status === 'UPLOADED' && (
                <View style={[styles.noteBox, { backgroundColor: C.infoLight }]}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                    <Icon name="hourglass-outline" size={16} color={C.info} />
                    <Text style={{ color: C.info, fontWeight: '600', fontSize: moderateScale(13) }}>Payment submitted, waiting for verification</Text>
                  </View>
                </View>
              )}

              {/* Razorpay Payment */}
              {canPayNow && (
                <View style={{ alignItems: 'center', paddingVertical: scale(16) }}>
                  <View style={{
                    width: scale(64), height: scale(64), borderRadius: scale(32),
                    backgroundColor: C.purpleLight, alignItems: 'center', justifyContent: 'center',
                    marginBottom: scale(12),
                  }}>
                    <Icon name="shield-checkmark" size={32} color={C.purple} />
                  </View>
                  <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(4) }}>
                    Secure Payment via Razorpay
                  </Text>
                  <Text style={{ fontSize: moderateScale(13), color: C.muted, textAlign: 'center', lineHeight: moderateScale(18) }}>
                    Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.{'\n'}Your AMC contract will be activated instantly.
                  </Text>
                  <TouchableOpacity
                    style={{
                      backgroundColor: C.purple, borderRadius: scale(12), paddingVertical: scale(14),
                      paddingHorizontal: scale(24), marginTop: scale(16), width: '100%',
                      flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
                    }}
                    onPress={handleRazorpayPayment}
                    disabled={isProcessingPayment}
                  >
                    {isProcessingPayment ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Icon name="card" size={20} color="#fff" />
                        <Text style={{ color: '#fff', fontWeight: '700', fontSize: moderateScale(15) }}>
                          Pay ₹{(payment.amount || 0).toLocaleString('en-IN')} with Razorpay
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {/* Payment Uploaded - legacy screenshot */}
              {payment.screenshotUrl && (
                <View style={{ alignItems: 'center', marginTop: scale(12) }}>
                  <Image
                    source={{ uri: payment.screenshotUrl.startsWith('http') ? payment.screenshotUrl : getImageUrl(payment.screenshotUrl) }}
                    style={{ width: scale(200), height: scale(200), borderRadius: scale(12) }}
                    resizeMode="contain"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* Contract Card */}
        {contract && (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={[styles.cardIconBox, { backgroundColor: C.okLight }]}>
                <Icon name="shield-checkmark" size={20} color={C.ok} />
              </View>
              <Text style={styles.cardTitle}>Contract Created</Text>
            </View>
            <View style={styles.cardBody}>
              <Text style={styles.contractNumber}>{contract.contractNumber || `AMC-${contract.id?.slice(0, 6).toUpperCase()}`}</Text>
              {contract.status && (
                <View style={[styles.detailBadge, { backgroundColor: contract.status === 'ACTIVE' ? C.okLight : C.warnLight, alignSelf: 'flex-start', marginBottom: scale(12) }]}>
                  <Text style={{ color: contract.status === 'ACTIVE' ? C.ok : C.warn, fontWeight: '600', fontSize: moderateScale(12) }}>{contract.status}</Text>
                </View>
              )}
              <TouchableOpacity
                style={styles.viewContractBtn}
                onPress={() => navigation.navigate('AMCContractDetail', { contractId: contract.id })}
              >
                <Text style={styles.viewContractText}>View Contract</Text>
                <Icon name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Cancel Button */}
        {request.status === 'REQUESTED' && (
          <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelRequest}>
            <Icon name="close-circle-outline" size={20} color={C.danger} />
            <Text style={styles.cancelBtnText}>Cancel Request</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* Reject Reason Modal (Android-compatible) */}
      <Modal visible={rejectModalVisible} animationType="slide" onRequestClose={() => setRejectModalVisible(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={styles.rejectModalHeader}>
            <TouchableOpacity onPress={() => setRejectModalVisible(false)} style={styles.backBtn}>
              <Icon name="close" size={24} color={C.ink} />
            </TouchableOpacity>
            <Text style={styles.rejectModalTitle}>Reject Proposal</Text>
            <View style={{ width: scale(40) }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: scale(16) }} keyboardShouldPersistTaps="handled">
            <Text style={{ fontSize: moderateScale(14), color: C.text, marginBottom: scale(12) }}>
              Please provide a reason for rejecting this proposal. This helps the admin understand your concerns.
            </Text>
            <TextInput
              style={styles.rejectTextArea}
              placeholder="Enter reason for rejection..."
              placeholderTextColor={C.muted}
              value={rejectReason}
              onChangeText={setRejectReason}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              autoFocus
            />
          </ScrollView>
          <View style={styles.rejectModalFooter}>
            <TouchableOpacity
              style={[styles.rejectSubmitBtn, !rejectReason.trim() && { backgroundColor: '#C4B5FD' }]}
              onPress={handleRejectProposal}
              disabled={!rejectReason.trim() || submitting}
            >
              {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Icon name="close-circle-outline" size={20} color="#fff" />
                  <Text style={{ color: '#fff', fontWeight: '700', fontSize: moderateScale(15) }}>Submit Rejection</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <CounterOfferModal
        visible={isCounterOfferOpen}
        endpoint={proposal ? `/owner/amc-proposals/${proposal.id}/counter` : undefined}
        currentPrice={proposal?.price}
        onClose={() => setIsCounterOfferOpen(false)}
        onSuccess={() => {
          invalidate(`AMCRequestsList-${request?.restaurant?.id}`);
          loadRequest();
        }}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="equipment" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero
  heroHeader: { paddingBottom: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24), overflow: 'hidden', position: 'relative' },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingTop: scale(8), paddingBottom: scale(12),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  backBtnPlain: { width: scale(22), height: scale(32), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  heroTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  menuBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  heroStatusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16),
  },
  heroBadge: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(14), paddingVertical: scale(8), borderRadius: scale(20),
  },
  heroBadgeText: { fontSize: moderateScale(13), fontWeight: '600' },
  heroDate: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.8)' },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: scale(16) },

  // Loading & Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(32) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(12) },

  // Timeline
  timelineCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16), marginBottom: scale(16),
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  sectionTitle: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginBottom: scale(16) },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  timelineStep: { flex: 1, alignItems: 'center' },
  timelineStepContent: { alignItems: 'center' },
  timelineCircle: {
    width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.bg,
    borderWidth: 2, borderColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(6),
  },
  timelineCircleCompleted: { backgroundColor: C.ok, borderColor: C.ok },
  timelineCircleCurrent: { backgroundColor: '#fff', borderColor: C.purple, borderWidth: 3 },
  timelineLabel: { fontSize: moderateScale(9), color: C.muted, textAlign: 'center', maxWidth: scale(50) },
  timelineLabelCompleted: { color: C.ok, fontWeight: '600' },
  timelineLabelCurrent: { color: C.purple, fontWeight: '700' },
  timelineLine: {
    position: 'absolute', top: scale(15), left: '50%', right: '-50%',
    height: 2, backgroundColor: C.border, zIndex: -1,
  },
  timelineLineCompleted: { backgroundColor: C.ok },

  // Cards
  card: {
    backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(16), overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row', alignItems: 'center', padding: scale(16),
    borderBottomWidth: 1, borderBottomColor: C.border, gap: scale(12),
  },
  cardIconBox: {
    width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center',
  },
  cardTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, flex: 1 },
  cardBody: { padding: scale(16) },

  // Detail Rows
  detailRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(8), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailLabel: { fontSize: moderateScale(13), color: C.muted },
  detailValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right' },
  detailBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8) },

  // Notes
  noteBox: {
    borderRadius: scale(12), padding: scale(14), marginTop: scale(12),
  },

  // Pricing
  pricingTitle: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  pricingGrid: { flexDirection: 'row', gap: scale(10) },
  pricingItem: {
    flex: 1, backgroundColor: C.bg, borderRadius: scale(12), padding: scale(12), alignItems: 'center',
  },
  pricingLabel: { fontSize: moderateScale(11), color: C.muted, marginBottom: scale(4) },
  pricingValue: { fontSize: moderateScale(16), fontWeight: '800', color: C.purple },

  // Coverage
  coverageGrid: { gap: scale(8) },
  coverageItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  coverageText: { fontSize: moderateScale(13), color: C.text },

  // Equipment items
  equipItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8), paddingVertical: scale(4) },
  equipText: { fontSize: moderateScale(13), color: C.text, flex: 1 },

  // Proposal Actions
  proposalActions: {
    flexDirection: 'row', gap: scale(12), marginTop: scale(16),
  },
  rejectBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 2, borderColor: C.danger,
  },
  rejectBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.danger },
  acceptBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6),
    paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.ok,
  },
  acceptBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  // Payment
  paymentAmount: { fontSize: moderateScale(28), fontWeight: '800', color: C.purple, textAlign: 'center' },
  paymentSubtext: { fontSize: moderateScale(13), color: C.muted, textAlign: 'center', marginBottom: scale(16) },

  // UPI
  qrContainer: {
    alignItems: 'center', backgroundColor: '#fff', borderRadius: scale(12), padding: scale(16),
    marginBottom: scale(16), borderWidth: 1, borderColor: C.border,
  },
  qrImage: { width: scale(180), height: scale(180) },
  upiCard: { backgroundColor: C.bg, borderRadius: scale(12), padding: scale(14), marginBottom: scale(16) },
  upiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upiLabel: { fontSize: moderateScale(12), color: C.muted },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  copyText: { fontSize: moderateScale(13), fontWeight: '600', color: C.purple },
  upiId: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginTop: scale(4), fontFamily: 'monospace' },
  upiDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(10) },
  accountName: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink, marginTop: scale(4) },

  // Contract
  contractNumber: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginBottom: scale(12) },
  viewContractBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.ok, paddingVertical: scale(14), borderRadius: scale(12),
  },
  viewContractText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Cancel
  cancelBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 2, borderColor: C.danger,
    marginTop: scale(8),
  },
  cancelBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.danger },

  // Reject Modal
  rejectModalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12),
    backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  rejectModalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  rejectTextArea: {
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    padding: scale(14), fontSize: moderateScale(15), color: C.text, minHeight: scale(150),
  },
  rejectModalFooter: {
    padding: scale(16), backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
  },
  rejectSubmitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.danger, paddingVertical: scale(14), borderRadius: scale(12),
  },

  // ═══ Skeleton ═══
  skelSectionTitle: { width: scale(140), height: scale(14), borderRadius: scale(4), backgroundColor: '#E2E8F0', marginBottom: scale(16) },
  skelTimelineCircle: { width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: '#E2E8F0', marginBottom: scale(6) },
  skelTimelineLabel: { width: scale(36), height: scale(8), borderRadius: scale(3), backgroundColor: '#E2E8F0' },
  skelCardIcon: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: '#E2E8F0' },
  skelCardTitle: { flex: 1, height: scale(16), borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelDetailLine: { height: scale(12), width: '100%', backgroundColor: '#E2E8F0', borderRadius: scale(4), marginTop: scale(12) },
});
