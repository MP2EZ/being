/**
 * EXPORT MY DATA SCREEN (FEAT-267 + FEAT-270 + FEAT-806)
 *
 * Data portability (CCPA / TDPSA / VCDPA / CPA / CTDPA / GDPR Art. 20). Three
 * surfaces share this one screen and one Privacy & Data entry point:
 *
 *   - JSON export (FEAT-267, ALWAYS ON, never flag-gated): gathers the on-device
 *     wellness data, writes it to a JSON file, opens the system share sheet.
 *   - PDF export (FEAT-806, ALWAYS ON, no flag — founder decision 2026-10-18):
 *     renders FEAT-272's `buildExportHtml` over the full-copy payload with
 *     expo-print and shares the PDF through the SAME `handleExport` and the same
 *     single share call. A readable summary, not the complete copy; the document
 *     says so itself. expo-print is loaded with `await import` inside the handler
 *     only, so the module stays off the eager graph of every screen that imports
 *     this one.
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
 * CRISIS-PATH SAFETY: pushed route INSIDE ProfileStackNavigator — inherits
 * `RootCrisisButton` (testID `crisis-button-root`) from CleanRootNavigator. This
 * used to say "the sibling CollapsibleCrisisButton overlay"; that was wrong, and
 * wrong in a way that mattered — MAINT-290 removed the per-navigator mount as
 * redundant (see ProfileStackNavigator's header), so a probe written from the old
 * sentence would assert a testID that is not mounted, go vacuously red, and report
 * an occlusion it never tested. The gather/serialize work runs async so it never
 * blocks the overlay's touch handler.
 *
 * ⚠️ THAT INHERITANCE DOES NOT HOLD WHILE THE SHARE SHEET IS UP — MEASURED ON
 * SIMULATOR, DEBUG-577 (2026-09-07; Release build, iPhone SE 3rd gen / iOS 18.6,
 * 375x667). With `Sharing.shareAsync`'s UIActivityViewController up, `maestro
 * hierarchy` carried ZERO app-owned nodes — not a covered FAB but an absent app
 * tree, leaving only a full-bleed `PopoverDismissRegion` and the sheet's own
 * out-of-process `ShareSheet.RemoteContainerView`. A matched-pair hit test at one
 * screen point inside the FAB reached `CrisisResources` with the sheet down and
 * did not with it up. So the 988 affordance is unreachable for the sheet's
 * duration, and the duration is bounded only by the user dismissing it.
 * `ExportData` is NOT in `RootCrisisButton.SUPPRESSED_ROUTES`, and the JSON export
 * path above is always on, so this is the most reachable instance of the shape.
 * Scope: iOS only. Android's share sheet is a different presenter and is
 * unmeasured — there is no Android e2e harness. The ruling and what it does not
 * prove live in the guard's PRESENTER_ALLOWLIST; this header must never
 * out-claim that entry. `buildExportPayload` is
 * synchronous but bounded by on-device record counts, and runs in a `useMemo`
 * keyed on the selection, so it re-runs only on an explicit user toggle.
 *
 * PRESENTING GUARD (FEAT-806). The window opens only on a deliberate tap, but a
 * PDF render takes seconds, and a render that settles after the user left would
 * raise the sheet — and blank the 988 affordance — over whatever screen they went
 * to, including CrisisResources itself. So, after a short yield that lets input
 * queued during the render reach JS first, the share call runs only if this
 * screen still has navigation focus AND the app is `active`, read with no await
 * between the read and the call. Otherwise nothing is presented: the file is
 * deleted and an inline message says why. The JSON path takes the same guard.
 *
 * WHAT IT DOES NOT CLOSE (crisis review, FEAT-806). It holds once the leaving
 * navigation has been processed in JS before the read. Residual windows: a press
 * still held at the moment the guard passes (the sheet then cancels that touch,
 * and a presented sheet cannot be withdrawn from JS); `AppState` lagging native
 * state; a swipe-back still in progress (reads focused, presents over ExportData,
 * the route the user chose); and overlays that do not move navigation focus.
 * Separately, on iOS expo-print draws the PDF on the MAIN thread
 * (ExpoPrintModule.swift `.runOnQueue(.main)`), so for the length of the draw a
 * crisis tap is not lost but the crisis screen cannot paint. `crisisTapTrace` starts
 * in JS `onPress` and cannot see that delay. FOUNDER-ACCEPTED RESIDUAL (2026-10-23),
 * overriding the crisis ruling's 1 s condition: measured on the simulator (SE 3rd gen,
 * iOS 18.6, loaded host) the render is 1.3 s for an empty export and 1.9-2.6 s for the
 * retention-bounded worst case after the 90-day window and the 50-row cap, and a
 * crisis tap early in a 90-day render painted ~1.7 s after finger-down. An iPhone may
 * be slower. Not reducible below ~1.3 s with expo-print; a non-blocking renderer is
 * the only way to close it.
 */

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  AppState,
  AccessibilityInfo,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
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
import { exportFileName } from '@/core/services/privacy/exportArtifactSweeper';
import { logError, LogCategory } from '@/core/services/logging';
import { isFeatureEnabled } from '@/core/services/featureFlags';
import { buildExportPayload } from '@/features/data-export/services/exportService';
import { buildExportHtml, PDF_RANGE_PRESET } from '@/features/data-export/services/exportPdfDocument';
import {
  writeLastExportRecord,
  lastExportPreparedCopy,
  type LastExportScope,
} from '@/features/data-export/services/lastExportRecord';
import { useLastExportRecord } from '@/features/data-export/hooks/useLastExportRecord';
import type {
  ExportDataCategory,
  ExportRangePreset,
} from '@/features/data-export/types';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { CRISIS_BUTTON_EXCLUSION_RECT } from '@/features/crisis/constants/crisisButtonGeometry';
import { useCrisisExclusionAssertion } from '@/core/hooks/useCrisisExclusionAssertion';

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

type ExportFormat = 'json' | 'pdf';

const SHARE_TYPES: Record<ExportFormat, { mimeType: string; UTI: string }> = {
  json: { mimeType: 'application/json', UTI: 'public.json' },
  pdf: { mimeType: 'application/pdf', UTI: 'com.adobe.pdf' },
};

/**
 * Yield after the export is prepared and before the presenting guard is read, so a
 * crisis tap queued while the native side was busy (iOS draws the PDF on the main
 * thread) is dispatched — and its navigation processed — before the guard decides.
 */
const PRE_PRESENT_INPUT_YIELD_MS = 100;

/**
 * Every category over the last 90 days — never the preview's selection. Bounded because
 * expo-print draws on the iOS main thread: an all-time worst case held the crisis screen
 * off for seconds (FEAT-806 AC9(e)). JSON stays the all-time copy.
 */
const PDF_SCOPE = {
  categories: SELECTABLE_CATEGORIES.map((c) => c.key),
  range: { preset: PDF_RANGE_PRESET },
};

/**
 * FEAT-807: the scope each format actually exports, for the last-export record. Never the
 * preview selection — that shapes the count preview only, and recording it would describe
 * a file the user never got.
 */
const SCOPE_BY_FORMAT: Record<ExportFormat, LastExportScope> = {
  json: { preset: 'all', categories: SELECTABLE_CATEGORIES.map((c) => c.key) },
  pdf: { preset: PDF_SCOPE.range.preset, categories: PDF_SCOPE.categories },
};

/** Shown and announced before the render. Promises nothing about the crisis button. */
export const PDF_PREPARING_COPY = 'Preparing your PDF. This can take a few seconds.';

/**
 * Two frames, so the preparing copy is committed and mounted before expo-print takes
 * the main queue — otherwise the copy would only appear once the draw is over.
 */
const nextFrame = (): Promise<void> =>
  new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

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
  // DEBUG-653: __DEV__-only crisis-FAB exclusion check (DEBUG-643); undefined in Release.
  const exportButtonExclusionCheck = useCrisisExclusionAssertion('export-data-button', 'scrolls');
  const pdfButtonExclusionCheck = useCrisisExclusionAssertion('export-pdf-button', 'scrolls');
  const navigation = useNavigation();
  const [inFlight, setInFlight] = useState<ExportFormat | null>(null);
  const isExporting = inFlight !== null;
  // State disables the buttons on the NEXT render; two taps in one frame would both
  // enter handleExport and race two share sheets. The ref latches synchronously.
  const exportLatch = useRef(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastExport, setLastExport] = useLastExportRecord();

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

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (exportLatch.current) return;
    exportLatch.current = true;
    setInFlight(format);
    setErrorMessage(null);
    // Declared outside the try so `finally` can remove them on every path (DEBUG-645).
    // `rendered` is expo-print's own output in `<cache>/Print/`, live until it is moved.
    let file: File | null = null;
    let rendered: File | null = null;
    try {
      if (format === 'pdf') {
        const Print = await import('expo-print');
        // accessibilityLiveRegion is Android-only; iOS needs the explicit announcement.
        AccessibilityInfo.announceForAccessibility(PDF_PREPARING_COPY);
        await nextFrame();
        const html = buildExportHtml(buildExportPayload(PDF_SCOPE));
        const { uri } = await Print.printToFileAsync({ html });
        rendered = new File(uri);
        file = new File(Paths.cache, exportFileName(new Date(), 'pdf'));
        await rendered.move(file, { overwrite: true });
      } else {
        const json = serializeExport(await gatherExportData());
        file = new File(Paths.cache, exportFileName());
        file.create({ overwrite: true });
        file.write(json);
      }

      if (!(await Sharing.isAvailableAsync())) {
        setErrorMessage('Sharing is not available on this device.');
        return;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, PRE_PRESENT_INPUT_YIELD_MS));
      // Presenting guard — see the header. Read here, after every await, never earlier,
      // and nothing may be awaited between this read and the share call.
      if (!navigation.isFocused() || AppState.currentState !== 'active') {
        setErrorMessage(
          'Your export was not opened because Being was no longer on this screen. Nothing was saved. Please try again.',
        );
        return;
      }
      await Sharing.shareAsync(file.uri, {
        ...SHARE_TYPES[format],
        dialogTitle: 'Export your Being data',
      });
      // FEAT-807: "prepared", not "delivered" — shareAsync also resolves on cancel. Not
      // awaited: the record must never delay `finally`'s plaintext cleanup (DEBUG-645).
      void writeLastExportRecord(format, SCOPE_BY_FORMAT[format]).then((record) => {
        if (record) setLastExport(record);
      });
    } catch (error) {
      logError(
        LogCategory.SYSTEM,
        '[ExportData] export failed',
        error instanceof Error ? error : new Error(String(error)),
      );
      setErrorMessage('Could not prepare your export. Please try again.');
    } finally {
      // DEBUG-645: the file is the full export in plaintext and must not outlive
      // the share. `shareAsync` RESOLVES on user cancel on both platforms, so this
      // one `finally` covers a completed share, a cancelled one, the
      // sharing-unavailable early return and every thrown error alike. It runs
      // strictly after the sheet has closed, so it does not reshape the DEBUG-577
      // window. `delete()` throws when the file is already gone; that is
      // swallowed here, never surfaced as an export error, never left to become an
      // unhandled rejection, and never raised as an Alert (DEBUG-533).
      // After a successful move `rendered` and `file` name the same path, so the
      // second check finds nothing; after a failed one it removes the render.
      for (const leftover of [file, rendered]) {
        try {
          if (leftover?.exists) leftover.delete();
        } catch (cleanupError) {
          logError(
            LogCategory.SYSTEM,
            '[ExportData] export file cleanup failed',
            cleanupError instanceof Error ? cleanupError : new Error(String(cleanupError)),
          );
        }
      }
      setInFlight(null);
      exportLatch.current = false;
    }
  }, [navigation, setLastExport]);

  const handleJsonExport = useCallback(() => handleExport('json'), [handleExport]);
  const handlePdfExport = useCallback(() => handleExport('pdf'), [handleExport]);
  // The PDF reads the stores synchronously, so before they rehydrate it would be an
  // empty summary presented as the user's data. JSON gathers from storage itself.
  const pdfDisabled = isExporting || !storesHydrated;

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
            is not included — the meaningful copies are these on-device exports. Neither file is
            encrypted or password-protected; keep it somewhere private.
          </Text>
        </View>

        {lastExport && (
          <Text style={styles.formatCaption} testID="export-last-prepared">
            {lastExportPreparedCopy(lastExport.preparedAt)}
          </Text>
        )}

        {errorMessage && (
          <Text style={styles.errorText} accessibilityLiveRegion="assertive" testID="export-error">
            {errorMessage}
          </Text>
        )}

        <Text style={styles.formatCaption}>
          JSON is the complete copy of your wellness data on this device, readable by other
          apps. PDF is a readable summary of the last 90 days that leaves some data out.
        </Text>

        <Pressable
          style={[styles.exportButton, isExporting && styles.exportButtonDisabled]}
          onLayout={exportButtonExclusionCheck}
          onPress={handleJsonExport}
          disabled={isExporting}
          accessibilityRole="button"
          accessibilityLabel="Export as JSON, complete copy"
          accessibilityHint="Prepares a JSON file with all of your on-device data and opens the share sheet"
          accessibilityState={{ disabled: isExporting, busy: inFlight === 'json' }}
          testID="export-data-button"
        >
          {inFlight === 'json' ? (
            <ActivityIndicator color={colorSystem.base.white} />
          ) : (
            <Text style={styles.exportButtonText}>Export as JSON</Text>
          )}
        </Pressable>

        <Pressable
          style={[styles.pdfExportButton, pdfDisabled && styles.exportButtonDisabled]}
          onLayout={pdfButtonExclusionCheck}
          onPress={handlePdfExport}
          disabled={pdfDisabled}
          accessibilityRole="button"
          accessibilityLabel="Export as PDF, readable summary"
          accessibilityHint="Prepares a readable PDF summary of the last 90 days of your on-device data and opens the share sheet"
          accessibilityState={{ disabled: pdfDisabled, busy: inFlight === 'pdf' }}
          testID="export-pdf-button"
        >
          {inFlight === 'pdf' ? (
            <ActivityIndicator color={colorSystem.base.white} />
          ) : (
            <Text style={styles.exportButtonText}>Export as PDF</Text>
          )}
        </Pressable>

        {inFlight === 'pdf' && (
          <Text style={styles.busyText} accessibilityLiveRegion="polite" testID="export-pdf-busy">
            {PDF_PREPARING_COPY}
          </Text>
        )}

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
  busyText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginTop: spacing[8],
  },
  formatCaption: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.regular,
    color: semantic.text.secondary,
    lineHeight: 20,
    marginBottom: spacing[16],
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
    // DEBUG-653: 16, not 32 — inside the FAB margins 32 leaves a 119pt label box, too tight.
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    // DEBUG-653: measured [24,529][351,581] vs crisis-button-root [331,523][375,567] (375x667,
    // iOS 18.6). Margin, never padding: padding moves only the label, not the frame under the
    // FAB. marginLeft keeps it centred; exportButtonDisabled must never set a margin or width.
    marginLeft: CRISIS_BUTTON_EXCLUSION_RECT.left,
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
  },
  pdfExportButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 52,
    marginTop: spacing[12],
    // DEBUG-653 shape (FEAT-806): with the preview dark this is the LAST control at max scroll,
    // where the FAB would win an overlapping tap. Margin, never padding; declared last.
    marginLeft: CRISIS_BUTTON_EXCLUSION_RECT.left,
    marginRight: CRISIS_BUTTON_EXCLUSION_RECT.left,
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
