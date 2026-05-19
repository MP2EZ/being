import fs from 'fs';
import path from 'path';

const COMPONENT_PATH = path.resolve(
  __dirname,
  '..',
  'CollapsibleCrisisButton.tsx'
);

describe('CollapsibleCrisisButton WCAG 2.5.5 target size', () => {
  const source = fs.readFileSync(COMPONENT_PATH, 'utf-8');

  test('COLLAPSED_WIDTH_STANDARD meets WCAG 2.5.5 minimum (44pt)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_STANDARD = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });

  test('COLLAPSED_WIDTH_PROMINENT meets WCAG 2.5.5 minimum (44pt)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_PROMINENT = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });
});
