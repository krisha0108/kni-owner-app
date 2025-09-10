// screens/RequestNow.js
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, ScrollView,
  ActivityIndicator, ImageBackground, Modal, TextInput, Platform, Dimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from '../api/client';

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

/* ---------- DATE HELPERS ---------- */
const startOfDay = (d)=>{ const x=new Date(d); x.setHours(0,0,0,0); return x; };
const addDays = (d,n)=>{ const x=new Date(d); x.setDate(x.getDate()+n); return x; };

const SCREEN_W = Dimensions.get('window').width;

export default function RequestNow({ navigation, route }) {
  const insets = useSafeAreaInsets();

  /* ---------- INCOMING ---------- */
  const passedServices = Array.isArray(route?.params?.services) ? route.params.services : [];
  const passedCartRaw  = route?.params?.cart || {}; // { [service_id]: qty }
  const productId      = String(route?.params?.productId ?? route?.params?.id ?? 'global');
  const productTitle   = route?.params?.productTitle || 'Commercial Fridge';
  const category       = route?.params?.category || 'Commercial';
  const subtitle       = route?.params?.description || '';
  const heroImage      = route?.params?.heroImage || 'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp';

  /* ---------- OWNER / PERSIST KEYS (mirror RequestDetail) ---------- */
  const [ownerKey, setOwnerKey] = useState('global');
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
  const pmetaKeyOf = useCallback(
    (pid) => `pmeta:${ownerKey}:${pid || 'global'}`,
    [ownerKey]
  );

  // We store all cards’ data here
  const [cards, setCards] = useState([]); // [{pid, meta, services, cart}]
  const [loadingInit, setLoadingInit] = useState(true);

  // persist current product meta+services so it’s available when user opens another product later
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
      } catch {}
    })();
  }, [productId, productTitle, category, subtitle, heroImage, passedServices, pmetaKeyOf, rservicesKeyOf]);

  // Load all rdrafts (all products with something in the cart)
  useEffect(() => {
    (async () => {
      try {
        setLoadingInit(true);

        // 1) Start with current product’s cart
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
        // keep it in storage sync
        await AsyncStorage.setItem(rdraftKeyOf(productId), JSON.stringify(initialCart||{})).catch(()=>{});

        // 2) Find every other rdraft:<ownerKey>:<pid>
        const allKeys = await AsyncStorage.getAllKeys();
        const myPrefix = `rdraft:${ownerKey}:`;
        const otherKeys = allKeys.filter(k => k.startsWith(myPrefix));

        const products = new Map();

        // Load carts for each pid
        for (const key of otherKeys) {
          const pid = key.slice(myPrefix.length);
          const raw = await AsyncStorage.getItem(key);
          const cartObj = raw ? JSON.parse(raw) : {};
          const filtered = Object.fromEntries(Object.entries(cartObj || {}).filter(([_, q]) => Number(q) > 0));
          if (Object.keys(filtered).length) {
            products.set(pid, { pid, cart: filtered });
          }
        }

        // Ensure current product is present (even if others exist)
        products.set(productId, { pid: productId, cart: initialCart });

        // Hydrate meta + services for each
        const hydrated = [];
        for (const { pid, cart } of products.values()) {
          let meta = null;
          try { meta = JSON.parse(await AsyncStorage.getItem(pmetaKeyOf(pid)) || 'null'); } catch {}
          if (!meta) {
            // fallback with minimal information
            meta = { productId: pid, productTitle: `Equipment #${pid}`, category: '—', subtitle: '', heroImage: heroImage };
          }

          let svcs = [];
          if (pid === productId && passedServices?.length) {
            svcs = passedServices;
          } else {
            try { svcs = JSON.parse(await AsyncStorage.getItem(rservicesKeyOf(pid)) || '[]'); } catch {}
          }

          hydrated.push({ pid, meta, services: Array.isArray(svcs)?svcs:[], cart });
        }

        // Sort so current product appears first, then others stable
        hydrated.sort((a,b)=> (a.pid===productId?-1: b.pid===productId?1: (String(a.meta.productTitle||'').localeCompare(String(b.meta.productTitle||'')))));

        setCards(hydrated);
      } finally {
        setLoadingInit(false);
      }
    })();
  }, [ownerKey, productId, passedCartRaw, passedServices, rdraftKeyOf, pmetaKeyOf, rservicesKeyOf, heroImage]);

  // Keep rdraft in sync when carts change
  const updateCartFor = useCallback(async (pid, updater) => {
    setCards(prev => {
      const next = prev.map(card => {
        if (card.pid !== pid) return card;
        const newCart = updater(card.cart || {});
        // persist outside setState
        AsyncStorage.setItem(rdraftKeyOf(pid), JSON.stringify(newCart || {})).catch(()=>{});
        return { ...card, cart: newCart };
      });
      return next;
    });
  }, [rdraftKeyOf]);

  /* ---------- PER-CARD computed rows ---------- */
  const makeItems = useCallback((services, cartObj) => {
    const byId = {};
    (services||[]).forEach(s => { byId[Number(s.id)] = { name: s.title || s.name, unit: Number(s.price||0) }; });
    return Object.entries(cartObj||{}).map(([sidStr, qty]) => {
      const sid  = Number(sidStr);
      const meta = byId[sid] || { name: `Service #${sid}`, unit: 0 };
      const q    = Number(qty||0);
      return { service_id: sid, name: meta.name, unitPrice: meta.unit, qty: q, lineTotal: meta.unit*q };
    }).filter(x => x.qty>0);
  }, []);

  // Flatten items across all cards
  const flatItems = useMemo(() => {
    return cards.flatMap(card => makeItems(card.services, card.cart).map(it => ({
      ...it, __pid: card.pid
    })));
  }, [cards, makeItems]);

  /* ---------- SELECTION (auto-follows items) ---------- */
  const [selectedMap, setSelectedMap] = useState({});
  const allKeys = useMemo(() => flatItems.map(it => `${it.__pid}:${it.service_id}`), [flatItems]);

  useEffect(() => {
    const allSel = {};
    allKeys.forEach(k => { allSel[k] = true; });
    setSelectedMap(allSel);
  }, [allKeys.length]);

  const toggleOne = useCallback((pid, sid) => {
    const key = `${pid}:${sid}`;
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
    () => flatItems.filter(it => !!selectedMap[`${it.__pid}:${it.service_id}`]),
    [flatItems, selectedMap]
  );

  /* ---------- TOTALS (selected only) ---------- */
  const itemTotalSelected = useMemo(()=>selectedItems.reduce((s,it)=>s+it.lineTotal,0),[selectedItems]);
  const taxesAndFee = itemTotalSelected > 0 ? FIXED_FEE : 0;
  const baseTotal   = itemTotalSelected + taxesAndFee;
  const gstAmount   = Math.round(baseTotal * GST_RATE);
  const [tip, setTip] = useState(0);
  const payable = useMemo(() => baseTotal + gstAmount + tip, [baseTotal, gstAmount, tip]);

  // TIP persistence (global per owner)
  const tipKey = useMemo(()=>`tip:${ownerKey}`,[ownerKey]);
  useEffect(() => { (async () => {
    try { const raw = await AsyncStorage.getItem(tipKey); if (raw!=null) setTip(Number(raw)||0); } catch {}
  })(); }, [tipKey]);
  const toggleTip = useCallback(async (val) => {
    const next = tip===val ? 0 : val; setTip(next);
    AsyncStorage.setItem(tipKey, String(next)).catch(()=>{});
  }, [tip, tipKey]);

  /* ---------- ADDRESS ---------- */
  const K = useMemo(() => ({
    addr: `addr:${ownerKey}`,
    addrList: `addresses:${ownerKey}`,
    date: `service_date:${ownerKey}`,
    restaurant: `restaurant:${ownerKey}`,
  }), [ownerKey]);

  const [address, setAddress] = useState({ label:'Home', line1:'Jdbhs, Maruti Titanium, Sard…' });
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [addrModal, setAddrModal] = useState(false);
  const [addrLabel, setAddrLabel] = useState(address.label);
  const [addrLine1, setAddrLine1] = useState(address.line1);

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

  /* ---------- DATE SHEET ---------- */
  const [dateModal, setDateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const today = useMemo(() => startOfDay(new Date()), []);
  const next30 = useMemo(() => Array.from({ length: 30 }).map((_, i) => startOfDay(addDays(today, i))), [today]);

  const paddedDates = useMemo(() => {
    const headPad = next30[0].getDay(); // 0=Sun..6=Sat
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

  /* ---------- RESTAURANT PICKER (OWNER-ONLY) ---------- */
  const [restModal, setRestModal] = useState(false);
  const [restSel, setRestSel] = useState(null);
  const [loadingR, setLoadingR] = useState(false);
  const [restaurants, setRestaurants] = useState([]);
  const [restError, setRestError] = useState('');

  const fetchRestaurants = useCallback(async () => {
    setLoadingR(true);
    setRestError('');
    setRestaurants([]);
    try {
      // Get owner id similar to previous impl
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

  /* ---------- Save equipment request ---------- */
  const [savingReq, setSavingReq] = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  const buildEquipmentRequestPayload = (pickedRestaurant) => {
    const firstLine = selectedItems[0] || {};
    const tags = selectedItems.map(it => `${it.name} x${it.qty}`);
    // Use the currently visible card as product context, else fallback
    const defaultMeta = cards[0]?.meta || {};
    return {
      product_id: Number(defaultMeta.productId || firstLine.service_id || 0),
      product_name: defaultMeta.productTitle || firstLine.name || 'Service Request',
      description: `Requested for ${selectedDate ? selectedDate.toDateString() : '—'}`,
      image: defaultMeta.heroImage || '',
      tags,
      restaurant_id: Number(pickedRestaurant?.id || 0),
      restaurant_name: pickedRestaurant?.name || '',
      status: 'Pending',
      assigned_to: '',
    };
  };

  const confirmRestaurant = useCallback(async () => {
    if (!restSel) return;
    const picked = restaurants.find(r => r.id === restSel);
    try {
      setSavingReq(true);
      await AsyncStorage.setItem(K.restaurant, JSON.stringify(picked || {})).catch(()=>{});
      const payload = buildEquipmentRequestPayload(picked);
      await api.post('/app/equipment-requests', payload);
      setRestModal(false);
      setSuccessModal(true);
    } catch (e) {
      console.log('Create equipment request failed:', e?.response?.data || e?.message);
    } finally {
      setSavingReq(false);
    }
  }, [restSel, restaurants, K.restaurant, selectedItems, selectedDate, cards]);

  /* ---------- Row/Controls bound to a specific card ---------- */
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

  const ProductCard = ({ card }) => {
    const { pid, meta, services, cart } = card;
    const items = useMemo(()=>makeItems(services, cart),[services, cart]);

    const isAllSelectedInCard = items.every(it => !!selectedMap[`${pid}:${it.service_id}`]);

    const ServiceRow = ({ item }) => {
      const key = `${pid}:${item.service_id}`;
      const isSel = !!selectedMap[key];
      const q = item.qty || 0;
      return (
        <View style={[st.serviceRow, isSel ? st.serviceRowActive : null]}>
          <TouchableOpacity onPress={() => toggleOne(pid, item.service_id)} style={[st.check, isSel && st.checkActive]}>
            {isSel ? <Icon name="checkmark" size={12} color="#fff" /> : null}
          </TouchableOpacity>

          <Text style={[st.serviceTxt, !isSel && { color: C.muted }]} numberOfLines={1}>{item.name}</Text>

          <View style={{ flex: 1 }} />

          {q > 0 ? (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => decQty(pid, item.service_id)} style={[st.counterBtnSm, { marginRight: 4 }]}>
                <Icon name="remove" size={18} color={C.primary} />
              </TouchableOpacity>
              <Text style={[st.qtyBadge, !isSel && { color: '#94A3B8' }]}>{`×${q}`}</Text>
              <TouchableOpacity onPress={() => incQty(pid, item.service_id)} style={[st.counterBtnSm, { marginLeft: 4 }]}>
                <Icon name="add" size={18} color={C.primary} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => removeLine(pid, item.service_id)} style={[st.counterBtnSm, { marginLeft: 6 }]}>
                <Icon name="trash-outline" size={18} color={C.danger} />
              </TouchableOpacity>
            </View>
          ) : null}

          <Text style={[st.serviceAmt, !isSel && { color: C.muted }]}>{Rs(item.lineTotal)}</Text>
        </View>
      );
    };
    const keyRow = (it, idx) => `${pid}-${it.service_id}-${idx}`;

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
                // Toggle all items for THIS card
                if (isAllSelectedInCard) {
                  const updates = {};
                  items.forEach(it => { updates[`${pid}:${it.service_id}`] = false; });
                  setSelectedMap(prev => {
                    const n = { ...(prev||{}) };
                    items.forEach(it => { delete n[`${pid}:${it.service_id}`]; });
                    return n;
                  });
                } else {
                  setSelectedMap(prev => {
                    const n = { ...(prev||{}) };
                    items.forEach(it => { n[`${pid}:${it.service_id}`] = true; });
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
                <Text style={st.subtle}>No services selected.</Text>
              </View>
            ) : (
              <FlatList data={items} keyExtractor={keyRow} renderItem={ServiceRow} scrollEnabled={false} />
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
          <View style={st.row}><Text style={st.rowLbl}>Item total</Text><Text style={st.rowVal}>{Rs(itemTotalSelected)}</Text></View>
          <View style={st.row}><Text style={st.rowLbl}>Taxes and Fee</Text><Text style={st.rowVal}>{Rs(taxesAndFee)}</Text></View>
          <View style={st.hr} />
          <View style={st.row}><Text style={[st.rowLbl,{fontWeight:'700'}]}>Total amount</Text><Text style={[st.rowVal,{fontWeight:'800'}]}>{Rs(baseTotal)}</Text></View>
          <View style={st.row}><Text style={st.rowLbl}>Tax (GST 18%)</Text><Text style={st.rowVal}>{Rs(gstAmount)}</Text></View>
          <View style={st.row}><Text style={st.rowLbl}>Tip</Text><Text style={st.rowVal}>{Rs(tip)}</Text></View>
          <View style={st.hr} />
          <View style={st.row}><Text style={st.payableLbl}>Amount to pay</Text><Text style={st.payableVal}>{Rs(payable)}</Text></View>
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
                  return (
                    <TouchableOpacity
                      key={`${r.id}-${idx}`}
                      onPress={()=>setRestSel(r.id)}
                      style={[st.restCard, active && { borderColor: C.primary }]}
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
              disabled={!restSel || savingReq}
              onPress={confirmRestaurant}
              style={[st.continueBtn, (!restSel || savingReq) && { backgroundColor:'#FBC6C3', opacity: 0.6 }]}
            >
              {savingReq ? <ActivityIndicator color="#fff" /> : <Text style={st.continueTxt}>Confirm</Text>}
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
              We’ll notify you when a service engineer is available on your selected date and will arrive at your restaurant.
            </Text>
            <TouchableOpacity onPress={()=>setSuccessModal(false)} style={st.successBtn}>
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
});
