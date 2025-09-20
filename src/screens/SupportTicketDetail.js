
// screens/SupportTicketDetail.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, TextInput,
  RefreshControl, Animated, Modal, Dimensions, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { launchImageLibrary } from 'react-native-image-picker';
import { api ,IMAGE_BASE_URL} from '../api/client';
// turn any API path or localhost URL into a device-reachable URL
const toStorageUrl = (u) => {
  if (!u) return '';
  const s = String(u).trim();
  if (!s) return '';

  // already absolute AND not localhost -> keep
  if (/^https?:\/\//i.test(s) && !/https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(s)) {
    return s;
  }

  // extract the tail under /storage
  const m = s.match(/\/storage\/(.+)$/);
  const tail = m ? m[1] : s.replace(/^\/?storage\/?/, '');

  // IMAGE_BASE_URL = 'http://192.168.29.223:8000/storage'
  // ensure there is exactly one / between base and tail
  const base = IMAGE_BASE_URL.replace(/\/$/, '');       // .../storage
  const cleanTail = tail.replace(/^\/+/, '');           // support_threads/abc.jpg

  return `${base}/${cleanTail}`;
};

const C = { primary:'#EF3A3A', ink:'#0F172A', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#111827', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B',
  info:'#3B82F6', indigo:'#6366F1', danger:'#EF4444'
};
const R = 20;
const { width:W, height:H } = Dimensions.get('window');
const STATUS = {
  pending:   { label:'Pending',   bg:'#FFF7ED', fg:C.warn,    step:1, icon:'time-outline' },
  seen:      { label:'Seen',      bg:'#EFF6FF', fg:C.info,    step:2, icon:'eye-outline' },
  onwork:    { label:'On work',   bg:'#EEF2FF', fg:C.indigo,  step:3, icon:'construct-outline' },
  completed: { label:'Completed', bg:'#ECFDF5', fg:C.ok,      step:4, icon:'checkmark-circle' },
  rejected:  { label:'Rejected',  bg:'#FEF2F2', fg:C.danger,  step:4, icon:'close-circle' },
};
const PIPE = ['pending','seen','onwork','completed']; // rejected branches out
const fmt = (d)=>new Date(d).toLocaleString('en-IN',{ day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' });

/** DEMO fallback */
const DEMO_TICKET = null;
const DEMO_THREAD = [];

export default function SupportTicketDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const ticketId = route?.params?.ticketId;
  const [ticket, setTicket] = useState(DEMO_TICKET);
  const [thread, setThread] = useState(DEMO_THREAD);

  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  // header delete (only when pending)
  const canDelete = ticket?.status === 'pending';
  const [askDelete, setAskDelete] = useState(false);

  // viewer
  const [viewer, setViewer] = useState(null);


  // composer
  const [text, setText] = useState('');
  const [draftPhotos, setDraftPhotos] = useState([]); // {uri}

  // skeleton
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(()=>{
    const t = setTimeout(()=>setLoading(false), 650);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:800,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:800,useNativeDriver:false}),
    ]));
    loop.start(); return ()=>{ clearTimeout(t); loop.stop(); };
  },[]);

  useEffect(()=>{
    if (!ticketId) return;
    loadTicket();
  },[ticketId]);

  const onRefresh = async ()=>{ setRefreshing(true); await loadTicket(); setRefreshing(false); };

  const callSupport = async ()=> { try{ await Linking.openURL('tel:8347122756'); }catch{} };

  const attachmentsTop = useMemo(()=>{
    const imgs = [];
    thread.forEach(m => (m.photos||[]).forEach(p=>imgs.push(p)));
    return imgs.slice(-4).reverse();
  },[thread]);

  /** RULES */
  // Check if admin has sent first message to enable owner chat
  const adminHasSentMessage = thread.some(m => m.author === 'support');
  const canChat = (ticket?.status === 'seen' && adminHasSentMessage) || ticket?.status === 'onwork';
  const closed = ticket?.status==='completed' || ticket?.status==='rejected';

  const canAdvance = (to)=> {
    const from = ticket?.status;
    if (!from) return false;
    if (to==='rejected') return ['pending','seen','onwork'].includes(from);
    const iFrom = PIPE.indexOf(from), iTo = PIPE.indexOf(to);
    return iTo>=0 && iTo<=iFrom+1;
  };

  const updateStatus = ()=>{}; // owner doesn't set explicit status here

  const sendUpdate = async ()=>{
    if (!canChat || (!text.trim() && draftPhotos.length===0)) return;
    try{
      const form = new FormData();
      if (text.trim()) form.append('message', text.trim());
      
      if (draftPhotos[0]?.uri) {
        form.append('photo', { uri: draftPhotos[0].uri, type: 'image/jpeg', name: `photo_${Date.now()}.jpg` });
      }
      await api.post(`/support/tickets/${ticketId}/messages`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setText(''); setDraftPhotos([]);
      await loadTicket();
    }catch(e){
      console.log('Send message failed', e?.response?.data || e?.message);
    }
  };
  const loadTicket = async ()=>{
    try{
      const res = await api.get(`/support/tickets/${ticketId}`);
      const t = res?.data;
      const mapped = {
        id: t.id,
        title: t.equipment_name || 'Support ticket',
        category: 'Equipment',
        equipment: t.equipment_name || '—',
        created: t.created_at,
        status: t.status,
      };
      // const thr = (t.threads || []).map(x=>({
      //   id: x.id,
      //   author: x.sender_owner_id ? 'owner' : 'support',
      //   time: x.created_at,
      //   text: x.message || undefined,
      //   photos: x.photo_path
      //   ? [x.photo_path.startsWith('http')
      //       ? x.photo_path
      //       : x.photo_path.startsWith('/storage/')
      //         ? `${IMAGE_BASE_URL.replace(/\/storage\/$/, '')}${x.photo_path}`
      //         : `${IMAGE_BASE_URL.replace(/\/$/, '')}/${x.photo_path.replace(/^\/+/, '')}`
      //     ]
      //   : [],
      // }));
      const thr = (t.threads || []).map(x => ({
  id: x.id,
  author: x.sender_owner_id ? 'owner' : 'support',
  time: x.created_at,
  text: x.message || undefined,
  photos: x.photo_path ? [toStorageUrl(x.photo_path)] : [],
}));

      setTicket(mapped);
      setThread(thr);
    }catch(e){
      console.log('Load ticket failed', e?.response?.data || e?.message);
    }
  };

  const pickPhotos = async ()=>{
    if (!canChat) return;
    try{
      const res = await launchImageLibrary({ mediaType:'photo', quality:0.85, selectionLimit: Math.max(1, 5-draftPhotos.length) });
      if(res?.assets?.length){
        setDraftPhotos(prev => [...prev, ...res.assets.map(a=>({uri:a.uri}))].slice(0,5));
      }
    }catch{}
  };
  const removeDraft = (uri)=> setDraftPhotos(prev=>prev.filter(p=>p.uri!==uri));

  const M = STATUS[ticket?.status || 'pending'] || STATUS.pending;
  const progress = Math.min(4, M.step);

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* HEADER */}
      <View style={[st.header,{paddingTop:6}]}>
        <View style={st.headerLeft}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={st.hBtn}><Icon name="chevron-back" size={20} color={C.ink}/></TouchableOpacity>
          <Text style={st.hTitle} numberOfLines={1}>Ticket</Text>
        </View>
        <View style={{flexDirection:'row', gap:8}}>
          {canDelete && (
            <TouchableOpacity onPress={()=>setAskDelete(true)} style={[st.hBtn,{backgroundColor:'#FEF2F2',borderColor:'#FCA5A5'}]}>
              <Icon name="trash-outline" size={18} color={C.danger}/>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={callSupport} style={st.hBtn}><Icon name="call-outline" size={18} color={C.ink}/></TouchableOpacity>
        </View>
      </View>

      {/* BODY */}
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{paddingHorizontal:16}}>
            <Animated.View style={[st.skelHero,{opacity:pulse}]}/>
            <Animated.View style={[st.skelLine,{opacity:pulse,width:'70%'}]}/>
            <Animated.View style={[st.skelCard,{opacity:pulse}]}/>
          </View>
        ) : (
          <>
            {/* summary card */}
            <View style={st.card}>
              <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start'}}>
                <View style={{flex:1, paddingRight:12}}>
                  <Text style={st.title}>{ticket?.title || 'Support ticket'}</Text>
                  <Text style={st.sub}>
                    #{ticket?.id} • {fmt(ticket?.created)} • {ticket?.category}{ticket?.equipment ? ` • ${ticket?.equipment}`:''}
                  </Text>
                </View>
                <View style={[st.badge,{backgroundColor:M.bg}]}>
                  <Icon name={M.icon} size={14} color={M.fg}/>
                  <Text style={[st.badgeTxt,{color:M.fg}]}>{M.label}</Text>
                </View>
              </View>


              {/* image strip */}
              {attachmentsTop.length>0 && (
                <View style={{flexDirection:'row', gap:8, marginTop:10}}>
                  {attachmentsTop.map((uri,i)=>(
                    <TouchableOpacity key={uri+i} onPress={()=>setViewer(uri)} style={st.thumb}>
                      <Image source={{uri}} style={{width:'100%',height:'100%'}}/>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* state banners */}
            {!canChat && !closed && (
              <View style={[st.infoBanner,{backgroundColor:'#FFF7ED', borderColor:'#FED7AA'}]}>
                <Icon name="time-outline" size={16} color={C.warn}/>
                <Text style={st.infoText}>
                  {ticket?.status === 'seen' && !adminHasSentMessage 
                    ? 'Chat will open after admin sends first message.'
                    : 'Chat opens when the ticket moves to On work.'
                  }
                </Text>
              </View>
            )}
            {closed && (
              <View style={[st.infoBanner,{backgroundColor:'#ECFDF5', borderColor:'#A7F3D0'}]}>
                <Icon name="checkmark-done-outline" size={16} color={C.ok}/>
                <Text style={st.infoText}>This ticket is closed. You can view history below.</Text>
              </View>
            )}

            {/* conversation */}
            <Text style={st.sectionTitle}>Conversation</Text>
            <View style={{paddingHorizontal:16}}>
              {thread.map(m => <Message key={m.id} m={m} onImage={setViewer} />)}
            </View>
          </>
        )}
      </ScrollView>

      {/* composer – modern pill + floating send */}
      <View style={[st.composerWrap2, { paddingBottom: Math.max(insets.bottom, 10) }]}>
        <View style={[st.composerCard, (!canChat || closed) && {opacity:0.55}]}>
          <TouchableOpacity onPress={pickPhotos} disabled={!canChat || closed} style={st.attachBtn} activeOpacity={0.8}>
            <Icon name="images-outline" size={18} color={C.primary}/>
          </TouchableOpacity>

          <View style={{flex:1, paddingRight:48}}>
            <TextInput
              placeholder={canChat ? "Write an update…" : closed ? "Ticket closed" : 
                ticket?.status === 'seen' && !adminHasSentMessage ? "Wait for admin's first message" : "Locked until work starts"}
              placeholderTextColor="#9CA3AF"
              value={text}
              onChangeText={setText}
              style={st.composerInput}
              editable={canChat && !closed}
              multiline
            />
            {draftPhotos.length>0 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingTop:8}}>
                {draftPhotos.map(p=>(
                  <View key={p.uri} style={st.draftBox}>
                    <Image source={{uri:p.uri}} style={st.draftImg}/>
                    <TouchableOpacity onPress={()=>removeDraft(p.uri)} style={st.draftDel}>
                      <Icon name="close" size={12} color="#fff"/>
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>

          <TouchableOpacity
            onPress={sendUpdate}
            disabled={!canChat || closed || (!text.trim() && draftPhotos.length===0)}
            style={[
              st.fabSend,
              (!canChat || closed || (!text.trim() && draftPhotos.length===0)) && st.fabDisabled
            ]}
            activeOpacity={0.9}
          >
            <Icon name="paper-plane" size={18} color="#fff"/>
          </TouchableOpacity>
        </View>
      </View>

      {/* delete confirm */}
      <Modal visible={askDelete} transparent animationType="fade" onRequestClose={()=>setAskDelete(false)}>
        <View style={st.overlay}>
          <View style={st.sheet}>
            <View style={{flexDirection:'row', alignItems:'center', marginBottom:6}}>
              <View style={[st.sheetIcon,{backgroundColor:C.danger}]}><Icon name="trash" size={16} color="#fff"/></View>
              <Text style={[st.sheetTitle]}>Delete ticket?</Text>
            </View>
            <Text style={st.sheetSub}>Only pending tickets can be deleted. This action cannot be undone.</Text>
            <View style={{flexDirection:'row', gap:10, marginTop:12}}>
              <TouchableOpacity onPress={()=>setAskDelete(false)} style={[st.outBtn,{flex:1}]}><Text style={st.outTxt}>No, keep</Text></TouchableOpacity>
              <TouchableOpacity onPress={()=>{ setAskDelete(false); navigation.goBack(); }} style={[st.primaryBtn,{flex:1, backgroundColor:C.danger}]}>
                <Text style={st.primaryTxt}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* viewer */}
      <Modal visible={!!viewer} transparent animationType="fade" onRequestClose={()=>setViewer(null)}>
        <View style={st.viewer}>
          <TouchableOpacity onPress={()=>setViewer(null)} style={st.viewerClose}><Icon name="close" size={20} color="#fff"/></TouchableOpacity>
          <Image source={{uri:viewer}} style={{width:W*0.92, height:W*1.1, borderRadius:16}} resizeMode="contain"/>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* message bubble */
function Message({ m, onImage }) {
  if (m.author==='system') {
    const meta = STATUS[m.status] || STATUS.pending;
    return (
      <View style={st.sysRow}>
        <View style={[st.sysBadge,{backgroundColor:meta.bg, borderColor:meta.fg+'33'}]}>
          <Icon name={meta.icon} size={12} color={meta.fg}/>
          <Text style={[st.sysTxt,{color:meta.fg}]}>{STATUS[m.status]?.label || 'Updated'}</Text>
        </View>
        {!!m.text && <Text style={st.sysNote}>{m.text}</Text>}
        <Text style={st.sysTime}>{fmt(m.time)}</Text>
      </View>
    );
  }
  const isOwner = m.author==='owner';
  return (
    <View style={[st.msgRow, isOwner ? {justifyContent:'flex-end'} : {justifyContent:'flex-start'}]}>
      {!isOwner && (
        <View style={st.avatarSm}>
          <Image
            source={require('../assets/images/kni-logo.png')}  // adjust path if needed
            style={st.avatarImg}
            resizeMode="cover"
          />
        </View>
      )}
      <View style={[st.bubble, isOwner ? st.bubbleOwner : st.bubbleSupport]}>
        {!!m.text && <Text style={[st.msgText, isOwner && {color:'#fff'}]}>{m.text}</Text>}
        {!!m.photos?.length && (
          <View style={{flexDirection:'row', gap:6, marginTop:6, flexWrap:'wrap'}}>
          {m.photos.map((uri,i)=>{
  console.log("Image uri:", uri);
  return (
    <TouchableOpacity key={uri+i} onPress={()=>onImage(uri)} style={st.msgImgBox}>
      <Image source={{uri}} style={st.msgImg}/>
    </TouchableOpacity>
  )
})}

          </View>
        )}
        <Text style={[st.msgTime, isOwner && {color:'#FDE2E2'}]}>{fmt(m.time)}</Text>
      </View>
      {isOwner && (
        <View style={st.avatarSmOwner}>
          <Icon name="person" size={12} color="#fff"/>
        </View>
      )}
    </View>
  );
}

/* styles */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:8 },
  headerLeft:{ flexDirection:'row', alignItems:'center', gap:10 },
  hBtn:{ width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },
  hTitle:{ color:'#1D2254', fontWeight:'900', fontSize:24 },

  skelHero:{ height:120, backgroundColor:'#E9EEF5', borderRadius:R, marginTop:12, marginBottom:10 },
  skelLine:{ height:14, backgroundColor:'#E9EEF5', borderRadius:8, marginBottom:10 },
  skelCard:{ height:120, backgroundColor:'#E9EEF5', borderRadius:R },

  card:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:14, marginHorizontal:16, marginTop:12 },
  title:{ color:C.text, fontWeight:'900', fontSize:18 },
  sub:{ color:C.muted, marginTop:4 },
  badge:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:6, borderRadius:999 },

  progress:{ flexDirection:'row', gap:8, marginTop:12, flexWrap:'wrap' },
  step:{ flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#E5E7EB', paddingHorizontal:10, paddingVertical:8, borderRadius:999, borderWidth:1, borderColor:'#E5E7EB' },
  stepOutline:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:8, borderRadius:999, borderWidth:1, backgroundColor:'#fff' },
  stepTxt:{ fontSize:12, fontWeight:'800' },

  thumb:{ width:64, height:64, borderRadius:12, overflow:'hidden', borderWidth:1, borderColor:'#E5E7EB' },

  sectionTitle:{ color:'#1D2254', fontWeight:'900', fontSize:18, paddingHorizontal:16, marginTop:14, marginBottom:8 },

  // conversation
  msgRow:{ flexDirection:'row', alignItems:'flex-end', marginVertical:6 },
  avatarSm:{ width:22, height:22, borderRadius:11, backgroundColor:'#E5E7EB', alignItems:'center', justifyContent:'center', marginHorizontal:6 },
  avatarImg:{ width:22, height:22, borderRadius:11 },
  avatarSmOwner:{ width:22, height:22, borderRadius:11, backgroundColor:'#CBD5E1', alignItems:'center', justifyContent:'center', marginHorizontal:6 },

  bubble:{ maxWidth:W*0.76, borderRadius:16, padding:12 },
  bubbleOwner:{ backgroundColor:C.primary, borderTopRightRadius:6 },
  bubbleSupport:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#EDF2F7', borderTopLeftRadius:6 },
  msgText:{ color:C.text, fontSize:14, lineHeight:20 },
  msgTime:{ marginTop:6, fontSize:11, color:'#94A3B8' },
  msgImgBox:{ width:96, height:96, borderRadius:10, overflow:'hidden', borderWidth:1, borderColor:'#E5E7EB' },
  msgImg:{ width:'100%', height:'100%' },

  sysRow:{ alignItems:'center', marginVertical:10, paddingHorizontal:16 },
  sysBadge:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:10, paddingVertical:6, borderRadius:999, borderWidth:1 },
  sysTxt:{ fontWeight:'900', fontSize:12 },
  sysNote:{ color:C.muted, marginTop:6, textAlign:'center' },
  sysTime:{ color:'#94A3B8', fontSize:11, marginTop:6 },

  // NEW premium composer
  composerWrap2:{
    position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff',
    borderTopWidth:1, borderColor:'#E5E7EB', paddingHorizontal:12, paddingTop:8
  },
  composerCard:{
    flexDirection:'row', alignItems:'flex-end', padding:10,
    backgroundColor:'#fff', borderRadius:18, borderWidth:1, borderColor:'#EEF2F7',
    shadowColor:'#000', shadowOpacity:0.06, shadowRadius:8, shadowOffset:{width:0,height:4},
    elevation:2
  },
  attachBtn:{
    width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#FECACA',
    backgroundColor:'#FFF1F1', alignItems:'center', justifyContent:'center', marginRight:8
  },
  composerInput:{
    color:C.text, fontSize:15, lineHeight:20, minHeight:20, maxHeight:120,
    paddingTop:4, paddingBottom:4
  },
  fabSend:{
    position:'absolute', right:10, bottom:10, width:40, height:40, borderRadius:20,
    backgroundColor:C.primary, alignItems:'center', justifyContent:'center',
    shadowColor:'#ffff', shadowOpacity:0.25, shadowRadius:6, shadowOffset:{width:0,height:3},
    elevation:3
  },
  fabDisabled:{ backgroundColor:'#F1F5F9' },

  // legacy (still used)
  draftBox:{ width:56, height:56, borderRadius:10, overflow:'hidden', borderWidth:1, borderColor:'#E5E7EB', marginRight:8 },
  draftImg:{ width:'100%', height:'100%' },
  draftDel:{ position:'absolute', top:4, right:4, backgroundColor:'rgba(0,0,0,0.55)', width:18, height:18, borderRadius:9, alignItems:'center', justifyContent:'center' },

  overlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', paddingHorizontal:16 },
  sheet:{ width: W*0.86, backgroundColor:'#fff', borderRadius:R, padding:14, borderWidth:1, borderColor:'#EEF2F7' },
  sheetIcon:{ width:34, height:34, borderRadius:10, alignItems:'center', justifyContent:'center', marginRight:10 },
  sheetTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  sheetSub:{ color:C.muted, marginTop:2 },

  primaryBtn:{ backgroundColor:C.primary, borderRadius:12, paddingVertical:12, alignItems:'center', justifyContent:'center' },
  primaryTxt:{ color:'#fff', fontWeight:'900' },
  outBtn:{ borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, paddingVertical:12, alignItems:'center', justifyContent:'center', backgroundColor:'#fff' },
  outTxt:{ color:C.ink, fontWeight:'900' },

  viewer:{ flex:1, backgroundColor:'rgba(0,0,0,0.95)', alignItems:'center', justifyContent:'center' },
  viewerClose:{ position:'absolute', top:18, right:18, width:36, height:36, borderRadius:12, backgroundColor:'rgba(255,255,255,0.18)', alignItems:'center', justifyContent:'center' },

});
