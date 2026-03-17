import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, TextInput,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';

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
  { value: '09:00-11:00', label: '9:00 AM - 11:00 AM' },
  { value: '11:00-13:00', label: '11:00 AM - 1:00 PM' },
  { value: '14:00-16:00', label: '2:00 PM - 4:00 PM' },
  { value: '16:00-18:00', label: '4:00 PM - 6:00 PM' },
];

const formatPrice = (amount) => {
  return `₹${(amount || 0).toFixed(2)}`;
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function NewBookingScreen({ navigation, route }) {
  // Global restaurant context
  const {
    restaurants: allRestaurants,
    selectedRestaurant: globalSelectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [cartItems, setCartItems] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTimeSlot, setPreferredTimeSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);

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

  const fetchCartItems = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch cart items
      const cartRes = await api.get('/owner/cart');
      if (cartRes.data.ok && cartRes.data.data) {
        const items = (cartRes.data.data.items || []).map((item) => ({
          id: item.id,
          quantity: item.qty,
          serviceItem: item.serviceItem,
          partItem: item.partItem,
        }));
        setCartItems(items);
      }
    } catch (error) {
      console.log('Error fetching cart:', error);
      Alert.alert('Error', 'Failed to load cart data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchCartItems();
    // Set minimum date to tomorrow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setPreferredDate(tomorrow.toISOString().split('T')[0]);
  }, [fetchCartItems]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    fetchCartItems();
  };

  const calculateTotal = () => {
    return cartItems.reduce((total, item) => {
      const price = item.serviceItem?.price || item.partItem?.price || 0;
      return total + price * item.quantity;
    }, 0);
  };

  const handleSubmit = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }
    if (!preferredDate) {
      Alert.alert('Error', 'Please select a date');
      return;
    }
    if (!preferredTimeSlot) {
      Alert.alert('Error', 'Please select a time slot');
      return;
    }
    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      const [startTime, endTime] = preferredTimeSlot.split('-');
      const slotStartDateTime = new Date(`${preferredDate}T${startTime}:00`).toISOString();
      const slotEndDateTime = new Date(`${preferredDate}T${endTime}:00`).toISOString();

      const response = await api.post('/owner/bookings', {
        restaurantId: selectedRestaurant.id,
        slotStartDateTime,
        slotEndDateTime,
        notes: notes || undefined,
      });

      if (response.data.ok) {
        Alert.alert('Success', 'Booking created successfully', [
          {
            text: 'OK',
            onPress: () => {
              navigation.navigate('PaymentTracking', { bookingId: response.data.data.id });
            },
          },
        ]);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to create booking');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  const getQuickDates = () => {
    const dates = [];
    for (let i = 1; i <= 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: i === 1 ? 'Tomorrow' : i === 2 ? 'In 2 Days' : formatDate(date.toISOString()),
        short: date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      });
    }
    return dates;
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Book Service</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Book Service</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.emptyBox}>
          <Icon name="cart-outline" size={64} color={C.muted} />
          <Text style={st.emptyTitle}>Your Cart is Empty</Text>
          <Text style={st.emptyText}>Add services to your cart before booking</Text>
          <TouchableOpacity style={st.browseBtn} onPress={() => navigation.navigate('Home')}>
            <Icon name="grid-outline" size={18} color="#fff" />
            <Text style={st.browseBtnText}>Browse Services</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Book Service</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
      >
        {/* Restaurant Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Select Restaurant</Text>
          <View style={st.restaurantCard}>
            <View style={st.restaurantIcon}>
              <Icon name="business" size={24} color={C.primary} />
            </View>
            <View style={st.restaurantInfo}>
              <Text style={st.restaurantName}>{selectedRestaurant?.name || 'Select Restaurant'}</Text>
              <Text style={st.restaurantAddress} numberOfLines={1}>
                {selectedRestaurant?.address || 'No address'}
              </Text>
            </View>
            {restaurants.length > 1 && (
              <TouchableOpacity style={st.changeBtn}>
                <Text style={st.changeBtnText}>Change</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Date Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Select Date</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.quickDatesRow}
          >
            {getQuickDates().map((date) => {
              const isSelected = preferredDate === date.value;
              return (
                <TouchableOpacity
                  key={date.value}
                  style={[st.dateChip, isSelected && st.dateChipActive]}
                  onPress={() => setPreferredDate(date.value)}
                >
                  <Text style={[st.dateChipLabel, isSelected && st.dateChipLabelActive]}>
                    {date.label}
                  </Text>
                  <Text style={[st.dateChipShort, isSelected && st.dateChipShortActive]}>
                    {date.short}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={st.dateInputRow}>
            <Icon name="calendar-outline" size={20} color={C.muted} />
            <TextInput
              style={st.dateInput}
              placeholder="Or enter date: YYYY-MM-DD"
              placeholderTextColor={C.muted}
              value={preferredDate}
              onChangeText={setPreferredDate}
            />
          </View>
        </View>

        {/* Time Slot Selection */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Select Time Slot</Text>
          <View style={st.timeSlotsGrid}>
            {TIME_SLOTS.map((slot) => {
              const isSelected = preferredTimeSlot === slot.value;
              return (
                <TouchableOpacity
                  key={slot.value}
                  style={[st.timeSlotCard, isSelected && st.timeSlotCardActive]}
                  onPress={() => setPreferredTimeSlot(slot.value)}
                >
                  <Icon
                    name="time-outline"
                    size={18}
                    color={isSelected ? '#fff' : C.muted}
                  />
                  <Text style={[st.timeSlotText, isSelected && st.timeSlotTextActive]}>
                    {slot.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Notes */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Additional Notes</Text>
          <TextInput
            style={st.notesInput}
            placeholder="Any special instructions or requirements..."
            placeholderTextColor={C.muted}
            multiline
            value={notes}
            onChangeText={setNotes}
          />
        </View>

        {/* Order Summary */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Order Summary</Text>
          <View style={st.summaryCard}>
            {cartItems.map((item) => {
              const itemData = item.serviceItem || item.partItem;
              return (
                <View key={item.id} style={st.summaryRow}>
                  <View style={st.summaryItemInfo}>
                    <Text style={st.summaryItemName} numberOfLines={1}>
                      {itemData?.name || 'Item'}
                    </Text>
                    <Text style={st.summaryItemQty}>x{item.quantity}</Text>
                  </View>
                  <Text style={st.summaryItemPrice}>
                    {formatPrice((itemData?.price || 0) * item.quantity)}
                  </Text>
                </View>
              );
            })}
            <View style={st.summaryDivider} />
            <View style={st.summaryTotalRow}>
              <Text style={st.summaryTotalLabel}>Total</Text>
              <Text style={st.summaryTotalAmount}>{formatPrice(calculateTotal())}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Footer */}
      <View style={st.footer}>
        <View style={st.footerInfo}>
          <Text style={st.footerLabel}>Total Amount</Text>
          <Text style={st.footerAmount}>{formatPrice(calculateTotal())}</Text>
        </View>
        <TouchableOpacity
          style={[st.submitBtn, submitting && st.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Icon name="checkmark-circle" size={20} color="#fff" />
              <Text style={st.submitBtnText}>Confirm Booking</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8), textAlign: 'center' },
  browseBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(20),
    paddingHorizontal: scale(24), paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.primary,
  },
  browseBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },

  scrollContent: { paddingBottom: scale(120) },

  section: { padding: scale(16) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '900', color: C.ink, marginBottom: scale(12) },

  restaurantCard: {
    flexDirection: 'row', alignItems: 'center', padding: scale(16),
    backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1, borderColor: C.border,
  },
  restaurantIcon: {
    width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', marginRight: scale(12),
  },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  restaurantAddress: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },
  changeBtn: { paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(8), backgroundColor: C.bg },
  changeBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: C.primary },

  quickDatesRow: { gap: scale(10), marginBottom: scale(12) },
  dateChip: {
    paddingHorizontal: scale(16), paddingVertical: scale(12), borderRadius: scale(12),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, minWidth: scale(90), alignItems: 'center',
  },
  dateChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  dateChipLabel: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  dateChipLabelActive: { color: '#fff' },
  dateChipShort: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginTop: scale(4) },
  dateChipShortActive: { color: '#fff' },
  dateInputRow: {
    flexDirection: 'row', alignItems: 'center', gap: scale(12), padding: scale(14),
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
  },
  dateInput: { flex: 1, fontSize: moderateScale(14), color: C.text },

  timeSlotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  timeSlotCard: {
    flex: 1, minWidth: '45%', flexDirection: 'row', alignItems: 'center', gap: scale(8),
    padding: scale(14), backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
  },
  timeSlotCardActive: { backgroundColor: C.info, borderColor: C.info },
  timeSlotText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  timeSlotTextActive: { color: '#fff' },

  notesInput: {
    backgroundColor: C.card, borderRadius: scale(12), padding: scale(14),
    fontSize: moderateScale(14), color: C.text, minHeight: scale(100), textAlignVertical: 'top',
    borderWidth: 1, borderColor: C.border,
  },

  summaryCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16),
    borderWidth: 1, borderColor: C.border,
  },
  summaryRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: scale(10),
  },
  summaryItemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  summaryItemName: { fontSize: moderateScale(14), color: C.text, flex: 1 },
  summaryItemQty: { fontSize: moderateScale(13), color: C.muted, marginLeft: scale(8) },
  summaryItemPrice: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: scale(12) },
  summaryTotalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryTotalLabel: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  summaryTotalAmount: { fontSize: moderateScale(20), fontWeight: '900', color: C.primary },

  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', padding: scale(16),
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
  },
  footerInfo: {},
  footerLabel: { fontSize: moderateScale(12), color: C.muted },
  footerAmount: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },
  submitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    paddingHorizontal: scale(24), paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.primary,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },
});
