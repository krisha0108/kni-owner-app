import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Image, Linking, RefreshControl,
  Modal, StatusBar, TextInput, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, getImageUrl } from '../api/client';
import restaurantService from '../services/restaurantService';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import AppAlert from '../utils/AppAlert';
import useKeyboardHeight from '../utils/useKeyboardHeight';
const HERO_HEIGHT = 190;

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
    DELETION_REQUESTED: {
      icon: 'trash',
      bg: '#FFFBEB',
      color: '#B45309',
      gradient: ['#FEF3C7', '#FDE68A'],
      label: 'Deletion Requested',
      description: 'You requested deletion of this restaurant. It stays live until an admin approves the request.',
      emoji: '🗑️',
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

/* ─── Skeleton ─── */
function SkeletonRestaurant({ pulse }) {
  return (
    <View style={{ flex: 1 }}>
      <Animated.View style={[st.skelHero, { opacity: pulse }]} />
      <View style={{ paddingHorizontal: scale(16) }}>
        <Animated.View style={[st.skelStats, { opacity: pulse }]} />
        <Animated.View style={[st.skelAlert, { opacity: pulse }]} />
        <View style={{ flexDirection: 'row', gap: scale(9), marginTop: scale(12) }}>
          {[1, 2, 3, 4].map(i => (
            <Animated.View key={i} style={[st.skelAction, { opacity: pulse }]} />
          ))}
        </View>
        <Animated.View style={[st.skelDetailsCard, { opacity: pulse }]} />
      </View>
    </View>
  );
}

export default function RestaurantView({ navigation, route }) {
  const { can } = usePermissions();
  const { restaurantId } = route.params;
  const keyboardHeight = useKeyboardHeight();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [deletionReason, setDeletionReason] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [cancellingRequest, setCancellingRequest] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadRestaurant = async () => {
    try {
      // Fetch by id directly (not /accessible, which server-side filters to
      // APPROVED restaurants only) - this screen also needs to display
      // PENDING/REJECTED restaurants.
      const response = await api.get(`/owner/restaurants/${restaurantId}`);
      if (response.data.ok) {
        setRestaurant(response.data.data);
      } else {
        AppAlert.alert('Error', response.data.error || 'Restaurant not found');
        (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'));
      }
    } catch (error) {
      console.error('Load restaurant error:', error);
      AppAlert.alert('Error', 'Could not load restaurant details');
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

  const submitDeletionRequest = async () => {
    if (deletionReason.trim().length < 10) return;
    setSubmittingRequest(true);
    try {
      await restaurantService.requestDeletion(restaurantId, deletionReason.trim());
      setRequestModalVisible(false);
      setDeletionReason('');
      AppAlert.alert('Request Submitted', 'An admin will review your deletion request.');
      loadRestaurant();
    } catch (error) {
      AppAlert.alert('Error', error.message || 'Failed to submit deletion request');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleCancelDeletionRequest = () => {
    AppAlert.alert(
      'Cancel Deletion Request',
      'Are you sure you want to cancel this deletion request? The restaurant will remain active as normal.',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, Cancel Request',
          style: 'destructive',
          onPress: async () => {
            setCancellingRequest(true);
            try {
              await restaurantService.cancelDeletionRequest(restaurantId);
              AppAlert.alert('Cancelled', 'Your deletion request has been cancelled.');
              loadRestaurant();
            } catch (error) {
              AppAlert.alert('Error', error.message || 'Failed to cancel deletion request');
            } finally {
              setCancellingRequest(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={st.container} edges={['top']}>
        <StatusBar barStyle="dark-content" backgroundColor="transparent" />
        <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
          <SkeletonRestaurant pulse={pulse} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (!restaurant) return null;

  const effectiveStatusKey = restaurant.pendingDeletionRequest ? 'DELETION_REQUESTED' : restaurant.status;
  const statusConfig = getStatusConfig(effectiveStatusKey);
  const restaurantImage = getImageUrl(restaurant.restaurantImageUrl);
  const fssaiImage = getImageUrl(restaurant.fssaiCertificateUrl);
  const canRequestDeletion = restaurant.status === 'APPROVED' && !restaurant.pendingDeletionRequest && can('restaurant:delete');

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />

      {/* Hero Section with Image — static, doesn't scroll with the list */}
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
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
        >
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>

        {/* Edit Button */}
        {restaurant.status !== 'APPROVED' && can('restaurant:update') && (
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

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: scale(100) }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* At a Glance — dark stats strip */}
        <LinearGradient colors={[C.ink, '#2E3470']} style={st.statsStrip}>
          <View style={st.statsStripItem}>
            <Text style={st.statsStripValue} numberOfLines={1}>{formatDateShort(restaurant.createdAt)}</Text>
            <Text style={st.statsStripLabel}>REGISTERED</Text>
          </View>
          <View style={[st.statsStripItem, st.statsStripDivider]}>
            <Text style={[st.statsStripValue, { color: statusConfig.color }]} numberOfLines={1}>{statusConfig.label}</Text>
            <Text style={st.statsStripLabel}>STATUS</Text>
          </View>
          <View style={st.statsStripItem}>
            <Text style={st.statsStripValue} numberOfLines={1}>
              {restaurant.outletType ? restaurant.outletType.replace(/_/g, ' ') : restaurant.city}
            </Text>
            <Text style={st.statsStripLabel}>{restaurant.outletType ? 'OUTLET' : 'CITY'}</Text>
          </View>
        </LinearGradient>

        {/* Status Alert Card */}
        <View style={st.alertCard}>
          <LinearGradient
            colors={statusConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={st.alertGradient}
          >
            <View style={st.alertIconBox}>
              <Icon name={statusConfig.icon} size={scale(20)} color={statusConfig.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[st.alertTitle, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              <Text style={st.alertDesc}>{statusConfig.description}</Text>

              {restaurant.status === 'REJECTED' && restaurant.rejectionReason && (
                <View style={st.rejectionBox}>
                  <Icon name="information-circle" size={scale(13)} color={C.danger} />
                  <Text style={st.rejectionText}>Reason: {restaurant.rejectionReason}</Text>
                </View>
              )}

              {restaurant.pendingDeletionRequest && (
                <>
                  <View style={[st.rejectionBox, { backgroundColor: 'rgba(180,83,9,0.1)' }]}>
                    <Icon name="information-circle" size={scale(13)} color="#B45309" />
                    <Text style={[st.rejectionText, { color: '#B45309' }]}>
                      Reason: {restaurant.pendingDeletionRequest.reason}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={st.cancelRequestBtn}
                    onPress={handleCancelDeletionRequest}
                    disabled={cancellingRequest}
                  >
                    {cancellingRequest ? (
                      <ActivityIndicator size="small" color="#B45309" />
                    ) : (
                      <>
                        <Icon name="close-circle-outline" size={scale(13)} color="#B45309" />
                        <Text style={st.cancelRequestBtnText}>Cancel Request</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              )}

              {canRequestDeletion && (
                <TouchableOpacity
                  style={st.requestDeletionBtn}
                  onPress={() => setRequestModalVisible(true)}
                >
                  <Icon name="trash-outline" size={scale(13)} color={C.danger} />
                  <Text style={st.requestDeletionBtnText}>Request Deletion</Text>
                </TouchableOpacity>
              )}
            </View>
          </LinearGradient>
        </View>

        {/* Quick Actions - Only for Approved */}
        {restaurant.status === 'APPROVED' && (
          <View style={st.actionsCard}>
            <Text style={st.sectionTitle}>Quick Actions</Text>
            <View style={st.actionsGrid}>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('Home', { screen: 'EquipmentTab' })}>
                <View style={[st.actionIconBox, { backgroundColor: '#FEE2E2' }]}>
                  <Icon name="construct" size={scale(17)} color={C.primary} />
                </View>
                <Text style={st.actionLabel}>Book Service</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('Home', { screen: 'EquipmentTab' })}>
                <View style={[st.actionIconBox, { backgroundColor: '#EFF6FF' }]}>
                  <Icon name="hardware-chip" size={scale(17)} color={C.info} />
                </View>
                <Text style={st.actionLabel}>Equipment</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('Marketplace')}>
                <View style={[st.actionIconBox, { backgroundColor: '#F5F3FF' }]}>
                  <Icon name="storefront" size={scale(17)} color={C.purple} />
                </View>
                <Text style={st.actionLabel}>Marketplace</Text>
              </TouchableOpacity>
              <TouchableOpacity style={st.actionItem} onPress={() => navigation.navigate('MyBookings')}>
                <View style={[st.actionIconBox, { backgroundColor: '#ECFDF5' }]}>
                  <Icon name="receipt" size={scale(17)} color={C.ok} />
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
              <Icon name="information-circle" size={scale(15)} color={C.primary} />
            </View>
            <Text style={st.sectionTitle}>Restaurant Details</Text>
          </View>

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="business-outline" size={scale(14)} color={C.muted} />
            </View>
            <View style={st.detailContent}>
              <Text style={st.detailLabel}>Restaurant Name</Text>
              <Text style={st.detailValue}>{restaurant.name}</Text>
            </View>
          </View>

          <View style={st.divider} />

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="location-outline" size={scale(14)} color={C.muted} />
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
                  <Icon name="navigate-outline" size={scale(14)} color={C.muted} />
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

          {restaurant.outletType && (
            <>
              <View style={st.divider} />
              <View style={st.detailRow}>
                <View style={st.detailIcon}>
                  <Icon name="storefront-outline" size={scale(14)} color={C.muted} />
                </View>
                <View style={st.detailContent}>
                  <Text style={st.detailLabel}>Outlet Type</Text>
                  <Text style={st.detailValue}>{restaurant.outletType.replace(/_/g, ' ')}</Text>
                </View>
              </View>
            </>
          )}

          <View style={st.divider} />

          <View style={st.detailRow}>
            <View style={st.detailIcon}>
              <Icon name="calendar-outline" size={scale(14)} color={C.muted} />
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
                <Icon name="document-text" size={scale(15)} color="#F97316" />
              </View>
              <Text style={st.sectionTitle}>FSSAI License</Text>
            </View>

            {restaurant.fssaiNumber && (
              <View style={st.fssaiNumberBox}>
                <Icon name="shield-checkmark" size={scale(15)} color={C.ok} />
                <View style={{ flex: 1 }}>
                  <Text style={st.fssaiLabel}>License Number</Text>
                  <Text style={st.fssaiNumber}>{restaurant.fssaiNumber}</Text>
                </View>
              </View>
            )}

            {fssaiImage && (
              <View style={{ marginTop: scale(12) }}>
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
                        <Icon name="expand-outline" size={scale(14)} color="#fff" />
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

      {/* Request Deletion Modal - approved restaurants require admin approval */}
      <Modal
        visible={requestModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <View style={st.reqModalOverlay}>
          <View style={st.reqModalCard}>
          <ScrollView contentContainerStyle={{ padding: scale(20), paddingBottom: scale(20) }} keyboardShouldPersistTaps="handled">
            <View style={st.reqModalHeader}>
              <Text style={st.reqModalTitle}>Request Deletion</Text>
              <TouchableOpacity onPress={() => setRequestModalVisible(false)}>
                <Icon name="close" size={scale(22)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <Text style={st.reqModalSubtitle}>
              "{restaurant.name}" is a live, approved restaurant. Deleting it requires admin approval -
              it will only be removed once an admin reviews and approves your request.
            </Text>
            <TextInput
              style={st.reqModalTextArea}
              placeholder="Reason for deletion (min 10 characters)..."
              placeholderTextColor={C.muted}
              value={deletionReason}
              onChangeText={setDeletionReason}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              autoFocus
            />
            <View style={st.reqModalActions}>
              <TouchableOpacity
                style={st.reqModalCancelBtn}
                onPress={() => setRequestModalVisible(false)}
                disabled={submittingRequest}
              >
                <Text style={st.reqModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.reqModalSubmitBtn, (deletionReason.trim().length < 10 || submittingRequest) && st.reqModalSubmitBtnDisabled]}
                onPress={submitDeletionRequest}
                disabled={deletionReason.trim().length < 10 || submittingRequest}
              >
                {submittingRequest ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={st.reqModalSubmitText}>Submit Request</Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>
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
    height: HERO_HEIGHT,
    marginHorizontal: scale(16),
    marginTop: scale(10),
    borderRadius: scale(18),
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#1F2937',
  },
  heroImage: {
    width: '100%',
    height: HERO_HEIGHT,
  },
  heroPlaceholder: {
    width: '100%',
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
    fontSize: moderateScale(20),
    fontWeight: '900',
    color: '#fff',
    marginBottom: scale(3),
  },
  heroLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
  },
  heroLocation: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // At a Glance — dark stats strip
  statsStrip: {
    flexDirection: 'row',
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(14),
    padding: scale(12),
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: scale(10),
    shadowOffset: { width: 0, height: scale(4) },
    elevation: 4,
  },
  statsStripItem: { flex: 1, alignItems: 'center' },
  statsStripDivider: { borderLeftWidth: 1, borderLeftColor: 'rgba(255,255,255,0.15)', borderRightWidth: 1, borderRightColor: 'rgba(255,255,255,0.15)' },
  statsStripValue: { fontSize: moderateScale(12.5), fontWeight: '800', color: '#fff' },
  statsStripLabel: { fontSize: moderateScale(8.5), fontWeight: '700', color: 'rgba(255,255,255,0.6)', letterSpacing: 0.4, marginTop: scale(3) },

  // Alert
  alertCard: {
    marginHorizontal: scale(16),
    marginTop: scale(12),
    borderRadius: scale(14),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 3,
  },
  alertGradient: {
    flexDirection: 'row',
    padding: scale(12),
    gap: scale(9),
    alignItems: 'flex-start',
  },
  alertIconBox: {
    width: scale(34),
    height: scale(34),
    borderRadius: scale(10),
    backgroundColor: 'rgba(255,255,255,0.7)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: moderateScale(13.5),
    fontWeight: '800',
    marginBottom: scale(3),
  },
  alertDesc: {
    fontSize: moderateScale(11.5),
    color: C.text,
    lineHeight: moderateScale(16.5),
  },
  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(5),
    marginTop: scale(8),
    padding: scale(8),
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderRadius: scale(7),
  },
  rejectionText: {
    fontSize: moderateScale(10.5),
    fontWeight: '600',
    color: C.danger,
    flex: 1,
  },
  cancelRequestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(5),
    marginTop: scale(8),
    paddingVertical: scale(8),
    borderRadius: scale(9),
    borderWidth: 1.5,
    borderColor: '#B45309',
  },
  cancelRequestBtnText: {
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    color: '#B45309',
  },
  requestDeletionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(5),
    marginTop: scale(8),
    paddingVertical: scale(8),
    borderRadius: scale(9),
    borderWidth: 1.5,
    borderColor: C.danger,
  },
  requestDeletionBtnText: {
    fontSize: moderateScale(11.5),
    fontWeight: '700',
    color: C.danger,
  },

  // Request Deletion Modal
  reqModalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  reqModalCard: { backgroundColor: C.card, borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20), maxHeight: '85%' },
  reqModalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: scale(8) },
  reqModalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  reqModalSubtitle: { fontSize: moderateScale(13), color: C.text, marginBottom: scale(14), lineHeight: moderateScale(19) },
  reqModalTextArea: { backgroundColor: C.bg, borderRadius: scale(12), borderWidth: 1, borderColor: C.border, padding: scale(14), fontSize: moderateScale(14), color: C.text, minHeight: scale(100) },
  reqModalActions: { flexDirection: 'row', gap: scale(10), marginTop: scale(16) },
  reqModalCancelBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), borderWidth: 1.5, borderColor: C.border, alignItems: 'center' },
  reqModalCancelText: { fontSize: moderateScale(14), fontWeight: '700', color: C.text },
  reqModalSubmitBtn: { flex: 1, paddingVertical: scale(14), borderRadius: scale(12), backgroundColor: C.danger, alignItems: 'center' },
  reqModalSubmitBtnDisabled: { backgroundColor: '#FCA5A5' },
  reqModalSubmitText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  // Quick Actions
  actionsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(12),
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(12),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 3,
  },
  actionsGrid: {
    flexDirection: 'row',
    gap: scale(9),
    marginTop: scale(9),
  },
  actionItem: {
    flex: 1,
    alignItems: 'center',
    gap: scale(6),
  },
  actionIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: moderateScale(9.5),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // Details Card
  detailsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(12),
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(14),
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(14),
  },
  sectionIconBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(9),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: moderateScale(13.5),
    fontWeight: '800',
    color: C.ink,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(9),
    paddingVertical: scale(3),
  },
  detailIcon: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(7),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(1),
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: moderateScale(9.5),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: scale(1),
  },
  detailValue: {
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: C.text,
    lineHeight: moderateScale(17),
  },
  divider: {
    height: 1,
    backgroundColor: C.border,
    marginVertical: scale(9),
    marginLeft: scale(35),
  },

  // FSSAI
  fssaiNumberBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(9),
    backgroundColor: '#F0FDF4',
    padding: scale(10),
    borderRadius: scale(10),
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  fssaiLabel: {
    fontSize: moderateScale(9.5),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  fssaiNumber: {
    fontSize: moderateScale(14),
    fontWeight: '800',
    color: C.ink,
    fontFamily: 'monospace',
    letterSpacing: 1.2,
    marginTop: scale(1),
  },
  certLabel: {
    fontSize: moderateScale(10.5),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(6),
  },
  certImageBox: {
    borderRadius: scale(10),
    overflow: 'hidden',
    position: 'relative',
  },
  certImage: {
    width: '100%',
    height: scale(130),
    borderRadius: scale(10),
    backgroundColor: C.bg,
  },
  certOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: scale(8),
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
  },
  certViewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(5),
  },
  certViewText: {
    fontSize: moderateScale(10.5),
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

  // ═══ Skeleton ═══
  skelHero: {
    height: HERO_HEIGHT,
    marginHorizontal: scale(16),
    marginTop: scale(10),
    borderRadius: scale(18),
    backgroundColor: '#E5E7EB',
  },
  skelStats: {
    height: scale(60),
    borderRadius: scale(14),
    backgroundColor: '#E2E8F0',
    marginTop: scale(16),
  },
  skelAlert: {
    height: scale(90),
    borderRadius: scale(14),
    backgroundColor: '#E2E8F0',
    marginTop: scale(12),
  },
  skelAction: {
    flex: 1,
    height: scale(70),
    borderRadius: scale(12),
    backgroundColor: '#E2E8F0',
  },
  skelDetailsCard: {
    height: scale(160),
    borderRadius: scale(14),
    backgroundColor: '#E2E8F0',
    marginTop: scale(12),
  },
});
