import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, Linking, RefreshControl
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
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
};

const getStatusConfig = (status) => {
  const configs = {
    PENDING: {
      icon: 'time-outline',
      bg: '#FFFBEB',
      color: C.warn,
      label: 'Pending Approval',
      title: 'Pending Approval',
      description: 'Your restaurant is being reviewed by our team.',
    },
    APPROVED: {
      icon: 'checkmark-circle',
      bg: '#ECFDF5',
      color: C.ok,
      label: 'Approved',
      title: 'Approved',
      description: 'Your restaurant has been approved. You can now book services for this location.',
    },
    REJECTED: {
      icon: 'close-circle',
      bg: '#FEF2F2',
      color: C.danger,
      label: 'Rejected',
      title: 'Rejected',
      description: 'Your restaurant application was rejected.',
    },
  };
  return configs[status] || configs.PENDING;
};

export default function RestaurantView({ navigation, route }) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadRestaurant = async () => {
    try {
      const response = await api.get('/owner/restaurants');
      if (response.data.ok) {
        const found = response.data.data.find(r => r.id === restaurantId);
        if (found) {
          setRestaurant(found);
        } else {
          Alert.alert('Error', 'Restaurant not found');
          navigation.goBack();
        }
      }
    } catch (error) {
      console.error('Load restaurant error:', error);
      Alert.alert('Error', 'Could not load restaurant details');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadRestaurant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  const onRefresh = () => {
    setRefreshing(true);
    loadRestaurant();
  };

  const openCertificate = async (url) => {
    if (!url) return;
    try {
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('Error', 'Could not open certificate');
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Details</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading restaurant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return null;
  }

  const statusConfig = getStatusConfig(restaurant.status);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurant Details</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Main Card */}
        <View style={styles.card}>
          {/* Header with name and status */}
          <View style={styles.cardHeader}>
            <View style={styles.iconBox}>
              <Icon name="business" size={24} color={C.primary} />
            </View>
            <View style={styles.headerInfo}>
              <Text style={styles.restaurantName}>{restaurant.name}</Text>
              <View style={styles.addressRow}>
                <Icon name="location-outline" size={14} color={C.muted} />
                <Text style={styles.restaurantAddress}>
                  {restaurant.address}, {restaurant.city}
                </Text>
              </View>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
              <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
              <Text style={[styles.statusText, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
            </View>
          </View>

          {/* Restaurant Image */}
          {restaurant.restaurantImageUrl && (
            <View style={styles.section}>
              <Text style={styles.sectionLabel}>Restaurant Image</Text>
              <TouchableOpacity
                onPress={() => openCertificate(restaurant.restaurantImageUrl)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: restaurant.restaurantImageUrl }}
                  style={styles.restaurantImage}
                />
              </TouchableOpacity>
              <Text style={styles.imageHint}>Tap image to view full size</Text>
            </View>
          )}

          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            <View style={styles.infoGrid}>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Restaurant Name</Text>
                <Text style={styles.infoValue}>{restaurant.name}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Status</Text>
                <View style={[styles.statusBadgeSmall, { backgroundColor: statusConfig.bg }]}>
                  <Text style={[styles.statusTextSmall, { color: statusConfig.color }]}>
                    {restaurant.status}
                  </Text>
                </View>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Address</Text>
                <Text style={styles.infoValue}>{restaurant.address}</Text>
              </View>
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>City</Text>
                <Text style={styles.infoValue}>{restaurant.city}</Text>
              </View>
              {restaurant.pincode && (
                <View style={styles.infoItem}>
                  <Text style={styles.infoLabel}>Pincode</Text>
                  <Text style={styles.infoValue}>{restaurant.pincode}</Text>
                </View>
              )}
              <View style={styles.infoItem}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>{formatDate(restaurant.createdAt)}</Text>
              </View>
            </View>
          </View>

          {/* FSSAI Details */}
          {(restaurant.fssaiNumber || restaurant.fssaiCertificateUrl) && (
            <View style={styles.section}>
              <View style={styles.sectionTitleRow}>
                <Icon name="document-text" size={20} color={C.ink} />
                <Text style={styles.sectionTitle}>FSSAI Details</Text>
              </View>
              <View style={styles.infoGrid}>
                {restaurant.fssaiNumber && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>FSSAI License Number</Text>
                    <Text style={[styles.infoValue, { fontFamily: 'monospace' }]}>
                      {restaurant.fssaiNumber}
                    </Text>
                  </View>
                )}
                {restaurant.fssaiCertificateUrl && (
                  <View style={styles.infoItem}>
                    <Text style={styles.infoLabel}>FSSAI Certificate</Text>
                    <TouchableOpacity
                      style={styles.viewCertBtn}
                      onPress={() => openCertificate(getImageUrl(restaurant.fssaiCertificateUrl))}
                    >
                      <Icon name="open-outline" size={16} color={C.primary} />
                      <Text style={styles.viewCertText}>View Certificate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
              {restaurant.fssaiCertificateUrl && (
                <TouchableOpacity
                  onPress={() => openCertificate(getImageUrl(restaurant.fssaiCertificateUrl))}
                  activeOpacity={0.8}
                >
                  <Image
                    source={{ uri: getImageUrl(restaurant.fssaiCertificateUrl) }}
                    style={styles.certificateImage}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        {/* Status Alert */}
        <View style={styles.card}>
          <View style={[styles.alertBox, { backgroundColor: statusConfig.bg, borderColor: statusConfig.color }]}>
            <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
            <View style={styles.alertContent}>
              <Text style={[styles.alertTitle, { color: statusConfig.color }]}>
                {statusConfig.title}
              </Text>
              <Text style={styles.alertDescription}>{statusConfig.description}</Text>

              {restaurant.status === 'APPROVED' && (
                <View style={styles.alertActions}>
                  <TouchableOpacity
                    style={styles.primaryActionBtn}
                    onPress={() => navigation.navigate('Home')}
                  >
                    <Text style={styles.primaryActionText}>Browse Services</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryActionBtn}
                    onPress={() => navigation.navigate('MyEquipment')}
                  >
                    <Text style={styles.secondaryActionText}>Manage Equipment</Text>
                  </TouchableOpacity>
                </View>
              )}

              {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
                <Text style={[styles.rejectionReason, { color: C.danger }]}>
                  Reason: {restaurant.rejectionReason}
                </Text>
              )}
            </View>
          </View>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
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
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: C.muted,
  },
  content: {
    flex: 1,
  },
  card: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  headerInfo: {
    flex: 1,
  },
  restaurantName: {
    fontSize: 20,
    fontWeight: '900',
    color: C.ink,
    marginBottom: 4,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  restaurantAddress: {
    fontSize: 14,
    color: C.muted,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  section: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  restaurantImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  imageHint: {
    fontSize: 11,
    color: C.muted,
    marginTop: 6,
  },
  infoGrid: {
    gap: 16,
  },
  infoItem: {
    gap: 4,
  },
  infoLabel: {
    fontSize: 13,
    color: C.muted,
  },
  infoValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  statusBadgeSmall: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusTextSmall: {
    fontSize: 12,
    fontWeight: '700',
  },
  viewCertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  viewCertText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },
  certificateImage: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginTop: 12,
  },
  alertBox: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 4,
  },
  alertDescription: {
    fontSize: 14,
    color: C.text,
    lineHeight: 20,
  },
  alertActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 16,
  },
  primaryActionBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  primaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  secondaryActionBtn: {
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: C.card,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  rejectionReason: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '600',
  },
});
