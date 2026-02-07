/**
 * Global teardown for integration tests
 * Runs once after all integration test suites
 */

module.exports = async () => {
  console.log('Tearing down integration test infrastructure...');

  // Stop test containers if they were started
  if (global.__TEST_CONTAINERS__) {
    const { postgres, redis, rabbitmq } = global.__TEST_CONTAINERS__;

    try {
      if (postgres) {
        await postgres.stop();
        console.log('PostgreSQL container stopped');
      }

      if (redis) {
        await redis.stop();
        console.log('Redis container stopped');
      }

      if (rabbitmq) {
        await rabbitmq.stop();
        console.log('RabbitMQ container stopped');
      }

    } catch (error) {
      console.error('Error stopping test containers:', error);
    }
  }

  // Clean up any remaining resources
  console.log('Integration test infrastructure teardown complete');
};
