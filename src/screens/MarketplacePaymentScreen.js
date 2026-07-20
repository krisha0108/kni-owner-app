/**
 * ============================================================================
 * MARKETPLACE PAYMENT SCREEN
 * Owner pays via Razorpay → order auto-created
 * ============================================================================
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  StatusBar,
  Image,
} from 'react-native';
import { CommonActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, uploadFile } from '../api/client';
import AppAlert from '../utils/AppAlert';
import cartService from '../services/marketplaceCartService';

import { scale, moderateScale } from '../utils/responsive';
import { invalidate } from '../utils/focusCache';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#EF3A3A',
  gradient2: '#DC2626',
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
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  danger: '#EF4444',
};

const formatPrice = (price) => {
  return `₹${(price || 0).toLocaleString('en-IN')}`;
};

export default function MarketplacePaymentScreen({ navigation, route }) {
  const {
    vendorId,
    vendorName,
    isAdminStore,
    items = [],
    restaurantId,
    deliveryAddress = '',
    deliveryNotes = '',
  } = route.params || {};

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayOrderIdResult, setRazorpayOrderIdResult] = useState(null);
  const isSubmittingRef = useRef(false);

  // Manual payment state (for non-admin vendors)
  const [vendorPaymentInfo, setVendorPaymentInfo] = useState(null);
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(!isAdminStore);
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [manualPaymentSuccess, setManualPaymentSuccess] = useState(false);

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch vendor payment info for non-admin stores
  useEffect(() => {
    if (isAdminStore || !vendorId) return;
    const fetchVendorPaymentInfo = async () => {
      try {
        setLoadingPaymentInfo(true);
        const res = await api.get(`/owner/marketplace/vendor-payment-info?vendorId=${vendorId}`);
        if (res.data.ok) {
          setVendorPaymentInfo(res.data.data);
        }
      } catch (err) {
        console.warn('Failed to fetch vendor payment info:', err);
      } finally {
        setLoadingPaymentInfo(false);
      }
    };
    fetchVendorPaymentInfo();
  }, [vendorId, isAdminStore]);

  // Pick screenshot for manual payment
  const handlePickScreenshot = async () => {
    const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8 });
    if (!result.didCancel && result.assets?.[0]) {
      setScreenshotUri(result.assets[0].uri);
    }
  };

  // Submit manual payment (screenshot upload)
  const handleManualPayment = async () => {
    if (isSubmittingRef.current || !screenshotUri) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Upload screenshot (using native fetch — axios FormData unreliable on Android)
      const uploadForm = new FormData();
      const ext = (screenshotUri || '').split('.').pop()?.toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
      uploadForm.append('file', {
        uri: screenshotUri,
        type: mimeMap[ext] || 'image/jpeg',
        name: `payment-${Date.now()}.${ext || 'jpg'}`,
      });
      const uploadRes = await uploadFile(uploadForm);
      const screenshotUrl = uploadRes.data?.data?.url;
      if (!screenshotUrl) throw new Error('Upload failed');

      // 2. Submit payment
      const payRes = await api.post('/owner/marketplace/payments', {
        restaurantId,
        vendorId,
        items: items.map(item => ({
          productId: item.product?.id || item.id || item.productId,
          qty: item.quantity,
        })),
        screenshotUrl,
        deliveryAddress: deliveryAddress || undefined,
        notes: deliveryNotes || undefined,
      });

      if (payRes.data.ok) {
        await clearCartWithRetry();
        invalidate(`OrderTracking-${restaurantId}`);
        setManualPaymentSuccess(true);
      } else {
        AppAlert.alert('Error', payRes.data.error || 'Payment submission failed');
      }
    } catch (error) {
      console.error('Manual payment error:', error);
      AppAlert.alert('Error', error.message || 'Failed to submit payment');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // Generate a simple idempotency key
  const generateIdempotencyKey = () =>
    `${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;

  // Clear cart with retry (Bug #10)
  const clearCartWithRetry = async () => {
    for (let i = 0; i < 3; i++) {
      try {
        await cartService.clearCart(restaurantId, { vendorId });
        return true;
      } catch (e) {
        console.warn(`Cart clear attempt ${i + 1} failed:`, e);
        if (i < 2) await new Promise(r => setTimeout(r, 1000));
      }
    }
    return false;
  };

  // Verify payment with retry and exponential backoff (Bugs #1, #6)
  const verifyPaymentWithRetry = async (paymentData, idempotencyKey) => {
    const RETRY_DELAYS = [2000, 4000, 8000];

    for (let attempt = 0; attempt <= 3; attempt++) {
      try {
        const verifyRes = await api.post('/razorpay/verify', {
          type: 'MARKETPLACE',
          razorpay_order_id: paymentData.razorpay_order_id,
          razorpay_payment_id: paymentData.razorpay_payment_id,
          razorpay_signature: paymentData.razorpay_signature,
          vendorId,
          restaurantId,
          items: items.map(item => ({
            productId: item.product?.id || item.id || item.productId,
            qty: item.quantity,
          })),
          deliveryAddress: deliveryAddress || undefined,
          notes: deliveryNotes || undefined,
        }, {
          headers: { 'X-Idempotency-Key': idempotencyKey },
          timeout: 30000,
        });

        if (verifyRes.data.ok) {
          const cartCleared = await clearCartWithRetry();
          if (!cartCleared) {
            AppAlert.alert(
              'Note',
              'Payment successful! Cart could not be cleared automatically — you may see old items in your cart.',
              [{ text: 'OK' }]
            );
          }
          invalidate(`OrderTracking-${restaurantId}`);
          setRazorpaySuccess(true);
          setRazorpayOrderIdResult(verifyRes.data.data?.orderId || null);
          return;
        } else {
          throw new Error(verifyRes.data.error || 'Verification failed');
        }
      } catch (error) {
        if (attempt < 3) {
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]));
          continue;
        }
        // All retries exhausted — money was charged but verification pending
        AppAlert.alert(
          'Payment Verification Pending',
          `Your payment of ${formatPrice(totalAmount)} was charged successfully but verification could not be completed. Your order will be processed automatically. If you don't see it in your orders within 15 minutes, please contact support.`,
          [
            {
              text: 'View Orders',
              onPress: () => navigation.dispatch(
                CommonActions.reset({
                  index: 1,
                  routes: [{ name: 'Home' }, { name: 'MarketplaceOrders' }],
                })
              ),
            },
            { text: 'OK' },
          ]
        );
        return;
      }
    }
  };

  // ==================== RAZORPAY PAYMENT ====================
  const handleRazorpayPayment = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsSubmitting(true);

    const idempotencyKey = generateIdempotencyKey();

    try {
      // 1. Create Razorpay order on server
      const orderRes = await api.post('/razorpay/create-order', {
        amount: totalAmount,
        type: 'MARKETPLACE',
        referenceId: restaurantId,
        notes: { vendorId, restaurantId },
      }, {
        headers: { 'X-Idempotency-Key': idempotencyKey },
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
          amount: amount,
          currency: currency,
          name: 'KNI Official Store',
          description: `Order - ${items.length} items`,
          order_id: orderId,
          prefill: prefill || {},
          theme: { color: '#EF3A3A' },
        });
      } catch (checkoutError) {
        // User cancelled or Razorpay SDK error — no money charged
        const dismissed = checkoutError.code === 0 || checkoutError.code === 2 || checkoutError.code === 'PAYMENT_CANCELLED';
        if (dismissed) {
          AppAlert.alert('Payment Cancelled', 'You cancelled the payment. You can try again whenever you\'re ready.', [{ text: 'OK' }]);
        } else {
          AppAlert.alert(
            'Payment Failed',
            checkoutError.description || checkoutError.message || 'Payment was not completed. Please try again.',
            [{ text: 'Retry', onPress: handleRazorpayPayment }, { text: 'Cancel', style: 'cancel' }]
          );
        }
        return;
      }

      // 3. Verify payment with retry (money IS charged at this point)
      await verifyPaymentWithRetry(paymentData, idempotencyKey);

    } catch (error) {
      console.error('Payment flow error:', error);
      AppAlert.alert('Error', 'Something went wrong. Please check your orders or contact support.');
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  // ==================== RAZORPAY SUCCESS VIEW ====================
  if (razorpaySuccess) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <View style={st.header}>
          <TouchableOpacity style={st.headerBackBtn} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Payment Successful</Text>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView contentContainerStyle={st.statusContainer}>
          <View style={[st.statusIconCircle, { backgroundColor: C.successLight }]}>
            <Icon name="checkmark-circle" size={scale(48)} color={C.success} />
          </View>
          <Text style={st.statusTitle}>Payment Verified!</Text>
          <Text style={st.statusSubtitle}>
            Your payment of {formatPrice(totalAmount)} via Razorpay has been verified.
            {'\n'}Order has been placed successfully with {isAdminStore ? 'KNI Official Store' : vendorName}.
          </Text>
          <TouchableOpacity
            style={st.viewOrdersBtn}
            onPress={() => navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [{ name: 'Home' }, { name: 'MarketplaceOrders' }],
              })
            )}
          >
            <LinearGradient
              colors={[C.gradient1, C.gradient2]}
              style={st.viewOrdersGradient}
            >
              <Icon name="receipt-outline" size={scale(20)} color="#fff" />
              <Text style={st.viewOrdersBtnText}>View My Orders</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.goBackBtn}
            onPress={() => navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: 'Home' }],
              })
            )}
          >
            <Text style={st.goBackBtnText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== MANUAL PAYMENT SUCCESS VIEW ====================
  if (manualPaymentSuccess) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <ScrollView contentContainerStyle={st.statusContainer}>
          <View style={[st.statusIconCircle, { backgroundColor: C.warningLight }]}>
            <Icon name="time" size={scale(48)} color={C.warning} />
          </View>
          <Text style={st.statusTitle}>Payment Submitted!</Text>
          <Text style={st.statusSubtitle}>
            Your payment screenshot has been sent to {vendorName}.{'\n'}They will verify it shortly and your order will be created.
          </Text>
          <TouchableOpacity
            style={st.viewOrdersBtn}
            onPress={() => navigation.dispatch(
              CommonActions.reset({ index: 1, routes: [{ name: 'Home' }, { name: 'MarketplaceOrders' }] })
            )}
          >
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.viewOrdersGradient}>
              <Icon name="receipt-outline" size={scale(20)} color="#fff" />
              <Text style={st.viewOrdersBtnText}>View My Orders</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity
            style={st.goBackBtn}
            onPress={() => navigation.dispatch(CommonActions.reset({ index: 0, routes: [{ name: 'Home' }] }))}
          >
            <Text style={st.goBackBtnText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== MAIN PAYMENT VIEW ====================
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.heroHeader}>
        <TouchableOpacity style={st.heroBackBtn} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}>
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={st.heroTextContainer}>
          <Text style={st.heroTitle}>Pay & Order</Text>
          <Text style={st.heroSubtitle}>
            {isAdminStore ? 'KNI Official Store' : vendorName}
          </Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={st.scrollView}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Order Summary */}
        <View style={st.section}>
          <View style={st.sectionHeader}>
            <Icon name="cart" size={scale(20)} color={C.primary} />
            <Text style={st.sectionTitle}>Order Summary</Text>
          </View>
          <View style={st.summaryCard}>
            {items.map((item, index) => {
              const name = item.product?.name || item.name;
              const price = item.product?.price || item.price;
              return (
                <View key={index} style={st.summaryItem}>
                  <View style={st.summaryItemInfo}>
                    <Text style={st.summaryItemName} numberOfLines={1}>{name}</Text>
                    <Text style={st.summaryItemQty}>x{item.quantity}</Text>
                  </View>
                  <Text style={st.summaryItemPrice}>{formatPrice(price * item.quantity)}</Text>
                </View>
              );
            })}
            <View style={st.summaryTotal}>
              <Text style={st.summaryTotalLabel}>Total Amount</Text>
              <Text style={st.summaryTotalPrice}>{formatPrice(totalAmount)}</Text>
            </View>
          </View>
        </View>

        {isAdminStore ? (
          /* ==================== RAZORPAY PAYMENT (KNI Store) ==================== */
          <View style={st.section}>
            <View style={st.paymentInfoCard}>
              <View style={{ alignItems: 'center', paddingVertical: scale(16) }}>
                <View style={[st.statusIconCircle, { backgroundColor: C.infoLight, width: scale(70), height: scale(70), borderRadius: scale(35), marginBottom: scale(12) }]}>
                  <Icon name="shield-checkmark" size={scale(32)} color={C.info} />
                </View>
                <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(6) }}>
                  Secure Payment via Razorpay
                </Text>
                <Text style={{ fontSize: moderateScale(13), color: C.muted, textAlign: 'center', lineHeight: moderateScale(18) }}>
                  Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.{'\n'}Your order will be confirmed instantly.
                </Text>
              </View>
              <View style={st.amountHighlight}>
                <Text style={st.amountLabel}>Amount to Pay</Text>
                <Text style={st.amountValue}>{formatPrice(totalAmount)}</Text>
              </View>
            </View>
          </View>
        ) : (
          /* ==================== MANUAL PAYMENT (Other Vendors) ==================== */
          <View style={st.section}>
            {/* Vendor Payment Info (QR + UPI) */}
            <View style={st.paymentInfoCard}>
              {loadingPaymentInfo ? (
                <View style={{ alignItems: 'center', padding: scale(20) }}>
                  <ActivityIndicator size="small" color={C.muted} />
                  <Text style={{ color: C.muted, marginTop: scale(8), fontSize: moderateScale(13) }}>Loading payment details...</Text>
                </View>
              ) : vendorPaymentInfo ? (
                <View style={{ gap: scale(12) }}>
                  {vendorPaymentInfo.paymentQrCodeUrl && (
                    <View style={{ alignItems: 'center' }}>
                      <Text style={{ fontSize: moderateScale(13), color: C.muted, marginBottom: scale(8) }}>Scan QR Code to Pay</Text>
                      <Image
                        source={{ uri: vendorPaymentInfo.paymentQrCodeUrl }}
                        style={{ width: scale(180), height: scale(180), borderRadius: scale(12), borderWidth: 1, borderColor: C.border }}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  {vendorPaymentInfo.paymentUpiId && (
                    <View style={{ backgroundColor: C.bg, borderRadius: scale(10), padding: scale(12) }}>
                      <Text style={{ fontSize: moderateScale(11), color: C.muted, marginBottom: scale(4) }}>UPI ID</Text>
                      <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: C.ink }}>{vendorPaymentInfo.paymentUpiId}</Text>
                    </View>
                  )}
                  {vendorPaymentInfo.paymentAccountName && (
                    <View>
                      <Text style={{ fontSize: moderateScale(11), color: C.muted }}>Account Name</Text>
                      <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: C.ink }}>{vendorPaymentInfo.paymentAccountName}</Text>
                    </View>
                  )}
                  <View style={st.amountHighlight}>
                    <Text style={st.amountLabel}>Amount to Pay</Text>
                    <Text style={st.amountValue}>{formatPrice(totalAmount)}</Text>
                  </View>
                </View>
              ) : (
                <View style={{ alignItems: 'center', padding: scale(20) }}>
                  <Icon name="warning" size={scale(32)} color={C.warning} />
                  <Text style={{ color: C.muted, marginTop: scale(8), textAlign: 'center', fontSize: moderateScale(13) }}>
                    Vendor has not set up payment details yet. Please contact them directly.
                  </Text>
                </View>
              )}
            </View>

            {/* Screenshot Upload */}
            <View style={[st.paymentInfoCard, { marginTop: scale(16) }]}>
              <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginBottom: scale(12) }}>
                Upload Payment Screenshot
              </Text>
              {screenshotUri ? (
                <View>
                  <Image source={{ uri: screenshotUri }} style={{ width: '100%', height: scale(200), borderRadius: scale(12) }} resizeMode="contain" />
                  <TouchableOpacity
                    style={{ alignSelf: 'center', marginTop: scale(8), padding: scale(8) }}
                    onPress={() => setScreenshotUri(null)}
                  >
                    <Text style={{ color: C.danger, fontSize: moderateScale(13), fontWeight: '600' }}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={{ borderWidth: 2, borderStyle: 'dashed', borderColor: C.border, borderRadius: scale(12), padding: scale(24), alignItems: 'center' }}
                  onPress={handlePickScreenshot}
                >
                  <Icon name="cloud-upload-outline" size={scale(32)} color={C.muted} />
                  <Text style={{ color: C.muted, marginTop: scale(8), fontSize: moderateScale(13) }}>Tap to upload screenshot</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={st.footer}>
        <TouchableOpacity
          style={[st.submitBtn, isSubmitting && st.submitBtnDisabled]}
          onPress={isAdminStore ? handleRazorpayPayment : handleManualPayment}
          disabled={isSubmitting || (!isAdminStore && !screenshotUri)}
        >
          <LinearGradient
            colors={isSubmitting || (!isAdminStore && !screenshotUri) ? ['#ccc', '#bbb'] : [C.gradient1, C.gradient2]}
            style={st.submitGradient}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="card" size={scale(20)} color="#fff" />
                <Text style={st.submitText}>
                  {isAdminStore ? `Pay ${formatPrice(totalAmount)} with Razorpay` : 'Submit Payment'}
                </Text>
              </>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
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
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerBackBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },

  // Hero Header
  heroHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(20),
    borderBottomLeftRadius: scale(20),
    borderBottomRightRadius: scale(20),
  },
  heroBackBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  heroTextContainer: {},
  heroTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },

  // Scroll
  scrollView: { flex: 1 },
  scrollContent: { padding: scale(16) },

  // Section
  section: { marginBottom: scale(20) },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryItemInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  summaryItemName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    flex: 1,
  },
  summaryItemQty: {
    fontSize: moderateScale(13),
    color: C.muted,
    fontWeight: '600',
  },
  summaryItemPrice: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginLeft: scale(12),
  },
  summaryTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(12),
    marginTop: scale(4),
  },
  summaryTotalLabel: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  summaryTotalPrice: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.primary,
  },

  // Payment Info
  paymentInfoCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  amountHighlight: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.primaryLight,
    borderRadius: scale(12),
    padding: scale(16),
    marginTop: scale(8),
  },
  amountLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.primaryDark,
  },
  amountValue: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.primaryDark,
  },

  // Footer
  footer: {
    padding: scale(16),
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  submitBtn: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(8),
  },
  submitText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#fff',
  },

  // Status Screen
  statusContainer: {
    flex: 1,
    alignItems: 'center',
    padding: scale(32),
    paddingTop: scale(60),
  },
  statusIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
  },
  statusTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: scale(12),
  },
  statusSubtitle: {
    fontSize: moderateScale(15),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: scale(24),
  },
  statusInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    backgroundColor: C.infoLight,
    borderRadius: scale(12),
    padding: scale(16),
    width: '100%',
  },
  statusInfoText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: C.info,
    lineHeight: moderateScale(18),
  },
  viewOrdersBtn: {
    borderRadius: scale(14),
    overflow: 'hidden',
    width: '100%',
  },
  viewOrdersGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(8),
  },
  viewOrdersBtnText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#fff',
  },
  goBackBtn: {
    marginTop: scale(16),
    paddingVertical: scale(12),
  },
  goBackBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
  },

});
