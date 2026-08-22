# Crisis button vs. the keyboard — decision record

**Work Item**: DEBUG-431
**Decided**: 2026-08-16
**Status**: RULED — fix carved off to DEBUG-450
**Owners**: `crisis` (the `<3 taps` / `<3s` / `<200ms` contracts), `accessibility` (predictable placement)

---

## DECISION

> **The contract binds.** CLAUDE.md's *"988 access: <3 taps from any screen"* applies while a
> keyboard is up. The keyboard-occluded state is a **defect**, not an accepted state.
>
> **The fix is not to move the button.** See *Why a dynamic raise is ruled out*.

This document exists because DEBUG-406 correctly identified the occlusion and correctly
declined to fix it — `useOverlayBottomInset.ts` already states in prose that "while the
keyboard is up, 988 access via the root button is NOT restored". What did not exist was a
ruling on whether that is acceptable. It is not.

---

## The mechanism

The iOS keyboard renders in `UIRemoteKeyboardWindow`, a separate `UIWindow` **above** the
app's window. This is the same class of fact as an RN `<Modal>`'s separate native hierarchy:
`zIndex: 9999` is as irrelevant to it as it is to a `<Modal>`. The root crisis button is
positioned inside the app window, so whenever a docked software keyboard is up, the button is
inside the keyboard's frame — not partially, not on small devices only.

`CollapsibleCrisisButton` is mounted once at the navigation root (MAINT-290) and every route
inherits it, so this is app-wide by construction rather than per-surface.

## Verified geometry

Measured against `CollapsibleCrisisButton.tsx` on `development`, 2026-08-16:

| Constant | Value | Source |
|---|---|---|
| `bottom` | `Platform.select({ ios: 100, android: 104 })` | `:473` |
| `hitSlop` | `12` (uniform) | `:456` |
| `COLLAPSED_WIDTH_STANDARD` | `44` | `:109` |
| `COLLAPSED_WIDTH_PROMINENT` | `56` | `:110` |

Top edge of the hit rect above the screen bottom:

| Mode | iOS | Android |
|---|---|---|
| standard / immersive | 100+44+12 = **156** | 104+44+12 = **160** |
| prominent | 100+56+12 = **168** | 104+56+12 = **172** |

**The app-wide maximum is 172pt, not 156.** 156 is the iOS-standard case only. Derive from the
constants rather than restating a number — this document's own table will rot otherwise.

**Correct phrasing of the claim:** *every docked software keyboard on every shipping iOS
device this app ships to is taller than the button's top edge.* The smallest portrait
software keyboard on a shipping iPhone is the 4.7"/SE-class QWERTY at ~216pt bare (~260pt
with the QuickType bar); 6.1"/6.7" devices are 291–346pt. All clear 172 by a wide margin, so
the occlusion is total.

Two honest edges, which matter because they determine the fix's **trigger condition**:

- With a paired **hardware keyboard**, iOS shows only a ~55pt shortcuts bar and the button is
  **not** occluded — though `Keyboard` events still fire with a non-zero height.
- `app.json` sets `supportsTablet: true`, and an iPad **split or floating** keyboard is not
  bottom-anchored full-width.

Consequently any fix must trigger on *"the keyboard's top edge occludes the button"*, never on
*"a keyboard is up"*. The latter moves a safety control when it need not move, which is
precisely the cost of AC2.

## The affected surfaces — six, exactly

Every non-test `TextInput` host on `development`, 2026-08-16:

| Surface | Note |
|---|---|
| `VoiceReflectionScreen` | Journal. Runs `journalCrisisScan` — the app itself classifies this text as potentially crisis-bearing. |
| `SessionNoteComposer` | Post-DEBUG-406 bottom sheet. |
| `WeeklyReflectionComposer` | Post-DEBUG-406 bottom sheet. |
| `DailyLoopStepScreen` | Route `DailyLoop` is in `IMMERSIVE_ROUTES` → button also faded to `FADED_OPACITY`. |
| `DailyLoopCompleteScreen` | Same. |
| `DeleteAccountScreen` | No inline crisis affordance. |

`core/components/accessibility/AccessibleInput.tsx` used to render a second `TextInput`,
but was traced and had **zero consumers**, so it was never a live surface — MAINT-487
deleted it on that finding. The count is exact, not a floor.

The two `DailyLoop` screens are the worst case and were absent from the original item's scope
list: the button is *both* faded and occluded there, and the route sets
`headerShown: false` with `gestureEnabled: false`.

## The evidence for the ruling

### 1. There is no dismissal affordance anywhere

Grepped across all non-test source: **zero** occurrences of `keyboardDismissMode`,
`Keyboard.dismiss()`, or `returnKeyType`. Every distress-bearing field is `multiline`, so the
iOS Return key inserts a newline and there is no Done key. There is no gesture and no tap that
lowers the keyboard on any of the six surfaces.

This is what disposes of the "the user raised it, the user can lower it" defence. On this
codebase, they cannot — not without navigating away.

### 2. The tap arithmetic fails everywhere

Baseline non-keyboard route is **2 taps**: root button → `CrisisResources` → Call 988. The
budget is `<3`, so the headroom is exactly one tap.

| Surface | Route to 988 with the keyboard up | Verdict |
|---|---|---|
| `VoiceReflectionScreen` | header back (1) + 2 = **3** — and that tap silently destroys the draft, since navigating away never calls `handleDiscard` | fails |
| Both composers | Cancel (1) + 2 = **3** | fails |
| Both `DailyLoop` screens | no header, no back gesture, no Done | **unbounded** |
| `DeleteAccountScreen` | header back (1) + 2 = **3** | fails |

Three is not fewer than three. It is out of contract on every surface before any argument
about whether preparatory acts should count.

### 3. Precedent has already rejected the permissive reading, twice

The only reading that permits keyboard-up is *"from any screen"* meaning the screen rather
than its transient states.

- **DEBUG-390** rejected it: LegalGate's 988 footer at 95.3% scroll depth met the literal tap
  count and was still ruled a live regression, producing the standing rule that *suppression
  is earned by an affordance reachable **without scrolling**, never by one that merely exists*.
- **DEBUG-403 / DEBUG-406** rejected it again for RN `<Modal>`, on the invariant that no
  reachable render state may have zero 988 affordance.

The keyboard is the **same mechanism** as a `<Modal>` — a separate native window above the
app's — and both DEBUG-406 files say so in those words. Ruling keyboard-up acceptable would
require the keyboard to be categorically different from a `<Modal>`, and the only candidate
difference is that the user raised it and can lower it, which §1 disposes of.

### 4. Discoverability is the wrong bar

DEBUG-406's removal of `autoFocus` on both composers is a genuine improvement: the sheet now
opens with the keyboard **down** and the button co-visible, so the failure mode is no longer
"never knew it was there", and the keyboard is only ever up because the user deliberately
raised it. That is why Urgency is 2 rather than higher.

But the contract is about **reachability at the moment of need**, not about whether the user
once learned the control exists. The LegalGate precedent is precisely a control the user could
find, and the ruling still went against it. The mitigation is also per-surface where the defect
is app-wide, and it does not reach `VoiceReflectionScreen` or the two `DailyLoop` screens —
which never had `autoFocus` and are the higher-risk surfaces.

---

## Why a dynamic raise is ruled out

This is the second half of the ruling and it resolves AC2 and AC3 together: **do not make
`CollapsibleCrisisButton`'s `bottom` dynamic.**

The exclusion rect is satisfied by an **equality with zero slack**. On `development`:

- `CRISIS_BUTTON_EXCLUSION_RECT.top` = `104 + 44 + 12 + 16` = **176**
  (`crisisButtonGeometry.ts:106,122`)
- a composer's sheet is `justifyContent: 'flex-end'` with `paddingBottom: bottomInset` applied
  inline, where `bottomInset = useOverlayBottomInset()` = `max(176, keyboardHeight)`
- so with the keyboard down, the action row's bottom edge sits at exactly **176** — the same
  value, compared with half-open intervals

Because it is an equality rather than an inequality, **any** change to `bottom` breaks it in
one direction or the other:

| Raise `bottom` to… | The hit rect lands on… | Consequence |
|---|---|---|
| `K + 100` (preserve offset above the new floor) | the multiline `TextInput`, rightmost ~72pt | at `zIndex: 9999` the button wins the tap, so a caret-placement tap fires an audit-logged crisis navigation |
| `K + small` ("just above the keyboard") | Save / Cancel / Delete | the button wins, so the intended action is swallowed |

There is no intermediate value. The sheet fills the region above the keyboard by construction
(`maxHeight: '100%'`), the rect is defined against the **screen** while the sheet's inset is
defined against the **keyboard**, and once the button also moves against the keyboard all three
move together with no free space between them. `OVERLAY_ACTION_ROW_PADDING_RIGHT` protects only
the action row and cannot be extended to a multiline input without reflowing the text being
written.

The one escape — having the sheet reserve `K + 176` — is the sum `useOverlayBottomInset.ts:18-20`
forbids by name: 176 + ~260 = 436pt of an iPhone SE 3's 667pt viewport consumed before any
content, which is DEBUG-403's defect shape.

Making the rect *dynamic* is additionally an **API-shape** change, not a value change:
`CRISIS_BUTTON_EXCLUSION_RECT` is a module-scope `as const` consumed inside `StyleSheet.create`,
so a hook-derived rect forces every consumer into inline style objects recomputed on every
keyboard frame — the same frames the `<200ms` budget is measured on.

---

## The options, and what each costs

| Option | Cost | Status |
|---|---|---|
| **(a) Accept and document** | 988 unreachable via the root button on six surfaces whenever a keyboard is up, two of them also faded. Zero code risk, zero AC3 interaction, no regression surface. | **rejected** by the ruling above |
| **(b) Dynamic raise on `keyboardWillShow`** | Vetoed by AC3's zero-slack equality. Also pays AC2's cost (a safety control whose position is a function of keyboard state is worse for motor and cognitive access), re-opens the DEBUG-299 non-finite-style class with a worse blast radius (a bad value now moves the button *off screen* rather than merely fading it), and RN has no `keyboardWillShow` on Android. | **vetoed** |
| **(c) A different affordance while the keyboard is up** | An iOS `InputAccessoryView` renders *into* the occluding window. Leaves the root button's geometry and the exclusion rect completely static, so AC2 is unpaid and AC3 dissolves; needs no keyboard listener on the crisis path, so AC4 is unaffected. | **the shape the constraints permit** |

Option (c) is the only shape that satisfies AC2 and AC3 simultaneously. Its real costs are
stated in DEBUG-450 and are not small: it is iOS-only in RN with no Android equivalent, it is
wired per-`TextInput` via `inputAccessoryViewID` (so it needs a CI guard in the shape of
`check-modal-occlusion-guard.js`, or a seventh surface ships without it), and it creates a
**second** control carrying the `<200ms` contract and the audit-log obligation.

---

## Carved off to DEBUG-450

The fix itself, plus:

- **AC5, Android** — verify **before** changing anything. Expo's default `resize` mode may
  mean Android is not broken at all, and adding an iOS-shaped offset there could float the
  button mid-screen. The item's framing of the Android delta as "the offset differs (104 vs
  100)" is the wrong axis; the IME window behaviour is.
- **AC6, the on-device pin** — and it carries a false-green trap: the iOS simulator boots with
  the hardware keyboard connected, so no software keyboard appears and a Maestro flow that
  types into a field then asserts the button is visible **passes against a fully broken app**.
  Force `ConnectHardwareKeyboard = 0` and assert the keyboard is actually up, or tag the flow
  `safety-device-only`. Same family as the `canOpenURL` caveat that makes `crisis-988-dial`
  device-only.
- **Keyboard-dismiss hygiene** — every free-text surface should gain a guaranteed one-action
  dismissal. This is worth doing on its own merits but does **not** satisfy the contract (the
  count still lands at 3), so it must not be allowed to close DEBUG-450.

## What this document does not decide

CLAUDE.md's Safety Fact currently reads *"988 access: <3 taps from any screen"* without
qualification. Under this ruling that statement is **false on six surfaces today**, and stays
false until DEBUG-450 ships. Whether to add a named exception, restate the fact, or leave it
as the target it describes is a founder call and is deliberately not made here.

Three separate items — DEBUG-390, DEBUG-403/406, and this one — have now had to re-derive the
"transient states count" reading from precedent rather than read it from the rule.
