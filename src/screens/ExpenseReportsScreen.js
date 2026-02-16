import React, { useState, useEffect, useCallback } from 'react';
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
import LineChartCard from '../components/charts/LineChartCard';
import PieChartCard from '../components/charts/PieChartCard';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
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

// Expense categories matching web
const EXPENSE_CATEGORIES = [
  { value: 'FOOD', label: 'Food & Ingredients', color: '#10B981', icon: 'fast-food-outline' },
  { value: 'UTILITIES', label: 'Utilities', color: '#3B82F6', icon: 'flash-outline' },
  { value: 'SALARIES', label: 'Salaries & Wages', color: '#8B5CF6', icon: 'people-outline' },
  { value: 'MAINTENANCE', label: 'Maintenance', color: '#F59E0B', icon: 'construct-outline' },
  { value: 'RENT', label: 'Rent', color: '#EF4444', icon: 'home-outline' },
  { value: 'SUPPLIES', label: 'Supplies', color: '#06B6D4', icon: 'cube-outline' },
  { value: 'MARKETING', label: 'Marketing', color: '#EC4899', icon: 'megaphone-outline' },
  { value: 'TRANSPORT', label: 'Transport', color: '#6366F1', icon: 'car-outline' },
  { value: 'OTHER', label: 'Other', color: '#6B7280', icon: 'ellipsis-horizontal-outline' },
];

const getCategoryConfig = (categoryValue) => {
  return EXPENSE_CATEGORIES.find(c => c.value === categoryValue) || {
    value: categoryValue,
    label: categoryValue,
    color: '#6B7280',
    icon: 'cash-outline',
  };
};

const formatPrice = (amount) => {
  if (!amount && amount !== 0) return '₹0';
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const SHORT_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function ExpenseReportsScreen({ navigation }) {
  // Global restaurant context
  const {
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [report, setReport] = useState(null);
  const [trendData, setTrendData] = useState([]);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [menuVisible, setMenuVisible] = useState(false);

  const fetchReport = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const params = new URLSearchParams({
        year: selectedYear.toString(),
        month: selectedMonth.toString(),
        restaurantId: selectedRestaurantId,
      });

      const res = await api.get(`/owner/expenses/reports/monthly?${params}`);
      if (res.data.ok) {
        setReport(res.data.data);
      } else {
        setReport(null);
      }
    } catch (error) {
      console.error('Fetch report error:', error);
      setReport(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId, selectedYear, selectedMonth]);

  const fetchTrendData = useCallback(async () => {
    if (!selectedRestaurantId) return;

    try {
      const params = new URLSearchParams();
      params.append('restaurantId', selectedRestaurantId);

      const res = await api.get(`/owner/expenses?${params}`);
      if (res.data.ok) {
        const expenses = res.data.data.expenses || [];

        // Calculate last 6 months trend
        const last6Months = Array.from({ length: 6 }, (_, i) => {
          const d = new Date();
          d.setMonth(d.getMonth() - (5 - i));
          return {
            year: d.getFullYear(),
            month: d.getMonth() + 1,
            monthName: SHORT_MONTHS[d.getMonth()],
          };
        });

        const monthlyTotals = last6Months.map(({ year, month, monthName }) => {
          const monthExpenses = expenses.filter((exp) => {
            const expDate = new Date(exp.expenseDate || exp.date);
            return expDate.getFullYear() === year && expDate.getMonth() + 1 === month;
          });
          const total = monthExpenses.reduce((sum, exp) => sum + (exp.amount || 0), 0);
          return {
            month: monthName,
            total: total,
            count: monthExpenses.length,
          };
        });

        setTrendData(monthlyTotals);
      }
    } catch (error) {
      console.error('Fetch trend error:', error);
    }
  }, [selectedRestaurantId]);

  // Load data when restaurant or date changes
  useEffect(() => {
    if (selectedRestaurantId) {
      fetchReport();
      fetchTrendData();
    }
  }, [selectedRestaurantId, selectedYear, selectedMonth, fetchReport, fetchTrendData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    fetchReport();
    fetchTrendData();
  };

  const changeMonth = (delta) => {
    let newMonth = selectedMonth + delta;
    let newYear = selectedYear;

    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }

    setSelectedMonth(newMonth);
    setSelectedYear(newYear);
  };

  const isCurrentMonth = () => {
    const now = new Date();
    return selectedYear === now.getFullYear() && selectedMonth === now.getMonth() + 1;
  };

  // Prepare category data for display
  const getCategoryData = () => {
    if (!report || !report.categoryTotals) return [];

    return EXPENSE_CATEGORIES.map(cat => ({
      ...cat,
      amount: report.categoryTotals[cat.value] || 0,
      percentage: report.totalAmount > 0
        ? ((report.categoryTotals[cat.value] || 0) / report.totalAmount) * 100
        : 0,
    })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
  };

  const categoryData = getCategoryData();
  const topCategories = categoryData.slice(0, 5);

  // Prepare pie chart data
  const pieChartData = topCategories.map(cat => ({
    name: cat.label,
    count: cat.amount,
    color: cat.color,
  }));

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Expense Reports</Text>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading report...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Expense Reports</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity
            onPress={() => navigation.navigate('Expenses')}
            style={styles.backBtn}
          >
            <Icon name="list-outline" size={scale(22)} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
            <Icon name="menu" size={scale(22)} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={styles.scrollContent}
      >
        {/* Month Navigator - Premium Design */}
        <View style={styles.monthNav}>
          <TouchableOpacity style={styles.navBtn} onPress={() => changeMonth(-1)}>
            <Icon name="chevron-back" size={scale(18)} color={C.ink} />
            <Text style={styles.navBtnText}>Previous</Text>
          </TouchableOpacity>
          <View style={styles.monthDisplay}>
            <Text style={styles.monthText}>{MONTH_NAMES[selectedMonth - 1]}</Text>
            <Text style={styles.yearText}>{selectedYear}</Text>
          </View>
          <TouchableOpacity
            style={[styles.navBtn, isCurrentMonth() && styles.navBtnDisabled]}
            onPress={() => changeMonth(1)}
            disabled={isCurrentMonth()}
          >
            <Text style={[styles.navBtnText, isCurrentMonth() && styles.navBtnTextDisabled]}>
              Next
            </Text>
            <Icon
              name="chevron-forward"
              size={scale(18)}
              color={isCurrentMonth() ? C.border : C.ink}
            />
          </TouchableOpacity>
        </View>

        {!report ? (
          <View style={styles.noDataCard}>
            <Icon name="document-text-outline" size={scale(48)} color={C.muted} />
            <Text style={styles.noDataTitle}>No Data Available</Text>
            <Text style={styles.noDataText}>
              No expenses recorded for {MONTH_NAMES[selectedMonth - 1]} {selectedYear}
            </Text>
          </View>
        ) : (
          <>
            {/* Summary Cards */}
            <View style={styles.summaryRow}>
              <View style={[styles.summaryCard, { backgroundColor: '#FEF2F2' }]}>
                <Text style={styles.summaryLabel}>Total Expenses</Text>
                <Text style={[styles.summaryValue, { color: C.primary }]}>
                  {formatPrice(report.totalAmount)}
                </Text>
                <Text style={styles.summarySubtext}>
                  {report.expenseCount} expense{report.expenseCount !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            <View style={styles.comparisonRow}>
              <View style={[styles.comparisonCard, { flex: 1 }]}>
                <Text style={styles.comparisonLabel}>Previous Month</Text>
                <Text style={styles.comparisonValue}>
                  {formatPrice(report.comparison?.previousMonthTotal || 0)}
                </Text>
                <Text style={styles.comparisonSubtext}>
                  {MONTH_NAMES[(selectedMonth - 2 + 12) % 12]}
                </Text>
              </View>

              <View style={[styles.comparisonCard, { flex: 1 }]}>
                <Text style={styles.comparisonLabel}>Change</Text>
                <View style={styles.changeRow}>
                  <Icon
                    name={report.comparison?.changeAmount >= 0 ? 'trending-up' : 'trending-down'}
                    size={scale(20)}
                    color={report.comparison?.changeAmount >= 0 ? C.danger : C.ok}
                  />
                  <Text style={[
                    styles.changeValue,
                    { color: report.comparison?.changeAmount >= 0 ? C.danger : C.ok }
                  ]}>
                    {report.comparison?.changePercentage >= 0 ? '+' : ''}
                    {(report.comparison?.changePercentage || 0).toFixed(1)}%
                  </Text>
                </View>
                <Text style={styles.comparisonSubtext}>
                  {formatPrice(Math.abs(report.comparison?.changeAmount || 0))}
                  {report.comparison?.changeAmount >= 0 ? ' increase' : ' decrease'}
                </Text>
              </View>
            </View>

            {/* Trend Chart */}
            {trendData.length > 0 && (
              <LineChartCard
                title="Expense Trend (Last 6 Months)"
                data={trendData}
                labelKey="month"
                valueKey="total"
              />
            )}

            {/* Category Distribution Pie Chart */}
            {pieChartData.length > 0 && (
              <PieChartCard
                title="Category Distribution"
                data={pieChartData}
              />
            )}

            {/* Top Categories */}
            {topCategories.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>Top Expense Categories</Text>
                {topCategories.map((category, index) => (
                  <View key={category.value} style={styles.categoryItem}>
                    <View style={styles.categoryHeader}>
                      <View style={styles.categoryLeft}>
                        <View style={[styles.categoryDot, { backgroundColor: category.color }]} />
                        <Icon name={category.icon} size={scale(18)} color={category.color} />
                        <Text style={styles.categoryName}>{category.label}</Text>
                      </View>
                      <View style={styles.categoryRight}>
                        <Text style={styles.categoryAmount}>{formatPrice(category.amount)}</Text>
                        <Text style={styles.categoryPercent}>{category.percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          { width: `${category.percentage}%`, backgroundColor: category.color }
                        ]}
                      />
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* All Categories Grid */}
            {categoryData.length > 0 && (
              <View style={styles.card}>
                <Text style={styles.cardTitle}>All Categories</Text>
                <View style={styles.categoryGrid}>
                  {categoryData.map(category => (
                    <View key={category.value} style={styles.categoryGridItem}>
                      <View style={styles.categoryGridHeader}>
                        <View style={[styles.categoryDotSmall, { backgroundColor: category.color }]} />
                        <Text style={styles.categoryGridName} numberOfLines={1}>
                          {category.label}
                        </Text>
                      </View>
                      <Text style={styles.categoryGridAmount}>{formatPrice(category.amount)}</Text>
                      <View style={styles.categoryGridBadge}>
                        <Text style={styles.categoryGridPercent}>{category.percentage.toFixed(1)}%</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {categoryData.length === 0 && (
              <View style={styles.noDataCard}>
                <Icon name="pie-chart-outline" size={scale(48)} color={C.muted} />
                <Text style={styles.noDataTitle}>No Category Data</Text>
                <Text style={styles.noDataText}>
                  No expenses categorized for this month
                </Text>
              </View>
            )}
          </>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(12), fontSize: moderateScale(14), color: C.muted },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },

  scrollContent: { paddingBottom: scale(32) },

  // Month Navigator - Premium Design
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(16),
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  navBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(10),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  navBtnDisabled: { opacity: 0.4 },
  navBtnText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  navBtnTextDisabled: { color: C.muted },
  monthDisplay: { alignItems: 'center' },
  monthText: { fontSize: moderateScale(22), fontWeight: '900', color: C.ink },
  yearText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(2) },

  noDataCard: {
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(32),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  noDataTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginTop: scale(12) },
  noDataText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', marginTop: scale(8) },

  summaryRow: { paddingHorizontal: scale(16), marginTop: scale(16) },
  summaryCard: {
    borderRadius: scale(16),
    padding: scale(20),
    alignItems: 'center',
  },
  summaryLabel: { fontSize: moderateScale(13), color: C.muted, fontWeight: '600' },
  summaryValue: { fontSize: moderateScale(32), fontWeight: '900', marginTop: scale(4) },
  summarySubtext: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },

  comparisonRow: {
    flexDirection: 'row',
    paddingHorizontal: scale(16),
    gap: scale(12),
    marginTop: scale(12),
  },
  comparisonCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  comparisonLabel: { fontSize: moderateScale(12), color: C.muted, fontWeight: '600' },
  comparisonValue: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginTop: scale(4) },
  comparisonSubtext: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(4) },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
  changeValue: { fontSize: moderateScale(20), fontWeight: '700' },

  card: {
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    padding: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  cardTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(16) },

  categoryItem: { marginBottom: scale(16) },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(8),
  },
  categoryLeft: { flexDirection: 'row', alignItems: 'center', gap: scale(8) },
  categoryDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  categoryName: { fontSize: moderateScale(14), fontWeight: '600', color: C.text },
  categoryRight: { alignItems: 'flex-end' },
  categoryAmount: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  categoryPercent: { fontSize: moderateScale(11), color: C.muted },
  progressBar: {
    height: scale(8),
    backgroundColor: C.bg,
    borderRadius: scale(4),
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: scale(4) },

  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: scale(12),
  },
  categoryGridItem: {
    width: '47%',
    padding: scale(12),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryGridHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginBottom: scale(8),
  },
  categoryDotSmall: { width: scale(8), height: scale(8), borderRadius: scale(4) },
  categoryGridName: { fontSize: moderateScale(12), fontWeight: '600', color: C.text, flex: 1 },
  categoryGridAmount: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(4) },
  categoryGridBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(8),
    paddingVertical: scale(2),
    borderRadius: scale(6),
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  categoryGridPercent: { fontSize: moderateScale(11), fontWeight: '600', color: C.muted },
});
