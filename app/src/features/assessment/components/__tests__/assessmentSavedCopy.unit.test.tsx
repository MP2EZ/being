/**
 * The screening no longer promises that answers are saved (FEAT-717 AC6, FEAT-665 slice A2a-ii).
 *
 * Once FEAT-685 withholds Art. 9 writes, "your progress will be saved" and "your
 * responses are safely stored" become false for a user who refused. Crisis ruling:
 * literal-only edits, no statement reordering in handleCompleteAssessment, alert titles
 * and buttons unchanged. Pinned over comment-stripped source (DEBUG-390) with a
 * positive control, plus a rendered assertion for the introduction bullet.
 */
const mockNavigate = jest.fn();
const mockGoBack = jest.fn();

jest.mock('@react-navigation/native', () => ({
  ...jest.requireActual('@react-navigation/native'),
  useNavigation: () => ({ navigate: mockNavigate, goBack: mockGoBack }),
}));

import React from 'react';
import { readFileSync } from 'fs';
import { join } from 'path';
import { render } from '@testing-library/react-native';
import AssessmentIntroduction from '../AssessmentIntroduction';

const stripComments = (source: string): string =>
  source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');

const FLOW = stripComments(readFileSync(join(__dirname, '../EnhancedAssessmentFlow.tsx'), 'utf8'));
const INTRO = stripComments(readFileSync(join(__dirname, '../AssessmentIntroduction.tsx'), 'utf8'));

/** The retired claims that answers are, or will be, kept. */
const SAVED_CLAIM =
  /progress will be saved|continue later|other answers are saved|responses are safely stored|confidentially stored/i;

const NEW_FLOW_STRINGS = [
  'If you exit now, this check-in will end. You can start a new one any time.',
  "One answer didn't come through, so this check-in isn't complete. You're back at that question; your other answers are still here.",
  'There was an issue completing your check-in. Crisis support is still available.',
];
const NEW_INTRO_BULLET = '• Any responses Being saves are encrypted';

/** Escape a literal for use inside a RegExp. */
const lit = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

describe('matcher self-check (DEBUG-390)', () => {
  it('the saved-claim pattern fires on every retired string', () => {
    for (const retired of [
      'Your progress will be saved and you can continue later.',
      "You're back at that question; your other answers are saved.",
      'There was an issue completing your check-in. Your responses are safely stored.',
      'There was an issue completing your assessment. Your responses are safely stored.',
      '• Your responses are confidentially stored and encrypted',
    ]) {
      expect(retired).toMatch(SAVED_CLAIM);
    }
  });

  it('stripping removes a comment that names a retired claim, and leaves code', () => {
    const sample = "// your progress will be saved\n/* safely stored */\nconst x = 'kept';";
    expect(stripComments(sample)).not.toMatch(SAVED_CLAIM);
    expect(stripComments(sample)).toContain("const x = 'kept';");
  });

  it('the stripped sources still carry their code', () => {
    expect(FLOW).toMatch(/Alert\.alert\(/);
    expect(INTRO).toMatch(/privacyText/);
  });
});

describe('EnhancedAssessmentFlow alerts', () => {
  it('no retired saved claim remains', () => {
    expect(FLOW).not.toMatch(SAVED_CLAIM);
  });

  it.each(NEW_FLOW_STRINGS)('carries "%s"', (copy) => {
    expect(FLOW).toContain(copy);
  });

  it('both completion-error alerts use the new string', () => {
    expect(FLOW.split(NEW_FLOW_STRINGS[2]!).length - 1).toBe(2);
  });

  it('titles and buttons are unchanged around the new bodies', () => {
    const ws = '\\s*';
    expect(FLOW).toMatch(
      new RegExp(
        `'Exit Assessment\\?',${ws}'${lit(NEW_FLOW_STRINGS[0]!)}',${ws}\\[${ws}\\{ text: 'Continue Assessment', style: 'cancel' \\},${ws}\\{ text: 'Exit', onPress: \\w+, style: 'destructive' \\},`,
      ),
    );
    expect(FLOW).toMatch(
      new RegExp(`'Not quite finished',${ws}"${lit(NEW_FLOW_STRINGS[1]!)}",${ws}\\[\\{ text: 'OK' \\}\\]`),
    );
    const completionError = new RegExp(
      `'Completion Error',${ws}'${lit(NEW_FLOW_STRINGS[2]!)}',${ws}\\[\\{ text: 'OK' \\}\\]`,
      'g',
    );
    expect(FLOW.match(completionError)).toHaveLength(2);
  });
});

describe('DEBUG-771 · one exit confirm, shared by every exit path', () => {
  const count = (source: string, needle: string): number => source.split(needle).length - 1;

  it('positive control: the counter sees a duplicated literal', () => {
    expect(count(`'Exit Assessment?', x; 'Exit Assessment?', y;`, "'Exit Assessment?'")).toBe(2);
  });

  it('the exit Alert title and body each appear exactly once in the flow', () => {
    expect(count(FLOW, "'Exit Assessment?'")).toBe(1);
    expect(count(FLOW, `'${NEW_FLOW_STRINGS[0]}'`)).toBe(1);
  });
});

describe('AssessmentIntroduction privacy bullet', () => {
  it('source: no retired claim, new bullet present', () => {
    expect(INTRO).not.toMatch(SAVED_CLAIM);
    expect(INTRO).toContain(NEW_INTRO_BULLET);
  });

  it.each(['phq9', 'gad7'] as const)('%s renders the new bullet and not the old one', (type) => {
    const { getByText, queryByText } = render(
      <AssessmentIntroduction assessmentType={type} onBegin={jest.fn()} />,
    );
    expect(getByText(new RegExp(lit(NEW_INTRO_BULLET)))).toBeTruthy();
    expect(queryByText(SAVED_CLAIM)).toBeNull();
  });
});
