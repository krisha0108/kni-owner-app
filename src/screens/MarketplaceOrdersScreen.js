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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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

  // Filter orders by status tab
  const filteredOrders = React.useMemo(() => {
    if (activeStatusTab === 'all') return orders;
    return orders.filter(o => o.status === activeStatusTab);
  }, [orders, activeStatusTab]);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const response = await api.get(`/owner/marketplace/orders?restaurantId=${selectedRestaurantId}`);
      if (response.data.ok) {
        setOrders(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  // Load data when restaurant changes
  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    loadData();
  };

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setDetailModalVisible(true);
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
          <Icon name={statusStyle.icon} size={14} color="#fff" />
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
                <Icon name="storefront" size={16} color={C.primary} />
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
                  <Icon name="star" size={16} color={C.warn} />
                </TouchableOpacity>
              )}
              <View style={styles.viewDetailsBtn}>
                <Text style={styles.viewDetailsText}>Details</Text>
                <Icon name="chevron-forward" size={16} color={C.primary} />
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
              <Icon name="arrow-back" size={22} color="#fff" />
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
              <Icon name="bag-add-outline" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroIconBtn}
              onPress={() => setMenuVisible(true)}
            >
              <Icon name="menu-outline" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Order Stats Summary */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{orders.length}</Text>
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
                <Icon name={config.icon} size={14} color={isActive ? config.color : C.muted} />
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
              <Icon name="receipt-outline" size={64} color={C.muted} />
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
                <Icon name="bag-add" size={20} color="#fff" />
                <Text style={styles.emptyActionText}>Browse Marketplace</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        }
      />

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
                      <Icon name={getStatusStyle(selectedOrder.status).icon} size={16} color="#fff" />
                      <Text style={styles.detailModalStatus}>
                        {getStatusStyle(selectedOrder.status).label}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.detailModalCloseBtn}
                    onPress={() => setDetailModalVisible(false)}
                  >
                    <Icon name="close" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
                <View style={styles.detailModalDateRow}>
                  <Icon name="calendar-outline" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.detailModalDate}>
                    {formatDate(selectedOrder.createdAt)} • {formatTime(selectedOrder.createdAt)}
                  </Text>
                </View>
              </LinearGradient>
            )}

            {selectedOrder && (
              <ScrollView
                style={styles.detailModalBody}
                contentContainerStyle={styles.detailModalBodyContent}
                showsVerticalScrollIndicator={true}
                bounces={true}
              >
                {/* Vendor Card */}
                <View style={styles.detailCard}>
                  <View style={styles.detailCardIcon}>
                    <Icon name="storefront" size={20} color={C.primary} />
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
                    <Icon name="location" size={20} color="#0284C7" />
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
                      <Icon name="document-text" size={20} color={C.success} />
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
                          <Icon name="cube" size={18} color={C.muted} />
                        </View>
                        <View style={styles.detailItemInfo}>
                          <Text style={styles.detailItemName} numberOfLines={2}>
                            {item.product?.name || 'Product'}
                          </Text>
                          <Text style={styles.detailItemMeta}>
                            {item.qty} {item.product?.unit || 'pcs'} × {formatPrice(item.priceSnapshot || item.product?.price || 0)}
                          </Text>
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

                {/* Status Message */}
                {selectedOrder.status === 'PLACED' && (
                  <View style={styles.detailStatusMsg}>
                    <Icon name="time-outline" size={18} color={C.primary} />
                    <Text style={styles.detailStatusMsgText}>
                      Awaiting vendor confirmation. You'll be notified when status updates.
                    </Text>
                  </View>
                )}

                {selectedOrder.status === 'DELIVERED' && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.successLight }]}>
                    <Icon name="checkmark-circle" size={18} color={C.success} />
                    <Text style={[styles.detailStatusMsgText, { color: C.success }]}>
                      Order delivered successfully!
                    </Text>
                  </View>
                )}

                {selectedOrder.status === 'CANCELLED' && (
                  <View style={[styles.detailStatusMsg, { backgroundColor: C.dangerLight }]}>
                    <Icon name="close-circle" size={18} color={C.danger} />
                    <Text style={[styles.detailStatusMsgText, { color: C.danger }]}>
                      This order was cancelled.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            {/* Footer Actions */}
            <View style={styles.detailModalFooter}>
              {selectedOrder?.status === 'DELIVERED' && (
                selectedOrder?.rating ? (
                  <View style={styles.detailRatedBadge}>
                    <Icon name="star" size={16} color="#F59E0B" />
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
                    <Icon name="star" size={18} color="#fff" />
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
                <Icon name="close-circle" size={28} color={C.muted} />
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
                    size={40}
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
    paddingTop: 8,
    paddingBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  heroLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  heroActions: {
    flexDirection: 'row',
    gap: 8,
  },
  heroIconBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 40,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#fff',
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },

  // Loading State
  loadingHero: {
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: C.muted,
  },

  // Filter Tabs - Premium Style
  filterWrapper: {
    backgroundColor: C.card,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  filterContainer: {
    paddingHorizontal: 12,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginHorizontal: 4,
    backgroundColor: C.card,
    borderRadius: 25,
    borderWidth: 1.5,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
    marginHorizontal: 6,
  },
  filterBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    marginLeft: 2,
  },
  filterBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ink,
  },

  // Orders List
  ordersList: {
    paddingHorizontal: 16,
    paddingBottom: 100,
  },

  // Order Card - Premium Design
  orderCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    shadowColor: C.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  orderStatusStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  orderStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  orderContent: {
    padding: 16,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderIdSection: {},
  orderIdLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    letterSpacing: 0.5,
  },
  orderId: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
  },
  orderDateSection: {
    alignItems: 'flex-end',
  },
  orderDateText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  orderTimeText: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  // Vendor Section
  vendorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: C.primaryLight,
    borderRadius: 10,
    marginBottom: 12,
  },
  vendorIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vendorInfo: {
    flex: 1,
  },
  vendorLabel: {
    fontSize: 10,
    color: C.muted,
    fontWeight: '500',
  },
  vendorName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginTop: 1,
  },

  // Items Preview
  itemsPreview: {
    marginBottom: 12,
  },
  itemPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
  },
  itemDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: C.muted,
    marginRight: 10,
  },
  itemPreviewName: {
    flex: 1,
    fontSize: 13,
    color: C.text,
  },
  itemPreviewQty: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginLeft: 8,
  },
  moreItemsText: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '600',
    marginTop: 4,
    marginLeft: 16,
  },

  // Order Footer
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  orderTotalSection: {},
  orderTotalLabel: {
    fontSize: 11,
    color: C.muted,
  },
  orderTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
  },
  orderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rateBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.warnLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: C.primaryLight,
    borderRadius: 10,
  },
  viewDetailsText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.primary,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 22,
  },
  emptyActionBtn: {
    marginTop: 24,
    borderRadius: 14,
    overflow: 'hidden',
  },
  emptyActionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  emptyActionText: {
    fontSize: 15,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  detailModalHeader: {
    paddingTop: 20,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  detailModalHeaderContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  detailModalOrderId: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
  detailModalStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  detailModalStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
  detailModalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailModalDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  detailModalDate: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.8)',
  },
  detailModalBody: {
    flexGrow: 1,
    flexShrink: 1,
  },
  detailModalBodyContent: {
    padding: 16,
    paddingBottom: 10,
  },

  // Detail Cards
  detailCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    marginBottom: 10,
  },
  detailCardIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailCardContent: {
    flex: 1,
  },
  detailCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailCardValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
    marginTop: 3,
  },

  // Detail Items Section
  detailItemsSection: {
    marginTop: 10,
    marginBottom: 10,
  },
  detailItemsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
  },
  detailItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  detailItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  detailItemImagePlaceholder: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailItemInfo: {
    flex: 1,
  },
  detailItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  detailItemMeta: {
    fontSize: 12,
    color: C.muted,
    marginTop: 3,
  },
  detailItemTotal: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginLeft: 10,
  },

  // Detail Total Section
  detailTotalSection: {
    backgroundColor: C.bg,
    borderRadius: 12,
    padding: 16,
    marginTop: 10,
  },
  detailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailTotalLabel: {
    fontSize: 14,
    color: C.muted,
  },
  detailTotalValue: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  detailTotalDivider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 10,
  },
  detailGrandTotalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  detailGrandTotalValue: {
    fontSize: 20,
    fontWeight: '800',
    color: C.primary,
  },

  // Detail Status Message
  detailStatusMsg: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    backgroundColor: C.primaryLight,
    borderRadius: 12,
    marginTop: 12,
  },
  detailStatusMsgText: {
    flex: 1,
    fontSize: 13,
    color: C.primary,
    fontWeight: '500',
  },

  // Detail Modal Footer
  detailModalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  detailRateBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: C.warn,
    borderRadius: 12,
  },
  detailRateBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
  detailRatedBadge: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  detailRatedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
  },
  detailCloseBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  detailCloseBtnText: {
    fontSize: 15,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  ratingHandle: {
    width: 40,
    height: 4,
    backgroundColor: C.border,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  ratingSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  ratingSheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  ratingVendorName: {
    fontSize: 16,
    fontWeight: '600',
    color: C.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 4,
  },
  ratingHint: {
    textAlign: 'center',
    fontSize: 13,
    fontWeight: '600',
    color: '#F59E0B',
    marginBottom: 16,
  },
  ratingTextArea: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  ratingBtnRow: {
    flexDirection: 'row',
    gap: 12,
  },
  ratingCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  ratingCancelText: { fontSize: 15, fontWeight: '700', color: C.ink },
  ratingSubmitBtn: {
    flex: 2,
    paddingVertical: 14,
    backgroundColor: C.primary,
    borderRadius: 12,
    alignItems: 'center',
  },
  ratingSubmitText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Restaurant Picker
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerBody: { padding: 16 },
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
