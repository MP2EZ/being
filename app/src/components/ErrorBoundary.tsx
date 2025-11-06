/**
 * ERROR BOUNDARY COMPONENT
 *
 * FEAT-6 MVP: Catch React errors and prevent PHI leakage
 *
 * PURPOSE:
 * - Catch unhandled React errors before they crash the app
 * - Display user-friendly error UI (no PHI)
 * - Log errors safely for debugging
 *
 * SECURITY:
 * - All error messages sanitized before display
 * - No stack traces shown to users
 * - Safe error logging only
 *
 * V2 REQUIREMENTS (INFRA-61):
 * - Report errors to production error tracking service
 * - User feedback mechanism
 * - Automatic error recovery
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { sanitizeError, logError } from '../utils/errorSanitization';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

const colors = {
  white: '#FFFFFF',
  black: '#1C1C1C',
  gray100: '#F3F4F6',
  gray600: '#4B5563',
  error: '#EF4444',
  midnightBlue: '#1B2951',
};

const spacing = {
  md: 16,
  lg: 24,
  xl: 32,
};

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: 'An unexpected error occurred',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Sanitize error before storing in state
    const sanitized = sanitizeError(error);

    return {
      hasError: true,
      errorMessage: 'An unexpected error occurred. Please try refreshing the app.',
    };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error safely (PHI-sanitized)
    logError(error, 'ErrorBoundary');

    if (__DEV__) {
      // In dev, also log component stack (but not in production)
      console.error('Component stack:', errorInfo.componentStack);
    }

    // TODO (INFRA-61): Report to error tracking service
  }

  handleReset = () => {
    this.setState({ hasError: false, errorMessage: '' });
  };

  override render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <View style={styles.container}>
          <View style={styles.content}>
            <Text style={styles.title}>Oops!</Text>
            <Text style={styles.message}>{this.state.errorMessage}</Text>
            <Text style={styles.description}>
              We're sorry for the inconvenience. Your data is safe.
            </Text>
            <Pressable style={styles.button} onPress={this.handleReset}>
              <Text style={styles.buttonText}>Try Again</Text>
            </Pressable>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  content: {
    alignItems: 'center',
    maxWidth: 400,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.error,
    marginBottom: spacing.md,
  },
  message: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.black,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: 16,
    fontWeight: '400',
    color: colors.gray600,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: 24,
  },
  button: {
    backgroundColor: colors.midnightBlue,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: 12,
    minWidth: 200,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.white,
  },
});
