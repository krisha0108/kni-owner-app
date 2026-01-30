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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
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
};

const STATUS_CONFIG = {
  all: { bg: '#F3F4F6', color: C.ink, icon: 'list-outline', label: 'All' },
  PLACED: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Placed' },
  PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' },
  CONFIRMED: { bg: '#DBEAFE', color: '#2563EB', icon: 'checkmark-circle-outline', label: 'Confirmed' },
  PROCESSING: { bg: '#E0E7FF', color: '#4F46E5', icon: 'cog-outline', label: 'Processing' },
  SHIPPED: { bg: '#F3E8FF', color: '#9333EA', icon: 'car-outline', label: 'Shipped' },
  DELIVERED: { bg: '#D1FAE5', color: '#059669', icon: 'checkmark-done-outline', label: 'Delivered' },
  CANCELLED: { bg: '#FEE2E2', color: '#DC2626', icon: 'close-circle-outline', label: 'Cancelled' },
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PLACED', label: 'Placed' },
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'SHIPPED', label: 'Shipped' },
  { value: 'DELIVERED', label: 'Delivered' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPrice = (price) => `₹${price || 0}`;

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
      const response = await api.post('/owner/marketplace/ratings', {
        orderId: orderToRate.id,
        vendorId: orderToRate.vendor?.id || orderToRate.vendorId,
        rating,
        comment: ratingComment.trim() || undefined,
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
    const restaurantName = typeof item.restaurant === 'object' ? item.restaurant?.name : currentRestaurant?.name;
    const itemCount = item.items?.length || 0;

    return (
      <View style={styles.card}>
        {/* Header */}
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.orderNumber}>Order #{item.id?.slice(0, 8).toUpperCase()}</Text>
            <View style={styles.dateRow}>
              <Icon name="calendar-outline" size={12} color={C.muted} />
              <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.color} />
            <Text style={[styles.statusText, { color: statusStyle.color }]}>
              {statusStyle.label}
            </Text>
          </View>
        </View>

        {/* Info Rows */}
        <View style={styles.infoSection}>
          {vendorName && (
            <View style={styles.infoRow}>
              <Icon name="storefront-outline" size={16} color={C.muted} />
              <Text style={styles.infoLabel}>Vendor:</Text>
              <Text style={styles.infoValue}>{vendorName}</Text>
            </View>
          )}

          {restaurantName && (
            <View style={styles.infoRow}>
              <Icon name="location-outline" size={16} color={C.muted} />
              <Text style={styles.infoLabel}>Restaurant:</Text>
              <Text style={styles.infoValue}>{restaurantName}</Text>
            </View>
          )}

          <View style={styles.infoRow}>
            <Icon name="cube-outline" size={16} color={C.muted} />
            <Text style={styles.infoValue}>{itemCount} item(s)</Text>
            <Text style={styles.infoDot}>•</Text>
            <Text style={styles.infoTotal}>{formatPrice(item.totalAmount)}</Text>
          </View>
        </View>

        {/* Items Preview */}
        {item.items?.length > 0 && (
          <View style={styles.itemsSection}>
            <Text style={styles.itemsSectionTitle}>Items:</Text>
            {item.items.slice(0, 3).map((orderItem, idx) => (
              <View key={idx} style={styles.itemRow}>
                <Text style={styles.itemName} numberOfLines={1}>
                  {orderItem.product?.name || 'Product'} ({orderItem.qty} {orderItem.product?.unit || 'pcs'})
                </Text>
                <Text style={styles.itemPrice}>
                  {formatPrice(orderItem.qty * (orderItem.priceSnapshot || orderItem.product?.price || 0))}
                </Text>
              </View>
            ))}
            {item.items.length > 3 && (
              <Text style={styles.moreItems}>+{item.items.length - 3} more items</Text>
            )}
          </View>
        )}

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.viewBtn} onPress={() => openOrderDetails(item)}>
            <Text style={styles.viewBtnText}>View Full Details</Text>
          </TouchableOpacity>

          {item.status === 'DELIVERED' && (
            <TouchableOpacity style={styles.rateBtn} onPress={() => openRatingModal(item)}>
              <Icon name="star-outline" size={16} color={C.warn} />
              <Text style={styles.rateBtnText}>Rate Vendor</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Orders</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading orders...</Text>
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
        <Text style={styles.headerTitle}>My Orders</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Request')} style={styles.browseBtn}>
            <Icon name="bag-add-outline" size={22} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Status Summary Cards - Stylish Horizontal Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.summaryContainer}
      >
        {STATUS_OPTIONS.map((status) => {
          const config = STATUS_CONFIG[status.value] || STATUS_CONFIG.all;
          const isActive = activeStatusTab === status.value;
          const count = statusCounts[status.value] || 0;

          return (
            <TouchableOpacity
              key={status.value}
              style={[styles.summaryCard, isActive && styles.summaryCardActive]}
              onPress={() => setActiveStatusTab(status.value)}
            >
              <View style={[styles.summaryIcon, isActive && { backgroundColor: `${config.color}20` }]}>
                <Icon name={config.icon} size={20} color={isActive ? config.color : C.muted} />
              </View>
              <Text style={[styles.summaryCount, isActive && { color: config.color }]}>{count}</Text>
              <Text style={[styles.summaryLabel, isActive && { color: config.color }]}>{status.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <FlatList
        data={filteredOrders}
        keyExtractor={item => item.id.toString()}
        renderItem={renderOrderCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="cube-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Orders Found</Text>
            <Text style={styles.emptyText}>Your marketplace orders will appear here</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('Request')}>
              <Icon name="bag-add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Browse Marketplace</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ========== ORDER DETAIL MODAL ========== */}
      <Modal visible={detailModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity onPress={() => setDetailModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody}>
                {/* Order Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Information</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValueMono}>{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadgeSmall, { backgroundColor: getStatusStyle(selectedOrder.status).bg }]}>
                      <Text style={[styles.statusTextSmall, { color: getStatusStyle(selectedOrder.status).color }]}>
                        {getStatusStyle(selectedOrder.status).label}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Order Date:</Text>
                    <Text style={styles.detailValue}>{formatDate(selectedOrder.createdAt)}</Text>
                  </View>
                </View>

                {/* Vendor Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Vendor Information</Text>
                  <View style={styles.detailRowIcon}>
                    <Icon name="storefront-outline" size={16} color={C.muted} />
                    <Text style={styles.detailValue}>
                      {typeof selectedOrder.vendor === 'object' ? selectedOrder.vendor?.name : selectedOrder.vendor || 'Unknown'}
                    </Text>
                  </View>
                </View>

                {/* Delivery Address */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Delivery Address</Text>
                  <View style={styles.detailRowIcon}>
                    <Icon name="location-outline" size={16} color={C.muted} />
                    <Text style={styles.detailValue}>{currentRestaurant?.name || 'Restaurant'}</Text>
                  </View>
                </View>

                {/* Order Items */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Order Items</Text>
                  {selectedOrder.items?.map((item, idx) => (
                    <View key={idx} style={styles.orderItemCard}>
                      <View style={styles.orderItemInfo}>
                        <Text style={styles.orderItemName}>{item.product?.name || 'Product'}</Text>
                        <Text style={styles.orderItemQty}>
                          {item.qty} {item.product?.unit || 'pcs'} × {formatPrice(item.priceSnapshot || item.product?.price || 0)}
                        </Text>
                      </View>
                      <Text style={styles.orderItemTotal}>
                        {formatPrice(item.qty * (item.priceSnapshot || item.product?.price || 0))}
                      </Text>
                    </View>
                  ))}
                </View>

                {/* Total */}
                <View style={styles.totalSection}>
                  <Text style={styles.totalLabel}>Total Amount:</Text>
                  <Text style={styles.totalAmount}>{formatPrice(selectedOrder.totalAmount)}</Text>
                </View>

                {/* Status Messages */}
                {selectedOrder.status === 'PLACED' && (
                  <View style={styles.statusMessage}>
                    <Icon name="information-circle-outline" size={20} color={C.info} />
                    <Text style={styles.statusMessageText}>
                      Your order has been placed and is awaiting vendor confirmation. You will be notified when the vendor updates the order status.
                    </Text>
                  </View>
                )}

                {selectedOrder.status === 'CANCELLED' && (
                  <View style={[styles.statusMessage, { backgroundColor: '#FEF2F2' }]}>
                    <Icon name="close-circle-outline" size={20} color={C.danger} />
                    <Text style={[styles.statusMessageText, { color: C.danger }]}>
                      This order has been cancelled by the vendor.
                    </Text>
                  </View>
                )}
              </ScrollView>
            )}

            <View style={styles.modalFooter}>
              {selectedOrder?.status === 'DELIVERED' && (
                <TouchableOpacity
                  style={styles.rateModalBtn}
                  onPress={() => {
                    setDetailModalVisible(false);
                    openRatingModal(selectedOrder);
                  }}
                >
                  <Icon name="star" size={16} color="#fff" />
                  <Text style={styles.rateModalBtnText}>Rate Vendor</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={styles.closeModalBtn} onPress={() => setDetailModalVisible(false)}>
                <Text style={styles.closeModalBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== RATING MODAL ========== */}
      <Modal visible={ratingModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Rate Vendor</Text>
              <TouchableOpacity onPress={() => setRatingModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.ratingVendorName}>
                {typeof orderToRate?.vendor === 'object' ? orderToRate?.vendor?.name : orderToRate?.vendor || 'Vendor'}
              </Text>

              <Text style={styles.ratingLabel}>Your Rating</Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setRating(star)}>
                    <Icon
                      name={star <= rating ? 'star' : 'star-outline'}
                      size={36}
                      color={star <= rating ? C.warn : C.border}
                    />
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.ratingLabel}>Comment (Optional)</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Share your experience with this vendor..."
                placeholderTextColor={C.muted}
                value={ratingComment}
                onChangeText={setRatingComment}
                multiline
                numberOfLines={4}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRatingModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, isSubmittingRating && styles.submitBtnDisabled]}
                onPress={submitRating}
                disabled={isSubmittingRating}
              >
                {isSubmittingRating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Rating</Text>
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
  browseBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
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

  // Summary Cards - Stylish Status Tabs
  summaryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  summaryCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    minWidth: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  summaryCardActive: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 10,
    color: C.muted,
    marginTop: 2,
    textAlign: 'center',
  },

  list: { padding: 16 },

  // Order Card
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
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  orderNumber: { fontSize: 16, fontWeight: '700', color: C.ink },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  orderDate: { fontSize: 12, color: C.muted },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: { fontSize: 12, fontWeight: '600' },

  infoSection: { marginBottom: 12 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  infoLabel: { fontSize: 13, fontWeight: '500', color: C.text },
  infoValue: { fontSize: 13, color: C.muted },
  infoDot: { fontSize: 13, color: C.muted },
  infoTotal: { fontSize: 14, fontWeight: '700', color: C.ink },

  itemsSection: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    marginBottom: 12,
  },
  itemsSectionTitle: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemName: { fontSize: 13, color: C.muted, flex: 1 },
  itemPrice: { fontSize: 13, color: C.muted },
  moreItems: { fontSize: 12, color: C.muted, fontStyle: 'italic', marginTop: 4 },

  actionsRow: { flexDirection: 'row', gap: 10 },
  viewBtn: {
    flex: 1,
    paddingVertical: 10,
    backgroundColor: C.primary,
    borderRadius: 10,
    alignItems: 'center',
  },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    flex: 1,
    paddingVertical: 10,
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
  },
  rateBtnText: { fontSize: 13, fontWeight: '600', color: C.warn },

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

  // Detail Modal
  detailSection: { marginBottom: 20 },
  detailSectionTitle: { fontSize: 14, fontWeight: '700', color: C.ink, marginBottom: 10 },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  detailRowIcon: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailLabel: { fontSize: 13, color: C.muted },
  detailValue: { fontSize: 13, color: C.text },
  detailValueMono: { fontSize: 12, color: C.text, fontFamily: 'monospace' },
  statusBadgeSmall: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 },
  statusTextSmall: { fontSize: 11, fontWeight: '600' },

  orderItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: C.bg,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: C.border,
    marginBottom: 8,
  },
  orderItemInfo: { flex: 1 },
  orderItemName: { fontSize: 14, fontWeight: '600', color: C.ink },
  orderItemQty: { fontSize: 12, color: C.muted, marginTop: 2 },
  orderItemTotal: { fontSize: 14, fontWeight: '700', color: C.ink },

  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 2,
    borderTopColor: C.border,
    marginTop: 8,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  totalAmount: { fontSize: 22, fontWeight: '700', color: C.primary },

  statusMessage: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    marginTop: 16,
  },
  statusMessageText: { flex: 1, fontSize: 13, color: C.info, lineHeight: 18 },

  rateModalBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    backgroundColor: C.warn,
    borderRadius: 12,
  },
  rateModalBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  closeModalBtn: {
    flex: 1,
    paddingVertical: 14,
    backgroundColor: C.bg,
    borderRadius: 12,
    alignItems: 'center',
  },
  closeModalBtnText: { fontSize: 15, fontWeight: '700', color: C.ink },

  // Rating Modal
  ratingVendorName: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
    marginBottom: 20,
  },
  ratingLabel: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 10, marginTop: 16 },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
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
