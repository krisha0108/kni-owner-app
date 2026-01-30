import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';

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
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const isTabletDevice = isTablet(width);
  const maxWidth = getContainerMaxWidth(width);

  // Responsive sizing
  const menuMaxHeight = isTabletDevice ? height * 0.75 : height * 0.85;
  const menuWidth = isTabletDevice ? Math.min(480, width * 0.8) : '100%';
  const horizontalPadding = isTabletDevice ? scale(24) : scale(20);
  const iconSize = isTabletDevice ? scale(24) : scale(20);
  const labelSize = isTabletDevice ? moderateScale(16) : moderateScale(15);
  const sectionTitleSize = isTabletDevice ? moderateScale(12) : moderateScale(11);

  const handleNavigate = (screen) => {
    onClose();
    navigation.navigate(screen);
  };

  return (
    <Modal
      visible={visible}
      animationType={isTabletDevice ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[
          styles.menuContainer,
          {
            maxHeight: menuMaxHeight,
            width: menuWidth,
            paddingBottom: Math.max(scale(20), insets.bottom),
            alignSelf: isTabletDevice ? 'center' : 'stretch',
            borderRadius: isTabletDevice ? scale(24) : undefined,
            borderTopLeftRadius: scale(24),
            borderTopRightRadius: scale(24),
          }
        ]}>
          {/* Header */}
          <View style={[styles.menuHeader, { paddingHorizontal: horizontalPadding }]}>
            <View style={styles.headerLeft}>
              <View style={[styles.logoBox, { width: scale(36), height: scale(36), borderRadius: scale(10) }]}>
                <Icon name="storefront" size={scale(20)} color="#fff" />
              </View>
              <Text style={[styles.menuTitle, { fontSize: moderateScale(18) }]}>KNI Owner</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={scale(24)} color={C.ink} />
            </TouchableOpacity>
          </View>

          {/* Menu Items */}
          <ScrollView
            style={[styles.menuScroll, { paddingHorizontal: scale(12) }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={isTabletDevice ? { flexDirection: 'row', flexWrap: 'wrap' } : undefined}
          >
            {MENU_SECTIONS.map((section, sectionIndex) => (
              <View
                key={sectionIndex}
                style={[
                  styles.section,
                  isTabletDevice && { width: '50%', paddingHorizontal: scale(4) }
                ]}
              >
                <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, paddingHorizontal: scale(8) }]}>
                  {section.title}
                </Text>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    style={[styles.menuItem, { paddingVertical: scale(14), paddingHorizontal: scale(12), borderRadius: scale(12) }]}
                    onPress={() => handleNavigate(item.screen)}
                  >
                    <Icon name={item.icon} size={iconSize} color={C.primary} />
                    <Text style={[styles.menuItemText, { fontSize: labelSize, marginLeft: scale(12) }]}>{item.label}</Text>
                    <Icon name="chevron-forward" size={scale(18)} color={C.border} />
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            <View style={{ height: scale(20), width: '100%' }} />
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
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  menuTitle: {
    fontWeight: 'bold',
    color: C.ink,
  },
  closeBtn: {
    padding: scale(4),
  },
  menuScroll: {},
  section: {
    marginTop: scale(16),
  },
  sectionTitle: {
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(8),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    marginBottom: scale(4),
  },
  menuItemText: {
    flex: 1,
    color: C.text,
    fontWeight: '500',
  },
});
