import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal,
  ActivityIndicator, Alert, TextInput
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';

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

const TIME_SLOTS = [
  '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
  '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM',
];

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

export default function SlotBookingScreen({ navigation, route }) {
  // Global restaurant context
  const {
    restaurants: allRestaurants,
    selectedRestaurant: globalSelectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(false);
  const [equipment, setEquipment] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [selectedEquipment, setSelectedEquipment] = useState(route?.params?.equipment || null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Restaurant, 2: Equipment, 3: Date/Time, 4: Confirm

  const today = startOfDay(new Date());
  const next14Days = Array.from({ length: 14 }).map((_, i) => startOfDay(addDays(today, i)));

  // Filter to approved restaurants only
  const restaurants = allRestaurants.filter(r => r.status === 'APPROVED');

  // Pre-select global restaurant on mount
  useEffect(() => {
    if (globalSelectedRestaurant && !selectedRestaurant) {
      const approved = restaurants.find(r => r.id === selectedRestaurantId);
      if (approved) {
        setSelectedRestaurant(approved);
      }
    }
  }, [globalSelectedRestaurant, selectedRestaurantId, restaurants]);

  // Auto-select if only one restaurant
  useEffect(() => {
    if (restaurants.length === 1 && !selectedRestaurant) {
      setSelectedRestaurant(restaurants[0]);
    }
  }, [restaurants]);

  const loadEquipment = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const { data } = await api.get(`/owner/equipment?restaurantId=${selectedRestaurant.id}`);
      if (data.ok && data.data?.items) {
        setEquipment(data.data.items);
      }
    } catch (error) {
      console.log('Error loading equipment:', error);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    if (selectedRestaurant) {
      loadEquipment();
    }
  }, [selectedRestaurant, loadEquipment]);

  const canProceed = () => {
    switch (step) {
      case 1: return !!selectedRestaurant;
      case 2: return true; // Equipment is optional
      case 3: return !!selectedDate && !!selectedTime;
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (step < 4) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant || !selectedDate || !selectedTime) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    setIsSubmitting(true);
    try {
      // Parse time slot to create datetime
      const [time, period] = selectedTime.split(' ');
      const [hours, minutes] = time.split(':');
      let hour = parseInt(hours);
      if (period === 'PM' && hour !== 12) hour += 12;
      if (period === 'AM' && hour === 12) hour = 0;

      const slotDateTime = new Date(selectedDate);
      slotDateTime.setHours(hour, parseInt(minutes), 0, 0);

      const payload = {
        restaurantId: selectedRestaurant.id,
        equipmentId: selectedEquipment?.id || null,
        slotStartDateTime: slotDateTime.toISOString(),
        problemDescription: problemDescription || null,
      };

      const response = await api.post('/owner/bookings', payload);

      if (response.data.ok) {
        // Clear all AsyncStorage cart data after successful booking
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const cartKeys = allKeys.filter(k =>
            k.startsWith('rdraft:') ||
            k.startsWith('rservices:') ||
            k.startsWith('rparts:') ||
            k.startsWith('pmeta:')
          );
          if (cartKeys.length > 0) {
            await AsyncStorage.multiRemove(cartKeys);
            console.log('[SlotBooking] Cleared cart data:', cartKeys.length, 'keys');
          }
        } catch (clearError) {
          console.log('[SlotBooking] Error clearing cart:', clearError);
        }

        Alert.alert(
          'Booking Created',
          'Your service slot has been booked successfully. You will receive a confirmation shortly.',
          [
            {
              text: 'View Bookings',
              onPress: () => navigation.navigate('MyBookings'),
            },
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        throw new Error(response.data.error || 'Failed to create booking');
      }
    } catch (error) {
      console.log('Booking error:', error);
      Alert.alert('Error', error.message || 'Failed to create booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date) => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}`;
  };

  const isToday = (date) => {
    const t = new Date();
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear();
  };

  const isTomorrow = (date) => {
    const t = addDays(new Date(), 1);
    return date.getDate() === t.getDate() &&
           date.getMonth() === t.getMonth() &&
           date.getFullYear() === t.getFullYear();
  };

  if (restaurantsLoading) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Book a Slot</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Book a Slot</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Progress Indicator */}
      <View style={st.progressRow}>
        {[1, 2, 3, 4].map((s) => (
          <View key={s} style={st.progressItem}>
            <View style={[st.progressDot, step >= s && st.progressDotActive]}>
              {step > s ? (
                <Icon name="checkmark" size={12} color="#fff" />
              ) : (
                <Text style={[st.progressNum, step >= s && st.progressNumActive]}>{s}</Text>
              )}
            </View>
            {s < 4 && <View style={[st.progressLine, step > s && st.progressLineActive]} />}
          </View>
        ))}
      </View>
      <View style={st.progressLabels}>
        <Text style={[st.progressLabel, step === 1 && st.progressLabelActive]}>Restaurant</Text>
        <Text style={[st.progressLabel, step === 2 && st.progressLabelActive]}>Equipment</Text>
        <Text style={[st.progressLabel, step === 3 && st.progressLabelActive]}>Date/Time</Text>
        <Text style={[st.progressLabel, step === 4 && st.progressLabelActive]}>Confirm</Text>
      </View>

      <ScrollView style={st.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Restaurant */}
        {step === 1 && (
          <View style={st.stepContainer}>
            <Text style={st.stepTitle}>Select Restaurant</Text>
            <Text style={st.stepSubtitle}>Choose which restaurant needs service</Text>

            {restaurants.length === 0 ? (
              <View style={st.emptyBox}>
                <Icon name="restaurant-outline" size={48} color={C.muted} />
                <Text style={st.emptyText}>No approved restaurants found</Text>
              </View>
            ) : (
              restaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[st.optionCard, selectedRestaurant?.id === r.id && st.optionCardActive]}
                  onPress={() => setSelectedRestaurant(r)}
                >
                  <View style={st.optionIcon}>
                    <Icon name="restaurant" size={24} color={selectedRestaurant?.id === r.id ? C.primary : C.muted} />
                  </View>
                  <View style={st.optionInfo}>
                    <Text style={st.optionTitle}>{r.name}</Text>
                    {r.address && <Text style={st.optionSubtitle}>{r.address}</Text>}
                  </View>
                  {selectedRestaurant?.id === r.id && (
                    <Icon name="checkmark-circle" size={24} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* Step 2: Select Equipment (Optional) */}
        {step === 2 && (
          <View style={st.stepContainer}>
            <Text style={st.stepTitle}>Select Equipment (Optional)</Text>
            <Text style={st.stepSubtitle}>Choose equipment that needs service, or skip for general service</Text>

            <TouchableOpacity
              style={[st.optionCard, !selectedEquipment && st.optionCardActive]}
              onPress={() => setSelectedEquipment(null)}
            >
              <View style={st.optionIcon}>
                <Icon name="construct" size={24} color={!selectedEquipment ? C.primary : C.muted} />
              </View>
              <View style={st.optionInfo}>
                <Text style={st.optionTitle}>General Service Request</Text>
                <Text style={st.optionSubtitle}>No specific equipment</Text>
              </View>
              {!selectedEquipment && (
                <Icon name="checkmark-circle" size={24} color={C.primary} />
              )}
            </TouchableOpacity>

            {equipment.map((e) => (
              <TouchableOpacity
                key={e.id}
                style={[st.optionCard, selectedEquipment?.id === e.id && st.optionCardActive]}
                onPress={() => setSelectedEquipment(e)}
              >
                <View style={st.optionIcon}>
                  <Icon name="hardware-chip" size={24} color={selectedEquipment?.id === e.id ? C.primary : C.muted} />
                </View>
                <View style={st.optionInfo}>
                  <Text style={st.optionTitle}>{e.name}</Text>
                  <Text style={st.optionSubtitle}>{e.category || 'Equipment'}</Text>
                </View>
                {selectedEquipment?.id === e.id && (
                  <Icon name="checkmark-circle" size={24} color={C.primary} />
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Step 3: Select Date & Time */}
        {step === 3 && (
          <View style={st.stepContainer}>
            <Text style={st.stepTitle}>Select Date & Time</Text>
            <Text style={st.stepSubtitle}>Choose your preferred service slot</Text>

            {/* Date Selection */}
            <Text style={st.sectionLabel}>Select Date</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.dateScroll}>
              {next14Days.map((date) => {
                const isSelected = selectedDate?.getTime() === date.getTime();
                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[st.dateCard, isSelected && st.dateCardActive]}
                    onPress={() => setSelectedDate(date)}
                  >
                    {isToday(date) && <Text style={[st.dateTag, isSelected && st.dateTagActive]}>Today</Text>}
                    {isTomorrow(date) && <Text style={[st.dateTag, isSelected && st.dateTagActive]}>Tomorrow</Text>}
                    <Text style={[st.dateDay, isSelected && st.dateDayActive]}>
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][date.getDay()]}
                    </Text>
                    <Text style={[st.dateNum, isSelected && st.dateNumActive]}>{date.getDate()}</Text>
                    <Text style={[st.dateMonth, isSelected && st.dateMonthActive]}>
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][date.getMonth()]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* Time Selection */}
            <Text style={st.sectionLabel}>Select Time Slot</Text>
            <View style={st.timeGrid}>
              {TIME_SLOTS.map((time) => {
                const isSelected = selectedTime === time;
                return (
                  <TouchableOpacity
                    key={time}
                    style={[st.timeChip, isSelected && st.timeChipActive]}
                    onPress={() => setSelectedTime(time)}
                  >
                    <Icon
                      name="time-outline"
                      size={16}
                      color={isSelected ? '#fff' : C.muted}
                    />
                    <Text style={[st.timeText, isSelected && st.timeTextActive]}>{time}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Problem Description */}
            <Text style={st.sectionLabel}>Problem Description (Optional)</Text>
            <TextInput
              style={st.textArea}
              placeholder="Describe the issue or service needed..."
              placeholderTextColor={C.muted}
              value={problemDescription}
              onChangeText={setProblemDescription}
              multiline
              numberOfLines={4}
            />
          </View>
        )}

        {/* Step 4: Confirmation */}
        {step === 4 && (
          <View style={st.stepContainer}>
            <Text style={st.stepTitle}>Confirm Booking</Text>
            <Text style={st.stepSubtitle}>Review your booking details</Text>

            <View style={st.summaryCard}>
              <View style={st.summaryRow}>
                <Icon name="restaurant" size={20} color={C.primary} />
                <View style={st.summaryInfo}>
                  <Text style={st.summaryLabel}>Restaurant</Text>
                  <Text style={st.summaryValue}>{selectedRestaurant?.name}</Text>
                </View>
              </View>

              <View style={st.summaryDivider} />

              <View style={st.summaryRow}>
                <Icon name="hardware-chip" size={20} color={C.primary} />
                <View style={st.summaryInfo}>
                  <Text style={st.summaryLabel}>Equipment</Text>
                  <Text style={st.summaryValue}>
                    {selectedEquipment?.name || 'General Service'}
                  </Text>
                </View>
              </View>

              <View style={st.summaryDivider} />

              <View style={st.summaryRow}>
                <Icon name="calendar" size={20} color={C.primary} />
                <View style={st.summaryInfo}>
                  <Text style={st.summaryLabel}>Date & Time</Text>
                  <Text style={st.summaryValue}>
                    {selectedDate ? formatDate(selectedDate) : 'Not selected'} at {selectedTime || 'Not selected'}
                  </Text>
                </View>
              </View>

              {problemDescription && (
                <>
                  <View style={st.summaryDivider} />
                  <View style={st.summaryRow}>
                    <Icon name="document-text" size={20} color={C.primary} />
                    <View style={st.summaryInfo}>
                      <Text style={st.summaryLabel}>Problem Description</Text>
                      <Text style={st.summaryValue}>{problemDescription}</Text>
                    </View>
                  </View>
                </>
              )}
            </View>

            <View style={st.noteBox}>
              <Icon name="information-circle" size={20} color={C.info} />
              <Text style={st.noteText}>
                You will receive a confirmation once our team reviews and approves your booking.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={st.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={st.backButton} onPress={prevStep}>
            <Icon name="arrow-back" size={20} color={C.ink} />
            <Text style={st.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[st.nextButton, !canProceed() && st.nextButtonDisabled]}
          onPress={step === 4 ? handleSubmit : nextStep}
          disabled={!canProceed() || isSubmitting}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={st.nextButtonText}>
                {step === 4 ? 'Confirm Booking' : 'Continue'}
              </Text>
              {step < 4 && <Icon name="arrow-forward" size={20} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
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
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, paddingHorizontal: 32 },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: 28, height: 28, borderRadius: 14, backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center'
  },
  progressDotActive: { backgroundColor: C.primary },
  progressNum: { fontSize: 12, fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: { width: 40, height: 2, backgroundColor: C.border, marginHorizontal: 4 },
  progressLineActive: { backgroundColor: C.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24, marginBottom: 8 },
  progressLabel: { fontSize: 10, color: C.muted, width: 60, textAlign: 'center' },
  progressLabelActive: { color: C.primary, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: 16 },
  stepContainer: { paddingTop: 16 },
  stepTitle: { fontSize: 20, fontWeight: '800', color: C.ink },
  stepSubtitle: { fontSize: 14, color: C.muted, marginTop: 4, marginBottom: 20 },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 16, padding: 16, marginBottom: 12,
    borderWidth: 2, borderColor: C.border
  },
  optionCardActive: { borderColor: C.primary, backgroundColor: '#FFF7F7' },
  optionIcon: {
    width: 48, height: 48, borderRadius: 12, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: 12
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  optionSubtitle: { fontSize: 13, color: C.muted, marginTop: 2 },

  emptyBox: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: C.muted, marginTop: 12 },

  sectionLabel: { fontSize: 14, fontWeight: '700', color: C.ink, marginTop: 20, marginBottom: 12 },

  dateScroll: { marginBottom: 8 },
  dateCard: {
    alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    backgroundColor: C.card, borderRadius: 16, marginRight: 10,
    borderWidth: 2, borderColor: C.border, minWidth: 70
  },
  dateCardActive: { borderColor: C.primary, backgroundColor: C.primary },
  dateTag: { fontSize: 9, fontWeight: '700', color: C.warn, marginBottom: 4 },
  dateTagActive: { color: '#fff' },
  dateDay: { fontSize: 12, fontWeight: '600', color: C.muted },
  dateDayActive: { color: '#fff' },
  dateNum: { fontSize: 20, fontWeight: '800', color: C.ink, marginVertical: 2 },
  dateNumActive: { color: '#fff' },
  dateMonth: { fontSize: 11, color: C.muted },
  dateMonthActive: { color: '#fff' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border
  },
  timeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  timeText: { fontSize: 13, fontWeight: '600', color: C.ink },
  timeTextActive: { color: '#fff' },

  textArea: {
    backgroundColor: C.card, borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: C.border, fontSize: 14, color: C.text,
    minHeight: 100, textAlignVertical: 'top'
  },

  summaryCard: { backgroundColor: C.card, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: C.border },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: 12, color: C.muted },
  summaryValue: { fontSize: 15, fontWeight: '600', color: C.ink, marginTop: 2 },
  summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: 12 },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 10,
    backgroundColor: '#EFF6FF', borderRadius: 12, padding: 14, marginTop: 16
  },
  noteText: { flex: 1, fontSize: 13, color: C.info, lineHeight: 18 },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 12, paddingBottom: 24,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 16, paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.bg
  },
  backButtonText: { fontSize: 14, fontWeight: '700', color: C.ink },
  nextButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    paddingVertical: 14, borderRadius: 12, backgroundColor: C.primary
  },
  nextButtonDisabled: { backgroundColor: '#FBC6C3' },
  nextButtonText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
