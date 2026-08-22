/**
 * EXPORT MY DATA SCREEN (FEAT-267 + FEAT-270)
 *
 * Data portability (CCPA / TDPSA / VCDPA / CPA / CTDPA / GDPR Art. 20). Two
 * surfaces share this one screen and one Privacy & Data entry point:
 *
 *   - JSON export (FEAT-267, ALWAYS ON, never flag-gated): gathers the on-device
 *     wellness data, writes it to a JSON file, opens the system share sheet.
 *   - Scoping + count preview (FEAT-270, behind the BUILD-TIME `data_export`
 *     flag): lets the user pick a date range + categories and see HOW MANY
 *     records that selection covers, before deciding what to do with it.
 *
 * FEAT-270 constraints encoded here (compliance pass, non-negotiable):
 *   - COUNTS ONLY. `buildExportPayload` returns verbatim user free text
 *     (`reflections[].text`, `assessments[].note`, both marked OPAQUE at source).
 *     None of it is rendered, logged, or put in an error message — only
 *     `.length`, plus `meta.disclaimer` / `meta.omissions` / the resolved window.
 *   - NO ANALYTICS. There is deliberately no `trackScreenView` and no event on
 *     this screen. 'ExportData' matches no keyword in `core/utils/sensitiveScreens`,
 *     so a screen-view would reach PostHog uncoarsened — and per-category counts
 *     are themselves a signal about the user's wellness history.
 *   - The flag gates UI VISIBILITY ONLY. It is not a consent gate, and the JSON
 *     export path is untouched by it.
 *   - PREVIEW, NOT DELIVERY. This slice scopes; it does not produce a second
 *     file. Copy must never claim a completed export.
 *
 * CRISIS-PATH SAFETY: pushed route INSIDE ProfileStackNavigator — inherits the
 * sibling CollapsibleCrisisButton overlay. The gather/serialize work runs async
 * so it never blocks the overlay's touch handler. `buildExportPayload` is
 * synchronous but bounded by on-device record counts, and runs in a `useMemo`
 * keyed on the selection, so it re-runs only on an explicit user toggle.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
  TOUCH_TARGETS,
} from '@/core/theme';
import { gatherExportData, serializeExport } from '@/core/services/privacy/DataExportService';
import { logError, LogCategory } from '@/core/services/logging';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { buildExportPayload } from '@/features/data-export/services/exportService';
import type {
  ExportDataCategory,
  ExportRangePreset,
} from '@/features/data-export/types';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';

const INCLUDED_SECTIONS = [
  'Check-ins, reflections, and practice history',
  'PHQ-9 and GAD-7 wellness screening results',
  'Subscription state',
  'Your consent records',
];

const RANGE_PRESETS: ReadonlyArray<{ key: ExportRangePreset; label: string }> = [
  { key: 'last7', label: 'Last 7 days' },
  { key: 'last30', label: 'Last 30 days' },
  { key: 'last90', label: 'Last 90 days' },
  { key: 'all', label: 'All time' },
];

const SELECTABLE_CATEGORIES: ReadonlyArray<{ key: ExportDataCategory; label: string }> = [
  { key: 'assessments', label: 'Wellness screenings' },
  { key: 'checkIns', label: 'Check-ins' },
  { key: 'practices', label: 'Practices' },
  { key: 'reflections', label: 'Reflections' },
];

const ALL_CATEGORIES_SELECTED: Record<ExportDataCategory, boolean> = {
  assessments: true,
  checkIns: true,
  practices: true,
  reflections: true,
};

const formatDay = (ms: number): string =>
  new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/**
 * Hydration gate for the count preview.
 *
 * `buildExportPayload` is synchronous and reads `useAssessmentStore.getState()` /
 * `useStoicPracticeStore.getState()` directly. Both stores load asynchronously
 * from SecureStore, so a preview rendered before they rehydrate reports 0 for
 * every category — indistinguishable from "you have no data". On a
 * data-subject-rights surface that is a misleading statement about the user's
 * own record, not a cosmetic flicker, so the section shows a loading state until
 * BOTH stores report ready.
 *
 * Both signals are the stores' own existing mechanisms, not new ones:
 *   - assessmentStore is wrapped in zustand's `persist` middleware, which
 *     publishes `persist.hasHydrated()` / `persist.onFinishHydration()`.
 *   - stoicPracticeStore hand-rolls its load (`loadPersistedState`, auto-invoked
 *     at module import) and already exposes `isLoading` for exactly this.
 */
function useExportStoresHydrated(): boolean {
  const practiceLoading = useStoicPracticeStore((state) => state.isLoading);
  const [assessmentHydrated, setAssessmentHydrated] = useState<boolean>(() =>
    useAssessmentStore.persist.hasHydrated(),
  );

  useEffect(() => {
    if (assessmentHydrated) return undefined;
    const unsubscribe = useAssessmentStore.persist.onFinishHydration(() => {
      setAssessmentHydrated(true);
    });
    // Hydration can finish between the initial render and this effect, in which
    // case onFinishHydration would never fire again — re-check once.
    if (useAssessmentStore.persist.hasHydrated()) setAssessmentHydrated(true);
    return unsubscribe;
  }, [assessmentHydrated]);

  return assessmentHydrated && !practiceLoading;
}

const ExportDataScreen: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Build-time flag, read once per render. Deliberately NOT the PostHog-backed
  // `useFeatureFlag` hook — see the `data_export` comment in featureFlags.ts.
  const previewEnabled = isFeatureEnabled('data_export');

  const [selectedPreset, setSelectedPreset] = useState<ExportRangePreset>('all');
  const [selectedCategories, setSelectedCategories] =
    useState<Record<ExportDataCategory, boolean>>(ALL_CATEGORIES_SELECTED);

  const storesHydrated = useExportStoresHydrated();

  const toggleCategory = useCallback((key: ExportDataCategory) => {
    setSelectedCategories((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const selectedCategoryKeys = useMemo(
    () => SELECTABLE_CATEGORIES.map((c) => c.key).filter((key) => selectedCategories[key]),
    [selectedCategories],
  );

  /**
   * The preview payload. Counts are read off it; NOTHING else on it is rendered
   * except `meta.disclaimer`, `meta.omissions`, and the resolved window.
   */
  const preview = useMemo(() => {
    if (!previewEnabled || !storesHydrated) return null;
    return buildExportPayload({
      categories: selectedCategoryKeys,
      range: { preset: selectedPreset },
    });
  }, [previewEnabled, storesHydrated, selectedCategoryKeys, selectedPreset]);

  /**
   * Per-category record counts.
   *
   * Shape traps this deliberately handles (all verified against exportService):
   *   - `practices` is an OBJECT (`{ principleEngagements }`), not an array.
   *   - Unrequested categories are ABSENT (`undefined`), not empty arrays.
   *   - `ExportedPractices.virtues` was removed at schema v3 (MAINT-371).
   *   - The category key is `checkIns`, not `check-ins`.
   */
  const counts = useMemo<Record<ExportDataCategory, number> | null>(() => {
    if (!preview) return null;
    return {
      assessments: preview.assessments?.length ?? 0,
      checkIns: preview.checkIns?.length ?? 0,
      practices: preview.practices?.principleEngagements.length ?? 0,
      reflections: preview.reflections?.length ?? 0,
    };
  }, [preview]);

  const totalCount = counts
    ? SELECTABLE_CATEGORIES.reduce(
        (sum, c) => (selectedCategories[c.key] ? sum + counts[c.key] : sum),
        0,
      )
    : 0;

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

        {previewEnabled && (
          <View style={styles.previewSection} testID="export-preview-section">
            <Text style={styles.sectionTitle}>See what&apos;s included</Text>
            <Text style={styles.previewLead}>
              Narrow this down to see how much of your wellness data falls inside a given
              window. This is a preview of record counts only — it does not create a file,
              and it never shows what you wrote.
            </Text>
            <Text style={styles.previewCaveat}>
              Changing these choices affects this preview only. The JSON export above always
              contains your full on-device copy.
            </Text>

            <Text style={styles.fieldLabel}>Time range</Text>
            <View
              style={styles.rangeRow}
              accessibilityRole="tablist"
              testID="export-range-selector"
            >
              {RANGE_PRESETS.map((preset) => {
                const selected = selectedPreset === preset.key;
                return (
                  <Pressable
                    key={preset.key}
                    style={[styles.rangeButton, selected && styles.rangeButtonSelected]}
                    onPress={() => setSelectedPreset(preset.key)}
                    accessibilityRole="tab"
                    accessibilityState={{ selected }}
                    accessibilityLabel={preset.label}
                    testID={`export-range-${preset.key}`}
                  >
                    <Text
                      style={[styles.rangeText, selected && styles.rangeTextSelected]}
                      numberOfLines={1}
                    >
                      {preset.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Include</Text>
            <View style={styles.card}>
              {SELECTABLE_CATEGORIES.map((category) => {
                const checked = selectedCategories[category.key];
                const count = counts ? counts[category.key] : null;
                const countLabel = !checked
                  ? 'Not included'
                  : count === null
                    ? '—'
                    : `${count} ${count === 1 ? 'record' : 'records'}`;
                return (
                  <Pressable
                    key={category.key}
                    style={styles.categoryRow}
                    onPress={() => toggleCategory(category.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    accessibilityLabel={category.label}
                    accessibilityHint={
                      checked
                        ? 'Double tap to leave this out of the preview'
                        : 'Double tap to include this in the preview'
                    }
                    testID={`export-category-${category.key}`}
                  >
                    <View
                      style={[styles.checkboxIndicator, checked && styles.checkboxIndicatorChecked]}
                    >
                      {checked && <Text style={styles.checkboxCheck}>✓</Text>}
                    </View>
                    <Text style={styles.categoryLabel}>{category.label}</Text>
                    <Text
                      style={styles.categoryCount}
                      testID={`export-count-${category.key}`}
                    >
                      {countLabel}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {!storesHydrated ? (
              <View style={styles.previewLoading} testID="export-preview-loading">
                <ActivityIndicator color={colorSystem.base.midnightBlue} />
                <Text style={styles.previewLoadingText} accessibilityLiveRegion="polite">
                  Checking what&apos;s stored on this device…
                </Text>
              </View>
            ) : (
              preview && (
                <View style={styles.previewResult} testID="export-preview-result">
                  <Text
                    style={styles.previewTotal}
                    accessibilityLiveRegion="polite"
                    testID="export-preview-total"
                  >
                    {totalCount} {totalCount === 1 ? 'record' : 'records'} in this selection
                  </Text>
                  <Text style={styles.previewWindow} testID="export-preview-window">
                    {preview.meta.dataRangeStart === null || preview.meta.dataRangeEnd === null
                      ? 'No records in this range.'
                      : `Covering ${formatDay(preview.meta.dataRangeStart)} to ${formatDay(
                          preview.meta.dataRangeEnd,
                        )}.`}
                  </Text>

                  {/*
                    Disclaimer + omissions are surfaced VERBATIM, not summarised.
                    A category reading 0 because nothing of that kind is recorded
                    in this version must not read as "you have no data" — that is
                    what the omissions list is for.
                  */}
                  <Text style={styles.previewDisclaimer} testID="export-preview-disclaimer">
                    {preview.meta.disclaimer}
                  </Text>

                  <Text style={styles.fieldLabel}>Not recorded by Being</Text>
                  <View testID="export-preview-omissions">
                    {preview.meta.omissions.map((omission) => (
                      <View key={omission} style={styles.bulletRow}>
                        <Text style={styles.bulletDot}>•</Text>
                        <Text style={styles.bulletText}>{omission}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )
            )}
          </View>
        )}
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
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  lead: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginBottom: spacing[24],
  },
  section: {
    marginBottom: spacing[24],
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
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
    color: semantic.text.secondary,
    marginRight: spacing[8],
  },
  bulletText: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
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
    color: semantic.text.secondary,
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
  // FEAT-270 — scoping + count preview
  previewSection: {
    marginTop: spacing[32],
    paddingTop: spacing[24],
    borderTopWidth: 1,
    borderTopColor: semantic.border.default,
  },
  previewLead: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[8],
  },
  previewCaveat: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  fieldLabel: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[8],
  },
  rangeRow: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.small,
    padding: spacing[4],
    marginBottom: spacing[16],
  },
  rangeButton: {
    flex: 1,
    // Raised from the WellnessScreeningTrends source idiom's ~34px: TOUCH_TARGETS
    // .minimum is the WCAG 2.5.5 floor and a new control must not ship under it.
    minHeight: TOUCH_TARGETS.minimum,
    paddingHorizontal: spacing[8],
    borderRadius: borderRadius.small,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rangeButtonSelected: {
    backgroundColor: colorSystem.base.white,
  },
  rangeText: {
    fontSize: typography.caption.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.muted,
  },
  rangeTextSelected: {
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TOUCH_TARGETS.minimum,
    paddingVertical: spacing[8],
  },
  checkboxIndicator: {
    width: spacing[24],
    height: spacing[24],
    borderRadius: borderRadius.small,
    borderWidth: 2,
    borderColor: semantic.border.strong,
    marginRight: spacing[12],
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colorSystem.base.white,
  },
  checkboxIndicatorChecked: {
    borderColor: colorSystem.base.midnightBlue,
  },
  checkboxCheck: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.bold,
    color: colorSystem.base.midnightBlue,
  },
  categoryLabel: {
    flex: 1,
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.primary,
  },
  categoryCount: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    marginLeft: spacing[12],
  },
  previewLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[16],
  },
  previewLoadingText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    marginLeft: spacing[12],
  },
  previewResult: {
    marginTop: spacing[16],
  },
  previewTotal: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[4],
  },
  previewWindow: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
  previewDisclaimer: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[16],
  },
});

export default ExportDataScreen;
