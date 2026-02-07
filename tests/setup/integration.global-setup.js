/**
 * Global setup for integration tests
 * Runs once before all integration test suites
 */

module.exports = async () => {
  console.log('Setting up integration test infrastructure...');

  // Set global test flag
  global.__INTEGRATION_TESTS__ = true;

  // Start test containers if using Docker
  if (process.env.USE_DOCKER_FOR_TESTS === 'true') {
    const { GenericContainer } = require('testcontainers');

    try {
      // Start PostgreSQL container
      const postgresContainer = await new GenericContainer('postgres:15')
        .withEnv('POSTGRES_DB', 'claude_agent_test')
        .withEnv('POSTGRES_USER', 'postgres')
        .withEnv('POSTGRES_PASSWORD', 'password')
        .withExposedPorts(5432)
        .withWaitStrategy(/PostgreSQL database system is ready to accept connections/)
        .start();

      const postgresPort = postgresContainer.getMappedPort(5432);
      process.env.DATABASE_URL = `postgresql://postgres:password@localhost:${postgresPort}/claude_agent_test`;

      // Start Redis container
      const redisContainer = await new GenericContainer('redis:7-alpine')
        .withExposedPorts(6379)
        .withWaitStrategy(/Ready to accept connections/)
        .start();

      const redisPort = redisContainer.getMappedPort(6379);
      process.env.REDIS_URL = `redis://localhost:${redisPort}/1`;

      // Start RabbitMQ container
      const rabbitmqContainer = await new GenericContainer('rabbitmq:3-management-alpine')
        .withEnv('RABBITMQ_DEFAULT_USER', 'guest')
        .withEnv('RABBITMQ_DEFAULT_PASS', 'guest')
        .withExposedPorts(5672, 15672)
        .withWaitStrategy(/Server startup complete/)
        .start();

      const rabbitmqPort = rabbitmqContainer.getMappedPort(5672);
      process.env.RABBITMQ_URL = `amqp://guest:guest@localhost:${rabbitmqPort}/test`;

      // Store containers for cleanup
      global.__TEST_CONTAINERS__ = {
        postgres: postgresContainer,
        redis: redisContainer,
        rabbitmq: rabbitmqContainer,
      };

      console.log('Test containers started successfully');

    } catch (error) {
      console.error('Failed to start test containers:', error);
      throw error;
    }
  }

  // Wait for services to be ready
  console.log('Waiting for services to be ready...');

  // Database health check
  const { Pool } = require('pg');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  let dbReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await pool.query('SELECT 1');
      dbReady = true;
      break;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!dbReady) {
    throw new Error('Database not ready after 30 seconds');
  }

  await pool.end();

  // Redis health check
  const Redis = require('ioredis');
  const redis = new Redis(process.env.REDIS_URL);

  let redisReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      await redis.ping();
      redisReady = true;
      break;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!redisReady) {
    throw new Error('Redis not ready after 30 seconds');
  }

  await redis.disconnect();

  // RabbitMQ health check
  const amqp = require('amqplib');

  let rabbitmqReady = false;
  for (let i = 0; i < 30; i++) {
    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL);
      await connection.close();
      rabbitmqReady = true;
      break;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  if (!rabbitmqReady) {
    throw new Error('RabbitMQ not ready after 30 seconds');
  }

  console.log('Integration test infrastructure ready');
};
