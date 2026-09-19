import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale } from '../utils/responsive';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

const MENU_ITEMS = [
  // Overview
  { name: 'Analytics', screen: 'Analytics', icon: 'bar-chart-outline', section: 'overview' },

  // Business
  { name: 'My Restaurants', screen: 'MyRestaurants', icon: 'restaurant-outline', section: 'business' },
  { name: 'Team Management', screen: 'TeamManagement', icon: 'people-outline', section: 'business' },

  // Equipment
  { name: 'My Equipment', screen: 'MyEquipment', icon: 'hardware-chip-outline', section: 'equipment' },

  // Finance
  { name: 'My Expenses', screen: 'Expenses', icon: 'cash-outline', section: 'finance' },
  { name: 'Spending Reports', screen: 'SpendingReports', icon: 'pie-chart-outline', section: 'finance' },
  { name: 'Khatabook', screen: 'Khatabook', icon: 'book-outline', section: 'finance' },

  // Staff Management
  { name: 'Staff Management', screen: 'Staff', icon: 'person-outline', section: 'staff' },
  { name: 'Staff Attendance', screen: 'StaffAttendance', icon: 'calendar-outline', section: 'staff' },
  { name: 'Staff Salary', screen: 'StaffSalary', icon: 'card-outline', section: 'staff' },
  { name: 'Vendor Ledger', screen: 'VendorLedger', icon: 'receipt-outline', section: 'staff' },

  // Services
  { name: 'Category Request', screen: 'CategoryRequest', icon: 'folder-outline', section: 'services' },

  // Bookings
  { name: 'My Bookings', screen: 'MyBookings', icon: 'calendar-outline', section: 'bookings' },
  { name: 'Pending Approvals', screen: 'PendingApproval', icon: 'hourglass-outline', section: 'bookings' },

  // Marketplace
  { name: 'Marketplace', screen: 'Request', icon: 'storefront-outline', section: 'marketplace' },
  { name: 'My Orders', screen: 'MarketplaceOrders', icon: 'bag-check-outline', section: 'marketplace' },
  { name: 'Order Tracking', screen: 'OrderTracking', icon: 'locate-outline', section: 'marketplace' },

  // Others
  { name: 'Support', screen: 'SupportCenter', icon: 'headset-outline', section: 'others' },
  { name: 'Notifications', screen: 'Notifications', icon: 'notifications-outline', section: 'others' },
];

const SECTION_HEADERS = {
  overview: 'Overview',
  business: 'Business',
  equipment: 'Equipment',
  finance: 'Finance',
  staff: 'Staff Management',
  services: 'Services',
  bookings: 'Bookings',
  marketplace: 'Marketplace',
  others: 'Others',
};

export default function DrawerContent({ navigation, state }) {
  const currentRoute = state?.routes?.[state?.index]?.name || '';

  const handleNavigate = (screen) => {
    navigation.navigate(screen);
  };

  const renderMenuItem = (item) => {
    const isActive = currentRoute === item.screen;

    return (
      <TouchableOpacity
        key={item.screen}
        style={[styles.menuItem, isActive && styles.menuItemActive]}
        onPress={() => handleNavigate(item.screen)}
      >
        <Icon
          name={item.icon}
          size={scale(20)}
          color={isActive ? C.primary : C.muted}
          style={styles.menuIcon}
        />
        <Text style={[styles.menuText, isActive && styles.menuTextActive]}>
          {item.name}
        </Text>
        <Icon name="chevron-forward" size={scale(16)} color={isActive ? C.primary : C.border} />
      </TouchableOpacity>
    );
  };

  const renderSection = (sectionKey) => {
    const items = MENU_ITEMS.filter((item) => item.section === sectionKey);
    if (items.length === 0) return null;

    return (
      <View key={sectionKey} style={styles.section}>
        <Text style={styles.sectionHeader}>{SECTION_HEADERS[sectionKey]}</Text>
        {items.map(renderMenuItem)}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.logoBox}>
            <Icon name="storefront" size={scale(24)} color="#fff" />
          </View>
          <View>
            <Text style={styles.headerTitle}>KNI Owner</Text>
            <Text style={styles.headerSubtitle}>Restaurant Management</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.menu} showsVerticalScrollIndicator={false}>
        {Object.keys(SECTION_HEADERS).map(renderSection)}
        <View style={{ height: scale(20) }} />
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.footerButton}
          onPress={() => handleNavigate('Profile')}
        >
          <Icon name="person-circle-outline" size={scale(22)} color={C.primary} />
          <Text style={styles.footerText}>My Profile</Text>
          <Icon name="chevron-forward" size={scale(16)} color={C.muted} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.card,
  },
  header: {
    padding: scale(20),
    backgroundColor: C.primary,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(12),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: 'rgba(255,255,255,0.8)',
    marginTop: scale(2),
  },
  menu: {
    flex: 1,
  },
  section: {
    marginTop: scale(12),
  },
  sectionHeader: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: C.muted,
    paddingHorizontal: scale(20),
    paddingVertical: scale(8),
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    backgroundColor: C.bg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: scale(14),
    paddingHorizontal: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  menuItemActive: {
    backgroundColor: '#FFF5F5',
    borderLeftWidth: 3,
    borderLeftColor: C.primary,
  },
  menuIcon: {
    marginRight: scale(14),
    width: scale(24),
  },
  menuText: {
    flex: 1,
    fontSize: moderateScale(14),
    color: C.text,
  },
  menuTextActive: {
    color: C.primary,
    fontWeight: '600',
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: C.border,
    padding: scale(12),
  },
  footerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(12),
    backgroundColor: C.bg,
    borderRadius: scale(12),
  },
  footerText: {
    flex: 1,
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.ink,
    marginLeft: scale(12),
  },
});
