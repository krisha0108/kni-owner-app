import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert,
  ActivityIndicator, Image, Modal
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';

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
};

const RestaurantOnboarding = ({ navigation, route }) => {
  const isFirstRestaurant = route?.params?.isFirstRestaurant !== false; // default true for backward compatibility
  const [form, setForm] = useState({
    hotelName: '',
    address: '',
    city: '',
    pincode: '',
    fssaiNumber: '',
  });
  const [fssaiFile, setFssaiFile] = useState(null);
  const [mainImage, setMainImage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [selectedStateName, setSelectedStateName] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    api.get('/public/locations?type=states').then(res => {
      if (res.data.ok) setStates(res.data.data || []);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      api.get(`/public/locations?type=cities&stateId=${selectedStateId}`).then(res => {
        if (res.data.ok) setCities(res.data.data || []);
      }).catch(() => {});
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePickFile = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1920,
        maxHeight: 1920,
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          console.log('Image picker error:', response.errorMessage);
          Alert.alert('Error', 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setFssaiFile({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'fssai_certificate.jpg',
          });
        }
      }
    );
  };

  const handlePickImage = () => {
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
          Alert.alert('Error', 'Failed to pick image');
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

  const handleSubmit = async () => {
    const { hotelName, address, city, pincode, fssaiNumber } = form;

    // Validation
    if (!hotelName || hotelName.trim().length < 2) {
      Alert.alert('Required', 'Restaurant name must be at least 2 characters');
      return;
    }

    if (!address || address.trim().length < 5) {
      Alert.alert('Required', 'Address must be at least 5 characters');
      return;
    }

    if (!city || city.trim().length < 2) {
      Alert.alert('Required', 'City must be at least 2 characters');
      return;
    }

    if (!fssaiNumber || fssaiNumber.length !== 14) {
      Alert.alert('Required', 'FSSAI Number must be exactly 14 digits');
      return;
    }

    if (pincode && pincode.length !== 6) {
      Alert.alert('Invalid', 'Pincode must be exactly 6 digits');
      return;
    }

    if (!fssaiFile) {
      Alert.alert('Required', 'Please upload FSSAI Certificate');
      return;
    }

    setLoading(true);
    try {
      // Upload files first
      let restaurantImageUrl = '';
      let fssaiCertificateUrl = '';

      // Upload main image if provided
      if (mainImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', {
          uri: mainImage.uri,
          type: mainImage.type || 'image/jpeg',
          name: mainImage.name || 'restaurant.jpg',
        });
        imageFormData.append('folder', 'restaurants');

        const imageRes = await api.post('/upload', imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        if (imageRes.data?.ok) {
          restaurantImageUrl = imageRes.data.data.url;
        }
      }

      // Upload FSSAI certificate image
      const certFormData = new FormData();
      certFormData.append('file', {
        uri: fssaiFile.uri,
        type: fssaiFile.type || 'image/jpeg',
        name: fssaiFile.name || 'fssai_certificate.jpg',
      });
      certFormData.append('folder', 'fssai-certificates');

      const certRes = await api.post('/upload', certFormData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (!certRes.data?.ok) {
        throw new Error('Failed to upload FSSAI certificate');
      }

      fssaiCertificateUrl = certRes.data.data.url;

      // Create restaurant with URLs
      const res = await api.post('/owner/restaurants', {
        name: hotelName.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode || undefined,
        fssaiNumber: fssaiNumber,
        fssaiCertificateUrl,
        restaurantImageUrl: restaurantImageUrl || undefined,
      });

      if (res.data?.ok) {
        const restaurant = res.data?.data;

        // Navigate based on restaurant status and user type
        if (isFirstRestaurant) {
          // First-time user after registration
          if (restaurant?.status === 'PENDING') {
            Alert.alert(
              'Restaurant Submitted',
              'Your restaurant details have been submitted for admin approval. You will be notified once approved.',
              [
                {
                  text: 'OK',
                  onPress: () => navigation.replace('MyRestaurants'),
                },
              ]
            );
          } else {
            Alert.alert(
              'Success!',
              'Your restaurant has been set up successfully.',
              [
                {
                  text: 'Go to Home',
                  onPress: () => navigation.replace('Home'),
                },
              ]
            );
          }
        } else {
          // Existing user adding another restaurant - same flow as web
          Alert.alert(
            'Restaurant Added Successfully',
            restaurant?.status === 'PENDING'
              ? 'Your restaurant is pending admin approval.'
              : 'Your restaurant has been added.',
            [
              {
                text: 'OK',
                onPress: () => navigation.goBack(), // Go back to MyRestaurants
              },
            ]
          );
        }
      } else {
        Alert.alert('Error', res.data?.error || 'Failed to create restaurant');
      }
    } catch (err) {
      console.log('Restaurant creation error:', err?.response?.data || err.message);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Could not create restaurant. Please try again.';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={['#f2f4f7', '#dfe7ee']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Set Up Your Restaurant</Text>
        <Text style={styles.subheading}>
          Add your restaurant details to get started
        </Text>

        <View style={styles.card}>
          {/* Restaurant Image Upload */}
          <TouchableOpacity style={styles.imageUploadBtn} onPress={handlePickImage}>
            {mainImage ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: mainImage.uri }} style={styles.imagePreview} />
                <TouchableOpacity
                  style={styles.removeImageBtn}
                  onPress={() => setMainImage(null)}
                >
                  <Icon name="close-circle" size={24} color={C.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="camera-outline" size={40} color={C.muted} />
                <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
                <Text style={styles.imagePlaceholderHint}>(Optional)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Hotel Name */}
          <View style={styles.inputBox}>
            <Icon name="business" size={18} color={C.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="Restaurant/Hotel Name *"
              style={styles.input}
              value={form.hotelName}
              onChangeText={text => handleChange('hotelName', text)}
              placeholderTextColor={C.muted}
              returnKeyType="next"
            />
          </View>

          {/* Address */}
          <View style={[styles.inputBox, { alignItems: 'flex-start' }]}>
            <Icon name="location" size={18} color={C.primary} style={[styles.inputIcon, { marginTop: 12 }]} />
            <TextInput
              placeholder="Full Address (Street, Area, Landmark) *"
              style={[styles.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }]}
              multiline
              numberOfLines={3}
              value={form.address}
              onChangeText={text => handleChange('address', text)}
              placeholderTextColor={C.muted}
              returnKeyType="next"
            />
          </View>

          {/* State */}
          <TouchableOpacity style={styles.inputBox} onPress={() => setShowStatePicker(true)}>
            <Icon name="map" size={18} color={C.primary} style={styles.inputIcon} />
            <Text style={selectedStateName ? { flex: 1, color: C.text, fontSize: 15 } : { flex: 1, color: C.muted, fontSize: 15 }}>
              {selectedStateName || 'Select State *'}
            </Text>
            <Icon name="chevron-down" size={18} color={C.muted} />
          </TouchableOpacity>

          {/* City */}
          <TouchableOpacity
            style={styles.inputBox}
            onPress={() => {
              if (!selectedStateId) {
                Alert.alert('', 'Please select state first');
                return;
              }
              setShowCityPicker(true);
            }}
          >
            <Icon name="business" size={18} color={C.primary} style={styles.inputIcon} />
            <Text style={form.city ? { flex: 1, color: C.text, fontSize: 15 } : { flex: 1, color: C.muted, fontSize: 15 }}>
              {form.city || 'Select City *'}
            </Text>
            <Icon name="chevron-down" size={18} color={C.muted} />
          </TouchableOpacity>

          {/* Pincode */}
          <View style={styles.inputBox}>
            <Icon name="location-outline" size={18} color={C.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="Pincode (6 digits, optional)"
              style={styles.input}
              value={form.pincode}
              onChangeText={text => handleChange('pincode', text)}
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              maxLength={6}
              returnKeyType="next"
            />
          </View>

          {/* FSSAI Number */}
          <View style={styles.inputBox}>
            <Icon name="document-text" size={18} color={C.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="FSSAI Number (14 digits) *"
              style={styles.input}
              value={form.fssaiNumber}
              onChangeText={text => handleChange('fssaiNumber', text)}
              placeholderTextColor={C.muted}
              keyboardType="numeric"
              maxLength={14}
              returnKeyType="done"
            />
          </View>

          {/* Upload FSSAI Certificate */}
          <TouchableOpacity
            style={styles.uploadContainer}
            onPress={handlePickFile}
            activeOpacity={0.7}
          >
            <Icon name="cloud-upload-outline" size={20} color={C.primary} />
            <Text style={styles.uploadText} numberOfLines={1}>
              {fssaiFile ? fssaiFile.name : 'Upload FSSAI Certificate Image *'}
            </Text>
            {fssaiFile && (
              <TouchableOpacity onPress={() => setFssaiFile(null)}>
                <Icon name="close-circle" size={20} color={C.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={18} color={C.warn} />
            <Text style={styles.infoText}>
              All fields marked with * are required. Your restaurant will be reviewed by admin before activation.
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            onPress={handleSubmit}
            activeOpacity={0.9}
            style={styles.submitButtonContainer}
            disabled={loading}
          >
            <LinearGradient
              colors={['#ef3a3a', '#c22525']}
              style={[styles.submitButton, { opacity: loading ? 0.7 : 1 }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Text style={styles.submitText}>Complete Setup</Text>
                  <Icon name="arrow-forward" size={20} color="#fff" style={styles.submitIcon} />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* State Picker Modal */}
      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {states.map(state => (
                <TouchableOpacity
                  key={state.id}
                  style={[styles.pickerItem, selectedStateId === state.id && styles.pickerItemActive]}
                  onPress={() => {
                    setSelectedStateId(state.id);
                    setSelectedStateName(state.name);
                    handleChange('city', '');
                    setCities([]);
                    setShowStatePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, selectedStateId === state.id && styles.pickerItemTextActive]}>
                    {state.name}
                  </Text>
                  {selectedStateId === state.id && <Icon name="checkmark" size={20} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* City Picker Modal */}
      <Modal visible={showCityPicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select City</Text>
              <TouchableOpacity onPress={() => setShowCityPicker(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {cities.map(city => (
                <TouchableOpacity
                  key={city.id}
                  style={[styles.pickerItem, form.city === city.name && styles.pickerItemActive]}
                  onPress={() => {
                    handleChange('city', city.name);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, form.city === city.name && styles.pickerItemTextActive]}>
                    {city.name}
                  </Text>
                  {form.city === city.name && <Icon name="checkmark" size={20} color={C.primary} />}
                </TouchableOpacity>
              ))}
              {cities.length === 0 && (
                <Text style={styles.pickerEmptyText}>No cities available for this state</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    paddingBottom: 60,
  },
  heading: {
    fontSize: 26,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
    marginTop: 40,
    marginBottom: 8,
  },
  subheading: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 25,
    paddingHorizontal: 30,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    marginHorizontal: 20,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  imageUploadBtn: {
    marginBottom: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 180,
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
    backgroundColor: C.bg,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: 10,
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  imagePlaceholderHint: {
    marginTop: 4,
    color: C.muted,
    fontSize: 12,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 14,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 12,
    borderColor: C.primary,
    padding: 14,
    marginBottom: 16,
    backgroundColor: '#fff',
  },
  uploadText: {
    marginLeft: 10,
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    marginLeft: 8,
    color: '#92400E',
    fontSize: 12,
    lineHeight: 18,
  },
  submitButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButton: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  submitIcon: {
    marginLeft: 10,
  },

  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '50%',
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  pickerList: { paddingHorizontal: 8 },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerItemActive: { backgroundColor: '#FEE2E2' },
  pickerItemText: { fontSize: 15, color: C.ink },
  pickerItemTextActive: { color: C.primary, fontWeight: '600' },
  pickerEmptyText: { fontSize: 14, color: C.muted, textAlign: 'center', paddingVertical: 20 },
});

export default RestaurantOnboarding;
