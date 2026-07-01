/**
 * BugReportScreen (FEAT-284) — accessibility + submission branches.
 *
 * Pins: the disclosure warning is present; the send button stays disabled until
 * a message is typed; a submitted report calls submitExternalFeedback with the
 * anonymous uid (and NEVER auto-fills email); the 'blocked' result surfaces an
 * in-tree rephrase prompt; 'submitted'/'noop' show the confirmation. The wire
 * from message text → scrubbed Sentry payload is covered separately by
 * __tests__/privacy/feedbackScrub.contract.test.ts.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

const mockSubmit = jest.fn();
jest.mock('@/core/services/logging', () => ({
  submitExternalFeedback: (...args: unknown[]) => mockSubmit(...args),
}));

jest.mock('@/core/services/supabase', () => ({
  supabaseService: { getStatus: () => ({ userId: 'anon-uid-xyz' }) },
}));

import BugReportScreen from '../BugReportScreen';

describe('BugReportScreen', () => {
  beforeEach(() => jest.clearAllMocks());

  it('shows the privacy disclosure naming Sentry and excluding wellness data', () => {
    const { getByText } = render(<BugReportScreen />);
    expect(getByText(/Sentry/)).toBeTruthy();
    expect(getByText(/personal wellness information/i)).toBeTruthy();
  });

  it('labels the message field and send control for screen readers', () => {
    const { getByTestId } = render(<BugReportScreen />);
    expect(getByTestId('bug-report-message').props.accessibilityLabel).toMatch(/bug or feedback/i);
    const button = getByTestId('bug-report-submit');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toMatch(/send report/i);
  });

  it('keeps the send button disabled until a message is typed', () => {
    const { getByTestId } = render(<BugReportScreen />);
    const button = getByTestId('bug-report-submit');
    expect(button.props.accessibilityState.disabled).toBe(true);
    fireEvent.changeText(getByTestId('bug-report-message'), 'the home tab freezes');
    expect(button.props.accessibilityState.disabled).toBe(false);
  });

  it('does not submit an empty report', () => {
    const { getByTestId } = render(<BugReportScreen />);
    fireEvent.press(getByTestId('bug-report-submit'));
    expect(mockSubmit).not.toHaveBeenCalled();
  });

  it('submits with the anonymous uid and no auto-filled email', async () => {
    mockSubmit.mockResolvedValue('submitted');
    const { getByTestId } = render(<BugReportScreen />);
    fireEvent.changeText(getByTestId('bug-report-message'), 'dark mode toggle broken');
    fireEvent.press(getByTestId('bug-report-submit'));

    await waitFor(() => expect(mockSubmit).toHaveBeenCalled());
    const arg = mockSubmit.mock.calls[0][0];
    expect(arg.userId).toBe('anon-uid-xyz');
    expect(arg.email).toBeUndefined();
    expect(arg.message).toMatch(/\[Bug\]/);
  });

  it('confirms success on submitted', async () => {
    mockSubmit.mockResolvedValue('submitted');
    const { getByTestId } = render(<BugReportScreen />);
    fireEvent.changeText(getByTestId('bug-report-message'), 'scroll jank');
    fireEvent.press(getByTestId('bug-report-submit'));
    await waitFor(() => expect(getByTestId('bug-report-success')).toBeTruthy());
  });

  it('treats a dev/sim no-op as success (silent no-op, no error)', async () => {
    mockSubmit.mockResolvedValue('noop');
    const { getByTestId } = render(<BugReportScreen />);
    fireEvent.changeText(getByTestId('bug-report-message'), 'anything');
    fireEvent.press(getByTestId('bug-report-submit'));
    await waitFor(() => expect(getByTestId('bug-report-success')).toBeTruthy());
  });

  it('surfaces an in-tree rephrase prompt when the content guard blocks', async () => {
    mockSubmit.mockResolvedValue('blocked');
    const { getByTestId } = render(<BugReportScreen />);
    fireEvent.changeText(getByTestId('bug-report-message'), 'my phq9 crashed the app');
    fireEvent.press(getByTestId('bug-report-submit'));
    await waitFor(() => expect(getByTestId('bug-report-error')).toBeTruthy());
    expect(getByTestId('bug-report-error').props.children).toMatch(/wellness or crisis/i);
  });
});
