import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { scale, moderateScale } from '../utils/responsive';
import AppAlert from '../utils/AppAlert';

const formatPrice = (amount) => `₹${(amount || 0).toLocaleString('en-IN')}`;

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

/**
 * PriceRequestModal — same flow as owner web PriceRequestDialog
 *
 * Props:
 *   visible       - boolean
 *   product       - { id, name } (vendorProduct)
 *   restaurantId  - string
 *   onClose       - () => void
 *   onSuccess     - () => void   (called after successful submit)
 */
export default function PriceRequestModal({ visible, product, restaurantId, onClose, onSuccess }) {
  const [quantity, setQuantity] = useState('');
  const [message, setMessage] = useState('');
  const [proposedPrice, setProposedPrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // The list price is already visible for regular products - let the owner
  // propose their own price directly instead of sending a blank "request"
  // for a price they can already see.
  const priceIsKnown = !!product && !product.priceOnRequest;

  const resetAndClose = () => {
    setQuantity('');
    setMessage('');
    setProposedPrice('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!product || !restaurantId) return;
    if (priceIsKnown && !proposedPrice) {
      AppAlert.alert('Error', "Enter the price you'd like to offer");
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.post('/owner/marketplace/price-requests', {
        restaurantId,
        vendorProductId: product.id,
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        message: message.trim() || undefined,
        proposedPrice: priceIsKnown ? parseInt(proposedPrice, 10) : undefined,
      });

      if (res.data.ok) {
        AppAlert.alert(
          priceIsKnown ? 'Offer Sent' : 'Request Sent',
          priceIsKnown
            ? "Your offer has been sent. You'll be notified when the admin responds."
            : "Your price request has been submitted. You'll be notified when the admin responds."
        );
        setQuantity('');
        setMessage('');
        setProposedPrice('');
        onClose();
        onSuccess?.();
      } else {
        AppAlert.alert('Error', res.data.error || 'Failed to submit price request');
      }
    } catch {
      AppAlert.alert('Error', 'Failed to submit price request');
    } finally {
      setSubmitting(false);
    }
  };

  if (!product) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={st.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={resetAndClose} />

        <View style={st.sheet}>
          {/* Handle bar */}
          <View style={st.handleBar} />

          {/* Header */}
          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{priceIsKnown ? 'Negotiate Price' : 'Request Price'}</Text>
              <Text style={st.subtitle} numberOfLines={2}>
                {priceIsKnown
                  ? `List price for "${product.name}" is ${formatPrice(product.price)}. Offer your price below.`
                  : `Request a custom price quote for "${product.name}"`}
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={st.closeBtn}>
              <Icon name="close" size={scale(22)} color={C.ink} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={st.form}>
            {priceIsKnown && (
              <View style={st.field}>
                <Text style={st.label}>Your Offer Price *</Text>
                <TextInput
                  style={st.input}
                  value={proposedPrice}
                  onChangeText={setProposedPrice}
                  placeholder={`e.g. ${Math.round((product.price || 0) * 0.9)}`}
                  placeholderTextColor={C.muted}
                  keyboardType="number-pad"
                />
              </View>
            )}
            <View style={st.field}>
              <Text style={st.label}>Quantity (optional)</Text>
              <TextInput
                style={st.input}
                value={quantity}
                onChangeText={setQuantity}
                placeholder="How many do you need?"
                placeholderTextColor={C.muted}
                keyboardType="number-pad"
              />
            </View>

            <View style={st.field}>
              <Text style={st.label}>Message (optional)</Text>
              <TextInput
                style={[st.input, st.textarea]}
                value={message}
                onChangeText={setMessage}
                placeholder="Any special requirements or notes..."
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={st.charCount}>{message.length}/500</Text>
            </View>
          </View>

          {/* Buttons */}
          <View style={st.footer}>
            <TouchableOpacity style={st.cancelBtn} onPress={resetAndClose}>
              <Text style={st.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.submitBtn, submitting && st.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name="pricetag-outline" size={scale(16)} color="#fff" />
                  <Text style={st.submitText}>{priceIsKnown ? 'Send Offer' : 'Submit Request'}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const st = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
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
    alignItems: 'flex-start',
    paddingHorizontal: scale(20),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  title: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  subtitle: {
    fontSize: moderateScale(13),
    color: C.muted,
    marginTop: scale(2),
  },
  closeBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(12),
  },

  form: {
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    gap: scale(16),
  },
  field: {},
  label: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
    marginBottom: scale(6),
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    fontSize: moderateScale(14),
    color: C.ink,
    backgroundColor: C.bg,
  },
  textarea: {
    minHeight: scale(80),
  },
  charCount: {
    fontSize: moderateScale(11),
    color: C.muted,
    textAlign: 'right',
    marginTop: scale(4),
  },

  footer: {
    flexDirection: 'row',
    paddingHorizontal: scale(20),
    paddingTop: scale(20),
    gap: scale(12),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
  },
  submitBtn: {
    flex: 1.5,
    flexDirection: 'row',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#fff',
  },
});
