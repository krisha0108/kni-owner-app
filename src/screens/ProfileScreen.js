// screens/ProfileUltra.js
import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  RefreshControl, Animated, Share, Linking, Alert, Dimensions, FlatList
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import KniBottomNav from '../components/KniBottomNav';

/* ===== THEME ===== */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B'
};
const R = 20;
const { width: W } = Dimensions.get('window');

/* ===== DEMO DATA ===== */
const user = {
  name: 'Saurav',
  email: 'saurav@kni.com',
  phone: '+91-8347122756',
  fssaiNo: '10718004001234',
  fssaiCertUrl: 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf',
  hotelsCount: 6,
  referral: 'KNI-SAURAV-94',
  requests: 142,
  rating: 4.8,
  cover: 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?q=80&w=1600&auto=format&fit=crop'
};

const hotelsPreview = [
  {
    id:'h1',
    name:'Spice Hub',
    email:'manager@spicehub.in',
    address:'SG Highway, Ahmedabad',
    rating:4.6,
    desc:'Modern Indian kitchen with 600L cold room.',
    photo:'https://dynamic-media-cdn.tripadvisor.com/media/photo-o/2b/f6/54/90/facade.jpg?w=1200&h=-1&s=1'
  },
  {
    id:'h2',
    name:'Café Verde',
    email:'hello@cafeverde.co',
    address:'Law Garden, Ahmedabad',
    rating:4.4,
    desc:'Cafe & bakery; high-traffic brunch spot.',
    photo:'https://lux-life.digital/wp-content/uploads/2019/09/turkish-hotel.jpg'
  },
];
const reviews = [
  { id:'r1', from:'Rahul S. (Tech)', stars:5, text:'Always keeps equipment logs ready. Smooth visit.' },
  { id:'r2', from:'Mehul K. (Tech)', stars:4, text:'Prompt approvals and clear instructions.' },
  { id:'r3', from:'Sana P. (Tech)', stars:5, text:'Great coordination with staff, zero delays.' },
];

/* ===== HELPERS ===== */
const Stars = ({value=0,size=12})=>(
  <View style={{flexDirection:'row'}}>
    {Array.from({length:5}).map((_,i)=>(
      <Icon key={i} name={i < Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B"/>
    ))}
  </View>
);

/* ====== SKELETON PRIMITIVES (no extra libs) ====== */
const BASE = '#E9EEF5';
const HILITE = '#F6F8FC';

function useShimmer() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1400, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  return x.interpolate({
    inputRange: [0, 1],
    outputRange: [-W, W]
  });
}

const Shimmer = ({style}) => {
  const translateX = useShimmer();
  return (
    <View style={[{backgroundColor:BASE, overflow:'hidden'}, style]}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform:[{translateX}], opacity:0.7 }
        ]}
      >
        {/* simple angled highlight bar */}
        <View style={{flex:1, transform:[{skewX:'-18deg'}]}}>
          <View style={{width:W*0.35, height:'100%', backgroundColor:HILITE, opacity:0.75}}/>
        </View>
      </Animated.View>
    </View>
  );
};

const SkelCircle = ({size=64, style}) => (
  <Shimmer style={[{width:size, height:size, borderRadius:size/2}, style]} />
);
const SkelBox = ({w='100%', h=16, r=12, style}) => (
  <Shimmer style={[{width:w, height:h, borderRadius:r}, style]} />
);

/* ===== SCREEN ===== */
export default function ProfileScreen(navigation) {
  const insets = useSafeAreaInsets();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(()=>{
    const t = setTimeout(()=>setLoading(false), 1200);
    return ()=> clearTimeout(t);
  },[]);

  const onRefresh=()=>{
    setRefreshing(true); setLoading(true);
    setTimeout(()=>{ setRefreshing(false); setLoading(false); }, 900);
  };

  const viewPDF = async ()=>{
    try {
      const ok = await Linking.canOpenURL(user.fssaiCertUrl);
      if(ok) Linking.openURL(user.fssaiCertUrl);
      else Alert.alert('Unable to open', 'Install a PDF viewer to open the certificate.');
    } catch {}
  };
  const shareReferral = async ()=>{ try { await Share.share({ message:`Use my KNI referral • ${user.referral}` }); } catch {} };

  const initial = user.name?.[0]?.toUpperCase() ?? 'U';
  const CARD_W = W * 0.88;
  const GAP = 14;
  const hotelsData = [...hotelsPreview, { id:'more', type:'more' }];

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* 0) HERO */}
        {loading ? (
          <View style={[st.hero, { height:220, overflow:'hidden' }]}>
            <Shimmer style={StyleSheet.absoluteFillObject}/>
            <View style={st.blobA}/>
            <View style={st.blobB}/>
          </View>
        ) : (
          <View style={[st.hero, { height: 220 }]}>
            <Image source={{ uri: user.cover }} style={StyleSheet.absoluteFillObject} resizeMode="cover" />
            <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
            <View style={st.blobA}/>
            <View style={st.blobB}/>
            <View style={{position:'absolute', left:16, bottom:16, right:16}}>
              <Text style={{color:'#fff', fontWeight:'900', fontSize:20}}>Welcome back</Text>
              <Text style={{color:'#FFFFFFDD', marginTop:4}}>Keep your kitchen running like a pro 🔧</Text>
            </View>
          </View>
        )}

        {/* 1) STICKY: PROFILE + STATS */}
        <View style={st.stickyWrap}>
          {loading ? (
            <View style={{padding:16}}>
              <View style={{flexDirection:'row', alignItems:'center'}}>
                <View style={{alignItems:'center'}}>
                  <SkelCircle size={72}/>
                  <SkelBox w={84} h={22} r={999} style={{marginTop:8}}/>
                </View>
                <View style={{flex:1, marginLeft:12}}>
                  <SkelBox w={'60%'} h={22}/>
                  <SkelBox w={'70%'} h={14} style={{marginTop:10}}/>
                  <SkelBox w={'50%'} h={14} style={{marginTop:8}}/>
                </View>
              </View>
              {/* stats row */}
              <View style={[st.statsGlass, { marginTop:14 }]}>
                <View style={st.statCell}>
                  <SkelCircle size={30}/>
                  <SkelBox w={40} h={14} style={{marginTop:8}}/>
                  <SkelBox w={48} h={10} style={{marginTop:6}}/>
                </View>
                <View style={st.vline}/>
                <View style={st.statCell}>
                  <SkelCircle size={30}/>
                  <SkelBox w={40} h={14} style={{marginTop:8}}/>
                  <SkelBox w={58} h={10} style={{marginTop:6}}/>
                </View>
                <View style={st.vline}/>
                <View style={st.statCell}>
                  <SkelCircle size={30}/>
                  <SkelBox w={40} h={14} style={{marginTop:8}}/>
                  <SkelBox w={68} h={10} style={{marginTop:6}}/>
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={st.heroBottomWrap}>
                <View style={st.avatarWrap}>
                  <View style={st.avatar}><Text style={st.avatarTxt}>{initial}</Text></View>
                  <View style={st.verifyPill}><Icon name="shield-checkmark" size={14} color="#fff"/><Text style={st.verifyTxt}>KNI Verified</Text></View>
                </View>
                <View style={{flex:1, marginLeft:12}}>
                  <Text style={st.name}>{user.name}</Text>
                  <Text style={st.meta}>{user.email}</Text>
                  <Text style={st.meta}>{user.phone}</Text>
                </View>
              </View>

              <View style={[st.statsGlass, { marginTop:10, marginBottom:8 }]}>
                <View style={st.statCell}>
                  <View style={st.statIcon}><Icon name="business-outline" size={16} color={C.primary}/></View>
                  <Text style={st.statNum}>{user.hotelsCount}</Text>
                  <Text style={st.statLbl}>Hotels</Text>
                </View>
                <View style={st.vline}/>
                <View style={st.statCell}>
                  <View style={st.statIcon}><Icon name="clipboard-outline" size={16} color={C.primary}/></View>
                  <Text style={st.statNum}>{user.requests}</Text>
                  <Text style={st.statLbl}>Requests</Text>
                </View>
                <View style={st.vline}/>
                <View style={st.statCell}>
                  <View style={st.statIcon}><Icon name="star" size={16} color="#F59E0B"/></View>
                  <Text style={st.statNum}>{user.rating.toFixed(1)}</Text>
                  <Text style={st.statLbl}>Avg rating</Text>
                </View>
              </View>
            </>
          )}
        </View>

        {/* 2) REST: FSSAI, Hotels, Reviews */}
        {/* FSSAI CARD */}
        {loading ? (
          <View style={st.cardGlass}>
            <SkelBox w={90} h={18}/>
            <View style={{marginTop:12}}>
              <View style={[st.row,{paddingVertical:6}]}>
                <View style={st.rowLeft}><SkelCircle size={22}/><SkelBox w={80} h={14} style={{marginLeft:8}}/></View>
                <SkelBox w={160} h={16}/>
              </View>
              <View style={[st.row,{paddingVertical:6}]}>
                <View style={st.rowLeft}><SkelCircle size={22}/><SkelBox w={90} h={14} style={{marginLeft:8}}/></View>
                <SkelBox w={84} h={32} r={12}/>
              </View>
            </View>
            <View style={st.sep}/>
            <View style={{flexDirection:'row', alignItems:'center', marginTop:10}}>
              <SkelBox w={130} h={36} r={999}/>
              <SkelBox w={88} h={36} r={12} style={{marginLeft:10}}/>
            </View>
          </View>
        ) : (
          <View style={st.cardGlass}>
            <Text style={st.h2}>FSSAI</Text>
            <View style={st.row}>
              <View style={st.rowLeft}><Icon name="document-text-outline" size={18} color={C.ink}/><Text style={st.rowLbl}>Number</Text></View>
              <Text style={st.rowVal}>{user.fssaiNo}</Text>
            </View>
            <View style={st.row}>
              <View style={st.rowLeft}><Icon name="link-outline" size={18} color={C.ink}/><Text style={st.rowLbl}>Certificate</Text></View>
              <TouchableOpacity onPress={viewPDF} style={st.viewBtn}>
                <Icon name="document-outline" size={14} color="#fff"/><Text style={st.viewTxt}>View PDF</Text>
              </TouchableOpacity>
            </View>
            <View style={st.sep}/>
            <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
              <View style={st.refChip}>
                <Icon name="gift-outline" size={16} color={C.primary}/>
                <Text style={st.refTxt}>{user.referral}</Text>
              </View>
              <TouchableOpacity onPress={shareReferral} style={st.shareBtn}>
                <Icon name="share-social-outline" size={16} color="#fff"/><Text style={st.shareTxt}>Share</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* HOTELS */}
        <View style={st.sectionHdr}>
          <Text style={st.sectionTitle}>Your hotels</Text>
          {!loading && (
            <TouchableOpacity onPress={()=>Alert.alert('Add Hotel')}>
              <Text style={st.link}>Add new</Text>
            </TouchableOpacity>
          )}
          {loading && <SkelBox w={80} h={16}/>}
        </View>

        {loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:16, gap:GAP, marginBottom:16 }}
          >
            {Array.from({length:3}).map((_,i)=>(
              <View key={i} style={[st.hotelHeroCard, { width: W*0.88 }]}>
                <Shimmer style={StyleSheet.absoluteFillObject}/>
                <View style={[st.hotelHeroBody,{backgroundColor:'#FFFFFFE6'}]}>
                  <SkelBox w={'60%'} h={16}/>
                  <SkelBox w={'50%'} h={12} style={{marginTop:8}}/>
                  <SkelBox w={70} h={12} style={{marginTop:10}}/>
                </View>
              </View>
            ))}
          </ScrollView>
        ) : (
          <FlatList
            data={hotelsData}
            keyExtractor={(i)=>i.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={CARD_W + GAP}
            decelerationRate="fast"
            contentContainerStyle={{ paddingHorizontal:16,marginBottom:16 }}
            ItemSeparatorComponent={()=><View style={{width:GAP}}/>}
            renderItem={({item:h})=>{
              if (h.type === 'more') {
                return (
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={()=>Alert.alert('View more', 'Open hotels list')}
                    style={[st.hotelHeroCard, { width: CARD_W, alignItems:'center', justifyContent:'center', backgroundColor:'#FFF' }]}
                  >
                    <View style={st.viewMoreBox}>
                      <Icon name="chevron-forward-circle-outline" size={36} color={C.ink}/>
                      <Text style={st.viewMoreTxt}>View more</Text>
                    </View>
                  </TouchableOpacity>
                );
              }
              return (
                <View style={[st.hotelHeroCard, { width: CARD_W }]}>
                  {h.photo
                    ? <Image source={{uri:h.photo}} style={st.hotelHeroImg}/>
                    : <View style={[st.hotelHeroImg,{backgroundColor:'#E5E7EB',alignItems:'center',justifyContent:'center'}]}>
                        <Icon name="image-outline" size={28} color="#9CA3AF"/>
                      </View>
                  }
                  <View style={st.heroOverlay} />
                  {/* <View style={st.cardActionBar}>
                    <TouchableOpacity onPress={()=>Alert.alert('Edit', h.name)} style={st.cardIconBtn}>
                      <Icon name="create-outline" size={16} color="#111827"/>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={()=>Alert.alert('Delete', h.name)} style={st.cardIconBtn}>
                      <Icon name="trash-outline" size={16} color="#111827"/>
                    </TouchableOpacity>
                  </View> */}
                  <View style={st.hotelHeroBody}>
                    <Text style={st.hotelHeroName} numberOfLines={1}>{h.name}</Text>
                    <Text style={st.hotelHeroAddr} numberOfLines={1}>{h.address}</Text>
                    <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
                      <Stars value={h.rating} size={12}/>
                      <Text style={st.hotelRateTxt}>  {h.rating}</Text>
                    </View>
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* REVIEWS */}
        <View style={[st.sectionHdr,{marginTop:16}]}>
          <Text style={st.sectionTitle}>What pros say</Text>
        </View>
        {loading ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:16, gap:10, marginBottom:16, paddingTop:6 }}
          >
            {Array.from({length:3}).map((_,i)=>(
              <View key={i} style={st.revPill}>
                <SkelBox w={'60%'} h={14}/>
                <SkelBox w={'90%'} h={12} style={{marginTop:8}}/>
                <SkelBox w={'70%'} h={12} style={{marginTop:6}}/>
                <SkelBox w={80} h={12} style={{marginTop:10}}/>
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal:16, gap:10,marginBottom:16, paddingTop:6 }}
          >
            {reviews.map(r=>(
              <View key={r.id} style={st.revPill}>
                <Text style={st.revFromMini} numberOfLines={1}>{r.from}</Text>
                <Text style={st.revTxtMini} numberOfLines={3}>{r.text}</Text>
                <View style={{marginTop:6}}><Stars value={r.stars} size={12}/></View>
              </View>
            ))}
          </ScrollView>
        )}
      </ScrollView>

      <KniBottomNav
        navigation={navigation}
        active="profile"
        cartCount={3}
        notifCount={2}
      />
    </SafeAreaView>
  );
}

/* ===== STYLES ===== */
const st = StyleSheet.create({
  // HERO
  hero:{ width:'100%', borderBottomLeftRadius:28, borderBottomRightRadius:28, overflow:'hidden', justifyContent:'flex-end' },
  blobA:{ position:'absolute', width:160, height:160, borderRadius:100, backgroundColor:'#EF3A3A33', top:-30, left:-30 },
  blobB:{ position:'absolute', width:220, height:220, borderRadius:120, backgroundColor:'#1D225422', bottom:-70, right:-50 },

  // Sticky background
  stickyWrap:{ backgroundColor:'#ffffffff', borderBottomWidth:1, borderBottomColor:'#EEF2F7' },

  // Profile strip
  heroBottomWrap:{ flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'rgba(255, 255, 255, 1)' },
  avatarWrap:{ alignItems:'center' },
  avatar:{ width:72, height:72, borderRadius:22, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center',
    borderWidth:2, borderColor:'#FFFFFFAA', shadowColor:'#000', shadowOpacity:0.2, shadowRadius:8, elevation:6 },
  avatarTxt:{ color:C.primary, fontSize:30, fontWeight:'900' },
  name:{ color:C.ink, fontWeight:'900', fontSize:22 },
  meta:{ color:C.muted, marginTop:2 },
  verifyPill:{ flexDirection:'row', alignItems:'center', backgroundColor:C.ok, paddingHorizontal:10, paddingVertical:6, borderRadius:999, marginTop:8 },
  verifyTxt:{ color:'#fff', marginLeft:6, fontWeight:'800', fontSize:12 },

  // Stats
  statsGlass:{ marginHorizontal:16, backgroundColor:'#FFFFFFCC', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7',
    flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:12,
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{ width:0, height:6 } },
  statCell:{ flex:1, alignItems:'center' },
  statIcon:{ width:30, height:30, borderRadius:10, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center', marginBottom:6 },
  statNum:{ color:C.ink, fontWeight:'900', fontSize:18 },
  statLbl:{ color:C.muted, fontSize:12 },
  vline:{ width:1, height:42, backgroundColor:'#E5E7EB' },

  // FSSAI card
  cardGlass:{ backgroundColor:'#FFFFFFCC', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:16, marginHorizontal:16, marginTop:12 },
  h2:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:8 },
  row:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6 },
  rowLeft:{ flexDirection:'row', alignItems:'center' },
  rowLbl:{ color:C.text, fontSize:14, marginLeft:8 },
  rowVal:{ color:C.ink, fontWeight:'800', fontSize:14 },
  sep:{ height:1, backgroundColor:C.border, marginTop:10 },
  viewBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.primary, borderRadius:12, paddingHorizontal:12, paddingVertical:8 },
  viewTxt:{ color:'#fff', fontWeight:'800', marginLeft:6 },
  refChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF1F1', borderWidth:1, borderColor:'#FECACA', paddingHorizontal:10, paddingVertical:8, borderRadius:999 },
  refTxt:{ marginLeft:6, color:C.primary, fontWeight:'800' },
  shareBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.ink, marginLeft:10, paddingHorizontal:12, paddingVertical:10, borderRadius:12 },
  shareTxt:{ color:'#fff', fontWeight:'900', marginLeft:6 },

  sectionHdr:{ paddingHorizontal:16, marginTop:14,marginBottom:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  sectionTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  link:{ color:C.primary, fontWeight:'900' },

  // Hotels – cards
  hotelHeroCard:{ height: 200, borderRadius:R, overflow:'hidden', borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff',
    shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, elevation:5 },
  hotelHeroImg:{ ...StyleSheet.absoluteFillObject, width:'100%', height:'100%' },
  heroOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.20)' },
  hotelHeroBody:{ position:'absolute', left:14, right:14, bottom:12, backgroundColor:'#FFFFFFEE',
    borderRadius:14, padding:12, borderWidth:1, borderColor:'#EEF2F7' },
  hotelHeroName:{ color:C.text, fontWeight:'900', fontSize:16 },
  hotelHeroAddr:{ color:C.muted, fontSize:12, marginTop:2 },
  cardActionBar:{ position:'absolute', right:10, top:10, flexDirection:'row', gap:6, backgroundColor:'#FFFFFFCC',
    borderRadius:999, padding:6, borderWidth:1, borderColor:'#EEF2F7' },
  cardIconBtn:{ width:28, height:28, borderRadius:8, backgroundColor:'#F8FAFC', alignItems:'center', justifyContent:'center',
    borderWidth:1, borderColor:'#E5E7EB' },
  hotelRateTxt:{ color:C.muted, fontSize:12 },

  // "View more"
  viewMoreBox:{ alignItems:'center', justifyContent:'center', borderWidth:2, borderStyle:'dashed', borderColor:'#CBD5E1',
    paddingVertical:26, paddingHorizontal:18, borderRadius:16, backgroundColor:'#FFFFFFF2' },
  viewMoreTxt:{ marginTop:8, fontWeight:'900', color:C.ink, fontSize:16 },

  // reviews – pills
  revPill:{ width: W*0.7, backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#EEF2F7', padding:12,
    shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  revFromMini:{ color:C.ink, fontWeight:'900', marginBottom:4 },
  revTxtMini:{ color:C.text, lineHeight:18 },
});
