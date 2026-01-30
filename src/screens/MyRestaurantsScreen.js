import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
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
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'APPROVED':
      return { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-circle', label: 'Approved' };
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return { bg: '#FFFBEB', text: C.warn, icon: 'time', label: 'Pending Approval' };
    case 'REJECTED':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle', label: 'Rejected' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'help-circle', label: status };
  }
};

// Status filter config for stylish tabs
const STATUS_CONFIG = {
  all: { bg: '#F3F4F6', color: C.ink, icon: 'restaurant-outline', label: 'All' },
  APPROVED: { bg: '#ECFDF5', color: '#10B981', icon: 'checkmark-circle-outline', label: 'Approved' },
  PENDING: { bg: '#FEF3C7', color: '#D97706', icon: 'time-outline', label: 'Pending' },
  REJECTED: { bg: '#FEE2E2', color: '#EF4444', icon: 'close-circle-outline', label: 'Rejected' },
};

const STATUS_OPTIONS = ['all', 'APPROVED', 'PENDING', 'REJECTED'];

export default function MyRestaurantsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [activeStatusTab, setActiveStatusTab] = useState('all');

  // Calculate status counts
  const statusCounts = useMemo(() => {
    const counts = { all: restaurants.length, APPROVED: 0, PENDING: 0, REJECTED: 0 };
    restaurants.forEach(r => {
      const status = r.status === 'PENDING_APPROVAL' ? 'PENDING' : r.status;
      if (counts[status] !== undefined) {
        counts[status]++;
      }
    });
    return counts;
  }, [restaurants]);

  // Filter restaurants by status
  const filteredRestaurants = useMemo(() => {
    if (activeStatusTab === 'all') return restaurants;
    return restaurants.filter(r => {
      const status = r.status === 'PENDING_APPROVAL' ? 'PENDING' : r.status;
      return status === activeStatusTab;
    });
  }, [restaurants, activeStatusTab]);

  useFocusEffect(
    useCallback(() => {
      loadRestaurants();
    }, [])
  );

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owner/restaurants');

      if (response.data.ok) {
        setRestaurants(response.data.data);
      }
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurants();
  };

  const handleEdit = (restaurant) => {
    navigation.navigate('RestaurantEdit', { restaurantId: restaurant.id });
  };

  const handleDelete = (restaurant) => {
    // Only allow deletion for PENDING or REJECTED restaurants
    if (restaurant.status === 'APPROVED') {
      Alert.alert(
        'Cannot Delete',
        'Approved restaurants with active bookings cannot be deleted. Please contact support if you need assistance.',
        [{ text: 'OK' }]
      );
      return;
    }

    Alert.alert(
      'Delete Restaurant',
      `Are you sure you want to delete "${restaurant.name}"? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => confirmDelete(restaurant),
        },
      ]
    );
  };

  const confirmDelete = async (restaurant) => {
    setDeleting(restaurant.id);
    try {
      const response = await api.delete(`/owner/restaurants/${restaurant.id}`);
      if (response.data.ok) {
        Alert.alert('Success', 'Restaurant deleted successfully');
        loadRestaurants();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to delete restaurant');
      }
    } catch (error) {
      console.error('Error deleting restaurant:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to delete restaurant');
    } finally {
      setDeleting(null);
    }
  };

  const canDelete = (restaurant) => {
    return restaurant.status === 'PENDING' || restaurant.status === 'REJECTED';
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Restaurants</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading restaurants...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Restaurants</Text>
        <TouchableOpacity onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}>
          <Icon name="add-circle" size={28} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Stylish Status Filter Tabs */}
      <View style={styles.summaryContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.summaryScroll}
        >
          {STATUS_OPTIONS.map(statusKey => {
            const config = STATUS_CONFIG[statusKey];
            const count = statusCounts[statusKey] || 0;
            const isActive = activeStatusTab === statusKey;

            return (
              <TouchableOpacity
                key={statusKey}
                onPress={() => setActiveStatusTab(statusKey)}
                style={[
                  styles.summaryCard,
                  isActive && styles.summaryCardActive,
                  { borderColor: isActive ? config.color : C.border },
                ]}
                activeOpacity={0.7}
              >
                <View style={[styles.summaryIcon, { backgroundColor: config.bg }]}>
                  <Icon name={config.icon} size={18} color={config.color} />
                </View>
                <Text style={[styles.summaryCount, isActive && { color: config.color }]}>
                  {count}
                </Text>
                <Text style={[styles.summaryLabel, isActive && { color: config.color }]}>
                  {config.label}
                </Text>
                {isActive && (
                  <View style={[styles.summaryActiveBar, { backgroundColor: config.color }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredRestaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="restaurant-outline" size={80} color={C.muted} />
            <Text style={styles.emptyTitle}>
              {restaurants.length === 0 ? 'No Restaurants Yet' : 'No Results'}
            </Text>
            <Text style={styles.emptyText}>
              {restaurants.length === 0
                ? 'Add your first restaurant to get started'
                : `No ${STATUS_CONFIG[activeStatusTab]?.label || ''} restaurants found`}
            </Text>
            {restaurants.length === 0 && (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
              >
                <Icon name="add" size={20} color={C.card} />
                <Text style={styles.addButtonText}>Add Restaurant</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.listContainer}>
            {filteredRestaurants.map((restaurant) => {
              const statusStyle = getStatusStyle(restaurant.status);
              const isDeleting = deleting === restaurant.id;

              return (
                <View key={restaurant.id} style={styles.restaurantCard}>
                  <TouchableOpacity
                    onPress={() => navigation.navigate('RestaurantView', { restaurantId: restaurant.id })}
                    disabled={isDeleting}
                  >
                    <View style={styles.cardHeader}>
                      <View style={styles.iconBox}>
                        <Icon name="restaurant" size={24} color={C.primary} />
                      </View>
                      <View style={styles.cardInfo}>
                        <Text style={styles.restaurantName}>{restaurant.name}</Text>
                        {restaurant.address && (
                          <View style={styles.addressRow}>
                            <Icon name="location-outline" size={14} color={C.muted} />
                            <Text style={styles.restaurantAddress} numberOfLines={1}>
                              {restaurant.address}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>

                    <View style={styles.detailsRow}>
                      {restaurant.phone && (
                        <View style={styles.detailItem}>
                          <Icon name="call-outline" size={16} color={C.muted} />
                          <Text style={styles.detailText}>{restaurant.phone}</Text>
                        </View>
                      )}
                      {restaurant.email && (
                        <View style={styles.detailItem}>
                          <Icon name="mail-outline" size={16} color={C.muted} />
                          <Text style={styles.detailText} numberOfLines={1}>
                            {restaurant.email}
                          </Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.statusRow}>
                      <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                        <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                          {statusStyle.label}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>

                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => navigation.navigate('RestaurantView', { restaurantId: restaurant.id })}
                      disabled={isDeleting}
                    >
                      <Icon name="eye-outline" size={18} color={C.info} />
                      <Text style={[styles.actionBtnText, { color: C.info }]}>View</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleEdit(restaurant)}
                      disabled={isDeleting}
                    >
                      <Icon name="create-outline" size={18} color={C.primary} />
                      <Text style={[styles.actionBtnText, { color: C.primary }]}>Edit</Text>
                    </TouchableOpacity>

                    {canDelete(restaurant) && (
                      <TouchableOpacity
                        style={styles.actionBtn}
                        onPress={() => handleDelete(restaurant)}
                        disabled={isDeleting}
                      >
                        {isDeleting ? (
                          <ActivityIndicator size="small" color={C.danger} />
                        ) : (
                          <>
                            <Icon name="trash-outline" size={18} color={C.danger} />
                            <Text style={[styles.actionBtnText, { color: C.danger }]}>Delete</Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={styles.addAnotherButton}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add-circle-outline" size={24} color={C.primary} />
              <Text style={styles.addAnotherText}>Add Another Restaurant</Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <KniBottomNav navigation={navigation} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
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
  menuBtn: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  // Stylish summary cards
  summaryContainer: {
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  summaryScroll: {
    paddingHorizontal: 16,
    gap: 10,
  },
  summaryCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 12,
    minWidth: 85,
    borderWidth: 2,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  summaryCardActive: {
    backgroundColor: '#FAFAFA',
    shadowOpacity: 0.1,
    elevation: 5,
  },
  summaryIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  summaryCount: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
  },
  summaryActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: C.muted,
    marginTop: 12,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginTop: 16,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginTop: 8,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 24,
  },
  addButtonText: {
    color: C.card,
    fontSize: 15,
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  restaurantCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  restaurantAddress: {
    fontSize: 13,
    color: C.muted,
    flex: 1,
  },
  detailsRow: {
    gap: 8,
    marginBottom: 12,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 13,
    color: C.text,
    flex: 1,
  },
  statusRow: {
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: 12,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.bg,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  addAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.card,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    marginTop: 8,
  },
  addAnotherText: {
    fontSize: 15,
    fontWeight: '600',
    color: C.primary,
  },
});
