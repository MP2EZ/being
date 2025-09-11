'use client';

/**
 * FullMind Download Buttons Component
 * App store download buttons with clinical accessibility
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { siteConfig } from '@/config/site';
import { Typography } from '../Typography';

interface DownloadButtonsProps {
  className?: string;
  variant?: 'default' | 'compact' | 'large';
  orientation?: 'horizontal' | 'vertical';
  theme?: 'light' | 'dark';
  showComingSoon?: boolean;
  'data-testid'?: string;
}

export const DownloadButtons: React.FC<DownloadButtonsProps> = ({
  className,
  variant = 'default',
  orientation = 'horizontal',
  theme = 'light',
  showComingSoon = false,
  'data-testid': testId,
}) => {
  const containerClasses = cn(
    // Base layout
    'flex items-center gap-4',
    
    // Orientation
    orientation === 'vertical' && 'flex-col',
    orientation === 'horizontal' && 'flex-row',
    
    // Responsive
    'flex-col sm:flex-row',
    orientation === 'vertical' && 'sm:flex-col',
    
    className
  );

  return (
    <div className={containerClasses} data-testid={testId}>
      {/* App Store Button */}
      <DownloadButton
        store="appstore"
        href={siteConfig.links.appStore}
        variant={variant}
        theme={theme}
        disabled={showComingSoon}
      />
      
      {/* Google Play Button */}
      <DownloadButton
        store="googleplay"
        href={siteConfig.links.playStore}
        variant={variant}
        theme={theme}
        disabled={showComingSoon}
      />
      
      {/* Coming Soon Badge */}
      {showComingSoon && (
        <div className="flex items-center">
          <div className="px-3 py-1 bg-primary-100 text-primary-700 rounded-full">
            <Typography variant="caption" className="font-medium">
              Coming Soon
            </Typography>
          </div>
        </div>
      )}
    </div>
  );
};

// Individual Download Button Component
interface DownloadButtonProps {
  store: 'appstore' | 'googleplay';
  href: string;
  variant: 'default' | 'compact' | 'large';
  theme: 'light' | 'dark';
  disabled?: boolean;
}

const DownloadButton: React.FC<DownloadButtonProps> = ({
  store,
  href,
  variant,
  theme,
  disabled = false,
}) => {
  const isAppStore = store === 'appstore';
  const storeInfo = getStoreInfo(store);
  
  const buttonClasses = cn(
    // Base styling
    'inline-flex items-center justify-center rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500',
    
    // Size variants
    variant === 'compact' && 'px-4 py-2 gap-2',
    variant === 'default' && 'px-6 py-3 gap-3',
    variant === 'large' && 'px-8 py-4 gap-4',
    
    // Theme variants
    theme === 'light' && [
      'bg-black text-white hover:bg-gray-800',
      'shadow-medium hover:shadow-strong'
    ],
    theme === 'dark' && [
      'bg-white text-black hover:bg-gray-100',
      'shadow-medium hover:shadow-strong',
      'border border-gray-200'
    ],
    
    // Disabled state
    disabled && 'opacity-60 cursor-not-allowed pointer-events-none',
    
    // Accessibility
    'min-h-[44px]', // WCAG touch target size
    
    // Store-specific styling
    isAppStore && 'font-sf-pro', // iOS system font when available
  );
  
  const iconSize = variant === 'compact' ? 'w-6 h-6' : variant === 'large' ? 'w-10 h-10' : 'w-8 h-8';
  const textSize = variant === 'compact' ? 'text-sm' : variant === 'large' ? 'text-lg' : 'text-base';

  if (disabled) {
    return (
      <div className={buttonClasses} role="button" aria-disabled="true">
        <StoreIcon store={store} className={iconSize} />
        <div className="flex flex-col items-start">
          <Typography 
            variant="caption" 
            className={cn('text-xs opacity-75', theme === 'dark' && 'text-gray-600')}
          >
            {storeInfo.pretext}
          </Typography>
          <Typography 
            variant="body" 
            className={cn('font-semibold', textSize)}
          >
            {storeInfo.name}
          </Typography>
        </div>
      </div>
    );
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={buttonClasses}
      aria-label={`Download FullMind from ${storeInfo.name}`}
      onClick={() => {
        // Track app store download click
        if (typeof window !== 'undefined' && window.gtag) {
          window.gtag('event', 'app_store_click', {
            store: store,
            position: 'download_button',
            variant: variant
          });
        }
      }}
    >
      <StoreIcon store={store} className={iconSize} />
      <div className="flex flex-col items-start">
        <Typography 
          variant="caption" 
          className={cn('text-xs opacity-75', theme === 'dark' && 'text-gray-600')}
        >
          {storeInfo.pretext}
        </Typography>
        <Typography 
          variant="body" 
          className={cn('font-semibold', textSize)}
        >
          {storeInfo.name}
        </Typography>
      </div>
    </a>
  );
};

// Store Icon Component
interface StoreIconProps {
  store: 'appstore' | 'googleplay';
  className?: string;
}

const StoreIcon: React.FC<StoreIconProps> = ({ store, className }) => {
  if (store === 'appstore') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.79 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.19 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5ZM13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z" />
      </svg>
    );
  }

  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
    </svg>
  );
};

// Store Information Helper
function getStoreInfo(store: 'appstore' | 'googleplay') {
  const storeData = {
    appstore: {
      name: 'App Store',
      pretext: 'Download on the',
    },
    googleplay: {
      name: 'Google Play',
      pretext: 'Get it on',
    },
  };

  return storeData[store];
}