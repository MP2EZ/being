/**
 * MAINT-747 — OverviewTab expandable sections.
 *
 * Concept 0 starts expanded and marks nothing; expanding a concept marks it viewed via
 * completeSection (collapsing does not); obstacles start collapsed and are a plain toggle.
 * Pinned through accessibilityState.expanded on the header buttons.
 */

import React from 'react';
import { fireEvent, render } from '@testing-library/react-native';

import type { ModuleContent } from '@/features/learn/types/education';

// FromTheSourceSection needs a navigator and is not under test.
jest.mock('@/features/library/components/FromTheSourceSection', () => ({
  __esModule: true,
  default: () => null,
}));

import OverviewTab from '@/features/learn/tabs/OverviewTab';
import {
  resetEducationStoreForErasure,
  useEducationStore,
} from '@/features/learn/stores/educationStore';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const CONTENT = require('../../../assets/modules/module-1-aware-presence.json') as ModuleContent;
const MODULE_ID = 'aware-presence';

let mockCompleteSection: jest.Mock;

const conceptButton = (screen: ReturnType<typeof render>, index: number) => {
  const title = CONTENT.whatItIs.concepts[index].title;
  return screen.getByLabelText(new RegExp(`^(Expand|Collapse) concept: ${title}$`));
};
const obstacleButton = (screen: ReturnType<typeof render>, index: number) => {
  const q = CONTENT.commonObstacles[index].question;
  return screen.getByLabelText(new RegExp(`^(Expand|Collapse) question: ${q}$`));
};

beforeEach(() => {
  resetEducationStoreForErasure();
  const original = useEducationStore.getState().completeSection;
  mockCompleteSection = jest.fn(original);
  useEducationStore.setState({ completeSection: mockCompleteSection });
});

describe('OverviewTab — concepts', () => {
  it('control: the fixture has several concepts and obstacles', () => {
    expect(CONTENT.whatItIs.concepts.length).toBeGreaterThan(1);
    expect(CONTENT.commonObstacles.length).toBeGreaterThan(0);
  });

  it('starts with concept 0 expanded and the rest collapsed, without marking anything viewed', () => {
    const screen = render(<OverviewTab moduleContent={CONTENT} moduleId={MODULE_ID} />);

    expect(conceptButton(screen, 0).props.accessibilityState.expanded).toBe(true);
    expect(conceptButton(screen, 1).props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByText(CONTENT.whatItIs.concepts[0].content)).toBeTruthy();
    expect(screen.queryByText(CONTENT.whatItIs.concepts[1].content)).toBeNull();
    expect(mockCompleteSection).not.toHaveBeenCalled();
  });

  it('pressing concept 0 collapses it, then pressing again expands it; completeSection only on expand', () => {
    const screen = render(<OverviewTab moduleContent={CONTENT} moduleId={MODULE_ID} />);

    fireEvent.press(conceptButton(screen, 0));
    expect(conceptButton(screen, 0).props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByText(CONTENT.whatItIs.concepts[0].content)).toBeNull();
    expect(mockCompleteSection).not.toHaveBeenCalled();

    fireEvent.press(conceptButton(screen, 0));
    expect(conceptButton(screen, 0).props.accessibilityState.expanded).toBe(true);
    expect(screen.queryByText(CONTENT.whatItIs.concepts[0].content)).toBeTruthy();
    expect(mockCompleteSection).toHaveBeenCalledTimes(1);
    expect(mockCompleteSection).toHaveBeenCalledWith(MODULE_ID, 'concept-0');
  });

  it('expanding another concept marks that concept viewed and leaves the others as they were', () => {
    const screen = render(<OverviewTab moduleContent={CONTENT} moduleId={MODULE_ID} />);

    fireEvent.press(conceptButton(screen, 1));

    expect(conceptButton(screen, 1).props.accessibilityState.expanded).toBe(true);
    expect(conceptButton(screen, 0).props.accessibilityState.expanded).toBe(true);
    expect(mockCompleteSection).toHaveBeenCalledTimes(1);
    expect(mockCompleteSection).toHaveBeenCalledWith(MODULE_ID, 'concept-1');
    expect(useEducationStore.getState().modules[MODULE_ID].completedSections).toContain('concept-1');
  });
});

describe('OverviewTab — common obstacles', () => {
  it('starts collapsed and toggles open and closed without touching progress', () => {
    const screen = render(<OverviewTab moduleContent={CONTENT} moduleId={MODULE_ID} />);
    const response = CONTENT.commonObstacles[0].response;

    expect(obstacleButton(screen, 0).props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByText(response)).toBeNull();

    fireEvent.press(obstacleButton(screen, 0));
    expect(obstacleButton(screen, 0).props.accessibilityState.expanded).toBe(true);
    expect(screen.queryByText(response)).toBeTruthy();

    fireEvent.press(obstacleButton(screen, 0));
    expect(obstacleButton(screen, 0).props.accessibilityState.expanded).toBe(false);
    expect(screen.queryByText(response)).toBeNull();

    expect(mockCompleteSection).not.toHaveBeenCalled();
  });
});
