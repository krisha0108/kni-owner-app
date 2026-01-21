import React, { useState, useCallback } from 'react';
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

const ROLES = [
  { key: 'OWNER', label: 'Owner' },
  { key: 'ADMIN', label: 'Admin' },
  { key: 'MANAGER', label: 'Manager' },
  { key: 'STAFF', label: 'Staff' },
  { key: 'VIEWER', label: 'Viewer' },
];

const getRoleStyle = (role) => {
  switch (role) {
    case 'OWNER':
      return { bg: '#FEF2F2', text: C.danger, icon: 'shield-checkmark', label: 'Owner' };
    case 'ADMIN':
      return { bg: '#FEF2F2', text: C.danger, icon: 'shield', label: 'Admin' };
    case 'MANAGER':
      return { bg: '#FFFBEB', text: C.warn, icon: 'person', label: 'Manager' };
    case 'STAFF':
      return { bg: '#EFF6FF', text: C.info, icon: 'people', label: 'Staff' };
    case 'VIEWER':
      return { bg: '#F3F4F6', text: C.muted, icon: 'eye', label: 'Viewer' };
    default:
      return { bg: '#F3F4F6', text: C.muted, icon: 'person', label: role };
  }
};

export default function TeamManagementScreen({ navigation }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [teamMembers, setTeamMembers] = useState([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: '',
    name: '',
    role: 'STAFF',
  });
  const [currentRestaurant, setCurrentRestaurant] = useState(null);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  const loadData = async () => {
    try {
      setLoading(true);

      // Get first restaurant
      const restaurantsRes = await api.get('/owner/restaurants');
      if (restaurantsRes.data.ok && restaurantsRes.data.data.length > 0) {
        const firstRestaurant = restaurantsRes.data.data.find(r => r.status === 'APPROVED');
        if (firstRestaurant) {
          setCurrentRestaurant(firstRestaurant);
          const response = await api.get(`/owner/team?restaurantId=${firstRestaurant.id}`);
          if (response.data.ok) {
            setTeamMembers(response.data.data || []);
          }
        }
      }
    } catch (error) {
      console.error('Error loading team:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const openInviteModal = () => {
    setForm({
      email: '',
      name: '',
      role: 'STAFF',
    });
    setModalVisible(true);
  };

  const sendInvite = async () => {
    if (!form.email.trim()) {
      Alert.alert('Error', 'Please enter email address');
      return;
    }
    if (!form.name.trim()) {
      Alert.alert('Error', 'Please enter member name');
      return;
    }
    if (!currentRestaurant) {
      Alert.alert('Error', 'No restaurant selected');
      return;
    }

    setSaving(true);
    try {
      await api.post('/owner/team', {
        restaurantId: currentRestaurant.id,
        email: form.email,
        name: form.name,
        role: form.role,
      });

      Alert.alert('Success', 'Invitation sent successfully');
      setModalVisible(false);
      loadData();
    } catch (error) {
      Alert.alert('Error', error.response?.data?.error || 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (memberId, newRole) => {
    try {
      await api.patch(`/owner/team/${memberId}`, { role: newRole });
      Alert.alert('Success', 'Role updated successfully');
      loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to update role');
    }
  };

  const removeMember = (member) => {
    Alert.alert(
      'Remove Team Member',
      `Are you sure you want to remove ${member.email}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.delete(`/owner/team/${member.id}`);
              Alert.alert('Success', 'Team member removed');
              loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to remove team member');
            }
          }
        }
      ]
    );
  };

  const renderTeamCard = ({ item }) => {
    const roleStyle = getRoleStyle(item.role);
    const userName = item.user?.name || 'Pending Invitation';
    const userEmail = item.user?.email || item.email;
    const isPending = !item.acceptedAt;

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={[styles.iconBox, { backgroundColor: roleStyle.bg }]}>
            <Icon name={roleStyle.icon} size={24} color={roleStyle.text} />
          </View>
          <View style={styles.cardInfo}>
            <Text style={styles.cardTitle}>{userName}</Text>
            <View style={styles.emailRow}>
              <Icon name="mail-outline" size={12} color={C.muted} />
              <Text style={styles.emailText}>{userEmail}</Text>
            </View>
            {isPending && (
              <View style={styles.pendingBadge}>
                <Icon name="time-outline" size={12} color={C.warn} />
                <Text style={styles.pendingText}>Invitation Pending</Text>
              </View>
            )}
          </View>
        </View>

        <View style={styles.roleSection}>
          <Text style={styles.roleLabel}>Role</Text>
          <View style={styles.roleChips}>
            {ROLES.filter(r => r.key !== 'OWNER').map(role => {
              const isSelected = item.role === role.key;
              const rStyle = getRoleStyle(role.key);
              return (
                <TouchableOpacity
                  key={role.key}
                  style={[
                    styles.roleChip,
                    isSelected && { backgroundColor: rStyle.bg, borderColor: rStyle.text }
                  ]}
                  onPress={() => updateRole(item.id, role.key)}
                  disabled={!item.acceptedAt}
                >
                  <Text style={[styles.roleChipText, isSelected && { color: rStyle.text }]}>
                    {role.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            style={styles.removeBtn}
            onPress={() => removeMember(item)}
          >
            <Icon name="person-remove-outline" size={16} color={C.danger} />
            <Text style={[styles.actionText, { color: C.danger }]}>Remove</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
            <Icon name="arrow-back" size={24} color={C.ink} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Team Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={C.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.menuBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Team Management</Text>
        <TouchableOpacity onPress={openInviteModal}>
          <Icon name="person-add" size={28} color={C.primary} />
        </TouchableOpacity>
      </View>

      {/* Info Card */}
      <View style={styles.infoCard}>
        <Icon name="information-circle" size={24} color={C.info} />
        <Text style={styles.infoText}>
          Invite team members to collaborate on managing your restaurants
        </Text>
      </View>

      <FlatList
        data={teamMembers}
        keyExtractor={item => item.id.toString()}
        renderItem={renderTeamCard}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Icon name="people-outline" size={64} color={C.muted} />
            <Text style={styles.emptyTitle}>No Team Members Yet</Text>
            <Text style={styles.emptyText}>Invite your first team member</Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={openInviteModal}>
              <Icon name="person-add" size={18} color="#fff" />
              <Text style={styles.emptyBtnText}>Invite Member</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Invite Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Invite Team Member</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Icon name="close" size={24} color={C.ink} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={styles.label}>Member Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="John Doe"
                value={form.name}
                onChangeText={v => setForm(f => ({ ...f, name: v }))}
              />

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.input}
                placeholder="member@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={v => setForm(f => ({ ...f, email: v }))}
              />

              <Text style={styles.label}>Role *</Text>
              <View style={styles.roleGrid}>
                {ROLES.filter(r => r.key !== 'OWNER').map(role => {
                  const roleStyle = getRoleStyle(role.key);
                  const isSelected = form.role === role.key;
                  return (
                    <TouchableOpacity
                      key={role.key}
                      style={[
                        styles.roleSelectCard,
                        isSelected && { backgroundColor: roleStyle.bg, borderColor: roleStyle.text }
                      ]}
                      onPress={() => setForm(f => ({ ...f, role: role.key }))}
                    >
                      <Icon name={roleStyle.icon} size={24} color={roleStyle.text} />
                      <Text style={[styles.roleSelectText, isSelected && { color: roleStyle.text }]}>
                        {role.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={styles.roleDescriptions}>
                <Text style={styles.roleDescTitle}>Role Permissions:</Text>
                <Text style={styles.roleDesc}>• Admin: Full access to all features</Text>
                <Text style={styles.roleDesc}>• Manager: Manage staff and operations</Text>
                <Text style={styles.roleDesc}>• Staff: Basic operations and updates</Text>
                <Text style={styles.roleDesc}>• Viewer: Read-only access</Text>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={sendInvite} disabled={saving}>
                {saving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.saveText}>Send Invite</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
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
  menuBtn: { width: 40 },
  headerTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#EFF6FF',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
  },
  infoText: { flex: 1, fontSize: 13, color: C.info, lineHeight: 18 },

  list: { padding: 16 },
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  cardHeader: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '700', color: C.ink },
  emailRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  emailText: { fontSize: 12, color: C.muted },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFBEB',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  pendingText: { fontSize: 11, fontWeight: '600', color: C.warn },

  roleSection: { marginBottom: 12 },
  roleLabel: { fontSize: 12, fontWeight: '600', color: C.muted, marginBottom: 8 },
  roleChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  roleChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: C.bg,
    borderWidth: 1,
    borderColor: C.border,
  },
  roleChipText: { fontSize: 12, fontWeight: '600', color: C.muted },

  cardActions: { flexDirection: 'row', gap: 8 },
  removeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: '#FEF2F2',
  },
  actionText: { fontSize: 13, fontWeight: '600' },

  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: C.ink, marginTop: 16 },
  emptyText: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },
  emptyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: C.primary,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: C.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 18, fontWeight: '700', color: C.ink },
  modalBody: { padding: 16 },
  modalFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1, borderTopColor: C.border },

  label: { fontSize: 13, fontWeight: '600', color: C.muted, marginBottom: 8, marginTop: 12 },
  input: {
    backgroundColor: C.bg,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: C.text,
    borderWidth: 1,
    borderColor: C.border,
  },

  roleGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  roleSelectCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.bg,
  },
  roleSelectText: { fontSize: 14, fontWeight: '600', color: C.muted },

  roleDescriptions: {
    backgroundColor: C.bg,
    padding: 16,
    borderRadius: 12,
    marginTop: 8,
  },
  roleDescTitle: { fontSize: 13, fontWeight: '700', color: C.ink, marginBottom: 8 },
  roleDesc: { fontSize: 12, color: C.muted, marginBottom: 4 },

  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: C.bg, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700', color: C.ink },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: C.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
