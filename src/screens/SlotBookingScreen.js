import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, FlatList,
  ActivityIndicator, TextInput, useWindowDimensions, StatusBar, Animated
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { scale, verticalScale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
import OfferSelector from '../components/OfferSelector';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
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

const GST_RATE = 0.18;

const startOfDay = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

/* ─── Skeleton ─── */
function SkeletonSlotBooking({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(20), paddingTop: scale(24) }}>
      <Animated.View style={[st.skelStepTitle, { opacity: pulse }]} />
      <Animated.View style={[st.skelStepSubtitle, { opacity: pulse }]} />
      {[1, 2, 3].map(i => (
        <View key={i} style={st.skelOptionCard}>
          <Animated.View style={[st.skelOptionIcon, { opacity: pulse }]} />
          <View style={{ flex: 1 }}>
            <Animated.View style={[st.skelLine, { opacity: pulse, width: '70%' }]} />
            <Animated.View style={[st.skelLineSm, { opacity: pulse, width: '45%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SlotBookingScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
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
  const [cartSummary, setCartSummary] = useState(null);
  const [cartLoading, setCartLoading] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const { keyboardCompensation: keyboardHeight } = useKeyboardCompensation();

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

  // Fetch the server-side cart (with discount/GST already computed) once the
  // owner reaches the confirm step, so this screen isn't the only booking
  // flow with zero price visibility before submitting - mirrors what
  // request-now/ServiceRequestScreen already show.
  useEffect(() => {
    if (step !== 4 || !selectedRestaurant) return;
    setCartLoading(true);
    api.get('/owner/cart', { params: { restaurantId: selectedRestaurant.id } })
      .then(({ data }) => {
        if (data.ok) setCartSummary(data.data);
      })
      .catch(() => {})
      .finally(() => setCartLoading(false));
  }, [step, selectedRestaurant]);

  const cartItemTotal = React.useMemo(() => {
    if (!cartSummary) return 0;
    return (cartSummary.items || []).reduce((sum, item) => sum + item.priceSnapshot * item.qty, 0);
  }, [cartSummary]);

  // Owner's pick from `discountCandidates` - defaults to whichever the
  // backend auto-picked (candidates[0], sorted best-first) until they choose
  // a different one themselves. `undefined` = "haven't picked yet", distinct
  // from `null` ("explicitly chose No discount") - see the identical note in
  // ServiceRequestScreen.js.
  const [discountCandidates, setDiscountCandidates] = useState([]);
  const [selectedOfferId, setSelectedOfferId] = useState(undefined);
  // Whether `selectedOfferId` reflects an explicit OfferSelector pick rather
  // than the auto-picked best candidate. Without this, a stale auto-pick
  // "sticks" as candidates change (e.g. a fresh cartSummary fetch surfacing a
  // newly-applied promo code or a better auto-apply offer) because it's
  // still a *valid* candidate, just no longer the *best* one - silently
  // keeping a worse discount selected.
  const hasManualOfferSelection = useRef(false);
  const handleSelectOffer = (offerId) => {
    hasManualOfferSelection.current = true;
    setSelectedOfferId(offerId);
  };

  // The cart's own discount (above) is always auto-best - fetch the full
  // eligible-candidates list separately so the owner can pick a different
  // one, same as request-now/ServiceRequestScreen on web and mobile.
  useEffect(() => {
    if (!cartSummary || !selectedRestaurant || cartItemTotal <= 0) {
      setDiscountCandidates([]);
      return;
    }
    const categorySubtotals = {};
    (cartSummary.items || []).forEach((item) => {
      const categoryId = item.serviceItem?.category?.id || item.partItem?.category?.id;
      if (!categoryId) return;
      categorySubtotals[categoryId] = (categorySubtotals[categoryId] || 0) + item.priceSnapshot * item.qty;
    });
    const params = {
      restaurantId: selectedRestaurant.id,
      amount: cartItemTotal,
      categorySubtotals: JSON.stringify(categorySubtotals),
    };
    if (cartSummary.promoCode) params.promoCode = cartSummary.promoCode;
    api.get('/owner/effective-discount', { params })
      .then(({ data }) => {
        if (!data.ok) return;
        const candidates = data.data.candidates || [];
        setDiscountCandidates(candidates);
        setSelectedOfferId((prev) => {
          if (!hasManualOfferSelection.current) return candidates[0]?.offerId ?? null;
          const stillValid = prev !== undefined && candidates.some((c) => c.offerId === prev);
          return stillValid ? prev : (candidates[0]?.offerId ?? null);
        });
      })
      .catch(() => {});
  }, [cartSummary, selectedRestaurant, cartItemTotal]);

  const selectedCandidate = React.useMemo(
    () => discountCandidates.find((c) => c.offerId === selectedOfferId),
    [discountCandidates, selectedOfferId]
  );

  const pricing = React.useMemo(() => {
    if (!cartSummary) return null;
    const itemTotal = cartItemTotal;
    const rawAmount = selectedCandidate ? selectedCandidate.amount : cartSummary.discountAmount || 0;
    const discountAmount = Math.max(0, Math.min(rawAmount, itemTotal));
    const discountedBase = itemTotal - discountAmount;
    const gst = Math.round(discountedBase * GST_RATE);
    const total = discountedBase + gst;
    const discountSource = selectedCandidate ? selectedCandidate.source : cartSummary.discountSource || null;
    const discountPercent = selectedCandidate ? selectedCandidate.percent : cartSummary.discountPercent || 0;
    return {
      itemTotal,
      discountPercent,
      discountAmount,
      discountSource,
      gst,
      total,
      itemCount: (cartSummary.items || []).length,
    };
  }, [cartSummary, cartItemTotal, selectedCandidate]);

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
      AppAlert.alert('Error', 'Please fill all required fields');
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
        offerId: selectedOfferId,
      };

      const response = await api.post('/owner/bookings', payload);

      if (response.data.ok) {
        invalidate(`MyBookings-${selectedRestaurant.id}`);
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

        AppAlert.alert(
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
      AppAlert.alert('Error', error.message || 'Failed to create booking. Please try again.');
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
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Book a Slot</Text>
          <View style={{ width: scale(40) }} />
        </LinearGradient>
        <SkeletonSlotBooking pulse={pulse} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Book a Slot</Text>
        <View style={{ width: scale(40) }} />
      </LinearGradient>

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

      <ScrollView style={st.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scale(120) + keyboardHeight }} keyboardShouldPersistTaps="handled">
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

            {/* Payment Summary - items already added to cart before this screen */}
            {cartLoading ? (
              <View style={[st.summaryCard, { marginTop: scale(16), alignItems: 'center', paddingVertical: scale(20) }]}>
                <ActivityIndicator size="small" color={C.primary} />
              </View>
            ) : pricing && pricing.itemCount > 0 ? (
              <View style={[st.summaryCard, { marginTop: scale(16) }]}>
                <Text style={st.priceCardTitle}>Payment Summary</Text>
                <View style={st.priceRow}>
                  <Text style={st.priceLabel}>Item Total ({pricing.itemCount})</Text>
                  <Text style={st.priceValue}>₹{pricing.itemTotal.toLocaleString('en-IN')}</Text>
                </View>
                {pricing.discountAmount > 0 && (
                  <View style={st.priceRow}>
                    <Text style={[st.priceLabel, { color: C.ok }]}>
                      Discount ({pricing.discountPercent}%{pricing.discountSource ? ` — ${pricing.discountSource}` : ''})
                    </Text>
                    <Text style={[st.priceValue, { color: C.ok }]}>-₹{pricing.discountAmount.toLocaleString('en-IN')}</Text>
                  </View>
                )}
                <View style={st.priceRow}>
                  <Text style={st.priceLabel}>GST (18%)</Text>
                  <Text style={st.priceValue}>₹{pricing.gst.toLocaleString('en-IN')}</Text>
                </View>
                <View style={st.summaryDivider} />
                <View style={st.priceRow}>
                  <Text style={st.priceTotalLabel}>Total Amount</Text>
                  <Text style={st.priceTotalValue}>₹{pricing.total.toLocaleString('en-IN')}</Text>
                </View>
                <OfferSelector
                  candidates={discountCandidates}
                  selectedOfferId={selectedOfferId}
                  onSelect={handleSelectOffer}
                />
              </View>
            ) : null}

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
    paddingHorizontal: scale(16), paddingBottom: scale(12), overflow: 'hidden'
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // ─── Skeleton ───
  skelStepTitle: {
    width: '55%',
    height: scale(20),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
  },
  skelStepSubtitle: {
    width: '80%',
    height: scale(13),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    marginTop: scale(10),
    marginBottom: scale(20),
  },
  skelOptionCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(16), padding: scale(16), marginBottom: scale(12),
  },
  skelOptionIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(12),
    backgroundColor: '#E2E8F0', marginRight: scale(12),
  },
  skelLine: {
    height: scale(14),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
  },
  skelLineSm: {
    height: scale(11),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    marginTop: scale(6),
  },

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

  priceCardTitle: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginBottom: scale(10) },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(8) },
  priceLabel: { fontSize: moderateScale(13), color: C.muted, flexShrink: 1, marginRight: scale(8) },
  priceValue: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  priceTotalLabel: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  priceTotalValue: { fontSize: moderateScale(17), fontWeight: '800', color: C.primary },

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
