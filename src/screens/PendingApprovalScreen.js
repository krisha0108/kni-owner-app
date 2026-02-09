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
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

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

const TYPE_CONFIG = {
  RESTAURANT: {
    icon: 'business',
    label: 'Restaurant',
    gradient: ['#3B82F6', '#1D4ED8'],
    bg: '#EFF6FF',
    color: '#2563EB',
    lightBg: '#DBEAFE',
  },
  TEAM_INVITE: {
    icon: 'people',
    label: 'Team Invite',
    gradient: ['#8B5CF6', '#6D28D9'],
    bg: '#F5F3FF',
    color: '#7C3AED',
    lightBg: '#EDE9FE',
  },
  BOOKING: {
    icon: 'calendar',
    label: 'Booking',
    gradient: ['#10B981', '#059669'],
    bg: '#ECFDF5',
    color: '#059669',
    lightBg: '#D1FAE5',
  },
  CATEGORY_REQUEST: {
    icon: 'folder-open',
    label: 'Category',
    gradient: ['#F97316', '#EA580C'],
    bg: '#FFF7ED',
    color: '#EA580C',
    lightBg: '#FFEDD5',
  },
};

const STATUS_CONFIG = {
  PENDING: {
    icon: 'time',
    label: 'Pending',
    bg: '#FEF3C7',
    color: '#D97706',
    gradient: ['#FBBF24', '#F59E0B'],
  },
  APPROVED: {
    icon: 'checkmark-circle',
    label: 'Approved',
    bg: '#D1FAE5',
    color: '#059669',
    gradient: ['#34D399', '#10B981'],
  },
  REJECTED: {
    icon: 'close-circle',
    label: 'Rejected',
    bg: '#FEE2E2',
    color: '#DC2626',
    gradient: ['#F87171', '#EF4444'],
  },
};

const TABS = [
  { key: 'all', label: 'All', icon: 'apps' },
  { key: 'pending', label: 'Pending', icon: 'time' },
  { key: 'RESTAURANT', label: 'Restaurants', icon: 'business' },
  { key: 'TEAM_INVITE', label: 'Team', icon: 'people' },
  { key: 'BOOKING', label: 'Bookings', icon: 'calendar' },
];

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const formatTimeAgo = (dateString) => {
  if (!dateString) return '';
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return formatDate(dateString);
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

      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const allRestaurants = restaurantsRes.data.data;
        setRestaurants(allRestaurants);

        let targetRestaurant = null;
        if (restaurantId) {
          targetRestaurant = allRestaurants.find(r => r.id === restaurantId);
        }
        if (!targetRestaurant && allRestaurants.length > 0) {
          targetRestaurant = allRestaurants[0];
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
        {/* Top accent line */}
        <LinearGradient
          colors={typeConfig.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.itemAccent}
        />

        <View style={styles.itemBody}>
          {/* Header row */}
          <View style={styles.itemHeaderRow}>
            <LinearGradient
              colors={typeConfig.gradient}
              style={styles.typeIconBox}
            >
              <Icon name={typeConfig.icon} size={18} color="#fff" />
            </LinearGradient>

            <View style={styles.itemHeaderInfo}>
              <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
              <View style={styles.itemMetaRow}>
                <View style={[styles.typePill, { backgroundColor: typeConfig.lightBg }]}>
                  <Text style={[styles.typePillText, { color: typeConfig.color }]}>
                    {typeConfig.label}
                  </Text>
                </View>
                <Text style={styles.timeAgoText}>{formatTimeAgo(item.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* Description */}
          {item.description && (
            <Text style={styles.itemDesc} numberOfLines={2}>{item.description}</Text>
          )}

          {/* Footer */}
          <View style={styles.itemFooter}>
            <View style={[styles.statusChip, { backgroundColor: statusConfig.bg }]}>
              <Icon name={statusConfig.icon} size={13} color={statusConfig.color} />
              <Text style={[styles.statusChipText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
            <Text style={styles.itemDateText}>{formatDate(item.createdAt)}</Text>
          </View>

          {/* Action Button */}
          {item.status === 'PENDING' && (item.type === 'RESTAURANT' || item.type === 'TEAM_INVITE' || item.type === 'BOOKING') && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewAction(item)}
              activeOpacity={0.7}
            >
              <Icon name="eye-outline" size={16} color={C.info} />
              <Text style={styles.actionButtonText}>
                {item.type === 'RESTAURANT' ? 'View Status' : item.type === 'TEAM_INVITE' ? 'View Team' : 'View Booking'}
              </Text>
              <Icon name="chevron-forward" size={14} color={C.info} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderEmpty = () => (
    <View style={styles.emptyBox}>
      <LinearGradient
        colors={['#F0FDF4', '#DCFCE7']}
        style={styles.emptyIconCircle}
      >
        <Icon name="checkmark-done-circle" size={56} color="#22C55E" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptySubtitle}>No pending items to review right now</Text>
      <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
        <Icon name="refresh" size={16} color={C.primary} />
        <Text style={styles.emptyRefreshText}>Refresh</Text>
      </TouchableOpacity>
    </View>
  );

  const renderFooter = () => (
    <View style={styles.helpCard}>
      <LinearGradient
        colors={['#EFF6FF', '#DBEAFE']}
        style={styles.helpGradient}
      >
        <View style={styles.helpIconBox}>
          <Icon name="help-circle" size={24} color="#3B82F6" />
        </View>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          Approvals are typically processed within 24-48 hours. If your request has been pending longer, contact our support team.
        </Text>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('SupportCenter')}
        >
          <Icon name="chatbubbles" size={16} color="#fff" />
          <Text style={styles.helpBtnText}>Contact Support</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading approvals...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          {pendingCount > 0 && (
            <View style={styles.countBadge}>
              <Text style={styles.countBadgeText}>{pendingCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={onRefresh} style={styles.backBtn}>
          <Icon name="refresh" size={20} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* Restaurant Selector - Fixed */}
      {currentRestaurant && (
        <TouchableOpacity
          style={styles.restaurantBanner}
          onPress={() => restaurants.length > 1 && setRestaurantPickerVisible(true)}
          activeOpacity={restaurants.length > 1 ? 0.7 : 1}
        >
          <View style={styles.restaurantIconBox}>
            <Icon name="restaurant" size={16} color={C.primary} />
          </View>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {currentRestaurant.name}
          </Text>
          {restaurants.length > 1 && (
            <View style={styles.switchPill}>
              <Icon name="swap-horizontal" size={14} color={C.primary} />
              <Text style={styles.switchText}>Switch</Text>
            </View>
          )}
        </TouchableOpacity>
      )}

      {/* Summary Stats - Fixed */}
      <View style={styles.summarySection}>
        <View style={styles.summaryGrid}>
          <TouchableOpacity
            style={[styles.summaryCard, activeTab === 'pending' && styles.summaryCardActive]}
            onPress={() => setActiveTab('pending')}
          >
            <LinearGradient
              colors={['#FEF3C7', '#FDE68A']}
              style={styles.summaryIconCircle}
            >
              <Icon name="time" size={18} color="#D97706" />
            </LinearGradient>
            <Text style={styles.summaryCount}>{pendingCount}</Text>
            <Text style={styles.summaryLabel}>Pending</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard]}
            onPress={() => setActiveTab('all')}
          >
            <LinearGradient
              colors={['#D1FAE5', '#A7F3D0']}
              style={styles.summaryIconCircle}
            >
              <Icon name="checkmark-circle" size={18} color="#059669" />
            </LinearGradient>
            <Text style={styles.summaryCount}>{approvedCount}</Text>
            <Text style={styles.summaryLabel}>Approved</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard]}
            onPress={() => setActiveTab('all')}
          >
            <LinearGradient
              colors={['#FEE2E2', '#FECACA']}
              style={styles.summaryIconCircle}
            >
              <Icon name="close-circle" size={18} color="#DC2626" />
            </LinearGradient>
            <Text style={styles.summaryCount}>{rejectedCount}</Text>
            <Text style={styles.summaryLabel}>Rejected</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.summaryCard]}
            onPress={() => setActiveTab('all')}
          >
            <LinearGradient
              colors={['#E0E7FF', '#C7D2FE']}
              style={styles.summaryIconCircle}
            >
              <Icon name="documents" size={18} color="#4F46E5" />
            </LinearGradient>
            <Text style={styles.summaryCount}>{items.length}</Text>
            <Text style={styles.summaryLabel}>Total</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs - Fixed */}
      <View style={styles.tabsWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabsContent}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, isActive && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <Icon
                  name={tab.icon}
                  size={14}
                  color={isActive ? '#fff' : C.muted}
                  style={{ marginRight: 5 }}
                />
                <Text style={[styles.tabText, isActive && styles.tabTextActive]}>
                  {tab.label}
                </Text>
                {tab.key === 'pending' && pendingCount > 0 && (
                  <View style={[styles.tabBadge, isActive && styles.tabBadgeActive]}>
                    <Text style={[styles.tabBadgeText, isActive && styles.tabBadgeTextActive]}>
                      {pendingCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List Title */}
      <View style={styles.listTitleRow}>
        <Text style={styles.listTitle}>
          {activeTab === 'all' ? 'All Items' : activeTab === 'pending' ? 'Pending Items' : `${TABS.find(t => t.key === activeTab)?.label || 'Items'}`}
        </Text>
        <Text style={styles.listCount}>{filteredItems.length} items</Text>
      </View>

      {/* Scrollable List Only */}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderItem}
        ListEmptyComponent={renderEmpty}
        ListFooterComponent={filteredItems.length > 0 ? renderFooter : null}
        contentContainerStyle={styles.listContent}
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
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
          <View style={styles.pickerSheet}>
            {/* Modal Header */}
            <View style={styles.modalDragBar} />
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Select Restaurant</Text>
                <Text style={styles.modalSubtitle}>{restaurants.length} restaurants available</Text>
              </View>
              <TouchableOpacity
                onPress={() => setRestaurantPickerVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Icon name="close" size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pickerBody}
              contentContainerStyle={{ paddingBottom: 30 }}
              showsVerticalScrollIndicator={false}
            >
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
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={isSelected ? [C.primary, C.primaryDark] : ['#FEE2E2', '#FEE2E2']}
                      style={styles.restaurantOptionIcon}
                    >
                      <Icon
                        name="restaurant"
                        size={20}
                        color={isSelected ? '#fff' : C.primary}
                      />
                    </LinearGradient>
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
                          <Icon name="location-outline" size={11} color={C.muted} /> {restaurant.address}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Icon name="checkmark" size={16} color="#fff" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.2)',
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
    fontWeight: '800',
    color: '#fff',
  },
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: C.primary,
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

  // Restaurant Banner
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restaurantIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  switchPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  switchText: {
    fontSize: 12,
    fontWeight: '700',
    color: C.primary,
  },

  // Summary Section
  summarySection: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 6,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  summaryCardActive: {
    borderColor: C.warn,
    borderWidth: 1.5,
  },
  summaryIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Tabs
  tabsWrapper: {
    paddingTop: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  tabsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1.5,
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
  tabBadge: {
    marginLeft: 6,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  tabBadgeTextActive: {
    color: '#fff',
  },

  // List Title
  listTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 6,
  },
  listTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  listCount: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  // List Content
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },

  // Item Card
  itemCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    marginBottom: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  itemAccent: {
    height: 3,
  },
  itemBody: {
    padding: 14,
  },
  itemHeaderRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  typeIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 4,
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeAgoText: {
    fontSize: 11,
    color: C.muted,
  },
  itemDesc: {
    fontSize: 13,
    color: C.muted,
    lineHeight: 19,
    marginTop: 10,
    paddingLeft: 52,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingLeft: 52,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  itemDateText: {
    fontSize: 11,
    color: C.muted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.info,
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 20,
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  emptyRefreshText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },

  // Help Card
  helpCard: {
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
  },
  helpGradient: {
    padding: 20,
    alignItems: 'center',
    borderRadius: 16,
  },
  helpIconBox: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  helpTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: C.ink,
    marginBottom: 6,
  },
  helpText: {
    fontSize: 13,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 16,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: C.info,
  },
  helpBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerSheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '70%',
  },
  modalDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginTop: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
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
    borderRadius: 14,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: '#FAFBFC',
  },
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  restaurantOptionIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
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
    marginTop: 3,
  },
  selectedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
