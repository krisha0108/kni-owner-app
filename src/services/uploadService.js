import { api } from '../api/client';

/**
 * Upload Service for KNI Owner App
 * Handles file uploads (images, documents)
 */

class UploadService {

  /**
   * Upload an image file
   * @param {string} fileUri - Local file URI
   * @param {string} fileName - Optional file name
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadImage(fileUri, fileName = 'upload.jpg', fileType = 'image/jpeg') {
    try {
      console.log('📤 Uploading image:', fileUri);

      // Create FormData - use actual file type from picker for reliability
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: fileType,
        name: fileName,
      });

      const response = await api.post('/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 60000, // 60 seconds for upload
      });

      if (response.data.ok) {
        const uploadedUrl = response.data.data.url;
        console.log('✅ Image uploaded successfully:', uploadedUrl);
        return uploadedUrl;
      } else {
        throw new Error(response.data.error || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload image error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to upload image'
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
   * Compress image before upload (optional helper)
   * You may want to use react-native-image-resizer for this
   * @param {string} uri - Image URI
   * @param {Object} options - Compression options
   * @returns {Promise<string>} Compressed image URI
   */
  async compressImage(uri, options = {}) {
    try {
      // TODO: Implement with react-native-image-resizer
      // const resized = await ImageResizer.createResizedImage(
      //   uri,
      //   options.maxWidth || 800,
      //   options.maxHeight || 800,
      //   'JPEG',
      //   options.quality || 80
      // );
      // return resized.uri;

      // For now, just return the original URI
      return uri;
    } catch (error) {
      console.error('❌ Compress image error:', error);
      return uri; // Return original on error
    }
  }

  /**
   * Upload equipment image (bill, warranty card, or photo)
   * @param {string} fileUri - Local file URI
   * @param {string} type - Image type ('bill', 'warranty', 'photo')
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadEquipmentImage(fileUri, type = 'photo') {
    try {
      const fileName = `equipment-${type}-${Date.now()}.jpg`;
      return await this.uploadImage(fileUri, fileName);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload payment proof image
   * @param {string} fileUri - Local file URI
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadPaymentProof(fileUri, fileType = 'image/jpeg', originalName = null) {
    try {
      const fileName = originalName || `payment-proof-${Date.now()}.jpg`;
      return await this.uploadImage(fileUri, fileName, fileType);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload expense receipt image
   * @param {string} fileUri - Local file URI
   * @returns {Promise<string>} Uploaded file URL
   */
  async uploadExpenseReceipt(fileUri) {
    try {
      const fileName = `expense-receipt-${Date.now()}.jpg`;
      return await this.uploadImage(fileUri, fileName);
    } catch (error) {
      throw error;
    }
  }
}

// Export singleton instance
export default new UploadService();
