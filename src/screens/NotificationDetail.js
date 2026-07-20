// screens/NotificationDetail.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { scale, moderateScale } from '../utils/responsive';
import { resolveNotificationLink } from '../utils/notificationLink';
const { width: W } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

// Keyed on the real Prisma NotificationType enum - see Notifications.js for
// the same TYPE_CONFIG (kept in sync manually since these are separate screens).
const TMAP = {
  BOOKING:      { ic: 'calendar',         gradient: ['#60A5FA', '#3B82F6'], label: 'Booking' },
  PAYMENT:      { ic: 'card',             gradient: ['#34D399', '#059669'], label: 'Payment' },
  ORDER:        { ic: 'cube',             gradient: ['#2DD4BF', '#14B8A6'], label: 'Order' },
  AMC:          { ic: 'shield-checkmark', gradient: ['#818CF8', '#4F46E5'], label: 'AMC' },
  EQUIPMENT:    { ic: 'construct',        gradient: ['#FBBF24', '#D97706'], label: 'Equipment' },
  SYSTEM:       { ic: 'notifications',    gradient: ['#94A3B8', '#64748B'], label: 'System' },
  ANNOUNCEMENT: { ic: 'megaphone',        gradient: ['#A78BFA', '#7C3AED'], label: 'Announcement' },
};

const DEFAULT_TYPE = { ic: 'notifications-outline', gradient: ['#94A3B8', '#64748B'], label: 'Notification' };

export default function NotificationDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const notification = route?.params?.notification;

  if (!notification) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.headerGrad}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.hBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.hTitle}>Notification</Text>
          <View style={{ width: scale(38) }} />
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(32) }}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.emptyIcon}>
            <Icon name="alert-circle-outline" size={scale(40)} color={C.primary} />
          </LinearGradient>
          <Text style={st.emptyTitle}>Notification Not Found</Text>
          <Text style={st.emptyText}>This notification may have been removed or is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = TMAP[notification.type] || DEFAULT_TYPE;

  const ACTION_LABELS = {
    BookingDetail: { label: 'View Booking', icon: 'calendar' },
    RestaurantStatus: { label: 'View Restaurant Status', icon: 'storefront' },
    MyRestaurants: { label: 'View Restaurants', icon: 'storefront' },
    SupportCenter: { label: 'View Support', icon: 'chatbubbles' },
    TeamManagement: { label: 'View Team', icon: 'people' },
  };

  const getActionButton = () => {
    const link = resolveNotificationLink(notification.linkUrl);
    if (!link) return null;
    const meta = ACTION_LABELS[link.screen] || { label: 'View Details', icon: 'arrow-forward-circle' };
    return { ...meta, screen: link.screen, params: link.params };
  };

  const actionButton = getActionButton();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={st.headerGrad}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.hBtn}>
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <Text style={st.hTitle}>Notification</Text>
        <View style={{ width: scale(38) }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: scale(16), paddingBottom: insets.bottom + (actionButton ? scale(100) : scale(24)) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Icon */}
        <View style={st.iconContainer}>
          <LinearGradient colors={typeConfig.gradient} style={st.iconCircle}>
            <Icon name={typeConfig.ic} size={scale(36)} color="#fff" />
          </LinearGradient>
        </View>

        {/* Type Badge */}
        <View style={st.typeLabelRow}>
          <LinearGradient
            colors={[typeConfig.gradient[0] + '25', typeConfig.gradient[1] + '15']}
            style={st.typeBadge}
          >
            <Icon name={typeConfig.ic} size={scale(13)} color={typeConfig.gradient[1]} />
            <Text style={[st.typeBadgeText, { color: typeConfig.gradient[1] }]}>{typeConfig.label}</Text>
          </LinearGradient>
        </View>

        {/* Title */}
        <Text style={st.title}>{notification.title}</Text>

        {/* Message Card */}
        <View style={st.messageCard}>
          <LinearGradient
            colors={typeConfig.gradient}
            style={st.messageAccent}
          />
          <View style={st.messageInner}>
            <Icon name="chatbox-ellipses-outline" size={scale(16)} color={C.muted} style={{ marginBottom: scale(8) }} />
            <Text style={st.message}>{notification.body}</Text>
          </View>
        </View>

        {/* Meta Info Card */}
        <View style={st.metaCard}>
          <View style={st.metaRow}>
            <View style={st.metaIconBg}>
              <Icon name="time-outline" size={scale(14)} color={C.primary} />
            </View>
            <View>
              <Text style={st.metaLabel}>Received</Text>
              <Text style={st.metaValue}>
                {new Date(notification.ts).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            </View>
          </View>
          <View style={st.metaDivider} />
          <View style={st.metaRow}>
            <View style={st.metaIconBg}>
              <Icon name="pricetag-outline" size={scale(14)} color={C.primary} />
            </View>
            <View>
              <Text style={st.metaLabel}>Category</Text>
              <Text style={st.metaValue}>{typeConfig.label}</Text>
            </View>
          </View>
          {notification.meta?.notificationId && (
            <>
              <View style={st.metaDivider} />
              <View style={st.metaRow}>
                <View style={st.metaIconBg}>
                  <Icon name="finger-print-outline" size={scale(14)} color={C.primary} />
                </View>
                <View>
                  <Text style={st.metaLabel}>Reference ID</Text>
                  <Text style={[st.metaValue, { fontFamily: 'monospace', fontSize: moderateScale(12) }]}>
                    #{String(notification.meta.notificationId).slice(0, 12)}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
      </ScrollView>

      {/* Action Button */}
      {actionButton && (
        <View style={[st.bottomBar, { paddingBottom: insets.bottom + scale(16) }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(actionButton.screen, actionButton.params)}
          >
            <LinearGradient colors={[C.primary, C.primaryDark]} style={st.actionBtn}>
              <Icon name={actionButton.icon} size={scale(18)} color="#fff" />
              <Text style={st.actionBtnText}>{actionButton.label}</Text>
              <Icon name="arrow-forward" size={scale(18)} color="#fff" />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  headerGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  hBtn: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: {
    color: '#fff',
    fontSize: moderateScale(20),
    fontWeight: '900',
  },

  emptyIcon: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '900',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
  },

  iconContainer: {
    alignItems: 'center',
    marginTop: scale(20),
    marginBottom: scale(20),
  },
  iconCircle: {
    width: scale(88),
    height: scale(88),
    borderRadius: scale(44),
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.15,
    shadowRadius: scale(12),
    elevation: 8,
  },

  typeLabelRow: {
    alignItems: 'center',
    marginBottom: scale(16),
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    paddingHorizontal: scale(14),
    paddingVertical: scale(7),
    borderRadius: scale(999),
  },
  typeBadgeText: {
    fontWeight: '800',
    fontSize: moderateScale(13),
  },

  title: {
    color: C.ink,
    fontSize: moderateScale(22),
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: scale(20),
    lineHeight: moderateScale(30),
  },

  messageCard: {
    backgroundColor: C.card,
    borderRadius: scale(18),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    overflow: 'hidden',
    marginBottom: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },
  messageAccent: {
    height: scale(4),
  },
  messageInner: {
    padding: scale(20),
    alignItems: 'center',
  },
  message: {
    color: C.text,
    fontSize: moderateScale(15),
    lineHeight: moderateScale(24),
    textAlign: 'center',
  },

  metaCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: scale(16),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.04,
    shadowRadius: scale(8),
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    paddingVertical: scale(4),
  },
  metaIconBg: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(10),
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    marginBottom: 1,
  },
  metaValue: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: scale(10),
    marginLeft: scale(44),
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: scale(16),
    paddingTop: scale(12),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(-3) },
    shadowOpacity: 0.06,
    shadowRadius: scale(8),
    elevation: 5,
  },
  actionBtn: {
    borderRadius: scale(14),
    paddingVertical: scale(15),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(10),
  },
  actionBtnText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '900',
  },
});
