/**
 * ClinicalCarouselErrorBoundary Component
 *
 * Error boundary specifically designed for clinical carousel components.
 * Ensures graceful degradation without disrupting therapeutic workflows.
 */

import React, { Component, ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity
} from 'react-native';

import { ClinicalIcon } from './components/ClinicalIcon';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: any) => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ClinicalCarouselErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Clinical Carousel Error:', error, errorInfo);

    // Report to error tracking service (but not in development)
    if (process.env.NODE_ENV === 'production') {
      this.props.onError?.(error, errorInfo);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI for clinical context
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.errorContainer}>
          <View style={styles.errorContent}>
            <ClinicalIcon
              type="warning"
              size={48}
              color="#F56565"
              accessibilityLabel="Error occurred"
            />

            <Text style={styles.errorTitle}>
              Clinical Content Temporarily Unavailable
            </Text>

            <Text style={styles.errorMessage}>
              We're experiencing a temporary issue loading the clinical information.
              Your data is safe and all core therapeutic features remain available.
            </Text>

            <View style={styles.errorActions}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={this.handleRetry}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel="Retry loading clinical content"
              >
                <Text style={styles.retryButtonText}>Try Again</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.alternativeText}>
              You can continue using assessments, breathing exercises, and all other Being. features normally.
            </Text>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  errorContainer: {
    backgroundColor: '#F0F7FF',
    borderRadius: 20,
    padding: 40,
    minHeight: 400,
    justifyContent: 'center',
    alignItems: 'center'
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 300
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A365D',
    textAlign: 'center',
    marginTop: 20,
    marginBottom: 12
  },
  errorMessage: {
    fontSize: 14,
    color: '#4A5568',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24
  },
  errorActions: {
    marginBottom: 20
  },
  retryButton: {
    backgroundColor: '#2C5282',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
    minHeight: 44
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center'
  },
  alternativeText: {
    fontSize: 12,
    color: '#718096',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 16
  }
});

export default ClinicalCarouselErrorBoundary;