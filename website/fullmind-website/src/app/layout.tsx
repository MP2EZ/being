import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import "../styles/critical.css";
import "../styles/accessibility.css";
import "../styles/performance.css";
import { AccessibilityProvider } from "@/contexts/AccessibilityContext";
import { PerformanceDashboard } from "@/components/ui/PerformanceDashboard/PerformanceDashboard";
// import { SkipLinks, CrisisButton } from "@/components/ui"; // TODO: Implement accessibility components

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: 'swap',
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    template: '%s | FullMind',
    default: 'FullMind - Clinical-Grade Mental Health Support',
  },
  description: 'Evidence-based MBCT practices and mental health tools designed for therapeutic effectiveness and complete accessibility.',
  keywords: ['mental health', 'MBCT', 'mindfulness', 'clinical therapy', 'accessibility', 'WCAG AA'],
  authors: [{ name: 'FullMind Team' }],
  creator: 'FullMind',
  publisher: 'FullMind',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code', // Add your verification code
  },
  category: 'healthcare',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5, // Allow zoom for accessibility
  userScalable: true, // Enable zoom for vision accessibility
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#40B5AD' },
    { media: '(prefers-color-scheme: dark)', color: '#2C8A82' },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        {/* Critical accessibility meta tags */}
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <meta name="format-detection" content="telephone=no" />
        
        {/* Preconnect to external resources */}
        <link rel="preconnect" href="https://fonts.googleapis.com" crossOrigin="anonymous" />
        
        {/* Crisis resources for emergency situations */}
        <meta name="crisis-hotline" content="988" />
        <meta name="emergency" content="911" />
        
        {/* Accessibility features declaration */}
        <meta name="accessibility-features" content="WCAG-AA, screen-reader-optimized, keyboard-navigation, high-contrast, reduced-motion" />
        
        {/* Skip to main content for screen readers */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Detect JavaScript and remove no-js class
              document.documentElement.classList.remove('no-js');
              document.documentElement.classList.add('js');
              
              // Early accessibility preference detection
              if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                document.documentElement.classList.add('reduce-motion');
              }
              if (window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches) {
                document.documentElement.classList.add('high-contrast');
              }
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased no-js bg-background text-foreground`}
        suppressHydrationWarning={true}
      >
        {/* Skip Links - First focusable elements for keyboard users */}
        {/* <SkipLinks /> TODO: Implement skip links component */}

        {/* Accessibility Context Provider */}
        <AccessibilityProvider
          defaultPreferences={{
            // Respect system preferences by default
            reduceMotion: false, // Will be detected by hook
            highContrast: false, // Will be detected by hook
            // Enable helpful defaults for mental health users
            focusIndicatorEnhanced: true,
            screenReaderOptimized: true,
          }}
        >
          {/* Emergency Crisis Button - Always accessible */}
          {/* <CrisisButton position="fixed" size="standard" /> TODO: Implement crisis button */}

          {/* Main application content */}
          <div id="app-root" className="min-h-screen">
            {children}
          </div>

          {/* Performance monitoring dashboard - Development only */}
          <PerformanceDashboard 
            enabled={typeof window !== 'undefined' && window.location.hostname === 'localhost'}
            position="bottom-right"
          />

          {/* Global announcements region for screen readers */}
          <div 
            id="global-announcements"
            aria-live="polite" 
            aria-atomic="true" 
            className="sr-only"
            data-testid="global-announcements"
          />

          {/* High-priority announcements region */}
          <div 
            id="urgent-announcements"
            aria-live="assertive" 
            aria-atomic="true" 
            className="sr-only"
            data-testid="urgent-announcements"
          />
        </AccessibilityProvider>

        {/* Clinical Performance Monitoring Initialization */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // Initialize clinical-grade performance monitoring
              window.initClinicalMonitoring = function() {
                // Clinical performance budgets
                const clinicalBudget = {
                  maxLCP: 2000,                    // <2s page load for mental health users
                  maxFID: 100,                     // <100ms interaction response
                  maxCLS: 0.1,                     // Minimal layout shifts for stability
                  maxCrisisResponseTime: 200,      // <200ms crisis button response
                  maxPageLoadTime: 2000,           // <2s total page load
                  maxNavigationTime: 500           // <500ms navigation between sections
                };
                
                // Track Core Web Vitals with clinical thresholds
                if ('PerformanceObserver' in window) {
                  // Largest Contentful Paint - Critical for first impression
                  new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                      const lcp = entry.startTime;
                      console.log('Clinical LCP:', Math.round(lcp) + 'ms', 
                        lcp > clinicalBudget.maxLCP ? '❌ EXCEEDS BUDGET' : '✅ Within budget');
                      
                      if (lcp > clinicalBudget.maxLCP) {
                        console.error('CLINICAL PERFORMANCE VIOLATION: LCP exceeds 2s threshold for mental health users');
                      }
                    }
                  }).observe({entryTypes: ['largest-contentful-paint']});
                  
                  // First Input Delay - Critical for crisis interactions
                  new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                      const fid = entry.processingStart - entry.startTime;
                      console.log('Clinical FID:', Math.round(fid) + 'ms',
                        fid > clinicalBudget.maxFID ? '❌ EXCEEDS BUDGET' : '✅ Within budget');
                      
                      if (fid > clinicalBudget.maxFID) {
                        console.error('CLINICAL PERFORMANCE VIOLATION: FID exceeds 100ms - may impact crisis response');
                      }
                    }
                  }).observe({entryTypes: ['first-input']});
                  
                  // Cumulative Layout Shift - Critical for user stability
                  let clsValue = 0;
                  new PerformanceObserver((entryList) => {
                    for (const entry of entryList.getEntries()) {
                      if (!entry.hadRecentInput) {
                        clsValue += entry.value;
                      }
                    }
                    if (clsValue > clinicalBudget.maxCLS) {
                      console.error('CLINICAL PERFORMANCE VIOLATION: CLS exceeds 0.1 - page instability detected');
                    }
                  }).observe({entryTypes: ['layout-shift']});
                }
                
                // Crisis button performance monitoring
                document.addEventListener('click', (event) => {
                  const target = event.target.closest('[data-crisis-help="true"]');
                  if (target) {
                    const crisisStart = performance.now();
                    requestAnimationFrame(() => {
                      const responseTime = performance.now() - crisisStart;
                      console.log('Crisis Button Response:', Math.round(responseTime) + 'ms',
                        responseTime > clinicalBudget.maxCrisisResponseTime ? '❌ TOO SLOW' : '✅ Fast enough');
                      
                      if (responseTime > clinicalBudget.maxCrisisResponseTime) {
                        console.error('CRITICAL: Crisis button response exceeds 200ms - user safety at risk');
                      }
                    });
                  }
                });
                
                // Memory monitoring for long therapeutic sessions
                if ('memory' in performance) {
                  setInterval(() => {
                    const memory = performance.memory;
                    const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                    if (usedMB > 100) {
                      console.warn('High memory usage detected:', usedMB + 'MB - may impact long sessions');
                    }
                  }, 30000); // Check every 30 seconds
                }
                
                console.log('✅ Clinical performance monitoring initialized with therapeutic-grade budgets');
              };
              
              // Initialize immediately
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', window.initClinicalMonitoring);
              } else {
                window.initClinicalMonitoring();
              }
              
              // Development accessibility logging
              if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
                document.addEventListener('focus', (e) => {
                  if (e.target.matches('button, a, input, select, textarea, [tabindex]')) {
                    console.debug('Focus:', e.target.tagName, e.target.className, e.target.textContent?.slice(0, 50));
                  }
                }, true);
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
