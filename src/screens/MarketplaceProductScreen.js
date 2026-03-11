import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { api, getImageUrl } from '../api/client';
import cartService from '../services/marketplaceCartService';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import PriceRequestModal from '../components/PriceRequestModal';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';

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
  const { can } = usePermissions();
  const { product: productParam, restaurantId } = route.params || {};
  const [product, setProduct] = useState(productParam || null);
  const [cart, setCart] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [isPriceRequestOpen, setIsPriceRequestOpen] = useState(false);
  const cartQty = cart.find(i => i.product?.id === product?.id)?.quantity || 0;

  useEffect(() => {
    if (!productParam) {
      Alert.alert('Error', 'Product not found');
      navigation.goBack();
    }
  }, [productParam, navigation]);

  const loadCart = useCallback(async () => {
    if (!restaurantId) return;
    try {
      const items = await cartService.getCart(restaurantId);
      setCart(items || []);
    } catch (e) {
      setCart([]);
    }
  }, [restaurantId]);

  useEffect(() => {
    loadCart();
  }, [loadCart]);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [loadCart])
  );

  const addToCart = async () => {
    if (!product) return;
    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant not selected');
      return;
    }

    try {
      const existing = cart.find(item => item.product.id === product.id);
      const newQuantity = existing
        ? Math.min(existing.quantity + 1, product.stockQuantity || 999)
        : 1;

      const items = await cartService.addItem(restaurantId, product.id, newQuantity);
      setCart(items || []);
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to add to cart');
    }
  };

  const updateCartQuantity = async (delta) => {
    if (!product) return;
    const item = cart.find(i => i.product.id === product.id);
    if (!item) return;

    const newQty = item.quantity + delta;

    try {
      if (newQty <= 0) {
        await cartService.removeItem(item.id);
      } else {
        const clamped = Math.min(newQty, product.stockQuantity || 999);
        const items = await cartService.updateItemQuantity(item.id, clamped);
        setCart(items || []);
        return;
      }
      await loadCart();
    } catch (error) {
      Alert.alert('Error', error.message || 'Failed to update cart');
    }
  };

  const handleRequestPrice = () => {
    if (!restaurantId) {
      Alert.alert('Error', 'Restaurant not selected');
      return;
    }
    setIsPriceRequestOpen(true);
  };

  if (!product) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="cube-outline" size={scale(64)} color={C.muted} />
          <Text style={styles.emptyTitle}>Product Not Found</Text>
          <Text style={styles.emptyText}>This product may no longer be available</Text>
        </View>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  const imageSource = product.imageUrl || product.image;
  const stockQty = Number(product.stockQuantity || 0);
  const isInStock = product.inStock !== undefined ? !!product.inStock : stockQty > 0;
  const canPurchase = product.canPurchase !== false && isInStock;
  const categoryName = typeof product.category === 'object' ? product.category?.name : product.category;
  const vendorName = typeof product.vendor === 'object' ? product.vendor?.name : product.vendor;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Product Details</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('MarketplaceCart', { restaurantId })} style={styles.cartBtn}>
            <Icon name="cart-outline" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: scale(150) }}>
        {/* Product Image */}
        {imageSource ? (
          <Image source={{ uri: getImageUrl(imageSource) }} style={styles.productImage} resizeMode="cover" />
        ) : (
          <View style={styles.noImage}>
            <Icon name="image-outline" size={scale(48)} color={C.muted} />
          </View>
        )}

        {/* Product Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.productName}>{product.name}</Text>

          {vendorName && (
            <View style={styles.vendorRow}>
              <Icon name="business-outline" size={scale(16)} color={C.muted} />
              <Text style={styles.vendorText}>{vendorName}</Text>
            </View>
          )}

          <View style={styles.metaChipsRow}>
            {categoryName ? (
              <View style={styles.metaChip}>
                <Icon name="grid-outline" size={scale(13)} color={C.info} />
                <Text style={styles.metaChipText}>{categoryName}</Text>
              </View>
            ) : null}
            {product.unit ? (
              <View style={styles.metaChip}>
                <Icon name="pricetag-outline" size={scale(13)} color={C.info} />
                <Text style={styles.metaChipText}>Per {product.unit}</Text>
              </View>
            ) : null}
            <View style={styles.metaChip}>
              <Icon name="cube-outline" size={scale(13)} color={C.info} />
              <Text style={styles.metaChipText}>Stock {stockQty}</Text>
            </View>
          </View>

          <View style={styles.priceRow}>
            {product.priceOnRequest && !product.canPurchase ? (
              <View style={styles.priceOnRequestContainer}>
                {product.priceUnlock?.status === 'UNLOCKED' && !product.priceUnlock.isExpired ? (
                  <Text style={styles.price}>₹{product.priceUnlock.unlockedPrice}</Text>
                ) : (
                  <View style={styles.onRequestBadgeLarge}>
                    <Icon name="pricetag-outline" size={scale(18)} color="#92400E" />
                    <Text style={styles.onRequestTextLarge}>Price on Request</Text>
                  </View>
                )}
                {product.priceUnlock?.status === 'PENDING' && (
                  <View style={styles.statusBadgePending}>
                    <Icon name="time-outline" size={scale(14)} color="#1E40AF" />
                    <Text style={styles.statusBadgePendingText}>Requested</Text>
                  </View>
                )}
                {product.priceUnlock?.status === 'DECLINED' && (
                  <View style={styles.statusBadgeDeclined}>
                    <Icon name="close-circle-outline" size={scale(14)} color="#DC2626" />
                    <Text style={styles.statusBadgeDeclinedText}>Declined</Text>
                  </View>
                )}
                {product.priceUnlock?.isExpired && (
                  <View style={styles.statusBadgeExpired}>
                    <Icon name="alert-circle-outline" size={scale(14)} color="#C2410C" />
                    <Text style={styles.statusBadgeExpiredText}>Expired</Text>
                  </View>
                )}
              </View>
            ) : (
              <Text style={styles.price}>
                ₹{product.priceUnlock?.unlockedPrice || product.price}
              </Text>
            )}
            {isInStock ? (
              <View style={styles.stockBadge}>
                <Icon name="checkmark-circle" size={scale(16)} color={C.ok} />
                <Text style={styles.stockText}>In Stock</Text>
              </View>
            ) : (
              <View style={[styles.stockBadge, styles.outOfStock]}>
                <Icon name="close-circle" size={scale(16)} color={C.danger} />
                <Text style={[styles.stockText, { color: C.danger }]}>Out of Stock</Text>
              </View>
            )}
          </View>

          <View style={styles.quickInfoCard}>
            <View style={styles.quickInfoRow}>
              <Text style={styles.quickInfoLabel}>Available Quantity</Text>
              <Text style={styles.quickInfoValue}>{stockQty}</Text>
            </View>
            {product.deliveryTime ? (
              <View style={styles.quickInfoRow}>
                <Text style={styles.quickInfoLabel}>Delivery Time</Text>
                <Text style={styles.quickInfoValue}>{product.deliveryTime}</Text>
              </View>
            ) : null}
            {product.subCategory?.name ? (
              <View style={styles.quickInfoRow}>
                <Text style={styles.quickInfoLabel}>Sub Category</Text>
                <Text style={styles.quickInfoValue}>{product.subCategory.name}</Text>
              </View>
            ) : null}
          </View>

          {product.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Description</Text>
              <Text style={styles.description}>{product.description}</Text>
            </View>
          )}

          {categoryName && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Category</Text>
              <Text style={styles.detailValue}>{categoryName}</Text>
            </View>
          )}

          {product.sku && (
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>SKU</Text>
              <Text style={styles.detailValue}>{product.sku}</Text>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bottom Bar */}
      {can('marketplace:create') && (
        product.priceOnRequest && !product.canPurchase ? (
          <View style={styles.bottomBar}>
            {product.priceUnlock?.status === 'PENDING' ? (
              <View style={styles.requestedBottomBar}>
                <Icon name="time-outline" size={scale(20)} color="#1E40AF" />
                <Text style={styles.requestedBottomText}>Price Request Pending</Text>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.requestPriceBottomBtn}
                onPress={handleRequestPrice}
              >
                <Icon name="pricetag-outline" size={scale(20)} color="#92400E" />
                <Text style={styles.requestPriceBottomText}>
                  {product.priceUnlock?.status === 'DECLINED' || product.priceUnlock?.isExpired ? 'Re-request Price' : 'Request Price'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : canPurchase ? (
          <View style={styles.bottomBar}>
            {cartQty > 0 ? (
              <>
                <View style={styles.quantityControl}>
                  <TouchableOpacity style={styles.qtyBtn} onPress={() => updateCartQuantity(-1)}>
                    <Icon name="remove" size={scale(20)} color={C.primary} />
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{cartQty}</Text>
                  <TouchableOpacity
                    style={[styles.qtyBtn, cartQty >= (stockQty || 999) && { opacity: 0.4 }]}
                    onPress={() => updateCartQuantity(1)}
                    disabled={cartQty >= (stockQty || 999)}
                  >
                    <Icon name="add" size={scale(20)} color={C.primary} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity
                  style={styles.addToCartBtn}
                  onPress={() => navigation.navigate('MarketplaceCart', { restaurantId })}
                >
                  <Icon name="cart" size={scale(20)} color="#fff" />
                  <Text style={styles.addToCartText}>Go to Cart</Text>
                </TouchableOpacity>
              </>
            ) : (
              <TouchableOpacity
                style={styles.addToCartBtn}
                onPress={addToCart}
              >
                <Icon name="cart" size={scale(20)} color="#fff" />
                <Text style={styles.addToCartText}>Add to Cart</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : null
      )}
      <PriceRequestModal
        visible={isPriceRequestOpen}
        product={product}
        restaurantId={restaurantId}
        onClose={() => setIsPriceRequestOpen(false)}
        onSuccess={() => {
          setProduct({ ...product, priceUnlock: { status: 'PENDING', unlockedPrice: null, validUntil: null, isExpired: false } });
        }}
      />
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
  cartBtn: {
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
  emptyText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8) },

  content: { flex: 1 },
  productImage: { width: '100%', height: scale(250), backgroundColor: C.card },
  noImage: {
    width: '100%',
    height: scale(200),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },

  infoContainer: { padding: scale(16) },
  productName: { fontSize: moderateScale(22), fontWeight: '800', color: C.ink, marginBottom: scale(8) },
  vendorRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginBottom: scale(12) },
  vendorText: { fontSize: moderateScale(14), color: C.muted },

  metaChipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(12) },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
    borderWidth: 1,
    borderRadius: scale(16),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
  },
  metaChipText: { fontSize: moderateScale(12), color: '#1E40AF', fontWeight: '600' },

  priceRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(16) },
  price: { fontSize: moderateScale(28), fontWeight: '900', color: C.primary },
  stockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(20),
    backgroundColor: '#ECFDF5',
  },
  outOfStock: { backgroundColor: '#FEF2F2' },
  stockText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ok },

  quickInfoCard: {
    backgroundColor: C.card,
    borderColor: C.border,
    borderWidth: 1,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    marginBottom: scale(14),
  },
  quickInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(6),
  },
  quickInfoLabel: { fontSize: moderateScale(13), color: C.muted },
  quickInfoValue: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink, maxWidth: '60%', textAlign: 'right' },

  section: { marginBottom: scale(16) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  description: { fontSize: moderateScale(14), color: C.text, lineHeight: moderateScale(22) },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  detailLabel: { fontSize: moderateScale(14), color: C.muted },
  detailValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },

  bottomBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: scale(85),
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  qtyBtn: { width: scale(40), height: scale(40), alignItems: 'center', justifyContent: 'center' },
  qtyText: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, minWidth: scale(30), textAlign: 'center' },
  addToCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
  },
  addToCartText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Price on Request styles
  priceOnRequestContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: scale(8),
  },
  onRequestBadgeLarge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(12),
    paddingVertical: scale(6),
    borderRadius: scale(8),
  },
  onRequestTextLarge: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#92400E',
  },
  statusBadgePending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#DBEAFE',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusBadgePendingText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#1E40AF',
  },
  statusBadgeDeclined: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#FEE2E2',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusBadgeDeclinedText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#DC2626',
  },
  statusBadgeExpired: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    backgroundColor: '#FED7AA',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(12),
  },
  statusBadgeExpiredText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#C2410C',
  },
  requestPriceBottomBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FCD34D',
  },
  requestPriceBottomText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#92400E',
  },
  requestedBottomBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: '#DBEAFE',
  },
  requestedBottomText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#1E40AF',
  },
});
