import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function SortDropdown({ value, options, onChange }) {
  const [visible, setVisible] = useState(false);

  const selectedOption = options.find((opt) => opt.value === value);

  const handleSelect = (optionValue) => {
    onChange(optionValue);
    setVisible(false);
  };

  return (
    <>
      <TouchableOpacity style={styles.sortButton} onPress={() => setVisible(true)}>
        <Icon name="swap-vertical-outline" size={18} color="#6B7280" />
        <Text style={styles.sortText}>{selectedOption?.label || 'Sort'}</Text>
        <Icon name="chevron-down" size={16} color="#6B7280" />
      </TouchableOpacity>

      <Modal visible={visible} transparent animationType="fade">
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        >
          <View style={styles.dropdown}>
            <View style={styles.dropdownHeader}>
              <Text style={styles.dropdownTitle}>Sort By</Text>
              <TouchableOpacity onPress={() => setVisible(false)}>
                <Icon name="close" size={20} color="#6B7280" />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.optionsList}>
              {options.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.option,
                    value === option.value && styles.optionActive,
                  ]}
                  onPress={() => handleSelect(option.value)}
                >
                  <Text
                    style={[
                      styles.optionText,
                      value === option.value && styles.optionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {value === option.value && (
                    <Icon name="checkmark-circle" size={20} color="#EF3A3A" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  sortText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dropdown: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '80%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  dropdownTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1F2937',
  },
  optionsList: {
    maxHeight: 300,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  optionActive: {
    backgroundColor: '#FEF2F2',
  },
  optionText: {
    fontSize: 15,
    color: '#374151',
  },
  optionTextActive: {
    fontWeight: '600',
    color: '#EF3A3A',
  },
});
