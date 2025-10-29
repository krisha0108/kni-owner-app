// components/KniBottomNav.js
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

/* ---------- THEME ---------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280',
  card:'#FFFFFF', bg:'#F5F7FA', border:'#E5E7EB'
};

/* ---------- SIZING (tweak here if needed) ---------- */
const BAR_HEIGHT   = 74;
const BAR_RADIUS   = 22;
const TAB_MIN_W    = 64;
const PADDING_H    = 18;
const FAB_W        = 62;
const FAB_H        = 62;
const FAB_RADIUS   = 20;
const FAB_RAISE    = 16; // how much FAB floats above the bar

export default function KniBottomNav({
  active = 'home',
  cartCount = 0,
  notifCount = 0,
  onFabPress,
}) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const go = (key) => {
    if (!navigation?.navigate) return;
    if (key==='home') navigation.navigate('Home');
    if (key==='request') navigation.navigate('Request');
    // if (key==='cart') navigation.navigate('RequestNow');
    if (key==='profile') navigation.navigate('Profile');
  };

  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { justifyContent:'flex-end' }]}>
      <View style={[st.wrap, { paddingBottom: Math.max(12, insets.bottom) }]}>
        <View style={st.bar}>

          {/* LEFT */}
          <TabItem
            active={active==='home'}
            icon="home"
            label="Home"
            onPress={()=>go('home')}
          />
          {/* <TabItem
            active={active==='request'}
            icon="construct"
            label="Request"
            onPress={()=>go('request')}
          /> */}

          {/* CENTER GHOST SLOT keeps symmetry */}
          <View style={st.centerSlot} />

          {/* RIGHT */}
          {/* <TabItem
            active={active==='cart'}
            icon="bag-handle"
            label="Cart"
            badge={cartCount}
            onPress={()=>go('cart')}
          /> */}
          <TabItem
            active={active==='profile'}
            icon="person"
            label="Profile"
            // badge={notifCount}
            onPress={()=>go('profile')}
          />

          {/* FULL-WIDTH ABSOLUTE WRAPPER: perfectly centers FAB on any width */}
          <View pointerEvents="box-none" style={st.fabWrap}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={onFabPress || (()=>go('request'))}
              style={st.fab}
            >
              <Icon name="add" size={26} color="#fff" />
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </View>
  );
}

function TabItem({ icon, label, active, onPress, badge=0 }) {
  return (
    <TouchableOpacity style={st.tab} activeOpacity={0.9} onPress={onPress}>
      <View style={st.icWrap}>
        <Icon
          name={active ? icon : `${icon}-outline`}
          size={22}
          color={active ? C.primary : C.muted}
        />
        {badge > 0 && (
          <View style={st.badge}>
            <Text style={st.badgeTxt}>{badge > 99 ? '99+' : badge}</Text>
          </View>
        )}
      </View>
      <Text style={[st.lbl, active && { color:C.primary, fontWeight:'900' }]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const st = StyleSheet.create({
  wrap:{ paddingHorizontal:16 },

  bar:{
    position:'relative',
    backgroundColor:'#FFFFFFEE',
    borderColor:'#EAECEF',
    borderWidth:1,
    height: BAR_HEIGHT,
    borderRadius: BAR_RADIUS,
    paddingHorizontal: PADDING_H,
    flexDirection:'row',
    alignItems:'center',
    justifyContent:'space-between',
    // keep centered on big screens without stretching too far
    maxWidth: 720,
    alignSelf: 'center',
    ...Platform.select({
      ios:{ shadowColor:'#000', shadowOpacity:0.08, shadowRadius:18, shadowOffset:{width:0,height:8} },
      android:{ elevation:16 }
    }),
  },

  tab:{
    flex:1,
    minWidth: TAB_MIN_W,
    alignItems:'center',
    justifyContent:'center'
  },

  centerSlot:{ flex:1, minWidth: TAB_MIN_W },

  icWrap:{ width:30, height:30, alignItems:'center', justifyContent:'center' },
  lbl:{ fontSize:11, color:C.ink, marginTop:4, fontWeight:'800' },

  /* ---- PERFECT CENTERING ---- */
  fabWrap:{
    position:'absolute',
    top: -FAB_RAISE,
    left: 0,
    right: 0,
    alignItems:'center', // <- centers the FAB to the bar width
  },

  fab:{
    width: FAB_W, height: FAB_H, borderRadius: FAB_RADIUS,
    backgroundColor:C.primary,
    alignItems:'center', justifyContent:'center',
    ...Platform.select({
      ios:{ shadowColor:'#EF3A3A', shadowOpacity:0.25, shadowRadius:14, shadowOffset:{width:0,height:8} },
      android:{ elevation:18 }
    }),
  },

  badge:{
    position:'absolute', right:-6, top:-6,
    minWidth:16, height:16, borderRadius:8,
    backgroundColor:C.primary, alignItems:'center', justifyContent:'center',
    paddingHorizontal:3, borderWidth:2, borderColor:'#fff'
  },
  badgeTxt:{ color:'#fff', fontSize:9, fontWeight:'900' },
});
