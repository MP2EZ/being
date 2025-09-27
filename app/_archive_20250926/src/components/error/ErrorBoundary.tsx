/**
 * Enhanced Clinical-Grade Error Boundary System
 *
 * Comprehensive error handling with crisis safety protocols, security logging,
 * and fallback UI. Ensures therapeutic continuity even during technical failures.
 *
 * CRITICAL: This boundary must NEVER prevent crisis button access
 * ENHANCED: Integrated with SecurityFoundations for secure error handling
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, StyleSheet, Pressable, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCrisisStore } from '../../store/simpleCrisisStore';
import { SecurityFoundations, SecurityErrorType } from '../../security/core/SecurityFoundations';

// Crisis-safe emergency contact
const CRISIS_HOTLINE = '988';

/**
 * Error classification for therapeutic context
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';
export type ErrorContext = 'navigation' | 'assessment' | 'crisis' | 'data' | 'therapeutic' | 'auth' | 'payment';

export interface ErrorDetails {
  readonly severity: ErrorSeverity;
  readonly context: ErrorContext;
  readonly message: string;
  readonly timestamp: string;
  readonly userAction?: string;
  readonly sessionId?: string;
  readonly criticalPath: boolean; // Whether error occurred in crisis-critical flow
}

export interface ErrorBoundaryProps {
  readonly children: ReactNode;
  readonly context?: ErrorContext;
  readonly fallbackComponent?: ReactNode;
  readonly enableCrisisFallback?: boolean;
  readonly onError?: (error: Error, errorInfo: ErrorInfo, details: ErrorDetails) => void;
}

export interface ErrorBoundaryState {
  readonly hasError: boolean;
  readonly errorDetails: ErrorDetails | null;
  readonly retryCount: number;
  readonly showCrisisOptions: boolean;
}

/**
 * Enhanced Error Boundary with Clinical Safety Protocols
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  private retryTimeoutId: NodeJS.Timeout | null = null;
  private readonly maxRetries = 3;

  constructor(props: ErrorBoundaryProps) {
    super(props);

    this.state = {
      hasError: false,
      errorDetails: null,
      retryCount: 0,
      showCrisisOptions: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    // Return state update to show fallback UI
    return {
      hasError: true,
      errorDetails: null // Will be set in componentDidCatch
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const { context = 'navigation', onError } = this.props;

    // Determine error severity and criticality
    const severity = this.classifyErrorSeverity(error, context);
    const criticalPath = this.isCriticalPath(error, context);

    const errorDetails: ErrorDetails = {
      severity,
      context,
      message: error.message,
      timestamp: new Date().toISOString(),
      criticalPath,
      sessionId: this.generateSessionId()
    };

    // Update state with error details
    this.setState({
      errorDetails,
      showCrisisOptions: criticalPath || severity === 'critical'
    });

    // Log error for debugging (but not to external services in offline mode)
    this.logError(error, errorInfo, errorDetails);

    // Store error for crash analysis (async but don't wait)
    this.storeErrorLocally(errorDetails);

    // Notify parent component
    if (onError) {
      onError(error, errorInfo, errorDetails);
    }

    // Handle critical errors immediately
    if (criticalPath) {
      this.handleCriticalError(errorDetails);
    }
  }

  /**
   * Classify error severity based on context and error type
   */
  private classifyErrorSeverity(error: Error, context: ErrorContext): ErrorSeverity {
    // Crisis context errors are always critical
    if (context === 'crisis') {
      return 'critical';
    }

    // Assessment errors are high severity
    if (context === 'assessment' || context === 'therapeutic') {
      return 'high';
    }

    // Data persistence errors are high severity
    if (context === 'data' && error.message.includes('storage')) {
      return 'high';
    }

    // Network/auth errors in offline mode are medium
    if (context === 'auth' || context === 'payment') {
      return 'medium';
    }

    // Navigation and UI errors are typically low
    return 'low';
  }

  /**
   * Determine if error occurred in crisis-critical path
   */
  private isCriticalPath(error: Error, context: ErrorContext): boolean {
    const criticalContexts: ErrorContext[] = ['crisis', 'assessment'];
    const criticalKeywords = ['crisis', 'emergency', 'phq', 'gad', 'assessment'];

    return criticalContexts.includes(context) ||
           criticalKeywords.some(keyword =>
             error.message.toLowerCase().includes(keyword) ||
             error.stack?.toLowerCase().includes(keyword)
           );
  }

  /**
   * Handle critical errors with immediate safety protocols
   */
  private handleCriticalError(errorDetails: ErrorDetails): void {
    // Show immediate alert for crisis-related errors
    if (errorDetails.context === 'crisis') {
      Alert.alert(
        'Emergency System Alert',
        'Crisis support system encountered an error. Emergency hotline: 988',
        [
          {
            text: 'Call Crisis Hotline',
            onPress: () => this.callCrisisHotline(),
            style: 'default'
          },
          {
            text: 'Continue to Safety Options',
            onPress: () => this.setState({ showCrisisOptions: true }),
            style: 'default'
          }
        ],
        { cancelable: false }
      );
    }
  }

  /**
   * Call crisis hotline (988)
   */
  private callCrisisHotline(): void {
    // This would integrate with phone calling capability
    console.log('CRISIS HOTLINE: Calling 988');
    // Linking.openURL(`tel:${CRISIS_HOTLINE}`);
  }

  /**
   * Log error safely using SecurityFoundations
   */
  private async logError(error: Error, errorInfo: ErrorInfo, details: ErrorDetails): Promise<void> {
    try {
      // Map error context to security error type
      const securityErrorType = this.mapToSecurityErrorType(details.context, details.severity);

      // Use SecurityFoundations for secure error logging
      await SecurityFoundations.handleIncident(
        error,
        securityErrorType,
        `error_boundary_${details.context}`,
        {
          severity: details.severity,
          actionTaken: 'error_boundary_activated',
          metadata: {
            criticalPath: details.criticalPath,
            componentStack: errorInfo.componentStack?.substring(0, 500), // Limit stack trace size
            sessionId: details.sessionId
          }
        }
      );

      // Additional local storage for error analysis (sanitized)
      const sanitizedLogEntry = {
        timestamp: details.timestamp,
        severity: details.severity,
        context: details.context,
        sanitizedMessage: error.message.substring(0, 200), // Limit message length
        criticalPath: details.criticalPath,
        sessionId: details.sessionId
      };

      await AsyncStorage.setItem(
        `error_boundary_${details.timestamp}`,
        JSON.stringify(sanitizedLogEntry)
      );

    } catch (loggingError) {
      // Fallback to basic console logging if security logging fails
      console.error('SecurityFoundations logging failed, using fallback:', {
        originalError: error.name,
        loggingError: loggingError.message,
        context: details.context
      });

      // Basic AsyncStorage fallback
      try {
        await AsyncStorage.setItem(
          `error_fallback_${details.timestamp}`,
          JSON.stringify({
            timestamp: details.timestamp,
            context: details.context,
            error: 'Error logging system failure'
          })
        );
      } catch {
        // If all logging fails, at least log to console
        console.error('All error logging mechanisms failed for:', details.context);
      }
    }
  }

  /**
   * Map error context to security error type
   */
  private mapToSecurityErrorType(context: ErrorContext, severity: ErrorSeverity): SecurityErrorType {
    switch (context) {
      case 'crisis':
        return SecurityErrorType.CRITICAL;
      case 'assessment':
      case 'therapeutic':
        return SecurityErrorType.DATA_VALIDATION_ERROR;
      case 'data':
        return severity === 'critical' ? SecurityErrorType.DATA_CORRUPTION : SecurityErrorType.DATA_VALIDATION_ERROR;
      case 'auth':
        return SecurityErrorType.UNAUTHORIZED_ACCESS;
      case 'payment':
        return SecurityErrorType.DATA_VALIDATION_ERROR;
      default:
        return SecurityErrorType.TIMEOUT_ERROR;
    }
  }

  /**
   * Store error details locally for crash analysis
   */
  private async storeErrorLocally(details: ErrorDetails): Promise<void> {
    try {
      const existingErrors = await AsyncStorage.getItem('app_errors');
      const errors = existingErrors ? JSON.parse(existingErrors) : [];

      errors.push(details);

      // Keep only last 50 errors to manage storage
      const recentErrors = errors.slice(-50);

      await AsyncStorage.setItem('app_errors', JSON.stringify(recentErrors));
    } catch (error) {
      console.error('Failed to store error details:', error);
    }
  }

  /**
   * Generate session ID for error tracking
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Retry failed component with backoff
   */
  private handleRetry = (): void => {
    const { retryCount } = this.state;

    if (retryCount >= this.maxRetries) {
      return;
    }

    // Clear error state to retry rendering
    this.setState({
      hasError: false,
      errorDetails: null,
      retryCount: retryCount + 1,
      showCrisisOptions: false
    });

    // Reset retry count after successful render (with delay)
    this.retryTimeoutId = setTimeout(() => {
      this.setState({ retryCount: 0 });
    }, 10000);
  };

  /**
   * Navigate to crisis resources
   */
  private handleCrisisResources = (): void => {
    // This would navigate to crisis resources screen
    console.log('Navigating to crisis resources');

    // For now, show crisis options
    Alert.alert(
      'Crisis Resources Available',
      'Crisis Hotline: 988\nText HOME to 741741\nEmergency: 911',
      [
        { text: 'Call 988', onPress: this.callCrisisHotline },
        { text: 'Continue', style: 'cancel' }
      ]
    );
  };

  /**
   * Reset error boundary completely
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      errorDetails: null,
      retryCount: 0,
      showCrisisOptions: false
    });
  };

  componentWillUnmount(): void {
    if (this.retryTimeoutId) {
      clearTimeout(this.retryTimeoutId);
    }
  }

  render(): ReactNode {
    const { hasError, errorDetails, retryCount, showCrisisOptions } = this.state;
    const { children, fallbackComponent, enableCrisisFallback = true } = this.props;

    if (hasError && errorDetails) {
      // Use custom fallback if provided
      if (fallbackComponent) {
        return fallbackComponent;
      }

      // Crisis-specific fallback
      if (showCrisisOptions && enableCrisisFallback) {
        return (
          <View style={styles.crisisContainer}>
            <View style={styles.crisisHeader}>
              <Text style={styles.crisisTitle}>Emergency System Notice</Text>
              <Text style={styles.crisisSubtitle}>Technical issue detected</Text>
            </View>

            <View style={styles.crisisActions}>
              <Pressable
                style={[styles.crisisButton, styles.hotlineButton]}
                onPress={this.callCrisisHotline}
              >
                <Text style={styles.hotlineButtonText}>Crisis Hotline: 988</Text>
              </Pressable>

              <Pressable
                style={[styles.crisisButton, styles.resourcesButton]}
                onPress={this.handleCrisisResources}
              >
                <Text style={styles.resourcesButtonText}>Crisis Resources</Text>
              </Pressable>

              <Pressable
                style={[styles.crisisButton, styles.continueButton]}
                onPress={this.handleRetry}
              >
                <Text style={styles.continueButtonText}>Continue to App</Text>
              </Pressable>
            </View>

            <Text style={styles.crisisFooter}>
              If you are in immediate danger, call 911
            </Text>
          </View>
        );
      }

      // Standard error fallback
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.message}>
              {errorDetails.severity === 'critical'
                ? 'A critical error occurred. Your safety is our priority.'
                : 'We encountered a technical issue.'
              }
            </Text>

            <View style={styles.actions}>
              {retryCount < this.maxRetries && (
                <Pressable style={styles.retryButton} onPress={this.handleRetry}>
                  <Text style={styles.retryButtonText}>
                    Try Again ({this.maxRetries - retryCount} attempts left)
                  </Text>
                </Pressable>
              )}

              <Pressable style={styles.resetButton} onPress={this.handleReset}>
                <Text style={styles.resetButtonText}>Reset App</Text>
              </Pressable>

              {(errorDetails.severity === 'critical' || errorDetails.criticalPath) && (
                <Pressable
                  style={styles.crisisLinkButton}
                  onPress={this.handleCrisisResources}
                >
                  <Text style={styles.crisisLinkText}>Crisis Resources</Text>
                </Pressable>
              )}
            </View>

            <Text style={styles.errorDetails}>
              Error: {errorDetails.context} - {errorDetails.severity}
            </Text>
          </View>
        </View>
      );
    }

    return children;
  }
}

/**
 * Therapeutic-focused styles for error UI
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1B2951',
    textAlign: 'center',
    marginBottom: 12,
  },
  message: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  actions: {
    gap: 12,
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4A7C59',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resetButton: {
    backgroundColor: '#E5E5E5',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  resetButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  crisisLinkButton: {
    borderWidth: 1,
    borderColor: '#FF6B6B',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  crisisLinkText: {
    color: '#FF6B6B',
    fontSize: 16,
    fontWeight: '600',
  },
  errorDetails: {
    fontSize: 12,
    color: '#999999',
    textAlign: 'center',
    marginTop: 8,
  },

  // Crisis-specific styles
  crisisContainer: {
    flex: 1,
    backgroundColor: '#FFF5F5',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  crisisHeader: {
    alignItems: 'center',
    marginBottom: 32,
  },
  crisisTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#C53030',
    textAlign: 'center',
    marginBottom: 8,
  },
  crisisSubtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
  },
  crisisActions: {
    width: '100%',
    maxWidth: 300,
    gap: 16,
    marginBottom: 32,
  },
  crisisButton: {
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    minHeight: 56,
    justifyContent: 'center',
  },
  hotlineButton: {
    backgroundColor: '#C53030',
  },
  hotlineButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  resourcesButton: {
    backgroundColor: '#4A7C59',
  },
  resourcesButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: '#E5E5E5',
  },
  continueButtonText: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '500',
  },
  crisisFooter: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
    fontWeight: '600',
  },
});

/**
 * Specialized Error Boundaries for Different Contexts
 */

export const NavigationErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="navigation" enableCrisisFallback={false}>
    {children}
  </ErrorBoundary>
);

export const AssessmentErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="assessment" enableCrisisFallback={true}>
    {children}
  </ErrorBoundary>
);

export const CrisisErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="crisis" enableCrisisFallback={true}>
    {children}
  </ErrorBoundary>
);

export const TherapeuticErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="therapeutic" enableCrisisFallback={false}>
    {children}
  </ErrorBoundary>
);

export const DataErrorBoundary: React.FC<{ children: ReactNode }> = ({ children }) => (
  <ErrorBoundary context="data" enableCrisisFallback={false}>
    {children}
  </ErrorBoundary>
);