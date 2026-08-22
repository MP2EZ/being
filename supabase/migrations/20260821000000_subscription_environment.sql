-- =====================================================
-- DEBUG-474 — persist the VERIFIED App Store environment on the subscription row
-- =====================================================
--
-- WHY THIS COLUMN EXISTS AT ALL.
-- `_shared/appStoreServerApi.ts`'s `resolveApiOrigin` requires 'Production' | 'Sandbox'
-- with no default, and that module's header forbids the obvious workaround outright:
-- "NEVER add a retry that switches host." A host-switching retry is precisely the
-- deleted 21007 fallback that let a sandbox-minted transaction be accepted as a
-- production one. So SOMEONE must name the host, and the module cannot.
--
-- `verify-apple-receipt` escapes this by taking `environment` as an advisory hint from
-- the client request and then re-reading the claim inside the signed payload
-- (`index.ts:334`) — the hint routes, it never grants. A CRON HAS NO CLIENT, so the
-- nightly `grace-period-automation` re-verification has no hint to route by and no way
-- to choose a host. This column is that missing trusted source.
--
-- WHAT IS WRITTEN HERE IS THE VERIFIED CLAIM, NOT A REQUEST FIELD. The writer is
-- `verify-apple-receipt/updateSubscription`, and the value is `verification.environment`,
-- which traces to `assertAppleAppScope(payload).environment` — i.e. read out of a JWS
-- whose signature chains to the pinned Apple root. A value that arrived from a request
-- body must never be stored in this column; that would make the client's hint
-- load-bearing after all, one write later.
--
-- REJECTED ALTERNATIVES (recorded so they are not re-derived):
--   1. Read it back from `subscription_events.metadata->>'environment'` on the newest
--      `receipt_verification_succeeded` row. Rejected: `_shared/subscriptionAudit.ts`
--      is NON-FATAL BY RULING — a failed audit write must not reject the entitlement
--      operation that triggered it — so a perfectly valid subscription can exist with
--      no event row at all. Keying a host decision on a best-effort record makes an
--      audit-write blip present as an unverifiable subscription.
--   2. A Production-only waiver. Rejected: ONE Supabase project serves production and
--      development (edge secrets are project-wide), so the first Sandbox tester's row
--      would 404 against the Production host every single night, permanently failing
--      the run and suppressing the ops dead-man's-switch ping — indistinguishable from
--      a real regression.
--
-- ADDITIVE AND BACKFILL-FREE BY CONSTRUCTION. Nullable with no default. Census taken
-- at authoring time: `subscriptions` 0 rows, `subscription_events` 0 rows — so there is
-- no historical value stranded anywhere, nothing to backfill, and no window in which a
-- pre-existing row is readable-but-unroutable. Every row that will ever exist is
-- written by the post-DEBUG-474 verifier.
--
-- A NULL IS NOT A DEFAULT — IT IS A REFUSAL. The cron treats an absent environment as
-- "this row cannot be re-verified" and reports it into the run's error tally. It must
-- never be read as "assume Production": that would reintroduce rejected alternative 2
-- through the back door, on exactly the rows least likely to be production.
--
-- DATA HANDLING. This is Apple's routing fact about which App Store backend issued the
-- transaction — it is not a verification of the USER and asserts nothing about them.
-- The `subscriptions` row is already classified sensitive wellness data (see the table
-- COMMENT, and the DPIA's category 7, on the correlation rationale); this attribute
-- sits inside that existing boundary and adds no category. Not PHI — Being is not a
-- HIPAA covered entity. Applicable regimes: FTC Act §5, TDPSA, VCDPA, CPA, CTDPA, GDPR
-- (see docs/legal/regulatory-applicability.md).

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS environment TEXT;

-- Constrained rather than free text: the only two values Apple sets are the two
-- `APPLE_ENVIRONMENTS` entries `resolveApiOrigin` will accept, and a third value
-- reaching this column could only ever produce a run-time refusal further downstream.
-- Fail at the write, where the offending writer is identifiable.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_environment_valid'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_environment_valid
      CHECK (environment IS NULL OR environment IN ('Production', 'Sandbox'));
  END IF;
END $$;

COMMENT ON COLUMN public.subscriptions.environment IS
  'App Store environment (Production|Sandbox) read from the VERIFIED Apple JWS claim at '
  'receipt-verification time, never from a request body. Sole trusted host source for the '
  'cron re-verification in grace-period-automation, which has no client hint to route by. '
  'NULL means the row predates DEBUG-474 or was never verified — the cron refuses that row '
  'and reports it, and must never default it to Production. Apple routing metadata about '
  'the transaction; asserts nothing about the user. (DEBUG-474)';

-- WHY THE NULL BRANCH IS ALSO CLOSED IN THE SCHEMA, NOT ONLY IN THE CRON.
-- The cron reports an unverifiable row into the run's error tally, and that tally is
-- wired straight to two pagers: `shouldPingSubscriptionHealthcheck` suppresses the
-- healthchecks.io ping on ANY error, and `subscription_verification_watchdog()` emails
-- on the same condition. A NULL environment is not a transient failure — it is a
-- permanent property of a row — so a single such row would page every night, forever,
-- until someone hand-edited it. That is alarm fatigue, and alarm fatigue is how a
-- dead-man's-switch stops being believed.
--
-- Closing it here instead makes the cron's fail-closed branch UNREACHABLE ON REAL DATA
-- while leaving it in the code, so the "any failure reaches the error tally" doctrine
-- holds without a standing false alarm.
--
-- SAFE BECAUSE THE WRITER SET IS CLOSED, verified rather than assumed:
--   - `verify-apple-receipt/updateSubscription` is the ONLY thing that inserts a
--     `platform='apple'` row, and it always carries the verified claim. Its mock branch
--     returns before that call and writes nothing.
--   - `subscription-webhook` only ever `.update()`s an existing row — it never inserts,
--     so it cannot produce a row this constraint would reject.
--   - `verify-google-receipt` writes `platform='google'`, which the constraint exempts:
--     Google has no environment split and `GOOGLE_SERVICE_ACCOUNT` is unprovisioned.
--   - `_shared/receiptBinding.ts` only SELECTs.
-- Census at authoring time: `subscriptions` 0 rows, so this validates against nothing.
-- RE-ASSERT THAT COUNT BEFORE APPLYING — a non-zero count means a legacy row exists and
-- this statement will fail, which is the correct outcome, not something to force past.
--
-- The cost, stated plainly: a future Apple insert path that forgets `environment` fails
-- that user's verification instead of writing an unverifiable row. That is the right
-- direction to be wrong in here — a loud failure at development time, on a path with no
-- live subscribers, beats a row that can never be re-verified and pages about it nightly.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'subscriptions_apple_environment_present'
  ) THEN
    ALTER TABLE public.subscriptions
      ADD CONSTRAINT subscriptions_apple_environment_present
      CHECK (platform <> 'apple' OR environment IS NOT NULL);
  END IF;
END $$;

-- =====================================================
-- ROLLBACK (manual; non-destructive at zero rows):
-- ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_apple_environment_present;
-- ALTER TABLE public.subscriptions DROP CONSTRAINT IF EXISTS subscriptions_environment_valid;
-- ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS environment;
-- Note: dropping this column does NOT restore the pre-DEBUG-474 behaviour — it strips the
-- cron's only host source, so every Apple row fails closed rather than being re-verified.
-- =====================================================
