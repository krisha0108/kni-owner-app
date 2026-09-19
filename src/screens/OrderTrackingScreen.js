import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  RefreshControl,
  Modal,
  ScrollView,
  TextInput,
  Dimensions,
  StatusBar,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import AppAlert from '../utils/AppAlert';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import { isStale, markFetched } from '../utils/focusCache';
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
  { value: 'SLOT_SELECTED', label: 'Slot Selected', icon: 'time' },
  { value: 'PAYMENT_UPLOADED', label: 'Payment Uploaded', icon: 'cloud-upload' },
  { value: 'PAYMENT_VERIFIED', label: 'Payment Verified', icon: 'checkmark-circle' },
  { value: 'PAYMENT_REJECTED', label: 'Payment Rejected', icon: 'close-circle' },
  { value: 'ENGINEER_ASSIGNED', label: 'Engineer Assigned', icon: 'person' },
  { value: 'ACCEPTED_BY_ENGINEER', label: 'Engineer Accepted', icon: 'person' },
  { value: 'IN_PROGRESS', label: 'In Progress', icon: 'construct' },
  { value: 'COMPLETED', label: 'Completed', icon: 'checkmark-circle' },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle' },
];

const ORDER_STATUSES = [
  { value: 'all', label: 'All Status', icon: 'apps' },
  { value: 'PAYMENT_PENDING', label: 'Payment Pending', icon: 'time' },
  { value: 'PAYMENT_REJECTED', label: 'Payment Rejected', icon: 'close-circle' },
  { value: 'PLACED', label: 'Placed', icon: 'receipt' },
  { value: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle' },
  { value: 'PROCESSING', label: 'Processing', icon: 'cube' },
  { value: 'SHIPPED', label: 'Shipped', icon: 'car' },
  { value: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done' },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle' },
];

const SERVICE_STATUS_CONFIG = {
  DRAFT: { bg: '#F1F5F9', color: '#64748B', icon: 'document-outline', label: 'Draft', gradient: ['#94A3B8', '#64748B'] },
  SLOT_SELECTED: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Slot Selected', gradient: ['#FBBF24', '#F59E0B'] },
  PAYMENT_UPLOADED: { bg: '#E0E7FF', color: '#6366F1', icon: 'cloud-upload', label: 'Payment Uploaded', gradient: ['#818CF8', '#6366F1'] },
  PAYMENT_VERIFIED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-circle', label: 'Payment Verified', gradient: ['#34D399', '#10B981'] },
  PAYMENT_REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Payment Rejected', gradient: ['#F87171', '#EF4444'] },
  ENGINEER_ASSIGNED: { bg: '#DBEAFE', color: '#2563EB', icon: 'person', label: 'Engineer Assigned', gradient: ['#60A5FA', '#3B82F6'] },
  ACCEPTED_BY_ENGINEER: { bg: '#D1FAE5', color: '#059669', icon: 'person', label: 'Engineer Accepted', gradient: ['#34D399', '#10B981'] },
  IN_PROGRESS: { bg: '#E0E7FF', color: '#4F46E5', icon: 'construct', label: 'In Progress', gradient: ['#818CF8', '#6366F1'] },
  REJECTED_BY_ENGINEER: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Engineer Rejected', gradient: ['#F87171', '#EF4444'] },
  COMPLETED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done', label: 'Completed', gradient: ['#34D399', '#10B981'] },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Cancelled', gradient: ['#F87171', '#EF4444'] },
};

const ORDER_STATUS_CONFIG = {
  PAYMENT_PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time', label: 'Payment Pending', gradient: ['#FBBF24', '#F59E0B'] },
  PAYMENT_REJECTED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle', label: 'Payment Rejected', gradient: ['#F87171', '#EF4444'] },
  PLACED: { bg: '#E0E7FF', color: '#4F46E5', icon: 'receipt', label: 'Order Placed', gradient: ['#818CF8', '#6366F1'] },
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

function SkeletonOrderTracking({ pulse }) {
  return (
    <View style={s.listContent}>
      {[1, 2, 3, 4, 5].map(i => (
        <View key={i} style={s.card}>
          <Animated.View style={[s.cardAccent, s.skelFill, { opacity: pulse }]} />
          <View style={s.cardBody}>
            <View style={s.cardTopRow}>
              <Animated.View style={[s.cardIconBox, s.skelFill, { opacity: pulse }]} />
              <View style={s.cardTopInfo}>
                <Animated.View style={[s.skelLine, s.skelLineTitle, { opacity: pulse }]} />
                <Animated.View style={[s.skelLine, s.skelLineSmall, { opacity: pulse }]} />
              </View>
              <Animated.View style={[s.skelChevron, { opacity: pulse }]} />
            </View>
            <View style={s.cardBottomRow}>
              <Animated.View style={[s.skelPill, { opacity: pulse }]} />
              <View style={s.cardMetaRight}>
                <Animated.View style={[s.skelDateLine, { opacity: pulse }]} />
                <Animated.View style={[s.skelPrice, { opacity: pulse }]} />
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}

export default function OrderTrackingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('services');

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const [serviceBookings, setServiceBookings] = useState([]);
  const [trackingItems, setTrackingItems] = useState([]);

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
          const [bookingsRes, ordersRes, paymentsRes] = await Promise.all([
            api.get(`/owner/bookings?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
            api.get(`/owner/marketplace/orders?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
            api.get(`/owner/marketplace/payments?restaurantId=${targetRestaurant.id}`).catch(() => ({ data: { ok: false } })),
          ]);
          if (bookingsRes.data.ok) {
            const bData = bookingsRes.data.data;
            setServiceBookings(Array.isArray(bData) ? bData : (bData?.items || []));
          }

          // Build unified tracking items from payments + orders
          const oData = ordersRes.data.ok ? ordersRes.data.data : [];
          const pData = paymentsRes.data.ok ? paymentsRes.data.data : [];
          const orders = Array.isArray(oData) ? oData : (oData?.items || []);
          const payments = Array.isArray(pData) ? pData : (pData?.items || []);

          // Map orderId → order for quick lookup
          const orderMap = {};
          for (const order of orders) {
            orderMap[order.id] = order;
          }

          // Map orderId → payment (payment.orderId links to order after verification)
          const orderIdToPayment = {};
          const unlinkedPayments = [];
          for (const payment of payments) {
            if (payment.orderId && orderMap[payment.orderId]) {
              orderIdToPayment[payment.orderId] = payment;
            } else {
              // Payment not yet linked to an order (PENDING or REJECTED)
              unlinkedPayments.push(payment);
            }
          }

          const items = [];

          // 1. Orders that have a linked payment → full tracking
          for (const order of orders) {
            const payment = orderIdToPayment[order.id];
            const combinedStatus = order.status;
            const itemNames = (order.items || [])
              .map(i => i.product?.name || i.name || '')
              .filter(Boolean)
              .join(', ');
            items.push({
              id: order.id,
              payment: payment || null,
              order,
              combinedStatus,
              totalAmount: order.totalAmount,
              createdAt: payment?.createdAt || order.createdAt,
              vendorName: payment?.vendor?.name || order.vendor?.name || '',
              itemNames,
              items: order.items,
            });
          }

          // 2. Payments without linked orders (PENDING / REJECTED)
          for (const payment of unlinkedPayments) {
            const combinedStatus = payment.status === 'REJECTED' ? 'PAYMENT_REJECTED' : 'PAYMENT_PENDING';
            const paymentItems = payment.items || [];
            const itemNames = paymentItems.map(i => i.name || '').filter(Boolean).join(', ');
            items.push({
              id: payment.id,
              payment,
              order: null,
              combinedStatus,
              totalAmount: payment.totalAmount,
              createdAt: payment.createdAt,
              vendorName: payment.vendor?.name || '',
              itemNames,
              items: paymentItems,
            });
          }

          // Sort by date descending
          items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
          setTrackingItems(items);
        }
      }
    } catch (error) {
      console.error('Error loading tracking data:', error);
      AppAlert.alert('Error', 'Failed to load tracking data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      const key = `OrderTracking-${currentRestaurant?.id}`;
      if (isStale(key) || trackingItems.length === 0) {
        loadData(currentRestaurant?.id);
        markFetched(key);
      }
    }, [loadData, currentRestaurant, trackingItems.length])
  );

  const selectRestaurant = (restaurant) => {
    setRestaurantPickerVisible(false);
    if (restaurant.id !== currentRestaurant?.id) {
      setCurrentRestaurant(restaurant);
      setServiceBookings([]);
      setTrackingItems([]);
      loadData(restaurant.id);
      markFetched(`OrderTracking-${restaurant.id}`);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentRestaurant?.id);
    markFetched(`OrderTracking-${currentRestaurant?.id}`);
  };

  const filteredServices = serviceBookings.filter((b) => {
    const matchesSearch = !searchQuery ||
      b.id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      b.equipment?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = serviceStatusFilter === 'all' || b.status === serviceStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredOrders = trackingItems.filter((t) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery ||
      t.id?.toLowerCase().includes(q) ||
      t.vendorName?.toLowerCase().includes(q) ||
      t.itemNames?.toLowerCase().includes(q);
    const matchesStatus = orderStatusFilter === 'all' || t.combinedStatus === orderStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const getServiceStatusStyle = (status) =>
    SERVICE_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time', label: status, gradient: ['#9CA3AF', '#6B7280'] };

  const getOrderStatusStyle = (status) =>
    ORDER_STATUS_CONFIG[status] || { bg: '#F3F4F6', color: C.muted, icon: 'time', label: status, gradient: ['#9CA3AF', '#6B7280'] };

  const getServiceTimeline = (booking) => {
    const isCancelled = booking.status === 'CANCELLED';
    // Map status to step number (matching the 6-step service booking flow)
    const stepMap = {
      DRAFT: 0, SLOT_SELECTED: 0,
      PAYMENT_UPLOADED: 1, PAYMENT_REJECTED: 1,
      PAYMENT_VERIFIED: 2,
      ENGINEER_ASSIGNED: 3, ACCEPTED_BY_ENGINEER: 3, REJECTED_BY_ENGINEER: 3,
      IN_PROGRESS: 4,
      COMPLETED: 5,
    };
    const currentStep = stepMap[booking.status] ?? -1;

    return [
      { title: 'Booked', description: 'Service request created', date: booking.createdAt, step: 0 },
      { title: 'Payment', description: booking.status === 'PAYMENT_REJECTED' ? 'Payment rejected — re-upload required' : 'Payment uploaded', step: 1 },
      { title: 'Verified', description: 'Payment confirmed', step: 2 },
      { title: 'Assigned', description: booking.engineerAssignments?.[0]?.engineer?.name ? `Engineer: ${booking.engineerAssignments[0].engineer.name}` : 'Engineer assignment pending', step: 3 },
      { title: 'In Progress', description: booking.slotStartDateTime ? `Slot: ${formatDate(booking.slotStartDateTime)}` : 'Engineer working', step: 4 },
      { title: isCancelled ? 'Cancelled' : 'Completed', description: isCancelled ? 'Service cancelled' : 'Service completed', step: 5 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && currentStep > item.step,
      isCurrent: !isCancelled && currentStep === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const getTrackingTimeline = (tracking) => {
    const payment = tracking.payment;
    const order = tracking.order;
    const isCancelled = order?.status === 'CANCELLED';

    // 6-step flow: Payment → Verified → Confirmed → Processing → Shipped → Delivered
    let currentStep = 0;
    if (payment) {
      if (payment.status === 'PENDING') currentStep = 0;
      else if (payment.status === 'REJECTED') currentStep = 0;
      else if (payment.status === 'VERIFIED') {
        if (!order) currentStep = 1;
        else {
          const orderStepMap = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
          currentStep = orderStepMap[order.status] ?? 2;
        }
      }
    } else if (order) {
      const orderStepMap = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
      currentStep = orderStepMap[order.status] ?? 2;
    }

    const isRejected = payment?.status === 'REJECTED';

    return [
      { title: 'Payment Submitted', description: isRejected ? 'Payment was rejected — re-submit required' : 'Payment screenshot uploaded', date: payment?.createdAt, step: 0 },
      { title: 'Payment Verified', description: 'Vendor verified your payment', date: payment?.status === 'VERIFIED' ? payment.updatedAt : null, step: 1 },
      { title: 'Order Confirmed', description: 'Order created & confirmed', date: order?.createdAt, step: 2 },
      { title: 'Processing', description: 'Order being prepared', step: 3 },
      { title: 'Shipped', description: 'Order dispatched', step: 4 },
      { title: isCancelled ? 'Cancelled' : 'Delivered', description: isCancelled ? 'Order cancelled' : 'Order delivered', step: 5 },
    ].map((item, index, arr) => ({
      ...item,
      isCompleted: !isCancelled && !isRejected && currentStep > item.step,
      isCurrent: !isCancelled && !isRejected && currentStep === item.step,
      isLast: index === arr.length - 1,
    }));
  };

  const currentStatusOptions = activeTab === 'services' ? SERVICE_STATUSES : ORDER_STATUSES;
  const currentStatusFilter = activeTab === 'services' ? serviceStatusFilter : orderStatusFilter;
  const setCurrentStatusFilter = activeTab === 'services' ? setServiceStatusFilter : setOrderStatusFilter;

  // Stats
  const activeServices = serviceBookings.filter(b => !['COMPLETED', 'CANCELLED'].includes(b.status)).length;
  const activeOrders = trackingItems.filter(t => !['DELIVERED', 'CANCELLED'].includes(t.combinedStatus)).length;

  // Helper: get service item names from booking items
  const getBookingItemNames = (booking) => {
    if (!booking.items || booking.items.length === 0) return '';
    return booking.items
      .map(i => i.serviceItem?.name || i.partItem?.name || '')
      .filter(Boolean)
      .join(', ');
  };

  // Render Service Card
  const renderServiceCard = ({ item }) => {
    const ss = getServiceStatusStyle(item.status);
    const itemNames = getBookingItemNames(item);
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
              <Icon name={ss.icon} size={scale(13)} color="#fff" />
            </LinearGradient>
            <View style={s.cardTopInfo}>
              <Text style={s.cardTitle} numberOfLines={1}>{item.equipment?.name || 'General Service'}</Text>
              {itemNames ? (
                <Text style={s.cardItemNames} numberOfLines={1}>{itemNames}</Text>
              ) : null}
              <Text style={s.cardId}>#{item.id?.slice(0, 8)}</Text>
            </View>
            <Icon name="chevron-forward" size={scale(15)} color={C.muted} />
          </View>

          <View style={s.cardBottomRow}>
            <View style={[s.statusPill, { backgroundColor: ss.bg }]}>
              <Icon name={ss.icon} size={scale(10)} color={ss.color} />
              <Text style={[s.statusPillText, { color: ss.color }]}>{ss.label}</Text>
            </View>
            <View style={s.cardMetaRight}>
              <Text style={s.cardDate}>{formatTimeAgo(item.createdAt)}</Text>
              <Text style={s.cardPrice}>{formatPrice(item.totalAmount)}</Text>
            </View>
          </View>

          {item.slotStartDateTime && (
            <View style={s.scheduleRow}>
              <Icon name="calendar" size={scale(11)} color={C.info} />
              <Text style={s.scheduleText}>Scheduled: {formatDate(item.slotStartDateTime)}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Render Order/Tracking Card
  const renderOrderCard = ({ item }) => {
    const os = getOrderStatusStyle(item.combinedStatus);
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
              <Icon name={os.icon} size={scale(13)} color="#fff" />
            </LinearGradient>
            <View style={s.cardTopInfo}>
              <Text style={s.cardTitle} numberOfLines={1}>
                {item.vendorName || `${itemCount} Item${itemCount !== 1 ? 's' : ''}`}
              </Text>
              {item.itemNames ? (
                <Text style={s.cardItemNames} numberOfLines={1}>{item.itemNames}</Text>
              ) : null}
              <Text style={s.cardId}>#{item.id?.slice(0, 8)}</Text>
            </View>
            <Icon name="chevron-forward" size={scale(15)} color={C.muted} />
          </View>

          <View style={s.cardBottomRow}>
            <View style={[s.statusPill, { backgroundColor: os.bg }]}>
              <Icon name={os.icon} size={scale(10)} color={os.color} />
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
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={[s.header, { paddingTop: insets.top + scale(10) }]}>
          <View style={s.headerBlobA} pointerEvents="none" />
          <View style={s.headerBlobB} pointerEvents="none" />
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={s.headerBtn}>
            <Icon name="arrow-back" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={s.headerCenter}>
            <Text style={s.headerTitle}>Order Tracking</Text>
          </View>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={s.headerBtn}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
        </LinearGradient>
        <SkeletonOrderTracking pulse={pulse} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      {/* Gradient Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingTop: insets.top + scale(10) }]}
      >
        <View style={s.headerBlobA} pointerEvents="none" />
        <View style={s.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={s.headerBtn}>
          <Icon name="arrow-back" size={scale(18)} color="#fff" />
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
          <Icon name="menu" size={scale(18)} color="#fff" />
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
            <Icon name="restaurant" size={scale(13)} color={C.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={s.restName} numberOfLines={1}>{currentRestaurant.name}</Text>
            <Text style={s.restSub}>Tracking orders for this restaurant</Text>
          </View>
          {restaurants.length > 1 && (
            <View style={s.restSwitch}>
              <Icon name="swap-horizontal" size={scale(11)} color={C.primary} />
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
          <Icon name="construct" size={scale(13)} color={activeTab === 'services' ? '#fff' : C.muted} />
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
          <Icon name="bag" size={scale(13)} color={activeTab === 'orders' ? '#fff' : C.muted} />
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
          <Icon name="search" size={scale(13)} color={C.muted} />
          <TextInput
            style={s.searchInput}
            placeholder={activeTab === 'services' ? 'Search by ID or equipment...' : 'Search by ID, vendor, item...'}
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Icon name="close-circle" size={scale(13)} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={s.filterBtn} onPress={() => setStatusPickerVisible(true)}>
          <Icon name="funnel" size={scale(12)} color={C.primary} />
          <Text style={s.filterBtnText} numberOfLines={1}>
            {currentStatusOptions.find(st => st.value === currentStatusFilter)?.label || 'Filter'}
          </Text>
        </TouchableOpacity>
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
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
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          removeClippedSubviews={true}
        />
      )}

      {/* ========== SERVICE DETAIL MODAL ========== */}
      <Modal visible={serviceDetailVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={s.detailOverlay}>
          <Pressable style={s.detailOverlayBg} onPress={() => setServiceDetailVisible(false)} />
          <View style={s.detailContent}>
            <View style={s.detailHeader}>
              <Text style={s.detailTitle}>Service Booking</Text>
              <TouchableOpacity onPress={() => setServiceDetailVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.detailBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true} overScrollMode="always">
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
                  {selectedService.items?.length > 0 && (
                    <View style={s.modalSection}>
                      <View style={s.modalSectionHeader}>
                        <View style={[s.modalSectionIcon, { backgroundColor: '#F5F3FF' }]}>
                          <Icon name="list" size={scale(16)} color="#7C3AED" />
                        </View>
                        <Text style={s.modalSectionTitle}>Ordered Items</Text>
                      </View>
                      <View style={s.modalInfoCard}>
                        {selectedService.items.map((si, idx) => (
                          <View key={idx} style={s.orderItemRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={s.orderItemName}>
                                {si.serviceItem?.name || si.partItem?.name || 'Item'}
                              </Text>
                              <Text style={s.orderItemQty}>
                                {si.itemType === 'PART' ? 'Part' : 'Service'} · Qty: {si.qty}
                              </Text>
                            </View>
                            <Text style={s.orderItemPrice}>
                              {formatPrice(si.priceSnapshot * si.qty)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
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
      <Modal visible={orderDetailVisible} animationType="slide" transparent statusBarTranslucent>
        <View style={s.detailOverlay}>
          <Pressable style={s.detailOverlayBg} onPress={() => setOrderDetailVisible(false)} />
          <View style={s.detailContent}>
            <View style={s.detailHeader}>
              <Text style={s.detailTitle}>Marketplace Order</Text>
              <TouchableOpacity onPress={() => setOrderDetailVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={s.detailBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={true} overScrollMode="always">
              {selectedOrder ? (
                <>
                  {(() => {
                    const os = getOrderStatusStyle(selectedOrder.combinedStatus);
                    return (
                      <LinearGradient colors={os.gradient} style={s.modalStatusBanner}>
                        <View style={s.modalStatusIcon}>
                          <Icon name={os.icon} size={scale(22)} color={os.color} />
                        </View>
                        <View>
                          <Text style={s.modalStatusLabel}>{os.label}</Text>
                          <Text style={s.modalStatusDate}>{formatTimeAgo(selectedOrder.createdAt)}</Text>
                        </View>
                      </LinearGradient>
                    );
                  })()}

                  {/* Payment Rejected Warning */}
                  {selectedOrder.combinedStatus === 'PAYMENT_REJECTED' && (
                    <View style={s.rejectedWarning}>
                      <Icon name="warning" size={scale(18)} color="#DC2626" />
                      <Text style={s.rejectedWarningText}>
                        Your payment was rejected. Please re-submit payment to proceed.
                      </Text>
                    </View>
                  )}

                  {/* Vendor Info */}
                  {selectedOrder.vendorName ? (
                    <View style={s.modalSection}>
                      <View style={s.modalSectionHeader}>
                        <View style={[s.modalSectionIcon, { backgroundColor: '#FEF2F2' }]}>
                          <Icon name="storefront" size={scale(16)} color={C.primary} />
                        </View>
                        <Text style={s.modalSectionTitle}>Vendor</Text>
                      </View>
                      <View style={s.modalInfoCard}>
                        <View style={[s.modalInfoRow, { borderBottomWidth: 0 }]}>
                          <Text style={s.modalInfoLabel}>Name</Text>
                          <Text style={s.modalInfoValue}>{selectedOrder.vendorName}</Text>
                        </View>
                      </View>
                    </View>
                  ) : null}

                  {/* Order Items */}
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
                            <Text style={s.orderItemName}>{item.product?.name || item.name || 'Product'}</Text>
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

                  {/* 7-Step Tracking Timeline */}
                  <View style={s.modalSection}>
                    <View style={s.modalSectionHeader}>
                      <View style={[s.modalSectionIcon, { backgroundColor: '#ECFDF5' }]}>
                        <Icon name="git-branch" size={scale(16)} color="#059669" />
                      </View>
                      <Text style={s.modalSectionTitle}>Tracking Timeline</Text>
                    </View>
                    <View style={s.tlWrapper}>
                      {getTrackingTimeline(selectedOrder).map((step, index) => (
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
    paddingBottom: scale(16),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  headerBtn: {
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
  headerBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(10),
  },
  headerBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    color: '#fff',
  },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(12), fontSize: moderateScale(14), color: C.muted },

  // Skeleton loading
  listContent: { paddingHorizontal: scale(14), paddingTop: scale(12) },
  skelFill: { backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(11), width: '55%', borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelLineTitle: { width: '65%' },
  skelLineSmall: { height: scale(8), width: '40%', marginTop: scale(6), backgroundColor: '#E2E8F0', borderRadius: scale(4) },
  skelPill: { width: scale(90), height: scale(18), borderRadius: scale(7), backgroundColor: '#E2E8F0' },
  skelPrice: { width: scale(50), height: scale(14), borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelDateLine: { width: scale(40), height: scale(9), borderRadius: scale(4), backgroundColor: '#E2E8F0', marginBottom: scale(3) },
  skelChevron: { width: scale(15), height: scale(15), borderRadius: scale(4), backgroundColor: '#E2E8F0' },

  // Restaurant Banner
  restBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(7),
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restIconBox: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(8),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restName: { fontSize: moderateScale(12.5), fontWeight: '700', color: C.ink },
  restSub: { fontSize: moderateScale(9.5), color: C.muted, marginTop: 1 },
  restSwitch: {
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
  restSwitchText: { fontSize: moderateScale(10.5), fontWeight: '700', color: C.primary },

  // Tabs
  tabBar: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(7),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(5),
    paddingVertical: scale(7),
    borderRadius: scale(10),
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: { fontSize: moderateScale(11.5), fontWeight: '700', color: C.muted },
  tabTextActive: { color: '#fff' },
  tabCountBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(5),
    paddingVertical: 1,
    borderRadius: scale(7),
  },
  tabCountBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabCountText: { fontSize: moderateScale(9), fontWeight: '700', color: '#D97706' },
  tabCountTextActive: { color: '#fff' },

  // Filter Bar
  filterBar: {
    flexDirection: 'row',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(7),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    backgroundColor: '#F8FAFC',
    borderRadius: scale(9),
    paddingHorizontal: scale(9),
    paddingVertical: scale(5),
    borderWidth: 1,
    borderColor: C.border,
  },
  searchInput: { flex: 1, fontSize: moderateScale(11.5), color: C.text, padding: 0 },
  filterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(9),
    paddingVertical: scale(5),
    backgroundColor: '#FFF5F5',
    borderRadius: scale(9),
    borderWidth: 1.5,
    borderColor: '#FECACA',
  },
  filterBtnText: { fontSize: moderateScale(11), fontWeight: '700', color: C.primary, maxWidth: scale(70) },

  list: { paddingHorizontal: scale(16), paddingTop: scale(10), paddingBottom: scale(100), flexGrow: 1 },

  // Card
  card: {
    backgroundColor: C.card,
    borderRadius: scale(13),
    marginBottom: scale(9),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(6),
    elevation: 2,
  },
  cardAccent: { height: scale(3) },
  cardBody: { padding: scale(10) },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(9),
    marginBottom: scale(9),
  },
  cardIconBox: {
    width: scale(30),
    height: scale(30),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTopInfo: { flex: 1 },
  cardTitle: { fontSize: moderateScale(12.5), fontWeight: '700', color: C.ink },
  cardItemNames: { fontSize: moderateScale(10), color: C.muted, marginTop: scale(1) },
  cardId: { fontSize: moderateScale(9.5), color: '#9CA3AF', marginTop: scale(1) },
  cardBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(7),
  },
  statusPillText: { fontSize: moderateScale(9.5), fontWeight: '700' },
  cardMetaRight: { alignItems: 'flex-end' },
  cardDate: { fontSize: moderateScale(9.5), color: C.muted },
  cardPrice: { fontSize: moderateScale(12.5), fontWeight: '800', color: C.ink, marginTop: scale(1) },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(7),
    backgroundColor: '#EFF6FF',
    paddingHorizontal: scale(8),
    paddingVertical: scale(5),
    borderRadius: scale(7),
  },
  scheduleText: { fontSize: moderateScale(10), fontWeight: '600', color: C.info },

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
  detailOverlay: { flex: 1 },
  detailOverlayBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  detailContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: SCREEN_HEIGHT * 0.85, position: 'absolute', bottom: 0, left: 0, right: 0 },
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

  // Rejected Warning
  rejectedWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(14),
    backgroundColor: '#FEF2F2',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#FECACA',
    marginBottom: scale(16),
  },
  rejectedWarningText: {
    flex: 1,
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#DC2626',
  },

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
