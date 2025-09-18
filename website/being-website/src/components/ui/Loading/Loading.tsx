/**
 * Being. Loading Component
 * Accessible loading states with clinical UX patterns
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface LoadingProps {
  variant?: 'spinner' | 'dots' | 'pulse' | 'clinical';
  size?: 'sm' | 'md' | 'lg';
  color?: 'primary' | 'clinical' | 'muted';
  text?: string;
  centered?: boolean;
  className?: string;
  'data-testid'?: string;
}

const loadingSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8'
};

const loadingColors = {
  primary: 'text-primary-500',
  clinical: 'text-clinical-safe',
  muted: 'text-gray-400'
};

const SpinnerIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg
    className={cn('animate-spin', className)}
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle
      className="opacity-25"
      cx="12"
      cy="12"
      r="10"
      stroke="currentColor"
      strokeWidth="4"
    />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
    />
  </svg>
);

const DotsLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('flex space-x-1', className)}>
    {[0, 1, 2].map((i) => (
      <div
        key={i}
        className="w-2 h-2 bg-current rounded-full animate-pulse"
        style={{
          animationDelay: `${i * 0.2}s`,
          animationDuration: '1s'
        }}
      />
    ))}
  </div>
);

const PulseLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div
    className={cn(
      'rounded-full bg-current animate-pulse-gentle',
      className
    )}
  />
);

const ClinicalLoader: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('relative', className)}>
    <div className="absolute inset-0 rounded-full border-4 border-clinical-safe/20" />
    <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-clinical-safe animate-spin" />
  </div>
);

export const Loading: React.FC<LoadingProps> = ({
  variant = 'spinner',
  size = 'md',
  color = 'primary',
  text,
  centered = false,
  className,
  'data-testid': testId,
  ...props
}) => {
  const sizeClasses = loadingSizes[size];
  const colorClasses = loadingColors[color];

  const renderLoader = () => {
    const loaderClasses = cn(sizeClasses, colorClasses);

    switch (variant) {
      case 'spinner':
        return <SpinnerIcon className={loaderClasses} />;
      case 'dots':
        return <DotsLoader className={colorClasses} />;
      case 'pulse':
        return <PulseLoader className={loaderClasses} />;
      case 'clinical':
        return <ClinicalLoader className={sizeClasses} />;
      default:
        return <SpinnerIcon className={loaderClasses} />;
    }
  };

  const containerClasses = cn(
    'inline-flex items-center gap-3',
    centered && 'justify-center w-full',
    className
  );

  return (
    <div
      className={containerClasses}
      role="status"
      aria-live="polite"
      data-testid={testId}
      {...props}
    >
      {renderLoader()}
      {text && (
        <span className={cn('text-sm font-medium', colorClasses)}>
          {text}
        </span>
      )}
      <span className="sr-only">Loading...</span>
    </div>
  );
};