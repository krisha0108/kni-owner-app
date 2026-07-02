import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Modal, ScrollView, TextInput, Image, Alert, Linking, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, IMAGE_BASE_URL } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
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

const CATEGORY_OPTIONS = ['General', 'Equipment', 'Billing', 'Service', 'Account', 'Other'];

const formatDate = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (d) => {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
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

const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) return s;
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');
  const base = IMAGE_BASE_URL.replace(/\/$/, '');
  return `${base}/${tail.replace(/^\/+/, '')}`;
};

export default function SupportCenter({ navigation }) {
  const { can } = usePermissions();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formData, setFormData] = useState({ title: '', equipmentName: '', category: 'General', description: '' });
  const [ticketImageUri, setTicketImageUri] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [threads, setThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyImageUri, setReplyImageUri] = useState('');
  const [isSending, setIsSending] = useState(false);

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

  useFocusEffect(useCallback(() => { loadData(); }, [loadData]));

  const selectRestaurant = (r) => {
    setRestaurantPickerVisible(false);
    if (r.id !== currentRestaurant?.id) {
      setCurrentRestaurant(r);
      setTickets([]);
      setPage(1);
      setHasMore(true);
      loadData(r.id);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    loadData(currentRestaurant?.id);
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

  const resetForm = () => { setFormData({ title: '', equipmentName: '', category: 'General', description: '' }); setTicketImageUri(''); };

  const pickTicketImage = async () => {
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (r?.assets?.[0]?.uri) setTicketImageUri(r.assets[0].uri);
    } catch (e) { console.error('Image pick error:', e); }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.description) { Alert.alert('Error', 'Please fill in title and description'); return; }
    setIsCreating(true);
    try {
      if (ticketImageUri) {
        const form = new FormData();
        form.append('restaurantId', currentRestaurant?.id);
        form.append('title', formData.title);
        if (formData.equipmentName) form.append('equipmentName', formData.equipmentName);
        form.append('category', formData.category);
        form.append('description', formData.description);
        form.append('photo', { uri: ticketImageUri, type: 'image/jpeg', name: `ticket_${Date.now()}.jpg` });
        await api.post('/owner/support', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      } else {
        await api.post('/owner/support', {
          restaurantId: currentRestaurant?.id,
          title: formData.title,
          equipmentName: formData.equipmentName || undefined,
          category: formData.category,
          description: formData.description,
        });
      }
      Alert.alert('Success', 'Support ticket created successfully');
      setCreateModalVisible(false);
      resetForm();
      loadData(currentRestaurant?.id);
    } catch (e) {
      console.error('Create ticket error:', e);
      Alert.alert('Error', e?.response?.data?.error || 'Failed to create ticket');
    } finally { setIsCreating(false); }
  };

  const openTicketDetail = async (ticket) => {
    setSelectedTicket(ticket);
    setNewMessage('');
    setReplyImageUri('');
    setDetailModalVisible(true);
    try {
      const response = await api.get(`/owner/support/${ticket.id}`);
      if (response.data.ok) {
        setSelectedTicket(response.data.data);
        setThreads(response.data.data.threads || []);
      }
    } catch (e) { console.error('Fetch ticket detail error:', e); }
  };

  const pickReplyImage = async () => {
    try {
      const r = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (r?.assets?.[0]?.uri) setReplyImageUri(r.assets[0].uri);
    } catch (e) { console.error('Image pick error:', e); }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && !replyImageUri)) return;
    setIsSending(true);
    try {
      if (replyImageUri) {
        const form = new FormData();
        form.append('message', newMessage || 'Image attached');
        form.append('photo', { uri: replyImageUri, type: 'image/jpeg', name: `reply_${Date.now()}.jpg` });
        const res = await api.post(`/owner/support/${selectedTicket.id}/threads`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
        if (res.data.ok) { setThreads([...threads, res.data.data]); setNewMessage(''); setReplyImageUri(''); }
      } else {
        const res = await api.post(`/owner/support/${selectedTicket.id}/threads`, { message: newMessage });
        if (res.data.ok) { setThreads([...threads, res.data.data]); setNewMessage(''); }
      }
    } catch (e) {
      console.error('Send message error:', e);
      Alert.alert('Error', 'Failed to send message');
    } finally { setIsSending(false); }
  };

  const handleDeleteTicket = (ticketId) => {
    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          try {
            await api.delete(`/owner/support/${ticketId}`);
            Alert.alert('Success', 'Ticket deleted successfully');
            loadData(currentRestaurant?.id);
          } catch (e) { Alert.alert('Error', e?.response?.data?.error || 'Failed to delete ticket'); }
        },
      },
    ]);
  };

  const callSupport = () => { Linking.openURL('tel:+919999999999'); };

  const canReply = selectedTicket &&
    selectedTicket.status !== 'COMPLETED' && selectedTicket.status !== 'REJECTED' &&
    selectedTicket.status !== 'completed' && selectedTicket.status !== 'rejected';

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
              <Text style={st.footerMeta}>#{item.id?.slice(0, 8)}</Text>
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
              <TouchableOpacity style={st.deleteButton} onPress={() => handleDeleteTicket(item.id)}>
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
      <TouchableOpacity activeOpacity={0.85} onPress={() => { resetForm(); setCreateModalVisible(true); }}>
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
      <SafeAreaView style={st.container}>
        <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Support Center</Text>
          <View style={{ width: scale(38) }} />
        </LinearGradient>
        <View style={st.loadingBox}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.loadingCircle}>
            <ActivityIndicator size="large" color={C.primary} />
          </LinearGradient>
          <Text style={st.loadingText}>Loading tickets...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pendingCount = statusCounts['PENDING'] || 0;

  /* ═══════════════════ MAIN RENDER ═══════════════════ */
  return (
    <SafeAreaView style={st.container}>
      {/* ─── Gradient Header ─── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
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
          <Icon name="call" size={scale(18)} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* ─── Restaurant Banner ─── */}
      {currentRestaurant && (
        <TouchableOpacity
          style={st.restaurantBanner}
          onPress={() => restaurants.length > 1 && setRestaurantPickerVisible(true)}
          activeOpacity={restaurants.length > 1 ? 0.7 : 1}
        >
          <View style={st.restaurantIconBox}>
            <Icon name="restaurant" size={scale(16)} color={C.primary} />
          </View>
          <Text style={st.restaurantName} numberOfLines={1}>{currentRestaurant.name}</Text>
          {restaurants.length > 1 && (
            <View style={st.switchPill}>
              <Icon name="swap-horizontal" size={scale(14)} color={C.primary} />
              <Text style={st.switchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* ─── Summary Grid ─── */}
      <View style={st.summarySection}>
        <View style={st.summaryGrid}>
          <TouchableOpacity
            style={[st.summaryCard, activeTab === 'PENDING' && st.summaryCardActive]}
            onPress={() => handleStatusTabChange(activeTab === 'PENDING' ? 'all' : 'PENDING')}
          >
            <LinearGradient colors={['#FEF3C7', '#FDE68A']} style={st.summaryIconCircle}>
              <Icon name="time" size={scale(18)} color="#D97706" />
            </LinearGradient>
            <Text style={st.summaryCount}>{statusCounts['PENDING'] || 0}</Text>
            <Text style={st.summaryLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, activeTab === 'ON_WORK' && st.summaryCardActive]}
            onPress={() => handleStatusTabChange(activeTab === 'ON_WORK' ? 'all' : 'ON_WORK')}
          >
            <LinearGradient colors={['#E0E7FF', '#C7D2FE']} style={st.summaryIconCircle}>
              <Icon name="construct" size={scale(18)} color="#4F46E5" />
            </LinearGradient>
            <Text style={st.summaryCount}>{statusCounts['ON_WORK'] || 0}</Text>
            <Text style={st.summaryLabel}>On Work</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, activeTab === 'COMPLETED' && st.summaryCardActive]}
            onPress={() => handleStatusTabChange(activeTab === 'COMPLETED' ? 'all' : 'COMPLETED')}
          >
            <LinearGradient colors={['#D1FAE5', '#A7F3D0']} style={st.summaryIconCircle}>
              <Icon name="checkmark-circle" size={scale(18)} color="#059669" />
            </LinearGradient>
            <Text style={st.summaryCount}>{statusCounts['COMPLETED'] || 0}</Text>
            <Text style={st.summaryLabel}>Done</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[st.summaryCard, activeTab === 'all' && st.summaryCardActive]}
            onPress={() => handleStatusTabChange('all')}
          >
            <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.summaryIconCircle}>
              <Icon name="documents" size={scale(18)} color={C.primary} />
            </LinearGradient>
            <Text style={st.summaryCount}>{totalCount || tickets.length}</Text>
            <Text style={st.summaryLabel}>Total</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ─── Search ─── */}
      <View style={st.searchSection}>
        <View style={st.searchBox}>
          <View style={st.searchIconBox}>
            <Icon name="search" size={scale(16)} color={C.primary} />
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
              <View style={st.clearBtn}><Icon name="close" size={scale(12)} color="#fff" /></View>
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

      {/* ─── List Title ─── */}
      <View style={st.listTitleRow}>
        <Text style={st.listTitle}>
          {activeTab === 'all' ? 'All Tickets' : (STATUS_CONFIG[activeTab]?.label || 'Tickets')}
        </Text>
        <Text style={st.listCount}>{filteredTickets.length} tickets</Text>
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
        <TouchableOpacity style={st.fabWrap} activeOpacity={0.85} onPress={() => { resetForm(); setCreateModalVisible(true); }}>
          <LinearGradient colors={[C.primary, C.primaryDark]} style={st.fab}>
            <Icon name="add" size={scale(28)} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>
      )}

      {/* ═══════════ CREATE TICKET MODAL (Full-screen) ═══════════ */}
      <Modal visible={createModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
          <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
            <TouchableOpacity onPress={() => setCreateModalVisible(false)} style={st.backBtn}>
              <Icon name="chevron-back" size={scale(20)} color="#fff" />
            </TouchableOpacity>
            <Text style={st.headerTitle}>New Ticket</Text>
            <View style={{ width: scale(38) }} />
          </LinearGradient>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: scale(20), paddingBottom: scale(100) }} keyboardShouldPersistTaps="handled">
            <Text style={st.inputLabel}>Title *</Text>
            <TextInput
              style={st.input}
              placeholder="Brief description of your issue"
              placeholderTextColor={C.muted}
              value={formData.title}
              onChangeText={(t) => setFormData({ ...formData, title: t })}
            />

            <Text style={st.inputLabel}>Category</Text>
            <TouchableOpacity style={st.pickerInput} onPress={() => setCategoryPickerVisible(true)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                <LinearGradient colors={CATEGORY_CONFIG[formData.category]?.gradient || ['#94A3B8', '#64748B']} style={st.pickerCatIcon}>
                  <Icon name={CATEGORY_CONFIG[formData.category]?.icon || 'help-circle'} size={scale(14)} color="#fff" />
                </LinearGradient>
                <Text style={st.pickerInputText}>{formData.category}</Text>
              </View>
              <Icon name="chevron-down" size={scale(18)} color={C.muted} />
            </TouchableOpacity>

            <Text style={st.inputLabel}>Equipment Name (Optional)</Text>
            <TextInput
              style={st.input}
              placeholder="If related to specific equipment"
              placeholderTextColor={C.muted}
              value={formData.equipmentName}
              onChangeText={(t) => setFormData({ ...formData, equipmentName: t })}
            />

            <Text style={st.inputLabel}>Description *</Text>
            <TextInput
              style={[st.input, st.textArea]}
              placeholder="Describe your issue in detail..."
              placeholderTextColor={C.muted}
              value={formData.description}
              onChangeText={(t) => setFormData({ ...formData, description: t })}
              multiline
              numberOfLines={4}
            />

            <Text style={st.inputLabel}>Attachment (Optional)</Text>
            {ticketImageUri ? (
              <View style={st.imgPreviewWrap}>
                <Image source={{ uri: ticketImageUri }} style={st.imgPreview} />
                <TouchableOpacity style={st.removeImgBtn} onPress={() => setTicketImageUri('')}>
                  <Icon name="close" size={scale(14)} color="#fff" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity style={st.uploadBtn} onPress={pickTicketImage}>
                <Icon name="cloud-upload-outline" size={scale(22)} color={C.primary} />
                <Text style={st.uploadBtnText}>Upload Image</Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={st.createFooter}>
            <TouchableOpacity style={st.cancelBtn} onPress={() => setCreateModalVisible(false)}>
              <Text style={st.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity activeOpacity={0.85} onPress={handleCreate} disabled={isCreating} style={{ flex: 1 }}>
              <LinearGradient colors={isCreating ? ['#FCA5A5', '#FCA5A5'] : [C.primary, C.primaryDark]} style={st.submitBtn}>
                {isCreating ? <ActivityIndicator size="small" color="#fff" /> : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                    <Icon name="send" size={scale(16)} color="#fff" />
                    <Text style={st.submitBtnText}>Create Ticket</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ═══════════ TICKET DETAIL MODAL (Full-screen) ═══════════ */}
      <Modal visible={detailModalVisible} animationType="slide">
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
          <LinearGradient colors={[C.primary, C.primaryDark]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={st.header}>
            <TouchableOpacity onPress={() => setDetailModalVisible(false)} style={st.backBtn}>
              <Icon name="chevron-back" size={scale(20)} color="#fff" />
            </TouchableOpacity>
            <View style={st.headerCenter}>
              <Text style={st.headerTitle}>Ticket Details</Text>
              {selectedTicket && (
                <View style={st.headerStatusPill}>
                  <Text style={st.headerStatusText}>{getStatus(selectedTicket.status).label}</Text>
                </View>
              )}
            </View>
            <View style={{ width: scale(38) }} />
          </LinearGradient>

          {selectedTicket && (() => {
            const dCat = CATEGORY_CONFIG[selectedTicket.category] || CATEGORY_CONFIG.General;
            const dSt = getStatus(selectedTicket.status);
            return (
              <>
                <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: scale(16), paddingBottom: canReply ? 90 : 24 }} showsVerticalScrollIndicator={false}>
                  {/* Ticket Info Card */}
                  <View style={st.detailCard}>
                    <LinearGradient colors={dCat.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={st.itemAccent} />
                    <View style={st.detailCardBody}>
                      <View style={st.itemHeaderRow}>
                        <LinearGradient colors={dCat.gradient} style={st.typeIconBox}>
                          <Icon name={dCat.icon} size={scale(18)} color="#fff" />
                        </LinearGradient>
                        <View style={st.itemHeaderInfo}>
                          <Text style={st.itemTitle}>{selectedTicket.title}</Text>
                          <View style={st.itemMetaRow}>
                            <View style={[st.typePill, { backgroundColor: dCat.lightBg }]}>
                              <Text style={[st.typePillText, { color: dCat.color }]}>{selectedTicket.category}</Text>
                            </View>
                            <Text style={st.timeAgoText}>{formatTimeAgo(selectedTicket.createdAt)}</Text>
                          </View>
                        </View>
                      </View>

                      {selectedTicket.equipmentName ? (
                        <View style={[st.equipmentRow, { marginTop: scale(12) }]}>
                          <Icon name="hardware-chip-outline" size={scale(13)} color={C.muted} />
                          <Text style={st.equipmentText}>{selectedTicket.equipmentName}</Text>
                        </View>
                      ) : null}

                      <Text style={st.detailDesc}>{selectedTicket.description}</Text>

                      {selectedTicket.photoUrl ? (
                        <View style={st.detailImgWrap}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginBottom: scale(8) }}>
                            <Icon name="image-outline" size={scale(13)} color={C.muted} />
                            <Text style={{ fontSize: moderateScale(12), color: C.muted, fontWeight: '600' }}>Attachment</Text>
                          </View>
                          <Image source={{ uri: toStorageUrl(selectedTicket.photoUrl) }} style={st.detailImg} resizeMode="cover" />
                        </View>
                      ) : null}

                      <View style={st.detailFooterRow}>
                        <View style={[st.statusChip, { backgroundColor: dSt.bg }]}>
                          <Icon name={dSt.icon} size={scale(13)} color={dSt.color} />
                          <Text style={[st.statusChipText, { color: dSt.color }]}>{dSt.label}</Text>
                        </View>
                        <Text style={st.footerMeta}>#{selectedTicket.id?.slice(0, 8)}</Text>
                      </View>
                    </View>
                  </View>

                  {/* Messages Section */}
                  <View style={st.msgSectionHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8) }}>
                      <Icon name="chatbubbles" size={scale(16)} color={C.ink} />
                      <Text style={st.msgSectionTitle}>Messages</Text>
                    </View>
                    <View style={st.msgCountPill}>
                      <Text style={st.msgCountText}>{threads.length}</Text>
                    </View>
                  </View>

                  {threads.length === 0 ? (
                    <View style={st.noMsgBox}>
                      <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={st.noMsgCircle}>
                        <Icon name="chatbox-outline" size={scale(28)} color={C.muted} />
                      </LinearGradient>
                      <Text style={st.noMsgText}>No messages yet</Text>
                    </View>
                  ) : (
                    threads.map((thread) => (
                      <View
                        key={thread.id}
                        style={[st.threadMsg, thread.isAdmin ? st.threadAdmin : st.threadOwner]}
                      >
                        {thread.isAdmin ? (
                          <LinearGradient colors={['#3B82F6', '#1D4ED8']} style={st.threadAccentLine} />
                        ) : (
                          <LinearGradient colors={[C.primary, C.primaryDark]} style={st.threadAccentLine} />
                        )}
                        <View style={st.threadInner}>
                          <View style={st.threadHeader}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6) }}>
                              <LinearGradient
                                colors={thread.isAdmin ? ['#3B82F6', '#1D4ED8'] : [C.primary, C.primaryDark]}
                                style={st.threadAvatar}
                              >
                                <Icon name={thread.isAdmin ? 'headset' : 'person'} size={scale(10)} color="#fff" />
                              </LinearGradient>
                              <Text style={st.threadAuthor}>
                                {thread.user?.name || (thread.isAdmin ? 'Support' : 'You')}
                              </Text>
                              {thread.isAdmin && (
                                <LinearGradient colors={[C.info, '#1D4ED8']} style={st.supportBadge}>
                                  <Text style={st.supportBadgeText}>Support</Text>
                                </LinearGradient>
                              )}
                            </View>
                            <Text style={st.threadTime}>{formatDateTime(thread.createdAt)}</Text>
                          </View>
                          <Text style={st.threadText}>{thread.message}</Text>
                          {thread.imageUrl ? (
                            <Image source={{ uri: toStorageUrl(thread.imageUrl) }} style={st.threadImage} resizeMode="cover" />
                          ) : null}
                        </View>
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Reply Bar */}
                {canReply && (
                  <View style={st.replyBar}>
                    {replyImageUri ? (
                      <View style={st.replyImgPreview}>
                        <Image source={{ uri: replyImageUri }} style={st.replyImg} />
                        <TouchableOpacity style={st.removeReplyBtn} onPress={() => setReplyImageUri('')}>
                          <Icon name="close" size={scale(10)} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    ) : null}
                    <View style={st.replyInputRow}>
                      <TextInput
                        style={st.replyInput}
                        placeholder="Type your message..."
                        placeholderTextColor={C.muted}
                        value={newMessage}
                        onChangeText={setNewMessage}
                      />
                      <TouchableOpacity style={st.attachBtn} onPress={pickReplyImage}>
                        <Icon name="image-outline" size={scale(18)} color={C.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={handleSendMessage}
                        disabled={isSending || (!newMessage.trim() && !replyImageUri)}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={(!newMessage.trim() && !replyImageUri) ? ['#E2E8F0', '#E2E8F0'] : [C.primary, C.primaryDark]}
                          style={st.sendBtn}
                        >
                          {isSending ? <ActivityIndicator size="small" color="#fff" /> : <Icon name="send" size={scale(16)} color="#fff" />}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            );
          })()}
        </SafeAreaView>
      </Modal>

      {/* ═══════════ CATEGORY PICKER ═══════════ */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerSheet}>
            <View style={st.modalDragBar} />
            <View style={st.modalHeaderRow}>
              <View>
                <Text style={st.modalTitle}>Select Category</Text>
                <Text style={st.modalSubtitle}>Choose a category for your ticket</Text>
              </View>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)} style={st.modalCloseBtn}>
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerBody} contentContainerStyle={{ paddingBottom: scale(30) }}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = cat === formData.category;
                const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.General;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[st.pickerOption, isSelected && st.pickerOptionSelected]}
                    onPress={() => { setFormData({ ...formData, category: cat }); setCategoryPickerVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(12) }}>
                      <LinearGradient
                        colors={isSelected ? cfg.gradient : [cfg.lightBg, cfg.lightBg]}
                        style={st.pickerOptionIcon}
                      >
                        <Icon name={cfg.icon} size={scale(16)} color={isSelected ? '#fff' : cfg.color} />
                      </LinearGradient>
                      <Text style={[st.pickerOptionText, isSelected && { color: cfg.color, fontWeight: '800' }]}>{cat}</Text>
                    </View>
                    {isSelected && (
                      <View style={[st.selectedCheck, { backgroundColor: cfg.color }]}>
                        <Icon name="checkmark" size={scale(14)} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ═══════════ RESTAURANT PICKER ═══════════ */}
      <Modal visible={restaurantPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerSheet}>
            <View style={st.modalDragBar} />
            <View style={st.modalHeaderRow}>
              <View>
                <Text style={st.modalTitle}>Select Restaurant</Text>
                <Text style={st.modalSubtitle}>{restaurants.length} restaurants available</Text>
              </View>
              <TouchableOpacity onPress={() => setRestaurantPickerVisible(false)} style={st.modalCloseBtn}>
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerBody} contentContainerStyle={{ paddingBottom: scale(30) }}>
              {restaurants.map((r) => {
                const isSel = r.id === currentRestaurant?.id;
                return (
                  <TouchableOpacity
                    key={r.id}
                    style={[st.restaurantOption, isSel && st.restaurantOptionSel]}
                    onPress={() => selectRestaurant(r)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isSel ? [C.primary, C.primaryDark] : ['#FEE2E2', '#FEE2E2']}
                      style={st.restaurantOptIcon}
                    >
                      <Icon name="restaurant" size={scale(20)} color={isSel ? '#fff' : C.primary} />
                    </LinearGradient>
                    <View style={st.restaurantOptInfo}>
                      <Text style={[st.restaurantOptName, isSel && { color: C.primary }]} numberOfLines={1}>{r.name}</Text>
                      {r.address ? <Text style={st.restaurantOptAddr} numberOfLines={1}>{r.address}</Text> : null}
                    </View>
                    {isSel && (
                      <View style={st.selectedCheck}>
                        <Icon name="checkmark" size={scale(16)} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
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
  headerStatusPill: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(10),
    marginTop: scale(2),
    alignSelf: 'center',
  },
  headerStatusText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#fff',
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

  // ─── Restaurant Banner ───
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restaurantIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    backgroundColor: '#fff',
    borderRadius: scale(16),
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  switchText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
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
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.muted,
    marginTop: scale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // ─── Search ───
  searchSection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(8),
    paddingBottom: scale(4),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(14),
    paddingHorizontal: scale(6),
    paddingVertical: scale(4),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(8),
    elevation: 2,
  },
  searchIconBox: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    flex: 1,
    marginLeft: scale(10),
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: C.text,
    padding: 0,
  },
  clearBtn: {
    width: scale(20),
    height: scale(20),
    borderRadius: scale(10),
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
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

  // ─── List Title ───
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(6),
  },
  listTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  listCount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },
  listContent: {
    paddingHorizontal: scale(16),
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
    bottom: scale(90),
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

  // ─── Create Modal ───
  createFooter: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: scale(14),
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: C.card,
  },
  inputLabel: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(13),
    fontSize: moderateScale(14),
    color: C.text,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  textArea: { minHeight: scale(100), textAlignVertical: 'top' },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(13),
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  pickerCatIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerInputText: { fontSize: moderateScale(14), color: C.text, fontWeight: '500' },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(16),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: '#FECACA',
    borderStyle: 'dashed',
    backgroundColor: '#FEF2F2',
  },
  uploadBtnText: { fontSize: moderateScale(14), fontWeight: '600', color: C.primary },
  imgPreviewWrap: { position: 'relative', alignSelf: 'flex-start' },
  imgPreview: { width: scale(100), height: scale(100), borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7' },
  removeImgBtn: {
    position: 'absolute',
    top: scale(-8),
    right: scale(-8),
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: scale(14),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(12),
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink },
  submitBtn: {
    paddingVertical: scale(14),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: { fontSize: moderateScale(15), fontWeight: '800', color: '#fff' },

  // ─── Detail Modal ───
  detailCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: scale(20),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  detailCardBody: {
    padding: scale(14),
  },
  detailDesc: {
    fontSize: moderateScale(14),
    color: C.text,
    lineHeight: moderateScale(21),
    marginTop: scale(12),
    paddingLeft: scale(52),
  },
  detailImgWrap: {
    marginTop: scale(14),
    paddingLeft: scale(52),
  },
  detailImg: {
    width: '100%',
    height: scale(160),
    borderRadius: scale(12),
  },
  detailFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(14),
    paddingLeft: scale(52),
  },

  // ─── Messages ───
  msgSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(14),
  },
  msgSectionTitle: {
    fontSize: moderateScale(15),
    fontWeight: '800',
    color: C.ink,
  },
  msgCountPill: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(10),
  },
  msgCountText: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: C.primary,
  },
  noMsgBox: {
    alignItems: 'center',
    paddingVertical: scale(30),
  },
  noMsgCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  noMsgText: {
    fontSize: moderateScale(13),
    color: C.muted,
  },

  // ─── Thread Messages ───
  threadMsg: {
    borderRadius: scale(14),
    marginBottom: scale(10),
    overflow: 'hidden',
    borderWidth: 1,
  },
  threadAdmin: {
    backgroundColor: '#F0F7FF',
    borderColor: '#DBEAFE',
    marginLeft: scale(20),
  },
  threadOwner: {
    backgroundColor: '#FEF8F8',
    borderColor: '#FECACA',
    marginRight: scale(20),
  },
  threadAccentLine: {
    height: scale(3),
  },
  threadInner: {
    padding: scale(12),
  },
  threadHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  threadAvatar: {
    width: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    alignItems: 'center',
    justifyContent: 'center',
  },
  threadAuthor: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: C.ink,
  },
  supportBadge: {
    paddingHorizontal: scale(6),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  supportBadgeText: {
    fontSize: moderateScale(9),
    fontWeight: '800',
    color: '#fff',
  },
  threadTime: {
    fontSize: moderateScale(10),
    color: C.muted,
  },
  threadText: {
    fontSize: moderateScale(13),
    color: C.text,
    lineHeight: moderateScale(20),
  },
  threadImage: {
    width: '100%',
    height: scale(120),
    borderRadius: scale(10),
    marginTop: scale(8),
  },

  // ─── Reply Bar ───
  replyBar: {
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    backgroundColor: C.card,
  },
  replyImgPreview: {
    position: 'relative',
    alignSelf: 'flex-start',
    marginBottom: scale(8),
  },
  replyImg: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(10),
  },
  removeReplyBtn: {
    position: 'absolute',
    top: scale(-5),
    right: scale(-5),
    width: scale(18),
    height: scale(18),
    borderRadius: scale(9),
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: scale(20),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    fontSize: moderateScale(14),
    color: C.text,
    borderWidth: 1,
    borderColor: '#EEF2F7',
  },
  attachBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(19),
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
