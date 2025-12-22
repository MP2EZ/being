/**
 * LEGAL DOCUMENTS LIST SCREEN
 * Shows all legal documents with navigation to individual document views
 *
 * COMPLIANCE:
 * - All 7 required documents accessible: privacy policy, terms of service,
 *   medical disclaimer, notice of privacy practices, California privacy,
 *   do-not-sell, and support
 * - Documents available offline (bundled at build time)
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support
 * - 44px+ touch targets
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import {
  legalDocumentsList,
  LegalDocument,
  LegalDocumentType,
} from '../content/legalDocuments';
import LegalDocumentScreen from './LegalDocumentScreen';

interface LegalDocumentsListScreenProps {
  onReturn: () => void;
}

const LegalDocumentsListScreen: React.FC<LegalDocumentsListScreenProps> = ({
  onReturn,
}) => {
  const [selectedDocument, setSelectedDocument] = useState<LegalDocument | null>(null);

  if (selectedDocument) {
    return (
      <LegalDocumentScreen
        document={selectedDocument}
        onReturn={() => setSelectedDocument(null)}
      />
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Legal Documents</Text>
          <Text style={styles.subtitle}>
            Review our policies and legal information. All documents are available
            offline for your convenience.
          </Text>
        </View>

        <View style={styles.documentList}>
          {legalDocumentsList.map((doc) => (
            <Pressable
              key={doc.id}
              style={styles.documentCard}
              onPress={() => setSelectedDocument(doc)}
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

        <Pressable
          style={styles.returnButton}
          onPress={onReturn}
          accessibilityRole="button"
          accessibilityLabel="Return to Profile"
        >
          <Text style={styles.returnButtonText}>Return to Profile</Text>
        </Pressable>
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
  header: {
    marginBottom: spacing[24],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    textAlign: 'center',
    lineHeight: 24,
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
  returnButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    minHeight: 56,
  },
  returnButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default LegalDocumentsListScreen;
