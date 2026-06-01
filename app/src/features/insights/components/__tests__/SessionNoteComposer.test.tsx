/**
 * SessionNoteComposer (FEAT-195) — the "Your note" annotation sheet.
 *
 * Pins: the 140-char limit + live counter, the delete affordance only when a
 * note already exists, the save/cancel/delete wiring, and the philosopher-gated
 * microcopy (label exactly "Your note"; no feeling-prescription or
 * verdict/score-coupling language anywhere in the sheet).
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import SessionNoteComposer, {
  SESSION_NOTE_LABEL,
  SESSION_NOTE_PLACEHOLDER,
} from '../SessionNoteComposer';
import { SESSION_NOTE_MAX_LENGTH } from '@/features/assessment/stores/assessmentStore';

function renderComposer(overrides: Partial<React.ComponentProps<typeof SessionNoteComposer>> = {}) {
  const props = {
    visible: true,
    initialText: '',
    onSave: jest.fn(),
    onDelete: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  return { props, ...render(<SessionNoteComposer {...props} />) };
}

describe('SessionNoteComposer (FEAT-195)', () => {
  it('uses the fixed "Your note" label and the approved neutral placeholder', () => {
    const { getByText, getByTestId } = renderComposer();
    expect(getByText(SESSION_NOTE_LABEL)).toBeTruthy();
    expect(getByTestId('session-note-input').props.placeholder).toBe(SESSION_NOTE_PLACEHOLDER);
  });

  it('caps input at SESSION_NOTE_MAX_LENGTH and shows remaining count', () => {
    const { getByTestId } = renderComposer();
    const input = getByTestId('session-note-input');
    // maxLength is enforced natively AND defensively in onChangeText.
    expect(input.props.maxLength).toBe(SESSION_NOTE_MAX_LENGTH);

    fireEvent.changeText(input, 'x'.repeat(SESSION_NOTE_MAX_LENGTH + 20));
    expect(input.props.value).toHaveLength(SESSION_NOTE_MAX_LENGTH);
    expect(getByTestId('session-note-counter').props.children).toBe(0);
  });

  it('updates the live counter as the user types', () => {
    const { getByTestId } = renderComposer();
    fireEvent.changeText(getByTestId('session-note-input'), 'hello');
    expect(getByTestId('session-note-counter').props.children).toBe(SESSION_NOTE_MAX_LENGTH - 5);
  });

  it('hides Delete when there is no existing note, shows it when editing one', () => {
    const empty = renderComposer({ initialText: '' });
    expect(empty.queryByTestId('session-note-delete')).toBeNull();

    const existing = renderComposer({ initialText: 'a prior note' });
    expect(existing.getByTestId('session-note-delete')).toBeTruthy();
  });

  it('saves the trimmed text and disables Save when empty', () => {
    const onSave = jest.fn();
    const { getByTestId } = renderComposer({ onSave });

    // Empty → Save disabled, no callback.
    fireEvent.press(getByTestId('session-note-save'));
    expect(onSave).not.toHaveBeenCalled();

    fireEvent.changeText(getByTestId('session-note-input'), '  new job  ');
    fireEvent.press(getByTestId('session-note-save'));
    expect(onSave).toHaveBeenCalledWith('new job');
  });

  it('wires delete and cancel', () => {
    const onDelete = jest.fn();
    const onCancel = jest.fn();
    const { getByTestId } = renderComposer({ initialText: 'old', onDelete, onCancel });
    fireEvent.press(getByTestId('session-note-delete'));
    expect(onDelete).toHaveBeenCalled();
    fireEvent.press(getByTestId('session-note-cancel'));
    expect(onCancel).toHaveBeenCalled();
  });

  it('microcopy prescribes no feeling and renders no verdict/score-coupling (philosopher gate)', () => {
    const { toJSON } = renderComposer({ initialText: 'x', subtitle: 'May 5' });
    const text = JSON.stringify(toJSON());
    // No feeling/mood prescription.
    expect(text).not.toMatch(/how (are|do) you feel|your mood|emotion/i);
    // No verdict / score-coupling framing in the note surface.
    expect(text).not.toMatch(/improve your (score|trend)|explain this score|fix|cause of/i);
    // Label is exactly the approved string.
    expect(text).toContain(SESSION_NOTE_LABEL);
  });

  it('renders the subtitle context line when provided', () => {
    const { getByText } = renderComposer({ subtitle: 'May 5' });
    expect(getByText('May 5')).toBeTruthy();
  });
});
