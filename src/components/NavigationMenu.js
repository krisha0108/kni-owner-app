import React, { useEffect, useRef, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  useWindowDimensions,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scale, moderateScale, isTablet } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import { RestaurantSelectorCompact } from './RestaurantSelector';

const C = {
  primary: '#EF3A3A',
  primaryDark: '#D42E2E',
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
      { icon: 'bar-chart-outline', label: 'Analytics', screen: 'Analytics', permission: 'analytics:read' },
    ],
  },
  {
    title: 'Business',
    items: [
      { icon: 'restaurant-outline', label: 'My Restaurants', screen: 'MyRestaurants', permission: 'restaurant:read' },
      { icon: 'people-outline', label: 'Team Management', screen: 'TeamManagement', permission: 'team:read' },
    ],
  },
  {
    title: 'Equipment',
    items: [
      { icon: 'hardware-chip-outline', label: 'My Equipment', screen: 'MyEquipment', permission: 'equipment:read' },
    ],
  },
  {
    title: 'Finance',
    items: [
      { icon: 'cash-outline', label: 'My Expenses', screen: 'Expenses', permission: 'expenses:read' },
      { icon: 'pie-chart-outline', label: 'Spending Reports', screen: 'SpendingReports', permission: 'expenses:read' },
      { icon: 'book-outline', label: 'Khatabook', screen: 'Khatabook', permission: 'vendor-ledger:read' },
    ],
  },
  {
    title: 'Staff Management',
    items: [
      { icon: 'person-outline', label: 'Staff Management', screen: 'Staff', permission: 'staff:read' },
      { icon: 'calendar-outline', label: 'Staff Attendance', screen: 'StaffAttendance', permission: 'staff:read' },
      { icon: 'card-outline', label: 'Staff Salary', screen: 'StaffSalary', permission: 'staff:read' },
      { icon: 'receipt-outline', label: 'Vendor Ledger', screen: 'VendorLedger', permission: 'vendor-ledger:read' },
    ],
  },
  {
    title: 'Services',
    items: [
      { icon: 'folder-outline', label: 'Category Request', screen: 'CategoryRequest', permission: 'category:read' },
    ],
  },
  {
    title: 'Bookings',
    items: [
      { icon: 'calendar-outline', label: 'My Bookings', screen: 'MyBookings', permission: 'bookings:read' },
      { icon: 'gift-outline', label: 'Offers', screen: 'Offers', permission: 'bookings:read' },
      { icon: 'hourglass-outline', label: 'Pending Approvals', screen: 'PendingApproval', permission: 'bookings:update' },
    ],
  },
  {
    title: 'Marketplace',
    items: [
      { icon: 'storefront-outline', label: 'Marketplace', screen: 'Marketplace', permission: 'marketplace:read' },
      { icon: 'bag-check-outline', label: 'My Orders', screen: 'MarketplaceOrders', permission: 'marketplace:read' },
      { icon: 'locate-outline', label: 'Order Tracking', screen: 'OrderTracking', permission: 'marketplace:read' },
    ],
  },
  {
    title: 'Others',
    items: [
      // Profile lives in the pinned footer row now, not in this scrolling list.
      { icon: 'headset-outline', label: 'Support', screen: 'SupportCenter', permission: 'support:read' },
      { icon: 'notifications-outline', label: 'Notifications', screen: 'Notifications' },
    ],
  },
];

const ANIM_DURATION = 260;

export default function NavigationMenu({ visible, onClose, navigation }) {
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();

  const isTabletDevice = isTablet(width);
  const drawerWidth = isTabletDevice ? Math.min(320, width * 0.48) : Math.min(280, width * 0.76);

  // 0 = fully closed (off-screen left), 1 = fully open. Driven manually (not by
  // Modal's own animationType, which only supports sliding from the bottom) so
  // the drawer can slide in/out from the left and the backdrop can fade with it.
  const progress = useRef(new Animated.Value(0)).current;
  // Keeps the Modal mounted for the duration of the close animation - Modal
  // unmounts its content immediately when `visible` goes false, which would
  // otherwise cut the slide-out short.
  const [modalVisible, setModalVisible] = React.useState(visible);
  const [query, setQuery] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    if (visible) {
      setModalVisible(true);
      setQuery('');
      Animated.timing(progress, {
        toValue: 1,
        duration: ANIM_DURATION,
        useNativeDriver: true,
      }).start();
      // Cheap read of the cached login payload - no network call - just for
      // the name/email shown in the footer row.
      AsyncStorage.getItem('user')
        .then((raw) => setUser(raw ? JSON.parse(raw) : null))
        .catch(() => {});
    }
  }, [visible]);

  const handleClose = () => {
    Animated.timing(progress, {
      toValue: 0,
      duration: ANIM_DURATION,
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      onClose();
    });
  };

  const iconSize = isTabletDevice ? scale(18) : scale(16);
  const labelSize = isTabletDevice ? moderateScale(14.5) : moderateScale(13.5);
  const sectionTitleSize = isTabletDevice ? moderateScale(11) : moderateScale(10);

  const handleNavigate = (screen) => {
    handleClose();
    navigation.navigate(screen);
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-drawerWidth, 0],
  });

  // Permission-filtered first, then narrowed further by the search box - kept
  // as one pass so a query never reveals an item the owner can't open.
  const visibleSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MENU_SECTIONS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.permission && !can(item.permission)) return false;
        if (q && !item.label.toLowerCase().includes(q)) return false;
        return true;
      }),
    })).filter((section) => section.items.length > 0);
  }, [query, can]);

  const initial = ((user?.name || 'U').trim()[0] || 'U').toUpperCase();

  return (
    <Modal
      visible={modalVisible}
      animationType="none"
      transparent={true}
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, { opacity: progress }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[
          styles.menuContainer,
          {
            width: drawerWidth,
            transform: [{ translateX }],
          }
        ]}>
          {/* Header */}
          <LinearGradient
            colors={[C.primary, C.primaryDark]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={[styles.menuHeader, { paddingTop: Math.min(insets.top, scale(20)) + scale(4), paddingHorizontal: scale(14) }]}
          >
            <View style={styles.headerTop}>
              <View style={styles.headerLeft}>
                <View style={[styles.logoBox, { width: scale(28), height: scale(28), borderRadius: scale(9) }]}>
                  <Icon name="storefront" size={scale(15)} color={C.primary} />
                </View>
                <Text style={[styles.menuTitle, { fontSize: moderateScale(17) }]}>KNI Owner</Text>
              </View>
              <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
                <Icon name="close" size={scale(17)} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* Restaurant switcher - the compact variant (already truncates to
              one line instead of wrapping), not the full-width bar, which
              was designed for a full-screen page and wrapped to two lines in
              this narrower drawer. Same underlying switch-modal either way. */}
          <RestaurantSelectorCompact style={styles.restaurantSwitcher} />

          {/* Search */}
          <View style={[styles.searchBox, { marginHorizontal: scale(12), marginTop: scale(10) }]}>
            <Icon name="search" size={scale(14)} color={C.muted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search menu"
              placeholderTextColor={C.muted}
              style={[styles.searchInput, { fontSize: labelSize }]}
            />
            {query.length > 0 && (
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={scale(15)} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>

          {/* Menu Items */}
          <ScrollView
            style={styles.menuScroll}
            contentContainerStyle={{ paddingHorizontal: scale(12), paddingTop: scale(10) }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {visibleSections.map((section, sectionIndex) => (
              <View key={sectionIndex} style={styles.section}>
                <Text style={[styles.sectionTitle, { fontSize: sectionTitleSize, paddingHorizontal: scale(6) }]}>
                  {section.title}
                </Text>
                {section.items.map((item, itemIndex) => (
                  <TouchableOpacity
                    key={itemIndex}
                    activeOpacity={0.6}
                    style={[styles.menuItem, { paddingVertical: scale(8), paddingHorizontal: scale(8), borderRadius: scale(10) }]}
                    onPress={() => handleNavigate(item.screen)}
                  >
                    <Icon name={item.icon} size={iconSize} color={C.ink} style={{ width: iconSize }} />
                    <Text style={[styles.menuItemText, { fontSize: labelSize, marginLeft: scale(11) }]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
            {visibleSections.length === 0 && (
              <Text style={styles.noResults}>No matches for "{query}"</Text>
            )}
            <View style={{ height: scale(12), width: '100%' }} />
          </ScrollView>

          {/* Profile - pinned at the bottom instead of sitting inside the
              scrolling list, so it's reachable without scrolling down. */}
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={() => handleNavigate('Profile')}
            style={[styles.footer, { paddingBottom: Math.max(scale(10), insets.bottom), paddingHorizontal: scale(14) }]}
          >
            <View style={[styles.avatar, { width: scale(32), height: scale(32), borderRadius: scale(16) }]}>
              <Text style={styles.avatarText}>{initial}</Text>
            </View>
            <View style={styles.footerText}>
              <Text style={styles.footerName} numberOfLines={1}>{user?.name || 'My Profile'}</Text>
              <Text style={styles.footerRole} numberOfLines={1}>{user?.email || 'View profile'}</Text>
            </View>
            <Icon name="chevron-forward" size={scale(15)} color={C.muted} />
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: '100%',
    backgroundColor: C.card,
    borderTopRightRadius: scale(24),
    borderBottomRightRadius: scale(24),
    overflow: 'hidden',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  menuHeader: {
    paddingBottom: scale(6),
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoBox: {
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(8),
  },
  menuTitle: {
    fontWeight: 'bold',
    color: '#fff',
  },
  closeBtn: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  restaurantSwitcher: {
    marginHorizontal: scale(12),
    marginTop: scale(10),
    maxWidth: undefined,
    width: 'auto',
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    borderRadius: scale(10),
    paddingVertical: scale(8),
    paddingHorizontal: scale(10),
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(7),
    backgroundColor: C.bg,
    borderRadius: scale(10),
    paddingHorizontal: scale(10),
    paddingVertical: scale(7),
  },
  searchInput: {
    flex: 1,
    padding: 0,
    color: C.text,
  },
  menuScroll: {
    flex: 1,
  },
  section: {
    marginBottom: scale(8),
  },
  sectionTitle: {
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: scale(4),
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  menuItemText: {
    flex: 1,
    color: C.text,
    fontWeight: '600',
  },
  noResults: {
    textAlign: 'center',
    color: C.muted,
    fontSize: moderateScale(13),
    marginTop: scale(24),
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingTop: scale(10),
  },
  avatar: {
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
  },
  avatarText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(13),
  },
  footerText: {
    flex: 1,
  },
  footerName: {
    fontWeight: '700',
    color: C.ink,
    fontSize: moderateScale(13),
  },
  footerRole: {
    color: C.muted,
    fontSize: moderateScale(11),
    marginTop: 1,
  },
});
