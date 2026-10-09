/**
 * DEBUG-654's measured title set — the PracticeTimer header titles its AX5 co-visibility
 * capture was taken with (Release build, accessibility-extra-extra-extra-large, 402x874 and
 * 390x844, `maestro hierarchy` before Begin). The arithmetic budget in
 * `src/features/learn/practices/__tests__/PracticeTimerScreen.axLayout.test.tsx` holds only
 * for a header no taller than one of these produces.
 *
 * DEBUG-679 AC3 pins every title that can render on a circle-rendering PracticeTimer against
 * this set (`__tests__/safety/practiceTimerCircleTitles.test.ts`). Add a title here only after
 * re-running that capture with it, on both viewports. A word-suffix of a measured title is
 * not evidence: iOS line breaking avoids orphans, so a shorter title can wrap differently.
 */
export const DEBUG_654_MEASURED_TITLES: readonly string[] = Object.freeze([
  '3-Minute Breathing Space',
  // DEBUG-679 fallback, re-measured 2026-10-06 (Release, iOS 18.6, AX-XXXL, before Begin):
  // 2-line header; scroll viewport 502pt on 402x874 and 487pt on 390x844, against DEBUG-654's
  // 409 / 394, so the header is shorter and every arithmetic row holds. A fully visible Begin
  // toggle (185 / 253pt) co-rendered with the whole 120pt disc on both viewports.
  'Breathing Space',
]);
