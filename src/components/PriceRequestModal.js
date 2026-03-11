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
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { scale, moderateScale } from '../utils/responsive';

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
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setQuantity('');
    setMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!product || !restaurantId) return;

    try {
      setSubmitting(true);
      const res = await api.post('/owner/marketplace/price-requests', {
        restaurantId,
        vendorProductId: product.id,
        quantity: quantity ? parseInt(quantity, 10) : undefined,
        message: message.trim() || undefined,
      });

      if (res.data.ok) {
        Alert.alert('Request Sent', "Your price request has been submitted. You'll be notified when the admin responds.");
        setQuantity('');
        setMessage('');
        onClose();
        onSuccess?.();
      } else {
        Alert.alert('Error', res.data.error || 'Failed to submit price request');
      }
    } catch {
      Alert.alert('Error', 'Failed to submit price request');
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
              <Text style={st.title}>Request Price</Text>
              <Text style={st.subtitle} numberOfLines={2}>
                Request a custom price quote for "{product.name}"
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={st.closeBtn}>
              <Icon name="close" size={scale(22)} color={C.ink} />
            </TouchableOpacity>
          </View>

          {/* Form */}
          <View style={st.form}>
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
                  <Text style={st.submitText}>Submit Request</Text>
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
