import React, { useState, useCallback, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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

export default function RequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  // Global restaurant context
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

  // Cart state
  const [cart, setCart] = useState([]);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      // Fetch marketplace categories
      try {
        const catRes = await api.get('/public/marketplace-categories');
        if (catRes.data.ok) {
          setCategories(catRes.data.data || []);
        }
      } catch (e) {
        // Ignore category fetch errors
      }
    } catch (error) {
      console.error('Error loading marketplace:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedCategory]);

  // Load data when restaurant or category changes
  useEffect(() => {
    if (selectedRestaurantId) {
      // Clear cart when restaurant changes
      setCart([]);
      loadData();
    }
  }, [selectedRestaurantId, selectedCategory, loadData]);

  // Reload on focus
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
    loadData();
  };

  // Cart functions
  const addToCart = (product) => {
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
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: Math.min(newQty, item.product.stockQuantity || 999) };
          }
          return item;
        })
        .filter(Boolean);
    });
  };

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  };

  const getCartItemQuantity = (productId) => {
    const item = cart.find(i => i.product.id === productId);
    return item?.quantity || 0;
  };

  const handlePlaceOrder = async () => {
    if (!selectedRestaurantId) {
      Alert.alert('Error', 'Please select a restaurant');
      return;
    }
    if (cart.length === 0) {
      Alert.alert('Error', 'Cart is empty');
      return;
    }
    if (!deliveryAddress.trim()) {
      Alert.alert('Error', 'Please enter delivery address');
      return;
    }

    // Group cart items by vendor
    const vendorGroups = cart.reduce((groups, item) => {
      const vendorId = item.product.vendor?.id || item.product.vendorId || 'unknown';
      if (!groups[vendorId]) {
        groups[vendorId] = [];
      }
      groups[vendorId].push(item);
      return groups;
    }, {});

    setIsSubmitting(true);
    try {
      const orderPromises = Object.entries(vendorGroups).map(([vendorId, items]) =>
        api.post('/owner/marketplace/orders', {
          restaurantId: selectedRestaurantId,
          vendorId,
          items: items.map(item => ({
            productId: item.product.id,
            qty: item.quantity,
          })),
          deliveryAddress: deliveryAddress.trim(),
          notes: deliveryNotes.trim() || undefined,
        })
      );

      const responses = await Promise.all(orderPromises);
      const allSuccess = responses.every(res => res.data.ok);

      if (allSuccess) {
        Alert.alert('Success', `${responses.length} order(s) placed successfully`);
        setCart([]);
        setOrderModalVisible(false);
        setDeliveryAddress('');
        setDeliveryNotes('');
      } else {
        const failedCount = responses.filter(r => !r.data.ok).length;
        Alert.alert('Error', `${failedCount} order(s) failed to place`);
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

  const renderProductCard = ({ item }) => {
    const cartQty = getCartItemQuantity(item.id);
    const stockQty = item.stockQuantity || 0;
    const inStock = stockQty > 0;
    const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : item.vendor;
    const categoryName = typeof item.category === 'object' ? item.category?.name : item.category;

    return (
      <View style={styles.card}>
        {item.imageUrl || item.image ? (
          <Image source={{ uri: item.imageUrl || item.image }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.noImage]}>
            <Icon name="cube-outline" size={32} color={C.muted} />
          </View>
        )}
        <View style={styles.cardContent}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>

          {categoryName && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{categoryName}</Text>
            </View>
          )}

          {item.description && (
            <Text style={styles.productDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {vendorName && (
            <View style={styles.vendorRow}>
              <Icon name="storefront-outline" size={12} color={C.muted} />
              <Text style={styles.vendorText}>{vendorName}</Text>
            </View>
          )}

          <Text style={styles.stockText}>Stock: {stockQty}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.productPrice}>₹{item.price}</Text>

            {cartQty > 0 ? (
              <View style={styles.qtyControls}>
                <TouchableOpacity
                  style={styles.qtyBtn}
                  onPress={() => updateCartQuantity(item.id, -1)}
                >
                  <Icon name="remove" size={16} color={C.primary} />
                </TouchableOpacity>
                <Text style={styles.qtyText}>{cartQty}</Text>
                <TouchableOpacity
                  style={[styles.qtyBtn, cartQty >= stockQty && styles.qtyBtnDisabled]}
                  onPress={() => updateCartQuantity(item.id, 1)}
                  disabled={cartQty >= stockQty}
                >
                  <Icon name="add" size={16} color={cartQty >= stockQty ? C.muted : C.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.addBtn, !inStock && styles.addBtnDisabled]}
                onPress={() => addToCart(item)}
                disabled={!inStock}
              >
                <Text style={[styles.addBtnText, !inStock && styles.addBtnTextDisabled]}>
                  {inStock ? 'Add' : 'Out of Stock'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Marketplace</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <TouchableOpacity
              style={styles.cartBtn}
              onPress={() => navigation.navigate('MarketplaceOrders')}
            >
              <Icon name="receipt-outline" size={24} color={C.ink} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
              <Icon name="menu" size={22} color="#1D2254" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
        <KniBottomNav navigation={navigation} active="request" cartCount={cart.length} notifCount={0} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Marketplace</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            style={styles.cartBtn}
            onPress={() => cart.length > 0 ? setOrderModalVisible(true) : navigation.navigate('MarketplaceOrders')}
          >
            <Icon name={cart.length > 0 ? "cart-outline" : "receipt-outline"} size={24} color={C.ink} />
            {cart.length > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{cart.length}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Cart Summary Bar */}
      {cart.length > 0 && (
        <TouchableOpacity style={styles.cartBar} onPress={() => setOrderModalVisible(true)}>
          <View style={styles.cartBarLeft}>
            <Icon name="cart" size={20} color="#fff" />
            <Text style={styles.cartBarItems}>{cart.length} item(s)</Text>
          </View>
          <View style={styles.cartBarRight}>
            <Text style={styles.cartBarTotal}>₹{getCartTotal()}</Text>
            <Icon name="chevron-forward" size={18} color="#fff" />
          </View>
        </TouchableOpacity>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconBox}>
            <Icon name="search" size={18} color={C.primary} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={styles.clearSearchBtn}>
              <View style={styles.clearSearchIcon}>
                <Icon name="close" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Category Filter */}
      {categories.length > 0 && (
        <View style={styles.filterSection}>
          <View style={styles.filterHeader}>
            <Icon name="grid" size={14} color={C.primary} />
            <Text style={styles.filterLabel}>Categories</Text>
            {selectedCategory !== 'all' && (
              <TouchableOpacity
                style={styles.clearFilterBtn}
                onPress={() => setSelectedCategory('all')}
              >
                <Icon name="close-circle" size={16} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScrollContent}
          >
            <TouchableOpacity
              style={[styles.categoryChip, selectedCategory === 'all' && styles.categoryChipActive]}
              onPress={() => setSelectedCategory('all')}
            >
              <View style={[styles.categoryIconBox, selectedCategory === 'all' && styles.categoryIconBoxActive]}>
                <Icon name="apps" size={14} color={selectedCategory === 'all' ? '#fff' : C.primary} />
              </View>
              <Text style={[styles.categoryText, selectedCategory === 'all' && styles.categoryTextActive]}>
                All
              </Text>
              {selectedCategory === 'all' && (
                <View style={styles.categoryCheckIcon}>
                  <Icon name="checkmark" size={10} color={C.primary} />
                </View>
              )}
            </TouchableOpacity>
            {categories.map((cat, index) => {
              const isActive = selectedCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <View style={[styles.categoryIconBox, isActive && styles.categoryIconBoxActive]}>
                    <Icon name="pricetag" size={14} color={isActive ? '#fff' : C.primary} />
                  </View>
                  <Text style={[styles.categoryText, isActive && styles.categoryTextActive]}>
                    {cat.name}
                  </Text>
                  {isActive && (
                    <View style={styles.categoryCheckIcon}>
                      <Icon name="checkmark" size={10} color={C.primary} />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* Products Grid */}
      <FlatList
        data={filteredProducts}
        keyExtractor={item => item.id.toString()}
        renderItem={renderProductCard}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="storefront-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>
              {search ? 'Try a different search' : 'Check back later for new products'}
            </Text>
          </View>
        }
      />

      {/* ========== ORDER MODAL ========== */}
      <Modal visible={orderModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Place Order</Text>
              <TouchableOpacity onPress={() => setOrderModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.sectionLabel}>Cart Items</Text>
              {cart.map(item => (
                <View key={item.product.id} style={styles.cartItem}>
                  <View style={styles.cartItemInfo}>
                    <Text style={styles.cartItemName}>{item.product.name}</Text>
                    <Text style={styles.cartItemQty}>x{item.quantity}</Text>
                  </View>
                  <Text style={styles.cartItemPrice}>₹{item.product.price * item.quantity}</Text>
                </View>
              ))}

              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{getCartTotal()}</Text>
              </View>

              <Text style={styles.sectionLabel}>Delivery Address *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Enter complete delivery address"
                placeholderTextColor={C.muted}
                value={deliveryAddress}
                onChangeText={setDeliveryAddress}
                multiline
                numberOfLines={3}
              />

              <Text style={styles.sectionLabel}>Delivery Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="Any special instructions"
                placeholderTextColor={C.muted}
                value={deliveryNotes}
                onChangeText={setDeliveryNotes}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setOrderModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                onPress={handlePlaceOrder}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Place Order</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="request" cartCount={cart.length} notifCount={0} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  cartBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: C.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.muted },

  // Cart Bar
  cartBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  cartBarLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartBarItems: { fontSize: 14, fontWeight: '600', color: '#fff' },
  cartBarRight: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cartBarTotal: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Search
  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIconBox: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500', color: C.text },
  clearSearchBtn: { padding: 8 },
  clearSearchIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Filter Section
  filterSection: { marginBottom: 8 },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted,
    marginLeft: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    flex: 1,
  },
  clearFilterBtn: { padding: 4 },
  categoryScrollContent: { paddingHorizontal: 16 },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  categoryChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  categoryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  categoryIconBoxActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  categoryText: { fontSize: 13, fontWeight: '600', color: C.ink },
  categoryTextActive: { color: '#fff' },
  categoryCheckIcon: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 6,
  },

  // Product List
  list: { padding: 16, paddingBottom: 100 },
  row: { justifyContent: 'space-between', marginBottom: 16 },
  card: {
    width: '48%',
    backgroundColor: C.card,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  productImage: { width: '100%', height: 100, backgroundColor: C.bg },
  noImage: { alignItems: 'center', justifyContent: 'center' },
  cardContent: { padding: 10 },
  productName: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 4 },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  categoryBadgeText: { fontSize: 10, fontWeight: '600', color: C.muted },
  productDesc: { fontSize: 11, color: C.muted, lineHeight: 14, marginBottom: 6 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  vendorText: { fontSize: 10, color: C.muted },
  stockText: { fontSize: 10, color: C.muted, marginBottom: 8 },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productPrice: { fontSize: 15, fontWeight: '700', color: C.primary },

  // Qty Controls
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyBtnDisabled: { borderColor: C.border },
  qtyText: { fontSize: 14, fontWeight: '700', color: C.ink, minWidth: 20, textAlign: 'center' },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: C.primary,
    borderRadius: 8,
  },
  addBtnDisabled: { backgroundColor: C.border },
  addBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  addBtnTextDisabled: { color: C.muted },

  // Empty State
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8, paddingHorizontal: 32 },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalBody: { padding: 20 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    marginTop: 16,
  },
  cartItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  cartItemInfo: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cartItemName: { fontSize: 14, fontWeight: '600', color: C.ink, flex: 1 },
  cartItemQty: { fontSize: 13, color: C.muted },
  cartItemPrice: { fontSize: 14, fontWeight: '600', color: C.ink },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: C.border,
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  totalValue: { fontSize: 18, fontWeight: '700', color: C.primary },

  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { minHeight: 80, textAlignVertical: 'top' },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.ink },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
