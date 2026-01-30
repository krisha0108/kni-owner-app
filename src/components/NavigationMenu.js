import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

const MENU_SECTIONS = [
  {
    title: 'Overview',
    items: [
      { icon: 'grid-outline', label: 'Dashboard', screen: 'Dashboard' },
      { icon: 'bar-chart-outline', label: 'Analytics', screen: 'Analytics' },
    ],
  },
  {
    title: 'Business',
    items: [
      { icon: 'restaurant-outline', label: 'My Restaurants', screen: 'MyRestaurants' },
      { icon: 'people-outline', label: 'Team Management', screen: 'TeamManagement' },
    ],
  },
  {
    title: 'Equipment',
    items: [
      { icon: 'hardware-chip-outline', label: 'My Equipment', screen: 'MyEquipment' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: 'cash-outline', label: 'My Expenses', screen: 'Expenses' },
      { icon: 'pie-chart-outline', label: 'Spending Reports', screen: 'SpendingReports' },
      { icon: 'book-outline', label: 'Khatabook', screen: 'Khatabook' },
    ],
  },
  {
    title: 'Staff Management',
    items: [
      { icon: 'person-outline', label: 'Staff Management', screen: 'Staff' },
      { icon: 'calendar-outline', label: 'Staff Attendance', screen: 'StaffAttendance' },
      { icon: 'card-outline', label: 'Staff Salary', screen: 'StaffSalary' },
      { icon: 'receipt-outline', label: 'Vendor Ledger', screen: 'VendorLedger' },
    ],
  },
  {
    title: 'Services',
    items: [
      { icon: 'folder-outline', label: 'Category Request', screen: 'CategoryRequest' },
      { icon: 'layers-outline', label: 'Request Services', screen: 'Request' },
      { icon: 'cart-outline', label: 'My Cart', screen: 'Cart' },
    ],
  },
  {
    title: 'Bookings',
    items: [
      { icon: 'calendar-outline', label: 'My Bookings', screen: 'MyBookings' },
      { icon: 'hourglass-outline', label: 'Pending Approvals', screen: 'PendingApproval' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { icon: 'storefront-outline', label: 'Marketplace', screen: 'Request' },
      { icon: 'bag-check-outline', label: 'My Orders', screen: 'MarketplaceOrders' },
      { icon: 'locate-outline', label: 'Order Tracking', screen: 'OrderTracking' },
    ],
  },
  {
    title: 'Others',
    items: [
      { icon: 'headset-outline', label: 'Support', screen: 'SupportCenter' },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications' },
      { icon: 'person-circle-outline', label: 'Profile', screen: 'Profile' },
    ],
  },
];

export default function NavigationMenu({ visible, onClose, navigation }) {
  const handleNavigate = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={styles.menuContainer}>
          {/* Header */}
          <View style={styles.menuHeader}>
            <View style={styles.headerLeft}>
              <View style={styles.logoBox}>
                <Icon name="storefront" size={20} color="#fff" />
              </View>
              <Text style={styles.menuTitle}>KNI Owner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={24} color={C.ink} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView style={styles.menuScroll} showsVerticalScrollIndicator={false}>
            {MENU_SECTIONS.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={styles.menuItem}
                    onPress={() => handleNavigate(item.screen)}
                  >
                    <Icon name={item.icon} size={20} color={C.primary} />
                    <Text style={styles.menuItemText}>{item.label}</Text>
                    <Icon name="chevron-forward" size={18} color={C.border} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={{ height: 20 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  backdrop: {
    flex: 1,
  },
  menuContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
    paddingBottom: 20,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  menuTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: C.ink,
  },
  closeBtn: {
    padding: 4,
  },
  menuScroll: {
    paddingHorizontal: 12,
  },
  section: {
    marginTop: 16,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 14,
    borderRadius: 12,
    marginVertical: 1,
    backgroundColor: C.bg,
    marginBottom: 4,
  },
  menuItemText: {
    flex: 1,
    fontSize: 15,
    color: C.text,
    marginLeft: 12,
    fontWeight: '500',
  },
});
