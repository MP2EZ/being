/**
 * Mock implementation of expo-crypto for testing
 * Provides consistent, testable crypto operations
 */

export const CryptoDigestAlgorithm = {
  SHA1: 'sha1',
  SHA256: 'sha256',
  SHA384: 'sha384',
  SHA512: 'sha512',
  MD5: 'md5',
};

export const CryptoEncoding = {
  HEX: 'hex',
  BASE64: 'base64',
};

export const digestStringAsync = jest.fn().mockImplementation(
  async (algorithm, data, options = {}) => {
    // Return a consistent hash for testing
    const mockHashes = {
      [CryptoDigestAlgorithm.SHA256]: '2c26b46b68ffc68ff99b453c1d30413413422d706483bfa0f98a5e886266e7ae',
      [CryptoDigestAlgorithm.SHA1]: 'aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d',
      [CryptoDigestAlgorithm.MD5]: '098f6bcd4621d373cade4e832627b4f6',
    };
    
    const hash = mockHashes[algorithm] || mockHashes[CryptoDigestAlgorithm.SHA256];
    return options.encoding === CryptoEncoding.BASE64 
      ? Buffer.from(hash, 'hex').toString('base64')
      : hash;
  }
);

export const getRandomBytes = jest.fn().mockImplementation((byteCount) => {
  // Return consistent random bytes for testing
  const bytes = new Uint8Array(byteCount);
  for (let i = 0; i < byteCount; i++) {
    bytes[i] = Math.floor(Math.random() * 256);
  }
  return bytes;
});

export const randomUUID = jest.fn().mockReturnValue('550e8400-e29b-41d4-a716-446655440000');

export default {
  CryptoDigestAlgorithm,
  CryptoEncoding,
  digestStringAsync,
  getRandomBytes,
  randomUUID,
};