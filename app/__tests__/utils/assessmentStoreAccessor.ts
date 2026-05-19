import { useAssessmentStore } from '../../src/features/assessment/stores/assessmentStore';

/**
 * Always-fresh accessor for the assessment store in tests.
 *
 * Background: several clinical test files reference a bare `store`
 * identifier for both action calls (`store.startAssessment(...)`) and state
 * reads (`store.currentResult`). Some files never declared the binding at
 * all (audit finding TEST-01 — comprehensive-scoring-validation.test.ts);
 * others declared `let store: ReturnType<typeof useAssessmentStore>` but
 * never assigned it, leaving the reference `undefined` at test time. Both
 * patterns produce the same symptom: state reads return `undefined`,
 * assertions accidentally pass because `undefined.toEqual(...)` etc. silently
 * matches `Received: undefined`, and the suite presents as green while
 * actually verifying nothing.
 *
 * This Proxy fixes both patterns. Every property read delegates to
 * `useAssessmentStore.getState()` at the moment of access, so state reads
 * are fresh and action methods are correctly bound to the current state.
 *
 * Use this in place of a `let store: ...` declaration in clinical tests:
 *
 *   import { store } from '../utils/assessmentStoreAccessor';
 *
 *   // works for actions:
 *   await store.startAssessment('phq9', 'test');
 *   // and for state reads:
 *   expect(store.currentResult).toBeTruthy();
 */
type AssessmentStoreState = ReturnType<typeof useAssessmentStore.getState>;

export const store = new Proxy({} as AssessmentStoreState, {
  get(_target, prop: string | symbol) {
    const state = useAssessmentStore.getState() as Record<
      string | symbol,
      unknown
    >;
    const value = state[prop];
    // Bind methods to the current state so `this` resolves correctly.
    // Zustand actions don't depend on `this` today (they use closures), but
    // binding makes the Proxy safe against future store implementations.
    return typeof value === 'function' ? value.bind(state) : value;
  },
});
