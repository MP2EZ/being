/**
 * MAINT-747 — WeeklyReflectionComposer behaviour (FEAT-194, DEBUG-406).
 *
 * Input clamping and draft mirroring, the Save gate, Android hardware back, focus return
 * on Cancel, and re-seeding the text when the sheet reopens. react-native's
 * BackHandler / AccessibilityInfo / findNodeHandle are the global jest.setup mocks.
 */

import React from 'react';
import { AccessibilityInfo, BackHandler, findNodeHandle } from 'react-native';
import { act, fireEvent, render } from '@testing-library/react-native';

import WeeklyReflectionComposer from '@/features/insights/components/WeeklyReflectionComposer';

const MAX_LEN = 5000;

const mockAddListener = BackHandler.addEventListener as jest.Mock;
const mockFindNodeHandle = findNodeHandle as jest.Mock;
const mockSetFocus = AccessibilityInfo.setAccessibilityFocus as jest.Mock;

type Props = React.ComponentProps<typeof WeeklyReflectionComposer>;

const setup = (overrides: Partial<Props> = {}) => {
  const props: Props = {
    visible: true,
    initialText: '',
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onDraftChange: jest.fn(),
    ...overrides,
  };
  const screen = render(<WeeklyReflectionComposer {...props} />);
  return {
    props,
    screen,
    input: () => screen.getByTestId('weekly-reflection-input'),
    save: () => screen.getByTestId('weekly-reflection-save'),
    cancel: () => screen.getByTestId('weekly-reflection-cancel'),
  };
};

beforeEach(() => {
  mockAddListener.mockClear();
  mockSetFocus.mockClear();
});

describe('WeeklyReflectionComposer — input', () => {
  it('clamps 5001 characters to 5000 and reports the clamped string upward', () => {
    const { props, input } = setup();

    fireEvent.changeText(input(), 'a'.repeat(MAX_LEN + 1));

    expect(input().props.value).toHaveLength(MAX_LEN);
    expect(props.onDraftChange).toHaveBeenLastCalledWith('a'.repeat(MAX_LEN));
  });

  it('passes text at exactly 5000 characters through unchanged', () => {
    const { props, input } = setup();

    fireEvent.changeText(input(), 'b'.repeat(MAX_LEN));

    expect(input().props.value).toHaveLength(MAX_LEN);
    expect(props.onDraftChange).toHaveBeenLastCalledWith('b'.repeat(MAX_LEN));
  });
});

describe('WeeklyReflectionComposer — Save', () => {
  it('is disabled for empty text, and pressing it does not save', () => {
    const { props, save } = setup();

    expect(save().props.accessibilityState.disabled).toBe(true);
    fireEvent.press(save());

    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('is disabled for whitespace-only text, and pressing it does not save', () => {
    const { props, input, save } = setup();

    fireEvent.changeText(input(), '   \n\t  ');

    expect(save().props.accessibilityState.disabled).toBe(true);
    fireEvent.press(save());
    expect(props.onSave).not.toHaveBeenCalled();
  });

  it('is enabled once there is text, and saves the trimmed string', () => {
    const { props, input, save } = setup();

    fireEvent.changeText(input(), '  hi  ');

    expect(save().props.accessibilityState.disabled).toBe(false);
    fireEvent.press(save());
    expect(props.onSave).toHaveBeenCalledTimes(1);
    expect(props.onSave).toHaveBeenCalledWith('hi');
  });
});

describe('WeeklyReflectionComposer — Android hardware back', () => {
  const backHandler = (): (() => boolean) => {
    const call = mockAddListener.mock.calls.filter(([event]) => event === 'hardwareBackPress').pop();
    expect(call).toBeDefined();
    return call![1] as () => boolean;
  };

  it('registers while visible; the handler consumes the press and cancels', () => {
    const { props } = setup();

    const handled = backHandler()();

    expect(handled).toBe(true);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
  });

  it('does not register while the sheet is closed', () => {
    setup({ visible: false });
    expect(mockAddListener.mock.calls.filter(([event]) => event === 'hardwareBackPress')).toHaveLength(0);
  });

  it('removes its listener on unmount', () => {
    const remove = jest.fn();
    mockAddListener.mockReturnValueOnce({ remove });
    const { screen } = setup();

    screen.unmount();

    expect(remove).toHaveBeenCalledTimes(1);
  });
});

describe('WeeklyReflectionComposer — focus', () => {
  const RETURN_TARGET = { name: 'opener' };
  const RETURN_TAG = 4242;
  let originalImpl: (target: unknown) => number | null;

  beforeEach(() => {
    jest.useFakeTimers();
    originalImpl = mockFindNodeHandle.getMockImplementation() as (target: unknown) => number | null;
    // The global mock returns 1 for everything; give the opener its own tag.
    mockFindNodeHandle.mockImplementation((target: unknown) => (target === RETURN_TARGET ? RETURN_TAG : 1));
  });

  afterEach(() => {
    mockFindNodeHandle.mockImplementation(originalImpl);
    jest.useRealTimers();
  });

  it('moves accessibility focus to the title when it opens (not to the opener)', () => {
    setup({ returnFocusRef: { current: RETURN_TARGET as never } });

    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(mockSetFocus).toHaveBeenCalledWith(1);
    expect(mockSetFocus).not.toHaveBeenCalledWith(RETURN_TAG);
  });

  it('returns focus to the opening control on Cancel, before calling onCancel', () => {
    const { props, cancel } = setup({ returnFocusRef: { current: RETURN_TARGET as never } });
    act(() => {
      jest.advanceTimersByTime(400);
    });
    mockSetFocus.mockClear();

    fireEvent.press(cancel());

    expect(mockSetFocus).toHaveBeenCalledTimes(1);
    expect(mockSetFocus).toHaveBeenCalledWith(RETURN_TAG);
    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(mockSetFocus.mock.invocationCallOrder[0]).toBeLessThan(
      (props.onCancel as jest.Mock).mock.invocationCallOrder[0],
    );
  });

  it('still cancels when there is no returnFocusRef, and moves no focus', () => {
    const { props, cancel } = setup();
    act(() => {
      jest.advanceTimersByTime(400);
    });
    mockSetFocus.mockClear();

    fireEvent.press(cancel());

    expect(props.onCancel).toHaveBeenCalledTimes(1);
    expect(mockSetFocus).not.toHaveBeenCalled();
  });
});

describe('WeeklyReflectionComposer — reopening', () => {
  it('shows the new initialText when visible goes false -> true', () => {
    const { screen } = setup({ visible: false, initialText: 'first' });
    expect(screen.queryByTestId('weekly-reflection-input')).toBeNull();

    screen.rerender(
      <WeeklyReflectionComposer
        visible
        initialText="second"
        onSave={jest.fn()}
        onCancel={jest.fn()}
      />,
    );

    expect(screen.getByTestId('weekly-reflection-input').props.value).toBe('second');
  });

  it('discards an abandoned draft: close, reopen with different initialText', () => {
    const { screen, input } = setup({ initialText: 'saved text' });
    fireEvent.changeText(input(), 'half-typed draft');

    const handlers = { onSave: jest.fn(), onCancel: jest.fn() };
    screen.rerender(<WeeklyReflectionComposer visible={false} initialText="saved text" {...handlers} />);
    screen.rerender(<WeeklyReflectionComposer visible initialText="edited elsewhere" {...handlers} />);

    expect(screen.getByTestId('weekly-reflection-input').props.value).toBe('edited elsewhere');
  });
});
