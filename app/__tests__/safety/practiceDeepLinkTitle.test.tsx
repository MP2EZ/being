/**
 * DEBUG-679 — a practice deep link cannot put its own words on screen.
 *
 * `being://practice/<id>?title=…` is externally reachable. linking.ts parsed `title`
 * (strip `<>`, cut to 100) and CleanRootNavigator passed `route.params.title` straight to
 * PracticeTimerScreen, so whoever wrote the link wrote the header of an immersive route
 * whose 988 button is faded, and the completion screen read it aloud. React Navigation
 * also hands the route every query key it did not parse, raw, so removing the parse and
 * the allowlist entry is not enough on its own: the route must never read the param.
 *
 * The control is PracticeTimerRoute. `practiceId` is a lookup key only; title, visualMode,
 * instructions and moduleId come from the guided-timer catalog
 * (`core/navigation/linkedPracticeParams.ts`), or from a fixed, Being-authored fallback.
 *
 * Driven end to end: linkingConfig.getStateFromPath → PracticeTimerRoute →
 * PracticeTimerScreen → completion, with the real stores (a mocked store hides throws).
 */

jest.mock('expo-linking', () => ({
  createURL: jest.fn((path: string) => `being://${path.replace(/^\//, '')}`),
  getInitialURL: jest.fn(),
  addEventListener: jest.fn(),
}));

jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackPracticeStarted: jest.fn(), trackPracticeCompleted: jest.fn() }),
}));

// The circle is a plain node here: this suite asserts whether it renders, not how it animates.
jest.mock('@/features/practices/shared/components/BreathingCircle', () => {
  const { View } = require('react-native');
  return ({ testID }: { testID?: string }) => <View testID={testID} />;
});

// Captures onComplete so the suite can finish the practice without a clock.
const mockTimer: { onComplete?: () => void; durationMs?: number } = {};
jest.mock('@/features/practices/shared/components/Timer', () => {
  const { View } = require('react-native');
  return (props: { testID?: string; onComplete?: () => void; duration?: number }) => {
    mockTimer.onComplete = props.onComplete;
    mockTimer.durationMs = props.duration;
    return <View testID={props.testID} />;
  };
});

import fs from 'fs';
import path from 'path';
import React from 'react';
import { AccessibilityInfo } from 'react-native';
import { act, render, renderHook, screen } from '@testing-library/react-native';

import { linkingConfig } from '@/core/navigation/linking';
import PracticeTimerRoute from '@/core/navigation/PracticeTimerRoute';
import {
  FALLBACK_PRACTICE_ID,
  FALLBACK_PRACTICE_TITLE,
  LINK_DURATION_DEFAULT_SECONDS,
  resolveLinkedPracticeParams,
} from '@/core/navigation/linkedPracticeParams';
import type { RootStackParamList } from '@/core/navigation/CleanRootNavigator';
import DeepLinkValidationService from '@/core/services/security/DeepLinkValidationService';
import { useConsentStore } from '@/core/stores/consentStore';
import { PRACTICE_QUOTES } from '@/features/learn/practices/PracticeCompletionScreen';
import { usePracticeCompletion } from '@/features/learn/practices/shared/usePracticeCompletion';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { isModuleId, type ModuleId, type Practice } from '@/features/learn/types/education';
import { MODULE_TO_PRINCIPLE_MAP } from '@/features/learn/utils/principleMapping';
import { resolvePracticeRoute } from '@/features/practices/catalog/practiceNavigation';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import { seedWellnessWriteConsent } from '../helpers/wellnessWriteConsent';

type PracticeTimerParams = RootStackParamList['PracticeTimer'];
type NavState = { routes: { name: string; params?: Record<string, unknown>; state?: NavState }[] };

const ID = 'practice-timer-screen';
const CIRCLE = `${ID}-breathing-circle`;
const SPOOF_NUMBER = '555-0100';
const SPOOF = 'title=Call+555-0100';

const APP = path.resolve(__dirname, '../..');
const MODULES_DIR = path.join(APP, 'assets/modules');
const MODULE_FILES = fs.readdirSync(MODULES_DIR).filter((f) => f.endsWith('.json')).sort();
const catalog = MODULE_FILES.map(
  (f) => JSON.parse(fs.readFileSync(path.join(MODULES_DIR, f), 'utf8')) as { id: string; practices: Practice[] },
);
const allPractices = catalog.flatMap((m) => m.practices.map((p) => ({ moduleId: m.id, practice: p })));
const guidedTimers = allPractices.filter((e) => e.practice.type === 'guided-timer');

/** Every own key of Object.prototype that survives linking.ts's practiceId sanitiser. */
const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype).filter((k) => /^[a-zA-Z0-9-]+$/.test(k));

const resolveState = (p: string) =>
  (linkingConfig.getStateFromPath as NonNullable<typeof linkingConfig.getStateFromPath>)(
    p,
    linkingConfig.config,
  ) as NavState | undefined;

function linkParams(p: string): PracticeTimerParams {
  const queue: NavState[] = [];
  const root = resolveState(p);
  if (root) queue.push(root);
  while (queue.length) {
    const state = queue.shift()!;
    for (const route of state.routes) {
      if (route.name === 'PracticeTimer') return (route.params ?? {}) as unknown as PracticeTimerParams;
      if (route.state) queue.push(route.state);
    }
  }
  throw new Error(`no PracticeTimer route for ${p}`);
}

let announce: jest.SpyInstance;

const renderRoute = (params: PracticeTimerParams) =>
  render(<PracticeTimerRoute params={params} onDone={() => {}} />);

const finish = () => {
  expect(mockTimer.onComplete).toBeDefined();
  act(() => mockTimer.onComplete!());
};

/** Everything rendered — every Text child and every string prop, accessibilityLabel included. */
const renderedTree = () => JSON.stringify(screen.toJSON());
const headerTitle = () => screen.getByTestId(`${ID}-header-title`);
const announcements = () => JSON.stringify(announce.mock.calls);

function freshModules() {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/features/learn/stores/educationStore').resetEducationStoreForErasure();
}

beforeEach(() => {
  mockTimer.onComplete = undefined;
  mockTimer.durationMs = undefined;
  freshModules();
  useStoicPracticeStore.setState({ principleEngagements: [] });
  seedWellnessWriteConsent('granted');
  useConsentStore.setState({
    consentCache: { ...useConsentStore.getState().consentCache, ageVerified: true, isEligible: true },
  });
  announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility').mockImplementation();
});

afterEach(() => {
  announce.mockRestore();
});

describe('AC1: a link title reaches no rendered text, label or announcement', () => {
  it('control: the link resolves and React Navigation hands the raw title to the route', () => {
    // If this stops holding, the assertions below pass vacuously.
    const params = linkParams(`practice/breathing-space?duration=60&${SPOOF}`) as unknown as Record<string, unknown>;
    expect(params.practiceId).toBe('breathing-space');
    expect(String(params.title)).toContain(SPOOF_NUMBER);
  });

  it.each([
    ['a catalog practice', 'breathing-space', '3-Minute Breathing Space'],
    ['an unknown id', 'probe', FALLBACK_PRACTICE_TITLE],
    ['a non-guided catalog id', 'social-impact-reflection', FALLBACK_PRACTICE_TITLE],
  ])('%s: before start and on completion', (_label, id, expectedTitle) => {
    renderRoute(linkParams(`practice/${id}?duration=60&${SPOOF}`));

    expect(headerTitle()).toHaveTextContent(expectedTitle, { exact: true });
    expect(renderedTree()).not.toContain(SPOOF_NUMBER);

    finish();
    expect(screen.getByText('Practice Complete')).toBeTruthy();
    expect(screen.getByText(expectedTitle)).toBeTruthy();
    expect(renderedTree()).not.toContain(SPOOF_NUMBER);
    // Positive control on the announcement channel: it fired, with Being's title.
    expect(announcements()).toContain(`Practice complete: ${expectedTitle}`);
    expect(announcements()).not.toContain(SPOOF_NUMBER);
  });

  it('raw params that bypass the validator and the parse still put nothing on screen', () => {
    const raw = {
      practiceId: 'probe',
      duration: 60,
      title: `Call ${SPOOF_NUMBER}`,
      visualMode: 'contemplative',
      instructions: [`Call ${SPOOF_NUMBER} now`],
      moduleId: 'interconnected-living',
    } as unknown as PracticeTimerParams;
    renderRoute(raw);

    expect(headerTitle()).toHaveTextContent(FALLBACK_PRACTICE_TITLE, { exact: true });
    // visualMode and instructions from the link are ignored as well: the fallback is a breathing timer.
    expect(screen.getByTestId(CIRCLE)).toBeTruthy();
    expect(renderedTree()).not.toContain(SPOOF_NUMBER);

    finish();
    expect(renderedTree()).not.toContain(SPOOF_NUMBER);
    expect(announcements()).not.toContain(SPOOF_NUMBER);
    // moduleId from the link is ignored too: an unresolved id credits nothing.
    expect(useStoicPracticeStore.getState().principleEngagements).toHaveLength(0);
  });
});

describe('AC2: the catalog decides the presentation, and unresolved ids get the fallback', () => {
  it('loving-kindness renders contemplative, with its authored steps and no circle', () => {
    renderRoute(linkParams(`practice/loving-kindness?duration=60&${SPOOF}`));
    const lk = guidedTimers.find((e) => e.practice.id === 'loving-kindness')!.practice;

    expect(headerTitle()).toHaveTextContent(lk.title, { exact: true });
    expect(screen.queryByTestId(CIRCLE)).toBeNull();
    expect(screen.getByText(lk.instructions![0]!)).toBeTruthy();
  });

  it('breathing-space renders the circle (control for the assertion above)', () => {
    renderRoute(linkParams('practice/breathing-space?duration=60'));
    expect(screen.getByTestId(CIRCLE)).toBeTruthy();
  });

  it.each(['probe', 'social-impact-reflection', 'control-sorting', ...PROTOTYPE_KEYS])(
    '%s resolves to the fallback without throwing',
    (id) => {
      expect(() => resolveLinkedPracticeParams(id)).not.toThrow();
      expect(resolveLinkedPracticeParams(id)).toEqual({
        practiceId: FALLBACK_PRACTICE_ID,
        title: FALLBACK_PRACTICE_TITLE,
        visualMode: 'breathing',
        instructions: undefined,
        moduleId: undefined,
        duration: undefined,
      });
    },
  );

  it('every Object.prototype key, unsanitised, and non-strings resolve to the fallback', () => {
    expect(PROTOTYPE_KEYS.length).toBeGreaterThan(5); // control: the sweep has members
    for (const id of [...Object.getOwnPropertyNames(Object.prototype), '__proto__', '', undefined, null, 7, {}]) {
      expect(resolveLinkedPracticeParams(id as never).title).toBe(FALLBACK_PRACTICE_TITLE);
    }
  });

  it.each(['probe', 'social-impact-reflection', 'constructor', 'toString'])(
    'practice/%s renders the fallback title, the circle, and completes with no quote',
    (id) => {
      expect(() => renderRoute(linkParams(`practice/${id}?duration=60`))).not.toThrow();
      expect(headerTitle()).toHaveTextContent(FALLBACK_PRACTICE_TITLE, { exact: true });
      expect(screen.getByTestId(CIRCLE)).toBeTruthy();

      finish();
      expect(screen.getByText('Practice Complete')).toBeTruthy();
      expect(screen.queryByText(/^— /)).toBeNull();
      expect(renderedTree()).not.toContain('undefined');
      for (const quote of Object.values(PRACTICE_QUOTES)) {
        expect(renderedTree()).not.toContain(quote.text);
      }
    },
  );

  it('the fallback id has no quote, and is no catalog id', () => {
    expect(Object.hasOwn(PRACTICE_QUOTES, FALLBACK_PRACTICE_ID)).toBe(false);
    expect(allPractices.map((e) => e.practice.id)).not.toContain(FALLBACK_PRACTICE_ID);
  });

  it('control: a resolved catalog practice completes WITH its quote', () => {
    renderRoute(linkParams('practice/breathing-space?duration=60'));
    finish();
    expect(screen.getByText(`"${PRACTICE_QUOTES['breathing-space']!.text}"`)).toBeTruthy();
  });

  it('practice ids are unique across the five modules (the lookup ignores moduleId)', () => {
    expect(catalog).toHaveLength(5);
    const ids = allPractices.map((e) => e.practice.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('every guided-timer catalog entry belongs to an authored module', () => {
    expect(guidedTimers.length).toBeGreaterThan(0);
    for (const { moduleId } of guidedTimers) expect(isModuleId(moduleId)).toBe(true);
  });
});

describe('duration: the catalog for a resolved id, the URL clamp only on the fallback', () => {
  /** Seconds the screen actually runs for: PracticeTimerScreen hands Timer milliseconds. */
  const renderedSeconds = (link: string) => {
    renderRoute(linkParams(link));
    expect(mockTimer.durationMs).toBeDefined();
    return mockTimer.durationMs! / 1000;
  };

  it.each(['', '?duration=10', '?duration=99999', '?duration=x'])(
    'a resolved id ignores the URL duration (breathing-space%s)',
    (query) => {
      const bs = guidedTimers.find((e) => e.practice.id === 'breathing-space')!.practice;
      expect(resolveLinkedPracticeParams('breathing-space').duration).toBe(bs.duration);
      expect(renderedSeconds(`practice/breathing-space${query}`)).toBe(bs.duration);
    },
  );

  it('practice/probe with no duration runs 60s, the clamp default, never undefined', () => {
    expect(linkParams('practice/probe').duration).toBeUndefined(); // control: parse never ran
    expect(renderedSeconds('practice/probe')).toBe(LINK_DURATION_DEFAULT_SECONDS);
    expect(LINK_DURATION_DEFAULT_SECONDS).toBe(60);
  });

  it.each([
    ['?duration=60', 60], // breathing-fps-budget.yaml's link
    ['?duration=60&title=Frame+Probe', 60], // its exact pre-DEBUG-679 URL still works
    ['?duration=10', 10],
    ['?duration=5', 10],
    ['?duration=99999', 3600],
    ['?duration=x', 60],
  ])('practice/probe%s keeps the existing clamp: %ss', (query, seconds) => {
    expect(linkParams(`practice/probe${query}`).duration).toBe(seconds);
    expect(renderedSeconds(`practice/probe${query}`)).toBe(seconds);
    expect(screen.getByTestId(CIRCLE)).toBeTruthy();
  });

  it('raw fallback params with a non-number duration also run 60s', () => {
    for (const duration of [undefined, Number.NaN, '45', null]) {
      renderRoute({ practiceId: 'probe', duration } as unknown as PracticeTimerParams);
      expect(mockTimer.durationMs).toBe(LINK_DURATION_DEFAULT_SECONDS * 1000);
      screen.unmount();
    }
  });
});


describe('AC7: moduleId comes from the catalog, never the link', () => {
  it('breathing-space linked with moduleId=interconnected-living credits aware-presence', () => {
    const params = linkParams('practice/breathing-space?duration=60&moduleId=interconnected-living');
    expect(params.moduleId).toBe('interconnected-living'); // control: the link's id did arrive
    const before = useEducationStore.getState().modules;
    const awareBefore = before['aware-presence'].practiceCount;
    const wrongBefore = before['interconnected-living'].practiceCount;

    renderRoute(params);
    finish();

    const after = useEducationStore.getState().modules;
    expect(after['aware-presence'].practiceCount).toBe(awareBefore + 1);
    expect(after['interconnected-living'].practiceCount).toBe(wrongBefore);
    const engagements = useStoicPracticeStore.getState().principleEngagements;
    expect(engagements).toHaveLength(1);
    expect(engagements[0]!.principle).toBe(MODULE_TO_PRINCIPLE_MAP['aware-presence']);
  });
});

describe('AC4: in-app launches render exactly what resolvePracticeRoute sends', () => {
  it.each(guidedTimers.map((e) => [e.practice.id, e]))('%s', (_id, { moduleId, practice }) => {
    const { screen: name, params } = resolvePracticeRoute(practice, moduleId as ModuleId);
    expect(name).toBe('PracticeTimer');
    const sent = params as PracticeTimerParams;
    const linked = resolveLinkedPracticeParams(practice.id);

    expect(linked.title).toBe(sent.title);
    expect(linked.duration).toBe(sent.duration);
    expect(linked.moduleId).toBe(sent.moduleId);
    expect(linked.instructions).toEqual(sent.instructions);
    expect(linked.visualMode).toBe(sent.visualMode ?? 'breathing');
    expect(linked.practiceId).toBe(practice.id);

    renderRoute(sent);
    expect(headerTitle()).toHaveTextContent(practice.title, { exact: true });
  });
});

describe('AC6: the validator strips title with a key-only warning', () => {
  it('a link carrying title still validates, without it', () => {
    DeepLinkValidationService.clearSecurityEvents();
    const result = DeepLinkValidationService.validateDeepLink(
      `being://practice/breathing-space?duration=60&${SPOOF}`,
    );
    expect(result.isValid).toBe(true);
    expect(result.warnings).toContain("Parameter 'title' was stripped (not in allowlist)");
    expect(JSON.stringify(result.warnings)).not.toContain(SPOOF_NUMBER);
    expect(result.sanitizedUrl).not.toContain('title');
    expect(result.sanitizedUrl).not.toContain(SPOOF_NUMBER);
    expect(result.sanitizedUrl).toContain('duration=60'); // control: other params survive
  });
});

describe('usePracticeCompletion looks quotes up by own key only', () => {
  it.each(PROTOTYPE_KEYS)('practiceId %s completes with no quote chrome', (practiceId) => {
    const { result } = renderHook(() =>
      usePracticeCompletion({ practiceId, moduleId: undefined, title: FALLBACK_PRACTICE_TITLE }),
    );
    act(() => result.current.markComplete());
    render(result.current.renderCompletion()!);
    expect(screen.getByText('Practice Complete')).toBeTruthy();
    expect(screen.queryByText(/^— /)).toBeNull();
    expect(renderedTree()).not.toContain('undefined');
  });

  it('control: an authored id still gets its quote and attribution', () => {
    const { result } = renderHook(() =>
      usePracticeCompletion({ practiceId: 'loving-kindness', moduleId: undefined, title: 'Loving-Kindness Practice' }),
    );
    act(() => result.current.markComplete());
    render(result.current.renderCompletion()!);
    expect(screen.getByText(`"${PRACTICE_QUOTES['loving-kindness']!.text}"`)).toBeTruthy();
  });
});

describe('the route reads only practiceId and duration from its params (DEBUG-390: comments stripped)', () => {
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const read = (rel: string) => strip(fs.readFileSync(path.join(APP, 'src', rel), 'utf8'));

  const route = read('core/navigation/PracticeTimerRoute.tsx');
  const navigator = read('core/navigation/CleanRootNavigator.tsx');
  const start = navigator.indexOf('name="PracticeTimer"');
  const block = start === -1 ? '' : navigator.slice(start, navigator.indexOf('</Stack.Screen>', start));

  it('control: both slices are the code they claim to be', () => {
    expect(route).toMatch(/params\.practiceId/);
    expect(route).toMatch(/<PracticeTimerScreen/);
    expect(block).toContain('name="PracticeTimer"');
    expect(block).toMatch(/<PracticeTimerRoute/);
    // The matcher below can go red: it fires on the pre-DEBUG-679 shape.
    expect('title={route.params.title}').toMatch(/\.title\b/);
  });

  it('PracticeTimerRoute never reads title, visualMode, instructions or moduleId from params', () => {
    expect(route).not.toMatch(/params\??\.(title|visualMode|instructions|moduleId)\b/);
    expect(route).not.toMatch(/\.\.\.\s*params\b/);
  });

  it('the PracticeTimer screen block passes route params only to PracticeTimerRoute', () => {
    expect(block).not.toMatch(/\.title\b/);
    expect(block).not.toMatch(/<PracticeTimerScreen/);
  });
});
