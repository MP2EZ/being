/**
 * Being. Input Component
 * Accessible form input with clinical validation patterns
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  hint?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'clinical';
  required?: boolean;
  className?: string;
  'data-testid'?: string;
}

const inputSizes = {
  sm: 'px-3 py-2 text-sm',
  md: 'px-4 py-3 text-base',
  lg: 'px-6 py-4 text-lg'
};

const inputVariants = {
  default: 'border-gray-300 focus:border-primary-500 focus:ring-primary-500/50',
  clinical: 'border-clinical-neutral focus:border-clinical-safe focus:ring-clinical-safe/50'
};

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  size = 'md',
  variant = 'default',
  required = false,
  className,
  id,
  'data-testid': testId,
  ...props
}) => {
  // Generate unique ID if not provided
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = error ? `${inputId}-error` : undefined;
  const hintId = hint ? `${inputId}-hint` : undefined;

  const inputClasses = cn(
    // Base input styling
    'block w-full rounded-lg border bg-white',
    'font-sans leading-none',
    'transition-all duration-200 ease-in-out',
    'placeholder:text-gray-400',
    
    // Focus styling
    'focus:outline-none focus:ring-2 focus:ring-offset-1',
    
    // Size variants
    inputSizes[size],
    
    // Color variants
    inputVariants[variant],
    
    // Error state
    error && 'border-clinical-warning focus:border-clinical-warning focus:ring-clinical-warning/50',
    
    // Disabled state
    'disabled:bg-gray-50 disabled:text-gray-500 disabled:cursor-not-allowed disabled:opacity-60',
    
    // Ensure minimum touch target (44px)
    size === 'sm' && 'min-h-[44px]',
    
    // Custom classes
    className
  );

  return (
    <div className="space-y-2">
      {/* Label */}
      {label && (
        <label
          htmlFor={inputId}
          className={cn(
            'block text-sm font-medium text-text-primary',
            required && 'after:content-["*"] after:ml-1 after:text-clinical-warning'
          )}
        >
          {label}
        </label>
      )}

      {/* Input */}
      <input
        id={inputId}
        className={inputClasses}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={cn(
          error && errorId,
          hint && hintId
        )}
        data-testid={testId}
        {...props}
      />

      {/* Hint text */}
      {hint && !error && (
        <p
          id={hintId}
          className="text-sm text-text-muted"
          role="note"
        >
          {hint}
        </p>
      )}

      {/* Error message */}
      {error && (
        <p
          id={errorId}
          className="text-sm text-clinical-warning font-medium"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
};