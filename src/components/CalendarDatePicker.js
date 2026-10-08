/**
 * Drill-down calendar date picker (day -> month -> year zoom), matching the
 * design used on the Equipment Service booking screen. Opens as a centered
 * modal overlay (not an inline dropdown) so it always sits in the middle of
 * the screen regardless of scroll position or a sticky bottom bar, and
 * disables any day/month/year that falls before `minDate`.
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { scale, moderateScale } from '../utils/responsive';

const MONTHS_S = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const MONTHS_F = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const C = { primary: '#EF3A3A', ink: '#1D2254', muted: '#6B7280', card: '#FFFFFF', border: '#E5E7EB' };

const getDaysInMonth = (m, y) => new Date(y, m + 1, 0).getDate();

export default function CalendarDatePicker({ value, onChange, minDate, placeholder = 'Tap to select date', style }) {
  const today = minDate ? new Date(minDate) : new Date();
  today.setHours(0, 0, 0, 0);
  const minYear = today.getFullYear();
  const minMonth = today.getMonth();
  const minDay = today.getDate();

  const [open, setOpen] = useState(false);
  const [pickerView, setPickerView] = useState('days'); // days | months | years
  const [pickerDay, setPickerDay] = useState(() => (value && value >= today ? value : today).getDate());
  const [pickerMonth, setPickerMonth] = useState(() => (value && value >= today ? value : today).getMonth());
  const [pickerYear, setPickerYear] = useState(() => (value && value >= today ? value : today).getFullYear());

  const daysInPickerMonth = getDaysInMonth(pickerMonth, pickerYear);
  const decadeStart = Math.floor(pickerYear / 10) * 10;

  const isDayDisabled = (d) => pickerYear === minYear && pickerMonth === minMonth && d < minDay;
  const isMonthDisabled = (m) => pickerYear === minYear && m < minMonth;
  const isYearDisabled = (y) => y < minYear;

  const calHeaderLabel =
    pickerView === 'days' ? `${MONTHS_F[pickerMonth]} ${pickerYear}`
    : pickerView === 'months' ? `${pickerYear}`
    : `${decadeStart} - ${decadeStart + 9}`;
  const calPrevDisabled =
    pickerView === 'days' ? (pickerYear === minYear && pickerMonth === minMonth)
    : pickerView === 'months' ? pickerYear <= minYear
    : decadeStart <= Math.floor(minYear / 10) * 10;

  const handleMonthChange = (m) => {
    if (isMonthDisabled(m)) return;
    const mx = getDaysInMonth(m, pickerYear);
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (pickerYear === minYear && m === minMonth && newDay < minDay) newDay = minDay;
    setPickerMonth(m);
    setPickerDay(newDay);
  };
  const handleYearChange = (y) => {
    if (y < minYear) return;
    const mx = getDaysInMonth(pickerMonth, y);
    let newMonth = pickerMonth;
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (y === minYear && newMonth < minMonth) { newMonth = minMonth; newDay = minDay; }
    else if (y === minYear && newMonth === minMonth && newDay < minDay) newDay = minDay;
    setPickerYear(y);
    setPickerMonth(newMonth);
    setPickerDay(newDay);
  };

  const goPrevMonth = () => {
    let m = pickerMonth - 1, y = pickerYear;
    if (m < 0) { m = 11; y -= 1; }
    if (y < minYear || (y === minYear && m < minMonth)) return;
    const mx = getDaysInMonth(m, y);
    let newDay = pickerDay > mx ? mx : pickerDay;
    if (y === minYear && m === minMonth && newDay < minDay) newDay = minDay;
    setPickerYear(y); setPickerMonth(m); setPickerDay(newDay);
  };
  const goNextMonth = () => {
    let m = pickerMonth + 1, y = pickerYear;
    if (m > 11) { m = 0; y += 1; }
    const mx = getDaysInMonth(m, y);
    const newDay = pickerDay > mx ? mx : pickerDay;
    setPickerYear(y); setPickerMonth(m); setPickerDay(newDay);
  };
  const calPrev = () => {
    if (pickerView === 'days') goPrevMonth();
    else if (pickerView === 'months') { if (pickerYear > minYear) handleYearChange(pickerYear - 1); }
    else if (decadeStart - 10 + 9 >= minYear) setPickerYear(decadeStart - 10);
  };
  const calNext = () => {
    if (pickerView === 'days') goNextMonth();
    else if (pickerView === 'months') handleYearChange(pickerYear + 1);
    else setPickerYear(decadeStart + 10);
  };
  const calZoomOut = () => {
    if (pickerView === 'days') setPickerView('months');
    else if (pickerView === 'months') setPickerView('years');
  };

  const openPicker = () => {
    const base = value && value >= today ? value : today;
    setPickerDay(base.getDate()); setPickerMonth(base.getMonth()); setPickerYear(base.getFullYear());
    setPickerView('days');
    setOpen(true);
  };

  const confirm = () => {
    let d = new Date(pickerYear, pickerMonth, pickerDay);
    d.setHours(0, 0, 0, 0);
    if (d < today) d = new Date(today);
    onChange?.(d);
    setOpen(false);
  };

  return (
    <View style={[st.anchor, style]}>
      <TouchableOpacity style={st.btn} onPress={openPicker}>
        <Icon name="calendar" size={scale(20)} color={value ? C.primary : C.muted} />
        <Text style={[st.btnText, !value && { color: C.muted }]}>
          {value ? `${value.getDate()} ${MONTHS_F[value.getMonth()]} ${value.getFullYear()}` : placeholder}
        </Text>
        <Icon name="chevron-forward" size={scale(20)} color={C.muted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={st.card} onPress={(e) => e.stopPropagation()}>
            <View style={st.preview}>
              <Text style={st.previewText}>{pickerDay} {MONTHS_F[pickerMonth]} {pickerYear}</Text>
            </View>

            <View style={st.navRow}>
              <TouchableOpacity disabled={calPrevDisabled} onPress={calPrev} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={st.navBtn}>
                <Icon name="chevron-back" size={scale(20)} color={calPrevDisabled ? C.border : '#fff'} />
              </TouchableOpacity>
              <TouchableOpacity onPress={calZoomOut} disabled={pickerView === 'years'} style={st.navTitleBtn}>
                <Text style={st.navTitle}>{calHeaderLabel}</Text>
                {pickerView !== 'years' && <Icon name="chevron-down" size={scale(14)} color="#fff" style={{ marginLeft: scale(4) }} />}
              </TouchableOpacity>
              <TouchableOpacity onPress={calNext} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} style={st.navBtn}>
                <Icon name="chevron-forward" size={scale(20)} color="#fff" />
              </TouchableOpacity>
            </View>

            <ScrollView style={st.gridScroll} nestedScrollEnabled showsVerticalScrollIndicator={false}>
              {pickerView === 'days' && (
                <>
                  <View style={st.weekRow}>
                    {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                      <Text key={i} style={st.weekLabel}>{d}</Text>
                    ))}
                  </View>
                  <View style={st.grid}>
                    {Array.from({ length: new Date(pickerYear, pickerMonth, 1).getDay() }).map((_, i) => (
                      <View key={`pad-${i}`} style={st.cell} />
                    ))}
                    {Array.from({ length: daysInPickerMonth }, (_, i) => i + 1).map((d) => (
                      <TouchableOpacity key={d} disabled={isDayDisabled(d)} style={st.cell} onPress={() => setPickerDay(d)}>
                        <View style={[st.cellInner, pickerDay === d && st.cellActive]}>
                          <Text style={[st.cellText, pickerDay === d && st.cellTextActive, isDayDisabled(d) && st.cellTextDisabled]}>{d}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}

              {pickerView === 'months' && (
                <View style={st.grid3}>
                  {MONTHS_S.map((m, i) => (
                    <TouchableOpacity key={m} disabled={isMonthDisabled(i)} style={st.grid3Cell} onPress={() => { handleMonthChange(i); setPickerView('days'); }}>
                      <View style={[st.gridBtn, pickerMonth === i && st.cellActive]}>
                        <Text style={[st.cellText, pickerMonth === i && st.cellTextActive, isMonthDisabled(i) && st.cellTextDisabled]}>{m}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {pickerView === 'years' && (
                <View style={st.grid3}>
                  {Array.from({ length: 12 }, (_, i) => decadeStart - 1 + i).map((y) => (
                    <TouchableOpacity key={y} disabled={isYearDisabled(y)} style={st.grid3Cell} onPress={() => { handleYearChange(y); setPickerView('months'); }}>
                      <View style={[st.gridBtn, pickerYear === y && st.cellActive]}>
                        <Text style={[st.cellText, pickerYear === y && st.cellTextActive, isYearDisabled(y) && st.cellTextDisabled]}>{y}</Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </ScrollView>

            <TouchableOpacity style={st.confirmBtn} onPress={confirm}>
              <Icon name="checkmark-circle" size={scale(20)} color="#FFFFFF" />
              <Text style={st.confirmText}>Confirm Date</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  anchor: { position: 'relative' },
  btn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(12), padding: scale(14), borderWidth: 1, borderColor: C.border, gap: scale(8),
  },
  btnText: { flex: 1, fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  backdrop: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'center', padding: scale(24),
  },
  card: {
    width: '100%', maxWidth: scale(340),
    backgroundColor: C.card, borderRadius: scale(16), borderWidth: 1, borderColor: C.border,
    padding: scale(12),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(8) }, shadowOpacity: 0.25, shadowRadius: scale(20), elevation: 16,
  },
  preview: { backgroundColor: C.ink, borderRadius: scale(8), paddingVertical: scale(7), alignItems: 'center', marginBottom: scale(8) },
  previewText: { fontSize: moderateScale(13.5), fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  navRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.primary, borderRadius: scale(10), paddingVertical: scale(7), paddingHorizontal: scale(7), marginBottom: scale(8) },
  navBtn: { width: scale(26), height: scale(26), alignItems: 'center', justifyContent: 'center' },
  navTitleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: scale(10) },
  navTitle: { fontSize: moderateScale(14), fontWeight: '800', color: '#FFFFFF', letterSpacing: 0.3 },
  gridScroll: { maxHeight: scale(260) },
  weekRow: { flexDirection: 'row', marginBottom: scale(4) },
  weekLabel: { width: '14.28%', textAlign: 'center', fontSize: moderateScale(10.5), fontWeight: '700', color: C.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(6) },
  cell: { width: '14.28%', height: scale(34), alignItems: 'center', justifyContent: 'center' },
  cellInner: { width: scale(29), height: scale(29), borderRadius: scale(15), alignItems: 'center', justifyContent: 'center' },
  cellActive: { backgroundColor: C.primary },
  cellText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  cellTextActive: { color: '#FFFFFF', fontWeight: '800' },
  cellTextDisabled: { color: C.border },
  grid3: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: scale(6) },
  grid3Cell: { width: '33.33%', padding: scale(3) },
  gridBtn: { height: scale(32), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center', backgroundColor: '#F5F7FA' },
  confirmBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(6), backgroundColor: C.primary, borderRadius: scale(10), paddingVertical: scale(11) },
  confirmText: { fontSize: moderateScale(14), fontWeight: '700', color: '#FFFFFF' },
});
