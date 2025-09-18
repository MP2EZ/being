/**
 * Widget Integration Example Component
 * Demonstrates comprehensive widget bridge usage with clinical-grade safety
 * Shows best practices for integrating widgets with the Being. MBCT app
 */

import React, { useEffect, useCallback } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { useSimpleWidgetIntegration } from '../hooks/useWidgetIntegration';
import { widgetStoreIntegration } from '../store/widgetIntegration';
import { WidgetData, WidgetBridgeError } from '../types/widget';

interface WidgetExampleProps {
  // Optional props for configuration
  enableAutoUpdates?: boolean;
  showDebugInfo?: boolean;
}

/**
 * Example component showing widget integration patterns
 */
export const WidgetExample: React.FC<WidgetExampleProps> = ({
  enableAutoUpdates = true,
  showDebugInfo = false
}) => {
  
  // Use the widget integration hook
  const {
    widgetData,
    isUpdating,
    error,
    lastUpdateTime,
    updateWidgetData,
    handleDeepLink,
    clearError
  } = useSimpleWidgetIntegration();

  /**
   * Handle errors with clinical-appropriate messaging
   */
  const handleWidgetError = useCallback((widgetError: WidgetBridgeError | null) => {
    if (!widgetError) return;

    // Log technical details for debugging
    console.error('Widget Error Details:', {
      message: widgetError.message,
      code: widgetError.code,
      context: widgetError.context
    });

    // Show user-friendly message based on error type
    let userMessage = 'Widget update temporarily unavailable.';
    
    switch (widgetError.code) {
      case 'PRIVACY_VIOLATION':
        userMessage = 'Data privacy check failed. Your information remains secure.';
        break;
      case 'NATIVE_MODULE_NOT_AVAILABLE':
        userMessage = 'Widget functionality is not available on this device.';
        break;
      case 'DEEP_LINK_INVALID':
        userMessage = 'Widget action could not be completed. Please try again.';
        break;
      case 'CRISIS_NAVIGATION_FAILED':
        userMessage = 'Emergency access is temporarily unavailable. Please contact crisis support directly.';
        break;
      default:
        userMessage = 'Widget temporarily unavailable. App functionality remains normal.';
    }

    Alert.alert(
      'Widget Status',
      userMessage,
      [
        { text: 'Dismiss', onPress: clearError },
        { text: 'Retry', onPress: updateWidgetData }
      ]
    );
  }, [clearError, updateWidgetData]);

  /**
   * Example deep link handling
   */
  const demonstrateDeepLink = useCallback(async () => {
    const exampleUrls = [
      'being://checkin/morning?resume=false',
      'being://checkin/evening?resume=true',
      'being://crisis'
    ];

    for (const url of exampleUrls) {
      console.log(`Testing deep link: ${url}`);
      await handleDeepLink(url);
    }
  }, [handleDeepLink]);

  /**
   * Monitor error state
   */
  useEffect(() => {
    if (error) {
      handleWidgetError(error);
    }
  }, [error, handleWidgetError]);

  /**
   * Set up widget integration monitoring
   */
  useEffect(() => {
    // Subscribe to widget events for demonstration
    const unsubscribeEvents = widgetStoreIntegration.subscribeToUserEvents((event) => {
      console.log('Widget Event Received:', event);
      
      if (showDebugInfo) {
        Alert.alert(
          'Widget Event',
          `Type: ${event.type}\nTime: ${event.timestamp}`,
          [{ text: 'OK' }]
        );
      }
    });

    return () => {
      unsubscribeEvents();
    };
  }, [showDebugInfo]);

  /**
   * Render widget status information
   */
  const renderWidgetStatus = () => {
    if (!widgetData) {
      return (
        <View style={styles.statusContainer}>
          <Text style={styles.statusText}>Widget data loading...</Text>
        </View>
      );
    }

    return (
      <View style={styles.statusContainer}>
        <Text style={styles.titleText}>Today's Progress</Text>
        
        <View style={styles.progressContainer}>
          <ProgressItem 
            type="Morning" 
            status={widgetData.todayProgress.morning} 
          />
          <ProgressItem 
            type="Midday" 
            status={widgetData.todayProgress.midday} 
          />
          <ProgressItem 
            type="Evening" 
            status={widgetData.todayProgress.evening} 
          />
        </View>

        <Text style={styles.completionText}>
          Overall Completion: {widgetData.todayProgress.completionPercentage}%
        </Text>

        {widgetData.hasActiveCrisis && (
          <View style={styles.crisisContainer}>
            <Text style={styles.crisisText}>⚠️ Crisis support available</Text>
          </View>
        )}

        {showDebugInfo && (
          <View style={styles.debugContainer}>
            <Text style={styles.debugText}>
              Last Update: {lastUpdateTime}
            </Text>
            <Text style={styles.debugText}>
              App Version: {widgetData.appVersion}
            </Text>
            <Text style={styles.debugText}>
              Hash: {widgetData.encryptionHash}
            </Text>
          </View>
        )}
      </View>
    );
  };

  /**
   * Render update controls
   */
  const renderControls = () => (
    <View style={styles.controlsContainer}>
      <Text 
        style={[styles.button, isUpdating && styles.buttonDisabled]}
        onPress={isUpdating ? undefined : updateWidgetData}
      >
        {isUpdating ? 'Updating...' : 'Update Widget'}
      </Text>
      
      {showDebugInfo && (
        <Text 
          style={styles.button}
          onPress={demonstrateDeepLink}
        >
          Test Deep Links
        </Text>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.headerText}>Widget Integration Status</Text>
      
      {renderWidgetStatus()}
      
      {renderControls()}
    </View>
  );
};

/**
 * Individual progress item component
 */
interface ProgressItemProps {
  type: string;
  status: {
    status: string;
    progressPercentage: number;
    canResume: boolean;
    estimatedTimeMinutes: number;
  };
}

const ProgressItem: React.FC<ProgressItemProps> = ({ type, status }) => {
  const getStatusColor = (statusType: string) => {
    switch (statusType) {
      case 'completed': return '#4CAF50';
      case 'in_progress': return '#FF9800';
      case 'skipped': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  const getStatusText = () => {
    switch (status.status) {
      case 'completed': return 'Completed';
      case 'in_progress': return `${status.progressPercentage}% (${status.estimatedTimeMinutes}min)`;
      case 'skipped': return 'Skipped';
      default: return `Ready (${status.estimatedTimeMinutes}min)`;
    }
  };

  return (
    <View style={styles.progressItem}>
      <View style={[styles.statusIndicator, { backgroundColor: getStatusColor(status.status) }]} />
      <View style={styles.progressText}>
        <Text style={styles.progressTitle}>{type}</Text>
        <Text style={styles.progressStatus}>{getStatusText()}</Text>
      </View>
    </View>
  );
};

/**
 * Styles for the example component
 */
const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#f5f5f5'
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center'
  },
  statusContainer: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    marginBottom: 16
  },
  titleText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12
  },
  progressContainer: {
    marginBottom: 12
  },
  progressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12
  },
  progressText: {
    flex: 1
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '500'
  },
  progressStatus: {
    fontSize: 14,
    color: '#666'
  },
  completionText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8
  },
  crisisContainer: {
    backgroundColor: '#fff3cd',
    padding: 12,
    borderRadius: 6,
    marginTop: 12
  },
  crisisText: {
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center'
  },
  debugContainer: {
    marginTop: 12,
    padding: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 4
  },
  debugText: {
    fontSize: 12,
    color: '#6c757d',
    marginBottom: 2
  },
  controlsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  button: {
    backgroundColor: '#007AFF',
    color: 'white',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    textAlign: 'center',
    fontWeight: '600'
  },
  buttonDisabled: {
    backgroundColor: '#ccc'
  },
  statusText: {
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic'
  }
});

export default WidgetExample;