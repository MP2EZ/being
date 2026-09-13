/**
 * WellnessScreeningTrends - Wellness Screening Trend Visualization (FEAT-28 → FEAT-30)
 *
 * Displays PHQ-9 and GAD-7 wellness-screening scores over time as a longitudinal
 * line, with neutral severity reference bands, a time-range selector, neutral
 * 30-day comparison chips, and a within-control reflection prompt.
 *
 * FRAMING (philosopher-gated — these are non-negotiable):
 * - Scores are INFORMATION for reflection, never a grade. No "improving/declining",
 *   no %, no app-authored verdicts. The app surfaces; the user interprets.
 * - A rising score reads as AWARENESS, not failure (see the contextual note).
 * - No goal/target/projected line. Y axis is fixed to the full instrument range
 *   so small movements aren't dramatized.
 * - Severity bands are a single neutral gray at stepped opacity (depth, not a
 *   green→red stoplight). The card closes on a reflection prompt, not the number.
 *
 * COMPLIANCE (from docs/legal):
 * - Labels: "Mood Wellness Screening (PHQ-9)" / "Stress Wellness Screening (GAD-7)";
 *   section title "Wellness Screening Trends". Never "clinical assessment"/"diagnosis".
 * - Disclaimer displayed ABOVE charts (non-dismissible) with a 988 tap target.
 *   See WellnessDisclaimer's JSDoc for what "non-dismissible" was ruled to mean
 *   (DEBUG-406) and for the fact that the phrase is uncited beyond an internal
 *   FEAT-30 note — it constrains placement and permanence, not visibility under
 *   a transient overlay.
 * - No raw score values leave the device (no analytics on the values).
 *
 * @see /docs/product/FEAT-28-insights-design-plan.md
 * @see /docs/legal/Medical-Disclaimer.md
 */

import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
// Static import — the crisis path's no-lazy-import rule (CLAUDE.md).
import { openCrisisUrl } from '@/features/crisis/utils/openCrisisUrl';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  colorSystem,
  spacing,
  borderRadius,
  typography,
  semantic,
  severityBands,
  crisis,
  type SeverityBandKey,
} from '@/core/theme';
import type { AssessmentSession, AssessmentType } from '@/features/assessment/types';
import { useAssessmentStore } from '@/features/assessment/stores/assessmentStore';
import { useFeatureFlag } from '@/core/analytics';
import {
  getTrendPoints,
  compareWindows,
  downsample,
  spansMultipleWindows,
  PHQ9_MAX_SCORE,
  GAD7_MAX_SCORE,
  WELLNESS_LABELS,
  type TrendTimeRange,
  type TrendPoint,
  type WindowSummary,
} from '../utils/wellnessTrendData';
import SessionNoteComposer from './SessionNoteComposer';
import { useRootOverlay } from '@/core/navigation/rootOverlaySlot';

// ──────────────────────────────────────────────────────────────────────────────
// TYPES & PROPS
// ──────────────────────────────────────────────────────────────────────────────

interface WellnessScreeningTrendsProps {
  /** Full completed-assessment history (both instruments); filtered internally. */
  sessions: AssessmentSession[];
  /** Injectable clock for deterministic tests; defaults to now. */
  now?: number;
  /**
   * When true, the accessible per-point data list lists EVERY check-in in the
   * range instead of the downsampled subset (FEAT-196 full-history detail screen).
   * The chart polyline + its accessible summary stay downsampled regardless — only
   * the list expands, so "Each value is listed below" stays true and the SVG render
   * cost is unchanged. Default (false) keeps the in-dashboard card capped at 60.
   */
  fullHistory?: boolean;
}

// ──────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ──────────────────────────────────────────────────────────────────────────────

/** Compliance-approved labels live in the util as the single source of truth. */
const LABELS = WELLNESS_LABELS;

const TIME_RANGES: TrendTimeRange[] = ['week', 'month', 'quarter', 'all'];
const TIME_RANGE_LABELS: Record<TrendTimeRange, string> = {
  week: 'Week',
  month: 'Month',
  quarter: 'Quarter',
  all: 'All',
};

interface ReferenceBand {
  /** Lower score boundary (inclusive). Upper edge is the next band's `min`, or the instrument max. */
  min: number;
  label: string;
  severity: SeverityBandKey;
}

/** PHQ-9 clinical reference ranges (neutral context, NOT a judgement of the user). */
const PHQ9_BANDS: ReferenceBand[] = [
  { min: 0, label: 'Minimal', severity: 'minimal' },
  { min: 5, label: 'Mild', severity: 'mild' },
  { min: 10, label: 'Moderate', severity: 'moderate' },
  { min: 15, label: 'Mod. severe', severity: 'moderately_severe' },
  { min: 20, label: 'Severe', severity: 'severe' },
];

/** GAD-7 clinical reference ranges. */
const GAD7_BANDS: ReferenceBand[] = [
  { min: 0, label: 'Minimal', severity: 'minimal' },
  { min: 5, label: 'Mild', severity: 'mild' },
  { min: 10, label: 'Moderate', severity: 'moderate' },
  { min: 15, label: 'Severe', severity: 'severe' },
];

// SVG viewBox geometry (coordinates are unitless; the Svg scales to container width).
const VB_W = 300;
const VB_H = 132;
const PLOT_LEFT = 8;
const PLOT_RIGHT = 292; // full width — severity labels ride above their gridlines, not in a gutter
const PLOT_TOP = 14; // headroom for the top gridline's label
const PLOT_BOTTOM = 108; // below this is the x-axis label row

/** Brand accent for the data line/dots (the Insights amber — same token as DotCalendar). NOT severity-coded. */
const ACCENT = colorSystem.themes.morning.primary;

// ──────────────────────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────────────────────

const formatDate = (timestamp: number): string =>
  new Date(timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const mapY = (score: number, maxScore: number): number =>
  PLOT_TOP + (1 - score / maxScore) * (PLOT_BOTTOM - PLOT_TOP);

const mapX = (index: number, count: number): number =>
  count <= 1
    ? (PLOT_LEFT + PLOT_RIGHT) / 2
    : PLOT_LEFT + (index / (count - 1)) * (PLOT_RIGHT - PLOT_LEFT);

/** Human-readable range for a comparison window (e.g. "score 7" or "scores 5–11"). */
const formatWindowRange = (w: WindowSummary): string => {
  if (w.count === 0 || w.min === null || w.max === null) return '';
  return w.min === w.max ? ` · score ${w.min}` : ` · scores ${w.min}–${w.max}`;
};

const formatWindowChip = (prefix: string, w: WindowSummary): string => {
  const checkIns = w.count === 1 ? '1 check-in' : `${w.count} check-ins`;
  return `${prefix}: ${checkIns}${formatWindowRange(w)}`;
};

// ──────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ──────────────────────────────────────────────────────────────────────────────

/**
 * Required disclaimer (compliance-mandated). MUST appear ABOVE charts and be
 * non-dismissible. Exported so future trend surfaces render identical copy.
 *
 * WHAT "NON-DISMISSIBLE" MEANS — ruled by `compliance`, DEBUG-406.
 *
 * It means this cannot be PERMANENTLY or session-persistently removed from the
 * trends surface: no close control, no "don't show again", no swipe-to-hide. It
 * does NOT mean it must stay visible underneath a transient, user-initiated
 * overlay. `SessionNoteComposer` opens as a bottom sheet over this card and
 * covers it; that is not dismissal, and the disclaimer is back unchanged the
 * moment the sheet closes.
 *
 * The ruling holds only BECAUSE the thing this requirement protects — 988
 * reachability — is independently satisfied while the composer is open.
 * `Insights` and `WellnessTrendsDetail` are not in `RootCrisisButton`'s
 * SUPPRESSED_ROUTES, and since DEBUG-406 the composer renders into a root
 * overlay slot painted BEFORE that button, so the button is structurally on top.
 * The user loses sight of this inline link for the life of the sheet and never
 * loses 988 access. If either of those facts changes, the ruling is void.
 *
 * Do NOT "fix" a future finding here by adding a second 988 control inside the
 * composer. `__tests__/safety/crisis-zero-988-windows.test.tsx:44-50` records
 * that duplicating a Call-988 control on one screen was shipped, reverted, and
 * judged WORSE for screen-reader users than the gap it closed.
 *
 * PROVENANCE, recorded because it changes how much weight the wording carries:
 * "non-dismissible" is NOT traceable to a statute. `compliance` traced it to
 * `docs/development/FEAT-30-assessment-trends-exploration.md` §11 ("Required
 * Compliance Labels (Non-Negotiable) — From legal review"), which cites no
 * review and no provision, and it was copied verbatim into this file's header.
 * What IS independently grounded is FTC Act §5's clear-and-conspicuous
 * principle — which supports "above the charts, legible, not buried", not
 * "survives every later overlay". Treat the phrase as a real constraint on
 * placement and permanence, and as uncited beyond that.
 */
export const WellnessDisclaimer: React.FC = () => (
  <View style={styles.disclaimerContainer}>
    <Text style={styles.disclaimerText}>
      These trends show your PHQ-9 and GAD-7 self-monitoring scores over time.
    </Text>
    <Text style={styles.disclaimerText}>
      <Text style={styles.disclaimerBold}>Important:</Text> These are wellness
      screening tools for personal awareness, not clinical assessments or
      diagnoses. Always consult a licensed healthcare provider to discuss your
      mental health.
    </Text>
    <Text style={styles.disclaimerText}>
      If you're experiencing severe symptoms or a crisis, call or text{' '}
      <Text
        style={styles.crisisLink}
        // Guarded dial (DEBUG-314) — canOpenURL check, manual-dial fallback
        // Alert and CRISIS audit log. The existing test only asserts this tap
        // target renders with its a11y label; nothing asserted it ever dialed,
        // which is precisely why a silent failure here was invisible.
        onPress={() => { void openCrisisUrl('tel:988', { manualLabel: '988' }); }}
        accessibilityRole="link"
        accessibilityLabel="Call or text 988 for immediate support"
      >
        988
      </Text>{' '}
      for immediate support.
    </Text>
  </View>
);

interface TimeRangeSelectorProps {
  selected: TrendTimeRange;
  onSelect: (range: TrendTimeRange) => void;
}

const TimeRangeSelector: React.FC<TimeRangeSelectorProps> = ({ selected, onSelect }) => (
  <View style={styles.timeRangeContainer}>
    {TIME_RANGES.map((range) => (
      <TouchableOpacity
        key={range}
        style={[styles.timeRangeButton, selected === range && styles.timeRangeButtonSelected]}
        onPress={() => onSelect(range)}
        accessibilityRole="tab"
        accessibilityState={{ selected: selected === range }}
        accessibilityLabel={`View ${TIME_RANGE_LABELS[range].toLowerCase()}`}
      >
        <Text style={[styles.timeRangeText, selected === range && styles.timeRangeTextSelected]}>
          {TIME_RANGE_LABELS[range]}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

interface TrendLineProps {
  points: TrendPoint[];
  maxScore: number;
  bands: ReferenceBand[];
  title: string;
}

/**
 * Static SVG line over fixed reference bands. No animation (so reduce-motion is
 * satisfied trivially), no goal line. Marked as a single accessible image with a
 * verdict-free summary; the per-point detail lives in the data list below it.
 */
const TrendLine: React.FC<TrendLineProps> = ({ points, maxScore, bands, title }) => {
  const polyline = points.map((p, i) => `${mapX(i, points.length)},${mapY(p.score, maxScore)}`).join(' ');

  const scores = points.map((p) => p.score);
  const lo = Math.min(...scores);
  const hi = Math.max(...scores);
  const summary =
    `${title} over time. ${points.length} check-ins shown, ` +
    `${lo === hi ? `score ${lo}` : `scores ${lo} to ${hi}`} of ${maxScore}. ` +
    `Each value is listed below.`;

  return (
    <View accessible accessibilityRole="image" accessibilityLabel={summary}>
      <Svg width="100%" height={160} viewBox={`0 0 ${VB_W} ${VB_H}`}>
        {/* Neutral reference grid: a hairline at each clinical-range boundary, with
            the range name riding just above it. Depth/context, not a stoplight. */}
        {bands.map((band) => {
          if (band.min === 0) return null; // the floor needs no boundary line
          const y = mapY(band.min, maxScore);
          return (
            <React.Fragment key={band.severity}>
              <Line
                x1={PLOT_LEFT}
                y1={y}
                x2={PLOT_RIGHT}
                y2={y}
                stroke={severityBands.gridline}
                strokeWidth={1}
              />
              <SvgText x={PLOT_LEFT} y={y - 3} fontSize={7} fill={severityBands.label}>
                {band.label}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Connecting line (brand amber). */}
        {points.length > 1 && (
          <Polyline
            points={polyline}
            fill="none"
            stroke={ACCENT}
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        )}

        {/* Data points: hollow amber rings; the most recent is filled to anchor the eye. */}
        {points.map((p, i) => {
          const isLast = i === points.length - 1;
          return (
            <Circle
              key={p.timestamp}
              cx={mapX(i, points.length)}
              cy={mapY(p.score, maxScore)}
              r={3}
              fill={isLast ? ACCENT : colorSystem.base.white}
              stroke={ACCENT}
              strokeWidth={2}
            />
          );
        })}

        {/* First/last date anchors only (avoids crowding; full dates are in the list). */}
        {points.length > 0 && (
          <>
            <SvgText x={PLOT_LEFT} y={VB_H - 4} fontSize={7} fill={semantic.text.muted}>
              {formatDate(points[0]!.timestamp)}
            </SvgText>
            {points.length > 1 && (
              <SvgText
                x={PLOT_RIGHT}
                y={VB_H - 4}
                fontSize={7}
                fill={semantic.text.muted}
                textAnchor="end"
              >
                {formatDate(points[points.length - 1]!.timestamp)}
              </SvgText>
            )}
          </>
        )}
      </Svg>
    </View>
  );
};

interface TrendChartProps {
  title: string;
  type: AssessmentType;
  sessions: AssessmentSession[];
  range: TrendTimeRange;
  maxScore: number;
  bands: ReferenceBand[];
  now: number;
  /** List every check-in (skip the list downsample); chart stays downsampled. */
  fullHistory?: boolean;
  /** FEAT-195: when true, each data row exposes the "Your note" affordance. */
  notesEnabled?: boolean;
  /** Opens the note composer for a given check-in's session. */
  onEditNote?: (session: AssessmentSession, subtitle: string) => void;
}

const TrendChart: React.FC<TrendChartProps> = ({
  title,
  type,
  sessions,
  range,
  maxScore,
  bands,
  now,
  fullHistory = false,
  notesEnabled = false,
  onEditNote,
}) => {
  // Map a charted point back to its source session (for the note id + text).
  // Keyed by startedAt, which is exactly TrendPoint.timestamp — keeps notes off
  // the verdict-free TrendPoint while still resolving per-row.
  const sessionByTimestamp = useMemo(() => {
    const m = new Map<number, AssessmentSession>();
    for (const s of sessions) {
      if (s.type === type && s.result) m.set(s.progress.startedAt, s);
    }
    return m;
  }, [sessions, type]);
  const allPoints = useMemo(
    () => getTrendPoints(sessions, type, 'all', now),
    [sessions, type, now]
  );
  // Chart geometry + its accessible summary always render the downsampled series
  // (render cost is fixed; the SVG can't legibly show hundreds of points anyway).
  const rangePoints = useMemo(
    () => downsample(getTrendPoints(sessions, type, range, now)),
    [sessions, type, range, now]
  );
  // The accessible data list shows every point when fullHistory is set (FEAT-196),
  // otherwise it mirrors the charted subset. A superset of rangePoints either way,
  // so the chart summary's "Each value is listed below" stays accurate.
  const listPoints = useMemo(
    () => (fullHistory ? getTrendPoints(sessions, type, range, now) : rangePoints),
    [fullHistory, sessions, type, range, now, rangePoints]
  );
  const comparison = useMemo(() => compareWindows(allPoints, now), [allPoints, now]);

  if (allPoints.length === 0) return null;

  // Single-point state — a pattern needs more than one check-in; no line/comparison.
  if (allPoints.length === 1) {
    const only = allPoints[0]!;
    return (
      <View style={styles.chartContainer}>
        <Text style={styles.chartTitle}>{title}</Text>
        <View
          style={styles.singlePoint}
          accessible
          accessibilityLabel={`${title}: one check-in, ${formatDate(only.timestamp)}, score ${only.score} of ${maxScore}, ${only.severity} range.`}
        >
          <View style={styles.singleDot} />
          <Text style={styles.singlePointScore}>
            {only.score} of {maxScore}
          </Text>
        </View>
        <Text style={styles.sparseText}>
          One check-in so far. A pattern takes shape over time — there's no schedule to keep.
        </Text>
      </View>
    );
  }

  const isRising =
    rangePoints.length >= 2 && rangePoints[rangePoints.length - 1]!.score > rangePoints[0]!.score;

  return (
    <View style={styles.chartContainer}>
      <Text style={styles.chartTitle}>{title}</Text>

      {rangePoints.length === 0 ? (
        <Text style={styles.sparseText}>No check-ins in the selected window.</Text>
      ) : (
        <>
          <TrendLine points={rangePoints} maxScore={maxScore} bands={bands} title={title} />

          {/* Accessible per-point data list (the screen-reader path + the detail surface).
              Lists every check-in when fullHistory is set; the charted subset otherwise.
              FEAT-195: when notesEnabled, each row also exposes a "Your note" affordance. */}
          <View style={styles.dataList}>
            {[...listPoints].reverse().map((p) => {
              const scoreLabel = `${formatDate(p.timestamp)}: score ${p.score} of ${maxScore}, ${p.severity} range.`;
              const session = notesEnabled ? sessionByTimestamp.get(p.timestamp) : undefined;
              const note = session?.note;

              const rowBody = (
                <>
                  <View style={styles.dataRowTop}>
                    <View style={styles.dataRowLeft}>
                      <View style={styles.dataRowDot} />
                      <Text style={styles.dataRowDate}>{formatDate(p.timestamp)}</Text>
                    </View>
                    <Text style={styles.dataRowScore}>
                      {p.score} of {maxScore} · {p.severity}
                    </Text>
                  </View>
                  {session && (
                    note ? (
                      <Text style={styles.noteText} numberOfLines={2}>
                        {note}
                      </Text>
                    ) : (
                      <Text style={styles.addNoteText}>Add a note</Text>
                    )
                  )}
                </>
              );

              // Notes off, or (defensively) no session resolved → original static row.
              if (!session || !onEditNote) {
                return (
                  <View
                    key={p.timestamp}
                    style={styles.dataRow}
                    accessible
                    accessibilityLabel={scoreLabel}
                  >
                    {rowBody}
                  </View>
                );
              }

              return (
                <TouchableOpacity
                  key={p.timestamp}
                  style={styles.dataRow}
                  onPress={() => onEditNote(session, formatDate(p.timestamp))}
                  accessibilityRole="button"
                  accessibilityLabel={
                    note
                      ? `${scoreLabel} Your note: ${note}.`
                      : `${scoreLabel} No note yet.`
                  }
                  accessibilityHint={note ? 'Edit your note' : 'Add a note'}
                >
                  {rowBody}
                </TouchableOpacity>
              );
            })}
          </View>
        </>
      )}

      {/* Neutral 30-day comparison chips (counts + raw ranges, no delta/direction). */}
      {(comparison.current.count > 0 || comparison.previous.count > 0) && (
        <View style={styles.chipRow}>
          {comparison.current.count > 0 && (
            <Text style={styles.chip}>{formatWindowChip('Last 30 days', comparison.current)}</Text>
          )}
          {comparison.previous.count > 0 && (
            <Text style={styles.chip}>
              {formatWindowChip('Previous 30 days', comparison.previous)}
            </Text>
          )}
        </View>
      )}

      {/* Awareness reframe for a rising trend (never "you're worse"). */}
      {isRising && (
        <Text style={styles.risingNote}>
          Scores can rise when you're paying closer attention to how you feel. Noticing more isn't
          getting worse — you can only work with what you're aware of.
        </Text>
      )}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ──────────────────────────────────────────────────────────────────────────────

const WellnessScreeningTrends: React.FC<WellnessScreeningTrendsProps> = ({
  sessions,
  now,
  fullHistory = false,
}) => {
  const clock = now ?? Date.now();
  // Default to the full history; narrowing is opt-in via the selector.
  const [range, setRange] = useState<TrendTimeRange>('all');

  // FEAT-195 — "Your note" annotations (runtime flag, ships dark; UI visibility
  // only — the note's encryption/consent/delete paths are independent).
  const notesEnabled = useFeatureFlag('wellness_trend_notes');
  const setSessionNote = useAssessmentStore((s) => s.setSessionNote);
  const clearSessionNote = useAssessmentStore((s) => s.clearSessionNote);
  const [editing, setEditing] = useState<{ session: AssessmentSession; subtitle: string } | null>(
    null
  );

  const hasPhq9 = useMemo(() => sessions.some((s) => s.type === 'phq9' && s.result), [sessions]);
  const hasGad7 = useMemo(() => sessions.some((s) => s.type === 'gad7' && s.result), [sessions]);
  // Only surface the selector once it would actually change what's shown.
  const showSelector = useMemo(() => spansMultipleWindows(sessions, clock), [sessions, clock]);

  const handleEditNote = (session: AssessmentSession, subtitle: string): void =>
    setEditing({ session, subtitle });

  // DEBUG-406 — publish into the root overlay slot. Declared before the early
  // return below so hook order stays stable across renders.
  useRootOverlay('session-note-composer', notesEnabled && editing !== null, () => (
    <SessionNoteComposer
      visible
      initialText={editing?.session.note ?? ''}
      subtitle={editing?.subtitle}
      onSave={async (text) => {
        if (editing) await setSessionNote(editing.session.id, text);
        setEditing(null);
      }}
      onDelete={async () => {
        if (editing) await clearSessionNote(editing.session.id);
        setEditing(null);
      }}
      onCancel={() => setEditing(null)}
    />
  ),
  // DEBUG-575 finding 2 — the slot is revoked when a crisis route becomes
  // active, so close rather than re-publishing over CrisisResources on return.
  // No draft preservation here: unlike the weekly reflection, this composer
  // edits an EXISTING stored note and its text is already persisted.
  () => setEditing(null));

  // Don't show the section until there's at least one completed screening.
  if (!hasPhq9 && !hasGad7) return null;

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>{LABELS.sectionTitle}</Text>

      {/* Disclaimer — REQUIRED above charts, non-dismissible. */}
      <WellnessDisclaimer />

      {showSelector && <TimeRangeSelector selected={range} onSelect={setRange} />}

      {hasPhq9 && (
        <TrendChart
          title={LABELS.phq9}
          type="phq9"
          sessions={sessions}
          range={range}
          maxScore={PHQ9_MAX_SCORE}
          bands={PHQ9_BANDS}
          now={clock}
          fullHistory={fullHistory}
          notesEnabled={notesEnabled}
          onEditNote={handleEditNote}
        />
      )}

      {hasPhq9 && hasGad7 && <View style={styles.instrumentDivider} />}

      {hasGad7 && (
        <TrendChart
          title={LABELS.gad7}
          type="gad7"
          sessions={sessions}
          range={range}
          maxScore={GAD7_MAX_SCORE}
          bands={GAD7_BANDS}
          now={clock}
          fullHistory={fullHistory}
          notesEnabled={notesEnabled}
          onEditNote={handleEditNote}
        />
      )}

      {/* Within-control handoff (Sphere Sovereignty) — the card closes here, not on a number. */}
      <Text style={styles.reflectionPrompt}>
        Looking at this, what stands out to you? What was happening in your life around these
        check-ins?
      </Text>

      {/* DEBUG-406: the composer renders into the ROOT overlay slot, published by
          `useRootOverlay` above — not here. This component is mounted by TWO
          screens (InsightsScreen and WellnessTrendsDetailScreen), inside a card
          inside a ScrollView in both. RN resolves `position: 'absolute'` against
          the parent's padding box, so an inline full-bleed overlay would cover
          the card, scroll with the content, and be clipped on Android. The slot
          also guarantees it paints below the crisis button. */}
    </View>
  );
};

// ──────────────────────────────────────────────────────────────────────────────
// STYLES
// ──────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
    // MAINT-263: hairline so the card stays defined on the now-white screen surface.
    borderWidth: 1,
    borderColor: semantic.border.default,
    padding: spacing[16],
    marginBottom: spacing[16],
  },
  sectionTitle: {
    fontSize: typography.headline4.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  disclaimerContainer: {
    backgroundColor: colorSystem.gray[50],
    borderRadius: borderRadius.small,
    padding: spacing[12],
    marginBottom: spacing[16],
    borderLeftWidth: 3,
    borderLeftColor: colorSystem.gray[300],
  },
  disclaimerText: {
    fontSize: typography.caption.size,
    color: semantic.text.muted,
    // MAINT-224: absolute lineHeight literals (here and below) left as-is — DS gap.
    // No standalone line-height token scale exists in the design system (typography
    // variants expose only unitless multipliers); not forced onto another token.
    lineHeight: 18,
    marginBottom: spacing[8],
  },
  disclaimerBold: {
    fontWeight: typography.fontWeight.semibold,
  },
  crisisLink: {
    color: crisis,
    fontWeight: typography.fontWeight.semibold,
    textDecorationLine: 'underline',
  },
  // Segmented control — matches DotCalendar / PrincipleEngagementChart exactly.
  timeRangeContainer: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.small,
    padding: spacing[4],
    marginBottom: spacing[16],
  },
  timeRangeButton: {
    flex: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[12],
    borderRadius: borderRadius.small,
    alignItems: 'center',
  },
  timeRangeButtonSelected: {
    backgroundColor: colorSystem.base.white,
    shadowColor: colorSystem.base.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  timeRangeText: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.medium,
    // DEBUG-323: was raw colorSystem.gray[500] — 1.90:1 on the gray[100]
    // segmented-control track, i.e. worse than the token defect this item
    // fixes, and bypassing the token entirely so the token fix would not have
    // reached it. Routed through the corrected token.
    color: semantic.text.muted,
  },
  timeRangeTextSelected: {
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  chartContainer: {
    marginBottom: spacing[8],
  },
  instrumentDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colorSystem.gray[300],
    marginVertical: spacing[16],
  },
  chartTitle: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
    marginBottom: spacing[12],
  },
  dataList: {
    marginTop: spacing[12],
  },
  dataRow: {
    justifyContent: 'center',
    minHeight: 44, // ≥44pt tap/focus target (WCAG)
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colorSystem.gray[300],
  },
  dataRowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  noteText: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    marginTop: spacing[4],
    lineHeight: 18,
  },
  addNoteText: {
    fontSize: typography.caption.size,
    color: semantic.text.muted,
    marginTop: spacing[4],
    fontStyle: 'italic',
  },
  dataRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  dataRowDot: {
    width: 6,
    height: 6,
    borderRadius: borderRadius.full,
    backgroundColor: ACCENT,
  },
  dataRowDate: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
  },
  dataRowScore: {
    fontSize: typography.caption.size,
    color: semantic.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
    marginTop: spacing[16],
  },
  chip: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.small,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[8],
    overflow: 'hidden',
  },
  risingNote: {
    fontSize: typography.caption.size,
    color: semantic.text.secondary,
    lineHeight: 18,
    marginTop: spacing[12],
    fontStyle: 'italic',
  },
  singlePoint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
    marginVertical: spacing[8],
  },
  singleDot: {
    width: 12,
    height: 12,
    borderRadius: borderRadius.full,
    backgroundColor: ACCENT,
  },
  singlePointScore: {
    fontSize: typography.bodySmall.size,
    fontWeight: typography.fontWeight.semibold,
    color: semantic.text.primary,
  },
  sparseText: {
    fontSize: typography.caption.size,
    color: semantic.text.muted,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  reflectionPrompt: {
    fontSize: typography.bodySmall.size,
    color: semantic.text.secondary,
    lineHeight: 22,
    marginTop: spacing[8],
  },
});

export default WellnessScreeningTrends;
