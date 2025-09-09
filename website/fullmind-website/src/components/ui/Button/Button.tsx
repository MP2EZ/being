'use client';

/**
 * FullMind Button Component
 * Clinical-grade button with accessibility and therapeutic UX patterns
 */

import React from 'react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { type ButtonProps } from '@/types';

const buttonVariants = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 focus:ring-primary-500/50 shadow-medium',
  secondary: 'bg-white text-primary-500 border-2 border-primary-500 hover:bg-primary-50 focus:ring-primary-500/50',
  outline: 'border-2 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50 focus:ring-gray-500/50',
  ghost: 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:ring-gray-500/50',
  clinical: 'bg-clinical-safe text-white hover:bg-clinical-safe/90 focus:ring-clinical-safe/50 shadow-medium'
};

const buttonSizes = {
  sm: 'px-4 py-2 text-sm font-medium',
  md: 'px-6 py-3 text-base font-medium',
  lg: 'px-8 py-4 text-lg font-semibold'
};

export const Button: React.FC<ButtonProps> = ({
  variant,
  size,
  disabled = false,
  loading = false,
  onClick,
  href,
  external = false,
  className,
  children,
  'data-testid': testId,
  ...props
}) => {
  // Base classes for all buttons
  const baseClasses = cn(
    // Layout and spacing
    'inline-flex items-center justify-center',
    'gap-2',
    'transition-all duration-200 ease-in-out',
    
    // Typography
    'font-sans leading-none',
    'text-center whitespace-nowrap',
    
    // Shape and borders
    'rounded-lg border-transparent',
    
    // Focus and accessibility
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'focus-visible:ring-2 focus-visible:ring-offset-2',
    
    // Touch targets (minimum 44px for accessibility)
    'min-h-[44px]',
    
    // Disabled state
    disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
    
    // Loading state
    loading && 'opacity-80 cursor-wait',
    
    // Variant and size classes
    buttonVariants[variant],
    buttonSizes[size],
    
    // Custom classes
    className
  );

  // Loading indicator component
  const LoadingSpinner = () => (
    <svg
      className="animate-spin h-4 w-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      data-testid={testId ? `${testId}-spinner` : 'button-spinner'}
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

  // Button content with loading state
  const buttonContent = (
    <>
      {loading && <LoadingSpinner />}
      <span className={loading ? 'opacity-70' : undefined}>
        {children}
      </span>
    </>
  );

  // External link button
  if (href && external) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={baseClasses}
        aria-disabled={disabled || loading}
        data-testid={testId}
        {...props}
      >
        {buttonContent}
        <svg
          className="ml-1 h-4 w-4"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </a>
    );
  }

  // Internal link button
  if (href && !external) {
    return (
      <Link
        href={href}
        className={baseClasses}
        aria-disabled={disabled || loading}
        data-testid={testId}
        {...props}
      >
        {buttonContent}
      </Link>
    );
  }

  // Regular button
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={baseClasses}
      data-testid={testId}
      {...props}
    >
      {buttonContent}
    </button>
  );
};