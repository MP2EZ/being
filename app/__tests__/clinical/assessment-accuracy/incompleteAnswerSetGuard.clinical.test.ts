/**
 * DEBUG-550 — `completeAssessment` refuses to score an answer set that is not
 * exactly the expected question ids.
 *
 * WHAT THE ITEM SAID, AND WHAT IS ACTUALLY WRONG
 * ----------------------------------------------
 * The item was filed as "a short PHQ-9 scores as if complete, producing a
 * sub-threshold total". That is NOT reachable: `ClinicalScoringService`
 * already throws on a wrong COUNT (assessmentStore.ts:220 for PHQ-9, :250 for
 * GAD-7), so a short set has never produced a banded result.
 *
 * A count is not a completeness check, and that gap IS reachable. Nine answers
 * where one question id repeats and `phq9_9` is absent passes the count check,
 * sums, bands, and computes `suicidalIdeation` from `find('phq9_9') === undefined`
 * — i.e. reports NO self-harm risk because the self-harm question is missing.
 * That is a Q9 false negative from a set that looks complete, and it is the
 * opposite of what the item's body assumed about the self-harm path.
 *
 * `validateCurrentAnswers` (assessmentStore.ts:924) is NOT a drop-in fix and is
 * not used as one. It is a PRESENCE check with zero callers, and it is
 * incomparable to the shipped count check rather than stronger: ten answers
 * carrying one extra pass presence but fail count, while nine answers with a
 * duplicate pass count but fail presence. Substituting it would LOSE a case that
 * is caught today. The guard here is set EQUALITY — exactly the expected ids,
 * each exactly once — which is strictly stronger than both.
 *
 * WHY REFUSE RATHER THAN SCORE-AND-FLAG. A partial-flagged result still needs a
 * severity band to render, still enters `completedAssessments`, and flows from
 * there into history, trends and cloud backup. Every downstream reader would have
 * to learn the flag or silently treat the under-total as real, so the false
 * negative would move downstream and multiply.
 */

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import type { AssessmentAnswer } from '@/features/assessment/types';

const state = () => useAssessmentStore.getState();

/** Seed the store directly so we can author answer shapes the UI cannot produce. */
function seedSession(type: 'phq9' | 'gad7', answers: AssessmentAnswer[]): void {
  useAssessmentStore.setState({
    currentSession: {
      id: `debug550-${type}-session`,
      type,
      startedAt: new Date().toISOString(),
      progress: { currentQuestion: 0, totalQuestions: type === 'phq9' ? 9 : 7, isComplete: false, answers },
    },
    answers,
    currentResult: null,
    completionBlocked: null,
    error: null,
  } as unknown as Parameters<typeof useAssessmentStore.setState>[0]);
}

function answer(questionId: string, response: number): AssessmentAnswer {
  return { questionId, response, timestamp: new Date().toISOString() } as unknown as AssessmentAnswer;
}

describe('DEBUG-550 — completeAssessment refuses a malformed answer set', () => {
  beforeEach(() => {
    useAssessmentStore.setState({
      currentSession: null,
      answers: [],
      currentResult: null,
      completedAssessments: [],
      completionBlocked: null,
      error: null,
    } as unknown as Parameters<typeof useAssessmentStore.setState>[0]);
  });

  describe('the Q9 false negative — count satisfied, completeness not', () => {
    it('refuses nine PHQ-9 answers where one id repeats and phq9_9 is absent', async () => {
      // Exactly 9 entries, so the shipped count check passes. Only 8 distinct
      // ids, and the missing one is the self-harm question.
      const answers = [
        answer('phq9_1', 1), answer('phq9_2', 1), answer('phq9_3', 1),
        answer('phq9_4', 1), answer('phq9_5', 1), answer('phq9_6', 1),
        answer('phq9_7', 1), answer('phq9_8', 1),
        answer('phq9_8', 1), // duplicate; phq9_9 never answered
      ];
      seedSession('phq9', answers);

      await state().completeAssessment();

      // Against pre-fix code this set scores 9 and bands 'mild', with
      // suicidalIdeation false because phq9_9 is simply absent.
      expect(state().currentResult).toBeNull();
      expect(state().completedAssessments).toHaveLength(0);
      expect(state().completionBlocked?.reason).toBe('incomplete_answers');
      expect(state().completionBlocked?.missingQuestionIds).toEqual(['phq9_9']);
    });

    it('refuses the GAD-7 mirror', async () => {
      const answers = [
        answer('gad7_1', 2), answer('gad7_2', 2), answer('gad7_3', 2),
        answer('gad7_4', 2), answer('gad7_5', 2), answer('gad7_6', 2),
        answer('gad7_6', 2), // duplicate; gad7_7 never answered
      ];
      seedSession('gad7', answers);

      await state().completeAssessment();

      expect(state().currentResult).toBeNull();
      expect(state().completedAssessments).toHaveLength(0);
      expect(state().completionBlocked?.missingQuestionIds).toEqual(['gad7_7']);
    });
  });

  describe('the short set — already refused, now refused with a reason', () => {
    it('names every unanswered PHQ-9 question rather than failing opaquely', async () => {
      seedSession('phq9', [
        answer('phq9_1', 1), answer('phq9_2', 1), answer('phq9_3', 1),
        answer('phq9_4', 1), answer('phq9_5', 1),
      ]);

      await state().completeAssessment();

      expect(state().currentResult).toBeNull();
      // Pre-fix this was already null (the count check throws), but the throw was
      // swallowed into `error` and nothing named WHICH questions were missing —
      // so the flow had nothing to route the user back to. This half is the red.
      expect(state().completionBlocked?.missingQuestionIds).toEqual([
        'phq9_6', 'phq9_7', 'phq9_8', 'phq9_9',
      ]);
    });

    it('leaves the session intact so nothing the user entered is lost', async () => {
      seedSession('phq9', [answer('phq9_1', 3), answer('phq9_2', 3)]);

      await state().completeAssessment();

      expect(state().currentSession).not.toBeNull();
      expect(state().answers).toHaveLength(2);
    });
  });

  describe('a refusal does not strand a stale result', () => {
    it('nulls currentResult so a previous assessment cannot render as this one', async () => {
      // recoverSession does not clear currentResult, so a second assessment
      // completed-then-refused in one app session could otherwise render the
      // earlier banded result — and SyncCoordinator's null->non-null transition
      // would re-evaluate it for crisis.
      seedSession('phq9', [answer('phq9_1', 1)]);
      useAssessmentStore.setState({
        currentResult: { totalScore: 24, severity: 'severe' },
      } as unknown as Parameters<typeof useAssessmentStore.setState>[0]);

      await state().completeAssessment();

      expect(state().currentResult).toBeNull();
    });
  });

  describe('regression — a well-formed set is completely unaffected', () => {
    it('still scores and bands a severe PHQ-9 (the phq9-severe-completion invariant)', async () => {
      seedSession('phq9', [
        answer('phq9_1', 3), answer('phq9_2', 3), answer('phq9_3', 3),
        answer('phq9_4', 3), answer('phq9_5', 3), answer('phq9_6', 3),
        answer('phq9_7', 3), answer('phq9_8', 3), answer('phq9_9', 0),
      ]);

      await state().completeAssessment();

      expect(state().completionBlocked).toBeNull();
      expect(state().currentResult).not.toBeNull();
      expect(state().currentResult?.totalScore).toBe(24);
      expect(state().completedAssessments).toHaveLength(1);
    });

    it('still scores and bands a severe GAD-7 (the gad7-severe invariant)', async () => {
      seedSession('gad7', [
        answer('gad7_1', 3), answer('gad7_2', 3), answer('gad7_3', 3),
        answer('gad7_4', 3), answer('gad7_5', 3), answer('gad7_6', 3),
        answer('gad7_7', 3),
      ]);

      await state().completeAssessment();

      expect(state().completionBlocked).toBeNull();
      expect(state().currentResult?.totalScore).toBe(21);
    });

    it('a complete set with Q9 > 0 still reports self-harm risk', async () => {
      // The invariant q9-single-alert pins. Q9 is answered, so the guard is
      // invisible here — it must stay invisible.
      seedSession('phq9', [
        answer('phq9_1', 0), answer('phq9_2', 0), answer('phq9_3', 0),
        answer('phq9_4', 0), answer('phq9_5', 0), answer('phq9_6', 0),
        answer('phq9_7', 0), answer('phq9_8', 0), answer('phq9_9', 2),
      ]);

      await state().completeAssessment();

      expect(state().completionBlocked).toBeNull();
      expect(state().currentResult).not.toBeNull();
      expect((state().currentResult as { suicidalIdeation?: boolean })?.suicidalIdeation).toBe(true);
    });
  });
});
