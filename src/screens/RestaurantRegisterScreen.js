// src/screens/RestaurantRegisterScreen.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, ActivityIndicator, StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import AppAlert from '../utils/AppAlert';

import { scale, moderateScale } from '../utils/responsive';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
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
};

export default function RestaurantRegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [secureText, setSecureText] = useState(true);
  const [secureConfirmText, setSecureConfirmText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [passwordErrors, setPasswordErrors] = useState([]);
  const { keyboardCompensation: keyboardHeight } = useKeyboardCompensation();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '896374925078-c3gdr6hi301pnth64vj5t6jqlmhjotom.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  // Password validation (matching web)
  const validatePassword = (password) => {
    const errors = [];
    if (password.length < 8) {
      errors.push('At least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('One uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      errors.push('One lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('One number');
    }
    return errors;
  };

  const saveSessionAndFcm = async (token, user, provider = 'password') => {
    try {
      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (api && api.defaults) api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }

      if (user) {
        await AsyncStorage.setItem('user', JSON.stringify(user));
        if (user?.id) await AsyncStorage.setItem('ownerId', String(user.id));
      }

      await AsyncStorage.setItem('authProvider', provider);

      // FCM token registration
      try {
        const fcmToken = await messaging().getToken();
        if (fcmToken && user?.id) {
          await api.post('/owners/save-fcm-token', {
            restaurant_owner_id: user.id,
            fcm_token: fcmToken,
          }).catch(e => console.log('FCM save error (ignored):', e?.message || e));
        }
      } catch (fcmErr) {
        console.log('FCM fetch error (ignored):', fcmErr?.message || fcmErr);
      }
    } catch (err) {
      console.log('saveSessionAndFcm error:', err?.message || err);
      throw err;
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));

    // Real-time password validation
    if (field === 'password') {
      const errors = validatePassword(value);
      setPasswordErrors(errors);
    }
  };

  const validateForm = () => {
    const { name, email, password, confirmPassword } = form;

    if (!name || name.trim().length < 2) {
      AppAlert.alert('Validation Error', 'Name must be at least 2 characters');
      return false;
    }

    if (!email || !email.includes('@')) {
      AppAlert.alert('Validation Error', 'Please enter a valid email address');
      return false;
    }

    const passwordValidationErrors = validatePassword(password);
    if (passwordValidationErrors.length > 0) {
      AppAlert.alert(
        'Password Requirements',
        'Password must have:\n' + passwordValidationErrors.map(e => `• ${e}`).join('\n')
      );
      return false;
    }

    if (password !== confirmPassword) {
      AppAlert.alert('Validation Error', 'Passwords do not match');
      return false;
    }

    return true;
  };

  const handleRegister = async () => {
    if (!validateForm()) return;

    const { name, email, phone, password, confirmPassword } = form;

    setLoading(true);
    try {
      // Call web-compatible API endpoint
      const res = await api.post('/auth/register-owner', {
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone || '',
        password,
        confirmPassword,
      });

      if (res.data?.ok) {
        const user = res.data?.data?.user;
        const requiresVerification = res.data?.data?.requiresVerification;

        if (requiresVerification) {
          // Redirect to email verification screen
          AppAlert.alert(
            'Verify Your Email',
            'A verification code has been sent to your email address.',
            [
              {
                text: 'Verify Now',
                onPress: () =>
                  navigation.replace('EmailVerification', {
                    email: email.trim().toLowerCase(),
                    userName: form.name.trim(),
                  }),
              },
            ]
          );
        } else {
          // Fallback: if no verification needed (shouldn't happen for new owners)
          const token = res.data?.data?.token;
          await saveSessionAndFcm(token, user, 'password');
          AppAlert.alert(
            'Welcome to KNI Super App!',
            'Registration successful. Let\'s set up your restaurant.',
            [
              {
                text: 'Continue',
                onPress: () => navigation.replace('RestaurantOnboarding'),
              },
            ]
          );
        }
      } else {
        AppAlert.alert('Registration Failed', res.data?.error || 'Please try again.');
      }
    } catch (err) {
      console.log('Register error:', err?.response?.data || err.message);
      const errorMessage = err?.response?.data?.error ||
                          err?.response?.data?.message ||
                          'Something went wrong. Please try again.';
      AppAlert.alert('Registration Failed', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      // Clear any existing sessions
      try { if (auth().currentUser) await auth().signOut(); } catch(_) {}
      try { await GoogleSignin.signOut(); } catch(_) {}
      try { await GoogleSignin.revokeAccess(); } catch(_) {}

      const userInfo = await GoogleSignin.signIn();
      let tokens = await GoogleSignin.getTokens().catch(() => null);
      const googleIdToken = (userInfo?.idToken) || (tokens?.idToken);
      const googleAccessToken = tokens?.accessToken || userInfo?.accessToken;

      if (!googleIdToken && !googleAccessToken) {
        throw new Error('Google Sign-In did not return tokens');
      }

      const credential = auth.GoogleAuthProvider.credential(
        googleIdToken || null,
        googleAccessToken || null
      );
      const firebaseUserCredential = await auth().signInWithCredential(credential);
      const firebaseIdToken = await firebaseUserCredential.user.getIdToken(true);

      // Call Firebase auth endpoint
      const res = await api.post('/owner/auth/firebase', { idToken: firebaseIdToken });

      if (!res.data?.status || !res.data?.token) {
        throw new Error(res.data?.message || 'Server did not return token');
      }

      const appToken = res.data.token;
      const owner = res.data.owner || res.data.data;
      await saveSessionAndFcm(appToken, owner, 'google');

      // Check if user needs to complete restaurant onboarding
      if (!res.data?.hasRestaurant) {
        AppAlert.alert(
          'Welcome!',
          'Let\'s set up your restaurant.',
          [
            {
              text: 'Continue',
              onPress: () => navigation.replace('RestaurantOnboarding'),
            },
          ]
        );
      } else {
        navigation.replace('Home');
      }
    } catch (e) {
      console.log('[Google register error]', e?.message || e);
      AppAlert.alert(
        'Google Sign-In Failed',
        e?.message?.includes('token')
          ? 'Could not retrieve authentication token. Please check your Firebase configuration.'
          : (e?.response?.data?.message || e?.message || 'Please try again.')
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* Hero */}
      <LinearGradient
        colors={['#EF3A3A', '#D42E2E', '#1D2254']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.hero}
      >
        <View style={styles.logoCircle}>
          <Image
            source={require('../assets/images/kni-icon.png')}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>
        <Text style={styles.heroTitle}>Create Owner Account</Text>
        <Text style={styles.heroSubtitle}>Manage your restaurants with ease</Text>
      </LinearGradient>

      {/* Sheet */}
      <View style={styles.sheetWrap}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: scale(24), paddingTop: scale(16), paddingBottom: scale(40) + keyboardHeight }} keyboardShouldPersistTaps="handled">
      <View style={styles.dragHandle} />

      {/* Google Sign-In */}
      <TouchableOpacity
        style={[styles.googleBtn, { opacity: googleLoading ? 0.7 : 1 }]}
        onPress={handleGoogle}
        disabled={googleLoading || loading}
      >
        <View style={styles.googleIcon}>
          {googleLoading ? (
            <ActivityIndicator size="small" />
          ) : (
            <Icon name="logo-google" size={scale(18)} color="#4285F4" />
          )}
        </View>
        <Text style={styles.googleTxt}>Continue with Google</Text>
      </TouchableOpacity>

      {/* Divider */}
      <Text style={styles.dividerPlainText}>or register with email</Text>

      {/* Name Field */}
      <View style={styles.inputWrapper}>
        <Icon name="person-outline" size={scale(20)} color={C.muted} style={styles.icon} />
        <TextInput
          placeholder="Full Name"
          style={styles.input}
          value={form.name}
          placeholderTextColor={C.muted}
          onChangeText={text => handleChange('name', text)}
          autoCapitalize="words"
        />
      </View>

      {/* Email Field */}
      <View style={styles.inputWrapper}>
        <Icon name="mail-outline" size={scale(20)} color={C.muted} style={styles.icon} />
        <TextInput
          placeholder="Email Address"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          placeholderTextColor={C.muted}
          onChangeText={text => handleChange('email', text)}
        />
      </View>

      {/* Phone Field (Optional) */}
      <View style={styles.inputWrapper}>
        <Icon name="call-outline" size={scale(20)} color={C.muted} style={styles.icon} />
        <TextInput
          placeholder="Phone Number (optional)"
          style={styles.input}
          keyboardType="phone-pad"
          value={form.phone}
          placeholderTextColor={C.muted}
          onChangeText={text => handleChange('phone', text)}
        />
      </View>

      {/* Password Field */}
      <View style={styles.inputWrapper}>
        <Icon name="lock-closed-outline" size={scale(20)} color={C.muted} style={styles.icon} />
        <TextInput
          placeholder="Password"
          style={styles.input}
          secureTextEntry={secureText}
          value={form.password}
          placeholderTextColor={C.muted}
          onChangeText={text => handleChange('password', text)}
          autoCapitalize="none"
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
          <Icon
            name={secureText ? 'eye-off-outline' : 'eye-outline'}
            size={scale(20)}
            color={C.muted}
          />
        </TouchableOpacity>
      </View>

      {/* Password Requirements */}
      {form.password && passwordErrors.length > 0 && (
        <View style={styles.passwordHints}>
          <Text style={styles.hintTitle}>Password must have:</Text>
          {passwordErrors.map((error, index) => (
            <View key={index} style={styles.hintRow}>
              <Icon name="close-circle" size={scale(14)} color={C.danger} />
              <Text style={styles.hintText}>{error}</Text>
            </View>
          ))}
        </View>
      )}

      {form.password && passwordErrors.length === 0 && (
        <View style={[styles.passwordHints, { backgroundColor: '#ECFDF5' }]}>
          <View style={styles.hintRow}>
            <Icon name="checkmark-circle" size={scale(14)} color={C.ok} />
            <Text style={[styles.hintText, { color: C.ok }]}>Password meets all requirements</Text>
          </View>
        </View>
      )}

      {/* Confirm Password Field */}
      <View style={styles.inputWrapper}>
        <Icon name="lock-closed-outline" size={scale(20)} color={C.muted} style={styles.icon} />
        <TextInput
          placeholder="Confirm Password"
          style={styles.input}
          secureTextEntry={secureConfirmText}
          value={form.confirmPassword}
          placeholderTextColor={C.muted}
          onChangeText={text => handleChange('confirmPassword', text)}
          autoCapitalize="none"
        />
        <TouchableOpacity
          onPress={() => setSecureConfirmText(!secureConfirmText)}
          style={styles.eyeIcon}
        >
          <Icon
            name={secureConfirmText ? 'eye-off-outline' : 'eye-outline'}
            size={scale(20)}
            color={C.muted}
          />
        </TouchableOpacity>
      </View>

      {/* Password Match Indicator */}
      {form.confirmPassword && form.password && (
        <View style={[
          styles.passwordHints,
          { backgroundColor: form.password === form.confirmPassword ? '#ECFDF5' : '#FEF2F2' }
        ]}>
          <View style={styles.hintRow}>
            <Icon
              name={form.password === form.confirmPassword ? 'checkmark-circle' : 'close-circle'}
              size={scale(14)}
              color={form.password === form.confirmPassword ? C.ok : C.danger}
            />
            <Text style={[
              styles.hintText,
              { color: form.password === form.confirmPassword ? C.ok : C.danger }
            ]}>
              {form.password === form.confirmPassword ? 'Passwords match' : 'Passwords do not match'}
            </Text>
          </View>
        </View>
      )}

      {/* Register Button */}
      <TouchableOpacity
        style={[styles.registerButton, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleRegister}
        disabled={loading || googleLoading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.registerText}>Create Account</Text>
        )}
      </TouchableOpacity>

      {/* Footer */}
      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text
          style={{ color: C.primary, fontWeight: '600' }}
          onPress={() => navigation.navigate('RestaurantLogin')}
        >
          Sign In
        </Text>
      </Text>
      </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  hero: {
    paddingTop: scale(50),
    paddingBottom: scale(26),
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: scale(30),
    borderBottomRightRadius: scale(30),
  },
  logoCircle: {
    width: scale(56),
    height: scale(56),
    borderRadius: scale(28),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(10),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(5) },
    shadowOpacity: 0.2,
    shadowRadius: scale(10),
    elevation: 6,
  },
  logo: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
  },
  heroTitle: {
    fontSize: moderateScale(19),
    fontWeight: '800',
    color: '#FFF',
  },
  heroSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.85)',
    marginTop: scale(3),
  },
  sheetWrap: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: scale(-18),
    borderTopLeftRadius: scale(26),
    borderTopRightRadius: scale(26),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(-4) },
    shadowOpacity: 0.05,
    shadowRadius: scale(12),
    elevation: 6,
  },
  dragHandle: {
    width: scale(36),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#E6E6E6',
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(12),
  },
  dividerPlainText: {
    textAlign: 'center',
    fontSize: moderateScale(11.5),
    color: '#AAA',
    marginVertical: scale(10),
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.card,
    borderRadius: scale(13),
    borderWidth: 1,
    borderColor: '#EEE',
    paddingVertical: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: scale(2),
    elevation: 1,
  },
  googleIcon: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(8),
    backgroundColor: '#F1F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  googleTxt: {
    color: C.ink,
    fontWeight: '700',
    fontSize: moderateScale(15),
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F9',
    borderRadius: scale(13),
    paddingHorizontal: scale(14),
    paddingVertical: scale(4),
    marginBottom: scale(12),
  },
  icon: { marginRight: scale(10) },
  input: {
    flex: 1,
    fontSize: moderateScale(15),
    color: C.text,
    paddingVertical: scale(12)
  },
  eyeIcon: { paddingLeft: scale(10) },
  passwordHints: {
    backgroundColor: '#FEF2F2',
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: scale(14),
  },
  hintTitle: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.text,
    marginBottom: scale(6),
  },
  hintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(4),
  },
  hintText: {
    fontSize: moderateScale(12),
    color: C.danger,
    marginLeft: scale(6),
  },
  registerButton: {
    backgroundColor: C.ink,
    paddingVertical: scale(15),
    borderRadius: scale(14),
    alignItems: 'center',
    marginTop: scale(6),
    shadowColor: C.ink,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 4,
  },
  registerText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: moderateScale(16)
  },
  footerText: {
    textAlign: 'center',
    marginTop: scale(14),
    marginBottom: scale(4),
    color: C.muted,
    fontSize: moderateScale(13.5)
  },
});
