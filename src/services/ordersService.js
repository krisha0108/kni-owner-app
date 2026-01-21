import { api } from '../api/client';

/**
 * Marketplace Orders Service for KNI Owner App
 * Handles marketplace product orders from vendors
 */

class OrdersService {

  /**
   * Get marketplace orders for a restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} filters - Optional filters (status, page, pageSize)
   * @returns {Promise<Array>} List of marketplace orders
   */
  async getMarketplaceOrders(restaurantId, filters = {}) {
    try {
      console.log('📦 Fetching marketplace orders for restaurant:', restaurantId);

      const params = {
        restaurantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.page && { page: filters.page }),
        ...(filters.pageSize && { pageSize: filters.pageSize }),
      };

      const response = await api.get('/owner/marketplace/orders', { params });

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        throw new Error(response.data.error || 'Failed to fetch orders');
      }
    } catch (error) {
      console.error('❌ Get marketplace orders error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch orders'
      );
    }
  }

  /**
   * Get marketplace order details
   * @param {string} orderId - Order ID
   * @returns {Promise<Object>} Order details
   */
  async getOrderDetails(orderId) {
    try {
      console.log('🔍 Fetching order details:', orderId);

      const response = await api.get(`/owner/marketplace/orders/${orderId}`);

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Order not found');
      }
    } catch (error) {
      console.error('❌ Get order details error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch order details'
      );
    }
  }

  /**
   * Create new marketplace order
   * @param {Object} orderData - Order data
   * @returns {Promise<Object>} Created order
   */
  async createMarketplaceOrder(orderData) {
    try {
      console.log('➕ Creating new marketplace order');

      const response = await api.post('/owner/marketplace/orders', {
        restaurantId: orderData.restaurantId,
        vendorId: orderData.vendorId,
        items: orderData.items, // [{ productId, qty }]
      });

      if (response.data.ok) {
        console.log('✅ Order created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create order');
      }
    } catch (error) {
      console.error('❌ Create marketplace order error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to create order'
      );
    }
  }

  /**
   * Rate a marketplace order
   * @param {string} orderId - Order ID
   * @param {number} rating - Rating (1-5)
   * @param {string} review - Optional review text
   * @returns {Promise<Object>} Updated order
   */
  async rateOrder(orderId, rating, review = '') {
    try {
      console.log('⭐ Rating order:', orderId, 'Rating:', rating);

      const response = await api.post(`/owner/marketplace/orders/${orderId}/rate`, {
        rating: rating,
        review: review,
      });

      if (response.data.ok) {
        console.log('✅ Order rated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to rate order');
      }
    } catch (error) {
      console.error('❌ Rate order error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to rate order'
      );
    }
  }

  /**
   * Get order invoice as PDF
   * @param {string} orderId - Order ID
   * @returns {Promise<Blob>} PDF blob
   */
  async getOrderInvoice(orderId) {
    try {
      console.log('📄 Fetching order invoice:', orderId);

      const response = await api.get(`/owner/marketplace/orders/${orderId}/invoice`, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('❌ Get order invoice error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to get order invoice'
      );
    }
  }

  /**
   * Get marketplace products from vendors
   * @param {string} vendorId - Optional vendor ID filter
   * @param {Object} filters - Optional filters (search, category)
   * @returns {Promise<Array>} List of products
   */
  async getMarketplaceProducts(vendorId = null, filters = {}) {
    try {
      console.log('🛍️ Fetching marketplace products');

      const params = {
        ...(vendorId && { vendorId }),
        ...(filters.search && { search: filters.search }),
        ...(filters.category && { category: filters.category }),
        ...(filters.page && { page: filters.page }),
        ...(filters.pageSize && { pageSize: filters.pageSize }),
      };

      const response = await api.get('/owner/marketplace/products', { params });

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Get marketplace products error:', error);
      return [];
    }
  }

  /**
   * Get available vendors
   * @returns {Promise<Array>} List of vendors
   */
  async getAvailableVendors() {
    try {
      console.log('🏪 Fetching available vendors');

      const response = await api.get('/owner/marketplace/vendors');

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Get vendors error:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new OrdersService();
