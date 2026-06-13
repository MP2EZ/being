/**
 * Canonical Stoic Mindfulness principles (FEAT-268).
 *
 * Single source of truth for the five-principle copy consumed by the Profile
 * "About Stoic Mindfulness" screen, the onboarding Stoic intro, and the morning
 * PrincipleFocus screen. Created to end the prose/citation drift those three
 * surfaces had accumulated (the original FEAT-76 AC assumed this file already
 * existed; it did not — single-sourcing was deferred to FEAT-268).
 *
 * Content is a protected therapeutic path. The values below are philosopher-signed
 * and reconciled against docs/product/stoic-mindfulness/INDEX.md + principles/01-05*.md:
 *  - Citations: only Sphere Sovereignty carries one (Epictetus, Enchiridion 1).
 *    FEAT-76 deleted the other bare verse numbers as mis-anchored/fabricated; they
 *    are NOT restored here (see principles.test.ts which pins their absence).
 *  - Aware Presence uses the Stoic-correct "observing thoughts as mental events
 *    rather than truth" — onboarding's "without judgment" reframe is retired.
 *  - `integrates` reconciled to the docs' Integration: headers (no authoring notes).
 *
 * moduleId is intentionally NOT stored: derive it from `key` via
 * `getModuleIdForPrinciple` (@/features/learn/utils/principleMapping) to avoid
 * duplicating the snake_case -> kebab-case map.
 *
 * Byte-parity is enforced by src/features/practices/shared/constants/__tests__/principles.test.ts.
 */
import type { StoicPrinciple } from '@/features/practices/types/stoic';

export interface CanonicalPrinciple {
  /** Stable key; also the input to getModuleIdForPrinciple() for Learn deep-links. */
  key: StoicPrinciple;
  /** Bare display title, e.g. "Aware Presence". Consumers prepend the ordinal where shown. */
  title: string;
  /** One-line framing for space-constrained surfaces (onboarding). */
  shortDescription: string;
  /** Full framing for the Profile About screen and PrincipleFocus. */
  description: string;
  /** Verified classical citation. Present only where one survives FEAT-76 verification. */
  citation?: string;
  /** Legacy practices this integrative principle consolidates (docs Integration: header). */
  integrates: string;
}

export const PRINCIPLES: readonly CanonicalPrinciple[] = [
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
];
