'use client';

/**
 * FullMind Trust Indicators Section
 * Clinical validation, security, and accessibility badges
 */

import React from 'react';
import { Container, Typography, Card } from '@/components/ui';
import { cn } from '@/lib/utils';
import { trustIndicators } from '@/config/site';

interface TrustIndicatorsProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showBackground?: boolean;
  'data-testid'?: string;
}

export const TrustIndicators: React.FC<TrustIndicatorsProps> = ({
  className,
  variant = 'default',
  showBackground = true,
  'data-testid': testId,
}) => {
  const sectionClasses = cn(
    // Base styling
    'py-16 lg:py-24',
    
    // Background variants
    showBackground && 'bg-gray-50',
    
    className
  );

  return (
    <section className={sectionClasses} data-testid={testId}>
      <Container>
        {/* Section Header */}
        <div className="text-center mb-12">
          <Typography 
            variant="h2" 
            className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4"
            element="h2"
          >
            Built for Clinical Excellence
          </Typography>
          <Typography 
            variant="body" 
            className="text-xl text-gray-600 max-w-3xl mx-auto"
            element="p"
          >
            FullMind meets the highest standards for mental health technology, 
            ensuring safe, effective, and accessible care for everyone.
          </Typography>
        </div>

        {/* Trust Indicators Grid */}
        <div 
          className={cn(
            "grid gap-6",
            variant === 'compact' ? 'grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
          )}
        >
          {trustIndicators.map((indicator, index) => (
            <TrustIndicatorCard
              key={indicator.id}
              indicator={indicator}
              variant={variant}
              index={index}
            />
          ))}
        </div>

        {/* Clinical Validation Details */}
        {variant === 'detailed' && (
          <div className="mt-16 bg-white rounded-2xl shadow-medium p-8">
            <div className="grid lg:grid-cols-3 gap-8">
              {/* Research Base */}
              <div className="text-center">
                <div className="w-16 h-16 bg-clinical-safe/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <Typography variant="h4" className="font-bold text-gray-900 mb-2">
                  20+ Years
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Of peer-reviewed MBCT research backing our clinical approach
                </Typography>
              </div>

              {/* Clinical Validation */}
              <div className="text-center">
                <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1V8z" clipRule="evenodd" />
                  </svg>
                </div>
                <Typography variant="h4" className="font-bold text-gray-900 mb-2">
                  43% Reduction
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  In depression relapse rates demonstrated in clinical trials
                </Typography>
              </div>

              {/* Accessibility Standard */}
              <div className="text-center">
                <div className="w-16 h-16 bg-evening-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-evening-primary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <Typography variant="h4" className="font-bold text-gray-900 mb-2">
                  WCAG AA
                </Typography>
                <Typography variant="body" className="text-gray-600">
                  Compliant accessibility ensuring inclusive mental health care
                </Typography>
              </div>
            </div>
          </div>
        )}
      </Container>
    </section>
  );
};

// Trust Indicator Card Component
interface TrustIndicatorCardProps {
  indicator: {
    id: string;
    title: string;
    description: string;
    metric?: string;
    icon?: string;
  };
  variant: 'default' | 'compact' | 'detailed';
  index: number;
}

const TrustIndicatorCard: React.FC<TrustIndicatorCardProps> = ({
  indicator,
  variant,
  index
}) => {
  const iconConfig = getTrustIndicatorIcon(indicator.id);
  
  return (
    <Card
      className={cn(
        "text-center transition-all duration-300 hover:shadow-medium hover:-translate-y-1",
        "bg-white border border-gray-200",
        variant === 'compact' && 'p-4',
        variant !== 'compact' && 'p-6 lg:p-8'
      )}
      style={{
        animationDelay: `${index * 100}ms`
      }}
    >
      {/* Icon */}
      <div 
        className={cn(
          "rounded-2xl flex items-center justify-center mx-auto mb-4",
          variant === 'compact' ? 'w-12 h-12' : 'w-16 h-16',
          iconConfig.bgColor
        )}
      >
        <svg 
          className={cn(
            iconConfig.textColor,
            variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'
          )}
          fill="currentColor" 
          viewBox="0 0 20 20"
          aria-hidden="true"
        >
          <path {...iconConfig.path} />
        </svg>
      </div>

      {/* Metric Display */}
      {indicator.metric && (
        <Typography 
          variant="h3" 
          className={cn(
            "font-bold mb-2",
            variant === 'compact' ? 'text-xl' : 'text-2xl lg:text-3xl',
            iconConfig.textColor
          )}
        >
          {indicator.metric}
        </Typography>
      )}

      {/* Content */}
      <Typography 
        variant={variant === 'compact' ? 'h6' : 'h5'} 
        className="font-bold text-gray-900 mb-2"
        element="h3"
      >
        {indicator.title}
      </Typography>
      
      {variant !== 'compact' && (
        <Typography 
          variant="body" 
          className="text-gray-600 leading-relaxed"
          element="p"
        >
          {indicator.description}
        </Typography>
      )}
    </Card>
  );
};

// Trust Indicator Icon Configuration
function getTrustIndicatorIcon(id: string) {
  const icons = {
    'evidence-based': {
      bgColor: 'bg-clinical-safe/10',
      textColor: 'text-clinical-safe',
      path: {
        fillRule: "evenodd" as const,
        d: "M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1V8zm8 0a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1h-6a1 1 0 01-1-1V8z",
        clipRule: "evenodd" as const
      }
    },
    'private-secure': {
      bgColor: 'bg-primary-100',
      textColor: 'text-primary-600',
      path: {
        fillRule: "evenodd" as const,
        d: "M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z",
        clipRule: "evenodd" as const
      }
    },
    'clinical-grade': {
      bgColor: 'bg-morning-primary/10',
      textColor: 'text-morning-primary',
      path: {
        fillRule: "evenodd" as const,
        d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z",
        clipRule: "evenodd" as const
      }
    },
    'completion-rate': {
      bgColor: 'bg-evening-primary/10',
      textColor: 'text-evening-primary',
      path: {
        fillRule: "evenodd" as const,
        d: "M3 4a1 1 0 000 2v9a2 2 0 002 2h6a2 2 0 002-2V6a1 1 0 100-2H3zm6.5 3a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zm-3 2.5a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v4a.5.5 0 01-1 0V10h-1v3.5a.5.5 0 01-1 0v-4z",
        clipRule: "evenodd" as const
      }
    }
  };

  return icons[id as keyof typeof icons] || icons['evidence-based'];
}