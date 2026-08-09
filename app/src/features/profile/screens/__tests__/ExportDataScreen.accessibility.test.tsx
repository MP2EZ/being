/**
 * ExportDataScreen (FEAT-267 + FEAT-270) — accessibility + behaviour.
 *
 * FEAT-267: pressing "Export as JSON" gathers + serializes the on-device data,
 * writes a JSON file, and opens the system share sheet.
 *
 * FEAT-270: a BUILD-TIME-flag-gated scoping + count-preview section. The tests
 * below pin the three things that could go wrong invisibly:
 *   1. the flag gates VISIBILITY ONLY — the always-on JSON export must still
 *      render and still work when the flag is off;
 *   2. counts track the selection (category toggle + range preset);
 *   3. NO free text ever reaches the rendered tree. `buildExportPayload` carries
 *      `reflections[].text` and `assessments[].note` verbatim (OPAQUE at source),
 *      so this asserts against the serialized tree, not just a query.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { StyleSheet } from 'react-native';
import { TOUCH_TARGETS } from '@/core/theme';

const mockGather = jest.fn();
const mockSerialize = jest.fn();
jest.mock('@/core/services/privacy/DataExportService', () => ({
  gatherExportData: (...a: unknown[]) => mockGather(...a),
  serializeExport: (...a: unknown[]) => mockSerialize(...a),
}));

const mockWrite = jest.fn();
const mockCreate = jest.fn();
jest.mock('expo-file-system', () => ({
  Paths: { cache: '/cache' },
  File: jest.fn().mockImplementation(() => ({
    create: mockCreate,
    write: mockWrite,
    uri: 'file:///cache/being-export.json',
  })),
}));

const mockShareAsync = jest.fn();
const mockIsAvailable = jest.fn();
jest.mock('expo-sharing', () => ({
  shareAsync: (...a: unknown[]) => mockShareAsync(...a),
  isAvailableAsync: (...a: unknown[]) => mockIsAvailable(...a),
}));

// Build-time flag module is mocked (not the env blob) so the gate can be flipped
// per-test without reloading the module graph.
const mockIsFeatureEnabled = jest.fn();
jest.mock('@/core/services/featureFlags', () => ({
  isFeatureEnabled: (...a: unknown[]) => mockIsFeatureEnabled(...a),
}));

import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useStoicPracticeStore } from '@/features/practices/stores/stoicPracticeStore';
import type { AssessmentSession, PHQ9Result } from '@/features/assessment/types';
import ExportDataScreen from '../ExportDataScreen';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.now();

/** Free text that must never be rendered. Distinctive so a substring scan is decisive. */
const SECRET_NOTE = 'ZZNOTEZZ-my-therapist-said';
const SECRET_REFLECTION = 'ZZREFLECTIONZZ-what-i-wrote-this-week';

const ymd = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

function phq9Session(opts: { completedAt: number; note?: string }): AssessmentSession {
  const result: PHQ9Result = {
    totalScore: 8,
    severity: 'mild',
    isCrisis: false,
    suicidalIdeation: false,
    completedAt: opts.completedAt,
    answers: [{ questionId: 'phq9_1', response: 1, timestamp: opts.completedAt }],
  };
  return {
    id: `phq9_${opts.completedAt}`,
    type: 'phq9',
    progress: {
      type: 'phq9',
      currentQuestionIndex: 9,
      totalQuestions: 9,
      startedAt: opts.completedAt - 1000,
      answers: result.answers,
      isComplete: true,
    },
    result,
    context: 'standalone',
    note: opts.note,
  };
}

const resetStores = () => {
  useAssessmentStore.setState({ completedAssessments: [] });
  useStoicPracticeStore.setState({
    principleEngagements: [],
    checkInCompletions: [],
    weeklyReflections: [],
    isLoading: false,
  });
};

/**
 * Two assessments (one recent, one 60 days old), one recent check-in, one recent
 * reflection. The 60-day-old record is what makes the range presets observable.
 */
const seedStores = () => {
  useAssessmentStore.setState({
    completedAssessments: [
      phq9Session({ completedAt: NOW - 2 * DAY, note: SECRET_NOTE }),
      phq9Session({ completedAt: NOW - 60 * DAY }),
    ],
  });
  useStoicPracticeStore.setState({
    checkInCompletions: [
      { type: 'morning', completedAt: new Date(NOW - 2 * DAY), date: ymd(NOW - 2 * DAY) },
    ],
    weeklyReflections: [
      {
        id: 'r1',
        weekStartIso: ymd(NOW - 2 * DAY),
        text: SECRET_REFLECTION,
        savedAt: new Date(NOW - 2 * DAY).toISOString(),
      },
    ],
    isLoading: false,
  });
};

const flatten = (style: unknown): Record<string, unknown> =>
  (StyleSheet.flatten(style as never) ?? {}) as Record<string, unknown>;

describe('ExportDataScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGather.mockResolvedValue({ schemaVersion: '1' });
    mockSerialize.mockReturnValue('{"schemaVersion":"1"}');
    mockIsAvailable.mockResolvedValue(true);
    mockShareAsync.mockResolvedValue(undefined);
    mockIsFeatureEnabled.mockReturnValue(false);
    resetStores();
  });

  afterEach(resetStores);

  // ---------------------------------------------------------------------------
  // FEAT-267 — always-on JSON export
  // ---------------------------------------------------------------------------

  it('labels the export control for screen readers', () => {
    const { getByTestId } = render(<ExportDataScreen />);
    const button = getByTestId('export-data-button');
    expect(button.props.accessibilityRole).toBe('button');
    expect(button.props.accessibilityLabel).toMatch(/export as json/i);
  });

  it('discloses that encrypted server data is excluded', () => {
    const { getByText } = render(<ExportDataScreen />);
    expect(getByText(/encrypted/i)).toBeTruthy();
  });

  it('gathers, serializes, writes, and opens the share sheet on press', async () => {
    const { getByTestId } = render(<ExportDataScreen />);
    fireEvent.press(getByTestId('export-data-button'));

    await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
    expect(mockGather).toHaveBeenCalled();
    expect(mockSerialize).toHaveBeenCalledWith({ schemaVersion: '1' });
    expect(mockWrite).toHaveBeenCalledWith('{"schemaVersion":"1"}');
    expect(mockShareAsync).toHaveBeenCalledWith(
      'file:///cache/being-export.json',
      expect.objectContaining({ mimeType: 'application/json' }),
    );
  });

  it('surfaces an error and does not throw when sharing is unavailable', async () => {
    mockIsAvailable.mockResolvedValue(false);
    const { getByTestId } = render(<ExportDataScreen />);
    fireEvent.press(getByTestId('export-data-button'));

    await waitFor(() => expect(getByTestId('export-error')).toBeTruthy());
    expect(mockShareAsync).not.toHaveBeenCalled();
  });

  // ---------------------------------------------------------------------------
  // FEAT-270 — flag OFF
  // ---------------------------------------------------------------------------

  describe('with the data_export flag OFF', () => {
    beforeEach(() => {
      mockIsFeatureEnabled.mockReturnValue(false);
      seedStores();
    });

    it('does not render the preview section', () => {
      const { queryByTestId } = render(<ExportDataScreen />);
      expect(queryByTestId('export-preview-section')).toBeNull();
      expect(queryByTestId('export-range-selector')).toBeNull();
      expect(queryByTestId('export-category-assessments')).toBeNull();
    });

    it('leaves the JSON export rendered and still reachable', async () => {
      const { getByTestId } = render(<ExportDataScreen />);
      const button = getByTestId('export-data-button');
      expect(button).toBeTruthy();
      expect(button.props.accessibilityState).toEqual(
        expect.objectContaining({ disabled: false }),
      );

      fireEvent.press(button);
      await waitFor(() => expect(mockShareAsync).toHaveBeenCalled());
    });

    it('reads the BUILD-TIME flag, never a runtime/analytics-gated one', () => {
      render(<ExportDataScreen />);
      expect(mockIsFeatureEnabled).toHaveBeenCalledWith('data_export');
    });
  });

  // ---------------------------------------------------------------------------
  // FEAT-270 — flag ON
  // ---------------------------------------------------------------------------

  describe('with the data_export flag ON', () => {
    beforeEach(() => {
      mockIsFeatureEnabled.mockReturnValue(true);
      seedStores();
    });

    it('renders the range presets as tabs with correct selected state', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      expect(getByTestId('export-range-selector').props.accessibilityRole).toBe('tablist');

      for (const key of ['last7', 'last30', 'last90', 'all']) {
        const tab = getByTestId(`export-range-${key}`);
        expect(tab.props.accessibilityRole).toBe('tab');
        expect(tab.props.accessibilityState.selected).toBe(key === 'all');
      }
    });

    it('renders the four categories as checkboxes, all checked by default', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      for (const key of ['assessments', 'checkIns', 'practices', 'reflections']) {
        const box = getByTestId(`export-category-${key}`);
        expect(box.props.accessibilityRole).toBe('checkbox');
        expect(box.props.accessibilityState.checked).toBe(true);
      }
    });

    it('gives every new control at least a 44pt touch target (WCAG 2.5.5)', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      const controls = [
        'export-range-last7',
        'export-range-last30',
        'export-range-last90',
        'export-range-all',
        'export-category-assessments',
        'export-category-checkIns',
        'export-category-practices',
        'export-category-reflections',
      ];
      for (const id of controls) {
        expect(flatten(getByTestId(id).props.style).minHeight).toBeGreaterThanOrEqual(
          TOUCH_TARGETS.minimum,
        );
      }
    });

    it('previews counts for the default all-time, all-category selection', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      expect(getByTestId('export-count-assessments').props.children).toBe('2 records');
      expect(getByTestId('export-count-checkIns').props.children).toBe('1 record');
      expect(getByTestId('export-count-practices').props.children).toBe('0 records');
      expect(getByTestId('export-count-reflections').props.children).toBe('1 record');
      expect(getByTestId('export-preview-total').props.children.join('')).toMatch(
        /^4 records/,
      );
    });

    it('updates counts when a category is toggled off and back on', () => {
      const { getByTestId } = render(<ExportDataScreen />);

      fireEvent.press(getByTestId('export-category-assessments'));
      expect(getByTestId('export-category-assessments').props.accessibilityState.checked).toBe(
        false,
      );
      expect(getByTestId('export-count-assessments').props.children).toBe('Not included');
      expect(getByTestId('export-preview-total').props.children.join('')).toMatch(/^2 records/);

      fireEvent.press(getByTestId('export-category-assessments'));
      expect(getByTestId('export-count-assessments').props.children).toBe('2 records');
      expect(getByTestId('export-preview-total').props.children.join('')).toMatch(/^4 records/);
    });

    it('updates counts when the range preset changes', () => {
      const { getByTestId } = render(<ExportDataScreen />);

      fireEvent.press(getByTestId('export-range-last7'));
      expect(getByTestId('export-range-last7').props.accessibilityState.selected).toBe(true);
      expect(getByTestId('export-range-all').props.accessibilityState.selected).toBe(false);
      // The 60-day-old screening drops out; everything else is 2 days old.
      expect(getByTestId('export-count-assessments').props.children).toBe('1 record');
      expect(getByTestId('export-preview-total').props.children.join('')).toMatch(/^3 records/);
    });

    it('reports an empty window honestly rather than as a zero count alone', () => {
      resetStores();
      const { getByTestId } = render(<ExportDataScreen />);
      expect(getByTestId('export-preview-window').props.children).toMatch(
        /no records in this range/i,
      );
    });

    it('shows the resolved data window when records exist', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      expect(getByTestId('export-preview-window').props.children).toMatch(/covering .+ to .+/i);
    });

    it('renders the disclaimer verbatim', () => {
      const { getByTestId } = render(<ExportDataScreen />);
      const text = getByTestId('export-preview-disclaimer').props.children as string;
      expect(text).toContain('does not constitute medical records');
      expect(text).toContain('self-monitoring wellness screenings');
    });

    it('renders the omissions so a 0 count cannot read as "you have no data"', () => {
      const { getByTestId, getByText } = render(<ExportDataScreen />);
      expect(getByTestId('export-preview-omissions')).toBeTruthy();
      expect(getByText(/breathing_session_log/)).toBeTruthy();
      expect(getByText(/virtue_practice_log/)).toBeTruthy();
    });

    it('shows a loading state instead of misleading zeroes before stores hydrate', () => {
      useStoicPracticeStore.setState({ isLoading: true });
      const { getByTestId, queryByTestId } = render(<ExportDataScreen />);
      expect(getByTestId('export-preview-loading')).toBeTruthy();
      expect(queryByTestId('export-preview-result')).toBeNull();
      expect(queryByTestId('export-preview-total')).toBeNull();
    });

    it('never renders user free text — only counts (compliance, non-negotiable)', () => {
      const { toJSON, queryByText, getByTestId } = render(<ExportDataScreen />);

      const serialized = JSON.stringify(toJSON());
      expect(serialized).not.toContain(SECRET_NOTE);
      expect(serialized).not.toContain(SECRET_REFLECTION);
      expect(queryByText(new RegExp(SECRET_NOTE))).toBeNull();
      expect(queryByText(new RegExp(SECRET_REFLECTION))).toBeNull();

      // ...and still absent after the selection changes (the payload is rebuilt).
      fireEvent.press(getByTestId('export-range-last7'));
      const afterToggle = JSON.stringify(toJSON());
      expect(afterToggle).not.toContain(SECRET_NOTE);
      expect(afterToggle).not.toContain(SECRET_REFLECTION);
    });

    it('does not claim a completed export anywhere in the preview', () => {
      const { queryByText } = render(<ExportDataScreen />);
      expect(queryByText(/your export is ready/i)).toBeNull();
      expect(queryByText(/export complete/i)).toBeNull();
      expect(queryByText(/see what's included/i)).toBeTruthy();
    });

    it('uses compliant terminology in the new copy', () => {
      const { queryByText, getAllByText, getByText, getByTestId } = render(<ExportDataScreen />);
      expect(getByText('Wellness screenings')).toBeTruthy();
      expect(queryByText(/\bPHI\b/)).toBeNull();
      expect(queryByText(/HIPAA/i)).toBeNull();

      // "clinical assessment" appears exactly once, and only inside the mandated
      // disclaimer, where it is NEGATED ("does not constitute ... a clinical
      // assessment"). Nothing this slice authored may use it affirmatively.
      const hits = getAllByText(/clinical assessment/i);
      expect(hits).toHaveLength(1);
      expect(hits[0]).toBe(getByTestId('export-preview-disclaimer'));
    });
  });
});
