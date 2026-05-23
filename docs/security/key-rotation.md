# Key Rotation Procedure

## Context

Audit finding SEC-04: `.env.production` was previously tracked in git via a `.gitignore` whitelist, leaking the Supabase project URL, anon JWT, and Sentry DSN. The Sentry DSN is intentionally public (designed to be a published ingest URL). The Supabase anon JWT, while designed to be public, is paired with RLS policies that audit SEC-02 found non-functional — so an attacker with the anon key had effective read/write access to user tables.

`.env.production` is now untracked. This document captures the rotation procedure so the historical key in git history is replaced with a current valid one that has no exposure window.

## What to rotate

| Secret | Where it lives now | Rotation surface |
|---|---|---|
| Supabase client key (`EXPO_PUBLIC_SUPABASE_KEY`) — publishable on new projects, legacy anon JWT on old ones | Local `app/.env.production` (untracked); EAS Secrets for production builds | Supabase dashboard → Project Settings → API → "Reset" / "Roll" key |
| Supabase project URL | Same | Not rotated (the URL itself isn't sensitive); just ensure the new key is paired with the same project |
| Sentry DSN (`SENTRY_DSN` or `EXPO_PUBLIC_SENTRY_DSN`) | Same | Intentionally public — do not rotate unless Sentry flags abuse |

## Rotation procedure (Supabase anon JWT)

1. **Supabase dashboard**: log in, open the Being project, navigate to *Project Settings → API*.
2. **Reset anon key**: click the reset/rotate button. Confirm. The old key is immediately invalidated.
3. **Copy the new key** to a temporary scratchpad. It will not be shown again in full after this view.
4. **Update local working copy**: edit `app/.env.production` and replace `EXPO_PUBLIC_SUPABASE_KEY=...` with the new value.
5. **Update EAS Secrets** (production builds):
   ```bash
   eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_KEY --value '<new-key>' --force
   ```
   The `--force` flag overwrites the existing secret.
6. **Verify**: trigger an EAS build preview, confirm the app initializes Supabase successfully.
7. **Log the rotation**: append a one-line entry to this file's "Rotation history" section below with the date and reason.

## Rotation cadence

- **Before TestFlight submission**: mandatory (the old key was in public git history).
- **After any suspected compromise**: immediate.
- **Periodic**: not required for the anon key alone, but consider quarterly review if real users start accumulating data.

## Pre-launch posture

The app is currently pre-launch with no real users. The exposure window of the historical key is bounded by:
- Lack of real user data behind RLS (no PHI to exfiltrate yet)
- SEC-02 (RLS migration to `auth.uid()`) landing in roadmap Phase 2c will sever any remaining device-id-keyed attack paths
- The historical key remains in git history for ~5 months until rotation, so anyone who cloned the public mirror (if any) has it

Rotation should happen before any TestFlight invite goes out.

## Rotation history

| Date | Reason | Operator |
|---|---|---|
| TBD | SEC-04 — historical key in git history; rotating after `.env.production` was untracked | _pending_ |
