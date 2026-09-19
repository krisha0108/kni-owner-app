import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
import AppAlert from '../utils/AppAlert';

import { scale, moderateScale } from '../utils/responsive';
const C = {
  primary: '#EF3A3A',
  ink: '#1A1A1A',
  text: '#333',
  muted: '#666',
  bg: '#F8F9FA',
  card: '#FFFFFF',
  border: '#E0E0E0',
  ok: '#10B981',
  danger: '#EF4444',
};

export default function ForgotPasswordScreen({ navigation }) {
  const [step, setStep] = useState('email'); // email | code | password
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const inputRefs = useRef([]);

  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(c => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  // Step 1: Send reset code
  const handleSendCode = async () => {
    if (!email || !email.includes('@')) {
      return AppAlert.alert('Invalid Email', 'Please enter a valid email address.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });

      if (response.data?.ok) {
        AppAlert.alert('Code Sent', 'If an account exists with this email, a reset code has been sent.');
        setStep('code');
        setCooldown(60);
        setTimeout(() => inputRefs.current[0]?.focus(), 300);
      } else {
        AppAlert.alert('Error', response.data?.error || 'Failed to send code.');
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  // Code input handlers
  const handleCodeChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (index, key) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  // Step 2: Verify code → move to password step
  const handleVerifyCode = () => {
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      return AppAlert.alert('Invalid Code', 'Please enter the complete 6-digit code.');
    }
    setStep('password');
  };

  // Resend code
  const handleResend = async () => {
    if (cooldown > 0) return;
    setLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      if (response.data?.ok) {
        AppAlert.alert('Code Resent', 'A new reset code has been sent.');
        setCooldown(60);
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        AppAlert.alert('Error', response.data?.error || 'Failed to resend.');
      }
    } catch (error) {
      AppAlert.alert('Error', 'Failed to resend code.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (newPassword.length < 8) {
      return AppAlert.alert('Weak Password', 'Password must be at least 8 characters.');
    }
    if (newPassword !== confirmPassword) {
      return AppAlert.alert('Mismatch', 'Passwords do not match.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        code: code.join(''),
        newPassword,
      });

      if (response.data?.ok) {
        AppAlert.alert('Password Reset', 'Your password has been reset successfully.', [
          { text: 'Login', onPress: () => navigation.replace('RestaurantLogin') },
        ]);
      } else {
        const errorMsg = response.data?.error || 'Failed to reset password.';
        AppAlert.alert('Error', errorMsg);
        // If code is invalid, go back to code step
        if (errorMsg.toLowerCase().includes('code')) {
          setStep('code');
          setCode(['', '', '', '', '', '']);
        }
      }
    } catch (error) {
      AppAlert.alert('Error', error.response?.data?.error || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const getStepIcon = () => {
    if (step === 'email') return 'mail-outline';
    if (step === 'code') return 'shield-checkmark-outline';
    return 'key-outline';
  };

  const getStepTitle = () => {
    if (step === 'email') return 'Forgot Password';
    if (step === 'code') return 'Enter Reset Code';
    return 'Set New Password';
  };

  const getStepSubtitle = () => {
    if (step === 'email') return "Enter your email address and we'll send you a reset code.";
    if (step === 'code') return `Enter the 6-digit code sent to ${email}`;
    return 'Create a strong new password for your account.';
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <StatusBar barStyle="dark-content" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Step indicators */}
        <View style={styles.stepContainer}>
          {['email', 'code', 'password'].map((s, i) => (
            <React.Fragment key={s}>
              <View
                style={[
                  styles.stepDot,
                  step === s && styles.stepDotActive,
                  ['email', 'code', 'password'].indexOf(step) > i && styles.stepDotDone,
                ]}
              >
                <Text
                  style={[
                    styles.stepNumber,
                    (step === s || ['email', 'code', 'password'].indexOf(step) > i) && styles.stepNumberActive,
                  ]}
                >
                  {i + 1}
                </Text>
              </View>
              {i < 2 && (
                <View
                  style={[
                    styles.stepLine,
                    ['email', 'code', 'password'].indexOf(step) > i && styles.stepLineDone,
                  ]}
                />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* Header */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name={getStepIcon()} size={scale(36)} color={C.primary} />
          </View>
        </View>

        <Text style={styles.title}>{getStepTitle()}</Text>
        <Text style={styles.subtitle}>{getStepSubtitle()}</Text>

        {/* Step 1: Email */}
        {step === 'email' && (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Icon name="mail-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Email Address"
                placeholderTextColor="#999"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSendCode}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Send Reset Code</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Code */}
        {step === 'code' && (
          <View style={styles.formContainer}>
            <View style={styles.codeContainer}>
              {code.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={ref => (inputRefs.current[index] = ref)}
                  style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                  value={digit}
                  onChangeText={value => handleCodeChange(index, value)}
                  onKeyPress={({ nativeEvent }) => handleCodeKeyPress(index, nativeEvent.key)}
                  keyboardType="number-pad"
                  maxLength={1}
                  textAlign="center"
                  selectTextOnFocus
                />
              ))}
            </View>
            <TouchableOpacity
              style={[styles.primaryButton, code.join('').length !== 6 && styles.buttonDisabled]}
              onPress={handleVerifyCode}
              disabled={code.join('').length !== 6}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>

            <View style={styles.resendContainer}>
              <Text style={styles.resendLabel}>Didn't receive the code? </Text>
              <TouchableOpacity onPress={handleResend} disabled={cooldown > 0 || loading}>
                <Text style={[styles.resendLink, cooldown > 0 && styles.resendDisabled]}>
                  {cooldown > 0 ? `Resend in ${cooldown}s` : loading ? 'Sending...' : 'Resend Code'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: New Password */}
        {step === 'password' && (
          <View style={styles.formContainer}>
            <View style={styles.inputContainer}>
              <Icon name="lock-closed-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="New Password"
                placeholderTextColor="#999"
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={secureNew}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setSecureNew(!secureNew)} style={styles.eyeIcon}>
                <Icon name={secureNew ? 'eye-off-outline' : 'eye-outline'} size={scale(20)} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.inputContainer}>
              <Icon name="lock-closed-outline" size={scale(20)} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Confirm Password"
                placeholderTextColor="#999"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirm}
                autoCapitalize="none"
              />
              <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)} style={styles.eyeIcon}>
                <Icon name={secureConfirm ? 'eye-off-outline' : 'eye-outline'} size={scale(20)} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Password match indicator */}
            {newPassword && confirmPassword && (
              <View style={[styles.matchBox, newPassword === confirmPassword ? styles.matchBoxOk : styles.matchBoxBad]}>
                <Icon
                  name={newPassword === confirmPassword ? 'checkmark-circle' : 'close-circle'}
                  size={scale(14)}
                  color={newPassword === confirmPassword ? C.ok : C.danger}
                />
                <Text style={[styles.matchText, { color: newPassword === confirmPassword ? C.ok : C.danger }]}>
                  {newPassword === confirmPassword ? 'Passwords match' : 'Passwords do not match'}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={[styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.primaryButtonText}>Reset Password</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Back to Login */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.navigate('RestaurantLogin')}
        >
          <Icon name="arrow-back" size={scale(16)} color={C.muted} />
          <Text style={styles.backText}>Back to Login</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: C.bg,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: scale(24),
    paddingVertical: scale(50),
    alignItems: 'center',
  },
  stepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: scale(32),
  },
  stepDot: {
    width: scale(32),
    height: scale(32),
    borderRadius: scale(16),
    backgroundColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: C.primary,
  },
  stepDotDone: {
    backgroundColor: `${C.primary}40`,
  },
  stepNumber: {
    fontSize: moderateScale(14),
    fontWeight: '600',
    color: C.muted,
  },
  stepNumberActive: {
    color: '#FFF',
  },
  stepLine: {
    width: scale(40),
    height: scale(2),
    backgroundColor: '#E5E7EB',
  },
  stepLineDone: {
    backgroundColor: C.primary,
  },
  iconContainer: {
    marginBottom: scale(20),
  },
  iconCircle: {
    width: scale(72),
    height: scale(72),
    borderRadius: scale(36),
    backgroundColor: `${C.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: moderateScale(26),
    fontWeight: 'bold',
    color: C.ink,
    marginBottom: scale(10),
    textAlign: 'center',
  },
  subtitle: {
    fontSize: moderateScale(14),
    color: C.muted,
    textAlign: 'center',
    lineHeight: moderateScale(20),
    marginBottom: scale(28),
    paddingHorizontal: scale(10),
  },
  formContainer: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: scale(12),
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: scale(16),
    marginBottom: scale(16),
    height: scale(56),
  },
  inputIcon: {
    marginRight: scale(12),
  },
  input: {
    flex: 1,
    fontSize: moderateScale(16),
    color: C.ink,
  },
  eyeIcon: {
    padding: scale(8),
  },
  codeContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: scale(10),
    marginBottom: scale(24),
  },
  codeInput: {
    width: scale(48),
    height: scale(56),
    borderRadius: scale(12),
    borderWidth: 2,
    borderColor: C.border,
    backgroundColor: C.card,
    fontSize: moderateScale(24),
    fontWeight: 'bold',
    color: C.ink,
  },
  codeInputFilled: {
    borderColor: C.primary,
    backgroundColor: `${C.primary}08`,
  },
  primaryButton: {
    backgroundColor: C.primary,
    borderRadius: scale(12),
    height: scale(56),
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: scale(8),
    shadowColor: C.primary,
    shadowOffset: { width: 0, height: scale(4) },
    shadowOpacity: 0.3,
    shadowRadius: scale(8),
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: moderateScale(16),
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: scale(20),
  },
  resendLabel: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
  resendLink: {
    fontSize: moderateScale(14),
    color: C.primary,
    fontWeight: '600',
  },
  resendDisabled: {
    color: C.muted,
    fontWeight: '400',
  },
  matchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: scale(8),
    padding: scale(10),
    marginBottom: scale(12),
    gap: scale(6),
  },
  matchBoxOk: {
    backgroundColor: '#ECFDF5',
  },
  matchBoxBad: {
    backgroundColor: '#FEF2F2',
  },
  matchText: {
    fontSize: moderateScale(12),
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: scale(32),
    gap: scale(6),
  },
  backText: {
    fontSize: moderateScale(14),
    color: C.muted,
  },
});
