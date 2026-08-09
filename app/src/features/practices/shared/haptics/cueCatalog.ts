/**
 * cueCatalog — what each practice vibration MEANS (FEAT-285).
 *
 * This module exists to be a single review surface. Haptics are an unrequested
 * somatic intervention during a practice whose whole purpose is sensitising the
 * practitioner to their own body, so every cue the app can emit is written down
 * here with its meaning in plain language, next to the primitive that carries it
 * on each platform. Reviewing "is this vibration justified?" should mean reading
 * one file, not tracing call sites across three screens.
 *
 * DESIGN RULES ENCODED HERE
 * - Meaning is platform-independent. The waveform may differ between iOS and
 *   Android (their primitives genuinely feel different); what the cue *tells the
 *   practitioner* must not. `meaningFor` takes a platform precisely so a future
 *   attempt to diverge the copy fails a test instead of shipping.
 * - Totality. Every cue needs both primitives. A cue that resolves on one
 *   platform and silently no-ops on the other is worse than no cue at all,
 *   because an eyes-closed practitioner cannot tell the difference between "no
 *   signal" and "no transition".
 * - No signatures, no escalation. There is exactly one region-transition cue and
 *   exactly one interval cue. Encoding *which* region, or how near the end you
 *   are, turns a felt rhythm into something to decode.
 */

/**
 * Semantic expo-haptics primitives. These are intentionally the semantic API
 * (impact / selection / notification) rather than raw durations: the OS maps
 * them to whatever the device's actuator can actually render, which is the first
 * rung of the degradation ladder for free.
 */
export const HAPTIC_PRIMITIVES = [
  'impactLight',
  'impactMedium',
  'impactHeavy',
  'selection',
  'notificationSuccess',
  'notificationWarning',
  'notificationError',
] as const;

export type HapticPrimitive = (typeof HAPTIC_PRIMITIVES)[number];

export type HapticPlatform = 'ios' | 'android';

/**
 * Every cue the practice surfaces can emit. Adding a name here without adding a
 * catalog entry fails `cueCatalog.test.ts`, and vice versa.
 */
export const PRACTICE_CUES = Object.freeze([
  'sessionStart',
  'inhale',
  'hold',
  'exhale',
  'regionTransition',
  'intervalTick',
  'sessionEnd',
] as const);

export type PracticeCue = (typeof PRACTICE_CUES)[number];

export interface CueDefinition {
  /** Plain-language meaning. Identical across platforms, by construction. */
  readonly meaning: string;
  readonly ios: HapticPrimitive;
  readonly android: HapticPrimitive;
}

/**
 * The catalog. Frozen so a call site cannot quietly re-point a cue at a
 * different primitive at runtime and escape review.
 *
 * Primitive choices follow the work item's technical notes: inhale and exhale
 * are deliberately contrasted (Light against Medium) so the two halves of the
 * breath are distinguishable by feel alone; the hold uses `selection`, the
 * lightest tick available, because a hold is a boundary you rest inside rather
 * than an instruction to act.
 */
export const CUE_CATALOG: Readonly<Record<PracticeCue, CueDefinition>> = Object.freeze({
  sessionStart: Object.freeze({
    meaning: 'The practice has begun. You can close your eyes now.',
    ios: 'impactLight',
    android: 'impactLight',
  }),
  inhale: Object.freeze({
    meaning: 'Begin breathing in.',
    ios: 'impactLight',
    android: 'impactLight',
  }),
  hold: Object.freeze({
    meaning: 'Hold the breath.',
    ios: 'selection',
    android: 'selection',
  }),
  exhale: Object.freeze({
    meaning: 'Begin releasing the breath.',
    ios: 'impactMedium',
    android: 'impactMedium',
  }),
  regionTransition: Object.freeze({
    meaning: 'Move your attention to the next area of the body.',
    ios: 'impactMedium',
    android: 'impactMedium',
  }),
  intervalTick: Object.freeze({
    meaning: 'Time is passing. Nothing is required of you.',
    ios: 'impactLight',
    android: 'impactLight',
  }),
  sessionEnd: Object.freeze({
    meaning: 'The practice is complete.',
    ios: 'notificationSuccess',
    android: 'notificationSuccess',
  }),
} as const);

/** The primitive that carries `cue` on `platform`. */
export function primitiveFor(cue: PracticeCue, platform: HapticPlatform): HapticPrimitive {
  return platform === 'ios' ? CUE_CATALOG[cue].ios : CUE_CATALOG[cue].android;
}

/**
 * The meaning of `cue`. Takes a platform so that the "meaning is identical
 * everywhere" rule is an executable assertion rather than a comment.
 */
export function meaningFor(cue: PracticeCue, _platform: HapticPlatform): string {
  return CUE_CATALOG[cue].meaning;
}
