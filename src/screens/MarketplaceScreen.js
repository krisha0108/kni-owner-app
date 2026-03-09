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
import cartService from '../services/marketplaceCartService';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
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
  const { can } = usePermissions();

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
  const [menuVisible, setMenuVisible] = useState(false);

  // Animate cart button when items added
  const animateCart = () => {
    Animated.sequence([
      Animated.timing(cartAnimation, { toValue: 1.2, duration: 150, useNativeDriver: true }),
      Animated.timing(cartAnimation, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
  };

  // ========== CART MANAGEMENT (Server-Side) ==========
  const cartLoadedRef = useRef(false);

  // Load cart from server when restaurant changes
  const loadCart = useCallback(async () => {
    if (!selectedRestaurantId) return;
    try {
      const items = await cartService.getCart(selectedRestaurantId);
      setCart(items || []);
      cartLoadedRef.current = true;
    } catch (error) {
      console.error('Load cart error:', error);
      setCart([]);
      cartLoadedRef.current = true;
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  const loadData = useCallback(async (showLoader = true) => {
    if (!selectedRestaurantId) return;

    try {
      if (showLoader) setLoading(true);
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
      if (!selectedRestaurantId) return;

      // Background refresh products - no loading spinner
      loadData(false);

      // Reload cart from server
      loadCart();
    }, [selectedRestaurantId, loadData, loadCart])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
    await loadCart();
  };

  // Cart Functions - Server-side API
  const addToCart = async (product) => {
    if (!selectedRestaurantId) return;
    animateCart();
    try {
      const existing = cart.find(item => item.product.id === product.id);
      const newQuantity = existing 
        ? Math.min(existing.quantity + 1, product.stockQuantity || 999)
        : 1;
      
      const items = await cartService.addItem(selectedRestaurantId, product.id, newQuantity);
      setCart(items || []);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add to cart');
      console.error('Add to cart error:', error);
    }
  };

  const updateCartQuantity = async (productId, delta) => {
    if (!selectedRestaurantId) return;
    const item = cart.find(i => i.product.id === productId);
    if (!item) return;

    const newQty = item.quantity + delta;

    try {
      if (newQty <= 0) {
        await cartService.removeItem(item.id);
      } else {
        const clamped = Math.min(newQty, item.product.stockQuantity || 999);
        await cartService.updateItemQuantity(item.id, clamped);
      }
      await loadCart();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update cart');
      console.error('Update cart error:', error);
    }
  };

  const getCartTotal = () => cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  const getCartItemQuantity = (productId) => cart.find(i => i.product.id === productId)?.quantity || 0;

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase())
  );

  // ==================== RENDER COMPONENTS ====================

  // Group cart items by vendor for the order modal
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


  const renderProductCard = ({ item, index }) => {
    const cartQty = getCartItemQuantity(item.id);
    const stockQty = item.stockQuantity || 0;
    const inStock = stockQty > 0;
    const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : item.vendor;
    const isAdmin = item.isAdminStore === true;

    return (
      <View style={[st.productCard, isAdmin && st.adminProductCard, { marginLeft: index % 2 === 0 ? 16 : 8, marginRight: index % 2 === 1 ? 16 : 8 }]}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('MarketplaceProduct', { product: item, restaurantId: selectedRestaurantId })}
        >
          {/* Product Image */}
          <View style={st.productImageContainer}>
            {item.imageUrl || item.image ? (
              <Image source={{ uri: getImageUrl(item.imageUrl || item.image) }} style={st.productImage} />
            ) : (
              <View style={st.productImagePlaceholder}>
                <Icon name="cube-outline" size={scale(32)} color={C.muted} />
              </View>
            )}

            {/* KNI Official Badge */}
            {isAdmin && (
              <View style={st.kniBadge}>
                <Icon name="shield-checkmark" size={scale(10)} color="#fff" />
                <Text style={st.kniBadgeText}>KNI Official</Text>
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
                <Icon name={isAdmin ? 'shield-checkmark' : 'storefront'} size={scale(11)} color={isAdmin ? '#2563EB' : C.success} />
                <Text style={[st.vendorName, isAdmin && st.adminVendorName]} numberOfLines={1}>{vendorName}</Text>
              </View>
            )}

            {item.description && (
              <Text style={st.productDescription} numberOfLines={1}>{item.description}</Text>
            )}

            <Text style={st.productPrice}>{formatPrice(item.price)}</Text>
          </View>
        </TouchableOpacity>

        {/* Add to Cart Button - Fixed at bottom */}
        {can('marketplace:create') && (
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
        )}
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

  // ==================== FLOATING CART COMPONENT (reusable) ====================
  const renderFloatingCart = () => {
    if (cart.length === 0) return null;
    return (
      <Animated.View style={[st.floatingCart, { transform: [{ scale: cartAnimation }] }]}>
        {/* Mini item preview strip */}
        <View style={st.cartPreviewStrip}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.cartPreviewScroll}>
            {cart.map((item) => (
              <View key={item.product.id} style={st.cartPreviewItem}>
                {item.product.imageUrl ? (
                  <Image source={{ uri: getImageUrl(item.product.imageUrl) }} style={st.cartPreviewImg} />
                ) : (
                  <View style={[st.cartPreviewImg, st.cartPreviewImgPlaceholder]}>
                    <Icon name="cube" size={scale(12)} color={C.muted} />
                  </View>
                )}
                <View style={st.cartPreviewQtyBadge}>
                  <Text style={st.cartPreviewQtyText}>{item.quantity}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
          <Text style={st.cartPreviewVendorText}>
            {getVendorGroups().length} vendor{getVendorGroups().length !== 1 ? 's' : ''}
          </Text>
        </View>

        {/* Main cart button */}
        <TouchableOpacity
          style={st.floatingCartBtn}
          onPress={() => navigation.navigate('MarketplaceCart', {
            restaurantId: selectedRestaurantId,
            cart: cart,
          })}
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
    );
  };

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
        {renderFloatingCart()}
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
              onPress={() => navigation.navigate('MarketplaceCart', {
                restaurantId: selectedRestaurantId,
                cart: cart,
              })}
            >
              <Icon name="cart-outline" size={scale(22)} color="#fff" />
              {cart.length > 0 && (
                <View style={st.heroCartBadge}>
                  <Text style={st.heroCartBadgeText}>{cart.length}</Text>
                </View>
              )}
            </TouchableOpacity>
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

      {/* Floating Cart Button with Item Preview */}
      {renderFloatingCart()}


      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="request" cartCount={cart.length} />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg, paddingBottom: scale(100) },

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
  adminProductCard: {
    borderWidth: 1.5,
    borderColor: '#93C5FD',
  },
  kniBadge: {
    position: 'absolute',
    top: scale(6),
    right: scale(6),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(3),
    backgroundColor: '#2563EB',
    paddingHorizontal: scale(6),
    paddingVertical: scale(3),
    borderRadius: scale(4),
  },
  kniBadgeText: {
    fontSize: moderateScale(8),
    fontWeight: '700',
    color: '#fff',
  },
  adminVendorName: {
    color: '#2563EB',
    fontWeight: '600',
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
  cartPreviewStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.card,
    borderRadius: scale(14),
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
    paddingHorizontal: scale(12),
    paddingVertical: scale(8),
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: C.border,
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(-2) },
    shadowOpacity: 0.08,
    shadowRadius: scale(4),
    elevation: 4,
  },
  cartPreviewScroll: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    flex: 1,
    marginRight: scale(8),
  },
  cartPreviewItem: {
    position: 'relative',
  },
  cartPreviewImg: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(8),
    backgroundColor: C.bg,
  },
  cartPreviewImgPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartPreviewQtyBadge: {
    position: 'absolute',
    top: scale(-4),
    right: scale(-4),
    backgroundColor: C.primary,
    borderRadius: scale(8),
    minWidth: scale(16),
    height: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(3),
  },
  cartPreviewQtyText: {
    fontSize: moderateScale(9),
    fontWeight: '700',
    color: '#fff',
  },
  cartPreviewVendorText: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
  },
  floatingCartBtn: {
    borderRadius: scale(16),
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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

  // Hero Cart Badge
  heroCartBadge: {
    position: 'absolute',
    top: scale(-4),
    right: scale(-4),
    backgroundColor: '#fff',
    borderRadius: scale(10),
    minWidth: scale(20),
    height: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCartBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.primary,
  },

  // Product Description
  productDescription: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(2),
  },
});
