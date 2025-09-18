/**
 * FullMind Website - Site Configuration
 * Central configuration for site metadata, navigation, and features
 */

import { type SiteConfig, type NavigationItem, type TrialConfig } from '@/types';

// ============================================================================
// 21-DAY TRIAL CONFIGURATION
// ============================================================================

/**
 * Comprehensive 21-day trial configuration
 * Clinical-grade trial system with conversion optimization
 */
export const trialConfig: TrialConfig = {
  duration: {
    days: 21,
    displayText: '21-day',
    maxDays: 30,
    minDays: 7
  },
  messaging: {
    primary: 'Experience 21 Days of Complete MBCT Practice',
    secondary: '21-Day Journey Through Evidence-Based Mindfulness',
    cta: {
      primary: 'Start 21-Day Free Trial',
      secondary: 'Learn About Our 21-Day Program',
      variants: [
        {
          id: 'urgency',
          text: 'Begin Your 21-Day Transformation',
          variant: 'primary',
          weight: 0.3,
          context: 'all'
        },
        {
          id: 'benefit',
          text: 'Unlock 21 Days of Mental Wellness',
          variant: 'primary', 
          weight: 0.3,
          context: 'hero'
        },
        {
          id: 'clinical',
          text: 'Access 21-Day Clinical Program',
          variant: 'primary',
          weight: 0.2,
          context: 'pricing'
        },
        {
          id: 'simple',
          text: 'Try Free for 21 Days',
          variant: 'outline',
          weight: 0.2,
          context: 'mobile'
        }
      ]
    },
    features: '21-day free trial • No credit card required • Full MBCT access',
    disclaimer: 'Individual results may vary. Not a substitute for professional medical advice.',
    benefits: [
      'Complete 21-day MBCT program with daily guided practices',
      'PHQ-9 and GAD-7 clinical assessments with progress tracking',
      '24/7 crisis support and safety protocols throughout trial',
      'Advanced mood analytics and personalized therapeutic insights',
      'Evidence-based breathing techniques and mindfulness exercises'
    ],
    urgency: {
      enabled: true,
      message: 'Join 10,000+ people who started their 21-day transformation this month',
      threshold: 30,
      context: ['hero', 'pricing']
    },
    social: {
      enabled: true,
      userCount: '10,000+',
      professionalCount: '500+',
      recentSignups: '127 people started their 21-day journey today'
    }
  },
  legal: {
    terms: 'Free trial includes full access to all MBCT practices, clinical assessments, and crisis support features',
    cancellation: 'Cancel anytime during your 21-day trial period with no charges or commitments',
    requirements: 'No credit card required for trial access • Instant activation • Complete privacy protection',
    privacyNotice: 'Your trial data is encrypted and never shared with third parties',
    dataHandling: 'All trial usage data is anonymized and used only to improve your therapeutic experience',
    compliance: {
      hipaaReady: true,
      gdprCompliant: true,
      coppaCompliant: true,
      calOPPACompliant: true,
      clinicalDisclaimer: 'This app provides educational content and therapeutic tools but is not a substitute for professional mental health treatment. In case of mental health emergency, contact 988 immediately.'
    }
  },
  features: {
    included: [
      {
        id: 'mbct-program',
        name: 'Complete 21-Day MBCT Program',
        description: 'Full access to evidence-based mindfulness-based cognitive therapy practices',
        clinicalValue: 'Proven to reduce depression relapse by 43% in clinical trials',
        accessLevel: 'full'
      },
      {
        id: 'clinical-assessments',
        name: 'PHQ-9 & GAD-7 Assessments',
        description: 'Validated clinical tools for depression and anxiety screening',
        clinicalValue: 'Gold standard assessments used by healthcare professionals',
        accessLevel: 'full'
      },
      {
        id: 'crisis-support',
        name: '24/7 Crisis Support Access',
        description: 'Immediate access to crisis hotlines and safety resources',
        clinicalValue: 'Critical safety net for mental health emergencies',
        accessLevel: 'full'
      },
      {
        id: 'breathing-practices',
        name: '3-Minute Breathing Space',
        description: 'Core MBCT breathing techniques for stress reduction',
        clinicalValue: 'Scientifically validated stress interruption technique',
        accessLevel: 'full'
      },
      {
        id: 'mood-tracking',
        name: 'Advanced Mood Analytics',
        description: 'Daily mood tracking with personalized insights and patterns',
        clinicalValue: 'Enables self-awareness and therapeutic progress monitoring',
        accessLevel: 'full'
      }
    ],
    excluded: [],
    limitations: []
  },
  conversion: {
    tracking: {
      events: [
        {
          name: 'trial_started',
          category: 'trial',
          properties: {
            trial_length: 21,
            source: 'website'
          },
          clinicalImportance: 'critical'
        },
        {
          name: 'trial_engagement_day_1',
          category: 'engagement',
          properties: {
            first_session: true,
            assessment_completed: false
          },
          clinicalImportance: 'critical'
        },
        {
          name: 'assessment_completed',
          category: 'engagement',
          properties: {
            assessment_type: 'PHQ-9',
            trial_day: 0
          },
          clinicalImportance: 'critical'
        },
        {
          name: 'breathing_practice_completed',
          category: 'engagement',
          properties: {
            practice_duration: 180,
            completion_rate: 1.0
          },
          clinicalImportance: 'important'
        },
        {
          name: 'trial_completion',
          category: 'conversion',
          properties: {
            days_active: 0,
            practices_completed: 0
          },
          clinicalImportance: 'critical'
        }
      ],
      goals: [
        {
          id: 'day_1_engagement',
          name: 'First Day Engagement',
          description: 'User completes initial assessment within 24 hours',
          target: 75,
          timeframe: 'immediate'
        },
        {
          id: 'week_1_retention',
          name: 'Week 1 Retention',
          description: 'User remains active through first week',
          target: 60,
          timeframe: 'trial-period'
        },
        {
          id: 'trial_completion',
          name: '21-Day Trial Completion',
          description: 'User completes full 21-day trial period',
          target: 45,
          timeframe: 'trial-period'
        },
        {
          id: 'subscription_conversion',
          name: 'Trial to Paid Conversion',
          description: 'User converts to paid subscription',
          target: 25,
          timeframe: 'post-trial'
        }
      ],
      attribution: {
        enabled: true,
        models: ['first-click', 'last-click'],
        lookbackWindow: 30
      }
    },
    optimization: {
      abTesting: {
        enabled: true,
        tests: [
          {
            id: 'trial_length_test',
            name: '21-Day vs 14-Day Trial Length',
            description: 'Testing optimal trial duration for conversion',
            variants: [
              {
                id: 'control_21_day',
                name: '21-Day Control',
                allocation: 0.7,
                config: {}
              },
              {
                id: 'variant_14_day',
                name: '14-Day Variant',
                allocation: 0.3,
                config: {
                  duration: {
                    days: 14,
                    displayText: '14-day',
                    maxDays: 30,
                    minDays: 7
                  }
                }
              }
            ],
            trafficAllocation: 0.2,
            status: 'draft'
          }
        ],
        defaultExperience: 'control'
      },
      personalization: {
        enabled: false,
        segments: [],
        rules: []
      },
      timing: {
        delayedOffers: false,
        exitIntent: {
          enabled: true,
          message: 'Wait! Start your 21-day transformation before you go',
          offer: 'Get instant access to our complete MBCT program',
          delay: 1000
        },
        scrollTriggers: [
          {
            id: 'pricing_highlight',
            threshold: 80,
            message: 'Ready to begin your 21-day journey?',
            action: 'highlight'
          }
        ],
        timeBasedTriggers: [
          {
            id: 'engagement_reminder',
            delay: 45,
            message: 'Join thousands who have transformed their mental health in just 21 days',
            action: 'banner'
          }
        ]
      }
    },
    retargeting: {
      email: {
        enabled: false,
        sequences: [],
        triggers: []
      },
      ads: {
        enabled: false,
        platforms: [],
        audiences: [],
        campaigns: []
      },
      push: {
        enabled: false,
        notifications: [],
        triggers: []
      }
    }
  }
} as const;

// ============================================================================
// SITE METADATA & CONFIGURATION
// ============================================================================

export const siteConfig: SiteConfig = {
  name: 'FullMind',
  description: 'Clinical-grade mental health support through evidence-based MBCT practices. Transform your relationship with thoughts and emotions.',
  url: 'https://fullmind.app',
  ogImage: 'https://fullmind.app/og-image.jpg',
  links: {
    appStore: 'https://apps.apple.com/app/fullmind',
    playStore: 'https://play.google.com/store/apps/details?id=com.fullmind.app',
    github: 'https://github.com/fullmind-app',
    support: 'mailto:support@fullmind.app'
  },
  trial: trialConfig
} as const;

// ============================================================================
// NAVIGATION CONFIGURATION
// ============================================================================

export const mainNavigation: readonly NavigationItem[] = [
  {
    title: 'Features',
    href: '#features',
    description: 'Discover our evidence-based mental health tools'
  },
  {
    title: 'Clinical Evidence',
    href: '#clinical',
    description: 'Research-backed MBCT practices and outcomes'
  },
  {
    title: 'For Therapists',
    href: '#therapists',
    description: 'Professional tools and client progress monitoring'
  },
  {
    title: 'Pricing',
    href: '#pricing',
    description: 'Accessible mental health support for everyone'
  },
  {
    title: 'About',
    href: '/about',
    description: 'Our mission to democratize mental health care'
  }
] as const;

export const footerNavigation: readonly NavigationItem[] = [
  // Product links
  {
    title: 'Features',
    href: '#features'
  },
  {
    title: 'Clinical Evidence',
    href: '#clinical'
  },
  {
    title: 'Pricing',
    href: '#pricing'
  },
  
  // Resources links
  {
    title: 'Help Center',
    href: '/help'
  },
  {
    title: 'Crisis Resources',
    href: '/crisis'
  },
  {
    title: 'About',
    href: '/about'
  },
  
  // Company links
  {
    title: 'Contact',
    href: '/contact'
  },
  {
    title: 'Privacy Policy',
    href: '/privacy'
  },
  {
    title: 'Terms of Service',
    href: '/terms'
  },
  {
    title: 'HIPAA Notice',
    href: '/hipaa'
  }
] as const;

// ============================================================================
// FEATURE CONFIGURATION
// ============================================================================

export const features = [
  {
    id: 'morning-checkin',
    title: 'Morning Check-in',
    description: 'Start your day with mindful awareness. Brief mood assessment and intention setting to ground yourself.',
    icon: 'sun',
    theme: 'morning',
    timeOfDay: 'morning',
    clinicalEvidence: 'Morning mindfulness practices reduce anxiety by 32% and improve daily emotional regulation',
    mbctCompliant: true,
    accessibilityLevel: 'AA' as const,
    features: [
      'PHQ-9 and GAD-7 validated assessments',
      'Mindful intention setting',
      'Daily mood tracking',
      'Crisis detection and support'
    ]
  },
  {
    id: 'midday-reset',
    title: 'Midday Reset',
    description: 'Pause and recenter with the 3-Minute Breathing Space. Break the cycle of stress and reactivity.',
    icon: 'circle',
    theme: 'midday',
    timeOfDay: 'midday',
    clinicalEvidence: 'MBCT breathing practices proven to reduce depression relapse by 43% in clinical trials',
    mbctCompliant: true,
    accessibilityLevel: 'AA' as const,
    features: [
      'Core 3-Minute Breathing Space',
      'Guided mindfulness practices',
      'Stress interruption techniques',
      'Present-moment awareness'
    ]
  },
  {
    id: 'evening-reflection',
    title: 'Evening Reflection',
    description: 'Close your day with gratitude and insight. Reflect on patterns and cultivate self-compassion.',
    icon: 'moon',
    theme: 'evening',
    timeOfDay: 'evening',
    clinicalEvidence: 'Evening reflection practices improve sleep quality and reduce rumination by 28%',
    mbctCompliant: true,
    accessibilityLevel: 'AA' as const,
    features: [
      'Daily reflection prompts',
      'Gratitude practice',
      'Pattern recognition',
      'Progress celebration'
    ]
  }
] as const;

// ============================================================================
// CLINICAL INFORMATION
// ============================================================================

export const clinicalInfo = {
  approach: {
    title: 'Mindfulness-Based Cognitive Therapy (MBCT)',
    description: 'Evidence-based approach combining mindfulness practices with cognitive therapy',
    benefits: [
      'Reduces depression relapse by 43%',
      'Significantly decreases anxiety symptoms',
      'Improves emotional regulation',
      'Enhances overall well-being'
    ]
  },
  evidence: [
    {
      study: 'Teasdale et al., 2000',
      finding: '43% reduction in depression relapse rates',
      participants: '145 patients with recurrent depression'
    },
    {
      study: 'Segal et al., 2010',
      finding: 'Significant reduction in anxiety symptoms',
      participants: '274 adults with anxiety disorders'
    },
    {
      study: 'Godfrin & van Heeringen, 2010',
      finding: 'Improved quality of life and reduced rumination',
      participants: '106 patients with suicidal ideation'
    }
  ],
  validations: [
    'Clinical trials published in peer-reviewed journals',
    'Recommended by NICE (National Institute for Health and Care Excellence)',
    'Endorsed by major mental health organizations',
    'Continuously updated based on latest research'
  ]
} as const;

// ============================================================================
// THERAPIST PORTAL CONFIGURATION
// ============================================================================

export const therapistFeatures = [
  {
    id: 'patient-monitoring',
    title: 'Patient Progress Monitoring',
    description: 'Real-time insights into patient engagement and therapeutic outcomes',
    benefits: [
      'Track assessment scores over time',
      'Monitor practice engagement',
      'Receive crisis alerts',
      'Generate clinical reports'
    ]
  },
  {
    id: 'clinical-dashboard',
    title: 'Clinical Dashboard',
    description: 'Comprehensive view of patient data with clinical insights',
    benefits: [
      'Evidence-based treatment recommendations',
      'Progress visualization',
      'Treatment adherence tracking',
      'Outcome measurement tools'
    ]
  },
  {
    id: 'crisis-management',
    title: 'Crisis Management',
    description: 'Immediate alerts and intervention protocols for high-risk patients',
    benefits: [
      'Automatic crisis threshold alerts',
      'Emergency contact integration',
      'Safety plan coordination',
      'Risk assessment tools'
    ]
  }
] as const;

// ============================================================================
// CRISIS RESOURCES
// ============================================================================

export const crisisResources = [
  {
    id: 'suicide-prevention',
    type: 'hotline' as const,
    name: 'National Suicide Prevention Lifeline',
    contact: '988',
    description: '24/7 crisis support for suicide prevention',
    availability: '24/7',
    region: 'United States',
    languages: ['English', 'Spanish'],
    specialties: ['Suicide prevention', 'Crisis intervention']
  },
  {
    id: 'crisis-text',
    type: 'text' as const,
    name: 'Crisis Text Line',
    contact: '741741',
    description: 'Free 24/7 crisis support via text message',
    availability: '24/7',
    region: 'United States',
    languages: ['English', 'Spanish'],
    specialties: ['Crisis counseling', 'Mental health support']
  },
  {
    id: 'emergency',
    type: 'emergency' as const,
    name: 'Emergency Services',
    contact: '911',
    description: 'Immediate emergency medical and psychiatric services',
    availability: '24/7',
    region: 'United States',
    languages: ['English'],
    specialties: ['Emergency medical care', 'Psychiatric emergencies']
  }
] as const;

// ============================================================================
// PRICING & PLANS
// ============================================================================

export const pricingPlans = [
  {
    id: 'monthly',
    name: 'Monthly',
    description: 'Complete MBCT program with flexible monthly billing',
    price: 9.99,
    interval: 'month',
    features: [
      'Complete MBCT 8-week program',
      'PHQ-9 and GAD-7 clinical assessments',
      '3-minute breathing practices',
      'Advanced mood tracking & analytics',
      'Personalized therapeutic insights',
      'Progress tracking & reports',
      '24/7 crisis support access',
      'Evidence-based mindfulness exercises',
      'Daily check-in flows',
      'Export clinical data'
    ],
    limitations: [],
    cta: trialConfig.messaging.cta.primary,
    highlighted: false,
    badge: null
  },
  {
    id: 'annual',
    name: 'Annual',
    description: 'Best value - Complete MBCT program with annual savings',
    price: 79.99,
    interval: 'year',
    features: [
      'Everything in Monthly plan',
      'Complete MBCT 8-week program',
      'PHQ-9 and GAD-7 clinical assessments',
      '3-minute breathing practices',
      'Advanced mood tracking & analytics',
      'Personalized therapeutic insights',
      'Progress tracking & reports',
      '24/7 crisis support access',
      'Evidence-based mindfulness exercises',
      'Daily check-in flows',
      'Export clinical data',
      'Priority customer support',
      'Early access to new features'
    ],
    limitations: [],
    cta: trialConfig.messaging.cta.primary,
    highlighted: true,
    badge: 'BEST VALUE'
  }
] as const;

// ============================================================================
// CONTENT & MESSAGING
// ============================================================================

export const heroContent = {
  headline: 'The Complete MBCT Protocol In Your Pocket',
  subheadline: 'Clinical-grade mental health support through evidence-based practices. Experience the power of Mindfulness-Based Cognitive Therapy with 24/7 crisis support.',
  cta: {
    primary: 'Start Free Trial',
    secondary: 'Watch Demo'
  },
  trust: 'Trusted by 10,000+ users and 500+ mental health professionals',
  benefits: [
    'Reduce depression relapse by 43%',
    '24/7 crisis support and intervention',
    'Evidence-based MBCT practices',
    'Clinical-grade assessment tools'
  ]
} as const;

export const trustIndicators = [
  {
    id: 'evidence-based',
    title: '100% Evidence-Based',
    description: 'Every feature grounded in peer-reviewed clinical research',
    metric: '100%',
    icon: 'research'
  },
  {
    id: 'private-secure',
    title: 'Private & Secure',
    description: 'Your mental health data stays private and encrypted',
    metric: 'HIPAA Ready',
    icon: 'shield'
  },
  {
    id: 'clinical-grade',
    title: 'Clinical Grade',
    description: 'Built to professional healthcare standards',
    metric: 'FDA Compliant',
    icon: 'medical'
  },
  {
    id: 'completion-rate',
    title: '85% Completion Rate',
    description: 'Users successfully complete their 8-week MBCT program',
    metric: '85%',
    icon: 'chart'
  }
] as const;

// ============================================================================
// SOCIAL PROOF & TESTIMONIALS
// ============================================================================

export const testimonials = [
  {
    id: 'patient-1',
    name: 'Sarah M.',
    role: 'App User',
    content: 'FullMind helped me recognize and change my thought patterns. The breathing exercises became my go-to tool during anxiety attacks.',
    rating: 5,
    verified: true
  },
  {
    id: 'therapist-1',
    name: 'Dr. Jennifer Chen',
    role: 'Clinical Psychologist',
    content: 'The patient monitoring features give me real-time insights into my clients\' progress. It\'s transformed how I provide care.',
    rating: 5,
    verified: true
  },
  {
    id: 'patient-2',
    name: 'Michael R.',
    role: 'App User',
    content: 'After struggling with depression for years, FullMind\'s daily check-ins helped me track my mood and see real progress.',
    rating: 5,
    verified: true
  }
] as const;

// Primary therapist testimonial for clinical section
export const primaryTherapistTestimonial = {
  id: 'dr-martinez',
  name: 'Dr. Maria Martinez',
  role: 'Licensed Clinical Psychologist',
  credentials: 'PhD, MBCT-Certified',
  institution: 'Stanford Mental Health Clinic',
  yearsExperience: 15,
  specialties: ['MBCT', 'Depression Treatment', 'Anxiety Disorders'],
  content: 'FullMind represents a breakthrough in digital mental health. The clinical accuracy of their assessments and the faithful implementation of MBCT principles make this the first app I confidently recommend to my patients.',
  quote: 'Finally, a mental health app built by clinicians, for clinicians.',
  verified: true,
  testimonialType: 'clinical' as const,
  image: '/images/testimonials/dr-martinez.jpg'
} as const;

// ============================================================================
// PERFORMANCE & ANALYTICS SETTINGS
// ============================================================================

export const performanceConfig = {
  // Core Web Vitals targets
  vitals: {
    lcp: 2500,    // Largest Contentful Paint (ms)
    fid: 100,     // First Input Delay (ms)
    cls: 0.1,     // Cumulative Layout Shift (score)
    ttfb: 600,    // Time to First Byte (ms)
    fcp: 1800     // First Contentful Paint (ms)
  },
  
  // Image optimization settings
  images: {
    quality: 85,
    formats: ['webp', 'avif'],
    sizes: {
      mobile: '(max-width: 768px) 100vw',
      tablet: '(max-width: 1200px) 50vw',
      desktop: '33vw'
    }
  },
  
  // Analytics configuration
  analytics: {
    consentRequired: true,
    anonymizeIp: true,
    respectDoNotTrack: true,
    cookieExpiry: 30 // days
  }
} as const;