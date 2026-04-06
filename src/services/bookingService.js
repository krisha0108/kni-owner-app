import { api } from '../api/client';

/**
 * Booking Service for KNI Owner App
 * Handles service bookings/requests management
 */

class BookingService {

  /**
   * Get list of bookings for a restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} filters - Optional filters (status, page, pageSize)
   * @returns {Promise<Array>} List of bookings
   */
  async getBookingsList(restaurantId, filters = {}) {
    try {
      console.log('📋 Fetching bookings for restaurant:', restaurantId);

      const params = {
        restaurantId,
        ...(filters.status && { status: filters.status }),
        ...(filters.page && { page: filters.page }),
        ...(filters.pageSize && { pageSize: filters.pageSize }),
      };

      const response = await api.get('/owner/bookings', { params });

      if (response.data.ok) {
        return response.data.data || [];
      } else {
        throw new Error(response.data.error || 'Failed to fetch bookings');
      }
    } catch (error) {
      console.error('❌ Get bookings error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch bookings'
      );
    }
  }

  /**
   * Get booking details by ID
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Object>} Booking details
   */
  async getBookingDetails(bookingId) {
    try {
      console.log('🔍 Fetching booking details:', bookingId);

      const response = await api.get(`/owner/bookings/${bookingId}`);

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Booking not found');
      }
    } catch (error) {
      console.error('❌ Get booking details error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch booking details'
      );
    }
  }

  /**
   * Create new booking from cart
   * @param {Object} bookingData - Booking data
   * @returns {Promise<Object>} Created booking
   */
  async createBooking(bookingData) {
    try {
      console.log('➕ Creating new booking');

      const response = await api.post('/owner/bookings', {
        restaurantId: bookingData.restaurantId,
        slotStartDateTime: bookingData.slotStartDateTime,
        slotEndDateTime: bookingData.slotEndDateTime,
      });

      if (response.data.ok) {
        console.log('✅ Booking created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create booking');
      }
    } catch (error) {
      console.error('❌ Create booking error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to create booking'
      );
    }
  }

  /**
   * Upload payment proof for booking
   * @param {string} bookingId - Booking ID
   * @param {string} paymentProofUri - Local URI of payment proof image
   * @returns {Promise<Object>} Updated booking
   */
  async uploadPaymentProof(bookingId, paymentProofUri) {
    try {
      console.log('📸 Uploading payment proof for booking:', bookingId);

      // Detect MIME type from file extension
      const ext = (paymentProofUri || '').split('.').pop()?.toLowerCase();
      const mimeMap = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp', heic: 'image/heic' };
      const mimeType = mimeMap[ext] || 'image/jpeg';
      const fileExt = mimeType.split('/')[1] || 'jpg';

      // Create FormData
      const formData = new FormData();
      formData.append('paymentProof', {
        uri: paymentProofUri,
        type: mimeType,
        name: `payment-proof.${fileExt}`,
      });

      const response = await api.post(
        `/owner/bookings/${bookingId}/upload-payment`,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      if (response.data.ok) {
        console.log('✅ Payment proof uploaded successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to upload payment proof');
      }
    } catch (error) {
      console.error('❌ Upload payment proof error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to upload payment proof'
      );
    }
  }

  /**
   * Rate a completed booking
   * @param {string} bookingId - Booking ID
   * @param {number} rating - Rating (1-5)
   * @param {string} review - Optional review text
   * @returns {Promise<Object>} Updated booking
   */
  async rateBooking(bookingId, rating, review = '') {
    try {
      console.log('⭐ Rating booking:', bookingId, 'Rating:', rating);

      const response = await api.post(`/owner/bookings/${bookingId}/rate`, {
        rating: rating,
        review: review,
      });

      if (response.data.ok) {
        console.log('✅ Booking rated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to rate booking');
      }
    } catch (error) {
      console.error('❌ Rate booking error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to rate booking'
      );
    }
  }

  /**
   * Get booking invoice as PDF
   * @param {string} bookingId - Booking ID
   * @returns {Promise<Blob>} PDF blob
   */
  async getBookingInvoice(bookingId) {
    try {
      console.log('📄 Fetching booking invoice:', bookingId);

      const response = await api.get(`/owner/bookings/${bookingId}/invoice`, {
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('❌ Get booking invoice error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to get booking invoice'
      );
    }
  }

  /**
   * Get cart items (for creating bookings)
   * @returns {Promise<Object>} Cart with items
   */
  async getCart() {
    try {
      console.log('🛒 Fetching cart');

      const response = await api.get('/owner/cart');

      if (response.data.ok) {
        return response.data.data;
      } else {
        return null;
      }
    } catch (error) {
      console.error('❌ Get cart error:', error);
      return null;
    }
  }

  /**
   * Add item to cart
   * @param {Object} item - Item to add
   * @returns {Promise<Object>} Updated cart
   */
  async addToCart(item) {
    try {
      console.log('➕ Adding item to cart');

      const response = await api.post('/owner/cart', {
        itemType: item.itemType, // 'SERVICE' or 'PART'
        serviceItemId: item.serviceItemId,
        partItemId: item.partItemId,
        qty: item.qty || 1,
      });

      if (response.data.ok) {
        console.log('✅ Item added to cart');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to add item to cart');
      }
    } catch (error) {
      console.error('❌ Add to cart error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to add item to cart'
      );
    }
  }

  /**
   * Remove item from cart
   * @param {string} itemId - Cart item ID
   * @returns {Promise<Object>} Updated cart
   */
  async removeFromCart(itemId) {
    try {
      console.log('🗑️ Removing item from cart:', itemId);

      const response = await api.delete(`/owner/cart?itemId=${itemId}`);

      if (response.data.ok) {
        console.log('✅ Item removed from cart');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to remove item from cart');
      }
    } catch (error) {
      console.error('❌ Remove from cart error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to remove item from cart'
      );
    }
  }
}

// Export singleton instance
export default new BookingService();
