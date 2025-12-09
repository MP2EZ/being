/**
 * CRISIS PLAN SCREEN
 * Personal safety planning interface using Stanley-Brown model
 *
 * SAFETY PLANNING MODEL:
 * 7-step evidence-based intervention for suicide prevention
 * https://suicidepreventionlifeline.org/
 *
 * FEATURES:
 * - User consent required before creation
 * - Multi-step wizard (simplified initial version)
 * - Auto-save functionality
 * - Export capability
 * - Secure encrypted storage
 * - User-controlled data
 *
 * COMPLIANCE:
 * - HIPAA: PHI stored locally with encryption
 * - User consent management
 * - Data deletion capability
 * - No cloud sync without consent
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Share
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme/colors';
import { logPerformance, logSecurity, logError, LogCategory } from '@/core/services/logging';
import { useCrisisPlanStore } from '@/features/crisis/stores/crisisPlanStore';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';

type CrisisPlanScreenNavigationProp = StackNavigationProp<RootStackParamList>;

type Step = 'consent' | 'warning_signs' | 'coping' | 'contacts' | 'reasons' | 'review';

/**
 * Crisis Plan Screen
 * Simplified multi-step wizard for creating personalized safety plan
 */
export default function CrisisPlanScreen() {
  const navigation = useNavigation<CrisisPlanScreenNavigationProp>();
  const {
    crisisPlan,
    isLoading,
    loadCrisisPlan,
    createCrisisPlan,
    addWarningSign,
    addCopingStrategy,
    addPersonalContact,
    addReasonForLiving,
    exportCrisisPlan,
    deleteCrisisPlan
  } = useCrisisPlanStore();

  const [currentStep, setCurrentStep] = useState<Step>('consent');
  const [inputValue, setInputValue] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRelation, setContactRelation] = useState('');

  // Input validation constants
  const MAX_INPUT_LENGTH = 500;
  const MAX_ITEMS_PER_CATEGORY = 20;

  /**
   * Validate and sanitize text input
   * @param input - Raw text input
   * @returns Sanitized input or null if invalid
   */
  const validateAndSanitizeInput = (input: string): string | null => {
    const trimmed = input.trim();

    // Check if empty
    if (!trimmed) {
      return null;
    }

    // Check length
    if (trimmed.length > MAX_INPUT_LENGTH) {
      Alert.alert(
        'Input Too Long',
        `Please keep your input under ${MAX_INPUT_LENGTH} characters.`
      );
      return null;
    }

    // Sanitize HTML/special characters
    const sanitized = trimmed
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;');

    return sanitized;
  };

  /**
   * Check if category has reached item limit
   */
  const checkItemLimit = (category: string, currentCount: number): boolean => {
    if (currentCount >= MAX_ITEMS_PER_CATEGORY) {
      Alert.alert(
        'Limit Reached',
        `You've reached the maximum of ${MAX_ITEMS_PER_CATEGORY} items for ${category}.`
      );
      return false;
    }
    return true;
  };

  /**
   * Validate phone number format
   * @param phone - Phone number to validate
   * @returns True if valid or empty, false if invalid
   */
  const validatePhoneNumber = (phone: string): boolean => {
    const trimmed = phone.trim();

    // Empty is valid (optional field)
    if (!trimmed) {
      return true;
    }

    // Basic phone validation: digits, spaces, dashes, parentheses, plus
    // Supports: +1-234-567-8900, (234) 567-8900, 234-567-8900, etc.
    const phoneRegex = /^[\d\s\-\(\)\+]+$/;

    if (!phoneRegex.test(trimmed)) {
      Alert.alert(
        'Invalid Phone Number',
        'Phone number can only contain digits, spaces, dashes, parentheses, and plus sign.'
      );
      return false;
    }

    // Check if it has at least 10 digits (US minimum)
    const digitCount = trimmed.replace(/\D/g, '').length;
    if (digitCount > 0 && digitCount < 10) {
      Alert.alert(
        'Invalid Phone Number',
        'Phone number must have at least 10 digits.'
      );
      return false;
    }

    return true;
  };

  useEffect(() => {
    loadCrisisPlan();
  }, []);

  useEffect(() => {
    if (crisisPlan && currentStep === 'consent') {
      // Skip consent if plan already exists
      setCurrentStep('warning_signs');
    }
  }, [crisisPlan]);

  /**
   * Handle consent and create plan
   */
  const handleConsent = async (consent: boolean) => {
    if (!consent) {
      Alert.alert(
        'Consent Required',
        'Creating a safety plan requires your consent to store your personal information securely on your device.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      await createCrisisPlan(true);
      setCurrentStep('warning_signs');
      logSecurity('Crisis plan created with user consent', 'low', {});
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to create crisis plan', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to create safety plan. Please try again.');
    }
  };

  /**
   * Handle adding item to current step
   */
  const handleAddItem = async () => {
    // Validate and sanitize input
    const sanitizedInput = validateAndSanitizeInput(inputValue);
    if (!sanitizedInput) return;

    try {
      switch (currentStep) {
        case 'warning_signs':
          if (!checkItemLimit('warning signs', crisisPlan?.warningSignsPersonal.length || 0)) {
            return;
          }
          await addWarningSign(sanitizedInput, 'personal');
          break;
        case 'coping':
          if (!checkItemLimit('coping strategies', crisisPlan?.copingStrategies.length || 0)) {
            return;
          }
          await addCopingStrategy(sanitizedInput);
          break;
        case 'reasons':
          if (!checkItemLimit('reasons for living', crisisPlan?.reasonsForLiving.length || 0)) {
            return;
          }
          await addReasonForLiving(sanitizedInput);
          break;
      }

      setInputValue('');
      console.log('Safety plan item added', { step: currentStep }, LogCategory.CRISIS);
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to add item to safety plan', error instanceof Error ? error : new Error(String(error)));
    }
  };

  /**
   * Handle adding contact
   */
  const handleAddContact = async () => {
    // Validate and sanitize contact name
    const sanitizedName = validateAndSanitizeInput(contactName);
    if (!sanitizedName) {
      Alert.alert('Name Required', 'Please enter a contact name.');
      return;
    }

    // Check contact limit
    if (!checkItemLimit('contacts', crisisPlan?.personalContacts.length || 0)) {
      return;
    }

    // Validate phone number
    if (!validatePhoneNumber(contactPhone)) {
      return;
    }

    // Sanitize optional fields
    const sanitizedRelation = contactRelation.trim()
      ? validateAndSanitizeInput(contactRelation) || 'Friend'
      : 'Friend';

    try {
      await addPersonalContact({
        name: sanitizedName,
        relationship: sanitizedRelation,
        phone: contactPhone.trim(),
        notes: ''
      });

      setContactName('');
      setContactPhone('');
      setContactRelation('');
      console.log('Contact added to safety plan', {}, LogCategory.CRISIS);
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to add contact', error instanceof Error ? error : new Error(String(error)));
    }
  };

  /**
   * Handle export
   */
  const handleExport = async () => {
    try {
      const planText = await exportCrisisPlan('text');

      await Share.share({
        message: planText,
        title: 'My Personal Safety Plan'
      });

      logSecurity('Safety plan exported', 'low', {});
    } catch (error) {
      logError(LogCategory.CRISIS, 'Failed to export safety plan', error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Error', 'Failed to export safety plan.');
    }
  };

  /**
   * Handle delete
   */
  const handleDelete = () => {
    Alert.alert(
      'Delete Safety Plan?',
      'This will permanently delete your personalized safety plan. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCrisisPlan();
              navigation.goBack();
              logSecurity('Safety plan deleted by user', 'low', {});
            } catch (error) {
              logError(LogCategory.CRISIS, 'Failed to delete safety plan', error instanceof Error ? error : new Error(String(error)));
            }
          }
        }
      ]
    );
  };

  /**
   * Navigate to next step
   */
  const goToNextStep = () => {
    const steps: Step[] = ['consent', 'warning_signs', 'coping', 'contacts', 'reasons', 'review'];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]!);
    }
  };

  /**
   * Navigate to previous step
   */
  const goToPreviousStep = () => {
    const steps: Step[] = ['consent', 'warning_signs', 'coping', 'contacts', 'reasons', 'review'];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]!);
    }
  };

  /**
   * Render consent step
   */
  const renderConsentStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Create Your Personal Safety Plan</Text>

      <Text style={styles.stepDescription}>
        A safety plan is a personalized tool to help you navigate difficult moments. It's based on an evidence-based model used by mental health professionals.
      </Text>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>📋 What's Included:</Text>
        <Text style={styles.infoText}>• Warning signs to watch for</Text>
        <Text style={styles.infoText}>• Coping strategies that work for you</Text>
        <Text style={styles.infoText}>• Supportive contacts to reach out to</Text>
        <Text style={styles.infoText}>• Reasons that matter to you</Text>
        <Text style={styles.infoText}>• Emergency resources</Text>
      </View>

      <View style={styles.infoBox}>
        <Text style={styles.infoTitle}>🔒 Your Privacy:</Text>
        <Text style={styles.infoText}>
          Your safety plan is stored securely and encrypted on your device only. It's never shared unless you choose to export it.
        </Text>
      </View>

      <View style={styles.actionButtons}>
        <Pressable
          style={styles.primaryButton}
          onPress={() => handleConsent(true)}
          accessibilityRole="button"
          accessibilityLabel="I agree, create my safety plan"
        >
          <Text style={styles.primaryButtonText}>I Agree - Create Plan</Text>
        </Pressable>

        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
          accessibilityLabel="Cancel"
        >
          <Text style={styles.secondaryButtonText}>Not Now</Text>
        </Pressable>
      </View>
    </View>
  );

  /**
   * Render warning signs step
   */
  const renderWarningSignsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Warning Signs</Text>

      <Text style={styles.stepDescription}>
        What thoughts, feelings, or situations let you know you might need extra support?
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="e.g., I feel overwhelmed, I'm withdrawing from others..."
          placeholderTextColor={colorSystem.gray[400]}
          multiline
          numberOfLines={3}
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
        />

        <Pressable
          style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!inputValue.trim()}
          accessibilityRole="button"
          accessibilityLabel="Add warning sign"
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {crisisPlan && crisisPlan.warningSignsPersonal.length > 0 && (
        <View style={styles.itemsList}>
          <Text style={styles.itemsListTitle}>Your Warning Signs:</Text>
          {crisisPlan.warningSignsPersonal.map((sign, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemText}>• {sign}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navigationButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={() => navigation.goBack()}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>Cancel</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={goToNextStep}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );

  /**
   * Render coping strategies step
   */
  const renderCopingStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Coping Strategies</Text>

      <Text style={styles.stepDescription}>
        What activities or strategies help you feel better or distract you from difficult thoughts?
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="e.g., Take a walk, Listen to music, Deep breathing..."
          placeholderTextColor={colorSystem.gray[400]}
          multiline
          numberOfLines={2}
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
        />

        <Pressable
          style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!inputValue.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {crisisPlan && crisisPlan.copingStrategies.length > 0 && (
        <View style={styles.itemsList}>
          <Text style={styles.itemsListTitle}>Your Strategies:</Text>
          {crisisPlan.copingStrategies.map((strategy, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemText}>• {strategy.strategy}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navigationButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={goToPreviousStep}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={goToNextStep}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );

  /**
   * Render contacts step
   */
  const renderContactsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Supportive Contacts</Text>

      <Text style={styles.stepDescription}>
        Who can you reach out to when you need support?
      </Text>

      <View style={styles.contactForm}>
        <TextInput
          style={styles.textInput}
          value={contactName}
          onChangeText={setContactName}
          placeholder="Name"
          placeholderTextColor={colorSystem.gray[400]}
          returnKeyType="next"
        />

        <TextInput
          style={styles.textInput}
          value={contactRelation}
          onChangeText={setContactRelation}
          placeholder="Relationship (e.g., Friend, Family)"
          placeholderTextColor={colorSystem.gray[400]}
          returnKeyType="next"
        />

        <TextInput
          style={styles.textInput}
          value={contactPhone}
          onChangeText={setContactPhone}
          placeholder="Phone (optional)"
          placeholderTextColor={colorSystem.gray[400]}
          keyboardType="phone-pad"
          returnKeyType="done"
        />

        <Pressable
          style={[styles.addButton, !contactName.trim() && styles.addButtonDisabled]}
          onPress={handleAddContact}
          disabled={!contactName.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Add Contact</Text>
        </Pressable>
      </View>

      {crisisPlan && crisisPlan.personalContacts.length > 0 && (
        <View style={styles.itemsList}>
          <Text style={styles.itemsListTitle}>Your Contacts:</Text>
          {crisisPlan.personalContacts.map((contact) => (
            <View key={contact.id} style={styles.itemCard}>
              <Text style={styles.itemText}>
                {contact.name} ({contact.relationship})
                {contact.phone && `\n${contact.phone}`}
              </Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navigationButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={goToPreviousStep}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={goToNextStep}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Next →</Text>
        </Pressable>
      </View>
    </View>
  );

  /**
   * Render reasons for living step
   */
  const renderReasonsStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Reasons for Living</Text>

      <Text style={styles.stepDescription}>
        What are the things that matter to you? What gives your life meaning?
      </Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="e.g., My family, My pets, My goals, Helping others..."
          placeholderTextColor={colorSystem.gray[400]}
          multiline
          numberOfLines={2}
          returnKeyType="done"
          onSubmitEditing={handleAddItem}
        />

        <Pressable
          style={[styles.addButton, !inputValue.trim() && styles.addButtonDisabled]}
          onPress={handleAddItem}
          disabled={!inputValue.trim()}
          accessibilityRole="button"
        >
          <Text style={styles.addButtonText}>+ Add</Text>
        </Pressable>
      </View>

      {crisisPlan && crisisPlan.reasonsForLiving.length > 0 && (
        <View style={styles.itemsList}>
          <Text style={styles.itemsListTitle}>Your Reasons:</Text>
          {crisisPlan.reasonsForLiving.map((reason, index) => (
            <View key={index} style={styles.itemCard}>
              <Text style={styles.itemText}>• {reason}</Text>
            </View>
          ))}
        </View>
      )}

      <View style={styles.navigationButtons}>
        <Pressable
          style={styles.secondaryButton}
          onPress={goToPreviousStep}
          accessibilityRole="button"
        >
          <Text style={styles.secondaryButtonText}>← Back</Text>
        </Pressable>

        <Pressable
          style={styles.primaryButton}
          onPress={goToNextStep}
          accessibilityRole="button"
        >
          <Text style={styles.primaryButtonText}>Review →</Text>
        </Pressable>
      </View>
    </View>
  );

  /**
   * Render review step
   */
  const renderReviewStep = () => (
    <View style={styles.stepContainer}>
      <Text style={styles.stepTitle}>Your Safety Plan</Text>

      <Text style={styles.stepDescription}>
        Review your personalized safety plan. You can edit it anytime.
      </Text>

      {crisisPlan && (
        <ScrollView style={styles.reviewContainer}>
          {crisisPlan.warningSignsPersonal.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Warning Signs</Text>
              {crisisPlan.warningSignsPersonal.map((sign, i) => (
                <Text key={i} style={styles.reviewItem}>• {sign}</Text>
              ))}
            </View>
          )}

          {crisisPlan.copingStrategies.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Coping Strategies</Text>
              {crisisPlan.copingStrategies.map((strategy, i) => (
                <Text key={i} style={styles.reviewItem}>• {strategy.strategy}</Text>
              ))}
            </View>
          )}

          {crisisPlan.personalContacts.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Supportive Contacts</Text>
              {crisisPlan.personalContacts.map((contact) => (
                <Text key={contact.id} style={styles.reviewItem}>
                  • {contact.name} ({contact.relationship})
                </Text>
              ))}
            </View>
          )}

          {crisisPlan.reasonsForLiving.length > 0 && (
            <View style={styles.reviewSection}>
              <Text style={styles.reviewSectionTitle}>Reasons for Living</Text>
              {crisisPlan.reasonsForLiving.map((reason, i) => (
                <Text key={i} style={styles.reviewItem}>• {reason}</Text>
              ))}
            </View>
          )}

          <View style={styles.reviewSection}>
            <Text style={styles.reviewSectionTitle}>Emergency Resources</Text>
            {crisisPlan.emergencyContacts.map((contact) => (
              <Text key={contact.id} style={styles.reviewItem}>
                • {contact.name}: {contact.phone}
              </Text>
            ))}
          </View>
        </ScrollView>
      )}

      <View style={styles.reviewActions}>
        <Pressable
          style={styles.exportButton}
          onPress={handleExport}
          accessibilityRole="button"
        >
          <Text style={styles.exportButtonText}>📤 Export Plan</Text>
        </Pressable>

        <Pressable
          style={styles.editButton}
          onPress={() => setCurrentStep('warning_signs')}
          accessibilityRole="button"
        >
          <Text style={styles.editButtonText}>✏️ Edit Plan</Text>
        </Pressable>

        <Pressable
          style={styles.deleteButton}
          onPress={handleDelete}
          accessibilityRole="button"
        >
          <Text style={styles.deleteButtonText}>🗑️ Delete Plan</Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.primaryButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
      >
        <Text style={styles.primaryButtonText}>Done</Text>
      </Pressable>
    </View>
  );

  /**
   * Render current step
   */
  const renderStep = () => {
    switch (currentStep) {
      case 'consent':
        return renderConsentStep();
      case 'warning_signs':
        return renderWarningSignsStep();
      case 'coping':
        return renderCopingStep();
      case 'contacts':
        return renderContactsStep();
      case 'reasons':
        return renderReasonsStep();
      case 'review':
        return renderReviewStep();
      default:
        return renderConsentStep();
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading your safety plan...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderStep()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white
  },
  scrollView: {
    flex: 1
  },
  scrollContent: {
    padding: spacing.lg
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600]
  },
  stepContainer: {
    flex: 1
  },
  stepTitle: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.gray[800],
    marginBottom: spacing.md
  },
  stepDescription: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    lineHeight: typography.bodyLarge.size,
    marginBottom: spacing.lg
  },
  infoBox: {
    backgroundColor: '#E3F2FD',
    borderRadius: borderRadius.large,
    padding: spacing.lg,
    marginBottom: spacing.md
  },
  infoTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
    marginBottom: spacing.sm
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[5],
    marginBottom: spacing.xs
  },
  inputContainer: {
    marginBottom: spacing.lg
  },
  contactForm: {
    marginBottom: spacing.lg
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[800],
    marginBottom: spacing.sm,
    minHeight: 50
  },
  addButton: {
    backgroundColor: '#1976D2',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  addButtonDisabled: {
    backgroundColor: colorSystem.gray[300]
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  },
  itemsList: {
    marginBottom: spacing.lg
  },
  itemsListTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
    marginBottom: spacing.sm
  },
  itemCard: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.sm
  },
  itemText: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[800],
    lineHeight: spacing[5]
  },
  navigationButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    gap: spacing.md
  },
  actionButtons: {
    marginTop: spacing.xl
  },
  primaryButton: {
    backgroundColor: '#1976D2',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    flex: 1
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.bold
  },
  secondaryButton: {
    backgroundColor: colorSystem.gray[100],
    borderWidth: 1,
    borderColor: colorSystem.gray[300],
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    flex: 1,
    marginTop: spacing.sm
  },
  secondaryButtonText: {
    color: colorSystem.gray[800],
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  },
  reviewContainer: {
    maxHeight: 400,
    marginBottom: spacing.lg
  },
  reviewSection: {
    marginBottom: spacing.lg
  },
  reviewSectionTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.gray[800],
    marginBottom: spacing.sm
  },
  reviewItem: {
    fontSize: typography.bodySmall.size,
    color: colorSystem.gray[700],
    lineHeight: spacing[5],
    marginBottom: spacing.xs
  },
  reviewActions: {
    gap: spacing.sm,
    marginBottom: spacing.lg
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  exportButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  },
  editButton: {
    backgroundColor: '#FF9800',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  },
  deleteButton: {
    backgroundColor: '#F44336',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.medium,
    alignItems: 'center'
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold
  }
});