// screens/Notifications.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, SectionList, TouchableOpacity, Animated,
  RefreshControl, useWindowDimensions, ScrollView
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

/* ---------- THEME ---------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280', bg:'#F5F7FA',
  card:'#FFFFFF', border:'#E5E7EB'
};
const R = 18;

/* ---------- DEMO DATA ---------- */
const now = new Date();
const iso = (d)=> new Date(d).toISOString();

const DEMO = [
  { id:'n1', type:'restaurant_approved', title:'Restaurant approved', body:'Spice Hub is now KNI-verified.', ts: iso(now), unread:true },
  { id:'n2', type:'ticket_onwork', title:'Work started', body:'Pro assigned for #KNI-2418. ETA 4–6 PM.', ts: iso(now), unread:true, meta:{ticketId:'KNI-2418'} },
  { id:'n3', type:'engineer_assigned', title:'Engineer assigned', body:'Rahul S. will visit Café Verde.', ts: iso(now-60*60*1000), unread:false },
  { id:'n4', type:'ticket_seen', title:'Ticket seen', body:'We’re reviewing your request #KNI-2417.', ts: iso(now-2*60*60*1000), unread:false },
  { id:'n5', type:'restaurant_rejected', title:'Restaurant rejected', body:'Relish Rooftop — missing FSSAI PDF.', ts: iso(now-24*60*60*1000), unread:true },
  { id:'n6', type:'eq_request_approved', title:'Equipment request approved', body:'Deep Freezer service scheduled.', ts: iso(now-2*24*60*60*1000), unread:false },
  { id:'n7', type:'feature', title:'New feature', body:'Inventory timeline & spend is live.', ts: iso(now-3*24*60*60*1000), unread:false },
  { id:'n8', type:'update', title:'App update available', body:'Get v2.5 for faster tickets.', ts: iso(now-10*24*60*60*1000), unread:false },
];

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

/* ---------- SKELETON (reliable while loading) ---------- */
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

  const [items, setItems] = useState(DEMO);
  const [filter, setFilter] = useState('all'); // all | tickets | restaurants | product
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // skeleton pulse
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(()=>{
    // Start pulse loop
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:800,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:800,useNativeDriver:false}),
    ]));
    loop.start();

    // Initial fake load
    const t = setTimeout(()=>setLoading(false), 700);

    return ()=>{ clearTimeout(t); loop.stop(); };
  },[pulse]);

  const filtered = useMemo(()=>{
    if(filter === 'all') return items;
    if(filter === 'tickets') return items.filter(x => x.type.startsWith('ticket') || x.type==='engineer_assigned' || x.type==='eq_request_approved');
    if(filter === 'restaurants') return items.filter(x => x.type.startsWith('restaurant'));
    if(filter === 'product') return items.filter(x => ['feature','update'].includes(x.type));
    return items;
  },[items, filter]);

  const sections = useMemo(()=> loading ? [] : groupSections(filtered), [filtered, loading]);

  const onRefresh = ()=>{
    setRefreshing(true);
    setLoading(true);             // ensure skeleton shows during refresh
    const t = setTimeout(()=>{
      setRefreshing(false);
      setLoading(false);
    }, 900);
  };

  const markAllRead = ()=> setItems(prev=> prev.map(n=>({...n, unread:false})));

  const openItem = (n)=>{
    if(n.type.startsWith('ticket')) navigation.navigate?.('TicketDetail', { id:n.meta?.ticketId });
    else if(n.type.startsWith('restaurant')) navigation.navigate?.('Restaurants');
    else if(n.type==='eq_request_approved') navigation.navigate?.('YourCart');
    else if(n.type==='feature') navigation.navigate?.('HotelProfile');
    else if(n.type==='update') navigation.navigate?.('SupportList');
    setItems(prev => prev.map(x => x.id===n.id ? {...x, unread:false} : x));
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
        <TouchableOpacity onPress={markAllRead} style={st.hBtn}>
          <Icon name="checkmark-done-outline" size={18} color={C.ink}/>
        </TouchableOpacity>
      </View>

      {/* Horizontal filter chips */}
      <View style={{paddingHorizontal:0}}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{paddingHorizontal:16, paddingBottom:4, gap:8}}
        >
          {chip('all','All','albums-outline')}
          {chip('tickets','Tickets','construct-outline')}
          {chip('restaurants','Restaurants','storefront-outline')}
          {chip('product','Product','sparkles-outline')}
        </ScrollView>
      </View>

      {/* While loading: show reliable skeleton view */}
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
          keyExtractor={(item)=>item.id}
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
                {/* left accent */}
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

  // skeletons
  skelItem:{ height:84, backgroundColor:'#E9EEF5', borderRadius:R, marginTop:10 },
});
