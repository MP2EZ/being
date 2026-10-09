/**
 * DEBUG-621 — the modal practice hosts must not claim the iOS top inset twice.
 *
 * On iOS a `presentation: 'modal'` card is already offset by `insets.top`
 * (@react-navigation/stack forModalPresentationIOS: `marginTop: statusBarHeight`
 * for any card that is not first in the stack). react-native-safe-area-context's
 * SafeAreaView reads the WINDOW's insets, not its on-screen position, so claiming
 * `top` there added a second full inset: a 47pt band on 390x844, 62pt on 402x874.
 * Android presents `modal` as a full-height BottomSheetAndroid and still needs it.
 *
 * What this suite can prove: the edges VALUE each host passes, and the navigation
 * premise that makes dropping `top` on iOS correct. Insets are pinned at zero by
 * the jest safe-area mock, so no test here observes pixels — that capture is
 * DEBUG-626.
 */

import fs from 'fs';
import path from 'path';
import React from 'react';
import { Platform, Text } from 'react-native';
import { render } from '@testing-library/react-native';

import {
  FULL_HEIGHT_EDGES,
  IOS_MODAL_CARD_EDGES,
  getModalPracticeEdges,
} from '@/features/learn/practices/shared/practiceSafeAreaEdges';
import PracticeScreenLayout from '@/features/learn/practices/shared/PracticeScreenLayout';
import GuidedBodyScanScreen from '@/features/learn/practices/GuidedBodyScanScreen';

jest.mock('@/features/learn/practices/shared/usePracticeCompletion', () => ({
  usePracticeCompletion: () => ({
    renderCompletion: () => null,
    markStarted: jest.fn(),
    markComplete: jest.fn(),
  }),
}));

const MODAL_PRACTICE_ROUTES = ['PracticeTimer', 'BodyScan', 'ReflectionTimer', 'GuidedBodyScan'];

const SRC = path.resolve(__dirname, '../../../../src');
const readStripped = (rel: string): string =>
  fs
    .readFileSync(path.join(SRC, rel), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');

describe('getModalPracticeEdges', () => {
  it('drops only the top edge on iOS — the modal card already supplies it', () => {
    expect(getModalPracticeEdges('ios')).toEqual(['bottom']);
  });

  it('keeps top and bottom on Android, where the modal is a full-height sheet', () => {
    expect(getModalPracticeEdges('android')).toEqual(['top', 'bottom']);
  });

  it('claims the bottom edge on every platform', () => {
    for (const os of ['ios', 'android', 'web'] as const) {
      expect(getModalPracticeEdges(os)).toContain('bottom');
    }
  });

  it('never lists left or right (portrait-locked)', () => {
    for (const os of ['ios', 'android'] as const) {
      expect(getModalPracticeEdges(os)).not.toContain('left');
      expect(getModalPracticeEdges(os)).not.toContain('right');
    }
  });

  it('returns module-scope arrays, so a default prop keeps its identity', () => {
    expect(getModalPracticeEdges('ios')).toBe(IOS_MODAL_CARD_EDGES);
    expect(getModalPracticeEdges('android')).toBe(FULL_HEIGHT_EDGES);
    expect(getModalPracticeEdges('ios')).toBe(getModalPracticeEdges('ios'));
  });
});

describe('hosts pass the platform edges to SafeAreaView', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderLayout = (edges?: readonly ('top' | 'bottom')[]) =>
    render(
      <PracticeScreenLayout title="Practice" onBack={() => {}} testID="practice-screen" {...(edges && { edges })}>
        <Text>practice content</Text>
      </PracticeScreenLayout>
    );

  const renderGuided = () =>
    render(
      <GuidedBodyScanScreen
        practiceId="resistance-body-check"
        moduleId="radical-acceptance"
        title="Resistance Body Check"
      />
    );

  it('PracticeScreenLayout defaults to the bottom edge only on iOS', () => {
    expect(Platform.OS).toBe('ios');
    expect(renderLayout().getByTestId('practice-screen').props.edges).toEqual(['bottom']);
  });

  it('PracticeScreenLayout defaults to top and bottom on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(renderLayout().getByTestId('practice-screen').props.edges).toEqual(['top', 'bottom']);
  });

  it('an explicit edges prop still wins over the platform default', () => {
    expect(renderLayout(['top']).getByTestId('practice-screen').props.edges).toEqual(['top']);
  });

  it('GuidedBodyScanScreen claims the bottom edge only on iOS', () => {
    expect(renderGuided().getByTestId('guided-body-scan-screen').props.edges).toEqual(['bottom']);
  });

  it('GuidedBodyScanScreen claims top and bottom on Android', () => {
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(renderGuided().getByTestId('guided-body-scan-screen').props.edges).toEqual([
      'top',
      'bottom',
    ]);
  });
});

/**
 * The iOS rule is only correct while every host is a `modal` card that is never
 * first in the root stack (a first card gets `marginTop: 0` and needs `top` again).
 * If a route stops being modal, or becomes an initial route, this goes red and the
 * top inset has to come back for that host.
 */
describe('navigation premise behind the iOS rule', () => {
  const navigator = readStripped('core/navigation/CleanRootNavigator.tsx');

  const screenBlock = (name: string): string => {
    const start = navigator.indexOf(`name="${name}"`);
    if (start === -1) return '';
    const end = navigator.indexOf('</Stack.Screen>', start);
    return end === -1 ? '' : navigator.slice(start, end);
  };

  it.each(MODAL_PRACTICE_ROUTES)('%s is a headerless modal card', (name) => {
    const block = screenBlock(name);
    expect(block).toContain(`name="${name}"`);
    expect(block).toMatch(/presentation:\s*'modal'/);
    expect(block).toMatch(/headerShown:\s*false/);
  });

  it('no deep-link config can make a practice route the first card', () => {
    const linking = readStripped('core/navigation/linking.ts');
    const initialRoutes = [...linking.matchAll(/initialRouteName:\s*'(\w+)'/g)].map((m) => m[1]);
    expect(initialRoutes.length).toBeGreaterThan(0);
    for (const route of initialRoutes) {
      expect(MODAL_PRACTICE_ROUTES).not.toContain(route);
    }
  });

  it("the root navigator's initial route cannot be a practice route", () => {
    const union = navigator.match(/\[initialRoute,\s*setInitialRoute\]\s*=\s*useState<([^>]*)>/);
    expect(union).not.toBeNull();
    const names = [...(union?.[1] ?? '').matchAll(/'(\w+)'/g)].map((m) => m[1]);
    expect(names).toContain('Main');
    for (const name of names) {
      expect(MODAL_PRACTICE_ROUTES).not.toContain(name);
    }
  });
});
