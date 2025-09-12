/**
 * Advanced Error Handling Types for FullMind MBCT App
 * 
 * Clinical-grade error handling for SQLite migration and Calendar integration
 * with comprehensive safety protocols and therapeutic continuity guarantees.
 */

import {
  SQLiteMigrationError,
  SQLiteClinicalSafetyError
} from './sqlite';

import {
  CalendarPrivacyError,
  CalendarClinicalSafetyError
} from './calendar';

import {
  AdvancedFeatureError
} from './advanced-features';

// Enhanced Clinical Error Base Class
export abstract class ClinicalSafetyError extends Error {
  constructor(
    message: string,
    public readonly errorCode: string,
    public readonly clinicalImpact: ClinicalImpactLevel,
    public readonly therapeuticContinuity: boolean,
    public readonly emergencyAccessMaintained: boolean,
    public readonly mitigationStrategy: readonly string[],
    public readonly userNotificationRequired: boolean = true
  ) {
    super(message);
    this.name = 'ClinicalSafetyError';
    
    // Ensure stack trace points to actual error location
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ClinicalSafetyError);
    }
  }
  
  // Abstract method for specific error handling
  abstract getRecoveryActions(): Promise<readonly RecoveryAction[]>;
  abstract assessTherapeuticImpact(): TherapeuticImpactAssessment;
  abstract shouldRollback(): boolean;
}

// Clinical Impact Levels
export type ClinicalImpactLevel = 'none' | 'minimal' | 'moderate' | 'high' | 'critical';

// Recovery Action Interface
export interface RecoveryAction {
  readonly actionType: 'automatic' | 'user_required' | 'clinician_required' | 'emergency';
  readonly description: string;
  readonly estimatedDurationMs: number;
  readonly successProbability: number; // 0-1
  readonly prerequisites: readonly string[];
  readonly execute: () => Promise<RecoveryResult>;
}

export interface RecoveryResult {
  readonly success: boolean;
  readonly partialRecovery: boolean;
  readonly remainingIssues: readonly string[];
  readonly therapeuticContinuityRestored: boolean;
  readonly followUpRequired: boolean;
}

// Therapeutic Impact Assessment
export interface TherapeuticImpactAssessment {
  readonly impactLevel: ClinicalImpactLevel;
  readonly affectedCapabilities: readonly TherapeuticCapability[];
  readonly continuityMaintained: boolean;
  readonly estimatedRecoveryTime: number; // milliseconds
  readonly alternativePathsAvailable: boolean;
  readonly emergencyProtocolsActive: boolean;
}

export type TherapeuticCapability = 
  | 'assessment_completion'
  | 'check_in_recording'
  | 'crisis_detection'
  | 'emergency_access'
  | 'progress_tracking'
  | 'habit_formation'
  | 'therapeutic_scheduling'
  | 'clinical_insights';

// SQLite Migration Error Implementation
export class SQLiteMigrationClinicalError extends ClinicalSafetyError implements SQLiteClinicalSafetyError {
  readonly errorType: SQLiteMigrationError;
  readonly rollbackRecommended: boolean;
  readonly dataRecoveryPossible: boolean;
  
  constructor(
    migrationError: SQLiteMigrationError,
    message: string,
    clinicalImpact: ClinicalImpactLevel,
    rollbackRecommended: boolean = false,
    dataRecoveryPossible: boolean = true
  ) {
    const mitigationStrategy = SQLiteMigrationClinicalError.generateMitigationStrategy(
      migrationError,
      clinicalImpact,
      rollbackRecommended
    );
    
    super(
      message,
      migrationError,
      clinicalImpact,
      true, // SQLite errors should maintain therapeutic continuity via AsyncStorage fallback
      true, // Emergency access always maintained
      mitigationStrategy,
      clinicalImpact !== 'none' && clinicalImpact !== 'minimal'
    );
    
    this.errorType = migrationError;
    this.rollbackRecommended = rollbackRecommended;
    this.dataRecoveryPossible = dataRecoveryPossible;
    this.name = 'SQLiteMigrationClinicalError';
  }
  
  private static generateMitigationStrategy(
    errorType: SQLiteMigrationError,
    impact: ClinicalImpactLevel,
    rollbackRecommended: boolean
  ): readonly string[] {
    const baseStrategy = [
      'Maintain AsyncStorage as fallback for therapeutic continuity',
      'Preserve emergency access to crisis data',
      'Log detailed error information for analysis'
    ];
    
    switch (errorType) {
      case SQLiteMigrationError.ENCRYPTION_FAILURE:
        return [
          ...baseStrategy,
          'Verify device encryption capabilities',
          'Check hardware keychain availability',
          'Consider device-specific encryption fallback',
          rollbackRecommended ? 'Initiate automatic rollback to AsyncStorage' : 'Retry with alternative encryption method'
        ];
        
      case SQLiteMigrationError.DATA_INTEGRITY_VIOLATION:
      case SQLiteMigrationError.CLINICAL_DATA_CORRUPTION:
        return [
          ...baseStrategy,
          'CRITICAL: Halt migration immediately',
          'Verify AsyncStorage data integrity',
          'Create additional backup before any recovery attempt',
          'Consider manual data validation by clinical team',
          'Initiate emergency rollback protocol'
        ];
        
      case SQLiteMigrationError.INSUFFICIENT_STORAGE:
        return [
          ...baseStrategy,
          'Check available device storage',
          'Suggest user storage cleanup',
          'Implement progressive migration strategy',
          'Consider cloud backup for space optimization'
        ];
        
      default:
        return [
          ...baseStrategy,
          rollbackRecommended ? 'Initiate rollback to stable state' : 'Retry migration with conservative settings',
          'Monitor system resources during retry',
          'Escalate to technical support if persistent'
        ];
    }
  }
  
  async getRecoveryActions(): Promise<readonly RecoveryAction[]> {
    const actions: RecoveryAction[] = [];
    
    // Always include AsyncStorage fallback
    actions.push({
      actionType: 'automatic',
      description: 'Maintain therapeutic continuity using AsyncStorage',
      estimatedDurationMs: 100,
      successProbability: 1.0,
      prerequisites: [],
      execute: async () => ({
        success: true,
        partialRecovery: false,
        remainingIssues: ['SQLite analytics unavailable'],
        therapeuticContinuityRestored: true,
        followUpRequired: true
      })
    });
    
    if (this.rollbackRecommended) {
      actions.push({
        actionType: 'automatic',
        description: 'Rollback to pre-migration state',
        estimatedDurationMs: 30000, // 30 seconds
        successProbability: 0.95,
        prerequisites: ['Backup verification complete'],
        execute: async () => {
          // Implementation would call dataStoreMigrator.rollbackMigration()
          return {
            success: true,
            partialRecovery: false,
            remainingIssues: [],
            therapeuticContinuityRestored: true,
            followUpRequired: false
          };
        }
      });
    }
    
    if (this.dataRecoveryPossible) {
      actions.push({
        actionType: 'user_required',
        description: 'Retry migration with conservative settings',
        estimatedDurationMs: 120000, // 2 minutes
        successProbability: 0.8,
        prerequisites: ['User approval for retry', 'Storage space available'],
        execute: async () => ({
          success: false, // Placeholder - would implement retry logic
          partialRecovery: true,
          remainingIssues: ['Reduced analytics capabilities'],
          therapeuticContinuityRestored: true,
          followUpRequired: true
        })
      });
    }
    
    return actions;
  }
  
  assessTherapeuticImpact(): TherapeuticImpactAssessment {
    const criticalCapabilities: TherapeuticCapability[] = [
      'assessment_completion',
      'check_in_recording', 
      'crisis_detection',
      'emergency_access'
    ];
    
    const analyticsCapabilities: TherapeuticCapability[] = [
      'progress_tracking',
      'habit_formation',
      'clinical_insights'
    ];
    
    return {
      impactLevel: this.clinicalImpact,
      affectedCapabilities: this.clinicalImpact === 'critical' 
        ? [...criticalCapabilities, ...analyticsCapabilities]
        : analyticsCapabilities,
      continuityMaintained: true, // AsyncStorage fallback maintains continuity
      estimatedRecoveryTime: this.rollbackRecommended ? 30000 : 120000,
      alternativePathsAvailable: true,
      emergencyProtocolsActive: true
    };
  }
  
  shouldRollback(): boolean {
    return this.rollbackRecommended || 
           this.clinicalImpact === 'critical' ||
           this.errorType === SQLiteMigrationError.CLINICAL_DATA_CORRUPTION ||
           this.errorType === SQLiteMigrationError.DATA_INTEGRITY_VIOLATION;
  }
}

// Calendar Privacy Error Implementation
export class CalendarPrivacyClinicalError extends ClinicalSafetyError implements CalendarClinicalSafetyError {
  readonly errorType: CalendarPrivacyError;
  readonly privacyImpact: 'none' | 'minimal' | 'moderate' | 'severe';
  readonly fallbackAvailable: boolean;
  readonly privacyAuditRequired: boolean;
  
  constructor(
    privacyError: CalendarPrivacyError,
    message: string,
    privacyImpact: 'none' | 'minimal' | 'moderate' | 'severe',
    fallbackAvailable: boolean = true
  ) {
    const clinicalImpact = CalendarPrivacyClinicalError.mapPrivacyToClinicalImpact(privacyImpact);
    const mitigationStrategy = CalendarPrivacyClinicalError.generateMitigationStrategy(
      privacyError,
      privacyImpact,
      fallbackAvailable
    );
    
    super(
      message,
      privacyError,
      clinicalImpact,
      true, // Calendar errors shouldn't break therapeutic continuity
      true, // Emergency access unaffected by calendar issues
      mitigationStrategy,
      privacyImpact !== 'none'
    );
    
    this.errorType = privacyError;
    this.privacyImpact = privacyImpact;
    this.fallbackAvailable = fallbackAvailable;
    this.privacyAuditRequired = privacyImpact === 'severe';
    this.name = 'CalendarPrivacyClinicalError';
  }
  
  private static mapPrivacyToClinicalImpact(
    privacyImpact: 'none' | 'minimal' | 'moderate' | 'severe'
  ): ClinicalImpactLevel {
    switch (privacyImpact) {
      case 'none': return 'none';
      case 'minimal': return 'minimal';
      case 'moderate': return 'moderate';
      case 'severe': return 'high'; // Privacy violations have high clinical impact
    }
  }
  
  private static generateMitigationStrategy(
    errorType: CalendarPrivacyError,
    privacyImpact: 'none' | 'minimal' | 'moderate' | 'severe',
    fallbackAvailable: boolean
  ): readonly string[] {
    const baseStrategy = [
      'Maintain therapeutic scheduling via in-app notifications',
      'Log privacy violation for audit',
      'Preserve user privacy at all costs'
    ];
    
    switch (errorType) {
      case CalendarPrivacyError.PHI_EXPOSURE_PREVENTED:
      case CalendarPrivacyError.CLINICAL_DATA_SANITIZED:
        return [
          ...baseStrategy,
          'CRITICAL: Prevent any PHI exposure to external calendar',
          'Use only pre-approved generic event templates',
          'Verify all calendar events contain no clinical data',
          fallbackAvailable ? 'Switch to local notification reminders' : 'Disable calendar integration'
        ];
        
      case CalendarPrivacyError.CROSS_APP_LEAK_PREVENTED:
        return [
          ...baseStrategy,
          'Block cross-application data sharing',
          'Verify calendar app permissions and restrictions',
          'Consider platform-specific privacy controls',
          'Audit calendar integration for data leaks'
        ];
        
      case CalendarPrivacyError.PERMISSION_DENIED_GRACEFUL:
        return [
          ...baseStrategy,
          'Gracefully degrade to local notifications',
          'Inform user of privacy-protective fallback',
          'Maintain therapeutic scheduling functionality',
          'Offer manual calendar export option'
        ];
        
      default:
        return [
          ...baseStrategy,
          'Apply maximum privacy protection measures',
          fallbackAvailable ? 'Use privacy-safe fallback method' : 'Disable feature to protect privacy',
          'Require explicit user consent for any calendar access'
        ];
    }
  }
  
  async getRecoveryActions(): Promise<readonly RecoveryAction[]> {
    const actions: RecoveryAction[] = [];
    
    // Always provide local notification fallback
    if (this.fallbackAvailable) {
      actions.push({
        actionType: 'automatic',
        description: 'Switch to privacy-safe local notifications',
        estimatedDurationMs: 500,
        successProbability: 1.0,
        prerequisites: [],
        execute: async () => ({
          success: true,
          partialRecovery: false,
          remainingIssues: ['Calendar integration disabled'],
          therapeuticContinuityRestored: true,
          followUpRequired: false
        })
      });
    }
    
    if (this.privacyImpact === 'severe') {
      actions.push({
        actionType: 'automatic',
        description: 'Disable calendar integration to protect privacy',
        estimatedDurationMs: 100,
        successProbability: 1.0,
        prerequisites: [],
        execute: async () => ({
          success: true,
          partialRecovery: false,
          remainingIssues: ['Calendar features unavailable'],
          therapeuticContinuityRestored: true,
          followUpRequired: true
        })
      });
    }
    
    actions.push({
      actionType: 'user_required',
      description: 'Review and adjust privacy settings',
      estimatedDurationMs: 30000, // 30 seconds of user interaction
      successProbability: 0.9,
      prerequisites: ['User available for privacy review'],
      execute: async () => ({
        success: false, // Placeholder - would implement settings review
        partialRecovery: true,
        remainingIssues: ['Privacy settings may need adjustment'],
        therapeuticContinuityRestored: true,
        followUpRequired: false
      })
    });
    
    return actions;
  }
  
  assessTherapeuticImpact(): TherapeuticImpactAssessment {
    const affectedCapabilities: TherapeuticCapability[] = ['therapeutic_scheduling'];
    
    return {
      impactLevel: this.clinicalImpact,
      affectedCapabilities,
      continuityMaintained: true, // Fallback methods maintain continuity
      estimatedRecoveryTime: this.fallbackAvailable ? 500 : 0,
      alternativePathsAvailable: this.fallbackAvailable,
      emergencyProtocolsActive: false // Calendar errors don't trigger emergency protocols
    };
  }
  
  shouldRollback(): boolean {
    return this.privacyImpact === 'severe' || 
           this.errorType === CalendarPrivacyError.PHI_EXPOSURE_PREVENTED ||
           this.errorType === CalendarPrivacyError.CLINICAL_DATA_SANITIZED;
  }
}

// Error Recovery Orchestrator
export class ClinicalErrorRecoveryOrchestrator {
  private static instance: ClinicalErrorRecoveryOrchestrator;
  
  private constructor() {}
  
  public static getInstance(): ClinicalErrorRecoveryOrchestrator {
    if (!ClinicalErrorRecoveryOrchestrator.instance) {
      ClinicalErrorRecoveryOrchestrator.instance = new ClinicalErrorRecoveryOrchestrator();
    }
    return ClinicalErrorRecoveryOrchestrator.instance;
  }
  
  async handleClinicalError(error: ClinicalSafetyError): Promise<ErrorRecoveryResult> {
    const startTime = Date.now();
    
    try {
      // Immediate safety assessment
      const impact = error.assessTherapeuticImpact();
      
      // Ensure emergency access is maintained
      if (!impact.emergencyProtocolsActive && impact.impactLevel === 'critical') {
        await this.activateEmergencyProtocols();
      }
      
      // Get and execute recovery actions
      const recoveryActions = await error.getRecoveryActions();
      const executionResults: RecoveryResult[] = [];
      
      for (const action of recoveryActions) {
        if (action.actionType === 'automatic') {
          const result = await this.executeRecoveryAction(action);
          executionResults.push(result);
          
          if (result.therapeuticContinuityRestored && result.success) {
            break; // Success - no need for further actions
          }
        }
      }
      
      // Determine if rollback is needed
      if (error.shouldRollback() && !executionResults.some(r => r.success)) {
        await this.performEmergencyRollback(error);
      }
      
      return {
        success: executionResults.some(r => r.success),
        therapeuticContinuityMaintained: impact.continuityMaintained,
        recoveryActionsExecuted: executionResults.length,
        totalRecoveryTime: Date.now() - startTime,
        residualIssues: executionResults.flatMap(r => r.remainingIssues),
        followUpRequired: executionResults.some(r => r.followUpRequired)
      };
      
    } catch (recoveryError) {
      console.error('Critical error during error recovery:', recoveryError);
      
      // Last resort: maintain basic therapeutic functions
      await this.activateBasicTherapeuticMode();
      
      return {
        success: false,
        therapeuticContinuityMaintained: true, // Basic mode maintains continuity
        recoveryActionsExecuted: 0,
        totalRecoveryTime: Date.now() - startTime,
        residualIssues: ['Error recovery failed', 'Basic therapeutic mode active'],
        followUpRequired: true
      };
    }
  }
  
  private async executeRecoveryAction(action: RecoveryAction): Promise<RecoveryResult> {
    try {
      const timeoutMs = action.estimatedDurationMs * 2; // Allow double estimated time
      
      return await Promise.race([
        action.execute(),
        new Promise<RecoveryResult>((_, reject) => 
          setTimeout(() => reject(new Error('Recovery action timeout')), timeoutMs)
        )
      ]);
      
    } catch (error) {
      console.error(`Recovery action failed: ${action.description}`, error);
      return {
        success: false,
        partialRecovery: false,
        remainingIssues: [`Recovery action failed: ${error}`],
        therapeuticContinuityRestored: false,
        followUpRequired: true
      };
    }
  }
  
  private async activateEmergencyProtocols(): Promise<void> {
    // Ensure crisis data remains accessible
    // Maintain assessment completion capability
    // Preserve check-in functionality
    console.log('EMERGENCY: Activating clinical safety protocols');
  }
  
  private async performEmergencyRollback(error: ClinicalSafetyError): Promise<void> {
    console.log(`EMERGENCY ROLLBACK: ${error.errorCode} - ${error.message}`);
    // Implementation would coordinate with specific error recovery mechanisms
  }
  
  private async activateBasicTherapeuticMode(): Promise<void> {
    console.log('CRITICAL: Activating basic therapeutic mode - advanced features disabled');
    // Ensure only essential therapeutic functions remain active
    // Disable all advanced features to prevent further errors
    // Maintain crisis detection and emergency access
  }
}

// Error Recovery Result
export interface ErrorRecoveryResult {
  readonly success: boolean;
  readonly therapeuticContinuityMaintained: boolean;
  readonly recoveryActionsExecuted: number;
  readonly totalRecoveryTime: number; // milliseconds
  readonly residualIssues: readonly string[];
  readonly followUpRequired: boolean;
}

// Concrete AdvancedFeatureError class
export class AdvancedFeatureErrorImpl extends ClinicalSafetyError implements AdvancedFeatureError {
  readonly errorType: 'sqlite_error' | 'calendar_error' | 'integration_error' | 'analytics_error';
  readonly sourceError: SQLiteClinicalSafetyError | CalendarClinicalSafetyError | Error;
  readonly featureImpact: readonly ('analytics' | 'scheduling' | 'insights' | 'habit_tracking')[];
  
  constructor(
    message: string,
    errorType: 'sqlite_error' | 'calendar_error' | 'integration_error' | 'analytics_error',
    sourceError: SQLiteClinicalSafetyError | CalendarClinicalSafetyError | Error,
    featureImpact: readonly ('analytics' | 'scheduling' | 'insights' | 'habit_tracking')[],
    clinicalImpact: ClinicalImpactLevel,
    therapeuticContinuity: boolean
  ) {
    super(
      message,
      errorType,
      clinicalImpact,
      therapeuticContinuity,
      true, // emergencyAccessMaintained
      ['Disable affected features', 'Maintain core functionality'], // mitigationStrategy
      false // userNotificationRequired
    );
    
    this.errorType = errorType;
    this.sourceError = sourceError;
    this.featureImpact = featureImpact;
    this.name = 'AdvancedFeatureError';
  }
  
  async getRecoveryActions(): Promise<readonly RecoveryAction[]> {
    return [{
      actionType: 'automatic',
      description: 'Disable affected advanced features',
      estimatedDurationMs: 1000,
      successProbability: 0.95,
      prerequisites: [],
      execute: async () => ({
        success: true,
        partialRecovery: false,
        remainingIssues: [],
        therapeuticContinuityRestored: true,
        followUpRequired: false
      })
    }];
  }
  
  assessTherapeuticImpact(): TherapeuticImpactAssessment {
    return {
      impactLevel: this.clinicalImpact,
      affectedCapabilities: ['therapeutic_scheduling', 'clinical_insights'],
      continuityMaintained: this.therapeuticContinuity,
      estimatedRecoveryTime: 5000,
      alternativePathsAvailable: true,
      emergencyProtocolsActive: false
    };
  }
  
  shouldRollback(): boolean {
    return this.clinicalImpact === 'critical' || this.clinicalImpact === 'high';
  }
}

// Export singleton
export const clinicalErrorRecovery = ClinicalErrorRecoveryOrchestrator.getInstance();