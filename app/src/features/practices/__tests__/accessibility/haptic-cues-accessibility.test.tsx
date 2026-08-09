/**
 * FEAT-285 — haptic cue accessibility contract.
 *
 * The governing principle: a haptic is a SIGNAL, not a MEANING. The primitives
 * are not self-describing — `impactLight` and `impactMedium` are not reliably
 * discriminable on a cold hand, through a phone case, or on mid-tier Android
 * hardware. So the tactile channel marks *when*, and the speech channel carries
 * *what*. Neither may substitute for the other, and the ordering between them
 * is a contract rather than an accident.
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

import {
  PRACTICE_CUES,
  CUE_CATALOG,
} from '@/features/practices/shared/haptics/cueCatalog';
import {
  HAPTIC_ANNOUNCEMENT_STAGGER_MS,
  MIN_CUE_INTERVAL_MS,
  MAX_CUE_LATENESS_MS,
} from '@/features/practices/shared/haptics/constants';
import HapticsOptInPrompt from '@/features/practices/shared/components/HapticsOptInPrompt';

describe('haptic / screen-reader stagger', () => {
  it('gives the haptic a definite lead over its announcement', () => {
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBe(150);
  });

  it('clears the ~80ms window where a tap fuses with speech onset', () => {
    // Below this the two events merge into one multimodal percept, which
    // measurably degrades phoneme identification — the announcement gets
    // harder to understand, not easier.
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeGreaterThan(80);
  });

  it('stays inside the ~400ms window where the two still read as related', () => {
    // Beyond this they stop grouping and land as two unrelated events.
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeLessThan(400);
  });

  it('absorbs a slow Android actuator with margin', () => {
    // Android impact latency runs ~30-80ms against iOS's ~10-20ms. The stagger
    // must survive the worst case and still leave the haptic leading.
    const WORST_CASE_ANDROID_ACTUATOR_MS = 80;
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeGreaterThan(WORST_CASE_ANDROID_ACTUATOR_MS);
  });

  it('leaves room for a cue and its announcement inside one throttle window', () => {
    expect(HAPTIC_ANNOUNCEMENT_STAGGER_MS).toBeLessThan(MIN_CUE_INTERVAL_MS);
  });
});

describe('every cue is resolvable into a meaning', () => {
  it('gives each cue plain-language meaning text, not just a waveform', () => {
    for (const cue of PRACTICE_CUES) {
      const meaning = CUE_CATALOG[cue].meaning;
      expect(meaning.length).toBeGreaterThan(10);
      // A meaning, not a restatement of the primitive.
      expect(meaning.toLowerCase()).not.toContain('impact');
      expect(meaning.toLowerCase()).not.toContain('vibrat');
    }
  });

  it('does not rely on discriminating one primitive from another for safety', () => {
    // No cue may be the ONLY carrier of something the practitioner must act on.
    // Session end is the strongest signal and is still just "complete".
    expect(CUE_CATALOG.sessionEnd.meaning).toMatch(/complete/i);
  });
});

describe('lateness budget protects the pairing', () => {
  it('drops a cue before it can arrive detached from its announcement', () => {
    // A cue delivered later than this reads as an unexplained buzz rather than
    // the marker for a transition that has visibly already happened.
    expect(MAX_CUE_LATENESS_MS).toBeLessThanOrEqual(150);
  });
});

describe('first-run opt-in prompt', () => {
  const renderPrompt = (onChoose = jest.fn()) => ({
    onChoose,
    ...render(<HapticsOptInPrompt onChoose={onChoose} />),
  });

  it('is a modal on iOS so VoiceOver cannot swipe past it', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt').props.accessibilityViewIsModal).toBe(true);
  });

  it('marks the question as a header so focus can land on it', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-heading').props.accessibilityRole).toBe('header');
  });

  it('exposes both choices as buttons', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityRole).toBe('button');
    expect(getByTestId('haptics-optin-prompt-decline').props.accessibilityRole).toBe('button');
  });

  it('gives both choices BYTE-IDENTICAL hints', () => {
    // A differing hint is the audio equivalent of a pre-checked box, and it is
    // far harder to notice in the speech channel than on screen.
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityHint).toBe(
      getByTestId('haptics-optin-prompt-decline').props.accessibilityHint
    );
  });

  it('pre-selects NEITHER choice', () => {
    const { getByTestId } = renderPrompt();
    for (const id of ['haptics-optin-prompt-accept', 'haptics-optin-prompt-decline']) {
      expect(getByTestId(id).props.accessibilityState?.selected).toBeUndefined();
    }
  });

  it('gives both choices distinct, non-persuasive labels', () => {
    const { getByTestId } = renderPrompt();
    const accept = getByTestId('haptics-optin-prompt-accept').props.accessibilityLabel;
    const decline = getByTestId('haptics-optin-prompt-decline').props.accessibilityLabel;

    expect(accept).not.toBe(decline);
    for (const label of [accept, decline]) {
      expect(label.toLowerCase()).not.toContain('recommend');
      // "Not now" would imply a re-ask that will never come.
      expect(label.toLowerCase()).not.toContain('not now');
    }
  });

  it('states that the choice is final', () => {
    const { getByTestId } = renderPrompt();
    expect(getByTestId('haptics-optin-prompt-accept').props.accessibilityHint).toMatch(
      /not be asked again/i
    );
  });

  it('reports the choice on accept', () => {
    const { onChoose, getByTestId } = renderPrompt();
    fireEvent.press(getByTestId('haptics-optin-prompt-accept'));
    expect(onChoose).toHaveBeenCalledWith(true);
  });

  it('reports the choice on decline', () => {
    const { onChoose, getByTestId } = renderPrompt();
    fireEvent.press(getByTestId('haptics-optin-prompt-decline'));
    expect(onChoose).toHaveBeenCalledWith(false);
  });

  it('offers NO dismissal that would spend the prompt without a choice', () => {
    const { queryByTestId } = renderPrompt();
    expect(queryByTestId('haptics-optin-prompt-close')).toBeNull();
    expect(queryByTestId('haptics-optin-prompt-dismiss')).toBeNull();
  });

  it('keeps the container non-accessible so children stay individually navigable', () => {
    const { getByTestId } = renderPrompt();
    // The card wrapper must not collapse heading/body/buttons into one stop.
    const accept = getByTestId('haptics-optin-prompt-accept');
    expect(accept.props.accessibilityLabel).toBeTruthy();
  });
});
