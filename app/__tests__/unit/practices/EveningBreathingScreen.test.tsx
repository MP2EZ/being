/**
 * Evening BreathingScreen Tests (TEST-08 / MAINT-166 PR 6)
 *
 * BreathingScreen is a thin wrapper around SharedBreathingScreen. These tests
 * verify the wrapper's contract: prop wiring, navigation flow, and onSave
 * payload shape for both completion and skip paths. SharedBreathingScreen
 * itself is tested separately — here it's stubbed so the wrapper logic can
 * be exercised in isolation.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

// Capture the props passed to SharedBreathingScreen so we can assert on
// what BreathingScreen wires through, and so the test can drive the
// onComplete / onSkip callbacks directly.
const sharedBreathingScreenPropsLog: any[] = [];

jest.mock('@/features/practices/shared/components', () => {
  const RealReact = require('react');
  const { View, Text, TouchableOpacity } = require('react-native');

  return {
    SharedBreathingScreen: (props: any) => {
      sharedBreathingScreenPropsLog.push(props);
      return RealReact.createElement(View, { testID: props.testID }, [
        RealReact.createElement(Text, { key: 'title' }, props.title),
        RealReact.createElement(Text, { key: 'subtitle' }, props.subtitle),
        RealReact.createElement(
          TouchableOpacity,
          {
            key: 'complete',
            testID: 'mock-complete',
            onPress: props.onComplete,
          },
          RealReact.createElement(Text, null, 'mock-complete')
        ),
        RealReact.createElement(
          TouchableOpacity,
          {
            key: 'skip',
            testID: 'mock-skip',
            onPress: props.onSkip,
          },
          RealReact.createElement(Text, null, 'mock-skip')
        ),
      ]);
    },
  };
});

import BreathingScreen from '@/features/practices/evening/screens/BreathingScreen';

const makeProps = (overrides: Partial<any> = {}) => {
  const navigation = {
    navigate: jest.fn(),
    goBack: jest.fn(),
  };
  const route = {
    params: undefined,
    ...overrides.route,
  };
  return {
    navigation: navigation as any,
    route: route as any,
    onSave: jest.fn(),
    ...overrides,
  };
};

describe('Evening BreathingScreen', () => {
  beforeEach(() => {
    sharedBreathingScreenPropsLog.length = 0;
  });

  it('renders SharedBreathingScreen with evening theme and copy', () => {
    const props = makeProps();
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.theme).toBe('evening');
    expect(passed.title).toBe("Let's settle into evening");
    expect(passed.subtitle).toBe("Let the day's activity settle.");
    expect(passed.testID).toBe('evening-breathing-screen');
  });

  it('passes the 60-second duration and 4-4-6 breathing pattern', () => {
    const props = makeProps();
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.duration).toBe(60000);
    expect(passed.breathingPattern).toEqual({ inhale: 4000, hold: 4000, exhale: 6000 });
  });

  it('passes the three-item Stoic guidance prompt', () => {
    const props = makeProps();
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.guidanceItems).toHaveLength(3);
    expect(passed.guidanceItems).toEqual([
      "Where you hold the day's tension",
      'The rhythm of your breath',
      'The body settling',
    ]);
  });

  it('passes the localized phase text', () => {
    const props = makeProps();
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.phaseText).toEqual({
      inhale: 'Breathe in...',
      hold: 'Hold...',
      exhale: 'Release...',
    });
  });

  it('propagates wasCompleted=false when no initialData is present', () => {
    const props = makeProps();
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.wasCompleted).toBe(false);
  });

  it('propagates wasCompleted=true when route.params.initialData.completed is true', () => {
    const props = makeProps({
      route: { params: { initialData: { completed: true } } },
    });
    render(<BreathingScreen {...props} />);

    const passed = sharedBreathingScreenPropsLog[0];
    expect(passed.wasCompleted).toBe(true);
  });

  it('on complete: calls onSave with completed:true + navigates to Gratitude', () => {
    const props = makeProps();
    const { getByTestId } = render(<BreathingScreen {...props} />);

    fireEvent.press(getByTestId('mock-complete'));

    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: true,
        durationSeconds: 60,
        timestamp: expect.any(Date),
      })
    );
    expect(props.navigation.navigate).toHaveBeenCalledWith('Gratitude');
  });

  it('on skip: calls onSave with skipped:true + durationSeconds:0 + navigates to Gratitude', () => {
    const props = makeProps();
    const { getByTestId } = render(<BreathingScreen {...props} />);

    fireEvent.press(getByTestId('mock-skip'));

    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        completed: false,
        durationSeconds: 0,
        skipped: true,
        timestamp: expect.any(Date),
      })
    );
    expect(props.navigation.navigate).toHaveBeenCalledWith('Gratitude');
  });

  it('navigates even when onSave is not provided (onSave is optional)', () => {
    const props = makeProps({ onSave: undefined });
    const { getByTestId } = render(<BreathingScreen {...props} />);

    expect(() => fireEvent.press(getByTestId('mock-complete'))).not.toThrow();
    expect(props.navigation.navigate).toHaveBeenCalledWith('Gratitude');
  });
});
