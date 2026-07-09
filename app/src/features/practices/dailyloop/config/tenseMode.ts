/**
 * tenseMode.ts — canonical copy for the FEAT-291 single-loop daily practice.
 *
 * The Five Principles in canonical order as one loop, authored in three tense
 * modes (flat / morning-tensed / evening-tensed). The prototype's GOAL is to
 * decide flat-vs-tensed by feel, so all three are authored to equal fidelity —
 * none is a stub. Copy is sourced from docs/product/stoic-mindfulness and was
 * set by the FEAT-291 philosopher planning pass.
 *
 * INVARIANTS (philosopher, non-negotiable):
 *  - The five canonical NAMES (STEP_TITLES) and their ORDER are fixed across all
 *    three modes. Tense changes only the voice (will/ahead vs. did/looking back),
 *    never the principle, never the sequence.
 *  - Step 4 names all four cardinal virtues (VIRTUE_REFERENCE) + carries reappraisal.
 *  - Step 5 carries oikeiōsis / cosmopolitanism / justice — never "compassion" /
 *    "social connection" / "connect with people".
 *  - Naming a virtue (step 4) is OPTIONAL scaffolding, never a required gate.
 *  - Premeditatio (step 4, morning-tensed only) is optional, skippable, brief, and
 *    paired with a coping clause — no vivid catastrophizing (crisis-reviewed).
 */
import type { DailyLoopMode } from '@/features/practices/types/flows';
import type { CardinalVirtue } from '@/features/practices/types/stoic';

export const DAILY_LOOP_STEP_KEYS = [
  'AwarePresence',
  'RadicalAcceptance',
  'SphereSovereignty',
  'VirtuousResponse',
  'InterconnectedLiving',
] as const;

export type DailyLoopStepKey = (typeof DAILY_LOOP_STEP_KEYS)[number];

/** Canonical principle names — INVARIANT across every mode (on-screen step labels). */
export const STEP_TITLES: Record<DailyLoopStepKey, string> = {
  AwarePresence: 'Aware Presence',
  RadicalAcceptance: 'Radical Acceptance',
  SphereSovereignty: 'Sphere Sovereignty',
  VirtuousResponse: 'Virtuous Response',
  InterconnectedLiving: 'Interconnected Living',
};

/** The four cardinal virtues + one-line glosses (step 4 reference line / optional chips). */
export const VIRTUE_REFERENCE: ReadonlyArray<{ key: CardinalVirtue; label: string; gloss: string }> = [
  { key: 'wisdom', label: 'Wisdom', gloss: 'see it clearly' },
  { key: 'courage', label: 'Courage', gloss: 'act despite fear' },
  { key: 'justice', label: 'Justice', gloss: "others' due" },
  { key: 'temperance', label: 'Temperance', gloss: 'measured restraint' },
];

/**
 * Premeditatio malorum — step 4, MORNING-tensed ONLY. Optional + skippable +
 * coping-clause paired, per the crisis review of the adversity copy. Never shown
 * in flat or evening mode.
 */
export const PREMEDITATIO = {
  // Agency-first framing (crisis review): the center of gravity is "how you want to
  // meet it", not the threat. "setback" is softer than "something goes wrong" for
  // GAD-prone users — rehearse the coping response, never the catastrophe.
  label: 'If today brings a setback, how do you want to meet it?',
  hint: "Optional — skip anytime. Keep it brief: “if this happens, I'll cope, and still act with virtue.”",
  placeholder: "E.g., 'If the meeting goes badly, I'll stay steady and act with courage.'",
} as const;

export interface StepCopy {
  /** Short framing line under the title. */
  subtitle: string;
  /** The prompt (philosopher-specced; the fidelity-critical line). */
  inputLabel: string;
  /** Optional helper text under the prompt. */
  inputHint?: string;
  /** Example placeholder. */
  placeholder: string;
}

type ModeCopy = Record<DailyLoopStepKey, StepCopy>;

const FLAT: ModeCopy = {
  AwarePresence: {
    subtitle: 'Arrive in the present — the ground the other four beats stand on.',
    inputLabel: "What's present right now — the situation, thought, or feeling you notice?",
    inputHint: 'Notice it without judging it — just name what’s here.',
    placeholder: "E.g., 'Tightness in my chest about the deadline'",
  },
  RadicalAcceptance: {
    subtitle: 'Meet reality as it is — then you can respond from clear ground.',
    inputLabel: "Name what you're resisting or wishing were different. Then meet it plainly: this is what's happening right now.",
    inputHint: "Acceptance isn't approval or giving up — it's stopping the argument with reality so you can act clearly.",
    placeholder: "E.g., 'I keep wishing this hadn't happened — but it did.'",
  },
  SphereSovereignty: {
    subtitle: "Sort what's yours from what isn't — and invest only in your own sphere.",
    inputLabel: 'What can you actually control or influence here?',
    inputHint: "Focus on your own thoughts, intentions, and actions — not outcomes or other people's behavior.",
    placeholder: "E.g., 'My response, my attitude, asking for help...'",
  },
  VirtuousResponse: {
    subtitle: 'The obstacle is the material for virtue.',
    inputLabel: 'What does this situation call for — wisdom, courage, justice, or temperance? Name one virtuous action you can take.',
    inputHint: 'Ask: what would my best character do here?',
    placeholder: "E.g., 'Courage — say the hard thing, kindly.'",
  },
  InterconnectedLiving: {
    subtitle: 'You are one member of a shared human community.',
    inputLabel: 'Widen the view: who else is affected here? What would serve not just you, but the people and community you’re part of?',
    inputHint: 'What does this moment ask of you toward others?',
    placeholder: "E.g., 'Check in on a teammate who's carrying the same load.'",
  },
};

const MORNING: ModeCopy = {
  AwarePresence: {
    subtitle: 'Settle into this moment before the day begins.',
    inputLabel: "What's here as you start — in your body, your mind, right now?",
    inputHint: 'Just name what’s present as the day opens.',
    placeholder: "E.g., 'A little restless, thinking ahead to the day'",
  },
  RadicalAcceptance: {
    subtitle: 'Meet in advance what the day may ask you to accept.',
    inputLabel: 'What might today ask you to accept — a constraint, an uncertainty, something outside your wishes? Name it now, before it arrives.',
    inputHint: 'Meeting it in advance means it lands with less shock.',
    placeholder: "E.g., 'I may not get to everything on my list today.'",
  },
  SphereSovereignty: {
    subtitle: 'Name where your real leverage is in what’s ahead.',
    inputLabel: 'In what’s ahead today, what is genuinely up to you — and what isn’t?',
    inputHint: "Commit fully to your effort; hold the outcome lightly — 'I'll do this, if nothing prevents me.'",
    placeholder: "E.g., 'My preparation and focus are mine; the decision isn't.'",
  },
  VirtuousResponse: {
    subtitle: 'Choose the character you want to bring to the day.',
    inputLabel: "Which virtue do you most want to embody today — wisdom, courage, justice, or temperance? Picture one moment where you'll need it.",
    inputHint: 'Name the virtue, and one moment you’ll practice it.',
    placeholder: "E.g., 'Temperance — stay measured in the afternoon rush.'",
  },
  InterconnectedLiving: {
    subtitle: 'You share the day with others.',
    inputLabel: "Who will you share today with? Name one way you can act for someone else's good, or the common good, not only your own.",
    inputHint: 'One small contribution to others counts.',
    placeholder: "E.g., 'Make time to really listen to my partner tonight.'",
  },
};

const EVENING: ModeCopy = {
  AwarePresence: {
    subtitle: 'Let the day settle. Arrive here now.',
    inputLabel: "What's present in your body and mind as you look back?",
    inputHint: 'Just name what’s here as the day closes.',
    placeholder: "E.g., 'Tired, but calmer than this morning'",
  },
  RadicalAcceptance: {
    subtitle: 'Notice where you argued with reality today.',
    inputLabel: "Where did you resist reality today — a 'this shouldn't be happening'? Name it, and let it be what it was.",
    inputHint: 'Not self-blame — just noticing where the extra suffering came from.',
    placeholder: "E.g., 'I fought the delay all afternoon instead of adjusting.'",
  },
  SphereSovereignty: {
    subtitle: 'Calibrate where your energy went.',
    inputLabel: "Looking back, where did you spend energy on what you couldn't control? Where did you rightly focus on what was yours?",
    inputHint: "The aim isn't a verdict — it's calibrating tomorrow's focus.",
    placeholder: "E.g., 'I stewed over their reply; I did control how I answered.'",
  },
  VirtuousResponse: {
    subtitle: 'Review the character you brought to the day.',
    inputLabel: 'Where today did you respond with wisdom, courage, justice, or temperance? Where did you fall short — and how would you meet it differently?',
    inputHint: 'Honest review, with compassion — not self-flagellation.',
    placeholder: "E.g., 'Courage in the meeting; short on temperance at dinner.'",
  },
  InterconnectedLiving: {
    subtitle: 'See how your day touched others.',
    inputLabel: 'How did your actions affect others today? Where did you contribute to others’ wellbeing — and where did you miss a chance to?',
    inputHint: 'Both the contribution and the missed chance are worth seeing.',
    placeholder: "E.g., 'Helped a colleague; brushed past someone who needed a minute.'",
  },
};

const COPY_BY_MODE: Record<DailyLoopMode, ModeCopy> = {
  flat: FLAT,
  morning: MORNING,
  evening: EVENING,
};

/** Resolve the copy for a given (mode, step). */
export function getStepCopy(mode: DailyLoopMode, step: DailyLoopStepKey): StepCopy {
  return COPY_BY_MODE[mode][step];
}

/** Human-readable mode labels for the mode picker. */
export const MODE_LABELS: Record<DailyLoopMode, { label: string; blurb: string }> = {
  flat: { label: 'Flat', blurb: 'Time-agnostic — the five principles, plainly.' },
  morning: { label: 'Morning', blurb: 'Prospective — intention for the day ahead.' },
  evening: { label: 'Evening', blurb: 'Retrospective — reflection on the day behind.' },
};
