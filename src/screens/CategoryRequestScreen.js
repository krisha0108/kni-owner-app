import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/Ionicons';
import { api } from '../api/client';
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
};

export default function CategoryRequestScreen({ navigation }) {
  const [categoryName, setCategoryName] = useState('');
  const [description, setDescription] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

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
        Alert.alert(
          'Request Submitted',
          'Your category request has been sent to admin for review. You will be notified once it is approved.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
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

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Icon name="arrow-back" size={24} color={C.ink} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Request New Category</Text>
        <TouchableOpacity onPress={() => setMenuVisible(true)} style={{ padding: 8 }}>
          <Icon name="menu" size={22} color="#1D2254" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Info Box */}
          <View style={styles.infoBox}>
            <Icon name="bulb-outline" size={24} color={C.primary} />
            <Text style={styles.infoText}>
              Can't find the category you need? Request a new one and our admin team will review
              it.
            </Text>
          </View>

          {/* Category Name */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>
              Category Name <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={styles.input}
              placeholder="e.g., Seafood, Vegan, Italian"
              value={categoryName}
              onChangeText={setCategoryName}
              placeholderTextColor={C.muted}
              maxLength={50}
            />
            <Text style={styles.hint}>{categoryName.length}/50 characters</Text>
          </View>

          {/* Description */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Describe what this category represents..."
              value={description}
              onChangeText={setDescription}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={200}
            />
            <Text style={styles.hint}>{description.length}/200 characters</Text>
          </View>

          {/* Reason for Request */}
          <View style={styles.formGroup}>
            <Text style={styles.label}>Reason for Request</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Why do you need this category? How will it help your business?"
              value={reason}
              onChangeText={setReason}
              placeholderTextColor={C.muted}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              maxLength={300}
            />
            <Text style={styles.hint}>{reason.length}/300 characters</Text>
          </View>

          {/* Guidelines */}
          <View style={styles.guidelinesBox}>
            <Text style={styles.guidelinesTitle}>Guidelines</Text>
            <View style={styles.guidelineItem}>
              <Icon name="checkmark-circle" size={16} color={C.ok} />
              <Text style={styles.guidelineText}>Be specific and clear about the category</Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="checkmark-circle" size={16} color={C.ok} />
              <Text style={styles.guidelineText}>
                Provide a valid reason for why this category is needed
              </Text>
            </View>
            <View style={styles.guidelineItem}>
              <Icon name="checkmark-circle" size={16} color={C.ok} />
              <Text style={styles.guidelineText}>Check if similar category already exists</Text>
            </View>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
            onPress={handleSubmit}
            disabled={submitting || !categoryName.trim()}
          >
            {submitting ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Icon name="send-outline" size={20} color="#FFF" />
                <Text style={styles.submitButtonText}>Submit Request</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
    borderRadius: 12,
    backgroundColor: C.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: C.ink,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#FEF2F2',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: C.text,
    lineHeight: 18,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: C.text,
    marginBottom: 8,
  },
  required: {
    color: C.primary,
  },
  input: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    color: C.text,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 12,
  },
  hint: {
    fontSize: 12,
    color: C.muted,
    marginTop: 4,
    textAlign: 'right',
  },
  guidelinesBox: {
    backgroundColor: C.card,
    borderWidth: 1,
    borderColor: C.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  guidelinesTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: C.text,
    marginBottom: 12,
  },
  guidelineItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  guidelineText: {
    flex: 1,
    fontSize: 13,
    color: C.muted,
    lineHeight: 18,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: C.primary,
    borderRadius: 12,
    paddingVertical: 16,
    marginBottom: 32,
  },
  submitButtonDisabled: {
    opacity: 0.5,
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
