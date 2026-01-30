import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, IMAGE_BASE_URL } from '../api/client';
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
  indigo: '#6366F1',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'SEEN', label: 'Seen' },
  { value: 'ON_WORK', label: 'On Work' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const CATEGORY_OPTIONS = ['General', 'Equipment', 'Billing', 'Service', 'Account', 'Other'];

const STATUS_CONFIG = {
  PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' },
  SEEN: { bg: '#DBEAFE', color: '#2563EB', icon: 'eye-outline', label: 'Seen' },
  ON_WORK: { bg: '#E0E7FF', color: '#4F46E5', icon: 'construct-outline', label: 'On Work' },
  COMPLETED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle-outline', label: 'Completed' },
  REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Rejected' },
  // Map lowercase versions
  pending: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' },
  seen: { bg: '#DBEAFE', color: '#2563EB', icon: 'eye-outline', label: 'Seen' },
  onwork: { bg: '#E0E7FF', color: '#4F46E5', icon: 'construct-outline', label: 'On Work' },
  completed: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle-outline', label: 'Completed' },
  rejected: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Rejected' },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
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

export default function SupportCenter({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tickets, setTickets] = useState([]);

  // Restaurant
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  // Create Ticket Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    equipmentName: '',
    category: 'General',
    description: '',
  });
  const [ticketImageUri, setTicketImageUri] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

  // Ticket Detail Modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [threads, setThreads] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [replyImageUri, setReplyImageUri] = useState('');
  const [isSending, setIsSending] = useState(false);

  const loadData = useCallback(async (restaurantId = null) => {
    try {
      setLoading(true);

      // Get all restaurants
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const approvedRestaurants = restaurantsRes.data.data.filter(r => r.status === 'APPROVED');
        setRestaurants(approvedRestaurants);

        let targetRestaurant = null;
        if (restaurantId) {
          targetRestaurant = approvedRestaurants.find(r => r.id === restaurantId);
        }
        if (!targetRestaurant && approvedRestaurants.length > 0) {
          targetRestaurant = approvedRestaurants[0];
        }

        if (targetRestaurant) {
          setCurrentRestaurant(targetRestaurant);

          // Fetch support tickets
          const params = new URLSearchParams();
          params.append('restaurantId', targetRestaurant.id);
          if (statusFilter !== 'all') {
            params.append('status', statusFilter);
          }

          const response = await api.get(`/owner/support?${params.toString()}`);
          if (response.data.ok) {
            setTickets(response.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading support data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selectRestaurant = (restaurant) => {
    setRestaurantPickerVisible(false);
    if (restaurant.id !== currentRestaurant?.id) {
      setCurrentRestaurant(restaurant);
      setTickets([]);
      loadData(restaurant.id);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentRestaurant?.id);
  };

  // Filter tickets
  const filteredTickets = useMemo(() => {
    if (!searchQuery) return tickets;
    const query = searchQuery.toLowerCase();
    return tickets.filter(
      (t) =>
        t.title?.toLowerCase().includes(query) ||
        t.id?.toLowerCase().includes(query) ||
        t.category?.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [tickets, searchQuery]);

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: tickets.length };
    tickets.forEach((t) => {
      const status = t.status?.toUpperCase() || 'PENDING';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [tickets]);

  const getStatusStyle = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  };

  // Create Ticket
  const resetForm = () => {
    setFormData({ title: '', equipmentName: '', category: 'General', description: '' });
    setTicketImageUri('');
  };

  const pickTicketImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (result?.assets?.[0]?.uri) {
        setTicketImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  const handleCreate = async () => {
    if (!formData.title || !formData.description) {
      Alert.alert('Error', 'Please fill in title and description');
      return;
    }

    setIsCreating(true);
    try {
      const payload = {
        restaurantId: currentRestaurant?.id,
        title: formData.title,
        equipmentName: formData.equipmentName || undefined,
        category: formData.category,
        description: formData.description,
      };

      // If we have an image, use FormData
      if (ticketImageUri) {
        const form = new FormData();
        form.append('restaurantId', currentRestaurant?.id);
        form.append('title', formData.title);
        if (formData.equipmentName) form.append('equipmentName', formData.equipmentName);
        form.append('category', formData.category);
        form.append('description', formData.description);
        form.append('photo', {
          uri: ticketImageUri,
          type: 'image/jpeg',
          name: `ticket_${Date.now()}.jpg`,
        });

        await api.post('/owner/support', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/owner/support', payload);
      }

      Alert.alert('Success', 'Support ticket created successfully');
      setCreateModalVisible(false);
      resetForm();
      loadData(currentRestaurant?.id);
    } catch (error) {
      console.error('Create ticket error:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to create ticket');
    } finally {
      setIsCreating(false);
    }
  };

  // Ticket Detail
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
    } catch (error) {
      console.error('Fetch ticket detail error:', error);
    }
  };

  const pickReplyImage = async () => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.85 });
      if (result?.assets?.[0]?.uri) {
        setReplyImageUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Image pick error:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!selectedTicket || (!newMessage.trim() && !replyImageUri)) return;

    setIsSending(true);
    try {
      if (replyImageUri) {
        const form = new FormData();
        form.append('message', newMessage || 'Image attached');
        form.append('photo', {
          uri: replyImageUri,
          type: 'image/jpeg',
          name: `reply_${Date.now()}.jpg`,
        });

        const response = await api.post(`/owner/support/${selectedTicket.id}/threads`, form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (response.data.ok) {
          setThreads([...threads, response.data.data]);
          setNewMessage('');
          setReplyImageUri('');
        }
      } else {
        const response = await api.post(`/owner/support/${selectedTicket.id}/threads`, {
          message: newMessage,
        });

        if (response.data.ok) {
          setThreads([...threads, response.data.data]);
          setNewMessage('');
        }
      }
    } catch (error) {
      console.error('Send message error:', error);
      Alert.alert('Error', 'Failed to send message');
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteTicket = async (ticketId) => {
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to delete this ticket?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/support/${ticketId}`);
              Alert.alert('Success', 'Ticket deleted successfully');
              loadData(currentRestaurant?.id);
            } catch (error) {
              Alert.alert('Error', error?.response?.data?.error || 'Failed to delete ticket');
            }
          },
        },
      ]
    );
  };

  const callSupport = () => {
    Linking.openURL('tel:+919999999999');
  };

  const canReply = selectedTicket &&
    selectedTicket.status !== 'COMPLETED' &&
    selectedTicket.status !== 'REJECTED' &&
    selectedTicket.status !== 'completed' &&
    selectedTicket.status !== 'rejected';

  // Render Ticket Card
  const renderTicketCard = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const repliesCount = item._count?.threads || item.threads?.length || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => openTicketDetail(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          <Text style={styles.cardIdText}>#{item.id?.slice(0, 8)}</Text>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
        {item.equipmentName && (
          <Text style={styles.cardEquipment}>{item.equipmentName}</Text>
        )}

        <View style={styles.cardMeta}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category || 'General'}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="chatbubble-outline" size={14} color={C.muted} />
            <Text style={styles.metaText}>{repliesCount}</Text>
          </View>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => openTicketDetail(item)}>
            <Icon name="eye-outline" size={16} color={C.primary} />
            <Text style={styles.viewBtnText}>View</Text>
          </TouchableOpacity>
          {(item.status === 'PENDING' || item.status === 'pending') && (
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={() => handleDeleteTicket(item.id)}
            >
              <Icon name="trash-outline" size={16} color={C.danger} />
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Summary Card Component
  const SummaryCard = ({ status, count, isActive, onPress }) => {
    const config = getStatusStyle(status);
    return (
      <TouchableOpacity
        style={[styles.summaryCard, isActive && styles.summaryCardActive]}
        onPress={onPress}
      >
        <View style={[styles.summaryIcon, isActive && { backgroundColor: `${config.color}20` }]}>
          <Icon name={config.icon} size={20} color={isActive ? config.color : C.muted} />
        </View>
        <Text style={styles.summaryCount}>{count || 0}</Text>
        <Text style={styles.summaryLabel}>{config.label}</Text>
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
          <Text style={styles.headerTitle}>Support Center</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading support tickets...</Text>
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
        <Text style={styles.headerTitle}>Support Center</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={callSupport} style={styles.headerBtn}>
            <Icon name="call-outline" size={20} color={C.ink} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => { resetForm(); setCreateModalVisible(true); }} style={styles.headerBtn}>
            <Icon name="add" size={24} color={C.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Restaurant Selector */}
      {currentRestaurant && (
        <TouchableOpacity
          style={styles.restaurantBanner}
          onPress={() => restaurants.length > 1 && setRestaurantPickerVisible(true)}
          activeOpacity={restaurants.length > 1 ? 0.7 : 1}
        >
          <Icon name="restaurant" size={18} color={C.primary} />
          <View style={styles.restaurantInfo}>
            <Text style={styles.restaurantName} numberOfLines={1}>
              {currentRestaurant.name}
            </Text>
            <Text style={styles.restaurantSubtext}>Get help with your equipment and services</Text>
          </View>
          {restaurants.length > 1 && (
            <View style={styles.switchBadge}>
              <Icon name="swap-horizontal" size={14} color={C.primary} />
              <Text style={styles.switchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Summary Cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryContainer}
      >
        {STATUS_OPTIONS.slice(1).map((status) => (
          <SummaryCard
            key={status.value}
            status={status.value}
            count={statusCounts[status.value] || 0}
            isActive={statusFilter === status.value}
            onPress={() => setStatusFilter(status.value)}
          />
        ))}
      </ScrollView>

      {/* Search & Filter */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <View style={styles.searchIconBox}>
            <Icon name="search" size={18} color={C.primary} />
          </View>
          <TextInput
            style={styles.searchInput}
            placeholder="Search tickets by title, ID..."
            placeholderTextColor={C.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
              <View style={styles.clearSearchIcon}>
                <Icon name="close" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setStatusPickerVisible(true)}>
          <View style={styles.filterIconBox}>
            <Icon name="filter" size={16} color={C.primary} />
          </View>
          <Icon name="chevron-down" size={14} color={C.muted} />
          {statusFilter !== 'all' && (
            <View style={styles.filterActiveDot} />
          )}
        </TouchableOpacity>
      </View>

      {/* Tickets List */}
      <FlatList
        data={filteredTickets}
        keyExtractor={item => item.id?.toString()}
        renderItem={renderTicketCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="chatbubbles-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Tickets Found</Text>
            <Text style={styles.emptyText}>
              {statusFilter !== 'all' ? 'Try changing the filter' : 'Create your first support ticket'}
            </Text>
            <TouchableOpacity
              style={styles.emptyBtn}
              onPress={() => { resetForm(); setCreateModalVisible(true); }}
            >
              <Icon name="add-circle" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>New Ticket</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ========== CREATE TICKET MODAL ========== */}
      <Modal visible={createModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Support Ticket</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.inputLabel}>Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="Brief description of your issue"
                placeholderTextColor={C.muted}
                value={formData.title}
                onChangeText={(text) => setFormData({ ...formData, title: text })}
              />

              <Text style={styles.inputLabel}>Category</Text>
              <TouchableOpacity
                style={styles.pickerInput}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text style={styles.pickerInputText}>{formData.category}</Text>
                <Icon name="chevron-down" size={20} color={C.muted} />
              </TouchableOpacity>

              <Text style={styles.inputLabel}>Equipment Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="If related to specific equipment"
                placeholderTextColor={C.muted}
                value={formData.equipmentName}
                onChangeText={(text) => setFormData({ ...formData, equipmentName: text })}
              />

              <Text style={styles.inputLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Describe your issue in detail..."
                placeholderTextColor={C.muted}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                multiline
                numberOfLines={4}
              />

              <Text style={styles.inputLabel}>Attachment (Optional)</Text>
              {ticketImageUri ? (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: ticketImageUri }} style={styles.imagePreview} />
                  <TouchableOpacity
                    style={styles.removeImageBtn}
                    onPress={() => setTicketImageUri('')}
                  >
                    <Icon name="close" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={styles.uploadBtn} onPress={pickTicketImage}>
                  <Icon name="cloud-upload-outline" size={20} color={C.primary} />
                  <Text style={styles.uploadBtnText}>Upload Image</Text>
                </TouchableOpacity>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isCreating && styles.submitBtnDisabled]}
                onPress={handleCreate}
                disabled={isCreating}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create Ticket</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== TICKET DETAIL MODAL ========== */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.detailHeaderLeft}>
                <Text style={styles.modalTitle}>Ticket #{selectedTicket?.id?.slice(0, 8)}</Text>
                {selectedTicket && (
                  <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusStyle(selectedTicket.status).bg }]}>
                    <Text style={[styles.statusTextSmall, { color: getStatusStyle(selectedTicket.status).color }]}>
                      {getStatusStyle(selectedTicket.status).label}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            {selectedTicket && (
              <>
                <ScrollView style={styles.modalBody}>
                  {/* Ticket Info */}
                  <View style={styles.ticketInfoCard}>
                    <Text style={styles.ticketInfoTitle}>{selectedTicket.title}</Text>
                    <View style={styles.ticketInfoMeta}>
                      <Text style={styles.ticketInfoMetaText}>Category: {selectedTicket.category}</Text>
                      {selectedTicket.equipmentName && (
                        <Text style={styles.ticketInfoMetaText}>Equipment: {selectedTicket.equipmentName}</Text>
                      )}
                    </View>
                    <Text style={styles.ticketInfoDesc}>{selectedTicket.description}</Text>
                    {selectedTicket.photoUrl && (
                      <View style={styles.ticketImageContainer}>
                        <Text style={styles.ticketImageLabel}>
                          <Icon name="image-outline" size={12} color={C.muted} /> Attachment
                        </Text>
                        <Image
                          source={{ uri: toStorageUrl(selectedTicket.photoUrl) }}
                          style={styles.ticketImage}
                          resizeMode="cover"
                        />
                      </View>
                    )}
                    <Text style={styles.ticketInfoDate}>Created: {formatDateTime(selectedTicket.createdAt)}</Text>
                  </View>

                  {/* Thread Messages */}
                  <Text style={styles.threadTitle}>Messages</Text>
                  {threads.length === 0 ? (
                    <Text style={styles.noMessages}>No messages yet. Start the conversation!</Text>
                  ) : (
                    threads.map((thread) => (
                      <View
                        key={thread.id}
                        style={[
                          styles.threadMessage,
                          thread.isAdmin ? styles.threadMessageAdmin : styles.threadMessageOwner,
                        ]}
                      >
                        <View style={styles.threadHeader}>
                          <Text style={styles.threadAuthor}>
                            {thread.user?.name || (thread.isAdmin ? 'Support' : 'You')}
                            {thread.isAdmin && (
                              <View style={styles.supportBadge}>
                                <Text style={styles.supportBadgeText}>Support</Text>
                              </View>
                            )}
                          </Text>
                          <Text style={styles.threadTime}>{formatDateTime(thread.createdAt)}</Text>
                        </View>
                        <Text style={styles.threadText}>{thread.message}</Text>
                        {thread.imageUrl && (
                          <Image
                            source={{ uri: toStorageUrl(thread.imageUrl) }}
                            style={styles.threadImage}
                            resizeMode="cover"
                          />
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Reply Section */}
                {canReply && (
                  <View style={styles.replySection}>
                    {replyImageUri && (
                      <View style={styles.replyImagePreview}>
                        <Image source={{ uri: replyImageUri }} style={styles.replyImage} />
                        <TouchableOpacity
                          style={styles.removeReplyImageBtn}
                          onPress={() => setReplyImageUri('')}
                        >
                          <Icon name="close" size={12} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    )}
                    <View style={styles.replyInputRow}>
                      <TextInput
                        style={styles.replyInput}
                        placeholder="Type your message..."
                        placeholderTextColor={C.muted}
                        value={newMessage}
                        onChangeText={setNewMessage}
                      />
                      <TouchableOpacity style={styles.attachBtn} onPress={pickReplyImage}>
                        <Icon name="image-outline" size={20} color={C.primary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.sendBtn, (!newMessage.trim() && !replyImageUri) && styles.sendBtnDisabled]}
                        onPress={handleSendMessage}
                        disabled={isSending || (!newMessage.trim() && !replyImageUri)}
                      >
                        {isSending ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Icon name="send" size={18} color="#fff" />
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* ========== STATUS PICKER MODAL ========== */}
      <Modal visible={statusPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Status</Text>
              <TouchableOpacity onPress={() => setStatusPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerBody}>
              {STATUS_OPTIONS.map((status) => {
                const isSelected = status.value === statusFilter;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => {
                      setStatusFilter(status.value);
                      setStatusPickerVisible(false);
                      loadData(currentRestaurant?.id);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                      {status.label}
                    </Text>
                    {isSelected && <Icon name="checkmark-circle" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========== CATEGORY PICKER MODAL ========== */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerBody}>
              {CATEGORY_OPTIONS.map((category) => {
                const isSelected = category === formData.category;
                return (
                  <TouchableOpacity
                    key={category}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => {
                      setFormData({ ...formData, category });
                      setCategoryPickerVisible(false);
                    }}
                  >
                    <Text style={[styles.pickerOptionText, isSelected && styles.pickerOptionTextSelected]}>
                      {category}
                    </Text>
                    {isSelected && <Icon name="checkmark-circle" size={20} color={C.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ========== RESTAURANT PICKER MODAL ========== */}
      <Modal visible={restaurantPickerVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.pickerContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Restaurant</Text>
              <TouchableOpacity onPress={() => setRestaurantPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.pickerBody}>
              {restaurants.map((restaurant) => {
                const isSelected = restaurant.id === currentRestaurant?.id;
                return (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[styles.restaurantOption, isSelected && styles.restaurantOptionSelected]}
                    onPress={() => selectRestaurant(restaurant)}
                  >
                    <View style={[styles.restaurantIcon, isSelected && styles.restaurantIconSelected]}>
                      <Icon name="restaurant" size={20} color={isSelected ? '#fff' : C.primary} />
                    </View>
                    <View style={styles.restaurantOptionInfo}>
                      <Text style={[styles.restaurantOptionName, isSelected && styles.restaurantOptionNameSelected]} numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                      {restaurant.address && (
                        <Text style={styles.restaurantOptionAddress} numberOfLines={1}>
                          {restaurant.address}
                        </Text>
                      )}
                    </View>
                    {isSelected && <Icon name="checkmark-circle" size={24} color={C.primary} />}
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
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerActions: { flexDirection: 'row', gap: 8 },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, fontSize: 14, color: C.muted },

  // Restaurant Banner
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FEF2F2',
  },
  restaurantInfo: { flex: 1 },
  restaurantName: { fontSize: 14, fontWeight: '600', color: C.primary },
  restaurantSubtext: { fontSize: 11, color: C.muted, marginTop: 2 },
  switchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.primary,
  },
  switchText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // Summary Cards
  summaryContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    minWidth: 80,
  },
  summaryCardActive: { borderColor: C.primary, backgroundColor: '#FEF2F2' },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryCount: { fontSize: 20, fontWeight: '700', color: C.ink },
  summaryLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    marginRight: 10,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  searchIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500', color: C.text, padding: 0 },
  clearSearchBtn: { padding: 8 },
  clearSearchIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 4,
    paddingRight: 12,
    paddingVertical: 4,
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  filterIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 6,
  },
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },

  list: { padding: 16 },

  // Ticket Card
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
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: { fontSize: 12, fontWeight: '600' },
  cardIdText: { fontSize: 12, color: C.muted, fontFamily: 'monospace' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 4 },
  cardEquipment: { fontSize: 13, color: C.muted, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: C.bg,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryText: { fontSize: 11, fontWeight: '600', color: C.text },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: C.muted },
  cardActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: { fontSize: 14, fontWeight: '700', color: C.primary },
  deleteBtn: { padding: 8 },

  // Empty State
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalBody: { padding: 20 },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // Form
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8, marginTop: 16 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
  pickerInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: C.border,
  },
  pickerInputText: { fontSize: 15, color: C.text },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.primary,
    borderStyle: 'dashed',
  },
  uploadBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },
  imagePreviewContainer: { position: 'relative', alignSelf: 'flex-start' },
  imagePreview: { width: 100, height: 100, borderRadius: 12, borderWidth: 1, borderColor: C.border },
  removeImageBtn: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelBtnText: { fontSize: 15, fontWeight: '700', color: C.ink },
  submitBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Detail Modal
  detailHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusTextSmall: { fontSize: 11, fontWeight: '600' },

  ticketInfoCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  ticketInfoTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 },
  ticketInfoMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  ticketInfoMetaText: { fontSize: 13, color: C.muted },
  ticketInfoDesc: { fontSize: 14, color: C.text, lineHeight: 20 },
  ticketImageContainer: { marginTop: 12 },
  ticketImageLabel: { fontSize: 11, color: C.muted, marginBottom: 6 },
  ticketImage: { width: '100%', height: 150, borderRadius: 10 },
  ticketInfoDate: { fontSize: 12, color: C.muted, marginTop: 12 },

  threadTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 12 },
  noMessages: { textAlign: 'center', color: C.muted, paddingVertical: 20 },

  threadMessage: { padding: 12, borderRadius: 12, marginBottom: 10 },
  threadMessageAdmin: { backgroundColor: '#FEF2F2', marginLeft: 32 },
  threadMessageOwner: { backgroundColor: C.bg, marginRight: 32 },
  threadHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  threadAuthor: { fontSize: 13, fontWeight: '600', color: C.ink },
  supportBadge: {
    backgroundColor: C.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 6,
  },
  supportBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  threadTime: { fontSize: 11, color: C.muted },
  threadText: { fontSize: 14, color: C.text, lineHeight: 20 },
  threadImage: { width: '100%', height: 120, borderRadius: 8, marginTop: 8 },

  replySection: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  replyImagePreview: { position: 'relative', alignSelf: 'flex-start', marginBottom: 10 },
  replyImage: { width: 60, height: 60, borderRadius: 8 },
  removeReplyImageBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  replyInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  replyInput: {
    flex: 1,
    backgroundColor: C.bg,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },
  attachBtn: { padding: 8 },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: C.border },

  // Picker Modal
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerBody: { padding: 16 },
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  pickerOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  pickerOptionText: { fontSize: 15, fontWeight: '600', color: C.ink },
  pickerOptionTextSelected: { color: C.primary },

  // Restaurant Picker
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  restaurantIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  restaurantIconSelected: { backgroundColor: C.primary },
  restaurantOptionInfo: { flex: 1 },
  restaurantOptionName: { fontSize: 15, fontWeight: '700', color: C.ink },
  restaurantOptionNameSelected: { color: C.primary },
  restaurantOptionAddress: { fontSize: 12, color: C.muted, marginTop: 2 },
});
