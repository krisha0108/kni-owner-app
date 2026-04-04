/**
 * ============================================================================
 * MARKETPLACE PAYMENT SCREEN
 * Owner pays via Razorpay → order auto-created
 * ============================================================================
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { api } from '../api/client';
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

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [razorpaySuccess, setRazorpaySuccess] = useState(false);
  const [razorpayOrderIdResult, setRazorpayOrderIdResult] = useState(null);

  const totalAmount = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
      // Razorpay returns code 0 or 2 when user dismisses/cancels checkout
      const dismissed = error.code === 0 || error.code === 2 || error.code === 'PAYMENT_CANCELLED';
      if (dismissed) {
        Alert.alert(
          'Payment Cancelled',
          'You cancelled the payment. You can try again whenever you\'re ready.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Razorpay payment error:', error);
        Alert.alert(
          'Payment Failed',
          error.description || error.message || 'Payment was not completed. Please try again.',
          [{ text: 'Retry', onPress: handleRazorpayPayment }, { text: 'Cancel', style: 'cancel' }]
        );
      }
    } finally {
      setIsSubmitting(false);
    }
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

        {/* RAZORPAY PAYMENT SECTION */}
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

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Footer Button */}
      <View style={st.footer}>
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
