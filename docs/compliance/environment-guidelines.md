# =======================================================
# Being. MBCT App - Consolidated Compliance Environment Configuration
# Phase 7B: Compliance Environment Configuration Consolidation
# =======================================================
#
# This consolidated configuration file contains all regulatory compliance,
# privacy protection, and legal framework environment variables across all environments.
#
# IMMUTABLE CONSTRAINTS PRESERVED:
# - HIPAA compliance fully maintained
# - GDPR/CCPA requirements preserved
# - Crisis intervention legal compliance maintained
# - Mental health app regulatory standards preserved
# - PHQ-9/GAD-7 clinical thresholds (20/15) - IMMUTABLE
# - 988 hotline compliance - IMMUTABLE
# - Clinical data retention (7 years) - IMMUTABLE

# =======================================================
# REGULATORY COMPLIANCE FRAMEWORK
# =======================================================

# HIPAA (Health Insurance Portability and Accountability Act)
EXPO_PUBLIC_HIPAA_COMPLIANCE_MODE=ready                    # production|staging|development|ready
EXPO_PUBLIC_HIPAA_PRIVACY_RULE_ENFORCED=true
EXPO_PUBLIC_HIPAA_SECURITY_RULE_ENFORCED=true
EXPO_PUBLIC_HIPAA_BREACH_NOTIFICATION_ENABLED=true
EXPO_PUBLIC_HIPAA_BUSINESS_ASSOCIATE_AGREEMENTS_REQUIRED=true
EXPO_PUBLIC_HIPAA_AUDIT_CONTROLS_ENABLED=true
EXPO_PUBLIC_HIPAA_INTEGRITY_CONTROLS_ENABLED=true
EXPO_PUBLIC_HIPAA_TRANSMISSION_SECURITY_ENABLED=true

# GDPR (General Data Protection Regulation)
EXPO_PUBLIC_GDPR_COMPLIANCE=true
EXPO_PUBLIC_GDPR_CONSENT_MANAGEMENT=granular
EXPO_PUBLIC_GDPR_DATA_SUBJECT_RIGHTS=full
EXPO_PUBLIC_GDPR_DATA_PORTABILITY=true
EXPO_PUBLIC_GDPR_RIGHT_TO_ERASURE=true
EXPO_PUBLIC_GDPR_RIGHT_TO_RECTIFICATION=true
EXPO_PUBLIC_GDPR_DATA_PROTECTION_BY_DESIGN=true
EXPO_PUBLIC_GDPR_PRIVACY_IMPACT_ASSESSMENTS=required

# CCPA (California Consumer Privacy Act)
EXPO_PUBLIC_CCPA_COMPLIANCE=true
EXPO_PUBLIC_CCPA_CONSUMER_RIGHTS=full
EXPO_PUBLIC_CCPA_DATA_SALE_PROHIBITED=true
EXPO_PUBLIC_CCPA_DO_NOT_SELL_HONORED=true
EXPO_PUBLIC_CCPA_PERSONAL_INFO_CATEGORIES_DISCLOSED=true
EXPO_PUBLIC_CCPA_THIRD_PARTY_DISCLOSURE_LIMITED=true

# FDA Digital Therapeutics Guidelines
EXPO_PUBLIC_FDA_DTX_COMPLIANCE_LEVEL=wellness              # wellness|medical_device|therapeutic
EXPO_PUBLIC_FDA_CLINICAL_CLAIMS_PROHIBITED=true
EXPO_PUBLIC_FDA_MEDICAL_ADVICE_DISCLAIMER=required
EXPO_PUBLIC_FDA_SAFETY_REPORTING_ENABLED=true

# =======================================================
# MENTAL HEALTH APP REGULATORY COMPLIANCE
# =======================================================

# Clinical Data Standards
EXPO_PUBLIC_CLINICAL_ACCURACY_REQUIRED=100                 # IMMUTABLE
EXPO_PUBLIC_PHQ9_CRISIS_THRESHOLD=20                      # IMMUTABLE - Clinical requirement
EXPO_PUBLIC_GAD7_CRISIS_THRESHOLD=15                      # IMMUTABLE - Clinical requirement
EXPO_PUBLIC_CLINICAL_CONTENT_VALIDATION=strict
EXPO_PUBLIC_THERAPEUTIC_CLAIMS_PROHIBITED=true
EXPO_PUBLIC_CLINICAL_SUPERVISION_REQUIRED=false           # Wellness app, not clinical

# Crisis Intervention Legal Compliance
EXPO_PUBLIC_CRISIS_HOTLINE=988                           # IMMUTABLE - National Suicide Prevention Lifeline
EXPO_PUBLIC_CRISIS_TEXT_LINE=741741                      # IMMUTABLE - Crisis Text Line
EXPO_PUBLIC_EMERGENCY_SERVICES=911                       # IMMUTABLE - Emergency services
EXPO_PUBLIC_CRISIS_LEGAL_DUTY_TO_WARN=jurisdiction_based
EXPO_PUBLIC_CRISIS_MANDATORY_REPORTING=jurisdiction_based
EXPO_PUBLIC_CRISIS_INTERVENTION_LOGGING=required
EXPO_PUBLIC_CRISIS_LEGAL_IMMUNITY_DISCLAIMERS=true

# Professional Liability and Scope
EXPO_PUBLIC_PROFESSIONAL_LIABILITY_LIMITED=true          # Not providing clinical services
EXPO_PUBLIC_SCOPE_OF_SERVICE=wellness_support           # wellness_support|clinical_care|medical_treatment
EXPO_PUBLIC_LICENSED_PROVIDER_REFERRAL=recommended
EXPO_PUBLIC_EMERGENCY_CARE_REFERRAL=required

# =======================================================
# DATA PRIVACY AND PROTECTION
# =======================================================

# Privacy by Design Principles
EXPO_PUBLIC_PRIVACY_BY_DESIGN=proactive
EXPO_PUBLIC_PRIVACY_BY_DEFAULT=maximum
EXPO_PUBLIC_DATA_MINIMIZATION=strict
EXPO_PUBLIC_PURPOSE_LIMITATION=therapeutic_only
EXPO_PUBLIC_DATA_ACCURACY=verified
EXPO_PUBLIC_STORAGE_LIMITATION=regulated
EXPO_PUBLIC_INTEGRITY_CONFIDENTIALITY=maximum
EXPO_PUBLIC_ACCOUNTABILITY=demonstrated

# Data Collection and Processing
EXPO_PUBLIC_MINIMAL_DATA_COLLECTION=true
EXPO_PUBLIC_EXPLICIT_CONSENT_REQUIRED=true
EXPO_PUBLIC_GRANULAR_CONSENT_OPTIONS=true
EXPO_PUBLIC_CONSENT_WITHDRAWAL_ENABLED=true
EXPO_PUBLIC_DATA_PROCESSING_TRANSPARENCY=full
EXPO_PUBLIC_AUTOMATED_DECISION_MAKING_LIMITED=true

# Data Subject Rights (GDPR Articles 15-22)
EXPO_PUBLIC_RIGHT_TO_ACCESS=true
EXPO_PUBLIC_RIGHT_TO_RECTIFICATION=true
EXPO_PUBLIC_RIGHT_TO_ERASURE=true
EXPO_PUBLIC_RIGHT_TO_RESTRICT_PROCESSING=true
EXPO_PUBLIC_RIGHT_TO_DATA_PORTABILITY=true
EXPO_PUBLIC_RIGHT_TO_OBJECT=true
EXPO_PUBLIC_RIGHTS_RELATED_TO_AUTOMATED_DECISION_MAKING=true

# Data Retention and Deletion
EXPO_PUBLIC_DATA_RETENTION_CLINICAL_DAYS=2555            # 7 years - IMMUTABLE - Regulatory requirement
EXPO_PUBLIC_DATA_RETENTION_DEFAULT_DAYS=365
EXPO_PUBLIC_DATA_RETENTION_AUDIT_DAYS=2555               # 7 years - IMMUTABLE
EXPO_PUBLIC_DATA_RETENTION_BACKUP_DAYS=90
EXPO_PUBLIC_AUTOMATIC_DATA_DELETION=true
EXPO_PUBLIC_SECURE_DATA_DESTRUCTION=dod_5220_22_m       # DoD 5220.22-M standard

# =======================================================
# USER CONSENT MANAGEMENT
# =======================================================

# Consent Framework
EXPO_PUBLIC_CONSENT_VERSION_CURRENT=2024.2
EXPO_PUBLIC_PRIVACY_POLICY_VERSION_CURRENT=2024.2
EXPO_PUBLIC_CONSENT_VALIDATION=strict
EXPO_PUBLIC_CONSENT_GRACE_PERIOD_DAYS=30
EXPO_PUBLIC_CONSENT_AUDIT_TRAIL=comprehensive

# Consent Categories
EXPO_PUBLIC_CONSENT_ESSENTIAL_FUNCTIONALITY=required
EXPO_PUBLIC_CONSENT_CLINICAL_DATA_PROCESSING=required
EXPO_PUBLIC_CONSENT_ANALYTICS_USAGE=optional
EXPO_PUBLIC_CONSENT_COMMUNICATIONS=configurable
EXPO_PUBLIC_CONSENT_THIRD_PARTY_INTEGRATIONS=optional
EXPO_PUBLIC_CONSENT_RESEARCH_PARTICIPATION=optional

# Age Verification and Minor Protection
EXPO_PUBLIC_AGE_VERIFICATION_REQUIRED=true
EXPO_PUBLIC_MINIMUM_AGE_REQUIREMENT=13                   # COPPA compliance
EXPO_PUBLIC_PARENTAL_CONSENT_REQUIRED_UNDER=18          # State-dependent
EXPO_PUBLIC_MINOR_PROTECTION_ENHANCED=true
EXPO_PUBLIC_COPPA_COMPLIANCE=true

# =======================================================
# LEGAL FRAMEWORK COMPLIANCE
# =======================================================

# Jurisdiction and Applicable Laws
EXPO_PUBLIC_PRIMARY_JURISDICTION=united_states
EXPO_PUBLIC_APPLICABLE_LAWS=hipaa,gdpr,ccpa,state_mental_health,ferpa
EXPO_PUBLIC_CROSS_BORDER_DATA_TRANSFERS=restricted
EXPO_PUBLIC_DATA_LOCALIZATION_REQUIRED=false
EXPO_PUBLIC_LEGAL_BASIS_PROCESSING=consent_and_legitimate_interest

# Terms of Service and Legal Documents
EXPO_PUBLIC_TERMS_OF_SERVICE_ENFORCED=true
EXPO_PUBLIC_PRIVACY_POLICY_ENFORCED=true
EXPO_PUBLIC_ACCEPTABLE_USE_POLICY=true
EXPO_PUBLIC_LEGAL_DISCLAIMERS=comprehensive
EXPO_PUBLIC_LIABILITY_LIMITATIONS=maximum_allowed

# Intellectual Property Protection
EXPO_PUBLIC_COPYRIGHT_PROTECTION=enabled
EXPO_PUBLIC_TRADEMARK_PROTECTION=enabled
EXPO_PUBLIC_DMCA_COMPLIANCE=true
EXPO_PUBLIC_INTELLECTUAL_PROPERTY_REPORTING=enabled

# =======================================================
# SECURITY AND ENCRYPTION COMPLIANCE
# =======================================================

# Data Encryption Requirements
EXPO_PUBLIC_ENCRYPTION_AT_REST=aes_256                   # IMMUTABLE - Security requirement
EXPO_PUBLIC_ENCRYPTION_IN_TRANSIT=tls_1_3               # IMMUTABLE - Security requirement
EXPO_PUBLIC_END_TO_END_ENCRYPTION=clinical_data         # For sensitive clinical data
EXPO_PUBLIC_KEY_MANAGEMENT=secure_enclave                # Hardware security module
EXPO_PUBLIC_CRYPTOGRAPHIC_STANDARDS=fips_140_2

# Access Controls and Authentication
EXPO_PUBLIC_MULTI_FACTOR_AUTHENTICATION=recommended
EXPO_PUBLIC_BIOMETRIC_AUTHENTICATION=supported
EXPO_PUBLIC_DEVICE_AUTHENTICATION=required
EXPO_PUBLIC_SESSION_MANAGEMENT=secure
EXPO_PUBLIC_ZERO_TRUST_ARCHITECTURE=implemented

# Security Monitoring and Incident Response
EXPO_PUBLIC_SECURITY_MONITORING=continuous
EXPO_PUBLIC_INTRUSION_DETECTION=enabled
EXPO_PUBLIC_INCIDENT_RESPONSE_PLAN=active
EXPO_PUBLIC_BREACH_NOTIFICATION_AUTOMATED=true
EXPO_PUBLIC_SECURITY_AUDIT_LOGGING=comprehensive

# =======================================================
# APP STORE AND PLATFORM COMPLIANCE
# =======================================================

# iOS App Store Guidelines
EXPO_PUBLIC_IOS_HEALTH_APP_COMPLIANCE=true
EXPO_PUBLIC_IOS_MEDICAL_DISCLAIMER_REQUIRED=true
EXPO_PUBLIC_IOS_AGE_RATING=17_plus                      # Mental health content
EXPO_PUBLIC_IOS_PRIVACY_NUTRITION_LABELS=complete
EXPO_PUBLIC_IOS_DATA_COLLECTION_DISCLOSURE=full

# Google Play Store Policies
EXPO_PUBLIC_ANDROID_HEALTH_APP_POLICY=compliant
EXPO_PUBLIC_ANDROID_CONTENT_RATING=mature              # Mental health content
EXPO_PUBLIC_ANDROID_PRIVACY_POLICY_REQUIRED=true
EXPO_PUBLIC_ANDROID_DATA_SAFETY_SECTION=complete
EXPO_PUBLIC_ANDROID_SENSITIVE_APP_DESIGNATION=mental_health

# Platform-Specific Privacy
EXPO_PUBLIC_APPLE_HEALTH_INTEGRATION_PRIVACY=strict
EXPO_PUBLIC_GOOGLE_FIT_INTEGRATION=disabled            # Privacy-first approach
EXPO_PUBLIC_PLATFORM_SPECIFIC_ENCRYPTION=enabled
EXPO_PUBLIC_CROSS_PLATFORM_DATA_SYNC=local_only

# =======================================================
# AUDIT AND COMPLIANCE MONITORING
# =======================================================

# Audit Logging Configuration
EXPO_PUBLIC_AUDIT_LOGGING_COMPREHENSIVE=true
EXPO_PUBLIC_AUDIT_USER_ACTIONS=clinical_data_only
EXPO_PUBLIC_AUDIT_SYSTEM_EVENTS=security_relevant
EXPO_PUBLIC_AUDIT_DATA_ACCESS=all_instances
EXPO_PUBLIC_AUDIT_CONFIGURATION_CHANGES=all

# Compliance Monitoring
EXPO_PUBLIC_COMPLIANCE_MONITORING_REAL_TIME=true
EXPO_PUBLIC_COMPLIANCE_VIOLATION_ALERTS=immediate
EXPO_PUBLIC_COMPLIANCE_REPORTING_AUTOMATED=monthly
EXPO_PUBLIC_COMPLIANCE_DASHBOARD=enabled
EXPO_PUBLIC_REGULATORY_CHANGE_MONITORING=enabled

# Third-Party Compliance Validation
EXPO_PUBLIC_THIRD_PARTY_SECURITY_AUDITS=annual
EXPO_PUBLIC_PENETRATION_TESTING=bi_annual
EXPO_PUBLIC_COMPLIANCE_CERTIFICATION_TRACKING=enabled
EXPO_PUBLIC_VENDOR_COMPLIANCE_VALIDATION=required

# =======================================================
# EMERGENCY AND CRISIS COMPLIANCE
# =======================================================

# Emergency Access Protocols
EXPO_PUBLIC_EMERGENCY_OVERRIDE_LEGAL_BASIS=vital_interests
EXPO_PUBLIC_CRISIS_DATA_SHARING_AUTHORIZATION=emergency_only
EXPO_PUBLIC_EMERGENCY_CONTACT_PRIVACY_OVERRIDE=limited
EXPO_PUBLIC_CRISIS_INTERVENTION_LEGAL_PROTECTION=qualified_immunity

# Crisis Documentation Requirements
EXPO_PUBLIC_CRISIS_INCIDENT_DOCUMENTATION=required
EXPO_PUBLIC_CRISIS_LEGAL_REVIEW_REQUIRED=post_incident
EXPO_PUBLIC_CRISIS_COMPLIANCE_VALIDATION=immediate
EXPO_PUBLIC_EMERGENCY_PROCEDURE_LEGAL_BASIS=documented

# Professional Standards in Crisis
EXPO_PUBLIC_CRISIS_PROFESSIONAL_STANDARDS=national_guidelines
EXPO_PUBLIC_CRISIS_SUPERVISION_REQUIREMENTS=post_incident
EXPO_PUBLIC_CRISIS_CONTINUING_EDUCATION=recommended
EXPO_PUBLIC_CRISIS_LEGAL_LIABILITY_PROTECTION=standard

# =======================================================
# INTERNATIONAL COMPLIANCE CONSIDERATIONS
# =======================================================

# Multi-Jurisdictional Compliance
EXPO_PUBLIC_MULTI_JURISDICTION_COMPLIANCE=us_primary
EXPO_PUBLIC_EU_GDPR_EXTRATERRITORIAL=applicable
EXPO_PUBLIC_UK_GDPR_COMPLIANCE=if_uk_users
EXPO_PUBLIC_CANADA_PIPEDA_COMPLIANCE=if_canadian_users
EXPO_PUBLIC_AUSTRALIA_PRIVACY_ACT=if_australian_users

# Cross-Border Data Transfer Safeguards
EXPO_PUBLIC_ADEQUACY_DECISIONS=eu_us_privacy_framework
EXPO_PUBLIC_STANDARD_CONTRACTUAL_CLAUSES=available
EXPO_PUBLIC_BINDING_CORPORATE_RULES=not_applicable
EXPO_PUBLIC_CERTIFICATION_MECHANISMS=privacy_shield_successor

# =======================================================
# REPORTING AND TRANSPARENCY
# =======================================================

# Transparency Reporting
EXPO_PUBLIC_TRANSPARENCY_REPORT_PUBLISHED=annually
EXPO_PUBLIC_DATA_REQUEST_STATISTICS=published
EXPO_PUBLIC_PRIVACY_INCIDENT_REPORTING=required_disclosures_only
EXPO_PUBLIC_COMPLIANCE_METRICS_PUBLISHED=aggregate_only

# User Communication
EXPO_PUBLIC_PRIVACY_POLICY_PLAIN_LANGUAGE=required
EXPO_PUBLIC_CONSENT_LANGUAGE_ACCESSIBILITY=enhanced
EXPO_PUBLIC_LEGAL_NOTICE_DELIVERY_METHOD=in_app_and_email
EXPO_PUBLIC_USER_EDUCATION_PRIVACY_RIGHTS=proactive

# =======================================================
# ENVIRONMENT-SPECIFIC COMPLIANCE OVERRIDES
# =======================================================

# Development Environment Relaxations
EXPO_PUBLIC_DEV_COMPLIANCE_RELAXED_AUDIT_LOGGING=true
EXPO_PUBLIC_DEV_CONSENT_BYPASS_ALLOWED=testing_only
EXPO_PUBLIC_DEV_DATA_RETENTION_REDUCED=30_days
EXPO_PUBLIC_DEV_ENCRYPTION_SIMPLIFIED=development_only

# Staging Environment Validation
EXPO_PUBLIC_STAGING_FULL_COMPLIANCE_VALIDATION=true
EXPO_PUBLIC_STAGING_PRODUCTION_COMPLIANCE_SIMULATION=true
EXPO_PUBLIC_STAGING_REGULATORY_TESTING_ENABLED=true

# Production Environment Enforcement
EXPO_PUBLIC_PROD_COMPLIANCE_ENFORCEMENT_STRICT=true
EXPO_PUBLIC_PROD_REGULATORY_OVERRIDE_PROHIBITED=true
EXPO_PUBLIC_PROD_COMPLIANCE_MONITORING_MAXIMUM=true
EXPO_PUBLIC_PROD_AUDIT_LOGGING_IMMUTABLE=true

# =======================================================
# LEGAL DOCUMENT URLS AND REFERENCES
# =======================================================

# Core Legal Documents
EXPO_PUBLIC_PRIVACY_POLICY_URL=https://fullmind.app/privacy
EXPO_PUBLIC_TERMS_OF_SERVICE_URL=https://fullmind.app/terms
EXPO_PUBLIC_COOKIE_POLICY_URL=https://fullmind.app/cookies
EXPO_PUBLIC_ACCEPTABLE_USE_POLICY_URL=https://fullmind.app/acceptable-use

# Regulatory Compliance Documents
EXPO_PUBLIC_HIPAA_NOTICE_URL=https://fullmind.app/hipaa-notice
EXPO_PUBLIC_GDPR_RIGHTS_URL=https://fullmind.app/gdpr-rights
EXPO_PUBLIC_CCPA_RIGHTS_URL=https://fullmind.app/ccpa-rights
EXPO_PUBLIC_ACCESSIBILITY_STATEMENT_URL=https://fullmind.app/accessibility

# Crisis and Emergency Resources
EXPO_PUBLIC_CRISIS_RESOURCES_URL=https://fullmind.app/crisis-resources
EXPO_PUBLIC_EMERGENCY_PROCEDURES_URL=https://fullmind.app/emergency-procedures
EXPO_PUBLIC_PROFESSIONAL_REFERRAL_URL=https://fullmind.app/professional-referrals
EXPO_PUBLIC_LEGAL_DISCLAIMERS_URL=https://fullmind.app/legal-disclaimers

# =======================================================
# COMPLIANCE VALIDATION AND MONITORING
# =======================================================

# Automated Compliance Validation
EXPO_PUBLIC_COMPLIANCE_VALIDATION_AUTOMATED=true
EXPO_PUBLIC_COMPLIANCE_VIOLATION_DETECTION=real_time
EXPO_PUBLIC_COMPLIANCE_REMEDIATION_AUTOMATED=where_possible
EXPO_PUBLIC_COMPLIANCE_ESCALATION_PROCEDURES=defined

# Regulatory Change Management
EXPO_PUBLIC_REGULATORY_CHANGE_MONITORING=enabled
EXPO_PUBLIC_COMPLIANCE_UPDATE_NOTIFICATIONS=enabled
EXPO_PUBLIC_LEGAL_REVIEW_TRIGGER_CHANGES=major_updates
EXPO_PUBLIC_COMPLIANCE_VERSION_CONTROL=maintained

# Performance Impact of Compliance
EXPO_PUBLIC_COMPLIANCE_PERFORMANCE_MONITORING=enabled
EXPO_PUBLIC_PRIVACY_PERFORMANCE_OPTIMIZATION=balanced
EXPO_PUBLIC_SECURITY_PERFORMANCE_TRADE_OFFS=security_priority
EXPO_PUBLIC_COMPLIANCE_USER_EXPERIENCE_BALANCE=privacy_first

# =======================================================
# NOTES AND MAINTENANCE
# =======================================================

# Configuration Maintenance
# Last Updated: 2025-01-27
# Compliance Review Due: 2025-04-27 (Quarterly)
# Legal Review Due: 2025-07-27 (Semi-annual)
# Regulatory Update Check: Monthly
#
# IMMUTABLE SETTINGS - DO NOT MODIFY:
# - Crisis thresholds (PHQ-9: 20, GAD-7: 15)
# - Clinical data retention (7 years / 2555 days)
# - Emergency hotlines (988, 741741, 911)
# - Encryption standards (AES-256, TLS 1.3)
# - HIPAA compliance requirements
# - Core privacy by design principles
#
# MODIFICATION REQUIREMENTS:
# All changes require legal review and compliance validation
# Crisis-related settings require clinical team approval
# Privacy settings require privacy officer approval
# Security settings require CISO approval
# Regulatory changes require executive approval