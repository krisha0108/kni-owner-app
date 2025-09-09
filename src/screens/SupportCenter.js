
// screens/SupportCenter.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Dimensions,
  RefreshControl, Animated, Modal, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import NewTicketModal from '../components/NewTicketModal'; // <-- separate file
import { api, IMAGE_BASE_URL } from '../api/client';

/* ---------------- theme ---------------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B',
  info:'#3B82F6', indigo:'#6366F1', danger:'#EF4444'
};
const R = 20;
const { width:W } = Dimensions.get('window');

/* ---------------- api shapes ---------------- */
// UI ticket model we'll use locally
// { id, title, category, equipment, created, status, updates }

const STATUS_META = {
  pending:   { label:'Pending',   bg:'#FFF7ED', fg:C.warn, step:1 },
  seen:      { label:'Seen',      bg:'#EFF6FF', fg:C.info, step:2 },
  onwork:    { label:'On work',   bg:'#EEF2FF', fg:C.indigo, step:3 },
  rejected:  { label:'Rejected',  bg:'#FEF2F2', fg:C.danger, step:1 },
  completed: { label:'Completed', bg:'#ECFDF5', fg:C.ok, step:4 },
};

const fmt = (d)=> new Date(d).toLocaleString('en-IN',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

export default function SupportCenter({ navigation }) {
  const insets = useSafeAreaInsets();

  const [tickets, setTickets] = useState([]);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [callOpen, setCallOpen] = useState(false);
  const [newOpen, setNewOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const pulse = useRef(new Animated.Value(0.5)).current;

  const loadTickets = async ()=>{
    try{
      const res = await api.get('/support/tickets');
      const rows = res?.data?.data || [];
      const mapped = rows.map((r)=>({
        id: r.id,
        title: r.title || r.equipment_name || 'Support ticket',
        category: 'Equipment',
        equipment: r.equipment_name || '—',
        created: r.created_at,
        status: r.status,
        updates: (r.threads_count ?? r.threads?.length ?? 0)
      }));
      setTickets(mapped);
    }catch(e){
      console.log('Failed to load tickets', e?.response?.data || e?.message);
    }finally{
      setLoading(false);
    }
  };

  useEffect(()=> {
    loadTickets();
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:800,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:800,useNativeDriver:false}),
    ]));
    loop.start();
    return ()=>{ loop.stop(); };
  }, []);

  // Refresh when screen gains focus (ensures seen/onwork statuses reflect)
  useFocusEffect(React.useCallback(() => {
    loadTickets();
    return undefined;
  }, []));

  const onRefresh = async ()=> { setRefreshing(true); await loadTickets(); setRefreshing(false); };

  const filtered = useMemo(()=>{
    const q = query.trim().toLowerCase();
    return tickets.filter(t=>{
      const okStatus = filter==='all' ? true : t.status===filter;
      const okQ = !q 
        || (t.title?.toString().toLowerCase().includes(q))
        || (String(t.id).toLowerCase().includes(q))
        || (t.category?.toString().toLowerCase().includes(q));
      return okStatus && okQ;
    });
  },[tickets, query, filter]);

  const counts = useMemo(()=>{
    const all = tickets.length;
    const bucket = Object.keys(STATUS_META).reduce((a,k)=> (a[k]=tickets.filter(t=>t.status===k).length, a),{});
    return { all, ...bucket };
  },[tickets]);

  const callNow = async ()=>{ setCallOpen(false); try{ await Linking.openURL('tel:8347122756'); }catch{} };

  const addTicket = async (payload)=>{
    try{
      const form = new FormData();
      form.append('title', payload.title || 'Support ticket');
      form.append('equipment_name', payload.equipment || payload.title || 'Equipment');
      form.append('description', payload.desc);
      form.append('category', payload.category || 'Equipment');
      // backend expects single photo for ticket create; take first if provided
      const first = payload.photos?.[0];
      if (first?.uri) {
        const name = first.fileName || `photo_${Date.now()}.jpg`;
        form.append('photo', { uri: first.uri, type: 'image/jpeg', name });
      }
      await api.post('/support/tickets', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewOpen(false);
      setToast({ type:'success', text:`Ticket created` });
      await loadTickets();
      setTimeout(()=>setToast(null), 1500);
    }catch(e){
      console.log('Create ticket failed', e?.response?.data || e?.message);
      setToast({ type:'error', text:'Failed to create ticket' });
      setTimeout(()=>setToast(null), 2000);
    }
  };

  const goDetail = (t) => navigation.navigate('SupportTicketDetail', { ticketId: t.id });

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* Header */}
      <View style={[st.header, { paddingTop: 6 }]}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={st.hBtn}>
            <Icon name="chevron-back" size={20} color={C.ink}/>
          </TouchableOpacity>
          <Text style={st.hTitle}>Support</Text>
        </View>
        <View style={{flexDirection:'row', gap:8}}>
          <TouchableOpacity onPress={()=>setCallOpen(true)} style={st.hBtn}><Icon name="call-outline" size={18} color={C.ink}/></TouchableOpacity>
          <TouchableOpacity onPress={()=>setNewOpen(true)} style={st.hBtn}><Icon name="add" size={20} color={C.ink}/></TouchableOpacity>
        </View>
      </View>

      {/* Search + Filters */}
      <View style={{paddingHorizontal:16}}>
        <View style={st.searchWrap}>
          <Icon name="search" size={16} color="#7C8799" style={{marginLeft:10}}/>
          <TextInput
            placeholder="Search ticket id, title, category…"
            placeholderTextColor="#9CA3AF"
            value={query}
            onChangeText={setQuery}
            style={st.searchInput}
          />
          {query?.length>0 && (
            <TouchableOpacity onPress={()=>setQuery('')} style={{padding:6, marginRight:4}}>
              <Icon name="close-circle" size={18} color="#9CA3AF"/>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingVertical:6}}>
          {[
            { key:'all',       icon:'layers-outline', color:C.ink },
            { key:'pending',   icon:'time-outline',   color:STATUS_META.pending.fg },
            { key:'seen',      icon:'eye-outline',    color:STATUS_META.seen.fg },
            { key:'onwork',    icon:'construct-outline', color:STATUS_META.onwork.fg },
            { key:'rejected',  icon:'close-circle',   color:STATUS_META.rejected.fg },
            { key:'completed', icon:'checkmark-circle', color:STATUS_META.completed.fg },
          ].map(x=>{
            const on = filter===x.key;
            const count = counts[x.key] ?? counts.all;
            return (
              <TouchableOpacity key={x.key} onPress={()=>setFilter(x.key)}
                style={[st.chip, on && { borderColor:x.color, backgroundColor:'#fff' }]}>
                <Icon name={x.icon} size={14} color={on?x.color:'#64748B'}/>
                <Text style={[st.chipTxt, on?{color:x.color}:{color:'#334155'}]}>
                  {x.key==='all'?'All':STATUS_META[x.key].label}
                </Text>
                <View style={[st.countPill, on?{backgroundColor:x.color}:{backgroundColor:'#E5E7EB'}]}>
                  <Text style={[st.countTxt, on?{color:'#fff'}:{color:'#334155'}]}>{count}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* List */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingHorizontal:16, paddingBottom: insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          Array.from({length:4}).map((_,i)=>(<Animated.View key={i} style={[st.skelCard,{opacity:pulse}]}/>))
        ) : filtered.length===0 ? (
          <View style={st.empty}>
            <Icon name="chatbox-ellipses-outline" size={32} color="#94A3B8"/>
            <Text style={st.emptyTitle}>No tickets</Text>
            <Text style={st.emptySub}>Create your first support ticket.</Text>
            <PrimaryCTA icon="add-circle" text="New ticket" onPress={()=>setNewOpen(true)} />
          </View>
        ) : (
          filtered.map(t=> (
            <TicketCard
              key={t.id}
              t={t}
              onPress={()=> goDetail(t)}            // tap whole card
              onViewPress={()=> goDetail(t)}       // tap "View" chevron row
            />
          ))
        )}
      </ScrollView>

      {/* Call modal */}
      <ConfirmModal
        visible={callOpen}
        title="Call Support"
        subtitle="+91 83471 22756"
        icon="call"
        primaryText="Call now"
        onClose={()=>setCallOpen(false)}
        onPrimary={callNow}
      />

      {/* New ticket modal */}
      <NewTicketModal
        visible={newOpen}
        onClose={()=>setNewOpen(false)}
        onSubmit={addTicket}
        theme={{C, R, W}}
      />

      {/* toast */}
      {toast && (
        <View style={st.toast}>
          <Icon name={toast.type==='success'?'checkmark-circle':'information-circle'} size={16} color="#fff"/>
          <Text style={st.toastTxt}>{toast.text}</Text>
        </View>
      )}
    </SafeAreaView>
  );
}

/* ------------ small presentational pieces that use no hooks ------------ */
function TicketCard({ t, onPress, onViewPress }) {
  const M = STATUS_META[t.status] || STATUS_META.pending;
  const steps = ['pending','seen','onwork','completed'];
  const progress = Math.min(4, M.step);

  return (
    <TouchableOpacity activeOpacity={0.9} style={st.card} onPress={onPress}>
      <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
        <View style={{flex:1, paddingRight:12}}>
          <Text style={st.tTitle} numberOfLines={2}>{t.title}</Text>
          <Text style={st.tMeta} numberOfLines={1}>
            #{t.id} • {fmt(t.created)} • {t.category}{t.equipment && ` • ${t.equipment}`} • {t.updates} updates
          </Text>
        </View>
        <View style={[st.badge,{backgroundColor:M.bg}]}>
          <Text style={[st.badgeTxt,{color:M.fg}]}>{M.label}</Text>
        </View>
      </View>

      <View style={st.progress}>
        {steps.map((_,i)=>(<View key={i} style={[st.pDot, i<progress ? {backgroundColor:M.fg} : null]}/>))}
      </View>

      <View style={{flexDirection:'row', alignItems:'center', justifyContent:'space-between'}}>
        <View style={st.metaChipRow}>
          <View style={st.metaChip}><Icon name="construct-outline" size={12} color={C.ink}/><Text style={st.metaTxt}>{t.equipment || '—'}</Text></View>
        </View>

        {/* Make only the "View" row tappable too */}
        <TouchableOpacity onPress={onViewPress} style={{flexDirection:'row', alignItems:'center'}} hitSlop={{top:8,bottom:8,left:8,right:8}}>
          <Text style={st.linkTxt}>View</Text>
          <Icon name="chevron-forward" size={16} color={C.primary}/>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ConfirmModal({ visible, onClose, onPrimary, title, subtitle, icon='call', primaryText='Continue' }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={st.overlay}>
        <View style={st.sheet}>
          <View style={st.sheetIcon}><Icon name={icon} size={18} color="#fff"/></View>
          <Text style={st.sheetTitle}>{title}</Text>
          {!!subtitle && <Text style={st.sheetSub}>{subtitle}</Text>}
          <View style={{flexDirection:'row', gap:10, marginTop:12}}>
            <TouchableOpacity style={st.outBtn} onPress={onClose}><Text style={st.outTxt}>Cancel</Text></TouchableOpacity>
            <PrimaryCTA text={primaryText} onPress={onPrimary} icon="call" />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function PrimaryCTA({ icon, text, onPress, disabled, style }) {
  return (
    <TouchableOpacity disabled={disabled} onPress={onPress}
      style={[st.primaryBtnWide, disabled && {opacity:0.5}, style]}
      activeOpacity={0.85}>
      {icon && <Icon name={icon} size={14} color="#fff" style={st.primaryIcon}/>}
      <Text style={st.primaryTxtCenter}>{text}</Text>
    </TouchableOpacity>
  );
}

/* ---------------- styles ---------------- */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:8 },
  headerLeft:{ flexDirection:'row', alignItems:'center', gap:10 },
  hBtn:{ width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  hTitle:{ color:'#1D2254', fontWeight:'900', fontSize:24 },

  searchWrap:{ flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:999, borderWidth:1, borderColor:'#EEF2F7', marginTop:8, height:42, shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  searchInput:{ flex:1, color:'#1D2254', paddingHorizontal:10 },

  chip:{ paddingHorizontal:12, paddingVertical:8, borderRadius:999, marginRight:8, borderWidth:1, borderColor:'#EEF2F7', flexDirection:'row', alignItems:'center', gap:6 },
  chipTxt:{ fontWeight:'800' },
  countPill:{ marginLeft:6, paddingHorizontal:8, paddingVertical:2, borderRadius:999 },
  countTxt:{ fontSize:12, fontWeight:'800' },

  card:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:12, marginTop:12 },
  tTitle:{ color:'#0F172A', fontWeight:'900', fontSize:16 },
  tMeta:{ color:'#6B7280', marginTop:4 },
  badge:{ paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  badgeTxt:{ fontWeight:'800', fontSize:12 },

  progress:{ flexDirection:'row', gap:4, marginVertical:10 },
  pDot:{ width:22, height:6, borderRadius:999, backgroundColor:'#E5E7EB' },

  metaChipRow:{ flexDirection:'row', alignItems:'center', gap:10 },
  metaChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  metaTxt:{ color:'#1D2254', fontWeight:'800', fontSize:12 },
  linkTxt:{ color:C.primary, fontWeight:'900' },

  empty:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#EEF2F7', borderRadius:R, padding:16, alignItems:'center', marginTop:16, gap:6 },
  emptyTitle:{ color:'#1D2254', fontWeight:'900', fontSize:16 },
  emptySub:{ color:'#6B7280' },

  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal:16 },
  sheet:{ width: W*0.86, backgroundColor:'#fff', borderRadius:R, padding:16, borderWidth:1, borderColor:'#EEF2F7', alignItems:'center' },
  sheetIcon:{ width:44, height:44, borderRadius:12, backgroundColor:C.primary, alignItems:'center', justifyContent:'center', marginBottom:8 },
  sheetTitle:{ color:'#1D2254', fontWeight:'900', fontSize:18 },
  sheetSub:{ color:'#6B7280', marginTop:2 },

  outBtn:{ borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, paddingHorizontal:14, paddingVertical:10, backgroundColor:'#fff' },
  outTxt:{ color:'#1D2254', fontWeight:'900' },
 primaryBtnWide: {
    backgroundColor: C.primary,
    borderRadius: 14,
    paddingVertical:10,
    flexDirection: 'row',        // icon + text side by side
    justifyContent: 'center',    // center them as a group
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  primaryIcon: {
    marginRight: 4   ,              // space between icon and text
  },
  primaryTxtCenter: {
    color: '#fff',
    fontWeight: '900',
  },
  // primaryBtnWide:{ backgroundColor:C.primary, borderRadius:14, height:48, justifyContent:'center', alignItems:'start', position:'relative' },
  // primaryIcon:{ position:'absolute', left:16 },
  // primaryTxtCenter:{ color:'#fff', fontWeight:'900' },

  toast:{ position:'absolute', left:16, right:16, bottom:24, backgroundColor:'rgba(17,24,39,0.9)', borderRadius:12, padding:12, flexDirection:'row', alignItems:'center', gap:8 },
  toastTxt:{ color:'#fff', fontWeight:'800' },

  skelCard:{ height:94, backgroundColor:'#E9EEF5', borderRadius:R, marginTop:12 },
});
