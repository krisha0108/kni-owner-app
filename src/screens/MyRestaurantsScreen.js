/**
 * ============================================================================
 * MY RESTAURANTS SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
  ActivityIndicator, Alert, Image, StatusBar, useWindowDimensions, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

// Premium Color Palette (Consistent with other screens)
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
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  danger: '#EF4444',
  dangerLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',
  shadow: '#64748B',
};

const statusFilters = [
  { key: 'all', label: 'All', icon: 'restaurant', color: C.ink },
  { key: 'APPROVED', label: 'Approved', icon: 'checkmark-circle', color: C.success },
  { key: 'PENDING', label: 'Pending', icon: 'time', color: C.warning },
  { key: 'REJECTED', label: 'Rejected', icon: 'close-circle', color: C.danger },
];

const getStatusStyle = (status) => {
  switch (status) {
    case 'APPROVED':
      return { bg: C.successLight, text: C.success, icon: 'checkmark-circle', label: 'Approved' };
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return { bg: C.warningLight, text: C.warning, icon: 'time', label: 'Pending' };
    case 'REJECTED':
      return { bg: C.dangerLight, text: C.danger, icon: 'close-circle', label: 'Rejected' };
    default:
      return { bg: '#F1F5F9', text: C.muted, icon: 'help-circle', label: status };
  }
};

export default function MyRestaurantsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const gridColumns = isTablet ? 2 : 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: restaurants.length, APPROVED: 0, PENDING: 0, REJECTED: 0 };
    restaurants.forEach(r => {
      const status = r.status === 'PENDING_APPROVAL' ? 'PENDING' : r.status;
      if (counts[status] !== undefined) counts[status]++;
    });
    return counts;
  }, [restaurants]);

  // Filter restaurants
  const filtered = useMemo(() => {
    if (statusFilter === 'all') return restaurants;
    return restaurants.filter(r => {
      const status = r.status === 'PENDING_APPROVAL' ? 'PENDING' : r.status;
      return status === statusFilter;
    });
  }, [restaurants, statusFilter]);

  useFocusEffect(useCallback(() => { loadRestaurants(); }, []));

  const loadRestaurants = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owner/restaurants');
      if (response.data.ok) setRestaurants(response.data.data);
    } catch (error) {
      console.error('Error loading restaurants:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => { setRefreshing(true); loadRestaurants(); };

  const handleEdit = (restaurant) => {
    navigation.navigate('RestaurantEdit', { restaurantId: restaurant.id });
  };

  const handleDelete = (restaurant) => {
    if (restaurant.status === 'APPROVED') {
      Alert.alert('Cannot Delete', 'Approved restaurants cannot be deleted. Contact support for assistance.', [{ text: 'OK' }]);
      return;
    }
    Alert.alert('Delete Restaurant', `Are you sure you want to delete "${restaurant.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(restaurant) },
    ]);
  };

  const confirmDelete = async (restaurant) => {
    setDeleting(restaurant.id);
    try {
      const response = await api.delete(`/owner/restaurants/${restaurant.id}`);
      if (response.data.ok) {
        Alert.alert('Success', 'Restaurant deleted successfully');
        loadRestaurants();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to delete');
      }
    } catch (error) {
      Alert.alert('Error', error?.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  const canDelete = (restaurant) => restaurant.status === 'PENDING' || restaurant.status === 'REJECTED' || restaurant.status === 'PENDING_APPROVAL';

  // ==================== RENDER RESTAURANT CARD ====================
  const renderRestaurantCard = ({ item, index }) => {
    const statusStyle = getStatusStyle(item.status);
    const isDeleting = deleting === item.id;

    return (
      <TouchableOpacity
        style={[st.card, isTablet && { marginHorizontal: 6 }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RestaurantView', { restaurantId: item.id })}
        disabled={isDeleting}
      >
        {/* Card Image */}
        <View style={st.cardImageContainer}>
          {item.restaurantImageUrl ? (
            <Image source={{ uri: getImageUrl(item.restaurantImageUrl) }} style={st.cardImage} />
          ) : (
            <View style={st.cardImagePlaceholder}>
              <Icon name="restaurant-outline" size={40} color={C.muted} />
            </View>
          )}
          {/* Status Badge */}
          <View style={[st.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={12} color={statusStyle.text} />
            <Text style={[st.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Card Info */}
        <View style={st.cardInfo}>
          <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>

          {item.address && (
            <View style={st.infoRow}>
              <Icon name="location" size={14} color={C.primary} />
              <Text style={st.infoText} numberOfLines={1}>{item.address}</Text>
            </View>
          )}

          {item.city && (
            <View style={st.infoRow}>
              <Icon name="business" size={14} color={C.muted} />
              <Text style={st.infoTextMuted}>{item.city}{item.pincode ? ` - ${item.pincode}` : ''}</Text>
            </View>
          )}

          {item.fssaiNumber && (
            <View style={st.fssaiBadge}>
              <Icon name="shield-checkmark" size={12} color={C.success} />
              <Text style={st.fssaiText}>FSSAI Verified</Text>
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={st.viewBtn}
            onPress={() => navigation.navigate('RestaurantView', { restaurantId: item.id })}
            disabled={isDeleting}
          >
            <Icon name="eye" size={16} color="#fff" />
            <Text style={st.viewBtnText}>View</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={st.iconBtn}
            onPress={() => handleEdit(item)}
            disabled={isDeleting}
          >
            <Icon name="pencil" size={18} color={C.info} />
          </TouchableOpacity>

          {canDelete(item) && (
            <TouchableOpacity
              style={[st.iconBtn, { backgroundColor: C.dangerLight }]}
              onPress={() => handleDelete(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <Icon name="trash" size={18} color={C.danger} />
              )}
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== HEADER COMPONENT ====================
  const renderHeader = () => (
    <>
      {/* Status Filter Chips */}
      <View style={st.filterSection}>
        <FlatList
          horizontal
          data={statusFilters}
          keyExtractor={(item) => item.key}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScroll}
          renderItem={({ item: filter }) => {
            const isActive = statusFilter === filter.key;
            const count = statusCounts[filter.key] || 0;
            return (
              <TouchableOpacity
                style={[st.filterChip, isActive && st.filterChipActive]}
                onPress={() => setStatusFilter(filter.key)}
              >
                <Icon name={filter.icon} size={16} color={isActive ? '#fff' : filter.color} />
                <Text style={[st.filterChipText, isActive && st.filterChipTextActive]}>
                  {filter.label} ({count})
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>

      {/* Results Header */}
      <View style={st.resultsHeader}>
        <Text style={st.resultsTitle}>{filtered.length} Restaurant{filtered.length !== 1 ? 's' : ''}</Text>
        {statusFilter !== 'all' && (
          <TouchableOpacity style={st.clearFilterBtn} onPress={() => setStatusFilter('all')}>
            <Icon name="close-circle" size={14} color={C.primary} />
            <Text style={st.clearFilterText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>
    </>
  );

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.loadingHero}>
          <Text style={st.heroTitle}>My Restaurants</Text>
        </LinearGradient>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading restaurants...</Text>
        </View>
        <KniBottomNav navigation={navigation} />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Premium Gradient Header */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroSection}
      >
        <View style={st.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>My Restaurants</Text>
            <Text style={st.heroSubtitle}>{restaurants.length} registered</Text>
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity
              style={st.heroIconBtn}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add" size={22} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={st.heroIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={22} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      {/* Restaurant List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderRestaurantCard}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={gridColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={st.emptyIconContainer}>
              <Icon name="restaurant-outline" size={64} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>{restaurants.length === 0 ? 'No Restaurants Yet' : 'No Results'}</Text>
            <Text style={st.emptySubtitle}>
              {restaurants.length === 0 ? 'Add your first restaurant to get started' : 'Try a different filter'}
            </Text>
            {restaurants.length === 0 && (
              <TouchableOpacity
                style={st.emptyBtn}
                onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
              >
                <Icon name="add" size={18} color="#fff" />
                <Text style={st.emptyBtnText}>Add Restaurant</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          restaurants.length > 0 ? (
            <TouchableOpacity
              style={st.addMoreBtn}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add-circle-outline" size={24} color={C.primary} />
              <Text style={st.addMoreText}>Add Another Restaurant</Text>
            </TouchableOpacity>
          ) : null
        }
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero Section (Compact)
  heroSection: { paddingTop: 8, paddingBottom: 16, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
  heroActions: { flexDirection: 'row', gap: 8 },
  heroIconBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Filters
  filterSection: { paddingVertical: 12, backgroundColor: C.card, borderBottomWidth: 1, borderBottomColor: C.border },
  filterScroll: { paddingHorizontal: 16 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, marginRight: 8, backgroundColor: C.card, borderRadius: 20, borderWidth: 1.5, borderColor: C.border },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterChipTextActive: { color: '#fff' },

  // Results Header
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  resultsTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  clearFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.primaryLight, borderRadius: 8 },
  clearFilterText: { fontSize: 12, fontWeight: '600', color: C.primary },

  // List
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: 16, marginBottom: 12, shadowColor: C.shadow, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 8, elevation: 3, overflow: 'hidden' },
  cardImageContainer: { height: 120, backgroundColor: C.bg, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusBadgeText: { fontSize: 11, fontWeight: '700' },
  cardInfo: { padding: 14 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 8 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  infoText: { fontSize: 13, color: C.text, flex: 1 },
  infoTextMuted: { fontSize: 12, color: C.muted },
  fssaiBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8, paddingHorizontal: 10, paddingVertical: 5, backgroundColor: C.successLight, borderRadius: 8, alignSelf: 'flex-start' },
  fssaiText: { fontSize: 11, fontWeight: '600', color: C.success },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, paddingTop: 0 },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, backgroundColor: C.primary, borderRadius: 10 },
  viewBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center' },

  // Loading & Empty
  loadingHero: { paddingVertical: 24, paddingHorizontal: 20, borderBottomLeftRadius: 20, borderBottomRightRadius: 20 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 15, color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 40 },
  emptyIconContainer: { width: 120, height: 120, borderRadius: 60, backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 24, paddingHorizontal: 24, paddingVertical: 14, backgroundColor: C.primary, borderRadius: 14 },
  emptyBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Add More Button
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, marginTop: 8, marginBottom: 20, paddingVertical: 16, backgroundColor: C.card, borderRadius: 14, borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed' },
  addMoreText: { fontSize: 15, fontWeight: '700', color: C.primary },
});
