// screens/Notifications.js
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Animated,
  RefreshControl, useWindowDimensions, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import notificationService from '../services/notificationService';

/* ---------- THEME ---------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280', bg:'#F5F7FA',
  card:'#FFFFFF', border:'#E5E7EB'
};
const R = 18;

/* ---------- TYPE → UI MAP ---------- */
const TMAP = {
  ticket_seen:            { ic:'eye',               bg:'#E0F2FE', fg:'#0369A1' },
  ticket_onwork:          { ic:'construct',         bg:'#EEF2FF', fg:'#4F46E5' },
  restaurant_approved:    { ic:'checkmark-circle',  bg:'#ECFDF5', fg:'#10B981' },
  restaurant_rejected:    { ic:'close-circle',      bg:'#FEF2F2', fg:'#EF4444' },
  eq_request_approved:    { ic:'cube-outline',      bg:'#F0FDFA', fg:'#14B8A6' },
  engineer_assigned:      { ic:'people-outline',    bg:'#FFF7ED', fg:'#F59E0B' },
  feature:                { ic:'sparkles-outline',  bg:'#F5F3FF', fg:'#7C3AED' },
  update:                 { ic:'download-outline',  bg:'#EFF6FF', fg:'#3B82F6' },
  // Order tracking notification types
  order_accepted:         { ic:'checkmark-circle',  bg:'#ECFDF5', fg:'#10B981' },
  order_in_progress:      { ic:'construct',         bg:'#EEF2FF', fg:'#4F46E5' },
  order_completed:        { ic:'checkmark-done',    bg:'#ECFDF5', fg:'#10B981' },
  order_update:           { ic:'cube-outline',      bg:'#F0FDFA', fg:'#14B8A6' },
  // Order approval notification types
  completion_approval_required: { ic:'alert-circle', bg:'#FEF3C7', fg:'#D97706' },
  pending_approval:       { ic:'hourglass-outline', bg:'#FEF3C7', fg:'#D97706' },
  approval_required:      { ic:'alert-circle',      bg:'#FEF3C7', fg:'#D97706' },
  work_completed:         { ic:'checkmark-done',    bg:'#FEF3C7', fg:'#D97706' },
};

/* ---------- UTILS ---------- */
const relDay = (isoStr)=>{
  const d = new Date(isoStr); const t = new Date();
  const diff = Math.floor((t - d)/(24*60*60*1000));
  if(diff === 0) return 'Today';
  if(diff === 1) return 'Yesterday';
  if(diff <= 7) return 'This week';
  return 'Earlier';
};
const groupSections = (arr)=>{
  const map = {};
  arr.forEach(n => {
    const k = relDay(n.ts);
    if(!map[k]) map[k] = [];
    map[k].push(n);
  });
  return Object.keys(map).map(k => ({
    title:k,
    data: map[k].sort((a,b)=> new Date(b.ts) - new Date(a.ts))
  })).sort((a,b)=>{
    const ord = ['Today','Yesterday','This week','Earlier'];
    return ord.indexOf(a.title) - ord.indexOf(b.title);
  });
};

/* ---------- SKELETON (loading view) ---------- */
function SkeletonList({ pulse }) {
  return (
    <View style={{paddingHorizontal:16}}>
      {Array.from({length:6}).map((_,i)=>(
        <Animated.View key={i} style={[st.skelItem,{opacity:pulse}]}/>
      ))}
    </View>
  );
}

/* =================================================================== */
export default function Notifications({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all'); // all | tickets | restaurants | product
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ownerId, setOwnerId] = useState(null);
  const [token, setToken] = useState(null);

  // skeleton pulse
  const pulse = useRef(new Animated.Value(0.5)).current;

  /* ---------- API CALL ---------- */
  const fetchNotifications = useCallback(async (userOwnerId = null, userToken = null) => {
    try {
      setLoading(true);
      
      const currentOwnerId = userOwnerId || ownerId;
      const currentToken = userToken || token;
      
      console.log('Fetching notifications for owner:', currentOwnerId);
      console.log('Using token:', currentToken ? 'Token exists' : 'No token');
      
      if (!currentOwnerId || !currentToken) {
        console.log('Missing ownerId or token - cannot fetch notifications');
        setLoading(false);
        return;
      }
      
const res = await api.get('/owner/notifications', {
  headers: {
    Authorization: `Bearer ${currentToken}`,
  }
});
      
      console.log('Response status:', res.status);
      console.log('Response data:', res.data);
      
      const json = res.data;
      console.log('Raw API response:', json);
      console.log('Response type:', typeof json);

      // Handle response format: { ok: true, data: [...] }
      const notificationsArray = json?.data || (Array.isArray(json) ? json : []);
      console.log('Notifications array:', notificationsArray.length);

      // Transform backend data to match frontend format
      if (notificationsArray && Array.isArray(notificationsArray) && notificationsArray.length > 0) {
        console.log('Processing array of notifications:', notificationsArray.length);
        const transformedData = notificationsArray.map(notification => {
          console.log('Processing notification:', notification);
          return {
            id: notification.id,
            type: notification.type || 'restaurant_approved',
            title: notification.title,
            body: notification.message,
            ts: notification.createdAt || notification.created_at,
            unread: !notification.isRead && !notification.is_read,
            meta: {
              restaurantId: notification.restaurant_id,
              notificationId: notification.id,
              orderId: notification.equipment_request_id || notification.order_id,
              equipment_request_id: notification.equipment_request_id,
              ticketId: notification.ticket_id
            }
          };
        });
        console.log('Transformed data:', transformedData);
        setItems(transformedData);
      } else {
        console.log('No valid array data received, setting empty array');
        setItems([]);
      }
    } catch (e) {
      console.log("Error fetching notifications:", e.message);
      console.log("Full error:", e);
      setItems([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [ownerId, token]);

  const initializeUserData = useCallback(async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      const authToken = await AsyncStorage.getItem('userToken');

      console.log('AsyncStorage userData:', userData);
      console.log('AsyncStorage authToken:', authToken);

      if (userData && authToken) {
        const user = JSON.parse(userData);
        console.log('Parsed user:', user);
        setOwnerId(user.id);
        setToken(authToken);

        // Now fetch notifications with the user data
        fetchNotifications(user.id, authToken);
      } else {
        console.log('No user data found in AsyncStorage');
        setLoading(false);
      }
    } catch (error) {
      console.log('Error getting user data:', error);
      setLoading(false);
    }
  }, [fetchNotifications]);

  useEffect(()=>{
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:800,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:800,useNativeDriver:false}),
    ]));
    loop.start();

    initializeUserData(); // Get user data first

    return ()=>{ loop.stop(); };
  },[pulse, initializeUserData]);

  const filtered = useMemo(()=>{
    if(filter === 'all') return items;
    if(filter === 'tickets') return items.filter(x => x.type.startsWith('ticket'));
    if(filter === 'orders') return items.filter(x =>
      x.type.startsWith('order_') ||
      x.type==='engineer_assigned' ||
      x.type==='eq_request_approved' ||
      x.type==='completion_approval_required' ||
      x.type==='pending_approval' ||
      x.type==='approval_required' ||
      x.type==='work_completed'
    );
    if(filter === 'restaurants') return items.filter(x => x.type.startsWith('restaurant'));
    if(filter === 'product') return items.filter(x => ['feature','update'].includes(x.type));
    return items;
  },[items, filter]);

  const sections = useMemo(()=> loading ? [] : groupSections(filtered), [filtered, loading]);

  const onRefresh = ()=>{
    setRefreshing(true);
    fetchNotifications();
  };
// Mark single notification as read
const markNotificationRead = async (id) => {
  try {
await api.post('/notifications/mark-read', { notification_id: id }, {
  headers: { Authorization: `Bearer ${token}` }
});  } catch (e) {
    console.log('Error marking notification read:', e);
  }
};


// Mark all notifications as read
const markAllReadApi = async () => {
  try {
await api.post('/notifications/mark-all-read', { restaurant_owner_id: ownerId }, {
  headers: { Authorization: `Bearer ${token}` }
});  } catch (e) {
    console.log('Error marking all read:', e);
  }
};

// Send test notification
const [testingSend, setTestingSend] = useState(false);
const [resetting, setResetting] = useState(false);

const resetAndTest = async () => {
  if (!token) {
    console.log('No token available');
    return;
  }
  setResetting(true);
  try {
    console.log('🔄 Resetting tokens before test...');
    await notificationService.resetAndReregister();
    console.log('✅ Tokens reset, now sending test notification...');
    // Wait a moment for token to register
    await new Promise(resolve => setTimeout(resolve, 1000));
    await sendTestNotification();
  } catch (e) {
    console.log('Error in reset and test:', e);
  } finally {
    setResetting(false);
  }
};

const sendTestNotification = async () => {
  if (!token) {
    console.log('No token available for test notification');
    return;
  }
  setTestingSend(true);
  try {
    const res = await api.post('/owner/notifications/test', {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Test notification response:', res.data);
    if (res.data?.ok) {
      // Refresh notifications after a short delay
      setTimeout(() => fetchNotifications(), 2000);
    }
  } catch (e) {
    console.log('Error sending test notification:', e);
  } finally {
    setTestingSend(false);
  }
};

// Approval-related notification types that should go to OrderTracking
const APPROVAL_NOTIFICATION_TYPES = [
  'completion_approval_required',
  'pending_approval',
  'approval_required',
  'work_completed'
];

// use inside openItem
const openItem = (n) => {
  // Order-related notifications -> go directly to OrderTracking
  if (n.type==='eq_request_approved' || n.type==='engineer_assigned' || n.type.startsWith('order_') || APPROVAL_NOTIFICATION_TYPES.includes(n.type)) {
    if (n.meta?.orderId || n.meta?.equipment_request_id) {
      navigation.navigate?.('OrderTracking', { orderId: n.meta?.orderId || n.meta?.equipment_request_id });
    } else {
      navigation.navigate?.('Request');
    }
  }
  // Other notifications (ticket, restaurant, feature, update) -> show detail page
  else {
    navigation.navigate?.('NotificationDetail', { notification: n });
  }

  // update UI + backend
  setItems(prev => prev.map(x => x.id===n.id ? {...x, unread:false} : x));
  markNotificationRead(n.id);
};

// use inside markAllRead
const markAllRead = () => {
  setItems(prev => prev.map(n => ({...n, unread:false})));
  markAllReadApi();
};


  const chip = (key, label, ic)=>{
    const on = filter===key;
    return (
      <TouchableOpacity key={key} onPress={()=>setFilter(key)} style={[st.chip, on && st.chipOn]}>
        {ic && <Icon name={ic} size={14} color={on?C.card:C.muted} />}
        <Text style={[st.chipTxt, on && {color:'#fff'}]}>{label}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={()=>navigation.goBack?.()} style={st.hBtn}>
          <Icon name="chevron-back" size={20} color={C.ink}/>
        </TouchableOpacity>
        <Text style={st.hTitle}>Notifications</Text>
        <View style={{flexDirection:'row', gap:8}}>
          <TouchableOpacity onPress={resetAndTest} style={[st.hBtn, (resetting || testingSend) && {opacity:0.5}]} disabled={resetting || testingSend}>
            <Icon name="refresh-outline" size={18} color={resetting ? C.muted : C.primary}/>
          </TouchableOpacity>
          <TouchableOpacity onPress={sendTestNotification} style={[st.hBtn, testingSend && {opacity:0.5}]} disabled={testingSend}>
            <Icon name="paper-plane-outline" size={18} color={C.primary}/>
          </TouchableOpacity>
          <TouchableOpacity onPress={markAllRead} style={st.hBtn}>
            <Icon name="checkmark-done-outline" size={18} color={C.ink}/>
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter chips */}
      <View style={{paddingHorizontal:0}}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:16, paddingBottom:4, gap:8}}
        >
          {chip('all','All','albums-outline')}
          {chip('orders','Orders','cube-outline')}
          {chip('tickets','Tickets','construct-outline')}
          {chip('restaurants','Restaurants','storefront-outline')}
          {chip('product','Product','sparkles-outline')}
        </ScrollView>
      </View>

      {/* Content */}
      {loading ? (
        <ScrollView
          contentContainerStyle={{paddingBottom: insets.bottom+16}}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>
          }
          showsVerticalScrollIndicator={false}
        >
          <SkeletonList pulse={pulse}/>
        </ScrollView>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item)=>item.id.toString()}
          stickySectionHeadersEnabled={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom+16 }}
          renderSectionHeader={({section:{title}})=>(
            <Text style={st.sectionTitle}>{title}</Text>
          )}
          renderItem={({item})=>{
            const m = TMAP[item.type] || { ic:'notifications-outline', bg:'#F3F4F6', fg:C.ink };
            return (
              <TouchableOpacity activeOpacity={0.95} onPress={()=>openItem(item)} style={st.card}>
                <View style={[st.accent,{backgroundColor:m.fg}]}/>
                <View style={st.iconWrap}>
                  <View style={[st.iconBg,{backgroundColor:m.bg}]}>
                    <Icon name={m.ic} size={18} color={m.fg}/>
                  </View>
                  {item.unread && <View style={st.dot}/>}
                </View>

                <View style={{flex:1}}>
                  <Text style={st.title}>{item.title}</Text>
                  <Text style={st.body} numberOfLines={2}>{item.body}</Text>
                  <View style={st.metaRow}>
                    <Icon name="time-outline" size={12} color={C.muted}/>
                    <Text style={st.metaTxt}>  {new Date(item.ts).toLocaleString()}</Text>
                  </View>
                </View>

                <Icon name="chevron-forward" size={18} color={C.muted}/>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={{alignItems:'center',marginTop:60}}>
              <Icon name="leaf-outline" size={28} color={C.muted}/>
              <Text style={{color:C.muted,marginTop:6}}>Nothing yet. You’re all caught up!</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------- STYLES ---------------- */
const st = StyleSheet.create({
  header:{ paddingHorizontal:16, paddingBottom:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  hBtn:{ width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  hTitle:{ color:C.ink, fontSize:22, fontWeight:'900' },

  chip:{ flexDirection:'row', alignItems:'center', gap:6, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff', paddingHorizontal:12, paddingVertical:8, borderRadius:999 },
  chipOn:{ backgroundColor:C.primary, borderColor:C.primary },
  chipTxt:{ color:C.ink, fontWeight:'800' },

  sectionTitle:{ color:C.muted, fontWeight:'800', marginTop:12, marginBottom:6, paddingHorizontal:16 },

  card:{ marginHorizontal:16, marginBottom:10, backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:12, flexDirection:'row', alignItems:'flex-start', gap:10 },
  accent:{ position:'absolute', left:0, top:0, bottom:0, width:4, borderTopLeftRadius:R, borderBottomLeftRadius:R },
  iconWrap:{ width:36, alignItems:'center' },
  iconBg:{ width:32, height:32, borderRadius:10, alignItems:'center', justifyContent:'center' },
  dot:{ position:'absolute', right:2, top:-2, width:9, height:9, borderRadius:999, backgroundColor:C.primary, borderWidth:2, borderColor:'#fff' },

  title:{ color:C.text, fontWeight:'900' },
  body:{ color:C.text, marginTop:2 },
  metaRow:{ flexDirection:'row', alignItems:'center', marginTop:8 },
  metaTxt:{ color:C.muted, fontSize:12 },

  skelItem:{ height:84, backgroundColor:'#E9EEF5', borderRadius:R, marginTop:10 },
});

