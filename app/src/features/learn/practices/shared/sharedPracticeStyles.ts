import { StyleSheet } from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';

export const sharedPracticeStyles = StyleSheet.create({
  // Layout containers
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[32],
  },

  // Instruction sections
  instructionsSection: {
    marginBottom: spacing[32],
  },
  instructionsText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    textAlign: 'center' as const,
    lineHeight: 24,
  },

  // Timer section
  timerSection: {
    marginBottom: spacing[32],
  },

  // Note section (used in PracticeTimerScreen)
  noteSection: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    backgroundColor: colorSystem.navigation.learn + '10',
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    gap: spacing[8],
  },
  noteIcon: {
    fontSize: 20,
  },
  noteText: {
    flex: 1,
    fontSize: typography.caption.size,
    color: colorSystem.gray[700],
    lineHeight: 20,
    fontStyle: 'italic' as const,
  },
});
