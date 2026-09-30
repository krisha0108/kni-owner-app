// navigation/MainTabs.js — the 4 main pages (Home, Equipment, Khatabook,
// Profile) as a real swipeable tab container instead of separate stack
// screens, so users can swipe between them WhatsApp-style in addition to
// tapping the bottom nav. Mounted as the single "Home" Stack.Screen in
// AppNavigator.js, so every existing navigation.navigate('Home') call
// elsewhere in the app keeps working unchanged.
import React, { useState } from 'react';
import { View } from 'react-native';
import { createMaterialTopTabNavigator } from '@react-navigation/material-top-tabs';

import HomeScreen from '../screens/HomeScreen';
import MyEquipmentScreen from '../screens/MyEquipmentScreen';
import KhatabookScreen from '../screens/KhatabookScreen';
import ProfileScreen from '../screens/ProfileScreen';
import MainTabBar from './MainTabBar';

const Tab = createMaterialTopTabNavigator();

export default function MainTabs() {
  // KniBottomNav positions itself with `position: 'absolute'` (the same
  // proven pattern already used as the last sibling in ~46 other screens
  // across the app) - so it's rendered as a plain sibling of Tab.Navigator
  // inside a flex:1 wrapper here, not through material-top-tabs' `tabBar`
  // slot. That slot sizes itself to its child's *layout* size, and an
  // absolutely-positioned child measures as 0-height there, collapsing the
  // whole bar invisible - rendering it as a normal sibling avoids that
  // entirely and gives it the full-screen positioned ancestor it expects.
  const [activeRouteName, setActiveRouteName] = useState('HomeTab');

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        initialRouteName="HomeTab"
        tabBar={() => null}
        screenOptions={{ swipeEnabled: true, lazy: false, animationEnabled: true }}
        screenListeners={{
          state: (e) => {
            const navState = e.data.state;
            setActiveRouteName(navState.routeNames[navState.index]);
          },
        }}
      >
        <Tab.Screen name="HomeTab" component={HomeScreen} />
        <Tab.Screen name="EquipmentTab" component={MyEquipmentScreen} />
        <Tab.Screen name="KhatabookTab" component={KhatabookScreen} />
        <Tab.Screen name="ProfileTab" component={ProfileScreen} />
      </Tab.Navigator>
      <MainTabBar activeRouteName={activeRouteName} />
    </View>
  );
}
