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
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  danger: '#EF4444',
};

const CART_STORAGE_KEY = '@marketplace_cart';

export default function MarketplaceCartScreen({ navigation }) {
  const [cart, setCart] = useState([]);
  const [loading, setLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadCart();
    }, [])
  );

  const loadCart = async () => {
    try {
      setLoading(true);
      const cartData = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (cartData) {
        const items = JSON.parse(cartData);
        setCart(Array.isArray(items) ? items : []);
      } else {
        setCart([]);
      }
    } catch (error) {
      console.error('Load marketplace cart error:', error);
      setCart([]);
    } finally {
      setLoading(false);
    }
  };

  const saveCart = async (items) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
      setCart(items);
    } catch (error) {
      console.error('Save marketplace cart error:', error);
    }
  };

  const handleUpdateQuantity = async (productId, newQuantity) => {
    if (newQuantity < 1) return;

    const updatedCart = cart.map(item =>
      item.productId === productId
        ? { ...item, quantity: newQuantity }
        : item
    );
    await saveCart(updatedCart);
  };

  const handleRemove = async (productId) => {
    Alert.alert(
      'Remove Item',
      'Are you sure you want to remove this item from cart?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            const updatedCart = cart.filter(item => item.productId !== productId);
            await saveCart(updatedCart);
          },
        },
      ]
    );
  };

  const handleClearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items from cart?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await saveCart([]);
        },
      },
    ]);
  };

  const handleProceedToOrder = () => {
    if (cart.length === 0) {
      return Alert.alert('Empty Cart', 'Please add items to cart before proceeding');
    }

    navigation.navigate('CreateMarketplaceOrder', { cartItems: cart });
  };

  const totalPrice = cart.reduce((sum, item) => sum + (item.price || 0) * (item.quantity || 1), 0);
  const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Marketplace Cart</Text>
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
        <Text style={styles.headerTitle}>Marketplace Cart ({totalItems})</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={handleClearCart}
            disabled={cart.length === 0}
          >
            <Icon name="trash-outline" size={20} color={cart.length > 0 ? C.danger : C.muted} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Cart Items */}
      <FlatList
        data={cart}
        keyExtractor={(item) => item.productId}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            {/* Item Image */}
            {item.imageUrl ? (
              <Image source={{ uri: item.imageUrl }} style={styles.itemImage} />
            ) : (
              <View style={[styles.itemImage, styles.placeholderImage]}>
                <Icon name="image-outline" size={32} color={C.muted} />
              </View>
            )}

            {/* Item Details */}
            <View style={styles.itemDetails}>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>₹{(item.price || 0).toFixed(2)}</Text>
              {item.vendorName && (
                <Text style={styles.vendorName} numberOfLines={1}>
                  {item.vendorName}
                </Text>
              )}
            </View>

            {/* Quantity Controls */}
            <View style={styles.quantityControls}>
              <View style={styles.quantityRow}>
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item.productId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  style={styles.quantityBtn}
                >
                  <Icon
                    name="remove-circle-outline"
                    size={28}
                    color={item.quantity <= 1 ? C.muted : C.primary}
                  />
                </TouchableOpacity>
                <Text style={styles.quantity}>{item.quantity}</Text>
                <TouchableOpacity
                  onPress={() => handleUpdateQuantity(item.productId, item.quantity + 1)}
                  style={styles.quantityBtn}
                >
                  <Icon name="add-circle-outline" size={28} color={C.ok} />
                </TouchableOpacity>
              </View>

              {/* Remove Button */}
              <TouchableOpacity
                onPress={() => handleRemove(item.productId)}
                style={styles.removeBtn}
              >
                <Icon name="trash-outline" size={20} color={C.danger} />
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="cart-outline" size={80} color={C.muted} />
            <Text style={styles.emptyTitle}>Your cart is empty</Text>
            <Text style={styles.emptyText}>Browse marketplace to add products</Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Text style={styles.browseButtonText}>Browse Marketplace</Text>
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
            onPress={handleProceedToOrder}
          >
            <Text style={styles.checkoutButtonText}>Proceed to Order</Text>
            <Icon name="arrow-forward" size={20} color="#FFF" />
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
  vendorName: {
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
