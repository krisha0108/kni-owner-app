import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

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

const getStatusStyle = (status) => {
  switch (status) {
    case 'PENDING':
      return { bg: '#FFFBEB', text: C.warn, icon: 'time' };
    case 'CONFIRMED':
      return { bg: '#EFF6FF', text: C.info, icon: 'checkmark-circle' };
    case 'SHIPPED':
      return { bg: '#F3F4F6', text: C.ink, icon: 'car' };
    case 'DELIVERED':
      return { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-done' };
    case 'CANCELLED':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'help-circle' };
  }
};

export default function MarketplaceOrdersScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [restaurant, setRestaurant] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadOrders();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])
  );

  const loadOrders = async () => {
    try {
      setLoading(true);

      // First get the owner's restaurant
      const restaurantRes = await api.get('/owner/restaurants');
      let restaurantId = restaurant?.id;

      if (restaurantRes.data.ok && restaurantRes.data.data?.length > 0) {
        const approved = restaurantRes.data.data.find(r => r.status === 'APPROVED');
        if (approved) {
          setRestaurant(approved);
          restaurantId = approved.id;
        }
      }

      if (!restaurantId) {
        setOrders([]);
        return;
      }

      const response = await api.get(`/owner/marketplace/orders?restaurantId=${restaurantId}`);

      if (response.data.ok) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadOrders();
  };

  const renderOrderCard = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('MarketplaceOrderDetail', { orderId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.id?.slice(0, 8).toUpperCase()}</Text>
            <Text style={styles.orderDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {item.vendor && (
          <Text style={styles.vendorName}>{item.vendor.name}</Text>
        )}

        <View style={styles.itemsList}>
          {item.items?.slice(0, 2).map((orderItem, idx) => (
            <View key={idx} style={styles.itemRow}>
              <Text style={styles.itemName} numberOfLines={1}>
                {orderItem.product?.name || 'Product'}
              </Text>
              <Text style={styles.itemQty}>x{orderItem.qty}</Text>
            </View>
          ))}
          {item.items?.length > 2 && (
            <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.totalLabel}>Total Amount</Text>
            <Text style={styles.totalValue}>₹{item.totalAmount}</Text>
          </View>
          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Icon name="chevron-forward" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
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
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="receipt-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Orders Yet</Text>
            <Text style={styles.emptyText}>Your marketplace orders will appear here</Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Icon name="bag-add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  list: { padding: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: { fontSize: 16, fontWeight: '700', color: C.ink },
  orderDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  vendorName: { fontSize: 13, color: C.muted, marginBottom: 8 },

  itemsList: { marginBottom: 12 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  itemName: { fontSize: 13, color: C.text, flex: 1 },
  itemQty: { fontSize: 13, fontWeight: '600', color: C.muted, marginLeft: 8 },
  moreItems: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 4 },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  totalLabel: { fontSize: 12, color: C.muted },
  totalValue: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 2 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
