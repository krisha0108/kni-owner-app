// screens/ProfileScreen.js
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image, TouchableOpacity,
  RefreshControl, Animated, Share, Linking, Dimensions, FlatList,
  Modal, TextInput, Switch, ActivityIndicator, StatusBar
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import LinearGradient from 'react-native-linear-gradient';
import NavigationMenu from '../components/NavigationMenu';
import auth from '@react-native-firebase/auth';
import axios from 'axios';
import { api, IMAGE_BASE_URL } from '../api/client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { useFocusEffect } from '@react-navigation/native';
import { useRestaurant } from '../context/RestaurantContext';
import { exportAnalyticsPDF, openPDF } from '../services/analyticsService';

import { scale, moderateScale } from '../utils/responsive';
import useKeyboardHeight from '../utils/useKeyboardHeight';
import AppAlert from '../utils/AppAlert';
const C = {
  primary: '#EF3A3A', primaryDark: '#D42E2E', ink: '#1D2254',
  bg: '#F5F7FA', card: '#FFFFFF', text: '#0F172A',
  muted: '#6B7280', border: '#E5E7EB', ok: '#10B981', warn: '#F59E0B',
};
const { width: W, height: H } = Dimensions.get('window');
const HERO_H = 260;

const Stars = ({ value = 0, size = 12 }) => (
  <View style={{ flexDirection: 'row' }}>
    {Array.from({ length: 5 }).map((_, i) => (
      <Icon key={i} name={i < Math.round(value) ? 'star' : 'star-outline'} size={size} color="#F59E0B" />
    ))}
  </View>
);

/* ===== DELETE ACCOUNT MODAL ===== */
const DeleteAccountModal = ({ visible, onClose, user }) => {
  const handleEmailSupport = () => {
    const email = 'info@kniservices.com';
    const subject = 'Delete My Account Request';
    const body = `Please delete my account with the following details:\n\n- Registered Name: ${user?.name || 'N/A'}\n- Registered Email: ${user?.email || 'N/A'}\n- Registered Phone: ${user?.phone || 'N/A'}\n- User ID: ${user?.id || 'N/A'}\n\nI confirm that I want to permanently delete my account and all associated data.`;
    Linking.openURL(`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`).catch(() => {
      AppAlert.alert('Error', 'Could not open email client. Please email info@kniservices.com directly.');
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={modalBase.overlay}>
        <View style={[modalBase.sheet, { maxHeight: H * 0.9 }]}>
          <View style={modalBase.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <LinearGradient colors={['#FEE2E2', '#FECACA']} style={modalBase.headerIcon}>
                <Icon name="trash-outline" size={scale(18)} color="#DC2626" />
              </LinearGradient>
              <Text style={modalBase.headerTitle}>Delete Account</Text>
            </View>
            <TouchableOpacity onPress={onClose} style={modalBase.closeBtn}>
              <Icon name="close" size={scale(20)} color={C.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: scale(20) }} showsVerticalScrollIndicator={false}>
            <LinearGradient colors={['#FEF2F2', '#FEE2E2']} style={delS.warningBox}>
              <Icon name="warning" size={scale(20)} color="#DC2626" />
              <Text style={delS.warningText}>This action cannot be undone. All data will be permanently deleted.</Text>
            </LinearGradient>
            <Text style={{ fontSize: moderateScale(15), fontWeight: '700', color: C.ink, marginBottom: scale(14) }}>Contact support to delete:</Text>
            <TouchableOpacity style={delS.optionCard} onPress={handleEmailSupport} activeOpacity={0.7}>
              <LinearGradient colors={['#EFF6FF', '#DBEAFE']} style={delS.optionIcon}>
                <Icon name="mail" size={scale(20)} color="#2563EB" />
              </LinearGradient>
              <View style={{ flex: 1 }}>
                <Text style={delS.optionTitle}>Email Support</Text>
                <Text style={delS.optionSub}>info@kniservices.com</Text>
              </View>
              <Icon name="chevron-forward" size={scale(18)} color={C.muted} />
            </TouchableOpacity>
            <View style={delS.infoCard}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(10) }}>
                <Icon name="trash" size={scale(16)} color="#DC2626" />
                <Text style={{ fontSize: moderateScale(14), fontWeight: '700', color: C.ink }}>What gets deleted</Text>
              </View>
              {['User profile', 'Photos & attachments', 'Activity logs', 'Service history', 'Payment info'].map((t, i) => (
                <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: scale(8), marginBottom: scale(5) }}>
                  <View style={{ width: scale(4), height: scale(4), borderRadius: scale(2), backgroundColor: '#DC2626' }} />
                  <Text style={{ fontSize: moderateScale(13), color: C.muted }}>{t}</Text>
                </View>
              ))}
            </View>
          </ScrollView>
          <View style={modalBase.footer}>
            <TouchableOpacity style={modalBase.cancelBtn} onPress={onClose}>
              <Text style={modalBase.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* ===== PASSWORD CHANGE MODAL ===== */
const PasswordChangeModal = ({ visible, onClose }) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const keyboardHeight = useKeyboardHeight();

  const resetForm = () => {
    setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
    setShowCurrent(false); setShowNew(false); setShowConfirm(false);
  };

  const handleChangePassword = async () => {
    if (!currentPassword.trim()) { AppAlert.alert('Error', 'Please enter your current password'); return; }
    if (!newPassword.trim()) { AppAlert.alert('Error', 'Please enter a new password'); return; }
    if (newPassword.length < 8) { AppAlert.alert('Error', 'New password must be at least 8 characters'); return; }
    if (newPassword !== confirmPassword) { AppAlert.alert('Error', 'Passwords do not match'); return; }
    setLoading(true);
    try {
      const response = await api.put('/owner/profile/password', { currentPassword, newPassword });
      if (response.data.ok) { AppAlert.alert('Success', 'Password changed successfully'); resetForm(); onClose(); }
      else { AppAlert.alert('Error', response.data.error || 'Failed to change password'); }
    } catch (error) { AppAlert.alert('Error', error.response?.data?.error || 'Failed to change password'); }
    finally { setLoading(false); }
  };

  const handleClose = () => { resetForm(); onClose(); };

  const PwInput = ({ label, value, onChange, placeholder, show, toggleShow }) => (
    <View style={{ marginBottom: scale(16) }}>
      <Text style={pwS.label}>{label}</Text>
      <View style={pwS.inputWrap}>
        <TextInput style={pwS.input} placeholder={placeholder} placeholderTextColor={C.muted}
          secureTextEntry={!show} value={value} onChangeText={onChange} />
        <TouchableOpacity onPress={toggleShow} style={{ padding: scale(12) }}>
          <Icon name={show ? 'eye-off' : 'eye'} size={scale(20)} color={C.muted} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={handleClose}>
      <View style={modalBase.overlay}>
        <View style={modalBase.sheet}>
          <View style={modalBase.header}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={modalBase.headerIcon}>
                <Icon name="lock-closed" size={scale(18)} color={C.primary} />
              </LinearGradient>
              <Text style={modalBase.headerTitle}>Change Password</Text>
            </View>
            <TouchableOpacity onPress={handleClose} style={modalBase.closeBtn}>
              <Icon name="close" size={scale(20)} color={C.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView style={{ padding: scale(20) }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            <PwInput label="Current Password" value={currentPassword} onChange={setCurrentPassword}
              placeholder="Enter current password" show={showCurrent} toggleShow={() => setShowCurrent(!showCurrent)} />
            <PwInput label="New Password" value={newPassword} onChange={setNewPassword}
              placeholder="At least 8 characters" show={showNew} toggleShow={() => setShowNew(!showNew)} />
            <PwInput label="Confirm Password" value={confirmPassword} onChange={setConfirmPassword}
              placeholder="Re-enter new password" show={showConfirm} toggleShow={() => setShowConfirm(!showConfirm)} />
            <View style={pwS.tipBox}>
              <Icon name="information-circle" size={scale(18)} color="#3B82F6" />
              <Text style={pwS.tipText}>Password must be at least 8 characters with letters and numbers.</Text>
            </View>
          </ScrollView>
          <View style={[modalBase.footer, { flexDirection: 'row', gap: scale(12) }]}>
            <TouchableOpacity style={[modalBase.cancelBtn, { flex: 1 }]} onPress={handleClose}>
              <Text style={modalBase.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[pwS.saveBtn, loading && { opacity: 0.6 }]} onPress={handleChangePassword} disabled={loading}>
              {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={pwS.saveBtnText}>Update</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

/* =========================================================
   MAIN SCREEN
   ========================================================= */
export default function ProfileScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { selectedRestaurant, selectedRestaurantId } = useRestaurant();
  const [exporting, setExporting] = useState(false);

  const handleExportPDF = async () => {
    if (!selectedRestaurantId) {
      AppAlert.alert('Error', 'Please select a restaurant first');
      return;
    }
    setExporting(true);
    try {
      const filePath = await exportAnalyticsPDF(selectedRestaurantId);
      AppAlert.alert('Export Successful', 'Analytics report has been exported', [
        { text: 'Open', onPress: () => openPDF(filePath) },
        { text: 'OK', style: 'cancel' }
      ]);
    } catch (error) {
      AppAlert.alert('Export Failed', error.message || 'Could not export analytics');
    } finally {
      setExporting(false);
    }
  };
  const scrollY = useRef(new Animated.Value(0)).current;
  // The profile card overlaps the hero photo at rest (negative marginTop),
  // but once stickyHeaderIndices docks it at the top of the screen during
  // scroll, that same offset would push its top edge off-screen and clip it.
  // Device-independent: cancels the sticky container's own insets-aware
  // paddingTop, then pulls up a further fixed amount for the overlap.
  const cardOverlap = (insets.top > 0 ? insets.top : 0) + scale(16) + scale(22);
  // Separate, JS-driven (non-native) value for that margin. marginTop affects
  // layout - so the content below it flows right after with no gap - unlike
  // a transform, which only shifts the card visually and leaves its original
  // layout space (and thus a gap) behind. It's kept on its own Animated.Value
  // (not derived from the native-driven scrollY) because native-driven and
  // JS-driven animations can't share one value; a scroll listener below
  // toggles it between -cardOverlap and 0 as the card docks/undocks.
  const cardMarginAnim = useRef(new Animated.Value(-cardOverlap)).current;
  const isDockedRef = useRef(false);
  const [user, setUser] = useState(null);
  const [hotels, setHotels] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(true);
  const [pushSaving, setPushSaving] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [menuVisible, setMenuVisible] = useState(false);
  // Status bar icons need to be light while the colored hero image is behind
  // them, but dark once the white sticky card docks at the top and covers
  // that area - otherwise the docked-card state has invisible white-on-white
  // icons/clock.
  const [darkStatusBar, setDarkStatusBar] = useState(false);

  const calculateCartCount = useCallback(async () => {
    try {
      const a = await AsyncStorage.getItem('owner_id');
      const b = await AsyncStorage.getItem('restaurant_owner_id');
      const c = await AsyncStorage.getItem('ownerId');
      const ownerId = String(a || b || c || '').trim();
      const ownerKey = ownerId ? `owner:${ownerId}` : 'global';
      const allKeys = await AsyncStorage.getAllKeys();
      const rdraftKeys = allKeys.filter(k => k.startsWith(`rdraft:${ownerKey}:`));
      let total = 0;
      for (const key of rdraftKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (raw) { const obj = JSON.parse(raw); total += Object.values(obj || {}).reduce((s, q) => s + Number(q || 0), 0); }
      }
      setCartCount(total);
    } catch (e) { setCartCount(0); }
  }, []);

  useFocusEffect(useCallback(() => { calculateCartCount(); }, [calculateCartCount]));

  const getFssaiCertificateUrl = (restaurant) => {
    if (!restaurant) return '';
    const fssaiUrl = restaurant.fssai_certificate_url || restaurant.fssai_certificate ||
      restaurant.fssai_certificate_pdf || restaurant.certificate_url || restaurant.fssai_document;
    if (!fssaiUrl || fssaiUrl.trim() === '') return '';
    let u = fssaiUrl.trim().replace(/\s+/g, '');
    if (u.includes('localhost')) u = u.replace('http://localhost/storage', IMAGE_BASE_URL);
    if (u.startsWith('http')) return u;
    return `${IMAGE_BASE_URL}/${u.replace(/^\//, '')}`;
  };

  const viewPDF = async () => {
    let pdfUrl = user?.fssaiCertUrl;
    if (!pdfUrl || pdfUrl.trim() === '') { AppAlert.alert('Certificate Not Available', 'No FSSAI certificate found.'); return; }
    pdfUrl = pdfUrl.trim().replace(/\s+/g, '');
    if (pdfUrl.includes('localhost')) pdfUrl = pdfUrl.replace('http://localhost/storage', IMAGE_BASE_URL);
    if (!pdfUrl.startsWith('http')) { AppAlert.alert('Invalid URL', 'Certificate URL format is incorrect.'); return; }
    try {
      const canOpen = await Linking.canOpenURL(pdfUrl);
      if (canOpen) await Linking.openURL(pdfUrl);
      else await Linking.openURL(`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfUrl)}`);
    } catch (e) {
      AppAlert.alert('Unable to Open', 'Make sure you have a PDF viewer.', [
        { text: 'OK', style: 'cancel' },
        { text: 'Try Browser', onPress: () => Linking.openURL(pdfUrl).catch(() => {}) }
      ]);
    }
  };

  const fetchProfile = useCallback(async () => {
    try {
      const res = await api.get('/restaurants/profile');
      const p = res.data;
      const first = p?.restaurants?.[0];
      setUser({
        name: p?.name ?? 'User', email: p?.email ?? '-', phone: p?.phone ?? '-',
        cover: p?.cover ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop',
        fssaiNo: first?.fssai_number ?? '---',
        fssaiCertUrl: getFssaiCertificateUrl(first),
        referral: p?.referral_code ?? 'KNI-REF-0001',
        hotelsCount: p?.stats?.hotels_count ?? 0,
        requests: p?.stats?.requests_count ?? 0,
        rating: Number(p?.rating ?? 0),
      });
      setHotels((p?.restaurants ?? []).map(r => ({
        id: String(r.id), name: r.hotel_name, address: r.address, rating: r.rating ?? 0,
        photo: r.photo ? `${IMAGE_BASE_URL}/${r.photo}` : null,
        fssaiNo: r.fssai_number, fssaiCertUrl: getFssaiCertificateUrl(r),
      })));
      setReviews((p?.reviews ?? []).map(rv => ({
        id: String(rv.id), from: rv.author_name ?? 'Anonymous', text: rv.text ?? '', stars: rv.stars ?? 0,
      })));
    } catch (e) { AppAlert.alert('Error', 'Unable to load your profile.'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { const t = setTimeout(() => fetchProfile(), 650); return () => clearTimeout(t); }, [fetchProfile]);
  const onRefresh = () => { setRefreshing(true); fetchProfile(); };

  useEffect(() => {
    (async () => {
      try {
        const response = await api.get('/notifications/preferences');
        if (response.data.ok && typeof response.data.data?.enablePush === 'boolean') {
          setPushEnabled(response.data.data.enablePush);
        }
      } catch (error) { console.error('Fetch notification preferences error:', error); }
    })();
  }, []);

  const togglePush = async () => {
    const next = !pushEnabled;
    setPushEnabled(next);
    setPushSaving(true);
    try {
      const response = await api.patch('/notifications/preferences', { enablePush: next });
      if (!response.data.ok) { setPushEnabled(!next); AppAlert.alert('Error', response.data.error || 'Failed to update'); }
    } catch (error) {
      setPushEnabled(!next);
      AppAlert.alert('Error', 'Failed to update notification preferences');
    } finally { setPushSaving(false); }
  };

  const handleLogout = async () => {
    try {
      const provider = await AsyncStorage.getItem('authProvider');
      if (provider === 'google') {
        try { await auth().signOut(); } catch (e) {}
        try { await GoogleSignin.signOut(); } catch (e) {}
        try { await GoogleSignin.revokeAccess(); } catch (e) {}
      }
    } catch (e) {} finally {
      await AsyncStorage.multiRemove(['authProvider', 'APP_TOKEN', 'userToken', 'ownerToken', 'ownerData', 'ownerId', 'token', 'user']);
      try { delete api.defaults.headers.common.Authorization; } catch (_) {}
      try { delete axios.defaults.headers.common.Authorization; } catch (_) {}
      navigation.reset({ index: 0, routes: [{ name: 'RestaurantLogin' }] });
    }
  };

  const shareReferral = async () => {
    try { await Share.share({ message: `Join me on KNI! Use my referral code: ${user?.referral ?? ''}` }); } catch (e) {}
  };

  const initial = ((user?.name || 'U')[0] || 'U').toUpperCase();
  // Google-signup users have no real phone yet (older ones may carry a Firebase UID);
  // a valid phone is 7+ digits with no letters. Anything else => prompt to add one.
  const needsPhone = !/^\+?[0-9][0-9\s-]{6,}$/.test(String(user?.phone || '').trim());
  const CARD_W = W * 0.82;
  const GAP = 12;
  const hotelsData = [...(hotels || []), { id: 'more', type: 'more' }];

  /* parallax transforms */
  const heroScale = scrollY.interpolate({ inputRange: [-200, 0], outputRange: [1.8, 1], extrapolateRight: 'clamp' });
  const heroTranslateY = scrollY.interpolate({ inputRange: [-200, 0, HERO_H], outputRange: [-80, 0, HERO_H * 0.4], extrapolateLeft: 'clamp' });
  const overlayOpacity = scrollY.interpolate({ inputRange: [0, HERO_H * 0.6], outputRange: [0.25, 0.65], extrapolate: 'clamp' });
  const heroContentOpacity = scrollY.interpolate({ inputRange: [0, HERO_H * 0.4], outputRange: [1, 0], extrapolate: 'clamp' });
  const heroContentTranslateY = scrollY.interpolate({ inputRange: [0, HERO_H * 0.4], outputRange: [0, -30], extrapolate: 'clamp' });

  if (loading) return <SkeletonProfileView insetsBottom={insets.bottom} />;

  const navigateEdit = () => {
    const firstName = (user?.name || '').split(' ')[0] || '';
    const lastName = (user?.name || '').split(' ').slice(1).join(' ') || '';
    navigation.navigate('EditOwnerProfile', {
      initial: {
        first_name: firstName, last_name: lastName,
        email: user?.email || '', phone: user?.phone || '', password: '',
        restaurant_name: user?.restaurant_name || '',
        locations: Number.isFinite(user?.locations) ? String(user.locations) : '0',
      }
    });
  };

  const SettingRow = ({ icon, iconColor, iconBg, title, subtitle, onPress, last, danger, right }) => (
    <TouchableOpacity activeOpacity={onPress ? 0.55 : 1} onPress={onPress} disabled={!onPress}
      style={[st.settingRow, last && { borderBottomWidth: 0 }]}>
      <View style={st.settingRowLeft}>
        <LinearGradient colors={iconBg} style={st.settingIcon}>
          <Icon name={icon} size={scale(17)} color={iconColor} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[st.settingTitle, danger && { color: danger }]}>{title}</Text>
          {subtitle ? <Text style={st.settingSub}>{subtitle}</Text> : null}
        </View>
      </View>
      {right ?? <Icon name="chevron-forward" size={scale(18)} color={danger || '#CBD5E1'} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle={darkStatusBar ? 'dark-content' : 'light-content'} backgroundColor={darkStatusBar ? C.card : C.primary} />

      <Animated.ScrollView
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          {
            useNativeDriver: true,
            listener: (e) => {
              const shouldDock = e.nativeEvent.contentOffset.y > HERO_H - 40;
              setDarkStatusBar((prev) => (prev === shouldDock ? prev : shouldDock));
              if (shouldDock !== isDockedRef.current) {
                isDockedRef.current = shouldDock;
                Animated.timing(cardMarginAnim, {
                  toValue: shouldDock ? 0 : -cardOverlap,
                  duration: 180,
                  useNativeDriver: false,
                }).start();
              }
            },
          }
        )}
        scrollEventThrottle={16}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[C.primary]} tintColor={C.primary} progressViewOffset={HERO_H} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + scale(120) }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[1]}
      >
        {/* ===== 0: HERO IMAGE ===== */}
        <View style={{ height: HERO_H, overflow: 'hidden' }}>
          <Animated.Image
            source={{ uri: user?.cover ?? 'https://images.unsplash.com/photo-1540189549336-e6e99c3679fe?q=80&w=1600&auto=format&fit=crop' }}
            style={[StyleSheet.absoluteFillObject, { transform: [{ scale: heroScale }, { translateY: heroTranslateY }] }]}
            resizeMode="cover"
          />
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: '#000', opacity: overlayOpacity }]} />

          {/* Decorative gradient blobs */}
          <LinearGradient colors={['rgba(239,58,58,0.35)', 'transparent']} style={st.blobA} />
          <LinearGradient colors={['rgba(29,34,84,0.25)', 'transparent']} style={st.blobB} />

          {/* Top buttons INSIDE hero (scrolls with image) */}
          <View style={[st.heroTopBar, { paddingTop: insets.top + scale(8) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10) }}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => setMenuVisible(true)} style={st.heroBtn}>
                <Icon name="menu" size={scale(18)} color="#fff" />
              </TouchableOpacity>
              <View style={st.heroBrand}>
                <Icon name="person" size={scale(14)} color="#fff" />
                <Text style={st.heroBrandText}>Profile</Text>
              </View>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={navigateEdit} style={st.heroBtn}>
              <Icon name="create-outline" size={scale(18)} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Bottom gradient fade */}
          <LinearGradient colors={['transparent', 'rgba(0,0,0,0.5)']} style={st.heroBottomFade} />

          {/* Hero content */}
          <Animated.View style={[st.heroContent, { opacity: heroContentOpacity, transform: [{ translateY: heroContentTranslateY }] }]}>
            <Text style={st.heroWelcome}>Welcome back</Text>
            <Text style={st.heroName}>{user?.name ?? 'User'}</Text>
            <View style={st.heroTagRow}>
              <LinearGradient colors={[C.ok, '#059669']} style={st.heroTag}>
                <Icon name="shield-checkmark" size={scale(12)} color="#fff" />
                <Text style={st.heroTagText}>KNI Verified</Text>
              </LinearGradient>
              <View style={st.heroTag2}>
                <Icon name="star" size={scale(12)} color="#F59E0B" />
                <Text style={st.heroTag2Text}>{(user?.rating ?? 0).toFixed(1)} Rating</Text>
              </View>
              {selectedRestaurant?.restaurantRole && (
                <View style={st.heroTag2}>
                  <Icon name="person-circle" size={scale(12)} color="#6366F1" />
                  <Text style={st.heroTag2Text}>{selectedRestaurant.restaurantRole}</Text>
                </View>
              )}
            </View>
          </Animated.View>
        </View>

        {/* ===== 1: STICKY PROFILE CARD ===== */}
        <View style={[st.stickyContainer, { paddingTop: (insets.top > 0 ? insets.top : 0) + scale(16) }]}>
          {/* Profile Info — marginTop overlaps the hero photo at rest, then
              animates back to 0 once stickyHeaderIndices docks this section
              at the top, so the docked card isn't clipped (see cardMarginAnim
              above). Using margin (not transform) also keeps the content
              below flowing right after the card instead of leaving a gap. */}
          <Animated.View style={[st.profileCard, { marginTop: cardMarginAnim }]}>
            <View style={st.profileTop}>
              <LinearGradient colors={[C.primary, C.primaryDark]} style={st.avatar}>
                <Text style={st.avatarText}>{initial}</Text>
              </LinearGradient>
              <View style={{ flex: 1, marginLeft: scale(10), marginRight: scale(28) }}>
                <Text style={st.pName} numberOfLines={1}>{user?.name ?? '-'}</Text>
                <View style={st.pInfoRow}>
                  <Icon name="mail-outline" size={scale(10.5)} color={C.muted} />
                  <Text style={st.pInfoText} numberOfLines={1}>{user?.email ?? '-'}</Text>
                </View>
                <View style={st.pInfoRow}>
                  <Icon name="call-outline" size={scale(10.5)} color={C.muted} />
                  <Text style={st.pInfoText}>{needsPhone ? 'Not added' : user.phone}</Text>
                </View>
                {selectedRestaurant?.restaurantRole && (
                  <View style={st.pInfoRow}>
                    <Icon name="shield-outline" size={scale(10.5)} color={C.muted} />
                    <Text style={[st.pInfoText, { color: '#6366F1', fontWeight: '600' }]}>
                      {selectedRestaurant.restaurantRole.charAt(0) + selectedRestaurant.restaurantRole.slice(1).toLowerCase()}
                    </Text>
                  </View>
                )}
              </View>
              <TouchableOpacity onPress={navigateEdit} style={st.editBtn}>
                <Icon name="create-outline" size={scale(13)} color={C.primary} />
              </TouchableOpacity>
            </View>

            {/* Add-phone prompt (mainly for Google-signup owners with no mobile number) */}
            {needsPhone && (
              <TouchableOpacity activeOpacity={0.8} onPress={navigateEdit} style={st.phonePrompt}>
                <Icon name="call-outline" size={scale(16)} color={C.primary} />
                <View style={{ flex: 1, marginLeft: scale(10) }}>
                  <Text style={st.phonePromptTitle}>Add your mobile number</Text>
                  <Text style={st.phonePromptSub}>Needed for OTP login, SMS alerts & bookings.</Text>
                </View>
                <Icon name="chevron-forward" size={scale(16)} color={C.primary} />
              </TouchableOpacity>
            )}

            {/* Stats */}
            <View style={st.statsRow}>
              {[
                { num: user?.hotelsCount ?? 0, label: 'Hotels', icon: 'business', grad: ['#FFE8E8', '#FFD0D0'], color: C.primary },
                { num: user?.requests ?? 0, label: 'Requests', icon: 'clipboard', grad: ['#EDE9FE', '#DDD6FE'], color: '#7C3AED' },
                { num: (user?.rating ?? 0).toFixed(1), label: 'Rating', icon: 'star', grad: ['#FEF3C7', '#FDE68A'], color: '#D97706' },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={st.statDivider} />}
                  <View style={st.statCell}>
                    <LinearGradient colors={s.grad} style={st.statIcon}>
                      <Icon name={s.icon} size={scale(11.5)} color={s.color} />
                    </LinearGradient>
                    <Text style={st.statNum}>{s.num}</Text>
                    <Text style={st.statLabel}>{s.label}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </Animated.View>
        </View>

        {/* ===== FSSAI & REFERRAL ===== */}
        <View style={st.card}>
          <View style={st.cardHeader}>
            <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.cardHeaderIcon}>
              <Icon name="document-text" size={scale(17)} color={C.primary} />
            </LinearGradient>
            <Text style={st.cardHeaderTitle}>FSSAI Details</Text>
          </View>
          <View style={st.fssaiRow}>
            <View>
              <Text style={st.fssaiLabel}>License Number</Text>
              <Text style={st.fssaiValue}>{user?.fssaiNo ?? '---'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={viewPDF}>
              <LinearGradient colors={[C.primary, C.primaryDark]} style={st.pdfBtn}>
                <Icon name="document-outline" size={scale(14)} color="#fff" />
                <Text style={st.pdfBtnText}>View PDF</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <View style={st.sep} />
          <View style={st.referralRow}>
            <View style={st.referralChip}>
              <Icon name="gift-outline" size={scale(15)} color={C.primary} />
              <Text style={st.referralCode}>{user?.referral ?? '-'}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.8} onPress={shareReferral}>
              <LinearGradient colors={[C.ink, '#2D3478']} style={st.shareBtn}>
                <Icon name="share-social-outline" size={scale(15)} color="#fff" />
                <Text style={st.shareText}>Share</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* ===== RESTAURANTS ===== */}
        <View style={st.secHeader}>
          <Text style={st.secTitle}>Your Restaurants</Text>
          <TouchableOpacity onPress={() => navigation.navigate('RestaurantOnboarding', { isFirstRestaurant: false })}>
            <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.addBtn}>
              <Icon name="add" size={scale(15)} color={C.primary} />
              <Text style={st.addBtnText}>Add new</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
        <FlatList
          data={hotelsData}
          keyExtractor={i => i.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_W + GAP}
          decelerationRate="fast"
          contentContainerStyle={{ paddingHorizontal: scale(16), marginBottom: scale(6) }}
          ItemSeparatorComponent={() => <View style={{ width: GAP }} />}
          renderItem={({ item: h }) => {
            if (h.type === 'more') {
              return (
                <TouchableOpacity activeOpacity={0.8} onPress={() => navigation.navigate('MyRestaurants')}
                  style={[st.hotelCard, { width: CARD_W, alignItems: 'center', justifyContent: 'center' }]}>
                  <LinearGradient colors={['#FEF2F2', '#FFE4E6']} style={st.moreIcon}>
                    <Icon name="chevron-forward" size={scale(24)} color={C.primary} />
                  </LinearGradient>
                  <Text style={st.moreTxt}>View All</Text>
                  <Text style={st.moreSub}>See all restaurants</Text>
                </TouchableOpacity>
              );
            }
            return (
              <View style={[st.hotelCard, { width: CARD_W }]}>
                {h.photo
                  ? <Image source={{ uri: h.photo }} style={st.hotelImg} />
                  : <View style={[st.hotelImg, { backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' }]}>
                      <Icon name="image-outline" size={scale(32)} color="#CBD5E1" />
                    </View>
                }
                <LinearGradient colors={['transparent', 'rgba(0,0,0,0.6)']} style={StyleSheet.absoluteFillObject} />
                <View style={st.hotelBody}>
                  <View style={st.hotelInfoCard}>
                    <Text style={st.hotelName} numberOfLines={1}>{h.name}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(3) }}>
                      <Icon name="location-outline" size={scale(12)} color={C.muted} />
                      <Text style={st.hotelAddr} numberOfLines={1}>{h.address}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: scale(5) }}>
                      <Stars value={h.rating} size={scale(11)} />
                      <Text style={st.hotelRating}>{h.rating}</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* ===== REVIEWS ===== */}
        {reviews.length > 0 && (
          <>
            <View style={st.secHeader}><Text style={st.secTitle}>What Pros Say</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: scale(16), gap: scale(10), marginBottom: scale(6), paddingTop: scale(2) }}>
              {reviews.map(r => (
                <View key={r.id} style={st.reviewCard}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(10) }}>
                    <LinearGradient colors={['#FFE8E8', '#FFD0D0']} style={st.reviewAvatar}>
                      <Text style={st.reviewAvatarText}>{(r.from[0] || 'A').toUpperCase()}</Text>
                    </LinearGradient>
                    <View style={{ flex: 1 }}>
                      <Text style={st.reviewFrom} numberOfLines={1}>{r.from}</Text>
                      <Stars value={r.stars} size={scale(11)} />
                    </View>
                  </View>
                  <Text style={st.reviewText} numberOfLines={3}>{r.text}</Text>
                </View>
              ))}
            </ScrollView>
          </>
        )}

        {/* ===== SETTINGS (includes the single quick-access shortcut -
            a whole extra section header for one row wasn't worth it) ===== */}
        <View style={st.secHeader}><Text style={st.secTitle}>Settings</Text></View>
        <View style={st.settingsCard}>
          <SettingRow icon="construct" iconColor="#3B82F6" iconBg={['#EFF6FF', '#DBEAFE']}
            title="My Equipment" subtitle="Manage kitchen equipment"
            onPress={() => navigation.navigate('Home', { screen: 'EquipmentTab' })} />
          <SettingRow icon="download" iconColor="#059669" iconBg={['#ECFDF5', '#D1FAE5']}
            title="Download Analytics Report" subtitle="Export your business report as PDF"
            onPress={handleExportPDF}
            right={exporting ? <ActivityIndicator size="small" color="#059669" /> : undefined} />
          <SettingRow icon="people" iconColor="#8B5CF6" iconBg={['#F3E8FF', '#EDE9FE']}
            title="Team Management" subtitle="Invite & manage members"
            onPress={() => navigation.navigate('TeamManagement')} />
          <SettingRow icon="lock-closed" iconColor={C.primary} iconBg={['#FEF2F2', '#FFE4E6']}
            title="Change Password" subtitle="Update account password"
            onPress={() => setPasswordModalVisible(true)} />
          <SettingRow icon="notifications" iconColor="#0EA5E9" iconBg={['#E0F2FE', '#BAE6FD']}
            title="Push Notifications" subtitle="Instant alerts on this device"
            last
            right={
              pushSaving
                ? <ActivityIndicator size="small" color={C.primary} />
                : <Switch value={pushEnabled} onValueChange={togglePush}
                    trackColor={{ false: C.border, true: '#FFD0D0' }} thumbColor={pushEnabled ? C.primary : '#f4f3f4'} />
            } />
        </View>

        {/* ===== ACCOUNT ===== */}
        <View style={st.secHeader}><Text style={st.secTitle}>Account</Text></View>
        <View style={st.settingsCard}>
          <SettingRow icon="log-out-outline" iconColor={C.primary} iconBg={['#FEF2F2', '#FFE4E6']}
            title="Logout" onPress={handleLogout} danger={C.primary} />
          <SettingRow icon="trash-outline" iconColor="#DC2626" iconBg={['#FEE2E2', '#FECACA']}
            title="Delete Account" onPress={() => setDeleteModalVisible(true)} danger="#DC2626" last />
        </View>

        <View style={{ height: scale(20) }} />
      </Animated.ScrollView>

      {/* MODALS */}
      <DeleteAccountModal visible={deleteModalVisible} onClose={() => setDeleteModalVisible(false)} user={user} />
      <PasswordChangeModal visible={passwordModalVisible} onClose={() => setPasswordModalVisible(false)} />

      <NavigationMenu visible={menuVisible} onClose={() => setMenuVisible(false)} navigation={navigation} />
    </SafeAreaView>
  );
}

/* ===== SKELETON ===== */
function SkeletonProfileView({ insetsBottom = 0 }) {
  const pulse = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: false }),
      Animated.timing(pulse, { toValue: 0.4, duration: 800, useNativeDriver: false }),
    ])).start();
  }, [pulse]);

  const B = ({ w, h, r = 10, s }) => (
    <Animated.View style={[{ width: w, height: h, borderRadius: r, backgroundColor: '#E2E8F0', opacity: pulse }, s]} />
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={['left', 'right']}>
      <StatusBar barStyle="light-content" backgroundColor={C.primary} />
      <ScrollView contentContainerStyle={{ paddingBottom: insetsBottom + 120 }} showsVerticalScrollIndicator={false}>
        <Animated.View style={{ height: HERO_H, backgroundColor: '#CBD5E1', opacity: pulse }} />
        <View style={st.stickyContainer}>
          <View style={[st.profileCard, { marginTop: scale(-30) }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <B w={60} h={60} r={20} />
              <View style={{ flex: 1, marginLeft: scale(14) }}>
                <B w={'65%'} h={20} />
                <B w={'85%'} h={13} r={6} s={{ marginTop: scale(8) }} />
                <B w={'55%'} h={13} r={6} s={{ marginTop: scale(5) }} />
              </View>
            </View>
            <View style={[st.statsRow, { marginTop: scale(14) }]}>
              {[0, 1, 2].map(i => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={st.statDivider} />}
                  <View style={st.statCell}>
                    <B w={34} h={34} r={10} />
                    <B w={28} h={16} r={6} s={{ marginTop: scale(6) }} />
                    <B w={40} h={10} r={5} s={{ marginTop: scale(4) }} />
                  </View>
                </React.Fragment>
              ))}
            </View>
          </View>
        </View>
        <View style={[st.card, { marginTop: scale(12) }]}>
          <B w={110} h={18} s={{ marginBottom: scale(14) }} />
          <B w={'100%'} h={42} />
          <View style={[st.sep, { marginVertical: scale(12) }]} />
          <B w={'60%'} h={34} r={17} />
        </View>
        {[1, 2].map(i => (
          <View key={i} style={{ marginHorizontal: scale(16), marginTop: scale(20) }}>
            <B w={130} h={18} s={{ marginBottom: scale(12) }} />
            <View style={{ flexDirection: 'row', gap: scale(12) }}>
              <B w={W * 0.65} h={170} r={18} />
              <B w={W * 0.45} h={170} r={18} />
            </View>
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

/* ========================================
   STYLES
   ======================================== */
const st = StyleSheet.create({
  /* Hero Top Bar (inside hero, scrolls with it) */
  heroTopBar: {
    position: 'absolute', top: 0, left: 0, right: 0, zIndex: 5,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: scale(16),
  },
  heroBrand: {
    flexDirection: 'row', alignItems: 'center', gap: scale(6),
    backgroundColor: 'rgba(0,0,0,0.3)', paddingHorizontal: scale(12), paddingVertical: scale(7), borderRadius: scale(10),
  },
  heroBrandText: { color: '#fff', fontWeight: '800', fontSize: moderateScale(13) },
  heroBtn: {
    width: scale(38), height: scale(38), borderRadius: scale(11),
    backgroundColor: 'rgba(0,0,0,0.3)', alignItems: 'center', justifyContent: 'center',
  },

  /* Hero */
  blobA: { position: 'absolute', width: scale(180), height: scale(180), borderRadius: scale(90), top: scale(-40), left: scale(-40) },
  blobB: { position: 'absolute', width: scale(240), height: scale(240), borderRadius: scale(120), bottom: scale(-80), right: scale(-60) },
  heroBottomFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: scale(120) },
  heroContent: { position: 'absolute', left: scale(20), right: scale(20), bottom: scale(34) },
  heroWelcome: { color: 'rgba(255,255,255,0.8)', fontSize: moderateScale(14), fontWeight: '600', marginBottom: scale(4) },
  heroName: { color: '#fff', fontSize: moderateScale(28), fontWeight: '900', letterSpacing: -0.5, marginBottom: scale(10) },
  heroTagRow: { flexDirection: 'row', gap: scale(8) },
  heroTag: {
    flexDirection: 'row', alignItems: 'center', gap: scale(5),
    paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(8),
  },
  heroTagText: { color: '#fff', fontWeight: '800', fontSize: moderateScale(11) },
  heroTag2: {
    flexDirection: 'row', alignItems: 'center', gap: scale(5),
    backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: scale(10), paddingVertical: scale(5), borderRadius: scale(8),
  },
  heroTag2Text: { color: '#fff', fontWeight: '700', fontSize: moderateScale(11) },

  /* Sticky */
  stickyContainer: {
    backgroundColor: C.bg, paddingTop: 0,
  },
  profileCard: {
    // No marginTop here - the main render overlaps the hero via an animated
    // marginTop (see cardMarginAnim) instead of a static one, so it can
    // animate back to 0 once stickyHeaderIndices docks the card and avoid
    // clipping it. The loading skeleton (which never scrolls/docks) applies
    // its own flat inline marginTop where this style is used.
    backgroundColor: '#fff', borderRadius: scale(14), marginHorizontal: scale(16),
    padding: scale(10),
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(8) }, shadowOpacity: 0.1, shadowRadius: scale(16), elevation: 8,
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  profileTop: { flexDirection: 'row', alignItems: 'center' },
  phonePrompt: {
    flexDirection: 'row', alignItems: 'center', marginTop: scale(10),
    backgroundColor: '#FFF5F5', borderRadius: scale(12), padding: scale(10),
    borderWidth: 1, borderColor: '#FFD9D9',
  },
  phonePromptTitle: { color: C.primaryDark, fontWeight: '800', fontSize: moderateScale(12.5) },
  phonePromptSub: { color: C.muted, fontSize: moderateScale(10.5), marginTop: scale(2) },
  avatar: {
    width: scale(42), height: scale(42), borderRadius: scale(14), alignItems: 'center', justifyContent: 'center',
    shadowColor: C.primary, shadowOpacity: 0.3, shadowRadius: scale(8), elevation: 5,
  },
  avatarText: { color: '#fff', fontSize: moderateScale(18), fontWeight: '900' },
  pName: { color: C.ink, fontWeight: '900', fontSize: moderateScale(15), letterSpacing: -0.3 },
  pInfoRow: { flexDirection: 'row', alignItems: 'center', gap: scale(4), marginTop: scale(1) },
  pInfoText: { color: C.muted, fontSize: moderateScale(10.5), flex: 1 },
  editBtn: {
    width: scale(26), height: scale(26), borderRadius: scale(8), backgroundColor: '#FEF2F2',
    alignItems: 'center', justifyContent: 'center', position: 'absolute', top: 0, right: 0,
  },

  /* Stats */
  statsRow: {
    flexDirection: 'row', alignItems: 'center', marginTop: scale(8), paddingTop: scale(8),
    borderTopWidth: 1, borderTopColor: '#F1F5F9',
  },
  statCell: { flex: 1, alignItems: 'center' },
  statIcon: { width: scale(24), height: scale(24), borderRadius: scale(8), alignItems: 'center', justifyContent: 'center', marginBottom: scale(3) },
  statNum: { color: C.ink, fontWeight: '900', fontSize: moderateScale(13.5) },
  statLabel: { color: C.muted, fontSize: moderateScale(9.5), fontWeight: '600', marginTop: 1 },
  statDivider: { width: 1, height: scale(28), backgroundColor: '#E5E7EB' },

  /* Card */
  card: {
    backgroundColor: '#fff', borderRadius: scale(18), marginHorizontal: scale(16), marginTop: scale(16), padding: scale(16),
    borderWidth: 1, borderColor: '#EEF2F7',
    shadowColor: '#000', shadowOffset: { width: 0, height: scale(2) }, shadowOpacity: 0.04, shadowRadius: scale(8), elevation: 2,
  },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: scale(10), marginBottom: scale(14) },
  cardHeaderIcon: { width: scale(34), height: scale(34), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  cardHeaderTitle: { fontSize: moderateScale(15), fontWeight: '800', color: C.ink },

  /* FSSAI */
  fssaiRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  fssaiLabel: { fontSize: moderateScale(11), fontWeight: '600', color: C.muted, marginBottom: scale(2) },
  fssaiValue: { fontSize: moderateScale(16), fontWeight: '800', color: C.ink, letterSpacing: 0.5 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), paddingVertical: scale(9), borderRadius: scale(10), gap: scale(6) },
  pdfBtnText: { color: '#fff', fontWeight: '800', fontSize: moderateScale(13) },
  sep: { height: 1, backgroundColor: '#F1F5F9', marginVertical: scale(12) },
  referralRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  referralChip: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF1F1',
    borderWidth: 1, borderColor: '#FECACA', paddingHorizontal: scale(12), paddingVertical: scale(8), borderRadius: scale(999), gap: scale(6),
  },
  referralCode: { color: C.primary, fontWeight: '800', fontSize: moderateScale(13) },
  shareBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(14), paddingVertical: scale(9), borderRadius: scale(10), gap: scale(6) },
  shareText: { color: '#fff', fontWeight: '800', fontSize: moderateScale(13) },

  /* Section Header */
  secHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: scale(16), marginTop: scale(22), marginBottom: scale(12) },
  secTitle: { color: C.ink, fontWeight: '900', fontSize: moderateScale(18) },
  addBtn: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: scale(12), paddingVertical: scale(6), borderRadius: scale(999), gap: scale(4) },
  addBtnText: { color: C.primary, fontWeight: '800', fontSize: moderateScale(13) },

  /* Hotel Cards */
  hotelCard: {
    height: scale(190), borderRadius: scale(18), overflow: 'hidden', borderWidth: 1, borderColor: '#EEF2F7', backgroundColor: '#fff',
    shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: scale(10), shadowOffset: { width: 0, height: scale(4) }, elevation: 4,
  },
  hotelImg: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  hotelBody: { position: 'absolute', left: scale(10), right: scale(10), bottom: scale(10) },
  hotelInfoCard: {
    backgroundColor: 'rgba(255,255,255,0.95)', borderRadius: scale(14), padding: scale(12),
    borderWidth: 1, borderColor: '#EEF2F7',
  },
  hotelName: { color: C.text, fontWeight: '900', fontSize: moderateScale(15) },
  hotelAddr: { color: C.muted, fontSize: moderateScale(12), flex: 1 },
  hotelRating: { color: '#D97706', fontSize: moderateScale(12), fontWeight: '700', marginLeft: scale(6) },
  moreIcon: { width: scale(56), height: scale(56), borderRadius: scale(18), alignItems: 'center', justifyContent: 'center', marginBottom: scale(10) },
  moreTxt: { fontWeight: '900', color: C.ink, fontSize: moderateScale(16) },
  moreSub: { color: C.muted, fontSize: moderateScale(12), marginTop: scale(2) },

  /* Reviews */
  reviewCard: {
    width: W * 0.72, backgroundColor: '#fff', borderRadius: scale(16), borderWidth: 1, borderColor: '#EEF2F7',
    padding: scale(14), shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: scale(6), elevation: 2,
  },
  reviewAvatar: { width: scale(36), height: scale(36), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  reviewAvatarText: { color: C.primary, fontWeight: '900', fontSize: moderateScale(14) },
  reviewFrom: { color: C.ink, fontWeight: '800', fontSize: moderateScale(14), marginBottom: scale(2) },
  reviewText: { color: C.text, fontSize: moderateScale(13), lineHeight: moderateScale(19) },

  /* Settings */
  settingsCard: {
    backgroundColor: '#fff', borderRadius: scale(16), marginHorizontal: scale(16), borderWidth: 1, borderColor: '#EEF2F7',
    overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: scale(8), elevation: 2,
  },
  settingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: scale(14), paddingHorizontal: scale(14), borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  settingRowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: scale(12) },
  settingIcon: { width: scale(38), height: scale(38), borderRadius: scale(11), alignItems: 'center', justifyContent: 'center' },
  settingTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink },
  settingSub: { fontSize: moderateScale(12), color: C.muted, marginTop: 1 },
});

/* ===== MODAL BASE STYLES ===== */
const modalBase = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: scale(24), borderTopRightRadius: scale(24), maxHeight: H * 0.85 },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: scale(20), borderBottomWidth: 1, borderBottomColor: '#F1F5F9',
  },
  headerIcon: { width: scale(36), height: scale(36), borderRadius: scale(10), alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: moderateScale(18), fontWeight: '800', color: C.ink },
  closeBtn: { width: scale(36), height: scale(36), borderRadius: scale(10), backgroundColor: '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  footer: { padding: scale(20), borderTopWidth: 1, borderTopColor: '#F1F5F9' },
  cancelBtn: { backgroundColor: '#F3F4F6', borderRadius: scale(14), padding: scale(16), alignItems: 'center' },
  cancelBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: C.ink },
});

/* Delete modal specific */
const delS = StyleSheet.create({
  warningBox: { flexDirection: 'row', borderRadius: scale(14), padding: scale(16), marginBottom: scale(20), alignItems: 'flex-start', gap: scale(12) },
  warningText: { color: '#DC2626', flex: 1, fontWeight: '600', lineHeight: moderateScale(20) },
  optionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: scale(14), padding: scale(16), marginBottom: scale(12), gap: scale(12) },
  optionIcon: { width: scale(44), height: scale(44), borderRadius: scale(12), alignItems: 'center', justifyContent: 'center' },
  optionTitle: { fontSize: moderateScale(15), fontWeight: '700', color: C.ink, marginBottom: scale(2) },
  optionSub: { fontSize: moderateScale(12), color: C.primary, fontWeight: '600' },
  infoCard: { backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0', borderRadius: scale(14), padding: scale(16), marginTop: scale(4) },
});

/* Password modal specific */
const pwS = StyleSheet.create({
  label: { fontSize: moderateScale(13), fontWeight: '700', color: C.muted, marginBottom: scale(8) },
  inputWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: scale(12), borderWidth: 1, borderColor: '#E5E7EB' },
  input: { flex: 1, paddingHorizontal: scale(14), paddingVertical: scale(14), fontSize: moderateScale(14), color: C.text },
  tipBox: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: '#EFF6FF', padding: scale(14), borderRadius: scale(12), marginTop: scale(8), gap: scale(10) },
  tipText: { flex: 1, fontSize: moderateScale(12), color: '#3B82F6', lineHeight: moderateScale(18) },
  saveBtn: { flex: 1, backgroundColor: C.primary, borderRadius: scale(14), padding: scale(16), alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { fontSize: moderateScale(14), fontWeight: '700', color: '#fff' },
});

