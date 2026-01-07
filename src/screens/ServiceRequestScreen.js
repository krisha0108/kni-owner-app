import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

const SERVICE_TYPES = [
  { id: 'repair', label: 'Repair', icon: 'hammer-outline', description: 'Fix broken or malfunctioning equipment' },
  { id: 'maintenance', label: 'Maintenance', icon: 'settings-outline', description: 'Regular service and checkup' },
  { id: 'installation', label: 'Installation', icon: 'construct-outline', description: 'Install new equipment' },
  { id: 'inspection', label: 'Inspection', icon: 'search-outline', description: 'Inspect and diagnose issues' },
  { id: 'cleaning', label: 'Cleaning', icon: 'water-outline', description: 'Deep cleaning service' },
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function ServiceRequestScreen({ navigation, route }) {
  const { equipmentId, equipmentName } = route.params || {};

  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [selectedServiceType, setSelectedServiceType] = useState(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [urgency, setUrgency] = useState('normal'); // normal, urgent

  // Date selection
  const [dateModal, setDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);

  // Restaurant selection
  const [restModal, setRestModal] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [loadingRestaurants, setLoadingRestaurants] = useState(false);
  const [restError, setRestError] = useState('');

  // Success modal
  const [successModal, setSuccessModal] = useState(false);

  // Date helpers
  const today = startOfDay(new Date());
  const next30 = Array.from({ length: 30 }).map((_, i) => startOfDay(addDays(today, i)));

  const paddedDates = (() => {
    const headPad = next30[0].getDay();
    const withHead = [...Array(headPad).fill(null), ...next30];
    const rem = withHead.length % 7;
    const tailPad = rem === 0 ? 0 : (7 - rem);
    return [...withHead, ...Array(tailPad).fill(null)];
  })();

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    setLoadingRestaurants(true);
    setRestError('');
    try {
      const a = await AsyncStorage.getItem('owner_id');
      const b = await AsyncStorage.getItem('restaurant_owner_id');
      const c = await AsyncStorage.getItem('ownerId');
      const ownerId = String(a || b || c || '').trim();

      if (!ownerId) {
        setRestError('Owner not found. Please log in again.');
        return;
      }

      const res = await api.get('/app/restaurantlist', { params: { restaurant_owner_id: ownerId } });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];

      const normalized = rows
        .filter(r => String(r.restaurant_owner_id || r?.owner?.id) === ownerId)
        .map((r, i) => ({
          id: String(r.id ?? i),
          name: r.hotel_name || 'Restaurant',
          address: r.address || '',
          approved: String(r.status || '').toLowerCase() === 'approved',
        }));

      setRestaurants(normalized);
      if (!normalized.length) setRestError('No restaurants found.');
    } catch (e) {
      setRestError(e?.response?.data?.message || e?.message || 'Failed to load restaurants');
    } finally {
      setLoadingRestaurants(false);
    }
  }, []);

  // Handle date confirmation
  const confirmDate = () => {
    if (!selectedDate) return;
    setDateModal(false);
    fetchRestaurants();
    setRestModal(true);
  };

  // Handle restaurant confirmation
  const confirmRestaurant = (restaurant) => {
    if (!restaurant.approved) {
      Alert.alert('Not Approved', 'This restaurant is not approved yet. Please select an approved restaurant.');
      return;
    }
    setSelectedRestaurant(restaurant);
    setRestModal(false);
  };

  // Submit service request
  const handleSubmit = async () => {
    // Validation
    if (!selectedServiceType) {
      Alert.alert('Required', 'Please select a service type.');
      return;
    }
    if (!problemDescription.trim()) {
      Alert.alert('Required', 'Please describe the problem.');
      return;
    }
    if (!selectedDate) {
      Alert.alert('Required', 'Please select a preferred date.');
      return;
    }
    if (!selectedRestaurant) {
      Alert.alert('Required', 'Please select a restaurant.');
      return;
    }

    setSubmitting(true);
    try {
      // Format date
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const serviceDate = `${year}-${month}-${day}`;

      const payload = {
        product_id: equipmentId || 1,
        product_name: equipmentName || 'Equipment Service',
        description: problemDescription,
        problem_description: problemDescription,
        service_type: selectedServiceType,
        urgency: urgency,
        tags: [`${SERVICE_TYPES.find(s => s.id === selectedServiceType)?.label || 'Service'} Request`],
        restaurant_id: Number(selectedRestaurant.id),
        restaurant_name: selectedRestaurant.name,
        location: selectedRestaurant.address || '',
        service_date: serviceDate,
        status: 'Pending',
        owner_equipment_id: equipmentId || null,
      };

      console.log('Submitting service request:', payload);

      const response = await api.post('/app/equipment-requests', payload);
      console.log('Service request response:', response.data);

      setSuccessModal(true);
    } catch (error) {
      console.error('Service request error:', error?.response?.data || error);
      Alert.alert(
        'Error',
        error?.response?.data?.message || 'Failed to submit service request. Please try again.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Can submit check
  const canSubmit = selectedServiceType && problemDescription.trim() && selectedDate && selectedRestaurant;

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Request Service</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={st.scrollContent}>
        {/* Equipment Info */}
        <View style={st.equipmentCard}>
          <View style={st.equipmentIcon}>
            <Icon name="hardware-chip-outline" size={28} color={C.primary} />
          </View>
          <View style={st.equipmentInfo}>
            <Text style={st.equipmentName}>{equipmentName || 'Equipment'}</Text>
            <Text style={st.equipmentId}>ID: {equipmentId || 'N/A'}</Text>
          </View>
        </View>

        {/* Service Type Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Select Service Type</Text>
          <View style={st.serviceTypesGrid}>
            {SERVICE_TYPES.map((type) => {
              const isSelected = selectedServiceType === type.id;
              return (
                <TouchableOpacity
                  key={type.id}
                  style={[st.serviceTypeCard, isSelected && st.serviceTypeCardActive]}
                  onPress={() => setSelectedServiceType(type.id)}
                >
                  <View style={[st.serviceTypeIcon, isSelected && st.serviceTypeIconActive]}>
                    <Icon name={type.icon} size={24} color={isSelected ? '#fff' : C.primary} />
                  </View>
                  <Text style={[st.serviceTypeLabel, isSelected && st.serviceTypeLabelActive]}>
                    {type.label}
                  </Text>
                  <Text style={st.serviceTypeDesc} numberOfLines={2}>{type.description}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Problem Description */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Describe the Problem</Text>
          <TextInput
            style={st.textArea}
            placeholder="E.g., Equipment not cooling, making strange noise, display not working..."
            placeholderTextColor="#9CA3AF"
            value={problemDescription}
            onChangeText={setProblemDescription}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        {/* Urgency Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Urgency Level</Text>
          <View style={st.urgencyRow}>
            <TouchableOpacity
              style={[st.urgencyBtn, urgency === 'normal' && st.urgencyBtnActive]}
              onPress={() => setUrgency('normal')}
            >
              <Icon name="time-outline" size={20} color={urgency === 'normal' ? '#fff' : C.ink} />
              <Text style={[st.urgencyText, urgency === 'normal' && st.urgencyTextActive]}>Normal</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.urgencyBtn, st.urgencyBtnUrgent, urgency === 'urgent' && st.urgencyBtnUrgentActive]}
              onPress={() => setUrgency('urgent')}
            >
              <Icon name="flash-outline" size={20} color={urgency === 'urgent' ? '#fff' : C.danger} />
              <Text style={[st.urgencyText, { color: urgency === 'urgent' ? '#fff' : C.danger }]}>Urgent</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Date & Restaurant Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Schedule</Text>

          {/* Date Selection */}
          <TouchableOpacity style={st.selectRow} onPress={() => setDateModal(true)}>
            <View style={st.selectIconBox}>
              <Icon name="calendar-outline" size={20} color={C.primary} />
            </View>
            <View style={st.selectInfo}>
              <Text style={st.selectLabel}>Preferred Date</Text>
              <Text style={st.selectValue}>
                {selectedDate ? selectedDate.toDateString() : 'Select a date'}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>

          {/* Restaurant Selection */}
          <TouchableOpacity
            style={st.selectRow}
            onPress={() => {
              if (!selectedDate) {
                Alert.alert('Select Date First', 'Please select a preferred date before choosing a restaurant.');
                return;
              }
              fetchRestaurants();
              setRestModal(true);
            }}
          >
            <View style={st.selectIconBox}>
              <Icon name="business-outline" size={20} color={C.primary} />
            </View>
            <View style={st.selectInfo}>
              <Text style={st.selectLabel}>Restaurant Location</Text>
              <Text style={st.selectValue}>
                {selectedRestaurant ? selectedRestaurant.name : 'Select restaurant'}
              </Text>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={st.footer}>
        <TouchableOpacity
          style={[st.submitBtn, !canSubmit && st.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Icon name="send-outline" size={20} color="#fff" />
              <Text style={st.submitBtnText}>Submit Request</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Date Modal */}
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={() => setDateModal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select a Date</Text>
              <TouchableOpacity onPress={() => setDateModal(false)} style={st.closeBtn}>
                <Icon name="close" size={20} color={C.ink} />
              </TouchableOpacity>
            </View>

            <View style={st.daysRow}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={st.dayLabel}>{d}</Text>
              ))}
            </View>

            <View style={st.dateGrid}>
              {paddedDates.map((d, i) => {
                if (!d) return <View key={`empty-${i}`} style={st.dateCell} />;
                const isSelected = selectedDate && startOfDay(selectedDate).getTime() === d.getTime();
                return (
                  <TouchableOpacity
                    key={d.toISOString()}
                    style={[st.dateCell, isSelected && st.dateCellActive]}
                    onPress={() => setSelectedDate(d)}
                  >
                    <Text style={[st.dateCellText, isSelected && st.dateCellTextActive]}>
                      {d.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[st.modalBtn, !selectedDate && st.modalBtnDisabled]}
              onPress={confirmDate}
              disabled={!selectedDate}
            >
              <Text style={st.modalBtnText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Restaurant Modal */}
      <Modal visible={restModal} transparent animationType="slide" onRequestClose={() => setRestModal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.modalSheet}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Restaurant</Text>
              <TouchableOpacity onPress={() => setRestModal(false)} style={st.closeBtn}>
                <Icon name="close" size={20} color={C.ink} />
              </TouchableOpacity>
            </View>

            {loadingRestaurants ? (
              <View style={st.loadingBox}>
                <ActivityIndicator size="large" color={C.primary} />
              </View>
            ) : restaurants.length === 0 ? (
              <View style={st.emptyBox}>
                <Icon name="business-outline" size={48} color={C.muted} />
                <Text style={st.emptyText}>{restError || 'No restaurants found'}</Text>
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 400 }}>
                {restaurants.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[
                      st.restaurantCard,
                      selectedRestaurant?.id === r.id && st.restaurantCardActive,
                      !r.approved && st.restaurantCardDisabled
                    ]}
                    onPress={() => confirmRestaurant(r)}
                  >
                    <Text style={st.restaurantName}>{r.name}</Text>
                    <Text style={st.restaurantAddress}>{r.address}</Text>
                    <View style={[st.approvalBadge, { backgroundColor: r.approved ? '#ECFDF5' : '#FEF2F2' }]}>
                      <Icon
                        name={r.approved ? 'checkmark-circle' : 'alert-circle'}
                        size={14}
                        color={r.approved ? C.ok : C.danger}
                      />
                      <Text style={[st.approvalText, { color: r.approved ? C.ok : C.danger }]}>
                        {r.approved ? 'Approved' : 'Not Approved'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={() => {}}>
        <View style={st.successBackdrop}>
          <View style={st.successCard}>
            <View style={st.successIconBox}>
              <Icon name="checkmark" size={40} color="#fff" />
            </View>
            <Text style={st.successTitle}>Request Submitted!</Text>
            <Text style={st.successMessage}>
              Your service request has been submitted successfully. We'll notify you when an engineer is assigned.
            </Text>
            <TouchableOpacity
              style={st.successBtn}
              onPress={() => {
                setSuccessModal(false);
                navigation.goBack();
              }}
            >
              <Text style={st.successBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },

  scrollContent: { padding: 16, paddingBottom: 100 },

  equipmentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border, marginBottom: 16
  },
  equipmentIcon: {
    width: 56, height: 56, borderRadius: 14, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center'
  },
  equipmentInfo: { marginLeft: 12, flex: 1 },
  equipmentName: { fontSize: 18, fontWeight: '900', color: C.ink },
  equipmentId: { fontSize: 13, color: C.muted, marginTop: 2 },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 12 },

  serviceTypesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  serviceTypeCard: {
    width: '48%', backgroundColor: C.card, borderRadius: 14, padding: 14,
    borderWidth: 1, borderColor: C.border
  },
  serviceTypeCardActive: { backgroundColor: '#FFF5F5', borderColor: C.primary },
  serviceTypeIcon: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', marginBottom: 8
  },
  serviceTypeIconActive: { backgroundColor: C.primary },
  serviceTypeLabel: { fontSize: 15, fontWeight: '800', color: C.ink },
  serviceTypeLabelActive: { color: C.primary },
  serviceTypeDesc: { fontSize: 11, color: C.muted, marginTop: 4 },

  textArea: {
    backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: C.border,
    padding: 14, fontSize: 15, color: C.text, minHeight: 100
  },

  urgencyRow: { flexDirection: 'row', gap: 12 },
  urgencyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: C.border, backgroundColor: C.card
  },
  urgencyBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  urgencyBtnUrgent: { borderColor: '#FECACA' },
  urgencyBtnUrgentActive: { backgroundColor: C.danger, borderColor: C.danger },
  urgencyText: { fontSize: 15, fontWeight: '700', color: C.ink },
  urgencyTextActive: { color: '#fff' },

  selectRow: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 14, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 10
  },
  selectIconBox: {
    width: 40, height: 40, borderRadius: 10, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center'
  },
  selectInfo: { flex: 1, marginLeft: 12 },
  selectLabel: { fontSize: 12, color: C.muted },
  selectValue: { fontSize: 15, fontWeight: '700', color: C.ink, marginTop: 2 },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border
  },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 16, borderRadius: 14
  },
  submitBtnDisabled: { backgroundColor: '#FECACA' },
  submitBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: 20, borderTopRightRadius: 20,
    padding: 20, maxHeight: '80%'
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 20, fontWeight: '900', color: C.ink },
  closeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },

  daysRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 8 },
  dayLabel: { width: 40, textAlign: 'center', fontWeight: '700', color: C.muted },

  dateGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around' },
  dateCell: {
    width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center',
    marginBottom: 8, backgroundColor: C.bg
  },
  dateCellActive: { backgroundColor: C.primary },
  dateCellText: { fontSize: 14, fontWeight: '700', color: C.ink },
  dateCellTextActive: { color: '#fff' },

  modalBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14, alignItems: 'center', marginTop: 16 },
  modalBtnDisabled: { backgroundColor: '#FECACA' },
  modalBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  loadingBox: { paddingVertical: 40, alignItems: 'center' },
  emptyBox: { paddingVertical: 40, alignItems: 'center' },
  emptyText: { fontSize: 14, color: C.muted, marginTop: 12 },

  restaurantCard: {
    backgroundColor: C.bg, borderRadius: 14, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: C.border
  },
  restaurantCardActive: { borderColor: C.primary, backgroundColor: '#FFF5F5' },
  restaurantCardDisabled: { opacity: 0.5 },
  restaurantName: { fontSize: 16, fontWeight: '800', color: C.ink },
  restaurantAddress: { fontSize: 13, color: C.muted, marginTop: 4 },
  approvalBadge: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, marginTop: 8
  },
  approvalText: { fontSize: 12, fontWeight: '700' },

  successBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  successCard: { backgroundColor: C.card, borderRadius: 20, padding: 24, alignItems: 'center', width: '100%', maxWidth: 340 },
  successIconBox: {
    width: 80, height: 80, borderRadius: 20, backgroundColor: C.ok,
    alignItems: 'center', justifyContent: 'center', marginBottom: 16
  },
  successTitle: { fontSize: 22, fontWeight: '900', color: C.ink, marginBottom: 8 },
  successMessage: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  successBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 40 },
  successBtnText: { fontSize: 16, fontWeight: '800', color: '#fff' },
});
