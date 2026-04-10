// screens/OrdersListScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, Image,
  RefreshControl, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, IMAGE_BASE_URL } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
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
            <Icon name="cube-outline" size={scale(24)} color={C.muted} />
          </View>
        )}
        <View style={st.cardContent}>
          <View style={st.cardHeader}>
            <Text style={st.orderId}>{order.order_id}</Text>
            <View style={[st.statusBadge, { backgroundColor: status.bg }]}>
              <Icon name={status.icon} size={scale(12)} color={status.fg} />
              <Text style={[st.statusText, { color: status.fg }]}>{status.label}</Text>
            </View>
          </View>
          <Text style={st.productName} numberOfLines={1}>{order.product_name}</Text>
          <View style={st.cardMeta}>
            <Icon name="location-outline" size={scale(14)} color={C.muted} />
            <Text style={st.metaText} numberOfLines={1}>{order.restaurant_name || order.location}</Text>
          </View>
          <View style={st.cardMeta}>
            <Icon name="calendar-outline" size={scale(14)} color={C.muted} />
            <Text style={st.metaText}>{formatDate(order.service_date || order.created_at)}</Text>
          </View>
          {order.engineer && (
            <View style={st.cardMeta}>
              <Icon name="person-outline" size={scale(14)} color={C.indigo} />
              <Text style={[st.metaText, { color: C.indigo }]}>{order.engineer.name}</Text>
            </View>
          )}
        </View>
        <Icon name="chevron-forward" size={scale(20)} color={C.muted} />
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
        size={scale(64)}
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [counts, setCounts] = useState({ active: 0, past: 0 });
  const [menuVisible, setMenuVisible] = useState(false);

  // Fetch orders
  const fetchOrders = useCallback(async (pageNum = 1, append = false) => {
    try {
      if (pageNum === 1 && !append) setLoading(true);
      else if (append) setLoadingMore(true);

      const status = activeTab === 'active' ? 'active' : 'completed';
      const res = await api.get(`/app_api/owner/orders?status=${status}&page=${pageNum}&pageSize=20`);

      if (res.data?.success || res.data?.ok) {
        const items = res.data.data?.items || res.data.data || [];
        const total = res.data.data?.total || res.data.total || 0;
        if (append) {
          setOrders(prev => {
            const ids = new Set(prev.map(i => i.id));
            return [...prev, ...items.filter(i => !ids.has(i.id))];
          });
        } else {
          setOrders(items);
        }
        setPage(pageNum);
        setHasMore(pageNum * 20 < total);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [activeTab]);

  const handleLoadMore = useCallback(() => {
    if (!loadingMore && hasMore && !loading) fetchOrders(page + 1, true);
  }, [loadingMore, hasMore, loading, page, fetchOrders]);

  const renderFooter = useCallback(() => {
    if (!loadingMore) return null;
    return <View style={{ padding: 16, alignItems: 'center' }}><ActivityIndicator size="small" color="#EF3A3A" /></View>;
  }, [loadingMore]);

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
    setPage(1);
    setHasMore(true);
    fetchOrders(1, false);
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
          <Icon name="chevron-back" size={scale(20)} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.hTitle}>My Orders</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
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
            paddingHorizontal: scale(16),
            paddingTop: scale(8),
            paddingBottom: insets.bottom + scale(20)
          }}
          ListEmptyComponent={<EmptyState type={activeTab} />}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => { setPage(1); setHasMore(true); setRefreshing(true); fetchOrders(1, false); }}
              colors={[C.primary]}
              tintColor={C.primary}
            />
          }
          ItemSeparatorComponent={() => <View style={{ height: scale(12) }} />}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          showsVerticalScrollIndicator={false}
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      )}
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  hBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hTitle: {
    color: C.ink,
    fontSize: moderateScale(20),
    fontWeight: '800'
  },

  tabs: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(12),
    marginBottom: scale(8)
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
    borderRadius: scale(14),
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: C.border
  },
  tabBtnActive: {
    backgroundColor: C.primary,
    borderColor: C.primary
  },
  tabLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.muted
  },
  tabLabelActive: {
    color: '#fff'
  },
  tabBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
    backgroundColor: '#F3F4F6'
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)'
  },
  tabBadgeText: {
    fontSize: moderateScale(12),
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
    marginTop: scale(12),
    color: C.muted,
    fontSize: moderateScale(14)
  },

  card: {
    backgroundColor: '#fff',
    borderRadius: R,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: scale(14)
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12)
  },
  cardImage: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(12),
    backgroundColor: '#F3F4F6'
  },
  cardImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center'
  },
  cardContent: {
    flex: 1,
    gap: scale(4)
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: scale(8)
  },
  orderId: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8)
  },
  statusText: {
    fontSize: moderateScale(11),
    fontWeight: '700'
  },
  productName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.text
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6)
  },
  metaText: {
    fontSize: moderateScale(12),
    color: C.muted,
    flex: 1
  },

  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60)
  },
  emptyTitle: {
    marginTop: scale(16),
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink
  },
  emptyText: {
    marginTop: scale(8),
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    paddingHorizontal: scale(40)
  }
});
