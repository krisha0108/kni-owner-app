import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Image,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api, uploadFile } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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
  info: '#3B82F6',
};

export default function RestaurantCreateScreen({ navigation }) {
  const OUTLET_TYPES = [
    { key: 'CLOUD_KITCHEN', label: 'Cloud Kitchen' },
    { key: 'QSR', label: 'QSR (Quick Service)' },
    { key: 'FINE_DINE', label: 'Fine Dine' },
    { key: 'HOTEL', label: 'Hotel' },
    { key: 'CAFE', label: 'Cafe' },
    { key: 'CATERING', label: 'Catering' },
    { key: 'HOSPITAL', label: 'Hospital' },
    { key: 'INDUSTRIES', label: 'Industries' },
    { key: 'INSTITUTE', label: 'Institute' },
  ];

  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    pincode: '',
    outletType: '',
    restaurantImageUrl: '',
    fssaiNumber: '',
    fssaiCertificateUrl: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(null); // 'restaurant' or 'fssai'
  const [menuVisible, setMenuVisible] = useState(false);
  const [states, setStates] = useState([]);
  const [cities, setCities] = useState([]);
  const [selectedStateId, setSelectedStateId] = useState(null);
  const [selectedStateName, setSelectedStateName] = useState('');
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);
  const [showOutletTypePicker, setShowOutletTypePicker] = useState(false);

  useEffect(() => {
    api.get('/public/locations?type=states').then(res => {
      if (res.data.ok) setStates(res.data.data || []);
    }).catch((error) => {
      console.error('Failed to load states:', error);
      Alert.alert('Error', 'Failed to load states');
    });
  }, []);

  useEffect(() => {
    if (selectedStateId) {
      api.get(`/public/locations?type=cities&stateId=${selectedStateId}`).then(res => {
        if (res.data.ok) setCities(res.data.data || []);
      }).catch((error) => {
        console.error('Failed to load cities:', error);
        Alert.alert('Error', 'Failed to load cities');
      });
    } else {
      setCities([]);
    }
  }, [selectedStateId]);

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const pickImage = async (type) => {
    try {
      const result = await launchImageLibrary({
        mediaType: 'photo',
        quality: 0.8,
        maxWidth: scale(1200),
        maxHeight: scale(1200),
      });

      if (result.didCancel || !result.assets?.[0]) return;

      const asset = result.assets[0];
      setUploadingImage(type);

      // Upload the image
      const formDataUpload = new FormData();
      formDataUpload.append('file', {
        uri: asset.uri,
        type: asset.type || 'image/jpeg',
        name: asset.fileName || 'image.jpg',
      });
      formDataUpload.append('folder', type === 'restaurant' ? 'restaurants' : 'fssai-certificates');

      const response = await uploadFile(formDataUpload);

      if (response.data.ok) {
        const field = type === 'restaurant' ? 'restaurantImageUrl' : 'fssaiCertificateUrl';
        updateField(field, response.data.data.url);
      } else {
        Alert.alert('Error', 'Failed to upload image');
      }
    } catch (error) {
      console.log('Image upload error:', error);
      Alert.alert('Error', 'Failed to upload image');
    } finally {
      setUploadingImage(null);
    }
  };

  const removeImage = (type) => {
    const field = type === 'restaurant' ? 'restaurantImageUrl' : 'fssaiCertificateUrl';
    updateField(field, '');
  };

  const handleSubmit = async () => {
    // Validation
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter restaurant name');
      return;
    }
    if (!formData.address.trim()) {
      Alert.alert('Error', 'Please enter address');
      return;
    }
    if (!formData.city.trim()) {
      Alert.alert('Error', 'Please enter city');
      return;
    }
    if (!formData.pincode.trim() || formData.pincode.length !== 6) {
      Alert.alert('Error', 'Please enter a valid 6-digit pincode');
      return;
    }
    if (!formData.fssaiNumber.trim() || formData.fssaiNumber.length !== 14) {
      Alert.alert('Error', 'Please enter a valid 14-digit FSSAI number');
      return;
    }
    if (!formData.fssaiCertificateUrl) {
      Alert.alert('Error', 'Please upload FSSAI certificate');
      return;
    }

    setIsLoading(true);

    try {
      const response = await api.post('/owner/restaurants', formData);

      if (response.data.ok) {
        Alert.alert(
          'Success',
          'Restaurant submitted for approval',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } else {
        Alert.alert('Error', response.data.error || 'Failed to create restaurant');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to create restaurant');
    } finally {
      setIsLoading(false);
    }
  };

  const renderImageUpload = (type, title, imageUrl, isOptional = false) => (
    <View style={styles.uploadSection}>
      <Text style={styles.sectionLabel}>
        {title} {!isOptional && '*'}
      </Text>
      {imageUrl ? (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: imageUrl }} style={styles.imagePreview} />
          <TouchableOpacity
            style={styles.removeImageBtn}
            onPress={() => removeImage(type)}
          >
            <Icon name="close-circle" size={scale(24)} color={C.danger} />
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.uploadBox}
          onPress={() => pickImage(type)}
          disabled={uploadingImage !== null}
        >
          {uploadingImage === type ? (
            <ActivityIndicator color={C.primary} size="small" />
          ) : (
            <>
              <Icon name="cloud-upload-outline" size={scale(32)} color={C.muted} />
              <Text style={styles.uploadText}>Tap to upload</Text>
              <Text style={styles.uploadHint}>Max 5MB, JPG/PNG</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add New Restaurant</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.subtitle}>
            Register a new restaurant location for approval
          </Text>

          {/* Basic Information */}
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Basic Information</Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Restaurant Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="My Restaurant"
                placeholderTextColor={C.muted}
                value={formData.name}
                onChangeText={(v) => updateField('name', v)}
                editable={!isLoading}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Address *</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                placeholder="123 Main Street, Downtown"
                placeholderTextColor={C.muted}
                value={formData.address}
                onChangeText={(v) => updateField('address', v)}
                editable={!isLoading}
                multiline
                numberOfLines={2}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>State *</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowStatePicker(true)}
                disabled={isLoading}
              >
                <Text style={selectedStateName ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                  {selectedStateName || 'Select State'}
                </Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.row}>
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>City *</Text>
                <TouchableOpacity
                  style={styles.pickerBtn}
                  onPress={() => {
                    if (!selectedStateId) {
                      Alert.alert('', 'Please select state first');
                      return;
                    }
                    setShowCityPicker(true);
                  }}
                  disabled={isLoading}
                >
                  <Text style={formData.city ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                    {formData.city || 'Select City'}
                  </Text>
                  <Icon name="chevron-down" size={scale(18)} color={C.muted} />
                </TouchableOpacity>
              </View>
              <View style={{ width: scale(12) }} />
              <View style={[styles.inputGroup, { flex: 1 }]}>
                <Text style={styles.label}>Pincode *</Text>
                <TextInput
                  style={styles.input}
                  placeholder="400001"
                  placeholderTextColor={C.muted}
                  value={formData.pincode}
                  onChangeText={(v) => updateField('pincode', v.replace(/\D/g, '').slice(0, 6))}
                  editable={!isLoading}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Outlet Type</Text>
              <TouchableOpacity
                style={styles.pickerBtn}
                onPress={() => setShowOutletTypePicker(true)}
                disabled={isLoading}
              >
                <Text style={formData.outletType ? styles.pickerBtnText : styles.pickerBtnPlaceholder}>
                  {formData.outletType ? OUTLET_TYPES.find(o => o.key === formData.outletType)?.label : 'Select Outlet Type'}
                </Text>
                <Icon name="chevron-down" size={scale(18)} color={C.muted} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Restaurant Image */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="image-outline" size={scale(20)} color={C.ink} />
              <Text style={styles.sectionTitle}>Restaurant Image</Text>
              <Text style={styles.optionalTag}>(Optional)</Text>
            </View>
            {renderImageUpload('restaurant', 'Restaurant Photo', formData.restaurantImageUrl, true)}
            <Text style={styles.helperText}>
              Upload a photo of your restaurant (front view, dining area, or logo)
            </Text>
          </View>

          {/* FSSAI Details */}
          <View style={styles.card}>
            <View style={styles.sectionHeader}>
              <Icon name="document-text-outline" size={scale(20)} color={C.ink} />
              <Text style={styles.sectionTitle}>FSSAI Details</Text>
              <Text style={styles.requiredTag}>(Required)</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>FSSAI License Number *</Text>
              <TextInput
                style={styles.input}
                placeholder="14 digit FSSAI number"
                placeholderTextColor={C.muted}
                value={formData.fssaiNumber}
                onChangeText={(v) => updateField('fssaiNumber', v.replace(/\D/g, '').slice(0, 14))}
                editable={!isLoading}
                keyboardType="number-pad"
                maxLength={14}
              />
              <Text style={styles.helperText}>
                Enter your 14-digit FSSAI license number
              </Text>
            </View>

            {renderImageUpload('fssai', 'FSSAI Certificate', formData.fssaiCertificateUrl)}
            <Text style={styles.helperText}>
              Upload a clear photo or scan of your FSSAI license certificate
            </Text>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitBtn, isLoading && styles.disabledBtn]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Icon name="checkmark-circle" size={scale(20)} color="#fff" />
                <Text style={styles.submitBtnText}>Submit for Approval</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={{ height: scale(40) }} />
        </ScrollView>
      </KeyboardAvoidingView>
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
                    updateField('city', '');
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
                  style={[styles.pickerItem, formData.city === city.name && styles.pickerItemActive]}
                  onPress={() => {
                    updateField('city', city.name);
                    setShowCityPicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, formData.city === city.name && styles.pickerItemTextActive]}>
                    {city.name}
                  </Text>
                  {formData.city === city.name && <Icon name="checkmark" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
              {cities.length === 0 && (
                <Text style={styles.pickerEmpty}>No cities available for this state</Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Outlet Type Picker Modal */}
      <Modal visible={showOutletTypePicker} transparent animationType="slide">
        <View style={styles.pickerOverlay}>
          <View style={styles.pickerContainer}>
            <View style={styles.pickerHeader}>
              <Text style={styles.pickerTitle}>Select Outlet Type</Text>
              <TouchableOpacity onPress={() => setShowOutletTypePicker(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.pickerList}>
              {OUTLET_TYPES.map(type => (
                <TouchableOpacity
                  key={type.key}
                  style={[styles.pickerItem, formData.outletType === type.key && styles.pickerItemActive]}
                  onPress={() => {
                    updateField('outletType', type.key);
                    setShowOutletTypePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, formData.outletType === type.key && styles.pickerItemTextActive]}>
                    {type.label}
                  </Text>
                  {formData.outletType === type.key && <Icon name="checkmark" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: C.ink },
  keyboardView: { flex: 1 },
  scrollContent: { padding: scale(16) },
  subtitle: { fontSize: moderateScale(14), color: C.muted, marginBottom: scale(16) },

  card: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(16),
    borderWidth: 1,
    borderColor: C.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginBottom: scale(12),
  },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  optionalTag: { fontSize: moderateScale(12), color: C.muted },
  requiredTag: { fontSize: moderateScale(12), color: C.primary },

  inputGroup: { marginBottom: scale(12) },
  label: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginBottom: scale(6) },
  input: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: scale(14),
    height: scale(48),
    fontSize: moderateScale(15),
    color: C.text,
  },
  multilineInput: {
    height: scale(80),
    paddingTop: scale(12),
    textAlignVertical: 'top',
  },
  row: { flexDirection: 'row' },
  helperText: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },

  uploadSection: { marginBottom: scale(8) },
  sectionLabel: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginBottom: scale(8) },
  uploadBox: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: C.border,
    borderRadius: scale(12),
    padding: scale(24),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.bg,
  },
  uploadText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, marginTop: scale(8) },
  uploadHint: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) },

  imagePreviewContainer: { position: 'relative' },
  imagePreview: {
    width: '100%',
    height: scale(150),
    borderRadius: scale(12),
    backgroundColor: C.bg,
  },
  removeImageBtn: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: C.card,
    borderRadius: scale(12),
  },

  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    height: scale(52),
    marginTop: scale(8),
  },
  disabledBtn: { opacity: 0.7 },
  submitBtnText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },

  // Picker button
  pickerBtn: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: scale(14),
    height: scale(48),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pickerBtnText: { fontSize: moderateScale(15), color: C.text },
  pickerBtnPlaceholder: { fontSize: moderateScale(15), color: C.muted },

  // Picker modal
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
