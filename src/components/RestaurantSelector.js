// components/RestaurantSelector.js - Global Restaurant Selector Component
import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { useRestaurant } from '../context/RestaurantContext';
import { scale, moderateScale, isTablet, getContainerMaxWidth } from '../utils/responsive';

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

// Compact selector for header use
export function RestaurantSelectorCompact({ style }) {
  const [modalVisible, setModalVisible] = useState(false);
  const {
    restaurants,
    selectedRestaurant,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

  if (loading) {
    return (
      <View style={[styles.compactContainer, style]}>
        <ActivityIndicator size="small" color={C.primary} />
      </View>
    );
  }

  if (!selectedRestaurant) {
    return (
      <View style={[styles.compactContainer, styles.noRestaurant, style]}>
        <Icon name="restaurant-outline" size={14} color={C.muted} />
        <Text style={styles.noRestaurantText}>No Restaurant</Text>
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
        style={[styles.compactContainer, style]}
        onPress={() => hasMultipleRestaurants && setModalVisible(true)}
        disabled={!hasMultipleRestaurants}
      >
        <Icon name="restaurant" size={14} color={C.primary} />
        <Text style={styles.compactText} numberOfLines={1}>
          {selectedRestaurant.name}
        </Text>
        {hasMultipleRestaurants && (
          <Icon name="chevron-down" size={14} color={C.muted} />
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
  const {
    restaurants,
    selectedRestaurant,
    selectRestaurant,
    loading,
    hasMultipleRestaurants,
  } = useRestaurant();

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

  return (
    <>
      <TouchableOpacity
        style={[styles.barContainer, style]}
        onPress={() => hasMultipleRestaurants && setModalVisible(true)}
        activeOpacity={hasMultipleRestaurants ? 0.7 : 1}
      >
        <View style={styles.barIconContainer}>
          <Icon name="restaurant" size={18} color={C.primary} />
        </View>
        <View style={styles.barContent}>
          <Text style={styles.barLabel}>Current Restaurant</Text>
          <Text style={styles.barName} numberOfLines={1}>
            {selectedRestaurant.name}
          </Text>
        </View>
        {hasMultipleRestaurants && (
          <View style={styles.barChevron}>
            <Icon name="chevron-down" size={20} color={C.muted} />
          </View>
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
  noRestaurant: {
    backgroundColor: C.bg,
  },
  noRestaurantText: {
    fontSize: 12,
    color: C.muted,
  },

  // Bar style
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    marginHorizontal: 16,
    marginVertical: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  barIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  barContent: {
    flex: 1,
    marginLeft: 12,
  },
  barLabel: {
    fontSize: 11,
    color: C.muted,
    fontWeight: '500',
  },
  barName: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginTop: 2,
  },
  barChevron: {
    padding: 4,
  },
  barLoadingText: {
    marginLeft: 8,
    color: C.muted,
    fontSize: 13,
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
    maxHeight: '70%',
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
