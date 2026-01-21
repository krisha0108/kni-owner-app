import RNFS from 'react-native-fs';
import { Platform, Share, Alert } from 'react-native';
import { exportToCSV } from '../utils/filterHelpers';

/**
 * Export data to CSV file and save to device
 * @param {string} filename - Base filename (without extension)
 * @param {Array} data - Data array to export
 * @param {Array} columns - Column configuration [{field, label}, ...]
 * @returns {Promise<string>} Path to created file
 */
export const exportDataToCSV = async (filename, data, columns) => {
  try {
    if (!data || data.length === 0) {
      throw new Error('No data to export');
    }

    const csvContent = exportToCSV(data, columns);
    const timestamp = Date.now();
    const fileName = `${filename}-${timestamp}.csv`;
    const path = `${RNFS.DocumentDirectoryPath}/${fileName}`;

    await RNFS.writeFile(path, csvContent, 'utf8');

    return path;
  } catch (error) {
    console.error('Export CSV error:', error);
    throw new Error('Failed to export CSV');
  }
};

/**
 * Share CSV file using native share dialog
 * @param {string} filePath - Path to CSV file
 * @param {string} title - Share dialog title
 */
export const shareCSV = async (filePath, title = 'Export Data') => {
  try {
    await Share.share({
      url: Platform.OS === 'ios' ? filePath : `file://${filePath}`,
      title,
    });
  } catch (error) {
    console.error('Share CSV error:', error);
    throw new Error('Failed to share CSV');
  }
};

/**
 * Export and share in one step
 * @param {string} filename - Base filename
 * @param {Array} data - Data to export
 * @param {Array} columns - Column config
 * @param {string} title - Share title
 * @returns {Promise<string>} Path to created file
 */
export const exportAndShare = async (filename, data, columns, title) => {
  const path = await exportDataToCSV(filename, data, columns);
  await shareCSV(path, title);
  return path;
};

/**
 * Delete exported file
 * @param {string} filePath - Path to file
 */
export const deleteExportedFile = async (filePath) => {
  try {
    const exists = await RNFS.exists(filePath);
    if (exists) {
      await RNFS.unlink(filePath);
    }
  } catch (error) {
    console.error('Delete file error:', error);
  }
};

/**
 * Get list of all exported CSV files
 * @returns {Promise<Array>} List of CSV files
 */
export const listExportedCSVs = async () => {
  try {
    const files = await RNFS.readDir(RNFS.DocumentDirectoryPath);
    return files.filter(file => file.name.endsWith('.csv'));
  } catch (error) {
    console.error('List CSVs error:', error);
    return [];
  }
};

// Pre-defined column configurations for common exports

export const BOOKING_COLUMNS = [
  { field: 'id', label: 'Booking ID' },
  { field: 'createdAt', label: 'Date' },
  { field: 'status', label: 'Status' },
  { field: 'totalAmount', label: 'Amount' },
  { field: 'serviceType', label: 'Service Type' },
  { field: 'equipmentName', label: 'Equipment' },
  { field: 'restaurantName', label: 'Restaurant' },
];

export const EXPENSE_COLUMNS = [
  { field: 'id', label: 'ID' },
  { field: 'expenseDate', label: 'Date' },
  { field: 'category', label: 'Category' },
  { field: 'description', label: 'Description' },
  { field: 'amount', label: 'Amount' },
  { field: 'restaurantName', label: 'Restaurant' },
];

export const ATTENDANCE_COLUMNS = [
  { field: 'staffName', label: 'Staff Name' },
  { field: 'designation', label: 'Designation' },
  { field: 'attendanceDate', label: 'Date' },
  { field: 'status', label: 'Status' },
  { field: 'checkInTime', label: 'Check In' },
  { field: 'checkOutTime', label: 'Check Out' },
  { field: 'workHours', label: 'Work Hours' },
];

export const STAFF_COLUMNS = [
  { field: 'name', label: 'Name' },
  { field: 'designation', label: 'Designation' },
  { field: 'phone', label: 'Phone' },
  { field: 'salary', label: 'Salary' },
  { field: 'joiningDate', label: 'Joining Date' },
];

export const EQUIPMENT_COLUMNS = [
  { field: 'name', label: 'Equipment Name' },
  { field: 'category', label: 'Category' },
  { field: 'serialNumber', label: 'Serial Number' },
  { field: 'status', label: 'Status' },
  { field: 'purchaseDate', label: 'Purchase Date' },
  { field: 'warrantyEndDate', label: 'Warranty End' },
  { field: 'restaurantName', label: 'Restaurant' },
];

/**
 * Format booking data for CSV export
 * @param {Array} bookings - Raw booking data
 * @returns {Array} Formatted data ready for export
 */
export const formatBookingsForExport = (bookings) => {
  return bookings.map(b => ({
    id: b.id?.slice(0, 8) || '-',
    createdAt: b.createdAt ? new Date(b.createdAt).toLocaleDateString() : '-',
    status: b.status || '-',
    totalAmount: b.totalAmount ? `${b.totalAmount}` : '0',
    serviceType: b.serviceType || b.items?.[0]?.serviceItem?.name || '-',
    equipmentName: b.equipment?.name || '-',
    restaurantName: b.restaurant?.name || '-',
  }));
};

/**
 * Format expense data for CSV export
 * @param {Array} expenses - Raw expense data
 * @returns {Array} Formatted data ready for export
 */
export const formatExpensesForExport = (expenses) => {
  return expenses.map(e => ({
    id: e.id?.slice(0, 8) || '-',
    expenseDate: e.expenseDate ? new Date(e.expenseDate).toLocaleDateString() : '-',
    category: e.category || '-',
    description: e.description || '-',
    amount: e.amount ? `${e.amount}` : '0',
    restaurantName: e.restaurant?.name || '-',
  }));
};

/**
 * Format attendance data for CSV export
 * @param {Array} attendance - Raw attendance data with staff info
 * @returns {Array} Formatted data ready for export
 */
export const formatAttendanceForExport = (attendance) => {
  return attendance.map(a => ({
    staffName: a.staff?.name || a.staffName || '-',
    designation: a.staff?.designation || a.designation || '-',
    attendanceDate: a.attendanceDate ? new Date(a.attendanceDate).toLocaleDateString() : '-',
    status: a.status || '-',
    checkInTime: a.checkInTime ? new Date(a.checkInTime).toLocaleTimeString() : '-',
    checkOutTime: a.checkOutTime ? new Date(a.checkOutTime).toLocaleTimeString() : '-',
    workHours: a.workHours ? `${a.workHours}` : '-',
  }));
};

/**
 * Format equipment data for CSV export
 * @param {Array} equipment - Raw equipment data
 * @returns {Array} Formatted data ready for export
 */
export const formatEquipmentForExport = (equipment) => {
  return equipment.map(e => ({
    name: e.name || '-',
    category: e.category || e.equipmentType?.name || '-',
    serialNumber: e.serialNumber || '-',
    status: e.status || '-',
    purchaseDate: e.purchaseDate ? new Date(e.purchaseDate).toLocaleDateString() : '-',
    warrantyEndDate: e.warrantyEndDate ? new Date(e.warrantyEndDate).toLocaleDateString() : '-',
    restaurantName: e.restaurant?.name || '-',
  }));
};
