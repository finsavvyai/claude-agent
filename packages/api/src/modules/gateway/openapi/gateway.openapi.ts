import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export const GatewayOpenAPIConfig = {
  setup: (app: INestApplication) => {
    const config = new DocumentBuilder()
      .setTitle('Claude Agent Platform - API Gateway')
      .setDescription(`
      ## API Gateway Documentation

      The Claude Agent Platform API Gateway serves as the central entry point for all API requests.
      It provides authentication, rate limiting, request routing, and transformation capabilities.

      ### Features
      - **Authentication**: JWT-based authentication with role-based access control
      - **Rate Limiting**: Configurable rate limiting policies per endpoint
      - **Circuit Breaker**: Fault tolerance with automatic circuit breaking
      - **Request Routing**: Dynamic routing to microservices
      - **API Versioning**: Support for multiple API versions
      - **Request/Response Transformation**: Custom transformation capabilities

      ### Usage

      1. **Authentication**: Include a valid JWT token in the Authorization header
      2. **Rate Limits**: Respect rate limit headers included in responses
      3. **API Versioning**: Specify API version using \`X-API-Version\` header
      4. **Error Handling**: Follow standard HTTP status codes with detailed error messages

      ### Headers

      - \`Authorization: Bearer <token>\` - JWT authentication token
      - \`X-API-Version: v1\` - API version (default: v1)
      - \`X-Request-ID\` - Unique request identifier (returned in response)
      - \`X-RateLimit-Limit\` - Rate limit maximum
      - \`X-RateLimit-Remaining\` - Remaining requests
      - \`X-RateLimit-Reset\` - Rate limit reset timestamp

      ### Response Format

      All responses follow a consistent format:
      \`\`\`json
      {
        "data": {}, // Response data
        "meta": {
          "timestamp": "2024-01-01T00:00:00.000Z",
          "requestId": "req_1234567890_abcdef",
          "version": "v1"
        }
      }
      \`\`\`

      ### Error Response Format

      \`\`\`json
      {
        "error": "Error Type",
        "message": "Detailed error message",
        "code": "ERROR_CODE",
        "timestamp": "2024-01-01T00:00:00.000Z"
      }
      \`\`\`
      `)
      .setVersion('1.0.0')
      .setContact('Claude Agent Platform Support', 'https://claude-agent.com/support', 'support@claude-agent.com')
      .setLicense('MIT', 'https://opensource.org/licenses/MIT')
      .addBearerAuth({
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT authentication token',
      })
      .addApiKey({
        type: 'apiKey',
        name: 'X-API-Version',
        in: 'header',
        description: 'API version (v1, v2)',
      })
      .addServer('http://localhost:3000', 'Development Server')
      .addServer('https://api.claude-agent.com', 'Production Server')
      .addTag('gateway', 'API Gateway operations')
      .addTag('health', 'Health check endpoints')
      .addTag('routes', 'Route management')
      .addTag('metrics', 'Gateway metrics and monitoring')
      .addTag('auth', 'Authentication and authorization')
      .addTag('users', 'User management')
      .addTag('projects', 'Project management')
      .addTag('agents', 'Luna agents')
      .addTag('tasks', 'Task execution')
      .addTag('rag', 'RAG and search')
      .addTag('tokens', 'Token management')
      .build();

    const document = SwaggerModule.createDocument(app, config, {
      include: [
        // Include gateway module and all other modules
      ],
      deepScanRoutes: true,
    });

    // Add custom schemas
    addCustomSchemas(document);

    // Add security requirements
    addSecurityRequirements(document);

    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Claude Agent Platform API Gateway',
      customfavIcon: '/favicon.ico',
      customCss: `
        .topbar-wrapper img { content: url('https://claude-agent.com/logo.svg'); }
        .swagger-ui .topbar { background-color: #1a1a1a; }
        .swagger-ui .topbar-wrapper .link { color: #ffffff; }
      `,
      swaggerOptions: {
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        showExtensions: true,
        showCommonExtensions: true,
        docExpansion: 'none',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
      },
    });

    return document;
  },
};

function addCustomSchemas(document: any): void {
  document.components.schemas = {
    ...document.components.schemas,

    // Standard API Response
    'StandardResponse': {
      type: 'object',
      properties: {
        data: {
          description: 'Response data',
          type: 'object',
        },
        meta: {
          $ref: '#/components/schemas/ResponseMeta',
        },
      },
    },

    // Response Metadata
    'ResponseMeta': {
      type: 'object',
      required: ['timestamp', 'requestId', 'version'],
      properties: {
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Response timestamp',
        },
        requestId: {
          type: 'string',
          description: 'Unique request identifier',
        },
        version: {
          type: 'string',
          description: 'API version',
        },
        duration: {
          type: 'number',
          description: 'Request duration in milliseconds',
        },
      },
    },

    // Error Response
    'ErrorResponse': {
      type: 'object',
      required: ['error', 'message', 'timestamp'],
      properties: {
        error: {
          type: 'string',
          description: 'Error type',
        },
        message: {
          type: 'string',
          description: 'Detailed error message',
        },
        code: {
          type: 'string',
          description: 'Error code',
        },
        details: {
          type: 'object',
          description: 'Additional error details',
        },
        timestamp: {
          type: 'string',
          format: 'date-time',
          description: 'Error timestamp',
        },
        requestId: {
          type: 'string',
          description: 'Request identifier',
        },
      },
    },

    // Rate Limit Info
    'RateLimitInfo': {
      type: 'object',
      required: ['limit', 'remaining', 'reset'],
      properties: {
        limit: {
          type: 'integer',
          description: 'Rate limit maximum',
        },
        remaining: {
          type: 'integer',
          description: 'Remaining requests',
        },
        reset: {
          type: 'integer',
          description: 'Reset timestamp (Unix timestamp)',
        },
      },
    },

    // Circuit Breaker State
    'CircuitBreakerState': {
      type: 'object',
      required: ['isOpen', 'state', 'failureCount'],
      properties: {
        isOpen: {
          type: 'boolean',
          description: 'Whether the circuit breaker is open',
        },
        state: {
          type: 'string',
          enum: ['CLOSED', 'OPEN', 'HALF_OPEN'],
          description: 'Circuit breaker state',
        },
        failureCount: {
          type: 'integer',
          description: 'Current failure count',
        },
        lastFailureTime: {
          type: 'string',
          format: 'date-time',
          description: 'Last failure timestamp',
        },
        nextRetryTime: {
          type: 'string',
          format: 'date-time',
          description: 'Next retry timestamp',
        },
      },
    },

    // Gateway Metrics
    'GatewayMetrics': {
      type: 'object',
      required: ['totalRequests', 'successfulRequests', 'failedRequests', 'averageResponseTime'],
      properties: {
        totalRequests: {
          type: 'integer',
          description: 'Total number of requests',
        },
        successfulRequests: {
          type: 'integer',
          description: 'Number of successful requests',
        },
        failedRequests: {
          type: 'integer',
          description: 'Number of failed requests',
        },
        averageResponseTime: {
          type: 'number',
          description: 'Average response time in milliseconds',
        },
        requestsPerMinute: {
          type: 'number',
          description: 'Requests per minute',
        },
        activeConnections: {
          type: 'integer',
          description: 'Current active connections',
        },
        circuitBreakerTrips: {
          type: 'integer',
          description: 'Number of circuit breaker trips',
        },
      },
    },

    // Service Health
    'ServiceHealth': {
      type: 'object',
      required: ['service', 'url', 'status'],
      properties: {
        service: {
          type: 'string',
          description: 'Service name',
        },
        url: {
          type: 'string',
          description: 'Service URL',
        },
        status: {
          type: 'string',
          enum: ['UP', 'DOWN'],
          description: 'Service status',
        },
        circuitBreakerState: {
          $ref: '#/components/schemas/CircuitBreakerState',
        },
        lastCheck: {
          type: 'string',
          format: 'date-time',
          description: 'Last health check timestamp',
        },
        responseTime: {
          type: 'number',
          description: 'Last health check response time',
        },
      },
    },

    // Route Configuration
    'RouteConfig': {
      type: 'object',
      required: ['path', 'method', 'service', 'serviceUrl'],
      properties: {
        path: {
          type: 'string',
          description: 'Route path pattern',
        },
        method: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
          },
          description: 'HTTP methods',
        },
        service: {
          type: 'string',
          description: 'Target service name',
        },
        serviceUrl: {
          type: 'string',
          description: 'Target service URL',
        },
        timeout: {
          type: 'integer',
          description: 'Request timeout in milliseconds',
        },
        priority: {
          type: 'integer',
          description: 'Route priority',
        },
        auth: {
          $ref: '#/components/schemas/AuthConfig',
        },
        rateLimit: {
          $ref: '#/components/schemas/RateLimitConfig',
        },
      },
    },

    // Authentication Configuration
    'AuthConfig': {
      type: 'object',
      properties: {
        required: {
          type: 'boolean',
          description: 'Whether authentication is required',
        },
        strategies: {
          type: 'array',
          items: { type: 'string' },
          description: 'Authentication strategies',
        },
        permissions: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required permissions',
        },
        roles: {
          type: 'array',
          items: { type: 'string' },
          description: 'Required roles',
        },
        bypassPaths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Paths that bypass authentication',
        },
      },
    },

    // Rate Limit Configuration
    'RateLimitConfig': {
      type: 'object',
      required: ['windowMs', 'max'],
      properties: {
        windowMs: {
          type: 'integer',
          description: 'Time window in milliseconds',
        },
        max: {
          type: 'integer',
          description: 'Maximum requests per window',
        },
        message: {
          type: 'string',
          description: 'Custom rate limit message',
        },
      },
    },
  };
}

function addSecurityRequirements(document: any): void {
  // Add global security requirement for most endpoints
  document.security = [
    {
      bearerAuth: [],
      apiVersion: [],
    },
  ];

  // Add exceptions for public endpoints
  if (!document.paths) document.paths = {};

  // Public endpoints (no auth required)
  const publicEndpoints = [
    '/api/v1/health',
    '/api/v1/auth/login',
    '/api/v1/auth/register',
    '/api/docs',
  ];

  publicEndpoints.forEach(path => {
    if (document.paths[path]) {
      Object.keys(document.paths[path]).forEach(method => {
        document.paths[path][method].security = [];
      });
    }
  });
}
