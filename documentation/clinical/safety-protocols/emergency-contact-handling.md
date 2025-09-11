# Emergency Contact Management Protocols

## Overview

This document outlines the comprehensive protocols for managing emergency contacts within the FullMind mental health application. Emergency contacts serve as a critical safety net for users experiencing mental health crises, providing both professional crisis resources and personal support network activation.

## Emergency Contact Framework

### Definition and Purpose

**Emergency Contacts** are individuals chosen by users to be notified during mental health crises or when specific risk thresholds are met. They serve as part of a comprehensive safety plan that includes both professional crisis resources (988 hotline) and personal support networks.

### Legal and Ethical Framework
- **User Autonomy**: Users maintain complete control over emergency contact selection and notification preferences
- **Informed Consent**: Clear explanation of when and how emergency contacts will be contacted
- **Privacy Protection**: Emergency contact data encrypted and access-controlled
- **Professional Boundaries**: Emergency contacts supplement, never replace, professional crisis intervention

## User-Defined Emergency Contact Setup

### Onboarding Integration

#### Emergency Contact Collection Process
```
ONBOARDING FLOW:
1. Crisis Safety Education → 2. Emergency Contact Setup → 3. Consent Configuration
   ↓
4. Contact Verification → 5. Communication Preferences → 6. Safety Plan Integration
```

#### Setup Requirements
- **Minimum Contacts**: 0 (optional but strongly encouraged)
- **Maximum Contacts**: 5 (prevents overwhelming user's network)
- **Required Information**: Name, phone number, relationship
- **Optional Information**: Email address, preferred contact method, availability notes

### Emergency Contact Data Structure

```typescript
interface EmergencyContact {
  id: string;
  name: string;
  relationship: 'family' | 'friend' | 'partner' | 'professional' | 'other';
  phoneNumber: string;
  email?: string;
  preferredContact: 'phone' | 'email' | 'text' | 'any';
  availability?: string; // "9am-5pm weekdays" or "anytime"
  notificationLevel: 'high-risk' | 'crisis-only' | 'all-levels';
  isActive: boolean;
  createdAt: string;
  lastUpdated: string;
  consentStatus: 'pending' | 'confirmed' | 'declined';
}
```

### Contact Management Interface

#### User Control Features
- **Easy Addition**: Simple form with relationship-specific templates
- **Quick Editing**: In-line editing for phone numbers and preferences
- **Immediate Removal**: One-tap removal with confirmation
- **Notification Testing**: Send test message to verify contact information
- **Relationship Context**: Clear labeling of relationship types for emotional context

#### Privacy and Security Controls
- **Encryption**: AES-256 encryption for all emergency contact data
- **Access Control**: User authentication required for viewing contacts
- **Data Minimization**: Only collect information necessary for crisis response
- **Secure Deletion**: Complete data removal when contact is deleted

## Privacy-Preserving Emergency Contact Storage

### Data Encryption and Security

#### Encryption Standards
- **At-Rest Encryption**: AES-256 encryption in AsyncStorage
- **Key Management**: User-specific encryption keys derived from secure authentication
- **Data Segmentation**: Emergency contact data isolated from other user data
- **Access Logging**: Audit trail of all emergency contact data access

#### Security Implementation
```typescript
// Privacy-preserving storage implementation
class SecureEmergencyContactStore {
  private encryptionKey: string;
  
  async storeContact(contact: EmergencyContact): Promise<void> {
    const encryptedContact = await this.encrypt(contact);
    await AsyncStorage.setItem(
      `emergency_contact_${contact.id}`, 
      encryptedContact
    );
  }
  
  async getContacts(): Promise<EmergencyContact[]> {
    const contactKeys = await this.getContactKeys();
    const contacts = await Promise.all(
      contactKeys.map(key => this.decryptContact(key))
    );
    return contacts.filter(contact => contact.isActive);
  }
  
  private async encrypt(data: any): Promise<string> {
    // AES-256 encryption implementation
  }
  
  private async decrypt(encryptedData: string): Promise<any> {
    // AES-256 decryption implementation
  }
}
```

### Data Retention and Deletion

#### Retention Policies
- **Active Contacts**: Retained indefinitely while user maintains account
- **Deleted Contacts**: Immediate secure deletion from all storage
- **Account Deletion**: All emergency contact data securely wiped within 24 hours
- **Audit Logs**: Contact access logs retained for 90 days for security purposes

#### Secure Deletion Process
1. **Immediate Removal**: Contact data removed from active storage
2. **Key Rotation**: Encryption keys invalidated for deleted contacts
3. **Backup Cleanup**: Removal from all backup systems within 24 hours
4. **Verification**: Automated verification of complete data removal

## Crisis Communication Templates

### Template Categories

#### 1. Assessment-Triggered Notifications

**High-Risk Assessment (PHQ-9 ≥ 15, GAD-7 ≥ 12)**
```
Subject: [User Name] - Mental Health Support Requested

Dear [Contact Name],

[User Name] has completed a mental health assessment that indicates they could benefit from additional support right now. They have chosen you as someone they trust during difficult times.

What this means:
• This is not an emergency requiring immediate action
• Your support and care would be meaningful to them
• They are receiving appropriate crisis resources through their mental health app

How you can help:
• Reach out when you're able to offer support
• Listen without judgment if they want to share
• Encourage them to continue using their mental health resources

Professional crisis support is available 24/7:
• 988 Suicide & Crisis Lifeline (free, confidential)
• Crisis Text Line: Text HOME to 741741

Thank you for being part of [User Name]'s support network.

This message was sent with [User Name]'s explicit consent.
```

**Crisis-Level Assessment (PHQ-9 ≥ 20, Any Suicidal Ideation)**
```
Subject: [User Name] - Immediate Support Requested

Dear [Contact Name],

[User Name] has indicated they are experiencing significant distress and has specifically chosen to include you in their crisis support network.

What this means:
• They need immediate emotional support
• Please reach out to them as soon as possible
• If you believe they are in immediate physical danger, call 911

They have immediate access to professional crisis support:
• 988 Suicide & Crisis Lifeline (available right now)
• Crisis Text Line: Text HOME to 741741
• Local emergency services: 911 for immediate danger

Your care and support can make a critical difference. Please contact [User Name] as soon as you can.

Thank you for being there for them during this difficult time.

This message was sent during a mental health crisis with [User Name]'s consent.
```

#### 2. Crisis Button Activation

**Immediate Crisis Support Request**
```
Subject: [User Name] - Crisis Help Requested Now

Dear [Contact Name],

[User Name] has activated their crisis support system and specifically requested your help. This means they need immediate support.

Immediate actions:
• Contact [User Name] right away
• If they don't respond or you're concerned about immediate safety, call 911
• Stay with them (in person or on phone) until they're stable

Professional crisis support is active:
• 988 Suicide & Crisis Lifeline: They're being connected now
• Crisis counselors are available immediately
• Emergency services: 911 if immediate physical danger

Your presence and support are critical right now. Please reach out to [User Name] immediately.

This message was sent because [User Name] activated their crisis support system.
```

#### 3. Follow-up Communications

**24-Hour Crisis Follow-up**
```
Subject: [User Name] - Crisis Follow-up

Dear [Contact Name],

This is a follow-up message regarding [User Name]'s recent mental health crisis. 

Your support has been valuable during this difficult time. As they continue their recovery:

• Continue offering gentle, non-judgmental support
• Encourage them to maintain contact with professional crisis resources
• Watch for concerning changes and don't hesitate to seek additional help

Signs to watch for:
• Increased isolation or withdrawal
• Expressions of hopelessness
• Changes in sleep or eating patterns
• Giving away possessions

If you notice concerning changes, encourage them to contact:
• 988 Suicide & Crisis Lifeline
• Their mental health provider
• Local emergency services if immediate danger

Thank you for being part of [User Name]'s ongoing support network.
```

### Template Customization

#### User-Specific Personalization
- **Name Integration**: Automatic insertion of user and contact names
- **Relationship Context**: Templates adjusted based on relationship type (family, friend, etc.)
- **Cultural Sensitivity**: Templates available in multiple languages
- **Accessibility**: Plain language, clear formatting for all literacy levels

#### Communication Method Adaptation
- **SMS Version**: Shortened templates for text message limitations
- **Email Version**: Full detailed templates with resource links
- **Voice Script**: Template for verbal communication in emergency situations
- **Visual Communication**: Simple infographic version for accessibility

## Contact Validation Procedures

### Initial Contact Verification

#### Verification Process
1. **Information Collection**: Name, phone, email, relationship
2. **Contact Confirmation**: Optional verification message to confirm contact wants to be included
3. **Response Validation**: Confirmation that contact understands their role
4. **Consent Documentation**: Record of both user and contact consent

#### Verification Message Template
```
Subject: [User Name] - Emergency Contact Confirmation

Hello [Contact Name],

[User Name] has listed you as an emergency contact for their mental health support network. This means you may be contacted if they experience a mental health crisis.

Your role would include:
• Providing emotional support during difficult times
• Being available for urgent communication if needed
• Helping connect them with professional crisis resources when necessary

Please reply to confirm:
1. You consent to being an emergency contact for [User Name]
2. You understand you may be contacted during mental health emergencies
3. Your preferred method of contact (phone, text, email)

If you need more information or want to decline, please contact [User Name] directly.

Professional crisis resources are always the first line of support:
• 988 Suicide & Crisis Lifeline
• Crisis Text Line: HOME to 741741

Thank you for supporting [User Name]'s mental health and safety.
```

### Ongoing Contact Maintenance

#### Regular Validation
- **Annual Confirmation**: Yearly check that contacts want to remain in support network
- **Contact Information Updates**: Prompts to update phone numbers and email addresses
- **Availability Changes**: Updates to contact availability and preferences
- **Relationship Changes**: Easy process to update or remove contacts as relationships change

#### Validation Scheduling
```typescript
interface ContactValidationSchedule {
  annualConfirmation: Date;
  contactInfoReview: Date; // Every 6 months
  availabilityUpdate: Date; // Every 3 months
  emergencyTest: Date; // Optional yearly test message
}
```

## Consent Management for Emergency Situations

### Layered Consent Framework

#### Primary Consent Levels
1. **Initial Setup Consent**: Agreement to emergency contact system participation
2. **Contact-Specific Consent**: Per-contact notification preferences
3. **Crisis-Level Consent**: Different consent for different crisis severities
4. **Emergency Override Consent**: Life-threatening situation procedures

### Consent Configuration Interface

#### User Consent Controls
```typescript
interface EmergencyContactConsent {
  contactId: string;
  notificationTriggers: {
    highRiskAssessment: boolean; // PHQ-9 ≥ 15, GAD-7 ≥ 12
    crisisAssessment: boolean;   // PHQ-9 ≥ 20, suicidal ideation
    crisisButtonActivation: boolean; // User-initiated crisis
    emergencyOverride: boolean;   // Life-threatening (minimal consent required)
  };
  communicationMethods: {
    phone: boolean;
    text: boolean;
    email: boolean;
  };
  timeRestrictions?: {
    startTime: string; // "09:00"
    endTime: string;   // "21:00"
    timezone: string;
    emergencyOverride: boolean; // Contact even outside preferred hours
  };
  lastUpdated: string;
  consentExpiry?: string; // Optional expiration date
}
```

#### Granular Consent Management
- **Crisis Level Selection**: Users choose which crisis levels trigger contact
- **Method Preferences**: Phone, text, email preferences per contact
- **Time Restrictions**: Respect contact availability preferences
- **Emergency Override**: Life-threatening situations may override preferences

### Emergency Override Protocols

#### Life-Threatening Situation Override
When user safety is immediately at risk, minimal consent barriers apply:

**Override Criteria**:
- Active suicidal ideation with plan and means
- User unresponsive after crisis button activation
- Emergency services involvement requested
- Professional crisis counselor recommendation

**Override Process**:
1. **Immediate Notification**: Contact all emergency contacts regardless of preferences
2. **Clear Emergency Messaging**: Indicate this is a life-threatening situation
3. **Resource Coordination**: Provide crisis resource information to all contacts
4. **Follow-up Documentation**: Record override decision and rationale

### Consent Renewal and Management

#### Regular Consent Review
- **Annual Renewal**: Yearly confirmation of all consent preferences
- **Major Life Events**: Prompt to review consent after significant life changes
- **Crisis Events**: Post-crisis review of consent effectiveness
- **Contact Changes**: Immediate consent update when contacts are modified

#### Consent Withdrawal Process
- **Easy Withdrawal**: Simple process to revoke consent for any contact
- **Immediate Effect**: Consent changes take effect immediately
- **Clear Communication**: User understands implications of consent withdrawal
- **Alternative Support**: Guidance on other support options when consent is withdrawn

## Quality Assurance and Monitoring

### Emergency Contact System Metrics

#### Performance Indicators
- **Contact Reachability**: Percentage of emergency contacts successfully reached
- **Response Effectiveness**: User feedback on emergency contact support quality
- **Consent Compliance**: 100% adherence to user consent preferences
- **System Reliability**: Uptime and performance of emergency contact notifications

#### User Experience Metrics
- **Setup Completion Rate**: Percentage of users who complete emergency contact setup
- **Contact Retention**: How long users maintain emergency contacts
- **User Satisfaction**: Feedback on emergency contact system helpfulness
- **Crisis Resolution**: Role of emergency contacts in successful crisis resolution

### Privacy and Security Auditing

#### Security Review Process
- **Monthly Access Audits**: Review all emergency contact data access
- **Quarterly Security Assessment**: Third-party security review of contact data protection
- **Annual Privacy Review**: Comprehensive review of privacy practices
- **Incident Response**: Immediate security incident investigation and response

#### Compliance Monitoring
- **Consent Compliance**: 100% adherence to user consent preferences
- **Data Protection**: Regular audit of encryption and access controls
- **Legal Compliance**: Ongoing review of regulatory requirements
- **Best Practice Updates**: Integration of latest privacy and security standards

---

**Document Control**
- **Version**: 1.0
- **Last Updated**: 2024-09-10
- **Next Review**: 2024-11-10
- **Privacy Officer**: [Privacy Officer Name]
- **Clinical Director**: [Clinical Director Name]
- **Legal Review**: [Legal Counsel Name]