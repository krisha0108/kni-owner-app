import { api } from '../api/client';

/**
 * Expenses Service for KNI Owner App
 * Handles expense tracking and reports
 */

class ExpensesService {

  /**
   * Get expenses for a restaurant
   * @param {string} restaurantId - Restaurant ID
   * @param {Object} filters - Optional filters (category, startDate, endDate, page, pageSize)
   * @returns {Promise<Object>} Expenses with pagination
   */
  async getExpenses(restaurantId, filters = {}) {
    try {
      console.log('💸 Fetching expenses for restaurant:', restaurantId);

      const params = {
        restaurantId,
        page: filters.page || 1,
        pageSize: filters.pageSize || 50,
        ...(filters.category && { category: filters.category }),
        ...(filters.startDate && { startDate: filters.startDate }),
        ...(filters.endDate && { endDate: filters.endDate }),
      };

      const response = await api.get('/owner/expenses', { params });

      if (response.data.ok) {
        return {
          items: response.data.data.items || [],
          total: response.data.data.total || 0,
          page: response.data.data.page || 1,
          pageSize: response.data.data.pageSize || 50,
        };
      } else {
        throw new Error(response.data.error || 'Failed to fetch expenses');
      }
    } catch (error) {
      console.error('❌ Get expenses error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch expenses'
      );
    }
  }

  /**
   * Get expense details by ID
   * @param {string} expenseId - Expense ID
   * @returns {Promise<Object>} Expense details
   */
  async getExpenseDetails(expenseId) {
    try {
      console.log('🔍 Fetching expense details:', expenseId);

      const response = await api.get(`/owner/expenses/${expenseId}`);

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Expense not found');
      }
    } catch (error) {
      console.error('❌ Get expense details error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch expense details'
      );
    }
  }

  /**
   * Create new expense
   * @param {Object} expenseData - Expense data
   * @returns {Promise<Object>} Created expense
   */
  async createExpense(expenseData) {
    try {
      console.log('➕ Creating new expense');

      const response = await api.post('/owner/expenses', {
        restaurantId: expenseData.restaurantId,
        category: expenseData.category,
        amount: expenseData.amount,
        expenseDate: expenseData.expenseDate,
        description: expenseData.description,
        receiptImageUrl: expenseData.receiptImageUrl,
      });

      if (response.data.ok) {
        console.log('✅ Expense created successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to create expense');
      }
    } catch (error) {
      console.error('❌ Create expense error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to create expense'
      );
    }
  }

  /**
   * Update expense
   * @param {string} expenseId - Expense ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated expense
   */
  async updateExpense(expenseId, updates) {
    try {
      console.log('✏️ Updating expense:', expenseId);

      const response = await api.patch(`/owner/expenses/${expenseId}`, updates);

      if (response.data.ok) {
        console.log('✅ Expense updated successfully');
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to update expense');
      }
    } catch (error) {
      console.error('❌ Update expense error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to update expense'
      );
    }
  }

  /**
   * Delete expense
   * @param {string} expenseId - Expense ID
   */
  async deleteExpense(expenseId) {
    try {
      console.log('🗑️ Deleting expense:', expenseId);

      const response = await api.delete(`/owner/expenses/${expenseId}`);

      if (response.data.ok) {
        console.log('✅ Expense deleted successfully');
      } else {
        throw new Error(response.data.error || 'Failed to delete expense');
      }
    } catch (error) {
      console.error('❌ Delete expense error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to delete expense'
      );
    }
  }

  /**
   * Get monthly expense report
   * @param {string} restaurantId - Restaurant ID
   * @param {number} year - Year
   * @param {number} month - Month (1-12)
   * @returns {Promise<Object>} Monthly expense report
   */
  async getMonthlyReport(restaurantId, year, month) {
    try {
      console.log('📊 Fetching monthly expense report:', year, month);

      const params = {
        restaurantId,
        year,
        month,
      };

      const response = await api.get('/owner/expenses/reports/monthly', { params });

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch report');
      }
    } catch (error) {
      console.error('❌ Get monthly report error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch monthly report'
      );
    }
  }

  /**
   * Export expenses as Excel/CSV
   * @param {string} restaurantId - Restaurant ID
   * @param {string} format - 'excel' or 'csv'
   * @param {string} startDate - Start date (ISO format)
   * @param {string} endDate - End date (ISO format)
   * @returns {Promise<Blob>} File blob
   */
  async exportExpenses(restaurantId, format = 'excel', startDate, endDate) {
    try {
      console.log('📥 Exporting expenses as', format);

      const params = {
        restaurantId,
        format,
        ...(startDate && { startDate }),
        ...(endDate && { endDate }),
      };

      const response = await api.get('/owner/expenses/reports/export', {
        params,
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('❌ Export expenses error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to export expenses'
      );
    }
  }

  /**
   * Get analytics/dashboard data
   * @param {string} restaurantId - Restaurant ID
   * @param {number} period - Period in days (default: 30)
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(restaurantId, period = 30) {
    try {
      console.log('📊 Fetching analytics for restaurant:', restaurantId);

      const params = {
        restaurantId,
        period,
      };

      const response = await api.get('/owner/analytics', { params });

      if (response.data.ok) {
        return response.data.data;
      } else {
        throw new Error(response.data.error || 'Failed to fetch analytics');
      }
    } catch (error) {
      console.error('❌ Get analytics error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to fetch analytics'
      );
    }
  }

  /**
   * Export analytics as PDF
   * @param {string} restaurantId - Restaurant ID
   * @param {number} period - Period in days
   * @returns {Promise<Blob>} PDF blob
   */
  async exportAnalytics(restaurantId, period = 30) {
    try {
      console.log('📥 Exporting analytics as PDF');

      const params = {
        restaurantId,
        period,
      };

      const response = await api.get('/owner/analytics/export', {
        params,
        responseType: 'blob',
      });

      return response.data;
    } catch (error) {
      console.error('❌ Export analytics error:', error);
      throw new Error(
        error.response?.data?.error ||
        error.message ||
        'Failed to export analytics'
      );
    }
  }

  /**
   * Get expense categories
   * @returns {Array} Expense categories
   */
  getExpenseCategories() {
    return [
      { value: 'RENT', label: 'Rent' },
      { value: 'UTILITIES', label: 'Utilities' },
      { value: 'FOOD', label: 'Food & Supplies' },
      { value: 'SUPPLIES', label: 'General Supplies' },
      { value: 'LABOR', label: 'Labor' },
      { value: 'MAINTENANCE', label: 'Maintenance' },
      { value: 'OTHER', label: 'Other' },
    ];
  }
}

// Export singleton instance
export default new ExpensesService();
