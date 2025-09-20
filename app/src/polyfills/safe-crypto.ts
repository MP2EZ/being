/**
 * Safe Crypto Polyfill for React Native
 *
 * Only defines crypto if it doesn't already exist to prevent property descriptor conflicts
 */

function randomUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getRandomValues<T extends ArrayBufferView | null>(array: T): T {
  if (!array) {
    throw new Error('getRandomValues requires a non-null array');
  }

  if (array instanceof Uint8Array) {
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  } else {
    const uint8View = new Uint8Array(array.buffer, array.byteOffset, array.byteLength);
    for (let i = 0; i < uint8View.length; i++) {
      uint8View[i] = Math.floor(Math.random() * 256);
    }
  }

  return array;
}

const cryptoPolyfill = {
  randomUUID,
  getRandomValues,
  subtle: {
    generateKey: () => Promise.resolve({
      type: 'secret',
      algorithm: { name: 'AES-GCM' },
      extractable: false,
      usages: ['encrypt', 'decrypt']
    }),
    importKey: () => Promise.resolve({
      type: 'secret',
      algorithm: { name: 'PBKDF2' },
      extractable: false,
      usages: ['deriveKey']
    }),
    deriveKey: () => Promise.resolve({
      type: 'secret',
      algorithm: { name: 'AES-GCM' },
      extractable: false,
      usages: ['encrypt', 'decrypt']
    }),
    deriveBits: () => {
      const mockKey = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockKey[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(mockKey.buffer);
    },
    encrypt: () => {
      const mockData = new Uint8Array(64);
      for (let i = 0; i < 64; i++) {
        mockData[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(mockData.buffer);
    },
    decrypt: () => {
      const mockData = new Uint8Array(32);
      for (let i = 0; i < 32; i++) {
        mockData[i] = Math.floor(Math.random() * 256);
      }
      return Promise.resolve(mockData.buffer);
    }
  }
};

// Safe polyfill installation - only if crypto doesn't exist
if (typeof global !== 'undefined' && typeof global.crypto === 'undefined') {
  try {
    global.crypto = cryptoPolyfill as any;
  } catch (e) {
    console.warn('Crypto polyfill: Could not set global.crypto');
  }
}

export default cryptoPolyfill;