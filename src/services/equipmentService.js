import { api } from '../api/client';

/**
 * Equipment Service for KNI Owner App
 * Handles equipment management, service history
 */

class EquipmentService {

  /**
   * Get list of equipment for a restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} filters - Optional filters (status, search, page, pageSize)
   * @returns {Promise<Object>} Equipment list with pagination
   */
  async getEquipmentList(restaurantId, filters = {}) {
    try {
      console.log('📋 Fetching equipment list for restaurant:', restaurantId);

      const params = {
        restaurantId,
        page: filters.page || 1,
        pageSize: filters.pageSize || 20,
        ...(filters.status && { status: filters.status }),
        ...(filters.search && { search: filters.search }),
      };

      const response = await api.get('/owner/equipment', { params });

      if (response.data.ok) {
        return {
          items: response.data.data.items || [],
          total: response.data.data.total || 0,
          page: response.data.data.page || 1,
          pageSize: response.data.data.pageSize || 20,
        };
      } else {
        throw new Error(response.data.error || 'Failed to fetch equipment');
      }
    } catch (error) {
      console.error('❌ Get equipment list error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch equipment'
      );
    }
  }

  /**
   * Get equipment details by ID
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Object>} Equipment details with service history
   */
  async getEquipmentDetails(equipmentId) {
    try {
      console.log('🔍 Fetching equipment details:', equipmentId);

      const response = await api.get(`/owner/equipment/${equipmentId}`);

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Equipment not found');
      }
    } catch (error) {
      console.error('❌ Get equipment details error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch equipment details'
      );
    }
  }

  /**
   * Create new equipment
   * @param {Object} equipmentData - Equipment data
   * @returns {Promise<Object>} Created equipment
   */
  async createEquipment(equipmentData) {
    try {
      console.log('➕ Creating new equipment');

      const response = await api.post('/owner/equipment', {
        restaurantId: equipmentData.restaurantId,
        name: equipmentData.name,
        equipmentTypeId: equipmentData.equipmentTypeId,
        purchaseDate: equipmentData.purchaseDate,
        warrantyEndDate: equipmentData.warrantyEndDate,
        serialNumber: equipmentData.serialNumber,
        billImageUrl: equipmentData.billImageUrl,
        warrantyCardUrl: equipmentData.warrantyCardUrl,
        photoUrls: equipmentData.photoUrls,
        status: equipmentData.status || 'AVAILABLE',
        notes: equipmentData.notes,
      });

      if (response.data.ok) {
        console.log('✅ Equipment created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create equipment');
      }
    } catch (error) {
      console.error('❌ Create equipment error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to create equipment'
      );
    }
  }

  /**
   * Update equipment
   * @param {string} equipmentId - Equipment ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated equipment
   */
  async updateEquipment(equipmentId, updates) {
    try {
      console.log('✏️ Updating equipment:', equipmentId);

      const response = await api.patch(`/owner/equipment/${equipmentId}`, updates);

      if (response.data.ok) {
        console.log('✅ Equipment updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update equipment');
      }
    } catch (error) {
      console.error('❌ Update equipment error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to update equipment'
      );
    }
  }

  /**
   * Delete equipment (soft delete)
   * @param {string} equipmentId - Equipment ID
   */
  async deleteEquipment(equipmentId) {
    try {
      console.log('🗑️ Deleting equipment:', equipmentId);

      const response = await api.delete(`/owner/equipment/${equipmentId}`);

      if (response.data.ok) {
        console.log('✅ Equipment deleted successfully');
      } else {
        throw new Error(response.data.error || 'Failed to delete equipment');
      }
    } catch (error) {
      console.error('❌ Delete equipment error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to delete equipment'
      );
    }
  }

  /**
   * Get equipment types/categories
   * @returns {Promise<Array>} List of equipment types
   */
  async getEquipmentTypes() {
    try {
      console.log('📦 Fetching equipment types');

      const response = await api.get('/public/equipment-types');

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Get equipment types error:', error);
      return [];
    }
  }

  /**
   * Request service for equipment (direct booking without cart)
   * @param {Object} serviceData - Service request data
   * @returns {Promise<Object>} Created booking
   */
  async requestService(serviceData) {
    try {
      console.log('🔧 Requesting service for equipment:', serviceData.equipmentId);

      const response = await api.post('/owner/equipment-booking', {
        restaurantId: serviceData.restaurantId,
        equipmentId: serviceData.equipmentId,
        serviceTemplateIds: serviceData.serviceTemplateIds,
        slotStartDateTime: serviceData.slotStartDateTime,
        problemDescription: serviceData.problemDescription,
      });

      if (response.data.ok) {
        console.log('✅ Service request created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create service request');
      }
    } catch (error) {
      console.error('❌ Request service error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to request service'
      );
    }
  }

  /**
   * Get AMC plans for equipment
   * @param {string} equipmentId - Equipment ID
   * @returns {Promise<Array>} Available AMC plans
   */
  async getEquipmentAMCPlans(equipmentId) {
    try {
      console.log('📋 Fetching AMC plans for equipment:', equipmentId);

      const response = await api.get(`/owner/equipment/${equipmentId}/amc`);

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        return [];
      }
    } catch (error) {
      console.error('❌ Get AMC plans error:', error);
      return [];
    }
  }
}

// Export singleton instance
export default new EquipmentService();
