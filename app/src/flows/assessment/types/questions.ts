/**
 * Clinical Assessment Questions - Validated Content
 * PHQ-9 and GAD-7 with exact regulatory-compliant wording
 * Source: Kroenke et al. (2001) for PHQ-9, Spitzer et al. (2006) for GAD-7
 */

import { PHQ9Question, GAD7Question } from './index';

// PHQ-9 Questions (Clinically Validated - Kroenke et al., 2001)
export const PHQ9_QUESTIONS: PHQ9Question[] = [
  {
    id: 'phq9_1',
    type: 'phq9',
    order: 1,
    text: 'Little interest or pleasure in doing things'
  },
  {
    id: 'phq9_2',
    type: 'phq9',
    order: 2,
    text: 'Feeling down, depressed, or hopeless'
  },
  {
    id: 'phq9_3',
    type: 'phq9',
    order: 3,
    text: 'Trouble falling or staying asleep, or sleeping too much'
  },
  {
    id: 'phq9_4',
    type: 'phq9',
    order: 4,
    text: 'Feeling tired or having little energy'
  },
  {
    id: 'phq9_5',
    type: 'phq9',
    order: 5,
    text: 'Poor appetite or overeating'
  },
  {
    id: 'phq9_6',
    type: 'phq9',
    order: 6,
    text: 'Feeling bad about yourself - or that you are a failure or have let yourself or your family down'
  },
  {
    id: 'phq9_7',
    type: 'phq9',
    order: 7,
    text: 'Trouble concentrating on things, such as reading the newspaper or watching television'
  },
  {
    id: 'phq9_8',
    type: 'phq9',
    order: 8,
    text: 'Moving or speaking so slowly that other people could have noticed. Or the opposite - being so fidgety or restless that you have been moving around a lot more than usual'
  },
  {
    id: 'phq9_9',
    type: 'phq9',
    order: 9,
    text: 'Thoughts that you would be better off dead, or of hurting yourself in some way'
  }
];

// GAD-7 Questions (Clinically Validated - Spitzer et al., 2006)
export const GAD7_QUESTIONS: GAD7Question[] = [
  {
    id: 'gad7_1',
    type: 'gad7',
    order: 1,
    text: 'Feeling nervous, anxious, or on edge'
  },
  {
    id: 'gad7_2',
    type: 'gad7',
    order: 2,
    text: 'Not being able to stop or control worrying'
  },
  {
    id: 'gad7_3',
    type: 'gad7',
    order: 3,
    text: 'Worrying too much about different things'
  },
  {
    id: 'gad7_4',
    type: 'gad7',
    order: 4,
    text: 'Trouble relaxing'
  },
  {
    id: 'gad7_5',
    type: 'gad7',
    order: 5,
    text: 'Being so restless that it is hard to sit still'
  },
  {
    id: 'gad7_6',
    type: 'gad7',
    order: 6,
    text: 'Becoming easily annoyed or irritable'
  },
  {
    id: 'gad7_7',
    type: 'gad7',
    order: 7,
    text: 'Feeling afraid, as if something awful might happen'
  }
];

// Assessment Instructions (MBCT-Compliant)
export const ASSESSMENT_INSTRUCTIONS = {
  PHQ9: {
    title: 'Mood Assessment',
    subtitle: 'A gentle check-in with your recent experiences',
    intro: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    guidance: 'There are no right or wrong answers. Simply notice what feels true for you right now.',
    completion: 'Thank you for taking this moment of awareness with yourself.'
  },
  GAD7: {
    title: 'Anxiety Assessment',
    subtitle: 'Noticing your relationship with worry and tension',
    intro: 'Over the last 2 weeks, how often have you been bothered by any of the following problems?',
    guidance: 'Observe your experiences with kindness and without judgment.',
    completion: 'You have honored your experience with mindful attention.'
  }
} as const;

// Severity Interpretations (Clinical Standards)
export const SEVERITY_INTERPRETATIONS = {
  PHQ9: {
    minimal: { range: [0, 4], label: 'Minimal Depression' },
    mild: { range: [5, 9], label: 'Mild Depression' },
    moderate: { range: [10, 14], label: 'Moderate Depression' },
    moderately_severe: { range: [15, 19], label: 'Moderately Severe Depression' },
    severe: { range: [20, 27], label: 'Severe Depression' }
  },
  GAD7: {
    minimal: { range: [0, 4], label: 'Minimal Anxiety' },
    mild: { range: [5, 9], label: 'Mild Anxiety' },
    moderate: { range: [10, 14], label: 'Moderate Anxiety' },
    severe: { range: [15, 21], label: 'Severe Anxiety' }
  }
} as const;