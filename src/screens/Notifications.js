// screens/Notifications.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Animated,
  RefreshControl, ScrollView, Dimensions, ActivityIndicator, StatusBar
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
      let typeCounts = null;
      if (json?.data?.items) {
        arr = json.data.items;
        total = json.data.total || json.total || 0;
        typeCounts = json.data.typeCounts || null;
      } else {
        arr = json?.data || (Array.isArray(json) ? json : []);
        total = json?.total || arr.length;
      }

      setTotalNotifCount(total);
      if (typeCounts) setServerTypeCounts(typeCounts);

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

  // Category counts (Booking/Payment/Order/...) come from the server's
  // typeCounts breakdown across ALL matching notifications, not just what's
  // loaded so far via pagination - counting only `items` here would make
  // every tab badge silently understate its true total until the user has
  // scrolled through every page (same bug class as My Bookings' status tabs).
  const filterCounts = useMemo(() => {
    const c = { all: totalNotifCount || items.length };
    Object.keys(TYPE_CONFIG).forEach(key => { c[key] = 0; });
    if (serverTypeCounts) {
      Object.entries(serverTypeCounts).forEach(([type, count]) => {
        const key = getCatKey(type);
        c[key] = (c[key] || 0) + count;
      });
    } else {
      items.forEach(x => { c[getCatKey(x.type)]++; });
    }
    return c;
  }, [items, serverTypeCounts, totalNotifCount]);

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
  const [serverTypeCounts, setServerTypeCounts] = useState(null);

  // Total count comes solely from fetchNotifications' own /owner/notifications
  // response (see setTotalNotifCount above) - this used to also fetch it a
  // second time from /notifications?page=1&pageSize=1 (a different endpoint),
  // racing with the first and showing a different number in the header badge
  // vs the "Total" summary tile whenever the two calls landed at different
  // moments. Only the unread badge needs its own endpoint.
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (response.data?.ok) {
          setRealUnreadCount(response.data.data?.count || 0);
        }
      } catch (e) {}
    };
    fetchUnreadCount();
  }, [items]);

  const unreadCount = realUnreadCount;

  /* ───── RENDER NOTIFICATION CARD (Compact Row) ───── */
  const renderCard = ({ item }) => {
    const tm = TMAP[item.type] || DEFAULT_TYPE;

    return (
      <TouchableOpacity activeOpacity={0.85} onPress={() => openItem(item)} style={st.itemRow}>
        <LinearGradient colors={tm.gradient} style={st.rowIconBox}>
          <Icon name={tm.ic} size={scale(14)} color="#fff" />
        </LinearGradient>
        <View style={st.rowInfo}>
          <Text style={st.rowText} numberOfLines={1}>
            <Text style={st.rowTitle}>{item.title}</Text>
            <Text style={st.rowDesc}> · {item.body}</Text>
          </Text>
        </View>
        <View style={st.rowRight}>
          <Text style={st.rowTime}>{timeAgo(item.ts)}</Text>
          {item.unread && <View style={st.unreadDotSmall} />}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* ─── Gradient Header ─── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={() => navigation.goBack?.()} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(18)} color="#fff" />
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
            <Icon name="refresh" size={scale(15)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllRead} style={st.backBtn}>
            <Icon name="checkmark-done" size={scale(15)} color="#fff" />
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* ─── Summary Strip -- one compact non-scrolling row of 4 tiles
          instead of 4 separate cards ─── */}
      <View style={st.summarySection}>
        <View style={st.summaryStrip}>
          {[
            { key: 'ORDER', icon: 'cube', color: '#2563EB', label: 'Orders', value: filterCounts.ORDER },
            { key: 'EQUIPMENT', icon: 'construct', color: '#D97706', label: 'Equipment', value: filterCounts.EQUIPMENT },
            { key: 'BOOKING', icon: 'calendar', color: '#059669', label: 'Bookings', value: filterCounts.BOOKING },
            { key: 'all', icon: 'notifications', color: C.primary, label: 'Total', value: totalNotifCount || items.length },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <View style={st.summaryDivider} />}
              <TouchableOpacity
                style={st.summaryTile}
                onPress={() => setFilter(s.key === 'all' ? 'all' : (filter === s.key ? 'all' : s.key))}
                activeOpacity={0.7}
              >
                <View style={[st.summaryTileIcon, { backgroundColor: s.color + '20' }, filter === s.key && { borderWidth: 1.5, borderColor: s.color }]}>
                  <Icon name={s.icon} size={scale(11)} color={s.color} />
                </View>
                <Text style={st.summaryTileValue} numberOfLines={1}>{s.value}</Text>
                <Text style={st.summaryTileLabel} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
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
                <Icon name={tab.icon} size={scale(12)} color={isActive ? '#fff' : C.muted} style={{ marginRight: scale(4) }} />
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
    paddingBottom: scale(16),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(11),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '900',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(7),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  countBadgeText: {
    fontSize: moderateScale(10.5),
    fontWeight: '800',
    color: C.primary,
  },

  // ─── Summary Strip ───
  summarySection: {
    paddingHorizontal: scale(12),
    paddingTop: scale(8),
    paddingBottom: scale(3),
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(12),
    paddingVertical: scale(7),
    paddingHorizontal: scale(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(5),
    elevation: 2,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scale(2),
  },
  summaryDivider: {
    width: 1,
    height: scale(22),
    backgroundColor: C.border,
  },
  summaryTileIcon: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(7),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(3),
  },
  summaryTileValue: {
    fontSize: moderateScale(10.5),
    fontWeight: '800',
    color: C.ink,
  },
  summaryTileLabel: {
    fontSize: moderateScale(7.5),
    fontWeight: '600',
    color: C.muted,
    marginTop: scale(1),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Filter Tabs ───
  tabsWrapper: {
    paddingTop: scale(5),
    paddingBottom: scale(5),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  tabsContent: {
    paddingHorizontal: scale(16),
    gap: scale(6),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(16),
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: moderateScale(11.5),
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: scale(5),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(5),
    paddingVertical: 1,
    borderRadius: scale(7),
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: moderateScale(9),
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

  // ─── Notification Card (Compact Row) ───
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(9),
    marginHorizontal: scale(16),
    marginBottom: scale(7),
    backgroundColor: C.card,
    borderRadius: scale(12),
    padding: scale(9),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(6),
    elevation: 2,
  },
  rowIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowInfo: { flex: 1, minWidth: 0 },
  rowText: { fontSize: moderateScale(11) },
  rowTitle: { fontWeight: '700', color: C.ink },
  rowDesc: { fontWeight: '500', color: C.muted },
  rowRight: { alignItems: 'flex-end', gap: scale(4) },
  rowTime: { fontSize: moderateScale(9), color: C.muted },
  unreadDotSmall: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: C.primary,
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
    height: scale(50),
    backgroundColor: '#E9EEF5',
    borderRadius: scale(12),
    marginTop: scale(8),
  },
});
