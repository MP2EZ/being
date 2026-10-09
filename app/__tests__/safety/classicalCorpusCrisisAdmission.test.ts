/**
 * Classical corpus crisis admission (FEAT-581)
 *
 * The authors the Classical Library quotes held that a person may leave life
 * by choice — the Stoic "open door". It is not confined to chapters a curator
 * would avoid: it sits three-quarters through Discourses 1.24, at the end of
 * Meditations 8.47, inside Discourses 1.9 — chapters otherwise worth quoting.
 * Discourses 3.20 is a de facto exit chapter too (FEAT-662): one sentence past a
 * passage on gaining even by sickness, Menoeceus is "a Gainer by Dying".
 * Readers of this corpus include people screening at PHQ-9 >= 15 or Q9 > 0.
 *
 * `crisis` ruled the admission rule at FEAT-581, and ruled it REQUIRED rather
 * than advisory:
 *   - SPAN-LEVEL, over every rendered field — `text`, `fullText` AND `context`.
 *     `fullText` is one tap from `text` and reaches the same reader; `context`
 *     is our own voice and may not point at omitted exit material either.
 *   - Whole chapters are NOT banned. A span from an exit chapter passes only if
 *     it has no BANNED hit, is not a premise the omitted exit line answers, and
 *     its note neither points at the omission nor discusses Stoic views on
 *     suicide. Only the first of those is mechanical; the other two are a
 *     `crisis` co-review, which is why `app/assets/passages/` is a Protected Path.
 *   - BANNED fails with no allowlist. REVIEW fails unless the {id, field, term}
 *     is allowlisted below with the ruling that cleared it.
 *
 * Beyond exit phrasing, BANNED carries three abuse-tolerance spans `crisis`
 * rejected outright: Enchiridion 30's father clause (a possibly-minor reader
 * told to submit to a bad father's "Correction"), "will not hurt you, unless
 * you please" (victim-blaming once attached to a named wrongdoer), and
 * Enchiridion 28's "delivered up your Body" — a list preview that opens on it
 * reads, to a survivor of trafficking or sexual abuse, as their own history.
 * Hecato's "Cease to hope" (Letters 5.7) is banned because hopelessness is a
 * stronger predictor of suicide than severity.
 *
 * CONTROLS ARE SOURCE TEXT, NOT MEMORY. Every BANNED pattern is proven to still
 * fire against a sentence copied from the translation it guards (DEBUG-390). The
 * first draft of these patterns was written from memory, and checking them
 * against the sources found a live miss: Carter 1.9 reads "dismiss you from this
 * Service", which a release-only pattern never matches. Sources: Long, PG #15877;
 * Carter 1759, Wikisource "All the Works of Epictetus"; Gummere, Wikisource
 * "Moral letters to Lucilius"; Stewart, PG #64576 "Minor Dialogues". A pattern
 * with no exit-sense instance in any of them carries a literal fixture, marked.
 *
 * LOCATION: `app/__tests__/safety/`, so it runs in `test:safety` — precommit and
 * the `Safety + privacy gates` CI job — rather than beside the provenance suite
 * in `unit/`. This is a crisis control, not a provenance one.
 */

import { readFileSync } from 'fs';
import { join, resolve } from 'path';

const PASSAGES_DIR = resolve(__dirname, '../../assets/passages');
const MODULES_DIR = resolve(__dirname, '../../assets/modules');

const PASSAGE_FILES = [
  'passages-1-aware-presence.json',
  'passages-2-radical-acceptance.json',
  'passages-3-sphere-sovereignty.json',
  'passages-4-virtuous-response.json',
  'passages-5-interconnected-living.json',
];

const MODULE_FILES = [
  'module-1-aware-presence.json',
  'module-2-radical-acceptance.json',
  'module-3-sphere-sovereignty.json',
  'module-4-virtuous-response.json',
  'module-5-interconnected-living.json',
];

const PASSAGE_FIELDS = ['text', 'fullText', 'context'] as const;

interface Rendered {
  /** Passage id, or the module file for a classicalQuote. */
  id: string;
  field: string;
  value: string;
}

const normalise = (s: string): string => s.replace(/\s+/g, ' ').trim();

const renderedStrings = (): Rendered[] => {
  const out: Rendered[] = [];
  for (const file of PASSAGE_FILES) {
    const passages = JSON.parse(readFileSync(join(PASSAGES_DIR, file), 'utf8')).passages ?? [];
    for (const p of passages) {
      for (const field of PASSAGE_FIELDS) {
        if (typeof p[field] === 'string') out.push({ id: p.id, field, value: normalise(p[field]) });
      }
    }
  }
  for (const file of MODULE_FILES) {
    const quote = JSON.parse(readFileSync(join(MODULES_DIR, file), 'utf8'))?.classicalQuote ?? {};
    for (const [field, value] of Object.entries(quote)) {
      if (typeof value === 'string') out.push({ id: file, field: `classicalQuote.${field}`, value: normalise(value) });
    }
  }
  return out;
};

/** A match fails the suite. No allowlist. */
const BANNED: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ['door is open', /\bdoors?\s+(is|are|stands?|lies|being)\s+(now\s+)?open\b/i],
  ['open door', /\bopen\s+doors?\b/i],
  [
    'exit from life',
    /\b(depart\w*|go(ne|ing|es)?\s+(out|away|forth)|went\s+(out|away)|quit\w*|leav(e|es|ing)|withdraw\w*|retir\w*|get\s+away|exit\w*|releas\w*|flee|fled|escap\w*)\b(\W+\w+){0,3}?\W+(out\s+)?(of|from)\s+(this\s+)?(life|the\s+world|the\s+body)\b/i,
  ],
  ['quit life', /\b(quit|leave|leaving|quitting)\s+(this\s+)?(life|the\s+world)\b/i],
  ['take thy departure', /\btake\s+(thy|your|his|my)\s+departure\b/i],
  ['way to freedom', /\b(way|ways|paths?|roads?)\s+(out|to\s+(freedom|liberty))\b(?!\s+of\s+(this|the|a)\s+(difficult|trouble))/i],
  ['leads to liberty', /\bleads?\s+(down\s+)?to\s+(liberty|freedom)\b/i],
  ['by his own hand', /\b(die[ds]?|dying|death|perish\w*|kill\w*|slay\w*|slew)\b(\W+\w+){0,3}?\W+(by|with)\s+\w+\s+own\s+hands?\b/i],
  ['kill oneself', /\b(kill\w*|slay\w*|slew|destroy\w*|hang\w*|drown\w*)\s+(him|her|them|thy|your|my|one|our)sel(f|ves)\b/i],
  ['suicide', /\bsuicid\w*|\bself-(murder|destruct\w*|slaughter)\b/i],
  ['open a vein', /\b(open\w*|cut\w*|sever\w*)\s+(a|the|his|her|thy|your|my)?\s*veins?\b/i],
  ['vein / noose / halter', /\bnoose\b|\bhalter\b|\bveins?\b/i],
  ['play no longer', /\bplay\s+no\s+(longer|more)\b/i],
  ['smoky house', /\b(house|room|chamber)\b[^.;]{0,40}\bsmok(e|y)\b|\bsmok(e|y)\b[^.;]{0,40}\b(house|room|chamber)\b/i],
  ['signal of retreat', /\b(signal|sound\w*)\s+(of\s+|for\s+|a\s+|the\s+)*retreat\b/i],
  ['not worth living', /\b(not|no\s+longer|never)\s+worth\s+(while\s+)?(to\s+)?liv(e|ing)\b/i],
  ['weary of life', /\b(weary|tired|sick)\s+of\s+(life|living)\b|\b(lust|longing|desire|passion)\s+(for|of|after)\s+death\b/i],
  ['dismissed from service', /\b(releas|dismiss)\w*\s+(you|thee|me|us|him|her)\s+from\s+(this\s+)?(service|post|station|life|the\s+body)\b/i],
  ['cease to hope', /\b(cease|give\s+up|abandon|lay\s+aside|put\s+away)\s+(all\s+)?(to\s+)?hop(e|ing)\b/i],
  ['submit in all things', /\bsubmit\w*\s+to\s+(him|her|them)\s+in\s+all\s+things\b/i],
  ['patiently receive correction', /\bpatiently\s+receiv\w*\s+(his|her|their)\s+(reproaches|correction|blows)\b/i],
  ['not hurt unless you please', /\bwill\s+not\s+hurt\s+you,?\s+unless\s+you\s+please\b|\bhurt,?\s+when\s+you\s+think\s+you\s+are\s+hurt\b/i],
  ['delivered up your body', /\bdeliver\w*\s+up\s+(your|thy|his|her)\s+body\b/i],
  // FEAT-661: Long's Med. 4.50 follows the admitted 4.49, and "not worth living"
  // misses every phrasing of the sentiment in the four translations.
  [
    'life without value',
    /\b(consider|count|reckon|deem|hold)\w*\s+life\s+(to\s+be\s+)?(a\s+thing\s+)?of\s+(any|no|little|small)\s+(value|worth|account)\b|\blife\s+(is\s+)?worth\s+having\b/i,
  ],
  // FEAT-662: three Carter 3.20 lines the tables missed, found at co-review.
  ['gain by death', /\bgain\w*\W+(even\s+)?by\s+(death|dying)\b/i],
  ['disparaged love of life', /\b(wretched|base|mean|slavish|cowardly|shameful|vile)\s+love\s+of\s+life\b/i],
  // The Ench. 30 father-clause class, in 3.20's wording.
  ['bad to himself, not to me', /\bto\s+himself\W+but\s+(not\s+to\s+me|a\s+good\s+one,?\s+to\s+me)\b/i],
  // FEAT-663: the part/whole body frame's next Stoic move is that the part is cut
  // off, or dies, for the whole — perceived burdensomeness. Carter 2.5 and 2.10.
  ['cut off for the whole', /\bcut\s*off\b[^.;:]{0,30}\b(good|sake|account)\s+of\s+(the|that)\s+whole\b/i],
  ['die before your time', /\bdie\s+before\s+(your|thy|his|her|my|our|their)\s+time\b/i],
  ['help forward death', /\bhelp\w*\s+forward\b[^.;]{0,40}\b(death|dying|mutilation)\b/i],
];

/** A match fails unless allowlisted with a ruling. Common in non-exit senses. */
const REVIEW: ReadonlyArray<readonly [label: string, pattern: RegExp]> = [
  ['depart', /\bdepart\w*\b/i],
  ['death / mortal', /\b(die[ds]?|dying|death|dead|deaths?|mortal\w*)\b/i],
  ['last hour', /\blast\s+hour\b/i],
  ['grave', /\bgrave\b/i],
  ['go out / away / before', /\bgo(ne|es|ing)?\s+(out|away|before)\b|\bwent\s+(out|away|before)\b/i],
  ['exit', /\bexit\b/i],
  ['way out', /\bway\s+out\b/i],
  ['own hand', /\bown\s+hands?\b/i],
  ['means', /\b(sword|dagger|knife|blade|poison\w*|hemlock|throat|precipice)\b/i],
  ['Cato', /\bCato\b/i],
  // Both word orders (FEAT-662): Carter writes "Is my Father bad?", which the
  // adjective-first form never matched. FEAT-663 adds verb + adverb: Ench. 43's
  // "If your Brother acts unjustly" passed the tier silently.
  [
    'bad relation',
    /\b(bad|unjust|cruel)\s+(father|mother|parent|husband|wife|brother|sister|neighbou?r)\b|\b(father|mother|parent|husband|wife|brother|sister|neighbou?r)\s+(is\s+|be\s+)?(so\s+)?(a\s+|an\s+)?(bad|unjust|cruel)\b|\b(father|mother|parent|husband|wife|brother|sister|neighbou?r)\s+(acts?|behaves?|deals?|treats?\s+(you|thee)|uses?\s+(you|thee))\s+(so\s+|very\s+)?(unjustly|badly|cruelly|ill)\b/i,
  ],
  ['rejoin the dead', /\b(join|follow|rejoin)\w*\s+(him|her|them)\b/i],
  // In this corpus "door" carries the open-door doctrine even when idiomatic
  // ("one door closes… stays open" was struck from a FEAT-581 note for it).
  ['door', /\bdoors?\b/i],
  // FEAT-662: Carter 3.20 sets life itself against the exit ("a wretched Love of Life").
  ['love of life', /\blove\s+of\s+life\b/i],
];

/**
 * REVIEW controls (FEAT-662). REVIEW rows had none, so a narrowed pattern could
 * stop matching with nothing going red. Each fixture is source text.
 */
const REVIEW_CONTROLS: ReadonlyArray<readonly [label: string, fixture: string]> = [
  ['bad relation', 'Is my Father bad?'], // Carter, Disc. 3.20
  ['bad relation', 'Is my Neighbour a bad one?'], // Carter, Disc. 3.20
  ['bad relation', 'But he is a bad Father.'], // Carter, Ench. 30
  ['bad relation', 'Is a Brother unjust?'], // Carter, Ench. 30
  ['bad relation', 'If your Brother acts unjustly'], // Carter, Ench. 43
  ['love of life', 'and a wretched Love of Life, have been his Portion?'], // Carter, Disc. 3.20
];

/**
 * REVIEW hits cleared by a `crisis` ruling. `term` is the matched text,
 * lowercased. An entry that no longer matches must be REMOVED — a stale entry
 * silently pre-clears whatever lands there next.
 */
const REVIEW_CLEARED: ReadonlyArray<{ id: string; field: string; term: string; ruling: string }> = [
  // "Death" as the Handbook's own example of a judgement ("Death, for Instance,
  // is not terrible") — an argument against dread, not exit.
  { id: 'epictetus-enchiridion-5', field: 'text', term: 'death', ruling: 'FEAT-581' },
  // "the last hour" — mortality as a spur to attention, no exit framing.
  { id: 'marcus-meditations-7-29', field: 'text', term: 'last hour', ruling: 'FEAT-581' },
  // "your friend Flaccus is dead" — the bereavement the letter answers. Whole
  // 63.1 only: no exit or reunion framing, and it ends before 63.2's one-day quota.
  { id: 'seneca-letters-63', field: 'text', term: 'dead', ruling: 'FEAT-661' },
  // "breathes, lives, and dies" — shared mortality IS the kinship argument (aeque
  // mori). First two sentences of 47.10 only, no fullText, no exit framing.
  { id: 'seneca-letters-47', field: 'text', term: 'dies', ruling: 'FEAT-663' },
  // The wrong Ench. 43 asks us to hold by the handle of kinship. Text only: a note
  // that echoes the phrase fails, and the note carries the harm clause.
  { id: 'epictetus-enchiridion-43', field: 'text', term: 'brother acts unjustly', ruling: 'FEAT-663' },
];

/**
 * Positive controls — each BANNED pattern against the source sentence it
 * exists for. A literal fixture replaces a source only where none of the four
 * translations has an exit-sense instance, and says so.
 */
const CONTROLS: ReadonlyArray<readonly [label: string, fixture: string]> = [
  ['door is open', 'But, remember the principal thing; That the Door is open.'], // Carter, Disc. 1.24
  ['open door', 'Remember that the open door is always there.'], // literal: no exit-sense instance in the sources
  ['exit from life', 'depart at once from life, not in passion, but with simplicity'], // Long, Med. 10.8
  ['quit life', 'or reason bids me dismiss it, I will quit this life'], // Stewart
  ['take thy departure', 'Take thy departure then from life contentedly'], // Long, Med. 8.47
  ['way to freedom', 'Cato has a way out of it: with one hand he will open a wide path to freedom;'], // Stewart
  ['leads to liberty', 'do you ask what path leads to liberty?'], // Stewart
  ['by his own hand', 'in which a man should die by his own hand'], // Long's introduction
  ['kill oneself', 'He assisted Nero in killing himself;'], // Carter's note, Disc. 1.1
  ['suicide', 'Ajax was driven mad by anger, and driven to suicide by madness.'], // Stewart
  ['open a vein', "Seneca's own death, by opening his veins, gives a melancholy interest to this passage"], // Stewart's note
  ['vein / noose / halter', 'the current of his veins gradually stopped'], // Stewart
  ['play no longer', '"I will play no longer'], // Carter, Disc. 1.24
  ['smoky house', 'The house is smoky, and I quit it.'], // Long, Med. 5.29
  ['smoky house', 'Is the House in a Smoke?'], // Carter, Disc. 1.25
  ['signal of retreat', 'But, if he sounds a Retreat, as he did to Socrates, we are to obey him'], // Carter, Disc. 1.29
  ['not worth living', 'But it is not worth while to live, if this cannot be done.'], // Long, Med. 8.47
  ['weary of life', 'the lust for death.'], // Gummere, Ep. 24
  ['weary of life', 'because you are tired of life'], // Gummere, Ep. 24
  ['dismissed from service', 'till he shall give the Signal, and dismiss you from this Service'], // Carter, Disc. 1.9
  ['cease to hope', '“Cease to hope,” he says, “and you will cease to fear.'], // Gummere, Ep. 5.7
  ['submit in all things', 'submitting to him in all Things;'], // Carter, Ench. 30
  ['patiently receive correction', 'patiently receiving his Reproaches, his Correction.'], // Carter, Ench. 30
  ['not hurt unless you please', 'For another will not hurt you, unless you please.'], // Carter, Ench. 30
  ['not hurt unless you please', 'You will then be hurt, when you think you are hurt.'], // Carter, Ench. 30
  ['delivered up your body', 'If a Person had delivered up your Body to any one, whom he met in his Way'], // Carter, Ench. 28
  ['life without value', 'Do not then consider life a thing of any value.'], // Long, Med. 4.50
  ['life without value', 'Is life worth having, if so many must perish to prevent my losing it?'], // Stewart, On Clemency 1.9
  ['life without value', 'Whether life is worth having at such a price, we shall see hereafter;'], // Stewart, On Anger 3.15
  ['gain by death', 'Do you think Menœceus an inconsiderable Gainer by Death?'], // Carter, Disc. 3.20
  ['gain by death', 'do not you think him a considerable Gainer, by dying?'], // Carter, Disc. 3.20
  ['disparaged love of life', 'and a wretched Love of Life, have been his Portion?'], // Carter, Disc. 3.20
  ['bad to himself, not to me', 'Is my Father bad? To himself; but not to me.'], // Carter, Disc. 3.20
  ['bad to himself, not to me', 'He is so, to himself; but a good one, to me.'], // Carter, Disc. 3.20
  ['cut off for the whole', 'and sometimes that it should even be cut off, for the Good of the Whole: otherwise it is no longer a Foot.'], // Carter, Disc. 2.5
  ['die before your time', 'sometimes be in Want; and possibly it may happen, die before your Time.'], // Carter, Disc. 2.5
  ['help forward death', 'he would help forward Sickness, and Death, and Mutilation, to himself;'], // Carter, Disc. 2.10
];

/**
 * EVERY match per pattern, deduped by term (FEAT-662). A first-match-only scan let
 * one cleared term hide every later term of the same pattern in that field, so a
 * clearance for "dying" silently admitted a "die" beside it.
 */
const hits = (patterns: typeof BANNED, value: string) =>
  patterns.flatMap(([label, pattern]) => {
    const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    const terms = new Set([...value.matchAll(global)].map((m) => m[0].toLowerCase()));
    return [...terms].map((term) => ({ label, term }));
  });

const isCleared = (r: Rendered, term: string) =>
  REVIEW_CLEARED.some((c) => c.id === r.id && c.field === r.field && c.term === term);

describe('classical corpus crisis admission (FEAT-581)', () => {
  it('reads every rendered field it claims to (non-vacuity)', () => {
    const rendered = renderedStrings();
    // Every passage renders `text`; every module renders a quote. A scan over
    // an empty set would pass every assertion below vacuously. Floors track the
    // corpus (40 at FEAT-663), so a dropped file cannot pass quietly.
    expect(rendered.filter((r) => r.field === 'text').length).toBeGreaterThanOrEqual(40);
    expect(rendered.filter((r) => r.field === 'context').length).toBeGreaterThanOrEqual(40);
    // Per file as well: growth elsewhere must not hide a dropped passage in a slice's file.
    const virtuous = JSON.parse(readFileSync(join(PASSAGES_DIR, 'passages-4-virtuous-response.json'), 'utf8')).passages;
    expect(virtuous.length).toBeGreaterThanOrEqual(8);
    const interconnected = JSON.parse(readFileSync(join(PASSAGES_DIR, 'passages-5-interconnected-living.json'), 'utf8')).passages;
    expect(interconnected.length).toBeGreaterThanOrEqual(9);
    expect(rendered.filter((r) => r.field === 'classicalQuote.text').length).toBe(MODULE_FILES.length);
  });

  it('no rendered string carries BANNED phrasing', () => {
    const violations = renderedStrings().flatMap((r) =>
      hits(BANNED, r.value).map((h) => `${r.id}:${r.field} — ${h.label} ("${h.term}")`),
    );
    expect(violations).toEqual([]);
  });

  it('every REVIEW-tier hit carries a crisis ruling', () => {
    const uncleared = renderedStrings().flatMap((r) =>
      hits(REVIEW, r.value)
        .filter((h) => !isCleared(r, h.term))
        .map((h) => `${r.id}:${r.field} — ${h.label} ("${h.term}")`),
    );
    expect(uncleared).toEqual([]);
  });

  it('no REVIEW clearance is stale', () => {
    const rendered = renderedStrings();
    const stale = REVIEW_CLEARED.filter(
      (c) =>
        !rendered.some(
          (r) => r.id === c.id && r.field === c.field && hits(REVIEW, r.value).some((h) => h.term === c.term),
        ),
    ).map((c) => `${c.id}:${c.field} — "${c.term}"`);
    expect(stale).toEqual([]);
  });

  it.each(CONTROLS)('BANNED "%s" still fires on its source (DEBUG-390)', (label, fixture) => {
    expect(hits(BANNED, normalise(fixture)).map((h) => h.label)).toContain(label);
  });

  it.each(REVIEW_CONTROLS)('REVIEW "%s" still fires on its source (DEBUG-390)', (label, fixture) => {
    expect(hits(REVIEW, normalise(fixture)).map((h) => h.label)).toContain(label);
  });

  it('hits() reports every term of a pattern, not just the first (DEBUG-390)', () => {
    // Carter 3.20: one field, two terms of the same REVIEW pattern.
    const terms = hits(REVIEW, 'a considerable Gainer, by dying? Why: did not he die at last?')
      .filter((h) => h.label === 'death / mortal')
      .map((h) => h.term);
    expect(terms.sort()).toEqual(['die', 'dying']);
  });

  it('every BANNED pattern has a control', () => {
    // The table above is the only proof a pattern still fires. A pattern added
    // without one is unproven, which is the DEBUG-390 failure exactly.
    const controlled = new Set(CONTROLS.map(([label]) => label));
    expect(BANNED.map(([label]) => label).filter((l) => !controlled.has(l))).toEqual([]);
  });

  /**
   * FEAT-660 span rulings (crisis co-review). Each pins a boundary the pattern
   * tables cannot see, because the hazard is an OMITTED line or a word that is
   * only dangerous in this corpus's preview position.
   */
  describe('FEAT-660 aware-presence boundaries', () => {
    const fieldsOf = (id: string) => renderedStrings().filter((r) => r.id === id);
    const textOf = (id: string) => {
      const r = fieldsOf(id).find((x) => x.field === 'text');
      if (!r) throw new Error(`${id} has no rendered text`);
      return r.value;
    };

    it('Letters 5 is 5.9 alone — nothing that leans on the banned 5.7 maxim', () => {
      // 5.8's "both these ills" has hope and fear as its antecedent, so the span
      // was a premise the omitted "Cease to hope" answers (ruling condition b).
      expect(textOf('seneca-letters-5').startsWith('Beasts avoid')).toBe(true);
      for (const r of fieldsOf('seneca-letters-5')) {
        expect({ field: r.field, hit: r.value.match(/both these ills|\bhop(e|ing)\b/i) }).toEqual({
          field: r.field,
          hit: null,
        });
      }
    });

    it('On Anger 2.4 may end on "beyond our control" only while its full chapter resolves it', () => {
      const full = fieldsOf('seneca-on-anger-2-4').find((r) => r.field === 'fullText');
      expect(full?.value.endsWith('deliberate mental act.')).toBe(true);
    });

    it('Shortness 9 keeps "insane" out of the list preview', () => {
      expect(textOf('seneca-on-the-shortness-of-life-9')).not.toMatch(/\binsane\b/i);
    });

    it('Disc. 4.12 stops before a lapse is called unrecoverable', () => {
      // textOf throws on a missing id, so the loop below cannot pass over nothing.
      expect(textOf('epictetus-discourses-4-12').length).toBeGreaterThan(0);
      for (const r of fieldsOf('epictetus-discourses-4-12')) {
        expect(r.value).not.toMatch(/no longer in your Power/i);
      }
    });

    // Notes on holding a wrong carry every arm of the harm clause. Keyword
    // checks, not an exact sentence, so the clause can be phrased to its passage.
    const HARM_CLAUSE_REQUIRED = [
      'marcus-meditations-6-50',
      'seneca-on-anger-2-4',
      // FEAT-661: standing firm, a narrowed room, and enduring Chance.
      'marcus-meditations-4-49',
      'seneca-on-tranquility-10',
      'seneca-letters-16',
      // FEAT-662: patience with ill-language, and a God-sent "rough Antagonist".
      'epictetus-enchiridion-10',
      'epictetus-discourses-1-24',
      // FEAT-663: holding a brother's wrong by the handle of kinship, and "bear with
      // your own Brother", which the weaker party can hear as counsel to endure.
      'epictetus-enchiridion-43',
      'epictetus-discourses-1-13',
    ];

    it.each(HARM_CLAUSE_REQUIRED)('%s carries the harm clause', (id) => {
      const note = fieldsOf(id).find((r) => r.field === 'context')?.value ?? '';
      expect(note).toMatch(/\bharm\b/);
      expect(note).toMatch(/\blimits\b/);
      expect(note).toMatch(/\bhelp\b/);
    });

    it('the boundary matchers still fire (DEBUG-390)', () => {
      // Literal fixtures from the excluded source text, never corpus state.
      expect('But the chief cause of both these ills').toMatch(/both these ills|\bhop(e|ing)\b/i);
      expect('Cease to hope').toMatch(/both these ills|\bhop(e|ing)\b/i);
      expect('Can anything be mentioned which is more insane').toMatch(/\binsane\b/i);
      expect('it is no longer in your Power to call it back').toMatch(/no longer in your Power/i);
      expect('A reason to endure it.').not.toMatch(/\blimits\b/);
    });
  });

  /**
   * FEAT-661 span rulings (crisis co-review). Each pins an omitted neighbour the
   * pattern tables cannot see: 63.2's quota, 4.49's closing verdict, 8.50's
   * "useless" returning to nature, Tranquility 10's chains, and 16.6's fated chain.
   */
  describe('FEAT-661 radical-acceptance boundaries', () => {
    const fieldsOf = (id: string) => renderedStrings().filter((r) => r.id === id);
    const fieldOf = (id: string, field: string) => fieldsOf(id).find((r) => r.field === field)?.value;
    const textOf = (id: string) => {
      const v = fieldOf(id, 'text');
      if (!v) throw new Error(`${id} has no rendered text`);
      return v;
    };
    const noneMatch = (id: string, pattern: RegExp) => {
      for (const r of fieldsOf(id)) {
        expect({ id, field: r.field, hit: r.value.match(pattern) }).toEqual({ id, field: r.field, hit: null });
      }
    };

    const GRIEF_QUOTA = /\bone day\b|\bNiobe\b|\bsent on ahead\b|\blimit for mourning\b|\breplace your friend\b|\bas soon as possible\b/i;
    const GRIEF_NOTE = /timetable|timeline|deadline|quota|988|crisis|hotline|helpline|lifeline|seek help/i;
    const VERDICT_449 = /bear it nobly|not that this is a misfortune|contempt of death|any value/i;
    const RECYCLED_850 = /\buseless\b|\bdecay/i;
    const TRAPPED_T10 = /\bsnare\b|\bfetter|\bchain|\bslavery\b|\bhabitable\b|empty within|locked up/i;
    const FATED_166 = /chain of fated events|play the tyrant|drags us along/i;

    it('Letters 63 is whole 63.1 — tears affirmed, no quota, no reunion, no resource line', () => {
      expect(textOf('seneca-letters-63').endsWith('We may weep, but we must not wail.')).toBe(true);
      expect(textOf('seneca-letters-63')).toContain('Let not the eyes be dry');
      expect(fieldOf('seneca-letters-63', 'fullText')).toBeUndefined();
      noneMatch('seneca-letters-63', GRIEF_QUOTA);
      expect(fieldOf('seneca-letters-63', 'context')).not.toMatch(GRIEF_NOTE);
    });

    it('Letters 63 is never the auto-expanded first card', () => {
      // FromTheSourceSection expands the first passage by order, which would push a
      // bereavement letter, unasked, at every reader of the module.
      const ps = JSON.parse(readFileSync(join(PASSAGES_DIR, 'passages-2-radical-acceptance.json'), 'utf8')).passages;
      const first = [...ps].sort((a: { order: number }, b: { order: number }) => a.order - b.order)[0];
      expect(first.id).not.toBe('seneca-letters-63');
    });

    it('Meditations 4.49 stops at the virtue question', () => {
      expect(textOf('marcus-meditations-4-49').endsWith('obtains all that is its own?')).toBe(true);
      noneMatch('marcus-meditations-4-49', VERDICT_449);
    });

    it('Meditations 8.50 stops before nature reclaims the useless', () => {
      expect(textOf('marcus-meditations-8-50').endsWith('from the things which they make.')).toBe(true);
      expect(fieldOf('marcus-meditations-8-50', 'fullText')).toBeUndefined();
      noneMatch('marcus-meditations-8-50', RECYCLED_850);
    });

    it('Tranquility 10 opens on good sense, never on the chapter\'s chains', () => {
      expect(textOf('seneca-on-tranquility-10').startsWith('Call good sense')).toBe(true);
      noneMatch('seneca-on-tranquility-10', TRAPPED_T10);
    });

    it('Letters 16 renders the objection only with its answer, and stops before 16.6', () => {
      const full = fieldOf('seneca-letters-16', 'fullText');
      expect(full?.startsWith('Perhaps someone will say')).toBe(true);
      expect(full?.endsWith(textOf('seneca-letters-16'))).toBe(true);
      noneMatch('seneca-letters-16', FATED_166);
    });

    it('the FEAT-661 boundary matchers still fire (DEBUG-390)', () => {
      // Source-literal fixtures from the excluded neighbours, never corpus state.
      expect('allowed the privilege of weeping to one day only').toMatch(GRIEF_QUOTA); // Gummere, Ep. 63.2
      expect('he whom we think we have lost has only been sent on ahead').toMatch(GRIEF_QUOTA); // Gummere, Ep. 63.16
      expect('In this passage he sets no timetable for grief.').toMatch(GRIEF_NOTE); // the rejected draft note
      expect('not that this is a misfortune, but that to bear it nobly is good fortune').toMatch(VERDICT_449); // Long, Med. 4.49
      expect('everything within her which appears to decay and to grow old and to be useless').toMatch(RECYCLED_850); // Long, Med. 8.50
      expect('All life is slavery: let each man therefore reconcile himself to his lot').toMatch(TRAPPED_T10); // Stewart, Tranq. 10
      expect('if a chain of fated events drags us along in its clutches').toMatch(FATED_166); // Gummere, Ep. 16.6
    });
  });

  /**
   * FEAT-662 span rulings (crisis co-review). Each close stops one step before an
   * omitted line the pattern tables cannot fully see: 3.20's "Gainer by Dying",
   * 1.24's "remember the principal thing", 2.18's lapse-as-verdict sequence.
   */
  describe('FEAT-662 virtuous-response boundaries', () => {
    const fieldsOf = (id: string) => renderedStrings().filter((r) => r.id === id);
    const textOf = (id: string) => {
      const r = fieldsOf(id).find((x) => x.field === 'text');
      if (!r) throw new Error(`${id} has no rendered text`);
      return r.value;
    };

    const BOUNDARIES: ReadonlyArray<readonly [id: string, close: string, omitted: RegExp]> = [
      ['epictetus-discourses-3-20', 'a wrong one, an Evil.', /\bgain\w*|Men(œ|oe)ceus|love of life|Admetus/i],
      ['epictetus-discourses-1-24', 'it cannot be without Toil.', /principal thing|advantageous Difficulty/i],
      ['epictetus-discourses-2-18', 'habituate yourself to something else.', /Operations of the Soul|former State|callous|single Defeat|weak and wretched/i],
    ];

    it.each(BOUNDARIES)('%s stops at its ruled close and carries none of the omitted lines', (id, close, omitted) => {
      expect(textOf(id).endsWith(close)).toBe(true);
      for (const r of fieldsOf(id)) {
        expect({ field: r.field, hit: r.value.match(omitted) }).toEqual({ field: r.field, hit: null });
      }
    });

    it('3.20 and 1.24 carry no fullText (a chapter would reach the exit material)', () => {
      for (const id of ['epictetus-discourses-3-20', 'epictetus-discourses-1-24']) {
        expect(fieldsOf(id).some((r) => r.field === 'fullText')).toBe(false);
      }
    });

    it('the FEAT-662 boundary matchers still fire (DEBUG-390)', () => {
      // Carter source text from the omitted neighbours, never corpus state.
      const [[, , g320], [, , g124], [, , g218]] = BOUNDARIES;
      expect('So that, in truth, it is possible to be a Gainer, even by Sickness.').toMatch(g320);
      expect('Do you think Menœceus an inconsiderable Gainer by Death?').toMatch(g320);
      expect('and a wretched Love of Life, have been his Portion?').toMatch(g320);
      expect('But, remember the principal thing; That the Door is open.').toMatch(g124);
      expect('No Man, in my Opinion, has a more advantageous Difficulty on his Hands than you have').toMatch(g124);
      expect('It is the same with regard to the Operations of the Soul.').toMatch(g218);
      expect('if you apply no Remedy, it returns no more to its former State').toMatch(g218);
      expect('you will at last be reduced to so weak and wretched a Condition').toMatch(g218);
    });
  });

  /**
   * FEAT-663 span rulings (crisis co-review). Each close stops one step before an
   * omitted line the pattern tables cannot see: On Anger's vipers and punishment
   * turn, 47.10's reversal-of-fortune tail, 95.52's "more wretched to commit than to
   * suffer injury", and 1.13's "Right of Purchase" exchange.
   */
  describe('FEAT-663 interconnected-living boundaries', () => {
    const fieldsOf = (id: string) => renderedStrings().filter((r) => r.id === id);
    const textOf = (id: string) => {
      const r = fieldsOf(id).find((x) => x.field === 'text');
      if (!r) throw new Error(`${id} has no rendered text`);
      return r.value;
    };

    // Each [id, opening, close, omitted]: the omitted pattern covers the excluded
    // head as well as the tail where the neighbour is a hazard.
    const BOUNDARIES: ReadonlyArray<readonly [id: string, opening: string, close: string, omitted: RegExp]> = [
      // Head: hypervigilance ("mischief is not absent, but only asleep"), a GAD-7
      // hazard. Tail: the vipers, and "no one would escape punishment".
      [
        'seneca-on-anger-2-31',
        'What, if the hands were to wish to hurt the feet?',
        'guards and loves all its members.',
        /\bvipers?\b|water-snakes?|\bpunish\w*|done wrong|offend you|mischief|expect everything/i,
      ],
      // Tail: mass violence, then a fall-in-status threat aimed at "you".
      [
        'seneca-letters-47',
        'Kindly remember that he whom you call your slave',
        'see in you a slave.',
        /massacre|Marius|humbled|despis\w*|\bdescend\b/i,
      ],
      // Tail: ranks a harm the reader suffers as the lesser evil.
      ['seneca-letters-95', 'Then comes the second problem', 'made us prone to friendships.', /more wretched|suffer\w*\s+injur\w*/i],
      // Head: moralised eating in the list preview (a PHQ-9 appetite item). Tail: the
      // slaveholder's retort and the "Laws of dead Men".
      [
        'epictetus-discourses-1-13',
        'And when you call for hot Water',
        'the Offspring of God?',
        /\beat(s|ing)?\b|temperately|Right of Purchase|Earth and Mire|dead Men/i,
      ],
      // Head: Ench. 42's "meekly bear a Person who reviles you" is victim-minimising.
      [
        'epictetus-enchiridion-43',
        'Every Thing hath two Handles',
        'as it is to be borne.',
        /meekly bear|reviles|Person hurt|seemed so to him/i,
      ],
    ];

    it.each(BOUNDARIES)('%s opens and closes at its ruled bounds, carrying none of the omitted lines', (id, opening, close, omitted) => {
      expect(textOf(id).startsWith(opening)).toBe(true);
      expect(textOf(id).endsWith(close)).toBe(true);
      for (const r of fieldsOf(id)) {
        expect({ field: r.field, hit: r.value.match(omitted) }).toEqual({ field: r.field, hit: null });
      }
    });

    it('none of the five carries a fullText (a fuller span would reach the omitted lines)', () => {
      for (const [id] of BOUNDARIES) {
        expect({ id, fullText: fieldsOf(id).some((r) => r.field === 'fullText') }).toEqual({ id, fullText: false });
      }
    });

    const noteOf = (id: string) => {
      const r = fieldsOf(id).find((x) => x.field === 'context');
      if (!r) throw new Error(`${id} has no context note`);
      return r.value;
    };

    // No forgive / reconcile / tolerate prescription on a note about a relative's
    // wrong. Bare "stay" is NOT banned: the harm clause itself says "staying in".
    const NOTE_PRESCRIPTION =
      /\bforgiv\w*|\breconcil\w*|\btolerat\w*|\bput\s+up\s+with\b|\bkeep\s+the\s+peace\b|\bfamily\s+first\b|\bstay\s+(close|with|together)\b|\b(he|she|they)('s|\s+is|\s+are)\s+(still\s+)?family\b/i;
    const BURDEN_FRAME = /\bthe whole\b|\bsacrific\w*|\bexpendab\w*|\bburden\w*/i;

    it('On Anger 2.31\'s note never frames the passage as a response to being wronged', () => {
      // The waiver of the harm clause holds only while the note stays on not hurting others.
      expect(noteOf('seneca-on-anger-2-31')).not.toMatch(/\binjur\w*|\bwrong\w*|\boffen[cd]\w*/i);
    });

    it('Disc. 1.13\'s note places "Wretch" on the master and names the power gradient', () => {
      const note = noteOf('epictetus-discourses-1-13');
      expect(note).toMatch(/\bWretch\b/);
      expect(note).toMatch(/\bmaster\b/i);
      expect(note).toMatch(/\bpower\b/i);
    });

    it('Ench. 43\'s note names the wrong as real (a judgement, not a denial)', () => {
      expect(noteOf('epictetus-enchiridion-43')).toMatch(/\b(injustice|wrong)\b[^.;]*\breal\b|\breal\b[^.;]*\b(injustice|wrong)\b/i);
    });

    it.each(['epictetus-enchiridion-43', 'epictetus-discourses-1-13'])('%s prescribes no forgiveness or toleration', (id) => {
      expect(noteOf(id)).not.toMatch(NOTE_PRESCRIPTION);
    });

    it('no interconnected-living note grounds worth in the whole', () => {
      const ps = JSON.parse(readFileSync(join(PASSAGES_DIR, 'passages-5-interconnected-living.json'), 'utf8')).passages;
      expect(ps.length).toBeGreaterThanOrEqual(9);
      for (const p of ps) {
        expect({ id: p.id, hit: (p.context ?? '').match(BURDEN_FRAME) }).toEqual({ id: p.id, hit: null });
      }
    });

    it('neither forbearance passage is the auto-expanded first card', () => {
      const ps = JSON.parse(readFileSync(join(PASSAGES_DIR, 'passages-5-interconnected-living.json'), 'utf8')).passages;
      const first = [...ps].sort((a: { order: number }, b: { order: number }) => a.order - b.order)[0];
      expect(['epictetus-enchiridion-43', 'epictetus-discourses-1-13']).not.toContain(first.id);
    });

    it('the FEAT-663 matchers still fire (DEBUG-390)', () => {
      // Source text from the omitted neighbours, never corpus state.
      const [[, , , anger], [, , , l47], [, , , l95], [, , , d113], [, , , e43]] = BOUNDARIES;
      expect('We should not even destroy vipers and water-snakes and other creatures').toMatch(anger); // Stewart, On Anger 2.31
      expect('be sure that mischief is not absent, but only asleep').toMatch(anger); // Stewart, On Anger 2.31
      expect('for if everyone who has a crooked and vicious disposition were to be punished, no one would escape punishment.').toMatch(anger); // Stewart, On Anger 2.31, {108} dropped
      expect('As a result of the massacres in Marius’s day').toMatch(l47); // Gummere, Ep. 47.10
      expect('Despise, then, if you dare, those to whose estate you may at any time descend').toMatch(l47); // Gummere, Ep. 47.10
      expect('according to her ruling, it is more wretched to commit than to suffer injury.').toMatch(l95); // Gummere, Ep. 95.52
      expect('How any one might eat acceptably to the Gods').toMatch(d113); // Carter, Disc. 1.13
      expect('But I have them by Right of Purchase, and not they me.').toMatch(d113); // Carter, Disc. 1.13
      expect('you will meekly bear a Person who reviles you').toMatch(e43); // Carter, Ench. 42
      // Note-level predicates: literal known-bad fixtures.
      expect('Forgive him; he is still family.').toMatch(NOTE_PRESCRIPTION);
      expect('Each part is cut away for the whole.').toMatch(BURDEN_FRAME);
      expect('A note about how a wrong done to us is answered.').toMatch(/\binjur\w*|\bwrong\w*|\boffen[cd]\w*/i);
    });
  });

  it('the required harm clause trips nothing (negative control)', () => {
    // `crisis` requires this clause on passages about holding a wrong. If a
    // future pattern starts catching it, this fails — rather than pushing an
    // author to weaken the clause until the scan goes quiet.
    const harmClause =
      'This is about how we hold an ordinary wrong, not about staying in or excusing ongoing harm, and no reason not to set limits or seek help.';
    expect(hits(BANNED, harmClause)).toEqual([]);
    expect(hits(REVIEW, harmClause)).toEqual([]);
    // FEAT-663's note-prescription ban must not catch the clause it sits beside.
    expect(harmClause).not.toMatch(
      /\bforgiv\w*|\breconcil\w*|\btolerat\w*|\bput\s+up\s+with\b|\bkeep\s+the\s+peace\b|\bfamily\s+first\b|\bstay\s+(close|with|together)\b|\b(he|she|they)('s|\s+is|\s+are)\s+(still\s+)?family\b/i,
    );
  });
});
