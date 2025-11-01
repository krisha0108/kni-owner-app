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
//         <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.ink} />
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
//     <View style={[st.serviceChip, { width: 220 }]}>
//       <View style={{ flex: 1 }}>
//         <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
//         <Animated.View style={[sk.lineSm, { width: 80, marginTop: 6, opacity: pulse }]} />
//       </View>
//       <Animated.View style={[sk.btnPill, { opacity: pulse }]} />
//     </View>
//   );

//   return (
//     <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
//       <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
//         <Animated.View style={[sk.hero, { opacity: pulse }]} />
//         <View style={[st.actionsWrap, { paddingTop: 8 }]}>
//           <View style={sk.glassBtn} />
//           <View style={[sk.glassBtn, { marginLeft: 8 }]} />
//         </View>
//         <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3 }} />
//         <View style={st.heroBottom}>
//           <View style={{ flex: 1 }}>
//             <Animated.View style={[sk.lineLg, { width: '60%', opacity: pulse }]} />
//             <Animated.View style={[sk.lineSm, { width: 140, marginTop: 6, opacity: pulse }]} />
//           </View>
//           <View style={sk.ratingPill} />
//         </View>
//       </View>

//       <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + 100 }} showsVerticalScrollIndicator={false}>
//         <View style={st.section}>
//           <Animated.View style={[sk.h2, { width: 100, opacity: pulse }]} />
//           <Animated.View style={[sk.para, { width: '95%', marginTop: 8, opacity: pulse }]} />
//           <Animated.View style={[sk.para, { width: '85%', marginTop: 6, opacity: pulse }]} />
//         </View>

//         <View style={st.section}>
//           <Animated.View style={[sk.h2, { width: 130, opacity: pulse }]} />
//           <Animated.View style={[sk.lineXs, { width: 220, marginTop: 6, opacity: pulse }]} />
//           <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, marginTop: 10 }}>
//             {[0,1,2].map(i => <ServiceChip key={i} />)}
//           </ScrollView>
//         </View>
//       </ScrollView>

//       <View style={[st.cartBar, { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 }]}>
//         <View style={{ flex:1 }}>
//           <Animated.View style={[sk.lineXs, { width: 120, opacity: pulse }]} />
//           <Animated.View style={[sk.lineMd, { width: 80, marginTop:6, opacity: pulse }]} />
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
//       <View style={[st.serviceChip, { width: 220 }]}>
//         <View style={{ flex: 1 }}>
//           <Text style={st.serviceTitle}>{s.name}</Text>
//           <Text style={st.servicePrice}>{Rs(s.price)}</Text>
//         </View>
//         {q === 0 ? (
//           <TouchableOpacity onPress={() => add(s.id)} style={st.addBtnSm}>
//             <Icon name="add" size={18} color="#fff" /><Text style={st.addTxt}>Add</Text>
//           </TouchableOpacity>
//         ) : (
//           <View style={st.counterSm}>
//             <TouchableOpacity onPress={() => sub(s.id)} style={st.counterBtnSm}><Icon name="remove" size={18} color={C.primary} /></TouchableOpacity>
//             <Text style={st.qty}>{q}</Text>
//             <TouchableOpacity onPress={() => add(s.id)} style={st.counterBtnSm}><Icon name="add" size={18} color={C.primary} /></TouchableOpacity>
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
//           imageStyle={{ borderRadius: 12 }}
//         />
//         <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
//           <Text style={st.techName} numberOfLines={1}>{t.name}</Text>
//           <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
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
//         <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:24 }}>
//           <Icon name="cloud-offline-outline" size={36} color={C.muted} />
//           <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, marginTop: 8 }}>Couldn’t load product</Text>
//           <Text style={{ color: C.muted, textAlign:'center', marginTop: 6 }}>{networkErr}</Text>
//           <TouchableOpacity onPress={onRefresh} style={[st.outlineBtn, { marginTop: 14, paddingHorizontal: 18 }]}>
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
//         <View style={{ backgroundColor:'#FFF7ED', padding:10 }}>
//           <Text style={{ color:'#B45309', fontWeight:'700' }}>Owner not set</Text>
//           <Text style={{ color:'#92400E', marginTop:4, fontSize:12 }}>
//             Please login again. Cart won’t be saved to the server until we have your owner ID.
//           </Text>
//         </View>
//       )}

//       {/* HERO */}
//       <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
//         <ImageBackground source={{ uri: (images[idx] || FALLBACK_IMAGES[0]) }} style={{ width: '100%', height: 260, justifyContent: 'flex-end' }}>
//           <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

//           <View style={[st.actionsWrap, { paddingTop: 8 }]}>
//             <TouchableOpacity onPress={() => navigation.goBack()} style={st.glassBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
//               <Icon name="close" size={18} color={C.ink} />
//             </TouchableOpacity>
//             <TouchableOpacity onPress={shareIt} style={[st.glassBtn, { marginLeft: 8 }]}>
//               <Icon name="share-social-outline" size={18} color={C.ink} />
//             </TouchableOpacity>
//           </View>

//           <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3, overflow: 'hidden' }}>
//             <Animated.View style={{ height: 4, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#fff' }} />
//           </View>

//           <View style={st.heroBottom}>
//             <View style={{ flex: 1 }}>
//               <Text style={st.title}>{prod.title}</Text>
//               <Text style={st.subTitle}>{headerItem.category} • {headerItem.requests?.toLocaleString()} requests</Text>
//             </View>
//             <View style={st.ratingPill}><Icon name="star" size={14} color="#fff" /><Text style={st.ratingTxt}>{headerItem.rating}</Text></View>
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
//               contentContainerStyle={{ paddingRight: 16 }}
//             />
//           )}
//         </View>

//         {/* Included / Not included */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>What’s included</Text>
//           <View style={st.wrapPills}>
//             {(prod.included || []).map((t, i) => (
//               <View key={`in-${i}`} style={[st.pill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
//                 <Icon name="checkmark-circle" size={16} color={C.ok} /><Text style={st.pillTxt}>{t}</Text>
//               </View>
//             ))}
//           </View>

//           <Text style={[st.sectionTitle, { marginTop: 14 }]}>Not included</Text>
//           <View style={st.wrapPills}>
//             {(prod.excluded || []).map((t, i) => (
//               <View key={`ex-${i}`} style={[st.pill, { backgroundColor: '#FFF1F1', borderColor: '#FEE2E2' }]}>
//                 <Icon name="close-circle" size={16} color={C.danger} /><Text style={st.pillTxt}>{t}</Text>
//               </View>
//             ))}
//           </View>
//         </View>

//         {/* Conditions */}
//         <View style={st.section}>
//           <Text style={st.sectionTitle}>Conditions</Text>
//           {(prod.conditions || []).map((t, i) => (
//             <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
//               <Icon name="information-circle-outline" size={18} color={C.warn} />
//               <Text style={[st.desc, { marginLeft: 8, marginTop: -2 }]}>{t}</Text>
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
//                   <View style={st.stepIconWrap}><Icon name={s.icon} size={16} color={C.primary} /></View>
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
//               columnWrapperStyle={{ gap: 10 }}
//               contentContainerStyle={{ paddingBottom: 4 }}
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
//                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
//                   <View style={{ flexDirection: 'row', alignItems: 'center' }}>
//                     <Text style={st.revName}>{r.name}</Text>
//                     {!!r.when && <Text style={[st.sectionSub, { marginLeft: 8 }]}>{String(r.when).slice(0,10)}</Text>}
//                   </View>
//                   <Stars value={r.stars} />
//                 </View>
//                 <Text style={st.revTxt}>{r.text}</Text>
//               </View>
//             ))
//           )}
//           <TouchableOpacity
//             style={st.outlineBtn}
//             onPress={() => navigation.navigate('OwnerReviews', { productId: productId || null })}
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
//                 <View style={st.provideIcon}><Icon name={p.icon} size={18} color={C.primary} /></View>
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
//   actionsWrap: { position: 'absolute', top: 0, right: 12, flexDirection: 'row' },
//   glassBtn: {
//     backgroundColor: '#FFFFFFEE', width: 38, height: 38, borderRadius: 12,
//     alignItems: 'center', justifyContent: 'center',
//     borderWidth: 1, borderColor: '#FFFFFF99', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
//   },
//   heroBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFFEE' },
//   title: { fontSize: 18, fontWeight: '800', color: C.ink },
//   subTitle: { fontSize: 12, color: C.muted, marginTop: 2 },
//   ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
//   ratingTxt: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 12 },

//   section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
//   sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8 },
//   sectionSub: { fontSize: 12, color: C.muted, marginBottom: 8 },
//   desc: { color: C.text, fontSize: 14, lineHeight: 20 },

//   serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, marginRight: 10, borderWidth: 1, borderColor: '#EEF2F7' },
//   serviceTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
//   servicePrice: { color: C.ink, marginTop: 2, fontWeight: '700' },
//   addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 10 },
//   addTxt: { color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 12 },
//   counterSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 999, marginLeft: 10 },
//   counterBtnSm: { paddingHorizontal: 10, paddingVertical: 6 },
//   qty: { minWidth: 22, textAlign: 'center', fontWeight: '800', color: C.primary },

//   wrapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
//   pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
//   pillTxt: { marginLeft: 6, color: '#334155', fontSize: 12 },

//   stepper: { marginTop: 4 },
//   stepRow: { flexDirection: 'row', marginBottom: 14 },
//   stepRail: { width: 30, alignItems: 'center' },
//   stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
//   stepNum: { color: C.primary, fontWeight: '800', fontSize: 12 },
//   stepLine: { width: 2, backgroundColor: '#E5E7EB', flex: 1, marginTop: 2, marginBottom: -2 },
//   stepCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
//   stepIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
//   stepTitle: { color: C.text, fontWeight: '800' },
//   stepDesc: { color: C.muted, marginTop: 2 },

//   techCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
//   techPic: { width: 54, height: 54, borderRadius: 12 },
//   techName: { color: C.text, fontWeight: '700' },
//   techJobs: { color: C.muted, fontSize: 11 },

//   faqItem: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEF2F7' },
//   faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   faqQ: { color: C.text, fontWeight: '700', fontSize: 14 },
//   faqA: { color: C.muted, marginTop: 8, lineHeight: 20 },

//   revCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, marginBottom: 10 },
//   revName: { color: C.text, fontWeight: '700' },
//   revTxt: { color: C.text, marginTop: 2 },
//   outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:12, paddingVertical:12, alignItems:'center', marginTop:6, backgroundColor:'#fff' },
//   outlineTxt:{ color:'#334155', fontWeight:'900' },

//   provideRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 6 },
//   provide: { width: '48%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor:'#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
//   provideIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
//   provideLbl: { color: C.text, fontWeight: '700' },

//   cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
//   cartTop: { color: C.muted, fontSize: 12 },
//   cartAmt: { color: C.ink, fontSize: 18, fontWeight: '800' },
//   primaryBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
//   primaryTxt: { color: '#fff', fontWeight: '800' },
// });

// /* ---------- Skeleton styles ---------- */
// const sk = StyleSheet.create({
//   hero: { height: 260, backgroundColor: '#E9EEF5' },
//   glassBtn:{ backgroundColor:'#FFFFFFEE', width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#FFFFFF99' },
//   ratingPill:{ width:90, height:28, borderRadius:999, backgroundColor:'#F1F5F9' },
//   h2:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
//   para:{ height:12, borderRadius:6, backgroundColor:'#E9EEF5' },
//   lineLg:{ height:18, borderRadius:8, backgroundColor:'#E9EEF5' },
//   lineMd:{ height:14, borderRadius:8, backgroundColor:'#E9EEF5' },
//   lineSm:{ height:12, borderRadius:8, backgroundColor:'#E9EEF5' },
//   lineXs:{ height:10, borderRadius:8, backgroundColor:'#E9EEF5' },
//   btnPill:{ width:78, height:32, borderRadius:999, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginLeft:10 },
// });
// src/screens/RequestDetail.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Image, ImageBackground, Animated, Easing,
  TouchableOpacity, ScrollView, FlatList, Share, RefreshControl, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api, IMAGE_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';

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

/* ---------- FAQ ITEM ---------- */
const FAQItem = React.memo(({ f }) => {
  const [open, setOpen] = useState(false);
  return (
    <View style={st.faqItem}>
      <TouchableOpacity style={st.faqHead} onPress={() => setOpen(o => !o)} accessibilityRole="button">
        <Text style={st.faqQ}>{f.q}</Text>
        <Icon name={open ? 'chevron-up' : 'chevron-down'} size={18} color={C.ink} />
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
    <View style={[st.serviceChip, { width: 220 }]}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[sk.lineMd, { width: '70%', opacity: pulse }]} />
        <Animated.View style={[sk.lineSm, { width: 80, marginTop: 6, opacity: pulse }]} />
      </View>
      <Animated.View style={[sk.btnPill, { opacity: pulse }]} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
      <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
        <Animated.View style={[sk.hero, { opacity: pulse }]} />
        <View style={[st.actionsWrap, { paddingTop: 8 }]}>
          <View style={sk.glassBtn} />
          <View style={[sk.glassBtn, { marginLeft: 8 }]} />
        </View>
        <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3 }} />
        <View style={st.heroBottom}>
          <View style={{ flex: 1 }}>
            <Animated.View style={[sk.lineLg, { width: '60%', opacity: pulse }]} />
            <Animated.View style={[sk.lineSm, { width: 140, marginTop: 6, opacity: pulse }]} />
          </View>
          <View style={sk.ratingPill} />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + 100 }} showsVerticalScrollIndicator={false}>
        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 100, opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '95%', marginTop: 8, opacity: pulse }]} />
          <Animated.View style={[sk.para, { width: '85%', marginTop: 6, opacity: pulse }]} />
        </View>

        <View style={st.section}>
          <Animated.View style={[sk.h2, { width: 130, opacity: pulse }]} />
          <Animated.View style={[sk.lineXs, { width: 220, marginTop: 6, opacity: pulse }]} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 16, marginTop: 10 }}>
            {[0,1,2].map(i => <ServiceChip key={i} />)}
          </ScrollView>
        </View>
      </ScrollView>

      <View style={[st.cartBar, { paddingBottom: insetsBottom > 0 ? insetsBottom : 12 }]}>
        <View style={{ flex:1 }}>
          <Animated.View style={[sk.lineXs, { width: 120, opacity: pulse }]} />
          <Animated.View style={[sk.lineMd, { width: 80, marginTop:6, opacity: pulse }]} />
        </View>
        <View style={sk.primaryBtn} />
      </View>
    </SafeAreaView>
  );
}

/* ---------- MAIN ---------- */
export default function RequestDetail({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const productId = route?.params?.id ?? route?.params?.productId ?? null;

  // --- READ OWNER ID FROM ANY KEY ---
  const [ownerId, setOwnerId] = useState(null);
  useEffect(() => {
    (async () => {
      try {
        const a = await AsyncStorage.getItem('owner_id');
        const b = await AsyncStorage.getItem('restaurant_owner_id');
        const c = await AsyncStorage.getItem('ownerId');
        const chosen = Number(a || b || c || 0);
        if (Number.isFinite(chosen) && chosen > 0) setOwnerId(chosen);
        else setOwnerId(null);
      } catch {
        setOwnerId(null);
      }
    })();
  }, []);

  // Build service->product map
  const [svc2prod, setSvc2prod] = useState({});
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get('/app/services', { params: ownerId ? { owner_id: ownerId } : {} });
        const arr = Array.isArray(res?.data) ? res.data
                  : Array.isArray(res?.data?.data) ? res.data.data : [];
        const m = {};
        arr.forEach(s => {
          const sid = Number(s.id);
          const pid = Number(s.product_id);
          if (sid > 0 && pid > 0) m[sid] = pid;
        });
        setSvc2prod(m);
      } catch { setSvc2prod({}); }
    })();
  }, [ownerId]);

  const headerItem = route?.params?.item ?? {
    title: 'Commercial Fridge Service',
    category: 'Fridge',
    rating: 4.8,
    requests: 1225,
    desc: 'Cooling issues, gas refill, thermostat faults & preventive maintenance.',
    image: null,
  };

  const [prod, setProd] = useState({
    title: headerItem.title,
    description: headerItem.desc,
    storyImages: FALLBACK_IMAGES,
    included: FALLBACK_INCLUDED,
    excluded: FALLBACK_EXCLUDED,
    conditions: FALLBACK_CONDITIONS,
    faqs: FALLBACK_FAQS,
    services: [], // Start with empty array instead of fallback services
  });

  const [technicians, setTechnicians] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [networkErr, setNetworkErr] = useState('');
  const [refreshing, setRefreshing] = useState(false);

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

  /** Technicians */
  const fetchTechnicians = useCallback(async (serviceId) => {
    const qs = (serviceId !== undefined && serviceId !== null && String(serviceId) !== '')
      ? { service_id: String(serviceId) } : {};
    const res = await safeGet('/app/technicians', 2, ownerId ? { ...qs, owner_id: ownerId } : qs);
    const payload = res?.data;
    const arr = Array.isArray(payload) ? payload : [];
    const mapped = arr.map((t) => ({
      id: String(t.id ?? ''),
      name: t.name || 'Unknown',
      avatar: (t.avatar && typeof t.avatar === 'string' && t.avatar.startsWith('http')) ? t.avatar : '',
      rating: Number.isFinite(Number(t.rating)) ? Number(t.rating) : 0,
      jobs: Number.isFinite(Number(t.jobs)) ? Number(t.jobs) : 0,
    })).filter(x => x.id);
    const top3 = mapped.sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 3);
    setTechnicians(top3);
  }, [ownerId, safeGet]);

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

  // 🔥 REFINED: Fetch product-specific services
  const fetchAll = useCallback(async () => {
    setNetworkErr(''); 
    setLoading(true);
    let serviceIdForTech;
    
    try {
      if (productId) {
        console.log(`🔄 Fetching product ${productId} details...`);
        
        // Fetch product details
        const res = await safeGet(`/app/products/${productId}`, 2, ownerId ? { owner_id: ownerId } : {});
        const d = res?.data ?? {};

        const resolvedImages = buildStoryImages(d, headerItem) || FALLBACK_IMAGES;
        const included   = normalizeArray(d.included,   FALLBACK_INCLUDED);
        const excluded   = normalizeArray(d.excluded,   FALLBACK_EXCLUDED);
        const conditions = normalizeArray(d.conditions, FALLBACK_CONDITIONS);
        const faqs       = normalizeArray(d.faqs,       FALLBACK_FAQS);
        
        let services = [];

        // 🔥 METHOD 1: Try to get services directly from product response
        if (d.services && Array.isArray(d.services) && d.services.length > 0) {
          console.log(`✅ Found ${d.services.length} services in product response`);
          services = d.services.map((s) => ({
            id: Number(s.id),
            name: s.title || s.name || `Service #${s.id}`,
            price: Number(s.price || s.mrp || 0),
          }));
          serviceIdForTech = services[0]?.id;
        } 
        
        // 🔥 METHOD 2: If no services in product response, fetch all and filter by product_id
        if (services.length === 0) {
          try {
            console.log(`🔄 Fetching all services to filter by product_id: ${productId}`);
            const srvRes = await safeGet('/app/services', 2, ownerId ? { owner_id: ownerId } : {});
            const allServices = Array.isArray(srvRes?.data) ? srvRes.data
              : Array.isArray(srvRes?.data?.data) ? srvRes.data.data : [];
            
            console.log(`📦 Retrieved ${allServices.length} total services from API`);
            
            // 🔥 KEY FIX: Filter services by product_id
            const filteredServices = allServices.filter(s => {
              const serviceProductId = Number(s.product_id);
              const currentProductId = Number(productId);
              const match = serviceProductId === currentProductId;
              
              if (match) {
                console.log(`✅ Service ${s.id} matches product ${productId}`);
              }
              
              return match;
            });
            
            console.log(`✅ Filtered ${filteredServices.length} services for product ${productId}`);
            
            if (filteredServices.length > 0) {
              services = filteredServices.map((s) => ({
                id: Number(s.id),
                name: s.title || s.name || `Service #${s.id}`,
                price: Number(s.price || s.mrp || 0),
              }));
              serviceIdForTech = services[0]?.id;
            }
          } catch (serviceErr) {
            console.log('❌ Services API failed:', serviceErr.message);
          }
        }

        // 🔥 METHOD 3: Show empty array if no product-specific services found
        if (services.length === 0) {
          console.log(`⚠️ No services found for product ${productId}`);
        }

        // Prefetch images
        resolvedImages.slice(0, 3).forEach((uri) =>
          Image.prefetch(uri).then(
            () => logImg('prefetch ok:', uri),
            () => logImg('prefetch FAIL:', uri)
          )
        );

        setProd({
          title: d.title || headerItem.title,
          description: d.description || headerItem.desc,
          storyImages: resolvedImages,
          included, excluded, conditions, faqs, services,
        });
      } else {
        console.log('❌ No productId provided');
        setProd(p => ({ ...p, services: [] }));
      }
    } catch (e) {
      console.log('❌ fetchAll error:', e.message);
      setNetworkErr(e?.message || 'Failed to load product');
      setProd(p => ({ ...p, services: [] }));
    } finally {
      try { 
        await fetchTechnicians(serviceIdForTech); 
      } catch (e) { 
        console.log('Technicians fetch failed:', e.message);
        setTechnicians([]); 
      }
      try { 
        await fetchReviews(productId || null); 
      } catch (e) { 
        console.log('Reviews fetch failed:', e.message);
        setReviews([]); 
      }
      setLoading(false);
    }
  }, [fetchTechnicians, fetchReviews, headerItem, ownerId, productId, safeGet]);

  useEffect(() => { 
    fetchAll(); 
  }, [fetchAll]);

  // Debug effect to monitor services
  useEffect(() => {
    console.log('🔍 Current State:', {
      productId,
      servicesCount: prod.services?.length || 0,
      services: prod.services,
      loading,
      hasOwnerId: !!ownerId
    });
  }, [prod.services, productId, loading, ownerId]);

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
  }, [idx, loading, run]);

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
    () => `rdraft:${ownerKey}:${productId || 'global'}`,
    [ownerKey, productId]
  );

  // reverse map product->service for server items
  const prod2svc = useMemo(() => {
    const m = {};
    Object.entries(svc2prod || {}).forEach(([sid, pid]) => { if (pid) m[Number(pid)] = Number(sid); });
    return Object.keys(cart || {}).reduce((acc, sidStr) => {
      const sid = Number(sidStr);
      if (!(sid in acc)) acc[sid] = sid;
      return acc;
    }, m);
  }, [svc2prod, cart]);

  // hydrate local draft (initial)
  useEffect(() => {
    if (!persistKey) return;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(persistKey);
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') {
            setCart(prev => ({ ...prev, ...saved }));
          }
        }
      } catch {}
      hydratedRef.current.local = true;
    })();
  }, [persistKey, ownerKey]);

  // ⭐ Rehydrate when screen is focused
  const rehydrateLocalDraft = useCallback(async () => {
    if (!persistKey) return;
    try {
      const raw = await AsyncStorage.getItem(persistKey);
      const saved = raw ? JSON.parse(raw) : {};
      if (saved && typeof saved === 'object') {
        setCart(saved);
      }
    } catch {}
  }, [persistKey]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        if (!cancelled) await rehydrateLocalDraft();
      })();
      return () => { cancelled = true; };
    }, [rehydrateLocalDraft])
  );

  useEffect(() => { rehydrateLocalDraft(); }, [rehydrateLocalDraft]);

  // hydrate from server (snapshot only)
  useEffect(() => {
    (async () => {
      try {
        const params = ownerId ? { owner_id: ownerId } : {};
        const res = await api.get('/app/cart', { params });
        const data = res?.data?.cart ? res.data.cart : res?.data;
        const items = Array.isArray(data?.items) ? data.items : [];

        lastSyncedRef.current = {};
        items.forEach(it => {
          const pid = Number(it.product_id || 0);
          const qty = Number(it.quantity || 0);
          if (pid && qty >= 0) lastSyncedRef.current[pid] = qty;
        });

        if (!items.length) { hydratedRef.current.server = true; return; }

        const fromServer = {};
        items.forEach(it => {
          const pid = Number(it.product_id || 0);
          const sid = prod2svc[pid];
          const qty = Number(it.quantity || 0);
          if (sid && qty > 0) fromServer[sid] = qty;
        });
        setCart(prev => ({ ...prev, ...fromServer }));
      } catch {}
      hydratedRef.current.server = true;
    })();
  }, [ownerId, prod2svc]);

  // local autosave
  const persistDraftDebounced = useRef(
    debounce(async () => {
      try {
        await AsyncStorage.setItem(persistKey, JSON.stringify(cart || {}));
      } catch {}
    }, 400)
  ).current;
  useEffect(() => { persistDraftDebounced(); }, [cart, persistDraftDebounced]);
  useEffect(() => { persistDraftDebounced(); }, [svc2prod]);
  useEffect(() => {
    return () => {
      AsyncStorage.setItem(persistKey, JSON.stringify(cart || {})).catch(()=>{});
    };
  }, [persistKey, cart]);

  /* ---------- IMMEDIATE SERVER WRITE HELPERS ---------- */
  const serviceIdToProductId = useCallback((sid) => {
    const pid = Number(svc2prod[sid] ?? sid);
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  }, [svc2prod]);

  const writeServerQuantity = useCallback(async (sid, quantity) => {
    if (!ownerId) return;
    const pid = serviceIdToProductId(sid);
    if (!pid) return;

    try {
      if (quantity > 0) {
        await api.put(`/app/cart/items/${pid}`, { quantity }, { params: { owner_id: ownerId } });
      } else {
        await api.delete(`/app/cart/items/${pid}`, { params: { owner_id: ownerId } });
      }
    } catch (e) {
      console.log('SERVER WRITE FAIL', e?.response?.status, e?.response?.data);
      Alert.alert('Network', 'Could not save your selection to server right now.');
    }
  }, [ownerId, serviceIdToProductId]);

  const add = useCallback((sid) => {
    setCart(prev => {
      const nextQty = (prev[sid] || 0) + 1;
      const next = { ...prev, [sid]: nextQty };
      writeServerQuantity(sid, nextQty);
      return next;
    });
  }, [writeServerQuantity]);

  const sub = useCallback((sid) => {
    setCart(prev => {
      const nextQty = Math.max(0, (prev[sid] || 0) - 1);
      const next = { ...prev };
      if (nextQty === 0) delete next[sid]; else next[sid] = nextQty;
      writeServerQuantity(sid, nextQty);
      return next;
    });
  }, [writeServerQuantity]);

  /* ---------- TOTALS ---------- */
  const totals = useMemo(() => {
    try {
      let items = 0, amt = 0;
      (prod.services || []).forEach((s) => {
        const q = cart[s.id] || 0;
        items += q; amt += q * Number(s.price || 0);
      });
      return { items, amt };
    } catch { return { items: 0, amt: 0 }; }
  }, [cart, prod.services]);

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
      productId: String(productId ?? 'global'),
      productTitle: prod?.title || 'Commercial Fridge',
      category: headerItem?.category || 'Commercial',
      subtitle: route?.params?.description || '',
      heroImage: (prod?.storyImages?.[0]) || FALLBACK_IMAGES[0],
      services: Array.isArray(prod?.services) ? prod.services : [],
      cart,
      ownerId,
    };
  }, [productId, prod?.title, prod?.storyImages, prod?.services, headerItem?.category, route?.params?.subtitle, cart, ownerId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchAll();
    setRefreshing(false);
  }, [fetchAll]);

  const keyService = useCallback((s) => String(s.id), []);
  const getServiceLayout = useCallback((_, i) => ({ length: 230, offset: 230 * i, index: i }), []);

  const renderService = useCallback(({ item: s }) => {
    const q = cart[s.id] || 0;
    return (
      <View style={[st.serviceChip, { width: 220 }]}>
        <View style={{ flex: 1 }}>
          <Text style={st.serviceTitle}>{s.name}</Text>
          <Text style={st.servicePrice}>{Rs(s.price)}</Text>
        </View>
        {q === 0 ? (
          <TouchableOpacity onPress={() => add(s.id)} style={st.addBtnSm}>
            <Icon name="add" size={18} color="#fff" /><Text style={st.addTxt}>Add</Text>
          </TouchableOpacity>
        ) : (
          <View style={st.counterSm}>
            <TouchableOpacity onPress={() => sub(s.id)} style={st.counterBtnSm}><Icon name="remove" size={18} color={C.primary} /></TouchableOpacity>
            <Text style={st.qty}>{q}</Text>
            <TouchableOpacity onPress={() => add(s.id)} style={st.counterBtnSm}><Icon name="add" size={18} color={C.primary} /></TouchableOpacity>
          </View>
        )}
      </View>
    );
  }, [add, cart, sub]);

  const keyTech = useCallback((t) => String(t.id), []);
  const renderTech = useCallback(({ item: t }) => {
    const rating = Number.isFinite(Number(t.rating)) ? Number(t.rating) : 0;
    const jobs   = Number.isFinite(Number(t.jobs)) ? Number(t.jobs) : 0;
    const avatar = (t.avatar && typeof t.avatar === 'string' && t.avatar.startsWith('http'))
      ? t.avatar
      : FALLBACK_IMAGES[0];

    return (
      <View style={st.techCard}>
        <ImageBackground
          source={{ uri: avatar }}
          style={st.techPic}
          imageStyle={{ borderRadius: 12 }}
        />
        <View style={{ flex: 1, marginLeft: 10, minWidth: 0 }}>
          <Text style={st.techName} numberOfLines={1}>{t.name}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <Text style={st.techJobs}>⭐ {rating.toFixed(1)} • {jobs} jobs</Text>
          </View>
        </View>
      </View>
    );
  }, []);

  /* ---------- CONFIRM ---------- */
  const onConfirm = async () => {
    if (!ownerId) {
      Alert.alert('Owner not set', 'Please login again so we can save your request.');
      return;
    }
    try {
      const resp = await api.post('/app/cart/confirm', {}, { params: { owner_id: ownerId } });
      const cid = resp?.data?.cart_id || null;
      navigation.navigate('RequestNow', { ...requestNowParams, cartId: cid });
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Could not confirm right now';
      Alert.alert('Note', `${msg}\nProceeding with your selection.`);
      navigation.navigate('RequestNow', { ...requestNowParams, cartId: null });
    }
  };

  /* ---------- EARLY RETURNS ---------- */
  if (loading) return <SkeletonRequestDetail insetsBottom={insets.bottom} />;

  if (networkErr) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
        <View style={{ flex:1, alignItems:'center', justifyContent:'center', padding:24 }}>
          <Icon name="cloud-offline-outline" size={36} color={C.muted} />
          <Text style={{ color: C.ink, fontWeight: '800', fontSize: 16, marginTop: 8 }}>Couldn't load product</Text>
          <Text style={{ color: C.muted, textAlign:'center', marginTop: 6 }}>{networkErr}</Text>
          <TouchableOpacity onPress={onRefresh} style={[st.outlineBtn, { marginTop: 14, paddingHorizontal: 18 }]}>
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
        <View style={{ backgroundColor:'#FFF7ED', padding:10 }}>
          <Text style={{ color:'#B45309', fontWeight:'700' }}>Owner not set</Text>
          <Text style={{ color:'#92400E', marginTop:4, fontSize:12 }}>
            Please login again. Cart won't be saved to the server until we have your owner ID.
          </Text>
        </View>
      )}

      {/* HERO */}
      <View style={{ backgroundColor: C.card, borderBottomLeftRadius: R, borderBottomRightRadius: R, overflow: 'hidden' }}>
        <ImageBackground
          source={{ uri: (images[idx] || FALLBACK_IMAGES[0]) }}
          style={{ width: '100%', height: 260, justifyContent: 'flex-end' }}
          onError={(e) => logImg('HERO onError for uri:', images[idx], e?.nativeEvent)}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.22)' }]} />

          <View style={[st.actionsWrap, { paddingTop: 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={st.glassBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Icon name="close" size={18} color={C.ink} />
            </TouchableOpacity>
            <TouchableOpacity onPress={shareIt} style={[st.glassBtn, { marginLeft: 8 }]}>
              <Icon name="share-social-outline" size={18} color={C.ink} />
            </TouchableOpacity>
          </View>

          <View style={{ position: 'absolute', left: '5%', right: '5%', bottom: 70, height: 4, backgroundColor: '#FFFFFF55', borderRadius: 3, overflow: 'hidden' }}>
            <Animated.View style={{ height: 4, width: bar.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), backgroundColor: '#fff' }} />
          </View>

          <View style={st.heroBottom}>
            <View style={{ flex: 1 }}>
              <Text style={st.title}>{prod.title}</Text>
              <Text style={st.subTitle}>{headerItem.category} • {headerItem.requests?.toLocaleString()} requests</Text>
            </View>
            <View style={st.ratingPill}><Icon name="star" size={14} color="#fff" /><Text style={st.ratingTxt}>{headerItem.rating}</Text></View>
          </View>
        </ImageBackground>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
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
            <FlatList
              horizontal
              data={prod.services}
              keyExtractor={keyService}
              renderItem={renderService}
              getItemLayout={getServiceLayout}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingRight: 16 }}
            />
          )}
        </View>

        {/* Included / Not included */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>What's included</Text>
          <View style={st.wrapPills}>
            {(prod.included || []).map((t, i) => (
              <View key={`in-${i}`} style={[st.pill, { backgroundColor: '#ECFDF5', borderColor: '#D1FAE5' }]}>
                <Icon name="checkmark-circle" size={16} color={C.ok} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>

          <Text style={[st.sectionTitle, { marginTop: 14 }]}>Not included</Text>
          <View style={st.wrapPills}>
            {(prod.excluded || []).map((t, i) => (
              <View key={`ex-${i}`} style={[st.pill, { backgroundColor: '#FFF1F1', borderColor: '#FEE2E2' }]}>
                <Icon name="close-circle" size={16} color={C.danger} /><Text style={st.pillTxt}>{t}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Conditions */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Conditions</Text>
          {(prod.conditions || []).map((t, i) => (
            <View key={i} style={{ flexDirection: 'row', marginBottom: 10 }}>
              <Icon name="information-circle-outline" size={18} color={C.warn} />
              <Text style={[st.desc, { marginLeft: 8, marginTop: -2 }]}>{t}</Text>
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
                  <View style={st.stepIconWrap}><Icon name={s.icon} size={16} color={C.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.stepTitle}>{s.title}</Text>
                    <Text style={st.stepDesc}>{s.desc}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Technicians */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Top technicians</Text>
          {technicians.length === 0 ? (
            <Text style={st.sectionSub}>Technicians will appear here when available.</Text>
          ) : (
            <FlatList
              data={technicians}
              keyExtractor={keyTech}
              renderItem={renderTech}
              numColumns={2}
              columnWrapperStyle={{ gap: 10 }}
              contentContainerStyle={{ paddingBottom: 4 }}
              scrollEnabled={false}
            />
          )}
        </View>

        {/* FAQs */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>FAQs</Text>
          {(prod.faqs || []).map((f, i) => (
            <FAQItem key={`${f.id ?? (f.q || 'faq')}-${i}`} f={f} />
          ))}
        </View>

        {/* Reviews */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>Reviews</Text>
          {(!reviews || reviews.length === 0) ? (
            <Text style={st.sectionSub}>No reviews yet.</Text>
          ) : (
            reviews.map((r) => (
              <View key={r.id} style={st.revCard}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={st.revName}>{r.name}</Text>
                    {!!r.when && <Text style={[st.sectionSub, { marginLeft: 8 }]}>{String(r.when).slice(0,10)}</Text>}
                  </View>
                  <Stars value={r.stars} />
                </View>
                <Text style={st.revTxt}>{r.text}</Text>
              </View>
            ))
          )}
          <TouchableOpacity
            style={st.outlineBtn}
            onPress={() => navigation.navigate('OwnerReviews', { productId: productId || null })}
          >
            <Text style={st.outlineTxt}>View all reviews</Text>
          </TouchableOpacity>
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
                <View style={st.provideIcon}><Icon name={p.icon} size={18} color={C.primary} /></View>
                <Text style={st.provideLbl}>{p.label}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Sticky cart */}
      <View style={[st.cartBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
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
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  actionsWrap: { position: 'absolute', top: 0, right: 12, flexDirection: 'row' },
  glassBtn: {
    backgroundColor: '#FFFFFFEE', width: 38, height: 38, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#FFFFFF99', shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, elevation: 3,
  },
  heroBottom: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: '#FFFFFFEE' },
  title: { fontSize: 18, fontWeight: '800', color: C.ink },
  subTitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  ratingPill: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999 },
  ratingTxt: { color: '#fff', fontWeight: '700', marginLeft: 6, fontSize: 12 },

  section: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6 },
  sectionTitle: { fontSize: 18, fontWeight: '800', color: C.ink, marginBottom: 8 },
  sectionSub: { fontSize: 12, color: C.muted, marginBottom: 8 },
  desc: { color: C.text, fontSize: 14, lineHeight: 20 },

  serviceChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderRadius: 14, padding: 12, marginRight: 10, borderWidth: 1, borderColor: '#EEF2F7' },
  serviceTitle: { color: C.text, fontWeight: '700', fontSize: 14 },
  servicePrice: { color: C.ink, marginTop: 2, fontWeight: '700' },
  addBtnSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.primary, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, marginLeft: 10 },
  addTxt: { color: '#fff', fontWeight: '800', marginLeft: 6, fontSize: 12 },
  counterSm: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1', borderRadius: 999, marginLeft: 10 },
  counterBtnSm: { paddingHorizontal: 10, paddingVertical: 6 },
  qty: { minWidth: 22, textAlign: 'center', fontWeight: '800', color: C.primary },

  wrapPills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1 },
  pillTxt: { marginLeft: 6, color: '#334155', fontSize: 12 },

  stepper: { marginTop: 4 },
  stepRow: { flexDirection: 'row', marginBottom: 14 },
  stepRail: { width: 30, alignItems: 'center' },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center' },
  stepNum: { color: C.primary, fontWeight: '800', fontSize: 12 },
  stepLine: { width: 2, backgroundColor: '#E5E7EB', flex: 1, marginTop: 2, marginBottom: -2 },
  stepCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
  stepIconWrap: { width: 34, height: 34, borderRadius: 12, backgroundColor: '#FFF1F1', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stepTitle: { color: C.text, fontWeight: '800' },
  stepDesc: { color: C.muted, marginTop: 2 },

  techCard: { flex: 1, backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 10, marginBottom: 10, flexDirection: 'row', alignItems: 'center' },
  techPic: { width: 54, height: 54, borderRadius: 12 },
  techName: { color: C.text, fontWeight: '700' },
  techJobs: { color: C.muted, fontSize: 11 },

  faqItem: { backgroundColor: C.card, borderRadius: 14, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#EEF2F7' },
  faqHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  faqQ: { color: C.text, fontWeight: '700', fontSize: 14 },
  faqA: { color: C.muted, marginTop: 8, lineHeight: 20 },

  revCard: { backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor: '#EEF2F7', padding: 12, marginBottom: 10 },
  revName: { color: C.text, fontWeight: '700' },
  revTxt: { color: C.text, marginTop: 2 },
  outlineBtn:{ borderWidth:1, borderColor:'#CBD5E1', borderRadius:12, paddingVertical:12, alignItems:'center', marginTop:6, backgroundColor:'#fff' },
  outlineTxt:{ color:'#334155', fontWeight:'900' },

  provideRow: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginTop: 6 },
  provide: { width: '48%', backgroundColor: C.card, borderRadius: 14, borderWidth: 1, borderColor:'#EEF2F7', padding: 12, flexDirection: 'row', alignItems: 'center' },
  provideIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: '#FFE8E8', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  provideLbl: { color: C.text, fontWeight: '700' },

  cartBar: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 12, borderTopWidth: 1, borderColor: '#E5E7EB' },
  cartTop: { color: C.muted, fontSize: 12 },
  cartAmt: { color: C.ink, fontSize: 18, fontWeight: '800' },
  primaryBtn: { backgroundColor: C.primary, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 18 },
  primaryTxt: { color: '#fff', fontWeight: '800' },
});

/* ---------- Skeleton styles ---------- */
const sk = StyleSheet.create({
  hero: { height: 260, backgroundColor: '#E9EEF5' },
  glassBtn:{ backgroundColor:'#FFFFFFEE', width:38, height:38, borderRadius:12, borderWidth:1, borderColor:'#FFFFFF99' },
  ratingPill:{ width:90, height:28, borderRadius:999, backgroundColor:'#F1F5F9' },
  h2:{ height:20, borderRadius:8, backgroundColor:'#E9EEF5' },
  para:{ height:12, borderRadius:6, backgroundColor:'#E9EEF5' },
  lineLg:{ height:18, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineMd:{ height:14, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineSm:{ height:12, borderRadius:8, backgroundColor:'#E9EEF5' },
  lineXs:{ height:10, borderRadius:8, backgroundColor:'#E9EEF5' },
  btnPill:{ width:78, height:32, borderRadius:999, backgroundColor:'#F1F5F9', borderWidth:1, borderColor:'#E2E8F0', marginLeft:10 },
});