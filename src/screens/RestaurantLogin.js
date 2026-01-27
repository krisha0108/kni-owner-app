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
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import notificationService from '../services/notificationService';

export default function RestaurantLogin({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  useEffect(() => {
    GoogleSignin.configure({
      webClientId: '851628336447-uccg7n0mbg4g2mlvb5g8nr9r55s4oje2.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
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
      return Alert.alert('Missing Fields', 'Please enter both email and password.');
    }

    if (!email.includes('@')) {
      return Alert.alert('Invalid Email', 'Please enter a valid email address.');
    }

    setLoading(true);
    try {
      const response = await api.post('/restaurant/login', {
        email: email.trim(),
        password,
      });

      console.log('✅ Login successful:', response.data);

      if (response.data?.ok && response.data?.data) {
        const { user, restaurants, hasApprovedRestaurant, token } = response.data.data;

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

        // Navigate based on restaurant approval status
        if (hasApprovedRestaurant) {
          navigation.replace('Home');
        } else {
          navigation.replace('PendingApproval');
        }
      } else {
        Alert.alert('Login Failed', response.data?.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.log('❌ Login error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Login failed';
      Alert.alert('Login Error', errorMessage);
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
        const { user, restaurants, hasApprovedRestaurant, token } = response.data.data;

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

        // Navigate based on status
        if (hasApprovedRestaurant) {
          navigation.replace('Home');
        } else if (restaurants && restaurants.length > 0) {
          navigation.replace('PendingApproval');
        } else {
          // New user with no restaurant - go to onboarding
          navigation.replace('RestaurantOnboarding');
        }
      } else {
        Alert.alert('Login Failed', response.data?.error || 'Google sign-in failed');
      }
    } catch (error) {
      console.log('❌ Google Sign-In Full Error:', error);

      if (error.code === 'SIGN_IN_CANCELLED') {
        console.log('User cancelled sign-in');
      } else if (error.code === 'IN_PROGRESS') {
        Alert.alert('Sign-In In Progress', 'Please wait for the current sign-in to complete');
      } else if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
        Alert.alert('Google Play Services', 'Please update Google Play Services to continue');
      } else {
        const errorMessage = error.response?.data?.error || error.message || 'Google sign-in failed';
        Alert.alert('Google Sign-In Error', errorMessage);
      }
    } finally {
      setGoogleLoading(false);
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
        {/* Logo */}
        <View style={styles.logoContainer}>
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text style={styles.title}>Restaurant Owner Login</Text>
          <Text style={styles.subtitle}>Welcome back! Sign in to continue</Text>
        </View>

        {/* Login Form */}
        <View style={styles.formContainer}>
          {/* Email Input */}
          <View style={styles.inputContainer}>
            <Icon name="mail-outline" size={20} color="#666" style={styles.inputIcon} />
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
            <Icon name="lock-closed-outline" size={20} color="#666" style={styles.inputIcon} />
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
                size={20}
                color="#666"
              />
            </TouchableOpacity>
          </View>

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
          <View style={styles.dividerContainer}>
            <View style={styles.divider} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.divider} />
          </View>

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
                <Icon name="logo-google" size={20} color="#DB4437" style={styles.googleIcon} />
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
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    paddingHorizontal: 16,
    marginBottom: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
  },
  eyeIcon: {
    padding: 8,
  },
  loginButton: {
    backgroundColor: '#FF6B35',
    borderRadius: 12,
    height: 56,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#FF6B35',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  loginButtonDisabled: {
    opacity: 0.6,
  },
  loginButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  divider: {
    flex: 1,
    height: 1,
    backgroundColor: '#E0E0E0',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#999',
    fontSize: 14,
    fontWeight: '500',
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    height: 56,
    marginBottom: 24,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIcon: {
    marginRight: 12,
  },
  googleButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  registerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  registerText: {
    fontSize: 14,
    color: '#666',
  },
  registerLink: {
    fontSize: 14,
    color: '#FF6B35',
    fontWeight: '600',
  },
});
