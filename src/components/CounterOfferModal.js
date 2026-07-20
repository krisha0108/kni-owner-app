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

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
};

/**
 * CounterOfferModal — owner counters admin's price with their own proposed
 * price. Generic across any "negotiate a price" flow (marketplace price
 * requests, AMC proposals) - the caller supplies which endpoint to PATCH.
 *
 * Props:
 *   visible         - boolean
 *   endpoint        - string, full API path to PATCH, e.g.
 *                      `/owner/marketplace/price-requests/${id}/counter` or
 *                      `/owner/amc-proposals/${id}/counter`
 *   currentPrice    - number (admin's price, shown for reference)
 *   onClose         - () => void
 *   onSuccess       - () => void
 */
export default function CounterOfferModal({ visible, endpoint, currentPrice, onClose, onSuccess }) {
  const [counterPrice, setCounterPrice] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const resetAndClose = () => {
    setCounterPrice('');
    setMessage('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!endpoint) return;
    const value = Number(counterPrice);
    if (!value || value <= 0) {
      AppAlert.alert('Error', 'Enter a valid counter price');
      return;
    }

    try {
      setSubmitting(true);
      const res = await api.patch(endpoint, {
        counterPrice: value,
        message: message.trim() || undefined,
      });

      if (res.data.ok) {
        AppAlert.alert('Counter-offer Sent', 'Admin will review your proposed price.');
        setCounterPrice('');
        setMessage('');
        onClose();
        onSuccess?.();
      } else {
        AppAlert.alert('Error', res.data.error || 'Failed to send counter-offer');
      }
    } catch (err) {
      AppAlert.alert('Error', err?.response?.data?.error || 'Failed to send counter-offer');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={resetAndClose}>
      <KeyboardAvoidingView
        style={st.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={resetAndClose} />

        <View style={st.sheet}>
          <View style={st.handleBar} />

          <View style={st.header}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>Negotiate Price</Text>
              <Text style={st.subtitle}>
                {currentPrice ? `Admin's price: ₹${currentPrice}` : 'Propose your price to admin'}
              </Text>
            </View>
            <TouchableOpacity onPress={resetAndClose} style={st.closeBtn}>
              <Icon name="close" size={scale(22)} color={C.ink} />
            </TouchableOpacity>
          </View>

          <View style={st.form}>
            <View style={st.field}>
              <Text style={st.label}>Your Proposed Price (₹) *</Text>
              <TextInput
                style={st.input}
                value={counterPrice}
                onChangeText={setCounterPrice}
                placeholder="e.g. 1000"
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
                placeholder="Why this price? (e.g. found it cheaper elsewhere)"
                placeholderTextColor={C.muted}
                multiline
                numberOfLines={3}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={st.charCount}>{message.length}/500</Text>
            </View>
          </View>

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
                  <Text style={st.submitText}>Send Offer</Text>
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
