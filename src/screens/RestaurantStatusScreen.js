import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const { width } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
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

const STATUS_CONFIG = {
  PENDING: {
    color: '#D97706',
    bg: '#FFFBEB',
    gradient: ['#FBBF24', '#F59E0B'],
    icon: 'time',
    label: 'Pending Review',
    description: 'Your restaurant application is under review by our team. This usually takes 24-48 hours.',
    progressPercent: 50,
  },
  APPROVED: {
    color: '#059669',
    bg: '#ECFDF5',
    gradient: ['#34D399', '#10B981'],
    icon: 'checkmark-circle',
    label: 'Approved',
    description: 'Congratulations! Your restaurant is now active and visible to customers.',
    progressPercent: 100,
  },
  REJECTED: {
    color: '#DC2626',
    bg: '#FEF2F2',
    gradient: ['#F87171', '#EF4444'],
    icon: 'close-circle',
    label: 'Rejected',
    description: 'Unfortunately, your restaurant registration was not approved. You can resubmit after making corrections.',
    progressPercent: 100,
  },
  SUSPENDED: {
    color: '#DC2626',
    bg: '#FEF2F2',
    gradient: ['#F87171', '#EF4444'],
    icon: 'ban',
    label: 'Suspended',
    description: 'Your restaurant has been temporarily suspended. Please contact support for more details.',
    progressPercent: 0,
  },
};

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
};

const TimelineStep = ({ title, description, date, isCompleted, isCurrent, isLast, stepNumber }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      {isCompleted ? (
        <LinearGradient
          colors={['#10B981', '#059669']}
          style={styles.timelineDotCompleted}
        >
          <Icon name="checkmark" size={scale(13)} color="#fff" />
        </LinearGradient>
      ) : isCurrent ? (
        <View style={styles.timelineDotCurrent}>
          <View style={styles.timelineDotCurrentInner} />
        </View>
      ) : (
        <View style={styles.timelineDotPending}>
          <Text style={styles.timelineDotNumber}>{stepNumber}</Text>
        </View>
      )}
      {!isLast && (
        <View style={[
          styles.timelineLine,
          isCompleted && styles.timelineLineCompleted,
        ]} />
      )}
    </View>
    <View style={[styles.timelineContent, isLast && { paddingBottom: 0 }]}>
      <Text style={[
        styles.timelineTitle,
        (isCompleted || isCurrent) && styles.timelineTitleActive,
        isCurrent && styles.timelineTitleCurrent,
      ]}>
        {title}
      </Text>
      {description && (
        <Text style={styles.timelineDesc}>{description}</Text>
      )}
      {date && (
        <View style={styles.timelineDateRow}>
          <Icon name="calendar-outline" size={scale(12)} color={C.muted} />
          <Text style={styles.timelineDate}>{formatDate(date)}</Text>
        </View>
      )}
    </View>
  </View>
);

export default function RestaurantStatusScreen({ navigation, route }) {
  const { restaurantId } = route.params || {};
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [restaurant, setRestaurant] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (restaurantId) {
        loadRestaurant();
      } else {
        loadFirstRestaurant();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [restaurantId])
  );

  const loadFirstRestaurant = async () => {
    try {
      setLoading(true);
      const response = await api.get('/owner/restaurants');
      if (response.data.ok && response.data.data?.length > 0) {
        setRestaurant(response.data.data[0]);
      }
    } catch (error) {
      console.log('Error loading restaurant:', error);
      Alert.alert('Error', 'Failed to load restaurant');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/restaurants/${restaurantId}`);
      if (response.data.ok) {
        setRestaurant(response.data.data);
      }
    } catch (error) {
      console.log('Error loading restaurant:', error);
      Alert.alert('Error', 'Failed to load restaurant');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    if (restaurantId) {
      loadRestaurant();
    } else {
      loadFirstRestaurant();
    }
  };

  const getStatusTimeline = () => {
    if (!restaurant) return [];

    const status = restaurant.status;
    const createdAt = restaurant.createdAt;
    const approvedAt = restaurant.approvedAt;
    const rejectedAt = restaurant.rejectedAt;

    const steps = [
      {
        title: 'Registration Submitted',
        description: 'Application submitted for review',
        date: createdAt,
        isCompleted: true,
        isCurrent: false,
        stepNumber: 1,
      },
      {
        title: 'Document Verification',
        description: 'Verifying your business documents',
        isCompleted: status === 'APPROVED' || status === 'REJECTED',
        isCurrent: status === 'PENDING',
        stepNumber: 2,
      },
      {
        title: 'Admin Review',
        description: 'Final review by admin team',
        isCompleted: status === 'APPROVED' || status === 'REJECTED',
        isCurrent: false,
        stepNumber: 3,
      },
    ];

    if (status === 'APPROVED') {
      steps.push({
        title: 'Approved',
        description: 'Your restaurant is now live!',
        date: approvedAt,
        isCompleted: true,
        isCurrent: true,
        stepNumber: 4,
      });
    } else if (status === 'REJECTED') {
      steps.push({
        title: 'Rejected',
        description: restaurant.rejectionReason || 'Application was not approved',
        date: rejectedAt,
        isCompleted: true,
        isCurrent: true,
        stepNumber: 4,
      });
    } else {
      steps.push({
        title: 'Final Approval',
        description: 'Waiting for final decision',
        isCompleted: false,
        isCurrent: false,
        stepNumber: 4,
      });
    }

    return steps;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Status</Text>
          <View style={{ width: scale(40) }} />
        </LinearGradient>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading status...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={[C.primary, C.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Status</Text>
          <View style={{ width: scale(40) }} />
        </LinearGradient>
        <View style={styles.emptyContainer}>
          <LinearGradient
            colors={['#FEE2E2', '#FECACA']}
            style={styles.emptyIconCircle}
          >
            <Icon name="restaurant-outline" size={scale(48)} color={C.primary} />
          </LinearGradient>
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Register a restaurant to see its status here</Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('RestaurantOnboarding')}
          >
            <LinearGradient
              colors={[C.primary, C.primaryDark]}
              style={styles.registerBtnGradient}
            >
              <Icon name="add-circle" size={scale(18)} color="#fff" />
              <Text style={styles.registerBtnText}>Register Restaurant</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[restaurant.status] || STATUS_CONFIG.PENDING;
  const timeline = getStatusTimeline();

  return (
    <SafeAreaView style={styles.container}>
      {/* Gradient Header */}
      <LinearGradient
        colors={[C.primary, C.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurant Status</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.backBtn}>
          <Icon name="menu" size={scale(22)} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: scale(100) }}
      >
        {/* Restaurant Info Card */}
        <View style={styles.restaurantCard}>
          <LinearGradient
            colors={['#FFF1F1', '#FFE5E5']}
            style={styles.restaurantIconCircle}
          >
            <Icon name="restaurant" size={scale(28)} color={C.primary} />
          </LinearGradient>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {restaurant.address && (
            <View style={styles.addressRow}>
              <Icon name="location-outline" size={scale(14)} color={C.muted} />
              <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
            </View>
          )}
          {restaurant.city && (
            <View style={styles.cityPill}>
              <Icon name="navigate-outline" size={scale(12)} color={C.info} />
              <Text style={styles.cityText}>{restaurant.city}</Text>
            </View>
          )}
        </View>

        {/* Status Card */}
        <View style={styles.statusCardOuter}>
          <LinearGradient
            colors={statusConfig.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCard}
          >
            <View style={styles.statusIconCircle}>
              <Icon name={statusConfig.icon} size={scale(32)} color={statusConfig.color} />
            </View>
            <Text style={styles.statusLabel}>{statusConfig.label}</Text>
            <Text style={styles.statusDescription}>{statusConfig.description}</Text>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${statusConfig.progressPercent}%` }]} />
              </View>
              <Text style={styles.progressText}>{statusConfig.progressPercent}% Complete</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Quick Info Row */}
        <View style={styles.quickInfoRow}>
          <View style={styles.quickInfoCard}>
            <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={styles.quickInfoIcon}>
              <Icon name="calendar" size={scale(18)} color="#3B82F6" />
            </LinearGradient>
            <Text style={styles.quickInfoLabel}>Submitted</Text>
            <Text style={styles.quickInfoValue}>{formatDateShort(restaurant.createdAt)}</Text>
          </View>
          <View style={styles.quickInfoCard}>
            <LinearGradient colors={[statusConfig.bg, statusConfig.bg]} style={styles.quickInfoIcon}>
              <Icon name={statusConfig.icon} size={scale(18)} color={statusConfig.color} />
            </LinearGradient>
            <Text style={styles.quickInfoLabel}>Status</Text>
            <Text style={[styles.quickInfoValue, { color: statusConfig.color }]}>
              {restaurant.status}
            </Text>
          </View>
          <View style={styles.quickInfoCard}>
            <LinearGradient colors={['#F5F3FF', '#EDE9FE']} style={styles.quickInfoIcon}>
              <Icon name="time" size={scale(18)} color="#7C3AED" />
            </LinearGradient>
            <Text style={styles.quickInfoLabel}>Updated</Text>
            <Text style={styles.quickInfoValue}>
              {formatDateShort(restaurant.approvedAt || restaurant.rejectedAt || restaurant.updatedAt || restaurant.createdAt)}
            </Text>
          </View>
        </View>

        {/* Timeline Card */}
        <View style={styles.timelineCard}>
          <View style={styles.sectionHeader}>
            <View style={styles.sectionIconBox}>
              <Icon name="git-branch" size={scale(18)} color={C.info} />
            </View>
            <View>
              <Text style={styles.sectionTitle}>Approval Timeline</Text>
              <Text style={styles.sectionSubtitle}>Track your application progress</Text>
            </View>
          </View>

          <View style={styles.timelineWrapper}>
            {timeline.map((step, index) => (
              <TimelineStep
                key={index}
                {...step}
                isLast={index === timeline.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Rejection Action Card */}
        {restaurant.status === 'REJECTED' && (
          <View style={styles.rejectionCard}>
            <LinearGradient
              colors={['#FEF2F2', '#FEE2E2']}
              style={styles.rejectionGradient}
            >
              <View style={styles.rejectionHeader}>
                <View style={styles.rejectionIconBox}>
                  <Icon name="alert-circle" size={scale(22)} color="#DC2626" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rejectionTitle}>Application Rejected</Text>
                  <Text style={styles.rejectionReason}>
                    {restaurant.rejectionReason || 'No specific reason provided'}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.resubmitBtn}
                onPress={() => navigation.navigate('RestaurantOnboarding', { restaurantId: restaurant.id })}
                activeOpacity={0.7}
              >
                <Icon name="refresh-circle" size={scale(18)} color="#fff" />
                <Text style={styles.resubmitBtnText}>Edit & Resubmit</Text>
              </TouchableOpacity>
            </LinearGradient>
          </View>
        )}

        {/* Pending Tips Card */}
        {restaurant.status === 'PENDING' && (
          <View style={styles.tipsCard}>
            <LinearGradient
              colors={['#FFFBEB', '#FEF3C7']}
              style={styles.tipsGradient}
            >
              <View style={styles.tipsHeader}>
                <Icon name="bulb" size={scale(22)} color="#D97706" />
                <Text style={styles.tipsTitle}>While You Wait</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Ensure all your documents are up to date</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>Review typically takes 24-48 business hours</Text>
              </View>
              <View style={styles.tipItem}>
                <View style={styles.tipDot} />
                <Text style={styles.tipText}>You'll receive a notification once reviewed</Text>
              </View>
            </LinearGradient>
          </View>
        )}

        {/* Support Card */}
        <View style={styles.supportCard}>
          <LinearGradient
            colors={['#EFF6FF', '#DBEAFE']}
            style={styles.supportGradient}
          >
            <View style={styles.supportIconBox}>
              <Icon name="headset" size={scale(28)} color="#3B82F6" />
            </View>
            <Text style={styles.supportTitle}>Need Help?</Text>
            <Text style={styles.supportText}>
              Have questions about your application? Our support team is here to assist you.
            </Text>
            <TouchableOpacity
              style={styles.supportBtn}
              onPress={() => navigation.navigate('SupportCenter')}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={['#3B82F6', '#2563EB']}
                style={styles.supportBtnGradient}
              >
                <Icon name="chatbubbles" size={scale(18)} color="#fff" />
                <Text style={styles.supportBtnText}>Contact Support</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </ScrollView>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  backBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: '#fff',
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: C.muted,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(32),
  },
  emptyIconCircle: {
    width: scale(100),
    height: scale(100),
    borderRadius: scale(50),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    marginBottom: scale(24),
  },
  registerBtn: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  registerBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(24),
    paddingVertical: scale(14),
  },
  registerBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Restaurant Card
  restaurantCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    padding: scale(24),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.05,
    shadowRadius: scale(8),
    elevation: 2,
  },
  restaurantIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(20),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
  },
  restaurantName: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(6),
  },
  restaurantAddress: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
  },
  cityPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(5),
    borderRadius: scale(12),
    backgroundColor: '#EFF6FF',
  },
  cityText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.info,
  },

  // Status Card
  statusCardOuter: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.1,
    shadowRadius: scale(12),
    elevation: 4,
  },
  statusCard: {
    padding: scale(24),
    alignItems: 'center',
    borderRadius: scale(20),
  },
  statusIconCircle: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    backgroundColor: 'rgba(255,255,255,0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
  },
  statusLabel: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: '#fff',
  },
  statusDescription: {
    fontSize: moderateScale(13),
    color: 'rgba(255,255,255,0.9)',
    marginTop: scale(6),
    textAlign: 'center',
    lineHeight: moderateScale(19),
    paddingHorizontal: scale(10),
  },
  progressContainer: {
    width: '100%',
    marginTop: scale(20),
  },
  progressTrack: {
    height: scale(6),
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: scale(3),
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: scale(3),
  },
  progressText: {
    fontSize: moderateScale(11),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(6),
    textAlign: 'right',
    fontWeight: '600',
  },

  // Quick Info Row
  quickInfoRow: {
    flexDirection: 'row',
    gap: scale(10),
    marginHorizontal: scale(16),
    marginTop: scale(16),
  },
  quickInfoCard: {
    flex: 1,
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(12),
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
  },
  quickInfoIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(8),
  },
  quickInfoLabel: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginBottom: scale(3),
  },
  quickInfoValue: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
  },

  // Timeline Card
  timelineCard: {
    backgroundColor: C.card,
    marginHorizontal: scale(16),
    marginTop: scale(16),
    padding: scale(20),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: C.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(8),
    elevation: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(20),
  },
  sectionIconBox: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: C.ink,
  },
  sectionSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: 1,
  },

  timelineWrapper: {
    paddingLeft: scale(4),
  },
  timelineItem: {
    flexDirection: 'row',
  },
  timelineLeft: {
    alignItems: 'center',
    marginRight: scale(14),
  },
  timelineDotCompleted: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCurrent: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    borderWidth: 3,
    borderColor: C.primary,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCurrentInner: {
    width: scale(10),
    height: scale(10),
    borderRadius: scale(5),
    backgroundColor: C.primary,
  },
  timelineDotPending: {
    width: scale(26),
    height: scale(26),
    borderRadius: scale(13),
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotNumber: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.muted,
  },
  timelineLine: {
    width: scale(2.5),
    flex: 1,
    minHeight: scale(36),
    backgroundColor: '#E5E7EB',
    marginVertical: scale(4),
    borderRadius: scale(2),
  },
  timelineLineCompleted: {
    backgroundColor: '#10B981',
  },
  timelineContent: {
    flex: 1,
    paddingBottom: scale(24),
  },
  timelineTitle: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
  },
  timelineTitleActive: {
    color: C.ink,
    fontWeight: '700',
  },
  timelineTitleCurrent: {
    color: C.primary,
  },
  timelineDesc: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(3),
    lineHeight: moderateScale(17),
  },
  timelineDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(6),
    backgroundColor: '#F8FAFC',
    paddingHorizontal: scale(8),
    paddingVertical: scale(4),
    borderRadius: scale(6),
    alignSelf: 'flex-start',
  },
  timelineDate: {
    fontSize: moderateScale(11),
    color: C.muted,
    fontWeight: '500',
  },

  // Rejection Card
  rejectionCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  rejectionGradient: {
    padding: scale(20),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  rejectionHeader: {
    flexDirection: 'row',
    gap: scale(12),
    marginBottom: scale(16),
  },
  rejectionIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(14),
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#DC2626',
    marginBottom: scale(4),
  },
  rejectionReason: {
    fontSize: moderateScale(13),
    color: C.muted,
    lineHeight: moderateScale(19),
  },
  resubmitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: '#DC2626',
  },
  resubmitBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#fff',
  },

  // Tips Card
  tipsCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  tipsGradient: {
    padding: scale(20),
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    marginBottom: scale(16),
  },
  tipsTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#92400E',
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(10),
    marginBottom: scale(10),
  },
  tipDot: {
    width: scale(6),
    height: scale(6),
    borderRadius: scale(3),
    backgroundColor: '#D97706',
    marginTop: scale(6),
  },
  tipText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: '#78350F',
    lineHeight: moderateScale(19),
  },

  // Support Card
  supportCard: {
    marginHorizontal: scale(16),
    marginTop: scale(16),
    borderRadius: scale(20),
    overflow: 'hidden',
  },
  supportGradient: {
    padding: scale(24),
    alignItems: 'center',
    borderRadius: scale(20),
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  supportIconBox: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.1,
    shadowRadius: scale(6),
    elevation: 2,
  },
  supportTitle: {
    fontSize: moderateScale(18),
    fontWeight: '800',
    color: C.ink,
    marginBottom: scale(6),
  },
  supportText: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(19),
    marginBottom: scale(18),
  },
  supportBtn: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  supportBtnGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(24),
    paddingVertical: scale(12),
  },
  supportBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },
});
