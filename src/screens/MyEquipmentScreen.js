import React, { useState, useCallback, useEffect, useMemo } from 'react';
// Updated with stylish status tabs pattern
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  RefreshControl, Modal, ScrollView, Alert, ActivityIndicator, Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, getImageUrl } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale, isTablet, getContainerMaxWidth, getGridColumns } from '../utils/responsive';

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
  { key: 'all', label: 'All', icon: 'list-outline', bg: '#F3F4F6', color: '#1D2254' },
  { key: 'AVAILABLE', label: 'Available', icon: 'checkmark-circle-outline', bg: '#ECFDF5', color: '#10B981' },
  { key: 'IN_USE', label: 'In Use', icon: 'play-circle-outline', bg: '#DBEAFE', color: '#2563EB' },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: 'construct-outline', bg: '#FEF3C7', color: '#D97706' },
  { key: 'RETIRED', label: 'Retired', icon: 'archive-outline', bg: '#F3F4F6', color: '#6B7280' },
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
  // Responsive sizing
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTabletDevice = isTablet(width);
  const gridColumns = isTabletDevice ? 2 : 1;
  const horizontalPadding = isTabletDevice ? scale(24) : scale(16);
  const cardGap = isTabletDevice ? scale(16) : scale(12);

  // Global restaurant context
  const {
    restaurants,
    selectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
    selectRestaurant,
    hasRestaurants,
  } = useRestaurant();

  const [equipments, setEquipments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [warrantyFilter, setWarrantyFilter] = useState('all');
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState([]);
  const [uploading, setUploading] = useState(false);

  const [form, setForm] = useState({
    id: null,
    categoryId: '',
    subCategoryId: '',
    brand: '',
    model: '',
    serialNumber: '',
    installLocation: '',
    purchaseDate: '',
    warrantyEndDate: '',
    notes: '',
    billImageUrl: '',
    warrantyCardUrl: '',
    photoUrls: [],
  });
  const [subCategories, setSubCategories] = useState([]);

  // Fetch categories (with subCategories included)
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/public/categories');
      if (data.ok && data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  }, []);

  // Update subcategories when category changes
  useEffect(() => {
    if (form.categoryId) {
      const selectedCategory = categories.find(c => c.id === form.categoryId);
      setSubCategories(selectedCategory?.subCategories || []);
      // Reset subcategory when category changes
      if (!form.id) {
        setForm(f => ({ ...f, subCategoryId: '' }));
      }
    } else {
      setSubCategories([]);
    }
  }, [form.categoryId, categories]);

  // Fetch equipment
  const fetchEquipments = useCallback(async () => {
    if (!selectedRestaurantId) return;
    try {
      const { data } = await api.get(`/owner/equipment?restaurantId=${selectedRestaurantId}`);
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
  }, [selectedRestaurantId]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (selectedRestaurantId) {
      setLoading(true);
      fetchEquipments();
    }
  }, [selectedRestaurantId, fetchEquipments]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    await fetchEquipments();
  };

  // Calculate status counts for summary cards
  const statusCounts = useMemo(() => {
    const counts = { all: equipments.length, AVAILABLE: 0, IN_USE: 0, MAINTENANCE: 0, RETIRED: 0 };
    equipments.forEach(e => {
      if (counts[e.status] !== undefined) {
        counts[e.status]++;
      }
    });
    return counts;
  }, [equipments]);

  // Filter equipment
  const filtered = equipments.filter(e => {
    const q = search.toLowerCase();
    const categoryName = typeof e.category === 'object' ? e.category?.name : e.category;
    const okQ = !q ||
      e.name?.toLowerCase().includes(q) ||
      categoryName?.toLowerCase().includes(q) ||
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
      // Handle both object and string category formats
      const categoryObj = typeof equipment.category === 'object' ? equipment.category : null;
      const subCategoryObj = typeof equipment.subCategory === 'object' ? equipment.subCategory : null;
      setForm({
        id: equipment.id,
        categoryId: categoryObj?.id || equipment.categoryId || '',
        subCategoryId: subCategoryObj?.id || equipment.subCategoryId || '',
        brand: equipment.brand || '',
        model: equipment.model || '',
        serialNumber: equipment.serialNumber || '',
        installLocation: equipment.installLocation || '',
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
        categoryId: '',
        subCategoryId: '',
        brand: '',
        model: '',
        serialNumber: '',
        installLocation: '',
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
    if (!form.categoryId) {
      Alert.alert('Error', 'Please select a category');
      return;
    }
    if (!form.purchaseDate) {
      Alert.alert('Error', 'Please enter purchase date');
      return;
    }

    setSaving(true);
    try {
      // Derive equipment name from category/subcategory (same as web)
      const selectedCategory = categories.find(c => c.id === form.categoryId);
      const selectedSubCategory = subCategories.find(sc => sc.id === form.subCategoryId);
      const equipmentName = selectedSubCategory?.name || selectedCategory?.name || 'Equipment';

      const payload = {
        restaurantId: selectedRestaurantId,
        name: equipmentName,
        categoryId: form.categoryId,
        subCategoryId: form.subCategoryId || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        serialNumber: form.serialNumber || undefined,
        installLocation: form.installLocation || undefined,
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
              <Text style={st.cardSub} numberOfLines={1}>
                {typeof item.category === 'object' ? item.category.name : item.category}
              </Text>
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
            onPress={() => {
              // Navigate to ServiceRequest screen (same flow as owner web /owner/request-service)
              // Pass all equipment details including category/subcategory IDs for fetching services/parts
              const categoryObj = typeof item.category === 'object' ? item.category : null;
              const subCategoryObj = typeof item.subCategory === 'object' ? item.subCategory : null;

              navigation.navigate('ServiceRequest', {
                equipmentId: item.id,
                equipmentName: item.name,
                categoryId: categoryObj?.id || item.categoryId || null,
                categoryName: categoryObj?.name || (typeof item.category === 'string' ? item.category : null),
                subCategoryId: subCategoryObj?.id || item.subCategoryId || null,
                subCategoryName: subCategoryObj?.name || (typeof item.subCategory === 'string' ? item.subCategory : null),
              });
            }}
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
  const [subCategoryPickerVisible, setSubCategoryPickerVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      {/* Restaurant Selector - Global */}
      <RestaurantSelectorBar />

      {/* Search */}
      <View style={st.searchContainer}>
        <View style={st.searchBox}>
          <View style={st.searchIconBox}>
            <Icon name="search" size={18} color={C.primary} />
          </View>
          <TextInput
            style={st.searchInput}
            placeholder="Search by name, category, serial..."
            placeholderTextColor={C.muted}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} style={st.clearSearchBtn}>
              <View style={st.clearSearchIcon}>
                <Icon name="close" size={14} color="#fff" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Status Filter - Stylish Summary Cards */}
      <View style={st.filterSection}>
        <View style={st.filterHeader}>
          <Icon name="flag" size={14} color={C.primary} />
          <Text style={st.filterLabel}>Status</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScrollContent}
        >
          {statusFilters.map((filter, index) => {
            const isActive = statusFilter === filter.key;
            const count = statusCounts[filter.key] || 0;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  st.summaryCard,
                  isActive && st.summaryCardActive,
                  { borderColor: isActive ? filter.color : C.border },
                  index === 0 && { marginLeft: 0 }
                ]}
                onPress={() => setStatusFilter(filter.key)}
                activeOpacity={0.7}
              >
                <View style={[st.summaryIcon, { backgroundColor: filter.bg }]}>
                  <Icon name={filter.icon} size={16} color={filter.color} />
                </View>
                <Text style={[st.summaryCount, isActive && { color: filter.color }]}>
                  {count}
                </Text>
                <Text style={[st.summaryLabel, isActive && { color: filter.color }]}>
                  {filter.label}
                </Text>
                {isActive && (
                  <View style={[st.summaryActiveBar, { backgroundColor: filter.color }]} />
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Warranty Filter */}
      <View style={st.filterSection}>
        <View style={st.filterHeader}>
          <Icon name="shield-checkmark" size={14} color={C.info} />
          <Text style={st.filterLabel}>Warranty</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={st.filterScrollContent}
        >
          {warrantyFilters.map((filter, index) => {
            const isActive = warrantyFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[
                  st.warrantyChip,
                  isActive && st.warrantyChipActive,
                  index === 0 && { marginLeft: 0 }
                ]}
                onPress={() => setWarrantyFilter(filter.key)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <View style={st.warrantyCheckIcon}>
                    <Icon name="checkmark" size={10} color="#fff" />
                  </View>
                )}
                <Text style={[st.warrantyText, isActive && st.warrantyTextActive]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results count */}
      <View style={st.resultsRow}>
        <View style={st.resultsLeft}>
          <View style={st.resultsDot} />
          <Text style={st.resultsText}>
            {filtered.length} of {equipments.length} equipment
          </Text>
        </View>
        {(statusFilter !== 'all' || warrantyFilter !== 'all' || search.length > 0) && (
          <TouchableOpacity
            style={st.resultsBadge}
            onPress={() => {
              setStatusFilter('all');
              setWarrantyFilter('all');
              setSearch('');
            }}
          >
            <Icon name="close-circle" size={14} color={C.primary} />
            <Text style={st.resultsBadgeText}>Clear All</Text>
          </TouchableOpacity>
        )}
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
          renderItem={({ item, index }) => (
            <View style={{
              flex: 1,
              maxWidth: isTabletDevice ? '50%' : '100%',
              paddingLeft: isTabletDevice && index % 2 === 1 ? cardGap / 2 : 0,
              paddingRight: isTabletDevice && index % 2 === 0 ? cardGap / 2 : 0,
            }}>
              <EquipmentCard item={item} />
            </View>
          )}
          numColumns={gridColumns}
          key={`grid-${gridColumns}`}
          contentContainerStyle={[st.list, { paddingHorizontal: horizontalPadding }]}
          columnWrapperStyle={gridColumns > 1 ? { marginBottom: cardGap } : undefined}
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
              {/* Restaurant Display (read-only) */}
              <Text style={st.label}>Restaurant</Text>
              <View style={st.restaurantDisplay}>
                <Icon name="business" size={18} color={C.muted} />
                <Text style={st.restaurantDisplayText}>{selectedRestaurant?.name || 'No restaurant selected'}</Text>
              </View>

              {/* Category Picker */}
              <Text style={st.label}>Category *</Text>
              <TouchableOpacity
                style={st.pickerBtn}
                onPress={() => setCategoryPickerVisible(true)}
              >
                <Text style={form.categoryId ? st.pickerText : st.pickerPlaceholder}>
                  {categories.find(c => c.id === form.categoryId)?.name || 'Select category'}
                </Text>
                <Icon name="chevron-down" size={18} color={C.muted} />
              </TouchableOpacity>

              {/* Subcategory Picker */}
              <Text style={st.label}>Subcategory</Text>
              <TouchableOpacity
                style={[st.pickerBtn, !form.categoryId && st.pickerBtnDisabled]}
                onPress={() => form.categoryId && setSubCategoryPickerVisible(true)}
                disabled={!form.categoryId}
              >
                <Text style={form.subCategoryId ? st.pickerText : st.pickerPlaceholder}>
                  {form.categoryId
                    ? (subCategories.find(sc => sc.id === form.subCategoryId)?.name || 'Select subcategory')
                    : 'Select category first'}
                </Text>
                <Icon name="chevron-down" size={18} color={C.muted} />
              </TouchableOpacity>

              {/* Brand & Model in a row */}
              <View style={st.formRow}>
                <View style={st.formCol}>
                  <Text style={st.label}>Brand</Text>
                  <TextInput
                    style={st.input}
                    placeholder="e.g., Samsung"
                    placeholderTextColor={C.muted}
                    value={form.brand}
                    onChangeText={v => setForm(f => ({ ...f, brand: v }))}
                  />
                </View>
                <View style={st.formCol}>
                  <Text style={st.label}>Model</Text>
                  <TextInput
                    style={st.input}
                    placeholder="e.g., XYZ-123"
                    placeholderTextColor={C.muted}
                    value={form.model}
                    onChangeText={v => setForm(f => ({ ...f, model: v }))}
                  />
                </View>
              </View>

              <Text style={st.label}>Serial Number</Text>
              <TextInput
                style={st.input}
                placeholder="ABC123456"
                placeholderTextColor={C.muted}
                value={form.serialNumber}
                onChangeText={v => setForm(f => ({ ...f, serialNumber: v }))}
              />

              <Text style={st.label}>Install Location</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., Main Kitchen"
                placeholderTextColor={C.muted}
                value={form.installLocation}
                onChangeText={v => setForm(f => ({ ...f, installLocation: v }))}
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
                    selectRestaurant(r.id);
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
              {categories.length === 0 ? (
                <View style={st.emptyPickerBox}>
                  <Text style={st.emptyPickerText}>No categories available</Text>
                </View>
              ) : (
                categories.map(c => (
                  <TouchableOpacity
                    key={c.id}
                    style={[st.pickerItem, form.categoryId === c.id && st.pickerItemActive]}
                    onPress={() => {
                      setForm(f => ({ ...f, categoryId: c.id, subCategoryId: '' }));
                      setCategoryPickerVisible(false);
                    }}
                  >
                    <Icon name="folder-outline" size={20} color={form.categoryId === c.id ? C.primary : C.muted} />
                    <Text style={[st.pickerItemText, form.categoryId === c.id && { color: C.primary }]}>
                      {c.name}
                    </Text>
                    {form.categoryId === c.id && (
                      <Icon name="checkmark-circle" size={20} color={C.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subcategory Picker Modal */}
      <Modal visible={subCategoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Subcategory</Text>
              <TouchableOpacity onPress={() => setSubCategoryPickerVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerList}>
              {subCategories.length === 0 ? (
                <View style={st.emptyPickerBox}>
                  <Text style={st.emptyPickerText}>No subcategories for this category</Text>
                </View>
              ) : (
                subCategories.map(sc => (
                  <TouchableOpacity
                    key={sc.id}
                    style={[st.pickerItem, form.subCategoryId === sc.id && st.pickerItemActive]}
                    onPress={() => {
                      setForm(f => ({ ...f, subCategoryId: sc.id }));
                      setSubCategoryPickerVisible(false);
                    }}
                  >
                    <Icon name="layers-outline" size={20} color={form.subCategoryId === sc.id ? C.primary : C.muted} />
                    <Text style={[st.pickerItemText, form.subCategoryId === sc.id && { color: C.primary }]}>
                      {sc.name}
                    </Text>
                    {form.subCategoryId === sc.id && (
                      <Icon name="checkmark-circle" size={20} color={C.primary} />
                    )}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="equipment" />
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

  searchContainer: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: 16, paddingHorizontal: 6, paddingVertical: 6, borderWidth: 2, borderColor: C.border,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 12, elevation: 4
  },
  searchIconBox: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center'
  },
  searchInput: { flex: 1, marginLeft: 12, fontSize: 15, fontWeight: '500', color: C.text },
  clearSearchBtn: { padding: 8 },
  clearSearchIcon: {
    width: 24, height: 24, borderRadius: 12, backgroundColor: C.muted,
    alignItems: 'center', justifyContent: 'center'
  },

  filterSection: { marginBottom: 8 },
  filterHeader: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, marginBottom: 8
  },
  filterLabel: { fontSize: 12, fontWeight: '700', color: C.muted, marginLeft: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  filterScrollContent: { paddingHorizontal: 16, gap: 10 },

  // Stylish summary cards for status filter
  summaryCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 10,
    minWidth: 72,
    borderWidth: 2,
    borderColor: C.border,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
    marginLeft: 8,
  },
  summaryCardActive: {
    backgroundColor: '#FAFAFA',
    shadowOpacity: 0.1,
    elevation: 5,
  },
  summaryIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  summaryCount: {
    fontSize: 16,
    fontWeight: '900',
    color: C.ink,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginTop: 2,
  },
  summaryActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },

  // Legacy filter chip styles (keeping for warranty filter)
  filterChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingLeft: 4, paddingRight: 12, paddingVertical: 4, borderRadius: 12,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border, marginLeft: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
  },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterIconBox: {
    width: 32, height: 32, borderRadius: 10, backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', marginRight: 8
  },
  filterIconBoxActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  filterText: { fontSize: 13, fontWeight: '600', color: C.ink },
  filterTextActive: { color: '#fff' },
  filterCheckBox: {
    width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginLeft: 6
  },

  warrantyChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20,
    backgroundColor: C.card, borderWidth: 2, borderColor: C.border, marginLeft: 8,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 6, elevation: 2
  },
  warrantyChipActive: { backgroundColor: C.info, borderColor: C.info },
  warrantyText: { fontSize: 12, fontWeight: '700', color: C.muted },
  warrantyTextActive: { color: '#fff' },
  warrantyCheckIcon: {
    width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center', justifyContent: 'center', marginRight: 6
  },

  resultsRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 8, paddingTop: 8,
    marginHorizontal: 16, marginBottom: 8, backgroundColor: C.card, borderRadius: 12,
    borderWidth: 1, borderColor: C.border
  },
  resultsLeft: { flexDirection: 'row', alignItems: 'center' },
  resultsDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: C.ok, marginRight: 8 },
  resultsText: { fontSize: 13, fontWeight: '600', color: C.ink },
  resultsBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#FEF2F2'
  },
  resultsBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary, marginLeft: 4 },

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
  pickerBtnDisabled: {
    opacity: 0.6,
  },
  pickerText: { fontSize: 14, color: C.text },
  pickerPlaceholder: { fontSize: 14, color: C.muted },

  restaurantDisplay: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.bg, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: C.border
  },
  restaurantDisplayText: { fontSize: 14, fontWeight: '600', color: C.ink },

  formRow: {
    flexDirection: 'row', gap: 12,
  },
  formCol: {
    flex: 1,
  },

  emptyPickerBox: {
    padding: 20, alignItems: 'center', justifyContent: 'center',
  },
  emptyPickerText: {
    fontSize: 14, color: C.muted, textAlign: 'center',
  },

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
