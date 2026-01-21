import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
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

export default function MyRestaurantsScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState([]);

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

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Restaurants</Text>
          <View style={{ width: 40 }} />
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
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {restaurants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="restaurant-outline" size={80} color={C.muted} />
            <Text style={styles.emptyTitle}>No Restaurants Yet</Text>
            <Text style={styles.emptyText}>Add your first restaurant to get started</Text>
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add" size={20} color={C.card} />
              <Text style={styles.addButtonText}>Add Restaurant</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {restaurants.map((restaurant) => {
              const statusStyle = getStatusStyle(restaurant.status);
              return (
                <TouchableOpacity
                  key={restaurant.id}
                  style={styles.restaurantCard}
                  onPress={() => navigation.navigate('RestaurantView', { restaurantId: restaurant.id })}
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

                  <View style={styles.cardFooter}>
                    <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                      <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
                      <Text style={[styles.statusText, { color: statusStyle.text }]}>
                        {statusStyle.label}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.viewButton}
                      onPress={() => navigation.navigate('RestaurantView', { restaurantId: restaurant.id })}
                    >
                      <Text style={styles.viewButtonText}>View Details</Text>
                      <Icon name="chevron-forward" size={16} color={C.primary} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
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
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  viewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
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
