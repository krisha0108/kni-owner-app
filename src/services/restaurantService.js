import { api } from '../api/client';

/**
 * Restaurant Service for KNI Owner App
 * Handles the deletion-request flow for APPROVED (live) restaurants.
 */

class RestaurantService {
  /**
   * Request admin approval to delete an APPROVED restaurant.
   * @param {string} restaurantId
   * @param {string} reason
   */
  async requestDeletion(restaurantId, reason) {
    try {
      const response = await api.post(`/owner/restaurants/${restaurantId}/deletion-request`, { reason });
      if (response.data.ok) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to submit deletion request');
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to submit deletion request'
      );
    }
  }

  /**
   * Cancel a still-pending deletion request.
   * @param {string} restaurantId
   */
  async cancelDeletionRequest(restaurantId) {
    try {
      const response = await api.delete(`/owner/restaurants/${restaurantId}/deletion-request`);
      if (response.data.ok) {
        return true;
      }
      throw new Error(response.data.error || 'Failed to cancel deletion request');
    } catch (error) {
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to cancel deletion request'
      );
    }
  }
}

export default new RestaurantService();
