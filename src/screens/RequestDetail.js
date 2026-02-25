// // src/screens/RequestDetail.js
// import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
// import {
//   View, Text, StyleSheet, Image, ImageBackground, Animated, Easing,
//   TouchableOpacity, ScrollView, FlatList, Share, RefreshControl, Alert
// } from 'react-native';
// import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
// import { useFocusEffect } from '@react-navigation/native';
// import Icon from 'react-native-vector-icons/Ionicons';
// import { api } from '../api/client';
// import AsyncStorage from '@react-native-async-storage/async-storage';

// /* ---------- THEME ---------- */
// const C = {
//   primary: '#EF3A3A', ink: '#1D2254', bg: '#F5F7FA', card: '#FFFFFF',
//   text: '#0F172A', muted: '#6B7280', border: '#E5E7EB', ok: '#10B981',
//   warn: '#F59E0B', danger: '#EF4444',
// };
// const R = 18;

// /* ---------- FALLBACKS ---------- */
// const FALLBACK_IMAGES = [
//   'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp',
//   'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-detailed-depiction-of-a-commercial-refrigerator-repair-scene-in-a-wide-format.-The-image-shows-a-skilled-technician-wearing-a-uniform-and-equipped-1.webp',
//   'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-busy-commercial-kitchen-repair-scene-showing-an-array-of-diverse-refrigerators-open-with-their-mechanics-visible.-Various-tools-are-scattered-around-1-1024x585.webp',
//   'https://images.unsplash.com/photo-1556909114-23622d5b5b51?q=80&w=1500&auto=format&fit=crop',
//   'https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1500&auto=format&fit=crop',
// ];
// const FALLBACK_SERVICES = [
//   { id: 1, name: 'Site Visit', price: 499 },
//   { id: 2, name: 'Compressor Service', price: 1299 },
//   { id: 3, name: 'Gas Refill', price: 1699 },
//   { id: 4, name: 'Thermostat Change', price: 899 },
// ];
// const FALLBACK_INCLUDED = ['Multi-point inspection', 'Basic exterior clean', 'Minor tuning', 'Completion photos'];
// const FALLBACK_EXCLUDED = ['Major spares', 'Civil/electrical work', 'Inaccessible units'];
// const FALLBACK_CONDITIONS = [
//   'Final price post diagnosis & your approval.',
//   '3-month labor warranty (no warranty on consumables).',
//   'Visit fee adjusted in final bill if service taken.',
// ];
// const FALLBACK_FAQS = [
//   { id: 'f1', q: 'How soon can I get a visit?', a: 'Usually within 4–8 working hours in metro cities.' },
//   { id: 'f2', q: 'Do you use genuine spares?', a: 'Yes, OEM or high-quality compatible parts with bill.' },
//   { id: 'f3', q: 'If I don’t go ahead?', a: 'Only the diagnostic/visit fee is applicable.' },
// ];

// /* ---------- STATIC ---------- */
// const processSteps = [
//   { icon: 'apps-outline',        title: 'Raise Request', desc: 'Pick services & submit.' },
//   { icon: 'construct-outline',   title: 'Assign Pro',    desc: 'Nearest certified tech scheduled.' },
//   { icon: 'build-outline',       title: 'On-site Work',  desc: 'Diagnosis + transparent fix.' },
//   { icon: 'card-outline',        title: 'Pay & Rate',    desc: 'UPI/QR & share feedback.' },
// ];

// /* ---------- UTILS ---------- */
// const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
// const Rs = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
// const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// const Stars = React.memo(({ value, size = 12 }) => {
//   const v = clamp(Math.round(value || 0), 0, 5);
//   return (
//     <View style={{ flexDirection: 'row' }}>
//       {Array.from({ length: 5 }).map((_, i) => (
//         <Icon key={i} name={i < v ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
//       ))}
//     </View>
//   );
// });

// /* ---------- FAQ ITEM ---------- */
// const FAQItem = React.memo(({ f }) => {
//   const [open, setOpen] = useState(false);
//   return (
//     <View style={st.faqItem}>
//       <TouchableOpacity style={st.faqHead} onPress={() => setOpen(o => !o)} accessibilityRole="button">
//         <Text style={st.faqQ}>{f.q}</Text>
//         <Icon name={open ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={C.ink} />
//       </TouchableOpacity>
//       {open && <Text style={st.faqA}>{f.a}</Text>}
//     </View>
//   );
// });

// /* ---------- SKELETON ---------- */
// function SkeletonRequestDetail({ insetsBottom }) {
//   const pulse = useRef(new Animated.Value(0.6)).current;
//   useEffect(() => {
//     const loop = Animated.loop(
//       Animated.sequence([
//         Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
//         Animated.timing(pulse, { toValue: 0.6, duration: 900, useNativeDriver: false }),
//       ])
//     );
//     loop.start();
//     return () => loop.stop();
//   }, [pulse]);

//   const ServiceChip = () => (
//     <View style={[st.serviceChip, { width: scale(220) }]}>
//       <View style={{ flex: 1 }}>
//         <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
//         <Animated.View style={[sk.lineSm, { width: scale(80), marginTop: scale(6), opacity: pulse }]} />
//       </View>
//       <Animated.View style={[sk.btnPill, { opacity: pulse }]} />
//     </View>
//   );

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
//       <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
//         <Animated.View style={[sk.hero, { opacity: pulse }]} />
//         <View style={[st.actionsWrap, { paddingTop: scale(8) }]}>
//           <View style={sk.glassBtn} />
//           <View style={[sk.glassBtn, { marginLeft: scale(8) }]} />
//         </View>
//         <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: scale(70), height: scale(4), backgroundColor: '#FFFFFF55', borderRadius: scale(3) }} />
//         <View style={st.heroBottom}>
//           <View style={{ flex: 1 }}>
//             <Animated.View style={[sk.lineLg, { width: '60%', opacity: pulse }]} />
//             <Animated.View style={[sk.lineSm, { width: scale(140), marginTop: scale(6), opacity: pulse }]} />
//           </View>
//           <View style={sk.ratingPill} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + 100 }} showsVerticalScrollIndicator={false}>
//         <View style={st.section}>
//           <Animated.View style={[sk.h2, { width: scale(100), opacity: pulse }]} />
//           <Animated.View style={[sk.para, { width: '95%', marginTop: scale(8), opacity: pulse }]} />
//           <Animated.View style={[sk.para, { width: '85%', marginTop: scale(6), opacity: pulse }]} />
//         </View>

//         <View style={st.section}>
//           <Animated.View style={[sk.h2, { width: scale(130), opacity: pulse }]} />
//           <Animated.View style={[sk.lineXs, { width: scale(220), marginTop: scale(6), opacity: pulse }]} />
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: scale(16), marginTop: scale(10) }}>
//             {[0,1,2].map(i => <ServiceChip key={i} />)}
//           </ScrollView>
//         </View>
//       </ScrollView>

//       <View style={[st.cartBar, { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 }]}>
//         <View style={{ flex:1 }}>
//           <Animated.View style={[sk.lineXs, { width: scale(120), opacity: pulse }]} />
//           <Animated.View style={[sk.lineMd, { width: scale(80), marginTop:scale(6), opacity: pulse }]} />
//         </View>
//         <View style={sk.primaryBtn} />
//       </View>
//     </SafeAreaView>
//   );
// }

// /* ---------- MAIN ---------- */
// export default function RequestDetail({ navigation, route }) {
//   const insets = useSafeAreaInsets();
//   const productId = route?.params?.id ?? route?.params?.productId ?? null;

//   // --- READ OWNER ID FROM ANY KEY ---
//   const [ownerId, setOwnerId] = useState(null);
//   useEffect(() => {
//     (async () => {
//       try {
//         const a = await AsyncStorage.getItem('owner_id');
//         const b = await AsyncStorage.getItem('restaurant_owner_id');
//         const c = await AsyncStorage.getItem('ownerId');
//         const chosen = Number(a || b || c || 0);
//         if (Number.isFinite(chosen) && chosen > 0) setOwnerId(chosen);
//         else setOwnerId(null);
//       } catch {
//         setOwnerId(null);
//       }
//     })();
//   }, []);

//   // Build service->product map
//   const [svc2prod, setSvc2prod] = useState({});
//   useEffect(() => {
//     (async () => {
//       try {
//         const res = await api.get('/app/services', { params: ownerId ? { owner_id: ownerId } : {} });
//         const arr = Array.isArray(res?.data) ? res.data
//                   : Array.isArray(res?.data?.data) ? res.data.data : [];
//         const m = {};
//         arr.forEach(s => {
//           const sid = Number(s.id);
//           const pid = Number(s.product_id);
//           if (sid > 0 && pid > 0) m[sid] = pid;
//         });
//         setSvc2prod(m);
//       } catch { setSvc2prod({}); }
//     })();
//   }, [ownerId]);

//   const headerItem = route?.params?.item ?? {
//     title: 'Commercial Fridge Service',
//     category: 'Fridge',
//     rating: 4.8,
//     requests: 1225,
//     desc: 'Cooling issues, gas refill, thermostat faults & preventive maintenance.',
//   };

//   const [prod, setProd] = useState({
//     title: headerItem.title,
//     description: headerItem.desc,
//     storyImages: FALLBACK_IMAGES,
//     included: FALLBACK_INCLUDED,
//     excluded: FALLBACK_EXCLUDED,
//     conditions: FALLBACK_CONDITIONS,
//     faqs: FALLBACK_FAQS,
//     services: FALLBACK_SERVICES,
//   });

//   const [technicians, setTechnicians] = useState([]);
//   const [reviews, setReviews] = useState([]);
//   const [loading, setLoading] = useState(true);
//   const [networkErr, setNetworkErr] = useState('');
//   const [refreshing, setRefreshing] = useState(false);

//   /** backoff for 429/5xx */
//   const safeGet = useCallback(async (url, tries = 2, params = {}) => {
//     for (let i = 0; i <= tries; i++) {
//       try { return await api.get(url, { params }); }
//       catch (e) {
//         const code = e?.response?.status;
//         if (i === tries || !(code === 429 || (code >= 500 && code <= 599))) throw e;
//         await new Promise(r => setTimeout(r, 600 * (i + 1)));
//       }
//     }
//   }, []);

//   const normalizeArray = (val, fb = []) => (Array.isArray(val) && val.length ? val : fb);

//   /** Technicians */
//   const fetchTechnicians = useCallback(async (serviceId) => {
//     const qs = (serviceId !== undefined && serviceId !== null && String(serviceId) !== '')
//       ? { service_id: String(serviceId) } : {};
//     const res = await safeGet('/app/technicians', 2, ownerId ? { ...qs, owner_id: ownerId } : qs);
//     const payload = res?.data;
//     const arr = Array.isArray(payload) ? payload : [];
//     const mapped = arr.map((t) => ({
//       id: String(t.id ?? ''),
//       name: t.name || 'Unknown',
//       avatar: (t.avatar && typeof t.avatar === 'string' && t.avatar.startsWith('http')) ? t.avatar : '',
//       rating: Number.isFinite(Number(t.rating)) ? Number(t.rating) : 0,
//       jobs: Number.isFinite(Number(t.jobs)) ? Number(t.jobs) : 0,
//     })).filter(x => x.id);
//     const top3 = mapped.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
//     setTechnicians(top3);
//   }, [ownerId, safeGet]);

//   /** Reviews */
//   const fetchReviews = useCallback(async (productIdMaybe) => {
//     const candidates = [
//       productIdMaybe ? `/app/products/${productIdMaybe}/reviews` : null,
//       `/app/engineer-reviews`,
//       `/engineer-reviews`,
//     ].filter(Boolean);

//     let payload = [];
//     for (const path of candidates) {
//       try {
//         const res = await safeGet(path, 2, ownerId ? { owner_id: ownerId } : {});
//         const raw = res?.data;
//         const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
//         if (list.length) { payload = list; break; }
//       } catch {}
//     }

//     if (!payload.length) { setReviews([]); return; }

//     const mapped = payload.map((r, i) => ({
//       id: String(r.id ?? i),
//       name: r.customer_name || r.user_name || r.name || 'Anonymous',
//       stars: Number.isFinite(Number(r.rating || r.stars)) ? Number(r.rating || r.stars) : 0,
//       text: r.comment || r.review || r.text || '',
//       when: r.created_at || r.createdAt || null,
//     })).sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));

//     setReviews(mapped.slice(0, 3));
//   }, [ownerId, safeGet]);

//   const fetchAll = useCallback(async () => {
//     setNetworkErr(''); setLoading(true);
//     let serviceIdForTech;
//     try {
//       if (productId) {
//         const res = await safeGet(`/app/products/${productId}`, 2, ownerId ? { owner_id: ownerId } : {});
//         const d = res?.data ?? {};

//         const storyImages = normalizeArray(d.storyImages, FALLBACK_IMAGES);
//         const included = normalizeArray(d.included, FALLBACK_INCLUDED);
//         const excluded = normalizeArray(d.excluded, FALLBACK_EXCLUDED);
//         const conditions = normalizeArray(d.conditions, FALLBACK_CONDITIONS);
//         const faqs = normalizeArray(d.faqs, FALLBACK_FAQS);
//         const servicesFromProduct = normalizeArray(d.services, []);

//         serviceIdForTech = servicesFromProduct?.[0]?.id;

//         let services = FALLBACK_SERVICES;
//         if (!servicesFromProduct.length) {
//           try {
//             const srvRes = await safeGet('/app/services', 2, ownerId ? { owner_id: ownerId } : {});
//             const arr = Array.isArray(srvRes?.data) ? srvRes.data
//               : Array.isArray(srvRes?.data?.data) ? srvRes.data.data : [];
//             services = normalizeArray(
//               arr.map((s) => ({
//                 id: Number(s.id),
//                 name: s.title || s.name || `Service #${s.id}`,
//                 price: Number(s.price || s.mrp || 0),
//               })), FALLBACK_SERVICES
//             );
//           } catch { services = FALLBACK_SERVICES; }
//         } else {
//           services = servicesFromProduct.map((s) => ({
//             id: Number(s.id),
//             name: s.title || s.name || `Service #${s.id}`,
//             price: Number(s.price || s.mrp || 0),
//           }));
//         }

//         storyImages.slice(0, 3).forEach((uri) => Image.prefetch(uri).catch(()=>{}));

//         setProd({
//           title: d.title || headerItem.title,
//           description: d.description || headerItem.desc,
//           storyImages, included, excluded, conditions, faqs, services,
//         });
//       } else {
//         try {
//           const srvRes = await safeGet('/app/services', 2, ownerId ? { owner_id: ownerId } : {});
//           const arr = Array.isArray(srvRes?.data) ? srvRes.data
//             : Array.isArray(srvRes?.data?.data) ? srvRes.data.data : [];
//           const services = normalizeArray(
//             arr.map((s) => ({
//               id: Number(s.id),
//               name: s.title || s.name || `Service #${s.id}`,
//               price: Number(s.price || s.mrp || 0),
//             })), FALLBACK_SERVICES
//           );
//           setProd(p => ({ ...p, services }));
//         } catch {}
//       }
//     } catch (e) {
//       setNetworkErr(e?.message || 'Failed to load product');
//     } finally {
//       try { await fetchTechnicians(serviceIdForTech); } catch { setTechnicians([]); }
//       try { await fetchReviews(productId || null); } catch { setReviews([]); }
//       setLoading(false);
//     }
//   }, [fetchTechnicians, fetchReviews, headerItem.desc, headerItem.title, ownerId, productId, safeGet]);

//   useEffect(() => { fetchAll(); }, [fetchAll]);

//   /* ---------- HERO PROGRESS ---------- */
//   const [idx, setIdx] = useState(0);
//   const bar = useRef(new Animated.Value(0)).current;
//   const PROG = 10000;
//   const images = prod.storyImages?.length ? prod.storyImages : FALLBACK_IMAGES;

//   const run = useCallback(() => {
//     bar.stopAnimation();
//     bar.setValue(0);
//     Animated.timing(bar, { toValue: 1, duration: PROG, easing: Easing.linear, useNativeDriver: false })
//       .start(({ finished }) => { if (finished && images.length) setIdx(p => (p + 1) % images.length); });
//   }, [bar, images.length]);

//   useEffect(() => {
//     if (loading) { bar.stopAnimation(); return; }
//     run();
//     return () => bar.stopAnimation();
//   }, [idx, loading, run]);

//   /* ---------- CART ---------- */
//   const [cart, setCart] = useState({});
//   const hydratedRef = useRef({ local: false, server: false });
//   const lastSyncedRef = useRef({}); // product_id -> quantity snapshot

//   const [ownerKey, setOwnerKey] = useState('global');
//   useEffect(() => {
//     (async () => {
//       try {
//         const from1 = await AsyncStorage.getItem('owner_id');
//         const from2 = await AsyncStorage.getItem('restaurant_owner_id');
//         const from3 = await AsyncStorage.getItem('ownerId');
//         const id = String(from1 || from2 || from3 || '').trim();
//         setOwnerKey(id ? `owner:${id}` : 'global');
//       } catch { setOwnerKey('global'); }
//     })();
//   }, []);

//   const persistKey = useMemo(
//     () => `rdraft:${ownerKey}:${productId || 'global'}`,
//     [ownerKey, productId]
//   );

//   // reverse map product->service for server items
//   const prod2svc = useMemo(() => {
//     const m = {};
//     Object.entries(svc2prod || {}).forEach(([sid, pid]) => { if (pid) m[Number(pid)] = Number(sid); });
//     // allow identity mapping if svc2prod is empty
//     return Object.keys(cart || {}).reduce((acc, sidStr) => {
//       const sid = Number(sidStr);
//       if (!(sid in acc)) acc[sid] = sid;
//       return acc;
//     }, m);
//   }, [svc2prod, cart]);

//   // hydrate local draft (initial)
//   useEffect(() => {
//     if (!persistKey) return;
//     (async () => {
//       try {
//         const raw = await AsyncStorage.getItem(persistKey);
//         if (raw) {
//           const saved = JSON.parse(raw);
//           if (saved && typeof saved === 'object') {
//             setCart(prev => ({ ...prev, ...saved }));
//           }
//         }
//       } catch {}
//       hydratedRef.current.local = true;
//     })();
//   }, [persistKey, ownerKey]);

//   // --- ⭐ Rehydrate when screen is focused (reflect changes from RequestNow) ---
//   const rehydrateLocalDraft = useCallback(async () => {
//     if (!persistKey) return;
//     try {
//       const raw = await AsyncStorage.getItem(persistKey);
//       const saved = raw ? JSON.parse(raw) : {};
//       if (saved && typeof saved === 'object') {
//         setCart(saved);
//       }
//     } catch {}
//   }, [persistKey]);

//   useFocusEffect(
//     useCallback(() => {
//       let cancelled = false;
//       (async () => {
//         if (!cancelled) await rehydrateLocalDraft();
//       })();
//       return () => { cancelled = true; };
//     }, [rehydrateLocalDraft])
//   );

//   // Also rehydrate if persistKey flips (owner/product changed)
//   useEffect(() => { rehydrateLocalDraft(); }, [rehydrateLocalDraft]);

//   // hydrate from server (snapshot only)
//   useEffect(() => {
//     (async () => {
//       try {
//         const params = ownerId ? { owner_id: ownerId } : {};
//         const res = await api.get('/app/cart', { params });
//         const data = res?.data?.cart ? res.data.cart : res?.data;
//         const items = Array.isArray(data?.items) ? data.items : [];

//         lastSyncedRef.current = {};
//         items.forEach(it => {
//           const pid = Number(it.product_id || 0);
//           const qty = Number(it.quantity || 0);
//           if (pid && qty >= 0) lastSyncedRef.current[pid] = qty;
//         });

//         if (!items.length) { hydratedRef.current.server = true; return; }

//         const fromServer = {};
//         items.forEach(it => {
//           const pid = Number(it.product_id || 0);
//           const sid = prod2svc[pid];
//           const qty = Number(it.quantity || 0);
//           if (sid && qty > 0) fromServer[sid] = qty;
//         });
//         setCart(prev => ({ ...prev, ...fromServer }));
//       } catch {}
//       hydratedRef.current.server = true;
//     })();
//   }, [ownerId, prod2svc]);

//   // local autosave
//   const persistDraftDebounced = useRef(
//     debounce(async () => {
//       try {
//         await AsyncStorage.setItem(persistKey, JSON.stringify(cart || {}));
//       } catch {}
//     }, 400)
//   ).current;
//   useEffect(() => { persistDraftDebounced(); }, [cart, persistDraftDebounced]);
//   useEffect(() => { persistDraftDebounced(); }, [svc2prod]);
//   useEffect(() => {
//     return () => {
//       AsyncStorage.setItem(persistKey, JSON.stringify(cart || {})).catch(()=>{});
//     };
//   }, [persistKey, cart]);

//   /* ---------- IMMEDIATE SERVER WRITE HELPERS ---------- */
//   const serviceIdToProductId = useCallback((sid) => {
//     const pid = Number(svc2prod[sid] ?? sid);
//     return Number.isFinite(pid) && pid > 0 ? pid : null;
//   }, [svc2prod]);

//   const writeServerQuantity = useCallback(async (sid, quantity) => {
//     if (!ownerId) return; // UI shows banner; no server write without owner
//     const pid = serviceIdToProductId(sid);
//     if (!pid) return;

//     try {
//       if (quantity > 0) {
//         await api.put(`/app/cart/items/${pid}`, { quantity }, { params: { owner_id: ownerId } });
//       } else {
//         await api.delete(`/app/cart/items/${pid}`, { params: { owner_id: ownerId } });
//       }
//     } catch (e) {
//       const status = e?.response?.status;
//       const data = e?.response?.data;
//       console.log('SERVER WRITE FAIL', status, data);
//       Alert.alert('Network', 'Could not save your selection to server right now.');
//     }
//   }, [ownerId, serviceIdToProductId]);

//   // Replace add/sub: update local + write to server immediately
//   const add = useCallback((sid) => {
//     setCart(prev => {
//       const nextQty = (prev[sid] || 0) + 1;
//       const next = { ...prev, [sid]: nextQty };
//       writeServerQuantity(sid, nextQty);
//       return next;
//     });
//   }, [writeServerQuantity]);

//   const sub = useCallback((sid) => {
//     setCart(prev => {
//       const nextQty = Math.max(0, (prev[sid] || 0) - 1);
//       const next = { ...prev };
//       if (nextQty === 0) delete next[sid]; else next[sid] = nextQty;
//       writeServerQuantity(sid, nextQty);
//       return next;
//     });
//   }, [writeServerQuantity]);

//   /* ---------- TOTALS ---------- */
//   const totals = useMemo(() => {
//     try {
//       let items = 0, amt = 0;
//       (prod.services || []).forEach((s) => {
//         const q = cart[s.id] || 0;
//         items += q; amt += q * Number(s.price || 0);
//       });
//       return { items, amt };
//     } catch { return { items: 0, amt: 0 }; }
//   }, [cart, prod.services]);

//   const shareIt = useCallback(async () => {
//     try {
//       await Share.share({
//         title: prod.title,
//         message: `${prod.title} • ${headerItem.category}\n${prod.description}\n\nKNI – Pro Kitchen Services`,
//       });
//     } catch {}
//   }, [headerItem.category, prod.description, prod.title]);
  
// // --- params we pass to RequestNow (so it can read from route.params) ---
//   const requestNowParams = useMemo(() => {
//     return {
//      productId: String(productId ?? 'global'),
//       productTitle: prod?.title || 'Commercial Fridge',
//       category: headerItem?.category || 'Commercial',
//       subtitle: route?.params?.description || '',
//       heroImage: (prod?.storyImages?.[0]) || FALLBACK_IMAGES[0],
//       services: Array.isArray(prod?.services) ? prod.services : [],
//       cart,                // { [service_id]: qty }
//       ownerId,             // helps RequestNow resolve ownerKey consistently
//     };
//   }, [productId, prod?.title, prod?.storyImages, prod?.services, headerItem?.category, route?.params?.subtitle, cart, ownerId]);

//   const onRefresh = useCallback(async () => {
//     setRefreshing(true);
//     await fetchAll();
//     setRefreshing(false);
//   }, [fetchAll]);

//   const keyService = useCallback((s) => String(s.id), []);
//   const getServiceLayout = useCallback((_, i) => ({ length: 230, offset: 230 * i, index: i }), []);

//   const renderService = useCallback(({ item: s }) => {
//     const q = cart[s.id] || 0;
//     return (
//       <View style={[st.serviceChip, { width: scale(220) }]}>
//         <View style={{ flex: 1 }}>
//           <Text style={st.serviceTitle}>{s.name}</Text>
//           <Text style={st.servicePrice}>{Rs(s.price)}</Text>
//         </View>
//         {q === 0 ? (
//           <TouchableOpacity onPress={() => add(s.id)} style={st.addBtnSm}>
//             <Icon name="add" size={scale(18)} color="#fff" /><Text style={st.addTxt}>Add</Text>
//           </TouchableOpacity>
//         ) : (
//           <View style={st.counterSm}>
//             <TouchableOpacity onPress={() => sub(s.id)} style={st.counterBtnSm}><Icon name="remove" size={scale(18)} color={C.primary} /></TouchableOpacity>
//             <Text style={st.qty}>{q}</Text>
//             <TouchableOpacity onPress={() => add(s.id)} style={st.counterBtnSm}><Icon name="add" size={scale(18)} color={C.primary} /></TouchableOpacity>
//           </View>
//         )}
//       </View>
//     );
//   }, [add, cart, sub]);

//   const keyTech = useCallback((t) => String(t.id), []);
//   const renderTech = useCallback(({ item: t }) => {
//     const rating = Number.isFinite(Number(t.rating)) ? Number(t.rating) : 0;
//     const jobs   = Number.isFinite(Number(t.jobs)) ? Number(t.jobs) : 0;
//     const avatar = (t.avatar && typeof t.avatar === 'string' && t.avatar.startsWith('http'))
//       ? t.avatar
//       : FALLBACK_IMAGES[0];

//     return (
//       <View style={st.techCard}>
//         <ImageBackground
//           source={{ uri: avatar }}
//           style={st.techPic}
//           imageStyle={{ borderRadius: scale(12) }}
//         />
//         <View style={{ flex: 1, marginLeft: scale(10), minWidth: 0 }}>
//           <Text style={st.techName} numberOfLines={1}>{t.name}</Text>
//           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(2) }}>
//             <Text style={st.techJobs}>⭐ {rating.toFixed(1)} • {jobs}</Text>
//           </View>
//         </View>
//       </View>
//     );
//   }, []);

//   /* ---------- CONFIRM ---------- */
//   const onConfirm = async () => {
//     if (!ownerId) {
//       Alert.alert('Owner not set', 'Please login again so we can save your request.');
//       return;
//     }
//     try {
//       // server should already be in sync due to immediate writes; just confirm
//       const resp = await api.post('/app/cart/confirm', {}, { params: { owner_id: ownerId } });
//       const cid = resp?.data?.cart_id || null;
//       navigation.navigate('RequestNow', { ...requestNowParams, cartId: cid });
//     } catch (e) {
//       const msg = e?.response?.data?.message || e?.message || 'Could not confirm right now';
//       Alert.alert('Note', `${msg}\nProceeding with your selection.`);
//       navigation.navigate('RequestNow', { ...requestNowParams, cartId: null });
//     }
//   };

//   /* ---------- EARLY RETURNS ---------- */
//   if (loading) return <SkeletonRequestDetail insetsBottom={insets.bottom} />;

//   if (networkErr) {
//     return (
//       <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
//         <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:scale(24) }}>
//           <Icon name="cloud-offline-outline" size={scale(36)} color={C.muted} />
//           <Text style={{ color: C.ink, fontWeight: '800', fontSize: moderateScale(16), marginTop: scale(8) }}>Couldn’t load product</Text>
//           <Text style={{ color: C.muted, textAlign:'center', marginTop: scale(6) }}>{networkErr}</Text>
//           <TouchableOpacity onPress={onRefresh} style={[st.outlineBtn, { marginTop: scale(14), paddingHorizontal: scale(18) }]}>
//             <Text style={st.outlineTxt}>Retry</Text>
//           </TouchableOpacity>
//         </View>
//       </SafeAreaView>
//     );
//   }

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
//       {/* Show banner if owner id missing */}
//       {!ownerId && (
//         <View style={{ backgroundColor:'#FFF7ED', padding:scale(10) }}>
//           <Text style={{ color:'#B45309', fontWeight:'700' }}>Owner not set</Text>
//           <Text style={{ color:'#92400E', marginTop:scale(4), fontSize:moderateScale(12) }}>
//             Please login again. Cart won’t be saved to the server until we have your owner ID.
//           </Text>
//         </View>
//       )}

//       {/* HERO */}
//       <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
//         <ImageBackground source={{ uri: (images[idx] || FALLBACK_IMAGES[0]) }} style={{ width: '100%', height: scale(260), justifyContent: 'flex-end' }}>
//           <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

//           <View style={[st.actionsWrap, { paddingTop: scale(8) }]}>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={st.glassBtn} hitSlop={{ top: scale(8), bottom: scale(8), left: scale(8), right: scale(8) }}>
//               <Icon name="close" size={scale(18)} color={C.ink} />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={shareIt} style={[st.glassBtn, { marginLeft: scale(8) }]}>
//               <Icon name="share-social-outline" size={scale(18)} color={C.ink} />
//             </TouchableOpacity>
//           </View>

//           <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: scale(70), height: scale(4), backgroundColor: '#FFFFFF55', borderRadius: scale(3), overflow: 'hidden' }}>
//             <Animated.View style={{ height: scale(4), width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#fff' }} />
//           </View>

//           <View style={st.heroBottom}>
//             <View style={{ flex: 1 }}>
//               <Text style={st.title}>{prod.title}</Text>
//               <Text style={st.subTitle}>{headerItem.category} • {headerItem.requests?.toLocaleString()} requests</Text>
//             </View>
//             <View style={st.ratingPill}><Icon name="star" size={scale(14)} color="#fff" /><Text style={st.ratingTxt}>{headerItem.rating}</Text></View>
//           </View>
//         </ImageBackground>
//       </View>

//       <ScrollView
//         contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
//         showsVerticalScrollIndicator={false}
//         refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
//         onScrollBeginDrag={() => bar.stopAnimation()}
//         onScrollEndDrag={() => {
//           Animated.timing(bar, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: false }).start();
//         }}
//       >
//         {/* About */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>About</Text>
//           <Text style={st.desc}>{prod.description}</Text>
//         </View>

//         {/* Services */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Add services</Text>
//           <Text style={st.sectionSub}>Shortlist what you need. You can edit before confirming.</Text>

//           {(!prod.services || prod.services.length === 0) ? (
//             <View style={[st.serviceChip, { justifyContent:'center' }]}>
//               <Text style={st.sectionSub}>No services found.</Text>
//             </View>
//           ) : (
//             <FlatList
//               horizontal
//               data={prod.services}
//               keyExtractor={keyService}
//               renderItem={renderService}
//               getItemLayout={getServiceLayout}
//               showsHorizontalScrollIndicator={false}
//               contentContainerStyle={{ paddingRight: scale(16) }}
//             />
//           )}
//         </View>

//         {/* Included / Not included */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>What’s included</Text>
//           <View style={st.wrapPills}>
//             {(prod.included || []).map((t, i) => (
//               <View key={`in-${i}`} style={[st.pill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
//                 <Icon name="checkmark-circle" size={scale(16)} color={C.ok} /><Text style={st.pillTxt}>{t}</Text>
//               </View>
//             ))}
//           </View>

//           <Text style={[st.sectionTitle, { marginTop: scale(14) }]}>Not included</Text>
//           <View style={st.wrapPills}>
//             {(prod.excluded || []).map((t, i) => (
//               <View key={`ex-${i}`} style={[st.pill, { backgroundColor: '#FFF1F1', borderColor: '#FEE2E2' }]}>
//                 <Icon name="close-circle" size={scale(16)} color={C.danger} /><Text style={st.pillTxt}>{t}</Text>
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Conditions */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Conditions</Text>
//           {(prod.conditions || []).map((t, i) => (
//             <View key={i} style={{ flexDirection: 'row', marginBottom: scale(10) }}>
//               <Icon name="information-circle-outline" size={scale(18)} color={C.warn} />
//               <Text style={[st.desc, { marginLeft: scale(8), marginTop: scale(-2) }]}>{t}</Text>
//             </View>
//           ))}
//         </View>

//         {/* Process */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Our process</Text>
//           <View style={st.stepper}>
//             {processSteps.map((s, i) => (
//               <View key={s.title} style={st.stepRow}>
//                 <View style={st.stepRail}>
//                   <View style={st.stepDot}><Text style={st.stepNum}>{i + 1}</Text></View>
//                   {i < processSteps.length - 1 && <View style={st.stepLine} />}
//                 </View>
//                 <View style={st.stepCard}>
//                   <View style={st.stepIconWrap}><Icon name={s.icon} size={scale(16)} color={C.primary} /></View>
//                   <View style={{ flex: 1 }}>
//                     <Text style={st.stepTitle}>{s.title}</Text>
//                     <Text style={st.stepDesc}>{s.desc}</Text>
//                   </View>
//                 </View>
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Technicians */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Top technicians</Text>
//           {technicians.length === 0 ? (
//             <Text style={st.sectionSub}>Technicians will appear here when available.</Text>
//           ) : (
//             <FlatList
//               data={technicians}
//               keyExtractor={keyTech}
//               renderItem={renderTech}
//               numColumns={2}
//               columnWrapperStyle={{ gap: scale(10) }}
//               contentContainerStyle={{ paddingBottom: scale(4) }}
//               scrollEnabled={false}
//             />
//           )}
//         </View>

//         {/* FAQs */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>FAQs</Text>
//           {(prod.faqs || []).map((f) => <FAQItem key={f.id || f.q} f={f} />)}
//         </View>

//         {/* Reviews */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Reviews</Text>
//           {(!reviews || reviews.length === 0) ? (
//             <Text style={st.sectionSub}>No reviews yet.</Text>
//           ) : (
//             reviews.map((r) => (
//               <View key={r.id} style={st.revCard}>
//                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(6) }}>
//                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                     <Text style={st.revName}>{r.name}</Text>
//                     {!!r.when && <Text style={[st.sectionSub, { marginLeft: scale(8) }]}>{String(r.when).slice(0,10)}</Text>}
//                   </View>
//                   <Stars value={r.stars} />
//                 </View>
//                 <Text style={st.revTxt}>{r.text}</Text>
//               </View>
//             ))
//           )}
//           <TouchableOpacity
//             style={st.outlineBtn}
//             onPress={() => navigation.navigate('OwnerReviews', { productId: effectiveProductId || null })}
//           >
//             <Text style={st.outlineTxt}>View all reviews</Text>
//           </TouchableOpacity>
//         </View>

//         {/* Provide */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>What we provide</Text>
//           <View style={st.provideRow}>
//             {[
//               { icon: 'shield-checkmark', label: 'KNI Verified' },
//               { icon: 'medkit-outline', label: 'Genuine Spares' },
//               { icon: 'timer-outline', label: 'Quick TAT' },
//               { icon: 'document-text-outline', label: 'Digital Invoice' },
//             ].map((p) => (
//               <View key={p.label} style={st.provide}>
//                 <View style={st.provideIcon}><Icon name={p.icon} size={scale(18)} color={C.primary} /></View>
//                 <Text style={st.provideLbl}>{p.label}</Text>
//               </View>
//             ))}
//           </View>
//         </View>
//       </ScrollView>

//       {/* Sticky cart */}
//       <View style={[st.cartBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
//         <View style={{ flex: 1 }}>
//           <Text style={st.cartTop}>{totals.items ? `${totals.items} item${totals.items > 1 ? 's' : ''}` : 'No items added'}</Text>
//           <Text style={st.cartAmt}>{Rs(totals.amt)}</Text>
//         </View>
//         <TouchableOpacity
//           disabled={!totals.items}
//           style={[st.primaryBtn, !totals.items && { opacity: 0.5 }]}
//           onPress={() => {
//             if (!totals.items) return;
//             if (!ownerId) {
//               Alert.alert('Owner not set', 'Please login again so we can save your request.');
//               return;
//             }
//             onConfirm();
//           }}
//         >
//           <Text style={st.primaryTxt}>{totals.items ? 'Request Now' : 'Select services'}</Text>
//         </TouchableOpacity>
//       </View>
//     </SafeAreaView>
//   );
// }

// /* ---------- STYLES ---------- */
// const st = StyleSheet.create({
//   actionsWrap: { position: 'absolute', top: 0, right: scale(12), flexDirection: 'row' },
//   glassBtn: {
//     backgroundColor: '#FFFFFFEE', width: scale(38), height: scale(38), borderRadius: scale(12),
//     alignItems: 'center', justifyContent: 'center',
//     borderWidth: 1, borderColor: '#FFFFFF99', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3,
//   },
//   heroBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: '#FFFFFFEE' },
//   title: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
//   subTitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
//   ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
//   ratingTxt: { color: '#fff', fontWeight: '700', marginLeft: scale(6), fontSize: moderateScale(12) },

//   section: { paddingHorizontal: scale(16), paddingTop: scale(16), paddingBottom: scale(6) },
//   sectionTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink, marginBottom: scale(8) },
//   sectionSub: { fontSize: moderateScale(12), color: C.muted, marginBottom: scale(8) },
//   desc: { color: C.text, fontSize: moderateScale(14), lineHeight: moderateScale(20) },

//   serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: scale(14), padding: scale(12), marginRight: scale(10), borderWidth: 1, borderColor: '#EEF2F7' },
//   serviceTitle: { color: C.text, fontWeight: '700', fontSize: moderateScale(14) },
//   servicePrice: { color: C.ink, marginTop: scale(2), fontWeight: '700' },
//   addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(999), marginLeft: scale(10) },
//   addTxt: { color: '#fff', fontWeight: '800', marginLeft: scale(6), fontSize: moderateScale(12) },
//   counterSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: scale(999), marginLeft: scale(10) },
//   counterBtnSm: { paddingHorizontal: scale(10), paddingVertical: scale(6) },
//   qty: { minWidth: scale(22), textAlign: 'center', fontWeight: '800', color: C.primary },

//   wrapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
//   pill: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8), borderWidth: 1 },
//   pillTxt: { marginLeft: scale(6), color: '#334155', fontSize: moderateScale(12) },

//   stepper: { marginTop: scale(4) },
//   stepRow: { flexDirection: 'row', marginBottom: scale(14) },
//   stepRail: { width: scale(30), alignItems: 'center' },
//   stepDot: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
//   stepNum: { color: C.primary, fontWeight: '800', fontSize: moderateScale(12) },
//   stepLine: { width: scale(2), backgroundColor: '#E5E7EB', flex: 1, marginTop: scale(2), marginBottom: scale(-2) },
//   stepCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(12), flexDirection: 'row', alignItems: 'center' },
//   stepIconWrap: { width: scale(34), height: scale(34), borderRadius: scale(12), backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
//   stepTitle: { color: C.text, fontWeight: '800' },
//   stepDesc: { color: C.muted, marginTop: scale(2) },

//   techCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(10), marginBottom: scale(10), flexDirection: 'row', alignItems: 'center' },
//   techPic: { width: scale(54), height: scale(54), borderRadius: scale(12) },
//   techName: { color: C.text, fontWeight: '700' },
//   techJobs: { color: C.muted, fontSize: moderateScale(11) },

//   faqItem: { backgroundColor: C.card, borderRadius: scale(14), padding: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: '#EEF2F7' },
//   faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   faqQ: { color: C.text, fontWeight: '700', fontSize: moderateScale(14) },
//   faqA: { color: C.muted, marginTop: scale(8), lineHeight: moderateScale(20) },

//   revCard: { backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(12), marginBottom: scale(10) },
//   revName: { color: C.text, fontWeight: '700' },
//   revTxt: { color: C.text, marginTop: scale(2) },
//   outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:scale(12), paddingVertical:scale(12), alignItems:'center', marginTop:scale(6), backgroundColor:'#fff' },
//   outlineTxt:{ color:'#334155', fontWeight:'900' },

//   provideRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: scale(10), marginTop: scale(6) },
//   provide: { width: '48%', backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor:'#EEF2F7', padding: scale(12), flexDirection: 'row', alignItems: 'center' },
//   provideIcon: { width: scale(36), height: scale(36), borderRadius: scale(12), backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
//   provideLbl: { color: C.text, fontWeight: '700' },

//   cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingTop: scale(12), borderTopWidth: 1, borderColor: '#E5E7EB' },
//   cartTop: { color: C.muted, fontSize: moderateScale(12) },
//   cartAmt: { color: C.ink, fontSize: moderateScale(18), fontWeight: '800' },
//   primaryBtn: { backgroundColor: C.primary, borderRadius: scale(14), paddingVertical: scale(12), paddingHorizontal: scale(18) },
//   primaryTxt: { color: '#fff', fontWeight: '800' },
// });

// /* ---------- Skeleton styles ---------- */
// const sk = StyleSheet.create({
//   hero: { height: scale(260), backgroundColor: '#E9EEF5' },
//   glassBtn:{ backgroundColor:'#FFFFFFEE', width:scale(38), height:scale(38), borderRadius:scale(12), borderWidth:1, borderColor:'#FFFFFF99' },
//   ratingPill:{ width:scale(90), height:scale(28), borderRadius:scale(999), backgroundColor:'#F1F5F9' },
//   h2:{ height:scale(20), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
//   para:{ height:scale(12), borderRadius:scale(6), backgroundColor:'#E9EEF5' },
//   lineLg:{ height:scale(18), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
//   lineMd:{ height:scale(14), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
//   lineSm:{ height:scale(12), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
//   lineXs:{ height:scale(10), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
//   btnPill:{ width:scale(78), height:scale(32), borderRadius:scale(999), backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginLeft:scale(10) },
// });
// src/screens/RequestDetail.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, Animated, Easing,
  TouchableOpacity, ScrollView, FlatList, Share, RefreshControl, Alert,
  Modal, TextInput, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, IMAGE_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { scale, moderateScale } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// ---- debug helpers ----
const DEBUG_IMG = true;
const logImg = (...a) => DEBUG_IMG && console.log('[RD:image]', ...a);
const logGrp = (label, fn) => {
  if (!DEBUG_IMG) return fn?.();
  console.groupCollapsed(`[RD:image] ${label}`);
  try { fn?.(); } finally { console.groupEnd(); }
};

const ORIGIN = IMAGE_BASE_URL.replace(/\/storage\/?$/i, ''); // http://192.168.29.223:8000
const STORAGE_BASE = IMAGE_BASE_URL.replace(/\/$/, '');      // http://…:8000/storage

const makeAbsolute = (u) => {
  if (!u) return null;
  const s = String(u).trim();

  // If it's already absolute, only patch localhost -> our ORIGIN (adds :8000 etc.)
  if (/^https?:\/\//i.test(s)) {
    return s.replace(
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i,
      ORIGIN
    );
  }

  // Relative: "storage/…" or "/storage/…" or even "products/…"
  // Ensure we don't duplicate /storage
  const path = s.replace(/^\/?storage\/?/i, ''); // drop leading storage/ if present
  return `${STORAGE_BASE}/${path.replace(/^\/+/, '')}`;
};

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A', ink: '#1D2254', bg: '#F5F7FA', card: '#FFFFFF',
  text: '#0F172A', muted: '#6B7280', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', danger: '#EF4444',
};
const R = 18;

/* ---------- FALLBACKS ---------- */
const FALLBACK_IMAGES = [
  'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp',
  'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-detailed-depiction-of-a-commercial-refrigerator-repair-scene-in-a-wide-format.-The-image-shows-a-skilled-technician-wearing-a-uniform-and-equipped-1.webp',
  'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-busy-commercial-kitchen-repair-scene-showing-an-array-of-diverse-refrigerators-open-with-their-mechanics-visible.-Various-tools-are-scattered-around-1-1024x585.webp',
  'https://images.unsplash.com/photo-1556909114-23622d5b5b51?q=80&w=1500&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506806732259-39c2d0268443?q=80&w=1500&auto=format&fit=crop',
];

const FALLBACK_INCLUDED = ['Multi-point inspection', 'Basic exterior clean', 'Minor tuning', 'Completion photos'];
const FALLBACK_EXCLUDED = ['Major spares', 'Civil/electrical work', 'Inaccessible units'];
const FALLBACK_CONDITIONS = [
  'Final price post diagnosis & your approval.',
  '3-month labor warranty (no warranty on consumables).',
  'Visit fee adjusted in final bill if service taken.',
];
const FALLBACK_FAQS = [
  { id: 'f1', q: 'How soon can I get a visit?', a: 'Usually within 4–8 working hours in metro cities.' },
  { id: 'f2', q: 'Do you use genuine spares?', a: 'Yes, OEM or high-quality compatible parts with bill.' },
  { id: 'f3', q: 'If I don\'t go ahead?', a: 'Only the diagnostic/visit fee is applicable.' },
];

/* ---------- STATIC ---------- */
const processSteps = [
  { icon: 'apps-outline',        title: 'Raise Request', desc: 'Pick services & submit.' },
  { icon: 'construct-outline',   title: 'Assign Pro',    desc: 'Nearest certified tech scheduled.' },
  { icon: 'build-outline',       title: 'On-site Work',  desc: 'Diagnosis + transparent fix.' },
  { icon: 'card-outline',        title: 'Pay & Rate',    desc: 'UPI/QR & share feedback.' },
];

/* ---------- UTILS ---------- */
const debounce = (fn, ms = 350) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
const Rs = (n) => `₹ ${Number(n || 0).toLocaleString('en-IN')}`;
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// Add formatPrice function
const formatPrice = (price) => {
  if (price === null || price === undefined) return 'Price on request';
  const num = parseFloat(price);
  if (isNaN(num)) return 'Price on request';
  return `₹${num.toLocaleString('en-IN')}`;
};

const Stars = React.memo(({ value, size = 12 }) => {
  const v = clamp(Math.round(value || 0), 0, 5);
  return (
    <View style={{ flexDirection: 'row' }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Icon key={i} name={i < v ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
      ))}
    </View>
  );
});

function buildStoryImages(d = {}, headerItem = {}) {
  let imgs = [];

  if (Array.isArray(d.storyImages)) imgs = imgs.concat(d.storyImages);
  if (Array.isArray(d.images))      imgs = imgs.concat(d.images);

  if (typeof d.images === 'string') {
    try {
      const parsed = JSON.parse(d.images);
      if (Array.isArray(parsed)) imgs = imgs.concat(parsed);
    } catch (err) {
      logImg('images JSON parse failed:', err?.message, d.images?.slice?.(0, 120));
    }
  }

  const singleCandidates = [ d.image_url, d.image, d.thumb, d.cover, headerItem?.image ];
  singleCandidates.forEach((u) => { if (u) imgs.push(u); });

  // clean + dedupe
  const seen = new Set();
  imgs = imgs
    .map((u) => (typeof u === 'string' ? u.trim() : ''))
    .filter(Boolean)
    .filter((u) => (seen.has(u) ? false : (seen.add(u), true)));

  // 🔥 relative → absolute (with logs)
  const before = imgs.slice();
  imgs = imgs.map(makeAbsolute);

  logGrp('buildStoryImages()', () => {
    logImg('from API fields:', {
      storyImages: d.storyImages, images: d.images,
      image_url: d.image_url, image: d.image, thumb: d.thumb, cover: d.cover,
      headerImage: headerItem?.image,
    });
    logImg('mapped BEFORE:', before);
    logImg('mapped AFTER :', imgs);
  });

  return imgs.length ? imgs : null;
}

/* ---------- ENQUIRY MODAL ---------- */
const EnquiryModal = ({ visible, onClose, product, onSubmit, loading }) => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    enquiry_text: ''
  });

  useEffect(() => {
    if (!visible) {
      setForm({ name: '', email: '', phone: '', enquiry_text: '' });
    }
  }, [visible]);

  const handleInputChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.email || !form.phone || !form.enquiry_text) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    if (!product) {
      Alert.alert('Error', 'No product selected');
      return;
    }

    onSubmit(form, product);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={st.modalOverlay}>
        <View style={st.modalContent}>
          <ScrollView style={st.modalScroll} showsVerticalScrollIndicator={false}>
            <View style={st.modalHeader}>
              <Text style={st.modalTitle}>Product Enquiry</Text>
              <TouchableOpacity onPress={onClose} style={st.closeButton}>
                <Icon name="close" size={scale(24)} color={C.muted} />
              </TouchableOpacity>
            </View>
            
            <Text style={st.modalDescription}>
              Submit your enquiry for:{'\n'}
              <Text style={st.productName}>{product?.title}</Text>
            </Text>

            <View style={st.form}>
              <View style={st.inputGroup}>
                <Text style={st.label}>Full Name *</Text>
                <TextInput
                  style={st.input}
                  value={form.name}
                  onChangeText={(value) => handleInputChange('name', value)}
                  placeholder="Enter your full name"
                  placeholderTextColor="#94A3B8"
                />
              </View>

              <View style={st.inputGroup}>
                <Text style={st.label}>Email Address *</Text>
                <TextInput
                  style={st.input}
                  value={form.email}
                  onChangeText={(value) => handleInputChange('email', value)}
                  placeholder="Enter your email"
                  placeholderTextColor="#94A3B8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <View style={st.inputGroup}>
                <Text style={st.label}>Phone Number *</Text>
                <TextInput
                  style={st.input}
                  value={form.phone}
                  onChangeText={(value) => handleInputChange('phone', value)}
                  placeholder="Enter your phone number"
                  placeholderTextColor="#94A3B8"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={st.inputGroup}>
                <Text style={st.label}>Your Enquiry *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={form.enquiry_text}
                  onChangeText={(value) => handleInputChange('enquiry_text', value)}
                  placeholder="Please describe your enquiry in detail..."
                  placeholderTextColor="#94A3B8"
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>

              <View style={st.modalActions}>
                <TouchableOpacity 
                  style={[st.button, st.cancelButton]} 
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={st.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={[st.button, st.submitButton, loading && st.submitButtonDisabled]} 
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <Text style={st.submitButtonText}>Submitting...</Text>
                  ) : (
                    <>
                      <Icon name="send" size={scale(16)} color="#fff" style={st.buttonIcon} />
                      <Text style={st.submitButtonText}>Submit Enquiry</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

/* ---------- FAQ ITEM ---------- */
const FAQItem = React.memo(({ f }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.faqItem}>
      <TouchableOpacity style={st.faqHead} onPress={() => setOpen(o => !o)} accessibilityRole="button">
        <Text style={st.faqQ}>{f.q}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={scale(18)} color={C.ink} />
      </TouchableOpacity>
      {open && <Text style={st.faqA}>{f.a}</Text>}
    </View>
  );
});

/* ---------- SKELETON ---------- */
function SkeletonRequestDetail({ insetsBottom }) {
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
  }, [pulse]);

  const ServiceChip = () => (
    <View style={[st.serviceChip, { width: scale(220) }]}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
        <Animated.View style={[sk.lineSm, { width: scale(80), marginTop: scale(6), opacity: pulse }]} />
      </View>
      <Animated.View style={[sk.btnPill, { opacity: pulse }]} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
      <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
        <Animated.View style={[sk.hero, { opacity: pulse }]} />
        <View style={[st.actionsWrap, { paddingTop: scale(8) }]}>
          <View style={sk.glassBtn} />
          <View style={[sk.glassBtn, { marginLeft: scale(8) }]} />
        </View>
        <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: scale(70), height: scale(4), backgroundColor: '#FFFFFF55', borderRadius: scale(3) }} />
        <View style={st.heroBottom}>
          <View style={{ flex: 1 }}>
            <Animated.View style={[sk.lineLg, { width: '60%', opacity: pulse }]} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(6) }}>
              <Animated.View style={[sk.lineMd, { width: scale(80), opacity: pulse }]} />
              <Animated.View style={[sk.lineSm, { width: scale(140), marginLeft: scale(8), opacity: pulse }]} />
            </View>
          </View>
          <View style={sk.ratingPill} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + scale(100) }} showsVerticalScrollIndicator={false}>
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: scale(100), opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '95%', marginTop: scale(8), opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '85%', marginTop: scale(6), opacity: pulse }]} />
        </View>

        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: scale(130), opacity: pulse }]} />
          <Animated.View style={[sk.lineXs, { width: scale(220), marginTop: scale(6), opacity: pulse }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: scale(16), marginTop: scale(10) }}>
            {[0,1,2].map(i => <ServiceChip key={i} />)}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[st.cartBar, { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 }]}>
        <View style={{ flex:1 }}>
          <Animated.View style={[sk.lineXs, { width: scale(120), opacity: pulse }]} />
          <Animated.View style={[sk.lineMd, { width: scale(80), marginTop:scale(6), opacity: pulse }]} />
        </View>
        <View style={sk.primaryBtn} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- MAIN ---------- */
export default function RequestDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const categoryId = route?.params?.categoryId ?? route?.params?.id ?? null;
  const productId = route?.params?.productId ?? null; // Legacy support
  // Use categoryId as the primary identifier, fallback to productId for legacy
  const effectiveProductId = categoryId || productId;

  // --- READ OWNER ID FROM ANY KEY ---
  const [ownerId, setOwnerId] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const a = await AsyncStorage.getItem('owner_id');
        const b = await AsyncStorage.getItem('restaurant_owner_id');
        const c = await AsyncStorage.getItem('ownerId');
        // Handle both numeric and string (UUID) owner IDs
        const chosen = String(a || b || c || '').trim();
        if (chosen && chosen !== '0' && chosen !== 'null' && chosen !== 'undefined') {
          setOwnerId(chosen);
        } else {
          setOwnerId(null);
        }
      } catch {
        setOwnerId(null);
      }
    })();
  }, []);

  // Build service->product map (now uses string IDs)
  const [svc2prod, setSvc2prod] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/app/services', { params: ownerId ? { owner_id: ownerId } : {} });
        const arr = Array.isArray(res?.data) ? res.data
                  : Array.isArray(res?.data?.data) ? res.data.data : [];
        const m = {};
        arr.forEach(s => {
          const sid = String(s.id || '');
          const pid = String(s.product_id || s.category_id || '');
          if (sid && pid) m[sid] = pid;
        });
        setSvc2prod(m);
      } catch { setSvc2prod({}); }
    })();
  }, [ownerId]);

  const headerItem = useMemo(() => route?.params?.item ?? {
    title: 'Commercial Fridge Service',
    category: 'Fridge',
    price: null,
    rating: 4.8,
    requests: 1225,
    desc: 'Cooling issues, gas refill, thermostat faults & preventive maintenance.',
    image: null,
  }, [route?.params?.item]);

  const [prod, setProd] = useState({
    title: headerItem.title,
    description: headerItem.desc,
    price: headerItem.price,
    storyImages: FALLBACK_IMAGES,
    included: FALLBACK_INCLUDED,
    excluded: FALLBACK_EXCLUDED,
    conditions: FALLBACK_CONDITIONS,
    faqs: FALLBACK_FAQS,
    services: [], // Start with empty array instead of fallback services
    parts: [], // Parts for this product
  });

  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkErr, setNetworkErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // Enquiry states
  const [enquiryModalVisible, setEnquiryModalVisible] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [enquiryLoading, setEnquiryLoading] = useState(false);

  /** backoff for 429/5xx */
  const safeGet = useCallback(async (url, tries = 2, params = {}) => {
    for (let i = 0; i <= tries; i++) {
      try { return await api.get(url, { params }); }
      catch (e) {
        const code = e?.response?.status;
        if (i === tries || !(code === 429 || (code >= 500 && code <= 599))) throw e;
        await new Promise(r => setTimeout(r, 600 * (i + 1)));
      }
    }
  }, []);

  const normalizeArray = (val, fb = []) => (Array.isArray(val) && val.length ? val : fb);

  /** Reviews */
  const fetchReviews = useCallback(async (productIdMaybe) => {
    const candidates = [
      productIdMaybe ? `/app/products/${productIdMaybe}/reviews` : null,
      `/app/engineer-reviews`,
      `/engineer-reviews`,
    ].filter(Boolean);

    let payload = [];
    for (const path of candidates) {
      try {
        const res = await safeGet(path, 2, ownerId ? { owner_id: ownerId } : {});
        const raw = res?.data;
        const list = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
        if (list.length) { payload = list; break; }
      } catch {}
    }

    if (!payload.length) { setReviews([]); return; }

    const mapped = payload.map((r, i) => ({
      id: String(r.id ?? i),
      name: r.customer_name || r.user_name || r.name || 'Anonymous',
      stars: Number.isFinite(Number(r.rating || r.stars)) ? Number(r.rating || r.stars) : 0,
      text: r.comment || r.review || r.text || '',
      when: r.created_at || r.createdAt || null,
    })).sort((a, b) => new Date(b.when || 0) - new Date(a.when || 0));

    setReviews(mapped.slice(0, 3));
  }, [ownerId, safeGet]);

  // Handle enquiry submission
  // Handle enquiry submission
const handleEnquirySubmit = async (formData, product) => {
  try {
    setEnquiryLoading(true);
    
    // Prepare enquiry data according to your backend validation
    const enquiryData = {
      product_id: product.id || effectiveProductId, // Use product.id or fallback to effectiveProductId
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      enquiry_text: formData.enquiry_text,
    };

    console.log('Submitting enquiry:', enquiryData);

    // Send to your API endpoint
    const response = await api.post('/app/enquiries', enquiryData, {
      params: ownerId ? { owner_id: ownerId } : {}
    });

    // Success
    Alert.alert(
      'Enquiry Submitted',
      'Thank you for your enquiry! We will get back to you soon.',
      [{ text: 'OK', onPress: () => setEnquiryModalVisible(false) }]
    );
    
  } catch (error) {
    console.error('Enquiry submission error:', error);
    const errorMessage = error?.response?.data?.message || 'Failed to submit enquiry. Please try again.';
    Alert.alert('Error', errorMessage);
  } finally {
    setEnquiryLoading(false);
  }
};

  const openEnquiryModal = (product) => {
    setSelectedProduct(product);
    setEnquiryModalVisible(true);
  };

  // 🔥 Fetch category with services and parts (matching web flow)
  const fetchAll = useCallback(async () => {
    setNetworkErr('');
    setLoading(true);

    try {
      const idToFetch = effectiveProductId;
      if (idToFetch) {
        console.log(`🔄 Fetching category ${idToFetch} details...`);

        // Fetch category with services and parts from public API
        const categoryRes = await safeGet(`/public/categories/${idToFetch}`, 2, {});

        const d = categoryRes?.data?.data ?? categoryRes?.data ?? {};
        const category = d.category || {};
        const servicesData = d.services || [];
        const partsData = d.parts || [];

        console.log(`📦 Loaded: ${servicesData.length} services, ${partsData.length} parts`);

        // Map services to standard format
        const services = servicesData.map((s) => ({
          id: s.id,
          name: s.name || `Service #${s.id}`,
          description: s.description || '',
          price: Number(s.price || 0),
          subCategory: s.subCategory?.name || null,
          itemType: 'SERVICE',
        }));

        // Map parts to standard format
        const parts = partsData.map((p) => ({
          id: p.id,
          name: p.name || `Part #${p.id}`,
          description: p.description || '',
          price: Number(p.price || 0),
          subCategory: p.subCategory?.name || null,
          itemType: 'PART',
        }));

        setProd({
          title: category.name || headerItem.title,
          description: headerItem.desc || `Browse services and parts in ${category.name || 'this category'}`,
          price: null,
          storyImages: FALLBACK_IMAGES,
          included: FALLBACK_INCLUDED,
          excluded: FALLBACK_EXCLUDED,
          conditions: FALLBACK_CONDITIONS,
          faqs: FALLBACK_FAQS,
          services,
          parts,
        });

      } else {
        setProd(p => ({ ...p, services: [], parts: [] }));
      }
    } catch (e) {
      console.log('❌ fetchAll error:', e.message);
      setNetworkErr(e?.message || 'Failed to load category');
      setProd(p => ({ ...p, services: [], parts: [] }));
    } finally {
      setLoading(false);
    }
  }, [headerItem, effectiveProductId, safeGet]);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  // Debug effect to monitor services
  useEffect(() => {
    console.log('🔍 Current State:', {
      categoryId,
      servicesCount: prod.services?.length || 0,
      partsCount: prod.parts?.length || 0,
      loading,
      hasOwnerId: !!ownerId
    });
  }, [prod.services, prod.parts, categoryId, loading, ownerId]);

  /* ---------- HERO PROGRESS ---------- */
  const [idx, setIdx] = useState(0);
  const bar = useRef(new Animated.Value(0)).current;
  const PROG = 10000;
  const images = prod.storyImages?.length ? prod.storyImages : FALLBACK_IMAGES;

  const run = useCallback(() => {
    bar.stopAnimation();
    bar.setValue(0);
    Animated.timing(bar, { toValue: 1, duration: PROG, easing: Easing.linear, useNativeDriver: false })
      .start(({ finished }) => { if (finished && images.length) setIdx(p => (p + 1) % images.length); });
  }, [bar, images.length]);

  useEffect(() => {
    if (loading) { bar.stopAnimation(); return; }
    run();
    return () => bar.stopAnimation();
  }, [idx, loading, run, bar]);

  /* ---------- CART ---------- */
  const [cart, setCart] = useState({});
  const hydratedRef = useRef({ local: false, server: false });
  const lastSyncedRef = useRef({});

  const [ownerKey, setOwnerKey] = useState('global');
  useEffect(() => {
    (async () => {
      try {
        const from1 = await AsyncStorage.getItem('owner_id');
        const from2 = await AsyncStorage.getItem('restaurant_owner_id');
        const from3 = await AsyncStorage.getItem('ownerId');
        const id = String(from1 || from2 || from3 || '').trim();
        setOwnerKey(id ? `owner:${id}` : 'global');
      } catch { setOwnerKey('global'); }
    })();
  }, []);

  const persistKey = useMemo(
    () => `rdraft:${ownerKey}:${effectiveProductId || 'global'}`,
    [ownerKey, effectiveProductId]
  );

  // Keys for storing product metadata and services for RequestNow screen
  const pmetaKey = useMemo(
    () => `pmeta:${ownerKey}:${effectiveProductId || 'global'}`,
    [ownerKey, effectiveProductId]
  );
  const rservicesKey = useMemo(
    () => `rservices:${ownerKey}:${effectiveProductId || 'global'}`,
    [ownerKey, effectiveProductId]
  );

  // Save product metadata and services to AsyncStorage when they change
  // This ensures RequestNow screen can access product info when opened from cart
  useEffect(() => {
    if (!effectiveProductId || effectiveProductId === 'global' || !ownerKey) return;
    (async () => {
      try {
        // Save product metadata
        const meta = {
          productId: String(effectiveProductId),
          productTitle: prod?.title || `Equipment #${effectiveProductId}`,
          category: headerItem?.category || 'General',
          subtitle: prod?.description || '',
          heroImage: (prod?.storyImages?.[0]) || (prod?.image) || '',
        };
        await AsyncStorage.setItem(pmetaKey, JSON.stringify(meta));

        // Save services
        if (Array.isArray(prod?.services) && prod.services.length > 0) {
          await AsyncStorage.setItem(rservicesKey, JSON.stringify(prod.services));
        }
        // Save parts
        const rpartsKey = `rparts:${ownerKey}:${effectiveProductId}`;
        if (Array.isArray(prod?.parts) && prod.parts.length > 0) {
          await AsyncStorage.setItem(rpartsKey, JSON.stringify(prod.parts));
        }
      } catch (e) {
        console.log('[RequestDetail] Failed to save product meta/services:', e?.message);
      }
    })();
  }, [effectiveProductId, ownerKey, prod?.title, prod?.description, prod?.storyImages, prod?.services, prod?.parts, prod?.image, headerItem?.category, pmetaKey, rservicesKey]);

  // reverse map product->service for server items (now uses string IDs)
  const prod2svc = useMemo(() => {
    const m = {};
    Object.entries(svc2prod || {}).forEach(([sid, pid]) => { if (pid) m[String(pid)] = String(sid); });
    return Object.keys(cart || {}).reduce((acc, sidStr) => {
      if (!(sidStr in acc)) acc[sidStr] = sidStr;
      return acc;
    }, m);
  }, [svc2prod, cart]);

  // Helper to normalize cart object keys (keeps both service IDs and part keys as strings)
  const normalizeCartKeys = (obj) => {
    if (!obj || typeof obj !== 'object') return {};
    const result = {};
    Object.entries(obj).forEach(([k, v]) => {
      const qty = Number(v);
      if (qty > 0) {
        // Keep all keys as strings (both part keys like 'part:123' and service IDs)
        result[String(k)] = qty;
      }
    });
    return result;
  };

  // Flag to track if initial hydration is complete
  const initialHydrationDone = useRef(false);

  // hydrate local draft (initial - only once)
  useEffect(() => {
    if (!persistKey || initialHydrationDone.current) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(persistKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            setCart(prev => ({ ...prev, ...normalizeCartKeys(saved) }));
          }
        }
      } catch {}
      hydratedRef.current.local = true;
      initialHydrationDone.current = true;
    })();
  }, [persistKey, ownerKey]);

  // Flag to prevent auto-save right after loading from storage
  const skipNextAutoSave = useRef(false);

  // Reload cart from AsyncStorage when screen comes into focus
  // This ensures cart is reset after order is placed
  useFocusEffect(
    useCallback(() => {
      if (!persistKey) return;
      (async () => {
        try {
          // Set flag to skip auto-save after loading
          skipNextAutoSave.current = true;

          const raw = await AsyncStorage.getItem(persistKey);
          if (raw) {
            const saved = JSON.parse(raw);
            if (saved && typeof saved === 'object') {
              setCart(normalizeCartKeys(saved));
            } else {
              setCart({});
            }
          } else {
            // No data in storage means cart was cleared
            setCart({});
          }
        } catch {
          setCart({});
        }
      })();
    }, [persistKey])
  );

  // Use ref to always have latest cart for saving
  const cartRef = useRef(cart);
  useEffect(() => { cartRef.current = cart; }, [cart]);

  // local autosave (debounced)
  const saveCartToStorage = useCallback(async () => {
    if (!persistKey) return;
    // Skip save if we just loaded from storage
    if (skipNextAutoSave.current) {
      skipNextAutoSave.current = false;
      return;
    }
    try {
      await AsyncStorage.setItem(persistKey, JSON.stringify(cartRef.current || {}));
    } catch {}
  }, [persistKey]);

  const saveTimeoutRef = useRef(null);
  useEffect(() => {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(saveCartToStorage, 400);
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [cart, saveCartToStorage]);

  // Save on unmount
  useEffect(() => {
    return () => {
      if (persistKey && cartRef.current) {
        AsyncStorage.setItem(persistKey, JSON.stringify(cartRef.current || {})).catch(()=>{});
      }
    };
  }, [persistKey]);

  /* ---------- CART OPERATIONS ---------- */
  // Cart is stored locally (AsyncStorage) AND synced to database cart
  // This allows viewing all items from all categories in CartScreen

  // Sync to database cart
  const syncToDbCart = useCallback(async (itemType, itemId, qty) => {
    try {
      if (qty > 0) {
        await api.post('/owner/cart', {
          itemType,
          serviceItemId: itemType === 'SERVICE' ? itemId : undefined,
          partItemId: itemType === 'PART' ? itemId : undefined,
          qty: 1, // Add 1 at a time
        });
      }
    } catch (e) {
      console.log('Sync to DB cart failed:', e?.message);
    }
  }, []);

  // Remove from database cart
  const removeFromDbCart = useCallback(async (itemType, itemId) => {
    try {
      // First get the cart to find the item
      const cartResponse = await api.get('/owner/cart');
      if (cartResponse.data?.ok) {
        const cartItems = cartResponse.data.data?.items || [];
        // Find the item in cart
        const cartItem = cartItems.find(item => {
          if (itemType === 'SERVICE') {
            return item.serviceItemId === itemId;
          } else {
            return item.partItemId === itemId;
          }
        });
        if (cartItem) {
          // Delete the item
          await api.delete(`/owner/cart/items/${cartItem.id}`);
          console.log('[RequestDetail] Removed item from DB cart:', itemId);
        }
      }
    } catch (e) {
      console.log('Remove from DB cart failed:', e?.message);
    }
  }, []);

  const add = useCallback((sid) => {
    const strSid = String(sid);
    setCart(prev => {
      const nextQty = (prev[strSid] || 0) + 1;
      return { ...prev, [strSid]: nextQty };
    });
    // Sync to database cart
    syncToDbCart('SERVICE', strSid, 1);
  }, [syncToDbCart]);

  const sub = useCallback((sid) => {
    const strSid = String(sid);
    // Check current quantity from ref before updating
    const currentQty = cartRef.current[strSid] || 0;
    const willBeRemoved = currentQty <= 1;

    setCart(prev => {
      const nextQty = Math.max(0, (prev[strSid] || 0) - 1);
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[strSid];
      } else {
        next[strSid] = nextQty;
      }
      return next;
    });

    // Remove from database cart if item will be removed
    if (willBeRemoved) {
      removeFromDbCart('SERVICE', strSid);
    }
  }, [removeFromDbCart]);

  // Parts cart operations (using 'part:' prefix to distinguish from services)
  const addPart = useCallback((partId) => {
    const key = `part:${partId}`;
    setCart(prev => {
      const nextQty = (prev[key] || 0) + 1;
      return { ...prev, [key]: nextQty };
    });
    // Sync to database cart
    syncToDbCart('PART', partId, 1);
  }, [syncToDbCart]);

  const subPart = useCallback((partId) => {
    const key = `part:${partId}`;
    // Check current quantity from ref before updating
    const currentQty = cartRef.current[key] || 0;
    const willBeRemoved = currentQty <= 1;

    setCart(prev => {
      const nextQty = Math.max(0, (prev[key] || 0) - 1);
      const next = { ...prev };
      if (nextQty === 0) {
        delete next[key];
      } else {
        next[key] = nextQty;
      }
      return next;
    });

    // Remove from database cart if item will be removed
    if (willBeRemoved) {
      removeFromDbCart('PART', partId);
    }
  }, [removeFromDbCart]);

  /* ---------- TOTALS ---------- */
  const totals = useMemo(() => {
    try {
      let items = 0, amt = 0;
      // Services
      (prod.services || []).forEach((s) => {
        const sid = String(s.id);
        const q = cart[sid] || 0;
        items += q; amt += q * Number(s.price || 0);
      });
      // Parts
      (prod.parts || []).forEach((p) => {
        const key = `part:${p.id}`;
        const q = cart[key] || 0;
        items += q; amt += q * Number(p.price || 0);
      });
      return { items, amt };
    } catch { return { items: 0, amt: 0 }; }
  }, [cart, prod.services, prod.parts]);

  const shareIt = useCallback(async () => {
    try {
      await Share.share({
        title: prod.title,
        message: `${prod.title} • ${headerItem.category}\n${prod.description}\n\nKNI – Pro Kitchen Services`,
      });
    } catch {}
  }, [headerItem.category, prod.description, prod.title]);

  // --- params we pass to RequestNow ---
  const requestNowParams = useMemo(() => {
    return {
      productId: String(effectiveProductId ?? 'global'),
      productTitle: prod?.title || 'Commercial Fridge',
      category: headerItem?.category || 'Commercial',
      subtitle: route?.params?.description || '',
      heroImage: (prod?.storyImages?.[0]) || FALLBACK_IMAGES[0],
      services: Array.isArray(prod?.services) ? prod.services : [],
      parts: Array.isArray(prod?.parts) ? prod.parts : [],
      cart,
      ownerId,
    };
  }, [effectiveProductId, prod?.title, prod?.storyImages, prod?.services, prod?.parts, headerItem?.category, route?.params?.description, cart, ownerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);


  /* ---------- CONFIRM ---------- */
  const onConfirm = () => {
    // Navigate to Cart to proceed with booking
    navigation.navigate('Cart');
  };

  /* ---------- EARLY RETURNS ---------- */
  if (loading) return <SkeletonRequestDetail insetsBottom={insets.bottom} />;

  if (networkErr) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:scale(24) }}>
          <Icon name="cloud-offline-outline" size={scale(36)} color={C.muted} />
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: moderateScale(16), marginTop: scale(8) }}>Couldn't load product</Text>
          <Text style={{ color: C.muted, textAlign:'center', marginTop: scale(6) }}>{networkErr}</Text>
          <TouchableOpacity onPress={onRefresh} style={[st.outlineBtn, { marginTop: scale(14), paddingHorizontal: scale(18) }]}>
            <Text style={st.outlineTxt}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      {/* Show banner if owner id missing */}
      {!ownerId && (
        <View style={{ backgroundColor:'#FFF7ED', padding:scale(10) }}>
          <Text style={{ color:'#B45309', fontWeight:'700' }}>Owner not set</Text>
          <Text style={{ color:'#92400E', marginTop:scale(4), fontSize:moderateScale(12) }}>
            Please login again. Cart won't be saved to the server until we have your owner ID.
          </Text>
        </View>
      )}

      {/* HERO */}
      {/* HERO */}
<View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
  <ImageBackground
    source={{ uri: (images[idx] || FALLBACK_IMAGES[0]) }}
    style={{ width: '100%', height: scale(260), justifyContent: 'flex-end' }}
    onError={(e) => logImg('HERO onError for uri:', images[idx], e?.nativeEvent)}
  >
    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

    <View style={[st.actionsWrap, { paddingTop: scale(8) }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={st.glassBtn} hitSlop={{ top: scale(8), bottom: scale(8), left: scale(8), right: scale(8) }}>
        <Icon name="close" size={scale(18)} color={C.ink} />
      </TouchableOpacity>
      <TouchableOpacity onPress={shareIt} style={[st.glassBtn, { marginLeft: scale(8) }]}>
        <Icon name="share-social-outline" size={scale(18)} color={C.ink} />
      </TouchableOpacity>
    </View>

    {/* Enquiry Button on Hero Image - Bottom Left */}
    <View style={st.heroEnquiryBtn}>
      <TouchableOpacity 
        style={st.enquiryButtonHero}
        onPress={() => openEnquiryModal(prod)}
      >
        <Icon name="mail-outline" size={scale(16)} color="#fff" />
        <Text style={st.enquiryButtonText}>Enquire Now</Text>
      </TouchableOpacity>
    </View>

    <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: scale(70), height: scale(4), backgroundColor: '#FFFFFF55', borderRadius: scale(3), overflow: 'hidden' }}>
      <Animated.View style={{ height: scale(4), width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#fff' }} />
    </View>

    <View style={st.heroBottom}>
      <View style={{ flex: 1 }}>
        <Text style={st.title}>{prod.title}</Text>
        <View style={st.priceRatingRow}>
          <Text style={st.subTitle}>{headerItem.category} • {headerItem.requests?.toLocaleString()} requests</Text>
        </View>
          <Text style={st.priceText}>{formatPrice(prod.price)}</Text>
      </View>
      <View style={st.ratingPill}><Icon name="star" size={scale(14)} color="#fff" /><Text style={st.ratingTxt}>{headerItem.rating}</Text></View>
    </View>
  </ImageBackground>
</View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(100) }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        onScrollBeginDrag={() => bar.stopAnimation()}
        onScrollEndDrag={() => {
          Animated.timing(bar, { toValue: 1, duration: 10000, easing: Easing.linear, useNativeDriver: false }).start();
        }}
      >
        {/* About */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>About</Text>
          <Text style={st.desc}>{prod.description}</Text>
          
          {/* Enquiry Button in About Section */}
          <TouchableOpacity 
            style={st.enquiryButtonSection}
            onPress={() => openEnquiryModal(prod)}
          >
            <Icon name="mail-outline" size={scale(16)} color="#fff" />
            <Text style={st.enquiryButtonText}>Enquire About This Product</Text>
          </TouchableOpacity>
        </View>

        {/* Services - REFINED */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Add services</Text>
          <Text style={st.sectionSub}>Shortlist what you need. You can edit before confirming.</Text>

          {loading ? (
            <View style={[st.serviceChip, { justifyContent:'center' }]}>
              <Text style={st.sectionSub}>Loading services...</Text>
            </View>
          ) : (!prod.services || prod.services.length === 0) ? (
            <View style={[st.serviceChip, { justifyContent:'center' }]}>
              <Text style={st.sectionSub}>No services available for this product.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: scale(16) }}
            >
              {prod.services.map((s) => {
                const sid = String(s.id);
                const q = cart[sid] || 0;
                return (
                  <View key={`service-${sid}`} style={[st.serviceChip, { width: scale(220), marginRight: scale(10) }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.serviceTitle}>{s.name}</Text>
                      <Text style={st.servicePrice}>{Rs(s.price)}</Text>
                    </View>
                    {q === 0 ? (
                      <TouchableOpacity onPress={() => add(sid)} style={st.addBtnSm}>
                        <Icon name="add" size={scale(18)} color="#fff" /><Text style={st.addTxt}>Add</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={st.counterSm}>
                        <TouchableOpacity onPress={() => sub(sid)} style={st.counterBtnSm}><Icon name="remove" size={scale(18)} color={C.primary} /></TouchableOpacity>
                        <Text style={st.qty}>{q}</Text>
                        <TouchableOpacity onPress={() => add(sid)} style={st.counterBtnSm}><Icon name="add" size={scale(18)} color={C.primary} /></TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Parts Section */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Add parts</Text>
          <Text style={st.sectionSub}>Spare parts available for this equipment.</Text>

          {loading ? (
            <View style={[st.serviceChip, { justifyContent:'center' }]}>
              <Text style={st.sectionSub}>Loading parts...</Text>
            </View>
          ) : (!prod.parts || prod.parts.length === 0) ? (
            <View style={[st.serviceChip, { justifyContent:'center' }]}>
              <Text style={st.sectionSub}>No parts available for this product.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: scale(16) }}
            >
              {prod.parts.map((p) => {
                const key = `part:${p.id}`;
                const q = cart[key] || 0;
                return (
                  <View key={`part-${p.id}`} style={[st.serviceChip, { width: scale(220), marginRight: scale(10), borderColor: '#FED7AA' }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.serviceTitle}>{p.name}</Text>
                      <Text style={[st.servicePrice, { color: '#EA580C' }]}>{Rs(p.price)}</Text>
                    </View>
                    {q === 0 ? (
                      <TouchableOpacity onPress={() => addPart(p.id)} style={[st.addBtnSm, { backgroundColor: '#EA580C' }]}>
                        <Icon name="add" size={scale(18)} color="#fff" /><Text style={st.addTxt}>Add</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[st.counterSm, { backgroundColor: '#FFF7ED' }]}>
                        <TouchableOpacity onPress={() => subPart(p.id)} style={st.counterBtnSm}><Icon name="remove" size={scale(18)} color="#EA580C" /></TouchableOpacity>
                        <Text style={[st.qty, { color: '#EA580C' }]}>{q}</Text>
                        <TouchableOpacity onPress={() => addPart(p.id)} style={st.counterBtnSm}><Icon name="add" size={scale(18)} color="#EA580C" /></TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* Included / Not included */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>What's included</Text>
          <View style={st.wrapPills}>
            {(prod.included || []).map((t, i) => (
              <View key={`in-${i}`} style={[st.pill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
                <Icon name="checkmark-circle" size={scale(16)} color={C.ok} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={[st.sectionTitle, { marginTop: scale(14) }]}>Not included</Text>
          <View style={st.wrapPills}>
            {(prod.excluded || []).map((t, i) => (
              <View key={`ex-${i}`} style={[st.pill, { backgroundColor: '#FFF1F1', borderColor: '#FEE2E2' }]}>
                <Icon name="close-circle" size={scale(16)} color={C.danger} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Conditions */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Conditions</Text>
          {(prod.conditions || []).map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: scale(10) }}>
              <Icon name="information-circle-outline" size={scale(18)} color={C.warn} />
              <Text style={[st.desc, { marginLeft: scale(8), marginTop: scale(-2) }]}>{t}</Text>
            </View>
          ))}
        </View>

        {/* Process */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Our process</Text>
          <View style={st.stepper}>
            {processSteps.map((s, i) => (
              <View key={s.title} style={st.stepRow}>
                <View style={st.stepRail}>
                  <View style={st.stepDot}><Text style={st.stepNum}>{i + 1}</Text></View>
                  {i < processSteps.length - 1 && <View style={st.stepLine} />}
                </View>
                <View style={st.stepCard}>
                  <View style={st.stepIconWrap}><Icon name={s.icon} size={scale(16)} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepTitle}>{s.title}</Text>
                    <Text style={st.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* FAQs */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>FAQs</Text>
          {(prod.faqs || []).map((f, i) => (
            <FAQItem key={`${f.id ?? (f.q || 'faq')}-${i}`} f={f} />
          ))}
          
          {/* Enquiry Button in FAQ Section */}
          <TouchableOpacity 
            style={st.enquiryButtonSection}
            onPress={() => openEnquiryModal(prod)}
          >
            <Icon name="help-circle-outline" size={scale(16)} color="#fff" />
            <Text style={st.enquiryButtonText}>Still Have Questions? Enquire Now</Text>
          </TouchableOpacity>
        </View>

        {/* Reviews */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Reviews</Text>
          {(!reviews || reviews.length === 0) ? (
            <Text style={st.sectionSub}>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={st.revCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: scale(6) }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={st.revName}>{r.name}</Text>
                    {!!r.when && <Text style={[st.sectionSub, { marginLeft: scale(8) }]}>{String(r.when).slice(0,10)}</Text>}
                  </View>
                  <Stars value={r.stars} />
                </View>
                <Text style={st.revTxt}>{r.text}</Text>
              </View>
            ))
          )}
          {/* TODO: Uncomment when OwnerReviews screen is implemented
          <TouchableOpacity
            style={st.outlineBtn}
            onPress={() => navigation.navigate('OwnerReviews', { productId: effectiveProductId || null })}
          >
            <Text style={st.outlineTxt}>View all reviews</Text>
          </TouchableOpacity>
          */}
        </View>

        {/* Provide */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>What we provide</Text>
          <View style={st.provideRow}>
            {[
              { icon: 'shield-checkmark', label: 'KNI Verified' },
              { icon: 'medkit-outline', label: 'Genuine Spares' },
              { icon: 'timer-outline', label: 'Quick TAT' },
              { icon: 'document-text-outline', label: 'Digital Invoice' },
            ].map((p) => (
              <View key={p.label} style={st.provide}>
                <View style={st.provideIcon}><Icon name={p.icon} size={scale(18)} color={C.primary} /></View>
                <Text style={st.provideLbl}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky cart */}
      <View style={[st.cartBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : scale(12) }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.cartTop}>{totals.items ? `${totals.items} item${totals.items > 1 ? 's' : ''}` : 'No items added'}</Text>
          <Text style={st.cartAmt}>{Rs(totals.amt)}</Text>
        </View>
        <TouchableOpacity
          disabled={!totals.items}
          style={[st.primaryBtn, !totals.items && { opacity: 0.5 }]}
          onPress={() => {
            if (!totals.items) return;
            if (!ownerId) {
              Alert.alert('Owner not set', 'Please login again so we can save your request.');
              return;
            }
            onConfirm();
          }}
        >
          <Text style={st.primaryTxt}>{totals.items ? 'Request Now' : 'Select services'}</Text>
        </TouchableOpacity>
      </View>
      
      {/* Enquiry Modal */}
      <EnquiryModal
        visible={enquiryModalVisible}
        onClose={() => setEnquiryModalVisible(false)}
        product={selectedProduct}
        onSubmit={handleEnquirySubmit}
        loading={enquiryLoading}
      />
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  actionsWrap: { position: 'absolute', top: 0, right: scale(12), flexDirection: 'row' },
  glassBtn: {
    backgroundColor: '#FFFFFFEE', width: scale(38), height: scale(38), borderRadius: scale(12),
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF99', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: scale(8), elevation: 3,
  },
  heroBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: '#FFFFFFEE' },
  title: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  subTitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: scale(10), paddingVertical: scale(6), borderRadius: scale(999) },
  ratingTxt: { color: '#fff', fontWeight: '700', marginLeft: scale(6), fontSize: moderateScale(12) },

  section: { paddingHorizontal: scale(16), paddingTop: scale(16), paddingBottom: scale(6) },
  sectionTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink, marginBottom: scale(8) },
  sectionSub: { fontSize: moderateScale(12), color: C.muted, marginBottom: scale(8) },
  desc: { color: C.text, fontSize: moderateScale(14), lineHeight: moderateScale(20) },

  // Price styles
  priceRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(2),
    flexWrap: 'wrap',
  },
  priceText: {
    color: C.primary,
    fontSize: moderateScale(16),
    fontWeight: '800',
    marginRight: scale(8),
  },

  // Enquiry Button Styles
heroEnquiryBtn: {
  position: 'absolute',
  bottom: scale(115), // Position above the hero bottom content
  left: scale(5),
  right: scale(16),
  alignItems: 'flex-start', // Align to left
},
enquiryButtonHero: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: C.primary,
  paddingVertical: scale(10),
  paddingHorizontal: scale(16),
  borderRadius: scale(20),
  gap: scale(6),
  shadowColor: '#000',
  shadowOffset: { width: 0, height: scale(2) },
  shadowOpacity: 0.3,
  shadowRadius: scale(4),
  elevation: 5,
  alignSelf: 'flex-start', // Align to left
},
enquiryButtonText: {
  color: '#fff',
  fontSize: moderateScale(14),
  fontWeight: '700',
},
// Enquiry Button in Section Styles
enquiryButtonSection: {
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: C.primary,
  paddingVertical: scale(14),
  paddingHorizontal: scale(20),
  borderRadius: scale(14),
  gap: scale(8),
  marginTop: scale(16),
  borderWidth: 1,
  borderColor: '#E11D48',
  shadowColor: '#000',
  shadowOffset: { width: 0, height: scale(2) },
  shadowOpacity: 0.1,
  shadowRadius: scale(4),
  elevation: 3,
},
enquiryButtonTextSection: {
  color: '#fff',
  fontSize: moderateScale(15),
  fontWeight: '700',
},

  serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: scale(14), padding: scale(12), marginRight: scale(10), borderWidth: 1, borderColor: '#EEF2F7' },
  serviceTitle: { color: C.text, fontWeight: '700', fontSize: moderateScale(14) },
  servicePrice: { color: C.ink, marginTop: scale(2), fontWeight: '700' },
  addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(999), marginLeft: scale(10) },
  addTxt: { color: '#fff', fontWeight: '800', marginLeft: scale(6), fontSize: moderateScale(12) },
  counterSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: scale(999), marginLeft: scale(10) },
  counterBtnSm: { paddingHorizontal: scale(10), paddingVertical: scale(6) },
  qty: { minWidth: scale(22), textAlign: 'center', fontWeight: '800', color: C.primary },

  wrapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: scale(999), paddingHorizontal: scale(12), paddingVertical: scale(8), borderWidth: 1 },
  pillTxt: { marginLeft: scale(6), color: '#334155', fontSize: moderateScale(12) },

  stepper: { marginTop: scale(4) },
  stepRow: { flexDirection: 'row', marginBottom: scale(14) },
  stepRail: { width: scale(30), alignItems: 'center' },
  stepDot: { width: scale(24), height: scale(24), borderRadius: scale(12), backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: C.primary, fontWeight: '800', fontSize: moderateScale(12) },
  stepLine: { width: scale(2), backgroundColor: '#E5E7EB', flex: 1, marginTop: scale(2), marginBottom: scale(-2) },
  stepCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(12), flexDirection: 'row', alignItems: 'center' },
  stepIconWrap: { width: scale(34), height: scale(34), borderRadius: scale(12), backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
  stepTitle: { color: C.text, fontWeight: '800' },
  stepDesc: { color: C.muted, marginTop: scale(2) },

  techCard: { flex: 1, backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(10), marginBottom: scale(10), flexDirection: 'row', alignItems: 'center' },
  techPic: { width: scale(54), height: scale(54), borderRadius: scale(12) },
  techName: { color: C.text, fontWeight: '700' },
  techJobs: { color: C.muted, fontSize: moderateScale(11) },

  faqItem: { backgroundColor: C.card, borderRadius: scale(14), padding: scale(12), marginBottom: scale(10), borderWidth: 1, borderColor: '#EEF2F7' },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { color: C.text, fontWeight: '700', fontSize: moderateScale(14) },
  faqA: { color: C.muted, marginTop: scale(8), lineHeight: moderateScale(20) },

  revCard: { backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor: '#EEF2F7', padding: scale(12), marginBottom: scale(10) },
  revName: { color: C.text, fontWeight: '700' },
  revTxt: { color: C.text, marginTop: scale(2) },
  outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:scale(12), paddingVertical:scale(12), alignItems:'center', marginTop:scale(6), backgroundColor:'#fff' },
  outlineTxt:{ color:'#334155', fontWeight:'900' },

  provideRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: scale(10), marginTop: scale(6) },
  provide: { width: '48%', backgroundColor: C.card, borderRadius: scale(14), borderWidth: 1, borderColor:'#EEF2F7', padding: scale(12), flexDirection: 'row', alignItems: 'center' },
  provideIcon: { width: scale(36), height: scale(36), borderRadius: scale(12), backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginRight: scale(10) },
  provideLbl: { color: C.text, fontWeight: '700' },

  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(16), paddingTop: scale(12), borderTopWidth: 1, borderColor: '#E5E7EB' },
  cartTop: { color: C.muted, fontSize: moderateScale(12) },
  cartAmt: { color: C.ink, fontSize: moderateScale(18), fontWeight: '800' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: scale(14), paddingVertical: scale(12), paddingHorizontal: scale(18) },
  primaryTxt: { color: '#fff', fontWeight: '800' },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: scale(20),
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: scale(20),
    width: '100%',
    maxHeight: SCREEN_HEIGHT * 0.8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(2) },
    shadowOpacity: 0.25,
    shadowRadius: scale(10),
    elevation: 5,
  },
  modalScroll: {
    maxHeight: SCREEN_HEIGHT * 0.95,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: scale(20),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: moderateScale(20),
    fontWeight: '700',
    color: C.text,
    flex: 1,
  },
  closeButton: {
    padding: scale(4),
  },
  modalDescription: {
    padding: scale(20),
    paddingBottom: 0,
    fontSize: moderateScale(14),
    color: C.muted,
    lineHeight: moderateScale(20),
  },
  productName: {
    color: C.primary,
    fontWeight: '600',
  },
  form: {
    padding: scale(20),
  },
  inputGroup: {
    marginBottom: scale(16),
  },
  label: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.text,
    marginBottom: scale(6),
  },
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: moderateScale(16),
    color: C.text,
    backgroundColor: '#fff',
  },
  textArea: {
    height: scale(100),
    textAlignVertical: 'top',
  },
  modalActions: {
    flexDirection: 'row',
    gap: scale(12),
    marginTop: scale(20),
  },
  button: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(12),
    borderRadius: scale(10),
    gap: scale(8),
  },
  cancelButton: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelButtonText: {
    color: C.text,
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  submitButton: {
    backgroundColor: C.primary,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: scale(4),
  },
});

/* ---------- Skeleton styles ---------- */
const sk = StyleSheet.create({
  hero: { height: scale(260), backgroundColor: '#E9EEF5' },
  glassBtn:{ backgroundColor:'#FFFFFFEE', width:scale(38), height:scale(38), borderRadius:scale(12), borderWidth:1, borderColor:'#FFFFFF99' },
  ratingPill:{ width:scale(90), height:scale(28), borderRadius:scale(999), backgroundColor:'#F1F5F9' },
  h2:{ height:scale(20), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
  para:{ height:scale(12), borderRadius:scale(6), backgroundColor:'#E9EEF5' },
  lineLg:{ height:scale(18), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
  lineMd:{ height:scale(14), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
  lineSm:{ height:scale(12), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
  lineXs:{ height:scale(10), borderRadius:scale(8), backgroundColor:'#E9EEF5' },
  btnPill:{ width:scale(78), height:scale(32), borderRadius:scale(999), backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginLeft:scale(10) },
});

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
    fontSize: moderateScale(16),
    color: C.text,
    backgroundColor: '#fff',
  },
  textArea: {
    height: scale(100),
    textAlignVertical: 'top',
  },
});