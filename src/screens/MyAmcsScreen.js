import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  RefreshControl, Modal, ScrollView, Alert, ActivityIndicator
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

const getAmcStyle = (status) => {
  switch (status) {
    case 'active':
      return { bg: '#ECFDF5', border: '#D1FAE5', text: C.ok, icon: 'shield-checkmark', label: 'Active' };
    case 'expiring_soon':
      return { bg: '#FFFBEB', border: '#FDE68A', text: C.warn, icon: 'alert-circle', label: 'Expiring Soon' };
    case 'expired':
      return { bg: '#FEF2F2', border: '#FECACA', text: C.danger, icon: 'close-circle', label: 'Expired' };
    default:
      return { bg: '#F3F4F6', border: '#E5E7EB', text: C.muted, icon: 'time', label: 'Unknown' };
  }
};

export default function MyAmcsScreen({ navigation }) {
  const [amcs, setAmcs] = useState([]);
  const [summary, setSummary] = useState({ total: 0, active: 0, expiring_soon: 0, expired: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: null,
    equipment_name: '',
    vendor_name: '',
    contract_number: '',
    start_date: '',
    end_date: '',
    amount: '',
    service_visits_included: '',
    terms: ''
  });

  const fetchAmcs = useCallback(async () => {
    try {
      const { data } = await api.get('/restaurant-owner/my-amcs');
      setAmcs(data?.amcs || []);
      setSummary(data?.summary || { total: 0, active: 0, expiring_soon: 0, expired: 0 });
    } catch (error) {
      console.log('Error fetching AMCs:', error);
      Alert.alert('Error', 'Failed to load AMCs');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAmcs();
  }, [fetchAmcs]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAmcs();
  };

  const filtered = amcs.filter(a => {
    const q = search.toLowerCase();
    const okStatus = statusFilter === 'all' || a.amc_status === statusFilter;
    const okQ = !q || a.equipment_name?.toLowerCase().includes(q) || a.vendor_name?.toLowerCase().includes(q);
    return okStatus && okQ;
  });

  const openForm = (amc = null) => {
    if (amc) {
      setForm({
        id: amc.id,
        equipment_name: amc.equipment_name || '',
        vendor_name: amc.vendor_name || '',
        contract_number: amc.contract_number || '',
        start_date: amc.start_date || '',
        end_date: amc.end_date || '',
        amount: amc.amount?.toString() || '',
        service_visits_included: amc.service_visits_included?.toString() || '',
        terms: ''
      });
    } else {
      setForm({
        id: null, equipment_name: '', vendor_name: '', contract_number: '',
        start_date: '', end_date: '', amount: '', service_visits_included: '', terms: ''
      });
    }
    setModalVisible(true);
  };

  const saveAmc = async () => {
    if (!form.equipment_name.trim() || !form.start_date || !form.end_date) {
      Alert.alert('Error', 'Please fill required fields');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        equipment_name: form.equipment_name,
        vendor_name: form.vendor_name || null,
        contract_number: form.contract_number || null,
        start_date: form.start_date,
        end_date: form.end_date,
        amount: form.amount ? parseFloat(form.amount) : null,
        service_visits_included: form.service_visits_included ? parseInt(form.service_visits_included) : 0,
        terms: form.terms || null
      };

      if (form.id) {
        await api.put(`/restaurant-owner/my-amcs/${form.id}`, payload);
        Alert.alert('Success', 'AMC updated successfully');
      } else {
        await api.post('/restaurant-owner/my-amcs', payload);
        Alert.alert('Success', 'AMC added successfully');
      }

      setModalVisible(false);
      fetchAmcs();
    } catch (error) {
      Alert.alert('Error', 'Failed to save AMC');
    } finally {
      setSaving(false);
    }
  };

  const deleteAmc = (amc) => {
    Alert.alert(
      'Delete AMC',
      `Are you sure you want to delete "${amc.equipment_name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/restaurant-owner/my-amcs/${amc.id}`);
              setAmcs(prev => prev.filter(a => a.id !== amc.id));
              Alert.alert('Success', 'AMC deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete AMC');
            }
          }
        }
      ]
    );
  };

  const SummaryCard = ({ label, count, status }) => {
    const style = getAmcStyle(status === 'all' ? 'active' : status);
    return (
      <View style={[st.summaryCard, { backgroundColor: style.bg, borderColor: style.border }]}>
        <Icon name={style.icon} size={20} color={style.text} />
        <Text style={[st.summaryCount, { color: style.text }]}>{count}</Text>
        <Text style={st.summaryLabel}>{label}</Text>
      </View>
    );
  };

  const AmcCard = ({ item }) => {
    const style = getAmcStyle(item.amc_status);

    return (
      <TouchableOpacity
        style={[st.card, { borderColor: style.border }]}
        activeOpacity={0.9}
        onPress={() => setDetailModal(item)}
      >
        {/* Status Header */}
        <View style={[st.cardStatus, { backgroundColor: style.bg }]}>
          <View style={st.statusLeft}>
            <Icon name={style.icon} size={16} color={style.text} />
            <Text style={[st.statusText, { color: style.text }]}>{style.label}</Text>
          </View>
          {item.days_until_expiry >= 0 && (
            <Text style={[st.daysText, { color: style.text }]}>
              {item.days_until_expiry === 0 ? 'Expires today' : `${item.days_until_expiry} days left`}
            </Text>
          )}
        </View>

        <View style={st.cardBody}>
          <Text style={st.cardTitle}>{item.equipment_name}</Text>
          {item.vendor_name && (
            <Text style={st.cardSub}>Vendor: {item.vendor_name}</Text>
          )}

          <View style={st.statsRow}>
            <View style={st.statBox}>
              <Icon name="calendar-outline" size={14} color={C.muted} />
              <Text style={st.statText}>{item.start_date} to {item.end_date}</Text>
            </View>

            {item.service_visits_included > 0 && (
              <View style={st.statBox}>
                <Icon name="document-text-outline" size={14} color={C.muted} />
                <Text style={st.statText}>{item.service_visits_used}/{item.service_visits_included} visits</Text>
              </View>
            )}

            {item.amount && (
              <View style={st.statBox}>
                <Text style={st.rupee}>Rs</Text>
                <Text style={st.statText}>{item.amount}</Text>
              </View>
            )}
          </View>

          <View style={st.cardActions}>
            <TouchableOpacity style={st.actionBtn} onPress={() => setDetailModal(item)}>
              <Icon name="eye-outline" size={16} color={C.ink} />
              <Text style={st.actionText}>View</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openForm(item)}>
              <Icon name="pencil-outline" size={16} color={C.info} />
              <Text style={[st.actionText, { color: C.info }]}>Edit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => deleteAmc(item)}>
              <Icon name="trash-outline" size={16} color={C.danger} />
              <Text style={[st.actionText, { color: C.danger }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>My AMCs</Text>
        <TouchableOpacity onPress={() => openForm()} style={st.addBtn}>
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Summary Cards */}
      <View style={st.summaryRow}>
        <SummaryCard label="Active" count={summary.active} status="active" />
        <SummaryCard label="Expiring" count={summary.expiring_soon} status="expiring_soon" />
        <SummaryCard label="Expired" count={summary.expired} status="expired" />
      </View>

      {/* Search */}
      <View style={st.searchContainer}>
        <View style={st.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={st.searchInput}
            placeholder="Search AMCs..."
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

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.filterRow}
      >
        {['all', 'active', 'expiring_soon', 'expired'].map(s => {
          const style = getAmcStyle(s === 'all' ? 'active' : s);
          const isActive = statusFilter === s;
          return (
            <TouchableOpacity
              key={s}
              style={[st.filterChip, isActive && { backgroundColor: style.bg, borderColor: style.border }]}
              onPress={() => setStatusFilter(s)}
            >
              <Text style={[st.filterText, isActive && { color: style.text }]}>
                {s === 'all' ? 'All' : s === 'expiring_soon' ? 'Expiring' : s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => <AmcCard item={item} />}
          contentContainerStyle={st.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={st.emptyBox}>
              <Icon name="shield-outline" size={64} color={C.muted} />
              <Text style={st.emptyTitle}>
                {amcs.length === 0 ? 'No AMCs Yet' : 'No Results'}
              </Text>
              <Text style={st.emptyText}>
                {amcs.length === 0 ? 'Add your first AMC to get started' : 'No AMCs match your search'}
              </Text>
              {amcs.length === 0 && (
                <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
                  <Icon name="add" size={18} color="#fff" />
                  <Text style={st.emptyBtnText}>Add AMC</Text>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{form.id ? 'Edit AMC' : 'Add AMC'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
              <Text style={st.label}>Equipment Name *</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., Gas Range AMC"
                placeholderTextColor={C.muted}
                value={form.equipment_name}
                onChangeText={v => setForm(f => ({ ...f, equipment_name: v }))}
              />

              <Text style={st.label}>Vendor Name</Text>
              <TextInput
                style={st.input}
                placeholder="Vendor name"
                placeholderTextColor={C.muted}
                value={form.vendor_name}
                onChangeText={v => setForm(f => ({ ...f, vendor_name: v }))}
              />

              <Text style={st.label}>Contract Number</Text>
              <TextInput
                style={st.input}
                placeholder="Contract #"
                placeholderTextColor={C.muted}
                value={form.contract_number}
                onChangeText={v => setForm(f => ({ ...f, contract_number: v }))}
              />

              <Text style={st.label}>Start Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={st.input}
                placeholder="2024-01-01"
                placeholderTextColor={C.muted}
                value={form.start_date}
                onChangeText={v => setForm(f => ({ ...f, start_date: v }))}
              />

              <Text style={st.label}>End Date * (YYYY-MM-DD)</Text>
              <TextInput
                style={st.input}
                placeholder="2025-01-01"
                placeholderTextColor={C.muted}
                value={form.end_date}
                onChangeText={v => setForm(f => ({ ...f, end_date: v }))}
              />

              <Text style={st.label}>Amount (Rs)</Text>
              <TextInput
                style={st.input}
                placeholder="AMC amount"
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                value={form.amount}
                onChangeText={v => setForm(f => ({ ...f, amount: v }))}
              />

              <Text style={st.label}>Service Visits Included</Text>
              <TextInput
                style={st.input}
                placeholder="Number of visits"
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                value={form.service_visits_included}
                onChangeText={v => setForm(f => ({ ...f, service_visits_included: v }))}
              />

              <Text style={st.label}>Terms & Conditions</Text>
              <TextInput
                style={[st.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="AMC terms"
                placeholderTextColor={C.muted}
                multiline
                value={form.terms}
                onChangeText={v => setForm(f => ({ ...f, terms: v }))}
              />
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveAmc} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.saveText}>{form.id ? 'Save Changes' : 'Add AMC'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Detail Modal */}
      <Modal visible={!!detailModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>{detailModal?.equipment_name}</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
              {detailModal && (
                <>
                  <View style={[st.statusBadge, { backgroundColor: getAmcStyle(detailModal.amc_status).bg }]}>
                    <Icon name={getAmcStyle(detailModal.amc_status).icon} size={16} color={getAmcStyle(detailModal.amc_status).text} />
                    <Text style={[st.statusBadgeText, { color: getAmcStyle(detailModal.amc_status).text }]}>
                      {getAmcStyle(detailModal.amc_status).label}
                    </Text>
                  </View>

                  {detailModal.vendor_name && (
                    <View style={st.detailRow}>
                      <Text style={st.detailLabel}>Vendor</Text>
                      <Text style={st.detailValue}>{detailModal.vendor_name}</Text>
                    </View>
                  )}

                  {detailModal.contract_number && (
                    <View style={st.detailRow}>
                      <Text style={st.detailLabel}>Contract Number</Text>
                      <Text style={st.detailValue}>{detailModal.contract_number}</Text>
                    </View>
                  )}

                  <View style={st.detailRow}>
                    <Text style={st.detailLabel}>Period</Text>
                    <Text style={st.detailValue}>{detailModal.start_date} to {detailModal.end_date}</Text>
                  </View>

                  {detailModal.amount && (
                    <View style={st.detailRow}>
                      <Text style={st.detailLabel}>Amount</Text>
                      <Text style={st.detailValue}>Rs {detailModal.amount}</Text>
                    </View>
                  )}

                  {detailModal.service_visits_included > 0 && (
                    <View style={st.detailRow}>
                      <Text style={st.detailLabel}>Service Visits</Text>
                      <Text style={st.detailValue}>
                        {detailModal.service_visits_used} used out of {detailModal.service_visits_included} ({detailModal.remaining_visits} remaining)
                      </Text>
                    </View>
                  )}

                  {detailModal.restaurant && (
                    <View style={st.detailRow}>
                      <Text style={st.detailLabel}>Location</Text>
                      <Text style={st.detailValue}>{detailModal.restaurant.name}</Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity
                style={[st.saveBtn, { flex: 1 }]}
                onPress={() => {
                  setDetailModal(null);
                  openForm(detailModal);
                }}
              >
                <Icon name="pencil-outline" size={18} color="#fff" />
                <Text style={st.saveText}> Edit AMC</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  addBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 12, gap: 10 },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12,
    borderWidth: 1
  },
  summaryCount: { fontSize: 22, fontWeight: '900', marginTop: 4 },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: C.muted, marginTop: 2 },

  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: C.border
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text },

  filterRow: { paddingHorizontal: 16, paddingVertical: 10 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },

  list: { padding: 16, paddingBottom: 100 },
  card: { backgroundColor: C.card, borderRadius: 16, marginBottom: 12, borderWidth: 1, overflow: 'hidden' },
  cardStatus: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12, paddingVertical: 8 },
  statusLeft: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusText: { fontSize: 12, fontWeight: '700' },
  daysText: { fontSize: 11, fontWeight: '600' },

  cardBody: { padding: 12 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, backgroundColor: C.bg },
  statText: { fontSize: 11, fontWeight: '600', color: C.muted },
  rupee: { fontSize: 12, fontWeight: '700', color: C.muted },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bg
  },
  actionText: { fontSize: 12, fontWeight: '700', color: C.ink },

  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: C.primary
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 16, borderBottomWidth: 1, borderBottomColor: C.border
  },
  modalTitle: { fontSize: 18, fontWeight: '900', color: C.ink },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  label: { fontSize: 12, fontWeight: '700', color: C.muted, marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: C.text, borderWidth: 1, borderColor: C.border
  },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', gap: 6
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, alignSelf: 'flex-start', marginBottom: 16 },
  statusBadgeText: { fontSize: 13, fontWeight: '700' },

  detailRow: { marginBottom: 16 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '600', color: C.ink },
});
