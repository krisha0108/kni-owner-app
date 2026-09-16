// components/RestaurantSelector.js - Global Restaurant Selector Component
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRestaurant } from '../context/RestaurantContext';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

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

  return (
    <>
      <TouchableOpacity
        style={[styles.compactContainer, dark && styles.compactContainerDark, style]}
        onPress={() => hasMultipleRestaurants && setModalVisible(true)}
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

      <RestaurantModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={handleSelect}
      />
    </>
  );
}

// Full-width selector bar
export function RestaurantSelectorBar({ style }) {
  const [modalVisible, setModalVisible] = useState(false);
  const [showCoachMark, setShowCoachMark] = useState(false);
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
    setModalVisible(true);
    if (showCoachMark) dismissCoachMark();
  };

  return (
    <>
      <TouchableOpacity
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

      <RestaurantModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        restaurants={restaurants}
        selectedId={selectedRestaurant?.id}
        onSelect={handleSelect}
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

// Modal for selecting restaurant
function RestaurantModal({ visible, onClose, restaurants, selectedId, onSelect }) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const isTabletDevice = isTablet(width);
  const modalWidth = isTabletDevice ? Math.min(480, width * 0.7) : '100%';
  const modalMaxHeight = isTabletDevice ? height * 0.6 : '75%';

  return (
    <Modal
      visible={visible}
      animationType={isTabletDevice ? 'fade' : 'slide'}
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContent,
          {
            paddingBottom: insets.bottom + scale(16),
            width: modalWidth,
            maxHeight: modalMaxHeight,
            alignSelf: isTabletDevice ? 'center' : 'stretch',
            borderRadius: isTabletDevice ? scale(24) : undefined,
            borderTopLeftRadius: scale(24),
            borderTopRightRadius: scale(24),
          }
        ]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Restaurant</Text>
            <TouchableOpacity onPress={onClose} style={styles.modalClose}>
              <Icon name="close" size={24} color={C.ink} />
            </TouchableOpacity>
          </View>

          <FlatList
            data={restaurants}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.modalList}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalItem,
                  selectedId === item.id && styles.modalItemActive,
                ]}
                onPress={() => onSelect(item.id)}
              >
                <View style={styles.modalItemIcon}>
                  <Icon
                    name="restaurant"
                    size={20}
                    color={selectedId === item.id ? C.primary : C.muted}
                  />
                </View>
                <View style={styles.modalItemContent}>
                  <Text
                    style={[
                      styles.modalItemName,
                      selectedId === item.id && styles.modalItemNameActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.name}
                  </Text>
                  {item.address && (
                    <Text style={styles.modalItemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  )}
                </View>
                {selectedId === item.id && (
                  <Icon name="checkmark-circle" size={22} color={C.primary} />
                )}
              </TouchableOpacity>
            )}
          />
        </View>
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

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  modalClose: {
    padding: 4,
  },
  modalList: {
    padding: 16,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    marginBottom: 10,
  },
  modalItemActive: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1,
    borderColor: C.primary,
  },
  modalItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalItemContent: {
    flex: 1,
    marginLeft: 12,
  },
  modalItemName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.ink,
  },
  modalItemNameActive: {
    color: C.primary,
  },
  modalItemAddress: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
});

export default RestaurantSelectorBar;
