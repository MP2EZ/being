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
import { View, StyleSheet, ScrollView, Pressable, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Markdown from 'react-native-markdown-display';
import { commonColors, spacing, borderRadius, typography } from '@/core/theme';
import { LegalDocument } from '../content/legalDocuments';

interface LegalDocumentScreenProps {
  document: LegalDocument;
  onReturn: () => void;
}

const LegalDocumentScreen: React.FC<LegalDocumentScreenProps> = ({
  document,
  onReturn,
}) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={onReturn}
          accessibilityRole="button"
          accessibilityLabel="Return to legal documents"
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </Pressable>
        <Text style={styles.headerTitle}>{document.shortTitle}</Text>
        <View style={styles.headerSpacer} />
      </View>

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
    backgroundColor: commonColors.white,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: commonColors.gray200,
  },
  backButton: {
    padding: spacing[8],
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.medium,
    color: commonColors.midnightBlue,
  },
  headerTitle: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: commonColors.black,
  },
  headerSpacer: {
    width: 60,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing[16],
    paddingBottom: spacing[32],
  },
});

const markdownStyles = StyleSheet.create({
  body: {
    fontSize: typography.bodyRegular.size,
    lineHeight: 24,
    color: commonColors.gray700,
  },
  heading1: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.bold as '700',
    color: commonColors.black,
    marginTop: spacing[24],
    marginBottom: spacing[16],
  },
  heading2: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold as '600',
    color: commonColors.black,
    marginTop: spacing[24],
    marginBottom: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: commonColors.gray200,
    paddingBottom: spacing[8],
  },
  heading3: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold as '600',
    color: commonColors.gray700,
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
    color: commonColors.black,
  },
  em: {
    fontStyle: 'italic',
  },
  link: {
    color: commonColors.midnightBlue,
    textDecorationLine: 'underline',
  },
  blockquote: {
    backgroundColor: commonColors.gray100,
    borderLeftWidth: 4,
    borderLeftColor: commonColors.midnightBlue,
    paddingHorizontal: spacing[16],
    paddingVertical: spacing[12],
    marginVertical: spacing[16],
    borderRadius: borderRadius.small,
  },
  code_inline: {
    backgroundColor: commonColors.gray100,
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.small,
    fontFamily: 'monospace',
    fontSize: typography.bodySmall.size,
  },
  fence: {
    backgroundColor: commonColors.gray100,
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginVertical: spacing[16],
    fontFamily: 'monospace',
    fontSize: typography.bodySmall.size,
  },
  hr: {
    backgroundColor: commonColors.gray300,
    height: 1,
    marginVertical: spacing[24],
  },
  table: {
    borderWidth: 1,
    borderColor: commonColors.gray200,
    marginVertical: spacing[16],
    borderRadius: borderRadius.medium,
    overflow: 'hidden',
  },
  thead: {
    backgroundColor: commonColors.gray100,
  },
  th: {
    padding: spacing[12],
    fontWeight: typography.fontWeight.semibold as '600',
    borderBottomWidth: 1,
    borderBottomColor: commonColors.gray200,
    borderRightWidth: 1,
    borderRightColor: commonColors.gray200,
  },
  td: {
    padding: spacing[12],
    borderBottomWidth: 1,
    borderBottomColor: commonColors.gray200,
    borderRightWidth: 1,
    borderRightColor: commonColors.gray200,
  },
  tr: {
    flexDirection: 'row',
  },
});

export default LegalDocumentScreen;
