import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, ImageBackground, TouchableOpacity,
  RefreshControl, Dimensions, Animated, Easing, Share, Linking
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api,IMAGE_BASE_URL } from '../api/client';

const C = {
  primary:'#EF3A3A', ink:'#0F172A', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0B1224', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B', danger:'#EF4444'
};
const R = 20;
const { width:W } = Dimensions.get('window');

/* -------------------- helpers -------------------- */
const money = (n)=>`₹ ${Number(n||0).toLocaleString('en-IN')}`;
const day = (d)=> new Date(d);
const fmt = (d)=> day(d).toLocaleDateString('en-IN',{ day:'2-digit', month:'short', year:'numeric' });

const statusStyles = (s)=>({
  bg: s==='approved' ? '#ECFDF5' : s==='pending' ? '#FFF7ED' : '#FEF2F2',
  fg: s==='approved' ? C.ok : s==='pending' ? '#F59E0B' : C.danger,
  label: s ? s[0].toUpperCase()+s.slice(1) : '—',
});

/* -------------------- demo inventory (unchanged) -------------------- */
function demoInventory(seed = 0){
  const base = [
    { date:'2025-08-02', item:'Condenser coil', category:'Spare', cost: 4200, note:'Fridge – south line' },
    { date:'2025-07-28', item:'Site visit', category:'Service', cost: 499, note:'Preventive check' },
    { date:'2025-07-19', item:'Compressor gas refill', category:'Service', cost: 1699, note:'Walk-in freezer' },
    { date:'2025-07-14', item:'Temperature probe', category:'Spare', cost: 850, note:'Combi-oven' },
    { date:'2025-07-01', item:'Deep cleaning', category:'Service', cost: 1499, note:'Chimney baffle' },
    { date:'2025-06-25', item:'Door gasket 600x800', category:'Spare', cost: 1250, note:'Under-counter fridge' },
    { date:'2025-06-18', item:'PCB repair', category:'Repair', cost: 1999, note:'Dishwasher' },
    { date:'2025-06-04', item:'Fan / Motor set', category:'Spare', cost: 1199, note:'Display chiller' },
    { date:'2025-05-29', item:'Site visit', category:'Service', cost: 499, note:'Noise from oven' },
    { date:'2025-05-12', item:'Evaporator cleaning', category:'Service', cost: 749, note:'Deep freezer' },
    { date:'2025-05-01', item:'Ignition kit', category:'Spare', cost: 2100, note:'Gas range' },
    { date:'2025-04-20', item:'Thermostat change', category:'Spare', cost: 899, note:'Upright fridge' },
  ];
  return base.map((x,i)=>({ id:`inv${i+seed}`, ...x, status: i%5===0?'Pending': 'Closed' }));
}

/* ================================================== */
/*                     MAIN SCREEN                    */
/* ================================================== */
export default function RestaurantView({ navigation, route }) {
  const insets = useSafeAreaInsets();

  const r = route?.params?.restaurant ?? {
    id:'rX',
    name:'Spice Hub',
    address:'SG Highway, Ahmedabad',
    desc:'Modern Indian kitchen with 600L cold room.',
    fssai:'10718004001234',
    fssaiPdf:'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
    status:'approved',
    servicesCount: 48,
    expense: 345000,
    photos:[
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2d/07/23/9c/agashiye-terrace-dining.jpg',
      'https://www.ahmedabadcarrentals.com/blog/wp-content/uploads/2022/11/Skyz-Restaurant.jpg',
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/40/66/16/peshawri.jpg',
      'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/25/40/66/fc/royal-vega.jpg',
      'https://www.meraprint.com/wp-content/uploads/2021/09/business-visiting-cards-37.jpg',
    ],
  };

  const status = statusStyles(r.status);

  /* hero pager */
  const [idx, setIdx] = useState(0);
  const sc = useRef(null);
  const bar = useRef(new Animated.Value(0)).current;
  const DURATION = 6000;

  const cycle = ()=>{
    bar.setValue(0);
    Animated.timing(bar,{ toValue:1, duration:DURATION, easing:Easing.linear, useNativeDriver:false }).start(({finished})=>{
      if(!finished) return;
      const next = (idx+1) % (r?.photos?.length || 1);
      setIdx(next);
      sc.current?.scrollTo({ x: next*W, animated:true });
    });
  };

  /* skeleton + refresh */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showSkel = loading || refreshing;

  useEffect(()=>{
    const t=setTimeout(()=>setLoading(false),650);
    return ()=>clearTimeout(t);
  },[]);

  useEffect(()=>{
    if (!showSkel) cycle();
    return ()=>bar.stopAnimation();
  },[idx, showSkel]);

  const onRefresh = ()=>{
    setRefreshing(true);
    Promise.allSettled([reloadEquip()])
      .finally(()=> setTimeout(()=> setRefreshing(false), 400));
  };

  /* demo inventory + analytics */
  const inventory = useMemo(()=> demoInventory(),[]);
  const totalSpend = useMemo(()=> inventory.reduce((a,b)=>a+b.cost,0),[inventory]);

  const last30 = useMemo(()=>{
    const now = new Date();
    const start = new Date(now.getTime() - 30*24*3600*1000);
    return inventory.filter(x=> day(x.date) >= start).reduce((a,b)=>a+b.cost,0);
  },[inventory]);

  const monthlyBars = useMemo(()=>{
    const buckets = [];
    const now = new Date();
    for(let i=5;i>=0;i--){
      const d = new Date(now.getFullYear(), now.getMonth()-i, 1);
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
      const mEnd   = new Date(d.getFullYear(), d.getMonth()+1, 1);
      const value = inventory
        .filter(x=> day(x.date)>=mStart && day(x.date)<mEnd)
        .reduce((a,b)=>a+b.cost,0);
      buckets.push({ label: d.toLocaleDateString('en-IN',{month:'short'}), value });
    }
    const max = Math.max(1, ...buckets.map(b=>b.value));
    return buckets.map(b=>({ ...b, h: Math.max(6, Math.round((b.value/max)*60)) }));
  },[inventory]);

  const shareIt = async ()=>{
    try{ await Share.share({ message:`${r.name}\n${r.address}\nFSSAI: ${r.fssai}` }); }catch(e){}
  };

  const openPdf = async ()=>{
    if (!r.fssaiPdf || r.fssaiPdf.trim() === '') return;
    try{
      await Linking.openURL(r.fssaiPdf);
    } catch(error) {
      try {
        await Linking.openURL(r.fssaiPdf);
      } catch(_) {}
    }
  };

  /* ==================== LIVE EQUIPMENT SNAPSHOT ==================== */
  // We’ll show individual services from Laravel: GET /api/v1/services?status=Active
  const [equip, setEquip] = useState([]);           // array of services
  const [equipLoading, setEquipLoading] = useState(true);
  const [equipError, setEquipError] = useState(null);

  const fetchEquip = async ()=>{
    try {
      setEquipError(null);
      setEquipLoading(true);
      const res = await api.get('app/services', { params: { status: 'Active' } });
      // Expecting an array of services
      const list = Array.isArray(res.data) ? res.data : [];
      // Normalize for UI (title, category, image_url, price)
      setEquip(list.map(s => ({
        id: s.id,
        title: s.title || 'Untitled',
        sub: s.category || (s.description ? String(s.description).slice(0,32)+'…' : '—'),
        count: 1, // you can replace this with s.completed_jobs if you add that column
        image_url: s.image_url || null,
        price: s.price || 0,
      })));
    } catch (err) {
      setEquipError('Failed to load equipment.');
    } finally {
      setEquipLoading(false);
    }
  };

  const reloadEquip = async ()=> fetchEquip();

  useEffect(()=>{ fetchEquip(); },[]);

  /* -------------------- render -------------------- */
  if (showSkel) {
    return <SkeletonRestaurantView insetsBottom={insets.bottom} />;
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* HERO */}
      <View style={{backgroundColor:C.card, borderBottomLeftRadius:R, borderBottomRightRadius:R, overflow:'hidden'}}>
        <ScrollView
          ref={(ref)=>{ sc.current = ref; }}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e)=> setIdx(Math.round(e.nativeEvent.contentOffset.x / W))}
        >
          {r.photos?.map((uri, i)=>(
            <ImageBackground key={i} source={{uri}} style={{width:W, height:240}}>
              <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.25)'}]} />
            </ImageBackground>
          ))}
        </ScrollView>

        {/* overlay controls */}
        <View style={[st.heroTop]}>
          <TouchableOpacity onPress={()=>navigation.goBack()} style={st.round}>
            <Icon name="chevron-back" size={18} color={C.ink}/>
          </TouchableOpacity>
          <View style={{flexDirection:'row', gap:8}}>
            <TouchableOpacity onPress={shareIt} style={st.round}>
              <Icon name="share-social-outline" size={18} color={C.ink}/>
            </TouchableOpacity>
          </View>
        </View>

        {/* progress bottom (90%) */}
        <View style={{position:'absolute', left:16, right:16, bottom:10}}>
          <View style={{height:4, borderRadius:999, backgroundColor:'#ffffff55', overflow:'hidden', width:'90%'}}>
            <Animated.View style={{height:4, width: bar.interpolate({inputRange:[0,1], outputRange:['0%','100%']}), backgroundColor:'#fff'}} />
          </View>
        </View>

        {/* title band */}
        <View style={st.heroBand}>
          <View style={{flex:1}}>
            <Text style={st.title}>{r.name}</Text>
            <Text style={st.addr}>{r.address}</Text>
          </View>
          <View style={[st.statusPill,{backgroundColor:status.bg}]}>
            <Icon name={r.status==='approved'?'checkmark-circle':r.status==='pending'?'time-outline':'close-circle'} size={14} color={status.fg}/>
            <Text style={[st.statusTxt,{color:status.fg}]}>{status.label}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ABOUT / ACTIONS */}
        <View style={st.section}>
          <Text style={st.desc}>{r.desc}</Text>
          <View style={st.quickRow}>
            <View style={st.stat}>
              <View style={st.statIcon}><Icon name="repeat-outline" size={16} color={C.primary}/></View>
              <Text style={st.statNum}>{r.servicesCount}</Text>
              <Text style={st.statLbl}>Services</Text>
            </View>
            <View style={st.sep}/>
            <View style={st.stat}>
              <View style={st.statIcon}><Icon name="cash-outline" size={16} color={C.primary}/></View>
              <Text style={st.statNum}>{money(totalSpend)}</Text>
              <Text style={st.statLbl}>Total spend</Text>
            </View>
            <View style={st.sep}/>
            <View style={st.stat}>
              <View style={st.statIcon}><Icon name="trending-up-outline" size={16} color={C.primary}/></View>
              <Text style={st.statNum}>{money(last30)}</Text>
              <Text style={st.statLbl}>Last 30 days</Text>
            </View>
          </View>

          <View style={{flexDirection:'row', gap:10, marginTop:12}}>
            <TouchableOpacity onPress={openPdf} style={[st.ghostBtn,{flex:1}]}>
              <Icon name="document-text-outline" size={16} color={C.ink}/>
              <Text style={st.ghostTxt}>FSSAI: {r.fssai}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={()=>navigation.navigate?.('Restaurants')} style={[st.outBtn,{flex:0}]}>
              <Text style={st.outTxt}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SPEND CHART */}
        <View style={st.section}>
          <Text style={st.h2}>Spend (last 6 months)</Text>
          <View style={st.chart}>
            {monthlyBars.map((b,i)=>(
              <View key={i} style={st.barWrap}>
                <View style={[st.bar,{height:b.h}]}/>
                <Text style={st.barLbl}>{b.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* EQUIPMENT SNAPSHOT (LIVE) */}
        <View style={st.section}>
          <Text style={st.h2}>Equipment snapshot</Text>

          {equipLoading && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:16}}>
              {[0,1,2].map(i=>(
                <View key={i} style={[st.equipCard, { backgroundColor:'#fff' }]}>
                  <View style={stSK.equipImg} />
                  <View style={{padding:10}}>
                    <View style={stSK.lineMd} />
                    <View style={[stSK.lineSm, { marginTop:6 }]} />
                    <View style={[stSK.metaChip, { marginTop:8 }]} />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {!!equipError && !equipLoading && (
            <View style={{ backgroundColor:'#FEF2F2', borderColor:'#FEE2E2', borderWidth:1, padding:12, borderRadius:12 }}>
              <Text style={{ color:'#991B1B', fontWeight:'700' }}>{equipError}</Text>
              <TouchableOpacity onPress={reloadEquip} style={[st.ghostBtn, { marginTop:8, alignSelf:'flex-start' }]}>
                <Icon name="reload-outline" size={16} color={C.ink}/>
                <Text style={st.ghostTxt}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {!equipLoading && !equipError && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:16}}>
              {equip.map(e => (
                <View key={e.id} style={st.equipCard}>
                  {e.image_url ? (
                    <Image source={{ uri: e.image_url }} style={st.equipImg}/>
                  ) : (
                    <View style={[st.equipImg, { backgroundColor:'#E9EEF5', alignItems:'center', justifyContent:'center' }]}>
                      <Icon name="image-outline" size={22} color="#94A3B8" />
                    </View>
                  )}
                  <View style={{padding:10}}>
                    <Text style={st.equipTitle} numberOfLines={1}>{e.title}</Text>
                    <Text style={st.equipSub} numberOfLines={1}>{e.sub}</Text>
                    <View style={st.equipChip}>
                      <Icon name="cash-outline" size={12} color={C.ink}/>
                      <Text style={st.equipChipTxt}>{money(e.price)}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
          )}

          {(!equipLoading && !equipError && equip.length === 0) && (
            <View style={{ padding:16, borderWidth:1, borderColor:'#E5E7EB', borderRadius:12, backgroundColor:'#fff' }}>
              <Text style={{ color:C.muted }}>No equipment to show yet.</Text>
            </View>
          )}
        </View>

        {/* INVENTORY TIMELINE */}
        <View style={st.section}>
          <Text style={st.h2}>Inventory & services timeline</Text>
          <View style={{marginTop:6}}>
            {inventory.map((x, i)=>(
              <View key={x.id} style={st.tlRow}>
                {/* left pin + line */}
                <View style={st.tlLeft}>
                  <View style={[st.pin, {backgroundColor: x.category==='Service' ? C.primary : (x.category==='Repair'? '#EAB308' : '#0EA5E9')}]}/>
                  {i!==inventory.length-1 && <View style={st.tlLine}/>}
                </View>

                {/* card */}
                <View style={st.tlCard}>
                  <View style={{flexDirection:'row', justifyContent:'space-between', alignItems:'center'}}>
                    <Text style={st.tlTitle}>{x.item}</Text>
                    <Text style={st.tlAmt}>{money(x.cost)}</Text>
                  </View>
                  <Text style={st.tlMeta}>{fmt(x.date)} • {x.category}</Text>
                  {!!x.note && <Text style={st.tlNote}>{x.note}</Text>}
                  <View style={{flexDirection:'row', gap:8, marginTop:8}}>
                    <View style={[st.badge,{backgroundColor:x.status==='Closed'?'#ECFDF5':'#FFF7ED'}]}>
                      <Text style={[st.badgeTxt,{color:x.status==='Closed'?C.ok:C.warn}]}>{x.status}</Text>
                    </View>
                    <View style={[st.badge,{backgroundColor:'#EEF2FF'}]}>
                      <Text style={[st.badgeTxt,{color:'#334155'}]}>#{i+1001}</Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* bottom space */}
        <View style={{height:20}}/>
      </ScrollView>

      {/* STICKY ACTION BAR */}
      <View style={[st.sticky,{ paddingBottom: insets.bottom > 0 ? insets.bottom : 20}]}>
        <View style={{flex:1}}>
          <Text style={st.stickyTop}>{r.name}</Text>
          <Text style={st.stickySub}>{r.address}</Text>
        </View>
        <TouchableOpacity style={st.primaryBtn} onPress={()=>navigation.navigate?.('Request',{ restaurant:r })}>
          <Icon name="add-circle" size={18} color="#fff"/>
          <Text style={st.primaryTxt}>Raise request</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

/* ==================== SKELETON VIEW ==================== */
function SkeletonRestaurantView({ insetsBottom=0 }) {
  const pulse = useRef(new Animated.Value(0.6)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <SafeAreaView style={{ flex:1, backgroundColor:C.bg }} edges={['top','left','right']}>
      {/* HERO skeleton */}
      <View style={{backgroundColor:C.card, borderBottomLeftRadius:R, borderBottomRightRadius:R, overflow:'hidden'}}>
        <Animated.View style={[stSK.hero, { opacity:pulse }]}>
          <View style={st.heroTop}>
            <View style={stSK.round}/>
            <View style={{ flexDirection:'row', gap:8 }}>
              <View style={stSK.round}/>
            </View>
          </View>
          <View style={{position:'absolute', left:16, right:16, bottom:10}}>
            <View style={{height:4, borderRadius:999, backgroundColor:'#ffffff55', overflow:'hidden', width:'90%'}} />
          </View>
        </Animated.View>

        <View style={st.heroBand}>
          <View style={{flex:1}}>
            <Animated.View style={[stSK.lineLg, { width:'55%', opacity:pulse }]} />
            <Animated.View style={[stSK.lineSm, { width:'35%', marginTop:6, opacity:pulse }]} />
          </View>
          <Animated.View style={[stSK.statusPill, { opacity:pulse }]} />
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={true} onRefresh={()=>{}} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ABOUT / ACTIONS */}
        <View style={st.section}>
          <Animated.View style={[stSK.paraLine, { width:'95%', opacity:pulse }]} />
          <Animated.View style={[stSK.paraLine, { width:'85%', marginTop:6, opacity:pulse }]} />

          <View style={st.quickRow}>
            {[0,1,2].map(i=>(
              <View key={i} style={[st.stat,{ alignItems:'center' }]}>
                <Animated.View style={[stSK.icon, { opacity:pulse }]} />
                <Animated.View style={[stSK.lineMd, { width:70, marginTop:6, opacity:pulse }]} />
                <Animated.View style={[stSK.lineXs, { width:60, marginTop:4, opacity:pulse }]} />
              </View>
            ))}
          </View>

          <View style={{flexDirection:'row', gap:10, marginTop:12}}>
            <Animated.View style={[stSK.btnGhost, { flex:1, opacity:pulse }]} />
            <Animated.View style={[stSK.btnOutline, { width:110, opacity:pulse }]} />
          </View>
        </View>

        {/* SPEND CHART */}
        <View style={st.section}>
          <Animated.View style={[stSK.h2, { width:200, opacity:pulse }]} />
          <View style={st.chart}>
            {[...Array(6)].map((_,i)=>(
              <View key={i} style={st.barWrap}>
                <Animated.View style={[stSK.bar, { height: 40 + (i%3)*10, opacity:pulse }]} />
                <Animated.View style={[stSK.tick, { opacity:pulse }]} />
              </View>
            ))}
          </View>
        </View>

        {/* EQUIPMENT SNAPSHOT */}
        <View style={st.section}>
          <Animated.View style={[stSK.h2, { width:220, opacity:pulse }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingRight:16}}>
            {[0,1,2].map(i=>(
              <View key={i} style={[st.equipCard, { backgroundColor:'#fff' }]}>
                <Animated.View style={[stSK.equipImg, { opacity:pulse }]} />
                <View style={{padding:10}}>
                  <Animated.View style={[stSK.lineMd, { width:'70%', opacity:pulse }]} />
                  <Animated.View style={[stSK.lineSm, { width:'40%', marginTop:6, opacity:pulse }]} />
                  <Animated.View style={[stSK.metaChip, { marginTop:8, opacity:pulse }]} />
                </View>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* TIMELINE */}
        <View style={st.section}>
          <Animated.View style={[stSK.h2, { width:260, opacity:pulse }]} />
          <View style={{marginTop:6}}>
            {[0,1,2,3].map((i)=>(
              <View key={i} style={st.tlRow}>
                <View style={st.tlLeft}>
                  <Animated.View style={[stSK.pin, { opacity:pulse }]} />
                  {i!==3 && <View style={st.tlLine}/>}
                </View>
                <View style={st.tlCard}>
                  <Animated.View style={[stSK.lineMd, { width:'65%', opacity:pulse }]} />
                  <Animated.View style={[stSK.lineXs, { width:'35%', marginTop:6, opacity:pulse }]} />
                  <Animated.View style={[stSK.paraLine, { width:'90%', marginTop:6, opacity:pulse }]} />
                  <View style={{flexDirection:'row', gap:8, marginTop:10}}>
                    <Animated.View style={[stSK.badge, { opacity:pulse }]} />
                    <Animated.View style={[stSK.badge, { opacity:pulse }]} />
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={{height:20}} />
      </ScrollView>

      {/* STICKY BAR skeleton */}
      <View style={[st.sticky,{ paddingBottom: insetsBottom > 0 ? insetsBottom : 120 }]}>
        <View style={{flex:1}}>
          <Animated.View style={[stSK.lineSm, { width:160, opacity:pulse }]} />
          <Animated.View style={[stSK.lineXs, { width:120, marginTop:6, opacity:pulse }]} />
        </View>
        <Animated.View style={[stSK.btnPrimary, { width:160, opacity:pulse }]} />
      </View>
    </SafeAreaView>
  );
}
/* -------------------- styles -------------------- */
const st = StyleSheet.create({
  heroTop:{ position:'absolute', top:12, left:12, right:12, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  round:{ width:38, height:38, borderRadius:12, backgroundColor:'#FFFFFFEE', alignItems:'center', justifyContent:'center' },
  heroBand:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between',
    paddingHorizontal:16, paddingVertical:12, backgroundColor:'#FFFFFFEE' },
  title:{ color:C.ink, fontSize:20, fontWeight:'900' },
  addr:{ color:C.muted, marginTop:2 },

  statusPill:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:6, borderRadius:999 },
  statusTxt:{ fontWeight:'800', fontSize:12 },

  section:{ backgroundColor:'transparent', paddingHorizontal:16, paddingTop:14 },
  desc:{ color:C.text, lineHeight:20 },
  quickRow:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', marginTop:12, paddingHorizontal:12, paddingVertical:10,
    flexDirection:'row', alignItems:'stretch' },
  stat:{ flex:1, alignItems:'center' },
  statIcon:{ width:28, height:28, borderRadius:9, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center', marginBottom:6 },
  statNum:{ fontWeight:'900', color:C.ink },
  statLbl:{ color:C.muted, fontSize:12 },
  sep:{ width:1, backgroundColor:'#E5E7EB', marginHorizontal:8 },

  ghostBtn:{ flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, paddingHorizontal:12, paddingVertical:10, backgroundColor:'#fff' },
  ghostTxt:{ color:C.ink, fontWeight:'800' },
  outBtn:{ borderWidth:1, borderColor:'#E2E8F0', borderRadius:12, paddingHorizontal:14, paddingVertical:10, backgroundColor:'#fff' },
  outTxt:{ color:C.ink, fontWeight:'900' },

  h2:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:10 },

  chart:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:14, flexDirection:'row', alignItems:'flex-end', justifyContent:'space-between' },
  barWrap:{ alignItems:'center', width:Math.max(36,(W-32-14*2)/6-6) },
  bar:{ width:16, borderRadius:6, backgroundColor:C.primary, opacity:0.9 },
  barLbl:{ marginTop:8, color:'#475569', fontWeight:'700', fontSize:12 },

  equipCard:{ width:W*0.6, backgroundColor:'#fff', borderWidth:1, borderColor:'#EEF2F7', borderRadius:R, marginRight:12, overflow:'hidden' },
  equipImg:{ width:'100%', height:110 },
  equipTitle:{ color:C.text, fontWeight:'900' },
  equipSub:{ color:C.muted, marginTop:2 },
  equipChip:{ alignSelf:'flex-start', marginTop:8, flexDirection:'row', alignItems:'center', gap:6, backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#EEF2F7', paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  equipChipTxt:{ color:C.ink, fontWeight:'800', fontSize:12 },

  tlRow:{ flexDirection:'row', marginBottom:12 },
  tlLeft:{ width:20, alignItems:'center' },
  pin:{ width:10, height:10, borderRadius:999, marginTop:8 },
  tlLine:{ width:2, flex:1, backgroundColor:'#E2E8F0', marginTop:2, marginBottom:6 },
  tlCard:{ flex:1, backgroundColor:'#fff', borderRadius:14, borderWidth:1, borderColor:'#EEF2F7', padding:12 },
  tlTitle:{ color:C.text, fontWeight:'900' },
  tlAmt:{ color:C.ink, fontWeight:'900' },
  tlMeta:{ color:C.muted, marginTop:2 },
  tlNote:{ color:C.text, marginTop:4 },

  badge:{ paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  badgeTxt:{ fontWeight:'800', fontSize:12 },

  sticky:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', borderTopWidth:1, borderColor:'#E5E7EB',
    flexDirection:'row', alignItems:'center', paddingHorizontal:16, paddingTop:10 },
  stickyTop:{ color:C.ink, fontWeight:'900' },
  stickySub:{ color:C.muted, fontSize:12 },
  primaryBtn:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:C.primary, paddingHorizontal:16, paddingVertical:12, borderRadius:14 },
  primaryTxt:{ color:'#fff', fontWeight:'900' },
});

/* ============== Skeleton Styles (structure-matched) ============== */
const stSK = StyleSheet.create({
  hero:{ width:'100%', height:240, backgroundColor:'#E9EEF5' },

  /* lines */
  lineLg:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineMd:{ height:14, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineSm:{ height:12, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineXs:{ height:10, borderRadius:8, backgroundColor:'#E9EEF5' },
  paraLine:{ height:12, borderRadius:6, backgroundColor:'#E9EEF5' },

  /* pills/buttons */
  statusPill:{ width:100, height:28, borderRadius:999, backgroundColor:'#E6EEF7' },
  btnGhost:{ height:44, borderRadius:12, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },
  btnOutline:{ height:44, borderRadius:12, backgroundColor:'#F8FAFC', borderWidth:1, borderColor:'#E2E8F0' },
  btnPrimary:{ height:44, borderRadius:14, backgroundColor:'#F43F5E' },

  /* icons / chips */
  icon:{ width:28, height:28, borderRadius:9, backgroundColor:'#F1F5F9' },
  metaChip:{ width:90, height:28, borderRadius:999, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#EEF2F7' },

  /* chart */
  bar:{ width:16, borderRadius:6, backgroundColor:'#F1F5F9' },
  tick:{ width:24, height:10, borderRadius:6, backgroundColor:'#E9EEF5', marginTop:8 },

  /* equip */
  equipImg:{ width:'100%', height:110, backgroundColor:'#E9EEF5' },

  /* timeline */
  pin:{ width:10, height:10, borderRadius:999, marginTop:8, backgroundColor:'#E2E8F0' },
  badge:{ width:70, height:26, borderRadius:999, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },

  /* overlay rounds */
  round:{ width:38, height:38, borderRadius:12, backgroundColor:'#FFFFFFEE' },
});
