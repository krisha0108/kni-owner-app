/**
 * ============================================================================
 * MY EQUIPMENT SCREEN - PREMIUM DESIGN (Urban Clap Inspired)
 * ============================================================================
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
  RefreshControl, Modal, ScrollView, Alert, ActivityIndicator, Image,
  useWindowDimensions, Platform, StatusBar, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, getImageUrl } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

// Premium Color Palette (Consistent with Marketplace)
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
  { key: 'all', label: 'All', icon: 'grid-outline', color: C.ink },
  { key: 'AVAILABLE', label: 'Available', icon: 'checkmark-circle', color: C.success },
  { key: 'IN_USE', label: 'In Use', icon: 'play-circle', color: C.info },
  { key: 'MAINTENANCE', label: 'Maintenance', icon: 'construct', color: C.warning },
  { key: 'RETIRED', label: 'Retired', icon: 'archive', color: C.muted },
];

const warrantyFilters = [
  { key: 'all', label: 'All', icon: 'shield-outline' },
  { key: 'active', label: 'Active', icon: 'shield-checkmark', color: C.success },
  { key: 'expiring', label: 'Expiring', icon: 'alert-circle', color: C.warning },
  { key: 'expired', label: 'Expired', icon: 'close-circle', color: C.danger },
];

const getWarrantyStatus = (warrantyEndDate) => {
  if (!warrantyEndDate) return { color: 'gray', label: 'No Warranty' };
  const endDate = new Date(warrantyEndDate);
  const now = new Date();
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  if (endDate < now) return { color: 'red', label: 'Expired' };
  if (endDate <= thirtyDaysFromNow) return { color: 'yellow', label: 'Expiring Soon' };
  return { color: 'green', label: 'Active' };
};

const getWarrantyStyle = (status) => {
  switch (status.color) {
    case 'green': return { bg: C.successLight, text: C.success, icon: 'shield-checkmark' };
    case 'yellow': return { bg: C.warningLight, text: C.warning, icon: 'alert-circle' };
    case 'red': return { bg: C.dangerLight, text: C.danger, icon: 'close-circle' };
    default: return { bg: '#F1F5F9', text: C.muted, icon: 'time-outline' };
  }
};

const getStatusStyle = (status) => {
  switch (status) {
    case 'AVAILABLE': return { bg: C.successLight, text: C.success, label: 'Available', icon: 'checkmark-circle' };
    case 'IN_USE': return { bg: C.infoLight, text: C.info, label: 'In Use', icon: 'play-circle' };
    case 'MAINTENANCE': return { bg: C.warningLight, text: C.warning, label: 'Maintenance', icon: 'construct' };
    case 'RETIRED': return { bg: '#F1F5F9', text: C.muted, label: 'Retired', icon: 'archive' };
    default: return { bg: '#F1F5F9', text: C.muted, label: status, icon: 'help-circle' };
  }
};

const DELIVERY_OPTIONS = [
  { value: "Same day", label: "Same day" },
  { value: "1-2 days", label: "1-2 days" },
  { value: "2-3 days", label: "2-3 days" },
  { value: "3-5 days", label: "3-5 days" },
  { value: "1 week", label: "1 week" },
];

export default function MyEquipmentScreen({ navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const isTablet = width >= 768;
  const gridColumns = isTablet ? 2 : 1;

  const {
    selectedRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
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
  const [menuVisible, setMenuVisible] = useState(false);

  const [form, setForm] = useState({
    id: null, categoryId: '', subCategoryId: '', brand: '', model: '',
    serialNumber: '', installLocation: '', purchaseDate: '', warrantyEndDate: '',
    notes: '', billImageUrl: '', warrantyCardUrl: '', photoUrls: [],
  });
  const [subCategories, setSubCategories] = useState([]);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [subCategoryPickerVisible, setSubCategoryPickerVisible] = useState(false);
  const [showPurchaseDatePicker, setShowPurchaseDatePicker] = useState(false);
  const [showWarrantyDatePicker, setShowWarrantyDatePicker] = useState(false);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get('/public/categories');
      if (data.ok && data.data) setCategories(data.data);
    } catch (error) {
      console.log('Error fetching categories:', error);
    }
  }, []);

  useEffect(() => {
    if (form.categoryId) {
      const selectedCategory = categories.find(c => c.id === form.categoryId);
      setSubCategories(selectedCategory?.subCategories || []);
      if (!form.id) setForm(f => ({ ...f, subCategoryId: '' }));
    } else {
      setSubCategories([]);
    }
  }, [form.categoryId, categories]);

  // Fetch equipment
  const fetchEquipments = useCallback(async () => {
    if (!selectedRestaurantId) return;
    try {
      const { data } = await api.get(`/owner/equipment?restaurantId=${selectedRestaurantId}`);
      if (data.ok && data.data) setEquipments(data.data.items || []);
    } catch (error) {
      console.log('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  useEffect(() => { fetchCategories(); }, [fetchCategories]);
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

  // Status counts
  const statusCounts = useMemo(() => {
    const counts = { all: equipments.length, AVAILABLE: 0, IN_USE: 0, MAINTENANCE: 0, RETIRED: 0 };
    equipments.forEach(e => { if (counts[e.status] !== undefined) counts[e.status]++; });
    return counts;
  }, [equipments]);

  // Filter equipment
  const filtered = equipments.filter(e => {
    const q = search.toLowerCase();
    const categoryName = typeof e.category === 'object' ? e.category?.name : e.category;
    const okQ = !q || e.name?.toLowerCase().includes(q) || categoryName?.toLowerCase().includes(q) || e.serialNumber?.toLowerCase().includes(q);
    const okStatus = statusFilter === 'all' || e.status === statusFilter;
    let okWarranty = true;
    if (warrantyFilter !== 'all') {
      const ws = getWarrantyStatus(e.warrantyEndDate);
      if (warrantyFilter === 'active' && ws.color !== 'green') okWarranty = false;
      if (warrantyFilter === 'expiring' && ws.color !== 'yellow') okWarranty = false;
      if (warrantyFilter === 'expired' && ws.color !== 'red') okWarranty = false;
    }
    return okQ && okStatus && okWarranty;
  });

  const openForm = (equipment = null) => {
    if (equipment) {
      const categoryObj = typeof equipment.category === 'object' ? equipment.category : null;
      const subCategoryObj = typeof equipment.subCategory === 'object' ? equipment.subCategory : null;
      setForm({
        id: equipment.id,
        categoryId: categoryObj?.id || equipment.categoryId || '',
        subCategoryId: subCategoryObj?.id || equipment.subCategoryId || '',
        brand: equipment.brand || '', model: equipment.model || '',
        serialNumber: equipment.serialNumber || '', installLocation: equipment.installLocation || '',
        purchaseDate: equipment.purchaseDate ? equipment.purchaseDate.split('T')[0] : '',
        warrantyEndDate: equipment.warrantyEndDate ? equipment.warrantyEndDate.split('T')[0] : '',
        notes: equipment.notes || '', billImageUrl: equipment.billImageUrl || '',
        warrantyCardUrl: equipment.warrantyCardUrl || '', photoUrls: equipment.photoUrls || [],
      });
    } else {
      setForm({
        id: null, categoryId: '', subCategoryId: '', brand: '', model: '',
        serialNumber: '', installLocation: '', purchaseDate: '', warrantyEndDate: '',
        notes: '', billImageUrl: '', warrantyCardUrl: '', photoUrls: [],
      });
    }
    setModalVisible(true);
  };

  // Image upload
  const uploadImage = async (type) => {
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', quality: 0.8, maxWidth: scale(1920), maxHeight: scale(1920) });
      if (result.didCancel || !result.assets?.[0]) return;
      setUploading(true);
      const asset = result.assets[0];
      const formData = new FormData();
      formData.append('file', { uri: asset.uri, type: asset.type || 'image/jpeg', name: asset.fileName || `image-${Date.now()}.jpg` });
      formData.append('folder', `equipment/${type}`);
      const { data } = await api.post('/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (data.ok && data.url) {
        if (type === 'bills') setForm(f => ({ ...f, billImageUrl: data.url }));
        else if (type === 'warranty-cards') setForm(f => ({ ...f, warrantyCardUrl: data.url }));
        else if (type === 'photos') {
          if (form.photoUrls.length < 5) setForm(f => ({ ...f, photoUrls: [...f.photoUrls, data.url] }));
          else Alert.alert('Limit Reached', 'Maximum 5 photos allowed');
        }
      } else Alert.alert('Error', 'Failed to upload image');
    } catch (error) {
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (index) => setForm(f => ({ ...f, photoUrls: f.photoUrls.filter((_, i) => i !== index) }));

  const saveEquipment = async () => {
    setSaving(true);
    try {
      const selectedCategory = categories.find(c => c.id === form.categoryId);
      const selectedSubCategory = subCategories.find(sc => sc.id === form.subCategoryId);
      const equipmentName = selectedSubCategory?.name || selectedCategory?.name || 'Equipment';
      const payload = {
        restaurantId: selectedRestaurantId, name: equipmentName,
        categoryId: form.categoryId || undefined, subCategoryId: form.subCategoryId || undefined,
        brand: form.brand || undefined, model: form.model || undefined,
        serialNumber: form.serialNumber || undefined, installLocation: form.installLocation || undefined,
        purchaseDate: form.purchaseDate ? new Date(form.purchaseDate).toISOString() : undefined,
        warrantyEndDate: form.warrantyEndDate ? new Date(form.warrantyEndDate).toISOString() : undefined,
        notes: form.notes || undefined, billImageUrl: form.billImageUrl || undefined,
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
    Alert.alert('Delete Equipment', `Are you sure you want to delete "${equipment.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
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
    ]);
  };

  const onPurchaseDateChange = (event, selectedDate) => {
    setShowPurchaseDatePicker(Platform.OS === 'ios');
    if (selectedDate) setForm(f => ({ ...f, purchaseDate: selectedDate.toISOString().split('T')[0] }));
  };

  const onWarrantyDateChange = (event, selectedDate) => {
    setShowWarrantyDatePicker(Platform.OS === 'ios');
    if (selectedDate) setForm(f => ({ ...f, warrantyEndDate: selectedDate.toISOString().split('T')[0] }));
  };

  const formatDateDisplay = (dateStr) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  // ==================== RENDER EQUIPMENT CARD ====================
  const renderEquipmentCard = ({ item, index }) => {
    const ws = getWarrantyStatus(item.warrantyEndDate);
    const wStyle = getWarrantyStyle(ws);
    const sStyle = getStatusStyle(item.status);
    const photoCount = item.photoUrls?.length || 0;
    const categoryName = typeof item.category === 'object' ? item.category?.name : item.category;

    return (
      <TouchableOpacity
        style={st.card}
        activeOpacity={0.9}
        onPress={() => navigation.navigate('EquipmentProfile', { equipmentId: item.id })}
      >
        {/* Card Header with Image */}
        <View style={st.cardImageContainer}>
          {photoCount > 0 ? (
            <Image source={{ uri: getImageUrl(item.photoUrls[0]) }} style={st.cardImage} />
          ) : (
            <View style={st.cardImagePlaceholder}>
              <Icon name="hardware-chip-outline" size={scale(40)} color={C.muted} />
            </View>
          )}
          {/* Status Badge */}
          <View style={[st.statusBadge, { backgroundColor: sStyle.bg }]}>
            <Icon name={sStyle.icon} size={scale(12)} color={sStyle.text} />
            <Text style={[st.statusBadgeText, { color: sStyle.text }]}>{sStyle.label}</Text>
          </View>
          {/* Photo Count Badge */}
          {photoCount > 1 && (
            <View style={st.photoCountBadge}>
              <Icon name="images" size={scale(12)} color="#fff" />
              <Text style={st.photoCountText}>{photoCount}</Text>
            </View>
          )}
        </View>

        {/* Card Info */}
        <View style={st.cardInfo}>
          <Text style={st.cardTitle} numberOfLines={1}>{item.name}</Text>
          {categoryName && (
            <View style={st.categoryRow}>
              <Icon name="folder-outline" size={scale(12)} color={C.muted} />
              <Text style={st.categoryText} numberOfLines={1}>{categoryName}</Text>
            </View>
          )}
          {item.serialNumber && (
            <Text style={st.serialText}>SN: {item.serialNumber}</Text>
          )}

          {/* Warranty Row */}
          <View style={[st.warrantyRow, { backgroundColor: wStyle.bg }]}>
            <Icon name={wStyle.icon} size={scale(14)} color={wStyle.text} />
            <Text style={[st.warrantyText, { color: wStyle.text }]}>{ws.label}</Text>
          </View>

          {/* Documents */}
          {(item.billImageUrl || item.warrantyCardUrl) && (
            <View style={st.docsRow}>
              {item.billImageUrl && (
                <View style={st.docBadge}>
                  <Icon name="document-text" size={scale(10)} color={C.info} />
                  <Text style={st.docText}>Bill</Text>
                </View>
              )}
              {item.warrantyCardUrl && (
                <View style={st.docBadge}>
                  <Icon name="card" size={scale(10)} color={C.success} />
                  <Text style={st.docText}>Card</Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Card Actions */}
        <View style={st.cardActions}>
          <TouchableOpacity
            style={st.serviceBtn}
            onPress={() => {
              const categoryObj = typeof item.category === 'object' ? item.category : null;
              const subCategoryObj = typeof item.subCategory === 'object' ? item.subCategory : null;
              navigation.navigate('ServiceRequest', {
                equipmentId: item.id, equipmentName: item.name,
                categoryId: categoryObj?.id || item.categoryId || null,
                categoryName: categoryObj?.name || (typeof item.category === 'string' ? item.category : null),
                subCategoryId: subCategoryObj?.id || item.subCategoryId || null,
                subCategoryName: subCategoryObj?.name || (typeof item.subCategory === 'string' ? item.subCategory : null),
              });
            }}
          >
            <Icon name="construct" size={scale(14)} color="#fff" />
            <Text style={st.serviceBtnText}>Service</Text>
          </TouchableOpacity>
          <TouchableOpacity style={st.iconBtn} onPress={() => openForm(item)}>
            <Icon name="pencil" size={scale(16)} color={C.info} />
          </TouchableOpacity>
          <TouchableOpacity style={[st.iconBtn, { backgroundColor: C.dangerLight }]} onPress={() => deleteEquipment(item)}>
            <Icon name="trash" size={scale(16)} color={C.danger} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  // ==================== LOADING STATE ====================
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="light-content" backgroundColor={C.primary} />
        <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.loadingHero}>
          <Text style={st.heroTitle}>My Equipment</Text>
        </LinearGradient>
        <View style={st.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading equipment...</Text>
        </View>
        <KniBottomNav navigation={navigation} active="equipment" />
      </SafeAreaView>
    );
  }

  // ==================== MAIN RENDER ====================
  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Premium Gradient Header */}
      <LinearGradient
        colors={[C.gradient1, C.gradient2]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={st.heroSection}
      >
        <View style={st.heroContent}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <View style={st.heroTextContainer}>
            <Text style={st.heroTitle}>My Equipment</Text>
            <Text style={st.heroSubtitle}>{selectedRestaurant?.name || 'Select Restaurant'}</Text>
          </View>
          <View style={st.heroActions}>
            <TouchableOpacity style={st.heroIconBtn} onPress={() => openForm()}>
              <Icon name="add" size={scale(22)} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={st.heroIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(22)} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Search Bar */}
        <View style={st.searchContainer}>
          <View style={st.searchBar}>
            <Icon name="search" size={scale(20)} color={C.muted} />
            <TextInput
              style={st.searchInput}
              placeholder="Search equipment..."
              placeholderTextColor={C.muted}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} style={st.clearBtn}>
                <Icon name="close-circle" size={scale(20)} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </LinearGradient>

      {/* Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Status Filter Chips */}
      <View style={st.filterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
          {statusFilters.map((filter) => {
            const isActive = statusFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[st.filterChip, isActive && st.filterChipActive]}
                onPress={() => setStatusFilter(filter.key)}
              >
                <Icon name={filter.icon} size={scale(16)} color={isActive ? '#fff' : filter.color} />
                <Text style={[st.filterChipText, isActive && st.filterChipTextActive]}>
                  {filter.label} ({statusCounts[filter.key] || 0})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Warranty Filter Chips */}
      <View style={st.warrantyFilterSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={st.filterScroll}>
          {warrantyFilters.map((filter) => {
            const isActive = warrantyFilter === filter.key;
            return (
              <TouchableOpacity
                key={filter.key}
                style={[st.warrantyChip, isActive && st.warrantyChipActive]}
                onPress={() => setWarrantyFilter(filter.key)}
              >
                <Icon name={filter.icon} size={scale(14)} color={isActive ? '#fff' : (filter.color || C.muted)} />
                <Text style={[st.warrantyChipText, isActive && st.warrantyChipTextActive]}>{filter.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Results Header */}
      <View style={st.resultsHeader}>
        <Text style={st.resultsTitle}>{filtered.length} Equipment</Text>
        {(statusFilter !== 'all' || warrantyFilter !== 'all' || search) && (
          <TouchableOpacity
            style={st.clearFiltersBtn}
            onPress={() => { setStatusFilter('all'); setWarrantyFilter('all'); setSearch(''); }}
          >
            <Icon name="close-circle" size={scale(14)} color={C.primary} />
            <Text style={st.clearFiltersText}>Clear</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Equipment List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderEquipmentCard}
        numColumns={gridColumns}
        key={`grid-${gridColumns}`}
        contentContainerStyle={st.listContent}
        columnWrapperStyle={gridColumns > 1 ? st.columnWrapper : undefined}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        ListEmptyComponent={
          <View style={st.emptyState}>
            <View style={st.emptyIconContainer}>
              <Icon name="hardware-chip-outline" size={scale(64)} color={C.muted} />
            </View>
            <Text style={st.emptyTitle}>{equipments.length === 0 ? 'No Equipment Yet' : 'No Results'}</Text>
            <Text style={st.emptySubtitle}>
              {equipments.length === 0 ? 'Add your first equipment to get started' : 'Try different filters'}
            </Text>
            {equipments.length === 0 && (
              <TouchableOpacity style={st.emptyBtn} onPress={() => openForm()}>
                <Icon name="add" size={scale(18)} color="#fff" />
                <Text style={st.emptyBtnText}>Add Equipment</Text>
              </TouchableOpacity>
            )}
          </View>
        }
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContainer}>
            <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.modalHeader}>
              <Text style={st.modalTitle}>{form.id ? 'Edit Equipment' : 'Add Equipment'}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={st.modalCloseBtn}>
                <Icon name="close" size={scale(24)} color="#fff" />
              </TouchableOpacity>
            </LinearGradient>

            <ScrollView style={st.modalBody} contentContainerStyle={st.modalBodyContent} showsVerticalScrollIndicator={true}>
              {/* Restaurant */}
              <Text style={st.inputLabel}>Restaurant</Text>
              <View style={st.readOnlyInput}>
                <Icon name="business" size={scale(18)} color={C.muted} />
                <Text style={st.readOnlyText}>{selectedRestaurant?.name || 'No restaurant'}</Text>
              </View>

              {/* Category */}
              <Text style={st.inputLabel}>Category *</Text>
              <TouchableOpacity style={st.pickerBtn} onPress={() => setCategoryPickerVisible(true)}>
                <Text style={form.categoryId ? st.pickerText : st.pickerPlaceholder}>
                  {categories.find(c => c.id === form.categoryId)?.name || 'Select category'}
                </Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>

              {/* Subcategory */}
              <Text style={st.inputLabel}>Subcategory</Text>
              <TouchableOpacity
                style={[st.pickerBtn, !form.categoryId && st.pickerBtnDisabled]}
                onPress={() => form.categoryId && setSubCategoryPickerVisible(true)}
                disabled={!form.categoryId}
              >
                <Text style={form.subCategoryId ? st.pickerText : st.pickerPlaceholder}>
                  {subCategories.find(sc => sc.id === form.subCategoryId)?.name || 'Select subcategory'}
                </Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>

              {/* Brand & Model Row */}
              <View style={st.formRow}>
                <View style={st.formCol}>
                  <Text style={st.inputLabel}>Brand</Text>
                  <TextInput style={st.input} placeholder="e.g., Samsung" placeholderTextColor={C.muted}
                    value={form.brand} onChangeText={v => setForm(f => ({ ...f, brand: v }))} />
                </View>
                <View style={st.formCol}>
                  <Text style={st.inputLabel}>Model</Text>
                  <TextInput style={st.input} placeholder="e.g., XYZ-123" placeholderTextColor={C.muted}
                    value={form.model} onChangeText={v => setForm(f => ({ ...f, model: v }))} />
                </View>
              </View>

              {/* Serial Number */}
              <Text style={st.inputLabel}>Serial Number</Text>
              <TextInput style={st.input} placeholder="ABC123456" placeholderTextColor={C.muted}
                value={form.serialNumber} onChangeText={v => setForm(f => ({ ...f, serialNumber: v }))} />

              {/* Install Location */}
              <Text style={st.inputLabel}>Install Location</Text>
              <TextInput style={st.input} placeholder="e.g., Main Kitchen" placeholderTextColor={C.muted}
                value={form.installLocation} onChangeText={v => setForm(f => ({ ...f, installLocation: v }))} />

              {/* Purchase Date */}
              <Text style={st.inputLabel}>Purchase Date</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowPurchaseDatePicker(true)}>
                <Icon name="calendar" size={scale(18)} color={C.primary} />
                <Text style={form.purchaseDate ? st.dateText : st.datePlaceholder}>
                  {form.purchaseDate ? formatDateDisplay(form.purchaseDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
              {showPurchaseDatePicker && (
                <DateTimePicker value={form.purchaseDate ? new Date(form.purchaseDate) : new Date()}
                  mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onPurchaseDateChange} maximumDate={new Date()} />
              )}

              {/* Warranty End Date */}
              <Text style={st.inputLabel}>Warranty End Date</Text>
              <TouchableOpacity style={st.dateBtn} onPress={() => setShowWarrantyDatePicker(true)}>
                <Icon name="shield-checkmark" size={scale(18)} color={C.info} />
                <Text style={form.warrantyEndDate ? st.dateText : st.datePlaceholder}>
                  {form.warrantyEndDate ? formatDateDisplay(form.warrantyEndDate) : 'Select date'}
                </Text>
              </TouchableOpacity>
              {showWarrantyDatePicker && (
                <DateTimePicker value={form.warrantyEndDate ? new Date(form.warrantyEndDate) : new Date()}
                  mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onWarrantyDateChange} minimumDate={new Date()} />
              )}

              {/* Notes */}
              <Text style={st.inputLabel}>Notes</Text>
              <TextInput style={[st.input, st.textArea]} placeholder="Additional notes..." placeholderTextColor={C.muted}
                multiline numberOfLines={3} value={form.notes} onChangeText={v => setForm(f => ({ ...f, notes: v }))} />

              {/* Bill Image */}
              <Text style={st.inputLabel}>Bill Image</Text>
              {form.billImageUrl ? (
                <View style={st.imagePreview}>
                  <Image source={{ uri: getImageUrl(form.billImageUrl) }} style={st.previewImg} />
                  <TouchableOpacity style={st.removeImgBtn} onPress={() => setForm(f => ({ ...f, billImageUrl: '' }))}>
                    <Icon name="close-circle" size={scale(24)} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={st.uploadBtn} onPress={() => uploadImage('bills')} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color={C.primary} /> : (
                    <>
                      <Icon name="cloud-upload" size={scale(24)} color={C.primary} />
                      <Text style={st.uploadText}>Upload Bill</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Warranty Card */}
              <Text style={st.inputLabel}>Warranty Card</Text>
              {form.warrantyCardUrl ? (
                <View style={st.imagePreview}>
                  <Image source={{ uri: getImageUrl(form.warrantyCardUrl) }} style={st.previewImg} />
                  <TouchableOpacity style={st.removeImgBtn} onPress={() => setForm(f => ({ ...f, warrantyCardUrl: '' }))}>
                    <Icon name="close-circle" size={scale(24)} color={C.danger} />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={st.uploadBtn} onPress={() => uploadImage('warranty-cards')} disabled={uploading}>
                  {uploading ? <ActivityIndicator size="small" color={C.primary} /> : (
                    <>
                      <Icon name="shield-checkmark" size={scale(24)} color={C.primary} />
                      <Text style={st.uploadText}>Upload Warranty Card</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Photos */}
              <Text style={st.inputLabel}>Equipment Photos (Max 5)</Text>
              <View style={st.photosGrid}>
                {form.photoUrls.map((url, index) => (
                  <View key={index} style={st.photoItem}>
                    <Image source={{ uri: getImageUrl(url) }} style={st.photoImg} />
                    <TouchableOpacity style={st.removePhotoBtn} onPress={() => removePhoto(index)}>
                      <Icon name="close-circle" size={scale(20)} color={C.danger} />
                    </TouchableOpacity>
                  </View>
                ))}
                {form.photoUrls.length < 5 && (
                  <TouchableOpacity style={st.addPhotoBtn} onPress={() => uploadImage('photos')} disabled={uploading}>
                    {uploading ? <ActivityIndicator size="small" color={C.primary} /> : (
                      <Icon name="add" size={scale(28)} color={C.primary} />
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </ScrollView>

            {/* Modal Footer */}
            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={saveEquipment} disabled={saving}>
                <LinearGradient colors={[C.gradient1, C.gradient2]} style={st.saveBtnGradient}>
                  {saving ? <ActivityIndicator size="small" color="#fff" /> : (
                    <Text style={st.saveBtnText}>{form.id ? 'Save Changes' : 'Add Equipment'}</Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Category Picker Modal */}
      <Modal visible={categoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.pickerModalHeader}>
              <Text style={st.pickerModalTitle}>Select Category</Text>
              <TouchableOpacity onPress={() => setCategoryPickerVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerList}>
              {categories.map(c => (
                <TouchableOpacity key={c.id} style={[st.pickerItem, form.categoryId === c.id && st.pickerItemActive]}
                  onPress={() => { setForm(f => ({ ...f, categoryId: c.id, subCategoryId: '' })); setCategoryPickerVisible(false); }}>
                  <Icon name="folder" size={scale(20)} color={form.categoryId === c.id ? C.primary : C.muted} />
                  <Text style={[st.pickerItemText, form.categoryId === c.id && { color: C.primary }]}>{c.name}</Text>
                  {form.categoryId === c.id && <Icon name="checkmark-circle" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Subcategory Picker Modal */}
      <Modal visible={subCategoryPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.pickerModalHeader}>
              <Text style={st.pickerModalTitle}>Select Subcategory</Text>
              <TouchableOpacity onPress={() => setSubCategoryPickerVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={st.pickerList}>
              {subCategories.length === 0 ? (
                <View style={st.emptyPicker}><Text style={st.emptyPickerText}>No subcategories</Text></View>
              ) : subCategories.map(sc => (
                <TouchableOpacity key={sc.id} style={[st.pickerItem, form.subCategoryId === sc.id && st.pickerItemActive]}
                  onPress={() => { setForm(f => ({ ...f, subCategoryId: sc.id })); setSubCategoryPickerVisible(false); }}>
                  <Icon name="layers" size={scale(20)} color={form.subCategoryId === sc.id ? C.primary : C.muted} />
                  <Text style={[st.pickerItemText, form.subCategoryId === sc.id && { color: C.primary }]}>{sc.name}</Text>
                  {form.subCategoryId === sc.id && <Icon name="checkmark-circle" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="equipment" />
    </SafeAreaView>
  );
}

// ==================== STYLES ====================
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Hero Section (Compact)
  heroSection: { paddingTop: scale(8), paddingBottom: scale(16), borderBottomLeftRadius: scale(20), borderBottomRightRadius: scale(20) },
  heroContent: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), marginBottom: scale(12) },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginRight: scale(12) },
  heroTextContainer: { flex: 1 },
  heroTitle: { fontSize: moderateScale(24), fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  heroSubtitle: { fontSize: moderateScale(13), color: 'rgba(255,255,255,0.8)', marginTop: scale(2) },
  heroActions: { flexDirection: 'row', gap: scale(8) },
  heroIconBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },

  // Search
  searchContainer: { paddingHorizontal: scale(16) },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: scale(14), paddingHorizontal: scale(14), height: scale(48), shadowColor: '#000', shadowOffset: { width: 0, height: scale(4) }, shadowOpacity: 0.1, shadowRadius: scale(12), elevation: 5 },
  searchInput: { flex: 1, marginLeft: scale(10), fontSize: moderateScale(15), color: C.ink },
  clearBtn: { padding: scale(4) },

  // Filters
  filterSection: { paddingVertical: scale(10), borderBottomWidth: 1, borderBottomColor: C.border, backgroundColor: C.card },
  warrantyFilterSection: { paddingVertical: scale(8), backgroundColor: C.bg },
  filterScroll: { paddingHorizontal: scale(16) },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(14), paddingVertical: scale(10), marginRight: scale(8), backgroundColor: C.card, borderRadius: scale(20), borderWidth: 1.5, borderColor: C.border },
  filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  filterChipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  filterChipTextActive: { color: '#fff' },
  warrantyChip: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(12), paddingVertical: scale(8), marginRight: scale(8), backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1, borderColor: C.border },
  warrantyChipActive: { backgroundColor: C.info, borderColor: C.info },
  warrantyChipText: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  warrantyChipTextActive: { color: '#fff' },

  // Results Header
  resultsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(10) },
  resultsTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  clearFiltersBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.primaryLight, borderRadius: scale(8) },
  clearFiltersText: { fontSize: moderateScale(12), fontWeight: '600', color: C.primary },

  // List
  listContent: { paddingHorizontal: scale(16), paddingBottom: scale(120) },
  columnWrapper: { justifyContent: 'space-between' },

  // Card
  card: { flex: 1, backgroundColor: C.card, borderRadius: scale(16), marginBottom: scale(12), marginHorizontal: scale(4), shadowColor: C.shadow, shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3, overflow: 'hidden' },
  cardImageContainer: { height: scale(120), backgroundColor: C.bg, position: 'relative' },
  cardImage: { width: '100%', height: '100%' },
  cardImagePlaceholder: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  statusBadge: { position: 'absolute', top: scale(8), left: scale(8), flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(4), borderRadius: scale(8) },
  statusBadgeText: { fontSize: moderateScale(10), fontWeight: '700' },
  photoCountBadge: { position: 'absolute', top: scale(8), right: scale(8), flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(4), backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: scale(8) },
  photoCountText: { fontSize: moderateScale(10), fontWeight: '700', color: '#fff' },
  cardInfo: { padding: scale(12) },
  cardTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  categoryRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(4) },
  categoryText: { fontSize: moderateScale(12), color: C.muted },
  serialText: { fontSize: moderateScale(10), color: C.muted, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', marginTop: scale(4) },
  warrantyRow: { flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(8), paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(8) },
  warrantyText: { fontSize: moderateScale(11), fontWeight: '600' },
  docsRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(8) },
  docBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(4), backgroundColor: C.bg, borderRadius: scale(6) },
  docText: { fontSize: moderateScale(10), fontWeight: '600', color: C.muted },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: scale(8), padding: scale(12), paddingTop: 0 },
  serviceBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), paddingVertical: scale(10), backgroundColor: C.primary, borderRadius: scale(10) },
  serviceBtnText: { fontSize: moderateScale(12), fontWeight: '700', color: '#fff' },
  iconBtn: { width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: C.infoLight, alignItems: 'center', justifyContent: 'center' },

  // Loading & Empty
  loadingHero: { paddingVertical: scale(24), paddingHorizontal: scale(20), borderBottomLeftRadius: scale(24), borderBottomRightRadius: scale(24) },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: scale(16), fontSize: moderateScale(15), color: C.muted },
  emptyState: { alignItems: 'center', paddingTop: scale(60), paddingHorizontal: scale(40) },
  emptyIconContainer: { width: scale(120), height: scale(120), borderRadius: scale(60), backgroundColor: C.border, alignItems: 'center', justifyContent: 'center', marginBottom: scale(20) },
  emptyTitle: { fontSize: moderateScale(20), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  emptySubtitle: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center' },
  emptyBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginTop: scale(24), paddingHorizontal: scale(24), paddingVertical: scale(14), backgroundColor: C.primary, borderRadius: scale(14) },
  emptyBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContainer: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: SCREEN_HEIGHT * 0.9 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(20), paddingVertical: scale(16), borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  modalCloseBtn: { width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  modalBody: { flexGrow: 1, flexShrink: 1 },
  modalBodyContent: { padding: scale(20), paddingBottom: scale(30) },
  modalFooter: { flexDirection: 'row', gap: scale(12), padding: scale(20), borderTopWidth: 1, borderTopColor: C.border },

  // Form inputs
  inputLabel: { fontSize: moderateScale(13), fontWeight: '600', color: C.muted, marginBottom: scale(8), marginTop: scale(16) },
  input: { backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(14), fontSize: moderateScale(15), color: C.ink, borderWidth: 1, borderColor: C.border },
  textArea: { height: scale(80), textAlignVertical: 'top' },
  readOnlyInput: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(14), borderWidth: 1, borderColor: C.border },
  readOnlyText: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(14), borderWidth: 1, borderColor: C.border },
  pickerBtnDisabled: { opacity: 0.5 },
  pickerText: { fontSize: moderateScale(15), color: C.ink },
  pickerPlaceholder: { fontSize: moderateScale(15), color: C.muted },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: scale(10), backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(14), borderWidth: 1, borderColor: C.border },
  dateText: { fontSize: moderateScale(15), color: C.ink, flex: 1 },
  datePlaceholder: { fontSize: moderateScale(15), color: C.muted, flex: 1 },
  formRow: { flexDirection: 'row', gap: scale(12) },
  formCol: { flex: 1 },

  // Image uploads
  uploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(10), backgroundColor: C.bg, borderRadius: scale(12), paddingVertical: scale(20), borderWidth: 2, borderColor: C.border, borderStyle: 'dashed' },
  uploadText: { fontSize: moderateScale(14), fontWeight: '600', color: C.primary },
  imagePreview: { position: 'relative' },
  previewImg: { width: '100%', height: scale(120), borderRadius: scale(12), backgroundColor: C.bg },
  removeImgBtn: { position: 'absolute', top: scale(8), right: scale(8) },
  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  photoItem: { position: 'relative' },
  photoImg: { width: scale(80), height: scale(80), borderRadius: scale(12), backgroundColor: C.bg },
  removePhotoBtn: { position: 'absolute', top: scale(-6), right: scale(-6) },
  addPhotoBtn: { width: scale(80), height: scale(80), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: C.border, borderStyle: 'dashed' },

  // Modal buttons
  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center' },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  saveBtn: { flex: 1, borderRadius: scale(12), overflow: 'hidden' },
  saveBtnGradient: { paddingVertical: scale(14), alignItems: 'center' },
  saveBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Picker Modal
  pickerModal: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: SCREEN_HEIGHT * 0.7 },
  pickerModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: scale(20), borderBottomWidth: 1, borderBottomColor: C.border },
  pickerModalTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  pickerList: { padding: scale(16) },
  pickerItem: { flexDirection: 'row', alignItems: 'center', gap: scale(12), paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: C.border },
  pickerItemActive: { backgroundColor: C.primaryLight },
  pickerItemText: { flex: 1, fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  emptyPicker: { padding: scale(20), alignItems: 'center' },
  emptyPickerText: { fontSize: moderateScale(14), color: C.muted },
});
