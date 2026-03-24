// components/KniBottomNav.js
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale, isTablet, getContainerMaxWidth, BREAKPOINTS } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

/* ---------- THEME ---------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280',
  card:'#FFFFFF', bg:'#F5F7FA', border:'#E5E7EB'
};

export default function KniBottomNav({
  active = 'home',
  cartCount = 0,
  notifCount: notifCountProp = 0,
  onFabPress,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { can } = usePermissions();
  const showFab = can('marketplace:create');
  const [notifCount, setNotifCount] = useState(notifCountProp);

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const response = await api.get('/notifications/unread-count');
        if (response.data?.ok) {
          setNotifCount(response.data.data?.count || 0);
        }
      } catch (e) {
        // silently fail
      }
    };
    fetchCount();
  }, [active]);

  // Responsive sizing
  const isTabletDevice = isTablet(width);
  const barHeight = isTabletDevice ? scale(80) : scale(74);
  const barRadius = isTabletDevice ? scale(24) : scale(22);
  const fabSize = isTabletDevice ? scale(60) : scale(56);
  const fabRadius = isTabletDevice ? scale(20) : scale(18);
  const fabRaise = isTabletDevice ? scale(18) : scale(16);
  const tabMinWidth = isTabletDevice ? scale(60) : scale(50);
  const horizontalPadding = isTabletDevice ? scale(20) : scale(12);
  const iconSize = isTabletDevice ? scale(24) : scale(20);
  const fabIconSize = isTabletDevice ? scale(28) : scale(26);
  const labelSize = isTabletDevice ? moderateScale(11) : moderateScale(10);

  // Calculate max width for centering on larger screens
  const maxWidth = getContainerMaxWidth(width);

  const go = (key) => {
    if (!navigation?.navigate) return;
    if (key==='home') navigation.navigate('Home');
    if (key==='equipment') navigation.navigate('MyEquipment');
    if (key==='request') navigation.navigate('Marketplace');
    if (key==='khatabook') navigation.navigate('Khatabook');
    if (key==='profile') navigation.navigate('Profile');
  };

  const styles = createStyles({
    barHeight,
    barRadius,
    fabSize,
    fabRadius,
    fabRaise,
    tabMinWidth,
    horizontalPadding,
    maxWidth,
    iconSize,
    labelSize,
  });

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent:'flex-end' }]}>
      <View style={[styles.wrap, { paddingBottom: Math.max(scale(12), insets.bottom) }]}>
        <View style={styles.bar}>

          {/* LEFT SIDE */}
          <TabItem
            active={active==='home'}
            icon="home"
            label="Home"
            onPress={()=>go('home')}
            iconSize={iconSize}
            labelSize={labelSize}
            tabMinWidth={tabMinWidth}
          />
          <TabItem
            active={active==='equipment'}
            icon="hardware-chip"
            label="Equipment"
            onPress={()=>go('equipment')}
            iconSize={iconSize}
            labelSize={labelSize}
            tabMinWidth={tabMinWidth}
          />

          {/* CENTER GHOST SLOT keeps symmetry (only when FAB visible) */}
          {showFab && <View style={{ width: fabSize + scale(16) }} />}

          {/* RIGHT SIDE */}
          <TabItem
            active={active==='khatabook'}
            icon="wallet"
            label="Khatabook"
            onPress={()=>go('khatabook')}
            iconSize={iconSize}
            labelSize={labelSize}
            tabMinWidth={tabMinWidth}
          />
          <TabItem
            active={active==='profile'}
            icon="person"
            label="Profile"
            onPress={()=>go('profile')}
            iconSize={iconSize}
            labelSize={labelSize}
            tabMinWidth={tabMinWidth}
          />

          {/* FULL-WIDTH ABSOLUTE WRAPPER: perfectly centers FAB on any width */}
          {showFab && (
          <View pointerEvents="box-none" style={styles.fabWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onFabPress || (()=>go('request'))}
              style={styles.fab}
            >
              <Icon name="add" size={fabIconSize} color="#fff" />
            </TouchableOpacity>
          </View>
          )}

        </View>
      </View>
    </View>
  );
}

function TabItem({ icon, label, active, onPress, badge=0, iconSize, labelSize, tabMinWidth }) {
  return (
    <TouchableOpacity
      style={[st.tab, { minWidth: tabMinWidth }]}
      activeOpacity={0.9}
      onPress={onPress}
    >
      <View style={st.icWrap}>
        <Icon
          name={active ? icon : `${icon}-outline`}
          size={iconSize}
          color={active ? C.primary : C.muted}
        />
        {badge > 0 && (
          <View style={st.badge}>
            <Text style={st.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text
        style={[
          st.lbl,
          { fontSize: labelSize },
          active && { color: C.primary, fontWeight: '900' }
        ]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const createStyles = ({
  barHeight,
  barRadius,
  fabSize,
  fabRadius,
  fabRaise,
  horizontalPadding,
  maxWidth
}) => StyleSheet.create({
  wrap: {
    paddingHorizontal: horizontalPadding,
    width: '100%',
    alignItems: 'center',
  },

  bar: {
    position: 'relative',
    backgroundColor: '#FFFFFFEE',
    borderColor: '#EAECEF',
    borderWidth: 1,
    height: barHeight,
    borderRadius: barRadius,
    paddingHorizontal: horizontalPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    maxWidth: maxWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 16 }
    }),
  },

  fabWrap: {
    position: 'absolute',
    top: -fabRaise,
    left: 0,
    right: 0,
    alignItems: 'center',
  },

  fab: {
    width: fabSize,
    height: fabSize,
    borderRadius: fabRadius,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: { shadowColor: '#EF3A3A', shadowOpacity: 0.25, shadowRadius: 14, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 18 }
    }),
  },
});

const st = StyleSheet.create({
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center'
  },

  icWrap: {
    width: scale(28),
    height: scale(28),
    alignItems: 'center',
    justifyContent: 'center'
  },

  lbl: {
    color: C.ink,
    marginTop: scale(3),
    fontWeight: '700'
  },

  badge: {
    position: 'absolute',
    right: scale(-6),
    top: scale(-6),
    minWidth: scale(16),
    height: scale(16),
    borderRadius: scale(8),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: scale(3),
    borderWidth: 2,
    borderColor: '#fff'
  },
  badgeTxt: {
    color: '#fff',
    fontSize: moderateScale(9),
    fontWeight: '900'
  },
});
