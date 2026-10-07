/**
 * "Your answers won't be saved" explainer leaf (FEAT-717 AC3, FEAT-665 slice A2a-ii).
 * Unwired: FEAT-685 mounts it on the screening's first question.
 *
 * Crisis ruling: step 1 only; decides once per mount and never subscribes; plain Text
 * or null, never a throw; storage-only copy, every variant ending with the verbatim
 * support sentence and at most 45 words. Compliance (2026-10-05) added "later" to the
 * refused variant, which can also appear in onboarding, where Profile is not reachable.
 *
 * Seeds the real consent store, so the real predicate decides.
 */

import React from 'react';
import { act, render } from '@testing-library/react-native';
import * as consentStore from '@/core/stores/consentStore';
import type { WellnessWriteBlockReason } from '@/core/stores/consentStore';
import { semantic } from '@/core/theme';
import AssessmentStorageExplainer, {
  STORAGE_EXPLAINER_SUPPORT_SENTENCE,
  explainerCopy,
} from '../AssessmentStorageExplainer';
import { seedWellnessWriteConsent } from '../../../../../__tests__/helpers/wellnessWriteConsent';

const ID = 'assessment-storage-explainer';
const SUPPORT = 'If your answers suggest you may need support, it will still appear right away.';

/** Verbatim from the FEAT-717 body; refused is the 2026-10-05 revision. */
const COPY: Record<WellnessWriteBlockReason, string> = {
  refused:
    "Your answers to this check-in won't be saved, because of your wellness data choice. You can change it later in Profile, under Privacy & Data. If your answers suggest you may need support, it will still appear right away.",
  revoked:
    "Your answers to this check-in won't be saved, because you withdrew your consent. If your answers suggest you may need support, it will still appear right away.",
  under_age:
    "Your answers to this check-in won't be saved, because we can't confirm that you're 18 or older. If your answers suggest you may need support, it will still appear right away.",
  missing:
    "Your answers to this check-in won't be saved, because we can't confirm your privacy choices on this device right now. If your answers suggest you may need support, it will still appear right away.",
  loading:
    "Your privacy choices are still loading, so your answers to this check-in aren't being saved yet. If your answers suggest you may need support, it will still appear right away.",
};
const REASONS = Object.keys(COPY) as WellnessWriteBlockReason[];

/** Storage only: never "not processed / used / seen / reviewed / read". */
const NOT_PROCESSED = /\b(?:processed|used|seen|reviewed|read)\b/i;
const DESTROYED = /\b(?:deleted|erased|discarded|forgotten|lost)\b/i;
const HOTLINE = /988/;
const ALARM = /⚠|\u{1F6A8}/u;
const BANNED = [NOT_PROCESSED, DESTROYED, HOTLINE, ALARM];

const words = (s: string) => s.trim().split(/\s+/).length;

afterEach(() => {
  jest.restoreAllMocks();
  seedWellnessWriteConsent('loading');
});

describe('each block reason renders its copy at step 1', () => {
  it.each(REASONS)('%s', (reason) => {
    seedWellnessWriteConsent(reason);
    const screen = render(<AssessmentStorageExplainer currentStep={1} />);
    const node = screen.getByTestId(ID);
    // The whole render is one host Text: no wrapper, no banner, no touchable.
    expect(screen.toJSON()).toMatchObject({ type: 'Text', props: { testID: ID } });
    expect(node.props.children).toBe(COPY[reason]);
    // Plain text in normal flow: no role, no live region, no action.
    expect(node.props.accessibilityRole).toBeUndefined();
    expect(node.props.accessibilityLiveRegion).toBeUndefined();
    expect(node.props.onPress).toBeUndefined();
    const flat = Object.assign({}, ...[node.props.style].flat());
    expect(flat.color).toBe(semantic.text.muted);
  });

  it('the revoked_relaunched seed (no record after a relaunch) renders the revoked copy', () => {
    seedWellnessWriteConsent('revoked_relaunched');
    expect(render(<AssessmentStorageExplainer currentStep={1} />).getByTestId(ID).props.children).toBe(COPY.revoked);
  });
});

describe('renders nothing otherwise', () => {
  it('granted', () => {
    seedWellnessWriteConsent('granted');
    expect(render(<AssessmentStorageExplainer currentStep={1} />).toJSON()).toBeNull();
  });

  it('the predicate throws: null, never a throw into the question screen', () => {
    seedWellnessWriteConsent('refused');
    jest.spyOn(consentStore, 'decideWellnessWrite').mockImplementation(() => {
      throw new Error('boom');
    });
    expect(render(<AssessmentStorageExplainer currentStep={1} />).toJSON()).toBeNull();
    // Positive control: the spy is what the leaf calls.
    expect(consentStore.decideWellnessWrite).toHaveBeenCalled();
  });

  it.each([2, 9, 0])('blocked, but at step %s', (step) => {
    seedWellnessWriteConsent('refused');
    expect(render(<AssessmentStorageExplainer currentStep={step} />).toJSON()).toBeNull();
  });
});

describe('decides once per mount', () => {
  it('a consent change after mount does not change the text', () => {
    seedWellnessWriteConsent('refused');
    const screen = render(<AssessmentStorageExplainer currentStep={1} />);
    expect(screen.getByTestId(ID).props.children).toBe(COPY.refused);
    act(() => seedWellnessWriteConsent('revoked'));
    expect(screen.getByTestId(ID).props.children).toBe(COPY.refused);
    act(() => seedWellnessWriteConsent('granted'));
    screen.rerender(<AssessmentStorageExplainer currentStep={1} />);
    expect(screen.getByTestId(ID).props.children).toBe(COPY.refused);
  });

  it('a later grant does not make a mounted-while-granted leaf appear', () => {
    seedWellnessWriteConsent('granted');
    const screen = render(<AssessmentStorageExplainer currentStep={1} />);
    act(() => seedWellnessWriteConsent('refused'));
    screen.rerender(<AssessmentStorageExplainer currentStep={1} />);
    expect(screen.queryByTestId(ID)).toBeNull();
  });

  it('calls the predicate once, however often it re-renders', () => {
    seedWellnessWriteConsent('refused');
    const spy = jest.spyOn(consentStore, 'decideWellnessWrite');
    const screen = render(<AssessmentStorageExplainer currentStep={1} />);
    screen.rerender(<AssessmentStorageExplainer currentStep={2} />);
    screen.rerender(<AssessmentStorageExplainer currentStep={1} />);
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('the copy table', () => {
  it.each(REASONS)('%s matches the body verbatim', (reason) => {
    expect(explainerCopy(reason)).toBe(COPY[reason]);
  });

  it('the refused variant carries the 2026-10-05 "later"', () => {
    expect(COPY.refused).toContain('You can change it later in Profile, under Privacy & Data.');
  });

  it.each(REASONS)('%s ends with the verbatim support sentence and is at most 45 words', (reason) => {
    const copy = explainerCopy(reason) ?? '';
    expect(STORAGE_EXPLAINER_SUPPORT_SENTENCE).toBe(SUPPORT);
    expect(copy.endsWith(` ${SUPPORT}`)).toBe(true);
    expect(words(copy)).toBeLessThanOrEqual(45);
  });

  it.each(REASONS)('%s describes storage only: no processing, destruction, hotline or alarm wording', (reason) => {
    const copy = explainerCopy(reason) ?? '';
    for (const banned of BANNED) expect(copy).not.toMatch(banned);
  });

  it('matcher self-check (DEBUG-390): each banned pattern fires on the wording it bans', () => {
    expect("Your answers won't be used.").toMatch(NOT_PROCESSED);
    expect('They are not processed or reviewed.').toMatch(NOT_PROCESSED);
    expect('Nothing is seen or read.').toMatch(NOT_PROCESSED);
    for (const w of ['deleted', 'erased', 'discarded', 'forgotten', 'lost']) {
      expect(`Your answers will be ${w}.`).toMatch(DESTROYED);
    }
    expect('Call or text 988.').toMatch(HOTLINE);
    expect('⚠️ Not saved').toMatch(ALARM);
    expect('\u{1F6A8} Not saved').toMatch(ALARM);
    // And the word counter counts words.
    expect(words('one two  three')).toBe(3);
  });
});
