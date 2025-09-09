'use client';

/**
 * FullMind Pricing Section
 * Conversion-focused pricing with app store integration
 */

import React from 'react';
import { Container, Typography, Button, Card, DownloadButtons } from '@/components/ui';
import { cn } from '@/lib/utils';
import { pricingPlans, siteConfig } from '@/config/site';

// Extend window interface for Google Analytics
declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export interface PricingProps {
  className?: string;
  variant?: 'default' | 'compact' | 'detailed';
  showAnnualDiscount?: boolean;
  'data-testid'?: string;
}

export const Pricing: React.FC<PricingProps> = ({
  className,
  variant = 'default',
  'data-testid': testId,
}) => {

  const sectionClasses = cn(
    // Base styling
    'py-24 bg-gradient-to-b from-white to-gray-50',
    
    // Variant styling
    variant === 'compact' && 'py-16',
    variant === 'detailed' && 'py-32',
    
    className
  );

  // Calculate savings between monthly and annual plans
  const calculateAnnualSavings = () => {
    const monthlyPlan = pricingPlans.find(plan => plan.id === 'monthly');
    const annualPlan = pricingPlans.find(plan => plan.id === 'annual');
    
    if (!monthlyPlan || !annualPlan) return null;
    
    const monthlyCost = monthlyPlan.price * 12;
    const annualCost = annualPlan.price;
    const savings = monthlyCost - annualCost;
    
    return Math.round(savings);
  };

  const getDisplayPrice = (plan: typeof pricingPlans[number]) => {
    if (plan.price === 0) return 'Free';
    
    if (plan.interval === 'month') {
      return `$${plan.price}/mo`;
    } else {
      return `$${plan.price}/year`;
    }
  };

  const getMonthlyEquivalent = (plan: typeof pricingPlans[number]) => {
    if (plan.interval === 'year') {
      return Math.round((plan.price / 12) * 100) / 100;
    }
    return null;
  };

  const annualSavings = calculateAnnualSavings();

  return (
    <section 
      id="pricing" 
      className={sectionClasses} 
      data-testid={testId}
    >
      <Container>
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <Typography 
            variant="h2" 
            className="mb-6"
            element="h2"
          >
            Choose Your Plan
          </Typography>
          <Typography 
            variant="lead" 
            className="text-gray-600 mb-8"
            element="p"
          >
            Access the complete MBCT program designed by clinical experts. Start with a 7-day free trial, no credit card required.
          </Typography>

          {/* Savings Callout */}
          {annualSavings && (
            <div className="inline-flex items-center px-4 py-2 bg-green-50 text-green-700 rounded-full border border-green-200 mb-8">
              <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <Typography variant="caption" className="font-medium">
                Save ${annualSavings} per year with annual billing
              </Typography>
            </div>
          )}
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {pricingPlans.map((plan) => (
            <PricingCard
              key={plan.id}
              plan={plan}
              displayPrice={getDisplayPrice(plan)}
              monthlyEquivalent={getMonthlyEquivalent(plan)}
              annualSavings={annualSavings}
              variant={variant}
            />
          ))}
        </div>

        {/* Bottom CTA Section */}
        <div className="mt-16 text-center">
          <div className="bg-primary-50 rounded-2xl p-8 max-w-4xl mx-auto">
            <Typography variant="h3" className="mb-4" element="h3">
              Ready to Transform Your Mental Health?
            </Typography>
            <Typography variant="body" className="text-gray-600 mb-8" element="p">
              Join thousands of people already using FullMind to build lasting resilience through evidence-based practices.
            </Typography>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <DownloadButtons 
                variant="large"
                className="justify-center"
              />
              <div className="text-center sm:text-left">
                <Typography variant="caption" className="text-gray-500 block">
                  Free download • No credit card required
                </Typography>
                <Typography variant="caption" className="text-gray-500">
                  Start your 7-day free trial today
                </Typography>
              </div>
            </div>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="mt-12 pt-8 border-t border-gray-200">
          <div className="flex flex-wrap justify-center items-center gap-8 text-center">
            {[
              { icon: '🏥', text: 'Clinically Validated' },
              { icon: '🔒', text: 'HIPAA Ready' },
              { icon: '♿', text: 'Fully Accessible' },
              { icon: '🆘', text: '24/7 Crisis Support' }
            ].map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <span className="text-xl" role="img" aria-hidden="true">
                  {item.icon}
                </span>
                <Typography variant="caption" className="text-gray-600 font-medium">
                  {item.text}
                </Typography>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
};

// Individual Pricing Card Component
interface PricingCardProps {
  plan: typeof pricingPlans[number];
  displayPrice: string;
  monthlyEquivalent: number | null;
  annualSavings: number | null;
  variant: 'default' | 'compact' | 'detailed';
}

const PricingCard: React.FC<PricingCardProps> = ({
  plan,
  displayPrice,
  monthlyEquivalent,
  annualSavings,
  variant,
}) => {
  // Note: variant will be used for future styling variants
  console.log('Pricing card variant:', variant);
  const isHighlighted = plan.highlighted;
  const isAnnualPlan = plan.id === 'annual';

  const cardClasses = cn(
    // Base card styling
    'relative h-full',
    
    // Highlighted card styling
    isHighlighted && [
      'ring-2 ring-primary-600 shadow-xl scale-105',
      'bg-white border-primary-600'
    ],
    
    // Non-highlighted cards
    !isHighlighted && 'hover:shadow-lg transition-shadow duration-200'
  );

  return (
    <Card className={cardClasses}>
      {/* Badge */}
      {plan.badge && (
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
          <div className="bg-primary-600 text-white px-4 py-1 rounded-full text-sm font-medium">
            {plan.badge}
          </div>
        </div>
      )}

      <div className="p-8">
        {/* Plan Header */}
        <div className="text-center mb-8">
          <Typography variant="h4" className="mb-2" element="h3">
            {plan.name}
          </Typography>
          <Typography variant="body" className="text-gray-600 mb-6" element="p">
            {plan.description}
          </Typography>

          {/* Price */}
          <div className="mb-4">
            <div className="flex items-baseline justify-center">
              <Typography 
                variant="h2" 
                className="text-primary-600"
                element="span"
              >
                {displayPrice}
              </Typography>
            </div>
            
            {/* Monthly equivalent for annual plan */}
            {monthlyEquivalent && (
              <div className="mt-2">
                <Typography variant="body" className="text-gray-500">
                  (${monthlyEquivalent}/month billed annually)
                </Typography>
              </div>
            )}
            
            {/* Savings highlight for annual plan */}
            {isAnnualPlan && annualSavings && (
              <div className="mt-3">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Save ${annualSavings} per year
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Features List */}
        <ul className="space-y-3 mb-8">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start">
              <svg 
                className="w-5 h-5 text-primary-600 mt-0.5 mr-3 flex-shrink-0" 
                fill="currentColor" 
                viewBox="0 0 20 20"
                aria-hidden="true"
              >
                <path 
                  fillRule="evenodd" 
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                  clipRule="evenodd" 
                />
              </svg>
              <Typography variant="body" className="text-gray-700">
                {feature}
              </Typography>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <div className="space-y-4">
          <Button
            variant={isHighlighted ? 'primary' : 'outline'}
            size="lg"
            className="w-full"
            onClick={() => {
              // Track pricing CTA click
              if (typeof window !== 'undefined' && window.gtag) {
                window.gtag('event', 'pricing_cta_click', {
                  plan: plan.id,
                  price: displayPrice,
                  billing_cycle: plan.interval
                });
              }
              
              // Smart platform detection and redirect
              const userAgent = navigator.userAgent.toLowerCase();
              const isIOS = /ipad|iphone|ipod/.test(userAgent);
              const isAndroid = /android/.test(userAgent);
              
              if (isIOS) {
                window.open(siteConfig.links.appStore, '_blank');
              } else if (isAndroid) {
                window.open(siteConfig.links.playStore, '_blank');
              } else {
                // Default to App Store for desktop/other devices
                window.open(siteConfig.links.appStore, '_blank');
              }
            }}
          >
            {plan.cta}
          </Button>
          
          {/* Secondary info */}
          <div className="text-center">
            <Typography variant="caption" className="text-gray-500">
              7-day free trial • No credit card required
            </Typography>
          </div>
        </div>
      </div>
    </Card>
  );
};