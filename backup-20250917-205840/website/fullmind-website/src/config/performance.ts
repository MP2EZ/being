/**
 * FullMind Website - Performance Configuration
 * Clinical-grade performance settings and monitoring
 */

import { PERFORMANCE_THRESHOLDS } from '@/lib/constants';

// ============================================================================
// PERFORMANCE BUDGETS & THRESHOLDS
// ============================================================================

export const performanceConfig = {
  // Core Web Vitals targets (clinical-grade requirements)
  vitals: {
    lcp: PERFORMANCE_THRESHOLDS.LCP,     // 2000ms - Largest Contentful Paint
    fid: PERFORMANCE_THRESHOLDS.FID,     // 50ms - First Input Delay
    cls: PERFORMANCE_THRESHOLDS.CLS,     // 0.1 - Cumulative Layout Shift
    ttfb: PERFORMANCE_THRESHOLDS.TTFB,   // 500ms - Time to First Byte
    fcp: PERFORMANCE_THRESHOLDS.FCP      // 1500ms - First Contentful Paint
  },

  // Resource budgets for clinical applications
  budgets: {
    javascript: PERFORMANCE_THRESHOLDS.MAX_BUNDLE_SIZE,        // 250KB
    css: PERFORMANCE_THRESHOLDS.MAX_CSS_SIZE,                  // 50KB
    images: PERFORMANCE_THRESHOLDS.MAX_IMAGE_SIZE_PER_PAGE,    // 500KB per page
    fonts: 100 * 1024,                                        // 100KB
    total: 1000 * 1024,                                       // 1MB total per page
    
    // Critical resources (must load fast)
    criticalCSS: 14 * 1024,     // 14KB critical CSS
    criticalJS: 50 * 1024,      // 50KB critical JavaScript
    hero: 150 * 1024           // 150KB hero section resources
  },

  // Performance monitoring thresholds
  monitoring: {
    // Alert thresholds (when to send performance alerts)
    alertThresholds: {
      lcp: 3000,      // Alert if LCP > 3s
      fid: 200,       // Alert if FID > 200ms
      cls: 0.25,      // Alert if CLS > 0.25
      ttfb: 1000,     // Alert if TTFB > 1s
      errorRate: 0.01 // Alert if error rate > 1%
    },

    // Critical thresholds (when to escalate alerts)
    criticalThresholds: {
      lcp: 5000,      // Critical if LCP > 5s
      fid: 500,       // Critical if FID > 500ms
      cls: 0.5,       // Critical if CLS > 0.5
      ttfb: 2000,     // Critical if TTFB > 2s
      errorRate: 0.05 // Critical if error rate > 5%
    },

    // Sampling rates for performance monitoring
    sampling: {
      vitals: 0.1,           // 10% of users for Web Vitals
      errors: 1.0,           // 100% error tracking
      slowInteractions: 0.05, // 5% for slow interaction tracking
      resources: 0.02        // 2% for resource timing
    }
  }
} as const;

// ============================================================================
// IMAGE OPTIMIZATION SETTINGS
// ============================================================================

export const imageConfig = {
  // Next.js Image optimization
  formats: ['webp', 'avif'] as const,
  quality: 85, // Balance between quality and size
  
  // Responsive breakpoints (matching Tailwind)
  deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
  
  // Sizing strategies for different content types
  sizes: {
    hero: '(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw',
    feature: '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
    thumbnail: '(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 20vw',
    avatar: '(max-width: 768px) 15vw, 10vw',
    icon: '(max-width: 768px) 8vw, 5vw'
  },

  // Progressive loading settings
  loading: {
    eager: ['hero', 'above-fold'], // Load immediately
    lazy: ['below-fold', 'testimonials'], // Lazy load
    placeholder: 'blur' as const
  },

  // Clinical content image requirements
  clinical: {
    maxWidth: 1200,        // Maximum width for clinical images
    quality: 90,           // Higher quality for clinical content
    formats: ['webp', 'png'], // PNG fallback for clinical accuracy
    compression: 'lossless' // Ensure no clinical information is lost
  }
} as const;

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

export const cacheConfig = {
  // Static asset caching
  static: {
    // Immutable assets (hashed filenames)
    immutable: {
      maxAge: 31536000,      // 1 year
      staleWhileRevalidate: 0,
      mustRevalidate: false
    },
    
    // Versioned assets
    versioned: {
      maxAge: 86400,         // 24 hours
      staleWhileRevalidate: 86400, // 24 hours
      mustRevalidate: false
    },
    
    // Dynamic content
    dynamic: {
      maxAge: 0,
      staleWhileRevalidate: 60, // 1 minute
      mustRevalidate: true
    }
  },

  // Page caching strategies
  pages: {
    // Static marketing pages
    static: {
      maxAge: 86400,         // 24 hours
      staleWhileRevalidate: 86400,
      revalidate: 3600       // Revalidate every hour
    },
    
    // Dynamic pages with user data
    dynamic: {
      maxAge: 0,
      staleWhileRevalidate: 0,
      noCache: true
    },
    
    // API routes
    api: {
      maxAge: 300,           // 5 minutes
      staleWhileRevalidate: 300,
      mustRevalidate: true
    }
  },

  // CDN configuration
  cdn: {
    // Geographic distribution for global performance
    regions: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
    
    // Cache invalidation patterns
    invalidation: {
      critical: ['/', '/crisis', '/features'], // Always fresh
      standard: ['/blog/*', '/resources/*'],   // Cache for 1 hour
      assets: ['/images/*', '/fonts/*']        // Cache for 1 year
    }
  }
} as const;

// ============================================================================
// BUNDLE OPTIMIZATION
// ============================================================================

export const bundleConfig = {
  // Code splitting strategies
  splitting: {
    // Route-based splitting
    routes: true,
    
    // Vendor splitting
    vendor: {
      react: ['react', 'react-dom'],
      next: ['next'],
      utils: ['clsx', 'tailwind-merge'],
      analytics: ['analytics-related-packages']
    },
    
    // Dynamic imports for heavy components
    dynamic: [
      'charts',           // Chart components
      'animations',       // Animation libraries
      'media-players',    // Video/audio players
      'rich-editors'      // Rich text editors
    ]
  },

  // Tree shaking configuration
  treeShaking: {
    // Aggressively remove unused code
    sideEffects: false,
    
    // Mark packages as side-effect free
    sideEffectFree: [
      'lodash',
      'date-fns',
      'ramda'
    ]
  },

  // Minification settings
  minification: {
    // JavaScript minification
    javascript: {
      compress: {
        drop_console: true,    // Remove console.logs in production
        drop_debugger: true,   // Remove debugger statements
        pure_funcs: ['console.log', 'console.info'] // Remove specific functions
      },
      mangle: {
        safari10: true // Safari 10 compatibility
      }
    },
    
    // CSS minification
    css: {
      discardComments: { removeAll: true },
      discardUnused: true,
      mergeIdents: true,
      reduceIdents: true
    }
  }
} as const;

// ============================================================================
// NETWORK OPTIMIZATION
// ============================================================================

export const networkConfig = {
  // Connection-aware loading
  adaptiveLoading: {
    // Slow connections (2G, slow 3G)
    slow: {
      imageQuality: 70,
      enableLazyLoading: true,
      prefetchLimit: 2,
      analyticsReporting: 'batch' // Batch analytics to reduce requests
    },
    
    // Fast connections (4G, WiFi)
    fast: {
      imageQuality: 85,
      enableLazyLoading: false, // Load images immediately
      prefetchLimit: 5,
      analyticsReporting: 'realtime'
    }
  },

  // Resource hints
  hints: {
    // DNS prefetch for external resources
    dnsPrefetch: [
      'https://fonts.googleapis.com',
      'https://www.google-analytics.com'
    ],
    
    // Preconnect to critical origins
    preconnect: [
      'https://fonts.gstatic.com'
    ],
    
    // Prefetch critical resources
    prefetch: [
      '/api/crisis-resources', // Always prefetch crisis resources
      '/fonts/geist-sans.woff2',
      '/fonts/geist-mono.woff2'
    ],
    
    // Preload critical resources
    preload: [
      // Critical CSS will be inlined
      // Critical fonts
      { href: '/fonts/geist-sans.woff2', as: 'font', type: 'font/woff2', crossorigin: 'anonymous' }
    ]
  },

  // Service Worker configuration
  serviceWorker: {
    // Cache strategies for different resource types
    strategies: {
      // Static assets - Cache First
      static: 'CacheFirst',
      
      // API calls - Network First
      api: 'NetworkFirst',
      
      // Pages - Stale While Revalidate
      pages: 'StaleWhileRevalidate',
      
      // Crisis resources - Network First (always fresh)
      crisis: 'NetworkFirst'
    },
    
    // Offline fallbacks
    offline: {
      // Offline page for when network is unavailable
      pages: '/offline',
      
      // Offline crisis resources (cached locally)
      crisis: '/crisis-offline',
      
      // Cached resources for offline functionality
      assets: [
        '/',
        '/crisis',
        '/offline',
        '/manifest.json'
      ]
    }
  }
} as const;

// ============================================================================
// PERFORMANCE MONITORING CONFIGURATION
// ============================================================================

export const monitoringConfig = {
  // Real User Monitoring (RUM)
  rum: {
    // Sample rates for different metrics
    sampleRates: {
      webVitals: 0.1,        // 10% of users
      navigation: 0.05,       // 5% of users
      resources: 0.02,        // 2% of users
      errors: 1.0            // 100% error tracking
    },
    
    // What to track
    metrics: [
      'LCP', 'FID', 'CLS',   // Core Web Vitals
      'FCP', 'TTFB',         // Additional performance metrics
      'navigationTiming',     // Navigation API data
      'resourceTiming',       // Resource loading data
      'userTiming'           // Custom performance marks
    ],
    
    // User experience tracking
    ux: {
      trackScrollDepth: true,
      trackTimeOnPage: true,
      trackInteractionDelay: true,
      trackVisibilityChange: true
    }
  },

  // Synthetic monitoring
  synthetic: {
    // Lighthouse CI configuration
    lighthouse: {
      // Performance budget assertions
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }]
      },
      
      // Collect performance data
      collect: {
        numberOfRuns: 3,
        settings: {
          chromeFlags: '--no-sandbox --disable-dev-shm-usage'
        }
      }
    },
    
    // Uptime monitoring
    uptime: {
      interval: 60000,        // Check every minute
      timeout: 10000,         // 10 second timeout
      retries: 3,             // Retry 3 times before marking as down
      
      // Critical endpoints to monitor
      endpoints: [
        '/',
        '/crisis',
        '/api/health',
        '/api/crisis-resources'
      ]
    }
  },

  // Alert configuration
  alerts: {
    // Performance degradation alerts
    performance: {
      lcp: { warning: 3000, critical: 5000 },
      fid: { warning: 200, critical: 500 },
      cls: { warning: 0.25, critical: 0.5 },
      errorRate: { warning: 0.01, critical: 0.05 }
    },
    
    // Availability alerts
    availability: {
      uptime: { warning: 99.5, critical: 99.0 }, // Percentage
      responseTime: { warning: 2000, critical: 5000 } // Milliseconds
    },
    
    // Resource usage alerts
    resources: {
      bundleSize: { warning: 300, critical: 500 }, // KB
      imageSize: { warning: 600, critical: 1000 }, // KB per page
      requestCount: { warning: 50, critical: 100 }  // Requests per page
    }
  }
} as const;

// ============================================================================
// CLINICAL PERFORMANCE REQUIREMENTS
// ============================================================================

export const clinicalPerformanceRequirements = {
  // Critical user journeys that must meet strict performance standards
  criticalJourneys: [
    {
      name: 'Crisis Resource Access',
      maxLoadTime: 1000,      // 1 second maximum
      availability: 99.99,     // 99.99% uptime
      priority: 'critical'
    },
    {
      name: 'Assessment Completion',
      maxLoadTime: 2000,      // 2 seconds maximum
      availability: 99.9,      // 99.9% uptime  
      priority: 'high'
    },
    {
      name: 'Contact Form Submission',
      maxLoadTime: 3000,      // 3 seconds maximum
      availability: 99.5,      // 99.5% uptime
      priority: 'medium'
    }
  ],

  // Accessibility performance requirements
  accessibility: {
    // Screen reader compatibility
    screenReader: {
      maxDelay: 100,          // Maximum delay for screen reader feedback
      semanticAccuracy: 100   // 100% semantic accuracy required
    },
    
    // Keyboard navigation
    keyboard: {
      maxTabDelay: 50,        // Maximum delay between tab presses
      focusVisibility: true,   // Focus indicators must be visible
      logicalOrder: true      // Tab order must be logical
    },
    
    // Color contrast and visual accessibility
    visual: {
      contrastRatio: 4.5,     // WCAG AA contrast ratio
      textScaling: 200,       // Support up to 200% text scaling
      colorBlindness: true    // Color-blind friendly design
    }
  },

  // Error handling performance
  errorHandling: {
    // Maximum time to show error messages
    errorDisplay: 100,        // 100ms to show error
    
    // Recovery time from errors
    recovery: 1000,          // 1 second to recover from errors
    
    // Fallback loading time
    fallback: 500            // 500ms to show fallback content
  }
} as const;