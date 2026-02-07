export default () => ({
  port: parseInt(process.env.PORT, 10) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/claude_agent',
    ssl: process.env.NODE_ENV === 'production',
  },

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB, 10) || 0,
  },

  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://localhost:5672',
    exchanges: {
      tasks: 'claude-agent.tasks',
      agents: 'claude-agent.agents',
      rag: 'claude-agent.rag',
    },
  },

  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  ai: {
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    },
    anthropic: {
      apiKey: process.env.ANTHROPIC_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      maxRetries: 3,
      timeout: 30000,
    },
  },

  rag: {
    embeddingModel: process.env.RAG_EMBEDDING_MODEL || 'text-embedding-ada-002',
    vectorStore: {
      provider: process.env.VECTOR_STORE_PROVIDER || 'qdrant',
      url: process.env.VECTOR_STORE_URL || 'http://localhost:6333',
      apiKey: process.env.VECTOR_STORE_API_KEY,
    },
    cache: {
      ttl: parseInt(process.env.RAG_CACHE_TTL, 10) || 3600, // 1 hour
      maxSize: parseInt(process.env.RAG_CACHE_MAX_SIZE, 10) || 1000,
    },
  },

  tokenOptimization: {
    defaultBudget: parseFloat(process.env.DEFAULT_TOKEN_BUDGET) || 100.0,
    alertThreshold: parseFloat(process.env.TOKEN_ALERT_THRESHOLD) || 0.8,
    optimizationStrategies: (process.env.OPTIMIZATION_STRATEGIES || 'summarization,compression,selection').split(','),
  },

  cloudflare: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    workers: {
      enabled: process.env.CLOUDFLARE_WORKERS_ENABLED === 'true',
      kvNamespaces: {
        ragCache: process.env.CLOUDFLARE_KV_RAG_CACHE || 'claude-agent-rag-cache',
        tokenCache: process.env.CLOUDFLARE_KV_TOKEN_CACHE || 'claude-agent-token-cache',
      },
    },
  },

  cors: {
    origins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : '*',
  },

  logging: {
    level: process.env.LOG_LEVEL || 'info',
    elasticsearch: {
      url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
      index: process.env.ELASTICSEARCH_INDEX || 'claude-agent-logs',
    },
  },

  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    tracing: {
      jaegerEndpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    },
    metrics: {
      prometheusPort: parseInt(process.env.PROMETHEUS_PORT, 10) || 9090,
    },
  },
});
