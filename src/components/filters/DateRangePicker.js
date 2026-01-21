import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';

export default function DateRangePicker({ from, to, onChangeFrom, onChangeTo }) {
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return 'Select Date';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const handleFromChange = (event, selectedDate) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChangeFrom(selectedDate.toISOString().split('T')[0]);
    }
  };

  const handleToChange = (event, selectedDate) => {
    setShowToPicker(Platform.OS === 'ios');
    if (selectedDate) {
      onChangeTo(selectedDate.toISOString().split('T')[0]);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* From Date */}
        <View style={styles.dateContainer}>
          <Text style={styles.label}>From</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowFromPicker(true)}
          >
            <Icon name="calendar-outline" size={18} color="#6B7280" />
            <Text style={[styles.dateText, !from && styles.placeholderText]}>
              {formatDate(from)}
            </Text>
          </TouchableOpacity>
        </View>

        {/* To Date */}
        <View style={styles.dateContainer}>
          <Text style={styles.label}>To</Text>
          <TouchableOpacity
            style={styles.dateButton}
            onPress={() => setShowToPicker(true)}
          >
            <Icon name="calendar-outline" size={18} color="#6B7280" />
            <Text style={[styles.dateText, !to && styles.placeholderText]}>
              {formatDate(to)}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* From Date Picker */}
      {showFromPicker && (
        <DateTimePicker
          value={from ? new Date(from) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleFromChange}
        />
      )}

      {/* To Date Picker */}
      {showToPicker && (
        <DateTimePicker
          value={to ? new Date(to) : new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleToChange}
          minimumDate={from ? new Date(from) : undefined}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  dateContainer: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 6,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  dateText: {
    fontSize: 14,
    color: '#1F2937',
  },
  placeholderText: {
    color: '#9CA3AF',
  },
});
