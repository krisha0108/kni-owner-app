import { api } from '../api/client';
import RNFS from 'react-native-fs';
import { Platform, Alert } from 'react-native';
import FileViewer from 'react-native-file-viewer';

/**
 * Export analytics data as PDF
 * @param {string} restaurantId - Restaurant ID to export analytics for
 * @returns {Promise<string>} Path to the downloaded PDF file
 */
export const exportAnalyticsPDF = async (restaurantId) => {
  try {
    const response = await api.get(`/owner/analytics/export?restaurantId=${restaurantId}`, {
      responseType: 'blob'
    });

    // Generate unique filename with timestamp
    const timestamp = Date.now();
    const fileName = `analytics-${restaurantId}-${timestamp}.pdf`;
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    // Convert blob to base64 if needed
    let base64Data = response.data;
    if (typeof base64Data !== 'string') {
      base64Data = await blobToBase64(response.data);
    }

    // Write file to device
    await RNFS.writeFile(path, base64Data, 'base64');

    return path;
  } catch (error) {
    console.error('Export analytics PDF error:', error);
    throw new Error('Failed to export analytics PDF');
  }
};

/**
 * Export spending reports as PDF
 * @param {string} restaurantId - Restaurant ID to export reports for
 * @param {Object} filters - Optional filters for the report
 * @returns {Promise<string>} Path to the downloaded PDF file
 */
export const exportSpendingReportPDF = async (restaurantId, filters = {}) => {
  try {
    const queryParams = new URLSearchParams({
      restaurantId,
      ...filters
    }).toString();

    const response = await api.get(`/owner/spending-reports/export?${queryParams}`, {
      responseType: 'blob'
    });

    const timestamp = Date.now();
    const fileName = `spending-report-${restaurantId}-${timestamp}.pdf`;
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    let base64Data = response.data;
    if (typeof base64Data !== 'string') {
      base64Data = await blobToBase64(response.data);
    }

    await RNFS.writeFile(path, base64Data, 'base64');

    return path;
  } catch (error) {
    console.error('Export spending report PDF error:', error);
    throw new Error('Failed to export spending report PDF');
  }
};

/**
 * Open PDF file with default viewer
 * @param {string} filePath - Path to the PDF file
 */
export const openPDF = async (filePath) => {
  try {
    // Use react-native-file-viewer which handles Android FileProvider properly
    await FileViewer.open(filePath, {
      showOpenWithDialog: true,
      showAppsSuggestions: true,
    });
  } catch (error) {
    console.error('Open PDF error:', error);
    Alert.alert(
      'Cannot Open PDF',
      'Please install a PDF viewer app to open this file.',
      [{ text: 'OK' }]
    );
  }
};

/**
 * Share PDF file using native share dialog
 * @param {string} filePath - Path to the PDF file
 */
export const sharePDF = async (filePath) => {
  try {
    const { Share } = require('react-native');

    await Share.share({
      url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
      title: 'Share Analytics Report',
    });
  } catch (error) {
    console.error('Share PDF error:', error);
    throw new Error('Failed to share PDF');
  }
};

/**
 * Convert blob to base64 string
 * @param {Blob} blob - Blob data
 * @returns {Promise<string>} Base64 encoded string
 */
const blobToBase64 = (blob) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.readAsDataURL(blob);
  });
};

/**
 * Delete PDF file from device
 * @param {string} filePath - Path to the PDF file
 */
export const deletePDF = async (filePath) => {
  try {
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
  } catch (error) {
    console.error('Delete PDF error:', error);
  }
};

/**
 * Get list of all exported PDFs
 * @returns {Promise<Array>} List of PDF files
 */
export const listExportedPDFs = async () => {
  try {
    const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    return files.filter(file => file.name.endsWith('.pdf'));
  } catch (error) {
    console.error('List PDFs error:', error);
    return [];
  }
};
