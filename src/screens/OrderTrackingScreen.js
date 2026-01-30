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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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

// Service Booking Statuses
const SERVICE_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

// Marketplace Order Statuses
const ORDER_STATUSES = [
  { value: 'all', label: 'All Status' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SERVICE_STATUS_CONFIG = {
  PENDING_PAYMENT: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending Payment' },
  PAYMENT_UPLOADED: { bg: '#E0E7FF', color: '#6366F1', icon: 'cloud-upload-outline', label: 'Payment Uploaded' },
  PAYMENT_VERIFIED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle-outline', label: 'Payment Verified' },
  SCHEDULED: { bg: '#DBEAFE', color: '#2563EB', icon: 'calendar-outline', label: 'Scheduled' },
  IN_PROGRESS: { bg: '#E0E7FF', color: '#4F46E5', icon: 'construct-outline', label: 'In Progress' },
  COMPLETED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done-outline', label: 'Completed' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled' },
};

const ORDER_STATUS_CONFIG = {
  PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' },
  PLACED: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Placed' },
  CONFIRMED: { bg: '#DBEAFE', color: '#2563EB', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  PROCESSING: { bg: '#E0E7FF', color: '#4F46E5', icon: 'cube-outline', label: 'Processing' },
  SHIPPED: { bg: '#F3E8FF', color: '#9333EA', icon: 'car-outline', label: 'Shipped' },
  DELIVERED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done-outline', label: 'Delivered' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled' },
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPrice = (price) => `₹${price || 0}`;

// Timeline Step Component
function TimelineStep({ step, isLast }) {
  return (
    <View style={styles.timelineRow}>
      <View style={styles.timelineLeft}>
        <View style={[styles.timelineDot, step.isCompleted && styles.timelineDotCompleted, step.isCurrent && styles.timelineDotCurrent]}>
          {step.isCompleted ? (
            <Icon name="checkmark" size={10} color="#fff" />
          ) : (
            <View style={styles.timelineDotInner} />
          )}
        </View>
        {!isLast && <View style={[styles.timelineLine, step.isCompleted && styles.timelineLineCompleted]} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineTitle, (step.isCompleted || step.isCurrent) && styles.timelineTitleActive]}>
          {step.title}
        </Text>
        {step.description && <Text style={styles.timelineDesc}>{step.description}</Text>}
        {step.date && <Text style={styles.timelineTime}>{formatDate(step.date)}</Text>}
      </View>
    </View>
  );
}

export default function OrderTrackingScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('services'); // 'services' or 'orders'

  // Data
  const [serviceBookings, setServiceBookings] = useState([]);
  const [marketplaceOrders, setMarketplaceOrders] = useState([]);

  // Restaurant
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('all');
  const [orderStatusFilter, setOrderStatusFilter] = useState('all');
  const [statusPickerVisible, setStatusPickerVisible] = useState(false);

  // Detail Modals
  const [selectedService, setSelectedService] = useState(null);
  const [serviceDetailVisible, setServiceDetailVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [orderDetailVisible, setOrderDetailVisible] = useState(false);

  // Navigation Menu
  const [menuVisible, setMenuVisible] = useState(false);

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

          // Fetch both bookings and orders in parallel
          const [bookingsRes, ordersRes] = await Promise.all([
            api.get(`/owner/bookings?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
            api.get(`/owner/marketplace/orders?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
          ]);

          if (bookingsRes.data.ok) {
            setServiceBookings(bookingsRes.data.data || []);
          }
          if (ordersRes.data.ok) {
            setMarketplaceOrders(ordersRes.data.data || []);
          }
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

  // Filter service bookings
  const filteredServices = serviceBookings.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = serviceStatusFilter === 'all' || b.status === serviceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter marketplace orders
  const filteredOrders = marketplaceOrders.filter((o) => {
    const matchesSearch = !searchQuery ||
      o.id?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getServiceStatusStyle = (status) => {
    return SERVICE_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time-outline', label: status };
  };

  const getOrderStatusStyle = (status) => {
    return ORDER_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time-outline', label: status };
  };

  // Timeline generators
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
    const statusOrder = ['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];
    let currentIndex = statusOrder.indexOf(order.status);
    if (order.status === 'PLACED') currentIndex = 0; // Treat PLACED as PENDING
    const isCancelled = order.status === 'CANCELLED';

    return [
      { title: 'Order Placed', description: 'Order submitted', date: order.createdAt, step: 0 },
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

  // Render Service Card
  const renderServiceCard = ({ item }) => {
    const statusStyle = getServiceStatusStyle(item.status);
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedService(item);
          setServiceDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          <Text style={styles.cardIdText}>#{item.id?.slice(0, 8)}</Text>
        </View>

        <Text style={styles.cardTitle}>{item.equipment?.name || 'General Service'}</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={styles.metaText}>
              {item.slotStartDateTime ? formatDate(item.slotStartDateTime) : 'Not scheduled'}
            </Text>
          </View>
          <Text style={styles.metaPrice}>{formatPrice(item.totalAmount)}</Text>
        </View>

        <View style={styles.cardArrow}>
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  // Render Order Card
  const renderOrderCard = ({ item }) => {
    const statusStyle = getOrderStatusStyle(item.status);
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => {
          setSelectedOrder(item);
          setOrderDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text>
          </View>
          <Text style={styles.cardIdText}>#{item.id?.slice(0, 8)}</Text>
        </View>

        <Text style={styles.cardTitle}>{itemCount} item(s)</Text>

        <View style={styles.cardMeta}>
          <View style={styles.metaItem}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={styles.metaText}>{formatDate(item.createdAt)}</Text>
          </View>
          <Text style={styles.metaPrice}>{formatPrice(item.totalAmount)}</Text>
        </View>

        <View style={styles.cardArrow}>
          <Icon name="chevron-forward" size={20} color={C.muted} />
        </View>
      </TouchableOpacity>
    );
  };

  // Get current status options for picker
  const currentStatusOptions = activeTab === 'services' ? SERVICE_STATUSES : ORDER_STATUSES;
  const currentStatusFilter = activeTab === 'services' ? serviceStatusFilter : orderStatusFilter;
  const setCurrentStatusFilter = activeTab === 'services' ? setServiceStatusFilter : setOrderStatusFilter;

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Order Tracking</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading tracking data...</Text>
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
        <Text style={styles.headerTitle}>Order Tracking</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
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
            <Text style={styles.restaurantSubtext}>Track orders for this restaurant</Text>
          </View>
          {restaurants.length > 1 && (
            <View style={styles.switchBadge}>
              <Icon name="swap-horizontal" size={14} color={C.primary} />
              <Text style={styles.switchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'services' && styles.tabActive]}
          onPress={() => setActiveTab('services')}
        >
          <Icon name="construct-outline" size={18} color={activeTab === 'services' ? C.primary : C.muted} />
          <Text style={[styles.tabText, activeTab === 'services' && styles.tabTextActive]}>
            Service Bookings
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'orders' && styles.tabActive]}
          onPress={() => setActiveTab('orders')}
        >
          <Icon name="bag-outline" size={18} color={activeTab === 'orders' ? C.primary : C.muted} />
          <Text style={[styles.tabText, activeTab === 'orders' && styles.tabTextActive]}>
            Marketplace Orders
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filter */}
      <View style={styles.filtersContainer}>
        <View style={styles.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={styles.searchInput}
            placeholder={activeTab === 'services' ? 'Search by ID or equipment...' : 'Search by order ID...'}
            placeholderTextColor={C.muted}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={18} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.filterBtn} onPress={() => setStatusPickerVisible(true)}>
          <Icon name="filter-outline" size={18} color={C.primary} />
          <Text style={styles.filterBtnText} numberOfLines={1}>
            {currentStatusOptions.find(s => s.value === currentStatusFilter)?.label || 'Filter'}
          </Text>
          <Icon name="chevron-down" size={16} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {activeTab === 'services' ? (
        <FlatList
          data={filteredServices}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderServiceCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="construct-outline" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Service Bookings</Text>
              <Text style={styles.emptyText}>No bookings match your criteria</Text>
            </View>
          }
        />
      ) : (
        <FlatList
          data={filteredOrders}
          keyExtractor={item => item.id?.toString()}
          renderItem={renderOrderCard}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Icon name="bag-outline" size={64} color={C.muted} />
              <Text style={styles.emptyTitle}>No Marketplace Orders</Text>
              <Text style={styles.emptyText}>No orders match your criteria</Text>
            </View>
          }
        />
      )}

      {/* ========== SERVICE DETAIL MODAL ========== */}
      <Modal visible={serviceDetailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Service Booking #{selectedService?.id?.slice(0, 8)}
              </Text>
              <TouchableOpacity onPress={() => setServiceDetailVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            {selectedService && (
              <ScrollView style={styles.modalBody}>
                {/* Service Info Card */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{selectedService.equipment?.name || 'General Service'}</Text>
                  {selectedService.problemDescription && (
                    <Text style={styles.detailDesc}>{selectedService.problemDescription}</Text>
                  )}
                  <Text style={styles.detailPrice}>{formatPrice(selectedService.totalAmount)}</Text>
                </View>

                {/* Engineer Info */}
                {selectedService.engineerAssignments?.[0] && (
                  <View style={styles.engineerCard}>
                    <View style={styles.engineerAvatar}>
                      <Icon name="person" size={24} color={C.primary} />
                    </View>
                    <View style={styles.engineerInfo}>
                      <Text style={styles.engineerName}>
                        {selectedService.engineerAssignments[0].engineer?.name || 'Assigned Engineer'}
                      </Text>
                      {selectedService.engineerAssignments[0].engineer?.phone && (
                        <View style={styles.engineerPhone}>
                          <Icon name="call-outline" size={12} color={C.muted} />
                          <Text style={styles.engineerPhoneText}>
                            {selectedService.engineerAssignments[0].engineer.phone}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Timeline */}
                <View style={styles.timelineSection}>
                  <Text style={styles.timelineSectionTitle}>Tracking Timeline</Text>
                  {getServiceTimeline(selectedService).map((step, index) => (
                    <TimelineStep key={index} step={step} isLast={step.isLast} />
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setServiceDetailVisible(false)}>
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== ORDER DETAIL MODAL ========== */}
      <Modal visible={orderDetailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Order #{selectedOrder?.id?.slice(0, 8)}
              </Text>
              <TouchableOpacity onPress={() => setOrderDetailVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                {/* Order Items Card */}
                <View style={styles.detailCard}>
                  <Text style={styles.detailTitle}>{selectedOrder.items?.length || 0} Item(s)</Text>
                  {selectedOrder.items?.map((item, index) => (
                    <View key={index} style={styles.orderItemRow}>
                      <Text style={styles.orderItemName}>
                        {item.product?.name} x {item.qty || item.quantity || 1}
                      </Text>
                      <Text style={styles.orderItemPrice}>
                        {formatPrice((item.priceSnapshot || item.price || 0) * (item.qty || item.quantity || 1))}
                      </Text>
                    </View>
                  ))}
                  <View style={styles.orderTotalRow}>
                    <Text style={styles.orderTotalLabel}>Total</Text>
                    <Text style={styles.orderTotalPrice}>{formatPrice(selectedOrder.totalAmount)}</Text>
                  </View>
                </View>

                {/* Timeline */}
                <View style={styles.timelineSection}>
                  <Text style={styles.timelineSectionTitle}>Delivery Timeline</Text>
                  {getOrderTimeline(selectedOrder).map((step, index) => (
                    <TimelineStep key={index} step={step} isLast={step.isLast} />
                  ))}
                </View>
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setOrderDetailVisible(false)}>
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
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
              {currentStatusOptions.map((status) => {
                const isSelected = status.value === currentStatusFilter;
                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[styles.pickerOption, isSelected && styles.pickerOptionSelected]}
                    onPress={() => {
                      setCurrentStatusFilter(status.value);
                      setStatusPickerVisible(false);
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

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
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

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabActive: {
    backgroundColor: '#FEF2F2',
  },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  // Filters
  filtersContainer: {
    flexDirection: 'row',
    gap: 10,
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
    gap: 8,
    backgroundColor: C.bg,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.primary,
  },
  filterBtnText: { fontSize: 13, fontWeight: '600', color: C.primary, maxWidth: 80 },

  list: { padding: 16 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
    position: 'relative',
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
  cardIdText: { fontSize: 12, color: C.muted },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 },
  cardMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: C.muted },
  metaPrice: { fontSize: 15, fontWeight: '700', color: C.ink },
  cardArrow: { position: 'absolute', right: 16, top: '50%' },

  // Empty State
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  // Detail Card
  detailCard: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  detailTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6 },
  detailDesc: { fontSize: 14, color: C.muted, marginBottom: 8 },
  detailPrice: { fontSize: 20, fontWeight: '700', color: C.primary },

  // Engineer Card
  engineerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    marginBottom: 20,
  },
  engineerAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  engineerInfo: { flex: 1 },
  engineerName: { fontSize: 15, fontWeight: '700', color: C.ink },
  engineerPhone: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  engineerPhoneText: { fontSize: 13, color: C.muted },

  // Order Item
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  orderItemName: { fontSize: 14, color: C.text, flex: 1 },
  orderItemPrice: { fontSize: 14, color: C.text },
  orderTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 4,
  },
  orderTotalLabel: { fontSize: 15, fontWeight: '700', color: C.ink },
  orderTotalPrice: { fontSize: 18, fontWeight: '700', color: C.primary },

  // Timeline
  timelineSection: { marginTop: 8 },
  timelineSectionTitle: { fontSize: 15, fontWeight: '700', color: C.ink, marginBottom: 16 },
  timelineRow: { flexDirection: 'row' },
  timelineLeft: { width: 24, alignItems: 'center' },
  timelineDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: { backgroundColor: C.ok, borderColor: C.ok },
  timelineDotCurrent: { backgroundColor: C.primary, borderColor: C.primary },
  timelineDotInner: { width: 4, height: 4, borderRadius: 2, backgroundColor: C.muted },
  timelineLine: { width: 2, flex: 1, minHeight: 40, backgroundColor: C.border, marginVertical: 2 },
  timelineLineCompleted: { backgroundColor: C.ok },
  timelineContent: { flex: 1, paddingLeft: 12, paddingBottom: 20 },
  timelineTitle: { fontSize: 14, fontWeight: '600', color: C.muted },
  timelineTitleActive: { color: C.ink },
  timelineDesc: { fontSize: 13, color: C.muted, marginTop: 2 },
  timelineTime: { fontSize: 12, color: C.muted, marginTop: 4 },

  closeModalBtn: {
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: { fontSize: 15, fontWeight: '700', color: C.ink },

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
