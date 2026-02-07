import { Injectable, Logger } from '@nestjs/common';
import { CircuitBreakerState } from '../interfaces/gateway-metrics.interface';

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
  monitoring?: boolean;
}

export interface ServiceCircuitBreaker {
  serviceName: string;
  config: CircuitBreakerConfig;
  state: CircuitBreakerState;
  stats: CircuitBreakerStats;
}

export interface CircuitBreakerStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuitBreakers: Map<string, ServiceCircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    threshold: 5, // Number of failures before opening
    timeout: 60000, // 1 minute timeout for calls
    resetTimeout: 300000, // 5 minutes before trying again
    monitoring: true,
  };

  constructor() {
    this.initializeDefaultCircuitBreakers();
  }

  async recordSuccess(serviceName: string): Promise<void> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);

    circuitBreaker.stats.totalRequests++;
    circuitBreaker.stats.successfulRequests++;
    circuitBreaker.stats.lastSuccessTime = new Date();

    // Reset circuit breaker if it was HALF_OPEN and we got a success
    if (circuitBreaker.state.state === 'HALF_OPEN') {
      circuitBreaker.state.failureCount = 0;
      circuitBreaker.state.isOpen = false;
      circuitBreaker.state.state = 'CLOSED';
      circuitBreaker.state.nextRetryTime = undefined;

      this.logger.log(`Circuit breaker for service '${serviceName}' has been reset to CLOSED`);
    }

    this.logger.debug(`Recorded success for service '${serviceName}'. State: ${circuitBreaker.state.state}`);
  }

  async recordFailure(serviceName: string): Promise<void> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);

    circuitBreaker.stats.totalRequests++;
    circuitBreaker.stats.failedRequests++;
    circuitBreaker.stats.lastFailureTime = new Date();

    // Increment failure count
    circuitBreaker.state.failureCount++;
    circuitBreaker.state.lastFailureTime = new Date();

    // Check if we should open the circuit
    if (circuitBreaker.state.failureCount >= circuitBreaker.config.threshold) {
      circuitBreaker.state.isOpen = true;
      circuitBreaker.state.state = 'OPEN';
      circuitBreaker.state.nextRetryTime = new Date(Date.now() + circuitBreaker.config.resetTimeout);

      this.logger.warn(`Circuit breaker OPENED for service '${serviceName}'. Failure count: ${circuitBreaker.state.failureCount}`);
    }

    this.logger.debug(`Recorded failure for service '${serviceName}'. State: ${circuitBreaker.state.state}, Failures: ${circuitBreaker.state.failureCount}`);
  }

  async getState(serviceName: string): Promise<CircuitBreakerState> {
    const circuitBreaker = this.getCircuitBreaker(serviceName);

    // Check if we should transition from OPEN to HALF_OPEN
    if (circuitBreaker.state.state === 'OPEN' && circuitBreaker.state.nextRetryTime) {
      if (new Date() >= circuitBreaker.state.nextRetryTime) {
        circuitBreaker.state.state = 'HALF_OPEN';
        circuitBreaker.state.isOpen = false; // Allow a single request through

        this.logger.log(`Circuit breaker for service '${serviceName}' transitioning to HALF_OPEN`);
      }
    }

    return { ...circuitBreaker.state };
  }

  async executeWithCircuitBreaker<T>(
    serviceName: string,
    operation: () => Promise<T>,
    config?: Partial<CircuitBreakerConfig>,
  ): Promise<T> {
    const circuitBreaker = this.getCircuitBreaker(serviceName, config);

    // Check circuit state
    const state = await this.getState(serviceName);
    if (state.isOpen && state.state === 'OPEN') {
      throw new Error(`Circuit breaker is OPEN for service '${serviceName}'`);
    }

    try {
      const startTime = Date.now();
      const result = await Promise.race([
        operation(),
        this.createTimeoutPromise(circuitBreaker.config.timeout),
      ]);

      const duration = Date.now() - startTime;
      await this.recordSuccess(serviceName);

      return result;
    } catch (error) {
      await this.recordFailure(serviceName);
      throw error;
    }
  }

  getCircuitBreaker(serviceName: string, config?: Partial<CircuitBreakerConfig>): ServiceCircuitBreaker {
    if (!this.circuitBreakers.has(serviceName)) {
      const circuitBreaker: ServiceCircuitBreaker = {
        serviceName,
        config: { ...this.defaultConfig, ...config },
        state: {
          isOpen: false,
          failureCount: 0,
          state: 'CLOSED',
        },
        stats: {
          totalRequests: 0,
          successfulRequests: 0,
          failedRequests: 0,
        },
      };

      this.circuitBreakers.set(serviceName, circuitBreaker);
      this.logger.log(`Created circuit breaker for service '${serviceName}'`);
    }

    return this.circuitBreakers.get(serviceName)!;
  }

  getAllCircuitBreakers(): ServiceCircuitBreaker[] {
    return Array.from(this.circuitBreakers.values());
  }

  resetCircuitBreaker(serviceName: string): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.state = {
        isOpen: false,
        failureCount: 0,
        state: 'CLOSED',
      };

      this.logger.log(`Reset circuit breaker for service '${serviceName}'`);
    }
  }

  updateConfig(serviceName: string, config: Partial<CircuitBreakerConfig>): void {
    const circuitBreaker = this.circuitBreakers.get(serviceName);
    if (circuitBreaker) {
      circuitBreaker.config = { ...circuitBreaker.config, ...config };
      this.logger.log(`Updated circuit breaker config for service '${serviceName}'`);
    }
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Circuit breaker timeout')), timeout);
    });
  }

  private initializeDefaultCircuitBreakers(): void {
    const defaultServices = [
      'auth-service',
      'user-service',
      'project-service',
      'agent-service',
      'task-service',
      'rag-service',
      'token-service',
    ];

    for (const serviceName of defaultServices) {
      this.getCircuitBreaker(serviceName);
    }

    this.logger.log(`Initialized circuit breakers for ${defaultServices.length} default services`);
  }

  // Health check method for monitoring
  getHealthStatus(): any {
    const circuitBreakers = this.getAllCircuitBreakers();
    const healthy = circuitBreakers.filter(cb => !cb.state.isOpen).length;
    const unhealthy = circuitBreakers.filter(cb => cb.state.isOpen).length;
    const halfOpen = circuitBreakers.filter(cb => cb.state.state === 'HALF_OPEN').length;

    return {
      total: circuitBreakers.length,
      healthy,
      unhealthy,
      halfOpen,
      services: circuitBreakers.map(cb => ({
        service: cb.serviceName,
        state: cb.state.state,
        failureCount: cb.state.failureCount,
        totalRequests: cb.stats.totalRequests,
        successRate: cb.stats.totalRequests > 0
          ? (cb.stats.successfulRequests / cb.stats.totalRequests * 100).toFixed(2) + '%'
          : 'N/A',
      })),
    };
  }
}
