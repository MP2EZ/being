/**
 * Tunable constants for practice haptics (FEAT-285).
 *
 * Values here were set by the `performance` planning pass. They are in one
 * module because they govern felt behaviour and deserve to be reviewed
 * together rather than found as literals across the engine and scheduler.
 */

/**
 * Minimum gap between two DELIVERED cues, in ms. Anything arriving sooner is
 * dropped outright — never queued, never retried, never deferred.
 *
 * 500ms is chosen to sit in a wide dead zone. The tightest legitimate boundary
 * gap in any shipped pattern is 4000ms (the shortest phase in both 4-4 and
 * 4-4-6), so the floor is 8x below anything real and cannot suppress a genuine
 * cue. It sits well above the ~50ms hardware retrigger window, where transients
 * blur into each other, and above the ~100ms window in which two taps merge
 * perceptually — so anything it drops would have felt wrong regardless.
 *
 * What it actually catches: React double-invoked effects, a resume flush
 * landing several overdue boundaries in one tick, a re-render restarting the
 * scheduler, and accidental double-wiring of both breathing engines.
 */
export const MIN_CUE_INTERVAL_MS = 500;

/**
 * How late a cue may be and still be worth delivering, in ms.
 *
 * setTimeout on RN is essentially never early and often late — roughly +10-15ms
 * at p50, ~+50ms at p90, and 100-250ms at p99 on low-end Android when a React
 * commit lands on the same tick. Rather than fire late, the scheduler drops the
 * cue and re-arms for the next boundary.
 *
 * 150ms is the visuotactile simultaneity ceiling: below it the pulse still
 * reads as "the cue for that transition"; above it it reads as an unexplained
 * buzz, which during a calming practice is worse than silence.
 */
export const MAX_CUE_LATENESS_MS = 150;

/**
 * How long AFTER a haptic its paired screen-reader announcement is issued, ms.
 *
 * The haptic leads. This is the only orderable direction: RN surfaces no
 * completion callback for `announceForAccessibility` on either platform, so
 * "haptic after speech" would mean guessing an utterance duration that varies
 * with the user's speech rate (0.5x-3x). Haptic-first is deterministic and
 * testable.
 *
 * It is also the right direction on the merits. For a blind practitioner with
 * the circle unavailable, the haptic IS the "now" signal — they inhale on the
 * tap. Displacing it behind an announcement's variable queue latency is a
 * 2.5-10% pacing error on a 4000ms inhale. Speech can absorb latency; the tap
 * cannot.
 *
 * 150ms specifically: above the ~80ms floor where a tactile event fuses with
 * speech onset into one percept (which measurably degrades phoneme
 * identification), and below the ~300-400ms ceiling where the two stop reading
 * as related — so it lands as "signal, then label."
 *
 * Same value on both platforms. Android's slower actuator (~30-80ms vs iOS's
 * ~10-20ms) is the reason NOT to shrink it: 150ms absorbs an 80ms Android delay
 * with margin. The honest guarantee is that the haptic is ISSUED first — on a
 * slow actuator the felt order can still invert, and that is acceptable because
 * the failure mode is simultaneity, not reversal.
 */
export const HAPTIC_ANNOUNCEMENT_STAGGER_MS = 150;
