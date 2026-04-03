/**
 * ============================================================================
 * MARKETPLACE PAYMENT SCREEN
 * Owner pays vendor via QR/UPI, uploads screenshot, submits payment
 * After vendor verifies → order auto-created
 * ============================================================================
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { launchImageLibrary } from 'react-native-image-picker';
import RazorpayCheckout from 'react-native-razorpay';
import { api, getImageUrl } from '../api/client';
import uploadService from '../services/uploadService';
import cartService from '../services/marketplaceCartService';

import { scale, moderateScale } from '../utils/responsive';

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

  const [vendorPaymentInfo, setVendorPaymentInfo] = useState(null);
  const [loadingPaymentInfo, setLoadingPaymentInfo] = useState(true);
  const [screenshotUri, setScreenshotUri] = useState(null);
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentSubmitted, setPaymentSubmitted] = useState(false);
  const [paymentId, setPaymentId] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Razorpay states
  const [paymentMode, setPaymentMode] = useState('razorpay'); // 'razorpay' or 'manual'
  const [useRazorpay, setUseRazorpay] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayOrderIdResult, setRazorpayOrderIdResult] = useState(null);

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // Fetch vendor payment info (QR code + UPI)
  useEffect(() => {
    fetchVendorPaymentInfo();
  }, []);

  // Poll for payment status after submission
  useEffect(() => {
    let interval;
    if (paymentSubmitted && paymentId && paymentStatus === 'PENDING') {
      interval = setInterval(() => {
        checkPaymentStatus();
      }, 10000); // Check every 10 seconds
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [paymentSubmitted, paymentId, paymentStatus]);

  const fetchVendorPaymentInfo = async () => {
    try {
      setLoadingPaymentInfo(true);
      const response = await api.get(`/owner/marketplace/vendor-payment-info?vendorId=${vendorId}`);
      if (response.data.ok) {
        setVendorPaymentInfo(response.data.data);
        // Enable Razorpay for admin store (KNI Official Store)
        if (response.data.data.useRazorpay) {
          setUseRazorpay(true);
          setPaymentMode('razorpay');
        } else {
          setUseRazorpay(false);
          setPaymentMode('manual');
        }
      } else {
        Alert.alert('Error', response.data.error || 'Failed to load payment info');
      }
    } catch (error) {
      console.error('Fetch vendor payment info error:', error);
      Alert.alert('Error', 'Failed to load vendor payment details');
    } finally {
      setLoadingPaymentInfo(false);
    }
  };

  const checkPaymentStatus = async () => {
    try {
      const response = await api.get(`/owner/marketplace/payments?restaurantId=${restaurantId}`);
      if (response.data.ok) {
        const payment = response.data.data.find(p => p.id === paymentId);
        if (payment) {
          setPaymentStatus(payment.status);
          if (payment.status === 'REJECTED') {
            setRejectionReason(payment.rejectionReason || '');
          }
        }
      }
    } catch (error) {
      console.error('Check payment status error:', error);
    }
  };

  // ==================== RAZORPAY PAYMENT ====================
  const handleRazorpayPayment = async () => {
    setIsSubmitting(true);
    try {
      // 1. Create Razorpay order on server
      const orderRes = await api.post('/razorpay/create-order', {
        amount: totalAmount,
        type: 'MARKETPLACE',
        referenceId: restaurantId,
        notes: { vendorId, restaurantId },
      });

      if (!orderRes.data.ok) {
        Alert.alert('Error', orderRes.data.error || 'Failed to create payment order');
        setIsSubmitting(false);
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderRes.data.data;

      // 2. Open Razorpay checkout
      const options = {
        key: keyId,
        amount: amount,
        currency: currency,
        name: 'KNI Official Store',
        description: `Order - ${items.length} items`,
        order_id: orderId,
        prefill: prefill || {},
        theme: { color: '#EF3A3A' },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // 3. Verify payment on server
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
      });

      if (verifyRes.data.ok) {
        // Clear cart
        try {
          await cartService.clearCart(restaurantId, { vendorId });
        } catch (e) {
          console.warn('Failed to clear cart:', e);
        }
        setRazorpaySuccess(true);
        setRazorpayOrderIdResult(verifyRes.data.data.orderId);
      } else {
        Alert.alert('Verification Failed', verifyRes.data.error || 'Payment verification failed');
      }
    } catch (error) {
      // Razorpay checkout was dismissed or failed
      if (error.code !== 'PAYMENT_CANCELLED') {
        console.error('Razorpay payment error:', error);
        Alert.alert(
          'Payment Failed',
          error.description || error.message || 'Payment was not completed. Please try again.'
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1200,
        maxHeight: 1200,
      });

      if (result.didCancel) return;
      if (result.errorCode) {
        Alert.alert('Error', result.errorMessage || 'Failed to pick image');
        return;
      }

      const asset = result.assets?.[0];
      if (!asset?.uri) return;

      setScreenshotUri(asset.uri);
      setScreenshotUrl(''); // Reset uploaded URL

      // Upload immediately - pass actual type & name from picker (same pattern as equipment upload)
      setIsUploading(true);
      try {
        const url = await uploadService.uploadPaymentProof(
          asset.uri,
          asset.type || 'image/jpeg',
          asset.fileName || `payment-proof-${Date.now()}.jpg`
        );
        setScreenshotUrl(url);
      } catch (uploadError) {
        Alert.alert('Upload Failed', 'Failed to upload screenshot. Please try again.');
        setScreenshotUri(null);
      } finally {
        setIsUploading(false);
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to open image picker');
    }
  };

  const handleSubmitPayment = async () => {
    if (!screenshotUrl) {
      Alert.alert('Error', 'Please upload a payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        restaurantId,
        vendorId,
        items: items.map(item => ({
          productId: item.product?.id || item.id || item.productId,
          qty: item.quantity,
        })),
        screenshotUrl,
        deliveryAddress: deliveryAddress || undefined,
        notes: deliveryNotes || undefined,
      };

      const response = await api.post('/owner/marketplace/payments', payload);
      if (response.data.ok) {
        // Clear this vendor's items from cart after payment submitted
        try {
          await cartService.clearCart(restaurantId, { vendorId });
        } catch (e) {
          console.warn('Failed to clear cart after payment:', e);
        }
        setPaymentSubmitted(true);
        setPaymentId(response.data.data.id);
        setPaymentStatus('PENDING');
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit payment');
      }
    } catch (error) {
      console.error('Submit payment error:', error);
      Alert.alert(
        'Error',
        error.response?.data?.error || 'Failed to submit payment. Please try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResubmit = () => {
    // Reset for re-upload
    setPaymentSubmitted(false);
    setPaymentId(null);
    setPaymentStatus(null);
    setRejectionReason('');
    setScreenshotUri(null);
    setScreenshotUrl('');
  };

  // ==================== RAZORPAY SUCCESS VIEW ====================
  if (razorpaySuccess) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity style={st.headerBackBtn} onPress={() => navigation.goBack()}>
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
            onPress={() => navigation.navigate('MarketplaceOrders')}
          >
            <LinearGradient
              colors={[C.gradient1, C.gradient2]}
              style={st.viewOrdersGradient}
            >
              <Icon name="receipt-outline" size={scale(20)} color="#fff" />
              <Text style={st.viewOrdersBtnText}>View My Orders</Text>
            </LinearGradient>
          </TouchableOpacity>
          <TouchableOpacity style={st.goBackBtn} onPress={() => navigation.goBack()}>
            <Text style={st.goBackBtnText}>Back to Marketplace</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ==================== PAYMENT SUBMITTED VIEW ====================
  if (paymentSubmitted) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor={C.card} />
        <View style={st.header}>
          <TouchableOpacity style={st.headerBackBtn} onPress={() => navigation.goBack()}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Payment Status</Text>
          <View style={{ width: scale(40) }} />
        </View>

        <ScrollView contentContainerStyle={st.statusContainer}>
          {paymentStatus === 'PENDING' && (
            <>
              <View style={[st.statusIconCircle, { backgroundColor: C.warningLight }]}>
                <Icon name="time-outline" size={scale(48)} color={C.warning} />
              </View>
              <Text style={st.statusTitle}>Payment Pending Verification</Text>
              <Text style={st.statusSubtitle}>
                Your payment screenshot has been sent to {isAdminStore ? 'KNI Official Store' : vendorName}.
                They will verify it shortly.
              </Text>
              <View style={st.statusInfoBox}>
                <Icon name="information-circle" size={scale(20)} color={C.info} />
                <Text style={st.statusInfoText}>
                  Once verified, your order will be automatically created. You'll receive a notification.
                </Text>
              </View>
              <ActivityIndicator size="small" color={C.warning} style={{ marginTop: scale(16) }} />
              <Text style={st.pollingText}>Checking status...</Text>
            </>
          )}

          {paymentStatus === 'VERIFIED' && (
            <>
              <View style={[st.statusIconCircle, { backgroundColor: C.successLight }]}>
                <Icon name="checkmark-circle" size={scale(48)} color={C.success} />
              </View>
              <Text style={st.statusTitle}>Payment Verified!</Text>
              <Text style={st.statusSubtitle}>
                Your order has been placed successfully. The vendor will process it soon.
              </Text>
              <TouchableOpacity
                style={st.viewOrdersBtn}
                onPress={() => navigation.navigate('MarketplaceOrders')}
              >
                <LinearGradient
                  colors={[C.gradient1, C.gradient2]}
                  style={st.viewOrdersGradient}
                >
                  <Icon name="receipt-outline" size={scale(20)} color="#fff" />
                  <Text style={st.viewOrdersBtnText}>View My Orders</Text>
                </LinearGradient>
              </TouchableOpacity>
            </>
          )}

          {paymentStatus === 'REJECTED' && (
            <>
              <View style={[st.statusIconCircle, { backgroundColor: '#FEE2E2' }]}>
                <Icon name="close-circle" size={scale(48)} color={C.danger} />
              </View>
              <Text style={st.statusTitle}>Payment Rejected</Text>
              <Text style={st.statusSubtitle}>
                {isAdminStore ? 'KNI Official Store' : vendorName} has rejected your payment.
              </Text>
              {rejectionReason ? (
                <View style={st.rejectionBox}>
                  <Text style={st.rejectionLabel}>Reason:</Text>
                  <Text style={st.rejectionText}>{rejectionReason}</Text>
                </View>
              ) : null}
              <TouchableOpacity style={st.resubmitBtn} onPress={handleResubmit}>
                <Icon name="refresh" size={scale(20)} color="#fff" />
                <Text style={st.resubmitBtnText}>Re-upload Screenshot</Text>
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            style={st.goBackBtn}
            onPress={() => navigation.goBack()}
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
        <TouchableOpacity style={st.heroBackBtn} onPress={() => navigation.goBack()}>
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

        {/* Payment Method Selector (only for admin store with Razorpay) */}
        {useRazorpay && (
          <View style={st.section}>
            <View style={st.sectionHeader}>
              <Icon name="card" size={scale(20)} color={C.primary} />
              <Text style={st.sectionTitle}>Choose Payment Method</Text>
            </View>

            {/* Razorpay Option */}
            <TouchableOpacity
              style={[st.methodCard, paymentMode === 'razorpay' && st.methodCardActive]}
              onPress={() => setPaymentMode('razorpay')}
            >
              <View style={[st.methodIcon, paymentMode === 'razorpay' && st.methodIconActive]}>
                <Icon name="card" size={scale(22)} color={paymentMode === 'razorpay' ? '#fff' : C.muted} />
              </View>
              <View style={st.methodInfo}>
                <Text style={[st.methodTitle, paymentMode === 'razorpay' && st.methodTitleActive]}>Pay with Razorpay</Text>
                <Text style={st.methodSubtitle}>UPI, Card, NetBanking, Wallets</Text>
              </View>
              {paymentMode === 'razorpay' && (
                <View style={st.recommendedBadge}>
                  <Text style={st.recommendedText}>Recommended</Text>
                </View>
              )}
            </TouchableOpacity>

            {/* Manual Option */}
            <TouchableOpacity
              style={[st.methodCard, paymentMode === 'manual' && st.methodCardActive, { marginTop: scale(10) }]}
              onPress={() => setPaymentMode('manual')}
            >
              <View style={[st.methodIcon, paymentMode === 'manual' && st.methodIconActive]}>
                <Icon name="phone-portrait" size={scale(22)} color={paymentMode === 'manual' ? '#fff' : C.muted} />
              </View>
              <View style={st.methodInfo}>
                <Text style={[st.methodTitle, paymentMode === 'manual' && st.methodTitleActive]}>Pay Manually (UPI/QR)</Text>
                <Text style={st.methodSubtitle}>Scan QR & upload screenshot</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* RAZORPAY PAYMENT SECTION */}
        {paymentMode === 'razorpay' && useRazorpay && (
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
        )}

        {/* MANUAL PAYMENT SECTION - QR + UPI + Screenshot */}
        {paymentMode === 'manual' && (
          <>
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="qr-code" size={scale(20)} color={C.primary} />
                <Text style={st.sectionTitle}>Payment Details</Text>
              </View>

              {loadingPaymentInfo ? (
                <View style={st.loadingBox}>
                  <ActivityIndicator size="small" color={C.primary} />
                  <Text style={st.loadingText}>Loading payment details...</Text>
                </View>
              ) : !vendorPaymentInfo ? (
                <View style={st.noPaymentInfo}>
                  <Icon name="alert-circle-outline" size={scale(32)} color={C.warning} />
                  <Text style={st.noPaymentInfoText}>
                    Vendor has not set up payment details yet. Please contact them directly.
                  </Text>
                </View>
              ) : (
                <View style={st.paymentInfoCard}>
                  {vendorPaymentInfo.paymentQrCodeUrl && (
                    <View style={st.qrSection}>
                      <Text style={st.qrLabel}>Scan QR Code to Pay</Text>
                      <Image
                        source={{ uri: getImageUrl(vendorPaymentInfo.paymentQrCodeUrl) }}
                        style={st.qrImage}
                        resizeMode="contain"
                      />
                    </View>
                  )}
                  {vendorPaymentInfo.paymentUpiId && (
                    <View style={st.upiSection}>
                      <Text style={st.upiLabel}>UPI ID</Text>
                      <View style={st.upiRow}>
                        <Text style={st.upiId}>{vendorPaymentInfo.paymentUpiId}</Text>
                      </View>
                    </View>
                  )}
                  {vendorPaymentInfo.paymentAccountName && (
                    <View style={st.accountSection}>
                      <Text style={st.accountLabel}>Account Name</Text>
                      <Text style={st.accountName}>{vendorPaymentInfo.paymentAccountName}</Text>
                    </View>
                  )}
                  <View style={st.amountHighlight}>
                    <Text style={st.amountLabel}>Amount to Pay</Text>
                    <Text style={st.amountValue}>{formatPrice(totalAmount)}</Text>
                  </View>
                </View>
              )}
            </View>

            {/* Screenshot Upload */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="camera" size={scale(20)} color={C.primary} />
                <Text style={st.sectionTitle}>Upload Payment Screenshot</Text>
              </View>

              <TouchableOpacity style={st.uploadArea} onPress={handlePickImage} disabled={isUploading}>
                {screenshotUri ? (
                  <View style={st.uploadedContainer}>
                    <Image source={{ uri: screenshotUri }} style={st.uploadedImage} resizeMode="cover" />
                    {isUploading && (
                      <View style={st.uploadingOverlay}>
                        <ActivityIndicator size="large" color="#fff" />
                        <Text style={st.uploadingText}>Uploading...</Text>
                      </View>
                    )}
                    {screenshotUrl && !isUploading && (
                      <View style={st.uploadedBadge}>
                        <Icon name="checkmark-circle" size={scale(20)} color={C.success} />
                        <Text style={st.uploadedBadgeText}>Uploaded</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={st.uploadPlaceholder}>
                    <View style={st.uploadIconCircle}>
                      <Icon name="cloud-upload-outline" size={scale(32)} color={C.primary} />
                    </View>
                    <Text style={st.uploadTitle}>Tap to upload screenshot</Text>
                    <Text style={st.uploadSubtitle}>
                      Take a screenshot of your payment confirmation
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              {screenshotUri && (
                <TouchableOpacity style={st.changeImageBtn} onPress={handlePickImage}>
                  <Icon name="camera-outline" size={scale(16)} color={C.primary} />
                  <Text style={st.changeImageText}>Change Screenshot</Text>
                </TouchableOpacity>
              )}
            </View>
          </>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={st.footer}>
        {paymentMode === 'razorpay' && useRazorpay ? (
          <TouchableOpacity
            style={[st.submitBtn, isSubmitting && st.submitBtnDisabled]}
            onPress={handleRazorpayPayment}
            disabled={isSubmitting}
          >
            <LinearGradient
              colors={isSubmitting ? ['#ccc', '#bbb'] : [C.gradient1, C.gradient2]}
              style={st.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="card" size={scale(20)} color="#fff" />
                  <Text style={st.submitText}>Pay {formatPrice(totalAmount)} with Razorpay</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              st.submitBtn,
              (!screenshotUrl || isSubmitting || isUploading) && st.submitBtnDisabled,
            ]}
            onPress={handleSubmitPayment}
            disabled={!screenshotUrl || isSubmitting || isUploading}
          >
            <LinearGradient
              colors={(!screenshotUrl || isSubmitting || isUploading) ? ['#ccc', '#bbb'] : [C.gradient1, C.gradient2]}
              style={st.submitGradient}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="send" size={scale(20)} color="#fff" />
                  <Text style={st.submitText}>Submit Payment</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}
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
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(20),
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  noPaymentInfo: {
    alignItems: 'center',
    backgroundColor: C.warningLight,
    borderRadius: scale(16),
    padding: scale(24),
    gap: scale(12),
  },
  noPaymentInfoText: {
    fontSize: moderateScale(14),
    color: C.text,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },
  paymentInfoCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  qrSection: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  qrLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(12),
  },
  qrImage: {
    width: scale(200),
    height: scale(200),
    borderRadius: scale(12),
    backgroundColor: C.bg,
  },
  upiSection: {
    marginBottom: scale(16),
    paddingTop: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  upiLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(6),
  },
  upiRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
  },
  upiId: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    flex: 1,
  },
  accountSection: {
    marginBottom: scale(16),
  },
  accountLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(4),
  },
  accountName: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: C.ink,
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

  // Upload Area
  uploadArea: {
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: scale(16),
    overflow: 'hidden',
    backgroundColor: C.card,
  },
  uploadPlaceholder: {
    alignItems: 'center',
    padding: scale(32),
  },
  uploadIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  uploadTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(4),
  },
  uploadSubtitle: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
  },
  uploadedContainer: {
    position: 'relative',
  },
  uploadedImage: {
    width: '100%',
    height: scale(250),
  },
  uploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    fontSize: moderateScale(14),
    color: '#fff',
    fontWeight: '600',
    marginTop: scale(8),
  },
  uploadedBadge: {
    position: 'absolute',
    bottom: scale(12),
    right: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: C.card,
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  uploadedBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.success,
  },
  changeImageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: scale(12),
    paddingVertical: scale(10),
  },
  changeImageText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.primary,
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
  pollingText: {
    fontSize: moderateScale(13),
    color: C.muted,
    marginTop: scale(8),
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
  rejectionBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: scale(12),
    padding: scale(16),
    width: '100%',
    marginBottom: scale(20),
  },
  rejectionLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.danger,
    marginBottom: scale(4),
  },
  rejectionText: {
    fontSize: moderateScale(14),
    color: C.text,
    lineHeight: moderateScale(20),
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: C.primary,
    borderRadius: scale(14),
    paddingVertical: scale(14),
    paddingHorizontal: scale(24),
    width: '100%',
  },
  resubmitBtnText: {
    fontSize: moderateScale(15),
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

  // Payment Method Selector
  methodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(16),
    borderWidth: 2,
    borderColor: C.border,
  },
  methodCardActive: {
    borderColor: C.primary,
    backgroundColor: C.primaryLight,
  },
  methodIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(22),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  methodIconActive: {
    backgroundColor: C.primary,
  },
  methodInfo: {
    flex: 1,
  },
  methodTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
  },
  methodTitleActive: {
    color: C.primaryDark,
  },
  methodSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
  recommendedBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
  },
  recommendedText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#fff',
  },
});
