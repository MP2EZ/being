/**
 * About Being. Screen (placeholder)
 *
 * Extracted from ProfileScreen's former inline `renderPlaceholder('About Being.')`
 * during the FEAT-212 nav migration. The "About Being." menu card stays gated
 * behind `ABOUT_BEING_CONTENT_READY` (FEAT-209 H2) — this route only renders once
 * that content ships. Kept as a real route so the gated card's navigation target
 * is valid; the native stack header supplies the back chevron.
 */
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';

const AboutBeingScreen: React.FC = () => (
  <SafeAreaView style={styles.container}>
    <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
      <Text style={styles.subtitle}>Our mission and the science of mindfulness</Text>
      <View style={styles.placeholderContent}>
        <Text style={styles.placeholderText}>
          This feature is coming soon. We're working hard to bring you the best experience.
        </Text>
      </View>
    </ScrollView>
  </SafeAreaView>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing[24],
  },
  placeholderContent: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[32],
    marginVertical: spacing[32],
    minHeight: 200,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[500],
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default AboutBeingScreen;
