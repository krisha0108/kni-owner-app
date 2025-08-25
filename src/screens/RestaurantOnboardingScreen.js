import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ScrollView, Platform, Alert,
  PermissionsAndroid, Linking
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { pick } from '@react-native-documents/picker'; // ✅ NEW IMPORT
import LinearGradient from 'react-native-linear-gradient';

const RestaurantOnboarding = ({ navigation }) => {
  const [hotelName, setHotelName] = useState('');
  const [address, setAddress] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [fssaiFile, setFssaiFile] = useState(null);

  const requestStoragePermission = async () => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_MEDIA_IMAGES,
          {
            title: 'Storage Permission',
            message: 'App needs access to your storage to select files',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const handlePickFile = async () => {
    try {
      const hasPermission = await requestStoragePermission();

      if (!hasPermission) {
        Alert.alert(
          'Permission Required',
          'Please grant storage permission to upload files',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Open Settings',
              onPress: () => Linking.openSettings()
            },
          ]
        );
        return;
      }

      const [file] = await pick({
        type: ['application/pdf', 'image/*'], // ✅ modern format
      });

      setFssaiFile(file);
    } catch (err) {
      if (err.code === 'DOCUMENT_PICKER_CANCELED') {
        console.log('User cancelled file picker');
      } else {
        console.error('DocumentPicker Error: ', err);
        Alert.alert('Error', 'Failed to pick file');
      }
    }
  };

  const handleSubmit = () => {
    if (!hotelName || !address || !fssaiNumber || !fssaiFile) {
      Alert.alert('Required', 'Please fill all fields and upload FSSAI certificate.');
      return;
    }

    const formData = new FormData();
    formData.append('hotelName', hotelName);
    formData.append('address', address);
    formData.append('fssaiNumber', fssaiNumber);
    formData.append('fssaiFile', {
      uri: fssaiFile.uri,
      type: fssaiFile.type,
      name: fssaiFile.name
    });

    console.log('Submitting:', { hotelName, address, fssaiNumber, fssaiFile });
    navigation.replace('OwnerDashboard');
  };

  return (
    <LinearGradient colors={['#f2f4f7', '#dfe7ee']} style={styles.container}>
      <ScrollView 
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.heading}>Onboard Your Restaurant</Text>

        <View style={styles.card}>
          {/* Hotel Name */}
          <View style={styles.inputBox}>
            <Icon name="business" size={18} color="#EF3A3A" style={styles.inputIcon} />
            <TextInput
              placeholder="Hotel / Restaurant Name"
              style={styles.input}
              value={hotelName}
              onChangeText={setHotelName}
              placeholderTextColor="#888"
              returnKeyType="next"
            />
          </View>

          {/* Address */}
          <View style={styles.inputBox}>
            <Icon name="location" size={18} color="#EF3A3A" style={styles.inputIcon} />
            <TextInput
              placeholder="Full Address"
              style={[styles.input, { height: 70 }]}
              multiline
              value={address}
              onChangeText={setAddress}
              placeholderTextColor="#888"
              returnKeyType="next"
            />
          </View>

          {/* FSSAI Number */}
          <View style={styles.inputBox}>
            <Icon name="document-text" size={18} color="#EF3A3A" style={styles.inputIcon} />
            <TextInput
              placeholder="FSSAI Number"
              style={styles.input}
              value={fssaiNumber}
              onChangeText={setFssaiNumber}
              placeholderTextColor="#888"
              returnKeyType="done"
            />
          </View>

          {/* Upload FSSAI Certificate */}
          <TouchableOpacity 
            style={styles.uploadContainer} 
            onPress={handlePickFile}
            activeOpacity={0.7}
          >
            <Icon name="cloud-upload-outline" size={20} color="#EF3A3A" />
            <Text style={styles.uploadText} numberOfLines={1}>
              {fssaiFile ? `Uploaded: ${fssaiFile.name}` : 'Upload FSSAI Certificate'}
            </Text>
            {fssaiFile && (
              <Icon 
                name="checkmark-circle" 
                size={20} 
                color="green" 
                style={styles.uploadSuccessIcon} 
              />
            )}
          </TouchableOpacity>

          {/* Submit Button */}
          <TouchableOpacity 
            onPress={handleSubmit} 
            activeOpacity={0.9}
            style={styles.submitButtonContainer}
          >
            <LinearGradient 
              colors={['#ef3a3a', '#c22525']} 
              style={styles.submitButton}
              start={{x: 0, y: 0}} 
              end={{x: 1, y: 0}}
            >
              <Text style={styles.submitText}>Finish Onboarding</Text>
              <Icon name="arrow-forward" size={20} color="#fff" style={styles.submitIcon} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    fontSize: 28,
    fontWeight: '700',
    color: '#1D2254',
    textAlign: 'center',
    marginTop: 50,
    marginBottom: 25,
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    marginHorizontal: 25,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 8,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === 'ios' ? 14 : 10,
    marginBottom: 18,
  },
  inputIcon: {
    marginRight: 10,
    marginTop: 4,
  },
  input: {
    flex: 1,
    color: '#111',
    fontSize: 15,
  },
  uploadContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderRadius: 12,
    borderColor: '#EF3A3A',
    padding: 14,
    marginBottom: 25,
    backgroundColor: '#fff',
  },
  uploadText: {
    marginLeft: 10,
    color: '#EF3A3A',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  uploadSuccessIcon: {
    marginLeft: 6
  },
  submitButtonContainer: {
    borderRadius: 14,
    overflow: 'hidden',
  },
  submitButton: {
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    shadowColor: '#EF3A3A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  submitIcon: {
    marginLeft: 10
  }
});

export default RestaurantOnboarding;