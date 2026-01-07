import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  RefreshControl, ScrollView, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';

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

const months = [
  { value: '', label: 'All Months' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

const getStatusStyle = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { bg: '#ECFDF5', text: C.ok, icon: 'checkmark-circle' };
    case 'pending':
      return { bg: '#FFFBEB', text: C.warn, icon: 'time' };
    case 'in_progress':
    case 'assigned':
      return { bg: '#EFF6FF', text: C.info, icon: 'construct' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'alert-circle' };
  }
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export default function ServiceHistoryScreen({ navigation }) {
  const [services, setServices] = useState([]);
  const [summary, setSummary] = useState({
    total_services: 0,
    total_spent: 0,
    monthly_spending: [],
    equipment_spending: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(currentYear.toString());
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [showMonthly, setShowMonthly] = useState(true);
  const [showEquipment, setShowEquipment] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const params = {};
      if (selectedMonth) params.month = selectedMonth;
      if (selectedYear) params.year = selectedYear;

      const { data } = await api.get('/restaurant-owner/service-history', { params });
      setServices(data?.services || []);
      setSummary(data?.summary || {
        total_services: 0,
        total_spent: 0,
        monthly_spending: [],
        equipment_spending: []
      });
    } catch (error) {
      console.log('Error fetching history:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchHistory();
  };

  const filtered = services.filter(s => {
    const q = search.toLowerCase();
    const okStatus = selectedStatus === 'all' || s.status?.toLowerCase() === selectedStatus;
    const okQ = !q || s.product_name?.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q);
    return okStatus && okQ;
  });

  const SummaryCard = ({ icon, label, value, color }) => (
    <View style={st.summaryCard}>
      <View style={[st.summaryIcon, { backgroundColor: `${color}20` }]}>
        <Icon name={icon} size={20} color={color} />
      </View>
      <Text style={st.summaryValue}>{value}</Text>
      <Text style={st.summaryLabel}>{label}</Text>
    </View>
  );

  const SpendingSection = ({ title, data, icon, expanded, onToggle }) => {
    const maxVal = Math.max(...data.map(d => d.total || 0), 1);

    return (
      <View style={st.spendingSection}>
        <TouchableOpacity style={st.spendingHeader} onPress={onToggle}>
          <View style={st.spendingLeft}>
            <View style={st.spendingIconBox}>
              <Icon name={icon} size={18} color={C.info} />
            </View>
            <Text style={st.spendingTitle}>{title}</Text>
          </View>
          <Icon name={expanded ? 'chevron-up' : 'chevron-down'} size={20} color={C.muted} />
        </TouchableOpacity>

        {expanded && data.length > 0 && (
          <View style={st.spendingBody}>
            {data.map((item, idx) => (
              <View key={idx} style={st.barRow}>
                <View style={st.barInfo}>
                  <Text style={st.barLabel}>{item.month || item.equipment}</Text>
                  <View style={st.barRight}>
                    <Text style={st.barCount}>{item.count} service(s)</Text>
                    <Text style={st.barAmount}>{formatCurrency(item.total)}</Text>
                  </View>
                </View>
                <View style={st.barTrack}>
                  <View style={[st.barFill, { width: `${(item.total / maxVal) * 100}%` }]} />
                </View>
              </View>
            ))}
          </View>
        )}

        {expanded && data.length === 0 && (
          <Text style={st.noData}>No data available</Text>
        )}
      </View>
    );
  };

  const ServiceCard = ({ item }) => {
    const style = getStatusStyle(item.status);

    return (
      <View style={st.card}>
        <View style={st.cardTop}>
          <View style={st.cardInfo}>
            <Text style={st.cardTitle}>{item.product_name}</Text>
            {item.description && <Text style={st.cardDesc} numberOfLines={2}>{item.description}</Text>}
            {item.restaurant && <Text style={st.cardLocation}>Location: {item.restaurant}</Text>}
          </View>
          <View style={[st.statusBadge, { backgroundColor: style.bg }]}>
            <Icon name={style.icon} size={12} color={style.text} />
            <Text style={[st.statusText, { color: style.text }]}>{item.status}</Text>
          </View>
        </View>

        <View style={st.cardBottom}>
          <View style={st.dateBox}>
            <Icon name="calendar-outline" size={14} color={C.muted} />
            <Text style={st.dateText}>{item.service_date || item.created_at}</Text>
          </View>
          {item.amount > 0 && (
            <View style={st.amountBox}>
              <Text style={st.rupee}>Rs</Text>
              <Text style={st.amount}>{item.amount}</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Service History</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={st.summaryRow}>
          <SummaryCard icon="construct" label="Services" value={summary.total_services} color={C.info} />
          <SummaryCard icon="cash" label="Total Spent" value={formatCurrency(summary.total_spent)} color={C.ok} />
        </View>

        {/* Spending Charts */}
        <View style={st.chartsContainer}>
          <SpendingSection
            title="Monthly Spending"
            data={summary.monthly_spending}
            icon="calendar"
            expanded={showMonthly}
            onToggle={() => setShowMonthly(!showMonthly)}
          />
          <SpendingSection
            title="Equipment Spending"
            data={summary.equipment_spending}
            icon="hardware-chip"
            expanded={showEquipment}
            onToggle={() => setShowEquipment(!showEquipment)}
          />
        </View>

        {/* Search */}
        <View style={st.searchContainer}>
          <View style={st.searchBox}>
            <Icon name="search-outline" size={18} color={C.muted} />
            <TextInput
              style={st.searchInput}
              placeholder="Search services..."
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')}>
                <Icon name="close-circle" size={18} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Year Filter */}
        <View style={st.yearSelector}>
          {years.map(year => (
            <TouchableOpacity
              key={year}
              style={[st.yearBtn, selectedYear === year.toString() && st.yearBtnActive]}
              onPress={() => setSelectedYear(year.toString())}
            >
              <Text style={[st.yearText, selectedYear === year.toString() && st.yearTextActive]}>{year}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Month Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={st.filterScroll} contentContainerStyle={st.filterScrollContent}>
          {months.map(m => (
            <TouchableOpacity
              key={m.value}
              style={[st.filterChip, selectedMonth === m.value && st.filterChipActive]}
              onPress={() => setSelectedMonth(m.value)}
            >
              <Text style={[st.filterText, selectedMonth === m.value && st.filterTextActive]}>
                {m.label === 'All Months' ? 'All' : m.label.slice(0, 3)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.statusFilterRow}>
          {['all', 'completed', 'pending', 'in_progress'].map(s => (
            <TouchableOpacity
              key={s}
              style={[st.filterChip, selectedStatus === s && st.filterChipActive]}
              onPress={() => setSelectedStatus(s)}
            >
              <Text style={[st.filterText, selectedStatus === s && st.filterTextActive]}>
                {s === 'all' ? 'All Status' : s === 'in_progress' ? 'In Progress' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Service List */}
        <View style={st.listContainer}>
          {loading ? (
            <ActivityIndicator size="large" color={C.primary} style={{ marginTop: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={st.emptyBox}>
              <Icon name="time-outline" size={64} color={C.muted} />
              <Text style={st.emptyTitle}>
                {services.length === 0 ? 'No Service History' : 'No Results'}
              </Text>
              <Text style={st.emptyText}>
                {services.length === 0 ? 'Your service history will appear here' : 'No services match your filters'}
              </Text>
            </View>
          ) : (
            <>
              <Text style={st.listCount}>Showing {filtered.length} service(s)</Text>
              {filtered.map(item => (
                <ServiceCard key={item.id} item={item} />
              ))}
            </>
          )}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  summaryCard: {
    flex: 1, alignItems: 'center', backgroundColor: C.card, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border
  },
  summaryIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  summaryValue: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 8 },
  summaryLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginTop: 2 },

  chartsContainer: { paddingHorizontal: 16, paddingTop: 16, gap: 12 },
  spendingSection: { backgroundColor: C.card, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' },
  spendingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14 },
  spendingLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  spendingIconBox: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#EFF6FF', alignItems: 'center', justifyContent: 'center' },
  spendingTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  spendingBody: { padding: 14, paddingTop: 0 },
  barRow: { marginBottom: 14 },
  barInfo: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  barLabel: { fontSize: 13, fontWeight: '600', color: C.ink },
  barRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barCount: { fontSize: 11, color: C.muted },
  barAmount: { fontSize: 13, fontWeight: '700', color: C.ink },
  barTrack: { height: 6, backgroundColor: '#F1F5F9', borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, backgroundColor: C.primary, borderRadius: 3 },
  noData: { textAlign: 'center', color: C.muted, paddingVertical: 16 },

  searchContainer: { paddingHorizontal: 16, paddingTop: 16 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: C.border
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text },

  yearSelector: {
    flexDirection: 'row', justifyContent: 'center', gap: 8,
    paddingVertical: 12, paddingHorizontal: 16
  },
  yearBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border
  },
  yearBtnActive: { backgroundColor: C.primary, borderColor: C.primary },
  yearText: { fontSize: 14, fontWeight: '700', color: C.ink },
  yearTextActive: { color: '#fff' },

  filterScroll: { marginBottom: 4 },
  filterScrollContent: { paddingHorizontal: 16, gap: 6 },
  filterRow: { paddingHorizontal: 16, flexDirection: 'row', gap: 8 },
  statusFilterRow: { paddingHorizontal: 16, paddingVertical: 8, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  listContainer: { paddingHorizontal: 16, paddingTop: 8 },
  listCount: { fontSize: 13, color: C.muted, marginBottom: 12 },

  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: C.border
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between' },
  cardInfo: { flex: 1, marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: C.ink },
  cardDesc: { fontSize: 13, color: C.muted, marginTop: 4 },
  cardLocation: { fontSize: 12, color: C.muted, marginTop: 4 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontSize: 11, fontWeight: '600' },

  cardBottom: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  dateBox: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dateText: { fontSize: 12, color: C.muted },
  amountBox: { flexDirection: 'row', alignItems: 'center', gap: 2, backgroundColor: '#ECFDF5', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  rupee: { fontSize: 12, fontWeight: '700', color: C.ok },
  amount: { fontSize: 14, fontWeight: '700', color: C.ok },

  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
});
