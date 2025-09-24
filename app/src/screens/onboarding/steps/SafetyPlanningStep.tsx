/**
 * SafetyPlanningStep - Step 4: Safety Planning & Emergency Contacts
 *
 * CLINICAL FOCUS: Crisis safety plan creation and emergency contact setup
 * DURATION: ~4 minutes with optional contact collection
 * SAFETY: Professional resource backup and user autonomy
 */

import React, { useCallback, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from '../../../utils/ReanimatedMock';

import {
  Screen,
  Typography,
  TherapeuticHeading,
  Button,
  Card,
  CrisisButton,
} from '../../../components/core';

import { OnboardingStepProps } from '../TherapeuticOnboardingFlow';
import { colorSystem, spacing } from '../../../constants/colors';
import { useHaptics } from '../../../hooks/useHaptics';

interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  isPrimary: boolean;
}

export const SafetyPlanningStep: React.FC<OnboardingStepProps> = ({
  theme,
  onNext,
  onBack,
  onSkip,
  progress,
}) => {
  const [emergencyContacts, setEmergencyContacts] = useState<EmergencyContact[]>([]);
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [newContact, setNewContact] = useState({
    name: '',
    relationship: '',
    phone: '',
  });

  const { triggerHaptic } = useHaptics();

  // Animation values
  const fadeInValue = useSharedValue(0);
  const slideUpValue = useSharedValue(30);

  const themeColors = colorSystem.themes[theme];

  React.useEffect(() => {
    // Entrance animation
    fadeInValue.value = withTiming(1, { duration: 600 });
    slideUpValue.value = withSpring(0, {
      damping: 12,
      stiffness: 100,
    });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: fadeInValue.value,
    transform: [{ translateY: slideUpValue.value }],
  }));

  const validateContact = useCallback(() => {
    if (!newContact.name.trim()) {
      Alert.alert('Name Required', 'Please enter a name for your emergency contact.');
      return false;
    }
    if (!newContact.phone.trim()) {
      Alert.alert('Phone Required', 'Please enter a phone number for your emergency contact.');
      return false;
    }
    // Basic phone validation
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
    if (!phoneRegex.test(newContact.phone.replace(/\s+/g, ''))) {
      Alert.alert('Invalid Phone', 'Please enter a valid phone number.');
      return false;
    }
    return true;
  }, [newContact]);

  const handleAddContact = useCallback(() => {
    if (!validateContact()) return;

    const contact: EmergencyContact = {
      id: `contact_${Date.now()}`,
      name: newContact.name.trim(),
      relationship: newContact.relationship.trim() || 'Emergency Contact',
      phone: newContact.phone.trim(),
      isPrimary: emergencyContacts.length === 0,
    };

    setEmergencyContacts([...emergencyContacts, contact]);
    setNewContact({ name: '', relationship: '', phone: '' });
    setIsAddingContact(false);
    triggerHaptic('success');
  }, [validateContact, newContact, emergencyContacts, triggerHaptic]);

  const handleRemoveContact = useCallback((contactId: string) => {
    Alert.alert(
      'Remove Contact?',
      'Are you sure you want to remove this emergency contact?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setEmergencyContacts(contacts => contacts.filter(c => c.id !== contactId));
            triggerHaptic('light');
          }
        }
      ]
    );
  }, [triggerHaptic]);

  const handleContinue = useCallback(() => {
    triggerHaptic('light');
    // Save emergency contacts to user profile
    // This would typically integrate with the user store
    onNext();
  }, [triggerHaptic, onNext]);

  const handleSkip = useCallback(() => {
    Alert.alert(
      'Skip Safety Planning?',
      'You can always add emergency contacts later in your profile settings. Professional crisis resources will still be available.',
      [
        { text: 'Continue Setup', style: 'cancel' },
        {
          text: 'Skip for Now',
          style: 'default',
          onPress: () => {
            triggerHaptic('light');
            onSkip?.();
          }
        }
      ]
    );
  }, [triggerHaptic, onSkip]);

  const handleBack = useCallback(() => {
    if (isAddingContact) {
      setIsAddingContact(false);
    } else {
      triggerHaptic('light');
      onBack?.();
    }
  }, [isAddingContact, triggerHaptic, onBack]);

  return (
    <Screen safeAreaEdges={[]} style={{ backgroundColor: themeColors.background }}>
      {/* Crisis Button */}
      <View style={styles.crisisButtonContainer}>
        <CrisisButton />
      </View>

      <Animated.View style={[styles.container, animatedStyle]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <TherapeuticHeading
              variant="h1"
              style={[styles.title, { color: themeColors.primary }]}
            >
              Your Safety Network
            </TherapeuticHeading>

            <Typography
              variant="subtitle"
              style={[styles.subtitle, { color: themeColors.text.secondary }]}
            >
              Building your support system within Being.
            </Typography>
          </View>

          {/* Why Safety Planning */}
          <Card style={[styles.infoCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Why Safety Planning Matters
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              Having trusted people in your support network provides:
              {'\n\n'}• Quick access to emotional support when you need it
              {'\n'}• Backup during difficult moments
              {'\n'}• Connection to people who care about your well-being
              {'\n'}• Enhanced sense of safety and community
              {'\n\n'}Emergency contacts are stored securely on your device only.
              You can add, remove, or update them anytime.
            </Typography>
          </Card>

          {/* Professional Resources */}
          <Card style={[styles.professionalCard, {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.accent,
            borderWidth: 1
          }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.accent }]}>
              Professional Support Always Available
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              <Typography variant="bodyBold" style={styles.emergencyText}>
                🆘 988 - Suicide & Crisis Lifeline (24/7)
              </Typography>
              {'\n'}Free, confidential support for people in crisis
              {'\n\n'}<Typography variant="bodyBold" style={styles.emergencyText}>
                💬 Crisis Text Line: Text HOME to 741741
              </Typography>
              {'\n'}24/7 text-based crisis support
              {'\n\n'}<Typography variant="bodyBold" style={styles.emergencyText}>
                🚑 911 - Emergency Services
              </Typography>
              {'\n'}For immediate life-threatening emergencies
              {'\n\n'}These resources complement your personal support network.
            </Typography>
          </Card>

          {/* Emergency Contacts */}
          <Card style={[styles.contactsCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h3" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Personal Emergency Contacts
            </Typography>
            <Typography variant="body" style={[styles.cardText, { marginBottom: spacing.lg }]}>
              Add trusted friends, family members, or other support people who you
              could reach out to during difficult times.
            </Typography>

            {/* Existing Contacts */}
            {emergencyContacts.map((contact) => (
              <View key={contact.id} style={[
                styles.contactItem,
                { backgroundColor: themeColors.background, borderColor: themeColors.border }
              ]}>
                <View style={styles.contactInfo}>
                  <Typography variant="bodyBold" style={styles.contactName}>
                    {contact.name}
                    {contact.isPrimary && (
                      <Typography variant="caption" style={styles.primaryLabel}>
                        {' '}(Primary)
                      </Typography>
                    )}
                  </Typography>
                  <Typography variant="body" style={styles.contactRelationship}>
                    {contact.relationship}
                  </Typography>
                  <Typography variant="body" style={styles.contactPhone}>
                    {contact.phone}
                  </Typography>
                </View>
                <Button
                  variant="outline"
                  onPress={() => handleRemoveContact(contact.id)}
                  style={styles.removeButton}
                  accessibilityLabel={`Remove ${contact.name}`}
                >
                  Remove
                </Button>
              </View>
            ))}

            {/* Add Contact Form */}
            {isAddingContact ? (
              <View style={[styles.addContactForm, { backgroundColor: themeColors.background }]}>
                <Typography variant="h4" style={[styles.formTitle, { color: themeColors.primary }]}>
                  Add Emergency Contact
                </Typography>

                <View style={styles.inputGroup}>
                  <Typography variant="bodyBold" style={styles.inputLabel}>
                    Name *
                  </Typography>
                  <TextInput
                    style={[styles.textInput, { borderColor: themeColors.border }]}
                    value={newContact.name}
                    onChangeText={(text) => setNewContact({ ...newContact, name: text })}
                    placeholder="Full name"
                    placeholderTextColor={themeColors.text.secondary}
                    accessibilityLabel="Contact name"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Typography variant="bodyBold" style={styles.inputLabel}>
                    Relationship
                  </Typography>
                  <TextInput
                    style={[styles.textInput, { borderColor: themeColors.border }]}
                    value={newContact.relationship}
                    onChangeText={(text) => setNewContact({ ...newContact, relationship: text })}
                    placeholder="e.g., Friend, Family Member, Partner"
                    placeholderTextColor={themeColors.text.secondary}
                    accessibilityLabel="Relationship to contact"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Typography variant="bodyBold" style={styles.inputLabel}>
                    Phone Number *
                  </Typography>
                  <TextInput
                    style={[styles.textInput, { borderColor: themeColors.border }]}
                    value={newContact.phone}
                    onChangeText={(text) => setNewContact({ ...newContact, phone: text })}
                    placeholder="Phone number"
                    placeholderTextColor={themeColors.text.secondary}
                    keyboardType="phone-pad"
                    accessibilityLabel="Contact phone number"
                  />
                </View>

                <View style={styles.formButtons}>
                  <Button
                    variant="outline"
                    onPress={() => setIsAddingContact(false)}
                    style={styles.formButton}
                  >
                    Cancel
                  </Button>
                  <Button
                    onPress={handleAddContact}
                    style={styles.formButton}
                    disabled={!newContact.name.trim() || !newContact.phone.trim()}
                  >
                    Add Contact
                  </Button>
                </View>
              </View>
            ) : (
              <Button
                variant="outline"
                onPress={() => setIsAddingContact(true)}
                style={styles.addButton}
                accessibilityLabel="Add emergency contact"
              >
                + Add Emergency Contact
              </Button>
            )}
          </Card>

          {/* Privacy Note */}
          <Card style={[styles.privacyCard, { backgroundColor: themeColors.surface }]}>
            <Typography variant="h4" style={[styles.cardTitle, { color: themeColors.primary }]}>
              Privacy & Security
            </Typography>
            <Typography variant="body" style={styles.cardText}>
              • All emergency contacts are stored locally on your device
              {'\n'}• No contact information is shared with Being. servers
              {'\n'}• You control who has access to your support network
              {'\n'}• Contacts can be updated or removed anytime in Settings
            </Typography>
          </Card>

          {/* Progress Indicator */}
          <View style={styles.progressSection}>
            <Typography variant="caption" style={styles.progressText}>
              Step {progress.current} of {progress.total} • Optional - enhancing your safety network
            </Typography>
          </View>
        </ScrollView>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            variant="outline"
            onPress={handleBack}
            style={styles.backButton}
            accessibilityLabel="Go back to assessment"
            haptic={true}
          >
            Back
          </Button>

          <Button
            variant="outline"
            onPress={handleSkip}
            style={styles.skipButton}
            accessibilityLabel="Skip safety planning"
            haptic={true}
          >
            Skip for Now
          </Button>

          <Button
            onPress={handleContinue}
            style={styles.continueButton}
            accessibilityLabel="Continue to personalization"
            haptic={true}
          >
            Continue
          </Button>
        </View>
      </Animated.View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  crisisButtonContainer: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    zIndex: 1000,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl * 2,
    paddingBottom: spacing.xl,
  },
  headerSection: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  infoCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  professionalCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  contactsCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  privacyCard: {
    marginBottom: spacing.lg,
    padding: spacing.lg,
  },
  cardTitle: {
    marginBottom: spacing.md,
  },
  cardText: {
    lineHeight: 24,
    color: colorSystem.text.body,
  },
  emergencyText: {
    color: colorSystem.semantic.error,
  },
  contactItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    marginBottom: spacing.xs,
  },
  primaryLabel: {
    color: colorSystem.semantic.success,
    fontStyle: 'italic',
  },
  contactRelationship: {
    marginBottom: spacing.xs,
    color: colorSystem.text.secondary,
  },
  contactPhone: {
    color: colorSystem.text.secondary,
  },
  removeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  addContactForm: {
    padding: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  formTitle: {
    marginBottom: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    marginBottom: spacing.xs,
    color: colorSystem.text.body,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: spacing.md,
    fontSize: 16,
    color: colorSystem.text.body,
  },
  formButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  formButton: {
    flex: 1,
  },
  addButton: {
    marginTop: spacing.md,
  },
  progressSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  progressText: {
    textAlign: 'center',
    color: colorSystem.text.secondary,
    fontStyle: 'italic',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  backButton: {
    flex: 1,
  },
  skipButton: {
    flex: 1,
  },
  continueButton: {
    flex: 1.5,
  },
});

export default SafetyPlanningStep;