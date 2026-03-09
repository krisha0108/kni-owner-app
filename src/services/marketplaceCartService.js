/**
 * Marketplace Cart Service (Mobile App)
 * Server-side cart management - replaces AsyncStorage
 */

import { api } from '../api/client';

class MarketplaceCartService {
  /**
   * Fetch cart for a restaurant
   */
  async getCart(restaurantId) {
    try {
      const response = await api.get('/owner/marketplace/cart', {
        params: { restaurantId },
      });
      
      if (response.data.ok) {
        return response.data.data.items || [];
      }
      throw new Error(response.data.error || 'Failed to fetch cart');
    } catch (error) {
      console.error('Get cart error:', error);
      throw error;
    }
  }

  /**
   * Add or update item in cart
   */
  async addItem(restaurantId, vendorProductId, quantity) {
    try {
      const response = await api.post('/owner/marketplace/cart', {
        restaurantId,
        vendorProductId,
        quantity,
      });
      
      if (response.data.ok) {
        return response.data.data.items || [];
      }
      throw new Error(response.data.error || 'Failed to add item');
    } catch (error) {
      console.error('Add cart item error:', error);
      throw error;
    }
  }

  /**
   * Update cart item quantity
   */
  async updateItemQuantity(itemId, quantity) {
    try {
      const response = await api.patch(`/owner/marketplace/cart/items/${itemId}`, {
        quantity,
      });
      
      if (response.data.ok) {
        return response.data.data.items || [];
      }
      throw new Error(response.data.error || 'Failed to update item');
    } catch (error) {
      console.error('Update cart item error:', error);
      throw error;
    }
  }

  /**
   * Remove single item from cart
   */
  async removeItem(itemId) {
    try {
      const response = await api.delete(`/owner/marketplace/cart/items/${itemId}`);
      
      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to remove item');
      }
    } catch (error) {
      console.error('Remove cart item error:', error);
      throw error;
    }
  }

  /**
   * Clear entire cart or vendor-specific items
   */
  async clearCart(restaurantId, options = {}) {
    try {
      const params = { restaurantId };
      if (options.vendorId) params.vendorId = options.vendorId;
      if (options.clearAll) params.clearAll = 'true';

      const response = await api.delete('/owner/marketplace/cart', { params });
      
      if (!response.data.ok) {
        throw new Error(response.data.error || 'Failed to clear cart');
      }
    } catch (error) {
      console.error('Clear cart error:', error);
      throw error;
    }
  }
}

// Export singleton instance
export default new MarketplaceCartService();
