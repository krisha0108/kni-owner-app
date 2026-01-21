import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';

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

export default function TeamAcceptScreen({ navigation, route }) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteDetails, setInviteDetails] = useState(null);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const token = route.params?.token;

  useEffect(() => {
    if (!token) {
      setError('Invalid invitation link');
      setIsValidating(false);
      return;
    }

    validateToken();
  }, [token]);

  const validateToken = async () => {
    try {
      setIsValidating(true);
      // For now, we'll skip pre-validation and just show password form
      // The API will validate the token when accepting
      setInviteDetails({
        restaurantName: 'Loading...',
        userEmail: 'Loading...',
        needsPassword: true,
      });
      setIsValidating(false);
    } catch (err) {
      setError('Failed to validate invitation');
      setIsValidating(false);
    }
  };

  const handleSubmit = async () => {
    if (!token) {
      Alert.alert('Error', 'Invalid invitation token');
      return;
    }

    if (inviteDetails?.needsPassword) {
      if (password.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters');
        return;
      }

      if (password !== confirmPassword) {
        Alert.alert('Error', 'Passwords do not match');
        return;
      }
    }

    setIsLoading(true);

    try {
      const response = await api.post('/owner/team/accept-invite', {
        token,
        password: inviteDetails?.needsPassword ? password : undefined,
      });

      if (!response.data.ok) {
        Alert.alert('Error', response.data.error || 'Failed to accept invitation');
        return;
      }

      Alert.alert(
        'Success',
        `You've joined ${response.data.data.restaurant.name}! Please login to continue.`,
        [
          {
            text: 'OK',
            onPress: () => navigation.replace('Login'),
          },
        ]
      );
    } catch (err) {
      Alert.alert('Error', 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <View style={styles.errorIconContainer}>
            <Icon name="close-circle" size={64} color={C.danger} />
          </View>
          <Text style={styles.errorTitle}>Invalid Invitation</Text>
          <Text style={styles.errorDesc}>
            {error || 'This invitation link is invalid or has expired'}
          </Text>
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={() => navigation.replace('Login')}
          >
            <Text style={styles.primaryBtnText}>Back to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (isValidating) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={C.primary} />
          <Text style={styles.loadingTitle}>Validating Invitation</Text>
          <Text style={styles.loadingDesc}>Please wait while we validate your invitation...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <View style={styles.iconContainer}>
              <Icon name="business" size={40} color={C.primary} />
            </View>
            <Text style={styles.title}>Join Restaurant Team</Text>
            <Text style={styles.subtitle}>
              You've been invited to join a restaurant team. Set your password to accept the invitation.
            </Text>
          </View>

          <View style={styles.form}>
            {inviteDetails?.needsPassword && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Create Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter a strong password"
                      placeholderTextColor={C.muted}
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Icon
                        name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={C.muted}
                      />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.hint}>Minimum 8 characters</Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Password *</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Re-enter your password"
                      placeholderTextColor={C.muted}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={!showConfirmPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      style={styles.eyeBtn}
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      <Icon
                        name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                        size={20}
                        color={C.muted}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}

            <TouchableOpacity
              style={[styles.primaryBtn, isLoading && styles.disabledBtn]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Icon name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.primaryBtnText}>Accept Invitation</Text>
                </>
              )}
            </TouchableOpacity>

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => navigation.replace('Login')}>
                <Text style={styles.footerLink}>Sign in</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  keyboardView: { flex: 1 },
  scrollContent: { flexGrow: 1, padding: 24 },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },

  errorIconContainer: { marginBottom: 16 },
  errorTitle: { fontSize: 22, fontWeight: '700', color: C.ink, marginBottom: 8, textAlign: 'center' },
  errorDesc: { fontSize: 14, color: C.muted, textAlign: 'center', marginBottom: 24, lineHeight: 20 },

  loadingTitle: { fontSize: 20, fontWeight: '700', color: C.ink, marginTop: 16, textAlign: 'center' },
  loadingDesc: { fontSize: 14, color: C.muted, textAlign: 'center', marginTop: 8 },

  header: { alignItems: 'center', marginBottom: 32, marginTop: 40 },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { fontSize: 24, fontWeight: '700', color: C.ink, marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 14, color: C.muted, textAlign: 'center', lineHeight: 20, paddingHorizontal: 20 },

  form: { backgroundColor: C.card, borderRadius: 16, padding: 20 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: '600', color: C.ink, marginBottom: 8 },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.bg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
  },
  passwordInput: {
    flex: 1,
    height: 48,
    paddingHorizontal: 14,
    fontSize: 15,
    color: C.text,
  },
  eyeBtn: { padding: 12 },
  hint: { fontSize: 12, color: C.muted, marginTop: 4 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    height: 50,
    marginTop: 8,
  },
  disabledBtn: { opacity: 0.7 },
  primaryBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: C.muted },
  footerLink: { fontSize: 14, fontWeight: '600', color: C.primary },
});
