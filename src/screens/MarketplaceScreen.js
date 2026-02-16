/**
 * ============================================================================
 * MARKETPLACE SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Image,
  TextInput,
  Modal,
  ScrollView,
  Alert,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// App Theme Color Palette
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
  successLight: '#D1FAE5',
  warning: '#F59E0B',
  shadow: '#64748B',
};

// Category Icons Mapping
const CATEGORY_ICONS = {
  'Kitchen Essentials': 'restaurant-outline',
  'Cooking Ingredients': 'nutrition-outline',
  'Cleaning Supplies': 'sparkles-outline',
  'Packaging Materials': 'cube-outline',
  'default': 'grid-outline',
};

const formatPrice = (price) => {
  return `₹${(price || 0).toLocaleString('en-IN')}`;
};

export default function MarketplaceScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const cartAnimation = useRef(new Animated.Value(1)).current;

  const {
    selectedRestaurant: currentRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [cart, setCart] = useState([]);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animate cart button when items added
  const animateCart = () => {
    Animated.sequence([
      Animated.timing(cartAnimation, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartAnimation, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('restaurantId', selectedRestaurantId);
      if (selectedCategory && selectedCategory !== 'all') {
        params.append('categoryId', selectedCategory);
      }

      const response = await api.get(`/owner/marketplace/products?${params}`);
      if (response.data.ok) {
        setProducts(response.data.data || []);
      }

      try {
        const catRes = await api.get('/public/marketplace-categories');
        if (catRes.data.ok) {
          setCategories(catRes.data.data || []);
        }
      } catch (e) {}
    } catch (error) {
      console.error('Error loading marketplace:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedCategory]);

  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, selectedCategory, loadData]);

  useFocusEffect(
    useCallback(() => {
      if (selectedRestaurantId) {
        loadData();
      }
    }, [selectedRestaurantId, loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  // Cart Functions - Local state only
  const addToCart = (product) => {
    animateCart();
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.product.id === product.id
            ? { ...item, quantity: Math.min(item.quantity + 1, product.stockQuantity || 999) }
            : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateCartQuantity = (productId, delta) => {
    setCart(prev => {
      const item = prev.find(i => i.product.id === productId);
      if (!item) return prev;

      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        return prev.filter(i => i.product.id !== productId);
      }

      return prev.map(i =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(newQty, i.product.stockQuantity || 999) }
          : i
      );
    });
  };

  const getCartTotal = () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const getCartItemQuantity = (productId) => cart.find(i => i.product.id === productId)?.quantity || 0;

  const handlePlaceOrder = async () => {
    if (!selectedRestaurantId) return Alert.alert('Error', 'Please select a restaurant');
    if (cart.length === 0) return Alert.alert('Error', 'Cart is empty');
    if (!deliveryAddress.trim()) return Alert.alert('Error', 'Please enter delivery address');

    const vendorGroups = cart.reduce((groups, item) => {
      const vendorId = item.product.vendor?.id || item.product.vendorId || 'unknown';
      if (!groups[vendorId]) groups[vendorId] = [];
      groups[vendorId].push(item);
      return groups;
    }, {});

    setIsSubmitting(true);
    try {
      const orderPromises = Object.entries(vendorGroups).map(([vendorId, items]) =>
        api.post('/owner/marketplace/orders', {
          restaurantId: selectedRestaurantId,
          vendorId,
          items: items.map(item => ({ productId: item.product.id, qty: item.quantity })),
          deliveryAddress: deliveryAddress.trim(),
          notes: deliveryNotes.trim() || undefined,
        })
      );

      const responses = await Promise.all(orderPromises);
      const allSuccess = responses.every(res => res.data.ok);

      if (allSuccess) {
        Alert.alert('Order Placed!', `${responses.length} order(s) placed successfully`, [
          { text: 'View Orders', onPress: () => navigation.navigate('MarketplaceOrders') },
          { text: 'Continue Shopping' }
        ]);
        setCart([]);
        setOrderModalVisible(false);
        setDeliveryAddress('');
        setDeliveryNotes('');
      } else {
        Alert.alert('Error', 'Some orders failed to place');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to place order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ==================== RENDER COMPONENTS ====================

  const renderProductCard = ({ item, index }) => {
    const cartQty = getCartItemQuantity(item.id);
    const stockQty = item.stockQuantity || 0;
    const inStock = stockQty > 0;
    const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : item.vendor;

    return (
      <View style={[st.productCard, { marginLeft: index % 2 === 0 ? 16 : 8, marginRight: index % 2 === 1 ? 16 : 8 }]}>
        {/* Product Image */}
        <View style={st.productImageContainer}>
          {item.imageUrl || item.image ? (
            <Image source={{ uri: getImageUrl(item.imageUrl || item.image) }} style={st.productImage} />
          ) : (
            <View style={st.productImagePlaceholder}>
              <Icon name="cube-outline" size={scale(32)} color={C.muted} />
            </View>
          )}

          {/* Stock Badge */}
          {!inStock && (
            <View style={st.outOfStockBadge}>
              <Text style={st.outOfStockText}>Out of Stock</Text>
            </View>
          )}
        </View>

        {/* Product Info */}
        <View style={st.productInfo}>
          <Text style={st.productName} numberOfLines={2}>{item.name}</Text>

          {item.unit && (
            <Text style={st.productUnit}>{item.unit}</Text>
          )}

          {vendorName && (
            <View style={st.vendorRow}>
              <Icon name="storefront" size={scale(11)} color={C.success} />
              <Text style={st.vendorName} numberOfLines={1}>{vendorName}</Text>
            </View>
          )}

          <Text style={st.productPrice}>{formatPrice(item.price)}</Text>
        </View>

        {/* Add to Cart Button - Fixed at bottom */}
        <View style={st.cardFooter}>
          {cartQty > 0 ? (
            <View style={st.quantityContainer}>
              <TouchableOpacity
                style={st.qtyBtn}
                onPress={() => updateCartQuantity(item.id, -1)}
              >
                <Icon name="remove" size={scale(16)} color={C.primary} />
              </TouchableOpacity>
              <Text style={st.qtyText}>{cartQty}</Text>
              <TouchableOpacity
                style={[st.qtyBtn, cartQty >= stockQty && st.qtyBtnDisabled]}
                onPress={() => updateCartQuantity(item.id, 1)}
                disabled={cartQty >= stockQty}
              >
                <Icon name="add" size={scale(16)} color={cartQty >= stockQty ? C.muted : C.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[st.addToCartBtn, !inStock && st.addToCartBtnDisabled]}
              onPress={() => addToCart(item)}
              disabled={!inStock}
            >
              <Icon name="add" size={scale(16)} color={inStock ? '#fff' : C.muted} />
              <Text style={[st.addToCartText, !inStock && st.addToCartTextDisabled]}>
                ADD
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={st.emptyState}>
      <View style={st.emptyIconContainer}>
        <Icon name="storefront-outline" size={scale(64)} color={C.muted} />
      </View>
      <Text style={st.emptyTitle}>No Products Found</Text>
      <Text style={st.emptySubtitle}>
        {search ? 'Try a different search term' : 'Products will appear here once vendors add them'}
      </Text>
      {search && (
        <TouchableOpacity style={st.clearSearchBtn} onPress={() => setSearch('')}>
          <Text style={st.clearSearchBtnText}>Clear Search</Text>
        </TouchableOpacity>
      )}
    </View>
  );

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.loadingHero}>
          <Text style={st.heroTitle}>Marketplace</Text>
        </LinearGradient>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading products...</Text>
        </View>
        <KniBottomNav navigation={navigation} active="request" />
      </SafeAreaView>
    );
  }

  // ==================== NO RESTAURANT SELECTED ====================
  if (!selectedRestaurantId) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.loadingHero}>
          <Text style={st.heroTitle}>Marketplace</Text>
        </LinearGradient>
        <View style={st.emptyState}>
          <View style={st.emptyIconContainer}>
            <Icon name="restaurant-outline" size={scale(64)} color={C.muted} />
          </View>
          <Text style={st.emptyTitle}>Select a Restaurant</Text>
          <Text style={st.emptySubtitle}>Please select a restaurant to view available products</Text>
        </View>
        <KniBottomNav navigation={navigation} active="request" />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Fixed Hero Header */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroSection}
      >
        <View style={st.heroContent}>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>Marketplace</Text>
            <Text style={st.heroSubtitle}>
              {currentRestaurant?.name || 'Select Restaurant'}
            </Text>
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity
              style={st.heroIconBtn}
              onPress={() => navigation.navigate('MarketplaceOrders')}
            >
              <Icon name="receipt-outline" size={scale(22)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={st.heroIconBtn}
              onPress={() => setMenuVisible(true)}
            >
              <Icon name="menu-outline" size={scale(22)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={st.searchContainer}>
          <View style={st.searchBar}>
            <Icon name="search" size={scale(20)} color={C.muted} />
            <TextInput
              style={st.searchInput}
              placeholder="Search products..."
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={st.clearBtn}>
                <Icon name="close-circle" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Fixed Categories */}
      <View style={st.categoriesSection}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.categoriesScroll}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[st.categoryChip, selectedCategory === 'all' && st.categoryChipActive]}
            onPress={() => setSelectedCategory('all')}
          >
            <Icon name="apps" size={scale(16)} color={selectedCategory === 'all' ? '#fff' : C.primary} />
            <Text style={[st.categoryChipText, selectedCategory === 'all' && st.categoryChipTextActive]}>
              All ({products.length})
            </Text>
          </TouchableOpacity>

          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            const iconName = CATEGORY_ICONS[cat.name] || CATEGORY_ICONS.default;
            const catCount = products.filter(p => p.category?.id === cat.id).length;

            return (
              <TouchableOpacity
                key={cat.id}
                style={[st.categoryChip, isActive && st.categoryChipActive]}
                onPress={() => setSelectedCategory(cat.id)}
              >
                <Icon name={iconName} size={scale(16)} color={isActive ? '#fff' : C.primary} />
                <Text style={[st.categoryChipText, isActive && st.categoryChipTextActive]}>
                  {cat.name} ({catCount})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Products Header */}
      <View style={st.productsHeader}>
        <Text style={st.productsTitle}>
          {selectedCategory === 'all' ? 'All Products' : categories.find(c => c.id === selectedCategory)?.name || 'Products'}
        </Text>
        <Text style={st.productsCount}>{filteredProducts.length} items</Text>
      </View>

      {/* Scrollable Products List */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProductCard}
        numColumns={2}
        ListEmptyComponent={renderEmptyState}
        contentContainerStyle={st.productsList}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      />

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <Animated.View style={[st.floatingCart, { transform: [{ scale: cartAnimation }] }]}>
          <TouchableOpacity
            style={st.floatingCartBtn}
            onPress={() => setOrderModalVisible(true)}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={[C.gradient1, C.gradient2]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={st.floatingCartGradient}
            >
              <View style={st.floatingCartLeft}>
                <View style={st.cartIconContainer}>
                  <Icon name="cart" size={scale(22)} color="#fff" />
                  <View style={st.cartBadge}>
                    <Text style={st.cartBadgeText}>{cart.length}</Text>
                  </View>
                </View>
                <View>
                  <Text style={st.cartItemsText}>{cart.length} item{cart.length > 1 ? 's' : ''}</Text>
                  <Text style={st.cartTotalText}>{formatPrice(getCartTotal())}</Text>
                </View>
              </View>
              <View style={st.floatingCartRight}>
                <Text style={st.viewCartText}>View Cart</Text>
                <Icon name="arrow-forward" size={scale(18)} color="#fff" />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Order Modal */}
      <Modal visible={orderModalVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContainer}>
            {/* Modal Header */}
            <View style={st.modalHeader}>
              <View>
                <Text style={st.modalTitle}>Your Cart</Text>
                <Text style={st.modalSubtitle}>{cart.length} items</Text>
              </View>
              <TouchableOpacity style={st.modalCloseBtn} onPress={() => setOrderModalVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={st.modalBody}
              contentContainerStyle={st.modalBodyContent}
              showsVerticalScrollIndicator={true}
              bounces={true}
            >
              {/* Cart Items */}
              {cart.map((item, index) => (
                <View key={item.product.id} style={st.cartItem}>
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
                    <Text style={st.cartItemPrice}>{formatPrice(item.product.price)}</Text>
                  </View>
                  <View style={st.cartItemQty}>
                    <TouchableOpacity
                      style={st.cartQtyBtn}
                      onPress={() => updateCartQuantity(item.product.id, -1)}
                    >
                      <Icon name="remove" size={scale(16)} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={st.cartQtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={st.cartQtyBtn}
                      onPress={() => updateCartQuantity(item.product.id, 1)}
                    >
                      <Icon name="add" size={scale(16)} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                  <Text style={st.cartItemTotal}>
                    {formatPrice(item.product.price * item.quantity)}
                  </Text>
                </View>
              ))}

              {/* Delivery Details */}
              <View style={st.deliverySection}>
                <Text style={st.deliverySectionTitle}>Delivery Details</Text>

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
            </ScrollView>

            {/* Modal Footer */}
            <View style={st.modalFooter}>
              <View style={st.totalSection}>
                <Text style={st.totalLabel}>Total Amount</Text>
                <Text style={st.totalAmount}>{formatPrice(getCartTotal())}</Text>
              </View>
              <TouchableOpacity
                style={[st.placeOrderBtn, isSubmitting && st.placeOrderBtnDisabled]}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
              >
                <LinearGradient
                  colors={[C.gradient1, C.gradient2]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={st.placeOrderGradient}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Text style={st.placeOrderText}>Place Order</Text>
                      <Icon name="arrow-forward" size={scale(20)} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="request" cartCount={cart.length} />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero Section
  heroSection: {
    paddingTop: scale(16),
    paddingBottom: scale(24),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: scale(20),
    marginBottom: scale(20),
  },
  heroTextContainer: {},
  heroTitle: {
    fontSize: moderateScale(28),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: moderateScale(14),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(4),
  },
  heroActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  heroIconBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: scale(20),
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: scale(16),
    paddingHorizontal: scale(16),
    height: scale(52),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale(12),
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(12),
    fontSize: moderateScale(16),
    color: C.ink,
  },
  clearBtn: {
    padding: scale(4),
  },

  // Categories - Compact Chips (Fixed)
  categoriesSection: {
    backgroundColor: C.card,
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoriesScroll: {
    paddingHorizontal: scale(16),
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    marginRight: scale(8),
    backgroundColor: C.card,
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.border,
  },
  categoryChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  categoryChipText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
  },
  categoryChipTextActive: {
    color: '#fff',
  },

  // Products Header (Fixed)
  productsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: C.bg,
  },
  productsTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  productsCount: {
    fontSize: moderateScale(13),
    color: C.muted,
  },

  // Products List
  productsList: {
    paddingTop: scale(8),
    paddingBottom: scale(120),
  },

  // Product Card
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: C.card,
    borderRadius: scale(12),
    marginBottom: scale(12),
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 2,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: scale(100),
    backgroundColor: C.bg,
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  productImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  outOfStockBadge: {
    position: 'absolute',
    top: scale(6),
    left: scale(6),
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(4),
  },
  outOfStockText: {
    fontSize: moderateScale(9),
    fontWeight: '600',
    color: '#fff',
  },
  productInfo: {
    padding: scale(10),
    paddingBottom: scale(6),
  },
  productName: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
    lineHeight: moderateScale(18),
    height: scale(36),
  },
  productUnit: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(2),
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(4),
  },
  vendorName: {
    fontSize: moderateScale(10),
    color: C.success,
    fontWeight: '500',
    flex: 1,
  },
  productPrice: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: C.ink,
    marginTop: scale(6),
  },

  // Card Footer with Button
  cardFooter: {
    paddingHorizontal: scale(10),
    paddingBottom: scale(10),
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primaryLight,
    borderRadius: scale(8),
    padding: scale(4),
  },
  qtyBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(6),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: C.bg,
  },
  qtyText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.primary,
    minWidth: scale(30),
    textAlign: 'center',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: scale(8),
    paddingVertical: scale(8),
    gap: scale(4),
  },
  addToCartBtnDisabled: {
    backgroundColor: C.border,
  },
  addToCartText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#fff',
  },
  addToCartTextDisabled: {
    color: C.muted,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
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
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(22),
  },
  clearSearchBtn: {
    marginTop: scale(20),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
    backgroundColor: C.primary,
    borderRadius: scale(12),
  },
  clearSearchBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },

  // Loading State
  loadingHero: {
    paddingVertical: scale(24),
    paddingHorizontal: scale(20),
    borderBottomLeftRadius: scale(24),
    borderBottomRightRadius: scale(24),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: C.muted,
  },

  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: scale(100),
    left: scale(16),
    right: scale(16),
  },
  floatingCartBtn: {
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: scale(8) },
    shadowOpacity: 0.3,
    shadowRadius: scale(16),
    elevation: 8,
  },
  floatingCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: scale(-6),
    right: scale(-6),
    backgroundColor: '#fff',
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.primary,
  },
  cartItemsText: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.8)',
  },
  cartTotalText: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: '#fff',
  },
  floatingCartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  viewCartText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: '85%',
    flex: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginTop: scale(2),
  },
  modalCloseBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  modalBodyContent: {
    padding: scale(20),
    paddingBottom: scale(10),
  },

  // Cart Items in Modal
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(12),
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
    marginBottom: scale(4),
  },
  cartItemPrice: {
    fontSize: moderateScale(12),
    color: C.muted,
  },
  cartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: scale(12),
  },
  cartQtyBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
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

  // Delivery Section
  deliverySection: {
    marginTop: scale(24),
    paddingTop: scale(20),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  deliverySectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(16),
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

  // Modal Footer
  modalFooter: {
    padding: scale(20),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(16),
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
  placeOrderBtn: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  placeOrderBtnDisabled: {
    opacity: 0.7,
  },
  placeOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(16),
    gap: scale(8),
  },
  placeOrderText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#fff',
  },
});
