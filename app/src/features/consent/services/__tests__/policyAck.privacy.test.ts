/**
 * FEAT-860 — the privacy-policy acknowledgement record.
 *
 * Its own SecureStore key, not wellness data and not part of LegalGateConsents (whose
 * shape is frozen). It is ACKNOWLEDGEMENT, never consent: nothing reads it to permit
 * processing.
 */
const mockSecureStore: Record<string, string> = {};
let mockReadFails = false;
let mockWriteFails = false;

jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(async (key: string) => {
    if (mockReadFails) throw new Error('keychain locked');
    return mockSecureStore[key] ?? null;
  }),
  setItemAsync: jest.fn(async (key: string, value: string) => {
    if (mockWriteFails) throw new Error('keychain locked');
    mockSecureStore[key] = value;
  }),
  deleteItemAsync: jest.fn(async (key: string) => {
    delete mockSecureStore[key];
  }),
}));

import { getPolicyRevisions } from '../policyRevisions';
import { PRIVACY_POLICY_ACK_KEY, readPolicyAck, writePolicyAck } from '../policyAck';

beforeEach(() => {
  for (const k of Object.keys(mockSecureStore)) delete mockSecureStore[k];
  mockReadFails = false;
  mockWriteFails = false;
});

describe('policyAck', () => {
  it('uses the privacy_policy_ack_v1 SecureStore key', () => {
    expect(PRIVACY_POLICY_ACK_KEY).toBe('privacy_policy_ack_v1');
  });

  it('reads absent when nothing is stored', async () => {
    expect(await readPolicyAck()).toEqual({ status: 'absent' });
  });

  it('writes {version, acknowledgedAt, source} at the bundled header version', async () => {
    const before = Date.now();
    await writePolicyAck('notice');
    const stored = JSON.parse(mockSecureStore[PRIVACY_POLICY_ACK_KEY]);
    expect(Object.keys(stored).sort()).toEqual(['acknowledgedAt', 'source', 'version']);
    expect(stored.version).toBe(getPolicyRevisions().headerVersion);
    expect(stored.source).toBe('notice');
    expect(stored.acknowledgedAt).toBeGreaterThanOrEqual(before);
  });

  it('round-trips through readPolicyAck', async () => {
    await writePolicyAck('legal_gate');
    const result = await readPolicyAck();
    expect(result.status).toBe('present');
    if (result.status === 'present') {
      expect(result.ack.version).toBe(getPolicyRevisions().headerVersion);
      expect(result.ack.source).toBe('legal_gate');
    }
  });

  it('treats a malformed stored value as absent, so the notice can show and a tap rewrites it', async () => {
    for (const bad of ['not json', '{}', '[]', '{"version":1,"acknowledgedAt":1,"source":"notice"}', 'null']) {
      mockSecureStore[PRIVACY_POLICY_ACK_KEY] = bad;
      expect(await readPolicyAck()).toEqual({ status: 'absent' });
    }
  });

  it('an unknown source is malformed', async () => {
    mockSecureStore[PRIVACY_POLICY_ACK_KEY] = JSON.stringify({
      version: '1.29',
      acknowledgedAt: 1,
      source: 'accepted',
    });
    expect(await readPolicyAck()).toEqual({ status: 'absent' });
  });

  it('a read fault is reported as an error, never thrown', async () => {
    mockReadFails = true;
    await expect(readPolicyAck()).resolves.toEqual({ status: 'error' });
  });

  it('a write fault rejects on writePolicyAck so the explicit tap can see it', async () => {
    mockWriteFails = true;
    await expect(writePolicyAck('notice')).rejects.toThrow('keychain locked');
  });
});
