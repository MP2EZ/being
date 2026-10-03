/**
 * Art. 9 wellness-write predicate stays off the crisis path (FEAT-664, crisis ruling 2026-09-26).
 *
 * `decideWellnessWrite` gates WRITES of wellness data. The founder-settled rule
 * from FEAT-318 is "gate the write, never the capture": a user who refused Art. 9
 * consent must still be asked Q9, still get `handleCrisisDetection`, still have
 * the journal's `scanOnSave` run, and still reach 988. An entry-gate kills every
 * one of those; a write-gate kills none. So the predicate must never be read by
 * crisis-owned code, by the crisis-telemetry sink, by a render ancestor of the
 * crisis subtree, or by a screen where the user answers or writes — a render-time
 * gate there would block capture.
 *
 * Deliberately excluded: `assessmentStore.ts` (A2 gates `EncryptedAssessmentStorage.save`
 * there) and `journalEntryStore.ts` (B gates `saveEntry`). Those slices carry their
 * own behavioural pins (Q9 still alerts and still reaches `trackCrisisDetection`
 * with the predicate forced to `blocked`), which is what catches transitive reach.
 * A new consumer in a file listed below needs a fresh `crisis` ruling, not an
 * edit to this list.
 *
 * Matches the BARE identifier over comment-stripped source, not an import-shaped
 * pattern: SupabaseService already imports `useConsentStore`, so an import-only
 * regex would miss a store-member or namespace read (DEBUG-390).
 */

import { existsSync, readFileSync, readdirSync, statSync } from 'fs';
import { join, relative } from 'path';

const APP = join(__dirname, '../..');
const SRC = join(APP, 'src');
const CONSENT_STORE = join(SRC, 'core/stores/consentStore.ts');

/** Every non-test source file under a directory, recursively. */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      if (name === '__tests__' || name === '__mocks__') continue;
      out.push(...sourceFiles(full));
      continue;
    }
    if (/\.tsx?$/.test(name) && !/\.(test|spec)\.tsx?$/.test(name)) out.push(full);
  }
  return out;
}

/** Strip block and line comments before matching (DEBUG-390). */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
}

const stripped = (file: string): string => stripComments(readFileSync(file, 'utf8'));
const label = (file: string): string => relative(APP, file);

const PREDICATE = /\bdecideWellnessWrite\b/;

const CRISIS_FEATURE_FILES = sourceFiles(join(SRC, 'features/crisis'));
const NAVIGATION_FILES = sourceFiles(join(SRC, 'core/navigation'));

const NAMED_FILES = [
  // Crisis telemetry: CRISIS_ANALYTICS_QUEUE, trackCrisisDetection, flush and
  // ensureClient all live in SupabaseService; there is no separate queue module.
  'src/core/services/supabase/SupabaseService.ts',
  'src/features/journal/services/journalCrisisScan.ts',
  'App.tsx', // fires initializeCrisisTelemetry
  // Render ancestors of the crisis subtree (DEBUG-559 class).
  'src/core/analytics/PostHogProvider.tsx',
  // Screens where the user answers or writes.
  'src/features/journal/screens/VoiceReflectionScreen.tsx',
  'src/features/assessment/components/EnhancedAssessmentFlow.tsx',
  'src/features/assessment/components/EnhancedAssessmentQuestion.tsx',
  'src/features/assessment/components/AssessmentResults.tsx',
  // FEAT-667 (crisis ruling 2026-09-29): the daily loop's capture path, which hosts
  // SUPPORT_LINE, and the weekly-reflection composer. Slice C gates below them, at
  // SessionStorageService and stoicPracticeStore. WeeklyReflectionCard may read the
  // predicate as a display-only notice host and hands the composer a prop.
  'src/features/practices/dailyloop/DailyLoopNavigator.tsx',
  'src/features/practices/dailyloop/screens/DailyLoopStepScreen.tsx',
  'src/features/practices/dailyloop/screens/DailyLoopCompleteScreen.tsx',
  'src/features/practices/dailyloop/config/tenseMode.ts',
  'src/features/insights/components/WeeklyReflectionComposer.tsx',
  // FEAT-669 (crisis ruling 2026-10-03): DailyLoopDepthSelectScreen, DotCalendar and
  // PrincipleEngagementChart join WeeklyReflectionCard as display-only notice hosts.
  // These three may NOT read the predicate: WellnessScreeningTrends hosts the inline
  // 988 link and publishes SessionNoteComposer into the root slot; SessionNoteComposer
  // is a write surface on CrisisTextInput; InsightsScreen is a render ancestor of both.
  'src/features/insights/components/WellnessScreeningTrends.tsx',
  'src/features/insights/components/SessionNoteComposer.tsx',
  'src/features/insights/screens/InsightsScreen.tsx',
].map((file) => join(APP, file));

const GUARDED_FILES = [...CRISIS_FEATURE_FILES, ...NAVIGATION_FILES, ...NAMED_FILES];

describe('the scan is actually scanning', () => {
  it('walks the crisis feature and navigation directories', () => {
    expect(CRISIS_FEATURE_FILES.length).toBeGreaterThanOrEqual(17);
    expect(NAVIGATION_FILES.some((f) => f.endsWith('CleanRootNavigator.tsx'))).toBe(true);
  });

  it.each(NAMED_FILES.map((f) => [label(f), f]))('%s exists', (_label, file) => {
    expect(existsSync(file)).toBe(true);
  });

  it.each(GUARDED_FILES.map((f) => [label(f), f]))(
    '%s still has code after comment stripping',
    (_label, file) => {
      // `export`, not just `import`: leaf modules (textCrisisDetection, tabBarLayout) import nothing.
      expect(stripped(file)).toMatch(/\b(?:import|export)\b/);
    },
  );

  it('the matcher fires on the stripped source of the module that defines it', () => {
    expect(stripped(CONSENT_STORE)).toMatch(PREDICATE);
  });
});

describe('no crisis-path file reads the wellness-write predicate', () => {
  it.each(GUARDED_FILES.map((f) => [label(f), f]))('%s', (_label, file) => {
    expect(stripped(file)).not.toMatch(PREDICATE);
  });
});

describe('the legal-gate mirror has one owner', () => {
  // Hydration is fire-and-forget from loadConsent and must stay that way: if any
  // render path could await or subscribe to it, a hung Keychain read would hold
  // LoadingScreen with only Static988Button.
  const MIRROR_INTERNALS =
    /\b(?:hydrateLegalGateMirror|setLegalGateMirror|legalGateMirror|legalGateMirrorGeneration|legalGateMirrorWrittenThrough)\b/;

  it('the matcher fires on consentStore itself', () => {
    expect(stripped(CONSENT_STORE)).toMatch(MIRROR_INTERNALS);
  });

  it('no other file in app/src or App.tsx names them', () => {
    const files = [...sourceFiles(SRC), join(APP, 'App.tsx')];
    expect(files.length).toBeGreaterThan(100);
    const offenders = files
      .filter((f) => f !== CONSENT_STORE)
      .filter((f) => MIRROR_INTERNALS.test(stripped(f)))
      .map(label);
    expect(offenders).toEqual([]);
  });
});
