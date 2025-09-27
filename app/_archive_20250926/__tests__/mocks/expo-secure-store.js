/**
 * Mock implementation of expo-secure-store for testing
 * Provides consistent, testable secure storage operations
 */

// In-memory storage for testing
const mockStorage = new Map();

export const AFTER_FIRST_UNLOCK = 'AFTER_FIRST_UNLOCK';
export const AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY = 'AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY';
export const ALWAYS = 'ALWAYS';
export const WHEN_PASSCODE_SET_THIS_DEVICE_ONLY = 'WHEN_PASSCODE_SET_THIS_DEVICE_ONLY';
export const ALWAYS_THIS_DEVICE_ONLY = 'ALWAYS_THIS_DEVICE_ONLY';
export const WHEN_UNLOCKED = 'WHEN_UNLOCKED';
export const WHEN_UNLOCKED_THIS_DEVICE_ONLY = 'WHEN_UNLOCKED_THIS_DEVICE_ONLY';

export const setItemAsync = jest.fn().mockImplementation(
  async (key, value, options = {}) => {
    if (typeof key !== 'string') {
      throw new TypeError('SecureStore keys must be strings');
    }
    if (typeof value !== 'string') {
      throw new TypeError('SecureStore values must be strings');
    }
    
    mockStorage.set(key, {
      value,
      options,
      timestamp: Date.now(),
    });
    
    return Promise.resolve();
  }
);

export const getItemAsync = jest.fn().mockImplementation(
  async (key, options = {}) => {
    if (typeof key !== 'string') {
      throw new TypeError('SecureStore keys must be strings');
    }
    
    const item = mockStorage.get(key);
    return item ? item.value : null;
  }
);

export const deleteItemAsync = jest.fn().mockImplementation(
  async (key, options = {}) => {
    if (typeof key !== 'string') {
      throw new TypeError('SecureStore keys must be strings');
    }
    
    mockStorage.delete(key);
    return Promise.resolve();
  }
);

export const isAvailableAsync = jest.fn().mockResolvedValue(true);

// Test utilities
export const __clearAllItems = () => {
  mockStorage.clear();
};

export const __getStorageSize = () => {
  return mockStorage.size;
};

export const __getAllKeys = () => {
  return Array.from(mockStorage.keys());
};

export default {
  AFTER_FIRST_UNLOCK,
  AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  ALWAYS,
  WHEN_PASSCODE_SET_THIS_DEVICE_ONLY,
  ALWAYS_THIS_DEVICE_ONLY,
  WHEN_UNLOCKED,
  WHEN_UNLOCKED_THIS_DEVICE_ONLY,
  setItemAsync,
  getItemAsync,
  deleteItemAsync,
  isAvailableAsync,
  __clearAllItems,
  __getStorageSize,
  __getAllKeys,
};