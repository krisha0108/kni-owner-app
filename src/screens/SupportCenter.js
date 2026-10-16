import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Animated, ScrollView, TextInput, Linking, Dimensions,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { isStale, markFetched } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
import NavigationMenu from '../components/NavigationMenu';
import { RestaurantSelectorCard } from '../components/RestaurantSelector';
const { width: W, height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
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

const CATEGORY_CONFIG = {
  General:   { icon: 'help-circle', gradient: ['#6366F1', '#4F46E5'], bg: '#EEF2FF', color: '#4F46E5', lightBg: '#E0E7FF' },
  Equipment: { icon: 'hardware-chip', gradient: ['#F97316', '#EA580C'], bg: '#FFF7ED', color: '#EA580C', lightBg: '#FFEDD5' },
  Billing:   { icon: 'card', gradient: ['#10B981', '#059669'], bg: '#ECFDF5', color: '#059669', lightBg: '#D1FAE5' },
  Service:   { icon: 'construct', gradient: ['#3B82F6', '#1D4ED8'], bg: '#EFF6FF', color: '#2563EB', lightBg: '#DBEAFE' },
  Account:   { icon: 'person', gradient: ['#8B5CF6', '#6D28D9'], bg: '#F5F3FF', color: '#7C3AED', lightBg: '#EDE9FE' },
  Other:     { icon: 'ellipsis-horizontal', gradient: ['#94A3B8', '#64748B'], bg: '#F8FAFC', color: '#64748B', lightBg: '#E2E8F0' },
};

const STATUS_CONFIG = {
  PENDING:    { gradient: ['#FBBF24', '#F59E0B'], icon: 'time', label: 'Pending', bg: '#FEF3C7', color: '#D97706' },
  SEEN:       { gradient: ['#60A5FA', '#2563EB'], icon: 'eye', label: 'Seen', bg: '#DBEAFE', color: '#2563EB' },
  ON_WORK:    { gradient: ['#818CF8', '#4F46E5'], icon: 'construct', label: 'On Work', bg: '#E0E7FF', color: '#4F46E5' },
  COMPLETED:  { gradient: ['#34D399', '#059669'], icon: 'checkmark-circle', label: 'Completed', bg: '#D1FAE5', color: '#059669' },
  REJECTED:   { gradient: ['#F87171', '#DC2626'], icon: 'close-circle', label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
  pending:    { gradient: ['#FBBF24', '#F59E0B'], icon: 'time', label: 'Pending', bg: '#FEF3C7', color: '#D97706' },
  seen:       { gradient: ['#60A5FA', '#2563EB'], icon: 'eye', label: 'Seen', bg: '#DBEAFE', color: '#2563EB' },
  onwork:     { gradient: ['#818CF8', '#4F46E5'], icon: 'construct', label: 'On Work', bg: '#E0E7FF', color: '#4F46E5' },
  completed:  { gradient: ['#34D399', '#059669'], icon: 'checkmark-circle', label: 'Completed', bg: '#D1FAE5', color: '#059669' },
  rejected:   { gradient: ['#F87171', '#DC2626'], icon: 'close-circle', label: 'Rejected', bg: '#FEE2E2', color: '#DC2626' },
};

const FILTER_TABS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'PENDING', label: 'Pending', icon: 'time' },
  { key: 'SEEN', label: 'Seen', icon: 'eye' },
  { key: 'ON_WORK', label: 'On Work', icon: 'construct' },
  { key: 'COMPLETED', label: 'Done', icon: 'checkmark-circle' },
  { key: 'REJECTED', label: 'Rejected', icon: 'close-circle' },
];

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTimeAgo = (d) => {
  if (!d) return '';
  const diff = Math.floor((Date.now() - new Date(d)) / 1000);
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return formatDate(d);
};

/* ─── Skeleton ─── */
function SkeletonTickets({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(16), paddingTop: scale(14) }}>
      {[1, 2, 3, 4].map(i => (
        <View key={i} style={st.itemCard}>
          <Animated.View style={[st.itemAccent, { backgroundColor: '#E2E8F0' }]} />
          <View style={st.itemBody}>
            <View style={st.itemHeaderRow}>
              <Animated.View style={[st.typeIconBox, { backgroundColor: '#E2E8F0', opacity: pulse }]} />
              <View style={st.itemHeaderInfo}>
                <Animated.View style={[st.skelLine, { width: '80%', opacity: pulse }]} />
                <View style={[st.itemMetaRow, { marginTop: scale(8) }]}>
                  <Animated.View style={[st.skelChip, { opacity: pulse }]} />
                  <Animated.View style={[st.skelMeta, { opacity: pulse }]} />
                </View>
              </View>
            </View>
            <View style={st.itemFooter}>
              <Animated.View style={[st.skelChip, { opacity: pulse }]} />
              <Animated.View style={[st.skelMeta, { width: scale(60), opacity: pulse }]} />
            </View>
            <View style={st.actionRow}>
              <Animated.View style={[st.actionButton, { backgroundColor: '#E2E8F0', borderWidth: 0, opacity: pulse }]} />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function SupportCenter({ navigation }) {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadTickets = useCallback(async (restaurantId, pageNum = 1, append = false) => {
    if (!restaurantId) return;

    if (pageNum === 1 && !append) setLoading(true);
    else if (pageNum > 1) setLoadingMore(true);

    try {
      const params = new URLSearchParams({ restaurantId, page: pageNum.toString(), pageSize: '20' });
      const response = await api.get(`/owner/support?${params}`);
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
          if (append) {
            setTickets(prev => {
              const existingIds = new Set(prev.map(t => t.id));
              const uniqueNew = items.filter(t => !existingIds.has(t.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setTickets(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setTickets(responseData || []);
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error('Error loading tickets:', e);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, []);

  const loadData = useCallback(async (restaurantId = null) => {
    try {
      setLoading(true);
      const restaurantsRes = await api.get('/owner/restaurants/accessible');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const approved = restaurantsRes.data.data.map(item => ({
          ...item.restaurant,
          restaurantRole: item.role,
        }));
        setRestaurants(approved);
        let target = null;
        if (restaurantId) target = approved.find(r => r.id === restaurantId);
        if (!target && approved.length > 0) target = approved[0];
        if (target) {
          setCurrentRestaurant(target);
          setPage(1);
          setHasMore(true);
          await loadTickets(target.id, 1, false);
        }
      }
    } catch (e) {
      console.error('Error loading support data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [loadTickets]);

  useFocusEffect(useCallback(() => {
    const key = `SupportCenter-${currentRestaurant?.id}`;
    if (isStale(key) || tickets.length === 0) {
      // Pass the currently-selected restaurant through explicitly - loadData()
      // called with no id falls back to the FIRST restaurant in the owner's
      // list, which was silently reverting the user's restaurant selection
      // back to the default one on every re-focus/re-fetch.
      loadData(currentRestaurant?.id);
      markFetched(key);
    }
    // Depend on currentRestaurant?.id, not the currentRestaurant object itself -
    // loadData() sets a freshly-built restaurant object on every call (new
    // reference even for the same restaurant), so depending on the object
    // re-triggers this effect after every fetch. Combined with the
    // tickets.length === 0 check (which never becomes false when there's
    // genuinely no data), that produced an infinite fetch loop - the
    // loading/content flip on every cycle showed up as continuous blinking
    // whenever a restaurant had zero support tickets.
  }, [loadData, currentRestaurant?.id, tickets.length]));

  const selectRestaurant = (r) => {
    if (r.id !== currentRestaurant?.id) {
      setCurrentRestaurant(r);
      setTickets([]);
      setPage(1);
      setHasMore(true);
      loadData(r.id);
      markFetched(`SupportCenter-${r.id}`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadData(currentRestaurant?.id);
    markFetched(`SupportCenter-${currentRestaurant?.id}`);
  };

  const handleStatusTabChange = (statusKey) => {
    setActiveTab(statusKey);
  };

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading && currentRestaurant?.id) {
      loadTickets(currentRestaurant.id, page + 1, true);
    }
  };

  const renderListFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#EF3A3A" />
      </View>
    );
  };

  const filteredTickets = useMemo(() => {
    let result = tickets;
    if (activeTab !== 'all') {
      result = result.filter(t => (t.status?.toUpperCase() || 'PENDING') === activeTab);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.title?.toLowerCase().includes(q) ||
        t.id?.toLowerCase().includes(q) ||
        t.category?.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q)
      );
    }
    return result;
  }, [tickets, activeTab, searchQuery]);

  const statusCounts = useMemo(() => {
    const c = { all: tickets.length };
    tickets.forEach(t => {
      const s = t.status?.toUpperCase() || 'PENDING';
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [tickets]);

  const getStatus = (status) => STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;

  const openTicketDetail = (ticket) => {
    navigation.navigate('SupportTicketDetail', { ticketId: ticket.id });
  };

  const handleDeleteTicket = (ticketId) => {
    AppAlert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/support/${ticketId}`);
            AppAlert.alert('Success', 'Ticket deleted successfully');
            loadData(currentRestaurant?.id);
          } catch (e) { AppAlert.alert('Error', e?.response?.data?.error || 'Failed to delete ticket'); }
        },
      },
    ]);
  };

  const callSupport = () => { Linking.openURL('tel:+919999999999'); };

  /* ───── TICKET CARD ───── */
  const renderTicketCard = ({ item }) => {
    const catCfg = CATEGORY_CONFIG[item.category] || CATEGORY_CONFIG.General;
    const stCfg = getStatus(item.status);
    const replies = item._count?.threads || item.threads?.length || 0;

    return (
      <TouchableOpacity style={st.itemCard} onPress={() => openTicketDetail(item)} activeOpacity={0.92}>
        <LinearGradient colors={catCfg.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.itemAccent} />
        <View style={st.itemBody}>
          {/* Header row */}
          <View style={st.itemHeaderRow}>
            <LinearGradient colors={catCfg.gradient} style={st.typeIconBox}>
              <Icon name={catCfg.icon} size={scale(18)} color="#fff" />
            </LinearGradient>
            <View style={st.itemHeaderInfo}>
              <Text style={st.itemTitle} numberOfLines={2}>{item.title}</Text>
              <View style={st.itemMetaRow}>
                <View style={[st.typePill, { backgroundColor: catCfg.lightBg }]}>
                  <Text style={[st.typePillText, { color: catCfg.color }]}>{item.category || 'General'}</Text>
                </View>
                <Text style={st.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Equipment */}
          {item.equipmentName ? (
            <View style={st.equipmentRow}>
              <Icon name="hardware-chip-outline" size={scale(13)} color={C.muted} />
              <Text style={st.equipmentText}>{item.equipmentName}</Text>
            </View>
          ) : null}

          {/* Footer */}
          <View style={st.itemFooter}>
            <View style={[st.statusChip, { backgroundColor: stCfg.bg }]}>
              <Icon name={stCfg.icon} size={scale(13)} color={stCfg.color} />
              <Text style={[st.statusChipText, { color: stCfg.color }]}>{stCfg.label}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(3) }}>
                <Icon name="chatbubble-outline" size={scale(12)} color={C.muted} />
                <Text style={st.footerMeta}>{replies}</Text>
              </View>
              <Text style={st.footerMeta}>#{item.ticketNumber ?? item.id?.slice(0, 8)}</Text>
            </View>
          </View>

          {/* Action */}
          <View style={st.actionRow}>
            <TouchableOpacity style={st.actionButton} onPress={() => openTicketDetail(item)} activeOpacity={0.7}>
              <Icon name="eye-outline" size={scale(16)} color={C.info} />
              <Text style={st.actionButtonText}>View Details</Text>
              <Icon name="chevron-forward" size={scale(14)} color={C.info} />
            </TouchableOpacity>
            {(item.status === 'PENDING' || item.status === 'pending') && (
              <TouchableOpacity
                style={st.deleteButton}
                onPress={() => handleDeleteTicket(item.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Icon name="trash-outline" size={scale(16)} color={C.danger} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  /* ───── EMPTY ───── */
  const renderEmpty = () => (
    <View style={st.emptyBox}>
      <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.emptyIconCircle}>
        <Icon name="chatbubbles" size={scale(48)} color={C.primary} />
      </LinearGradient>
      <Text style={st.emptyTitle}>No Tickets Found</Text>
      <Text style={st.emptySubtitle}>
        {activeTab !== 'all' ? 'Try changing the filter tab' : 'Create your first support ticket'}
      </Text>
      {can('support:create') && (
      <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate('CreateSupportTicket', { restaurantId: currentRestaurant?.id })}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.emptyBtn}>
          <Icon name="add-circle" size={scale(18)} color="#fff" />
          <Text style={st.emptyBtnText}>New Ticket</Text>
        </LinearGradient>
      </TouchableOpacity>
      )}
    </View>
  );

  /* ───── HELP FOOTER ───── */
  const renderHelpCard = () => (
    <View style={st.helpCard}>
      <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={st.helpGradient}>
        <View style={st.helpIconBox}>
          <Icon name="call" size={scale(24)} color="#3B82F6" />
        </View>
        <Text style={st.helpTitle}>Need Urgent Help?</Text>
        <Text style={st.helpText}>
          Our support team is available to assist you. Call us directly for urgent issues.
        </Text>
        <TouchableOpacity style={st.helpBtn} onPress={callSupport}>
          <Icon name="call" size={scale(16)} color="#fff" />
          <Text style={st.helpBtnText}>Call Support</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  /* ───── LOADING ───── */
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
          <View style={st.headerBlobA} pointerEvents="none" />
          <View style={st.headerBlobB} pointerEvents="none" />
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={st.backBtn} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(16)} color="#fff" />
          </TouchableOpacity>
          <View style={st.headerCenter}>
            <Text style={st.headerTitle}>Support Center</Text>
          </View>
          <TouchableOpacity onPress={callSupport} style={st.backBtn}>
            <Icon name="call" size={scale(15)} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <ScrollView showsVerticalScrollIndicator={false}>
          <SkeletonTickets pulse={pulse} />
        </ScrollView>
        <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      </SafeAreaView>
    );
  }

  const pendingCount = statusCounts['PENDING'] || 0;

  /* ═══════════════════ MAIN RENDER ═══════════════════ */
  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
      {/* ─── Gradient Header ─── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[st.header, { paddingTop: insets.top + scale(10) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.backBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={scale(16)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Support Center</Text>
          {pendingCount > 0 && (
            <View style={st.countBadge}>
              <Text style={st.countBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={callSupport} style={st.backBtn}>
          <Icon name="call" size={scale(15)} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Restaurant Selector -- shared picker (anchored dropdown + Add
          New Restaurant), fed this screen's own restaurant list (all
          statuses) since a still-pending restaurant must stay selectable. ─── */}
      {currentRestaurant && (
        <View style={{ paddingHorizontal: scale(16), marginTop: scale(10) }}>
          <RestaurantSelectorCard
            restaurantsOverride={restaurants}
            selectedOverride={currentRestaurant}
            onSelectOverride={selectRestaurant}
          />
        </View>
      )}

      {/* ─── Summary Strip -- one compact non-scrolling row of 4 tiles
          instead of 4 separate cards ─── */}
      <View style={st.summarySection}>
        <View style={st.summaryStrip}>
          {[
            { key: 'PENDING', icon: 'time', color: '#D97706', label: 'Pending', value: statusCounts['PENDING'] || 0, tab: 'PENDING' },
            { key: 'ON_WORK', icon: 'construct', color: '#4F46E5', label: 'On Work', value: statusCounts['ON_WORK'] || 0, tab: 'ON_WORK' },
            { key: 'COMPLETED', icon: 'checkmark-circle', color: '#059669', label: 'Done', value: statusCounts['COMPLETED'] || 0, tab: 'COMPLETED' },
            { key: 'TOTAL', icon: 'documents', color: C.primary, label: 'Total', value: totalCount || tickets.length, tab: 'all' },
          ].map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <View style={st.summaryDivider} />}
              <TouchableOpacity
                style={st.summaryTile}
                onPress={() => handleStatusTabChange(activeTab === s.tab && s.tab !== 'all' ? 'all' : s.tab)}
                activeOpacity={0.7}
              >
                <View style={[st.summaryTileIcon, { backgroundColor: s.color + '20' }, activeTab === s.tab && { borderWidth: 1.5, borderColor: s.color }]}>
                  <Icon name={s.icon} size={scale(14)} color={s.color} />
                </View>
                <Text style={st.summaryTileValue} numberOfLines={1}>{s.value}</Text>
                <Text style={st.summaryTileLabel} numberOfLines={1}>{s.label}</Text>
              </TouchableOpacity>
            </React.Fragment>
          ))}
        </View>
      </View>

      {/* ─── Search ─── */}
      <View style={st.searchSection}>
        <View style={st.searchBox}>
          <View style={st.searchIconBox}>
            <Icon name="search" size={scale(13)} color={C.primary} />
          </View>
          <TextInput
            style={st.searchInput}
            placeholder="Search tickets..."
            placeholderTextColor={C.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ padding: scale(6) }}>
              <View style={st.clearBtn}><Icon name="close" size={scale(10)} color="#fff" /></View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ─── Filter Tabs ─── */}
      <View style={st.tabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.tabsContent}>
          {FILTER_TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            const cnt = tab.key === 'all' ? null : (statusCounts[tab.key] || 0);
            return (
              <TouchableOpacity
                key={tab.key}
                style={[st.tab, isActive && st.tabActive]}
                onPress={() => handleStatusTabChange(tab.key)}
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

      {/* ─── Ticket List ─── */}
      <FlatList
        data={filteredTickets}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderTicketCard}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={() => (
          <>
            {loadingMore && (
              <View style={{ padding: 16, alignItems: 'center' }}>
                <ActivityIndicator size="small" color="#EF3A3A" />
              </View>
            )}
            {!loadingMore && filteredTickets.length > 0 ? renderHelpCard() : null}
          </>
        )}
        contentContainerStyle={st.listContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.3}
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      {/* ─── FAB (hide when empty state shows its own button) ─── */}
      {filteredTickets.length > 0 && can('support:create') && (
        <TouchableOpacity style={[st.fabWrap, { bottom: insets.bottom + scale(20) }]} activeOpacity={0.85} onPress={() => navigation.navigate('CreateSupportTicket', { restaurantId: currentRestaurant?.id })}>
          <LinearGradient colors={[C.primary, C.primaryDark]} style={st.fab}>
            <Icon name="add" size={scale(28)} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

/* ═══════════════════════════════════════════════ */
/*                    STYLES                      */
/* ═══════════════════════════════════════════════ */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // ─── Header ───
  header: {
    flexDirection: 'row',
    alignItems: 'center',
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
  backBtnPlain: { width: scale(20), height: scale(30), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    marginLeft: scale(8),
    marginRight: scale(8),
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
  // ─── Loading ───
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  loadingText: { fontSize: moderateScale(14), color: C.muted },

  // ─── Skeleton ───
  skelLine: { height: scale(12), backgroundColor: '#E2E8F0', borderRadius: scale(6) },
  skelChip: { width: scale(80), height: scale(22), borderRadius: scale(20), backgroundColor: '#E2E8F0' },
  skelMeta: { width: scale(50), height: scale(14), borderRadius: scale(6), backgroundColor: '#E2E8F0' },

  // ─── Restaurant Banner ───
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(7),
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restaurantIconBox: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(8),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: moderateScale(12.5),
    fontWeight: '700',
    color: C.ink,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    backgroundColor: '#fff',
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  switchText: {
    fontSize: moderateScale(10.5),
    fontWeight: '700',
    color: C.primary,
  },

  // ─── Summary Grid ───
  summarySection: {
    paddingHorizontal: scale(12),
    paddingTop: scale(10),
    paddingBottom: scale(4),
  },
  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(14),
    paddingVertical: scale(10),
    paddingHorizontal: scale(2),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(6),
    elevation: 2,
  },
  summaryTile: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: scale(2),
  },
  summaryDivider: {
    width: 1,
    height: scale(30),
    backgroundColor: C.border,
  },
  summaryTileIcon: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(4),
  },
  summaryTileValue: {
    fontSize: moderateScale(12.5),
    fontWeight: '800',
    color: C.ink,
  },
  summaryTileLabel: {
    fontSize: moderateScale(8.5),
    fontWeight: '600',
    color: C.muted,
    marginTop: scale(1),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Search ───
  searchSection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(5),
    paddingBottom: scale(4),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(11),
    paddingHorizontal: scale(5),
    paddingVertical: scale(3),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(8),
    elevation: 2,
  },
  searchIconBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(8),
    fontSize: moderateScale(12.5),
    fontWeight: '500',
    color: C.text,
    padding: 0,
  },
  clearBtn: {
    width: scale(17),
    height: scale(17),
    borderRadius: scale(9),
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
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

  listContent: {
    paddingHorizontal: scale(16),
    paddingTop: scale(10),
    paddingBottom: scale(100),
  },

  // ─── Ticket Card ───
  itemCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
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
  itemTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(4),
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
  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(10),
    paddingLeft: scale(52),
  },
  equipmentText: {
    fontSize: moderateScale(13),
    color: C.muted,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(12),
    paddingLeft: scale(52),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusChipText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  footerMeta: {
    fontSize: moderateScale(11),
    color: C.muted,
    fontFamily: 'monospace',
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginTop: scale(12),
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
    backgroundColor: '#EFF6FF',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.info,
  },
  deleteButton: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Empty State ───
  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(50),
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
    marginBottom: scale(20),
    textAlign: 'center',
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(24),
    paddingVertical: scale(13),
    borderRadius: scale(14),
  },
  emptyBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: '#fff',
  },

  // ─── Help Card ───
  helpCard: {
    marginTop: scale(16),
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  helpGradient: {
    padding: scale(20),
    alignItems: 'center',
    borderRadius: scale(16),
  },
  helpIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  helpTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
  },
  helpText: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(19),
    marginBottom: scale(16),
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: C.info,
  },
  helpBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: '#fff',
  },

  // ─── FAB ───
  fabWrap: {
    position: 'absolute',
    right: scale(20),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.35,
    shadowRadius: scale(8),
    elevation: 8,
  },
  fab: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Picker Modals ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalDragBar: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: scale(12),
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: scale(16),
    paddingBottom: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    padding: scale(16),
  },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    marginBottom: scale(10),
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#FAFBFC',
  },
  pickerOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  pickerOptionIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerOptionText: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: C.ink,
  },
  selectedCheck: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ─── Restaurant Picker ───
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderRadius: scale(14),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#FAFBFC',
  },
  restaurantOptionSel: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  restaurantOptIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantOptInfo: {
    flex: 1,
  },
  restaurantOptName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  restaurantOptAddr: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(3),
  },
});
