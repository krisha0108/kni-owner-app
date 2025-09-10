import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, ImageBackground,
  TouchableOpacity, Animated, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import KniBottomNav from '../components/KniBottomNav';
import { api } from '../api/client';

const INDEX_PATH = '/app/products';

/* ---------------- Theme ---------------- */
const COLORS = {
  primary: '#EF3A3A',
  primary2: '#FF6A6A',
  ink: '#1D2254',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  text: '#0F172A',
  muted: '#6B7280',
  border: '#E5E7EB',
};

const H_MARGIN = 16;
const GAP = 12;
const MIN_W = 170;

/* ---------------- Service → Ionicon mapping ---------------- */
const SERVICE_ICONS = {
  installation: { icon: 'construct', label: 'Installation' },
  install:      { icon: 'construct', label: 'Installation' },
  repair:       { icon: 'hammer',    label: 'Repair' },
  fixing:       { icon: 'hammer',    label: 'Repair' },
  maintenance:  { icon: 'settings-outline', label: 'Maintenance' },
  service:      { icon: 'settings-outline', label: 'Maintenance' },
  amc:          { icon: 'settings-outline', label: 'Maintenance' },
  cleaning:     { icon: 'water',     label: 'Cleaning' },
  wash:         { icon: 'water',     label: 'Cleaning' },
  sanitize:     { icon: 'water',     label: 'Cleaning' },
  inspection:   { icon: 'search-outline', label: 'Inspection' },
  uninstallation:{ icon: 'remove-circle-outline', label: 'Uninstallation' },
};

// normalize " Fridge " -> "fridge"
const norm = (s = '') => String(s).trim().toLowerCase();

// Title Case for labels
const toTitle = (s = '') =>
  String(s).toLowerCase().replace(/\b\w/g, c => c.toUpperCase());

/* -------------- Service inference -------------- */
const inferServiceFrom = (p) => {
  const pick = (key) => {
    const k = norm(key);
    if (SERVICE_ICONS[k]) return { key: k, ...SERVICE_ICONS[k] };
    return null;
  };

  // 1) direct fields commonly used
  const directKeys = [p.service, p.service_type, p.type];
  for (const key of directKeys) {
    if (!key) continue;
    const hit = pick(key);
    if (hit) return hit;
  }

  // 2) tags array/string
  let tags = [];
  if (Array.isArray(p.tags)) tags = p.tags;
  else if (typeof p.tags === 'string') {
    try {
      const j = JSON.parse(p.tags);
      if (Array.isArray(j)) tags = j;
    } catch (_) {}
  }
  for (const t of tags) {
    const hit = pick(t);
    if (hit) return hit;
  }

  // 3) fuzzy search in title/desc/category
  const hay = [
    p.title, p.description, p.category, p.subtitle, p.short_desc
  ].filter(Boolean).map(norm).join(' ');
  for (const key of Object.keys(SERVICE_ICONS)) {
    if (hay.includes(key)) {
      return { key, ...SERVICE_ICONS[key] };
    }
  }

  // Fallback: no service found
  return null;
};

/* ---------------- Skeleton (matches real card) ---------------- */
const SkeletonCard = ({ width }) => {
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

  return (
    <View style={[styles.card, { width }]}>
      <Animated.View style={[styles.skelImage, { opacity: pulse }]}>
        <View style={styles.skelBadge} />
        <View style={styles.skelOverlay} />
      </Animated.View>
      <View style={styles.skelBody}>
        <Animated.View style={[styles.skelLineTitle, { opacity: pulse }]} />
        <Animated.View style={[styles.skelLineTitleShort, { opacity: pulse }]} />
        <Animated.View style={[styles.skelLineDesc, { opacity: pulse }]} />
        <Animated.View style={[styles.skelLineDescShort, { opacity: pulse }]} />
        <View style={styles.metaRow}>
          <View style={styles.metaLeft}>
            <View style={styles.skelMetaIcon} />
            <Animated.View style={[styles.skelMetaText, { opacity: pulse }]} />
          </View>
          <View style={styles.metaRight}>
            <View style={styles.skelMetaIconSmall} />
            <Animated.View style={[styles.skelMetaTextSmall, { opacity: pulse }]} />
          </View>
        </View>
        <View style={styles.ctaRow}>
          <View style={styles.skelPill}>
            <View style={styles.skelPillIcon} />
            <Animated.View style={[styles.skelPillText, { opacity: pulse }]} />
          </View>
          <View style={{ width: 20, height: 20 }} />
        </View>
      </View>
    </View>
  );
};

/* ---------------- helpers ---------------- */
function computeGrid(width) {
  const numColumns = Math.max(2, Math.floor((width - H_MARGIN * 2 + GAP) / (MIN_W + GAP)));
  const cardW = (width - H_MARGIN * 2 - GAP * (numColumns - 1)) / numColumns;
  return { numColumns, cardW };
}

/* ---------------- Screen ---------------- */
export default function RequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const [{ numColumns, cardW, listKey }, setGrid] = useState(() => {
    const g = computeGrid(width);
    return { ...g, listKey: `grid-${g.numColumns}` };
  });
  useEffect(() => {
    const g = computeGrid(width);
    setGrid(prev =>
      g.numColumns !== prev.numColumns
        ? { ...g, listKey: `grid-${g.numColumns}` }
        : { ...g, listKey: prev.listKey }
    );
  }, [width]);

  // server state
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState('');
  const [activeServiceKey, setActiveServiceKey] = useState('all');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = async () => {
    const endpoint = INDEX_PATH;
    try {
      setLoading(true);
      console.group('[fetchFeed]');
      console.log('Base URL:', api?.defaults?.baseURL);
      console.log('GET:', endpoint);

      const res = await api.get(endpoint, { timeout: 10000 });
      console.log('Status:', res.status, res.statusText);

      const mapped = (Array.isArray(res.data) ? res.data : []).map((p, ix) => {
        // parse images
        let images = [];
        if (Array.isArray(p.images)) {
          images = p.images;
        } else if (typeof p.images === 'string') {
          try {
            const j = JSON.parse(p.images);
            if (Array.isArray(j)) images = j;
          } catch (e) {
            console.warn(`Item ${ix}: images JSON parse failed`, e?.message, p.images);
          }
        }

        // parse tags (optional)
        let tags = [];
        if (Array.isArray(p.tags)) {
          tags = p.tags;
        } else if (typeof p.tags === 'string') {
          try {
            const j = JSON.parse(p.tags);
            if (Array.isArray(j)) tags = j;
          } catch (e) {/* ignore */}
        }

        const firstImage = images?.[0];
        const service = inferServiceFrom(p);

        return {
          id: String(p.id),
          title: p.title || '',
          catLabel: toTitle(p.category || ''),
          desc: p.description || '',
          image: firstImage,
          rating: p.rating ?? 4.8,
          requests: p.services_count ?? 0,
          tags,
          serviceKey: service?.key || null,
          serviceLabel: service?.label || null,
          serviceIcon: service?.icon || null,
        };
      });

      console.log('Mapped items count:', mapped.length);
      if (mapped.length) {
        console.table(
          mapped.slice(0, 10).map(({ id, title, catLabel, serviceLabel }) => ({
            id, title, category: catLabel, service: serviceLabel || '-'
          }))
        );
      }

      setItems(mapped);
      console.groupEnd();
    } catch (e) {
      console.group('[fetchFeed:ERROR]');
      console.error('Message:', e?.message);
      if (e?.response) console.error('Response data:', e.response.data);
      console.groupEnd();
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchFeed(); }, []);

  /* -------- Build service chips from items (only those present) -------- */
  const SERVICES = useMemo(() => {
    const set = new Map(); // key -> { key, label, icon }
    items.forEach(it => {
      if (it.serviceKey) {
        set.set(it.serviceKey, {
          key: it.serviceKey,
          label: it.serviceLabel,
          icon: it.serviceIcon || 'grid-outline'
        });
      }
    });

    const base = [{ key: 'all', label: 'All', icon: 'grid-outline' }];
    const rest = [...set.values()].sort((a, b) => (a.label || '').localeCompare(b.label || ''));
    return base.concat(rest);
  }, [items]);

  // Guard fallback for active service
  useEffect(() => {
    if (activeServiceKey !== 'all' && !SERVICES.find(s => s.key === activeServiceKey)) {
      setActiveServiceKey('all');
    }
  }, [SERVICES, activeServiceKey]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((it) => {
      const byService =
        activeServiceKey === 'all' ||
        (it.serviceKey ? it.serviceKey === activeServiceKey : false);

      const byQuery = !q
        || (it.title || '').toLowerCase().includes(q)
        || (it.catLabel || '').toLowerCase().includes(q)
        || (it.desc || '').toLowerCase().includes(q)
        || (it.serviceLabel || '').toLowerCase().includes(q);

      return byService && byQuery;
    });
  }, [items, query, activeServiceKey]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchFeed();
    setRefreshing(false);
  };

  const renderServiceChip = ({ item }) => {
    const active = item.key === activeServiceKey;
    return (
      <TouchableOpacity
        onPress={() => setActiveServiceKey(item.key)}
        style={[styles.chip, active && { backgroundColor: '#FFF1F1', borderColor: COLORS.primary }]}
      >
        <Icon name={item.icon || 'grid-outline'} size={16} color={active ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
        <Text style={[styles.chipText, active && { color: COLORS.primary, fontWeight: '700' }]}>
          {item.label}
        </Text>
      </TouchableOpacity>
    );
  };

  /* -------- Sticky Header (Request + Search + Service Chips) -------- */
  const Header = useMemo(() => (
    <View style={styles.stickyHeader}>
      <View style={styles.topbar}>
        <Text style={styles.title}>Request</Text>
        <TouchableOpacity
          style={styles.helpBtn}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          onPress={() => navigation.navigate('SupportCenter')}
        >
          <Icon name="chatbubbles-outline" size={18} color={COLORS.primary} />
          <Text style={styles.helpTxt}>Help</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <Icon name="search" size={18} color={COLORS.muted} />
        <TextInput
          placeholder="Search equipment or service…"
          placeholderTextColor="#94A3B8"
          value={query}
          onChangeText={setQuery}
          style={styles.searchInput}
          returnKeyType="search"
        />
        {/* filter icon kept for future use; no category chips now */}
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="options-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Service chips only */}
      {SERVICES.length > 1 && (
        <FlatList
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
          data={SERVICES}
          keyExtractor={(i) => `svc-${i.key}`}
          renderItem={renderServiceChip}
        />
      )}
    </View>
  ), [query, activeServiceKey, navigation, SERVICES]);

  const listData = loading
    ? Array.from({ length: numColumns * 2 }, (_, i) => ({ __sk: i }))
    : filtered;

  const renderItem = ({ item }) => {
    if (loading) return <SkeletonCard width={cardW} />;
    const leftIcon = item.serviceIcon || 'pricetags-outline';
    const leftLabel = item.serviceLabel || item.catLabel || '—';

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={[styles.card, { width: cardW }]}
        onPress={() =>
  navigation.navigate('RequestDetail', {
    id: item.id,                // <-- important for /app/products/:id
    productId: item.id,         // <-- optional alias if your detail reads productId
    item: {
      title: item.title,
      category: item.catLabel,
      rating: item.rating,
      requests: item.requests,
      desc: item.desc,
    },
  })
}
      >
        <ImageBackground source={{ uri: item.image }} style={styles.cardImage} imageStyle={styles.cardImageR}>
          <View style={styles.badge}>
            <Icon name="star" size={12} color="#fff" />
            <Text style={styles.badgeText}>{item.rating ?? 0}</Text>
          </View>
          <View style={styles.overlay} />
        </ImageBackground>

        <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
          <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaLeft}>
              <Icon name={leftIcon} size={14} color={COLORS.muted} />
              <Text style={styles.metaText}>{leftLabel}</Text>
            </View>
            <View style={styles.metaRight}>
              <Icon name="flash-outline" size={14} color={COLORS.primary} />
              <Text style={[styles.metaText, { color: COLORS.primary }]}>{item.requests ?? 0} req</Text>
            </View>
          </View>

          <View style={styles.ctaRow}>
            <View style={styles.pill}>
              <Icon name="shield-checkmark" size={14} color="#fff" />
              <Text style={styles.pillText}>KNI Verified</Text>
            </View>
            <Icon name="chevron-forward" size={20} color={COLORS.ink} />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      <FlatList
        key={listKey}
        data={listData}
        keyExtractor={(it, idx) => (loading ? `sk-${idx}` : String(it.id))}
        numColumns={numColumns}
        columnWrapperStyle={{ paddingHorizontal: H_MARGIN, columnGap: GAP }}
        contentContainerStyle={{ paddingBottom: insets.bottom + 120 }}
        ListHeaderComponent={Header}
        stickyHeaderIndices={[0]}
        renderItem={renderItem}
        ListEmptyComponent={
          !loading && (
            <View style={[styles.empty, { paddingTop: 32 }]}>
              <Icon name="search-circle-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySub}>Try a different keyword or service.</Text>
            </View>
          )
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[COLORS.primary]}
            tintColor={COLORS.primary}
          />
        }
      />

      <KniBottomNav navigation={navigation} active="h" cartCount={3} notifCount={2} />
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  stickyHeader: { backgroundColor: COLORS.bg, zIndex: 5 },
  topbar: {
    paddingHorizontal: 16, paddingBottom: 6,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  title: { fontSize: 28, fontWeight: '800', color: COLORS.ink },

  helpBtn: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    backgroundColor: '#FFE8E8', borderRadius: 12,
  },
  helpTxt: { marginLeft: 6, color: COLORS.primary, fontWeight: '700', fontSize: 12 },

  searchWrap: {
    marginHorizontal: 16, marginBottom: 8, marginTop: 6,
    backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border,
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 48,
    shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
  },
  searchInput: { flex: 1, marginLeft: 8, color: COLORS.text, fontSize: 14 },
  filterBtn: {
    backgroundColor: COLORS.primary, width: 34, height: 34, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', marginLeft: 8,
  },

  chip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 12, height: 36, backgroundColor: '#FFFFFF',
    borderRadius: 18, borderWidth: 1, borderColor: COLORS.border, marginRight: 8,
  },
  chipText: { fontSize: 13, color: COLORS.muted },

  card: {
    backgroundColor: COLORS.card, borderRadius: 18, overflow: 'hidden',
    marginBottom: 14, borderWidth: 1, borderColor: '#EEF2F7', elevation: 2,
  },
  cardImage: { width: '100%', height: 120, justifyContent: 'space-between' },
  cardImageR: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  overlay: { ...StyleSheet.create({}).absoluteFillObject, backgroundColor: 'rgba(29,34,84,0.15)' },
  badge: {
    flexDirection: 'row', alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 8, paddingVertical: 5, borderBottomRightRadius: 10, borderTopLeftRadius: 18,
  },
  badgeText: { color: '#fff', marginLeft: 4, fontSize: 12, fontWeight: '700' },

  cardTitle: { color: COLORS.text, fontWeight: '700', fontSize: 14, marginTop: 10 },
  cardDesc: { color: COLORS.muted, fontSize: 12, marginTop: 4 },

  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  metaLeft: { flexDirection: 'row', alignItems: 'center' },
  metaRight: { flexDirection: 'row', alignItems: 'center' },
  metaText: { marginLeft: 6, fontSize: 12, color: COLORS.muted, fontWeight: '600' },

  ctaRow: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.primary, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  pillText: { marginLeft: 6, color: '#fff', fontSize: 11, fontWeight: '700' },

  /* skeleton */
  skelBody: { paddingHorizontal: 12, paddingBottom: 12 },
  skelLineTitle: { height: 14, backgroundColor: '#E9EEF5', borderRadius: 6, marginTop: 10, width: '92%' },
  skelLineTitleShort: { height: 14, backgroundColor: '#E9EEF5', borderRadius: 6, marginTop: 8, width: '70%' },
  skelLineDesc: { height: 12, backgroundColor: '#E9EEF5', borderRadius: 6, marginTop: 8, width: '95%' },
  skelLineDescShort: { height: 12, backgroundColor: '#E9EEF5', borderRadius: 6, marginTop: 6, width: '75%' },
  skelMetaIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E9EEF5' },
  skelMetaText: { width: 60, height: 12, borderRadius: 6, marginLeft: 6, backgroundColor: '#E9EEF5' },
  skelMetaIconSmall: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#E9EEF5' },
  skelMetaTextSmall: { width: 50, height: 12, borderRadius: 6, marginLeft: 6, backgroundColor: '#E9EEF5' },
  skelPill: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, backgroundColor: '#E9EEF5' },
  skelPillIcon: { width: 14, height: 14, borderRadius: 7, backgroundColor: '#FFFFFF33' },
  skelPillText: { width: 70, height: 12, borderRadius: 6, marginLeft: 6, backgroundColor: '#FFFFFF33' },
  skelImage: {
    width: '100%', height: 120, backgroundColor: '#E9EEF5',
    borderTopLeftRadius: 18, borderTopRightRadius: 18, overflow: 'hidden',
    justifyContent: 'flex-start',
  },
  skelBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#00000033',
    width: 64, height: 24,
    borderBottomRightRadius: 10, borderTopLeftRadius: 18,
    marginTop: 0,
  },
  skelOverlay: { ...StyleSheet.create({}).absoluteFillObject, backgroundColor: 'rgba(29,34,84,0.10)' },

  empty: { alignItems: 'center' },
  emptyTitle: { marginTop: 8, fontSize: 18, color: COLORS.ink, fontWeight: '800' },
  emptySub: { marginTop: 4, fontSize: 13, color: COLORS.muted },
});
