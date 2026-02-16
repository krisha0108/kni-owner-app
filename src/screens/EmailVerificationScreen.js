import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A',
  ink: '#1A1A1A',
  text: '#333',
  muted: '#666',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  border: '#E0E0E0',
  ok: '#10B981',
  danger: '#EF4444',
};

export default function EmailVerificationScreen({ route, navigation }) {
  const email = route?.params?.email || '';
  const userName = route?.params?.userName || '';
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Focus first input on mount
  useEffect(() => {
    setTimeout(() => inputRefs.current[0]?.focus(), 300);
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (index, key) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      return Alert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/verify-email', {
        email,
        code: fullCode,
      });

      if (response.data?.ok) {
        const { user, token, restaurants, hasApprovedRestaurant } = response.data.data;

        // Save session
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          api.defaults.headers.common.Authorization = `Bearer ${token}`;
        }
        if (user) {
          await AsyncStorage.setItem('user', JSON.stringify(user));
          if (user.id) await AsyncStorage.setItem('ownerId', String(user.id));
        }

        // Register FCM token
        try {
          await notificationService.registerTokenAfterLogin();
        } catch (fcmErr) {
          console.log('FCM registration error (ignored):', fcmErr?.message);
        }

        // Save restaurants if available
        if (restaurants && restaurants.length > 0) {
          await AsyncStorage.setItem('restaurants', JSON.stringify(restaurants));
          await AsyncStorage.setItem('selectedRestaurant', JSON.stringify(restaurants[0]));
        }

        Alert.alert('Email Verified!', 'Your email has been verified successfully.', [
          {
            text: 'Continue',
            onPress: () => {
              if (hasApprovedRestaurant) {
                navigation.replace('Home');
              } else if (restaurants && restaurants.length > 0) {
                navigation.replace('PendingApproval');
              } else {
                navigation.replace('RestaurantOnboarding');
              }
            },
          },
        ]);
      } else {
        Alert.alert('Verification Failed', response.data?.error || 'Invalid code. Please try again.');
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || error.message || 'Verification failed.';
      Alert.alert('Error', errorMsg);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0) return;
    setResending(true);
    try {
      const response = await api.post('/auth/send-email-code', {
        email,
        purpose: 'EMAIL_VERIFICATION',
      });

      if (response.data?.ok) {
        Alert.alert('Code Sent', 'A new verification code has been sent to your email.');
        setCooldown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to resend code.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to resend code. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="mail-outline" size={scale(40)} color={C.primary} />
          </View>
        </View>

        <Text style={styles.title}>Verify Your Email</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}
          <Text style={styles.emailText}>{email}</Text>
        </Text>

        {/* 6 digit code input */}
        <View style={styles.codeContainer}>
          {code.map((digit, index) => (
            <TextInput
              key={index}
              ref={ref => (inputRefs.current[index] = ref)}
              style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
              value={digit}
              onChangeText={value => handleChange(index, value)}
              onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              textAlign="center"
              selectTextOnFocus
            />
          ))}
        </View>

        {/* Verify Button */}
        <TouchableOpacity
          style={[styles.verifyButton, loading && styles.buttonDisabled]}
          onPress={handleVerify}
          disabled={loading || code.join('').length !== 6}
        >
          {loading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.verifyButtonText}>Verify Email</Text>
          )}
        </TouchableOpacity>

        {/* Resend */}
        <View style={styles.resendContainer}>
          <Text style={styles.resendLabel}>Didn't receive the code? </Text>
          <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || resending}>
            <Text style={[styles.resendLink, cooldown > 0 && styles.resendDisabled]}>
              {cooldown > 0
                ? `Resend in ${cooldown}s`
                : resending
                ? 'Sending...'
                : 'Resend Code'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('RestaurantLogin')}
        >
          <Icon name="arrow-back" size={scale(16)} color={C.muted} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingVertical: scale(60),
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: scale(24),
  },
  iconCircle: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: `${C.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(28),
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: scale(12),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(15),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(22),
    marginBottom: scale(32),
  },
  emailText: {
    fontWeight: '600',
    color: C.ink,
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
    marginBottom: scale(32),
  },
  codeInput: {
    width: scale(48),
    height: scale(56),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: C.ink,
  },
  codeInputFilled: {
    borderColor: C.primary,
    backgroundColor: `${C.primary}08`,
  },
  verifyButton: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    height: scale(56),
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  verifyButtonText: {
    color: '#FFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(24),
  },
  resendLabel: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  resendLink: {
    fontSize: moderateScale(14),
    color: C.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: C.muted,
    fontWeight: '400',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(32),
    gap: scale(6),
  },
  backText: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
});
