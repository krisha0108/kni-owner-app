/**
 * ============================================================================
 * SERVICE REQUEST SCREEN - OWNER APP
 * ============================================================================
 *
 * This screen matches the owner web's /owner/request-service flow:
 *
 * FLOW: select → date → payment → confirm
 *
 * Step 1 (select): Show available services & parts for the equipment category
 * Step 2 (date): Select date, time slot, and add problem description
 * Step 3 (payment): Show summary, add tip, upload payment screenshot
 * Step 4 (confirm): Success message
 *
 * API Endpoints:
 * - GET /api/app/services?category_id={id} - Fetch services
 * - GET /api/app/parts?category_id={id} - Fetch parts
 * - POST /api/owner/bookings - Create booking
 * - POST /api/upload - Upload payment screenshot
 *
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Image, Animated,
  useWindowDimensions, Dimensions, StatusBar, Keyboard, findNodeHandle,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import RazorpayCheckout from 'react-native-razorpay';
import { api, uploadFile } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import OfferSelector from '../components/OfferSelector';
import { scale, moderateScale, getContainerMaxWidth } from '../utils/responsive';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// Constants - matching owner web
const GST_RATE = 0.18;

const TIME_SLOTS = [
  { id: 'morning', label: '9:00 AM - 11:00 AM', start: '09:00', end: '11:00' },
  { id: 'midday', label: '11:00 AM - 1:00 PM', start: '11:00', end: '13:00' },
  { id: 'afternoon', label: '2:00 PM - 4:00 PM', start: '14:00', end: '16:00' },
  { id: 'evening', label: '4:00 PM - 6:00 PM', start: '16:00', end: '18:00' },
];

const TIP_OPTIONS = [50, 75, 100];

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
  orange: '#F97316',
};

const formatPrice = (amount) => {
  const num = amount || 0;
  return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

/* ─── Skeleton ─── */
function SkeletonServiceSelect({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(16) }}>
      <Animated.View style={[st.skelEquipmentCard, { opacity: pulse }]} />
      <Animated.View style={[st.skelSectionTitle, { opacity: pulse }]} />
      {[1, 2, 3].map(i => (
        <Animated.View key={i} style={[st.skelItemCard, { opacity: pulse }]} />
      ))}
    </View>
  );
}

export default function ServiceRequestScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const {
    equipmentId,
    equipmentName,
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName
  } = route.params || {};

  // Responsive dimensions
  const { width } = useWindowDimensions();
  const containerMaxWidth = getContainerMaxWidth(width);
  const { keyboardHeight, keyboardCompensation } = useKeyboardCompensation();

  // Restaurant context
  const { selectedRestaurant, selectedRestaurantId } = useRestaurant();

  // Data state
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Map());
  const [paymentSettings, setPaymentSettings] = useState(null);

  const dateScrollRef = useRef(null);
  const problemBoxRef = useRef(null);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Flow state
  const [step, setStep] = useState('select'); // select | date | payment | confirm

  // Scroll the Problem Description field above the keyboard every time it
  // opens on the date step - using the keyboard's own show event (not
  // TextInput onFocus) so this also fires on a second tap after the
  // keyboard was dismissed once, when the input can stay logically
  // "focused" without onFocus firing again. Measures the field's own
  // position instead of scrollToEnd, which overshoots past it (the bottom
  // padding here is sized for the date/time dropdowns, not this field) and
  // pushes it off the top of the screen.
  useEffect(() => {
    if (step !== 'date') return undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      const scrollNode = dateScrollRef.current;
      const targetHandle = findNodeHandle(problemBoxRef.current);
      if (!scrollNode || !targetHandle) return;
      problemBoxRef.current?.measureLayout(
        findNodeHandle(scrollNode),
        (_x, y) => scrollNode.scrollTo({ y: Math.max(0, y - scale(12)), animated: true }),
        () => {}
      );
    });
    return () => sub.remove();
  }, [step]);

  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [tip, setTip] = useState(0);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [dateModalVisible, setDateModalVisible] = useState(false);
  const [breakdownExpanded, setBreakdownExpanded] = useState(false);

  // Custom date picker
  const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [pickerDay, setPickerDay] = useState(() => new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const minDay = today.getDate();

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const daysInPickerMonth = getDaysInMonth(pickerMonth, pickerYear);
  const isMonthDisabled = (m) => pickerYear === minYear && m < minMonth;
  const isDayDisabled = (d) => pickerYear === minYear && pickerMonth === minMonth && d < minDay;
  const isYearDisabled = (y) => y < minYear;
  const handleMonthChange = (m) => {
    if (isMonthDisabled(m)) return;
    const mx = getDaysInMonth(m, pickerYear);
    setPickerMonth(m);
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (pickerYear === minYear && m === minMonth && newDay < minDay) newDay = minDay;
    setPickerDay(newDay);
  };
  const handleYearChange = (y) => {
    if (y < minYear) return;
    const mx = getDaysInMonth(pickerMonth, y);
    setPickerYear(y);
    let newMonth = pickerMonth;
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (y === minYear && newMonth < minMonth) { newMonth = minMonth; newDay = minDay; setPickerMonth(newMonth); }
    else if (y === minYear && newMonth === minMonth && newDay < minDay) newDay = minDay;
    setPickerDay(newDay);
  };

  // Drill-down calendar: 'days' (default) -> tap the header to zoom out to
  // 'months' -> tap again for 'years'; picking a month/year zooms back in.
  const [pickerView, setPickerView] = useState('days');
  const decadeStart = Math.floor(pickerYear / 10) * 10;
  const calHeaderLabel =
    pickerView === 'days' ? `${MONTHS_F[pickerMonth]} ${pickerYear}`
    : pickerView === 'months' ? `${pickerYear}`
    : `${decadeStart} - ${decadeStart + 9}`;
  const calPrevDisabled =
    pickerView === 'days' ? (pickerYear === minYear && pickerMonth === minMonth)
    : pickerView === 'months' ? pickerYear <= minYear
    : decadeStart <= Math.floor(minYear / 10) * 10;
  const goPrevMonth = () => {
    let m = pickerMonth - 1, y = pickerYear;
    if (m < 0) { m = 11; y -= 1; }
    if (y < minYear || (y === minYear && m < minMonth)) return;
    const mx = getDaysInMonth(m, y);
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (y === minYear && m === minMonth && newDay < minDay) newDay = minDay;
    setPickerYear(y); setPickerMonth(m); setPickerDay(newDay);
  };
  const goNextMonth = () => {
    let m = pickerMonth + 1, y = pickerYear;
    if (m > 11) { m = 0; y += 1; }
    const mx = getDaysInMonth(m, y);
    const newDay = pickerDay > mx ? mx : pickerDay;
    setPickerYear(y); setPickerMonth(m); setPickerDay(newDay);
  };
  const calPrev = () => {
    if (pickerView === 'days') goPrevMonth();
    else if (pickerView === 'months') { if (pickerYear > minYear) handleYearChange(pickerYear - 1); }
    else if (decadeStart - 10 + 9 >= minYear) setPickerYear(decadeStart - 10);
  };
  const calNext = () => {
    if (pickerView === 'days') goNextMonth();
    else if (pickerView === 'months') handleYearChange(pickerYear + 1);
    else setPickerYear(decadeStart + 10);
  };
  const calZoomOut = () => {
    if (pickerView === 'days') setPickerView('months');
    else if (pickerView === 'months') setPickerView('years');
  };

  const openDateModal = () => {
    const d = selectedDate && selectedDate >= today ? selectedDate : today;
    setPickerDay(d.getDate()); setPickerMonth(d.getMonth()); setPickerYear(d.getFullYear());
    setPickerView('days');
    setDateModalVisible(true);
  };
  const confirmDatePicker = () => {
    let d = new Date(pickerYear, pickerMonth, pickerDay); d.setHours(0, 0, 0, 0);
    if (d < today) d = new Date(today);
    setSelectedDate(d); setDateModalVisible(false);
  };

  // Custom time picker
  const HOURS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINS_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState('AM');

  // A selected date only needs past-time blocking when it IS today — any
  // future date has no "already happened" hours to rule out.
  const isSelectedDateToday = !!selectedDate && selectedDate.getTime() === today.getTime();
  const to24Hour = (h12, ampm) => {
    let h24 = h12;
    if (ampm === 'PM' && h24 !== 12) h24 += 12;
    if (ampm === 'AM' && h24 === 12) h24 = 0;
    return h24;
  };
  // Mirrors isDayDisabled/isMonthDisabled above: true only when picking this
  // value, combined with whatever else is currently picked, would land
  // before right now today.
  const isPastTimeOption = (h12, m, ampm) => {
    if (!isSelectedDateToday) return false;
    const candidate = new Date();
    candidate.setHours(to24Hour(h12, ampm), m, 0, 0);
    return candidate < new Date();
  };
  const isHourDisabled = (h) => isPastTimeOption(h, pickerMinute, pickerAmPm);
  const isMinuteDisabled = (m) => isPastTimeOption(pickerHour, m, pickerAmPm);
  const isAmPmDisabled = (ampm) => {
    if (!isSelectedDateToday) return false;
    // Whole half-day is gone once even its last possible slot (11:55) is past.
    return isPastTimeOption(11, 55, ampm);
  };

  const openTimeModal = () => {
    if (selectedSlot && selectedSlot !== 'custom') {
      const slot = TIME_SLOTS.find(s => s.id === selectedSlot);
      if (slot) {
        const [h, m] = slot.start.split(':').map(Number);
        setPickerHour(h > 12 ? h - 12 : h === 0 ? 12 : h);
        setPickerMinute(m);
        setPickerAmPm(h >= 12 ? 'PM' : 'AM');
      }
    } else if (selectedSlot === 'custom' && customSlot) {
      const [h, m] = customSlot.start.split(':').map(Number);
      setPickerHour(h > 12 ? h - 12 : h === 0 ? 12 : h);
      setPickerMinute(m);
      setPickerAmPm(h >= 12 ? 'PM' : 'AM');
    } else if (isSelectedDateToday) {
      // Default to "now", rounded up to the next 5-minute mark, so the
      // picker never opens pre-filled on an already-past time.
      const now = new Date();
      let h24 = now.getHours();
      let m = Math.ceil(now.getMinutes() / 5) * 5;
      if (m >= 60) { m = 0; h24 = (h24 + 1) % 24; }
      setPickerHour(h24 % 12 === 0 ? 12 : h24 % 12);
      setPickerMinute(m);
      setPickerAmPm(h24 >= 12 ? 'PM' : 'AM');
    } else { setPickerHour(9); setPickerMinute(0); setPickerAmPm('AM'); }
    setTimeModalVisible(true);
  };
  const confirmTimePicker = () => {
    if (isPastTimeOption(pickerHour, pickerMinute, pickerAmPm)) return;
    let h24 = pickerHour;
    if (pickerAmPm === 'PM' && h24 !== 12) h24 += 12;
    if (pickerAmPm === 'AM' && h24 === 12) h24 = 0;
    const endH24 = h24 + 2;
    const startStr = `${String(h24).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    const endStr = `${String(endH24).padStart(2, '0')}:${String(pickerMinute).padStart(2, '0')}`;
    const label = `${pickerHour}:${String(pickerMinute).padStart(2, '0')} ${pickerAmPm} - ${endH24 > 12 ? endH24 - 12 : endH24}:${String(pickerMinute).padStart(2, '0')} ${endH24 >= 12 ? 'PM' : 'AM'}`;
    // Use 'custom' as slot id with custom start/end
    setSelectedSlot('custom');
    // Store as a custom TIME_SLOT-compatible object
    setCustomSlot({ id: 'custom', label, start: startStr, end: endStr });
    setTimeModalVisible(false);
  };
  const [customSlot, setCustomSlot] = useState(null);

  // Fetch services and parts by category
  useEffect(() => {
    const fetchData = async () => {
      if (!categoryId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const params = { category_id: categoryId };
        if (subCategoryId) {
          params.subcategory_id = subCategoryId;
        }

        const [servicesRes, partsRes] = await Promise.all([
          api.get('/app/services', { params }),
          api.get('/app/parts', { params }),
        ]);

        if (servicesRes.data?.ok) {
          setServices(servicesRes.data.data || []);
        }
        if (partsRes.data?.ok) {
          setParts(partsRes.data.data || []);
        }
      } catch (error) {
        console.error('Failed to fetch services/parts:', error);
        AppAlert.alert('Error', 'Failed to load services and parts');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [categoryId, subCategoryId]);

  // Fetch payment settings from admin
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await api.get('/public/payment-settings');
        if (response.data?.ok && response.data?.data) {
          setPaymentSettings(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch payment settings:', error);
      }
    };
    fetchPaymentSettings();
  }, []);

  // Add/update item
  const addItem = (item, type) => {
    const key = `${type}:${item.id}`;
    setSelectedItems(prev => {
      const next = new Map(prev);
      const existing = next.get(key);
      if (existing) {
        next.set(key, { ...existing, qty: existing.qty + 1 });
      } else {
        next.set(key, {
          id: item.id,
          type,
          name: item.name,
          price: item.price,
          qty: 1,
        });
      }
      return next;
    });
  };

  // Update quantity
  const updateQty = (key, delta) => {
    setSelectedItems(prev => {
      const next = new Map(prev);
      const item = next.get(key);
      if (item) {
        const newQty = item.qty + delta;
        if (newQty <= 0) {
          next.delete(key);
        } else {
          next.set(key, { ...item, qty: newQty });
        }
      }
      return next;
    });
  };

  // Item total, computed early so the discount-preview effect can depend on
  // it (every item here shares the equipment's category, so a single
  // categoryId + amount is enough for category-scoped offer matching).
  const itemTotal = useMemo(() => {
    let total = 0;
    selectedItems.forEach(item => { total += item.price * item.qty; });
    return total;
  }, [selectedItems]);

  // Discount (custom rate / active offer / promo code) - matches what POST
  // /api/owner/bookings actually applies at creation time, so this preview
  // (and the Razorpay amount) isn't missing a discount the owner is entitled
  // to. Uses `amount` (not `percent`) for the actual math - a category-scoped
  // offer's % re-derived against the whole booking can drift real rupees on
  // large bookings.
  const [discount, setDiscount] = useState(null);
  const [promoCode, setPromoCode] = useState(null);
  const [promoCodeInput, setPromoCodeInput] = useState('');
  // Owner's pick from `discount.candidates` - defaults to whichever the
  // backend auto-picked (candidates[0], sorted best-first) until they choose
  // a different one themselves. `undefined` = "haven't picked yet", distinct
  // from `null` ("explicitly chose No discount") - candidates always include
  // a null-offerId "No discount" entry, so `null` can't double as the
  // not-yet-initialized sentinel without the two colliding.
  const [selectedOfferId, setSelectedOfferId] = useState(undefined);
  // Whether `selectedOfferId` reflects an explicit OfferSelector pick rather
  // than the auto-picked best candidate. Without this, a stale auto-pick
  // "sticks" as candidates change (e.g. after applying a better promo code)
  // because it's still a *valid* candidate, just no longer the *best* one -
  // silently keeping a worse discount selected. Reset whenever the applied
  // promo code changes so applying/removing a code always re-triggers
  // picking the new best.
  const hasManualOfferSelection = useRef(false);
  const handleSelectOffer = (offerId) => {
    hasManualOfferSelection.current = true;
    setSelectedOfferId(offerId);
  };
  useEffect(() => {
    if (!selectedRestaurantId || itemTotal <= 0) {
      setDiscount(null);
      return;
    }
    const params = { restaurantId: selectedRestaurantId, amount: itemTotal };
    if (categoryId) params.categoryId = categoryId;
    if (promoCode) params.promoCode = promoCode;
    api.get('/owner/effective-discount', { params })
      .then(res => {
        if (res.data.ok && res.data.data) {
          setDiscount(res.data.data);
          const candidates = res.data.data.candidates || [];
          setSelectedOfferId(prev => {
            if (!hasManualOfferSelection.current) return candidates[0]?.offerId ?? null;
            const stillValid = prev !== undefined && candidates.some(c => c.offerId === prev);
            return stillValid ? prev : (candidates[0]?.offerId ?? null);
          });
        }
      })
      .catch(() => {});
  }, [selectedRestaurantId, itemTotal, categoryId, promoCode]);

  const selectedCandidate = useMemo(
    () => (discount?.candidates || []).find(c => c.offerId === selectedOfferId),
    [discount, selectedOfferId]
  );

  // Calculate totals - mirrors the server's computeBookingTotal so this
  // preview (and the amount charged via Razorpay) matches what actually
  // gets stored on the booking: discount applied before GST.
  const totals = useMemo(() => {
    const rawAmount = selectedCandidate ? selectedCandidate.amount : discount?.amount ?? 0;
    const discountAmount = Math.max(0, Math.min(rawAmount, itemTotal));
    const discountedBase = itemTotal - discountAmount;
    const gst = Math.round(discountedBase * GST_RATE);
    const total = discountedBase + gst + tip;
    const discountSource = selectedCandidate ? selectedCandidate.source : discount?.source ?? null;
    const discountPercent = selectedCandidate ? selectedCandidate.percent : discount?.percent ?? 0;
    return { itemTotal, discountPercent, discountAmount, discountSource, gst, tip, total };
  }, [itemTotal, tip, discount, selectedCandidate]);

  // Copy UPI ID
  const copyUpiId = () => {
    if (paymentSettings?.upiId) {
      Clipboard.setString(paymentSettings.upiId);
      AppAlert.alert('Copied!', 'UPI ID copied to clipboard');
    }
  };

  // Upload payment screenshot
  const handleScreenshotUpload = async () => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      setIsUploading(true);
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `payment-${Date.now()}.jpg`,
      });
      formData.append('folder', 'payment-proofs');

      const response = await uploadFile(formData);

      if (response.data?.ok && response.data?.url) {
        setPaymentScreenshot(response.data.url);
        AppAlert.alert('Success', 'Screenshot uploaded');
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      AppAlert.alert('Error', 'Failed to upload screenshot');
    } finally {
      setIsUploading(false);
    }
  };

  // Razorpay payment
  const paymentInProgress = React.useRef(false);
  const handleRazorpayPayment = async () => {
    if (paymentInProgress.current) return;
    if (!selectedRestaurantId) {
      AppAlert.alert('Error', 'Please select a restaurant');
      return;
    }
    if (selectedItems.size === 0) {
      AppAlert.alert('Error', 'Please select at least one service or part');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      AppAlert.alert('Error', 'Please select date and time');
      return;
    }

    paymentInProgress.current = true;
    setIsSubmitting(true);
    try {
      const slot = selectedSlot === 'custom' ? customSlot : TIME_SLOTS.find(s => s.id === selectedSlot);
      if (!slot) throw new Error('Invalid time slot');

      const slotStart = new Date(selectedDate);
      const [startHour, startMin] = slot.start.split(':').map(Number);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(selectedDate);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      slotEnd.setHours(endHour, endMin, 0, 0);

      const items = [];
      selectedItems.forEach(item => {
        items.push({
          itemType: item.type === 'service' ? 'SERVICE' : 'PART',
          itemId: item.id,
          qty: item.qty,
          priceSnapshot: item.price,
        });
      });

      // 1. Create booking first (without payment)
      const bookingRes = await api.post('/owner/bookings', {
        restaurantId: selectedRestaurantId,
        equipmentId: equipmentId || undefined,
        slotStartDateTime: slotStart.toISOString(),
        slotEndDateTime: slotEnd.toISOString(),
        problemDescription: problemDescription || `Service request for ${equipmentName || 'Equipment'}`,
        tip,
        items,
        promoCode: promoCode || undefined,
        offerId: selectedOfferId,
      });

      if (!bookingRes.data?.ok) {
        throw new Error(bookingRes.data?.error || 'Failed to create booking');
      }

      const bookingId = bookingRes.data.data.id;

      // 2. Create Razorpay order
      const orderRes = await api.post('/razorpay/create-order', {
        amount: totals.total,
        type: 'SERVICE_BOOKING',
        referenceId: bookingId,
      });

      if (!orderRes.data.ok) {
        throw new Error(orderRes.data.error || 'Failed to create payment order');
      }

      const { orderId, amount, currency, keyId, prefill } = orderRes.data.data;

      // 3. Open Razorpay checkout
      const options = {
        key: keyId,
        amount,
        currency,
        name: 'KNI Super App',
        description: `Service Booking - ${equipmentName || 'Equipment'}`,
        order_id: orderId,
        prefill: prefill || {},
        theme: { color: '#EF3A3A' },
      };

      const paymentData = await RazorpayCheckout.open(options);

      // 4. Verify payment
      const verifyRes = await api.post('/razorpay/verify', {
        type: 'SERVICE_BOOKING',
        razorpay_order_id: paymentData.razorpay_order_id,
        razorpay_payment_id: paymentData.razorpay_payment_id,
        razorpay_signature: paymentData.razorpay_signature,
        bookingId,
      });

      if (verifyRes.data.ok) {
        invalidate(`MyBookings-${selectedRestaurantId}`);
        invalidate(`OrderTracking-${selectedRestaurantId}`);
        setStep('confirm');
      } else {
        AppAlert.alert('Verification Failed', verifyRes.data.error || 'Payment verification failed');
      }
    } catch (error) {
      const dismissed = error.code === 0 || error.code === 2 || error.code === 'PAYMENT_CANCELLED';
      if (dismissed) {
        AppAlert.alert(
          'Payment Cancelled',
          'Payment cancelled. Your booking has been created — you can pay later from My Bookings.',
          [{ text: 'OK' }]
        );
      } else {
        console.error('Razorpay payment error:', error);
        AppAlert.alert('Payment Failed', error.description || error.message || 'Payment failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
      paymentInProgress.current = false;
    }
  };

  // Submit booking (legacy manual flow - kept for reference)
  const handleSubmit = async () => {
    if (!selectedRestaurantId) {
      AppAlert.alert('Error', 'Please select a restaurant');
      return;
    }
    if (selectedItems.size === 0) {
      AppAlert.alert('Error', 'Please select at least one service or part');
      return;
    }
    if (!selectedDate || !selectedSlot) {
      AppAlert.alert('Error', 'Please select date and time');
      return;
    }
    if (!paymentScreenshot) {
      AppAlert.alert('Error', 'Please upload payment screenshot');
      return;
    }

    setIsSubmitting(true);
    try {
      const slot = selectedSlot === 'custom' ? customSlot : TIME_SLOTS.find(s => s.id === selectedSlot);
      if (!slot) throw new Error('Invalid time slot');

      // Build slot datetime
      const slotStart = new Date(selectedDate);
      const [startHour, startMin] = slot.start.split(':').map(Number);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(selectedDate);
      const [endHour, endMin] = slot.end.split(':').map(Number);
      slotEnd.setHours(endHour, endMin, 0, 0);

      // Build items array
      const items = [];
      selectedItems.forEach(item => {
        items.push({
          itemType: item.type === 'service' ? 'SERVICE' : 'PART',
          itemId: item.id,
          qty: item.qty,
          priceSnapshot: item.price,
        });
      });

      const payload = {
        restaurantId: selectedRestaurantId,
        equipmentId: equipmentId || undefined,
        slotStartDateTime: slotStart.toISOString(),
        slotEndDateTime: slotEnd.toISOString(),
        problemDescription: problemDescription || `Service request for ${equipmentName || 'Equipment'}`,
        tip: tip,
        items,
        promoCode: promoCode || undefined,
        offerId: selectedOfferId,
        paymentScreenshotUrl: paymentScreenshot,
      };

      const response = await api.post('/owner/bookings', payload);

      if (response.data?.ok) {
        invalidate(`MyBookings-${selectedRestaurantId}`);
        invalidate(`OrderTracking-${selectedRestaurantId}`);
        setStep('confirm');
      } else {
        throw new Error(response.data?.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('Booking error:', error);
      AppAlert.alert('Error', error.message || 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render service/part item
  const renderItem = (item, type) => {
    const key = `${type}:${item.id}`;
    const selected = selectedItems.get(key);
    const isService = type === 'service';
    const accentColor = isService ? C.primary : C.orange;

    return (
      <View
        key={item.id}
        style={[
          st.itemCard,
          selected && { borderColor: accentColor, backgroundColor: isService ? '#FFF5F5' : '#FFF7ED' }
        ]}
      >
        <View style={st.itemContent}>
          <View style={st.itemInfo}>
            {!isService && <View style={[st.partDot, { backgroundColor: C.orange }]} />}
            <View style={{ flex: 1 }}>
              <Text style={st.itemName}>{item.name}</Text>
              {item.description && (
                <Text style={st.itemDesc} numberOfLines={2}>{item.description}</Text>
              )}
            </View>
          </View>
          <View style={st.itemActions}>
            <Text style={[st.itemPrice, { color: accentColor }]}>{formatPrice(item.price)}</Text>
            {selected ? (
              <View style={st.qtyRow}>
                <TouchableOpacity style={st.qtyBtn} onPress={() => updateQty(key, -1)}>
                  <Icon name="remove" size={16} color={C.ink} />
                </TouchableOpacity>
                <Text style={st.qtyText}>{selected.qty}</Text>
                <TouchableOpacity style={st.qtyBtn} onPress={() => updateQty(key, 1)}>
                  <Icon name="add" size={16} color={C.ink} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[st.addBtn, { borderColor: accentColor }]}
                onPress={() => addItem(item, type)}
              >
                <Icon name="add" size={16} color={accentColor} />
                <Text style={[st.addBtnText, { color: accentColor }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case 'select':
        return (
          <ScrollView style={st.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Equipment Info */}
            <View style={st.equipmentCard}>
              <View style={st.equipmentIcon}>
                <Icon name="hardware-chip-outline" size={28} color={C.primary} />
              </View>
              <View style={st.equipmentInfo}>
                <Text style={st.equipmentName}>{equipmentName || 'Equipment'}</Text>
                <Text style={st.equipmentCategory}>
                  {categoryName}{subCategoryName ? ` - ${subCategoryName}` : ''}
                </Text>
              </View>
            </View>

            {/* Services */}
            {services.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Icon name="construct-outline" size={20} color={C.primary} />
                  <Text style={st.sectionTitle}>Available Services ({services.length})</Text>
                </View>
                {services.map(service => renderItem(service, 'service'))}
              </View>
            )}

            {/* Parts */}
            {parts.length > 0 && (
              <View style={st.section}>
                <View style={st.sectionHeader}>
                  <Icon name="cube-outline" size={20} color={C.orange} />
                  <Text style={st.sectionTitle}>Available Parts ({parts.length})</Text>
                </View>
                {parts.map(part => renderItem(part, 'part'))}
              </View>
            )}

            {/* No items message */}
            {!isLoading && services.length === 0 && parts.length === 0 && (
              <View style={st.emptyBox}>
                <Icon name="alert-circle-outline" size={48} color={C.muted} />
                <Text style={st.emptyTitle}>No Services or Parts Available</Text>
                <Text style={st.emptyText}>
                  No services or parts have been added for this equipment category yet.
                </Text>
              </View>
            )}

            <View style={{ height: scale(20) }} />
          </ScrollView>
        );

      case 'date':
        return (
          <ScrollView
            ref={dateScrollRef}
            style={st.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: (dateModalVisible || timeModalVisible) ? scale(380) : scale(40) }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Date Selection */}
            <View style={[st.section, dateModalVisible && st.sectionRaised]}>
              <View style={st.sectionHeader}>
                <Icon name="calendar-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Select Date</Text>
              </View>
              <View style={st.pickerAnchor}>
              <TouchableOpacity
                style={st.datePickerBtn}
                onPress={() => (dateModalVisible ? setDateModalVisible(false) : openDateModal())}
              >
                <Icon name="calendar" size={20} color={selectedDate ? C.primary : C.muted} />
                <Text style={[st.datePickerText, !selectedDate && { color: C.muted }]}>
                  {selectedDate ? `${selectedDate.getDate()} ${MONTHS_F[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'Tap to select date'}
                </Text>
                <Icon name={dateModalVisible ? 'chevron-up' : 'chevron-forward'} size={20} color={C.muted} />
              </TouchableOpacity>

              {/* Floating dropdown, anchored right below the button --
                  absolutely positioned so it overlaps the content below
                  (time slot, description) instead of pushing it down. */}
              {dateModalVisible && (
                <View style={[st.dateDropdown, st.dateDropdownFloating]}>
                  <View style={st.dpPreview}>
                    <Text style={st.dpPreviewText}>{pickerDay} {MONTHS_F[pickerMonth]} {pickerYear}</Text>
                  </View>
                  {/* Drill-down calendar: tap the header to zoom out (day ->
                      month -> year), tap a month/year to zoom back in. */}
                  <View style={st.calNavRow}>
                    <TouchableOpacity disabled={calPrevDisabled} onPress={calPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={st.calNavBtn}>
                      <Icon name="chevron-back" size={scale(20)} color={calPrevDisabled ? C.border : '#fff'} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={calZoomOut} disabled={pickerView === 'years'} style={st.calNavTitleBtn}>
                      <Text style={st.calNavTitle}>{calHeaderLabel}</Text>
                      {pickerView !== 'years' && <Icon name="chevron-down" size={scale(14)} color="#fff" style={{ marginLeft: scale(4) }} />}
                    </TouchableOpacity>
                    <TouchableOpacity onPress={calNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={st.calNavBtn}>
                      <Icon name="chevron-forward" size={scale(20)} color="#fff" />
                    </TouchableOpacity>
                  </View>

                  {pickerView === 'days' && (
                    <>
                      <View style={st.calWeekRow}>
                        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                          <Text key={i} style={st.calWeekLabel}>{d}</Text>
                        ))}
                      </View>
                      <View style={st.calGrid}>
                        {Array.from({ length: new Date(pickerYear, pickerMonth, 1).getDay() }).map((_, i) => (
                          <View key={`pad-${i}`} style={st.calCell} />
                        ))}
                        {Array.from({ length: daysInPickerMonth }, (_, i) => i + 1).map((d) => (
                          <TouchableOpacity
                            key={d}
                            disabled={isDayDisabled(d)}
                            style={st.calCell}
                            onPress={() => setPickerDay(d)}
                          >
                            <View style={[st.calCellInner, pickerDay === d && st.calCellActive]}>
                              <Text style={[st.calCellText, pickerDay === d && st.calCellTextActive, isDayDisabled(d) && st.calCellTextDisabled]}>{d}</Text>
                            </View>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </>
                  )}

                  {pickerView === 'months' && (
                    <View style={st.calGrid3}>
                      {MONTHS_S.map((m, i) => (
                        <TouchableOpacity
                          key={m}
                          disabled={isMonthDisabled(i)}
                          style={st.calGrid3Cell}
                          onPress={() => { handleMonthChange(i); setPickerView('days'); }}
                        >
                          <View style={[st.calGridBtn, pickerMonth === i && st.calCellActive]}>
                            <Text style={[st.calCellText, pickerMonth === i && st.calCellTextActive, isMonthDisabled(i) && st.calCellTextDisabled]}>{m}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  {pickerView === 'years' && (
                    <View style={st.calGrid3}>
                      {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map((y) => (
                        <TouchableOpacity
                          key={y}
                          disabled={isYearDisabled(y)}
                          style={st.calGrid3Cell}
                          onPress={() => { handleYearChange(y); setPickerView('months'); }}
                        >
                          <View style={[st.calGridBtn, pickerYear === y && st.calCellActive]}>
                            <Text style={[st.calCellText, pickerYear === y && st.calCellTextActive, isYearDisabled(y) && st.calCellTextDisabled]}>{y}</Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}

                  <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmDatePicker}>
                    <Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" /><Text style={st.dpConfirmText}>Confirm Date</Text>
                  </TouchableOpacity>
                </View>
              )}
              </View>
            </View>

            {/* Time Slot Selection -- touches disabled while the date
                dropdown is open, since it can float down far enough to
                visually cover this section; without this, a tap meant for
                the date overlay could leak through to whatever's
                underneath on Android (zIndex/elevation only control paint
                order there, not touch hit-testing across sibling trees). */}
            <View style={[st.section, timeModalVisible && st.sectionRaised]} pointerEvents={dateModalVisible ? 'none' : 'auto'}>
              <View style={st.sectionHeader}>
                <Icon name="time-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Select Time Slot</Text>
              </View>
              <View style={st.pickerAnchor}>
              <TouchableOpacity
                style={st.datePickerBtn}
                onPress={() => (timeModalVisible ? setTimeModalVisible(false) : openTimeModal())}
              >
                <Icon name="time" size={20} color={selectedSlot ? C.primary : C.muted} />
                <Text style={[st.datePickerText, !selectedSlot && { color: C.muted }]}>
                  {selectedSlot
                    ? (selectedSlot === 'custom' ? customSlot?.label : TIME_SLOTS.find(s => s.id === selectedSlot)?.label)
                    : 'Tap to select time'}
                </Text>
                <Icon name={timeModalVisible ? 'chevron-up' : 'chevron-forward'} size={20} color={C.muted} />
              </TouchableOpacity>

              {/* Floating dropdown, same anchored-overlap pattern as the
                  date picker. */}
              {timeModalVisible && (
                <View style={[st.dateDropdown, st.dateDropdownFloating]}>
                  <View style={st.dpPreview}>
                    <Text style={st.dpPreviewText}>{String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')} {pickerAmPm}</Text>
                  </View>
                  <Text style={st.calSectionLabel}>HOUR</Text>
                  <View style={st.calGrid4}>
                    {HOURS_LIST.map((h) => (
                      <TouchableOpacity key={h} disabled={isHourDisabled(h)} style={st.calGrid4Cell} onPress={() => setPickerHour(h)}>
                        <View style={[st.calGridBtn, pickerHour === h && st.calCellActive]}>
                          <Text style={[st.calCellText, pickerHour === h && st.calCellTextActive, isHourDisabled(h) && st.calCellTextDisabled]}>{String(h).padStart(2, '0')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[st.calSectionLabel, { marginTop: scale(8) }]}>MINUTE</Text>
                  <View style={st.calGrid4}>
                    {MINS_LIST.map((m) => (
                      <TouchableOpacity key={m} disabled={isMinuteDisabled(m)} style={st.calGrid4Cell} onPress={() => setPickerMinute(m)}>
                        <View style={[st.calGridBtn, pickerMinute === m && st.calCellActive]}>
                          <Text style={[st.calCellText, pickerMinute === m && st.calCellTextActive, isMinuteDisabled(m) && st.calCellTextDisabled]}>{String(m).padStart(2, '0')}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>

                  <Text style={[st.calSectionLabel, { marginTop: scale(8) }]}>AM / PM</Text>
                  <View style={st.dpAmPmWrap}>
                    {['AM', 'PM'].map(v => (
                      <TouchableOpacity key={v} disabled={isAmPmDisabled(v)} style={[st.dpAmPmBtn, pickerAmPm === v && st.dpAmPmBtnActive, isAmPmDisabled(v) && st.dpItemDisabled]} onPress={() => setPickerAmPm(v)}>
                        <Text style={[st.dpAmPmText, pickerAmPm === v && st.dpAmPmTextActive, isAmPmDisabled(v) && st.dpItemTextDisabled]}>{v}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                  {isSelectedDateToday && isPastTimeOption(pickerHour, pickerMinute, pickerAmPm) && (
                    <Text style={st.dpPastTimeWarning}>That time has already passed today — pick a later time.</Text>
                  )}
                  <TouchableOpacity
                    disabled={isPastTimeOption(pickerHour, pickerMinute, pickerAmPm)}
                    style={[st.dpConfirmBtn, isPastTimeOption(pickerHour, pickerMinute, pickerAmPm) && { opacity: 0.5 }]}
                    onPress={confirmTimePicker}
                  >
                    <Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" /><Text style={st.dpConfirmText}>Confirm Time</Text>
                  </TouchableOpacity>
                </View>
              )}
              </View>
            </View>

            {/* Problem Description -- same reasoning as the Time Slot
                section above: disabled for touch (including the TextInput
                itself, which would otherwise pop the keyboard on a leaked
                tap) whenever either floating dropdown is open and may be
                covering it. */}
            <View ref={problemBoxRef} style={st.section} pointerEvents={(dateModalVisible || timeModalVisible) ? 'none' : 'auto'}>
              <View style={st.sectionHeader}>
                <Icon name="document-text-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Problem Description (Optional)</Text>
              </View>
              <TextInput
                style={st.textArea}
                placeholder="Describe the issue with your equipment..."
                placeholderTextColor={C.muted}
                value={problemDescription}
                onChangeText={setProblemDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <View style={{ height: scale(20) }} />
          </ScrollView>
        );

      case 'payment':
        return (
          <ScrollView
            style={st.scrollContent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: scale(40) + keyboardCompensation }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Tip Selection — comes before the hero so the Pay button below
                already reflects the tip you picked, not a stale total. */}
            <View style={[st.section, { marginBottom: scale(14) }]}>
              <View style={[st.sectionHeader, { marginBottom: scale(8) }]}>
                <Icon name="heart-outline" size={16} color={C.primary} />
                <Text style={[st.sectionTitle, { fontSize: moderateScale(14) }]}>Add a Tip</Text>
              </View>
              <View style={st.tipRow}>
                {TIP_OPTIONS.map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[st.tipBtn, tip === amount && st.tipBtnActive]}
                    onPress={() => setTip(tip === amount ? 0 : amount)}
                  >
                    <Text style={[st.tipText, tip === amount && st.tipTextActive]}>₹{amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Promo code — same reason as Tip: apply it before the hero so
                Amount to Pay already reflects the discount. */}
            <View style={[st.section, { marginBottom: scale(14) }]}>
              <View style={[st.sectionHeader, { marginBottom: scale(8) }]}>
                <Icon name="pricetag-outline" size={16} color={C.primary} />
                <Text style={[st.sectionTitle, { fontSize: moderateScale(14) }]}>Promo Code</Text>
              </View>
              <View style={st.summaryCard}>
                {promoCode ? (
                  <View style={[st.summaryRow, { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, marginBottom: 0 }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.summaryLabel}>Code <Text style={{ fontWeight: '700' }}>{promoCode}</Text> applied</Text>
                      {discount?.promoCodeError ? (
                        <Text style={{ fontSize: 11, color: C.danger, marginTop: 2 }}>{discount.promoCodeError}</Text>
                      ) : discount?.promoCodeOutbidBy ? (
                        <Text style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
                          Valid, but "{discount.promoCodeOutbidBy}" already gives a bigger discount — that one's being used
                        </Text>
                      ) : null}
                    </View>
                    <TouchableOpacity onPress={() => { hasManualOfferSelection.current = false; setPromoCode(null); setPromoCodeInput(''); }}>
                      <Text style={{ color: C.primary, fontWeight: '600' }}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <TextInput
                      style={[st.textInput, { flex: 1 }]}
                      placeholder="Promo code"
                      placeholderTextColor={C.muted}
                      value={promoCodeInput}
                      onChangeText={(t) => setPromoCodeInput(t.toUpperCase())}
                      autoCapitalize="characters"
                    />
                    <TouchableOpacity
                      style={[st.applyBtn, !promoCodeInput.trim() && { opacity: 0.5 }]}
                      disabled={!promoCodeInput.trim()}
                      onPress={() => { hasManualOfferSelection.current = false; setPromoCode(promoCodeInput.trim().toUpperCase()); }}
                    >
                      <Text style={st.applyBtnText}>Apply</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <OfferSelector
                  candidates={discount?.candidates}
                  selectedOfferId={selectedOfferId}
                  onSelect={handleSelectOffer}
                />
              </View>
            </View>

            {/* Hero: Amount + Pay — sits after Tip/Promo so the total shown
                here is always final, then the primary action itself. Secure
                Payment and the breakdown link are folded in as a compact
                footer row instead of separate cards. */}
            <View style={st.heroCard}>
              <View style={st.heroTopRow}>
                <TouchableOpacity style={st.heroBackBtn} onPress={() => setStep('date')}>
                  <Icon name="arrow-back" size={16} color="#fff" />
                </TouchableOpacity>
                <Text style={st.heroLabel}>Amount to Pay</Text>
              </View>
              <Text style={st.heroAmount}>{formatPrice(totals.total)}</Text>
              <TouchableOpacity
                style={[st.heroPayBtn, isSubmitting && st.heroPayBtnDisabled]}
                disabled={isSubmitting}
                onPress={handleRazorpayPayment}
              >
                {isSubmitting ? (
                  <ActivityIndicator color={C.primary} size="small" />
                ) : (
                  <>
                    <Icon name="card" size={17} color={C.primary} />
                    <Text style={st.heroPayBtnText}>Pay with Razorpay</Text>
                  </>
                )}
              </TouchableOpacity>

              <View style={st.heroDivider} />

              <View style={st.heroFooterRow}>
                <View style={st.heroSecureRow}>
                  <Icon name="shield-checkmark" size={13} color="rgba(255,255,255,0.85)" />
                  <Text style={st.heroSecureText} numberOfLines={1}>Secure via Razorpay</Text>
                </View>
                <TouchableOpacity style={st.heroBreakdownLink} onPress={() => setBreakdownExpanded(v => !v)}>
                  <Text style={st.heroBreakdownLinkText}>{breakdownExpanded ? 'Hide breakdown' : 'View breakdown'}</Text>
                  <Icon name={breakdownExpanded ? 'chevron-up' : 'chevron-down'} size={13} color="rgba(255,255,255,0.85)" />
                </TouchableOpacity>
              </View>
            </View>

            {breakdownExpanded && (
              <View style={[st.summaryCard, { marginBottom: scale(16) }]}>
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>Item Total</Text>
                  <Text style={st.summaryValue}>{formatPrice(totals.itemTotal)}</Text>
                </View>
                {totals.discountAmount > 0 && (
                  <View style={st.summaryRow}>
                    <Text style={st.summaryLabel}>
                      Discount ({totals.discountPercent}%{totals.discountSource ? ` — ${totals.discountSource}` : ''})
                    </Text>
                    <Text style={[st.summaryValue, { color: C.ok }]}>-{formatPrice(totals.discountAmount)}</Text>
                  </View>
                )}
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>GST (18%)</Text>
                  <Text style={st.summaryValue}>{formatPrice(totals.gst)}</Text>
                </View>
                <View style={[st.summaryRow, { marginBottom: 0 }]}>
                  <Text style={st.summaryLabel}>Tip</Text>
                  <Text style={st.summaryValue}>{formatPrice(totals.tip)}</Text>
                </View>
              </View>
            )}

            {keyboardHeight === 0 && <View style={{ height: scale(100) }} />}
          </ScrollView>
        );

      case 'confirm':
        return (
          <View style={st.confirmContainer}>
            <View style={st.confirmCard}>
              <View style={st.confirmIcon}>
                <Icon name="checkmark" size={48} color="#fff" />
              </View>
              <Text style={st.confirmTitle}>Booking Confirmed!</Text>
              <Text style={st.confirmText}>
                Your service request has been submitted successfully.
              </Text>
              <TouchableOpacity
                style={st.confirmBtn}
                onPress={() => navigation.navigate('MyBookings')}
              >
                <Text style={st.confirmBtnText}>View My Bookings</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      default:
        return null;
    }
  };

  // Order summary + Continue action -- rendered once at the bottom of the
  // screen (the bottom nav bar is hidden on this screen entirely, per the
  // client's request, so there's no floating bar left to clear). Stays
  // rendered even while the keyboard is open, with keyboardCompensation
  // added to its own bottom margin to lift it clear of the keyboard - only
  // on devices where the OS doesn't already resize the window for us (see
  // windowAlreadyResized above); on devices where it does, adding it again
  // would double-push the bar off the keyboard, leaving a gap.
  // The payment step has its own hero Pay button instead (see 'payment'
  // case above) rather than reusing this Continue bar.
  const renderOrderSummary = () => {
    const itemCount = selectedItems.size;
    const canContinue = step === 'select' ? itemCount > 0 : selectedDate && selectedSlot;

    return (
      <View style={[st.inlineSummary, { marginBottom: insets.bottom + scale(16) + keyboardCompensation }]}>
        <View style={st.footerSummary}>
          <View style={st.footerLeft}>
            <Text style={st.footerItems} numberOfLines={1}>{itemCount} items selected</Text>
            <Text style={st.footerTotal} numberOfLines={1}>{formatPrice(totals.total)}</Text>
          </View>

          {/* Navigation buttons */}
          <View style={st.footerBtns}>
            {step !== 'select' && (
              <TouchableOpacity style={st.backBtn} onPress={() => setStep('select')}>
                <Icon name="arrow-back" size={20} color="#fff" />
              </TouchableOpacity>
            )}

            {step === 'select' && (
              <TouchableOpacity
                style={[st.continueBtn, !canContinue && st.continueBtnDisabled]}
                disabled={!canContinue}
                onPress={() => setStep('date')}
              >
                <Text style={st.continueBtnText} numberOfLines={1} ellipsizeMode="tail">Continue</Text>
                <Icon name="arrow-forward" size={18} color={C.primary} />
              </TouchableOpacity>
            )}

            {step === 'date' && (
              <TouchableOpacity
                style={[st.continueBtn, !canContinue && st.continueBtnDisabled]}
                disabled={!canContinue}
                onPress={() => setStep('payment')}
              >
                <Text style={st.continueBtnText} numberOfLines={1} ellipsizeMode="tail">Continue to Payment</Text>
                <Icon name="arrow-forward" size={18} color={C.primary} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  // No category error
  if (!categoryId) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Request Service</Text>
          <View style={{ width: scale(40) }} />
        </LinearGradient>
        <View style={st.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={C.muted} />
          <Text style={st.errorTitle}>Invalid Request</Text>
          <Text style={st.errorText}>
            Please select equipment from My Equipment to request service.
          </Text>
          <TouchableOpacity
            style={st.errorBtn}
            onPress={() => navigation.navigate('Home', { screen: 'EquipmentTab' })}
          >
            <Text style={st.errorBtnText}>Go to My Equipment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.headerBackBtn}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="arrow-back" size={19} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Request Service</Text>
        <View style={{ width: scale(40) }} />
      </LinearGradient>

      {/* Progress Steps */}
      {step !== 'confirm' && (
        <View style={st.progressRow}>
          {['select', 'date', 'payment'].map((s, idx) => {
            const stepOrder = ['select', 'date', 'payment'];
            const currentIdx = stepOrder.indexOf(step);
            const isActive = step === s;
            const isCompleted = currentIdx > idx;

            return (
              <View key={s} style={st.progressItem}>
                <View style={[
                  st.progressDot,
                  isActive && st.progressDotActive,
                  isCompleted && st.progressDotCompleted
                ]}>
                  <Text style={[
                    st.progressNum,
                    (isActive || isCompleted) && st.progressNumActive
                  ]}>{idx + 1}</Text>
                </View>
                {idx < 2 && <View style={st.progressLine} />}
              </View>
            );
          })}
        </View>
      )}

      {/* Subtitle */}
      {step !== 'confirm' && (
        <Text style={st.subtitle}>
          {step === 'select' && 'Select services and parts for your equipment'}
          {step === 'date' && 'Choose your preferred date and time'}
          {step === 'payment' && 'Complete payment to confirm booking'}
        </Text>
      )}

      {/* Loading */}
      {isLoading ? (
        <SkeletonServiceSelect pulse={pulse} />
      ) : (
        renderStepContent()
      )}

      {/* Sticky summary + Continue bar — always visible (including while the
          keyboard is open, e.g. typing in Problem Description), no closing
          the keyboard needed to reach it. Only for select/date; payment has
          its own hero Pay button and confirm has its own CTA. */}
      {!isLoading && (step === 'select' || step === 'date') && renderOrderSummary()}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingBottom: scale(12), overflow: 'hidden'
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  headerBackBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20), backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.15, shadowRadius: scale(4), elevation: 2,
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },

  // Progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: scale(16), backgroundColor: C.card
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center'
  },
  progressDotActive: { backgroundColor: C.primary },
  progressDotCompleted: { backgroundColor: C.ok },
  progressNum: { fontSize: moderateScale(14), fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: { width: scale(40), height: scale(2), backgroundColor: C.border, marginHorizontal: scale(8) },

  subtitle: {
    textAlign: 'center', fontSize: moderateScale(13), color: C.muted,
    paddingHorizontal: scale(16), paddingBottom: scale(12), backgroundColor: C.card
  },

  // Content
  scrollContent: { flex: 1, padding: scale(16) },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Skeleton
  skelEquipmentCard: {
    height: scale(88),
    borderRadius: scale(16),
    backgroundColor: '#E2E8F0',
    marginBottom: scale(20),
  },
  skelSectionTitle: {
    width: '55%',
    height: scale(16),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    marginBottom: scale(12),
  },
  skelItemCard: {
    height: scale(76),
    borderRadius: scale(14),
    backgroundColor: '#E2E8F0',
    marginBottom: scale(10),
  },

  // Equipment Card
  equipmentCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(16), padding: scale(16), marginBottom: scale(20),
    borderWidth: 1, borderColor: C.border
  },
  equipmentIcon: {
    width: scale(56), height: scale(56), borderRadius: scale(14), backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center'
  },
  equipmentInfo: { flex: 1, marginLeft: scale(12) },
  equipmentName: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  equipmentCategory: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },

  // Sections
  section: { marginBottom: scale(20) },
  // Bumped above sibling sections while this section's dropdown is open, so
  // its absolutely-positioned floating panel (see dateDropdownFloating)
  // paints over their content instead of underneath it.
  sectionRaised: { zIndex: 30, elevation: 30 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12) },
  // Positioning context for the date/time trigger button -- its dropdown is
  // absolutely positioned against this, so the dropdown's height doesn't
  // affect this View's own height (the button's height still does).
  pickerAnchor: { position: 'relative' },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '800', color: C.ink },

  // Item Cards
  itemCard: {
    backgroundColor: C.card, borderRadius: scale(14), padding: scale(14),
    marginBottom: scale(10), borderWidth: 1, borderColor: C.border
  },
  itemContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemInfo: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  partDot: { width: scale(8), height: scale(8), borderRadius: scale(4), marginTop: scale(6), marginRight: scale(8) },
  itemName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  itemDesc: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },
  itemActions: { alignItems: 'flex-end', marginLeft: scale(12) },
  itemPrice: { fontSize: moderateScale(16), fontWeight: '800' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: scale(8), gap: scale(8) },
  qtyBtn: {
    width: scale(28), height: scale(28), borderRadius: scale(8), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border
  },
  qtyText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, minWidth: scale(20), textAlign: 'center' },
  addBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(8),
    paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(8), borderWidth: 1
  },
  addBtnText: { fontSize: moderateScale(13), fontWeight: '700' },

  // Date picker
  datePickerBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(12), padding: scale(14), borderWidth: 1, borderColor: C.border
  },
  datePickerText: { flex: 1, fontSize: moderateScale(15), fontWeight: '600', color: C.ink, marginLeft: scale(12) },
  // Small dropdown (not a modal) -- not a full-screen sheet, just this card.
  dateDropdown: {
    backgroundColor: C.card, borderRadius: scale(10), borderWidth: 1, borderColor: C.border,
    padding: scale(8), marginTop: scale(6),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(3) }, shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3,
  },
  // Floats the dropdown above pickerAnchor instead of in normal flow, so it
  // overlaps whatever comes after it on the page (time slot, description)
  // rather than pushing that content down while it's open.
  dateDropdownFloating: {
    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 40, elevation: 12,
  },
  dpPreview: { backgroundColor: C.ink, borderRadius: scale(7), paddingVertical: scale(5), alignItems: 'center', marginBottom: scale(6) },
  dpPreviewText: { fontSize: moderateScale(12), fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },

  // Time slots
  slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  slotBtn: {
    width: '48%', paddingVertical: scale(14), borderRadius: scale(12),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  slotBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  slotText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  slotTextActive: { color: '#fff' },

  // Text area
  textArea: {
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    padding: scale(14), fontSize: moderateScale(15), color: C.text, minHeight: scale(100)
  },

  // Summary
  summaryCard: { backgroundColor: C.card, borderRadius: scale(12), padding: scale(12), borderWidth: 1, borderColor: C.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  summaryLabel: { fontSize: moderateScale(14), color: C.muted },
  summaryValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  textInput: {
    backgroundColor: C.bg, borderRadius: scale(10), borderWidth: 1, borderColor: C.border,
    paddingHorizontal: scale(12), paddingVertical: scale(8), fontSize: moderateScale(13), color: C.text,
  },
  applyBtn: {
    backgroundColor: C.primary, borderRadius: scale(10), paddingHorizontal: scale(14),
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: moderateScale(13) },

  // Payment hero (Amount + Pay Now, top of the payment step)
  heroCard: {
    backgroundColor: C.primary, borderRadius: scale(16), padding: scale(16),
    marginBottom: scale(16),
  },
  heroTopRow: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(10) },
  heroBackBtn: {
    width: scale(28), height: scale(28), borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.16)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroLabel: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  heroAmount: { fontSize: moderateScale(26), fontWeight: '900', color: '#fff', marginBottom: scale(12) },
  heroPayBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: '#fff', borderRadius: scale(12), paddingVertical: scale(12), width: '100%',
  },
  heroPayBtnDisabled: { opacity: 0.7 },
  heroPayBtnText: { fontSize: moderateScale(14), fontWeight: '800', color: C.primary },
  heroDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: scale(12), marginBottom: scale(10) },
  heroFooterRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: scale(8) },
  heroSecureRow: { flexDirection: 'row', alignItems: 'center', gap: scale(5), flexShrink: 1 },
  heroSecureText: { fontSize: moderateScale(11), color: 'rgba(255,255,255,0.85)', flexShrink: 1 },
  heroBreakdownLink: { flexDirection: 'row', alignItems: 'center', gap: scale(4), flexShrink: 0 },
  heroBreakdownLinkText: { fontSize: moderateScale(11), fontWeight: '700', color: '#fff' },

  // Tip
  tipRow: { flexDirection: 'row', gap: scale(8) },
  tipBtn: {
    flex: 1, paddingVertical: scale(9), borderRadius: scale(10), backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  tipBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tipText: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },
  tipTextActive: { color: '#fff' },

  // UPI
  qrContainer: {
    alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff',
    borderRadius: scale(12), padding: scale(16), marginBottom: scale(16), borderWidth: 1, borderColor: C.border
  },
  qrImage: { width: scale(180), height: scale(180) },
  upiCard: { backgroundColor: C.bg, borderRadius: scale(12), padding: scale(14), marginBottom: scale(16) },
  upiRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  upiLabel: { fontSize: moderateScale(12), color: C.muted },
  copyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  copyText: { fontSize: moderateScale(13), fontWeight: '600', color: C.primary },
  upiId: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginTop: scale(4), fontFamily: 'monospace' },
  upiDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(10) },
  accountName: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink, marginTop: scale(4) },
  instructionsCard: {
    backgroundColor: '#EFF6FF', borderRadius: scale(12), padding: scale(14), marginBottom: scale(16),
    borderWidth: 1, borderColor: '#BFDBFE'
  },
  instructionsText: { fontSize: moderateScale(13), color: '#1E40AF', lineHeight: scale(20) },
  warningCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBEB',
    borderRadius: scale(12), padding: scale(14), marginBottom: scale(16), borderWidth: 1, borderColor: '#FDE68A', gap: scale(10)
  },
  warningText: { flex: 1, fontSize: moderateScale(13), color: '#92400E' },

  // Upload
  uploadLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginBottom: scale(8) },
  uploadBox: {
    borderWidth: scale(2), borderColor: C.border, borderStyle: 'dashed', borderRadius: scale(12),
    padding: scale(24), alignItems: 'center', justifyContent: 'center', backgroundColor: C.card
  },
  uploadText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8) },
  uploadedBox: { alignItems: 'center' },
  uploadedText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ok, marginTop: scale(8) },
  removeText: { fontSize: moderateScale(13), color: C.danger, marginTop: scale(8) },

  // Confirm
  confirmContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) },
  confirmCard: { backgroundColor: C.card, borderRadius: scale(20), padding: scale(32), alignItems: 'center', width: '100%' },
  confirmIcon: {
    width: scale(80), height: scale(80), borderRadius: scale(20), backgroundColor: C.ok,
    alignItems: 'center', justifyContent: 'center', marginBottom: scale(20)
  },
  confirmTitle: { fontSize: moderateScale(24), fontWeight: '900', color: C.ink, marginBottom: scale(8) },
  confirmText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginBottom: scale(24) },
  confirmBtn: { backgroundColor: C.primary, borderRadius: scale(12), paddingVertical: scale(14), paddingHorizontal: scale(32) },
  confirmBtnText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },

  // Inline order summary + Continue bar -- sits in the normal scroll flow at
  // the end of each step's content (Option 6: "Inline Mini Summary"), never
  // floats over the keyboard, so it needs no keyboard-offset math at all.
  inlineSummary: {
    marginHorizontal: scale(16),
    backgroundColor: C.primary,
    borderRadius: scale(16),
    paddingHorizontal: scale(16), paddingVertical: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.15,
    shadowRadius: scale(10),
    elevation: 4,
  },
  footerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flexShrink: 1, marginRight: scale(10) },
  footerItems: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.85)' },
  footerTotal: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },
  footerBtns: { flexDirection: 'row', gap: scale(10), flexShrink: 0, alignItems: 'center' },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.35)'
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8), flexShrink: 1,
    backgroundColor: '#fff', paddingHorizontal: scale(16), paddingVertical: scale(12), borderRadius: scale(12)
  },
  continueBtnDisabled: { backgroundColor: 'rgba(255,255,255,0.55)' },
  continueBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.primary, flexShrink: 1 },

  // Empty
  emptyBox: { alignItems: 'center', paddingVertical: scale(40) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8), paddingHorizontal: scale(20) },

  // Error
  errorContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(24) },
  errorTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink, marginTop: scale(16) },
  errorText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8), marginBottom: scale(24) },
  errorBtn: { backgroundColor: C.primary, paddingHorizontal: scale(24), paddingVertical: scale(12), borderRadius: scale(12) },
  errorBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24),
    padding: scale(20), maxHeight: SCREEN_HEIGHT * 0.8
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(20) },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  modalCloseBtn: {
    width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center'
  },
  modalBtn: { backgroundColor: C.primary, borderRadius: scale(12), paddingVertical: scale(14), alignItems: 'center', marginTop: scale(20) },
  modalBtnDisabled: { backgroundColor: '#FECACA' },
  modalBtnText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },

  // Calendar
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: scale(8) },
  calendarDay: { width: scale(40), textAlign: 'center', fontSize: moderateScale(13), fontWeight: '700', color: C.muted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarCell: {
    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center',
    marginBottom: scale(4)
  },
  calendarCellActive: { backgroundColor: C.primary, borderRadius: scale(10) },
  calendarCellToday: { borderWidth: scale(2), borderColor: C.primary, borderRadius: scale(10) },
  calendarCellText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  calendarCellTextActive: { color: '#fff' },

  // Custom Date/Time Picker Modal
  dpItemDisabled: { opacity: 0.35 },
  dpItemTextDisabled: { color: C.muted },
  dpAmPmWrap: { flexDirection: 'row', gap: scale(6), marginBottom: scale(8) },

  // Drill-down calendar + tap grids (date & time pickers) -- kept compact
  // on purpose: short rows, small gaps, no decorative preview bar, so the
  // whole dropdown stays close to the size of the button that opens it.
  calNavRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary, borderRadius: scale(9), paddingVertical: scale(5), paddingHorizontal: scale(5), marginBottom: scale(6) },
  calNavBtn: { width: scale(24), height: scale(24), alignItems: 'center', justifyContent: 'center' },
  calNavTitleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(10) },
  calNavTitle: { fontSize: moderateScale(12.5), fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  calWeekRow: { flexDirection: 'row', marginBottom: scale(2) },
  calWeekLabel: { width: '14.28%', textAlign: 'center', fontSize: moderateScale(9.5), fontWeight: '700', color: C.muted },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(6) },
  calCell: { width: '14.28%', height: scale(29), alignItems: 'center', justifyContent: 'center' },
  calCellInner: { width: scale(25), height: scale(25), borderRadius: scale(13), alignItems: 'center', justifyContent: 'center' },
  calCellActive: { backgroundColor: C.primary },
  calCellText: { fontSize: moderateScale(11.5), fontWeight: '600', color: C.ink },
  calCellTextActive: { color: '#FFFFFF', fontWeight: '800' },
  calCellTextDisabled: { color: C.border },
  calGrid3: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(6) },
  calGrid3Cell: { width: '33.33%', padding: scale(2) },
  calGrid4: { flexDirection: 'row', flexWrap: 'wrap' },
  calGrid4Cell: { width: '16.66%', padding: scale(1.5) },
  calGridBtn: { height: scale(25), borderRadius: scale(6), alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  calSectionLabel: { fontSize: moderateScale(9), fontWeight: '700', color: C.muted, letterSpacing: 1, marginBottom: scale(3) },
  dpAmPmBtn: { flex: 1, paddingVertical: scale(7), borderRadius: scale(8), backgroundColor: '#F5F7FA', alignItems: 'center' },
  dpAmPmBtnActive: { backgroundColor: C.primary },
  dpAmPmText: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },
  dpAmPmTextActive: { color: '#FFFFFF' },
  dpPastTimeWarning: { fontSize: moderateScale(11), color: C.danger, textAlign: 'center', marginBottom: scale(8) },
  dpConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: C.primary, borderRadius: scale(9), paddingVertical: scale(9) },
  dpConfirmText: { fontSize: moderateScale(13.5), fontWeight: '700', color: '#FFFFFF' },
});
