import React, { useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }) {
  const debouncedSearch = useMemo(
    () => debounce(onChangeText, 500),
    [onChangeText]
  );

  const handleClear = () => {
    onChangeText('');
  };

  return (
    <View style={styles.searchBox}>
      <Icon name="search-outline" size={18} color="#6B7280" style={styles.searchIcon} />
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        defaultValue={value}
        onChangeText={debouncedSearch}
        placeholderTextColor="#9CA3AF"
      />
      {value && (
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <Icon name="close-circle" size={18} color="#6B7280" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#1F2937',
    padding: 0,
  },
  clearBtn: {
    padding: 4,
  },
});
