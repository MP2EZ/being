'use client';

/**
 * Being. Card Component
 * Accessible card component with clinical design patterns
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface CardProps {
  variant?: 'default' | 'clinical' | 'featured' | 'interactive';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  shadow?: 'none' | 'soft' | 'medium' | 'strong';
  border?: boolean;
  hover?: boolean;
  focus?: boolean;
  clickable?: boolean;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

const cardVariants = {
  default: 'bg-white border-gray-200',
  clinical: 'bg-white border-clinical-neutral/20 shadow-soft',
  featured: 'bg-gradient-to-br from-primary-50 to-white border-primary-200',
  interactive: 'bg-white border-gray-200 cursor-pointer'
};

const cardPadding = {
  none: 'p-0',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-12'
};

const cardShadows = {
  none: '',
  soft: 'shadow-soft',
  medium: 'shadow-medium',
  strong: 'shadow-strong'
};

export const Card: React.FC<CardProps> = ({
  variant = 'default',
  padding = 'md',
  shadow = 'soft',
  border = true,
  hover = false,
  focus = false,
  clickable = false,
  onClick,
  className,
  children,
  'data-testid': testId,
  ...props
}) => {
  const classes = cn(
    // Base card styling
    'rounded-xl overflow-hidden',
    'motion-safe:transition-all motion-safe:duration-200 motion-safe:ease-in-out',
    
    // Variant styling
    cardVariants[variant],
    
    // Padding
    cardPadding[padding],
    
    // Shadow
    cardShadows[shadow],
    
    // Border
    border && 'border',
    
    // Interactive states
    hover && 'hover:shadow-medium hover:scale-[1.02] hover:border-primary-300',
    focus && 'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
    clickable && 'cursor-pointer select-none',
    
    // Accessibility for interactive cards
    (clickable || onClick) && [
      'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:ring-offset-2',
      'active:scale-[0.98]'
    ],
    
    // Custom classes
    className
  );

  // Interactive card with click handler
  if (clickable || onClick) {
    return (
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && onClick) {
            e.preventDefault();
            onClick();
          }
        }}
        className={classes}
        data-testid={testId}
        {...props}
      >
        {children}
      </div>
    );
  }

  // Regular card
  return (
    <div
      className={classes}
      data-testid={testId}
      {...props}
    >
      {children}
    </div>
  );
};