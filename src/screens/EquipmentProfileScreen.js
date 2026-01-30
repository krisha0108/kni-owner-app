import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  RefreshControl, ActivityIndicator, Alert, Modal, TextInput, Image, Switch
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
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
        totalAmount: Math.round(parseFloat(amcForm.totalAmount || 0) * 100),
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
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Equipment Profile</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={st.emptyBox}>
          <Icon name="alert-circle-outline" size={64} color={C.muted} />
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
          <Icon name="arrow-back" size={22} color={C.ink} />
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
          <Icon name="construct" size={20} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        contentContainerStyle={st.scrollContent}
      >
        {/* Equipment Info Card */}
        <View style={st.infoCard}>
          <View style={st.infoHeader}>
            <View style={st.iconBox}>
              {photoUrls.length > 0 ? (
                <Image source={{ uri: getImageUrl(photoUrls[0]) }} style={st.equipImage} />
              ) : (
                <Icon name="hardware-chip-outline" size={32} color={C.primary} />
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
                <Icon name="time-outline" size={20} color={C.info} />
              </View>
              <Text style={st.statValue}>{serviceHistory.length}</Text>
              <Text style={st.statLabel}>Total Services</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIcon, { backgroundColor: '#ECFDF5' }]}>
                <Icon name="checkmark-circle-outline" size={20} color={C.ok} />
              </View>
              <Text style={st.statValue}>{equipment.completedServicesCount || 0}</Text>
              <Text style={st.statLabel}>Completed</Text>
            </View>
            <View style={st.statCard}>
              <View style={[st.statIcon, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="cash-outline" size={20} color="#F97316" />
              </View>
              <Text style={st.statValue}>
                {equipment.totalSpend > 0 ? `₹${(equipment.totalSpend / 100).toLocaleString()}` : '₹0'}
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
                        <Icon name="document-text" size={24} color="#fff" />
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
                        <Icon name="shield-checkmark" size={24} color="#fff" />
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
                  <Icon name="images-outline" size={48} color={C.muted} />
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
                          <Icon name={statusStyle.icon} size={12} color={statusStyle.color} />
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
                          ₹{((service.totalAmount || 0) / 100).toLocaleString()}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })
            ) : (
              <View style={st.emptySection}>
                <Icon name="construct-outline" size={48} color={C.muted} />
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
                  <Icon name="add" size={18} color="#fff" />
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
                    <Icon name="checkmark-circle" size={16} color={C.ok} />
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
                    <Text style={st.amcDetailValue}>₹{(activeAmc.totalAmount / 100).toFixed(2)}</Text>
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
                        <Icon name="checkmark" size={14} color={C.ok} />
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
                <Icon name="shield-outline" size={48} color={C.muted} />
                <Text style={st.noAmcTitle}>No Active AMC</Text>
                <Text style={st.noAmcText}>Create a maintenance plan for this equipment</Text>
                <TouchableOpacity style={st.createAmcBtn} onPress={() => setShowAmcModal(true)}>
                  <Icon name="add" size={18} color="#fff" />
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
            <Icon name="close" size={28} color="#fff" />
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
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
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
                style={[st.input, { height: 80, textAlignVertical: 'top' }]}
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
                <Icon name="chevron-down" size={18} color={C.muted} />
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
                  <Icon name="add" size={20} color="#fff" />
                </TouchableOpacity>
              </View>
              {amcForm.featuresJson.length > 0 && (
                <View style={st.featuresList}>
                  {amcForm.featuresJson.map((feature, index) => (
                    <View key={index} style={st.featureBadge}>
                      <Text style={st.featureBadgeText}>{feature}</Text>
                      <TouchableOpacity onPress={() => handleRemoveFeature(index)}>
                        <Icon name="close-circle" size={16} color={C.muted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              <Text style={st.label}>Start Date *</Text>
              <TextInput
                style={st.input}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={C.muted}
                value={amcForm.startDate}
                onChangeText={v => setAmcForm(f => ({ ...f, startDate: v }))}
              />

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
                <Icon name="close" size={24} color={C.ink} />
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
                    <Icon name="checkmark-circle" size={20} color={C.primary} />
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
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.modalBody}>
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
                          <Icon name="checkmark-circle" size={22} color={C.primary} />
                        ) : (
                          <Icon name="ellipse-outline" size={22} color={C.muted} />
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
                          ₹{(service.estimatedPrice / 100).toFixed(2)}
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
                        size={14}
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
                style={[st.input, { height: 100, textAlignVertical: 'top' }]}
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
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border
  },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: C.ink, flex: 1, textAlign: 'center' },
  serviceBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },

  scrollContent: { paddingBottom: 20 },

  infoCard: {
    backgroundColor: C.card, margin: 16, borderRadius: 16,
    padding: 16, borderWidth: 1, borderColor: C.border
  },
  infoHeader: { flexDirection: 'row', gap: 12 },
  iconBox: {
    width: 64, height: 64, borderRadius: 16, backgroundColor: '#FFE8E8',
    alignItems: 'center', justifyContent: 'center', overflow: 'hidden'
  },
  equipImage: { width: 64, height: 64, borderRadius: 16 },
  infoMain: { flex: 1 },
  equipName: { fontSize: 20, fontWeight: '900', color: C.ink },
  equipCategory: { fontSize: 14, color: C.muted, marginTop: 2 },
  badgeRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
  statCard: { flex: 1, minWidth: '45%', alignItems: 'center', padding: 12, backgroundColor: C.bg, borderRadius: 12 },
  statIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  statValue: { fontSize: 16, fontWeight: '900', color: C.ink },
  statLabel: { fontSize: 11, color: C.muted, marginTop: 2 },

  tabBar: { flexDirection: 'row', marginHorizontal: 16, backgroundColor: C.card, borderRadius: 12, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: C.bg },
  tabText: { fontSize: 13, fontWeight: '600', color: C.muted },
  tabTextActive: { color: C.primary },

  section: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '900', color: C.ink, marginBottom: 12 },

  detailsCard: { backgroundColor: C.card, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: C.border },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: C.border },
  detailLabel: { fontSize: 13, color: C.muted },
  detailValue: { fontSize: 13, fontWeight: '600', color: C.ink, textAlign: 'right', flex: 1, marginLeft: 16 },

  imagesSection: { marginBottom: 24 },
  docsGrid: { flexDirection: 'row', gap: 12 },
  docCard: { flex: 1, position: 'relative' },
  docImage: { width: '100%', aspectRatio: 16 / 9, borderRadius: 12, backgroundColor: C.bg },
  docOverlay: {
    position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.4)', borderRadius: 12, alignItems: 'center', justifyContent: 'center'
  },
  docLabel: { fontSize: 12, fontWeight: '600', color: C.ink, marginTop: 6, textAlign: 'center' },

  photosGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  photoCard: { position: 'relative' },
  photoImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: C.bg },
  photoIndex: {
    position: 'absolute', top: 6, left: 6,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2
  },
  photoIndexText: { fontSize: 10, fontWeight: '700', color: '#fff' },

  emptySection: { alignItems: 'center', paddingVertical: 32 },
  emptySectionText: { fontSize: 14, color: C.muted, marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 10, backgroundColor: C.primary
  },
  emptyBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  historyCard: { flexDirection: 'row', marginBottom: 4 },
  historyTimeline: { width: 24, alignItems: 'center' },
  timelineDot: { width: 10, height: 10, borderRadius: 5 },
  timelineLine: { width: 2, flex: 1, backgroundColor: C.border, marginTop: 4 },
  historyContent: {
    flex: 1, backgroundColor: C.card, borderRadius: 12, padding: 12,
    marginLeft: 8, marginBottom: 12, borderWidth: 1, borderColor: C.border
  },
  historyHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  historyDate: { fontSize: 12, fontWeight: '700', color: C.ink },
  historyStatus: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  historyStatusText: { fontSize: 10, fontWeight: '700', textTransform: 'capitalize' },
  historyDesc: { fontSize: 13, color: C.muted, marginTop: 6 },
  historyFooter: { marginTop: 8 },
  historyCost: { fontSize: 13, fontWeight: '700', color: C.ink },

  // AMC Styles
  amcActiveCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 2, borderColor: C.ok
  },
  amcActiveHeader: { marginBottom: 8 },
  amcActiveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  amcActiveLabel: { fontSize: 13, fontWeight: '700', color: C.ok },
  amcPlanName: { fontSize: 18, fontWeight: '900', color: C.ink },
  amcDescription: { fontSize: 13, color: C.muted, marginTop: 4 },
  amcDetails: { marginTop: 16, gap: 12 },
  amcDetailItem: { flexDirection: 'row', justifyContent: 'space-between' },
  amcDetailLabel: { fontSize: 13, color: C.muted },
  amcDetailValue: { fontSize: 13, fontWeight: '600', color: C.ink },
  usageBox: { marginTop: 16, padding: 12, backgroundColor: C.bg, borderRadius: 12 },
  usageHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  usageLabel: { fontSize: 12, fontWeight: '600', color: C.muted },
  usageText: { fontSize: 12, fontWeight: '700', color: C.ink },
  progressBar: { height: 6, backgroundColor: C.border, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 3 },
  usageRemaining: { fontSize: 11, color: C.muted, marginTop: 6, textAlign: 'center' },
  featuresBox: { marginTop: 16 },
  featuresTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  featureText: { fontSize: 13, color: C.text },
  autoRenewRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: C.border },
  autoRenewLabel: { fontSize: 14, fontWeight: '600', color: C.ink },
  cancelAmcBtn: { marginTop: 16, paddingVertical: 12, borderRadius: 10, backgroundColor: '#FEF2F2', alignItems: 'center' },
  cancelAmcText: { fontSize: 14, fontWeight: '700', color: C.danger },

  noAmcCard: {
    backgroundColor: C.card, borderRadius: 16, padding: 24,
    alignItems: 'center', borderWidth: 1, borderColor: C.border
  },
  noAmcTitle: { fontSize: 18, fontWeight: '900', color: C.ink, marginTop: 12 },
  noAmcText: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: 'center' },
  createAmcBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16,
    paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, backgroundColor: C.primary
  },
  createAmcText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  amcHistorySection: { marginTop: 24 },
  amcHistoryCard: { backgroundColor: C.card, borderRadius: 12, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: C.border },
  amcHistoryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amcHistoryName: { fontSize: 14, fontWeight: '700', color: C.ink },
  amcHistoryBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  amcHistoryStatus: { fontSize: 10, fontWeight: '700' },
  amcHistoryDuration: { fontSize: 12, color: C.muted, marginTop: 4 },
  amcHistoryPeriod: { fontSize: 12, color: C.muted, marginTop: 2 },
  amcHistoryUsage: { fontSize: 12, fontWeight: '600', color: C.ink, marginTop: 4 },

  footer: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 16, backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border },
  requestBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12
  },
  requestBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  // Modal Styles
  imageModal: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  imageModalClose: { position: 'absolute', top: 50, right: 20, zIndex: 10 },
  imageModalImage: { width: '100%', height: '80%' },

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

  featureInputRow: { flexDirection: 'row', gap: 8 },
  addFeatureBtn: { width: 48, height: 48, borderRadius: 12, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center' },
  featuresList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  featureBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, backgroundColor: C.bg, borderRadius: 8 },
  featureBadgeText: { fontSize: 12, color: C.ink },

  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 },
  switchLabel: { fontSize: 14, color: C.ink },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1, flexDirection: 'row', paddingVertical: 14, borderRadius: 12,
    backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', gap: 6
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  pickerModal: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  pickerList: { padding: 16 },
  pickerItem: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border
  },
  pickerItemActive: { backgroundColor: '#FFF5F5' },
  pickerItemText: { fontSize: 15, fontWeight: '600', color: C.ink },

  serviceCard: {
    flexDirection: 'row', alignItems: 'center', padding: 12,
    backgroundColor: C.card, borderRadius: 12, marginBottom: 8,
    borderWidth: 1, borderColor: C.border
  },
  serviceCardActive: { borderColor: C.primary, backgroundColor: '#FFF5F5' },
  serviceCheckbox: { marginRight: 12 },
  serviceInfo: { flex: 1 },
  serviceName: { fontSize: 14, fontWeight: '600', color: C.ink },
  serviceDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  servicePrice: { fontSize: 14, fontWeight: '700', color: C.ink },

  // Quick Date/Time Selection Styles
  quickDateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  quickDateChip: {
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  quickDateChipActive: { backgroundColor: C.primary, borderColor: C.primary },
  quickDateText: { fontSize: 12, fontWeight: '600', color: C.ink },
  quickDateTextActive: { color: '#fff' },

  quickTimeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  quickTimeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8,
    backgroundColor: C.bg, borderWidth: 1, borderColor: C.border,
  },
  quickTimeChipActive: { backgroundColor: C.info, borderColor: C.info },
  quickTimeText: { fontSize: 12, fontWeight: '600', color: C.ink },
  quickTimeTextActive: { color: '#fff' },
});
