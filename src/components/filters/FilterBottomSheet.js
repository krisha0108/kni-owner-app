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
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import DateRangePicker from './DateRangePicker';

const { height } = Dimensions.get('window');

export default function FilterBottomSheet({ visible, onClose, filters, onApply, config }) {
  const [localFilters, setLocalFilters] = useState(filters);

  useEffect(() => {
    setLocalFilters(filters);
  }, [filters]);

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

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.bottomSheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Filter {config?.title || 'Results'}</Text>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            {/* Status Filter */}
            {config?.showStatus && (
              <View style={styles.filterSection}>
                <Text style={styles.label}>Status</Text>
                <View style={styles.chipRow}>
                  {config.statusOptions.map((status) => (
                    <TouchableOpacity
                      key={status.value}
                      style={[
                        styles.chip,
                        localFilters.status === status.value && styles.chipActive,
                      ]}
                      onPress={() => setLocalFilters({ ...localFilters, status: status.value })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          localFilters.status === status.value && styles.chipTextActive,
                        ]}
                      >
                        {status.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Date Range */}
            {config?.showDateRange && (
              <View style={styles.filterSection}>
                <Text style={styles.label}>Date Range</Text>
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
                <Text style={styles.label}>Amount Range</Text>
                <View style={styles.row}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Min Amount</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="₹0"
                      value={localFilters.minAmount}
                      onChangeText={(v) => setLocalFilters({ ...localFilters, minAmount: v })}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Max Amount</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="₹0"
                      value={localFilters.maxAmount}
                      onChangeText={(v) => setLocalFilters({ ...localFilters, maxAmount: v })}
                      keyboardType="numeric"
                      placeholderTextColor="#9CA3AF"
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Category Filter */}
            {config?.showCategory && config?.categoryOptions && (
              <View style={styles.filterSection}>
                <Text style={styles.label}>Category</Text>
                <View style={styles.chipRow}>
                  {config.categoryOptions.map((category) => (
                    <TouchableOpacity
                      key={category.value}
                      style={[
                        styles.chip,
                        localFilters.category === category.value && styles.chipActive,
                      ]}
                      onPress={() => setLocalFilters({ ...localFilters, category: category.value })}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          localFilters.category === category.value && styles.chipTextActive,
                        ]}
                      >
                        {category.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
              <Text style={styles.applyButtonText}>Apply Filters</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  bottomSheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: height * 0.85,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1F2937',
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  filterSection: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 12,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  chipActive: {
    backgroundColor: '#EF3A3A',
    borderColor: '#EF3A3A',
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  inputContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#1F2937',
  },
  footer: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  resetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
  },
  resetButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  applyButton: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#EF3A3A',
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
