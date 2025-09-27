/**
 * Enhanced Cross-Device Security Integration Example
 *
 * Demonstrates how to integrate all enhanced security services to provide
 * comprehensive end-to-end protection for cross-device sync with real-time
 * threat detection and crisis-aware emergency protocols.
 *
 * This example shows:
 * - Complete security initialization and configuration
 * - Real-time threat detection and automated response
 * - Crisis-aware security operations with <200ms response
 * - Cross-device encryption and synchronization security
 * - API security with threat monitoring and rate limiting
 * - State security with encrypted persistence and validation
 * - Comprehensive compliance monitoring and reporting
 */

import {
  // Comprehensive Security Orchestrator
  comprehensiveSecurityOrchestrator,
  initializeComprehensiveSecurity,
  getUnifiedSecurityStatus,
  coordinateThreatResponse,
  manageUnifiedCrisis,
  getComprehensiveSecurityMetrics,
  optimizeSecurityPerformance,

  // Enhanced Cross-Device Security
  enhancedCrossDeviceSecurityManager,
  initializeEnhancedSecurity,
  assessSecurityThreats,
  encryptForCrossDevice,
  decryptFromCrossDevice,
  executeCrisisOperation,

  // Enhanced API Security
  enhancedAPISecurityService,
  initializeAPISSecurity,
  secureAPIRequest,
  processAPIResponse,
  establishSecureWebSocket,
  enableEmergencyAPIAccess,

  // Enhanced State Security
  enhancedStateSecurityManager,
  secureWriteState,
  secureReadState,
  performCrisisStateOperation,
  synchronizeStateAcrossDevices,

  // Base Security Services
  encryptionService,
  DataSensitivity
} from '../services/security';

/**
 * Example: Complete Enhanced Security Integration
 */
export class EnhancedSecurityIntegrationExample {
  private initialized = false;
  private securityMetrics: any = null;

  /**
   * Step 1: Initialize comprehensive security across all layers
   */
  async initializeEnhancedSecurity(): Promise<void> {
    console.log('🔐 Initializing Enhanced Cross-Device Security...');

    try {
      // Initialize comprehensive security with production configuration
      await initializeComprehensiveSecurity({
        general: {
          environment: 'production',
          crisisResponseMaxMs: 200, // Strict crisis response requirement
          enableRealTimeMonitoring: true,
          enableAutomatedResponse: true,
          enableCrossLayerCoordination: true
        },
        layers: {
          crossDevice: {
            encryption: {
              algorithm: 'AES-256-GCM',
              keyDerivationRounds: 100000,
              deviceBindingEnabled: true,
              biometricKeyDerivation: true,
              emergencyKeyRecovery: true
            },
            threatDetection: {
              realTimeMonitoring: true,
              behavioralAnalysis: true,
              anomalyThreshold: 0.7,
              automatedResponse: true,
              crisisAwareness: true
            },
            crossDevice: {
              trustPropagation: true,
              deviceLimit: 5,
              trustScoreMinimum: 0.7,
              emergencyAccess: true,
              syncCoordination: true
            },
            compliance: {
              hipaaMode: true,
              pciDssMode: false,
              auditLevel: 'comprehensive',
              dataRetentionDays: 2555, // 7 years
              emergencyOverrides: true
            },
            performance: {
              crisisResponseMaxMs: 200,
              encryptionMaxMs: 100,
              syncMaxMs: 5000,
              cacheEnabled: true
            }
          },
          api: {
            encryption: {
              algorithm: 'AES-256-GCM',
              requestEncryption: true,
              responseEncryption: true,
              headerEncryption: false,
              payloadSigning: true
            },
            authentication: {
              tokenRotationMinutes: 30,
              biometricValidation: true,
              deviceBinding: true,
              sessionTimeout: 1800000, // 30 minutes
              multiFactorRequired: false
            },
            rateLimit: {
              enabled: true,
              requestsPerMinute: 100,
              burstLimit: 200,
              crisisExemption: true,
              adaptiveThrottling: true
            },
            threatDetection: {
              realTimeAnalysis: true,
              payloadInspection: true,
              anomalyDetection: true,
              automatedBlocking: true,
              crisisAwareness: true
            },
            emergency: {
              crisisEndpoints: ['/crisis', '/emergency', '/assessments'],
              emergencyBypass: true,
              degradedModeEndpoints: ['/crisis', '/auth', '/health'],
              maxCrisisResponseTime: 200
            },
            compliance: {
              hipaaLogging: true,
              pciDssCompliant: false,
              auditAllRequests: true,
              dataClassification: true,
              retentionDays: 2555
            }
          },
          state: {
            encryption: {
              algorithm: 'AES-256-GCM',
              encryptAllStates: true,
              stateSpecificKeys: true,
              integrityValidation: true,
              compressionEnabled: false
            },
            persistence: {
              enableAsyncStorage: true,
              enableSecureStore: false,
              enableCrossDeviceSync: true,
              backupFrequency: 60, // minutes
              retentionDays: 2555
            },
            monitoring: {
              trackStateChanges: true,
              detectAnomalies: true,
              realTimeValidation: true,
              performanceMonitoring: true,
              threatDetection: true
            },
            crossDevice: {
              enableSyncSecurity: true,
              conflictResolution: 'manual',
              trustValidation: true,
              emergencySync: true
            },
            crisis: {
              emergencyAccess: true,
              crisisStateIsolation: true,
              maxCrisisResponseTime: 200,
              emergencyBackup: true,
              postCrisisReview: true
            },
            compliance: {
              hipaaMode: true,
              pciDssMode: false,
              auditStateChanges: true,
              dataClassification: true,
              accessLogging: true
            }
          }
        },
        coordination: {
          threatLevelAlignment: true,
          crisisProtocolUnification: true,
          performanceOptimization: true,
          complianceAutomation: true
        },
        emergency: {
          enableEmergencyProtocols: true,
          crisisEscalationThreshold: 'high',
          emergencyContactNotification: true,
          postCrisisReviewRequired: true
        },
        compliance: {
          unifiedHIPAAMode: true,
          unifiedPCIDSSMode: false,
          crossLayerAuditTrail: true,
          realTimeComplianceValidation: true,
          automatedReporting: true
        },
        performance: {
          optimizeCrisisResponse: true,
          enableSecurityCaching: true,
          parallelSecurityOperations: true,
          adaptiveSecurityLevels: true
        }
      });

      this.initialized = true;
      console.log('✅ Enhanced security initialization completed successfully');

    } catch (error) {
      console.error('❌ Enhanced security initialization failed:', error);
      throw new Error(`Enhanced security initialization failed: ${error}`);
    }
  }

  /**
   * Step 2: Demonstrate secure cross-device data encryption
   */
  async demonstrateCrossDeviceEncryption(): Promise<void> {
    console.log('🔒 Demonstrating Cross-Device Encryption...');

    try {
      // Sample mental health assessment data
      const assessmentData = {
        id: 'assessment_123',
        type: 'phq9',
        responses: [2, 1, 3, 2, 1, 2, 3, 1, 0], // PHQ-9 responses
        score: 15,
        riskLevel: 'moderate',
        timestamp: new Date().toISOString(),
        userId: 'user_456'
      };

      // Target devices for cross-device sync
      const targetDevices = ['device_mobile', 'device_tablet', 'device_web'];

      // Encrypt for cross-device sync
      console.log('🔐 Encrypting assessment data for cross-device sync...');
      const encryptionResult = await encryptForCrossDevice(
        assessmentData,
        'assessment',
        targetDevices,
        false // Not crisis mode
      );

      console.log('✅ Cross-device encryption completed:');
      console.log(`- Algorithm: ${encryptionResult.algorithm}`);
      console.log(`- Device Count: ${Object.keys(encryptionResult.crossDeviceKeys).length}`);
      console.log(`- Emergency Key: ${!!encryptionResult.emergencyKey}`);
      console.log(`- HIPAA Compliant: ${encryptionResult.complianceMarkers.hipaaCompliant}`);

      // Decrypt on target device
      console.log('🔓 Decrypting data on target device...');
      const decryptedData = await decryptFromCrossDevice(
        encryptionResult,
        'assessment',
        'device_mobile',
        false
      );

      console.log('✅ Cross-device decryption completed successfully');
      console.log(`- Original Score: ${assessmentData.score}`);
      console.log(`- Decrypted Score: ${decryptedData.score}`);
      console.log(`- Data Integrity: ${assessmentData.score === decryptedData.score ? 'VALID' : 'INVALID'}`);

    } catch (error) {
      console.error('❌ Cross-device encryption demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 3: Demonstrate secure API operations with threat detection
   */
  async demonstrateSecureAPIOperations(): Promise<void> {
    console.log('🌐 Demonstrating Secure API Operations...');

    try {
      // Secure API request for mental health data
      console.log('📡 Creating secure API request...');
      const secureRequest = await secureAPIRequest(
        '/api/assessments',
        'POST',
        {
          type: 'gad7',
          responses: [1, 2, 1, 3, 2, 1, 2],
          timestamp: new Date().toISOString()
        },
        {
          'Content-Type': 'application/json',
          'X-Client-Version': '1.0.0'
        },
        {
          crisisMode: false,
          dataClassification: DataSensitivity.CLINICAL,
          requiresBiometric: true
        }
      );

      console.log('✅ Secure API request created:');
      console.log(`- Request ID: ${secureRequest.requestId}`);
      console.log(`- Encrypted: ${!!secureRequest.encryptedPayload}`);
      console.log(`- Signed: ${!!secureRequest.signature}`);
      console.log(`- Threat Level: ${secureRequest.securityContext.threatLevel}`);
      console.log(`- HIPAA Required: ${secureRequest.compliance.hipaaRequired}`);

      // Simulate API response processing
      console.log('📨 Processing secure API response...');
      const mockResponse = {
        status: 200,
        headers: {
          'X-Encrypted': 'true',
          'X-Signature': 'mock_signature',
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          assessmentId: 'gad7_789',
          score: 12,
          riskLevel: 'moderate',
          processed: true
        })
      };

      const secureResponse = await processAPIResponse(mockResponse, secureRequest);

      console.log('✅ Secure API response processed:');
      console.log(`- Response ID: ${secureResponse.responseId}`);
      console.log(`- Status: ${secureResponse.statusCode}`);
      console.log(`- Security Valid: ${secureResponse.securityValidation.signatureValid}`);
      console.log(`- Processing Time: ${secureResponse.processingTime}ms`);

    } catch (error) {
      console.error('❌ Secure API operations demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 4: Demonstrate secure state management with persistence
   */
  async demonstrateSecureStateManagement(): Promise<void> {
    console.log('💾 Demonstrating Secure State Management...');

    try {
      // Sample user profile state
      const userProfileState = {
        userId: 'user_456',
        preferences: {
          notificationsEnabled: true,
          reminderFrequency: 'daily',
          themeMode: 'auto'
        },
        progress: {
          completedAssessments: 15,
          streakDays: 7,
          lastCheckIn: new Date().toISOString()
        },
        settings: {
          biometricEnabled: true,
          syncEnabled: true,
          backupEnabled: true
        }
      };

      // Secure state write
      console.log('💾 Writing secure state...');
      const writeResult = await secureWriteState(
        'userProfile',
        'user_456',
        userProfileState,
        {
          security: {
            dataClassification: DataSensitivity.PERSONAL,
            crisisMode: false,
            emergencyOverride: false
          }
        }
      );

      console.log('✅ Secure state write completed:');
      console.log(`- State ID: ${writeResult.stateId}`);
      console.log(`- Write Time: ${writeResult.performance.writeTime}ms`);
      console.log(`- Encryption Time: ${writeResult.performance.encryptionTime}ms`);
      console.log(`- Security Level: ${writeResult.securityValidation.securityLevel}`);

      // Secure state read
      console.log('📖 Reading secure state...');
      const readResult = await secureReadState(
        'userProfile',
        'user_456',
        {
          security: {
            dataClassification: DataSensitivity.PERSONAL,
            crisisMode: false
          }
        }
      );

      console.log('✅ Secure state read completed:');
      console.log(`- Read Time: ${readResult.performance.readTime}ms`);
      console.log(`- Decryption Time: ${readResult.performance.decryptionTime}ms`);
      console.log(`- Data Integrity: ${readResult.state.userId === userProfileState.userId ? 'VALID' : 'INVALID'}`);

      // Cross-device state synchronization
      console.log('🔄 Synchronizing state across devices...');
      const syncResult = await synchronizeStateAcrossDevices(
        'userProfile',
        ['device_mobile', 'device_tablet'],
        {
          priority: 'normal',
          crisisMode: false,
          conflictResolution: 'manual'
        }
      );

      console.log('✅ Cross-device state synchronization initiated:');
      console.log(`- Sync ID: ${syncResult.syncId}`);
      console.log(`- Target Devices: ${syncResult.targetDevices.length}`);
      console.log(`- State Changes: ${syncResult.stateChanges.length}`);
      console.log(`- HIPAA Compliant: ${syncResult.compliance.hipaaCompliant}`);

    } catch (error) {
      console.error('❌ Secure state management demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 5: Demonstrate crisis management with <200ms response
   */
  async demonstrateCrisisManagement(): Promise<void> {
    console.log('🚨 Demonstrating Crisis Management...');

    try {
      // Simulate crisis situation (high PHQ-9 score)
      const crisisData = {
        assessmentId: 'phq9_crisis_123',
        score: 22, // High crisis score
        responses: [3, 3, 3, 3, 2, 3, 3, 2, 1],
        riskFactors: ['suicidal_ideation', 'hopelessness'],
        timestamp: new Date().toISOString()
      };

      console.log('⚡ Executing unified crisis management...');
      const startTime = Date.now();

      const crisisManagement = await manageUnifiedCrisis(
        'suicidal_ideation',
        'critical',
        {
          entityId: crisisData.assessmentId,
          entityType: 'assessment',
          justification: `High-risk PHQ-9 score: ${crisisData.score}/27 with suicidal ideation indicators`,
          requiredAccess: ['crisis_plan', 'emergency_contacts', 'assessments']
        }
      );

      const responseTime = Date.now() - startTime;

      console.log('✅ Unified crisis management completed:');
      console.log(`- Crisis ID: ${crisisManagement.crisisId}`);
      console.log(`- Response Time: ${responseTime}ms`);
      console.log(`- Requirement Met: ${crisisManagement.performance.requirementMet ? 'YES' : 'NO'} (≤200ms)`);
      console.log(`- Emergency Protocols: ${crisisManagement.coordinatedProtocols.dataAccessPrioritized ? 'ACTIVATED' : 'STANDBY'}`);
      console.log(`- Cross-Device Op: ${!!crisisManagement.layerOperations.crossDevice}`);
      console.log(`- API Bypass: ${!!crisisManagement.layerOperations.api}`);
      console.log(`- State Access: ${!!crisisManagement.layerOperations.state}`);

      // Demonstrate crisis state operations
      console.log('🔥 Performing crisis state operation...');
      const crisisStateResult = await performCrisisStateOperation(
        'read',
        'crisis',
        'emergency_plan',
        undefined,
        'Crisis intervention required - high-risk assessment detected'
      );

      console.log('✅ Crisis state operation completed:');
      console.log(`- Operation ID: ${crisisStateResult.operationId}`);
      console.log(`- Response Time: ${crisisStateResult.responseTime}ms`);
      console.log(`- Emergency Overrides: ${crisisStateResult.emergencyOverrides.length}`);
      console.log(`- Compliance Notes: ${crisisStateResult.complianceNotes.length}`);

    } catch (error) {
      console.error('❌ Crisis management demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 6: Demonstrate real-time threat detection and response
   */
  async demonstrateThreatDetectionAndResponse(): Promise<void> {
    console.log('🛡️ Demonstrating Threat Detection and Response...');

    try {
      // Perform comprehensive threat assessment
      console.log('🔍 Performing threat assessment...');
      const threatAssessment = await assessSecurityThreats(
        'current_device',
        'security_review',
        false
      );

      console.log('✅ Threat assessment completed:');
      console.log(`- Overall Threat: ${threatAssessment.overall}`);
      console.log(`- Threat Score: ${(threatAssessment.score * 100).toFixed(1)}%`);
      console.log(`- Threats Detected: ${threatAssessment.threats.length}`);
      console.log(`- Device Trust: ${(threatAssessment.deviceTrust.currentDevice * 100).toFixed(1)}%`);
      console.log(`- Crisis Context: ${threatAssessment.crisisContext.activeCrisis ? 'ACTIVE' : 'INACTIVE'}`);

      // Simulate threat response coordination
      if (threatAssessment.threats.length > 0) {
        console.log('⚠️ Coordinating threat response...');
        const threatResponse = await coordinateThreatResponse(
          'crossDevice',
          threatAssessment
        );

        console.log('✅ Threat response coordinated:');
        console.log(`- Response ID: ${threatResponse.responseId}`);
        console.log(`- Threat Level: ${threatResponse.threatLevel}`);
        console.log(`- Affected Layers: ${threatResponse.affectedLayers.join(', ')}`);
        console.log(`- Automatic Actions: ${threatResponse.automaticActions.length}`);
        console.log(`- Threats Isolated: ${threatResponse.coordinatedResponse.threatIsolated ? 'YES' : 'NO'}`);
        console.log(`- Systems Secured: ${threatResponse.coordinatedResponse.systemsSecured ? 'YES' : 'NO'}`);
      }

    } catch (error) {
      console.error('❌ Threat detection and response demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 7: Demonstrate comprehensive security monitoring
   */
  async demonstrateSecurityMonitoring(): Promise<void> {
    console.log('📊 Demonstrating Security Monitoring...');

    try {
      // Get unified security status
      console.log('📈 Getting unified security status...');
      const securityStatus = await getUnifiedSecurityStatus();

      console.log('✅ Unified security status:');
      console.log(`- Overall Status: ${securityStatus.overall.toUpperCase()}`);
      console.log(`- Cross-Device: ${securityStatus.layers.crossDevice.status} (${securityStatus.layers.crossDevice.devicesSecured} secured)`);
      console.log(`- API Security: ${securityStatus.layers.api.status} (${securityStatus.layers.api.averageLatency}ms avg)`);
      console.log(`- State Security: ${securityStatus.layers.state.status} (${securityStatus.layers.state.statesEncrypted} encrypted)`);
      console.log(`- Threats: ${securityStatus.threats.totalDetected} detected, ${securityStatus.threats.totalBlocked} blocked`);
      console.log(`- Crisis Ops: ${securityStatus.crisis.activeOperations} active (${securityStatus.crisis.averageResponseTime}ms avg)`);
      console.log(`- HIPAA Compliant: ${securityStatus.compliance.hipaaCompliant ? 'YES' : 'NO'}`);
      console.log(`- Crisis Response: ${securityStatus.performance.crisisResponseTime}ms`);

      // Get comprehensive metrics
      console.log('📊 Getting comprehensive security metrics...');
      const metrics = await getComprehensiveSecurityMetrics();

      console.log('✅ Comprehensive security metrics:');
      console.log(`- Total Operations: ${metrics.aggregated.totalOperations}`);
      console.log(`- Total Threats: ${metrics.aggregated.totalThreats}`);
      console.log(`- Security Efficiency: ${(metrics.aggregated.securityEfficiency * 100).toFixed(1)}%`);
      console.log(`- Security Overhead: ${metrics.performance.securityOverheadMs}ms`);
      console.log(`- Cache Hit Rate: ${metrics.performance.cacheHitRate}%`);
      console.log(`- Compliance Score: ${(metrics.compliance.complianceScore * 100).toFixed(1)}%`);

      this.securityMetrics = metrics;

    } catch (error) {
      console.error('❌ Security monitoring demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 8: Demonstrate security performance optimization
   */
  async demonstrateSecurityOptimization(): Promise<void> {
    console.log('⚡ Demonstrating Security Performance Optimization...');

    try {
      // Optimize security performance
      console.log('🔧 Optimizing security performance...');
      const optimization = await optimizeSecurityPerformance();

      console.log('✅ Security performance optimization completed:');
      console.log(`- Optimizations Applied: ${optimization.optimizationsApplied.length}`);
      optimization.optimizationsApplied.forEach((opt, index) => {
        console.log(`  ${index + 1}. ${opt}`);
      });
      console.log(`- Performance Gain: ${optimization.performanceGain}%`);
      console.log(`- Security Impact: ${optimization.securityImpact}`);

      // Layer-specific optimizations
      console.log('📈 Layer-specific optimizations:');
      Object.entries(optimization.layerOptimizations).forEach(([layer, opts]: [string, any]) => {
        console.log(`- ${layer}: ${opts.optimizationsApplied?.join(', ') || 'None'}`);
      });

    } catch (error) {
      console.error('❌ Security optimization demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Step 9: Demonstrate emergency API access
   */
  async demonstrateEmergencyAPIAccess(): Promise<void> {
    console.log('🚨 Demonstrating Emergency API Access...');

    try {
      // Enable emergency API access
      console.log('🔓 Enabling emergency API access...');
      const emergencyAccess = await enableEmergencyAPIAccess(
        'Crisis intervention required - critical assessment detected',
        ['/api/crisis', '/api/emergency', '/api/assessments'],
        15 // 15 minutes
      );

      console.log('✅ Emergency API access enabled:');
      console.log(`- Override ID: ${emergencyAccess.overrideId}`);
      console.log(`- Enabled: ${emergencyAccess.enabled ? 'YES' : 'NO'}`);
      console.log(`- Affected Endpoints: ${emergencyAccess.affectedEndpoints.length}`);
      console.log(`- Expires At: ${new Date(emergencyAccess.expiresAt).toLocaleString()}`);

    } catch (error) {
      console.error('❌ Emergency API access demonstration failed:', error);
      throw error;
    }
  }

  /**
   * Run complete enhanced security integration demonstration
   */
  async runCompleteDemo(): Promise<void> {
    console.log('🚀 Starting Enhanced Cross-Device Security Integration Demo...');
    console.log('================================================================');

    try {
      // Step 1: Initialize security
      await this.initializeEnhancedSecurity();
      console.log('');

      // Step 2: Cross-device encryption
      await this.demonstrateCrossDeviceEncryption();
      console.log('');

      // Step 3: Secure API operations
      await this.demonstrateSecureAPIOperations();
      console.log('');

      // Step 4: Secure state management
      await this.demonstrateSecureStateManagement();
      console.log('');

      // Step 5: Crisis management
      await this.demonstrateCrisisManagement();
      console.log('');

      // Step 6: Threat detection and response
      await this.demonstrateThreatDetectionAndResponse();
      console.log('');

      // Step 7: Security monitoring
      await this.demonstrateSecurityMonitoring();
      console.log('');

      // Step 8: Performance optimization
      await this.demonstrateSecurityOptimization();
      console.log('');

      // Step 9: Emergency API access
      await this.demonstrateEmergencyAPIAccess();
      console.log('');

      console.log('================================================================');
      console.log('🎉 Enhanced Cross-Device Security Integration Demo Completed Successfully!');
      console.log('');
      console.log('📊 Demo Summary:');
      console.log('- ✅ Comprehensive security initialization');
      console.log('- ✅ Cross-device encryption and decryption');
      console.log('- ✅ Secure API operations with threat detection');
      console.log('- ✅ Encrypted state management and synchronization');
      console.log('- ✅ Crisis management with <200ms response');
      console.log('- ✅ Real-time threat detection and response');
      console.log('- ✅ Comprehensive security monitoring');
      console.log('- ✅ Performance optimization');
      console.log('- ✅ Emergency API access protocols');
      console.log('');
      console.log('🔐 Security Features Demonstrated:');
      console.log('- End-to-end encryption across all data layers');
      console.log('- Real-time threat detection and automated response');
      console.log('- Crisis-aware security with emergency protocols');
      console.log('- Cross-device synchronization security');
      console.log('- HIPAA/PCI DSS compliance automation');
      console.log('- Performance-optimized security operations');
      console.log('- Comprehensive audit trails and reporting');

    } catch (error) {
      console.error('❌ Enhanced security integration demo failed:', error);
      console.log('');
      console.log('🛠️ Troubleshooting Steps:');
      console.log('1. Verify all security services are properly initialized');
      console.log('2. Check device capabilities (biometric, secure storage)');
      console.log('3. Ensure proper encryption key management');
      console.log('4. Validate network connectivity for API operations');
      console.log('5. Review security configuration parameters');

      throw new Error(`Enhanced security demo failed: ${error}`);
    }
  }

  /**
   * Get current security metrics
   */
  getSecurityMetrics(): any {
    return this.securityMetrics;
  }

  /**
   * Check if security is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}

// Export demo instance
export const enhancedSecurityDemo = new EnhancedSecurityIntegrationExample();

/**
 * Convenience function to run the complete demo
 */
export const runEnhancedSecurityDemo = async (): Promise<void> => {
  await enhancedSecurityDemo.runCompleteDemo();
};

/**
 * Quick demo functions for specific features
 */
export const demoQuickFeatures = {
  initialization: () => enhancedSecurityDemo.initializeEnhancedSecurity(),
  crossDeviceEncryption: () => enhancedSecurityDemo.demonstrateCrossDeviceEncryption(),
  apiSecurity: () => enhancedSecurityDemo.demonstrateSecureAPIOperations(),
  stateManagement: () => enhancedSecurityDemo.demonstrateSecureStateManagement(),
  crisisManagement: () => enhancedSecurityDemo.demonstrateCrisisManagement(),
  threatDetection: () => enhancedSecurityDemo.demonstrateThreatDetectionAndResponse(),
  monitoring: () => enhancedSecurityDemo.demonstrateSecurityMonitoring(),
  optimization: () => enhancedSecurityDemo.demonstrateSecurityOptimization(),
  emergencyAccess: () => enhancedSecurityDemo.demonstrateEmergencyAPIAccess()
};

// Example usage documentation
export const USAGE_EXAMPLES = {
  basicUsage: `
// Basic enhanced security setup
import { runEnhancedSecurityDemo } from './examples/enhanced-security-integration-example';

async function setupSecurity() {
  try {
    await runEnhancedSecurityDemo();
    console.log('Enhanced security ready!');
  } catch (error) {
    console.error('Security setup failed:', error);
  }
}
`,

  crisisResponse: `
// Crisis-aware security response
import { manageUnifiedCrisis } from '../services/security';

async function handleCrisis(assessmentData) {
  const crisis = await manageUnifiedCrisis(
    'suicidal_ideation',
    'critical',
    {
      entityId: assessmentData.id,
      entityType: 'assessment',
      justification: 'High-risk PHQ-9 score detected',
      requiredAccess: ['crisis_plan', 'emergency_contacts']
    }
  );

  // Crisis response completed in <200ms
  console.log(\`Crisis handled in \${crisis.performance.responseTime}ms\`);
}
`,

  crossDeviceSync: `
// Secure cross-device data synchronization
import { encryptForCrossDevice, synchronizeStateAcrossDevices } from '../services/security';

async function syncUserData(userData, targetDevices) {
  // Encrypt for cross-device access
  const encrypted = await encryptForCrossDevice(
    userData,
    'user_profile',
    targetDevices,
    false
  );

  // Synchronize across devices
  const syncResult = await synchronizeStateAcrossDevices(
    'userProfile',
    targetDevices,
    { priority: 'high', conflictResolution: 'manual' }
  );

  return { encrypted, syncResult };
}
`,

  threatMonitoring: `
// Real-time threat detection and response
import { assessSecurityThreats, coordinateThreatResponse } from '../services/security';

async function monitorSecurity() {
  const threats = await assessSecurityThreats('current_device', 'routine_check');

  if (threats.overall !== 'safe') {
    const response = await coordinateThreatResponse('crossDevice', threats);
    console.log(\`Threat response: \${response.coordinatedResponse.threatIsolated ? 'Secured' : 'Escalated'}\`);
  }
}
`
};

console.log('📚 Enhanced Cross-Device Security Integration Example loaded successfully!');
console.log('🔧 Use runEnhancedSecurityDemo() to see the complete demonstration');
console.log('⚡ Use demoQuickFeatures.{feature}() for specific feature demos');