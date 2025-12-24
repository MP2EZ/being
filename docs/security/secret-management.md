# Secret Management Practices

> MAINT-122: Git History Secret Audit - Documentation

## Overview

This document outlines secret management practices for the Being app, including what files are protected, how the protection works, and how to handle secrets safely.

## Protection Mechanisms

### 1. .gitignore Patterns

Both root and app-level `.gitignore` files contain patterns to prevent accidental commits of sensitive files:

**Blocked patterns:**
- `.env` (local environment files)
- `.env.*` (all env variants except allowed)
- `*.pem`, `*.key`, `*.jks`, `*.p8`, `*.p12`, `*.pfx` (certificates/keys)
- `credentials.*`, `secrets.*` (credential files)
- `*.secret` (generic secret files)
- `id_rsa`, `id_ed25519` (SSH keys)
- `service-account*.json`, `*-credentials.json`, `*-service-key.json` (service accounts)

**Allowed exceptions:**
- `.env.example` (template without values)
- `.env.production` (client-side config for Expo builds)
- `credentials.example.*`, `secrets.example.*` (templates)

### 2. Pre-commit Hook

A pre-commit hook at `.git/hooks/pre-commit` blocks commits containing files matching secret patterns. The hook:
- Scans all staged files against secret patterns
- Allows configured exceptions
- Provides bypass instructions for legitimate cases (`git commit --no-verify`)

### 3. Validation Script

Run `scripts/validate-gitignore-security.sh` to verify:
- All secret patterns are properly ignored
- Allowed exceptions work correctly
- Pre-commit hook is installed
- Git history is clean

## Environment Files

### File Types

| File | Purpose | Committed? | Contains Secrets? |
|------|---------|------------|-------------------|
| `.env` | Local development | No | Yes (local only) |
| `.env.local` | Local overrides | No | Yes |
| `.env.example` | Template | Yes | No (placeholders) |
| `.env.production` | Expo build config | Yes | No (client-side only) |

### Client-Side vs Server-Side Keys

The `.env.production` file contains **client-side keys only**:
- `EXPO_PUBLIC_SUPABASE_URL` - Public API endpoint
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Row-Level Security protected
- `EXPO_PUBLIC_SENTRY_DSN` - Error reporting endpoint

These are designed to be in client code and protected by:
- Supabase Row Level Security (RLS)
- Rate limiting
- API key restrictions

**Never commit server-side keys:**
- `SUPABASE_SERVICE_ROLE_KEY` - Full database access
- Database passwords
- API secret keys
- Private signing keys

## Adding New Secrets

1. **Add to `.env.example`** with placeholder value
2. **Add actual value** to local `.env` (gitignored)
3. **For production:** Use Expo secrets, EAS secrets, or environment variables
4. **Verify:** Run `./scripts/validate-gitignore-security.sh`

## If Secrets Are Accidentally Committed

### Immediate Actions
1. **Rotate the secret immediately** - consider it compromised
2. **Do NOT just delete** - the secret remains in git history

### History Cleanup (requires coordination)
If a true secret (not client-side key) is committed:
1. Ensure all worktrees are clean
2. Notify team to save work
3. Use BFG Repo-Cleaner or git filter-branch
4. Force push to remote
5. Team members must re-clone

```bash
# Example using BFG (after installing: brew install bfg)
bfg --delete-files '.env' --no-blob-protection
git reflog expire --expire=now --all
git gc --prune=now --aggressive
git push --force --all
```

## Audit Commands

```bash
# Check for .env files in history
git log --all --full-history -- "*.env*"

# Check for specific secret patterns
git log --all --full-history -- "credentials.*" "secrets.*" "*.key"

# List all files that would be ignored
git ls-files --others --ignored --exclude-standard

# Run full security validation
./scripts/validate-gitignore-security.sh
```

## Related Documentation

- [Security Architecture](./security-architecture.md)
- [Supabase RLS Verification](./supabase-rls-verification.md)
