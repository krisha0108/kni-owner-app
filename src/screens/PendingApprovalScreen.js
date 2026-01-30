import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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
};

const TYPE_CONFIG = {
  RESTAURANT: {
    icon: 'business-outline',
    label: 'Restaurant Approval',
    bg: '#DBEAFE',
    color: '#2563EB',
  },
  TEAM_INVITE: {
    icon: 'person-outline',
    label: 'Team Invitation',
    bg: '#F3E8FF',
    color: '#9333EA',
  },
  BOOKING: {
    icon: 'calendar-outline',
    label: 'Booking Approval',
    bg: '#D1FAE5',
    color: '#059669',
  },
  CATEGORY_REQUEST: {
    icon: 'document-text-outline',
    label: 'Category Request',
    bg: '#FFEDD5',
    color: '#EA580C',
  },
};

const STATUS_CONFIG = {
  PENDING: {
    icon: 'time-outline',
    label: 'Pending',
    bg: '#FEF3C7',
    color: '#D97706',
  },
  APPROVED: {
    icon: 'checkmark-circle-outline',
    label: 'Approved',
    bg: '#D1FAE5',
    color: '#059669',
  },
  REJECTED: {
    icon: 'close-circle-outline',
    label: 'Rejected',
    bg: '#FEE2E2',
    color: '#DC2626',
  },
};

const TABS = [
  { key: 'all', label: 'All' },
  { key: 'pending', label: 'Pending' },
  { key: 'RESTAURANT', label: 'Restaurants' },
  { key: 'TEAM_INVITE', label: 'Team' },
  { key: 'BOOKING', label: 'Bookings' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function PendingApprovalScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [items, setItems] = useState([]);
  const [activeTab, setActiveTab] = useState('all');
  const [restaurants, setRestaurants] = useState([]);
  const [currentRestaurant, setCurrentRestaurant] = useState(null);
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);

  const loadData = useCallback(async (restaurantId = null) => {
    try {
      setLoading(true);

      // Get all restaurants
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const approvedRestaurants = restaurantsRes.data.data.filter(r => r.status === 'APPROVED');
        setRestaurants(approvedRestaurants);

        // Use provided restaurantId or first approved
        let targetRestaurant = null;
        if (restaurantId) {
          targetRestaurant = approvedRestaurants.find(r => r.id === restaurantId);
        }
        if (!targetRestaurant && approvedRestaurants.length > 0) {
          targetRestaurant = approvedRestaurants[0];
        }

        if (targetRestaurant) {
          setCurrentRestaurant(targetRestaurant);
          const response = await api.get(`/owner/pending-approvals?restaurantId=${targetRestaurant.id}`);
          if (response.data.ok) {
            setItems(response.data.data || []);
          } else {
            setItems([]);
          }
        }
      } else {
        // Fallback - try without restaurant filter
        const response = await api.get('/owner/pending-approvals');
        if (response.data.ok) {
          setItems(response.data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching pending items:', error);
      setItems([]);
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
      setItems([]);
      loadData(restaurant.id);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData(currentRestaurant?.id);
  };

  const filteredItems = items.filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'pending') return item.status === 'PENDING';
    return item.type === activeTab;
  });

  const pendingCount = items.filter((i) => i.status === 'PENDING').length;
  const approvedCount = items.filter((i) => i.status === 'APPROVED').length;
  const rejectedCount = items.filter((i) => i.status === 'REJECTED').length;

  const handleViewAction = (item) => {
    if (item.type === 'RESTAURANT' && item.status === 'PENDING') {
      navigation.navigate('RestaurantStatus');
    } else if (item.type === 'TEAM_INVITE') {
      navigation.navigate('TeamManagement');
    } else if (item.type === 'BOOKING') {
      navigation.navigate('MyBookings');
    }
  };

  const renderItem = ({ item }) => {
    const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.RESTAURANT;
    const statusConfig = STATUS_CONFIG[item.status] || STATUS_CONFIG.PENDING;

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <View style={[styles.typeIcon, { backgroundColor: typeConfig.bg }]}>
            <Icon name={typeConfig.icon} size={20} color={typeConfig.color} />
          </View>
          <View style={styles.itemInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={[styles.typeBadge, { backgroundColor: typeConfig.bg }]}>
                <Text style={[styles.typeBadgeText, { color: typeConfig.color }]}>
                  {typeConfig.label}
                </Text>
              </View>
            </View>
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
            <View style={styles.itemMeta}>
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                <Icon name={statusConfig.icon} size={12} color={statusConfig.color} />
                <Text style={[styles.statusText, { color: statusConfig.color }]}>
                  {statusConfig.label}
                </Text>
              </View>
              <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
            </View>
          </View>
        </View>

        {item.status === 'PENDING' && (item.type === 'RESTAURANT' || item.type === 'TEAM_INVITE' || item.type === 'BOOKING') && (
          <TouchableOpacity style={styles.viewBtn} onPress={() => handleViewAction(item)}>
            <Icon name="eye-outline" size={16} color={C.info} />
            <Text style={styles.viewBtnText}>
              {item.type === 'RESTAURANT' ? 'View Status' : item.type === 'TEAM_INVITE' ? 'View Team' : 'View Booking'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  const renderHeader = () => (
    <>
      {/* Summary Cards */}
      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEF3C7' }]}>
            <Icon name="time-outline" size={20} color="#D97706" />
          </View>
          <Text style={styles.summaryCount}>{pendingCount}</Text>
          <Text style={styles.summaryLabel}>Pending</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#D1FAE5' }]}>
            <Icon name="checkmark-circle-outline" size={20} color="#059669" />
          </View>
          <Text style={styles.summaryCount}>{approvedCount}</Text>
          <Text style={styles.summaryLabel}>Approved</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#FEE2E2' }]}>
            <Icon name="close-circle-outline" size={20} color="#DC2626" />
          </View>
          <Text style={styles.summaryCount}>{rejectedCount}</Text>
          <Text style={styles.summaryLabel}>Rejected</Text>
        </View>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryIcon, { backgroundColor: '#DBEAFE' }]}>
            <Icon name="documents-outline" size={20} color="#2563EB" />
          </View>
          <Text style={styles.summaryCount}>{items.length}</Text>
          <Text style={styles.summaryLabel}>Total</Text>
        </View>
      </View>

      {/* Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsContainer}
        contentContainerStyle={styles.tabsContent}
      >
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, isActive && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List Header */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>Approval Items ({filteredItems.length})</Text>
        <Text style={styles.listSubtitle}>Review status of your requests</Text>
      </View>
    </>
  );

  const renderEmpty = () => (
    <View style={styles.emptyBox}>
      <View style={styles.emptyIconBox}>
        <Icon name="checkmark-circle-outline" size={48} color={C.muted} />
      </View>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptyText}>No pending items to review</Text>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.helpCard}>
      <View style={[styles.helpIcon, { backgroundColor: '#DBEAFE' }]}>
        <Icon name="information-circle-outline" size={20} color="#2563EB" />
      </View>
      <View style={styles.helpContent}>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          Approvals are typically processed within 24-48 hours. If your request has been pending
          for longer, please contact our support team.
        </Text>
        <TouchableOpacity onPress={() => navigation.navigate('SupportCenter')}>
          <Text style={styles.helpLink}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
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
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          {pendingCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.refreshBtn}>
          <Icon name="refresh-outline" size={22} color={C.ink} />
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
          <Text style={styles.restaurantName} numberOfLines={1}>
            {currentRestaurant.name}
          </Text>
          {restaurants.length > 1 && (
            <View style={styles.switchBadge}>
              <Icon name="swap-horizontal" size={14} color={C.primary} />
              <Text style={styles.switchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={renderFooter}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
      />

      {/* Restaurant Picker Modal */}
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
                    style={[
                      styles.restaurantOption,
                      isSelected && styles.restaurantOptionSelected,
                    ]}
                    onPress={() => selectRestaurant(restaurant)}
                  >
                    <View style={[styles.restaurantIcon, isSelected && styles.restaurantIconSelected]}>
                      <Icon
                        name="restaurant"
                        size={20}
                        color={isSelected ? '#fff' : C.primary}
                      />
                    </View>
                    <View style={styles.restaurantOptionInfo}>
                      <Text
                        style={[
                          styles.restaurantOptionName,
                          isSelected && styles.restaurantOptionNameSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {restaurant.name}
                      </Text>
                      {restaurant.address && (
                        <Text style={styles.restaurantOptionAddress} numberOfLines={1}>
                          {restaurant.address}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <Icon name="checkmark-circle" size={24} color={C.primary} />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  countBadge: {
    backgroundColor: C.warn,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  refreshBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.muted,
  },

  listContent: {
    padding: 16,
  },

  // Summary Cards
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    minWidth: '22%',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 11,
    color: C.muted,
    marginTop: 2,
  },

  // Tabs
  tabsContainer: {
    marginBottom: 16,
  },
  tabsContent: {
    gap: 8,
  },
  tab: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: '#fff',
  },

  // List Header
  listHeader: {
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  listSubtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },

  // Item Card
  itemCard: {
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  itemHeader: {
    flexDirection: 'row',
    gap: 12,
  },
  typeIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
    flexWrap: 'wrap',
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  itemDesc: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
    marginBottom: 8,
  },
  itemMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  dateText: {
    fontSize: 11,
    color: C.muted,
  },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  viewBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.info,
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
  },

  // Help Card
  helpCard: {
    flexDirection: 'row',
    backgroundColor: C.card,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: C.border,
    gap: 12,
  },
  helpIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  helpContent: {
    flex: 1,
  },
  helpTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  helpText: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  helpLink: {
    fontSize: 13,
    fontWeight: '600',
    color: C.primary,
    marginTop: 8,
  },

  // Restaurant Selector
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
  },
  restaurantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
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
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
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
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerBody: {
    padding: 16,
  },
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
  restaurantIconSelected: {
    backgroundColor: C.primary,
  },
  restaurantOptionInfo: {
    flex: 1,
  },
  restaurantOptionName: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  restaurantOptionNameSelected: {
    color: C.primary,
  },
  restaurantOptionAddress: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
});
