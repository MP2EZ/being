/**
 * Subscription audit-log writer (DEBUG-446).
 *
 * WHY THIS EXISTS AS A MODULE RATHER THAN AN INLINE FIX.
 * Every one of the twelve `log_subscription_event` call sites in supabase/functions/ used to
 * be a bare `await supabase.rpc(...)` with the result discarded. That is how DEBUG-446 stayed
 * invisible: the success path passed an event_type the CHECK constraint rejected, Postgres
 * returned the violation, and nothing read it — so every successful receipt verification
 * wrote no audit row and reported nothing.
 *
 * Fixing the two call sites that happen to hit the constraint today would leave ten more that
 * would hide the next mismatch just as completely. Routing all twelve through one writer makes
 * the thirteenth call site correct by default, which a repeated inline destructure does not.
 *
 * NON-FATAL BY DESIGN — this is a ruling, not an oversight.
 * A failed audit write MUST NOT reject the operation that triggered it. No regime Being is
 * subject to (FTC Act §5, FTC HBNR, CCPA/CPRA, TDPSA, VCDPA, CPA, CTDPA, GDPR — Being is not
 * HIPAA-covered, see docs/legal/regulatory-applicability.md) conditions completion of a
 * payment or entitlement transaction on an internal audit insert succeeding. Rejecting a
 * receipt Apple or Google already verified, because a downstream logging row failed, is the
 * worse consumer-protection exposure — and the `subscriptions` upsert (the authoritative
 * entitlement record) has already committed by the time this runs.
 *
 * So: surfaced, never fatal. The caller is not given an error to propagate; it is given a
 * boolean it may ignore. What changed versus the defect is that the failure is now VISIBLE in
 * function logs instead of silently absorbed.
 *
 * The error text is a Postgres error string — it carries no wellness content, and callers must
 * keep it that way by never putting user content into p_metadata (which is separately capped
 * at 2KB by the metadata_size CHECK).
 */

// deno-lint-ignore no-explicit-any
type SupabaseLike = { rpc: (fn: string, params: Record<string, unknown>) => Promise<any> };

export interface SubscriptionAuditEvent {
  userId: string;
  subscriptionId: string | null;
  eventType: string;
  metadata: Record<string, unknown>;
}

/**
 * Write one subscription audit event, surfacing any failure.
 *
 * @returns true when the row landed; false when the RPC reported an error (already logged).
 *          Callers may ignore the result — see the non-fatal ruling above.
 */
export async function logSubscriptionEvent(
  supabase: SupabaseLike,
  event: SubscriptionAuditEvent,
): Promise<boolean> {
  const { error } = await supabase.rpc('log_subscription_event', {
    p_user_id: event.userId,
    p_subscription_id: event.subscriptionId,
    p_event_type: event.eventType,
    p_metadata: event.metadata,
  });

  if (error) {
    // Structured and loud. This is the line whose absence made DEBUG-446 invisible for the
    // lifetime of the function; a bare `catch {}` here would recreate the defect exactly.
    console.error(
      '[subscription-audit] log_subscription_event FAILED — the audit row was NOT written.',
      JSON.stringify({
        event_type: event.eventType,
        subscription_id: event.subscriptionId,
        code: (error as { code?: string }).code ?? null,
        message: (error as { message?: string }).message ?? String(error),
        hint: (error as { hint?: string }).hint ?? null,
      }),
    );
    return false;
  }

  return true;
}
