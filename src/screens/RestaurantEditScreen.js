import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert,
  ActivityIndicator, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, getImageUrl } from '../api/client';

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

  useEffect(() => {
    loadRestaurant();
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

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handlePickRestaurantImage = () => {
    launchImageLibrary(
      {
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: 1024,
        maxHeight: 1024,
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
        maxWidth: 1920,
        maxHeight: 1920,
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

        const imageRes = await api.post('/upload', imageFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

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

        const certRes = await api.post('/upload', certFormData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

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
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Restaurant</Text>
          <View style={{ width: 40 }} />
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
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Restaurant</Text>
        <View style={{ width: 40 }} />
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
                <Icon name="camera" size={20} color={C.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.imagePlaceholder}>
              <Icon name="camera-outline" size={40} color={C.muted} />
              <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Basic Information */}
        <Text style={styles.sectionTitle}>Basic Information</Text>

        <View style={styles.inputBox}>
          <Icon name="business" size={18} color={C.primary} style={styles.inputIcon} />
          <TextInput
            placeholder="Restaurant Name *"
            style={styles.input}
            value={form.name}
            onChangeText={text => handleChange('name', text)}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={[styles.inputBox, { alignItems: 'flex-start' }]}>
          <Icon name="location" size={18} color={C.primary} style={[styles.inputIcon, { marginTop: 12 }]} />
          <TextInput
            placeholder="Full Address *"
            style={[styles.input, { minHeight: 70, textAlignVertical: 'top', paddingTop: 10 }]}
            multiline
            numberOfLines={3}
            value={form.address}
            onChangeText={text => handleChange('address', text)}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={styles.inputBox}>
          <Icon name="business" size={18} color={C.primary} style={styles.inputIcon} />
          <TextInput
            placeholder="City *"
            style={styles.input}
            value={form.city}
            onChangeText={text => handleChange('city', text)}
            placeholderTextColor={C.muted}
          />
        </View>

        <View style={styles.inputBox}>
          <Icon name="location-outline" size={18} color={C.primary} style={styles.inputIcon} />
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
          <Icon name="document-text" size={18} color={C.primary} style={styles.inputIcon} />
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
                <Icon name="camera" size={20} color={C.card} />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.certificatePlaceholder}>
              <Icon name="cloud-upload-outline" size={30} color={C.primary} />
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
                <Icon name="checkmark" size={20} color={C.card} />
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: C.muted,
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
    marginTop: 8,
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
  certificatePreview: {
    width: '100%',
    height: 120,
    borderRadius: 12,
    resizeMode: 'contain',
    backgroundColor: C.card,
  },
  changeImageBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: C.primary,
    borderRadius: 20,
    padding: 8,
  },
  imagePlaceholder: {
    backgroundColor: C.card,
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
  certificatePlaceholder: {
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    height: 80,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  certificatePlaceholderText: {
    color: C.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    marginBottom: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: 15,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: C.text,
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  saveButtonDisabled: {
    opacity: 0.7,
  },
  saveButtonText: {
    color: C.card,
    fontSize: 15,
    fontWeight: '600',
  },
});
