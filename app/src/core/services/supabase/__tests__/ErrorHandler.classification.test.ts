/**
 * CloudSyncErrorHandler — error classification contract (MAINT-235)
 *
 * Pins the pure categorize → severity → retryability mapping that drives cloud-sync
 * recovery (zero tests before this). Honest behavioral assertions via the public
 * handleError() entry point. Error category determines whether a failed sync is
 * retried, so a misclassification could either spin forever (retrying a corrupt
 * payload) or silently drop a recoverable network blip.
 */

jest.mock('../../logging', () => ({
  logSecurity: jest.fn(),
  logPerformance: jest.fn(),
  logError: jest.fn(),
  LogCategory: { SYSTEM: 'SYSTEM' },
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(async () => undefined),
  getItem: jest.fn(async () => null),
}));

import cloudErrorHandler from '../ErrorHandler';
import { ErrorCategory } from '../ErrorHandler';

describe('CloudSyncErrorHandler — categorizes errors by message/name', () => {
  it.each([
    ['network timeout while fetching', ErrorCategory.NETWORK],
    ['Request unauthorized: token expired', ErrorCategory.AUTHENTICATION],
    ['Backup integrity check failed - data may be corrupted', ErrorCategory.DATA_CORRUPTION],
    ['decrypt failed: invalid cipher key', ErrorCategory.ENCRYPTION],
  ])('classifies "%s" as the expected category', async (message, expected) => {
    const result = await cloudErrorHandler.handleError(new Error(message));
    expect(result.category).toBe(expected);
  });

  it('classifies the CloudBackupService integrity-mismatch error as DATA_CORRUPTION (cross-module link)', async () => {
    const result = await cloudErrorHandler.handleError(
      new Error('Backup integrity check failed - data may be corrupted')
    );
    expect(result.category).toBe(ErrorCategory.DATA_CORRUPTION);
  });
});

describe('CloudSyncErrorHandler — retryability drives recovery', () => {
  it('marks a transient network error retryable with a non-zero retry budget', async () => {
    const result = await cloudErrorHandler.handleError(new Error('network connection lost'));
    expect(result.retryable).toBe(true);
    expect(result.maxRetries).toBeGreaterThan(0);
  });

  it('marks a data-corruption error NON-retryable (never retry a corrupt payload)', async () => {
    const result = await cloudErrorHandler.handleError(
      new Error('checksum mismatch — corrupt data')
    );
    expect(result.retryable).toBe(false);
    expect(result.maxRetries).toBe(0);
  });

  it('marks an authentication error NON-retryable (a bad token will not fix itself by retrying)', async () => {
    const result = await cloudErrorHandler.handleError(new Error('unauthorized: invalid token'));
    expect(result.retryable).toBe(false);
  });
});
