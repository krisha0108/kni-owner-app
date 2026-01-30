import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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

const { width } = Dimensions.get('window');

export default function KhatabookScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState(null);
  const [selectedPeriod, setSelectedPeriod] = useState(30);
  const [menuVisible, setMenuVisible] = useState(false);

  const PERIOD_OPTIONS = [
    { label: '7 Days', value: 7 },
    { label: '30 Days', value: 30 },
    { label: '90 Days', value: 90 },
    { label: '1 Year', value: 365 },
  ];

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const response = await api.get(
        `/owner/finance-reports?restaurantId=${selectedRestaurantId}&period=${selectedPeriod}`
      );

      if (response.data.ok) {
        setData(response.data.data);
      }
    } catch (error) {
      console.error('Error loading khatabook:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedPeriod]);

  // Load data when restaurant or period changes
  useEffect(() => {
    if (selectedRestaurantId) {
      loadData();
    }
  }, [selectedRestaurantId, selectedPeriod, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await loadData();
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Khatabook</Text>
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


  const netRevenue = (data?.totalRevenue || 0) - (data?.totalExpenses || 0);
  const isProfit = netRevenue >= 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Khatabook</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Global Restaurant Selector */}
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


        {/* Net Revenue Card */}
        <View style={[styles.netRevenueCard, isProfit ? styles.profit : styles.loss]}>
          <View style={styles.netRevenueHeader}>
            <Icon
              name={isProfit ? 'trending-up' : 'trending-down'}
              size={32}
              color={C.card}
            />
            <Text style={styles.netRevenueLabel}>Net Revenue</Text>
          </View>
          <Text style={styles.netRevenueValue}>₹{Math.abs(netRevenue).toFixed(2)}</Text>
          <Text style={styles.netRevenueSubtext}>
            {isProfit ? 'Profit' : 'Loss'} for {selectedPeriod} days
          </Text>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: C.ok }]}>
            <Icon name="arrow-down-circle" size={24} color={C.ok} />
            <Text style={styles.summaryValue}>₹{data?.totalRevenue || 0}</Text>
            <Text style={styles.summaryLabel}>Total Revenue</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: C.danger }]}>
            <Icon name="arrow-up-circle" size={24} color={C.danger} />
            <Text style={styles.summaryValue}>₹{data?.totalExpenses || 0}</Text>
            <Text style={styles.summaryLabel}>Total Expenses</Text>
          </View>
        </View>

        <View style={styles.summaryGrid}>
          <View style={[styles.summaryCard, { borderLeftColor: C.warn }]}>
            <Icon name="time" size={24} color={C.warn} />
            <Text style={styles.summaryValue}>₹{data?.pendingDues || 0}</Text>
            <Text style={styles.summaryLabel}>Pending Dues</Text>
          </View>

          <View style={[styles.summaryCard, { borderLeftColor: C.info }]}>
            <Icon name="wallet" size={24} color={C.info} />
            <Text style={styles.summaryValue}>₹{data?.cashBalance || 0}</Text>
            <Text style={styles.summaryLabel}>Cash Balance</Text>
          </View>
        </View>

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsGrid}>
            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Expenses')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#FFFBEB' }]}>
                <Icon name="cash-outline" size={28} color={C.warn} />
              </View>
              <Text style={styles.actionText}>Add Expense</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Cashbook')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="wallet-outline" size={28} color={C.info} />
              </View>
              <Text style={styles.actionText}>Cashbook</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('VendorLedger')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#F3F4F6' }]}>
                <Icon name="people-outline" size={28} color={C.ink} />
              </View>
              <Text style={styles.actionText}>Vendors</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionCard}
              onPress={() => navigation.navigate('Analytics')}
            >
              <View style={[styles.actionIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="stats-chart-outline" size={28} color={C.ok} />
              </View>
              <Text style={styles.actionText}>Analytics</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Recent Transactions */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Transactions</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Cashbook')}>
                <Text style={styles.sectionLink}>View All</Text>
              </TouchableOpacity>
            </View>
            {data.recentTransactions.map((transaction, index) => (
              <View key={index} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Icon
                    name={transaction.type === 'CREDIT' ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={20}
                    color={transaction.type === 'CREDIT' ? C.ok : C.danger}
                  />
                  <View style={styles.transactionInfo}>
                    <Text style={styles.transactionTitle}>{transaction.description}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: transaction.type === 'CREDIT' ? C.ok : C.danger }
                  ]}
                >
                  {transaction.type === 'CREDIT' ? '+' : '-'}₹{transaction.amount}
                </Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="khatabook" />
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
  content: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  periodSelector: { flexDirection: 'row', padding: 16, gap: 8 },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    alignItems: 'center',
  },
  periodButtonActive: { backgroundColor: C.primary, borderColor: C.primary },
  periodText: { fontSize: 13, color: C.text },
  periodTextActive: { color: C.card, fontWeight: '600' },

  filterRow: { paddingHorizontal: 16, marginBottom: 12 },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  netRevenueCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 20,
    borderRadius: 16,
  },
  profit: { backgroundColor: C.ok },
  loss: { backgroundColor: C.danger },
  netRevenueHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  netRevenueLabel: { fontSize: 15, color: C.card, marginLeft: 12, fontWeight: '600' },
  netRevenueValue: { fontSize: 36, fontWeight: '700', color: C.card },
  netRevenueSubtext: { fontSize: 13, color: C.card, opacity: 0.9, marginTop: 4 },

  summaryGrid: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 12 },
  summaryCard: {
    flex: 1,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
  },
  summaryValue: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 8 },
  summaryLabel: { fontSize: 12, color: C.muted, marginTop: 4 },

  section: { marginHorizontal: 16, marginBottom: 20 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 12 },
  sectionLink: { fontSize: 14, color: C.primary },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  actionCard: {
    width: (width - 48) / 2,
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  actionIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  actionText: { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'center' },

  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: C.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: C.border,
  },
  transactionLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transactionInfo: { marginLeft: 12, flex: 1 },
  transactionTitle: { fontSize: 14, fontWeight: '600', color: C.ink },
  transactionDate: { fontSize: 12, color: C.muted, marginTop: 2 },
  transactionAmount: { fontSize: 16, fontWeight: '700' },
});
