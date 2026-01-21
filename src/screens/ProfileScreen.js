// // screens/ProfileUltra.js
// import React, { useEffect, useRef, useState, useMemo } from 'react';
// import {
//   View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
//   RefreshControl, Animated, Share, Linking, Alert, Dimensions, FlatList
// } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import Icon from 'react-native-vector-icons/Ionicons';
// import KniBottomNav from '../components/KniBottomNav';
// import auth from '@react-native-firebase/auth';
// import axios from 'axios';
// import { api } from '../api/client';

// import AsyncStorage from '@react-native-async-storage/async-storage';
// import { GoogleSignin } from '@react-native-google-signin/google-signin';

// /* ===== THEME ===== */
// const C = {
//   primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
//   text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B'
// };
// const R = 20;
// const { width: W } = Dimensions.get('window');



// /* ===== HELPERS ===== */
// const Stars = ({value=0,size=12})=>(
//   <View style={{flexDirection:'row'}}>
//     {Array.from({length:5}).map((_,i)=>(
//       <Icon key={i} name={i < Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B"/>
//     ))}
//   </View>
// );

// /* ====== SKELETON PRIMITIVES (no extra libs) ====== */
// const BASE = '#E9EEF5';
// const HILITE = '#F6F8FC';

// function useShimmer() {
//   const x = useRef(new Animated.Value(0)).current;
//   useEffect(() => {
//     const loop = Animated.loop(
//       Animated.timing(x, { toValue: 1, duration: 1400, useNativeDriver: true })
//     );
//     loop.start();
//     return () => loop.stop();
//   }, [x]);
//   return x.interpolate({
//     inputRange: [0, 1],
//     outputRange: [-W, W]
//   });
// }

// const Shimmer = ({style}) => {
//   const translateX = useShimmer();
//   return (
//     <View style={[{backgroundColor:BASE, overflow:'hidden'}, style]}>
//       <Animated.View
//         style={[
//           StyleSheet.absoluteFill,
//           { transform:[{translateX}], opacity:0.7 }
//         ]}
//       >
//         {/* simple angled highlight bar */}
//         <View style={{flex:1, transform:[{skewX:'-18deg'}]}}>
//           <View style={{width:W*0.35, height:'100%', backgroundColor:HILITE, opacity:0.75}}/>
//         </View>
//       </Animated.View>
//     </View>
//   );
// };

// const SkelCircle = ({size=64, style}) => (
//   <Shimmer style={[{width:size, height:size, borderRadius:size/2}, style]} />
// );
// const SkelBox = ({w='100%', h=16, r=12, style}) => (
//   <Shimmer style={[{width:w, height:h, borderRadius:r}, style]} />
// );

// /* ===== SCREEN ===== */
// export default function ProfileScreen({navigation}) {
//   const insets = useSafeAreaInsets();
// const [user, setUser] = useState(null);
// const [hotels, setHotels] = useState([]);
// const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [refreshing, setRefreshing] = useState(false);
// const handleLogout = async () => {
//     try {
//     const provider = await AsyncStorage.getItem('authProvider');
//     console.log('[logout] provider:', provider);

//     if (provider === 'google') {
//       // Best-effort Google + Firebase sign-out
//       try { await auth().signOut(); } catch (e) { console.log('[logout] firebase signOut err:', e?.message); }
//     try { await GoogleSignin.signOut(); } catch (e) { console.log('[logout] google signOut err:', e?.message); }
//     try { await GoogleSignin.revokeAccess(); } catch (e) { console.log('[logout] revokeAccess err:', e?.message); }
//     console.log('[logout] google signout done');
//     } else {
//       // Password / unknown providers: nothing special to do with Firebase/Google
//     }
//   } catch (e) {
//     console.log('[logout] provider branch error:', e?.message);
//   } finally {
//     // Clear all local app auth state regardless of the above succeeding
//     await AsyncStorage.multiRemove([
//       'authProvider',
//       'APP_TOKEN',
//       'userToken',
//       'ownerToken',
//       'ownerData',
//       'ownerId',
//       'token',
//       'user',


//     ]);

//     // Remove auth header from axios clients
//     try { delete api.defaults.headers.common.Authorization; } catch (_) {}
//     try { delete axios.defaults.headers.common.Authorization; } catch (_) {}

//     // Hard reset navigation to Login
//     navigation.reset({
//       index: 0,
//       routes: [{ name: 'RestaurantLogin' }],
//     });
//   }
//   };
// useEffect(() => {
//     (async () => {
//       try {
//         setLoading(true);
//        const res = await api.get('/restaurants/profile'); // baseURL .../api/app
//         console.log('Profile API raw response:', res);
//       const payload = res.data;
// console.log('Profile API payload:', payload);
//        setUser({
//         name: payload?.name ?? 'User',
//         email: payload?.email ?? '-',
//         phone: payload?.phone ?? '-',
//         cover:
//           payload?.cover ??
//           'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop',
//         fssaiNo: payload?.restaurants?.[0]?.fssai_number ?? '—',
//         fssaiCertUrl: payload?.restaurants?.[0]?.fssai_certificate_url ?? '',
//         referral: payload?.referral_code ?? 'KNI-REF-0001',
//         hotelsCount: payload?.stats?.hotels_count ?? 0,
//         requests: payload?.stats?.requests_count ?? 0,
//         rating: Number(payload?.rating ?? 0),
//       });
//        setHotels(
//         (payload?.restaurants ?? []).map(r => ({
//           id: String(r.id),
//           name: r.hotel_name,
//           address: r.address,
//           rating: r.rating ?? 0,
//           photo: r.photo ?? null,
//           fssaiNo: r.fssai_number,
//           fssaiCertUrl: r.fssai_certificate_url,
//         }))
//       ); // replace with API mapping when available
//         // Reviews (only if you add them to the API)
//       setReviews(
//         (payload?.reviews ?? []).map(rv => ({
//           id: String(rv.id),
//           from: rv.author_name ?? 'Anonymous',
//           text: rv.text ?? '',
//           stars: rv.stars ?? 0,
//         }))
//       );
//     } catch (e) {
//       console.log('Profile fetch error:', e?.response?.data || e?.message);
//       Alert.alert('Error', 'Unable to load your profile.');
//     } finally {
//       setLoading(false);
//       setRefreshing(false);
//     }
//   })();
// }, []);


//  const onRefresh = () => {
//   setRefreshing(true);
//   (async () => {
//     try {
//       const res = await api.get('/restaurants/profile');
//       console.log('Profile API raw response:', res);
//       const payload = res.data;
//       setUser({
//         name: payload?.name ?? 'User',
//         email: payload?.email ?? '-',
//         phone: payload?.phone ?? '-',
//         cover:
//           payload?.cover ??
//           'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop',
//         fssaiNo: payload?.restaurants?.[0]?.fssai_number ?? '—',
//         fssaiCertUrl: payload?.restaurants?.[0]?.fssai_certificate_url ?? '',
//         referral: payload?.referral_code ?? 'KNI-REF-0001',
//         hotelsCount: payload?.stats?.hotels_count ?? 0,
//         requests: payload?.stats?.requests_count ?? 0,
//         rating: Number(payload?.rating ?? 0),
//       });
//       setHotels(
//         (payload?.restaurants ?? []).map(r => ({
//           id: String(r.id),
//           name: r.hotel_name,
//           address: r.address,
//           rating: r.rating ?? 0,
//           photo: r.photo ?? null,
//           fssaiNo: r.fssai_number,
//           fssaiCertUrl: r.fssai_certificate_url,
//         }))
//       );
//       setReviews(
//         (payload?.reviews ?? []).map(rv => ({
//           id: String(rv.id),
//           from: rv.author_name ?? 'Anonymous',
//           text: rv.text ?? '',
//           stars: rv.stars ?? 0,
//         }))
//       );
//     } catch (e) {
//       Alert.alert('Error', 'Unable to refresh.');
//     } finally {
//       setRefreshing(false);
//     }
//   })();
// };
// const toAbsoluteUrl = (maybeUrl) => {
//   if (!maybeUrl) return '';
//   if (/^https?:\/\//i.test(maybeUrl)) return maybeUrl;
//   const base = api?.defaults?.baseURL?.replace(/\/api\/?$/, '') || '';
//   return base + (maybeUrl.startsWith('/') ? maybeUrl : '/' + maybeUrl);
// };

//  const viewPDF = async () => {
//   const raw = user?.fssaiCertUrl;
//   if (!raw) return Alert.alert('Not available', 'No certificate URL found.');
//   const url = toAbsoluteUrl(raw);
//   console.log('Opening PDF:', url);
//   try {
//     // Try opening directly
//     await Linking.openURL(url);
//   } catch (err) {
//     console.log('Direct open failed:', err?.message);
//     // Fallback: open in Google Docs viewer (works with any PDF URL)
//     const gview = `https://docs.google.com/gview?embedded=1&url=${encodeURIComponent(url)}`;
//     try {
//       await Linking.openURL(gview);
//     } catch {
//       Alert.alert('Unable to open', 'Please install a PDF viewer or try again later.');
//     }
//   }
// };
//   const shareReferral = async () => {
//     try { await Share.share({ message: `Use my KNI referral • ${user?.referral ?? ''}` }); } catch {}
//   };
//   const initial = ((user?.name || 'U')[0] || 'U').toUpperCase();
//   const CARD_W = W * 0.88;
//   const GAP = 14;
// const hotelsData = [...(hotels || []), { id: 'more', type: 'more' }];

//   return (
//     <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
//       <ScrollView
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
//         contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
//         showsVerticalScrollIndicator={false}
//         stickyHeaderIndices={[1]}
//       >
//         {/* 0) HERO */}
//         {loading ? (
//           <View style={[st.hero, { height:220, overflow:'hidden' }]}>
//             <Shimmer style={StyleSheet.absoluteFillObject}/>
//             <View style={st.blobA}/>
//             <View style={st.blobB}/>
//           </View>
//         ) : (
//           <View style={[st.hero, { height: 220 }]}>
//           <Image source={{ uri: user?.cover ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop' }}
//              style={StyleSheet.absoluteFillObject} resizeMode="cover" />
//             <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
//             <View style={st.blobA}/>
//             <View style={st.blobB}/>
//             <View style={{position:'absolute', left:16, bottom:16, right:16}}>
//               <Text style={{color:'#fff', fontWeight:'900', fontSize:20}}>Welcome back</Text>
//               <Text style={{color:'#FFFFFFDD', marginTop:4}}>Keep your kitchen running like a pro 🔧</Text>
//             </View>
//           </View>
//         )}

//         {/* 1) STICKY: PROFILE + STATS */}
//         <View style={st.stickyWrap}>
//           {loading ? (
//             <View style={{padding:16}}>
//               <View style={{flexDirection:'row', alignItems:'center'}}>
//                 <View style={{alignItems:'center'}}>
//                   <SkelCircle size={72}/>
//                   <SkelBox w={84} h={22} r={999} style={{marginTop:8}}/>
//                 </View>
//                 <View style={{flex:1, marginLeft:12}}>
//                   <SkelBox w={'60%'} h={22}/>
//                   <SkelBox w={'70%'} h={14} style={{marginTop:10}}/>
//                   <SkelBox w={'50%'} h={14} style={{marginTop:8}}/>
//                 </View>
//               </View>
//               {/* stats row */}
//               <View style={[st.statsGlass, { marginTop:14 }]}>
//                 <View style={st.statCell}>
//                   <SkelCircle size={30}/>
//                   <SkelBox w={40} h={14} style={{marginTop:8}}/>
//                   <SkelBox w={48} h={10} style={{marginTop:6}}/>
//                 </View>
//                 <View style={st.vline}/>
//                 <View style={st.statCell}>
//                   <SkelCircle size={30}/>
//                   <SkelBox w={40} h={14} style={{marginTop:8}}/>
//                   <SkelBox w={58} h={10} style={{marginTop:6}}/>
//                 </View>
//                 <View style={st.vline}/>
//                 <View style={st.statCell}>
//                   <SkelCircle size={30}/>
//                   <SkelBox w={40} h={14} style={{marginTop:8}}/>
//                   <SkelBox w={68} h={10} style={{marginTop:6}}/>
//                 </View>
//               </View>
//             </View>
//           ) : (
//             <>
//              <View style={st.heroBottomWrap}>
//                 <View style={st.avatarWrap}>
//                   <View style={st.avatar}><Text style={st.avatarTxt}>{initial}</Text></View>
//                   <View style={st.verifyPill}><Icon name="shield-checkmark" size={14} color="#fff"/><Text style={st.verifyTxt}>KNI Verified</Text></View>
//                 </View>
//                 <View style={{flex:1, marginLeft:12}}>
//                    <Text style={st.name}>{user?.name ?? '-'}</Text>
//                     <Text style={st.meta}>{user?.email ?? '-'}</Text>
//                      <Text style={st.meta}>{user?.phone ?? '-'}</Text>
//                 </View>
//                 <View style={{ paddingHorizontal:16, marginTop:4, marginBottom:2, alignItems:'flex-end' }}>
//   <TouchableOpacity
//     onPress={()=>{
//       // Pre-fill initial values from current user object
//       const firstName = (user?.name || '').split(' ')[0] || '';
//       const lastName  = (user?.name || '').split(' ').slice(1).join(' ') || '';
//       navigation.navigate('EditOwnerProfile', {
//         initial: {
//           first_name: firstName,
//           last_name: lastName,
//           email: user?.email || '',
//           phone: user?.phone || '',
//           password: '', // blank by default
//           restaurant_name: user?.restaurant_name || '',
//            locations: Number.isFinite(user?.locations) ? String(user.locations) : '0',
//         }
//       });
//     }}
//     // style={{ backgroundColor: C.primary, paddingHorizontal:16, paddingVertical:10, borderRadius:12 }}
//   >
//     {/* <Text style={{ color:C.primary, fontWeight:'900',marginBottom:60 }}>Edit Profile</Text> */}
//     <Text style={{ color:C.primary, fontWeight:'900',marginBottom:60 }}><Icon
//   name="create-outline"   // pencil
//   size={28}
//   color={C.primary}
//   style={{ marginBottom: 60 }}
// /></Text>
//   </TouchableOpacity>
// </View>
//               </View>
              
//               <View style={[st.statsGlass, { marginTop:10, marginBottom:8 }]}>
//                 <View style={st.statCell}>
//                   <View style={st.statIcon}><Icon name="business-outline" size={16} color={C.primary}/></View>
//                    <Text style={st.statNum}>{user?.hotelsCount ?? 0}</Text>
//                   <Text style={st.statLbl}>Hotels</Text>
//                 </View>
//                 <View style={st.vline}/>
//                 <View style={st.statCell}>
//                   <View style={st.statIcon}><Icon name="clipboard-outline" size={16} color={C.primary}/></View>
//                   <Text style={st.statNum}>{user?.requests ?? 0}</Text>
//                   <Text style={st.statLbl}>Requests</Text>
//                 </View>
//                 <View style={st.vline}/>
//                 <View style={st.statCell}>
//                   <View style={st.statIcon}><Icon name="star" size={16} color="#F59E0B"/></View>
//                   <Text style={st.statNum}>{(user?.rating ?? 0).toFixed(1)}</Text>
//                   <Text style={st.statLbl}>Avg rating</Text>
//                 </View>
//               </View>
//             </>
//           )}
//         </View>

//         {/* 2) REST: FSSAI, Hotels, Reviews */}
//         {/* FSSAI CARD */}
//         {loading ? (
//           <View style={st.cardGlass}>
//             <SkelBox w={90} h={18}/>
//             <View style={{marginTop:12}}>
//               <View style={[st.row,{paddingVertical:6}]}>
//                 <View style={st.rowLeft}><SkelCircle size={22}/><SkelBox w={80} h={14} style={{marginLeft:8}}/></View>
//                 <SkelBox w={160} h={16}/>
//               </View>
//               <View style={[st.row,{paddingVertical:6}]}>
//                 <View style={st.rowLeft}><SkelCircle size={22}/><SkelBox w={90} h={14} style={{marginLeft:8}}/></View>
//                 <SkelBox w={84} h={32} r={12}/>
//               </View>
//             </View>
//             <View style={st.sep}/>
//             <View style={{flexDirection:'row', alignItems:'center', marginTop:10}}>
//               <SkelBox w={130} h={36} r={999}/>
//               <SkelBox w={88} h={36} r={12} style={{marginLeft:10}}/>
//             </View>
//           </View>
//         ) : (
//           <View style={st.cardGlass}>
//             <Text style={st.h2}>FSSAI</Text>
//             <View style={st.row}>
//               <View style={st.rowLeft}><Icon name="document-text-outline" size={18} color={C.ink}/><Text style={st.rowLbl}>Number</Text></View>
// <Text style={st.rowVal}>{user?.fssaiNo ?? '—'}</Text>
//             </View>
//             <View style={st.row}>
//               <View style={st.rowLeft}><Icon name="link-outline" size={18} color={C.ink}/><Text style={st.rowLbl}>Certificate</Text></View>
//               <TouchableOpacity onPress={viewPDF} style={st.viewBtn}>
//                 <Icon name="document-outline" size={14} color="#fff"/><Text style={st.viewTxt}>View PDF</Text>
//               </TouchableOpacity>
//             </View>
//             <View style={st.sep}/>
//             <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
//               <View style={st.refChip}>
//                 <Icon name="gift-outline" size={16} color={C.primary}/>
// <Text style={st.refTxt}>{user?.referral ??'-'}</Text>
//               </View>
//               <TouchableOpacity onPress={shareReferral} style={st.shareBtn}>
//                 <Icon name="share-social-outline" size={16} color="#fff"/><Text style={st.shareTxt}>Share</Text>
//               </TouchableOpacity>
//             </View>
//           </View>
//         )}

//         {/* HOTELS */}
//         <View style={st.sectionHdr}>
//           <Text style={st.sectionTitle}>Your Restaurants</Text>
//           {!loading && (
//             <TouchableOpacity onPress={()=>navigation.navigate('Restaurants')} style={{padding:8}}>
//               <Text style={st.link}>Add new</Text>
//             </TouchableOpacity>
//           )}
//           {loading && <SkelBox w={80} h={16}/>}
//         </View>

//         {loading ? (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{ paddingHorizontal:16, gap:GAP, marginBottom:16 }}
//           >
//             {Array.from({length:3}).map((_,i)=>(
//               <View key={i} style={[st.hotelHeroCard, { width: W*0.88 }]}>
//                 <Shimmer style={StyleSheet.absoluteFillObject}/>
//                 <View style={[st.hotelHeroBody,{backgroundColor:'#FFFFFFE6'}]}>
//                   <SkelBox w={'60%'} h={16}/>
//                   <SkelBox w={'50%'} h={12} style={{marginTop:8}}/>
//                   <SkelBox w={70} h={12} style={{marginTop:10}}/>
//                 </View>
//               </View>
//             ))}
//           </ScrollView>
//         ) : (
//           <FlatList
//             data={hotelsData}
//             keyExtractor={(i)=>i.id}
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             snapToInterval={CARD_W + GAP}
//             decelerationRate="fast"
//             contentContainerStyle={{ paddingHorizontal:16,marginBottom:16 }}
//             ItemSeparatorComponent={()=><View style={{width:GAP}}/>}
//             renderItem={({item:h})=>{
//               if (h.type === 'more') {
//                 return (
//                   <TouchableOpacity
//                     activeOpacity={0.9}
//                     onPress={()=>Alert.alert('View more', 'Open hotels list')}
//                     style={[st.hotelHeroCard, { width: CARD_W, alignItems:'center', justifyContent:'center', backgroundColor:'#FFF' }]}
//                   >
//                     <View style={st.viewMoreBox}>
//                       <Icon name="chevron-forward-circle-outline" size={36} color={C.ink}/>
//                       <Text style={st.viewMoreTxt}>View more</Text>
//                     </View>
//                   </TouchableOpacity>
//                 );
//               }
//               return (
//                 <View style={[st.hotelHeroCard, { width: CARD_W }]}>
//                   {h.photo
//                     ? <Image source={{uri:h.photo}} style={st.hotelHeroImg}/>
//                     : <View style={[st.hotelHeroImg,{backgroundColor:'#E5E7EB',alignItems:'center',justifyContent:'center'}]}>
//                         <Icon name="image-outline" size={28} color="#9CA3AF"/>
//                       </View>
//                   }
//                   <View style={st.heroOverlay} />
//                   {/* <View style={st.cardActionBar}>
//                     <TouchableOpacity onPress={()=>Alert.alert('Edit', h.name)} style={st.cardIconBtn}>
//                       <Icon name="create-outline" size={16} color="#111827"/>
//                     </TouchableOpacity>
//                     <TouchableOpacity onPress={()=>Alert.alert('Delete', h.name)} style={st.cardIconBtn}>
//                       <Icon name="trash-outline" size={16} color="#111827"/>
//                     </TouchableOpacity>
//                   </View> */}
//                   <View style={st.hotelHeroBody}>
//                     <Text style={st.hotelHeroName} numberOfLines={1}>{h.name}</Text>
//                     <Text style={st.hotelHeroAddr} numberOfLines={1}>{h.address}</Text>
//                     <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
//                       <Stars value={h.rating} size={12}/>
//                       <Text style={st.hotelRateTxt}>  {h.rating}</Text>
//                     </View>
//                   </View>
//                 </View>
//               );
//             }}
//           />
//         )}

//         {/* REVIEWS */}
//         <View style={[st.sectionHdr,{marginTop:16}]}>
//           <Text style={st.sectionTitle}>What pros say</Text>
//         </View>
//         {loading ? (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{ paddingHorizontal:16, gap:10, marginBottom:16, paddingTop:6 }}
//           >
//             {Array.from({length:3}).map((_,i)=>(
//               <View key={i} style={st.revPill}>
//                 <SkelBox w={'60%'} h={14}/>
//                 <SkelBox w={'90%'} h={12} style={{marginTop:8}}/>
//                 <SkelBox w={'70%'} h={12} style={{marginTop:6}}/>
//                 <SkelBox w={80} h={12} style={{marginTop:10}}/>
//               </View>
//             ))}
//           </ScrollView>
//         ) : (
//           <ScrollView
//             horizontal
//             showsHorizontalScrollIndicator={false}
//             contentContainerStyle={{ paddingHorizontal:16, gap:10,marginBottom:16, paddingTop:6 }}
//           >
//             {reviews.map(r=>(
//               <View key={r.id} style={st.revPill}>
//                 <Text style={st.revFromMini} numberOfLines={1}>{r.from}</Text>
//                 <Text style={st.revTxtMini} numberOfLines={3}>{r.text}</Text>
//                 <View style={{marginTop:6}}><Stars value={r.stars} size={12}/></View>
//               </View>
//             ))}
//           </ScrollView>
//         )}
//         <View style={st.logoutContainer}>
//         <TouchableOpacity style={st.logoutButton} onPress={handleLogout}>
//           <Icon name="log-out-outline" size={20} color="#EF3A3A" />
//           <Text style={st.logoutText}>Logout</Text>
//         </TouchableOpacity>
//         <Icon name="chevron-forward" size={20} color="#EF3A3A" />
//       </View>
//       </ScrollView>

//       <KniBottomNav
//         navigation={navigation}
//         active="profile"
//         cartCount={3}
//         notifCount={2}
//       />
//     </SafeAreaView>
//   );
// }

// /* ===== STYLES ===== */
// const st = StyleSheet.create({
//   // HERO
//   hero:{ width:'100%', borderBottomLeftRadius:28, borderBottomRightRadius:28, overflow:'hidden', justifyContent:'flex-end' },
//   blobA:{ position:'absolute', width:160, height:160, borderRadius:100, backgroundColor:'#EF3A3A33', top:-30, left:-30 },
//   blobB:{ position:'absolute', width:220, height:220, borderRadius:120, backgroundColor:'#1D225422', bottom:-70, right:-50 },

//   // Sticky background
//   stickyWrap:{ backgroundColor:'#ffffffff', borderBottomWidth:1, borderBottomColor:'#EEF2F7' },

//   // Profile strip
//   heroBottomWrap:{ flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'rgba(255, 255, 255, 1)' },
//   avatarWrap:{ alignItems:'center' },
//   avatar:{ width:72, height:72, borderRadius:22, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center',
//     borderWidth:2, borderColor:'#FFFFFFAA', shadowColor:'#000', shadowOpacity:0.2, shadowRadius:8, elevation:6 },
//   avatarTxt:{ color:C.primary, fontSize:30, fontWeight:'900' },
//   name:{ color:C.ink, fontWeight:'900', fontSize:22 },
//   meta:{ color:C.muted, marginTop:2 },
//   verifyPill:{ flexDirection:'row', alignItems:'center', backgroundColor:C.ok, paddingHorizontal:10, paddingVertical:6, borderRadius:999, marginTop:8 },
//   verifyTxt:{ color:'#fff', marginLeft:6, fontWeight:'800', fontSize:12 },

//   // Stats
//   statsGlass:{ marginHorizontal:16, backgroundColor:'#FFFFFFCC', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7',
//     flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:12,
//     shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{ width:0, height:6 } },
//   statCell:{ flex:1, alignItems:'center' },
//   statIcon:{ width:30, height:30, borderRadius:10, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center', marginBottom:6 },
//   statNum:{ color:C.ink, fontWeight:'900', fontSize:18 },
//   statLbl:{ color:C.muted, fontSize:12 },
//   vline:{ width:1, height:42, backgroundColor:'#E5E7EB' },

//   // FSSAI card
//   cardGlass:{ backgroundColor:'#FFFFFFCC', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7', padding:16, marginHorizontal:16, marginTop:12 },
//   h2:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:8 },
//   row:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingVertical:6 },
//   rowLeft:{ flexDirection:'row', alignItems:'center' },
//   rowLbl:{ color:C.text, fontSize:14, marginLeft:8 },
//   rowVal:{ color:C.ink, fontWeight:'800', fontSize:14 },
//   sep:{ height:1, backgroundColor:C.border, marginTop:10 },
//   viewBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.primary, borderRadius:12, paddingHorizontal:12, paddingVertical:8 },
//   viewTxt:{ color:'#fff', fontWeight:'800', marginLeft:6 },
//   refChip:{ flexDirection:'row', alignItems:'center', backgroundColor:'#FFF1F1', borderWidth:1, borderColor:'#FECACA', paddingHorizontal:10, paddingVertical:8, borderRadius:999 },
//   refTxt:{ marginLeft:6, color:C.primary, fontWeight:'800' },
//   shareBtn:{ flexDirection:'row', alignItems:'center', backgroundColor:C.ink, marginLeft:10, paddingHorizontal:12, paddingVertical:10, borderRadius:12 },
//   shareTxt:{ color:'#fff', fontWeight:'900', marginLeft:6 },

//   sectionHdr:{ paddingHorizontal:16, marginTop:14,marginBottom:16, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
//   sectionTitle:{ color:C.ink, fontWeight:'900', fontSize:18 },
//   link:{ color:C.primary, fontWeight:'900' },

//   // Hotels – cards
//   hotelHeroCard:{ height: 200, borderRadius:R, overflow:'hidden', borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff',
//     shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, elevation:5 },
//   hotelHeroImg:{ ...StyleSheet.absoluteFillObject, width:'100%', height:'100%' },
//   heroOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.20)' },
//   hotelHeroBody:{ position:'absolute', left:14, right:14, bottom:12, backgroundColor:'#FFFFFFEE',
//     borderRadius:14, padding:12, borderWidth:1, borderColor:'#EEF2F7' },
//   hotelHeroName:{ color:C.text, fontWeight:'900', fontSize:16 },
//   hotelHeroAddr:{ color:C.muted, fontSize:12, marginTop:2 },
//   cardActionBar:{ position:'absolute', right:10, top:10, flexDirection:'row', gap:6, backgroundColor:'#FFFFFFCC',
//     borderRadius:999, padding:6, borderWidth:1, borderColor:'#EEF2F7' },
//   cardIconBtn:{ width:28, height:28, borderRadius:8, backgroundColor:'#F8FAFC', alignItems:'center', justifyContent:'center',
//     borderWidth:1, borderColor:'#E5E7EB' },
//   hotelRateTxt:{ color:C.muted, fontSize:12 },

//   // "View more"
//   viewMoreBox:{ alignItems:'center', justifyContent:'center', borderWidth:2, borderStyle:'dashed', borderColor:'#CBD5E1',
//     paddingVertical:26, paddingHorizontal:18, borderRadius:16, backgroundColor:'#FFFFFFF2' },
//   viewMoreTxt:{ marginTop:8, fontWeight:'900', color:C.ink, fontSize:16 },
// logoutContainer: {
//     backgroundColor: '#ffffffff', // Grey background
//     paddingVertical: 12,
//     paddingHorizontal: 20,
//     borderRadius: 8,
//     marginHorizontal:15,
//     marginTop: 20,
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'space-between',
//     borderWidth:1, borderColor:'#EEF2F7',
//     shadowColor:'#707070ff', shadowOpacity:0.06, shadowRadius:2, elevation:2
//   },
//   logoutButton: {
//     flexDirection: 'row',
//     alignItems: 'center',
//   },
//   logoutText: {
//     marginLeft: 10,
//     fontSize: 16,
//     color: '#EF3A3A',
//     fontWeight: 'bold',
//   },
//   // reviews – pills
//   revPill:{ width: W*0.7, backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#EEF2F7', padding:12,
//     shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
//   revFromMini:{ color:C.ink, fontWeight:'900', marginBottom:4 },
//   revTxtMini:{ color:C.text, lineHeight:18 },
// });


// screens/ProfileUltra.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  RefreshControl, Animated, Share, Linking, Alert, Dimensions, FlatList,
  Modal, TextInput, Switch, ActivityIndicator
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import KniBottomNav from '../components/KniBottomNav';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { api, IMAGE_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from '@react-navigation/native';

/* ===== THEME ===== */
const C = {
  primary:'#EF3A3A', ink:'#1D2254', bg:'#F5F7FA', card:'#FFFFFF',
  text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', ok:'#10B981', warn:'#F59E0B'
};
const R = 20;
const { width: W } = Dimensions.get('window');

/* ===== HELPERS ===== */
const Stars = ({value=0,size=12})=>(
  <View style={{flexDirection:'row'}}>
    {Array.from({length:5}).map((_,i)=>(
      <Icon key={i} name={i < Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B"/>
    ))}
  </View>
);

/* ===== DELETE ACCOUNT MODAL COMPONENT ===== */
const DeleteAccountModal = ({ visible, onClose, user }) => {
  const [loading, setLoading] = useState(false);

  const handleEmailSupport = () => {
    const email = 'info@kniservices.com';
    const subject = 'Delete My Account Request';
    const body = `Please delete my account with the following details:\n\n- Registered Name: ${user?.name || 'N/A'}\n- Registered Email: ${user?.email || 'N/A'}\n- Registered Phone: ${user?.phone || 'N/A'}\n- User ID: ${user?.id || 'N/A'}\n\nI confirm that I want to permanently delete my account and all associated data.`;
    
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(() => {
      Alert.alert('Error', 'Could not open email client. Please email info@kniservices.com directly.');
    });
    onClose();
  };

  const handlePhoneSupport = () => {
    const phoneNumber = '+1 (555) 123-4567';
    Linking.openURL(`tel:${phoneNumber}`).catch(() => {
      Alert.alert('Error', 'Could not make phone call. Please call +1 (555) 123-4567 directly.');
    });
    onClose();
  };

  const handleWebForm = () => {
    Linking.openURL('https://example.com/delete-request').catch(() => {
      Alert.alert('Error', 'Could not open web form. Please visit https://example.com/delete-request');
    });
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Delete Account</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
            {/* Warning Alert */}
            <View style={styles.warningBox}>
              <Icon name="warning" size={20} color="#DC2626" />
              <Text style={styles.warningText}>
                This action cannot be undone. All your data will be permanently deleted.
              </Text>
            </View>

            {/* Contact Methods */}
            <Text style={styles.sectionTitle}>Choose how to delete your account:</Text>

            {/* Email Method */}
            <TouchableOpacity style={styles.optionCard} onPress={handleEmailSupport}>
              <View style={styles.optionIcon}>
                <Icon name="mail" size={24} color="#2563EB" />
              </View>
              <View style={styles.optionContent}>
                <Text style={styles.optionTitle}>Email Support</Text>
                <Text style={styles.optionDescription}>
                  Send an email to our support team with your account details
                </Text>
                <Text style={styles.optionDetail}>info@kniservices.com</Text>
              </View>
              <Icon name="chevron-forward" size={20} color={C.muted} />
            </TouchableOpacity>

            {/* What Gets Deleted */}
            <View style={styles.infoCard}>
              <View style={styles.infoHeader}>
                <Icon name="trash" size={20} color="#DC2626" />
                <Text style={styles.infoTitle}>What Will Be Deleted</Text>
              </View>
              <Text style={styles.infoItem}>• User profile (name, phone, email)</Text>
              <Text style={styles.infoItem}>• Photos and attachments you uploaded</Text>
              <Text style={styles.infoItem}>• Account activity logs</Text>
              <Text style={styles.infoItem}>• Service request history</Text>
              <Text style={styles.infoItem}>• Payment and billing information</Text>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.modalFooter}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ===== PASSWORD CHANGE MODAL COMPONENT ===== */
const PasswordChangeModal = ({ visible, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) {
      Alert.alert('Error', 'Please enter your current password');
      return;
    }
    if (!newPassword.trim()) {
      Alert.alert('Error', 'Please enter a new password');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/owner/profile/password', {
        currentPassword,
        newPassword,
      });

      if (response.data.ok) {
        Alert.alert('Success', 'Password changed successfully');
        resetForm();
        onClose();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to change password');
      }
    } catch (error) {
      const errorMsg = error.response?.data?.error || 'Failed to change password';
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={pwStyles.modalOverlay}>
        <View style={pwStyles.modalContent}>
          <View style={pwStyles.modalHeader}>
            <Text style={pwStyles.modalTitle}>Change Password</Text>
            <TouchableOpacity onPress={handleClose} style={pwStyles.closeButton}>
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={pwStyles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={pwStyles.label}>Current Password</Text>
            <View style={pwStyles.inputWrapper}>
              <TextInput
                style={pwStyles.input}
                placeholder="Enter current password"
                placeholderTextColor={C.muted}
                secureTextEntry={!showCurrent}
                value={currentPassword}
                onChangeText={setCurrentPassword}
              />
              <TouchableOpacity onPress={() => setShowCurrent(!showCurrent)} style={pwStyles.eyeBtn}>
                <Icon name={showCurrent ? 'eye-off' : 'eye'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={pwStyles.label}>New Password</Text>
            <View style={pwStyles.inputWrapper}>
              <TextInput
                style={pwStyles.input}
                placeholder="At least 8 characters"
                placeholderTextColor={C.muted}
                secureTextEntry={!showNew}
                value={newPassword}
                onChangeText={setNewPassword}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} style={pwStyles.eyeBtn}>
                <Icon name={showNew ? 'eye-off' : 'eye'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <Text style={pwStyles.label}>Confirm New Password</Text>
            <View style={pwStyles.inputWrapper}>
              <TextInput
                style={pwStyles.input}
                placeholder="Re-enter new password"
                placeholderTextColor={C.muted}
                secureTextEntry={!showConfirm}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} style={pwStyles.eyeBtn}>
                <Icon name={showConfirm ? 'eye-off' : 'eye'} size={20} color={C.muted} />
              </TouchableOpacity>
            </View>

            <View style={pwStyles.tipBox}>
              <Icon name="information-circle" size={18} color={C.info} />
              <Text style={pwStyles.tipText}>
                Password must be at least 8 characters and include a mix of letters and numbers for security.
              </Text>
            </View>
          </ScrollView>

          <View style={pwStyles.modalFooter}>
            <TouchableOpacity style={pwStyles.cancelButton} onPress={handleClose}>
              <Text style={pwStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[pwStyles.saveButton, loading && { opacity: 0.6 }]}
              onPress={handleChangePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={pwStyles.saveButtonText}>Update Password</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ===== NOTIFICATION SETTINGS MODAL COMPONENT ===== */
const NotificationSettingsModal = ({ visible, onClose, settings, onSave }) => {
  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    bookingUpdates: true,
    marketingEmails: false,
    ...settings,
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (settings) {
      setNotifSettings(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleToggle = (key) => {
    setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await api.patch('/owner/profile', {
        notificationPreferences: notifSettings,
      });

      if (response.data.ok || response.status === 200) {
        Alert.alert('Success', 'Notification preferences updated');
        onSave(notifSettings);
        onClose();
      } else {
        Alert.alert('Error', 'Failed to update preferences');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to update notification preferences');
    } finally {
      setLoading(false);
    }
  };

  const renderToggleRow = (label, key, icon, description) => (
    <View style={notifStyles.toggleRow}>
      <View style={notifStyles.toggleLeft}>
        <View style={notifStyles.toggleIcon}>
          <Icon name={icon} size={20} color={C.primary} />
        </View>
        <View style={notifStyles.toggleInfo}>
          <Text style={notifStyles.toggleLabel}>{label}</Text>
          <Text style={notifStyles.toggleDesc}>{description}</Text>
        </View>
      </View>
      <Switch
        value={notifSettings[key]}
        onValueChange={() => handleToggle(key)}
        trackColor={{ false: C.border, true: '#FFD0D0' }}
        thumbColor={notifSettings[key] ? C.primary : '#f4f3f4'}
      />
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={notifStyles.modalOverlay}>
        <View style={notifStyles.modalContent}>
          <View style={notifStyles.modalHeader}>
            <Text style={notifStyles.modalTitle}>Notification Settings</Text>
            <TouchableOpacity onPress={onClose} style={notifStyles.closeButton}>
              <Icon name="close" size={24} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView style={notifStyles.modalBody} showsVerticalScrollIndicator={false}>
            <Text style={notifStyles.sectionTitle}>Notification Channels</Text>
            {renderToggleRow('Push Notifications', 'pushNotifications', 'notifications', 'Receive instant alerts on your device')}
            {renderToggleRow('Email Notifications', 'emailNotifications', 'mail', 'Get updates in your inbox')}
            {renderToggleRow('SMS Notifications', 'smsNotifications', 'chatbubble-ellipses', 'Receive text message alerts')}

            <Text style={notifStyles.sectionTitle}>Notification Types</Text>
            {renderToggleRow('Booking Updates', 'bookingUpdates', 'calendar', 'Service booking confirmations and changes')}
            {renderToggleRow('Marketing & Offers', 'marketingEmails', 'pricetag', 'Special offers and promotions')}
          </ScrollView>

          <View style={notifStyles.modalFooter}>
            <TouchableOpacity style={notifStyles.cancelButton} onPress={onClose}>
              <Text style={notifStyles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[notifStyles.saveButton, loading && { opacity: 0.6 }]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={notifStyles.saveButtonText}>Save Preferences</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ===== SCREEN ===== */
export default function ProfileScreen({navigation}) {
  const insets = useSafeAreaInsets();
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [notificationSettings, setNotificationSettings] = useState({});
  const [cartCount, setCartCount] = useState(0);

  // Calculate cart count from AsyncStorage
  const calculateCartCount = useCallback(async () => {
    try {
      const a = await AsyncStorage.getItem('owner_id');
      const b = await AsyncStorage.getItem('restaurant_owner_id');
      const c = await AsyncStorage.getItem('ownerId');
      const ownerId = String(a || b || c || '').trim();
      const ownerKey = ownerId ? `owner:${ownerId}` : 'global';

      const allKeys = await AsyncStorage.getAllKeys();
      const myPrefix = `rdraft:${ownerKey}:`;
      const rdraftKeys = allKeys.filter(k => k.startsWith(myPrefix));

      let totalCount = 0;
      for (const key of rdraftKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const cartObj = JSON.parse(raw);
          const itemCount = Object.values(cartObj || {}).reduce((sum, qty) => sum + Number(qty || 0), 0);
          totalCount += itemCount;
        }
      }
      setCartCount(totalCount);
    } catch (e) {
      console.log('Error calculating cart count:', e);
      setCartCount(0);
    }
  }, []);

  // Refresh cart count when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      calculateCartCount();
    }, [calculateCartCount])
  );

  /* ===== DELETE ACCOUNT HANDLING ===== */
  const handleDeleteAccount = () => {
    setDeleteModalVisible(true);
  };

  /* ===== FSSAI CERTIFICATE HANDLING ===== */
  const getFssaiCertificateUrl = (restaurant) => {
    if (!restaurant) return '';
    
    const fssaiUrl = restaurant.fssai_certificate_url || 
                     restaurant.fssai_certificate || 
                     restaurant.fssai_certificate_pdf ||
                     restaurant.certificate_url ||
                     restaurant.fssai_document;
    
    if (!fssaiUrl || fssaiUrl.trim() === '') return '';
    
    let cleanedUrl = fssaiUrl.trim().replace(/\s+/g, '');
    
    // Use IMAGE_BASE_URL instead of hardcoded domain
    if (cleanedUrl.includes('localhost')) {
      cleanedUrl = cleanedUrl.replace('http://localhost/storage', IMAGE_BASE_URL);
    }
    
    if (cleanedUrl.startsWith('http')) {
      return cleanedUrl;
    }
    
    const cleanPath = cleanedUrl.replace(/^\//, '');
    return `${IMAGE_BASE_URL}/${cleanPath}`;
  };

  const viewPDF = async ()=>{
    let pdfUrl = user?.fssaiCertUrl;
    
    if (!pdfUrl || pdfUrl.trim() === '') {
      Alert.alert(
        'Certificate Not Available', 
        'No FSSAI certificate found for your restaurant.'
      );
      return;
    }

    pdfUrl = pdfUrl.trim().replace(/\s+/g, '');
    
    // Use IMAGE_BASE_URL for domain replacement
    if (pdfUrl.includes('localhost')) {
      pdfUrl = pdfUrl.replace('http://localhost/storage', IMAGE_BASE_URL);
    }

    if (!pdfUrl.startsWith('http')) {
      Alert.alert('Invalid Certificate URL', 'The certificate URL format is incorrect.');
      return;
    }

    try {
      const canOpen = await Linking.canOpenURL(pdfUrl);
      
      if (canOpen) {
        await Linking.openURL(pdfUrl);
      } else {
        const gviewUrl = `https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`;
        await Linking.openURL(gviewUrl);
      }
    } catch (error) {
      Alert.alert(
        'Unable to Open Certificate',
        'Please make sure you have a PDF viewer app installed.',
        [
          { text: 'OK', style: 'cancel' },
          { 
            text: 'Try in Browser', 
            onPress: () => {
              Linking.openURL(pdfUrl).catch(() => {
                Alert.alert('Error', 'Could not open the certificate.');
              });
            }
          }
        ]
      );
    }
  };

  /* ===== PROFILE DATA FETCHING ===== */
  const fetchProfile = async ()=>{
    try {
      const res = await api.get('/restaurants/profile');
      const payload = res.data;
      const firstRestaurant = payload?.restaurants?.[0];
      
      setUser({
        name: payload?.name ?? 'User',
        email: payload?.email ?? '-',
        phone: payload?.phone ?? '-',
        cover: payload?.cover ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop',
        fssaiNo: firstRestaurant?.fssai_number ?? '—',
        fssaiCertUrl: getFssaiCertificateUrl(firstRestaurant),
        referral: payload?.referral_code ?? 'KNI-REF-0001',
        hotelsCount: payload?.stats?.hotels_count ?? 0,
        requests: payload?.stats?.requests_count ?? 0,
        rating: Number(payload?.rating ?? 0),
      });

      setHotels(
        (payload?.restaurants ?? []).map(r => ({
          id: String(r.id),
          name: r.hotel_name,
          address: r.address,
          rating: r.rating ?? 0,
          photo: r.photo ? `${IMAGE_BASE_URL}/${r.photo}` : null,
          fssaiNo: r.fssai_number,
          fssaiCertUrl: getFssaiCertificateUrl(r),
        }))
      );

      setReviews(
        (payload?.reviews ?? []).map(rv => ({
          id: String(rv.id),
          from: rv.author_name ?? 'Anonymous',
          text: rv.text ?? '',
          stars: rv.stars ?? 0,
        }))
      );
    } catch (e) {
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(()=>{
    const t = setTimeout(()=>{
      fetchProfile();
    }, 650);
    return ()=> clearTimeout(t);
  },[]);

  const onRefresh = ()=>{
    setRefreshing(true);
    fetchProfile();
  };

  /* ===== LOGOUT HANDLING ===== */
  const handleLogout = async () => {
    try {
      const provider = await AsyncStorage.getItem('authProvider');

      if (provider === 'google') {
        try { await auth().signOut(); } catch (e) {}
        try { await GoogleSignin.signOut(); } catch (e) {}
        try { await GoogleSignin.revokeAccess(); } catch (e) {}
      }
    } catch (e) {
      console.log('Logout error:', e?.message);
    } finally {
      await AsyncStorage.multiRemove([
        'authProvider', 'APP_TOKEN', 'userToken', 'ownerToken', 'ownerData', 'ownerId', 'token', 'user',
      ]);

      try { delete api.defaults.headers.common.Authorization; } catch (_) {}
      try { delete axios.defaults.headers.common.Authorization; } catch (_) {}

      navigation.reset({
        index: 0,
        routes: [{ name: 'RestaurantLogin' }],
      });
    }
  };

  const shareReferral = async ()=>{
    try{ 
      await Share.share({ 
        message: `Join me on KNI! Use my referral code: ${user?.referral ?? ''}` 
      }); 
    } catch(e) {}
  };

  /* ===== RENDER HELPERS ===== */
  const initial = ((user?.name || 'U')[0] || 'U').toUpperCase();
  const CARD_W = W * 0.88;
  const GAP = 14;
  const hotelsData = [...(hotels || []), { id: 'more', type: 'more' }];

  /* ===== SKELETON COMPONENTS ===== */
  const SkeletonProfile = () => (
    <View style={{padding:16}}>
      <View style={{flexDirection:'row', alignItems:'center'}}>
        <View style={{alignItems:'center'}}>
          <View style={[stSK.circle, {width:72, height:72}]} />
          <View style={[stSK.line, {width:84, height:22, marginTop:8}]} />
        </View>
        <View style={{flex:1, marginLeft:12}}>
          <View style={[stSK.line, {width:'60%', height:22}]} />
          <View style={[stSK.line, {width:'70%', height:14, marginTop:10}]} />
          <View style={[stSK.line, {width:'50%', height:14, marginTop:8}]} />
        </View>
      </View>
      <View style={[st.statsGlass, { marginTop:14 }]}>
        <View style={st.statCell}>
          <View style={[stSK.circle, {width:30, height:30}]} />
          <View style={[stSK.line, {width:40, height:14, marginTop:8}]} />
          <View style={[stSK.line, {width:48, height:10, marginTop:6}]} />
        </View>
        <View style={st.vline}/>
        <View style={st.statCell}>
          <View style={[stSK.circle, {width:30, height:30}]} />
          <View style={[stSK.line, {width:40, height:14, marginTop:8}]} />
          <View style={[stSK.line, {width:58, height:10, marginTop:6}]} />
        </View>
        <View style={st.vline}/>
        <View style={st.statCell}>
          <View style={[stSK.circle, {width:30, height:30}]} />
          <View style={[stSK.line, {width:40, height:14, marginTop:8}]} />
          <View style={[stSK.line, {width:68, height:10, marginTop:6}]} />
        </View>
      </View>
    </View>
  );

  /* ===== MAIN RENDER ===== */
  if (loading) {
    return <SkeletonProfileView insetsBottom={insets.bottom} />;
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* HERO SECTION */}
        <View style={[st.hero, { height: 220 }]}>
          <Image 
            source={{ uri: user?.cover ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop' }}
            style={StyleSheet.absoluteFillObject} 
            resizeMode="cover" 
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.28)' }]} />
          <View style={st.blobA}/>
          <View style={st.blobB}/>
          <View style={{position:'absolute', left:16, bottom:16, right:16}}>
            <Text style={{color:'#fff', fontWeight:'900', fontSize:20}}>Welcome back</Text>
            <Text style={{color:'#FFFFFFDD', marginTop:4}}>Keep your kitchen running like a pro 🔧</Text>
          </View>
        </View>

        {/* PROFILE + STATS */}
        <View style={st.stickyWrap}>
          <View style={st.heroBottomWrap}>
            <View style={st.avatarWrap}>
              <View style={st.avatar}><Text style={st.avatarTxt}>{initial}</Text></View>
              <View style={st.verifyPill}>
                <Icon name="shield-checkmark" size={14} color="#fff"/>
                <Text style={st.verifyTxt}>KNI Verified</Text>
              </View>
            </View>
            <View style={{flex:1, marginLeft:12}}>
              <Text style={st.name}>{user?.name ?? '-'}</Text>
              <Text style={st.meta}>{user?.email ?? '-'}</Text>
              <Text style={st.meta}>{user?.phone ?? '-'}</Text>
            </View>
            <TouchableOpacity
              onPress={()=>{
                const firstName = (user?.name || '').split(' ')[0] || '';
                const lastName  = (user?.name || '').split(' ').slice(1).join(' ') || '';
                navigation.navigate('EditOwnerProfile', {
                  initial: {
                    first_name: firstName,
                    last_name: lastName,
                    email: user?.email || '',
                    phone: user?.phone || '',
                    password: '',
                    restaurant_name: user?.restaurant_name || '',
                    locations: Number.isFinite(user?.locations) ? String(user.locations) : '0',
                  }
                });
              }}
            >
              <Icon name="create-outline" size={28} color={C.primary} style={{ marginBottom: 60 }}/>
            </TouchableOpacity>
          </View>
          
          <View style={[st.statsGlass, { marginTop:10, marginBottom:8 }]}>
            <View style={st.statCell}>
              <View style={st.statIcon}><Icon name="business-outline" size={16} color={C.primary}/></View>
              <Text style={st.statNum}>{user?.hotelsCount ?? 0}</Text>
              <Text style={st.statLbl}>Hotels</Text>
            </View>
            <View style={st.vline}/>
            <View style={st.statCell}>
              <View style={st.statIcon}><Icon name="clipboard-outline" size={16} color={C.primary}/></View>
              <Text style={st.statNum}>{user?.requests ?? 0}</Text>
              <Text style={st.statLbl}>Requests</Text>
            </View>
            <View style={st.vline}/>
            <View style={st.statCell}>
              <View style={st.statIcon}><Icon name="star" size={16} color="#F59E0B"/></View>
              <Text style={st.statNum}>{(user?.rating ?? 0).toFixed(1)}</Text>
              <Text style={st.statLbl}>Avg rating</Text>
            </View>
          </View>
        </View>

        {/* FSSAI CARD */}
        <View style={st.cardGlass}>
          <Text style={st.h2}>FSSAI</Text>
          <View style={st.row}>
            <View style={st.rowLeft}>
              <Icon name="document-text-outline" size={18} color={C.ink}/>
              <Text style={st.rowLbl}>Number</Text>
            </View>
            <Text style={st.rowVal}>{user?.fssaiNo ?? '—'}</Text>
          </View>
          <View style={st.row}>
            <View style={st.rowLeft}>
              <Icon name="link-outline" size={18} color={C.ink}/>
              <Text style={st.rowLbl}>Certificate</Text>
            </View>
            <TouchableOpacity onPress={viewPDF} style={st.viewBtn}>
              <Icon name="document-outline" size={14} color="#fff"/>
              <Text style={st.viewTxt}>View PDF</Text>
            </TouchableOpacity>
          </View>
          <View style={st.sep}/>
          <View style={{flexDirection:'row',alignItems:'center',marginTop:6}}>
            <View style={st.refChip}>
              <Icon name="gift-outline" size={16} color={C.primary}/>
              <Text style={st.refTxt}>{user?.referral ??'-'}</Text>
            </View>
            <TouchableOpacity onPress={shareReferral} style={st.shareBtn}>
              <Icon name="share-social-outline" size={16} color="#fff"/>
              <Text style={st.shareTxt}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* RESTAURANTS SECTION */}
        <View style={st.sectionHdr}>
          <Text style={st.sectionTitle}>Your Restaurants</Text>
          <TouchableOpacity onPress={()=>navigation.navigate('Restaurants')} style={{padding:8}}>
            <Text style={st.link}>Add new</Text>
          </TouchableOpacity>
        </View>

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
                  onPress={()=>navigation.navigate('Restaurants')}
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

        {/* REVIEWS SECTION */}
        <View style={[st.sectionHdr,{marginTop:16}]}>
          <Text style={st.sectionTitle}>What pros say</Text>
        </View>
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
        
        {/* QUICK ACCESS SECTION */}
        <View style={st.sectionHdr}>
          <Text style={st.sectionTitle}>Quick Access</Text>
        </View>
        <View style={st.quickAccessContainer}>
          <TouchableOpacity style={st.quickAccessButton} onPress={() => navigation.navigate('MyEquipment')}>
            <View style={st.quickAccessButtonContent}>
              <View style={[st.quickAccessIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="construct-outline" size={20} color="#3B82F6" />
              </View>
              <View style={st.quickAccessTextWrap}>
                <Text style={st.quickAccessTitle}>My Equipment</Text>
                <Text style={st.quickAccessSubtitle}>Manage your kitchen equipment</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[st.quickAccessButton, { borderBottomWidth: 0 }]} onPress={() => navigation.navigate('ServiceHistory')}>
            <View style={st.quickAccessButtonContent}>
              <View style={[st.quickAccessIcon, { backgroundColor: '#FEF3C7' }]}>
                <Icon name="time-outline" size={20} color="#F59E0B" />
              </View>
              <View style={st.quickAccessTextWrap}>
                <Text style={st.quickAccessTitle}>Service History</Text>
                <Text style={st.quickAccessSubtitle}>View spending & service reports</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* SETTINGS SECTION */}
        <View style={st.sectionHdr}>
          <Text style={st.sectionTitle}>Settings</Text>
        </View>
        <View style={st.quickAccessContainer}>
          <TouchableOpacity style={st.quickAccessButton} onPress={() => navigation.navigate('TeamManagement')}>
            <View style={st.quickAccessButtonContent}>
              <View style={[st.quickAccessIcon, { backgroundColor: '#F3E8FF' }]}>
                <Icon name="people-outline" size={20} color="#8B5CF6" />
              </View>
              <View style={st.quickAccessTextWrap}>
                <Text style={st.quickAccessTitle}>Team Management</Text>
                <Text style={st.quickAccessSubtitle}>Invite and manage team members</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={st.quickAccessButton} onPress={() => setPasswordModalVisible(true)}>
            <View style={st.quickAccessButtonContent}>
              <View style={[st.quickAccessIcon, { backgroundColor: '#FEF2F2' }]}>
                <Icon name="lock-closed-outline" size={20} color={C.primary} />
              </View>
              <View style={st.quickAccessTextWrap}>
                <Text style={st.quickAccessTitle}>Change Password</Text>
                <Text style={st.quickAccessSubtitle}>Update your account password</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>

          <TouchableOpacity style={[st.quickAccessButton, { borderBottomWidth: 0 }]} onPress={() => setNotificationModalVisible(true)}>
            <View style={st.quickAccessButtonContent}>
              <View style={[st.quickAccessIcon, { backgroundColor: '#EFF6FF' }]}>
                <Icon name="notifications-outline" size={20} color="#3B82F6" />
              </View>
              <View style={st.quickAccessTextWrap}>
                <Text style={st.quickAccessTitle}>Notification Settings</Text>
                <Text style={st.quickAccessSubtitle}>Manage notification preferences</Text>
              </View>
            </View>
            <Icon name="chevron-forward" size={20} color={C.muted} />
          </TouchableOpacity>
        </View>

        {/* ACCOUNT ACTIONS SECTION */}
        <View style={st.actionsContainer}>
          {/* LOGOUT BUTTON */}
          <TouchableOpacity style={st.actionButton} onPress={handleLogout}>
            <View style={st.actionButtonContent}>
              <Icon name="log-out-outline" size={20} color="#EF3A3A" />
              <Text style={st.actionButtonText}>Logout</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#EF3A3A" />
          </TouchableOpacity>

          {/* DELETE ACCOUNT BUTTON */}
          <TouchableOpacity style={[st.actionButton, st.deleteActionButton]} onPress={handleDeleteAccount}>
            <View style={st.actionButtonContent}>
              <Icon name="trash-outline" size={20} color="#DC2626" />
              <Text style={[st.actionButtonText, st.deleteActionText]}>Delete Account</Text>
            </View>
            <Icon name="chevron-forward" size={20} color="#DC2626" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* DELETE ACCOUNT MODAL */}
      <DeleteAccountModal
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        user={user}
      />

      {/* PASSWORD CHANGE MODAL */}
      <PasswordChangeModal
        visible={passwordModalVisible}
        onClose={() => setPasswordModalVisible(false)}
      />

      {/* NOTIFICATION SETTINGS MODAL */}
      <NotificationSettingsModal
        visible={notificationModalVisible}
        onClose={() => setNotificationModalVisible(false)}
        settings={notificationSettings}
        onSave={setNotificationSettings}
      />

      <KniBottomNav
        navigation={navigation}
        active="profile"
        cartCount={cartCount}
        notifCount={0}
      />
    </SafeAreaView>
  );
}

/* ===== SKELETON VIEW ===== */
function SkeletonProfileView({ insetsBottom=0 }) {
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
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
      <ScrollView
        refreshControl={<RefreshControl refreshing={true} onRefresh={()=>{}} colors={[C.primary]} tintColor={C.primary}/>}
        contentContainerStyle={{ paddingBottom: insetsBottom + 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SKELETON */}
        <Animated.View style={[stSK.hero, { height:220, opacity:pulse }]} />
        
        {/* PROFILE SKELETON */}
        <View style={st.stickyWrap}>
          <View style={{padding:16}}>
            <View style={{flexDirection:'row', alignItems:'center'}}>
              <View style={{alignItems:'center'}}>
                <Animated.View style={[stSK.circle, {width:72, height:72, opacity:pulse}]} />
                <Animated.View style={[stSK.line, {width:84, height:22, marginTop:8, opacity:pulse}]} />
              </View>
              <View style={{flex:1, marginLeft:12}}>
                <Animated.View style={[stSK.line, {width:'60%', height:22, opacity:pulse}]} />
                <Animated.View style={[stSK.line, {width:'70%', height:14, marginTop:10, opacity:pulse}]} />
                <Animated.View style={[stSK.line, {width:'50%', height:14, marginTop:8, opacity:pulse}]} />
              </View>
            </View>
            <View style={[st.statsGlass, { marginTop:14 }]}>
              {[0,1,2].map(i=>(
                <View key={i} style={st.statCell}>
                  <Animated.View style={[stSK.circle, {width:30, height:30, opacity:pulse}]} />
                  <Animated.View style={[stSK.line, {width:40, height:14, marginTop:8, opacity:pulse}]} />
                  <Animated.View style={[stSK.line, {width:i===0?48:i===1?58:68, height:10, marginTop:6, opacity:pulse}]} />
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* FSSAI SKELETON */}
        <View style={st.cardGlass}>
          <Animated.View style={[stSK.line, {width:90, height:18, opacity:pulse}]} />
          <View style={{marginTop:12}}>
            <View style={[st.row,{paddingVertical:6}]}>
              <View style={st.rowLeft}>
                <Animated.View style={[stSK.circle, {width:22, height:22, opacity:pulse}]} />
                <Animated.View style={[stSK.line, {width:80, height:14, marginLeft:8, opacity:pulse}]} />
              </View>
              <Animated.View style={[stSK.line, {width:160, height:16, opacity:pulse}]} />
            </View>
            <View style={[st.row,{paddingVertical:6}]}>
              <View style={st.rowLeft}>
                <Animated.View style={[stSK.circle, {width:22, height:22, opacity:pulse}]} />
                <Animated.View style={[stSK.line, {width:90, height:14, marginLeft:8, opacity:pulse}]} />
              </View>
              <Animated.View style={[stSK.line, {width:84, height:32, opacity:pulse}]} />
            </View>
          </View>
        </View>

        <View style={{height:20}} />
      </ScrollView>

      <KniBottomNav
        navigation={{}}
        active="profile"
        cartCount={0}
        notifCount={0}
      />
    </SafeAreaView>
  );
}

/* ===== STYLES ===== */
const st = StyleSheet.create({
  hero:{ width:'100%', borderBottomLeftRadius:28, borderBottomRightRadius:28, overflow:'hidden', justifyContent:'flex-end' },
  blobA:{ position:'absolute', width:160, height:160, borderRadius:100, backgroundColor:'#EF3A3A33', top:-30, left:-30 },
  blobB:{ position:'absolute', width:220, height:220, borderRadius:120, backgroundColor:'#1D225422', bottom:-70, right:-50 },
  stickyWrap:{ backgroundColor:'#ffffffff', borderBottomWidth:1, borderBottomColor:'#EEF2F7' },
  heroBottomWrap:{ flexDirection:'row', alignItems:'center', padding:16, backgroundColor:'rgba(255, 255, 255, 1)' },
  avatarWrap:{ alignItems:'center' },
  avatar:{ width:72, height:72, borderRadius:22, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center',
    borderWidth:2, borderColor:'#FFFFFFAA', shadowColor:'#000', shadowOpacity:0.2, shadowRadius:8, elevation:6 },
  avatarTxt:{ color:C.primary, fontSize:30, fontWeight:'900' },
  name:{ color:C.ink, fontWeight:'900', fontSize:22 },
  meta:{ color:C.muted, marginTop:2 },
  verifyPill:{ flexDirection:'row', alignItems:'center', backgroundColor:C.ok, paddingHorizontal:10, paddingVertical:6, borderRadius:999, marginTop:8 },
  verifyTxt:{ color:'#fff', marginLeft:6, fontWeight:'800', fontSize:12 },
  statsGlass:{ marginHorizontal:16, backgroundColor:'#FFFFFFCC', borderRadius:R, borderWidth:1, borderColor:'#EEF2F7',
    flexDirection:'row', alignItems:'center', paddingVertical:14, paddingHorizontal:12,
    shadowColor:'#000', shadowOpacity:0.12, shadowRadius:10, shadowOffset:{ width:0, height:6 } },
  statCell:{ flex:1, alignItems:'center' },
  statIcon:{ width:30, height:30, borderRadius:10, backgroundColor:'#FFE8E8', alignItems:'center', justifyContent:'center', marginBottom:6 },
  statNum:{ color:C.ink, fontWeight:'900', fontSize:18 },
  statLbl:{ color:C.muted, fontSize:12 },
  vline:{ width:1, height:42, backgroundColor:'#E5E7EB' },
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
  hotelHeroCard:{ height: 200, borderRadius:R, overflow:'hidden', borderWidth:1, borderColor:'#EEF2F7', backgroundColor:'#fff',
    shadowColor:'#000', shadowOpacity:0.08, shadowRadius:8, elevation:5 },
  hotelHeroImg:{ ...StyleSheet.absoluteFillObject, width:'100%', height:'100%' },
  heroOverlay:{ ...StyleSheet.absoluteFillObject, backgroundColor:'rgba(0,0,0,0.20)' },
  hotelHeroBody:{ position:'absolute', left:14, right:14, bottom:12, backgroundColor:'#FFFFFFEE',
    borderRadius:14, padding:12, borderWidth:1, borderColor:'#EEF2F7' },
  hotelHeroName:{ color:C.text, fontWeight:'900', fontSize:16 },
  hotelHeroAddr:{ color:C.muted, fontSize:12, marginTop:2 },
  hotelRateTxt:{ color:C.muted, fontSize:12 },
  viewMoreBox:{ alignItems:'center', justifyContent:'center', borderWidth:2, borderStyle:'dashed', borderColor:'#CBD5E1',
    paddingVertical:26, paddingHorizontal:18, borderRadius:16, backgroundColor:'#FFFFFFF2' },
  viewMoreTxt:{ marginTop:8, fontWeight:'900', color:C.ink, fontSize:16 },
  // Quick access section styles
  quickAccessContainer: {
    backgroundColor: '#ffffffff',
    borderRadius: 12,
    marginHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#707070ff',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  quickAccessButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  quickAccessButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  quickAccessIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  quickAccessTextWrap: {
    flex: 1,
  },
  quickAccessTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  quickAccessSubtitle: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  // New styles for account actions
  actionsContainer: {
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    marginHorizontal: 15,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#707070ff',
    shadowOpacity: 0.06,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  deleteActionButton: {
    borderBottomWidth: 0, // Remove border for last item
  },
  actionButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#EF3A3A',
    fontWeight: '600',
  },
  deleteActionText: {
    color: '#DC2626',
  },
  revPill:{ width: W*0.7, backgroundColor:'#FFF', borderRadius:16, borderWidth:1, borderColor:'#EEF2F7', padding:12,
    shadowColor:'#000', shadowOpacity:0.04, shadowRadius:6, elevation:2 },
  revFromMini:{ color:C.ink, fontWeight:'900', marginBottom:4 },
  revTxtMini:{ color:C.text, lineHeight:18 },
});

/* ===== MODAL STYLES ===== */
const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.ink,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
    maxHeight: '80%',
  },
  warningBox: {
    flexDirection: 'row',
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'flex-start',
  },
  warningText: {
    color: '#DC2626',
    marginLeft: 12,
    flex: 1,
    fontWeight: '500',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 16,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  optionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 4,
  },
  optionDetail: {
    fontSize: 12,
    color: C.primary,
    fontWeight: '500',
  },
  infoCard: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  infoLabel: {
    fontSize: 14,
    color: C.muted,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: C.ink,
  },
  infoItem: {
    fontSize: 14,
    color: C.muted,
    marginBottom: 6,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: C.ink,
  },
});

/* ===== SKELETON STYLES ===== */
const stSK = StyleSheet.create({
  hero:{ width:'100%', backgroundColor:'#E9EEF5' },
  circle:{ backgroundColor:'#E9EEF5', borderRadius:999 },
  line:{ backgroundColor:'#E9EEF5', borderRadius:8 },
});

/* ===== PASSWORD CHANGE MODAL STYLES ===== */
const pwStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.ink,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    marginTop: 16,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F7FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 14,
    color: C.text,
  },
  eyeBtn: {
    padding: 12,
  },
  tipBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#EFF6FF',
    padding: 12,
    borderRadius: 10,
    marginTop: 20,
    gap: 10,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    color: '#3B82F6',
    lineHeight: 18,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  saveButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});

/* ===== NOTIFICATION SETTINGS MODAL STYLES ===== */
const notifStyles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: C.ink,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 12,
    marginTop: 16,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  toggleIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#FFE8E8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toggleInfo: {
    flex: 1,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  toggleDesc: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
  modalFooter: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  saveButton: {
    flex: 1,
    backgroundColor: C.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#fff',
  },
});