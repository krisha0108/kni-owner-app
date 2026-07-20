import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Modal,
  TextInput,
  ScrollView,
  Dimensions,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

import { scale, moderateScale } from '../utils/responsive';
import AppAlert from '../utils/AppAlert';
import { usePermissions } from '../utils/usePermissions';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const C = {
  primary: '#EF3A3A',
  ink: '#1D2254',
  text: '#0F172A',
  muted: '#6B7280',
  bg: '#F5F7FA',
  card: '#FFFFFF',
  border: '#E5E7EB',
  ok: '#10B981',
  warn: '#F59E0B',
  danger: '#EF4444',
  info: '#3B82F6',
};

// Match web roles exactly: MANAGER, ACCOUNTANT, VIEWER
const ROLES = [
  {
    key: 'MANAGER',
    label: 'Manager',
    description: 'Full access except team management',
    icon: 'briefcase',
    bg: '#DBEAFE',
    color: '#2563EB',
  },
  {
    key: 'ACCOUNTANT',
    label: 'Accountant',
    description: 'Can manage expenses and view reports',
    icon: 'calculator',
    bg: '#D1FAE5',
    color: '#059669',
  },
  {
    key: 'VIEWER',
    label: 'Viewer',
    description: 'Read-only access',
    icon: 'eye',
    bg: '#F3F4F6',
    color: '#6B7280',
  },
];

const getRoleStyle = (role) => {
  const found = ROLES.find(r => r.key === role);
  if (found) {
    return { bg: found.bg, text: found.color, icon: found.icon, label: found.label };
  }
  return { bg: '#F3F4F6', text: C.muted, icon: 'person', label: role };
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export default function TeamManagementScreen({ navigation }) {
  // RBAC permissions
  const { can } = usePermissions();
  const { height: winHeight } = useWindowDimensions();

  // Global restaurant context
  const {
    selectedRestaurant: currentRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

  // Access gate: ACCOUNTANT & VIEWER cannot access team management
  if (!can('team:read')) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Team Management</Text>
            <Text style={styles.headerSubtitle}>Access Restricted</Text>
          </View>
          <View style={styles.headerActions} />
        </View>
        <View style={styles.loadingBox}>
          <View style={[styles.emptyIconBox, { backgroundColor: '#FEF2F2' }]}>
            <Icon name="lock-closed-outline" size={scale(48)} color={C.danger} />
          </View>
          <Text style={styles.emptyTitle}>Access Restricted</Text>
          <Text style={styles.emptyText}>
            You don't have permission to view team management. Contact the restaurant owner for access.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))}>
            <Icon name="arrow-back-outline" size={scale(18)} color="#fff" />
            <Text style={styles.emptyBtnText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);

  // Invite Modal
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'MANAGER',
  });
  const [inviting, setInviting] = useState(false);

  // Edit Role Modal
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [editRole, setEditRole] = useState('MANAGER');
  const [updating, setUpdating] = useState(false);

  // Navigation Menu
  const [menuVisible, setMenuVisible] = useState(false);

  const loadData = useCallback(async () => {
    if (!selectedRestaurantId) { setLoading(false); return; }

    try {
      setLoading(true);
      const response = await api.get(`/owner/team?restaurantId=${selectedRestaurantId}`);
      if (response.data.ok) {
        setTeamMembers(response.data.data?.items || response.data.data || []);
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedRestaurantId]);

  // Load data when restaurant changes
  useEffect(() => {
    loadData();
  }, [selectedRestaurantId, loadData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadRestaurants();
    loadData();
  };

  // === INVITE ===
  const openInviteModal = () => {
    setInviteForm({ name: '', email: '', phone: '', role: 'MANAGER' });
    setInviteModalVisible(true);
  };

  const sendInvite = async () => {
    if (!inviteForm.name.trim()) {
      AppAlert.alert('Required', 'Please enter full name');
      return;
    }
    if (!inviteForm.email.trim()) {
      AppAlert.alert('Required', 'Please enter email address');
      return;
    }
    if (!selectedRestaurantId) {
      AppAlert.alert('Error', 'No restaurant selected');
      return;
    }

    setInviting(true);
    try {
      const response = await api.post('/owner/team', {
        restaurantId: selectedRestaurantId,
        name: inviteForm.name.trim(),
        email: inviteForm.email.trim(),
        phone: inviteForm.phone.trim() || undefined,
        role: inviteForm.role,
      });

      if (response.data.ok) {
        AppAlert.alert('Success', 'Team member invited successfully');
        setInviteModalVisible(false);
        loadData();
      } else {
        AppAlert.alert('Error', response.data.error || 'Failed to send invitation');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  // === EDIT ROLE ===
  const openEditModal = (member) => {
    setSelectedMember(member);
    setEditRole(member.role);
    setEditModalVisible(true);
  };

  const updateRole = async () => {
    if (!selectedMember) return;

    setUpdating(true);
    try {
      const response = await api.patch(`/owner/team/${selectedMember.id}`, {
        role: editRole,
      });

      if (response.data.ok) {
        AppAlert.alert('Success', 'Role updated successfully');
        setEditModalVisible(false);
        setSelectedMember(null);
        loadData();
      } else {
        AppAlert.alert('Error', response.data.error || 'Failed to update role');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  // === REMOVE ===
  const removeMember = (member) => {
    AppAlert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.user?.name || member.email} from the team? They will lose access to all restaurant data.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await api.delete(`/owner/team/${member.id}`);
              if (response.data.ok) {
                AppAlert.alert('Success', 'Team member removed');
                loadData();
              } else {
                AppAlert.alert('Error', response.data.error || 'Failed to remove member');
              }
            } catch (error) {
              AppAlert.alert('Error', 'Failed to remove team member');
            }
          },
        },
      ]
    );
  };

  // === RENDER MEMBER CARD ===
  const renderMemberCard = ({ item }) => {
    const roleStyle = getRoleStyle(item.role);
    const userName = item.user?.name || 'Pending User';
    const userEmail = item.user?.email || item.email;
    const userPhone = item.user?.phone;
    const isActive = !!item.acceptedAt;
    const inviterName = item.inviter?.name || 'Owner';
    const joinedDate = formatDate(item.acceptedAt);
    const invitedDate = formatDate(item.invitedAt);

    return (
      <View style={styles.memberCard}>
        {/* Header Row */}
        <View style={styles.memberHeader}>
          <View style={[styles.avatarBox, { backgroundColor: roleStyle.bg }]}>
            <Text style={[styles.avatarText, { color: roleStyle.text }]}>
              {userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          <View style={styles.memberInfo}>
            <Text style={styles.memberName}>{userName}</Text>
            <View style={styles.emailRow}>
              <Icon name="mail-outline" size={scale(12)} color={C.muted} />
              <Text style={styles.memberEmail}>{userEmail}</Text>
            </View>
            {userPhone && (
              <View style={styles.emailRow}>
                <Icon name="call-outline" size={scale(12)} color={C.muted} />
                <Text style={styles.memberEmail}>{userPhone}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Details Row */}
        <View style={styles.detailsGrid}>
          {/* Role */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Role</Text>
            <View style={[styles.badge, { backgroundColor: roleStyle.bg }]}>
              <Text style={[styles.badgeText, { color: roleStyle.text }]}>{roleStyle.label}</Text>
            </View>
          </View>

          {/* Status */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Status</Text>
            <View style={[styles.badge, { backgroundColor: isActive ? '#D1FAE5' : '#FEF3C7' }]}>
              <Text style={[styles.badgeText, { color: isActive ? '#059669' : '#D97706' }]}>
                {isActive ? 'Active' : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Invited By */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>Invited By</Text>
            <Text style={styles.detailValue}>{inviterName}</Text>
          </View>

          {/* Joined / Invited Date */}
          <View style={styles.detailItem}>
            <Text style={styles.detailLabel}>{isActive ? 'Joined' : 'Invited'}</Text>
            <Text style={styles.detailValue}>{isActive ? joinedDate : invitedDate}</Text>
          </View>
        </View>

        {/* Actions (owner-only) */}
        {(can('team:update') || can('team:remove')) && (
        <View style={styles.actionsRow}>
          {can('team:update') && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
            onPress={() => openEditModal(item)}
          >
            <Icon name="create-outline" size={scale(16)} color={C.info} />
            <Text style={[styles.actionBtnText, { color: C.info }]}>Edit Role</Text>
          </TouchableOpacity>
          )}

          {can('team:remove') && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
            onPress={() => removeMember(item)}
          >
            <Icon name="trash-outline" size={scale(16)} color={C.danger} />
            <Text style={[styles.actionBtnText, { color: C.danger }]}>Remove</Text>
          </TouchableOpacity>
          )}
        </View>
        )}
      </View>
    );
  };

  // === LOADING STATE ===
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
            <Icon name="arrow-back" size={scale(22)} color={C.ink} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Team Management</Text>
            <Text style={styles.headerSubtitle}>Manage team access</Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.headerIconBtn} onPress={() => setMenuVisible(true)}>
              <Icon name="menu" size={scale(20)} color={C.ink} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingText}>Loading team...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => (navigation.canGoBack() ? navigation.goBack() : navigation.navigate('Home'))} style={styles.backBtn}>
          <Icon name="arrow-back" size={scale(22)} color={C.ink} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Team Management</Text>
          <Text style={styles.headerSubtitle}>Manage team access</Text>
        </View>
        <View style={styles.headerActions}>
          {can('team:invite') && (
          <TouchableOpacity onPress={openInviteModal} style={styles.headerIconBtn}>
            <Icon name="person-add" size={scale(20)} color={C.primary} />
          </TouchableOpacity>
          )}
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={styles.headerIconBtn}>
            <Icon name="menu" size={scale(20)} color={C.ink} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Description Card */}
      <View style={styles.descCard}>
        <Icon name="people" size={scale(24)} color={C.info} />
        <View style={styles.descContent}>
          <Text style={styles.descTitle}>Manage Team Access</Text>
          <Text style={styles.descText}>
            Invite members to collaborate on managing your restaurant
          </Text>
        </View>
      </View>

      {/* Team List */}
      <FlatList
        data={teamMembers}
        keyExtractor={(item) => item.id.toString()}
        renderItem={renderMemberCard}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[C.primary]}
            tintColor={C.primary}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <View style={styles.emptyIconBox}>
              <Icon name="people-outline" size={scale(48)} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Team Members Yet</Text>
            <Text style={styles.emptyText}>
              Invite members to collaborate on your restaurant
            </Text>
            {can('team:invite') && (
            <TouchableOpacity style={styles.emptyBtn} onPress={openInviteModal}>
              <Icon name="person-add-outline" size={scale(18)} color="#fff" />
              <Text style={styles.emptyBtnText}>Invite Member</Text>
            </TouchableOpacity>
            )}
          </View>
        }
        initialNumToRender={10}
        maxToRenderPerBatch={10}
        removeClippedSubviews={true}
      />

      {/* ========== INVITE MODAL ========== */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={[styles.modalBody, { maxHeight: winHeight * 0.72 }]} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {/* Name */}
              <Text style={styles.inputLabel}>Full Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                placeholderTextColor="#9CA3AF"
                value={inviteForm.name}
                onChangeText={(v) => setInviteForm((f) => ({ ...f, name: v }))}
              />

              {/* Email */}
              <Text style={styles.inputLabel}>Email *</Text>
              <TextInput
                style={styles.input}
                placeholder="john@example.com"
                placeholderTextColor="#9CA3AF"
                keyboardType="email-address"
                autoCapitalize="none"
                value={inviteForm.email}
                onChangeText={(v) => setInviteForm((f) => ({ ...f, email: v }))}
              />

              {/* Phone */}
              <Text style={styles.inputLabel}>Phone</Text>
              <TextInput
                style={styles.input}
                placeholder="+91 9876543210"
                placeholderTextColor="#9CA3AF"
                keyboardType="phone-pad"
                value={inviteForm.phone}
                onChangeText={(v) => setInviteForm((f) => ({ ...f, phone: v }))}
              />

              {/* Role */}
              <Text style={styles.inputLabel}>Role *</Text>
              <View style={styles.roleSelector}>
                {ROLES.map((role) => {
                  const isSelected = inviteForm.role === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[
                        styles.roleOption,
                        isSelected && { backgroundColor: role.bg, borderColor: role.color },
                      ]}
                      onPress={() => setInviteForm((f) => ({ ...f, role: role.key }))}
                    >
                      <Icon
                        name={role.icon}
                        size={scale(20)}
                        color={isSelected ? role.color : C.muted}
                      />
                      <View style={styles.roleOptionInfo}>
                        <Text
                          style={[
                            styles.roleOptionLabel,
                            isSelected && { color: role.color },
                          ]}
                        >
                          {role.label}
                        </Text>
                        <Text style={styles.roleOptionDesc}>{role.description}</Text>
                      </View>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={scale(20)} color={role.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setInviteModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, inviting && { opacity: 0.7 }]}
                onPress={sendInvite}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Icon name="send" size={scale(16)} color="#fff" />
                    <Text style={styles.submitBtnText}>Send Invite</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ========== EDIT ROLE MODAL ========== */}
      <Modal visible={editModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Role</Text>
              <TouchableOpacity onPress={() => setEditModalVisible(false)}>
                <Icon name="close" size={scale(24)} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
              {selectedMember && (
                <View style={styles.editMemberInfo}>
                  <Text style={styles.editMemberName}>{selectedMember.user?.name}</Text>
                  <Text style={styles.editMemberEmail}>{selectedMember.user?.email}</Text>
                </View>
              )}

              <Text style={styles.inputLabel}>Select New Role</Text>
              <View style={styles.roleSelector}>
                {ROLES.map((role) => {
                  const isSelected = editRole === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[
                        styles.roleOption,
                        isSelected && { backgroundColor: role.bg, borderColor: role.color },
                      ]}
                      onPress={() => setEditRole(role.key)}
                    >
                      <Icon
                        name={role.icon}
                        size={scale(20)}
                        color={isSelected ? role.color : C.muted}
                      />
                      <View style={styles.roleOptionInfo}>
                        <Text
                          style={[
                            styles.roleOptionLabel,
                            isSelected && { color: role.color },
                          ]}
                        >
                          {role.label}
                        </Text>
                        <Text style={styles.roleOptionDesc}>{role.description}</Text>
                      </View>
                      {isSelected && (
                        <Icon name="checkmark-circle" size={scale(20)} color={role.color} />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, updating && { opacity: 0.7 }]}
                onPress={updateRole}
                disabled={updating}
              >
                {updating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Update Role</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
      <KniBottomNav navigation={navigation} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: scale(16),
    paddingVertical: scale(12),
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    marginLeft: scale(12),
  },
  headerTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  headerSubtitle: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerIconBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(10),
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: scale(8),
  },
  inviteBtn: {
    width: scale(40),
    height: scale(40),
    borderRadius: scale(12),
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
    backgroundColor: '#FEF2F2',
  },
  restaurantName: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.primary,
  },

  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginHorizontal: scale(16),
    marginTop: scale(16),
    padding: scale(16),
    backgroundColor: '#EFF6FF',
    borderRadius: scale(12),
  },
  descContent: {
    flex: 1,
  },
  descTitle: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(2),
  },
  descText: {
    fontSize: moderateScale(12),
    color: C.info,
    lineHeight: moderateScale(16),
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: scale(12),
    fontSize: moderateScale(14),
    color: C.muted,
  },

  listContent: {
    padding: scale(16),
  },

  // Member Card
  memberCard: {
    backgroundColor: C.card,
    borderRadius: scale(16),
    padding: scale(16),
    marginBottom: scale(12),
    borderWidth: 1,
    borderColor: C.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    marginBottom: scale(16),
  },
  avatarBox: {
    width: scale(48),
    height: scale(48),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: moderateScale(20),
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginTop: scale(2),
  },
  memberEmail: {
    fontSize: moderateScale(12),
    color: C.muted,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: scale(16),
  },
  detailItem: {
    width: '50%',
    marginBottom: scale(12),
  },
  detailLabel: {
    fontSize: moderateScale(11),
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    marginBottom: scale(4),
  },
  detailValue: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    borderRadius: scale(20),
  },
  badgeText: {
    fontSize: moderateScale(12),
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: scale(10),
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(6),
    paddingVertical: scale(10),
    borderRadius: scale(10),
  },
  actionBtnText: {
    fontSize: moderateScale(13),
    fontWeight: '600',
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingTop: scale(60),
    paddingHorizontal: scale(32),
  },
  emptyIconBox: {
    width: scale(80),
    height: scale(80),
    borderRadius: scale(40),
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: scale(16),
  },
  emptyTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
    marginBottom: scale(8),
  },
  emptyText: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: scale(24),
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(8),
    paddingHorizontal: scale(20),
    paddingVertical: scale(12),
    borderRadius: scale(12),
    backgroundColor: C.primary,
  },
  emptyBtnText: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#fff',
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.9,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: moderateScale(18),
    fontWeight: '700',
    color: C.ink,
  },
  modalBody: {
    padding: scale(20),
  },
  modalFooter: {
    flexDirection: 'row',
    gap: scale(12),
    paddingHorizontal: scale(20),
    paddingVertical: scale(16),
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  inputLabel: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: C.muted,
    marginBottom: scale(8),
    marginTop: scale(16),
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: scale(12),
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
    fontSize: moderateScale(15),
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },

  roleSelector: {
    gap: scale(10),
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  roleOptionInfo: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: C.text,
  },
  roleOptionDesc: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },

  editMemberInfo: {
    padding: scale(16),
    backgroundColor: C.bg,
    borderRadius: scale(12),
    marginBottom: scale(8),
  },
  editMemberName: {
    fontSize: moderateScale(16),
    fontWeight: '700',
    color: C.ink,
  },
  editMemberEmail: {
    fontSize: moderateScale(13),
    color: C.muted,
    marginTop: scale(2),
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: scale(8),
    paddingVertical: scale(14),
    borderRadius: scale(12),
    backgroundColor: C.primary,
  },
  submitBtnText: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: '#fff',
  },

  // Restaurant Picker Styles
  switchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(4),
    marginLeft: 'auto',
    paddingHorizontal: scale(10),
    paddingVertical: scale(4),
    backgroundColor: '#fff',
    borderRadius: scale(16),
    borderWidth: 1,
    borderColor: C.primary,
  },
  switchText: {
    fontSize: moderateScale(12),
    fontWeight: '600',
    color: C.primary,
  },
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: scale(24),
    borderTopRightRadius: scale(24),
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  pickerBody: {
    padding: scale(16),
  },
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: scale(12),
    padding: scale(14),
    marginBottom: scale(10),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  restaurantIcon: {
    width: scale(44),
    height: scale(44),
    borderRadius: scale(12),
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEE2E2',
  },
  restaurantIconSelected: {
    backgroundColor: C.primary,
  },
  restaurantOptionInfo: {
    flex: 1,
  },
  restaurantOptionName: {
    fontSize: moderateScale(15),
    fontWeight: '700',
    color: C.ink,
  },
  restaurantOptionNameSelected: {
    color: C.primary,
  },
  restaurantOptionAddress: {
    fontSize: moderateScale(12),
    color: C.muted,
    marginTop: scale(2),
  },
});
