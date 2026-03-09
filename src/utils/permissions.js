// utils/permissions.js — RBAC permission matrix (mirrors web's restaurant-rbac.ts)

const OWNER = 'OWNER';
const MANAGER = 'MANAGER';
const ACCOUNTANT = 'ACCOUNTANT';
const VIEWER = 'VIEWER';
const ALL = [OWNER, MANAGER, ACCOUNTANT, VIEWER];

/**
 * Permission matrix: maps 'resource:action' to allowed roles.
 * Keep in sync with KNI-Super-App/src/server/auth/restaurant-rbac.ts
 */
export const PERMISSIONS = {
  // Bookings
  'bookings:create': [OWNER, MANAGER],
  'bookings:read': ALL,
  'bookings:update': [OWNER, MANAGER],
  'bookings:delete': [OWNER],

  // Marketplace
  'marketplace:create': [OWNER, MANAGER],
  'marketplace:read': ALL,

  // Equipment
  'equipment:create': [OWNER, MANAGER],
  'equipment:read': ALL,
  'equipment:update': [OWNER, MANAGER],
  'equipment:delete': [OWNER],

  // AMC
  'amc:create': [OWNER, MANAGER],
  'amc:read': ALL,
  'amc:update': [OWNER, MANAGER],
  'amc:cancel': [OWNER],

  // Expenses
  'expenses:create': [OWNER, MANAGER, ACCOUNTANT],
  'expenses:read': ALL,
  'expenses:update': [OWNER, ACCOUNTANT],
  'expenses:delete': [OWNER],

  // Team
  'team:invite': [OWNER],
  'team:read': [OWNER, MANAGER],
  'team:update': [OWNER],
  'team:remove': [OWNER],

  // Staff
  'staff:create': [OWNER, MANAGER],
  'staff:read': ALL,
  'staff:update': [OWNER, MANAGER],
  'staff:delete': [OWNER],

  // Support
  'support:create': [OWNER, MANAGER],
  'support:read': ALL,

  // Analytics
  'analytics:read': ALL,

  // Cashbook (same as expenses — finance module)
  'cashbook:create': [OWNER, MANAGER, ACCOUNTANT],
  'cashbook:read': ALL,
  'cashbook:update': [OWNER, ACCOUNTANT],
  'cashbook:delete': [OWNER],

  // Vendor Ledger
  'vendor-ledger:create': [OWNER, MANAGER, ACCOUNTANT],
  'vendor-ledger:read': ALL,

  // Service requests
  'service:create': [OWNER, MANAGER],
  'service:read': ALL,

  // Category requests
  'category:create': [OWNER, MANAGER],
  'category:read': ALL,

  // Restaurant settings
  'restaurant:read': ALL,
  'restaurant:update': [OWNER],
  'restaurant:delete': [OWNER],
};

/**
 * Check if a role has a specific permission
 * @param {string} role - e.g. 'OWNER', 'MANAGER', 'ACCOUNTANT', 'VIEWER'
 * @param {string} permission - e.g. 'bookings:create'
 * @returns {boolean}
 */
export function hasPermission(role, permission) {
  const allowed = PERMISSIONS[permission];
  if (!allowed) return false;
  return allowed.includes(role);
}
