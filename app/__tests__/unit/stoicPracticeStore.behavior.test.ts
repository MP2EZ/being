/**
 * STOIC PRACTICE STORE — BEHAVIOR UNIT TESTS (MAINT-242)
 *
 * Correctness-asserting tests for the Zustand Stoic practice store:
 *   - STAGE_THRESHOLDS boundaries (asserted against the literal source constants)
 *   - longest-streak Math.max tracking
 *   - 90-day retention pruning for check-in completions & principle engagements
 *   - weekly-reflection upsert-by-ISO-week
 *   - debounced persist (fake timers)
 *
 * PLACEMENT: under __tests__/unit/ so it is gated by `npm run test:unit`
 * (jest --testPathPattern=unit).
 *
 * BUG FIXED (TDD, see "90-day retention — timezone off-by-one" block):
 *   The retention writes stamp dates via the local-tz getTodayString()
 *   helper, but cleanOldCheckInCompletions / cleanOldPrincipleEngagements
 *   computed the cutoff via UTC toISOString().split('T')[0]. In a non-UTC
 *   zone near midnight (local date < UTC date) the cutoff was one calendar
 *   day AHEAD of the local cutoff, so a record stamped exactly 90 local
 *   days ago was incorrectly pruned. Fix: cutoff now uses the same
 *   local-date basis the writes use.
 *
 * DETERMINISTIC TZ SIMULATION (host-TZ-independent, incl. TZ=UTC on CI):
 *   A local-vs-UTC off-by-one is UNOBSERVABLE in a UTC worker because
 *   local == UTC there, and a runtime `process.env.TZ` reassignment is
 *   ignored (V8 caches the zone on first Date use in a shared jest worker).
 *   So instead of relying on the host zone, the retention block SYNTHESIZES
 *   a UTC-minus-7h zone by monkeypatching the LOCAL Date getters
 *   (getFullYear/getMonth/getDate) and setDate used by the source's
 *   toLocalDateString/getRetentionCutoffString helpers, so the LOCAL
 *   calendar date sits one day BEHIND the UTC date. Combined with a fixed
 *   setSystemTime whose UTC time-of-day is before 07:00, the boundary
 *   record's local 90-day cutoff (local basis = fix) RETAINS it, while the
 *   buggy UTC basis (toISOString) computes a cutoff one day AHEAD and
 *   PRUNES it. The patch is installed/removed per-test (afterEach), so it
 *   holds identically under any host TZ. toISOString() is UTC-based and is
 *   deliberately NOT patched — that is exactly the buggy basis under test.
 *
 * INFRA-180 discipline: fake timers + setSystemTime for Date.now control;
 * real timers + real Date getters restored in afterEach.
 */

import * as SecureStore from 'expo-secure-store';
import {
  useStoicPracticeStore,
  flushStoicPracticePersist,
  type CheckInCompletion,
  type PrincipleEngagement,
} from '@/features/practices/stores/stoicPracticeStore';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(() => Promise.resolve()),
  getItemAsync: jest.fn(() => Promise.resolve(null)),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock ISO-week so weekly-reflection tests are deterministic.
jest.mock('@/core/utils/isoWeek', () => ({
  getIsoWeekStart: jest.fn(() => '2026-06-01'),
  getIsoWeekStartFor: jest.fn(),
}));
import { getIsoWeekStart } from '@/core/utils/isoWeek';

// STAGE_THRESHOLDS is module-private; mirror the literal source values so
// boundary assertions break loudly if the source constants change.
const STAGE_THRESHOLDS = {
  effortful: { minDays: 180, minStreak: 7, minPrinciples: 2, minDomains: 2 },
  fluid: { minDays: 730, minStreak: 14, minPrinciples: 4, minDomains: 3 },
  integrated: { minDays: 1825, minStreak: 30, minPrinciples: 5, minDomains: 3 },
} as const;

const mockStore = SecureStore as jest.Mocked<typeof SecureStore>;

describe('StoicPracticeStore — behavior (MAINT-242)', () => {
  beforeEach(async () => {
    await useStoicPracticeStore.getState().resetStore();
    jest.clearAllMocks();
    (mockStore.getItemAsync as jest.Mock).mockResolvedValue(null);
    (mockStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ──────────────────────────────────────────────────────────────────
  // STAGE THRESHOLDS
  // ──────────────────────────────────────────────────────────────────
  describe('developmental stage thresholds', () => {
    /**
     * Seed the store so the auto-stage calculation (run on
     * incrementPracticeDays) has the principle repertoire + domain
     * coverage to evaluate. We set totalPracticeDays to one BELOW the
     * target, then incrementPracticeDays() to land exactly on the target.
     */
    const seedForStage = (opts: {
      totalDaysBeforeIncrement: number;
      streak: number;
      principles: string[];
      domains: number;
    }) => {
      const domainNames = ['work', 'relationships', 'adversity'] as const;
      const domainProgress = {
        work: { domain: 'work' as const, practiceInstances: 0, principlesApplied: [] as string[], lastPracticeDate: null },
        relationships: { domain: 'relationships' as const, practiceInstances: 0, principlesApplied: [] as string[], lastPracticeDate: null },
        adversity: { domain: 'adversity' as const, practiceInstances: 0, principlesApplied: [] as string[], lastPracticeDate: null },
      };
      // Distribute unique principles into the active domains so the Set
      // union counts `principles.length` unique entries.
      for (let i = 0; i < opts.domains; i++) {
        domainProgress[domainNames[i]].practiceInstances = 1;
      }
      // Put all principles into the first active domain (Set de-dupes anyway).
      domainProgress[domainNames[0]].principlesApplied = [...opts.principles];

      useStoicPracticeStore.setState({
        totalPracticeDays: opts.totalDaysBeforeIncrement,
        currentStreak: opts.streak,
        domainProgress,
        developmentalStage: 'fragmented',
      });
    };

    it('stays fragmented just below the effortful threshold', async () => {
      seedForStage({
        totalDaysBeforeIncrement: STAGE_THRESHOLDS.effortful.minDays - 2,
        streak: STAGE_THRESHOLDS.effortful.minStreak,
        principles: ['p1', 'p2'],
        domains: 2,
      });
      await useStoicPracticeStore.getState().incrementPracticeDays();
      // totalPracticeDays now = minDays - 1 (still below)
      expect(useStoicPracticeStore.getState().developmentalStage).toBe('fragmented');
    });

    it('reaches effortful exactly at the effortful threshold', async () => {
      seedForStage({
        totalDaysBeforeIncrement: STAGE_THRESHOLDS.effortful.minDays - 1,
        streak: STAGE_THRESHOLDS.effortful.minStreak,
        principles: ['p1', 'p2'],
        domains: STAGE_THRESHOLDS.effortful.minDomains,
      });
      await useStoicPracticeStore.getState().incrementPracticeDays();
      expect(useStoicPracticeStore.getState().developmentalStage).toBe('effortful');
    });

    it('does not reach fluid with too few unique principles', async () => {
      seedForStage({
        totalDaysBeforeIncrement: STAGE_THRESHOLDS.fluid.minDays - 1,
        streak: STAGE_THRESHOLDS.fluid.minStreak,
        principles: ['p1', 'p2', 'p3'], // 3 < required 4
        domains: STAGE_THRESHOLDS.fluid.minDomains,
      });
      await useStoicPracticeStore.getState().incrementPracticeDays();
      // Falls back to effortful (all effortful criteria still met).
      expect(useStoicPracticeStore.getState().developmentalStage).toBe('effortful');
    });

    it('reaches integrated when all integrated criteria are met', async () => {
      seedForStage({
        totalDaysBeforeIncrement: STAGE_THRESHOLDS.integrated.minDays - 1,
        streak: STAGE_THRESHOLDS.integrated.minStreak,
        principles: ['p1', 'p2', 'p3', 'p4', 'p5'],
        domains: STAGE_THRESHOLDS.integrated.minDomains,
      });
      await useStoicPracticeStore.getState().incrementPracticeDays();
      expect(useStoicPracticeStore.getState().developmentalStage).toBe('integrated');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // LONGEST STREAK
  // ──────────────────────────────────────────────────────────────────
  describe('updateStreak — longest-streak Math.max tracking', () => {
    it('raises longestStreak when currentStreak exceeds it', () => {
      useStoicPracticeStore.getState().updateStreak(5);
      expect(useStoicPracticeStore.getState().longestStreak).toBe(5);
      useStoicPracticeStore.getState().updateStreak(9);
      expect(useStoicPracticeStore.getState().longestStreak).toBe(9);
    });

    it('keeps the prior longestStreak when a streak is broken (lower current)', () => {
      useStoicPracticeStore.getState().updateStreak(12);
      useStoicPracticeStore.getState().updateStreak(3); // streak broke
      const s = useStoicPracticeStore.getState();
      expect(s.currentStreak).toBe(3);
      expect(s.longestStreak).toBe(12);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 90-DAY RETENTION — TIMEZONE OFF-BY-ONE BUG (TDD)
  // ──────────────────────────────────────────────────────────────────
  describe('90-day retention — timezone off-by-one (MAINT-242 bug fix)', () => {
    // ────────────────────────────────────────────────────────────────
    // SYNTHETIC UTC-MINUS ZONE (host-TZ-independent)
    //
    // We monkeypatch the LOCAL Date getters + setDate that the source's
    // toLocalDateString / getRetentionCutoffString rely on so that the
    // LOCAL calendar frame is exactly UTC-7h, regardless of the worker's
    // real TZ (PDT, UTC, NYC — all behave identically). The patch derives
    // every field from the deterministic UTC primitives of a shifted
    // instant, so it is fully self-consistent (including the
    // `setDate(getDate() - 90)` round-trip inside getRetentionCutoffString).
    //
    // toISOString() is intentionally LEFT UNPATCHED — it stays UTC-based,
    // which is exactly the buggy cutoff basis this block must catch.
    // ────────────────────────────────────────────────────────────────
    const OFFSET_MS = 7 * 60 * 60 * 1000; // simulate UTC-7 (local = UTC - 7h)

    type DateProtoSaves = {
      getFullYear: typeof Date.prototype.getFullYear;
      getMonth: typeof Date.prototype.getMonth;
      getDate: typeof Date.prototype.getDate;
      getDay: typeof Date.prototype.getDay;
      getHours: typeof Date.prototype.getHours;
      setDate: typeof Date.prototype.setDate;
    };
    let savedProto: DateProtoSaves | null = null;

    const installUtcMinusZone = (): void => {
      savedProto = {
        getFullYear: Date.prototype.getFullYear,
        getMonth: Date.prototype.getMonth,
        getDate: Date.prototype.getDate,
        getDay: Date.prototype.getDay,
        getHours: Date.prototype.getHours,
        setDate: Date.prototype.setDate,
      };
      // Virtual local frame = real instant shifted back by OFFSET_MS,
      // read through the UTC primitives (which the host TZ cannot perturb).
      /* eslint-disable no-extend-native */
      Date.prototype.getFullYear = function getFullYear(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCFullYear();
      };
      Date.prototype.getMonth = function getMonth(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCMonth();
      };
      Date.prototype.getDate = function getDate(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCDate();
      };
      Date.prototype.getDay = function getDay(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCDay();
      };
      Date.prototype.getHours = function getHours(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCHours();
      };
      // setDate must operate in the SAME virtual frame: set the day-of-month
      // on the shifted instant via setUTCDate, then shift forward again.
      Date.prototype.setDate = function setDate(this: Date, day: number): number {
        const shifted = new Date(this.getTime() - OFFSET_MS);
        shifted.setUTCDate(day);
        this.setTime(shifted.getTime() + OFFSET_MS);
        return this.getTime();
      };
      /* eslint-enable no-extend-native */
    };

    const restoreZone = (): void => {
      if (!savedProto) return;
      /* eslint-disable no-extend-native */
      Date.prototype.getFullYear = savedProto.getFullYear;
      Date.prototype.getMonth = savedProto.getMonth;
      Date.prototype.getDate = savedProto.getDate;
      Date.prototype.getDay = savedProto.getDay;
      Date.prototype.getHours = savedProto.getHours;
      Date.prototype.setDate = savedProto.setDate;
      /* eslint-enable no-extend-native */
      savedProto = null;
    };

    afterEach(restoreZone);

    // Fixed instant whose UTC time-of-day (05:30Z) is before the 7h offset,
    // so the synthetic local date sits one calendar day behind UTC:
    //   2026-06-07T05:30:00Z  → local frame (−7h) = 2026-06-06 22:30
    //   local today  = 2026-06-06  → local cutoff (today − 90) = 2026-03-08  (fix: RETAINS boundary)
    //   UTC   today  = 2026-06-07  → UTC   cutoff (today − 90) = 2026-03-09  (bug: one day ahead, PRUNES it)
    const NOW_INSTANT = new Date('2026-06-07T05:30:00Z').getTime();
    const LOCAL_CUTOFF_DATE = '2026-03-08'; // record stamped here is exactly 90 local days old

    it('retains a check-in stamped exactly 90 LOCAL days ago', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      // Seed a completion whose local date is exactly the 90-day boundary.
      const boundary: CheckInCompletion = {
        type: 'morning',
        completedAt: new Date(NOW_INSTANT),
        date: LOCAL_CUTOFF_DATE,
      };
      useStoicPracticeStore.setState({ checkInCompletions: [boundary] });

      // markCheckInComplete triggers cleanOldCheckInCompletions on the
      // combined list. With the fix, the local-basis cutoff keeps the
      // boundary record; pre-fix the UTC cutoff (2026-03-09) dropped it.
      await useStoicPracticeStore.getState().markCheckInComplete('evening');

      const dates = useStoicPracticeStore
        .getState()
        .checkInCompletions.map((c) => c.date);
      expect(dates).toContain(LOCAL_CUTOFF_DATE);
    });

    it('still prunes a check-in older than the local 90-day cutoff', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const tooOld: CheckInCompletion = {
        type: 'morning',
        completedAt: new Date(NOW_INSTANT),
        date: '2026-03-07', // one day before the local cutoff
      };
      useStoicPracticeStore.setState({ checkInCompletions: [tooOld] });
      await useStoicPracticeStore.getState().markCheckInComplete('evening');

      const dates = useStoicPracticeStore
        .getState()
        .checkInCompletions.map((c) => c.date);
      expect(dates).not.toContain('2026-03-07');
    });

    it('retains a principle engagement stamped exactly 90 LOCAL days ago', async () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const boundary: PrincipleEngagement = {
        principle: 'dichotomy_of_control' as PrincipleEngagement['principle'],
        flowType: 'morning',
        engagementType: 'selected',
        date: LOCAL_CUTOFF_DATE,
        timestamp: new Date(NOW_INSTANT),
      };
      useStoicPracticeStore.setState({ principleEngagements: [boundary] });

      await useStoicPracticeStore
        .getState()
        .recordPrincipleEngagement(
          'dichotomy_of_control' as PrincipleEngagement['principle'],
          'evening',
          'reflected'
        );

      const dates = useStoicPracticeStore
        .getState()
        .principleEngagements.map((e) => e.date);
      expect(dates).toContain(LOCAL_CUTOFF_DATE);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // N-DAY INSIGHTS GETTERS — TIMEZONE OFF-BY-ONE BUG (TDD, DEBUG-259)
  // ──────────────────────────────────────────────────────────────────
  describe('N-day Insights getters — timezone off-by-one (DEBUG-259 bug fix)', () => {
    // ────────────────────────────────────────────────────────────────
    // MIRRORS the MAINT-242 retention harness above: the same synthetic
    // UTC-minus-7h LOCAL frame (monkeypatch local Date getters + setDate;
    // leave UTC primitives / toISOString unpatched), the same fixed
    // setSystemTime, so a UTC CI worker still observes local ≠ UTC.
    //
    // getCheckInHistory(days) / getPrincipleEngagements(days) stamp/compare
    // against the LOCAL-date `date` strings (getTodayString → toLocalDateString),
    // but the pre-fix getters computed their cutoff via
    // `new Date(Date.now() - days*86400000).toISOString().split('T')[0]`
    // (a 24h-multiple ms window read in UTC). In a UTC-minus zone whose
    // local time-of-day is early-morning, that UTC cutoff lands one
    // calendar day AHEAD of the local calendar-decrement cutoff, so a
    // record stamped exactly `days` LOCAL days ago is wrongly DROPPED.
    // ────────────────────────────────────────────────────────────────
    const OFFSET_MS = 7 * 60 * 60 * 1000; // simulate UTC-7 (local = UTC - 7h)

    type DateProtoSaves = {
      getFullYear: typeof Date.prototype.getFullYear;
      getMonth: typeof Date.prototype.getMonth;
      getDate: typeof Date.prototype.getDate;
      setDate: typeof Date.prototype.setDate;
    };
    let savedProto: DateProtoSaves | null = null;

    const installUtcMinusZone = (): void => {
      savedProto = {
        getFullYear: Date.prototype.getFullYear,
        getMonth: Date.prototype.getMonth,
        getDate: Date.prototype.getDate,
        setDate: Date.prototype.setDate,
      };
      /* eslint-disable no-extend-native */
      Date.prototype.getFullYear = function getFullYear(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCFullYear();
      };
      Date.prototype.getMonth = function getMonth(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCMonth();
      };
      Date.prototype.getDate = function getDate(this: Date): number {
        return new Date(this.getTime() - OFFSET_MS).getUTCDate();
      };
      Date.prototype.setDate = function setDate(this: Date, day: number): number {
        const shifted = new Date(this.getTime() - OFFSET_MS);
        shifted.setUTCDate(day);
        this.setTime(shifted.getTime() + OFFSET_MS);
        return this.getTime();
      };
      /* eslint-enable no-extend-native */
    };

    const restoreZone = (): void => {
      if (!savedProto) return;
      /* eslint-disable no-extend-native */
      Date.prototype.getFullYear = savedProto.getFullYear;
      Date.prototype.getMonth = savedProto.getMonth;
      Date.prototype.getDate = savedProto.getDate;
      Date.prototype.setDate = savedProto.setDate;
      /* eslint-enable no-extend-native */
      savedProto = null;
    };

    afterEach(restoreZone);

    // Fixed instant whose UTC time-of-day (05:30Z) is before the 7h offset,
    // so the synthetic LOCAL date sits one calendar day behind UTC:
    //   2026-06-07T05:30:00Z  → local frame (−7h) = 2026-06-06 22:30
    //   local today = 2026-06-06
    //   DAYS = 30 (Insights "Month" view):
    //     local calendar cutoff (today − 30) = 2026-05-07   (fix: RETAINS boundary)
    //     old ms-window UTC cutoff: (2026-06-07T05:30Z − 30d) = 2026-05-08T05:30Z
    //       → toISOString().split('T')[0] = 2026-05-08  (bug: one day ahead, DROPS boundary)
    const NOW_INSTANT = new Date('2026-06-07T05:30:00Z').getTime();
    const DAYS = 30;
    const N_DAYS_AGO_LOCAL = '2026-05-07'; // exactly DAYS local days ago (boundary)
    const N_PLUS_1_DAYS_AGO_LOCAL = '2026-05-06'; // DAYS+1 local days ago (must be excluded)
    const RECENT_LOCAL = '2026-06-05'; // well within window (sanity / unchanged behavior)

    it('getCheckInHistory(N) INCLUDES a check-in stamped exactly N LOCAL days ago', () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const boundary: CheckInCompletion = {
        type: 'morning',
        completedAt: new Date(NOW_INSTANT),
        date: N_DAYS_AGO_LOCAL,
      };
      const recent: CheckInCompletion = {
        type: 'evening',
        completedAt: new Date(NOW_INSTANT),
        date: RECENT_LOCAL,
      };
      useStoicPracticeStore.setState({ checkInCompletions: [boundary, recent] });

      const dates = useStoicPracticeStore
        .getState()
        .getCheckInHistory(DAYS)
        .map((c) => c.date);
      // Pre-fix: UTC cutoff 2026-05-08 drops the 2026-05-07 boundary.
      expect(dates).toContain(N_DAYS_AGO_LOCAL);
      expect(dates).toContain(RECENT_LOCAL);
    });

    it('getCheckInHistory(N) EXCLUDES a check-in stamped N+1 LOCAL days ago', () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const tooOld: CheckInCompletion = {
        type: 'morning',
        completedAt: new Date(NOW_INSTANT),
        date: N_PLUS_1_DAYS_AGO_LOCAL,
      };
      useStoicPracticeStore.setState({ checkInCompletions: [tooOld] });

      const dates = useStoicPracticeStore
        .getState()
        .getCheckInHistory(DAYS)
        .map((c) => c.date);
      expect(dates).not.toContain(N_PLUS_1_DAYS_AGO_LOCAL);
    });

    it('getPrincipleEngagements(N) INCLUDES an engagement stamped exactly N LOCAL days ago', () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const boundary: PrincipleEngagement = {
        principle: 'dichotomy_of_control' as PrincipleEngagement['principle'],
        flowType: 'morning',
        engagementType: 'selected',
        date: N_DAYS_AGO_LOCAL,
        timestamp: new Date(NOW_INSTANT),
      };
      const recent: PrincipleEngagement = {
        principle: 'dichotomy_of_control' as PrincipleEngagement['principle'],
        flowType: 'evening',
        engagementType: 'reflected',
        date: RECENT_LOCAL,
        timestamp: new Date(NOW_INSTANT),
      };
      useStoicPracticeStore.setState({ principleEngagements: [boundary, recent] });

      const dates = useStoicPracticeStore
        .getState()
        .getPrincipleEngagements(DAYS)
        .map((e) => e.date);
      // Pre-fix: UTC cutoff 2026-05-08 drops the 2026-05-07 boundary.
      expect(dates).toContain(N_DAYS_AGO_LOCAL);
      expect(dates).toContain(RECENT_LOCAL);
    });

    it('getPrincipleEngagements(N) EXCLUDES an engagement stamped N+1 LOCAL days ago', () => {
      jest.useFakeTimers();
      jest.setSystemTime(NOW_INSTANT);
      installUtcMinusZone();

      const tooOld: PrincipleEngagement = {
        principle: 'dichotomy_of_control' as PrincipleEngagement['principle'],
        flowType: 'morning',
        engagementType: 'selected',
        date: N_PLUS_1_DAYS_AGO_LOCAL,
        timestamp: new Date(NOW_INSTANT),
      };
      useStoicPracticeStore.setState({ principleEngagements: [tooOld] });

      const dates = useStoicPracticeStore
        .getState()
        .getPrincipleEngagements(DAYS)
        .map((e) => e.date);
      expect(dates).not.toContain(N_PLUS_1_DAYS_AGO_LOCAL);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // WEEKLY REFLECTION — UPSERT BY ISO WEEK
  // ──────────────────────────────────────────────────────────────────
  describe('addWeeklyReflection — upsert by current ISO week', () => {
    it('inserts a new reflection for the current week', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('first');
      const reflections = useStoicPracticeStore.getState().weeklyReflections;
      expect(reflections).toHaveLength(1);
      expect(reflections[0].weekStartIso).toBe('2026-06-01');
      expect(reflections[0].text).toBe('first');
    });

    it('replaces the same week in place (same id) on re-save', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('first');
      const firstId = useStoicPracticeStore.getState().weeklyReflections[0].id;

      await useStoicPracticeStore.getState().addWeeklyReflection('second');
      const reflections = useStoicPracticeStore.getState().weeklyReflections;
      expect(reflections).toHaveLength(1);
      expect(reflections[0].id).toBe(firstId);
      expect(reflections[0].text).toBe('second');
    });

    it('adds a separate entry when the ISO week changes', async () => {
      await useStoicPracticeStore.getState().addWeeklyReflection('week-1');
      (getIsoWeekStart as jest.Mock).mockReturnValue('2026-06-08');
      await useStoicPracticeStore.getState().addWeeklyReflection('week-2');

      const reflections = useStoicPracticeStore.getState().weeklyReflections;
      expect(reflections).toHaveLength(2);
      expect(useStoicPracticeStore.getState().getWeeklyReflectionForWeek('2026-06-01')?.text).toBe('week-1');
      expect(useStoicPracticeStore.getState().getWeeklyReflectionForWeek('2026-06-08')?.text).toBe('week-2');
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // DEBOUNCED PERSIST
  // ──────────────────────────────────────────────────────────────────
  describe('debounced persistence', () => {
    it('collapses a burst of mutations into a single trailing-edge write', async () => {
      jest.useFakeTimers();

      // Three rapid mutations within the 500ms debounce window.
      await useStoicPracticeStore.getState().addVirtueChallenge({
        domain: 'work',
        virtue: 'wisdom',
        description: 'a',
        selfCompassion: 'kind to self',
      } as any);
      await useStoicPracticeStore.getState().addVirtueChallenge({
        domain: 'work',
        virtue: 'wisdom',
        description: 'b',
        selfCompassion: 'kind to self',
      } as any);
      await useStoicPracticeStore.getState().incrementPracticeDays();

      // No write yet — still inside the quiet window.
      expect(mockStore.setItemAsync).not.toHaveBeenCalled();

      // Advance past the debounce window, then flush the persist promise.
      jest.advanceTimersByTime(500);
      await flushStoicPracticePersist();

      // Exactly one collapsed write.
      expect(mockStore.setItemAsync).toHaveBeenCalledTimes(1);
    });

    it('flushStoicPracticePersist writes the latest snapshot immediately', async () => {
      jest.useFakeTimers();

      await useStoicPracticeStore.getState().incrementPracticeDays();
      expect(mockStore.setItemAsync).not.toHaveBeenCalled();

      await flushStoicPracticePersist();
      expect(mockStore.setItemAsync).toHaveBeenCalledTimes(1);

      const [, payload] = (mockStore.setItemAsync as jest.Mock).mock.calls[0];
      expect(JSON.parse(payload).totalPracticeDays).toBe(1);
    });
  });
});
