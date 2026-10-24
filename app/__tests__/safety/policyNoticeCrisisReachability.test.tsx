/**
 * POLICY-CHANGE NOTICE CRISIS REACHABILITY (FEAT-860, AC2)
 *
 * Sited in `app/__tests__/safety/` so `npm run test:safety` (a directory pattern) runs it.
 *
 * The notice is an INLINE CARD in Home's ScrollView. Home hosts the 988 button via the root
 * `RootCrisisButton`, so the failure this file guards is the card ever standing between a user
 * and that button: a native Modal/Alert (a separate window, the button not on screen at all),
 * an accessibility-hiding prop (the button leaves a screen reader's tree), a focus move on
 * mount, a control inside the button's tap column, or a storage fault taking Home down.
 *
 * Source-shape assertions strip comments first (DEBUG-390): the component's header names every
 * one of these anti-patterns in prose, and a match on a comment is not a use.
 */
import fs from 'fs';
import path from 'path';
import React from 'react';
import { AccessibilityInfo, Modal, ScrollView, Text, View } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { spacing } from '@/core/theme';

const mockSecure = new Map<string, string>();
let mockStorageRejects = false;
const mockSettings = {
  settings: { onboardingCompleted: true } as { onboardingCompleted: boolean } | null,
  getLastActiveTimestamp: () => Date.now(),
};
const mockNavigate = jest.fn();

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (k: string) => {
    if (mockStorageRejects) throw new Error('keychain locked');
    return mockSecure.get(k) ?? null;
  }),
  setItemAsync: jest.fn(async (k: string, v: string) => {
    if (mockStorageRejects) throw new Error('keychain locked');
    mockSecure.set(k, v);
  }),
  deleteItemAsync: jest.fn(async (k: string) => {
    mockSecure.delete(k);
  }),
}));
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: mockNavigate }),
  useFocusEffect: (cb: () => void) => cb(),
}));
jest.mock('@/core/navigation/navigationRef', () => ({
  navigationRef: { isReady: () => true, navigate: jest.fn() },
  getActiveRootRouteName: jest.fn(),
}));
jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({ openCrisisUrl: jest.fn() }));
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({ trackScreenView: jest.fn(), trackGuidanceOpened: jest.fn() }),
}));
jest.mock('@/core/services/featureFlags', () => ({ isFeatureEnabled: () => false }));
jest.mock('@/features/practices/stores/stoicPracticeStore', () => {
  const state = { isCheckInCompletedToday: () => false };
  return {
    useStoicPracticeStore: (selector?: (s: typeof state) => unknown) =>
      selector ? selector(state) : state,
  };
});
jest.mock('@/core/stores/settingsStore', () => ({
  useSettingsStore: (selector?: (s: typeof mockSettings) => unknown) =>
    selector ? selector(mockSettings) : mockSettings,
  useAccessibilitySettings: () => ({ reducedMotion: true }),
}));
jest.mock('@/features/assessment/components/AssessmentStatusBadge', () => ({
  __esModule: true,
  default: () => null,
}));
jest.mock('@/features/home/components/IntroOverlay', () => ({
  __esModule: true,
  IntroOverlay: () => null,
  default: () => null,
}));

import CleanHomeScreen from '@/features/home/screens/CleanHomeScreen';
import { RootCrisisButton, ROOT_CRISIS_BUTTON_TEST_ID } from '@/features/crisis/components/RootCrisisButton';
import {
  CRISIS_BUTTON_EXCLUSION_RECT,
  intersectsCrisisButtonExclusion,
} from '@/features/crisis/constants/crisisButtonGeometry';
import { POLICY_NOTICE_TEST_IDS } from '@/features/consent/components/PolicyChangeNotice';
import { PRIVACY_POLICY_ACK_KEY } from '@/features/consent/services/policyAck';
import { getPolicyRevisions } from '@/features/consent/services/policyRevisions';
import { useConsentStore } from '@/core/stores/consentStore';
import { expectExclusionCheckWired } from '../helpers/crisisExclusionLayoutEvent';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const guard = require('../../scripts/check-modal-occlusion-guard.js') as {
  stripComments: (src: string) => string;
  findModalJsx: (src: string) => number[];
  findPresenterCalls: (src: string) => Array<{ name: string; line: number }>;
  findAliasedModalImports: (src: string) => string[];
};

const SRC = path.resolve(__dirname, '..', '..', 'src');
const APP = path.resolve(__dirname, '..', '..');
const code = (abs: string): string => guard.stripComments(fs.readFileSync(abs, 'utf8'));
const src = (rel: string): string => code(path.join(SRC, rel));

const NOTICE_COMPONENT = 'features/consent/components/PolicyChangeNotice.tsx';
const NOTICE_HOOK = 'features/consent/hooks/usePolicyChangeNotice.ts';
const NOTICE_SOURCES = [NOTICE_COMPONENT, NOTICE_HOOK];

const walk = (dir: string, acc: string[] = []): string[] => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '__tests__') continue;
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs, acc);
    else if (/\.(ts|tsx)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) acc.push(abs);
  }
  return acc;
};

const GATE = JSON.stringify({
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
  mentalHealthProcessingConsent: true,
  timestamp: 1_790_000_000_000,
  version: '1.1.0',
});

beforeEach(() => {
  mockSecure.clear();
  mockSecure.set('legal_gate_consents_v1', GATE);
  mockStorageRejects = false;
  mockSettings.settings = { onboardingCompleted: true };
  mockNavigate.mockClear();
  useConsentStore.setState({ consentStatus: 'valid' });
});

// ───────────────────────── static pins ─────────────────────────

describe('importer set: the notice is reachable from Home and nowhere else', () => {
  const importersOf = (needle: RegExp): string[] =>
    [...walk(SRC), path.join(APP, 'App.tsx')]
      .filter((file) => needle.test(code(file)))
      .map((file) => path.relative(SRC, file).split(path.sep).join('/'));

  it('only CleanHomeScreen.tsx imports PolicyChangeNotice', () => {
    expect(importersOf(/components\/PolicyChangeNotice['"]/)).toEqual([
      'features/home/screens/CleanHomeScreen.tsx',
    ]);
  });

  it('only the notice imports the hook', () => {
    expect(importersOf(/hooks\/usePolicyChangeNotice['"]/)).toEqual([NOTICE_COMPONENT]);
  });

  it('only the hook, the store, the e2e seed and the notice reach the ack module', () => {
    expect(importersOf(/services\/policyAck['"]/).sort()).toEqual(
      [
        'core/config/e2eSeed.ts',
        'core/stores/consentStore.ts',
        NOTICE_HOOK,
      ].sort(),
    );
  });

  it('the consent barrel re-exports none of it (FEAT-376)', () => {
    const barrel = src('features/consent/index.ts');
    expect(barrel.length).toBeGreaterThan(200);
    for (const name of ['PolicyChangeNotice', 'usePolicyChangeNotice', 'policyAck', 'policyRevisions', 'policyMaterialChanges']) {
      expect(barrel).not.toContain(name);
    }
  });

  it('THE MATCHER CAN GO RED: it finds the real importer and the comment-stripping is live', () => {
    expect(importersOf(/components\/PolicyChangeNotice['"]/)).toHaveLength(1);
    expect(fs.readFileSync(path.join(SRC, 'features/home/screens/CleanHomeScreen.tsx'), 'utf8')).toMatch(
      /FEAT-860 — direct path/,
    );
    expect(code(path.join(SRC, 'features/home/screens/CleanHomeScreen.tsx'))).not.toMatch(/FEAT-860 — direct path/);
  });
});

describe('launch is never blocked: the crisis path and the root import neither the notice nor the ack', () => {
  const ROOT_AND_CRISIS = [
    'core/navigation/CleanRootNavigator.tsx',
    'core/navigation/navigationRef.ts',
    'features/crisis/components/RootCrisisButton.tsx',
    'features/crisis/screens/CrisisResourcesScreen.tsx',
  ];
  const FORBIDDEN =
    /PolicyChangeNotice|usePolicyChangeNotice|services\/policyAck|policyRevisions|policyMaterialChanges/;

  it.each(ROOT_AND_CRISIS)('%s', (rel) => {
    const body = src(rel);
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toMatch(FORBIDDEN);
  });

  it('App.tsx', () => {
    const body = code(path.join(APP, 'App.tsx'));
    expect(body.length).toBeGreaterThan(100);
    expect(body).not.toMatch(FORBIDDEN);
  });

  it('THE MATCHER CAN GO RED', () => {
    expect("import X from '@/features/consent/components/PolicyChangeNotice';").toMatch(FORBIDDEN);
    expect("import { y } from '@/features/consent/services/policyAck';").toMatch(FORBIDDEN);
  });
});

describe('the notice presents nothing and hides nothing', () => {
  it.each(NOTICE_SOURCES)('%s: no Modal, no Alert, no presenter call', (rel) => {
    const body = src(rel);
    expect(body.length).toBeGreaterThan(500);
    expect(guard.findModalJsx(body)).toEqual([]);
    expect(guard.findAliasedModalImports(body)).toEqual([]);
    expect(guard.findPresenterCalls(body)).toEqual([]);
    expect(body).not.toMatch(/\bModal\b/);
    expect(body).not.toMatch(/\bAlert\b/);
    expect(body).not.toMatch(/\bActionSheetIOS\b/);
  });

  it.each(NOTICE_SOURCES)('%s: no accessibility-hiding or modal props', (rel) => {
    const body = src(rel);
    expect(body).not.toMatch(/accessibilityViewIsModal\s*[=:]/);
    expect(body).not.toMatch(/accessibilityElementsHidden\s*[=:]/);
    expect(body).not.toMatch(/importantForAccessibility\s*[=:]/);
    expect(body).not.toMatch(/no-hide-descendants/);
    expect(body).not.toMatch(/aria-(modal|hidden)\s*[=:]/);
  });

  it.each(NOTICE_SOURCES)('%s: no focus move, announcement or focus trap', (rel) => {
    const body = src(rel);
    expect(body).not.toMatch(/setAccessibilityFocus/);
    expect(body).not.toMatch(/announceForAccessibility/);
    expect(body).not.toMatch(/AccessibilityInfo/);
    expect(body).not.toMatch(/FocusProvider|FocusManager|useFocusTrap/);
    expect(body).not.toMatch(/\bautoFocus\b/);
  });

  it('the notice offers acknowledgement, never acceptance', () => {
    const body = src(NOTICE_COMPONENT);
    expect(body).toContain('Got it');
    expect(body).not.toMatch(/\bAccept\b|I agree|\bAgree\b/);
  });

  it('THE MATCHERS CAN GO RED: they fire on known-bad literals', () => {
    expect(guard.findModalJsx('<Modal visible>')).toHaveLength(1);
    expect(guard.findPresenterCalls('Sharing.shareAsync(uri)')).toHaveLength(1);
    expect('<View accessibilityViewIsModal={true} />').toMatch(/accessibilityViewIsModal\s*[=:]/);
    expect("<View importantForAccessibility='no-hide-descendants' />").toMatch(/importantForAccessibility\s*[=:]/);
    expect('AccessibilityInfo.setAccessibilityFocus(node)').toMatch(/setAccessibilityFocus/);
  });
});

// ───────────────────────── rendered behaviour ─────────────────────────

/** Home and the root crisis button as siblings, as CleanRootNavigator mounts them. */
const Harness: React.FC = () => (
  <View style={{ flex: 1 }}>
    <CleanHomeScreen />
    <RootCrisisButton routeName="Main" />
  </View>
);

const settle = () =>
  act(async () => {
    for (let i = 0; i < 5; i += 1) await new Promise<void>((r) => setImmediate(r));
  });

type HostNode = { props: Record<string, unknown>; children?: Array<HostNode | string> };
const collect = (node: HostNode | string | null, acc: HostNode[] = []): HostNode[] => {
  if (node === null || typeof node === 'string') return acc;
  acc.push(node);
  for (const child of node.children ?? []) collect(child, acc);
  return acc;
};

describe('while the notice shows, the 988 affordance is on screen and in the accessibility tree', () => {
  it('shows the notice with the real policy and one item per material revision', async () => {
    const { findByTestId, getByTestId } = render(<Harness />);
    await findByTestId(POLICY_NOTICE_TEST_IDS.card);
    for (const version of getPolicyRevisions().materialVersions) {
      expect(getByTestId(`policy-change-notice-item-${version}`)).toBeTruthy();
    }
  });

  it('crisis-button-root is present, not hidden from accessibility, and outside the card', async () => {
    const { findByTestId, queryByTestId } = render(<Harness />);
    const card = await findByTestId(POLICY_NOTICE_TEST_IDS.card);
    expect(card).toBeTruthy();

    const button = queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID, { includeHiddenElements: false });
    expect(button).not.toBeNull();
    expect(button?.props.accessible).toBe(true);
    expect((button?.props.accessibilityLabel as string).length).toBeGreaterThan(0);

    let parent = (button as unknown as { parent: { props: { testID?: string }; parent: unknown } | null }).parent;
    while (parent) {
      expect(parent.props.testID).not.toBe(POLICY_NOTICE_TEST_IDS.card);
      parent = parent.parent as typeof parent;
    }
  });

  it('nothing in the rendered tree hides or traps accessibility focus', async () => {
    const { findByTestId, toJSON } = render(<Harness />);
    await findByTestId(POLICY_NOTICE_TEST_IDS.card);
    const nodes = collect(toJSON() as unknown as HostNode);
    expect(nodes.length).toBeGreaterThan(20);
    for (const node of nodes) {
      expect(node.props.accessibilityViewIsModal).not.toBe(true);
      expect(node.props.accessibilityElementsHidden).not.toBe(true);
      expect(node.props.importantForAccessibility).not.toBe('no-hide-descendants');
      expect(node.props['aria-modal']).not.toBe(true);
      expect(node.props['aria-hidden']).not.toBe(true);
    }
  });

  it('renders no native Modal', async () => {
    const { findByTestId, UNSAFE_queryAllByType } = render(<Harness />);
    await findByTestId(POLICY_NOTICE_TEST_IDS.card);
    expect(UNSAFE_queryAllByType(Modal)).toHaveLength(0);
  });

  it('sits inside the scroll container, before the daily practice card', async () => {
    const { findByTestId, toJSON, UNSAFE_getAllByType } = render(<Harness />);
    const card = await findByTestId(POLICY_NOTICE_TEST_IDS.card);

    const ids = collect(toJSON() as unknown as HostNode)
      .map((n) => n.props.testID)
      .filter((id): id is string => typeof id === 'string');
    const noticeAt = ids.indexOf(POLICY_NOTICE_TEST_IDS.card);
    expect(noticeAt).toBeGreaterThanOrEqual(0);
    expect(ids.indexOf('checkin-card-daily-loop')).toBeGreaterThan(noticeAt);

    const scroll = UNSAFE_getAllByType(ScrollView)[0];
    const within = (node: { children?: unknown }): boolean =>
      ((node?.children ?? []) as Array<{ children?: unknown }>).some(
        (child) => child === (card as unknown) || within(child),
      );
    expect(within(scroll as unknown as { children?: unknown })).toBe(true);
  });

  it('moves no focus and announces nothing on mount', async () => {
    const setFocus = jest.spyOn(AccessibilityInfo, 'setAccessibilityFocus');
    const announce = jest.spyOn(AccessibilityInfo, 'announceForAccessibility');
    try {
      const { findByTestId } = render(<Harness />);
      await findByTestId(POLICY_NOTICE_TEST_IDS.card);
      await settle();
      expect(setFocus).not.toHaveBeenCalled();
      expect(announce).not.toHaveBeenCalled();
    } finally {
      setFocus.mockRestore();
      announce.mockRestore();
    }
  });

  it('writes no acknowledgement on render', async () => {
    const { findByTestId } = render(<Harness />);
    await findByTestId(POLICY_NOTICE_TEST_IDS.card);
    await settle();
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
  });
});

describe('the two controls', () => {
  it('Read the policy opens the bundled privacy policy and records nothing', async () => {
    const { findByTestId } = render(<Harness />);
    fireEvent.press(await findByTestId(POLICY_NOTICE_TEST_IDS.read));
    expect(mockNavigate).toHaveBeenCalledWith('Profile', {
      screen: 'LegalDocument',
      params: { documentType: 'privacy-policy' },
    });
    expect(mockSecure.has(PRIVACY_POLICY_ACK_KEY)).toBe(false);
  });

  it('Got it records the acknowledgement, removes the card and leaves 988 in place', async () => {
    const { findByTestId, queryByTestId } = render(<Harness />);
    fireEvent.press(await findByTestId(POLICY_NOTICE_TEST_IDS.dismiss));
    await waitFor(() => expect(queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull());
    expect(JSON.parse(mockSecure.get(PRIVACY_POLICY_ACK_KEY) as string)).toMatchObject({
      source: 'notice',
      version: getPolicyRevisions().headerVersion,
    });
    expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).not.toBeNull();
  });

  it('does not show again once acknowledged', async () => {
    const first = render(<Harness />);
    fireEvent.press(await first.findByTestId(POLICY_NOTICE_TEST_IDS.dismiss));
    await waitFor(() => expect(first.queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull());
    first.unmount();

    const second = render(<Harness />);
    await second.findByTestId('home-screen');
    await settle();
    expect(second.queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull();
  });
});

describe('both controls keep their frames out of the crisis button column', () => {
  const IDS = [POLICY_NOTICE_TEST_IDS.read, POLICY_NOTICE_TEST_IDS.dismiss] as const;

  it.each(IDS)('%s sets marginRight on the element carrying the testID, never paddingRight', async (id) => {
    const { findByTestId } = render(<Harness />);
    const style = (await import('react-native')).StyleSheet.flatten(
      (await findByTestId(id)).props.style,
    ) as Record<string, number | undefined>;
    expect(style.marginRight).toBe(CRISIS_BUTTON_EXCLUSION_RECT.left);
    expect(style.paddingRight).toBeUndefined();
    expect(style.marginHorizontal).toBeUndefined();
  });

  it.each(IDS)('%s: intersectsCrisisButtonExclusion is false at every resting height and width', async (id) => {
    const { findByTestId } = render(<Harness />);
    const { StyleSheet } = await import('react-native');
    const style = StyleSheet.flatten((await findByTestId(id)).props.style) as Record<string, number>;
    for (const screenWidth of [320, 375, 430]) {
      const width = screenWidth - spacing[24] - style.marginRight - spacing[24];
      for (let y = 0; y <= 900; y += 25) {
        expect(
          intersectsCrisisButtonExclusion(
            { x: spacing[24], y, width, height: style.minHeight },
            { width: screenWidth, height: 812 },
          ),
        ).toBe(false);
      }
    }
  });

  it('THE PREDICATE CAN GO RED: the same frame WITHOUT the inset intersects', () => {
    expect(
      intersectsCrisisButtonExclusion(
        { x: spacing[24], y: 700, width: 375 - spacing[24] * 2, height: 44 },
        { width: 375, height: 812 },
      ),
    ).toBe(true);
  });

  it.each(IDS)('%s carries the __DEV__ exclusion check', async (id) => {
    const { findByTestId } = render(<Harness />);
    await expectExclusionCheckWired(await findByTestId(id), id);
  });
});

describe('storage failure never takes Home or 988 down', () => {
  class Boundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
    state = { failed: false };
    static getDerivedStateFromError() {
      return { failed: true };
    }
    render() {
      return this.state.failed ? <Text testID="boundary-fired">failed</Text> : this.props.children;
    }
  }

  it('with every storage call rejecting: Home and crisis-button-root render, no card, no boundary', async () => {
    mockStorageRejects = true;
    const { findByTestId, queryByTestId } = render(
      <Boundary>
        <Harness />
      </Boundary>,
    );
    await findByTestId('home-screen');
    await settle();
    expect(queryByTestId('boundary-fired')).toBeNull();
    expect(queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull();
    expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).not.toBeNull();
    expect(queryByTestId('checkin-card-daily-loop')).not.toBeNull();
  });

  it('a failing "Got it" write does not throw, hides the card and keeps 988', async () => {
    const { findByTestId, queryByTestId } = render(
      <Boundary>
        <Harness />
      </Boundary>,
    );
    const dismiss = await findByTestId(POLICY_NOTICE_TEST_IDS.dismiss);
    mockStorageRejects = true;
    fireEvent.press(dismiss);
    await waitFor(() => expect(queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull());
    expect(queryByTestId('boundary-fired')).toBeNull();
    expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).not.toBeNull();
  });
});

describe('the card does not show when the predicate is not met', () => {
  it.each(['missing', 'version_mismatch', 'revoked', 'integrity_error'] as const)(
    'consentStatus %s',
    async (status) => {
      useConsentStore.setState({ consentStatus: status });
      const { findByTestId, queryByTestId } = render(<Harness />);
      await findByTestId('home-screen');
      await settle();
      expect(queryByTestId(POLICY_NOTICE_TEST_IDS.card)).toBeNull();
      expect(queryByTestId(ROOT_CRISIS_BUTTON_TEST_ID)).not.toBeNull();
    },
  );
});
