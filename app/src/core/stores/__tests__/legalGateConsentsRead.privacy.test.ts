/**
 * `getLegalGateConsents` must not hand back a record it has not validated (DEBUG-419)
 *
 * THE DEFECT THIS PINS
 *
 * The read blind-cast whatever `JSON.parse` returned:
 *
 *     return stored ? (JSON.parse(stored) as LegalGateConsents) : null;
 *
 * `as` is a compile-time assertion with no runtime effect, so ANY parseable value
 * came back as a `LegalGateConsents` — `{}`, a truncated-but-valid object, a
 * foreign schema, even a bare number. The caller's `if (!legalGate)` guard is then
 * FALSE (the object is truthy), so the caller's own "record was unreadable" branch
 * never fires, and a missing `mentalHealthProcessingConsent` silently became
 * whatever the caller's fallback said.
 *
 * That is strictly worse than the defect DEBUG-382 was written to fix. DEBUG-382's
 * null path at least LOGGED. This path logged nothing at all, because as far as
 * every layer was concerned the record had been read successfully.
 *
 * WHY THE BRANCHES ARE LOGGED DIFFERENTLY
 *
 * Absent is a legitimate state — before the legal gate has ever been completed
 * there is nothing to read, and shouting about it would train the reader to ignore
 * the channel. A read that THROWS and a record that parses to the wrong SHAPE are
 * both faults, and they have different causes worth telling apart: the first is
 * Keychain/SecureStore unavailability, the second is corruption, tampering, or
 * schema drift. So this layer logs the two faults with a `reason`, and stays quiet
 * on absence. The CALLER logs what it decided to do about a null, whatever the
 * cause — see `legalGateConsentReconstruction.privacy.test.tsx`. Correlating the
 * two gives the full picture, and each fact is recorded by the layer that knows it.
 *
 * This suite is a `.privacy.` file so the `Safety + privacy gates` job runs it
 * (INFRA-368). It deliberately does NOT live in `consentStore.test.ts`, which is on
 * `ci-uncovered-tests.json` and therefore gates nothing.
 */

import * as SecureStore from 'expo-secure-store';

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@/core/services/logging', () => ({
  logSecurity: jest.fn(),
  logError: jest.fn(),
  logStateChange: jest.fn(),
  logPerformance: jest.fn(),
  LogCategory: { SECURITY: 'security' },
}));

import { logSecurity } from '@/core/services/logging';
import { getLegalGateConsents } from '../consentStore';

const mockGetItem = SecureStore.getItemAsync as jest.MockedFunction<typeof SecureStore.getItemAsync>;
const mockLogSecurity = logSecurity as jest.MockedFunction<typeof logSecurity>;

const WELL_FORMED = {
  tosAccepted: true,
  privacyAccepted: true,
  wellnessDisclaimerAcknowledged: true,
  mentalHealthProcessingConsent: true,
  timestamp: 1_700_000_000_000,
  version: '1.1.0',
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('a well-formed record is returned unchanged', () => {
  it('returns the parsed record when every field is present and correctly typed', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify(WELL_FORMED));

    await expect(getLegalGateConsents()).resolves.toEqual(WELL_FORMED);
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });

  it('returns a genuine `false` decision without rewriting it', async () => {
    // The whole point of validating shape is to tell "no answer" from "the answer
    // was no". A validator that collapsed the two would recreate the original bug.
    const refused = { ...WELL_FORMED, mentalHealthProcessingConsent: false };
    mockGetItem.mockResolvedValue(JSON.stringify(refused));

    await expect(getLegalGateConsents()).resolves.toEqual(refused);
    expect(mockLogSecurity).not.toHaveBeenCalled();
  });
});

describe('absence is not a fault and is not logged', () => {
  it('returns null when nothing is stored', async () => {
    mockGetItem.mockResolvedValue(null);

    await expect(getLegalGateConsents()).resolves.toBeNull();
  });

  it('stays silent — a user who has not reached the gate yet is normal', async () => {
    mockGetItem.mockResolvedValue(null);

    await getLegalGateConsents();

    expect(mockLogSecurity).not.toHaveBeenCalled();
  });
});

describe('a read that throws is a fault, reported as read_failed', () => {
  it('returns null rather than propagating', async () => {
    mockGetItem.mockRejectedValue(new Error('keychain unavailable'));

    await expect(getLegalGateConsents()).resolves.toBeNull();
  });

  it('logs at high severity naming the branch', async () => {
    mockGetItem.mockRejectedValue(new Error('keychain unavailable'));

    await getLegalGateConsents();

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.objectContaining({ reason: 'read_failed' }),
    );
  });

  it('treats unparseable JSON as a read failure, not as a record', async () => {
    mockGetItem.mockResolvedValue('{ not json');

    await expect(getLegalGateConsents()).resolves.toBeNull();
    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.objectContaining({ reason: 'read_failed' }),
    );
  });
});

describe('a record of the wrong shape is a fault, reported as shape_invalid', () => {
  it.each([
    ['the consent field is absent entirely', (() => {
      const { mentalHealthProcessingConsent: _omitted, ...rest } = WELL_FORMED;
      return rest;
    })()],
    ['the consent field is a string, not a boolean', { ...WELL_FORMED, mentalHealthProcessingConsent: 'true' }],
    ['the consent field is null', { ...WELL_FORMED, mentalHealthProcessingConsent: null }],
    ['a sibling required consent is missing', (() => {
      const { tosAccepted: _omitted, ...rest } = WELL_FORMED;
      return rest;
    })()],
    ['the record is an empty object', {}],
    ['the record parses to an array', []],
  ])('returns null when %s', async (_label, stored) => {
    mockGetItem.mockResolvedValue(JSON.stringify(stored));

    await expect(getLegalGateConsents()).resolves.toBeNull();
  });

  it.each([
    ['a bare number', '42'],
    ['a bare string', '"legal_gate"'],
    ['the literal null', 'null'],
  ])('returns null when the stored value is %s', async (_label, stored) => {
    mockGetItem.mockResolvedValue(stored);

    await expect(getLegalGateConsents()).resolves.toBeNull();
  });

  it('logs at high severity naming the branch', async () => {
    mockGetItem.mockResolvedValue(JSON.stringify({ tosAccepted: true }));

    await getLegalGateConsents();

    expect(mockLogSecurity).toHaveBeenCalledWith(
      expect.stringContaining('legal-gate'),
      'high',
      expect.objectContaining({ reason: 'shape_invalid' }),
    );
  });

  it('does not log the record contents — the fault is the shape, not the data', async () => {
    // This record is consent evidence. A validator that dumped it into the log to
    // explain itself would copy sensitive-data consent state into an unencrypted
    // sink, which is a worse outcome than the bug being diagnosed.
    mockGetItem.mockResolvedValue(JSON.stringify({ tosAccepted: true, secretish: 'value' }));

    await getLegalGateConsents();

    const logged = JSON.stringify(mockLogSecurity.mock.calls);
    expect(logged).not.toContain('secretish');
    expect(logged).not.toContain('value');
  });
});
