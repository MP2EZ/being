/**
 * tenseMode.ts — canonical copy + shape for the FEAT-291 single-loop daily practice.
 *
 * The Five Principles in canonical order as one loop, authored in three tense modes
 * (flat / morning-prospective / evening-retrospective). Copy is sourced from
 * docs/product/stoic-mindfulness and set by the FEAT-291 philosopher passes.
 *
 * The loop is REFLECT-FIRST: every text field is optional (typing is capture, never a
 * gate), which suits the walking, eyes-up practice it models. Per-step SHAPE varies:
 *  - step 1 (Aware Presence): breath + a grounding prompt (body sensation + environment
 *    + mind) shown WITH the breath, then an optional "what's present" line,
 *  - step 3 (Sphere Sovereignty): TWO order-agnostic fields — the full dichotomy of
 *    control (what's NOT yours to release + what IS yours), canonical examples list the
 *    not-yours side first,
 *  - step 4 (Virtuous Response): MULTI-select virtue chips (optional lens) → ONE
 *    synthesized action (the load-bearing output, not an enumeration).
 *
 * INVARIANTS (philosopher, non-negotiable):
 *  - The five canonical NAMES (STEP_TITLES) and their ORDER are fixed across all modes.
 *  - Step 4 names all four cardinal virtues; step 5 carries oikeiōsis / cosmopolitanism /
 *    justice as BELONGING (never "compassion" / "social connection" / instrumental
 *    "serve you"). Naming a virtue is optional scaffolding, never a gate.
 *  - Step 2 acceptance stays fact-anchored (not approval, not permanence) and hands off
 *    to agency in steps 3–4.
 *  - "Let go" (step 3) = disowning what's not up to us ("it is nothing to me"), never
 *    "it doesn't matter" / suppression; keep the "influence" middle-ground.
 *  - Premeditatio (step 4, MORNING only) is optional, skippable, brief, coping-paired.
 *  - The closing breath is practice-architecture — a coda (CLOSING), NOT step-5 content.
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

// Glosses are parallel gerund phrases (readability) and stay faithful to the classical
// definitions: wisdom = sound judgment, courage = fortitude, justice = suum cuique
// (giving each their due), temperance = moderation/restraint.
export const VIRTUE_REFERENCE: ReadonlyArray<{ key: CardinalVirtue; label: string; gloss: string }> = [
  { key: 'wisdom', label: 'Wisdom', gloss: 'seeing clearly' },
  { key: 'courage', label: 'Courage', gloss: 'acting despite fear' },
  { key: 'justice', label: 'Justice', gloss: 'giving others their due' },
  { key: 'temperance', label: 'Temperance', gloss: 'practicing restraint' },
];

/**
 * Premeditatio malorum — step 4, MORNING-tensed ONLY. Optional + skippable +
 * coping-clause paired (crisis-reviewed). Never shown in flat or evening mode, and
 * never on any acute-distress entry.
 */
export const PREMEDITATIO = {
  label: 'If today brings a setback, how do you want to meet it?',
  hint: "Optional — skip anytime. Keep it brief: “if this happens, I'll cope, and still act with virtue.”",
  placeholder: "E.g., 'If the meeting goes badly, I'll stay steady and act with courage.'",
} as const;

/** Field keys captured by DailyLoopStepData. */
export type LoopFieldKey = 'response' | 'notMine' | 'mine';

export interface LoopField {
  key: LoopFieldKey;
  label: string;
  hint?: string;
  placeholder: string;
}

export interface StepConfig {
  /** Short framing line under the title. */
  subtitle: string;
  /** 0–2 OPTIONAL text inputs for this beat. */
  fields: LoopField[];
  /** Step 1 only: reflective grounding items shown with the breath (no input). */
  grounding?: string[];
  /** Step 4 only: show the multi-select cardinal-virtue chips. */
  virtueChips?: boolean;
  /** Step 4 only: the (optional) chip prompt. */
  virtueChipsPrompt?: string;
  /**
   * Show the quiet static crisis-support line (crisis review requirement). Placed
   * ONLY on step 2 (Radical Acceptance) — the highest-distress beat — since the
   * immersive root overlay starts 50%-faded and the loop is meant to also catch an
   * acute-distress moment. Never content-triggered, never a modal, never repeated.
   */
  supportLine?: boolean;
}

/**
 * The quiet, static crisis-support affordance (crisis review). Non-alarming, no
 * crisis/emergency wording; taps through to CrisisResources via the existing root
 * nav path. NOT driven by any scan of the user's free text.
 */
export const SUPPORT_LINE = 'If this feels heavier than a hard day, support is here anytime.';

type ModeConfig = Record<DailyLoopStepKey, StepConfig>;

const FLAT: ModeConfig = {
  AwarePresence: {
    subtitle: 'Arrive in the present — the ground the other four beats stand on.',
    grounding: [
      'one physical sensation — feet on the ground, air on your skin',
      'the space around you — where you are right now',
      "what's present in your mind",
    ],
    fields: [
      {
        key: 'response',
        label: "What's present right now? (optional)",
        hint: 'One sensation, not a scan. Just land here.',
        placeholder: "E.g., 'Tightness in my chest; traffic sounds outside.'",
      },
    ],
  },
  RadicalAcceptance: {
    subtitle: 'Meet reality as it is — then you can respond from clear ground.',
    supportLine: true,
    fields: [
      {
        key: 'response',
        label: "Name what you're resisting or wishing were different. Then meet it plainly: this is what's happening right now.",
        hint: "Acceptance isn't approval or giving up — it's stopping the argument with reality so you can act clearly.",
        placeholder: "E.g., 'I keep wishing this hadn't happened — but it did.'",
      },
    ],
  },
  SphereSovereignty: {
    subtitle: "Sort what's yours from what isn't. Either order — when it's heavy, start with what you can set down.",
    fields: [
      {
        key: 'notMine',
        label: "What here isn't yours to control? Name it, and loosen your grip.",
        hint: "Let it be what it is — 'this part is not up to me.' Loosening your grip, not deciding it doesn't matter.",
        placeholder: "E.g., 'Whether they approve; how long this takes.'",
      },
      {
        key: 'mine',
        label: 'What here IS yours — where is your real leverage or influence?',
        hint: 'Invest your energy here.',
        placeholder: "E.g., 'My preparation, my tone, whether I ask for help.'",
      },
    ],
  },
  VirtuousResponse: {
    subtitle: 'The obstacle is the material for virtue.',
    virtueChips: true,
    virtueChipsPrompt: 'Which virtues does this moment call on? (Choose any.)',
    fields: [
      {
        key: 'response',
        label: "Now bring them into one thing: what's the virtuous action you'll take?",
        hint: 'The virtues are a lens, not a checklist — let them meet in a single next step.',
        placeholder: "E.g., 'Say the hard thing, kindly, and keep it brief.'",
      },
    ],
  },
  InterconnectedLiving: {
    subtitle: "You're one member of a shared human community.",
    fields: [
      {
        key: 'response',
        label: 'Widen the view: who shares this with you? Where could you let yourself be supported — and how can you serve them?',
        hint: "Interdependence runs both ways: it's okay to receive, and yours to give.",
        placeholder: "E.g., 'Let my partner know I'm struggling; check in on a teammate carrying the same load.'",
      },
    ],
  },
};

const MORNING: ModeConfig = {
  AwarePresence: {
    subtitle: 'Settle into this moment before the day begins.',
    grounding: [
      'one sensation in your body as the day opens',
      'the space around you — where you are',
      "what's on your mind as you begin",
    ],
    fields: [
      {
        key: 'response',
        label: "What's here as you start? (optional)",
        hint: 'One sensation, not a scan. Just land here.',
        placeholder: "E.g., 'A little restless; cool air; thinking ahead to the day.'",
      },
    ],
  },
  RadicalAcceptance: {
    subtitle: 'Meet in advance what the day may ask you to accept.',
    supportLine: true,
    fields: [
      {
        key: 'response',
        label: 'What might today ask you to accept — a constraint, an uncertainty, something outside your wishes?',
        hint: 'Meeting it in advance means it lands with less shock.',
        placeholder: "E.g., 'I may not get to everything on my list today.'",
      },
    ],
  },
  SphereSovereignty: {
    subtitle: "Name where your leverage is in what's ahead. Either order.",
    fields: [
      {
        key: 'notMine',
        label: "What's ahead today that won't be up to you? Name it, and hold it lightly.",
        hint: "'This part is not up to me.'",
        placeholder: "E.g., 'The decision, the weather, how others react.'",
      },
      {
        key: 'mine',
        label: 'Where is your effort genuinely up to you? (Hold the outcome lightly.)',
        hint: "Commit fully here — 'I'll do this, if nothing prevents me.'",
        placeholder: "E.g., 'How well I prepare; how I show up.'",
      },
    ],
  },
  VirtuousResponse: {
    subtitle: 'Choose the character you want to bring to the day.',
    virtueChips: true,
    virtueChipsPrompt: 'Which virtues do you most want to embody today? (Choose any.)',
    fields: [
      {
        key: 'response',
        label: "Picture one moment you'll need them — what's the action you want to take?",
        hint: 'Let the virtues meet in a single intention for the day.',
        placeholder: "E.g., 'Stay measured in the afternoon rush.'",
      },
    ],
  },
  InterconnectedLiving: {
    subtitle: 'You share the day with others.',
    fields: [
      {
        key: 'response',
        label: 'Who will you share today with — where might you lean on someone, and where can you show up for them?',
        hint: "It's okay to receive, and yours to give.",
        placeholder: "E.g., 'Ask for help on the report; make time to really listen tonight.'",
      },
    ],
  },
};

const EVENING: ModeConfig = {
  AwarePresence: {
    subtitle: 'Let the day settle. Arrive here now.',
    grounding: [
      'one sensation in your body as the day settles',
      'where you are right now',
      "what's present as you look back",
    ],
    fields: [
      {
        key: 'response',
        label: "What's present as the day settles? (optional)",
        hint: 'One sensation, not a scan. Just land here.',
        placeholder: "E.g., 'Tired shoulders; a quiet house; calmer than this morning.'",
      },
    ],
  },
  RadicalAcceptance: {
    subtitle: 'Notice where you argued with reality today.',
    supportLine: true,
    fields: [
      {
        key: 'response',
        label: "Where did you resist reality today — a 'this shouldn't be happening'? Name it, and let it be what it was.",
        hint: 'Not self-blame — just noticing where the extra suffering came from.',
        placeholder: "E.g., 'I fought the delay all afternoon instead of adjusting.'",
      },
    ],
  },
  SphereSovereignty: {
    subtitle: 'Calibrate where your energy went. Either order.',
    fields: [
      {
        key: 'notMine',
        label: "Where did you spend energy on what you couldn't control?",
        hint: "Just noticing — so you can set it down.",
        placeholder: "E.g., 'Replaying their reply in my head.'",
      },
      {
        key: 'mine',
        label: 'Where did you rightly focus on what was yours?',
        hint: 'This is where your effort actually landed.',
        placeholder: "E.g., 'I chose my response instead of reacting.'",
      },
    ],
  },
  VirtuousResponse: {
    subtitle: 'Review the character you brought to the day.',
    virtueChips: true,
    virtueChipsPrompt: 'Which virtues did today call on? (Choose any.)',
    fields: [
      {
        key: 'response',
        label: 'Where did you meet them, or fall short — and how would you meet it next time?',
        hint: 'Honest review, with compassion — not self-flagellation.',
        placeholder: "E.g., 'Courage in the meeting; short on temperance at dinner.'",
      },
    ],
  },
  InterconnectedLiving: {
    subtitle: "See how your day and others' were woven together.",
    fields: [
      {
        key: 'response',
        label: 'Who held you up today, and whom did you support — or miss the chance to?',
        hint: 'Both the receiving and the giving are worth seeing.',
        placeholder: "E.g., 'A colleague covered for me; I brushed past someone who needed a minute.'",
      },
    ],
  },
};

const CONFIG_BY_MODE: Record<DailyLoopMode, ModeConfig> = {
  flat: FLAT,
  morning: MORNING,
  evening: EVENING,
};

/** Resolve the shape + copy for a given (mode, step). */
export function getStepConfig(mode: DailyLoopMode, step: DailyLoopStepKey): StepConfig {
  return CONFIG_BY_MODE[mode][step];
}

/** Closing-breath coda copy (practice-architecture, NOT a principle beat). */
export const CLOSING = {
  breathTitle: 'Breathe and release',
  breathSubtitle: 'One slow breath. Loosen your grip, and let this be complete.',
  completeTitle: 'You moved through all five principles.',
  noteLabel: 'Anything to carry back with you? (optional)',
  notePlaceholder: "E.g., 'Focus on what's mine; act with courage.'",
} as const;

/** Human-readable mode labels for the mode picker. */
export const MODE_LABELS: Record<DailyLoopMode, { label: string; blurb: string }> = {
  flat: { label: 'Flat', blurb: 'Time-agnostic — the five principles, plainly.' },
  morning: { label: 'Morning', blurb: 'Prospective — intention for the day ahead.' },
  evening: { label: 'Evening', blurb: 'Retrospective — reflection on the day behind.' },
};
