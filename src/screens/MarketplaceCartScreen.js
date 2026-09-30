/**
 * ============================================================================
 * MARKETPLACE CART SCREEN - Vendor-wise Cart (Full Page)
 * ============================================================================
 * Replaces the old modal flow from MarketplaceScreen.
 * Shows delivery details + vendor-grouped items + per-vendor Pay & Order.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { getImageUrl } from '../api/client';
import AppAlert from '../utils/AppAlert';
import cartService from '../services/marketplaceCartService';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#EF3A3A',
  gradient2: '#DC2626',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  danger: '#EF4444',
};

const formatPrice = (price) => `₹${(price || 0).toLocaleString('en-IN')}`;

function SkeletonCart({ pulse }) {
  return (
    <View style={st.bodyContent}>
      {/* Delivery Details */}
      <View style={st.deliverySection}>
        <Animated.View style={[st.skelLineWide, { width: '50%', height: scale(16), opacity: pulse }]} />
        <Animated.View style={[st.skelLineNarrow, { width: '35%', height: scale(11), marginTop: scale(14), opacity: pulse }]} />
        <Animated.View style={[st.skelTextArea, { opacity: pulse }]} />
        <Animated.View style={[st.skelLineNarrow, { width: '30%', height: scale(11), marginTop: scale(12), opacity: pulse }]} />
        <Animated.View style={[st.skelInput, { opacity: pulse }]} />
      </View>

      {/* Vendor Groups */}
      {Array.from({ length: 2 }).map((_, g) => (
        <View key={g} style={st.vendorCard}>
          {/* Vendor Header */}
          <View style={st.vendorHeader}>
            <View style={st.vendorNameRow}>
              <Animated.View style={[st.skelIconSmall, { opacity: pulse }]} />
              <Animated.View style={[st.skelLineWide, { width: scale(110), height: scale(13), marginBottom: 0, opacity: pulse }]} />
            </View>
            <Animated.View style={[st.skelLineNarrow, { width: scale(40), height: scale(10), opacity: pulse }]} />
          </View>

          {/* Items */}
          {Array.from({ length: 2 }).map((__, i) => (
            <View key={i} style={st.cartItem}>
              <View style={st.cartItemImage}>
                <Animated.View style={[st.skelImageFill, { opacity: pulse }]} />
              </View>
              <View style={st.cartItemInfo}>
                <Animated.View style={[st.skelLineWide, { opacity: pulse }]} />
                <Animated.View style={[st.skelLineNarrow, { opacity: pulse }]} />
              </View>
              <View style={st.cartItemQty}>
                <Animated.View style={[st.qtyBtn, st.skelGray, { opacity: pulse }]} />
                <View style={{ width: scale(28) }} />
                <Animated.View style={[st.qtyBtn, st.skelGray, { opacity: pulse }]} />
              </View>
              <Animated.View style={[st.skelPriceBox, { opacity: pulse }]} />
            </View>
          ))}

          {/* Vendor Subtotal + Pay Button */}
          <View style={st.vendorFooter}>
            <View style={st.subtotalRow}>
              <Animated.View style={[st.skelLineNarrow, { width: scale(60), height: scale(12), opacity: pulse }]} />
              <Animated.View style={[st.skelLineNarrow, { width: scale(70), height: scale(16), opacity: pulse }]} />
            </View>
            <Animated.View style={[st.payOrderBtn, st.skelGray, { height: scale(44), opacity: pulse }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MarketplaceCartScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const keyboardHeight = useKeyboardHeight();
  const { restaurantId } = route.params || {};

  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');

  // Reload cart from AsyncStorage on every focus (handles changes from other screens)
  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [restaurantId])
  );

  const loadCart = async () => {
    if (!restaurantId) return;
    try {
      setLoading(true);
      const items = await cartService.getCart(restaurantId);
      setCart(items || []);
    } catch (error) {
      console.error('Load cart error:', error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const updateCartQuantity = async (productId, delta) => {
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    try {
      if (newQty <= 0) {
        await cartService.removeItem(item.id, restaurantId);
      } else {
        const clamped = Math.min(newQty, item.product.stockQuantity || 999);
        await cartService.updateItemQuantity(item.id, clamped, restaurantId);
      }
      await loadCart();
    } catch (error) {
      AppAlert.alert('Error', error.message || 'Failed to update cart');
      console.error('Update cart error:', error);
    }
  };

  const handleClearCart = () => {
    AppAlert.alert('Clear Cart', 'Remove all items from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          try {
            await cartService.clearCart(restaurantId, { clearAll: true });
            setCart([]);
          } catch (error) {
            AppAlert.alert('Error', error.message || 'Failed to clear cart');
            console.error('Clear cart error:', error);
          }
        },
      },
    ]);
  };

  const getCartTotal = () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Group cart items by vendor
  const getVendorGroups = () => {
    const groups = {};
    cart.forEach(item => {
      const vendorId = item.product.vendor?.id || item.product.vendorId || 'unknown';
      const vendorNameVal = typeof item.product.vendor === 'object' ? item.product.vendor?.name : 'Unknown Vendor';
      const isAdmin = item.product.isAdminStore === true;
      if (!groups[vendorId]) {
        groups[vendorId] = {
          vendorId,
          vendorName: isAdmin ? 'KNI Official Store' : vendorNameVal,
          isAdminStore: isAdmin,
          items: [],
          total: 0,
        };
      }
      groups[vendorId].items.push(item);
      groups[vendorId].total += item.product.price * item.quantity;
    });
    return Object.values(groups);
  };

  const handlePayAndOrder = async (vendorGroup) => {
    if (!restaurantId) return AppAlert.alert('Error', 'Please select a restaurant');
    if (!deliveryAddress.trim()) return AppAlert.alert('Error', 'Please enter delivery address');

    // Re-fetch cart to ensure items are still valid before proceeding to payment
    try {
      const freshCart = await cartService.getCart(restaurantId);
      if (!freshCart || freshCart.length === 0) {
        AppAlert.alert('Cart Empty', 'Your cart appears to be empty. Items may have been removed.');
        loadCart();
        return;
      }
    } catch (err) {
      // If cart validation fails, proceed anyway — server will validate during payment
      console.warn('Cart pre-validation failed, proceeding:', err);
    }

    navigation.navigate('MarketplacePayment', {
      vendorId: vendorGroup.vendorId,
      vendorName: vendorGroup.vendorName,
      isAdminStore: vendorGroup.isAdminStore,
      items: vendorGroup.items.map(item => ({
        product: item.product,
        id: item.product.id,
        productId: item.product.id,
        name: item.product.name,
        price: item.product.price,
        quantity: item.quantity,
      })),
      restaurantId,
      deliveryAddress: deliveryAddress.trim(),
      deliveryNotes: deliveryNotes.trim(),
    });
  };

  const vendorGroups = getVendorGroups();

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.menuBtn}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Your Cart</Text>
            <Text style={st.headerSubtitle}>Loading...</Text>
          </View>
          <View style={st.headerRight}>
            <TouchableOpacity onPress={handleClearCart} style={{ padding: scale(8) }}>
              <Icon name="trash-outline" size={scale(20)} color={C.danger} />
            </TouchableOpacity>
          </View>
        </LinearGradient>
        <SkeletonCart pulse={pulse} />
      </SafeAreaView>
    );
  }

  // Empty state
  if (cart.length === 0) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={[st.menuBtn, { marginRight: scale(10) }]}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <Text style={[st.headerTitle, { flex: 1 }]}>Your Cart</Text>
        </LinearGradient>
        <View style={st.emptyState}>
          <View style={st.emptyIconWrap}>
            <Icon name="cart-outline" size={scale(64)} color={C.muted} />
          </View>
          <Text style={st.emptyTitle}>Your cart is empty</Text>
          <Text style={st.emptyText}>Browse marketplace to add products</Text>
          <TouchableOpacity
            style={st.browseBtn}
            onPress={() => navigation.navigate('Marketplace')}
          >
            <Text style={st.browseBtnText}>Browse Marketplace</Text>
          </TouchableOpacity>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
        <KniBottomNav navigation={navigation} active="request" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.gradient1} />
      {/* Header */}
      <LinearGradient colors={[C.gradient1, C.gradient2]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={st.menuBtn}>
          <Icon name="menu" size={scale(18)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Your Cart</Text>
          <Text style={st.headerSubtitle}>
            {totalItems} item{totalItems !== 1 ? 's' : ''} from {vendorGroups.length} vendor{vendorGroups.length !== 1 ? 's' : ''}
          </Text>
        </View>
        <View style={st.headerRight}>
          <TouchableOpacity onPress={handleClearCart} style={{ padding: scale(8) }}>
            <Icon name="trash-outline" size={scale(20)} color={C.danger} />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Scrollable Content */}
      <ScrollView
        style={st.body}
        contentContainerStyle={[st.bodyContent, keyboardHeight > 0 && { paddingBottom: keyboardHeight }]}
        showsVerticalScrollIndicator={true}
        keyboardShouldPersistTaps="handled"
      >
        {/* Delivery Details */}
        <View style={st.deliverySection}>
          <Text style={st.sectionTitle}>Delivery Details</Text>

          <Text style={st.inputLabel}>Delivery Address *</Text>
          <TextInput
            style={st.textArea}
            placeholder="Enter complete delivery address"
            placeholderTextColor={C.muted}
            value={deliveryAddress}
            onChangeText={setDeliveryAddress}
            multiline
            numberOfLines={3}
          />

          <Text style={st.inputLabel}>Notes (Optional)</Text>
          <TextInput
            style={st.input}
            placeholder="Any special instructions"
            placeholderTextColor={C.muted}
            value={deliveryNotes}
            onChangeText={setDeliveryNotes}
          />
        </View>

        {/* Vendor Groups */}
        {vendorGroups.map((group) => (
          <View key={group.vendorId} style={[st.vendorCard, group.isAdminStore && st.vendorCardAdmin]}>
            {/* Vendor Header */}
            <View style={st.vendorHeader}>
              <View style={st.vendorNameRow}>
                <Icon
                  name={group.isAdminStore ? 'shield-checkmark' : 'storefront'}
                  size={scale(18)}
                  color={group.isAdminStore ? '#2563EB' : C.success}
                />
                <Text style={st.vendorName}>{group.vendorName}</Text>
                {group.isAdminStore && (
                  <View style={st.officialTag}>
                    <Text style={st.officialTagText}>Official</Text>
                  </View>
                )}
              </View>
              <Text style={st.vendorItemCount}>
                {group.items.length} item{group.items.length !== 1 ? 's' : ''}
              </Text>
            </View>

            {/* Items */}
            {group.items.map((item) => (
              <TouchableOpacity
                key={item.product.id}
                style={st.cartItem}
                activeOpacity={0.7}
                onPress={() => navigation.navigate('MarketplaceProduct', {
                  product: item.product,
                  restaurantId,
                })}
              >
                <View style={st.cartItemImage}>
                  {item.product.imageUrl ? (
                    <Image source={{ uri: getImageUrl(item.product.imageUrl) }} style={st.cartItemImg} />
                  ) : (
                    <View style={st.cartItemImgPlaceholder}>
                      <Icon name="cube" size={scale(20)} color={C.muted} />
                    </View>
                  )}
                </View>
                <View style={st.cartItemInfo}>
                  <Text style={st.cartItemName} numberOfLines={2}>{item.product.name}</Text>
                  {item.product.description && (
                    <Text style={st.cartItemDesc} numberOfLines={1}>{item.product.description}</Text>
                  )}
                  <Text style={st.cartItemPrice}>{formatPrice(item.product.price)}</Text>
                  {item.product.deliveryTime && (
                    <View style={st.deliveryTimeRow}>
                      <Icon name="time-outline" size={scale(11)} color={C.muted} />
                      <Text style={st.deliveryTimeText}>{item.product.deliveryTime}</Text>
                    </View>
                  )}
                </View>
                <View style={st.cartItemQty}>
                  <TouchableOpacity
                    style={st.qtyBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      updateCartQuantity(item.product.id, -1);
                    }}
                  >
                    <Icon name="remove" size={scale(16)} color={C.primary} />
                  </TouchableOpacity>
                  <Text style={st.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={st.qtyBtn}
                    onPress={(e) => {
                      e.stopPropagation();
                      updateCartQuantity(item.product.id, 1);
                    }}
                  >
                    <Icon name="add" size={scale(16)} color={C.primary} />
                  </TouchableOpacity>
                </View>
                <Text style={st.cartItemTotal}>
                  {formatPrice(item.product.price * item.quantity)}
                </Text>
              </TouchableOpacity>
            ))}

            {/* Vendor Subtotal + Pay Button */}
            <View style={st.vendorFooter}>
              <View style={st.subtotalRow}>
                <Text style={st.subtotalLabel}>Subtotal</Text>
                <Text style={st.subtotalAmount}>{formatPrice(group.total)}</Text>
              </View>
              <TouchableOpacity
                style={st.payOrderBtn}
                onPress={() => handlePayAndOrder(group)}
              >
                <LinearGradient
                  colors={[C.gradient1, C.gradient2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.payOrderGradient}
                >
                  <Icon name="card" size={scale(18)} color="#fff" />
                  <Text style={st.payOrderText}>Pay & Order</Text>
                  <Icon name="arrow-forward" size={scale(16)} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Footer - Grand Total */}
      <View style={st.footer}>
        <View style={st.totalRow}>
          <Text style={st.totalLabel}>Grand Total</Text>
          <Text style={st.totalAmount}>{formatPrice(getCartTotal())}</Text>
        </View>
      </View>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="request" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlain: { width: scale(26), height: scale(40), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  menuBtn: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Skeleton
  skelLineWide: { height: scale(12), width: '70%', backgroundColor: '#E2E8F0', borderRadius: scale(6), marginBottom: scale(8) },
  skelLineNarrow: { height: scale(10), width: '40%', backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelTextArea: { height: scale(80), backgroundColor: '#E2E8F0', borderRadius: scale(12), marginTop: scale(8) },
  skelInput: { height: scale(48), backgroundColor: '#E2E8F0', borderRadius: scale(12), marginTop: scale(8) },
  skelIconSmall: { width: scale(18), height: scale(18), borderRadius: scale(9), backgroundColor: '#E2E8F0' },
  skelPriceBox: { width: scale(50), height: scale(14), backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelImageFill: { width: '100%', height: '100%', backgroundColor: '#E2E8F0' },
  skelGray: { backgroundColor: '#E2E8F0' },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: scale(32),
  },
  emptyIconWrap: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  browseBtn: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
  },
  browseBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#fff',
  },

  // Body
  body: {
    flex: 1,
  },
  bodyContent: {
    padding: scale(16),
    paddingBottom: scale(120),
  },

  // Delivery Section
  deliverySection: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(12),
  },
  inputLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(8),
    marginTop: scale(12),
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: moderateScale(15),
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: moderateScale(15),
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: scale(80),
    textAlignVertical: 'top',
  },

  // Vendor Group Card
  vendorCard: {
    backgroundColor: C.bg,
    borderRadius: scale(16),
    marginBottom: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
  },
  vendorCardAdmin: {
    borderColor: '#93C5FD',
    backgroundColor: '#F0F7FF',
  },
  vendorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: C.card,
  },
  vendorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flex: 1,
  },
  vendorName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  officialTag: {
    backgroundColor: '#2563EB',
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(4),
  },
  officialTagText: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    color: '#fff',
  },
  vendorItemCount: {
    fontSize: moderateScale(12),
    color: C.muted,
  },

  // Cart Item
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
    paddingHorizontal: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cartItemImage: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: C.bg,
  },
  cartItemImg: {
    width: '100%',
    height: '100%',
  },
  cartItemImgPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartItemInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  cartItemName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    marginBottom: scale(2),
  },
  cartItemDesc: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginBottom: scale(2),
  },
  cartItemPrice: {
    fontSize: moderateScale(12),
    color: C.muted,
  },
  deliveryTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(2),
  },
  deliveryTimeText: {
    fontSize: moderateScale(10),
    color: C.muted,
    fontWeight: '500',
  },
  cartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(8),
  },
  qtyBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    minWidth: scale(28),
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    minWidth: scale(60),
    textAlign: 'right',
  },

  // Vendor Footer
  vendorFooter: {
    padding: scale(14),
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(12),
  },
  subtotalLabel: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
  },
  subtotalAmount: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
  },
  payOrderBtn: {
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  payOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    gap: scale(8),
  },
  payOrderText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Footer
  footer: {
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: moderateScale(16),
    color: C.muted,
  },
  totalAmount: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: C.ink,
  },
});
