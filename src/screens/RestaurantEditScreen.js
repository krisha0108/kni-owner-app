import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert,
  ActivityIndicator, Image, Modal, Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, getImageUrl, uploadFile } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
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

export default function RestaurantEditScreen({ navigation, route }) {
  const { restaurantId } = route.params;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    fssaiNumber: '',
  });
  const [restaurantImageUrl, setRestaurantImageUrl] = useState(null);
  const [fssaiCertificateUrl, setFssaiCertificateUrl] = useState(null);
  const [newRestaurantImage, setNewRestaurantImage] = useState(null);
  const [newFssaiCertificate, setNewFssaiCertificate] = useState(null);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [selectedStateName, setSelectedStateName] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  useEffect(() => {
    loadRestaurant();
    api.get('/public/locations?type=states').then(res => {
      if (res.data.ok) setStates(res.data.data || []);
    }).catch(() => {});
  }, []);

  const loadRestaurant = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/owner/restaurants/${restaurantId}`);
      if (response.data.ok) {
        const restaurant = response.data.data;
        setForm({
          name: restaurant.name || '',
          address: restaurant.address || '',
          city: restaurant.city || '',
          pincode: restaurant.pincode || '',
          fssaiNumber: restaurant.fssaiNumber || '',
        });
        setRestaurantImageUrl(restaurant.restaurantImageUrl);
        setFssaiCertificateUrl(restaurant.fssaiCertificateUrl);
      } else {
        Alert.alert('Error', response.data.error || 'Failed to load restaurant');
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error loading restaurant:', error);
      Alert.alert('Error', 'Failed to load restaurant details');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  // Load cities when state changes
  useEffect(() => {
    if (selectedStateId) {
      api.get(`/public/locations?type=cities&stateId=${selectedStateId}`).then(res => {
        if (res.data.ok) setCities(res.data.data || []);
      }).catch(() => {});
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  // Try to find the matching state/city when restaurant data loads
  useEffect(() => {
    if (form.city && states.length > 0 && !selectedStateId) {
      // Search through all states to find which one has this city
      const findCity = async () => {
        for (const state of states) {
          try {
            const res = await api.get(`/public/locations?type=cities&stateId=${state.id}`);
            if (res.data.ok) {
              const match = (res.data.data || []).find(c => c.name === form.city);
              if (match) {
                setSelectedStateId(state.id);
                setSelectedStateName(state.name);
                setCities(res.data.data);
                return;
              }
            }
          } catch {}
        }
      };
      findCity();
    }
  }, [form.city, states]);

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePickRestaurantImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: scale(1024),
        maxHeight: scale(1024),
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setNewRestaurantImage({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'restaurant_image.jpg',
          });
        }
      }
    );
  };

  const handlePickFssaiCertificate = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: scale(1920),
        maxHeight: scale(1920),
      },
      (response) => {
        if (response.didCancel) return;
        if (response.errorCode) {
          Alert.alert('Error', 'Failed to pick image');
          return;
        }
        if (response.assets && response.assets[0]) {
          const asset = response.assets[0];
          setNewFssaiCertificate({
            uri: asset.uri,
            type: asset.type || 'image/jpeg',
            name: asset.fileName || 'fssai_certificate.jpg',
          });
        }
      }
    );
  };

  const handleSave = async () => {
    const { name, address, city, pincode, fssaiNumber } = form;

    // Validation
    if (!name || name.trim().length < 2) {
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

    if (fssaiNumber && fssaiNumber.length !== 14) {
      Alert.alert('Invalid', 'FSSAI Number must be exactly 14 digits');
      return;
    }

    if (pincode && pincode.length !== 6) {
      Alert.alert('Invalid', 'Pincode must be exactly 6 digits');
      return;
    }

    setSaving(true);
    try {
      let finalRestaurantImageUrl = restaurantImageUrl;
      let finalFssaiCertificateUrl = fssaiCertificateUrl;

      // Upload new restaurant image if selected
      if (newRestaurantImage) {
        const imageFormData = new FormData();
        imageFormData.append('file', {
          uri: newRestaurantImage.uri,
          type: newRestaurantImage.type || 'image/jpeg',
          name: newRestaurantImage.name || 'restaurant.jpg',
        });
        imageFormData.append('folder', 'restaurants');

        const imageRes = await uploadFile(imageFormData);

        if (imageRes.data?.ok) {
          finalRestaurantImageUrl = imageRes.data.data.url;
        }
      }

      // Upload new FSSAI certificate if selected
      if (newFssaiCertificate) {
        const certFormData = new FormData();
        certFormData.append('file', {
          uri: newFssaiCertificate.uri,
          type: newFssaiCertificate.type || 'image/jpeg',
          name: newFssaiCertificate.name || 'fssai_certificate.jpg',
        });
        certFormData.append('folder', 'fssai-certificates');

        const certRes = await uploadFile(certFormData);

        if (certRes.data?.ok) {
          finalFssaiCertificateUrl = certRes.data.data.url;
        }
      }

      // Update restaurant
      const response = await api.patch(`/owner/restaurants/${restaurantId}`, {
        name: name.trim(),
        address: address.trim(),
        city: city.trim(),
        pincode: pincode || undefined,
        fssaiNumber: fssaiNumber || undefined,
        restaurantImageUrl: finalRestaurantImageUrl || undefined,
        fssaiCertificateUrl: finalFssaiCertificateUrl || undefined,
      });

      if (response.data?.ok) {
        Alert.alert('Success', 'Restaurant updated successfully', [
          { text: 'OK', onPress: () => navigation.goBack() }
        ]);
      } else {
        Alert.alert('Error', response.data?.error || 'Failed to update restaurant');
      }
    } catch (error) {
      console.error('Error updating restaurant:', error);
      Alert.alert('Error', error?.response?.data?.error || 'Failed to update restaurant');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(24)} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Restaurant</Text>
          <View style={{ width: scale(40) }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading restaurant...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const displayRestaurantImage = newRestaurantImage?.uri || (restaurantImageUrl ? getImageUrl(restaurantImageUrl) : null);
  const displayFssaiCertificate = newFssaiCertificate?.uri || (fssaiCertificateUrl ? getImageUrl(fssaiCertificateUrl) : null);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Restaurant</Text>
        <View style={{ width: scale(40) }} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Restaurant Image */}
        <Text style={styles.sectionTitle}>Restaurant Image</Text>
        <TouchableOpacity style={styles.imageUploadBtn} onPress={handlePickRestaurantImage}>
          {displayRestaurantImage ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: displayRestaurantImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={handlePickRestaurantImage}
              >
                <Icon name="camera" size={scale(20)} color={C.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera-outline" size={scale(40)} color={C.muted} />
              <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Basic Information */}
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <View style={styles.inputBox}>
          <Icon name="business" size={scale(18)} color={C.primary} style={styles.inputIcon} />
          <TextInput
            placeholder="Restaurant Name *"
            style={styles.input}
            value={form.name}
            onChangeText={text => handleChange('name', text)}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={[styles.inputBox, { alignItems: 'flex-start' }]}>
          <Icon name="location" size={scale(18)} color={C.primary} style={[styles.inputIcon, { marginTop: scale(12) }]} />
          <TextInput
            placeholder="Full Address *"
            style={[styles.input, { minHeight: scale(70), textAlignVertical: 'top', paddingTop: scale(10) }]}
            multiline
            numberOfLines={3}
            value={form.address}
            onChangeText={text => handleChange('address', text)}
            placeholderTextColor={C.muted}
          />
        </View>

        <Text style={styles.pickerLabel}>State *</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => setShowStatePicker(true)}
          disabled={saving}
        >
          <Icon name="map" size={scale(18)} color={C.primary} style={styles.inputIcon} />
          <Text style={selectedStateName ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
            {selectedStateName || 'Select State'}
          </Text>
          <Icon name="chevron-down" size={scale(18)} color={C.muted} />
        </TouchableOpacity>

        <Text style={styles.pickerLabel}>City *</Text>
        <TouchableOpacity
          style={styles.pickerBtn}
          onPress={() => {
            if (!selectedStateId) {
              Alert.alert('', 'Please select state first');
              return;
            }
            setShowCityPicker(true);
          }}
          disabled={saving}
        >
          <Icon name="business" size={scale(18)} color={C.primary} style={styles.inputIcon} />
          <Text style={form.city ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
            {form.city || 'Select City'}
          </Text>
          <Icon name="chevron-down" size={scale(18)} color={C.muted} />
        </TouchableOpacity>

        <View style={styles.inputBox}>
          <Icon name="location-outline" size={scale(18)} color={C.primary} style={styles.inputIcon} />
          <TextInput
            placeholder="Pincode (6 digits)"
            style={styles.input}
            value={form.pincode}
            onChangeText={text => handleChange('pincode', text)}
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            maxLength={6}
          />
        </View>

        {/* FSSAI Details */}
        <Text style={styles.sectionTitle}>FSSAI Details</Text>

        <View style={styles.inputBox}>
          <Icon name="document-text" size={scale(18)} color={C.primary} style={styles.inputIcon} />
          <TextInput
            placeholder="FSSAI Number (14 digits)"
            style={styles.input}
            value={form.fssaiNumber}
            onChangeText={text => handleChange('fssaiNumber', text)}
            placeholderTextColor={C.muted}
            keyboardType="numeric"
            maxLength={14}
          />
        </View>

        <TouchableOpacity style={styles.imageUploadBtn} onPress={handlePickFssaiCertificate}>
          {displayFssaiCertificate ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: displayFssaiCertificate }} style={styles.certificatePreview} />
              <TouchableOpacity
                style={styles.changeImageBtn}
                onPress={handlePickFssaiCertificate}
              >
                <Icon name="camera" size={scale(20)} color={C.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.certificatePlaceholder}>
              <Icon name="cloud-upload-outline" size={scale(30)} color={C.primary} />
              <Text style={styles.certificatePlaceholderText}>Upload FSSAI Certificate</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Action Buttons */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
            disabled={saving}
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.saveButton, saving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={C.card} />
            ) : (
              <>
                <Icon name="checkmark" size={scale(20)} color={C.card} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: scale(40) }} />
      </ScrollView>

      {/* State Picker Modal */}
      <Modal visible={showStatePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select State</Text>
              <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
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
                  {selectedStateId === state.id && <Icon name="checkmark" size={scale(20)} color={C.primary} />}
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
                <Icon name="close" size={scale(24)} color={C.ink} />
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
                  {form.city === city.name && <Icon name="checkmark" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
              {cities.length === 0 && (
                <Text style={styles.pickerEmpty}>No cities available for this state</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: scale(40),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: scale(16),
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: moderateScale(14),
    color: C.muted,
    marginTop: scale(12),
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(12),
    marginTop: scale(8),
  },
  imageUploadBtn: {
    marginBottom: scale(16),
    borderRadius: scale(12),
    overflow: 'hidden',
  },
  imagePreviewContainer: {
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: scale(180),
    borderRadius: scale(12),
  },
  certificatePreview: {
    width: '100%',
    height: scale(120),
    borderRadius: scale(12),
    resizeMode: 'contain',
    backgroundColor: C.card,
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: scale(8),
    right: scale(8),
    backgroundColor: C.primary,
    borderRadius: scale(20),
    padding: scale(8),
  },
  imagePlaceholder: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.border,
    borderStyle: 'dashed',
    borderRadius: scale(12),
    height: scale(140),
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    marginTop: scale(10),
    color: C.text,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  certificatePlaceholder: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: scale(12),
    height: scale(80),
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: scale(8),
  },
  certificatePlaceholderText: {
    color: C.primary,
    fontSize: moderateScale(14),
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: Platform.OS === 'ios' ? scale(12) : scale(10),
    marginBottom: scale(12),
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: moderateScale(15),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(24),
  },
  cancelButton: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: C.text,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: C.card,
    fontSize: moderateScale(15),
    fontWeight: '600',
  },
  pickerLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.ink,
    marginBottom: scale(6),
  },
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: Platform.OS === 'ios' ? scale(14) : scale(12),
    marginBottom: scale(12),
  },
  pickerBtnText: { flex: 1, fontSize: moderateScale(15), color: C.text },
  pickerBtnPlaceholder: { flex: 1, fontSize: moderateScale(15), color: C.muted },
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(20),
    borderTopRightRadius: scale(20),
    maxHeight: SCREEN_HEIGHT * 0.5,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  pickerList: { paddingHorizontal: scale(8) },
  pickerItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  pickerItemActive: { backgroundColor: '#FEE2E2' },
  pickerItemText: { fontSize: moderateScale(15), color: C.ink },
  pickerItemTextActive: { color: C.primary, fontWeight: '600' },
  pickerEmpty: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', paddingVertical: scale(20) },
});
