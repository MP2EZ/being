/**
 * ErrorBoundary - Catches React component errors and provides fallback UI
 * Essential for production stability, especially around user inputs
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Button } from './Button';
import { colorSystem, spacing, borderRadius } from '../../constants/colors';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);
    
    // In production, you might want to log to crash analytics
    // crashlytics().recordError(error);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  handleReportError = () => {
    const errorMessage = this.state.error?.message || 'Unknown error occurred';
    Alert.alert(
      'Report Error',
      `Error: ${errorMessage}\n\nWould you like to restart the app?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restart App', 
          onPress: () => {
            // In a real app, you might trigger app restart
            this.handleRetry();
          }
        }
      ]
    );
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <Text style={styles.title}>Something went wrong</Text>
            <Text style={styles.subtitle}>
              We apologize for the inconvenience. Your data is safe.
            </Text>
            
            {__DEV__ && this.state.error && (
              <View style={styles.debugInfo}>
                <Text style={styles.debugTitle}>Debug Info:</Text>
                <Text style={styles.debugText}>{this.state.error.message}</Text>
              </View>
            )}
            
            <View style={styles.actions}>
              <Button
                variant="primary"
                onPress={this.handleRetry}
                fullWidth
              >
                Try Again
              </Button>
              
              <Button
                variant="outline"
                onPress={this.handleReportError}
                fullWidth
              >
                Report Issue
              </Button>
            </View>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary fallback={fallback}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colorSystem.base.white,
    padding: spacing.lg,
  },
  errorCard: {
    backgroundColor: colorSystem.status.errorBackground,
    borderRadius: borderRadius.large,
    padding: spacing.xl,
    maxWidth: 400,
    width: '100%',
    borderWidth: 1,
    borderColor: colorSystem.status.error,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colorSystem.status.error,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 16,
    color: colorSystem.gray[700],
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  debugInfo: {
    backgroundColor: colorSystem.gray[100],
    borderRadius: borderRadius.medium,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colorSystem.gray[800],
    marginBottom: spacing.xs,
  },
  debugText: {
    fontSize: 12,
    color: colorSystem.gray[600],
    fontFamily: 'monospace',
  },
  actions: {
    gap: spacing.sm,
  },
});

export default ErrorBoundary;