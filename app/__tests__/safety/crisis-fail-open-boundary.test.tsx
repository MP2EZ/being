/**
 * DEBUG-341 — fail-open guarantees for the crisis path.
 *
 * WHAT THIS PINS. Every predicate that can hide, dim, or delay the crisis affordance must
 * resolve toward SHOWING it when its input is undefined, errored, or unknown. Before
 * DEBUG-341 three of them failed closed:
 *   • App.tsx had no error boundary at all — a render throw white-screened the app.
 *   • LoadingScreen carried no 988 control, and it renders ABOVE the only thing that does.
 *   • CollapsibleCrisisButton's reduce-motion read defaulted to `false` on error, leaving
 *     the button faded.
 *
 * These are jest tests deliberately, not Maestro flows: a cold-launch race and a thrown
 * render are both far easier to force deterministically here than on a simulator, and the
 * Maestro preamble is the known INFRA-216 flake point.
 */
import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';

import RootCrisisBoundary, {
  ROOT_CRISIS_BOUNDARY_FALLBACK_TEST_ID,
} from '@/features/crisis/components/RootCrisisBoundary';
import Static988Button, {
  STATIC_988_BUTTON_TEST_ID,
  STATIC_988_DIGITS_TEST_ID,
} from '@/features/crisis/components/Static988Button';
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';

jest.mock('@/features/crisis/utils/openCrisisUrl', () => ({
  openCrisisUrl: jest.fn(),
}));

const mockOpenCrisisUrl = openCrisisUrl as jest.MockedFunction<typeof openCrisisUrl>;

/** A component that throws on render, to drive the boundary. */
const Exploding: React.FC = () => {
  throw new Error('simulated render crash');
};

describe('Static988Button — the last-resort control', () => {
  beforeEach(() => jest.clearAllMocks());

  test('dials 988 directly rather than navigating', () => {
    // Navigation is exactly what has unmounted in the boundary case, so a navigate()
    // here would be the silent no-op the whole item exists to remove.
    const { getByTestId } = render(<Static988Button />);
    fireEvent.press(getByTestId(STATIC_988_BUTTON_TEST_ID));
    expect(mockOpenCrisisUrl).toHaveBeenCalledWith('tel:988', { manualLabel: '988' });
  });

  test('offers a second modality (SMS) as well as voice', () => {
    const { getByTestId } = render(<Static988Button />);
    fireEvent.press(getByTestId(`${STATIC_988_BUTTON_TEST_ID}-sms`));
    expect(mockOpenCrisisUrl).toHaveBeenCalledWith('sms:741741?body=HOME', {
      manualLabel: '741741',
    });
  });

  test('renders the literal digits unconditionally', () => {
    // The affordance that survives a device with no telephony AND a dismissed Alert.
    // openCrisisUrl's manual-dial Alert is transient; this text is not.
    const { getByTestId } = render(<Static988Button />);
    const digits = getByTestId(STATIC_988_DIGITS_TEST_ID);
    expect(digits).toBeTruthy();
    expect(digits.props.children).toContain('988');
    expect(digits.props.children).toContain('741741');
  });

  test('the call control meets the enlarged tap-target floor by REAL height', () => {
    // >=56pt of actual height, not hitSlop. hitSlop enlarges the touch target while
    // leaving the VISIBLE target small — and the visible target is what someone with a
    // tremor, or in acute distress, is actually aiming at.
    const { getByTestId } = render(<Static988Button />);
    const style = getByTestId(STATIC_988_BUTTON_TEST_ID).props.style;
    const flat = Array.isArray(style) ? Object.assign({}, ...style) : style;
    expect(flat.minHeight).toBeGreaterThanOrEqual(56);
    // Literal opacity 1 — no animated value can present this control half-faded.
    expect(flat.opacity).toBe(1);
  });

  test('names the destination in its accessibility label', () => {
    // "I need support" is ambiguous on a crash screen; the label must say where it goes.
    const { getByTestId } = render(<Static988Button />);
    expect(getByTestId(STATIC_988_BUTTON_TEST_ID).props.accessibilityLabel).toMatch(/988/);
    expect(getByTestId(STATIC_988_BUTTON_TEST_ID).props.accessibilityRole).toBe('button');
  });
});

describe('RootCrisisBoundary — degrades to a working 988 control, never to nothing', () => {
  beforeEach(() => jest.clearAllMocks());

  const renderExploding = () =>
    render(
      <RootCrisisBoundary>
        <Exploding />
      </RootCrisisBoundary>,
    );

  test('renders children untouched when nothing throws', () => {
    const { getByText } = render(
      <RootCrisisBoundary>
        <Text>healthy tree</Text>
      </RootCrisisBoundary>,
    );
    expect(getByText('healthy tree')).toBeTruthy();
  });

  test('a render throw yields a TAPPABLE 988 control, not a blank screen', () => {
    const { getByTestId } = renderExploding();
    expect(getByTestId(ROOT_CRISIS_BOUNDARY_FALLBACK_TEST_ID)).toBeTruthy();
    fireEvent.press(getByTestId(STATIC_988_BUTTON_TEST_ID));
    expect(mockOpenCrisisUrl).toHaveBeenCalledWith('tel:988', { manualLabel: '988' });
  });

  test('the fallback shows the digits too, so a dismissed Alert leaves something', () => {
    const { getByTestId } = renderExploding();
    expect(getByTestId(STATIC_988_DIGITS_TEST_ID)).toBeTruthy();
  });

  test('reports the error AFTER committing the fallback, and survives a throwing reporter', () => {
    // componentDidCatch runs post-commit, so a reporting failure must not be able to
    // take down the fallback we are already showing — there is no boundary above it.
    const throwingReporter = jest.fn(() => {
      throw new Error('reporter exploded');
    });
    const { getByTestId } = render(
      <RootCrisisBoundary onError={throwingReporter}>
        <Exploding />
      </RootCrisisBoundary>,
    );
    expect(throwingReporter).toHaveBeenCalled();
    expect(getByTestId(STATIC_988_BUTTON_TEST_ID)).toBeTruthy();
  });

  test('does NOT auto-retry — the control cannot be unmounted from under a finger', () => {
    // CrisisErrorBoundary retries on a 5s timer and on AppState 'active'. This boundary
    // deliberately inherits neither: a retry that re-crashes thrashes the fallback.
    jest.useFakeTimers();
    try {
      const { getByTestId } = renderExploding();
      jest.advanceTimersByTime(30_000);
      // Still the fallback, still tappable, after far longer than any retry window.
      expect(getByTestId(STATIC_988_BUTTON_TEST_ID)).toBeTruthy();
    } finally {
      jest.useRealTimers();
    }
  });
});
