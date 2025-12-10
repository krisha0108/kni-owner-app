// screens/HomePremium.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, TouchableOpacity,
  ScrollView, FlatList, Animated, Easing, RefreshControl, Linking,
  useWindowDimensions,Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import KniBottomNav from '../components/KniBottomNav';
import { Dimensions } from 'react-native';
import axios from 'axios';

import { api,IMAGE_BASE_URL } from '../api/client';
const ION_GLYPHS = (Icon.getRawGlyphMap?.() ?? {});
const hasIonicon = (name) => !!name && Object.prototype.hasOwnProperty.call(ION_GLYPHS, name);
const TONE_ICON = {
  ok:     'shield-checkmark-outline',
  info:   'information-circle-outline',
  warn:   'alert-circle-outline',
  danger: 'alert-outline',
};

/* ---------------- THEME ---------------- */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280',
  bg:'#F5F7FA', card:'#FFFFFF', border:'#E5E7EB', ok:'#10B981', info:'#3B82F6'
};
const R = 20;




/* ---------------- HELPERS ---------------- */
const open = async (url)=>{ try{ await Linking.openURL(url);}catch{} };

/* ======================================================================= */
export default function HomePremium({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  /* skeleton + refresh */
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const showSkel = loading || refreshing;
  // const API_URL = "http://192.168.29.88:8000/api/sponsored";
  // const res = await api.get('/sponsored');
const [sponsoredData, setSponsoredData] = useState([]);

// Fetch sponsored data
const fetchSponsored = useCallback(async () => {
  try {
    const url = '/app_api/sponsored';
    const res = await api.get(url);
    console.log('[Sponsored] Response:', res.data);
    setSponsoredData(Array.isArray(res.data) ? res.data : []);
  } catch (error) {
    console.error(
      "Error fetching sponsored data:",
      error.response?.data || error.message
    );
  }
}, []);

const [banners, setBanners] = useState([]);
const [heroIdx, setHeroIdx] = useState(0);
const [guides, setGuides] = useState([]);
const [feed, setFeed] = useState([]);

const fetchFeed = useCallback(async () => {
  try {
    const { data } = await api.get('/app_api/feeds', { params: { per_page: 10 } });
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    setFeed(list.map((f) => {
      const tone = String(f.tone || 'info').toLowerCase();
      const safeTone = ['ok','info','warn','danger'].includes(tone) ? tone : 'info';
      const iconFromApi = (f.icon || '').trim();
      const icon = hasIonicon(iconFromApi) ? iconFromApi : TONE_ICON[safeTone];
      return { id: String(f.id), txt: f.txt, tone: safeTone, icon };
    }));
  } catch (e) {
    console.error('Feed error', e);
  }
}, []);

const fetchGuides = useCallback(async () => {
  try {
    const { data } = await api.get('/app_api/guides', { params: { per_page: 10 } });
    const list = Array.isArray(data?.data) ? data.data : (Array.isArray(data) ? data : []);
    setGuides(list.map(g => ({
      id: String(g.id),
      thumb: g.thumb_url,
      title: g.title,
      min: Number(g.minutes),
      link: g.link,
    })));
  } catch (e) {
    console.error('Guides error', e);
  }
}, []);

const fetchBanners = useCallback(async () => {
  try {
    const { data } = await api.get('/app_api/banners', {
      params: { per_page: 10, status: 'published' }
    });
    const list = Array.isArray(data) ? data : (Array.isArray(data?.data) ? data.data : []);
    const published = list
      .filter(b => (b.status || '').toLowerCase() === 'published')
      .sort((a, b) => (Number(a.sort_order) || 9999) - (Number(b.sort_order) || 9999));
    setBanners(published);
    setHeroIdx(0);
  } catch (e) {
    console.error('Banner load error', e);
  }
}, []);

// Load ALL data in PARALLEL on mount
useEffect(() => {
  const loadAll = async () => {
    setLoading(true);
    await Promise.all([
      fetchBanners(),
      fetchFeed(),
      fetchSponsored(),
      fetchGuides(),
    ]);
    setLoading(false);
  };
  loadAll();
}, [fetchBanners, fetchFeed, fetchSponsored, fetchGuides]);

const pulse = useRef(new Animated.Value(0.5)).current;
useEffect(() => {
  const loop = Animated.loop(Animated.sequence([
    Animated.timing(pulse, { toValue: 1, duration: 850, useNativeDriver: false }),
    Animated.timing(pulse, { toValue: 0.5, duration: 850, useNativeDriver: false }),
  ]));
  loop.start();
  return () => loop.stop();
}, []);
const onRefresh = useCallback(() => {
    setRefreshing(true);
    (async () => {
      await Promise.all([
        fetchBanners(),
        fetchFeed(),
        fetchSponsored(),
        fetchGuides(),
      ]);
      setTimeout(() => setRefreshing(false), 300);
    })();
  }, [fetchBanners, fetchFeed, fetchSponsored, fetchGuides]);


  /* hero “story” */
  const bar = useRef(new Animated.Value(0)).current;
  const DURATION = 10000;

  const cycle = useCallback(() => {
  if (!banners.length) return;                       // guard
  bar.setValue(0);
  Animated.timing(bar, {
    toValue: 1,
    duration: DURATION,
    easing: Easing.linear,
    useNativeDriver: false,
  }).start(({ finished }) => {
    if (!finished) return;
    setHeroIdx(i => (i + 1) % banners.length);       // use banners length
  });
}, [banners.length, bar]);

const SponsoredSection = () => {
  return (
    <View>
      <View style={{ paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold' , color: '#000' }}>Sponsored</Text>
      </View>
      <FlatList
        horizontal
        data={sponsoredData}
        keyExtractor={(item) => item.id.toString()}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 2 }}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => Linking.openURL(item.link)}
            activeOpacity={0.9}
            style={{
              width: Math.min(320, width * 0.8),
              marginRight: 10,
              borderRadius: 10,
              overflow: 'hidden',
              backgroundColor: '#fff',
              elevation: 2,
            }}
          >
            <Image
              source={{ uri: `${IMAGE_BASE_URL}/${item.image}` }}
              style={{ width: '100%', height: 150 }}
              resizeMode="cover"
            />
            <View style={{ padding: 8 }}>
              <Text style={{color:"#666", fontWeight: 'bold', fontSize: 16 }} numberOfLines={1}>
                {item.title}
              </Text>
              <Text style={{ color: '#666', fontSize: 14 }} numberOfLines={1}>
                {item.description}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </View>
  );
};
  // start/stop progress only when not showing skeleton
useEffect(() => {
  bar.stopAnimation();
  if (!showSkel && banners.length) cycle();          // only when data exists
  return () => bar.stopAnimation();
}, [heroIdx, showSkel, cycle, banners.length, bar]);

  /* quick navs */
  const goSupport     = ()=> navigation.navigate?.('SupportCenter');
  const goRestaurants = ()=> navigation.navigate?.('Restaurants');
  const goGuide       = ()=> open(guides?.[0]?.link);

  /* ----------- RENDER ----------- */
  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      {/* Top bar */}
      <View style={[st.top, { paddingTop:6 }]}>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <Image source={require('../assets/images/logo.png')} resizeMode='contain' style={{width:130, height:40, borderRadius:8, marginRight:8}}/>
        </View>
        <View style={{flexDirection:'row', alignItems:'center'}}>
          <TouchableOpacity onPress={()=>navigation.navigate?.('Notifications')} style={st.hBtn}>
            <Icon name="notifications-outline" size={18} color={C.ink}/>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>navigation.navigate?.('RequestNow')} style={st.hBtn}>
            <Icon name="cart-outline" size={18} color={C.ink}/>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {showSkel ? (
          <SkeletonHome width={width} pulse={pulse} />
        ) : (
          <>
            {/* HERO */}
          <View style={{paddingHorizontal:16}}>
  {banners.length ? (
    <ImageBackground
      source={{ uri: banners[heroIdx]?.image_url }}
      style={[st.hero,{height: 220}]}
      imageStyle={{borderRadius:R}}
    >
      <View style={[StyleSheet.absoluteFill,{backgroundColor:'rgba(0,0,0,0.28)',borderRadius:R}]}/>
      {/* Badge (server: banner.badge) */}
      {banners[heroIdx]?.badge ? (
        <View style={st.heroBadge}>
          <Text style={st.heroBadgeTxt}>{banners[heroIdx].badge}</Text>
        </View>
      ) : null}
      {/* Title / subtitle / CTA */}
      <View style={st.heroText}>
        <Text style={st.heroH} numberOfLines={2}>{banners[heroIdx]?.title ?? ''}</Text>
        {!!banners[heroIdx]?.subtitle && (
          <Text style={st.heroP} numberOfLines={2}>{banners[heroIdx].subtitle}</Text>
        )}
        {!!banners[heroIdx]?.cta_text && !!banners[heroIdx]?.cta_link && (
          <TouchableOpacity onPress={()=>open(banners[heroIdx].cta_link)} style={st.heroBtn}>
            <Text style={st.heroBtnTxt}>{banners[heroIdx].cta_text}</Text>
            <Icon name="arrow-forward" size={14} color="#fff"/>
          </TouchableOpacity>
        )}
      </View>
      {/* progress near bottom */}
      <View style={st.heroProgWrap}>
        <Animated.View style={[
          st.heroProgBar,
          { width: bar.interpolate({inputRange:[0,1], outputRange:['0%','100%']}) }
        ]}/>
      </View>
    </ImageBackground>
  ) : (
    // Fallback if no banners returned: render a minimal placeholder
    <View style={[st.hero,{height:220, backgroundColor:'#E9EEF5', alignItems:'center', justifyContent:'center'}]}>
      <Text style={{color:C.muted,fontWeight:'700'}}>No banners yet</Text>
    </View>
  )}
</View>

            {/* Quick navigation */}
            <View style={st.quickRow}>
              <QuickNav icon="headset-outline" label="Support" onPress={goSupport}/>
              <QuickNav icon="storefront-outline" label="Restaurants" onPress={goRestaurants}/>
              <QuickNav icon="play-circle-outline" label="Guide" onPress={goGuide}/>
            </View>

            {/* Notifications / highlights */}
            <View style={{paddingHorizontal:16, marginTop:20}}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {feed.map(f=>(
  <View
    key={f.id}
    style={[
      st.pill,
      f.tone==='ok'     ? { backgroundColor:'#ECFDF5', borderColor:'#D1FAE5' } :
      f.tone==='warn'   ? { backgroundColor:'#FFFBEB', borderColor:'#FDE68A' } :
      f.tone==='danger' ? { backgroundColor:'#FEF2F2', borderColor:'#FECACA' } :
                          { backgroundColor:'#EFF6FF', borderColor:'#BFDBFE' } // info
    ]}
  >
    <Icon
      name={f.icon}
      size={14}
      color={
        f.tone==='ok'     ? C.ok :
        f.tone==='warn'   ? '#F59E0B' :
        f.tone==='danger' ? '#EF4444' :
                            C.info
      }
    />
    <Text style={st.pillTxt}>{f.txt}</Text>
  </View>
))}

              </ScrollView>
            </View>
<View style={{ marginTop: 20 }}>
  <SponsoredSection />
</View>

            {/* Guides */}
            <View style={st.sectionHdr}>
              <Text style={st.sectionTitle}>Quick guides</Text>
              <TouchableOpacity onPress={goGuide}><Text style={st.link}>View all</Text></TouchableOpacity>
            </View>
            <FlatList
              horizontal
              data={guides}
              showsHorizontalScrollIndicator={false}
              keyExtractor={(i)=>i.id}
              contentContainerStyle={{ paddingHorizontal:16 }}
              renderItem={({item})=>(
              <TouchableOpacity onPress={()=>open(item.link)} style={[st.guideCard,{ width: Math.min(280, width*0.72) }]}>
      <ImageBackground source={{uri:item.thumb}} style={st.guideImg} imageStyle={{borderTopLeftRadius:R,borderTopRightRadius:R}}>
        <View style={st.play}><Icon name="play" size={14} color="#fff"/></View>
      </ImageBackground>
      <View style={{padding:12}}>
        <Text style={st.guideTitle} numberOfLines={2}>{item.title}</Text>
        <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
          <Icon name="time-outline" size={14} color={C.muted}/>
          <Text style={st.guideMeta}>  {item.min} min</Text>
        </View>
      </View>
    </TouchableOpacity>
              )}
            />

            {/* Announcements */}
            <View style={st.sectionHdr}>
              <Text style={st.sectionTitle}>From KNI</Text>
            </View>
            <View style={{paddingHorizontal:16}}>
              <Announcement
                icon="rocket-outline"
                title="Faster approvals"
                text="Keep your restaurant profile complete to unlock same-day service."
              />
              <Announcement
                icon="sparkles-outline"
                title="New: Inventory Timeline"
                text="Track spend & parts history across all equipment."
              />
            </View>
          </>
        )}
      </ScrollView>

      <KniBottomNav navigation={navigation} active="home" cartCount={3} notifCount={2} />
    </SafeAreaView>
  );
}

/* ---------------- SKELETON (STRUCTURE-MATCHED) ---------------- */
function SkeletonHome({ width, pulse }) {
  return (
    <>
      {/* HERO */}
      <View style={{paddingHorizontal:16}}>
        <Animated.View style={[stSK.hero, { opacity:pulse }]}>
          <View style={stSK.heroBadge}/>
          <View style={stSK.heroText}>
            <View style={[stSK.lineLg,{width:'60%'}]}/>
            <View style={[stSK.lineSm,{width:'45%', marginTop:6}]}/>
            <View style={stSK.btnPrimary}/>
          </View>
          <View style={stSK.heroProg}/>
        </Animated.View>
      </View>

      {/* Quick nav (3 tiles) */}
      <View style={st.quickRow}>
        {[0,1,2].map(i=>(
          <View key={i} style={st.qItem}>
            <Animated.View style={[stSK.qIcon, { opacity:pulse }]} />
            <Animated.View style={[stSK.lineXs, { opacity:pulse, width:60, marginTop:6 }]} />
          </View>
        ))}
      </View>

      {/* Feed pills row */}
      <View style={{paddingHorizontal:16, marginTop:20}}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {[0,1,2].map(i=>(
            <Animated.View key={i} style={[stSK.pill, { opacity:pulse }]} />
          ))}
        </ScrollView>
      </View>

      {/* Sponsored header */}
      <View style={st.sectionHdr}>
        <Animated.View style={[stSK.h2, { opacity:pulse, width:140 }]} />
      </View>
      {/* Sponsored cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16, paddingBottom:2 }}>
        {[0,1].map(i=>(
          <View key={i} style={[st.adCard,{ width: Math.min(320, width*0.8) }]}>
            <Animated.View style={[stSK.adImg, { opacity:pulse }]} />
            <View style={st.adBottom}>
              <View style={stSK.adTag}/>
              <Animated.View style={[stSK.lineMd, { opacity:pulse, width:'50%', marginTop:6 }]} />
              <Animated.View style={[stSK.lineSm, { opacity:pulse, width:'70%', marginTop:6 }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Guides header */}
      <View style={st.sectionHdr}>
        <Animated.View style={[stSK.h2, { opacity:pulse, width:160 }]} />
        <Animated.View style={[stSK.linkSm, { opacity:pulse }]} />
      </View>
      {/* Guide cards */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal:16 }}>
        {[0,1,2].map(i=>(
          <View key={i} style={[st.guideCard,{ width: Math.min(280, width*0.72) }]}>
            <Animated.View style={[stSK.guideImg, { opacity:pulse }]} />
            <View style={{padding:12}}>
              <Animated.View style={[stSK.lineMd, { opacity:pulse, width:'80%' }]} />
              <Animated.View style={[stSK.lineXs, { opacity:pulse, width:70, marginTop:8 }]} />
            </View>
          </View>
        ))}
      </ScrollView>

      {/* From KNI header */}
      <View style={st.sectionHdr}>
        <Animated.View style={[stSK.h2, { opacity:pulse, width:120 }]} />
      </View>
      {/* Announcement cards */}
      <View style={{paddingHorizontal:16}}>
        {[0,1].map(i=>(
          <View key={i} style={st.annCard}>
            <Animated.View style={[stSK.annIcon, { opacity:pulse }]} />
            <View style={{flex:1}}>
              <Animated.View style={[stSK.lineMd, { opacity:pulse, width:'60%' }]} />
              <Animated.View style={[stSK.lineSm, { opacity:pulse, width:'80%', marginTop:6 }]} />
            </View>
          </View>
        ))}
      </View>
    </>
  );
}

/* ---------------- SUB-COMPONENTS ---------------- */
const QuickNav = ({ icon, label, onPress }) => (
  <TouchableOpacity onPress={onPress} style={st.qItem} activeOpacity={0.9}>
    <View style={st.qIcon}><Icon name={icon} size={18} color={C.primary}/></View>
    <Text style={st.qTxt}>{label}</Text>
  </TouchableOpacity>
);

const Announcement = ({ icon, title, text }) => (
  <View style={st.annCard}>
    <View style={st.annIcon}><Icon name={icon} size={16} color={C.primary}/></View>
    <View style={{flex:1}}>
      <Text style={st.annTitle}>{title}</Text>
      <Text style={st.annText}>{text}</Text>
    </View>
  </View>
);

/* ---------------- STYLES ---------------- */
const st = StyleSheet.create({
  top:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingBottom:10 },
  title:{ color:C.ink, fontWeight:'900', fontSize:22 },
  hBtn:{ width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff', alignItems:'center', justifyContent:'center' },

  // hero
  hero:{ borderRadius:R, overflow:'hidden', marginTop:6 },
  heroBadge:{ position:'absolute', left:12, top:12, backgroundColor:'#FFFFFFE6', paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  heroBadgeTxt:{ color:C.ink, fontWeight:'900', fontSize:12 },
  heroText:{ position:'absolute', left:12, right:12, bottom:40 },
  heroH:{ color:'#fff', fontWeight:'900', fontSize:20 },
  heroP:{ color:'#E5E7EB', marginTop:2 },
  heroBtn:{ marginTop:10, alignSelf:'flex-start', backgroundColor:C.primary, borderRadius:12, paddingHorizontal:12, paddingVertical:8, flexDirection:'row', alignItems:'center', gap:8 },
  heroBtnTxt:{ color:'#fff', fontWeight:'900' },
  heroProgWrap:{ position:'absolute', left:12, right:12, bottom:10, height:3, backgroundColor:'#FFFFFF55', borderRadius:2, overflow:'hidden' },
  heroProgBar:{ height:3, backgroundColor:'#fff' },

  // quick nav
  quickRow:{ flexDirection:'row', justifyContent:'space-between', paddingHorizontal:16, marginTop:20, gap:10 },
  qItem:{ flex:1, backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#EEF2F7', padding:12, alignItems:'center' },
  qIcon:{ width:36, height:36, borderRadius:12, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center', marginBottom:8 },
  qTxt:{ color:C.ink, fontWeight:'900' },

  // pills
  pill:{ flexDirection:'row', alignItems:'center', gap:6, paddingHorizontal:12, paddingVertical:8, borderRadius:999, borderWidth:1, marginRight:8 },
  pillTxt:{ color:C.ink, fontWeight:'700' },

  // sections
  sectionHdr:{ paddingHorizontal:16, marginTop:14, marginBottom:14, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  sectionTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
  link:{ color:C.primary, fontWeight:'900' },

  // ads
  adCard:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', marginRight:12, overflow:'hidden' },
  adImg:{ width:'100%', height:120 },
  adBottom:{ padding:12, position:'relative' },
  adTag:{ position:'absolute', right:10, top:-18, backgroundColor:'#111827', paddingHorizontal:8, paddingVertical:4, borderRadius:8 },
  adTagTxt:{ color:'#fff', fontSize:10, fontWeight:'800' },
  adBrand:{ color:C.ink, fontWeight:'900', fontSize:16, marginTop:2 },
  adLine:{ color:C.muted, marginTop:2 },

  // guides
  guideCard:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', marginRight:12, overflow:'hidden' },
  guideImg:{ width:'100%', height:130, alignItems:'center', justifyContent:'center' },
  play:{ width:34, height:34, borderRadius:17, backgroundColor:'rgba(0,0,0,0.55)', alignItems:'center', justifyContent:'center' },
  guideTitle:{ color:C.text, fontWeight:'900' },
  guideMeta:{ color:C.muted, fontWeight:'700' },

  // announcements
  annCard:{ backgroundColor:'#fff', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:12, flexDirection:'row', alignItems:'center', gap:10, marginTop:10 },
  annIcon:{ width:32, height:32, borderRadius:10, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center' },
  annTitle:{ color:C.ink, fontWeight:'900' },
  annText:{ color:C.muted, marginTop:2 },
});

/* ------------ SKELETON STYLES (structure-matched) ------------ */
const stSK = StyleSheet.create({
  hero:{ height:220, backgroundColor:'#E9EEF5', borderRadius:R, marginTop:6, overflow:'hidden' },
  heroBadge:{ position:'absolute', left:12, top:12, width:70, height:28, borderRadius:999, backgroundColor:'#FFFFFFE6' },
  heroText:{ position:'absolute', left:12, right:12, bottom:40 },
  heroProg:{ position:'absolute', left:12, right:12, bottom:10, height:3, backgroundColor:'#FFFFFF55', borderRadius:2 },
  btnPrimary:{ marginTop:10, width:110, height:36, borderRadius:12, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },

  qIcon:{ width:36, height:36, borderRadius:12, backgroundColor:'#F1F5F9' },

  pill:{ width:180, height:36, borderRadius:999, backgroundColor:'#EFF6FF', borderWidth:1, borderColor:'#BFDBFE', marginRight:8 },

  h2:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
  linkSm:{ width:70, height:16, borderRadius:6, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0' },

  adImg:{ width:'100%', height:120, backgroundColor:'#E9EEF5' },
  adTag:{ position:'absolute', right:10, top:-18, width:28, height:18, borderRadius:6, backgroundColor:'#111827' },

  guideImg:{ width:'100%', height:130, backgroundColor:'#E9EEF5' },

  annIcon:{ width:32, height:32, borderRadius:10, backgroundColor:'#F1F5F9' },

  // lines
  lineLg:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineMd:{ height:14, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineSm:{ height:12, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineXs:{ height:10, borderRadius:8, backgroundColor:'#E9EEF5' },
});
