/**
 * Cloudflare-optimized RAG Service
 * Designed to work efficiently with Cloudflare Workers, KV, D1, and R2
 */

import { OpenAI } from 'openai';

interface Env {
  RAG_CACHE: KVNamespace;
  DOCUMENT_METADATA: KVNamespace;
  RAG_DB: D1Database;
  DOCUMENT_STORAGE: R2Bucket;
  OPENAI_API_KEY: string;
  QDRANT_URL?: string;
  QDRANT_API_KEY?: string;
  ENVIRONMENT: string;
}

interface RAGOptions {
  temperature?: number;
  maxTokens?: number;
  includeSources?: boolean;
  model?: string;
}

export class CloudflareRAGService {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI client (will be configured per request)
  }

  /**
   * Process repository with Cloudflare optimizations
   */
  async processRepository(options: {
    repositoryPath: string;
    filePatterns?: string[];
    excludePatterns?: string[];
    metadata?: Record<string, any>;
  }, env: Env): Promise<{
    totalFiles: number;
    processedFiles: number;
    errors: string[];
  }> {
    // This is a simplified version for Cloudflare Workers
    // In practice, you'd need to implement file fetching differently
    // since Workers don't have direct file system access

    try {
      // Store indexing job metadata in D1
      const jobId = crypto.randomUUID();
      await env.RAG_DB.prepare(`
        INSERT INTO indexing_jobs (id, repository_path, status, created_at)
        VALUES (?, ?, ?, ?)
      `).bind(jobId, options.repositoryPath, 'processing', new Date().toISOString()).run();

      // Simulate processing (in real implementation, fetch files via API)
      const result = {
        totalFiles: 0,
        processedFiles: 0,
        errors: []
      };

      // Update job status
      await env.RAG_DB.prepare(`
        UPDATE indexing_jobs SET status = ?, completed_at = ?, result = ?
        WHERE id = ?
      `).bind('completed', new Date().toISOString(), JSON.stringify(result), jobId).run();

      return result;
    } catch (error) {
      console.error('Repository processing failed:', error);
      throw error;
    }
  }

  /**
   * Generate response using OpenAI with Cloudflare optimizations
   */
  async generateResponse(
    query: string,
    context: any[],
    options: RAGOptions,
    env: Env
  ): Promise<any> {
    const openai = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
    });

    try {
      // Build context from search results
      const contextText = context
        .map(item => `Document: ${item.metadata.title}\nContent: ${item.content}`)
        .join('\n\n');

      // Cache the generation request
      const cacheKey = `generation:${this.hashString(query + contextText)}`;
      const cached = await env.RAG_CACHE.get(cacheKey, 'json');

      if (cached && cached.timestamp > Date.now() - 600000) { // 10 minute cache
        return cached.response;
      }

      const messages = [
        {
          role: 'system',
          content: `You are a helpful AI assistant that answers questions based on the provided context.
          Use the context to give accurate, specific answers. If the context doesn't contain relevant information,
          say so clearly. Always cite your sources when possible.`
        },
        {
          role: 'user',
          content: `Context:\n${contextText}\n\nQuestion: ${query}`
        }
      ];

      const completion = await openai.chat.completions.create({
        model: options.model || 'gpt-4',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 2000,
      });

      const response = {
        answer: completion.choices[0].message.content,
        sources: context.map(item => ({
          id: item.metadata.id,
          title: item.metadata.title,
          url: item.metadata.url,
          relevanceScore: item.score
        })),
        query,
        context: contextText,
        confidence: this.calculateConfidence(context),
        metadata: {
          model: options.model || 'gpt-4',
          temperature: options.temperature || 0.7,
          maxTokens: options.maxTokens || 2000,
          processingTime: Date.now(),
          cacheHit: !!cached,
          environment: env.ENVIRONMENT
        }
      };

      // Cache the response
      await env.RAG_CACHE.put(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        response
      }), { expirationTtl: 600 });

      return response;

    } catch (error) {
      console.error('Response generation failed:', error);
      throw error;
    }
  }

  /**
   * Get conversation history from D1
   */
  async getConversationHistory(limit: number, env: Env): Promise<any[]> {
    try {
      const results = await env.RAG_DB.prepare(`
        SELECT * FROM conversation_history
        WHERE environment = ?
        ORDER BY created_at DESC
        LIMIT ?
      `).bind(env.ENVIRONMENT, limit).all();

      return results.results || [];
    } catch (error) {
      console.error('Failed to get conversation history:', error);
      return [];
    }
  }

  /**
   * Clear conversation history
   */
  async clearConversationHistory(env: Env): Promise<void> {
    try {
      await env.RAG_DB.prepare(`
        DELETE FROM conversation_history WHERE environment = ?
      `).bind(env.ENVIRONMENT).run();
    } catch (error) {
      console.error('Failed to clear conversation history:', error);
      throw error;
    }
  }

  /**
   * Get RAG system statistics
   */
  async getStatistics(env: Env): Promise<any> {
    try {
      // Get document count from D1
      const docCount = await env.RAG_DB.prepare(`
        SELECT COUNT(*) as count FROM documents WHERE environment = ?
      `).bind(env.ENVIRONMENT).first();

      // Get query count from D1
      const queryCount = await env.RAG_DB.prepare(`
        SELECT COUNT(*) as count FROM query_logs WHERE environment = ?
      `).bind(env.ENVIRONMENT).first();

      // Get KV usage stats
      const kvList = await env.RAG_CACHE.list();
      const metadataList = await env.DOCUMENT_METADATA.list();

      return {
        totalDocuments: docCount?.count || 0,
        totalQueries: queryCount?.count || 0,
        averageResponseTime: 150, // ms (would be calculated from logs)
        cacheHitRate: 0.75, // Would be calculated from actual usage
        kvUsage: {
          cache: kvList.keys.length,
          metadata: metadataList.keys.length
        },
        environment: env.ENVIRONMENT,
        lastUpdated: new Date().toISOString()
      };
    } catch (error) {
      console.error('Failed to get statistics:', error);
      return {
        totalDocuments: 0,
        totalQueries: 0,
        averageResponseTime: 0,
        cacheHitRate: 0,
        environment: env.ENVIRONMENT,
        error: error.message
      };
    }
  }

  /**
   * Log query for analytics
   */
  async logQuery(query: string, responseTime: number, documentCount: number, env: Env): Promise<void> {
    try {
      await env.RAG_DB.prepare(`
        INSERT INTO query_logs (query, response_time, document_count, environment, created_at)
        VALUES (?, ?, ?, ?, ?)
      `).bind(query, responseTime, documentCount, env.ENVIRONMENT, new Date().toISOString()).run();
    } catch (error) {
      console.error('Failed to log query:', error);
    }
  }

  /**
   * Calculate confidence score based on context
   */
  private calculateConfidence(context: any[]): number {
    if (!context || context.length === 0) return 0;

    const avgScore = context.reduce((sum, item) => sum + (item.score || 0), 0) / context.length;
    return Math.min(avgScore, 1.0);
  }

  /**
   * Simple string hash function
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString();
  }
}
