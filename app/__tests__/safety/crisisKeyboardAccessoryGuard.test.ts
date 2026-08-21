/**
 * DEBUG-450 — the crisis keyboard accessory guard, pinned.
 *
 * The guard script is the mechanical enforcement that every shipping `<TextInput>` can
 * reach 988 while its keyboard is up. This suite is the guard's own pin: it runs in
 * `precommit` (via `test:safety`), where the CI step cannot, and it proves the detector
 * still FIRES rather than merely still passing.
 *
 * That last part is the whole point. A comment-stripping source scanner paired with a
 * narrow matcher is exactly the combination that can silently match nothing at all —
 * green because it found no sites, not because every site is wired. Every "the tree is
 * clean" assertion here is paired with a known-bad fixture.
 */

import {
  ALLOWLIST,
  findTextInputSites,
  openingTagSpan,
  runGuard,
  stripComments,
} from '../../scripts/check-crisis-keyboard-accessory-guard.js';

describe('DEBUG-450 crisis keyboard accessory guard', () => {
  describe('the real tree', () => {
    it('has every shipping <TextInput> wired to the accessory', () => {
      const { unwired } = runGuard();
      expect(unwired).toEqual([]);
    });

    it('carries no allowlist entry whose file no longer renders a <TextInput>', () => {
      const { stale } = runGuard();
      expect(stale).toEqual([]);
    });

    it('actually scanned sites — a zero-site sweep would pass vacuously', () => {
      // Without this, deleting the matcher would make both assertions above green.
      const fs = require('fs');
      const path = require('path');
      const wired = path.join(
        __dirname,
        '../../src/features/journal/screens/VoiceReflectionScreen.tsx',
      );
      const sites = findTextInputSites(fs.readFileSync(wired, 'utf8'));
      expect(sites.length).toBeGreaterThan(0);
      expect(sites.every((s: { wired: boolean }) => s.wired)).toBe(true);
    });
  });

  describe('the detector fires on known-bad source', () => {
    it('flags a TextInput with no accessory props', () => {
      const sites = findTextInputSites('<TextInput style={s.x} multiline />');
      expect(sites).toHaveLength(1);
      expect(sites[0].wired).toBe(false);
    });

    it('accepts the props spread', () => {
      const sites = findTextInputSites('<TextInput {...crisisAccessoryProps()} style={s.x} />');
      expect(sites[0].wired).toBe(true);
    });

    it('accepts a literal inputAccessoryViewID', () => {
      const sites = findTextInputSites('<TextInput inputAccessoryViewID={ID} />');
      expect(sites[0].wired).toBe(true);
    });

    /**
     * Attribute-level, not file-level. This is the case a tag-presence guard (the shape
     * check-modal-occlusion-guard.js uses) would pass, and it is a real shape in this
     * tree — DailyLoopStepScreen renders two inputs, one inside a .map() factory.
     */
    it('flags the SECOND input when only the first is wired', () => {
      const src = `
        <TextInput {...crisisAccessoryProps()} style={a} />
        <TextInput style={b} multiline />
      `;
      const sites = findTextInputSites(src);
      expect(sites).toHaveLength(2);
      expect(sites[0].wired).toBe(true);
      expect(sites[1].wired).toBe(false);
    });

    it('does not treat a mention in a COMMENT as wiring', () => {
      // The house convention names anti-patterns in prose to warn the next reader off
      // them (DEBUG-390). An unstripped matcher would read this as compliant.
      const src = '<TextInput style={s.x} /> // TODO add crisisAccessoryProps()';
      const sites = findTextInputSites(src);
      expect(sites[0].wired).toBe(false);
    });
  });

  describe('the tag scanner', () => {
    it('does not end the tag on a > inside an expression', () => {
      const src = '<TextInput style={{ w: a > b }} {...crisisAccessoryProps()} />';
      expect(findTextInputSites(src)[0].wired).toBe(true);
    });

    it('does not end the tag on a > inside a string', () => {
      const src = '<TextInput placeholder="a > b" {...crisisAccessoryProps()} />';
      expect(findTextInputSites(src)[0].wired).toBe(true);
    });

    it('treats an unterminated tag as UNWIRED, never as wired', () => {
      // Fail closed: an unparsed tag is not evidence of compliance.
      const sites = findTextInputSites('<TextInput style={s.x}');
      expect(sites[0].unparsed).toBe(true);
      expect(sites[0].wired).toBe(false);
      expect(openingTagSpan('<TextInput style={s.x}', 0)).toBeNull();
    });
  });

  describe('stripComments', () => {
    it('preserves line structure so reported line numbers stay true', () => {
      const src = 'a\n/* x\n y */\nb';
      expect(stripComments(src).split('\n')).toHaveLength(src.split('\n').length);
    });

    it('leaves enough source to scan — a total blanking would be vacuous', () => {
      const src = '// note\n<TextInput {...crisisAccessoryProps()} />';
      expect(stripComments(src)).toContain('TextInput');
    });
  });

  it('exposes an allowlist that is an object (the audit trail, possibly empty)', () => {
    expect(typeof ALLOWLIST).toBe('object');
  });
});
