/**
 * principles.test.ts — FEAT-268 canonical single-source guard.
 *
 * Pins the byte-exact, philosopher-signed canonical values for the five Stoic
 * Mindfulness principles (FEAT-268 reconciliation of Profile / onboarding /
 * PrincipleFocus drift). Content is a protected therapeutic path — these assertions
 * guard against accidental edits and, critically, against re-introducing the
 * unverified verse citations FEAT-76 deleted.
 *
 * Doc source of truth: docs/product/stoic-mindfulness/INDEX.md + principles/01-05*.md.
 */
import { PRINCIPLES } from '../principles';
import type { StoicPrinciple } from '@/features/practices/types/stoic';

describe('canonical PRINCIPLES constant (FEAT-268)', () => {
  it('lists the five principles in canonical order', () => {
    expect(PRINCIPLES.map((p) => p.key)).toEqual<StoicPrinciple[]>([
      'aware_presence',
      'radical_acceptance',
      'sphere_sovereignty',
      'virtuous_response',
      'interconnected_living',
    ]);
  });

  it('carries the byte-exact philosopher-signed copy for each principle', () => {
    expect(PRINCIPLES).toEqual([
      {
        key: 'aware_presence',
        title: 'Aware Presence',
        shortDescription:
          'Be fully here now, observing thoughts as mental events rather than truth.',
        description:
          "Be fully here now, observing thoughts as mental events rather than truth, and feeling what's happening in your body.",
        integrates: 'Present Perception + Metacognitive Space + Embodied Awareness',
      },
      {
        key: 'radical_acceptance',
        title: 'Radical Acceptance',
        shortDescription: 'Accept reality as it is, without resistance.',
        description:
          "This is what's happening right now. I may not like it, prefer it, or want it, but it is the reality I face. What do I do from here?",
        integrates: 'Amor Fati',
      },
      {
        key: 'sphere_sovereignty',
        title: 'Sphere Sovereignty',
        shortDescription:
          'Focus on what you control (your responses, character, intentions).',
        description:
          "Distinguish what you control (your intentions, judgments, character, responses) from what you don't (outcomes, others' choices, externals). Focus energy only within your sphere.",
        citation: 'Epictetus, Enchiridion 1',
        integrates: 'Dichotomy of Control + Intention Over Outcome',
      },
      {
        key: 'virtuous_response',
        title: 'Virtuous Response',
        shortDescription:
          'In every situation, act with wisdom, courage, justice, or temperance.',
        description:
          'In every situation, ask "What does wisdom, courage, justice, or temperance require here?" View obstacles as opportunities for practicing virtue.',
        integrates: 'Virtuous Reappraisal + Negative Visualization + Character Cultivation',
      },
      {
        key: 'interconnected_living',
        title: 'Interconnected Living',
        shortDescription: 'Recognize our shared humanity and act for the common good.',
        description:
          "Bring full presence to others. Recognize that we're all members of one human community. Act for the common good, not just personal benefit.",
        integrates: 'Relational Presence + Interconnected Action',
      },
    ]);
  });

  it('attaches a citation only to Sphere Sovereignty, and it is the canonical Enchiridion 1', () => {
    const withCitation = PRINCIPLES.filter((p) => p.citation !== undefined);
    expect(withCitation.map((p) => p.key)).toEqual(['sphere_sovereignty']);
    expect(withCitation[0].citation).toBe('Epictetus, Enchiridion 1');
  });

  it('does not re-introduce any FEAT-76-deleted verse number', () => {
    const blob = JSON.stringify(PRINCIPLES);
    expect(blob).not.toMatch(/Meditations\s+2:1/);
    expect(blob).not.toMatch(/Meditations\s+10:6/);
    expect(blob).not.toMatch(/Meditations\s+5:1/);
    expect(blob).not.toMatch(/Meditations\s+5:20/);
    expect(blob).not.toMatch(/Meditations\s+8:59/);
  });

  it('retires the non-Stoic "without judgment" reframe and PrincipleFocus authoring drift', () => {
    const blob = JSON.stringify(PRINCIPLES);
    expect(blob).not.toMatch(/without judgment/);
    expect(blob).not.toMatch(/standalone principle/); // radical_acceptance integrates note
    expect(blob).not.toMatch(/Contemplative Praxis/); // a separate meta-principle, not part of P5
  });
});
