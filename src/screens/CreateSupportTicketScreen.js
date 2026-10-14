/**
 * ============================================================================
 * CREATE SUPPORT TICKET SCREEN
 * ============================================================================
 * Was a full-screen Modal inside SupportCenter.js — moved to a real navigable
 * screen for the same reason as SupportTicketDetailScreen.js (proper back
 * navigation, consistent with the rest of the app's create/edit flows).
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, TextInput, Image, Modal, Dimensions, StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, uploadFile } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  danger: '#EF4444',
};

const CATEGORY_CONFIG = {
  General:   { icon: 'help-circle', gradient: ['#6366F1', '#4F46E5'], lightBg: '#E0E7FF', color: '#4F46E5' },
  Equipment: { icon: 'hardware-chip', gradient: ['#F97316', '#EA580C'], lightBg: '#FFEDD5', color: '#EA580C' },
  Billing:   { icon: 'card', gradient: ['#10B981', '#059669'], lightBg: '#D1FAE5', color: '#059669' },
  Service:   { icon: 'construct', gradient: ['#3B82F6', '#1D4ED8'], lightBg: '#DBEAFE', color: '#2563EB' },
  Account:   { icon: 'person', gradient: ['#8B5CF6', '#6D28D9'], lightBg: '#EDE9FE', color: '#7C3AED' },
  Other:     { icon: 'ellipsis-horizontal', gradient: ['#94A3B8', '#64748B'], lightBg: '#E2E8F0', color: '#64748B' },
};

const CATEGORY_OPTIONS = ['General', 'Equipment', 'Billing', 'Service', 'Account', 'Other'];

export default function CreateSupportTicketScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { keyboardCompensation: keyboardHeight } = useKeyboardCompensation();
  const { restaurantId } = route.params || {};
  const [formData, setFormData] = useState({ title: '', equipmentName: '', category: 'General', description: '' });
  const [ticketImageUri, setTicketImageUri] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const scrollRef = useRef(null);
  const scrollToInput = (event) => {
    scrollRef.current?.scrollResponderScrollNativeHandleToKeyboard(event.target, scale(80), true);
  };

  const goBack = () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('SupportCenter'));

  const pickTicketImage = async () => {
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (r?.assets?.[0]?.uri) setTicketImageUri(r.assets[0].uri);
    } catch (e) { console.error('Image pick error:', e); }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.description) { AppAlert.alert('Error', 'Please fill in title and description'); return; }
    setIsCreating(true);
    try {
      // The ticket endpoint only accepts a JSON body with a photoUrl string,
      // not a raw file - upload the picked image first (same pattern as
      // MyEquipmentScreen.js), then send its URL along with the ticket.
      let photoUrl;
      if (ticketImageUri) {
        const uploadForm = new FormData();
        uploadForm.append('file', { uri: ticketImageUri, type: 'image/jpeg', name: `ticket_${Date.now()}.jpg` });
        uploadForm.append('folder', 'support-tickets');
        const { data } = await uploadFile(uploadForm);
        if (data.ok && data.url) photoUrl = data.url;
      }
      await api.post('/owner/support', {
        restaurantId,
        title: formData.title,
        equipmentName: formData.equipmentName || undefined,
        category: formData.category,
        description: formData.description,
        photoUrl,
      });
      AppAlert.alert('Success', 'Support ticket created successfully');
      invalidate(`SupportCenter-${restaurantId}`);
      goBack();
    } catch (e) {
      console.error('Create ticket error:', e);
      AppAlert.alert('Error', e?.response?.data?.error || 'Failed to create ticket');
    } finally { setIsCreating(false); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={goBack} style={st.backBtn}>
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>New Ticket</Text>
        <View style={{ width: scale(38) }} />
      </LinearGradient>

      <ScrollView ref={scrollRef} style={{ flex: 1 }} contentContainerStyle={{ padding: scale(20), paddingBottom: scale(100) + keyboardHeight }} keyboardShouldPersistTaps="handled">
        <Text style={st.inputLabel}>Title *</Text>
        <TextInput
          style={st.input}
          placeholder="Brief description of your issue"
          placeholderTextColor={C.muted}
          value={formData.title}
          onChangeText={(t) => setFormData({ ...formData, title: t })}
        />

        <Text style={st.inputLabel}>Category</Text>
        <TouchableOpacity style={st.pickerInput} onPress={() => setCategoryPickerVisible(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
            <LinearGradient colors={CATEGORY_CONFIG[formData.category]?.gradient || ['#94A3B8', '#64748B']} style={st.pickerCatIcon}>
              <Icon name={CATEGORY_CONFIG[formData.category]?.icon || 'help-circle'} size={scale(14)} color="#fff" />
            </LinearGradient>
            <Text style={st.pickerInputText}>{formData.category}</Text>
          </View>
          <Icon name="chevron-down" size={scale(18)} color={C.muted} />
        </TouchableOpacity>

        <Text style={st.inputLabel}>Equipment Name (Optional)</Text>
        <TextInput
          style={st.input}
          placeholder="If related to specific equipment"
          placeholderTextColor={C.muted}
          value={formData.equipmentName}
          onChangeText={(t) => setFormData({ ...formData, equipmentName: t })}
        />

        <Text style={st.inputLabel}>Description *</Text>
        <TextInput
          style={[st.input, st.textArea]}
          placeholder="Describe your issue in detail..."
          placeholderTextColor={C.muted}
          value={formData.description}
          onChangeText={(t) => setFormData({ ...formData, description: t })}
          multiline
          numberOfLines={4}
        />

        <Text style={st.inputLabel}>Attachment (Optional)</Text>
        {ticketImageUri ? (
          <View style={st.imgPreviewWrap}>
            <Image source={{ uri: ticketImageUri }} style={st.imgPreview} />
            <TouchableOpacity style={st.removeImgBtn} onPress={() => setTicketImageUri('')}>
              <Icon name="close" size={scale(14)} color="#fff" />
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={st.uploadBtn} onPress={pickTicketImage}>
            <Icon name="cloud-upload-outline" size={scale(22)} color={C.primary} />
            <Text style={st.uploadBtnText}>Upload Image</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <View style={st.createFooter}>
        <TouchableOpacity style={st.cancelBtn} onPress={goBack}>
          <Text style={st.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.85} onPress={handleCreate} disabled={isCreating} style={{ flex: 1 }}>
          <LinearGradient colors={isCreating ? ['#FCA5A5', '#FCA5A5'] : [C.primary, C.primaryDark]} style={st.submitBtn}>
            {isCreating ? <ActivityIndicator size="small" color="#fff" /> : (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <Icon name="send" size={scale(16)} color="#fff" />
                <Text style={st.submitBtnText}>Create Ticket</Text>
              </View>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Category Picker — small in-context sheet, stays a modal */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerSheet}>
            <View style={st.modalDragBar} />
            <View style={st.modalHeaderRow}>
              <View>
                <Text style={st.modalTitle}>Select Category</Text>
                <Text style={st.modalSubtitle}>Choose a category for your ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)} style={st.modalCloseBtn}>
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerBody} contentContainerStyle={{ paddingBottom: scale(30) }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = cat === formData.category;
                const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[st.pickerOption, isSelected && st.pickerOptionSelected]}
                    onPress={() => { setFormData({ ...formData, category: cat }); setCategoryPickerVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                      <LinearGradient
                        colors={isSelected ? cfg.gradient : [cfg.lightBg, cfg.lightBg]}
                        style={st.pickerOptionIcon}
                      >
                        <Icon name={cfg.icon} size={scale(16)} color={isSelected ? '#fff' : cfg.color} />
                      </LinearGradient>
                      <Text style={[st.pickerOptionText, isSelected && { color: cfg.color, fontWeight: '800' }]}>{cat}</Text>
                    </View>
                    {isSelected && (
                      <View style={[st.selectedCheck, { backgroundColor: cfg.color }]}>
                        <Icon name="checkmark" size={scale(14)} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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

  createFooter: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: C.card,
  },
  inputLabel: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginBottom: scale(8), marginTop: scale(16) },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(13),
    fontSize: moderateScale(14),
    color: C.text,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  textArea: { minHeight: scale(100), textAlignVertical: 'top' },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(13),
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  pickerCatIcon: { width: scale(28), height: scale(28), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center' },
  pickerInputText: { fontSize: moderateScale(14), color: C.text, fontWeight: '500' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(16),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderStyle: 'dashed',
    backgroundColor: '#FEF2F2',
  },
  uploadBtnText: { fontSize: moderateScale(14), fontWeight: '600', color: C.primary },
  imgPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  imgPreview: { width: scale(100), height: scale(100), borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7' },
  removeImgBtn: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: { flex: 1, paddingVertical: scale(14), backgroundColor: '#F1F5F9', borderRadius: scale(12), alignItems: 'center' },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink },
  submitBtn: { paddingVertical: scale(14), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: moderateScale(15), fontWeight: '800', color: '#fff' },

  // Category Picker sheet
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  pickerSheet: { backgroundColor: C.card, borderTopLeftRadius: scale(28), borderTopRightRadius: scale(28), maxHeight: SCREEN_HEIGHT * 0.7 },
  modalDragBar: { width: scale(40), height: scale(4), borderRadius: scale(2), backgroundColor: '#D1D5DB', alignSelf: 'center', marginTop: scale(12) },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  modalSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: { padding: scale(16) },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    marginBottom: scale(10),
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#FAFBFC',
  },
  pickerOptionSelected: { borderColor: C.primary, backgroundColor: '#FFF5F5' },
  pickerOptionIcon: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  pickerOptionText: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  selectedCheck: { width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
});
