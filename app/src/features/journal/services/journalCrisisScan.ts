/**
 * journalCrisisScan — crisis scanning around the journal capture flow
 * (FEAT-283 Slice A, AC #4)
 *
 * Domain Authority: crisis (CRITICAL).
 *
 * `detectCrisisInText` answers "is there a disclosure in this string". This
 * module answers the harder questions: when to ask, what to do about an edit
 * between asks, and what may leave the device as a result.
 *
 * TWO SCAN POINTS, BOTH REQUIRED
 *
 * The AC says "each transcribed entry". An entry that was transcribed and then
 * discarded was still transcribed — the person was still in crisis. Scanning
 * only on save means someone who speaks a disclosure, reads it back, panics and
 * deletes it gets nothing. That is a false negative produced by the flow rather
 * than by the scanner.
 *
 * Save-time scanning is equally non-optional, because the transcript is edited
 * in a real text input: an edit can introduce language the recognizer never
 * produced.
 *
 * ESCALATION IS ONE-WAY
 *
 * Clean-then-crisis surfaces support. Crisis-then-clean does NOT retract it.
 * Discarding the draft does not retract it either. Every transition moves
 * toward more support, never less — the only safe direction when the input is
 * a person's own account of their state.
 *
 * ONE ALERT PER DRAFT
 *
 * Positive at both scan points is one episode, not two. This is the
 * double-alert family MAINT-166 fixed and `.maestro/q9-single-alert.yaml` pins.
 *
 * WHAT MAY LEAVE THE DEVICE
 *
 * Only the four allow-listed `trackCrisisDetection` fields, all categorical:
 * that a scan fired, at what severity bucket, whether support was surfaced, on
 * which surface. Never the transcript, an excerpt, a match offset, a character
 * count, or a per-phrase trigger id — a count is a partial read of content and
 * a per-phrase id identifies what was said. The scan result type is content-free
 * by construction, so there is nothing sensitive here to leak by accident.
 *
 * Telemetry is emitted AFTER the UI call and never awaited: a failed or slow
 * network write must not delay, suppress, or break the intervention.
 */

import { detectCrisisInText } from '@/features/crisis/services/textCrisisDetection';
import { showCrisisAlert } from '@/features/crisis/services/crisisAlert';
import SupabaseService from '@/core/services/supabase/SupabaseService';
import { logSecurity } from '@/core/services/logging';

/** Same budget, and the same log string, as the assessment crisis path. */
const CRISIS_RESPONSE_BUDGET_MS = 200;

/** Categorical. Deliberately one value — see header. */
const TRIGGER_TYPE = 'journal_text_match';
const SURFACE = 'voice_journal';

export interface JournalScanResult {
  /** This scan found a disclosure. */
  triggered: boolean;
  /** Support is showing for this draft — sticky once true. */
  interventionActive: boolean;
}

interface ScannerOptions {
  /** Injectable clock, for budget-breach specs. */
  now?: () => number;
}

export class JournalCrisisScanner {
  private readonly now: () => number;

  /** Drafts with an active intervention. Never cleared by an edit or discard. */
  private readonly active = new Set<string>();

  constructor(options: ScannerOptions = {}) {
    this.now = options.now ?? (() => performance.now());
  }

  /** Scan when the recognizer produces its final transcript. */
  scanOnFinalize(draftId: string, text: string): JournalScanResult {
    return this.scan(draftId, text);
  }

  /** Scan the exact string being handed to encryption. */
  scanOnSave(draftId: string, text: string): JournalScanResult {
    return this.scan(draftId, text);
  }

  isInterventionActive(draftId: string): boolean {
    return this.active.has(draftId);
  }

  /**
   * The draft was thrown away. Deliberately does not clear the intervention:
   * discarding the text does not undo the disclosure.
   */
  onDraftDiscarded(_draftId: string): void {
    // Intentionally empty — documented above.
  }

  private scan(draftId: string, text: string): JournalScanResult {
    const startedAt = this.now();
    const detection = detectCrisisInText(text);
    const elapsed = this.now() - startedAt;

    if (elapsed > CRISIS_RESPONSE_BUDGET_MS) {
      // Same event string as the assessment path so log queries do not fork.
      // A breach is a logged degradation, never a reason to scan less.
      logSecurity('Crisis detection time exceeded', 'high', {
        responseTime: elapsed,
        threshold: CRISIS_RESPONSE_BUDGET_MS,
      });
    }

    if (!detection) {
      return { triggered: false, interventionActive: this.active.has(draftId) };
    }

    const alreadyActive = this.active.has(draftId);
    this.active.add(draftId);

    if (!alreadyActive) {
      // UI first, always. A throwing Alert must not take down the in-page
      // banner, which is the durable affordance and the only thing an e2e
      // flow can assert.
      try {
        showCrisisAlert();
      } catch {
        // Swallowed deliberately — `triggered` is still returned below.
      }

      void this.emitTelemetry();
    }

    return { triggered: true, interventionActive: true };
  }

  private async emitTelemetry(): Promise<void> {
    try {
      await SupabaseService.trackCrisisDetection({
        trigger_type: TRIGGER_TYPE,
        severity_bucket: 'high',
        intervention_surfaced: true,
        assessment_type: SURFACE,
      });
    } catch {
      // Fire-and-forget: telemetry failure must never surface to the user or
      // interrupt the crisis path.
    }
  }
}

/** Shared instance for the capture flow. */
export const journalCrisisScanner = new JournalCrisisScanner();
