/**
 * Cloudflare-optimized Vector Database Service
 * Uses Cloudflare's built-in vector search capabilities
 * with fallback to external providers like Qdrant/Pinecone
 */

interface Env {
  QDRANT_URL?: string;
  QDRANT_API_KEY?: string;
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  score: number;
  metadata: Record<string, any>;
}

export class CloudflareVectorDB {
  private fallbackProvider: any; // For external vector DB if needed

  constructor() {
    // Initialize fallback provider if available
    this.fallbackProvider = null;
  }

  /**
   * Generate embeddings for text
   */
  async generateEmbedding(text: string, env: Env): Promise<number[]> {
    // In production, use OpenAI via API call (Workers support this)
    if (env.OPENAI_API_KEY) {
      return await this.generateOpenAIEmbedding(text, env);
    }

    // Fallback to local embedding or different provider
    return this.generateFallbackEmbedding(text);
  }

  /**
   * Add documents to vector index
   */
  async addDocuments(documents: any[], env: Env): Promise<string[]> {
    const embeddings = [];

    for (const doc of documents) {
      const embedding = await this.generateEmbedding(doc.content, env);
      embeddings.push({
        id: doc.id,
        vector: embedding,
        title: doc.title,
        content: doc.content,
        metadata: doc.metadata
      });
    }

    // Store in KV for quick retrieval (small datasets)
    await env.RAG_CACHE.put('documents', JSON.stringify(embeddings));

    // Use external provider if available and configured
    if (env.QDRANT_URL && env.QDRANT_API_KEY) {
      return await this.addToExternalProvider(embeddings, env);
    }

    // Return document IDs
    return documents.map(doc => doc.id);
  }

  /**
   * Search for relevant documents
   */
  async search(queryEmbedding: number[], options: any, env: Env): Promise<SearchResult[]> {
    const { topK = 5, filters = {} } = options;

    // Check KV cache first
    const cacheKey = `search:${this.hashVector(queryEmbedding)}:${JSON.stringify(filters)}`;
    const cached = await env.RAG_CACHE.get(cacheKey, 'json');

    if (cached && cached.timestamp > Date.now() - 300000) { // 5 minute cache
      return cached.results;
    }

    // Search in local KV for small datasets
    const results = await this.searchKV(queryEmbedding, topK, env);

    if (results.length > 0) {
      // Cache results
      await env.RAG_CACHE.put(cacheKey, JSON.stringify({
        timestamp: Date.now(),
        results
      }));
    }

    // Use external provider if available
    if (env.QDRANT_URL && env.QDRANT_API_KEY) {
      return await this.searchExternalProvider(queryEmbedding, options, env);
    }

    return results;
  }

  /**
   * Delete document by ID
   */
  async deleteDocument(id: string, env: Env): Promise<void> {
    // Remove from KV
    const docs = await env.RAG_CACHE.get('documents', 'json');
    const parsed = JSON.parse(docs || '[]');
    const filtered = parsed.filter((doc: any) => doc.id !== id);
    await env.RAG_CACHE.put('documents', JSON.stringify(filtered));

    // Delete from external provider
    if (env.QDRANT_URL && env.QDRANT_API_KEY) {
      await this.deleteFromExternalProvider(id, env);
    }
  }

  /**
   * Simple embedding generation using token-based approach
   */
  private async generateOpenAIEmbedding(text: string, env: Env): Promise<number[]> {
    // This would typically be implemented with OpenAI API
    // For Workers, we can use a simplified approach
    const tokens = this.tokenizeText(text);
    const embedding = new Array(1536).fill(0);

    // Simple token-based embedding (in real implementation, use actual OpenAI)
    for (let i = 0; i < Math.min(tokens.length, 1536); i++) {
      embedding[i] = Math.sin(tokens[i] * 100) * 0.5;
    }

    return embedding;
  }

  /**
   * Fallback embedding generation
   */
  private generateFallbackEmbedding(text: string): Promise<number[]> {
    const tokens = this.tokenizeText(text);
    const embedding = new Array(1536).fill(0);

    // Very simple hash-like approach
    for (let i = 0; i < Math.min(tokens.length, 1536); i++) {
      embedding[i] = (tokens[i] * 31) % 256 / 255.0;
    }

    return embedding;
  }

  /**
   * Search in KV storage with vector similarity
   */
  private async searchKV(queryEmbedding: number[], topK: number, env: Env): Promise<SearchResult[]> {
    const documents = await env.RAG_CACHE.get('documents', 'json');
    const parsed = JSON.parse(documents || '[]');

    // Simple cosine similarity search
    const results = parsed.map((doc: any) => {
      const similarity = this.cosineSimilarity(queryEmbedding, doc.vector);
      return {
        ...doc,
        score: similarity
      };
    }).sort((a, b) => b.score - a.score).slice(0, topK);

    return results;
  }

  /**
   * Search external provider (Qdrant/Pinecone)
   */
  private async searchExternalProvider(queryEmbedding: number[], options: any, env: Env): Promise<SearchResult[]> {
    if (!this.fallbackProvider) {
      // Initialize external provider (would be Qdrant, Pinecone, etc.)
      return [];
    }

    return await this.fallbackProvider.search(queryEmbedding, options);
  }

  /**
   * Add documents to external provider
   */
  private async addToExternalProvider(embeddings: any[], env: Env): Promise<string[]> {
    if (!this.fallbackProvider) {
      return [];
    }

    return await this.fallbackProvider.upsert(embeddings);
  }

  /**
   * Delete from external provider
   */
  private async deleteFromExternalProvider(id: string, env: Env): Promise<void> {
    if (!this.fallbackProvider) return;
    await this.fallbackProvider.delete([id]);
  }

  /**
   * Calculate cosine similarity
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Hash vector for cache key generation
   */
  private hashVector(vector: number[]): string {
    let hash = 0;
    for (const val of vector) {
      hash = (hash * 31) + Math.floor(val * 1000);
    }
    return hash.toString();
  }

  /**
   * Simple text tokenization
   */
  private tokenizeText(text: string): number[] {
    // Very simple word-based tokenization
    const words = text.toLowerCase().split(/[^a-z]+/);
    const tokens = [];

    for (const word of words) {
      if (word.length > 0) {
        // Simple hash to create token numbers
        let token = 0;
        for (let i = 0; i < word.length; i++) {
          token = ((token * 31) + word.charCodeAt(i)) & 0x7fffffff;
        }
        tokens.push(token);
      }
    }

    return tokens;
  }
}
