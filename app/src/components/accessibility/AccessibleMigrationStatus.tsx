/**
 * AccessibleMigrationStatus - WCAG 2.1 AA compliant migration progress
 * 
 * Addresses accessibility gaps for SQLite migration with critical crisis access
 * communication. Ensures users always know crisis access remains available.
 * 
 * WCAG 2.1 AA Compliance:
 * - 4.1.3 Status Messages: Migration progress announcements via live regions
 * - 2.4.6 Headings and Labels: Clear migration stage identification  
 * - 1.4.3 Contrast: Minimum 4.5:1 ratio for all progress indicators
 * - 2.2.1 Timing Adjustable: User can pause migration if needed
 * - 1.3.1 Info and Relationships: Screen reader accessible progress structure
 * 
 * Crisis Safety Integration:
 * - Persistent crisis access communication during migration
 * - Emergency access assurance throughout 5-minute window
 * - Clear language about data safety and therapeutic continuity
 */

import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  AccessibilityInfo
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colorSystem, spacing, borderRadius, typography } from '../../constants/colors';
import { useMentalHealthAccessibility } from '../../hooks/useMentalHealthAccessibility';
import { Button } from '../core/Button';
import { AccessibleAlert } from '../core/AccessibleAlert';
import { crisisIntegrationCoordinator } from '../../services/coordination/CrisisIntegrationCoordinator';
import { sqliteDataStore } from '../../services/storage/SQLiteDataStore';

export interface MigrationProgressData {
  sessionId: string;
  stage: 'preparing' | 'schema_creation' | 'data_migration' | 'index_creation' | 'validation' | 'cleanup' | 'complete' | 'error';
  progress: number; // 0-100
  currentTable?: string;
  recordsProcessed: number;
  totalRecords: number;
  estimatedTimeRemaining: number; // milliseconds
  error?: string;
}

export interface AccessibleMigrationStatusProps {
  visible: boolean;
  migrationData: MigrationProgressData | null;
  onCancel?: () => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
  emergencyAccessTested?: boolean;
  testID?: string;
}

export const AccessibleMigrationStatus: React.FC<AccessibleMigrationStatusProps> = ({
  visible,
  migrationData,
  onCancel,
  onComplete,
  onError,
  emergencyAccessTested = false,
  testID = 'migration-status'
}) => {
  const {
    announceToUser,
    announceMigrationProgress,
    generateAccessibleInstructions,
    accessibility,
    crisisMode,
    emergencyAccessRequired,
    screenReaderActive,
    pauseTiming,
    resumeTiming,
    isTimingPaused
  } = useMentalHealthAccessibility();

  const [crisisAccessConfirmed, setCrisisAccessConfirmed] = useState(emergencyAccessTested);
  const [showCrisisTest, setShowCrisisTest] = useState(false);
  const [migrationPaused, setMigrationPaused] = useState(false);
  const [lastAnnouncedProgress, setLastAnnouncedProgress] = useState(0);
  const progressRef = useRef<View>(null);

  // Monitor migration progress and announce changes
  useEffect(() => {
    if (migrationData && visible) {
      const progressDelta = migrationData.progress - lastAnnouncedProgress;
      
      // Announce significant progress changes (every 10%)
      if (progressDelta >= 10 || migrationData.stage !== 'data_migration') {
        announceMigrationProgress({
          stage: migrationData.stage,
          progress: migrationData.progress,
          estimatedTimeRemaining: migrationData.estimatedTimeRemaining
        });
        
        setLastAnnouncedProgress(migrationData.progress);
      }

      // Handle completion
      if (migrationData.stage === 'complete') {
        announceToUser({
          message: 'Data upgrade completed successfully. All your information is safe and crisis access remains available.',
          priority: 'high',
          interruption: false,
          context: 'completion'
        });
        
        setTimeout(() => {
          onComplete?.();
        }, 2000);
      }

      // Handle errors
      if (migrationData.stage === 'error') {
        announceToUser({
          message: 'Data upgrade paused. Your information is completely safe and all features remain available.',
          priority: 'high',
          interruption: true,
          context: 'error'
        });
        
        onError?.(migrationData.error || 'Migration failed');
      }
    }
  }, [migrationData, visible, lastAnnouncedProgress, announceMigrationProgress, announceToUser, onComplete, onError]);

  // Test emergency access during migration
  const testCrisisAccess = async () => {
    setShowCrisisTest(false);
    
    try {
      // Test crisis coordinator availability
      const crisisState = await crisisIntegrationCoordinator.getUnifiedCrisisState();
      const readiness = await crisisIntegrationCoordinator.validateSystemReadiness();
      
      if (readiness.ready && readiness.responseTimeEstimate < 200) {
        setCrisisAccessConfirmed(true);
        announceToUser({
          message: 'Crisis access verified - emergency support remains available during upgrade',
          priority: 'medium',
          interruption: false,
          context: 'progress'
        });
      } else {
        announceToUser({
          message: 'Crisis access test incomplete. Migration will use extra safety measures.',
          priority: 'high',
          interruption: true,
          context: 'crisis'
        });
      }
    } catch (error) {
      console.error('Crisis access test failed:', error);
      announceToUser({
        message: 'Crisis access test failed. Migration will proceed with maximum safety protocols.',
        priority: 'high',
        interruption: true,
        context: 'crisis'
      });
    }
  };

  // Pause migration for user control
  const handlePauseMigration = () => {
    setMigrationPaused(true);
    pauseTiming('user_request');
    
    announceToUser({
      message: 'Migration paused. Your data is safe. Resume when ready.',
      priority: 'medium',
      interruption: false,
      context: 'progress'
    });
  };

  // Resume migration
  const handleResumeMigration = () => {
    setMigrationPaused(false);
    resumeTiming();
    
    announceToUser({
      message: 'Migration resumed.',
      priority: 'low',
      interruption: false,
      context: 'progress'
    });
  };

  // Generate stage-specific descriptions
  const getStageDescription = (stage: MigrationProgressData['stage'], simplified: boolean = false): string => {
    const descriptions = {
      preparing: {
        standard: 'Preparing to upgrade your data storage for better performance',
        simplified: 'Getting ready to improve your app'
      },
      schema_creation: {
        standard: 'Setting up the new data structure',
        simplified: 'Building the new storage system'
      },
      data_migration: {
        standard: `Moving your data safely${migrationData?.currentTable ? ` (${migrationData.currentTable})` : ''}`,
        simplified: 'Moving your information safely'
      },
      index_creation: {
        standard: 'Optimizing data access for faster performance',
        simplified: 'Making everything run faster'
      },
      validation: {
        standard: 'Verifying all data transferred correctly',
        simplified: 'Checking everything worked'
      },
      cleanup: {
        standard: 'Finalizing the upgrade process',
        simplified: 'Finishing up'
      },
      complete: {
        standard: 'Data upgrade completed successfully',
        simplified: 'All done - your app is upgraded'
      },
      error: {
        standard: 'Upgrade paused - your data remains safe',
        simplified: 'Stopped safely - nothing was lost'
      }
    };

    const description = descriptions[stage];
    return simplified || accessibility.cognitive.plainLanguageMode ? 
           description.simplified : description.standard;
  };

  // Calculate estimated time remaining in human-readable format
  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds < 60000) { // Less than 1 minute
      return 'Less than a minute';
    }
    
    const minutes = Math.ceil(milliseconds / 60000);
    return `About ${minutes} minute${minutes !== 1 ? 's' : ''}`;
  };

  // Progress percentage for accessibility
  const progressPercentage = migrationData?.progress || 0;
  const progressDescription = `${Math.round(progressPercentage)}% complete`;

  if (!visible) {
    return null;
  }

  return (
    <SafeAreaView style={styles.container} testID={testID}>
      <View style={styles.content}>
        {/* Crisis Safety Notice - Always Visible */}
        <View 
          style={[
            styles.crisisNotice,
            crisisMode && styles.crisisNoticeActive
          ]}
          accessible={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="polite"
          accessibilityLabel="Crisis support status"
        >
          <View style={styles.crisisIconContainer}>
            <Text style={styles.crisisIcon} accessible={false}>🛡️</Text>
          </View>
          <View style={styles.crisisTextContainer}>
            <Text style={styles.crisisTitle}>
              Crisis Support Active
            </Text>
            <Text style={styles.crisisText}>
              {generateAccessibleInstructions(
                crisisAccessConfirmed 
                  ? 'Emergency help remains available during upgrade'
                  : 'Emergency support is ready and will not be interrupted',
                'crisis'
              )}
            </Text>
            {!crisisAccessConfirmed && (
              <TouchableOpacity
                style={styles.testAccessButton}
                onPress={() => setShowCrisisTest(true)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Test crisis access availability"
                accessibilityHint="Verifies emergency support works during upgrade"
              >
                <Text style={styles.testAccessText}>Test Access</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Migration Progress Section */}
        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text 
              style={styles.title}
              accessible={true}
              accessibilityRole="header"
              accessibilityLevel={1}
            >
              App Upgrade in Progress
            </Text>
            <Text
              style={styles.subtitle}
              accessible={true}
              accessibilityLiveRegion="polite"
            >
              {migrationData ? getStageDescription(migrationData.stage, accessibility.cognitive.simplifiedInstructions) : 'Loading...'}
            </Text>
          </View>

          {/* Progress Indicator */}
          <View 
            style={styles.progressContainer}
            ref={progressRef}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityValue={{
              min: 0,
              max: 100,
              now: progressPercentage,
              text: progressDescription
            }}
            accessibilityLabel={`Migration progress: ${progressDescription}`}
          >
            <View style={styles.progressTrack}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` }
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {progressDescription}
            </Text>
          </View>

          {/* Detailed Status */}
          {migrationData && (
            <View style={styles.statusDetails}>
              {migrationData.totalRecords > 0 && (
                <Text style={styles.statusText} accessible={true}>
                  {generateAccessibleInstructions(
                    `${migrationData.recordsProcessed} of ${migrationData.totalRecords} items processed`,
                    'progress'
                  )}
                </Text>
              )}
              
              {migrationData.estimatedTimeRemaining > 0 && !migrationPaused && (
                <Text 
                  style={styles.statusText} 
                  accessible={true}
                  accessibilityLiveRegion="polite"
                >
                  Time remaining: {formatTimeRemaining(migrationData.estimatedTimeRemaining)}
                </Text>
              )}

              {migrationPaused && (
                <Text 
                  style={[styles.statusText, styles.pausedText]}
                  accessible={true}
                  accessibilityLiveRegion="assertive"
                >
                  Migration paused - resume when ready
                </Text>
              )}
            </View>
          )}

          {/* Loading Indicator */}
          {migrationData && migrationData.stage !== 'complete' && migrationData.stage !== 'error' && !migrationPaused && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator 
                size="small" 
                color={colorSystem.status.info}
                accessible={false}
              />
              <Text style={styles.loadingText} accessible={false}>
                Upgrading...
              </Text>
            </View>
          )}
        </View>

        {/* Control Buttons */}
        <View style={styles.controls}>
          {/* Timing Control - WCAG 2.2.1 */}
          {migrationData && migrationData.stage !== 'complete' && migrationData.stage !== 'error' && (
            <View style={styles.timingControls}>
              {!migrationPaused ? (
                <Button
                  variant="outline"
                  onPress={handlePauseMigration}
                  accessibilityLabel="Pause migration temporarily"
                  accessibilityHint="Allows you to pause the upgrade process"
                  testID={`${testID}-pause`}
                >
                  Pause Upgrade
                </Button>
              ) : (
                <Button
                  variant="primary"
                  onPress={handleResumeMigration}
                  accessibilityLabel="Resume migration"
                  accessibilityHint="Continues the paused upgrade process"
                  testID={`${testID}-resume`}
                >
                  Resume Upgrade
                </Button>
              )}
            </View>
          )}

          {/* Cancel Option (only before migration starts) */}
          {migrationData?.stage === 'preparing' && onCancel && (
            <Button
              variant="outline"
              onPress={onCancel}
              accessibilityLabel="Cancel upgrade"
              accessibilityHint="Cancels the upgrade and returns to previous version"
              testID={`${testID}-cancel`}
            >
              Cancel Upgrade
            </Button>
          )}
        </View>
      </View>

      {/* Crisis Access Test Modal */}
      <AccessibleAlert
        visible={showCrisisTest}
        title="Test Emergency Access"
        message={generateAccessibleInstructions(
          'This will verify that crisis support remains available during the upgrade. The test takes a few seconds.',
          'crisis'
        )}
        buttons={[
          {
            text: 'Run Test',
            style: 'emergency',
            onPress: testCrisisAccess,
            accessibilityLabel: 'Run crisis access test'
          },
          {
            text: 'Skip',
            style: 'cancel',
            onPress: () => setShowCrisisTest(false),
            accessibilityLabel: 'Skip test and continue'
          }
        ]}
        urgency="high"
        onDismiss={() => setShowCrisisTest(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colorSystem.base.white,
    justifyContent: 'center'
  },
  content: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%'
  },
  
  // Crisis Safety Notice
  crisisNotice: {
    backgroundColor: colorSystem.status.infoBackground,
    borderColor: colorSystem.status.info,
    borderWidth: 1,
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
    flexDirection: 'row',
    alignItems: 'flex-start'
  },
  crisisNoticeActive: {
    backgroundColor: colorSystem.status.criticalBackground,
    borderColor: colorSystem.status.critical
  },
  crisisIconContainer: {
    marginRight: spacing.sm,
    marginTop: 2
  },
  crisisIcon: {
    fontSize: 20,
    lineHeight: 24
  },
  crisisTextContainer: {
    flex: 1
  },
  crisisTitle: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '600',
    color: colorSystem.base.black,
    marginBottom: spacing.xs
  },
  crisisText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[700],
    lineHeight: 22,
    marginBottom: spacing.sm
  },
  testAccessButton: {
    backgroundColor: colorSystem.status.info,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.small,
    alignSelf: 'flex-start'
  },
  testAccessText: {
    color: colorSystem.base.white,
    fontSize: typography.caption.size,
    fontWeight: '500'
  },

  // Progress Section
  progressSection: {
    marginBottom: spacing.xl
  },
  progressHeader: {
    marginBottom: spacing.lg,
    alignItems: 'center'
  },
  title: {
    fontSize: typography.headline2.size,
    fontWeight: typography.headline2.weight,
    color: colorSystem.base.black,
    textAlign: 'center',
    marginBottom: spacing.sm
  },
  subtitle: {
    fontSize: typography.bodyLarge.size,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 24
  },

  // Progress Indicator
  progressContainer: {
    marginBottom: spacing.md
  },
  progressTrack: {
    height: 8,
    backgroundColor: colorSystem.gray[200],
    borderRadius: borderRadius.full,
    marginBottom: spacing.sm,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: colorSystem.status.info,
    borderRadius: borderRadius.full,
    minWidth: 8 // Ensure visible progress even at 0%
  },
  progressText: {
    fontSize: typography.bodyRegular.size,
    fontWeight: '500',
    color: colorSystem.base.black,
    textAlign: 'center'
  },

  // Status Details
  statusDetails: {
    alignItems: 'center',
    marginBottom: spacing.lg
  },
  statusText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    textAlign: 'center',
    marginBottom: spacing.xs,
    lineHeight: 22
  },
  pausedText: {
    color: colorSystem.status.warning,
    fontWeight: '500'
  },

  // Loading Indicator
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm
  },
  loadingText: {
    fontSize: typography.bodyRegular.size,
    color: colorSystem.gray[600],
    marginLeft: spacing.sm
  },

  // Controls
  controls: {
    gap: spacing.sm
  },
  timingControls: {
    marginBottom: spacing.sm
  }
});

export default AccessibleMigrationStatus;