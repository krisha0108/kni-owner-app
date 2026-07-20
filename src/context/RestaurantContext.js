// context/RestaurantContext.js - Global Restaurant Selection Context
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

const RestaurantContext = createContext(null);

const STORAGE_KEY = 'selectedRestaurantId';

const RESTAURANTS_TTL_MS = 60000;

export function RestaurantProvider({ children }) {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchedAtRef = React.useRef(0);

  // Load restaurants from API. Skips the network call if fetched within the
  // last RESTAURANTS_TTL_MS unless { force: true } is passed (e.g. pull-to-refresh).
  const loadRestaurants = useCallback(async ({ force = false } = {}) => {
    if (!force && lastFetchedAtRef.current && Date.now() - lastFetchedAtRef.current < RESTAURANTS_TTL_MS) {
      setLoading(false);
      return;
    }

    try {
      // Don't fetch if user is not logged in
      const token = await AsyncStorage.getItem('userToken');
      if (!token) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const response = await api.get('/owner/restaurants/accessible');
      lastFetchedAtRef.current = Date.now();

      if (response.data.ok) {
        // Transform accessible response: { restaurantId, role, restaurant } -> flat restaurant with restaurantRole
        const approvedRestaurants = (response.data.data || []).map(item => ({
          ...item.restaurant,
          restaurantRole: item.role,
        }));
        setRestaurants(approvedRestaurants);

        // Try to restore previously selected restaurant
        const savedId = await AsyncStorage.getItem(STORAGE_KEY);

        if (savedId && approvedRestaurants.some(r => r.id === savedId)) {
          // Saved restaurant still exists and is approved
          setSelectedRestaurantId(savedId);
        } else if (approvedRestaurants.length > 0) {
          // Auto-select first restaurant
          const firstId = approvedRestaurants[0].id;
          setSelectedRestaurantId(firstId);
          await AsyncStorage.setItem(STORAGE_KEY, firstId);
        } else {
          // No approved restaurants
          setSelectedRestaurantId(null);
          await AsyncStorage.removeItem(STORAGE_KEY);
        }
      } else {
        setError(response.data.error || 'Failed to load restaurants');
      }
    } catch (err) {
      if (__DEV__) console.error('RestaurantContext: Error loading restaurants:', err);
      setError(err.message || 'Failed to load restaurants');
    } finally {
      setLoading(false);
    }
  }, []);

  // Change selected restaurant
  const selectRestaurant = useCallback(async (restaurantId) => {
    if (restaurantId && restaurants.some(r => r.id === restaurantId)) {
      setSelectedRestaurantId(restaurantId);
      await AsyncStorage.setItem(STORAGE_KEY, restaurantId);
      if (__DEV__) console.log('RestaurantContext: Selected restaurant:', restaurantId);
    }
  }, [restaurants]);

  // Get selected restaurant object
  const selectedRestaurant = restaurants.find(r => r.id === selectedRestaurantId) || null;

  // Load restaurants on mount
  useEffect(() => {
    loadRestaurants();
  }, [loadRestaurants]);

  const value = {
    // State
    restaurants,
    selectedRestaurant,
    selectedRestaurantId,
    loading,
    error,

    // Actions
    loadRestaurants,
    selectRestaurant,

    // Helpers
    hasRestaurants: restaurants.length > 0,
    hasMultipleRestaurants: restaurants.length > 1,
  };

  return (
    <RestaurantContext.Provider value={value}>
      {children}
    </RestaurantContext.Provider>
  );
}

// Custom hook for using restaurant context
export function useRestaurant() {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurant must be used within a RestaurantProvider');
  }
  return context;
}

export default RestaurantContext;
