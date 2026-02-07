import { Test, TestingModule } from '@nestjs/testing';
import { CircuitBreakerService } from './circuit-breaker.service';

describe('CircuitBreakerService', () => {
  let service: CircuitBreakerService;
  const testServiceName = 'test-service';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CircuitBreakerService],
    }).compile();

    service = module.get<CircuitBreakerService>(CircuitBreakerService);
  });

  afterEach(() => {
    // Reset circuit breaker state between tests
    service.resetCircuitBreaker(testServiceName);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('recordSuccess', () => {
    it('should record successful request', async () => {
      await service.recordSuccess(testServiceName);

      const state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('CLOSED');
    });

    it('should reset circuit breaker when HALF_OPEN and success occurs', async () => {
      // First, open the circuit
      for (let i = 0; i < 5; i++) {
        await service.recordFailure(testServiceName);
      }

      let state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(true);
      expect(state.state).toBe('OPEN');

      // Wait for reset time or manually transition to HALF_OPEN
      const circuitBreaker = (service as any).getCircuitBreaker(testServiceName);
      circuitBreaker.state.state = 'HALF_OPEN';
      circuitBreaker.state.isOpen = false;

      // Now record success
      await service.recordSuccess(testServiceName);

      state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('CLOSED');
    });
  });

  describe('recordFailure', () => {
    it('should record failed request', async () => {
      await service.recordFailure(testServiceName);

      const state = await service.getState(testServiceName);
      expect(state.failureCount).toBe(1);
      expect(state.state).toBe('CLOSED');
    });

    it('should open circuit after threshold failures', async () => {
      const threshold = 5;

      // Record failures up to threshold
      for (let i = 0; i < threshold; i++) {
        await service.recordFailure(testServiceName);
      }

      const state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(true);
      expect(state.failureCount).toBe(threshold);
      expect(state.state).toBe('OPEN');
      expect(state.lastFailureTime).toBeDefined();
      expect(state.nextRetryTime).toBeDefined();
    });

    it('should not open circuit before threshold', async () => {
      const threshold = 5;

      // Record failures below threshold
      for (let i = 0; i < threshold - 1; i++) {
        await service.recordFailure(testServiceName);
      }

      const state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(threshold - 1);
      expect(state.state).toBe('CLOSED');
    });
  });

  describe('getState', () => {
    it('should return current circuit state', async () => {
      await service.recordFailure(testServiceName);

      const state = await service.getState(testServiceName);
      expect(state).toHaveProperty('isOpen');
      expect(state).toHaveProperty('failureCount');
      expect(state).toHaveProperty('state');
      expect(state).toHaveProperty('lastFailureTime');
    });

    it('should transition from OPEN to HALF_OPEN after reset timeout', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await service.recordFailure(testServiceName);
      }

      // Manually set next retry time to past to simulate timeout
      const circuitBreaker = (service as any).getCircuitBreaker(testServiceName);
      circuitBreaker.state.nextRetryTime = new Date(Date.now() - 1000);

      const state = await service.getState(testServiceName);
      expect(state.state).toBe('HALF_OPEN');
      expect(state.isOpen).toBe(false); // HALF_OPEN allows one request through
    });
  });

  describe('executeWithCircuitBreaker', () => {
    it('should execute operation successfully when circuit is closed', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      const result = await service.executeWithCircuitBreaker(testServiceName, operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should throw error when circuit is open', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await service.recordFailure(testServiceName);
      }

      const operation = jest.fn().mockResolvedValue('success');

      await expect(service.executeWithCircuitBreaker(testServiceName, operation))
        .rejects.toThrow('Circuit breaker is OPEN');

      expect(operation).not.toHaveBeenCalled();
    });

    it('should record success when operation succeeds', async () => {
      const operation = jest.fn().mockResolvedValue('success');

      await service.executeWithCircuitBreaker(testServiceName, operation);

      const state = await service.getState(testServiceName);
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('CLOSED');
    });

    it('should record failure when operation fails', async () => {
      const operation = jest.fn().mockRejectedValue(new Error('Operation failed'));

      await expect(service.executeWithCircuitBreaker(testServiceName, operation))
        .rejects.toThrow('Operation failed');

      const state = await service.getState(testServiceName);
      expect(state.failureCount).toBe(1);
    });

    it('should timeout operation after configured time', async () => {
      const config = { timeout: 100 };
      const operation = jest.fn().mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 200))
      );

      await expect(service.executeWithCircuitBreaker(testServiceName, operation, config))
        .rejects.toThrow('Circuit breaker timeout');

      expect(operation).toHaveBeenCalledTimes(1);
    });
  });

  describe('getCircuitBreaker', () => {
    it('should create new circuit breaker for unknown service', () => {
      const circuitBreaker = (service as any).getCircuitBreaker('new-service');

      expect(circuitBreaker).toBeDefined();
      expect(circuitBreaker.serviceName).toBe('new-service');
      expect(circuitBreaker.state.state).toBe('CLOSED');
      expect(circuitBreaker.state.isOpen).toBe(false);
      expect(circuitBreaker.config.threshold).toBe(5);
    });

    it('should use custom config when provided', () => {
      const customConfig = {
        threshold: 10,
        timeout: 120000,
        resetTimeout: 600000,
      };

      const circuitBreaker = (service as any).getCircuitBreaker('custom-service', customConfig);

      expect(circuitBreaker.config.threshold).toBe(10);
      expect(circuitBreaker.config.timeout).toBe(120000);
      expect(circuitBreaker.config.resetTimeout).toBe(600000);
    });
  });

  describe('resetCircuitBreaker', () => {
    it('should reset circuit breaker to closed state', async () => {
      // Open the circuit
      for (let i = 0; i < 5; i++) {
        await service.recordFailure(testServiceName);
      }

      let state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(true);

      // Reset the circuit
      service.resetCircuitBreaker(testServiceName);

      state = await service.getState(testServiceName);
      expect(state.isOpen).toBe(false);
      expect(state.failureCount).toBe(0);
      expect(state.state).toBe('CLOSED');
    });

    it('should handle reset for non-existent circuit breaker', () => {
      expect(() => service.resetCircuitBreaker('non-existent')).not.toThrow();
    });
  });

  describe('updateConfig', () => {
    it('should update circuit breaker configuration', () => {
      const newConfig = { threshold: 10 };

      service.updateConfig(testServiceName, newConfig);

      const circuitBreaker = (service as any).getCircuitBreaker(testServiceName);
      expect(circuitBreaker.config.threshold).toBe(10);
    });

    it('should handle config update for non-existent circuit breaker', () => {
      expect(() => service.updateConfig('non-existent', { threshold: 10 })).not.toThrow();
    });
  });

  describe('getAllCircuitBreakers', () => {
    it('should return all circuit breakers', () => {
      const circuitBreakers = service.getAllCircuitBreakers();

      expect(Array.isArray(circuitBreakers)).toBe(true);
      expect(circuitBreakers.length).toBeGreaterThan(0);

      // Check for default services
      const serviceNames = circuitBreakers.map(cb => cb.serviceName);
      expect(serviceNames).toContain('auth-service');
      expect(serviceNames).toContain('user-service');
      expect(serviceNames).toContain('project-service');
    });

    it('should return circuit breaker with correct structure', () => {
      const circuitBreakers = service.getAllCircuitBreakers();
      const cb = circuitBreakers[0];

      expect(cb).toHaveProperty('serviceName');
      expect(cb).toHaveProperty('config');
      expect(cb).toHaveProperty('state');
      expect(cb).toHaveProperty('stats');

      expect(cb.state).toHaveProperty('isOpen');
      expect(cb.state).toHaveProperty('failureCount');
      expect(cb.state).toHaveProperty('state');

      expect(cb.stats).toHaveProperty('totalRequests');
      expect(cb.stats).toHaveProperty('successfulRequests');
      expect(cb.stats).toHaveProperty('failedRequests');
    });
  });

  describe('getHealthStatus', () => {
    it('should return health status summary', () => {
      const health = service.getHealthStatus();

      expect(health).toHaveProperty('total');
      expect(health).toHaveProperty('healthy');
      expect(health).toHaveProperty('unhealthy');
      expect(health).toHaveProperty('halfOpen');
      expect(health).toHaveProperty('services');

      expect(Array.isArray(health.services)).toBe(true);
    });

    it('should include service details in health status', () => {
      const health = service.getHealthStatus();
      const service = health.services[0];

      expect(service).toHaveProperty('service');
      expect(service).toHaveProperty('state');
      expect(service).toHaveProperty('failureCount');
      expect(service).toHaveProperty('totalRequests');
      expect(service).toHaveProperty('successRate');
    });

    it('should calculate success rate correctly', async () => {
      // Add some requests
      await service.recordSuccess(testServiceName);
      await service.recordSuccess(testServiceName);
      await service.recordFailure(testServiceName);

      const health = service.getHealthStatus();
      const serviceHealth = health.services.find(s => s.service === testServiceName);

      expect(serviceHealth?.successRate).toBe('66.67%'); // 2/3 * 100
    });
  });
});
