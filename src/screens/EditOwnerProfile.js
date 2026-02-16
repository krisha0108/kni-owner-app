// screens/EditOwnerProfile.js
import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert, ScrollView,
  StyleSheet, ActivityIndicator, StatusBar, KeyboardAvoidingView, Platform
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import { api } from '../api/client';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A', primaryDark: '#D42E2E', ink: '#1D2254',
  text: '#0F172A', muted: '#6B7280', border: '#E5E7EB', bg: '#F5F7FA',
};

export default function EditOwnerProfile() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const initialFromNav = route?.params?.initial || {};

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [firstName, setFirstName] = useState(initialFromNav.first_name || '');
  const [lastName, setLastName] = useState(initialFromNav.last_name || '');
  const [email, setEmail] = useState(initialFromNav.email || '');
  const [phone, setPhone] = useState(initialFromNav.phone || '');
  const [password, setPassword] = useState('');
  const [restaurantName, setRestaurantName] = useState(initialFromNav.restaurant_name || '');
  const [locations, setLocations] = useState(
    typeof initialFromNav.locations === 'number'
      ? String(initialFromNav.locations)
      : (initialFromNav.locations ?? '0')
  );

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const res = await api.get('/app_api/owner/profile');
        const p = (res?.data?.data ?? res?.data) || {};

        const fullName = p?.name || '';
        const fName = p?.first_name ?? (fullName.split(' ')[0] || '');
        const lName = p?.last_name ?? (fullName.split(' ').slice(1).join(' ') || '');

        setFirstName(fName);
        setLastName(lName);
        setEmail(p?.email ?? '');
        setPhone(p?.phone ?? '');
        setPassword('');

        const locParsed = Number.parseInt((p?.locations ?? '').toString().trim(), 10);
        const hotelsCount = Number.parseInt((p?.stats?.hotels_count ?? '').toString().trim(), 10);
        const finalLocations = Number.isFinite(locParsed) ? locParsed : (Number.isFinite(hotelsCount) ? hotelsCount : 0);

        setRestaurantName(p?.restaurant_name ?? '');
        setLocations(String(finalLocations));
      } catch (e) {
        const status = e?.response?.status;
        if (status === 401) { /* handle auth */ }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const payload = useMemo(() => ({
    first_name: firstName,
    last_name: lastName,
    email,
    phone,
    ...(password ? { password } : {}),
    restaurant_name: restaurantName ?? null,
    locations: Number.parseInt(locations || '0', 10) || 0,
  }), [firstName, lastName, email, phone, password, restaurantName, locations]);

  const onSave = async () => {
    if (!firstName.trim()) return Alert.alert('Validation', 'First name is required.');
    if (!email.trim()) return Alert.alert('Validation', 'Email is required.');
    if (!phone.trim()) return Alert.alert('Validation', 'Phone is required.');
    try {
      setSaving(true);
      await api.put('/app_api/owner/profile', payload);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Unable to update.');
    } finally { setSaving(false); }
  };

  const initial = ((firstName || 'U')[0] || 'U').toUpperCase();

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
        <StatusBar barStyle="light-content" />
        <LinearGradient colors={[C.primary, C.primaryDark]} style={st.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
            <Icon name="chevron-back" size={scale(20)} color="#fff" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Edit Profile</Text>
          <View style={{ width: scale(40) }} />
        </LinearGradient>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={{ color: C.muted, marginTop: scale(12) }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['top', 'left', 'right']}>
      <StatusBar barStyle="light-content" />

      {/* ===== HEADER ===== */}
      <LinearGradient colors={[C.primary, C.primaryDark]} style={st.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={st.backBtn}>
          <Icon name="chevron-back" size={scale(20)} color="#fff" />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Edit Profile</Text>
        <TouchableOpacity onPress={onSave} disabled={saving} style={st.saveTopBtn}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={st.saveTopText}>Save</Text>
          }
        </TouchableOpacity>
      </LinearGradient>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView showsVerticalScrollIndicator={false}
          contentContainerStyle={{ padding: scale(16), paddingBottom: insets.bottom + 40 }}>

          {/* ===== AVATAR PREVIEW ===== */}
          <View style={st.avatarSection}>
            <LinearGradient colors={[C.primary, C.primaryDark]} style={st.avatarCircle}>
              <Text style={st.avatarText}>{initial}</Text>
            </LinearGradient>
            <Text style={st.avatarName}>{firstName || 'Your'} {lastName || 'Name'}</Text>
            <Text style={st.avatarSub}>{email || 'Add your email'}</Text>
          </View>

          {/* ===== FORM ===== */}
          <View style={st.formCard}>

            {/* --- Name Row --- */}
            <Text style={st.groupLabel}>Personal Details</Text>
            <View style={st.nameRow}>
              <View style={{ flex: 1, marginRight: scale(6) }}>
                <Text style={st.label}>First Name <Text style={{ color: C.primary }}>*</Text></Text>
                <View style={st.inputBox}>
                  <TextInput style={st.input} value={firstName} onChangeText={setFirstName}
                    placeholder="First name" placeholderTextColor="#B0B8C4" />
                </View>
              </View>
              <View style={{ flex: 1, marginLeft: scale(6) }}>
                <Text style={st.label}>Last Name</Text>
                <View style={st.inputBox}>
                  <TextInput style={st.input} value={lastName} onChangeText={setLastName}
                    placeholder="Last name" placeholderTextColor="#B0B8C4" />
                </View>
              </View>
            </View>

            <Text style={st.label}>Email <Text style={{ color: C.primary }}>*</Text></Text>
            <View style={st.inputBox}>
              <Icon name="mail-outline" size={scale(16)} color="#94A3B8" style={{ marginLeft: scale(12) }} />
              <TextInput style={[st.input, { paddingLeft: scale(8) }]} value={email} onChangeText={setEmail}
                placeholder="your@email.com" placeholderTextColor="#B0B8C4"
                keyboardType="email-address" autoCapitalize="none" />
            </View>

            <Text style={st.label}>Phone <Text style={{ color: C.primary }}>*</Text></Text>
            <View style={st.inputBox}>
              <Icon name="call-outline" size={scale(16)} color="#94A3B8" style={{ marginLeft: scale(12) }} />
              <TextInput style={[st.input, { paddingLeft: scale(8) }]} value={phone} onChangeText={setPhone}
                placeholder="+91 98765 43210" placeholderTextColor="#B0B8C4" keyboardType="phone-pad" />
            </View>

            {/* --- Divider --- */}
            <View style={st.divider} />

            {/* --- Password --- */}
            <Text style={st.groupLabel}>Security</Text>
            <Text style={st.label}>New Password</Text>
            <View style={st.inputBox}>
              <Icon name="lock-closed-outline" size={scale(16)} color="#94A3B8" style={{ marginLeft: scale(12) }} />
              <TextInput style={[st.input, { paddingLeft: scale(8) }]} value={password} onChangeText={setPassword}
                placeholder="Leave blank to keep current" placeholderTextColor="#B0B8C4"
                secureTextEntry={!showPassword} autoCapitalize="none" />
              <TouchableOpacity onPress={() => setShowPassword(s => !s)} style={{ padding: scale(12) }}>
                <Icon name={showPassword ? 'eye-off' : 'eye'} size={scale(18)} color="#94A3B8" />
              </TouchableOpacity>
            </View>
            <Text style={st.hint}>Only fill this if you want to change your password</Text>

            {/* --- Divider --- */}
            <View style={st.divider} />

            {/* --- Business --- */}
            <Text style={st.groupLabel}>Business</Text>
            <Text style={st.label}>Restaurant Name</Text>
            <View style={st.inputBox}>
              <Icon name="restaurant-outline" size={scale(16)} color="#94A3B8" style={{ marginLeft: scale(12) }} />
              <TextInput style={[st.input, { paddingLeft: scale(8) }]} value={restaurantName} onChangeText={setRestaurantName}
                placeholder="Your restaurant name" placeholderTextColor="#B0B8C4" />
            </View>

            <Text style={st.label}>Locations</Text>
            <View style={st.inputBox}>
              <Icon name="location-outline" size={scale(16)} color="#94A3B8" style={{ marginLeft: scale(12) }} />
              <TextInput style={[st.input, { paddingLeft: scale(8) }]} value={locations} onChangeText={setLocations}
                placeholder="e.g. 3" placeholderTextColor="#B0B8C4" keyboardType="number-pad" />
            </View>
          </View>

          {/* ===== BUTTONS ===== */}
          <TouchableOpacity disabled={saving} onPress={onSave} activeOpacity={0.85} style={{ marginTop: scale(16) }}>
            <LinearGradient colors={[C.primary, C.primaryDark]} style={st.saveBtn}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Icon name="checkmark-circle" size={scale(20)} color="#fff" />
                  <Text style={st.saveBtnText}>Save Changes</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => navigation.goBack()} style={st.cancelBtn}>
            <Text style={st.cancelBtnText}>Cancel</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  /* Header */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: scale(16),
    paddingVertical: scale(14),
  },
  backBtn: {
    width: scale(40), height: scale(40), borderRadius: scale(12),
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    fontSize: moderateScale(18), fontWeight: '800', color: '#fff',
  },
  saveTopBtn: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: scale(16), paddingVertical: scale(8), borderRadius: scale(10),
  },
  saveTopText: {
    color: '#fff', fontWeight: '800', fontSize: moderateScale(14),
  },

  /* Avatar */
  avatarSection: {
    alignItems: 'center', paddingVertical: scale(20),
  },
  avatarCircle: {
    width: scale(72), height: scale(72), borderRadius: scale(24),
    alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: scale(10), elevation: 6,
  },
  avatarText: {
    color: '#fff', fontSize: moderateScale(30), fontWeight: '900',
  },
  avatarName: {
    color: C.ink, fontWeight: '800', fontSize: moderateScale(18), marginTop: scale(12),
  },
  avatarSub: {
    color: C.muted, fontSize: moderateScale(13), marginTop: scale(3),
  },

  /* Form Card */
  formCard: {
    backgroundColor: '#fff',
    borderRadius: scale(20),
    padding: scale(18),
    borderWidth: 1,
    borderColor: '#EEF2F7',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: scale(3) },
    shadowOpacity: 0.06,
    shadowRadius: scale(10),
    elevation: 3,
  },

  /* Group Label */
  groupLabel: {
    fontSize: moderateScale(14), fontWeight: '800', color: C.ink,
    marginBottom: scale(12), marginTop: scale(4),
  },

  /* Label */
  label: {
    fontSize: moderateScale(12), fontWeight: '600', color: C.muted,
    marginBottom: scale(6), marginLeft: scale(2),
  },

  /* Input */
  nameRow: { flexDirection: 'row' },
  inputBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F8FAFC', borderRadius: scale(12),
    borderWidth: 1.2, borderColor: '#E2E8F0',
    marginBottom: scale(14),
  },
  input: {
    flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(13),
    fontSize: moderateScale(15), color: C.text, fontWeight: '500',
  },

  /* Hint */
  hint: {
    fontSize: moderateScale(11.5), color: '#94A3B8', marginTop: scale(-6), marginBottom: scale(8), marginLeft: scale(2),
  },

  /* Divider */
  divider: {
    height: 1, backgroundColor: '#F1F5F9', marginVertical: scale(16),
  },

  /* Save / Cancel */
  saveBtn: {
    borderRadius: scale(14), paddingVertical: scale(16),
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: scale(8),
    shadowColor: C.primary, shadowOpacity: 0.2, shadowRadius: scale(8),
    shadowOffset: { width: 0, height: scale(4) }, elevation: 4,
  },
  saveBtnText: {
    color: '#fff', fontWeight: '800', fontSize: moderateScale(16),
  },
  cancelBtn: {
    marginTop: scale(10), paddingVertical: scale(14), alignItems: 'center',
    borderRadius: scale(14), backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: C.muted, fontWeight: '700', fontSize: moderateScale(15),
  },
});
