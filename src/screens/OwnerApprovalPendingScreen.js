import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';

import { scale, moderateScale } from '../utils/responsive';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
  ink: '#1D2254',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  warnBg: '#FEF3C7',
  warnText: '#D97706',
};

// Shown right after registration/email-verification for owners whose account
// is not yet approved by an admin. No auth token exists at this point, so this
// screen must be reachable without a session (see AppNavigator).
export default function OwnerApprovalPendingScreen({ navigation, route }) {
  const rejected = route?.params?.rejected === true;
  const rejectionReason = route?.params?.rejectionReason || null;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <View style={styles.content}>
        <LinearGradient
          colors={rejected ? ['#FEE2E2', '#FECACA'] : ['#FEF3C7', '#FDE68A']}
          style={styles.iconCircle}
        >
          <Icon
            name={rejected ? 'close-circle' : 'time'}
            size={scale(48)}
            color={rejected ? '#DC2626' : C.warnText}
          />
        </LinearGradient>

        <Text style={styles.title}>
          {rejected ? 'Registration Rejected' : 'Registration Pending Approval'}
        </Text>

        <Text style={styles.message}>
          {rejected
            ? 'Your owner registration was rejected. Please contact support for more information.'
            : "Your account has been created and is waiting for admin approval. You'll be notified as soon as it's reviewed — you can't log in or add a restaurant until then."}
        </Text>

        {rejected && rejectionReason ? (
          <View style={styles.reasonBox}>
            <Text style={styles.reasonLabel}>Reason</Text>
            <Text style={styles.reasonText}>{rejectionReason}</Text>
          </View>
        ) : null}

        <TouchableOpacity
          style={styles.primaryBtn}
          activeOpacity={0.85}
          onPress={() => navigation.reset({ index: 0, routes: [{ name: 'RestaurantLogin' }] })}
        >
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.primaryGrad}
          >
            <Text style={styles.primaryText}>Back to Login</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => navigation.navigate('SupportCenter')}
        >
          <Icon name="chatbubbles-outline" size={scale(16)} color={C.muted} />
          <Text style={styles.secondaryText}>Contact Support</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(28),
  },
  iconCircle: {
    width: scale(96),
    height: scale(96),
    borderRadius: scale(48),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(24),
  },
  title: {
    fontSize: moderateScale(21),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: scale(10),
  },
  message: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(21),
    marginBottom: scale(20),
  },
  reasonBox: {
    width: '100%',
    backgroundColor: '#FEE2E2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: scale(12),
    padding: scale(14),
    marginBottom: scale(24),
  },
  reasonLabel: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#DC2626',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: scale(4),
  },
  reasonText: {
    fontSize: moderateScale(13.5),
    color: '#991B1B',
    lineHeight: moderateScale(19),
  },
  primaryBtn: {
    width: '100%',
    borderRadius: scale(14),
    overflow: 'hidden',
    marginTop: scale(8),
  },
  primaryGrad: {
    paddingVertical: scale(15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#fff',
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(18),
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  secondaryText: {
    fontSize: moderateScale(13.5),
    fontWeight: '600',
    color: C.muted,
  },
});
