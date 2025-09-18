'use client';

/**
 * FullMind Navigation Component
 * Clinical-grade navigation with crisis accessibility and therapeutic UX
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '../Button';
import { Typography } from '../Typography';
import { cn } from '@/lib/utils';
import { mainNavigation } from '@/config/site';
import { type NavigationItem } from '@/types';

interface NavigationProps {
  className?: string;
  variant?: 'default' | 'clinical';
  'data-testid'?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  className,
  variant = 'default',
  'data-testid': testId,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  // Handle scroll effect for nav styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const navClasses = cn(
    // Base styling
    'sticky top-0 z-50 w-full transition-all duration-300',
    
    // Background and backdrop
    'bg-white/95 backdrop-blur-md border-b',
    isScrolled ? 'border-gray-200 shadow-soft' : 'border-transparent',
    
    // Clinical variant
    variant === 'clinical' && 'bg-clinical-safe/10 border-clinical-safe/20',
    
    className
  );

  return (
    <nav className={navClasses} data-testid={testId}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center">
            <Link 
              href="/" 
              className="flex items-center space-x-3 focus:outline-none focus:ring-2 focus:ring-primary-500 rounded-lg p-1"
              aria-label="FullMind - Return to homepage"
            >
              {/* Logo placeholder - will be replaced with actual logo */}
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
                className="font-bold text-primary-600"
                element="span"
              >
                FullMind
              </Typography>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:block">
            <div className="ml-10 flex items-baseline space-x-8">
              {mainNavigation.map((item) => (
                <NavigationLink 
                  key={item.href} 
                  item={item} 
                  variant={variant}
                />
              ))}
            </div>
          </div>

          {/* Desktop CTA Buttons */}
          <div className="hidden md:flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              href="#download"
              className="text-primary-600 border-primary-300 hover:bg-primary-50"
            >
              Download App
            </Button>
            <Button
              variant="primary"
              size="sm"
              href="/get-started"
              className="bg-primary-500 hover:bg-primary-600"
            >
              Get Started
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              aria-expanded={isOpen}
              aria-label="Open main menu"
              data-testid="mobile-menu-button"
            >
              <span className="sr-only">Open main menu</span>
              {/* Hamburger icon */}
              <svg
                className={cn("h-6 w-6 transition-transform", isOpen && "rotate-90")}
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={isOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        <div
          className={cn(
            "md:hidden transition-all duration-300 ease-in-out",
            isOpen ? "opacity-100 max-h-96" : "opacity-0 max-h-0 overflow-hidden"
          )}
        >
          <div className="px-2 pt-2 pb-6 space-y-1 bg-white border-t border-gray-200">
            {mainNavigation.map((item) => (
              <MobileNavigationLink
                key={item.href}
                item={item}
                onClick={() => setIsOpen(false)}
              />
            ))}
            
            {/* Mobile CTA Section */}
            <div className="pt-4 space-y-2">
              <Button
                variant="outline"
                size="md"
                href="#download"
                className="w-full text-primary-600 border-primary-300"
                onClick={() => setIsOpen(false)}
              >
                Download App
              </Button>
              <Button
                variant="primary"
                size="md"
                href="/get-started"
                className="w-full bg-primary-500"
                onClick={() => setIsOpen(false)}
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Desktop Navigation Link Component
interface NavigationLinkProps {
  item: NavigationItem;
  variant: 'default' | 'clinical';
}

const NavigationLink: React.FC<NavigationLinkProps> = ({ item, variant }) => {
  const linkClasses = cn(
    // Base styling
    'px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200',
    
    // Default variant
    variant === 'default' && 'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    
    // Clinical variant
    variant === 'clinical' && 'text-clinical-safe hover:text-clinical-safe/80 hover:bg-clinical-safe/10',
    
    // Focus states
    'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
        title={item.description}
      >
        {item.title}
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClasses} title={item.description}>
      {item.title}
    </Link>
  );
};

// Mobile Navigation Link Component
interface MobileNavigationLinkProps {
  item: NavigationItem;
  onClick: () => void;
}

const MobileNavigationLink: React.FC<MobileNavigationLinkProps> = ({ 
  item, 
  onClick 
}) => {
  const linkClasses = cn(
    'block px-3 py-2 rounded-md text-base font-medium transition-colors duration-200',
    'text-gray-600 hover:text-gray-900 hover:bg-gray-100',
    'focus:outline-none focus:ring-2 focus:ring-primary-500'
  );

  const content = (
    <div>
      <div className="font-medium">{item.title}</div>
      {item.description && (
        <div className="text-sm text-gray-500 mt-1">
          {item.description}
        </div>
      )}
    </div>
  );

  if (item.external) {
    return (
      <a
        href={item.href}
        target="_blank"
        rel="noopener noreferrer"
        className={linkClasses}
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={item.href} className={linkClasses} onClick={onClick}>
      {content}
    </Link>
  );
};