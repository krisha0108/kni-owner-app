import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const formatFilterLabel = (key, value) => {
  const labels = {
    status: `Status: ${value}`,
    dateFrom: `From: ${value}`,
    dateTo: `To: ${value}`,
    minAmount: `Min: ₹${value}`,
    maxAmount: `Max: ₹${value}`,
    category: `Category: ${value}`,
    sortBy: `Sort: ${value}`,
  };
  return labels[key] || `${key}: ${value}`;
};

export default function ActiveFilterBadges({ filters, onRemove }) {
  const activeFilters = Object.entries(filters)
    .filter(([key, value]) => value && value !== 'all' && value !== '' && key !== 'search')
    .map(([key, value]) => ({
      key,
      value,
      label: formatFilterLabel(key, value),
    }));

  if (activeFilters.length === 0) return null;

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeFilters.map((filter) => (
          <View key={filter.key} style={styles.badge}>
            <Text style={styles.badgeText}>{filter.label}</Text>
            <TouchableOpacity
              onPress={() => onRemove(filter.key)}
              style={styles.closeBtn}
            >
              <Icon name="close-circle" size={16} color="#EF3A3A" />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 8,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FCA5A5',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#EF3A3A',
  },
  closeBtn: {
    padding: 2,
  },
});
