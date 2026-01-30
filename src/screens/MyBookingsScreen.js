import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import SearchBar from '../components/filters/SearchBar';
import FilterBottomSheet from '../components/filters/FilterBottomSheet';
import SortDropdown from '../components/filters/SortDropdown';
import ActiveFilterBadges from '../components/filters/ActiveFilterBadges';
import { applyFilters, getDefaultFilters, countActiveFilters } from '../utils/filterHelpers';
import { exportAndShare, BOOKING_COLUMNS, formatBookingsForExport } from '../services/exportService';
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

const getStatusStyle = (status) => {
  switch (status) {
    case 'PENDING_PAYMENT':
      return { bg: '#FFFBEB', text: C.warn, icon: 'time' };
    case 'PAYMENT_UPLOADED':
      return { bg: '#FEF3C7', text: '#D97706', icon: 'cloud-upload' };
    case 'PAYMENT_VERIFIED':
      return { bg: '#D1FAE5', text: '#059669', icon: 'checkmark-circle' };
    case 'SCHEDULED':
      return { bg: '#EFF6FF', text: C.info, icon: 'calendar' };
    case 'IN_PROGRESS':
      return { bg: '#F3F4F6', text: C.ink, icon: 'construct' };
    case 'COMPLETED':
      return { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-done-circle' };
    case 'CANCELLED':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'help-circle' };
  }
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'PENDING_PAYMENT', label: 'Pending Payment' },
  { value: 'PAYMENT_UPLOADED', label: 'Payment Uploaded' },
  { value: 'PAYMENT_VERIFIED', label: 'Payment Verified' },
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest First' },
  { value: 'date-asc', label: 'Oldest First' },
  { value: 'amount-desc', label: 'Highest Amount' },
  { value: 'amount-asc', label: 'Lowest Amount' },
];

const FILTER_CONFIG = {
  title: 'Bookings',
  showStatus: true,
  statusOptions: STATUS_OPTIONS,
  showDateRange: true,
  showAmountRange: true,
};

export default function MyBookingsScreen({ navigation }) {
  // Global restaurant context
  const {
    restaurants,
    selectedRestaurantId: selectedRestaurant,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [bookings, setBookings] = useState([]);

  // Filter states
  const [filters, setFilters] = useState(getDefaultFilters());
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedRestaurant])
  );

  const loadData = async () => {
    if (!selectedRestaurant) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const params = new URLSearchParams({ restaurantId: selectedRestaurant });
      const response = await api.get(`/owner/bookings?${params}`);

      if (response.data.ok) {
        setBookings(response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading bookings:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Apply filters and sorting using useMemo
  const filteredBookings = useMemo(() => {
    return applyFilters(bookings, filters, {
      searchFields: ['id', 'serviceType', 'status'],
      statusField: 'status',
      dateField: 'createdAt',
      amountField: 'totalAmount',
      sortFields: { date: 'createdAt', amount: 'totalAmount' },
    });
  }, [bookings, filters]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const handleApplyFilters = (newFilters) => {
    setFilters(newFilters);
  };

  const handleRemoveFilter = (key) => {
    const defaults = getDefaultFilters();
    setFilters({ ...filters, [key]: defaults[key] });
  };

  const handleExport = async () => {
    if (filteredBookings.length === 0) {
      Alert.alert('No Data', 'No bookings to export');
      return;
    }

    try {
      setExporting(true);
      const exportData = formatBookingsForExport(filteredBookings);
      await exportAndShare('bookings', exportData, BOOKING_COLUMNS, 'Export Bookings');
    } catch (error) {
      Alert.alert('Error', 'Failed to export bookings');
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = countActiveFilters(filters);

  const renderBookingCard = ({ item }) => {
    const statusStyle = getStatusStyle(item.status);

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => navigation.navigate('BookingDetail', { bookingId: item.id })}
      >
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.bookingNumber}>Booking #{item.id.slice(0, 8)}</Text>
            <Text style={styles.bookingDate}>{new Date(item.createdAt).toLocaleDateString()}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
            <Icon name={statusStyle.icon} size={14} color={statusStyle.text} />
            <Text style={[styles.statusText, { color: statusStyle.text }]}>
              {item.status.replace(/_/g, ' ')}
            </Text>
          </View>
        </View>

        {item.serviceType && (
          <View style={styles.serviceRow}>
            <Icon name="construct-outline" size={16} color={C.muted} />
            <Text style={styles.serviceText}>{item.serviceType}</Text>
          </View>
        )}

        {item.scheduledDate && (
          <View style={styles.scheduleRow}>
            <Icon name="calendar-outline" size={16} color={C.info} />
            <Text style={styles.scheduleText}>
              Scheduled: {new Date(item.scheduledDate).toLocaleDateString()}
            </Text>
          </View>
        )}

        {item.equipment && (
          <View style={styles.equipmentRow}>
            <Icon name="hardware-chip-outline" size={16} color={C.muted} />
            <Text style={styles.equipmentText}>{item.equipment.name}</Text>
          </View>
        )}

        <View style={styles.cardFooter}>
          <View>
            <Text style={styles.amountLabel}>Total Amount</Text>
            <Text style={styles.amountValue}>₹{item.totalAmount || 0}</Text>
          </View>
          <TouchableOpacity style={styles.viewBtn}>
            <Text style={styles.viewBtnText}>View Details</Text>
            <Icon name="chevron-forward" size={16} color={C.primary} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Bookings</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={80} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Please add a restaurant first</Text>
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
        <Text style={styles.headerTitle}>My Bookings</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={handleExport} disabled={exporting} style={styles.headerBtn}>
            {exporting ? (
              <ActivityIndicator size="small" color={C.ink} />
            ) : (
              <Icon name="download-outline" size={22} color={C.ink} />
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('NewBooking')} style={styles.headerBtn}>
            <Icon name="add-circle" size={26} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Search Bar */}
      <View style={styles.searchRow}>
        <View style={styles.searchContainer}>
          <SearchBar
            value={filters.search}
            onChangeText={(text) => setFilters({ ...filters, search: text })}
            placeholder="Search bookings..."
          />
        </View>
        <TouchableOpacity
          style={styles.filterBtn}
          onPress={() => setShowFilterSheet(true)}
        >
          <Icon name="options-outline" size={20} color={C.ink} />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
        <SortDropdown
          value={filters.sortBy}
          options={SORT_OPTIONS}
          onChange={(value) => setFilters({ ...filters, sortBy: value })}
        />
      </View>

      {/* Active Filter Badges */}
      {activeFilterCount > 0 && (
        <ActiveFilterBadges
          filters={filters}
          onRemove={handleRemoveFilter}
          statusOptions={STATUS_OPTIONS}
        />
      )}

      {/* Restaurant Selector - Global */}
      <RestaurantSelectorBar />

      {/* Results Count */}
      <View style={styles.resultsRow}>
        <Text style={styles.resultsText}>
          {filteredBookings.length} booking{filteredBookings.length !== 1 ? 's' : ''} found
        </Text>
      </View>

      <FlatList
        data={filteredBookings}
        keyExtractor={item => item.id.toString()}
        renderItem={renderBookingCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="calendar-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>
              {activeFilterCount > 0 ? 'No Matching Bookings' : 'No Bookings Yet'}
            </Text>
            <Text style={styles.emptyText}>
              {activeFilterCount > 0
                ? 'Try adjusting your filters'
                : 'Your service bookings will appear here'
              }
            </Text>
            {activeFilterCount === 0 && (
              <TouchableOpacity
                style={styles.emptyBtn}
                onPress={() => navigation.navigate('NewBooking')}
              >
                <Icon name="add" size={18} color="#fff" />
                <Text style={styles.emptyBtnText}>Request Service</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={filters}
        onApply={handleApplyFilters}
        config={FILTER_CONFIG}
      />
      <KniBottomNav navigation={navigation} />
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
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
  menuBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerBtn: { padding: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    backgroundColor: C.card,
  },
  searchContainer: { flex: 1 },
  filterBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#fff',
  },

  resultsRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  resultsText: {
    fontSize: 13,
    color: C.muted,
  },

  restaurantRow: { paddingHorizontal: 16, marginBottom: 8 },
  restaurantChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  restaurantChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  restaurantText: { fontSize: 13, fontWeight: '600', color: C.ink },
  restaurantTextActive: { color: '#fff' },

  list: { padding: 16 },
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
  bookingNumber: { fontSize: 16, fontWeight: '700', color: C.ink },
  bookingDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: { fontSize: 11, fontWeight: '600' },

  serviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  serviceText: { fontSize: 14, color: C.text, fontWeight: '600' },

  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  scheduleText: { fontSize: 13, color: C.info },

  equipmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  equipmentText: { fontSize: 13, color: C.muted },

  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },
  amountLabel: { fontSize: 12, color: C.muted },
  amountValue: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 2 },
  viewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  viewBtnText: { fontSize: 14, fontWeight: '600', color: C.primary },

  emptyBox: { alignItems: 'center', paddingTop: 80 },
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
});
