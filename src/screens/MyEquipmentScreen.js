import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  RefreshControl, Modal, ScrollView, Alert, ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, getImageUrl } from '../api/client';

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

const statusFilters = [
  { key: 'all', label: 'All', icon: 'list-outline' },
  { key: 'AVAILABLE', label: 'Available', icon: 'checkmark-circle-outline' },
  { key: 'IN_USE', label: 'In Use', icon: 'play-circle-outline' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: 'construct-outline' },
  { key: 'RETIRED', label: 'Retired', icon: 'archive-outline' },
];

const warrantyFilters = [
  { key: 'all', label: 'All Warranty' },
  { key: 'active', label: 'Active' },
  { key: 'expiring', label: 'Expiring Soon' },
  { key: 'expired', label: 'Expired' },
  { key: 'no-warranty', label: 'No Warranty' },
];

const getWarrantyStatus = (warrantyEndDate) => {
  if (!warrantyEndDate) {
    return { color: 'gray', label: 'No Warranty' };
  }
  const endDate = new Date(warrantyEndDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

  if (endDate < now) {
    return { color: 'red', label: 'Expired' };
  } else if (endDate <= thirtyDaysFromNow) {
    return { color: 'yellow', label: 'Expiring Soon' };
  }
  return { color: 'green', label: 'Active' };
};

const getWarrantyStyle = (status) => {
  switch (status.color) {
    case 'green':
      return { bg: '#ECFDF5', text: C.ok, icon: 'shield-checkmark-outline' };
    case 'yellow':
      return { bg: '#FFFBEB', text: C.warn, icon: 'alert-circle-outline' };
    case 'red':
      return { bg: '#FEF2F2', text: C.danger, icon: 'close-circle-outline' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'time-outline' };
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'AVAILABLE':
      return { bg: '#ECFDF5', text: C.ok, label: 'Available' };
    case 'IN_USE':
      return { bg: '#EFF6FF', text: C.info, label: 'In Use' };
    case 'MAINTENANCE':
      return { bg: '#FFFBEB', text: C.warn, label: 'Maintenance' };
    case 'RETIRED':
      return { bg: '#F3F4F6', text: C.muted, label: 'Retired' };
    default:
      return { bg: '#F3F4F6', text: C.muted, label: status };
  }
};

export default function MyEquipmentScreen({ navigation }) {
  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warrantyFilter, setWarrantyFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    id: null,
    name: '',
    category: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyEndDate: '',
    notes: '',
    billImageUrl: '',
    warrantyCardUrl: '',
    photoUrls: [],
  });

  // Fetch restaurants
  const fetchRestaurants = useCallback(async () => {
    try {
      const { data } = await api.get('/owner/restaurants');
      if (data.ok && data.data) {
        setRestaurants(data.data);
        if (data.data.length > 0 && !selectedRestaurant) {
          const approved = data.data.find(r => r.status === 'APPROVED');
          setSelectedRestaurant(approved || data.data[0]);
        }
      }
    } catch (error) {
      console.log('Error fetching restaurants:', error);
    }
  }, [selectedRestaurant]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/public/subcategories');
      if (data.ok && data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  }, []);

  // Fetch equipment
  const fetchEquipments = useCallback(async () => {
    if (!selectedRestaurant) return;
    try {
      const { data } = await api.get(`/owner/equipment?restaurantId=${selectedRestaurant.id}`);
      if (data.ok && data.data) {
        setEquipments(data.data.items || []);
      }
    } catch (error) {
      console.log('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurant]);

  useEffect(() => {
    fetchRestaurants();
    fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRestaurant) {
      setLoading(true);
      fetchEquipments();
    }
  }, [selectedRestaurant, fetchEquipments]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipments();
  };

  // Filter equipment
  const filtered = equipments.filter(e => {
    const q = search.toLowerCase();
    const okQ = !q ||
      e.name?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.serialNumber?.toLowerCase().includes(q);

    // Status filter
    const okStatus = statusFilter === 'all' || e.status === statusFilter;

    // Warranty filter
    let okWarranty = true;
    if (warrantyFilter !== 'all') {
      const ws = getWarrantyStatus(e.warrantyEndDate);
      if (warrantyFilter === 'active' && ws.color !== 'green') okWarranty = false;
      if (warrantyFilter === 'expiring' && ws.color !== 'yellow') okWarranty = false;
      if (warrantyFilter === 'expired' && ws.color !== 'red') okWarranty = false;
      if (warrantyFilter === 'no-warranty' && ws.color !== 'gray') okWarranty = false;
    }

    return okQ && okStatus && okWarranty;
  });

  const openForm = (equipment = null) => {
    if (equipment) {
      setForm({
        id: equipment.id,
        name: equipment.name || '',
        category: equipment.category || '',
        serialNumber: equipment.serialNumber || '',
        purchaseDate: equipment.purchaseDate ? equipment.purchaseDate.split('T')[0] : '',
        warrantyEndDate: equipment.warrantyEndDate ? equipment.warrantyEndDate.split('T')[0] : '',
        notes: equipment.notes || '',
        billImageUrl: equipment.billImageUrl || '',
        warrantyCardUrl: equipment.warrantyCardUrl || '',
        photoUrls: equipment.photoUrls || [],
      });
    } else {
      setForm({
        id: null,
        name: '',
        category: '',
        serialNumber: '',
        purchaseDate: '',
        warrantyEndDate: '',
        notes: '',
        billImageUrl: '',
        warrantyCardUrl: '',
        photoUrls: [],
      });
    }
    setModalVisible(true);
  };

  // Image upload
  const uploadImage = async (type) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      });

      if (result.didCancel || !result.assets?.[0]) return;

      setUploading(true);

      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || `image-${Date.now()}.jpg`,
      });
      formData.append('folder', `equipment/${type}`);

      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (data.ok && data.url) {
        if (type === 'bills') {
          setForm(f => ({ ...f, billImageUrl: data.url }));
        } else if (type === 'warranty-cards') {
          setForm(f => ({ ...f, warrantyCardUrl: data.url }));
        } else if (type === 'photos') {
          if (form.photoUrls.length < 5) {
            setForm(f => ({ ...f, photoUrls: [...f.photoUrls, data.url] }));
          } else {
            Alert.alert('Limit Reached', 'Maximum 5 photos allowed');
          }
        }
      } else {
        Alert.alert('Error', 'Failed to upload image');
      }
    } catch (error) {
      console.log('Upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => {
    setForm(f => ({
      ...f,
      photoUrls: f.photoUrls.filter((_, i) => i !== index)
    }));
  };

  const saveEquipment = async () => {
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter equipment name');
      return;
    }
    if (!form.category) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!form.purchaseDate) {
      Alert.alert('Error', 'Please enter purchase date');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        restaurantId: selectedRestaurant.id,
        name: form.name,
        category: form.category,
        serialNumber: form.serialNumber || undefined,
        purchaseDate: new Date(form.purchaseDate).toISOString(),
        warrantyEndDate: form.warrantyEndDate ? new Date(form.warrantyEndDate).toISOString() : undefined,
        notes: form.notes || undefined,
        billImageUrl: form.billImageUrl || undefined,
        warrantyCardUrl: form.warrantyCardUrl || undefined,
        photoUrls: form.photoUrls.length > 0 ? form.photoUrls : undefined,
      };

      if (form.id) {
        await api.patch(`/owner/equipment/${form.id}`, payload);
        Alert.alert('Success', 'Equipment updated successfully');
      } else {
        await api.post('/owner/equipment', payload);
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
              await api.delete(`/owner/equipment/${equipment.id}`);
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
    const ws = getWarrantyStatus(item.warrantyEndDate);
    const wStyle = getWarrantyStyle(ws);
    const sStyle = getStatusStyle(item.status);
    const photoCount = item.photoUrls?.length || 0;

    return (
      <TouchableOpacity
        style={st.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EquipmentProfile', { equipmentId: item.id })}
      >
        <View style={st.cardHeader}>
          <View style={st.iconBox}>
            {photoCount > 0 ? (
              <Image source={{ uri: getImageUrl(item.photoUrls[0]) }} style={st.cardImage} />
            ) : (
              <Icon name="hardware-chip-outline" size={24} color={C.primary} />
            )}
          </View>
          <View style={st.cardInfo}>
            <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
            {item.category && (
              <Text style={st.cardSub} numberOfLines={1}>{item.category}</Text>
            )}
            {item.serialNumber && (
              <Text style={st.serialText}>SN: {item.serialNumber}</Text>
            )}
          </View>
          {photoCount > 1 && (
            <View style={st.photoBadge}>
              <Icon name="images-outline" size={12} color={C.muted} />
              <Text style={st.photoBadgeText}>{photoCount}</Text>
            </View>
          )}
        </View>

        <View style={st.statsRow}>
          <View style={[st.statBox, { backgroundColor: sStyle.bg }]}>
            <Text style={[st.statLabel, { color: sStyle.text }]}>{sStyle.label}</Text>
          </View>

          <View style={[st.statBox, { backgroundColor: wStyle.bg }]}>
            <Icon name={wStyle.icon} size={14} color={wStyle.text} />
            <Text style={[st.statLabel, { color: wStyle.text }]}>{ws.label}</Text>
          </View>

          {item.purchaseDate && (
            <View style={[st.statBox, { backgroundColor: '#F3F4F6' }]}>
              <Icon name="calendar-outline" size={14} color={C.muted} />
              <Text style={st.statLabel}>{item.purchaseDate.split('T')[0]}</Text>
            </View>
          )}
        </View>

        {/* Document indicators */}
        {(item.billImageUrl || item.warrantyCardUrl) && (
          <View style={st.docsRow}>
            {item.billImageUrl && (
              <View style={st.docBadge}>
                <Icon name="document-text-outline" size={12} color={C.info} />
                <Text style={st.docBadgeText}>Bill</Text>
              </View>
            )}
            {item.warrantyCardUrl && (
              <View style={st.docBadge}>
                <Icon name="shield-checkmark-outline" size={12} color={C.ok} />
                <Text style={st.docBadgeText}>Warranty Card</Text>
              </View>
            )}
          </View>
        )}

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
          </TouchableOpacity>
          <TouchableOpacity style={[st.actionBtn, { backgroundColor: '#FEF2F2' }]} onPress={() => deleteEquipment(item)}>
            <Icon name="trash-outline" size={16} color={C.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // Restaurant picker modal
  const [restaurantPickerVisible, setRestaurantPickerVisible] = useState(false);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);

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

      {/* Restaurant Selector */}
      {restaurants.length > 1 && (
        <TouchableOpacity
          style={st.restaurantSelector}
          onPress={() => setRestaurantPickerVisible(true)}
        >
          <Icon name="business-outline" size={18} color={C.ink} />
          <Text style={st.restaurantName} numberOfLines={1}>
            {selectedRestaurant?.name || 'Select Restaurant'}
          </Text>
          <Icon name="chevron-down" size={18} color={C.muted} />
        </TouchableOpacity>
      )}

      {/* Search */}
      <View style={st.searchContainer}>
        <View style={st.searchBox}>
          <Icon name="search-outline" size={18} color={C.muted} />
          <TextInput
            style={st.searchInput}
            placeholder="Search by name, category, serial..."
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
        {statusFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[st.filterChip, statusFilter === filter.key && st.filterChipActive]}
            onPress={() => setStatusFilter(filter.key)}
          >
            <Icon
              name={filter.icon}
              size={14}
              color={statusFilter === filter.key ? '#fff' : C.ink}
            />
            <Text style={[st.filterText, statusFilter === filter.key && st.filterTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Warranty Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[st.filterRow, { paddingTop: 0 }]}
      >
        {warrantyFilters.map(filter => (
          <TouchableOpacity
            key={filter.key}
            style={[st.warrantyChip, warrantyFilter === filter.key && st.warrantyChipActive]}
            onPress={() => setWarrantyFilter(filter.key)}
          >
            <Text style={[st.warrantyText, warrantyFilter === filter.key && st.warrantyTextActive]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Results count */}
      <View style={st.resultsRow}>
        <Text style={st.resultsText}>
          Showing {filtered.length} of {equipments.length} equipment
        </Text>
      </View>

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
                {equipments.length === 0 ? 'Add your first equipment to get started' : 'No equipment matches your filters'}
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
                placeholder="e.g., Commercial Oven"
                placeholderTextColor={C.muted}
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={st.label}>Category *</Text>
              <TouchableOpacity
                style={st.pickerBtn}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text style={form.category ? st.pickerText : st.pickerPlaceholder}>
                  {form.category || 'Select category'}
                </Text>
                <Icon name="chevron-down" size={18} color={C.muted} />
              </TouchableOpacity>

              <Text style={st.label}>Serial Number</Text>
              <TextInput
                style={st.input}
                placeholder="ABC123456"
                placeholderTextColor={C.muted}
                value={form.serialNumber}
                onChangeText={v => setForm(f => ({ ...f, serialNumber: v }))}
              />

              <Text style={st.label}>Purchase Date *</Text>
              <TextInput
                style={st.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.muted}
                value={form.purchaseDate}
                onChangeText={v => setForm(f => ({ ...f, purchaseDate: v }))}
              />

              <Text style={st.label}>Warranty End Date</Text>
              <TextInput
                style={st.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.muted}
                value={form.warrantyEndDate}
                onChangeText={v => setForm(f => ({ ...f, warrantyEndDate: v }))}
              />

              <Text style={st.label}>Notes</Text>
              <TextInput
                style={[st.input, { height: 80, textAlignVertical: 'top' }]}
                placeholder="Additional notes about the equipment"
                placeholderTextColor={C.muted}
                multiline
                value={form.notes}
                onChangeText={v => setForm(f => ({ ...f, notes: v }))}
              />

              {/* Bill Image Upload */}
              <Text style={st.label}>Product Bill Image</Text>
              {form.billImageUrl ? (
                <View style={st.imagePreviewBox}>
                  <Image source={{ uri: getImageUrl(form.billImageUrl) }} style={st.imagePreview} />
                  <TouchableOpacity
                    style={st.removeImageBtn}
                    onPress={() => setForm(f => ({ ...f, billImageUrl: '' }))}
                  >
                    <Icon name="close-circle" size={24} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={st.uploadBtn}
                  onPress={() => uploadImage('bills')}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <Icon name="cloud-upload-outline" size={24} color={C.primary} />
                      <Text style={st.uploadText}>Upload Bill Image</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Warranty Card Upload */}
              <Text style={st.label}>Warranty Card Image</Text>
              {form.warrantyCardUrl ? (
                <View style={st.imagePreviewBox}>
                  <Image source={{ uri: getImageUrl(form.warrantyCardUrl) }} style={st.imagePreview} />
                  <TouchableOpacity
                    style={st.removeImageBtn}
                    onPress={() => setForm(f => ({ ...f, warrantyCardUrl: '' }))}
                  >
                    <Icon name="close-circle" size={24} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={st.uploadBtn}
                  onPress={() => uploadImage('warranty-cards')}
                  disabled={uploading}
                >
                  {uploading ? (
                    <ActivityIndicator size="small" color={C.primary} />
                  ) : (
                    <>
                      <Icon name="shield-checkmark-outline" size={24} color={C.primary} />
                      <Text style={st.uploadText}>Upload Warranty Card</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Equipment Photos (Multiple) */}
              <Text style={st.label}>Equipment Photos (Max 5)</Text>
              <View style={st.photosGrid}>
                {form.photoUrls.map((url, index) => (
                  <View key={index} style={st.photoItem}>
                    <Image source={{ uri: getImageUrl(url) }} style={st.photoImage} />
                    <TouchableOpacity
                      style={st.removePhotoBtn}
                      onPress={() => removePhoto(index)}
                    >
                      <Icon name="close-circle" size={20} color={C.danger} />
                    </TouchableOpacity>
                    <View style={st.photoIndex}>
                      <Text style={st.photoIndexText}>{index + 1}</Text>
                    </View>
                  </View>
                ))}
                {form.photoUrls.length < 5 && (
                  <TouchableOpacity
                    style={st.addPhotoBtn}
                    onPress={() => uploadImage('photos')}
                    disabled={uploading}
                  >
                    {uploading ? (
                      <ActivityIndicator size="small" color={C.primary} />
                    ) : (
                      <>
                        <Icon name="add-circle-outline" size={32} color={C.primary} />
                        <Text style={st.addPhotoText}>Add Photo</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
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

      {/* Restaurant Picker Modal */}
      <Modal visible={restaurantPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Restaurant</Text>
              <TouchableOpacity onPress={() => setRestaurantPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerList}>
              {restaurants.map(r => (
                <TouchableOpacity
                  key={r.id}
                  style={[st.pickerItem, selectedRestaurant?.id === r.id && st.pickerItemActive]}
                  onPress={() => {
                    setSelectedRestaurant(r);
                    setRestaurantPickerVisible(false);
                  }}
                >
                  <Icon name="business" size={20} color={selectedRestaurant?.id === r.id ? C.primary : C.muted} />
                  <Text style={[st.pickerItemText, selectedRestaurant?.id === r.id && { color: C.primary }]}>
                    {r.name}
                  </Text>
                  {selectedRestaurant?.id === r.id && (
                    <Icon name="checkmark-circle" size={20} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerList}>
              {categories.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[st.pickerItem, form.category === c.name && st.pickerItemActive]}
                  onPress={() => {
                    setForm(f => ({ ...f, category: c.name }));
                    setCategoryPickerVisible(false);
                  }}
                >
                  <View style={st.categoryInfo}>
                    <Text style={st.categoryParent}>{c.category?.name || 'General'}</Text>
                    <Text style={[st.pickerItemText, form.category === c.name && { color: C.primary }]}>
                      {c.name}
                    </Text>
                  </View>
                  {form.category === c.name && (
                    <Icon name="checkmark-circle" size={20} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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

  restaurantSelector: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, padding: 12,
    backgroundColor: C.card, borderRadius: 12, borderWidth: 1, borderColor: C.border
  },
  restaurantName: { flex: 1, fontSize: 14, fontWeight: '600', color: C.ink },

  searchContainer: { paddingHorizontal: 16, paddingTop: 12 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 12, paddingHorizontal: 12, height: 44, borderWidth: 1, borderColor: C.border
  },
  searchInput: { flex: 1, marginLeft: 8, fontSize: 14, color: C.text },

  filterRow: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterText: { fontSize: 12, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },

  warrantyChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16,
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginRight: 8
  },
  warrantyChipActive: { backgroundColor: C.info, borderColor: C.info },
  warrantyText: { fontSize: 11, fontWeight: '600', color: C.muted },
  warrantyTextActive: { color: '#fff' },

  resultsRow: { paddingHorizontal: 16, paddingBottom: 8 },
  resultsText: { fontSize: 12, color: C.muted },

  list: { padding: 16, paddingBottom: 100 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: C.border
  },
  cardHeader: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 48, height: 48, borderRadius: 14, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  cardImage: { width: 48, height: 48, borderRadius: 14 },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '900', color: C.ink },
  cardSub: { fontSize: 13, color: C.muted, marginTop: 2 },
  serialText: { fontSize: 11, color: C.muted, fontFamily: 'monospace', marginTop: 4 },
  photoBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: C.bg, borderRadius: 8
  },
  photoBadgeText: { fontSize: 11, fontWeight: '600', color: C.muted },

  statsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  statBox: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  statLabel: { fontSize: 11, fontWeight: '600', color: C.muted },

  docsRow: { flexDirection: 'row', gap: 8, marginTop: 10 },
  docBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, backgroundColor: '#F8FAFC', borderRadius: 6
  },
  docBadgeText: { fontSize: 10, fontWeight: '600', color: C.muted },

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

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border
  },
  pickerText: { fontSize: 14, color: C.text },
  pickerPlaceholder: { fontSize: 14, color: C.muted },

  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.bg, borderRadius: 12, paddingVertical: 20,
    borderWidth: 2, borderColor: C.border, borderStyle: 'dashed'
  },
  uploadText: { fontSize: 14, fontWeight: '600', color: C.primary },

  imagePreviewBox: { position: 'relative' },
  imagePreview: { width: '100%', height: 120, borderRadius: 12, backgroundColor: C.bg },
  removeImageBtn: { position: 'absolute', top: 8, right: 8 },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoItem: { position: 'relative' },
  photoImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: C.bg },
  removePhotoBtn: { position: 'absolute', top: -6, right: -6 },
  photoIndex: {
    position: 'absolute', bottom: 4, left: 4,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2
  },
  photoIndexText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  addPhotoBtn: {
    width: 80, height: 80, borderRadius: 12, backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, borderStyle: 'dashed'
  },
  addPhotoText: { fontSize: 10, color: C.primary, marginTop: 4 },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', gap: 6
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  pickerModal: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '70%' },
  pickerList: { padding: 16 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border
  },
  pickerItemActive: { backgroundColor: '#FFF5F5' },
  pickerItemText: { flex: 1, fontSize: 15, fontWeight: '600', color: C.ink },
  categoryInfo: { flex: 1 },
  categoryParent: { fontSize: 11, color: C.muted },
});
