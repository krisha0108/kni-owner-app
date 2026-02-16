import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  danger: '#EF4444',
  serviceColor: '#3B82F6',
  partColor: '#10B981',
};

export default function CartScreen({ navigation }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async () => {
    try {
      setLoading(true);
      console.log('[CartScreen] Loading cart...');
      const response = await api.get('/owner/cart');
      console.log('[CartScreen] Cart response:', response.data?.ok, 'items:', response.data?.data?.items?.length || 0);
      if (response.data?.ok) {
        const cartData = response.data.data;
        const items = Array.isArray(cartData?.items) ? cartData.items : [];
        console.log('[CartScreen] Setting cart with', items.length, 'items');
        setCart(items);
      } else {
        console.log('[CartScreen] Cart response not ok, clearing');
        setCart([]);
      }
    } catch (error) {
      console.error('Load cart error:', error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId, newQuantity) => {
    if (newQuantity < 1) return;

    setUpdating(itemId);
    try {
      const response = await api.patch(`/owner/cart/items/${itemId}`, {
        quantity: newQuantity,
      });

      if (response.data?.ok) {
        loadCart();
      } else {
        throw new Error(response.data?.error || 'Failed to update quantity');
      }
    } catch (error) {
      console.error('Update quantity error:', error);
      Alert.alert('Error', 'Could not update item quantity');
    } finally {
      setUpdating(null);
    }
  };

  // Helper function to clear AsyncStorage cart data
  const clearAsyncStorageCart = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const cartKeys = allKeys.filter(k =>
        k.startsWith('rdraft:') ||
        k.startsWith('rservices:') ||
        k.startsWith('rparts:') ||
        k.startsWith('pmeta:')
      );
      if (cartKeys.length > 0) {
        await AsyncStorage.multiRemove(cartKeys);
        console.log('[CartScreen] Cleared AsyncStorage cart data');
      }
    } catch (error) {
      console.log('[CartScreen] Error clearing AsyncStorage:', error);
    }
  };

  const handleRemove = async (itemId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              console.log('[CartScreen] Removing item:', itemId);
              const response = await api.delete(`/owner/cart/items/${itemId}`);
              console.log('[CartScreen] Delete response:', response.data);
              if (response.data?.ok) {
                // Also clear AsyncStorage cart to prevent sync issues
                await clearAsyncStorageCart();
                // Immediately remove from local state for instant UI update
                setCart(prev => prev.filter(item => item.id !== itemId));
                // Then reload from server to confirm
                loadCart();
              } else {
                throw new Error(response.data?.error || 'Failed to remove item');
              }
            } catch (error) {
              console.error('Remove item error:', error);
              Alert.alert('Error', 'Could not remove item');
            }
          },
        },
      ]
    );
  };

  const handleProceedToBooking = () => {
    if (cart.length === 0) {
      return Alert.alert('Empty Cart', 'Please add items to cart before proceeding');
    }

    navigation.navigate('SlotBooking', { cartItems: cart });
  };

  // Helper to get item details
  const getItemDetails = (item) => {
    const itemData = item.serviceItem || item.partItem || {};
    const category = itemData.category || {};
    const subCategory = itemData.subCategory || {};
    return {
      id: item.id,
      name: itemData.name || 'Unknown Item',
      price: item.priceSnapshot || itemData.price || 0,
      qty: item.qty || 1,
      type: item.itemType || (item.serviceItem ? 'SERVICE' : 'PART'),
      categoryId: itemData.categoryId || category.id || 'uncategorized',
      categoryName: category.name || 'Uncategorized',
      subCategoryName: subCategory.name || null,
    };
  };

  // Group items by category
  const groupedByCategory = cart.reduce((acc, item) => {
    const details = getItemDetails(item);
    const categoryId = details.categoryId;

    if (!acc[categoryId]) {
      acc[categoryId] = {
        categoryId,
        categoryName: details.categoryName,
        services: [],
        parts: [],
      };
    }

    if (details.type === 'SERVICE') {
      acc[categoryId].services.push({ ...item, details });
    } else {
      acc[categoryId].parts.push({ ...item, details });
    }

    return acc;
  }, {});

  const categories = Object.values(groupedByCategory);

  // Calculate totals
  const totalPrice = cart.reduce((sum, item) => {
    const details = getItemDetails(item);
    return sum + details.price * details.qty;
  }, 0);
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  // Render individual item row
  const renderItemRow = (item, isService) => {
    const { details } = item;
    const color = isService ? C.serviceColor : C.partColor;

    return (
      <View key={details.id} style={styles.itemRow}>
        <View style={[styles.itemIcon, { backgroundColor: color + '15' }]}>
          <Icon
            name={isService ? 'construct-outline' : 'hardware-chip-outline'}
            size={scale(20)}
            color={color}
          />
        </View>

        <View style={styles.itemInfo}>
          <Text style={styles.itemName} numberOfLines={1}>{details.name}</Text>
          {details.subCategoryName && (
            <Text style={styles.itemSubCategory}>{details.subCategoryName}</Text>
          )}
          <Text style={[styles.itemPrice, { color }]}>₹{details.price.toFixed(2)}</Text>
        </View>

        <View style={styles.itemActions}>
          <View style={styles.quantityRow}>
            <TouchableOpacity
              onPress={() => handleUpdateQuantity(details.id, details.qty - 1)}
              disabled={updating === details.id || details.qty <= 1}
              style={styles.quantityBtn}
            >
              <Icon
                name="remove-circle-outline"
                size={scale(24)}
                color={details.qty <= 1 ? C.muted : C.primary}
              />
            </TouchableOpacity>
            <Text style={styles.quantity}>{details.qty}</Text>
            <TouchableOpacity
              onPress={() => handleUpdateQuantity(details.id, details.qty + 1)}
              disabled={updating === details.id}
              style={styles.quantityBtn}
            >
              <Icon name="add-circle-outline" size={scale(24)} color={C.ok} />
            </TouchableOpacity>
          </View>

          <TouchableOpacity onPress={() => handleRemove(details.id)} style={styles.removeBtn}>
            <Icon name="trash-outline" size={scale(18)} color={C.danger} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render category card
  const renderCategoryCard = (categoryData) => {
    const { categoryId, categoryName, services, parts } = categoryData;
    const allItems = [...services, ...parts];
    const categoryTotal = allItems.reduce((sum, item) => {
      return sum + item.details.price * item.details.qty;
    }, 0);
    const categoryItemCount = allItems.length;

    return (
      <View key={categoryId} style={styles.categoryCard}>
        {/* Category Header */}
        <View style={styles.categoryHeader}>
          <View style={styles.categoryTitleRow}>
            <Icon name="grid-outline" size={scale(20)} color={C.ink} />
            <Text style={styles.categoryName}>{categoryName}</Text>
          </View>
          <View style={styles.categoryMeta}>
            <Text style={styles.categoryItemCount}>{categoryItemCount} items</Text>
            <Text style={styles.categoryTotal}>₹{categoryTotal.toFixed(2)}</Text>
          </View>
        </View>

        {/* Services Section */}
        {services.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="construct" size={scale(16)} color={C.serviceColor} />
              <Text style={[styles.sectionTitle, { color: C.serviceColor }]}>
                Services ({services.length})
              </Text>
            </View>
            {services.map((item) => renderItemRow(item, true))}
          </View>
        )}

        {/* Parts Section */}
        {parts.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Icon name="hardware-chip" size={scale(16)} color={C.partColor} />
              <Text style={[styles.sectionTitle, { color: C.partColor }]}>
                Parts ({parts.length})
              </Text>
            </View>
            {parts.map((item) => renderItemRow(item, false))}
          </View>
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(24)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({totalItems})</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => {
              Alert.alert('Clear Cart', 'Remove all items from cart?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Clear',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      // Clear database cart
                      await api.delete('/owner/cart?clearAll=true');
                      // Clear AsyncStorage cart data
                      await clearAsyncStorageCart();
                      loadCart();
                    } catch (error) {
                      console.error('Clear cart error:', error);
                      Alert.alert('Error', 'Could not clear cart');
                    }
                  },
                },
              ]);
            }}
            disabled={cart.length === 0}
          >
            <Icon name="trash-outline" size={scale(20)} color={cart.length > 0 ? C.danger : C.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cart Items by Category */}
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {categories.length > 0 ? (
          categories.map(renderCategoryCard)
        ) : (
          <View style={styles.emptyBox}>
            <Icon name="cart-outline" size={scale(80)} color={C.muted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add items to get started</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Browse Items</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      {/* Footer */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal ({totalItems} items)</Text>
              <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
            </View>
            <Text style={styles.categoryCount}>{categories.length} categories</Text>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleProceedToBooking}
          >
            <Text style={styles.checkoutButtonText}>Proceed to Booking</Text>
            <Icon name="arrow-forward" size={scale(20)} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: scale(16),
    flexGrow: 1,
  },
  categoryCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(16),
    backgroundColor: C.bg,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  categoryName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  categoryMeta: {
    alignItems: 'flex-end',
  },
  categoryItemCount: {
    fontSize: moderateScale(12),
    color: C.muted,
  },
  categoryTotal: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.primary,
  },
  section: {
    padding: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(12),
    paddingBottom: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  itemIcon: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
    marginLeft: scale(12),
  },
  itemName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.text,
  },
  itemSubCategory: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(2),
  },
  itemPrice: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    marginTop: scale(4),
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  quantityBtn: {
    padding: scale(2),
  },
  quantity: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.text,
    minWidth: scale(24),
    textAlign: 'center',
  },
  removeBtn: {
    padding: scale(6),
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: scale(80),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.text,
    marginTop: scale(16),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginTop: scale(8),
    marginBottom: scale(24),
  },
  browseButton: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
  },
  browseButtonText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: scale(16),
  },
  totalSection: {
    marginBottom: scale(12),
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  totalLabel: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  totalValue: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.text,
  },
  categoryCount: {
    fontSize: moderateScale(12),
    color: C.muted,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(16),
  },
  checkoutButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFF',
  },
});
