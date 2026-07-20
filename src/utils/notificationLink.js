/**
 * Resolves a notification's backend `linkUrl` (a web-style path, e.g.
 * "/owner/bookings/abc123") into an in-app navigation target. The set of
 * `linkUrl` values is defined server-side in src/server/notifications/service.ts.
 */
export function resolveNotificationLink(linkUrl) {
  if (!linkUrl) return null;

  const bookingMatch = linkUrl.match(/^\/owner\/bookings\/([^/]+)/);
  if (bookingMatch) {
    return { screen: 'BookingDetail', params: { bookingId: bookingMatch[1] } };
  }

  if (linkUrl.startsWith('/owner/restaurant/status')) {
    return { screen: 'RestaurantStatus', params: {} };
  }

  if (linkUrl.startsWith('/owner/restaurants')) {
    return { screen: 'MyRestaurants', params: {} };
  }

  if (linkUrl.startsWith('/owner/support')) {
    return { screen: 'SupportCenter', params: {} };
  }

  if (linkUrl.startsWith('/owner/team')) {
    return { screen: 'TeamManagement', params: {} };
  }

  return null;
}
