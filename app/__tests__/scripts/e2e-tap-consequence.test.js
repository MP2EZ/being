/**
 * DEBUG-642 — every tap that follows a `centerElement` scroll is registered, and every
 * consequence the register claims is really asserted.
 *
 * WHY A REGISTER. A `centerElement` scroll that stops mid-content can leave the NEXT touch
 * swallowed (signature 1 in docs/testing/e2e-maestro.md): the tap reports COMPLETED, the
 * app never receives it, and a flow that asserts nothing afterwards goes green. The item
 * that found the population counted it twice by grep and got it wrong both times — comments
 * name the anti-pattern, and inline comments hide real uses from a `\s*$` anchor. So the
 * population is derived structurally here, and a site that appears without being classified
 * reds until someone classifies it.
 *
 * WHAT THIS DOES NOT PROVE. A register entry records what the flow ASSERTS, not which
 * signature a site is. `exposed-unmeasured` means nobody has captured the site's bounds yet;
 * that capture is DEBUG-652's, and it needs a simulator. Only a `maestro hierarchy` capture
 * can settle a signature — a green run cannot.
 *
 * The step slicer is the one in e2e-dynamic-type.test.js (DEBUG-546), widened to keep every
 * command in document order, recurse into nested `commands:` blocks, and strip INLINE
 * comments. No YAML parser: a new dependency moves the lockfile, which regenerates the
 * native project and costs every worktree a rebuild.
 */
const fs = require('fs');
const path = require('path');

const MAESTRO = path.resolve(__dirname, '..', '..', '.maestro');
const TOUCH = new Set(['tapOn', 'doubleTapOn', 'longPressOn']);
const TRAVEL = new Set(['scrollUntilVisible', 'swipe', 'scroll']);

// Quote-aware: a `#` inside a quoted `text:` value is content, not a comment.
function stripInlineComment(line) {
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    if (line[i] === '"') quoted = !quoted;
    if (line[i] === '#' && !quoted && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i).replace(/\s+$/, '');
    }
  }
  return line;
}

// Every command step, in document order, with its body. Header lines above `---` are not
// commands; whole-line comments and blank lines are dropped before indentation is read.
function stepsOf(src, { stripInline = true } = {}) {
  const raw = src.split('\n');
  const sep = raw.indexOf('---');
  const lines = raw
    .map((text, i) => ({ n: i + 1, text: stripInline ? stripInlineComment(text) : text }))
    .filter(({ n }) => n > sep + 1)
    .filter(({ text }) => text.trim() !== '' && !/^\s*#/.test(text));

  const steps = [];
  lines.forEach(({ n, text }, i) => {
    const m = text.match(/^(\s*)-\s+(\w+)(?::\s*(.*))?$/);
    if (!m) return;
    const indent = m[1].length;
    const body = [];
    for (let j = i + 1; j < lines.length; j++) {
      if (lines[j].text.match(/^\s*/)[0].length <= indent) break;
      body.push(lines[j].text);
    }
    steps.push({ line: n, command: m[2], inline: (m[3] || '').trim(), body: body.join('\n') });
  });
  return steps;
}

function targetOf(step) {
  const src = `${step.inline}\n${step.body}`;
  const m =
    src.match(/^\s*id:\s*"([^"]+)"/m) ||
    src.match(/^\s*text:\s*"([^"]+)"/m) ||
    step.inline.match(/^"([^"]+)"$/);
  return m ? m[1] : null;
}

const CENTRED = /^\s*centerElement:\s*true\s*$/m;

// The population: each centred scroll, paired with the first touch after it.
function sitesIn(file, opts) {
  const steps = stepsOf(fs.readFileSync(path.join(MAESTRO, file), 'utf8'), opts);
  const sites = [];
  steps.forEach((step, i) => {
    if (step.command !== 'scrollUntilVisible' || !CENTRED.test(step.body)) return;
    const tapIndex = steps.findIndex((s, j) => j > i && TOUCH.has(s.command));
    if (tapIndex === -1) return;
    sites.push({
      file,
      scroll: targetOf(step),
      tap: targetOf(steps[tapIndex]),
      line: steps[tapIndex].line,
        after: consequencesAfter(steps, tapIndex).visible,
    });
  });
  return sites;
}

// Non-optional facts asserted after the site's tap, before the flow moves on: `visible`
// (something appeared) and `gone` (something unmounted). The flow moves on at the first
// scroll or swipe, or the first touch on a target other than the scroll target and the
// site's own tap — so an absorbing `tab-profile` tap followed by the card tap, and a
// conditional re-tap of the same card, both stay inside the window.
function consequencesAfter(steps, tapIndex) {
  const own = new Set([targetOf(steps[tapIndex])]);
  for (let j = tapIndex - 1; j >= 0; j--) {
    if (steps[j].command === 'scrollUntilVisible') {
      own.add(targetOf(steps[j]));
      break;
    }
  }
  const visible = [];
  const gone = [];
  for (let j = tapIndex + 1; j < steps.length; j++) {
    const s = steps[j];
    if (TRAVEL.has(s.command)) break;
    if (TOUCH.has(s.command) && !own.has(targetOf(s))) break;
    if (/^\s*optional:\s*true\s*$/m.test(s.body)) continue;
    if (s.command === 'assertVisible') visible.push(targetOf(s));
    if (s.command === 'assertNotVisible') gone.push(targetOf(s));
    if (s.command === 'extendedWaitUntil') {
      (/^\s*notVisible:/m.test(s.body) ? gone : visible).push(targetOf(s));
    }
  }
  return { visible, gone };
}

const flowFiles = () => fs.readdirSync(MAESTRO).filter((f) => f.endsWith('.yaml')).sort();
const allSites = (opts) => flowFiles().flatMap((f) => sitesIn(f, opts));
const keyOf = (s) => `${s.file} | ${s.scroll} -> ${s.tap}`;

/**
 * THE REGISTER. One entry per site; a key that occurs twice in a flow is listed twice.
 *
 *   remedied            the swallow is already handled (absorbing tap or conditional
 *                       re-tap) and the destination is asserted
 *   boundary            the scroll ends at the content boundary by construction, so the
 *                       swallow cannot fire; the destination is asserted
 *   exposed-unmeasured  a mid-content stop is possible and no capture has classified it
 *   debt-pin            export-share-sheet-occlusion pins a known debt state, is never
 *                       scoped by /b-close, and is recorded only
 *
 * `consequence` is the fact the flow asserts after the tap, or null when it asserts none.
 * Both directions are checked, so adding an assertion to a null site reds until the
 * register is updated.
 */
const REGISTER = [
  { key: 'bug-report-crisis-reachability.yaml | profile-card-bug-report -> tab-profile', status: 'remedied', consequence: 'bug-report-overlay' },
  { key: 'bug-report-crisis-reachability.yaml | profile-card-bug-report -> tab-profile', status: 'remedied', consequence: 'bug-report-overlay' },
  { key: 'crisis-button-reachability.yaml | weekly-reflection-card -> weekly-reflection-prompt', status: 'exposed-unmeasured', consequence: 'weekly-reflection-overlay', owner: 'DEBUG-652' },
  { key: 'crisis-button-reachability.yaml | profile-card-privacy -> profile-card-privacy', status: 'exposed-unmeasured', consequence: null, owner: 'DEBUG-652' },
  { key: 'crisis-button-reachability.yaml | profile-card-export -> profile-card-export', status: 'remedied', consequence: 'export-data-screen' },
  { key: 'crisis-button-reachability.yaml | profile-card-privacy -> profile-card-privacy', status: 'exposed-unmeasured', consequence: null, owner: 'DEBUG-652' },
  { key: 'crisis-button-reachability.yaml | profile-card-delete -> profile-card-delete', status: 'remedied', consequence: 'delete-account-screen' },
  { key: 'daily-loop-ax5-entry.yaml | checkin-card-daily-loop -> checkin-card-daily-loop', status: 'remedied', consequence: 'daily-loop-depth-select-screen' },
  { key: 'daily-loop-ax5-entry.yaml | continue-button -> continue-button', status: 'boundary', consequence: 'daily-loop-SphereSovereignty-screen' },
  { key: 'daily-loop-ax5-virtuous.yaml | checkin-card-daily-loop -> checkin-card-daily-loop', status: 'remedied', consequence: 'daily-loop-depth-select-screen' },
  { key: 'daily-loop-ax5-virtuous.yaml | virtue-chip-temperance -> daily-loop-exit', status: 'exposed-unmeasured', consequence: 'home-screen', owner: 'DEBUG-652' },
  { key: 'daily-loop-quick-depth.yaml | continue-button -> continue-button', status: 'boundary', consequence: 'daily-loop-VirtuousResponse-screen' },
  { key: 'export-share-sheet-occlusion.yaml | profile-card-privacy -> profile-card-privacy', status: 'debt-pin', consequence: null },
  { key: 'export-share-sheet-occlusion.yaml | profile-card-export -> profile-card-export', status: 'debt-pin', consequence: 'export-data-screen' },
  { key: 'export-share-sheet-occlusion.yaml | export-data-button -> export-data-button', status: 'debt-pin', consequence: null },
  { key: 'journal-crisis-scan.yaml | profile-card-voice-reflection -> tab-profile', status: 'remedied', consequence: 'voice-reflection-screen' },
  { key: 'journal-crisis-scan.yaml | profile-card-voice-reflection -> tab-profile', status: 'remedied', consequence: 'voice-reflection-screen' },
  { key: 'journal-crisis-scan.yaml | profile-card-voice-reflection -> tab-profile', status: 'remedied', consequence: 'voice-reflection-screen' },
  { key: 'journal-crisis-scan.yaml | profile-card-journal-history -> tab-profile', status: 'remedied', consequence: 'journal-history-screen' },
  { key: 'journal-record-liveness.yaml | profile-card-voice-reflection -> tab-profile', status: 'remedied', consequence: 'voice-reflection-screen' },
  { key: 'profile-voice-reflection-xxxl.yaml | profile-card-voice-reflection -> tab-profile', status: 'remedied', consequence: 'voice-reflection-screen' },
];

describe('DEBUG-642 — the post-centring tap population', () => {
  test('the slicer sees the population, and only through the parsing it claims to do', () => {
    const sites = allSites();
    expect(sites).toHaveLength(REGISTER.length);
    // A known site is found, so an empty or shrunken result cannot pass.
    expect(sites.map(keyOf)).toContain('journal-crisis-scan.yaml | profile-card-journal-history -> tab-profile');

    // Comments are stripped: gad7-severe names the remedy in prose and uses it nowhere.
    const gad7 = fs.readFileSync(path.join(MAESTRO, 'gad7-severe.yaml'), 'utf8');
    expect(gad7).toMatch(/centerElement:\s*true/);
    expect(sitesIn('gad7-severe.yaml')).toEqual([]);

    // Inline comments are stripped: without that, `centerElement: true # …` escapes the
    // matcher and the population shrinks. This is how a grep miscounted it.
    expect(allSites({ stripInline: false }).length).toBeLessThan(sites.length);
  });

  test('every site is registered, and every registered site exists', () => {
    const count = (keys) => keys.reduce((m, k) => m.set(k, (m.get(k) || 0) + 1), new Map());
    const found = count(allSites().map(keyOf));
    const registered = count(REGISTER.map((e) => e.key));
    expect(Object.fromEntries(found)).toEqual(Object.fromEntries(registered));
  });

  test('each register entry states what its flow actually asserts after the tap', () => {
    const byKey = new Map();
    allSites().forEach((s) => byKey.set(keyOf(s), [...(byKey.get(keyOf(s)) || []), s]));
    const seen = new Map();
    const mismatches = [];
    REGISTER.forEach((entry) => {
      const i = seen.get(entry.key) || 0;
      seen.set(entry.key, i + 1);
      const site = (byKey.get(entry.key) || [])[i];
      if (!site) return;
      const ok = entry.consequence === null ? site.after.length === 0 : site.after.includes(entry.consequence);
      if (!ok) mismatches.push(`${entry.key} (line ${site.line}): register says ${entry.consequence}, flow asserts [${site.after.join(', ')}]`);
    });
    expect(mismatches).toEqual([]);
  });

  test('a site is only called handled when its landing is asserted, and every open site has an owner', () => {
    const STATUSES = new Set(['remedied', 'boundary', 'exposed-unmeasured', 'debt-pin']);
    REGISTER.forEach((e) => {
      expect(STATUSES.has(e.status)).toBe(true);
      if (e.status === 'remedied' || e.status === 'boundary') expect(e.consequence).not.toBeNull();
      if (e.status === 'exposed-unmeasured') expect(e.owner).toBe('DEBUG-652');
    });
  });
});

describe('DEBUG-642 — a breath skip must prove it landed', () => {
  // A swallowed skip lets the 30s breath expire on its own and the flow goes green on the
  // next beat, so a bare skip tap never tests the tap. Every skip must be followed, before
  // the flow moves on, by a non-optional app-state fact: the reflection field appearing, or
  // the SkipLink unmounting (the DEBUG-632 shape, used at AX sizes where the field is below
  // the fold). Never the breathing circle: the element under suspicion must not double as
  // the proof (DEBUG-408). Where the field IS on screen, prefer it — a negative alone can
  // pass on an element that merely scrolled away (DEBUG-468).
  test('every daily-loop-skip-breath tap is followed by an app-state proof that it landed', () => {
    const taps = [];
    flowFiles().forEach((file) => {
      const steps = stepsOf(fs.readFileSync(path.join(MAESTRO, file), 'utf8'));
      steps.forEach((s, i) => {
        if (s.command !== 'tapOn' || targetOf(s) !== 'daily-loop-skip-breath') return;
        taps.push({ at: `${file}:${s.line}`, ...consequencesAfter(steps, i) });
      });
    });
    const proven = (t) =>
      t.visible.includes('daily-loop-input-response') || t.gone.includes('daily-loop-skip-breath');

    // Controls: taps are found in every flow that reaches a breath, and the proof test can
    // fail — a tap followed only by the circle's disappearance does not count.
    expect(new Set(taps.map((t) => t.at.split(':')[0])).size).toBeGreaterThanOrEqual(4);
    expect(proven({ visible: ['daily-loop-breathing-circle'], gone: ['daily-loop-breathing-circle'] })).toBe(false);

    expect(taps.filter((t) => !proven(t)).map((t) => t.at)).toEqual([]);
  });
});
