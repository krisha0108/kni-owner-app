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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import messaging from '@react-native-firebase/messaging';

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
  const [error, setError] = useState('');
  const [gLoading, setGLoading] = useState(false);
  const [pLoading, setPLoading] = useState(false);
  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };
  useEffect(() => {
    GoogleSignin.configure({
      webClientId:
        '851628336447-uccg7n0mbg4g2mlvb5g8nr9r55s4oje2.apps.googleusercontent.com', // <-- from Firebase (Web)
      offlineAccess: false,
      forceCodeForRefreshToken: false,
    });
  }, []);
  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, restaurantName } =
      form;
    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password ||
      !restaurantName ||
      !form.locations
    ) {
      return alert('Please fill all fields');
    }
    try {
      const res = await api.post('/restaurant/register', {
        first_name: firstName,
        last_name: lastName,
        email,
        phone,
        password,
        restaurant_name: restaurantName,
        locations: form.locations,
      });
      // Inspect once if unsure:
      // console.log('Register response:', JSON.stringify(res.data, null, 2));
      if (res.data?.status) {
        // Try common shapes to find the owner
        const owner = res.data?.data || res.data?.owner || res.data?.user;
        // If the backend returns the owner id, store it now
        if (owner?.id) {
          await AsyncStorage.setItem('ownerId', String(owner.id));
        }
        // If a token is returned, store + attach to axios (optional but nice)
        if (res.data?.token) {
          await AsyncStorage.setItem('ownerToken', res.data.token);
          api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
        }
        // :fire: Get and store FCM token
      try {
        const fcmToken = await messaging().getToken();
        console.log('FCM Token:', fcmToken);
        if (fcmToken && owner?.id) {
          console.log('FCM Token obtained:', fcmToken);
          // Send FCM token to backend
          const fcmResponse = await api.post('/owners/save-fcm-token', {
            restaurant_owner_id: owner.id,
            fcm_token: fcmToken
          });
          console.log('FCM token response:', fcmResponse.data);
          console.log('FCM token saved to backend successfully');
        } else {
          console.log('No FCM token or owner ID available');
        }
      } catch (fcmError) {
        console.log('FCM token error:', fcmError.message);
      }
        alert(res.data.message || 'Registered successfully');
        // Prefer skipping login if we already have ownerId
        navigation.replace('Home');
        // if (owner?.id) {
        //    // straight to app
        // } 
      }
    } catch (err) {
      console.log(err.response?.data);
      alert(err.response?.data?.message || 'Something went wrong');
    }
  };
  const handleGoogle = async () => {
    try {
      setGLoading(true);
      setError('');
      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      // Ask Google
      // const signInRes = await GoogleSignin.signIn(); // { idToken?, user, ... }
      const signInRes = await GoogleSignin.signIn({ prompt: 'select_account' });
      let { idToken } = signInRes || {};
      // If idToken is missing, try to fetch tokens explicitly
      let accessToken;
      if (!idToken) {
        const tokenRes = await GoogleSignin.getTokens(); // { idToken?, accessToken? }
        idToken = tokenRes?.idToken;
        accessToken = tokenRes?.accessToken;
      }
      if (!idToken && !accessToken) {
        throw new Error('Google Sign-In did not return idToken or accessToken');
      }
      // Build Firebase credential (idToken preferred, else accessToken)
      const credential = auth.GoogleAuthProvider.credential(
        idToken || null,
        accessToken || null,
      );
      // Sign into Firebase
      await auth().signInWithCredential(credential);
      // Get Firebase JWT for your backend
      const firebaseIdToken = await auth().currentUser.getIdToken(true);
      // Hit your Laravel endpoint
      const res = await api.post(`/owner/auth/firebase`, {
        idToken: firebaseIdToken,
      });
      const { token, owner } = res.data || {};
      console.log('[Google sign-in success]', res.data);
      if (!token) throw new Error('No token from server');
      await AsyncStorage.setItem('APP_TOKEN', token);
      await AsyncStorage.setItem('authProvider', 'google');
      api.defaults.headers.common.Authorization = `Bearer ${token}`;

      if (token) {
        await AsyncStorage.setItem('ownerData', JSON.stringify(res.data.owner));
        await AsyncStorage.setItem('ownerId', String(res.data.owner?.id));
        api.defaults.headers.common.Authorization = `Bearer ${res.data.token}`;
      }
      // const who = data || owner || user;
      // if (who?.id) await AsyncStorage.setItem('ownerId', String(who.id));
      // if (who) await AsyncStorage.setItem('ownerData', JSON.stringify(who));

      navigation.replace('Home');
    } catch (e) {
      // Helpful logging:
      console.log('[Google sign-in error]', e?.message, e);
      -console.log('status:', e?.response?.status);
      console.log('data:', e?.response?.data); // <- shows SQL/message from server
      setError(
        e?.message?.includes('idToken') || e?.message?.includes('accessToken')
          ? 'Google sign-in failed to retrieve a token. Check Web client ID & SHA keys.'
          : 'Google sign-in failed. Please try again.',
      );
    } finally {
      setGLoading(false);
    }
  };
  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <Image
        source={require('../assets/images/kni-logo.png')}
        style={styles.logo}
      />
      <Text style={styles.title}>Restaurant Owner Registration</Text>
      {/* First Name */}
      <TouchableOpacity
        style={[styles.googleBtn, { opacity: gLoading ? 0.7 : 1 }]}
        onPress={handleGoogle}
        disabled={gLoading || pLoading}
      >
        <View style={styles.googleIcon}>
          {gLoading ? (
            <ActivityIndicator />
          ) : (
            <Icon name="logo-google" size={18} color="#4285F4" />
          )}
        </View>
        <Text style={styles.googleTxt}>Sign in with Google</Text>
      </TouchableOpacity>
      <View style={styles.inputWrapper}>
        <Icon
          name="person-outline"
          size={20}
          color="#888"
          style={styles.icon}
        />
        <TextInput
          placeholder="First Name"
          style={styles.input}
          value={form.firstName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('firstName', text)}
        />
      </View>
      {/* Last Name */}
      <View style={styles.inputWrapper}>
        <Icon
          name="person-outline"
          size={20}
          color="#888"
          style={styles.icon}
        />
        <TextInput
          placeholder="Last Name"
          style={styles.input}
          value={form.lastName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('lastName', text)}
        />
      </View>
      {/* Email */}
      <View style={styles.inputWrapper}>
        <Icon name="mail-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Email"
          keyboardType="email-address"
          style={styles.input}
          value={form.email}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('email', text)}
        />
      </View>
      {/* Phone */}
      <View style={styles.inputWrapper}>
        <Icon name="call-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Phone Number"
          keyboardType="phone-pad"
          style={styles.input}
          value={form.phone}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('phone', text)}
        />
      </View>
      {/* Password */}
      <View style={styles.inputWrapper}>
        <Icon
          name="lock-closed-outline"
          size={20}
          color="#888"
          style={styles.icon}
        />
        <TextInput
          placeholder="Password"
          secureTextEntry={secureText}
          style={styles.input}
          value={form.password}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('password', text)}
        />
        <TouchableOpacity
          onPress={() => setSecureText(!secureText)}
          style={styles.eyeIcon}
        >
          <Icon
            name={secureText ? 'eye-off-outline' : 'eye-outline'}
            size={20}
            color="#888"
          />
        </TouchableOpacity>
      </View>
      {/* Restaurant Name */}
      <View style={styles.inputWrapper}>
        <Icon
          name="restaurant-outline"
          size={20}
          color="#888"
          style={styles.icon}
        />
        <TextInput
          placeholder="Restaurant Name"
          style={styles.input}
          value={form.restaurantName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('restaurantName', text)}
        />
      </View>
      <View style={styles.inputWrapper}>
        <Icon name="map-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Number of Locations"
          placeholderTextColor="#999"
          style={styles.input}
          value={form.locations.toString()}
          keyboardType="numeric"
          onChangeText={text => handleChange('locations', parseInt(text))}
        />
      </View>
      {/* Register Button */}
      <TouchableOpacity style={styles.registerButton} onPress={handleRegister}>
        <Text style={styles.registerText}>Register</Text>
      </TouchableOpacity>
      <Text style={styles.footerText}>
        Already have an account?{' '}
        <Text
          style={{ color: '#EF3A3A', fontWeight: '600' }}
          onPress={() => navigation.navigate('RestaurantLogin')}
        >
          Login
        </Text>
      </Text>
    </ScrollView>
  );
};
export default RestaurantRegisterScreen;
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
    padding: 20,
  },
  logo: {
    width: 100,
    height: 100,
    alignSelf: 'center',
    resizeMode: 'contain',
    marginBottom: 10,
  },
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
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1D2254',
    textAlign: 'center',
    marginBottom: 25,
  },
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
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
  },
  eyeIcon: {
    paddingLeft: 8,
  },
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
  registerText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 16,
  },
  footerText: {
    textAlign: 'center',
    marginTop: 25,
    color: '#666',
    fontSize: 13,
  },
});
