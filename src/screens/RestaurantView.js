import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Alert, Linking, RefreshControl,
  Dimensions, Modal, StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = 260;

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  subtle: '#94A3B8',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
  purple: '#8B5CF6',
};

const getStatusConfig = (status) => {
  const configs = {
    PENDING: {
      icon: 'time',
      bg: '#FFFBEB',
      color: C.warn,
      gradient: ['#FEF3C7', '#FDE68A'],
      label: 'Pending Approval',
      description: 'Your restaurant is being reviewed by our team. This usually takes 24-48 hours.',
      emoji: '⏳',
    },
    APPROVED: {
      icon: 'checkmark-circle',
      bg: '#ECFDF5',
      color: C.ok,
      gradient: ['#D1FAE5', '#A7F3D0'],
      label: 'Approved',
      description: 'Your restaurant is live! You can now book services, manage equipment and explore the marketplace.',
      emoji: '✅',
    },
    REJECTED: {
      icon: 'close-circle',
      bg: '#FEF2F2',
      color: C.danger,
      gradient: ['#FEE2E2', '#FECACA'],
      label: 'Rejected',
      description: 'Your restaurant application was rejected. Please review the reason and resubmit.',
      emoji: '❌',
    },
  };
  return configs[status] || configs.PENDING;
};

const formatDate = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatDateShort = (dateString) => {
  return new Date(dateString).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export default function RestaurantView({ navigation, route }) {
  const { restaurantId } = route.params;
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

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

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={st.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={st.loadingText}>Loading restaurant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  const statusConfig = getStatusConfig(restaurant.status);
  const restaurantImage = getImageUrl(restaurant.restaurantImageUrl);
  const fssaiImage = getImageUrl(restaurant.fssaiCertificateUrl);

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" />

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: scale(100) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Image */}
        <View style={st.heroSection}>
          {restaurantImage ? (
            <TouchableOpacity activeOpacity={0.9} onPress={() => setImagePreview(restaurantImage)}>
              <Image source={{ uri: restaurantImage }} style={st.heroImage} />
            </TouchableOpacity>
          ) : (
            <View style={st.heroPlaceholder}>
              <Icon name="restaurant-outline" size={scale(64)} color="#D1D5DB" />
              <Text style={st.heroPlaceholderText}>No Image</Text>
            </View>
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.7)']}
            style={st.heroGradient}
          />

          {/* Back Button */}
          <TouchableOpacity
            style={st.heroBackBtn}
            onPress={() => navigation.goBack()}
          >
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>

          {/* Edit Button */}
          {restaurant.status !== 'APPROVED' && (
            <TouchableOpacity
              style={st.heroEditBtn}
              onPress={() => navigation.navigate('RestaurantEdit', { restaurantId: restaurant.id })}
            >
              <Icon name="create-outline" size={scale(20)} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Hero Info Overlay */}
          <View style={st.heroOverlay}>
            <View style={[st.statusPill, { backgroundColor: statusConfig.color }]}>
              <Icon name={statusConfig.icon} size={scale(12)} color="#fff" />
              <Text style={st.statusPillText}>{statusConfig.label}</Text>
            </View>
            <Text style={st.heroName}>{restaurant.name}</Text>
            <View style={st.heroLocationRow}>
              <Icon name="location" size={scale(14)} color="rgba(255,255,255,0.8)" />
              <Text style={st.heroLocation}>
                {restaurant.address}, {restaurant.city}
                {restaurant.pincode ? ` - ${restaurant.pincode}` : ''}
              </Text>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={st.statsRow}>
          <View style={st.statCard}>
            <View style={[st.statIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Icon name="calendar-outline" size={scale(20)} color={C.info} />
            </View>
            <Text style={st.statLabel}>Registered</Text>
            <Text style={st.statValue}>{formatDateShort(restaurant.createdAt)}</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconBox, { backgroundColor: statusConfig.bg }]}>
              <Icon name={statusConfig.icon} size={scale(20)} color={statusConfig.color} />
            </View>
            <Text style={st.statLabel}>Status</Text>
            <Text style={[st.statValue, { color: statusConfig.color }]}>{restaurant.status}</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="location-outline" size={scale(20)} color={C.purple} />
            </View>
            <Text style={st.statLabel}>City</Text>
            <Text style={st.statValue}>{restaurant.city}</Text>
          </View>
        </View>

        {/* Status Alert Card */}
        <View style={st.alertCard}>
          <LinearGradient
            colors={statusConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.alertGradient}
          >
            <View style={st.alertIconBox}>
              <Icon name={statusConfig.icon} size={scale(28)} color={statusConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.alertTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={st.alertDesc}>{statusConfig.description}</Text>

              {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
                <View style={st.rejectionBox}>
                  <Icon name="information-circle" size={scale(16)} color={C.danger} />
                  <Text style={st.rejectionText}>Reason: {restaurant.rejectionReason}</Text>
                </View>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions - Only for Approved */}
        {restaurant.status === 'APPROVED' && (
          <View style={st.actionsCard}>
            <Text style={st.sectionTitle}>Quick Actions</Text>
            <View style={st.actionsGrid}>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyEquipment')}>
                <View style={[st.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="construct" size={scale(22)} color={C.primary} />
                </View>
                <Text style={st.actionLabel}>Book Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyEquipment')}>
                <View style={[st.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="hardware-chip" size={scale(22)} color={C.info} />
                </View>
                <Text style={st.actionLabel}>Equipment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('Marketplace')}>
                <View style={[st.actionIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="storefront" size={scale(22)} color={C.purple} />
                </View>
                <Text style={st.actionLabel}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyBookings')}>
                <View style={[st.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="receipt" size={scale(22)} color={C.ok} />
                </View>
                <Text style={st.actionLabel}>Bookings</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Restaurant Details Card */}
        <View style={st.detailsCard}>
          <View style={st.sectionHeader}>
            <View style={st.sectionIconBox}>
              <Icon name="information-circle" size={scale(20)} color={C.primary} />
            </View>
            <Text style={st.sectionTitle}>Restaurant Details</Text>
          </View>

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="business-outline" size={scale(18)} color={C.muted} />
            </View>
            <View style={st.detailContent}>
              <Text style={st.detailLabel}>Restaurant Name</Text>
              <Text style={st.detailValue}>{restaurant.name}</Text>
            </View>
          </View>

          <View style={st.divider} />

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="location-outline" size={scale(18)} color={C.muted} />
            </View>
            <View style={st.detailContent}>
              <Text style={st.detailLabel}>Full Address</Text>
              <Text style={st.detailValue}>
                {restaurant.address}, {restaurant.city}
                {restaurant.pincode ? ` - ${restaurant.pincode}` : ''}
              </Text>
            </View>
          </View>

          {restaurant.pincode && (
            <>
              <View style={st.divider} />
              <View style={st.detailRow}>
                <View style={st.detailIcon}>
                  <Icon name="navigate-outline" size={scale(18)} color={C.muted} />
                </View>
                <View style={st.detailContent}>
                  <Text style={st.detailLabel}>Pincode</Text>
                  <Text style={[st.detailValue, { fontFamily: 'monospace', letterSpacing: 2 }]}>
                    {restaurant.pincode}
                  </Text>
                </View>
              </View>
            </>
          )}

          <View style={st.divider} />

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="calendar-outline" size={scale(18)} color={C.muted} />
            </View>
            <View style={st.detailContent}>
              <Text style={st.detailLabel}>Registration Date</Text>
              <Text style={st.detailValue}>{formatDate(restaurant.createdAt)}</Text>
            </View>
          </View>
        </View>

        {/* FSSAI Details Card */}
        {(restaurant.fssaiNumber || restaurant.fssaiCertificateUrl) && (
          <View style={st.detailsCard}>
            <View style={st.sectionHeader}>
              <View style={[st.sectionIconBox, { backgroundColor: '#FFF7ED' }]}>
                <Icon name="document-text" size={scale(20)} color="#F97316" />
              </View>
              <Text style={st.sectionTitle}>FSSAI License</Text>
            </View>

            {restaurant.fssaiNumber && (
              <View style={st.fssaiNumberBox}>
                <Icon name="shield-checkmark" size={scale(20)} color={C.ok} />
                <View style={{ flex: 1 }}>
                  <Text style={st.fssaiLabel}>License Number</Text>
                  <Text style={st.fssaiNumber}>{restaurant.fssaiNumber}</Text>
                </View>
              </View>
            )}

            {fssaiImage && (
              <View style={{ marginTop: scale(16) }}>
                <Text style={st.certLabel}>Certificate Document</Text>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => setImagePreview(fssaiImage)}
                >
                  <View style={st.certImageBox}>
                    <Image
                      source={{ uri: fssaiImage }}
                      style={st.certImage}
                      resizeMode="cover"
                    />
                    <View style={st.certOverlay}>
                      <View style={st.certViewBtn}>
                        <Icon name="expand-outline" size={scale(18)} color="#fff" />
                        <Text style={st.certViewText}>Tap to view full</Text>
                      </View>
                    </View>
                  </View>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* Image Preview Modal */}
      <Modal visible={!!imagePreview} animationType="fade" transparent>
        <View style={st.previewModal}>
          <TouchableOpacity style={st.previewClose} onPress={() => setImagePreview(null)}>
            <View style={st.previewCloseBox}>
              <Icon name="close" size={scale(24)} color="#fff" />
            </View>
          </TouchableOpacity>
          {imagePreview && (
            <Image source={{ uri: imagePreview }} style={st.previewImage} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  loadingBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: scale(12), color: C.muted, fontSize: moderateScale(14) },

  // Hero
  heroSection: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    position: 'relative',
    backgroundColor: '#1F2937',
  },
  heroImage: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    width: SCREEN_WIDTH,
    height: HERO_HEIGHT,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroPlaceholderText: {
    fontSize: moderateScale(14),
    color: '#9CA3AF',
    marginTop: scale(8),
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: HERO_HEIGHT * 0.7,
  },
  heroBackBtn: {
    position: 'absolute',
    top: scale(12),
    left: scale(16),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEditBtn: {
    position: 'absolute',
    top: scale(12),
    right: scale(16),
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(20),
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: scale(5),
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(20),
    marginBottom: scale(8),
  },
  statusPillText: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: '#fff',
  },
  heroName: {
    fontSize: moderateScale(26),
    fontWeight: '900',
    color: '#fff',
    marginBottom: scale(4),
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  heroLocation: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    gap: scale(10),
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(12),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: scale(12),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 4,
  },
  statIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(6),
  },
  statLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(2),
  },
  statValue: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },

  // Alert
  alertCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(16),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },
  alertGradient: {
    flexDirection: 'row',
    padding: scale(16),
    gap: scale(12),
    alignItems: 'flex-start',
  },
  alertIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    marginBottom: scale(4),
  },
  alertDesc: {
    fontSize: moderateScale(13),
    color: C.text,
    lineHeight: moderateScale(19),
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(6),
    marginTop: scale(10),
    padding: scale(10),
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: scale(8),
  },
  rejectionText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.danger,
    flex: 1,
  },

  // Quick Actions
  actionsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(12),
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: scale(8),
  },
  actionIconBox: {
    width: scale(50),
    height: scale(50),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // Details Card
  detailsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(20),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(20),
  },
  sectionIconBox: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: C.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    paddingVertical: scale(4),
  },
  detailIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(8),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(2),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(2),
  },
  detailValue: {
    fontSize: moderateScale(15),
    fontWeight: '600',
    color: C.text,
    lineHeight: moderateScale(21),
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: scale(12),
    marginLeft: scale(44),
  },

  // FSSAI
  fssaiNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    backgroundColor: '#F0FDF4',
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  fssaiLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fssaiNumber: {
    fontSize: moderateScale(17),
    fontWeight: '800',
    color: C.ink,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    marginTop: scale(2),
  },
  certLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(8),
  },
  certImageBox: {
    borderRadius: scale(12),
    overflow: 'hidden',
    position: 'relative',
  },
  certImage: {
    width: '100%',
    height: scale(160),
    borderRadius: scale(12),
    backgroundColor: C.bg,
  },
  certOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(10),
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  certViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
  },
  certViewText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: '#fff',
  },

  // Image Preview Modal
  previewModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewClose: {
    position: 'absolute',
    top: scale(50),
    right: scale(20),
    zIndex: 10,
  },
  previewCloseBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
