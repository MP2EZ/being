/**
 * Compliance-approved user-facing screening copy (single source of truth — the
 * legal review pins these exact strings; do not fork them per-screen).
 *
 * Moved here from `insights/utils/wellnessTrendData.ts` in MAINT-615 so the
 * assessment and profile surfaces can title the screenings without importing
 * from insights. That module re-exports these names, so the trends component
 * and the export snapshot still read the same strings.
 */
export const WELLNESS_LABELS = {
  sectionTitle: 'Wellness Screening Trends',
  phq9: 'Mood Wellness Screening (PHQ-9)',
  gad7: 'Stress Wellness Screening (GAD-7)',
} as const;

/**
 * In-app not-a-diagnosis line for the results screen (MAINT-615). Plain and
 * factual by ruling: no Stoic framing, no minimizers, and it points toward
 * professional support rather than away from it.
 */
export const WELLNESS_SCREENING_NOT_A_DIAGNOSIS =
  'This is a wellness screening, not a diagnosis. A mental health professional can help you understand your results.';
