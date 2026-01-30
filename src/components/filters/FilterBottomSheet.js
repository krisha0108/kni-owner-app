import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  StyleSheet,
  Dimensions,
  Animated,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateRangePicker from './DateRangePicker';

const { height, width } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEF2F2',
  primaryDark: '#DC2626',
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
  danger: '#EF4444',
  dangerLight: '#FEF2F2',
};

// Status icons mapping
const STATUS_ICONS = {
  all: 'apps',
  PENDING: 'time',
  PENDING_PAYMENT: 'card',
  PAYMENT_UPLOADED: 'cloud-upload',
  PAYMENT_VERIFIED: 'checkmark-done',
  SCHEDULED: 'calendar',
  IN_PROGRESS: 'construct',
  COMPLETED: 'checkmark-circle',
  CANCELLED: 'close-circle',
  AVAILABLE: 'checkmark-circle',
  IN_USE: 'play-circle',
  MAINTENANCE: 'build',
  RETIRED: 'archive',
};

const getStatusColor = (value) => {
  switch (value) {
    case 'COMPLETED':
    case 'PAYMENT_VERIFIED':
    case 'AVAILABLE':
      return { bg: C.okLight, color: C.ok };
    case 'PENDING':
    case 'PENDING_PAYMENT':
    case 'MAINTENANCE':
      return { bg: C.warnLight, color: C.warn };
    case 'CANCELLED':
    case 'RETIRED':
      return { bg: C.dangerLight, color: C.danger };
    case 'SCHEDULED':
    case 'IN_PROGRESS':
    case 'IN_USE':
      return { bg: C.infoLight, color: C.info };
    default:
      return { bg: C.bg, color: C.muted };
  }
};

export default function FilterBottomSheet({ visible, onClose, filters, onApply, config }) {
  const [localFilters, setLocalFilters] = useState(filters);
  const slideAnim = useState(new Animated.Value(height))[0];
  const backdropAnim = useState(new Animated.Value(0))[0];

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 11,
        }),
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: height,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const handleApply = () => {
    onApply(localFilters);
    onClose();
  };

  const handleReset = () => {
    const resetFilters = {
      search: '',
      status: 'all',
      dateFrom: '',
      dateTo: '',
      minAmount: '',
      maxAmount: '',
      sortBy: 'date-desc',
    };
    setLocalFilters(resetFilters);
  };

  const countActiveFilters = () => {
    let count = 0;
    if (localFilters.status && localFilters.status !== 'all') count++;
    if (localFilters.dateFrom) count++;
    if (localFilters.dateTo) count++;
    if (localFilters.minAmount) count++;
    if (localFilters.maxAmount) count++;
    return count;
  };

  return (
    <Modal visible={visible} animationType="none" transparent>
      <View style={styles.container}>
        <Animated.View
          style={[styles.backdrop, { opacity: backdropAnim }]}
        >
          <TouchableOpacity style={styles.backdropTouch} onPress={onClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.bottomSheet,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle */}
          <View style={styles.handleContainer}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={styles.headerIcon}>
                <Icon name="options" size={20} color={C.primary} />
              </View>
              <View>
                <Text style={styles.title}>Filters</Text>
                <Text style={styles.subtitle}>
                  {countActiveFilters()} active filters
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Icon name="close" size={22} color={C.muted} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Status Filter */}
            {config?.showStatus && (
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="flag" size={18} color={C.ink} />
                  <Text style={styles.label}>Status</Text>
                </View>
                <View style={styles.statusGrid}>
                  {config.statusOptions.map((status) => {
                    const isActive = localFilters.status === status.value;
                    const statusColor = getStatusColor(status.value);
                    const iconName = STATUS_ICONS[status.value] || 'ellipse';

                    return (
                      <TouchableOpacity
                        key={status.value}
                        style={[
                          styles.statusChip,
                          isActive && styles.statusChipActive,
                          isActive && { backgroundColor: C.primary, borderColor: C.primary },
                        ]}
                        onPress={() => setLocalFilters({ ...localFilters, status: status.value })}
                        activeOpacity={0.7}
                      >
                        <View
                          style={[
                            styles.statusIconBox,
                            { backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : statusColor.bg },
                          ]}
                        >
                          <Icon
                            name={iconName}
                            size={14}
                            color={isActive ? '#fff' : statusColor.color}
                          />
                        </View>
                        <Text
                          style={[
                            styles.statusChipText,
                            isActive && styles.statusChipTextActive,
                          ]}
                          numberOfLines={1}
                        >
                          {status.label}
                        </Text>
                        {isActive && (
                          <Icon name="checkmark" size={14} color="#fff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Date Range */}
            {config?.showDateRange && (
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="calendar" size={18} color={C.ink} />
                  <Text style={styles.label}>Date Range</Text>
                </View>
                <DateRangePicker
                  from={localFilters.dateFrom}
                  to={localFilters.dateTo}
                  onChangeFrom={(d) => setLocalFilters({ ...localFilters, dateFrom: d })}
                  onChangeTo={(d) => setLocalFilters({ ...localFilters, dateTo: d })}
                />
              </View>
            )}

            {/* Amount Range */}
            {config?.showAmountRange && (
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="cash" size={18} color={C.ink} />
                  <Text style={styles.label}>Amount Range</Text>
                </View>
                <View style={styles.amountRow}>
                  <View style={styles.amountInput}>
                    <View style={styles.amountIconBox}>
                      <Text style={styles.amountIcon}>₹</Text>
                    </View>
                    <TextInput
                      style={styles.amountField}
                      placeholder="Min"
                      value={localFilters.minAmount}
                      onChangeText={(v) => setLocalFilters({ ...localFilters, minAmount: v })}
                      keyboardType="numeric"
                      placeholderTextColor={C.muted}
                    />
                  </View>
                  <View style={styles.amountDivider}>
                    <View style={styles.amountDividerLine} />
                    <Text style={styles.amountDividerText}>to</Text>
                    <View style={styles.amountDividerLine} />
                  </View>
                  <View style={styles.amountInput}>
                    <View style={styles.amountIconBox}>
                      <Text style={styles.amountIcon}>₹</Text>
                    </View>
                    <TextInput
                      style={styles.amountField}
                      placeholder="Max"
                      value={localFilters.maxAmount}
                      onChangeText={(v) => setLocalFilters({ ...localFilters, maxAmount: v })}
                      keyboardType="numeric"
                      placeholderTextColor={C.muted}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Category Filter */}
            {config?.showCategory && config?.categoryOptions && (
              <View style={styles.filterSection}>
                <View style={styles.sectionHeader}>
                  <Icon name="pricetag" size={18} color={C.ink} />
                  <Text style={styles.label}>Category</Text>
                </View>
                <View style={styles.statusGrid}>
                  {config.categoryOptions.map((category) => {
                    const isActive = localFilters.category === category.value;
                    return (
                      <TouchableOpacity
                        key={category.value}
                        style={[
                          styles.statusChip,
                          isActive && styles.statusChipActive,
                          isActive && { backgroundColor: C.primary, borderColor: C.primary },
                        ]}
                        onPress={() => setLocalFilters({ ...localFilters, category: category.value })}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.statusChipText,
                            isActive && styles.statusChipTextActive,
                          ]}
                        >
                          {category.label}
                        </Text>
                        {isActive && (
                          <Icon name="checkmark" size={14} color="#fff" />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Icon name="refresh" size={18} color={C.muted} />
              <Text style={styles.resetButtonText}>Reset All</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Icon name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backdropTouch: {
    flex: 1,
  },
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.card,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 20,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 4,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: C.ink,
  },
  subtitle: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },
  closeBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  statusChipActive: {
    borderWidth: 1.5,
  },
  statusIconBox: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  statusChipTextActive: {
    color: '#fff',
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  amountInput: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: C.border,
    overflow: 'hidden',
  },
  amountIconBox: {
    width: 44,
    height: 48,
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: C.border,
  },
  amountIcon: {
    fontSize: 18,
    fontWeight: '700',
    color: C.muted,
  },
  amountField: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontWeight: '600',
    color: C.text,
  },
  amountDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  amountDividerLine: {
    width: 8,
    height: 2,
    backgroundColor: C.border,
    borderRadius: 1,
  },
  amountDividerText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.muted,
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: C.border,
    backgroundColor: C.card,
  },
  resetButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
  },
  resetButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.muted,
  },
  applyButton: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: C.primary,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});
