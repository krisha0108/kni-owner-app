/**
 * ============================================================================
 * ADD / EDIT EXPENSE SCREEN
 * ============================================================================
 * Was a full-screen Modal inside ExpensesScreen.js — moved to a real
 * navigable screen for the same reason as CreateSupportTicketScreen.js
 * (proper back navigation, consistent with the rest of the app's
 * create/edit flows).
 */

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Image, StatusBar, Platform, KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import RNFS from 'react-native-fs';
import { api } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';

const C = {
  primary: '#EF3A3A',
  gradient1: '#F59E0B',
  gradient2: '#D97706',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
};

const CATEGORIES = [
  { value: 'RENT', label: 'Rent', icon: 'home', color: '#EF4444', bg: '#FEE2E2' },
  { value: 'UTILITIES', label: 'Utilities', icon: 'flash', color: '#3B82F6', bg: '#DBEAFE' },
  { value: 'FOOD', label: 'Groceries', icon: 'cart', color: '#10B981', bg: '#D1FAE5' },
  { value: 'SALARIES', label: 'Staff Salary', icon: 'people', color: '#8B5CF6', bg: '#EDE9FE' },
  { value: 'SUPPLIES', label: 'Equipment', icon: 'cube', color: '#06B6D4', bg: '#CFFAFE' },
  { value: 'MAINTENANCE', label: 'Maintenance', icon: 'construct', color: '#F59E0B', bg: '#FEF3C7' },
  { value: 'MARKETING', label: 'Marketing', icon: 'megaphone', color: '#EC4899', bg: '#FCE7F3' },
  { value: 'TRANSPORT', label: 'Transport', icon: 'car', color: '#6366F1', bg: '#E0E7FF' },
  { value: 'OTHER', label: 'Other', icon: 'ellipsis-horizontal', color: '#6B7280', bg: '#F3F4F6' },
];

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function AddExpenseScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { restaurantId, expense } = route.params || {};
  const isEdit = !!expense;

  const [form, setForm] = useState(() => expense ? {
    id: expense.id, category: expense.category || '',
    amount: expense.amount?.toString() || '',
    description: expense.description || '',
    expenseDate: expense.expenseDate?.split('T')[0] || new Date().toISOString().split('T')[0],
    restaurantId: expense.restaurantId?.toString() || restaurantId?.toString() || '',
  } : {
    id: null, category: '', amount: '', description: '',
    expenseDate: new Date().toISOString().split('T')[0],
    restaurantId: restaurantId?.toString() || '',
  });
  const [receiptImage, setReceiptImage] = useState(expense?.receiptUrl ? { uri: expense.receiptUrl } : null);
  const [saving, setSaving] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Expenses'));

  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setForm(f => ({ ...f, expenseDate: dateStr }));
    }
  };

  const pickReceipt = () => {
    launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: scale(1024), maxHeight: scale(1024) }, (response) => {
      if (response.assets && response.assets[0]) setReceiptImage(response.assets[0]);
    });
  };

  const convertReceiptToBase64 = async () => {
    if (!receiptImage || !receiptImage.uri || receiptImage.uri.startsWith('http')) {
      return expense?.receiptUrl || null;
    }
    try {
      const fileUri = receiptImage.uri;
      const filePath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
      const base64Data = await RNFS.readFile(filePath, 'base64');
      return `data:image/jpeg;base64,${base64Data}`;
    } catch (error) {
      console.log('Error converting receipt to base64:', error);
      return null;
    }
  };

  const saveExpense = async () => {
    if (!form.category || !form.amount) {
      AppAlert.alert('Error', 'Please fill in category and amount');
      return;
    }
    setSaving(true);
    try {
      const receiptData = await convertReceiptToBase64();
      const expenseDateISO = new Date(form.expenseDate).toISOString();
      const payload = {
        category: form.category,
        amount: parseFloat(form.amount),
        description: form.description || '',
        expenseDate: expenseDateISO,
        restaurantId: form.restaurantId,
      };
      if (receiptData) payload.receiptUrl = receiptData;

      if (form.id) {
        await api.put(`/owner/expenses/${form.id}`, payload);
        AppAlert.alert('Success', 'Expense updated successfully');
      } else {
        await api.post('/owner/expenses', payload);
        AppAlert.alert('Success', 'Expense added successfully');
      }
      invalidate(`Expenses-${form.restaurantId}`);
      goBack();
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={goBack} style={st.backBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>{isEdit ? 'Edit Expense' : 'Add Expense'}</Text>
          <View style={{ width: scale(32) }} />
        </LinearGradient>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: scale(20), paddingBottom: scale(30) }} showsVerticalScrollIndicator={true} keyboardShouldPersistTaps="handled">
          {/* Category Selection */}
          <Text style={st.label}>Category *</Text>
          <View style={st.categoryGrid}>
            {CATEGORIES.map(cat => {
              const isActive = form.category === cat.value;
              return (
                <TouchableOpacity
                  key={cat.value}
                  style={[st.categoryChip, isActive && { backgroundColor: cat.color, borderColor: cat.color }]}
                  onPress={() => setForm(f => ({ ...f, category: cat.value }))}
                >
                  <Icon name={cat.icon} size={scale(18)} color={isActive ? '#fff' : cat.color} />
                  <Text style={[st.categoryChipText, isActive && { color: '#fff' }]}>{cat.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Amount */}
          <Text style={st.label}>Amount (₹) *</Text>
          <View style={st.inputRow}>
            <View style={st.currencyBox}>
              <Text style={st.currencyText}>₹</Text>
            </View>
            <TextInput
              style={st.amountInput}
              placeholder="Enter amount"
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              value={form.amount}
              onChangeText={v => setForm(f => ({ ...f, amount: v }))}
            />
          </View>

          {/* Date */}
          <Text style={st.label}>Date</Text>
          <TouchableOpacity style={st.dateBtn} onPress={() => setShowDatePicker(true)}>
            <Icon name="calendar" size={scale(20)} color={C.warning} />
            <Text style={st.dateBtnText}>{form.expenseDate ? formatDate(form.expenseDate) : 'Select date'}</Text>
            <Icon name="chevron-down" size={scale(18)} color={C.muted} />
          </TouchableOpacity>
          {showDatePicker && (
            <DateTimePicker
              value={form.expenseDate ? new Date(form.expenseDate) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={onDateChange}
              maximumDate={new Date()}
            />
          )}

          {/* Description */}
          <Text style={st.label}>Description</Text>
          <TextInput
            style={st.textArea}
            placeholder="Add notes about this expense"
            placeholderTextColor={C.muted}
            multiline
            numberOfLines={3}
            value={form.description}
            onChangeText={v => setForm(f => ({ ...f, description: v }))}
          />

          {/* Receipt */}
          <Text style={st.label}>Receipt (Optional)</Text>
          {receiptImage ? (
            <View style={st.receiptPreview}>
              <Image source={{ uri: receiptImage.uri }} style={st.receiptImage} resizeMode="cover" />
              <TouchableOpacity style={st.receiptRemove} onPress={() => setReceiptImage(null)}>
                <Icon name="close" size={scale(16)} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={st.receiptChange} onPress={pickReceipt}>
                <Icon name="camera" size={scale(14)} color={C.warning} />
                <Text style={st.receiptChangeText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={st.receiptUpload} onPress={pickReceipt}>
              <View style={st.receiptUploadIcon}>
                <Icon name="cloud-upload" size={scale(28)} color={C.muted} />
              </View>
              <Text style={st.receiptUploadText}>Tap to upload receipt</Text>
              <Text style={st.receiptUploadHint}>PNG, JPG up to 5MB</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        <View style={st.footer}>
          <TouchableOpacity style={st.cancelBtn} onPress={goBack}>
            <Text style={st.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.85} onPress={saveExpense} disabled={saving} style={{ flex: 1 }}>
            <LinearGradient colors={saving ? ['#FCD34D', '#FCD34D'] : [C.gradient1, C.gradient2]} style={st.saveBtn}>
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Icon name={isEdit ? 'checkmark' : 'add'} size={scale(18)} color="#fff" />
                  <Text style={st.saveBtnText}>{isEdit ? 'Update' : 'Add'}</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(16),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: '#fff' },

  label: { fontSize: moderateScale(13), fontWeight: '700', color: C.text, marginBottom: scale(10), marginTop: scale(16) },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  categoryChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(14), paddingVertical: scale(10), borderRadius: scale(12), backgroundColor: C.bg, borderWidth: 1.5, borderColor: C.border },
  categoryChipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg, overflow: 'hidden' },
  currencyBox: { width: scale(48), height: scale(48), backgroundColor: C.warningLight, alignItems: 'center', justifyContent: 'center' },
  currencyText: { fontSize: moderateScale(18), fontWeight: '700', color: C.warning },
  amountInput: { flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(16), fontWeight: '600', color: C.ink },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(10), paddingHorizontal: scale(14), paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, backgroundColor: C.bg },
  dateBtnText: { flex: 1, fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  textArea: { backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(12), fontSize: moderateScale(14), color: C.text, borderWidth: 1.5, borderColor: C.border, minHeight: scale(80), textAlignVertical: 'top' },

  receiptUpload: { alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, borderStyle: 'dashed', borderRadius: scale(14), paddingVertical: scale(28), backgroundColor: C.bg },
  receiptUploadIcon: { width: scale(56), height: scale(56), borderRadius: scale(28), backgroundColor: C.card, alignItems: 'center', justifyContent: 'center', marginBottom: scale(10), shadowColor: '#64748B', shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.1, shadowRadius: scale(4), elevation: 2 },
  receiptUploadText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  receiptUploadHint: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },
  receiptPreview: { position: 'relative', borderRadius: scale(14), overflow: 'hidden' },
  receiptImage: { width: '100%', height: scale(160), borderRadius: scale(14) },
  receiptRemove: { position: 'absolute', top: scale(10), right: scale(10), width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  receiptChange: { position: 'absolute', bottom: scale(10), right: scale(10), flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(20), backgroundColor: '#fff' },
  receiptChangeText: { fontSize: moderateScale(12), fontWeight: '600', color: C.warning },

  footer: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), paddingVertical: scale(14), borderRadius: scale(12) },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },
});
