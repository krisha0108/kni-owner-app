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
              <Icon name={typeConfig.icon} size={scale(18)} color="#fff" />
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
              <Icon name={statusConfig.icon} size={scale(13)} color={statusConfig.color} />
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
              <Icon name="eye-outline" size={scale(16)} color={C.info} />
              <Text style={styles.actionButtonText}>
                {item.type === 'RESTAURANT' ? 'View Status' : item.type === 'TEAM_INVITE' ? 'View Team' : 'View Booking'}
              </Text>
              <Icon name="chevron-forward" size={scale(14)} color={C.info} />
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
        <Icon name="checkmark-done-circle" size={scale(56)} color="#22C55E" />
      </LinearGradient>
      <Text style={styles.emptyTitle}>All Caught Up!</Text>
      <Text style={styles.emptySubtitle}>No pending items to review right now</Text>
      <TouchableOpacity style={styles.emptyRefreshBtn} onPress={onRefresh}>
        <Icon name="refresh" size={scale(16)} color={C.primary} />
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
          <Icon name="help-circle" size={scale(24)} color="#3B82F6" />
        </View>
        <Text style={styles.helpTitle}>Need Help?</Text>
        <Text style={styles.helpText}>
          Approvals are typically processed within 24-48 hours. If your request has been pending longer, contact our support team.
        </Text>
        <TouchableOpacity
          style={styles.helpBtn}
          onPress={() => navigation.navigate('SupportCenter')}
        >
          <Icon name="chatbubbles" size={scale(16)} color="#fff" />
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
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Pending Approvals</Text>
          <View style={{ width: scale(40) }} />
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
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
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
          <Icon name="refresh" size={scale(20)} color="#fff" />
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
            <Icon name="restaurant" size={scale(16)} color={C.primary} />
          </View>
          <Text style={styles.restaurantName} numberOfLines={1}>
            {currentRestaurant.name}
          </Text>
          {restaurants.length > 1 && (
            <View style={styles.switchPill}>
              <Icon name="swap-horizontal" size={scale(14)} color={C.primary} />
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
              <Icon name="time" size={scale(18)} color="#D97706" />
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
              <Icon name="checkmark-circle" size={scale(18)} color="#059669" />
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
              <Icon name="close-circle" size={scale(18)} color="#DC2626" />
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
              <Icon name="documents" size={scale(18)} color="#4F46E5" />
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
                  size={scale(14)}
                  color={isActive ? '#fff' : C.muted}
                  style={{ marginRight: scale(5) }}
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
                <Icon name="close" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.pickerBody}
              contentContainerStyle={{ paddingBottom: scale(30) }}
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
                        size={scale(20)}
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
                          <Icon name="location-outline" size={scale(11)} color={C.muted} /> {restaurant.address}
                        </Text>
                      )}
                    </View>
                    {isSelected && (
                      <View style={styles.selectedCheck}>
                        <Icon name="checkmark" size={scale(16)} color="#fff" />
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
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  backBtn: {
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
  countBadge: {
    backgroundColor: '#fff',
    paddingHorizontal: scale(9),
    paddingVertical: scale(3),
    borderRadius: scale(12),
  },
  countBadgeText: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: C.primary,
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: C.muted,
  },

  // Restaurant Banner
  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: '#FFF5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#FEE2E2',
  },
  restaurantIconBox: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantName: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
  },
  switchPill: {
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
  switchText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: C.primary,
  },

  // Summary Section
  summarySection: {
    paddingHorizontal: scale(16),
    paddingTop: scale(14),
    paddingBottom: scale(6),
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: scale(8),
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(10),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: scale(4),
    elevation: 1,
  },
  summaryCardActive: {
    borderColor: C.warn,
    borderWidth: 1.5,
  },
  summaryIconCircle: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  summaryCount: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.muted,
    marginTop: scale(2),
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Tabs
  tabsWrapper: {
    paddingTop: scale(8),
    paddingBottom: scale(4),
    borderBottomWidth: 1,
    borderBottomColor: '#EEEFF2',
  },
  tabsContent: {
    paddingHorizontal: scale(16),
    gap: scale(8),
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    backgroundColor: C.card,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  tabActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  tabText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
  },
  tabTextActive: {
    color: '#fff',
  },
  tabBadge: {
    marginLeft: scale(6),
    backgroundColor: '#FEF3C7',
    paddingHorizontal: scale(6),
    paddingVertical: 1,
    borderRadius: scale(8),
  },
  tabBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  tabBadgeText: {
    fontSize: moderateScale(10),
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
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    paddingBottom: scale(6),
  },
  listTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  listCount: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    backgroundColor: '#F1F5F9',
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
    borderRadius: scale(8),
  },

  // List Content
  listContent: {
    paddingHorizontal: scale(16),
    paddingBottom: scale(30),
  },

  // Item Card
  itemCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    marginBottom: scale(12),
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  itemAccent: {
    height: scale(3),
  },
  itemBody: {
    padding: scale(14),
  },
  itemHeaderRow: {
    flexDirection: 'row',
    gap: scale(12),
    alignItems: 'flex-start',
  },
  typeIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemHeaderInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(4),
  },
  itemMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  typePill: {
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
  },
  typePillText: {
    fontSize: moderateScale(10),
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  timeAgoText: {
    fontSize: moderateScale(11),
    color: C.muted,
  },
  itemDesc: {
    fontSize: moderateScale(13),
    color: C.muted,
    lineHeight: moderateScale(19),
    marginTop: scale(10),
    paddingLeft: scale(52),
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: scale(12),
    paddingLeft: scale(52),
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(8),
  },
  statusChipText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },
  itemDateText: {
    fontSize: moderateScale(11),
    color: C.muted,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    marginTop: scale(12),
    paddingVertical: scale(10),
    backgroundColor: '#EFF6FF',
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  actionButtonText: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.info,
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(50),
  },
  emptyIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
  },
  emptySubtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginBottom: scale(20),
  },
  emptyRefreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    borderWidth: 1.5,
    borderColor: C.primary,
  },
  emptyRefreshText: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.primary,
  },

  // Help Card
  helpCard: {
    marginTop: scale(16),
    borderRadius: scale(16),
    overflow: 'hidden',
  },
  helpGradient: {
    padding: scale(20),
    alignItems: 'center',
    borderRadius: scale(16),
  },
  helpIconBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(24),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  helpTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
  },
  helpText: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(19),
    marginBottom: scale(16),
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(20),
    paddingVertical: scale(10),
    borderRadius: scale(20),
    backgroundColor: C.info,
  },
  helpBtnText: {
    fontSize: moderateScale(13),
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
    borderTopLeftRadius: scale(28),
    borderTopRightRadius: scale(28),
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
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
    paddingTop: scale(16),
    paddingBottom: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
  },
  modalSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(18),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pickerBody: {
    padding: scale(16),
  },
  restaurantOption: {
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
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FFF5F5',
  },
  restaurantOptionIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantOptionInfo: {
    flex: 1,
  },
  restaurantOptionName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  restaurantOptionNameSelected: {
    color: C.primary,
  },
  restaurantOptionAddress: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(3),
  },
  selectedCheck: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
