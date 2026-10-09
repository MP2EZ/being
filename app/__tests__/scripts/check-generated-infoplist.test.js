const {
  EXIT,
  REQUIRED_SCHEMES,
  evaluateSchemes,
  collectLocalPaths,
  unresolvedLocalPaths,
} = require('../../scripts/check-generated-infoplist');

describe('check-generated-infoplist', () => {
  test('pins the exit alphabet the CI step and its header rely on', () => {
    expect(EXIT).toEqual({ PASS: 0, SCHEMES: 1, NO_READING: 2 });
  });

  test('requires exactly the two schemes the crisis dial path needs', () => {
    expect(REQUIRED_SCHEMES).toEqual(['tel', 'sms']);
  });

  describe('evaluateSchemes', () => {
    test('passes the shipped array', () => {
      const r = evaluateSchemes(['tel', 'sms']);
      expect(r.code).toBe(EXIT.PASS);
      expect(r.missing).toEqual([]);
      expect(r.rendered).toBe('["tel","sms"]');
    });

    test('passes when a further scheme is added — this is not a whole-array snapshot', () => {
      expect(evaluateSchemes(['tel', 'sms', 'mailto']).code).toBe(EXIT.PASS);
    });

    test.each([
      ['sms stripped', ['tel'], ['sms']],
      ['tel stripped', ['sms'], ['tel']],
      ['empty array', [], ['tel', 'sms']],
      ['prefix look-alike', ['telprompt', 'sms'], ['tel']],
      ['suffix look-alike', ['tel', 'smsto'], ['sms']],
      ['case differs', ['TEL', 'sms'], ['tel']],
      ['surrounding whitespace', [' tel', 'sms'], ['tel']],
    ])('%s → SCHEMES, naming what is missing and printing the actual array', (_label, value, missing) => {
      const r = evaluateSchemes(value);
      expect(r.code).toBe(EXIT.SCHEMES);
      expect(r.missing).toEqual(missing);
      expect(r.rendered).toBe(JSON.stringify(value));
    });

    test('absent key → SCHEMES, rendered as <absent>', () => {
      const r = evaluateSchemes(undefined);
      expect(r.code).toBe(EXIT.SCHEMES);
      expect(r.missing).toEqual(['tel', 'sms']);
      expect(r.rendered).toBe('<absent>');
    });

    test.each([
      ['a string', 'tel,sms', '<string>'],
      ['an object', { 0: 'tel', 1: 'sms' }, '<object>'],
      ['null', null, '<null>'],
    ])('%s instead of an array → SCHEMES, rendered as its type', (_label, value, rendered) => {
      const r = evaluateSchemes(value);
      expect(r.code).toBe(EXIT.SCHEMES);
      expect(r.rendered).toBe(rendered);
    });

    test('an array holding a non-string fails even with both schemes present', () => {
      const r = evaluateSchemes(['tel', 'sms', 42]);
      expect(r.code).toBe(EXIT.SCHEMES);
      expect(r.missing).toEqual([]);
      expect(r.reason).toMatch(/not an array of strings/);
      expect(r.rendered).toBe('["tel","sms",42]');
    });
  });

  describe('local input paths', () => {
    const config = {
      icon: './assets/icon.png',
      name: 'Being',
      plugins: [
        'expo-sharing',
        ['./plugins/withX', { groups: ['group.x'] }],
        ['expo-splash-screen', { image: './assets/splash.png', resizeMode: 'contain' }],
      ],
      ios: { googleServicesFile: '../outside/GoogleService-Info.plist' },
    };

    test('collects ./ and ../ strings at any depth, and nothing else', () => {
      expect(collectLocalPaths(config).sort()).toEqual([
        '../outside/GoogleService-Info.plist',
        './assets/icon.png',
        './assets/splash.png',
        './plugins/withX',
      ]);
    });

    test('resolves an extensionless plugin module and asset files inside the copy', () => {
      const files = new Set(['/r/assets/icon.png', '/r/assets/splash.png', '/r/plugins/withX.js']);
      const exists = (p) => files.has(p);
      expect(unresolvedLocalPaths(config, '/r', exists)).toEqual(['../outside/GoogleService-Info.plist']);
    });

    test('names every path the copy lacks — a plugin that skips a missing file would pass silently', () => {
      expect(unresolvedLocalPaths(config, '/r', () => false).sort()).toEqual([
        '../outside/GoogleService-Info.plist',
        './assets/icon.png',
        './assets/splash.png',
        './plugins/withX',
      ]);
    });
  });
});
