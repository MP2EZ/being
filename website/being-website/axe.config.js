/**
 * FullMind Website - Axe Accessibility Testing Configuration
 * WCAG AA compliance testing with mental health specific rules
 */

module.exports = {
  // Test URLs (relative to baseURL)
  urls: [
    '/',
    '/about',
    '/features',
    '/support',
    '/privacy',
    '/contact'
  ],
  
  // Base URL for testing
  baseURL: 'http://localhost:3000',
  
  // Output configuration
  output: './reports',
  outputFormat: ['html', 'json'],
  
  // Accessibility rules configuration
  rules: {
    // WCAG AA Level rules (enabled by default)
    'color-contrast': { enabled: true },
    'color-contrast-enhanced': { enabled: false }, // AAA level, optional
    'focus-order-semantics': { enabled: true },
    'keyboard': { enabled: true },
    'keyboard-navigation': { enabled: true },
    
    // Mental health specific rules
    'no-autoplay-audio': { enabled: true },
    'audio-caption': { enabled: true },
    'video-caption': { enabled: true },
    'no-flashing': { enabled: true },
    
    // Form accessibility
    'form-field-multiple-labels': { enabled: true },
    'input-image-alt': { enabled: true },
    'label': { enabled: true },
    'label-title-only': { enabled: true },
    
    // Navigation and structure
    'bypass': { enabled: true }, // Skip links
    'heading-order': { enabled: true },
    'landmark-banner-is-top-level': { enabled: true },
    'landmark-main-is-top-level': { enabled: true },
    'landmark-no-duplicate-banner': { enabled: true },
    'landmark-no-duplicate-contentinfo': { enabled: true },
    'landmark-one-main': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    
    // Images and media
    'image-alt': { enabled: true },
    'input-image-alt': { enabled: true },
    'image-redundant-alt': { enabled: true },
    
    // Interactive elements
    'button-name': { enabled: true },
    'link-name': { enabled: true },
    'link-in-text-block': { enabled: true },
    'focus-order-semantics': { enabled: true },
    
    // ARIA
    'aria-allowed-attr': { enabled: true },
    'aria-allowed-role': { enabled: true },
    'aria-dpub-role-fallback': { enabled: true },
    'aria-hidden-body': { enabled: true },
    'aria-hidden-focus': { enabled: true },
    'aria-input-field-name': { enabled: true },
    'aria-meter-name': { enabled: true },
    'aria-progressbar-name': { enabled: true },
    'aria-required-attr': { enabled: true },
    'aria-required-children': { enabled: true },
    'aria-required-parent': { enabled: true },
    'aria-roles': { enabled: true },
    'aria-toggle-field-name': { enabled: true },
    'aria-tooltip-name': { enabled: true },
    'aria-treeitem-name': { enabled: true },
    'aria-valid-attr-value': { enabled: true },
    'aria-valid-attr': { enabled: true },
    
    // Tables (if used)
    'table-duplicate-name': { enabled: true },
    'table-fake-caption': { enabled: true },
    'td-headers-attr': { enabled: true },
    'th-has-data-cells': { enabled: true },
    
    // Language
    'html-has-lang': { enabled: true },
    'html-lang-valid': { enabled: true },
    'html-xml-lang-mismatch': { enabled: true },
    'valid-lang': { enabled: true },
  },
  
  // Tags to include in testing
  tags: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
  
  // Custom rules for mental health accessibility
  customRules: [
    {
      id: 'crisis-button-present',
      evaluate: function(node, options) {
        // Check if crisis help button is present and accessible
        const crisisButton = document.querySelector('#crisis-help-button, [data-crisis-help="true"], .crisis-button');
        return !!crisisButton;
      },
      after: function(results, options) {
        if (results.length === 0) {
          return {
            result: false,
            message: 'Page must have a crisis help button accessible within 3 seconds'
          };
        }
        return { result: true };
      },
      metadata: {
        impact: 'critical',
        messages: {
          fail: 'Crisis help button must be present on every page for mental health safety'
        }
      }
    },
    {
      id: 'crisis-button-size',
      evaluate: function(node, options) {
        const crisisButton = document.querySelector('#crisis-help-button, [data-crisis-help="true"], .crisis-button');
        if (!crisisButton) return false;
        
        const rect = crisisButton.getBoundingClientRect();
        const minSize = 60; // Mental health accessibility requirement
        
        return rect.width >= minSize && rect.height >= minSize;
      },
      metadata: {
        impact: 'serious',
        messages: {
          fail: 'Crisis help button must be at least 60x60px for emergency access'
        }
      }
    }
  ],
  
  // Exclude certain elements from testing
  exclude: [
    // Third-party widgets that we can't control
    '.external-widget',
    // Development-only elements
    '[data-dev-only="true"]',
    // Hidden elements that are intentionally inaccessible
    '[aria-hidden="true"]'
  ],
  
  // Include specific elements for focused testing
  include: [
    // All interactive elements
    'button',
    'a',
    'input',
    'select',
    'textarea',
    '[role="button"]',
    '[role="link"]',
    '[tabindex]',
    // Crisis-related elements
    '.crisis-button',
    '#crisis-help-button',
    // Form elements
    'form',
    'fieldset',
    'legend',
    'label',
    // Navigation elements
    'nav',
    '[role="navigation"]',
    // Landmark elements
    'main',
    '[role="main"]',
    'header',
    '[role="banner"]',
    'footer',
    '[role="contentinfo"]'
  ],
  
  // Browser configuration for testing
  browser: {
    // Use Chromium for consistent results
    name: 'chromium',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-web-security',
      '--allow-running-insecure-content'
    ]
  },
  
  // Viewport settings for responsive testing
  viewports: [
    { width: 320, height: 568 },   // Mobile
    { width: 768, height: 1024 },  // Tablet
    { width: 1200, height: 800 },  // Desktop
    { width: 1920, height: 1080 }  // Large desktop
  ],
  
  // Retry configuration for flaky tests
  retries: 2,
  timeout: 30000, // 30 seconds per test
  
  // Report configuration
  reporter: {
    html: {
      destination: './reports/axe-report.html',
      template: 'detailed'
    },
    json: {
      destination: './reports/axe-report.json'
    },
    junit: {
      destination: './reports/axe-junit.xml'
    }
  },
  
  // Thresholds for CI/CD pipeline
  thresholds: {
    critical: 0,    // No critical issues allowed
    serious: 0,     // No serious issues allowed
    moderate: 2,    // Maximum 2 moderate issues
    minor: 5,       // Maximum 5 minor issues
    incomplete: 10  // Maximum 10 incomplete checks
  },
  
  // Performance settings
  performance: {
    // Disable screenshots for faster execution
    screenshots: false,
    // Enable parallel testing
    parallel: true,
    // Limit concurrent browsers
    maxConcurrency: 3
  },
  
  // Localization settings
  locale: 'en-US',
  
  // Custom checks specific to mental health applications
  customChecks: {
    // Check for anxiety-triggering elements
    'no-autoplay-media': {
      impact: 'moderate',
      messages: {
        fail: 'Autoplay media can trigger anxiety in mental health users'
      }
    },
    
    // Check for appropriate content warnings
    'content-warnings': {
      impact: 'moderate',
      messages: {
        fail: 'Content that may be triggering should include appropriate warnings'
      }
    },
    
    // Check for pause/stop controls on animations
    'animation-controls': {
      impact: 'moderate',
      messages: {
        fail: 'Animations should include pause/stop controls for anxiety management'
      }
    }
  },
  
  // Integration settings
  integration: {
    // GitHub Actions integration
    ci: {
      failOnError: true,
      uploadArtifacts: true,
      commentOnPR: true
    },
    
    // Slack notifications for failures
    notifications: {
      slack: {
        webhook: process.env.SLACK_WEBHOOK_URL,
        channel: '#accessibility',
        onFailure: true,
        onSuccess: false
      }
    }
  }
};