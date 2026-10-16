/**
 * ============================================================================
 * AMC REQUEST SCREEN - MULTI-STEP FORM
 * ============================================================================
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Modal, StatusBar,
  useWindowDimensions, Dimensions, Animated, Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
// Custom date picker - no external dependency needed
import { api } from '../api/client';
import { useRestaurant } from '../context/RestaurantContext';
import { invalidate } from '../utils/focusCache';
import CalendarDatePicker from '../components/CalendarDatePicker';
import { scale, moderateScale } from '../utils/responsive';
import useKeyboardCompensation from '../utils/useKeyboardCompensation';
import AppAlert from '../utils/AppAlert';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const C = {
  primary: '#EF3A3A', primaryDark: '#DC2626', ink: '#1D2254', text: '#0F172A', muted: '#6B7280',
  bg: '#F5F7FA', card: '#FFFFFF', border: '#E5E7EB', ok: '#10B981',
  warn: '#F59E0B', danger: '#EF4444', info: '#3B82F6', purple: '#7C3AED',
};

const PLAN_TYPES = [
  { key: 'STANDARD', label: 'Standard', desc: 'Preventive + free breakdowns', bg: '#DBEAFE', color: '#2563EB', icon: 'shield-half-outline' },
  { key: 'PREMIUM', label: 'Premium', desc: 'Full coverage + priority + parts', bg: '#F3E8FF', color: '#7C3AED', icon: 'shield-checkmark' },
];

const CONTRACT_CATEGORIES = [
  { key: 'AMC', label: 'AMC', desc: 'Covers service visits; parts/spares charged separately if needed', bg: '#DBEAFE', color: '#2563EB', icon: 'build-outline' },
  { key: 'CAMC', label: 'CAMC', desc: 'Comprehensive — service visits + parts/spares included', bg: '#F3E8FF', color: '#7C3AED', icon: 'shield-checkmark-outline' },
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
  { key: 'HOSPITAL', label: 'Hospital' },
  { key: 'INDUSTRIES', label: 'Industries' },
  { key: 'INSTITUTE', label: 'Institute' },
];

/* ─── Skeleton ─── */
function SkeletonChips({ pulse }) {
  return (
    <View style={styles.chipsWrap}>
      {Array.from({ length: 6 }).map((_, i) => (
        <Animated.View key={i} style={[styles.skelChip, { opacity: pulse, width: scale(70 + (i % 3) * 20) }]} />
      ))}
    </View>
  );
}

export default function AMCRequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { keyboardCompensation } = useKeyboardCompensation();
  const { restaurants, selectedRestaurantId } = useRestaurant();

  const [step, setStep] = useState(1);
  const [kitchenModal, setKitchenModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [restaurantId, setRestaurantId] = useState(selectedRestaurantId || '');
  const [contractCategory, setContractCategory] = useState('');
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

  const step3ScrollRef = useRef(null);

  // Scroll the Notes field above the keyboard every time it opens - using
  // the keyboard's own show event (not TextInput onFocus) so this still
  // fires on a second tap after the keyboard was dismissed once, when the
  // input can stay logically "focused" without onFocus firing again.
  useEffect(() => {
    if (step !== 3) return undefined;
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      step3ScrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => sub.remove();
  }, [step]);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

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
        const contracts = r.data?.data?.items || r.data?.data || [];
        const active = contracts.find(c => c.status === 'ACTIVE');
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

  const toggleCategory = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const selectedRestaurant = restaurants?.find(r => r.id === restaurantId);

  const canContinue = step === 1
    ? restaurantId && contractCategory && kitchenType && selectedCategories.length > 0 && !activeAMC && !checkingAMC
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
        contractCategory,
        kitchenType,
        equipmentCategories: selectedCategories,
        planType,
        visitFrequency,
        preferredStartDate: preferredStartDate?.toISOString(),
        notes: notes || undefined,
      };
      const response = await api.post('/owner/amc-requests', payload);
      if (response.data?.ok) {
        invalidate(`AMCRequestsList-${restaurantId}`);
        AppAlert.alert('Success', 'AMC request submitted successfully!', [
          { text: 'OK', onPress: () => navigation.navigate('AMCRequestsList') },
        ]);
      } else {
        throw new Error(response.data?.error || 'Failed to submit request');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || error.message || 'Failed to submit request');
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

      {/* Contract Category: AMC vs CAMC */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Icon name="document-text-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>AMC or CAMC?</Text>
        </View>
        {CONTRACT_CATEGORIES.map(cat => (
          <TouchableOpacity
            key={cat.key}
            style={[styles.planCard, contractCategory === cat.key && styles.planCardActive]}
            onPress={() => setContractCategory(cat.key)}
          >
            <View style={[styles.planIconBox, { backgroundColor: cat.bg }]}>
              <Icon name={cat.icon} size={scale(14)} color={cat.color} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>{cat.label}</Text>
              <Text style={styles.planDesc}>{cat.desc}</Text>
            </View>
            {contractCategory === cat.key && (
              <Icon name="checkmark-circle" size={scale(18)} color={C.purple} />
            )}
          </TouchableOpacity>
        ))}
      </View>

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
          <SkeletonChips pulse={pulse} />
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

      <View style={{ height: scale(100) }} />
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
            style={[styles.planCard, planType === plan.key && styles.planCardActive]}
            onPress={() => setPlanType(plan.key)}
          >
            <View style={[styles.planIconBox, { backgroundColor: plan.bg }]}>
              <Icon name={plan.icon} size={scale(14)} color={plan.color} />
            </View>
            <View style={styles.planInfo}>
              <Text style={styles.planLabel}>{plan.label}</Text>
              <Text style={styles.planDesc}>{plan.desc}</Text>
            </View>
            {planType === plan.key && (
              <Icon name="checkmark-circle" size={scale(18)} color={C.purple} />
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
      <View style={[styles.section, styles.sectionRaised]}>
        <View style={styles.sectionHeader}>
          <Icon name="calendar-outline" size={scale(20)} color={C.purple} />
          <Text style={styles.sectionTitle}>Preferred Start Date</Text>
        </View>
        <CalendarDatePicker value={preferredStartDate} onChange={setPreferredStartDate} />
      </View>

      <View style={{ height: scale(260) }} />
    </ScrollView>
  );

  const renderStep3 = () => {
    const catNames = categories.filter(c => selectedCategories.includes(c.id)).map(c => c.name).join(', ');
    return (
      <ScrollView ref={step3ScrollRef} style={styles.scrollContent} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: keyboardCompensation }} keyboardShouldPersistTaps="handled">
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
              <Text style={styles.reviewLabel}>Contract Type</Text>
              <View style={[styles.planBadge, { backgroundColor: CONTRACT_CATEGORIES.find(c => c.key === contractCategory)?.bg || C.bg }]}>
                <Text style={[styles.planBadgeText, { color: CONTRACT_CATEGORIES.find(c => c.key === contractCategory)?.color || C.ink }]}>{contractCategory || '-'}</Text>
              </View>
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
                <Text style={[styles.planBadgeText, { color: PLAN_TYPES.find(p => p.key === planType)?.color || C.ink }]}>{planType || '-'}</Text>
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

        <View style={{ height: scale(100) }} />
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <StatusBar translucent barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[styles.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={styles.headerBlobA} pointerEvents="none" />
        <View style={styles.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => step > 1 ? setStep(step - 1) : (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={styles.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(22)} color="#fff" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { flex: 1, marginLeft: scale(8) }]}>New AMC Request</Text>
      </LinearGradient>

      {/* Progress Steps */}
      <View style={styles.progressRow}>
        {[1, 2, 3].map((s, idx) => {
          const isActive = step === s;
          const isCompleted = step > s;
          return (
            <View key={s} style={styles.progressItem}>
              <View style={[styles.progressDot, isActive && styles.progressDotActive, isCompleted && styles.progressDotCompleted]}>
                {isCompleted ? (
                  <Icon name="checkmark" size={scale(11)} color="#fff" />
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

      {/* Sticky Continue/Submit bar - always visible, no scrolling needed.
          Rises above the keyboard (keyboardCompensation) so it's never
          hidden behind it, e.g. while typing in the Notes field on step 3.
          Uses keyboardCompensation, not the raw keyboard height, because
          some Android devices already resize the window for the keyboard
          (windowSoftInputMode="adjustResize") - adding the raw height on
          top of that would double-push this bar, leaving a gap above the
          keyboard. */}
      <View style={[styles.bottomBarWrap, { bottom: Math.max(scale(12), insets.bottom) + keyboardCompensation }]}>
        <View style={styles.bottomBar}>
          {step > 1 && (
            <TouchableOpacity style={styles.footerBackBtn} onPress={() => setStep(step - 1)}>
              <Icon name="arrow-back" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.continueBtn, (!canContinue || submitting) && styles.continueBtnDisabled]}
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
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: scale(16), paddingBottom: scale(12), overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  headerBackBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(14), backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center',
  },
  backBtnPlain: { width: scale(22), height: scale(32), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#fff' },

  // Progress
  progressRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: scale(9), backgroundColor: C.card,
  },
  progressItem: { flexDirection: 'row', alignItems: 'center' },
  progressDot: {
    width: scale(22), height: scale(22), borderRadius: scale(11), backgroundColor: C.border,
    alignItems: 'center', justifyContent: 'center',
  },
  progressDotActive: { backgroundColor: C.purple },
  progressDotCompleted: { backgroundColor: C.ok },
  progressNum: { fontSize: moderateScale(11), fontWeight: '700', color: C.muted },
  progressNumActive: { color: '#fff' },
  progressLine: { width: scale(26), height: scale(2), backgroundColor: C.border, marginHorizontal: scale(6) },
  progressLineCompleted: { backgroundColor: C.ok },

  subtitle: {
    textAlign: 'center', fontSize: moderateScale(11), color: C.muted,
    paddingHorizontal: scale(16), paddingBottom: scale(8), backgroundColor: C.card,
  },

  // Content
  scrollContent: { flex: 1, padding: scale(16) },

  // Section
  section: { marginBottom: scale(20) },
  sectionRaised: { zIndex: 30, elevation: 30 },
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
  skelChip: { height: scale(36), borderRadius: scale(20), backgroundColor: '#E2E8F0' },
  chipTextActive: { color: '#fff' },

  // Plan cards
  planCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
    borderRadius: scale(12), padding: scale(9), marginBottom: scale(8),
    borderWidth: 1, borderColor: C.border,
  },
  planCardActive: { borderColor: C.purple, borderWidth: 1.5 },
  planIconBox: {
    width: scale(32), height: scale(32), borderRadius: scale(9),
    alignItems: 'center', justifyContent: 'center',
  },
  planInfo: { flex: 1, marginLeft: scale(10) },
  planLabel: { fontSize: moderateScale(13.5), fontWeight: '700', color: C.ink },
  planDesc: { fontSize: moderateScale(10.5), color: C.muted, marginTop: scale(1) },

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
  planBadgeText: { fontWeight: '600', fontSize: moderateScale(12) },

  // Text area
  textArea: {
    backgroundColor: C.card, borderRadius: scale(12), borderWidth: 1, borderColor: C.border,
    padding: scale(14), fontSize: moderateScale(15), color: C.text, minHeight: scale(100),
  },

  // Sticky bottom bar (floating, always visible - no scrolling needed)
  bottomBarWrap: {
    position: 'absolute', left: scale(12), right: scale(12),
    borderRadius: scale(20), backgroundColor: C.card,
    shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 18, shadowOffset: { width: 0, height: 8 },
    elevation: 16,
  },
  bottomBar: {
    flexDirection: 'row', gap: scale(10),
    paddingHorizontal: scale(14), paddingVertical: scale(12),
    backgroundColor: C.card, borderRadius: scale(20), overflow: 'hidden',
  },
  footerBackBtn: {
    width: scale(44), height: scale(44), borderRadius: scale(12), backgroundColor: C.bg,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: C.border,
  },
  continueBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    backgroundColor: C.purple, paddingVertical: scale(14), borderRadius: scale(12),
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
});
