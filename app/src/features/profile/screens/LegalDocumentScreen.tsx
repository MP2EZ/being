/**
 * LEGAL DOCUMENT SCREEN
 * Renders legal documents (privacy policy, terms, etc.) with proper mobile styling
 *
 * COMPLIANCE:
 * - Documents bundled at build time for offline access
 * - No network dependency for viewing legal content
 * - Same source files as website (single source of truth)
 *
 * ACCESSIBILITY:
 * - WCAG AA compliant
 * - Screen reader support for markdown content
 * - Proper heading hierarchy
 */

import React from 'react';
import { Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import Markdown from 'react-native-markdown-display';
import { colorSystem, spacing, borderRadius, typography, semantic } from '@/core/theme';
import { getLegalDocument } from '../content/legalDocuments';
import type { ProfileStackParamList } from '../ProfileStackNavigator';

// FEAT-212: route on ProfileStackNavigator. The document is resolved from the
// serializable `documentType` route param; the native stack header supplies the
// back chevron and the document title (set in the navigator), so the former
// custom in-content "← Back" header is removed.
const LegalDocumentScreen: React.FC = () => {
  const route = useRoute<RouteProp<ProfileStackParamList, 'LegalDocument'>>();
  const document = getLegalDocument(route.params.documentType);

  if (!document) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.notFoundText}>Document not found.</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={true}
      >
        <Markdown style={markdownStyles}>{document.content}</Markdown>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  notFoundText: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.secondary,
    textAlign: 'center',
    padding: spacing[24],
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing[16],
    paddingTop: spacing[20],
    paddingBottom: spacing[32],
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 24,
    color: semantic.text.secondary,
  },
  heading1: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold as '700',
    lineHeight: 36,
    color: semantic.text.primary,
    marginTop: 0,
    marginBottom: spacing[16],
  },
  heading2: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold as '600',
    color: semantic.text.primary,
    marginTop: spacing[24],
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
    paddingBottom: spacing[8],
  },
  heading3: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold as '600',
    color: semantic.text.secondary,
    marginTop: spacing[16],
    marginBottom: spacing[8],
  },
  paragraph: {
    marginBottom: spacing[12],
    lineHeight: 24,
  },
  bullet_list: {
    marginBottom: spacing[16],
    paddingLeft: spacing[8],
  },
  ordered_list: {
    marginBottom: spacing[16],
    paddingLeft: spacing[8],
  },
  list_item: {
    flexDirection: 'row',
    marginBottom: spacing[8],
  },
  bullet_list_content: {
    flex: 1,
    paddingLeft: spacing[8],
  },
  ordered_list_content: {
    flex: 1,
    paddingLeft: spacing[8],
  },
  strong: {
    fontWeight: typography.fontWeight.semibold as '600',
    color: semantic.text.primary,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: colorSystem.base.midnightBlue,
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: colorSystem.gray[100],
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.base.midnightBlue,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    marginVertical: spacing[16],
    borderRadius: borderRadius.small,
  },
  code_inline: {
    backgroundColor: colorSystem.gray[100],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.small,
    fontFamily: 'monospace',
    fontSize: typography.bodySmall.size,
  },
  fence: {
    backgroundColor: colorSystem.gray[100],
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginVertical: spacing[16],
    fontFamily: 'monospace',
    fontSize: typography.bodySmall.size,
  },
  hr: {
    backgroundColor: colorSystem.gray[300],
    height: 1,
    marginVertical: spacing[24],
  },
  table: {
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
    marginVertical: spacing[16],
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: colorSystem.gray[100],
  },
  th: {
    padding: spacing[12],
    fontWeight: typography.fontWeight.semibold as '600',
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
    borderRightWidth: 1,
    borderRightColor: colorSystem.gray[200],
  },
  td: {
    padding: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: colorSystem.gray[200],
    borderRightWidth: 1,
    borderRightColor: colorSystem.gray[200],
  },
  tr: {
    flexDirection: 'row',
  },
});

export default LegalDocumentScreen;
