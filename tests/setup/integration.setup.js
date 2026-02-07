/**
 * Integration test setup
 * Sets up real services and infrastructure for integration testing
 */

// Extend global setup
require('./jest.setup');

// Integration test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'info';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5433/claude_agent_test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6380/1';
process.env.RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5673/test';

// Testcontainers setup
let containers = {};

// Integration test utilities
global.integrationTestUtils = {
  /**
   * Get test container
   */
  getContainer: (name) => containers[name],

  /**
   * Set test container
   */
  setContainer: (name, container) => {
    containers[name] = container;
  },

  /**
   * Create test database connection
   */
  createTestDbConnection: async () => {
    const { Pool } = require('pg');
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  },

  /**
   * Create test Redis connection
   */
  createTestRedisConnection: async () => {
    const Redis = require('ioredis');
    return new Redis(process.env.REDIS_URL);
  },

  /**
   * Create test RabbitMQ connection
   */
  createTestRabbitMQConnection: async () => {
    const amqp = require('amqplib');
    return amqp.connect(process.env.RABBITMQ_URL);
  },

  /**
   * Clean test database
   */
  cleanTestDb: async (connection) => {
    const tables = [
      'agent_metrics',
      'agent_config_history',
      'agent_status_transitions',
      'agent_executions',
      'agent_versions',
      'agents',
      'user_sessions',
      'users',
    ];

    for (const table of tables) {
      try {
        await connection.query(`TRUNCATE TABLE ${table} RESTART IDENTITY CASCADE`);
      } catch (error) {
        // Table might not exist, which is fine
      }
    }
  },

  /**
   * Seed test database with sample data
   */
  seedTestDb: async (connection) => {
    // Create test user
    await connection.query(`
      INSERT INTO users (id, email, name, created_at, updated_at)
      VALUES ('test-user-id', 'test@example.com', 'Test User', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);

    // Create test agent
    await connection.query(`
      INSERT INTO agents (id, name, type, status, config, created_at, updated_at)
      VALUES ('test-agent-id', 'Test Agent', 'task', 'active', '{}', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
    `);
  },

  /**
   * Create test agent service
   */
  createTestAgentService: async (dbConnection, redisConnection) => {
    const { AgentService } = require('../../packages/agents/src/agent-service');
    const logger = global.mockLogger;
    const eventBus = global.mockEventBus;

    return new AgentService({
      dbConnection,
      redisConnection,
      logger,
      eventBus,
    });
  },

  /**
   * Create test plugin manager
   */
  createTestPluginManager: async (logger, eventBus, storage, secrets) => {
    const { PluginManager } = require('../../packages/agents/src/plugin/manager');

    const config = {
      pluginDirectories: ['./tests/fixtures/plugins'],
      autoReload: true,
      hotReloadEnabled: true,
      sandboxEnabled: true,
      maxPlugins: 10,
      pluginTimeout: 5000,
      allowedPermissions: ['*'],
      blockedPlugins: [],
    };

    return new PluginManager(config, logger, eventBus, storage, secrets);
  },

  /**
   * Wait for service to be ready
   */
  waitForService: async (url, maxAttempts = 30, delay = 1000) => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        const response = await fetch(url);
        if (response.ok) {
          return true;
        }
      } catch (error) {
        // Service not ready yet
      }

      await new Promise(resolve => setTimeout(resolve, delay));
    }

    throw new Error(`Service not ready after ${maxAttempts} attempts: ${url}`);
  },

  /**
   * Generate unique test data
   */
  generateTestData: (prefix = 'test') => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    return `${prefix}-${timestamp}-${random}`;
  },

  /**
   * Cleanup integration test resources
   */
  cleanup: async () => {
    // Close database connections
    for (const [name, container] of Object.entries(containers)) {
      try {
        if (container.close) {
          await container.close();
        }
        console.log(`Closed ${name} container`);
      } catch (error) {
        console.error(`Error closing ${name} container:`, error);
      }
    }

    containers = {};
  },
};

// Test hooks
beforeAll(async () => {
  console.log('Setting up integration test environment...');

  try {
    // Wait for services to be ready
    await global.integrationTestUtils.waitForService(`${process.env.DATABASE_URL}/health`, 30);

    // Create test connections
    const dbConnection = await global.integrationTestUtils.createTestDbConnection();
    const redisConnection = await global.integrationTestUtils.createTestRedisConnection();

    // Store connections for tests
    global.integrationTestUtils.setContainer('database', dbConnection);
    global.integrationTestUtils.setContainer('redis', redisConnection);

    console.log('Integration test environment ready');

  } catch (error) {
    console.error('Failed to setup integration test environment:', error);
    throw error;
  }
});

afterAll(async () => {
  console.log('Cleaning up integration test environment...');
  await global.integrationTestUtils.cleanup();
});

beforeEach(async () => {
  // Clean database before each test
  const dbConnection = global.integrationTestUtils.getContainer('database');
  if (dbConnection) {
    await global.integrationTestUtils.cleanTestDb(dbConnection);
  }

  // Clear Redis
  const redisConnection = global.integrationTestUtils.getContainer('redis');
  if (redisConnection) {
    await redisConnection.flushall();
  }
});
