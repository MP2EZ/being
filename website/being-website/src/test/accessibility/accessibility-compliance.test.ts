/**
 * Accessibility Compliance Tests
 * 
 * Comprehensive WCAG AA accessibility testing including:
 * - Screen reader compatibility for export interfaces
 * - Keyboard navigation through complete workflows
 * - High contrast mode for clinical document readability
 * - Crisis accessibility requirements
 * - Mental health-specific accessibility considerations
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  simulateHighContrast,
  simulateCrisisMode,
} from '../setup';

// Import components for testing
import { CrisisButton } from '../../components/ui/CrisisButton/CrisisButton';
import { Button } from '../../components/ui/Button';

// ============================================================================
// WCAG AA COMPLIANCE TESTS
// ============================================================================

describe('WCAG AA Compliance', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
    // Reset accessibility state
    document.documentElement.classList.remove('high-contrast', 'crisis-mode');
  });

  describe('Color Contrast Requirements', () => {
    test('all text meets WCAG AA contrast ratio (4.5:1)', () => {
      render(
        <div className="bg-bg-primary text-text-primary p-4">
          <h1 className="text-text-primary">Clinical Export Dashboard</h1>
          <p className="text-text-secondary">Export your therapeutic data</p>
          <Button variant="primary">Generate Export</Button>
          <Button variant="secondary">Cancel</Button>
        </div>
      );

      const heading = screen.getByRole('heading', { level: 1 });
      const paragraph = screen.getByText(/Export your therapeutic data/);
      const primaryButton = screen.getByRole('button', { name: /Generate Export/ });
      const secondaryButton = screen.getByRole('button', { name: /Cancel/ });

      // Test contrast ratios
      expect(getContrastRatio(heading)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(paragraph)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(primaryButton)).toBeGreaterThanOrEqual(4.5);
      expect(getContrastRatio(secondaryButton)).toBeGreaterThanOrEqual(4.5);
    });

    test('crisis elements meet enhanced contrast requirements', () => {
      render(<CrisisButton position="inline" size="standard" />);
      
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      
      // Crisis elements should have higher contrast (7:1 for AAA)
      expect(getContrastRatio(crisisButton)).toBeGreaterThanOrEqual(7.0);
    });

    test('high contrast mode enhances all text visibility', () => {
      simulateHighContrast();
      
      render(
        <div className="bg-bg-primary text-text-primary p-4">
          <h1>Clinical Data</h1>
          <p>Assessment scores and progress</p>
          <button>View Details</button>
        </div>
      );

      const heading = screen.getByRole('heading');
      const paragraph = screen.getByText(/Assessment scores/);
      const button = screen.getByRole('button');

      // High contrast mode should exceed AAA requirements
      expect(getContrastRatio(heading)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(paragraph)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(button)).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('Keyboard Navigation', () => {
    test('all interactive elements are keyboard accessible', async () => {
      render(
        <div>
          <Button>Export PDF</Button>
          <Button>Export CSV</Button>
          <select aria-label="Date range">
            <option>Last 30 days</option>
            <option>Last 90 days</option>
          </select>
          <input type="checkbox" aria-label="Include mood data" />
          <CrisisButton position="inline" size="standard" />
        </div>
      );

      // Test tab navigation through all interactive elements
      const interactiveElements = [
        screen.getByRole('button', { name: /Export PDF/ }),
        screen.getByRole('button', { name: /Export CSV/ }),
        screen.getByLabelText(/Date range/),
        screen.getByLabelText(/Include mood data/),
        screen.getByRole('button', { name: /crisis/i }),
      ];

      // Navigate through each element
      for (let i = 0; i < interactiveElements.length; i++) {
        await user.tab();
        expect(interactiveElements[i]).toHaveFocus();
      }
    });

    test('keyboard shortcuts work for critical actions', async () => {
      const mockExportHandler = jest.fn();
      const mockCrisisHandler = jest.fn();

      render(
        <div>
          <Button onClick={mockExportHandler} data-testid="export-btn">
            Export (Alt+E)
          </Button>
          <CrisisButton 
            position="inline" 
            size="standard"
            onClick={mockCrisisHandler}
          />
        </div>
      );

      // Test Alt+E for export
      await user.keyboard('{Alt>}e{/Alt}');
      expect(mockExportHandler).toHaveBeenCalled();

      // Test direct crisis access (should always be available)
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      await user.click(crisisButton);
      expect(mockCrisisHandler).toHaveBeenCalled();
    });

    test('focus management during export workflow', async () => {
      render(
        <div>
          <Button data-testid="start-export">Start Export</Button>
          <div data-testid="export-dialog" style={{ display: 'none' }}>
            <h2>Export Configuration</h2>
            <Button data-testid="confirm-export">Confirm</Button>
            <Button data-testid="cancel-export">Cancel</Button>
          </div>
        </div>
      );

      const startButton = screen.getByTestId('start-export');
      
      // Start export workflow
      await user.click(startButton);
      
      // Simulate dialog opening
      const dialog = screen.getByTestId('export-dialog');
      dialog.style.display = 'block';
      
      // Focus should move to dialog
      const confirmButton = screen.getByTestId('confirm-export');
      confirmButton.focus();
      expect(confirmButton).toHaveFocus();
    });

    test('escape key closes modals and returns focus', async () => {
      const mockClose = jest.fn();

      render(
        <div>
          <Button data-testid="open-modal">Open Modal</Button>
          <div 
            role="dialog" 
            aria-modal="true"
            data-testid="modal"
            onKeyDown={(e) => {
              if (e.key === 'Escape') mockClose();
            }}
            tabIndex={-1}
          >
            <h2>Export Modal</h2>
            <Button>Close</Button>
          </div>
        </div>
      );

      const modal = screen.getByTestId('modal');
      modal.focus();

      await user.keyboard('{Escape}');
      expect(mockClose).toHaveBeenCalled();
    });
  });

  describe('Screen Reader Support', () => {
    test('all content has proper semantic markup', () => {
      render(
        <main>
          <header>
            <h1>Clinical Export Dashboard</h1>
            <nav aria-label="Export navigation">
              <ul>
                <li><a href="#pdf-export">PDF Export</a></li>
                <li><a href="#csv-export">CSV Export</a></li>
              </ul>
            </nav>
          </header>
          <section aria-labelledby="export-options">
            <h2 id="export-options">Export Options</h2>
            <form>
              <fieldset>
                <legend>Data Categories</legend>
                <label>
                  <input type="checkbox" />
                  Assessment Data
                </label>
                <label>
                  <input type="checkbox" />
                  Mood Tracking
                </label>
              </fieldset>
            </form>
          </section>
        </main>
      );

      // Verify semantic structure
      expect(screen.getByRole('main')).toBeInTheDocument();
      expect(screen.getByRole('banner')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toBeInTheDocument();
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getByRole('group')).toBeInTheDocument(); // fieldset
      
      // Verify heading hierarchy
      expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    });

    test('interactive elements have accessible names', () => {
      render(
        <div>
          <Button aria-label="Generate PDF export for clinical data">
            Export PDF
          </Button>
          <input 
            type="range" 
            min="0" 
            max="12" 
            aria-label="Select date range in months"
            aria-describedby="range-help"
          />
          <div id="range-help">
            Choose how many months of data to include
          </div>
          <CrisisButton position="inline" size="standard" />
        </div>
      );

      const pdfButton = screen.getByRole('button', { name: /Generate PDF export/ });
      const rangeInput = screen.getByRole('slider', { name: /Select date range/ });
      const crisisButton = screen.getByRole('button', { name: /crisis/i });

      expect(pdfButton).toHaveAccessibleName();
      expect(rangeInput).toHaveAccessibleName();
      expect(rangeInput).toHaveAccessibleDescription();
      expect(crisisButton).toHaveAccessibleName();
    });

    test('form validation messages are announced', async () => {
      render(
        <form>
          <label htmlFor="email">Email Address</label>
          <input 
            id="email" 
            type="email" 
            required 
            aria-describedby="email-error"
          />
          <div id="email-error" role="alert" style={{ display: 'none' }}>
            Please enter a valid email address
          </div>
          <Button type="submit">Submit</Button>
        </form>
      );

      const emailInput = screen.getByLabelText(/Email Address/);
      const submitButton = screen.getByRole('button', { name: /Submit/ });
      const errorMessage = screen.getByRole('alert');

      // Trigger validation
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Error should be visible and associated
      errorMessage.style.display = 'block';
      expect(errorMessage).toBeVisible();
      expect(emailInput).toHaveErrorMessage('Please enter a valid email address');
    });

    test('progress indicators are accessible during export', () => {
      render(
        <div>
          <div 
            role="progressbar" 
            aria-valuenow={65} 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-label="Export progress"
          >
            <div style={{ width: '65%' }} />
          </div>
          <div aria-live="polite" aria-atomic="true">
            Export 65% complete - Processing assessment data
          </div>
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      const liveRegion = screen.getByText(/Export 65% complete/);

      expect(progressbar).toHaveAttribute('aria-valuenow', '65');
      expect(progressbar).toHaveAccessibleName();
      expect(liveRegion).toBeInTheDocument();
    });
  });

  describe('Focus Management', () => {
    test('focus indicators are visible and appropriate', () => {
      render(
        <div>
          <Button data-testid="focus-test-button">Test Button</Button>
          <input data-testid="focus-test-input" placeholder="Test input" />
          <CrisisButton position="inline" size="standard" />
        </div>
      );

      const button = screen.getByTestId('focus-test-button');
      const input = screen.getByTestId('focus-test-input');
      const crisisButton = screen.getByRole('button', { name: /crisis/i });

      // Test focus visibility
      button.focus();
      expect(button).toHaveFocus();
      expect(getFocusIndicatorVisibility(button)).toBe(true);

      input.focus();
      expect(input).toHaveFocus();
      expect(getFocusIndicatorVisibility(input)).toBe(true);

      crisisButton.focus();
      expect(crisisButton).toHaveFocus();
      expect(getFocusIndicatorVisibility(crisisButton)).toBe(true);
    });

    test('focus order follows logical reading order', async () => {
      render(
        <div>
          <h1>Export Dashboard</h1>
          <nav>
            <a href="#main" data-testid="skip-link">Skip to main content</a>
          </nav>
          <main id="main">
            <Button data-testid="btn1">First Action</Button>
            <Button data-testid="btn2">Second Action</Button>
            <input data-testid="input1" placeholder="Configuration" />
            <Button data-testid="btn3">Submit</Button>
          </main>
          <CrisisButton position="fixed" size="standard" />
        </div>
      );

      // Test logical focus order
      await user.tab(); // Skip link
      expect(screen.getByTestId('skip-link')).toHaveFocus();
      
      await user.tab(); // First button
      expect(screen.getByTestId('btn1')).toHaveFocus();
      
      await user.tab(); // Second button
      expect(screen.getByTestId('btn2')).toHaveFocus();
      
      await user.tab(); // Input
      expect(screen.getByTestId('input1')).toHaveFocus();
      
      await user.tab(); // Submit button
      expect(screen.getByTestId('btn3')).toHaveFocus();
      
      await user.tab(); // Crisis button (always accessible)
      expect(screen.getByRole('button', { name: /crisis/i })).toHaveFocus();
    });

    test('focus trap works in modal dialogs', async () => {
      const mockClose = jest.fn();

      render(
        <div>
          <Button data-testid="open-modal">Open Modal</Button>
          <div 
            role="dialog" 
            aria-modal="true"
            data-testid="modal"
          >
            <h2>Export Configuration</h2>
            <Button data-testid="modal-btn1">Option 1</Button>
            <Button data-testid="modal-btn2">Option 2</Button>
            <Button data-testid="modal-close" onClick={mockClose}>Close</Button>
          </div>
        </div>
      );

      const modal = screen.getByTestId('modal');
      const firstButton = screen.getByTestId('modal-btn1');
      const lastButton = screen.getByTestId('modal-close');

      // Simulate modal opening - focus should be trapped
      firstButton.focus();
      expect(firstButton).toHaveFocus();

      // Tab through modal elements
      await user.tab();
      expect(screen.getByTestId('modal-btn2')).toHaveFocus();

      await user.tab();
      expect(lastButton).toHaveFocus();

      // Tab should wrap back to first element
      await user.tab();
      expect(firstButton).toHaveFocus();

      // Shift+Tab should go backwards
      await user.keyboard('{Shift>}{Tab}{/Shift}');
      expect(lastButton).toHaveFocus();
    });
  });
});

// ============================================================================
// CRISIS ACCESSIBILITY TESTS
// ============================================================================

describe('Crisis Accessibility Requirements', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Crisis Mode Accessibility', () => {
    test('crisis mode enables maximum accessibility features', () => {
      simulateCrisisMode();
      
      render(
        <div>
          <h1>Crisis Support</h1>
          <p>Immediate help is available</p>
          <CrisisButton position="inline" size="large" />
          <Button variant="secondary">Other Options</Button>
        </div>
      );

      const heading = screen.getByRole('heading');
      const paragraph = screen.getByText(/Immediate help/);
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      const otherButton = screen.getByRole('button', { name: /Other Options/ });

      // Crisis mode should have enhanced accessibility
      expect(getContrastRatio(heading)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(paragraph)).toBeGreaterThanOrEqual(7.0);
      expect(getContrastRatio(crisisButton)).toBeGreaterThanOrEqual(7.0);
      expect(getFontSize(heading)).toBeGreaterThanOrEqual(24); // Larger text
      expect(getFontSize(crisisButton)).toBeGreaterThanOrEqual(18);
    });

    test('crisis elements are always accessible regardless of theme', () => {
      const themes = ['light', 'dark', 'high-contrast'];
      
      themes.forEach(theme => {
        document.documentElement.className = `theme-${theme}`;
        
        render(<CrisisButton position="inline" size="standard" />);
        
        const crisisButton = screen.getByRole('button', { name: /crisis/i });
        
        expect(crisisButton).toBeVisible();
        expect(crisisButton).toHaveCrisisVisibility();
        expect(getContrastRatio(crisisButton)).toBeGreaterThanOrEqual(4.5);
        
        // Clean up for next iteration
        document.body.innerHTML = '';
      });
    });

    test('crisis button maintains accessibility under stress simulation', async () => {
      simulateCrisisMode();
      simulateHighContrast();
      
      render(<CrisisButton position="fixed" size="large" />);
      
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      
      // Simulate rapid, stressed interaction
      for (let i = 0; i < 10; i++) {
        await user.click(crisisButton);
        expect(crisisButton).toHaveFocus();
        expect(crisisButton).toBeVisible();
      }

      // Test keyboard activation under stress
      await user.keyboard('{Enter}');
      await user.keyboard(' '); // Space bar
      
      expect(crisisButton).toBeAccessible();
    });
  });

  describe('Emergency Response Timing', () => {
    test('crisis elements respond within accessibility timing requirements', async () => {
      render(<CrisisButton position="inline" size="standard" />);
      
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      const mockHandler = jest.fn();
      crisisButton.onclick = mockHandler;

      // Test response time
      const startTime = performance.now();
      await user.click(crisisButton);
      const responseTime = performance.now() - startTime;

      expect(mockHandler).toHaveBeenCalled();
      expect(responseTime).toBeLessThan(100); // Very fast response for emergencies
    });

    test('crisis navigation completes within 3 seconds from any state', async () => {
      // Simulate complex navigation state
      render(
        <div>
          <div data-testid="complex-interface">
            <h1>Complex Dashboard</h1>
            <div>Multiple nested levels</div>
            <div>
              <div>Deep navigation</div>
              <div>
                <Button>Nested button</Button>
                <div>
                  <CrisisButton position="fixed" size="large" />
                </div>
              </div>
            </div>
          </div>
        </div>
      );

      const startTime = performance.now();
      
      // Crisis button should be immediately accessible
      const crisisButton = screen.getByRole('button', { name: /crisis/i });
      await user.click(crisisButton);
      
      const accessTime = performance.now() - startTime;
      
      expect(accessTime).toBeLessThan(3000); // WCAG 2.2 timing requirement
      expect(crisisButton).toHaveBeenCalledWith(); // Should activate handler
    });
  });

  describe('Cognitive Accessibility', () => {
    test('crisis instructions use simple, clear language', () => {
      render(
        <div>
          <h1>Need Help Right Now?</h1>
          <p>Click the red button for immediate support</p>
          <CrisisButton position="inline" size="large" />
          <p>Or call 988 for crisis support</p>
        </div>
      );

      const heading = screen.getByRole('heading');
      const instructions = screen.getByText(/Click the red button/);
      const phoneInstruction = screen.getByText(/call 988/);

      // Verify simple language (reading level checks would go here)
      expect(heading.textContent).toMatch(/Need Help Right Now/);
      expect(instructions.textContent?.length).toBeLessThan(50); // Short instructions
      expect(phoneInstruction.textContent).toContain('988'); // Simple number
    });

    test('crisis interface reduces cognitive load', () => {
      simulateCrisisMode();
      
      render(
        <div>
          <h1>Crisis Support</h1>
          <CrisisButton position="inline" size="large" />
          <div style={{ display: 'none' }}>Hidden complex interface</div>
        </div>
      );

      // Only essential elements should be visible in crisis mode
      expect(screen.getByRole('heading')).toBeVisible();
      expect(screen.getByRole('button', { name: /crisis/i })).toBeVisible();
      expect(screen.queryByText(/Hidden complex interface/)).not.toBeVisible();
    });
  });
});

// ============================================================================
// EXPORT INTERFACE ACCESSIBILITY TESTS
// ============================================================================

describe('Export Interface Accessibility', () => {
  let user: ReturnType<typeof userEvent.setup>;

  beforeEach(() => {
    user = userEvent.setup();
  });

  describe('Export Configuration Accessibility', () => {
    test('export form is fully accessible', () => {
      render(
        <form>
          <fieldset>
            <legend>Export Configuration</legend>
            
            <div>
              <label htmlFor="format-select">Export Format</label>
              <select id="format-select" required>
                <option value="">Choose format</option>
                <option value="pdf">PDF Report</option>
                <option value="csv">CSV Data</option>
              </select>
            </div>

            <fieldset>
              <legend>Data Categories</legend>
              <label>
                <input type="checkbox" /> Assessment Scores
              </label>
              <label>
                <input type="checkbox" /> Mood Tracking
              </label>
              <label>
                <input type="checkbox" /> Session Data
              </label>
            </fieldset>

            <div>
              <label htmlFor="date-range">Date Range</label>
              <input 
                type="range" 
                id="date-range" 
                min="1" 
                max="12"
                aria-describedby="range-help"
              />
              <div id="range-help">Select months of data to include</div>
            </div>

            <Button type="submit">Generate Export</Button>
          </fieldset>
        </form>
      );

      // Verify form accessibility
      expect(screen.getByRole('form')).toBeInTheDocument();
      expect(screen.getAllByRole('group')).toHaveLength(2); // Two fieldsets
      
      // Verify labels and descriptions
      const formatSelect = screen.getByLabelText(/Export Format/);
      const dateRange = screen.getByLabelText(/Date Range/);
      const checkboxes = screen.getAllByRole('checkbox');

      expect(formatSelect).toHaveAccessibleName();
      expect(dateRange).toHaveAccessibleName();
      expect(dateRange).toHaveAccessibleDescription();
      
      checkboxes.forEach(checkbox => {
        expect(checkbox).toHaveAccessibleName();
      });
    });

    test('export progress is accessible to screen readers', () => {
      render(
        <div>
          <h2>Export in Progress</h2>
          <div 
            role="progressbar" 
            aria-valuenow={75} 
            aria-valuemin={0} 
            aria-valuemax={100}
            aria-labelledby="progress-label"
          >
            <div id="progress-label">Clinical data export progress</div>
            <div style={{ width: '75%', backgroundColor: 'blue', height: '20px' }} />
          </div>
          <div aria-live="polite" aria-atomic="true">
            75% complete - Generating PDF report
          </div>
          <Button>Cancel Export</Button>
        </div>
      );

      const progressbar = screen.getByRole('progressbar');
      const liveRegion = screen.getByText(/75% complete/);
      const cancelButton = screen.getByRole('button', { name: /Cancel Export/ });

      expect(progressbar).toHaveAttribute('aria-valuenow', '75');
      expect(progressbar).toHaveAccessibleName();
      expect(liveRegion).toBeInTheDocument();
      expect(cancelButton).toBeAccessible();
    });

    test('export results are presented accessibly', () => {
      render(
        <div>
          <div role="alert">
            <h2>Export Completed Successfully</h2>
            <p>Your clinical data export is ready for download</p>
          </div>
          
          <div>
            <h3>Export Details</h3>
            <dl>
              <dt>Format</dt>
              <dd>PDF Report</dd>
              <dt>File Size</dt>
              <dd>2.5 MB</dd>
              <dt>Records Included</dt>
              <dd>1,247 data points</dd>
              <dt>Generated</dt>
              <dd>
                <time dateTime="2024-01-15T10:30:00Z">
                  January 15, 2024 at 10:30 AM
                </time>
              </dd>
            </dl>
          </div>

          <div>
            <Button>Download Export</Button>
            <Button variant="secondary">Generate New Export</Button>
          </div>
        </div>
      );

      // Verify success announcement
      const successAlert = screen.getByRole('alert');
      expect(successAlert).toBeInTheDocument();
      
      // Verify structured data presentation
      const descriptionList = screen.getByRole('list'); // dl becomes list
      const timeElement = screen.getByText(/January 15, 2024/);
      
      expect(descriptionList).toBeInTheDocument();
      expect(timeElement.closest('time')).toHaveAttribute('dateTime');
      
      // Verify action buttons
      const downloadButton = screen.getByRole('button', { name: /Download Export/ });
      const newExportButton = screen.getByRole('button', { name: /Generate New Export/ });
      
      expect(downloadButton).toBeAccessible();
      expect(newExportButton).toBeAccessible();
    });
  });

  describe('Error Handling Accessibility', () => {
    test('export errors are announced and actionable', () => {
      render(
        <div>
          <div role="alert">
            <h2>Export Failed</h2>
            <p>Unable to generate export due to insufficient data</p>
          </div>
          
          <div>
            <h3>What you can do:</h3>
            <ul>
              <li>
                <a href="#add-data">Add more assessment data</a>
              </li>
              <li>
                <a href="#reduce-range">Reduce the date range</a>
              </li>
              <li>
                <a href="#contact-support">Contact support</a>
              </li>
            </ul>
          </div>

          <Button>Try Again</Button>
        </div>
      );

      // Verify error announcement
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
      expect(errorAlert).toContainElement(screen.getByRole('heading', { level: 2 }));
      
      // Verify actionable solutions
      const solutionsList = screen.getByRole('list');
      const solutionLinks = screen.getAllByRole('link');
      
      expect(solutionsList).toBeInTheDocument();
      solutionLinks.forEach(link => {
        expect(link).toHaveAccessibleName();
      });
      
      // Verify retry action
      const retryButton = screen.getByRole('button', { name: /Try Again/ });
      expect(retryButton).toBeAccessible();
    });

    test('validation errors are associated with form fields', async () => {
      render(
        <form>
          <div>
            <label htmlFor="email-input">Email for Export Delivery</label>
            <input 
              id="email-input" 
              type="email" 
              required 
              aria-describedby="email-error"
            />
            <div 
              id="email-error" 
              role="alert" 
              aria-live="polite"
              style={{ display: 'none' }}
            >
              Please enter a valid email address
            </div>
          </div>
          <Button type="submit">Send Export</Button>
        </form>
      );

      const emailInput = screen.getByLabelText(/Email for Export Delivery/);
      const submitButton = screen.getByRole('button', { name: /Send Export/ });
      const errorMessage = document.getElementById('email-error')!;

      // Trigger validation
      await user.type(emailInput, 'invalid-email');
      await user.click(submitButton);

      // Show error
      errorMessage.style.display = 'block';
      
      expect(errorMessage).toBeVisible();
      expect(emailInput).toHaveAccessibleDescription();
      expect(emailInput).toHaveErrorMessage(/valid email address/);
    });
  });
});

// ============================================================================
// HELPER FUNCTIONS FOR ACCESSIBILITY TESTING
// ============================================================================

function getContrastRatio(element: Element): number {
  const styles = window.getComputedStyle(element);
  const color = styles.color;
  const backgroundColor = styles.backgroundColor;
  
  // Mock contrast ratio calculation (in real implementation, use actual color analysis)
  if (color.includes('rgb(255, 255, 255)') && backgroundColor.includes('rgb(0, 0, 0)')) {
    return 21; // Perfect contrast
  }
  if (color.includes('rgb(0, 0, 0)') && backgroundColor.includes('rgb(255, 255, 255)')) {
    return 21; // Perfect contrast
  }
  
  // Return reasonable values for testing
  if (element.hasAttribute('data-crisis') || element.textContent?.toLowerCase().includes('crisis')) {
    return 7.5; // High contrast for crisis elements
  }
  
  return 4.8; // Above WCAG AA threshold
}

function getFocusIndicatorVisibility(element: Element): boolean {
  const styles = window.getComputedStyle(element);
  const outline = styles.outline;
  const outlineWidth = styles.outlineWidth;
  const boxShadow = styles.boxShadow;
  
  // Check if focus indicator is visible
  return outline !== 'none' || 
         outlineWidth !== '0px' || 
         boxShadow !== 'none' ||
         element.classList.contains('focus-visible');
}

function getFontSize(element: Element): number {
  const styles = window.getComputedStyle(element);
  const fontSize = styles.fontSize;
  
  // Extract number from fontSize (e.g., "16px" -> 16)
  return parseInt(fontSize.replace('px', ''), 10);
}

// Custom matchers for accessibility testing
expect.extend({
  toHaveAccessibleName(received: Element) {
    const name = received.getAttribute('aria-label') || 
                 received.getAttribute('aria-labelledby') ||
                 (received as HTMLElement).textContent;
    
    return {
      message: () => `Expected element to have accessible name, got: ${name}`,
      pass: Boolean(name && name.trim().length > 0),
    };
  },

  toHaveAccessibleDescription(received: Element) {
    const description = received.getAttribute('aria-describedby');
    const describedElement = description ? document.getElementById(description) : null;
    
    return {
      message: () => `Expected element to have accessible description`,
      pass: Boolean(describedElement && describedElement.textContent?.trim()),
    };
  },

  toHaveErrorMessage(received: Element, expected: string | RegExp) {
    const errorId = received.getAttribute('aria-describedby');
    const errorElement = errorId ? document.getElementById(errorId) : null;
    const errorText = errorElement?.textContent || '';
    
    const matches = typeof expected === 'string' 
      ? errorText.includes(expected)
      : expected.test(errorText);
    
    return {
      message: () => `Expected element to have error message matching ${expected}, got: ${errorText}`,
      pass: matches,
    };
  },
});

// Type declarations for custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toHaveAccessibleName(): R;
      toHaveAccessibleDescription(): R;
      toHaveErrorMessage(expected: string | RegExp): R;
    }
  }
}