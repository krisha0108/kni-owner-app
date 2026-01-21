import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

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

export default function MarketplaceProductScreen({ navigation, route }) {
  const { product: productParam } = route.params || {};
  const [product, setProduct] = useState(productParam || null);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  useEffect(() => {
    if (!productParam) {
      Alert.alert('Error', 'Product not found');
      navigation.goBack();
    }
  }, [productParam]);

  const addToCart = async () => {
    if (!product) return;

    setAddingToCart(true);
    try {
      // Get restaurant first
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const restaurant = restaurantsRes.data.data.find(r => r.status === 'APPROVED');
        if (restaurant) {
          // Validate product with backend
          const response = await api.post('/owner/marketplace/cart', {
            restaurantId: restaurant.id,
            productId: product.id,
            quantity,
          });

          if (response.data.ok) {
            // Save to AsyncStorage for marketplace cart
            const cartItem = response.data.data;
            await saveToCart(cartItem);
            Alert.alert('Success', 'Product added to cart', [
              { text: 'Continue Shopping', style: 'cancel' },
              { text: 'Go to Cart', onPress: () => navigation.navigate('MarketplaceCart') },
            ]);
          } else {
            Alert.alert('Error', response.data.error || 'Failed to add product');
          }
        } else {
          Alert.alert('Error', 'No approved restaurant found');
        }
      } else {
        Alert.alert('Error', 'Please add a restaurant first');
      }
    } catch (error) {
      console.log('Add to cart error:', error);
      const errorMsg = error.response?.data?.error || 'Failed to add product to cart';
      Alert.alert('Error', errorMsg);
    } finally {
      setAddingToCart(false);
    }
  };

  const increaseQuantity = () => setQuantity(q => q + 1);
  const decreaseQuantity = () => setQuantity(q => Math.max(1, q - 1));

  const saveToCart = async (cartItem) => {
    try {
      const existingCart = await AsyncStorage.getItem(CART_STORAGE_KEY);
      let cart = existingCart ? JSON.parse(existingCart) : [];

      // Check if item already exists
      const existingIndex = cart.findIndex(item => item.productId === cartItem.productId);
      if (existingIndex >= 0) {
        // Update quantity
        cart[existingIndex].quantity += cartItem.quantity;
      } else {
        // Add new item
        cart.push(cartItem);
      }

      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Save to cart error:', error);
    }
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cube-outline" size={64} color={C.muted} />
          <Text style={styles.emptyTitle}>Product Not Found</Text>
          <Text style={styles.emptyText}>This product may no longer be available</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Cart')} style={styles.cartBtn}>
          <Icon name="cart-outline" size={22} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Product Image */}
        {product.image ? (
          <Image source={{ uri: product.image }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}>
            <Icon name="image-outline" size={48} color={C.muted} />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>

          {product.vendor && (
            <View style={styles.vendorRow}>
              <Icon name="business-outline" size={16} color={C.muted} />
              <Text style={styles.vendorText}>
                {typeof product.vendor === 'object' ? product.vendor.name : product.vendor}
              </Text>
            </View>
          )}

          <View style={styles.priceRow}>
            <Text style={styles.price}>₹{product.price}</Text>
            {product.inStock ? (
              <View style={styles.stockBadge}>
                <Icon name="checkmark-circle" size={16} color={C.ok} />
                <Text style={styles.stockText}>In Stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outOfStock]}>
                <Icon name="close-circle" size={16} color={C.danger} />
                <Text style={[styles.stockText, { color: C.danger }]}>Out of Stock</Text>
              </View>
            )}
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {product.category && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>
                {typeof product.category === 'object' ? product.category.name : product.category}
              </Text>
            </View>
          )}

          {product.sku && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
          )}
        </View>

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* Bottom Bar */}
      {(product.canPurchase !== false && product.inStock) && (
        <View style={styles.bottomBar}>
          <View style={styles.quantityControl}>
            <TouchableOpacity style={styles.qtyBtn} onPress={decreaseQuantity}>
              <Icon name="remove" size={20} color={C.ink} />
            </TouchableOpacity>
            <Text style={styles.qtyText}>{quantity}</Text>
            <TouchableOpacity style={styles.qtyBtn} onPress={increaseQuantity}>
              <Icon name="add" size={20} color={C.ink} />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={styles.addToCartBtn}
            onPress={addToCart}
            disabled={addingToCart}
          >
            {addingToCart ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Icon name="cart" size={20} color="#fff" />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  content: { flex: 1 },
  productImage: { width: '100%', height: 250, backgroundColor: C.card },
  noImage: {
    width: '100%',
    height: 200,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContainer: { padding: 16 },
  productName: { fontSize: 22, fontWeight: '800', color: C.ink, marginBottom: 8 },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  vendorText: { fontSize: 14, color: C.muted },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  price: { fontSize: 28, fontWeight: '900', color: C.primary },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#ECFDF5',
  },
  outOfStock: { backgroundColor: '#FEF2F2' },
  stockText: { fontSize: 13, fontWeight: '600', color: C.ok },

  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 },
  description: { fontSize: 14, color: C.text, lineHeight: 22 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  detailLabel: { fontSize: 14, color: C.muted },
  detailValue: { fontSize: 14, fontWeight: '600', color: C.ink },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 24,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: 16, fontWeight: '700', color: C.ink, minWidth: 30, textAlign: 'center' },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  addToCartText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
