/**
 * ============================================================================
 * MY RESTAURANTS SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView, TouchableOpacity, RefreshControl,
  ActivityIndicator, Image, StatusBar, useWindowDimensions, Platform, Modal, TextInput, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { useRestaurant } from '../context/RestaurantContext';
import restaurantService from '../services/restaurantService';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { isStale, markFetched } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';
import useKeyboardHeight from '../utils/useKeyboardHeight';
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

const getStatusStyle = (item) => {
  if (item.pendingDeletionRequest) {
    return { bg: C.dangerLight, text: C.danger, icon: 'trash', label: 'Deletion Requested' };
  }
  switch (item.status) {
    case 'APPROVED':
      return { bg: C.successLight, text: C.success, icon: 'checkmark-circle', label: 'Approved' };
    case 'PENDING':
    case 'PENDING_APPROVAL':
      return { bg: C.warningLight, text: C.warning, icon: 'time', label: 'Pending' };
    case 'REJECTED':
      return { bg: C.dangerLight, text: C.danger, icon: 'close-circle', label: 'Rejected' };
    default:
      return { bg: '#F1F5F9', text: C.muted, icon: 'help-circle', label: item.status };
  }
};

function SkeletonMyRestaurants({ pulse }) {
  return (
    <View style={st.listContent}>
      <View style={[st.filterRow, st.skelFilterRow]}>
        {[1, 2, 3, 4].map(i => (
          <Animated.View key={i} style={[st.skelChip, { opacity: pulse }]} />
        ))}
      </View>
      {[1, 2, 3].map(i => (
        <View key={i} style={st.card}>
          <Animated.View style={[st.cardImageContainer, st.skelFill, { opacity: pulse }]} />
          <View style={st.cardInfo}>
            <View style={st.infoCol}>
              <Animated.View style={[st.skelLine, { opacity: pulse }]} />
            </View>
            <View style={[st.infoCol, st.infoColDivider]}>
              <Animated.View style={[st.skelLine, { opacity: pulse }]} />
            </View>
            <View style={[st.infoCol, st.infoColDivider]}>
              <Animated.View style={[st.skelLine, { opacity: pulse }]} />
            </View>
          </View>
          <View style={st.cardActions}>
            <Animated.View style={[st.skelActionBar, { opacity: pulse }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

export default function MyRestaurantsScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const keyboardHeight = useKeyboardHeight();
  const { can } = usePermissions();
  const { loadRestaurants: refreshContextRestaurants } = useRestaurant();
  const gridColumns = isTablet ? 2 : 1;

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [menuVisible, setMenuVisible] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletionRequestTarget, setDeletionRequestTarget] = useState(null);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingDeletionRequest, setSubmittingDeletionRequest] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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

  useFocusEffect(useCallback(() => {
    if (isStale('MyRestaurants-list') || restaurants.length === 0) { loadRestaurants(); markFetched('MyRestaurants-list'); }
  }, [restaurants.length]));

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

  const onRefresh = () => { setRefreshing(true); loadRestaurants(); markFetched('MyRestaurants-list'); };

  const handleEdit = (restaurant) => {
    navigation.navigate('RestaurantEdit', { restaurantId: restaurant.id });
  };

  const handleDelete = (restaurant) => {
    if (restaurant.status === 'APPROVED') {
      if (restaurant.pendingDeletionRequest) {
        AppAlert.alert('Deletion Requested', 'A deletion request for this restaurant is already pending admin review.', [{ text: 'OK' }]);
        return;
      }
      setDeletionReason('');
      setDeletionRequestTarget(restaurant);
      return;
    }
    AppAlert.alert('Delete Restaurant', `Are you sure you want to delete "${restaurant.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => confirmDelete(restaurant) },
    ]);
  };

  const submitDeletionRequest = async () => {
    if (!deletionRequestTarget || deletionReason.trim().length < 10) return;
    setSubmittingDeletionRequest(true);
    try {
      await restaurantService.requestDeletion(deletionRequestTarget.id, deletionReason.trim());
      setDeletionRequestTarget(null);
      setDeletionReason('');
      AppAlert.alert('Request Submitted', 'An admin will review your deletion request.');
      loadRestaurants();
      refreshContextRestaurants({ force: true });
    } catch (error) {
      AppAlert.alert('Error', error.message || 'Failed to submit deletion request');
    } finally {
      setSubmittingDeletionRequest(false);
    }
  };

  const confirmDelete = async (restaurant) => {
    setDeleting(restaurant.id);
    try {
      const response = await api.delete(`/owner/restaurants/${restaurant.id}`);
      if (response.data.ok) {
        AppAlert.alert('Success', 'Restaurant deleted successfully');
        loadRestaurants();
        // Keep the RestaurantContext (Home screen / restaurant selector) in
        // sync too — it has its own separate cache from this screen's.
        refreshContextRestaurants({ force: true });
      } else {
        AppAlert.alert('Error', response.data.error || 'Failed to delete');
      }
    } catch (error) {
      AppAlert.alert('Error', error?.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(null);
    }
  };

  // Instant self-delete (no real data yet)
  const canDelete = (restaurant) => restaurant.status === 'PENDING' || restaurant.status === 'REJECTED' || restaurant.status === 'PENDING_APPROVAL';
  // Approved restaurants can only be removed via an admin-approved deletion request
  const canRequestDeletion = (restaurant) => restaurant.status === 'APPROVED' && !restaurant.pendingDeletionRequest;

  // ==================== RENDER RESTAURANT CARD ====================
  const renderRestaurantCard = ({ item, index }) => {
    const statusStyle = getStatusStyle(item);
    const isDeleting = deleting === item.id;
    const hasImage = !!item.restaurantImageUrl;
    const locationLine = [item.address, item.city].filter(Boolean).join(' · ');

    return (
      <TouchableOpacity
        style={[st.card, isTablet && { marginHorizontal: scale(6) }]}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('RestaurantView', { restaurantId: item.id })}
        disabled={isDeleting}
      >
        {/* Photo */}
        <View style={st.cardImageContainer}>
          {hasImage ? (
            <Image source={{ uri: getImageUrl(item.restaurantImageUrl) }} style={st.cardImage} />
          ) : (
            <LinearGradient colors={['#F1F5F9', '#E2E8F0']} style={st.cardImagePlaceholder}>
              <Icon name="restaurant-outline" size={scale(30)} color={C.muted} />
            </LinearGradient>
          )}
          <View style={[st.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={scale(10)} color={statusStyle.text} />
            <Text style={[st.statusBadgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
          </View>
        </View>

        {/* Info — split into 3 columns to keep the card short */}
        <View style={st.cardInfo}>
          <View style={st.infoCol}>
            <Text style={st.infoColLabel}>NAME</Text>
            <View style={st.infoRow}>
              <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
              {!!item.fssaiNumber && <Icon name="shield-checkmark" size={scale(11)} color={C.success} />}
            </View>
          </View>

          <View style={[st.infoCol, st.infoColDivider]}>
            <Text style={st.infoColLabel}>LOCATION</Text>
            <Text style={st.infoText} numberOfLines={1}>{locationLine || '—'}</Text>
          </View>

          <View style={[st.infoCol, st.infoColDivider]}>
            <Text style={st.infoColLabel}>TYPE</Text>
            <Text style={st.infoText} numberOfLines={1}>
              {item.outletType ? item.outletType.replace(/_/g, ' ') : '—'}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={st.viewBtn}
            onPress={() => navigation.navigate('RestaurantView', { restaurantId: item.id })}
            disabled={isDeleting}
          >
            <Icon name="eye-outline" size={scale(14)} color="#fff" />
            <Text style={st.viewBtnText}>View Details</Text>
          </TouchableOpacity>

          {can('restaurant:update') && (
            <TouchableOpacity style={st.iconBtn} onPress={() => handleEdit(item)} disabled={isDeleting}>
              <Icon name="pencil" size={scale(15)} color={C.info} />
            </TouchableOpacity>
          )}

          {can('restaurant:delete') && (canDelete(item) || canRequestDeletion(item)) && (
            <TouchableOpacity
              style={[st.iconBtn, { backgroundColor: C.dangerLight }]}
              onPress={() => handleDelete(item)}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={C.danger} />
              ) : (
                <Icon name="trash-outline" size={scale(15)} color={C.danger} />
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
      {/* Clear-filter action (only shown when a filter is active) */}
      {statusFilter !== 'all' && (
        <View style={st.resultsHeader}>
          <TouchableOpacity style={st.clearFilterBtn} onPress={() => setStatusFilter('all')}>
            <Icon name="close-circle" size={scale(14)} color={C.primary} />
            <Text style={st.clearFilterText}>Clear Filter</Text>
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // ==================== LOADING STATE ====================
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['left', 'right']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient
          colors={[C.gradient1, C.gradient2]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[st.heroSection, { paddingTop: insets.top + scale(6) }]}
        >
          <View style={st.heroBlobA} pointerEvents="none" />
          <View style={st.heroBlobB} pointerEvents="none" />
          <View style={st.heroContent}>
            <TouchableOpacity
              onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
              style={st.backBtnPlain}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="chevron-back" size={scale(18)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={[st.heroIconBtn, { marginRight: scale(10) }]} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(18)} color="#fff" />
            </TouchableOpacity>
            <View style={st.heroTextContainer}>
              <Text style={st.heroTitle}>My Restaurants</Text>
              <Text style={st.heroSubtitle}>Loading...</Text>
            </View>
          </View>
        </LinearGradient>
        <SkeletonMyRestaurants pulse={pulse} />
        <KniBottomNav navigation={navigation} active="home" />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Premium Gradient Header */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[st.heroSection, { paddingTop: insets.top + scale(6) }]}
      >
        {/* Decorative blobs — matches Home page header */}
        <View style={st.heroBlobA} pointerEvents="none" />
        <View style={st.heroBlobB} pointerEvents="none" />

        <View style={st.heroContent}>
          <TouchableOpacity
            onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
            style={st.backBtnPlain}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="chevron-back" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[st.heroIconBtn, { marginRight: scale(10) }]} onPress={() => setMenuVisible(true)}>
            <Icon name="menu" size={scale(18)} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>My Restaurants</Text>
            <Text style={st.heroSubtitle}>{restaurants.length} registered</Text>
          </View>
          <View style={st.heroActions}>
            {can('restaurant:update') && (
            <TouchableOpacity
              style={st.heroIconBtn}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add" size={scale(18)} color="#fff" />
            </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Status Filter — static below the header, doesn't scroll with the list */}
      <View style={st.filterRow}>
        {statusFilters.map((filter) => {
          const isActive = statusFilter === filter.key;
          const count = statusCounts[filter.key] || 0;
          return (
            <TouchableOpacity
              key={filter.key}
              style={[st.filterChip, isActive && st.filterChipActive]}
              onPress={() => setStatusFilter(filter.key)}
            >
              <Text style={[st.filterChipText, isActive && st.filterChipTextActive]} numberOfLines={1}>
                {filter.label} ({count})
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

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
              <Icon name="restaurant-outline" size={scale(64)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>{restaurants.length === 0 ? 'No Restaurants Yet' : 'No Results'}</Text>
            <Text style={st.emptySubtitle}>
              {restaurants.length === 0 ? 'Add your first restaurant to get started' : 'Try a different filter'}
            </Text>
            {restaurants.length === 0 && can('restaurant:update') && (
              <TouchableOpacity
                style={st.emptyBtn}
                onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
              >
                <Icon name="add" size={scale(18)} color="#fff" />
                <Text style={st.emptyBtnText}>Add Restaurant</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        ListFooterComponent={
          restaurants.length > 0 && can('restaurant:update') ? (
            <TouchableOpacity
              style={st.addMoreBtn}
              onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}
            >
              <Icon name="add-circle-outline" size={scale(24)} color={C.primary} />
              <Text style={st.addMoreText}>Add Another Restaurant</Text>
            </TouchableOpacity>
          ) : null
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="home" />

      {/* Request Deletion Modal - approved restaurants require admin approval */}
      <Modal
        visible={!!deletionRequestTarget}
        animationType="slide"
        transparent
        onRequestClose={() => setDeletionRequestTarget(null)}
      >
        <View style={st.modalOverlay}>
          <View style={st.modalCard}>
          <ScrollView contentContainerStyle={{ padding: scale(20), paddingBottom: scale(20) }} keyboardShouldPersistTaps="handled">
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Request Deletion</Text>
              <TouchableOpacity onPress={() => setDeletionRequestTarget(null)}>
                <Icon name="close" size={scale(22)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={st.modalSubtitle}>
              "{deletionRequestTarget?.name}" is a live, approved restaurant. Deleting it requires
              admin approval - it will only be removed once an admin reviews and approves your request.
            </Text>
            <TextInput
              style={st.modalTextArea}
              placeholder="Reason for deletion (min 10 characters)..."
              placeholderTextColor={C.muted}
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={st.modalActions}>
              <TouchableOpacity
                style={st.modalCancelBtn}
                onPress={() => setDeletionRequestTarget(null)}
                disabled={submittingDeletionRequest}
              >
                <Text style={st.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.modalSubmitBtn, (deletionReason.trim().length < 10 || submittingDeletionRequest) && st.modalSubmitBtnDisabled]}
                onPress={submitDeletionRequest}
                disabled={deletionReason.trim().length < 10 || submittingDeletionRequest}
              >
                {submittingDeletionRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.modalSubmitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero Section (Compact)
  heroSection: { paddingTop: scale(6), paddingBottom: scale(10), borderBottomLeftRadius: scale(18), borderBottomRightRadius: scale(18), overflow: 'hidden', position: 'relative' },
  heroBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  heroBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16) },
  backBtn: { width: scale(32), height: scale(32), borderRadius: scale(11), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
  backBtnPlain: { width: scale(22), height: scale(32), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: moderateScale(11), color: 'rgba(255,255,255,0.8)', marginTop: scale(1) },
  heroActions: { flexDirection: 'row', gap: scale(6) },
  heroIconBtn: { width: scale(32), height: scale(32), borderRadius: scale(11), backgroundColor: 'rgba(255,255,255,0.15)', alignItems: 'center', justifyContent: 'center' },

  // Filters — static segmented row below the header (no wrapping card)
  filterRow: { flexDirection: 'row', marginHorizontal: scale(16), marginTop: scale(12), marginBottom: scale(4), backgroundColor: '#F1F5F9', borderRadius: scale(11), padding: scale(3) },
  filterChip: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: scale(7), borderRadius: scale(8) },
  filterChipActive: { backgroundColor: C.card, borderBottomWidth: scale(2.5), borderBottomColor: C.primary },
  filterChipText: { fontSize: moderateScale(10.5), fontWeight: '600', color: C.muted },
  filterChipTextActive: { color: C.primary, fontWeight: '800' },

  // Results Header
  resultsHeader: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(8) },
  clearFilterBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.primaryLight, borderRadius: scale(8) },
  clearFilterText: { fontSize: moderateScale(12), fontWeight: '600', color: C.primary },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card — clean thumbnail-top layout
  card: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), marginBottom: scale(9), borderWidth: 1, borderColor: C.border, overflow: 'hidden', shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.06, shadowRadius: scale(6), elevation: 2 },
  cardImageContainer: { height: scale(96), position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', top: scale(9), left: scale(9), flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(9), paddingVertical: scale(5), borderRadius: scale(20) },
  statusBadgeText: { fontSize: moderateScale(9.5), fontWeight: '700' },
  cardInfo: { flexDirection: 'row', paddingHorizontal: scale(10), paddingVertical: scale(8) },
  infoCol: { flex: 1, minWidth: 0 },
  infoColDivider: { paddingLeft: scale(8), marginLeft: scale(8), borderLeftWidth: 1, borderLeftColor: C.border },
  infoColLabel: { fontSize: moderateScale(8), fontWeight: '700', color: C.muted, letterSpacing: 0.4, marginBottom: scale(2) },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4) },
  cardTitle: { fontSize: moderateScale(13), fontWeight: '800', color: C.ink, flexShrink: 1 },
  infoText: { fontSize: moderateScale(11), color: C.text },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(10), paddingVertical: scale(7), borderTopWidth: 1, borderTopColor: C.border },
  viewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(5), paddingVertical: scale(7), backgroundColor: C.primary, borderRadius: scale(9) },
  viewBtnText: { fontSize: moderateScale(11.5), fontWeight: '700', color: '#fff' },
  iconBtn: { width: scale(30), height: scale(30), borderRadius: scale(9), backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center' },

  // Loading & Empty
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  // Skeleton loading
  skelFilterRow: { marginHorizontal: 0 },
  skelChip: { flex: 1, height: scale(24), borderRadius: scale(8), backgroundColor: '#E2E8F0' },
  skelFill: { backgroundColor: '#E2E8F0' },
  skelLine: { height: scale(9), width: '75%', borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelActionBar: { flex: 1, height: scale(28), borderRadius: scale(9), backgroundColor: '#E2E8F0' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIconContainer: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.primary, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Add More Button
  addMoreBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(10), marginTop: scale(8), marginBottom: scale(20), paddingVertical: scale(16), backgroundColor: C.card, borderRadius: scale(14), borderWidth: 2, borderColor: C.primary, borderStyle: 'dashed' },
  addMoreText: { fontSize: moderateScale(15), fontWeight: '700', color: C.primary },

  // Request Deletion Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { backgroundColor: C.card, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(8) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  modalSubtitle: { fontSize: moderateScale(13), color: C.text, marginBottom: scale(14), lineHeight: moderateScale(19) },
  modalTextArea: { backgroundColor: C.bg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(14), fontSize: moderateScale(14), color: C.text, minHeight: scale(100) },
  modalActions: { flexDirection: 'row', gap: scale(10), marginTop: scale(16) },
  modalCancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  modalCancelText: { fontSize: moderateScale(14), fontWeight: '700', color: C.text },
  modalSubmitBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.danger, alignItems: 'center' },
  modalSubmitBtnDisabled: { backgroundColor: '#FCA5A5' },
  modalSubmitText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },
});
