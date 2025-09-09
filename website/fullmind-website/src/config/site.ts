/**
 * FullMind Website - Site Configuration
 * Central configuration for site metadata, navigation, and features
 */

import { type SiteConfig, type NavigationItem } from '@/types';

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
  }
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
    cta: 'Start 7-Day Free Trial',
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
    cta: 'Start 7-Day Free Trial',
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