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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
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
};

const STATUS_CONFIG = {
  PENDING: {
    color: C.warn,
    bg: '#FFFBEB',
    icon: 'time',
    label: 'Pending Review',
    description: 'Your restaurant is under review by our team',
  },
  APPROVED: {
    color: C.ok,
    bg: '#ECFDF5',
    icon: 'checkmark-circle',
    label: 'Approved',
    description: 'Your restaurant is active and visible to customers',
  },
  REJECTED: {
    color: C.danger,
    bg: '#FEF2F2',
    icon: 'close-circle',
    label: 'Rejected',
    description: 'Your restaurant registration was not approved',
  },
  SUSPENDED: {
    color: C.danger,
    bg: '#FEF2F2',
    icon: 'ban',
    label: 'Suspended',
    description: 'Your restaurant has been temporarily suspended',
  },
};

const TimelineStep = ({ title, description, date, isCompleted, isCurrent, isLast }) => (
  <View style={styles.timelineItem}>
    <View style={styles.timelineLeft}>
      <View
        style={[
          styles.timelineDot,
          isCompleted && styles.timelineDotCompleted,
          isCurrent && styles.timelineDotCurrent,
        ]}
      >
        {isCompleted && <Icon name="checkmark" size={12} color="#fff" />}
      </View>
      {!isLast && (
        <View style={[styles.timelineLine, isCompleted && styles.timelineLineCompleted]} />
      )}
    </View>
    <View style={styles.timelineContent}>
      <Text style={[styles.timelineTitle, (isCompleted || isCurrent) && styles.timelineTitleActive]}>
        {title}
      </Text>
      {description && <Text style={styles.timelineDesc}>{description}</Text>}
      {date && <Text style={styles.timelineDate}>{formatDate(date)}</Text>}
    </View>
  </View>
);

const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

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
        isCurrent: status === 'PENDING',
      },
      {
        title: 'Document Verification',
        description: 'Verifying your business documents',
        isCompleted: status === 'APPROVED' || status === 'REJECTED',
        isCurrent: status === 'PENDING',
      },
      {
        title: 'Admin Review',
        description: 'Final review by admin team',
        isCompleted: status === 'APPROVED' || status === 'REJECTED',
        isCurrent: false,
      },
    ];

    if (status === 'APPROVED') {
      steps.push({
        title: 'Approved',
        description: 'Your restaurant is now live!',
        date: approvedAt,
        isCompleted: true,
        isCurrent: true,
      });
    } else if (status === 'REJECTED') {
      steps.push({
        title: 'Rejected',
        description: restaurant.rejectionReason || 'Application was not approved',
        date: rejectedAt,
        isCompleted: true,
        isCurrent: true,
      });
    } else {
      steps.push({
        title: 'Approval',
        description: 'Waiting for final approval',
        isCompleted: false,
        isCurrent: false,
      });
    }

    return steps;
  };

  const contactSupport = () => {
    navigation.navigate('SupportCenter');
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!restaurant) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={22} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Restaurant Status</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.emptyContainer}>
          <Icon name="restaurant-outline" size={64} color={C.muted} />
          <Text style={styles.emptyTitle}>No Restaurant Found</Text>
          <Text style={styles.emptyText}>Register a restaurant to see its status</Text>
          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => navigation.navigate('RestaurantOnboarding')}
          >
            <Text style={styles.registerBtnText}>Register Restaurant</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const statusConfig = STATUS_CONFIG[restaurant.status] || STATUS_CONFIG.PENDING;
  const timeline = getStatusTimeline();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Restaurant Status</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Restaurant Info */}
        <View style={styles.restaurantCard}>
          <View style={styles.restaurantIcon}>
            <Icon name="restaurant" size={32} color={C.primary} />
          </View>
          <Text style={styles.restaurantName}>{restaurant.name}</Text>
          {restaurant.address && (
            <Text style={styles.restaurantAddress}>{restaurant.address}</Text>
          )}
        </View>

        {/* Status Card */}
        <View style={[styles.statusCard, { backgroundColor: statusConfig.bg }]}>
          <View style={[styles.statusIconBox, { backgroundColor: statusConfig.color }]}>
            <Icon name={statusConfig.icon} size={28} color="#fff" />
          </View>
          <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
            {statusConfig.label}
          </Text>
          <Text style={styles.statusDesc}>{statusConfig.description}</Text>
        </View>

        {/* Timeline */}
        <View style={styles.timelineContainer}>
          <Text style={styles.sectionTitle}>Approval Timeline</Text>
          {timeline.map((step, index) => (
            <TimelineStep
              key={index}
              {...step}
              isLast={index === timeline.length - 1}
            />
          ))}
        </View>

        {/* Actions */}
        {restaurant.status === 'REJECTED' && (
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>What's Next?</Text>
            <View style={styles.actionCard}>
              <Icon name="refresh-circle" size={24} color={C.info} />
              <View style={styles.actionInfo}>
                <Text style={styles.actionTitle}>Resubmit Application</Text>
                <Text style={styles.actionDesc}>Fix the issues and submit again</Text>
              </View>
              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => navigation.navigate('RestaurantOnboarding', { restaurantId: restaurant.id })}
              >
                <Text style={styles.actionBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Support */}
        <View style={styles.supportContainer}>
          <Text style={styles.supportTitle}>Need Help?</Text>
          <Text style={styles.supportText}>
            Contact our support team if you have questions about your application status
          </Text>
          <TouchableOpacity style={styles.supportBtn} onPress={contactSupport}>
            <Icon name="chatbubbles" size={20} color="#fff" />
            <Text style={styles.supportBtnText}>Contact Support</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
  refreshBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
  registerBtn: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  registerBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },

  restaurantCard: {
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  restaurantIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FFF0F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  restaurantName: { fontSize: 20, fontWeight: '800', color: C.ink },
  restaurantAddress: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: 'center' },

  statusCard: {
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 24,
    borderRadius: 16,
  },
  statusIconBox: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusLabel: { fontSize: 20, fontWeight: '800' },
  statusDesc: { fontSize: 14, color: C.muted, marginTop: 4, textAlign: 'center' },

  timelineContainer: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 16 },

  timelineItem: { flexDirection: 'row' },
  timelineLeft: { alignItems: 'center', marginRight: 12 },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineDotCompleted: { backgroundColor: C.ok },
  timelineDotCurrent: { backgroundColor: C.primary },
  timelineLine: {
    width: 2,
    flex: 1,
    minHeight: 40,
    backgroundColor: C.border,
    marginVertical: 4,
  },
  timelineLineCompleted: { backgroundColor: C.ok },
  timelineContent: { flex: 1, paddingBottom: 20 },
  timelineTitle: { fontSize: 15, fontWeight: '600', color: C.muted },
  timelineTitleActive: { color: C.ink },
  timelineDesc: { fontSize: 13, color: C.muted, marginTop: 2 },
  timelineDate: { fontSize: 12, color: C.muted, marginTop: 4 },

  actionsContainer: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  actionInfo: { flex: 1, marginLeft: 12 },
  actionTitle: { fontSize: 14, fontWeight: '700', color: C.ink },
  actionDesc: { fontSize: 12, color: C.muted, marginTop: 2 },
  actionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: C.info,
  },
  actionBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },

  supportContainer: {
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  supportTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  supportText: { fontSize: 13, color: C.muted, textAlign: 'center', marginTop: 4, marginBottom: 16 },
  supportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  supportBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
