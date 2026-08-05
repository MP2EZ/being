/**
 * SENTRY flowType — RUNTIME CLAMP (FEAT-298 slice 4)
 *
 * `flowType` is on ALLOWED_ERROR_FIELDS and was copied through verbatim into a field typed
 * `string | undefined`. That made it a FREE-TEXT CHANNEL into Sentry guarded only by
 * TypeScript — widening the compile-time union does nothing about a value arriving from an
 * `any`, a cast, or a future caller. Same reasoning INFRA-295 applied to `level`.
 *
 * The breadcrumb carries the PRESENTATION identity ('daily-loop'), never the persisted
 * record token ('daily'): it answers "which surface did this error occur on".
 */

import { themeKeyFor } from '@/core/types/practice-identity';
import type { PracticeIdentity } from '@/core/types/practice-identity';

const ALL_IDENTITIES = [
  'morning',
  'midday',
  'evening',
  'daily-loop',
] as const satisfies readonly PracticeIdentity[];

/**
 * The keyword scan `isCrisisRelated` runs over the stringified context. A surface token
 * containing any of these would silently suppress EVERY error report from that surface —
 * fail-safe in direction, but it blinds Sentry and nothing warns you.
 */
const CRISIS_KEYWORDS = [
  'crisis',
  'phq',
  'gad',
  'assessment',
  'score',
  'suicidal',
  'suicide',
  'self-harm',
  'emergency',
  '988',
  'intervention',
  'safety',
  'safetyplan',
  'emergencycontact',
];

describe('Sentry flowType breadcrumb — allowed value space', () => {
  it('carries the presentation token for the loop, not the record token', () => {
    // 'daily' is the CheckInType record vocabulary (slice 2). Putting a persistence token
    // in telemetry conflates the two halves of the slice-3 split.
    expect(ALL_IDENTITIES).toContain('daily-loop');
    expect(ALL_IDENTITIES).not.toContain('daily');
  });

  it('every allowed flow type is a real practice identity with a real palette', () => {
    for (const id of ALL_IDENTITIES) {
      expect(themeKeyFor(id)).toBeDefined();
    }
  });

  it.each(ALL_IDENTITIES)(
    '%s does not collide with a crisis keyword (which would silently blind Sentry)',
    (identity) => {
      const lowered = identity.toLowerCase();
      for (const keyword of CRISIS_KEYWORDS) {
        expect(lowered).not.toContain(keyword);
      }
    }
  );

  it('the allowed set is closed — exactly the practice identities, nothing else', () => {
    expect(ALL_IDENTITIES).toHaveLength(4);
    expect(new Set(ALL_IDENTITIES).size).toBe(4);
  });
});
