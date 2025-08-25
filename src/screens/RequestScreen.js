import React, { useMemo, useRef, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TextInput, FlatList, ImageBackground,
  TouchableOpacity, Animated, RefreshControl, useWindowDimensions
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';

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

const H_MARGIN = 16;   // page padding left/right
const GAP = 12;        // grid gap
const MIN_W = 170;     // min card width (prevents too-narrow cards)

/* ---------------- Data ---------------- */
const CATEGORIES = [
  { key: 'All', icon: 'apps' },
  { key: 'Fridge', icon: 'snow' },
  { key: 'Chimney', icon: 'filter' },
  { key: 'Oven', icon: 'flame' },
  { key: 'Dishwasher', icon: 'water' },
  { key: 'Gas Range', icon: 'bonfire' },
  { key: 'Deep Freezer', icon: 'cube' },
];

const RAW_FEED = [
  { id: '1', title: 'Commercial Fridge Service', category: 'Fridge',
    desc: 'Cooling issues, gas refill, thermostat faults & preventive maintenance.',
    image: 'https://s3-us-west-2.amazonaws.com/speedybrandimages/tmp_ba6cd8e2-3942-4d4b-bebc-a273130e6b29.webp',
    rating: 4.8, requests: 225 },
  { id: '2', title: 'Chimney Deep Clean', category: 'Chimney',
    desc: 'Oil baffle cleaning, suction test, motor inspection—sparkling results.',
    image: 'https://lh7-us.googleusercontent.com/XnO7uPqhk93Z8VpWwyunmyz-B6vQXHRGShqFA_8tS2xNZR2xg90_RFTl-_QwAFSwJcYltOkAD7Y2yDuq_TKktOXFb_knhmfNdHo4jvZLAy25g1F8jtQ1NRQ9DeIWZQp8JBc6yXDcILNn4C_dWHR9k4o',
    rating: 4.7, requests: 310 },
  { id: '3', title: 'Combi-Oven Repair', category: 'Oven',
    desc: 'Heating coil, PCB, steam injectors & calibration by certified pros.',
    image: 'https://lh7-us.googleusercontent.com/XpqpI8PT6wddRnj9CFheJzaFKx-7fL5FIuT6bQLUWg2iJTozxzVJqQ16rT7V805-QB-1uzUVkZ24vdcky8-iLw4ae6iAQTQ7Gts2x7D__j30b454ttxOv1gxtkWljwDUOAZIN2V8xIf3bRqrFdf3uXU',
    rating: 4.6, requests: 142 },
  { id: '4', title: 'Dishwasher Service', category: 'Dishwasher',
    desc: 'Pump / spray arm issues, hard-water scale removal & leak fixes.',
    image: 'https://images.unsplash.com/photo-1544025162-d76694265947?q=80&w=1200&auto=format&fit=crop',
    rating: 4.5, requests: 190 },
  { id: '5', title: 'Gas Range Inspection', category: 'Gas Range',
    desc: 'Ignition, burner alignment, gas leak test & performance tuning.',
    image: 'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-busy-commercial-kitchen-repair-scene-showing-an-array-of-diverse-refrigerators-open-with-their-mechanics-visible.-Various-tools-are-scattered-around-1-1024x585.webp',
    rating: 4.9, requests: 403 },
  { id: '6', title: 'Deep Freezer Repair', category: 'Deep Freezer',
    desc: 'Compressor, fan, defrost cycle & seal replacement—fast turnaround.',
    image: 'https://fixitrightappliances.ca/wp-content/uploads/2024/04/A-detailed-depiction-of-a-commercial-refrigerator-repair-scene-in-a-wide-format.-The-image-shows-a-skilled-technician-wearing-a-uniform-and-equipped-1.webp',
    rating: 4.7, requests: 165 },
];

/* ---------------- Skeleton ---------------- */
const SkeletonCard = ({ width }) => {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(pulse, { toValue: 0.4, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);
  return (
    <View style={[styles.card, { width }]}>
      <Animated.View style={[styles.skelImage, { opacity: pulse }]} />
      <Animated.View style={[styles.skelLine, { width: '80%', opacity: pulse }]} />
      <Animated.View style={[styles.skelLine, { width: '60%', opacity: pulse }]} />
    </View>
  );
};

/* ---------------- Screen ---------------- */
export default function RequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions(); // adapts on tablets/foldables/Chromebook

  // responsive columns (keeps ~170–220px cards)
  const numColumns = Math.max(2, Math.floor((width - H_MARGIN * 2 + GAP) / (MIN_W + GAP)));
  const cardW = (width - H_MARGIN * 2 - GAP * (numColumns - 1)) / numColumns;

  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 700);
    return () => clearTimeout(t);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setLoading(true);
    setTimeout(() => { setLoading(false); setRefreshing(false); }, 900);
  };

  const data = useMemo(() => {
    const q = query.trim().toLowerCase();
    return RAW_FEED.filter((it) => {
      const byCat = activeCat === 'All' || it.category === activeCat;
      const byQuery = !q
        || it.title.toLowerCase().includes(q)
        || it.category.toLowerCase().includes(q)
        || it.desc.toLowerCase().includes(q);
      return byCat && byQuery;
    });
  }, [query, activeCat]);

  const renderChip = ({ item }) => {
    const active = item.key === activeCat;
    return (
      <TouchableOpacity
        onPress={() => setActiveCat(item.key)}
        style={[styles.chip, active && { backgroundColor: '#FFF1F1', borderColor: COLORS.primary }]}
      >
        <Icon name={item.icon} size={16} color={active ? COLORS.primary : COLORS.muted} style={{ marginRight: 6 }} />
        <Text style={[styles.chipText, active && { color: COLORS.primary, fontWeight: '700' }]}>{item.key}</Text>
      </TouchableOpacity>
    );
  };

  /* -------- Sticky Header (Request + Search + Chips) -------- */
  const Header = useMemo(() => (
    <View style={[styles.stickyHeader]}>
      {/* Topbar */}
      <View style={styles.topbar}>
        <Text style={styles.title}>Request</Text>
        <TouchableOpacity
          style={styles.helpBtn}
          hitSlop={{ top: 6, right: 6, bottom: 6, left: 6 }}
          onPress={() => navigation.navigate('Support')}
        >
          <Icon name="chatbubbles-outline" size={18} color={COLORS.primary} />
          <Text style={styles.helpTxt}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
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
        <TouchableOpacity style={styles.filterBtn}>
          <Icon name="options-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chips */}
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}
        data={CATEGORIES}
        keyExtractor={(i) => i.key}
        renderItem={renderChip}
      />
    </View>
  ), [insets.top, query, activeCat]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.bg }} edges={['top', 'left', 'right']}>
      {/* Grid feed (with pull-to-refresh) */}
      {loading ? (
        <FlatList
          data={Array.from({ length: numColumns * 2 }, (_, i) => i)}
          keyExtractor={(i) => String(i)}
          numColumns={numColumns}
          columnWrapperStyle={{ paddingHorizontal: H_MARGIN, columnGap: GAP }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}           // ← Pinned header
          renderItem={() => <SkeletonCard width={cardW} />}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        />
      ) : data.length ? (
        <FlatList
          data={data}
          keyExtractor={(i) => i.id}
          numColumns={numColumns}
          columnWrapperStyle={{ paddingHorizontal: H_MARGIN, columnGap: GAP }}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}           // ← Pinned header
          renderItem={({ item }) => (
            <TouchableOpacity
              activeOpacity={0.9}
              style={[styles.card, { width: cardW }]}
              onPress={() => navigation.navigate('RequestDetail', { item })}
            >
              <ImageBackground source={{ uri: item.image }} style={styles.cardImage} imageStyle={styles.cardImageR}>
                <View style={styles.badge}>
                  <Icon name="star" size={12} color="#fff" />
                  <Text style={styles.badgeText}>{item.rating}</Text>
                </View>
                <View style={styles.overlay} />
              </ImageBackground>

              <View style={{ paddingHorizontal: 12, paddingBottom: 12 }}>
                <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
                <Text style={styles.cardDesc} numberOfLines={2}>{item.desc}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaLeft}>
                    <Icon name="pricetags-outline" size={14} color={COLORS.muted} />
                    <Text style={styles.metaText}>{item.category}</Text>
                  </View>
                  <View style={styles.metaRight}>
                    <Icon name="flash-outline" size={14} color={COLORS.primary} />
                    <Text style={[styles.metaText, { color: COLORS.primary }]}>{item.requests} req</Text>
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
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        />
      ) : (
        <FlatList
          data={[]}
          ListHeaderComponent={Header}
          stickyHeaderIndices={[0]}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20, flex: 1, justifyContent: 'center', alignItems: 'center' }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Icon name="search-circle-outline" size={64} color="#CBD5E1" />
              <Text style={styles.emptyTitle}>No results</Text>
              <Text style={styles.emptySub}>Try a different keyword or category.</Text>
            </View>
          }
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} tintColor={COLORS.primary} />}
        />
      )}
    </SafeAreaView>
  );
}

/* ---------------- Styles ---------------- */
const styles = StyleSheet.create({
  /* sticky wrapper: needs bg, border & elevation so it feels pinned */
  stickyHeader: {
    backgroundColor: COLORS.bg,
    zIndex: 5,
  
  },

  topbar: {
    paddingHorizontal: 16,
    paddingBottom: 6,                 // compact so title sits a bit higher
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  overlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(29,34,84,0.15)' },
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

  // skeletons
  skelImage: { width: '100%', height: 120, backgroundColor: '#E9EEF5', borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  skelLine: { height: 12, backgroundColor: '#E9EEF5', borderRadius: 6, marginTop: 10, marginHorizontal: 12 },

  empty: { alignItems: 'center' },
  emptyTitle: { marginTop: 8, fontSize: 18, color: COLORS.ink, fontWeight: '800' },
  emptySub: { marginTop: 4, fontSize: 13, color: COLORS.muted },
});
