/**
 * Enhanced Sync Store Integration Example for Being. MBCT App
 *
 * Demonstrates how the enhanced sync store patterns work together:
 * - Enhanced Sync Store: Core real-time state synchronization
 * - Cross-Device Coordination Store: Multi-device session management
 * - Conflict Resolution Store: Intelligent therapeutic data prioritization
 * - Payment Store Integration: Subscription-aware sync capabilities
 * - Crisis Store Integration: Emergency state coordination
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import {
  useEnhancedSync,
  useCrisisSafeSync,
  usePaymentAwareSync,
  useSyncPerformance,
  useCrossDeviceCoordination,
  useConflictResolution,
  usePaymentStore,
  useAssessmentStore,
} from '../index';

/**
 * Comprehensive Sync Store Integration Hook
 *
 * Orchestrates all sync stores for optimal performance and therapeutic safety
 */
export const useSyncStoreIntegration = () => {
  // Core sync stores
  const enhancedSync = useEnhancedSync();
  const crisisSafeSync = useCrisisSafeSync();
  const paymentAwareSync = usePaymentAwareSync();
  const syncPerformance = useSyncPerformance();
  const crossDeviceCoordination = useCrossDeviceCoordination();
  const conflictResolution = useConflictResolution();

  // Integration with existing stores
  const paymentStore = usePaymentStore();
  const assessmentStore = useAssessmentStore();

  /**
   * Initialize Sync Store Integration
   * Sets up store connections and event handlers
   */
  const initializeSyncIntegration = useCallback(async () => {
    try {
      // 1. Initialize core sync store
      await enhancedSync.initializeSync();

      // 2. Integrate stores with each other
      enhancedSync.integrateWithStore('payment', paymentStore);
      enhancedSync.integrateWithStore('assessment', assessmentStore);

      crossDeviceCoordination.integrateWithSyncStore(enhancedSync);
      crossDeviceCoordination.integrateWithPaymentStore(paymentStore);

      conflictResolution.integrateWithSyncStore(enhancedSync);
      conflictResolution.integrateWithAssessmentStore(assessmentStore);

      // 3. Register current device for cross-device coordination
      await crossDeviceCoordination.registerDevice({
        deviceId: await getDeviceId(),
        deviceName: await getDeviceName(),
        deviceType: 'mobile',
        platform: Platform.OS as 'ios' | 'android',
        appVersion: '1.0.0',
        capabilities: {
          canReceiveSessionHandoff: true,
          canInitiateSessionHandoff: true,
          supportsCrisisNotifications: true,
          supportsHapticFeedback: true,
          supportsPushNotifications: true,
          supportsWidgets: false,
        },
        syncPreferences: {
          autoSyncEnabled: true,
          syncFrequency: 'normal',
          crisisAlertEnabled: true,
          familySharingEnabled: false,
          sessionHandoffEnabled: true,
        },
        performance: {
          averageResponseTime: 0,
          lastSyncLatency: 0,
          reliabilityScore: 1,
          batteryOptimized: false,
        },
      });

      // 4. Start sync operations
      await enhancedSync.startSync();

      // 5. Enable real-time sync if subscription allows
      if (paymentAwareSync.hasRealtimeSync) {
        await enhancedSync.enableRealTimeSync();
      }

      console.log('Sync store integration initialized successfully');

    } catch (error) {
      console.error('Failed to initialize sync store integration:', error);
      throw error;
    }
  }, [enhancedSync, crossDeviceCoordination, conflictResolution, paymentStore, assessmentStore]);

  /**
   * Handle Crisis State Changes
   * Demonstrates crisis-safe sync coordination
   */
  const handleCrisisStateChange = useCallback(async (crisisLevel: 'mild' | 'moderate' | 'severe' | 'emergency') => {
    try {
      // 1. Activate crisis mode in sync store
      await crisisSafeSync.activateCrisis(crisisLevel);

      // 2. Trigger crisis coordination across devices
      await crossDeviceCoordination.triggerCrisisAlert(crisisLevel, {
        sourceDevice: crossDeviceCoordination.currentDevice.deviceId,
        timestamp: new Date().toISOString(),
        automaticResponse: true,
      });

      // 3. Ensure crisis response time meets requirements
      const responseTimeValid = await crisisSafeSync.validateCrisisResponseTime();
      if (!responseTimeValid) {
        console.warn('Crisis response time exceeded target (<200ms)');
        // Trigger emergency override for faster response
        await crisisSafeSync.triggerEmergencyOverride();
      }

      // 4. Handle any conflicts with crisis priority
      const crisisConflicts = conflictResolution.getCriticalConflicts(conflictResolution);
      for (const conflict of crisisConflicts) {
        await conflictResolution.resolveConflict(conflict.id, 'crisis_priority');
      }

      console.log(`Crisis mode activated at level: ${crisisLevel}`);

    } catch (error) {
      console.error('Failed to handle crisis state change:', error);
    }
  }, [crisisSafeSync, crossDeviceCoordination, conflictResolution]);

  /**
   * Handle Session Handoff
   * Demonstrates cross-device session continuity
   */
  const handleSessionHandoff = useCallback(async (
    sessionType: 'assessment' | 'breathing' | 'checkin' | 'crisis' | 'meditation',
    sessionData: any,
    targetDeviceId: string
  ) => {
    try {
      // 1. Create session context with therapeutic metadata
      const sessionContext = {
        sessionId: `session_${Date.now()}`,
        sessionType,
        currentStep: sessionData.currentStep || 0,
        totalSteps: sessionData.totalSteps || 1,
        progress: sessionData.progress || 0,
        startTime: new Date().toISOString(),
        sessionData: sessionData,
        userResponses: sessionData.responses || [],
        sourceDeviceId: crossDeviceCoordination.currentDevice.deviceId,
        therapeuticContext: {
          moodBefore: sessionData.moodBefore,
          crisisLevel: crisisSafeSync.crisisLevel,
          needsContinuity: sessionType === 'assessment' || sessionType === 'crisis',
          canPause: sessionType !== 'crisis',
          privacyLevel: 'private',
        },
        integrity: {
          checksum: '',
          encryptionVersion: '1.0',
          lastVerified: new Date().toISOString(),
        },
      };

      // 2. Initiate handoff with cross-device coordination
      const handoffId = await crossDeviceCoordination.initiateSessionHandoff(sessionContext, targetDeviceId);

      // 3. Monitor handoff progress
      const handoffTimeout = setTimeout(async () => {
        console.warn('Session handoff timeout, falling back to local session');
        await crossDeviceCoordination.rejectSessionHandoff(handoffId, 'timeout');
      }, 30000); // 30 second timeout

      // 4. Record handoff metrics
      syncPerformance.recordMetric('session_handoff_initiated', performance.now());

      console.log(`Session handoff initiated: ${handoffId}`);
      return handoffId;

    } catch (error) {
      console.error('Failed to handle session handoff:', error);
      throw error;
    }
  }, [crossDeviceCoordination, crisisSafeSync, syncPerformance]);

  /**
   * Handle Payment Status Change
   * Demonstrates payment-aware sync adaptation
   */
  const handlePaymentStatusChange = useCallback(async (paymentState: any) => {
    try {
      // 1. Update subscription context in sync store
      const subscriptionState = {
        tier: paymentState.subscriptionTier,
        status: paymentState.subscriptionStatus,
      };

      paymentAwareSync.updateSubscription(subscriptionState, paymentState);

      // 2. Adjust sync capabilities based on subscription
      const syncConfig = paymentAwareSync.getSyncConfig();

      if (syncConfig.features.realtimeSync && !enhancedSync.syncState.status.includes('realtime')) {
        await enhancedSync.enableRealTimeSync();
      } else if (!syncConfig.features.realtimeSync && enhancedSync.syncState.status.includes('realtime')) {
        enhancedSync.disableRealTimeSync();
      }

      // 3. Update device limits if needed
      const deviceLimit = getDeviceLimitForTier(subscriptionState.tier);
      const connectedDevices = crossDeviceCoordination.deviceNetwork.connectedDevices.length;

      if (connectedDevices > deviceLimit) {
        console.warn(`Device limit exceeded for tier ${subscriptionState.tier}. Current: ${connectedDevices}, Limit: ${deviceLimit}`);
        // Could trigger device removal or upgrade prompt
      }

      // 4. Update sync frequency based on tier
      const newFrequency = getSyncFrequencyForTier(subscriptionState.tier);
      enhancedSync.updateSyncFrequency(newFrequency);

      console.log(`Payment status updated, sync capabilities adjusted for tier: ${subscriptionState.tier}`);

    } catch (error) {
      console.error('Failed to handle payment status change:', error);
    }
  }, [paymentAwareSync, enhancedSync, crossDeviceCoordination]);

  /**
   * Handle Data Conflict
   * Demonstrates intelligent conflict resolution with therapeutic prioritization
   */
  const handleDataConflict = useCallback(async (
    localData: any,
    remoteData: any,
    dataType: 'user_profile' | 'assessment' | 'session' | 'progress' | 'crisis' | 'family'
  ) => {
    try {
      // 1. Create conflict context
      const conflictContext = {
        sourceDeviceId: crossDeviceCoordination.currentDevice.deviceId,
        targetDeviceId: 'remote',
        conflictOrigin: 'sync' as const,
        detectedAt: new Date().toISOString(),
        dataType,
        recordId: localData.id || remoteData.id || 'unknown',
        fieldPath: 'root',
        localTimestamp: localData.timestamp || new Date().toISOString(),
        remoteTimestamp: remoteData.timestamp || new Date().toISOString(),
        networkLatency: syncPerformance.metrics.syncLatency,
        activeSession: crossDeviceCoordination.currentDevice.currentSession,
        crisisActive: crisisSafeSync.isCrisisMode,
        crisisLevel: crisisSafeSync.crisisLevel,
        userState: 'active' as const,
        therapeuticPhase: 'engagement' as const,
      };

      // 2. Detect and analyze conflict
      const conflictId = await conflictResolution.detectConflict(localData, remoteData, conflictContext);
      const therapeuticImpact = await conflictResolution.analyzeConflict(conflictId);

      // 3. Handle conflict based on therapeutic impact
      if (therapeuticImpact.level === 'critical' || therapeuticImpact.urgencyLevel === 'emergency') {
        // Auto-resolve critical conflicts with crisis priority
        await conflictResolution.resolveConflict(conflictId, 'crisis_priority');
      } else if (therapeuticImpact.level === 'significant') {
        // Use therapeutic priority for significant conflicts
        await conflictResolution.resolveConflict(conflictId, 'therapeutic_priority');
      } else if (conflictResolution.isAIEnabled(conflictResolution) && therapeuticImpact.level !== 'minimal') {
        // Use AI-assisted resolution for moderate conflicts
        const aiRecommendation = await conflictResolution.getAIRecommendation(conflictId);
        const isValid = await conflictResolution.validateAIRecommendation(conflictId, aiRecommendation);

        if (isValid && aiRecommendation.confidence >= conflictResolution.getAIConfidenceThreshold(conflictResolution)) {
          await conflictResolution.resolveConflict(conflictId, 'merge_intelligent');
        } else {
          // Fallback to user guidance
          await conflictResolution.requestUserGuidance(conflictId);
        }
      } else {
        // Auto-resolve minimal conflicts with timestamp priority
        await conflictResolution.resolveConflict(conflictId, 'timestamp_priority');
      }

      console.log(`Data conflict resolved: ${conflictId}, Impact: ${therapeuticImpact.level}`);

    } catch (error) {
      console.error('Failed to handle data conflict:', error);
    }
  }, [conflictResolution, crossDeviceCoordination, syncPerformance, crisisSafeSync]);

  /**
   * Monitor Sync Performance
   * Demonstrates performance optimization based on metrics
   */
  const monitorSyncPerformance = useCallback(async () => {
    try {
      // 1. Check performance targets
      const targetsMe = syncPerformance.checkTargets();

      if (!targetsMe) {
        console.warn('Sync performance targets not met, optimizing...');

        // 2. Optimize enhanced sync performance
        await enhancedSync.optimizePerformance();

        // 3. Optimize cross-device network performance
        await crossDeviceCoordination.optimizeNetworkPerformance();

        // 4. Optimize conflict resolution performance
        await conflictResolution.optimizeResolutionPerformance();
      }

      // 5. Generate performance report
      const performanceReport = {
        sync: enhancedSync.getPerformanceReport(),
        crossDevice: crossDeviceCoordination.getNetworkHealthReport(),
        conflictResolution: conflictResolution.getPerformanceReport(),
      };

      // 6. Check for performance violations
      if (syncPerformance.hasViolations) {
        console.warn('Performance violations detected:', performanceReport);

        // Could trigger alerts or automatic optimizations
        if (performanceReport.sync.violationSummary.critical > 0) {
          // Critical violations - trigger emergency optimizations
          await enhancedSync.optimizePerformance();
        }
      }

    } catch (error) {
      console.error('Failed to monitor sync performance:', error);
    }
  }, [syncPerformance, enhancedSync, crossDeviceCoordination, conflictResolution]);

  /**
   * Handle Family Sharing
   * Demonstrates family-aware sync with privacy controls
   */
  const handleFamilySharing = useCallback(async (
    familyId: string,
    memberRole: 'admin' | 'member',
    sharingSettings: any
  ) => {
    try {
      // 1. Enable family sharing in cross-device coordination
      await crossDeviceCoordination.enableFamilySharing(familyId, memberRole);

      // 2. Update family privacy settings
      await crossDeviceCoordination.updateFamilyPrivacy(sharingSettings);

      // 3. Configure sync for family context
      if (sharingSettings.shareProgress) {
        // Enable progress sharing with family members
        await enhancedSync.updateSyncFrequency(10000); // More frequent sync for family sharing
      }

      // 4. Set up family crisis coordination
      if (sharingSettings.shareCrisisState) {
        // Crisis events will be shared with family members
        console.log('Family crisis coordination enabled');
      }

      console.log(`Family sharing enabled: ${familyId}, Role: ${memberRole}`);

    } catch (error) {
      console.error('Failed to handle family sharing:', error);
    }
  }, [crossDeviceCoordination, enhancedSync]);

  // Performance monitoring effect
  useEffect(() => {
    const performanceInterval = setInterval(monitorSyncPerformance, 60000); // Check every minute
    return () => clearInterval(performanceInterval);
  }, [monitorSyncPerformance]);

  // Payment state monitoring effect
  useEffect(() => {
    const unsubscribe = paymentStore.subscribe((state) => {
      if (state.subscriptionTier || state.subscriptionStatus) {
        handlePaymentStatusChange(state);
      }
    });

    return unsubscribe;
  }, [paymentStore, handlePaymentStatusChange]);

  return {
    // Initialization
    initializeSyncIntegration,

    // Crisis management
    handleCrisisStateChange,
    isCrisisMode: crisisSafeSync.isCrisisMode,
    crisisLevel: crisisSafeSync.crisisLevel,

    // Session management
    handleSessionHandoff,
    activeSessions: crossDeviceCoordination.activeSessions,
    connectedDevices: crossDeviceCoordination.deviceNetwork.connectedDevices,

    // Conflict resolution
    handleDataConflict,
    activeConflicts: conflictResolution.activeConflicts,
    criticalConflicts: conflictResolution.getCriticalConflicts(conflictResolution),

    // Performance monitoring
    monitorSyncPerformance,
    performanceMetrics: syncPerformance.metrics,
    hasPerformanceViolations: syncPerformance.hasViolations,

    // Family sharing
    handleFamilySharing,
    familyMembers: crossDeviceCoordination.familySharing.familyMembers,
    familySharingEnabled: crossDeviceCoordination.familySharing.familyId != null,

    // Payment integration
    currentTier: paymentAwareSync.currentTier,
    hasRealtimeSync: paymentAwareSync.hasRealtimeSync,
    quotaUsage: paymentAwareSync.quotaUsage,

    // Sync state
    syncStatus: enhancedSync.syncState.status,
    isOnline: enhancedSync.syncState.isOnline,
    syncProgress: enhancedSync.syncState.syncProgress,

    // Actions
    forceSync: enhancedSync.forceSync,
    startSync: enhancedSync.startSync,
    stopSync: enhancedSync.stopSync,
  };
};

/**
 * Helper functions for subscription tier management
 */
const getDeviceLimitForTier = (tier: string): number => {
  switch (tier) {
    case 'enterprise': return 50;
    case 'family': return 10;
    case 'premium': return 5;
    case 'free': return 1;
    default: return 1;
  }
};

const getSyncFrequencyForTier = (tier: string): number => {
  switch (tier) {
    case 'enterprise': return 5000;  // 5 seconds
    case 'family': return 10000;     // 10 seconds
    case 'premium': return 15000;    // 15 seconds
    case 'free': return 30000;       // 30 seconds
    default: return 30000;
  }
};

/**
 * Device identification helpers
 */
const getDeviceId = async (): Promise<string> => {
  // In real implementation, use device-specific ID
  return `device_${Date.now()}`;
};

const getDeviceName = async (): Promise<string> => {
  // In real implementation, get actual device name
  return 'iPhone 14 Pro';
};

/**
 * Example React Component Using Sync Store Integration
 */
export const SyncIntegrationExample: React.FC = () => {
  const syncIntegration = useSyncStoreIntegration();

  useEffect(() => {
    // Initialize sync integration when component mounts
    syncIntegration.initializeSyncIntegration().catch(console.error);
  }, []);

  const handleCrisisButtonPress = useCallback(() => {
    // Trigger crisis response
    syncIntegration.handleCrisisStateChange('severe');
  }, [syncIntegration]);

  const handleDeviceHandoff = useCallback(() => {
    // Example session handoff to another device
    const targetDeviceId = syncIntegration.connectedDevices[0]?.deviceId;
    if (targetDeviceId) {
      syncIntegration.handleSessionHandoff(
        'breathing',
        { currentStep: 2, totalSteps: 5, progress: 0.4 },
        targetDeviceId
      );
    }
  }, [syncIntegration]);

  return (
    <ScrollView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', marginBottom: 16 }}>
        Sync Store Integration Status
      </Text>

      {/* Sync Status */}
      <View style={{ marginBottom: 16 }}>
        <Text>Status: {syncIntegration.syncStatus}</Text>
        <Text>Online: {syncIntegration.isOnline ? 'Yes' : 'No'}</Text>
        <Text>Progress: {Math.round(syncIntegration.syncProgress * 100)}%</Text>
        <Text>Subscription: {syncIntegration.currentTier}</Text>
      </View>

      {/* Crisis State */}
      {syncIntegration.isCrisisMode && (
        <View style={{ backgroundColor: '#fee', padding: 12, marginBottom: 16, borderRadius: 8 }}>
          <Text>Crisis Mode Active: {syncIntegration.crisisLevel}</Text>
          <TouchableOpacity
            onPress={() => syncIntegration.handleCrisisStateChange('none')}
            style={{ backgroundColor: '#dc3545', padding: 8, borderRadius: 4, marginTop: 8 }}
          >
            <Text style={{ color: 'white' }}>Resolve Crisis</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Connected Devices */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
          Connected Devices ({syncIntegration.connectedDevices.length})
        </Text>
        {syncIntegration.connectedDevices.map(device => (
          <View key={device.deviceId} style={{ padding: 8, borderWidth: 1, borderColor: '#ddd', marginBottom: 4 }}>
            <Text>{device.deviceName} ({device.deviceType})</Text>
            <Text>Active: {device.isActive ? 'Yes' : 'No'}</Text>
          </View>
        ))}
      </View>

      {/* Active Conflicts */}
      {syncIntegration.activeConflicts.length > 0 && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>
            Active Conflicts ({syncIntegration.activeConflicts.length})
          </Text>
          {syncIntegration.criticalConflicts.map(conflict => (
            <View key={conflict.id} style={{ backgroundColor: '#ffe6e6', padding: 12, marginBottom: 8, borderRadius: 8, borderLeftWidth: 4, borderLeftColor: '#dc3545' }}>
              <Text>Type: {conflict.conflictType}</Text>
              <Text>Impact: {conflict.therapeuticImpact.level}</Text>
              <Text>State: {conflict.resolutionState}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Performance Metrics */}
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Performance</Text>
        <Text>Sync Latency: {syncIntegration.performanceMetrics.syncLatency}ms</Text>
        <Text>Crisis Response: {syncIntegration.performanceMetrics.crisisResponseTime}ms</Text>
        <Text>Violations: {syncIntegration.hasPerformanceViolations ? 'Yes' : 'No'}</Text>
      </View>

      {/* Family Sharing */}
      {syncIntegration.familySharingEnabled && (
        <View style={{ marginBottom: 16 }}>
          <Text style={{ fontSize: 18, fontWeight: '600', marginBottom: 8 }}>Family Sharing</Text>
          <Text>Members: {syncIntegration.familyMembers.length}</Text>
        </View>
      )}

      {/* Actions */}
      <View style={{ marginBottom: 16 }}>
        <TouchableOpacity
          onPress={handleCrisisButtonPress}
          style={{ backgroundColor: '#dc3545', padding: 12, borderRadius: 8, marginBottom: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Trigger Crisis
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDeviceHandoff}
          disabled={syncIntegration.connectedDevices.length === 0}
          style={{
            backgroundColor: syncIntegration.connectedDevices.length === 0 ? '#6c757d' : '#007bff',
            padding: 12,
            borderRadius: 8,
            marginBottom: 8,
            opacity: syncIntegration.connectedDevices.length === 0 ? 0.6 : 1
          }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Handoff Session
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={syncIntegration.forceSync}
          style={{ backgroundColor: '#28a745', padding: 12, borderRadius: 8, marginBottom: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Force Sync
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={syncIntegration.monitorSyncPerformance}
          style={{ backgroundColor: '#17a2b8', padding: 12, borderRadius: 8, marginBottom: 8 }}
        >
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: '600' }}>
            Check Performance
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

export default useSyncStoreIntegration;