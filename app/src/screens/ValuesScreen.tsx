/**
 * VALUES SCREEN
 * Display and edit user's selected therapeutic values
 *
 * THERAPEUTIC CONTEXT:
 * - Users select 3-5 values during onboarding
 * - Values can be viewed and edited in profile
 * - NO gamification, adherence tracking, or shame-inducing metrics
 * - Values editing is therapeutically appropriate (no cooldowns/restrictions)
 *
 * SECURITY:
 * - Values loaded from valuesStore (encrypted SecureStore)
 * - Changes auto-saved on edit
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - Clear focus management
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useValuesStore } from '../stores/valuesStore';
import {
  THERAPEUTIC_VALUES,
  MIN_VALUES_SELECTION,
  MAX_VALUES_SELECTION,
  getValueById,
} from '../constants/therapeuticValues';

// Hardcoded colors - consistent with ProfileScreen
const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray200: '#E5E7EB',
  gray300: '#D1D5DB',
  gray400: '#9CA3AF',
  gray500: '#6B7280',
  gray600: '#4B5563',
  midnightBlue: '#1B2951',
  morningPrimary: '#FF9F43',
  eveningPrimary: '#4A7C59',
  success: '#10B981',
  error: '#EF4444',
};

const spacing = {
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

interface ValuesScreenProps {
  onReturn: () => void;
}

const ValuesScreen: React.FC<ValuesScreenProps> = ({ onReturn }) => {
  const valuesStore = useValuesStore();
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Load values on mount
  useEffect(() => {
    const loadValues = async () => {
      await valuesStore.loadValues();
      setSelectedIds(valuesStore.getSelectedValueIds());
    };
    loadValues();
  }, []);

  // Validation
  const canAddMore = selectedIds.length < MAX_VALUES_SELECTION;
  const canRemove = selectedIds.length > MIN_VALUES_SELECTION;
  const hasChanges = JSON.stringify(selectedIds.sort()) !== JSON.stringify(valuesStore.getSelectedValueIds().sort());
  const isValid = selectedIds.length >= MIN_VALUES_SELECTION && selectedIds.length <= MAX_VALUES_SELECTION;

  const handleToggleValue = (valueId: string) => {
    if (!isEditing) return;

    const isSelected = selectedIds.includes(valueId);

    if (isSelected) {
      // Remove value
      if (selectedIds.length <= MIN_VALUES_SELECTION) {
        Alert.alert(
          'Minimum Values Required',
          `Please keep at least ${MIN_VALUES_SELECTION} values selected for a meaningful therapeutic experience.`,
          [{ text: 'OK' }]
        );
        return;
      }
      setSelectedIds(selectedIds.filter(id => id !== valueId));
    } else {
      // Add value
      if (selectedIds.length >= MAX_VALUES_SELECTION) {
        Alert.alert(
          'Maximum Values Reached',
          `You can select up to ${MAX_VALUES_SELECTION} values. Please deselect a value first.`,
          [{ text: 'OK' }]
        );
        return;
      }
      setSelectedIds([...selectedIds, valueId]);
    }
  };

  const handleStartEditing = () => {
    setSelectedIds(valuesStore.getSelectedValueIds());
    setIsEditing(true);
  };

  const handleCancelEditing = () => {
    setSelectedIds(valuesStore.getSelectedValueIds());
    setIsEditing(false);
  };

  const handleSaveChanges = async () => {
    if (!isValid) {
      Alert.alert(
        'Invalid Selection',
        `Please select ${MIN_VALUES_SELECTION}-${MAX_VALUES_SELECTION} values.`,
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSaving(true);
    try {
      await valuesStore.saveValues(selectedIds);
      setIsEditing(false);
      Alert.alert(
        'Values Updated',
        'Your therapeutic values have been saved successfully.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      Alert.alert(
        'Save Failed',
        'Failed to save your values. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Render loading state
  if (valuesStore.isLoading && !valuesStore.values) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.midnightBlue} />
          <Text style={styles.loadingText}>Loading your values...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (valuesStore.error) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load values</Text>
          <Pressable style={styles.primaryButton} onPress={() => valuesStore.loadValues()}>
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const currentSelectedIds = isEditing ? selectedIds : valuesStore.getSelectedValueIds();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Your Therapeutic Values</Text>
          <Text style={styles.subtitle}>
            {isEditing
              ? `Select ${MIN_VALUES_SELECTION}-${MAX_VALUES_SELECTION} values that guide your life`
              : `${currentSelectedIds.length} ${currentSelectedIds.length === 1 ? 'value' : 'values'} selected`
            }
          </Text>
        </View>

        {/* Edit mode info */}
        {isEditing && (
          <View style={styles.infoBox}>
            <Text style={styles.infoText}>
              Select values that resonate with you. These will personalize your Being. experience.
            </Text>
          </View>
        )}

        {/* Values list */}
        <View style={styles.valuesContainer}>
          {THERAPEUTIC_VALUES.map((value) => {
            const isSelected = currentSelectedIds.includes(value.id);
            return (
              <Pressable
                key={value.id}
                style={[
                  styles.valueCard,
                  isSelected && styles.valueCardSelected,
                  !isEditing && styles.valueCardReadOnly,
                ]}
                onPress={() => handleToggleValue(value.id)}
                disabled={!isEditing}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
                accessibilityLabel={`${value.label}: ${value.description}`}
              >
                <View style={styles.valueHeader}>
                  <Text style={[styles.valueLabel, isSelected && styles.valueLabelSelected]}>
                    {value.label}
                  </Text>
                  {isSelected && (
                    <Text style={styles.checkmark}>✓</Text>
                  )}
                </View>
                <Text style={[styles.valueDescription, isSelected && styles.valueDescriptionSelected]}>
                  {value.description}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Action buttons */}
        <View style={styles.actionContainer}>
          {!isEditing ? (
            <>
              <Pressable style={styles.primaryButton} onPress={handleStartEditing}>
                <Text style={styles.primaryButtonText}>Edit Values</Text>
              </Pressable>
              <Pressable style={styles.secondaryButton} onPress={onReturn}>
                <Text style={styles.secondaryButtonText}>Return to Profile</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Pressable
                style={[styles.primaryButton, (!isValid || !hasChanges) && styles.buttonDisabled]}
                onPress={handleSaveChanges}
                disabled={!isValid || !hasChanges || isSaving}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color={colors.white} />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Save Changes ({selectedIds.length}/{MAX_VALUES_SELECTION})
                  </Text>
                )}
              </Pressable>
              <Pressable
                style={styles.secondaryButton}
                onPress={handleCancelEditing}
                disabled={isSaving}
              >
                <Text style={styles.secondaryButtonText}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>

        {/* Validation message */}
        {isEditing && !isValid && (
          <View style={styles.validationBox}>
            <Text style={styles.validationText}>
              {selectedIds.length < MIN_VALUES_SELECTION
                ? `Select at least ${MIN_VALUES_SELECTION - selectedIds.length} more ${MIN_VALUES_SELECTION - selectedIds.length === 1 ? 'value' : 'values'}`
                : `Please deselect ${selectedIds.length - MAX_VALUES_SELECTION} ${selectedIds.length - MAX_VALUES_SELECTION === 1 ? 'value' : 'values'}`
              }
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xl,
  },
  header: {
    marginBottom: spacing.xl,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.black,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '400',
    color: colors.gray600,
    textAlign: 'center',
    lineHeight: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.error,
    marginBottom: spacing.lg,
  },
  infoBox: {
    backgroundColor: colors.gray100,
    borderRadius: 8,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 3,
    borderLeftColor: colors.midnightBlue,
  },
  infoText: {
    fontSize: 14,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 20,
  },
  valuesContainer: {
    marginBottom: spacing.lg,
  },
  valueCard: {
    backgroundColor: colors.gray100,
    borderRadius: 12,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.gray200,
  },
  valueCardSelected: {
    backgroundColor: '#F0F4FF',
    borderColor: colors.midnightBlue,
  },
  valueCardReadOnly: {
    opacity: 1,
  },
  valueHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  valueLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
  },
  valueLabelSelected: {
    color: colors.midnightBlue,
  },
  checkmark: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.midnightBlue,
  },
  valueDescription: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    lineHeight: 22,
  },
  valueDescriptionSelected: {
    color: colors.gray600,
  },
  actionContainer: {
    marginTop: spacing.lg,
  },
  primaryButton: {
    backgroundColor: colors.midnightBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  primaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
  secondaryButton: {
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  secondaryButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.midnightBlue,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  validationBox: {
    backgroundColor: '#FFF5F5',
    borderRadius: 8,
    padding: spacing.md,
    marginTop: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.error,
  },
  validationText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.error,
    lineHeight: 20,
  },
});

export default ValuesScreen;
