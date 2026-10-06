/**
 * MAINT-712 — equivalence pins for every live site that still compares a score
 * (or Q9) against a crisis threshold outside canonical `detectCrisis()`.
 *
 * These sites are allowlisted by the literal-threshold guard in
 * `crisis-thresholds.test.ts`. An allowlist entry is only safe while the site
 * agrees with the canonical classifier, so each one is pinned here against
 * `detectCrisis() !== null`, its `severityLevel`, or `isInterventionTier()` over
 * the WHOLE input space: all 100 reachable PHQ-9 (total, Q9) pairs and every
 * GAD-7 total 0..21.
 *
 * These pin CURRENT behaviour. Where a site deliberately does not mirror
 * detectCrisis (the inline Q9 trigger ignores score-only tiers, which
 * completeAssessment handles), the pin states that relationship rather than a
 * "corrected" mapping.
 *
 * Private helpers are driven through public surfaces only: the store's
 * `answerQuestion` action with `handleCrisisDetection` replaced by a spy, the
 * exported `ClinicalScoringService`, and guidanceGate's exported
 * `decideGuidanceAccess`. No export was added for these tests.
 */
import { jest } from '@jest/globals';

jest.mock('@/core/services/supabase/SupabaseService', () => {
  const fn = jest.fn();
  return { __esModule: true, default: { trackCrisisDetection: fn }, supabaseService: { trackCrisisDetection: fn } };
});
jest.mock('react-native', () => ({ Alert: { alert: jest.fn() }, Linking: { openURL: jest.fn() } }));
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-secure-store');
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async () => ({ success: true })),
    retrieveWellnessBlob: jest.fn(async () => null),
    deleteWellnessBlob: jest.fn(async () => undefined),
  },
}));

import { ClinicalScoringService, useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { decideGuidanceAccess } from '@/features/guidance/services/guidanceGate';
import { detectCrisis, isInterventionTier } from '@/features/crisis/types/safety';
import type {
  AssessmentAnswer,
  AssessmentResponse,
  CrisisDetection,
  GAD7Result,
  PHQ9Result,
} from '@/features/assessment/types';

// ---------------------------------------------------------------------------
// Input space
// ---------------------------------------------------------------------------

/** Q1..Q8 greedily absorb `total - q9`; Q9 carries `q9`. */
function phq9Answers(total: number, q9: number): AssessmentAnswer[] {
  const answers: AssessmentAnswer[] = [];
  let remaining = total - q9;
  for (let i = 1; i <= 8; i++) {
    const response = Math.min(3, remaining) as AssessmentResponse;
    answers.push({ questionId: `phq9_${i}`, response, timestamp: Date.now() });
    remaining -= response;
  }
  answers.push({ questionId: 'phq9_9', response: q9 as AssessmentResponse, timestamp: Date.now() });
  return answers;
}

function gad7Answers(total: number): AssessmentAnswer[] {
  const answers: AssessmentAnswer[] = [];
  let remaining = total;
  for (let i = 1; i <= 7; i++) {
    const response = Math.min(3, remaining) as AssessmentResponse;
    answers.push({ questionId: `gad7_${i}`, response, timestamp: Date.now() });
    remaining -= response;
  }
  return answers;
}

/**
 * Canonical-side fixtures. detectCrisis reads only totalScore, suicidalIdeation,
 * completedAt and answers; severity/isCrisis are filled with inert values so no
 * site under test can leak into the reference.
 */
const phqRef = (total: number, q9: number): PHQ9Result => ({
  totalScore: total,
  severity: 'minimal',
  isCrisis: false,
  suicidalIdeation: q9 > 0,
  completedAt: 1,
  answers: phq9Answers(total, q9),
});

const gadRef = (total: number): GAD7Result => ({
  totalScore: total,
  severity: 'minimal',
  isCrisis: false,
  completedAt: 1,
  answers: gad7Answers(total),
});

/** Every (total, Q9) pair a real PHQ-9 can produce: Q9 in 0..3, Q1..Q8 in 0..24. */
const PHQ9_PAIRS: Array<[number, number]> = [];
for (let q9 = 0; q9 <= 3; q9++) {
  for (let rest = 0; rest <= 24; rest++) PHQ9_PAIRS.push([rest + q9, q9]);
}
const GAD7_TOTALS = Array.from({ length: 22 }, (_, i) => i);

const canonicalPhq = (total: number, q9: number) => detectCrisis(phqRef(total, q9), 'u');
const canonicalGad = (total: number) => detectCrisis(gadRef(total), 'u');

describe('MAINT-712 — input space', () => {
  it('covers all 100 reachable PHQ-9 (total, Q9) pairs and 22 GAD-7 totals', () => {
    expect(PHQ9_PAIRS).toHaveLength(100);
    expect(new Set(PHQ9_PAIRS.map(p => p.join(','))).size).toBe(100);
    for (const [total, q9] of PHQ9_PAIRS) {
      expect(phq9Answers(total, q9).reduce((s, a) => s + a.response, 0)).toBe(total);
    }
    expect(GAD7_TOTALS).toHaveLength(22);
  });

  it('the canonical side is not constant (both outcomes occur on each axis)', () => {
    const phq = PHQ9_PAIRS.map(([t, q]) => canonicalPhq(t, q) !== null);
    const gad = GAD7_TOTALS.map(t => canonicalGad(t) !== null);
    expect(new Set(phq).size).toBe(2);
    expect(new Set(gad).size).toBe(2);
  });
});

describe('MAINT-712 — ClinicalScoringService.isCrisis ≡ detectCrisis() !== null', () => {
  it.each(PHQ9_PAIRS)('PHQ-9 total=%i Q9=%i', (total, q9) => {
    const scored = ClinicalScoringService.calculatePHQ9Score(phq9Answers(total, q9));
    expect(scored.totalScore).toBe(total);
    expect(scored.suicidalIdeation).toBe(q9 > 0);
    expect(scored.isCrisis).toBe(canonicalPhq(total, q9) !== null);
  });

  it.each(GAD7_TOTALS)('GAD-7 total=%i', total => {
    const scored = ClinicalScoringService.calculateGAD7Score(gad7Answers(total));
    expect(scored.totalScore).toBe(total);
    expect(scored.isCrisis).toBe(canonicalGad(total) !== null);
  });
});

describe('MAINT-712 — assessmentStore inline Q9 path (answerQuestion)', () => {
  // The inline trigger, inlineQ9SeverityLevel and crisisSeverityLevel are all
  // private to the store; answerQuestion is their only public surface.
  let handled: CrisisDetection[];

  const startPhq9 = async () => {
    useAssessmentStore.getState().resetAssessment();
    await useAssessmentStore.getState().startAssessment('phq9');
    handled = [];
    useAssessmentStore.setState({
      autoSaveEnabled: false,
      handleCrisisDetection: jest.fn(async (d: CrisisDetection) => {
        handled.push(d);
      }),
    } as never);
  };

  const answerAll = async (answers: AssessmentAnswer[]) => {
    for (const a of answers) {
      await useAssessmentStore.getState().answerQuestion(a.questionId, a.response);
    }
  };

  it.each(PHQ9_PAIRS)(
    'PHQ-9 total=%i Q9=%i: fires iff detectCrisis leads with Q9, at detectCrisis severityLevel',
    async (total, q9) => {
      await startPhq9();
      await answerAll(phq9Answers(total, q9));

      const canonical = canonicalPhq(total, q9);
      const canonicalLedByQ9 = canonical?.primaryTrigger === 'phq9_suicidal_ideation';

      // Q9 > 0 ⇔ canonical leads with suicidal ideation, at every total.
      expect(canonicalLedByQ9).toBe(q9 > 0);
      expect(handled.length).toBe(canonicalLedByQ9 ? 1 : 0);
      if (canonicalLedByQ9) {
        expect(handled[0]!.primaryTrigger).toBe('phq9_suicidal_ideation');
        expect(handled[0]!.severityLevel).toBe(canonical!.severityLevel);
        expect(isInterventionTier(handled[0]!)).toBe(true);
      }
    },
  );

  it.each([[1], [2], [3]])(
    'Q9=%i answered FIRST (score not computable) falls back to detectCrisis severity for that partial total',
    async q9 => {
      await startPhq9();
      await answerAll([{ questionId: 'phq9_9', response: q9 as AssessmentResponse, timestamp: 0 }]);

      expect(handled).toHaveLength(1);
      expect(handled[0]!.severityLevel).toBe(canonicalPhq(q9, q9)!.severityLevel);
    },
  );
});

describe('MAINT-712 — guidanceGate suppress / gentle predicates', () => {
  const quietPhq = phqRef(0, 0);
  const quietGad = gadRef(0);

  it.each(PHQ9_PAIRS)('PHQ-9 axis total=%i Q9=%i', (total, q9) => {
    const canonical = canonicalPhq(total, q9);
    const level = decideGuidanceAccess(phqRef(total, q9), quietGad, null).level;

    expect(level === 'suppressed').toBe(canonical !== null && isInterventionTier(canonical));
    // Gentle on this axis is exactly detectCrisis's support tier (15-19, Q9=0).
    expect(level === 'gentle').toBe(canonical !== null && !isInterventionTier(canonical));
    expect(level === 'full').toBe(canonical === null);
  });

  it.each(GAD7_TOTALS)('GAD-7 axis total=%i', total => {
    const canonical = canonicalGad(total);
    const level = decideGuidanceAccess(quietPhq, gadRef(total), null).level;
    // GAD-7 gentle (10-14) has no detectCrisis tier; its reference is the
    // scored severity band.
    const band = ClinicalScoringService.calculateGAD7Score(gad7Answers(total)).severity;

    expect(level === 'suppressed').toBe(canonical !== null && isInterventionTier(canonical));
    expect(level === 'gentle').toBe(canonical === null && band === 'moderate');
  });
});
