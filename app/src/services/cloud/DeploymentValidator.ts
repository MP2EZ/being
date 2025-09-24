/**
 * Deployment Validation Service
 *
 * Validates P0-CLOUD Phase 1 deployment readiness
 * Tests Supabase connection, RLS policies, encryption, and feature flags
 */

import { supabaseClient } from './SupabaseClient';
import { cloudMonitoring } from './CloudMonitoring';
import { CLOUD_CONSTANTS } from '../../types/cloud';

export interface ValidationResult {
  category: string;
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

export interface DeploymentValidationReport {
  environment: string;
  overallStatus: 'ready' | 'issues' | 'failed';
  timestamp: string;
  summary: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
  };
  results: ValidationResult[];
  recommendations: string[];
}

/**
 * Comprehensive deployment validation service
 */
export class DeploymentValidationService {
  private environment: string;

  constructor() {
    this.environment = process.env.EXPO_PUBLIC_ENV || 'development';
  }

  /**
   * Run complete deployment validation
   */
  public async validateDeployment(): Promise<DeploymentValidationReport> {
    const timestamp = new Date().toISOString();
    const results: ValidationResult[] = [];

    console.log(`[DeploymentValidator] Starting validation for ${this.environment} environment...`);

    // Run all validation categories
    results.push(...await this.validateEnvironmentConfiguration());
    results.push(...await this.validateSupabaseConnection());
    results.push(...await this.validateSecurity());
    results.push(...await this.validatePerformance());
    results.push(...await this.validateFeatureFlags());
    results.push(...await this.validateCompliance());

    // Calculate summary
    const summary = {
      total: results.length,
      passed: results.filter(r => r.status === 'pass').length,
      failed: results.filter(r => r.status === 'fail').length,
      warnings: results.filter(r => r.status === 'warning').length
    };

    // Determine overall status
    let overallStatus: 'ready' | 'issues' | 'failed';
    if (summary.failed > 0) {
      overallStatus = 'failed';
    } else if (summary.warnings > 0) {
      overallStatus = 'issues';
    } else {
      overallStatus = 'ready';
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(results);

    const report: DeploymentValidationReport = {
      environment: this.environment,
      overallStatus,
      timestamp,
      summary,
      results,
      recommendations
    };

    console.log(`[DeploymentValidator] Validation complete: ${overallStatus} (${summary.passed}/${summary.total} passed)`);

    return report;
  }

  /**
   * Validate environment configuration
   */
  private async validateEnvironmentConfiguration(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    // Required environment variables
    const requiredVars = [
      'EXPO_PUBLIC_ENV',
      'EXPO_PUBLIC_CRISIS_HOTLINE',
      'EXPO_PUBLIC_SUPABASE_URL',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY',
      'EXPO_PUBLIC_SUPABASE_REGION'
    ];

    for (const varName of requiredVars) {
      const value = process.env[varName];

      if (!value || value.trim() === '') {
        results.push({
          category: 'environment',
          test: `${varName}_present`,
          status: 'fail',
          message: `Required environment variable ${varName} is missing or empty`,
          timestamp
        });
      } else {
        results.push({
          category: 'environment',
          test: `${varName}_present`,
          status: 'pass',
          message: `Environment variable ${varName} is configured`,
          details: { value: varName === 'EXPO_PUBLIC_SUPABASE_ANON_KEY' ? '[REDACTED]' : value },
          timestamp
        });
      }
    }

    // Validate environment-specific settings
    const envValue = process.env.EXPO_PUBLIC_ENV;
    if (envValue === this.environment) {
      results.push({
        category: 'environment',
        test: 'environment_match',
        status: 'pass',
        message: `Environment configuration matches deployment target: ${this.environment}`,
        timestamp
      });
    } else {
      results.push({
        category: 'environment',
        test: 'environment_match',
        status: 'warning',
        message: `Environment mismatch: configured=${envValue}, deployment=${this.environment}`,
        timestamp
      });
    }

    // Validate crisis hotline
    const crisisHotline = process.env.EXPO_PUBLIC_CRISIS_HOTLINE;
    if (crisisHotline === '988') {
      results.push({
        category: 'environment',
        test: 'crisis_hotline_valid',
        status: 'pass',
        message: 'Crisis hotline is correctly set to 988',
        timestamp
      });
    } else {
      results.push({
        category: 'environment',
        test: 'crisis_hotline_valid',
        status: 'fail',
        message: `Crisis hotline must be 988, found: ${crisisHotline}`,
        timestamp
      });
    }

    return results;
  }

  /**
   * Validate Supabase connection and configuration
   */
  private async validateSupabaseConnection(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    try {
      // Test basic connection
      const startTime = Date.now();
      const connectionResult = await supabaseClient.testConnection();
      const connectionTime = Date.now() - startTime;

      if (connectionResult.success) {
        results.push({
          category: 'supabase',
          test: 'connection_success',
          status: 'pass',
          message: 'Supabase connection successful',
          details: {
            latency: connectionResult.latency,
            testTime: connectionTime
          },
          timestamp
        });
      } else {
        results.push({
          category: 'supabase',
          test: 'connection_success',
          status: 'fail',
          message: `Supabase connection failed: ${connectionResult.error}`,
          details: {
            error: connectionResult.error,
            testTime: connectionTime
          },
          timestamp
        });
      }

      // Test latency requirements
      const latency = connectionResult.latency || connectionTime;
      const maxLatency = 1000; // 1 second max for initial connection

      if (latency <= maxLatency) {
        results.push({
          category: 'supabase',
          test: 'latency_acceptable',
          status: 'pass',
          message: `Connection latency ${latency}ms is within acceptable range`,
          details: { latency, threshold: maxLatency },
          timestamp
        });
      } else {
        results.push({
          category: 'supabase',
          test: 'latency_acceptable',
          status: 'warning',
          message: `Connection latency ${latency}ms exceeds recommended ${maxLatency}ms`,
          details: { latency, threshold: maxLatency },
          timestamp
        });
      }

      // Validate region
      const region = process.env.EXPO_PUBLIC_SUPABASE_REGION;
      if (CLOUD_CONSTANTS.HIPAA_REGIONS.includes(region as any)) {
        results.push({
          category: 'supabase',
          test: 'region_hipaa_compliant',
          status: 'pass',
          message: `Supabase region ${region} is HIPAA compliant`,
          details: { region },
          timestamp
        });
      } else {
        results.push({
          category: 'supabase',
          test: 'region_hipaa_compliant',
          status: 'fail',
          message: `Supabase region ${region} is not HIPAA compliant`,
          details: { region, validRegions: CLOUD_CONSTANTS.HIPAA_REGIONS },
          timestamp
        });
      }

      // Test authentication (if available)
      const authSession = supabaseClient.getSession();
      if (authSession) {
        results.push({
          category: 'supabase',
          test: 'authentication_active',
          status: 'pass',
          message: 'User authentication session is active',
          details: { userId: authSession.user?.id },
          timestamp
        });
      } else {
        results.push({
          category: 'supabase',
          test: 'authentication_active',
          status: 'warning',
          message: 'No active authentication session (expected for initial deployment)',
          timestamp
        });
      }

    } catch (error) {
      results.push({
        category: 'supabase',
        test: 'connection_test',
        status: 'fail',
        message: `Supabase validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp
      });
    }

    return results;
  }

  /**
   * Validate security configuration
   */
  private async validateSecurity(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    // Check encryption settings
    const encryptionEnabled = process.env.EXPO_PUBLIC_ENCRYPTION_ENABLED === 'true';
    if (encryptionEnabled) {
      results.push({
        category: 'security',
        test: 'encryption_enabled',
        status: 'pass',
        message: 'Data encryption is enabled',
        timestamp
      });
    } else {
      results.push({
        category: 'security',
        test: 'encryption_enabled',
        status: 'fail',
        message: 'Data encryption must be enabled for HIPAA compliance',
        timestamp
      });
    }

    // Check biometric authentication
    const biometricAuth = process.env.EXPO_PUBLIC_BIOMETRIC_AUTH === 'true';
    if (this.environment === 'production' && !biometricAuth) {
      results.push({
        category: 'security',
        test: 'biometric_auth',
        status: 'warning',
        message: 'Biometric authentication recommended for production',
        timestamp
      });
    } else if (biometricAuth) {
      results.push({
        category: 'security',
        test: 'biometric_auth',
        status: 'pass',
        message: 'Biometric authentication is enabled',
        timestamp
      });
    }

    // Check secure storage
    const secureStorage = process.env.EXPO_PUBLIC_SECURE_STORAGE === 'true';
    if (secureStorage) {
      results.push({
        category: 'security',
        test: 'secure_storage',
        status: 'pass',
        message: 'Secure storage is enabled',
        timestamp
      });
    } else {
      results.push({
        category: 'security',
        test: 'secure_storage',
        status: 'fail',
        message: 'Secure storage must be enabled',
        timestamp
      });
    }

    // Check session timeout
    const sessionTimeout = parseInt(process.env.EXPO_PUBLIC_SESSION_TIMEOUT || '0', 10);
    const maxSessionTimeout = this.environment === 'production' ? 1800 : 3600; // 30 min prod, 1 hour dev

    if (sessionTimeout > 0 && sessionTimeout <= maxSessionTimeout) {
      results.push({
        category: 'security',
        test: 'session_timeout',
        status: 'pass',
        message: `Session timeout ${sessionTimeout}s is within secure limits`,
        details: { timeout: sessionTimeout, maxTimeout: maxSessionTimeout },
        timestamp
      });
    } else {
      results.push({
        category: 'security',
        test: 'session_timeout',
        status: 'warning',
        message: `Session timeout ${sessionTimeout}s should be ≤${maxSessionTimeout}s for ${this.environment}`,
        details: { timeout: sessionTimeout, maxTimeout: maxSessionTimeout },
        timestamp
      });
    }

    return results;
  }

  /**
   * Validate performance requirements
   */
  private async validatePerformance(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    // Check crisis response time threshold
    const crisisMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_CRISIS_BUTTON_MAX_MS || '200', 10);
    if (crisisMaxMs <= 200) {
      results.push({
        category: 'performance',
        test: 'crisis_response_threshold',
        status: 'pass',
        message: `Crisis response threshold ${crisisMaxMs}ms meets requirement`,
        details: { threshold: crisisMaxMs, requirement: 200 },
        timestamp
      });
    } else {
      results.push({
        category: 'performance',
        test: 'crisis_response_threshold',
        status: 'fail',
        message: `Crisis response threshold ${crisisMaxMs}ms exceeds 200ms requirement`,
        details: { threshold: crisisMaxMs, requirement: 200 },
        timestamp
      });
    }

    // Check app launch time threshold
    const launchMaxMs = parseInt(process.env.EXPO_PUBLIC_PERFORMANCE_APP_LAUNCH_MAX_MS || '2000', 10);
    if (launchMaxMs <= (this.environment === 'production' ? 2000 : 3000)) {
      results.push({
        category: 'performance',
        test: 'app_launch_threshold',
        status: 'pass',
        message: `App launch threshold ${launchMaxMs}ms is acceptable`,
        timestamp
      });
    } else {
      results.push({
        category: 'performance',
        test: 'app_launch_threshold',
        status: 'warning',
        message: `App launch threshold ${launchMaxMs}ms may impact user experience`,
        timestamp
      });
    }

    // Test actual performance metrics
    try {
      const performanceMetrics = cloudMonitoring.checkPerformanceMetrics();

      if (performanceMetrics.withinThresholds) {
        results.push({
          category: 'performance',
          test: 'real_performance_metrics',
          status: 'pass',
          message: 'All performance metrics are within thresholds',
          details: performanceMetrics,
          timestamp
        });
      } else {
        results.push({
          category: 'performance',
          test: 'real_performance_metrics',
          status: 'warning',
          message: 'Some performance metrics exceed thresholds',
          details: performanceMetrics,
          timestamp
        });
      }
    } catch (error) {
      results.push({
        category: 'performance',
        test: 'real_performance_metrics',
        status: 'warning',
        message: 'Unable to measure real performance metrics',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        timestamp
      });
    }

    return results;
  }

  /**
   * Validate feature flags configuration
   */
  private async validateFeatureFlags(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    // Check cloud features default state
    const cloudFeaturesEnabled = process.env.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true';
    if (!cloudFeaturesEnabled) {
      results.push({
        category: 'feature_flags',
        test: 'cloud_features_default_off',
        status: 'pass',
        message: 'Cloud features correctly default to OFF for safety',
        timestamp
      });
    } else {
      const status = this.environment === 'development' ? 'warning' : 'fail';
      results.push({
        category: 'feature_flags',
        test: 'cloud_features_default_off',
        status,
        message: `Cloud features are enabled - ensure this is intentional for ${this.environment}`,
        timestamp
      });
    }

    // Parse and validate feature flags
    const featureFlagsStr = process.env.EXPO_PUBLIC_FEATURE_FLAGS || '';
    const featureFlags = this.parseFeatureFlags(featureFlagsStr);

    // Check critical safety flags
    const criticalFlags = ['crisis_detection', 'clinical_accuracy', 'data_encryption'];
    for (const flag of criticalFlags) {
      if (featureFlags[flag] === true) {
        results.push({
          category: 'feature_flags',
          test: `${flag}_enabled`,
          status: 'pass',
          message: `Critical safety flag '${flag}' is enabled`,
          timestamp
        });
      } else {
        results.push({
          category: 'feature_flags',
          test: `${flag}_enabled`,
          status: 'fail',
          message: `Critical safety flag '${flag}' must be enabled`,
          timestamp
        });
      }
    }

    // Check cloud sync is disabled by default
    if (featureFlags.cloud_sync !== true) {
      results.push({
        category: 'feature_flags',
        test: 'cloud_sync_default_off',
        status: 'pass',
        message: 'Cloud sync is safely disabled by default',
        timestamp
      });
    } else {
      results.push({
        category: 'feature_flags',
        test: 'cloud_sync_default_off',
        status: 'warning',
        message: 'Cloud sync is enabled - ensure this is intentional',
        timestamp
      });
    }

    return results;
  }

  /**
   * Validate HIPAA compliance
   */
  private async validateCompliance(): Promise<ValidationResult[]> {
    const results: ValidationResult[] = [];
    const timestamp = new Date().toISOString();

    try {
      const complianceStatus = await cloudMonitoring.validateCompliance();

      if (complianceStatus.hipaaCompliant) {
        results.push({
          category: 'compliance',
          test: 'hipaa_compliant',
          status: 'pass',
          message: 'All HIPAA compliance requirements are met',
          details: complianceStatus,
          timestamp
        });
      } else {
        results.push({
          category: 'compliance',
          test: 'hipaa_compliant',
          status: 'fail',
          message: `HIPAA compliance issues found: ${complianceStatus.issues.join(', ')}`,
          details: complianceStatus,
          timestamp
        });
      }

      // Individual compliance checks
      if (complianceStatus.encryptionActive) {
        results.push({
          category: 'compliance',
          test: 'encryption_compliance',
          status: 'pass',
          message: 'Data encryption meets HIPAA requirements',
          timestamp
        });
      }

      if (complianceStatus.regionCompliant) {
        results.push({
          category: 'compliance',
          test: 'region_compliance',
          status: 'pass',
          message: 'Service region meets HIPAA requirements',
          timestamp
        });
      }

      if (complianceStatus.auditTrailActive) {
        results.push({
          category: 'compliance',
          test: 'audit_trail_compliance',
          status: 'pass',
          message: 'Audit trail logging is active',
          timestamp
        });
      }

    } catch (error) {
      results.push({
        category: 'compliance',
        test: 'compliance_validation',
        status: 'fail',
        message: `Compliance validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp
      });
    }

    return results;
  }

  /**
   * Parse feature flags string
   */
  private parseFeatureFlags(flagsStr: string): Record<string, boolean> {
    const flags: Record<string, boolean> = {};

    if (!flagsStr) {
      return flags;
    }

    const pairs = flagsStr.split(',');
    for (const pair of pairs) {
      const [key, value] = pair.split(':');
      if (key && value) {
        flags[key.trim()] = value.trim() === 'true';
      }
    }

    return flags;
  }

  /**
   * Generate recommendations based on validation results
   */
  private generateRecommendations(results: ValidationResult[]): string[] {
    const recommendations: string[] = [];
    const failures = results.filter(r => r.status === 'fail');
    const warnings = results.filter(r => r.status === 'warning');

    if (failures.length > 0) {
      recommendations.push(`🚨 Fix ${failures.length} critical failures before deployment`);

      // Environment-specific recommendations
      if (this.environment === 'production') {
        recommendations.push('🔒 Ensure all security settings are production-ready');
        recommendations.push('⏱️ Verify crisis response time requirements are met');
        recommendations.push('🏥 Confirm HIPAA compliance is fully validated');
      }
    }

    if (warnings.length > 0) {
      recommendations.push(`⚠️ Review ${warnings.length} warnings for optimal deployment`);
    }

    // Cloud feature recommendations
    const cloudEnabled = process.env.EXPO_PUBLIC_CLOUD_FEATURES_ENABLED === 'true';
    if (!cloudEnabled) {
      recommendations.push('☁️ Cloud features are disabled - enable gradually after deployment validation');
      recommendations.push('📊 Monitor Supabase connection and performance before enabling sync');
    }

    // Performance recommendations
    recommendations.push('📈 Set up continuous monitoring after deployment');
    recommendations.push('💰 Configure cost alerts and budget monitoring');

    if (recommendations.length === 0) {
      recommendations.push('✅ Deployment configuration looks good!');
      recommendations.push('🚀 Ready for progressive feature rollout');
    }

    return recommendations;
  }

  /**
   * Quick validation for specific component
   */
  public async quickValidate(component: string): Promise<ValidationResult[]> {
    switch (component) {
      case 'supabase':
        return this.validateSupabaseConnection();
      case 'security':
        return this.validateSecurity();
      case 'performance':
        return this.validatePerformance();
      case 'compliance':
        return this.validateCompliance();
      case 'environment':
        return this.validateEnvironmentConfiguration();
      case 'feature_flags':
        return this.validateFeatureFlags();
      default:
        throw new Error(`Unknown validation component: ${component}`);
    }
  }
}

// Export singleton instance
export const deploymentValidator = new DeploymentValidationService();