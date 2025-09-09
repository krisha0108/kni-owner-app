// screens/EditOwnerProfile.js
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';

const C = { primary:'#EF3A3A', ink:'#1D2254', text:'#0F172A', muted:'#6B7280', border:'#E5E7EB', bg:'#F5F7FA' };

export default function EditOwnerProfile() {
  const route = useRoute();
  const navigation = useNavigation();
  const initialFromNav = route?.params?.initial || {};

  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
// top of component (with other useState hooks)
const [showPassword, setShowPassword] = useState(false);

  // ---- state (prefilled from API) ----
  const [firstName, setFirstName]           = useState(initialFromNav.first_name || '');
  const [lastName, setLastName]             = useState(initialFromNav.last_name || '');
  const [email, setEmail]                   = useState(initialFromNav.email || '');
  const [phone, setPhone]                   = useState(initialFromNav.phone || '');
  const [password, setPassword]             = useState(''); // NEVER prefill
  const [restaurantName, setRestaurantName] = useState(initialFromNav.restaurant_name || '');
  const [locations, setLocations]           = useState(
    typeof initialFromNav.locations === 'number'
      ? String(initialFromNav.locations)
      : (initialFromNav.locations ?? '0')
  );

// ---- fetch fresh owner profile on mount to prefill all fields ----
useEffect(() => {
  (async () => {
    try {
      setLoading(true);

      const res = await api.get('/app_api/owner/profile');
      // Some backends return { data: {...} } (Resources); support both
      const p = (res?.data?.data ?? res?.data) || {};
      console.log('Profile API full response:', res?.data);

      // First/Last derivation fallback
      const fullName = p?.name || '';
      const fName = p?.first_name ?? (fullName.split(' ')[0] || '');
      const lName = p?.last_name  ?? (fullName.split(' ').slice(1).join(' ') || '');

      setFirstName(fName);
      setLastName(lName);
      setEmail(p?.email ?? '');
      setPhone(p?.phone ?? '');
      setPassword(''); // never prefill

      // Parse locations robustly (may be "3" or 3 or null)
      const locParsed = Number.parseInt(
        (p?.locations ?? '').toString().trim(),
        10
      );
      const hotelsCount = Number.parseInt(
        (p?.stats?.hotels_count ?? '').toString().trim(),
        10
      );

      const finalLocations = Number.isFinite(locParsed)
        ? locParsed
        : (Number.isFinite(hotelsCount) ? hotelsCount : 0);

      console.log('Restaurant name from API:', p?.restaurant_name);
      console.log('Locations from API:', p?.locations, '| Hotels count:', p?.stats?.hotels_count);

      setRestaurantName(p?.restaurant_name ?? '');
      setLocations(String(finalLocations));
    } catch (e) {
      const status = e?.response?.status;
      const body = e?.response?.data;
      console.log('Owner profile prefill failed:', status, body || e?.message);

      // Optional: if not authenticated, send user to login
      if (status === 401) {
        // navigation.replace('Login'); // uncomment if you have a Login screen
      }
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
    ...(password ? { password } : {}),           // only if user types
    restaurant_name: restaurantName ?? null,     // optional
    locations: Number.parseInt(locations || '0', 10) || 0, // integer
  }), [firstName, lastName, email, phone, password, restaurantName, locations]);

  const onSave = async () => {
    if (!firstName.trim()) return Alert.alert('Validation', 'First name is required.');
    if (!email.trim())     return Alert.alert('Validation', 'Email is required.');
    if (!phone.trim())     return Alert.alert('Validation', 'Phone is required.');

    try {
      setSaving(true);
      await api.put('/app_api/owner/profile', payload);
      Alert.alert('Saved', 'Your profile has been updated.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (e) {
      Alert.alert('Error', e?.response?.data?.message || 'Unable to update.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{flex:1, alignItems:'center', justifyContent:'center', backgroundColor:C.bg}}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <SafeAreaView style={{flex:1, backgroundColor:C.bg}} edges={['top','left','right']}>
    <ScrollView style={{ flex:1, backgroundColor: C.bg }} contentContainerStyle={{ padding:16 }}>
      <Text style={st.h1}>Edit Profile</Text>

      <View style={st.row2}>
        <View style={{ flex:1, marginRight:8 }}>
          <Text style={st.label}>First name</Text>
          <TextInput style={st.input} value={firstName} onChangeText={setFirstName} placeholder="First name" />
        </View>
        <View style={{ flex:1, marginLeft:8 }}>
          <Text style={st.label}>Last name</Text>
          <TextInput style={st.input} value={lastName} onChangeText={setLastName} placeholder="Last name" />
        </View>
      </View>

      <Text style={st.label}>Email</Text>
      <TextInput style={st.input} value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" keyboardType="email-address" />

      <Text style={st.label}>Phone</Text>
      <TextInput style={st.input} value={phone} onChangeText={setPhone} placeholder="Phone" keyboardType="phone-pad" />

      {/* Auto field: keep empty by default for security */}
      <Text style={st.label}>Password (leave blank to keep same)</Text>
<View style={st.inputWrap}>
  <TextInput
    style={[st.input, st.inputWithIcon]}
    value={password}
    onChangeText={setPassword}
    placeholder="New password"
    secureTextEntry={!showPassword}
    autoCapitalize="none"
    autoCorrect={false}
    textContentType="password" // iOS hint
  />
  <TouchableOpacity
    onPress={() => setShowPassword(s => !s)}
    style={st.eyeBtn}
    accessibilityRole="button"
    accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
  >
    <Icon name={showPassword ? 'eye-off' : 'eye'} size={18} color={C.muted} />
  </TouchableOpacity>
</View>
      {/* Auto-filled from owner table */}
      <Text style={st.label}>Restaurant name</Text>
      <TextInput style={st.input} value={restaurantName} onChangeText={setRestaurantName} placeholder="Restaurant name" />

      {/* Auto-filled (integer) from owner table (or hotels_count fallback) */}
      <Text style={st.label}>Locations (count)</Text>
      <TextInput
        style={st.input}
        value={locations}
        onChangeText={setLocations}
        placeholder="e.g. 3"
        keyboardType="number-pad"
      />

      <TouchableOpacity disabled={saving} onPress={onSave} style={st.saveBtn}>
        {saving ? <ActivityIndicator color="#fff" /> : (<>
          <Icon name="save-outline" color="#fff" size={18} />
          <Text style={st.saveTxt}>Save</Text>
        </>)}
      </TouchableOpacity>
    </ScrollView>
    </SafeAreaView>
  );
}

const st = StyleSheet.create({
  h1: { color: C.ink, fontWeight: '900', fontSize: 20, marginBottom: 12 },
  label: { color: C.muted, marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: '#fff', borderWidth: 1, borderColor: C.border, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, color: C.text
  },
  row2: { flexDirection: 'row' },
  saveBtn: {
    marginTop: 18, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 12,
    alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8
  },
  saveTxt: { color: '#fff', fontWeight: '900', marginLeft: 8 },
  inputWrap: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputWithIcon: {
    paddingRight: 44, // leave room for the eye button
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    height: '100%',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
});
