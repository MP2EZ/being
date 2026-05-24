import fs from 'fs';
import path from 'path';
import React from 'react';
import { render } from '@testing-library/react-native';
import { CollapsibleCrisisButton } from '../CollapsibleCrisisButton';

const COMPONENT_PATH = path.resolve(
  __dirname,
  '..',
  'CollapsibleCrisisButton.tsx'
);

/**
 * The fs-based checks below are fast defense-in-depth — they catch source-level
 * changes to the WIDTH constants without spinning up the renderer. The render-
 * based checks at the bottom catch actual runtime drift (a style override, a
 * conditional that bypasses the constant, etc.) that a grep cannot see.
 */
describe('CollapsibleCrisisButton WCAG 2.5.5 target size', () => {
  const source = fs.readFileSync(COMPONENT_PATH, 'utf-8');

  test('COLLAPSED_WIDTH_STANDARD source constant meets 44pt minimum (regression guard)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_STANDARD = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });

  test('COLLAPSED_WIDTH_PROMINENT source constant meets 44pt minimum (regression guard)', () => {
    const match = source.match(/const COLLAPSED_WIDTH_PROMINENT = (\d+);/);
    expect(match).not.toBeNull();
    const value = parseInt(match![1], 10);
    expect(value).toBeGreaterThanOrEqual(44);
  });

  test('standard-variant renders with width and height >= 44pt', () => {
    const { getByTestId } = render(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode: 'standard',
        testID: 'crisis-button',
      })
    );

    const node = getByTestId('crisis-button');
    // RN style may be an array, an object, or undefined. Flatten and pick the
    // first matching numeric width/height. The component passes `style={...}`
    // as an Animated.View prop; the testID-tagged node carries it directly.
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    expect(style).toBeTruthy();
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });

  test('prominent-variant renders with width and height >= 44pt', () => {
    const { getByTestId } = render(
      React.createElement(CollapsibleCrisisButton, {
        onNavigate: () => {},
        mode: 'prominent',
        testID: 'crisis-prominent',
      })
    );

    const node = getByTestId('crisis-prominent');
    const style = Array.isArray(node.props.style)
      ? Object.assign({}, ...node.props.style)
      : node.props.style;
    expect(style).toBeTruthy();
    expect(style.width).toBeGreaterThanOrEqual(44);
    expect(style.height).toBeGreaterThanOrEqual(44);
  });
});
