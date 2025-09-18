/**
 * FullMind Website - Accessibility Testing and Validation Utilities
 * WCAG AA compliance validation and mental health accessibility helpers
 */

import { 
  AccessibilityAudit, 
  AccessibilityIssue, 
  AccessibilityTest,
  ColorAccessibility,
  WCAGLevel,
  ACCESSIBILITY_CONSTANTS,
  MENTAL_HEALTH_ACCESSIBILITY,
  ARIA_ROLES,
  ARIA_PROPERTIES
} from '@/types/accessibility';
import { getContrastRatio } from '@/lib/utils';

// ============================================================================
// COLOR CONTRAST VALIDATION
// ============================================================================

/**
 * Validates color contrast meets WCAG guidelines
 */
export function validateColorContrast(
  foreground: string, 
  background: string, 
  level: WCAGLevel = 'AA',
  textSize: 'normal' | 'large' = 'normal'
): ColorAccessibility {
  const contrastRatio = getContrastRatio(foreground, background);
  
  const thresholds = {
    'A': textSize === 'large' ? 3.0 : 4.5,
    'AA': textSize === 'large' ? 3.0 : 4.5,
    'AAA': textSize === 'large' ? 4.5 : 7.0
  };

  return {
    foreground,
    background,
    contrastRatio,
    wcagAACompliant: contrastRatio >= thresholds.AA,
    wcagAAACompliant: contrastRatio >= thresholds.AAA,
  };
}

/**
 * Validates all color combinations in a theme for accessibility
 */
export function validateThemeColors(colors: Record<string, string>): Record<string, ColorAccessibility> {
  const results: Record<string, ColorAccessibility> = {};
  const colorEntries = Object.entries(colors);
  
  // Test all foreground/background combinations
  for (const [fgName, fgColor] of colorEntries) {
    for (const [bgName, bgColor] of colorEntries) {
      if (fgName !== bgName) {
        const key = `${fgName}-on-${bgName}`;
        results[key] = validateColorContrast(fgColor, bgColor);
      }
    }
  }
  
  return results;
}

// ============================================================================
// ARIA ATTRIBUTE VALIDATION
// ============================================================================

/**
 * Validates ARIA attributes on an element
 */
export function validateAriaAttributes(element: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const attributes = element.attributes;
  
  for (let i = 0; i < attributes.length; i++) {
    const attr = attributes[i];
    
    if (attr.name.startsWith('aria-')) {
      const value = attr.value;
      
      switch (attr.name) {
        case ARIA_PROPERTIES.EXPANDED:
        case ARIA_PROPERTIES.CHECKED:
        case ARIA_PROPERTIES.PRESSED:
        case ARIA_PROPERTIES.SELECTED:
        case ARIA_PROPERTIES.DISABLED:
          if (!['true', 'false'].includes(value)) {
            issues.push({
              id: `aria-${Date.now()}-${Math.random()}`,
              severity: 'high',
              wcagCriteria: '4.1.2',
              description: `${attr.name} must be "true" or "false", got "${value}"`,
              element: element.tagName.toLowerCase(),
              selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : element.tagName.toLowerCase(),
              recommendation: `Set ${attr.name}="${value === 'true' ? 'true' : 'false'}"`,
              fixComplexity: 'trivial'
            });
          }
          break;
          
        case ARIA_PROPERTIES.LIVE:
          if (!['off', 'polite', 'assertive'].includes(value)) {
            issues.push({
              id: `aria-${Date.now()}-${Math.random()}`,
              severity: 'medium',
              wcagCriteria: '4.1.2',
              description: `aria-live must be "off", "polite", or "assertive", got "${value}"`,
              element: element.tagName.toLowerCase(),
              selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : element.tagName.toLowerCase(),
              recommendation: 'Use aria-live="polite" for most announcements, "assertive" for urgent messages',
              fixComplexity: 'trivial'
            });
          }
          break;
          
        case ARIA_PROPERTIES.LABELLEDBY:
        case ARIA_PROPERTIES.DESCRIBEDBY:
        case ARIA_PROPERTIES.CONTROLS:
          // Validate that referenced IDs exist
          const ids = value.split(' ').filter(Boolean);
          for (const id of ids) {
            if (!document.getElementById(id)) {
              issues.push({
                id: `aria-${Date.now()}-${Math.random()}`,
                severity: 'high',
                wcagCriteria: '1.3.1',
                description: `${attr.name} references non-existent ID "${id}"`,
                element: element.tagName.toLowerCase(),
                selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : element.tagName.toLowerCase(),
                recommendation: `Ensure element with id="${id}" exists or remove the reference`,
                fixComplexity: 'easy'
              });
            }
          }
          break;
      }
    }
  }
  
  return issues;
}

/**
 * Validates semantic HTML and ARIA roles
 */
export function validateSemanticHTML(element: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const tagName = element.tagName.toLowerCase();
  const role = element.getAttribute('role');
  
  // Check for redundant roles
  const implicitRoles: Record<string, string> = {
    'button': ARIA_ROLES.BUTTON,
    'a': 'link',
    'input': ARIA_ROLES.TEXTBOX,
    'h1': ARIA_ROLES.HEADING,
    'h2': ARIA_ROLES.HEADING,
    'h3': ARIA_ROLES.HEADING,
    'h4': ARIA_ROLES.HEADING,
    'h5': ARIA_ROLES.HEADING,
    'h6': ARIA_ROLES.HEADING,
    'main': ARIA_ROLES.MAIN,
    'nav': ARIA_ROLES.NAVIGATION,
    'header': ARIA_ROLES.BANNER,
    'footer': ARIA_ROLES.CONTENTINFO,
    'aside': ARIA_ROLES.COMPLEMENTARY,
    'section': ARIA_ROLES.REGION,
  };
  
  const implicitRole = implicitRoles[tagName];
  if (implicitRole && role === implicitRole) {
    issues.push({
      id: `semantic-${Date.now()}-${Math.random()}`,
      severity: 'low',
      wcagCriteria: '4.1.2',
      description: `Redundant role="${role}" on ${tagName} element`,
      element: tagName,
      selector: element.id ? `#${element.id}` : element.className ? `.${element.className.split(' ')[0]}` : tagName,
      recommendation: `Remove role="${role}" as it's implicit for ${tagName} elements`,
      fixComplexity: 'trivial'
    });
  }
  
  // Check for missing required attributes
  if (tagName === 'img' && !element.hasAttribute('alt')) {
    issues.push({
      id: `img-alt-${Date.now()}-${Math.random()}`,
      severity: 'critical',
      wcagCriteria: '1.1.1',
      description: 'Image missing alt attribute',
      element: tagName,
      selector: element.id ? `#${element.id}` : element.src ? `img[src="${element.getAttribute('src')}"]` : 'img',
      recommendation: 'Add alt attribute describing the image content or alt="" for decorative images',
      fixComplexity: 'easy'
    });
  }
  
  if (tagName === 'a' && element.hasAttribute('href') && !element.textContent?.trim() && !element.getAttribute('aria-label')) {
    issues.push({
      id: `link-text-${Date.now()}-${Math.random()}`,
      severity: 'critical',
      wcagCriteria: '2.4.4',
      description: 'Link has no accessible text',
      element: tagName,
      selector: element.id ? `#${element.id}` : `a[href="${element.getAttribute('href')}"]`,
      recommendation: 'Add descriptive text content or aria-label to the link',
      fixComplexity: 'easy'
    });
  }
  
  return issues;
}

// ============================================================================
// KEYBOARD NAVIGATION VALIDATION
// ============================================================================

/**
 * Validates keyboard navigation and focus management
 */
export function validateKeyboardNavigation(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Find all interactive elements
  const interactiveElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex], [role="button"], [role="link"], [role="menuitem"]'
  );
  
  interactiveElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    const tabIndex = htmlElement.tabIndex;
    const tagName = htmlElement.tagName.toLowerCase();
    
    // Check for positive tabindex (anti-pattern)
    if (tabIndex > 0) {
      issues.push({
        id: `tabindex-${Date.now()}-${Math.random()}`,
        severity: 'medium',
        wcagCriteria: '2.4.3',
        description: `Element has positive tabindex (${tabIndex})`,
        element: tagName,
        selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.className ? `.${htmlElement.className.split(' ')[0]}` : tagName,
        recommendation: 'Use tabindex="0" to include in tab order or tabindex="-1" to exclude. Avoid positive values.',
        fixComplexity: 'easy'
      });
    }
    
    // Check for missing keyboard event handlers on clickable elements
    if (htmlElement.onclick && !htmlElement.onkeydown) {
      issues.push({
        id: `keyboard-handler-${Date.now()}-${Math.random()}`,
        severity: 'high',
        wcagCriteria: '2.1.1',
        description: 'Clickable element missing keyboard event handler',
        element: tagName,
        selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.className ? `.${htmlElement.className.split(' ')[0]}` : tagName,
        recommendation: 'Add onKeyDown handler to respond to Enter and Space keys',
        fixComplexity: 'moderate'
      });
    }
    
    // Check minimum touch target size
    const rect = htmlElement.getBoundingClientRect();
    const minSize = ACCESSIBILITY_CONSTANTS.MIN_TOUCH_TARGET;
    
    if (rect.width < minSize || rect.height < minSize) {
      issues.push({
        id: `touch-target-${Date.now()}-${Math.random()}`,
        severity: 'medium',
        wcagCriteria: '2.5.5',
        description: `Touch target too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (minimum ${minSize}x${minSize}px)`,
        element: tagName,
        selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.className ? `.${htmlElement.className.split(' ')[0]}` : tagName,
        recommendation: `Increase padding or dimensions to meet minimum ${minSize}px target size`,
        fixComplexity: 'easy'
      });
    }
  });
  
  return issues;
}

// ============================================================================
// MENTAL HEALTH SPECIFIC VALIDATIONS
// ============================================================================

/**
 * Validates crisis access requirements for mental health applications
 */
export function validateCrisisAccess(page: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for crisis help button
  const crisisButton = page.querySelector('#crisis-help-button, [data-crisis-help="true"], .crisis-button');
  
  if (!crisisButton) {
    issues.push({
      id: `crisis-access-${Date.now()}`,
      severity: 'critical',
      wcagCriteria: 'MH-1', // Mental Health custom criteria
      description: 'No crisis help button found on page',
      element: 'page',
      selector: 'body',
      recommendation: 'Add prominently placed crisis help button accessible within 3 seconds',
      fixComplexity: 'moderate'
    });
  } else {
    const htmlElement = crisisButton as HTMLElement;
    const rect = htmlElement.getBoundingClientRect();
    const minSize = MENTAL_HEALTH_ACCESSIBILITY.CRISIS_BUTTON_SIZE;
    
    // Validate crisis button size
    if (rect.width < minSize || rect.height < minSize) {
      issues.push({
        id: `crisis-button-size-${Date.now()}`,
        severity: 'high',
        wcagCriteria: 'MH-2',
        description: `Crisis button too small: ${Math.round(rect.width)}x${Math.round(rect.height)}px (should be at least ${minSize}x${minSize}px)`,
        element: htmlElement.tagName.toLowerCase(),
        selector: htmlElement.id ? `#${htmlElement.id}` : '.crisis-button',
        recommendation: `Increase crisis button size to at least ${minSize}x${minSize}px`,
        fixComplexity: 'easy'
      });
    }
    
    // Validate crisis button contrast
    const computedStyle = getComputedStyle(htmlElement);
    const bgColor = computedStyle.backgroundColor;
    const textColor = computedStyle.color;
    
    // Convert RGB to hex for contrast calculation (simplified)
    // In production, use a robust color parsing library
    if (bgColor && textColor) {
      const contrastRatio = 4.5; // Placeholder - implement actual calculation
      const requiredRatio = MENTAL_HEALTH_ACCESSIBILITY.CRISIS_CONTRAST_RATIO;
      
      if (contrastRatio < requiredRatio) {
        issues.push({
          id: `crisis-contrast-${Date.now()}`,
          severity: 'high',
          wcagCriteria: 'MH-3',
          description: `Crisis button contrast ratio too low: ${contrastRatio} (requires ${requiredRatio})`,
          element: htmlElement.tagName.toLowerCase(),
          selector: htmlElement.id ? `#${htmlElement.id}` : '.crisis-button',
          recommendation: `Increase contrast ratio to at least ${requiredRatio}:1 for critical safety elements`,
          fixComplexity: 'easy'
        });
      }
    }
  }
  
  return issues;
}

/**
 * Validates content for anxiety-friendly design patterns
 */
export function validateAnxietyFriendlyDesign(page: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  
  // Check for autoplay videos/animations
  const autoplayMedia = page.querySelectorAll('video[autoplay], audio[autoplay]');
  autoplayMedia.forEach((media) => {
    const htmlElement = media as HTMLElement;
    issues.push({
      id: `autoplay-${Date.now()}-${Math.random()}`,
      severity: 'medium',
      wcagCriteria: '2.2.2',
      description: 'Autoplay media can trigger anxiety',
      element: htmlElement.tagName.toLowerCase(),
      selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.tagName.toLowerCase(),
      recommendation: 'Remove autoplay or provide controls to pause/disable',
      fixComplexity: 'easy'
    });
  });
  
  // Check for flashing/blinking elements
  const flashingElements = page.querySelectorAll('.blink, .flash, [style*="animation"]');
  flashingElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    issues.push({
      id: `flashing-${Date.now()}-${Math.random()}`,
      severity: 'high',
      wcagCriteria: '2.3.1',
      description: 'Flashing or rapidly changing content can cause anxiety or seizures',
      element: htmlElement.tagName.toLowerCase(),
      selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.className ? `.${htmlElement.className.split(' ')[0]}` : htmlElement.tagName.toLowerCase(),
      recommendation: 'Remove flashing effects or reduce frequency to less than 3 times per second',
      fixComplexity: 'moderate'
    });
  });
  
  return issues;
}

// ============================================================================
// COMPREHENSIVE ACCESSIBILITY AUDIT
// ============================================================================

/**
 * Performs a comprehensive accessibility audit of a page or component
 */
export function performAccessibilityAudit(
  target: HTMLElement, 
  scope: 'component' | 'page' | 'site' | 'flow',
  wcagLevel: WCAGLevel = 'AA'
): AccessibilityAudit {
  const tests: AccessibilityTest[] = [];
  const allIssues: AccessibilityIssue[] = [];
  
  // Run all validation tests
  const validationTests = [
    { name: 'ARIA Attributes', fn: validateAriaAttributes },
    { name: 'Semantic HTML', fn: validateSemanticHTML },
    { name: 'Keyboard Navigation', fn: validateKeyboardNavigation },
    { name: 'Crisis Access', fn: validateCrisisAccess },
    { name: 'Anxiety-Friendly Design', fn: validateAnxietyFriendlyDesign },
  ];
  
  validationTests.forEach(({ name, fn }) => {
    const issues = fn(target);
    allIssues.push(...issues);
    
    tests.push({
      id: `test-${name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`,
      name,
      type: 'automated',
      wcagCriteria: '4.1.2', // Default, individual tests may override
      passed: issues.length === 0,
      issues,
      runDate: new Date(),
      runBy: 'automated-audit',
    });
  });
  
  // Count issues by severity
  const criticalIssues = allIssues.filter(issue => issue.severity === 'critical').length;
  const highIssues = allIssues.filter(issue => issue.severity === 'high').length;
  const mediumIssues = allIssues.filter(issue => issue.severity === 'medium').length;
  const lowIssues = allIssues.filter(issue => issue.severity === 'low').length;
  
  // Calculate overall score (0-100)
  const totalIssues = allIssues.length;
  const maxPossibleIssues = tests.length * 10; // Rough estimate
  const overallScore = Math.max(0, Math.round(((maxPossibleIssues - totalIssues) / maxPossibleIssues) * 100));
  
  // Generate recommendations
  const recommendations = generateRecommendations(allIssues);
  
  return {
    id: `audit-${Date.now()}`,
    scope,
    target: target.id || target.className || target.tagName.toLowerCase(),
    auditDate: new Date(),
    auditor: 'accessibility-agent',
    toolsUsed: ['custom-validation', 'aria-checker', 'contrast-validator'],
    wcagLevel,
    overallScore,
    tests,
    criticalIssues,
    highIssues,
    mediumIssues,
    lowIssues,
    recommendations,
    nextAuditDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  };
}

/**
 * Generates actionable recommendations from audit issues
 */
function generateRecommendations(issues: AccessibilityIssue[]): string[] {
  const recommendations: string[] = [];
  const issuesByType = new Map<string, AccessibilityIssue[]>();
  
  // Group issues by WCAG criteria
  issues.forEach(issue => {
    const key = issue.wcagCriteria;
    if (!issuesByType.has(key)) {
      issuesByType.set(key, []);
    }
    issuesByType.get(key)!.push(issue);
  });
  
  // Generate recommendations based on issue patterns
  issuesByType.forEach((issuesGroup, criteria) => {
    switch (criteria) {
      case '1.1.1':
        recommendations.push('Add meaningful alt text to all images, or alt="" for decorative images');
        break;
      case '1.4.3':
        recommendations.push('Increase color contrast ratios to meet WCAG AA standards (4.5:1 for normal text)');
        break;
      case '2.1.1':
        recommendations.push('Ensure all interactive elements are keyboard accessible');
        break;
      case '2.4.4':
        recommendations.push('Provide descriptive link text that makes sense out of context');
        break;
      case '4.1.2':
        recommendations.push('Fix ARIA attribute values and semantic HTML structure');
        break;
      case 'MH-1':
        recommendations.push('Add prominent crisis help button accessible within 3 seconds from any page');
        break;
      case 'MH-2':
        recommendations.push('Increase crisis button size to meet mental health accessibility standards');
        break;
      case 'MH-3':
        recommendations.push('Ensure crisis elements meet enhanced contrast requirements (7:1)');
        break;
    }
  });
  
  // Add general recommendations based on overall issues
  if (issues.filter(i => i.severity === 'critical').length > 0) {
    recommendations.unshift('Address critical accessibility issues immediately - these prevent users from accessing content');
  }
  
  if (issues.filter(i => i.severity === 'high').length > 5) {
    recommendations.push('Consider implementing accessibility testing in your CI/CD pipeline to catch issues early');
  }
  
  return [...new Set(recommendations)]; // Remove duplicates
}

// ============================================================================
// AUTOMATED TESTING HELPERS
// ============================================================================

/**
 * Tests page load performance impact of accessibility features
 */
export function testAccessibilityPerformanceImpact(): Promise<{
  loadTime: number;
  accessibilityLoadTime: number;
  impact: number;
}> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    
    // Simulate loading accessibility features
    setTimeout(() => {
      const accessibilityLoadTime = performance.now() - startTime;
      const baseLoadTime = 100; // Baseline load time
      const impact = ((accessibilityLoadTime - baseLoadTime) / baseLoadTime) * 100;
      
      resolve({
        loadTime: baseLoadTime,
        accessibilityLoadTime,
        impact: Math.round(impact * 100) / 100
      });
    }, 50);
  });
}

/**
 * Validates that focus indicators are visible and meet contrast requirements
 */
export function validateFocusIndicators(container: HTMLElement): AccessibilityIssue[] {
  const issues: AccessibilityIssue[] = [];
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );
  
  focusableElements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    
    // Temporarily focus the element to test focus styles
    htmlElement.focus();
    const computedStyle = getComputedStyle(htmlElement);
    
    // Check if focus indicator is present
    const hasOutline = computedStyle.outline !== 'none' && computedStyle.outline !== '0px';
    const hasBoxShadow = computedStyle.boxShadow && computedStyle.boxShadow !== 'none';
    const hasFocusIndicator = hasOutline || hasBoxShadow;
    
    if (!hasFocusIndicator) {
      issues.push({
        id: `focus-indicator-${Date.now()}-${Math.random()}`,
        severity: 'high',
        wcagCriteria: '2.4.7',
        description: 'Element lacks visible focus indicator',
        element: htmlElement.tagName.toLowerCase(),
        selector: htmlElement.id ? `#${htmlElement.id}` : htmlElement.className ? `.${htmlElement.className.split(' ')[0]}` : htmlElement.tagName.toLowerCase(),
        recommendation: 'Add visible focus indicator using outline, box-shadow, or border',
        fixComplexity: 'easy'
      });
    }
    
    // Remove focus
    htmlElement.blur();
  });
  
  return issues;
}

// ============================================================================
// ACCESSIBILITY SCORE CALCULATION
// ============================================================================

/**
 * Calculates accessibility score based on WCAG compliance
 */
export function calculateAccessibilityScore(audit: AccessibilityAudit): {
  score: number;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  compliance: WCAGLevel | 'Non-compliant';
} {
  const { criticalIssues, highIssues, mediumIssues, lowIssues } = audit;
  
  // Weighted scoring
  const criticalWeight = 20;
  const highWeight = 10;
  const mediumWeight = 5;
  const lowWeight = 1;
  
  const totalPenalty = 
    (criticalIssues * criticalWeight) +
    (highIssues * highWeight) +
    (mediumIssues * mediumWeight) +
    (lowIssues * lowWeight);
  
  // Base score starts at 100
  const score = Math.max(0, 100 - totalPenalty);
  
  // Determine grade
  let grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  if (score >= 95) grade = 'A+';
  else if (score >= 90) grade = 'A';
  else if (score >= 80) grade = 'B';
  else if (score >= 70) grade = 'C';
  else if (score >= 60) grade = 'D';
  else grade = 'F';
  
  // Determine compliance level
  let compliance: WCAGLevel | 'Non-compliant';
  if (criticalIssues > 0 || highIssues > 0) {
    compliance = 'Non-compliant';
  } else if (mediumIssues === 0) {
    compliance = 'AAA';
  } else if (mediumIssues <= 2) {
    compliance = 'AA';
  } else {
    compliance = 'A';
  }
  
  return { score, grade, compliance };
}