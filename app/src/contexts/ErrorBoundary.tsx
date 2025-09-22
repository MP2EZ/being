/**
 * Enhanced Error Boundary Context for Being. MBCT App
 *
 * Provides comprehensive error handling for context providers and state management
 * with clinical safety protocols and therapeutic continuity preservation.
 */

import React, { Component, ReactNode, ErrorInfo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { createSafeContext } from '../utils/SafeImports';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Error severity levels for therapeutic context
 */
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

/**
 * Error categories for proper handling
 */
export type ErrorCategory =
  | 'context'
  | 'state'
  | 'storage'
  | 'encryption'
  | 'therapeutic'
  | 'crisis'
  | 'performance'
  | 'network'
  | 'unknown';

/**
 * Enhanced error info for clinical context
 */
export interface EnhancedErrorInfo {
  readonly id: string;
  readonly timestamp: string;
  readonly severity: ErrorSeverity;
  readonly category: ErrorCategory;
  readonly message: string;
  readonly stack?: string;
  readonly context?: string;
  readonly therapeuticImpact: string;
  readonly userVisible: boolean;
  readonly recoverable: boolean;
  readonly sessionData?: Record<string, any>;
}

/**
 * Error recovery strategies
 */
export interface ErrorRecoveryStrategy {
  readonly type: 'retry' | 'reset' | 'fallback' | 'escalate';
  readonly description: string;
  readonly action: () => Promise<void>;
  readonly requiresUserAction: boolean;
}

/**
 * Error Boundary Context Interface
 */
export interface ErrorBoundaryContextValue {
  readonly errors: readonly EnhancedErrorInfo[];
  readonly hasErrors: boolean;
  readonly criticalErrors: readonly EnhancedErrorInfo[];
  readonly isRecovering: boolean;

  // Error management
  reportError: (error: Error, context?: string, severity?: ErrorSeverity) => void;
  clearErrors: () => void;
  clearError: (id: string) => void;

  // Recovery actions
  retryLastAction: () => Promise<boolean>;
  resetToSafeState: () => Promise<void>;
  getRecoveryStrategies: (errorId: string) => ErrorRecoveryStrategy[];

  // Crisis handling
  enableCrisisMode: () => Promise<void>;
  reportCriticalError: (error: Error, therapeuticImpact: string) => void;
}

/**
 * Default context value with safe fallbacks
 */
const defaultContextValue: ErrorBoundaryContextValue = {
  errors: [],
  hasErrors: false,
  criticalErrors: [],
  isRecovering: false,
  reportError: () => {
    console.warn('ErrorBoundary: reportError called before ready');
  },
  clearErrors: () => {
    console.warn('ErrorBoundary: clearErrors called before ready');
  },
  clearError: () => {
    console.warn('ErrorBoundary: clearError called before ready');
  },
  retryLastAction: async () => {
    console.warn('ErrorBoundary: retryLastAction called before ready');
    return false;
  },
  resetToSafeState: async () => {
    console.warn('ErrorBoundary: resetToSafeState called before ready');
  },
  getRecoveryStrategies: () => {
    console.warn('ErrorBoundary: getRecoveryStrategies called before ready');
    return [];
  },
  enableCrisisMode: async () => {
    console.warn('ErrorBoundary: enableCrisisMode called before ready');
  },
  reportCriticalError: () => {
    console.warn('ErrorBoundary: reportCriticalError called before ready');
  },
};

/**
 * Create safe error boundary context
 */
const {
  Provider: ErrorBoundaryContextProvider,
  useContext: useErrorBoundaryContext,
} = createSafeContext(defaultContextValue, 'ErrorBoundaryContext');

/**
 * Error Boundary Provider Props
 */
export interface ErrorBoundaryProviderProps {
  children: ReactNode;
  fallbackComponent?: React.ComponentType<{ error: EnhancedErrorInfo; onRetry: () => void }>;
  onError?: (error: EnhancedErrorInfo) => void;
  onCriticalError?: (error: EnhancedErrorInfo) => void;
  maxErrors?: number;
  enableCrashReporting?: boolean;
}

/**
 * Error Boundary Provider State
 */
interface ErrorBoundaryProviderState {
  errors: EnhancedErrorInfo[];
  isRecovering: boolean;
  lastAction?: () => Promise<void>;
}

/**
 * Enhanced Error Boundary Provider Class Component
 */
export class ErrorBoundaryProvider extends Component<
  ErrorBoundaryProviderProps,
  ErrorBoundaryProviderState
> {
  private errorCount = 0;
  private maxErrors: number;

  constructor(props: ErrorBoundaryProviderProps) {
    super(props);
    this.maxErrors = props.maxErrors || 10;
    this.state = {
      errors: [],
      isRecovering: false,
    };
  }

  /**
   * React Error Boundary - Catch JavaScript errors
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryProviderState> {
    return {
      errors: [],
    };
  }

  /**
   * Handle caught errors with enhanced context
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const enhancedError = this.createEnhancedError(
      error,
      'React Error Boundary',
      'critical',
      'context'
    );

    this.handleError(enhancedError);
  }

  /**
   * Generate unique error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Create enhanced error info
   */
  private createEnhancedError(
    error: Error,
    context: string = 'Unknown',
    severity: ErrorSeverity = 'medium',
    category: ErrorCategory = 'unknown'
  ): EnhancedErrorInfo {
    return {
      id: this.generateErrorId(),
      timestamp: new Date().toISOString(),
      severity,
      category,
      message: error.message,
      stack: error.stack,
      context,
      therapeuticImpact: this.getTherapeuticImpact(severity, category),
      userVisible: severity === 'high' || severity === 'critical',
      recoverable: severity !== 'critical',
      sessionData: this.captureSessionData(),
    };
  }

  /**
   * Determine therapeutic impact based on error
   */
  private getTherapeuticImpact(severity: ErrorSeverity, category: ErrorCategory): string {
    if (category === 'crisis') {
      return 'Critical: May affect user safety and crisis response';
    }
    if (category === 'therapeutic') {
      return 'High: May disrupt therapeutic session continuity';
    }
    if (severity === 'critical') {
      return 'Critical: May require app restart or emergency protocols';
    }
    if (severity === 'high') {
      return 'High: May affect core app functionality';
    }
    if (severity === 'medium') {
      return 'Medium: May affect user experience but not safety';
    }
    return 'Low: Minor impact on user experience';
  }

  /**
   * Capture session data for error context
   */
  private captureSessionData(): Record<string, any> {
    try {
      return {
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent || 'Unknown',
        url: window.location?.href || 'Unknown',
        // Add more session context as needed
      };
    } catch (error) {
      return { error: 'Failed to capture session data' };
    }
  }

  /**
   * Handle error with proper escalation
   */
  private handleError = (error: EnhancedErrorInfo) => {
    this.errorCount++;

    // Update state with new error
    this.setState(prevState => ({
      errors: [...prevState.errors.slice(-(this.maxErrors - 1)), error],
    }));

    // Report to callbacks
    this.props.onError?.(error);

    if (error.severity === 'critical') {
      this.props.onCriticalError?.(error);
    }

    // Save error to storage for debugging
    this.saveErrorToStorage(error);

    // Auto-recovery for certain error types
    if (error.recoverable && this.errorCount < 5) {
      this.attemptAutoRecovery(error);
    }
  };

  /**
   * Save error to storage for debugging
   */
  private saveErrorToStorage = async (error: EnhancedErrorInfo) => {
    try {
      const savedErrors = await AsyncStorage.getItem('being_error_log');
      const errorLog = savedErrors ? JSON.parse(savedErrors) : [];

      errorLog.push(error);

      // Keep last 50 errors
      const trimmedLog = errorLog.slice(-50);

      await AsyncStorage.setItem('being_error_log', JSON.stringify(trimmedLog));
    } catch (storageError) {
      console.error('Failed to save error to storage:', storageError);
    }
  };

  /**
   * Attempt automatic recovery
   */
  private attemptAutoRecovery = async (error: EnhancedErrorInfo) => {
    if (error.category === 'storage' || error.category === 'state') {
      // Try to reset to safe state
      await this.resetToSafeState();
    }
  };

  /**
   * Reset app to safe state
   */
  private resetToSafeState = async () => {
    this.setState({ isRecovering: true });

    try {
      // Clear non-critical cached data
      await AsyncStorage.multiRemove([
        'being_cache_data',
        'being_temporary_data',
        // Keep critical data like user profile and check-ins
      ]);

      // Reset error count
      this.errorCount = 0;

      this.setState({
        errors: [],
        isRecovering: false,
      });

      console.log('Successfully reset to safe state');
    } catch (resetError) {
      console.error('Failed to reset to safe state:', resetError);
      this.setState({ isRecovering: false });
    }
  };

  /**
   * Context value implementation
   */
  private getContextValue = (): ErrorBoundaryContextValue => {
    const { errors, isRecovering, lastAction } = this.state;
    const criticalErrors = errors.filter(error => error.severity === 'critical');

    return {
      errors,
      hasErrors: errors.length > 0,
      criticalErrors,
      isRecovering,

      reportError: (error: Error, context?: string, severity?: ErrorSeverity) => {
        const enhancedError = this.createEnhancedError(
          error,
          context || 'Manual Report',
          severity || 'medium',
          'unknown'
        );
        this.handleError(enhancedError);
      },

      clearErrors: () => {
        this.setState({ errors: [] });
        this.errorCount = 0;
      },

      clearError: (id: string) => {
        this.setState(prevState => ({
          errors: prevState.errors.filter(error => error.id !== id),
        }));
      },

      retryLastAction: async () => {
        if (!lastAction) return false;

        this.setState({ isRecovering: true });

        try {
          await lastAction();
          this.setState({ isRecovering: false });
          return true;
        } catch (error) {
          this.setState({ isRecovering: false });
          this.reportError(error as Error, 'Retry Failed', 'high');
          return false;
        }
      },

      resetToSafeState: this.resetToSafeState,

      getRecoveryStrategies: (errorId: string): ErrorRecoveryStrategy[] => {
        const error = errors.find(e => e.id === errorId);
        if (!error) return [];

        const strategies: ErrorRecoveryStrategy[] = [];

        if (error.recoverable) {
          strategies.push({
            type: 'retry',
            description: 'Retry the last action',
            action: async () => {
              await this.getContextValue().retryLastAction();
            },
            requiresUserAction: false,
          });

          strategies.push({
            type: 'reset',
            description: 'Reset to safe state',
            action: this.resetToSafeState,
            requiresUserAction: true,
          });
        }

        if (error.severity === 'critical') {
          strategies.push({
            type: 'escalate',
            description: 'Contact support',
            action: async () => {
              // Implement support contact logic
              console.log('Escalating to support');
            },
            requiresUserAction: true,
          });
        }

        return strategies;
      },

      enableCrisisMode: async () => {
        try {
          // Enable emergency protocols
          await AsyncStorage.setItem('being_emergency_mode', 'true');
          console.log('Crisis mode enabled due to critical errors');
        } catch (error) {
          console.error('Failed to enable crisis mode:', error);
        }
      },

      reportCriticalError: (error: Error, therapeuticImpact: string) => {
        const enhancedError: EnhancedErrorInfo = {
          ...this.createEnhancedError(error, 'Critical Error', 'critical', 'crisis'),
          therapeuticImpact,
        };
        this.handleError(enhancedError);
      },
    };
  };

  render() {
    const { children, fallbackComponent: FallbackComponent } = this.props;
    const { errors } = this.state;

    // Show fallback for critical errors
    const criticalError = errors.find(error => error.severity === 'critical');
    if (criticalError && FallbackComponent) {
      return (
        <FallbackComponent
          error={criticalError}
          onRetry={() => this.getContextValue().retryLastAction()}
        />
      );
    }

    return (
      <ErrorBoundaryContextProvider value={this.getContextValue()}>
        {children}
      </ErrorBoundaryContextProvider>
    );
  }
}

/**
 * Hook to use Error Boundary Context
 */
export const useErrorBoundary = () => {
  const context = useErrorBoundaryContext();

  if (!context) {
    console.warn('useErrorBoundary called outside ErrorBoundaryProvider');
    return defaultContextValue;
  }

  return context;
};

/**
 * Default Error Fallback Component
 */
export const DefaultErrorFallback: React.FC<{
  error: EnhancedErrorInfo;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <View style={styles.container}>
    <View style={styles.errorContainer}>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.message}>{error.message}</Text>
      <Text style={styles.impact}>{error.therapeuticImpact}</Text>

      <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
        <Text style={styles.retryText}>Try Again</Text>
      </TouchableOpacity>
    </View>
  </View>
);

/**
 * Styles for error fallback
 */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF5F5',
    padding: 20,
  },
  errorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: '#FFB3B3',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#C53030',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 14,
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  impact: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 24,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  retryButton: {
    backgroundColor: '#4A7C59',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default ErrorBoundaryProvider;