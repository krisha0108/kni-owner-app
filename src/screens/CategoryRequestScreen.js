/**
 * ============================================================================
 * CATEGORY REQUEST SCREEN - PREMIUM DESIGN WITH MODAL FORM
 * ============================================================================
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';
import { useRestaurant } from '../context/RestaurantContext';

import { scale, moderateScale } from '../utils/responsive';
import { usePermissions } from '../utils/usePermissions';
import AppAlert from '../utils/AppAlert';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
// Premium Color Palette
const C = {
  primary: '#EF3A3A',
  primaryDark: '#DC2626',
  primaryLight: '#FEE2E2',
  ink: '#1E293B',
  text: '#475569',
  muted: '#94A3B8',
  bg: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  pendingBg: '#FFFBEB',
  pendingColor: '#D97706',
  pendingBorder: '#FDE68A',
  approvedBg: '#ECFDF5',
  approvedColor: '#059669',
  approvedBorder: '#A7F3D0',
  rejectedBg: '#FEF2F2',
  rejectedColor: '#DC2626',
  rejectedBorder: '#FECACA',
};

const getStatusConfig = (status) => {
  const configs = {
    PENDING: {
      bg: C.pendingBg,
      color: C.pendingColor,
      border: C.pendingBorder,
      icon: 'time',
      label: 'Pending',
    },
    APPROVED: {
      bg: C.approvedBg,
      color: C.approvedColor,
      border: C.approvedBorder,
      icon: 'checkmark-circle',
      label: 'Approved',
    },
    REJECTED: {
      bg: C.rejectedBg,
      color: C.rejectedColor,
      border: C.rejectedBorder,
      icon: 'close-circle',
      label: 'Rejected',
    },
  };
  return configs[status] || configs.PENDING;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

/* ─── Skeleton ─── */
function SkeletonRequestsList({ pulse }) {
  return (
    <View style={st.requestsList}>
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} style={st.requestCard}>
          <View style={st.cardHeader}>
            <Animated.View style={[st.skelBadge, { opacity: pulse }]} />
            <Animated.View style={[st.skelDate, { opacity: pulse }]} />
          </View>
          <Animated.View style={[st.skelTitle, { opacity: pulse }]} />
          <Animated.View style={[st.skelDesc, { opacity: pulse }]} />
        </View>
      ))}
    </View>
  );
}

export default function CategoryRequestScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { can } = usePermissions();
  const { selectedRestaurantId } = useRestaurant();
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const [myRequests, setMyRequests] = useState([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  const loadMyRequests = useCallback(async () => {
    try {
      const response = await api.get('/owner/category-request', {
        params: { restaurantId: selectedRestaurantId },
      });
      if (response.data?.ok) {
        setMyRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Load requests error:', error);
    } finally {
      setLoadingRequests(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMyRequests();
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      return AppAlert.alert('Error', 'Category name is required');
    }

    setSubmitting(true);
    try {
      const response = await api.post('/owner/category-request', {
        restaurantId: selectedRestaurantId,
        categoryName: categoryName.trim(),
        description: description.trim(),
        reason: reason.trim(),
      });

      if (response.data?.ok) {
        AppAlert.alert('Success', 'Your category request has been submitted for review.');
        setCategoryName('');
        setDescription('');
        setReason('');
        setModalVisible(false);
        loadMyRequests();
      } else {
        throw new Error(response.data?.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('Category request error:', error);
      AppAlert.alert('Error', error.message || 'Could not submit category request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (request) => {
    AppAlert.alert(
      'Delete Request',
      `Are you sure you want to delete "${request.requestedName}" request?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingId(request.id);
            try {
              const response = await api.delete(`/owner/category-request/${request.id}`);
              if (response.data?.ok) {
                AppAlert.alert('Deleted', 'Request deleted successfully');
                loadMyRequests();
              } else {
                throw new Error(response.data?.error || 'Failed to delete');
              }
            } catch (error) {
              AppAlert.alert('Error', error.message || 'Could not delete request');
            } finally {
              setDeletingId(null);
            }
          },
        },
      ]
    );
  };

  const isFormValid = categoryName.trim().length > 0;

  const pendingCount = myRequests.filter(r => r.status === 'PENDING').length;
  const approvedCount = myRequests.filter(r => r.status === 'APPROVED').length;
  const rejectedCount = myRequests.filter(r => r.status === 'REJECTED').length;

  const renderRequestCard = (request) => {
    const statusConfig = getStatusConfig(request.status);
    const isDeleting = deletingId === request.id;

    return (
      <View
        key={request.id}
        style={[
          st.requestCard,
          { borderColor: statusConfig.border, borderWidth: 1.5 },
        ]}
      >
        {/* Header Row */}
        <View style={st.cardHeader}>
          <View style={[st.statusBadge, { backgroundColor: statusConfig.bg }]}>
            <Icon name={statusConfig.icon} size={scale(14)} color={statusConfig.color} />
            <Text style={[st.statusText, { color: statusConfig.color }]}>{statusConfig.label}</Text>
          </View>
          <Text style={st.dateText}>{formatDate(request.createdAt)}</Text>
        </View>

        {/* Category Name */}
        <Text style={st.categoryName}>{request.requestedName}</Text>

        {/* Description */}
        {request.description && (
          <Text style={st.descText} numberOfLines={2}>{request.description}</Text>
        )}

        {/* Rejection Reason */}
        {request.status === 'REJECTED' && request.rejectionReason && (
          <View style={st.rejectionBox}>
            <Icon name="alert-circle" size={scale(14)} color={C.rejectedColor} />
            <Text style={st.rejectionText}>{request.rejectionReason}</Text>
          </View>
        )}

        {/* Delete Button for Pending */}
        {request.status === 'PENDING' && (
          <TouchableOpacity
            style={st.deleteBtn}
            onPress={() => handleDelete(request)}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <ActivityIndicator size="small" color={C.rejectedColor} />
            ) : (
              <>
                <Icon name="trash-outline" size={scale(16)} color={C.rejectedColor} />
                <Text style={st.deleteBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />

      {/* Header */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={[st.header, { paddingTop: insets.top + scale(12) }]}>
        <View style={st.headerBlobA} pointerEvents="none" />
        <View style={st.headerBlobB} pointerEvents="none" />
        <TouchableOpacity
          onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}
          style={st.backBtnPlain}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity style={st.menuBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={scale(18)} color="#fff" />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Category Requests</Text>
        </View>
        {/* New Request Button in Header */}
        {can('category:create') && (
        <TouchableOpacity style={st.newReqBtn} onPress={() => setModalVisible(true)}>
          <Icon name="add" size={scale(18)} color="#FFF" />
          <Text style={st.newReqBtnText}>New</Text>
        </TouchableOpacity>
        )}
      </LinearGradient>

      <ScrollView
        style={st.content}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Stats Cards */}
        <View style={st.statsRow}>
          <View style={[st.statCard, { backgroundColor: C.pendingBg, borderColor: C.pendingBorder }]}>
            <Icon name="time" size={scale(20)} color={C.pendingColor} />
            <Text style={[st.statCount, { color: C.pendingColor }]}>{pendingCount}</Text>
            <Text style={st.statLabel}>Pending</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: C.approvedBg, borderColor: C.approvedBorder }]}>
            <Icon name="checkmark-circle" size={scale(20)} color={C.approvedColor} />
            <Text style={[st.statCount, { color: C.approvedColor }]}>{approvedCount}</Text>
            <Text style={st.statLabel}>Approved</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: C.rejectedBg, borderColor: C.rejectedBorder }]}>
            <Icon name="close-circle" size={scale(20)} color={C.rejectedColor} />
            <Text style={[st.statCount, { color: C.rejectedColor }]}>{rejectedCount}</Text>
            <Text style={st.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Requests List */}
        {loadingRequests ? (
          <SkeletonRequestsList pulse={pulse} />
        ) : myRequests.length === 0 ? (
          <View style={st.emptyBox}>
            <Icon name="folder-open-outline" size={scale(48)} color={C.muted} />
            <Text style={st.emptyTitle}>No Requests Yet</Text>
            <Text style={st.emptyText}>Tap "New" button to submit your first request</Text>
          </View>
        ) : (
          <View style={st.requestsList}>
            {myRequests.map(renderRequestCard)}
          </View>
        )}

        <View style={{ height: scale(100) }} />
      </ScrollView>

      {/* New Request Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={st.modalOverlay}
        >
          <View style={st.modalContainer}>
            {/* Modal Header */}
            <View style={st.modalHeader}>
              <View style={st.modalIconBox}>
                <Icon name="add-circle" size={scale(24)} color={C.primary} />
              </View>
              <View style={st.modalHeaderText}>
                <Text style={st.modalTitle}>New Category Request</Text>
                <Text style={st.modalSubtitle}>Submit a request for a new category</Text>
              </View>
              <TouchableOpacity style={st.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Icon name="close" size={scale(22)} color={C.muted} />
              </TouchableOpacity>
            </View>

            {/* Modal Form - Scrollable */}
            <ScrollView
              style={st.modalScroll}
              contentContainerStyle={st.modalScrollContent}
              showsVerticalScrollIndicator={true}
              keyboardShouldPersistTaps="handled"
              bounces={false}
            >
              {/* Category Name Input */}
              <View style={st.inputGroup}>
                <View style={st.inputLabelRow}>
                  <Text style={st.inputLabel}>Category Name</Text>
                  <Text style={st.requiredBadge}>Required</Text>
                </View>
                <View style={[st.inputBox, categoryName && st.inputBoxActive]}>
                  <Icon name="pricetag-outline" size={scale(18)} color={categoryName ? C.primary : C.muted} />
                  <TextInput
                    style={st.input}
                    placeholder="e.g., Seafood, Vegan, Italian"
                    value={categoryName}
                    onChangeText={setCategoryName}
                    placeholderTextColor={C.muted}
                    maxLength={50}
                  />
                </View>
              </View>

              {/* Description Input */}
              <View style={st.inputGroup}>
                <View style={st.inputLabelRow}>
                  <Text style={st.inputLabel}>Description</Text>
                  <Text style={st.optionalBadge}>Optional</Text>
                </View>
                <View style={[st.inputBox, st.textAreaBox, description && st.inputBoxActive]}>
                  <TextInput
                    style={[st.input, st.textArea]}
                    placeholder="Describe what this category represents..."
                    value={description}
                    onChangeText={setDescription}
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                    maxLength={200}
                  />
                </View>
              </View>

              {/* Reason Input */}
              <View style={st.inputGroup}>
                <View style={st.inputLabelRow}>
                  <Text style={st.inputLabel}>Reason</Text>
                  <Text style={st.optionalBadge}>Optional</Text>
                </View>
                <View style={[st.inputBox, st.textAreaBox, reason && st.inputBoxActive]}>
                  <TextInput
                    style={[st.input, st.textArea]}
                    placeholder="Why do you need this category?"
                    value={reason}
                    onChangeText={setReason}
                    placeholderTextColor={C.muted}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    maxLength={300}
                  />
                </View>
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={st.modalActions}>
              <TouchableOpacity style={st.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={st.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[st.submitBtn, (!isFormValid || submitting) && st.submitBtnDisabled]}
                onPress={handleSubmit}
                disabled={!isFormValid || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <>
                    <Icon name="send" size={scale(18)} color="#FFF" />
                    <Text style={st.submitBtnText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} active="home" />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingBottom: scale(12),
    overflow: 'hidden',
  },
  headerBlobA: { position: 'absolute', width: scale(140), height: scale(140), borderRadius: scale(70), backgroundColor: 'rgba(255,255,255,0.08)', top: scale(-50), right: scale(-30) },
  headerBlobB: { position: 'absolute', width: scale(90), height: scale(90), borderRadius: scale(45), backgroundColor: 'rgba(255,255,255,0.06)', bottom: scale(-40), left: scale(40) },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnPlain: { width: scale(26), height: scale(40), alignItems: 'center', justifyContent: 'center', marginRight: scale(4) },
  headerCenter: { flex: 1, marginLeft: scale(12) },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#fff' },
  newReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: scale(14),
    paddingVertical: scale(8),
    borderRadius: scale(20),
    marginRight: scale(10),
  },
  newReqBtnText: { fontSize: moderateScale(13), fontWeight: '700', color: '#FFF', marginLeft: scale(4) },
  menuBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(14),
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: scale(16) },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: scale(16),
  },
  statCard: {
    flex: 1,
    borderRadius: scale(12),
    padding: scale(12),
    marginHorizontal: scale(4),
    alignItems: 'center',
    borderWidth: 1,
  },
  statCount: { fontSize: moderateScale(20), fontWeight: '800', marginTop: scale(4) },
  statLabel: { fontSize: moderateScale(10), color: C.muted, fontWeight: '600', marginTop: scale(2) },

  // Request Card
  requestsList: {},
  requestCard: {
    backgroundColor: C.card,
    borderRadius: scale(14),
    padding: scale(14),
    marginBottom: scale(12),
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(10),
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(10),
    paddingVertical: scale(5),
    borderRadius: scale(16),
  },
  statusText: { fontSize: moderateScale(11), fontWeight: '700', marginLeft: scale(5) },
  dateText: { fontSize: moderateScale(11), color: C.muted },
  categoryName: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginBottom: scale(6) },
  descText: { fontSize: moderateScale(13), color: C.text, lineHeight: moderateScale(18), marginBottom: scale(8) },

  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.rejectedBg,
    padding: scale(10),
    borderRadius: scale(10),
    marginTop: scale(6),
  },
  rejectionText: { flex: 1, fontSize: moderateScale(12), color: C.rejectedColor, marginLeft: scale(8) },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(12),
    paddingVertical: scale(10),
    borderRadius: scale(10),
    backgroundColor: C.rejectedBg,
    borderWidth: 1,
    borderColor: C.rejectedBorder,
  },
  deleteBtnText: { fontSize: moderateScale(13), fontWeight: '600', color: C.rejectedColor, marginLeft: scale(6) },

  // Loading & Empty
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: scale(60),
  },
  loadingText: { fontSize: moderateScale(14), color: C.muted, marginTop: scale(12) },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: scale(60),
  },
  emptyTitle: { fontSize: moderateScale(16), fontWeight: '700', color: C.ink, marginTop: scale(12) },
  emptyText: { fontSize: moderateScale(13), color: C.muted, marginTop: scale(4), textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalIconBox: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: { flex: 1, marginLeft: scale(12) },
  modalTitle: { fontSize: moderateScale(17), fontWeight: '700', color: C.ink },
  modalSubtitle: { fontSize: moderateScale(12), color: C.muted, marginTop: scale(2) },
  modalCloseBtn: {
    width: scale(36),
    height: scale(36),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    flexGrow: 0,
    maxHeight: scale(350),
  },
  modalScrollContent: {
    padding: scale(16),
    paddingBottom: scale(20),
  },

  // Input
  inputGroup: { marginBottom: scale(14) },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: scale(6),
  },
  inputLabel: { fontSize: moderateScale(13), fontWeight: '600', color: C.ink },
  requiredBadge: {
    fontSize: moderateScale(10),
    fontWeight: '600',
    color: C.primary,
  },
  optionalBadge: {
    fontSize: moderateScale(10),
    fontWeight: '500',
    color: C.muted,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: scale(12),
    paddingHorizontal: scale(12),
    paddingVertical: scale(10),
  },
  inputBoxActive: { borderColor: C.primary },
  textAreaBox: { alignItems: 'flex-start' },

  input: { flex: 1, fontSize: moderateScale(14), color: C.ink, marginLeft: scale(8) },
  textArea: { minHeight: scale(80), textAlignVertical: 'top', marginLeft: 0 },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? scale(30) : scale(16),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: scale(10),
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: moderateScale(15), fontWeight: '600', color: C.text },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: moderateScale(15), fontWeight: '700', color: '#FFF', marginLeft: scale(8) },

  // ═══ Skeleton ═══
  skelBadge: { width: scale(90), height: scale(24), borderRadius: scale(16), backgroundColor: '#E2E8F0' },
  skelDate: { width: scale(60), height: scale(12), borderRadius: scale(4), backgroundColor: '#E2E8F0' },
  skelTitle: { width: '60%', height: scale(16), borderRadius: scale(4), backgroundColor: '#E2E8F0', marginBottom: scale(8) },
  skelDesc: { width: '90%', height: scale(12), borderRadius: scale(4), backgroundColor: '#E2E8F0' },
});
