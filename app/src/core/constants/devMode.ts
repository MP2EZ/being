/**
 * DEVELOPMENT MODE CONFIGURATION
 *
 * FEAT-6 MVP: Single-user development mode
 *
 * PURPOSE:
 * - Enable testable profile functionality without full authentication
 * - Allow UX/accessibility validation before FEAT-16 (auth) ships
 * - Clearly indicate development-only features
 *
 * LIMITATIONS:
 * - Single user only (no multi-user data isolation)
 * - NOT HIPAA compliant (testing only)
 * - No production use
 *
 * V2 REQUIREMENTS (FEAT-57):
 * - Replace with real auth service (FEAT-16)
 * - Implement multi-user data isolation
 * - Add audit trail (INFRA-60)
 * - Full HIPAA compliance
 */

/**
 * Development mode flag
 * Set to false when FEAT-16 (authentication) ships
 */
export const IS_DEV_MODE = true;

/**
 * Development user ID
 * Used as placeholder until FEAT-16 provides real getCurrentUserId()
 */
export const DEV_USER_ID = 'dev-user-001';

/**
 * Development user metadata (for UI display)
 */
export const DEV_USER_EMAIL = 'dev-user@being.local';
export const DEV_USER_CREATED_AT = new Date('2025-01-01');

/**
 * Get current user ID
 *
 * MVP: Returns hardcoded dev user
 * V2 (FEAT-16): Replace with actual auth service call
 *
 * @returns User ID string
 */
export function getCurrentUserId(): string {
  if (IS_DEV_MODE) {
    return DEV_USER_ID;
  }

  // TODO (FEAT-16): Integrate with authentication service
  // return authService.getCurrentUserId();
  throw new Error('Production auth not implemented. Set IS_DEV_MODE=true for development.');
}

/**
 * Get current user email
 *
 * MVP: Returns hardcoded dev email
 * V2 (FEAT-16): Replace with actual auth service call
 *
 * @returns User email string
 */
export function getCurrentUserEmail(): string {
  if (IS_DEV_MODE) {
    return DEV_USER_EMAIL;
  }

  // TODO (FEAT-16): Integrate with authentication service
  // return authService.getCurrentUserEmail();
  throw new Error('Production auth not implemented. Set IS_DEV_MODE=true for development.');
}

/**
 * Get user account creation date
 *
 * MVP: Returns hardcoded date
 * V2 (FEAT-16): Replace with actual auth service call
 *
 * @returns Account creation date
 */
export function getUserCreatedAt(): Date {
  if (IS_DEV_MODE) {
    return DEV_USER_CREATED_AT;
  }

  // TODO (FEAT-16): Integrate with authentication service
  // return authService.getUserCreatedAt();
  throw new Error('Production auth not implemented. Set IS_DEV_MODE=true for development.');
}

/**
 * Check if app is in development mode
 * Used by UI components to show dev mode indicators
 *
 * @returns true if in development mode
 */
export function isDevMode(): boolean {
  return IS_DEV_MODE;
}
