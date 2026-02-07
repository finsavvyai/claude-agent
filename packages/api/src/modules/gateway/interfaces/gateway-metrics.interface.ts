export interface GatewayMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  requestsPerMinute: number;
  activeConnections: number;
  circuitBreakerTrips: number;
}

export interface ServiceHealth {
  service: string;
  url: string;
  status: 'UP' | 'DOWN';
  circuitBreakerState: CircuitBreakerState;
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime?: Date;
  nextRetryTime?: Date;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}
