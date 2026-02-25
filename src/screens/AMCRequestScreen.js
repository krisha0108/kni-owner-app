/**
 * ============================================================================
 * AMC REQUEST SCREEN - MULTI-STEP FORM
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Alert, Modal, StatusBar,
  useWindowDimensions, Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { scale, moderateScale } from '../utils/responsive';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A', ink: '#1D2254', text: '#0F172A', muted: '#6B7280',
  bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6', purple: '#7C3AED',
};

const PLAN_TYPES = [
  { key: 'BASIC', label: 'Basic', desc: 'Preventive maintenance only', bg: '#D1FAE5', color: '#059669', icon: 'shield-outline' },
  { key: 'STANDARD', label: 'Standard', desc: 'Preventive + free breakdowns', bg: '#DBEAFE', color: '#2563EB', icon: 'shield-half-outline' },
  { key: 'PREMIUM', label: 'Premium', desc: 'Full coverage + priority + parts', bg: '#F3E8FF', color: '#7C3AED', icon: 'shield-checkmark' },
];

const FREQUENCY_OPTIONS = [
  { key: 'MONTHLY', label: 'Monthly' },
  { key: 'BI_MONTHLY', label: 'Bi-Monthly' },
  { key: 'QUARTERLY', label: 'Quarterly' },
];

const KITCHEN_TYPES = [
  { key: 'CLOUD_KITCHEN', label: 'Cloud Kitchen' },
  { key: 'QSR', label: 'QSR (Quick Service)' },
  { key: 'FINE_DINE', label: 'Fine Dine' },
  { key: 'HOTEL', label: 'Hotel' },
  { key: 'CAFE', label: 'Cafe' },
  { key: 'CATERING', label: 'Catering' },
];

export default function AMCRequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { restaurants, selectedRestaurantId } = useRestaurant();

  const [step, setStep] = useState(1);
  const [menuVisible, setMenuVisible] = useState(false);
  const [kitchenModal, setKitchenModal] = useState(false);
  const [dateModal, setDateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [restaurantId, setRestaurantId] = useState(selectedRestaurantId || '');
  const [kitchenType, setKitchenType] = useState('');
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [planType, setPlanType] = useState('');
  const [visitFrequency, setVisitFrequency] = useState('');
  const [preferredStartDate, setPreferredStartDate] = useState(null);
  const [notes, setNotes] = useState('');

  // Data
  const [categories, setCategories] = useState([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  // Active AMC check
  const [activeAMC, setActiveAMC] = useState(null);
  const [checkingAMC, setCheckingAMC] = useState(false);

  useEffect(() => {
    if (selectedRestaurantId) setRestaurantId(selectedRestaurantId);
  }, [selectedRestaurantId]);

  // Check if selected restaurant already has active AMC
  useEffect(() => {
    if (!restaurantId) {
      setActiveAMC(null);
      return;
    }
    setCheckingAMC(true);
    setActiveAMC(null);
    api.get(`/owner/amc-contracts?restaurantId=${restaurantId}`)
      .then(r => {
        const active = (r.data?.data || []).find(c => c.status === 'ACTIVE');
        setActiveAMC(active || null);
      })
      .catch(() => {})
      .finally(() => setCheckingAMC(false));
  }, [restaurantId]);

  useEffect(() => {
    setCategoriesLoading(true);
    api.get('/app/categories').then(r => {
      if (r.data?.ok) setCategories(r.data.data || []);
    }).catch(() => {}).finally(() => setCategoriesLoading(false));
  }, []);

  // Next 90 days for date picker
  const next90Days = useMemo(() => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    for (let i = 1; i <= 90; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  }, []);

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const selectedRestaurant = restaurants?.find(r => r.id === restaurantId);

  const canContinue = step === 1
    ? restaurantId && kitchenType && selectedCategories.length > 0 && !activeAMC && !checkingAMC
    : step === 2
    ? planType && visitFrequency && preferredStartDate
    : true;

  const handleNext = async () => {
    if (step < 3) {
      setStep(step + 1);
      return;
    }
    // Submit
    setSubmitting(true);
    try {
      const payload = {
        restaurantId,
        kitchenType,
        equipmentCategories: selectedCategories,
        planType,
        visitFrequency,
        preferredStartDate: preferredStartDate?.toISOString(),
        notes: notes || undefined,
      };
      const response = await api.post('/owner/amc-requests', payload);
      if (response.data?.ok) {
        Alert.alert('Success', 'AMC request submitted successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('AMCRequestsList') },
        ]);
      } else {
        throw new Error(response.data?.error || 'Failed to submit request');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || error.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  const renderStep1 = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Restaurant Selection */}
      {restaurants?.length > 1 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="restaurant-outline" size={scale(20)} color={C.purple} />
            <Text style={styles.sectionTitle}>Select Restaurant</Text>
          </View>
          {restaurants.map(r => (
            <TouchableOpacity
              key={r.id}
              style={[styles.optionCard, restaurantId === r.id && styles.optionCardActive]}
              onPress={() => setRestaurantId(r.id)}
            >
              <Icon name={restaurantId === r.id ? 'radio-button-on' : 'radio-button-off'} size={scale(20)} color={restaurantId === r.id ? C.purple : C.muted} />
              <Text style={[styles.optionText, restaurantId === r.id && { color: C.purple, fontWeight: '700' }]}>{r.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Active AMC Warning */}
      {checkingAMC && restaurantId ? (
        <View style={styles.amcCheckingBanner}>
          <ActivityIndicator size="small" color={C.purple} />
          <Text style={styles.amcCheckingText}>Checking existing AMC...</Text>
        </View>
      ) : null}
      {activeAMC ? (
        <View style={styles.amcActiveBanner}>
          <Icon name="alert-circle" size={scale(20)} color={C.danger} />
          <View style={{ flex: 1, marginLeft: scale(8) }}>
            <Text style={styles.amcActiveTitle}>AMC Already Active</Text>
            <Text style={styles.amcActiveText}>
              Contract {activeAMC.contractNumber} is active for this restaurant. You can renew from contract details.
            </Text>
          </View>
        </View>
      ) : null}

      {/* Kitchen Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="business-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Kitchen Type</Text>
        </View>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setKitchenModal(true)}>
          <Text style={kitchenType ? styles.dropdownText : styles.dropdownPlaceholder}>
            {kitchenType ? KITCHEN_TYPES.find(k => k.key === kitchenType)?.label : 'Select kitchen type'}
          </Text>
          <Icon name="chevron-down" size={scale(20)} color={C.muted} />
        </TouchableOpacity>
      </View>

      {/* Equipment Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="cube-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Equipment Categories</Text>
        </View>
        {categoriesLoading ? (
          <ActivityIndicator color={C.purple} style={{ padding: scale(20) }} />
        ) : (
          <View style={styles.chipsWrap}>
            {categories.map(cat => {
              const isSelected = selectedCategories.includes(cat.id);
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => toggleCategory(cat.id)}
                >
                  <Icon name={isSelected ? 'checkmark-circle' : 'add-circle-outline'} size={scale(16)} color={isSelected ? '#fff' : C.purple} />
                  <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>{cat.name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </View>

      <View style={{ height: scale(200) }} />
    </ScrollView>
  );

  const renderStep2 = () => (
    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* Plan Type */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="shield-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Select Plan</Text>
        </View>
        {PLAN_TYPES.map(plan => (
          <TouchableOpacity
            key={plan.key}
            style={[styles.planCard, planType === plan.key && { borderColor: C.purple, borderWidth: 2 }]}
            onPress={() => setPlanType(plan.key)}
          >
            <View style={[styles.planIconBox, { backgroundColor: plan.bg }]}>
              <Icon name={plan.icon} size={scale(24)} color={plan.color} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planDesc}>{plan.desc}</Text>
            </View>
            {planType === plan.key && (
              <Icon name="checkmark-circle" size={scale(24)} color={C.purple} />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Visit Frequency */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="repeat-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Visit Frequency</Text>
        </View>
        <View style={styles.freqRow}>
          {FREQUENCY_OPTIONS.map(freq => (
            <TouchableOpacity
              key={freq.key}
              style={[styles.freqChip, visitFrequency === freq.key && styles.freqChipActive]}
              onPress={() => setVisitFrequency(freq.key)}
            >
              <Text style={[styles.freqText, visitFrequency === freq.key && styles.freqTextActive]}>{freq.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Start Date */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Preferred Start Date</Text>
        </View>
        <TouchableOpacity style={styles.dropdownBtn} onPress={() => setDateModal(true)}>
          <Icon name="calendar" size={scale(20)} color={C.purple} />
          <Text style={preferredStartDate ? styles.dropdownText : styles.dropdownPlaceholder}>
            {preferredStartDate ? preferredStartDate.toDateString() : 'Tap to select date'}
          </Text>
          <Icon name="chevron-forward" size={scale(20)} color={C.muted} />
        </TouchableOpacity>
      </View>

      <View style={{ height: scale(200) }} />
    </ScrollView>
  );

  const renderStep3 = () => {
    const catNames = categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(', ');
    return (
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="document-text-outline" size={scale(20)} color={C.purple} />
            <Text style={styles.sectionTitle}>Review Your Request</Text>
          </View>

          <View style={styles.reviewCard}>
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Restaurant</Text>
              <Text style={styles.reviewValue}>{selectedRestaurant?.name || '-'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Kitchen Type</Text>
              <Text style={styles.reviewValue}>{KITCHEN_TYPES.find(k => k.key === kitchenType)?.label || '-'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Categories</Text>
              <Text style={styles.reviewValue}>{catNames || '-'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Plan Type</Text>
              <View style={[styles.planBadge, { backgroundColor: PLAN_TYPES.find(p => p.key === planType)?.bg || C.bg }]}>
                <Text style={{ color: PLAN_TYPES.find(p => p.key === planType)?.color || C.ink, fontWeight: '600', fontSize: moderateScale(12) }}>{planType || '-'}</Text>
              </View>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Frequency</Text>
              <Text style={styles.reviewValue}>{FREQUENCY_OPTIONS.find(f => f.key === visitFrequency)?.label || '-'}</Text>
            </View>
            <View style={styles.reviewDivider} />
            <View style={styles.reviewRow}>
              <Text style={styles.reviewLabel}>Start Date</Text>
              <Text style={styles.reviewValue}>{preferredStartDate?.toDateString() || '-'}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Icon name="create-outline" size={scale(20)} color={C.purple} />
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          </View>
          <TextInput
            style={styles.textArea}
            placeholder="Any special requirements or notes..."
            placeholderTextColor={C.muted}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />
        </View>

        <View style={{ height: scale(200) }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => step > 1 ? setStep(step - 1) : navigation.goBack()} style={styles.headerBackBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New AMC Request</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: scale(8) }}>
          <Icon name="menu" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
      </View>

      {/* Progress Steps */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s, idx) => {
          const isActive = step === s;
          const isCompleted = step > s;
          return (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, isActive && styles.progressDotActive, isCompleted && styles.progressDotCompleted]}>
                {isCompleted ? (
                  <Icon name="checkmark" size={scale(14)} color="#fff" />
                ) : (
                  <Text style={[styles.progressNum, (isActive || isCompleted) && styles.progressNumActive]}>{s}</Text>
                )}
              </View>
              {idx < 2 && <View style={[styles.progressLine, isCompleted && styles.progressLineCompleted]} />}
            </View>
          );
        })}
      </View>

      {/* Subtitle */}
      <Text style={styles.subtitle}>
        {step === 1 && 'Select restaurant, kitchen type, and categories'}
        {step === 2 && 'Choose your plan and schedule'}
        {step === 3 && 'Review and submit your request'}
      </Text>

      {/* Step Content */}
      {step === 1 && renderStep1()}
      {step === 2 && renderStep2()}
      {step === 3 && renderStep3()}

      {/* Footer */}
      <View style={[styles.footer, { bottom: scale(100) + Math.max(insets.bottom, scale(10)) + scale(20) }]}>
        <View style={styles.footerContent}>
          {step > 1 && (
            <TouchableOpacity style={styles.footerBackBtn} onPress={() => setStep(step - 1)}>
              <Icon name="arrow-back" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.continueBtn, !canContinue && styles.continueBtnDisabled]}
            disabled={!canContinue || submitting}
            onPress={handleNext}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Text style={styles.continueBtnText}>{step === 3 ? 'Submit Request' : 'Continue'}</Text>
                <Icon name={step === 3 ? 'checkmark-circle' : 'arrow-forward'} size={scale(18)} color="#fff" />
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Kitchen Type Modal */}
      <Modal visible={kitchenModal} transparent animationType="slide" onRequestClose={() => setKitchenModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Kitchen Type</Text>
              <TouchableOpacity onPress={() => setKitchenModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={scale(22)} color={C.ink} />
              </TouchableOpacity>
            </View>
            {KITCHEN_TYPES.map(kt => (
              <TouchableOpacity
                key={kt.key}
                style={[styles.modalOption, kitchenType === kt.key && styles.modalOptionActive]}
                onPress={() => { setKitchenType(kt.key); setKitchenModal(false); }}
              >
                <Icon name={kitchenType === kt.key ? 'radio-button-on' : 'radio-button-off'} size={scale(20)} color={kitchenType === kt.key ? C.purple : C.muted} />
                <Text style={[styles.modalOptionText, kitchenType === kt.key && { color: C.purple }]}>{kt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>

      {/* Date Modal */}
      <Modal visible={dateModal} transparent animationType="slide" onRequestClose={() => setDateModal(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Start Date</Text>
              <TouchableOpacity onPress={() => setDateModal(false)} style={styles.modalCloseBtn}>
                <Icon name="close" size={scale(22)} color={C.ink} />
              </TouchableOpacity>
            </View>
            <View style={styles.calendarHeader}>
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
                <Text key={i} style={styles.calendarDay}>{d}</Text>
              ))}
            </View>
            <ScrollView style={{ maxHeight: scale(300) }}>
              <View style={styles.calendarGrid}>
                {Array(next90Days[0]?.getDay() || 0).fill(null).map((_, i) => (
                  <View key={`pad-${i}`} style={styles.calendarCell} />
                ))}
                {next90Days.map((date) => {
                  const isSelected = preferredStartDate?.toDateString() === date.toDateString();
                  return (
                    <TouchableOpacity
                      key={date.toISOString()}
                      style={[styles.calendarCell, isSelected && styles.calendarCellActive]}
                      onPress={() => setPreferredStartDate(date)}
                    >
                      <Text style={[styles.calendarCellText, isSelected && styles.calendarCellTextActive]}>
                        {date.getDate()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>
            <TouchableOpacity
              style={[styles.modalBtn, !preferredStartDate && styles.modalBtnDisabled]}
              disabled={!preferredStartDate}
              onPress={() => setDateModal(false)}
            >
              <Text style={styles.modalBtnText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Active AMC Warning
  amcCheckingBanner: {
    flexDirection: 'row', alignItems: 'center', padding: scale(12),
    marginHorizontal: scale(16), marginTop: scale(8),
    backgroundColor: '#F3F4F6', borderRadius: scale(10),
  },
  amcCheckingText: {
    fontSize: moderateScale(13), color: C.muted, marginLeft: scale(8),
  },
  amcActiveBanner: {
    flexDirection: 'row', alignItems: 'flex-start', padding: scale(12),
    marginHorizontal: scale(16), marginTop: scale(8),
    backgroundColor: '#FEF2F2', borderRadius: scale(10),
    borderWidth: 1, borderColor: '#FECACA',
  },
  amcActiveTitle: {
    fontSize: moderateScale(14), fontWeight: '700', color: C.danger,
  },
  amcActiveText: {
    fontSize: moderateScale(12), color: '#991B1B', marginTop: scale(2), lineHeight: moderateScale(17),
  },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: scale(16), paddingVertical: scale(12), backgroundColor: C.card,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  headerBackBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },

  // Progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: scale(16), backgroundColor: C.card,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: scale(32), height: scale(32), borderRadius: scale(16), backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: C.purple },
  progressDotCompleted: { backgroundColor: C.ok },
  progressNum: { fontSize: moderateScale(14), fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: { width: scale(40), height: scale(2), backgroundColor: C.border, marginHorizontal: scale(8) },
  progressLineCompleted: { backgroundColor: C.ok },

  subtitle: {
    textAlign: 'center', fontSize: moderateScale(13), color: C.muted,
    paddingHorizontal: scale(16), paddingBottom: scale(12), backgroundColor: C.card,
  },

  // Content
  scrollContent: { flex: 1, padding: scale(16) },

  // Section
  section: { marginBottom: scale(20) },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(12) },
  sectionTitle: { fontSize: moderateScale(16), fontWeight: '800', color: C.ink },

  // Option cards (restaurant selection)
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: scale(12),
    backgroundColor: C.card, borderRadius: scale(12), padding: scale(14),
    marginBottom: scale(8), borderWidth: 1, borderColor: C.border,
  },
  optionCardActive: { borderColor: C.purple, backgroundColor: '#F3E8FF' },
  optionText: { fontSize: moderateScale(15), color: C.ink, fontWeight: '500' },

  // Dropdown
  dropdownBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(12), padding: scale(14), borderWidth: 1, borderColor: C.border, gap: scale(8),
  },
  dropdownText: { flex: 1, fontSize: moderateScale(15), fontWeight: '600', color: C.ink },
  dropdownPlaceholder: { flex: 1, fontSize: moderateScale(15), color: C.muted },

  // Chips
  chipsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(8) },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    paddingHorizontal: scale(14), paddingVertical: scale(10), borderRadius: scale(20),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  chipActive: { backgroundColor: C.purple, borderColor: C.purple },
  chipText: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  chipTextActive: { color: '#fff' },

  // Plan cards
  planCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(16), padding: scale(16), marginBottom: scale(10),
    borderWidth: 1, borderColor: C.border,
  },
  planIconBox: {
    width: scale(52), height: scale(52), borderRadius: scale(14),
    alignItems: 'center', justifyContent: 'center',
  },
  planInfo: { flex: 1, marginLeft: scale(14) },
  planLabel: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink },
  planDesc: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },

  // Frequency
  freqRow: { flexDirection: 'row', flexWrap: 'wrap', gap: scale(10) },
  freqChip: {
    paddingHorizontal: scale(18), paddingVertical: scale(12), borderRadius: scale(12),
    backgroundColor: C.card, borderWidth: 1, borderColor: C.border,
  },
  freqChipActive: { backgroundColor: C.purple, borderColor: C.purple },
  freqText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  freqTextActive: { color: '#fff' },

  // Review
  reviewCard: {
    backgroundColor: C.card, borderRadius: scale(16), padding: scale(16),
    borderWidth: 1, borderColor: C.border,
  },
  reviewRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: scale(10),
  },
  reviewLabel: { fontSize: moderateScale(13), color: C.muted, flex: 1 },
  reviewValue: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink, flex: 1, textAlign: 'right' },
  reviewDivider: { height: 1, backgroundColor: C.border },
  planBadge: { paddingHorizontal: scale(10), paddingVertical: scale(4), borderRadius: scale(8) },

  // Text area
  textArea: {
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    padding: scale(14), fontSize: moderateScale(15), color: C.text, minHeight: scale(100),
  },

  // Footer
  footer: {
    position: 'absolute', left: 0, right: 0,
    backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border,
    borderTopLeftRadius: scale(20), borderTopRightRadius: scale(20),
    paddingHorizontal: scale(16), paddingVertical: scale(14),
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1, shadowRadius: 12, elevation: 10,
  },
  footerContent: { flexDirection: 'row', gap: scale(10), justifyContent: 'flex-end' },
  footerBackBtn: {
    width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  continueBtn: {
    flexDirection: 'row', alignItems: 'center', gap: scale(8),
    backgroundColor: C.purple, paddingHorizontal: scale(24), paddingVertical: scale(12), borderRadius: scale(12),
  },
  continueBtnDisabled: { backgroundColor: '#C4B5FD' },
  continueBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },

  // Modal
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: {
    backgroundColor: C.card, borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24),
    padding: scale(20), maxHeight: SCREEN_HEIGHT * 0.8,
  },
  modalHeader: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: scale(20),
  },
  modalTitle: { fontSize: moderateScale(20), fontWeight: '800', color: C.ink },
  modalCloseBtn: {
    width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center',
  },
  modalOption: {
    flexDirection: 'row', alignItems: 'center', gap: scale(12),
    paddingVertical: scale(14), borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalOptionActive: { backgroundColor: '#F3E8FF', borderRadius: scale(8), paddingHorizontal: scale(8) },
  modalOptionText: { fontSize: moderateScale(15), fontWeight: '500', color: C.ink },
  modalBtn: {
    backgroundColor: C.purple, borderRadius: scale(12), paddingVertical: scale(14),
    alignItems: 'center', marginTop: scale(20),
  },
  modalBtnDisabled: { backgroundColor: '#C4B5FD' },
  modalBtnText: { fontSize: moderateScale(16), fontWeight: '700', color: '#fff' },

  // Calendar
  calendarHeader: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: scale(8) },
  calendarDay: { width: scale(40), textAlign: 'center', fontSize: moderateScale(13), fontWeight: '700', color: C.muted },
  calendarGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' },
  calendarCell: {
    width: '14.28%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center', marginBottom: scale(4),
  },
  calendarCellActive: { backgroundColor: C.purple, borderRadius: scale(10) },
  calendarCellText: { fontSize: moderateScale(14), fontWeight: '600', color: C.ink },
  calendarCellTextActive: { color: '#fff' },
});
