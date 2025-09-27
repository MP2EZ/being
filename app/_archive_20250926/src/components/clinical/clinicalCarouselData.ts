/**
 * Clinical Carousel Sample Data
 *
 * Sample data structure for clinical carousel based on the HTML implementation.
 * Used for development and testing of the React Native components.
 */

import { ClinicalCarouselData } from './types';

export const clinicalCarouselData: ClinicalCarouselData[] = [
  {
    id: 'assessment-tools',
    title: 'Clinical Assessment Tools',
    subtitle: 'Hospital-grade diagnostic instruments used by mental health professionals worldwide',
    content: {
      headline: 'Track Real Progress with Clinical Precision',
      description: 'Being. includes the same validated assessments used in hospitals and clinics worldwide. Monitor your mental health with scientifically-proven tools.',
      bullets: [
        'PHQ-9 for depression screening (9 questions, 3 minutes)',
        'GAD-7 for anxiety assessment (7 questions, 2 minutes)',
        'Weekly progress tracking with severity classification',
        'Automatic crisis threshold detection',
        'Export reports for therapy sessions'
      ],
      callToAction: {
        text: 'Try Assessment Demo',
        action: 'demo-assessment'
      }
    },
    visual: {
      type: 'assessment',
      data: {
        score: 7,
        maxScore: 27,
        severity: 'Mild',
        assessmentType: 'PHQ-9',
        interpretation: 'Mild depression symptoms detected. Regular monitoring recommended.',
        questions: [
          {
            number: 1,
            text: 'Little interest or pleasure in doing things',
            selectedOption: 2,
            options: ['Not at all', 'Several days', 'More than half', 'Nearly every day']
          },
          {
            number: 2,
            text: 'Feeling down, depressed, or hopeless',
            selectedOption: 1,
            options: ['Not at all', 'Several days', 'More than half', 'Nearly every day']
          }
        ]
      }
    },
    metrics: [
      {
        value: '95%',
        label: 'Clinical Accuracy',
        description: 'Matches hospital assessment results',
        source: 'Internal validation study, N=1,247'
      }
    ]
  },
  {
    id: 'proven-results',
    title: 'Evidence-Based Outcomes That Matter',
    subtitle: 'Measurable improvements in mental health symptoms backed by clinical research',
    content: {
      headline: '43% Reduction in Depression Relapse',
      description: 'Real-world evidence from thousands of users completing the 8-week MBCT journey. Being. delivers measurable mental health improvements.',
      bullets: [
        '43% reduction in depression relapse rates',
        '67% of users report significant anxiety improvement',
        '8-week structured MBCT curriculum',
        '15 minutes daily practice commitment',
        '85% completion rate among active users'
      ],
      callToAction: {
        text: 'Start 8-Week Journey',
        action: 'start-program'
      }
    },
    visual: {
      type: 'chart',
      data: {
        chartType: 'bar',
        title: 'Relapse Reduction in MBCT Users',
        yAxisLabel: 'Relapse Rate (%)',
        timeframe: '12-month follow-up',
        dataPoints: [
          { label: 'Standard Care', value: 64, color: '#F56565' },
          { label: 'MBCT + Being.', value: 21, color: '#48BB78' }
        ],
        highlightValue: {
          value: '43%',
          description: 'Reduction in Depression Relapse'
        }
      }
    },
    metrics: [
      {
        value: '8 weeks',
        label: 'Program Length',
        description: 'Complete MBCT curriculum',
        source: 'Based on Segal, Williams & Teasdale protocol'
      },
      {
        value: '3,247',
        label: 'Study Participants',
        description: 'Real-world effectiveness data',
        source: 'Being. user outcomes study 2024'
      }
    ]
  },
  {
    id: 'pattern-recognition',
    title: 'Recognize Patterns Before They Become Crises',
    subtitle: 'AI-powered early warning system that learns your unique mental health patterns',
    content: {
      headline: 'Early Warning System for Mental Health',
      description: 'Advanced pattern recognition identifies concerning trends 2-3 weeks before crisis episodes, enabling proactive intervention.',
      bullets: [
        'AI learns your unique warning signs and triggers',
        'Early detection 2-3 weeks before crisis episodes',
        'Personalized intervention recommendations',
        'Integration with sleep, stress, and social patterns',
        'Proactive MBCT exercise suggestions'
      ],
      callToAction: {
        text: 'View Pattern Analysis',
        action: 'pattern-demo'
      }
    },
    visual: {
      type: 'timeline',
      data: {
        timeframe: 'Last 30 Days',
        dataPoints: [
          { position: 10, mood: 'good' },
          { position: 20, mood: 'good' },
          { position: 35, mood: 'moderate' },
          { position: 45, mood: 'concerning' },
          { position: 55, mood: 'concerning', hasWarning: true, warningType: 'Pattern Alert' },
          { position: 70, mood: 'moderate' },
          { position: 85, mood: 'good' },
          { position: 95, mood: 'good' }
        ],
        zones: [
          { name: 'Good', level: 'good' },
          { name: 'Moderate', level: 'moderate' },
          { name: 'Concerning', level: 'concerning' }
        ],
        annotations: [
          {
            position: 55,
            text: 'Pattern Alert: Sleep disruption detected',
            type: 'warning'
          }
        ]
      }
    },
    metrics: [
      {
        value: '87%',
        label: 'Pattern Accuracy',
        description: 'Successfully predicts concerning episodes',
        source: 'Machine learning validation study, N=2,156'
      }
    ]
  }
];

export const mockClinicalMetrics = {
  assessmentAccuracy: '95%',
  userSatisfaction: '4.8/5',
  clinicalValidation: 'Hospital-grade',
  dataPrivacy: 'HIPAA-ready',
  completionRate: '85%',
  averageImprovement: '43%'
};

export const mockFeatureFlags = {
  showBreathingAnimation: true,
  enablePatternAnalysis: true,
  showClinicalMetrics: true,
  enableAccessibilityFeatures: true,
  respectReducedMotion: true
};