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
              <Icon name="cube-outline" size={32} color={C.muted} />
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
              <Icon name="storefront" size={11} color={C.success} />
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
                <Icon name="remove" size={16} color={C.primary} />
              </TouchableOpacity>
              <Text style={st.qtyText}>{cartQty}</Text>
              <TouchableOpacity
                style={[st.qtyBtn, cartQty >= stockQty && st.qtyBtnDisabled]}
                onPress={() => updateCartQuantity(item.id, 1)}
                disabled={cartQty >= stockQty}
              >
                <Icon name="add" size={16} color={cartQty >= stockQty ? C.muted : C.primary} />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[st.addToCartBtn, !inStock && st.addToCartBtnDisabled]}
              onPress={() => addToCart(item)}
              disabled={!inStock}
            >
              <Icon name="add" size={16} color={inStock ? '#fff' : C.muted} />
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
        <Icon name="storefront-outline" size={64} color={C.muted} />
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
            <Icon name="restaurant-outline" size={64} color={C.muted} />
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
              <Icon name="receipt-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={st.heroIconBtn}
              onPress={() => setMenuVisible(true)}
            >
              <Icon name="menu-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={st.searchContainer}>
          <View style={st.searchBar}>
            <Icon name="search" size={20} color={C.muted} />
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
                <Icon name="close-circle" size={20} color={C.muted} />
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
            <Icon name="apps" size={16} color={selectedCategory === 'all' ? '#fff' : C.primary} />
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
                <Icon name={iconName} size={16} color={isActive ? '#fff' : C.primary} />
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
                  <Icon name="cart" size={22} color="#fff" />
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
                <Icon name="arrow-forward" size={18} color="#fff" />
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
                <Icon name="close" size={24} color={C.ink} />
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
                        <Icon name="cube" size={20} color={C.muted} />
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
                      <Icon name="remove" size={16} color={C.primary} />
                    </TouchableOpacity>
                    <Text style={st.cartQtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={st.cartQtyBtn}
                      onPress={() => updateCartQuantity(item.product.id, 1)}
                    >
                      <Icon name="add" size={16} color={C.primary} />
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
                      <Icon name="arrow-forward" size={20} color="#fff" />
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
    paddingTop: 16,
    paddingBottom: 24,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  heroTextContainer: {},
  heroTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 20,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 52,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: C.ink,
  },
  clearBtn: {
    padding: 4,
  },

  // Categories - Compact Chips (Fixed)
  categoriesSection: {
    backgroundColor: C.card,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoriesScroll: {
    paddingHorizontal: 16,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginRight: 8,
    backgroundColor: C.card,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  categoryChipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  categoryChipText: {
    fontSize: 13,
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: C.bg,
  },
  productsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  productsCount: {
    fontSize: 13,
    color: C.muted,
  },

  // Products List
  productsList: {
    paddingTop: 8,
    paddingBottom: 120,
  },

  // Product Card
  productCard: {
    width: CARD_WIDTH,
    backgroundColor: C.card,
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
    overflow: 'hidden',
  },
  productImageContainer: {
    position: 'relative',
    height: 100,
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
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  outOfStockText: {
    fontSize: 9,
    fontWeight: '600',
    color: '#fff',
  },
  productInfo: {
    padding: 10,
    paddingBottom: 6,
  },
  productName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
    lineHeight: 18,
    height: 36,
  },
  productUnit: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },
  vendorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  vendorName: {
    fontSize: 10,
    color: C.success,
    fontWeight: '500',
    flex: 1,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    marginTop: 6,
  },

  // Card Footer with Button
  cardFooter: {
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primaryLight,
    borderRadius: 8,
    padding: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: {
    backgroundColor: C.bg,
  },
  qtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.primary,
    minWidth: 30,
    textAlign: 'center',
  },
  addToCartBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.primary,
    borderRadius: 8,
    paddingVertical: 8,
    gap: 4,
  },
  addToCartBtnDisabled: {
    backgroundColor: C.border,
  },
  addToCartText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  addToCartTextDisabled: {
    color: C.muted,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  clearSearchBtn: {
    marginTop: 20,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: C.primary,
    borderRadius: 12,
  },
  clearSearchBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },

  // Loading State
  loadingHero: {
    paddingVertical: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: C.muted,
  },

  // Floating Cart
  floatingCart: {
    position: 'absolute',
    bottom: 100,
    left: 16,
    right: 16,
  },
  floatingCartBtn: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  floatingCartGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  floatingCartLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  cartIconContainer: {
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: '#fff',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.primary,
  },
  cartItemsText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  cartTotalText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
  },
  floatingCartRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewCartText: {
    fontSize: 14,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    flex: 0,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: 14,
    color: C.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  modalBodyContent: {
    padding: 20,
    paddingBottom: 10,
  },

  // Cart Items in Modal
  cartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cartItemImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
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
    marginLeft: 12,
  },
  cartItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 4,
  },
  cartItemPrice: {
    fontSize: 12,
    color: C.muted,
  },
  cartItemQty: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 12,
  },
  cartQtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartQtyText: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    minWidth: 28,
    textAlign: 'center',
  },
  cartItemTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    minWidth: 60,
    textAlign: 'right',
  },

  // Delivery Section
  deliverySection: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  deliverySectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.ink,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 80,
    textAlignVertical: 'top',
  },

  // Modal Footer
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  totalLabel: {
    fontSize: 16,
    color: C.muted,
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: C.ink,
  },
  placeOrderBtn: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  placeOrderBtnDisabled: {
    opacity: 0.7,
  },
  placeOrderGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  placeOrderText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
});
