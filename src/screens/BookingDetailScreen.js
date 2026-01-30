import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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
  serviceBlue: '#3B82F6',
  partOrange: '#F97316',
};

const GST_RATE = 0.18;

const getStatusStyle = (status) => {
  switch (status) {
    case 'DRAFT':
      return { bg: '#F3F4F6', text: C.muted, icon: 'document-outline', label: 'Draft' };
    case 'SLOT_SELECTED':
      return { bg: '#EFF6FF', text: C.info, icon: 'calendar-outline', label: 'Slot Selected' };
    case 'PENDING_PAYMENT':
      return { bg: '#FFFBEB', text: C.warn, icon: 'time-outline', label: 'Pending Payment' };
    case 'PAYMENT_UPLOADED':
      return { bg: '#FEF3C7', text: '#D97706', icon: 'cloud-upload-outline', label: 'Payment Uploaded' };
    case 'PAYMENT_VERIFIED':
      return { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle-outline', label: 'Payment Verified' };
    case 'ENGINEER_ASSIGNED':
      return { bg: '#EFF6FF', text: C.info, icon: 'person-outline', label: 'Engineer Assigned' };
    case 'SCHEDULED':
      return { bg: '#EFF6FF', text: C.info, icon: 'calendar-outline', label: 'Scheduled' };
    case 'IN_PROGRESS':
      return { bg: '#FEF3C7', text: '#D97706', icon: 'construct-outline', label: 'In Progress' };
    case 'COMPLETED':
      return { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-done-circle-outline', label: 'Completed' };
    case 'CANCELLED':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle-outline', label: 'Cancelled' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'help-circle-outline', label: status };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatPrice = (amount) => {
  return `₹${(amount || 0).toLocaleString('en-IN')}`;
};

export default function BookingDetailScreen({ navigation, route }) {
  const { bookingId } = route.params || {};
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadBooking = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/bookings/${bookingId}`);
      if (response.data.ok) {
        setBooking(response.data.data);
      }
    } catch (error) {
      console.error('Error loading booking:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [bookingId]);

  useEffect(() => {
    if (bookingId) {
      loadBooking();
    }
  }, [bookingId, loadBooking]);

  const onRefresh = () => {
    setRefreshing(true);
    loadBooking();
  };

  const callEngineer = (phone) => {
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Booking Details</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!booking) {
    return (
      <SafeAreaView style={st.container}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Booking Details</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={st.emptyContainer}>
          <Icon name="alert-circle-outline" size={64} color={C.muted} />
          <Text style={st.emptyTitle}>Booking Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusStyle = getStatusStyle(booking.status);

  // Group items by category
  const groupedItems = {};
  (booking.items || []).forEach((item) => {
    const itemData = item.serviceItem || item.partItem;
    const category = itemData?.category;
    const categoryId = category?.id || 'uncategorized';
    const categoryName = category?.name || 'Uncategorized';

    if (!groupedItems[categoryId]) {
      groupedItems[categoryId] = {
        categoryId,
        categoryName,
        services: [],
        parts: [],
      };
    }

    if (item.serviceItem) {
      groupedItems[categoryId].services.push(item);
    } else {
      groupedItems[categoryId].parts.push(item);
    }
  });

  // Calculate payment breakdown
  const itemSubtotal = (booking.items || []).reduce(
    (sum, item) => sum + item.priceSnapshot * item.qty, 0
  );
  const gstAmount = Math.round(itemSubtotal * GST_RATE);
  const tipAmount = Math.max(0, booking.totalAmount - itemSubtotal - gstAmount);

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Booking #{booking.id.slice(0, 8)}</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={st.content}
      >
        {/* Status Card */}
        <View style={st.card}>
          <View style={st.statusRow}>
            <View style={[st.statusBadge, { backgroundColor: statusStyle.bg }]}>
              <Icon name={statusStyle.icon} size={16} color={statusStyle.text} />
              <Text style={[st.statusText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
            </View>
            <Text style={st.dateText}>{formatDate(booking.createdAt)}</Text>
          </View>
        </View>

        {/* Restaurant Info */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <Icon name="restaurant-outline" size={20} color={C.ink} />
            <Text style={st.cardTitle}>Restaurant</Text>
          </View>
          <Text style={st.restaurantName}>{booking.restaurant?.name}</Text>
          {booking.restaurant?.address && (
            <Text style={st.restaurantAddress}>{booking.restaurant.address}</Text>
          )}
          {booking.restaurant?.city && (
            <Text style={st.restaurantCity}>{booking.restaurant.city}</Text>
          )}
        </View>

        {/* Problem Description */}
        {booking.problemDescription && (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Icon name="document-text-outline" size={20} color={C.ink} />
              <Text style={st.cardTitle}>Problem Description</Text>
            </View>
            <Text style={st.problemText}>{booking.problemDescription}</Text>
          </View>
        )}

        {/* Schedule Info */}
        {(booking.slotStartDateTime || booking.adminAdjustedSlotStart) && (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Icon name="calendar-outline" size={20} color={C.ink} />
              <Text style={st.cardTitle}>Schedule</Text>
            </View>
            {booking.slotStartDateTime && (
              <View style={st.scheduleRow}>
                <Text style={st.scheduleLabel}>Requested:</Text>
                <Text style={st.scheduleValue}>{formatDate(booking.slotStartDateTime)}</Text>
              </View>
            )}
            {booking.adminAdjustedSlotStart && (
              <View style={st.scheduleRow}>
                <Text style={st.scheduleLabel}>Confirmed:</Text>
                <Text style={[st.scheduleValue, { color: C.ok }]}>
                  {formatDate(booking.adminAdjustedSlotStart)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Items by Category */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <Icon name="list-outline" size={20} color={C.ink} />
            <Text style={st.cardTitle}>Items by Category</Text>
          </View>

          {Object.values(groupedItems).map((category) => {
            const categoryTotal = [...category.services, ...category.parts].reduce(
              (sum, item) => sum + item.priceSnapshot * item.qty, 0
            );

            return (
              <View key={category.categoryId} style={st.categorySection}>
                {/* Category Header */}
                <View style={st.categoryHeader}>
                  <View style={st.categoryHeaderLeft}>
                    <Icon name="grid-outline" size={16} color={C.ink} />
                    <Text style={st.categoryName}>{category.categoryName}</Text>
                  </View>
                  <Text style={st.categoryTotal}>{formatPrice(categoryTotal)}</Text>
                </View>

                {/* Services */}
                {category.services.length > 0 && (
                  <View style={st.itemGroup}>
                    <View style={st.itemGroupHeader}>
                      <Icon name="construct-outline" size={14} color={C.serviceBlue} />
                      <Text style={[st.itemGroupTitle, { color: C.serviceBlue }]}>Services</Text>
                    </View>
                    {category.services.map((item) => (
                      <View key={item.id} style={st.itemRow}>
                        <View style={st.itemInfo}>
                          <Text style={st.itemName}>{item.serviceItem?.name}</Text>
                          {item.serviceItem?.subCategory && (
                            <Text style={st.itemSubCategory}>({item.serviceItem.subCategory.name})</Text>
                          )}
                          <Text style={st.itemQty}>x{item.qty}</Text>
                        </View>
                        <Text style={[st.itemPrice, { color: C.serviceBlue }]}>
                          {formatPrice(item.priceSnapshot * item.qty)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Parts */}
                {category.parts.length > 0 && (
                  <View style={st.itemGroup}>
                    <View style={st.itemGroupHeader}>
                      <Icon name="cube-outline" size={14} color={C.partOrange} />
                      <Text style={[st.itemGroupTitle, { color: C.partOrange }]}>Parts</Text>
                    </View>
                    {category.parts.map((item) => (
                      <View key={item.id} style={st.itemRow}>
                        <View style={st.itemInfo}>
                          <Text style={st.itemName}>{item.partItem?.name}</Text>
                          {item.partItem?.subCategory && (
                            <Text style={st.itemSubCategory}>({item.partItem.subCategory.name})</Text>
                          )}
                          <Text style={st.itemQty}>x{item.qty}</Text>
                        </View>
                        <Text style={[st.itemPrice, { color: C.partOrange }]}>
                          {formatPrice(item.priceSnapshot * item.qty)}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            );
          })}

          {/* Payment Breakdown */}
          <View style={st.paymentBreakdown}>
            <View style={st.breakdownRow}>
              <Text style={st.breakdownLabel}>Item Subtotal</Text>
              <Text style={st.breakdownValue}>{formatPrice(itemSubtotal)}</Text>
            </View>
            <View style={st.breakdownRow}>
              <Text style={st.breakdownLabel}>GST (18%)</Text>
              <Text style={st.breakdownValue}>{formatPrice(gstAmount)}</Text>
            </View>
            {tipAmount > 0 && (
              <View style={st.breakdownRow}>
                <Text style={[st.breakdownLabel, { color: C.ok }]}>Tip for Professional</Text>
                <Text style={[st.breakdownValue, { color: C.ok }]}>{formatPrice(tipAmount)}</Text>
              </View>
            )}
            <View style={st.totalRow}>
              <Text style={st.totalLabel}>Total Paid</Text>
              <Text style={st.totalValue}>{formatPrice(booking.totalAmount)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Proof */}
        {booking.paymentProof && (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Icon name="receipt-outline" size={20} color={C.ink} />
              <Text style={st.cardTitle}>Payment Proof</Text>
            </View>
            <View style={st.paymentStatusRow}>
              <View style={[
                st.paymentBadge,
                { backgroundColor: booking.paymentProof.status === 'VERIFIED' ? '#D1FAE5' : '#FEF3C7' }
              ]}>
                <Text style={[
                  st.paymentBadgeText,
                  { color: booking.paymentProof.status === 'VERIFIED' ? '#059669' : '#D97706' }
                ]}>
                  {booking.paymentProof.status}
                </Text>
              </View>
            </View>
            {booking.paymentProof.screenshotUrl && (
              <Image
                source={{ uri: booking.paymentProof.screenshotUrl }}
                style={st.paymentImage}
                resizeMode="contain"
              />
            )}
          </View>
        )}

        {/* Engineer Assignment */}
        {booking.engineerAssignments && booking.engineerAssignments.length > 0 && (
          <View style={st.card}>
            <View style={st.cardHeader}>
              <Icon name="person-outline" size={20} color={C.ink} />
              <Text style={st.cardTitle}>Assigned Engineer</Text>
            </View>
            {booking.engineerAssignments.map((assignment) => (
              <View key={assignment.id} style={st.engineerRow}>
                <View style={st.engineerAvatar}>
                  <Icon name="person" size={24} color={C.primary} />
                </View>
                <View style={st.engineerInfo}>
                  <Text style={st.engineerName}>{assignment.engineer?.name}</Text>
                  <Text style={st.engineerPhone}>{assignment.engineer?.phone}</Text>
                  <View style={[
                    st.assignmentBadge,
                    { backgroundColor: assignment.status === 'ACCEPTED' ? '#D1FAE5' : '#FEF3C7' }
                  ]}>
                    <Text style={[
                      st.assignmentBadgeText,
                      { color: assignment.status === 'ACCEPTED' ? '#059669' : '#D97706' }
                    ]}>
                      {assignment.status}
                    </Text>
                  </View>
                </View>
                {assignment.engineer?.phone && (
                  <TouchableOpacity
                    style={st.callBtn}
                    onPress={() => callEngineer(assignment.engineer.phone)}
                  >
                    <Icon name="call" size={20} color="#fff" />
                  </TouchableOpacity>
                )}
              </View>
            ))}

            {/* Work Log */}
            {booking.engineerAssignments[0]?.workLog && (
              <View style={st.workLogSection}>
                <Text style={st.workLogTitle}>Work Completed</Text>
                {booking.engineerAssignments[0].workLog.completionNote && (
                  <Text style={st.workLogNote}>
                    {booking.engineerAssignments[0].workLog.completionNote}
                  </Text>
                )}
                {booking.engineerAssignments[0].workLog.proofImageUrls?.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.proofImages}>
                    {booking.engineerAssignments[0].workLog.proofImageUrls.map((url, idx) => (
                      <Image key={idx} source={{ uri: url }} style={st.proofImage} resizeMode="cover" />
                    ))}
                  </ScrollView>
                )}
              </View>
            )}
          </View>
        )}
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
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
  backBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  content: { padding: 16 },

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
    gap: 8,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },

  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 13, fontWeight: '600' },
  dateText: { fontSize: 13, color: C.muted },

  restaurantName: { fontSize: 16, fontWeight: '600', color: C.ink },
  restaurantAddress: { fontSize: 14, color: C.muted, marginTop: 4 },
  restaurantCity: { fontSize: 14, color: C.muted },

  problemText: { fontSize: 14, color: C.text, lineHeight: 20 },

  scheduleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  scheduleLabel: { fontSize: 14, color: C.muted },
  scheduleValue: { fontSize: 14, fontWeight: '600', color: C.ink },

  categorySection: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  categoryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryName: { fontSize: 15, fontWeight: '700', color: C.ink },
  categoryTotal: { fontSize: 15, fontWeight: '700', color: C.primary },

  itemGroup: { padding: 12 },
  itemGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  itemGroupTitle: { fontSize: 13, fontWeight: '600' },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  itemInfo: { flexDirection: 'row', alignItems: 'center', flex: 1, flexWrap: 'wrap' },
  itemName: { fontSize: 14, color: C.text },
  itemSubCategory: { fontSize: 12, color: C.muted, marginLeft: 4 },
  itemQty: { fontSize: 13, color: C.muted, marginLeft: 8 },
  itemPrice: { fontSize: 14, fontWeight: '600' },

  paymentBreakdown: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    marginTop: 4,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  breakdownLabel: { fontSize: 14, color: C.muted },
  breakdownValue: { fontSize: 14, color: C.muted },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  totalLabel: { fontSize: 16, fontWeight: '700', color: C.ink },
  totalValue: { fontSize: 18, fontWeight: '700', color: C.ink },

  paymentStatusRow: { marginBottom: 12 },
  paymentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  paymentBadgeText: { fontSize: 12, fontWeight: '600' },
  paymentImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: C.bg,
  },

  engineerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  engineerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  engineerInfo: { flex: 1, marginLeft: 12 },
  engineerName: { fontSize: 16, fontWeight: '600', color: C.ink },
  engineerPhone: { fontSize: 14, color: C.muted, marginTop: 2 },
  assignmentBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
  },
  assignmentBadgeText: { fontSize: 11, fontWeight: '600' },
  callBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.ok,
    alignItems: 'center',
    justifyContent: 'center',
  },

  workLogSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  workLogTitle: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 8 },
  workLogNote: { fontSize: 14, color: C.text, marginBottom: 8 },
  proofImages: { marginTop: 8 },
  proofImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: 8,
  },
});
