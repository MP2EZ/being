/**
 * FullMind Website - Global Test Setup
 * Prepares environment for accessibility testing
 */

import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('🚀 Starting FullMind accessibility test setup...');

  // Create a browser instance for setup tasks
  const browser = await chromium.launch();
  const page = await browser.newPage();

  try {
    // Verify development server is running
    const baseURL = config.webServer?.url || 'http://localhost:3000';
    
    console.log(`📡 Checking server availability at ${baseURL}...`);
    
    await page.goto(baseURL, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    console.log('✅ Development server is responding');

    // Verify critical accessibility infrastructure is present
    console.log('🔍 Verifying accessibility infrastructure...');
    
    // Check for accessibility context
    const accessibilityProvider = await page.locator('[data-testid="accessibility-context"]').count();
    if (accessibilityProvider === 0) {
      console.warn('⚠️  Accessibility context not found - some tests may fail');
    }
    
    // Check for ARIA live regions
    const ariaLiveRegions = await page.locator('[aria-live]').count();
    console.log(`📢 Found ${ariaLiveRegions} ARIA live regions`);
    
    // Check for skip links
    const skipLinks = await page.locator('.skip-link').count();
    console.log(`🔗 Found ${skipLinks} skip links`);
    
    // Check for crisis button
    const crisisButton = await page.locator('#crisis-help-button, [data-crisis-help="true"]').count();
    if (crisisButton === 0) {
      console.warn('🚨 Crisis help button not found - mental health accessibility tests will fail');
    } else {
      console.log('✅ Crisis help button found');
    }
    
    // Verify CSS accessibility utilities are loaded
    const srOnlyClass = await page.evaluate(() => {
      const testElement = document.createElement('div');
      testElement.className = 'sr-only';
      document.body.appendChild(testElement);
      const styles = window.getComputedStyle(testElement);
      const isHidden = styles.position === 'absolute' && 
                     styles.width === '1px' && 
                     styles.height === '1px';
      document.body.removeChild(testElement);
      return isHidden;
    });
    
    if (srOnlyClass) {
      console.log('✅ Accessibility CSS utilities loaded');
    } else {
      console.warn('⚠️  Accessibility CSS utilities not properly loaded');
    }
    
    console.log('🎯 Accessibility infrastructure check complete');

  } catch (error) {
    console.error('❌ Global setup failed:', error);
    throw error;
  } finally {
    await browser.close();
  }

  console.log('✨ Global setup completed successfully');
}

export default globalSetup;