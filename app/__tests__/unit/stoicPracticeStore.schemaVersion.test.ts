/**
 * STOIC PRACTICE STORE — SCHEMA VERSION + FORWARD-ONLY MIGRATION (FEAT-298 slice 2)
 *
 * Slice 2 widens `CheckInType` additively (adds 'daily'; drops nothing) and introduces the
 * schema-version + migration mechanism the store never had. Before this, a persisted blob
 * carried no version and `loadFromSecureStore` spread array ELEMENTS untyped
 * (`parsed.checkInCompletions?.map((c: any) => ({ ...c, ... }))`), so legacy values flowed
 * into state while TypeScript believed the union was whatever it currently said.
 *
 * COMPLIANCE CONSTRAINTS PINNED HERE (compliance agent pass, FEAT-298 slice 2):
 *  - Migration MUST be forward-only and additive. Rewriting a stored 'midday' to 'daily'
 *    would fabricate a record of an action the user did not take — a data-accuracy
 *    violation under the state privacy regimes in docs/legal/regulatory-applicability.md,
 *    and it would corrupt a right-to-know/export response.
 *  - Migration MUST be idempotent, gated on the stored version — never on shape-sniffing.
 *  - A migration failure MUST NOT yield a partially-transformed object. That output flows
 *    into `set({ ...persistedState })` and any later `schedulePersist()` would overwrite
 *    the good on-disk blob with it. That is data loss, unlike the accepted swallow-on-write
 *    in `persistToSecureStore` (where in-memory state is already correct).
 *  - Unrecognised `type` values MUST pass through unchanged, never be filtered out.
 *
 * PLACEMENT: __tests__/unit/ so it is gated by `npm run test:unit` (matches the MAINT-300
 * rehydration precedent next door).
 */

import * as SecureStore from 'expo-secure-store';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { STOIC_PRACTICE_SCHEMA_VERSION } from '@/features/practices/stores/stoicPracticeStore';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

const mockGetItem = SecureStore.getItemAsync as jest.Mock;
const mockSetItem = SecureStore.setItemAsync as jest.Mock;

/** Minimal well-formed domainProgress — loadFromSecureStore reads it non-optionally. */
const domainProgress = {
  work: { practiceCount: 0, lastPracticeDate: null },
  relationships: { practiceCount: 0, lastPracticeDate: null },
  adversity: { practiceCount: 0, lastPracticeDate: null },
};

/** A pre-versioning (v0) blob carrying real legacy check-in records. */
const legacyBlob = (overrides: Record<string, unknown> = {}) =>
  JSON.stringify({
    practiceStartDate: null,
    totalPracticeDays: 12,
    currentStreak: 4,
    longestStreak: 9,
    virtueInstances: [],
    virtueChallenges: [],
    checkInCompletions: [
      { type: 'morning', date: '2026-07-01', completedAt: '2026-07-01T08:00:00.000Z' },
      { type: 'midday', date: '2026-07-01', completedAt: '2026-07-01T13:00:00.000Z' },
      { type: 'evening', date: '2026-07-01', completedAt: '2026-07-01T21:00:00.000Z' },
      { type: 'learn', date: '2026-07-02', completedAt: '2026-07-02T10:00:00.000Z' },
    ],
    principleEngagements: [
      {
        principle: 'dichotomy_of_control',
        flowType: 'midday',
        engagementType: 'applied',
        timestamp: '2026-07-01T13:05:00.000Z',
      },
    ],
    weeklyReflections: [],
    domainProgress,
    ...overrides,
  });

describe('StoicPracticeStore — schema version + forward-only migration (FEAT-298 slice 2)', () => {
  beforeEach(async () => {
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
    mockGetItem.mockResolvedValue(null);
  });

  describe('the version stamp exists at all', () => {
    it('exports a numeric current schema version', () => {
      expect(typeof STOIC_PRACTICE_SCHEMA_VERSION).toBe('number');
      expect(STOIC_PRACTICE_SCHEMA_VERSION).toBeGreaterThanOrEqual(1);
    });

    it('stamps the version into every persisted blob', async () => {
      await useStoicPracticeStore.getState().markCheckInComplete('morning');
      await useStoicPracticeStore.getState().persistState();

      expect(mockSetItem).toHaveBeenCalled();
      const written = JSON.parse(mockSetItem.mock.calls.at(-1)![1]);
      expect(written.version).toBe(STOIC_PRACTICE_SCHEMA_VERSION);
    });
  });

  describe('forward-only migration preserves legacy wellness records verbatim', () => {
    it('loads a pre-versioning blob without losing any check-in record', async () => {
      mockGetItem.mockResolvedValue(legacyBlob());

      await useStoicPracticeStore.getState().loadPersistedState();
      const { checkInCompletions } = useStoicPracticeStore.getState();

      expect(checkInCompletions).toHaveLength(4);
      expect(checkInCompletions.map(c => c.type)).toEqual([
        'morning',
        'midday',
        'evening',
        'learn',
      ]);
    });

    it('NEVER rewrites a legacy type to daily (fabricating an action the user did not take)', async () => {
      mockGetItem.mockResolvedValue(legacyBlob());

      await useStoicPracticeStore.getState().loadPersistedState();
      const { checkInCompletions, principleEngagements } = useStoicPracticeStore.getState();

      expect(checkInCompletions.map(c => c.type)).not.toContain('daily');
      expect(principleEngagements.map(p => p.flowType)).not.toContain('daily');
      // The midday engagement stays midday.
      expect(principleEngagements[0]!.flowType).toBe('midday');
    });

    it('preserves the scalar developmental fields across migration', async () => {
      mockGetItem.mockResolvedValue(legacyBlob());

      await useStoicPracticeStore.getState().loadPersistedState();
      const state = useStoicPracticeStore.getState();

      expect(state.totalPracticeDays).toBe(12);
      expect(state.currentStreak).toBe(4);
      expect(state.longestStreak).toBe(9);
    });
  });

  describe('idempotency — gated on the stored version, not shape-sniffing', () => {
    it('is a no-op when re-run against an already-migrated blob', async () => {
      mockGetItem.mockResolvedValue(legacyBlob());
      await useStoicPracticeStore.getState().loadPersistedState();
      const first = useStoicPracticeStore.getState().checkInCompletions.map(c => c.type);

      // Persist (now stamped), then load that stamped blob back.
      await useStoicPracticeStore.getState().persistState();
      const stamped = mockSetItem.mock.calls.at(-1)![1];
      mockGetItem.mockResolvedValue(stamped);

      await useStoicPracticeStore.getState().loadPersistedState();
      const second = useStoicPracticeStore.getState().checkInCompletions.map(c => c.type);

      expect(second).toEqual(first);
    });

    it('re-loading the same versioned blob repeatedly does not duplicate or drop records', async () => {
      mockGetItem.mockResolvedValue(legacyBlob({ version: STOIC_PRACTICE_SCHEMA_VERSION }));

      await useStoicPracticeStore.getState().loadPersistedState();
      await useStoicPracticeStore.getState().loadPersistedState();
      await useStoicPracticeStore.getState().loadPersistedState();

      expect(useStoicPracticeStore.getState().checkInCompletions).toHaveLength(4);
    });
  });

  describe('never drops records it does not recognise', () => {
    it('passes an unknown check-in type through unchanged (forward-compat)', async () => {
      // A record written by a FUTURE app version this code does not know about.
      mockGetItem.mockResolvedValue(
        legacyBlob({
          checkInCompletions: [
            { type: 'morning', date: '2026-07-01', completedAt: '2026-07-01T08:00:00.000Z' },
            { type: 'some_future_type', date: '2026-07-03', completedAt: '2026-07-03T08:00:00.000Z' },
          ],
        })
      );

      await useStoicPracticeStore.getState().loadPersistedState();
      const types = useStoicPracticeStore.getState().checkInCompletions.map(c => c.type);

      expect(types).toHaveLength(2);
      expect(types).toContain('some_future_type');
    });

    it('does not transform or drop records when the blob claims a FUTURE schema version', async () => {
      // Downgrade case: user rolled back to an older build. Migrating "backwards" is not
      // defined, so the safe behaviour is to leave the records completely alone.
      mockGetItem.mockResolvedValue(legacyBlob({ version: STOIC_PRACTICE_SCHEMA_VERSION + 99 }));

      await useStoicPracticeStore.getState().loadPersistedState();
      const { checkInCompletions } = useStoicPracticeStore.getState();

      expect(checkInCompletions).toHaveLength(4);
      expect(checkInCompletions.map(c => c.type)).toEqual([
        'morning',
        'midday',
        'evening',
        'learn',
      ]);
    });

    it('treats a non-numeric version as pre-versioned and still loads every record', async () => {
      mockGetItem.mockResolvedValue(legacyBlob({ version: 'not-a-number' }));

      await useStoicPracticeStore.getState().loadPersistedState();

      expect(useStoicPracticeStore.getState().checkInCompletions).toHaveLength(4);
    });
  });

  describe("'daily' is a first-class check-in type (additive widening)", () => {
    it('accepts a daily completion and reports it complete today', async () => {
      await useStoicPracticeStore.getState().markCheckInComplete('daily');

      expect(useStoicPracticeStore.getState().isCheckInCompletedToday('daily')).toBe(true);
    });

    it('does not make the legacy types complete just because daily is', async () => {
      await useStoicPracticeStore.getState().markCheckInComplete('daily');
      const state = useStoicPracticeStore.getState();

      expect(state.isCheckInCompletedToday('morning')).toBe(false);
      expect(state.isCheckInCompletedToday('midday')).toBe(false);
      expect(state.isCheckInCompletedToday('evening')).toBe(false);
    });

    it('round-trips a daily completion through persist + load', async () => {
      await useStoicPracticeStore.getState().markCheckInComplete('daily');
      await useStoicPracticeStore.getState().persistState();

      const written = mockSetItem.mock.calls.at(-1)![1];
      mockGetItem.mockResolvedValue(written);
      await useStoicPracticeStore.getState().resetStore();
      await useStoicPracticeStore.getState().loadPersistedState();

      expect(
        useStoicPracticeStore.getState().checkInCompletions.some(c => c.type === 'daily')
      ).toBe(true);
    });
  });

  describe('failure safety — a bad blob must not become a persisted empty state', () => {
    it('does not wipe in-memory records when the stored blob is unparseable', async () => {
      // Seed real state first.
      await useStoicPracticeStore.getState().markCheckInComplete('morning');
      const before = useStoicPracticeStore.getState().checkInCompletions.length;
      expect(before).toBe(1);

      mockGetItem.mockResolvedValue('{ this is not valid json');
      await useStoicPracticeStore.getState().loadPersistedState();

      // The load fails and must leave existing state alone rather than clobbering it.
      expect(useStoicPracticeStore.getState().checkInCompletions.length).toBe(before);
    });
  });
});
