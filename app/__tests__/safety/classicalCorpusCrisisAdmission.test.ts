/**
 * Classical corpus crisis admission (FEAT-581)
 *
 * The authors the Classical Library quotes held that a person may leave life
 * by choice — the Stoic "open door". It is not confined to chapters a curator
 * would avoid: it sits three-quarters through Discourses 1.24, at the end of
 * Meditations 8.47, inside Discourses 1.9 — chapters otherwise worth quoting.
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
  ['bad relation', /\b(bad|unjust|cruel)\s+(father|mother|parent|husband|wife|brother)\b/i],
  ['rejoin the dead', /\b(join|follow|rejoin)\w*\s+(him|her|them)\b/i],
  // In this corpus "door" carries the open-door doctrine even when idiomatic
  // ("one door closes… stays open" was struck from a FEAT-581 note for it).
  ['door', /\bdoors?\b/i],
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
];

const hits = (patterns: typeof BANNED, value: string) =>
  patterns.flatMap(([label, pattern]) => {
    const m = value.match(pattern);
    return m ? [{ label, term: m[0].toLowerCase() }] : [];
  });

const isCleared = (r: Rendered, term: string) =>
  REVIEW_CLEARED.some((c) => c.id === r.id && c.field === r.field && c.term === term);

describe('classical corpus crisis admission (FEAT-581)', () => {
  it('reads every rendered field it claims to (non-vacuity)', () => {
    const rendered = renderedStrings();
    // Every passage renders `text`; every module renders a quote. A scan over
    // an empty set would pass every assertion below vacuously.
    expect(rendered.filter((r) => r.field === 'text').length).toBeGreaterThanOrEqual(16);
    expect(rendered.filter((r) => r.field === 'context').length).toBeGreaterThanOrEqual(16);
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

  it('every BANNED pattern has a control', () => {
    // The table above is the only proof a pattern still fires. A pattern added
    // without one is unproven, which is the DEBUG-390 failure exactly.
    const controlled = new Set(CONTROLS.map(([label]) => label));
    expect(BANNED.map(([label]) => label).filter((l) => !controlled.has(l))).toEqual([]);
  });

  it('the required harm clause trips nothing (negative control)', () => {
    // `crisis` requires this clause on passages about holding a wrong. If a
    // future pattern starts catching it, this fails — rather than pushing an
    // author to weaken the clause until the scan goes quiet.
    const harmClause =
      'This is about how we hold an ordinary wrong, not about staying in or excusing ongoing harm, and no reason not to set limits or seek help.';
    expect(hits(BANNED, harmClause)).toEqual([]);
    expect(hits(REVIEW, harmClause)).toEqual([]);
  });
});
