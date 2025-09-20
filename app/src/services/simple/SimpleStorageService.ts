import AsyncStorage from '@react-native-async-storage/async-storage';

interface StorageService {
  setItem: (key: string, value: string) => Promise<void>;
  getItem: (key: string) => Promise<string | null>;
  removeItem: (key: string) => Promise<void>;
  clear: () => Promise<void>;
}

class SimpleStorageService implements StorageService {
  private static instance: SimpleStorageService;
  private readonly keyPrefix = 'being_';

  static getInstance(): SimpleStorageService {
    if (!SimpleStorageService.instance) {
      SimpleStorageService.instance = new SimpleStorageService();
    }
    return SimpleStorageService.instance;
  }

  private getKey(key: string): string {
    return `${this.keyPrefix}${key}`;
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      await AsyncStorage.setItem(this.getKey(key), value);
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw new Error('Failed to store data');
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      return await AsyncStorage.getItem(this.getKey(key));
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.getKey(key));
    } catch (error) {
      console.error('Storage removeItem error:', error);
      throw new Error('Failed to remove data');
    }
  }

  async clear(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const beingKeys = keys.filter(key => key.startsWith(this.keyPrefix));
      await AsyncStorage.multiRemove(beingKeys);
    } catch (error) {
      console.error('Storage clear error:', error);
      throw new Error('Failed to clear data');
    }
  }

  // Simple data persistence helpers
  async setObject<T>(key: string, value: T): Promise<void> {
    await this.setItem(key, JSON.stringify(value));
  }

  async getObject<T>(key: string): Promise<T | null> {
    const value = await this.getItem(key);
    if (!value) return null;

    try {
      return JSON.parse(value) as T;
    } catch (error) {
      console.error('JSON parse error:', error);
      return null;
    }
  }
}

export const simpleStorage = SimpleStorageService.getInstance();