import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '../api/client';

/**
 * Upload Service for KNI Owner App
 * Uses native fetch instead of axios for reliable FormData uploads on Android
 */

class UploadService {

  /**
   * Upload an image file using native fetch (more reliable than axios for FormData on Android)
   * @param {string} fileUri - Local file URI
   * @param {string} fileName - Optional file name
   * @param {string} fileType - MIME type
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadImage(fileUri, fileName = 'upload.jpg', fileType = 'image/jpeg') {
    try {
      console.log('📤 Uploading image:', fileUri);

      const token = await AsyncStorage.getItem('userToken');

      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      const response = await fetch(`${API_BASE_URL}/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Upload failed with status ${response.status}`);
      }

      if (data.ok) {
        const uploadedUrl = data.data.url;
        console.log('✅ Image uploaded successfully:', uploadedUrl);
        return uploadedUrl;
      } else {
        throw new Error(data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload image error:', error);
      throw new Error(
        error.message || 'Failed to upload image'
      );
    }
  }

  /**
   * Upload multiple images
   * @param {Array<string>} fileUris - Array of local file URIs
   * @returns {Promise<Array<string>>} Array of uploaded file URLs
   */
  async uploadMultipleImages(fileUris) {
    try {
      console.log('📤 Uploading multiple images:', fileUris.length);

      const uploadPromises = fileUris.map((uri, index) =>
        this.uploadImage(uri, `upload-${index}.jpg`)
      );

      const uploadedUrls = await Promise.all(uploadPromises);
      console.log('✅ All images uploaded successfully');
      return uploadedUrls;
    } catch (error) {
      console.error('❌ Upload multiple images error:', error);
      throw error;
    }
  }

  /**
   * Upload equipment image (bill, warranty card, or photo)
   * @param {string} fileUri - Local file URI
   * @param {string} type - Image type ('bill', 'warranty', 'photo')
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadEquipmentImage(fileUri, type = 'photo') {
    const fileName = `equipment-${type}-${Date.now()}.jpg`;
    return await this.uploadImage(fileUri, fileName);
  }

  /**
   * Upload payment proof image
   * @param {string} fileUri - Local file URI
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadPaymentProof(fileUri, fileType = 'image/jpeg', originalName = null) {
    const fileName = originalName || `payment-proof-${Date.now()}.jpg`;
    return await this.uploadImage(fileUri, fileName, fileType);
  }

  /**
   * Upload expense receipt image
   * @param {string} fileUri - Local file URI
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadExpenseReceipt(fileUri) {
    const fileName = `expense-receipt-${Date.now()}.jpg`;
    return await this.uploadImage(fileUri, fileName);
  }
}

// Export singleton instance
export default new UploadService();
