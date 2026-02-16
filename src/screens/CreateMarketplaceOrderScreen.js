import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const CART_STORAGE_KEY = '@marketplace_cart';

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

export default function CreateMarketplaceOrderScreen({ navigation, route }) {
  const { cartItems = [] } = route.params || {};

  // Global restaurant context
  const {
    restaurants: allRestaurants,
    selectedRestaurant: globalSelectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [submitting, setSubmitting] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [step, setStep] = useState(1); // 1: Select Restaurant, 2: Review & Confirm
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

  const totalAmount = cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const canProceed = () => {
    if (step === 1) return !!selectedRestaurant;
    return true;
  };

  const nextStep = () => {
    if (step < 2) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const handlePlaceOrder = async () => {
    if (!selectedRestaurant) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }

    if (cartItems.length === 0) {
      Alert.alert('Error', 'Your cart is empty');
      return;
    }

    setSubmitting(true);
    try {
      // Group items by vendor
      const itemsByVendor = {};
      cartItems.forEach(item => {
        const vendorId = item.vendorId;
        if (!vendorId) return;
        if (!itemsByVendor[vendorId]) {
          itemsByVendor[vendorId] = [];
        }
        itemsByVendor[vendorId].push(item);
      });

      // Create separate orders for each vendor
      const vendorIds = Object.keys(itemsByVendor);
      if (vendorIds.length === 0) {
        throw new Error('No valid items in cart');
      }

      let lastResponse = null;
      for (const vendorId of vendorIds) {
        const vendorItems = itemsByVendor[vendorId];
        const payload = {
          restaurantId: selectedRestaurant.id,
          vendorId: vendorId,
          items: vendorItems.map(item => ({
            productId: item.productId || item.id,
            qty: item.quantity,
          })),
        };

        lastResponse = await api.post('/owner/marketplace/orders', payload);
        if (!lastResponse.data.ok) {
          throw new Error(lastResponse.data.error || 'Failed to place order');
        }
      }

      const response = lastResponse;

      if (response.data.ok) {
        // Clear the marketplace cart from AsyncStorage
        try {
          await AsyncStorage.removeItem(CART_STORAGE_KEY);
        } catch (e) {
          // Ignore cart clear errors
        }

        Alert.alert(
          'Order Placed!',
          'Your marketplace order has been placed successfully. You can track it in your orders.',
          [
            {
              text: 'View Orders',
              onPress: () => navigation.navigate('MarketplaceOrders'),
            },
            {
              text: 'OK',
              onPress: () => navigation.navigate('Home'),
            },
          ]
        );
      } else {
        throw new Error(response.data.error || 'Failed to place order');
      }
    } catch (error) {
      console.log('Order error:', error);
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (restaurantsLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Order</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  if (cartItems.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Place Order</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cart-outline" size={scale(64)} color={C.muted} />
          <Text style={styles.emptyTitle}>No Items to Order</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <TouchableOpacity
            style={styles.browseBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={styles.browseBtnText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Place Order</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressRow}>
        <View style={styles.progressItem}>
          <View style={[styles.progressDot, step >= 1 && styles.progressDotActive]}>
            {step > 1 ? (
              <Icon name="checkmark" size={scale(12)} color="#fff" />
            ) : (
              <Text style={[styles.progressNum, step >= 1 && styles.progressNumActive]}>1</Text>
            )}
          </View>
          <View style={[styles.progressLine, step > 1 && styles.progressLineActive]} />
        </View>
        <View style={styles.progressItem}>
          <View style={[styles.progressDot, step >= 2 && styles.progressDotActive]}>
            <Text style={[styles.progressNum, step >= 2 && styles.progressNumActive]}>2</Text>
          </View>
        </View>
      </View>
      <View style={styles.progressLabels}>
        <Text style={[styles.progressLabel, step === 1 && styles.progressLabelActive]}>
          Delivery Location
        </Text>
        <Text style={[styles.progressLabel, step === 2 && styles.progressLabelActive]}>
          Review & Confirm
        </Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Step 1: Select Restaurant */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Select Delivery Location</Text>
            <Text style={styles.stepSubtitle}>Choose which restaurant should receive the order</Text>

            {restaurants.length === 0 ? (
              <View style={styles.emptyBox}>
                <Icon name="restaurant-outline" size={scale(48)} color={C.muted} />
                <Text style={styles.emptyBoxText}>No approved restaurants found</Text>
              </View>
            ) : (
              restaurants.map((r) => (
                <TouchableOpacity
                  key={r.id}
                  style={[
                    styles.optionCard,
                    selectedRestaurant?.id === r.id && styles.optionCardActive,
                  ]}
                  onPress={() => setSelectedRestaurant(r)}
                >
                  <View style={styles.optionIcon}>
                    <Icon
                      name="restaurant"
                      size={scale(24)}
                      color={selectedRestaurant?.id === r.id ? C.primary : C.muted}
                    />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{r.name}</Text>
                    {r.address && <Text style={styles.optionSubtitle}>{r.address}</Text>}
                  </View>
                  {selectedRestaurant?.id === r.id && (
                    <Icon name="checkmark-circle" size={scale(24)} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}

            {/* Delivery Notes */}
            <Text style={styles.sectionLabel}>Delivery Notes (Optional)</Text>
            <TextInput
              style={styles.textArea}
              placeholder="Add any special instructions for delivery..."
              placeholderTextColor={C.muted}
              value={deliveryNotes}
              onChangeText={setDeliveryNotes}
              multiline
              numberOfLines={3}
            />
          </View>
        )}

        {/* Step 2: Review & Confirm */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Review Your Order</Text>
            <Text style={styles.stepSubtitle}>Confirm the details before placing order</Text>

            {/* Delivery Info */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Icon name="location" size={scale(20)} color={C.primary} />
                <Text style={styles.summaryHeaderText}>Delivery Location</Text>
              </View>
              <Text style={styles.summaryValue}>{selectedRestaurant?.name}</Text>
              {selectedRestaurant?.address && (
                <Text style={styles.summarySubvalue}>{selectedRestaurant.address}</Text>
              )}
              {deliveryNotes && (
                <View style={styles.notesBox}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesText}>{deliveryNotes}</Text>
                </View>
              )}
            </View>

            {/* Order Items */}
            <View style={styles.summaryCard}>
              <View style={styles.summaryHeader}>
                <Icon name="cart" size={scale(20)} color={C.primary} />
                <Text style={styles.summaryHeaderText}>Order Items ({totalItems})</Text>
              </View>
              {cartItems.map((item, index) => (
                <View key={item.id || index} style={styles.orderItem}>
                  <View style={styles.orderItemInfo}>
                    <Text style={styles.orderItemName}>{item.name}</Text>
                    <Text style={styles.orderItemQty}>Qty: {item.quantity}</Text>
                  </View>
                  <Text style={styles.orderItemPrice}>
                    ₹{(item.price * item.quantity).toFixed(2)}
                  </Text>
                </View>
              ))}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Amount</Text>
                <Text style={styles.totalValue}>₹{totalAmount.toFixed(2)}</Text>
              </View>
            </View>

            {/* Info Note */}
            <View style={styles.infoBox}>
              <Icon name="information-circle" size={scale(20)} color={C.info} />
              <Text style={styles.infoText}>
                Payment will be collected upon delivery or as per your payment terms with the vendor.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: scale(120) }} />
      </ScrollView>

      {/* Bottom Actions */}
      <View style={styles.bottomBar}>
        {step > 1 && (
          <TouchableOpacity style={styles.backButton} onPress={prevStep}>
            <Icon name="arrow-back" size={scale(20)} color={C.ink} />
            <Text style={styles.backButtonText}>Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canProceed() && styles.nextButtonDisabled]}
          onPress={step === 2 ? handlePlaceOrder : nextStep}
          disabled={!canProceed() || submitting}
        >
          {submitting ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Text style={styles.nextButtonText}>
                {step === 2 ? 'Place Order' : 'Continue'}
              </Text>
              {step < 2 && <Icon name="arrow-forward" size={scale(20)} color="#fff" />}
            </>
          )}
        </TouchableOpacity>
      </View>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: scale(32) },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },
  emptyText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8) },
  browseBtn: {
    marginTop: scale(24),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: C.primary,
  },
  browseBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    paddingHorizontal: scale(60),
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: C.primary },
  progressNum: { fontSize: moderateScale(12), fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: {
    width: scale(80),
    height: scale(2),
    backgroundColor: C.border,
    marginHorizontal: scale(8),
  },
  progressLineActive: { backgroundColor: C.primary },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: scale(32),
    marginBottom: scale(8),
  },
  progressLabel: { fontSize: moderateScale(12), color: C.muted, textAlign: 'center' },
  progressLabelActive: { color: C.primary, fontWeight: '600' },

  content: { flex: 1, paddingHorizontal: scale(16) },
  stepContainer: { paddingTop: scale(16) },
  stepTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  stepSubtitle: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(4), marginBottom: scale(20) },

  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 2,
    borderColor: C.border,
  },
  optionCardActive: { borderColor: C.primary, backgroundColor: '#FFF7F7' },
  optionIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  optionInfo: { flex: 1 },
  optionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  optionSubtitle: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },

  emptyBox: { alignItems: 'center', paddingVertical: scale(40) },
  emptyBoxText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  sectionLabel: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink, marginTop: scale(20), marginBottom: scale(12) },
  textArea: {
    backgroundColor: C.card,
    borderRadius: scale(12),
    padding: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    fontSize: moderateScale(14),
    color: C.text,
    minHeight: scale(80),
    textAlignVertical: 'top',
  },

  summaryCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
    paddingBottom: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryHeaderText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  summaryValue: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  summarySubvalue: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(2) },
  notesBox: { marginTop: scale(12), padding: scale(12), backgroundColor: C.bg, borderRadius: scale(8) },
  notesLabel: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  notesText: { fontSize: moderateScale(13), color: C.text, marginTop: scale(4) },

  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  orderItemQty: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  orderItemPrice: { fontSize: moderateScale(14), fontWeight: '700', color: C.text },

  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(12),
    marginTop: scale(4),
  },
  totalLabel: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  totalValue: { fontSize: moderateScale(20), fontWeight: '800', color: C.primary },

  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    backgroundColor: '#EFF6FF',
    borderRadius: scale(12),
    padding: scale(14),
  },
  infoText: { flex: 1, fontSize: moderateScale(13), color: C.info, lineHeight: moderateScale(18) },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    paddingBottom: scale(24),
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.bg,
  },
  backButtonText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  nextButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
  },
  nextButtonDisabled: { backgroundColor: '#FBC6C3' },
  nextButtonText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },
});
