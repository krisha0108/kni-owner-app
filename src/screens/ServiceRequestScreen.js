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
  View, Text, StyleSheet, TouchableOpacity, ScrollView, FlatList,
  TextInput, ActivityIndicator, Modal, Image,
  useWindowDimensions, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import Clipboard from '@react-native-clipboard/clipboard';
import RazorpayCheckout from 'react-native-razorpay';
import { api, uploadFile } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import OfferSelector from '../components/OfferSelector';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
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

export default function ServiceRequestScreen({ navigation, route }) {
  const {
    equipmentId,
    equipmentName,
    categoryId,
    categoryName,
    subCategoryId,
    subCategoryName
  } = route.params || {};

  // Responsive dimensions
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTabletDevice = isTablet(width);
  const containerMaxWidth = getContainerMaxWidth(width);
  const keyboardHeight = useKeyboardHeight();
  // Bottom nav height: bar (74) + wrap padding (12) + extra spacing
  const BOTTOM_NAV_HEIGHT = 100;

  // Restaurant context
  const { selectedRestaurant, selectedRestaurantId } = useRestaurant();

  // Data state
  const [services, setServices] = useState([]);
  const [parts, setParts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState(new Map());
  const [paymentSettings, setPaymentSettings] = useState(null);

  // Flow state
  const [step, setStep] = useState('select'); // select | date | payment | confirm
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [problemDescription, setProblemDescription] = useState('');
  const [tip, setTip] = useState(0);
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  // UI state
  const [menuVisible, setMenuVisible] = useState(false);
  const [dateModalVisible, setDateModalVisible] = useState(false);

  // Custom date picker
  const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const [pickerDay, setPickerDay] = useState(() => new Date().getDate());
  const [pickerMonth, setPickerMonth] = useState(() => new Date().getMonth());
  const [pickerYear, setPickerYear] = useState(() => new Date().getFullYear());
  const dayListRef = useRef(null);
  const monthListRef = useRef(null);

  const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();
  const daysInPickerMonth = getDaysInMonth(pickerMonth, pickerYear);
  const handleMonthChange = (m) => { const mx = getDaysInMonth(m, pickerYear); setPickerMonth(m); if (pickerDay > mx) setPickerDay(mx); };
  const handleYearChange = (y) => { const mx = getDaysInMonth(pickerMonth, y); setPickerYear(y); if (pickerDay > mx) setPickerDay(mx); };

  const openDateModal = () => {
    const d = selectedDate || new Date();
    setPickerDay(d.getDate()); setPickerMonth(d.getMonth()); setPickerYear(d.getFullYear());
    setDateModalVisible(true);
    setTimeout(() => {
      dayListRef.current?.scrollToIndex?.({ index: Math.max(0, d.getDate() - 3), animated: false });
      monthListRef.current?.scrollToIndex?.({ index: Math.max(0, d.getMonth() - 2), animated: false });
    }, 150);
  };
  const confirmDatePicker = () => {
    const d = new Date(pickerYear, pickerMonth, pickerDay); d.setHours(0, 0, 0, 0);
    setSelectedDate(d); setDateModalVisible(false);
  };

  // Custom time picker
  const HOURS_LIST = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const MINS_LIST = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const [timeModalVisible, setTimeModalVisible] = useState(false);
  const [pickerHour, setPickerHour] = useState(9);
  const [pickerMinute, setPickerMinute] = useState(0);
  const [pickerAmPm, setPickerAmPm] = useState('AM');
  const hourListRef = useRef(null);

  const openTimeModal = () => {
    if (selectedSlot) {
      const slot = TIME_SLOTS.find(s => s.id === selectedSlot);
      if (slot) {
        const [h, m] = slot.start.split(':').map(Number);
        setPickerHour(h > 12 ? h - 12 : h === 0 ? 12 : h);
        setPickerMinute(m);
        setPickerAmPm(h >= 12 ? 'PM' : 'AM');
      }
    } else { setPickerHour(9); setPickerMinute(0); setPickerAmPm('AM'); }
    setTimeModalVisible(true);
  };
  const confirmTimePicker = () => {
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

            <View style={{ height: scale(240) }} />
          </ScrollView>
        );

      case 'date':
        return (
          <ScrollView style={st.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scale(40) + keyboardHeight }} keyboardShouldPersistTaps="handled">
            {/* Date Selection */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="calendar-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Select Date</Text>
              </View>
              <TouchableOpacity style={st.datePickerBtn} onPress={openDateModal}>
                <Icon name="calendar" size={20} color={selectedDate ? C.primary : C.muted} />
                <Text style={[st.datePickerText, !selectedDate && { color: C.muted }]}>
                  {selectedDate ? `${selectedDate.getDate()} ${MONTHS_F[selectedDate.getMonth()]} ${selectedDate.getFullYear()}` : 'Tap to select date'}
                </Text>
                <Icon name="chevron-forward" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Time Slot Selection */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="time-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Select Time Slot</Text>
              </View>
              <TouchableOpacity style={st.datePickerBtn} onPress={openTimeModal}>
                <Icon name="time" size={20} color={selectedSlot ? C.primary : C.muted} />
                <Text style={[st.datePickerText, !selectedSlot && { color: C.muted }]}>
                  {selectedSlot
                    ? (selectedSlot === 'custom' ? customSlot?.label : TIME_SLOTS.find(s => s.id === selectedSlot)?.label)
                    : 'Tap to select time'}
                </Text>
                <Icon name="chevron-forward" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Problem Description */}
            <View style={st.section}>
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

            <View style={{ height: scale(240) }} />
          </ScrollView>
        );

      case 'payment':
        return (
          <ScrollView style={st.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Payment Summary */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="receipt-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Payment Summary</Text>
              </View>
              <View style={st.summaryCard}>
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
                <View style={st.summaryRow}>
                  <Text style={st.summaryLabel}>Tip</Text>
                  <Text style={st.summaryValue}>{formatPrice(totals.tip)}</Text>
                </View>
                <View style={[st.summaryRow, st.summaryTotal]}>
                  <Text style={st.totalLabel}>Total Amount</Text>
                  <Text style={st.totalValue}>{formatPrice(totals.total)}</Text>
                </View>

                {/* Promo code */}
                {promoCode ? (
                  <View style={[st.summaryRow, { backgroundColor: C.bg, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 }]}>
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
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                    <TextInput
                      style={[st.textInput, { flex: 1 }]}
                      placeholder="Promo code"
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

            {/* Tip Selection */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="heart-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Add a Tip</Text>
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

            {/* Razorpay Payment */}
            <View style={st.section}>
              <View style={st.sectionHeader}>
                <Icon name="card-outline" size={20} color={C.primary} />
                <Text style={st.sectionTitle}>Payment</Text>
              </View>

              <View style={[st.summaryCard, { alignItems: 'center', paddingVertical: scale(24) }]}>
                <View style={{
                  width: scale(64), height: scale(64), borderRadius: scale(32),
                  backgroundColor: '#DBEAFE', alignItems: 'center', justifyContent: 'center',
                  marginBottom: scale(12),
                }}>
                  <Icon name="shield-checkmark" size={32} color={C.info} />
                </View>
                <Text style={{ fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(4) }}>
                  Secure Payment via Razorpay
                </Text>
                <Text style={{ fontSize: moderateScale(13), color: C.muted, textAlign: 'center', lineHeight: moderateScale(18) }}>
                  Pay using UPI, Credit/Debit Card, NetBanking, or Wallets.{'\n'}Your booking will be confirmed instantly.
                </Text>
              </View>

              <View style={{
                flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
                backgroundColor: '#FEE2E2', borderRadius: scale(12), padding: scale(16), marginTop: scale(12),
              }}>
                <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: '#DC2626' }}>Amount to Pay</Text>
                <Text style={{ fontSize: moderateScale(22), fontWeight: '800', color: '#DC2626' }}>{formatPrice(totals.total)}</Text>
              </View>
            </View>

            <View style={{ height: scale(240) }} />
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

  // Render order summary (sidebar equivalent for mobile)
  const renderOrderSummary = () => {
    if (step === 'confirm') return null;

    const itemCount = selectedItems.size;
    const canContinue = step === 'select' ? itemCount > 0
      : step === 'date' ? selectedDate && selectedSlot
      : step === 'payment' ? true
      : false;

    // Calculate proper bottom position: nav height + safe area + extra gap
    const footerBottom = BOTTOM_NAV_HEIGHT + Math.max(insets.bottom, 10) + 20;

    return (
      <View style={[st.footer, { bottom: footerBottom }]}>
        {/* Mini summary */}
        <View style={st.footerSummary}>
          <View>
            <Text style={st.footerItems}>{itemCount} items selected</Text>
            <Text style={st.footerTotal}>{formatPrice(totals.total)}</Text>
          </View>

          {/* Navigation buttons */}
          <View style={st.footerBtns}>
            {step !== 'select' && (
              <TouchableOpacity
                style={st.backBtn}
                onPress={() => setStep(step === 'date' ? 'select' : step === 'payment' ? 'date' : step)}
              >
                <Icon name="arrow-back" size={20} color={C.ink} />
              </TouchableOpacity>
            )}

            {step === 'select' && (
              <TouchableOpacity
                style={[st.continueBtn, !canContinue && st.continueBtnDisabled]}
                disabled={!canContinue}
                onPress={() => setStep('date')}
              >
                <Text style={st.continueBtnText}>Continue</Text>
                <Icon name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {step === 'date' && (
              <TouchableOpacity
                style={[st.continueBtn, !canContinue && st.continueBtnDisabled]}
                disabled={!canContinue}
                onPress={() => setStep('payment')}
              >
                <Text style={st.continueBtnText}>Continue to Payment</Text>
                <Icon name="arrow-forward" size={18} color="#fff" />
              </TouchableOpacity>
            )}

            {step === 'payment' && (
              <TouchableOpacity
                style={[st.continueBtn, isSubmitting && st.continueBtnDisabled]}
                disabled={isSubmitting}
                onPress={handleRazorpayPayment}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Icon name="card" size={18} color="#fff" />
                    <Text style={st.continueBtnText}>Pay with Razorpay</Text>
                  </>
                )}
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
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Request Service</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.errorContainer}>
          <Icon name="alert-circle-outline" size={64} color={C.muted} />
          <Text style={st.errorTitle}>Invalid Request</Text>
          <Text style={st.errorText}>
            Please select equipment from My Equipment to request service.
          </Text>
          <TouchableOpacity
            style={st.errorBtn}
            onPress={() => navigation.navigate('MyEquipment')}
          >
            <Text style={st.errorBtnText}>Go to My Equipment</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.headerBackBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Request Service</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

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
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        renderStepContent()
      )}

      {/* Footer */}
      {renderOrderSummary()}

      {/* Custom Date Picker Modal */}
      <Modal visible={dateModalVisible} transparent animationType="slide" onRequestClose={() => setDateModalVisible(false)}>
        <View style={st.dpBackdrop}>
          <View style={st.dpSheet}>
            <View style={st.dpHeader}>
              <TouchableOpacity onPress={() => setDateModalVisible(false)}><Text style={st.dpCancel}>Cancel</Text></TouchableOpacity>
              <Text style={st.dpTitle}>Select Date</Text>
              <TouchableOpacity onPress={confirmDatePicker}><Text style={st.dpDone}>Done</Text></TouchableOpacity>
            </View>
            <View style={st.dpPreview}><Text style={st.dpPreviewText}>{pickerDay} {MONTHS_F[pickerMonth]} {pickerYear}</Text></View>
            <View style={st.dpColumns}>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>DAY</Text>
                <FlatList ref={dayListRef} data={Array.from({ length: daysInPickerMonth }, (_, i) => i + 1)} keyExtractor={i => String(i)} style={st.dpScroll} showsVerticalScrollIndicator={false} getItemLayout={(_, i) => ({ length: scale(42), offset: scale(42) * i, index: i })} onScrollToIndexFailed={() => {}} renderItem={({ item: d }) => (
                  <TouchableOpacity style={[st.dpItem, pickerDay === d && st.dpItemActive]} onPress={() => setPickerDay(d)}><Text style={[st.dpItemText, pickerDay === d && st.dpItemTextActive]}>{d}</Text></TouchableOpacity>
                )} />
              </View>
              <View style={[st.dpCol, { flex: 1.3 }]}>
                <Text style={st.dpColLabel}>MONTH</Text>
                <FlatList ref={monthListRef} data={MONTHS_S} keyExtractor={i => i} style={st.dpScroll} showsVerticalScrollIndicator={false} getItemLayout={(_, i) => ({ length: scale(42), offset: scale(42) * i, index: i })} onScrollToIndexFailed={() => {}} renderItem={({ item: m, index: i }) => (
                  <TouchableOpacity style={[st.dpItem, pickerMonth === i && st.dpItemActive]} onPress={() => handleMonthChange(i)}><Text style={[st.dpItemText, pickerMonth === i && st.dpItemTextActive]}>{m}</Text></TouchableOpacity>
                )} />
              </View>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>YEAR</Text>
                <View style={st.dpYearStepper}>
                  <TouchableOpacity style={st.dpYearBtn} onPress={() => handleYearChange(pickerYear + 1)}><Icon name="chevron-up" size={scale(24)} color={C.ink} /></TouchableOpacity>
                  <View style={st.dpYearValue}><Text style={st.dpYearText}>{pickerYear}</Text></View>
                  <TouchableOpacity style={st.dpYearBtn} onPress={() => handleYearChange(pickerYear - 1)}><Icon name="chevron-down" size={scale(24)} color={C.ink} /></TouchableOpacity>
                </View>
              </View>
            </View>
            <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmDatePicker}><Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" /><Text style={st.dpConfirmText}>Confirm Date</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Time Picker Modal */}
      <Modal visible={timeModalVisible} transparent animationType="slide" onRequestClose={() => setTimeModalVisible(false)}>
        <View style={st.dpBackdrop}>
          <View style={st.dpSheet}>
            <View style={st.dpHeader}>
              <TouchableOpacity onPress={() => setTimeModalVisible(false)}><Text style={st.dpCancel}>Cancel</Text></TouchableOpacity>
              <Text style={st.dpTitle}>Select Time</Text>
              <TouchableOpacity onPress={confirmTimePicker}><Text style={st.dpDone}>Done</Text></TouchableOpacity>
            </View>
            <View style={st.dpPreview}><Text style={st.dpPreviewText}>{String(pickerHour).padStart(2, '0')}:{String(pickerMinute).padStart(2, '0')} {pickerAmPm}</Text></View>
            <View style={st.dpColumns}>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>HOUR</Text>
                <FlatList ref={hourListRef} data={HOURS_LIST} keyExtractor={i => String(i)} style={st.dpScroll} showsVerticalScrollIndicator={false} getItemLayout={(_, i) => ({ length: scale(42), offset: scale(42) * i, index: i })} onScrollToIndexFailed={() => {}} renderItem={({ item: h }) => (
                  <TouchableOpacity style={[st.dpItem, pickerHour === h && st.dpItemActive]} onPress={() => setPickerHour(h)}><Text style={[st.dpItemText, pickerHour === h && st.dpItemTextActive]}>{String(h).padStart(2, '0')}</Text></TouchableOpacity>
                )} />
              </View>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>MINUTE</Text>
                <FlatList data={MINS_LIST} keyExtractor={i => String(i)} style={st.dpScroll} showsVerticalScrollIndicator={false} getItemLayout={(_, i) => ({ length: scale(42), offset: scale(42) * i, index: i })} onScrollToIndexFailed={() => {}} renderItem={({ item: m }) => (
                  <TouchableOpacity style={[st.dpItem, pickerMinute === m && st.dpItemActive]} onPress={() => setPickerMinute(m)}><Text style={[st.dpItemText, pickerMinute === m && st.dpItemTextActive]}>{String(m).padStart(2, '0')}</Text></TouchableOpacity>
                )} />
              </View>
              <View style={st.dpCol}>
                <Text style={st.dpColLabel}>AM/PM</Text>
                <View style={st.dpAmPmWrap}>
                  {['AM', 'PM'].map(v => (
                    <TouchableOpacity key={v} style={[st.dpAmPmBtn, pickerAmPm === v && st.dpAmPmBtnActive]} onPress={() => setPickerAmPm(v)}>
                      <Text style={[st.dpAmPmText, pickerAmPm === v && st.dpAmPmTextActive]}>{v}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
            <TouchableOpacity style={st.dpConfirmBtn} onPress={confirmTimePicker}><Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" /><Text style={st.dpConfirmText}>Confirm Time</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  headerBackBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center'
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },

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
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12) },
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
  summaryCard: { backgroundColor: C.card, borderRadius: scale(12), padding: scale(16), borderWidth: 1, borderColor: C.border },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  summaryLabel: { fontSize: moderateScale(14), color: C.muted },
  summaryValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  summaryTotal: { borderTopWidth: 1, borderTopColor: C.border, paddingTop: scale(12), marginTop: scale(8) },
  totalLabel: { fontSize: moderateScale(16), fontWeight: '800', color: C.ink },
  totalValue: { fontSize: moderateScale(18), fontWeight: '800', color: C.primary },
  textInput: {
    backgroundColor: C.bg, borderRadius: scale(10), borderWidth: 1, borderColor: C.border,
    paddingHorizontal: scale(12), paddingVertical: scale(10), fontSize: moderateScale(14), color: C.text,
  },
  applyBtn: {
    backgroundColor: C.primary, borderRadius: scale(10), paddingHorizontal: scale(16),
    alignItems: 'center', justifyContent: 'center',
  },
  applyBtnText: { color: '#fff', fontWeight: '700', fontSize: moderateScale(13) },

  // Tip
  tipRow: { flexDirection: 'row', gap: scale(12) },
  tipBtn: {
    flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.card,
    borderWidth: 1, borderColor: C.border, alignItems: 'center'
  },
  tipBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  tipText: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
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

  // Footer
  footer: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: C.card,
    borderTopWidth: 1, borderTopColor: C.border,
    borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20),
    paddingHorizontal: scale(16), paddingVertical: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale(12),
    elevation: 10,
  },
  footerSummary: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerItems: { fontSize: moderateScale(12), color: C.muted },
  footerTotal: { fontSize: moderateScale(18), fontWeight: '800', color: C.primary },
  footerBtns: { flexDirection: 'row', gap: scale(10) },
  backBtn: {
    width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    backgroundColor: C.primary, paddingHorizontal: scale(20), paddingVertical: scale(12), borderRadius: scale(12)
  },
  continueBtnDisabled: { backgroundColor: '#FECACA' },
  continueBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

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
  dpBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  dpSheet: { backgroundColor: '#fff', borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), paddingHorizontal: scale(20), paddingTop: scale(16), paddingBottom: scale(30) },
  dpHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: scale(12), borderBottomWidth: 1, borderBottomColor: C.border, marginBottom: scale(12) },
  dpCancel: { fontSize: moderateScale(14), color: C.muted, fontWeight: '600' },
  dpTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  dpDone: { fontSize: moderateScale(14), color: C.primary, fontWeight: '700' },
  dpPreview: { backgroundColor: C.ink, borderRadius: scale(12), paddingVertical: scale(14), paddingHorizontal: scale(20), alignItems: 'center', marginBottom: scale(16) },
  dpPreviewText: { fontSize: moderateScale(18), fontWeight: '700', color: '#FFFFFF' },
  dpColumns: { flexDirection: 'row', gap: scale(8), marginBottom: scale(16) },
  dpCol: { flex: 1 },
  dpColLabel: { fontSize: moderateScale(11), fontWeight: '700', color: C.muted, textAlign: 'center', letterSpacing: 1, marginBottom: scale(8) },
  dpScroll: { maxHeight: scale(200) },
  dpItem: { height: scale(38), paddingHorizontal: scale(6), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center', marginBottom: scale(4) },
  dpItemActive: { backgroundColor: C.primary },
  dpItemText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  dpItemTextActive: { color: '#FFFFFF', fontWeight: '700' },
  dpYearStepper: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dpYearBtn: { width: scale(52), height: scale(44), borderRadius: scale(10), backgroundColor: '#F5F7FA', alignItems: 'center', justifyContent: 'center', marginVertical: scale(6) },
  dpYearValue: { backgroundColor: C.primary, borderRadius: scale(12), paddingVertical: scale(16), paddingHorizontal: scale(14), alignItems: 'center' },
  dpYearText: { fontSize: moderateScale(20), fontWeight: '800', color: '#FFFFFF' },
  dpAmPmWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: scale(10) },
  dpAmPmBtn: { width: '100%', paddingVertical: scale(18), borderRadius: scale(12), backgroundColor: '#F5F7FA', alignItems: 'center' },
  dpAmPmBtnActive: { backgroundColor: C.primary },
  dpAmPmText: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  dpAmPmTextActive: { color: '#FFFFFF' },
  dpConfirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8), backgroundColor: C.primary, borderRadius: scale(12), paddingVertical: scale(14) },
  dpConfirmText: { fontSize: moderateScale(15), fontWeight: '700', color: '#FFFFFF' },
});
