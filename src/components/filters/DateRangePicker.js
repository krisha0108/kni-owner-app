import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale } from '../../utils/responsive';

const C = {
  primary: '#EF3A3A',
  primaryLight: '#FEF2F2',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  info: '#3B82F6',
  infoLight: '#EFF6FF',
};

export default function DateRangePicker({ from, to, onChangeFrom, onChangeTo }) {
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const formatDate = (dateString) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return {
      day: date.getDate(),
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      year: date.getFullYear(),
    };
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

  const fromFormatted = formatDate(from);
  const toFormatted = formatDate(to);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {/* From Date */}
        <TouchableOpacity
          style={[styles.dateCard, from && styles.dateCardActive]}
          onPress={() => setShowFromPicker(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, from && styles.iconBoxActive]}>
            <Icon
              name="calendar"
              size={scale(18)}
              color={from ? C.info : C.muted}
            />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>From</Text>
            {fromFormatted ? (
              <View style={styles.dateValueRow}>
                <Text style={styles.dateDay}>{fromFormatted.day}</Text>
                <View>
                  <Text style={styles.dateMonth}>{fromFormatted.month}</Text>
                  <Text style={styles.dateYear}>{fromFormatted.year}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.datePlaceholder}>Select date</Text>
            )}
          </View>
          {from && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => onChangeFrom('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>

        {/* Arrow */}
        <View style={styles.arrowBox}>
          <Icon name="arrow-forward" size={scale(16)} color={C.muted} />
        </View>

        {/* To Date */}
        <TouchableOpacity
          style={[styles.dateCard, to && styles.dateCardActive]}
          onPress={() => setShowToPicker(true)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBox, to && styles.iconBoxActive]}>
            <Icon
              name="calendar"
              size={scale(18)}
              color={to ? C.info : C.muted}
            />
          </View>
          <View style={styles.dateInfo}>
            <Text style={styles.dateLabel}>To</Text>
            {toFormatted ? (
              <View style={styles.dateValueRow}>
                <Text style={styles.dateDay}>{toFormatted.day}</Text>
                <View>
                  <Text style={styles.dateMonth}>{toFormatted.month}</Text>
                  <Text style={styles.dateYear}>{toFormatted.year}</Text>
                </View>
              </View>
            ) : (
              <Text style={styles.datePlaceholder}>Select date</Text>
            )}
          </View>
          {to && (
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() => onChangeTo('')}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Icon name="close-circle" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
      </View>

      {/* Quick Select */}
      <View style={styles.quickSelect}>
        <Text style={styles.quickLabel}>Quick Select:</Text>
        <View style={styles.quickOptions}>
          {[
            { label: 'Today', days: 0 },
            { label: '7 Days', days: 7 },
            { label: '30 Days', days: 30 },
            { label: '90 Days', days: 90 },
          ].map((opt) => (
            <TouchableOpacity
              key={opt.label}
              style={styles.quickChip}
              onPress={() => {
                const today = new Date();
                const pastDate = new Date();
                pastDate.setDate(today.getDate() - opt.days);
                onChangeFrom(pastDate.toISOString().split('T')[0]);
                onChangeTo(today.toISOString().split('T')[0]);
              }}
            >
              <Text style={styles.quickChipText}>{opt.label}</Text>
            </TouchableOpacity>
          ))}
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
  container: {},
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
  },
  dateCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: scale(14),
    padding: scale(12),
    borderWidth: 1.5,
    borderColor: C.border,
    gap: scale(10),
  },
  dateCardActive: {
    backgroundColor: C.infoLight,
    borderColor: C.info,
  },
  iconBox: {
    width: scale(38),
    height: scale(38),
    borderRadius: scale(10),
    backgroundColor: C.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBoxActive: {
    backgroundColor: '#fff',
  },
  dateInfo: {
    flex: 1,
  },
  dateLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dateValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(6),
    marginTop: scale(2),
  },
  dateDay: {
    fontSize: moderateScale(24),
    fontWeight: '800',
    color: C.ink,
  },
  dateMonth: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: C.text,
  },
  dateYear: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: C.muted,
  },
  datePlaceholder: {
    fontSize: moderateScale(14),
    fontWeight: '500',
    color: C.muted,
    marginTop: scale(4),
  },
  clearBtn: {
    padding: scale(4),
  },
  arrowBox: {
    width: scale(28),
    height: scale(28),
    borderRadius: scale(14),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickSelect: {
    marginTop: scale(14),
  },
  quickLabel: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(8),
  },
  quickOptions: {
    flexDirection: 'row',
    gap: scale(8),
  },
  quickChip: {
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(10),
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
  },
  quickChipText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.text,
  },
});
