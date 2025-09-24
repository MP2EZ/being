/**
 * Subscription Testing Polyfills
 * Day 17 Phase 5: Polyfills for testing environment
 */

// TextEncoder/TextDecoder polyfills for Node.js environment
if (typeof global.TextEncoder === 'undefined') {
  const { TextEncoder, TextDecoder } = require('util');
  global.TextEncoder = TextEncoder;
  global.TextDecoder = TextDecoder;
}

// Fetch polyfill for network-related tests
if (typeof global.fetch === 'undefined') {
  global.fetch = require('node-fetch');
}

// WebCrypto polyfill for encryption tests
if (typeof global.crypto === 'undefined') {
  const { webcrypto } = require('crypto');
  global.crypto = webcrypto;
}

// localStorage polyfill for storage tests
if (typeof global.localStorage === 'undefined') {
  global.localStorage = {
    data: {} as Record<string, string>,
    getItem(key: string) {
      return this.data[key] || null;
    },
    setItem(key: string, value: string) {
      this.data[key] = value;
    },
    removeItem(key: string) {
      delete this.data[key];
    },
    clear() {
      this.data = {};
    },
    get length() {
      return Object.keys(this.data).length;
    },
    key(index: number) {
      const keys = Object.keys(this.data);
      return keys[index] || null;
    }
  };
}

// sessionStorage polyfill
if (typeof global.sessionStorage === 'undefined') {
  global.sessionStorage = { ...global.localStorage };
}

// URL polyfill
if (typeof global.URL === 'undefined') {
  global.URL = require('url').URL;
}

// URLSearchParams polyfill
if (typeof global.URLSearchParams === 'undefined') {
  global.URLSearchParams = require('url').URLSearchParams;
}

// AbortController polyfill for timeout tests
if (typeof global.AbortController === 'undefined') {
  global.AbortController = require('abort-controller');
}

// Event polyfill
if (typeof global.Event === 'undefined') {
  global.Event = class Event {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented = false;

    constructor(type: string, options: any = {}) {
      this.type = type;
      this.bubbles = options.bubbles || false;
      this.cancelable = options.cancelable || false;
    }

    preventDefault() {
      this.defaultPrevented = true;
    }

    stopPropagation() {}
    stopImmediatePropagation() {}
  };
}

// CustomEvent polyfill
if (typeof global.CustomEvent === 'undefined') {
  global.CustomEvent = class CustomEvent extends global.Event {
    detail: any;

    constructor(type: string, options: any = {}) {
      super(type, options);
      this.detail = options.detail || null;
    }
  };
}

// MessageChannel polyfill for async tests
if (typeof global.MessageChannel === 'undefined') {
  global.MessageChannel = class MessageChannel {
    port1: any;
    port2: any;

    constructor() {
      const channel = {
        port1: {
          postMessage: (data: any) => {
            setTimeout(() => {
              if (channel.port2.onmessage) {
                channel.port2.onmessage({ data });
              }
            }, 0);
          },
          onmessage: null,
          start: () => {},
          close: () => {}
        },
        port2: {
          postMessage: (data: any) => {
            setTimeout(() => {
              if (channel.port1.onmessage) {
                channel.port1.onmessage({ data });
              }
            }, 0);
          },
          onmessage: null,
          start: () => {},
          close: () => {}
        }
      };

      this.port1 = channel.port1;
      this.port2 = channel.port2;
    }
  };
}

// Intersection Observer polyfill
if (typeof global.IntersectionObserver === 'undefined') {
  global.IntersectionObserver = class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Resize Observer polyfill
if (typeof global.ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

// Mutation Observer polyfill
if (typeof global.MutationObserver === 'undefined') {
  global.MutationObserver = class MutationObserver {
    observe() {}
    disconnect() {}
    takeRecords() {
      return [];
    }
  };
}

// Animation frame polyfills
if (typeof global.requestAnimationFrame === 'undefined') {
  global.requestAnimationFrame = (callback: FrameRequestCallback) => {
    return setTimeout(callback, 16); // ~60fps
  };
}

if (typeof global.cancelAnimationFrame === 'undefined') {
  global.cancelAnimationFrame = (id: number) => {
    clearTimeout(id);
  };
}

// Idle callback polyfills
if (typeof global.requestIdleCallback === 'undefined') {
  global.requestIdleCallback = (callback: IdleRequestCallback) => {
    return setTimeout(() => {
      callback({
        didTimeout: false,
        timeRemaining: () => 50
      });
    }, 1);
  };
}

if (typeof global.cancelIdleCallback === 'undefined') {
  global.cancelIdleCallback = (id: number) => {
    clearTimeout(id);
  };
}

// Geolocation polyfill (for potential location-based features)
if (typeof global.navigator === 'undefined') {
  global.navigator = {} as any;
}

if (!global.navigator.geolocation) {
  global.navigator.geolocation = {
    getCurrentPosition: (success: any, error?: any) => {
      setTimeout(() => {
        if (success) {
          success({
            coords: {
              latitude: 37.7749,
              longitude: -122.4194,
              accuracy: 100,
              altitude: null,
              altitudeAccuracy: null,
              heading: null,
              speed: null
            },
            timestamp: Date.now()
          });
        }
      }, 100);
    },
    watchPosition: () => 1,
    clearWatch: () => {}
  };
}

// Device motion/orientation polyfills (for potential wellness features)
if (!global.DeviceMotionEvent) {
  global.DeviceMotionEvent = class DeviceMotionEvent extends global.Event {
    acceleration: any = null;
    accelerationIncludingGravity: any = null;
    rotationRate: any = null;
    interval: number = 0;
  };
}

if (!global.DeviceOrientationEvent) {
  global.DeviceOrientationEvent = class DeviceOrientationEvent extends global.Event {
    alpha: number | null = null;
    beta: number | null = null;
    gamma: number | null = null;
    absolute: boolean = false;
  };
}

// Vibration API polyfill (for haptic feedback tests)
if (!global.navigator.vibrate) {
  global.navigator.vibrate = (pattern: number | number[]) => {
    // Mock vibration for testing
    return true;
  };
}

// Screen orientation polyfill
if (!global.screen) {
  global.screen = {
    orientation: {
      angle: 0,
      type: 'portrait-primary',
      lock: () => Promise.resolve(),
      unlock: () => {}
    },
    width: 375,
    height: 812,
    availWidth: 375,
    availHeight: 812,
    colorDepth: 24,
    pixelDepth: 24
  } as any;
}

// Media query polyfill
if (!global.matchMedia) {
  global.matchMedia = (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false
  });
}

// Web Audio API polyfill (for potential meditation features)
if (!global.AudioContext && !global.webkitAudioContext) {
  global.AudioContext = class AudioContext {
    destination: any = {};
    sampleRate: number = 44100;
    currentTime: number = 0;
    state: string = 'running';

    createOscillator() {
      return {
        frequency: { value: 440 },
        connect: () => {},
        start: () => {},
        stop: () => {}
      };
    }

    createGain() {
      return {
        gain: { value: 1 },
        connect: () => {}
      };
    }

    suspend() {
      return Promise.resolve();
    }

    resume() {
      return Promise.resolve();
    }

    close() {
      return Promise.resolve();
    }
  };
}

// Export empty object to make this a module
export {};