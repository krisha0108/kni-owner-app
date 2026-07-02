import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const getMimeType = (uri) => {
  const ext = (uri || '').split('.').pop()?.toLowerCase();
  const mimeMap = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg',
    png: 'image/png', gif: 'image/gif',
    webp: 'image/webp', heic: 'image/heic',
  };
  return mimeMap[ext] || 'image/jpeg';
};

export default function PaymentUploadScreen({ route, navigation }) {
  const { bookingId } = route.params;
  const [imageUri, setImageUri] = useState(null);
  const [paymentUrl, setPaymentUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  const handleSelectImage = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: scale(1920),
      maxHeight: scale(1920),
    });

    if (!result.didCancel && result.assets?.[0]) {
      const asset = result.assets[0];
      if (asset.fileSize && asset.fileSize > MAX_FILE_SIZE) {
        return Alert.alert('File Too Large', 'Please select an image under 10 MB.');
      }
      setImageUri(asset.uri);
    }
  };

  const handleUpload = async () => {
    if (!imageUri && !paymentUrl) {
      return Alert.alert('Error', 'Please select an image or enter URL');
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('bookingId', bookingId);

      if (imageUri) {
        const mimeType = getMimeType(imageUri);
        const ext = mimeType.split('/')[1] || 'jpg';
        formData.append('payment', {
          uri: imageUri,
          type: mimeType,
          name: `payment-${bookingId}-${Date.now()}.${ext}`,
        });
      } else if (paymentUrl) {
        formData.append('paymentUrl', paymentUrl);
      }

      const response = await api.post('/owner/bookings/upload-payment', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.data?.ok) {
        Alert.alert('Success', 'Payment proof uploaded successfully', [
          {
            text: 'OK',
            onPress: () => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home')),
          },
        ]);
      } else {
        throw new Error(response.data?.error || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload payment error:', error);
      Alert.alert('Error', error.message || 'Could not upload payment proof');
    } finally {
      setUploading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(24)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Payment Proof</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Payment URL Input */}
        <View style={styles.section}>
          <Text style={styles.label}>Payment Screenshot URL</Text>
          <TextInput
            style={styles.input}
            placeholder="https://example.com/payment.jpg"
            value={paymentUrl}
            onChangeText={setPaymentUrl}
            placeholderTextColor={C.muted}
            editable={!imageUri}
          />
        </View>

        {/* Divider */}
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR</Text>
          <View style={styles.dividerLine} />
        </View>

        {/* Upload from Device */}
        <View style={styles.section}>
          <Text style={styles.label}>Upload from Device</Text>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={handleSelectImage}
            disabled={!!paymentUrl}
          >
            <Icon name="image-outline" size={scale(24)} color={paymentUrl ? C.muted : C.primary} />
            <Text style={[styles.uploadButtonText, paymentUrl && styles.uploadButtonTextDisabled]}>
              Select Image
            </Text>
          </TouchableOpacity>

          {/* Image Preview */}
          {imageUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setImageUri(null)}
              >
                <Icon name="close-circle" size={scale(24)} color={C.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={scale(20)} color={C.primary} />
          <Text style={styles.infoText}>
            Upload clear image of payment confirmation to help verify your booking faster.
          </Text>
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, uploading && styles.submitButtonDisabled]}
          onPress={handleUpload}
          disabled={uploading || (!imageUri && !paymentUrl)}
        >
          {uploading ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <>
              <Icon name="cloud-upload-outline" size={scale(20)} color="#FFF" />
              <Text style={styles.submitButtonText}>Upload Payment Proof</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
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
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  content: {
    flex: 1,
    padding: scale(16),
  },
  section: {
    marginBottom: scale(24),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.text,
    marginBottom: scale(8),
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    fontSize: moderateScale(15),
    color: C.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: scale(24),
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    paddingHorizontal: scale(16),
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: scale(12),
    paddingVertical: scale(24),
  },
  uploadButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.primary,
  },
  uploadButtonTextDisabled: {
    color: C.muted,
  },
  previewContainer: {
    marginTop: scale(16),
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: scale(300),
    borderRadius: scale(12),
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: scale(8),
    right: scale(8),
    backgroundColor: C.card,
    borderRadius: scale(12),
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: scale(12),
    backgroundColor: '#FEF2F2',
    padding: scale(16),
    borderRadius: scale(12),
    marginBottom: scale(24),
  },
  infoText: {
    flex: 1,
    fontSize: moderateScale(13),
    color: C.text,
    lineHeight: moderateScale(18),
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    backgroundColor: C.primary,
    borderRadius: scale(12),
    paddingVertical: scale(16),
    marginBottom: scale(32),
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: '#FFF',
  },
  danger: '#EF4444',
});
