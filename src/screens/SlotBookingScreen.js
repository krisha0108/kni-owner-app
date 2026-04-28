import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList,
  ActivityIndicator, Alert, TextInput, useWindowDimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { scale, verticalScale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';

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
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState('AM');
  const hourListRef = useRef(null);
  const minuteListRef = useRef(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [step, setStep] = useState(1); // 1: Restaurant, 2: Equipment, 3: Date/Time, 4: Confirm

  const today = startOfDay(new Date());

  // Custom date picker
  const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_FULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [pickerDay, setPickerDay] = useState(() => new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const dayListRef = useRef(null);
  const monthListRef = useRef(null);

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const daysInPickerMonth = getDaysInMonth(pickerMonth, pickerYear);

  const handleMonthChange = (m) => {
    const maxDay = getDaysInMonth(m, pickerYear);
    setPickerMonth(m);
    if (pickerDay > maxDay) setPickerDay(maxDay);
  };
  const handleYearChange = (y) => {
    const maxDay = getDaysInMonth(pickerMonth, y);
    setPickerYear(y);
    if (pickerDay > maxDay) setPickerDay(maxDay);
  };
  const openDatePicker = () => {
    const d = selectedDate || new Date();
    setPickerDay(d.getDate());
    setPickerMonth(d.getMonth());
    setPickerYear(d.getFullYear());
    setDateModalVisible(true);
    setTimeout(() => {
      dayListRef.current?.scrollToIndex?.({ index: Math.max(0, d.getDate() - 3), animated: false });
      monthListRef.current?.scrollToIndex?.({ index: Math.max(0, d.getMonth() - 2), animated: false });
    }, 150);
  };
  const confirmDatePicker = () => {
    const d = new Date(pickerYear, pickerMonth, pickerDay);
    d.setHours(0, 0, 0, 0);
    setSelectedDate(d);
    setDateModalVisible(false);
  };

  // Time picker helpers
  const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  const openTimePicker = () => {
    if (selectedTime) {
      const parts = selectedTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
      if (parts) {
        setPickerHour(parseInt(parts[1]));
        setPickerMinute(parseInt(parts[2]));
        setPickerAmPm(parts[3].toUpperCase());
      }
    } else {
      setPickerHour(9);
      setPickerMinute(0);
      setPickerAmPm('AM');
    }
    setTimeModalVisible(true);
    setTimeout(() => {
      const hIdx = HOURS.indexOf(selectedTime ? parseInt(selectedTime) : 9);
      hourListRef.current?.scrollToIndex?.({ index: Math.max(0, hIdx - 2), animated: false });
    }, 150);
  };
  const confirmTimePicker = () => {
    const hStr = String(pickerHour).padStart(2, '0');
    const mStr = String(pickerMinute).padStart(2, '0');
    setSelectedTime(`${hStr}:${mStr} ${pickerAmPm}`);
    setTimeModalVisible(false);
  };

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
          'Your service slot has been booked. Please complete payment to confirm.',
          [
            {
              text: 'Pay Now',
              onPress: () => navigation.replace('BookingDetail', {
                bookingId: response.data.data.id,
              }),
            },
            {
              text: 'Later',
              onPress: () => navigation.navigate('MyBookings'),
              style: 'cancel',
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
          <View style={{ width: scale(40) }} />
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
        <View style={{ width: scale(40) }} />
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

      <ScrollView style={st.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scale(120) }}>
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
            <TouchableOpacity style={st.datePickerBtn} onPress={openDatePicker}>
              <Icon name="calendar-outline" size={scale(20)} color={selectedDate ? C.primary : C.muted} />
              <Text style={[st.datePickerBtnText, !selectedDate && { color: C.muted }]}>
                {selectedDate
                  ? `${selectedDate.getDate()} ${MONTHS_FULL[selectedDate.getMonth()]} ${selectedDate.getFullYear()}`
                  : 'Tap to select date'}
              </Text>
              <Icon name="chevron-forward" size={scale(18)} color={C.muted} />
            </TouchableOpacity>

            {/* Time Selection */}
            <Text style={st.sectionLabel}>Select Time Slot</Text>
            <TouchableOpacity style={st.datePickerBtn} onPress={openTimePicker}>
              <Icon name="time-outline" size={scale(20)} color={selectedTime ? C.primary : C.muted} />
              <Text style={[st.datePickerBtnText, !selectedTime && { color: C.muted }]}>
                {selectedTime || 'Tap to select time'}
              </Text>
              <Icon name="chevron-forward" size={scale(18)} color={C.muted} />
            </TouchableOpacity>

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

      {/* Custom Time Picker Modal */}
      <Modal visible={timeModalVisible} transparent animationType="slide" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={st.dpBackdrop}>
          <View style={st.dpSheet}>
            <View style={st.dpHeader}>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}>
                <Text style={st.dpCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={st.dpTitle}>Select Time</Text>
              <TouchableOpacity onPress={confirmTimePicker}>
                <Text style={st.dpDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={st.dpPreview}>
              <Text style={st.dpPreviewText}>
                {String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')} {pickerAmPm}
              </Text>
            </View>
            <View style={st.dpColumns}>
              {/* Hour Column */}
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>HOUR</Text>
                <FlatList
                  ref={hourListRef}
                  data={HOURS}
                  keyExtractor={(item) => String(item)}
                  style={st.dpScroll}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: scale(42), offset: scale(42) * index, index })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: h }) => (
                    <TouchableOpacity
                      style={[st.dpItem, pickerHour === h && st.dpItemActive]}
                      onPress={() => setPickerHour(h)}
                    >
                      <Text style={[st.dpItemText, pickerHour === h && st.dpItemTextActive]}>
                        {String(h).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              {/* Minute Column */}
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>MINUTE</Text>
                <FlatList
                  ref={minuteListRef}
                  data={MINUTES}
                  keyExtractor={(item) => String(item)}
                  style={st.dpScroll}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: scale(42), offset: scale(42) * index, index })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: m }) => (
                    <TouchableOpacity
                      style={[st.dpItem, pickerMinute === m && st.dpItemActive]}
                      onPress={() => setPickerMinute(m)}
                    >
                      <Text style={[st.dpItemText, pickerMinute === m && st.dpItemTextActive]}>
                        {String(m).padStart(2, '0')}
                      </Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              {/* AM/PM Column */}
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>AM/PM</Text>
                <View style={st.dpAmPmWrap}>
                  {['AM', 'PM'].map(v => (
                    <TouchableOpacity
                      key={v}
                      style={[st.dpAmPmBtn, pickerAmPm === v && st.dpAmPmBtnActive]}
                      onPress={() => setPickerAmPm(v)}
                    >
                      <Text style={[st.dpAmPmText, pickerAmPm === v && st.dpAmPmTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmTimePicker}>
              <Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" />
              <Text style={st.dpConfirmText}>Confirm Time</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={st.dpBackdrop}>
          <View style={st.dpSheet}>
            <View style={st.dpHeader}>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}>
                <Text style={st.dpCancel}>Cancel</Text>
              </TouchableOpacity>
              <Text style={st.dpTitle}>Select Date</Text>
              <TouchableOpacity onPress={confirmDatePicker}>
                <Text style={st.dpDone}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={st.dpPreview}>
              <Text style={st.dpPreviewText}>{pickerDay} {MONTHS_FULL[pickerMonth]} {pickerYear}</Text>
            </View>
            <View style={st.dpColumns}>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>DAY</Text>
                <FlatList
                  ref={dayListRef}
                  data={Array.from({ length: daysInPickerMonth }, (_, i) => i + 1)}
                  keyExtractor={(item) => String(item)}
                  style={st.dpScroll}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: scale(42), offset: scale(42) * index, index })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: d }) => (
                    <TouchableOpacity
                      style={[st.dpItem, pickerDay === d && st.dpItemActive]}
                      onPress={() => setPickerDay(d)}
                    >
                      <Text style={[st.dpItemText, pickerDay === d && st.dpItemTextActive]}>{d}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={[st.dpCol, { flex: 1.3 }]}>
                <Text style={st.dpColLabel}>MONTH</Text>
                <FlatList
                  ref={monthListRef}
                  data={MONTHS_SHORT}
                  keyExtractor={(item) => item}
                  style={st.dpScroll}
                  showsVerticalScrollIndicator={false}
                  getItemLayout={(_, index) => ({ length: scale(42), offset: scale(42) * index, index })}
                  onScrollToIndexFailed={() => {}}
                  renderItem={({ item: m, index: i }) => (
                    <TouchableOpacity
                      style={[st.dpItem, pickerMonth === i && st.dpItemActive]}
                      onPress={() => handleMonthChange(i)}
                    >
                      <Text style={[st.dpItemText, pickerMonth === i && st.dpItemTextActive]}>{m}</Text>
                    </TouchableOpacity>
                  )}
                />
              </View>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>YEAR</Text>
                <View style={st.dpYearStepper}>
                  <TouchableOpacity style={st.dpYearBtn} onPress={() => handleYearChange(pickerYear + 1)}>
                    <Icon name="chevron-up" size={scale(24)} color={C.ink} />
                  </TouchableOpacity>
                  <View style={st.dpYearValue}>
                    <Text style={st.dpYearText}>{pickerYear}</Text>
                  </View>
                  <TouchableOpacity style={st.dpYearBtn} onPress={() => handleYearChange(pickerYear - 1)}>
                    <Icon name="chevron-down" size={scale(24)} color={C.ink} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmDatePicker}>
              <Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" />
              <Text style={st.dpConfirmText}>Confirm Date</Text>
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
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  progressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: scale(16), paddingHorizontal: scale(32) },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: scale(28), height: scale(28), borderRadius: scale(14), backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center'
  },
  progressDotActive: { backgroundColor: C.primary },
  progressNum: { fontSize: moderateScale(12), fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: { width: scale(40), height: scale(2), backgroundColor: C.border, marginHorizontal: scale(4) },
  progressLineActive: { backgroundColor: C.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: scale(24), marginBottom: scale(8) },
  progressLabel: { fontSize: moderateScale(10), color: C.muted, width: scale(60), textAlign: 'center' },
  progressLabelActive: { color: C.primary, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: scale(16) },
  stepContainer: { paddingTop: scale(16) },
  stepTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  stepSubtitle: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(4), marginBottom: scale(20) },

  optionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(16), padding: scale(16), marginBottom: scale(12),
    borderWidth: scale(2), borderColor: C.border
  },
  optionCardActive: { borderColor: C.primary, backgroundColor: '#FFF7F7' },
  optionIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', marginRight: scale(12)
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  optionSubtitle: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },

  emptyBox: { alignItems: 'center', paddingVertical: scale(40) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  sectionLabel: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginTop: scale(20), marginBottom: scale(12) },

  dateScroll: { marginBottom: scale(8) },
  dateCard: {
    alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12),
    backgroundColor: C.card, borderRadius: scale(16), marginRight: scale(10),
    borderWidth: scale(2), borderColor: C.border, minWidth: scale(70)
  },
  dateCardActive: { borderColor: C.primary, backgroundColor: C.primary },
  dateTag: { fontSize: moderateScale(9), fontWeight: '700', color: C.warn, marginBottom: scale(4) },
  dateTagActive: { color: '#fff' },
  dateDay: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  dateDayActive: { color: '#fff' },
  dateNum: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink, marginVertical: scale(2) },
  dateNumActive: { color: '#fff' },
  dateMonth: { fontSize: moderateScale(11), color: C.muted },
  dateMonthActive: { color: '#fff' },

  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  timeChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(14), paddingVertical: scale(10), borderRadius: scale(12),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border
  },
  timeChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  timeText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  timeTextActive: { color: '#fff' },

  textArea: {
    backgroundColor: C.card, borderRadius: scale(12), padding: scale(14),
    borderWidth: 1, borderColor: C.border, fontSize: moderateScale(14), color: C.text,
    minHeight: scale(100), textAlignVertical: 'top'
  },

  summaryCard: { backgroundColor: C.card, borderRadius: scale(16), padding: scale(16), borderWidth: 1, borderColor: C.border },
  summaryRow: { flexDirection: 'row', alignItems: 'flex-start', gap: scale(12) },
  summaryInfo: { flex: 1 },
  summaryLabel: { fontSize: moderateScale(12), color: C.muted },
  summaryValue: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink, marginTop: scale(2) },
  summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(12) },

  noteBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: scale(10),
    backgroundColor: '#EFF6FF', borderRadius: scale(12), padding: scale(14), marginTop: scale(16)
  },
  noteText: { flex: 1, fontSize: moderateScale(13), color: C.info, lineHeight: scale(18) },

  bottomBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: scale(12),
    paddingHorizontal: scale(16), paddingVertical: scale(12), paddingBottom: scale(24),
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border
  },
  backButton: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(16), paddingVertical: scale(14), borderRadius: scale(12),
    backgroundColor: C.bg
  },
  backButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  nextButton: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.primary
  },
  nextButtonDisabled: { backgroundColor: '#FBC6C3' },
  nextButtonText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Date Picker Button
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(10),
    backgroundColor: '#fff', borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    paddingVertical: scale(14), paddingHorizontal: scale(16), marginBottom: scale(12),
  },
  datePickerBtnText: { flex: 1, fontSize: moderateScale(14), fontWeight: '600', color: C.ink },

  // Date Picker Modal
  dpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dpSheet: {
    backgroundColor: '#fff', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20),
    paddingHorizontal: scale(20), paddingTop: scale(16), paddingBottom: scale(30),
  },
  dpHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: scale(12),
  },
  dpCancel: { fontSize: moderateScale(14), color: C.muted, fontWeight: '600' },
  dpTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  dpDone: { fontSize: moderateScale(14), color: C.primary, fontWeight: '700' },
  dpPreview: {
    backgroundColor: C.ink, borderRadius: scale(12), paddingVertical: scale(14),
    paddingHorizontal: scale(20), alignItems: 'center', marginBottom: scale(16),
  },
  dpPreviewText: { fontSize: moderateScale(18), fontWeight: '700', color: '#FFFFFF' },
  dpColumns: { flexDirection: 'row', gap: scale(8), marginBottom: scale(16) },
  dpCol: { flex: 1 },
  dpColLabel: {
    fontSize: moderateScale(11), fontWeight: '700', color: C.muted, textAlign: 'center',
    letterSpacing: 1, marginBottom: scale(8),
  },
  dpScroll: { maxHeight: scale(200) },
  dpItem: {
    height: scale(38), paddingHorizontal: scale(6),
    borderRadius: scale(8), alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  dpItemActive: { backgroundColor: C.primary },
  dpItemText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  dpItemTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dpYearStepper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dpYearBtn: {
    width: scale(52), height: scale(44), borderRadius: scale(10),
    backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', marginVertical: scale(6),
  },
  dpYearValue: {
    backgroundColor: C.primary, borderRadius: scale(12),
    paddingVertical: scale(16), paddingHorizontal: scale(14), alignItems: 'center',
  },
  dpYearText: { fontSize: moderateScale(20), fontWeight: '800', color: '#FFFFFF' },
  dpAmPmWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(10) },
  dpAmPmBtn: {
    width: '100%', paddingVertical: scale(18), borderRadius: scale(12),
    backgroundColor: '#F5F7FA', alignItems: 'center',
  },
  dpAmPmBtnActive: { backgroundColor: C.primary },
  dpAmPmText: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  dpAmPmTextActive: { color: '#FFFFFF' },
  dpConfirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.primary, borderRadius: scale(12), paddingVertical: scale(14),
  },
  dpConfirmText: { fontSize: moderateScale(15), fontWeight: '700', color: '#FFFFFF' },
});
