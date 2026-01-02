// screens/RequestNow.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, ImageBackground, Modal, TextInput, Platform,
  Dimensions, KeyboardAvoidingView, TouchableWithoutFeedback, Keyboard, Image, Alert
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';
import { Clipboard } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import RNFS from 'react-native-fs';
import { useFocusEffect } from '@react-navigation/native';

/* ---------- MONEY & UPI HELPERS ---------- */
const toPaise = (n) => Math.round(Number(n || 0) * 100);
const fromPaise = (p) => (p / 100);

/** Build a React-Native-safe UPI url (no URLSearchParams). */
const buildUpiUrl = ({ pa, pn, am, cu = 'INR', tn }) => {
  const amountStr = Number(am).toFixed(2);
  
  const params = [
    `pa=${pa}`,
    `pn=${pn}`,
    `am=${amountStr}`,
    `cu=${cu}`,
  ];
  
  if (tn && tn.trim()) {
    const cleanNote = tn
      .trim()
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .slice(0, 40);
    
    if (cleanNote) {
      params.push(`tn=${cleanNote}`);
    }
  }

  return `upi://pay?${params.join('&')}`;
};

/* ---------- THEME ---------- */
const C = {
  primary: '#EF3A3A', ink: '#1D2254', bg: '#F5F7FA', card: '#FFFFFF',
  text: '#0F172A', muted: '#6B7280', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', danger: '#EF4444',
};
const Rs = (n)=>`₹ ${Number(Math.round(n || 0)).toLocaleString('en-IN')}`;

/* ---------- FEES / TAX ---------- */
const FIXED_FEE = 49;
const GST_RATE  = 0.18;

const UPI_ID = 'vyapar.173506862114@hdfcbank';
const PAYEE_NAME = 'KNI';

/* ---------- DATE HELPERS ---------- */
const startOfDay = (d)=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

const SCREEN_W = Dimensions.get('window').width;

export default function RequestNow({ navigation, route }) {
  const insets = useSafeAreaInsets();

  /* ---------- INCOMING ---------- */
  const passedServices = Array.isArray(route?.params?.services) ? route.params.services : [];
  const passedParts    = Array.isArray(route?.params?.parts) ? route.params.parts : [];
  const passedCartRaw  = route?.params?.cart || {};
  const productId      = String(route?.params?.productId ?? route?.params?.id ?? 'global');
  const productTitle   = route?.params?.productTitle || 'Commercial Fridge';
  const category       = route?.params?.category || 'Commercial';
  const subtitle       = route?.params?.description || '';
  const heroImage      = route?.params?.heroImage || 'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp';

  /* ---------- STATE VARIABLES ---------- */
  const [ownerKey, setOwnerKey] = useState('global');
  const [cards, setCards] = useState([]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [selectedMap, setSelectedMap] = useState({});
  const [tip, setTip] = useState(0);
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentScreenshot, setPaymentScreenshot] = useState(null);
  const [address, setAddress] = useState({ label:'Home', line1:'Jdbhs, Maruti Titanium, Sard…' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addrModal, setAddrModal] = useState(false);
  const [addrLabel, setAddrLabel] = useState(address.label);
  const [addrLine1, setAddrLine1] = useState(address.line1);
  const [dateModal, setDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [restModal, setRestModal] = useState(false);
  const [restSel, setRestSel] = useState(null);
  const [loadingR, setLoadingR] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [restError, setRestError] = useState('');
  const [paymentModal, setPaymentModal] = useState(false);
  const [savingReq, setSavingReq] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  /* ---------- OWNER / PERSIST KEYS ---------- */
  useEffect(() => {
    (async () => {
      try {
        const idParam = route?.params?.ownerId ? String(route.params.ownerId).trim() : '';
        const a = await AsyncStorage.getItem('owner_id');
        const b = await AsyncStorage.getItem('restaurant_owner_id');
        const c = await AsyncStorage.getItem('ownerId');
        const chosen = String(idParam || a || b || c || '').trim();
        setOwnerKey(chosen ? `owner:${chosen}` : 'global');
      } catch {
        setOwnerKey('global');
      }
    })();
  }, [route?.params?.ownerId]);

  const rdraftKeyOf = useCallback(
    (pid) => `rdraft:${ownerKey}:${pid || 'global'}`,
    [ownerKey]
  );
  const rservicesKeyOf = useCallback(
    (pid) => `rservices:${ownerKey}:${pid || 'global'}`,
    [ownerKey]
  );
  const rpartsKeyOf = useCallback(
    (pid) => `rparts:${ownerKey}:${pid || 'global'}`,
    [ownerKey]
  );
  const pmetaKeyOf = useCallback(
    (pid) => `pmeta:${ownerKey}:${pid || 'global'}`,
    [ownerKey]
  );

  const K = useMemo(() => ({
    addr: `addr:${ownerKey}`,
    addrList: `addresses:${ownerKey}`,
    date: `service_date:${ownerKey}`,
    restaurant: `restaurant:${ownerKey}`,
  }), [ownerKey]);

  /* ---------- PERSIST CURRENT PRODUCT ---------- */
  useEffect(() => {
    (async () => {
      try {
        const meta = {
          productId,
          productTitle,
          category,
          subtitle,
          heroImage
        };
        await AsyncStorage.setItem(pmetaKeyOf(productId), JSON.stringify(meta));
        if (Array.isArray(passedServices) && passedServices.length) {
          await AsyncStorage.setItem(rservicesKeyOf(productId), JSON.stringify(passedServices));
        }
        if (Array.isArray(passedParts) && passedParts.length) {
          await AsyncStorage.setItem(rpartsKeyOf(productId), JSON.stringify(passedParts));
        }
      } catch {}
    })();
  }, [productId, productTitle, category, subtitle, heroImage, passedServices, passedParts, pmetaKeyOf, rservicesKeyOf, rpartsKeyOf]);

  /* ---------- FETCH PRODUCT FROM API ---------- */
  const fetchProductFromApi = useCallback(async (pid) => {
    try {
      // Skip if pid is 'global' or not a valid number
      if (!pid || pid === 'global' || isNaN(Number(pid))) {
        return null;
      }
      const res = await api.get('/app/products');
      const products = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      const product = products.find(p => String(p.id) === String(pid));
      if (product) {
        return {
          productId: String(product.id),
          productTitle: product.title || product.name || `Product #${product.id}`,
          category: product.category || 'General',
          subtitle: product.description || '',
          heroImage: product.image || product.featured_image || heroImage,
        };
      }
      return null;
    } catch (e) {
      console.log('[RequestNow] Failed to fetch product from API:', e?.message);
      return null;
    }
  }, [heroImage]);

  /* ---------- FETCH SERVICES FROM API ---------- */
  const fetchServicesFromApi = useCallback(async (pid) => {
    try {
      if (!pid || pid === 'global' || isNaN(Number(pid))) {
        return [];
      }
      const res = await api.get('/app/services', { params: { product_id: pid } });
      const services = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      // Filter services for this product
      const filtered = services.filter(s => String(s.product_id) === String(pid));
      return filtered.length > 0 ? filtered : services;
    } catch (e) {
      console.log('[RequestNow] Failed to fetch services from API:', e?.message);
      return [];
    }
  }, []);

  /* ---------- FETCH PARTS FROM API ---------- */
  const fetchPartsFromApi = useCallback(async (pid) => {
    try {
      if (!pid || pid === 'global' || isNaN(Number(pid))) {
        return [];
      }
      const res = await api.get('/app/parts', { params: { product_id: pid } });
      const parts = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
      return parts;
    } catch (e) {
      console.log('[RequestNow] Failed to fetch parts from API:', e?.message);
      return [];
    }
  }, []);

  /* ---------- LOAD ALL CARDS ---------- */
  const loadCartData = useCallback(async () => {
    try {
      setLoadingInit(true);

      let initialCart = {};
      try {
        const fromRD = Object.fromEntries(
          Object.entries(passedCartRaw || {}).filter(([_, q]) => Number(q) > 0)
        );
        if (Object.keys(fromRD).length) {
          initialCart = fromRD;
        } else {
          const raw = await AsyncStorage.getItem(rdraftKeyOf(productId));
          const saved = raw ? JSON.parse(raw) : {};
          initialCart = Object.fromEntries(Object.entries(saved||{}).filter(([_, q])=>Number(q)>0));
        }
      } catch {}

      // Only save to AsyncStorage if we have items from route params
      if (Object.keys(initialCart).length > 0) {
        await AsyncStorage.setItem(rdraftKeyOf(productId), JSON.stringify(initialCart||{})).catch(()=>{});
      }

      const allKeys = await AsyncStorage.getAllKeys();
      const myPrefix = `rdraft:${ownerKey}:`;
      const otherKeys = allKeys.filter(k => k.startsWith(myPrefix));

      const products = new Map();
      for (const key of otherKeys) {
        const pid = key.slice(myPrefix.length);
        const raw = await AsyncStorage.getItem(key);
        const cartObj = raw ? JSON.parse(raw) : {};
        const filtered = Object.fromEntries(Object.entries(cartObj || {}).filter(([_, q]) => Number(q) > 0));
        if (Object.keys(filtered).length) {
          products.set(pid, { pid, cart: filtered });
        }
      }

      // Only add current product if it has items or valid productId
      if (Object.keys(initialCart).length > 0 || (productId !== 'global' && !isNaN(Number(productId)))) {
        products.set(productId, { pid: productId, cart: initialCart });
      }

      // Process all products in PARALLEL for faster loading
      const productEntries = Array.from(products.values()).filter(
        ({ pid, cart }) => !(pid === 'global' && Object.keys(cart).length === 0)
      );

      // If no products with items, set empty cards
      if (productEntries.length === 0) {
        setCards([]);
        return;
      }

      const hydrated = (await Promise.all(
        productEntries.map(async ({ pid, cart }) => {
          let meta = null;
          try { meta = JSON.parse(await AsyncStorage.getItem(pmetaKeyOf(pid)) || 'null') } catch {}

          // If no meta found in AsyncStorage, try to fetch from API
          if (!meta && pid !== 'global' && !isNaN(Number(pid))) {
            meta = await fetchProductFromApi(pid);
            if (meta) {
              AsyncStorage.setItem(pmetaKeyOf(pid), JSON.stringify(meta)).catch(()=>{});
            }
          }

          if (!meta) {
            if (pid !== 'global' && !isNaN(Number(pid))) {
              meta = { productId: pid, productTitle: `Equipment #${pid}`, category: '—', subtitle: '', heroImage: heroImage };
            } else {
              return null; // Skip this product
            }
          }

          let svcs = [];
          if (pid === productId && passedServices?.length) {
            svcs = passedServices;
          } else {
            try { svcs = JSON.parse(await AsyncStorage.getItem(rservicesKeyOf(pid)) || '[]') } catch {}
          }

          // If no services found in AsyncStorage, try to fetch from API
          if ((!svcs || svcs.length === 0) && pid !== 'global' && !isNaN(Number(pid))) {
            svcs = await fetchServicesFromApi(pid);
            if (svcs.length > 0) {
              AsyncStorage.setItem(rservicesKeyOf(pid), JSON.stringify(svcs)).catch(()=>{});
            }
          }

          // Load parts
          let prts = [];
          if (pid === productId && passedParts?.length) {
            prts = passedParts;
          } else {
            try { prts = JSON.parse(await AsyncStorage.getItem(rpartsKeyOf(pid)) || '[]') } catch {}
          }

          // If no parts found in AsyncStorage, try to fetch from API
          if ((!prts || prts.length === 0) && pid !== 'global' && !isNaN(Number(pid))) {
            prts = await fetchPartsFromApi(pid);
            if (prts.length > 0) {
              AsyncStorage.setItem(rpartsKeyOf(pid), JSON.stringify(prts)).catch(()=>{});
            }
          }

          return { pid, meta, services: Array.isArray(svcs) ? svcs : [], parts: Array.isArray(prts) ? prts : [], cart };
        })
      )).filter(Boolean);

      hydrated.sort((a,b)=> (a.pid===productId?-1: b.pid===productId?1: (String(a.meta.productTitle||'').localeCompare(String(b.meta.productTitle||'')))));

      setCards(hydrated);
    } finally {
      setLoadingInit(false);
    }
  }, [ownerKey, productId, passedCartRaw, passedServices, passedParts, rdraftKeyOf, pmetaKeyOf, rservicesKeyOf, rpartsKeyOf, heroImage, fetchProductFromApi, fetchServicesFromApi, fetchPartsFromApi]);

  // Load cart data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCartData();
    }, [loadCartData])
  );

  /* ---------- CART MANAGEMENT ---------- */
  const updateCartFor = useCallback(async (pid, updater) => {
    setCards(prev => {
      const next = prev.map(card => {
        if (card.pid !== pid) return card;
        const newCart = updater(card.cart || {});
        AsyncStorage.setItem(rdraftKeyOf(pid), JSON.stringify(newCart || {})).catch(()=>{});
        return { ...card, cart: newCart };
      });
      return next;
    });
  }, [rdraftKeyOf]);

  const makeItems = useCallback((services, parts, cartObj) => {
    const items = [];

    // Process services
    const svcById = {};
    (services||[]).forEach(s => { svcById[Number(s.id)] = { name: s.title || s.name, unit: Number(s.price||0) }; });

    // Process parts
    const partById = {};
    (parts||[]).forEach(p => { partById[Number(p.id)] = { name: p.title || p.name, unit: Number(p.price||0) }; });

    Object.entries(cartObj||{}).forEach(([key, qty]) => {
      const q = Number(qty||0);
      if (q <= 0) return;

      // Check if it's a part (key starts with 'part:')
      if (String(key).startsWith('part:')) {
        const partId = Number(key.replace('part:', ''));
        const meta = partById[partId] || { name: `Part #${partId}`, unit: 0 };
        items.push({
          item_id: partId,
          item_type: 'part',
          name: meta.name,
          unitPrice: meta.unit,
          qty: q,
          lineTotal: meta.unit * q
        });
      } else {
        // It's a service
        const sid = Number(key);
        const meta = svcById[sid] || { name: `Service #${sid}`, unit: 0 };
        items.push({
          service_id: sid,
          item_id: sid,
          item_type: 'service',
          name: meta.name,
          unitPrice: meta.unit,
          qty: q,
          lineTotal: meta.unit * q
        });
      }
    });

    return items;
  }, []);

  const flatItems = useMemo(() => {
    return cards.flatMap(card => makeItems(card.services, card.parts, card.cart).map(it => ({
      ...it, __pid: card.pid
    })));
  }, [cards, makeItems]);

  /* ---------- SELECTION MANAGEMENT ---------- */
  const allKeys = useMemo(() => flatItems.map(it => `${it.__pid}:${it.item_type}:${it.item_id}`), [flatItems]);

  useEffect(() => {
    const allSel = {};
    allKeys.forEach(k => { allSel[k] = true; });
    setSelectedMap(allSel);
  }, [allKeys.length]);

  const toggleOne = useCallback((pid, itemType, itemId) => {
    const key = `${pid}:${itemType}:${itemId}`;
    setSelectedMap(prev => {
      const next = { ...(prev||{}) };
      if (next[key]) delete next[key]; else next[key] = true;
      return next;
    });
  }, []);

  const allSelected = useMemo(
    () => allKeys.length > 0 && allKeys.every(k => !!selectedMap[k]),
    [allKeys, selectedMap]
  );

  const toggleGlobalSelected = useCallback(() => {
    if (allSelected) setSelectedMap({});
    else {
      const next = {};
      allKeys.forEach(k => { next[k] = true; });
      setSelectedMap(next);
    }
  }, [allSelected, allKeys]);

  const selectedItems = useMemo(
    () => flatItems.filter(it => !!selectedMap[`${it.__pid}:${it.item_type}:${it.item_id}`]),
    [flatItems, selectedMap]
  );

  /* ---------- TOTALS ---------- */
  const totals = useMemo(() => {
    const itemPaise = selectedItems.reduce((sum, it) => sum + toPaise(it.lineTotal), 0);
    const gstPaise  = Math.round(itemPaise * GST_RATE);
    const tipPaise  = toPaise(tip);
    const payPaise  = itemPaise + gstPaise + tipPaise;

    return {
      item: fromPaise(itemPaise),
      gst: fromPaise(gstPaise),
      tip: fromPaise(tipPaise),
      payable: fromPaise(payPaise),
    };
  }, [selectedItems, tip]);

  const itemTotalSelected = totals.item;
  const gstAmount         = totals.gst;
  const payable           = totals.payable;

  /* ---------- TIP HANDLER ---------- */
  const toggleTip = useCallback((amount) => {
    setTip(prev => prev === amount ? 0 : amount);
  }, []);

  /* ---------- ADDRESS MANAGEMENT ---------- */
  useEffect(() => {
    (async () => {
      try {
        const list = JSON.parse((await AsyncStorage.getItem(K.addrList))||'[]');
        setSavedAddresses(Array.isArray(list)?list:[]);
        const raw = await AsyncStorage.getItem(K.addr);
        if (raw) {
          const a = JSON.parse(raw);
          if (a?.label || a?.line1) {
            setAddress(a);
            setAddrLabel(a.label||'Home');
            setAddrLine1(a.line1||'');
          }
        }
      } catch {}
    })();
  }, [K.addr, K.addrList]);

  const saveAddress = useCallback(async () => {
    const a = { label: (addrLabel||'Home').trim(), line1: (addrLine1||'').trim() };
    setAddress(a);
    await AsyncStorage.setItem(K.addr, JSON.stringify(a)).catch(()=>{});
    const tag = (o)=>`${o.label}|${o.line1}`.toLowerCase();
    const list = [...savedAddresses];
    if (!list.some(x=>tag(x)===tag(a))) {
      const next = [a, ...list].slice(0,10);
      setSavedAddresses(next);
      await AsyncStorage.setItem(K.addrList, JSON.stringify(next)).catch(()=>{});
    }
    setAddrModal(false);
  }, [addrLabel, addrLine1, savedAddresses, K.addr, K.addrList]);

  const selectSavedAddress = useCallback(async (a) => {
    setAddress(a);
    setAddrLabel(a.label||'Home');
    setAddrLine1(a.line1||'');
    await AsyncStorage.setItem(K.addr, JSON.stringify(a)).catch(()=>{});
    setAddrModal(false);
  }, [K.addr]);

  /* ---------- DATE MANAGEMENT ---------- */
  const today = useMemo(() => startOfDay(new Date()), []);
  const next30 = useMemo(() => Array.from({ length: 30 }).map((_, i) => startOfDay(addDays(today, i))), [today]);

  const paddedDates = useMemo(() => {
    const headPad = next30[0].getDay();
    const withHead = [...Array(headPad).fill(null), ...next30];
    const rem = withHead.length % 7;
    const tailPad = rem === 0 ? 0 : (7 - rem);
    return [...withHead, ...Array(tailPad).fill(null)];
  }, [next30]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(K.date);
        if (raw) {
          const d = new Date(raw);
          if (!isNaN(d)) setSelectedDate(startOfDay(d));
        }
      } catch {}
    })();
  }, [K.date]);

  /* ---------- RESTAURANT MANAGEMENT ---------- */
  const fetchRestaurants = useCallback(async () => {
    setLoadingR(true);
    setRestError('');
    setRestaurants([]);
    try {
      let chosen = '';
      try {
        const idParam = route?.params?.ownerId ? String(route.params.ownerId).trim() : '';
        const a = await AsyncStorage.getItem('owner_id');
        const b = await AsyncStorage.getItem('restaurant_owner_id');
        const c = await AsyncStorage.getItem('ownerId');
        chosen = String(idParam || a || b || c || '').trim();
      } catch {}
      if (!chosen) { setRestError('Owner not found. Please log in again.'); return; }

      const res = await api.get('/app/restaurantlist', { params: { restaurant_owner_id: chosen } });
      const rows = Array.isArray(res?.data?.data) ? res.data.data : [];
      const onlyMine = rows.filter(r => {
        let ownerId = '';
        if (r.restaurant_owner_id != null) ownerId = r.restaurant_owner_id;
        else if (r.owner && r.owner.id != null) ownerId = r.owner.id;
        return String(ownerId) === String(chosen);
      });

      const normalized = (onlyMine||[]).map((r, i) => ({
        id: String(r.id ?? i),
        name: r.hotel_name || 'Restaurant',
        addr: r.address || '',
        fssai: r.fssai_number || '',
        approved: String(r.status || '').toLowerCase() === 'approved',
        image: r.main_image || '',
        ownerId: r.restaurant_owner_id ?? r?.owner?.id ?? null,
        ownerName: r.owner ? `${r.owner.first_name} ${r.owner.last_name}` : '',
        ownerPhone: r.owner?.phone || '',
      }));

      setRestaurants(normalized);
      if (!normalized.length) setRestError('No restaurants found for your account.');
    } catch (e) {
      const msg = e?.response?.data?.message || e?.message || 'Failed to load restaurants';
      setRestError(msg);
    } finally {
      setLoadingR(false);
    }
  }, [route?.params?.ownerId]);

  const confirmDate = useCallback(async () => {
    if (!selectedDate) return;
    await AsyncStorage.setItem(K.date, selectedDate.toISOString()).catch(()=>{});
    setDateModal(false);
    await fetchRestaurants();
    setRestModal(true);
  }, [selectedDate, K.date, fetchRestaurants]);

  /* ---------- PAYMENT HANDLING ---------- */
  const [upiCopiedModal, setUpiCopiedModal] = useState(false);
  const copyUpiId = useCallback(() => {
    Clipboard.setString(UPI_ID);
    setUpiCopiedModal(true);
  }, [UPI_ID]);

  const pickScreenshot = useCallback(() => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: 1024,
      maxHeight: 1024,
    };

    launchImageLibrary(options, (response) => {
      if (response.didCancel) {
        console.log('User cancelled image picker');
      } else if (response.error) {
        console.log('ImagePicker Error: ', response.error);
        alert('Error selecting image');
      } else if (response.assets && response.assets[0]) {
        setPaymentScreenshot(response.assets[0]);
      }
    });
  }, []);

  const hasScreenshot = !!paymentScreenshot;

  /* ---------- FIXED: Equipment Request Payload (supports multiple products like web) ---------- */
  const buildEquipmentRequestPayload = (pickedRestaurant) => {
    // Collect all unique product names from selected items
    const productNames = [];
    const productIds = [];

    selectedItems.forEach(item => {
      const card = cards.find(c => c.pid === item.__pid);
      const productName = card?.meta?.productTitle || card?.meta?.title || `Product ${item.__pid}`;
      const productId = Number(item.__pid || card?.pid || card?.meta?.productId);

      if (productName && !productNames.includes(productName)) {
        productNames.push(productName);
      }
      if (productId && !isNaN(productId) && productId > 0 && !productIds.includes(productId)) {
        productIds.push(productId);
      }
    });

    // Combine all product names (like web app does)
    const combinedProductName = productNames.length > 0 ? productNames.join(', ') : 'Equipment Service';

    // Use first valid product ID
    let productIdValue = productIds[0] || Number(productId) || 1;

    // Format service date properly
    let serviceDate = null;
    if (selectedDate) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      serviceDate = `${year}-${month}-${day}`;
    }

    // Create tags from ALL selected items (all products combined)
    // Add [Part] prefix for parts to match web format
    const tags = selectedItems.map(it => {
      const prefix = it.item_type === 'part' ? '[Part] ' : '';
      return `${prefix}${it.name} x${it.qty}`;
    });

    // Get image from first product
    const firstCard = cards.find(c => c.pid === selectedItems[0]?.__pid) || cards[0];
    const firstMeta = firstCard?.meta || {};

    // Build the payload with all products combined
    const payload = {
      product_id: productIdValue,
      product_name: combinedProductName,  // All product names combined
      description: `Requested for ${selectedDate ? selectedDate.toDateString() : 'Not specified'}`,
      image: firstMeta.heroImage || firstMeta.image || '',
      tags: tags.length > 0 ? tags : ['General Service'],
      restaurant_id: Number(pickedRestaurant?.id || 0),
      restaurant_name: pickedRestaurant?.name || 'Unknown Restaurant',
      restaurant_owner_name: pickedRestaurant?.ownerName || '',
      location: address.line1 || 'Location not specified',
      service_date: serviceDate,
      status: 'Pending',
      assigned_to: '',
      assigned_to_id: null,
    };

    console.log('[RequestNow] Equipment Request Payload (multi-product):', JSON.stringify(payload, null, 2));
    console.log('[RequestNow] Products included:', productNames);
    return payload;
  };

  /* ---------- FIXED: Payment Confirmation ---------- */
  const handleConfirmPayment = async () => {
    if (!hasScreenshot) {
      alert("Please upload your payment screenshot before confirming.");
      return;
    }

    console.log('Processing payment confirmation...');
    
    // Extract numeric owner ID from ownerKey
    const extractOwnerId = (ownerKey) => {
      if (ownerKey.includes(':')) {
        return ownerKey.split(':')[1];
      }
      return ownerKey;
    };

    const numericOwnerId = extractOwnerId(ownerKey);
    const transactionId = 'UPI_' + new Date().getTime();

    // Convert image to base64 for upload
    let screenshotBase64 = null;
    if (paymentScreenshot && paymentScreenshot.uri) {
      try {
        // Convert file URI to base64 using react-native-fs
        const fileUri = paymentScreenshot.uri;
        // Remove file:// prefix if present for RNFS
        const filePath = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
        const base64Data = await RNFS.readFile(filePath, 'base64');
        // Add data URI prefix for the backend
        screenshotBase64 = `data:image/jpeg;base64,${base64Data}`;
        console.log('Screenshot converted to base64, length:', screenshotBase64.length);
      } catch (error) {
        console.error('Error converting screenshot to base64:', error);
        Alert.alert('Error', 'Failed to process payment screenshot. Please try again.');
        setSavingReq(false);
        return;
      }
    }

    try {
      setSavingReq(true);
      
      // STEP 1: First create the equipment request
      console.log('Creating equipment request...');
      const pickedRestaurant = restaurants.find(r => r.id === restSel);
      if (!pickedRestaurant) {
        throw new Error('Restaurant not found');
      }

      const equipmentRequestPayload = buildEquipmentRequestPayload(pickedRestaurant);
      
      console.log('Sending equipment request with payload:', equipmentRequestPayload);
      
      // Create equipment request first
      const equipmentResponse = await api.post('/app/equipment-requests', equipmentRequestPayload);
      console.log('Equipment request created:', equipmentResponse.data);

      // STEP 2: Then process the payment
      console.log('Processing payment...');
      const paymentData = {
        owner_id: numericOwnerId,
        amount: parseFloat(payable),
        payment_method: 'UPI',
        payment_status: 'completed',
        transaction_id: transactionId,
        payment_note: paymentNote || 'Service payment via UPI',
        payment_screenshot: screenshotBase64,
        equipment_request_id: equipmentResponse.data.data?.id || null,
      };

      console.log('Sending payment data:', { ...paymentData, payment_screenshot: 'BASE64_IMAGE' });

      const paymentResponse = await api.post('/app/owner-payment', paymentData, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      console.log('Payment API Response:', paymentResponse.data);

      if (paymentResponse.data.message === 'Payment details saved successfully.') {
        console.log('Payment saved successfully with screenshot');
        
        // Clear the cart after successful payment
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const myPrefix = `rdraft:${ownerKey}:`;
          const rdraftKeys = allKeys.filter(k => k.startsWith(myPrefix));
          await AsyncStorage.multiRemove(rdraftKeys);
          console.log('Cart cleared after payment');
        } catch (clearError) {
          console.log('Error clearing cart:', clearError);
        }

        // Clear local state as well
        setCards([]);
        setSelectedMap({});
        setTip(0);
        setPaymentNote('');
        setPaymentScreenshot(null);

        setPaymentModal(false);
        
        // Small delay to ensure smooth transition
        setTimeout(() => {
          setSuccessModal(true);
        }, 300);
        
      } else {
        throw new Error('Unexpected response from server');
      }
      
    } catch (error) {
      console.error('Error in payment confirmation:', error);
      
      let errorMessage = 'Payment failed. Please try again.';
      let errorDetails = '';
      
      if (error.response) {
        console.log('Error response data:', error.response.data);
        console.log('Error response status:', error.response.status);
        
        errorDetails = error.response.data?.message || JSON.stringify(error.response.data);
        
        if (error.response.status === 422) {
          // More specific error handling for product_id validation
          if (error.response.data?.errors?.product_id) {
            errorMessage = `Product ID Error: ${error.response.data.errors.product_id[0]}. Please contact support.`;
          } else {
            errorMessage = `Validation Error: ${errorDetails}`;
          }
        } else if (error.response.status === 404) {
          errorMessage = 'Payment endpoint not found. Please check the server.';
        } else if (error.response.status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else if (error.response.data?.error) {
          errorMessage = error.response.data.error;
        }
      } else if (error.request) {
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        errorMessage = error.message || 'An unexpected error occurred.';
      }
      
      console.log('Full error details:', { 
        message: errorMessage, 
        details: errorDetails,
        stack: error.stack 
      });
      
      Alert.alert('Payment Failed', errorMessage);
    } finally {
      setSavingReq(false);
    }
  };

  const canConfirm = useMemo(() => {
    if (!restSel) return false;
    const picked = restaurants.find(r => r.id === restSel);
    return !!(picked && picked.approved);
  }, [restSel, restaurants]);

  const confirmRestaurant = useCallback(async () => {
    if (!restSel) return;
    const picked = restaurants.find(r => r.id === restSel);
    if (!picked?.approved) return;

    try {
      setSavingReq(true);
      await AsyncStorage.setItem(K.restaurant, JSON.stringify(picked || {})).catch(()=>{});
      
      setRestModal(false);
      setPaymentModal(true);
    } catch (e) {
      console.log('Restaurant selection failed:', e?.response?.data || e?.message);
      alert('Failed to select restaurant. Please try again.');
    } finally {
      setSavingReq(false);
    }
  }, [restSel, restaurants, K.restaurant]);

  /* ---------- CARD CONTROLS ---------- */
  const incQty = useCallback((pid, sid) => {
    updateCartFor(pid, prev => ({ ...(prev || {}), [sid]: (prev?.[sid] || 0) + 1 }));
  }, [updateCartFor]);

  const decQty = useCallback((pid, sid) => {
    updateCartFor(pid, prev => {
      const q = (prev?.[sid] || 0) - 1;
      const n = { ...(prev || {}) };
      if (q <= 0) delete n[sid]; else n[sid] = q;
      return n;
    });
  }, [updateCartFor]);

  const removeLine = useCallback((pid, sid) => {
    updateCartFor(pid, prev => {
      const n = { ...(prev || {}) };
      delete n[sid];
      return n;
    });
  }, [updateCartFor]);

  const scrollRef = useRef(null);

  /* ---------- COMPONENTS ---------- */
  const ProductCard = ({ card }) => {
    const { pid, meta, services, parts, cart } = card;
    const items = useMemo(()=>makeItems(services, parts, cart),[services, parts, cart]);

    const isAllSelectedInCard = items.every(it => !!selectedMap[`${pid}:${it.item_type}:${it.item_id}`]);

    // Get cart key for quantity operations
    const getCartKey = (item) => item.item_type === 'part' ? `part:${item.item_id}` : item.item_id;

    const ItemRow = ({ item }) => {
      const key = `${pid}:${item.item_type}:${item.item_id}`;
      const isSel = !!selectedMap[key];
      const q = item.qty || 0;
      const isPart = item.item_type === 'part';
      const accentColor = isPart ? '#EA580C' : C.primary;
      return (
        <View style={[st.serviceRow, isSel ? (isPart ? { backgroundColor: '#FFF7ED' } : st.serviceRowActive) : null]}>
          <TouchableOpacity onPress={() => toggleOne(pid, item.item_type, item.item_id)} style={[st.check, isSel && (isPart ? { backgroundColor: '#EA580C' } : st.checkActive)]}>
            {isSel ? <Icon name="checkmark" size={12} color="#fff" /> : null}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
            {isPart && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: '#EA580C', marginRight: 6 }} />}
            <Text style={[st.serviceTxt, !isSel && { color: C.muted }]} numberOfLines={1}>{item.name}</Text>
          </View>

          {q > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => decQty(pid, getCartKey(item))} style={[st.counterBtnSm, { marginRight: 4 }]}>
                <Icon name="remove" size={18} color={accentColor} />
              </TouchableOpacity>
              <Text style={[st.qtyBadge, !isSel && { color: '#94A3B8' }]}>{`×${q}`}</Text>
              <TouchableOpacity onPress={() => incQty(pid, getCartKey(item))} style={[st.counterBtnSm, { marginLeft: 4 }]}>
                <Icon name="add" size={18} color={accentColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeLine(pid, getCartKey(item))} style={[st.counterBtnSm, { marginLeft: 6 }]}>
                <Icon name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[st.serviceAmt, !isSel && { color: C.muted }, isPart && isSel && { color: '#EA580C' }]}>{Rs(item.lineTotal)}</Text>
        </View>
      );
    };
    const keyRow = (it, idx) => `${pid}-${it.item_type}-${it.item_id}-${idx}`;

    const itemTotalCard = useMemo(()=>items.reduce((s,it)=>s+it.lineTotal,0),[items]);

    return (
      <View style={[st.cardProd, { width: SCREEN_W - 32, marginRight: 12 }]}>
        <ImageBackground source={{ uri: meta.heroImage }} style={st.hero} imageStyle={{ borderTopLeftRadius: 16, borderTopRightRadius: 16 }}>
          <View style={st.badgeRow}>
            <View style={[st.badge, { backgroundColor: '#FFEAEA' }]}>
              <Icon name="snow-outline" size={14} color={C.danger} />
              <Text style={st.badgeTxt}>{meta.category}</Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                if (isAllSelectedInCard) {
                  setSelectedMap(prev => {
                    const n = { ...(prev||{}) };
                    items.forEach(it => { delete n[`${pid}:${it.item_type}:${it.item_id}`]; });
                    return n;
                  });
                } else {
                  setSelectedMap(prev => {
                    const n = { ...(prev||{}) };
                    items.forEach(it => { n[`${pid}:${it.item_type}:${it.item_id}`] = true; });
                    return n;
                  });
                }
              }}
              style={[st.badge, isAllSelectedInCard ? st.badgeSelectedOn : st.badgeSelectedOff]}
            >
              <Icon name={isAllSelectedInCard ? 'checkmark-circle' : 'ellipse-outline'} size={14} color={isAllSelectedInCard ? '#fff' : C.ink} />
              <Text style={[st.badgeTxt, isAllSelectedInCard ? { color: '#fff' } : { color: C.ink }]}>{'Selected'}</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={{ padding: 12 }}>
          <Text style={st.prodTitle}>{meta.productTitle}</Text>
          {!!meta.subtitle && <Text style={st.prodSub}>{meta.subtitle}</Text>}

          <View style={{ marginTop: 8 }}>
            {loadingInit && items.length === 0 ? (
              <View style={{ paddingVertical: 12, alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : items.length === 0 ? (
              <View style={{ paddingVertical: 4 }}>
                <Text style={st.subtle}>No items selected.</Text>
              </View>
            ) : (
              <FlatList data={items} keyExtractor={keyRow} renderItem={ItemRow} scrollEnabled={false} />
            )}
          </View>

          <View style={st.totalLine}>
            <Text style={st.equipLbl}>Equipment total</Text>
            <Text style={st.equipVal}>{Rs(itemTotalCard)}</Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top','left','right']}>
      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.hBtn}>
          <Icon name="chevron-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.hTitle}>Your cart</Text>
        <View style={st.hBtn} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}>
        {/* HORIZONTAL CARDS */}
        <View style={{ paddingHorizontal: 16, marginTop: 8 }}>
          {loadingInit ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : cards.length === 0 ? (
            <View style={{ paddingVertical: 12, alignItems: 'center' }}>
              <Text style={st.subtle}>No services selected.</Text>
            </View>
          ) : (
            <ScrollView
              horizontal
              ref={scrollRef}
              showsHorizontalScrollIndicator={false}
              pagingEnabled
              decelerationRate="fast"
              snapToAlignment="start"
              snapToInterval={SCREEN_W - 32 + 12}
              contentContainerStyle={{ paddingRight: 16 }}
            >
              {cards.map((card) => (
                <ProductCard key={`pc-${card.pid}`} card={card} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Payment summary */}
        <View style={[st.card, { marginHorizontal: 16 }]}>
          <Text style={st.cardTitle}>Payment summary</Text>

          <View style={st.row}>
            <Text style={st.rowLbl}>Item total</Text>
            <Text style={st.rowVal}>{itemTotalSelected.toFixed(2)}</Text>
          </View>

          <View style={st.row}>
            <Text style={st.rowLbl}>Tax (GST 18%)</Text>
            <Text style={st.rowVal}>{gstAmount.toFixed(2)}</Text>
          </View>

          <View style={st.row}>
            <Text style={st.rowLbl}>Tip</Text>
            <Text style={st.rowVal}>{tip.toFixed(2)}</Text>
          </View>

          <View style={st.hr} />

          <View style={st.row}>
            <Text style={st.payableLbl}>Amount to pay</Text>
            <Text style={st.payableVal}>{payable.toFixed(2)}</Text>
          </View>
        </View>

        {/* Tip selector */}
        <View style={[st.card, { marginHorizontal: 16 }]}>
          <Text style={st.cardTitle}>Add a tip to thank the Professional</Text>
          <View style={st.tipRow}>
            {[50,75,100].map(v=>{
              const active = tip===v; const isPopular = v===75;
              return (
                <TouchableOpacity
                  key={`tip-${v}`}
                  onPress={()=>toggleTip(v)}
                  style={[
                    st.tipBtnBase,
                    isPopular ? st.tipPopularFlat : st.tipBtn,
                    active && (isPopular ? st.tipPopularActive : st.tipBtnActive)
                  ]}
                >
                  <Text style={[
                    st.tipTxt, isPopular && st.tipPopularTxt, active && st.tipTxtActive
                  ]}>
                    {Rs(v)}{isPopular ? '   POPULAR' : ''}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <Text style={st.tipNote}>100% of the tip goes to the professional.</Text>
        </View>

        {/* Address row */}
        <View style={[st.addrCard, { marginHorizontal: 16 }]}>
          <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
            <Icon name="home-outline" size={18} color={C.ink} />
            <Text style={st.addrTxt}>
              <Text style={{ fontWeight:'800' }}>{` ${address.label} — `}</Text>
              {address.line1 || 'Add address'}
              {selectedDate && `  •  ${selectedDate.toDateString()}`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setAddrLabel(address.label); setAddrLine1(address.line1); setAddrModal(true); }} style={st.addrEdit}>
            <Icon name="create-outline" size={16} color={C.ink} />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bottom bar */}
      <View style={[st.bottomBar, { paddingBottom: insets.bottom > 0 ? insets.bottom : 12 }]}>
        <Text style={st.bottomLeft}>{`${selectedItems.length} selected • ${Rs(payable)}`}</Text>
        <TouchableOpacity
          disabled={!selectedItems.length}
          onPress={()=>setDateModal(true)}
          style={[st.selectBtn, !selectedItems.length && {opacity:0.6}]}
        >
          <Icon name="calendar-outline" size={18} color="#fff" />
          <Text style={st.selectTxt}>Select slot</Text>
        </TouchableOpacity>
      </View>

      {/* Address modal */}
      <Modal visible={addrModal} transparent animationType="slide" onRequestClose={()=>setAddrModal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.sheet}>
            <Text style={st.sheetTitle}>Change address</Text>

            {!!savedAddresses.length && (
              <>
                <Text style={[st.inputLbl,{marginTop:0}]}>Saved addresses</Text>
                <View style={{marginBottom:8}}>
                  {savedAddresses.map((a, idx)=>(
                    <TouchableOpacity key={`saved-${idx}`} onPress={()=>selectSavedAddress(a)} style={st.savedAddrRow}>
                      <Icon name="location-outline" size={16} color={C.ink}/>
                      <Text style={st.savedAddrTxt}><Text style={{fontWeight:'800'}}>{a.label}</Text>{` — ${a.line1}`}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <Text style={st.inputLbl}>Label</Text>
            <TextInput value={addrLabel} onChangeText={setAddrLabel} placeholder="Home / Work / Other" style={st.input} placeholderTextColor="#9CA3AF"/>

            <Text style={st.inputLbl}>Address</Text>
            <TextInput
              value={addrLine1}
              onChangeText={setAddrLine1}
              placeholder="Flat / Building / Street / Landmark"
              style={[st.input,{height:80,textAlignVertical:'top',paddingTop:12}]}
              multiline placeholderTextColor="#9CA3AF"
            />

            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: 10 }}>
              <TouchableOpacity onPress={()=>setAddrModal(false)} style={[st.btn,{backgroundColor:'#F1F5F9'}]}>
                <Text style={[st.btnTxt,{color:C.ink}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAddress} style={[st.btn,{backgroundColor:C.primary,marginLeft:8}]}>
                <Text style={[st.btnTxt,{color:'#fff'}]}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Date sheet */}
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={()=>setDateModal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.sheetLarge}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={st.sheetTitle}>Select a date</Text>
              <TouchableOpacity onPress={()=>setDateModal(false)} style={st.closePill}><Icon name="close" size={18} color={C.ink} /></TouchableOpacity>
            </View>
            <Text style={st.subtle}>Next 30 days</Text>

            <View style={st.daysRow}>
              {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d,i)=><Text key={`dow-${i}`} style={st.dayLbl}>{d[0]}</Text>)}
            </View>

            <View style={st.grid}>
              {paddedDates.map((d,i)=>{
                if(!d) return <View key={`empty-${i}`} style={[st.cell,{backgroundColor:'transparent',borderWidth:0}]}/>;
                const isSel = selectedDate && startOfDay(selectedDate).getTime()===d.getTime();
                return (
                  <TouchableOpacity key={d.toISOString()} onPress={()=>setSelectedDate(d)} style={[st.cell, isSel && st.cellActive]}>
                    <Text style={[st.cellTxt, isSel && st.cellTxtActive]}>{d.getDate()}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity disabled={!selectedDate} onPress={confirmDate} style={[st.continueBtn,!selectedDate&&{backgroundColor:'#FBC6C3'}]}>
              <Text style={st.continueTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Restaurant picker */}
      <Modal visible={restModal} transparent animationType="slide" onRequestClose={()=>setRestModal(false)}>
        <View style={st.modalBackdrop}>
          <View style={st.sheetLarge}>
            <View style={{ flexDirection:'row', justifyContent:'space-between', alignItems:'center' }}>
              <Text style={st.sheetTitle}>Select your restaurant</Text>
              <View style={{ flexDirection:'row', alignItems:'center', gap:8 }}>
                <TouchableOpacity onPress={fetchRestaurants} style={st.refreshPill}>
                  <Icon name="refresh" size={16} color={C.ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setRestModal(false)} style={st.closePill}>
                  <Icon name="close" size={18} color={C.ink} />
                </TouchableOpacity>
              </View>
            </View>

            {loadingR ? (
              <View style={{ paddingVertical: 20, alignItems:'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : restaurants.length === 0 ? (
              <View style={{ paddingVertical: 20, alignItems:'center', paddingHorizontal: 12 }}>
                <Text style={[st.subtle, { textAlign: 'center' }]}>
                  {restError || 'No restaurants found for your account.'}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: 8, maxHeight: 420 }}>
                {restaurants.map((r, idx)=>{
                  const active = restSel===r.id;
                  const disabled = !r.approved;
                  return (
                    <TouchableOpacity
                      key={`${r.id}-${idx}`}
                      onPress={() => { if (!disabled) setRestSel(r.id); }}
                      activeOpacity={disabled ? 1 : 0.7}
                      accessibilityState={{ disabled }}
                      style={[
                        st.restCard,
                        active && !disabled && { borderColor: C.primary },
                        disabled && { opacity: 0.5 }
                      ]}
                    >
                      <Text style={st.restName}>{r.name}</Text>
                      <Text style={st.restAddr}>{r.addr}</Text>
                      {!!r.fssai && <Text style={st.restFssai}>FSSAI: {r.fssai}</Text>}
                      <View style={[st.badgeSmall,{backgroundColor:r.approved?'#E7F9EF':'#FFEDEE'}]}>
                        <Icon name={r.approved?'shield-checkmark':'information'} size={14} color={r.approved?C.ok:C.danger}/>
                        <Text style={[st.badgeSmallTxt,{color:r.approved?C.ok:C.danger}]}>{r.approved?'Approved':'Not approved'}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <TouchableOpacity
              disabled={!canConfirm || savingReq}
              onPress={confirmRestaurant}
              style={[st.continueBtn, (!canConfirm || savingReq) && { backgroundColor:'#FBC6C3', opacity: 0.6 }]}
            >
              {savingReq ? <ActivityIndicator color="#fff" /> : <Text style={st.continueTxt}>Confirm</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={paymentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setPaymentModal(false)}
      >
        <View style={st.modalBackdrop}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1, justifyContent: 'flex-end' }}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
              <View style={st.sheetLarge}>
                <ScrollView
                  keyboardShouldPersistTaps="handled"
                  showsVerticalScrollIndicator={false}
                  contentContainerStyle={{
                    flexGrow: 1,
                    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
                  }}
                >
                  <Text style={st.sheetTitle}>Complete Payment</Text>

                  {/* QR section */}
                  <View style={{ alignItems: 'center', marginVertical: 16 }}>
                    <Image
                      source={require('../assets/images/kni.jpg')}
                      style={{
                        width: Dimensions.get('window').width * 0.5,
                        height: Dimensions.get('window').width * 0.5,
                        borderRadius: 10,
                      }}
                      resizeMode="contain"
                    />
                    <Text style={{ marginTop: 6, color: C.ink, fontWeight: '800' }}>
                      Amount: ₹ {payable.toFixed(2)}
                    </Text>
                    <Text style={{ marginTop: 12, color: C.muted, textAlign: 'center' }}>
                      Scan the QR code using your preferred UPI app
                    </Text>
                  </View>

                  {/* Copyable UPI ID */}
                  <View style={{ marginVertical: 16 }}>
                    <Text style={[st.inputLbl, { marginBottom: 8 }]}>
                      Or send payment to UPI ID:
                    </Text>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        backgroundColor: '#F8FAFC',
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 10,
                        padding: 12,
                        marginBottom: 8,
                      }}
                    >
                      <Text style={{ flex: 1, color: C.ink, fontWeight: '600', fontSize: 16 }}>
                        {UPI_ID}
                      </Text>
                      <TouchableOpacity
                        onPress={copyUpiId}
                        style={{
                          paddingHorizontal: 12,
                          paddingVertical: 6,
                          backgroundColor: C.primary,
                          borderRadius: 6,
                        }}
                      >
                        <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>
                          Copy
                        </Text>
                      </TouchableOpacity>
                    </View>
                    <Text style={{ fontSize: 12, color: C.muted, textAlign: 'center' }}>
                      Tap "Copy" and paste in your UPI app to pay ₹{payable.toFixed(2)}
                    </Text>
                  </View>

                  {/* Screenshot warning */}
                  <View
                    style={{
                      backgroundColor: '#FFF7ED',
                      borderWidth: 1,
                      borderColor: '#FDBA74',
                      borderRadius: 10,
                      padding: 12,
                      marginVertical: 8,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Icon name="warning-outline" size={16} color="#EA580C" />
                      <Text
                        style={{
                          marginLeft: 6,
                          color: '#EA580C',
                          fontWeight: '700',
                          fontSize: 14,
                        }}
                      >
                        Payment Screenshot Required
                      </Text>
                    </View>
                    <Text style={{ fontSize: 12, color: '#EA580C', lineHeight: 16 }}>
                      You must upload a screenshot of your payment confirmation for the request
                      to be processed.
                    </Text>
                  </View>

                  {/* Screenshot upload */}
                  <Text style={[st.inputLbl, { marginTop: 16 }]}>
                    Upload Payment Screenshot (Required)
                  </Text>
                  {paymentScreenshot ? (
                    <View
                      style={{
                        height: 120,
                        borderRadius: 10,
                        overflow: 'hidden',
                        marginVertical: 8,
                        position: 'relative',
                      }}
                    >
                      <Image
                        source={{ uri: paymentScreenshot.uri }}
                        style={{ width: '100%', height: '100%' }}
                        resizeMode="cover"
                      />
                      <TouchableOpacity
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: 15,
                          width: 30,
                          height: 30,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => setPaymentScreenshot(null)}
                      >
                        <Icon name="close" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        height: 120,
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                        borderStyle: 'dashed',
                        borderRadius: 10,
                        backgroundColor: '#F9FAFB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginVertical: 8,
                      }}
                      onPress={pickScreenshot}
                    >
                      <Icon name="cloud-upload-outline" size={32} color={C.muted} />
                      <Text style={{ marginTop: 8, color: C.muted, fontWeight: '600' }}>
                        Tap to Upload Screenshot
                      </Text>
                      <Text style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
                        PNG, JPG up to 5MB
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Notes */}
                  <Text style={[st.inputLbl, { marginTop: 16 }]}>
                    Additional Notes (Optional)
                  </Text>
                  <TextInput
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    placeholder="Any additional information about your payment..."
                    style={[
                      st.input,
                      {
                        height: 80,
                        textAlignVertical: 'top',
                        paddingTop: 12,
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: 10,
                        backgroundColor: '#F9FAFB',
                        fontSize: 15,
                      },
                    ]
                    }
                    multiline
                    placeholderTextColor="#9CA3AF"
                  />
                </ScrollView>

                {/* Fixed bottom buttons */}
                <View
                  style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    marginTop: 8,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPaymentModal(false)}
                    style={{
                      backgroundColor: '#F1F5F9',
                      flex: 1,
                      marginRight: 8,
                      borderRadius: 10,
                      paddingVertical: 14,
                    }}
                  >
                    <Text
                      style={{
                        color: C.ink,
                        textAlign: 'center',
                        fontSize: 16,
                        fontWeight: '600',
                      }}
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleConfirmPayment}
                    disabled={!hasScreenshot || savingReq}
                    style={[
                      {
                        backgroundColor: C.primary,
                        flex: 1,
                        marginLeft: 8,
                        borderRadius: 10,
                        paddingVertical: 14,
                      },
                      (!hasScreenshot || savingReq) && { opacity: 0.6 }
                    ]}
                  >
                    {savingReq ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text
                        style={{
                          color: '#fff',
                          textAlign: 'center',
                          fontSize: 16,
                          fontWeight: '600',
                        }}
                      >
                        Confirm Payment
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* UPI Copied Success Modal */}
      <Modal visible={upiCopiedModal} transparent animationType="fade" onRequestClose={()=>setUpiCopiedModal(false)}>
        <View style={st.modalBackdropCenter}>
          <View style={st.upiCopiedCard}>
            <View style={st.upiCopiedHeader}>
              <View style={st.upiCopiedIconWrap}>
                <Icon name="copy" size={28} color="#fff"/>
              </View>
              <Text style={st.upiCopiedTitle}>UPI ID Copied</Text>
            </View>
            
            <View style={st.upiIdBox}>
              <Text style={st.upiIdText}>{UPI_ID}</Text>
            </View>
            
            <Text style={st.upiCopiedSubtitle}>
              ✅ Successfully copied to clipboard
            </Text>
            
            <Text style={st.upiCopiedInstruction}>
              Paste this UPI ID in your payment app and pay:
            </Text>
            
            <View style={st.amountBox}>
              <Text style={st.amountText}>₹ {payable.toFixed(2)}</Text>
            </View>
            
            <TouchableOpacity 
              onPress={()=>setUpiCopiedModal(false)} 
              style={st.upiCopiedBtn}
            >
              <Text style={st.upiCopiedBtnText}>Continue to Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Success popup */}
      <Modal visible={successModal} transparent animationType="fade" onRequestClose={()=>setSuccessModal(false)}>
        <View style={st.modalBackdropCenter}>
          <View style={st.successCard}>
            <View style={st.successIconWrap}><Icon name="checkmark" size={36} color="#fff"/></View>
            <Text style={st.successTitle}>Congratulations 🎉</Text>
            <Text style={st.successMsg}>
              We'll notify you when a service engineer is available on your selected date and will arrive at your restaurant.
            </Text>
            <TouchableOpacity onPress={()=>{
              setSuccessModal(false);
              navigation.goBack();
            }} style={st.successBtn}>
              <Text style={st.successBtnTxt}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:8, paddingTop:6, paddingBottom:8, backgroundColor:C.bg },
  hBtn:{ width:40, height:40, alignItems:'center', justifyContent:'center' },
  hTitle:{ color:C.ink, fontWeight:'800', fontSize:22 },

  card:{ backgroundColor:C.card, borderRadius:16, borderWidth:1, borderColor:'#EEF2F7', padding:12, marginBottom:12 },
  cardTitle:{ color:C.ink, fontWeight:'900', fontSize:18, marginBottom:6 },

  cardProd:{ borderRadius:16, overflow:'hidden', backgroundColor:C.card, borderWidth:1, borderColor:'#EEF2F7', marginBottom:14 },
  hero:{ height:120, width:'100%' },
  badgeRow:{ position:'absolute', left:12, right:12, top:10, flexDirection:'row', justifyContent:'space-between' },
  badge:{ flexDirection:'row', alignItems:'center', paddingHorizontal:10, paddingVertical:6, borderRadius:999 },
  badgeTxt:{ marginLeft:6, fontWeight:'800', color:C.ink },
  badgeSelectedOn:{ backgroundColor:C.primary },
  badgeSelectedOff:{ backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E5E7EB' },

  prodTitle:{ color:C.ink, fontWeight:'900', fontSize:20, marginTop:6 },
  prodSub:{ color:C.muted, marginTop:2 },

  serviceRow:{ flexDirection:'row', alignItems:'center', borderColor:'#E6E9F0', borderWidth:1, paddingVertical:10, paddingHorizontal:12, borderRadius:12, backgroundColor:'#fff', marginBottom:8 },
  serviceRowActive:{ backgroundColor:'#FFF7F7' },
  check:{ width:18, height:18, borderRadius:6, borderWidth:1, borderColor:'#CBD5E1', alignItems:'center', justifyContent:'center', marginRight:8, backgroundColor:'#fff' },
  checkActive:{ backgroundColor:C.primary, borderColor:C.primary },

  serviceTxt:{ color:C.ink, fontWeight:'800', maxWidth:'56%' },
  qtyBadge:{ marginLeft:8, color:C.muted, fontWeight:'800' },
  serviceAmt:{ color:C.ink, fontWeight:'900' },

  totalLine:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:10 },
  equipLbl:{ color:C.muted }, equipVal:{ color:C.ink, fontWeight:'900' },

  row:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:6 },
  rowLbl:{ color:C.ink, fontWeight:'600' }, rowVal:{ color:C.ink, fontWeight:'700' },
  hr:{ height:1, backgroundColor:'#E5E7EB', marginVertical:8 },

  payableLbl:{ color:C.ink, fontWeight:'900', fontSize:16 },
  payableVal:{ color:C.ink, fontWeight:'900', fontSize:16 },

  tipRow:{ flexDirection:'row', alignItems:'center', gap:10, marginTop:6 },
  tipBtnBase:{ paddingVertical:10, paddingHorizontal:16, borderRadius:999, position:'relative' },
  tipBtn:{ borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff' },
  tipBtnActive:{ backgroundColor:'#F6FEF8', borderColor:'#CFF7DC' },
  tipTxt:{ color:C.ink, fontWeight:'800' }, tipTxtActive:{ color:C.ok },
  tipPopularFlat:{ backgroundColor:'#F6FEF8', borderWidth:1, borderColor:'#CFF7DC' },
  tipPopularActive:{ backgroundColor:'#EFFFF5', borderColor:'#B7F0CE' },
  tipPopularTxt:{ color:C.ok },
  tipNote:{ color:C.muted, marginTop:8 },

  addrCard:{ flexDirection:'row', alignItems:'center', padding:12, borderRadius:16, backgroundColor:C.card, borderWidth:1, borderColor:'#EEF2F7' },
  addrTxt:{ color:C.ink, marginLeft:8, flex:1 },
  addrEdit:{ padding:8, borderRadius:8, backgroundColor:'#F1F5F9' },

  bottomBar:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:16, paddingTop:12, borderTopWidth:1, borderColor:'#E5E7EB' },
  bottomLeft:{ color:C.ink, fontWeight:'900' },
  selectBtn:{ backgroundColor:C.primary, borderRadius:12, paddingVertical:12, paddingHorizontal:16, flexDirection:'row', alignItems:'center' },
  selectTxt:{ color:'#fff', fontWeight:'900', marginLeft:8 },

  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'flex-end' },
  modalBackdropCenter:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', padding:20 },

  sheet:{ backgroundColor:'#fff', borderTopLeftRadius:18, borderTopRightRadius:18, padding:16, ...Platform.select({ ios:{ shadowColor:'#000', shadowOpacity:0.2, shadowRadius:10 }, android:{ elevation:12 } }) },
  sheetLarge:{ backgroundColor:'#fff', borderTopLeftRadius:18, borderTopRightRadius:18, padding:16, maxHeight:'80%', ...Platform.select({ ios:{ shadowColor:'#000', shadowOpacity:0.2, shadowRadius:10 }, android:{ elevation:12 } }) },
  sheetTitle:{ color:C.ink, fontWeight:'900', fontSize:20, marginBottom:4 },
  closePill:{ width:34, height:34, borderRadius:12, backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center' },
  refreshPill:{ width:34, height:34, borderRadius:12, backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center', marginRight:8 },

  inputLbl:{ color:C.muted, marginTop:8, marginBottom:4 },
  input:{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:12, paddingHorizontal:12, height:46, color:C.ink, backgroundColor:'#fff' },
  btn:{ paddingHorizontal:14, paddingVertical:10, borderRadius:12 }, btnTxt:{ fontWeight:'900' },

  savedAddrRow:{ flexDirection:'row', alignItems:'center', paddingVertical:8, paddingHorizontal:10, borderRadius:12, borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff', marginBottom:8 },
  savedAddrTxt:{ color:C.ink, marginLeft:8, flex:1 },

  daysRow:{ flexDirection:'row', justifyContent:'space-between', marginTop:8, marginBottom:8, paddingHorizontal:6 },
  dayLbl:{ width:34, textAlign:'center', color:C.muted, fontWeight:'700' },
  grid:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  cell:{ width:46, height:46, borderRadius:12, backgroundColor:'#F8FAFC', alignItems:'center', justifyContent:'center', marginBottom:12, borderWidth:1, borderColor:'#E5E7EB' },
  cellActive:{ backgroundColor:'#EF3A3A11', borderColor:C.primary },
  cellTxt:{ color:C.ink, fontWeight:'800' },
  cellTxtActive:{ color:C.primary },

  continueBtn:{ marginTop:6, backgroundColor:C.primary, borderRadius:16, alignItems:'center', paddingVertical:14 },
  continueTxt:{ color:'#fff', fontWeight:'900' },

  restCard:{ borderWidth:1, borderColor:'#EEF2F7', padding:14, borderRadius:16, backgroundColor:'#fff', marginBottom:12 },
  restName:{ color:C.ink, fontWeight:'900', fontSize:18 },
  restAddr:{ color:C.muted, marginTop:2 },
  restFssai:{ color:C.muted, marginTop:2 },
  badgeSmall:{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', paddingHorizontal:10, paddingVertical:6, borderRadius:999, marginTop:10 },
  badgeSmallTxt:{ marginLeft:6, fontWeight:'800' },

  successCard:{ width:'100%', maxWidth:520, backgroundColor:'#fff', borderRadius:22, paddingVertical:22, paddingHorizontal:18 },
  successIconWrap:{ alignSelf:'center', width:86, height:86, borderRadius:18, backgroundColor:'#22C55E', alignItems:'center', justifyContent:'center', marginBottom:10 },
  successTitle:{ textAlign:'center', color:C.ink, fontSize:22, fontWeight:'900', marginBottom:8 },
  successMsg:{ textAlign:'center', color:C.text, lineHeight:22, marginHorizontal:6 },
  successBtn:{ alignSelf:'center', marginTop:18, backgroundColor:C.primary, paddingVertical:12, paddingHorizontal:28, borderRadius:16 },
  successBtnTxt:{ color:'#fff', fontWeight:'900', fontSize:16 },

  subtle: { color: '#9CA3AF' },
  counterBtnSm:{ width:28, height:28, borderRadius:8, backgroundColor:'#FFF2F2', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#FEE2E2' },

  upiCopiedCard: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 8,
  },
  upiCopiedHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  upiCopiedIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  upiCopiedTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  upiIdBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  upiIdText: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  upiCopiedSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: 8,
  },
  upiCopiedInstruction: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  amountBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  amountText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#D97706',
    textAlign: 'center',
  },
  upiCopiedBtn: {
    backgroundColor: C.primary,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    alignItems: 'center',
  },
  upiCopiedBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
});