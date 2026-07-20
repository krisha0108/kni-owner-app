// screens/Notifications.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Animated,
  RefreshControl, ScrollView, Dimensions, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { resolveNotificationLink } from '../utils/notificationLink';

import { scale, moderateScale } from '../utils/responsive';
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

// Keyed on the real Prisma NotificationType enum (BOOKING, PAYMENT, ORDER,
// AMC, EQUIPMENT, SYSTEM, ANNOUNCEMENT) - see prisma/schema.prisma. TMAP/
// CAT_CONFIG/FILTER_TABS are all derived from this single source so a
// notification's icon, category bucket, and filter tab always agree.
const TYPE_CONFIG = {
  BOOKING:      { ic: 'calendar',           gradient: ['#60A5FA', '#3B82F6'], label: 'Booking',      color: '#2563EB', lightBg: '#DBEAFE' },
  PAYMENT:      { ic: 'card',               gradient: ['#34D399', '#059669'], label: 'Payment',      color: '#059669', lightBg: '#D1FAE5' },
  ORDER:        { ic: 'cube',               gradient: ['#2DD4BF', '#14B8A6'], label: 'Order',        color: '#0D9488', lightBg: '#CCFBF1' },
  AMC:          { ic: 'shield-checkmark',   gradient: ['#818CF8', '#4F46E5'], label: 'AMC',          color: '#4F46E5', lightBg: '#E0E7FF' },
  EQUIPMENT:    { ic: 'construct',          gradient: ['#FBBF24', '#D97706'], label: 'Equipment',    color: '#D97706', lightBg: '#FEF3C7' },
  SYSTEM:       { ic: 'notifications',      gradient: ['#94A3B8', '#64748B'], label: 'System',       color: '#475569', lightBg: '#F1F5F9' },
  ANNOUNCEMENT: { ic: 'megaphone',          gradient: ['#A78BFA', '#7C3AED'], label: 'Announcement', color: '#7C3AED', lightBg: '#EDE9FE' },
};

const DEFAULT_TYPE = { ic: 'notifications-outline', gradient: ['#94A3B8', '#64748B'], label: 'Notification', color: '#64748B', lightBg: '#F1F5F9' };

const TMAP = TYPE_CONFIG;
const CAT_CONFIG = TYPE_CONFIG;

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: 'apps' },
  ...Object.entries(TYPE_CONFIG).map(([key, cfg]) => ({ key, label: cfg.label, icon: cfg.ic })),
];

const getCatKey = (type) => (TYPE_CONFIG[type] ? type : 'SYSTEM');

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
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(8) }}>
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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const PAGE_SIZE = 20;

  const pulse = useRef(new Animated.Value(0.5)).current;

  const mapNotification = (n) => ({
    id: n.id,
    type: n.type || 'SYSTEM',
    title: n.title,
    body: n.message,
    ts: n.createdAt || n.created_at,
    unread: !n.isRead && !n.is_read,
    linkUrl: n.linkUrl,
    meta: {
      notificationId: n.id,
    }
  });

  const fetchNotifications = useCallback(async (userOwnerId = null, userToken = null, pageNum = 1, append = false) => {
    try {
      if (pageNum === 1) setLoading(true);
      else setLoadingMore(true);
      const currentOwnerId = userOwnerId || ownerId;
      const currentToken = userToken || token;
      if (!currentOwnerId || !currentToken) { setLoading(false); return; }
      const res = await api.get(`/owner/notifications?page=${pageNum}&pageSize=${PAGE_SIZE}`, { headers: { Authorization: `Bearer ${currentToken}` } });
      const json = res.data;

      let arr = [];
      let total = 0;
      if (json?.data?.items) {
        arr = json.data.items;
        total = json.data.total || json.total || 0;
      } else {
        arr = json?.data || (Array.isArray(json) ? json : []);
        total = json?.total || arr.length;
      }

      setTotalNotifCount(total);

      if (arr && Array.isArray(arr) && arr.length > 0) {
        const mapped = arr.map(mapNotification);
        if (append) {
          setItems(prev => {
            const existingIds = new Set(prev.map(n => n.id));
            const uniqueNew = mapped.filter(n => !existingIds.has(n.id));
            return [...prev, ...uniqueNew];
          });
        } else {
          setItems(mapped);
        }
        setHasMore(pageNum * PAGE_SIZE < total);
        setPage(pageNum);
      } else if (pageNum === 1) {
        setItems([]);
        setHasMore(false);
      } else {
        setHasMore(false);
      }
    } catch (e) {
      console.log("Error fetching notifications:", e.message);
      if (pageNum === 1) setItems([]);
    } finally { setLoading(false); setRefreshing(false); setLoadingMore(false); }
  }, [ownerId, token]);

  const initializeUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const authToken = await AsyncStorage.getItem('userToken');
      if (userData && authToken) {
        const user = JSON.parse(userData);
        setOwnerId(user.id);
        setToken(authToken);
        fetchNotifications(user.id, authToken, 1, false);
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
    const c = { all: totalNotifCount || items.length };
    Object.keys(TYPE_CONFIG).forEach(key => { c[key] = 0; });
    items.forEach(x => { c[getCatKey(x.type)]++; });
    return c;
  }, [items]);

  const filtered = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter(x => getCatKey(x.type) === filter);
  }, [items, filter]);

  const sections = useMemo(() => loading ? [] : groupSections(filtered), [filtered, loading]);

  const onRefresh = () => { setRefreshing(true); setPage(1); setHasMore(true); fetchNotifications(null, null, 1, false); };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      fetchNotifications(null, null, page + 1, true);
    }
  };

  const renderFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: scale(16), alignItems: 'center' }}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  };

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


  const openItem = (n) => {
    const link = resolveNotificationLink(n.linkUrl);
    if (link) {
      navigation.navigate?.(link.screen, link.params);
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

  const [realUnreadCount, setRealUnreadCount] = useState(0);
  const [totalNotifCount, setTotalNotifCount] = useState(0);

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (response.data?.ok) {
          setRealUnreadCount(response.data.data?.count || 0);
        }
        const allResponse = await api.get('/notifications?page=1&pageSize=1');
        if (allResponse.data?.ok) {
          setTotalNotifCount(allResponse.data.data?.total || allResponse.data.total || items.length);
        }
      } catch (e) {}
    };
    fetchCounts();
  }, [items]);

  const unreadCount = realUnreadCount;

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
              <Icon name={tm.ic} size={scale(18)} color="#fff" />
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
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <Icon name="time-outline" size={scale(12)} color={C.muted} />
              <Text style={st.footerMeta}>
                {new Date(item.ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4) }}>
              <Text style={st.footerMeta}>View</Text>
              <Icon name="chevron-forward" size={scale(14)} color={C.muted} />
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
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', gap: scale(8) }}>
          <TouchableOpacity onPress={onRefresh} style={[st.backBtn, refreshing && { opacity: 0.5 }]} disabled={refreshing}>
            <Icon name="refresh" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllRead} style={st.backBtn}>
            <Icon name="checkmark-done" size={scale(18)} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ─── Summary Grid ─── */}
      <View style={st.summarySection}>
        <View style={st.summaryGrid}>
          <TouchableOpacity
            style={[st.summaryCard, filter === 'ORDER' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'ORDER' ? 'all' : 'ORDER')}
          >
            <LinearGradient colors={['#DBEAFE', '#BFDBFE']} style={st.summaryIconCircle}>
              <Icon name="cube" size={scale(18)} color="#2563EB" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.ORDER}</Text>
            <Text style={st.summaryLabel}>Orders</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'EQUIPMENT' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'EQUIPMENT' ? 'all' : 'EQUIPMENT')}
          >
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={st.summaryIconCircle}>
              <Icon name="construct" size={scale(18)} color="#D97706" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.EQUIPMENT}</Text>
            <Text style={st.summaryLabel}>Equipment</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'BOOKING' && st.summaryCardActive]}
            onPress={() => setFilter(filter === 'BOOKING' ? 'all' : 'BOOKING')}
          >
            <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={st.summaryIconCircle}>
              <Icon name="calendar" size={scale(18)} color="#059669" />
            </LinearGradient>
            <Text style={st.summaryCount}>{filterCounts.BOOKING}</Text>
            <Text style={st.summaryLabel}>Bookings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, filter === 'all' && st.summaryCardActive]}
            onPress={() => setFilter('all')}
          >
            <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.summaryIconCircle}>
              <Icon name="notifications" size={scale(18)} color={C.primary} />
            </LinearGradient>
            <Text style={st.summaryCount}>{totalNotifCount || items.length}</Text>
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
                <Icon name={tab.icon} size={scale(14)} color={isActive ? '#fff' : C.muted} style={{ marginRight: scale(5) }} />
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
          contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}
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
          contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
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
                <Icon name="checkmark-done-circle" size={scale(48)} color="#22C55E" />
              </LinearGradient>
              <Text style={st.emptyTitle}>All Caught Up!</Text>
              <Text style={st.emptySubtitle}>
                {filter !== 'all' ? 'No notifications in this category' : 'You have no notifications yet'}
              </Text>
              <TouchableOpacity style={st.emptyRefreshBtn} onPress={onRefresh}>
                <Icon name="refresh" size={scale(16)} color={C.primary} />
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
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  backBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(9),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  countBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: C.primary,
  },

  // ─── Summary Grid ───
  summarySection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    paddingBottom: scale(6),
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: scale(8),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: scale(4),
    elevation: 1,
  },
  summaryCardActive: {
    borderColor: C.primary,
    borderWidth: 1.5,
  },
  summaryIconCircle: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  summaryCount: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: moderateScale(9),
    fontWeight: '600',
    color: C.muted,
    marginTop: scale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Filter Tabs ───
  tabsWrapper: {
    paddingTop: scale(8),
    paddingBottom: scale(4),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  tabsContent: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: scale(6),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(6),
    paddingVertical: 1,
    borderRadius: scale(8),
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: moderateScale(10),
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
    paddingHorizontal: scale(16),
    marginTop: scale(14),
    marginBottom: scale(8),
    gap: scale(8),
  },
  sectionDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: C.primary,
  },
  sectionTitle: {
    color: C.ink,
    fontWeight: '800',
    fontSize: moderateScale(13),
  },
  sectionCountPill: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(7),
    paddingVertical: scale(2),
    borderRadius: scale(8),
  },
  sectionCountText: {
    fontSize: moderateScale(10),
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
    marginHorizontal: scale(16),
    marginBottom: scale(10),
    backgroundColor: C.card,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  itemCardUnread: {
    borderColor: '#FED7AA',
    backgroundColor: '#FFFBF5',
  },
  itemAccent: {
    height: scale(3),
  },
  itemBody: {
    padding: scale(14),
  },
  itemHeaderRow: {
    flexDirection: 'row',
    gap: scale(12),
    alignItems: 'flex-start',
  },
  typeIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  itemTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    flex: 1,
    marginBottom: scale(4),
  },
  unreadDotSmall: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.primary,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  typePill: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  typePillText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeAgoText: {
    fontSize: moderateScale(11),
    color: C.muted,
  },
  itemDesc: {
    fontSize: moderateScale(13),
    color: C.muted,
    lineHeight: moderateScale(19),
    marginTop: scale(10),
    paddingLeft: scale(52),
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(12),
    paddingLeft: scale(52),
  },
  footerMeta: {
    fontSize: moderateScale(11),
    color: C.muted,
  },

  // ─── Empty State ───
  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(50),
    paddingHorizontal: scale(32),
  },
  emptyIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    marginBottom: scale(20),
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  emptyRefreshText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.primary,
  },

  // ─── Skeleton ───
  skelItem: {
    height: scale(90),
    backgroundColor: '#E9EEF5',
    borderRadius: scale(16),
    marginTop: scale(10),
  },
});
