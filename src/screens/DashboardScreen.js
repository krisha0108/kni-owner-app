import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import NavigationMenu from '../components/NavigationMenu';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';

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
};

const { width } = Dimensions.get('window');

export default function DashboardScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurantId: restaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
    hasRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [data, setData] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!restaurantId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      const response = await api.get(`/owner/analytics?restaurantId=${restaurantId}&period=${selectedPeriod}`);

      if (response.data.ok) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Dashboard error:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [restaurantId, selectedPeriod]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  const PERIOD_OPTIONS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
  ];

  if ((loading || restaurantsLoading) && !data) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!hasRestaurants) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
            <Icon name="menu" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Dashboard</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={80} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Please add a restaurant to view your dashboard</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => navigation.navigate('MyRestaurants')}
          >
            <Text style={styles.addButtonText}>Add Restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const summary = data?.summary || {};
  const recent = data?.recent || {};

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.menuBtn}>
          <Icon name="menu" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Dashboard</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Notifications')}>
          <Icon name="notifications-outline" size={24} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Restaurant Selector - Global */}
      <RestaurantSelectorBar />

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Period Selector */}
        <View style={styles.periodSelector}>
          {PERIOD_OPTIONS.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[styles.periodButton, selectedPeriod === option.value && styles.periodButtonActive]}
              onPress={() => setSelectedPeriod(option.value)}
            >
              <Text style={[styles.periodText, selectedPeriod === option.value && styles.periodTextActive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: C.primary }]}>
            <Icon name="calendar" size={24} color={C.primary} />
            <Text style={styles.summaryValue}>₹{summary.bookings?.revenue || 0}</Text>
            <Text style={styles.summaryLabel}>{summary.bookings?.count || 0} Bookings</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: C.warn }]}>
            <Icon name="cash" size={24} color={C.warn} />
            <Text style={styles.summaryValue}>₹{summary.expenses?.total || 0}</Text>
            <Text style={styles.summaryLabel}>{summary.expenses?.count || 0} Expenses</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: C.ok }]}>
            <Icon name="hardware-chip" size={24} color={C.ok} />
            <Text style={styles.summaryValue}>{summary.equipment?.count || 0}</Text>
            <Text style={styles.summaryLabel}>Equipment</Text>
          </View>
        </View>

        {/* Net Revenue Card */}
        <View style={[styles.netRevenueCard, summary.netRevenue >= 0 ? styles.profit : styles.loss]}>
          <View style={styles.netRevenueHeader}>
            <Icon
              name={summary.netRevenue >= 0 ? 'trending-up' : 'trending-down'}
              size={28}
              color={C.card}
            />
            <Text style={styles.netRevenueLabel}>Net Revenue</Text>
          </View>
          <Text style={styles.netRevenueValue}>₹{Math.abs(summary.netRevenue || 0)}</Text>
          <Text style={styles.netRevenueSubtext}>
            {summary.netRevenue >= 0 ? 'Profit' : 'Loss'} for {selectedPeriod} days
          </Text>
        </View>

        {/* Recent Bookings */}
        {recent.bookings && recent.bookings.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Bookings</Text>
              <TouchableOpacity onPress={() => navigation.navigate('MyBookings')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {recent.bookings.map((booking) => (
              <View key={booking.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <Icon name="calendar-outline" size={20} color={C.primary} />
                  <View style={styles.recentItemText}>
                    <Text style={styles.recentItemTitle}>Booking #{booking.id.slice(0, 8)}</Text>
                    <Text style={styles.recentItemDate}>
                      {new Date(booking.createdAt).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <View>
                  <Text style={styles.recentItemAmount}>₹{booking.totalAmount}</Text>
                  <Text style={[styles.recentItemStatus, styles[`status${booking.status}`]]}>
                    {booking.status}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Recent Expenses */}
        {recent.expenses && recent.expenses.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Expenses</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Expenses')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {recent.expenses.map((expense) => (
              <View key={expense.id} style={styles.recentItem}>
                <View style={styles.recentItemLeft}>
                  <Icon name="cash-outline" size={20} color={C.warn} />
                  <View style={styles.recentItemText}>
                    <Text style={styles.recentItemTitle}>{expense.category}</Text>
                    <Text style={styles.recentItemDate}>
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recentItemAmount}>₹{expense.amount}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <NavigationMenu
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        navigation={navigation}
      />
      <KniBottomNav navigation={navigation} active="home" />
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
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    backgroundColor: C.primary,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 24,
  },
  addButtonText: {
    color: C.card,
    fontSize: 15,
    fontWeight: '600',
  },
  periodSelector: {
    flexDirection: 'row',
    padding: 16,
    gap: 8,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  periodButtonActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  periodText: {
    fontSize: 13,
    color: C.text,
  },
  periodTextActive: {
    color: C.card,
    fontWeight: '600',
  },
  summaryGrid: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 12,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '700',
    color: C.ink,
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 13,
    color: C.muted,
    marginTop: 4,
  },
  netRevenueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 12,
  },
  profit: {
    backgroundColor: C.ok,
  },
  loss: {
    backgroundColor: C.danger,
  },
  netRevenueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  netRevenueLabel: {
    fontSize: 14,
    color: C.card,
    marginLeft: 8,
    fontWeight: '600',
  },
  netRevenueValue: {
    fontSize: 32,
    fontWeight: '700',
    color: C.card,
  },
  netRevenueSubtext: {
    fontSize: 13,
    color: C.card,
    opacity: 0.9,
    marginTop: 4,
  },
  section: {
    marginTop: 8,
    marginHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  sectionLink: {
    fontSize: 14,
    color: C.primary,
  },
  recentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  recentItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  recentItemText: {
    marginLeft: 12,
    flex: 1,
  },
  recentItemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  recentItemDate: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  recentItemAmount: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'right',
  },
  recentItemStatus: {
    fontSize: 11,
    marginTop: 4,
    textAlign: 'right',
  },
  statusPENDING_PAYMENT: {
    color: C.warn,
  },
  statusSCHEDULED: {
    color: '#3B82F6',
  },
  statusCOMPLETED: {
    color: C.ok,
  },
});
