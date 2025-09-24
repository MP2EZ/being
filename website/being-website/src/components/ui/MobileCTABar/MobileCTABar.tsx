'use client';

/**
 * Being. Mobile CTA Bar
 * Floating download button for mobile conversion
 */

import React from 'react';
import { Button, Typography } from '@/components/ui';
import { cn } from '@/lib/utils';
import { siteConfig, trialConfig } from '@/config/site';

// Extend window interface for Google Analytics
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface MobileCTABarProps {
  className?: string;
  variant?: 'download' | 'crisis' | 'simple';
  showOnScroll?: boolean;
  threshold?: number;
  'data-testid'?: string;
}

export const MobileCTABar: React.FC<MobileCTABarProps> = ({
  className,
  variant = 'download',
  showOnScroll = true,
  threshold = 100,
  'data-testid': testId,
}) => {
  const [isVisible, setIsVisible] = React.useState(!showOnScroll);

  React.useEffect(() => {
    if (!showOnScroll) return;

    const handleScroll = () => {
      const scrolled = window.scrollY > threshold;
      setIsVisible(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [showOnScroll, threshold]);

  if (!isVisible) return null;

  const barClasses = cn(
    // Base styling
    'fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200',
    'shadow-lg transition-transform duration-300 ease-in-out',
    'md:hidden', // Only show on mobile
    
    // Animation
    isVisible ? 'translate-y-0' : 'translate-y-full',
    
    className
  );

  return (
    <div className={barClasses} data-testid={testId}>
      <div className="px-4 py-3">
        {variant === 'download' && <DownloadCTA />}
        {variant === 'crisis' && <CrisisCTA />}
        {variant === 'simple' && <SimpleCTA />}
      </div>
    </div>
  );
};

// Download CTA variant
const DownloadCTA: React.FC = () => {
  return (
    <div className="flex items-center justify-between">
      <div className="flex-1 min-w-0 mr-4">
        <Typography variant="body" className="font-semibold text-gray-900 truncate">
          Start Your Mental Health Journey
        </Typography>
        <Typography variant="caption" className="text-gray-600">
          Free download • {trialConfig.duration.displayText} trial
        </Typography>
      </div>
      <Button
        variant="primary"
        size="sm"
        className="flex-shrink-0"
        onClick={() => {
          // Track mobile CTA click
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'mobile_cta_click', {
              position: 'floating_bar',
              type: 'download'
            });
          }
          
          // Detect platform and redirect
          const userAgent = navigator.userAgent.toLowerCase();
          const isIOS = /ipad|iphone|ipod/.test(userAgent);
          const isAndroid = /android/.test(userAgent);
          
          if (isIOS) {
            window.open(siteConfig.links.appStore, '_blank');
          } else if (isAndroid) {
            window.open(siteConfig.links.playStore, '_blank');
          } else {
            // Default to App Store for other devices
            window.open(siteConfig.links.appStore, '_blank');
          }
        }}
      >
        Download Free
      </Button>
    </div>
  );
};

// Crisis CTA variant
const CrisisCTA: React.FC = () => {
  return (
    <div className="flex items-center justify-between bg-clinical-warning text-white p-3 rounded-lg">
      <div className="flex items-center flex-1 min-w-0 mr-4">
        <svg 
          className="w-5 h-5 mr-2 text-white animate-pulse flex-shrink-0" 
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path 
            fillRule="evenodd" 
            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" 
            clipRule="evenodd" 
          />
        </svg>
        <div className="min-w-0">
          <Typography variant="body" className="font-semibold text-white truncate">
            Crisis Support Available
          </Typography>
          <Typography variant="caption" className="text-white/90">
            24/7 help is just a tap away
          </Typography>
        </div>
      </div>
      <Button
        variant="secondary"
        size="sm"
        className="flex-shrink-0 bg-white text-clinical-warning hover:bg-gray-100"
        onClick={() => {
          // Track crisis CTA click
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'crisis_cta_click', {
              position: 'mobile_bar',
              type: 'hotline'
            });
          }
          
          // Call 988 directly
          window.location.href = 'tel:988';
        }}
      >
        Call 988
      </Button>
    </div>
  );
};

// Simple CTA variant
const SimpleCTA: React.FC = () => {
  return (
    <div className="text-center">
      <Button
        variant="primary"
        size="lg"
        className="w-full"
        onClick={() => {
          // Track simple CTA click
          if (typeof window !== 'undefined' && window.gtag) {
            window.gtag('event', 'mobile_cta_click', {
              position: 'floating_bar',
              type: 'simple'
            });
          }
          
          // Scroll to pricing or download section
          const pricingSection = document.getElementById('pricing');
          if (pricingSection) {
            pricingSection.scrollIntoView({ 
              behavior: 'smooth',
              block: 'start'
            });
          }
        }}
      >
        Get Started Free
      </Button>
    </div>
  );
};

// Hook for managing CTA bar visibility
export const useMobileCTABar = (threshold = 100) => {
  const [isVisible, setIsVisible] = React.useState(false);

  React.useEffect(() => {
    const handleScroll = () => {
      const scrolled = window.scrollY > threshold;
      setIsVisible(scrolled);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Check initial state
    
    return () => window.removeEventListener('scroll', handleScroll);
  }, [threshold]);

  return { isVisible };
};