/**
 * WellnessScreeningTrends — "Your note" annotations (FEAT-195).
 *
 * Pins the flag-gated note surface on the trends component:
 * - flag OFF → no note affordance; rows stay the static FEAT-30 contract.
 * - flag ON  → "Add a note" affordance, tapping a row opens the composer, and
 *   saving routes through the encrypted store action (no analytics egress).
 *
 * The no-egress + crisis-exclusion invariants are asserted structurally: the
 * note save path's only side effect is the encrypted store write.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';

jest.mock('react-native-svg', () => {
  const ReactLib = require('react');
  const { View, Text } = require('react-native');
  return {
    __esModule: true,
    default: ({ children }: { children?: React.ReactNode }) => ReactLib.createElement(View, null, children),
    Svg: ({ children }: { children?: React.ReactNode }) => ReactLib.createElement(View, null, children),
    Polyline: () => null,
    Circle: () => null,
    Line: () => null,
    Rect: () => null,
    Text: ({ children }: { children?: React.ReactNode }) => ReactLib.createElement(Text, null, children),
  };
});

// Flag control — toggle per test.
let mockFlag = false;
jest.mock('@/core/analytics', () => ({
  useFeatureFlag: () => mockFlag,
}));

// Passthrough encrypted-storage mock so the real store action runs without crypto.
const mockWellnessBlobs: Record<string, unknown> = {};
jest.mock('@/core/services/security/SecureStorageService', () => ({
  __esModule: true,
  default: {
    storeWellnessBlob: jest.fn(async (key: string, data: unknown) => {
      mockWellnessBlobs[key] = data;
      return { success: true, operationType: 'store' as const, storageKey: `wellness_async_${key}`, operationTimeMs: 0, dataSize: 0 };
    }),
    retrieveWellnessBlob: jest.fn(async (key: string) => mockWellnessBlobs[key] ?? null),
    deleteWellnessBlob: jest.fn(async (key: string) => { delete mockWellnessBlobs[key]; }),
  },
}));

import WellnessScreeningTrends from '../WellnessScreeningTrends';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import SecureStorageService from '@/core/services/security/SecureStorageService';
import type { AssessmentSession, AssessmentType, PHQ9Result } from '@/features/assessment/types';

const mockStoreWellnessBlob = SecureStorageService.storeWellnessBlob as jest.Mock;
const DAY = 24 * 60 * 60 * 1000;
const NOW = 1_700_000_000_000;

function session(type: AssessmentType, score: number, severity: string, daysAgo: number, note?: string): AssessmentSession {
  const startedAt = NOW - daysAgo * DAY;
  const result = { totalScore: score, severity, isCrisis: false, completedAt: startedAt, answers: [], suicidalIdeation: false } as PHQ9Result;
  const base: AssessmentSession = {
    id: `${type}-${daysAgo}`,
    type,
    context: 'standalone',
    progress: { type, currentQuestionIndex: 9, totalQuestions: 9, startedAt, answers: [], isComplete: true },
    result,
  };
  return note === undefined ? base : { ...base, note };
}

// Two PHQ-9 check-ins so the line/data-list (not the single-point state) renders.
const sessions = [session('phq9', 6, 'mild', 10), session('phq9', 9, 'mild', 2)];

beforeEach(() => {
  jest.clearAllMocks();
  for (const k of Object.keys(mockWellnessBlobs)) delete mockWellnessBlobs[k];
  mockFlag = false;
  useAssessmentStore.getState().resetAssessment();
  useAssessmentStore.setState({ completedAssessments: sessions });
});

describe('WellnessScreeningTrends — Your note (flag OFF)', () => {
  it('shows no note affordance and keeps rows non-interactive', () => {
    const { queryByText, queryByLabelText } = render(
      <WellnessScreeningTrends sessions={sessions} now={NOW} />
    );
    expect(queryByText('Add a note')).toBeNull();
    // No row exposes the note button role/hint.
    expect(queryByLabelText(/No note yet/)).toBeNull();
  });
});

describe('WellnessScreeningTrends — Your note (flag ON)', () => {
  beforeEach(() => { mockFlag = true; });

  it('shows an "Add a note" affordance on un-annotated check-ins', () => {
    const { getAllByText } = render(<WellnessScreeningTrends sessions={sessions} now={NOW} />);
    expect(getAllByText('Add a note').length).toBeGreaterThan(0);
  });

  it('renders an existing note inline instead of the affordance', () => {
    const annotated = [session('phq9', 6, 'mild', 10, 'Started a new job'), session('phq9', 9, 'mild', 2)];
    useAssessmentStore.setState({ completedAssessments: annotated });
    const { getByText } = render(<WellnessScreeningTrends sessions={annotated} now={NOW} />);
    expect(getByText('Started a new job')).toBeTruthy();
  });

  it('opens the composer when a row is tapped and saves through the encrypted store path', async () => {
    const { getAllByText, getByTestId } = render(
      <WellnessScreeningTrends sessions={sessions} now={NOW} />
    );

    fireEvent.press(getAllByText('Add a note')[0]!);
    expect(getByTestId('session-note-composer')).toBeTruthy();

    fireEvent.changeText(getByTestId('session-note-input'), 'moved apartments');
    fireEvent.press(getByTestId('session-note-save'));

    await waitFor(() => {
      expect(mockStoreWellnessBlob).toHaveBeenCalledWith(
        'assessment_store',
        expect.any(Object),
        'level_2_assessment_data'
      );
    });

    // The note landed on the right session in the store.
    const saved = useAssessmentStore
      .getState()
      .completedAssessments.find((s) => s.note === 'moved apartments');
    expect(saved).toBeTruthy();
  });
});
