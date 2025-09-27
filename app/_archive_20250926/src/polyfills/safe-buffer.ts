/**
 * Safe Buffer Polyfill for React Native
 *
 * Only defines Buffer if it doesn't already exist to prevent property descriptor conflicts
 */

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

// Safe polyfill installation - only if Buffer doesn't exist
if (typeof global !== 'undefined' && typeof global.Buffer === 'undefined') {
  try {
    global.Buffer = BufferPolyfill as any;
  } catch (e) {
    console.warn('Buffer polyfill: Could not set global.Buffer');
  }
}

export default BufferPolyfill;