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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import messaging from '@react-native-firebase/messaging';
import { GoogleSignin } from '@react-native-google-signin/google-signin';

const RestaurantRegisterScreen = ({ navigation }) => {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    restaurantName: '',
    locations: '',
  });
  const [secureText, setSecureText] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Configure Google Signin
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '851628336447-uccg7n0mbg4g2mlvb5g8nr9r55s4oje2.apps.googleusercontent.com',
      offlineAccess: true,
      forceCodeForRefreshToken: true,
    });
  }, []);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const storeUserSession = async (token, owner) => {
    if (token) {
      await AsyncStorage.setItem('userToken', token);
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    }
    if (owner) {
      await AsyncStorage.setItem('user', JSON.stringify(owner));
      if (owner?.id) {
        await AsyncStorage.setItem('ownerId', String(owner.id));
      }
    }
  };

  const saveFcmToken = async ownerId => {
    try {
      const fcmToken = await messaging().getToken(); // new modular API is the same
      if (fcmToken && ownerId) {
        await api.post('/owners/save-fcm-token', {
          restaurant_owner_id: ownerId,
          fcm_token: fcmToken,
        });
        console.log('✅ FCM token saved:', fcmToken);
      }
    } catch (error) {
      console.log('❌ FCM token save failed:', error.message);
    }
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, restaurantName, locations } = form;
    if (!firstName || !lastName || !email || !phone || !password || !restaurantName || !locations) {
      return Alert.alert('Missing Fields', 'Please fill all required fields.');
    }

    setLoading(true);
    try {
      const res = await api.post('/restaurant/register', {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        restaurant_name: restaurantName,
        locations,
      });

      if (res.data?.status) {
        const owner = res.data?.data || res.data?.owner;
        const token = res.data?.token;

        await storeUserSession(token, owner);
        await saveFcmToken(owner?.id);

        Alert.alert('Success', res.data.message || 'Registered successfully!');
        navigation.replace('Home');
      } else {
        Alert.alert('Error', res.data?.message || 'Registration failed.');
      }
    } catch (err) {
      console.log('Register error:', err?.response?.data || err.message);
      Alert.alert('Error', err?.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Refined Google Sign-In
  const handleGoogle = async () => {
    try {
      setGoogleLoading(true);

      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const userInfo = await GoogleSignin.signIn();

      // FIX: idToken and serverAuthCode are under userInfo.data
      const idToken = userInfo?.data?.idToken;
      const serverAuthCode = userInfo?.data?.serverAuthCode;

      if (!idToken && !serverAuthCode) {
        throw new Error('No Google idToken or serverAuthCode returned');
      }

      // Sign into Firebase with idToken
      const credential = auth.GoogleAuthProvider.credential(idToken);
      const firebaseUserCredential = await auth().signInWithCredential(credential);

      const firebaseIdToken = await firebaseUserCredential.user.getIdToken(true);

      const res = await api.post('/owner/auth/firebase', { idToken: firebaseIdToken });
      const { token, owner } = res.data || {};
      if (!token) throw new Error('No token returned from server');

      await storeUserSession(token, owner);
      await saveFcmToken(owner?.id);

      navigation.replace('Home');
    } catch (err) {
      console.log('[Google Sign-In Error]', err);
      Alert.alert('Google Sign-In Failed', err?.message || 'Please try again.');
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
      <Image source={require('../assets/images/kni-logo.png')} style={styles.logo} />
      <Text style={styles.title}>Restaurant Owner Registration</Text>

      <TouchableOpacity
        style={[styles.googleBtn, { opacity: googleLoading ? 0.7 : 1 }]}
        onPress={handleGoogle}
        disabled={googleLoading || loading}>
        <View style={styles.googleIcon}>
          {googleLoading ? <ActivityIndicator /> : <Icon name="logo-google" size={18} color="#4285F4" />}
        </View>
        <Text style={styles.googleTxt}>Sign in with Google</Text>
      </TouchableOpacity>

      {[
        { key: 'firstName', placeholder: 'First Name', icon: 'person-outline' },
        { key: 'lastName', placeholder: 'Last Name', icon: 'person-outline' },
        { key: 'email', placeholder: 'Email', icon: 'mail-outline', keyboardType: 'email-address' },
        { key: 'phone', placeholder: 'Phone Number', icon: 'call-outline', keyboardType: 'phone-pad' },
        { key: 'password', placeholder: 'Password', icon: 'lock-closed-outline', secure: true },
        { key: 'restaurantName', placeholder: 'Restaurant Name', icon: 'restaurant-outline' },
        { key: 'locations', placeholder: 'Number of Locations', icon: 'map-outline', keyboardType: 'numeric' },
      ].map((item, index) => (
        <View key={index} style={styles.inputWrapper}>
          <Icon name={item.icon} size={20} color="#888" style={styles.icon} />
          <TextInput
            placeholder={item.placeholder}
            style={styles.input}
            keyboardType={item.keyboardType || 'default'}
            secureTextEntry={item.key === 'password' ? secureText : false}
            value={form[item.key]?.toString() || ''}
            placeholderTextColor="#999"
            onChangeText={text =>
              handleChange(item.key, item.key === 'locations' ? parseInt(text) || '' : text)
            }
          />
          {item.key === 'password' && (
            <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
              <Icon name={secureText ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
            </TouchableOpacity>
          )}
        </View>
      ))}

      <TouchableOpacity
        style={[styles.registerButton, { opacity: loading ? 0.7 : 1 }]}
        onPress={handleRegister}
        disabled={loading}>
        {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.registerText}>Register</Text>}
      </TouchableOpacity>

      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text style={{ color: '#EF3A3A', fontWeight: '600' }} onPress={() => navigation.navigate('RestaurantLogin')}>
          Login
        </Text>
      </Text>
    </ScrollView>
  );
};

export default RestaurantRegisterScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 20 },
  logo: { width: 100, height: 100, alignSelf: 'center', resizeMode: 'contain', marginBottom: 10 },
  title: { fontSize: 20, fontWeight: '700', color: '#1D2254', textAlign: 'center', marginBottom: 25 },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingVertical: 12,
    marginBottom: 10,
  },
  googleIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  googleTxt: { color: '#1D2254', fontWeight: '800' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    borderColor: '#DDD',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 15,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#000' },
  eyeIcon: { paddingLeft: 8 },
  registerButton: {
    backgroundColor: '#EF3A3A',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 5,
    shadowColor: '#EF3A3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 3,
  },
  registerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footerText: { textAlign: 'center', marginTop: 25, color: '#666', fontSize: 13 },
});
