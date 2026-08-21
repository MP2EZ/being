/**
 * PracticeCompletionScreen Component
 * Reusable completion screen for all practice types
 *
 * PHILOSOPHER VALIDATION:
 * - Uses exact Stoic quotes from Notion validation
 * - Educational tone (no gamification)
 * - Acknowledges effort without scoring
 *
 * PERFORMANCE:
 * - <500ms launch time
 * - Minimal re-renders
 * - Optimized animations
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  AccessibilityInfo,
} from 'react-native';
import { semantic, colorSystem, spacing, typography, borderRadius } from '@/core/theme';
import type { ModuleId } from '@/features/learn/types/education';

/**
 * DEBUG-339 added `translation`. It is REQUIRED, not optional, and that is the
 * point: this surface had no translator field, which is structurally why it
 * drifted to Morris Morgan (4.3) and Nicholas White (Enchiridion 1) without
 * anything noticing. `assets/passages/*.json` and MARCUS_QUOTES both already
 * carried one; PRACTICE_QUOTES was the outlier. A required field means the guard
 * can assert provenance POSITIVELY rather than only banning strings already
 * known to be bad.
 *
 * Allowed values are author-keyed (Marcus → Long, Epictetus → Carter, Seneca →
 * Gummere/Stewart) and enforced in practiceQuotes.test.ts — a flat allowlist
 * cannot express that "George Long" is right for Marcus and wrong for Epictetus.
 */
interface ClassicalQuote {
  text: string;
  author: 'Marcus Aurelius' | 'Epictetus' | 'Seneca';
  source: string;
  translation: 'George Long' | 'Elizabeth Carter' | 'Richard Mott Gummere' | 'Aubrey Stewart';
}

interface PracticeCompletionScreenProps {
  practiceTitle: string;
  /**
   * DEBUG-344: optional. It is always supplied for an authored practice — the
   * key-set guard in practiceQuotes.test.ts fails the build otherwise. It is
   * absent only for an unknown practiceId, which is reachable from outside the
   * app via linking.ts's unvalidated `practice/:practiceId`. In that case the
   * screen renders without a citation rather than throwing: there is no error
   * boundary above these screens and the crisis affordance is a sibling in the
   * same tree, so a throw here would white-screen the 988 path.
   */
  quote?: ClassicalQuote;
  moduleId: ModuleId;
  onContinue: () => void;
  testID?: string;
}

/**
 * Stoic quotes — public-domain translations only, MUST be used exactly as
 * provided. No paraphrasing, no modernising, no splicing across non-adjacent
 * sentences.
 *
 * This comment used to read simply "validated by philosopher". DEBUG-330 found
 * that the single most widely circulated FAKE Marcus quote had shipped directly
 * beneath it, so the claim was worth exactly nothing on its own. The enforcement
 * now lives in practiceQuotes.test.ts, not in this sentence: a denylist of every
 * bad string previously shipped here, a corpus loop pinning every entry that has
 * a counterpart in assets/passages, exact-string pins for the five loci that do
 * not, and an author-keyed translator allowlist.
 *
 * Permitted edits to a source translation, each of which must be named in the
 * entry's own comment: drop a leading subordinator or enumerator, capitalise the
 * resulting first word, convert a clause-final semicolon or colon to a period,
 * render Gutenberg's double hyphen as an em dash. Nothing else.
 *
 * Every entry is REPLACED, never removed — usePracticeCompletion.tsx falls back
 * to `breathing-space` for an unknown practiceId, so deleting a key turns a
 * missing quote into a silent misattribution under another practice rather than
 * an error.
 */
export const PRACTICE_QUOTES: Record<string, ClassicalQuote> = {
  // DEBUG-339: was "Confine yourself to the present." cited to Meditations 8.36
  // — wrong on BOTH counts, and this is the fallback entry
  // (usePracticeCompletion.tsx: `PRACTICE_QUOTES[id] || PRACTICE_QUOTES['breathing-space']`),
  // so it is the most-displayed classical string in the product.
  // "Confine thyself to the present" is Long 7.29, not 8.36; 8.36 is "Do not
  // disturb thyself by thinking of the whole of thy life...". The repo already
  // agreed with 7.29 in TWO places — passages-1-aware-presence.json and
  // marcusQuotes.ts — and only this surface dissented. "yourself" was also a
  // modernisation of Long's "thyself", inconsistent with the archaic register
  // DEBUG-330 deliberately shipped in virtue-check / virtuous-reframing / body-scan.
  'breathing-space': {
    text: 'Confine thyself to the present.',
    author: 'Marcus Aurelius',
    source: 'Meditations 7.29',
    translation: 'George Long',
  },
  // DEBUG-339: the CITATION was right — that sentence does close Long 4.3 — but
  // the wording was Morris H. Morgan's rendering (the one Bartlett's popularised),
  // not Long. Morgan died in 1910, so this is very probably NOT a copyright
  // defect; it is a TRANSLATOR-CONSISTENCY defect, which is the subtler failure
  // the new `translation` field exists to prevent. Long 4.3 verbatim, with only
  // the enumerating lead-in "One is that" dropped and "Things" capitalised.
  // Long's own closing sentence ("The universe is transformation: life is
  // opinion.") was considered and rejected: on a completion screen shown to a
  // beginner with no context, "life is opinion" reads as "your life is
  // imaginary" rather than "your judgements constitute your experience".
  'acceptance-shift': {
    text: 'Things do not touch the soul, for they are external and remain immovable; but our perturbations come only from the opinion which is within.',
    author: 'Marcus Aurelius',
    source: 'Meditations 4.3',
    translation: 'George Long',
  },
  // DEBUG-339: was "Do not let the body's reflexes control the soul." cited to
  // 6.16 — a paraphrase of nothing. That sentence appears in no translation, and
  // 6.16's subject is what is worth VALUING, not bodily resistance; its nearest
  // clause ("nor being moved by desires as puppets by strings") is about
  // appetite, is a fragment, and would fail the terminal-punctuation guard.
  // Re-cited to Long 8.28, contiguous and verbatim (only Gutenberg's double
  // hyphens rendered as em dashes). 8.28 is the one place Marcus explicitly
  // LICENSES the body to register its complaint — "let the body say what it
  // thinks of it" — before locating the freedom in the judgement. That is
  // anti-suppression and clinically safe for a Radical Acceptance body scan
  // whose own instruction is "allowing it to be there".
  // Rejected: 5.26 (already body-scan's locus, and its opening "undisturbed by
  // the movements in the flesh" reads as emotional suppression — colloquial
  // "stoicism", the exact anti-pattern this framework bans); 4.39 ("cut, burnt,
  // filled with matter and rottenness") is banned outright from this surface.
  // Keep British "tranquillity" (double-l) exactly as Long has it.
  'resistance-check': {
    text: 'Pain is either an evil to the body — then let the body say what it thinks of it — or to the soul; but it is in the power of the soul to maintain its own serenity and tranquillity, and not to think that pain is an evil.',
    author: 'Marcus Aurelius',
    source: 'Meditations 8.28',
    translation: 'George Long',
  },
  // DEBUG-339 — NOT named in the original ACs, and the most serious defect found:
  // "Some things are up to us..." is Nicholas White (Hackett, 1983), IN
  // COPYRIGHT (and also the shape Robin Hard 2014 uses). This repo's declared
  // public-domain Epictetus is Elizabeth Carter (1758), per the `translation`
  // field on every Enchiridion entry in passages-3-sphere-sovereignty.json.
  // Now byte-identical to that corpus entry's opening sentence.
  // NOTE: the FULL White paragraph still ships in
  // assets/modules/module-3-sphere-sovereignty.json — a larger exposure than
  // this one, tracked separately as DEBUG-343.
  'control-sorting': {
    text: 'Some things are in our control and others not.',
    author: 'Epictetus',
    source: 'Enchiridion 1',
    translation: 'Elizabeth Carter',
  },
  // DEBUG-339: one-word drift — Long reads "...WHICH he is not formed by nature
  // to bear", not "that". Exactly the byte-level slippage this work item exists
  // to kill. Locus kept: note 5.18 is about BEARABILITY rather than the reserve
  // clause proper (hupexairesis is 6.50), so the entry does not quite mean its
  // own key — deliberately left as a separate scope call rather than silently
  // re-cited here.
  'reserve-clause': {
    text: 'Nothing happens to any man which he is not formed by nature to bear.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.18',
    translation: 'George Long',
  },
  // DEBUG-330: was "Waste no more time arguing what a good person should be.
  // Be one." — not a loose paraphrase but Gregory Hays (2002) with two words
  // dropped, i.e. in-copyright. Now George Long (1862) verbatim, byte-identical
  // to assets/passages/passages-4-virtuous-response.json.
  'virtue-check': {
    text: 'No longer talk at all about the kind of man that a good man ought to be, but be such.',
    author: 'Marcus Aurelius',
    source: 'Meditations 10.16',
    translation: 'George Long',
  },
  // DEBUG-330: was Hays' "The impediment to action advances action. What stands
  // in the way becomes the way." The CITATION was right; only the wording was in
  // copyright. Now George Long (1862), trimmed to the final clause-chain of 5.20
  // verbatim (only the subordinating "for the" dropped) so it stays a substring
  // of the passages-corpus entry. The "mind converts" clause is kept
  // deliberately: the mind as AGENT of the reframing is the whole point of a
  // virtuous-reframing practice, and it is exactly what the Hays compression
  // flattens away.
  'virtuous-reframing': {
    text: 'The mind converts and changes every hindrance to its activity into an aid; and so that which is a hindrance is made a furtherance to an act; and that which is an obstacle on the road helps us on this road.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.20',
    translation: 'George Long',
  },
  // DEBUG-339 — NOT named in the original ACs. "Receive without conceit, release
  // without struggle." matches no translation: it is a synonym-swapped
  // compression whose structure tracks Hays 8.33 ("To accept it without
  // arrogance, to let it go with indifference") — the same defect shape DEBUG-330
  // found in virtue-check. Re-cited rather than re-rendered, because Long's 8.33
  // is one line about WEALTH ("Receive [wealth or prosperity] without arrogance;
  // and be ready to let it go") and is a poor content match for a gratitude
  // reflection — the 8.33 locus was only ever chosen to fit a paraphrase that is
  // itself wrong. Long 7.27 first sentence, contiguous and verbatim, IS the
  // Stoic gratitude passage.
  //
  // MAINT-331 — DO NOT TRIM THIS BACK TO THE FIRST SENTENCE. It is ~375 chars,
  // roughly 1.8x the next-longest entry, so it is exactly the kind of string
  // someone shortens for layout. The second sentence is here because Marcus put
  // it here: it opens "At the same time however take care that…", i.e. he hedges
  // his own instruction in the same breath, because the counterfactual s.1
  // prescribes ("how eagerly they would have been sought") recruits desire to
  // re-value a thing you already have, and overshoots into overvaluing it.
  // s.1 alone is the un-guarded half. This screen REPLACES the practice screen
  // (ReflectionTimerScreen returns it instead of the sit), so the practice's own
  // in-situ guard is off-screen and unrecoverable by the time this renders —
  // shipping s.1 alone makes the flow's last word a desire-amplifying clause,
  // after the disarming is over. Ending instead on "so as to be disturbed if
  // ever thou shouldst not have them" lands on your own assent rather than on a
  // picture of privation, which is the correct terminus for a Principle-4 screen.
  // Layout is safe by construction: no numberOfLines/ellipsizeMode/maxHeight
  // anywhere in this file, and the quote sits in a ScrollView.
  'gratitude-reflection': {
    text: 'Think not so much of what thou hast not as of what thou hast: but of the things which thou hast select the best, and then reflect how eagerly they would have been sought, if thou hadst them not. At the same time however take care that thou dost not through being so pleased with them accustom thyself to overvalue them, so as to be disturbed if ever thou shouldst not have them.',
    author: 'Marcus Aurelius',
    source: 'Meditations 7.27',
    translation: 'George Long',
  },
  // DEBUG-330: was "You have power over your mind - not outside events. Realize
  // this, and you will find strength." cited to Meditations 5.9 — a
  // well-documented SPURIOUS quotation appearing in no standard translation.
  // (The real 5.9 is the "return to it again" passage, which this codebase
  // already cites correctly at tenseMode.ts.) Because the line is a fabrication
  // there is no public-domain rendering of it to substitute, so the locus had to
  // be CHOSEN rather than re-translated.
  //
  // Meditations 5.26 (George Long, 1862) is the one passage that states the
  // instruction a body scan actually gives: sensation arises naturally and is
  // not to be resisted; what is up to you is whether the ruling faculty adds the
  // judgement "good" or "bad" to it. That is authentically Stoic
  // (phantasia/synkatathesis applied to somatic experience) rather than a Stoic
  // gloss on vipassana, and it is clinically safer than the alternatives — it
  // explicitly forbids striving against sensation, so it cannot read as
  // suppression to a user in pain. 5.26 collides with no other entry's locus.
  'body-scan': {
    text: 'Thou must not strive to resist the sensation, for it is natural: but let not the ruling part of itself add to the sensation the opinion that it is either good or bad.',
    author: 'Marcus Aurelius',
    source: 'Meditations 5.26',
    translation: 'George Long',
  },
  // DEBUG-344: module 5 authors three practices that had NO entry here, so
  // usePracticeCompletion's `|| PRACTICE_QUOTES['breathing-space']` served all
  // three the Aware-Presence quote — a principle→practice misattribution on a
  // surface users read as canonical. That fallback is now gone; these are the
  // replacements.
  //
  // All three take loci with NO counterpart in assets/passages/, deliberately.
  // The tempting move is to cite Meditations 2.1 / 4.4 / 7.13 so the corpus loop
  // in practiceQuotes.test.ts covers them for free — but passages-5's 7.13 is
  // NOT George Long despite declaring him (its whole first sentence is
  // rewritten), and its 2.1 splices out Long's middle sentence with no ellipsis.
  // corpusContains() is a substring check, so an excerpt from either would PASS
  // the guard while shipping non-Long text: DEBUG-339's defect laundered through
  // the corpus, arriving test-blessed. These are exact-string pinned in EXPECTED
  // instead. (Corpus defects tracked separately as DEBUG-352.)
  //
  // The practice is metta in STRUCTURE (self → loved one → neutral → difficult →
  // all beings) but oikeiōsis in SUBSTANCE — Hierocles' widening circles. Its
  // hardest and most distinctively Stoic step is extending goodwill to someone
  // who has wronged you. 7.22's first sentence names exactly that capacity, and
  // frames it as what is distinctively human rather than as a duty — the right
  // register for a closing line.
  //
  // STOPS at the first sentence, non-negotiably. Long's continuation ("the
  // wrong-doer has done thee no harm, for he has not made thy ruling faculty
  // worse") reads on a context-free completion screen as harm-minimisation to a
  // user who has actually been harmed — the same clinical-safety ground on which
  // DEBUG-339 rejected 4.39 outright and rejected 5.26's opening for
  // resistance-check.
  'loving-kindness': {
    text: 'It is peculiar to man to love even those who do wrong.',
    author: 'Marcus Aurelius',
    source: 'Meditations 7.22',
    translation: 'George Long',
  },
  // 6.53 in its entirety, and it maps the practice's two halves exactly.
  // "Attend carefully to what is said" is the attentional half (notice the
  // wandering mind, notice the impulse to interrupt or pre-compose a reply);
  // "be in the speaker's mind" is the relational half (listen for what is
  // beneath the words) and is what makes this justice/oikeiōsis rather than
  // mere concentration — the other person is a mind to enter, not a stimulus
  // to process.
  //
  // 7.30 ("Direct thy attention to what is said") is genuine and adjacent but
  // purely attentional; it drops the empathic move that distinguishes this from
  // Module 1's presence work, which is the exact principle→practice confusion
  // this item exists to fix.
  'mindful-listening': {
    text: "Accustom thyself to attend carefully to what is said by another, and as much as it is possible, be in the speaker's mind.",
    author: 'Marcus Aurelius',
    source: 'Meditations 6.53',
    translation: 'George Long',
  },
  // The practice is Seneca's evening examen turned outward: review the day, name
  // one contribution, one harm, one missed opportunity, set tomorrow's intention.
  // 11.4 is the Stoic answer to the question such a review invites — "did it
  // count? was it noticed?" — namely that the reward is internal to the just act.
  // That is dikaiosynē as its own end, and it guards the failure mode a
  // social-impact tracker structurally invites: performative virtue and
  // scorekeeping.
  //
  // STOPS after 'reward.' Long's third sentence ends with his own bracketed
  // insertion "[doing such good]"; shipping the brackets is ugly and silently
  // unbracketing them is inventing translator text. Excerpting at a sentence
  // boundary is the move already sanctioned for gratitude-reflection.
  'social-impact-reflection': {
    text: 'Have I done something for the general interest? Well then, I have had my reward.',
    author: 'Marcus Aurelius',
    source: 'Meditations 11.4',
    translation: 'George Long',
  },
};

const PracticeCompletionScreen: React.FC<PracticeCompletionScreenProps> = ({
  practiceTitle,
  quote,
  moduleId,
  onContinue,
  testID = 'practice-completion-screen',
}) => {
  // Announce completion for screen readers
  React.useEffect(() => {
    AccessibilityInfo.announceForAccessibility(
      quote
        ? `Practice complete: ${practiceTitle}. ${quote.text}`
        : `Practice complete: ${practiceTitle}.`
    );
  }, [practiceTitle, quote]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      testID={testID}
      accessible
      accessibilityLabel="Practice completion screen"
    >
      {/* Completion Icon */}
      <View style={styles.iconContainer}>
        <Text style={styles.completionIcon} accessibilityLabel="Checkmark icon">
          ✓
        </Text>
      </View>

      {/* Title */}
      <Text
        style={styles.title}
        accessibilityRole="header"
      >
        Practice Complete
      </Text>

      {/* Practice Name */}
      <Text style={styles.practiceName}>{practiceTitle}</Text>

      {/* Stoic Quote - Philosopher Validated.
          DEBUG-344: omitted entirely for an unknown practiceId. Showing no
          citation is correct here — the previous behaviour was to fall back to
          the breathing-space quote, which asserted a false principle→practice
          mapping rather than admitting the gap. */}
      {quote && (
        <View style={styles.quoteContainer}>
          <Text
            style={styles.quoteText}
            // DEBUG-339: the a11y label carries the translator too, so the
            // screen-reader path says the same thing as the visual attribution
            // below. Surfacing it only visually would leave the two paths
            // disagreeing about provenance.
            accessibilityLabel={`Quote from ${quote.author}, ${quote.source}, translated by ${quote.translation}: ${quote.text}`}
          >
            "{quote.text}"
          </Text>
          <Text style={styles.quoteAttribution}>
            {/* DEBUG-339: "(trans. …)" matches the convention InsightsScreen.tsx
                already uses. Storing the translator without rendering it would
                leave the public-domain posture documented in code but invisible
                to the reader. */}
            — {quote.author}, {quote.source} (trans. {quote.translation})
          </Text>
        </View>
      )}

      {/* Educational Message - No Gamification */}
      <Text style={styles.educationalMessage}>
        Each time you practice, you strengthen awareness. The benefits unfold
        gradually, through regular engagement with these principles.
      </Text>

      {/* Action Buttons */}
      <View style={styles.buttonContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.primaryButton,
            pressed && styles.primaryButtonPressed,
          ]}
          onPress={onContinue}
          accessibilityRole="button"
          accessibilityLabel="Continue"
          accessibilityHint="Continue from practice completion"
          testID={`${testID}-continue-button`}
        >
          {({ pressed }) => (
            <Text
              style={[
                styles.primaryButtonText,
                pressed && styles.primaryButtonTextPressed,
              ]}
            >
              Continue
            </Text>
          )}
        </Pressable>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  contentContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing[24],
    paddingVertical: spacing[32],
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: spacing[80],
    height: spacing[80],
    borderRadius: borderRadius.xxxl,
    backgroundColor: colorSystem.status.successBackground,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing[24],
  },
  completionIcon: {
    fontSize: spacing[48],
    color: colorSystem.status.success,
    fontWeight: typography.fontWeight.bold,
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    marginBottom: spacing[8],
    textAlign: 'center',
  },
  practiceName: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.medium,
    color: semantic.text.secondary,
    marginBottom: spacing[32],
    textAlign: 'center',
  },
  quoteContainer: {
    backgroundColor: colorSystem.navigation.learn + '10', // 10% opacity
    borderLeftWidth: spacing[4],
    borderLeftColor: colorSystem.navigation.learn,
    paddingVertical: spacing[24],
    paddingHorizontal: spacing[16],
    marginBottom: spacing[32],
    borderRadius: borderRadius.medium,
    width: '100%',
  },
  quoteText: {
    fontSize: typography.bodyLarge.size,
    fontStyle: 'italic',
    color: colorSystem.base.black,
    lineHeight: typography.bodyLarge.size * (typography.bodyLarge.lineHeight || 1.5),
    marginBottom: spacing[16],
    textAlign: 'center',
  },
  quoteAttribution: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    textAlign: 'right',
    fontWeight: typography.fontWeight.medium,
  },
  educationalMessage: {
    fontSize: typography.bodyRegular.size,
    color: semantic.text.primary,
    textAlign: 'center',
    lineHeight: typography.bodyRegular.size * (typography.bodyRegular.lineHeight || 1.5),
    marginBottom: spacing[32],
    paddingHorizontal: spacing[16],
  },
  buttonContainer: {
    width: '100%',
    gap: spacing[16],
  },
  primaryButton: {
    backgroundColor: colorSystem.navigation.learn,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG touch target
  },
  primaryButtonPressed: {
    backgroundColor: colorSystem.navigation.learn + 'DD', // Slightly darker
    transform: [{ scale: 0.98 }],
  },
  primaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  primaryButtonTextPressed: {
    opacity: 0.9,
  },
  secondaryButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colorSystem.gray[400],
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
    minHeight: 48, // WCAG touch target
  },
  secondaryButtonPressed: {
    backgroundColor: colorSystem.gray[100],
    borderColor: semantic.text.muted,
  },
  secondaryButtonText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.black,
  },
  secondaryButtonTextPressed: {
    color: semantic.text.secondary,
  },
});

export default PracticeCompletionScreen;
