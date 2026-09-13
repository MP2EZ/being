# App Store / Play credentials runbook (INFRA-84 AC 1)

Provisioning procedure for the store credentials that `verify-apple-receipt` and
`verify-google-receipt` read. This is founder-operated: the credentials are generated in
Apple's and Google's consoles, not in this repo.

**`APPLE_SHARED_SECRET` is retired.** INFRA-467 moved Apple verification off the deprecated
`verifyReceipt` endpoint to the App Store Server API. `supabase/deploy-manifest.json` no
longer declares the name, so `scripts/supabase-deploy-drift.js --reconcile` will flag it as
`SECRET UNDECLARED` if anything reads it. Setting it accomplishes nothing and looks like
progress — which is why it needs saying rather than merely omitting.

---

## 0. Prerequisite: redeploy the functions FIRST

Setting the Apple secrets against the currently-deployed build does nothing, because that
build reads the retired shared secret. There is no CI auto-deploy of edge functions, so
merging INFRA-467 did not touch the live project.

Confirm the deployed version postdates the cutover before provisioning anything:

```bash
supabase functions list --project-ref yliycxslzdsgjtpxggtf
```

If `verify-apple-receipt`'s `UPDATED_AT` predates the INFRA-467 slice-3 merge, deploy from a
worktree whose `supabase/functions/` matches `origin/development`:

```bash
supabase functions deploy verify-apple-receipt  --project-ref yliycxslzdsgjtpxggtf
supabase functions deploy verify-google-receipt --project-ref yliycxslzdsgjtpxggtf
supabase functions deploy grace-period-automation --project-ref yliycxslzdsgjtpxggtf
```

Skipping this makes the whole of step 3's verification a false negative.

---

## 1. Apple — generate a **Team** key, not an Individual key

This is the expensive distinction. An **Individual** App Store Connect API key has no issuer
and signs `sub: 'user'` in place of `iss`. The token
`_shared/appStoreServerApi.ts` builds sets `iss` (`setIssuer(issuerId)`), so an Individual
key produces a blanket **401 from Apple with no hint as to why**. Both key types look
identical in the dashboard once created. Confirm the type at generation time — debugging it
afterwards costs far more than reading the label.

1. App Store Connect → **Integrations** → **Keys** → **App Store Connect API**.
2. Confirm you are on the **Team Keys** tab (not *Individual Keys*).
3. Generate a key with the **App Manager** role (In-App Purchase access requires it).
4. Record, at generation time:
   - **Issuer ID** — the UUID shown above the key table → `APPLE_ISSUER_ID`
   - **Key ID** — the 10-character identifier → `APPLE_KEY_ID`
   - **`AuthKey_<KEYID>.p8`** — downloadable **once only** → `APPLE_PRIVATE_KEY`
5. Store the `.p8` in 1Password immediately. Apple will not re-issue it.

The bundle id in the signed token is **not** configurable — `BEING_BUNDLE_ID` is imported
from `_shared/verifyAppleJWS.ts` and never parameterised, deliberately, so that an env var
cannot redirect the token to another app. It must match `fyi.being.app`.

## 2. Set the three secrets

```bash
supabase secrets set APPLE_ISSUER_ID=<issuer-uuid>      --project-ref yliycxslzdsgjtpxggtf
supabase secrets set APPLE_KEY_ID=<10-char-key-id>      --project-ref yliycxslzdsgjtpxggtf
supabase secrets set APPLE_PRIVATE_KEY="$(cat AuthKey_<KEYID>.p8)" --project-ref yliycxslzdsgjtpxggtf
```

The private key must be a **PKCS#8 PEM** (`-----BEGIN PRIVATE KEY-----`); that is the format
Apple ships. `importSigningKey` rewrites literal `\n` sequences to real newlines, so a key
pasted through a shell that flattened the newlines still imports — but prefer `$(cat ...)`
and avoid relying on that. A malformed key raises
`AppStoreConnectConfigError: APPLE_PRIVATE_KEY is not a valid PKCS#8 PEM`; the underlying
ASN.1 error is discarded on purpose, since DER failures can echo fragments of the key.

## 3. Verify — read the status code, not the `valid` field

Both a misconfiguration and a genuinely bad transaction return `"valid": false`. The
discriminator is the **HTTP status plus the error string**:

| Condition | Status | Body |
|---|---|---|
| Credentials missing or unusable | **500** | `{"valid": false, "error": "Receipt verification is misconfigured"}` |
| Transaction genuinely unknown to Apple | **400** | `{"valid": false, "error": "No App Store transaction matches this identifier"}` |
| Mock transaction rejected (`ALLOW_MOCK_RECEIPTS` unset) | **400** | `{"error": "Invalid transaction"}` — note: no `valid` field |
| Apple unreachable / 5xx upstream | **503** | `{"valid": false, "error": "App Store is temporarily unavailable"}` |

A 500 with the misconfiguration string after step 2 means the credentials are wrong, not the
transaction. This split is deliberate: our own missing secret must never present to a user as
their purchase being bad.

Confirm the names landed:

```bash
supabase secrets list --project-ref yliycxslzdsgjtpxggtf
```

Digests only — the values are not readable back. Absence of a name is the signal.

## 4. Google — blocked on Play Console enrollment

`verify-google-receipt` reads **`GOOGLE_SERVICE_ACCOUNT`**. Note the name: not
`GOOGLE_SERVICE_ACCOUNT_JSON`. Setting the longer name leaves the function reporting
"not configured" while `secrets list` looks populated.

This half cannot be provisioned today — there is no Play Console developer account, so there
is nothing to link a Google Cloud service account to. The chain is business setup, not
engineering:

1. Play Console developer registration ($25, one-off) + identity verification.
2. A Google Cloud project, with the **Google Play Android Developer API** enabled.
3. A service account in that project, granted access under Play Console → Users & permissions.
4. A JSON key for it → `GOOGLE_SERVICE_ACCOUNT`.

Until step 1 completes, treat the Google half of AC 1 and its sandbox exercise as out of
reach, and do not report AC 1 as blocked on engineering.

## 5. Known blocker for the sandbox exercise (INFRA-84 AC 2)

Independent of every credential above: the app requests Apple product IDs
`com.being.subscription.monthly` / `.yearly` (`app/src/core/types/subscription/index.ts`)
while the bundle id is `fyi.being.app` — `com.being.app` was abandoned to a third party in
MAINT-161. Product IDs are globally unique in App Store Connect, so those strings are either
merely inconsistent with the bundle or unavailable outright. `getProducts` returns empty
until products exist under exactly the strings the app requests, and no purchase can be
driven. Settle the naming **before** creating any App Store Connect product records —
renaming afterwards costs a code change plus new records.
