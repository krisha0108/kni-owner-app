import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEF2F2',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  okLight: '#ECFDF5',
  warn: '#F59E0B',
  warnLight: '#FFFBEB',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

const FILTER_ICONS = {
  status: 'flag',
  dateFrom: 'calendar',
  dateTo: 'calendar',
  minAmount: 'cash',
  maxAmount: 'cash',
  category: 'pricetag',
  sortBy: 'swap-vertical',
};

const FILTER_COLORS = {
  status: { bg: C.primaryLight, color: C.primary },
  dateFrom: { bg: C.infoLight, color: C.info },
  dateTo: { bg: C.infoLight, color: C.info },
  minAmount: { bg: C.okLight, color: C.ok },
  maxAmount: { bg: C.okLight, color: C.ok },
  category: { bg: C.warnLight, color: C.warn },
  sortBy: { bg: '#F3E8FF', color: '#9333EA' },
};

const formatFilterLabel = (key, value, statusOptions) => {
  switch (key) {
    case 'status':
      const statusOption = statusOptions?.find(s => s.value === value);
      return statusOption?.label || value;
    case 'dateFrom':
      return `From ${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'dateTo':
      return `To ${new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
    case 'minAmount':
      return `Min ₹${value}`;
    case 'maxAmount':
      return `Max ₹${value}`;
    case 'category':
      return value;
    case 'sortBy':
      return value.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase());
    default:
      return value;
  }
};

export default function ActiveFilterBadges({ filters, onRemove, statusOptions }) {
  const activeFilters = Object.entries(filters)
    .filter(([key, value]) => {
      if (!value || value === '' || key === 'search') return false;
      if (key === 'status' && value === 'all') return false;
      if (key === 'sortBy') return false; // Don't show sort as a removable filter
      return true;
    })
    .map(([key, value]) => ({
      key,
      value,
      label: formatFilterLabel(key, value, statusOptions),
      icon: FILTER_ICONS[key] || 'ellipse',
      colors: FILTER_COLORS[key] || { bg: C.bg, color: C.muted },
    }));

  if (activeFilters.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.activeIndicator}>
          <View style={styles.activeDot} />
          <Text style={styles.activeText}>Active Filters</Text>
        </View>
        <TouchableOpacity
          style={styles.clearAllBtn}
          onPress={() => activeFilters.forEach(f => onRemove(f.key))}
        >
          <Text style={styles.clearAllText}>Clear All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {activeFilters.map((filter) => (
          <View
            key={filter.key}
            style={[styles.badge, { backgroundColor: filter.colors.bg }]}
          >
            <View style={[styles.badgeIcon, { backgroundColor: filter.colors.color + '20' }]}>
              <Icon name={filter.icon} size={12} color={filter.colors.color} />
            </View>
            <Text style={[styles.badgeText, { color: filter.colors.color }]} numberOfLines={1}>
              {filter.label}
            </Text>
            <TouchableOpacity
              onPress={() => onRemove(filter.key)}
              style={[styles.closeBtn, { backgroundColor: filter.colors.color + '20' }]}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Icon name="close" size={12} color={filter.colors.color} />
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 10,
  },
  activeIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: C.primary,
  },
  activeText: {
    fontSize: 13,
    fontWeight: '700',
    color: C.ink,
  },
  clearAllBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: C.bg,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: 6,
    paddingRight: 6,
    paddingVertical: 6,
    borderRadius: 12,
  },
  badgeIcon: {
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  closeBtn: {
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
