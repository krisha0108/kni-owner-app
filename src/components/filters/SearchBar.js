import React, { useState, useMemo } from 'react';
import { View, TextInput, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { debounce } from 'lodash';

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEF2F2',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
};

export default function SearchBar({ value, onChangeText, placeholder = 'Search...' }) {
  const [isFocused, setIsFocused] = useState(false);
  const focusAnim = useState(new Animated.Value(0))[0];

  const debouncedSearch = useMemo(
    () => debounce(onChangeText, 300),
    [onChangeText]
  );

  const handleFocus = () => {
    setIsFocused(true);
    Animated.spring(focusAnim, {
      toValue: 1,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.spring(focusAnim, {
      toValue: 0,
      useNativeDriver: false,
      tension: 50,
      friction: 7,
    }).start();
  };

  const handleClear = () => {
    onChangeText('');
  };

  const borderColor = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [C.border, C.primary],
  });

  const shadowOpacity = focusAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.03, 0.12],
  });

  return (
    <Animated.View
      style={[
        styles.searchBox,
        {
          borderColor,
          shadowOpacity,
        },
      ]}
    >
      <View style={[styles.iconContainer, isFocused && styles.iconContainerActive]}>
        <Icon
          name="search"
          size={18}
          color={isFocused ? C.primary : C.muted}
        />
      </View>
      <TextInput
        style={styles.searchInput}
        placeholder={placeholder}
        defaultValue={value}
        onChangeText={debouncedSearch}
        placeholderTextColor="#9CA3AF"
        onFocus={handleFocus}
        onBlur={handleBlur}
      />
      {value ? (
        <TouchableOpacity onPress={handleClear} style={styles.clearBtn}>
          <View style={styles.clearBtnInner}>
            <Icon name="close" size={14} color="#fff" />
          </View>
        </TouchableOpacity>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: 16,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 2,
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainerActive: {
    backgroundColor: C.primaryLight,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: '500',
    color: C.text,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 8,
  },
  clearBtnInner: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
