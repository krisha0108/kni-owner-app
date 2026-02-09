// screens/NotificationDetail.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

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

const TMAP = {
  ticket_seen:         { ic: 'eye',              gradient: ['#0EA5E9', '#0369A1'], label: 'Ticket Update' },
  ticket_onwork:       { ic: 'construct',         gradient: ['#818CF8', '#4F46E5'], label: 'Ticket In Progress' },
  restaurant_approved: { ic: 'checkmark-circle',  gradient: ['#34D399', '#10B981'], label: 'Restaurant Approved' },
  restaurant_rejected: { ic: 'close-circle',      gradient: ['#F87171', '#EF4444'], label: 'Restaurant Rejected' },
  eq_request_approved: { ic: 'cube-outline',      gradient: ['#2DD4BF', '#14B8A6'], label: 'Request Approved' },
  engineer_assigned:   { ic: 'people-outline',    gradient: ['#FBBF24', '#F59E0B'], label: 'Engineer Assigned' },
  feature:             { ic: 'sparkles-outline',  gradient: ['#A78BFA', '#7C3AED'], label: 'New Feature' },
  update:              { ic: 'download-outline',  gradient: ['#60A5FA', '#3B82F6'], label: 'App Update' },
  order_accepted:      { ic: 'checkmark-circle',  gradient: ['#34D399', '#10B981'], label: 'Order Accepted' },
  order_in_progress:   { ic: 'construct',         gradient: ['#818CF8', '#4F46E5'], label: 'Order In Progress' },
  order_completed:     { ic: 'checkmark-done',    gradient: ['#34D399', '#059669'], label: 'Order Completed' },
  order_update:        { ic: 'cube-outline',      gradient: ['#2DD4BF', '#14B8A6'], label: 'Order Update' },
  completion_approval_required: { ic: 'alert-circle', gradient: ['#FBBF24', '#D97706'], label: 'Approval Required' },
  pending_approval:    { ic: 'hourglass-outline', gradient: ['#FBBF24', '#D97706'], label: 'Pending Approval' },
  approval_required:   { ic: 'alert-circle',      gradient: ['#FBBF24', '#D97706'], label: 'Approval Required' },
  work_completed:      { ic: 'checkmark-done',    gradient: ['#FBBF24', '#D97706'], label: 'Work Completed' },
};

const DEFAULT_TYPE = { ic: 'notifications-outline', gradient: ['#94A3B8', '#64748B'], label: 'Notification' };

export default function NotificationDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const notification = route?.params?.notification;

  if (!notification) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.headerGrad}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
            <Icon name="chevron-back" size={20} color="#fff" />
          </TouchableOpacity>
          <Text style={st.hTitle}>Notification</Text>
          <View style={{ width: 38 }} />
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 }}>
          <LinearGradient colors={['#FEE2E2', '#FECACA']} style={st.emptyIcon}>
            <Icon name="alert-circle-outline" size={40} color={C.primary} />
          </LinearGradient>
          <Text style={st.emptyTitle}>Notification Not Found</Text>
          <Text style={st.emptyText}>This notification may have been removed or is no longer available.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = TMAP[notification.type] || DEFAULT_TYPE;

  const getActionButton = () => {
    if (notification.type?.startsWith('ticket')) {
      return { label: 'View Ticket', icon: 'chatbubbles', screen: 'SupportCenter', params: { id: notification.meta?.ticketId } };
    }
    if (notification.type?.startsWith('restaurant')) {
      return { label: 'View Restaurants', icon: 'storefront', screen: 'Restaurants', params: {} };
    }
    return null;
  };

  const actionButton = getActionButton();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Gradient Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={st.headerGrad}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
          <Icon name="chevron-back" size={20} color="#fff" />
        </TouchableOpacity>
        <Text style={st.hTitle}>Notification</Text>
        <View style={{ width: 38 }} />
      </LinearGradient>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (actionButton ? 100 : 24) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Gradient Icon */}
        <View style={st.iconContainer}>
          <LinearGradient colors={typeConfig.gradient} style={st.iconCircle}>
            <Icon name={typeConfig.ic} size={36} color="#fff" />
          </LinearGradient>
        </View>

        {/* Type Badge */}
        <View style={st.typeLabelRow}>
          <LinearGradient
            colors={[typeConfig.gradient[0] + '25', typeConfig.gradient[1] + '15']}
            style={st.typeBadge}
          >
            <Icon name={typeConfig.ic} size={13} color={typeConfig.gradient[1]} />
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
            <Icon name="chatbox-ellipses-outline" size={16} color={C.muted} style={{ marginBottom: 8 }} />
            <Text style={st.message}>{notification.body}</Text>
          </View>
        </View>

        {/* Meta Info Card */}
        <View style={st.metaCard}>
          <View style={st.metaRow}>
            <View style={st.metaIconBg}>
              <Icon name="time-outline" size={14} color={C.primary} />
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
              <Icon name="pricetag-outline" size={14} color={C.primary} />
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
                  <Icon name="finger-print-outline" size={14} color={C.primary} />
                </View>
                <View>
                  <Text style={st.metaLabel}>Reference ID</Text>
                  <Text style={[st.metaValue, { fontFamily: 'monospace', fontSize: 12 }]}>
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
        <View style={[st.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => navigation.navigate(actionButton.screen, actionButton.params)}
          >
            <LinearGradient colors={[C.primary, C.primaryDark]} style={st.actionBtn}>
              <Icon name={actionButton.icon} size={18} color="#fff" />
              <Text style={st.actionBtnText}>{actionButton.label}</Text>
              <Icon name="arrow-forward" size={18} color="#fff" />
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
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  hBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  hTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '900',
  },

  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: C.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
  },

  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },

  typeLabelRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  typeBadgeText: {
    fontWeight: '800',
    fontSize: 13,
  },

  title: {
    color: C.ink,
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 30,
  },

  messageCard: {
    backgroundColor: C.card,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  messageAccent: {
    height: 4,
  },
  messageInner: {
    padding: 20,
    alignItems: 'center',
  },
  message: {
    color: C.text,
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center',
  },

  metaCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 4,
  },
  metaIconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metaLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 1,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
  },
  metaDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
    marginLeft: 44,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 16,
    paddingTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 5,
  },
  actionBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '900',
  },
});
