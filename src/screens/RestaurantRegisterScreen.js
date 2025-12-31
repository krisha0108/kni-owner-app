// src/screens/RestaurantRegister.js
import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Image, ScrollView, ActivityIndicator, Alert, Platform
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import auth from '@react-native-firebase/auth';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import AsyncStorage from '@react-native-async-storage/async-storage';
import messaging from '@react-native-firebase/messaging';
import { pick } from '@react-native-documents/picker';
import { launchImageLibrary } from 'react-native-image-picker';

export default function RestaurantRegisterScreen({ navigation }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    // Restaurant fields
    hotelName: '',
    address: '',
    fssaiNumber: '',
  });
  const [fssaiFile, setFssaiFile] = useState(null);
  const [mainImage, setMainImage] = useState(null);
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

  const saveSessionAndFcm = async (token, owner, provider = 'password') => {
    try {
      if (token) {
        await AsyncStorage.setItem('userToken', token);
        if (api && api.defaults) api.defaults.headers.common.Authorization = `Bearer ${token}`;
      }

      if (owner) {
        await AsyncStorage.setItem('user', JSON.stringify(owner));
        if (owner?.id) await AsyncStorage.setItem('ownerId', String(owner.id));
      }

      await AsyncStorage.setItem('authProvider', provider);

      try {
        const fcmToken = await messaging().getToken();
        if (fcmToken && owner?.id) {
          await api.post('/owners/save-fcm-token', {
            restaurant_owner_id: owner.id,
            fcm_token: fcmToken,
          }).catch(e => console.log('save-fcm-token error (ignored):', e?.message || e));
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
  };

  const pickFssaiFile = async () => {
    try {
      const [result] = await pick({
        type: ['application/pdf', 'image/*'],
      });
      if (result) {
        setFssaiFile({
          uri: result.uri,
          type: result.type || 'application/pdf',
          name: result.name || 'fssai_certificate.pdf',
        });
      }
    } catch (err) {
      if (err?.message?.includes('cancel')) {
        return;
      }
      console.log('File pick error:', err);
      Alert.alert('Error', 'Failed to pick file. Please try again.');
    }
  };

  const pickMainImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          console.log('Image picker error:', response.errorMessage);
          Alert.alert('Error', 'Failed to pick image. Please try again.');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setMainImage({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'restaurant_image.jpg',
          });
        }
      }
    );
  };

  const handleRegister = async () => {
    const { firstName, lastName, email, phone, password, hotelName, address, fssaiNumber } = form;

    if (!firstName || !lastName || !email || !phone || !password) {
      return Alert.alert('Missing Fields', 'Please fill all required personal details.');
    }

    if (!hotelName || !address) {
      return Alert.alert('Missing Fields', 'Please fill restaurant name and address.');
    }

    setLoading(true);
    try {
      // Use FormData for file upload
      const formData = new FormData();
      formData.append('first_name', firstName);
      formData.append('last_name', lastName);
      formData.append('email', email);
      formData.append('phone', phone);
      formData.append('password', password);
      formData.append('hotel_name', hotelName);
      formData.append('address', address);

      if (fssaiNumber) {
        formData.append('fssai_number', fssaiNumber);
      }

      if (fssaiFile) {
        formData.append('fssai_certificate', fssaiFile);
      }

      if (mainImage) {
        formData.append('main_image', mainImage);
      }

      const res = await api.post('/restaurant/register', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (res.data?.status) {
        // Check if account is pending approval
        if (res.data?.approval_status === 'pending') {
          Alert.alert(
            'Registration Successful',
            'Your account and restaurant have been created and are pending admin approval. You will be notified once approved.',
            [
              {
                text: 'OK',
                onPress: () => navigation.replace('PendingApproval', { status: 'pending' }),
              },
            ]
          );
          return;
        }

        const owner = res.data?.data || res.data?.owner;
        const token = res.data?.token;
        await saveSessionAndFcm(token, owner, 'password');
        Alert.alert('Success', res.data?.message || 'Registered successfully!');
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

  const handleGoogle = async () => {
    setGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      try { if (auth().currentUser) await auth().signOut(); } catch(_) {}
      try { await GoogleSignin.signOut(); } catch(_) {}
      try { await GoogleSignin.revokeAccess(); } catch(_) {}

      const userInfo = await GoogleSignin.signIn();
      let tokens = await GoogleSignin.getTokens().catch(() => null);
      const googleIdToken = (userInfo?.idToken) || (tokens?.idToken);
      const googleAccessToken = tokens?.accessToken || userInfo?.accessToken;

      if (!googleIdToken && !googleAccessToken) {
        throw new Error('Google Sign-In did not return idToken or accessToken');
      }

      const credential = auth.GoogleAuthProvider.credential(googleIdToken || null, googleAccessToken || null);
      const firebaseUserCredential = await auth().signInWithCredential(credential);
      const firebaseIdToken = await firebaseUserCredential.user.getIdToken(true);

      const res = await api.post('/owner/auth/firebase', { idToken: firebaseIdToken });

      if (res.data?.approval_status === 'pending' || res.data?.approved === false) {
        Alert.alert(
          'Registration Successful',
          'Your account has been created and is pending admin approval. You will be notified once approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.replace('PendingApproval', {
                status: res.data.approval_status || 'pending',
                rejectionReason: res.data.rejection_reason,
              }),
            },
          ]
        );
        return;
      }

      if (!res.data?.status || !res.data?.token) {
        console.log('Backend firebase auth response:', res.data);
        throw new Error(res.data?.message || 'Server did not return token');
      }

      const appToken = res.data.token;
      const owner = res.data.owner || res.data.data;
      await saveSessionAndFcm(appToken, owner, 'google');

      navigation.replace('Home');
    } catch (e) {
      console.log('[Google register error]', e?.message || e, e?.response?.data || e?.response?.status);
      Alert.alert(
        'Google Sign-In Failed',
        e?.message?.includes('idToken') || e?.message?.includes('accessToken')
          ? 'Google sign-in failed to retrieve a token. Check Web client ID & SHA keys in Firebase console.'
          : (e?.response?.data?.message || e?.message || 'Please try again.')
      );
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
        <Text style={styles.googleTxt}>Continue with Google</Text>
      </TouchableOpacity>

      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <Text style={styles.dividerText}>or register with email</Text>
        <View style={styles.dividerLine} />
      </View>

      {/* Owner Details Section */}
      <Text style={styles.sectionTitle}>
        <Icon name="person-outline" size={16} color="#1D2254" /> Owner Details
      </Text>

      <View style={styles.inputWrapper}>
        <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="First Name *"
          style={styles.input}
          value={form.firstName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('firstName', text)}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Icon name="person-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Last Name *"
          style={styles.input}
          value={form.lastName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('lastName', text)}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Icon name="mail-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Email *"
          style={styles.input}
          keyboardType="email-address"
          autoCapitalize="none"
          value={form.email}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('email', text)}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Icon name="call-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Phone Number *"
          style={styles.input}
          keyboardType="phone-pad"
          value={form.phone}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('phone', text)}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Icon name="lock-closed-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Password *"
          style={styles.input}
          secureTextEntry={secureText}
          value={form.password}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('password', text)}
        />
        <TouchableOpacity onPress={() => setSecureText(!secureText)} style={styles.eyeIcon}>
          <Icon name={secureText ? 'eye-off-outline' : 'eye-outline'} size={20} color="#888" />
        </TouchableOpacity>
      </View>

      {/* Restaurant Details Section */}
      <Text style={[styles.sectionTitle, { marginTop: 20 }]}>
        <Icon name="restaurant-outline" size={16} color="#1D2254" /> Restaurant Details
      </Text>

      <View style={styles.inputWrapper}>
        <Icon name="restaurant-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Restaurant/Hotel Name *"
          style={styles.input}
          value={form.hotelName}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('hotelName', text)}
        />
      </View>

      {/* Restaurant Image Upload */}
      <TouchableOpacity style={styles.imageUploadBtn} onPress={pickMainImage}>
        {mainImage ? (
          <View style={styles.imagePreviewContainer}>
            <Image source={{ uri: mainImage.uri }} style={styles.imagePreview} />
            <TouchableOpacity
              style={styles.removeImageBtn}
              onPress={() => setMainImage(null)}
            >
              <Icon name="close-circle" size={24} color="#EF4444" />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Icon name="camera-outline" size={32} color="#9CA3AF" />
            <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
          </View>
        )}
      </TouchableOpacity>

      <View style={[styles.inputWrapper, { height: 80, alignItems: 'flex-start', paddingTop: 12 }]}>
        <Icon name="location-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="Full Address with City and Pincode *"
          style={[styles.input, { textAlignVertical: 'top' }]}
          multiline
          numberOfLines={3}
          value={form.address}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('address', text)}
        />
      </View>

      <View style={styles.inputWrapper}>
        <Icon name="document-text-outline" size={20} color="#888" style={styles.icon} />
        <TextInput
          placeholder="FSSAI Number (14 digits)"
          style={styles.input}
          keyboardType="numeric"
          maxLength={14}
          value={form.fssaiNumber}
          placeholderTextColor="#999"
          onChangeText={text => handleChange('fssaiNumber', text)}
        />
      </View>

      {/* FSSAI Certificate Upload */}
      <TouchableOpacity style={styles.uploadBtn} onPress={pickFssaiFile}>
        <Icon name="cloud-upload-outline" size={20} color="#EF3A3A" />
        <Text style={styles.uploadText}>
          {fssaiFile ? 'Change FSSAI Certificate' : 'Upload FSSAI Certificate (PDF/Image)'}
        </Text>
      </TouchableOpacity>

      {fssaiFile && (
        <View style={styles.filePreview}>
          <Icon name="document-attach-outline" size={18} color="#10B981" />
          <Text style={styles.fileName} numberOfLines={1}>{fssaiFile.name}</Text>
          <TouchableOpacity onPress={() => setFssaiFile(null)}>
            <Icon name="close-circle" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      )}

      {/* Info Alert */}
      <View style={styles.infoBox}>
        <Icon name="information-circle-outline" size={18} color="#F59E0B" />
        <Text style={styles.infoText}>
          Your account will be reviewed by admin. You will be notified once approved.
        </Text>
      </View>

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
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F7FA', padding: 20 },
  logo: { width: 80, height: 80, alignSelf: 'center', resizeMode: 'contain', marginBottom: 8 },
  title: { fontSize: 20, fontWeight: '700', color: '#1D2254', textAlign: 'center', marginBottom: 20 },
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
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 15,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E7EB',
  },
  dividerText: {
    marginHorizontal: 10,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1D2254',
    marginBottom: 12,
    marginTop: 5,
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
    marginBottom: 12,
  },
  icon: { marginRight: 8 },
  input: { flex: 1, fontSize: 15, color: '#000', paddingVertical: 10 },
  eyeIcon: { paddingLeft: 8 },
  uploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderColor: '#EF3A3A',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 10,
  },
  uploadText: {
    marginLeft: 8,
    color: '#EF3A3A',
    fontWeight: '600',
    fontSize: 14,
  },
  filePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
  },
  fileName: {
    flex: 1,
    marginLeft: 8,
    color: '#10B981',
    fontSize: 13,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
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
  registerText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 },
  footerText: { textAlign: 'center', marginTop: 20, color: '#666', fontSize: 13 },
  imageUploadBtn: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 150,
    borderRadius: 12,
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  imagePlaceholder: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#DDD',
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 8,
    color: '#9CA3AF',
    fontSize: 14,
  },
});
