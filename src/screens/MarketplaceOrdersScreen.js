/**
 * ============================================================================
 * MY ORDERS SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect } from 'react';
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
  Alert,
  StatusBar,
  Dimensions,
  Image,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl, API_BASE_URL } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// App Theme Color Palette
const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  gradient1: '#EF3A3A',
  gradient2: '#DC2626',
  ink: '#1D2254',
  text: '#334155',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  success: '#10B981',
  successLight: '#D1FAE5',
  warn: '#F59E0B',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  shadow: '#64748B',
};

const STATUS_CONFIG = {
  all: { bg: C.bg, color: C.ink, icon: 'layers-outline', label: 'All', gradient: [C.primary, C.primaryDark] },
  PLACED: { bg: C.primaryLight, color: C.primary, icon: 'time-outline', label: 'Placed', gradient: [C.primary, C.primaryDark] },
  PENDING: { bg: C.primaryLight, color: C.primary, icon: 'hourglass-outline', label: 'Pending', gradient: [C.primary, C.primaryDark] },
  CONFIRMED: { bg: C.primaryLight, color: C.primary, icon: 'checkmark-circle-outline', label: 'Confirmed', gradient: [C.primary, C.primaryDark] },
  PROCESSING: { bg: C.primaryLight, color: C.primary, icon: 'sync-outline', label: 'Processing', gradient: [C.primary, C.primaryDark] },
  SHIPPED: { bg: C.primaryLight, color: C.primary, icon: 'car-outline', label: 'Shipped', gradient: [C.primary, C.primaryDark] },
  DELIVERED: { bg: C.successLight, color: C.success, icon: 'checkmark-done-circle-outline', label: 'Delivered', gradient: [C.success, '#059669'] },
  CANCELLED: { bg: C.dangerLight, color: C.danger, icon: 'close-circle-outline', label: 'Cancelled', gradient: [C.danger, '#DC2626'] },
};

const ORDER_TIMELINE_STEPS = [
  { key: 'PAYMENT_SUBMITTED', icon: 'cloud-upload-outline', label: 'Payment Submitted' },
  { key: 'PAYMENT_VERIFIED', icon: 'checkmark-circle-outline', label: 'Payment Verified' },
  { key: 'CONFIRMED', icon: 'cart-outline', label: 'Order Confirmed' },
  { key: 'PROCESSING', icon: 'cog-outline', label: 'Processing' },
  { key: 'SHIPPED', icon: 'car-outline', label: 'Shipped' },
  { key: 'DELIVERED', icon: 'trophy-outline', label: 'Delivered' },
];

const ORDER_STATUS_ORDER = ['PLACED', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

const STATUS_OPTIONS = [
  { value: 'all', label: 'All', icon: 'layers-outline' },
  { value: 'PLACED', label: 'Placed', icon: 'time-outline' },
  { value: 'CONFIRMED', label: 'Confirmed', icon: 'checkmark-circle-outline' },
  { value: 'PROCESSING', label: 'Processing', icon: 'sync-outline' },
  { value: 'SHIPPED', label: 'Shipped', icon: 'car-outline' },
  { value: 'DELIVERED', label: 'Delivered', icon: 'checkmark-done-circle-outline' },
  { value: 'CANCELLED', label: 'Cancelled', icon: 'close-circle-outline' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTime = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
};

const formatPrice = (price) => `₹${(price || 0).toLocaleString('en-IN')}`;

export default function MarketplaceOrdersScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurant: currentRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [orders, setOrders] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  // Order Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Rating Modal
  const [ratingModalVisible, setRatingModalVisible] = useState(false);
  const [orderToRate, setOrderToRate] = useState(null);
  const [rating, setRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Navigation Menu
  const [menuVisible, setMenuVisible] = useState(false);

  // Top-level tab: Orders vs Payments
  const [activeMainTab, setActiveMainTab] = useState('orders');

  // Payments state
  const [payments, setPayments] = useState([]);
  const [loadingPayments, setLoadingPayments] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [paymentDetailVisible, setPaymentDetailVisible] = useState(false);

  // Status filter tab
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  // Calculate status counts for summary cards
  const statusCounts = React.useMemo(() => {
    const counts = { all: orders.length };
    orders.forEach((o) => {
      const status = o.status || 'PLACED';
      counts[status] = (counts[status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  const pendingPaymentsCount = React.useMemo(() => {
    return payments.filter(p => p.status === 'PENDING').length;
  }, [payments]);

  // Client-side status filter
  const filteredOrders = React.useMemo(() => {
    if (activeStatusTab === 'all') return orders;
    return orders.filter(o => (o.status || 'PLACED') === activeStatusTab);
  }, [orders, activeStatusTab]);

  const loadData = useCallback(async (pageNum = 1, append = false) => {
    if (!selectedRestaurantId) return;

    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams({ restaurantId: selectedRestaurantId, page: pageNum.toString(), pageSize: '20' });
      const response = await api.get(`/owner/marketplace/orders?${params}`);
      if (response.data.ok) {
        const responseData = response.data.data;
        if (responseData && responseData.items) {
          const { items, total, page: currentPage, pageSize } = responseData;
          setTotalCount(total);
          if (append) {
            setOrders(prev => {
              const existingIds = new Set(prev.map(o => o.id));
              const uniqueNew = items.filter(o => !existingIds.has(o.id));
              return [...prev, ...uniqueNew];
            });
          } else {
            setOrders(items);
          }
          setHasMore(currentPage * pageSize < total);
          setPage(currentPage);
        } else {
          setOrders(responseData || []);
          setHasMore(false);
        }
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  // Status tab is now client-side only — no refetch needed

  const handleLoadMore = () => {
    if (!loadingMore && hasMore && !loading) {
      loadData(page + 1, true);
    }
  };

  const renderOrdersFooter = () => {
    if (!loadingMore) return null;
    return (
      <View style={{ padding: 16, alignItems: 'center' }}>
        <ActivityIndicator size="small" color="#EF3A3A" />
      </View>
    );
  };

  const loadPayments = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoadingPayments(true);
      const response = await api.get(`/owner/marketplace/payments?restaurantId=${selectedRestaurantId}`);
      if (response.data.ok) {
        const paymentsData = response.data.data || [];
        console.log('📦 Payments loaded:', paymentsData.length);
        if (paymentsData.length > 0) {
          console.log('First payment screenshotUrl:', paymentsData[0].screenshotUrl);
        }
        setPayments(paymentsData);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoadingPayments(false);
    }
  }, [selectedRestaurantId]);

  // Load data when restaurant changes
  useEffect(() => {
    if (selectedRestaurantId) {
      setPage(1);
      setHasMore(true);
      loadData();
      loadPayments();
    }
  }, [selectedRestaurantId, loadData, loadPayments]);

  // Auto-refresh every 60 seconds when screen is focused
  useFocusEffect(
    useCallback(() => {
      if (!selectedRestaurantId) return;

      const silentRefresh = async () => {
        try {
          const params = new URLSearchParams({ restaurantId: selectedRestaurantId, page: '1', pageSize: '20' });
          const response = await api.get(`/owner/marketplace/orders?${params}`);
          if (response.data.ok) {
            const responseData = response.data.data;
            if (responseData && responseData.items) {
              setOrders(responseData.items);
              setHasMore(responseData.page * responseData.pageSize < responseData.total);
              setPage(1);
            } else {
              setOrders(responseData || []);
            }
          }
        } catch (error) {
          // Silent fail
        }
        try {
          const response = await api.get(`/owner/marketplace/payments?restaurantId=${selectedRestaurantId}`);
          if (response.data.ok) {
            setPayments(response.data.data || []);
          }
        } catch (error) {
          // Silent fail
        }
      };

      const intervalId = setInterval(silentRefresh, 60000);

      return () => clearInterval(intervalId);
    }, [selectedRestaurantId])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setHasMore(true);
    await loadRestaurants();
    loadData(1, false);
    loadPayments();
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
  };

  const INVOICE_STATUSES = ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'];

  const handleDownloadInvoice = async (order) => {
    try {
      const token = await require('@react-native-async-storage/async-storage').default.getItem('userToken');
      const invoiceUrl = `${API_BASE_URL}/owner/marketplace/orders/${order.id}/invoice`;
      // Open in browser — the API returns a PDF with attachment header
      await Linking.openURL(invoiceUrl);
    } catch (error) {
      Alert.alert('Error', 'Failed to open invoice. Please try again.');
      console.error('Invoice download error:', error);
    }
  };

  const openRatingModal = (order) => {
    setOrderToRate(order);
    setRating(5);
    setRatingComment('');
    setRatingModalVisible(true);
  };

  const submitRating = async () => {
    if (!orderToRate) return;

    setIsSubmittingRating(true);
    try {
      const response = await api.post(`/owner/marketplace/orders/${orderToRate.id}/rate`, {
        overallRating: rating,
        review: ratingComment.trim() || undefined,
      });

      if (response.data.ok) {
        Alert.alert('Success', 'Thank you for your rating!');
        setRatingModalVisible(false);
        setOrderToRate(null);
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to submit rating');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit rating');
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const getStatusStyle = (status) => {
    return STATUS_CONFIG[status] || STATUS_CONFIG.PENDING;
  };

  const getPaymentStatusStyle = (status) => {
    if (status === 'PENDING') return { bg: '#FEF3C7', color: '#D97706', icon: 'hourglass-outline', label: 'Pending Verification', gradient: ['#F59E0B', '#D97706'] };
    if (status === 'VERIFIED') return { bg: C.successLight, color: C.success, icon: 'checkmark-circle-outline', label: 'Verified', gradient: [C.success, '#059669'] };
    if (status === 'REJECTED') return { bg: C.dangerLight, color: C.danger, icon: 'close-circle-outline', label: 'Rejected', gradient: [C.danger, '#DC2626'] };
    return { bg: C.bg, color: C.muted, icon: 'help-outline', label: status, gradient: [C.muted, C.muted] };
  };

  const renderPaymentCard = ({ item }) => {
    const statusStyle = getPaymentStatusStyle(item.status);
    const vendorName = item.vendor?.name || 'Unknown Vendor';
    const items = item.items || [];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => {
          console.log('🔍 Opening payment details...');
          console.log('Payment ID:', item.id);
          console.log('Screenshot URL:', item.screenshotUrl);
          console.log('Full payment data:', JSON.stringify(item, null, 2));
          setSelectedPayment(item);
          setPaymentDetailVisible(true);
        }}
        activeOpacity={0.7}
      >
        {/* Status Strip */}
        <LinearGradient
          colors={statusStyle.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.orderStatusStrip}
        >
          <Icon name={statusStyle.icon} size={scale(14)} color="#fff" />
          <Text style={styles.orderStatusText}>{statusStyle.label}</Text>
        </LinearGradient>

        {/* Payment Content */}
        <View style={styles.orderContent}>
          {/* Payment Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIdSection}>
              <Text style={styles.orderIdLabel}>PAYMENT ID</Text>
              <Text style={styles.orderId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.orderDateSection}>
              <Text style={styles.orderDateText}>{formatDate(item.createdAt)}</Text>
              <Text style={styles.orderTimeText}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>

          {/* Vendor Info */}
          <View style={styles.vendorSection}>
            <View style={styles.vendorIcon}>
              <Icon name="storefront" size={scale(16)} color={C.primary} />
            </View>
            <View style={styles.vendorInfo}>
              <Text style={styles.vendorLabel}>Vendor</Text>
              <Text style={styles.vendorName}>{vendorName}</Text>
            </View>
          </View>

          {/* Items Preview */}
          <View style={styles.itemsPreview}>
            {items.slice(0, 2).map((orderItem, idx) => (
              <View key={idx} style={styles.itemPreviewRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemPreviewName} numberOfLines={1}>
                  {orderItem.name || 'Product'}
                </Text>
                <Text style={styles.itemPreviewQty}>x{orderItem.qty}</Text>
              </View>
            ))}
            {items.length > 2 && (
              <Text style={styles.moreItemsText}>+{items.length - 2} more items</Text>
            )}
          </View>

          {/* Status Message */}
          {item.status === 'PENDING' && (
            <View style={[styles.paymentStatusMsg, { backgroundColor: '#FEF3C7' }]}>
              <Icon name="time-outline" size={scale(14)} color="#D97706" />
              <Text style={[styles.paymentStatusMsgText, { color: '#D97706' }]}>
                Waiting for vendor verification
              </Text>
            </View>
          )}
          {item.status === 'VERIFIED' && item.orderId && (
            <View style={[styles.paymentStatusMsg, { backgroundColor: C.successLight }]}>
              <Icon name="checkmark-circle" size={scale(14)} color={C.success} />
              <Text style={[styles.paymentStatusMsgText, { color: C.success }]}>
                Order #{item.orderId?.slice(0, 8).toUpperCase()} placed
              </Text>
            </View>
          )}
          {item.status === 'REJECTED' && (
            <View style={[styles.paymentStatusMsg, { backgroundColor: C.dangerLight }]}>
              <Icon name="close-circle" size={scale(14)} color={C.danger} />
              <Text style={[styles.paymentStatusMsgText, { color: C.danger }]} numberOfLines={2}>
                Rejected{item.rejectionReason ? `: ${item.rejectionReason}` : ''}
              </Text>
            </View>
          )}

          {/* Payment Footer */}
          <View style={styles.orderFooter}>
            <View style={styles.orderTotalSection}>
              <Text style={styles.orderTotalLabel}>{items.length} item{items.length > 1 ? 's' : ''}</Text>
              <Text style={styles.orderTotalAmount}>{formatPrice(item.totalAmount)}</Text>
            </View>
            <View style={styles.viewDetailsBtn}>
              <Text style={styles.viewDetailsText}>Details</Text>
              <Icon name="chevron-forward" size={scale(16)} color={C.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderOrderCard = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);
    const vendorName = typeof item.vendor === 'object' ? item.vendor?.name : item.vendor;
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => openOrderDetails(item)}
        activeOpacity={0.7}
      >
        {/* Status Strip */}
        <LinearGradient
          colors={statusStyle.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.orderStatusStrip}
        >
          <Icon name={statusStyle.icon} size={scale(14)} color="#fff" />
          <Text style={styles.orderStatusText}>{statusStyle.label}</Text>
        </LinearGradient>

        {/* Order Content */}
        <View style={styles.orderContent}>
          {/* Order Header */}
          <View style={styles.orderHeader}>
            <View style={styles.orderIdSection}>
              <Text style={styles.orderIdLabel}>ORDER ID</Text>
              <Text style={styles.orderId}>#{item.id?.slice(0, 8).toUpperCase()}</Text>
            </View>
            <View style={styles.orderDateSection}>
              <Text style={styles.orderDateText}>{formatDate(item.createdAt)}</Text>
              <Text style={styles.orderTimeText}>{formatTime(item.createdAt)}</Text>
            </View>
          </View>

          {/* Vendor Info */}
          {vendorName && (
            <View style={styles.vendorSection}>
              <View style={styles.vendorIcon}>
                <Icon name="storefront" size={scale(16)} color={C.primary} />
              </View>
              <View style={styles.vendorInfo}>
                <Text style={styles.vendorLabel}>Vendor</Text>
                <Text style={styles.vendorName}>{vendorName}</Text>
              </View>
            </View>
          )}

          {/* Items Preview */}
          <View style={styles.itemsPreview}>
            {item.items?.slice(0, 2).map((orderItem, idx) => (
              <View key={idx} style={styles.itemPreviewRow}>
                <View style={styles.itemDot} />
                <Text style={styles.itemPreviewName} numberOfLines={1}>
                  {orderItem.product?.name || 'Product'}
                </Text>
                <Text style={styles.itemPreviewQty}>x{orderItem.qty}</Text>
              </View>
            ))}
            {item.items?.length > 2 && (
              <Text style={styles.moreItemsText}>+{item.items.length - 2} more items</Text>
            )}
          </View>

          {/* Order Footer */}
          <View style={styles.orderFooter}>
            <View style={styles.orderTotalSection}>
              <Text style={styles.orderTotalLabel}>{itemCount} item{itemCount > 1 ? 's' : ''}</Text>
              <Text style={styles.orderTotalAmount}>{formatPrice(item.totalAmount)}</Text>
            </View>

            <View style={styles.orderActions}>
              {item.status === 'DELIVERED' && (
                <TouchableOpacity
                  style={styles.rateBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    openRatingModal(item);
                  }}
                >
                  <Icon name="star" size={scale(16)} color={C.warn} />
                </TouchableOpacity>
              )}
              <View style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsText}>Details</Text>
                <Icon name="chevron-forward" size={scale(16)} color={C.primary} />
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={styles.loadingHero}>
          <Text style={styles.heroTitle}>My Orders</Text>
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading your orders...</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Premium Hero Header */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.heroSection}
      >
        <View style={styles.heroContent}>
          <View style={styles.heroLeft}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Icon name="arrow-back" size={scale(22)} color="#fff" />
            </TouchableOpacity>
            <View>
              <Text style={styles.heroTitle}>My Orders</Text>
              <Text style={styles.heroSubtitle}>
                {currentRestaurant?.name || 'Select Restaurant'}
              </Text>
            </View>
          </View>
          <View style={styles.heroActions}>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => navigation.navigate('Marketplace')}
            >
              <Icon name="bag-add-outline" size={scale(22)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => setMenuVisible(true)}
            >
              <Icon name="menu-outline" size={scale(22)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalCount || orders.length}</Text>
            <Text style={styles.statLabel}>Total</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{statusCounts['DELIVERED'] || 0}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{(statusCounts['PLACED'] || 0) + (statusCounts['CONFIRMED'] || 0) + (statusCounts['PROCESSING'] || 0) + (statusCounts['SHIPPED'] || 0)}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
        </View>
      </LinearGradient>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Main Tab Switcher: Orders | Payments */}
      <View style={styles.mainTabWrapper}>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'orders' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('orders')}
          activeOpacity={0.7}
        >
          <Icon name="receipt-outline" size={scale(18)} color={activeMainTab === 'orders' ? C.primary : C.muted} />
          <Text style={[styles.mainTabText, activeMainTab === 'orders' && styles.mainTabTextActive]}>
            Orders
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.mainTab, activeMainTab === 'payments' && styles.mainTabActive]}
          onPress={() => setActiveMainTab('payments')}
          activeOpacity={0.7}
        >
          <Icon name="card-outline" size={scale(18)} color={activeMainTab === 'payments' ? C.primary : C.muted} />
          <Text style={[styles.mainTabText, activeMainTab === 'payments' && styles.mainTabTextActive]}>
            Payments
          </Text>
          {pendingPaymentsCount > 0 && (
            <View style={styles.pendingBadge}>
              <Text style={styles.pendingBadgeText}>{pendingPaymentsCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {activeMainTab === 'orders' ? (
        <>
          {/* Premium Status Filter Tabs */}
          <View style={styles.filterWrapper}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterContainer}
            >
              {STATUS_OPTIONS.map((status) => {
                const config = STATUS_CONFIG[status.value] || STATUS_CONFIG.all;
                const isActive = activeStatusTab === status.value;
                const count = statusCounts[status.value] || 0;

                return (
                  <TouchableOpacity
                    key={status.value}
                    style={[
                      styles.filterChip,
                      isActive && { backgroundColor: config.bg, borderColor: config.color }
                    ]}
                    onPress={() => setActiveStatusTab(status.value)}
                    activeOpacity={0.7}
                  >
                    <Icon name={config.icon} size={scale(14)} color={isActive ? config.color : C.muted} />
                    <Text style={[styles.filterChipText, isActive && { color: config.color }]}>
                      {status.label}
                    </Text>
                    {count > 0 && (
                      <View style={[styles.filterBadge, isActive && { backgroundColor: config.color }]}>
                        <Text style={[styles.filterBadgeText, isActive && { color: '#fff' }]}>{count}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          <FlatList
            data={filteredOrders}
            keyExtractor={item => item.id.toString()}
            renderItem={renderOrderCard}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[C.primary]}
                tintColor={C.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="receipt-outline" size={scale(64)} color={C.muted} />
                </View>
                <Text style={styles.emptyTitle}>No Orders Yet</Text>
                <Text style={styles.emptySubtitle}>
                  {activeStatusTab !== 'all'
                    ? `No ${STATUS_CONFIG[activeStatusTab]?.label.toLowerCase()} orders`
                    : 'Your marketplace orders will appear here'}
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => navigation.navigate('Marketplace')}
                >
                  <LinearGradient
                    colors={[C.gradient1, C.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyActionGradient}
                  >
                    <Icon name="bag-add" size={scale(20)} color="#fff" />
                    <Text style={styles.emptyActionText}>Browse Marketplace</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderOrdersFooter}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        </>
      ) : (
        /* ===== PAYMENTS TAB ===== */
        loadingPayments && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={styles.loadingText}>Loading payments...</Text>
          </View>
        ) : (
          <FlatList
            data={payments}
            keyExtractor={item => item.id.toString()}
            renderItem={renderPaymentCard}
            contentContainerStyle={styles.ordersList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[C.primary]}
                tintColor={C.primary}
              />
            }
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconContainer}>
                  <Icon name="card-outline" size={scale(64)} color={C.muted} />
                </View>
                <Text style={styles.emptyTitle}>No Payments Yet</Text>
                <Text style={styles.emptySubtitle}>
                  When you pay for marketplace orders, your payment status will appear here
                </Text>
                <TouchableOpacity
                  style={styles.emptyActionBtn}
                  onPress={() => navigation.navigate('Marketplace')}
                >
                  <LinearGradient
                    colors={[C.gradient1, C.gradient2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyActionGradient}
                  >
                    <Icon name="bag-add" size={scale(20)} color="#fff" />
                    <Text style={styles.emptyActionText}>Browse Marketplace</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            }
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            removeClippedSubviews={true}
          />
        )
      )}

      {/* ========== ORDER DETAIL MODAL - PREMIUM ========== */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.detailModalContainer}>
            {/* Modal Header with Gradient */}
            {selectedOrder && (
              <LinearGradient
                colors={getStatusStyle(selectedOrder.status).gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailModalHeader}
              >
                <View style={styles.detailModalHeaderContent}>
                  <View>
                    <Text style={styles.detailModalOrderId}>
                      #{selectedOrder.id?.slice(0, 8).toUpperCase()}
                    </Text>
                    <View style={styles.detailModalStatusRow}>
                      <Icon name={getStatusStyle(selectedOrder.status).icon} size={scale(16)} color="#fff" />
                      <Text style={styles.detailModalStatus}>
                        {getStatusStyle(selectedOrder.status).label}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.detailModalCloseBtn}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Icon name="close" size={scale(22)} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailModalDateRow}>
                  <Icon name="calendar-outline" size={scale(14)} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.detailModalDate}>
                    {formatDate(selectedOrder.createdAt)} • {formatTime(selectedOrder.createdAt)}
                  </Text>
                </View>
              </LinearGradient>
            )}

            {selectedOrder && (() => {
              const isCancelled = selectedOrder.status === 'CANCELLED';
              // Find linked payment for this order
              const linkedPayment = payments.find(p => p.orderId === selectedOrder.id);

              // 6-step: determine current step
              let currentStep = -1;
              const isRejected = linkedPayment?.status === 'REJECTED';
              if (linkedPayment) {
                if (linkedPayment.status === 'PENDING') currentStep = 0;
                else if (linkedPayment.status === 'REJECTED') currentStep = 0;
                else if (linkedPayment.status === 'VERIFIED') {
                  const orderStepMap = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
                  currentStep = orderStepMap[selectedOrder.status] ?? 2;
                }
              } else {
                // Legacy order without payment
                const orderStepMap = { PLACED: 2, CONFIRMED: 2, PROCESSING: 3, SHIPPED: 4, DELIVERED: 5 };
                currentStep = orderStepMap[selectedOrder.status] ?? 2;
              }

              return (
              <ScrollView
                style={styles.detailModalBody}
                contentContainerStyle={styles.detailModalBodyContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Payment Rejected Warning */}
                {isRejected && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.dangerLight }]}>
                    <Icon name="close-circle" size={scale(18)} color={C.danger} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailStatusMsgText, { color: C.danger, fontWeight: '700' }]}>
                        Payment Rejected
                      </Text>
                      <Text style={{ fontSize: moderateScale(12), color: C.danger, marginTop: scale(4) }}>
                        {linkedPayment?.rejectionReason || 'Please re-submit payment screenshot'}
                      </Text>
                    </View>
                  </View>
                )}

                {/* 7-Step Progress Timeline */}
                {!isCancelled && (
                  <View style={styles.orderTimelineCard}>
                    <Text style={styles.orderTimelineSectionTitle}>Order Journey</Text>
                    <View style={styles.orderTimeline}>
                      {ORDER_TIMELINE_STEPS.map((step, index) => {
                        const isCompleted = !isCancelled && !isRejected && currentStep > index;
                        const isCurrent = !isCancelled && !isRejected && currentStep === index;
                        const isLast = index === ORDER_TIMELINE_STEPS.length - 1;

                        return (
                          <View key={step.key} style={styles.orderTimelineStep}>
                            <View style={styles.orderTimelineStepContent}>
                              <View
                                style={[
                                  styles.orderTimelineCircle,
                                  isCompleted && styles.orderTimelineCircleCompleted,
                                  isCurrent && styles.orderTimelineCircleCurrent,
                                ]}
                              >
                                {isCompleted ? (
                                  <Icon name="checkmark" size={14} color="#fff" />
                                ) : (
                                  <Icon
                                    name={step.icon}
                                    size={14}
                                    color={isCurrent ? C.primary : C.muted}
                                  />
                                )}
                              </View>
                              <Text
                                style={[
                                  styles.orderTimelineLabel,
                                  isCompleted && styles.orderTimelineLabelCompleted,
                                  isCurrent && styles.orderTimelineLabelCurrent,
                                ]}
                              >
                                {step.label}
                              </Text>
                            </View>
                            {!isLast && (
                              <View
                                style={[
                                  styles.orderTimelineLine,
                                  isCompleted && styles.orderTimelineLineCompleted,
                                ]}
                              />
                            )}
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Cancelled with reason */}
                {isCancelled && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.dangerLight }]}>
                    <Icon name="close-circle" size={scale(18)} color={C.danger} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.detailStatusMsgText, { color: C.danger, fontWeight: '700' }]}>
                        Order Cancelled
                      </Text>
                      {selectedOrder.cancellationReason && (
                        <Text style={{ fontSize: moderateScale(12), color: C.danger, marginTop: scale(4) }}>
                          Reason: {selectedOrder.cancellationReason}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Status Notes from Vendor */}
                {selectedOrder.statusNotes && !isCancelled && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: '#DBEAFE' }]}>
                    <Icon name="chatbubble-ellipses-outline" size={scale(18)} color="#2563EB" />
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: moderateScale(11), color: '#2563EB', fontWeight: '700' }}>Vendor Note</Text>
                      <Text style={{ fontSize: moderateScale(12), color: '#1E40AF', marginTop: scale(2) }}>
                        {selectedOrder.statusNotes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Expected / Actual Delivery Dates */}
                {(selectedOrder.expectedDeliveryDate || selectedOrder.actualDeliveryDate) && (
                  <View style={styles.detailCard}>
                    <View style={[styles.detailCardIcon, { backgroundColor: '#F0FDF4' }]}>
                      <Icon name="calendar" size={scale(20)} color={C.success} />
                    </View>
                    <View style={styles.detailCardContent}>
                      {selectedOrder.expectedDeliveryDate && (
                        <View>
                          <Text style={styles.detailCardLabel}>Expected Delivery</Text>
                          <Text style={styles.detailCardValue}>{formatDate(selectedOrder.expectedDeliveryDate)}</Text>
                        </View>
                      )}
                      {selectedOrder.actualDeliveryDate && (
                        <View style={selectedOrder.expectedDeliveryDate ? { marginTop: scale(6) } : {}}>
                          <Text style={styles.detailCardLabel}>Delivered On</Text>
                          <Text style={[styles.detailCardValue, { color: C.success, fontWeight: '700' }]}>{formatDate(selectedOrder.actualDeliveryDate)}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Vendor Card */}
                <View style={styles.detailCard}>
                  <View style={styles.detailCardIcon}>
                    <Icon name="storefront" size={scale(20)} color={C.primary} />
                  </View>
                  <View style={styles.detailCardContent}>
                    <Text style={styles.detailCardLabel}>Vendor</Text>
                    <Text style={styles.detailCardValue}>
                      {typeof selectedOrder.vendor === 'object' ? selectedOrder.vendor?.name : selectedOrder.vendor || 'Unknown Vendor'}
                    </Text>
                  </View>
                </View>

                {/* Delivery Address Card */}
                <View style={styles.detailCard}>
                  <View style={[styles.detailCardIcon, { backgroundColor: '#E0F2FE' }]}>
                    <Icon name="location" size={scale(20)} color="#0284C7" />
                  </View>
                  <View style={styles.detailCardContent}>
                    <Text style={styles.detailCardLabel}>Delivery Address</Text>
                    <Text style={styles.detailCardValue}>
                      {selectedOrder.deliveryAddress || currentRestaurant?.address || currentRestaurant?.name || 'Not specified'}
                    </Text>
                  </View>
                </View>

                {/* Notes if any */}
                {selectedOrder.notes && (
                  <View style={styles.detailCard}>
                    <View style={[styles.detailCardIcon, { backgroundColor: C.successLight }]}>
                      <Icon name="document-text" size={scale(20)} color={C.success} />
                    </View>
                    <View style={styles.detailCardContent}>
                      <Text style={styles.detailCardLabel}>Notes</Text>
                      <Text style={styles.detailCardValue}>{selectedOrder.notes}</Text>
                    </View>
                  </View>
                )}

                {/* Order Items Section */}
                <View style={styles.detailItemsSection}>
                  <Text style={styles.detailItemsTitle}>
                    Order Items ({selectedOrder.items?.length || 0})
                  </Text>

                  {selectedOrder.items?.map((item, idx) => (
                    <View key={idx} style={styles.detailItemCard}>
                      <View style={styles.detailItemLeft}>
                        <View style={styles.detailItemImagePlaceholder}>
                          <Icon name="cube" size={scale(18)} color={C.muted} />
                        </View>
                        <View style={styles.detailItemInfo}>
                          <Text style={styles.detailItemName} numberOfLines={2}>
                            {item.product?.name || 'Product'}
                          </Text>
                          <Text style={styles.detailItemMeta}>
                            {item.qty} {item.product?.unit || 'pcs'} × {formatPrice(item.priceSnapshot || item.product?.price || 0)}
                          </Text>
                          {item.product?.deliveryTime && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(2) }}>
                              <Icon name="time-outline" size={scale(11)} color={C.muted} />
                              <Text style={{ fontSize: moderateScale(10), color: C.muted }}>
                                {item.product.deliveryTime}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      <Text style={styles.detailItemTotal}>
                        {formatPrice(item.qty * (item.priceSnapshot || item.product?.price || 0))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total Section */}
                <View style={styles.detailTotalSection}>
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Subtotal</Text>
                    <Text style={styles.detailTotalValue}>{formatPrice(selectedOrder.totalAmount)}</Text>
                  </View>
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailTotalLabel}>Delivery</Text>
                    <Text style={[styles.detailTotalValue, { color: C.success }]}>Free</Text>
                  </View>
                  <View style={styles.detailTotalDivider} />
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailGrandTotalLabel}>Total Amount</Text>
                    <Text style={styles.detailGrandTotalValue}>{formatPrice(selectedOrder.totalAmount)}</Text>
                  </View>
                </View>

                {/* Status History Timeline */}
                {selectedOrder.statusHistory && selectedOrder.statusHistory.length > 0 && (
                  <View style={styles.orderTimelineCard}>
                    <Text style={styles.orderTimelineSectionTitle}>Status History</Text>
                    {selectedOrder.statusHistory.map((entry, idx) => {
                      const isLatest = idx === selectedOrder.statusHistory.length - 1;
                      const entryStatusStyle = getStatusStyle(entry.newStatus);
                      return (
                        <View key={entry.id || idx} style={styles.historyItem}>
                          <View style={styles.historyDotCol}>
                            <View style={[styles.historyDot, { backgroundColor: isLatest ? C.primary : C.success }]} />
                            {idx < selectedOrder.statusHistory.length - 1 && (
                              <View style={styles.historyLine} />
                            )}
                          </View>
                          <View style={styles.historyContent}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(6), flexWrap: 'wrap' }}>
                              {entry.oldStatus && (
                                <>
                                  <View style={[styles.historyBadge, { backgroundColor: '#F1F5F9' }]}>
                                    <Text style={[styles.historyBadgeText, { color: C.muted }]}>{entry.oldStatus}</Text>
                                  </View>
                                  <Icon name="arrow-forward" size={scale(10)} color={C.muted} />
                                </>
                              )}
                              <View style={[styles.historyBadge, { backgroundColor: entryStatusStyle.bg }]}>
                                <Text style={[styles.historyBadgeText, { color: entryStatusStyle.color }]}>{entry.newStatus}</Text>
                              </View>
                            </View>
                            <Text style={styles.historyDate}>
                              {formatDate(entry.createdAt)} • {formatTime(entry.createdAt)}
                            </Text>
                            {entry.notes && (
                              <Text style={styles.historyNotes}>{entry.notes}</Text>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Status Message for PLACED */}
                {selectedOrder.status === 'PLACED' && !selectedOrder.statusHistory?.length && (
                  <View style={styles.detailStatusMsg}>
                    <Icon name="time-outline" size={scale(18)} color={C.primary} />
                    <Text style={styles.detailStatusMsgText}>
                      Awaiting vendor confirmation. You'll be notified when status updates.
                    </Text>
                  </View>
                )}

                {selectedOrder.status === 'DELIVERED' && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.successLight }]}>
                    <Icon name="checkmark-circle" size={scale(18)} color={C.success} />
                    <Text style={[styles.detailStatusMsgText, { color: C.success }]}>
                      Order delivered successfully!
                    </Text>
                  </View>
                )}
              </ScrollView>
              );
            })()}

            {/* Footer Actions */}
            <View style={styles.detailModalFooter}>
              {INVOICE_STATUSES.includes(selectedOrder?.status) && (
                <TouchableOpacity
                  style={styles.detailInvoiceBtn}
                  onPress={() => handleDownloadInvoice(selectedOrder)}
                >
                  <Icon name="document-text-outline" size={scale(18)} color={C.primary} />
                  <Text style={styles.detailInvoiceBtnText}>Invoice</Text>
                </TouchableOpacity>
              )}
              {selectedOrder?.status === 'DELIVERED' && (
                selectedOrder?.rating ? (
                  <View style={styles.detailRatedBadge}>
                    <Icon name="star" size={scale(16)} color="#F59E0B" />
                    <Text style={styles.detailRatedText}>Rated {selectedOrder.rating?.overallRating || 0}/5</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.detailRateBtn}
                    onPress={() => {
                      setDetailModalVisible(false);
                      openRatingModal(selectedOrder);
                    }}
                  >
                    <Icon name="star" size={scale(18)} color="#fff" />
                    <Text style={styles.detailRateBtnText}>Rate Vendor</Text>
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={[styles.detailCloseBtn, selectedOrder?.status === 'DELIVERED' && { flex: 1 }]}
                onPress={() => setDetailModalVisible(false)}
              >
                <Text style={styles.detailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== PAYMENT DETAIL MODAL ========== */}
      <Modal visible={paymentDetailVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModalContainer}>
            {/* Modal Header with Gradient */}
            {selectedPayment && (
              <LinearGradient
                colors={getPaymentStatusStyle(selectedPayment.status).gradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.detailModalHeader}
              >
                <View style={styles.detailModalHeaderContent}>
                  <View>
                    <Text style={styles.detailModalOrderId}>
                      #{selectedPayment.id?.slice(0, 8).toUpperCase()}
                    </Text>
                    <View style={styles.detailModalStatusRow}>
                      <Icon name={getPaymentStatusStyle(selectedPayment.status).icon} size={scale(16)} color="#fff" />
                      <Text style={styles.detailModalStatus}>
                        {getPaymentStatusStyle(selectedPayment.status).label}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.detailModalCloseBtn}
                    onPress={() => setPaymentDetailVisible(false)}
                  >
                    <Icon name="close" size={scale(22)} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailModalDateRow}>
                  <Icon name="calendar-outline" size={scale(14)} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.detailModalDate}>
                    {formatDate(selectedPayment.createdAt)} • {formatTime(selectedPayment.createdAt)}
                  </Text>
                </View>
              </LinearGradient>
            )}

            {selectedPayment && (
              <ScrollView
                style={styles.detailModalBody}
                contentContainerStyle={styles.detailModalBodyContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Vendor Card */}
                <View style={styles.detailCard}>
                  <View style={styles.detailCardIcon}>
                    <Icon name="storefront" size={scale(20)} color={C.primary} />
                  </View>
                  <View style={styles.detailCardContent}>
                    <Text style={styles.detailCardLabel}>Vendor</Text>
                    <Text style={styles.detailCardValue}>
                      {selectedPayment.vendor?.name || 'Unknown Vendor'}
                    </Text>
                  </View>
                </View>

                {/* Delivery Address Card */}
                {selectedPayment.deliveryAddress && (
                  <View style={styles.detailCard}>
                    <View style={[styles.detailCardIcon, { backgroundColor: '#E0F2FE' }]}>
                      <Icon name="location" size={scale(20)} color="#0284C7" />
                    </View>
                    <View style={styles.detailCardContent}>
                      <Text style={styles.detailCardLabel}>Delivery Address</Text>
                      <Text style={styles.detailCardValue}>{selectedPayment.deliveryAddress}</Text>
                    </View>
                  </View>
                )}

                {/* Notes */}
                {selectedPayment.notes && (
                  <View style={styles.detailCard}>
                    <View style={[styles.detailCardIcon, { backgroundColor: C.successLight }]}>
                      <Icon name="document-text" size={scale(20)} color={C.success} />
                    </View>
                    <View style={styles.detailCardContent}>
                      <Text style={styles.detailCardLabel}>Notes</Text>
                      <Text style={styles.detailCardValue}>{selectedPayment.notes}</Text>
                    </View>
                  </View>
                )}

                {/* Screenshot - Full Width Outside Card */}
                <View style={styles.screenshotSection}>
                  <View style={styles.screenshotHeader}>
                    <Icon name="image" size={scale(20)} color="#4F46E5" />
                    <Text style={styles.screenshotHeaderText}>Payment Screenshot</Text>
                  </View>
                  {selectedPayment.screenshotUrl ? (
                    <TouchableOpacity 
                      activeOpacity={0.9}
                      onPress={() => {
                        const fullUrl = getImageUrl(selectedPayment.screenshotUrl);
                        console.log('Screenshot URL (relative):', selectedPayment.screenshotUrl);
                        console.log('Screenshot URL (full):', fullUrl);
                      }}
                      style={styles.screenshotImageContainer}
                    >
                      <Image
                        source={{ uri: getImageUrl(selectedPayment.screenshotUrl) }}
                        style={styles.paymentScreenshot}
                        resizeMode="contain"
                        onError={(error) => {
                          console.error('Image load error:', error.nativeEvent);
                          console.error('Failed URL:', selectedPayment.screenshotUrl);
                          console.error('Full URL:', getImageUrl(selectedPayment.screenshotUrl));
                        }}
                        onLoad={() => console.log('✅ Screenshot loaded successfully from:', getImageUrl(selectedPayment.screenshotUrl))}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.paymentScreenshot, { justifyContent: 'center', alignItems: 'center', backgroundColor: C.bgLight }]}>
                      <Icon name="image-outline" size={scale(40)} color={C.muted} />
                      <Text style={{ color: C.muted, fontSize: moderateScale(12), marginTop: scale(8), textAlign: 'center' }}>
                        No screenshot available
                      </Text>
                    </View>
                  )}
                </View>

                {/* Items Section */}
                <View style={styles.detailItemsSection}>
                  <Text style={styles.detailItemsTitle}>
                    Items ({(selectedPayment.items || []).length})
                  </Text>

                  {(selectedPayment.items || []).map((item, idx) => (
                    <View key={idx} style={styles.detailItemCard}>
                      <View style={styles.detailItemLeft}>
                        <View style={styles.detailItemImagePlaceholder}>
                          <Icon name="cube" size={scale(18)} color={C.muted} />
                        </View>
                        <View style={styles.detailItemInfo}>
                          <Text style={styles.detailItemName} numberOfLines={2}>
                            {item.name || 'Product'}
                          </Text>
                          <Text style={styles.detailItemMeta}>
                            x{item.qty} × {formatPrice(item.priceSnapshot || 0)}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.detailItemTotal}>
                        {formatPrice(item.qty * (item.priceSnapshot || 0))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total Section */}
                <View style={styles.detailTotalSection}>
                  <View style={styles.detailTotalRow}>
                    <Text style={styles.detailGrandTotalLabel}>Total Amount</Text>
                    <Text style={styles.detailGrandTotalValue}>{formatPrice(selectedPayment.totalAmount)}</Text>
                  </View>
                </View>

                {/* Status Messages */}
                {selectedPayment.status === 'PENDING' && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: '#FEF3C7' }]}>
                    <Icon name="time-outline" size={scale(18)} color="#D97706" />
                    <Text style={[styles.detailStatusMsgText, { color: '#D97706' }]}>
                      Waiting for vendor to verify your payment. You'll be notified once verified.
                    </Text>
                  </View>
                )}

                {selectedPayment.status === 'VERIFIED' && selectedPayment.orderId && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.successLight }]}>
                    <Icon name="checkmark-circle" size={scale(18)} color={C.success} />
                    <Text style={[styles.detailStatusMsgText, { color: C.success }]}>
                      Payment verified! Order #{selectedPayment.orderId?.slice(0, 8).toUpperCase()} created.
                    </Text>
                  </View>
                )}

                {selectedPayment.status === 'REJECTED' && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.dangerLight }]}>
                    <Icon name="close-circle" size={scale(18)} color={C.danger} />
                    <Text style={[styles.detailStatusMsgText, { color: C.danger }]}>
                      {selectedPayment.rejectionReason || 'Payment rejected. Please contact vendor or re-submit.'}
                    </Text>
                  </View>
                )}

                {selectedPayment.verifiedAt && (
                  <View style={styles.detailCard}>
                    <View style={[styles.detailCardIcon, { backgroundColor: C.successLight }]}>
                      <Icon name="checkmark-done" size={scale(20)} color={C.success} />
                    </View>
                    <View style={styles.detailCardContent}>
                      <Text style={styles.detailCardLabel}>Verified At</Text>
                      <Text style={styles.detailCardValue}>
                        {formatDate(selectedPayment.verifiedAt)} {formatTime(selectedPayment.verifiedAt)}
                      </Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer */}
            <View style={styles.detailModalFooter}>
              <TouchableOpacity
                style={[styles.detailCloseBtn, { flex: 1 }]}
                onPress={() => setPaymentDetailVisible(false)}
              >
                <Text style={styles.detailCloseBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== RATING MODAL - Bottom Sheet ========== */}
      <Modal visible={ratingModalVisible} animationType="slide" transparent onRequestClose={() => setRatingModalVisible(false)}>
        <View style={styles.ratingOverlay}>
          <TouchableOpacity style={{ flex: 1 }} activeOpacity={1} onPress={() => setRatingModalVisible(false)} />
          <View style={styles.ratingSheet}>
            {/* Handle bar */}
            <View style={styles.ratingHandle} />

            {/* Header */}
            <View style={styles.ratingSheetHeader}>
              <Text style={styles.ratingSheetTitle}>Rate Vendor</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Icon name="close-circle" size={scale(28)} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Vendor Name */}
            <Text style={styles.ratingVendorName}>
              {typeof orderToRate?.vendor === 'object' ? orderToRate?.vendor?.name : orderToRate?.vendor || 'Vendor'}
            </Text>

            {/* Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} activeOpacity={0.7}>
                  <Icon
                    name={star <= rating ? 'star' : 'star-outline'}
                    size={scale(40)}
                    color={star <= rating ? '#F59E0B' : '#D1D5DB'}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.ratingHint}>
              {rating === 1 ? 'Poor' : rating === 2 ? 'Below Average' : rating === 3 ? 'Average' : rating === 4 ? 'Good' : 'Excellent'}
            </Text>

            {/* Comment */}
            <TextInput
              style={styles.ratingTextArea}
              placeholder="Comment (optional)"
              placeholderTextColor={C.muted}
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            {/* Buttons */}
            <View style={styles.ratingBtnRow}>
              <TouchableOpacity style={styles.ratingCancelBtn} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.ratingCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.ratingSubmitBtn, isSubmittingRating && { opacity: 0.7 }]}
                onPress={submitRating}
                disabled={isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.ratingSubmitText}>Submit Rating</Text>
                )}
              </TouchableOpacity>
            </View>
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

  // Hero Section
  heroSection: {
    paddingTop: scale(8),
    paddingBottom: scale(16),
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  heroActions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  heroIconBtn: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(16),
    paddingHorizontal: scale(40),
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  statDivider: {
    width: 1,
    height: scale(30),
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Loading State
  loadingHero: {
    paddingVertical: scale(24),
    paddingHorizontal: scale(20),
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(16),
    fontSize: moderateScale(16),
    color: C.muted,
  },

  // Filter Tabs - Premium Style
  filterWrapper: {
    backgroundColor: C.card,
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterContainer: {
    paddingHorizontal: scale(12),
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    marginHorizontal: scale(4),
    backgroundColor: C.card,
    borderRadius: scale(25),
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: scale(2),
    elevation: 1,
  },
  filterChipText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
    marginHorizontal: scale(6),
  },
  filterBadge: {
    minWidth: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(6),
    marginLeft: scale(2),
  },
  filterBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.ink,
  },

  // Orders List
  ordersList: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(120),
  },

  // Order Card - Premium Design
  orderCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.08,
    shadowRadius: scale(12),
    elevation: 3,
  },
  orderStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(8),
  },
  orderStatusText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderContent: {
    padding: scale(16),
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: scale(12),
  },
  orderIdSection: {},
  orderIdLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: C.ink,
    marginTop: scale(2),
  },
  orderDateSection: {
    alignItems: 'flex-end',
  },
  orderDateText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.text,
  },
  orderTimeText: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(2),
  },

  // Vendor Section
  vendorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingVertical: scale(10),
    paddingHorizontal: scale(12),
    backgroundColor: C.primaryLight,
    borderRadius: scale(10),
    marginBottom: scale(12),
  },
  vendorIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorLabel: {
    fontSize: moderateScale(10),
    color: C.muted,
    fontWeight: '500',
  },
  vendorName: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginTop: 1,
  },

  // Items Preview
  itemsPreview: {
    marginBottom: scale(12),
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(4),
  },
  itemDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: C.muted,
    marginRight: scale(10),
  },
  itemPreviewName: {
    flex: 1,
    fontSize: moderateScale(13),
    color: C.text,
  },
  itemPreviewQty: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
    marginLeft: scale(8),
  },
  moreItemsText: {
    fontSize: moderateScale(12),
    color: C.primary,
    fontWeight: '600',
    marginTop: scale(4),
    marginLeft: scale(16),
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: scale(12),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  orderTotalSection: {},
  orderTotalLabel: {
    fontSize: moderateScale(11),
    color: C.muted,
  },
  orderTotalAmount: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.ink,
    marginTop: scale(2),
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  rateBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.warnLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    backgroundColor: C.primaryLight,
    borderRadius: scale(10),
  },
  viewDetailsText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: scale(60),
    paddingHorizontal: scale(40),
  },
  emptyIconContainer: {
    width: scale(120),
    height: scale(120),
    borderRadius: scale(60),
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(22),
  },
  emptyActionBtn: {
    marginTop: scale(24),
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
  },
  emptyActionText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Modal Base
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },

  // ========== ORDER DETAIL MODAL - PREMIUM ==========
  detailModalContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  detailModalHeader: {
    paddingTop: scale(20),
    paddingBottom: scale(16),
    paddingHorizontal: scale(20),
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
  },
  detailModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailModalOrderId: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  detailModalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(6),
  },
  detailModalStatus: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: '#fff',
  },
  detailModalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(12),
  },
  detailModalDate: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.8)',
  },
  detailModalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  detailModalBodyContent: {
    padding: scale(16),
    paddingBottom: scale(10),
  },

  // Detail Cards
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(14),
    backgroundColor: C.bg,
    borderRadius: scale(12),
    marginBottom: scale(10),
  },
  detailCardIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCardValue: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    marginTop: scale(3),
  },

  // Detail Items Section
  detailItemsSection: {
    marginTop: scale(10),
    marginBottom: scale(10),
  },
  detailItemsTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(12),
  },
  detailItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: scale(12),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailItemImagePlaceholder: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
  },
  detailItemMeta: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(3),
  },
  detailItemTotal: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    marginLeft: scale(10),
  },

  // Detail Total Section
  detailTotalSection: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    padding: scale(16),
    marginTop: scale(10),
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: scale(8),
  },
  detailTotalLabel: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  detailTotalValue: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
  },
  detailTotalDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: scale(10),
  },
  detailGrandTotalLabel: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  detailGrandTotalValue: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.primary,
  },

  // Order Timeline Stepper (like service booking)
  orderTimelineCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  orderTimelineSectionTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(16),
  },
  orderTimeline: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderTimelineStep: {
    flex: 1,
    alignItems: 'center',
  },
  orderTimelineStepContent: {
    alignItems: 'center',
  },
  orderTimelineCircle: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: C.bg,
    borderWidth: scale(2),
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  orderTimelineCircleCompleted: {
    backgroundColor: C.success,
    borderColor: C.success,
  },
  orderTimelineCircleCurrent: {
    backgroundColor: '#fff',
    borderColor: C.primary,
    borderWidth: scale(3),
  },
  orderTimelineLabel: {
    fontSize: moderateScale(9),
    color: C.muted,
    textAlign: 'center',
    maxWidth: scale(50),
  },
  orderTimelineLabelCompleted: {
    color: C.success,
    fontWeight: '600',
  },
  orderTimelineLabelCurrent: {
    color: C.primary,
    fontWeight: '700',
  },
  orderTimelineLine: {
    position: 'absolute',
    top: scale(15),
    left: '50%',
    right: '-50%',
    height: scale(2),
    backgroundColor: C.border,
    zIndex: -1,
  },
  orderTimelineLineCompleted: {
    backgroundColor: C.success,
  },

  // Status History Items
  historyItem: {
    flexDirection: 'row',
    gap: scale(10),
  },
  historyDotCol: {
    alignItems: 'center',
    width: scale(12),
  },
  historyDot: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    marginTop: scale(4),
  },
  historyLine: {
    width: scale(2),
    flex: 1,
    minHeight: scale(20),
    backgroundColor: C.border,
  },
  historyContent: {
    flex: 1,
    paddingBottom: scale(12),
  },
  historyBadge: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  historyBadgeText: {
    fontSize: moderateScale(10),
    fontWeight: '600',
  },
  historyDate: {
    fontSize: moderateScale(11),
    color: C.muted,
    marginTop: scale(4),
  },
  historyNotes: {
    fontSize: moderateScale(11),
    color: C.text,
    marginTop: scale(2),
    fontStyle: 'italic',
  },

  // Detail Status Message
  detailStatusMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    padding: scale(14),
    backgroundColor: C.primaryLight,
    borderRadius: scale(12),
    marginTop: scale(12),
  },
  detailStatusMsgText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: C.primary,
    fontWeight: '500',
  },

  // Detail Modal Footer
  detailModalFooter: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  detailInvoiceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(12),
    paddingHorizontal: scale(16),
    backgroundColor: C.primaryLight || '#FEE2E2',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.primary,
  },
  detailInvoiceBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.primary,
  },
  detailRateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    backgroundColor: C.warn,
    borderRadius: scale(12),
  },
  detailRateBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },
  detailRatedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(14),
    backgroundColor: '#FEF3C7',
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  detailRatedText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#D97706',
  },
  detailCloseBtn: {
    flex: 2,
    paddingVertical: scale(14),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    alignItems: 'center',
  },
  detailCloseBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Rating Modal - Bottom Sheet
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  ratingSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    paddingHorizontal: scale(20),
    paddingBottom: scale(30),
  },
  ratingHandle: {
    width: scale(40),
    height: scale(4),
    backgroundColor: C.border,
    borderRadius: scale(2),
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(12),
  },
  ratingSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(16),
  },
  ratingSheetTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  ratingVendorName: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    marginBottom: scale(16),
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
    marginBottom: scale(4),
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: scale(16),
  },
  ratingTextArea: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(15),
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: scale(80),
    textAlignVertical: 'top',
    marginBottom: scale(16),
  },
  ratingBtnRow: {
    flexDirection: 'row',
    gap: scale(12),
  },
  ratingCancelBtn: {
    flex: 1,
    paddingVertical: scale(14),
    backgroundColor: C.bg,
    borderRadius: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  ratingCancelText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  ratingSubmitBtn: {
    flex: 2,
    paddingVertical: scale(14),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    alignItems: 'center',
  },
  ratingSubmitText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Restaurant Picker
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  pickerBody: { padding: scale(16) },
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  restaurantIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  restaurantIconSelected: { backgroundColor: C.primary },
  restaurantOptionInfo: { flex: 1 },
  restaurantOptionName: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  restaurantOptionNameSelected: { color: C.primary },
  restaurantOptionAddress: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },

  // Main Tab Switcher (Orders | Payments)
  mainTabWrapper: {
    flexDirection: 'row',
    backgroundColor: C.card,
    paddingHorizontal: scale(16),
    paddingVertical: scale(8),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    gap: scale(8),
  },
  mainTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  mainTabActive: {
    backgroundColor: C.primaryLight,
    borderColor: C.primary,
  },
  mainTabText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.muted,
  },
  mainTabTextActive: {
    color: C.primary,
  },
  pendingBadge: {
    minWidth: scale(22),
    height: scale(22),
    borderRadius: scale(11),
    backgroundColor: C.danger,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(6),
  },
  pendingBadgeText: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: '#fff',
  },

  // Payment Status Message in card
  paymentStatusMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    marginBottom: scale(12),
  },
  paymentStatusMsgText: {
    flex: 1,
    fontSize: moderateScale(12),
    fontWeight: '600',
  },

  // Payment Detail Modal Container - pixel-based height for consistent responsiveness
  paymentModalContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    height: SCREEN_HEIGHT * 0.85,
  },

  // Payment Screenshot in modal
  paymentScreenshot: {
    width: '100%',
    height: scale(250),
    marginTop: scale(8),
    borderRadius: scale(12),
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },

  // Screenshot Section Styles
  screenshotSection: {
    marginBottom: scale(16),
    paddingHorizontal: scale(20),
  },

  screenshotHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
  },

  screenshotHeaderText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },

  screenshotImageContainer: {
    borderRadius: scale(12),
    overflow: 'hidden',
    backgroundColor: '#F9FAFB',
    borderWidth: 2,
    borderColor: '#E0E7FF',
  },
});
