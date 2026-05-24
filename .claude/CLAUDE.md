# Being.

## What This Is

Stoic Mindfulness mental wellness app. Consumer wellness — not a healthcare provider, medical device, or HIPAA-covered entity. PHQ-9 and GAD-7 are wellness self-screening tools, not clinical assessments. Solo-founder project under Palouse Labs LLC.

## Repo Layout

Bare git repo at `~/dev/being/` with worktrees at `~/dev/being/{main,development,phase-2b}/` plus feature worktrees created by `/b-work`. Always launch `claude` from `~/dev/being/` (the bare-repo root). The app code lives under each worktree's `app/` directory.

## Tech Stack

- React Native `0.81.4`, Expo `54`, React `19.1.0` (pinned — see version-check script)
- Supabase (auth + DB), Zustand `5` (state), Stripe (subscriptions), Sentry (monitoring), expo-secure-store + react-native-aes-crypto (encryption)
- TypeScript strict, Jest + Detox (e2e)

## Setup & Run

```bash
cd app
npm start                  # Expo dev server
npm run ios                # iOS simulator
npm run android            # Android emulator
```

## Source Architecture

```
app/src/
├── core/         # Infrastructure: analytics, security, services, stores, types
└── features/     # Domain features: assessment, crisis, practices, learn, ...
```

Path aliases: `@/core/*`, `@/features/*`. Prefer aliases over relative imports. Types co-located with their consumers.

## Protected Paths → Specialist Agent

Editing these areas should invoke the matching agent for a planning pass before implementing:

| Path | Agent(s) |
|---|---|
| `app/src/features/crisis/` | `crisis` |
| `app/src/features/assessment/` | `crisis` + `philosopher` |
| `app/src/features/practices/` | `philosopher` |
| `app/src/core/services/security/` | `compliance` |

Specialist agents live in `.claude/agents/{crisis,compliance,philosopher}.md` and self-describe via frontmatter.

## Safety Facts (non-negotiable)

- **PHQ-9 thresholds**: ≥15 = support resources offered; ≥20 = active intervention. Q9 (self-harm) >0 = immediate intervention regardless of total.
- **GAD-7 threshold**: ≥15 = support resources offered.
- **988 access**: <3 taps from any screen, <3 seconds load.
- **Crisis detection**: <200ms, zero false negatives, audit-logged.
- **Wellness data encryption**: AES-256 at rest via `expo-secure-store` / `react-native-aes-crypto`. (Terminology: "wellness data," not "PHI" — Being is not a HIPAA entity.)

## Performance Budgets

| Metric | Target |
|---|---|
| App launch | <2s |
| Crisis button response | <200ms |
| Check-in flow transition | <500ms |
| Assessment load | <300ms |
| Breathing circle animation | 60fps |

## Test & Validate Commands

```bash
npm run typecheck                  # tsc --noEmit
npm run lint                       # eslint src
npm run lint:clinical              # stricter rules for clinical/safety code
npm run test                       # full jest suite
npm run test:clinical              # PHQ/GAD scoring + thresholds
npm run test:crisis-detection      # crisis detection validation
npm run test:accessibility         # WCAG AA
npm run test:offline-crisis        # offline 988 access
npm run perf:crisis                # crisis button <200ms
npm run perf:breathing             # 60fps animation
npm run perf:launch                # <2s launch
npm run validate:accessibility     # accessibility validation
```

## Validation Matrix

Which validators are required for which work type. `crisis`, `compliance`, `philosopher` are specialist agents. Accessibility/performance are validated via the corresponding `npm run test:*` and `perf:*` commands.

| Work Type | crisis | compliance | philosopher | accessibility | performance |
|---|---|---|---|---|---|
| Crisis features | required | required | — | required | <200ms required |
| Assessment UI | required (thresholds) | — | — | required | — |
| Therapeutic content (Stoic) | — | — | required | required | 60fps if animation |
| Privacy / wellness data export | — | required | — | if UI | — |
| General UI | — | — | — | required | — |
| Backend-only | — | — | — | — | — |

## State (Zustand)

- `user` — profile, preferences
- `checkIn` — mood (encrypted at rest)
- `assessment` — PHQ/GAD results (critical: encrypted, validated)
- `crisis` — emergency contacts, safety plan (critical: encrypted)

## Design System

Uses the `@mp2ez/being-design-system` npm package. Theme tokens imported from `@/core/theme`. UI work imports `colorSystem`, `semantic`, `spacing`, `borderRadius`, `typography` from there. **No hardcoded hex colors, magic-number spacing, or inline fontSize.** Themes vary by time of day (`morning|midday|evening`) via `getTheme(flowType)`.

## Workflow Commands

| Command | Purpose |
|---|---|
| `/b-create [TYPE] - [Name]` | Create Notion work item from conversation context with dimension scores |
| `/b-work [WORK_ITEM_ID]` | Fetch work item, create worktree, install deps, implement |
| `/b-close [WORK_ITEM_ID]` | Commit, merge to development, update Notion to Done. Use `--push` to push remote. |

Branch naming: `feat/*`, `fix/*`, `chore/*` (mapped from work item TYPE). Conventional commits. Aim for <400 LOC per PR.

**Notion work-items DB**: `NOTION_WORK_DB = 277a1108-c208-805c-810b-000b0f0aae22`. Single source of truth — referenced by slash commands as `${NOTION_WORK_DB}`. Rotate here only.

## Docs Map

- `docs/product/` — PRD, TRD, DRD, roadmap, Stoic Mindfulness framework (`stoic-mindfulness/INDEX.md`)
- `docs/architecture/` — system design
- `docs/development/` — dev guides
- `docs/legal/regulatory-applicability.md` — **source of truth for what regulations apply** (FTC, CCPA, TDPSA, GDPR; NOT HIPAA/FDA)
- `docs/security/` — encryption, secure storage
- `docs/testing/` — test strategy
- Source architecture detail: `app/src/README.md`
- Full dev command reference: `QUICKSTART_COMMANDS.md` (at worktree root)

## Known Gotchas

- React must stay at `19.1.0` for RN 0.81.4 compatibility — `version-check` script enforces.
- `AsyncStorage` is unencrypted by design; wellness data must use `expo-secure-store` + AES-256.
- Encryption tests are slow (`test:encryption`, `test:secure-storage`) — run during pre-push, not pre-commit.
- iOS and Android behavior must match (use `npm run platform:both` to verify).
- Slash commands in `.claude/commands/` must use **absolute paths** (`/Users/max/dev/being/.claude/...`) for any internal file references — never relative `./.claude/...`. This avoids the symlink dance.
- Compliance terminology: "wellness data" not "PHI"; "AES-256 encryption" not "HIPAA-compliant encryption"; "wellness screening" not "clinical assessment."
- Env files live canonically at `~/dev/being/.config/{env.production,env.development}` (gitignored at bare root). Worktree `app/.env.{production,development}` are symlinks to those. `/b-work` creates the symlinks automatically; manual `git worktree add` requires creating them by hand (`ln -s ../../.config/env.production app/.env.production` and same for development). Dev env has empty `EXPO_PUBLIC_SENTRY_DSN` so Sentry no-ops locally; production env carries the real DSN. Back up the canonical files in 1Password — deleting `.config/` breaks all worktrees.

## Convention Reminders

- TDD for: bug fixes, pure logic, stateful algorithms, complex edge cases. Test-after for: API integrations, UI, glue code.
- When making multi-file or architectural changes: outline approach, get approval, then build.
- Push back with reasoning when something is wrong; no performative agreement.
