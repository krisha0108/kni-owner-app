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

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
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
      maxWidth: 1920,
      maxHeight: 1920,
    });

    if (!result.didCancel && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
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
        formData.append('payment', {
          uri: imageUri,
          type: 'image/jpeg',
          name: `payment-${bookingId}-${Date.now()}.jpg`,
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
            onPress: () => navigation.goBack(),
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Upload Payment Proof</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
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
            <Icon name="image-outline" size={24} color={paymentUrl ? C.muted : C.primary} />
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
                <Icon name="close-circle" size={24} color={C.danger} />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Info Box */}
        <View style={styles.infoBox}>
          <Icon name="information-circle-outline" size={20} color={C.primary} />
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
              <Icon name="cloud-upload-outline" size={20} color="#FFF" />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: C.border,
  },
  dividerText: {
    paddingHorizontal: 16,
    fontSize: 14,
    fontWeight: '600',
    color: C.muted,
  },
  uploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.card,
    borderWidth: 2,
    borderColor: C.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 24,
  },
  uploadButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.primary,
  },
  uploadButtonTextDisabled: {
    color: C.muted,
  },
  previewContainer: {
    marginTop: 16,
    position: 'relative',
  },
  preview: {
    width: '100%',
    height: 300,
    borderRadius: 12,
    resizeMode: 'cover',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: C.card,
    borderRadius: 12,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
  danger: '#EF4444',
});
