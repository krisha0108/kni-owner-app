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

const categories = [
  'Cooking Equipment',
  'Refrigeration',
  'HVAC',
  'Dishwashing',
  'Food Preparation',
  'Storage',
  'Other'
];

const serviceFilters = [
  { key: 'all', label: 'All', icon: 'list-outline' },
  { key: 'needs_service', label: 'Needs Service', icon: 'alert-circle-outline' },
  { key: 'recently_serviced', label: 'Recently Serviced', icon: 'checkmark-circle-outline' },
  { key: 'pending_service', label: 'Pending Service', icon: 'time-outline' },
  { key: 'has_amc', label: 'Has AMC', icon: 'shield-checkmark-outline' },
];

const getWarrantyStyle = (status) => {
  switch (status) {
    case 'active':
      return { bg: '#ECFDF5', text: C.ok, icon: 'shield-checkmark-outline', label: 'Active' };
    case 'expiring_soon':
      return { bg: '#FFFBEB', text: C.warn, icon: 'alert-circle-outline', label: 'Expiring Soon' };
    case 'expired':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle-outline', label: 'Expired' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'time-outline', label: 'Unknown' };
  }
};

export default function MyEquipmentScreen({ navigation }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModal, setDetailModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: '',
    brand: '',
    model_number: '',
    serial_number: '',
    purchase_date: '',
    warranty_end_date: '',
    category: '',
    description: '',
    restaurant_id: ''
  });

  const fetchEquipments = useCallback(async () => {
    try {
      const { data } = await api.get('/restaurant-owner/my-equipment');
      setEquipments(data?.equipments || []);
    } catch (error) {
      console.log('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEquipments();
  }, [fetchEquipments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipments();
  };

  const filtered = equipments.filter(e => {
    const q = search.toLowerCase();
    const okCat = category === 'all' || e.category === category;
    const okQ = !q || e.name?.toLowerCase().includes(q) || e.brand?.toLowerCase().includes(q);

    // Service filter logic
    let okService = true;
    if (serviceFilter !== 'all') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

      const lastServiceDate = e.last_service_date ? new Date(e.last_service_date) : null;

      switch (serviceFilter) {
        case 'needs_service':
          // Needs service if no service in last 90 days or never serviced
          okService = !lastServiceDate || lastServiceDate < ninetyDaysAgo;
          break;
        case 'recently_serviced':
          // Recently serviced if serviced in last 30 days
          okService = lastServiceDate && lastServiceDate >= thirtyDaysAgo;
          break;
        case 'pending_service':
          // Has pending service request
          okService = e.has_pending_service === true;
          break;
        case 'has_amc':
          // Has active AMC
          okService = e.has_active_amc === true;
          break;
        default:
          okService = true;
      }
    }

    return okCat && okQ && okService;
  });

  const openForm = (equipment = null) => {
    if (equipment) {
      setForm({
        id: equipment.id,
        name: equipment.name || '',
        brand: equipment.brand || '',
        model_number: equipment.model_number || '',
        serial_number: equipment.serial_number || '',
        purchase_date: equipment.purchase_date || '',
        warranty_end_date: equipment.warranty_end_date || '',
        category: equipment.category || '',
        description: equipment.description || '',
        restaurant_id: equipment.restaurant?.id?.toString() || ''
      });
    } else {
      setForm({
        id: null, name: '', brand: '', model_number: '', serial_number: '',
        purchase_date: '', warranty_end_date: '', category: '', description: '', restaurant_id: ''
      });
    }
    setModalVisible(true);
  };

  const saveEquipment = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter equipment name');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        brand: form.brand || null,
        model_number: form.model_number || null,
        serial_number: form.serial_number || null,
        purchase_date: form.purchase_date || null,
        warranty_end_date: form.warranty_end_date || null,
        category: form.category || null,
        description: form.description || null,
        restaurant_id: form.restaurant_id ? parseInt(form.restaurant_id) : null
      };

      if (form.id) {
        await api.put(`/restaurant-owner/my-equipment/${form.id}`, payload);
        Alert.alert('Success', 'Equipment updated successfully');
      } else {
        await api.post('/restaurant-owner/my-equipment', payload);
        Alert.alert('Success', 'Equipment added successfully');
      }

      setModalVisible(false);
      fetchEquipments();
    } catch (error) {
      Alert.alert('Error', 'Failed to save equipment');
    } finally {
      setSaving(false);
    }
  };

  const deleteEquipment = (equipment) => {
    Alert.alert(
      'Delete Equipment',
      `Are you sure you want to delete "${equipment.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/restaurant-owner/my-equipment/${equipment.id}`);
              setEquipments(prev => prev.filter(e => e.id !== equipment.id));
              Alert.alert('Success', 'Equipment deleted');
            } catch (error) {
              Alert.alert('Error', 'Failed to delete equipment');
            }
          }
        }
      ]
    );
  };

  const EquipmentCard = ({ item }) => {
    const ws = getWarrantyStyle(item.warranty_status);

    return (
      <TouchableOpacity
        style={st.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EquipmentProfile', { equipmentId: item.id })}
      >
        <View style={st.cardHeader}>
          <View style={st.iconBox}>
            <Icon name="hardware-chip-outline" size={24} color={C.primary} />
          </View>
          <View style={st.cardInfo}>
            <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.brand && (
              <Text style={st.cardSub}>
                {item.brand}{item.model_number ? ` - ${item.model_number}` : ''}
              </Text>
            )}
            {item.category && (
              <View style={st.catBadge}>
                <Text style={st.catText}>{item.category}</Text>
              </View>
            )}
          </View>
        </View>

        <View style={st.statsRow}>
          {item.warranty_end_date && (
            <View style={[st.statBox, { backgroundColor: ws.bg }]}>
              <Icon name={ws.icon} size={14} color={ws.text} />
              <Text style={[st.statLabel, { color: ws.text }]}>
                {item.warranty_status === 'expired' ? 'Expired' : item.warranty_end_date}
              </Text>
            </View>
          )}

          {item.has_active_amc && (
            <View style={[st.statBox, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="shield-checkmark" size={14} color={C.info} />
              <Text style={[st.statLabel, { color: C.info }]}>AMC Active</Text>
            </View>
          )}

          {item.last_service_date && (
            <View style={[st.statBox, { backgroundColor: '#F3F4F6' }]}>
              <Icon name="construct-outline" size={14} color={C.muted} />
              <Text style={st.statLabel}>{item.last_service_date}</Text>
            </View>
          )}
        </View>

        <View style={st.cardActions}>
          <TouchableOpacity
            style={[st.actionBtn, st.requestServiceBtn]}
            onPress={() => navigation.navigate('RequestNow', {
              selectedEquipment: { id: item.id, name: item.name }
            })}
          >
            <Icon name="construct" size={16} color="#fff" />
            <Text style={[st.actionText, { color: '#fff' }]}>Request Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.actionBtn} onPress={() => navigation.navigate('EquipmentProfile', { equipmentId: item.id })}>
            <Icon name="eye-outline" size={16} color={C.ink} />
            <Text style={st.actionText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#EFF6FF' }]} onPress={() => openForm(item)}>
            <Icon name="pencil-outline" size={16} color={C.info} />
            <Text style={[st.actionText, { color: C.info }]}>Edit</Text>
          </TouchableOpacity>
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
        <Text style={st.headerTitle}>My Equipment</Text>
        <TouchableOpacity onPress={() => openForm()} style={st.addBtn}>
          <Icon name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={st.searchContainer}>
        <View style={st.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={st.searchInput}
            placeholder="Search equipment..."
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

      {/* Service Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={st.filterRow}
      >
        {serviceFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[st.serviceFilterChip, serviceFilter === filter.key && st.serviceFilterChipActive]}
            onPress={() => setServiceFilter(filter.key)}
          >
            <Icon
              name={filter.icon}
              size={14}
              color={serviceFilter === filter.key ? '#fff' : C.ink}
            />
            <Text style={[st.serviceFilterText, serviceFilter === filter.key && st.serviceFilterTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[st.filterRow, { paddingTop: 0 }]}
      >
        <TouchableOpacity
          style={[st.filterChip, category === 'all' && st.filterChipActive]}
          onPress={() => setCategory('all')}
        >
          <Text style={[st.filterText, category === 'all' && st.filterTextActive]}>All</Text>
        </TouchableOpacity>
        {categories.map(cat => (
          <TouchableOpacity
            key={cat}
            style={[st.filterChip, category === cat && st.filterChipActive]}
            onPress={() => setCategory(cat)}
          >
            <Text style={[st.filterText, category === cat && st.filterTextActive]}>{cat}</Text>
          </TouchableOpacity>
        ))}
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
          renderItem={({ item }) => <EquipmentCard item={item} />}
          contentContainerStyle={st.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
          }
          ListEmptyComponent={
            <View style={st.emptyBox}>
              <Icon name="hardware-chip-outline" size={64} color={C.muted} />
              <Text style={st.emptyTitle}>
                {equipments.length === 0 ? 'No Equipment Yet' : 'No Results'}
              </Text>
              <Text style={st.emptyText}>
                {equipments.length === 0 ? 'Add your first equipment to get started' : 'No equipment matches your search'}
              </Text>
              {equipments.length === 0 && (
                <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
                  <Icon name="add" size={18} color="#fff" />
                  <Text style={st.emptyBtnText}>Add Equipment</Text>
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
              <Text style={st.modalTitle}>{form.id ? 'Edit Equipment' : 'Add Equipment'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
              <Text style={st.label}>Equipment Name *</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., Gas Range, Deep Fryer"
                placeholderTextColor={C.muted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={st.label}>Brand</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., Samsung, LG"
                placeholderTextColor={C.muted}
                value={form.brand}
                onChangeText={v => setForm(f => ({ ...f, brand: v }))}
              />

              <Text style={st.label}>Model Number</Text>
              <TextInput
                style={st.input}
                placeholder="Model number"
                placeholderTextColor={C.muted}
                value={form.model_number}
                onChangeText={v => setForm(f => ({ ...f, model_number: v }))}
              />

              <Text style={st.label}>Serial Number</Text>
              <TextInput
                style={st.input}
                placeholder="Serial number"
                placeholderTextColor={C.muted}
                value={form.serial_number}
                onChangeText={v => setForm(f => ({ ...f, serial_number: v }))}
              />

              <Text style={st.label}>Category</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
                {categories.map(cat => (
                  <TouchableOpacity
                    key={cat}
                    style={[st.filterChip, form.category === cat && st.filterChipActive]}
                    onPress={() => setForm(f => ({ ...f, category: cat }))}
                  >
                    <Text style={[st.filterText, form.category === cat && st.filterTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={st.label}>Purchase Date (YYYY-MM-DD)</Text>
              <TextInput
                style={st.input}
                placeholder="2024-01-15"
                placeholderTextColor={C.muted}
                value={form.purchase_date}
                onChangeText={v => setForm(f => ({ ...f, purchase_date: v }))}
              />

              <Text style={st.label}>Warranty End Date (YYYY-MM-DD)</Text>
              <TextInput
                style={st.input}
                placeholder="2025-01-15"
                placeholderTextColor={C.muted}
                value={form.warranty_end_date}
                onChangeText={v => setForm(f => ({ ...f, warranty_end_date: v }))}
              />

              <Text style={st.label}>Description</Text>
              <TextInput
                style={[st.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Additional notes"
                placeholderTextColor={C.muted}
                multiline
                value={form.description}
                onChangeText={v => setForm(f => ({ ...f, description: v }))}
              />
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveEquipment} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.saveText}>{form.id ? 'Save Changes' : 'Add Equipment'}</Text>
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
              <Text style={st.modalTitle}>{detailModal?.name}</Text>
              <TouchableOpacity onPress={() => setDetailModal(null)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
              {detailModal?.brand && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Brand & Model</Text>
                  <Text style={st.detailValue}>
                    {detailModal.brand}{detailModal.model_number ? ` - ${detailModal.model_number}` : ''}
                  </Text>
                </View>
              )}

              {detailModal?.serial_number && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Serial Number</Text>
                  <Text style={st.detailValue}>{detailModal.serial_number}</Text>
                </View>
              )}

              {detailModal?.category && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Category</Text>
                  <Text style={st.detailValue}>{detailModal.category}</Text>
                </View>
              )}

              {detailModal?.purchase_date && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Purchase Date</Text>
                  <Text style={st.detailValue}>{detailModal.purchase_date}</Text>
                </View>
              )}

              {detailModal?.warranty_end_date && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Warranty Until</Text>
                  <Text style={[st.detailValue, { color: getWarrantyStyle(detailModal.warranty_status).text }]}>
                    {detailModal.warranty_end_date}
                    {detailModal.warranty_status === 'expired' && ' (Expired)'}
                  </Text>
                </View>
              )}

              {detailModal?.last_service_date && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Last Service</Text>
                  <Text style={st.detailValue}>{detailModal.last_service_date}</Text>
                </View>
              )}

              {detailModal?.service_count > 0 && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Total Services</Text>
                  <Text style={st.detailValue}>{detailModal.service_count} service(s) completed</Text>
                </View>
              )}

              {detailModal?.restaurant && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Location</Text>
                  <Text style={st.detailValue}>{detailModal.restaurant.name}</Text>
                </View>
              )}

              {detailModal?.description && (
                <View style={st.detailRow}>
                  <Text style={st.detailLabel}>Description</Text>
                  <Text style={st.detailValue}>{detailModal.description}</Text>
                </View>
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
                <Text style={st.saveText}> Edit Equipment</Text>
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

  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: C.border
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text },

  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  serviceFilterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  serviceFilterChipActive: { backgroundColor: C.info, borderColor: C.info },
  serviceFilterText: { fontSize: 12, fontWeight: '600', color: C.ink },
  serviceFilterTextActive: { color: '#fff' },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border
  },
  cardHeader: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center'
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  catBadge: { marginTop: 6, paddingHorizontal: 8, paddingVertical: 3, backgroundColor: C.bg, borderRadius: 8, alignSelf: 'flex-start' },
  catText: { fontSize: 11, fontWeight: '600', color: C.muted },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.muted },

  cardActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: C.bg
  },
  actionText: { fontSize: 12, fontWeight: '700', color: C.ink },
  requestServiceBtn: { backgroundColor: C.primary },

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

  detailRow: { marginBottom: 16 },
  detailLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 4 },
  detailValue: { fontSize: 15, fontWeight: '600', color: C.ink },
});
