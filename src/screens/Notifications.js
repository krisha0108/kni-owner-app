// screens/Notifications.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Animated,
  RefreshControl, ScrollView, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const { width: W } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  info: '#3B82F6',
};

const TMAP = {
  ticket_seen:            { ic: 'eye',              gradient: ['#0EA5E9', '#0369A1'] },
  ticket_onwork:          { ic: 'construct',         gradient: ['#818CF8', '#4F46E5'] },
  restaurant_approved:    { ic: 'checkmark-circle',  gradient: ['#34D399', '#10B981'] },
  restaurant_rejected:    { ic: 'close-circle',      gradient: ['#F87171', '#EF4444'] },
  eq_request_approved:    { ic: 'cube-outline',      gradient: ['#2DD4BF', '#14B8A6'] },
  engineer_assigned:      { ic: 'people-outline',    gradient: ['#FBBF24', '#F59E0B'] },
  feature:                { ic: 'sparkles-outline',  gradient: ['#A78BFA', '#7C3AED'] },
  update:                 { ic: 'download-outline',  gradient: ['#60A5FA', '#3B82F6'] },
  order_accepted:         { ic: 'checkmark-circle',  gradient: ['#34D399', '#10B981'] },
  order_in_progress:      { ic: 'construct',         gradient: ['#818CF8', '#4F46E5'] },
  order_completed:        { ic: 'checkmark-done',    gradient: ['#34D399', '#059669'] },
  order_update:           { ic: 'cube-outline',      gradient: ['#2DD4BF', '#14B8A6'] },
  completion_approval_required: { ic: 'alert-circle', gradient: ['#FBBF24', '#D97706'] },
  pending_approval:       { ic: 'hourglass-outline', gradient: ['#FBBF24', '#D97706'] },
  approval_required:      { ic: 'alert-circle',      gradient: ['#FBBF24', '#D97706'] },
  work_completed:         { ic: 'checkmark-done',    gradient: ['#FBBF24', '#D97706'] },
};

const DEFAULT_TYPE = { ic: 'notifications-outline', gradient: ['#94A3B8', '#64748B'] };

const CAT_CONFIG = {
  orders:      { label: 'Order',      gradient: ['#60A5FA', '#3B82F6'], color: '#2563EB', lightBg: '#DBEAFE', icon: 'cube' },
  tickets:     { label: 'Ticket',     gradient: ['#FBBF24', '#D97706'], color: '#D97706', lightBg: '#FEF3C7', icon: 'construct' },
  restaurants: { label: 'Restaurant', gradient: ['#34D399', '#10B981'], color: '#059669', lightBg: '#D1FAE5', icon: 'storefront' },
  product:     { label: 'Product',    gradient: ['#A78BFA', '#7C3AED'], color: '#7C3AED', lightBg: '#EDE9FE', icon: 'sparkles' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'orders', label: 'Orders', icon: 'cube' },
  { key: 'tickets', label: 'Tickets', icon: 'construct' },
  { key: 'restaurants', label: 'Restaurants', icon: 'storefront' },
  { key: 'product', label: 'Product', icon: 'sparkles' },
];

const ORDER_TYPES = ['engineer_assigned', 'eq_request_approved', 'completion_approval_required', 'pending_approval', 'approval_required', 'work_completed'];

const getCatKey = (type) => {
  if (type?.startsWith('ticket')) return 'tickets';
  if (type?.startsWith('order_') || ORDER_TYPES.includes(type)) return 'orders';
  if (type?.startsWith('restaurant')) return 'restaurants';
  if (['feature', 'update'].includes(type)) return 'product';
  return 'orders';
};

const relDay = (isoStr) => {
  const d = new Date(isoStr); const t = new Date();
  const diff = Math.floor((t - d) / (24 * 60 * 60 * 1000));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff <= 7) return 'This week';
  return 'Earlier';
};

const groupSections = (arr) => {
  const map = {};
  arr.forEach(n => {
    const k = relDay(n.ts);
    if (!map[k]) map[k] = [];
    map[k].push(n);
  });
  return Object.keys(map).map(k => ({
    title: k,
    data: map[k].sort((a, b) => new Date(b.ts) - new Date(a.ts))
  })).sort((a, b) => {
    const ord = ['Today', 'Yesterday', 'This week', 'Earlier'];
    return ord.indexOf(a.title) - ord.indexOf(b.title);
  });
};

const timeAgo = (ts) => {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
};

function SkeletonList({ pulse }) {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.View key={i} style={[st.skelItem, { opacity: pulse }]} />
      ))}
    </View>
  );
}

export default function Notifications({ navigation }) {
  const insets = useSafeAreaInsets();

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState(null);
  const [token, setToken] = useState(null);

  const pulse = useRef(new Animated.Value(0.5)).current;

  const fetchNotifications = useCallback(async (userOwnerId = null, userToken = null) => {
    try {
      setLoading(true);
      const currentOwnerId = userOwnerId || ownerId;
      const currentToken = userToken || token;
      if (!currentOwnerId || !currentToken) { setLoading(false); return; }
      const res = await api.get('/owner/notifications', { headers: { Authorization: `Bearer ${currentToken}` } });
      const json = res.data;
      const arr = json?.data || (Array.isArray(json) ? json : []);
      if (arr && Array.isArray(arr) && arr.length > 0) {
        setItems(arr.map(n => ({
          id: n.id,
          type: n.type || 'restaurant_approved',
          title: n.title,
          body: n.message,
          ts: n.createdAt || n.created_at,
          unread: !n.isRead && !n.is_read,
          meta: {
            restaurantId: n.restaurant_id,
            notificationId: n.id,
            orderId: n.equipment_request_id || n.order_id,
            equipment_request_id: n.equipment_request_id,
            ticketId: n.ticket_id,
          }
        })));
      } else { setItems([]); }
    } catch (e) {
      console.log("Error fetching notifications:", e.message);
      setItems([]);
    } finally { setLoading(false); setRefreshing(false); }
  }, [ownerId, token]);

  const initializeUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const authToken = await AsyncStorage.getItem('userToken');
      if (userData && authToken) {
        const user = JSON.parse(userData);
        setOwnerId(user.id);
        setToken(authToken);
        fetchNotifications(user.id, authToken);
      } else { setLoading(false); }
    } catch (e) { console.log('Error getting user data:', e); setLoading(false); }
  }, [fetchNotifications]);

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.5, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    initializeUserData();
    return () => { loop.stop(); };
  }, [pulse, initializeUserData]);

  const filterCounts = useMemo(() => {
    const c = { all: items.length, orders: 0, tickets: 0, restaurants: 0, product: 0 };
    items.forEach(x => { c[getCatKey(x.type)]++; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(x => getCatKey(x.type) === filter);
  }, [items, filter]);

  const sections = useMemo(() => loading ? [] : groupSections(filtered), [filtered, loading]);

  const onRefresh = () => { setRefreshing(true); fetchNotifications(); };

  const markNotificationRead = async (id) => {
    try {
      await api.post('/notifications/mark-read', { ids: [id] });
    } catch (e) { console.log('Error marking notification read:', e); }
  };

  const markAllReadApi = async () => {
    try {
      await api.post('/notifications/mark-read', { markAll: true });
    } catch (e) { console.log('Error marking all read:', e); }
  };


  const APPROVAL_NOTIFICATION_TYPES = ['completion_approval_required', 'pending_approval', 'approval_required', 'work_completed'];

  const openItem = (n) => {
    if (n.type === 'eq_request_approved' || n.type === 'engineer_assigned' || n.type.startsWith('order_') || APPROVAL_NOTIFICATION_TYPES.includes(n.type)) {
      if (n.meta?.orderId || n.meta?.equipment_request_id) {
        navigation.navigate?.('OrderTracking', { orderId: n.meta?.orderId || n.meta?.equipment_request_id });
      } else { navigation.navigate?.('Marketplace'); }
    } else {
      navigation.navigate?.('NotificationDetail', { notification: n });
    }
    setItems(prev => prev.map(x => x.id === n.id ? { ...x, unread: false } : x));
    markNotificationRead(n.id);
  };

  const markAllRead = () => {
    setItems(prev => prev.map(n => ({ ...n, unread: false })));
    markAllReadApi();
  };

  const unreadCount = useMemo(() => items.filter(x => x.unread).length, [items]);

  /* ───── RENDER NOTIFICATION CARD ───── */
  const renderCard = ({ item }) => {
    const tm = TMAP[item.type] || DEFAULT_TYPE;
    const catKey = getCatKey(item.type);
    const cat = CAT_CONFIG[catKey] || CAT_CONFIG.orders;

    return (
      <TouchableOpacity activeOpacity={0.92} onPress={() => openItem(item)} style={[st.itemCard, item.unread && st.itemCardUnread]}>
        <LinearGradient colors={tm.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.itemAccent} />
        <View style={st.itemBody}>
          {/* Header Row */}
          <View style={st.itemHeaderRow}>
            <LinearGradient colors={tm.gradient} style={st.typeIconBox}>
              <Icon name={tm.ic} size={18} color="#fff" />
            </LinearGradient>
            <View style={st.itemHeaderInfo}>
              <View style={st.itemTitleRow}>
                <Text style={st.itemTitle} numberOfLines={1}>{item.title}</Text>
                {item.unread && <View style={st.unreadDotSmall} />}
              </View>
              <View style={st.itemMetaRow}>
                <View style={[st.typePill, { backgroundColor: cat.lightBg }]}>
                  <Text style={[st.typePillText, { color: cat.color }]}>{cat.label}</Text>
                </View>
                <Text style={st.timeAgoText}>{timeAgo(item.ts)}</Text>
              </View>
            </View>
          </View>

          {/* Body */}
          <Text style={st.itemDesc} numberOfLines={2}>{item.body}</Text>

          {/* Footer */}
          <View style={st.itemFooter}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Icon name="time-outline" size={12} color={C.muted} />
              <Text style={st.footerMeta}>
                {new Date(item.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Text style={st.footerMeta}>View</Text>
              <Icon name="chevron-forward" size={14} color={C.muted} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* ─── Gradient Header ─── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack?.()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <TouchableOpacity onPress={onRefresh} style={[st.backBtn, refreshing && { opacity: 0.5 }]} disabled={refreshing}>
            <Icon name="refresh" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllRead} style={st.backBtn}>
            <Icon name="checkmark-done" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ─── Summary Grid ─── */}
      <View style={st.summarySection}>
        <View style={st.summaryGrid}>
          <TouchableOpacity
            style={[st.summaryCard, filter === 'orders' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'orders' ? 'all' : 'orders')}
          >
            <LinearGradient colors={['#DBEAFE', '#BFDBFE']} style={st.summaryIconCircle}>
              <Icon name="cube" size={18} color="#2563EB" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.orders}</Text>
            <Text style={st.summaryLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'tickets' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'tickets' ? 'all' : 'tickets')}
          >
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={st.summaryIconCircle}>
              <Icon name="construct" size={18} color="#D97706" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.tickets}</Text>
            <Text style={st.summaryLabel}>Tickets</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'restaurants' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'restaurants' ? 'all' : 'restaurants')}
          >
            <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={st.summaryIconCircle}>
              <Icon name="storefront" size={18} color="#059669" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.restaurants}</Text>
            <Text style={st.summaryLabel}>Restaurants</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'all' && st.summaryCardActive]}
            onPress={() => setFilter('all')}
          >
            <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.summaryIconCircle}>
              <Icon name="notifications" size={18} color={C.primary} />
            </LinearGradient>
            <Text style={st.summaryCount}>{items.length}</Text>
            <Text style={st.summaryLabel}>Total</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Filter Tabs ─── */}
      <View style={st.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabsContent}>
          {FILTER_TABS.map((tab) => {
            const isActive = filter === tab.key;
            const cnt = tab.key === 'all' ? null : (filterCounts[tab.key] || 0);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.tab, isActive && st.tabActive]}
                onPress={() => setFilter(tab.key)}
                activeOpacity={0.7}
              >
                <Icon name={tab.icon} size={14} color={isActive ? '#fff' : C.muted} style={{ marginRight: 5 }} />
                <Text style={[st.tabText, isActive && st.tabTextActive]}>{tab.label}</Text>
                {cnt !== null && cnt > 0 && (
                  <View style={[st.tabBadge, isActive && st.tabBadgeActive]}>
                    <Text style={[st.tabBadgeText, isActive && st.tabBadgeTextActive]}>{cnt}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ─── Content ─── */}
      {loading ? (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          showsVerticalScrollIndicator={false}
        >
          <SkeletonList pulse={pulse} />
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id.toString()}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          renderSectionHeader={({ section: { title, data } }) => (
            <View style={st.sectionHeaderRow}>
              <View style={st.sectionDot} />
              <Text style={st.sectionTitle}>{title}</Text>
              <View style={st.sectionCountPill}>
                <Text style={st.sectionCountText}>{data.length}</Text>
              </View>
              <View style={st.sectionLine} />
            </View>
          )}
          renderItem={renderCard}
          ListEmptyComponent={
            <View style={st.emptyBox}>
              <LinearGradient colors={['#F0FDF4', '#DCFCE7']} style={st.emptyIconCircle}>
                <Icon name="checkmark-done-circle" size={48} color="#22C55E" />
              </LinearGradient>
              <Text style={st.emptyTitle}>All Caught Up!</Text>
              <Text style={st.emptySubtitle}>
                {filter !== 'all' ? 'No notifications in this category' : 'You have no notifications yet'}
              </Text>
              <TouchableOpacity style={st.emptyRefreshBtn} onPress={onRefresh}>
                <Icon name="refresh" size={16} color={C.primary} />
                <Text style={st.emptyRefreshText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════ */
/*                    STYLES                      */
/* ═══════════════════════════════════════════════ */
const st = StyleSheet.create({
  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
  },

  // ─── Summary Grid ───
  summarySection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryCardActive: {
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Filter Tabs ───
  tabsWrapper: {
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },

  // ─── Section Headers ───
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 14,
    marginBottom: 8,
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.primary,
  },
  sectionTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: 13,
  },
  sectionCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  sectionCountText: {
    fontSize: 10,
    fontWeight: '700',
    color: C.muted,
  },
  sectionLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },

  // ─── Notification Card ───
  itemCard: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: C.card,
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemCardUnread: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
  },
  itemAccent: {
    height: 3,
  },
  itemBody: {
    padding: 14,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    flex: 1,
    marginBottom: 4,
  },
  unreadDotSmall: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeAgoText: {
    fontSize: 11,
    color: C.muted,
  },
  itemDesc: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
    marginTop: 10,
    paddingLeft: 52,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingLeft: 52,
  },
  footerMeta: {
    fontSize: 11,
    color: C.muted,
  },

  // ─── Empty State ───
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 32,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  emptyRefreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },

  // ─── Skeleton ───
  skelItem: {
    height: 90,
    backgroundColor: '#E9EEF5',
    borderRadius: 16,
    marginTop: 10,
  },
});
