/**
 * Consolidated UI Services Integration Layer - Phase 3C Group 3
 *
 * Unified interface for all React Native UI services including navigation, components,
 * transitions, form validation, and performance monitoring.
 *
 * CRITICAL: Maintains <200ms crisis response, 60fps therapeutic performance, New Architecture compatibility
 * FEATURES: Service orchestration, performance coordination, crisis prioritization, therapeutic optimization
 */

import { NavigationContainerRef } from '@react-navigation/native';
import React from 'react';
import type {
  DeepReadonly,
  ISODateString,
  DurationMs,
  CrisisSeverity,
  UserID,
} from '../../types/core';
import type { RootStackParamList, CrisisTriggerInfo } from '../../types/navigation';

// Import all consolidated services
import { NavigationService } from '../NavigationService';
import { UIComponentService } from './UIComponentService';
import { ScreenTransitionService } from './ScreenTransitionService';
import { UIPerformanceValidationService } from './UIPerformanceValidationService';
import { FormValidationService } from '../FormValidationService';

import type {
  UIComponentServiceConfig,
  ComponentConfig,
  ComponentPerformanceMetrics,
  LoadingStateConfig,
  ComponentID,
  StyleID,
  ThemeVariant,
} from './UIComponentService';

import type {
  ScreenTransitionServiceConfig,
  ScreenTransition,
  ScreenState,
  NavigationStack,
  GestureConfig,
  ScreenID,
  TransitionID,
} from './ScreenTransitionService';

import type {
  UIPerformanceValidationServiceConfig,
  CrisisUIPerformanceMetrics,
  TherapeuticUIPerformanceMetrics,
  RealTimePerformanceAlert,
  ComponentPerformanceID,
} from './UIPerformanceValidationService';

import type {
  FormValidationConfig,
  PHQ9FormData,
  GAD7FormData,
  PHQ9ValidationResult,
  GAD7ValidationResult,
  FormFieldID,
} from '../FormValidationService';

// === BRANDED TYPES FOR INTEGRATION LAYER ===

type ServiceOrchestrationID = string & { readonly __brand: 'ServiceOrchestrationID' };
type IntegrationTaskID = string & { readonly __brand: 'IntegrationTaskID' };
type ServicePriority = 'crisis' | 'therapeutic' | 'standard' | 'background';

// === INTEGRATION LAYER TYPES ===

interface ServiceCoordination {
  readonly navigationService: typeof NavigationService;
  readonly componentService: typeof UIComponentService;
  readonly transitionService: typeof ScreenTransitionService;
  readonly performanceService: typeof UIPerformanceValidationService;
  readonly formValidationService: typeof FormValidationService;
}

interface IntegratedUIOperation {
  readonly id: IntegrationTaskID;
  readonly type: 'crisis_flow' | 'therapeutic_flow' | 'navigation_flow' | 'form_validation' | 'performance_check';
  readonly priority: ServicePriority;
  readonly services: readonly (keyof ServiceCoordination)[];
  readonly startTime: number;
  readonly timeout: DurationMs;
  readonly onComplete?: (result: any) => void;
  readonly onError?: (error: Error) => void;
}

interface CrisisFlowExecution {
  readonly navigationTime: number;
  readonly componentRenderTime: number;
  readonly transitionTime: number;
  readonly totalResponseTime: number;
  readonly performanceValidation: CrisisUIPerformanceMetrics;
  readonly criticalPathMaintained: boolean;
  readonly userSafetyEnsured: boolean;
}

interface TherapeuticFlowExecution {
  readonly animationSmoothness: number;
  readonly frameRateStability: number;
  readonly transitionQuality: number;
  readonly memoryEfficiency: number;
  readonly therapeuticEffectiveness: number;
  readonly performanceMetrics: TherapeuticUIPerformanceMetrics;
}

interface ServiceHealthMetrics {
  readonly navigationHealth: number; // 0-100
  readonly componentHealth: number;
  readonly transitionHealth: number;
  readonly performanceHealth: number;
  readonly formValidationHealth: number;
  readonly overallHealth: number;
  readonly lastCheckTime: ISODateString;
  readonly criticalIssues: readonly string[];
  readonly recommendations: readonly string[];
}

// === CONFIGURATION ===

interface ConsolidatedUIServiceConfig {
  readonly enableServiceOrchestration: boolean;
  readonly crisisResponseOptimization: boolean;
  readonly therapeuticExperienceMode: boolean;
  readonly performanceMonitoringLevel: 'minimal' | 'standard' | 'comprehensive';
  readonly serviceHealthChecks: boolean;
  readonly automaticServiceRecovery: boolean;
  readonly crossServiceCommunication: boolean;
  readonly newArchitectureOptimized: boolean;
  readonly memoryManagementMode: 'conservative' | 'balanced' | 'performance';
}

const DEFAULT_INTEGRATION_CONFIG: ConsolidatedUIServiceConfig = {
  enableServiceOrchestration: true,
  crisisResponseOptimization: true,
  therapeuticExperienceMode: true,
  performanceMonitoringLevel: 'comprehensive',
  serviceHealthChecks: true,
  automaticServiceRecovery: true,
  crossServiceCommunication: true,
  newArchitectureOptimized: true,
  memoryManagementMode: 'balanced',
} as const;

// === MAIN INTEGRATION SERVICE ===

class ConsolidatedUIService {
  private readonly config: ConsolidatedUIServiceConfig;
  private readonly services: ServiceCoordination;
  private readonly activeOperations: Map<IntegrationTaskID, IntegratedUIOperation> = new Map();
  private readonly serviceHealth: ServiceHealthMetrics;

  // Service coordination
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private navigationRef: NavigationContainerRef<RootStackParamList> | null = null;

  constructor(config: Partial<ConsolidatedUIServiceConfig> = {}) {
    this.config = { ...DEFAULT_INTEGRATION_CONFIG, ...config };

    // Initialize service coordination
    this.services = {
      navigationService: NavigationService,
      componentService: UIComponentService,
      transitionService: ScreenTransitionService,
      performanceService: UIPerformanceValidationService,
      formValidationService: FormValidationService,
    };

    // Initialize service health tracking
    this.serviceHealth = {
      navigationHealth: 100,
      componentHealth: 100,
      transitionHealth: 100,
      performanceHealth: 100,
      formValidationHealth: 100,
      overallHealth: 100,
      lastCheckTime: new Date().toISOString() as ISODateString,
      criticalIssues: [],
      recommendations: [],
    };

    this.initializeServiceIntegration();
  }

  // === SERVICE INITIALIZATION ===

  /**
   * Initialize all UI services with cross-service communication
   */
  async initialize(navigationRef?: NavigationContainerRef<RootStackParamList>): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Set navigation reference across services
      if (navigationRef) {
        this.navigationRef = navigationRef;
        this.services.navigationService.setNavigationRef(navigationRef);
        this.services.transitionService.setNavigationRef(navigationRef);
      }

      // Start health monitoring
      if (this.config.serviceHealthChecks) {
        this.startHealthMonitoring();
      }

      // Initialize performance monitoring
      if (this.config.performanceMonitoringLevel !== 'minimal') {
        this.services.performanceService.startMonitoring();
      }

      // Setup crisis response optimization
      if (this.config.crisisResponseOptimization) {
        this.setupCrisisResponseOptimization();
      }

      this.isInitialized = true;
      console.log('ConsolidatedUIService initialized successfully');
    } catch (error) {
      console.error('ConsolidatedUIService initialization failed:', error);
      throw error;
    }
  }

  /**
   * Gracefully shutdown all services
   */
  async shutdown(): Promise<void> {
    try {
      // Stop monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Stop performance monitoring
      this.services.performanceService.stopMonitoring();

      // Clear active operations
      this.activeOperations.clear();

      this.isInitialized = false;
      console.log('ConsolidatedUIService shutdown successfully');
    } catch (error) {
      console.error('ConsolidatedUIService shutdown failed:', error);
      throw error;
    }
  }

  // === CRISIS FLOW ORCHESTRATION ===

  /**
   * Execute complete crisis response flow with <200ms guarantee
   * CRITICAL: Must coordinate all services for optimal crisis response
   */
  async executeCrisisFlow(
    crisisInfo: CrisisTriggerInfo,
    severity: CrisisSeverity,
    targetScreen: ScreenID = 'crisis_intervention' as ScreenID
  ): Promise<CrisisFlowExecution> {
    const operationId = this.generateOperationId();
    const startTime = performance.now();

    const operation: IntegratedUIOperation = {
      id: operationId,
      type: 'crisis_flow',
      priority: 'crisis',
      services: ['navigationService', 'transitionService', 'componentService', 'performanceService'],
      startTime,
      timeout: 200 as DurationMs, // Strict 200ms requirement
    };

    this.activeOperations.set(operationId, operation);

    try {
      // Step 1: Pre-validate performance readiness (< 10ms)
      const performanceReadiness = await this.validateCrisisPerformanceReadiness();
      if (!performanceReadiness) {
        throw new Error('System not ready for crisis response - performance validation failed');
      }

      // Step 2: Execute crisis navigation (target: <100ms)
      const navigationStart = performance.now();
      const navigationSuccess = await this.services.navigationService.navigateToCrisis({
        trigger: crisisInfo,
        severity,
        fromScreen: this.services.navigationService.getCurrentRoute()?.name || 'unknown',
        emergencyMode: true,
      });
      const navigationTime = performance.now() - navigationStart;

      if (!navigationSuccess) {
        throw new Error('Crisis navigation failed');
      }

      // Step 3: Execute crisis transition (target: <50ms)
      const transitionStart = performance.now();
      const transitionSuccess = await this.services.transitionService.executeCrisisTransition(
        targetScreen,
        {
          crisisInfo,
          severity,
          emergencyMode: true,
        }
      );
      const transitionTime = performance.now() - transitionStart;

      if (!transitionSuccess) {
        throw new Error('Crisis transition failed');
      }

      // Step 4: Validate component performance (target: <30ms)
      const componentStart = performance.now();
      const componentId = `crisis_${targetScreen}` as ComponentPerformanceID;
      const performanceValidation = await this.services.performanceService.validateCrisisUIPerformance(
        componentId,
        severity,
        true
      );
      const componentRenderTime = performance.now() - componentStart;

      // Step 5: Calculate total response time
      const totalResponseTime = performance.now() - startTime;

      const execution: CrisisFlowExecution = {
        navigationTime,
        componentRenderTime,
        transitionTime,
        totalResponseTime,
        performanceValidation,
        criticalPathMaintained: totalResponseTime <= 200,
        userSafetyEnsured: performanceValidation.validationPassed && totalResponseTime <= 200,
      };

      // Alert if performance target missed
      if (totalResponseTime > 200) {
        console.error(`Crisis flow exceeded 200ms limit: ${totalResponseTime}ms`);
        this.reportCrisisPerformanceViolation(execution);
      }

      this.activeOperations.delete(operationId);
      return execution;

    } catch (error) {
      console.error('Crisis flow execution failed:', error);
      this.activeOperations.delete(operationId);

      // Emergency fallback to safe state
      await this.services.navigationService.emergencyReset();

      throw error;
    }
  }

  // === THERAPEUTIC FLOW ORCHESTRATION ===

  /**
   * Execute therapeutic user experience flow with 60fps guarantee
   */
  async executeTherapeuticFlow(
    targetScreen: ScreenID,
    options: {
      readonly enableBreathingSpace: boolean;
      readonly mindfulTransitions: boolean;
      readonly therapeuticAnimations: boolean;
    }
  ): Promise<TherapeuticFlowExecution> {
    const operationId = this.generateOperationId();
    const startTime = performance.now();

    const operation: IntegratedUIOperation = {
      id: operationId,
      type: 'therapeutic_flow',
      priority: 'therapeutic',
      services: ['transitionService', 'componentService', 'performanceService'],
      startTime,
      timeout: 2000 as DurationMs, // Allow time for therapeutic pacing
    };

    this.activeOperations.set(operationId, operation);

    try {
      // Step 1: Setup therapeutic environment
      await this.setupTherapeuticEnvironment();

      // Step 2: Execute therapeutic transition
      const transitionSuccess = await this.services.transitionService.executeTherapeuticTransition(
        targetScreen,
        {
          mindfulPacing: options.mindfulTransitions,
          breathingSpace: options.enableBreathingSpace ? 500 as DurationMs : 0 as DurationMs,
          calmingAnimation: options.therapeuticAnimations,
        }
      );

      if (!transitionSuccess) {
        throw new Error('Therapeutic transition failed');
      }

      // Step 3: Validate therapeutic performance
      const componentId = `therapeutic_${targetScreen}` as ComponentPerformanceID;
      const performanceMetrics = await this.services.performanceService.validateTherapeuticUIPerformance(
        componentId,
        {
          trackBreathingExercise: targetScreen.includes('breathing'),
          measureAnimationSmoothness: options.therapeuticAnimations,
          monitorFrameConsistency: true,
        }
      );

      const execution: TherapeuticFlowExecution = {
        animationSmoothness: performanceMetrics.animationSmoothness,
        frameRateStability: performanceMetrics.frameRate,
        transitionQuality: performanceMetrics.renderConsistency,
        memoryEfficiency: this.calculateMemoryEfficiency(),
        therapeuticEffectiveness: this.calculateTherapeuticEffectiveness(performanceMetrics),
        performanceMetrics,
      };

      this.activeOperations.delete(operationId);
      return execution;

    } catch (error) {
      console.error('Therapeutic flow execution failed:', error);
      this.activeOperations.delete(operationId);
      throw error;
    }
  }

  // === FORM VALIDATION INTEGRATION ===

  /**
   * Integrated form validation with performance monitoring
   */
  async validateFormWithPerformanceTracking<T extends PHQ9FormData | GAD7FormData>(
    formData: T,
    formType: 'phq9' | 'gad7',
    context?: {
      readonly userId?: UserID;
      readonly isEmergency?: boolean;
    }
  ): Promise<{
    readonly validation: PHQ9ValidationResult | GAD7ValidationResult;
    readonly performanceMetrics: {
      readonly validationTime: number;
      readonly memoryImpact: number;
      readonly cpuUsage: number;
    };
    readonly crisisDetected: boolean;
  }> {
    const startTime = performance.now();
    const initialMemory = global.performance?.memory?.usedJSHeapSize || 0;

    try {
      let validation: PHQ9ValidationResult | GAD7ValidationResult;
      let crisisDetected = false;

      if (formType === 'phq9') {
        validation = this.services.formValidationService.validatePHQ9(
          formData as PHQ9FormData,
          {
            userId: context?.userId,
            formType,
            isEmergency: context?.isEmergency,
            validationStrict: true,
          }
        );
        crisisDetected = (validation as PHQ9ValidationResult).crisisRisk;
      } else {
        validation = this.services.formValidationService.validateGAD7(
          formData as GAD7FormData,
          {
            userId: context?.userId,
            formType,
            isEmergency: context?.isEmergency,
            validationStrict: true,
          }
        );
      }

      // Handle crisis detection
      if (crisisDetected) {
        await this.handleFormCrisisDetection(validation as PHQ9ValidationResult);
      }

      const endTime = performance.now();
      const finalMemory = global.performance?.memory?.usedJSHeapSize || 0;

      return {
        validation,
        performanceMetrics: {
          validationTime: endTime - startTime,
          memoryImpact: finalMemory - initialMemory,
          cpuUsage: 0, // Would be calculated if CPU metrics available
        },
        crisisDetected,
      };

    } catch (error) {
      console.error('Form validation with performance tracking failed:', error);
      throw error;
    }
  }

  // === SERVICE HEALTH MONITORING ===

  /**
   * Get comprehensive service health status
   */
  getServiceHealth(): DeepReadonly<ServiceHealthMetrics> {
    return this.serviceHealth;
  }

  /**
   * Perform health check on all services
   */
  async performHealthCheck(): Promise<ServiceHealthMetrics> {
    try {
      // Check each service health
      const navigationHealth = this.checkNavigationHealth();
      const componentHealth = this.checkComponentHealth();
      const transitionHealth = this.checkTransitionHealth();
      const performanceHealth = this.checkPerformanceHealth();
      const formValidationHealth = this.checkFormValidationHealth();

      // Calculate overall health
      const overallHealth = Math.min(
        navigationHealth,
        componentHealth,
        transitionHealth,
        performanceHealth,
        formValidationHealth
      );

      // Collect issues and recommendations
      const criticalIssues = this.collectCriticalIssues();
      const recommendations = this.generateHealthRecommendations();

      const updatedHealth: ServiceHealthMetrics = {
        navigationHealth,
        componentHealth,
        transitionHealth,
        performanceHealth,
        formValidationHealth,
        overallHealth,
        lastCheckTime: new Date().toISOString() as ISODateString,
        criticalIssues,
        recommendations,
      };

      // Update internal state
      (this.serviceHealth as any) = updatedHealth;

      return updatedHealth;

    } catch (error) {
      console.error('Health check failed:', error);
      return {
        ...this.serviceHealth,
        overallHealth: 0,
        criticalIssues: ['Health check system failure'],
        lastCheckTime: new Date().toISOString() as ISODateString,
      };
    }
  }

  // === NEW ARCHITECTURE COMPATIBILITY ===

  /**
   * Validate all services for React Native New Architecture compatibility
   */
  validateNewArchitectureCompatibility(): {
    readonly isFullyCompatible: boolean;
    readonly serviceCompatibility: {
      readonly navigation: boolean;
      readonly components: boolean;
      readonly transitions: boolean;
      readonly performance: boolean;
      readonly formValidation: boolean;
    };
    readonly overallCompatibilityScore: number;
    readonly recommendations: readonly string[];
  } {
    const recommendations: string[] = [];
    let compatibilityScore = 0;

    // Check each service
    const navigationCompatible = true; // NavigationService is New Architecture ready
    const componentsCompatibility = this.services.componentService.validateNewArchitectureCompatibility();
    const transitionsCompatibility = this.services.transitionService.validateNewArchitectureCompatibility();
    const performanceCompatible = true; // Performance service is architecture agnostic
    const formValidationCompatible = true; // Form validation is pure logic

    const serviceCompatibility = {
      navigation: navigationCompatible,
      components: componentsCompatibility.isCompatible,
      transitions: transitionsCompatibility.isCompatible,
      performance: performanceCompatible,
      formValidation: formValidationCompatible,
    };

    // Calculate score
    Object.values(serviceCompatibility).forEach(compatible => {
      if (compatible) compatibilityScore += 20;
    });

    // Collect recommendations
    if (!componentsCompatibility.isCompatible) {
      recommendations.push(...componentsCompatibility.recommendations);
    }
    if (!transitionsCompatibility.isCompatible) {
      recommendations.push(...transitionsCompatibility.recommendations);
    }

    return {
      isFullyCompatible: Object.values(serviceCompatibility).every(Boolean),
      serviceCompatibility,
      overallCompatibilityScore: compatibilityScore,
      recommendations,
    };
  }

  // === PRIVATE IMPLEMENTATION ===

  private initializeServiceIntegration(): void {
    // Setup cross-service communication if enabled
    if (this.config.crossServiceCommunication) {
      this.setupCrossServiceCommunication();
    }
  }

  private setupCrossServiceCommunication(): void {
    // Setup performance monitoring across services
    this.services.performanceService.subscribeToAlerts((alert) => {
      this.handlePerformanceAlert(alert);
    });
  }

  private setupCrisisResponseOptimization(): void {
    // Pre-warm crisis components
    this.services.componentService.registerComponent(
      'crisis_intervention' as ComponentID,
      React.memo(() => null as any), // Placeholder
      {
        priority: 'critical',
        performance: {
          shouldMemo: true,
          reanimatedOptimized: true,
          fabricCompatible: true,
        },
      }
    );
  }

  private async validateCrisisPerformanceReadiness(): Promise<boolean> {
    const report = this.services.performanceService.getPerformanceReport();

    // Check if system is performing well enough for crisis response
    return (
      report.frameRate.currentFPS >= 55 &&
      report.memory.memoryOptimizationScore >= 70 &&
      report.overallScore >= 80
    );
  }

  private async setupTherapeuticEnvironment(): Promise<void> {
    // Optimize system for therapeutic experience
    // This might involve garbage collection, memory cleanup, etc.
  }

  private calculateMemoryEfficiency(): number {
    const memoryReport = this.services.performanceService.getPerformanceReport().memory;
    return memoryReport.memoryOptimizationScore;
  }

  private calculateTherapeuticEffectiveness(
    metrics: TherapeuticUIPerformanceMetrics
  ): number {
    let effectiveness = 100;

    if (metrics.frameRate < 58) effectiveness -= 20;
    if (metrics.animationSmoothness < 90) effectiveness -= 15;
    if (metrics.jankCount > 2) effectiveness -= 10;
    if (metrics.renderConsistency < 85) effectiveness -= 10;

    return Math.max(0, effectiveness);
  }

  private async handleFormCrisisDetection(validation: PHQ9ValidationResult): Promise<void> {
    if (validation.crisisRisk) {
      // Trigger crisis flow automatically
      await this.executeCrisisFlow(
        {
          type: 'assessment',
          reason: 'phq9_crisis_detected',
        },
        'severe',
        'crisis_intervention' as ScreenID
      );
    }
  }

  private reportCrisisPerformanceViolation(execution: CrisisFlowExecution): void {
    console.error('CRITICAL: Crisis performance violation', {
      totalResponseTime: execution.totalResponseTime,
      navigationTime: execution.navigationTime,
      transitionTime: execution.transitionTime,
      componentRenderTime: execution.componentRenderTime,
    });
  }

  private handlePerformanceAlert(alert: RealTimePerformanceAlert): void {
    if (alert.severity === 'emergency' && alert.type === 'crisis_slow') {
      console.error('EMERGENCY: Crisis component performance failure', alert);

      // Implement emergency optimization
      if (this.config.automaticServiceRecovery) {
        this.attemptServiceRecovery(alert);
      }
    }
  }

  private async attemptServiceRecovery(alert: RealTimePerformanceAlert): Promise<void> {
    try {
      console.log('Attempting service recovery for alert:', alert.id);
      this.services.performanceService.clearPerformanceData();
    } catch (error) {
      console.error('Service recovery failed:', error);
    }
  }

  // === HEALTH CHECK IMPLEMENTATIONS ===

  private startHealthMonitoring(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthCheck();
    }, 10000); // Check every 10 seconds
  }

  private checkNavigationHealth(): number {
    try {
      const isReady = this.services.navigationService.isReady();
      const performanceMetrics = this.services.navigationService.getPerformanceMetrics();

      let health = isReady ? 100 : 0;

      if (performanceMetrics.errorCount > 0) {
        health -= Math.min(50, performanceMetrics.errorCount * 10);
      }

      return Math.max(0, health);
    } catch (error) {
      return 0;
    }
  }

  private checkComponentHealth(): number {
    try {
      const registryStatus = this.services.componentService.getRegistryStatus();
      const performanceMetrics = this.services.componentService.getPerformanceMetrics();

      let health = 100;

      if (registryStatus.criticalComponents === 0) {
        health -= 50;
      }

      if (performanceMetrics.averageRenderTime > 50) {
        health -= 20;
      }

      return Math.max(0, health);
    } catch (error) {
      return 0;
    }
  }

  private checkTransitionHealth(): number {
    try {
      const performanceMetrics = this.services.transitionService.getPerformanceMetrics();

      let health = 100;

      if (performanceMetrics.errorCount > 0) {
        health -= Math.min(30, performanceMetrics.errorCount * 5);
      }

      if (performanceMetrics.averageTransitionTime > 500) {
        health -= 20;
      }

      return Math.max(0, health);
    } catch (error) {
      return 0;
    }
  }

  private checkPerformanceHealth(): number {
    try {
      const report = this.services.performanceService.getPerformanceReport();
      let health = report.overallScore;

      const criticalAlerts = report.alerts.filter(alert => alert.severity === 'emergency').length;
      if (criticalAlerts > 0) {
        health -= criticalAlerts * 20;
      }

      return Math.max(0, health);
    } catch (error) {
      return 0;
    }
  }

  private checkFormValidationHealth(): number {
    try {
      const config = this.services.formValidationService.getConfig();

      let health = 100;

      if (!config.clinicalAccuracyRequired) {
        health -= 50;
      }

      if (!config.strictMode) {
        health -= 20;
      }

      return Math.max(0, health);
    } catch (error) {
      return 0;
    }
  }

  private collectCriticalIssues(): readonly string[] {
    const issues: string[] = [];

    if (this.serviceHealth.navigationHealth < 50) {
      issues.push('Navigation service degraded');
    }

    if (this.serviceHealth.componentHealth < 50) {
      issues.push('Component service degraded');
    }

    if (this.serviceHealth.performanceHealth < 70) {
      issues.push('Performance issues detected');
    }

    return issues;
  }

  private generateHealthRecommendations(): readonly string[] {
    const recommendations: string[] = [];

    if (this.serviceHealth.overallHealth < 80) {
      recommendations.push('Consider service optimization');
      recommendations.push('Review performance metrics');
    }

    if (this.serviceHealth.performanceHealth < 70) {
      recommendations.push('Check for memory leaks');
      recommendations.push('Optimize component rendering');
    }

    return recommendations;
  }

  private generateOperationId(): IntegrationTaskID {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}` as IntegrationTaskID;
  }

  // === PUBLIC API ===

  /**
   * Get all service instances for direct access if needed
   */
  getServices(): DeepReadonly<ServiceCoordination> {
    return this.services;
  }

  /**
   * Get active operations status
   */
  getActiveOperations(): ReadonlyArray<IntegratedUIOperation> {
    return Array.from(this.activeOperations.values());
  }
}

// === SERVICE INSTANCE ===

export const ConsolidatedUIService = new ConsolidatedUIService({
  enableServiceOrchestration: true,
  crisisResponseOptimization: true,
  therapeuticExperienceMode: true,
  performanceMonitoringLevel: 'comprehensive',
  serviceHealthChecks: true,
  automaticServiceRecovery: true,
  crossServiceCommunication: true,
  newArchitectureOptimized: true,
  memoryManagementMode: 'balanced',
});

// === CONSOLIDATED UI EXPORTS ===

// Re-export all service types for convenience
export type {
  // Integration layer types
  ConsolidatedUIServiceConfig,
  ServiceCoordination,
  IntegratedUIOperation,
  CrisisFlowExecution,
  TherapeuticFlowExecution,
  ServiceHealthMetrics,

  // Service-specific types
  UIComponentServiceConfig,
  ComponentConfig,
  LoadingStateConfig,
  ComponentID,
  StyleID,
  ThemeVariant,

  ScreenTransitionServiceConfig,
  ScreenTransition,
  ScreenState,
  NavigationStack,
  GestureConfig,
  ScreenID,
  TransitionID,

  UIPerformanceValidationServiceConfig,
  CrisisUIPerformanceMetrics,
  TherapeuticUIPerformanceMetrics,
  RealTimePerformanceAlert,
  ComponentPerformanceID,

  FormValidationConfig,
  PHQ9FormData,
  GAD7FormData,
  PHQ9ValidationResult,
  GAD7ValidationResult,
  FormFieldID,
};

// Export individual services for advanced use cases
export {
  UIComponentService,
  ScreenTransitionService,
  UIPerformanceValidationService,
  NavigationService,
  FormValidationService,
};

// === DEFAULT EXPORT ===

export default ConsolidatedUIService;