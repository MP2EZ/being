---
title: "Daily Practice Architecture"
category: "Practice & Development"
parent: "../INDEX.md"
related: ["./developmental-stages.md", "../principles/01-aware-presence.md", "../operations/assessment.md"]
---

[← Previous: Developmental Stages](./developmental-stages.md) | [Back to INDEX](../INDEX.md)

# 6. Daily Practice Architecture

## Building a Sustainable Foundation

The principles and stages require concrete implementation through regular practice. Knowledge alone doesn't transform consciousness—you need systematic engagement with practices that literally reshape your brain and build new patterns. This section provides detailed guidance for constructing daily practice architecture that supports development while remaining realistic within actual human life.

**Core Principle:** Consistency over intensity. Ten minutes daily produces far better results than an hour twice monthly. Your brain learns through repeated activation of neural pathways, requiring frequent repetition to build strong connections.

> **How to read this document.** The two practice sections below describe **two distinct classical exercises**: morning *praemeditatio* (preparation — object: future events; discipline: desire) and the evening *examen* (review — object: past deeds). The examen is deliberately left without a single discipline label: it exercises assent and action together, and the canonical triad is desire / action / assent (Epictetus, *Disc.* 3.2.1-2) — there is no canonical fourth "discipline of judgment"; "judgment" is at best a secondary-literature gloss on assent. They are not one exercise in two tenses, and this document keeps them separate for that reason.
>
> The **product** ships them through a single daily loop whose tense is inferred from the clock. That is an implementation fact, and it is recorded in [Implementation mapping](#implementation-mapping) below — not by collapsing the doctrine to match. Per-element notes throughout name where each element lives in the shipped loop, or why it does not (MAINT-322).

## Morning Preparation — *praemeditatio* (10-20 minutes)

Morning provides optimal timing because you're setting your day's tone before reactive patterns engage. This time is sacred—as essential as brushing your teeth—and should be protected from other demands.

> **Classical warrant.** Marcus opens *Meditations* 2.1 with exactly this move — rehearsing the day's difficulties on waking — and 5.1 addresses the reluctance that meets it (*"In the morning when thou risest unwillingly, let this thought be present: I am rising to the work of a human being"*, trans. George Long). The forward-looking discipline is *praemeditatio malorum*: Seneca, *Ep.* 91, *Ep.* 99, *Ad Marciam*.

**Basic Structure:**

**1. Settle with Breath (3 minutes)**
- Sit comfortably with spine relatively straight
- Close eyes or soften gaze
- Bring attention to physical sensations of breathing
- When mind wanders, gently label "thinking" and return to breath
- This builds **[Aware Presence](../principles/01-aware-presence.md)** (present attention + metacognitive observation)
- **Implemented as** the loop's `AwarePresence` beat, morning tense, opened by a 30-second skippable breath (`DailyLoopStepScreen`) with a further 15-second breath at `DailyLoopCompleteScreen`. **Duration delta, stated rather than hidden:** the framework asks 3 minutes; the product ships ~30 seconds, because the loop is reflect-first and eyes-up. The framework figure is the aspiration for off-app sitting practice, not a spec the app claims to meet.

**2. Open Awareness (5-10 minutes)**
- Allow attention to open to whatever arises: sounds, sensations, thoughts, emotions
- Observe each as temporary event in awareness without grasping or resisting
- When caught in thought content, gently return to observing as events
- Notice what's happening in your body (**embodied awareness**)
- Practice **[radical acceptance](../principles/02-radical-acceptance.md)** of whatever experiences arise
- **Partially implemented:** the grounding prompt and optional "What's here as you start?" field at `AwarePresence`, plus `MORNING.RadicalAcceptance` for the acceptance half. **The open-monitoring sit as such is not an app surface** — it is off-app guidance.

**3. Set Daily Intention (2-3 minutes)**
- Review your day's commitments
- Bring the [five principles](../principles/) to the day ahead:
  - "Today I practice **aware presence** when I notice my mind time-traveling"
  - "Today I apply **sphere sovereignty** when facing obstacles"
  - "Today I respond with **virtue** in that difficult conversation"
  - "Today I bring **relational presence** to my team meeting"
- Write intention briefly in journal
- This activates **contemplative praxis**
- **Implemented as** `MORNING.VirtuousResponse` — *"Picture one moment you'll need them — what's the action you want to take?"* — plus the virtue chips. The journal line is the coda's optional `CLOSING.noteLabel` note, never a gate.
- **Corrected (MAINT-322):** this element previously read *"Choose specific focus from the five principles"*, i.e. pick one. **The shipped loop brings all five every session**, and `tenseMode.ts` records the reinterpretation explicitly — "selected" means a *prospective focus*, not a pick-one-from-a-menu. The old wording described a feature that does not exist and was contradicted by the product it was meant to describe.

**4. Optional: Gratitude & Impermanence (2-3 minutes)**
- Briefly acknowledge: this day isn't guaranteed, circumstances will change
- Note three specific things you're grateful for right now
- This incorporates **negative visualization** from [Principle 4](../principles/04-virtuous-response.md)
- **Implemented as** the daily loop's closing coda — `CLOSING.gratitudeLine`, morning tense — which keeps the impermanence framing (FEAT-313). Its warrant is that the loop already ships `PREMEDITATIO`, and [Principle 4](../principles/04-virtuous-response.md) calls present-moment gratitude the *"natural complement"* of contemplating loss (this document treats it as a requirement rather than merely natural — a deliberate strengthening on safety grounds, since the aversive half alone is the harmful shape); without this line the loop ships the aversive half alone.
- **"Optional" is load-bearing and was violated in the retired implementation.** The Morning flow's `GratitudeIntentionScreen` made gratitude *required*, which this section never asked for and which the loop's "typing is capture, never a gate" invariant forbids. The coda version is a static line — there is nothing to submit and nothing to skip.

**Quick Reference Card (5-minute minimum):**
If you only have 5 minutes:
1. Three minutes: Settle with breath
2. Two minutes: Set intention for the day

> **Implemented, but with a different shape (MAINT-322).** The loop's **quick** depth (FEAT-301) is this element's successor, and it is *not* breath + intention: it is beats 1→3→4 — arrive, discern what's yours, act. The framework card and the shipped card disagree, and neither is being quietly rewritten to match the other. The product's choice is deliberate: sorting what is and isn't yours is the higher-value two minutes when time is short. Note also that quick and unhurried are presented as **equally complete** practices — `DEPTH_LABELS` deliberately refuses to rank them.

## Mindful Moments Throughout the Day

Brief mindful moments (seconds to minutes) throughout day create bridges from meditation to real life. Research shows these activate the same neural networks strengthened during formal practice.

> **What this section is, precisely.** Most of it is **mindfulness-limb** practice, not classical Stoic technique: seeing and smelling food, feeling water temperature, noticing muscle coordination while walking are attention-to-the-body exercises of Buddhist-derived lineage (*sati*), and the framework carries them under **[Aware Presence](../principles/01-aware-presence.md)**.
>
> Where the section *does* touch Stoic ground is the attention-to-judgment moments — chiefly the waiting-in-traffic reappraisal, which reframes frustration as material for practice. (STOP's "Observe" *can* be turned toward judgment, but as written here — "observe what's happening in body and mind" — it is open monitoring of experience, i.e. the *sati* form.) Those gesture at **prosoche**, continuous vigilant attention to one's own judgments and assents (Epictetus, *Discourses* 4.12, Περὶ προσοχῆς). Prosoche is not a synonym for mindfulness and the section as a whole is not prosoche; the distinction is the framework's own, and blurring it is the conflation this document exists to prevent. (An earlier MAINT-322 draft titled the whole section *prosoche* — withdrawn at sign-off for exactly this reason.)
>
> **Disposition: guidance-only — not app-implemented, and not "dropped."** None of the moments below is a product surface, and none was ever a candidate for a loop beat; marking them *dropped* would be false. They are off-app practice guidance. The nearest shipped things are the `breathing-space` and `body-scan` standalone practices, which belong to the **Aware Presence / mindfulness limb** and must never be presented as classical Stoic technique.

**Natural Transition Points:**

**Before New Activities:**
- Before sitting at computer, entering meeting, picking up phone
- Pause for three conscious breaths
- Reset your awareness
- **Principle activated:** Aware Presence

**During Meals:**
- Before eating, actually see and smell food
- Take first three bites with full attention
- **Principle activated:** Aware Presence

**When Waiting:**
- In line, in traffic, for computer to load
- Instead of grabbing phone, feel feet on ground, notice breath, observe thoughts
- Moments that typically generate frustration become practice opportunities
- **Principles activated:** Aware Presence, Radical Acceptance

**During Difficulty (STOP Practice):**
- **S**top what you're doing
- **T**ake a breath
- **O**bserve what's happening in body and mind
- **P**roceed with awareness and intention
- Takes 30 seconds but creates crucial space
- **Principles activated:** Aware Presence, Sphere Sovereignty, Virtuous Response
- **Provenance: NOT classical Stoic technique.** STOP is an MBSR/MBCT and DBT distress-tolerance skill, adopted here because it works (this doc uses the MBSR/MBCT expansion of **T** as "Take a breath"; the DBT variant expands it "Take a step back") — the same footing as `breathing-space` and `body-scan`. It is retained under the **Aware Presence / mindfulness limb** and must never be presented as an exercise Epictetus or Marcus described. Labelled explicitly at MAINT-322; it had carried no provenance at all.

**Physical Activities:**
- Washing hands: feel water temperature, texture, soap smell
- Walking: notice muscle coordination, alternating pressure, air movement
- These mundane activities become meditation with full attention
- **Principle activated:** Aware Presence (embodied awareness)

## Evening Examen (5-10 minutes)

Before sleep, conduct brief review using Stoic methodology. This isn't self-judgment but honest examination for learning and growth.

> **Classical warrant, previously unattributed (MAINT-322).** The review questions in this section descend directly from **Sextius' three questions**, preserved by Seneca, *De Ira* 3.36.1 — *"quod hodie malum tuum sanasti? cui vitio obstitisti? qua parte melior es?"* ("what ailment of yours have you cured today? what fault resisted? in what respect are you better?") — and from the Pythagorean **Golden Verses** as Epictetus gives them at *Discourses* 3.10.2-3 (*"let sleep not come upon thy languid eyes before…"*). Neither was cited anywhere in this document. That was the largest attribution gap in this document: the structure was inherited faithfully while its source went unnamed.

> **"Before sleep" is timing, not a beat.** Sleep is the *consequence* of the examination, not a component of it — Seneca, *De Ira* 3.36.2: *"qualis ille somnus post recognitionem sui sequitur"* ("what sleep follows this self-examination"). The retired Evening flow's `SleepTransitionScreen` turned that consequence into a step; it was **dropped deliberately** in FEAT-313 rather than re-homed. Its substance is already covered: the wind-down breath by the loop's skippable `CLOSING` breath, and "tomorrow is a new practice" by `CLOSING.returnLine` on a *Meditations* 5.9 warrant. If a sleep-compatible wind-down is wanted as a product feature, it belongs in `STANDALONE_PRACTICES` as an **Aware Presence** practice (the mindfulness limb, labelled as such) — never inside the loop as classical Stoic technique.

**Structure (Can Write or Contemplate):**

**1. Review Morning Intention**
- Did you remember it during the day?
- Were there opportunities to practice?
- If you succeeded: What exactly did you do? What made it possible?
- If you fell short: What interfered? Did you forget, react automatically, or consciously choose differently?
- **Dropped with reason (MAINT-322): the loop keeps no cross-session carry-over.** `DailyLoopNavigator` declines session resumption by design, so an evening session cannot surface what a morning session recorded. Reviewing a *remembered* intention survives at `EVENING.VirtuousResponse` ("where did you meet them, or fall short"); reviewing a *stored* one does not exist and is not planned. This is recorded as dropped rather than deferred: the self-contained session is a deliberate product property, not a missing feature.

**2. Identify Wise Responses**
- Where did you respond from wisdom and virtue?
- Perhaps you caught catastrophizing and applied sphere sovereignty
- Maybe you listened with genuine presence
- Possibly you noticed anger and chose measured response
- **Acknowledge specifically**—this positive reinforcement strengthens neural pathways
- **Implemented as** `EVENING.SphereSovereignty.mine` together with `EVENING.VirtuousResponse` ("where did you meet them").

**3. Identify Unskillful Responses**
- Where did you violate principles or values?
- Examine with compassionate honesty (not self-flagellation)
- What triggered the unskillful response?
- What beliefs or patterns drove your reaction?
- What did you fail to notice in the moment?
- **Implemented as** `EVENING.RadicalAcceptance` + `EVENING.SphereSovereignty.notMine` + `EVENING.VirtuousResponse` ("or fall short").
- **"Compassionate honesty" has a specific classical warrant, previously uncited (MAINT-322):** the Senecan examen *terminates in self-pardon*. *De Ira* 3.36.3 — *"vide ne istud amplius facias; nunc tibi ignosco"* ("see that you do this no more; for now, I forgive you"). This is not a softening of the review; it is the review's designed ending, and it is what distinguishes *examen* from rumination. The requirement is carried in the loop by `CLOSING.postureLine`.

**4. Mental Rehearsal**
- Imagine specifically how you might respond differently in similar future situations
- If you reacted defensively to criticism: visualize hearing criticism, noticing defensiveness, taking breath, responding with openness
- This concrete rehearsal makes alternative responses more accessible
- Much more effective than vague commitments to "do better"
- **Implemented as** the daily loop's `EVENING.VirtuousResponse` — *"Where did you meet them, or fall short — and how would you meet it next time?"* — which binds the rehearsal to a specifically reviewed shortfall, exactly as the last bullet demands.
- The retired Evening flow's `TomorrowScreen` ("Any intention for tomorrow?") was **dropped deliberately** in FEAT-313, not re-homed: free-floating and unhedged, it *is* the vague commitment this section warns against, and it carried no **reserve clause** — the *exceptio* / *hypexhairesis* that hedges every Stoic forward intention: Seneca, *De Beneficiis* 4.34.4, *"ad omnia cum exceptione venit: si nihil inciderit, quod impediat"* ("he comes to everything with the reservation: if nothing intervenes to prevent it" — *venit* per the Hosius/Basore critical text; some older editions print *veniet*); the parallel *"Navigabo, nisi si quid inciderit"* is *De Tranquillitate Animi* 13. Cf. Marcus, *Meditations* 4.1, 5.20, 6.50. Its "letting go" field survives one beat earlier at `EVENING.SphereSovereignty.notMine`, minus the instrumental "for more peaceful rest" framing.
  > **Citation corrected (MAINT-322).** This bullet previously cited *"Seneca, Ep. 101.4-5, nihil sibi in posterum promittere"* as the reserve-clause warrant. Three errors: **(a)** the Latin was **fabricated** — Seneca's text at *Ep.* 101.5 reads *"Nihil sibi quisquam de futuro debet promittere"*, and the doc set a paraphrase in italics as though quoting; **(b)** the section was wrong (101.5, not 101.4); **(c)** most seriously, the **locus** was wrong — *Ep.* 101 is about the folly of long hopes and the nearness of death, which is adjacent to but not the reserve clause. The codebase already had this right (`standalonePractices.ts` files the reserve clause as *hypexhairesis*), so the canonical framework document was the outlier. *Ep.* 101.5 remains usable as secondary support for "do not promise yourself tomorrow" — with its real wording, or none.
  >
  > **A note on how this correction was itself corrected.** The first attempt at this fix printed *"faciam, nisi si quid inciderit"* under *De Beneficiis* 4.34.4 — reproducing error class (a) *inside the bullet diagnosing error class (a)*. That phrase appears in no source: *De Ben.* 4.34.4 reads *"ad omnia cum exceptione venit…"*, while the *"nisi si quid inciderit"* formula belongs to *De Tranquillitate Animi* 13 with *Navigabo*, not *faciam*. The sign-off pass caught it. Recorded here because a wrong quotation shipped under a "Citation corrected" banner is **harder** to catch than the plain error it replaces — the banner is exactly what a future reader trusts. **Verify Latin against a numbered edition; never against memory of the formula.**

**5. Three Gratitudes**
- Three specific things from today (not generic)
- "I'm grateful my daughter told me about her day even though tired"
- Not "I'm grateful for my family"
- Specificity engages memory and emotion
- **Implemented as** the daily loop's closing coda — `CLOSING.gratitudeLine`, evening tense — which preserves the specificity requirement verbatim in its copy ("a moment, not a category") (FEAT-313). The static line invites one; the coda's existing optional note accepts as many as the practitioner wants, so the "three" standard here is intact rather than reduced.
- The retired Evening flow justified this beat as *"positive priming before evaluative work."* That rationale is **not** carried forward: it makes gratitude instrumental to a downstream mood outcome, where Stoic gratitude is an act of justice and correct judgment, good in itself (Seneca, *De Beneficiis*; Marcus, *Meditations* Bk 1).

**Application of Five Principles:**
- **[Aware Presence](../principles/01-aware-presence.md):** How often was I actually present vs. lost in thought?
- **[Radical Acceptance](../principles/02-radical-acceptance.md):** Where did I resist reality? Where did I accept it?
- **[Sphere Sovereignty](../principles/03-sphere-sovereignty.md):** Where did I focus on externals vs. what I control?
- **[Virtuous Response](../principles/04-virtuous-response.md):** Where did I respond (or not) with wisdom/courage/justice/temperance?
- **[Interconnected Living](../principles/05-interconnected-living.md):** How did I affect others today?

> **This list structurally IS the shipped loop** — all five beats in canonical order, evening tense, with `STEP_PRINCIPLE` binding each beat 1:1 to its principle. The dichotomy of control invoked here, in the difficult-periods section, and in the touchstones below is **Epictetus, *Enchiridion* 1** — a citation this document did not carry anywhere despite depending on it (MAINT-322). *(It is not the warrant for the STOP practice, which is a modern clinical skill — see that element's provenance note.)*

## Weekly Integration (30-60 minutes)

Set aside time once per week for deeper reflection and planning.

**Weekly Activities:**

**Review Journal Entries:**
- Look for patterns: recurring triggers, successful applications, areas needing work
- Are there specific principles you're successfully applying?
- Are there life areas where practice hasn't extended?

> **Implemented elsewhere, outside the loop.** `WeeklyReflectionCard` on Insights (gated at ≥4 check-ins in 7 days) is the only weekly surface. There is no weekly *ritual*; the review is a card, not a session.

**Adjust Focus:**
Based on review, adjust intentions and focus for coming week. Perhaps emphasize a principle that's been neglected.

> **Dropped with reason — explicitly anti-scoped.** `WeeklyReflectionCard` carries the note "No pick next week's focus CTA (would recreate the FEAT-50 anti-scope)". Choosing a focus for the week is the same pick-one-principle move corrected in the morning section: the loop brings all five, every session.

**Study:**
- Read slowly through Stoic texts (Meditations, Discourses, Letters)
- Read books on mindfulness practice
- Take notes on passages that resonate or challenge
- Consider how teachings apply to your specific life

**Community Engagement:**
- Attend meditation group if available
- Schedule conversations with friends/family who share interest
- Participate in online communities or forums
- Social support dramatically increases practice consistency

> **Guidance-only — not app-implemented.** Being is local-first with no social surface, and none is planned. This is off-app guidance, not a dropped feature: "attend a meditation group" was never a candidate for a loop beat.

## Monthly Deepening

**Extended Practice:**
Once per month, consider longer retreat or intensive:
- Half-day or full day of extended meditation
- Weekend retreat at meditation center
- Several hours in nature with phone off
- Extended attention reveals depths difficult to access in brief sessions

**Long-Term Progress Review:**
Compare current patterns to 1-3 months ago:
- Situations that triggered intense reactivity now produce mild responses
- Practices requiring enormous effort now feel natural
- Intellectual understanding has become embodied
- This recognition supports continued motivation

> **Extended Practice is guidance-only** (half-day retreats are off-app by nature). **Long-Term Progress Review is implemented elsewhere, outside the loop:** the Insights `PrincipleEngagementChart` (90-day) and `DotCalendar` carry it, though nothing is monthly-*triggered*.

## Adjustments for Life Circumstances

**Reality Check:**
Life includes periods when full structure isn't possible: illness, travel, major transitions, crisis, increased work demands.

**Minimum Effective Dose:**
Identify your non-negotiable core—the bare minimum you commit to regardless of circumstances:
- Perhaps just 5 minutes meditation + brief evening check-in
- This prevents all-or-nothing thinking: "I don't have time for full practice, so I'll skip" → skipping for week → losing habit entirely

**During Difficult Periods:**
Apply **radical acceptance** to practice itself. You cannot always maintain ideal conditions (outside your control). What remains in your control: your intention to practice as circumstances allow, creativity in finding moments for mindfulness despite constraints, willingness to resume full practice when circumstances stabilize.

**During Stable Periods:**
Intensify practice—extend meditation, add sessions, spend time in nature or silence. Intensive practice during conducive periods can produce breakthroughs that inform practice during busier times.

> **Dropped with reason, and deliberately so.** The product **refuses an intensity ladder**: `DEPTH_LABELS` presents quick and unhurried as equally complete practices rather than ranking them, and `stageNotes` bans streak anxiety. An "intensify when stable" rung would reintroduce exactly the achievement framing the loop was designed to avoid. This paragraph stays as off-app guidance; it is not a product gap.

> **Minimum Effective Dose and During Difficult Periods are implemented:** the FEAT-301 quick depth, `DEPTH_PICKER_COPY` ("both are complete practices"), and `CLOSING.returnLine` on a *Meditations* 5.9 warrant — re-entry after a lapse *is* the practice. The "During Difficult Periods" move of turning radical acceptance reflexively onto one's own practice consistency is one of this document's better contributions and is carried by `CLOSING.postureLine` + `CLOSING.returnLine`.

## The Five Principles in Daily Practice

**Making It Concrete:**

**Morning:** Bring all five to the day ahead — prospectively
**Throughout Day:** When facing challenges, ask "Which principle applies here?"
**Evening:** "Where did I apply/miss each principle today?"

> **Corrected (MAINT-322).** "Morning: Choose one principle as daily focus" directly contradicted the shipped loop, which brings all five every session in canonical order. This was the second instance of the same pick-one error (see the morning Set Daily Intention element). "Throughout Day" has **no in-day surface** — guidance-only.

**Quick Reference:**
1. Am I present and aware? (**[Aware Presence](../principles/01-aware-presence.md)**)
2. Am I accepting what is? (**[Radical Acceptance](../principles/02-radical-acceptance.md)**)
3. Am I focused only on what I control? (**[Sphere Sovereignty](../principles/03-sphere-sovereignty.md)**)
4. Am I responding with virtue? (**[Virtuous Response](../principles/04-virtuous-response.md)**)
5. Am I considering others/common good? (**[Interconnected Living](../principles/05-interconnected-living.md)**)

These five questions become your touchstones throughout each day.

---

## Implementation mapping

*Added by MAINT-322. This section records how the product delivers the two exercises above. It is deliberately **not** the organizing structure of this document — see "How to read this document" at the top.*

### One loop, five beats, tense inferred from the clock

FEAT-298 slice 5 retired the three time-of-day flows and the mode picker. The product now ships **one** daily loop of five beats in canonical order — Aware Presence → Radical Acceptance → Sphere Sovereignty → Virtuous Response → Interconnected Living — plus a `CLOSING` coda. The **tense** (morning-prospective / flat / evening-retrospective) is inferred from the device clock and **never surfaced to the user**: there is no mode label and no picker.

Critically, the two classical exercises are *not* collapsed in the implementation either. `MORNING` and `EVENING` are separately authored configurations that differ materially at every beat — Radical Acceptance reads *"What might today ask you to accept"* in the morning and *"Where did you resist reality today"* in the evening — and `PREMEDITATIO` is **morning-only**, never rendered in flat or evening tense.

### Time → tense

| Local time | Tense |
|---|---|
| 05:00 – 11:59 | morning |
| 12:00 – 16:59 | flat |
| 17:00 – 01:59 | evening (wraps past midnight) |
| **02:00 – 04:59** | **flat** — deliberate carve-out |

Source of truth: `app/src/core/utils/timeOfDay.ts`, pinned by exact-boundary tests in its `__tests__` directory. The small-hours branch is checked **first** in the implementation, precisely so the wrapping evening band cannot swallow it.

**Why 02:00–04:59 is flat.** This is a therapeutic-safety decision, not a rounding convenience. Someone awake at 3am is disproportionately awake *involuntarily*. Handing them "evening" would hand them a rumination-shaped retrospective at the worst possible hour — and the Senecan examen is explicitly *speculator sui censorque* terminating in clemency (*De Ira* 3.36.2-3), **not** rumination. Handing them "morning" would presume a night's sleep they have not had. Flat is the honest and safest reading. **Do not "simplify" this away.**

> Do not confuse this with `getTimeOfDayBand`, which returns morning/midday/evening for **greeting copy** and has no 3am carve-out. At 03:00 the *tense* is flat while the *band* is evening. The divergence is deliberate and documented in code.

### Known deviation: the practitioner does not choose

The clock decides the tense, and the user cannot override it. A night-shift worker who wants morning preparation at 9pm is refused it.

This is recorded here as an **accepted cost, not an oversight**. It is a genuine *prohairesis* cost — choice is the one thing Stoicism holds is entirely ours, and here an algorithm makes it. The mitigations are real but partial: every field is optional, the loop is reflect-first, and a mis-tensed session is still a coherent practice. "Still coherent" is not "the user chose."

The counterweight, which is why the design is nevertheless defensible: **the sources themselves index these exercises to the clock.** Seneca's examen is bound to actual nightfall and the sleep that follows it (*De Ira* 3.36.1-2); the Golden Verses specify "before sleep" (Epictetus, *Disc.* 3.10.2-3); Marcus 2.1 is a morning exercise because it is morning. A free picker would license an evening reckoning at 7am — a retrospective over a day not yet lived, which no source contemplates.

There is a second, smaller cost. The ancient practice is not two prompt sets; it is a discipline the practitioner *knows they are performing* (Seneca, *De Ira* 3.36.3: *"utor hac potestate et cotidie apud me causam dico"* — "I use this power, and daily plead my case before myself"). On Hadot's reading, *prosoche* is the underlying attitude the examen and the other exercises rest on; that is an interpretive position rather than a claim the sources state outright, and it is flagged as such here. A user who never sees the words "morning" or "evening" performs *praemeditatio* without knowing it is *praemeditatio*. That is a loss of **naming**, not of practice — and this document is where the naming survives.

### Disposition vocabulary

Per-element notes above use four labels, not two:

| Label | Meaning |
|---|---|
| **Implemented as** | Lives in the loop; names the beat/coda by its code path (e.g. `CLOSING.gratitudeLine`) |
| **Implemented elsewhere, outside the loop** | Shipped, but on another surface (Insights cards, Learn modules) |
| **Guidance-only — not app-implemented** | Never a candidate for a loop beat; off-app practice guidance. *Not* the same as dropped |
| **Dropped with reason** | Was a candidate, deliberately not carried forward, with the reason stated |

A fifth case is called out inline where it occurs: **implemented, but the implementation disagrees with this section** (the 5-minute Quick Reference Card vs. the shipped quick depth). Those are stated as disagreements rather than silently reconciled in either direction.

---

**Related:**
- See [Developmental Stages](./developmental-stages.md) for how practice evolves over time
- See [The Five Principles](../principles/) for detailed guidance on each principle
- See [Assessment](../operations/assessment.md) for tracking your practice effectiveness

---

[← Previous: Developmental Stages](./developmental-stages.md) | [Back to INDEX](../INDEX.md)
