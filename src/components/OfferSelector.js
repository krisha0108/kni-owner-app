import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  muted: '#6B7280',
  bg: '#F5F7FA',
  border: '#E5E7EB',
  ok: '#10B981',
  card: '#FFFFFF',
};

const formatPrice = (amount) => `₹${Math.round(amount || 0).toLocaleString('en-IN')}`;
const keyOf = (offerId) => offerId ?? 'none';

/**
 * Lets the owner pick which eligible offer to apply, instead of always
 * silently getting whichever one saves the most. `candidates` comes straight
 * from GET /owner/effective-discount (always includes a "No discount" entry,
 * so there's always something selected). A tappable field shows the current
 * pick and opens a bottom-sheet list to change it - mirrors the web
 * src/app/owner/components/offer-selector.tsx counterpart (dropdown there).
 */
export default function OfferSelector({ candidates, selectedOfferId, onSelect }) {
  const [open, setOpen] = useState(false);

  if (!candidates || candidates.length <= 1) return null; // nothing but "No discount"

  const selected = candidates.find((c) => keyOf(c.offerId) === keyOf(selectedOfferId ?? null)) || candidates[0];

  return (
    <View style={st.container}>
      <Text style={st.label}>Available Offers</Text>
      <TouchableOpacity style={st.trigger} onPress={() => setOpen(true)} activeOpacity={0.7}>
        <Text style={st.triggerText} numberOfLines={1}>{selected.source}</Text>
        <View style={st.triggerRight}>
          {selected.amount > 0 && (
            <Text style={st.triggerAmount}>-{formatPrice(selected.amount)}</Text>
          )}
          <Icon name="chevron-down" size={18} color={C.muted} />
        </View>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={st.overlay}>
          <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={st.sheet}>
            <View style={st.handleBar} />
            <View style={st.sheetHeader}>
              <Text style={st.sheetTitle}>Available Offers</Text>
              <TouchableOpacity onPress={() => setOpen(false)} style={st.closeBtn}>
                <Icon name="close" size={20} color={C.ink} />
              </TouchableOpacity>
            </View>
            {candidates.map((c) => {
              const value = keyOf(c.offerId);
              const isSelected = keyOf(selectedOfferId ?? null) === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[st.row, isSelected && st.rowSelected]}
                  onPress={() => { onSelect(c.offerId ?? null); setOpen(false); }}
                  activeOpacity={0.7}
                >
                  <View style={st.rowLeft}>
                    <View style={[st.radioOuter, isSelected && st.radioOuterSelected]}>
                      {isSelected && <View style={st.radioInner} />}
                    </View>
                    <Text style={st.rowText} numberOfLines={1}>{c.source}</Text>
                  </View>
                  <Text style={[st.rowAmount, c.amount > 0 ? { color: C.ok } : { color: C.muted }]}>
                    {c.amount > 0 ? `-${formatPrice(c.amount)}` : '—'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { marginTop: 4 },
  label: { fontSize: 13, fontWeight: '600', color: C.ink, marginBottom: 6 },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  triggerText: { fontSize: 13, color: C.ink, flexShrink: 1, flex: 1 },
  triggerRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  triggerAmount: { fontSize: 13, fontWeight: '600', color: C.ok },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: C.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 30,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
    marginBottom: 12,
  },
  sheetTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  rowSelected: { borderColor: C.primary, backgroundColor: '#FDECEC' },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: C.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterSelected: { borderColor: C.primary },
  radioInner: { width: 9, height: 9, borderRadius: 5, backgroundColor: C.primary },
  rowText: { fontSize: 13, color: C.ink, flexShrink: 1 },
  rowAmount: { fontSize: 13, fontWeight: '600', marginLeft: 8 },
});
