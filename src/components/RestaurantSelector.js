// components/RestaurantSelector.js - Global Restaurant Selector Component
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRestaurant } from '../context/RestaurantContext';
import { scale } from '../utils/responsive';

// Shown once (across all 17 screens using RestaurantSelectorBar, since it's
// one shared AsyncStorage flag) until the owner dismisses it or taps the bar.
const COACH_MARK_SEEN_KEY = 'restaurant_switch_coachmark_seen';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
};

// Compact selector for header use. `dark` swaps the light-pink/navy palette
// for translucent-white-on-dark, for use inside a colored gradient hero.
export function RestaurantSelectorCompact({ style, dark }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);
  const {
    restaurants,
    selectedRestaurant,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

  const iconColor = dark ? '#fff' : C.primary;
  const chevronColor = dark ? 'rgba(255,255,255,0.85)' : C.muted;

  if (loading) {
    return (
      <View style={[styles.compactContainer, dark && styles.compactContainerDark, style]}>
        <ActivityIndicator size="small" color={iconColor} />
      </View>
    );
  }

  if (!selectedRestaurant) {
    return (
      <View style={[styles.compactContainer, dark ? styles.compactContainerDark : styles.noRestaurant, style]}>
        <Icon name="restaurant-outline" size={14} color={dark ? 'rgba(255,255,255,0.85)' : C.muted} />
        <Text style={[styles.noRestaurantText, dark && styles.compactTextDark]}>No Restaurant</Text>
      </View>
    );
  }

  const handleSelect = (restaurantId) => {
    selectRestaurant(restaurantId);
    setModalVisible(false);
  };

  const openDropdown = () => {
    if (!hasMultipleRestaurants) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height, left: x, width });
      setModalVisible(true);
    });
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.compactContainer, dark && styles.compactContainerDark, style]}
        onPress={openDropdown}
        disabled={!hasMultipleRestaurants}
      >
        <Icon name="restaurant" size={14} color={iconColor} />
        <Text style={[styles.compactText, dark && styles.compactTextDark]} numberOfLines={1}>
          {selectedRestaurant.name}
        </Text>
        {hasMultipleRestaurants && (
          <Icon name="chevron-down" size={14} color={chevronColor} />
        )}
      </TouchableOpacity>

      <RestaurantDropdown
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={handleSelect}
        anchor={anchor}
      />
    </>
  );
}

// Light, compact "current restaurant" card - icon + label/name stacked on the
// left, an outline "Change" pill on the right. Visually distinct from
// RestaurantSelectorBar (which is bolder/heavier - thick colored border,
// solid icon fill) for screens that want a quieter look; same underlying
// switch-restaurant modal either way.
export function RestaurantSelectorCard({ style }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const triggerRef = useRef(null);
  const {
    restaurants,
    selectedRestaurant,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

  if (loading) {
    return (
      <View style={[styles.cardContainer, style]}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  }

  if (!selectedRestaurant) {
    return (
      <View style={[styles.cardContainer, style]}>
        <Icon name="restaurant-outline" size={18} color={C.muted} />
        <Text style={styles.cardNoRestaurantText}>No restaurant selected</Text>
      </View>
    );
  }

  const handleSelect = (restaurantId) => {
    selectRestaurant(restaurantId);
    setModalVisible(false);
  };

  const openDropdown = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height, left: x, width });
      setModalVisible(true);
    });
  };

  return (
    <>
      <View ref={triggerRef} style={[styles.cardContainer, style]}>
        <View style={styles.cardIconBg}>
          <Icon name="restaurant" size={16} color={C.primary} />
        </View>
        <View style={styles.cardTextWrap}>
          <Text style={styles.cardLabel}>Current Restaurant</Text>
          <Text style={styles.cardName} numberOfLines={1}>{selectedRestaurant.name}</Text>
        </View>
        {hasMultipleRestaurants && (
          <TouchableOpacity
            style={styles.cardChangeBtn}
            onPress={openDropdown}
            activeOpacity={0.7}
          >
            <Text style={styles.cardChangeBtnText}>Change</Text>
            <Icon name="chevron-forward" size={13} color={C.primary} />
          </TouchableOpacity>
        )}
      </View>

      <RestaurantDropdown
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={handleSelect}
        anchor={anchor}
      />
    </>
  );
}

// Full-width selector bar
export function RestaurantSelectorBar({ style }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [anchor, setAnchor] = useState(null);
  const [showCoachMark, setShowCoachMark] = useState(false);
  const triggerRef = useRef(null);
  const {
    restaurants,
    selectedRestaurant,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

  // First-time coach mark: only worth showing when there's actually more
  // than one restaurant to switch between, and only until the owner has
  // dismissed it or tapped the bar once (one shared flag, since this same
  // bar renders on ~17 screens).
  useEffect(() => {
    if (!hasMultipleRestaurants || !selectedRestaurant) return;
    let cancelled = false;
    AsyncStorage.getItem(COACH_MARK_SEEN_KEY).then((seen) => {
      if (!cancelled && !seen) setShowCoachMark(true);
    });
    return () => { cancelled = true; };
  }, [hasMultipleRestaurants, selectedRestaurant]);

  const dismissCoachMark = () => {
    setShowCoachMark(false);
    AsyncStorage.setItem(COACH_MARK_SEEN_KEY, 'true');
  };

  if (loading) {
    return (
      <View style={[styles.barContainer, style]}>
        <ActivityIndicator size="small" color={C.primary} />
        <Text style={styles.barLoadingText}>Loading restaurants...</Text>
      </View>
    );
  }

  if (!selectedRestaurant) {
    return (
      <View style={[styles.barContainer, styles.noRestaurantBar, style]}>
        <Icon name="restaurant-outline" size={18} color={C.muted} />
        <Text style={styles.barNoRestaurantText}>No restaurant selected</Text>
      </View>
    );
  }

  const handleSelect = (restaurantId) => {
    selectRestaurant(restaurantId);
    setModalVisible(false);
  };

  const handleOpen = () => {
    if (!hasMultipleRestaurants) return;
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ top: y + height, left: x, width });
      setModalVisible(true);
    });
    if (showCoachMark) dismissCoachMark();
  };

  return (
    <>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.barContainer, style]}
        onPress={handleOpen}
        activeOpacity={hasMultipleRestaurants ? 0.7 : 1}
      >
        <View style={styles.barIconContainer}>
          <Icon name="restaurant" size={17} color="#fff" />
        </View>
        <View style={styles.barContent}>
          <Text style={styles.barLabel}>Current Restaurant</Text>
          <Text style={styles.barName} numberOfLines={1}>
            {selectedRestaurant.name}
          </Text>
        </View>
        {/* A real "Change" button instead of a bare chevron -- the whole
            row is also outlined in brand red with a soft red shadow so it
            reads as one button, not an info card. */}
        {hasMultipleRestaurants && (
          <View style={styles.barChangeBtn}>
            <Text style={styles.barChangeBtnText}>Change</Text>
          </View>
        )}
      </TouchableOpacity>

      {showCoachMark && hasMultipleRestaurants && (
        <View style={[styles.coachMark, style]}>
          <View style={styles.coachMarkArrow} />
          <Text style={styles.coachMarkText}>Tap here to switch between your restaurants</Text>
          <TouchableOpacity onPress={dismissCoachMark} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Icon name="close" size={14} color="rgba(255,255,255,0.85)" />
          </TouchableOpacity>
        </View>
      )}

      <RestaurantDropdown
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={handleSelect}
        anchor={anchor}
      />
    </>
  );
}

// Chip-style horizontal selector
export function RestaurantSelectorChips({ style }) {
  const {
    restaurants,
    selectedRestaurantId,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

  if (loading || !hasMultipleRestaurants) {
    return null;
  }

  return (
    <View style={[styles.chipsContainer, style]}>
      <FlatList
        horizontal
        data={restaurants}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.chip,
              selectedRestaurantId === item.id && styles.chipActive,
            ]}
            onPress={() => selectRestaurant(item.id)}
          >
            <Text
              style={[
                styles.chipText,
                selectedRestaurantId === item.id && styles.chipTextActive,
              ]}
              numberOfLines={1}
            >
              {item.name}
            </Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

// Inline dropdown anchored right below whichever trigger opened it (measured
// via measureInWindow), instead of a full-screen/bottom-sheet modal. Still
// rendered through RN's Modal for proper stacking above everything else -
// only its content is positioned to look like an attached dropdown.
function RestaurantDropdown({ visible, onClose, restaurants, selectedId, onSelect, anchor }) {
  const insets = useSafeAreaInsets();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!visible) setQuery('');
  }, [visible]);

  if (!visible || !anchor) return null;

  const filtered = query.trim()
    ? restaurants.filter((r) => r.name.toLowerCase().includes(query.trim().toLowerCase()))
    : restaurants;

  const dropdownWidth = Math.min(Math.max(anchor.width, scale(240)), screenWidth - scale(32));
  const left = Math.max(scale(16), Math.min(anchor.left, screenWidth - dropdownWidth - scale(16)));
  const top = anchor.top + scale(6);
  const maxHeight = Math.max(scale(120), screenHeight - top - insets.bottom - scale(20));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.ddBackdrop} activeOpacity={1} onPress={onClose} />
      <View style={[styles.ddCard, { top, left, width: dropdownWidth, maxHeight }]}>
        {restaurants.length > 5 && (
          <View style={styles.ddSearchRow}>
            <Icon name="search" size={14} color={C.muted} />
            <TextInput
              style={styles.ddSearchInput}
              placeholder="Search restaurant..."
              placeholderTextColor={C.muted}
              value={query}
              onChangeText={setQuery}
              autoCorrect={false}
            />
          </View>
        )}
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => {
            const active = selectedId === item.id;
            return (
              <TouchableOpacity
                style={[styles.ddItem, active && styles.ddItemActive]}
                onPress={() => onSelect(item.id)}
              >
                <View style={[styles.ddDot, active && styles.ddDotActive]} />
                <View style={styles.ddItemContent}>
                  <Text style={[styles.ddItemName, active && styles.ddItemNameActive]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.address && (
                    <Text style={styles.ddItemAddress} numberOfLines={1}>{item.address}</Text>
                  )}
                </View>
                {active && <Icon name="checkmark" size={16} color={C.primary} />}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={styles.ddEmpty}>No restaurant found</Text>}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Compact style
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
    maxWidth: 180,
  },
  compactText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.ink,
    maxWidth: 120,
  },
  compactContainerDark: {
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  compactTextDark: {
    color: '#fff',
  },
  noRestaurant: {
    backgroundColor: C.bg,
  },
  noRestaurantText: {
    fontSize: 12,
    color: C.muted,
  },

  // Card style -- light/quiet: pale-pink icon badge, outline "Change" pill,
  // subtle shadow instead of a bold colored border.
  cardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 12,
    gap: 10,
    shadowColor: '#141432',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIconBg: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#FDEAEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  cardLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    color: C.muted,
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginTop: 1,
  },
  cardChangeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    borderWidth: 1.5,
    borderColor: C.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  cardChangeBtnText: {
    fontSize: 11.5,
    fontWeight: '700',
    color: C.primary,
  },
  cardNoRestaurantText: {
    marginLeft: 8,
    color: C.muted,
    fontSize: 13,
  },

  // Bar style -- "button look": solid red icon block, red-outlined card with
  // a soft red shadow, and a real "Change" button instead of a bare chevron,
  // so the whole row reads as one button rather than a passive info card.
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
    elevation: 3,
  },
  barIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 11,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  barContent: {
    flex: 1,
    marginLeft: 12,
  },
  barLabel: {
    fontSize: 10.5,
    color: C.muted,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  barName: {
    fontSize: 14.5,
    fontWeight: '800',
    color: C.ink,
    marginTop: 2,
  },
  barChangeBtn: {
    backgroundColor: C.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 9,
  },
  barChangeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff',
  },
  barLoadingText: {
    marginLeft: 8,
    color: C.muted,
    fontSize: 13,
  },

  // First-time coach mark -- navy tooltip pointing up at the bar, dismissed
  // (and remembered via AsyncStorage) on tap of the X or the bar itself.
  coachMark: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: C.ink,
    marginHorizontal: 16,
    marginTop: 6,
    marginBottom: 2,
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    position: 'relative',
  },
  coachMarkArrow: {
    position: 'absolute',
    top: -6,
    left: 24,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderBottomWidth: 6,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: C.ink,
  },
  coachMarkText: {
    flex: 1,
    fontSize: 12,
    color: '#fff',
    fontWeight: '600',
  },
  noRestaurantBar: {
    backgroundColor: C.bg,
    borderStyle: 'dashed',
  },
  barNoRestaurantText: {
    marginLeft: 10,
    color: C.muted,
    fontSize: 13,
  },

  // Chips style
  chipsContainer: {
    marginBottom: 8,
  },
  chipsContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
    marginRight: 8,
  },
  chipActive: {
    backgroundColor: C.primary,
    borderColor: C.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  chipTextActive: {
    color: '#fff',
  },

  // Inline dropdown (anchored below trigger, replaces the old bottom-sheet modal)
  ddBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15,17,38,0.32)',
  },
  ddCard: {
    position: 'absolute',
    backgroundColor: C.card,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: C.border,
    overflow: 'hidden',
    shadowColor: '#141432',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  ddSearchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    backgroundColor: '#FAFBFD',
  },
  ddSearchInput: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    padding: 0,
  },
  ddItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  ddItemActive: {
    backgroundColor: '#FFF5F5',
  },
  ddDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  ddDotActive: {
    backgroundColor: C.ok,
  },
  ddItemContent: {
    flex: 1,
    minWidth: 0,
  },
  ddItemName: {
    fontSize: 13,
    fontWeight: '600',
    color: C.ink,
  },
  ddItemNameActive: {
    color: C.primary,
  },
  ddItemAddress: {
    fontSize: 11,
    color: C.muted,
    marginTop: 1,
  },
  ddEmpty: {
    padding: 16,
    textAlign: 'center',
    fontSize: 12,
    color: C.muted,
  },
});

export default RestaurantSelectorBar;
