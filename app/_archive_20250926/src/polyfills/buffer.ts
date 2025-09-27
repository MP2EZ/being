/**
 * Buffer Polyfill for React Native
 *
 * Provides Node.js Buffer API compatibility for React Native environment.
 * Used by authentication and encryption services.
 */

// Simple Buffer polyfill for development
class BufferPolyfill {
  private data: Uint8Array;

  constructor(input?: string | number | ArrayBuffer | Uint8Array, encoding?: string) {
    if (typeof input === 'string') {
      this.data = new TextEncoder().encode(input);
    } else if (typeof input === 'number') {
      this.data = new Uint8Array(input);
    } else if (input instanceof ArrayBuffer) {
      this.data = new Uint8Array(input);
    } else if (input instanceof Uint8Array) {
      this.data = input;
    } else {
      this.data = new Uint8Array(0);
    }
  }

  static from(input: string | ArrayBuffer | Uint8Array, encoding?: string): BufferPolyfill {
    return new BufferPolyfill(input, encoding);
  }

  static alloc(size: number): BufferPolyfill {
    return new BufferPolyfill(size);
  }

  toString(encoding?: string): string {
    if (encoding === 'hex') {
      return Array.from(this.data)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    return new TextDecoder().decode(this.data);
  }

  get length(): number {
    return this.data.length;
  }

  includes(value: string | number): boolean {
    if (typeof value === 'string') {
      return this.toString().includes(value);
    }
    return Array.from(this.data).includes(value);
  }

  slice(start?: number, end?: number): BufferPolyfill {
    return new BufferPolyfill(this.data.slice(start, end));
  }
}

// Install global Buffer polyfill
declare global {
  var Buffer: typeof BufferPolyfill;
}

// Ensure Buffer is properly polyfilled with property descriptor checks
try {
  if (typeof global !== 'undefined' && !global.Buffer) {
    Object.defineProperty(global, 'Buffer', {
      value: BufferPolyfill,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  // Fallback if property exists but is not configurable
  console.warn('Buffer polyfill: Could not set global.Buffer');
}

try {
  if (typeof globalThis !== 'undefined' && !globalThis.Buffer) {
    Object.defineProperty(globalThis, 'Buffer', {
      value: BufferPolyfill,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  // Fallback if property exists but is not configurable
  console.warn('Buffer polyfill: Could not set globalThis.Buffer');
}

// Defensive check to ensure Buffer.from exists
try {
  if (typeof Buffer === 'undefined' || !Buffer.from) {
    Object.defineProperty(global, 'Buffer', {
      value: BufferPolyfill,
      writable: true,
      configurable: true
    });
    Object.defineProperty(globalThis, 'Buffer', {
      value: BufferPolyfill,
      writable: true,
      configurable: true
    });
  }
} catch (e) {
  console.warn('Buffer polyfill: Could not set Buffer fallback');
}

export default BufferPolyfill;