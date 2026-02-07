import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
export let errorRate = new Rate('errors');

// Test configuration
export let options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 100 }, // Stay at 100 users
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 200 }, // Stay at 200 users
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // 95% of requests under 500ms
    http_req_failed: ['rate<0.1'],    // Error rate under 10%
    errors: ['rate<0.1'],              // Custom error rate under 10%
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function() {
  // Test homepage
  let homeResponse = http.get(`${BASE_URL}/`);
  let homeSuccess = check(homeResponse, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage response time < 500ms': (r) => r.timings.duration < 500,
  });

  errorRate.add(!homeSuccess);

  // Test dashboard (authenticated route)
  let dashboardResponse = http.get(`${BASE_URL}/dashboard`, {
    headers: {
      'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
    },
  });

  let dashboardSuccess = check(dashboardResponse, {
    'dashboard status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
  });

  errorRate.add(!dashboardSuccess);

  // Test API endpoints
  let apiResponse = http.get(`${BASE_URL}/api/v1/health`);
  let apiSuccess = check(apiResponse, {
    'API health status is 200': (r) => r.status === 200,
    'API response time < 200ms': (r) => r.timings.duration < 200,
  });

  errorRate.add(!apiSuccess);

  // Test semantic search endpoint
  let searchResponse = http.post(`${BASE_URL}/api/v1/search`, JSON.stringify({
    query: 'test search query',
    limit: 10,
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${__ENV.TEST_TOKEN || 'test-token'}`,
    },
  });

  let searchSuccess = check(searchResponse, {
    'search status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'search response time < 2000ms': (r) => r.timings.duration < 2000,
  });

  errorRate.add(!searchSuccess);

  // Simulate user think time
  sleep(1);
}

export function handleSummary(data) {
  return {
    'load-test-summary.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}
