import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Save filters to AsyncStorage
 * @param {string} key - Storage key
 * @param {Object} filters - Filter object to save
 */
export const persistFilters = async (key, filters) => {
  try {
    const filtersString = JSON.stringify(filters);
    await AsyncStorage.setItem(key, filtersString);
  } catch (error) {
    console.error('Error persisting filters:', error);
  }
};

/**
 * Load filters from AsyncStorage
 * @param {string} key - Storage key
 * @returns {Promise<Object>} Saved filters or default filters
 */
export const loadPersistedFilters = async (key) => {
  try {
    const filtersString = await AsyncStorage.getItem(key);
    if (filtersString) {
      return JSON.parse(filtersString);
    }
    return getDefaultFilters();
  } catch (error) {
    console.error('Error loading filters:', error);
    return getDefaultFilters();
  }
};

/**
 * Clear filters from AsyncStorage
 * @param {string} key - Storage key
 */
export const clearPersistedFilters = async (key) => {
  try {
    await AsyncStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing filters:', error);
  }
};

/**
 * Get default filter values
 * @returns {Object} Default filter object
 */
export const getDefaultFilters = () => ({
  search: '',
  status: 'all',
  dateFrom: '',
  dateTo: '',
  minAmount: '',
  maxAmount: '',
  category: 'all',
  sortBy: 'date-desc',
});

/**
 * Apply filters to a dataset
 * @param {Array} data - Data array to filter
 * @param {Object} filters - Filter criteria
 * @param {Object} config - Configuration for filter application
 * @returns {Array} Filtered data
 */
export const applyFilters = (data, filters, config = {}) => {
  if (!data || !Array.isArray(data)) return [];

  let filtered = [...data];

  // Apply search filter
  if (filters.search && config.searchFields) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(item =>
      config.searchFields.some(field =>
        item[field]?.toString().toLowerCase().includes(searchLower)
      )
    );
  }

  // Apply status filter
  if (filters.status && filters.status !== 'all' && config.statusField) {
    filtered = filtered.filter(item =>
      item[config.statusField]?.toLowerCase() === filters.status.toLowerCase()
    );
  }

  // Apply category filter
  if (filters.category && filters.category !== 'all' && config.categoryField) {
    filtered = filtered.filter(item =>
      item[config.categoryField] === filters.category
    );
  }

  // Apply date range filter
  if (filters.dateFrom && config.dateField) {
    const fromDate = new Date(filters.dateFrom);
    filtered = filtered.filter(item => {
      const itemDate = new Date(item[config.dateField]);
      return itemDate >= fromDate;
    });
  }

  if (filters.dateTo && config.dateField) {
    const toDate = new Date(filters.dateTo);
    toDate.setHours(23, 59, 59, 999);
    filtered = filtered.filter(item => {
      const itemDate = new Date(item[config.dateField]);
      return itemDate <= toDate;
    });
  }

  // Apply amount range filter
  if (filters.minAmount && config.amountField) {
    const minAmount = parseFloat(filters.minAmount);
    filtered = filtered.filter(item => item[config.amountField] >= minAmount);
  }

  if (filters.maxAmount && config.amountField) {
    const maxAmount = parseFloat(filters.maxAmount);
    filtered = filtered.filter(item => item[config.amountField] <= maxAmount);
  }

  // Apply sorting
  if (filters.sortBy && config.sortFields) {
    const [field, order] = filters.sortBy.split('-');
    const sortField = config.sortFields[field];

    if (sortField) {
      filtered.sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (typeof aValue === 'string') {
          return order === 'asc'
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }

        if (aValue instanceof Date || !isNaN(Date.parse(aValue))) {
          const aDate = new Date(aValue).getTime();
          const bDate = new Date(bValue).getTime();
          return order === 'asc' ? aDate - bDate : bDate - aDate;
        }

        return order === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }
  }

  return filtered;
};

/**
 * Count active filters (excluding defaults and search)
 * @param {Object} filters - Filter object
 * @returns {number} Number of active filters
 */
export const countActiveFilters = (filters) => {
  return Object.entries(filters)
    .filter(([key, value]) => {
      if (key === 'search' || key === 'sortBy') return false;
      return value && value !== '' && value !== 'all';
    })
    .length;
};

/**
 * Export filtered data to CSV format
 * @param {Array} data - Data to export
 * @param {Array} columns - Column configuration
 * @returns {string} CSV string
 */
export const exportToCSV = (data, columns) => {
  if (!data || data.length === 0) return '';

  // Create header row
  const headers = columns.map(col => col.label).join(',');

  // Create data rows
  const rows = data.map(item => {
    return columns
      .map(col => {
        const value = item[col.field];
        // Escape commas and quotes
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value || '';
      })
      .join(',');
  });

  return [headers, ...rows].join('\n');
};
