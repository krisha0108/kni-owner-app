// screens/OrdersListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  RefreshControl, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, IMAGE_BASE_URL } from '../api/client';

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A', ink: '#0F172A', bg: '#F5F7FA', card: '#FFFFFF',
  text: '#111827', muted: '#6B7280', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', info: '#3B82F6', indigo: '#6366F1', danger: '#EF4444'
};
const R = 18;
const { width: W } = Dimensions.get('window');

/* ---------- STATUS MAP ---------- */
const STATUS_MAP = {
  Pending: { label: 'Pending', bg: '#FFF7ED', fg: C.warn, icon: 'time-outline' },
  Accepted: { label: 'Accepted', bg: '#EFF6FF', fg: C.info, icon: 'checkmark-circle-outline' },
  'In Progress': { label: 'In Progress', bg: '#F0FDFA', fg: '#14B8A6', icon: 'construct-outline' },
  Completed: { label: 'Completed', bg: '#ECFDF5', fg: C.ok, icon: 'checkmark-done-circle' },
  pending: { label: 'Pending', bg: '#FFF7ED', fg: C.warn, icon: 'time-outline' },
  accepted: { label: 'Accepted', bg: '#EFF6FF', fg: C.info, icon: 'checkmark-circle-outline' },
  engineer_assigned: { label: 'Engineer Assigned', bg: '#EEF2FF', fg: C.indigo, icon: 'person-outline' },
  in_progress: { label: 'In Progress', bg: '#F0FDFA', fg: '#14B8A6', icon: 'construct-outline' },
  completed: { label: 'Completed', bg: '#ECFDF5', fg: C.ok, icon: 'checkmark-done-circle' },
};

/* ---------- UTILS ---------- */
const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
};

const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) {
    return s;
  }
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  const cleanTail = tail.replace(/^\/+/, '');
  return `${base}/${cleanTail}`;
};

/* ---------- TAB BUTTON ---------- */
function TabButton({ label, active, count, onPress }) {
  return (
    <TouchableOpacity
      style={[st.tabBtn, active && st.tabBtnActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[st.tabLabel, active && st.tabLabelActive]}>{label}</Text>
      {count > 0 && (
        <View style={[st.tabBadge, active && st.tabBadgeActive]}>
          <Text style={[st.tabBadgeText, active && st.tabBadgeTextActive]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

/* ---------- ORDER CARD ---------- */
function OrderCard({ order, onPress }) {
  const status = STATUS_MAP[order.status] || STATUS_MAP[order.tracking_status] || STATUS_MAP.Pending;
  const imageUrl = order.image ? toStorageUrl(order.image) : null;

  return (
    <TouchableOpacity style={st.card} onPress={onPress} activeOpacity={0.8}>
      <View style={st.cardRow}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={st.cardImage} />
        ) : (
          <View style={[st.cardImage, st.cardImagePlaceholder]}>
            <Icon name="cube-outline" size={24} color={C.muted} />
          </View>
        )}
        <View style={st.cardContent}>
          <View style={st.cardHeader}>
            <Text style={st.orderId}>{order.order_id}</Text>
            <View style={[st.statusBadge, { backgroundColor: status.bg }]}>
              <Icon name={status.icon} size={12} color={status.fg} />
              <Text style={[st.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={st.productName} numberOfLines={1}>{order.product_name}</Text>
          <View style={st.cardMeta}>
            <Icon name="location-outline" size={14} color={C.muted} />
            <Text style={st.metaText} numberOfLines={1}>{order.restaurant_name || order.location}</Text>
          </View>
          <View style={st.cardMeta}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={st.metaText}>{formatDate(order.service_date || order.created_at)}</Text>
          </View>
          {order.engineer && (
            <View style={st.cardMeta}>
              <Icon name="person-outline" size={14} color={C.indigo} />
              <Text style={[st.metaText, { color: C.indigo }]}>{order.engineer.name}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-forward" size={20} color={C.muted} />
      </View>
    </TouchableOpacity>
  );
}

/* ---------- EMPTY STATE ---------- */
function EmptyState({ type }) {
  const isActive = type === 'active';
  return (
    <View style={st.empty}>
      <Icon
        name={isActive ? 'clipboard-outline' : 'checkmark-done-circle-outline'}
        size={64}
        color={C.muted}
      />
      <Text style={st.emptyTitle}>
        {isActive ? 'No Active Orders' : 'No Past Orders'}
      </Text>
      <Text style={st.emptyText}>
        {isActive
          ? 'You don\'t have any active service requests at the moment.'
          : 'Your completed orders will appear here.'}
      </Text>
    </View>
  );
}

/* ---------- MAIN COMPONENT ---------- */
export default function OrdersListScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'past'
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [counts, setCounts] = useState({ active: 0, past: 0 });

  // Fetch orders
  const fetchOrders = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const status = activeTab === 'active' ? 'active' : 'completed';
      const res = await api.get(`/app_api/owner/orders?status=${status}`);

      if (res.data?.success) {
        setOrders(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  // Fetch counts for both tabs
  const fetchCounts = useCallback(async () => {
    try {
      const [activeRes, pastRes] = await Promise.all([
        api.get('/app_api/owner/orders?status=active'),
        api.get('/app_api/owner/orders?status=completed')
      ]);
      setCounts({
        active: activeRes.data?.total || activeRes.data?.data?.length || 0,
        past: pastRes.data?.total || pastRes.data?.data?.length || 0
      });
    } catch (err) {
      console.error('Failed to fetch counts:', err);
    }
  }, []);

  useEffect(() => {
    fetchOrders();
  }, [activeTab, fetchOrders]);

  useEffect(() => {
    fetchCounts();
  }, [fetchCounts]);

  // Refresh on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchOrders();
      fetchCounts();
    });
    return unsubscribe;
  }, [navigation, fetchOrders, fetchCounts]);

  const handleOrderPress = (order) => {
    navigation.navigate('OrderTracking', { orderId: order.id });
  };

  const renderItem = ({ item }) => (
    <OrderCard order={item} onPress={() => handleOrderPress(item)} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
          <Icon name="chevron-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.hTitle}>My Orders</Text>
        <View style={st.hBtn} />
      </View>

      {/* Tabs */}
      <View style={st.tabs}>
        <TabButton
          label="Active"
          active={activeTab === 'active'}
          count={counts.active}
          onPress={() => setActiveTab('active')}
        />
        <TabButton
          label="Past Orders"
          active={activeTab === 'past'}
          count={counts.past}
          onPress={() => setActiveTab('past')}
        />
      </View>

      {/* Content */}
      {loading ? (
        <View style={st.loader}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loaderText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderItem}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 8,
            paddingBottom: insets.bottom + 20
          }}
          ListEmptyComponent={<EmptyState type={activeTab} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => fetchOrders(true)}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  hBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hTitle: {
    color: C.ink,
    fontSize: 20,
    fontWeight: '800'
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.muted
  },
  tabLabelActive: {
    color: '#fff'
  },
  tabBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    backgroundColor: '#F3F4F6'
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  tabBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.muted
  },
  tabBadgeTextActive: {
    color: '#fff'
  },

  loader: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },
  loaderText: {
    marginTop: 12,
    color: C.muted,
    fontSize: 14
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: R,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 14
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  cardImage: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: '#F3F4F6'
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContent: {
    flex: 1,
    gap: 4
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8
  },
  orderId: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700'
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.text
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  metaText: {
    fontSize: 12,
    color: C.muted,
    flex: 1
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60
  },
  emptyTitle: {
    marginTop: 16,
    fontSize: 18,
    fontWeight: '700',
    color: C.ink
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    paddingHorizontal: 40
  }
});
