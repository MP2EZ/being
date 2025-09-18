/**
 * FullMind Typography Component
 * Clinical-grade typography with therapeutic readability standards
 */

import React from 'react';
import { cn } from '@/lib/utils';
// import { ACCESSIBILITY_STANDARDS } from '@/lib/constants';

export interface TypographyProps {
  variant: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'body' | 'caption' | 'clinical';
  element?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'p' | 'span' | 'div';
  size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
  weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  color?: 'primary' | 'secondary' | 'muted' | 'clinical' | 'error' | 'success';
  align?: 'left' | 'center' | 'right';
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

const typographyVariants = {
  h1: 'text-4xl font-bold leading-tight tracking-tight text-text-primary',
  h2: 'text-3xl font-bold leading-tight text-text-primary',
  h3: 'text-2xl font-semibold leading-normal text-text-primary',
  h4: 'text-xl font-semibold leading-normal text-text-primary',
  h5: 'text-lg font-medium leading-normal text-text-primary',
  h6: 'text-base font-medium leading-normal text-text-primary',
  body: 'text-base leading-relaxed text-text-secondary',
  caption: 'text-sm leading-normal text-text-muted',
  clinical: 'text-base leading-relaxed text-text-primary font-medium'
};

const typographySizes = {
  xs: 'text-xs',
  sm: 'text-sm',
  base: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl',
  '2xl': 'text-2xl',
  '3xl': 'text-3xl',
  '4xl': 'text-4xl',
  '5xl': 'text-5xl'
};

const typographyWeights = {
  normal: 'font-normal',
  medium: 'font-medium',
  semibold: 'font-semibold',
  bold: 'font-bold'
};

const typographyColors = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  muted: 'text-text-muted',
  clinical: 'text-clinical-safe',
  error: 'text-clinical-warning',
  success: 'text-clinical-safe'
};

const typographyAlign = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right'
};

// Default element mapping for semantic HTML
const defaultElements = {
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  caption: 'span',
  clinical: 'p'
} as const;

export const Typography: React.FC<TypographyProps> = ({
  variant,
  element,
  size,
  weight,
  color,
  align = 'left',
  className,
  children,
  'data-testid': testId,
  ...props
}) => {
  // Determine the HTML element to use
  const Component = element || defaultElements[variant];

  // Build class names
  const classes = cn(
    // Base variant styling
    typographyVariants[variant],
    
    // Override with specific props if provided
    size && typographySizes[size],
    weight && typographyWeights[weight],
    color && typographyColors[color],
    typographyAlign[align],
    
    // Ensure clinical-grade readability
    'antialiased',
    'selection:bg-primary-100 selection:text-primary-900',
    
    // Respect motion preferences for animations
    'motion-safe:transition-colors motion-safe:duration-200',
    
    // Custom classes
    className
  );

  return React.createElement(
    Component,
    {
      className: classes,
      'data-testid': testId,
      // Accessibility attributes for clinical content
      ...(variant === 'clinical' && {
        'aria-live': 'polite',
        role: 'status'
      }),
      ...props
    },
    children
  );
};