'use client';

/**
 * FullMind Hero Section
 * Clinical-grade hero with therapeutic messaging and crisis accessibility
 */

import React from 'react';
import { Container, Typography, Button, PhoneMockup, DownloadButtons } from '@/components/ui';
import { cn } from '@/lib/utils';
import { heroContent } from '@/config/site';

interface HeroProps {
  className?: string;
  variant?: 'default' | 'clinical' | 'therapist';
  showPhoneMockup?: boolean;
  'data-testid'?: string;
}

export const Hero: React.FC<HeroProps> = ({
  className,
  variant = 'default',
  showPhoneMockup = true,
  'data-testid': testId,
}) => {
  // Optimize hero classes for LCP performance
  const sectionClasses = cn(
    // Critical styling for above-fold rendering
    'hero-critical',
    
    // Clinical variant - optimized gradients
    variant === 'clinical' && 'bg-gradient-to-br from-clinical-safe/5 to-white',
    
    // Therapist variant
    variant === 'therapist' && 'bg-gradient-to-br from-primary-50 to-white',
    
    className
  );

  return (
    <section className={sectionClasses} data-testid={testId}>
      <Container className="container-critical">
        <div className="hero-grid">
          {/* Content Column */}
          <div className="max-w-xl mx-auto lg:mx-0">
            {/* Crisis Support Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-bg-clinical text-text-clinical border border-border-clinical mb-8 theme-transition">
              <div className="w-2 h-2 bg-text-clinical rounded-full mr-2 animate-pulse-gentle"></div>
              <Typography 
                variant="caption" 
                className="font-medium text-text-clinical"
              >
                24/7 Crisis Support Available - Call 988
              </Typography>
            </div>

            {/* Main Headline */}
            <Typography 
              variant="h1" 
              className="text-4xl lg:text-5xl xl:text-6xl font-bold text-text-primary mb-6 leading-tight theme-transition"
              element="h1"
            >
              {heroContent.headline}
            </Typography>

            {/* Subheadline */}
            <Typography 
              variant="body" 
              className="text-xl text-text-secondary mb-6 leading-relaxed theme-transition"
              element="p"
            >
              {heroContent.subheadline}
            </Typography>

            {/* Therapeutic Benefits */}
            <div className="mb-8">
              <ul className="space-y-3">
                {heroContent.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start">
                    <svg 
                      className="w-6 h-6 text-text-clinical mr-3 mt-0.5 flex-shrink-0 theme-transition" 
                      fill="currentColor" 
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <Typography variant="body" className="text-text-primary font-medium theme-transition">
                      {benefit}
                    </Typography>
                  </li>
                ))}
              </ul>
            </div>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <Button
                variant="primary"
                size="lg"
                href="/get-started"
                className="flex-shrink-0"
              >
                {heroContent.cta.primary}
              </Button>
              <Button
                variant="outline"
                size="lg"
                href="#demo"
                className="flex-shrink-0"
              >
                <svg 
                  className="w-5 h-5 mr-2" 
                  fill="currentColor" 
                  viewBox="0 0 20 20"
                  aria-hidden="true"
                >
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                </svg>
                {heroContent.cta.secondary}
              </Button>
            </div>

            {/* Download App Buttons */}
            <div className="mb-8">
              <Typography variant="caption" className="text-text-tertiary mb-4 block theme-transition">
                Or download our app directly:
              </Typography>
              <DownloadButtons 
                variant="large" 
                orientation="horizontal"
                className="flex-shrink-0"
              />
            </div>

            {/* Trust Indicator */}
            <div className="flex items-center">
              <div className="flex -space-x-2 mr-4">
                {/* Avatar placeholders representing users */}
                {[1, 2, 3, 4, 5].map((i) => (
                  <div 
                    key={i}
                    className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full border-2 border-white flex items-center justify-center"
                  >
                    <Typography variant="caption" className="text-white font-bold text-xs">
                      {String.fromCharCode(65 + i)}
                    </Typography>
                  </div>
                ))}
                <div className="w-8 h-8 bg-gray-100 rounded-full border-2 border-white flex items-center justify-center">
                  <Typography variant="caption" className="text-gray-500 font-bold text-xs">
                    +
                  </Typography>
                </div>
              </div>
              <Typography variant="body" className="text-text-secondary theme-transition">
                {heroContent.trust}
              </Typography>
            </div>

            {/* Clinical Validation Badge */}
            {variant === 'clinical' && (
              <div className="mt-8 p-4 bg-surface-elevated rounded-lg shadow-soft border border-border-clinical theme-transition">
                <div className="flex items-center mb-2">
                  <svg 
                    className="w-5 h-5 text-text-clinical mr-2 theme-transition" 
                    fill="currentColor" 
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <Typography variant="body" className="font-semibold text-text-clinical theme-transition">
                    Clinically Validated
                  </Typography>
                </div>
                <Typography variant="caption" className="text-text-secondary theme-transition">
                  Based on peer-reviewed MBCT research with proven effectiveness in reducing depression relapse by 43%
                </Typography>
              </div>
            )}
          </div>

          {/* Phone Mockup Column */}
          {showPhoneMockup && (
            <div className="relative">
              {/* Main Phone Mockup with floating animation */}
              <div className="relative transform lg:rotate-6 lg:scale-110 xl:scale-125 animate-float">
                <PhoneMockup 
                  variant="demo"
                  theme="morning"
                  autoPlay
                  interval={6000}
                  className=""
                />
              </div>
              
              {/* Floating Clinical Features */}
              <div className="hidden lg:block">
                <ClinicallFeatureBadge
                  text="Body Scan Practice"
                  position="top-left"
                  theme="morning"
                />
                <ClinicallFeatureBadge
                  text="Crisis Detection"
                  position="top-right"
                  theme="clinical"
                />
                <ClinicallFeatureBadge
                  text="MBCT Protocol"
                  position="bottom-left"
                  theme="midday"
                />
                <ClinicallFeatureBadge
                  text="Progress Tracking"
                  position="bottom-right"
                  theme="evening"
                />
              </div>
            </div>
          )}
        </div>
      </Container>

      {/* Background Decorations - Theme-aware */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-theme-primary/20 rounded-full blur-3xl theme-transition"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-text-clinical/10 rounded-full blur-3xl theme-transition"></div>
      </div>
    </section>
  );
};

// Clinical Feature Badge Component
interface ClinicalFeatureBadgeProps {
  text: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  theme: 'morning' | 'midday' | 'evening' | 'clinical';
}

const ClinicallFeatureBadge: React.FC<ClinicalFeatureBadgeProps> = ({
  text,
  position,
  theme
}) => {
  const themeColors = {
    morning: 'bg-morning-primary text-white',
    midday: 'bg-midday-primary text-white',
    evening: 'bg-evening-primary text-white',
    clinical: 'bg-clinical-safe text-white'
  };

  const positionClasses = {
    'top-left': 'absolute top-8 -left-8',
    'top-right': 'absolute top-16 -right-12',
    'bottom-left': 'absolute bottom-16 -left-12',
    'bottom-right': 'absolute bottom-8 -right-8'
  };

  return (
    <div 
      className={cn(
        'px-4 py-2 rounded-full shadow-medium',
        'transform -rotate-12 hover:rotate-0 transition-transform duration-300',
        'animate-fade-in',
        themeColors[theme],
        positionClasses[position]
      )}
    >
      <Typography 
        variant="caption" 
        className="font-medium text-xs whitespace-nowrap"
      >
        {text}
      </Typography>
    </div>
  );
};