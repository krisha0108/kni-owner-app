// navigation/MainTabBar.js — thin adapter between MainTabs' own tracked tab
// state (activeRouteName, updated via Tab.Navigator's screenListeners) and
// KniBottomNav's existing props. This is what makes "swipe updates the
// active icon" work for free: activeRouteName changes on swipe exactly
// like it does on tap, no extra sync code needed. KniBottomNav itself is
// unchanged visually - rendered as a plain sibling of the Tab.Navigator
// (see MainTabs.js for why), it floats over the swiping pager exactly as
// it already floats over every other screen in the app.
//
// Android hardware back already returns to the Home tab correctly on its
// own (verified live: fresh app -> swipe to a non-Home tab -> back ->
// lands on Home) - no custom BackHandler needed here.
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';

const ROUTE_TO_ACTIVE = {
  HomeTab: 'home',
  EquipmentTab: 'equipment',
  KhatabookTab: 'khatabook',
  ProfileTab: 'profile',
};

export default function MainTabBar({ activeRouteName }) {
  // MainTabBar is a plain sibling of <Tab.Navigator>, not one of its own
  // screens, so useNavigation() here resolves to the *outer* Stack's
  // navigation object (the "Home" Stack.Screen's own context, which wraps
  // this whole subtree) - exactly what go()'s nested
  // navigate('Home', { screen: 'XTab' }) calls need to bubble correctly.
  const navigation = useNavigation();
  const active = ROUTE_TO_ACTIVE[activeRouteName] || 'home';
  return <KniBottomNav navigation={navigation} active={active} />;
}
