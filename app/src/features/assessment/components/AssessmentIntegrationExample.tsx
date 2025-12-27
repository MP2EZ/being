/**
 * Assessment Integration Example - Comprehensive System Demonstration
 * 
 * DEMONSTRATES COMPLETE INTEGRATION:
 * - Crisis detection with <200ms response
 * - Privacy compliance with consent management
 * - AES-256-GCM encryption for all data
 * - Real-time performance monitoring
 * - Error boundaries with crisis-safe fallbacks
 * - Secure state management with Zustand
 * - Accessibility with WCAG AA compliance
 * - Smooth therapeutic user experience
 * 
 * This component showcases how all Week 2 systems work together
 * to create a production-ready, safety-first assessment experience.
 */


import { logSecurity, logPerformance, logError, LogCategory } from '@/core/services/logging';
import { generateTimestampedId } from '@/core/utils/id';
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Switch,
} from 'react-native';
import { colorSystem, spacing, typography, borderRadius } from '@/core/theme';

// Import all integrated components
import EnhancedAssessmentFlow from './EnhancedAssessmentFlow';
import CrisisErrorBoundary from '@/features/crisis/components/CrisisErrorBoundary';
import { useAssessmentPerformance } from '@/features/assessment/hooks/useAssessmentPerformance';
import { useAssessmentStore } from '../stores/assessmentStore';

// Types for demonstration
import type { 
  AssessmentType,
  PHQ9Result,
  GAD7Result
} from '@/features/assessment/types';

interface DataProtectionConsentStatus {
  dataProcessingConsent: boolean;
  clinicalDataConsent: boolean;
  consentTimestamp: number;
  consentVersion: string;
}

interface DemoSettings {
  assessmentType: AssessmentType;
  theme: 'morning' | 'midday' | 'evening' | 'neutral';
  context: 'standalone' | 'onboarding' | 'checkin';
  showIntroduction: boolean;
  enablePerformanceMonitoring: boolean;
  simulateCrisis: boolean;
  simulateErrors: boolean;
}

const AssessmentIntegrationExample: React.FC = () => {
  // Demo state
  const [isRunning, setIsRunning] = useState(false);
  const [sessionId] = useState(() => generateTimestampedId('demo'));
  const [consentStatus, setConsentStatus] = useState<DataProtectionConsentStatus>({
    dataProcessingConsent: true,
    clinicalDataConsent: true,
    consentTimestamp: Date.now(),
    consentVersion: '1.0.0',
  });

  const [demoSettings, setDemoSettings] = useState<DemoSettings>({
    assessmentType: 'phq9',
    theme: 'neutral',
    context: 'standalone',
    showIntroduction: true,
    enablePerformanceMonitoring: true,
    simulateCrisis: false,
    simulateErrors: false,
  });

  const [results, setResults] = useState<(PHQ9Result | GAD7Result)[]>([]);

  // Hooks integration
  const performance = useAssessmentPerformance();
  const { 
    completedAssessments, 
    error: storeError,
    isLoading,
    clearHistory 
  } = useAssessmentStore();

  // Demo simulation effects
  useEffect(() => {
    if (demoSettings.simulateCrisis && isRunning) {
      // Simulate crisis detection for demonstration
      setTimeout(() => {
        performance.recordCrisisDetection(150); // Good performance
        console.log('🚨 Demo: Crisis detection simulated');
      }, 3000);
    }
  }, [demoSettings.simulateCrisis, isRunning, performance]);

  useEffect(() => {
    if (demoSettings.simulateErrors && isRunning) {
      // Simulate performance issues for demonstration
      setTimeout(() => {
        performance.recordCrisisDetection(250); // Poor performance
        logSecurity('⚠️ Demo: Performance issue simulated', 'low');
      }, 5000);
    }
  }, [demoSettings.simulateErrors, isRunning, performance]);

  // Handle assessment completion
  const handleAssessmentComplete = useCallback((result: PHQ9Result | GAD7Result) => {
    console.log('✅ Assessment completed:', result);
    setResults(prev => [...prev, result]);
    setIsRunning(false);

    // Generate performance report
    const report = performance.getPerformanceReport();
    console.log('📊 Final Performance Report:', report);

    Alert.alert(
      '✅ Assessment Complete',
      `Score: ${result.totalScore}\nSeverity: ${result.severity}\n\nCheck console for detailed performance report.`,
      [{ text: 'OK' }]
    );
  }, [performance]);

  // Handle assessment cancellation
  const handleAssessmentCancel = useCallback(() => {
    console.log('❌ Assessment cancelled');
    setIsRunning(false);
    performance.resetMetrics();
  }, [performance]);

  // Start assessment demo
  const startAssessmentDemo = useCallback(() => {
    console.log('🚀 Starting assessment integration demo');
    setIsRunning(true);
    performance.resetMetrics();
    
    // Start overall performance measurement
    const measurementId = performance.startMeasurement('full_assessment_flow');
    
    // End measurement when assessment completes (simulated)
    setTimeout(() => {
      performance.endMeasurement(measurementId);
    }, 30000); // 30 second demo timeout
  }, [performance]);

  // Toggle consent
  const toggleConsent = useCallback((type: 'dataProcessing' | 'clinicalData') => {
    setConsentStatus(prev => ({
      ...prev,
      [`${type}Consent`]: !prev[`${type}Consent` as keyof DataProtectionConsentStatus],
      consentTimestamp: Date.now(),
    }));
  }, []);

  // Update demo settings
  const updateDemoSetting = useCallback((key: keyof DemoSettings, value: any) => {
    setDemoSettings(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Performance status indicator
  const performanceStatus = useMemo(() => {
    if (performance.alertLevel === 'critical') return { color: colorSystem.status.critical, label: '🚨 Critical' };
    if (performance.alertLevel === 'warning') return { color: colorSystem.status.warning, label: '⚠️ Warning' };
    if (performance.alertLevel === 'info') return { color: colorSystem.status.info, label: 'ℹ️ Info' };
    return { color: colorSystem.status.success, label: '✅ Optimal' };
  }, [performance.alertLevel]);

  return (
    <CrisisErrorBoundary
      sessionId={sessionId}
      showDetailedError={true}
    >
      <ScrollView 
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>
            Assessment Integration Demo
          </Text>
          <Text style={styles.subtitle}>
            Comprehensive crisis, compliance, and security integration
          </Text>
        </View>

        {/* Performance Dashboard */}
        {demoSettings.enablePerformanceMonitoring && (
          <View style={styles.performanceSection}>
            <Text style={styles.sectionTitle}>🔧 Performance Dashboard</Text>
            <View style={styles.performanceGrid}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Status</Text>
                <Text style={[styles.performanceValue, { color: performanceStatus.color }]}>
                  {performanceStatus.label}
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Crisis Detection</Text>
                <Text style={[
                  styles.performanceValue,
                  { color: performance.metrics.crisisDetectionTime <= 200 ? colorSystem.status.success : colorSystem.status.critical }
                ]}>
                  {performance.metrics.crisisDetectionTime.toFixed(0)}ms
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Encryption</Text>
                <Text style={[
                  styles.performanceValue,
                  { color: performance.metrics.encryptionTime <= 50 ? colorSystem.status.success : colorSystem.status.warning }
                ]}>
                  {performance.metrics.encryptionTime.toFixed(0)}ms
                </Text>
              </View>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Memory</Text>
                <Text style={[
                  styles.performanceValue,
                  { color: performance.metrics.memoryUsage <= 150 ? colorSystem.status.success : colorSystem.status.warning }
                ]}>
                  {performance.metrics.memoryUsage.toFixed(0)}MB
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Privacy Compliance Status */}
        <View style={styles.complianceSection}>
          <Text style={styles.sectionTitle}>🛡️ Privacy Compliance</Text>
          <View style={styles.complianceGrid}>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Data Processing</Text>
              <Switch
                value={consentStatus.dataProcessingConsent}
                onValueChange={() => toggleConsent('dataProcessing')}
                trackColor={{ 
                  false: colorSystem.gray[300], 
                  true: colorSystem.status.success 
                }}
                thumbColor={colorSystem.base.white}
              />
            </View>
            <View style={styles.complianceItem}>
              <Text style={styles.complianceLabel}>Clinical Data</Text>
              <Switch
                value={consentStatus.clinicalDataConsent}
                onValueChange={() => toggleConsent('clinicalData')}
                trackColor={{ 
                  false: colorSystem.gray[300], 
                  true: colorSystem.status.success 
                }}
                thumbColor={colorSystem.base.white}
              />
            </View>
          </View>
          <Text style={styles.complianceNote}>
            Consent Version: {consentStatus.consentVersion} | 
            Updated: {new Date(consentStatus.consentTimestamp).toLocaleTimeString()}
          </Text>
        </View>

        {/* Demo Settings */}
        <View style={styles.settingsSection}>
          <Text style={styles.sectionTitle}>⚙️ Demo Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Assessment Type</Text>
            <View style={styles.segmentedControl}>
              {(['phq9', 'gad7'] as AssessmentType[]).map(type => (
                <Pressable
                  key={type}
                  style={[
                    styles.segmentedButton,
                    demoSettings.assessmentType === type && styles.segmentedButtonActive
                  ]}
                  onPress={() => updateDemoSetting('assessmentType', type)}
                >
                  <Text style={[
                    styles.segmentedButtonText,
                    demoSettings.assessmentType === type && styles.segmentedButtonTextActive
                  ]}>
                    {type.toUpperCase()}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Theme</Text>
            <View style={styles.segmentedControl}>
              {(['neutral', 'morning', 'midday', 'evening'] as const).map(theme => (
                <Pressable
                  key={theme}
                  style={[
                    styles.segmentedButton,
                    demoSettings.theme === theme && styles.segmentedButtonActive
                  ]}
                  onPress={() => updateDemoSetting('theme', theme)}
                >
                  <Text style={[
                    styles.segmentedButtonText,
                    demoSettings.theme === theme && styles.segmentedButtonTextActive
                  ]}>
                    {theme}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Simulate Crisis</Text>
            <Switch
              value={demoSettings.simulateCrisis}
              onValueChange={(value) => updateDemoSetting('simulateCrisis', value)}
              trackColor={{ 
                false: colorSystem.gray[300], 
                true: colorSystem.status.critical 
              }}
              thumbColor={colorSystem.base.white}
            />
          </View>

          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Simulate Errors</Text>
            <Switch
              value={demoSettings.simulateErrors}
              onValueChange={(value) => updateDemoSetting('simulateErrors', value)}
              trackColor={{ 
                false: colorSystem.gray[300], 
                true: colorSystem.status.warning 
              }}
              thumbColor={colorSystem.base.white}
            />
          </View>
        </View>

        {/* Assessment Controls */}
        <View style={styles.controlsSection}>
          <Text style={styles.sectionTitle}>🎮 Assessment Controls</Text>
          
          {!isRunning ? (
            <Pressable
              style={[
                styles.primaryButton,
                (!consentStatus.dataProcessingConsent || !consentStatus.clinicalDataConsent) && styles.primaryButtonDisabled
              ]}
              onPress={startAssessmentDemo}
              disabled={!consentStatus.dataProcessingConsent || !consentStatus.clinicalDataConsent}
            >
              <Text style={styles.primaryButtonText}>
                🚀 Start Assessment Demo
              </Text>
            </Pressable>
          ) : (
            <Pressable
              style={styles.secondaryButton}
              onPress={handleAssessmentCancel}
            >
              <Text style={styles.secondaryButtonText}>
                ❌ Cancel Assessment
              </Text>
            </Pressable>
          )}

          {completedAssessments.length > 0 && (
            <Pressable
              style={styles.tertiaryButton}
              onPress={clearHistory}
            >
              <Text style={styles.tertiaryButtonText}>
                🗑️ Clear History ({completedAssessments.length})
              </Text>
            </Pressable>
          )}
        </View>

        {/* Recent Results */}
        {results.length > 0 && (
          <View style={styles.resultsSection}>
            <Text style={styles.sectionTitle}>📊 Recent Results</Text>
            {results.slice(-3).map((result, index) => (
              <View key={index} style={styles.resultItem}>
                <Text style={styles.resultScore}>
                  Score: {result.totalScore}/{result.totalScore <= 27 ? '27' : '21'}
                </Text>
                <Text style={styles.resultSeverity}>
                  Severity: {result.severity}
                </Text>
                <Text style={styles.resultDate}>
                  {new Date(result.completedAt).toLocaleString()}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* System Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>📡 System Status</Text>
          <View style={styles.statusGrid}>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Store</Text>
              <Text style={[
                styles.statusValue,
                { color: storeError ? colorSystem.status.critical : colorSystem.status.success }
              ]}>
                {storeError ? '❌ Error' : '✅ Ready'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Loading</Text>
              <Text style={[
                styles.statusValue,
                { color: isLoading ? colorSystem.status.warning : colorSystem.status.success }
              ]}>
                {isLoading ? '⏳ Loading' : '✅ Ready'}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Sessions</Text>
              <Text style={styles.statusValue}>
                {completedAssessments.length}
              </Text>
            </View>
            <View style={styles.statusItem}>
              <Text style={styles.statusLabel}>Performance</Text>
              <Text style={[
                styles.statusValue,
                { color: performance.isOptimal ? colorSystem.status.success : colorSystem.status.warning }
              ]}>
                {performance.isOptimal ? '⚡ Optimal' : '⚠️ Degraded'}
              </Text>
            </View>
          </View>
        </View>

        {/* Assessment Flow (when running) */}
        {isRunning && (
          <View style={styles.assessmentSection}>
            <EnhancedAssessmentFlow
              assessmentType={demoSettings.assessmentType}
              onComplete={handleAssessmentComplete}
              onCancel={handleAssessmentCancel}
              theme={demoSettings.theme}
              context={demoSettings.context}
              showIntroduction={demoSettings.showIntroduction}
              consentStatus={consentStatus}
              sessionId={sessionId}
            />
          </View>
        )}
      </ScrollView>
    </CrisisErrorBoundary>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
  },
  scrollContent: {
    padding: spacing[24],
    paddingBottom: spacing[32],
  },
  header: {
    marginBottom: spacing[32],
    alignItems: 'center',
  },
  title: {
    fontSize: typography.headline1.size,
    fontWeight: typography.headline1.weight,
    color: colorSystem.accessibility.text.primary,
    textAlign: 'center',
    marginBottom: spacing[8],
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.accessibility.text.secondary,
    textAlign: 'center',
    lineHeight: typography.bodyLarge.size * 1.5,
  },
  sectionTitle: {
    fontSize: typography.headline3.size,
    fontWeight: typography.headline3.weight,
    color: colorSystem.accessibility.text.primary,
    marginBottom: spacing[16],
  },
  performanceSection: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing[16],
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
  },
  performanceGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  performanceItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
  },
  performanceLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing[4],
  },
  performanceValue: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
  },
  complianceSection: {
    backgroundColor: colorSystem.status.infoBackground,
    padding: spacing[16],
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    borderLeftWidth: 4,
    borderLeftColor: colorSystem.status.info,
  },
  complianceGrid: {
    flexDirection: 'row',
    gap: spacing[24],
    marginBottom: spacing[8],
  },
  complianceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[8],
  },
  complianceLabel: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.primary,
  },
  complianceNote: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
  },
  settingsSection: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing[16],
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
    gap: spacing[16],
  },
  settingRow: {
    gap: spacing[8],
  },
  settingLabel: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.medium,
    padding: spacing[4],
  },
  segmentedButton: {
    flex: 1,
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[4],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  segmentedButtonActive: {
    backgroundColor: colorSystem.base.white,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: borderRadius.xs,
    elevation: 2,
  },
  segmentedButtonText: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
    textTransform: 'capitalize',
  },
  segmentedButtonTextActive: {
    color: colorSystem.accessibility.text.primary,
    fontWeight: typography.fontWeight.semibold,
  },
  controlsSection: {
    marginBottom: spacing[24],
    gap: spacing[16],
  },
  primaryButton: {
    backgroundColor: colorSystem.base.midnightBlue,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: spacing[4] },
    shadowOpacity: 0.2,
    shadowRadius: borderRadius.small,
    elevation: 4,
  },
  primaryButtonDisabled: {
    backgroundColor: colorSystem.gray[400],
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  secondaryButton: {
    backgroundColor: colorSystem.status.critical,
    paddingVertical: spacing[16],
    paddingHorizontal: spacing[24],
    borderRadius: borderRadius.large,
    alignItems: 'center',
  },
  secondaryButtonText: {
    fontSize: typography.bodyLarge.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.base.white,
  },
  tertiaryButton: {
    backgroundColor: colorSystem.gray[200],
    paddingVertical: spacing[8],
    paddingHorizontal: spacing[16],
    borderRadius: borderRadius.medium,
    alignItems: 'center',
  },
  tertiaryButtonText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
  },
  resultsSection: {
    marginBottom: spacing[24],
  },
  resultItem: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing[16],
    borderRadius: borderRadius.medium,
    marginBottom: spacing[8],
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultScore: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
    color: colorSystem.accessibility.text.primary,
  },
  resultSeverity: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.accessibility.text.secondary,
    textTransform: 'capitalize',
  },
  resultDate: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
  },
  statusSection: {
    backgroundColor: colorSystem.gray[50],
    padding: spacing[16],
    borderRadius: borderRadius.large,
    marginBottom: spacing[24],
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[8],
  },
  statusItem: {
    flex: 1,
    minWidth: '45%',
    alignItems: 'center',
    padding: spacing[8],
    backgroundColor: colorSystem.base.white,
    borderRadius: borderRadius.medium,
  },
  statusLabel: {
    fontSize: typography.caption.size,
    color: colorSystem.accessibility.text.secondary,
    marginBottom: spacing[4],
  },
  statusValue: {
    fontSize: typography.bodyRegular.size,
    fontWeight: typography.fontWeight.semibold,
  },
  assessmentSection: {
    flex: 1,
    marginTop: spacing[24],
    borderTopWidth: spacing[4],
    borderTopColor: colorSystem.base.midnightBlue,
    paddingTop: spacing[24],
  },
});

export default AssessmentIntegrationExample;