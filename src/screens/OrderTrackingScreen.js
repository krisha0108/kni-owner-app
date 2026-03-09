import React, { useState, useCallback } from 'react';
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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width, height: SCREEN_HEIGHT } = Dimensions.get('window');

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
  indigo: '#6366F1',
};

const SERVICE_STATUSES = [
  { value: 'all', label: 'All Status', icon: 'apps' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment', icon: 'time' },
  { value: 'SCHEDULED', label: 'Scheduled', icon: 'calendar' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: 'construct' },
  { value: 'COMPLETED', label: 'Completed', icon: 'checkmark-circle' },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle' },
];

const ORDER_STATUSES = [
  { value: 'all', label: 'All Status', icon: 'apps' },
  { value: 'PENDING', label: 'Pending', icon: 'time' },
  { value: 'PLACED', label: 'Placed', icon: 'time' },
  { value: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle' },
  { value: 'PROCESSING', label: 'Processing', icon: 'cube' },
  { value: 'SHIPPED', label: 'Shipped', icon: 'car' },
  { value: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done' },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle' },
];

const SERVICE_STATUS_CONFIG = {
  PENDING_PAYMENT: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Pending Payment', gradient: ['#FBBF24', '#F59E0B'] },
  PAYMENT_UPLOADED: { bg: '#E0E7FF', color: '#6366F1', icon: 'cloud-upload', label: 'Payment Uploaded', gradient: ['#818CF8', '#6366F1'] },
  PAYMENT_VERIFIED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Payment Verified', gradient: ['#34D399', '#10B981'] },
  SLOT_SELECTED: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Slot Selected', gradient: ['#FBBF24', '#F59E0B'] },
  SCHEDULED: { bg: '#DBEAFE', color: '#2563EB', icon: 'calendar', label: 'Scheduled', gradient: ['#60A5FA', '#3B82F6'] },
  IN_PROGRESS: { bg: '#E0E7FF', color: '#4F46E5', icon: 'construct', label: 'In Progress', gradient: ['#818CF8', '#6366F1'] },
  COMPLETED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done', label: 'Completed', gradient: ['#34D399', '#10B981'] },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled', gradient: ['#F87171', '#EF4444'] },
};

const ORDER_STATUS_CONFIG = {
  PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Pending', gradient: ['#FBBF24', '#F59E0B'] },
  PLACED: { bg: '#FEF3C7', color: '#D97706', icon: 'receipt', label: 'Placed', gradient: ['#FBBF24', '#F59E0B'] },
  CONFIRMED: { bg: '#DBEAFE', color: '#2563EB', icon: 'checkmark-circle', label: 'Confirmed', gradient: ['#60A5FA', '#3B82F6'] },
  PROCESSING: { bg: '#E0E7FF', color: '#4F46E5', icon: 'cube', label: 'Processing', gradient: ['#818CF8', '#6366F1'] },
  SHIPPED: { bg: '#F5F3FF', color: '#7C3AED', icon: 'car', label: 'Shipped', gradient: ['#A78BFA', '#8B5CF6'] },
  DELIVERED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done', label: 'Delivered', gradient: ['#34D399', '#10B981'] },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled', gradient: ['#F87171', '#EF4444'] },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatDateTime = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (price) => `₹${(price || 0).toLocaleString('en-IN')}`;

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
  return formatDate(dateString);
};

// Premium Timeline Step
function TimelineStep({ step, isLast }) {
  return (
    <View style={s.tlRow}>
      <View style={s.tlLeft}>
        {step.isCompleted ? (
          <LinearGradient colors={['#10B981', '#059669']} style={s.tlDotDone}>
            <Icon name="checkmark" size={scale(11)} color="#fff" />
          </LinearGradient>
        ) : step.isCurrent ? (
          <View style={s.tlDotCurrent}>
            <View style={s.tlDotCurrentInner} />
          </View>
        ) : (
          <View style={s.tlDotPending} />
        )}
        {!isLast && (
          <View style={[s.tlLine, step.isCompleted && s.tlLineDone]} />
        )}
      </View>
      <View style={[s.tlContent, isLast && { paddingBottom: 0 }]}>
        <Text style={[s.tlTitle, (step.isCompleted || step.isCurrent) && s.tlTitleActive, step.isCurrent && s.tlTitleCurrent]}>
          {step.title}
        </Text>
        {step.description && <Text style={s.tlDesc}>{step.description}</Text>}
        {step.date && (
          <View style={s.tlDatePill}>
            <Icon name="calendar-outline" size={scale(11)} color={C.muted} />
            <Text style={s.tlDate}>{formatDateTime(step.date)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

export default function OrderTrackingScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const [serviceBookings, setServiceBookings] = useState([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);

  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetailVisible, setServiceDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);

  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async (restaurantId = null) => {
    try {
      setLoading(true);
      const restaurantsRes = await api.get('/owner/restaurants/accessible');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const approvedRestaurants = restaurantsRes.data.data.map(item => ({
          ...item.restaurant,
          restaurantRole: item.role,
        }));
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
          const [bookingsRes, ordersRes] = await Promise.all([
            api.get(`/owner/bookings?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
            api.get(`/owner/marketplace/orders?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
          ]);
          if (bookingsRes.data.ok) setServiceBookings(bookingsRes.data.data || []);
          if (ordersRes.data.ok) setMarketplaceOrders(ordersRes.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const selectRestaurant = (restaurant) => {
    setRestaurantPickerVisible(false);
    if (restaurant.id !== currentRestaurant?.id) {
      setCurrentRestaurant(restaurant);
      setServiceBookings([]);
      setMarketplaceOrders([]);
      loadData(restaurant.id);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentRestaurant?.id);
  };

  const filteredServices = serviceBookings.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = serviceStatusFilter === 'all' || b.status === serviceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = marketplaceOrders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getServiceStatusStyle = (status) =>
    SERVICE_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time', label: status, gradient: ['#9CA3AF', '#6B7280'] };

  const getOrderStatusStyle = (status) =>
    ORDER_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time', label: status, gradient: ['#9CA3AF', '#6B7280'] };

  const getServiceTimeline = (booking) => {
    const statusOrder = ['PENDING_PAYMENT', 'PAYMENT_VERIFIED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED'];
    const currentIndex = statusOrder.indexOf(booking.status);
    const isCancelled = booking.status === 'CANCELLED';
    return [
      { title: 'Order Placed', description: 'Service request created', date: booking.createdAt, step: 0 },
      { title: 'Payment Verified', description: 'Payment confirmed', step: 1 },
      { title: 'Scheduled', description: booking.slotStartDateTime ? `Scheduled for ${formatDate(booking.slotStartDateTime)}` : 'Pending scheduling', step: 2 },
      { title: 'In Progress', description: booking.engineerAssignments?.[0]?.engineer?.name ? `Assigned to ${booking.engineerAssignments[0].engineer.name}` : 'Engineer working', step: 3 },
      { title: isCancelled ? 'Cancelled' : 'Completed', description: isCancelled ? 'Service cancelled' : 'Service completed', step: 4 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentIndex >= item.step,
      isCurrent: !isCancelled && currentIndex === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const getOrderTimeline = (order) => {
    const statusOrder = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    let currentIndex = statusOrder.indexOf(order.status);
    const isCancelled = order.status === 'CANCELLED';
    return [
      { title: 'Order Placed', description: 'Your order has been placed', date: order.createdAt, step: 0 },
      { title: 'Confirmed', description: 'Order confirmed by vendor', step: 1 },
      { title: 'Processing', description: 'Order being prepared', step: 2 },
      { title: 'Shipped', description: 'Order dispatched', step: 3 },
      { title: isCancelled ? 'Cancelled' : 'Delivered', description: isCancelled ? 'Order cancelled' : 'Order delivered', step: 4 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentIndex >= item.step,
      isCurrent: !isCancelled && currentIndex === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const currentStatusOptions = activeTab === 'services' ? SERVICE_STATUSES : ORDER_STATUSES;
  const currentStatusFilter = activeTab === 'services' ? serviceStatusFilter : orderStatusFilter;
  const setCurrentStatusFilter = activeTab === 'services' ? setServiceStatusFilter : setOrderStatusFilter;

  // Stats
  const activeServices = serviceBookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status)).length;
  const activeOrders = marketplaceOrders.filter(o => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  // Render Service Card
  const renderServiceCard = ({ item }) => {
    const ss = getServiceStatusStyle(item.status);
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { setSelectedService(item); setServiceDetailVisible(true); }}
        activeOpacity={0.7}
      >
        <LinearGradient colors={ss.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cardAccent} />
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <LinearGradient colors={ss.gradient} style={s.cardIconBox}>
              <Icon name={ss.icon} size={scale(16)} color="#fff" />
            </LinearGradient>
            <View style={s.cardTopInfo}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.equipment?.name || 'General Service'}</Text>
              <Text style={s.cardId}>#{item.id?.slice(0, 8)}</Text>
            </View>
            <Icon name="chevron-forward" size={scale(18)} color={C.muted} />
          </View>

          <View style={s.cardBottomRow}>
            <View style={[s.statusPill, { backgroundColor: ss.bg }]}>
              <Icon name={ss.icon} size={scale(12)} color={ss.color} />
              <Text style={[s.statusPillText, { color: ss.color }]}>{ss.label}</Text>
            </View>
            <View style={s.cardMetaRight}>
              <Text style={s.cardDate}>{formatTimeAgo(item.createdAt)}</Text>
              <Text style={s.cardPrice}>{formatPrice(item.totalAmount)}</Text>
            </View>
          </View>

          {item.slotStartDateTime && (
            <View style={s.scheduleRow}>
              <Icon name="calendar" size={scale(13)} color={C.info} />
              <Text style={s.scheduleText}>Scheduled: {formatDate(item.slotStartDateTime)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Order Card
  const renderOrderCard = ({ item }) => {
    const os = getOrderStatusStyle(item.status);
    const itemCount = item.items?.length || 0;
    return (
      <TouchableOpacity
        style={s.card}
        onPress={() => { setSelectedOrder(item); setOrderDetailVisible(true); }}
        activeOpacity={0.7}
      >
        <LinearGradient colors={os.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={s.cardAccent} />
        <View style={s.cardBody}>
          <View style={s.cardTopRow}>
            <LinearGradient colors={os.gradient} style={s.cardIconBox}>
              <Icon name={os.icon} size={scale(16)} color="#fff" />
            </LinearGradient>
            <View style={s.cardTopInfo}>
              <Text style={s.cardTitle} numberOfLines={1}>{itemCount} Item{itemCount !== 1 ? 's' : ''}</Text>
              <Text style={s.cardId}>#{item.id?.slice(0, 8)}</Text>
            </View>
            <Icon name="chevron-forward" size={scale(18)} color={C.muted} />
          </View>

          <View style={s.cardBottomRow}>
            <View style={[s.statusPill, { backgroundColor: os.bg }]}>
              <Icon name={os.icon} size={scale(12)} color={os.color} />
              <Text style={[s.statusPillText, { color: os.color }]}>{os.label}</Text>
            </View>
            <View style={s.cardMetaRight}>
              <Text style={s.cardDate}>{formatTimeAgo(item.createdAt)}</Text>
              <Text style={s.cardPrice}>{formatPrice(item.totalAmount)}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmpty = () => (
    <View style={s.emptyBox}>
      <LinearGradient
        colors={activeTab === 'services' ? ['#EFF6FF', '#DBEAFE'] : ['#F5F3FF', '#EDE9FE']}
        style={s.emptyCircle}
      >
        <Icon
          name={activeTab === 'services' ? 'construct' : 'bag'}
          size={scale(44)}
          color={activeTab === 'services' ? '#3B82F6' : '#7C3AED'}
        />
      </LinearGradient>
      <Text style={s.emptyTitle}>
        {activeTab === 'services' ? 'No Service Bookings' : 'No Marketplace Orders'}
      </Text>
      <Text style={s.emptySubtitle}>No items match your current filters</Text>
      <TouchableOpacity style={s.emptyBtn} onPress={onRefresh}>
        <Icon name="refresh" size={scale(16)} color={C.primary} />
        <Text style={s.emptyBtnText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={s.container}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={s.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Order Tracking</Text>
          <View style={{ width: scale(38) }} />
        </LinearGradient>
        <View style={s.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={s.loadingText}>Loading tracking data...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={s.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.headerBtn}>
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Order Tracking</Text>
          {(activeServices + activeOrders) > 0 && (
            <View style={s.headerBadge}>
              <Text style={s.headerBadgeText}>{activeServices + activeOrders} active</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={s.headerBtn}>
          <Icon name="menu" size={scale(22)} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Restaurant Banner - Fixed */}
      {currentRestaurant && (
        <TouchableOpacity
          style={s.restBanner}
          onPress={() => restaurants.length > 1 && setRestaurantPickerVisible(true)}
          activeOpacity={restaurants.length > 1 ? 0.7 : 1}
        >
          <View style={s.restIconBox}>
            <Icon name="restaurant" size={scale(15)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.restName} numberOfLines={1}>{currentRestaurant.name}</Text>
            <Text style={s.restSub}>Tracking orders for this restaurant</Text>
          </View>
          {restaurants.length > 1 && (
            <View style={s.restSwitch}>
              <Icon name="swap-horizontal" size={scale(14)} color={C.primary} />
              <Text style={s.restSwitchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Tabs - Fixed */}
      <View style={s.tabBar}>
        <TouchableOpacity
          style={[s.tab, activeTab === 'services' && s.tabActive]}
          onPress={() => setActiveTab('services')}
          activeOpacity={0.7}
        >
          <Icon name="construct" size={scale(16)} color={activeTab === 'services' ? '#fff' : C.muted} />
          <Text style={[s.tabText, activeTab === 'services' && s.tabTextActive]}>Services</Text>
          {activeServices > 0 && (
            <View style={[s.tabCountBadge, activeTab === 'services' && s.tabCountBadgeActive]}>
              <Text style={[s.tabCountText, activeTab === 'services' && s.tabCountTextActive]}>
                {activeServices}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.tab, activeTab === 'orders' && s.tabActive]}
          onPress={() => setActiveTab('orders')}
          activeOpacity={0.7}
        >
          <Icon name="bag" size={scale(16)} color={activeTab === 'orders' ? '#fff' : C.muted} />
          <Text style={[s.tabText, activeTab === 'orders' && s.tabTextActive]}>Orders</Text>
          {activeOrders > 0 && (
            <View style={[s.tabCountBadge, activeTab === 'orders' && s.tabCountBadgeActive]}>
              <Text style={[s.tabCountText, activeTab === 'orders' && s.tabCountTextActive]}>
                {activeOrders}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Search & Filter - Fixed */}
      <View style={s.filterBar}>
        <View style={s.searchBox}>
          <Icon name="search" size={scale(17)} color={C.muted} />
          <TextInput
            style={s.searchInput}
            placeholder={activeTab === 'services' ? 'Search by ID or equipment...' : 'Search by order ID...'}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={scale(17)} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setStatusPickerVisible(true)}>
          <Icon name="funnel" size={scale(15)} color={C.primary} />
          <Text style={s.filterBtnText} numberOfLines={1}>
            {currentStatusOptions.find(st => st.value === currentStatusFilter)?.label || 'Filter'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* List Title */}
      <View style={s.listTitleRow}>
        <Text style={s.listTitle}>
          {activeTab === 'services' ? 'Service Bookings' : 'Marketplace Orders'}
        </Text>
        <Text style={s.listCount}>
          {activeTab === 'services' ? filteredServices.length : filteredOrders.length} items
        </Text>
      </View>

      {/* Scrollable List */}
      {activeTab === 'services' ? (
        <FlatList
          data={filteredServices}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderServiceCard}
          contentContainerStyle={s.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ListEmptyComponent={renderEmpty}
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderOrderCard}
          contentContainerStyle={s.list}
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ListEmptyComponent={renderEmpty}
        />
      )}

      {/* ========== SERVICE DETAIL MODAL ========== */}
      <Modal visible={serviceDetailVisible} animationType="slide" transparent>
        <View style={s.detailOverlay}>
          <View style={s.detailContent}>
            <View style={s.detailHeader}>
              <Text style={s.detailTitle}>Service Booking</Text>
              <TouchableOpacity onPress={() => setServiceDetailVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.detailBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator bounces>
              {selectedService ? (
                <>
                  {(() => {
                    const ss = getServiceStatusStyle(selectedService.status);
                    return (
                      <LinearGradient colors={ss.gradient} style={s.modalStatusBanner}>
                        <View style={s.modalStatusIcon}>
                          <Icon name={ss.icon} size={scale(22)} color={ss.color} />
                        </View>
                        <View>
                          <Text style={s.modalStatusLabel}>{ss.label}</Text>
                          <Text style={s.modalStatusDate}>Updated {formatTimeAgo(selectedService.updatedAt || selectedService.createdAt)}</Text>
                        </View>
                      </LinearGradient>
                    );
                  })()}
                  <View style={s.modalSection}>
                    <View style={s.modalSectionHeader}>
                      <View style={[s.modalSectionIcon, { backgroundColor: '#EFF6FF' }]}>
                        <Icon name="construct" size={scale(16)} color="#3B82F6" />
                      </View>
                      <Text style={s.modalSectionTitle}>Service Details</Text>
                    </View>
                    <View style={s.modalInfoCard}>
                      <View style={s.modalInfoRow}>
                        <Text style={s.modalInfoLabel}>Equipment</Text>
                        <Text style={s.modalInfoValue}>{selectedService.equipment?.name || 'General Service'}</Text>
                      </View>
                      {selectedService.problemDescription && (
                        <View style={s.modalInfoRow}>
                          <Text style={s.modalInfoLabel}>Problem</Text>
                          <Text style={s.modalInfoValue}>{selectedService.problemDescription}</Text>
                        </View>
                      )}
                      <View style={s.modalInfoRow}>
                        <Text style={s.modalInfoLabel}>Date</Text>
                        <Text style={s.modalInfoValue}>
                          {selectedService.slotStartDateTime ? formatDate(selectedService.slotStartDateTime) : 'Not scheduled'}
                        </Text>
                      </View>
                      <View style={[s.modalInfoRow, { borderBottomWidth: 0 }]}>
                        <Text style={s.modalInfoLabel}>Amount</Text>
                        <Text style={[s.modalInfoValue, { color: C.primary, fontWeight: '800', fontSize: moderateScale(18) }]}>
                          {formatPrice(selectedService.totalAmount)}
                        </Text>
                      </View>
                    </View>
                  </View>
                  {selectedService.engineerAssignments?.[0] && (
                    <View style={s.modalSection}>
                      <View style={s.modalSectionHeader}>
                        <View style={[s.modalSectionIcon, { backgroundColor: '#FEF2F2' }]}>
                          <Icon name="person" size={scale(16)} color={C.primary} />
                        </View>
                        <Text style={s.modalSectionTitle}>Assigned Engineer</Text>
                      </View>
                      <View style={s.engineerCardModal}>
                        <LinearGradient colors={[C.primary, C.primaryDark]} style={s.engineerAvatarModal}>
                          <Icon name="person" size={scale(22)} color="#fff" />
                        </LinearGradient>
                        <View style={{ flex: 1 }}>
                          <Text style={s.engineerNameModal}>
                            {selectedService.engineerAssignments[0].engineer?.name || 'Assigned Engineer'}
                          </Text>
                          {selectedService.engineerAssignments[0].engineer?.phone && (
                            <View style={s.engineerPhoneRow}>
                              <Icon name="call" size={scale(12)} color={C.ok} />
                              <Text style={s.engineerPhoneModal}>
                                {selectedService.engineerAssignments[0].engineer.phone}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  )}
                  <View style={s.modalSection}>
                    <View style={s.modalSectionHeader}>
                      <View style={[s.modalSectionIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Icon name="git-branch" size={scale(16)} color="#059669" />
                      </View>
                      <Text style={s.modalSectionTitle}>Tracking Timeline</Text>
                    </View>
                    <View style={s.tlWrapper}>
                      {getServiceTimeline(selectedService).map((step, index) => (
                        <TimelineStep key={index} step={step} isLast={step.isLast} />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <View style={s.detailFooter}>
              <TouchableOpacity style={s.detailCloseFullBtn} onPress={() => setServiceDetailVisible(false)}>
                <Text style={s.detailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== ORDER DETAIL MODAL ========== */}
      <Modal visible={orderDetailVisible} animationType="slide" transparent>
        <View style={s.detailOverlay}>
          <View style={s.detailContent}>
            <View style={s.detailHeader}>
              <Text style={s.detailTitle}>Marketplace Order</Text>
              <TouchableOpacity onPress={() => setOrderDetailVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.detailBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator bounces>
              {selectedOrder ? (
                <>
                  {(() => {
                    const os = getOrderStatusStyle(selectedOrder.status);
                    return (
                      <LinearGradient colors={os.gradient} style={s.modalStatusBanner}>
                        <View style={s.modalStatusIcon}>
                          <Icon name={os.icon} size={scale(22)} color={os.color} />
                        </View>
                        <View>
                          <Text style={s.modalStatusLabel}>{os.label}</Text>
                          <Text style={s.modalStatusDate}>Ordered {formatTimeAgo(selectedOrder.createdAt)}</Text>
                        </View>
                      </LinearGradient>
                    );
                  })()}
                  <View style={s.modalSection}>
                    <View style={s.modalSectionHeader}>
                      <View style={[s.modalSectionIcon, { backgroundColor: '#F5F3FF' }]}>
                        <Icon name="bag" size={scale(16)} color="#7C3AED" />
                      </View>
                      <Text style={s.modalSectionTitle}>Order Items</Text>
                    </View>
                    <View style={s.modalInfoCard}>
                      {selectedOrder.items?.map((item, index) => (
                        <View key={index} style={s.orderItemRow}>
                          <View style={{ flex: 1 }}>
                            <Text style={s.orderItemName}>{item.product?.name || 'Product'}</Text>
                            <Text style={s.orderItemQty}>Qty: {item.qty || item.quantity || 1}</Text>
                          </View>
                          <Text style={s.orderItemPrice}>
                            {formatPrice((item.priceSnapshot || item.price || 0) * (item.qty || item.quantity || 1))}
                          </Text>
                        </View>
                      ))}
                      <View style={s.orderTotalRow}>
                        <Text style={s.orderTotalLabel}>Total Amount</Text>
                        <Text style={s.orderTotalPrice}>{formatPrice(selectedOrder.totalAmount)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={s.modalSection}>
                    <View style={s.modalSectionHeader}>
                      <View style={[s.modalSectionIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Icon name="git-branch" size={scale(16)} color="#059669" />
                      </View>
                      <Text style={s.modalSectionTitle}>Delivery Timeline</Text>
                    </View>
                    <View style={s.tlWrapper}>
                      {getOrderTimeline(selectedOrder).map((step, index) => (
                        <TimelineStep key={index} step={step} isLast={step.isLast} />
                      ))}
                    </View>
                  </View>
                </>
              ) : null}
            </ScrollView>
            <View style={s.detailFooter}>
              <TouchableOpacity style={s.detailCloseFullBtn} onPress={() => setOrderDetailVisible(false)}>
                <Text style={s.detailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== STATUS PICKER MODAL ========== */}
      <Modal visible={statusPickerVisible} animationType="slide" transparent>
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.modalDragBar} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Filter by Status</Text>
                <Text style={s.modalSubtitle}>Select a status to filter</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusPickerVisible(false)} style={s.modalCloseBtn}>
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: scale(16) }} contentContainerStyle={{ paddingBottom: scale(30) }}>
              {currentStatusOptions.map((status) => {
                const isSelected = status.value === currentStatusFilter;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[s.pickerOption, isSelected && s.pickerOptionSelected]}
                    onPress={() => { setCurrentStatusFilter(status.value); setStatusPickerVisible(false); }}
                    activeOpacity={0.7}
                  >
                    <View style={s.pickerOptionLeft}>
                      <Icon name={status.icon} size={scale(18)} color={isSelected ? C.primary : C.muted} />
                      <Text style={[s.pickerOptionText, isSelected && s.pickerOptionTextSelected]}>
                        {status.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <View style={s.pickerCheck}>
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

      {/* ========== RESTAURANT PICKER MODAL ========== */}
      <Modal visible={restaurantPickerVisible} animationType="slide" transparent>
        <View style={s.pickerOverlay}>
          <View style={s.pickerSheet}>
            <View style={s.modalDragBar} />
            <View style={s.modalHeader}>
              <View>
                <Text style={s.modalTitle}>Select Restaurant</Text>
                <Text style={s.modalSubtitle}>{restaurants.length} restaurants</Text>
              </View>
              <TouchableOpacity onPress={() => setRestaurantPickerVisible(false)} style={s.modalCloseBtn}>
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>
            <ScrollView style={{ padding: scale(16) }} contentContainerStyle={{ paddingBottom: scale(30) }}>
              {restaurants.map((restaurant) => {
                const isSelected = restaurant.id === currentRestaurant?.id;
                return (
                  <TouchableOpacity
                    key={restaurant.id}
                    style={[s.restOption, isSelected && s.restOptionSelected]}
                    onPress={() => selectRestaurant(restaurant)}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isSelected ? [C.primary, C.primaryDark] : ['#FEE2E2', '#FEE2E2']}
                      style={s.restOptionIcon}
                    >
                      <Icon name="restaurant" size={scale(18)} color={isSelected ? '#fff' : C.primary} />
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.restOptionName, isSelected && { color: C.primary }]} numberOfLines={1}>
                        {restaurant.name}
                      </Text>
                      {restaurant.address && (
                        <Text style={s.restOptionAddr} numberOfLines={1}>{restaurant.address}</Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={s.restSelectedCheck}>
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

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  headerBtn: {
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
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: scale(10),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  headerBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#fff',
  },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(12), fontSize: moderateScale(14), color: C.muted },

  // Restaurant Banner
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restName: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  restSub: { fontSize: moderateScale(11), color: C.muted, marginTop: 1 },
  restSwitch: {
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
  restSwitchText: { fontSize: moderateScale(12), fontWeight: '700', color: C.primary },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
    borderRadius: scale(12),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: { fontSize: moderateScale(13), fontWeight: '700', color: C.muted },
  tabTextActive: { color: '#fff' },
  tabCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(6),
    paddingVertical: 1,
    borderRadius: scale(8),
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabCountText: { fontSize: moderateScale(10), fontWeight: '700', color: '#D97706' },
  tabCountTextActive: { color: '#fff' },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: '#F8FAFC',
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(9),
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: moderateScale(13), color: C.text, padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(12),
    paddingVertical: scale(9),
    backgroundColor: '#FFF5F5',
    borderRadius: scale(12),
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  filterBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: C.primary, maxWidth: scale(70) },

  // List Title
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(4),
  },
  listTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  listCount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },

  list: { paddingHorizontal: scale(16), paddingBottom: scale(100), flexGrow: 1 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(8),
    elevation: 2,
  },
  cardAccent: { height: scale(3) },
  cardBody: { padding: scale(14) },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(12),
  },
  cardIconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopInfo: { flex: 1 },
  cardTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  cardId: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusPillText: { fontSize: moderateScale(11), fontWeight: '700' },
  cardMetaRight: { alignItems: 'flex-end' },
  cardDate: { fontSize: moderateScale(11), color: C.muted },
  cardPrice: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink, marginTop: scale(2) },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    marginTop: scale(10),
    backgroundColor: '#EFF6FF',
    paddingHorizontal: scale(10),
    paddingVertical: scale(6),
    borderRadius: scale(8),
  },
  scheduleText: { fontSize: moderateScale(12), fontWeight: '600', color: C.info },

  // Empty State
  emptyBox: { alignItems: 'center', paddingTop: scale(60), paddingBottom: scale(40) },
  emptyCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink, marginBottom: scale(6) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, marginBottom: scale(20) },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  emptyBtnText: { fontSize: moderateScale(14), fontWeight: '600', color: C.primary },

  // Detail Modal - exact copy from EquipmentProfileScreen
  detailOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: '85%' },
  detailHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  detailTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },
  detailBody: { flex: 1 },
  detailFooter: { padding: scale(16), borderTopWidth: 1, borderTopColor: C.border },
  detailCloseFullBtn: {
    paddingVertical: scale(14),
    backgroundColor: '#F1F5F9',
    borderRadius: scale(12),
    alignItems: 'center',
  },
  detailCloseBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },

  // Picker modal styles
  modalDragBar: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: scale(12),
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingTop: scale(14),
    paddingBottom: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  modalSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: 1 },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Modal Status Banner
  modalStatusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    padding: scale(16),
    borderRadius: scale(16),
    marginBottom: scale(16),
  },
  modalStatusIcon: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(16),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalStatusLabel: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },
  modalStatusDate: { fontSize: moderateScale(12), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },

  // Modal Section
  modalSection: { marginBottom: scale(16) },
  modalSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(12),
  },
  modalSectionIcon: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalSectionTitle: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink },
  modalInfoCard: {
    backgroundColor: '#FAFBFC',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
  },
  modalInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalInfoLabel: { fontSize: moderateScale(13), color: C.muted, fontWeight: '500' },
  modalInfoValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, textAlign: 'right', flex: 1, marginLeft: scale(12) },

  // Engineer Card in Modal
  engineerCardModal: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(14),
    padding: scale(14),
    borderRadius: scale(14),
    backgroundColor: '#FAFBFC',
    borderWidth: 1,
    borderColor: C.border,
  },
  engineerAvatarModal: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineerNameModal: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  engineerPhoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(4),
  },
  engineerPhoneModal: { fontSize: moderateScale(13), color: C.muted },

  // Order Items
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderItemName: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  orderItemQty: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  orderItemPrice: { fontSize: moderateScale(14), fontWeight: '600', color: C.text },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(14),
    backgroundColor: '#F8FAFC',
  },
  orderTotalLabel: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  orderTotalPrice: { fontSize: moderateScale(18), fontWeight: '800', color: C.primary },

  // Timeline
  tlWrapper: { paddingLeft: scale(4) },
  tlRow: { flexDirection: 'row' },
  tlLeft: { alignItems: 'center', marginRight: scale(14) },
  tlDotDone: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotCurrent: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tlDotCurrentInner: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    backgroundColor: C.primary,
  },
  tlDotPending: {
    width: scale(24),
    height: scale(24),
    borderRadius: scale(12),
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: C.border,
  },
  tlLine: {
    width: scale(2.5),
    flex: 1,
    minHeight: scale(32),
    backgroundColor: '#E5E7EB',
    marginVertical: scale(3),
    borderRadius: scale(2),
  },
  tlLineDone: { backgroundColor: '#10B981' },
  tlContent: { flex: 1, paddingBottom: scale(20) },
  tlTitle: { fontSize: moderateScale(13), fontWeight: '600', color: C.muted },
  tlTitleActive: { color: C.ink, fontWeight: '700' },
  tlTitleCurrent: { color: C.primary },
  tlDesc: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  tlDatePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(5),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  tlDate: { fontSize: moderateScale(11), color: C.muted },

  // Picker Sheet
  pickerOverlay: {
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
  pickerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: scale(14),
    marginBottom: scale(8),
    borderRadius: scale(14),
    borderWidth: 1.5,
    borderColor: C.border,
    backgroundColor: '#FAFBFC',
  },
  pickerOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  pickerOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
  },
  pickerOptionText: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  pickerOptionTextSelected: { color: C.primary },
  pickerCheck: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Restaurant Picker
  restOption: {
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
  restOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  restOptionIcon: {
    width: scale(42),
    height: scale(42),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  restOptionName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  restOptionAddr: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  restSelectedCheck: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
