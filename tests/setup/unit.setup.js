/**
 * Unit test setup
 * Configures environment specifically for unit tests
 */

// Extend global setup with unit test specific configurations
require('./jest.setup');

// Mock external dependencies for unit tests
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    exists: jest.fn(),
    expire: jest.fn(),
    flushall: jest.fn(),
    disconnect: jest.fn(),
    connect: jest.fn(),
  }));
});

jest.mock('pg', () => ({
  Pool: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [] }),
      release: jest.fn(),
    }),
    end: jest.fn(),
  })),
}));

jest.mock('amqplib', () => ({
  connect: jest.fn().mockResolvedValue({
    createChannel: jest.fn().mockResolvedValue({
      assertQueue: jest.fn(),
      sendToQueue: jest.fn(),
      consume: jest.fn(),
      ack: jest.fn(),
      nack: jest.fn(),
      close: jest.fn(),
    }),
    close: jest.fn(),
  }),
}));

// Mock file system operations
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  readdir: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  unlink: jest.fn(),
  stat: jest.fn(),
}));

// Mock path operations
jest.mock('path', () => ({
  join: jest.fn((...args) => args.join('/')),
  resolve: jest.fn((...args) => args.join('/')),
  basename: jest.fn(path => path.split('/').pop()),
  dirname: jest.fn(path => path.split('/').slice(0, -1).join('/')),
  extname: jest.fn(path => '.' + path.split('.').pop()),
}));

// Mock crypto operations more thoroughly for unit tests
jest.mock('crypto', () => ({
  randomUUID: () => 'test-uuid-' + Math.random().toString(36).substr(2, 9),
  randomBytes: size => Buffer.alloc(size).fill('test'),
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('test-hash'),
  }),
  createHmac: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('test-hmac'),
  }),
}));

// Mock AWS SDK for unit tests
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn(),
  PutObjectCommand: jest.fn(),
  GetObjectCommand: jest.fn(),
  DeleteObjectCommand: jest.fn(),
}));

jest.mock('@aws-sdk/lib-storage', () => ({
  Upload: jest.fn().mockImplementation(() => ({
    done: jest.fn().mockResolvedValue({ Location: 'test-location' }),
    on: jest.fn(),
    send: jest.fn(),
  })),
}));

// Mock logger for unit tests
global.mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn().mockReturnValue(global.mockLogger),
};

// Unit test specific utilities
global.unitTestUtils = {
  /**
   * Create a mock plugin for unit tests
   */
  createMockPlugin: (overrides = {}) => ({
    name: 'test-plugin',
    version: '1.0.0',
    manifest: {
      name: 'test-plugin',
      version: '1.0.0',
      description: 'Test plugin',
      entryPoint: 'index.js',
      permissions: [],
      dependencies: [],
    },
    workingDirectory: '/tmp/test-plugin',
    status: 'registered',
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({ result: 'success' }),
    ...overrides,
  }),

  /**
   * Create a mock agent for unit tests
   */
  createMockAgent: (overrides = {}) => ({
    id: 'test-agent-id',
    name: 'Test Agent',
    type: 'task',
    status: 'active',
    config: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    initialize: jest.fn().mockResolvedValue(undefined),
    start: jest.fn().mockResolvedValue(undefined),
    stop: jest.fn().mockResolvedValue(undefined),
    execute: jest.fn().mockResolvedValue({ result: 'success' }),
    ...overrides,
  }),

  /**
   * Create mock request/response objects
   */
  createMockRequest: (overrides = {}) => ({
    id: 'test-request-id',
    type: 'test',
    data: {},
    timestamp: new Date(),
    ...overrides,
  }),

  createMockResponse: (overrides = {}) => ({
    id: 'test-response-id',
    success: true,
    data: {},
    timestamp: new Date(),
    ...overrides,
  }),

  /**
   * Create mock context objects
   */
  createMockContext: (overrides = {}) => ({
    request: {
      id: 'test-request-id',
      headers: {},
      body: {},
      ...overrides.request,
    },
    response: {
      status: 200,
      headers: {},
      body: {},
      ...overrides.response,
    },
    logger: global.mockLogger,
    ...overrides,
  }),

  /**
   * Setup mock event bus
   */
  setupMockEventBus: () => {
    const events = new Map();
    return {
      emit: jest.fn((event, data) => {
        if (events.has(event)) {
          events.get(event).forEach(callback => callback(data));
        }
      }),
      on: jest.fn((event, callback) => {
        if (!events.has(event)) {
          events.set(event, []);
        }
        events.get(event).push(callback);
      }),
      off: jest.fn((event, callback) => {
        if (events.has(event)) {
          const callbacks = events.get(event);
          const index = callbacks.indexOf(callback);
          if (index > -1) {
            callbacks.splice(index, 1);
          }
        }
      }),
      once: jest.fn((event, callback) => {
        const onceCallback = data => {
          callback(data);
          // Remove after first call
          if (events.has(event)) {
            const callbacks = events.get(event);
            const index = callbacks.indexOf(onceCallback);
            if (index > -1) {
              callbacks.splice(index, 1);
            }
          }
        };
        if (!events.has(event)) {
          events.set(event, []);
        }
        events.get(event).push(onceCallback);
      }),
      removeAllListeners: jest.fn(event => {
        if (event) {
          events.delete(event);
        } else {
          events.clear();
        }
      }),
      getEvents: () => events,
    };
  },

  /**
   * Validate mock calls
   */
  expectMockCalled: (mockFn, times = 1, args = null) => {
    expect(mockFn).toHaveBeenCalledTimes(times);
    if (args) {
      expect(mockFn).toHaveBeenCalledWith(...args);
    }
  },

  /**
   * Reset all unit test mocks
   */
  resetUnitMocks: () => {
    jest.clearAllMocks();
    jest.resetAllMocks();
    global.fetch.mockClear();
  },
};
