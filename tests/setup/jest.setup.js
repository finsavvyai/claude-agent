/**
 * Global Jest setup file
 * Configures global test environment, mocks, and utilities
 */

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/claude_agent_test';
process.env.REDIS_URL = 'redis://localhost:6379/1';
process.env.RABBITMQ_URL = 'amqp://guest:guest@localhost:5672/test';

// Global test timeout
jest.setTimeout(10000);

// Global error handler
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
});

// Console logging in tests (only show errors in test runs)
if (process.env.NODE_ENV === 'test') {
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  console.log = (...args) => {
    if (process.env.SHOW_TEST_LOGS === 'true') {
      originalConsoleLog(...args);
    }
  };

  console.warn = (...args) => {
    if (process.env.SHOW_TEST_LOGS === 'true') {
      originalConsoleWarn(...args);
    }
  };
}

// Mock implementations
global.mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
    child: jest.fn().mockReturnValue(global.mockLogger),
  }),
};

global.mockEventBus = {
  emit: jest.fn(),
  on: jest.fn(),
  off: jest.fn(),
  once: jest.fn(),
  removeAllListeners: jest.fn(),
};

// Mock crypto for consistent UUIDs in tests
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
    randomBytes: (size) => Buffer.alloc(size).fill('test'),
  },
  writable: true,
});

// Mock fetch API
global.fetch = jest.fn();

// Mock WebSocket
global.WebSocket = jest.fn().mockImplementation(() => ({
  close: jest.fn(),
  send: jest.fn(),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  readyState: 1, // OPEN
}));

// Extend Jest matchers
expect.extend({
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },

  toBeValidTimestamp(received) {
    const pass = typeof received === 'number' && received > 0 && received <= Date.now() + 86400000;
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid timestamp`
          : `expected ${received} to be a valid timestamp`,
      pass,
    };
  },

  toBeValidUUID(received) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuidRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid UUID`
          : `expected ${received} to be a valid UUID`,
      pass,
    };
  },

  toBeValidEmail(received) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && emailRegex.test(received);
    return {
      message: () =>
        pass
          ? `expected ${received} not to be a valid email`
          : `expected ${received} to be a valid email`,
      pass,
    };
  },
});

// Test utilities
global.testUtils = {
  /**
   * Create a mock delay
   */
  delay: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  /**
   * Generate test data
   */
  generateTestUser: (overrides = {}) => ({
    id: 'test-user-id',
    email: 'test@example.com',
    name: 'Test User',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Generate test agent data
   */
  generateTestAgent: (overrides = {}) => ({
    id: 'test-agent-id',
    name: 'Test Agent',
    type: 'task',
    status: 'active',
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }),

  /**
   * Create mock response
   */
  createMockResponse: (data = {}, status = 200) => ({
    data,
    status,
    ok: status >= 200 && status < 300,
    headers: new Map([['content-type', 'application/json']]),
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),

  /**
   * Setup test database
   */
  setupTestDb: async () => {
    // This would be implemented based on your database setup
    // For now, it's a placeholder
    console.log('Setting up test database...');
  },

  /**
   * Cleanup test database
   */
  cleanupTestDb: async () => {
    // This would be implemented based on your database setup
    // For now, it's a placeholder
    console.log('Cleaning up test database...');
  },

  /**
   * Clear all mocks
   */
  clearAllMocks: () => {
    jest.clearAllMocks();
    global.fetch.mockClear();
  },

  /**
   * Reset modules for testing
   */
  resetModules: () => {
    jest.resetModules();
  },
};
