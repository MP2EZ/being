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
 *  - COMPLETION MAY BE STATED, NEVER MARKED (FEAT-328). The coda may say once, in the
 *    title, in body register, that the practice is finished. It may not MARK that fact:
 *    no checkmark, no accent-coloured surface, no toast, no count, no streak, no badge.
 *    Accent teal is this app's reward vocabulary and the coda carries none of it.
 *    Rationale: completing a loop is an outcome, and the framework's spine is intention
 *    over outcome — the practice is not a completable item, so a "done" verdict on a
 *    day's practice contradicts the two lines directly beneath it (returnLine, which
 *    says beginning again IS the practice, and postureLine, whose examen ends in
 *    clemency and therefore presupposes shortfall). This invariant replaces an earlier
 *    formulation that COUNTED congratulatory beats; counting invited the reading that
 *    two were acceptable, and a badge duly survived in the same file that banned a
 *    third. State the register, not the tally.
 */
import type { DailyLoopMode, DailyLoopDepth } from '@/features/practices/types/flows';
import type { CardinalVirtue, StoicPrinciple } from '@/features/practices/types/stoic';
import type { PrincipleEngagementType } from '@/features/practices/stores/stoicPracticeStore';

export const DAILY_LOOP_STEP_KEYS = [
  'AwarePresence',
  'RadicalAcceptance',
  'SphereSovereignty',
  'VirtuousResponse',
  'InterconnectedLiving',
] as const;

export type DailyLoopStepKey = (typeof DAILY_LOOP_STEP_KEYS)[number];

/**
 * Loop step → the canonical Stoic principle that beat IS (FEAT-298 slice 3).
 *
 * Not a lookup of convenience: each beat is one principle, which is why the loop can
 * record principle engagements at all. Total `Record`, so a new beat cannot be added
 * without deciding its principle.
 */
export const STEP_PRINCIPLE: Record<DailyLoopStepKey, StoicPrinciple> = {
  AwarePresence: 'aware_presence',
  RadicalAcceptance: 'radical_acceptance',
  SphereSovereignty: 'sphere_sovereignty',
  VirtuousResponse: 'virtuous_response',
  InterconnectedLiving: 'interconnected_living',
};

/**
 * Tense mode → the engagement type a loop session records (FEAT-298 slice 3,
 * philosopher pass).
 *
 * The type is derived from MODE and is uniform across the beats of a session, because
 * within a mode every beat shares the same tense and act-shape. The three modes map 1:1
 * onto what the legacy flows recorded, which is what keeps the 90-day Insights chart and
 * the JSON export interpretable ACROSS the slice-6 flow retirement: a 'selected' written
 * by a morning-mode loop means what one written by the retired morning flow meant.
 *
 * `'selected'` is read here as PROSPECTIVE FOCUS (the tense), not "picked one principle
 * from a menu" — the loop brings all five to focus rather than choosing among them. See
 * the docstring on `PrincipleEngagementType`, updated to match.
 *
 * NOT per-beat: varying the type across beats within a mode would encode a ranking of
 * kinds-of-engagement across the five principles, which the Insights chart explicitly
 * rejects, and it is never displayed anyway — only stored and exported.
 *
 * `'practiced'` is deliberately absent: it is FEAT-133's Learn-module marker, and reusing
 * it would leave the exported vocabulary unable to tell in-app education from lived
 * practice.
 */
export const ENGAGEMENT_TYPE_BY_MODE: Record<DailyLoopMode, PrincipleEngagementType> = {
  morning: 'selected',
  flat: 'applied',
  evening: 'reflected',
};

/**
 * FEAT-301 — the QUICK depth variant: canonical steps 1→3→4 (arrive → discern
 * what's yours → act). A short, self-contained micro-arc, NOT a truncated fragment:
 * the dichotomy-of-control discernment (Sphere Sovereignty) sits between arriving and
 * acting, so the synthesized Virtuous Response issues from clarity rather than
 * reactivity (discipline of action presupposes discipline of desire). It reuses the
 * SAME canonical StepConfig for each included step, so the philosopher NAMES+ORDER
 * invariant above holds — quick runs a SUBSET in canonical order, never a rename or
 * reorder. Radical Acceptance (2) and Interconnected Living (5) are omitted from quick.
 */
export const QUICK_STEP_KEYS = [
  'AwarePresence',
  'SphereSovereignty',
  'VirtuousResponse',
] as const satisfies readonly DailyLoopStepKey[];

/** Resolve the ordered step keys for a depth. Deep = the full five; quick = 1→3→4. */
export function getStepKeysForDepth(depth: DailyLoopDepth): readonly DailyLoopStepKey[] {
  return depth === 'quick' ? QUICK_STEP_KEYS : DAILY_LOOP_STEP_KEYS;
}

/**
 * FEAT-301 — re-host of the crisis SUPPORT_LINE for the QUICK variant. Quick omits
 * Radical Acceptance (deep's support-line carrier), so the quiet static support
 * affordance is re-hosted onto SPHERE SOVEREIGNTY — quick's second beat and, crucially,
 * a NO-breath-gate beat: it renders the instant the user lands (unlike Aware Presence,
 * whose reflection phase sits behind a 30s breath, which would make quick's crisis
 * affordance strictly less available than deep's — crisis-review rejected). Sphere
 * Sovereignty is also distress-adjacent ("when it's heavy, start with what you can set
 * down"). Deep is unchanged (support line stays on Radical Acceptance via
 * StepConfig.supportLine). The immersive root crisis overlay (MAINT-290) still covers
 * every step of both variants regardless (route name 'DailyLoop' unchanged).
 */
export const QUICK_SUPPORT_STEP: DailyLoopStepKey = 'SphereSovereignty';

/**
 * Whether the quiet crisis support line shows for a given (depth, mode, step). Kept at
 * the DATA level (not a screen ternary) so tenseMode.test.ts can assert the crisis
 * "exactly once, per depth" invariant (crisis review):
 *  - deep  : exactly Radical Acceptance (delegated to its StepConfig.supportLine — deep
 *            behavior is byte-for-byte unchanged)
 *  - quick : exactly QUICK_SUPPORT_STEP (Sphere Sovereignty)
 */
export function showsSupportLine(
  depth: DailyLoopDepth,
  mode: DailyLoopMode,
  step: DailyLoopStepKey,
): boolean {
  if (depth === 'quick') return step === QUICK_SUPPORT_STEP;
  return getStepConfig(mode, step).supportLine === true;
}

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
        // MAINT-566. The virtue NAMES need not appear here; the discernment MOVE
        // must. The virtueChips selector directly above already names all four
        // cardinal virtues with glosses, so that UI is the doctrine-carrying
        // surface — and this file's own INVARIANT block calls naming a virtue
        // "optional scaffolding, never a gate" for this beat. Repeating the names
        // as bare labels is what produced the audit-report register a reader
        // reported as "never said by any human"; dropping them is not dropping
        // doctrine. The example still models all three parts of the label above:
        // met, fell short, and the next-time correction.
        placeholder:
          "E.g., 'I spoke up in the meeting even though I was nervous. I snapped at dinner when I got tired — next time I'll eat something first.'",
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
  /**
   * FEAT-298 slice 6b — gratitude, re-homed from the retired morning/evening flows
   * (FEAT-313 decision, philosopher pass).
   *
   * The warrant is NOT "deleting the flows removes gratitude from the app" — that premise
   * is false (a weak, generic `gratitude-reflection` survives in module-4). It is a defect
   * in ALREADY-SHIPPED code: the loop ships PREMEDITATIO (beat 4, morning-only), and
   * principles/04-virtuous-response.md:52 makes present-moment gratitude its REQUIRED
   * complement — "after briefly contemplating potential loss, turn attention to what you
   * actually have right now." The loop has been shipping the aversive half of a two-half
   * practice with no complement.
   *
   * Placed BEFORE postureLine: De Ira 3.36 runs review → clemency, and the pardon is
   * terminal. Gratitude precedes the self-pardon, never follows it.
   *
   * VARIES BY TENSE — deliberately unlike postureLine. Morning and evening are genuinely
   * different practices in the framework (impermanence-framed vs. specific-retrospective)
   * and collapsing them would lose a distinction the doc is explicit about. `flat` is
   * authored too: neither retired screen ever covered the midday band.
   *
   * A STATIC LINE, not a second input. The coda already has one input and a second would
   * turn a closing into a form. Marcus 7.27 is a perceptual act, and the framework's own
   * justification is that specificity engages memory and emotion — not text entry. Nothing
   * to submit, nothing to skip: optional in the strongest sense.
   *
   * Depth-invariant, so it reaches quick AND deep in all three tenses — avoiding the exact
   * bug 6a's docstring names, "a posture reachable in only one tense."
   *
   * Warrants — morning: Epictetus, Enchiridion 11. flat: Marcus, Meditations 7.27.
   * evening: Marcus, Meditations Bk 1 + daily-architecture.md, Evening Examen §5
   * "Three Gratitudes" (the specificity standard: "a moment, not a category").
   * NOTE: this cited "daily-architecture.md:127-131" until MAINT-322 — a line range that
   * pointed at §4 Mental Rehearsal, not §5, and was already off at HEAD. Cite the section,
   * never a line range: the doc is edited far more often than this file.
   */
  gratitudeLine: {
    morning:
      "This day isn't promised. Notice one thing in it you'd miss if it were gone — not owed to you, which is what makes it worth seeing.",
    flat:
      "Look at what's already here. Take one thing you have and ask how hard you'd have chased it if you didn't — then let yourself actually see it.",
    evening:
      "Before this day closes, find one specific thing in it you're glad of — a moment, not a category. 'That ten minutes on the porch,' not 'my life.'",
  } satisfies Record<DailyLoopMode, string>,
  /**
   * FEAT-298 slice 6a — the self-compassion posture, re-homed from the retired Midday
   * CompassionateCloseScreen (philosopher pass).
   *
   * It lives HERE, in the coda, not in step 5. Step 5 is oikeiōsis / belonging and its
   * copy is other-directed by construction. The classical warrant for the coda position is
   * Seneca, De Ira 3.36.3, where the nightly examination ENDS in self-pardon — "vide ne
   * istud amplius facias; nunc tibi ignosco" ("see that you never do that again; this time
   * I pardon you"). Seneca puts the clemency after the honest review, not inside it.
   * (Narrowed from "3.36.3-4" at MAINT-322: the pardon is at 3.36.3; 3.36.4 is the
   * unrelated "in illa disputatione" examples. 3.36.2 has "speculator sui censorque".)
   *
   * The substance is Stoic (prokopē — you are a progressor in training, never a sage, so
   * falling short is the expected condition of the practice). The WORD "compassion" is the
   * therapeutic import and is deliberately absent: resources.md itself flags Neff as "not
   * explicitly Stoic". Ship the substance, not the label.
   *
   * ONE string for all three tenses — the posture is tense-invariant (you are a progressor
   * prospectively and retrospectively alike), and splitting it by tense would recreate the
   * exact bug this fixes: a posture reachable in only one tense.
   *
   * Keeps the standard and removes only the surplus: "be honest" stays, "no harsher than
   * honest" is what is added. Never praise, never absolution, never indulgence.
   */
  postureLine:
    'Be honest with yourself, and no harsher than honest. The honesty is what corrects; harshness only adds weight.',
  noteLabel: 'Anything to carry back with you? (optional)',
  // Amended (slice 6a): carries the self-directed example the retired screen had.
  notePlaceholder:
    "E.g., 'Focus on what's mine; act with courage.' Or 'Steady, and patient with myself.' Or simply what you were glad of.",
  /**
   * Re-homes MAINT-140's "return anytime" reinforcement, which had no equivalent in the
   * loop (the only re-entry signal was a navigation button label). Upgraded from "the pause
   * is always available" to the Stoic reading — re-entry after shortfall IS the practice
   * (Marcus, Meditations 5.9) — which also inoculates against the streak anxiety
   * stageNotes.ts bans elsewhere. MAINT-140's CelebrationToast delivery is deliberately
   * NOT reproduced — see the "completion may be stated, never marked" INVARIANT at the top
   * of this file, which is the governing rule and supersedes the beat-counting phrasing
   * that used to sit here.
   *
   * DEBUG-339 — DO NOT STRIP THIS CITATION. It has now been challenged twice and is
   * correct both times, so here is the warrant in full. George Long, Meditations 5.9:
   * "Be not disgusted, nor discouraged, nor dissatisfied, if thou dost not succeed in
   * doing everything according to right principles, but when thou hast failed, return
   * back again, and be content if the greater part of what thou doest is consistent with
   * man's nature, and love this to which thou returnest."
   *
   * What DEBUG-330 removed was a SPURIOUS QUOTATION ("You have power over your mind — not
   * outside events...") that had been falsely hung on 5.9 inside PRACTICE_QUOTES. The
   * LOCUS itself is genuine and is precisely the passage about failing and beginning
   * again, which is what `returnLine` below paraphrases. DEBUG-339 was filed asserting
   * this was a "phantom" citation; three independent reviews confirmed it is not, and the
   * acceptance criterion was withdrawn. Note also that nothing here QUOTES 5.9 — the
   * shipped copy carries no citation at all; this is a developer-facing warrant for a
   * paraphrase, which is a weaker claim than a quotation and correctly made.
   */
  returnLine:
    'Falling short and beginning again is the practice, not a break from it. Come back to this as often as that takes.',
} as const;

// FEAT-298 slice 5: MODE_LABELS removed with DailyLoopModeSelectScreen. The tense is now
// inferred from the clock and is never surfaced to the user, so there is nothing to label.
// DailyLoopMode itself survives as an internal, time-derived value.

/**
 * FEAT-301 — depth-picker copy. Two EQUAL, always-available choices. Symmetric,
 * non-ranking voice (philosopher requirement): quick is never framed as lesser /
 * lite / partial, and deep is never framed as the "real" / "full" / "proper" practice
 * by contrast — the axis is how much time this moment allows, not quality.
 */
export const DEPTH_PICKER_COPY = {
  title: 'Daily Practice',
  subtitle: 'Choose what fits this moment.',
  /**
   * DEBUG-469 — FEAT-301's non-ranking guarantee, split out of `subtitle` so it can be
   * PINNED alongside the two choices rather than left in the scrolling region above them.
   *
   * The em-dash clause used to end the subtitle. Once the choices were pinned, the moment
   * of choosing moved into the pinned region, and at large text sizes a user could tap
   * `Quick` having never scrolled to this sentence — leaving `Quick` bare against
   * `Unhurried`, which is exactly the "quick is the lite version" inference FEAT-301 exists
   * to block and which the two frozen labels alone do not rebut.
   *
   * Verbatim and unconditional: never abbreviated, never merged into a card, never
   * rendered only as an accessibilityHint/Label, never given numberOfLines, and never
   * hidden at any font scale. It is the LAST element that may be dropped from the pinned
   * region, never the first.
   */
  guarantee: 'Both are complete practices.',
} as const;

export const DEPTH_LABELS: Record<DailyLoopDepth, { label: string; blurb: string }> = {
  quick: {
    label: 'Quick',
    blurb: "A short, self-contained practice — arrive, see what's yours, and act. Whole in a few minutes.",
  },
  // 'Unhurried' (not 'Deeper' / 'Deep') pairs symmetrically with 'Quick' on the only
  // non-ranking axis the two variants genuinely differ on — pace/space, NOT
  // depth/completeness (philosopher: 'Deeper' silently codes Quick as less-deep). The
  // blurb differentiates on spaciousness, never on a count of principles (which would
  // cluster 'complete/all' onto deep and undercut "both are complete practices").
  deep: {
    label: 'Unhurried',
    blurb: 'The unhurried loop — more room to pause, reflect, and let each step land.',
  },
};

/**
 * FEAT-301 — the completion-title copy is depth-aware. Deep keeps CLOSING.completeTitle
 * ("You moved through all five principles"); quick MUST NOT reuse it — that count is
 * factually wrong for the 3-beat arc and re-ranks quick as the deficient version
 * (philosopher blocker). Quick closes with a non-counting line.
 */
export function getCompleteTitle(depth: DailyLoopDepth): string {
  return depth === 'quick' ? 'You moved through the practice.' : CLOSING.completeTitle;
}
