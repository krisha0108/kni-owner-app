import { api } from '../api/client';

/**
 * AMC Service for KNI Owner App
 * Handles AMC requests, proposals, contracts, visits, breakdowns
 */

class AMCService {

  // ─── AMC Requests ───

  async getRequests(restaurantId) {
    try {
      console.log('📋 Fetching AMC requests');
      const params = { ...(restaurantId ? { restaurantId } : {}) };
      const response = await api.get('/owner/amc-requests', { params });
      if (response.data.ok) {
        return response.data.data || [];
      }
      throw new Error(response.data.error || 'Failed to fetch AMC requests');
    } catch (error) {
      console.error('❌ Get AMC requests error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch AMC requests'
      );
    }
  }

  async getRequestDetail(id) {
    try {
      console.log('🔍 Fetching AMC request detail:', id);
      const response = await api.get(`/owner/amc-requests/${id}`);
      if (response.data.ok) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'AMC request not found');
    } catch (error) {
      console.error('❌ Get AMC request detail error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch AMC request'
      );
    }
  }

  async createRequest(data) {
    try {
      console.log('➕ Creating AMC request');
      const response = await api.post('/owner/amc-requests', data);
      if (response.data.ok) {
        console.log('✅ AMC request created');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to create AMC request');
    } catch (error) {
      console.error('❌ Create AMC request error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to create AMC request'
      );
    }
  }

  async cancelRequest(id) {
    try {
      console.log('🗑️ Cancelling AMC request:', id);
      const response = await api.delete(`/owner/amc-requests/${id}`);
      if (response.data.ok) {
        console.log('✅ AMC request cancelled');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to cancel AMC request');
    } catch (error) {
      console.error('❌ Cancel AMC request error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to cancel AMC request'
      );
    }
  }

  // ─── Proposals ───

  async getProposal(id) {
    try {
      console.log('📄 Fetching AMC proposal:', id);
      const response = await api.get(`/owner/amc-proposals/${id}`);
      if (response.data.ok) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Proposal not found');
    } catch (error) {
      console.error('❌ Get proposal error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch proposal'
      );
    }
  }

  async acceptProposal(id) {
    try {
      console.log('✅ Accepting AMC proposal:', id);
      const response = await api.post(`/owner/amc-proposals/${id}/accept`);
      if (response.data.ok) {
        console.log('✅ Proposal accepted');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to accept proposal');
    } catch (error) {
      console.error('❌ Accept proposal error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to accept proposal'
      );
    }
  }

  async rejectProposal(id, reason) {
    try {
      console.log('❌ Rejecting AMC proposal:', id);
      const response = await api.post(`/owner/amc-proposals/${id}/reject`, { reason });
      if (response.data.ok) {
        console.log('✅ Proposal rejected');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to reject proposal');
    } catch (error) {
      console.error('❌ Reject proposal error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to reject proposal'
      );
    }
  }

  // ─── Payment ───

  async uploadPayment(paymentId, screenshotUrl) {
    try {
      console.log('💳 Uploading AMC payment:', paymentId);
      const response = await api.post(`/owner/amc-payment/${paymentId}/upload`, { screenshotUrl });
      if (response.data.ok) {
        console.log('✅ Payment uploaded');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to upload payment');
    } catch (error) {
      console.error('❌ Upload payment error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to upload payment'
      );
    }
  }

  // ─── Contracts ───

  async getContracts(restaurantId) {
    try {
      console.log('📋 Fetching AMC contracts');
      const params = { ...(restaurantId ? { restaurantId } : {}) };
      const response = await api.get('/owner/amc-contracts', { params });
      if (response.data.ok) {
        return response.data.data || [];
      }
      throw new Error(response.data.error || 'Failed to fetch contracts');
    } catch (error) {
      console.error('❌ Get contracts error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch contracts'
      );
    }
  }

  async getContractDetail(id) {
    try {
      console.log('🔍 Fetching AMC contract detail:', id);
      const response = await api.get(`/owner/amc-contracts/${id}`);
      if (response.data.ok) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Contract not found');
    } catch (error) {
      console.error('❌ Get contract detail error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch contract'
      );
    }
  }

  async renewContract(id) {
    try {
      console.log('🔄 Renewing AMC contract:', id);
      const response = await api.post(`/owner/amc-contracts/${id}/renew`);
      if (response.data.ok) {
        console.log('✅ Contract renewal requested');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to renew contract');
    } catch (error) {
      console.error('❌ Renew contract error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to renew contract'
      );
    }
  }

  // ─── Visits & Breakdowns ───

  async getVisits(restaurantId) {
    try {
      console.log('📅 Fetching AMC visits');
      const params = { ...(restaurantId ? { restaurantId } : {}) };
      const response = await api.get('/owner/amc-visits', { params });
      if (response.data.ok) {
        return response.data.data || [];
      }
      throw new Error(response.data.error || 'Failed to fetch visits');
    } catch (error) {
      console.error('❌ Get visits error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch visits'
      );
    }
  }

  async getBreakdowns(restaurantId) {
    try {
      console.log('🔧 Fetching AMC breakdowns');
      const params = { ...(restaurantId ? { restaurantId } : {}) };
      const response = await api.get('/owner/amc-breakdown', { params });
      if (response.data.ok) {
        return response.data.data || [];
      }
      throw new Error(response.data.error || 'Failed to fetch breakdowns');
    } catch (error) {
      console.error('❌ Get breakdowns error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch breakdowns'
      );
    }
  }

  async createBreakdown(data) {
    try {
      console.log('🆘 Creating AMC breakdown request');
      const response = await api.post('/owner/amc-breakdown', data);
      if (response.data.ok) {
        console.log('✅ Breakdown request created');
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to create breakdown request');
    } catch (error) {
      console.error('❌ Create breakdown error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to create breakdown request'
      );
    }
  }

  // ─── Dashboard ───

  async getDashboard(restaurantId) {
    try {
      console.log('📊 Fetching AMC dashboard');
      const params = { ...(restaurantId ? { restaurantId } : {}) };
      const response = await api.get('/owner/amc-dashboard', { params });
      if (response.data.ok) {
        return response.data.data;
      }
      throw new Error(response.data.error || 'Failed to fetch dashboard');
    } catch (error) {
      console.error('❌ Get dashboard error:', error);
      throw new Error(
        error.response?.data?.error || error.message || 'Failed to fetch dashboard'
      );
    }
  }

  // ─── Shared ───

  async getPaymentSettings() {
    try {
      const response = await api.get('/public/payment-settings');
      if (response.data?.ok && response.data?.data) {
        return response.data.data;
      }
      return null;
    } catch (error) {
      console.error('❌ Get payment settings error:', error);
      return null;
    }
  }

  async getCategories() {
    try {
      const response = await api.get('/app/categories');
      if (response.data?.ok) {
        return response.data.data || [];
      }
      return [];
    } catch (error) {
      console.error('❌ Get categories error:', error);
      return [];
    }
  }
}

export default new AMCService();
