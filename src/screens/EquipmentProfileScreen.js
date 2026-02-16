import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Image, Switch, Platform
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
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
  purple: '#8B5CF6',
};

const durationOptions = [
  { key: 'MONTHLY', label: 'Monthly (1 month)' },
  { key: 'QUARTERLY', label: 'Quarterly (3 months)' },
  { key: 'YEARLY', label: 'Yearly (12 months)' },
];

const getDurationLabel = (duration) => {
  return durationOptions.find(d => d.key === duration)?.label || duration;
};

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
      return { bg: '#ECFDF5', text: C.ok };
    case 'yellow':
      return { bg: '#FFFBEB', text: C.warn };
    case 'red':
      return { bg: '#FEF2F2', text: C.danger };
    default:
      return { bg: '#F3F4F6', text: C.muted };
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

const getAmcStatusStyle = (status) => {
  switch (status) {
    case 'ACTIVE':
      return { bg: '#ECFDF5', text: C.ok, label: 'Active' };
    case 'EXPIRED':
      return { bg: '#FEF2F2', text: C.danger, label: 'Expired' };
    case 'CANCELLED':
      return { bg: '#F3F4F6', text: C.muted, label: 'Cancelled' };
    default:
      return { bg: '#F3F4F6', text: C.muted, label: status };
  }
};

const getServiceStatusStyle = (status) => {
  switch (status) {
    case 'COMPLETED':
      return { bg: '#ECFDF5', color: C.ok, icon: 'checkmark-circle' };
    case 'IN_PROGRESS':
    case 'ACCEPTED':
      return { bg: '#EFF6FF', color: C.info, icon: 'time' };
    case 'PENDING':
      return { bg: '#FFFBEB', color: C.warn, icon: 'hourglass' };
    case 'CANCELLED':
    case 'REJECTED':
      return { bg: '#FEF2F2', color: C.danger, icon: 'close-circle' };
    default:
      return { bg: '#F3F4F6', color: C.muted, icon: 'ellipse' };
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function EquipmentProfileScreen({ navigation, route }) {
  const { equipmentId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [equipment, setEquipment] = useState(null);
  const [amcSubscriptions, setAmcSubscriptions] = useState([]);
  const [activeTab, setActiveTab] = useState('details');
  const [selectedImage, setSelectedImage] = useState(null);

  // AMC form state
  const [showAmcModal, setShowAmcModal] = useState(false);
  const [amcSaving, setAmcSaving] = useState(false);
  const [amcForm, setAmcForm] = useState({
    planName: '',
    planDescription: '',
    duration: 'MONTHLY',
    serviceLimit: '1',
    featuresJson: [],
    totalAmount: '',
    startDate: '',
    autoRenew: false,
  });
  const [featureInput, setFeatureInput] = useState('');
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  // Service booking state
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceSaving, setServiceSaving] = useState(false);
  const [selectedServices, setSelectedServices] = useState([]);
  const [serviceForm, setServiceForm] = useState({
    slotDate: '',
    slotTime: '',
    problemDescription: '',
  });

  const fetchEquipment = useCallback(async () => {
    if (!equipmentId) return;
    try {
      const { data } = await api.get(`/owner/equipment/${equipmentId}`);
      if (data.ok && data.data) {
        setEquipment(data.data);
        setAmcForm(f => ({
          ...f,
          planName: `${data.data.name} Maintenance Plan`,
        }));
      }
    } catch (error) {
      console.log('Error fetching equipment:', error);
      Alert.alert('Error', 'Failed to load equipment details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [equipmentId]);

  const fetchAmcSubscriptions = useCallback(async () => {
    if (!equipmentId) return;
    try {
      const { data } = await api.get(`/owner/equipment/${equipmentId}/amc`);
      if (data.ok) {
        setAmcSubscriptions(data.data || []);
      }
    } catch (error) {
      console.log('Error fetching AMC:', error);
    }
  }, [equipmentId]);

  useEffect(() => {
    fetchEquipment();
    fetchAmcSubscriptions();
  }, [fetchEquipment, fetchAmcSubscriptions]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchEquipment();
    fetchAmcSubscriptions();
  };

  // AMC functions
  const handleAddFeature = () => {
    if (featureInput.trim()) {
      setAmcForm(f => ({
        ...f,
        featuresJson: [...f.featuresJson, featureInput.trim()],
      }));
      setFeatureInput('');
    }
  };

  const handleRemoveFeature = (index) => {
    setAmcForm(f => ({
      ...f,
      featuresJson: f.featuresJson.filter((_, i) => i !== index),
    }));
  };

  const onStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setAmcForm(f => ({ ...f, startDate: dateStr }));
    }
  };

  const handleCreateAmc = async () => {
    if (!amcForm.planName.trim()) {
      Alert.alert('Error', 'Please enter plan name');
      return;
    }
    if (!amcForm.startDate) {
      Alert.alert('Error', 'Please enter start date');
      return;
    }
    if (!amcForm.serviceLimit || parseInt(amcForm.serviceLimit) < 1) {
      Alert.alert('Error', 'Please enter valid service limit');
      return;
    }

    setAmcSaving(true);
    try {
      const payload = {
        equipmentId,
        planName: amcForm.planName,
        planDescription: amcForm.planDescription || undefined,
        duration: amcForm.duration,
        serviceLimit: parseInt(amcForm.serviceLimit),
        featuresJson: amcForm.featuresJson.length > 0 ? amcForm.featuresJson : undefined,
        totalAmount: parseFloat(amcForm.totalAmount || 0),
        startDate: new Date(amcForm.startDate).toISOString(),
        autoRenew: amcForm.autoRenew,
      };

      const { data } = await api.post(`/owner/equipment/${equipmentId}/amc`, payload);
      if (data.ok) {
        Alert.alert('Success', 'AMC subscription created successfully');
        setShowAmcModal(false);
        setAmcForm({
          planName: equipment?.name ? `${equipment.name} Maintenance Plan` : '',
          planDescription: '',
          duration: 'MONTHLY',
          serviceLimit: '1',
          featuresJson: [],
          totalAmount: '',
          startDate: '',
          autoRenew: false,
        });
        fetchAmcSubscriptions();
      } else {
        Alert.alert('Error', data.error || 'Failed to create AMC');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create AMC subscription');
    } finally {
      setAmcSaving(false);
    }
  };

  const handleCancelAmc = (amcId) => {
    Alert.alert(
      'Cancel AMC',
      'Are you sure you want to cancel this AMC subscription?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/equipment/${equipmentId}/amc/${amcId}`);
              Alert.alert('Success', 'AMC subscription cancelled');
              fetchAmcSubscriptions();
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel AMC');
            }
          },
        },
      ]
    );
  };

  const handleToggleAutoRenew = async (amcId, currentValue) => {
    try {
      const { data } = await api.patch(`/owner/equipment/${equipmentId}/amc/${amcId}`, {
        autoRenew: !currentValue,
      });
      if (data.ok) {
        Alert.alert('Success', `Auto-renew ${!currentValue ? 'enabled' : 'disabled'}`);
        fetchAmcSubscriptions();
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update auto-renew');
    }
  };

  // Service booking
  const toggleServiceSelection = (serviceId) => {
    setSelectedServices(prev =>
      prev.includes(serviceId)
        ? prev.filter(id => id !== serviceId)
        : [...prev, serviceId]
    );
  };

  const handleServiceBooking = async () => {
    if (!serviceForm.slotDate || !serviceForm.slotTime) {
      Alert.alert('Error', 'Please provide slot date and time');
      return;
    }

    const templates = equipment?.equipmentType?.serviceTemplates || [];
    if (templates.length > 0 && selectedServices.length === 0) {
      Alert.alert('Error', 'Please select at least one service');
      return;
    }

    setServiceSaving(true);
    try {
      const slotDateTime = new Date(`${serviceForm.slotDate}T${serviceForm.slotTime}`);

      const { data } = await api.post('/owner/equipment-booking', {
        restaurantId: equipment.restaurant.id,
        equipmentId: equipment.id,
        serviceTemplateIds: selectedServices.length > 0 ? selectedServices : undefined,
        slotStartDateTime: slotDateTime.toISOString(),
        problemDescription: serviceForm.problemDescription || undefined,
      });

      if (data.ok) {
        Alert.alert('Success', 'Service request created successfully');
        setShowServiceModal(false);
        setSelectedServices([]);
        setServiceForm({
          slotDate: '',
          slotTime: '',
          problemDescription: '',
        });
        fetchEquipment();
      } else {
        Alert.alert('Error', data.error || 'Failed to create service request');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create service request');
    } finally {
      setServiceSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!equipment) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Equipment Profile</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={st.emptyBox}>
          <Icon name="alert-circle-outline" size={scale(64)} color={C.muted} />
          <Text style={st.emptyTitle}>Equipment Not Found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const warrantyStatus = getWarrantyStatus(equipment.warrantyEndDate);
  const warrantyStyle = getWarrantyStyle(warrantyStatus);
  const statusStyle = getStatusStyle(equipment.status);
  const activeAmc = amcSubscriptions.find(amc => amc.status === 'ACTIVE');
  const photoUrls = Array.isArray(equipment.photoUrls) ? equipment.photoUrls : [];
  const serviceHistory = equipment.serviceHistory || [];

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.headerTitle} numberOfLines={1}>{equipment.name}</Text>
        <TouchableOpacity
          onPress={() => {
            // Navigate to ServiceRequest screen (same flow as owner web /owner/request-service)
            const categoryObj = typeof equipment.category === 'object' ? equipment.category : null;
            const subCategoryObj = typeof equipment.subCategory === 'object' ? equipment.subCategory : null;
            // Also check equipmentType for category/subCategory (nested structure)
            const typeCategory = equipment.equipmentType?.category;
            const typeSubCategory = equipment.equipmentType?.subCategory;

            navigation.navigate('ServiceRequest', {
              equipmentId: equipment.id,
              equipmentName: equipment.name,
              categoryId: categoryObj?.id || typeCategory?.id || equipment.categoryId || null,
              categoryName: categoryObj?.name || typeCategory?.name || (typeof equipment.category === 'string' ? equipment.category : null),
              subCategoryId: subCategoryObj?.id || typeSubCategory?.id || equipment.subCategoryId || null,
              subCategoryName: subCategoryObj?.name || typeSubCategory?.name || (typeof equipment.subCategory === 'string' ? equipment.subCategory : null),
            });
          }}
          style={st.serviceBtn}
        >
          <Icon name="construct" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator
      >
        {/* Equipment Info Card */}
        <View style={st.infoCard}>
          <View style={st.infoHeader}>
            <View style={st.iconBox}>
              {photoUrls.length > 0 ? (
                <Image source={{ uri: getImageUrl(photoUrls[0]) }} style={st.equipImage} />
              ) : (
                <Icon name="hardware-chip-outline" size={scale(32)} color={C.primary} />
              )}
            </View>
            <View style={st.infoMain}>
              <Text style={st.equipName}>{equipment.name}</Text>
              <Text style={st.equipCategory}>
                {equipment.equipmentType?.category?.name ||
                 (typeof equipment.category === 'object' ? equipment.category?.name : equipment.category)}
              </Text>
              <View style={st.badgeRow}>
                <View style={[st.badge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[st.badgeText, { color: statusStyle.text }]}>{statusStyle.label}</Text>
                </View>
                <View style={[st.badge, { backgroundColor: warrantyStyle.bg }]}>
                  <Text style={[st.badgeText, { color: warrantyStyle.text }]}>{warrantyStatus.label}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Quick Stats */}
          <View style={st.statsGrid}>
            <View style={st.statCard}>
              <View style={[st.statIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="time-outline" size={scale(20)} color={C.info} />
              </View>
              <Text style={st.statValue}>{serviceHistory.length}</Text>
              <Text style={st.statLabel}>Total Services</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="checkmark-circle-outline" size={scale(20)} color={C.ok} />
              </View>
              <Text style={st.statValue}>{equipment.completedServicesCount || 0}</Text>
              <Text style={st.statLabel}>Completed</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIcon, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="cash-outline" size={scale(20)} color="#F97316" />
              </View>
              <Text style={st.statValue}>
                {equipment.totalSpend > 0 ? `₹${equipment.totalSpend.toLocaleString()}` : '₹0'}
              </Text>
              <Text style={st.statLabel}>Total Spend</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View style={st.tabBar}>
          {['details', 'amc', 'images', 'history'].map(tab => (
            <TouchableOpacity
              key={tab}
              style={[st.tab, activeTab === tab && st.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[st.tabText, activeTab === tab && st.tabTextActive]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {activeTab === 'details' && (
          <View style={st.section}>
            <View style={st.detailsCard}>
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Restaurant</Text>
                <Text style={st.detailValue}>{equipment.restaurant?.name || '-'}</Text>
              </View>
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Serial Number</Text>
                <Text style={[st.detailValue, { fontFamily: 'monospace' }]}>
                  {equipment.serialNumber || '-'}
                </Text>
              </View>
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Purchase Date</Text>
                <Text style={st.detailValue}>{formatDate(equipment.purchaseDate)}</Text>
              </View>
              <View style={st.detailRow}>
                <Text style={st.detailLabel}>Warranty Until</Text>
                <Text style={[st.detailValue, { color: warrantyStyle.text }]}>
                  {equipment.warrantyEndDate ? formatDate(equipment.warrantyEndDate) : 'No Warranty'}
                </Text>
              </View>
              {equipment.notes && (
                <View style={[st.detailRow, { borderBottomWidth: 0 }]}>
                  <Text style={st.detailLabel}>Notes</Text>
                  <Text style={st.detailValue}>{equipment.notes}</Text>
                </View>
              )}
            </View>
          </View>
        )}

        {activeTab === 'images' && (
          <View style={st.section}>
            {/* Documents */}
            {(equipment.billImageUrl || equipment.warrantyCardUrl) && (
              <View style={st.imagesSection}>
                <Text style={st.sectionTitle}>Documents</Text>
                <View style={st.docsGrid}>
                  {equipment.billImageUrl && (
                    <TouchableOpacity
                      style={st.docCard}
                      onPress={() => setSelectedImage(getImageUrl(equipment.billImageUrl))}
                    >
                      <Image source={{ uri: getImageUrl(equipment.billImageUrl) }} style={st.docImage} />
                      <View style={st.docOverlay}>
                        <Icon name="document-text" size={scale(24)} color="#fff" />
                      </View>
                      <Text style={st.docLabel}>Purchase Bill</Text>
                    </TouchableOpacity>
                  )}
                  {equipment.warrantyCardUrl && (
                    <TouchableOpacity
                      style={st.docCard}
                      onPress={() => setSelectedImage(getImageUrl(equipment.warrantyCardUrl))}
                    >
                      <Image source={{ uri: getImageUrl(equipment.warrantyCardUrl) }} style={st.docImage} />
                      <View style={st.docOverlay}>
                        <Icon name="shield-checkmark" size={scale(24)} color="#fff" />
                      </View>
                      <Text style={st.docLabel}>Warranty Card</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}

            {/* Equipment Photos */}
            {photoUrls.length > 0 ? (
              <View style={st.imagesSection}>
                <Text style={st.sectionTitle}>Equipment Photos</Text>
                <View style={st.photosGrid}>
                  {photoUrls.map((url, index) => (
                    <TouchableOpacity
                      key={index}
                      style={st.photoCard}
                      onPress={() => setSelectedImage(getImageUrl(url))}
                    >
                      <Image source={{ uri: getImageUrl(url) }} style={st.photoImage} />
                      <View style={st.photoIndex}>
                        <Text style={st.photoIndexText}>{index + 1}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : (
              !equipment.billImageUrl && !equipment.warrantyCardUrl && (
                <View style={st.emptySection}>
                  <Icon name="images-outline" size={scale(48)} color={C.muted} />
                  <Text style={st.emptySectionText}>No images uploaded</Text>
                </View>
              )
            )}
          </View>
        )}

        {activeTab === 'history' && (
          <View style={st.section}>
            {serviceHistory.length > 0 ? (
              serviceHistory.slice(0, 10).map((service, index) => {
                const statusStyle = getServiceStatusStyle(service.status);
                return (
                  <View key={service.id} style={st.historyCard}>
                    <View style={st.historyTimeline}>
                      <View style={[st.timelineDot, { backgroundColor: statusStyle.color }]} />
                      {index < serviceHistory.length - 1 && <View style={st.timelineLine} />}
                    </View>
                    <View style={st.historyContent}>
                      <View style={st.historyHeader}>
                        <Text style={st.historyDate}>
                          {formatDate(service.slotStartDateTime || service.createdAt)}
                        </Text>
                        <View style={[st.historyStatus, { backgroundColor: statusStyle.bg }]}>
                          <Icon name={statusStyle.icon} size={scale(12)} color={statusStyle.color} />
                          <Text style={[st.historyStatusText, { color: statusStyle.color }]}>
                            {service.status?.replace('_', ' ')}
                          </Text>
                        </View>
                      </View>
                      <Text style={st.historyDesc} numberOfLines={2}>
                        {(service.items?.map(item => item.serviceItem?.name || item.partItem?.name) || []).join(', ') ||
                          service.problemDescription || 'Service Request'}
                      </Text>
                      <View style={st.historyFooter}>
                        <Text style={st.historyCost}>
                          ₹{(service.totalAmount || 0).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={st.emptySection}>
                <Icon name="construct-outline" size={scale(48)} color={C.muted} />
                <Text style={st.emptySectionText}>No service history yet</Text>
                <TouchableOpacity
                  style={st.emptyBtn}
                  onPress={() => {
                    // Navigate to ServiceRequest screen (same flow as owner web /owner/request-service)
                    const categoryObj = typeof equipment.category === 'object' ? equipment.category : null;
                    const subCategoryObj = typeof equipment.subCategory === 'object' ? equipment.subCategory : null;
                    const typeCategory = equipment.equipmentType?.category;
                    const typeSubCategory = equipment.equipmentType?.subCategory;

                    navigation.navigate('ServiceRequest', {
                      equipmentId: equipment.id,
                      equipmentName: equipment.name,
                      categoryId: categoryObj?.id || typeCategory?.id || equipment.categoryId || null,
                      categoryName: categoryObj?.name || typeCategory?.name || (typeof equipment.category === 'string' ? equipment.category : null),
                      subCategoryId: subCategoryObj?.id || typeSubCategory?.id || equipment.subCategoryId || null,
                      subCategoryName: subCategoryObj?.name || typeSubCategory?.name || (typeof equipment.subCategory === 'string' ? equipment.subCategory : null),
                    });
                  }}
                >
                  <Icon name="add" size={scale(18)} color="#fff" />
                  <Text style={st.emptyBtnText}>Request First Service</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {activeTab === 'amc' && (
          <View style={st.section}>
            {/* Active AMC */}
            {activeAmc ? (
              <View style={st.amcActiveCard}>
                <View style={st.amcActiveHeader}>
                  <View style={st.amcActiveBadge}>
                    <Icon name="checkmark-circle" size={scale(16)} color={C.ok} />
                    <Text style={st.amcActiveLabel}>Active AMC</Text>
                  </View>
                </View>
                <Text style={st.amcPlanName}>{activeAmc.planName || 'Custom Plan'}</Text>
                {activeAmc.planDescription && (
                  <Text style={st.amcDescription}>{activeAmc.planDescription}</Text>
                )}

                <View style={st.amcDetails}>
                  <View style={st.amcDetailItem}>
                    <Text style={st.amcDetailLabel}>Duration</Text>
                    <Text style={st.amcDetailValue}>{getDurationLabel(activeAmc.duration)}</Text>
                  </View>
                  <View style={st.amcDetailItem}>
                    <Text style={st.amcDetailLabel}>Amount</Text>
                    <Text style={st.amcDetailValue}>₹{activeAmc.totalAmount.toLocaleString()}</Text>
                  </View>
                  <View style={st.amcDetailItem}>
                    <Text style={st.amcDetailLabel}>Period</Text>
                    <Text style={st.amcDetailValue}>
                      {formatDate(activeAmc.startDate)} - {formatDate(activeAmc.endDate)}
                    </Text>
                  </View>
                </View>

                {/* Service Usage */}
                <View style={st.usageBox}>
                  <View style={st.usageHeader}>
                    <Text style={st.usageLabel}>Service Usage</Text>
                    <Text style={st.usageText}>
                      {activeAmc.servicesUsed} / {activeAmc.serviceLimit}
                    </Text>
                  </View>
                  <View style={st.progressBar}>
                    <View
                      style={[
                        st.progressFill,
                        {
                          width: `${Math.min(100, (activeAmc.servicesUsed / activeAmc.serviceLimit) * 100)}%`,
                          backgroundColor: activeAmc.servicesUsed >= activeAmc.serviceLimit ? C.danger : C.ok,
                        },
                      ]}
                    />
                  </View>
                  <Text style={st.usageRemaining}>
                    {activeAmc.serviceLimit - activeAmc.servicesUsed} services remaining
                  </Text>
                </View>

                {/* Features */}
                {activeAmc.featuresJson && activeAmc.featuresJson.length > 0 && (
                  <View style={st.featuresBox}>
                    <Text style={st.featuresTitle}>Features</Text>
                    {activeAmc.featuresJson.map((feature, index) => (
                      <View key={index} style={st.featureItem}>
                        <Icon name="checkmark" size={scale(14)} color={C.ok} />
                        <Text style={st.featureText}>{feature}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Auto-renew toggle */}
                <View style={st.autoRenewRow}>
                  <Text style={st.autoRenewLabel}>Auto-Renew</Text>
                  <Switch
                    value={activeAmc.autoRenew}
                    onValueChange={() => handleToggleAutoRenew(activeAmc.id, activeAmc.autoRenew)}
                    trackColor={{ false: C.border, true: C.ok }}
                    thumbColor={activeAmc.autoRenew ? '#fff' : '#f4f3f4'}
                  />
                </View>

                <TouchableOpacity
                  style={st.cancelAmcBtn}
                  onPress={() => handleCancelAmc(activeAmc.id)}
                >
                  <Text style={st.cancelAmcText}>Cancel AMC</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={st.noAmcCard}>
                <Icon name="shield-outline" size={scale(48)} color={C.muted} />
                <Text style={st.noAmcTitle}>No Active AMC</Text>
                <Text style={st.noAmcText}>Create a maintenance plan for this equipment</Text>
                <TouchableOpacity style={st.createAmcBtn} onPress={() => setShowAmcModal(true)}>
                  <Icon name="add" size={scale(18)} color="#fff" />
                  <Text style={st.createAmcText}>Create AMC Plan</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* AMC History */}
            {amcSubscriptions.length > 0 && (
              <View style={st.amcHistorySection}>
                <Text style={st.sectionTitle}>AMC History</Text>
                {amcSubscriptions.map(amc => {
                  const amcStyle = getAmcStatusStyle(amc.status);
                  return (
                    <View key={amc.id} style={st.amcHistoryCard}>
                      <View style={st.amcHistoryHeader}>
                        <Text style={st.amcHistoryName}>{amc.planName || 'Custom Plan'}</Text>
                        <View style={[st.amcHistoryBadge, { backgroundColor: amcStyle.bg }]}>
                          <Text style={[st.amcHistoryStatus, { color: amcStyle.text }]}>
                            {amcStyle.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={st.amcHistoryDuration}>{getDurationLabel(amc.duration)}</Text>
                      <Text style={st.amcHistoryPeriod}>
                        {formatDate(amc.startDate)} - {formatDate(amc.endDate)}
                      </Text>
                      <Text style={st.amcHistoryUsage}>
                        {amc.servicesUsed} / {amc.serviceLimit} services used
                      </Text>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={!!selectedImage} animationType="fade" transparent>
        <View style={st.imageModal}>
          <TouchableOpacity style={st.imageModalClose} onPress={() => setSelectedImage(null)}>
            <Icon name="close" size={scale(28)} color="#fff" />
          </TouchableOpacity>
          {selectedImage && (
            <Image source={{ uri: selectedImage }} style={st.imageModalImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* Create AMC Modal */}
      <Modal visible={showAmcModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Create AMC Plan</Text>
              <TouchableOpacity onPress={() => setShowAmcModal(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator bounces>
              <Text style={st.label}>Plan Name *</Text>
              <TextInput
                style={st.input}
                placeholder="e.g., Monthly Oven Maintenance"
                placeholderTextColor={C.muted}
                value={amcForm.planName}
                onChangeText={v => setAmcForm(f => ({ ...f, planName: v }))}
              />

              <Text style={st.label}>Description</Text>
              <TextInput
                style={[st.input, { height: scale(80), textAlignVertical: 'top' }]}
                placeholder="Describe what's included..."
                placeholderTextColor={C.muted}
                multiline
                value={amcForm.planDescription}
                onChangeText={v => setAmcForm(f => ({ ...f, planDescription: v }))}
              />

              <Text style={st.label}>Duration *</Text>
              <TouchableOpacity
                style={st.pickerBtn}
                onPress={() => setDurationPickerVisible(true)}
              >
                <Text style={st.pickerText}>{getDurationLabel(amcForm.duration)}</Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>

              <Text style={st.label}>Service Limit *</Text>
              <TextInput
                style={st.input}
                placeholder="Number of services"
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                value={amcForm.serviceLimit}
                onChangeText={v => setAmcForm(f => ({ ...f, serviceLimit: v }))}
              />

              <Text style={st.label}>Plan Cost (₹) *</Text>
              <TextInput
                style={st.input}
                placeholder="0.00"
                placeholderTextColor={C.muted}
                keyboardType="decimal-pad"
                value={amcForm.totalAmount}
                onChangeText={v => setAmcForm(f => ({ ...f, totalAmount: v }))}
              />

              <Text style={st.label}>Features</Text>
              <View style={st.featureInputRow}>
                <TextInput
                  style={[st.input, { flex: 1 }]}
                  placeholder="Add a feature"
                  placeholderTextColor={C.muted}
                  value={featureInput}
                  onChangeText={setFeatureInput}
                />
                <TouchableOpacity style={st.addFeatureBtn} onPress={handleAddFeature}>
                  <Icon name="add" size={scale(20)} color="#fff" />
                </TouchableOpacity>
              </View>
              {amcForm.featuresJson.length > 0 && (
                <View style={st.featuresList}>
                  {amcForm.featuresJson.map((feature, index) => (
                    <View key={index} style={st.featureBadge}>
                      <Text style={st.featureBadgeText}>{feature}</Text>
                      <TouchableOpacity onPress={() => handleRemoveFeature(index)}>
                        <Icon name="close-circle" size={scale(16)} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={st.label}>Start Date *</Text>
              <TouchableOpacity
                style={st.pickerBtn}
                onPress={() => setShowStartDatePicker(true)}
              >
                <Text style={amcForm.startDate ? st.pickerText : { fontSize: moderateScale(14), color: C.muted }}>
                  {amcForm.startDate || 'Select start date'}
                </Text>
                <Icon name="calendar-outline" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
              {showStartDatePicker && (
                <DateTimePicker
                  value={amcForm.startDate ? new Date(amcForm.startDate) : new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onStartDateChange}
                  minimumDate={new Date()}
                />
              )}

              <View style={st.switchRow}>
                <Text style={st.switchLabel}>Enable auto-renewal</Text>
                <Switch
                  value={amcForm.autoRenew}
                  onValueChange={v => setAmcForm(f => ({ ...f, autoRenew: v }))}
                  trackColor={{ false: C.border, true: C.ok }}
                  thumbColor={amcForm.autoRenew ? '#fff' : '#f4f3f4'}
                />
              </View>
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowAmcModal(false)}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={handleCreateAmc} disabled={amcSaving}>
                {amcSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.saveText}>Create AMC</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Duration Picker Modal */}
      <Modal visible={durationPickerVisible} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.pickerModal}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Select Duration</Text>
              <TouchableOpacity onPress={() => setDurationPickerVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <View style={st.pickerList}>
              {durationOptions.map(opt => (
                <TouchableOpacity
                  key={opt.key}
                  style={[st.pickerItem, amcForm.duration === opt.key && st.pickerItemActive]}
                  onPress={() => {
                    setAmcForm(f => ({ ...f, duration: opt.key }));
                    setDurationPickerVisible(false);
                  }}
                >
                  <Text style={[st.pickerItemText, amcForm.duration === opt.key && { color: C.primary }]}>
                    {opt.label}
                  </Text>
                  {amcForm.duration === opt.key && (
                    <Icon name="checkmark-circle" size={scale(20)} color={C.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Service Booking Modal */}
      <Modal visible={showServiceModal} animationType="slide" transparent>
        <View style={st.modalOverlay}>
          <View style={st.modalContent}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Request Service</Text>
              <TouchableOpacity onPress={() => setShowServiceModal(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody} contentContainerStyle={{ padding: scale(16), paddingBottom: scale(30) }} nestedScrollEnabled keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator bounces>
              {/* Service Templates */}
              {equipment.equipmentType?.serviceTemplates?.length > 0 && (
                <>
                  <Text style={st.label}>Available Services</Text>
                  {equipment.equipmentType.serviceTemplates.map(service => (
                    <TouchableOpacity
                      key={service.id}
                      style={[
                        st.serviceCard,
                        selectedServices.includes(service.id) && st.serviceCardActive,
                      ]}
                      onPress={() => toggleServiceSelection(service.id)}
                    >
                      <View style={st.serviceCheckbox}>
                        {selectedServices.includes(service.id) ? (
                          <Icon name="checkmark-circle" size={scale(22)} color={C.primary} />
                        ) : (
                          <Icon name="ellipse-outline" size={scale(22)} color={C.muted} />
                        )}
                      </View>
                      <View style={st.serviceInfo}>
                        <Text style={st.serviceName}>{service.name}</Text>
                        {service.description && (
                          <Text style={st.serviceDesc}>{service.description}</Text>
                        )}
                      </View>
                      {service.estimatedPrice && (
                        <Text style={st.servicePrice}>
                          ₹{service.estimatedPrice.toLocaleString()}
                        </Text>
                      )}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              <Text style={st.label}>Preferred Date *</Text>
              {/* Quick Date Selection */}
              <View style={st.quickDateRow}>
                {[
                  { label: 'Today', days: 0 },
                  { label: 'Tomorrow', days: 1 },
                  { label: 'In 2 Days', days: 2 },
                  { label: 'In 3 Days', days: 3 },
                ].map(opt => {
                  const date = new Date();
                  date.setDate(date.getDate() + opt.days);
                  const dateStr = date.toISOString().split('T')[0];
                  const isSelected = serviceForm.slotDate === dateStr;
                  return (
                    <TouchableOpacity
                      key={opt.days}
                      style={[st.quickDateChip, isSelected && st.quickDateChipActive]}
                      onPress={() => setServiceForm(f => ({ ...f, slotDate: dateStr }))}
                    >
                      <Text style={[st.quickDateText, isSelected && st.quickDateTextActive]}>
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={st.input}
                placeholder="Or enter date: YYYY-MM-DD"
                placeholderTextColor={C.muted}
                value={serviceForm.slotDate}
                onChangeText={v => setServiceForm(f => ({ ...f, slotDate: v }))}
              />

              <Text style={st.label}>Preferred Time *</Text>
              {/* Quick Time Selection */}
              <View style={st.quickTimeRow}>
                {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map(time => {
                  const isSelected = serviceForm.slotTime === time;
                  return (
                    <TouchableOpacity
                      key={time}
                      style={[st.quickTimeChip, isSelected && st.quickTimeChipActive]}
                      onPress={() => setServiceForm(f => ({ ...f, slotTime: time }))}
                    >
                      <Icon
                        name="time-outline"
                        size={scale(14)}
                        color={isSelected ? '#fff' : C.muted}
                      />
                      <Text style={[st.quickTimeText, isSelected && st.quickTimeTextActive]}>
                        {time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <TextInput
                style={st.input}
                placeholder="Or enter time: HH:MM (e.g., 10:30)"
                placeholderTextColor={C.muted}
                value={serviceForm.slotTime}
                onChangeText={v => setServiceForm(f => ({ ...f, slotTime: v }))}
              />

              <Text style={st.label}>Problem Description</Text>
              <TextInput
                style={[st.input, { height: scale(100), textAlignVertical: 'top' }]}
                placeholder="Describe the issue or maintenance needed..."
                placeholderTextColor={C.muted}
                multiline
                value={serviceForm.problemDescription}
                onChangeText={v => setServiceForm(f => ({ ...f, problemDescription: v }))}
              />
            </ScrollView>

            <View style={st.modalFooter}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setShowServiceModal(false)}>
                <Text style={st.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.saveBtn} onPress={handleServiceBooking} disabled={serviceSaving}>
                {serviceSaving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.saveText}>Request Service</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink, marginTop: scale(16) },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink, flex: 1, textAlign: 'center' },
  serviceBtn: { width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: scale(100) },

  infoCard: {
    backgroundColor: C.card, margin: scale(16), borderRadius: scale(16),
    padding: scale(16), borderWidth: 1, borderColor: C.border
  },
  infoHeader: { flexDirection: 'row', gap: scale(12) },
  iconBox: {
    width: scale(64), height: scale(64), borderRadius: scale(16), backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  equipImage: { width: scale(64), height: scale(64), borderRadius: scale(16) },
  infoMain: { flex: 1 },
  equipName: { fontSize: moderateScale(20), fontWeight: '900', color: C.ink },
  equipCategory: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(2) },
  badgeRow: { flexDirection: 'row', gap: scale(8), marginTop: scale(8) },
  badge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8) },
  badgeText: { fontSize: moderateScale(11), fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: scale(16) },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: scale(12), backgroundColor: C.bg, borderRadius: scale(12) },
  statIcon: { width: scale(40), height: scale(40), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center', marginBottom: scale(8) },
  statValue: { fontSize: moderateScale(16), fontWeight: '900', color: C.ink },
  statLabel: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(2) },

  tabBar: { flexDirection: 'row', marginHorizontal: scale(16), backgroundColor: C.card, borderRadius: scale(12), padding: scale(4) },
  tab: { flex: 1, paddingVertical: scale(10), alignItems: 'center', borderRadius: scale(10) },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: moderateScale(13), fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  section: { padding: scale(16) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '900', color: C.ink, marginBottom: scale(12) },

  detailsCard: { backgroundColor: C.card, borderRadius: scale(12), padding: scale(12), borderWidth: 1, borderColor: C.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: scale(10), borderBottomWidth: 1, borderBottomColor: C.border },
  detailLabel: { fontSize: moderateScale(13), color: C.muted },
  detailValue: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink, textAlign: 'right', flex: 1, marginLeft: scale(16) },

  imagesSection: { marginBottom: scale(24) },
  docsGrid: { flexDirection: 'row', gap: scale(12) },
  docCard: { flex: 1, position: 'relative' },
  docImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: scale(12), backgroundColor: C.bg },
  docOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: scale(12), alignItems: 'center', justifyContent: 'center'
  },
  docLabel: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginTop: scale(6), textAlign: 'center' },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(12) },
  photoCard: { position: 'relative' },
  photoImage: { width: scale(100), height: scale(100), borderRadius: scale(12), backgroundColor: C.bg },
  photoIndex: {
    position: 'absolute', top: scale(6), left: scale(6),
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: scale(4), paddingHorizontal: scale(6), paddingVertical: scale(2)
  },
  photoIndexText: { fontSize: moderateScale(10), fontWeight: '700', color: '#fff' },

  emptySection: { alignItems: 'center', paddingVertical: scale(32) },
  emptySectionText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(8) },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(16),
    paddingHorizontal: scale(16), paddingVertical: scale(10), borderRadius: scale(10), backgroundColor: C.primary
  },
  emptyBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#fff' },

  historyCard: { flexDirection: 'row', marginBottom: scale(4) },
  historyTimeline: { width: scale(24), alignItems: 'center' },
  timelineDot: { width: scale(10), height: scale(10), borderRadius: scale(5) },
  timelineLine: { width: scale(2), flex: 1, backgroundColor: C.border, marginTop: scale(4) },
  historyContent: {
    flex: 1, backgroundColor: C.card, borderRadius: scale(12), padding: scale(12),
    marginLeft: scale(8), marginBottom: scale(12), borderWidth: 1, borderColor: C.border
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: moderateScale(12), fontWeight: '700', color: C.ink },
  historyStatus: { flexDirection: 'row', alignItems: 'center', gap: scale(4), paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(6) },
  historyStatusText: { fontSize: moderateScale(10), fontWeight: '700', textTransform: 'capitalize' },
  historyDesc: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(6) },
  historyFooter: { marginTop: scale(8) },
  historyCost: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink },

  // AMC Styles
  amcActiveCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16),
    borderWidth: 2, borderColor: C.ok
  },
  amcActiveHeader: { marginBottom: scale(8) },
  amcActiveBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6) },
  amcActiveLabel: { fontSize: moderateScale(13), fontWeight: '700', color: C.ok },
  amcPlanName: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },
  amcDescription: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(4) },
  amcDetails: { marginTop: scale(16), gap: scale(12) },
  amcDetailItem: { flexDirection: 'row', justifyContent: 'space-between' },
  amcDetailLabel: { fontSize: moderateScale(13), color: C.muted },
  amcDetailValue: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  usageBox: { marginTop: scale(16), padding: scale(12), backgroundColor: C.bg, borderRadius: scale(12) },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(8) },
  usageLabel: { fontSize: moderateScale(12), fontWeight: '600', color: C.muted },
  usageText: { fontSize: moderateScale(12), fontWeight: '700', color: C.ink },
  progressBar: { height: scale(6), backgroundColor: C.border, borderRadius: scale(3), overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: scale(3) },
  usageRemaining: { fontSize: moderateScale(11), color: C.muted, marginTop: scale(6), textAlign: 'center' },
  featuresBox: { marginTop: scale(16) },
  featuresTitle: { fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginBottom: scale(8) },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(6) },
  featureText: { fontSize: moderateScale(13), color: C.text },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: scale(16), paddingTop: scale(16), borderTopWidth: 1, borderTopColor: C.border },
  autoRenewLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  cancelAmcBtn: { marginTop: scale(16), paddingVertical: scale(12), borderRadius: scale(10), backgroundColor: '#FEF2F2', alignItems: 'center' },
  cancelAmcText: { fontSize: moderateScale(14), fontWeight: '700', color: C.danger },

  noAmcCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(24),
    alignItems: 'center', borderWidth: 1, borderColor: C.border
  },
  noAmcTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink, marginTop: scale(12) },
  noAmcText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(4), textAlign: 'center' },
  createAmcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6), marginTop: scale(16),
    paddingHorizontal: scale(20), paddingVertical: scale(12), borderRadius: scale(12), backgroundColor: C.primary
  },
  createAmcText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  amcHistorySection: { marginTop: scale(24) },
  amcHistoryCard: { backgroundColor: C.card, borderRadius: scale(12), padding: scale(12), marginBottom: scale(12), borderWidth: 1, borderColor: C.border },
  amcHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amcHistoryName: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  amcHistoryBadge: { paddingHorizontal: scale(8), paddingVertical: scale(3), borderRadius: scale(6) },
  amcHistoryStatus: { fontSize: moderateScale(10), fontWeight: '700' },
  amcHistoryDuration: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },
  amcHistoryPeriod: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  amcHistoryUsage: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink, marginTop: scale(4) },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: scale(16), backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.primary, paddingVertical: scale(14), borderRadius: scale(12)
  },
  requestBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#fff' },

  // Modal Styles
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: scale(50), right: scale(20), zIndex: 10 },
  imageModalImage: { width: '100%', height: '80%' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), height: '85%' },
  modalHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: scale(16), borderBottomWidth: 1, borderBottomColor: C.border
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '900', color: C.ink },
  modalBody: { flex: 1 },
  modalFooter: { flexDirection: 'row', gap: scale(12), padding: scale(16), borderTopWidth: 1, borderTopColor: C.border },

  label: { fontSize: moderateScale(12), fontWeight: '700', color: C.muted, marginBottom: scale(6), marginTop: scale(12) },
  input: {
    backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(12),
    fontSize: moderateScale(14), color: C.text, borderWidth: 1, borderColor: C.border
  },
  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderRadius: scale(12), paddingHorizontal: scale(14), paddingVertical: scale(14),
    borderWidth: 1, borderColor: C.border
  },
  pickerText: { fontSize: moderateScale(14), color: C.text },

  featureInputRow: { flexDirection: 'row', gap: scale(8) },
  addFeatureBtn: { width: scale(48), height: scale(48), borderRadius: scale(12), backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  featuresList: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginTop: scale(8) },
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: scale(6), paddingHorizontal: scale(10), paddingVertical: scale(6), backgroundColor: C.bg, borderRadius: scale(8) },
  featureBadgeText: { fontSize: moderateScale(12), color: C.ink },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: scale(16) },
  switchLabel: { fontSize: moderateScale(14), color: C.ink },

  cancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: scale(14), borderRadius: scale(12),
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', gap: scale(6)
  },
  saveText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  pickerModal: { backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24) },
  pickerList: { padding: scale(16) },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: C.border
  },
  pickerItemActive: { backgroundColor: '#FFF5F5' },
  pickerItemText: { fontSize: moderateScale(15), fontWeight: '600', color: C.ink },

  serviceCard: {
    flexDirection: 'row', alignItems: 'center', padding: scale(12),
    backgroundColor: C.card, borderRadius: scale(12), marginBottom: scale(8),
    borderWidth: 1, borderColor: C.border
  },
  serviceCardActive: { borderColor: C.primary, backgroundColor: '#FFF5F5' },
  serviceCheckbox: { marginRight: scale(12) },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  serviceDesc: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  servicePrice: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },

  // Quick Date/Time Selection Styles
  quickDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(8) },
  quickDateChip: {
    paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(8),
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  quickDateChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  quickDateText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink },
  quickDateTextActive: { color: '#fff' },

  quickTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8), marginBottom: scale(8) },
  quickTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(4),
    paddingHorizontal: scale(10), paddingVertical: scale(8), borderRadius: scale(8),
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  quickTimeChipActive: { backgroundColor: C.info, borderColor: C.info },
  quickTimeText: { fontSize: moderateScale(12), fontWeight: '600', color: C.ink },
  quickTimeTextActive: { color: '#fff' },
});
