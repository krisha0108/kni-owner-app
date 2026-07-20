import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import RazorpayCheckout from 'react-native-razorpay';
import { api } from '../api/client';
import { scale, moderateScale } from '../utils/responsive';
import AppAlert from '../utils/AppAlert';

const C = {
  primary: '#7C3AED',
  ink: '#1D2254',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

const ADVANCE_PERCENT = 30;

/**
 * ConfirmQuoteModal — owner confirms a negotiated/unlocked quote and pays
 * the 30% advance via Razorpay. The order + advance payment are created
 * server-side on successful verification. Remaining 70% is requested later,
 * once the order is delivered.
 *
 * Props:
 *   visible         - boolean
 *   priceUnlockId   - string (PriceUnlockRequest.id)
 *   unlockedPrice   - number (per-unit price)
 *   maxQty          - number (stock available)
 *   onClose         - () => void
 *   onConfirmed     - () => void   (called after successful advance payment)
 */
export default function ConfirmQuoteModal({ visible, priceUnlockId, unlockedPrice, maxQty, onClose, onConfirmed }) {
  const [quantity, setQuantity] = useState(1);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const inProgress = useRef(false);

  const cap = Math.max(1, maxQty || 1);
  const qty = Math.max(1, Math.min(quantity, cap));
  const totalAmount = unlockedPrice * qty;
  const advanceAmount = Math.round((totalAmount * ADVANCE_PERCENT) / 100);

  const handleConfirm = async () => {
    if (inProgress.current) return;
    if (!deliveryAddress.trim()) {
      AppAlert.alert('Error', 'Please enter a delivery address');
      return;
    }
    inProgress.current = true;
    setIsProcessing(true);

    try {
      const orderRes = await api.post('/razorpay/create-order', {
        type: 'MARKETPLACE_INSTALLMENT',
        installmentType: 'ADVANCE',
        referenceId: priceUnlockId,
        quantity: qty,
      });
      if (!orderRes.data.ok) {
        AppAlert.alert('Error', orderRes.data.error || 'Failed to start payment');
        return;
      }

      const { orderId, amount, currency, keyId, prefill } = orderRes.data.data;

      let paymentData;
      try {
        paymentData = await RazorpayCheckout.open({
          key: keyId,
          amount,
          currency,
          name: 'KNI Official Store',
          description: 'Advance payment (negotiated price)',
          order_id: orderId,
          prefill: prefill || {},
          theme: { color: C.primary },
        });
      } catch (checkoutError) {
        const dismissed = checkoutError.code === 0 || checkoutError.code === 2 || checkoutError.code === 'PAYMENT_CANCELLED';
        if (dismissed) {
          AppAlert.alert('Payment Cancelled', "You cancelled the payment. You can try again whenever you're ready.");
        } else {
          AppAlert.alert('Payment Failed', checkoutError.description || checkoutError.message || 'Payment was not completed.');
        }
        return;
      }

      const RETRY_DELAYS = [2000, 4000, 8000];
      for (let attempt = 0; attempt <= 3; attempt++) {
        try {
          const verifyRes = await api.post('/razorpay/verify', {
            type: 'MARKETPLACE_INSTALLMENT',
            installmentType: 'ADVANCE',
            razorpay_order_id: paymentData.razorpay_order_id,
            razorpay_payment_id: paymentData.razorpay_payment_id,
            razorpay_signature: paymentData.razorpay_signature,
            priceUnlockRequestId: priceUnlockId,
            quantity: qty,
            deliveryAddress: deliveryAddress.trim(),
          });

          if (verifyRes.data.ok) {
            AppAlert.alert('Advance Paid!', 'Order confirmed. Remaining amount is due on delivery.', [
              { text: 'OK', onPress: () => onConfirmed?.() },
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
            `Your advance of ₹${advanceAmount.toLocaleString('en-IN')} was charged but verification could not be completed. It will be processed automatically. Contact support if not reflected within 15 minutes.`,
            [{ text: 'OK', onPress: () => onConfirmed?.() }]
          );
        }
      }
    } catch (error) {
      AppAlert.alert('Error', 'Something went wrong. Please try again or contact support.');
    } finally {
      inProgress.current = false;
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={st.overlay}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />

        <View style={st.sheet}>
          <View style={st.handleBar} />

          <View style={st.header}>
            <Text style={st.title}>Confirm Quote</Text>
            <TouchableOpacity onPress={onClose} style={st.closeBtn}>
              <Icon name="close" size={scale(22)} color={C.ink} />
            </TouchableOpacity>
          </View>

          <View style={st.body}>
            <View style={st.qtyRow}>
              <Text style={st.label}>Quantity</Text>
              <View style={st.qtyControl}>
                <TouchableOpacity
                  style={st.qtyBtn}
                  onPress={() => setQuantity(q => Math.max(1, q - 1))}
                  disabled={isProcessing}
                >
                  <Icon name="remove" size={scale(18)} color={C.primary} />
                </TouchableOpacity>
                <Text style={st.qtyText}>{qty}</Text>
                <TouchableOpacity
                  style={st.qtyBtn}
                  onPress={() => setQuantity(q => Math.min(cap, q + 1))}
                  disabled={isProcessing || qty >= cap}
                >
                  <Icon name="add" size={scale(18)} color={C.primary} />
                </TouchableOpacity>
              </View>
            </View>

            <View style={st.addressBlock}>
              <Text style={st.label}>Delivery Address</Text>
              <TextInput
                style={st.addressInput}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                placeholder="Enter complete delivery address"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={2}
                editable={!isProcessing}
              />
            </View>

            <View style={st.summaryRow}>
              <Text style={st.summaryLabel}>Total ({qty} x ₹{unlockedPrice})</Text>
              <Text style={st.summaryValue}>₹{totalAmount.toLocaleString('en-IN')}</Text>
            </View>
            <View style={st.summaryRow}>
              <Text style={st.summaryLabel}>Pay now ({ADVANCE_PERCENT}% advance)</Text>
              <Text style={st.summaryValueBold}>₹{advanceAmount.toLocaleString('en-IN')}</Text>
            </View>
            <Text style={st.note}>
              Remaining ₹{(totalAmount - advanceAmount).toLocaleString('en-IN')} due on delivery.
            </Text>

            <TouchableOpacity
              style={[st.confirmBtn, (isProcessing || !deliveryAddress.trim()) && st.confirmBtnDisabled]}
              onPress={handleConfirm}
              disabled={isProcessing || !deliveryAddress.trim()}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={st.confirmText}>Confirm & Pay ₹{advanceAmount.toLocaleString('en-IN')}</Text>
              )}
            </TouchableOpacity>
            <Text style={st.hint}>
              This is a special negotiated price — pay the advance above to confirm your order directly.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    paddingBottom: scale(30),
  },
  handleBar: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: scale(10),
    marginBottom: scale(8),
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  closeBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { paddingHorizontal: scale(20), paddingTop: scale(16) },
  label: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(16),
  },
  qtyControl: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: C.bg,
    borderRadius: scale(10),
    paddingHorizontal: scale(8),
    paddingVertical: scale(6),
  },
  qtyBtn: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(15),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, minWidth: scale(20), textAlign: 'center' },
  addressBlock: { marginBottom: scale(16) },
  addressInput: {
    marginTop: scale(6),
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    fontSize: moderateScale(13),
    color: C.ink,
    textAlignVertical: 'top',
    minHeight: scale(56),
  },
  hint: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(10), textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(6),
  },
  summaryLabel: { fontSize: moderateScale(13), color: C.muted },
  summaryValue: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  summaryValueBold: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  note: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4), marginBottom: scale(20) },
  confirmBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnDisabled: { opacity: 0.6 },
  confirmText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },
});
