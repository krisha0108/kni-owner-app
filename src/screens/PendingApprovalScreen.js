// src/screens/PendingApprovalScreen.js
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
  warning: '#F59E0B',
  error: '#DC2626',
};

export default function PendingApprovalScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const status = route?.params?.status || 'pending';
  const rejectionReason = route?.params?.rejectionReason;

  const isPending = status === 'pending';
  const isRejected = status === 'rejected';

  const handleLogout = async () => {
    try {
      await AsyncStorage.multiRemove(['userToken', 'user', 'ownerId', 'authProvider']);
    } catch (e) {
      console.log('Logout error:', e);
    }
    navigation.replace('RestaurantLogin');
  };

  const handleRetry = () => {
    navigation.replace('RestaurantLogin');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <LinearGradient
        colors={isPending ? ['#FFF3CD', '#FFE69C', '#F59E0B'] : ['#FFEEEE', '#FFD6D6', '#DC2626']}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.header, { paddingTop: insets.top + 12 }]}
      />

      <View style={styles.cardWrap}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Icon
              name={isPending ? 'time-outline' : 'close-circle-outline'}
              size={80}
              color={isPending ? C.warning : C.error}
            />
          </View>

          <Text style={styles.title}>
            {isPending ? 'Account Pending Approval' : 'Account Rejected'}
          </Text>

          <Text style={styles.message}>
            {isPending
              ? 'Thank you for registering! Your account is currently being reviewed by our admin team. You will be notified once your account is approved.'
              : 'Unfortunately, your account registration has been rejected by our admin team.'}
          </Text>

          {isRejected && rejectionReason && (
            <View style={styles.reasonBox}>
              <Text style={styles.reasonLabel}>Reason:</Text>
              <Text style={styles.reasonText}>{rejectionReason}</Text>
            </View>
          )}

          {isPending && (
            <View style={styles.infoBox}>
              <Icon name="information-circle-outline" size={20} color={C.warning} />
              <Text style={styles.infoText}>
                Please ensure you have uploaded your FSSAI certificate to speed up the approval process.
              </Text>
            </View>
          )}

          <TouchableOpacity style={styles.primaryBtn} onPress={handleRetry}>
            <Text style={styles.primaryTxt}>Try Again</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.secondaryBtn} onPress={handleLogout}>
            <Icon name="log-out-outline" size={18} color={C.muted} />
            <Text style={styles.secondaryTxt}>Use Different Account</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <Text style={styles.footerText}>
          Need help? Contact our support team.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    height: 120,
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
  },
  cardWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: -20,
    paddingHorizontal: 20,
  },
  card: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.95)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    padding: 24,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 6,
    alignItems: 'center',
  },
  iconWrap: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  reasonBox: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#991B1B',
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 14,
    color: '#DC2626',
    lineHeight: 20,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#92400E',
    marginLeft: 10,
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#EF3A3A',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 40,
    alignItems: 'center',
    marginTop: 8,
    width: '100%',
    shadowColor: '#EF3A3A',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  primaryTxt: {
    color: '#fff',
    fontWeight: '900',
    fontSize: 16,
    letterSpacing: 0.2,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 10,
  },
  secondaryTxt: {
    color: '#6B7280',
    fontWeight: '700',
    marginLeft: 6,
  },
  footer: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  footerText: {
    color: '#94A3B8',
    textAlign: 'center',
  },
});
