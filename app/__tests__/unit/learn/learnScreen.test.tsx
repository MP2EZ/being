/**
 * MAINT-747 — LearnScreen at screen level.
 *
 * Real educationStore; navigation and analytics are stubs. getRecommendedModule's own
 * rules are store-tested, so this only checks that the card reflects what the store says.
 */

import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';

import type { ModuleId } from '@/features/learn/types/education';

const mockNavigate = jest.fn();
jest.mock('@react-navigation/native', () => {
  const ReactActual = jest.requireActual('react');
  return {
    ...jest.requireActual('@react-navigation/native'),
    useNavigation: () => ({ navigate: mockNavigate, goBack: jest.fn() }),
    useFocusEffect: (effect: () => void | (() => void)) => ReactActual.useEffect(effect, [effect]),
  };
});

const mockTrackScreenView = jest.fn();
const mockTrackLearnModuleStarted = jest.fn();
jest.mock('@/core/analytics', () => ({
  useAnalytics: () => ({
    trackScreenView: mockTrackScreenView,
    trackLearnModuleStarted: mockTrackLearnModuleStarted,
  }),
}));

import LearnScreen from '@/features/learn/screens/LearnScreen';
import { getAllModuleIds } from '@/core/services/moduleContent';
import {
  resetEducationStoreForErasure,
  useEducationStore,
} from '@/features/learn/stores/educationStore';
import { MODULE_TO_PRINCIPLE_MAP } from '@/features/learn/utils/principleMapping';
import { PRINCIPLES } from '@/features/practices/shared/constants/principles';

const titleOf = (id: ModuleId): string =>
  PRINCIPLES.find((p) => p.key === MODULE_TO_PRINCIPLE_MAP[id])!.title;

beforeEach(() => {
  resetEducationStoreForErasure();
  mockNavigate.mockClear();
  mockTrackScreenView.mockClear();
  mockTrackLearnModuleStarted.mockClear();
});

describe('LearnScreen — module tap', () => {
  it.each(getAllModuleIds())('tapping %s tracks the start BEFORE navigating to ModuleDetail', (id) => {
    const number = getAllModuleIds().indexOf(id) + 1;
    const screen = render(<LearnScreen />);

    fireEvent.press(screen.getByLabelText(new RegExp(`^Module ${number}: ${titleOf(id)},`)));

    expect(mockTrackLearnModuleStarted).toHaveBeenCalledTimes(1);
    expect(mockTrackLearnModuleStarted).toHaveBeenCalledWith(id);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: id });
    expect(mockTrackLearnModuleStarted.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });
});

describe('LearnScreen — recommended card', () => {
  it('with the default store, recommends the first module', () => {
    const first = getAllModuleIds()[0];
    const screen = render(<LearnScreen />);

    expect(screen.getByLabelText(`Start learning ${titleOf(first)}`)).toBeTruthy();
  });

  it('after the first module is completed, recommends a different one (whatever the store says)', () => {
    const first = getAllModuleIds()[0];
    const screen = render(<LearnScreen />);

    act(() => {
      useEducationStore.getState().setModuleStatus(first, 'completed');
    });

    const recommended = useEducationStore.getState().getRecommendedModule();
    expect(recommended).not.toBeNull();
    expect(recommended).not.toBe(first);
    expect(screen.getByLabelText(`Start learning ${titleOf(recommended!)}`)).toBeTruthy();
    expect(screen.queryByLabelText(`Start learning ${titleOf(first)}`)).toBeNull();
  });

  it('pressing the recommended card tracks, then navigates to that module', () => {
    const first = getAllModuleIds()[0];
    const screen = render(<LearnScreen />);

    fireEvent.press(screen.getByLabelText(`Start learning ${titleOf(first)}`));

    expect(mockTrackLearnModuleStarted).toHaveBeenCalledWith(first);
    expect(mockNavigate).toHaveBeenCalledWith('ModuleDetail', { moduleId: first });
    expect(mockTrackLearnModuleStarted.mock.invocationCallOrder[0]).toBeLessThan(
      mockNavigate.mock.invocationCallOrder[0],
    );
  });
});

describe('LearnScreen — other entries', () => {
  it('the Classical Library entry navigates to ClassicalLibrary', () => {
    const screen = render(<LearnScreen />);

    fireEvent.press(screen.getByLabelText('Browse the Classical Library'));

    expect(mockNavigate).toHaveBeenCalledWith('ClassicalLibrary');
    expect(mockTrackLearnModuleStarted).not.toHaveBeenCalled();
  });

  it('tracks the screen view on focus', () => {
    render(<LearnScreen />);
    expect(mockTrackScreenView).toHaveBeenCalledWith('LearnScreen');
  });
});
