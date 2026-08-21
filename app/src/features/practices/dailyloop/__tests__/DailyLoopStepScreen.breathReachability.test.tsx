/**
 * DEBUG-468 — the Aware Presence breath beat fits the smallest supported viewport,
 * and the SkipLink is DISCOVERABLE without scrolling at 375x667.
 *
 * WHAT FAILED. Measured on a Release build via `maestro hierarchy` (provenance
 * c1c01157, clean tree, freshly created iPhone SE 3 / iOS 18.6), during the breath:
 *
 *   fold (daily-loop-AwarePresence-screen)  y=130..667
 *   daily-loop-breathing-circle             y=252..568
 *   daily-loop-breath-timer                 y=592..730   <- clipped in half
 *   daily-loop-skip-breath                  ABSENT from the hierarchy
 *   GuidanceCard (daily-loop-grounding)     ABSENT
 *
 * The SkipLink sat ~107pt below the fold and the grounding card ~350pt below it.
 *
 * WHY IT IS NOT MERELY A LAYOUT NIT. Two separate contracts broke.
 *   • AGENCY. The 30s breath is a GATE — the reflection phase is behind it. The
 *     SkipLink is what implements prohairesis on this beat (non-negotiable #5); a
 *     gate whose exit the user cannot see is not a gate they chose to enter. Note
 *     the link was never UNREACHABLE, it was UNDISCOVERABLE, and discoverability
 *     at default Dynamic Type is the contract. Visibility at AX sizes is NOT
 *     promised and must not be chased — a practice screen that scrolls at AX5 is
 *     behaving correctly.
 *   • CONCURRENCY. The grounding card says "As you breathe, notice:". That is a
 *     claim about simultaneity, and 350pt below the fold it was false for every
 *     user on this viewport — the triad is authored 1:1 from the principle's three
 *     capacities (01-aware-presence.md:12,66) and nobody on an SE 3 ever saw it.
 *
 * WHY THE SKIPLINK IS NOT PINNED, unlike DEBUG-465's support line. Philosopher
 * ruling, hard: a permanently visible exit is a permanently available object of
 * attention — an app-authored pull away from the anchor, at the moment the beat is
 * training the return to it. And DEBUG-465 established the bottom edge as the
 * CRISIS SUPPORT LINE's slot; `Skip →` in that same position would make the
 * bottom-edge affordance mean "support" on two beats and "leave the practice" on a
 * third, for a user who runs this loop daily and learns the vocabulary positionally.
 * The support line earns a persistent surface because unconditional availability IS
 * its purpose. The SkipLink has no such property, so it stays in flow.
 *
 * WHAT THIS FILE CAN AND CANNOT PROVE. No layout engine runs in jest — same limit
 * DEBUG-465's crisisSupportLineReachability header records. A green result here is NEVER
 * the reachability contract. It pins STRUCTURE: that the fix took the shape the
 * ruling requires, and that the elements whose removal would trivially satisfy a
 * position assertion are still present. The fold itself is proven only by
 * `maestro hierarchy` on a Release build, and by daily-loop-quick-depth.yaml.
 */
import React from 'react';
import { render, within } from '@testing-library/react-native';
import { ScrollView } from 'react-native';
import DailyLoopStepScreen from '../screens/DailyLoopStepScreen';
import { useEducationStore } from '@/features/learn/stores/educationStore';
import { getStepConfig } from '../config/tenseMode';
import type { DailyLoopMode } from '@/features/practices/types/flows';
import type { ModuleId, ModuleProgress } from '@/features/learn/types/education';

/** Captures the props DailyLoopStepScreen hands the breathing circle. */
const circleProps: Array<Record<string, unknown>> = [];

jest.mock('@/features/practices/shared/components', () => {
  const actual = jest.requireActual('@/features/practices/shared/components');
  const ReactLocal = require('react');
  const RN = require('react-native');
  return {
    ...actual,
    // Only the circle is stubbed. SkipLink, Timer and GuidanceCard stay REAL so the
    // structural assertions below are about the shipped components, not about mocks.
    BreathingCircle: (props: Record<string, unknown>) => {
      circleProps.push(props);
      return ReactLocal.createElement(RN.View, { testID: props.testID as string });
    },
  };
});

const MODES: DailyLoopMode[] = ['flat', 'morning', 'evening'];

const MODULE_IDS: ModuleId[] = [
  'aware-presence',
  'radical-acceptance',
  'sphere-sovereignty',
  'virtuous-response',
  'interconnected-living',
];

/** No self-assessment anywhere, so no stage note competes for the beat. */
const clearStages = () => {
  const blank: ModuleProgress = {
    status: 'not_started',
    lastAccessedAt: new Date(),
    completedSections: [],
    developmentalStage: null,
    practiceCount: 0,
    reflectionResponses: [],
    optOutFlags: [],
  };
  useEducationStore.setState({
    modules: Object.fromEntries(MODULE_IDS.map((id) => [id, blank])) as Record<
      ModuleId,
      ModuleProgress
    >,
  });
};

beforeEach(() => {
  circleProps.length = 0;
  clearStages();
});

const renderBreathBeat = (mode: DailyLoopMode = 'flat') =>
  render(
    <DailyLoopStepScreen
      stepKey="AwarePresence"
      mode={mode}
      depth="quick"
      showBreath
      showBack={false}
      onSave={jest.fn()}
    />,
  );

/** testIDs in document order — RTL exposes no ordering query of its own. */
const testIdsInOrder = (node: unknown): string[] => {
  const out: string[] = [];
  const walk = (n: any) => {
    if (!n || typeof n !== 'object') return;
    const id = n.props?.testID;
    if (typeof id === 'string') out.push(id);
    (n.children ?? []).forEach(walk);
  };
  walk(node);
  return out;
};

describe('DEBUG-468 — the SkipLink stays in flow and stays discoverable', () => {
  it.each(MODES)('renders the skip link INSIDE the ScrollView in %s tense', (mode) => {
    const screen = renderBreathBeat(mode);
    const scrollView = screen.UNSAFE_getByType(ScrollView);

    // The ancestor walk, matching DEBUG-465's shape. Pinning it outside would
    // satisfy any "is it above the fold" assertion trivially and is exactly what
    // the philosopher ruling forbids, so the containment is the thing to pin.
    expect(within(scrollView).queryByTestId('daily-loop-skip-breath')).not.toBeNull();
  });

  it('keeps the skip link AFTER the timer, in its authored reading position', () => {
    const screen = renderBreathBeat();
    const ids = testIdsInOrder(screen.toJSON());

    // Both must be present — an ordering assertion over a missing element passes
    // vacuously, which is the whole defect class this item is about.
    expect(ids).toContain('daily-loop-breath-timer');
    expect(ids).toContain('daily-loop-skip-breath');
    expect(ids.indexOf('daily-loop-breath-timer')).toBeLessThan(
      ids.indexOf('daily-loop-skip-breath'),
    );
  });

  it('never nests the skip link inside the timer control row', () => {
    // Philosopher hard constraint. Timer has a latent showSkip/onSkip path and
    // moving Skip next to Pause would cost zero vertical — and would sit the two
    // OPPOSITE intentions (stay with the practice / leave it) adjacent as thumb
    // targets, where `breathCompleted` is one-way with no path back into the breath.
    const screen = renderBreathBeat();
    const timer = screen.getByTestId('daily-loop-breath-timer');
    expect(within(timer).queryByTestId('daily-loop-skip-breath')).toBeNull();
  });

  it('keeps the skip link a muted link, never promoted to a button', () => {
    const screen = renderBreathBeat();
    const skip = screen.getByTestId('daily-loop-skip-breath');
    expect(skip.props.accessibilityRole).toBe('button');
    expect(skip.props.accessibilityLabel).toBe('Skip breathing exercise');
    const style = Array.isArray(skip.props.style)
      ? Object.assign({}, ...skip.props.style)
      : skip.props.style;
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
  });
});

describe('DEBUG-468 — the grounding triad moves into the breath itself', () => {
  it.each(MODES)('hands the full authored triad to the breathing circle in %s tense', (mode) => {
    renderBreathBeat(mode);
    const items = circleProps[0]?.guidanceItems as readonly string[] | undefined;

    // Three, always. The count is load-bearing, not stylistic: the items map 1:1
    // onto Aware Presence's three capacities (Embodied Awareness / Present
    // Perception / Metacognitive Space). Dropping one drops a capacity of the
    // principle the other four beats stand on.
    expect(items).toHaveLength(3);
    expect(items).toEqual(getStepConfig(mode, 'AwarePresence').grounding);
  });

  it('no longer renders the standalone grounding card during the breath', () => {
    // ~245pt at wrap, ~350pt below the fold on an SE 3. Its content is not cut —
    // it is delivered through the circle's guidance slot instead, one anchor per
    // cycle, which is why this deletion is not a loss of the triad.
    const screen = renderBreathBeat();
    expect(screen.queryByTestId('daily-loop-grounding')).toBeNull();
  });

  it('drops the breath subtitle, which paraphrased two of the three anchors', () => {
    const screen = renderBreathBeat();
    expect(screen.queryByText("Let your body settle. Notice what's here.")).toBeNull();
    // ...but the title survives: it names the act for 26pt and is the cheapest of
    // the instruction layers.
    expect(screen.getByText('Take a moment to arrive')).toBeTruthy();
  });

  it('passes a REFERENCE-STABLE items array across re-renders', () => {
    // DEBUG-394 verbatim: a fresh array identity each parent render defeats
    // BreathingCircle's React.memo and can restart the breath cycle mid-practice.
    // A `?? [...]` fallback written inline at the call site is exactly that bug.
    const screen = renderBreathBeat();
    screen.rerender(
      <DailyLoopStepScreen
        stepKey="AwarePresence"
        mode="flat"
        depth="quick"
        showBreath
        showBack={false}
        onSave={jest.fn()}
      />,
    );
    expect(circleProps.length).toBeGreaterThan(1);
    expect(circleProps[1].guidanceItems).toBe(circleProps[0].guidanceItems);
  });

  it('leaves beats without a breath gate untouched', () => {
    // The prop is opt-in. Only the breath-gated beat may drive the guidance slot.
    circleProps.length = 0;
    render(
      <DailyLoopStepScreen
        stepKey="SphereSovereignty"
        mode="flat"
        depth="quick"
        onSave={jest.fn()}
      />,
    );
    expect(circleProps).toHaveLength(0);
  });
});
