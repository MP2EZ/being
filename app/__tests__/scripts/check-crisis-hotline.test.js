const { validateContent } = require('../../scripts/check-crisis-hotline');

describe('check-crisis-hotline validateContent', () => {
  test('returns null when EXPO_PUBLIC_CRISIS_HOTLINE=988 is the sole uncommented line', () => {
    const env = ['# Crisis config', 'EXPO_PUBLIC_CRISIS_HOTLINE=988', 'EXPO_PUBLIC_OTHER=foo'].join('\n');
    expect(validateContent(env)).toBeNull();
  });

  test('flags missing line', () => {
    const env = 'EXPO_PUBLIC_OTHER=foo\n';
    expect(validateContent(env)).toMatch(/missing required line/);
  });

  test('flags wrong value', () => {
    const env = 'EXPO_PUBLIC_CRISIS_HOTLINE=911\n';
    expect(validateContent(env)).toMatch(/wrong value/);
  });

  test('flags duplicate keys (dotenv last-wins ambiguity)', () => {
    const env = 'EXPO_PUBLIC_CRISIS_HOTLINE=988\nEXPO_PUBLIC_CRISIS_HOTLINE=911\n';
    expect(validateContent(env)).toMatch(/multiple EXPO_PUBLIC_CRISIS_HOTLINE lines/);
  });

  test('ignores commented hotline line', () => {
    const env = '# EXPO_PUBLIC_CRISIS_HOTLINE=988\nEXPO_PUBLIC_OTHER=foo\n';
    expect(validateContent(env)).toMatch(/missing required line/);
  });

  test('rejects substring-like key (LEGACY suffix)', () => {
    const env = 'EXPO_PUBLIC_CRISIS_HOTLINE_LEGACY=988\n';
    expect(validateContent(env)).toMatch(/missing required line/);
  });
});
