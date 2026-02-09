/**
 * ============================================================================
 * CATEGORY REQUEST SCREEN - PREMIUM DESIGN WITH MODAL FORM
 * ============================================================================
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  Platform,
  StatusBar,
  RefreshControl,
  Modal,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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

export default function CategoryRequestScreen({ navigation }) {
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

  const loadMyRequests = useCallback(async () => {
    try {
      const response = await api.get('/owner/category-request');
      if (response.data?.ok) {
        setMyRequests(response.data.data || []);
      }
    } catch (error) {
      console.error('Load requests error:', error);
    } finally {
      setLoadingRequests(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMyRequests();
  }, [loadMyRequests]);

  const onRefresh = () => {
    setRefreshing(true);
    loadMyRequests();
  };

  const handleSubmit = async () => {
    if (!categoryName.trim()) {
      return Alert.alert('Error', 'Category name is required');
    }

    setSubmitting(true);
    try {
      const response = await api.post('/owner/category-request', {
        categoryName: categoryName.trim(),
        description: description.trim(),
        reason: reason.trim(),
      });

      if (response.data?.ok) {
        Alert.alert('Success', 'Your category request has been submitted for review.');
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
      Alert.alert('Error', error.message || 'Could not submit category request');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = (request) => {
    Alert.alert(
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
                Alert.alert('Deleted', 'Request deleted successfully');
                loadMyRequests();
              } else {
                throw new Error(response.data?.error || 'Failed to delete');
              }
            } catch (error) {
              Alert.alert('Error', error.message || 'Could not delete request');
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
            <Icon name={statusConfig.icon} size={14} color={statusConfig.color} />
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
            <Icon name="alert-circle" size={14} color={C.rejectedColor} />
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
                <Icon name="trash-outline" size={16} color={C.rejectedColor} />
                <Text style={st.deleteBtnText}>Delete</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={st.container} edges={['top']}>
      <StatusBar barStyle="dark-content" backgroundColor={C.card} />

      {/* Header */}
      <View style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="arrow-back" size={22} color={C.ink} />
        </TouchableOpacity>
        <View style={st.headerCenter}>
          <Text style={st.headerTitle}>Category Requests</Text>
        </View>
        {/* New Request Button in Header */}
        <TouchableOpacity style={st.newReqBtn} onPress={() => setModalVisible(true)}>
          <Icon name="add" size={18} color="#FFF" />
          <Text style={st.newReqBtnText}>New</Text>
        </TouchableOpacity>
        <TouchableOpacity style={st.menuBtn} onPress={() => setMenuVisible(true)}>
          <Icon name="menu" size={20} color={C.ink} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={st.content}
        contentContainerStyle={st.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} />}
      >
        {/* Stats Cards */}
        <View style={st.statsRow}>
          <View style={[st.statCard, { backgroundColor: C.pendingBg, borderColor: C.pendingBorder }]}>
            <Icon name="time" size={20} color={C.pendingColor} />
            <Text style={[st.statCount, { color: C.pendingColor }]}>{pendingCount}</Text>
            <Text style={st.statLabel}>Pending</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: C.approvedBg, borderColor: C.approvedBorder }]}>
            <Icon name="checkmark-circle" size={20} color={C.approvedColor} />
            <Text style={[st.statCount, { color: C.approvedColor }]}>{approvedCount}</Text>
            <Text style={st.statLabel}>Approved</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: C.rejectedBg, borderColor: C.rejectedBorder }]}>
            <Icon name="close-circle" size={20} color={C.rejectedColor} />
            <Text style={[st.statCount, { color: C.rejectedColor }]}>{rejectedCount}</Text>
            <Text style={st.statLabel}>Rejected</Text>
          </View>
        </View>

        {/* Requests List */}
        {loadingRequests ? (
          <View style={st.loadingBox}>
            <ActivityIndicator size="large" color={C.primary} />
            <Text style={st.loadingText}>Loading requests...</Text>
          </View>
        ) : myRequests.length === 0 ? (
          <View style={st.emptyBox}>
            <Icon name="folder-open-outline" size={48} color={C.muted} />
            <Text style={st.emptyTitle}>No Requests Yet</Text>
            <Text style={st.emptyText}>Tap "New" button to submit your first request</Text>
          </View>
        ) : (
          <View style={st.requestsList}>
            {myRequests.map(renderRequestCard)}
          </View>
        )}

        <View style={{ height: 100 }} />
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
                <Icon name="add-circle" size={24} color={C.primary} />
              </View>
              <View style={st.modalHeaderText}>
                <Text style={st.modalTitle}>New Category Request</Text>
                <Text style={st.modalSubtitle}>Submit a request for a new category</Text>
              </View>
              <TouchableOpacity style={st.modalCloseBtn} onPress={() => setModalVisible(false)}>
                <Icon name="close" size={22} color={C.muted} />
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
                  <Icon name="pricetag-outline" size={18} color={categoryName ? C.primary : C.muted} />
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
                    <Icon name="send" size={18} color="#FFF" />
                    <Text style={st.submitBtnText}>Submit</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, marginLeft: 12 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  newReqBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.primary,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
  },
  newReqBtnText: { fontSize: 13, fontWeight: '700', color: '#FFF', marginLeft: 4 },
  menuBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  content: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 16 },

  // Stats
  statsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
  },
  statCount: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  statLabel: { fontSize: 10, color: C.muted, fontWeight: '600', marginTop: 2 },

  // Request Card
  requestsList: {},
  requestCard: {
    backgroundColor: C.card,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  statusText: { fontSize: 11, fontWeight: '700', marginLeft: 5 },
  dateText: { fontSize: 11, color: C.muted },
  categoryName: { fontSize: 16, fontWeight: '700', color: C.ink, marginBottom: 6 },
  descText: { fontSize: 13, color: C.text, lineHeight: 18, marginBottom: 8 },

  rejectionBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: C.rejectedBg,
    padding: 10,
    borderRadius: 10,
    marginTop: 6,
  },
  rejectionText: { flex: 1, fontSize: 12, color: C.rejectedColor, marginLeft: 8 },

  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: C.rejectedBg,
    borderWidth: 1,
    borderColor: C.rejectedBorder,
  },
  deleteBtnText: { fontSize: 13, fontWeight: '600', color: C.rejectedColor, marginLeft: 6 },

  // Loading & Empty
  loadingBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  loadingText: { fontSize: 14, color: C.muted, marginTop: 12 },

  emptyBox: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: C.ink, marginTop: 12 },
  emptyText: { fontSize: 13, color: C.muted, marginTop: 4, textAlign: 'center' },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: C.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalHeaderText: { flex: 1, marginLeft: 12 },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.ink },
  modalSubtitle: { fontSize: 12, color: C.muted, marginTop: 2 },
  modalCloseBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalScroll: {
    flexGrow: 0,
    maxHeight: 350,
  },
  modalScrollContent: {
    padding: 16,
    paddingBottom: 20,
  },

  // Input
  inputGroup: { marginBottom: 14 },
  inputLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: { fontSize: 13, fontWeight: '600', color: C.ink },
  requiredBadge: {
    fontSize: 10,
    fontWeight: '600',
    color: C.primary,
  },
  optionalBadge: {
    fontSize: 10,
    fontWeight: '500',
    color: C.muted,
  },

  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderWidth: 1.5,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inputBoxActive: { borderColor: C.primary },
  textAreaBox: { alignItems: 'flex-start' },

  input: { flex: 1, fontSize: 14, color: C.ink, marginLeft: 8 },
  textArea: { minHeight: 80, textAlignVertical: 'top', marginLeft: 0 },

  // Modal Actions
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    borderWidth: 1,
    borderColor: C.border,
  },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: C.text },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF', marginLeft: 8 },
});
