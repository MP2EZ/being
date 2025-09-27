/**
 * Mock implementation of expo-sqlite for testing
 * Provides testable SQLite operations without actual database
 */

// In-memory mock database storage
const mockDatabases = new Map();

class MockSQLTransaction {
  constructor(db) {
    this.db = db;
    this.completed = false;
    this.error = null;
  }

  executeSql(sql, params = [], successCallback = () => {}, errorCallback = () => {}) {
    try {
      // Simple mock execution - just track the SQL
      const result = {
        rows: { length: 0, _array: [], item: () => null },
        rowsAffected: 1,
        insertId: Math.floor(Math.random() * 1000000),
      };

      // Mock some basic SQL operations
      if (sql.toLowerCase().includes('create table')) {
        // Table creation success
        result.rowsAffected = 0;
      } else if (sql.toLowerCase().includes('insert')) {
        // Insert success
        result.rowsAffected = 1;
      } else if (sql.toLowerCase().includes('select')) {
        // Mock select results
        result.rows.length = 1;
        result.rows._array = [{ id: 1, data: 'mock-data' }];
        result.rows.item = (index) => result.rows._array[index];
      }

      setTimeout(() => successCallback(this, result), 0);
    } catch (error) {
      this.error = error;
      setTimeout(() => errorCallback(this, error), 0);
    }
  }
}

class MockDatabase {
  constructor(name) {
    this.name = name;
    this.closed = false;
  }

  transaction(callback, errorCallback = () => {}, successCallback = () => {}) {
    const transaction = new MockSQLTransaction(this);
    
    setTimeout(() => {
      try {
        callback(transaction);
        if (!transaction.error) {
          successCallback();
        } else {
          errorCallback(transaction.error);
        }
      } catch (error) {
        errorCallback(error);
      }
    }, 0);
  }

  readTransaction(callback, errorCallback = () => {}, successCallback = () => {}) {
    // Same as transaction for mock purposes
    this.transaction(callback, errorCallback, successCallback);
  }

  close() {
    this.closed = true;
  }

  delete() {
    mockDatabases.delete(this.name);
  }
}

export const openDatabase = jest.fn().mockImplementation(
  (name, version = '1.0', displayName = name, estimatedSize = 1000000) => {
    if (!mockDatabases.has(name)) {
      mockDatabases.set(name, new MockDatabase(name));
    }
    return mockDatabases.get(name);
  }
);

export const openDatabaseAsync = jest.fn().mockImplementation(
  async (name, version = '1.0', displayName = name, estimatedSize = 1000000) => {
    return openDatabase(name, version, displayName, estimatedSize);
  }
);

export const deleteAsync = jest.fn().mockImplementation(
  async (databaseName) => {
    mockDatabases.delete(databaseName);
    return;
  }
);

export const deleteDatabaseAsync = jest.fn().mockImplementation(
  async (databaseName) => {
    return deleteAsync(databaseName);
  }
);

// Test utilities
export const __clearAllDatabases = () => {
  mockDatabases.clear();
};

export const __getDatabaseNames = () => {
  return Array.from(mockDatabases.keys());
};

export const __getMockDatabase = (name) => {
  return mockDatabases.get(name);
};

export default {
  openDatabase,
  openDatabaseAsync,
  deleteAsync,
  deleteDatabaseAsync,
  __clearAllDatabases,
  __getDatabaseNames,
  __getMockDatabase,
};