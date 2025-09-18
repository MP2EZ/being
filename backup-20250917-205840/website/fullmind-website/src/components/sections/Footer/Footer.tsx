'use client';

/**
 * FullMind Footer Section
 * Clinical-grade footer with crisis resources and accessibility
 */

import React from 'react';
import Link from 'next/link';
import { Container, Typography, DownloadButtons } from '@/components/ui';
import { cn } from '@/lib/utils';
import { siteConfig, footerNavigation, crisisResources } from '@/config/site';

interface FooterProps {
  className?: string;
  variant?: 'default' | 'minimal' | 'clinical';
  showCrisisResources?: boolean;
  'data-testid'?: string;
}

export const Footer: React.FC<FooterProps> = ({
  className,
  variant = 'default',
  showCrisisResources = true,
  'data-testid': testId,
}) => {
  const footerClasses = cn(
    // Base styling with theme support
    'bg-surface-depressed text-text-inverse theme-transition',
    
    // Clinical variant
    variant === 'clinical' && 'bg-clinical-safe text-white',
    
    className
  );

  return (
    <footer className={footerClasses} data-testid={testId}>
      {/* Crisis Resources Bar */}
      {showCrisisResources && <CrisisResourcesBar />}
      
      {/* Main Footer Content */}
      <div className="py-16">
        <Container>
          <div className="grid lg:grid-cols-4 gap-8 lg:gap-12">
            {/* Brand Column */}
            <div className="lg:col-span-1">
              <FooterBrand />
            </div>

            {/* Product Column */}
            <div className="lg:col-span-1">
              <FooterNavColumn 
                title="Product" 
                links={footerNavigation.filter(item => 
                  ['Features', 'Clinical Evidence', 'Pricing'].includes(item.title)
                )} 
              />
            </div>

            {/* Resources Column */}
            <div className="lg:col-span-1">
              <FooterNavColumn 
                title="Resources" 
                links={footerNavigation.filter(item => 
                  ['Help Center', 'Crisis Resources', 'About'].includes(item.title)
                )} 
              />
            </div>

            {/* Company Column */}
            <div className="lg:col-span-1">
              <FooterCompanyColumn />
            </div>
          </div>
        </Container>
      </div>

      {/* Footer Bottom */}
      <FooterBottom />
    </footer>
  );
};

// Crisis Resources Bar Component
const CrisisResourcesBar: React.FC = () => {
  return (
    <div id="crisis-resources" className="bg-clinical-warning text-white py-4" role="region" aria-label="Crisis support resources">
      <Container>
        <div className="flex flex-col lg:flex-row items-center justify-center lg:justify-between space-y-3 lg:space-y-0 text-center lg:text-left">
          <div className="flex items-center">
            <svg 
              className="w-5 h-5 mr-3 animate-pulse" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <Typography variant="body" className="font-semibold text-sm">
              Crisis Support Available 24/7 • Help is Always Available
            </Typography>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center space-y-2 sm:space-y-0 sm:space-x-6">
            {crisisResources.slice(0, 2).map((resource) => (
              <a
                key={resource.id}
                href={resource.type === 'hotline' ? `tel:${resource.contact}` : `sms:${resource.contact}`}
                className="flex items-center px-3 py-1 bg-white/20 hover:bg-white/30 rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label={`${resource.name} - Call ${resource.contact}`}
              >
                <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  {resource.type === 'hotline' ? (
                    <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
                  ) : (
                    <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                  )}
                </svg>
                <Typography variant="caption" className="font-medium">
                  {resource.contact}
                </Typography>
              </a>
            ))}
            
            {/* All Crisis Resources Link */}
            <a
              href="/crisis"
              className="text-white/90 hover:text-white underline text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 rounded px-1"
            >
              All Resources →
            </a>
          </div>
        </div>
      </Container>
    </div>
  );
};

// Footer Brand Component
const FooterBrand: React.FC = () => {
  return (
    <div>
      {/* Logo */}
      <Link 
        href="/" 
        className="inline-flex items-center space-x-3 mb-6 focus:outline-none focus:ring-2 focus:ring-white rounded-lg p-1"
        aria-label="FullMind - Return to homepage"
      >
        <div className="h-8 w-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
          <Typography 
            variant="h6" 
            className="text-white font-bold text-sm"
            element="span"
          >
            FM
          </Typography>
        </div>
        <Typography 
          variant="h5" 
          className="font-bold text-white"
          element="span"
        >
          FullMind
        </Typography>
      </Link>

      {/* Mission Statement */}
      <Typography 
        variant="body" 
        className="text-text-tertiary leading-relaxed mb-6 theme-transition"
        element="p"
      >
        {siteConfig.description}
      </Typography>

      {/* Clinical Badge */}
      <div className="inline-flex items-center px-3 py-2 bg-clinical-safe/20 rounded-full mb-6">
        <svg className="w-4 h-4 mr-2 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <Typography variant="caption" className="font-medium text-clinical-safe">
          Clinically Validated
        </Typography>
      </div>

      {/* Social Links */}
      <div>
        <Typography 
          variant="body" 
          className="font-medium text-white mb-3 text-sm"
        >
          Connect With Us
        </Typography>
        <div className="flex space-x-4">
          {[
            { name: 'Twitter', icon: TwitterIcon, url: 'https://twitter.com/fullmind' },
            { name: 'LinkedIn', icon: LinkedInIcon, url: 'https://linkedin.com/company/fullmind' },
            { name: 'GitHub', icon: GitHubIcon, url: 'https://github.com/fullmind-app' }
          ].map(({ name, icon: Icon, url }) => (
            <a
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-text-tertiary hover:text-text-inverse transition-colors duration-200 focus:outline-none focus:text-text-inverse theme-transition"
              aria-label={`Follow FullMind on ${name}`}
            >
              <Icon className="w-5 h-5" />
            </a>
          ))}
        </div>
      </div>
    </div>
  );
};

// Footer Company Column Component
const FooterCompanyColumn: React.FC = () => {
  const companyLinks = footerNavigation.filter(item => 
    ['Contact', 'Privacy Policy', 'Terms of Service', 'HIPAA Notice'].includes(item.title)
  );

  return (
    <div>
      <Typography 
        variant="h6" 
        className="font-semibold text-white mb-4"
        element="h3"
      >
        Company
      </Typography>
      
      {/* Company links */}
      <ul className="space-y-3 mb-6">
        {companyLinks.map((link) => (
          <li key={link.href}>
            <Link 
              href={link.href}
              className="text-text-tertiary hover:text-text-inverse transition-colors duration-200 focus:outline-none focus:text-text-inverse theme-transition"
            >
              <Typography variant="body" className="text-sm">
                {link.title}
              </Typography>
            </Link>
          </li>
        ))}
      </ul>

      {/* Download CTA */}
      <div className="mt-6">
        <Typography 
          variant="body" 
          className="font-medium text-white mb-3 text-sm"
        >
          Download FullMind
        </Typography>
        <DownloadButtons 
          variant="compact"
          orientation="vertical"
          theme="dark"
          className="space-y-2"
        />
      </div>
    </div>
  );
};

// Footer Navigation Column Component
interface FooterNavColumnProps {
  title: string;
  links: typeof footerNavigation;
}

const FooterNavColumn: React.FC<FooterNavColumnProps> = ({ title, links }) => {
  return (
    <div>
      <Typography 
        variant="h6" 
        className="font-semibold text-white mb-4"
        element="h3"
      >
        {title}
      </Typography>
      <ul className="space-y-3">
        {links.map((link) => (
          <li key={link.href}>
            <Link 
              href={link.href}
              className="text-text-tertiary hover:text-text-inverse transition-colors duration-200 focus:outline-none focus:text-text-inverse theme-transition"
            >
              <Typography variant="body" className="text-sm">
                {link.title}
              </Typography>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};


// Footer Bottom Component
const FooterBottom: React.FC = () => {
  return (
    <div className="border-t border-border-primary py-6 theme-transition">
      <Container>
        <div className="flex flex-col lg:flex-row justify-between items-center space-y-4 lg:space-y-0">
          {/* Copyright */}
          <Typography variant="caption" className="text-text-tertiary theme-transition">
            © {new Date().getFullYear()} FullMind. All rights reserved.
          </Typography>

          {/* Compliance & Standards */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <Typography variant="caption" className="text-text-tertiary theme-transition">
                HIPAA Ready
              </Typography>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-clinical-safe" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0v-.5A1.5 1.5 0 0114.5 6c.526 0 .988-.27 1.256-.679a6.012 6.012 0 011.912 2.706A3.5 3.5 0 0116 11.5V16a1 1 0 01-1 1h-1a1 1 0 01-1-1v-2h-2v2a1 1 0 01-1 1H9a1 1 0 01-1-1v-4.5a3.5 3.5 0 01-1.668-3.473z" clipRule="evenodd" />
              </svg>
              <Typography variant="caption" className="text-text-tertiary theme-transition">
                WCAG AA
              </Typography>
            </div>
          </div>
        </div>
      </Container>
    </div>
  );
};

// Social Media Icons
const TwitterIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/>
  </svg>
);

const LinkedInIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

const GitHubIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24">
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);