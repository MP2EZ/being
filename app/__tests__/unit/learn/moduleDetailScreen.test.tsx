/**
 * MAINT-747 — ModuleDetailScreen: load lifecycle, error state, tabs, analytics, cleanup.
 *
 * Complements moduleDetailInvalidId.test.tsx (DEBUG-719), which owns the unauthored-id
 * path. Here the id is authored and the loader is a controllable stub, so each state
 * (pending / resolved / rejected) can be held open and observed.
 *
 * The error state is pinned by testID, role and action, not by its copy.
 */

import React from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';

import type { ModuleContent, ModuleId } from '@/features/learn/types/education';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useRoute: () => ({ key: 'ModuleDetail-1', name: 'ModuleDetail', params: { moduleId: 'aware-presence' } }),
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
jest.mock('@/core/services/moduleContent', () => ({
  ...jest.requireActual('@/core/services/moduleContent'),
  loadModuleContent: (...args: unknown[]) => mockLoadModuleContent(...args),
}));

// The tabs are not under test here.
jest.mock('@/features/learn/tabs/OverviewTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="overview-tab">overview</Text> };
});
jest.mock('@/features/learn/tabs/PracticeTab', () => {
  const { Text } = require('react-native');
  return { __esModule: true, default: () => <Text testID="practice-tab">practice</Text> };
});

import ModuleDetailScreen from '@/features/learn/screens/ModuleDetailScreen';
import {
  resetEducationStoreForErasure,
  useEducationStore,
} from '@/features/learn/stores/educationStore';

const MODULE_ID: ModuleId = 'aware-presence';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const CONTENT = require('../../../assets/modules/module-1-aware-presence.json') as ModuleContent;

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (reason: unknown) => void;
}
function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  resetEducationStoreForErasure();
  mockGoBack.mockClear();
  mockTrackScreenView.mockClear();
  mockTrackLearnContentViewed.mockClear();
  mockLoadModuleContent.mockReset();
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('ModuleDetailScreen — load states', () => {
  it('shows the loading state while the load is pending, and neither content nor error', async () => {
    const pending = deferred<ModuleContent>();
    mockLoadModuleContent.mockReturnValue(pending.promise);

    const screen = render(<ModuleDetailScreen />);

    expect(screen.getByTestId('module-detail-loading')).toBeTruthy();
    expect(screen.queryByTestId('overview-tab')).toBeNull();
    expect(screen.queryByTestId('module-detail-error')).toBeNull();

    await act(async () => {
      pending.resolve(CONTENT);
    });
    expect(screen.queryByTestId('module-detail-loading')).toBeNull();
  });

  it('renders the module header and the overview tab once content resolves', async () => {
    mockLoadModuleContent.mockResolvedValue(CONTENT);

    const screen = render(<ModuleDetailScreen />);

    await waitFor(() => expect(screen.getByTestId('overview-tab')).toBeTruthy());
    expect(mockLoadModuleContent).toHaveBeenCalledWith(MODULE_ID);
    expect(screen.getByText(CONTENT.title)).toBeTruthy();
    expect(screen.queryByTestId('module-detail-error')).toBeNull();
  });

  it('shows an error state with a Go Back button when the load rejects, and Go Back goes back', async () => {
    mockLoadModuleContent.mockRejectedValue(new Error('load failed'));

    const screen = render(<ModuleDetailScreen />);

    const error = await screen.findByTestId('module-detail-error');
    expect(error.props.accessibilityRole).toBe('alert');
    expect(screen.queryByTestId('overview-tab')).toBeNull();
    expect(screen.queryByTestId('module-detail-loading')).toBeNull();

    const goBack = screen.getByTestId('module-detail-error-go-back');
    expect(goBack.props.accessibilityRole).toBe('button');
    expect(goBack.props.accessibilityLabel).toBeTruthy();
    expect(mockGoBack).not.toHaveBeenCalled();

    fireEvent.press(goBack);
    expect(mockGoBack).toHaveBeenCalledTimes(1);
    expect(useEducationStore.getState().currentModule).toBeNull();
  });
});

describe('ModuleDetailScreen — tabs', () => {
  it('switches between Overview and Practice, tracking selection in accessibilityState', async () => {
    mockLoadModuleContent.mockResolvedValue(CONTENT);
    const screen = render(<ModuleDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('overview-tab')).toBeTruthy());

    const overviewTab = () => screen.getByRole('tab', { name: 'Overview tab' });
    const practiceTab = () => screen.getByRole('tab', { name: 'Practice tab' });

    expect(overviewTab().props.accessibilityState.selected).toBe(true);
    expect(practiceTab().props.accessibilityState.selected).toBe(false);

    fireEvent.press(practiceTab());

    expect(screen.getByTestId('practice-tab')).toBeTruthy();
    expect(screen.queryByTestId('overview-tab')).toBeNull();
    expect(overviewTab().props.accessibilityState.selected).toBe(false);
    expect(practiceTab().props.accessibilityState.selected).toBe(true);

    fireEvent.press(overviewTab());

    expect(screen.getByTestId('overview-tab')).toBeTruthy();
    expect(overviewTab().props.accessibilityState.selected).toBe(true);
  });
});

describe('ModuleDetailScreen — analytics', () => {
  it('tracks the screen view and the content view on focus', async () => {
    mockLoadModuleContent.mockResolvedValue(CONTENT);
    const screen = render(<ModuleDetailScreen />);
    await waitFor(() => expect(screen.getByTestId('overview-tab')).toBeTruthy());

    expect(mockTrackScreenView).toHaveBeenCalledWith('ModuleDetailScreen');
    expect(mockTrackLearnContentViewed).toHaveBeenCalledWith(MODULE_ID);
  });
});

describe('ModuleDetailScreen — currentModule lifecycle', () => {
  it('sets currentModule when content resolves and clears it on unmount', async () => {
    mockLoadModuleContent.mockResolvedValue(CONTENT);
    const screen = render(<ModuleDetailScreen />);
    await waitFor(() => expect(useEducationStore.getState().currentModule).toBe(MODULE_ID));

    screen.unmount();

    expect(useEducationStore.getState().currentModule).toBeNull();
  });

  it('leaves currentModule null when unmounted BEFORE the load resolves', async () => {
    const pending = deferred<ModuleContent>();
    mockLoadModuleContent.mockReturnValue(pending.promise);
    const screen = render(<ModuleDetailScreen />);
    expect(useEducationStore.getState().currentModule).toBeNull();

    screen.unmount();
    await act(async () => {
      pending.resolve(CONTENT);
    });

    expect(useEducationStore.getState().currentModule).toBeNull();
  });

  it('leaves currentModule null when unmounted BEFORE the load rejects', async () => {
    const pending = deferred<ModuleContent>();
    mockLoadModuleContent.mockReturnValue(pending.promise);
    const screen = render(<ModuleDetailScreen />);

    screen.unmount();
    await act(async () => {
      pending.reject(new Error('load failed'));
    });

    expect(useEducationStore.getState().currentModule).toBeNull();
  });
});
