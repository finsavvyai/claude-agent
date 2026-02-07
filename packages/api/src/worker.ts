/**
 * Cloudflare Worker for RAG API
 * Optimized for serverless deployment with Cloudflare's edge computing
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { validator } from 'hono/validator';
import { env } from 'hono/adapter';

// Security & Observability middleware (365-security.md §3-§6)
import { applySecurityMiddleware, authRateLimit } from './middleware';

// RAG Services optimized for Cloudflare Workers
import { CloudflareRAGService } from './services/cloudflare-rag';
import { CloudflareVectorDB } from './services/cloudflare-vector-db';
import { DocumentProcessor } from '@repo/rag/services/document-processor';

// Types
import { RAGQuery, RAGResponse } from '@repo/rag/interfaces';

const app = new Hono();

// Middleware
app.use('*', cors({
  origin: ['https://claude.ai', 'https://chat.openai.com', 'https://agent.finsavvyai.com'],
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
}));

app.use('*', logger());

// Security: headers, CSRF, rate limiting, body size limits, error sanitization
applySecurityMiddleware(app, {
  allowedOrigins: ['https://claude.ai', 'https://chat.openai.com', 'https://agent.finsavvyai.com'],
});

// Stricter rate limit on auth endpoints (365-security.md §5)
app.use('/auth/*', authRateLimit);

// Cloudflare environment bindings interface
interface Env {
  // KV Namespaces
  RAG_CACHE: KVNamespace;
  DOCUMENT_METADATA: KVNamespace;

  // D1 Database
  RAG_DB: D1Database;

  // R2 Storage
  DOCUMENT_STORAGE: R2Bucket;

  // Queue
  RAG_QUEUE: Queue;

  // Environment Variables
  OPENAI_API_KEY: string;
  ENVIRONMENT: string;
  QDRANT_URL?: string;
  QDRANT_API_KEY?: string;
}

// Initialize RAG service with Cloudflare optimizations
const ragService = new CloudflareRAGService();
const vectorDB = new CloudflareVectorDB();
const documentProcessor = new DocumentProcessor({
  chunkSize: 1000,
  chunkOverlap: 200,
  extractMetadata: true,
  detectLanguage: true
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    environment: env(c).ENVIRONMENT,
    services: {
      kv: 'available',
      d1: 'available',
      r2: 'available',
      queue: 'available'
    }
  });
});

// RAG Status endpoint
app.get('/rag/status', async (c) => {
  try {
    const env = env(c);

    // Check all Cloudflare services
    const [
      cacheHealth,
      dbHealth,
      storageHealth,
      vectorHealth
    ] = await Promise.all([
      checkKVHealth(env.RAG_CACHE),
      checkD1Health(env.RAG_DB),
      checkR2Health(env.DOCUMENT_STORAGE),
      checkVectorDBHealth(env)
    ]);

    const stats = await ragService.getStatistics(env);

    return c.json({
      status: 'active',
      message: 'RAG service is running on Cloudflare Workers',
      environment: env.ENVIRONMENT,
      services: {
        cache: cacheHealth,
        database: dbHealth,
        storage: storageHealth,
        vectorDB: vectorHealth
      },
      statistics: stats,
      capabilities: {
        query: true,
        indexing: true,
        search: true,
        conversationHistory: true,
        codeAwareness: true,
        realTimeProcessing: true,
        edgeComputing: true
      }
    });
  } catch (error) {
    console.error('RAG status check failed:', error);
    return c.json({
      status: 'error',
      message: 'RAG service unavailable',
      error: error.message,
      environment: env(c).ENVIRONMENT
    }, 500);
  }
});

// Repository indexing endpoint
app.post('/rag/repository/index',
  validator('json', (value, c) => {
    const required = ['repositoryPath'];
    for (const field of required) {
      if (!value[field]) {
        return c.json({ error: `Missing required field: ${field}` }, 400);
      }
    }
    return value;
  }),
  async (c) => {
    try {
      const env = env(c);
      const { repositoryPath, filePatterns, excludePatterns, metadata } = await c.req.json();

      // Validate repository path (security)
      if (!isValidRepositoryPath(repositoryPath)) {
        return c.json({ error: 'Invalid repository path' }, 400);
      }

      // Check if already indexed (cache first)
      const cacheKey = `index:${repositoryPath}:${hashString(JSON.stringify({ filePatterns, excludePatterns }))}`;
      const cached = await env.RAG_CACHE.get(cacheKey, 'json');

      if (cached && cached.timestamp > Date.now() - 3600000) { // 1 hour cache
        return c.json(cached.result);
      }

      // Start async processing
      const jobId = crypto.randomUUID();
      await env.RAG_QUEUE.send({
        type: 'index_repository',
        jobId,
        repositoryPath,
        filePatterns,
        excludePatterns,
        metadata: {
          ...metadata,
          environment: env.ENVIRONMENT,
          indexedAt: new Date().toISOString()
        }
      });

      return c.json({
        jobId,
        status: 'processing',
        message: 'Repository indexing started',
        estimatedTime: '2-5 minutes depending on repository size'
      });

    } catch (error) {
      console.error('Repository indexing failed:', error);
      return c.json({
        error: 'Indexing failed',
        message: error.message
      }, 500);
    }
  }
);

// File indexing endpoint
app.post('/rag/file/index', async (c) => {
  try {
    const env = env(c);
    const { filePath, content, metadata } = await c.req.json();

    // Process document with Cloudflare optimizations
    const processedDocument = await documentProcessor.processDocument(content, {
      documentId: generateDocumentId(filePath),
      title: extractTitle(filePath),
      source: filePath,
      metadata: {
        ...metadata,
        environment: env.ENVIRONMENT,
        indexedAt: new Date().toISOString()
      }
    });

    // Store in R2 for large content
    if (content.length > 10000) { // 10KB threshold
      const storageKey = `documents/${processedDocument.document.id}`;
      await env.DOCUMENT_STORAGE.put(storageKey, content);
      processedDocument.document.storageKey = storageKey;
    }

    // Generate embeddings and store in vector DB
    const embeddings = await vectorDB.addDocuments([processedDocument.document], env);

    // Cache metadata in KV
    await env.DOCUMENT_METADATA.put(
      processedDocument.document.id,
      JSON.stringify(processedDocument),
      { expirationTtl: 86400 * 30 } // 30 days
    );

    return c.json({
      success: true,
      documentId: processedDocument.document.id,
      chunksGenerated: processedDocument.chunks.length,
      embeddingsGenerated: embeddings.length,
      storageLocation: content.length > 10000 ? 'R2' : 'KV'
    });

  } catch (error) {
    console.error('File indexing failed:', error);
    return c.json({
      error: 'File indexing failed',
      message: error.message
    }, 500);
  }
});

// Enhanced RAG query endpoint
app.post('/rag/query', async (c) => {
  try {
    const env = env(c);
    const { query, maxResults = 5, temperature = 0.7, filters = {}, includeContext = true } = await c.req.json();

    // Check cache first
    const cacheKey = `query:${hashString(query)}:${JSON.stringify(filters)}`;
    const cached = await env.RAG_CACHE.get(cacheKey, 'json');

    if (cached && cached.timestamp > Date.now() - 300000) { // 5 minute cache
      return c.json(cached.response);
    }

    // Generate query embedding
    const queryEmbedding = await vectorDB.generateEmbedding(query, env);

    // Search for relevant documents
    const searchResults = await vectorDB.search(queryEmbedding, {
      topK: maxResults,
      filters: {
        ...filters,
        environment: env.ENVIRONMENT
      }
    }, env);

    // Build context from search results
    const context = await buildContext(searchResults, env);

    // Generate response using OpenAI
    const response = await ragService.generateResponse(query, context, {
      temperature,
      maxTokens: 2000,
      includeSources: true
    }, env);

    // Cache the response
    await env.RAG_CACHE.put(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      response
    }), { expirationTtl: 300 });

    return c.json(response);

  } catch (error) {
    console.error('RAG query failed:', error);
    return c.json({
      error: 'Query failed',
      message: error.message
    }, 500);
  }
});

// Document search endpoint
app.post('/rag/search', async (c) => {
  try {
    const env = env(c);
    const { query, maxResults = 10, filters = {} } = await c.req.json();

    const queryEmbedding = await vectorDB.generateEmbedding(query, env);
    const results = await vectorDB.search(queryEmbedding, {
      topK: maxResults,
      filters: {
        ...filters,
        environment: env.ENVIRONMENT
      }
    }, env);

    return c.json({
      query,
      results: results.map(doc => ({
        id: doc.id,
        title: doc.title,
        content: doc.content.substring(0, 500) + '...',
        url: doc.url,
        relevanceScore: doc.score,
        metadata: doc.metadata
      })),
      totalResults: results.length
    });

  } catch (error) {
    console.error('Search failed:', error);
    return c.json({
      error: 'Search failed',
      message: error.message
    }, 500);
  }
});

// Get conversation history
app.get('/rag/conversation/history', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '10');
    const env = env(c);

    const history = await ragService.getConversationHistory(limit, env);
    return c.json({ history });

  } catch (error) {
    console.error('Failed to get conversation history:', error);
    return c.json({
      error: 'Failed to get conversation history',
      message: error.message
    }, 500);
  }
});

// Clear conversation history
app.delete('/rag/conversation/history', async (c) => {
  try {
    const env = env(c);
    await ragService.clearConversationHistory(env);
    return c.json({ success: true, message: 'Conversation history cleared' });

  } catch (error) {
    console.error('Failed to clear conversation history:', error);
    return c.json({
      error: 'Failed to clear conversation history',
      message: error.message
    }, 500);
  }
});

// Delete documents
app.delete('/rag/documents', async (c) => {
  try {
    const env = env(c);
    const { documentIds } = await c.req.json();

    if (!Array.isArray(documentIds) || documentIds.length === 0) {
      return c.json({ error: 'Invalid document IDs' }, 400);
    }

    const results = await Promise.allSettled(
      documentIds.map(async (id) => {
        // Delete from vector DB
        await vectorDB.deleteDocument(id, env);

        // Delete from KV metadata
        await env.DOCUMENT_METADATA.delete(id);

        // Delete from R2 if stored there
        const doc = await env.DOCUMENT_METADATA.get(id, 'json');
        if (doc?.storageKey) {
          await env.DOCUMENT_STORAGE.delete(doc.storageKey);
        }
      })
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    return c.json({
      success: true,
      deleted: successful,
      failed,
      total: documentIds.length
    });

  } catch (error) {
    console.error('Document deletion failed:', error);
    return c.json({
      error: 'Document deletion failed',
      message: error.message
    }, 500);
  }
});

// Get statistics
app.get('/rag/statistics', async (c) => {
  try {
    const env = env(c);
    const stats = await ragService.getStatistics(env);
    return c.json(stats);

  } catch (error) {
    console.error('Failed to get statistics:', error);
    return c.json({
      error: 'Failed to get statistics',
      message: error.message
    }, 500);
  }
});

// Queue consumer for background processing
export default {
  async fetch(request, env, ctx) {
    return app.fetch(request, env, ctx);
  },

  async queue(batch, env) {
    for (const message of batch.messages) {
      try {
        await processQueueMessage(message, env);
      } catch (error) {
        console.error('Queue processing failed:', error);
        // Message will be retried automatically
      }
    }
  }
};

// Queue message processing
async function processQueueMessage(message, env) {
  const { type, jobId, ...data } = message.body;

  switch (type) {
    case 'index_repository':
      await processRepositoryIndexing(jobId, data, env);
      break;
    case 'process_document':
      await processDocumentBatch(jobId, data, env);
      break;
    default:
      console.warn('Unknown queue message type:', type);
  }
}

// Repository indexing processing
async function processRepositoryIndexing(jobId, data, env) {
  const { repositoryPath, filePatterns, excludePatterns, metadata } = data;

  try {
    // Update job status
    await env.RAG_CACHE.put(`job:${jobId}`, JSON.stringify({
      status: 'processing',
      startedAt: new Date().toISOString()
    }));

    // Process repository (this would be adapted for Cloudflare Workers)
    const result = await ragService.processRepository({
      repositoryPath,
      filePatterns,
      excludePatterns,
      metadata
    }, env);

    // Cache results
    const cacheKey = `index:${repositoryPath}:${hashString(JSON.stringify({ filePatterns, excludePatterns }))}`;
    await env.RAG_CACHE.put(cacheKey, JSON.stringify({
      timestamp: Date.now(),
      result
    }), { expirationTtl: 3600 }); // 1 hour

    // Update job status
    await env.RAG_CACHE.put(`job:${jobId}`, JSON.stringify({
      status: 'completed',
      completedAt: new Date().toISOString(),
      result
    }));

  } catch (error) {
    await env.RAG_CACHE.put(`job:${jobId}`, JSON.stringify({
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString()
    }));
  }
}

// Health check functions
async function checkKVHealth(kv) {
  try {
    const testKey = 'health-check-' + Date.now();
    await kv.put(testKey, 'ok');
    const value = await kv.get(testKey);
    await kv.delete(testKey);
    return value === 'ok' ? 'healthy' : 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkD1Health(db) {
  try {
    await db.prepare('SELECT 1').first();
    return 'healthy';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkR2Health(r2) {
  try {
    const testKey = 'health-check-' + Date.now();
    await r2.put(testKey, 'ok');
    const object = await r2.get(testKey);
    await r2.delete(testKey);
    return object ? 'healthy' : 'degraded';
  } catch (error) {
    return 'unhealthy';
  }
}

async function checkVectorDBHealth(env) {
  try {
    // Check if Qdrant is available or if using fallback
    if (env.QDRANT_URL && env.QDRANT_API_KEY) {
      const response = await fetch(`${env.QDRANT_URL}/health`);
      return response.ok ? 'healthy' : 'unhealthy';
    }
    return 'fallback'; // Using built-in vector search
  } catch (error) {
    return 'unhealthy';
  }
}

// Utility functions
function isValidRepositoryPath(path) {
  // Validate and sanitize repository path
  return typeof path === 'string' && path.length > 0 && !path.includes('..');
}

function generateDocumentId(filePath) {
  return `doc_${Buffer.from(filePath).toString('base64').replace(/[^a-zA-Z0-9]/g, '').substring(0, 20)}_${Date.now()}`;
}

function extractTitle(filePath) {
  return filePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'Untitled';
}

function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return hash.toString();
}

async function buildContext(searchResults, env) {
  const context = [];
  for (const result of searchResults) {
    let content = result.content;

    // Fetch full content from R2 if stored there
    if (result.storageKey) {
      const object = await env.DOCUMENT_STORAGE.get(result.storageKey);
      if (object) {
        content = await object.text();
      }
    }

    context.push({
      content: content.substring(0, 2000), // Limit context size
      metadata: result.metadata,
      score: result.score
    });
  }
  return context;
}
