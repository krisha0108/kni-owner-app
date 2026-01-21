import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useFocusEffect } from '@react-navigation/native';
import { api } from '../api/client';

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
};

export default function CartScreen({ navigation }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owner/cart');
      if (response.data?.ok) {
        // Cart API returns { data: { items: [...] } }
        const cartData = response.data.data;
        const items = Array.isArray(cartData?.items) ? cartData.items : [];
        setCart(items);
      } else {
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
              const response = await api.delete(`/owner/cart/items/${itemId}`);
              if (response.data?.ok) {
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

    // Navigate to booking creation (service bookings, not marketplace)
    navigation.navigate('SlotBooking', { cartItems: cart });
  };

  // Helper to get item details (works for both services and parts)
  const getItemDetails = (item) => {
    const itemData = item.serviceItem || item.partItem || {};
    return {
      id: item.id,
      name: itemData.name || 'Unknown Item',
      price: item.priceSnapshot || itemData.price || 0,
      qty: item.qty || 1,
      type: item.itemType || (item.serviceItem ? 'SERVICE' : 'PART'),
    };
  };

  const totalPrice = cart.reduce((sum, item) => {
    const details = getItemDetails(item);
    return sum + details.price * details.qty;
  }, 0);
  const totalItems = cart.reduce((sum, item) => sum + (item.qty || 1), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cart</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cart ({totalItems})</Text>
        <TouchableOpacity
          onPress={() => {
            Alert.alert('Clear Cart', 'Remove all items from cart?', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear',
                style: 'destructive',
                onPress: async () => {
                  for (const item of cart) {
                    await api.delete(`/owner/cart/items/${item.id}`);
                  }
                  loadCart();
                },
              },
            ]);
          }}
          disabled={cart.length === 0}
        >
          <Icon name="trash-outline" size={20} color={cart.length > 0 ? C.danger : C.muted} />
        </TouchableOpacity>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => {
          const details = getItemDetails(item);
          return (
            <View style={styles.cartItem}>
              {/* Item Type Icon */}
              <View style={[styles.itemImage, styles.placeholderImage]}>
                <Icon
                  name={details.type === 'SERVICE' ? 'construct-outline' : 'hardware-chip-outline'}
                  size={32}
                  color={details.type === 'SERVICE' ? C.primary : C.ok}
                />
              </View>

              {/* Item Details */}
              <View style={styles.itemDetails}>
                <View style={styles.itemTypeRow}>
                  <Text style={[styles.itemType, { color: details.type === 'SERVICE' ? C.primary : C.ok }]}>
                    {details.type}
                  </Text>
                </View>
                <Text style={styles.itemName} numberOfLines={2}>
                  {details.name}
                </Text>
                <Text style={styles.itemPrice}>₹{details.price.toFixed(2)}</Text>
              </View>

              {/* Quantity Controls */}
              <View style={styles.quantityControls}>
                <View style={styles.quantityRow}>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.id, details.qty - 1)}
                    disabled={updating === item.id || details.qty <= 1}
                    style={styles.quantityBtn}
                  >
                    <Icon
                      name="remove-circle-outline"
                      size={28}
                      color={details.qty <= 1 ? C.muted : C.primary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.quantity}>{details.qty}</Text>
                  <TouchableOpacity
                    onPress={() => handleUpdateQuantity(item.id, details.qty + 1)}
                    disabled={updating === item.id}
                    style={styles.quantityBtn}
                  >
                    <Icon name="add-circle-outline" size={28} color={C.ok} />
                  </TouchableOpacity>
                </View>

                {/* Remove Button */}
                <TouchableOpacity
                  onPress={() => handleRemove(item.id)}
                  style={styles.removeBtn}
                >
                  <Icon name="trash-outline" size={20} color={C.danger} />
                </TouchableOpacity>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="cart-outline" size={80} color={C.muted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Add items to get started</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Home')}
            >
              <Text style={styles.browseButtonText}>Browse Items</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Footer */}
      {cart.length > 0 && (
        <View style={styles.footer}>
          <View style={styles.totalSection}>
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Subtotal ({totalItems} items)</Text>
              <Text style={styles.totalValue}>₹{totalPrice.toFixed(2)}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.checkoutButton}
            onPress={handleProceedToBooking}
          >
            <Text style={styles.checkoutButtonText}>Proceed to Booking</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  placeholderImage: {
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  itemTypeRow: {
    marginBottom: 4,
  },
  itemType: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  itemName: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    marginBottom: 4,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: C.primary,
    marginBottom: 4,
  },
  itemDescription: {
    fontSize: 12,
    color: C.muted,
  },
  quantityControls: {
    marginLeft: 8,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  quantityBtn: {
    padding: 2,
  },
  quantity: {
    fontSize: 16,
    fontWeight: '700',
    color: C.text,
    minWidth: 24,
    textAlign: 'center',
  },
  removeBtn: {
    padding: 8,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    marginTop: 8,
    marginBottom: 24,
  },
  browseButton: {
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  footer: {
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: 16,
  },
  totalSection: {
    marginBottom: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: C.muted,
  },
  totalValue: {
    fontSize: 20,
    fontWeight: '700',
    color: C.text,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
  },
  checkoutButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
