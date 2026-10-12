import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  ScrollView,
  ActivityIndicator,
  Modal,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';
import AppAlert from '../utils/AppAlert';

import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
export default function RestaurantLogin({ navigation }) {
  const keyboardHeight = useKeyboardHeight();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  // Holds { destination, initial } when a Google user needs to add a phone number
  const [phonePrompt, setPhonePrompt] = useState(null);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '896374925078-c3gdr6hi301pnth64vj5t6jqlmhjotom.apps.googleusercontent.com',
      offlineAccess: false,
    });
  }, []);

  const saveSessionAndFcm = async (userData) => {
    try {
      if (userData) {
        await AsyncStorage.setItem('user', JSON.stringify(userData));
        if (userData.id) {
          await AsyncStorage.setItem('ownerId', String(userData.id));
        }
      }

      // Register FCM token for push notifications (token was already stored during app init)
      try {
        await notificationService.registerTokenAfterLogin();
      } catch (fcmErr) {
        console.log('FCM registration error (ignored):', fcmErr?.message || fcmErr);
      }
    } catch (err) {
      console.log('saveSessionAndFcm error:', err?.message || err);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      return AppAlert.alert('Missing Fields', 'Please enter both email and password.');
    }

    if (!email.includes('@')) {
      return AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
    }

    setLoading(true);
    try {
      const response = await api.post('/restaurant/login', {
        email: email.trim(),
        password,
      });

      console.log('✅ Login successful:', response.data);

      if (response.data?.ok && response.data?.data) {
        const { user, restaurants, hasApprovedRestaurant, hasAnyRestaurant, token } = response.data.data;

        // Save auth token for mobile API requests
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          console.log('✅ Token saved for mobile auth');
        }

        // Save user data
        await saveSessionAndFcm(user);

        // Save restaurant data if available
        if (restaurants && restaurants.length > 0) {
          await AsyncStorage.setItem('restaurants', JSON.stringify(restaurants));
          await AsyncStorage.setItem('selectedRestaurant', JSON.stringify(restaurants[0]));
        }

        // Navigate based on restaurant status: approved restaurant -> Home,
        // has a restaurant awaiting approval -> PendingApproval,
        // never added one yet (e.g. first login right after account approval) -> add restaurant
        if (hasApprovedRestaurant) {
          navigation.replace('Home');
        } else if (hasAnyRestaurant) {
          navigation.replace('PendingApproval');
        } else {
          navigation.replace('RestaurantOnboarding');
        }
      } else {
        AppAlert.alert('Login Failed', response.data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.log('❌ Login error:', error);

      // Handle email not verified
      if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') {
        AppAlert.alert(
          'Email Not Verified',
          'A verification code has been sent to your email.',
          [
            {
              text: 'Verify Now',
              onPress: () =>
                navigation.navigate('EmailVerification', {
                  email: error.response?.data?.email || email.trim(),
                }),
            },
          ]
        );
        return;
      }

      // Owner registration is pending/rejected admin approval
      const code = error.response?.data?.code;
      if (code === 'OWNER_PENDING_APPROVAL' || code === 'OWNER_REJECTED') {
        navigation.replace('OwnerApprovalPending', { rejected: code === 'OWNER_REJECTED' });
        return;
      }

      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      AppAlert.alert('Login Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      console.log('🔵 Starting Google Sign-In...');
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const signInResult = await GoogleSignin.signIn();
      // v15+ returns { data: { idToken, user } } structure
      const idToken = signInResult.data?.idToken || signInResult.idToken;
      console.log('🔵 Got Google ID token:', idToken ? 'Yes' : 'No');

      if (!idToken) {
        throw new Error('Failed to get ID token from Google Sign-In');
      }

      const googleCredential = auth.GoogleAuthProvider.credential(idToken);
      const userCredential = await auth().signInWithCredential(googleCredential);

      console.log('🔵 Firebase user:', userCredential.user?.email);

      // Send to backend to get or create owner account
      const response = await api.post('/auth/google-login', {
        firebaseUid: userCredential.user.uid,
        email: userCredential.user.email,
        displayName: userCredential.user.displayName,
        photoURL: userCredential.user.photoURL,
      });

      console.log('✅ Google Sign-In successful:', response.data);

      if (response.data?.ok && response.data?.data) {
        const { user, restaurants, hasApprovedRestaurant, hasAnyRestaurant, token } = response.data.data;

        // Save auth token for mobile API requests
        if (token) {
          await AsyncStorage.setItem('userToken', token);
          console.log('✅ Token saved for mobile auth');
        }

        await saveSessionAndFcm(user);

        if (restaurants && restaurants.length > 0) {
          await AsyncStorage.setItem('restaurants', JSON.stringify(restaurants));
          await AsyncStorage.setItem('selectedRestaurant', JSON.stringify(restaurants[0]));
        }

        // Decide where this user should land after login
        const destination = hasApprovedRestaurant
          ? 'Home'
          : (hasAnyRestaurant ? 'PendingApproval' : 'RestaurantOnboarding');

        // Google-registered users usually have no mobile number yet.
        // Show the add-phone modal first (needed for OTP login, SMS alerts, bookings),
        // then navigate. If a valid phone already exists, navigate straight away.
        const phoneOk = /^\+?[0-9][0-9\s-]{6,}$/.test(String(user?.phone || '').trim());
        if (phoneOk) {
          navigation.replace(destination);
        } else {
          const fn = (user?.name || '').split(' ')[0] || '';
          const ln = (user?.name || '').split(' ').slice(1).join(' ') || '';
          setPhonePrompt({
            destination,
            initial: { first_name: fn, last_name: ln, email: user?.email || '', phone: '', password: '' },
          });
        }
      } else {
        AppAlert.alert('Login Failed', response.data?.error || 'Google sign-in failed');
      }
    } catch (error) {
      const backendCode = error.response?.data?.code;

      // Known, app-handled outcomes (pending/rejected approval) aren't failures —
      // only log the alarming ❌ for genuinely unexpected errors.
      if (backendCode === 'OWNER_PENDING_APPROVAL' || backendCode === 'OWNER_REJECTED') {
        console.log('ℹ️ Google Sign-In: owner approval', backendCode);
      } else {
        console.log('❌ Google Sign-In Full Error:', error);
      }

      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('User cancelled sign-in');
      } else if (error.code === 'IN_PROGRESS') {
        AppAlert.alert('Sign-In In Progress', 'Please wait for the current sign-in to complete');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        AppAlert.alert('Google Play Services', 'Please update Google Play Services to continue');
      } else if (backendCode === 'OWNER_PENDING_APPROVAL' || backendCode === 'OWNER_REJECTED') {
        navigation.replace('OwnerApprovalPending', { rejected: backendCode === 'OWNER_REJECTED' });
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Google sign-in failed';
        AppAlert.alert('Google Sign-In Error', errorMessage);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  // Close the add-phone modal and continue. `addNow` => open the edit-profile screen.
  const resolvePhonePrompt = (addNow) => {
    const p = phonePrompt;
    setPhonePrompt(null);
    if (!p) return;
    navigation.replace(p.destination);
    if (addNow) {
      setTimeout(() => navigation.navigate('EditOwnerProfile', { initial: p.initial }), 350);
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
        <Text style={styles.brandWordmark}>KITCHEN NETWORK INTERNATIONAL</Text>
        <Text style={styles.welcomeTitle}>Welcome Back</Text>
        <Text style={styles.welcomeSubtitle}>Sign in to manage your restaurant</Text>
      </LinearGradient>

      {/* Sheet */}
      <View style={styles.sheetWrap}>
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: scale(40) + keyboardHeight }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.dragHandle} />

          {/* Login Form */}
          <View style={styles.formContainer}>
            {/* Email Input */}
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#999"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password Input */}
          <View style={styles.inputContainer}>
            <Icon name="lock-closed-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#999"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={secureText}
              autoCapitalize="none"
            />
            <TouchableOpacity
              onPress={() => setSecureText(!secureText)}
              style={styles.eyeIcon}
            >
              <Icon
                name={secureText ? 'eye-off-outline' : 'eye-outline'}
                size={scale(20)}
                color="#666"
              />
            </TouchableOpacity>
          </View>

          {/* Forgot Password */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotPasswordContainer}
          >
            <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
          </TouchableOpacity>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginButton, loading && styles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <Text style={styles.dividerPlainText}>or continue with</Text>

          {/* Google Sign-In Button */}
          <TouchableOpacity
            style={[styles.googleButton, googleLoading && styles.googleButtonDisabled]}
            onPress={handleGoogleSignIn}
            disabled={googleLoading}
          >
            {googleLoading ? (
              <ActivityIndicator color="#333" />
            ) : (
              <>
                <Icon name="logo-google" size={scale(20)} color="#DB4437" style={styles.googleIcon} />
                <Text style={styles.googleButtonText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          {/* Register Link */}
          <View style={styles.registerContainer}>
            <Text style={styles.registerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('RestaurantRegister')}>
              <Text style={styles.registerLink}>Sign Up</Text>
            </TouchableOpacity>
          </View>
          </View>
        </ScrollView>
      </View>

      {/* Add-phone modal (shown to Google users without a mobile number) */}
      <Modal
        visible={!!phonePrompt}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => resolvePhonePrompt(false)}
      >
        <View style={styles.pmOverlay}>
          <View style={styles.pmCard}>
            <LinearGradient
              colors={['#EF3A3A', '#D42E2E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.pmIconBadge}
            >
              <Icon name="call" size={scale(30)} color="#fff" />
            </LinearGradient>

            <Text style={styles.pmTitle}>Add your mobile number</Text>
            <Text style={styles.pmMessage}>
              Add your mobile number to receive OTP login, SMS alerts and booking updates.
            </Text>

            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => resolvePhonePrompt(true)}
              style={styles.pmPrimaryBtn}
            >
              <LinearGradient
                colors={['#EF3A3A', '#D42E2E']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.pmPrimaryGrad}
              >
                <Icon name="add-circle-outline" size={scale(18)} color="#fff" />
                <Text style={styles.pmPrimaryText}>Add Now</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => resolvePhonePrompt(false)}
              style={styles.pmGhostBtn}
            >
              <Text style={styles.pmGhostText}>Maybe later</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },

  /* Add-phone modal */
  pmOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15,23,42,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(24),
  },
  pmCard: {
    width: '100%',
    maxWidth: scale(400),
    backgroundColor: '#fff',
    borderRadius: scale(24),
    paddingHorizontal: scale(24),
    paddingTop: scale(28),
    paddingBottom: scale(20),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(10) },
    shadowOpacity: 0.25,
    shadowRadius: scale(20),
    elevation: 14,
  },
  pmIconBadge: {
    width: scale(64),
    height: scale(64),
    borderRadius: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(18),
    shadowColor: '#EF3A3A',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.4,
    shadowRadius: scale(12),
    elevation: 8,
  },
  pmTitle: {
    fontSize: moderateScale(19),
    fontWeight: '800',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  pmMessage: {
    fontSize: moderateScale(13.5),
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: scale(22),
  },
  pmPrimaryBtn: {
    width: '100%',
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  pmPrimaryGrad: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(14),
    gap: scale(8),
  },
  pmPrimaryText: {
    color: '#fff',
    fontSize: moderateScale(15),
    fontWeight: '700',
  },
  pmGhostBtn: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: scale(12),
    marginTop: scale(4),
  },
  pmGhostText: {
    color: '#9CA3AF',
    fontSize: moderateScale(13.5),
    fontWeight: '600',
  },
  hero: {
    paddingTop: scale(56),
    paddingBottom: scale(32),
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomLeftRadius: scale(36),
    borderBottomRightRadius: scale(36),
  },
  logoCircle: {
    width: scale(84),
    height: scale(84),
    borderRadius: scale(42),
    backgroundColor: '#FFF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(14),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.2,
    shadowRadius: scale(12),
    elevation: 8,
  },
  logo: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
  },
  brandWordmark: {
    fontSize: moderateScale(11),
    fontWeight: '800',
    color: 'rgba(255,255,255,0.85)',
    letterSpacing: 1.4,
    marginBottom: scale(2),
  },
  welcomeTitle: {
    fontSize: moderateScale(21),
    fontWeight: '800',
    color: '#FFF',
  },
  welcomeSubtitle: {
    fontSize: moderateScale(12.5),
    color: 'rgba(255,255,255,0.85)',
    marginTop: scale(4),
  },
  sheetWrap: {
    flex: 1,
    backgroundColor: '#FFF',
    marginTop: scale(-26),
    borderTopLeftRadius: scale(32),
    borderTopRightRadius: scale(32),
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(-4) },
    shadowOpacity: 0.05,
    shadowRadius: scale(12),
    elevation: 6,
  },
  dragHandle: {
    width: scale(40),
    height: scale(4),
    borderRadius: scale(2),
    backgroundColor: '#E6E6E6',
    alignSelf: 'center',
    marginTop: scale(12),
    marginBottom: scale(10),
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingTop: scale(6),
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F7F7F9',
    borderRadius: scale(14),
    paddingHorizontal: scale(16),
    marginBottom: scale(14),
    height: scale(52),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: scale(8),
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginBottom: scale(8),
    marginTop: scale(-8),
  },
  forgotPasswordText: {
    fontSize: moderateScale(14),
    color: '#EF3A3A',
    fontWeight: '500',
  },
  loginButton: {
    backgroundColor: '#1D2254',
    borderRadius: scale(14),
    height: scale(52),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(6),
    shadowColor: '#1D2254',
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  dividerPlainText: {
    textAlign: 'center',
    fontSize: moderateScale(12.5),
    color: '#999',
    marginVertical: scale(14),
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: scale(14),
    borderWidth: 1,
    borderColor: '#E6E6E6',
    height: scale(50),
    marginBottom: scale(24),
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    marginRight: scale(12),
  },
  googleButtonText: {
    color: '#333',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: moderateScale(14),
    color: '#666',
  },
  registerLink: {
    fontSize: moderateScale(14),
    color: '#EF3A3A',
    fontWeight: '600',
  },
});
