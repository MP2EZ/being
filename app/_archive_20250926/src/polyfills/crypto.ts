/**
 * Crypto Polyfill for React Native
 *
 * Provides Web Crypto API compatibility with synchronous API.
 * Note: Uses Math.random() fallback for development - not cryptographically secure.
 * TODO: Replace with secure implementation for production.
 */

/**
 * Generate a UUID v4 string using Math.random() (fallback for development)
 */
function randomUUID(): string {
  // Simple UUID v4 generation using Math.random()
  // WARNING: Not cryptographically secure - for development only
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

/**
 * Generate pseudo-random values for typed arrays using Math.random()
 * WARNING: Not cryptographically secure - for development only
 */
function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) {
    throw new Error('getRandomValues requires a non-null array');
  }

  if (array instanceof Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  } else {
    // Handle other typed array types
    const uint8View = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < uint8View.length; i++) {
      uint8View[i] = Math.floor(Math.random() * 256);
    }
  }

  return array;
}

/**
 * Mock Web Crypto API functions for development
 * WARNING: These are not cryptographically secure - for development only
 */
function generateKey(): Promise<any> {
  // Mock implementation for development
  return Promise.resolve({
    type: 'secret',
    algorithm: { name: 'AES-GCM' },
    extractable: false,
    usages: ['encrypt', 'decrypt']
  });
}

function importKey(): Promise<any> {
  // Mock implementation for development
  return Promise.resolve({
    type: 'secret',
    algorithm: { name: 'PBKDF2' },
    extractable: false,
    usages: ['deriveKey']
  });
}

function deriveKey(): Promise<any> {
  // Mock implementation for development
  return Promise.resolve({
    type: 'secret',
    algorithm: { name: 'AES-GCM' },
    extractable: false,
    usages: ['encrypt', 'decrypt']
  });
}

/**
 * Mock deriveBits function for PBKDF2 key derivation
 * WARNING: Not cryptographically secure - for development only
 */
function deriveBits(): Promise<ArrayBuffer> {
  // Generate mock 32-byte key for development
  const mockKey = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    mockKey[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(mockKey.buffer);
}

/**
 * Mock encrypt function for AES-GCM
 * WARNING: Not cryptographically secure - for development only
 */
function encrypt(): Promise<ArrayBuffer> {
  // Mock encrypted data for development
  const mockData = new Uint8Array(64);
  for (let i = 0; i < 64; i++) {
    mockData[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(mockData.buffer);
}

/**
 * Mock decrypt function for AES-GCM
 * WARNING: Not cryptographically secure - for development only
 */
function decrypt(): Promise<ArrayBuffer> {
  // Mock decrypted data for development
  const mockData = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    mockData[i] = Math.floor(Math.random() * 256);
  }
  return Promise.resolve(mockData.buffer);
}

/**
 * Polyfill crypto object for global access
 */
const cryptoPolyfill = {
  randomUUID,
  getRandomValues,
  subtle: {
    generateKey,
    importKey,
    deriveKey,
    deriveBits,
    encrypt,
    decrypt
  }
};

// Install global crypto polyfill
declare global {
  const crypto: typeof cryptoPolyfill;
}

// Safe polyfill installation with property descriptor checks
try {
  if (!global.crypto) {
    Object.defineProperty(global, 'crypto', {
      value: cryptoPolyfill,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  console.warn('Crypto polyfill: Could not set global.crypto');
}

export default cryptoPolyfill;