/**
 * Being. Error Boundary Component
 * Clinical-grade error handling with user safety focus
 */

'use client';

import React from 'react';
import { Typography } from '../Typography';
import { Button } from '../Button';
import { Card } from '../Card';
import { Container } from '../Container';

export interface ErrorBoundaryProps {
  fallback?: React.ComponentType<ErrorFallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  children: React.ReactNode;
}

export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Default error fallback component with clinical UX patterns
const DefaultErrorFallback: React.FC<ErrorFallbackProps> = ({ error, resetError }) => (
  <Container size="sm" padding="lg" className="py-16">
    <Card variant="clinical" padding="xl" className="text-center">
      <div className="mb-6">
        <div className="mx-auto w-16 h-16 rounded-full bg-clinical-warning/10 flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-clinical-warning"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z"
            />
          </svg>
        </div>
        
        <Typography variant="h3" className="mb-2">
          Something went wrong
        </Typography>
        
        <Typography variant="body" color="muted" className="mb-6">
          We&apos;ve encountered an unexpected error. Please try refreshing the page or contact support if the issue persists.
        </Typography>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            variant="primary"
            size="md"
            onClick={resetError}
            data-testid="error-retry-button"
          >
            Try again
          </Button>
          
          <Button
            variant="outline"
            size="md"
            onClick={() => window.location.reload()}
            data-testid="error-refresh-button"
          >
            Refresh page
          </Button>
        </div>

        {/* Crisis resources for mental health context */}
        <div className="border-t pt-6 mt-6">
          <Typography variant="caption" color="muted" className="mb-3">
            If you&apos;re experiencing a mental health emergency:
          </Typography>
          <Button
            variant="clinical"
            size="sm"
            onClick={() => window.open('tel:988', '_self')}
            data-testid="crisis-hotline-button"
          >
            Call 988 Crisis Lifeline
          </Button>
        </div>
      </div>

      {/* Error details for development */}
      {process.env.NODE_ENV === 'development' && (
        <details className="mt-8 text-left">
          <summary className="cursor-pointer text-sm font-medium text-gray-600 mb-2">
            Error Details (Development)
          </summary>
          <pre className="text-xs text-gray-500 bg-gray-50 p-4 rounded-md overflow-auto">
            {error.message}
            {error.stack}
          </pre>
        </details>
      )}
    </Card>
  </Container>
);

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for monitoring
    console.error('Being. Error Boundary caught an error:', error, errorInfo);

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // In production, report to error monitoring service
    if (process.env.NODE_ENV === 'production') {
      // TODO: Integrate with error monitoring service
      // reportError(error, errorInfo);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      
      return (
        <FallbackComponent
          error={this.state.error}
          resetError={this.resetError}
        />
      );
    }

    return this.props.children;
  }
}