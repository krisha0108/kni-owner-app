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
        contentContainerStyle={{ paddingBottom: 100 }}
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
              <Icon name="restaurant-outline" size={64} color="#D1D5DB" />
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
            <Icon name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>

          {/* Edit Button */}
          {restaurant.status !== 'APPROVED' && (
            <TouchableOpacity
              style={st.heroEditBtn}
              onPress={() => navigation.navigate('RestaurantEdit', { restaurantId: restaurant.id })}
            >
              <Icon name="create-outline" size={20} color="#fff" />
            </TouchableOpacity>
          )}

          {/* Hero Info Overlay */}
          <View style={st.heroOverlay}>
            <View style={[st.statusPill, { backgroundColor: statusConfig.color }]}>
              <Icon name={statusConfig.icon} size={12} color="#fff" />
              <Text style={st.statusPillText}>{statusConfig.label}</Text>
            </View>
            <Text style={st.heroName}>{restaurant.name}</Text>
            <View style={st.heroLocationRow}>
              <Icon name="location" size={14} color="rgba(255,255,255,0.8)" />
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
              <Icon name="calendar-outline" size={20} color={C.info} />
            </View>
            <Text style={st.statLabel}>Registered</Text>
            <Text style={st.statValue}>{formatDateShort(restaurant.createdAt)}</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconBox, { backgroundColor: statusConfig.bg }]}>
              <Icon name={statusConfig.icon} size={20} color={statusConfig.color} />
            </View>
            <Text style={st.statLabel}>Status</Text>
            <Text style={[st.statValue, { color: statusConfig.color }]}>{restaurant.status}</Text>
          </View>
          <View style={st.statCard}>
            <View style={[st.statIconBox, { backgroundColor: '#F5F3FF' }]}>
              <Icon name="location-outline" size={20} color={C.purple} />
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
              <Icon name={statusConfig.icon} size={28} color={statusConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.alertTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={st.alertDesc}>{statusConfig.description}</Text>

              {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
                <View style={st.rejectionBox}>
                  <Icon name="information-circle" size={16} color={C.danger} />
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
                  <Icon name="construct" size={22} color={C.primary} />
                </View>
                <Text style={st.actionLabel}>Book Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyEquipment')}>
                <View style={[st.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="hardware-chip" size={22} color={C.info} />
                </View>
                <Text style={st.actionLabel}>Equipment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('Marketplace')}>
                <View style={[st.actionIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="storefront" size={22} color={C.purple} />
                </View>
                <Text style={st.actionLabel}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyBookings')}>
                <View style={[st.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="receipt" size={22} color={C.ok} />
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
              <Icon name="information-circle" size={20} color={C.primary} />
            </View>
            <Text style={st.sectionTitle}>Restaurant Details</Text>
          </View>

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="business-outline" size={18} color={C.muted} />
            </View>
            <View style={st.detailContent}>
              <Text style={st.detailLabel}>Restaurant Name</Text>
              <Text style={st.detailValue}>{restaurant.name}</Text>
            </View>
          </View>

          <View style={st.divider} />

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="location-outline" size={18} color={C.muted} />
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
                  <Icon name="navigate-outline" size={18} color={C.muted} />
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
              <Icon name="calendar-outline" size={18} color={C.muted} />
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
                <Icon name="document-text" size={20} color="#F97316" />
              </View>
              <Text style={st.sectionTitle}>FSSAI License</Text>
            </View>

            {restaurant.fssaiNumber && (
              <View style={st.fssaiNumberBox}>
                <Icon name="shield-checkmark" size={20} color={C.ok} />
                <View style={{ flex: 1 }}>
                  <Text style={st.fssaiLabel}>License Number</Text>
                  <Text style={st.fssaiNumber}>{restaurant.fssaiNumber}</Text>
                </View>
              </View>
            )}

            {fssaiImage && (
              <View style={{ marginTop: 16 }}>
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
                        <Icon name="expand-outline" size={18} color="#fff" />
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
              <Icon name="close" size={24} color="#fff" />
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
  loadingText: { marginTop: 12, color: C.muted, fontSize: 14 },

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
    fontSize: 14,
    color: '#9CA3AF',
    marginTop: 8,
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
    top: 12,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroEditBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#fff',
  },
  heroName: {
    fontSize: 26,
    fontWeight: '900',
    color: '#fff',
    marginBottom: 4,
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroLocation: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 2,
  },
  statValue: {
    fontSize: 12,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },

  // Alert
  alertCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  alertGradient: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    alignItems: 'flex-start',
  },
  alertIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 4,
  },
  alertDesc: {
    fontSize: 13,
    color: C.text,
    lineHeight: 19,
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 6,
    marginTop: 10,
    padding: 10,
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: 8,
  },
  rejectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.danger,
    flex: 1,
  },

  // Quick Actions
  actionsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionIconBox: {
    width: 50,
    height: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // Details Card
  detailsCard: {
    marginHorizontal: 16,
    marginTop: 16,
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  sectionIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 4,
  },
  detailIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
    lineHeight: 21,
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: 12,
    marginLeft: 44,
  },

  // FSSAI
  fssaiNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  fssaiLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  fssaiNumber: {
    fontSize: 17,
    fontWeight: '800',
    color: C.ink,
    fontFamily: 'monospace',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  certLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
  },
  certImageBox: {
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  certImage: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    backgroundColor: C.bg,
  },
  certOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 10,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  certViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  certViewText: {
    fontSize: 12,
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
    top: 50,
    right: 20,
    zIndex: 10,
  },
  previewCloseBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewImage: {
    width: '100%',
    height: '80%',
  },
});
