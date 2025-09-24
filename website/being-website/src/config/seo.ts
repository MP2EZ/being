/**
 * Being. Website - SEO Configuration
 * Clinical-grade SEO optimization with mental health focus
 */

import { type Metadata } from 'next';
import { siteConfig } from './site';

// ============================================================================
// BASE SEO CONFIGURATION
// ============================================================================

export const baseSEO: Metadata = {
  title: {
    default: 'Being. - Clinical-Grade Mental Health Support',
    template: '%s | Being.'
  },
  description: 'Evidence-based MBCT practices for depression and anxiety. Clinical assessments, breathing exercises, and crisis support. Trusted by mental health professionals.',
  keywords: [
    // Mental health terms
    'mental health app',
    'depression treatment',
    'anxiety management',
    'MBCT',
    'mindfulness-based cognitive therapy',
    'clinical depression assessment',
    'PHQ-9',
    'GAD-7',
    
    // Clinical terms
    'evidence-based therapy',
    'clinical-grade mental health',
    'mental health assessments',
    'crisis intervention',
    'therapeutic mobile app',
    'digital therapeutics',
    
    // Professional terms
    'therapist tools',
    'mental health professionals',
    'patient monitoring',
    'clinical outcomes',
    'mental health technology',
    
    // Accessibility terms
    'accessible mental health',
    'inclusive therapy',
    'WCAG compliant mental health app'
  ],
  authors: [
    {
      name: 'Being. Clinical Team',
      url: 'https://being.app/about'
    }
  ],
  creator: 'Being.',
  publisher: 'Being.',
  applicationName: 'Being.',
  
  // Open Graph
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: 'Being. - Clinical-Grade Mental Health Support',
    description: 'Evidence-based MBCT practices for depression and anxiety. Clinical assessments, breathing exercises, and crisis support.',
    images: [
      {
        url: `${siteConfig.url}/og-image.jpg`,
        width: 1200,
        height: 630,
        alt: 'Being. - Clinical-Grade Mental Health Support',
        type: 'image/jpeg'
      }
    ]
  },

  // Twitter Card
  twitter: {
    card: 'summary_large_image',
    site: '@beingapp',
    creator: '@beingapp',
    title: 'Being. - Clinical-Grade Mental Health Support',
    description: 'Evidence-based MBCT practices for depression and anxiety. Clinical assessments, breathing exercises, and crisis support.',
    images: [`${siteConfig.url}/twitter-image.jpg`]
  },

  // Additional metadata
  metadataBase: new URL(siteConfig.url),
  alternates: {
    canonical: siteConfig.url
  },
  
  // App-specific metadata
  appleWebApp: {
    capable: true,
    title: 'Being.',
    statusBarStyle: 'default'
  },
  
  // Verification
  verification: {
    google: 'google-site-verification-code', // Replace with actual verification code
    yandex: 'yandex-verification-code',     // Replace with actual verification code
    other: {
      'msvalidate.01': 'bing-site-verification-code' // Replace with actual verification code
    }
  },

  // Robots
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1
    }
  }
};

// ============================================================================
// PAGE-SPECIFIC SEO CONFIGURATIONS
// ============================================================================

export const pageSEO = {
  home: {
    title: 'Clinical-Grade Mental Health Support | Being.',
    description: 'Evidence-based MBCT practices for depression and anxiety. PHQ-9 and GAD-7 assessments, 3-minute breathing space, crisis support. Trusted by 500+ mental health professionals.',
    keywords: [
      'mental health app',
      'depression treatment',
      'anxiety management',
      'MBCT app',
      'clinical depression assessment',
      'PHQ-9 assessment',
      'GAD-7 screening',
      'mindfulness therapy',
      'crisis support app'
    ]
  },

  features: {
    title: 'Clinical Features - Evidence-Based Mental Health Tools',
    description: 'Discover Being.\'s clinical-grade features: validated assessments (PHQ-9, GAD-7), MBCT practices, mood tracking, and 24/7 crisis support.',
    keywords: [
      'clinical assessments',
      'PHQ-9 depression screening',
      'GAD-7 anxiety assessment',
      'MBCT practices',
      'mood tracking',
      'crisis intervention',
      'breathing exercises',
      'mental health features'
    ]
  },

  clinical: {
    title: 'Clinical Evidence - Research-Backed Mental Health Treatment',
    description: 'Being. is built on 20+ years of MBCT research. Clinically validated assessments, evidence-based practices, and proven therapeutic outcomes.',
    keywords: [
      'clinical evidence',
      'MBCT research',
      'evidence-based therapy',
      'clinical trials',
      'therapeutic outcomes',
      'mental health research',
      'depression relapse prevention',
      'anxiety treatment efficacy'
    ]
  },

  therapists: {
    title: 'For Mental Health Professionals - Therapist Tools & Patient Monitoring',
    description: 'Professional tools for therapists: patient progress monitoring, clinical dashboards, crisis alerts, and outcome tracking. Enhance your practice with Being.',
    keywords: [
      'therapist tools',
      'patient monitoring',
      'clinical dashboard',
      'mental health professionals',
      'therapy practice management',
      'clinical outcomes tracking',
      'crisis management',
      'therapeutic technology'
    ]
  },

  pricing: {
    title: 'Pricing - Accessible Mental Health Support for Everyone',
    description: 'Choose the right plan for your mental health journey. Free tier available. Individual and professional plans with clinical-grade features.',
    keywords: [
      'mental health app pricing',
      'affordable therapy',
      'free mental health tools',
      'subscription plans',
      'therapist pricing',
      'clinical app costs',
      'mental health investment'
    ]
  },

  privacy: {
    title: 'Privacy Policy - Your Mental Health Data Protection',
    description: 'Being. protects your mental health data with clinical-grade security. HIPAA-ready privacy practices and transparent data handling.',
    keywords: [
      'privacy policy',
      'mental health privacy',
      'HIPAA compliance',
      'data protection',
      'clinical data security',
      'patient privacy',
      'healthcare data'
    ]
  },

  terms: {
    title: 'Terms of Service - Being. Clinical Application',
    description: 'Terms of service for Being. clinical mental health application. Professional standards and user responsibilities.',
    keywords: [
      'terms of service',
      'clinical application terms',
      'mental health app agreement',
      'professional standards',
      'user responsibilities'
    ]
  },

  crisis: {
    title: '24/7 Crisis Resources - Immediate Mental Health Support',
    description: 'Immediate help is available. Access 24/7 crisis resources including National Suicide Prevention Lifeline (988), Crisis Text Line, and emergency services.',
    keywords: [
      'crisis support',
      'suicide prevention',
      'mental health emergency',
      'crisis hotline',
      '988 lifeline',
      'crisis text line',
      'immediate help',
      'emergency mental health'
    ]
  }
} as const;

// ============================================================================
// STRUCTURED DATA (JSON-LD)
// ============================================================================

export const structuredData = {
  organization: {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Being.',
    description: 'Clinical-grade mental health support through evidence-based MBCT practices',
    url: siteConfig.url,
    logo: `${siteConfig.url}/logo.png`,
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+1-800-BEING',
      contactType: 'customer service',
      availableLanguage: ['English', 'Spanish']
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'US'
    },
    sameAs: [
      'https://twitter.com/beingapp',
      'https://linkedin.com/company/being',
      'https://github.com/being-app'
    ]
  },

  mobileApplication: {
    '@context': 'https://schema.org',
    '@type': 'MobileApplication',
    name: 'Being.',
    description: 'Clinical-grade mental health support through evidence-based MBCT practices',
    applicationCategory: 'HealthApplication',
    operatingSystem: ['iOS', 'Android'],
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '1000',
      bestRating: '5'
    },
    screenshot: [
      `${siteConfig.url}/screenshots/assessment.jpg`,
      `${siteConfig.url}/screenshots/breathing.jpg`,
      `${siteConfig.url}/screenshots/dashboard.jpg`
    ]
  },

  medicalWebPage: {
    '@context': 'https://schema.org',
    '@type': 'MedicalWebPage',
    name: 'Being. - Clinical Mental Health Support',
    description: 'Evidence-based MBCT practices for depression and anxiety treatment',
    medicalAudience: [
      {
        '@type': 'MedicalAudience',
        audienceType: 'Patient'
      },
      {
        '@type': 'MedicalAudience',  
        audienceType: 'Physician'
      }
    ],
    about: [
      {
        '@type': 'MedicalCondition',
        name: 'Depression',
        code: {
          '@type': 'MedicalCode',
          code: 'F32',
          codingSystem: 'ICD-10'
        }
      },
      {
        '@type': 'MedicalCondition',
        name: 'Anxiety Disorders',
        code: {
          '@type': 'MedicalCode',
          code: 'F41',
          codingSystem: 'ICD-10'
        }
      }
    ],
    reviewedBy: {
      '@type': 'Person',
      name: 'Dr. Clinical Reviewer',
      jobTitle: 'Clinical Psychologist'
    },
    lastReviewed: '2024-01-15'
  },

  faqPage: {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Is Being. clinically validated?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Being. is built on 20+ years of MBCT research and uses clinically validated assessments like PHQ-9 and GAD-7.'
        }
      },
      {
        '@type': 'Question',
        name: 'How does crisis support work?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Being. provides immediate access to crisis resources including the National Suicide Prevention Lifeline (988) and Crisis Text Line (741741).'
        }
      },
      {
        '@type': 'Question',
        name: 'Is my mental health data secure?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes, Being. uses clinical-grade security and is built with HIPAA-ready privacy practices to protect your mental health data.'
        }
      }
    ]
  }
} as const;

// ============================================================================
// SEO UTILITIES
// ============================================================================

/**
 * Generates page-specific metadata
 */
export function generatePageSEO(
  page: keyof typeof pageSEO,
  customTitle?: string,
  customDescription?: string
): Metadata {
  const pageConfig = pageSEO[page];
  
  return {
    ...baseSEO,
    title: customTitle || pageConfig.title,
    description: customDescription || pageConfig.description,
    keywords: [...(baseSEO.keywords || []), ...pageConfig.keywords],
    openGraph: {
      ...baseSEO.openGraph,
      title: customTitle || pageConfig.title,
      description: customDescription || pageConfig.description,
      url: `${siteConfig.url}/${page === 'home' ? '' : page}`
    },
    twitter: {
      ...baseSEO.twitter,
      title: customTitle || pageConfig.title,
      description: customDescription || pageConfig.description
    },
    alternates: {
      canonical: `${siteConfig.url}/${page === 'home' ? '' : page}`
    }
  };
}

/**
 * Generates JSON-LD structured data script
 */
export function generateStructuredData(type: keyof typeof structuredData): string {
  return JSON.stringify(structuredData[type], null, 2);
}

/**
 * Generates crisis-specific SEO for emergency pages
 */
export function generateCrisisSEO(): Metadata {
  return {
    title: '24/7 Crisis Support - Immediate Mental Health Help | Being.',
    description: 'If you\'re in crisis, help is available now. Call 988 for the National Suicide Prevention Lifeline or text 741741 for Crisis Text Line.',
    keywords: [
      'crisis support',
      'suicide prevention',
      'mental health emergency',
      'immediate help',
      '988 lifeline',
      'crisis text line',
      'emergency mental health'
    ],
    robots: {
      index: true,
      follow: true,
      // Prioritize crisis pages in search
      googleBot: {
        index: true,
        follow: true,
        'max-snippet': -1,
        'max-image-preview': 'large'
      }
    },
    other: {
      // Emergency page priority
      'priority': '1.0'
    }
  };
}

// ============================================================================
// CLINICAL SEO BEST PRACTICES
// ============================================================================

export const clinicalSEOGuidelines = {
  // Content quality standards
  readingLevel: 8,           // 8th grade reading level
  sentenceLength: 20,        // Average words per sentence
  paragraphLength: 150,      // Maximum words per paragraph
  
  // E-A-T (Expertise, Authoritativeness, Trustworthiness) factors
  expertiseSignals: [
    'Clinical validation mentions',
    'Research citations',
    'Professional endorsements',
    'Regulatory compliance (HIPAA, FDA)'
  ],
  
  authoritySignals: [
    'Professional author bios',
    'Clinical reviewer credentials',
    'Institutional affiliations',
    'Publication in medical journals'
  ],
  
  trustSignals: [
    'Transparent privacy practices',
    'Clear data handling policies',
    'Professional contact information',
    'Crisis resource accessibility',
    'Third-party security audits'
  ],

  // Clinical content requirements
  medicalDisclaimer: 'Always include medical disclaimers',
  crisisResources: 'Every page should link to crisis resources',
  professionalAdvice: 'Encourage professional consultation',
  evidenceBased: 'Cite scientific evidence for claims'
} as const;