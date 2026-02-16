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
import { useFocusEffect } from '@react-navigation/native';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
/* ---------- MONEY & UPI HELPERS ---------- */
const toAmount = (n) => Math.round(Number(n || 0) * 100) / 100;
const formatAmount = (n) => Number(n || 0);

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

// UPI_ID and PAYEE_NAME are now fetched from admin payment settings

/* ---------- DATE HELPERS ---------- */
const startOfDay = (d)=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

const SCREEN_W = Dimensions.get('window').width;

export default function RequestNow({ navigation, route }) {
  const insets = useSafeAreaInsets();

  /* ---------- INCOMING ---------- */
  const passedServices = useMemo(() =>
    Array.isArray(route?.params?.services) ? route.params.services : [],
    [route?.params?.services]
  );
  const passedParts = useMemo(() =>
    Array.isArray(route?.params?.parts) ? route.params.parts : [],
    [route?.params?.parts]
  );
  const passedCartRaw = useMemo(() =>
    route?.params?.cart || {},
    [route?.params?.cart]
  );
  const productId      = String(route?.params?.productId ?? route?.params?.id ?? 'global');
  const productTitle   = route?.params?.productTitle || 'Commercial Fridge';
  const category       = route?.params?.category || 'Commercial';
  const subtitle       = route?.params?.description || '';
  const heroImage      = route?.params?.heroImage || 'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp';
  const selectedEquipment = route?.params?.selectedEquipment || null; // Pre-selected equipment from My Equipment

  /* ---------- STATE VARIABLES ---------- */
  const [ownerKey, setOwnerKey] = useState('global');
  const [cards, setCards] = useState([]);
  const cardsRef = useRef(cards);
  const [loadingInit, setLoadingInit] = useState(true);

  // Equipment-specific services/parts state
  const [equipmentServices, setEquipmentServices] = useState([]);
  const [equipmentParts, setEquipmentParts] = useState([]);
  const [loadingEquipmentServices, setLoadingEquipmentServices] = useState(false);
  const isLoadingRef = useRef(false); // Guard to prevent concurrent/infinite loads
  const hasLoadedRef = useRef(false); // Track if data has been loaded for this session
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
  const [problemDescription, setProblemDescription] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [paymentSettings, setPaymentSettings] = useState(null);

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

  // Keep cardsRef in sync with cards state
  useEffect(() => {
    cardsRef.current = cards;
  }, [cards]);

  // Fetch payment settings from admin
  useEffect(() => {
    const fetchPaymentSettings = async () => {
      try {
        const response = await api.get('/public/payment-settings');
        if (response.data?.ok && response.data?.data) {
          setPaymentSettings(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch payment settings:', error);
      }
    };
    fetchPaymentSettings();
  }, []);

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

  /* ---------- FETCH SERVICES/PARTS BY EQUIPMENT CATEGORY ---------- */
  const fetchServicesByCategory = useCallback(async (categoryId, subCategoryId) => {
    if (!categoryId) return { services: [], parts: [] };

    try {
      setLoadingEquipmentServices(true);

      // Build query params
      const params = { category_id: categoryId };
      if (subCategoryId) {
        params.subcategory_id = subCategoryId;
      }

      // Fetch services and parts in parallel
      const [servicesRes, partsRes] = await Promise.all([
        api.get('/app/services', { params }),
        api.get('/app/parts', { params }),
      ]);

      const services = Array.isArray(servicesRes?.data?.data) ? servicesRes.data.data : [];
      const parts = Array.isArray(partsRes?.data?.data) ? partsRes.data.data : [];

      console.log('[RequestNow] Fetched services by category:', services.length);
      console.log('[RequestNow] Fetched parts by category:', parts.length);

      setEquipmentServices(services);
      setEquipmentParts(parts);

      return { services, parts };
    } catch (e) {
      console.log('[RequestNow] Failed to fetch services by category:', e?.message);
      return { services: [], parts: [] };
    } finally {
      setLoadingEquipmentServices(false);
    }
  }, []);

  /* ---------- LOAD EQUIPMENT SERVICES ON MOUNT ---------- */
  useEffect(() => {
    if (selectedEquipment?.categoryId) {
      console.log('[RequestNow] Loading services for equipment category:', selectedEquipment.categoryId);
      fetchServicesByCategory(selectedEquipment.categoryId, selectedEquipment.subCategoryId);
    }
  }, [selectedEquipment?.categoryId, selectedEquipment?.subCategoryId, fetchServicesByCategory]);

  /* ---------- ADD SERVICE/PART TO CART FOR EQUIPMENT ---------- */
  const addEquipmentServiceToCart = useCallback((service) => {
    const equipmentId = selectedEquipment?.id || 'equipment';
    const serviceId = String(service.id);

    console.log('[RequestNow] addEquipmentServiceToCart:', { equipmentId, serviceId });

    // Create or update equipment card
    setCards(prev => {
      const existingCard = prev.find(c => c.pid === equipmentId);

      if (existingCard) {
        // Update existing card
        const newCart = { ...(existingCard.cart || {}), [serviceId]: (existingCard.cart?.[serviceId] || 0) + 1 };
        const storageKey = rdraftKeyOf(equipmentId);
        console.log('[RequestNow] Saving equipment cart to AsyncStorage:', { key: storageKey, cart: newCart });
        AsyncStorage.setItem(storageKey, JSON.stringify(newCart)).catch(() => {});

        // Also save updated services list to AsyncStorage
        const updatedServices = [...new Set([...(existingCard.services || []), service])];
        AsyncStorage.setItem(rservicesKeyOf(equipmentId), JSON.stringify(updatedServices)).catch(() => {});

        return prev.map(card =>
          card.pid === equipmentId
            ? { ...card, cart: newCart, services: updatedServices }
            : card
        );
      } else {
        // Create new card for equipment
        const newCart = { [serviceId]: 1 };
        const storageKey = rdraftKeyOf(equipmentId);
        console.log('[RequestNow] Saving new equipment cart to AsyncStorage:', { key: storageKey, cart: newCart });
        AsyncStorage.setItem(storageKey, JSON.stringify(newCart)).catch(() => {});

        // Save meta
        const meta = {
          productId: equipmentId,
          productTitle: selectedEquipment?.name || 'Equipment Service',
          category: selectedEquipment?.categoryName || 'Equipment',
          subtitle: selectedEquipment?.subCategoryName || '',
          heroImage: heroImage,
        };
        AsyncStorage.setItem(pmetaKeyOf(equipmentId), JSON.stringify(meta)).catch(() => {});

        // Save services list to AsyncStorage
        AsyncStorage.setItem(rservicesKeyOf(equipmentId), JSON.stringify([service])).catch(() => {});

        return [...prev, {
          pid: equipmentId,
          meta,
          services: [service],
          parts: [],
          cart: newCart,
        }];
      }
    });
    // Sync to database cart
    syncToDbCart('SERVICE', serviceId);
  }, [selectedEquipment, rdraftKeyOf, pmetaKeyOf, rservicesKeyOf, heroImage, syncToDbCart]);

  const addEquipmentPartToCart = useCallback((part) => {
    const equipmentId = selectedEquipment?.id || 'equipment';
    const partKey = `part:${part.id}`;

    console.log('[RequestNow] addEquipmentPartToCart:', { equipmentId, partKey });

    // Create or update equipment card
    setCards(prev => {
      const existingCard = prev.find(c => c.pid === equipmentId);

      if (existingCard) {
        // Update existing card
        const newCart = { ...(existingCard.cart || {}), [partKey]: (existingCard.cart?.[partKey] || 0) + 1 };
        const storageKey = rdraftKeyOf(equipmentId);
        console.log('[RequestNow] Saving equipment part cart to AsyncStorage:', { key: storageKey, cart: newCart });
        AsyncStorage.setItem(storageKey, JSON.stringify(newCart)).catch(() => {});

        // Also save updated parts list to AsyncStorage
        const updatedParts = [...new Set([...(existingCard.parts || []), part])];
        AsyncStorage.setItem(rpartsKeyOf(equipmentId), JSON.stringify(updatedParts)).catch(() => {});

        return prev.map(card =>
          card.pid === equipmentId
            ? { ...card, cart: newCart, parts: updatedParts }
            : card
        );
      } else {
        // Create new card for equipment
        const newCart = { [partKey]: 1 };
        const storageKey = rdraftKeyOf(equipmentId);
        console.log('[RequestNow] Saving new equipment part cart to AsyncStorage:', { key: storageKey, cart: newCart });
        AsyncStorage.setItem(storageKey, JSON.stringify(newCart)).catch(() => {});

        // Save meta
        const meta = {
          productId: equipmentId,
          productTitle: selectedEquipment?.name || 'Equipment Service',
          category: selectedEquipment?.categoryName || 'Equipment',
          subtitle: selectedEquipment?.subCategoryName || '',
          heroImage: heroImage,
        };
        AsyncStorage.setItem(pmetaKeyOf(equipmentId), JSON.stringify(meta)).catch(() => {});

        // Save parts list to AsyncStorage
        AsyncStorage.setItem(rpartsKeyOf(equipmentId), JSON.stringify([part])).catch(() => {});

        return [...prev, {
          pid: equipmentId,
          meta,
          services: [],
          parts: [part],
          cart: newCart,
        }];
      }
    });
    // Sync to database cart
    syncToDbCart('PART', String(part.id));
  }, [selectedEquipment, rdraftKeyOf, pmetaKeyOf, rpartsKeyOf, heroImage, syncToDbCart]);

  /* ---------- LOAD ALL CARDS ---------- */
  const loadCartData = useCallback(async () => {
    // Prevent concurrent/infinite loads
    if (isLoadingRef.current) {
      console.log('[RequestNow] Already loading, skipping...');
      return;
    }
    isLoadingRef.current = true;

    try {
      setLoadingInit(true);

      // ONE-TIME CLEANUP: Clear all old cart data (remove this block after testing)
      const cleanupDone = await AsyncStorage.getItem('cart_cleanup_v2_done');
      if (!cleanupDone) {
        console.log('[RequestNow] Running one-time cart cleanup...');
        const allKeys = await AsyncStorage.getAllKeys();
        const cartKeys = allKeys.filter(k =>
          k.startsWith('rdraft:') ||
          k.startsWith('pmeta:') ||
          k.startsWith('rservices:') ||
          k.startsWith('rparts:')
        );
        if (cartKeys.length > 0) {
          await AsyncStorage.multiRemove(cartKeys);
          console.log('[RequestNow] Cleaned up', cartKeys.length, 'old cart keys');
        }
        await AsyncStorage.setItem('cart_cleanup_v2_done', 'true');
      }

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

      // Clean up legacy 'global' cart data and related keys
      const globalKey = `${myPrefix}global`;
      if (otherKeys.includes(globalKey)) {
        await AsyncStorage.multiRemove([
          globalKey,
          `pmeta:${ownerKey}:global`,
          `rservices:${ownerKey}:global`,
          `rparts:${ownerKey}:global`,
        ]).catch(() => {});
        console.log('[RequestNow] Cleaned up legacy global cart data');
      }

      const products = new Map();
      const keysToRemove = [];
      for (const key of otherKeys) {
        const pid = key.slice(myPrefix.length);
        // Skip 'global' entries - they are legacy data
        if (pid === 'global') continue;
        const raw = await AsyncStorage.getItem(key);
        const cartObj = raw ? JSON.parse(raw) : {};
        const filtered = Object.fromEntries(Object.entries(cartObj || {}).filter(([_, q]) => Number(q) > 0));
        if (Object.keys(filtered).length) {
          products.set(pid, { pid, cart: filtered });
        } else {
          // Mark empty carts for cleanup
          keysToRemove.push(key);
          keysToRemove.push(`pmeta:${ownerKey}:${pid}`);
          keysToRemove.push(`rservices:${ownerKey}:${pid}`);
          keysToRemove.push(`rparts:${ownerKey}:${pid}`);
        }
      }
      // Clean up empty cart entries
      if (keysToRemove.length > 0) {
        await AsyncStorage.multiRemove(keysToRemove).catch(() => {});
        console.log('[RequestNow] Cleaned up empty carts:', keysToRemove.length / 4);
      }

      // Only add current product if it has items AND valid productId (not 'global')
      if (productId !== 'global' && Object.keys(initialCart).length > 0) {
        products.set(productId, { pid: productId, cart: initialCart });
      }

      // Process all products in PARALLEL for faster loading
      // Skip 'global' entries entirely - they are legacy data from before category-based storage
      const productEntries = Array.from(products.values()).filter(
        ({ pid }) => pid !== 'global'
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

          // If no meta found in AsyncStorage, try to fetch from API (only for numeric product IDs)
          if (!meta && pid !== 'global' && !isNaN(Number(pid))) {
            meta = await fetchProductFromApi(pid);
            if (meta) {
              AsyncStorage.setItem(pmetaKeyOf(pid), JSON.stringify(meta)).catch(()=>{});
            }
          }

          if (!meta) {
            if (pid !== 'global') {
              // For equipment (UUID pids) or products without meta, create a placeholder
              meta = { productId: pid, productTitle: `Equipment #${pid.slice(0, 8)}...`, category: 'Equipment', subtitle: '', heroImage: heroImage };
            } else {
              return null; // Skip global entries
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

      // Clear AsyncStorage for items that are not in the database
      // This ensures removed items don't come back
      try {
        const dbCartResponse = await api.get('/owner/cart');
        const dbCartItems = dbCartResponse.data?.ok ? (dbCartResponse.data.data?.items || []) : [];
        console.log('[RequestNow] DB cart has', dbCartItems.length, 'items');

        // Build a set of item IDs that exist in DB
        const dbServiceIds = new Set(dbCartItems.filter(i => i.serviceItemId).map(i => String(i.serviceItemId)));
        const dbPartIds = new Set(dbCartItems.filter(i => i.partItemId).map(i => String(i.partItemId)));

        // Clean up AsyncStorage to match DB state
        for (const card of hydrated) {
          if (card.cart && Object.keys(card.cart).length > 0) {
            let needsUpdate = false;
            const cleanedCart = { ...card.cart };

            for (const [sid, qty] of Object.entries(card.cart)) {
              const isPart = String(sid).startsWith('part:');
              const itemId = isPart ? sid.replace('part:', '') : sid;

              // If item is NOT in DB, remove it from AsyncStorage cart
              const existsInDb = isPart ? dbPartIds.has(itemId) : dbServiceIds.has(itemId);
              if (!existsInDb) {
                console.log('[RequestNow] Removing orphaned item from AsyncStorage:', itemId);
                delete cleanedCart[sid];
                needsUpdate = true;
              }
            }

            if (needsUpdate) {
              await AsyncStorage.setItem(rdraftKeyOf(card.pid), JSON.stringify(cleanedCart));
              // Also update the card in state
              card.cart = cleanedCart;
            }
          }
        }

        // Update cards with cleaned data
        setCards([...hydrated]);
      } catch (e) {
        console.log('[RequestNow] Failed to clean cart:', e?.message);
      }
    } finally {
      setLoadingInit(false);
      isLoadingRef.current = false;
    }
  }, [ownerKey, productId, passedCartRaw, passedServices, passedParts, rdraftKeyOf, pmetaKeyOf, rservicesKeyOf, rpartsKeyOf, heroImage, fetchProductFromApi, fetchServicesFromApi, fetchPartsFromApi]);

  // Load cart data when screen comes into focus and ownerKey is ready
  useFocusEffect(
    useCallback(() => {
      // Only load once when screen focuses AND ownerKey is set (not 'global' default)
      // Wait for ownerKey to be initialized from AsyncStorage
      const loadIfReady = async () => {
        // Give ownerKey time to be set from AsyncStorage
        await new Promise(resolve => setTimeout(resolve, 100));

        if (!hasLoadedRef.current && !isLoadingRef.current) {
          hasLoadedRef.current = true;
          console.log('[RequestNow] Loading cart data with ownerKey:', ownerKey);
          loadCartData();
        }
      };
      loadIfReady();

      // Reset on blur so we reload on next focus
      return () => {
        hasLoadedRef.current = false;
      };
    }, [ownerKey, loadCartData])
  );

  /* ---------- CART MANAGEMENT ---------- */
  // Remove item from all AsyncStorage cart entries
  const removeFromAsyncStorageCart = useCallback(async (itemType, itemId) => {
    try {
      const sid = itemType === 'PART' ? `part:${itemId}` : itemId;
      const allKeys = await AsyncStorage.getAllKeys();
      const rdraftKeys = allKeys.filter(k => k.startsWith(`rdraft:${ownerKey}:`));

      for (const key of rdraftKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) {
          const cart = JSON.parse(raw);
          if (cart[sid] !== undefined) {
            delete cart[sid];
            await AsyncStorage.setItem(key, JSON.stringify(cart));
            console.log('[RequestNow] Removed from AsyncStorage:', { key, sid });
          }
        }
      }
    } catch (e) {
      console.log('[RequestNow] Failed to remove from AsyncStorage:', e?.message);
    }
  }, [ownerKey]);

  // Remove from database cart
  const removeFromDbCart = useCallback(async (itemType, itemId) => {
    console.log('[RequestNow] removeFromDbCart called:', { itemType, itemId });
    try {
      const cartResponse = await api.get('/owner/cart');
      console.log('[RequestNow] Cart response:', cartResponse.data?.ok, 'items:', cartResponse.data?.data?.items?.length || 0);
      if (cartResponse.data?.ok) {
        const cartItems = cartResponse.data.data?.items || [];
        console.log('[RequestNow] Looking for item in cart. ItemType:', itemType, 'ItemId:', itemId, 'Type:', typeof itemId);
        console.log('[RequestNow] Cart items:', cartItems.map(i => ({ id: i.id, serviceItemId: i.serviceItemId, partItemId: i.partItemId })));
        const cartItem = cartItems.find(item => {
          if (itemType === 'SERVICE') {
            const match = String(item.serviceItemId) === String(itemId);
            console.log('[RequestNow] Comparing SERVICE:', item.serviceItemId, '===', itemId, ':', match);
            return match;
          } else {
            const match = String(item.partItemId) === String(itemId);
            console.log('[RequestNow] Comparing PART:', item.partItemId, '===', itemId, ':', match);
            return match;
          }
        });
        if (cartItem) {
          console.log('[RequestNow] Found cart item to delete:', cartItem.id);
          await api.delete(`/owner/cart/items/${cartItem.id}`);
          console.log('[RequestNow] Successfully removed item from DB cart:', itemId);
        } else {
          console.log('[RequestNow] No matching cart item found for:', itemId);
        }
      }

      // Always remove from AsyncStorage as well
      await removeFromAsyncStorageCart(itemType, itemId);
    } catch (e) {
      console.log('[RequestNow] Remove from DB cart failed:', e?.message);
    }
  }, [removeFromAsyncStorageCart]);

  // Sync item to database cart when adding
  const syncToDbCart = useCallback(async (itemType, itemId) => {
    try {
      console.log('[RequestNow] syncToDbCart called:', { itemType, itemId });
      await api.post('/owner/cart', {
        itemType,
        serviceItemId: itemType === 'SERVICE' ? itemId : undefined,
        partItemId: itemType === 'PART' ? itemId : undefined,
        qty: 1,
      });
      console.log('[RequestNow] Successfully synced to DB cart:', itemId);
    } catch (e) {
      console.log('[RequestNow] Sync to DB cart failed:', e?.message);
    }
  }, []);

  const updateCartFor = useCallback(async (pid, updater) => {
    setCards(prev => {
      const next = prev.map(card => {
        if (card.pid !== pid) return card;
        const newCart = updater(card.cart || {});
        const storageKey = rdraftKeyOf(pid);
        console.log('[RequestNow] Saving to AsyncStorage:', { key: storageKey, cart: newCart });
        AsyncStorage.setItem(storageKey, JSON.stringify(newCart || {})).catch((e) => {
          console.log('[RequestNow] AsyncStorage save failed:', e?.message);
        });
        return { ...card, cart: newCart };
      });
      return next;
    });
  }, [rdraftKeyOf]);

  const makeItems = useCallback((services, parts, cartObj) => {
    const items = [];

    // Process services - use string IDs (UUIDs)
    const svcById = {};
    (services||[]).forEach(s => { svcById[String(s.id)] = { name: s.title || s.name, unit: Number(s.price||0) }; });

    // Process parts - use string IDs (UUIDs)
    const partById = {};
    (parts||[]).forEach(p => { partById[String(p.id)] = { name: p.title || p.name, unit: Number(p.price||0) }; });

    Object.entries(cartObj||{}).forEach(([key, qty]) => {
      const q = Number(qty||0);
      if (q <= 0) return;

      // Check if it's a part (key starts with 'part:')
      if (String(key).startsWith('part:')) {
        const partId = key.replace('part:', '');
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
        const sid = String(key);
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
  }, [allKeys]);

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
    const itemTotal = selectedItems.reduce((sum, it) => sum + Number(it.lineTotal || 0), 0);
    const gstTotal  = Math.round(itemTotal * GST_RATE * 100) / 100;
    const tipTotal  = Number(tip || 0);
    const payTotal  = itemTotal + gstTotal + tipTotal;

    return {
      item: itemTotal,
      gst: gstTotal,
      tip: tipTotal,
      payable: payTotal,
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

      // API already filters by ownerId, no need to filter again
      const normalized = rows.map((r, i) => ({
        id: String(r.id ?? i),
        name: r.hotel_name || r.name || 'Restaurant',
        addr: r.address || '',
        city: r.city || '',
        pincode: r.pincode || '',
        fssai: r.fssai_number || '',
        approved: String(r.status || '').toLowerCase() === 'approved',
        image: r.image || r.restaurant_image || '',
        ownerId: chosen,
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
    if (paymentSettings?.upiId) {
      Clipboard.setString(paymentSettings.upiId);
      setUpiCopiedModal(true);
    }
  }, [paymentSettings]);

  const pickScreenshot = useCallback(() => {
    const options = {
      mediaType: 'photo',
      quality: 0.8,
      maxWidth: scale(1024),
      maxHeight: scale(1024),
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

    // Build items array for the API (with item IDs, types, quantities, prices)
    const apiItems = selectedItems.map(it => ({
      item_id: it.item_id,
      item_type: it.item_type, // 'service' or 'part'
      qty: it.qty,
      price: it.unitPrice,
      name: it.name,
    }));

    // Build the payload with all products combined
    const payload = {
      product_id: productIdValue,
      product_name: combinedProductName,  // All product names combined
      description: problemDescription || `Requested for ${selectedDate ? selectedDate.toDateString() : 'Not specified'}`,
      problem_description: problemDescription || '',
      image: firstMeta.heroImage || firstMeta.image || '',
      tags: tags.length > 0 ? tags : ['General Service'],
      restaurant_id: String(pickedRestaurant?.id || ''),  // Keep as string (UUID)
      restaurant_name: pickedRestaurant?.name || 'Unknown Restaurant',
      restaurant_owner_name: pickedRestaurant?.ownerName || '',
      location: address.line1 || 'Location not specified',
      service_date: serviceDate,
      status: 'Pending',
      assigned_to: '',
      assigned_to_id: null,
      owner_equipment_id: selectedEquipment?.id || null, // Link to owner's equipment
      // Include items and totals for proper booking creation
      items: apiItems,
      total_amount: payable, // Total payable amount including tax
      tip: tip, // Tip amount
    };

    console.log('[RequestNow] Equipment Request Payload (multi-product):', JSON.stringify(payload, null, 2));
    console.log('[RequestNow] Products included:', productNames);
    return payload;
  };

  /* ---------- FIXED: Payment Confirmation (matches web owner portal flow) ---------- */
  const handleConfirmPayment = async () => {
    if (!hasScreenshot) {
      alert("Please upload your payment screenshot before confirming.");
      return;
    }

    console.log('Processing payment confirmation...');

    // Upload screenshot image first to get a URL (same as web portal)
    let screenshotUrl = null;
    if (paymentScreenshot && paymentScreenshot.uri) {
      try {
        console.log('Uploading payment screenshot...');

        // Create form data for image upload
        const formData = new FormData();
        formData.append('file', {
          uri: paymentScreenshot.uri,
          type: paymentScreenshot.type || 'image/jpeg',
          name: paymentScreenshot.fileName || `payment_${Date.now()}.jpg`,
        });
        formData.append('folder', 'payment-proofs');

        // Upload to /upload endpoint
        const uploadResponse = await api.post('/upload', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        if (uploadResponse.data?.ok && uploadResponse.data?.url) {
          screenshotUrl = uploadResponse.data.url;
          console.log('Screenshot uploaded successfully:', screenshotUrl);
        } else {
          throw new Error(uploadResponse.data?.error || 'Failed to upload screenshot');
        }
      } catch (error) {
        console.error('Error uploading screenshot:', error);
        Alert.alert('Error', 'Failed to upload payment screenshot. Please try again.');
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

      // STEP 2: Upload payment proof (same as web owner portal)
      const bookingId = equipmentResponse.data.data?.id || equipmentResponse.data.data?.booking_id;

      if (!bookingId) {
        throw new Error('Booking ID not received from server');
      }

      console.log('Uploading payment proof for booking:', bookingId);

      const paymentResponse = await api.post(`/owner/bookings/${bookingId}/upload-payment`, {
        screenshotUrl: screenshotUrl,
      });

      console.log('Payment API Response:', paymentResponse.data);

      if (paymentResponse.data.ok) {
        console.log('Payment saved successfully with screenshot');
        
        // Clear all cart data after successful payment
        try {
          const allKeys = await AsyncStorage.getAllKeys();
          const cartKeys = allKeys.filter(k =>
            k.startsWith('rdraft:') ||
            k.startsWith('rservices:') ||
            k.startsWith('rparts:') ||
            k.startsWith('pmeta:')
          );
          if (cartKeys.length > 0) {
            await AsyncStorage.multiRemove(cartKeys);
            console.log('[RequestNow] Cart cleared after payment:', cartKeys.length, 'keys');
          }
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
        
        if (error.response.status === 400) {
          // Handle validation errors from upload-payment
          errorMessage = error.response.data?.error || 'Invalid request. Please try again.';
        } else if (error.response.status === 422) {
          // More specific error handling for product_id validation
          if (error.response.data?.errors?.product_id) {
            errorMessage = `Product ID Error: ${error.response.data.errors.product_id[0]}. Please contact support.`;
          } else {
            errorMessage = `Validation Error: ${errorDetails}`;
          }
        } else if (error.response.status === 404) {
          errorMessage = 'Booking not found. Please try creating the request again.';
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
    // Sync to database cart
    const isPart = String(sid).startsWith('part:');
    const itemId = isPart ? sid.replace('part:', '') : sid;
    syncToDbCart(isPart ? 'PART' : 'SERVICE', itemId);
  }, [updateCartFor, syncToDbCart]);

  const decQty = useCallback((pid, sid) => {
    // Check current quantity from ref before updating
    const card = cardsRef.current.find(c => c.pid === pid);
    const currentQty = card?.cart?.[sid] || 0;
    const willBeRemoved = currentQty <= 1;

    console.log('[RequestNow] decQty called:', { pid, sid, currentQty, willBeRemoved });

    updateCartFor(pid, prev => {
      const q = (prev?.[sid] || 0) - 1;
      const n = { ...(prev || {}) };
      if (q <= 0) {
        delete n[sid];
        console.log('[RequestNow] Item deleted from local cart:', sid);
      } else {
        n[sid] = q;
      }
      return n;
    });

    // Remove from database cart if item will be removed (called outside callback)
    if (willBeRemoved) {
      const isPart = String(sid).startsWith('part:');
      const itemId = isPart ? sid.replace('part:', '') : sid;
      console.log('[RequestNow] Calling removeFromDbCart:', { itemType: isPart ? 'PART' : 'SERVICE', itemId });
      removeFromDbCart(isPart ? 'PART' : 'SERVICE', itemId);
    }
  }, [updateCartFor, removeFromDbCart]);

  const removeLine = useCallback((pid, sid) => {
    updateCartFor(pid, prev => {
      const n = { ...(prev || {}) };
      delete n[sid];
      return n;
    });

    // Remove from database cart (called outside callback)
    const isPart = String(sid).startsWith('part:');
    const itemId = isPart ? sid.replace('part:', '') : sid;
    removeFromDbCart(isPart ? 'PART' : 'SERVICE', itemId);
  }, [updateCartFor, removeFromDbCart]);

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
            {isSel ? <Icon name="checkmark" size={scale(12)} color="#fff" /> : null}
          </TouchableOpacity>

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', flex: 1, flexWrap: 'wrap' }}>
            {isPart && <View style={{ width: scale(6), height: scale(6), borderRadius: scale(3), backgroundColor: '#EA580C', marginRight: scale(6), marginTop: scale(5) }} />}
            <Text style={[st.serviceTxt, { flex: 1 }, !isSel && { color: C.muted }]}>{item.name}</Text>
          </View>

          {q > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => decQty(pid, getCartKey(item))} style={[st.counterBtnSm, { marginRight: scale(4) }]}>
                <Icon name="remove" size={scale(18)} color={accentColor} />
              </TouchableOpacity>
              <Text style={[st.qtyBadge, !isSel && { color: '#94A3B8' }]}>{`×${q}`}</Text>
              <TouchableOpacity onPress={() => incQty(pid, getCartKey(item))} style={[st.counterBtnSm, { marginLeft: scale(4) }]}>
                <Icon name="add" size={scale(18)} color={accentColor} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeLine(pid, getCartKey(item))} style={[st.counterBtnSm, { marginLeft: scale(6) }]}>
                <Icon name="trash-outline" size={scale(18)} color={C.danger} />
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
      <View style={[st.cardProd, { width: SCREEN_W - 32, marginRight: scale(12) }]}>
        <ImageBackground source={{ uri: meta.heroImage }} style={st.hero} imageStyle={{ borderTopLeftRadius: scale(16), borderTopRightRadius: scale(16) }}>
          <View style={st.badgeRow}>
            <View style={[st.badge, { backgroundColor: '#FFEAEA' }]}>
              <Icon name="snow-outline" size={scale(14)} color={C.danger} />
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
              <Icon name={isAllSelectedInCard ? 'checkmark-circle' : 'ellipse-outline'} size={scale(14)} color={isAllSelectedInCard ? '#fff' : C.ink} />
              <Text style={[st.badgeTxt, isAllSelectedInCard ? { color: '#fff' } : { color: C.ink }]}>{'Selected'}</Text>
            </TouchableOpacity>
          </View>
        </ImageBackground>

        <View style={{ padding: scale(12) }}>
          <Text style={st.prodTitle}>{meta.productTitle}</Text>
          {!!meta.subtitle && <Text style={st.prodSub}>{meta.subtitle}</Text>}

          <View style={{ marginTop: scale(8) }}>
            {loadingInit && items.length === 0 ? (
              <View style={{ paddingVertical: scale(12), alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : items.length === 0 ? (
              <View style={{ paddingVertical: scale(4) }}>
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
          <Icon name="chevron-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={st.hTitle}>Your cart</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + 180 }}>
        {/* HORIZONTAL CARDS */}
        <View style={{ paddingHorizontal: scale(16), marginTop: scale(8) }}>
          {loadingInit ? (
            <View style={{ paddingVertical: scale(12), alignItems: 'center' }}>
              <ActivityIndicator color={C.primary} />
            </View>
          ) : cards.length === 0 ? (
            <View style={{ paddingVertical: scale(12), alignItems: 'center' }}>
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
              contentContainerStyle={{ paddingRight: scale(16) }}
            >
              {cards.map((card) => (
                <ProductCard key={`pc-${card.pid}`} card={card} />
              ))}
            </ScrollView>
          )}
        </View>

        {/* Equipment Services/Parts Selection */}
        {selectedEquipment && (
          <View style={[st.card, { marginHorizontal: scale(16), marginTop: scale(16) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(12) }}>
              <Icon name="construct-outline" size={scale(20)} color={C.primary} />
              <Text style={[st.cardTitle, { marginBottom: 0, marginLeft: scale(8) }]}>
                Services for {selectedEquipment.categoryName || selectedEquipment.name}
              </Text>
            </View>

            {loadingEquipmentServices ? (
              <View style={{ paddingVertical: scale(20), alignItems: 'center' }}>
                <ActivityIndicator color={C.primary} />
                <Text style={{ color: C.muted, marginTop: scale(8) }}>Loading services...</Text>
              </View>
            ) : equipmentServices.length === 0 && equipmentParts.length === 0 ? (
              <View style={{ paddingVertical: scale(20), alignItems: 'center' }}>
                <Icon name="alert-circle-outline" size={scale(32)} color={C.muted} />
                <Text style={{ color: C.muted, marginTop: scale(8), textAlign: 'center' }}>
                  No services or parts available for this equipment category.
                </Text>
              </View>
            ) : (
              <>
                {/* Services List */}
                {equipmentServices.length > 0 && (
                  <View style={{ marginBottom: scale(16) }}>
                    <Text style={{ fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginBottom: scale(8) }}>
                      Available Services ({equipmentServices.length})
                    </Text>
                    {equipmentServices.map((service) => {
                      const isInCart = cards.some(c =>
                        c.pid === (selectedEquipment?.id || 'equipment') && c.cart?.[String(service.id)]
                      );
                      return (
                        <TouchableOpacity
                          key={service.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: scale(12),
                            paddingHorizontal: scale(12),
                            backgroundColor: isInCart ? '#FEF2F2' : C.bg,
                            borderRadius: scale(10),
                            marginBottom: scale(8),
                            borderWidth: 1,
                            borderColor: isInCart ? C.primary : C.border,
                          }}
                          onPress={() => addEquipmentServiceToCart(service)}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: C.ink }}>{service.name || service.title}</Text>
                            {service.description && (
                              <Text style={{ fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) }} numberOfLines={2}>
                                {service.description}
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: scale(12) }}>
                            <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: C.primary }}>
                              {Rs(service.price || 0)}
                            </Text>
                            {isInCart ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(4) }}>
                                <Icon name="checkmark-circle" size={scale(14)} color={C.ok} />
                                <Text style={{ fontSize: moderateScale(11), color: C.ok, marginLeft: scale(4) }}>Added</Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(4) }}>
                                <Icon name="add-circle-outline" size={scale(14)} color={C.primary} />
                                <Text style={{ fontSize: moderateScale(11), color: C.primary, marginLeft: scale(4) }}>Add</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* Parts List */}
                {equipmentParts.length > 0 && (
                  <View>
                    <Text style={{ fontSize: moderateScale(13), fontWeight: '700', color: C.ink, marginBottom: scale(8) }}>
                      Available Parts ({equipmentParts.length})
                    </Text>
                    {equipmentParts.map((part) => {
                      const isInCart = cards.some(c =>
                        c.pid === (selectedEquipment?.id || 'equipment') && c.cart?.[`part:${part.id}`]
                      );
                      return (
                        <TouchableOpacity
                          key={part.id}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            paddingVertical: scale(12),
                            paddingHorizontal: scale(12),
                            backgroundColor: isInCart ? '#FFF7ED' : C.bg,
                            borderRadius: scale(10),
                            marginBottom: scale(8),
                            borderWidth: 1,
                            borderColor: isInCart ? '#EA580C' : C.border,
                          }}
                          onPress={() => addEquipmentPartToCart(part)}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                            <View style={{ width: scale(8), height: scale(8), borderRadius: scale(4), backgroundColor: '#EA580C', marginRight: scale(8) }} />
                            <View style={{ flex: 1 }}>
                              <Text style={{ fontSize: moderateScale(14), fontWeight: '600', color: C.ink }}>{part.name || part.title}</Text>
                              {part.description && (
                                <Text style={{ fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) }} numberOfLines={2}>
                                  {part.description}
                                </Text>
                              )}
                            </View>
                          </View>
                          <View style={{ alignItems: 'flex-end', marginLeft: scale(12) }}>
                            <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: '#EA580C' }}>
                              {Rs(part.price || 0)}
                            </Text>
                            {isInCart ? (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(4) }}>
                                <Icon name="checkmark-circle" size={scale(14)} color={C.ok} />
                                <Text style={{ fontSize: moderateScale(11), color: C.ok, marginLeft: scale(4) }}>Added</Text>
                              </View>
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(4) }}>
                                <Icon name="add-circle-outline" size={scale(14)} color={'#EA580C'} />
                                <Text style={{ fontSize: moderateScale(11), color: '#EA580C', marginLeft: scale(4) }}>Add</Text>
                              </View>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Payment summary */}
        <View style={[st.card, { marginHorizontal: scale(16) }]}>
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
        <View style={[st.card, { marginHorizontal: scale(16) }]}>
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

        {/* Problem Description */}
        <View style={[st.card, { marginHorizontal: scale(16) }]}>
          <Text style={st.cardTitle}>Describe the Problem</Text>
          <Text style={{ fontSize: moderateScale(13), color: C.muted, marginBottom: scale(10) }}>
            Tell us what's wrong with your equipment
          </Text>
          <TextInput
            value={problemDescription}
            onChangeText={setProblemDescription}
            placeholder="E.g., Not heating, strange noise, leaking water, display not working..."
            style={{
              backgroundColor: '#F9FAFB',
              borderWidth: 1,
              borderColor: '#E5E7EB',
              borderRadius: scale(10),
              padding: scale(12),
              fontSize: moderateScale(15),
              color: C.text,
              minHeight: scale(80),
              textAlignVertical: 'top',
            }}
            multiline
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* Address row */}
        <View style={[st.addrCard, { marginHorizontal: scale(16) }]}>
          <View style={{ flexDirection:'row', alignItems:'center', flex:1 }}>
            <Icon name="home-outline" size={scale(18)} color={C.ink} />
            <Text style={st.addrTxt}>
              <Text style={{ fontWeight:'800' }}>{` ${address.label} — `}</Text>
              {address.line1 || 'Add address'}
              {selectedDate && `  •  ${selectedDate.toDateString()}`}
            </Text>
          </View>
          <TouchableOpacity onPress={() => { setAddrLabel(address.label); setAddrLine1(address.line1); setAddrModal(true); }} style={st.addrEdit}>
            <Icon name="create-outline" size={scale(16)} color={C.ink} />
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
          <Icon name="calendar-outline" size={scale(18)} color="#fff" />
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
                <View style={{marginBottom:scale(8)}}>
                  {savedAddresses.map((a, idx)=>(
                    <TouchableOpacity key={`saved-${idx}`} onPress={()=>selectSavedAddress(a)} style={st.savedAddrRow}>
                      <Icon name="location-outline" size={scale(16)} color={C.ink}/>
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
              style={[st.input,{height:scale(80),textAlignVertical:'top',paddingTop:scale(12)}]}
              multiline placeholderTextColor="#9CA3AF"
            />

            <View style={{ flexDirection:'row', justifyContent:'flex-end', marginTop: scale(10) }}>
              <TouchableOpacity onPress={()=>setAddrModal(false)} style={[st.btn,{backgroundColor:'#F1F5F9'}]}>
                <Text style={[st.btnTxt,{color:C.ink}]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveAddress} style={[st.btn,{backgroundColor:C.primary,marginLeft:scale(8)}]}>
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
              <TouchableOpacity onPress={()=>setDateModal(false)} style={st.closePill}><Icon name="close" size={scale(18)} color={C.ink} /></TouchableOpacity>
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
              <View style={{ flexDirection:'row', alignItems:'center', gap:scale(8) }}>
                <TouchableOpacity onPress={fetchRestaurants} style={st.refreshPill}>
                  <Icon name="refresh" size={scale(16)} color={C.ink} />
                </TouchableOpacity>
                <TouchableOpacity onPress={()=>setRestModal(false)} style={st.closePill}>
                  <Icon name="close" size={scale(18)} color={C.ink} />
                </TouchableOpacity>
              </View>
            </View>

            {loadingR ? (
              <View style={{ paddingVertical: scale(20), alignItems:'center' }}>
                <ActivityIndicator color={C.primary} />
              </View>
            ) : restaurants.length === 0 ? (
              <View style={{ paddingVertical: scale(20), alignItems:'center', paddingHorizontal: scale(12) }}>
                <Text style={[st.subtle, { textAlign: 'center' }]}>
                  {restError || 'No restaurants found for your account.'}
                </Text>
              </View>
            ) : (
              <ScrollView style={{ marginTop: scale(8), maxHeight: scale(420) }}>
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
                        <Icon name={r.approved?'shield-checkmark':'information'} size={scale(14)} color={r.approved?C.ok:C.danger}/>
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
                  <View style={{ alignItems: 'center', marginVertical: scale(16) }}>
                    {paymentSettings?.qrCodeImageUrl ? (
                      <Image
                        source={{ uri: paymentSettings.qrCodeImageUrl.startsWith('http')
                          ? paymentSettings.qrCodeImageUrl
                          : `${api.defaults.baseURL?.replace('/api', '')}${paymentSettings.qrCodeImageUrl}` }}
                        style={{
                          width: Dimensions.get('window').width * 0.5,
                          height: Dimensions.get('window').width * 0.5,
                          borderRadius: scale(10),
                          backgroundColor: '#fff',
                        }}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={{
                        width: Dimensions.get('window').width * 0.5,
                        height: Dimensions.get('window').width * 0.5,
                        borderRadius: scale(10),
                        backgroundColor: '#F5F7FA',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <Icon name="qr-code-outline" size={scale(48)} color={C.muted} />
                        <Text style={{ marginTop: scale(8), color: C.muted, fontSize: moderateScale(12) }}>
                          QR not configured
                        </Text>
                      </View>
                    )}
                    <Text style={{ marginTop: scale(6), color: C.ink, fontWeight: '800' }}>
                      Amount: ₹ {payable.toFixed(2)}
                    </Text>
                    {paymentSettings?.accountHolderName && (
                      <Text style={{ marginTop: scale(4), color: C.muted }}>
                        Pay to: {paymentSettings.accountHolderName}
                      </Text>
                    )}
                    <Text style={{ marginTop: scale(12), color: C.muted, textAlign: 'center' }}>
                      Scan the QR code using your preferred UPI app
                    </Text>
                  </View>

                  {/* Copyable UPI ID */}
                  <View style={{ marginVertical: scale(16) }}>
                    {paymentSettings ? (
                      <>
                        <Text style={[st.inputLbl, { marginBottom: scale(8) }]}>
                          Or send payment to UPI ID:
                        </Text>
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            backgroundColor: '#F8FAFC',
                            borderWidth: 1,
                            borderColor: '#E5E7EB',
                            borderRadius: scale(10),
                            padding: scale(12),
                            marginBottom: scale(8),
                          }}
                        >
                          <Text style={{ flex: 1, color: C.ink, fontWeight: '600', fontSize: moderateScale(16) }}>
                            {paymentSettings.upiId}
                          </Text>
                          <TouchableOpacity
                            onPress={copyUpiId}
                            style={{
                              paddingHorizontal: scale(12),
                              paddingVertical: scale(6),
                              backgroundColor: C.primary,
                              borderRadius: scale(6),
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '600', fontSize: moderateScale(14) }}>
                              Copy
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <Text style={{ fontSize: moderateScale(12), color: C.muted, marginBottom: scale(4) }}>
                          Account: {paymentSettings.accountHolderName}
                        </Text>
                        <Text style={{ fontSize: moderateScale(12), color: C.muted, textAlign: 'center' }}>
                          Tap "Copy" and paste in your UPI app to pay ₹{payable.toFixed(2)}
                        </Text>
                      </>
                    ) : (
                      <Text style={{ fontSize: moderateScale(12), color: C.warn, textAlign: 'center' }}>
                        Payment settings not configured. Please contact admin.
                      </Text>
                    )}
                  </View>

                  {/* Screenshot warning */}
                  <View
                    style={{
                      backgroundColor: '#FFF7ED',
                      borderWidth: 1,
                      borderColor: '#FDBA74',
                      borderRadius: scale(10),
                      padding: scale(12),
                      marginVertical: scale(8),
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: scale(4) }}>
                      <Icon name="warning-outline" size={scale(16)} color="#EA580C" />
                      <Text
                        style={{
                          marginLeft: scale(6),
                          color: '#EA580C',
                          fontWeight: '700',
                          fontSize: moderateScale(14),
                        }}
                      >
                        Payment Screenshot Required
                      </Text>
                    </View>
                    <Text style={{ fontSize: moderateScale(12), color: '#EA580C', lineHeight: moderateScale(16) }}>
                      You must upload a screenshot of your payment confirmation for the request
                      to be processed.
                    </Text>
                  </View>

                  {/* Screenshot upload */}
                  <Text style={[st.inputLbl, { marginTop: scale(16) }]}>
                    Upload Payment Screenshot (Required)
                  </Text>
                  {paymentScreenshot ? (
                    <View
                      style={{
                        height: scale(120),
                        borderRadius: scale(10),
                        overflow: 'hidden',
                        marginVertical: scale(8),
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
                          top: scale(8),
                          right: scale(8),
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          borderRadius: scale(15),
                          width: scale(30),
                          height: scale(30),
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        onPress={() => setPaymentScreenshot(null)}
                      >
                        <Icon name="close" size={scale(16)} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={{
                        height: scale(120),
                        borderWidth: 2,
                        borderColor: '#E5E7EB',
                        borderStyle: 'dashed',
                        borderRadius: scale(10),
                        backgroundColor: '#F9FAFB',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginVertical: scale(8),
                      }}
                      onPress={pickScreenshot}
                    >
                      <Icon name="cloud-upload-outline" size={scale(32)} color={C.muted} />
                      <Text style={{ marginTop: scale(8), color: C.muted, fontWeight: '600' }}>
                        Tap to Upload Screenshot
                      </Text>
                      <Text style={{ fontSize: moderateScale(12), color: C.muted, marginTop: scale(4) }}>
                        PNG, JPG up to 5MB
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Notes */}
                  <Text style={[st.inputLbl, { marginTop: scale(16) }]}>
                    Additional Notes (Optional)
                  </Text>
                  <TextInput
                    value={paymentNote}
                    onChangeText={setPaymentNote}
                    placeholder="Any additional information about your payment..."
                    style={[
                      st.input,
                      {
                        height: scale(80),
                        textAlignVertical: 'top',
                        paddingTop: scale(12),
                        borderWidth: 1,
                        borderColor: '#E5E7EB',
                        borderRadius: scale(10),
                        backgroundColor: '#F9FAFB',
                        fontSize: moderateScale(15),
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
                    marginTop: scale(8),
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPaymentModal(false)}
                    style={{
                      backgroundColor: '#F1F5F9',
                      flex: 1,
                      marginRight: scale(8),
                      borderRadius: scale(10),
                      paddingVertical: scale(14),
                    }}
                  >
                    <Text
                      style={{
                        color: C.ink,
                        textAlign: 'center',
                        fontSize: moderateScale(16),
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
                        marginLeft: scale(8),
                        borderRadius: scale(10),
                        paddingVertical: scale(14),
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
                          fontSize: moderateScale(16),
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
                <Icon name="copy" size={scale(28)} color="#fff"/>
              </View>
              <Text style={st.upiCopiedTitle}>UPI ID Copied</Text>
            </View>
            
            <View style={st.upiIdBox}>
              <Text style={st.upiIdText}>{paymentSettings?.upiId || 'Not configured'}</Text>
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
            <View style={st.successIconWrap}><Icon name="checkmark" size={scale(36)} color="#fff"/></View>
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
      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

/* ---------- STYLES ---------- */
const st = StyleSheet.create({
  header:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:scale(8), paddingTop:scale(6), paddingBottom:scale(8), backgroundColor:C.bg },
  hBtn:{ width:scale(40), height:scale(40), alignItems:'center', justifyContent:'center' },
  hTitle:{ color:C.ink, fontWeight:'800', fontSize:moderateScale(22) },

  card:{ backgroundColor:C.card, borderRadius:scale(16), borderWidth:1, borderColor:'#EEF2F7', padding:scale(12), marginBottom:scale(12) },
  cardTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(18), marginBottom:scale(6) },

  cardProd:{ borderRadius:scale(16), overflow:'hidden', backgroundColor:C.card, borderWidth:1, borderColor:'#EEF2F7', marginBottom:scale(14) },
  hero:{ height:scale(120), width:'100%' },
  badgeRow:{ position:'absolute', left:scale(12), right:scale(12), top:scale(10), flexDirection:'row', justifyContent:'space-between' },
  badge:{ flexDirection:'row', alignItems:'center', paddingHorizontal:scale(10), paddingVertical:scale(6), borderRadius:scale(999) },
  badgeTxt:{ marginLeft:scale(6), fontWeight:'800', color:C.ink },
  badgeSelectedOn:{ backgroundColor:C.primary },
  badgeSelectedOff:{ backgroundColor:'#FFFFFF', borderWidth:1, borderColor:'#E5E7EB' },

  prodTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(20), marginTop:scale(6) },
  prodSub:{ color:C.muted, marginTop:scale(2) },

  serviceRow:{ flexDirection:'row', alignItems:'center', borderColor:'#E6E9F0', borderWidth:1, paddingVertical:scale(10), paddingHorizontal:scale(12), borderRadius:scale(12), backgroundColor:'#fff', marginBottom:scale(8) },
  serviceRowActive:{ backgroundColor:'#FFF7F7' },
  check:{ width:scale(18), height:scale(18), borderRadius:scale(6), borderWidth:1, borderColor:'#CBD5E1', alignItems:'center', justifyContent:'center', marginRight:scale(8), backgroundColor:'#fff' },
  checkActive:{ backgroundColor:C.primary, borderColor:C.primary },

  serviceTxt:{ color:C.ink, fontWeight:'800', flexShrink: 1 },
  qtyBadge:{ marginLeft:scale(8), color:C.muted, fontWeight:'800' },
  serviceAmt:{ color:C.ink, fontWeight:'900' },

  totalLine:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:scale(10) },
  equipLbl:{ color:C.muted }, equipVal:{ color:C.ink, fontWeight:'900' },

  row:{ flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingVertical:scale(6) },
  rowLbl:{ color:C.ink, fontWeight:'600' }, rowVal:{ color:C.ink, fontWeight:'700' },
  hr:{ height:1, backgroundColor:'#E5E7EB', marginVertical:scale(8) },

  payableLbl:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(16) },
  payableVal:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(16) },

  tipRow:{ flexDirection:'row', alignItems:'center', gap:scale(10), marginTop:scale(6) },
  tipBtnBase:{ paddingVertical:scale(10), paddingHorizontal:scale(16), borderRadius:scale(999), position:'relative' },
  tipBtn:{ borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff' },
  tipBtnActive:{ backgroundColor:'#F6FEF8', borderColor:'#CFF7DC' },
  tipTxt:{ color:C.ink, fontWeight:'800' }, tipTxtActive:{ color:C.ok },
  tipPopularFlat:{ backgroundColor:'#F6FEF8', borderWidth:1, borderColor:'#CFF7DC' },
  tipPopularActive:{ backgroundColor:'#EFFFF5', borderColor:'#B7F0CE' },
  tipPopularTxt:{ color:C.ok },
  tipNote:{ color:C.muted, marginTop:scale(8) },

  addrCard:{ flexDirection:'row', alignItems:'center', padding:scale(12), borderRadius:scale(16), backgroundColor:C.card, borderWidth:1, borderColor:'#EEF2F7' },
  addrTxt:{ color:C.ink, marginLeft:scale(8), flex:1 },
  addrEdit:{ padding:scale(8), borderRadius:scale(8), backgroundColor:'#F1F5F9' },

  bottomBar:{ position:'absolute', left:0, right:0, bottom:0, backgroundColor:'#fff', flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:scale(16), paddingTop:scale(12), borderTopWidth:1, borderColor:'#E5E7EB' },
  bottomLeft:{ color:C.ink, fontWeight:'900' },
  selectBtn:{ backgroundColor:C.primary, borderRadius:scale(12), paddingVertical:scale(12), paddingHorizontal:scale(16), flexDirection:'row', alignItems:'center' },
  selectTxt:{ color:'#fff', fontWeight:'900', marginLeft:scale(8) },

  modalBackdrop:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', justifyContent:'flex-end' },
  modalBackdropCenter:{ flex:1, backgroundColor:'rgba(0,0,0,0.35)', alignItems:'center', justifyContent:'center', padding:scale(20) },

  sheet:{ backgroundColor:'#fff', borderTopLeftRadius:scale(18), borderTopRightRadius:scale(18), padding:scale(16), ...Platform.select({ ios:{ shadowColor:'#000', shadowOpacity:0.2, shadowRadius:scale(10) }, android:{ elevation:12 } }) },
  sheetLarge:{ backgroundColor:'#fff', borderTopLeftRadius:scale(18), borderTopRightRadius:scale(18), padding:scale(16), maxHeight:'80%', ...Platform.select({ ios:{ shadowColor:'#000', shadowOpacity:0.2, shadowRadius:scale(10) }, android:{ elevation:12 } }) },
  sheetTitle:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(20), marginBottom:scale(4) },
  closePill:{ width:scale(34), height:scale(34), borderRadius:scale(12), backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center' },
  refreshPill:{ width:scale(34), height:scale(34), borderRadius:scale(12), backgroundColor:'#F1F5F9', alignItems:'center', justifyContent:'center', marginRight:scale(8) },

  inputLbl:{ color:C.muted, marginTop:scale(8), marginBottom:scale(4) },
  input:{ borderWidth:1, borderColor:'#E5E7EB', borderRadius:scale(12), paddingHorizontal:scale(12), height:scale(46), color:C.ink, backgroundColor:'#fff' },
  btn:{ paddingHorizontal:scale(14), paddingVertical:scale(10), borderRadius:scale(12) }, btnTxt:{ fontWeight:'900' },

  savedAddrRow:{ flexDirection:'row', alignItems:'center', paddingVertical:scale(8), paddingHorizontal:scale(10), borderRadius:scale(12), borderWidth:1, borderColor:'#E5E7EB', backgroundColor:'#fff', marginBottom:scale(8) },
  savedAddrTxt:{ color:C.ink, marginLeft:scale(8), flex:1 },

  daysRow:{ flexDirection:'row', justifyContent:'space-between', marginTop:scale(8), marginBottom:scale(8), paddingHorizontal:scale(6) },
  dayLbl:{ width:scale(34), textAlign:'center', color:C.muted, fontWeight:'700' },
  grid:{ flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between' },
  cell:{ width:scale(46), height:scale(46), borderRadius:scale(12), backgroundColor:'#F8FAFC', alignItems:'center', justifyContent:'center', marginBottom:scale(12), borderWidth:1, borderColor:'#E5E7EB' },
  cellActive:{ backgroundColor:'#EF3A3A11', borderColor:C.primary },
  cellTxt:{ color:C.ink, fontWeight:'800' },
  cellTxtActive:{ color:C.primary },

  continueBtn:{ marginTop:scale(6), backgroundColor:C.primary, borderRadius:scale(16), alignItems:'center', paddingVertical:scale(14) },
  continueTxt:{ color:'#fff', fontWeight:'900' },

  restCard:{ borderWidth:1, borderColor:'#EEF2F7', padding:scale(14), borderRadius:scale(16), backgroundColor:'#fff', marginBottom:scale(12) },
  restName:{ color:C.ink, fontWeight:'900', fontSize:moderateScale(18) },
  restAddr:{ color:C.muted, marginTop:scale(2) },
  restFssai:{ color:C.muted, marginTop:scale(2) },
  badgeSmall:{ flexDirection:'row', alignItems:'center', alignSelf:'flex-start', paddingHorizontal:scale(10), paddingVertical:scale(6), borderRadius:scale(999), marginTop:scale(10) },
  badgeSmallTxt:{ marginLeft:scale(6), fontWeight:'800' },

  successCard:{ width:'100%', maxWidth:scale(520), backgroundColor:'#fff', borderRadius:scale(22), paddingVertical:scale(22), paddingHorizontal:scale(18) },
  successIconWrap:{ alignSelf:'center', width:scale(86), height:scale(86), borderRadius:scale(18), backgroundColor:'#22C55E', alignItems:'center', justifyContent:'center', marginBottom:scale(10) },
  successTitle:{ textAlign:'center', color:C.ink, fontSize:moderateScale(22), fontWeight:'900', marginBottom:scale(8) },
  successMsg:{ textAlign:'center', color:C.text, lineHeight:moderateScale(22), marginHorizontal:scale(6) },
  successBtn:{ alignSelf:'center', marginTop:scale(18), backgroundColor:C.primary, paddingVertical:scale(12), paddingHorizontal:scale(28), borderRadius:scale(16) },
  successBtnTxt:{ color:'#fff', fontWeight:'900', fontSize:moderateScale(16) },

  subtle: { color: '#9CA3AF' },
  counterBtnSm:{ width:scale(28), height:scale(28), borderRadius:scale(8), backgroundColor:'#FFF2F2', alignItems:'center', justifyContent:'center', borderWidth:1, borderColor:'#FEE2E2' },

  upiCopiedCard: {
    width: '90%',
    maxWidth: scale(400),
    backgroundColor: '#fff',
    borderRadius: scale(20),
    padding: scale(24),
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: scale(4),
    },
    shadowOpacity: 0.25,
    shadowRadius: scale(12),
    elevation: 8,
  },
  upiCopiedHeader: {
    alignItems: 'center',
    marginBottom: scale(20),
  },
  upiCopiedIconWrap: {
    width: scale(60),
    height: scale(60),
    borderRadius: scale(30),
    backgroundColor: '#10B981',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(12),
  },
  upiCopiedTitle: {
    fontSize: moderateScale(22),
    fontWeight: '800',
    color: C.ink,
    textAlign: 'center',
  },
  upiIdBox: {
    backgroundColor: '#F8FAFC',
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
    width: '100%',
  },
  upiIdText: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  upiCopiedSubtitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: '#10B981',
    textAlign: 'center',
    marginBottom: scale(8),
  },
  upiCopiedInstruction: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    marginBottom: scale(12),
    lineHeight: moderateScale(20),
  },
  amountBox: {
    backgroundColor: '#FFFBEB',
    borderWidth: 2,
    borderColor: '#F59E0B',
    borderRadius: scale(12),
    paddingVertical: scale(12),
    paddingHorizontal: scale(24),
    marginBottom: scale(24),
  },
  amountText: {
    fontSize: moderateScale(20),
    fontWeight: '800',
    color: '#D97706',
    textAlign: 'center',
  },
  upiCopiedBtn: {
    backgroundColor: C.primary,
    paddingVertical: scale(14),
    paddingHorizontal: scale(32),
    borderRadius: scale(12),
    width: '100%',
    alignItems: 'center',
  },
  upiCopiedBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: moderateScale(16),
  },
});