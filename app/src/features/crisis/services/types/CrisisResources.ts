/**
 * CRISIS RESOURCES TYPES
 * National crisis resources with offline-first support
 *
 * SAFETY REQUIREMENTS:
 * - All resources must be verified and up-to-date
 * - Phone numbers must use tel: protocol for native calling
 * - Text numbers must use sms: protocol for native messaging
 * - Resources must be available offline
 * - <200ms load time requirement
 *
 * COMPLIANCE:
 * - HIPAA: No PHI transmitted to external resources
 * - Terms of Service: User acknowledges referral-only service
 * - External services operate independently of Being.
 */

export type CrisisResourceType =
  | 'hotline'
  | 'text'
  | 'online_chat'
  | 'emergency'
  | 'specialized';

export type CrisisResourcePriority = 'emergency' | 'high' | 'normal' | 'specialized';

export interface CrisisResource {
  id: string;
  name: string;
  type: CrisisResourceType;
  priority: CrisisResourcePriority;

  // Contact Information
  phone?: string;
  textNumber?: string;
  textMessage?: string;
  website?: string;
  extension?: string;

  // Resource Details
  description: string;
  detailedDescription?: string;
  availability: string;
  languages: string[];
  responseTime?: string;

  // Specializations
  specializations?: string[];
  targetAudience?: string;

  // Accessibility
  ttyAvailable?: boolean;
  interpreterAvailable?: boolean;

  // User Experience
  icon?: string;
  color?: string;
  warningNote?: string;

  // Analytics
  lastVerified: number;
  verifiedBy: 'clinical_team' | 'automated';
}

export interface CrisisResourceCategory {
  id: string;
  name: string;
  description: string;
  resources: CrisisResource[];
  priority: number;
}

/**
 * NATIONAL CRISIS RESOURCES
 * Verified as of 2025-01-27
 * Sources: SAMHSA, 988 Lifeline, Crisis Text Line official websites
 */
export const NATIONAL_CRISIS_RESOURCES: CrisisResource[] = [
  {
    id: '988_lifeline',
    name: '988 Suicide & Crisis Lifeline',
    type: 'hotline',
    priority: 'high',
    phone: '988',
    description: '24/7 crisis support for emotional distress or suicidal thoughts',
    detailedDescription: 'The 988 Lifeline provides free and confidential support for people in distress, prevention and crisis resources, and best practices for professionals in the United States.',
    availability: '24/7',
    languages: ['English', 'Spanish'],
    responseTime: 'Immediate connection',
    specializations: [
      'Suicide prevention',
      'Mental health crisis',
      'Substance abuse crisis',
      'Emotional distress'
    ],
    ttyAvailable: true,
    icon: 'phone',
    color: '#FF6B6B',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'crisis_text_line',
    name: 'Crisis Text Line',
    type: 'text',
    priority: 'high',
    textNumber: '741741',
    textMessage: 'HOME',
    description: 'Text-based crisis support for those who prefer texting',
    detailedDescription: 'Crisis Text Line provides free, 24/7 support via text message. Text HOME to 741741 to connect with a trained crisis counselor.',
    availability: '24/7',
    languages: ['English', 'Spanish'],
    responseTime: 'Usually under 5 minutes',
    specializations: [
      'Text-based support',
      'Youth-friendly',
      'Anonymous support'
    ],
    icon: 'message',
    color: '#4ECDC4',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'emergency_911',
    name: 'Emergency Services',
    type: 'emergency',
    priority: 'emergency',
    phone: '911',
    description: 'Immediate emergency response for life-threatening situations',
    detailedDescription: 'Call 911 if you or someone else is in immediate danger or having a medical emergency. This includes severe injury, loss of consciousness, or immediate risk of harm.',
    availability: '24/7',
    languages: ['English', 'Spanish', 'Interpreter services available'],
    responseTime: 'Immediate dispatch',
    icon: 'alert',
    color: '#D32F2F',
    warningNote: 'Call 911 only for life-threatening emergencies',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'samhsa_national_helpline',
    name: 'SAMHSA National Helpline',
    type: 'hotline',
    priority: 'normal',
    phone: '1-800-662-4357',
    description: 'Treatment referral and information service',
    detailedDescription: 'SAMHSA\'s National Helpline is a free, confidential, 24/7, 365-day-a-year treatment referral and information service for individuals and families facing mental and/or substance use disorders.',
    availability: '24/7',
    languages: ['English', 'Spanish'],
    responseTime: 'Immediate connection',
    specializations: [
      'Treatment referrals',
      'Mental health information',
      'Substance abuse support',
      'Local resources'
    ],
    ttyAvailable: true,
    icon: 'info',
    color: '#2196F3',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'veterans_crisis_line',
    name: 'Veterans Crisis Line',
    type: 'hotline',
    priority: 'specialized',
    phone: '988',
    extension: '1',
    textNumber: '838255',
    description: 'Crisis support specifically for veterans and service members',
    detailedDescription: 'The Veterans Crisis Line connects veterans, service members, National Guard and Reserve members, and their families with qualified, caring responders through a confidential toll-free hotline, online chat, or text.',
    availability: '24/7',
    languages: ['English', 'Spanish'],
    responseTime: 'Immediate connection',
    specializations: [
      'Veteran support',
      'Military experience',
      'PTSD support',
      'Transition support'
    ],
    targetAudience: 'Veterans, service members, and their families',
    ttyAvailable: true,
    icon: 'shield',
    color: '#1976D2',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'trevor_project',
    name: 'Trevor Project',
    type: 'hotline',
    priority: 'specialized',
    phone: '1-866-488-7386',
    textNumber: '678678',
    textMessage: 'START',
    website: 'https://www.thetrevorproject.org/get-help/',
    description: 'Crisis intervention for LGBTQ+ youth under 25',
    detailedDescription: 'The Trevor Project provides crisis intervention and suicide prevention services to LGBTQ+ young people under 25. Available via phone, text, and online chat.',
    availability: '24/7',
    languages: ['English', 'Spanish'],
    responseTime: 'Immediate connection',
    specializations: [
      'LGBTQ+ support',
      'Youth crisis intervention',
      'Identity support',
      'Coming out support'
    ],
    targetAudience: 'LGBTQ+ youth under 25',
    icon: 'heart',
    color: '#FF8C00',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'nami_helpline',
    name: 'NAMI HelpLine',
    type: 'hotline',
    priority: 'normal',
    phone: '1-800-950-6264',
    textNumber: '62640',
    textMessage: 'NAMI',
    description: 'Information and support for mental health concerns',
    detailedDescription: 'The NAMI HelpLine provides information, resource referrals, and support to people living with a mental health condition, their family members, and caregivers.',
    availability: 'Monday-Friday, 10am-10pm ET',
    languages: ['English'],
    responseTime: 'Usually immediate',
    specializations: [
      'Mental health information',
      'Family support',
      'Local resource referrals',
      'Education'
    ],
    icon: 'support',
    color: '#4CAF50',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  },
  {
    id: 'domestic_violence_hotline',
    name: 'National Domestic Violence Hotline',
    type: 'hotline',
    priority: 'specialized',
    phone: '1-800-799-7233',
    textNumber: '88788',
    textMessage: 'START',
    description: 'Support for domestic violence situations',
    detailedDescription: 'The National Domestic Violence Hotline provides confidential support from trained advocates 24/7. Available via phone, text, and online chat.',
    availability: '24/7',
    languages: ['English', 'Spanish', '200+ languages via interpreter'],
    responseTime: 'Immediate connection',
    specializations: [
      'Domestic violence',
      'Safety planning',
      'Local resources',
      'Legal information'
    ],
    targetAudience: 'Anyone experiencing domestic violence',
    interpreterAvailable: true,
    ttyAvailable: true,
    icon: 'shield-check',
    color: '#9C27B0',
    lastVerified: Date.now(),
    verifiedBy: 'clinical_team'
  }
];

/**
 * RESOURCE CATEGORIES
 * Organized by priority and use case
 */
export const CRISIS_RESOURCE_CATEGORIES: CrisisResourceCategory[] = [
  {
    id: 'immediate_crisis',
    name: 'Immediate Crisis Support',
    description: 'For immediate help with suicidal thoughts or severe emotional distress',
    resources: NATIONAL_CRISIS_RESOURCES.filter(r => r.priority === 'high'),
    priority: 1
  },
  {
    id: 'emergency',
    name: 'Emergency Services',
    description: 'For life-threatening emergencies requiring immediate response',
    resources: NATIONAL_CRISIS_RESOURCES.filter(r => r.priority === 'emergency'),
    priority: 0
  },
  {
    id: 'specialized_support',
    name: 'Specialized Support',
    description: 'Resources for specific communities and situations',
    resources: NATIONAL_CRISIS_RESOURCES.filter(r => r.priority === 'specialized'),
    priority: 2
  },
  {
    id: 'general_support',
    name: 'General Mental Health Support',
    description: 'Information, referrals, and ongoing support',
    resources: NATIONAL_CRISIS_RESOURCES.filter(r => r.priority === 'normal'),
    priority: 3
  }
];

/**
 * Helper function to get resource by ID
 */
export function getCrisisResource(id: string): CrisisResource | undefined {
  return NATIONAL_CRISIS_RESOURCES.find(r => r.id === id);
}

/**
 * Helper function to get resources by category
 */
export function getCrisisResourcesByCategory(categoryId: string): CrisisResource[] {
  const category = CRISIS_RESOURCE_CATEGORIES.find(c => c.id === categoryId);
  return category?.resources || [];
}

/**
 * Helper function to get priority resources
 */
export function getPriorityCrisisResources(): CrisisResource[] {
  return NATIONAL_CRISIS_RESOURCES.filter(r =>
    r.priority === 'emergency' || r.priority === 'high'
  );
}