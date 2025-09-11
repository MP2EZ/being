'use client';

/**
 * FullMind Website - Home Page
 * Clinical-grade mental health platform showcase with tab-based navigation
 */

import React, { useState } from 'react';
import { 
  Header,
  Hero, 
  TrustIndicators, 
  Features, 
  Clinical,
  Pricing,
  Footer,
  MobileCTABar
} from '@/components';
import { CriticalContent } from '@/components/ui/PerformanceOptimized';
import { cn } from '@/lib/utils';

type TabSection = 'overview' | 'features' | 'clinical' | 'pricing' | 'therapists';

const tabSections = [
  { id: 'overview' as const, label: 'Overview', description: 'Clinical MBCT platform overview' },
  { id: 'features' as const, label: 'Features', description: 'Daily mental health practices' },
  { id: 'clinical' as const, label: 'Clinical Evidence', description: 'Evidence-based outcomes' },
  { id: 'pricing' as const, label: 'Pricing', description: 'Accessible mental health support' },
  { id: 'therapists' as const, label: 'For Therapists', description: 'Professional tools and monitoring' }
];

// For Therapists Tab Content
const TherapistsTab = () => {
  return (
    <div className="py-24 bg-gradient-to-b from-bg-primary to-bg-clinical theme-transition">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-text-primary mb-6 theme-transition">
            For Mental Health Professionals
          </h2>
          <p className="text-xl text-text-secondary max-w-3xl mx-auto theme-transition">
            Enhance your practice with clinical-grade MBCT tools, client progress monitoring, and evidence-based therapeutic resources.
          </p>
        </div>
        
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[
            {
              title: 'Client Progress Tracking',
              description: 'Monitor client engagement and therapeutic outcomes with detailed analytics.'
            },
            {
              title: 'MBCT Protocol Compliance',
              description: 'Ensure evidence-based practice with validated therapeutic protocols.'
            },
            {
              title: 'Crisis Intervention Tools',
              description: 'Real-time crisis detection and professional intervention capabilities.'
            },
            {
              title: 'Therapeutic Resource Library',
              description: 'Access curated MBCT exercises and clinical assessment tools.'
            },
            {
              title: 'Professional Dashboard',
              description: 'Comprehensive view of client progress and treatment effectiveness.'
            },
            {
              title: 'HIPAA Compliance',
              description: 'Secure, compliant platform for sensitive mental health data.'
            }
          ].map((feature, index) => (
            <div key={index} className="theme-card p-6 rounded-xl hover:shadow-theme-medium transition-shadow">
              <h3 className="text-xl font-semibold text-text-primary mb-3 theme-transition">
                {feature.title}
              </h3>
              <p className="text-text-secondary theme-transition">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
        
        <div className="mt-16 text-center">
          <div className="bg-bg-clinical rounded-2xl p-8 max-w-2xl mx-auto theme-transition">
            <h3 className="text-2xl font-bold text-text-primary mb-4 theme-transition">
              Professional Beta Access
            </h3>
            <p className="text-text-secondary mb-6 theme-transition">
              Join our professional beta program to access advanced clinical features and help shape the future of digital MBCT.
            </p>
            <button className="bg-theme-primary text-white px-8 py-3 rounded-lg font-medium hover:opacity-90 transition-all theme-transition">
              Request Beta Access
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  const [activeTab, setActiveTab] = useState<TabSection>('overview');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <>
            {/* Hero Section - Critical LCP content */}
            <CriticalContent>
              <Hero
                variant="default"
                showPhoneMockup={true}
                data-testid="hero-section"
              />
            </CriticalContent>
            
            {/* Trust Indicators */}
            <TrustIndicators
              variant="default"
              showBackground={true}
              data-testid="trust-section"
            />
          </>
        );
      
      case 'features':
        return (
          <Features
            variant="default"
            layout="grid"
            data-testid="features-section"
          />
        );
      
      case 'clinical':
        return (
          <Clinical
            variant="default"
            data-testid="clinical-section"
          />
        );
      
      case 'pricing':
        return (
          <Pricing
            variant="default"
            showAnnualDiscount={true}
            data-testid="pricing-section"
          />
        );
      
      case 'therapists':
        return <TherapistsTab />;
      
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary theme-transition">
      {/* Header with Navigation - Critical above-fold content */}
      <CriticalContent>
        <Header />
      </CriticalContent>
      
      {/* Tab Navigation */}
      <nav className="sticky top-16 z-40 bg-bg-primary/95 backdrop-blur-sm border-b border-border-primary theme-transition" aria-label="Section navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex space-x-8 overflow-x-auto">
            {tabSections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveTab(section.id)}
                className={cn(
                  'relative px-1 py-4 text-sm font-medium transition-colors duration-200 whitespace-nowrap theme-transition',
                  'focus:outline-none focus:ring-2 focus:ring-border-focus focus:ring-offset-2',
                  activeTab === section.id
                    ? 'text-theme-primary border-b-2 border-theme-primary'
                    : 'text-text-secondary hover:text-text-primary border-b-2 border-transparent hover:border-border-secondary'
                )}
                aria-current={activeTab === section.id ? 'page' : undefined}
                title={section.description}
              >
                {section.label}
              </button>
            ))}
          </div>
        </div>
      </nav>
      
      {/* Tab Content */}
      <main id="main-content" role="main" aria-label="FullMind website main content">
        {renderTabContent()}
      </main>
      
      {/* Footer */}
      <Footer
        variant="default"
        showCrisisResources={true}
        data-testid="footer-section"
      />
      
      {/* Mobile CTA Bar */}
      <MobileCTABar
        variant="download"
        showOnScroll={true}
        threshold={500}
        data-testid="mobile-cta-bar"
      />
    </div>
  );
}
