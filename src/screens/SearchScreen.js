// screens/SearchScreen.js — Global Search
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, StyleSheet, TextInput, TouchableOpacity,
  ScrollView, Keyboard, StatusBar, Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { scale, moderateScale } from '../utils/responsive';

/* ──────── THEME ──────── */
const C = {
  primary: '#EF3A3A', primaryDark: '#C62828', ink: '#1D2254', text: '#0F172A',
  muted: '#6B7280', bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB',
  ok: '#10B981', info: '#3B82F6', warn: '#F59E0B', danger: '#EF4444',
};

/* ──────── CATEGORY CONFIG ──────── */
const CATEGORY_MAP = {
  equipment: { icon: 'build-outline', color: C.info, screen: 'EquipmentProfile', paramKey: 'equipmentId' },
  bookings: { icon: 'clipboard-outline', color: C.warn, screen: 'BookingDetail', paramKey: 'bookingId' },
  expenses: { icon: 'wallet-outline', color: C.ok, screen: 'Expenses', paramKey: null },
  staff: { icon: 'people-outline', color: '#8B5CF6', screen: 'Staff', paramKey: null },
  orders: { icon: 'cube-outline', color: C.primary, screen: 'MarketplaceOrders', paramKey: null },
  vendors: { icon: 'storefront-outline', color: C.primaryDark, screen: 'Marketplace', paramKey: null },
};

/* ──────── Skeleton ──────── */
function SkeletonSearch({ pulse }) {
  return (
    <View style={{ paddingHorizontal: scale(14), paddingTop: scale(16) }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <View key={i} style={st.skelRow}>
          <Animated.View style={[st.skelIcon, { opacity: pulse }]} />
          <View style={{ flex: 1, marginLeft: scale(12) }}>
            <Animated.View style={[st.skelLine, { opacity: pulse, width: '60%' }]} />
            <Animated.View style={[st.skelLineSm, { opacity: pulse, width: '35%' }]} />
          </View>
        </View>
      ))}
    </View>
  );
}

/* ======================================================================= */
export default function SearchScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurantId: restaurantId } = useRestaurant();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 100);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    debounceRef.current = setTimeout(async () => {
      try {
        const res = await api.get('/owner/search', {
          params: { q: trimmed, restaurantId },
        });
        if (res.data.ok) {
          setResults(res.data.data);
        } else {
          setError(res.data.error || 'Search failed');
          setResults(null);
        }
      } catch (err) {
        console.error('Search error:', err.message);
        setError('Something went wrong. Please try again.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, restaurantId]);

  /* ──────── Navigation ──────── */
  const handleResultPress = useCallback((category, item) => {
    Keyboard.dismiss();
    const config = CATEGORY_MAP[category];
    if (!config) return;

    const params = { restaurantId };
    if (config.paramKey && item.id) {
      params[config.paramKey] = item.id;
    }
    navigation.navigate(config.screen, params);
  }, [navigation, restaurantId]);

  /* ──────── Check if results are empty ──────── */
  const hasResults = results && Object.keys(results).some(
    (key) => Array.isArray(results[key]) && results[key].length > 0,
  );

  /* ──────── Render ──────── */
  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />
      {/* ── Search Bar ── */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.searchBarRow, { paddingTop: insets.top + scale(10) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={st.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <View style={st.inputWrap}>
          <Icon name="search" size={scale(18)} color={C.muted} style={{ marginRight: scale(8) }} />
          <TextInput
            ref={inputRef}
            style={st.input}
            placeholder="Search equipment, bookings, staff..."
            placeholderTextColor={C.muted}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery('')}>
              <Icon name="close-circle" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      {/* ── Content ── */}
      <ScrollView
        style={st.scrollArea}
        contentContainerStyle={st.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Initial state */}
        {!loading && !results && !error && query.trim().length < 2 && (
          <View style={st.emptyWrap}>
            <Icon name="search-outline" size={scale(48)} color={C.border} />
            <Text style={st.emptyTitle}>Global Search</Text>
            <Text style={st.emptySubtitle}>
              Search across equipment, bookings, expenses, staff, and orders
            </Text>
          </View>
        )}

        {/* Loading */}
        {loading && <SkeletonSearch pulse={pulse} />}

        {/* Error */}
        {!loading && error && (
          <View style={st.emptyWrap}>
            <Icon name="alert-circle-outline" size={scale(48)} color={C.danger} />
            <Text style={[st.emptySubtitle, { color: C.danger, marginTop: scale(8) }]}>{error}</Text>
          </View>
        )}

        {/* No results */}
        {!loading && !error && results && !hasResults && (
          <View style={st.emptyWrap}>
            <Icon name="file-tray-outline" size={scale(48)} color={C.border} />
            <Text style={st.emptyTitle}>No results found</Text>
            <Text style={st.emptySubtitle}>
              Try a different search term
            </Text>
          </View>
        )}

        {/* Results */}
        {!loading && !error && results && hasResults && (
          Object.entries(results).map(([category, items]) => {
            if (!Array.isArray(items) || items.length === 0) return null;
            const config = CATEGORY_MAP[category];
            if (!config) return null;

            return (
              <View key={category} style={st.section}>
                <View style={st.sectionHeader}>
                  <Icon name={config.icon} size={scale(16)} color={config.color} />
                  <Text style={st.sectionTitle}>
                    {category.charAt(0).toUpperCase() + category.slice(1)}
                  </Text>
                  <Text style={st.sectionCount}>{items.length}</Text>
                </View>

                {items.map((item, idx) => (
                  <TouchableOpacity
                    key={item.id || `${category}-${idx}`}
                    style={st.resultRow}
                    onPress={() => handleResultPress(category, item)}
                    activeOpacity={0.6}
                  >
                    <View style={[st.resultIcon, { backgroundColor: config.color + '15' }]}>
                      <Icon name={config.icon} size={scale(18)} color={config.color} />
                    </View>
                    <View style={st.resultInfo}>
                      <Text style={st.resultName} numberOfLines={1}>
                        {item.name || item.title || item.label || `#${item.id?.slice(-6) || idx}`}
                      </Text>
                      {(item.subtitle || item.status || item.category || item.amount) ? (
                        <Text style={st.resultSub} numberOfLines={1}>
                          {item.subtitle || item.status || item.category || (item.amount ? `₹${item.amount}` : '')}
                        </Text>
                      ) : null}
                    </View>
                    <Icon name="chevron-forward" size={scale(16)} color={C.muted} />
                  </TouchableOpacity>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ──────── STYLES ──────── */
const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(12),
    paddingBottom: scale(10),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-35), right: scale(-20) },
  headerBlobB: { position: 'absolute', width: scale(60), height: scale(60), borderRadius: scale(30), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-30), left: scale(24) },
  backBtn: {
    width: scale(36),
    height: scale(36),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(6),
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(10),
    paddingHorizontal: scale(12),
    height: scale(40),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(14),
    color: C.text,
    padding: 0,
  },
  scrollArea: { flex: 1 },
  scrollContent: { paddingBottom: scale(40) },

  /* Empty / placeholder states */
  emptyWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: scale(80),
    paddingHorizontal: scale(32),
  },
  emptyTitle: {
    fontSize: moderateScale(16),
    fontWeight: '600',
    color: C.ink,
    marginTop: scale(12),
  },
  emptySubtitle: {
    fontSize: moderateScale(13),
    color: C.muted,
    textAlign: 'center',
    marginTop: scale(6),
    lineHeight: moderateScale(18),
  },

  /* Section */
  section: {
    marginTop: scale(16),
    marginHorizontal: scale(14),
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(8),
    gap: scale(6),
  },
  sectionTitle: {
    fontSize: moderateScale(13),
    fontWeight: '700',
    color: C.ink,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sectionCount: {
    fontSize: moderateScale(11),
    color: C.muted,
    fontWeight: '600',
  },

  /* Result row */
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
    elevation: 1,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  resultIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: scale(12),
  },
  resultInfo: { flex: 1, marginRight: scale(8) },
  resultName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.text,
  },
  resultSub: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },

  /* ─── Skeleton ─── */
  skelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(10),
    padding: scale(12),
    marginBottom: scale(8),
  },
  skelIcon: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: '#E2E8F0',
  },
  skelLine: {
    height: scale(13),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
  },
  skelLineSm: {
    height: scale(11),
    borderRadius: scale(6),
    backgroundColor: '#E2E8F0',
    marginTop: scale(6),
  },
});
