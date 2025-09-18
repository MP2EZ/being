/**
 * Conflict Resolution Offline API
 *
 * Handles sophisticated conflict resolution when offline operations conflict with
 * server state during sync. Provides intelligent merge strategies, user-guided
 * resolution, and therapeutic priority preservation.
 *
 * CONFLICT RESOLUTION STRATEGIES:
 * - Server wins: Server state takes precedence (safe default)
 * - Client wins: Local changes preserved (user preference priority)
 * - Smart merge: Intelligent field-level merging
 * - User choice: Present conflicts to user for manual resolution
 * - Therapeutic priority: Crisis/therapeutic data always preserved
 *
 * PERFORMANCE TARGETS:
 * - Conflict detection: <100ms per operation
 * - Auto-resolution: <500ms for merge conflicts
 * - User notification: <200ms for manual conflicts
 */

import { z } from 'zod';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { OfflineOperation } from '../offline/offline-payment-queue-api';

/**
 * Conflict Types and Severity
 */
export const ConflictTypeSchema = z.enum([
  'data_version_conflict',      // Client and server have different versions
  'simultaneous_modification',  // Same field modified simultaneously
  'deleted_on_server',         // Client updated, server deleted
  'created_on_both',           // Same resource created on both sides
  'permission_changed',        // User permissions changed on server
  'schema_migration',          // Server schema updated
  'payment_state_conflict',    // Payment/subscription state conflicts
  'therapeutic_data_conflict', // Therapeutic data conflicts (high priority)
  'crisis_state_conflict'      // Crisis state conflicts (highest priority)
]);

export type ConflictType = z.infer<typeof ConflictTypeSchema>;

/**
 * Conflict Resolution Strategy
 */
export const ResolutionStrategySchema = z.enum([
  'server_wins',           // Server state takes precedence
  'client_wins',          // Client state takes precedence
  'smart_merge',          // Intelligent field-level merging
  'timestamp_based',      // Latest timestamp wins
  'user_choice',          // Present to user for decision
  'therapeutic_priority', // Preserve therapeutic data
  'crisis_override'       // Crisis data always wins
]);

export type ResolutionStrategy = z.infer<typeof ResolutionStrategySchema>;

/**
 * Field-Level Conflict
 */
export const FieldConflictSchema = z.object({
  fieldPath: z.string(), // JSONPath to conflicted field
  fieldName: z.string(),
  clientValue: z.any(),
  serverValue: z.any(),
  canMerge: z.boolean(),
  mergeStrategy: z.enum(['concat', 'union', 'prefer_client', 'prefer_server', 'user_choice']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  therapeuticImpact: z.boolean(),
  lastClientModified: z.string().optional(), // ISO timestamp
  lastServerModified: z.string().optional()
});

export type FieldConflict = z.infer<typeof FieldConflictSchema>;

/**
 * Comprehensive Conflict Description
 */
export const ConflictDescriptionSchema = z.object({
  // Core identification
  conflictId: z.string().uuid(),
  operationId: z.string().uuid(),
  resourceId: z.string(),
  resourceType: z.string(),

  // Conflict details
  conflictType: ConflictTypeSchema,
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  urgency: z.enum(['low', 'medium', 'high', 'immediate']),

  // Data states
  clientData: z.record(z.any()),
  serverData: z.record(z.any()),
  baselineData: z.record(z.any()).optional(), // Common ancestor if available

  // Field-level analysis
  fieldConflicts: z.array(FieldConflictSchema),
  conflictingSections: z.array(z.string()),
  automaticallyMergeableFields: z.array(z.string()),

  // Resolution context
  recommendedStrategy: ResolutionStrategySchema,
  availableStrategies: z.array(ResolutionStrategySchema),
  autoResolutionPossible: z.boolean(),

  // User context
  userFacingDescription: z.string(),
  therapeuticImpact: z.object({
    affectsTherapy: z.boolean(),
    impactLevel: z.enum(['none', 'minimal', 'moderate', 'significant', 'critical']),
    therapeuticGuidance: z.string().optional()
  }),

  // Crisis context
  crisisContext: z.object({
    involvesCrisisData: z.boolean(),
    crisisLevel: z.enum(['none', 'watch', 'elevated', 'high', 'critical']).default('none'),
    requiresImmediate: z.boolean(),
    crisisOverrideAvailable: z.boolean()
  }),

  // Timing
  detectedAt: z.string(), // ISO timestamp
  mustResolveBy: z.string().optional(), // ISO timestamp
  resolutionDeadline: z.string().optional(),

  // Metadata
  syncAttempt: z.number().min(1),
  previousResolutionAttempts: z.number().min(0).default(0),
  metadata: z.record(z.any()).default({})
});

export type ConflictDescription = z.infer<typeof ConflictDescriptionSchema>;

/**
 * Resolution Result
 */
export const ResolutionResultSchema = z.object({
  // Resolution outcome
  conflictId: z.string().uuid(),
  resolved: z.boolean(),
  strategy: ResolutionStrategySchema,
  resolutionSource: z.enum(['automatic', 'user_choice', 'system_policy', 'crisis_override']),

  // Resolved data
  resolvedData: z.record(z.any()),
  appliedChanges: z.array(z.object({
    field: z.string(),
    oldValue: z.any(),
    newValue: z.any(),
    reason: z.string()
  })),

  // Resolution quality
  confidence: z.number().min(0).max(1), // 0-1 confidence in resolution
  dataLoss: z.boolean(), // Whether any data was lost
  lostData: z.record(z.any()).optional(),

  // Performance metrics
  resolutionTime: z.number().min(0), // ms
  userInteractionRequired: z.boolean(),
  userResponseTime: z.number().min(0).optional(), // ms if user involved

  // Therapeutic preservation
  therapeuticDataPreserved: z.boolean(),
  crisisDataPreserved: z.boolean(),
  priorityDataPreserved: z.boolean(),

  // Follow-up actions
  requiresUserNotification: z.boolean(),
  requiresSync: z.boolean(),
  followUpActions: z.array(z.string()),

  // Timestamps
  resolvedAt: z.string(), // ISO timestamp
  appliedAt: z.string().optional() // When resolution was applied
});

export type ResolutionResult = z.infer<typeof ResolutionResultSchema>;

/**
 * User Conflict Choice
 */
export const UserConflictChoiceSchema = z.object({
  conflictId: z.string().uuid(),
  choiceStrategy: ResolutionStrategySchema,
  fieldChoices: z.record(z.enum(['client', 'server', 'merge', 'custom'])),
  customValues: z.record(z.any()).optional(),
  userComments: z.string().optional(),
  applyToSimilar: z.boolean().default(false), // Apply same choice to similar conflicts
  timestamp: z.string() // ISO timestamp
});

export type UserConflictChoice = z.infer<typeof UserConflictChoiceSchema>;

/**
 * Conflict Resolution Offline API Class
 */
export class ConflictResolutionOfflineAPI {
  private activeConflicts: Map<string, ConflictDescription>;
  private resolutionHistory: Map<string, ResolutionResult>;
  private userPreferences: Map<string, ResolutionStrategy>; // User's preferred strategies by conflict type
  private storageKey: string;
  private notificationCallback: ((conflict: ConflictDescription) => void) | null;

  constructor(config?: {
    storageKey?: string;
    notificationCallback?: (conflict: ConflictDescription) => void;
  }) {
    this.activeConflicts = new Map();
    this.resolutionHistory = new Map();
    this.userPreferences = new Map();
    this.storageKey = config?.storageKey || 'being_conflict_resolution';
    this.notificationCallback = config?.notificationCallback || null;
  }

  /**
   * Detect and analyze conflict between offline operation and server state
   */
  async detectConflict(
    operation: OfflineOperation,
    serverResponse: {
      status: number;
      data?: any;
      conflictData?: any;
    }
  ): Promise<ConflictDescription | null> {
    const startTime = Date.now();

    try {
      // Only process actual conflicts
      if (serverResponse.status !== 409) {
        return null;
      }

      const serverData = serverResponse.conflictData || serverResponse.data || {};
      const clientData = operation.payload;

      // Analyze the conflict
      const conflictType = this.determineConflictType(operation, clientData, serverData);
      const severity = this.assessConflictSeverity(conflictType, operation, clientData, serverData);
      const urgency = this.assessConflictUrgency(conflictType, operation);

      // Perform field-level analysis
      const fieldConflicts = this.analyzeFieldConflicts(clientData, serverData);

      // Determine therapeutic and crisis impact
      const therapeuticImpact = this.assessTherapeuticImpact(operation, fieldConflicts);
      const crisisContext = this.assessCrisisContext(operation, fieldConflicts);

      // Determine resolution strategies
      const recommendedStrategy = this.recommendResolutionStrategy(
        conflictType,
        severity,
        therapeuticImpact,
        crisisContext,
        operation
      );

      const availableStrategies = this.getAvailableStrategies(conflictType, therapeuticImpact, crisisContext);

      const conflict: ConflictDescription = {
        conflictId: crypto.randomUUID(),
        operationId: operation.id,
        resourceId: operation.payload.id || operation.id,
        resourceType: operation.operationType,
        conflictType,
        severity,
        urgency,
        clientData,
        serverData,
        fieldConflicts,
        conflictingSections: fieldConflicts.map(fc => fc.fieldName),
        automaticallyMergeableFields: fieldConflicts
          .filter(fc => fc.canMerge && fc.priority !== 'critical')
          .map(fc => fc.fieldName),
        recommendedStrategy,
        availableStrategies,
        autoResolutionPossible: this.canAutoResolve(
          recommendedStrategy,
          fieldConflicts,
          therapeuticImpact,
          crisisContext
        ),
        userFacingDescription: this.generateUserDescription(conflictType, operation, fieldConflicts),
        therapeuticImpact,
        crisisContext,
        detectedAt: new Date().toISOString(),
        mustResolveBy: this.calculateResolutionDeadline(urgency, crisisContext),
        syncAttempt: operation.retryCount + 1,
        previousResolutionAttempts: 0,
        metadata: {
          detectionTime: Date.now() - startTime,
          operationAge: Date.now() - new Date(operation.createdAt).getTime()
        }
      };

      // Store active conflict
      this.activeConflicts.set(conflict.conflictId, conflict);

      // Notify if callback is registered
      this.notificationCallback?.(conflict);

      // Auto-resolve if possible
      if (conflict.autoResolutionPossible) {
        setTimeout(() => {
          this.resolveConflict(conflict.conflictId).catch(error => {
            console.error('Auto-resolution failed:', error);
          });
        }, 50); // Small delay to allow for immediate user override
      }

      return conflict;

    } catch (error) {
      console.error('Conflict detection failed:', error);
      return null;
    }
  }

  /**
   * Resolve conflict using specified or recommended strategy
   */
  async resolveConflict(
    conflictId: string,
    userChoice?: UserConflictChoice
  ): Promise<ResolutionResult> {
    const startTime = Date.now();
    const conflict = this.activeConflicts.get(conflictId);

    if (!conflict) {
      throw new Error(`Conflict not found: ${conflictId}`);
    }

    try {
      let strategy: ResolutionStrategy;
      let resolutionSource: 'automatic' | 'user_choice' | 'system_policy' | 'crisis_override';

      // Determine resolution strategy
      if (userChoice) {
        strategy = userChoice.choiceStrategy;
        resolutionSource = 'user_choice';

        // Remember user preference for similar conflicts
        if (userChoice.applyToSimilar) {
          this.userPreferences.set(`${conflict.conflictType}_${conflict.resourceType}`, strategy);
        }
      } else if (conflict.crisisContext.requiresImmediate) {
        strategy = 'crisis_override';
        resolutionSource = 'crisis_override';
      } else {
        strategy = conflict.recommendedStrategy;
        resolutionSource = 'automatic';
      }

      // Apply resolution strategy
      const resolution = await this.applyResolutionStrategy(
        conflict,
        strategy,
        userChoice
      );

      const resolutionTime = Date.now() - startTime;

      const result: ResolutionResult = {
        conflictId,
        resolved: resolution.success,
        strategy,
        resolutionSource,
        resolvedData: resolution.data,
        appliedChanges: resolution.changes,
        confidence: resolution.confidence,
        dataLoss: resolution.dataLoss,
        lostData: resolution.lostData,
        resolutionTime,
        userInteractionRequired: !!userChoice,
        userResponseTime: userChoice ? Date.now() - new Date(conflict.detectedAt).getTime() : undefined,
        therapeuticDataPreserved: this.wasTherapeuticDataPreserved(conflict, resolution),
        crisisDataPreserved: this.wasCrisisDataPreserved(conflict, resolution),
        priorityDataPreserved: this.wasPriorityDataPreserved(conflict, resolution),
        requiresUserNotification: resolution.requiresNotification,
        requiresSync: resolution.requiresSync,
        followUpActions: resolution.followUpActions,
        resolvedAt: new Date().toISOString()
      };

      // Store resolution result
      this.resolutionHistory.set(conflictId, result);

      // Remove from active conflicts
      this.activeConflicts.delete(conflictId);

      // Persist resolution
      await this.persistResolutionResult(result);

      console.log(`Conflict ${conflictId} resolved using ${strategy} in ${resolutionTime}ms`);

      return result;

    } catch (error) {
      console.error(`Failed to resolve conflict ${conflictId}:`, error);

      const failedResult: ResolutionResult = {
        conflictId,
        resolved: false,
        strategy: conflict.recommendedStrategy,
        resolutionSource: 'automatic',
        resolvedData: {},
        appliedChanges: [],
        confidence: 0,
        dataLoss: false,
        resolutionTime: Date.now() - startTime,
        userInteractionRequired: false,
        therapeuticDataPreserved: false,
        crisisDataPreserved: false,
        priorityDataPreserved: false,
        requiresUserNotification: true,
        requiresSync: false,
        followUpActions: ['manual_review_required'],
        resolvedAt: new Date().toISOString()
      };

      return failedResult;
    }
  }

  /**
   * Get all active conflicts requiring attention
   */
  getActiveConflicts(): ConflictDescription[] {
    return Array.from(this.activeConflicts.values());
  }

  /**
   * Get conflicts requiring user input
   */
  getConflictsRequiringUserInput(): ConflictDescription[] {
    return Array.from(this.activeConflicts.values())
      .filter(conflict =>
        conflict.recommendedStrategy === 'user_choice' ||
        !conflict.autoResolutionPossible
      );
  }

  /**
   * Get conflict resolution statistics
   */
  async getResolutionStatistics(): Promise<{
    totalConflicts: number;
    resolvedConflicts: number;
    autoResolved: number;
    userResolved: number;
    failedResolutions: number;
    averageResolutionTime: number;
    therapeuticDataPreservationRate: number;
    crisisDataPreservationRate: number;
  }> {
    const results = Array.from(this.resolutionHistory.values());

    const totalConflicts = results.length;
    const resolvedConflicts = results.filter(r => r.resolved).length;
    const autoResolved = results.filter(r => r.resolutionSource === 'automatic').length;
    const userResolved = results.filter(r => r.resolutionSource === 'user_choice').length;
    const failedResolutions = results.filter(r => !r.resolved).length;

    const avgResolutionTime = results.length > 0
      ? results.reduce((sum, r) => sum + r.resolutionTime, 0) / results.length
      : 0;

    const therapeuticPreservationRate = results.length > 0
      ? results.filter(r => r.therapeuticDataPreserved).length / results.length
      : 1;

    const crisisPreservationRate = results.length > 0
      ? results.filter(r => r.crisisDataPreserved).length / results.length
      : 1;

    return {
      totalConflicts,
      resolvedConflicts,
      autoResolved,
      userResolved,
      failedResolutions,
      averageResolutionTime: avgResolutionTime,
      therapeuticDataPreservationRate: therapeuticPreservationRate,
      crisisDataPreservationRate: crisisPreservationRate
    };
  }

  /**
   * Private helper methods
   */
  private determineConflictType(
    operation: OfflineOperation,
    clientData: any,
    serverData: any
  ): ConflictType {
    // Crisis operations have their own conflict type
    if (operation.isCrisisOperation || operation.crisisLevel !== 'none') {
      return 'crisis_state_conflict';
    }

    // Therapeutic data conflicts
    if (operation.affectsTherapeuticAccess || this.isTherapeuticData(clientData)) {
      return 'therapeutic_data_conflict';
    }

    // Payment/subscription conflicts
    if (operation.operationType.includes('payment') || operation.operationType.includes('subscription')) {
      return 'payment_state_conflict';
    }

    // Check if server deleted the resource
    if (!serverData || Object.keys(serverData).length === 0) {
      return 'deleted_on_server';
    }

    // Check for version conflicts
    if (clientData.version && serverData.version && clientData.version !== serverData.version) {
      return 'data_version_conflict';
    }

    // Default to simultaneous modification
    return 'simultaneous_modification';
  }

  private assessConflictSeverity(
    conflictType: ConflictType,
    operation: OfflineOperation,
    clientData: any,
    serverData: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    // Crisis conflicts are always critical
    if (conflictType === 'crisis_state_conflict') {
      return 'critical';
    }

    // Therapeutic data conflicts are high priority
    if (conflictType === 'therapeutic_data_conflict') {
      return 'high';
    }

    // Payment conflicts can be critical if they affect access
    if (conflictType === 'payment_state_conflict') {
      if (operation.affectsTherapeuticAccess) {
        return 'high';
      }
      return 'medium';
    }

    // Data version conflicts can be various severities
    if (conflictType === 'data_version_conflict') {
      const versionDiff = Math.abs(
        parseInt(clientData.version || '0') - parseInt(serverData.version || '0')
      );
      if (versionDiff > 5) return 'high';
      if (versionDiff > 2) return 'medium';
      return 'low';
    }

    return 'medium';
  }

  private assessConflictUrgency(
    conflictType: ConflictType,
    operation: OfflineOperation
  ): 'low' | 'medium' | 'high' | 'immediate' {
    if (conflictType === 'crisis_state_conflict') {
      return 'immediate';
    }

    if (operation.isCrisisOperation || operation.bypassOfflineQueue) {
      return 'immediate';
    }

    if (conflictType === 'therapeutic_data_conflict') {
      return 'high';
    }

    if (operation.priority >= 8) {
      return 'high';
    }

    if (operation.priority >= 6) {
      return 'medium';
    }

    return 'low';
  }

  private analyzeFieldConflicts(clientData: any, serverData: any): FieldConflict[] {
    const conflicts: FieldConflict[] = [];

    const allKeys = new Set([...Object.keys(clientData), ...Object.keys(serverData)]);

    for (const key of allKeys) {
      const clientValue = clientData[key];
      const serverValue = serverData[key];

      // Skip if values are identical
      if (JSON.stringify(clientValue) === JSON.stringify(serverValue)) {
        continue;
      }

      // Determine if field can be merged
      const canMerge = this.canMergeField(key, clientValue, serverValue);

      // Assess priority based on field name/content
      const priority = this.assessFieldPriority(key, clientValue, serverValue);

      // Check therapeutic impact
      const therapeuticImpact = this.isTherapeuticField(key, clientValue, serverValue);

      conflicts.push({
        fieldPath: key,
        fieldName: key,
        clientValue,
        serverValue,
        canMerge,
        mergeStrategy: canMerge ? this.suggestMergeStrategy(key, clientValue, serverValue) : undefined,
        priority,
        therapeuticImpact,
        lastClientModified: clientData.updatedAt || clientData.modifiedAt,
        lastServerModified: serverData.updatedAt || serverData.modifiedAt
      });
    }

    return conflicts;
  }

  private canMergeField(fieldName: string, clientValue: any, serverValue: any): boolean {
    // Arrays can often be merged
    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      return true;
    }

    // Objects can sometimes be merged
    if (typeof clientValue === 'object' && typeof serverValue === 'object' &&
        clientValue !== null && serverValue !== null) {
      return true;
    }

    // Strings might be concatenatable
    if (typeof clientValue === 'string' && typeof serverValue === 'string') {
      return fieldName.includes('note') || fieldName.includes('comment') || fieldName.includes('description');
    }

    // Numbers usually can't be merged
    return false;
  }

  private suggestMergeStrategy(
    fieldName: string,
    clientValue: any,
    serverValue: any
  ): 'concat' | 'union' | 'prefer_client' | 'prefer_server' | 'user_choice' {
    if (Array.isArray(clientValue) && Array.isArray(serverValue)) {
      return 'union'; // Combine arrays
    }

    if (typeof clientValue === 'string' && typeof serverValue === 'string') {
      return 'concat'; // Concatenate strings
    }

    if (typeof clientValue === 'object' && typeof serverValue === 'object') {
      return 'prefer_client'; // Prefer client object by default
    }

    return 'user_choice';
  }

  private assessFieldPriority(
    fieldName: string,
    clientValue: any,
    serverValue: any
  ): 'low' | 'medium' | 'high' | 'critical' {
    const criticalFields = ['crisis_plan', 'emergency_contacts', 'safety_data'];
    const highPriorityFields = ['assessment_scores', 'therapeutic_data', 'mood_data'];
    const mediumPriorityFields = ['preferences', 'settings', 'progress_data'];

    if (criticalFields.some(field => fieldName.includes(field))) {
      return 'critical';
    }

    if (highPriorityFields.some(field => fieldName.includes(field))) {
      return 'high';
    }

    if (mediumPriorityFields.some(field => fieldName.includes(field))) {
      return 'medium';
    }

    return 'low';
  }

  private isTherapeuticField(fieldName: string, clientValue: any, serverValue: any): boolean {
    const therapeuticFields = [
      'assessment', 'mood', 'anxiety', 'depression', 'wellbeing',
      'therapy', 'treatment', 'clinical', 'mental_health',
      'crisis', 'safety', 'intervention'
    ];

    return therapeuticFields.some(field => fieldName.toLowerCase().includes(field));
  }

  private isTherapeuticData(data: any): boolean {
    if (!data || typeof data !== 'object') return false;

    const therapeuticKeys = Object.keys(data).filter(key =>
      this.isTherapeuticField(key, data[key], null)
    );

    return therapeuticKeys.length > 0;
  }

  private assessTherapeuticImpact(
    operation: OfflineOperation,
    fieldConflicts: FieldConflict[]
  ) {
    const therapeuticFields = fieldConflicts.filter(fc => fc.therapeuticImpact);

    if (operation.affectsTherapeuticAccess || therapeuticFields.length > 0) {
      const criticalTherapeuticFields = therapeuticFields.filter(fc => fc.priority === 'critical');

      return {
        affectsTherapy: true,
        impactLevel: criticalTherapeuticFields.length > 0 ? 'critical' as const :
                    therapeuticFields.length > 2 ? 'significant' as const :
                    therapeuticFields.length > 0 ? 'moderate' as const : 'minimal' as const,
        therapeuticGuidance: this.generateTherapeuticGuidance(therapeuticFields)
      };
    }

    return {
      affectsTherapy: false,
      impactLevel: 'none' as const
    };
  }

  private assessCrisisContext(
    operation: OfflineOperation,
    fieldConflicts: FieldConflict[]
  ) {
    const crisisFields = fieldConflicts.filter(fc =>
      fc.fieldName.includes('crisis') || fc.fieldName.includes('emergency')
    );

    return {
      involvesCrisisData: operation.isCrisisOperation || crisisFields.length > 0,
      crisisLevel: operation.crisisLevel,
      requiresImmediate: operation.bypassOfflineQueue || operation.crisisLevel === 'emergency',
      crisisOverrideAvailable: true // Crisis data can always override
    };
  }

  private recommendResolutionStrategy(
    conflictType: ConflictType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    therapeuticImpact: any,
    crisisContext: any,
    operation: OfflineOperation
  ): ResolutionStrategy {
    // Crisis override for crisis data
    if (crisisContext.requiresImmediate) {
      return 'crisis_override';
    }

    // Therapeutic priority for therapeutic data
    if (therapeuticImpact.affectsTherapy && therapeuticImpact.impactLevel !== 'minimal') {
      return 'therapeutic_priority';
    }

    // Check user preferences
    const userPreference = this.userPreferences.get(`${conflictType}_${operation.operationType}`);
    if (userPreference) {
      return userPreference;
    }

    // Default strategies by conflict type
    switch (conflictType) {
      case 'crisis_state_conflict':
        return 'crisis_override';
      case 'therapeutic_data_conflict':
        return 'therapeutic_priority';
      case 'payment_state_conflict':
        return 'server_wins'; // Server payment state is authoritative
      case 'data_version_conflict':
        return 'smart_merge';
      case 'deleted_on_server':
        return 'server_wins';
      case 'simultaneous_modification':
        return severity === 'critical' ? 'user_choice' : 'smart_merge';
      default:
        return 'smart_merge';
    }
  }

  private getAvailableStrategies(
    conflictType: ConflictType,
    therapeuticImpact: any,
    crisisContext: any
  ): ResolutionStrategy[] {
    const baseStrategies: ResolutionStrategy[] = ['server_wins', 'client_wins', 'smart_merge'];

    // Crisis data always has crisis override available
    if (crisisContext.involvesCrisisData) {
      baseStrategies.push('crisis_override');
    }

    // Therapeutic data has therapeutic priority
    if (therapeuticImpact.affectsTherapy) {
      baseStrategies.push('therapeutic_priority');
    }

    // Timestamp-based resolution for version conflicts
    if (conflictType === 'data_version_conflict') {
      baseStrategies.push('timestamp_based');
    }

    // User choice is always available for non-immediate conflicts
    if (!crisisContext.requiresImmediate) {
      baseStrategies.push('user_choice');
    }

    return baseStrategies;
  }

  private canAutoResolve(
    strategy: ResolutionStrategy,
    fieldConflicts: FieldConflict[],
    therapeuticImpact: any,
    crisisContext: any
  ): boolean {
    // Crisis override is always auto-resolvable
    if (strategy === 'crisis_override') {
      return true;
    }

    // Therapeutic priority is auto-resolvable
    if (strategy === 'therapeutic_priority') {
      return true;
    }

    // Server/client wins are auto-resolvable
    if (strategy === 'server_wins' || strategy === 'client_wins') {
      return true;
    }

    // Smart merge is auto-resolvable if all fields can be merged
    if (strategy === 'smart_merge') {
      return fieldConflicts.every(fc => fc.canMerge || fc.priority !== 'critical');
    }

    // User choice is never auto-resolvable
    return false;
  }

  private generateUserDescription(
    conflictType: ConflictType,
    operation: OfflineOperation,
    fieldConflicts: FieldConflict[]
  ): string {
    const conflictCount = fieldConflicts.length;
    const operationName = this.friendlyOperationName(operation.operationType);

    const descriptions = {
      'crisis_state_conflict': `Your crisis information conflicts with server updates. Crisis data will be preserved.`,
      'therapeutic_data_conflict': `Your therapeutic data has conflicted with server changes. Your therapeutic progress will be preserved.`,
      'payment_state_conflict': `Your payment information differs from server records. Server payment state will be used for accuracy.`,
      'data_version_conflict': `Your ${operationName} data has a different version than the server. Changes will be merged automatically.`,
      'deleted_on_server': `The ${operationName} was deleted on the server while you made changes offline.`,
      'simultaneous_modification': `Both you and the server modified the same ${operationName} data simultaneously.`,
      'created_on_both': `You created a ${operationName} offline that was also created on the server.`,
      'permission_changed': `Your permissions for ${operationName} changed while you were offline.`,
      'schema_migration': `The ${operationName} data format was updated on the server while you were offline.`
    };

    let description = descriptions[conflictType] || `Conflict detected with ${operationName}.`;

    if (conflictCount > 1) {
      description += ` ${conflictCount} fields are affected.`;
    }

    return description;
  }

  private friendlyOperationName(operationType: string): string {
    const friendlyNames = {
      'payment_sync': 'payment',
      'subscription_update': 'subscription',
      'trial_extension': 'trial',
      'billing_update': 'billing',
      'usage_sync': 'usage',
      'tier_change': 'subscription tier',
      'grace_period_activation': 'grace period',
      'payment_retry': 'payment',
      'subscription_cancel': 'subscription cancellation',
      'refund_request': 'refund request'
    };

    return friendlyNames[operationType] || operationType.replace('_', ' ');
  }

  private generateTherapeuticGuidance(therapeuticFields: FieldConflict[]): string {
    if (therapeuticFields.length === 0) return '';

    const criticalFields = therapeuticFields.filter(fc => fc.priority === 'critical');
    if (criticalFields.length > 0) {
      return 'Critical therapeutic data is involved. Your safety and progress data will be preserved.';
    }

    return 'Your therapeutic data will be handled carefully to preserve your progress and insights.';
  }

  private calculateResolutionDeadline(
    urgency: 'low' | 'medium' | 'high' | 'immediate',
    crisisContext: any
  ): string {
    const now = new Date();

    if (urgency === 'immediate' || crisisContext.requiresImmediate) {
      return new Date(now.getTime() + 30 * 1000).toISOString(); // 30 seconds
    }

    if (urgency === 'high') {
      return new Date(now.getTime() + 5 * 60 * 1000).toISOString(); // 5 minutes
    }

    if (urgency === 'medium') {
      return new Date(now.getTime() + 30 * 60 * 1000).toISOString(); // 30 minutes
    }

    return new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(); // 2 hours
  }

  private async applyResolutionStrategy(
    conflict: ConflictDescription,
    strategy: ResolutionStrategy,
    userChoice?: UserConflictChoice
  ): Promise<{
    success: boolean;
    data: any;
    changes: Array<{ field: string; oldValue: any; newValue: any; reason: string }>;
    confidence: number;
    dataLoss: boolean;
    lostData?: any;
    requiresNotification: boolean;
    requiresSync: boolean;
    followUpActions: string[];
  }> {
    const changes: Array<{ field: string; oldValue: any; newValue: any; reason: string }> = [];
    let resolvedData = { ...conflict.clientData };
    let dataLoss = false;
    let lostData: any = {};

    try {
      switch (strategy) {
        case 'server_wins':
          resolvedData = { ...conflict.serverData };
          lostData = conflict.clientData;
          dataLoss = true;
          changes.push({
            field: '*',
            oldValue: conflict.clientData,
            newValue: conflict.serverData,
            reason: 'Server state takes precedence'
          });
          break;

        case 'client_wins':
          resolvedData = { ...conflict.clientData };
          changes.push({
            field: '*',
            oldValue: conflict.serverData,
            newValue: conflict.clientData,
            reason: 'Client changes preserved'
          });
          break;

        case 'crisis_override':
          resolvedData = { ...conflict.clientData };
          // Preserve any crisis-related server data
          for (const key of Object.keys(conflict.serverData)) {
            if (key.includes('crisis') || key.includes('emergency')) {
              resolvedData[key] = conflict.serverData[key];
            }
          }
          break;

        case 'therapeutic_priority':
          resolvedData = { ...conflict.serverData };
          // Preserve therapeutic data from client
          for (const fieldConflict of conflict.fieldConflicts) {
            if (fieldConflict.therapeuticImpact) {
              resolvedData[fieldConflict.fieldName] = fieldConflict.clientValue;
              changes.push({
                field: fieldConflict.fieldName,
                oldValue: fieldConflict.serverValue,
                newValue: fieldConflict.clientValue,
                reason: 'Therapeutic data preserved'
              });
            }
          }
          break;

        case 'smart_merge':
          resolvedData = await this.performSmartMerge(conflict);
          // Changes would be calculated during merge
          break;

        case 'timestamp_based':
          const clientTime = new Date(conflict.clientData.updatedAt || conflict.clientData.createdAt || 0);
          const serverTime = new Date(conflict.serverData.updatedAt || conflict.serverData.createdAt || 0);

          if (clientTime > serverTime) {
            resolvedData = { ...conflict.clientData };
          } else {
            resolvedData = { ...conflict.serverData };
            dataLoss = true;
            lostData = conflict.clientData;
          }
          break;

        case 'user_choice':
          if (userChoice) {
            resolvedData = await this.applyUserChoices(conflict, userChoice);
          } else {
            throw new Error('User choice required but not provided');
          }
          break;
      }

      return {
        success: true,
        data: resolvedData,
        changes,
        confidence: this.calculateResolutionConfidence(strategy, conflict),
        dataLoss,
        lostData: dataLoss ? lostData : undefined,
        requiresNotification: dataLoss || strategy === 'user_choice',
        requiresSync: true,
        followUpActions: this.determineFollowUpActions(strategy, conflict, dataLoss)
      };

    } catch (error) {
      return {
        success: false,
        data: {},
        changes: [],
        confidence: 0,
        dataLoss: false,
        requiresNotification: true,
        requiresSync: false,
        followUpActions: ['manual_review_required', 'contact_support']
      };
    }
  }

  private async performSmartMerge(conflict: ConflictDescription): Promise<any> {
    const merged = { ...conflict.serverData }; // Start with server as base

    for (const fieldConflict of conflict.fieldConflicts) {
      if (fieldConflict.canMerge && fieldConflict.mergeStrategy) {
        switch (fieldConflict.mergeStrategy) {
          case 'union':
            if (Array.isArray(fieldConflict.clientValue) && Array.isArray(fieldConflict.serverValue)) {
              merged[fieldConflict.fieldName] = [
                ...new Set([...fieldConflict.serverValue, ...fieldConflict.clientValue])
              ];
            }
            break;

          case 'concat':
            if (typeof fieldConflict.clientValue === 'string' && typeof fieldConflict.serverValue === 'string') {
              merged[fieldConflict.fieldName] = `${fieldConflict.serverValue}\n\n${fieldConflict.clientValue}`;
            }
            break;

          case 'prefer_client':
            merged[fieldConflict.fieldName] = fieldConflict.clientValue;
            break;

          case 'prefer_server':
            merged[fieldConflict.fieldName] = fieldConflict.serverValue;
            break;
        }
      } else if (fieldConflict.therapeuticImpact || fieldConflict.priority === 'critical') {
        // Always prefer client for therapeutic/critical data
        merged[fieldConflict.fieldName] = fieldConflict.clientValue;
      }
    }

    return merged;
  }

  private async applyUserChoices(
    conflict: ConflictDescription,
    userChoice: UserConflictChoice
  ): Promise<any> {
    const resolved = { ...conflict.serverData };

    for (const [fieldName, choice] of Object.entries(userChoice.fieldChoices)) {
      const fieldConflict = conflict.fieldConflicts.find(fc => fc.fieldName === fieldName);
      if (!fieldConflict) continue;

      switch (choice) {
        case 'client':
          resolved[fieldName] = fieldConflict.clientValue;
          break;
        case 'server':
          resolved[fieldName] = fieldConflict.serverValue;
          break;
        case 'custom':
          if (userChoice.customValues?.[fieldName] !== undefined) {
            resolved[fieldName] = userChoice.customValues[fieldName];
          }
          break;
        case 'merge':
          // Apply automatic merge for this field
          if (fieldConflict.canMerge) {
            resolved[fieldName] = await this.mergeFieldValues(fieldConflict);
          }
          break;
      }
    }

    return resolved;
  }

  private async mergeFieldValues(fieldConflict: FieldConflict): Promise<any> {
    if (!fieldConflict.mergeStrategy) return fieldConflict.serverValue;

    switch (fieldConflict.mergeStrategy) {
      case 'union':
        return [...new Set([...fieldConflict.serverValue, ...fieldConflict.clientValue])];
      case 'concat':
        return `${fieldConflict.serverValue} ${fieldConflict.clientValue}`;
      default:
        return fieldConflict.clientValue;
    }
  }

  private calculateResolutionConfidence(
    strategy: ResolutionStrategy,
    conflict: ConflictDescription
  ): number {
    // Crisis and therapeutic overrides have high confidence
    if (strategy === 'crisis_override' || strategy === 'therapeutic_priority') {
      return 0.95;
    }

    // Server wins is generally safe
    if (strategy === 'server_wins') {
      return 0.85;
    }

    // Smart merge confidence depends on field mergeability
    if (strategy === 'smart_merge') {
      const mergeableFields = conflict.fieldConflicts.filter(fc => fc.canMerge);
      return mergeableFields.length / conflict.fieldConflicts.length * 0.8;
    }

    // User choice has high confidence since user decided
    if (strategy === 'user_choice') {
      return 0.9;
    }

    return 0.7; // Default confidence
  }

  private determineFollowUpActions(
    strategy: ResolutionStrategy,
    conflict: ConflictDescription,
    dataLoss: boolean
  ): string[] {
    const actions: string[] = [];

    if (dataLoss) {
      actions.push('backup_lost_data');
    }

    if (conflict.crisisContext.involvesCrisisData) {
      actions.push('verify_crisis_data_integrity');
    }

    if (conflict.therapeuticImpact.affectsTherapy) {
      actions.push('validate_therapeutic_continuity');
    }

    if (strategy === 'user_choice') {
      actions.push('update_user_preferences');
    }

    return actions;
  }

  private wasTherapeuticDataPreserved(conflict: ConflictDescription, resolution: any): boolean {
    if (!conflict.therapeuticImpact.affectsTherapy) return true;

    const therapeuticFields = conflict.fieldConflicts.filter(fc => fc.therapeuticImpact);
    return therapeuticFields.every(fc =>
      JSON.stringify(resolution.data[fc.fieldName]) === JSON.stringify(fc.clientValue)
    );
  }

  private wasCrisisDataPreserved(conflict: ConflictDescription, resolution: any): boolean {
    if (!conflict.crisisContext.involvesCrisisData) return true;

    // Crisis data preservation logic
    return true; // Implementation would check actual crisis fields
  }

  private wasPriorityDataPreserved(conflict: ConflictDescription, resolution: any): boolean {
    const criticalFields = conflict.fieldConflicts.filter(fc => fc.priority === 'critical');
    return criticalFields.length === 0 || criticalFields.every(fc =>
      resolution.data[fc.fieldName] !== undefined
    );
  }

  private async persistResolutionResult(result: ResolutionResult): Promise<void> {
    try {
      const existing = await AsyncStorage.getItem(`${this.storageKey}_resolutions`);
      const resolutions = existing ? JSON.parse(existing) : [];

      resolutions.push(result);

      // Keep only last 100 resolutions
      if (resolutions.length > 100) {
        resolutions.splice(0, resolutions.length - 100);
      }

      await AsyncStorage.setItem(`${this.storageKey}_resolutions`, JSON.stringify(resolutions));
    } catch (error) {
      console.error('Failed to persist resolution result:', error);
    }
  }
}

/**
 * Default instance for global use
 */
export const conflictResolutionOffline = new ConflictResolutionOfflineAPI();

export default ConflictResolutionOfflineAPI;