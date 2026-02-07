import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  RAGEngineService,
  DocumentProcessor,
  SemanticSearchEngine,
  ResponseGenerator,
  ContextBuilder,
  EmbeddingService,
  VectorDatabase,
} from '@repo/rag';
import { RAGQuery, RAGResponse, ProcessedDocument } from '@repo/rag/interfaces';
import { createOpenAIEmbeddingService } from '@repo/rag/services/embedding-service';
import { createPineconeVectorDatabase } from '@repo/rag/services/pinecone-provider';

@Injectable()
export class RAGService implements OnModuleInit {
  private readonly logger = new Logger(RAGService.name);
  private ragEngine: RAGEngineService;

  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    await this.initializeRAGEngine();
  }

  private async initializeRAGEngine() {
    try {
      this.logger.log('Initializing RAG Engine...');

      // Initialize services
      const embeddingService = await this.createEmbeddingService();
      const vectorDatabase = await this.createVectorDatabase();
      const documentProcessor = await this.createDocumentProcessor();
      const searchEngine = await this.createSearchEngine(embeddingService, vectorDatabase);
      const contextBuilder = await this.createContextBuilder();
      const responseGenerator = await this.createResponseGenerator();

      // Create RAG engine
      this.ragEngine = new RAGEngineService(
        documentProcessor,
        searchEngine,
        responseGenerator,
        contextBuilder,
        embeddingService,
        vectorDatabase,
        this.getRAGEngineConfig()
      );

      this.logger.log('RAG Engine initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize RAG Engine', error);
      throw error;
    }
  }

  /**
   * Query the RAG system
   */
  async query(queryData: {
    text: string;
    filters?: Record<string, any>;
    maxResults?: number;
    temperature?: number;
  }): Promise<RAGResponse> {
    try {
      const query: RAGQuery = {
        text: queryData.text,
        filters: queryData.filters,
        options: {
          maxResults: queryData.maxResults || 5,
          temperature: queryData.temperature || 0.7,
        },
      };

      return await this.ragEngine.query(query);
    } catch (error) {
      this.logger.error('RAG query failed', error);
      throw error;
    }
  }

  /**
   * Index documents from a code repository
   */
  async indexRepository(repoData: {
    repositoryPath: string;
    filePatterns?: string[];
    excludePatterns?: string[];
    metadata?: Record<string, any>;
  }): Promise<{ indexedFiles: number; errors: string[] }> {
    try {
      this.logger.log(`Indexing repository: ${repoData.repositoryPath}`);

      const documents = await this.processRepository(repoData);
      await this.ragEngine.addDocuments(documents);

      this.logger.log(`Successfully indexed ${documents.length} documents`);
      return {
        indexedFiles: documents.length,
        errors: [],
      };
    } catch (error) {
      this.logger.error('Repository indexing failed', error);
      return {
        indexedFiles: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      };
    }
  }

  /**
   * Index a single file
   */
  async indexFile(fileData: {
    filePath: string;
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<void> {
    try {
      const document = await this.processFile(fileData);
      await this.ragEngine.addDocuments([document]);

      this.logger.log(`Successfully indexed file: ${fileData.filePath}`);
    } catch (error) {
      this.logger.error(`Failed to index file: ${fileData.filePath}`, error);
      throw error;
    }
  }

  /**
   * Get conversation history
   */
  getConversationHistory(limit?: number) {
    return this.ragEngine.getConversationHistory(limit);
  }

  /**
   * Clear conversation history
   */
  clearConversationHistory(): void {
    this.ragEngine.clearConversationHistory();
  }

  /**
   * Get system statistics
   */
  async getStatistics() {
    return this.ragEngine.getStatistics();
  }

  /**
   * Search documents without generation (for retrieval only)
   */
  async search(searchData: {
    query: string;
    filters?: Record<string, any>;
    maxResults?: number;
  }): Promise<any[]> {
    try {
      const response = await this.query({
        text: searchData.query,
        filters: searchData.filters,
        maxResults: searchData.maxResults || 10,
      });

      return response.sources.map(source => ({
        id: source.id,
        title: source.title,
        content: source.snippet,
        url: source.url,
        relevanceScore: source.relevanceScore,
      }));
    } catch (error) {
      this.logger.error('Document search failed', error);
      throw error;
    }
  }

  /**
   * Delete documents from the RAG system
   */
  async deleteDocuments(documentIds: string[]): Promise<void> {
    try {
      await this.ragEngine.deleteDocuments(documentIds);
      this.logger.log(`Deleted ${documentIds.length} documents`);
    } catch (error) {
      this.logger.error('Document deletion failed', error);
      throw error;
    }
  }

  /**
   * Get RAG system status
   */
  async getStatus() {
    try {
      const stats = await this.getStatistics();
      return {
        status: 'active',
        message: 'RAG service is running',
        statistics: stats,
        capabilities: {
          query: true,
          indexing: true,
          search: true,
          conversationHistory: true,
          codeAwareness: true,
        },
      };
    } catch (error) {
      return {
        status: 'error',
        message: 'RAG service is unavailable',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Private helper methods

  private async createEmbeddingService(): Promise<EmbeddingService> {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const model = this.configService.get<string>('RAG_EMBEDDING_MODEL', 'text-embedding-3-small');

    return createOpenAIEmbeddingService({
      apiKey,
      model,
      dimension: 1536,
      batchSize: 100,
      cache: true,
    });
  }

  private async createVectorDatabase(): Promise<VectorDatabase> {
    const apiKey = this.configService.get<string>('PINECONE_API_KEY');
    const environment = this.configService.get<string>('PINECONE_ENVIRONMENT');
    const indexName = this.configService.get<string>('PINECONE_INDEX_NAME', 'claude-code-index');

    return createPineconeVectorDatabase({
      apiKey,
      environment,
      indexName,
      dimension: 1536,
      metric: 'cosine',
    });
  }

  private async createDocumentProcessor(): Promise<DocumentProcessor> {
    // Import and create document processor
    const { DocumentProcessorService } = await import('@repo/rag/services/document-processor');
    return new DocumentProcessorService({
      chunkingStrategy: 'semantic',
      chunkSize: 1000,
      chunkOverlap: 200,
      maxChunkSize: 2000,
      extractMetadata: true,
      detectLanguage: true,
      extractEntities: true,
    });
  }

  private async createSearchEngine(
    embeddingService: EmbeddingService,
    vectorDatabase: VectorDatabase
  ): Promise<SemanticSearchEngine> {
    const { SemanticSearchService } = await import('@repo/rag/services/semantic-search');
    return new SemanticSearchService(embeddingService, vectorDatabase);
  }

  private async createContextBuilder(): Promise<ContextBuilder> {
    const { ContextBuilderService } = await import('@repo/rag/services/context-builder');
    return new ContextBuilderService({
      maxContextLength: 8000,
      prioritizeRecency: true,
      includeMetadata: true,
    });
  }

  private async createResponseGenerator(): Promise<ResponseGenerator> {
    const { ResponseGeneratorService } = await import('@repo/rag/services/response-generator');
    return new ResponseGeneratorService({
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      includeCitations: true,
      includeFollowUpQuestions: true,
    });
  }

  private getRAGEngineConfig() {
    return {
      maxRetrievedDocuments: 10,
      maxContextLength: 8000,
      maxConversationHistory: 10,
      defaultRankingAlgorithm: 'semantic',
      chunkSize: 1000,
      chunkOverlap: 200,
      llmConfig: {
        model: 'gpt-4',
        temperature: 0.7,
        maxTokens: 2000,
      },
    };
  }

  private async processRepository(repoData: {
    repositoryPath: string;
    filePatterns?: string[];
    excludePatterns?: string[];
    metadata?: Record<string, any>;
  }): Promise<ProcessedDocument[]> {
    try {
      // Import repository processor
      const { RepositoryProcessorService } = await import('@repo/rag/services/repository-processor');
      const processor = new RepositoryProcessorService({
        includePatterns: repoData.filePatterns,
        excludePatterns: repoData.excludePatterns,
        extractGitMetadata: true,
        followSymlinks: false
      });

      this.logger.log(`Processing repository: ${repoData.repositoryPath}`);

      const result = await processor.processRepository(repoData.repositoryPath);

      this.logger.log(`Repository processing completed:
        - Total files: ${result.totalFiles}
        - Processed: ${result.processedFiles}
        - Skipped: ${result.skippedFiles}
        - Errors: ${result.errorFiles}
        - Documents generated: ${result.documents.length}`);

      if (result.errors.length > 0) {
        this.logger.warn(`Processing errors: ${result.errors.length}`, result.errors.slice(0, 5));
      }

      return result.documents;
    } catch (error) {
      this.logger.error('Repository processing failed', error);
      throw error;
    }
  }

  private async processFile(fileData: {
    filePath: string;
    content?: string;
    metadata?: Record<string, any>;
  }): Promise<ProcessedDocument> {
    try {
      // Import repository processor for file processing
      const { RepositoryProcessorService } = await import('@repo/rag/services/repository-processor');
      const processor = new RepositoryProcessorService({
        extractGitMetadata: true,
        followSymlinks: false
      });

      this.logger.log(`Processing file: ${fileData.filePath}`);

      const document = await processor.processFile(fileData.filePath, {
        content: fileData.content,
        metadata: fileData.metadata as any
      });

      if (!document) {
        throw new Error('File processing returned no document');
      }

      this.logger.log(`File processing completed: ${document.chunks.length} chunks generated`);
      return document;
    } catch (error) {
      this.logger.error(`File processing failed: ${fileData.filePath}`, error);
      throw error;
    }
  }
}
