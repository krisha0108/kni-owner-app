// screens/NotificationDetail.js
import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A', ink: '#1D2254', text: '#0F172A', muted: '#6B7280', bg: '#F5F7FA',
  card: '#FFFFFF', border: '#E5E7EB'
};
const R = 18;

/* ---------- TYPE → UI MAP ---------- */
const TMAP = {
  ticket_seen:            { ic: 'eye',               bg: '#E0F2FE', fg: '#0369A1', label: 'Ticket Update' },
  ticket_onwork:          { ic: 'construct',         bg: '#EEF2FF', fg: '#4F46E5', label: 'Ticket In Progress' },
  restaurant_approved:    { ic: 'checkmark-circle',  bg: '#ECFDF5', fg: '#10B981', label: 'Restaurant Approved' },
  restaurant_rejected:    { ic: 'close-circle',      bg: '#FEF2F2', fg: '#EF4444', label: 'Restaurant Rejected' },
  feature:                { ic: 'sparkles-outline',  bg: '#F5F3FF', fg: '#7C3AED', label: 'New Feature' },
  update:                 { ic: 'download-outline',  bg: '#EFF6FF', fg: '#3B82F6', label: 'App Update' },
};

/* ---------- MAIN COMPONENT ---------- */
export default function NotificationDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const notification = route?.params?.notification;

  if (!notification) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <View style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
            <Icon name="chevron-back" size={20} color={C.ink} />
          </TouchableOpacity>
          <Text style={st.hTitle}>Notification</Text>
          <View style={st.hBtn} />
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Icon name="alert-circle-outline" size={48} color={C.muted} />
          <Text style={{ color: C.muted, marginTop: 12 }}>Notification not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const typeConfig = TMAP[notification.type] || { ic: 'notifications-outline', bg: '#F3F4F6', fg: C.ink, label: 'Notification' };

  // Check if notification type has a related screen to navigate to
  const getActionButton = () => {
    if (notification.type.startsWith('ticket')) {
      return { label: 'View Ticket', screen: 'SupportCenter', params: { id: notification.meta?.ticketId } };
    }
    if (notification.type.startsWith('restaurant')) {
      return { label: 'View Restaurants', screen: 'Restaurants', params: {} };
    }
    return null;
  };

  const actionButton = getActionButton();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
          <Icon name="chevron-back" size={20} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.hTitle}>Notification</Text>
        <View style={st.hBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 16, paddingBottom: insets.bottom + (actionButton ? 100 : 20) }}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon */}
        <View style={st.iconContainer}>
          <View style={[st.iconCircle, { backgroundColor: typeConfig.bg }]}>
            <Icon name={typeConfig.ic} size={40} color={typeConfig.fg} />
          </View>
        </View>

        {/* Type Label */}
        <View style={st.typeLabelRow}>
          <View style={[st.typeBadge, { backgroundColor: typeConfig.bg }]}>
            <Text style={[st.typeBadgeText, { color: typeConfig.fg }]}>{typeConfig.label}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={st.title}>{notification.title}</Text>

        {/* Message Card */}
        <View style={st.messageCard}>
          <Text style={st.message}>{notification.body}</Text>
        </View>

        {/* Timestamp */}
        <View style={st.timestampRow}>
          <Icon name="time-outline" size={14} color={C.muted} />
          <Text style={st.timestamp}>
            {new Date(notification.ts).toLocaleString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </Text>
        </View>
      </ScrollView>

      {/* Action Button */}
      {actionButton && (
        <View style={[st.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <TouchableOpacity
            style={st.actionBtn}
            onPress={() => navigation.navigate(actionButton.screen, actionButton.params)}
            activeOpacity={0.8}
          >
            <Text style={st.actionBtnText}>{actionButton.label}</Text>
            <Icon name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header: {
    paddingHorizontal: 16,
    paddingBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  hBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  hTitle: {
    color: '#1D2254',
    fontSize: 22,
    fontWeight: '900'
  },

  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 16
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center'
  },

  typeLabelRow: {
    alignItems: 'center',
    marginBottom: 16
  },
  typeBadge: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 999
  },
  typeBadgeText: {
    fontWeight: '700',
    fontSize: 13
  },

  title: {
    color: '#0F172A',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 16
  },

  messageCard: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 16,
    marginBottom: 16
  },
  message: {
    color: '#0F172A',
    fontSize: 15,
    lineHeight: 24,
    textAlign: 'center'
  },

  timestampRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  timestamp: {
    color: '#6B7280',
    fontSize: 13
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#EEF2F7',
    paddingHorizontal: 16,
    paddingTop: 12
  },
  actionBtn: {
    backgroundColor: '#EF3A3A',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800'
  }
});
