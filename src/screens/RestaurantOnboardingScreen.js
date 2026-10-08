import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform,
  ActivityIndicator, Image, Modal, Dimensions, BackHandler, Keyboard, StatusBar
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import LinearGradient from 'react-native-linear-gradient';
import { api, uploadFile } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { invalidate } from '../utils/focusCache';
import AppAlert from '../utils/AppAlert';

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
};

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

const RestaurantOnboarding = ({ navigation, route }) => {
  const isFirstRestaurant = route?.params?.isFirstRestaurant !== false; // default true for backward compatibility
  const { loadRestaurants } = useRestaurant();

  // Back handling. Existing users (added another restaurant) simply pop back.
  // Users arriving here with no screen behind (first login after account
  // approval, or first-time Google sign-in) can skip for now — they land on
  // Home, which already shows a "No Restaurant Selected" empty state with its
  // own "Add Restaurant" entry point, so there's no need to sign them out.
  const handleBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
      return;
    }
    AppAlert.alert(
      'Add restaurant later?',
      'You can explore the app and add your restaurant anytime from the home screen.',
      [
        { text: 'Stay', style: 'cancel' },
        {
          text: 'Skip for now',
          onPress: () => navigation.replace('Home'),
        },
      ]
    );
  };

  useEffect(() => {
    const onHardwareBack = () => {
      if (navigation.canGoBack()) return false; // let the default pop happen
      handleBack(); // no back stack -> show exit confirmation
      return true;  // prevent the app from closing
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
    return () => sub.remove();
  }, [navigation]);

  // Track keyboard height so we can pad the form's bottom by exactly that much.
  // This lets the whole form scroll above the keyboard even when the OS window
  // doesn't resize (common on Android with the new architecture / edge-to-edge).
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, (e) =>
      setKeyboardHeight(e?.endCoordinates?.height || 0)
    );
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardHeight(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // Auto-scroll the focused input above the keyboard. Falls back gracefully
  // (no-op) if the scroll responder isn't available; the keyboard-height
  // padding above still lets the user scroll manually.
  const scrollRef = useRef(null);
  const scrollFocusedIntoView = (e) => {
    const node = e?.target;
    if (node == null) return;
    setTimeout(() => {
      const responder = scrollRef.current?.getScrollResponder?.();
      responder?.scrollResponderScrollNativeHandleToKeyboard?.(node, scale(100), true);
    }, 60);
  };
  const [form, setForm] = useState({
    hotelName: '',
    address: '',
    city: '',
    pincode: '',
    outletType: '',
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
  const [showOutletTypePicker, setShowOutletTypePicker] = useState(false);

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
        maxWidth: scale(1920),
        maxHeight: scale(1920),
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          console.log('Image picker error:', response.errorMessage);
          AppAlert.alert('Error', 'Failed to pick image');
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
        maxWidth: scale(1024),
        maxHeight: scale(1024),
      },
      (response) => {
        if (response.didCancel) {
          return;
        }
        if (response.errorCode) {
          console.log('Image picker error:', response.errorMessage);
          AppAlert.alert('Error', 'Failed to pick image');
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
      AppAlert.alert('Required', 'Restaurant name must be at least 2 characters');
      return;
    }

    if (!address || address.trim().length < 5) {
      AppAlert.alert('Required', 'Address must be at least 5 characters');
      return;
    }

    if (!city || city.trim().length < 2) {
      AppAlert.alert('Required', 'City must be at least 2 characters');
      return;
    }

    if (!fssaiNumber || fssaiNumber.length !== 14) {
      AppAlert.alert('Required', 'FSSAI Number must be exactly 14 digits');
      return;
    }

    if (pincode && pincode.length !== 6) {
      AppAlert.alert('Invalid', 'Pincode must be exactly 6 digits');
      return;
    }

    if (!fssaiFile) {
      AppAlert.alert('Required', 'Please upload FSSAI Certificate');
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

        const imageRes = await uploadFile(imageFormData);

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

      const certRes = await uploadFile(certFormData);

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
        outletType: form.outletType || undefined,
        fssaiNumber: fssaiNumber,
        fssaiCertificateUrl,
        restaurantImageUrl: restaurantImageUrl || undefined,
      });

      if (res.data?.ok) {
        const restaurant = res.data?.data;

        // Force-refresh the shared restaurant list so Home/selectors don't
        // show stale (pre-creation) data if navigated back within the TTL.
        loadRestaurants({ force: true });
        // MyRestaurantsScreen keeps its own staleness cache, separate from
        // the RestaurantContext one above — invalidate it too.
        invalidate('MyRestaurants-list');

        // Navigate based on restaurant status and user type
        if (isFirstRestaurant) {
          // First-time user after registration
          if (restaurant?.status === 'PENDING') {
            AppAlert.alert(
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
            AppAlert.alert(
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
          AppAlert.alert(
            'Restaurant Added Successfully',
            restaurant?.status === 'PENDING'
              ? 'Your restaurant is pending admin approval.'
              : 'Your restaurant has been added.',
            [
              {
                text: 'OK',
                onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')), // Go back to MyRestaurants
              },
            ]
          );
        }
      } else {
        AppAlert.alert('Error', res.data?.error || 'Failed to create restaurant');
      }
    } catch (err) {
      console.log('Restaurant creation error:', err?.response?.data || err.message);
      const errorMessage =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        'Could not create restaurant. Please try again.';
      AppAlert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <TouchableOpacity
        onPress={handleBack}
        style={styles.floatBackBtn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Icon name="arrow-back" size={scale(22)} color={C.ink} />
      </TouchableOpacity>

      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.scrollContainer,
          { paddingBottom: scale(40) + keyboardHeight },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
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
                  <Icon name="close-circle" size={scale(24)} color={C.primary} />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.imagePlaceholder}>
                <Icon name="camera-outline" size={scale(40)} color={C.muted} />
                <Text style={styles.imagePlaceholderText}>Add Restaurant Photo</Text>
                <Text style={styles.imagePlaceholderHint}>(Optional)</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Hotel Name */}
          <View style={styles.inputBox}>
            <Icon name="business" size={scale(18)} color={C.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="Restaurant/Hotel Name *"
              onFocus={scrollFocusedIntoView}
              style={styles.input}
              value={form.hotelName}
              onChangeText={text => handleChange('hotelName', text)}
              placeholderTextColor={C.muted}
              returnKeyType="next"
            />
          </View>

          {/* Address */}
          <View style={[styles.inputBox, { alignItems: 'flex-start' }]}>
            <Icon name="location" size={scale(18)} color={C.primary} style={[styles.inputIcon, { marginTop: scale(12) }]} />
            <TextInput
              placeholder="Full Address (Street, Area, Landmark) *"
              onFocus={scrollFocusedIntoView}
              style={[styles.input, { minHeight: scale(70), textAlignVertical: 'top', paddingTop: scale(10) }]}
              multiline
              numberOfLines={3}
              value={form.address}
              onChangeText={text => handleChange('address', text)}
              placeholderTextColor={C.muted}
              returnKeyType="next"
            />
          </View>

          {/* State + City */}
          <View style={styles.row2}>
            <TouchableOpacity style={[styles.inputBox, styles.row2Item]} onPress={() => setShowStatePicker(true)}>
              <Icon name="map" size={scale(18)} color={C.primary} style={styles.inputIcon} />
              <Text style={selectedStateName ? { flex: 1, color: C.text, fontSize: moderateScale(15) } : { flex: 1, color: C.muted, fontSize: moderateScale(15) }} numberOfLines={1}>
                {selectedStateName || 'Select State *'}
              </Text>
              <Icon name="chevron-down" size={scale(18)} color={C.muted} />
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.inputBox, styles.row2Item]}
              onPress={() => {
                if (!selectedStateId) {
                  AppAlert.alert('', 'Please select state first');
                  return;
                }
                setShowCityPicker(true);
              }}
            >
              <Icon name="business" size={scale(18)} color={C.primary} style={styles.inputIcon} />
              <Text style={form.city ? { flex: 1, color: C.text, fontSize: moderateScale(15) } : { flex: 1, color: C.muted, fontSize: moderateScale(15) }} numberOfLines={1}>
                {form.city || 'Select City *'}
              </Text>
              <Icon name="chevron-down" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* Pincode + Outlet Type */}
          <View style={styles.row2}>
            <View style={[styles.inputBox, styles.row2Item]}>
              <Icon name="location-outline" size={scale(18)} color={C.primary} style={styles.inputIcon} />
              <TextInput
                placeholder="Pincode"
                onFocus={scrollFocusedIntoView}
                style={styles.input}
                value={form.pincode}
                onChangeText={text => handleChange('pincode', text)}
                placeholderTextColor={C.muted}
                keyboardType="numeric"
                maxLength={6}
                returnKeyType="next"
              />
            </View>

            <TouchableOpacity style={[styles.inputBox, styles.row2Item]} onPress={() => setShowOutletTypePicker(true)}>
              <Icon name="storefront" size={scale(18)} color={C.primary} style={styles.inputIcon} />
              <Text style={form.outletType ? { flex: 1, color: C.text, fontSize: moderateScale(15) } : { flex: 1, color: C.muted, fontSize: moderateScale(15) }} numberOfLines={1}>
                {form.outletType ? OUTLET_TYPES.find(o => o.key === form.outletType)?.label : 'Outlet Type'}
              </Text>
              <Icon name="chevron-down" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
          </View>

          {/* FSSAI Number */}
          <View style={styles.inputBox}>
            <Icon name="document-text" size={scale(18)} color={C.primary} style={styles.inputIcon} />
            <TextInput
              placeholder="FSSAI Number (14 digits) *"
              onFocus={scrollFocusedIntoView}
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
            <Icon name="cloud-upload-outline" size={scale(20)} color={C.primary} />
            <Text style={styles.uploadText} numberOfLines={1}>
              {fssaiFile ? fssaiFile.name : 'Upload FSSAI Certificate Image *'}
            </Text>
            {fssaiFile && (
              <TouchableOpacity onPress={() => setFssaiFile(null)}>
                <Icon name="close-circle" size={scale(20)} color={C.primary} />
              </TouchableOpacity>
            )}
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="information-circle-outline" size={scale(18)} color={C.warn} />
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
                  <Icon name="arrow-forward" size={scale(20)} color="#fff" style={styles.submitIcon} />
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
                <Text style={styles.pickerEmptyText}>No cities available for this state</Text>
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
                  style={[styles.pickerItem, form.outletType === type.key && styles.pickerItemActive]}
                  onPress={() => {
                    handleChange('outletType', type.key);
                    setShowOutletTypePicker(false);
                  }}
                >
                  <Text style={[styles.pickerItemText, form.outletType === type.key && styles.pickerItemTextActive]}>
                    {type.label}
                  </Text>
                  {form.outletType === type.key && <Icon name="checkmark" size={scale(20)} color={C.primary} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  floatBackBtn: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? scale(54) : scale(28),
    left: scale(16),
    zIndex: 10,
    width: scale(40),
    height: scale(40),
    borderRadius: scale(20),
    backgroundColor: 'rgba(255,255,255,0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.12,
    shadowRadius: scale(4),
    elevation: 4,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingBottom: scale(120),
  },
  heading: {
    fontSize: moderateScale(26),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
    marginTop: scale(40),
    marginBottom: scale(8),
  },
  subheading: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    marginBottom: scale(25),
    paddingHorizontal: scale(30),
  },
  card: {
    paddingHorizontal: scale(20),
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
  removeImageBtn: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: 'white',
    borderRadius: scale(12),
  },
  imagePlaceholder: {
    backgroundColor: C.bg,
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
  imagePlaceholderHint: {
    marginTop: scale(4),
    color: C.muted,
    fontSize: moderateScale(12),
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: '#fff',
    borderRadius: scale(12),
    paddingHorizontal: scale(14),
    paddingVertical: Platform.OS === 'ios' ? scale(12) : scale(10),
    marginBottom: scale(14),
  },
  row2: {
    flexDirection: 'row',
    gap: scale(10),
    marginBottom: scale(14),
  },
  row2Item: {
    flex: 1,
    marginBottom: 0,
  },
  inputIcon: {
    marginRight: scale(10),
  },
  input: {
    flex: 1,
    color: C.text,
    fontSize: moderateScale(15),
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: scale(12),
    borderColor: C.primary,
    padding: scale(14),
    marginBottom: scale(16),
    backgroundColor: '#fff',
  },
  uploadText: {
    marginLeft: scale(10),
    color: C.primary,
    fontSize: moderateScale(14),
    fontWeight: '600',
    flex: 1,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#FEF3C7',
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(20),
  },
  infoText: {
    flex: 1,
    marginLeft: scale(8),
    color: '#92400E',
    fontSize: moderateScale(12),
    lineHeight: moderateScale(18),
  },
  submitButtonContainer: {
    borderRadius: scale(14),
    overflow: 'hidden',
  },
  submitButton: {
    paddingVertical: scale(16),
    borderRadius: scale(14),
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: scale(6) },
    shadowOpacity: 0.4,
    shadowRadius: scale(8),
    elevation: 5,
  },
  submitText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '700',
  },
  submitIcon: {
    marginLeft: scale(10),
  },

  // Picker modal
  pickerOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  pickerContainer: {
    backgroundColor: '#fff',
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
  pickerEmptyText: { fontSize: moderateScale(14), color: C.muted, textAlign: 'center', paddingVertical: scale(20) },
});

export default RestaurantOnboarding;
