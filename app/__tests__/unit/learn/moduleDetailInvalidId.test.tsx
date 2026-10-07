/**
 * DEBUG-719 — ModuleDetailScreen with an unauthored moduleId renders its failed-load state
 * and writes nothing.
 *
 * ModuleDetail is externally reachable (`being://module/<id>`). Before this item a
 * prototype-key id such as `constructor` loaded `Object` as module content, then called
 * `setCurrentModule('constructor')` (which also wrote `modules.constructor`) and
 * `trackLearnContentViewed('constructor')`. An absent params object threw on destructure.
 * The screen now narrows the id itself and, for anything unauthored, renders the existing
 * failed-load copy without touching the store, analytics' content event or the loader.
 *
 * Driven against the REAL educationStore and the REAL loader (wrapped only to count calls).
 */

import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';

let mockParams: Record<string, unknown> | undefined;
const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useRoute: () => ({ key: 'ModuleDetail-1', name: 'ModuleDetail', params: mockParams }),
    useNavigation: () => ({ goBack: mockGoBack }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactActual.useEffect(effect, [effect]),
  };
});

const mockTrackScreenView = jest.fn();
const mockTrackLearnContentViewed = jest.fn();
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: mockTrackScreenView,
    trackLearnContentViewed: mockTrackLearnContentViewed,
  }),
}));

const mockLoadModuleContent = jest.fn();
jest.mock('@/core/services/moduleContent', () => {
  const actual = jest.requireActual('@/core/services/moduleContent');
  return {
    ...actual,
    loadModuleContent: (...args: unknown[]) => {
      mockLoadModuleContent(...args);
      return actual.loadModuleContent(...args);
    },
  };
});

// The tabs are not under test; stub them so a junk content object cannot crash render.
jest.mock('@/features/learn/tabs/OverviewTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="overview-tab">overview</Text> };
});
jest.mock('@/features/learn/tabs/PracticeTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="practice-tab">practice</Text> };
});

import ModuleDetailScreen from '@/features/learn/screens/ModuleDetailScreen';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { clearContentCache } from '@/core/services/moduleContent';

const FAILED_COPY = 'Failed to load module content.';
const PROTOTYPE_KEYS = Object.getOwnPropertyNames(Object.prototype).filter((k) =>
  /^[a-zA-Z0-9-]+$/.test(k),
);

let mockSetCurrentModule: jest.Mock;

beforeEach(() => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@/features/learn/stores/educationStore').resetEducationStoreForErasure();
  const original = useEducationStore.getState().setCurrentModule;
  mockSetCurrentModule = jest.fn(original);
  useEducationStore.setState({ setCurrentModule: mockSetCurrentModule });
  clearContentCache();
  mockLoadModuleContent.mockClear();
  mockTrackScreenView.mockClear();
  mockTrackLearnContentViewed.mockClear();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

const flush = () => act(async () => {});

describe('ModuleDetailScreen — authored id (control)', () => {
  it('loads the module and sets currentModule', async () => {
    mockParams = { moduleId: 'aware-presence' };
    const screen = render(<ModuleDetailScreen />);
    await waitFor(() => expect(screen.queryByTestId('overview-tab')).not.toBeNull());
    expect(screen.queryByText(FAILED_COPY)).toBeNull();
    expect(mockLoadModuleContent).toHaveBeenCalledWith('aware-presence');
    expect(mockSetCurrentModule).toHaveBeenCalledWith('aware-presence');
    expect(useEducationStore.getState().currentModule).toBe('aware-presence');
    expect(mockTrackLearnContentViewed).toHaveBeenCalledWith('aware-presence');
    screen.unmount();
    expect(mockSetCurrentModule).toHaveBeenLastCalledWith(null);
  });
});

describe('ModuleDetailScreen — unauthored id (DEBUG-719)', () => {
  it('control: the prototype-key sweep is non-empty', () => {
    expect(PROTOTYPE_KEYS.length).toBeGreaterThan(5);
    expect(PROTOTYPE_KEYS).toContain('constructor');
  });

  const cases: [string, Record<string, unknown> | undefined][] = [
    ['params absent', undefined],
    ['moduleId undefined', { moduleId: undefined }],
    ['bogus', { moduleId: 'bogus' }],
    ['__proto__', { moduleId: '__proto__' }],
    ...PROTOTYPE_KEYS.map((k): [string, Record<string, unknown>] => [k, { moduleId: k }]),
  ];

  it.each(cases)('%s → failed-load state, no store write, no load, no content event', async (_label, params) => {
    mockParams = params;
    const before = useEducationStore.getState();
    const modulesBefore = before.modules;
    const moduleKeysBefore = Object.keys(modulesBefore).sort();

    const screen = render(<ModuleDetailScreen />);
    await flush();

    expect(screen.getByText(FAILED_COPY)).toBeTruthy();
    expect(screen.queryByTestId('overview-tab')).toBeNull();

    screen.unmount();
    await flush();

    expect(mockSetCurrentModule).not.toHaveBeenCalled();
    expect(mockLoadModuleContent).not.toHaveBeenCalled();
    expect(mockTrackLearnContentViewed).not.toHaveBeenCalled();

    const after = useEducationStore.getState();
    expect(after.currentModule).toBeNull();
    expect(after.modules).toBe(modulesBefore);
    expect(Object.keys(after.modules).sort()).toEqual(moduleKeysBefore);
  });
});
