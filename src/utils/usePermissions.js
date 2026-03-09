// utils/usePermissions.js — React hook for RBAC permission checks
import { useMemo } from 'react';
import { useRestaurant } from '../context/RestaurantContext';
import { hasPermission } from './permissions';

/**
 * Hook that provides permission-checking helpers based on the
 * selected restaurant's role (from RestaurantContext).
 *
 * Defaults to 'OWNER' when no restaurant is selected (backward compat).
 */
export function usePermissions() {
  const { selectedRestaurant } = useRestaurant();
  const role = selectedRestaurant?.restaurantRole || 'OWNER';

  return useMemo(() => ({
    role,
    isOwner: role === 'OWNER',

    /** Check a single permission, e.g. can('bookings:create') */
    can: (permission) => hasPermission(role, permission),

    /** True if ANY of the given permissions are granted */
    canAny: (...permissions) => permissions.some((p) => hasPermission(role, p)),
  }), [role]);
}
