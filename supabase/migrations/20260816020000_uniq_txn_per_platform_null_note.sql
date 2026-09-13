-- DEBUG-447 (AC3) — record why uniq_txn_per_platform STAYS partial.
--
-- ============================================================================
-- THE TICKET'S PREMISE IS TECHNICALLY WRONG, AND THIS IS THE CORRECTION
-- ============================================================================
-- DEBUG-447 asks: "Consider whether uniq_txn_per_platform should stop being partial. If it
-- stays partial, record why, so the next reader does not treat it as a backstop it is not."
--
-- The question is framed as though dropping `WHERE original_transaction_id IS NOT NULL` would
-- close the null-identifier gap at the database layer. IT WOULD NOT.
--
-- Postgres unique indexes treat every NULL as DISTINCT from every other NULL (SQL-standard
-- behaviour; `NULLS NOT DISTINCT` is opt-in, PG15+, and is not in use here). So a
-- non-partial UNIQUE (platform, original_transaction_id) still permits UNLIMITED rows with a
-- NULL identifier per platform. De-partialising closes nothing. It would only start indexing
-- rows that structurally cannot carry an identifier, for zero integrity gain.
--
-- Note the partial index DOES already constrain the empty-string case, since '' IS NOT NULL.
-- The gap was never "empty strings collide"; it was "NULL is unconstrainable by index shape".
--
-- ============================================================================
-- WHERE THE GAP IS ACTUALLY CLOSED
-- ============================================================================
-- At the application layer, in two independent places (DEBUG-447):
--   1. _shared/receiptBinding.ts — assertNoCrossIdentityReplay now throws
--      InvalidTransactionIdentifierError on an absent, empty or non-string identifier,
--      instead of the early `return` that made it fail OPEN.
--   2. Both verify-{apple,google}-receipt updateSubscription() bodies carry the same check
--      independently, BEFORE the upsert, so a future edit to the helper alone cannot silently
--      reopen it. Both layers must be removed to write an unbound row.
--
-- ============================================================================
-- IF A DATABASE-LAYER BACKSTOP IS EVER WANTED
-- ============================================================================
-- The correct mechanism is a CHECK constraint, not an index change:
--
--   ALTER TABLE public.subscriptions
--     ADD CONSTRAINT subscriptions_txn_id_required
--     CHECK (platform = 'none' OR original_transaction_id IS NOT NULL);
--
-- Deliberately NOT applied here. It cannot be added safely without first auditing the live
-- table for pre-existing rows with a NULL identifier — the column arrived via a bare
-- ALTER TABLE ADD COLUMN in 20260607130000 with no backfill, so any row predating that
-- migration would fail validation and abort the ALTER. That audit is out of scope for an
-- Effort-S fix whose application-layer guard already closes the hole.
--
-- This migration changes NO schema and NO data. It attaches the reasoning to the object, so
-- the next reader who looks at the index and wonders about the WHERE clause finds the answer
-- on the object rather than re-deriving it — or "fixing" it in the way that does nothing.

COMMENT ON INDEX public.uniq_txn_per_platform IS
  'Partial by design (DEBUG-447). The WHERE original_transaction_id IS NOT NULL clause is NOT '
  'the reason NULL identifiers are unconstrained: Postgres unique indexes treat every NULL as '
  'distinct from every other NULL, so a NON-partial version would permit unlimited NULL rows '
  'per platform too. Removing the predicate closes nothing. The null case is closed at the '
  'application layer, in two independent places: assertNoCrossIdentityReplay() in '
  '_shared/receiptBinding.ts throws InvalidTransactionIdentifierError, and both '
  'verify-{apple,google}-receipt carry the same check before their upsert. A DB-layer backstop '
  'would be a CHECK (platform = ''none'' OR original_transaction_id IS NOT NULL), which needs a '
  'prior audit for legacy NULL rows predating 20260607130000''s un-backfilled ADD COLUMN.';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = 'uniq_txn_per_platform' AND c.relkind = 'i'
  ) THEN
    RAISE EXCEPTION
      'DEBUG-447 FAIL: index public.uniq_txn_per_platform does not exist — the COMMENT above '
      'is attached to nothing, and the replay backstop this migration documents is missing.';
  END IF;

  IF (SELECT obj_description(c.oid, 'pg_class')
        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'uniq_txn_per_platform') IS NULL
  THEN
    RAISE EXCEPTION 'DEBUG-447 FAIL: the COMMENT ON INDEX did not attach';
  END IF;

  RAISE NOTICE
    'DEBUG-447 PASS: uniq_txn_per_platform documented — partial by design; the null case is '
    'closed in the application layer, not by the index.';
END $$;
