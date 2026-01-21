import { api } from '../api/client';

/**
 * Create a new category request
 * @param {Object} data - Category request data
 * @param {string} data.categoryName - Name of the requested category
 * @param {string} data.description - Description of the category
 * @param {string} data.reason - Reason for requesting the category
 * @returns {Promise<Object>} Created category request
 */
export const createCategoryRequest = async (data) => {
  try {
    const response = await api.post('/owner/category-request', data);
    if (response.data?.ok) {
      return response.data.data;
    }
    throw new Error(response.data?.error || 'Failed to create category request');
  } catch (error) {
    console.error('Create category request error:', error);
    throw error;
  }
};

/**
 * Get all category requests for the current user
 * @returns {Promise<Array>} List of category requests
 */
export const getCategoryRequests = async () => {
  try {
    const response = await api.get('/owner/category-request');
    if (response.data?.ok) {
      return response.data.data;
    }
    throw new Error(response.data?.error || 'Failed to fetch category requests');
  } catch (error) {
    console.error('Get category requests error:', error);
    throw error;
  }
};

/**
 * Get a single category request by ID
 * @param {number} requestId - Category request ID
 * @returns {Promise<Object>} Category request details
 */
export const getCategoryRequestById = async (requestId) => {
  try {
    const response = await api.get(`/owner/category-request/${requestId}`);
    if (response.data?.ok) {
      return response.data.data;
    }
    throw new Error(response.data?.error || 'Failed to fetch category request');
  } catch (error) {
    console.error('Get category request error:', error);
    throw error;
  }
};

/**
 * Update a category request
 * @param {number} requestId - Category request ID
 * @param {Object} data - Updated category request data
 * @returns {Promise<Object>} Updated category request
 */
export const updateCategoryRequest = async (requestId, data) => {
  try {
    const response = await api.put(`/owner/category-request/${requestId}`, data);
    if (response.data?.ok) {
      return response.data.data;
    }
    throw new Error(response.data?.error || 'Failed to update category request');
  } catch (error) {
    console.error('Update category request error:', error);
    throw error;
  }
};

/**
 * Delete a category request
 * @param {number} requestId - Category request ID
 * @returns {Promise<boolean>} Success status
 */
export const deleteCategoryRequest = async (requestId) => {
  try {
    const response = await api.delete(`/owner/category-request/${requestId}`);
    if (response.data?.ok) {
      return true;
    }
    throw new Error(response.data?.error || 'Failed to delete category request');
  } catch (error) {
    console.error('Delete category request error:', error);
    throw error;
  }
};

/**
 * Get all available categories
 * @returns {Promise<Array>} List of categories
 */
export const getCategories = async () => {
  try {
    const response = await api.get('/owner/categories');
    if (response.data?.ok) {
      return response.data.data;
    }
    throw new Error(response.data?.error || 'Failed to fetch categories');
  } catch (error) {
    console.error('Get categories error:', error);
    throw error;
  }
};
