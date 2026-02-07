import {
  SemanticSearchEngine,
  SearchQuery,
  SearchResult,
  SearchFilters,
  VectorSearchResult,
  DocumentChunk,
  ProcessedDocument,
  EmbeddingService,
  VectorDatabase,
  RAGEngineConfig,
  SearchOptions,
  RelevanceScore,
  SearchRankingAlgorithm,
  RetrievalAugmentedResponse
} from '../interfaces';
import { EventEmitter } from 'events';

export class SemanticSearchService extends EventEmitter implements SemanticSearchEngine {
  private embeddingService: EmbeddingService;
  private vectorDatabase: VectorDatabase;
  private config: RAGEngineConfig;
  private searchCache: Map<string, SearchResult[]>;
  private cacheMaxSize: number;
  private cacheTTL: number; // Time to live in milliseconds

  constructor(
    embeddingService: EmbeddingService,
    vectorDatabase: VectorDatabase,
    config: RAGEngineConfig
  ) {
    super();
    this.embeddingService = embeddingService;
    this.vectorDatabase = vectorDatabase;
    this.config = config;
    this.searchCache = new Map();
    this.cacheMaxSize = 1000;
    this.cacheTTL = 5 * 60 * 1000; // 5 minutes

    // Setup cache cleanup interval
    setInterval(() => this.cleanupCache(), this.cacheTTL);
  }

  /**
   * Perform semantic search
   */
  async search(
    query: SearchQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const startTime = Date.now();
    this.emit('search:start', { query, options });

    try {
      // Generate cache key
      const cacheKey = this.generateCacheKey(query, options);

      // Check cache first
      const cachedResults = this.getCachedResults(cacheKey);
      if (cachedResults && !options.skipCache) {
        this.emit('search:cached', { query, resultCount: cachedResults.length });
        return cachedResults;
      }

      // Generate query embedding
      const queryEmbedding = await this.embeddingService.generateEmbedding(query.text);

      // Perform vector search
      const vectorResults = await this.vectorDatabase.search(queryEmbedding, {
        topK: options.maxResults || this.config.maxRetrievedDocuments,
        includeMetadata: true,
        filter: this.buildSearchFilter(query.filters),
        namespace: options.namespace
      });

      // Rank and refine results
      let rankedResults = await this.rankResults(vectorResults, query, options);

      // Apply additional filtering and processing
      rankedResults = await this.postProcessResults(rankedResults, query, options);

      // Calculate search statistics
      const searchTime = Date.now() - startTime;
      const resultsWithMetadata = rankedResults.map((result, index) => ({
        ...result,
        rank: index + 1,
        searchTime,
        query: query.text
      }));

      // Cache results
      this.cacheResults(cacheKey, resultsWithMetadata);

      this.emit('search:complete', {
        query,
        resultCount: resultsWithMetadata.length,
        searchTime
      });

      return resultsWithMetadata;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown search error';

      this.emit('search:error', { query, error: errorMessage });
      throw new Error(`Search failed: ${errorMessage}`);
    }
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    query: SearchQuery,
    options: SearchOptions & {
      semanticWeight?: number; // Weight for semantic search (0-1)
      keywordWeight?: number;  // Weight for keyword search (0-1)
    } = {}
  ): Promise<SearchResult[]> {
    const semanticWeight = options.semanticWeight || 0.7;
    const keywordWeight = options.keywordWeight || 0.3;

    // Perform semantic search
    const semanticResults = await this.search(query, {
      ...options,
      maxResults: Math.ceil((options.maxResults || 10) * 1.5) // Get more results for re-ranking
    });

    // Perform keyword search
    const keywordResults = await this.keywordSearch(query, options);

    // Combine and re-rank results
    const combinedResults = this.combineHybridResults(
      semanticResults,
      keywordResults,
      semanticWeight,
      keywordWeight
    );

    return combinedResults.slice(0, options.maxResults || 10);
  }

  /**
   * Multi-query search for complex queries
   */
  async multiQuerySearch(
    queries: SearchQuery[],
    options: SearchOptions & {
      fusionMethod?: 'rrf' | 'weighted' | 'reciprocal'; // Result fusion methods
    } = {}
  ): Promise<SearchResult[]> {
    const fusionMethod = options.fusionMethod || 'rrf';

    // Perform individual searches
    const searchPromises = queries.map(query => this.search(query, options));
    const allResults = await Promise.all(searchPromises);

    // Fuse results based on selected method
    switch (fusionMethod) {
      case 'rrf':
        return this.reciprocalRankFusion(allResults);
      case 'weighted':
        return this.weightedFusion(allResults, queries);
      case 'reciprocal':
        return this.reciprocalFusion(allResults);
      default:
        return allResults.flat().slice(0, options.maxResults || 10);
    }
  }

  /**
   * Context-aware search using conversation history
   */
  async contextualSearch(
    query: SearchQuery,
    conversationHistory: string[],
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Expand query with context from conversation history
    const contextualQuery = this.expandQueryWithContext(query, conversationHistory);

    // Perform search with expanded query
    const results = await this.search(contextualQuery, {
      ...options,
      maxResults: (options.maxResults || 10) * 1.2 // Get more results for context filtering
    });

    // Re-rank results based on contextual relevance
    return this.rerankByContext(results, query, conversationHistory);
  }

  /**
   * Search for similar documents
   */
  async findSimilarDocuments(
    documentId: string,
    options: {
      maxResults?: number;
      similarityThreshold?: number;
      excludeCurrent?: boolean;
    } = {}
  ): Promise<SearchResult[]> {
    // Get document embedding
    const document = await this.vectorDatabase.get(documentId);
    if (!document) {
      throw new Error(`Document ${documentId} not found`);
    }

    // Search for similar vectors
    const similarResults = await this.vectorDatabase.search(document.embedding, {
      topK: options.maxResults || 10,
      includeMetadata: true,
      excludeIds: options.excludeCurrent ? [documentId] : undefined
    });

    // Filter by similarity threshold
    const filteredResults = similarResults
      .filter(result =>
        !options.similarityThreshold || result.score >= options.similarityThreshold
      )
      .map(result => this.convertVectorResult(result));

    return filteredResults;
  }

  /**
   * Real-time search with streaming results
   */
  async *streamSearch(
    query: SearchQuery,
    options: SearchOptions = {}
  ): AsyncGenerator<SearchResult[]> {
    const batchSize = options.batchSize || 5;
    const maxResults = options.maxResults || 20;

    let offset = 0;
    let hasMore = true;

    while (hasMore && offset < maxResults) {
      const batchResults = await this.search(query, {
        ...options,
        maxResults: batchSize,
        offset
      });

      if (batchResults.length === 0) {
        hasMore = false;
      } else {
        yield batchResults;
        offset += batchResults.length;
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  /**
   * Keyword-based search fallback
   */
  private async keywordSearch(
    query: SearchQuery,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    // Extract keywords from query
    const keywords = this.extractKeywords(query.text);

    // Build filter for keyword search
    const keywordFilter = {
      should: keywords.map(keyword => ({
        field: 'content',
        operator: 'contains',
        value: keyword
      }))
    };

    // Perform metadata-based search
    const results = await this.vectorDatabase.search([], {
      topK: options.maxResults || 10,
      includeMetadata: true,
      filter: keywordFilter
    });

    return results.map(result => this.convertVectorResult(result));
  }

  /**
   * Rank search results using multiple algorithms
   */
  private async rankResults(
    vectorResults: VectorSearchResult[],
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    const algorithm = options.rankingAlgorithm || SearchRankingAlgorithm.SEMANTIC;

    switch (algorithm) {
      case SearchRankingAlgorithm.SEMANTIC:
        return this.rankBySemanticSimilarity(vectorResults, query);

      case SearchRankingAlgorithm.BM25:
        return this.rankByBM25(vectorResults, query);

      case SearchRankingAlgorithm.TF_IDF:
        return this.rankByTFIDF(vectorResults, query);

      case SearchRankingAlgorithm.LEARNING_TO_RANK:
        return this.rankByLearningToRank(vectorResults, query);

      default:
        return this.rankBySemanticSimilarity(vectorResults, query);
    }
  }

  /**
   * Rank by semantic similarity
   */
  private rankBySemanticSimilarity(
    vectorResults: VectorSearchResult[],
    query: SearchQuery
  ): SearchResult[] {
    return vectorResults
      .map(result => this.convertVectorResult(result))
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Rank by BM25 algorithm
   */
  private rankByBM25(
    vectorResults: VectorSearchResult[],
    query: SearchQuery
  ): SearchResult[] {
    const k1 = 1.2; // Controls non-linear term frequency normalization
    const b = 0.75; // Controls degree of document length normalization

    return vectorResults
      .map(result => {
        const searchResult = this.convertVectorResult(result);
        const bm25Score = this.calculateBM25Score(query.text, searchResult.content, k1, b);
        return {
          ...searchResult,
          score: bm25Score
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Rank by TF-IDF
   */
  private rankByTFIDF(
    vectorResults: VectorSearchResult[],
    query: SearchQuery
  ): SearchResult[] {
    return vectorResults
      .map(result => {
        const searchResult = this.convertVectorResult(result);
        const tfidfScore = this.calculateTFIDFScore(query.text, searchResult.content);
        return {
          ...searchResult,
          score: tfidfScore
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Learning to rank (simplified version)
   */
  private rankByLearningToRank(
    vectorResults: VectorSearchResult[],
    query: SearchQuery
  ): SearchResult[] {
    // Simplified learning-to-rank using multiple features
    return vectorResults
      .map(result => {
        const searchResult = this.convertVectorResult(result);

        // Extract features
        const features = {
          semanticSimilarity: searchResult.score,
          textLength: searchResult.content.length,
          keywordOverlap: this.calculateKeywordOverlap(query.text, searchResult.content),
          positionScore: 1 / (searchResult.metadata.chunkIndex || 1),
          freshnessScore: this.calculateFreshnessScore(searchResult.metadata)
        };

        // Simple linear combination of features (in real implementation, use trained model)
        const finalScore =
          features.semanticSimilarity * 0.4 +
          features.keywordOverlap * 0.2 +
          features.positionScore * 0.2 +
          features.freshnessScore * 0.1 +
          (features.textLength > 100 && features.textLength < 1000 ? 0.1 : 0);

        return {
          ...searchResult,
          score: finalScore
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Post-process search results
   */
  private async postProcessResults(
    results: SearchResult[],
    query: SearchQuery,
    options: SearchOptions
  ): Promise<SearchResult[]> {
    let processedResults = results;

    // Apply diversity filtering
    if (options.diversifyResults) {
      processedResults = this.diversifyResults(processedResults);
    }

    // Remove duplicates
    processedResults = this.removeDuplicates(processedResults);

    // Apply relevance threshold
    if (options.minRelevanceScore) {
      processedResults = processedResults.filter(
        result => result.score >= options.minRelevanceScore!
      );
    }

    // Limit to max results
    if (options.maxResults) {
      processedResults = processedResults.slice(0, options.maxResults);
    }

    return processedResults;
  }

  /**
   * Diversify search results to avoid redundancy
   */
  private diversifyResults(results: SearchResult[]): SearchResult[] {
    const diversified: SearchResult[] = [];
    const seenTopics = new Set<string>();

    for (const result of results) {
      const topic = this.extractTopic(result.content);

      if (!seenTopics.has(topic)) {
        diversified.push(result);
        seenTopics.add(topic);
      }
    }

    return diversified;
  }

  /**
   * Remove duplicate results
   */
  private removeDuplicates(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const result of results) {
      const contentHash = this.hashContent(result.content);
      if (!seen.has(contentHash)) {
        seen.add(contentHash);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Combine hybrid search results
   */
  private combineHybridResults(
    semanticResults: SearchResult[],
    keywordResults: SearchResult[],
    semanticWeight: number,
    keywordWeight: number
  ): SearchResult[] {
    const combinedMap = new Map<string, SearchResult>();

    // Add semantic results
    semanticResults.forEach(result => {
      const key = result.id;
      combinedMap.set(key, {
        ...result,
        score: result.score * semanticWeight
      });
    });

    // Add keyword results and merge scores
    keywordResults.forEach(result => {
      const key = result.id;
      const existing = combinedMap.get(key);

      if (existing) {
        existing.score += result.score * keywordWeight;
      } else {
        combinedMap.set(key, {
          ...result,
          score: result.score * keywordWeight
        });
      }
    });

    return Array.from(combinedMap.values())
      .sort((a, b) => b.score - a.score);
  }

  /**
   * Reciprocal rank fusion
   */
  private reciprocalRankFusion(allResults: SearchResult[][]): SearchResult[] {
    const k = 60; // Fusion parameter
    const fusedScores = new Map<string, number>();
    const fusedResults = new Map<string, SearchResult>();

    allResults.forEach((results, queryIndex) => {
      results.forEach((result, rank) => {
        const score = 1 / (k + rank + 1);
        const existingScore = fusedScores.get(result.id) || 0;

        fusedScores.set(result.id, existingScore + score);
        fusedResults.set(result.id, result);
      });
    });

    return Array.from(fusedResults.entries())
      .sort((a, b) => fusedScores.get(b[0])! - fusedScores.get(a[0])!)
      .map(([id, result]) => ({
        ...result,
        score: fusedScores.get(id)!
      }));
  }

  /**
   * Weighted fusion of results
   */
  private weightedFusion(allResults: SearchResult[][], queries: SearchQuery[]): SearchResult[] {
    const weights = queries.map((_, index) => 1 / queries.length); // Equal weights
    const combinedScores = new Map<string, number>();
    const combinedResults = new Map<string, SearchResult>();

    allResults.forEach((results, queryIndex) => {
      results.forEach(result => {
        const weightedScore = result.score * weights[queryIndex];
        const existingScore = combinedScores.get(result.id) || 0;

        combinedScores.set(result.id, existingScore + weightedScore);
        combinedResults.set(result.id, result);
      });
    });

    return Array.from(combinedResults.entries())
      .sort((a, b) => combinedScores.get(b[0])! - combinedScores.get(a[0])!)
      .map(([id, result]) => ({
        ...result,
        score: combinedScores.get(id)!
      }));
  }

  /**
   * Reciprocal fusion (simplified)
   */
  private reciprocalFusion(allResults: SearchResult[][]): SearchResult[] {
    return allResults.flat()
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);
  }

  /**
   * Expand query with conversation context
   */
  private expandQueryWithContext(query: SearchQuery, conversationHistory: string[]): SearchQuery {
    if (conversationHistory.length === 0) {
      return query;
    }

    // Extract key terms from recent conversation
    const recentContext = conversationHistory.slice(-3).join(' ');
    const contextKeywords = this.extractKeywords(recentContext);
    const queryKeywords = this.extractKeywords(query.text);

    // Combine and deduplicate keywords
    const allKeywords = [...new Set([...contextKeywords, ...queryKeywords])];

    // Create expanded query
    const expandedText = allKeywords.join(' ');

    return {
      ...query,
      text: expandedText,
      originalText: query.text
    };
  }

  /**
   * Re-rank results by contextual relevance
   */
  private rerankByContext(
    results: SearchResult[],
    originalQuery: SearchQuery,
    conversationHistory: string[]
  ): SearchResult[] {
    const context = conversationHistory.join(' ');

    return results
      .map(result => {
        const contextRelevance = this.calculateContextRelevance(result.content, context);
        return {
          ...result,
          score: result.score * 0.7 + contextRelevance * 0.3
        };
      })
      .sort((a, b) => b.score - a.score);
  }

  // Helper methods for ranking and scoring

  private calculateBM25Score(query: string, document: string, k1: number, b: number): number {
    const queryTerms = this.extractKeywords(query);
    const docTerms = this.extractKeywords(document);
    const docLength = docTerms.length;
    const avgDocLength = 100; // Estimated average document length

    let score = 0;
    queryTerms.forEach(term => {
      const tf = this.countTermFrequency(term, docTerms);
      const idf = this.calculateIDF(term);
      const numerator = tf * (k1 + 1);
      const denominator = tf + k1 * (1 - b + b * (docLength / avgDocLength));
      score += idf * (numerator / denominator);
    });

    return score;
  }

  private calculateTFIDFScore(query: string, document: string): number {
    const queryTerms = this.extractKeywords(query);
    const docTerms = this.extractKeywords(document);

    return queryTerms.reduce((score, term) => {
      const tf = this.countTermFrequency(term, docTerms);
      const idf = this.calculateIDF(term);
      return score + tf * idf;
    }, 0);
  }

  private countTermFrequency(term: string, terms: string[]): number {
    return terms.filter(t => t === term).length;
  }

  private calculateIDF(term: string): number {
    // Simplified IDF calculation
    return Math.log(1 + 1000 / (1 + 1)); // Assuming corpus size of 1000 docs
  }

  private calculateKeywordOverlap(query: string, document: string): number {
    const queryKeywords = this.extractKeywords(query);
    const docKeywords = this.extractKeywords(document);

    const intersection = queryKeywords.filter(keyword =>
      docKeywords.includes(keyword)
    );

    return intersection.length / queryKeywords.length;
  }

  private calculateFreshnessScore(metadata: any): number {
    if (!metadata.createdAt) return 0.5;

    const now = new Date().getTime();
    const created = new Date(metadata.createdAt).getTime();
    const daysSinceCreation = (now - created) / (1000 * 60 * 60 * 24);

    // Decay over 30 days
    return Math.max(0, 1 - daysSinceCreation / 30);
  }

  private extractKeywords(text: string): string[] {
    return text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2);
  }

  private extractTopic(content: string): string {
    const sentences = content.split(/[.!?]+/);
    if (sentences.length === 0) return '';

    return sentences[0].toLowerCase().split(/\s+/).slice(0, 3).join(' ');
  }

  private hashContent(content: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString();
  }

  private calculateContextRelevance(content: string, context: string): number {
    const contentKeywords = this.extractKeywords(content);
    const contextKeywords = this.extractKeywords(context);

    const intersection = contentKeywords.filter(keyword =>
      contextKeywords.includes(keyword)
    );

    return intersection.length / Math.max(contentKeywords.length, 1);
  }

  private convertVectorResult(vectorResult: VectorSearchResult): SearchResult {
    return {
      id: vectorResult.id,
      documentId: vectorResult.metadata?.documentId || '',
      content: vectorResult.metadata?.content || '',
      score: vectorResult.score,
      metadata: vectorResult.metadata,
      documentTitle: vectorResult.metadata?.documentTitle,
      documentSource: vectorResult.metadata?.documentSource,
      url: vectorResult.metadata?.url,
      author: vectorResult.metadata?.author,
      publishedAt: vectorResult.metadata?.publishedAt,
      tags: vectorResult.metadata?.tags || [],
      language: vectorResult.metadata?.language,
      mimeType: vectorResult.metadata?.mimeType,
      chunkIndex: vectorResult.metadata?.chunkIndex,
      totalChunks: vectorResult.metadata?.totalChunks
    };
  }

  private buildSearchFilter(filters?: SearchFilters): any {
    if (!filters) return undefined;

    const filter: any = {};

    if (filters.documentTypes?.length) {
      filter.documentType = { in: filters.documentTypes };
    }

    if (filters.authors?.length) {
      filter.author = { in: filters.authors };
    }

    if (filters.dateRange) {
      filter.createdAt = {
        gte: filters.dateRange.start,
        lte: filters.dateRange.end
      };
    }

    if (filters.tags?.length) {
      filter.tags = { in: filters.tags };
    }

    if (filters.language) {
      filter.language = { eq: filters.language };
    }

    return Object.keys(filter).length > 0 ? filter : undefined;
  }

  private generateCacheKey(query: SearchQuery, options: SearchOptions): string {
    return `${query.text}:${JSON.stringify(options)}:${Date.now()}`;
  }

  private getCachedResults(key: string): SearchResult[] | null {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached[0].timestamp < this.cacheTTL) {
      return cached;
    }
    return null;
  }

  private cacheResults(key: string, results: SearchResult[]): void {
    // Add timestamp to results for cache validation
    const resultsWithTimestamp = results.map(result => ({
      ...result,
      timestamp: Date.now()
    }));

    this.searchCache.set(key, resultsWithTimestamp);

    // Remove oldest entries if cache is full
    if (this.searchCache.size > this.cacheMaxSize) {
      const oldestKey = this.searchCache.keys().next().value;
      this.searchCache.delete(oldestKey);
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, results] of this.searchCache.entries()) {
      if (now - results[0].timestamp > this.cacheTTL) {
        this.searchCache.delete(key);
      }
    }
  }
}
