/**
 * FullMind Container Component
 * Responsive container with consistent spacing and clinical layout patterns
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface ContainerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
  children: React.ReactNode;
  'data-testid'?: string;
}

const containerSizes = {
  sm: 'max-w-2xl',      // ~672px
  md: 'max-w-4xl',      // ~896px  
  lg: 'max-w-6xl',      // ~1152px
  xl: 'max-w-7xl',      // ~1280px
  full: 'max-w-full'    // Full width
};

const containerPadding = {
  none: '',
  sm: 'px-4 sm:px-6',           // 16px mobile, 24px tablet+
  md: 'px-6 sm:px-8',           // 24px mobile, 32px tablet+
  lg: 'px-8 sm:px-12',          // 32px mobile, 48px tablet+
  xl: 'px-12 sm:px-16'          // 48px mobile, 64px tablet+
};

export const Container: React.FC<ContainerProps> = ({
  size = 'lg',
  padding = 'md',
  center = true,
  className,
  children,
  'data-testid': testId,
  ...props
}) => {
  const classes = cn(
    // Base container styling
    'w-full',
    
    // Size constraints
    containerSizes[size],
    
    // Padding
    containerPadding[padding],
    
    // Centering
    center && 'mx-auto',
    
    // Custom classes
    className
  );

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