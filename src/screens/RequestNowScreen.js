// screens/RequestNowPremium.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, ScrollView, TouchableOpacity,
  RefreshControl, Animated, Easing, Modal, Dimensions, Platform
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

/* -------------------------------- THEME -------------------------------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981'
};
const R = 18;
const W = Dimensions.get('window').width;
const money = (n)=>`₹ ${n.toLocaleString('en-IN')}`;

/* ------------------------------ DEMO DATA ------------------------------ */
const EQUIP = [
  {
    id:'e1', title:'Commercial Fridge', about:'Double-door • 600L',
    image:'https://blog.ansi.org/wp-content/uploads/2024/08/Chef-Gourmet-Restaurant-Fridge.jpg',
    services:[
      {id:'s1',name:'Site Visit',price:499,qty:1},
      {id:'s2',name:'Condenser Clean',price:699,qty:1},
      {id:'s3',name:'Gas Refill',price:1699,qty:1},
    ]
  },
  {
    id:'e2', title:'Deep Freezer', about:'-18°C • 450L',
    image:'https://5.imimg.com/data5/JI/SI/MY-66261283/restaurant-deep-freezer.jpg',
    services:[
      {id:'s1',name:'Site Visit',price:499,qty:1},
      {id:'s6',name:'Evaporator Clean',price:749,qty:1},
      {id:'s8',name:'Fan/Motor',price:1199,qty:1},
    ]
  },
  {
    id:'e3', title:'Chimney', about:'1200 m³/h • Baffle',
    image:'https://etimg.etb2bimg.com/photo/89982831.cms',
    services:[
      {id:'s1',name:'Site Visit',price:499,qty:1},
      {id:'s10',name:'Deep Cleaning',price:1499,qty:1},
      {id:'s4',name:'Thermostat',price:899,qty:1},
    ]
  },
  {
    id:'e4', title:'Combi Oven', about:'10-tray • Steam inject',
    image:'https://content.jdmagicbox.com/comp/ahmedabad/l6/079pxx79.xx79.120328155552.t7l6/catalogue/k-k-air-engineering-dudheshwar-road-ahmedabad-kitchen-chimney-manufacturers-i1bs2bvv28.jpg',
    services:[
      {id:'s1',name:'Site Visit',price:499,qty:1},
      {id:'s9',name:'PCB Repair',price:1999,qty:1},
      {id:'s7',name:'Condenser Clean',price:699,qty:1},
    ]
  },
  {
    id:'e5', title:'Dishwasher', about:'Hood-type • 3-phase',
    image:'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1600&auto=format&fit=crop',
    services:[
      {id:'s1',name:'Site Visit',price:499,qty:1},
      {id:'s6',name:'Scale Removal',price:749,qty:1},
      {id:'s8',name:'Pump Repair',price:1199,qty:1},
    ]
  },
];

/* ------------------------------- HELPERS ------------------------------- */
const lineTotal = (svcs)=> svcs.reduce((s,x)=> s + (x.selected ? x.price : 0), 0);
const next30days = ()=>{
  const out=[]; const base=new Date();
  for(let i=0;i<30;i++){ const d=new Date(base); d.setDate(base.getDate()+i); out.push(d); }
  return out;
};

/* --------------------------- BOTTOM SHEET HOOK --------------------------- */
const useBottomSheet = () => {
  const [open, setOpen] = useState(false);
  const y = useRef(new Animated.Value(700)).current;
  const show = () => {
    setOpen(true);
    Animated.timing(y,{toValue:0,duration:280,easing:Easing.out(Easing.cubic),useNativeDriver:true}).start();
  };
  const hide = (cb) => {
    Animated.timing(y,{toValue:700,duration:250,easing:Easing.in(Easing.cubic),useNativeDriver:true}).start(()=>{ setOpen(false); cb&&cb(); });
  };
  return { open, y, show, hide };
};

/* =============================== MAIN ================================ */
export default function RequestNowPremium({ navigation }) {
  const insets = useSafeAreaInsets();

  /* skeleton + refresh */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(()=>{
    const t = setTimeout(()=>setLoading(false), 650);
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse,{toValue:1,duration:800,useNativeDriver:false}),
      Animated.timing(pulse,{toValue:0.5,duration:800,useNativeDriver:false}),
    ]));
    loop.start(); return ()=>{clearTimeout(t); loop.stop();};
  },[]);
  const onRefresh = ()=>{
    setRefreshing(true); setLoading(true);
    setTimeout(()=>{ setRefreshing(false); setLoading(false); }, 900);
  };

  /* equipments state (services default selected) */
  const [equip, setEquip] = useState(
    EQUIP.map(e=>({
      ...e,
      selected:true,
      services: e.services.map(s=>({ ...s, selected:true }))
    }))
  );
  const toggleEquip = (id)=> setEquip(list=>list.map(x=>x.id===id?{...x,selected:!x.selected}:x));
  const toggleService = (eqId, svcId) => {
    setEquip(list=>list.map(eq=>{
      if(eq.id!==eqId) return eq;
      return {
        ...eq,
        services: eq.services.map(s => s.id===svcId ? ({ ...s, selected: !s.selected }) : s)
      };
    }));
  };
const RESTAURANTS = [
  { id:'r1', name:'Spice Hub', address:'SG Highway, Ahmedabad', fssai:'10718004001234', approved:true,
    photo:'https://images.unsplash.com/photo-1541542684-4a72a5e25a4e?q=80&w=1200&auto=format&fit=crop' },
  { id:'r2', name:'Café Verde', address:'Law Garden, Ahmedabad', fssai:'10718004005678', approved:false,
    photo:'https://images.unsplash.com/photo-1498654200943-1088dd4438ae?q=80&w=1200&auto=format&fit=crop' },
  { id:'r3', name:'Tandoor Tales', address:'Bodakdev, Ahmedabad', fssai:'10718004007890', approved:true,
    photo:'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?q=80&w=1200&auto=format&fit=crop' },
];

  /* totals */
  const totals = useMemo(()=>{
    const chosen = equip.filter(e=>e.selected);
    const itemTotal = chosen.reduce((s,e)=> s + lineTotal(e.services), 0);
    const fee = itemTotal>0 ? 49 : 0;
    const gst = Math.round((itemTotal + fee) * 0.18);
    return { itemTotal, fee, gst, grand: itemTotal + fee + gst, count: chosen.length };
  },[equip]);

  /* tips (no custom; tap again to clear) */
  const [tip, setTip] = useState(0);
  const tipTap = (v)=> setTip(prev => prev===v ? 0 : v);
  const tips = [50,75,100];

  /* calendar + restaurant bottom-sheets */
  const PAD = 16;            // horizontal padding you use around the grid
const COL_GAP = 8;         // desired gap between days
const CELL = Math.floor((W - PAD*2 - COL_GAP*6) / 7);


  const calBS = useBottomSheet();
  const restBS = useBottomSheet();
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [done, setDone] = useState(false);
  const days = useMemo(()=> next30days(),[]);

  /* EQUIPMENT HORIZONTAL CAROUSEL */
  const CARD_W = Math.min(W*0.82, 340);
  const GAP = 14;
  const x = useRef(new Animated.Value(0)).current;

  const EquipCard = ({ item, index })=>{
    const inputRange = [(index-1)*(CARD_W+GAP), index*(CARD_W+GAP), (index+1)*(CARD_W+GAP)];
    const scale = x.interpolate({ inputRange, outputRange:[0.92,1,0.92], extrapolate:'clamp' });
    const elev = x.interpolate({ inputRange, outputRange:[2,8,2], extrapolate:'clamp' });

    return (
      <Animated.View style={[st.eqCardOuter, { width:CARD_W, transform:[{scale}], elevation:elev }]}>
        <View style={st.eqCard}>
          <ImageBackground source={{uri:item.image}} style={st.eqHero} imageStyle={{borderTopLeftRadius:R,borderTopRightRadius:R}}>
            <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.25)'}]} />
            <View style={st.eqBadgeRow}>
              <View style={st.eqChip}>
                <Icon name="snow-outline" size={14} color={C.primary}/>
                <Text style={st.eqChipTxt}>{item.title.split(' ')[0]}</Text>
              </View>
              <TouchableOpacity onPress={()=>toggleEquip(item.id)} style={[st.selToggle, item.selected && st.selToggleOn]}>
                <Icon name={item.selected?'checkmark-circle':'ellipse-outline'} size={18} color={item.selected?'#fff':C.ink}/>
                <Text style={[st.selTxt, item.selected && {color:'#fff'}]}>{item.selected?'Selected':'Select'}</Text>
              </TouchableOpacity>
            </View>
            <View style={st.eqHeroBottom}>
              <Text style={st.eqTitle}>{item.title}</Text>
              <Text style={st.eqAbout}>{item.about}</Text>
            </View>
          </ImageBackground>

          {/* service toggles */}
          <View style={st.eqBody}>
            <View style={st.svcTags}>
              {item.services.map(s=>{
                const on = !!s.selected;
                return (
                  <TouchableOpacity
                    key={s.id}
                    onPress={()=>toggleService(item.id, s.id)}
                    style={[st.svcTag, on ? st.svcTagOn : st.svcTagOff]}
                    activeOpacity={0.9}
                  >
                    <View style={[st.svcDot, on ? {backgroundColor:C.primary} : {backgroundColor:'#CBD5E1'}]} />
                    <Text style={[st.svcTagTxt, !on && { color:'#64748B', textDecorationLine:'line-through' }]}>{s.name}</Text>
                    <Text style={[st.svcTagAmt, !on && { color:'#94A3B8', textDecorationLine:'line-through' }]}>{money(s.price)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={st.eqTotalRow}>
              <Text style={st.eqTotalLbl}>Equipment total</Text>
              <Text style={st.eqTotalAmt}>{money(lineTotal(item.services))}</Text>
            </View>
          </View>
        </View>
      </Animated.View>
    );
  };

  /* ------------------------------ RENDER ------------------------------ */
  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* Header */}
      <View style={[st.header,{ paddingTop:8 }]}>
        <TouchableOpacity onPress={()=>navigation.goBack()} style={st.hBack} hitSlop={{top:6,bottom:6,left:6,right:6}}>
          <Icon name="chevron-back" size={22} color={C.ink}/>
        </TouchableOpacity>
        <Text style={st.hTitle}>Your cart</Text>
        <View style={{width:38}}/>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 112 }}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={{padding:16}}>
            <Animated.View style={[st.skelHero,{opacity:pulse}]}/>
            <Animated.View style={[st.skelLine,{opacity:pulse,width:'70%'}]}/>
            <Animated.View style={[st.skelLine,{opacity:pulse,width:'50%'}]}/>
            <Animated.View style={[st.skelCard,{opacity:pulse}]}/>
          </View>
        ) : (
          <>
            {/* Equip carousel */}
            <View style={{paddingVertical:10}}>
              <Animated.FlatList
                horizontal
                data={equip}
                keyExtractor={(i)=>i.id}
                renderItem={EquipCard}
                contentContainerStyle={{ paddingHorizontal:(W - CARD_W)/2 }}
                ItemSeparatorComponent={()=><View style={{ width:GAP }}/>}
                showsHorizontalScrollIndicator={false}
                snapToInterval={CARD_W + GAP}
                decelerationRate="fast"
                onScroll={Animated.event([{nativeEvent:{contentOffset:{x}}}],{useNativeDriver:false})}
                scrollEventThrottle={16}
              />
            </View>

            {/* Summary */}
            <View style={st.sumCard}>
              <Text style={st.sumTitle}>Payment summary</Text>
              <View style={st.row}><Text style={st.rowLbl}>Item total</Text><Text style={st.rowVal}>{money(totals.itemTotal)}</Text></View>
              <View style={st.row}><Text style={st.rowLbl}>Taxes and Fee</Text><Text style={st.rowVal}>{money(totals.fee)}</Text></View>
              <View style={st.sep}/>
              <View style={st.row}><Text style={[st.rowLbl,{fontWeight:'800'}]}>Total amount</Text><Text style={[st.rowVal,{fontWeight:'800'}]}>{money(totals.itemTotal + totals.fee)}</Text></View>
              <View style={st.row}><Text style={st.rowLbl}>Tax (GST 18%)</Text><Text style={st.rowVal}>{money(totals.gst)}</Text></View>
              <View style={st.sep}/>
              <View style={st.rowBig}><Text style={st.rowBigLbl}>Amount to pay</Text><Text style={st.rowBigVal}>{money(totals.grand + tip)}</Text></View>
            </View>

            {/* Policy */}
            <View style={st.card}>
              <Text style={st.h2}>Cancellation policy</Text>
              <Text style={st.p}>
                Free cancellations if done more than 12 hrs before the service or if a professional isn’t assigned.
                A fee will be charged otherwise.
              </Text>
              <TouchableOpacity><Text style={st.link}>Read full policy</Text></TouchableOpacity>
            </View>

            {/* Tip (no Custom) */}
            <View style={st.card}>
              <Text style={st.h2}>Add a tip to thank the Professional</Text>
              <View style={{flexDirection:'row',marginTop:8}}>
                {tips.map(v=>{
                  const on = tip===v;
                  return (
                    <TouchableOpacity key={v} style={[st.tip, on && st.tipOn]} onPress={()=>tipTap(v)}>
                      <Text style={[st.tipTxt, on && st.tipTxtOn]}>{money(v)}</Text>
                      {v===75 && <Text style={st.tipBadge}>POPULAR</Text>}
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={[st.p,{marginTop:6}]}>100% of the tip goes to the professional.</Text>
            </View>

            {/* Address */}
            <View style={st.addr}>
              <Icon name="home-outline" size={18} color={C.ink}/>
              <Text style={st.addrTxt} numberOfLines={1}><Text style={{fontWeight:'800'}}>Home</Text> — Jdbhs, Maruti Titanium, Sardar Patel…</Text>
              <TouchableOpacity><Icon name="create-outline" size={18} color={C.muted}/></TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[st.cta, { paddingBottom: insets.bottom>0 ? insets.bottom : 12 }]}>
        <Text style={st.ctaMeta}>{equip.filter(e=>e.selected).length} selected • {money(totals.grand + tip)}</Text>
        {!selectedDate ? (
          <TouchableOpacity style={st.ctaBtn} onPress={()=>calBS.show()}>
            <Icon name="calendar-outline" size={18} color="#fff"/><Text style={st.ctaTxt}>Select slot</Text>
          </TouchableOpacity>
        ) : !selectedRestaurant ? (
          <TouchableOpacity style={st.ctaBtn} onPress={()=>restBS.show()}>
            <Icon name="storefront-outline" size={18} color="#fff"/><Text style={st.ctaTxt}>Select restaurant</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={st.ctaBtn} onPress={()=>setDone(true)}>
            <Icon name="checkmark-done" size={18} color="#fff"/><Text style={st.ctaTxt}>Confirm</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* CALENDAR SHEET */}
      {calBS.open && (
        <Modal transparent animationType="none">
          <TouchableOpacity activeOpacity={1} onPress={()=>calBS.hide()} style={st.bsOverlay}/>
          <Animated.View style={[st.bs, { transform:[{translateY: calBS.y}] }]}>
            <View style={st.bsGrab}/>
            <View style={st.bsHeader}>
              <Text style={st.bsTitle}>Select a date</Text>
              <TouchableOpacity onPress={()=>calBS.hide()} style={st.bsClose}>
                <Icon name="close" size={18} color={C.ink}/>
              </TouchableOpacity>
            </View>
            <Text style={st.bsSub}>Next 30 days</Text>

            <View style={{paddingHorizontal:16,paddingBottom:10}}>
              <View style={st.dowRow}>
                {['S','M','T','W','T','F','S'].map((d,i)=><Text key={i} style={st.dowTxt}>{d}</Text>)}
              </View>
              {(() => {
                const list = days;
                const firstDow = list[0].getDay();
                const blanks = Array.from({length:firstDow});
                const cells = [...blanks.map(()=>null), ...list];
                const rows = [];
                while(cells.length) rows.push(cells.splice(0,7));
                return rows.map((wk,ri)=>(
                  <View key={ri} style={[st.weekRow, { columnGap: COL_GAP }]}>
                    {wk.map((cell,ci)=>{
  if(!cell) {
    return (
      <View
        key={ci}
        style={[st.dayEmpty, { width: CELL, height: CELL }]}   // ← add width+height
      />
    );
  }
  const sel = selectedDate && new Date(selectedDate).toDateString()===cell.toDateString();
  return (
    <TouchableOpacity
      key={ci}
      style={[st.day, sel && st.dayOn, { width: CELL, height: CELL }]} // ← add width+height
      onPress={()=>setSelectedDate(cell)}
    >
      <Text style={[st.dayTxt, sel && st.dayTxtOn]}>{cell.getDate()}</Text>
    </TouchableOpacity>
  );
})}

                  </View>
                ));
              })()}
            </View>

            <TouchableOpacity
              style={[st.bsBtn, !selectedDate && {opacity:0.5}]}
              disabled={!selectedDate}
              onPress={()=>{calBS.hide(()=>restBS.show());}}
            >
              <Text style={st.bsBtnTxt}>Continue</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}

      {/* RESTAURANT SHEET */}
      {restBS.open && (
        <Modal transparent animationType="none">
          <TouchableOpacity activeOpacity={1} onPress={()=>restBS.hide()} style={st.bsOverlay}/>
          <Animated.View style={[st.bsLarge, { transform:[{translateY: restBS.y}] }]}>
            <View style={st.bsGrab}/>
            <View style={st.bsHeader}>
              <Text style={st.bsTitle}>Select your restaurant</Text>
              <TouchableOpacity onPress={()=>restBS.hide()} style={st.bsClose}>
                <Icon name="close" size={18} color={C.ink}/>
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{padding:16,paddingBottom:20}}>
              {RESTAURANTS.map(r=>{
                const active = selectedRestaurant?.id===r.id;
                return (
                  <TouchableOpacity key={r.id} style={[st.rest, active && { borderColor:C.primary }]} onPress={()=>setSelectedRestaurant(r)}>
                    <Image source={{uri:r.photo}} style={st.restImg}/>
                    <View style={{flex:1,marginLeft:12}}>
                      <Text style={st.restName}>{r.name}</Text>
                      <Text style={st.restAddr} numberOfLines={1}>{r.address}</Text>
                      <Text style={st.restFssai}>FSSAI: {r.fssai}</Text>
                      <View style={{flexDirection:'row',marginTop:8}}>
                        <View style={[st.badge, r.approved?st.badgeOk:st.badgeWarn]}>
                          <Icon name={r.approved?'shield-checkmark':'alert-circle'} size={12} color={r.approved?'#fff':'#111'}/>
                          <Text style={[st.badgeTxt, r.approved&&{color:'#fff'}]}>{r.approved?'Approved':'Not approved'}</Text>
                        </View>
                      </View>
                    </View>
                    {active && <Icon name="checkmark-circle" size={22} color={C.primary}/>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={[st.bsBtn, !selectedRestaurant && {opacity:0.5}]}
              disabled={!selectedRestaurant}
              onPress={()=>{restBS.hide(); setDone(true);}}
            >
              <Text style={st.bsBtnTxt}>Confirm</Text>
            </TouchableOpacity>
          </Animated.View>
        </Modal>
      )}

      {/* SUCCESS MODAL */}
      {done && (
        <Modal transparent animationType="fade">
          <View style={st.doneWrap}>
            <View style={st.doneCard}>
              <View style={st.doneIcon}><Icon name="checkmark-circle" size={36} color="#fff"/></View>
              <Text style={st.doneTitle}>Congratulations 🎉</Text>
              <Text style={st.doneDesc}>
                We’ll notify you when a service engineer is available on your selected date and will arrive at your restaurant.
              </Text>
              <TouchableOpacity style={st.doneBtn} onPress={()=>{ setDone(false); navigation.goBack(); }}>
                <Text style={st.doneBtnTxt}>Okay</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

/* -------------------------------- STYLES -------------------------------- */
const st = StyleSheet.create({
  header:{ paddingHorizontal:16, paddingBottom:8, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  hBack:{ width:38, height:38, borderRadius:12, backgroundColor:'#fff', alignItems:'center', justifyContent:'center',
    borderWidth:1, borderColor:'#EEF2F7' },
  hTitle:{ fontSize:24, fontWeight:'900', color:C.ink },

  /* skeleton */
  skelHero:{ height:220, backgroundColor:'#E9EEF5', borderRadius:R, marginBottom:12, marginHorizontal:16 },
  skelLine:{ height:14, backgroundColor:'#E9EEF5', borderRadius:8, marginBottom:10, marginHorizontal:16 },
  skelCard:{ height:120, backgroundColor:'#E9EEF5', borderRadius:R, marginHorizontal:16 },

  /* equipment carousel */
  eqCardOuter:{ backgroundColor:'transparent' },
  eqCard:{ backgroundColor:C.card, borderRadius:R, overflow:'hidden', borderWidth:1, borderColor:'#EEF2F7' },
  eqHero:{ height:150, justifyContent:'space-between' },
  eqBadgeRow:{ flexDirection:'row', justifyContent:'space-between', padding:12 },
  eqChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF1F1', borderColor:'#FECACA',
    borderWidth:1, paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  eqChipTxt:{ marginLeft:6, color:C.primary, fontWeight:'800', fontSize:12 },
  selToggle:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFFFFFEE', borderWidth:1, borderColor:'#FFFFFFAA',
    paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  selToggleOn:{ backgroundColor:C.primary, borderColor:C.primary },
  selTxt:{ marginLeft:6, color:C.ink, fontWeight:'800', fontSize:12 },
  eqHeroBottom:{ backgroundColor:'#FFFFFFE6', paddingHorizontal:12, paddingVertical:10 },
  eqTitle:{ color:C.ink, fontWeight:'900', fontSize:16 },
  eqAbout:{ color:C.muted, marginTop:2, fontSize:12 },

  eqBody:{ padding:12 },
  svcTags:{ flexDirection:'row', flexWrap:'wrap', gap:8 },
  svcTag:{ flexDirection:'row', alignItems:'center', gap:8, borderRadius:12, paddingHorizontal:12, paddingVertical:10, borderWidth:1 },
  svcTagOn:{ backgroundColor:'#F8FAFC', borderColor:'#E2E8F0' },
  svcTagOff:{ backgroundColor:'#F1F5F9', borderColor:'#E2E8F0' },
  svcDot:{ width:8, height:8, borderRadius:999 },
  svcTagTxt:{ color:C.text, fontWeight:'700', fontSize:12 },
  svcTagAmt:{ color:C.muted, fontSize:12 },

  eqTotalRow:{ marginTop:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  eqTotalLbl:{ color:C.muted, fontSize:12 },
  eqTotalAmt:{ color:C.ink, fontWeight:'900' },

  /* summary */
  sumCard:{ backgroundColor:C.card, borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:16, marginHorizontal:16, marginTop:8 },
  sumTitle:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:6 },
  row:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:6 },
  rowLbl:{ color:C.text, fontSize:14 },
  rowVal:{ color:C.text, fontWeight:'700', fontSize:14 },
  rowBig:{ flexDirection:'row', justifyContent:'space-between', paddingVertical:8, alignItems:'center' },
  rowBigLbl:{ color:C.ink, fontSize:16, fontWeight:'900' },
  rowBigVal:{ color:C.ink, fontSize:18, fontWeight:'900' },
  sep:{ height:1, backgroundColor:C.border, marginVertical:8 },

  /* info cards */
  card:{ backgroundColor:C.card, borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:16, marginHorizontal:16, marginTop:12 },
  h2:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:8 },
  p:{ color:C.text, lineHeight:20 },
  link:{ color:C.primary, marginTop:8, fontWeight:'900' },

  /* address */
  addr:{ flexDirection:'row', alignItems:'center', gap:8, backgroundColor:'#fff', borderWidth:1, borderColor:'#EEF2F7', padding:14, marginHorizontal:16, marginTop:12, borderRadius:12 },
  addrTxt:{ flex:1, color:C.text },

  /* sticky cta */
  cta:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', borderTopWidth:1, borderColor:'#E5E7EB',
    flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:12 },
  ctaMeta:{ color:C.muted, fontSize:12 },
  ctaBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.primary, paddingHorizontal:16, paddingVertical:12, borderRadius:14 },
  ctaTxt:{ color:'#fff', fontWeight:'900', marginLeft:8 },

  /* bottom sheets */
  bsOverlay:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)' },
  bs:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', borderTopLeftRadius:20, borderTopRightRadius:20,
    paddingBottom:(Platform.OS==='ios'?24:16) },
  bsLarge:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', borderTopLeftRadius:20, borderTopRightRadius:20,
    height:'75%', paddingBottom:(Platform.OS==='ios'?24:16) },
  bsGrab:{ width:46, height:5, backgroundColor:'#E5E7EB', alignSelf:'center', borderRadius:999, marginVertical:10 },
  bsHeader:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, marginBottom:4 },
  bsTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  bsClose:{ width:34, height:34, borderRadius:12, backgroundColor:'#F5F7FA', alignItems:'center', justifyContent:'center' },
  bsSub:{ color:C.muted, paddingHorizontal:16 },

  bsBtn:{ marginHorizontal:16, marginTop:10, backgroundColor:C.primary, borderRadius:14, alignItems:'center', paddingVertical:12 },
  bsBtnTxt:{ color:'#fff', fontWeight:'900' },

  /* calendar grid */
  dowRow:{ flexDirection:'row', justifyContent:'space-between', marginTop:8 },
  dowTxt:{ width:(100/7)+'%', textAlign:'center', color:C.muted, fontWeight:'800' },
  weekRow:{ flexDirection:'row', justifyContent:'flex-start', marginTop:8 },
day:{ aspectRatio:1, borderRadius:12, backgroundColor:'#F8FAFC',
      borderWidth:1, borderColor:'#E2E8F0', alignItems:'center', justifyContent:'center' },
        dayOn:{ backgroundColor:'#FFE8E8', borderColor:'#FECACA' },
  dayTxt:{ color:C.ink, fontWeight:'800' },
  dayTxtOn:{ color:C.primary },
dayEmpty:{ aspectRatio:1 },

  /* restaurants */
  rest:{ flexDirection:'row', borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', borderRadius:14, padding:10, marginBottom:10, marginHorizontal:16 },
  restImg:{ width:62, height:62, borderRadius:12 },
  restName:{ color:C.text, fontWeight:'900' },
  restAddr:{ color:C.muted, fontSize:12 },
  restFssai:{ color:C.muted, fontSize:12, marginTop:2 },
  badge:{ flexDirection:'row', alignItems:'center', borderRadius:999, paddingHorizontal:8, paddingVertical:4, borderWidth:1 },
  badgeOk:{ backgroundColor:C.ok, borderColor:C.ok },
  badgeWarn:{ backgroundColor:'#FFE8E8', borderColor:'#FECACA' },
  badgeTxt:{ marginLeft:6, fontSize:11, color:'#111827', fontWeight:'900' },
/* tips */
  tip:{ backgroundColor:'#fff', borderWidth:1, borderColor:'#E5E7EB', paddingHorizontal:14, paddingVertical:10, borderRadius:12, marginRight:8, flexDirection:'row', alignItems:'center' },
  tipOn:{ backgroundColor:'#F4EBFF', borderColor:'#E9D5FF' },
  tipTxt:{ color:C.ink, fontWeight:'800' }, tipTxtOn:{ color:'#6D28D9' },
  tipBadge:{ marginLeft:8, backgroundColor:'#D1FAE5', color:'#065F46', fontSize:10, paddingHorizontal:8, paddingVertical:2, borderRadius:8, overflow:'hidden', fontWeight:'800' },
  /* success modal */
  doneWrap:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'center', alignItems:'center' },
  doneCard:{ width:'84%', backgroundColor:'#fff', borderRadius:18, padding:18, alignItems:'center' },
  doneIcon:{ width:58, height:58, borderRadius:16, backgroundColor:C.ok, alignItems:'center', justifyContent:'center', marginBottom:10 },
  doneTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  doneDesc:{ color:C.text, textAlign:'center', marginTop:6, lineHeight:20 },
  doneBtn:{ backgroundColor:C.primary, paddingHorizontal:16, paddingVertical:10, borderRadius:12, marginTop:12 },
  doneBtnTxt:{ color:'#fff', fontWeight:'900' },
});
