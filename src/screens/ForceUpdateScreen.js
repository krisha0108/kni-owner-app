import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking, StatusBar, BackHandler } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale } from '../utils/responsive';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  ink: '#1D2254',
  muted: '#6B7280',
  bg: '#F5F7FA',
};

// Rendered at the App.js root, outside the normal navigation tree, when the
// Admin Panel -> App Version "kill switch" blocks this installed version.
// When `dismissible` is false there is deliberately no way out of this
// screen other than updating - no back button, no close icon.
export default function ForceUpdateScreen({ message, storeUrl, latestVersionName, dismissible, onDismiss }) {
  useEffect(() => {
    if (dismissible) return undefined;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [dismissible]);

  const handleUpdate = () => {
    Linking.openURL(storeUrl).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
      <View style={styles.content}>
        <LinearGradient colors={[C.primary, C.primaryDark]} style={styles.iconCircle}>
          <Icon name="cloud-download-outline" size={scale(44)} color="#fff" />
        </LinearGradient>

        <Text style={styles.title}>Please Update Your App</Text>
        {!!latestVersionName && (
          <Text style={styles.versionText}>New version {latestVersionName} is available</Text>
        )}
        <Text style={styles.message}>{message}</Text>

        <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
          <Icon name="arrow-up-circle" size={scale(18)} color="#fff" />
          <Text style={styles.updateBtnText}>Update Now</Text>
        </TouchableOpacity>

        {dismissible && (
          <TouchableOpacity style={styles.laterBtn} onPress={onDismiss}>
            <Text style={styles.laterBtnText}>Maybe Later</Text>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(32),
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
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
    marginBottom: scale(8),
  },
  versionText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.primary,
    marginBottom: scale(12),
  },
  message: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(21),
    marginBottom: scale(32),
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: C.primary,
    paddingHorizontal: scale(32),
    paddingVertical: scale(14),
    borderRadius: scale(28),
  },
  updateBtnText: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#fff',
  },
  laterBtn: {
    marginTop: scale(16),
    padding: scale(8),
  },
  laterBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
    textDecorationLine: 'underline',
  },
});
