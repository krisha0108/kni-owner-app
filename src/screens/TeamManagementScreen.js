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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { RestaurantSelectorBar } from '../components/RestaurantSelector';
import KniBottomNav from '../components/KniBottomNav';
import NavigationMenu from '../components/NavigationMenu';

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
  // Global restaurant context
  const {
    selectedRestaurant: currentRestaurant,
    selectedRestaurantId,
    loading: restaurantsLoading,
    loadRestaurants,
  } = useRestaurant();

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
    if (!selectedRestaurantId) return;

    try {
      setLoading(true);
      const response = await api.get(`/owner/team?restaurantId=${selectedRestaurantId}`);
      if (response.data.ok) {
        setTeamMembers(response.data.data || []);
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
    if (selectedRestaurantId) {
      loadData();
    }
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
      Alert.alert('Required', 'Please enter full name');
      return;
    }
    if (!inviteForm.email.trim()) {
      Alert.alert('Required', 'Please enter email address');
      return;
    }
    if (!selectedRestaurantId) {
      Alert.alert('Error', 'No restaurant selected');
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
        Alert.alert('Success', 'Team member invited successfully');
        setInviteModalVisible(false);
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to send invitation');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
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
        Alert.alert('Success', 'Role updated successfully');
        setEditModalVisible(false);
        setSelectedMember(null);
        loadData();
      } else {
        Alert.alert('Error', response.data.error || 'Failed to update role');
      }
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to update role');
    } finally {
      setUpdating(false);
    }
  };

  // === REMOVE ===
  const removeMember = (member) => {
    Alert.alert(
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
                Alert.alert('Success', 'Team member removed');
                loadData();
              } else {
                Alert.alert('Error', response.data.error || 'Failed to remove member');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to remove team member');
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
              <Icon name="mail-outline" size={12} color={C.muted} />
              <Text style={styles.memberEmail}>{userEmail}</Text>
            </View>
            {userPhone && (
              <View style={styles.emailRow}>
                <Icon name="call-outline" size={12} color={C.muted} />
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

        {/* Actions */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#EFF6FF' }]}
            onPress={() => openEditModal(item)}
          >
            <Icon name="create-outline" size={16} color={C.info} />
            <Text style={[styles.actionBtnText, { color: C.info }]}>Edit Role</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: '#FEF2F2' }]}
            onPress={() => removeMember(item)}
          >
            <Icon name="trash-outline" size={16} color={C.danger} />
            <Text style={[styles.actionBtnText, { color: C.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // === LOADING STATE ===
  if ((loading || restaurantsLoading) && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Management</Text>
          <View style={{ width: 40 }} />
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
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={openInviteModal} style={styles.inviteBtn}>
            <Icon name="person-add" size={20} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
            <Icon name="menu" size={22} color="#1D2254" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Global Restaurant Selector */}
      <RestaurantSelectorBar />

      {/* Description Card */}
      <View style={styles.descCard}>
        <Icon name="people" size={24} color={C.info} />
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
              <Icon name="people-outline" size={48} color={C.muted} />
            </View>
            <Text style={styles.emptyTitle}>No Team Members Yet</Text>
            <Text style={styles.emptyText}>
              Invite members to collaborate on your restaurant
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openInviteModal}>
              <Icon name="person-add-outline" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Invite Member</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* ========== INVITE MODAL ========== */}
      <Modal visible={inviteModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setInviteModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
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
                        size={20}
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
                        <Icon name="checkmark-circle" size={20} color={role.color} />
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
                    <Icon name="send" size={16} color="#fff" />
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
                <Icon name="close" size={24} color={C.ink} />
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
                        size={20}
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
                        <Icon name="checkmark-circle" size={20} color={role.color} />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: C.card,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  inviteBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  restaurantBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#FEF2F2',
  },
  restaurantName: {
    fontSize: 14,
    fontWeight: '600',
    color: C.primary,
  },

  descCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    backgroundColor: '#EFF6FF',
    borderRadius: 12,
  },
  descContent: {
    flex: 1,
  },
  descTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 2,
  },
  descText: {
    fontSize: 12,
    color: C.info,
    lineHeight: 16,
  },

  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: C.muted,
  },

  listContent: {
    padding: 16,
  },

  // Member Card
  memberCard: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  avatarBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  emailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  memberEmail: {
    fontSize: 12,
    color: C.muted,
  },

  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  detailItem: {
    width: '50%',
    marginBottom: 12,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: C.muted,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '600',
    color: C.text,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },

  actionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Empty State
  emptyBox: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
  },
  emptyIconBox: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: C.muted,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  emptyBtnText: {
    fontSize: 14,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  modalBody: {
    padding: 20,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: C.border,
  },

  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: C.muted,
    marginBottom: 8,
    marginTop: 16,
  },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },

  roleSelector: {
    gap: 10,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  roleOptionInfo: {
    flex: 1,
  },
  roleOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
  },
  roleOptionDesc: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },

  editMemberInfo: {
    padding: 16,
    backgroundColor: C.bg,
    borderRadius: 12,
    marginBottom: 8,
  },
  editMemberName: {
    fontSize: 16,
    fontWeight: '700',
    color: C.ink,
  },
  editMemberEmail: {
    fontSize: 13,
    color: C.muted,
    marginTop: 2,
  },

  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  submitBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  submitBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },

  // Restaurant Picker Styles
  switchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 'auto',
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: C.primary,
  },
  switchText: {
    fontSize: 12,
    fontWeight: '600',
    color: C.primary,
  },
  pickerContent: {
    backgroundColor: C.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '70%',
  },
  pickerBody: {
    padding: 16,
  },
  restaurantOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  restaurantOptionSelected: {
    borderColor: C.primary,
    backgroundColor: '#FEF2F2',
  },
  restaurantIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
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
    fontSize: 15,
    fontWeight: '700',
    color: C.ink,
  },
  restaurantOptionNameSelected: {
    color: C.primary,
  },
  restaurantOptionAddress: {
    fontSize: 12,
    color: C.muted,
    marginTop: 2,
  },
});
