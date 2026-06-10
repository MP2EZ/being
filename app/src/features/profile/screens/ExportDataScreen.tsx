/**
 * EXPORT MY DATA SCREEN (FEAT-267)
 *
 * Data portability (CCPA / TDPSA / VCDPA / CPA / CTDPA / GDPR Art. 20). Shows
 * the user what the export includes + the encrypted-server-blob disclosure, then
 * gathers the on-device wellness data (decrypted client-side), writes it to a
 * JSON file, and opens the system share sheet.
 *
 * CRISIS-PATH SAFETY: pushed route INSIDE ProfileStackNavigator — inherits the
 * sibling CollapsibleCrisisButton overlay. The gather/serialize work runs async
 * so it never blocks the overlay's touch handler.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { colorSystem, spacing, borderRadius, typography } from '@/core/theme';
import { gatherExportData, serializeExport } from '@/core/services/privacy/DataExportService';
import { logError, LogCategory } from '@/core/services/logging';

const INCLUDED_SECTIONS = [
  'Check-ins, reflections, and practice history',
  'PHQ-9 and GAD-7 wellness screening results',
  'Subscription state',
  'Your consent records',
];

const ExportDataScreen: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    setIsExporting(true);
    setErrorMessage(null);
    try {
      const json = serializeExport(await gatherExportData());
      const stamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      const file = new File(Paths.cache, `being-export-${stamp}.json`);
      file.create({ overwrite: true });
      file.write(json);

      if (!(await Sharing.isAvailableAsync())) {
        setErrorMessage('Sharing is not available on this device.');
        return;
      }
      await Sharing.shareAsync(file.uri, {
        mimeType: 'application/json',
        UTI: 'public.json',
        dialogTitle: 'Export your Being data',
      });
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        '[ExportData] export failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      setErrorMessage('Could not prepare your export. Please try again.');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['bottom']} testID="export-data-screen">
      <ScrollView style={styles.scrollContainer} contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Export my wellness data</Text>
        <Text style={styles.lead}>
          Download a portable copy of the data stored on this device, exercising your
          data-portability and right-to-know rights.
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>What's included</Text>
          <View style={styles.card}>
            {INCLUDED_SECTIONS.map((item) => (
              <View key={item} style={styles.bulletRow}>
                <Text style={styles.bulletDot}>•</Text>
                <Text style={styles.bulletText}>{item}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            Cloud-backup data on our servers is encrypted with a key only this device holds, so it
            is not included — the meaningful copy is this on-device export. The file is plain JSON;
            keep it somewhere private.
          </Text>
        </View>

        {errorMessage && (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" testID="export-error">
            {errorMessage}
          </Text>
        )}

        <Pressable
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onPress={handleExport}
          disabled={isExporting}
          accessibilityRole="button"
          accessibilityLabel="Export as JSON"
          accessibilityHint="Prepares a JSON file of your on-device data and opens the share sheet"
          accessibilityState={{ disabled: isExporting, busy: isExporting }}
          testID="export-data-button"
        >
          {isExporting ? (
            <ActivityIndicator color={colorSystem.base.white} />
          ) : (
            <Text style={styles.exportButtonText}>Export as JSON</Text>
          )}
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
  heading: {
    fontSize: typography.headline2.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
  },
  lead: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
    marginBottom: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
    marginBottom: spacing[12],
  },
  card: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.large,
    padding: spacing[16],
    borderWidth: 1,
    borderColor: colorSystem.gray[200],
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: spacing[8],
  },
  bulletDot: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginRight: spacing[8],
  },
  bulletText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 22,
  },
  infoBox: {
    backgroundColor: colorSystem.status.infoBackground,
    borderRadius: borderRadius.medium,
    padding: spacing[16],
    marginBottom: spacing[24],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.base.midnightBlue,
  },
  infoText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: colorSystem.gray[600],
    lineHeight: 20,
  },
  errorText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: colorSystem.status.error,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  exportButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[32],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
  },
  exportButtonDisabled: {
    backgroundColor: colorSystem.gray[300],
  },
  exportButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
});

export default ExportDataScreen;
