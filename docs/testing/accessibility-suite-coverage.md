# What `test:accessibility` actually covers

**A green run of this gate is not evidence of WCAG conformance.** It means "the
pairs and props someone thought to assert are correct." That gap is not
theoretical — see [How this gate stayed green through two real
defects](#how-this-gate-stayed-green-through-two-real-defects).

## The gate

```
npm run test:accessibility     jest --testPathPattern=accessibility --verbose --forceExit
npm run validate:accessibility npm run test:accessibility && echo '✅ Accessibility tests passed'
```

`validate:accessibility` is **not a second validator** — it is the same suite
plus an `echo`. CI's *Accessibility (WCAG AA)* job currently runs both, so the
whole suite executes **twice per run** for no additional coverage.

Selection is by **path**, not filename, and the pattern matches any path segment
containing `accessibility`. Two consequences:

- A file leaves the gate **silently** if it is renamed or moved out of an
  `accessibility` path segment. Nothing fails; the count just drops.
- Most files qualify via a `*.accessibility.test.tsx` filename;
  `features/practices/__tests__/accessibility/` qualifies via its **directory**.

## What it does cover

- Static accessibility props on rendered nodes — `accessibilityRole`,
  `accessibilityLabel`, `accessibilityHint`, `accessibilityState`, `hitSlop`.
- `AccessibilityInfo.announceForAccessibility` call assertions.
- WCAG contrast ratios **where a test names the pair**, computed by
  `getContrastRatio` / `meetsWCAGAA` in `app/src/core/theme/accessibility.ts`.
  There is **no sweep** over the codebase — an unasserted pair is unchecked.

## What it does not cover

Nothing here runs on a device, and React Native Testing Library performs **no
layout**. So this gate cannot and does not check:

- **Rendered tap-target size.** No test measures a laid-out target, because none
  can. A declared `minHeight` / `hitSlop` read off the style object is a
  *structural proxy* — the same standing as `check:breathing-worklets` for the
  60fps budget. Anything claiming a measured 44×44 would be false.
- **VoiceOver / TalkBack** focus order, traversal, or whether an announcement is
  actually spoken. Assertions here prove the announce API was *called*.
- **OS modes** — high contrast, reduce transparency, Dynamic Type at 200%.
- **Contrast of composited surfaces** — overlapping or alpha-blended colours.

These need manual device QA. Do not add jest tests named for them.

## How this gate stayed green through two real defects

DEBUG-323 found `semantic.text.muted` shipping at **1.98:1** with 7 consumers.
DEBUG-342 found 34 further failing sites. The suite was green throughout —
because until `core/theme/__tests__/theme-contrast.accessibility.test.ts` was
written *as DEBUG-323's own fix*, **no test in the suite computed a contrast
ratio at all**.

Compounding it, `features/practices/__tests__/accessibility/` contained three
blocks that declared an object of 34 hardcoded `true` values, asserted each
against itself, and printed a PASS line per key into CI logs — including
`✅ contrastRatioMet: PASS` and `🚨 crisisResponseTime: PASS`. They computed
nothing and could not fail. MAINT-358 removed them.

Note the causation carefully, because the ticket that removed them overstated
it: those blocks did **not** cause the 1.98:1 token to ship. `semantic.text.muted`
is a theme token and that file imports no theme module — there was no code path
by which it could have checked one. What they did was **manufacture false
assurance**: a reader scanning a green log saw `contrastRatioMet: PASS` and had
no reason to look further. That is a sufficient indictment on its own.

## Rules for adding to this suite

1. **A test must be able to fail.** If deleting the assertion leaves the test
   green, it is not a test. Verify by mutating the expected value and confirming
   red.
2. **The name must match what is asserted.** A test called "…meets 44pt minimum
   touch target" that asserts `expect(container).toBeTruthy()` is worse than no
   test — it answers the question falsely for the next reader.
3. **Never print a `PASS` / `FAIL` line for something you did not measure.**
4. **Prefer reading the resolved style over restating the token pair.** The
   DEBUG-342 lesson was that 34 sites bypassed an already-fixed token; a test
   that hardcodes the pair it expects cannot see that.
5. **Pin a known-failing pair as failing** rather than omitting it, with a
   comment naming the follow-up. Precedent:
   `theme-contrast.accessibility.test.ts` ("records the residual…"). Do not
   "fix" such a test by loosening it.

## Known gaps, not covered by anything today

- **Practices surfaces carry live WCAG AA contrast failures.** The largest root
  cause is `themes.learn.primary` / `navigation.learn` `#9B7EBD` at **3.44:1**,
  which is `Timer`'s default theme. It ships from
  `@mp2ez/being-design-system`, so fixing it is a cross-repo change.
- **`Timer.controlButton` / `skipButton` and `PracticeLibraryScreen.backButton`
  declare no 44pt minimum.** A WCAG 2.5.5 gap, currently unasserted.
- **`app/.github/workflows/` is 10 git-tracked files GitHub never reads** — only
  the repo-root `.github/workflows/` is executed. One of them,
  `accessibility-automation.yml`, installs `jest-axe` / `@axe-core/react` (DOM
  tooling, inapplicable to React Native) and triggers on a branch `develop` that
  has never existed in this repo. **If you believed an axe scan was running,
  this is why it is not.**
- **`app/__tests__/scripts/` is executed by no CI job.** CI's test job runs
  `test:unit` (`--testPathPattern=unit`) and `test:integration` (`=integration`);
  neither matches. Relevant here because it is the same failure class this
  document is about — a suite that exists, passes locally, and gates nothing.
