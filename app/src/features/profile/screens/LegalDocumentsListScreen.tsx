/**
 * LEGAL DOCUMENTS LIST SCREEN
 * Shows all legal documents with navigation to individual document views
 *
 * COMPLIANCE:
 * - All required legal documents accessible from this screen.
 *   The canonical list is defined in ../content/legalDocuments.ts.
 * - Documents available offline (bundled at build time)
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - 44px+ touch targets
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { legalDocumentsList } from '../content/legalDocuments';
import type { ProfileStackParamList } from '../ProfileStackNavigator';

// FEAT-212: rendered as a route on ProfileStackNavigator. Selecting a document is
// now a pushed route (Legal → LegalDocument) carrying a serializable documentType,
// not an in-component state machine; the native stack header supplies the back chevron.
const LegalDocumentsListScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<ProfileStackParamList>>();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <Text style={styles.subtitle}>
          Review our policies and legal information. All documents are available
          offline for your convenience.
        </Text>

        <View style={styles.documentList}>
          {legalDocumentsList.map((doc) => (
            <Pressable
              key={doc.id}
              style={styles.documentCard}
              onPress={() => navigation.navigate('LegalDocument', { documentType: doc.id })}
              testID={`profile-legal-doc-${doc.id}`}
              accessibilityRole="button"
              accessibilityLabel={`View ${doc.title}`}
              accessibilityHint={doc.description}
            >
              <View style={styles.documentInfo}>
                <Text style={styles.documentTitle}>{doc.title}</Text>
                <Text style={styles.documentDescription}>{doc.description}</Text>
              </View>
              <Text style={styles.documentArrow}>→</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.offlineNote}>
          <Text style={styles.offlineNoteText}>
            All legal documents are stored on your device and can be accessed
            without an internet connection.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

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
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 24,
    marginBottom: spacing[24],
  },
  documentList: {
    marginBottom: spacing[24],
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[20],
    marginBottom: spacing[12],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    minHeight: 76,
  },
  documentInfo: {
    flex: 1,
    marginRight: spacing[12],
  },
  documentTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[4],
  },
  documentDescription: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  documentArrow: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.midnightBlue,
  },
  offlineNote: {
    backgroundColor: '#F0F4FF',
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[24],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  offlineNoteText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
});

export default LegalDocumentsListScreen;
