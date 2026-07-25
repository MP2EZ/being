/**
 * DailyLoopStepScreen stage-note render guard — FEAT-292.
 *
 * The data-layer invariants live in stageNotes.test.ts. This file pins the things
 * only a render can prove:
 *  - the note reaches the screen, on the selected beat and no other,
 *  - it is INERT — no press target, no underline — so it can never be mistaken for
 *    the tappable crisis support line,
 *  - no stage key leaks into visible text OR into accessibilityLabel/Hint (the
 *    screen-reader path is a display surface too, and the AC bans stage-as-label
 *    without qualifying which surface),
 *  - an unassessed user gets literal silence, not a placeholder or an empty line,
 *  - stage changes tone ONLY: the beat's prompts and fields are byte-identical
 *    with and without a self-assessment.
 */
import React from 'react';
import { render } from '@testing-library/react-native';
import DailyLoopStepScreen from '../screens/DailyLoopStepScreen';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { STAGE_NOTES, DEVELOPMENTAL_STAGE_KEYS } from '../config/stageNotes';
import type { DevelopmentalStage, ModuleId, ModuleProgress } from '@/features/learn/types/education';

const MODULE_IDS: ModuleId[] = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];

const progress = (stage: DevelopmentalStage): ModuleProgress => ({
  status: 'not_started',
  lastAccessedAt: new Date(),
  completedSections: [],
  developmentalStage: stage,
  practiceCount: 0,
  reflectionResponses: [],
  optOutFlags: [],
});

/** Seed educationStore with a per-module self-assessment map. */
const seedStages = (byModule: Partial<Record<ModuleId, DevelopmentalStage>>) => {
  const modules = Object.fromEntries(
    MODULE_IDS.map((id) => [id, progress(byModule[id] ?? null)]),
  ) as Record<ModuleId, ModuleProgress>;
  useEducationStore.setState({ modules });
};

beforeEach(() => {
  seedStages({});
});

describe('the note reaches the beat it belongs to', () => {
  it('renders the authored copy for a self-assessed principle', () => {
    // Radical Acceptance assessed alone at 'fluid' is the sole-eligible case, so the
    // selected beat is deterministic regardless of which day the suite runs on.
    seedStages({ 'radical-acceptance': 'fluid' });
    const { getByTestId } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    expect(getByTestId('daily-loop-stage-note').props.children).toBe(
      STAGE_NOTES.fluid?.RadicalAcceptance,
    );
  });

  it('does not render on a beat the session did not select', () => {
    seedStages({ 'radical-acceptance': 'fluid' });
    const { queryByTestId } = render(
      <DailyLoopStepScreen
        stepKey="InterconnectedLiving"
        mode="flat"
        depth="deep"
        onSave={jest.fn()}
      />,
    );
    expect(queryByTestId('daily-loop-stage-note')).toBeNull();
  });

  it('stays hidden behind the breath gate (a normalization is not breath guidance)', () => {
    seedStages({ 'aware-presence': 'integrated' });
    const { queryByTestId, getByTestId } = render(
      <DailyLoopStepScreen
        stepKey="AwarePresence"
        mode="flat"
        depth="deep"
        showBreath
        onSave={jest.fn()}
      />,
    );
    // Breath phase is up; the reflection phase (and its note) has not been reached.
    expect(getByTestId('daily-loop-breathing-circle')).toBeTruthy();
    expect(queryByTestId('daily-loop-stage-note')).toBeNull();
  });
});

describe('silence for the unassessed', () => {
  it('renders nothing at all when no principle has been self-assessed', () => {
    const { queryByTestId } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    expect(queryByTestId('daily-loop-stage-note')).toBeNull();
  });

  it('never invites the user to self-assess from inside the loop', () => {
    // AC: "no prompt pressuring self-assessment". The loop is not the site of
    // self-assessment and must not advertise it.
    const { queryByText } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    expect(queryByText(/self-assess|where are you|personalize|tell us about your practice/i)).toBeNull();
  });
});

describe('the note is inert — it cannot be confused with the crisis affordance', () => {
  it('is not pressable and carries no button role', () => {
    seedStages({ 'radical-acceptance': 'fluid' });
    const { getByTestId } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    const note = getByTestId('daily-loop-stage-note');
    expect(note.props.onPress).toBeUndefined();
    expect(note.props.accessibilityRole).not.toBe('button');
  });

  it('is not underlined (underline is the support line signature on this screen)', () => {
    seedStages({ 'radical-acceptance': 'fluid' });
    const { getByTestId } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    const style = StyleSheetFlatten(getByTestId('daily-loop-stage-note').props.style);
    expect(style.textDecorationLine).toBeUndefined();
  });

  it('leaves the crisis support line present and still tappable on its own beat', () => {
    seedStages({ 'radical-acceptance': 'fluid' });
    const { getByTestId } = render(
      <DailyLoopStepScreen stepKey="RadicalAcceptance" mode="flat" depth="deep" onSave={jest.fn()} />,
    );
    const support = getByTestId('daily-loop-support-line');
    expect(support.props.accessibilityRole).toBe('button');
    expect(support.props.accessibilityHint).toBe('Opens crisis support resources');
  });
});

describe('stage never surfaces as a label — including to a screen reader', () => {
  it.each(DEVELOPMENTAL_STAGE_KEYS)('%s never appears anywhere in the rendered tree', (stage) => {
    seedStages(Object.fromEntries(MODULE_IDS.map((id) => [id, stage])));
    for (const stepKey of ['RadicalAcceptance', 'VirtuousResponse', 'InterconnectedLiving'] as const) {
      const { toJSON } = render(
        <DailyLoopStepScreen stepKey={stepKey} mode="flat" depth="deep" onSave={jest.fn()} />,
      );
      // Serializing the tree covers visible text AND every prop, so
      // accessibilityLabel / accessibilityHint are swept along with the copy.
      const tree = JSON.stringify(toJSON());
      expect(tree.toLowerCase()).not.toContain(stage.toLowerCase());
    }
  });
});

describe('tone only — structure is untouched by stage', () => {
  it('renders identical prompts and fields with and without a self-assessment', () => {
    const promptsFor = (stage: DevelopmentalStage): string[] => {
      seedStages({ 'sphere-sovereignty': stage });
      const { getAllByTestId, getByText } = render(
        <DailyLoopStepScreen
          stepKey="SphereSovereignty"
          mode="flat"
          depth="deep"
          onSave={jest.fn()}
        />,
      );
      expect(getByText('Sphere Sovereignty')).toBeTruthy();
      return ['notMine', 'mine'].map(
        (k) => getAllByTestId(`daily-loop-input-${k}`)[0]?.props.placeholder as string,
      );
    };
    // 'effortful' authors a note on this beat; null authors none. The beat's own
    // prompts must be byte-identical either way — stage modulates tone, never content.
    expect(promptsFor('effortful')).toEqual(promptsFor(null));
  });
});

/** Minimal style flattener — RN's StyleSheet.flatten equivalent for test assertions. */
function StyleSheetFlatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) return Object.assign({}, ...style.map(StyleSheetFlatten));
  return (style ?? {}) as Record<string, unknown>;
}
