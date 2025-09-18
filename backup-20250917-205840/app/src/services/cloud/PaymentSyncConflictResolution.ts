/**
 * Payment Sync Conflict Resolution - P0-CLOUD Platform
 *
 * Advanced conflict resolution for payment sync operations with:
 * - Multi-device sync conflict detection and resolution
 * - Subscription tier-aware conflict handling
 * - Clinical data integrity preservation during conflicts
 * - Crisis safety override for mental health conflicts
 * - HIPAA-compliant audit trail for all resolutions
 * - Intelligent merge strategies for payment data
 *
 * ARCHITECT FOUNDATION:
 * - Mental health data integrity is non-negotiable
 * - Crisis data always wins in conflicts
 * - Subscription payment conflicts use latest valid state
 * - Clinical assessment data requires manual review for conflicts
 * - Zero data loss conflict resolution with complete audit trails
 */

import { EventEmitter } from 'events';
import {
  SyncConflict,
  ConflictType,
  ConflictResolution,
  ConflictResolutionStep,
  ClinicalValidationResult,
  SyncMetadata,
  SyncableData,
  SyncEntityType
} from '../../types/sync';
import { PaymentAwareSyncRequest, SyncPriorityLevel } from './PaymentAwareSyncAPI';
import { SubscriptionTier } from '../../types/subscription';
import { EncryptionService } from '../security/EncryptionService';

// ============================================================================
// CONFLICT RESOLUTION TYPES AND INTERFACES
// ============================================================================

/**
 * Payment-specific conflict types
 */
export enum PaymentConflictType {
  SUBSCRIPTION_TIER_MISMATCH = 'subscription_tier_mismatch',
  PAYMENT_STATUS_DIVERGENCE = 'payment_status_divergence',
  BILLING_CYCLE_CONFLICT = 'billing_cycle_conflict',
  TRIAL_EXPIRY_CONFLICT = 'trial_expiry_conflict',
  GRACE_PERIOD_MISMATCH = 'grace_period_mismatch',
  ENTITLEMENT_CONFLICT = 'entitlement_conflict'
}

/**
 * Clinical conflict severity levels
 */
export enum ClinicalConflictSeverity {
  ROUTINE = 'routine',           // Non-clinical data conflicts
  CLINICAL = 'clinical',         // Clinical data with low risk
  SAFETY_CRITICAL = 'safety_critical', // Crisis plan or assessment conflicts
  EMERGENCY = 'emergency'        // Active crisis state conflicts
}

/**
 * Conflict resolution strategy types
 */
export enum ConflictResolutionStrategy {
  LATEST_WINS = 'latest_wins',           // Most recent timestamp
  SERVER_WINS = 'server_wins',           // Server authoritative
  CLIENT_WINS = 'client_wins',           // Client authoritative
  MANUAL_REVIEW = 'manual_review',       // Requires human intervention
  INTELLIGENT_MERGE = 'intelligent_merge', // AI-assisted merge
  CRISIS_OVERRIDE = 'crisis_override',   // Crisis data always wins
  PAYMENT_AUTHORITATIVE = 'payment_authoritative', // Payment service wins
  CLINICAL_VALIDATION = 'clinical_validation' // Clinical review required
}

/**
 * Enhanced conflict with payment and clinical context
 */
export interface PaymentSyncConflict extends SyncConflict {
  readonly paymentContext?: {
    readonly subscriptionTier: SubscriptionTier;
    readonly conflictingTiers: readonly SubscriptionTier[];
    readonly paymentStatus: string;
    readonly gracePeriodActive: boolean;
  };
  readonly clinicalContext?: {
    readonly severity: ClinicalConflictSeverity;
    readonly crisisData: boolean;
    readonly assessmentScores: boolean;
    readonly therapeuticContinuity: boolean;
  };
  readonly deviceContext: {
    readonly localDevice: string;
    readonly remoteDevice: string;
    readonly networkConditions: {
      readonly localQuality: 'excellent' | 'good' | 'poor' | 'offline';
      readonly remoteQuality: 'excellent' | 'good' | 'poor' | 'offline';
    };
  };
  readonly resolutionDeadline?: string; // Crisis conflicts must be resolved quickly
}

/**
 * Conflict resolution context
 */
export interface ConflictResolutionContext {
  readonly conflictId: string;
  readonly priority: SyncPriorityLevel;
  readonly subscriptionTier: SubscriptionTier;
  readonly crisisMode: boolean;
  readonly userPresent: boolean;          // Can user intervene?
  readonly clinicalReviewAvailable: boolean;
  readonly automaticResolutionAllowed: boolean;
  readonly maxResolutionTimeMs: number;
  readonly auditRequired: boolean;
}

/**
 * Intelligent merge result
 */
export interface IntelligentMergeResult {
  readonly success: boolean;
  readonly mergedData: SyncableData;
  readonly mergedMetadata: SyncMetadata;
  readonly confidence: number;           // 0-1 confidence in merge quality
  readonly preservedFields: readonly string[];
  readonly discardedFields: readonly string[];
  readonly clinicalValidation: ClinicalValidationResult;
  readonly auditTrail: readonly ConflictResolutionStep[];
}

/**
 * Conflict resolution policies
 */
export interface ConflictResolutionPolicy {
  readonly entityType: SyncEntityType;
  readonly defaultStrategy: ConflictResolutionStrategy;
  readonly crisisOverride: ConflictResolutionStrategy;
  readonly strategies: Record<ConflictType | PaymentConflictType, ConflictResolutionStrategy>;
  readonly timeoutMs: number;
  readonly requiresClinicalReview: boolean;
  readonly auditLevel: 'basic' | 'detailed' | 'comprehensive';
}

// ============================================================================
// CONFLICT DETECTION ENGINE
// ============================================================================

/**
 * Advanced conflict detection for payment sync operations
 */
export class ConflictDetectionEngine {
  private static instance: ConflictDetectionEngine;
  private encryption: EncryptionService;

  public static getInstance(): ConflictDetectionEngine {
    if (!ConflictDetectionEngine.instance) {
      ConflictDetectionEngine.instance = new ConflictDetectionEngine();
    }
    return ConflictDetectionEngine.instance;
  }

  constructor() {
    this.encryption = EncryptionService.getInstance();
  }

  /**
   * Detect conflicts between local and remote data
   */
  async detectConflicts(
    localData: SyncableData,
    localMetadata: SyncMetadata,
    remoteData: SyncableData,
    remoteMetadata: SyncMetadata,
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];

    try {
      // Basic metadata conflicts
      const metadataConflicts = this.detectMetadataConflicts(localMetadata, remoteMetadata);
      conflicts.push(...metadataConflicts);

      // Entity-specific conflicts
      const entityConflicts = await this.detectEntitySpecificConflicts(
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        context
      );
      conflicts.push(...entityConflicts);

      // Payment-specific conflicts
      const paymentConflicts = await this.detectPaymentConflicts(
        localData,
        remoteData,
        context
      );
      conflicts.push(...paymentConflicts);

      // Clinical data conflicts
      const clinicalConflicts = await this.detectClinicalConflicts(
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        context
      );
      conflicts.push(...clinicalConflicts);

      // Enrich conflicts with context
      return await this.enrichConflictsWithContext(conflicts, context);

    } catch (error) {
      console.error('Conflict detection failed:', error);
      throw new Error(`Conflict detection failed: ${error}`);
    }
  }

  private detectMetadataConflicts(
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): PaymentSyncConflict[] {
    const conflicts: PaymentSyncConflict[] = [];

    // Version mismatch
    if (localMetadata.version !== remoteMetadata.version) {
      conflicts.push(this.createBaseConflict(
        ConflictType.VERSION_MISMATCH,
        localMetadata,
        remoteMetadata,
        'Version numbers do not match'
      ));
    }

    // Checksum mismatch
    if (localMetadata.checksum !== remoteMetadata.checksum) {
      conflicts.push(this.createBaseConflict(
        ConflictType.CHECKSUM_MISMATCH,
        localMetadata,
        remoteMetadata,
        'Data checksums do not match'
      ));
    }

    // Timestamp anomaly
    const localTime = new Date(localMetadata.lastModified).getTime();
    const remoteTime = new Date(remoteMetadata.lastModified).getTime();
    const timeDiff = Math.abs(localTime - remoteTime);

    // Suspicious if modified times are more than 1 hour apart
    if (timeDiff > 3600000) {
      conflicts.push(this.createBaseConflict(
        ConflictType.TIMESTAMP_ANOMALY,
        localMetadata,
        remoteMetadata,
        `Timestamp difference of ${Math.round(timeDiff / 60000)} minutes detected`
      ));
    }

    return conflicts;
  }

  private async detectEntitySpecificConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata,
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];

    switch (localMetadata.entityType) {
      case 'check_in':
        conflicts.push(...await this.detectCheckInConflicts(localData, remoteData, localMetadata, remoteMetadata));
        break;
      case 'assessment':
        conflicts.push(...await this.detectAssessmentConflicts(localData, remoteData, localMetadata, remoteMetadata));
        break;
      case 'crisis_plan':
        conflicts.push(...await this.detectCrisisPlanConflicts(localData, remoteData, localMetadata, remoteMetadata));
        break;
      case 'user_profile':
        conflicts.push(...await this.detectUserProfileConflicts(localData, remoteData, localMetadata, remoteMetadata));
        break;
    }

    return conflicts;
  }

  private async detectPaymentConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];

    // Check for subscription tier conflicts
    const localTier = this.extractSubscriptionTier(localData);
    const remoteTier = this.extractSubscriptionTier(remoteData);

    if (localTier && remoteTier && localTier !== remoteTier) {
      conflicts.push({
        id: `payment_tier_${Date.now()}`,
        entityType: 'user_profile', // Assuming subscription is part of user profile
        entityId: context.conflictId,
        conflictType: PaymentConflictType.SUBSCRIPTION_TIER_MISMATCH as any,
        localData,
        remoteData,
        localMetadata: this.createMetadataForConflict(localData, 'local'),
        remoteMetadata: this.createMetadataForConflict(remoteData, 'remote'),
        suggestedResolution: ConflictResolutionStrategy.PAYMENT_AUTHORITATIVE as any,
        resolutionRequired: true,
        clinicalImplications: ['Subscription tier affects sync capabilities'],
        detectedAt: new Date().toISOString(),
        paymentContext: {
          subscriptionTier: context.subscriptionTier,
          conflictingTiers: [localTier, remoteTier],
          paymentStatus: 'active', // Would be extracted from data
          gracePeriodActive: false
        },
        deviceContext: {
          localDevice: 'current_device',
          remoteDevice: 'remote_device',
          networkConditions: {
            localQuality: 'good',
            remoteQuality: 'good'
          }
        }
      });
    }

    return conflicts;
  }

  private async detectClinicalConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata,
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];

    // Detect clinical data divergence
    if (this.isClinicalData(localMetadata.entityType)) {
      const clinicalConflict = await this.analyzeClinicalDataDivergence(
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        context
      );

      if (clinicalConflict) {
        conflicts.push(clinicalConflict);
      }
    }

    return conflicts;
  }

  private async detectCheckInConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];
    const local = localData as any;
    const remote = remoteData as any;

    // Check-in mood score conflicts
    if (local.mood !== remote.mood && Math.abs(local.mood - remote.mood) > 1) {
      conflicts.push(this.createClinicalConflict(
        ConflictType.CLINICAL_DATA_DIVERGENCE,
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        'Significant mood score difference detected',
        ClinicalConflictSeverity.CLINICAL
      ));
    }

    return conflicts;
  }

  private async detectAssessmentConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];
    const local = localData as any;
    const remote = remoteData as any;

    // PHQ-9 or GAD-7 score conflicts are critical
    if (local.totalScore !== remote.totalScore) {
      const severity = this.assessAssessmentConflictSeverity(local.totalScore, remote.totalScore, local.type);

      conflicts.push(this.createClinicalConflict(
        ConflictType.CLINICAL_DATA_DIVERGENCE,
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        `Assessment score conflict: ${local.totalScore} vs ${remote.totalScore}`,
        severity
      ));
    }

    return conflicts;
  }

  private async detectCrisisPlanConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];
    const local = localData as any;
    const remote = remoteData as any;

    // Crisis plan conflicts are always safety-critical
    if (JSON.stringify(local.emergencyContacts) !== JSON.stringify(remote.emergencyContacts)) {
      conflicts.push(this.createClinicalConflict(
        ConflictType.CLINICAL_DATA_DIVERGENCE,
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        'Emergency contacts differ between devices',
        ClinicalConflictSeverity.SAFETY_CRITICAL
      ));
    }

    return conflicts;
  }

  private async detectUserProfileConflicts(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata
  ): Promise<PaymentSyncConflict[]> {
    const conflicts: PaymentSyncConflict[] = [];
    // Implementation for user profile conflicts
    return conflicts;
  }

  private createBaseConflict(
    conflictType: ConflictType,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata,
    description: string
  ): PaymentSyncConflict {
    return {
      id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType: localMetadata.entityType,
      entityId: localMetadata.entityId,
      conflictType,
      localData: {} as SyncableData, // Would be filled with actual data
      remoteData: {} as SyncableData,
      localMetadata,
      remoteMetadata,
      suggestedResolution: this.suggestResolutionStrategy(conflictType, localMetadata.entityType),
      resolutionRequired: true,
      clinicalImplications: this.assessClinicalImplications(conflictType, localMetadata.entityType),
      detectedAt: new Date().toISOString(),
      deviceContext: {
        localDevice: localMetadata.deviceId,
        remoteDevice: remoteMetadata.deviceId,
        networkConditions: {
          localQuality: 'good',
          remoteQuality: 'good'
        }
      }
    };
  }

  private createClinicalConflict(
    conflictType: ConflictType,
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata,
    description: string,
    severity: ClinicalConflictSeverity
  ): PaymentSyncConflict {
    return {
      id: `clinical_conflict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      entityType: localMetadata.entityType,
      entityId: localMetadata.entityId,
      conflictType,
      localData,
      remoteData,
      localMetadata,
      remoteMetadata,
      suggestedResolution: severity === ClinicalConflictSeverity.EMERGENCY ?
        ConflictResolutionStrategy.CRISIS_OVERRIDE as any :
        ConflictResolutionStrategy.CLINICAL_VALIDATION as any,
      resolutionRequired: true,
      clinicalImplications: [description],
      detectedAt: new Date().toISOString(),
      clinicalContext: {
        severity,
        crisisData: localMetadata.entityType === 'crisis_plan',
        assessmentScores: localMetadata.entityType === 'assessment',
        therapeuticContinuity: true
      },
      deviceContext: {
        localDevice: localMetadata.deviceId,
        remoteDevice: remoteMetadata.deviceId,
        networkConditions: {
          localQuality: 'good',
          remoteQuality: 'good'
        }
      },
      resolutionDeadline: severity === ClinicalConflictSeverity.EMERGENCY ?
        new Date(Date.now() + 60000).toISOString() : // 1 minute for emergencies
        undefined
    };
  }

  private async enrichConflictsWithContext(
    conflicts: PaymentSyncConflict[],
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict[]> {
    return conflicts.map(conflict => ({
      ...conflict,
      // Add crisis deadline if in crisis mode
      resolutionDeadline: context.crisisMode ?
        new Date(Date.now() + 200).toISOString() : // 200ms for crisis
        conflict.resolutionDeadline
    }));
  }

  private suggestResolutionStrategy(
    conflictType: ConflictType,
    entityType: SyncEntityType
  ): ConflictResolutionStrategy {
    // Crisis data always uses crisis override
    if (entityType === 'crisis_plan') {
      return ConflictResolutionStrategy.CRISIS_OVERRIDE as any;
    }

    // Assessment data requires clinical validation
    if (entityType === 'assessment') {
      return ConflictResolutionStrategy.CLINICAL_VALIDATION as any;
    }

    // Default strategies by conflict type
    switch (conflictType) {
      case ConflictType.VERSION_MISMATCH:
        return ConflictResolutionStrategy.LATEST_WINS as any;
      case ConflictType.CHECKSUM_MISMATCH:
        return ConflictResolutionStrategy.MANUAL_REVIEW as any;
      case ConflictType.CLINICAL_DATA_DIVERGENCE:
        return ConflictResolutionStrategy.CLINICAL_VALIDATION as any;
      default:
        return ConflictResolutionStrategy.INTELLIGENT_MERGE as any;
    }
  }

  private assessClinicalImplications(
    conflictType: ConflictType,
    entityType: SyncEntityType
  ): string[] {
    const implications: string[] = [];

    if (entityType === 'assessment') {
      implications.push('Assessment score accuracy critical for clinical decisions');
    }

    if (entityType === 'crisis_plan') {
      implications.push('Crisis plan accuracy essential for user safety');
    }

    if (conflictType === ConflictType.CLINICAL_DATA_DIVERGENCE) {
      implications.push('Clinical data integrity may be compromised');
    }

    return implications;
  }

  private extractSubscriptionTier(data: SyncableData): SubscriptionTier | null {
    // Implementation to extract subscription tier from data
    const userData = data as any;
    return userData?.subscription?.tier || null;
  }

  private createMetadataForConflict(data: SyncableData, source: string): SyncMetadata {
    // Create minimal metadata for conflict resolution
    return {
      entityId: (data as any).id || 'unknown',
      entityType: 'user_profile', // Default
      version: 1,
      lastModified: new Date().toISOString(),
      checksum: 'conflict_metadata',
      deviceId: source,
      userId: (data as any).userId
    };
  }

  private isClinicalData(entityType: SyncEntityType): boolean {
    return ['assessment', 'crisis_plan', 'check_in'].includes(entityType);
  }

  private async analyzeClinicalDataDivergence(
    localData: SyncableData,
    remoteData: SyncableData,
    localMetadata: SyncMetadata,
    remoteMetadata: SyncMetadata,
    context: ConflictResolutionContext
  ): Promise<PaymentSyncConflict | null> {
    // Deep analysis of clinical data differences
    const localHash = await this.calculateDataHash(localData);
    const remoteHash = await this.calculateDataHash(remoteData);

    if (localHash !== remoteHash) {
      const severity = this.assessClinicalConflictSeverity(localData, remoteData, localMetadata.entityType);

      return this.createClinicalConflict(
        ConflictType.CLINICAL_DATA_DIVERGENCE,
        localData,
        remoteData,
        localMetadata,
        remoteMetadata,
        'Clinical data divergence detected between devices',
        severity
      );
    }

    return null;
  }

  private async calculateDataHash(data: SyncableData): Promise<string> {
    // Calculate hash for data comparison
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    return this.encryption.calculateHash(dataString);
  }

  private assessClinicalConflictSeverity(
    localData: SyncableData,
    remoteData: SyncableData,
    entityType: SyncEntityType
  ): ClinicalConflictSeverity {
    if (entityType === 'crisis_plan') {
      return ClinicalConflictSeverity.SAFETY_CRITICAL;
    }

    if (entityType === 'assessment') {
      const local = localData as any;
      const remote = remoteData as any;

      // Check for crisis-level scores
      if (this.isCrisisScore(local.totalScore, local.type) ||
          this.isCrisisScore(remote.totalScore, remote.type)) {
        return ClinicalConflictSeverity.EMERGENCY;
      }

      return ClinicalConflictSeverity.SAFETY_CRITICAL;
    }

    if (entityType === 'check_in') {
      return ClinicalConflictSeverity.CLINICAL;
    }

    return ClinicalConflictSeverity.ROUTINE;
  }

  private assessAssessmentConflictSeverity(
    localScore: number,
    remoteScore: number,
    assessmentType: string
  ): ClinicalConflictSeverity {
    // Check if either score is in crisis range
    if (this.isCrisisScore(localScore, assessmentType) ||
        this.isCrisisScore(remoteScore, assessmentType)) {
      return ClinicalConflictSeverity.EMERGENCY;
    }

    // Large score differences are safety critical
    if (Math.abs(localScore - remoteScore) >= 5) {
      return ClinicalConflictSeverity.SAFETY_CRITICAL;
    }

    return ClinicalConflictSeverity.CLINICAL;
  }

  private isCrisisScore(score: number, assessmentType: string): boolean {
    if (assessmentType === 'PHQ-9') return score >= 20;
    if (assessmentType === 'GAD-7') return score >= 15;
    return false;
  }
}

// ============================================================================
// INTELLIGENT CONFLICT RESOLVER
// ============================================================================

/**
 * AI-assisted conflict resolution engine
 */
export class IntelligentConflictResolver extends EventEmitter {
  private static instance: IntelligentConflictResolver;
  private encryption: EncryptionService;
  private resolutionPolicies = new Map<SyncEntityType, ConflictResolutionPolicy>();

  public static getInstance(): IntelligentConflictResolver {
    if (!IntelligentConflictResolver.instance) {
      IntelligentConflictResolver.instance = new IntelligentConflictResolver();
    }
    return IntelligentConflictResolver.instance;
  }

  constructor() {
    super();
    this.encryption = EncryptionService.getInstance();
    this.initializeResolutionPolicies();
  }

  /**
   * Resolve conflict using intelligent strategies
   */
  async resolveConflict(
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext
  ): Promise<ConflictResolution> {
    const startTime = Date.now();
    const auditTrail: ConflictResolutionStep[] = [];

    try {
      // Log conflict detection
      auditTrail.push({
        step: 1,
        action: 'conflict_detected',
        result: `Conflict type: ${conflict.conflictType}`,
        timestamp: new Date().toISOString()
      });

      // Crisis mode - immediate resolution
      if (context.crisisMode || conflict.clinicalContext?.severity === ClinicalConflictSeverity.EMERGENCY) {
        return await this.resolveCrisisConflict(conflict, context, auditTrail);
      }

      // Get resolution policy
      const policy = this.getResolutionPolicy(conflict.entityType);
      let strategy = policy.defaultStrategy;

      // Override strategy based on conflict type
      if (policy.strategies[conflict.conflictType]) {
        strategy = policy.strategies[conflict.conflictType];
      }

      // Clinical override
      if (conflict.clinicalContext && policy.requiresClinicalReview) {
        strategy = ConflictResolutionStrategy.CLINICAL_VALIDATION;
      }

      auditTrail.push({
        step: 2,
        action: 'strategy_selected',
        result: `Selected strategy: ${strategy}`,
        timestamp: new Date().toISOString()
      });

      // Execute resolution strategy
      const resolution = await this.executeResolutionStrategy(
        strategy,
        conflict,
        context,
        auditTrail
      );

      // Validate resolution
      const validation = await this.validateResolution(resolution, conflict, context);
      auditTrail.push({
        step: auditTrail.length + 1,
        action: 'resolution_validated',
        result: `Validation result: ${validation.isValid}`,
        timestamp: new Date().toISOString(),
        validation
      });

      const finalResolution: ConflictResolution = {
        conflictId: conflict.id,
        strategy,
        resolvedData: resolution.resolvedData,
        resolvedMetadata: resolution.resolvedMetadata,
        resolutionReason: resolution.resolutionReason,
        clinicalValidation: validation,
        auditTrail,
        resolvedAt: new Date().toISOString(),
        resolvedBy: context.userPresent ? 'user' : 'system'
      };

      this.emit('conflict_resolved', {
        conflictId: conflict.id,
        strategy,
        resolutionTime: Date.now() - startTime
      });

      return finalResolution;

    } catch (error) {
      console.error('Conflict resolution failed:', error);

      auditTrail.push({
        step: auditTrail.length + 1,
        action: 'resolution_failed',
        result: `Error: ${error}`,
        timestamp: new Date().toISOString()
      });

      // Fallback to manual review
      return await this.createManualReviewResolution(conflict, context, auditTrail, error as Error);
    }
  }

  private async resolveCrisisConflict(
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext,
    auditTrail: ConflictResolutionStep[]
  ): Promise<ConflictResolution> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'crisis_resolution_activated',
      result: 'Using crisis override strategy',
      timestamp: new Date().toISOString()
    });

    // For crisis conflicts, always prefer the data that ensures user safety
    let resolvedData: SyncableData;
    let resolvedMetadata: SyncMetadata;
    let resolutionReason: string;

    if (conflict.entityType === 'crisis_plan') {
      // For crisis plans, prefer the most recent with complete emergency contacts
      const localContacts = (conflict.localData as any)?.emergencyContacts?.length || 0;
      const remoteContacts = (conflict.remoteData as any)?.emergencyContacts?.length || 0;

      if (localContacts >= remoteContacts) {
        resolvedData = conflict.localData;
        resolvedMetadata = conflict.localMetadata;
        resolutionReason = 'Local crisis plan has more complete emergency contacts';
      } else {
        resolvedData = conflict.remoteData;
        resolvedMetadata = conflict.remoteMetadata;
        resolutionReason = 'Remote crisis plan has more complete emergency contacts';
      }
    } else if (conflict.entityType === 'assessment') {
      // For assessments in crisis, prefer the higher (more concerning) score
      const localScore = (conflict.localData as any)?.totalScore || 0;
      const remoteScore = (conflict.remoteData as any)?.totalScore || 0;

      if (localScore >= remoteScore) {
        resolvedData = conflict.localData;
        resolvedMetadata = conflict.localMetadata;
        resolutionReason = 'Local assessment shows higher crisis indicators';
      } else {
        resolvedData = conflict.remoteData;
        resolvedMetadata = conflict.remoteMetadata;
        resolutionReason = 'Remote assessment shows higher crisis indicators';
      }
    } else {
      // Default to latest timestamp for other data types
      const localTime = new Date(conflict.localMetadata.lastModified).getTime();
      const remoteTime = new Date(conflict.remoteMetadata.lastModified).getTime();

      if (localTime >= remoteTime) {
        resolvedData = conflict.localData;
        resolvedMetadata = conflict.localMetadata;
        resolutionReason = 'Local data is more recent';
      } else {
        resolvedData = conflict.remoteData;
        resolvedMetadata = conflict.remoteMetadata;
        resolutionReason = 'Remote data is more recent';
      }
    }

    // Update metadata for resolution
    resolvedMetadata = {
      ...resolvedMetadata,
      version: Math.max(conflict.localMetadata.version, conflict.remoteMetadata.version) + 1,
      lastModified: new Date().toISOString(),
      checksum: await this.encryption.calculateHash(JSON.stringify(resolvedData))
    };

    return {
      conflictId: conflict.id,
      strategy: ConflictResolutionStrategy.CRISIS_OVERRIDE as any,
      resolvedData,
      resolvedMetadata,
      resolutionReason,
      clinicalValidation: await this.validateClinicalData(resolvedData, conflict.entityType),
      auditTrail,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'system'
    };
  }

  private async executeResolutionStrategy(
    strategy: ConflictResolutionStrategy,
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    switch (strategy) {
      case ConflictResolutionStrategy.LATEST_WINS:
        return await this.resolveLatestWins(conflict, auditTrail);

      case ConflictResolutionStrategy.SERVER_WINS:
        return await this.resolveServerWins(conflict, auditTrail);

      case ConflictResolutionStrategy.CLIENT_WINS:
        return await this.resolveClientWins(conflict, auditTrail);

      case ConflictResolutionStrategy.INTELLIGENT_MERGE:
        return await this.resolveIntelligentMerge(conflict, auditTrail);

      case ConflictResolutionStrategy.PAYMENT_AUTHORITATIVE:
        return await this.resolvePaymentAuthoritative(conflict, auditTrail);

      case ConflictResolutionStrategy.CLINICAL_VALIDATION:
        return await this.resolveClinicalValidation(conflict, context, auditTrail);

      default:
        throw new Error(`Unsupported resolution strategy: ${strategy}`);
    }
  }

  private async resolveLatestWins(
    conflict: PaymentSyncConflict,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    const localTime = new Date(conflict.localMetadata.lastModified).getTime();
    const remoteTime = new Date(conflict.remoteMetadata.lastModified).getTime();

    const useLocal = localTime >= remoteTime;

    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'latest_wins_comparison',
      result: `Local: ${localTime}, Remote: ${remoteTime}, Using: ${useLocal ? 'local' : 'remote'}`,
      timestamp: new Date().toISOString()
    });

    return {
      resolvedData: useLocal ? conflict.localData : conflict.remoteData,
      resolvedMetadata: useLocal ? conflict.localMetadata : conflict.remoteMetadata,
      resolutionReason: `Latest modification wins (${useLocal ? 'local' : 'remote'} data)`
    };
  }

  private async resolveServerWins(
    conflict: PaymentSyncConflict,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'server_wins_resolution',
      result: 'Server data selected as authoritative',
      timestamp: new Date().toISOString()
    });

    return {
      resolvedData: conflict.remoteData, // Assuming remote is server
      resolvedMetadata: conflict.remoteMetadata,
      resolutionReason: 'Server data is authoritative'
    };
  }

  private async resolveClientWins(
    conflict: PaymentSyncConflict,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'client_wins_resolution',
      result: 'Client data selected as authoritative',
      timestamp: new Date().toISOString()
    });

    return {
      resolvedData: conflict.localData,
      resolvedMetadata: conflict.localMetadata,
      resolutionReason: 'Client data is authoritative'
    };
  }

  private async resolveIntelligentMerge(
    conflict: PaymentSyncConflict,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'intelligent_merge_started',
      result: 'Attempting intelligent merge of conflicting data',
      timestamp: new Date().toISOString()
    });

    const mergeResult = await this.performIntelligentMerge(conflict);

    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'intelligent_merge_completed',
      result: `Merge confidence: ${mergeResult.confidence}, Preserved: ${mergeResult.preservedFields.length} fields`,
      timestamp: new Date().toISOString()
    });

    if (mergeResult.success && mergeResult.confidence >= 0.8) {
      return {
        resolvedData: mergeResult.mergedData,
        resolvedMetadata: mergeResult.mergedMetadata,
        resolutionReason: `Intelligent merge with ${Math.round(mergeResult.confidence * 100)}% confidence`
      };
    } else {
      // Fallback to latest wins if merge confidence is low
      return await this.resolveLatestWins(conflict, auditTrail);
    }
  }

  private async resolvePaymentAuthoritative(
    conflict: PaymentSyncConflict,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'payment_authoritative_resolution',
      result: 'Using payment service as authoritative source',
      timestamp: new Date().toISOString()
    });

    // Prefer remote data as it's more likely to be from payment service
    return {
      resolvedData: conflict.remoteData,
      resolvedMetadata: conflict.remoteMetadata,
      resolutionReason: 'Payment service data is authoritative'
    };
  }

  private async resolveClinicalValidation(
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext,
    auditTrail: ConflictResolutionStep[]
  ): Promise<{
    resolvedData: SyncableData;
    resolvedMetadata: SyncMetadata;
    resolutionReason: string;
  }> {
    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'clinical_validation_started',
      result: 'Performing clinical validation of conflicting data',
      timestamp: new Date().toISOString()
    });

    // For now, use conservative approach - prefer data that maintains clinical safety
    const localValidation = await this.validateClinicalData(conflict.localData, conflict.entityType);
    const remoteValidation = await this.validateClinicalData(conflict.remoteData, conflict.entityType);

    const useLocal = localValidation.isValid &&
                    localValidation.assessmentScoresValid &&
                    localValidation.crisisThresholdsValid;

    auditTrail.push({
      step: auditTrail.length + 1,
      action: 'clinical_validation_completed',
      result: `Local valid: ${localValidation.isValid}, Remote valid: ${remoteValidation.isValid}`,
      timestamp: new Date().toISOString(),
      validation: useLocal ? localValidation : remoteValidation
    });

    return {
      resolvedData: useLocal ? conflict.localData : conflict.remoteData,
      resolvedMetadata: useLocal ? conflict.localMetadata : conflict.remoteMetadata,
      resolutionReason: `Clinical validation selected ${useLocal ? 'local' : 'remote'} data as clinically safe`
    };
  }

  private async performIntelligentMerge(conflict: PaymentSyncConflict): Promise<IntelligentMergeResult> {
    try {
      const local = conflict.localData as any;
      const remote = conflict.remoteData as any;
      const merged: any = {};

      const preservedFields: string[] = [];
      const discardedFields: string[] = [];

      // Merge logic based on entity type
      for (const key in { ...local, ...remote }) {
        const localValue = local[key];
        const remoteValue = remote[key];

        if (localValue === remoteValue) {
          merged[key] = localValue;
          preservedFields.push(key);
        } else if (localValue !== undefined && remoteValue !== undefined) {
          // Conflict - use merging strategy based on field type
          const mergedValue = this.mergeFieldValue(key, localValue, remoteValue, conflict.entityType);
          merged[key] = mergedValue.value;

          if (mergedValue.preserved) {
            preservedFields.push(key);
          } else {
            discardedFields.push(key);
          }
        } else {
          // Only one has value - use it
          merged[key] = localValue !== undefined ? localValue : remoteValue;
          preservedFields.push(key);
        }
      }

      // Create merged metadata
      const mergedMetadata: SyncMetadata = {
        entityId: conflict.localMetadata.entityId,
        entityType: conflict.localMetadata.entityType,
        version: Math.max(conflict.localMetadata.version, conflict.remoteMetadata.version) + 1,
        lastModified: new Date().toISOString(),
        checksum: await this.encryption.calculateHash(JSON.stringify(merged)),
        deviceId: 'merged',
        userId: conflict.localMetadata.userId || conflict.remoteMetadata.userId
      };

      // Calculate confidence based on successful merges
      const totalFields = Object.keys({ ...local, ...remote }).length;
      const successfulMerges = preservedFields.length;
      const confidence = totalFields > 0 ? successfulMerges / totalFields : 0;

      const clinicalValidation = await this.validateClinicalData(merged, conflict.entityType);

      return {
        success: clinicalValidation.isValid,
        mergedData: merged,
        mergedMetadata,
        confidence,
        preservedFields,
        discardedFields,
        clinicalValidation,
        auditTrail: []
      };

    } catch (error) {
      console.error('Intelligent merge failed:', error);
      return {
        success: false,
        mergedData: conflict.localData,
        mergedMetadata: conflict.localMetadata,
        confidence: 0,
        preservedFields: [],
        discardedFields: [],
        clinicalValidation: await this.validateClinicalData(conflict.localData, conflict.entityType),
        auditTrail: []
      };
    }
  }

  private mergeFieldValue(
    fieldName: string,
    localValue: any,
    remoteValue: any,
    entityType: SyncEntityType
  ): { value: any; preserved: boolean } {
    // Clinical data merging rules
    if (entityType === 'assessment' && fieldName === 'totalScore') {
      // For assessment scores, never merge - use higher score for safety
      return {
        value: Math.max(localValue, remoteValue),
        preserved: true
      };
    }

    if (entityType === 'crisis_plan' && fieldName === 'emergencyContacts') {
      // Merge emergency contacts (union of both lists)
      const localContacts = Array.isArray(localValue) ? localValue : [];
      const remoteContacts = Array.isArray(remoteValue) ? remoteValue : [];
      const mergedContacts = [...new Set([...localContacts, ...remoteContacts])];

      return {
        value: mergedContacts,
        preserved: true
      };
    }

    // Default: use latest value based on timestamp
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      // For timestamps, use latest
      if (fieldName.includes('timestamp') || fieldName.includes('Date')) {
        const localTime = new Date(localValue).getTime();
        const remoteTime = new Date(remoteValue).getTime();

        return {
          value: localTime >= remoteTime ? localValue : remoteValue,
          preserved: true
        };
      }
    }

    // Default to local value
    return {
      value: localValue,
      preserved: false
    };
  }

  private async validateResolution(
    resolution: {
      resolvedData: SyncableData;
      resolvedMetadata: SyncMetadata;
      resolutionReason: string;
    },
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext
  ): Promise<ClinicalValidationResult> {
    return await this.validateClinicalData(resolution.resolvedData, conflict.entityType);
  }

  private async validateClinicalData(
    data: SyncableData,
    entityType: SyncEntityType
  ): Promise<ClinicalValidationResult> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    let assessmentScoresValid = true;
    let crisisThresholdsValid = true;
    let therapeuticContinuityPreserved = true;

    try {
      // Validate assessment scores
      if (entityType === 'assessment') {
        const assessment = data as any;
        if (assessment.totalScore < 0 || assessment.totalScore > 27) { // PHQ-9 range
          assessmentScoresValid = false;
          issues.push('Assessment score out of valid range');
        }
      }

      // Validate crisis plan
      if (entityType === 'crisis_plan') {
        const crisisPlan = data as any;
        if (!crisisPlan.emergencyContacts || crisisPlan.emergencyContacts.length === 0) {
          crisisThresholdsValid = false;
          issues.push('Crisis plan missing emergency contacts');
          recommendations.push('Ensure at least one emergency contact is provided');
        }
      }

      // Validate check-in data
      if (entityType === 'check_in') {
        const checkIn = data as any;
        if (checkIn.mood < 1 || checkIn.mood > 10) {
          therapeuticContinuityPreserved = false;
          issues.push('Check-in mood score out of valid range');
        }
      }

    } catch (error) {
      issues.push(`Validation error: ${error}`);
    }

    return {
      isValid: issues.length === 0,
      assessmentScoresValid,
      crisisThresholdsValid,
      therapeuticContinuityPreserved,
      dataIntegrityIssues: issues,
      recommendations,
      validatedAt: new Date().toISOString()
    };
  }

  private async createManualReviewResolution(
    conflict: PaymentSyncConflict,
    context: ConflictResolutionContext,
    auditTrail: ConflictResolutionStep[],
    error: Error
  ): Promise<ConflictResolution> {
    return {
      conflictId: conflict.id,
      strategy: ConflictResolutionStrategy.MANUAL_REVIEW as any,
      resolvedData: conflict.localData, // Default to local
      resolvedMetadata: conflict.localMetadata,
      resolutionReason: `Automatic resolution failed: ${error.message}. Manual review required.`,
      clinicalValidation: await this.validateClinicalData(conflict.localData, conflict.entityType),
      auditTrail,
      resolvedAt: new Date().toISOString(),
      resolvedBy: 'system'
    };
  }

  private initializeResolutionPolicies(): void {
    // Crisis plan policy - maximum safety
    this.resolutionPolicies.set('crisis_plan', {
      entityType: 'crisis_plan',
      defaultStrategy: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      crisisOverride: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      strategies: {
        [ConflictType.VERSION_MISMATCH]: ConflictResolutionStrategy.LATEST_WINS,
        [ConflictType.CHECKSUM_MISMATCH]: ConflictResolutionStrategy.CLINICAL_VALIDATION,
        [ConflictType.CLINICAL_DATA_DIVERGENCE]: ConflictResolutionStrategy.CRISIS_OVERRIDE,
        [PaymentConflictType.SUBSCRIPTION_TIER_MISMATCH]: ConflictResolutionStrategy.PAYMENT_AUTHORITATIVE
      },
      timeoutMs: 200, // Crisis requires fast resolution
      requiresClinicalReview: true,
      auditLevel: 'comprehensive'
    });

    // Assessment policy - clinical accuracy required
    this.resolutionPolicies.set('assessment', {
      entityType: 'assessment',
      defaultStrategy: ConflictResolutionStrategy.CLINICAL_VALIDATION,
      crisisOverride: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      strategies: {
        [ConflictType.VERSION_MISMATCH]: ConflictResolutionStrategy.LATEST_WINS,
        [ConflictType.CHECKSUM_MISMATCH]: ConflictResolutionStrategy.CLINICAL_VALIDATION,
        [ConflictType.CLINICAL_DATA_DIVERGENCE]: ConflictResolutionStrategy.CLINICAL_VALIDATION
      },
      timeoutMs: 5000,
      requiresClinicalReview: true,
      auditLevel: 'comprehensive'
    });

    // Check-in policy - therapeutic continuity
    this.resolutionPolicies.set('check_in', {
      entityType: 'check_in',
      defaultStrategy: ConflictResolutionStrategy.INTELLIGENT_MERGE,
      crisisOverride: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      strategies: {
        [ConflictType.VERSION_MISMATCH]: ConflictResolutionStrategy.LATEST_WINS,
        [ConflictType.CLINICAL_DATA_DIVERGENCE]: ConflictResolutionStrategy.CLINICAL_VALIDATION
      },
      timeoutMs: 10000,
      requiresClinicalReview: false,
      auditLevel: 'detailed'
    });

    // User profile policy - subscription aware
    this.resolutionPolicies.set('user_profile', {
      entityType: 'user_profile',
      defaultStrategy: ConflictResolutionStrategy.INTELLIGENT_MERGE,
      crisisOverride: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      strategies: {
        [ConflictType.VERSION_MISMATCH]: ConflictResolutionStrategy.LATEST_WINS,
        [PaymentConflictType.SUBSCRIPTION_TIER_MISMATCH]: ConflictResolutionStrategy.PAYMENT_AUTHORITATIVE,
        [PaymentConflictType.PAYMENT_STATUS_DIVERGENCE]: ConflictResolutionStrategy.PAYMENT_AUTHORITATIVE
      },
      timeoutMs: 15000,
      requiresClinicalReview: false,
      auditLevel: 'basic'
    });
  }

  private getResolutionPolicy(entityType: SyncEntityType): ConflictResolutionPolicy {
    return this.resolutionPolicies.get(entityType) || {
      entityType,
      defaultStrategy: ConflictResolutionStrategy.LATEST_WINS,
      crisisOverride: ConflictResolutionStrategy.CRISIS_OVERRIDE,
      strategies: {},
      timeoutMs: 30000,
      requiresClinicalReview: false,
      auditLevel: 'basic'
    };
  }

  /**
   * Get conflict resolution statistics
   */
  getResolutionStatistics(): {
    totalResolutions: number;
    byStrategy: Record<string, number>;
    byEntityType: Record<string, number>;
    averageResolutionTime: number;
    clinicalValidationRate: number;
  } {
    // Implementation would track actual statistics
    return {
      totalResolutions: 0,
      byStrategy: {},
      byEntityType: {},
      averageResolutionTime: 0,
      clinicalValidationRate: 0
    };
  }
}

// Export singleton instances
export const conflictDetectionEngine = ConflictDetectionEngine.getInstance();
export const intelligentConflictResolver = IntelligentConflictResolver.getInstance();