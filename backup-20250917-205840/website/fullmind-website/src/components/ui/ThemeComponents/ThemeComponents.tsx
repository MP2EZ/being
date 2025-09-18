/**
 * FullMind Website - Theme-Aware Component Library
 * Clinical-grade components with dark mode support and therapeutic focus
 */

'use client';

import React, { forwardRef } from 'react';
import { useTheme, ThemeSelector } from '@/contexts/ThemeContext';
import { 
  useThemeAwareStyles, 
  useClinicalButtonStyles, 
  useTherapeuticCardStyles,
  useAccessibilityStyles,
  ThemeAwareStyleConfig,
  ComponentVariantConfig 
} from '@/hooks/useThemeAwareStyles';
import { cn } from '@/lib/utils';

// ============================================================================
// THEME-AWARE BUTTON COMPONENT
// ============================================================================

interface ThemeButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'clinical' | 'crisis' | 'safe';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  therapeuticContext?: boolean;
  children: React.ReactNode;
}

export const ThemeButton = forwardRef<HTMLButtonElement, ThemeButtonProps>(
  ({ 
    variant = 'primary', 
    size = 'md', 
    isLoading = false,
    therapeuticContext = false,
    className, 
    children, 
    disabled,
    ...props 
  }, ref) => {
    const { colors, isThemeTransitioning } = useTheme();
    
    // Use clinical button styles for crisis/safe variants
    const clinicalStyles = useClinicalButtonStyles(
      variant === 'crisis' || variant === 'safe' ? variant : 'primary'
    );
    
    // Regular theme-aware styles for other variants
    const buttonVariants: ComponentVariantConfig = {
      default: {
        base: 'font-medium px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target',
        light: 'bg-white text-gray-900 border border-gray-300 hover:bg-gray-50',
        dark: 'bg-gray-800 text-gray-100 border border-gray-600 hover:bg-gray-700'
      },
      primary: {
        base: 'font-semibold px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target',
        light: 'bg-theme-primary text-white hover:opacity-90 hover:scale-105',
        dark: 'bg-theme-primary text-white hover:opacity-90 hover:scale-105'
      },
      secondary: {
        base: 'font-medium px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target',
        light: 'bg-gray-100 text-gray-900 hover:bg-gray-200 border border-gray-300',
        dark: 'bg-gray-700 text-gray-100 hover:bg-gray-600 border border-gray-600'
      },
      outline: {
        base: 'font-medium px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target',
        light: 'bg-transparent text-theme-primary border-2 border-theme-primary hover:bg-theme-primary hover:text-white',
        dark: 'bg-transparent text-theme-primary border-2 border-theme-primary hover:bg-theme-primary hover:text-white'
      },
      clinical: {
        base: 'font-semibold px-4 py-2 rounded-lg transition-all duration-150 ease-in-out touch-target clinical-card',
        light: 'hover:shadow-clinical',
        dark: 'hover:shadow-clinical'
      }
    };

    const regularStyles = useThemeAwareStyles(buttonVariants[variant] || buttonVariants.default);
    
    // Size styles
    const sizeStyles = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2 text-base',
      lg: 'px-6 py-3 text-lg'
    };

    // Use clinical styles for crisis/safe, regular styles for others
    const finalStyles = cn(
      variant === 'crisis' || variant === 'safe' ? clinicalStyles : regularStyles,
      sizeStyles[size],
      therapeuticContext && 'shadow-theme-soft',
      isLoading && 'opacity-70 cursor-wait',
      disabled && 'opacity-50 cursor-not-allowed',
      isThemeTransitioning && 'animate-theme-transition',
      className
    );

    const accessibilityProps = {
      'aria-disabled': disabled || isLoading,
      'data-variant': variant,
      'data-therapeutic': therapeuticContext,
      'data-crisis': variant === 'crisis'
    };

    return (
      <button
        ref={ref}
        className={finalStyles}
        disabled={disabled || isLoading}
        {...accessibilityProps}
        {...props}
      >
        {isLoading && (
          <svg 
            className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" 
            fill="none" 
            viewBox="0 0 24 24"
            aria-hidden="true"
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
        )}
        {children}
      </button>
    );
  }
);

ThemeButton.displayName = 'ThemeButton';

// ============================================================================
// THEME-AWARE CARD COMPONENT
// ============================================================================

interface ThemeCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'clinical' | 'therapeutic' | 'crisis';
  purpose?: 'assessment' | 'exercise' | 'crisis' | 'general';
  elevated?: boolean;
  interactive?: boolean;
  children: React.ReactNode;
}

export const ThemeCard = forwardRef<HTMLDivElement, ThemeCardProps>(
  ({ 
    variant = 'default', 
    purpose = 'general',
    elevated = false,
    interactive = false,
    className, 
    children, 
    ...props 
  }, ref) => {
    const { isThemeTransitioning } = useTheme();
    
    const cardStyles = useTherapeuticCardStyles(purpose);
    
    const finalStyles = cn(
      cardStyles,
      elevated && 'shadow-theme-medium',
      interactive && 'hover:shadow-theme-strong hover:-translate-y-1 cursor-pointer',
      isThemeTransitioning && 'animate-theme-transition',
      className
    );

    const accessibilityProps = {
      'data-variant': variant,
      'data-purpose': purpose,
      'data-crisis': purpose === 'crisis',
      role: interactive ? 'button' : undefined,
      tabIndex: interactive ? 0 : undefined
    };

    return (
      <div
        ref={ref}
        className={finalStyles}
        {...accessibilityProps}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ThemeCard.displayName = 'ThemeCard';

// ============================================================================
// CRISIS ALERT COMPONENT
// ============================================================================

interface CrisisAlertProps {
  title?: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  dismissible?: boolean;
  onDismiss?: () => void;
  className?: string;
}

export function CrisisAlert({ 
  title = "Crisis Support Available",
  message, 
  actionLabel = "Get Help Now",
  onAction,
  dismissible = false,
  onDismiss,
  className 
}: CrisisAlertProps) {
  const { getCrisisButtonColors } = useTheme();
  const accessibilityStyles = useAccessibilityStyles({ 
    enhancedFocus: true, 
    largeTouch: true 
  });

  return (
    <div 
      className={cn(
        'p-4 rounded-lg border-l-4',
        'bg-crisis-bg/10 border-crisis-border text-crisis-text',
        'shadow-crisis',
        className
      )}
      role="alert"
      aria-live="assertive"
      data-crisis="true"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center">
            <svg 
              className="w-5 h-5 text-crisis-border mr-2 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            <h3 className="text-sm font-semibold">{title}</h3>
          </div>
          <p className="mt-1 text-sm">{message}</p>
          
          {onAction && (
            <div className="mt-3">
              <ThemeButton
                variant="crisis"
                size="sm"
                onClick={onAction}
                className={accessibilityStyles}
              >
                {actionLabel}
              </ThemeButton>
            </div>
          )}
        </div>

        {dismissible && onDismiss && (
          <button
            onClick={onDismiss}
            className={cn(
              'ml-3 p-1 rounded-md hover:bg-crisis-bg/20 transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-crisis-border',
              accessibilityStyles
            )}
            aria-label="Dismiss crisis alert"
          >
            <svg 
              className="w-4 h-4 text-crisis-text" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// THERAPEUTIC PROGRESS INDICATOR
// ============================================================================

interface TherapeuticProgressProps {
  progress: number; // 0-100
  label?: string;
  showPercentage?: boolean;
  therapeuticMessage?: string;
  className?: string;
}

export function TherapeuticProgress({ 
  progress, 
  label, 
  showPercentage = true,
  therapeuticMessage,
  className 
}: TherapeuticProgressProps) {
  const { colors, themeVariant } = useTheme();
  
  const progressStyles = useThemeAwareStyles({
    base: 'w-full bg-border-primary rounded-full h-3 transition-all duration-300',
    light: 'shadow-sm',
    dark: 'shadow-soft-dark'
  });

  const fillStyles = useThemeAwareStyles({
    base: 'h-full rounded-full transition-all duration-500 ease-out',
    morning: 'bg-gradient-to-r from-morning-primary to-morning-success',
    midday: 'bg-gradient-to-r from-midday-primary to-midday-success',
    evening: 'bg-gradient-to-r from-evening-primary to-evening-success'
  });

  const clampedProgress = Math.max(0, Math.min(100, progress));

  return (
    <div className={cn('space-y-2', className)} role="progressbar" aria-valuenow={clampedProgress} aria-valuemin={0} aria-valuemax={100}>
      {(label || showPercentage) && (
        <div className="flex justify-between items-center text-sm">
          {label && <span className="text-text-primary font-medium">{label}</span>}
          {showPercentage && <span className="text-text-secondary">{Math.round(clampedProgress)}%</span>}
        </div>
      )}
      
      <div className={progressStyles}>
        <div 
          className={fillStyles}
          style={{ width: `${clampedProgress}%` }}
          aria-hidden="true"
        />
      </div>
      
      {therapeuticMessage && (
        <p className="text-xs text-text-secondary text-center mt-2">
          {therapeuticMessage}
        </p>
      )}
    </div>
  );
}

// ============================================================================
// THEME-AWARE INPUT COMPONENT
// ============================================================================

interface ThemeInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  therapeutic?: boolean;
}

export const ThemeInput = forwardRef<HTMLInputElement, ThemeInputProps>(
  ({ 
    label, 
    error, 
    helperText, 
    therapeutic = false,
    className, 
    id, 
    ...props 
  }, ref) => {
    const inputId = id || `theme-input-${Math.random().toString(36).slice(2)}`;
    
    const inputStyles = useThemeAwareStyles({
      base: cn(
        'w-full px-3 py-2 rounded-lg border transition-all duration-150',
        'focus:outline-none focus:ring-2 focus:ring-offset-1',
        'touch-target'
      ),
      light: cn(
        'bg-white border-gray-300 text-gray-900',
        'focus:border-theme-primary focus:ring-theme-primary/20',
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
      ),
      dark: cn(
        'bg-surface-interactive border-border-primary text-text-primary',
        'focus:border-theme-primary focus:ring-theme-primary/20',
        error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/20' : ''
      ),
      clinical: therapeutic ? 'clinical-card' : ''
    });

    const accessibilityProps = {
      'aria-describedby': error ? `${inputId}-error` : helperText ? `${inputId}-help` : undefined,
      'aria-invalid': !!error,
      'data-therapeutic': therapeutic
    };

    return (
      <div className="space-y-1">
        {label && (
          <label 
            htmlFor={inputId}
            className="block text-sm font-medium text-text-primary"
          >
            {label}
          </label>
        )}
        
        <input
          ref={ref}
          id={inputId}
          className={cn(inputStyles, className)}
          {...accessibilityProps}
          {...props}
        />
        
        {error && (
          <p 
            id={`${inputId}-error`}
            className="text-sm text-red-600" 
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        
        {!error && helperText && (
          <p 
            id={`${inputId}-help`}
            className="text-sm text-text-secondary"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

ThemeInput.displayName = 'ThemeInput';

// ============================================================================
// THEME SELECTOR WIDGET
// ============================================================================

interface ThemeSelectorWidgetProps {
  position?: 'fixed' | 'relative';
  className?: string;
}

export function ThemeSelectorWidget({ 
  position = 'fixed', 
  className 
}: ThemeSelectorWidgetProps) {
  const positionStyles = position === 'fixed' 
    ? 'fixed bottom-4 right-4 z-50' 
    : 'relative';

  return (
    <div 
      className={cn(
        positionStyles,
        'theme-card p-3 rounded-lg shadow-theme-medium',
        className
      )}
      role="region"
      aria-label="Theme customization"
    >
      <ThemeSelector 
        showVariantSelector={true}
        showColorModeToggle={true}
        className="text-sm"
      />
    </div>
  );
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  ThemeButton,
  ThemeCard,
  CrisisAlert,
  TherapeuticProgress,
  ThemeInput,
  ThemeSelectorWidget
};

export type {
  ThemeButtonProps,
  ThemeCardProps,
  CrisisAlertProps,
  TherapeuticProgressProps,
  ThemeInputProps,
  ThemeSelectorWidgetProps
};