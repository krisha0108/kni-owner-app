// components/SearchOverlay.js — Inline global search panel, slides in below
// the header instead of pushing a whole new screen (was SearchScreen.js
// via navigation.navigate('Search'), which felt like a jarring page change).
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Animated,
  ActivityIndicator,
  Keyboard,
  StyleSheet,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { scale, moderateScale } from '../utils/responsive';

const C = {
  primary: '#EF3A3A', ink: '#1D2254', text: '#0F172A', muted: '#6B7280',
  bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', danger: '#EF4444',
};

// Status-style badge colors for the small pill shown on each result row.
// Anything that isn't a recognized status word (e.g. an amount or a plain
// category label) falls back to a neutral gray pill.
const STATUS_PILL_RULES = [
  { match: /^(available|active|completed|delivered|verified|approved|ok|success|paid)$/i, bg: '#DCFCE7', fg: '#15803D' },
  { match: /^(pending|maintenance|in.?progress|processing|scheduled|assigned)$/i, bg: '#FEF3C7', fg: '#B45309' },
  { match: /^(cancelled|rejected|failed|inactive|overdue|expired)$/i, bg: '#FDEAEA', fg: '#C62828' },
];

function getPillColors(text) {
  if (!text) return { bg: '#F1F3F7', fg: C.muted };
  const rule = STATUS_PILL_RULES.find((r) => r.match.test(text.trim()));
  return rule ? { bg: rule.bg, fg: rule.fg } : { bg: '#F1F3F7', fg: C.muted };
}

const CATEGORY_MAP = {
  equipment: { icon: 'build-outline', color: '#3B82F6', screen: 'EquipmentProfile', paramKey: 'equipmentId' },
  bookings: { icon: 'clipboard-outline', color: '#F59E0B', screen: 'BookingDetail', paramKey: 'bookingId' },
  expenses: { icon: 'wallet-outline', color: '#10B981', screen: 'Expenses', paramKey: null },
  staff: { icon: 'people-outline', color: '#8B5CF6', screen: 'Staff', paramKey: null },
  orders: { icon: 'cube-outline', color: C.primary, screen: 'MarketplaceOrders', paramKey: null },
  vendors: { icon: 'storefront-outline', color: '#C62828', screen: 'Marketplace', paramKey: null },
};

export default function SearchOverlay({ visible, onClose, navigation, restaurantId, topOffset: headerHeight }) {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const debounceRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Drive the fade ourselves (Modal's own animationType is turned off below)
  // so the panel is always laid out and fully painted *before* it becomes
  // visible - the built-in fade animation showed a flash of an unsettled
  // frame on Android before everything had a chance to measure.
  useEffect(() => {
    if (visible) {
      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }).start();
      const t = setTimeout(() => inputRef.current?.focus(), 220);
      return () => clearTimeout(t);
    }
    setQuery('');
    setResults(null);
    setError(null);
  }, [visible, fadeAnim]);

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
        const res = await api.get('/owner/search', { params: { q: trimmed, restaurantId } });
        if (res.data.ok) setResults(res.data.data);
        else { setError(res.data.error || 'Search failed'); setResults(null); }
      } catch (err) {
        setError('Something went wrong. Please try again.');
        setResults(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [query, restaurantId]);

  const handleResultPress = (category, item) => {
    Keyboard.dismiss();
    const config = CATEGORY_MAP[category];
    if (!config) return;
    const params = { restaurantId };
    if (config.paramKey && item.id) params[config.paramKey] = item.id;
    onClose();
    navigation.navigate(config.screen, params);
  };

  if (!visible) return null;

  const hasResults = results && Object.keys(results).some(
    (key) => Array.isArray(results[key]) && results[key].length > 0,
  );
  const topOffset = headerHeight || insets.top + scale(58);
  const bottomOffset = insets.bottom + scale(20);

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
      <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={onClose} />
      <View style={[st.sheet, { top: topOffset + scale(8), bottom: bottomOffset }]}>
        <View style={st.searchOuterRow}>
          <View style={st.searchRow}>
            <Icon name="search" size={scale(16)} color={C.muted} />
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
              <TouchableOpacity onPress={() => setQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close-circle" size={scale(16)} color={C.muted} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={st.closeBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Icon name="close" size={scale(17)} color={C.ink} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={st.resultsPanel}
          contentContainerStyle={{ paddingBottom: scale(16) }}
          keyboardShouldPersistTaps="handled"
        >
          {!loading && !results && !error && query.trim().length < 2 && (
            <View style={st.emptyWrap}>
              <Icon name="search-outline" size={scale(34)} color={C.border} />
              <Text style={st.emptyTitle}>Global Search</Text>
              <Text style={st.emptySub}>Search across equipment, bookings, expenses, staff, and orders</Text>
            </View>
          )}

          {loading && (
            <View style={{ paddingVertical: scale(28), alignItems: 'center' }}>
              <ActivityIndicator color={C.ink} />
            </View>
          )}

          {!loading && error && (
            <View style={st.emptyWrap}>
              <Icon name="alert-circle-outline" size={scale(30)} color={C.danger} />
              <Text style={[st.emptySub, { color: C.danger, marginTop: scale(8) }]}>{error}</Text>
            </View>
          )}

          {!loading && !error && results && !hasResults && (
            <View style={st.emptyWrap}>
              <Icon name="file-tray-outline" size={scale(30)} color={C.border} />
              <Text style={st.emptyTitle}>No results found</Text>
              <Text style={st.emptySub}>Try a different search term</Text>
            </View>
          )}

          {!loading && !error && results && hasResults && (
            Object.entries(results).map(([category, items]) => {
              if (!Array.isArray(items) || items.length === 0) return null;
              const config = CATEGORY_MAP[category];
              if (!config) return null;
              return (
                <View key={category} style={{ marginBottom: scale(12) }}>
                  <Text style={st.groupLabel}>
                    {category.toUpperCase()} ({items.length})
                  </Text>
                  {items.map((item, idx) => {
                    const badgeText = item.subtitle || item.status || item.category || (item.amount ? `₹${item.amount}` : '');
                    const pill = getPillColors(badgeText);
                    return (
                      <TouchableOpacity
                        key={item.id || `${category}-${idx}`}
                        style={st.resultRow}
                        onPress={() => handleResultPress(category, item)}
                        activeOpacity={0.6}
                      >
                        <View style={[st.resultIcon, { backgroundColor: `${config.color}18` }]}>
                          <Icon name={config.icon} size={scale(15)} color={config.color} />
                        </View>
                        <Text style={st.resultName} numberOfLines={1}>
                          {item.name || item.title || item.label || `#${item.id?.slice(-6) || idx}`}
                        </Text>
                        {badgeText ? (
                          <View style={[st.statusPill, { backgroundColor: pill.bg }]}>
                            <Text style={[st.statusPillText, { color: pill.fg }]} numberOfLines={1}>
                              {badgeText}
                            </Text>
                          </View>
                        ) : (
                          <Icon name="chevron-forward" size={scale(14)} color={C.muted} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              );
            })
          )}
        </ScrollView>
      </View>
      </Animated.View>
    </Modal>
  );
}

const st = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,17,38,0.28)',
  },
  sheet: {
    position: 'absolute',
    left: scale(10),
    right: scale(10),
    backgroundColor: C.card,
    borderRadius: scale(18),
    overflow: 'hidden',
    shadowColor: '#141432',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  searchOuterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    marginHorizontal: scale(12),
    marginTop: scale(10),
    marginBottom: scale(4),
  },
  searchRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    backgroundColor: C.bg,
    borderRadius: scale(11),
    paddingHorizontal: scale(12),
    height: scale(40),
  },
  closeBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(11),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    fontSize: moderateScale(13.5),
    color: C.text,
    padding: 0,
  },
  resultsPanel: {
    flex: 1,
    paddingHorizontal: scale(14),
    paddingTop: scale(6),
  },

  emptyWrap: {
    alignItems: 'center',
    paddingTop: scale(28),
    paddingBottom: scale(30),
    paddingHorizontal: scale(20),
  },
  emptyTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginTop: scale(10),
  },
  emptySub: {
    fontSize: moderateScale(12),
    color: C.muted,
    textAlign: 'center',
    marginTop: scale(5),
    lineHeight: moderateScale(17),
  },

  groupLabel: {
    fontSize: moderateScale(10.5),
    fontWeight: '800',
    color: C.ink,
    letterSpacing: 0.4,
    marginBottom: scale(7),
  },

  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(10),
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: scale(11),
    padding: scale(10),
    marginBottom: scale(7),
  },
  resultIcon: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(9),
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultName: {
    flex: 1,
    minWidth: 0,
    fontSize: moderateScale(12.5),
    fontWeight: '600',
    color: C.text,
  },
  statusPill: {
    maxWidth: scale(100),
    borderRadius: scale(20),
    paddingHorizontal: scale(8),
    paddingVertical: scale(3),
  },
  statusPillText: {
    fontSize: moderateScale(9.5),
    fontWeight: '800',
    letterSpacing: 0.2,
  },
});
