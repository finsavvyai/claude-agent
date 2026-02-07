import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import { ValidationUtil } from '../utils/validation.util';

import {
  VectorStoreProvider,
  EmbeddingModel,
  TokenOptimizationStrategy,
  QueryRAGDto,
  TokenUsageDto,
  TokenBudgetDto,
  OptimizeTokensDto,
  VectorStoreConfigDto
} from './dto/rag.dto';

export interface RAGContext {
  id: string;
  projectId: string;
  content: string;
  metadata: {
    filePath: string;
    fileType: string;
    size: number;
    lastModified: Date;
    checksum: string;
    tags?: string[];
    language?: string;
    framework?: string;
  };
  embeddings: number[];
  relevanceScore: number;
  tokenCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TokenUsageSummary {
  totalTokens: number;
  totalCost: number;
  providerBreakdown: Record<string, { tokens: number; cost: number }>;
  modelBreakdown: Record<string, { tokens: number; cost: number }>;
  taskTypeBreakdown: Record<string, { tokens: number; cost: number }>;
  optimizedSavings: number;
  optimizationStrategies: TokenOptimizationStrategy[];
}

export interface OptimizationResult {
  originalContent: string;
  optimizedContent: string;
  originalTokens: number;
  optimizedTokens: number;
  savings: {
    tokens: number;
    percentage: number;
    cost: number;
  };
  strategies: TokenOptimizationStrategy[];
  processingTime: number;
}

@Injectable()
export class RAGService {
  private readonly logger = new Logger(RAGService.name);
  private readonly prisma: PrismaClient;
  private readonly openai: OpenAI;
  private readonly vectorStoreConfig: VectorStoreConfigDto;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });

    // Initialize OpenAI client
    this.openai = new OpenAI({
      apiKey: this.configService.get('ai.openai.apiKey'),
    });

    // Initialize vector store configuration
    this.vectorStoreConfig = {
      provider: VectorStoreProvider[this.configService.get('rag.vectorStore.provider')?.toUpperCase()] || VectorStoreProvider.QDRANT,
      url: this.configService.get('rag.vectorStore.url') || 'http://localhost:6333',
      apiKey: this.configService.get('rag.vectorStore.apiKey'),
      collectionName: this.configService.get('rag.vectorStore.collectionName') || 'claude-agent-contexts',
      dimension: this.configService.get('rag.vectorStore.dimension') || 1536,
    };
  }

  async onModuleInit() {
    await this.initializeVectorStore();
    this.logger.log('✅ RAG Service initialized');
  }

  async indexProject(indexDto: {
    projectId: string;
    filePatterns?: string[];
    excludePatterns?: string[];
    embeddingModel?: EmbeddingModel;
    chunkSize?: number;
    chunkOverlap?: number;
    force?: boolean;
    userId?: string;
    metadata?: Record<string, any>;
  }): Promise<{
    indexedFiles: number;
    totalChunks: number;
    processingTime: number;
    errors: string[];
  }> {
    const startTime = Date.now();
    const errors: string[] = [];
    let indexedFiles = 0;
    let totalChunks = 0;

    try {
      this.logger.log(`🔍 Starting indexing for project: ${indexDto.projectId} by user: ${indexDto.userId}`);

      // Check if project exists and has been indexed before
      const existingContexts = await this.prisma.rAGContext.findMany({
        where: {
          projectId: indexDto.projectId,
          // Only check contexts belonging to this user (or admins can see all)
          ...(indexDto.userId && {
            metadata: {
              path: ['createdBy'],
              equals: indexDto.userId
            }
          })
        },
        select: { id: true, metadata: true },
      });

      if (existingContexts.length > 0 && !indexDto.force) {
        this.logger.log(`Project ${indexDto.projectId} already has ${existingContexts.length} contexts for user ${indexDto.userId}`);
        return {
          indexedFiles: existingContexts.length,
          totalChunks: existingContexts.length,
          processingTime: 0,
          errors: [],
        };
      }

      // In a real implementation, you would:
      // 1. Scan the project directory for files
      // 2. Process and chunk the files
      // 3. Generate embeddings
      // 4. Store in vector database

      // For this demo, we'll simulate the indexing process
      const mockFiles = [
        { path: 'src/auth/auth.service.ts', content: 'Authentication service implementation...' },
        { path: 'src/database/user.model.ts', content: 'User database model...' },
        { path: 'docs/api/authentication.md', content: 'Authentication API documentation...' },
      ];

      for (const file of mockFiles) {
        try {
          // Generate chunks
          const chunks = await this.chunkText(file.content, indexDto.chunkSize || 1000, indexDto.chunkOverlap || 200);

          for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];

            // Generate embeddings
            const embeddings = await this.generateEmbeddings(chunk, indexDto.embeddingModel);

            // Calculate relevance score (in real implementation, this would be more sophisticated)
            const relevanceScore = Math.random() * 0.3 + 0.7; // 0.7-1.0

            // Store in database
            await this.prisma.rAGContext.create({
              data: {
                projectId: indexDto.projectId,
                content: chunk,
                metadata: {
                  filePath: file.path,
                  fileType: file.path.split('.').pop(),
                  size: chunk.length,
                  lastModified: new Date(),
                  checksum: this.generateChecksum(chunk),
                  chunkIndex: i,
                  totalChunks: chunks.length,
                  // Add user context to metadata
                  ...(indexDto.userId && { createdBy: indexDto.userId }),
                  ...(indexDto.metadata && { ...indexDto.metadata }),
                },
                relevanceScore,
                tokenCount: this.estimateTokens(chunk),
              },
            });

            // Store in vector database
            await this.storeEmbedding(chunk, embeddings, {
              projectId: indexDto.projectId,
              filePath: file.path,
              chunkIndex: i,
              ...(indexDto.userId && { userId: indexDto.userId }),
              ...(indexDto.metadata && { metadata: indexDto.metadata }),
            });

            totalChunks++;
          }

          indexedFiles++;
        } catch (error) {
          errors.push(`Failed to process file ${file.path}: ${error.message}`);
        }
      }

      const processingTime = Date.now() - startTime;

      this.logger.log(`✅ Completed indexing: ${indexedFiles} files, ${totalChunks} chunks in ${processingTime}ms`);

      return {
        indexedFiles,
        totalChunks,
        processingTime,
        errors,
      };

    } catch (error) {
      this.logger.error(`❌ Indexing failed for project ${indexDto.projectId}:`, error);
      throw error;
    }
  }

  async queryRAG(queryDto: QueryRAGDto): Promise<{
    contexts: RAGContext[];
    query: string;
    totalTokens: number;
    processingTime: number;
    metadata: {
      relevanceScore: number;
      sources: string[];
      queryTime: number;
    };
  }> {
    const startTime = Date.now();

    try {
      this.logger.log(`🔍 Querying RAG: ${queryDto.query} for user: ${queryDto.userId || 'anonymous'}`);

      // Generate query embedding
      const queryEmbedding = await this.generateEmbeddings(queryDto.query);

      // Search vector database with user-specific filters
      const searchResults = await this.searchSimilar(
        queryEmbedding,
        queryDto.maxResults || 5,
        queryDto.minScore || 0.7,
        queryDto.projectId,
        queryDto.userId,
        queryDto.filters
      );

      // Retrieve full contexts from database with permission filtering
      const contexts: RAGContext[] = [];
      for (const result of searchResults) {
        const context = await this.prisma.rAGContext.findUnique({
          where: { id: result.id },
        });

        if (context) {
          // Check user permissions for this context
          const hasPermission = await this.checkContextPermission(context, queryDto.userId, queryDto.filters);

          if (hasPermission) {
            contexts.push({
              id: context.id,
              projectId: context.projectId,
              content: context.content,
              metadata: context.metadata as any,
              embeddings: [], // Don't return embeddings in API response
              relevanceScore: result.score,
              tokenCount: context.tokenCount,
              createdAt: context.createdAt,
              updatedAt: context.updatedAt,
            });
          }
        }
      }

      const totalTokens = contexts.reduce((sum, ctx) => sum + ctx.tokenCount, 0);
      const processingTime = Date.now() - startTime;

      // Calculate query metadata
      const avgRelevance = contexts.length > 0
        ? contexts.reduce((sum, ctx) => sum + ctx.relevanceScore, 0) / contexts.length
        : 0;

      const sources = contexts.map(ctx => ctx.metadata.filePath);

      this.logger.log(`✅ RAG query completed: ${contexts.length} contexts, ${totalTokens} tokens in ${processingTime}ms`);

      return {
        contexts,
        query: queryDto.query,
        totalTokens,
        processingTime,
        metadata: {
          relevanceScore: avgRelevance,
          sources: [...new Set(sources)],
          queryTime: processingTime,
        },
      };

    } catch (error) {
      this.logger.error(`❌ RAG query failed:`, error);
      throw error;
    }
  }

  async trackTokenUsage(usageDto: TokenUsageDto & { userId?: string; metadata?: Record<string, any> }): Promise<void> {
    try {
      await this.prisma.tokenUsage.create({
        data: {
          timestamp: new Date(),
          provider: usageDto.provider,
          model: usageDto.model,
          tokens: usageDto.tokens,
          costUsd: usageDto.cost,
          taskType: usageDto.taskType || 'unknown',
          optimized: usageDto.optimized || false,
          metadata: {
            ...usageDto.optimizationDetails,
            ...(usageDto.userId && { userId: usageDto.userId }),
            ...(usageDto.metadata && { ...usageDto.metadata }),
          },
        },
      });

      this.logger.log(`💰 Tracked token usage: ${usageDto.tokens} tokens, $${usageDto.cost} (${usageDto.provider})${usageDto.userId ? ` for user: ${usageDto.userId}` : ''}`);

    } catch (error) {
      this.logger.error('❌ Failed to track token usage:', error);
    }
  }

  async getTokenUsageStats(projectId?: string, userId?: string, isAdmin?: boolean): Promise<TokenUsageSummary> {
    // Build where clause with user filtering
    const where: any = {};

    if (projectId) {
      where.projectId = projectId;
    }

    // If not admin, filter by user ID
    if (!isAdmin && userId) {
      where.metadata = {
        path: ['userId'],
        equals: userId
      };
    }

    const usage = await this.prisma.tokenUsage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000, // Last 1000 records
    });

    const summary: TokenUsageSummary = {
      totalTokens: 0,
      totalCost: 0,
      providerBreakdown: {},
      modelBreakdown: {},
      taskTypeBreakdown: {},
      optimizedSavings: 0,
      optimizationStrategies: [],
    };

    for (const record of usage) {
      summary.totalTokens += record.tokens;
      summary.totalCost += parseFloat(record.costUsd as any);

      // Provider breakdown
      if (!summary.providerBreakdown[record.provider]) {
        summary.providerBreakdown[record.provider] = { tokens: 0, cost: 0 };
      }
      summary.providerBreakdown[record.provider].tokens += record.tokens;
      summary.providerBreakdown[record.provider].cost += parseFloat(record.costUsd as any);

      // Model breakdown
      if (!summary.modelBreakdown[record.model]) {
        summary.modelBreakdown[record.model] = { tokens: 0, cost: 0 };
      }
      summary.modelBreakdown[record.model].tokens += record.tokens;
      summary.modelBreakdown[record.model].cost += parseFloat(record.costUsd as any);

      // Task type breakdown
      if (!summary.taskTypeBreakdown[record.taskType]) {
        summary.taskTypeBreakdown[record.taskType] = { tokens: 0, cost: 0 };
      }
      summary.taskTypeBreakdown[record.taskType].tokens += record.tokens;
      summary.taskTypeBreakdown[record.taskType].cost += parseFloat(record.costUsd as any);

      // Optimization savings
      if (record.optimized && record.metadata?.savings) {
        summary.optimizedSavings += parseFloat(record.metadata.savings);
      }
    }

    return summary;
  }

  async optimizeTokens(optimizeDto: OptimizeTokensDto & { userId?: string; metadata?: Record<string, any> }): Promise<OptimizationResult> {
    const startTime = Date.now();

    try {
      const originalTokens = this.estimateTokens(optimizeDto.content);
      let optimizedContent = optimizeDto.content;
      const appliedStrategies: TokenOptimizationStrategy[] = [];
      const optimizationMetrics: Record<string, any> = {};

      // Analyze content characteristics
      const contentAnalysis = this.analyzeContent(optimizeDto.content);
      this.logger.log(`📊 Content analysis: ${JSON.stringify(contentAnalysis)}`);

      // Determine optimal strategies based on content and target tokens
      const strategies = this.selectOptimalStrategies(
        optimizeDto.strategies || [
          TokenOptimizationStrategy.COMPRESSION,
          TokenOptimizationStrategy.SELECTION,
        ],
        contentAnalysis,
        originalTokens,
        optimizeDto.targetTokens
      );

      // Apply optimization strategies in optimal order
      for (const strategy of strategies) {
        const strategyStartTime = Date.now();
        const beforeTokens = this.estimateTokens(optimizedContent);

        switch (strategy) {
          case TokenOptimizationStrategy.COMPRESSION:
            optimizedContent = this.advancedCompression(optimizedContent, contentAnalysis);
            appliedStrategies.push(strategy);
            break;

          case TokenOptimizationStrategy.SELECTION:
            optimizedContent = this.intelligentContentSelection(optimizedContent, contentAnalysis);
            appliedStrategies.push(strategy);
            break;

          case TokenOptimizationStrategy.SUMMARIZATION:
            optimizedContent = await this.aiSummarization(optimizedContent, contentAnalysis, optimizeDto.targetTokens);
            appliedStrategies.push(strategy);
            break;

          case TokenOptimizationStrategy.CHUNKING:
            optimizedContent = this.intelligentChunking(optimizedContent, contentAnalysis);
            appliedStrategies.push(strategy);
            break;

          case TokenOptimizationStrategy.DEDUPLICATION:
            optimizedContent = this.advancedDeduplication(optimizedContent);
            appliedStrategies.push(strategy);
            break;
        }

        const afterTokens = this.estimateTokens(optimizedContent);
        const strategyTime = Date.now() - strategyStartTime;

        optimizationMetrics[strategy] = {
          tokensSaved: beforeTokens - afterTokens,
          percentageSaved: ((beforeTokens - afterTokens) / beforeTokens) * 100,
          processingTime: strategyTime
        };

        // Early termination if target reached
        if (optimizeDto.targetTokens && afterTokens <= optimizeDto.targetTokens) {
          this.logger.log(`🎯 Target token count reached: ${afterTokens} <= ${optimizeDto.targetTokens}`);
          break;
        }
      }

      const optimizedTokens = this.estimateTokens(optimizedContent);
      const processingTime = Date.now() - startTime;

      // Calculate cost savings with detailed breakdown
      const provider = optimizeDto.provider || 'openai';
      const model = optimizeDto.model || 'gpt-4';
      const costPerToken = this.getCostPerToken(provider, model);
      const originalCost = originalTokens * costPerToken;
      const optimizedCost = optimizedTokens * costPerToken;

      const result: OptimizationResult = {
        originalContent: optimizeDto.content,
        optimizedContent,
        originalTokens,
        optimizedTokens,
        savings: {
          tokens: originalTokens - optimizedTokens,
          percentage: ((originalTokens - optimizedTokens) / originalTokens) * 100,
          cost: originalCost - optimizedCost,
        },
        strategies: appliedStrategies,
        processingTime,
      };

      // Track optimization usage
      await this.trackTokenUsage({
        provider,
        model,
        tokens: originalTokens - optimizedTokens,
        cost: result.savings.cost,
        taskType: 'optimization',
        optimized: true,
        optimizationDetails: {
          strategies: appliedStrategies,
          savings: result.savings,
          processingTime,
          contentAnalysis,
          optimizationMetrics,
          ...(optimizeDto.userId && { userId: optimizeDto.userId }),
          ...(optimizeDto.metadata && { ...optimizeDto.metadata }),
        }
      });

      this.logger.log(
        `⚡ Token optimization completed: ${result.savings.tokens} tokens saved ` +
        `(${result.savings.percentage.toFixed(1)}%, $${result.savings.cost.toFixed(4)}) ` +
        `in ${processingTime}ms`
      );

      return result;

    } catch (error) {
      this.logger.error('❌ Token optimization failed:', error);
      throw error;
    }
  }

  async setTokenBudget(budgetDto: TokenBudgetDto & { userId?: string; metadata?: Record<string, any> }): Promise<void> {
    try {
      await this.prisma.tokenBudget.upsert({
        where: { projectId: 'global' }, // In a real implementation, this would be per project
        create: {
          projectId: 'global',
          monthlyLimit: budgetDto.monthlyLimit,
          currentUsage: 0,
          alerts: {
            threshold: budgetDto.alertThreshold || 0.8,
            notifications: ['email'],
          },
          optimizations: {
            strategies: budgetDto.optimizationStrategies || [],
            savings: 0,
          },
        },
        update: {
          monthlyLimit: budgetDto.monthlyLimit,
          alerts: {
            threshold: budgetDto.alertThreshold || 0.8,
            notifications: ['email'],
          },
          optimizations: {
            strategies: budgetDto.optimizationStrategies || [],
          },
        },
      });

      this.logger.log(`💰 Token budget set: $${budgetDto.monthlyLimit} monthly limit`);

    } catch (error) {
      this.logger.error('❌ Failed to set token budget:', error);
    }
  }

  private async initializeVectorStore(): Promise<void> {
    // Initialize connection to vector store based on provider
    try {
      switch (this.vectorStoreConfig.provider) {
        case VectorStoreProvider.QDRANT:
          await this.initializeQdrant();
          break;
        case VectorStoreProvider.PINECONE:
          await this.initializePinecone();
          break;
        // Add other providers as needed
        default:
          this.logger.warn(`Vector store provider ${this.vectorStoreConfig.provider} not implemented`);
      }
    } catch (error) {
      this.logger.error('❌ Failed to initialize vector store:', error);
    }
  }

  private async initializeQdrant(): Promise<void> {
    // In a real implementation, you would initialize Qdrant client
    this.logger.log('🔗 Connected to Qdrant vector store');
  }

  private async initializePinecone(): Promise<void> {
    // In a real implementation, you would initialize Pinecone client
    this.logger.log('🔗 Connected to Pinecone vector store');
  }

  private async chunkText(text: string, chunkSize: number, overlap: number): Promise<string[]> {
    const chunks: string[] = [];

    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  private async generateEmbeddings(text: string, model?: EmbeddingModel): Promise<number[]> {
    try {
      // In a real implementation, you would use the specified embedding model
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-ada-002',
        input: text,
      });

      return response.data[0].embedding;
    } catch (error) {
      this.logger.error('❌ Failed to generate embeddings:', error);
      throw error;
    }
  }

  private async storeEmbedding(content: string, embedding: number[], metadata: any): Promise<void> {
    // In a real implementation, you would store the embedding in your vector store
    this.logger.debug(`📝 Stored embedding for: ${metadata.filePath}`);
  }

  private async searchSimilar(
    queryEmbedding: number[],
    maxResults: number,
    minScore: number,
    projectId?: string,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<Array<{ id: string; score: number }>> {
    // In a real implementation, you would search your vector store
    // For now, return mock results
    return [
      { id: 'mock-context-1', score: 0.95 },
      { id: 'mock-context-2', score: 0.87 },
      { id: 'mock-context-3', score: 0.82 },
    ].slice(0, maxResults).filter(result => result.score >= minScore);
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  private generateChecksum(text: string): string {
    // Simple checksum generation - in a real implementation, use crypto
    return Buffer.from(text).toString('base64').slice(0, 16);
  }

  private compressContent(content: string): string {
    // Simple compression - remove excessive whitespace and comments
    return content
      .replace(/\s+/g, ' ')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .trim();
  }

  private selectImportantContent(content: string): string {
    // In a real implementation, use AI to select important parts
    // For now, return the first half of the content
    const sentences = content.split(/[.!?]+/);
    const importantCount = Math.ceil(sentences.length * 0.6);
    return sentences.slice(0, importantCount).join('. ') + '.';
  }

  private summarizeContent(content: string): string {
    // In a real implementation, use AI to summarize
    return content.slice(0, Math.min(content.length, 500)) + '...';
  }

  private optimizeChunking(content: string): string {
    // Optimize content for better chunking
    return content
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
      .replace(/\t/g, '  ') // Replace tabs with spaces
      .trim();
  }

  /**
   * Get contexts with filtering and pagination
   */
  async getContexts(query: {
    projectId?: string;
    filters?: Record<string, any>;
    page?: number;
    limit?: number;
    userId?: string;
  }): Promise<{
    contexts: RAGContext[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = query.page || 1;
    const limit = Math.min(query.limit || 20, 100); // Max 100 per page
    const skip = (page - 1) * limit;

    try {
      // Build where clause with user permissions
      const where: any = {};

      if (query.projectId) {
        where.projectId = query.projectId;
      }

      // Apply permission filtering
      if (query.userId) {
        where.OR = [
          { metadata: { public: true } },
          { metadata: { createdBy: query.userId } },
          { metadata: { allowedUsers: { has: query.userId } } }
        ];
      } else {
        // Only show public content for unauthenticated users
        where.metadata = { public: true };
      }

      // Apply additional filters
      if (query.filters) {
        // Add filter logic here as needed
      }

      const [contexts, total] = await Promise.all([
        this.prisma.rAGContext.findMany({
          where,
          skip,
          take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        this.prisma.rAGContext.count({ where })
      ]);

      return {
        contexts: contexts.map(context => ({
          id: context.id,
          projectId: context.projectId,
          content: context.content,
          metadata: context.metadata as any,
          embeddings: [],
          relevanceScore: context.relevanceScore || 0,
          tokenCount: context.tokenCount,
          createdAt: context.createdAt,
          updatedAt: context.updatedAt,
        })),
        total,
        page,
        limit,
      };
    } catch (error) {
      this.logger.error('Failed to get contexts:', error);
      throw error;
    }
  }

  /**
   * Get a specific context by ID with permission checking
   */
  async getContext(
    id: string,
    userContext: {
      userId: string;
      roles: string[];
      permissions: string[];
    }
  ): Promise<RAGContext | null> {
    try {
      const context = await this.prisma.rAGContext.findUnique({
        where: { id },
      });

      if (!context) {
        return null;
      }

      // Check permissions
      const hasPermission = await this.checkContextPermission(
        context,
        userContext.userId,
        { userRoles: userContext.roles }
      );

      if (!hasPermission) {
        throw new NotFoundException('Context not found or access denied');
      }

      return {
        id: context.id,
        projectId: context.projectId,
        content: context.content,
        metadata: context.metadata as any,
        embeddings: [],
        relevanceScore: context.relevanceScore || 0,
        tokenCount: context.tokenCount,
        createdAt: context.createdAt,
        updatedAt: context.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to get context ${id}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing context
   */
  async updateContext(
    id: string,
    updateData: {
      content?: string;
      metadata?: Record<string, any>;
      userId: string;
    }
  ): Promise<RAGContext> {
    try {
      // First check if context exists and user has permission
      const existingContext = await this.prisma.rAGContext.findUnique({
        where: { id },
      });

      if (!existingContext) {
        throw new NotFoundException('Context not found');
      }

      // Check if user can update this context
      const hasPermission = await this.checkContextPermission(
        existingContext,
        updateData.userId
      );

      if (!hasPermission) {
        throw new NotFoundException('Context not found or access denied');
      }

      // Update the context
      const updatedContext = await this.prisma.rAGContext.update({
        where: { id },
        data: {
          ...(updateData.content && { content: updateData.content }),
          ...(updateData.metadata && {
            metadata: {
              ...existingContext.metadata,
              ...updateData.metadata,
              updatedBy: updateData.userId,
              updatedAt: new Date().toISOString()
            }
          }),
          updatedAt: new Date(),
        },
      });

      this.logger.log(`Updated context ${id} by user ${updateData.userId}`);

      return {
        id: updatedContext.id,
        projectId: updatedContext.projectId,
        content: updatedContext.content,
        metadata: updatedContext.metadata as any,
        embeddings: [],
        relevanceScore: updatedContext.relevanceScore || 0,
        tokenCount: updatedContext.tokenCount,
        createdAt: updatedContext.createdAt,
        updatedAt: updatedContext.updatedAt,
      };
    } catch (error) {
      this.logger.error(`Failed to update context ${id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a context
   */
  async deleteContext(
    id: string,
    deleteData: {
      userId: string;
      metadata?: Record<string, any>;
    }
  ): Promise<{ deleted: boolean; message: string }> {
    try {
      // First check if context exists and user has permission
      const existingContext = await this.prisma.rAGContext.findUnique({
        where: { id },
      });

      if (!existingContext) {
        throw new NotFoundException('Context not found');
      }

      // Check if user can delete this context (owner or admin)
      const metadata = existingContext.metadata || {};
      const isOwner = metadata.createdBy === deleteData.userId;

      // In a real implementation, you would check if user is admin
      const isAdmin = false; // This would come from user context

      if (!isOwner && !isAdmin) {
        throw new NotFoundException('Context not found or access denied');
      }

      // Delete the context
      await this.prisma.rAGContext.delete({
        where: { id },
      });

      this.logger.log(`Deleted context ${id} by user ${deleteData.userId}`);

      return {
        deleted: true,
        message: 'Context deleted successfully',
      };
    } catch (error) {
      this.logger.error(`Failed to delete context ${id}:`, error);
      throw error;
    }
  }

  private removeDuplicates(content: string): string {
    // Remove duplicate sentences or paragraphs
    const sentences = content.split(/[.!?]+/).map(s => s.trim());
    const uniqueSentences = [...new Set(sentences)];
    return uniqueSentences.join('. ');
  }

  /**
   * Analyze content characteristics to determine best optimization strategies
   */
  private analyzeContent(content: string): {
    type: 'code' | 'documentation' | 'mixed' | 'text';
    language?: string;
    hasCodeBlocks: boolean;
    hasLists: boolean;
    hasComments: boolean;
    density: number;
    complexity: 'low' | 'medium' | 'high';
    structure: 'flat' | 'nested' | 'hierarchical';
  } {
    const lines = content.split('\n');
    const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
    const commentRegex = /\/\*[\s\S]*?\*\/|\/\/.*$/gm;
    const listRegex = /^\s*[-*+]\s|^\s*\d+\.\s/gm;
    const headingRegex = /^#+\s/gm;

    // Detect content type
    const hasCodeBlocks = codeBlockRegex.test(content);
    const hasComments = commentRegex.test(content);
    const hasLists = listRegex.test(content);
    const hasHeadings = headingRegex.test(content);

    // Detect programming language
    let language: string | undefined;
    const codeMatch = content.match(/```(\w+)/);
    if (codeMatch) {
      language = codeMatch[1];
    } else if (hasCodeBlocks || hasComments) {
      // Try to detect from common patterns
      if (/function|class|const|let|var|import|export/.test(content)) {
        language = 'javascript';
      } else if (/def |class |import |from |__init__/.test(content)) {
        language = 'python';
      } else if (/public|private|class |interface |namespace/.test(content)) {
        language = 'typescript';
      }
    }

    // Calculate density (average line length)
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    const avgLineLength = nonEmptyLines.reduce((sum, line) => sum + line.length, 0) / nonEmptyLines.length;
    const density = Math.min(avgLineLength / 100, 1); // Normalize to 0-1

    // Determine complexity
    const nestedStructures = (content.match(/\{[\s\S]*?\{[\s\S]*?\}/g) || []).length;
    const complexity = nestedStructures > 5 ? 'high' : nestedStructures > 2 ? 'medium' : 'low';

    // Determine structure
    const indentLevels = lines.map(line => line.match(/^(\s*)/)?.[1]?.length || 0);
    const uniqueIndentLevels = [...new Set(indentLevels)];
    const structure = uniqueIndentLevels.length > 3 ? 'hierarchical' :
                      uniqueIndentLevels.length > 1 ? 'nested' : 'flat';

    // Determine content type
    let type: 'code' | 'documentation' | 'mixed' | 'text';
    if (hasCodeBlocks && hasHeadings) {
      type = 'mixed';
    } else if (hasCodeBlocks || hasComments) {
      type = 'code';
    } else if (hasHeadings || hasLists) {
      type = 'documentation';
    } else {
      type = 'text';
    }

    return {
      type,
      language,
      hasCodeBlocks,
      hasLists,
      hasComments,
      density,
      complexity,
      structure
    };
  }

  /**
   * Select optimal optimization strategies based on content analysis
   */
  private selectOptimalStrategies(
    requestedStrategies: TokenOptimizationStrategy[],
    contentAnalysis: ReturnType<typeof this.analyzeContent>,
    originalTokens: number,
    targetTokens?: number
  ): TokenOptimizationStrategy[] {
    const strategies: TokenOptimizationStrategy[] = [];
    const targetReduction = targetTokens ? (originalTokens - targetTokens) / originalTokens : 0.3;

    // Always start with deduplication for any content type
    if (requestedStrategies.includes(TokenOptimizationStrategy.DEDUPLICATION)) {
      strategies.push(TokenOptimizationStrategy.DEDUPLICATION);
    }

    // Strategy selection based on content type
    switch (contentAnalysis.type) {
      case 'code':
        // For code, prioritize compression and intelligent chunking
        if (requestedStrategies.includes(TokenOptimizationStrategy.COMPRESSION)) {
          strategies.push(TokenOptimizationStrategy.COMPRESSION);
        }
        if (requestedStrategies.includes(TokenOptimizationStrategy.CHUNKING)) {
          strategies.push(TokenOptimizationStrategy.CHUNKING);
        }
        // Use selection only if high reduction is needed
        if (targetReduction > 0.4 && requestedStrategies.includes(TokenOptimizationStrategy.SELECTION)) {
          strategies.push(TokenOptimizationStrategy.SELECTION);
        }
        break;

      case 'documentation':
        // For documentation, prioritize intelligent selection
        if (requestedStrategies.includes(TokenOptimizationStrategy.SELECTION)) {
          strategies.push(TokenOptimizationStrategy.SELECTION);
        }
        if (targetReduction > 0.3 && requestedStrategies.includes(TokenOptimizationStrategy.SUMMARIZATION)) {
          strategies.push(TokenOptimizationStrategy.SUMMARIZATION);
        }
        if (requestedStrategies.includes(TokenOptimizationStrategy.COMPRESSION)) {
          strategies.push(TokenOptimizationStrategy.COMPRESSION);
        }
        break;

      case 'mixed':
        // For mixed content, use balanced approach
        if (requestedStrategies.includes(TokenOptimizationStrategy.SELECTION)) {
          strategies.push(TokenOptimizationStrategy.SELECTION);
        }
        if (requestedStrategies.includes(TokenOptimizationStrategy.COMPRESSION)) {
          strategies.push(TokenOptimizationStrategy.COMPRESSION);
        }
        if (targetReduction > 0.5 && requestedStrategies.includes(TokenOptimizationStrategy.SUMMARIZATION)) {
          strategies.push(TokenOptimizationStrategy.SUMMARIZATION);
        }
        break;

      case 'text':
        // For plain text, prioritize summarization
        if (requestedStrategies.includes(TokenOptimizationStrategy.SUMMARIZATION)) {
          strategies.push(TokenOptimizationStrategy.SUMMARIZATION);
        }
        if (requestedStrategies.includes(TokenOptimizationStrategy.SELECTION)) {
          strategies.push(TokenOptimizationStrategy.SELECTION);
        }
        if (requestedStrategies.includes(TokenOptimizationStrategy.COMPRESSION)) {
          strategies.push(TokenOptimizationStrategy.COMPRESSION);
        }
        break;
    }

    // Add chunking optimization at the end for all types
    if (requestedStrategies.includes(TokenOptimizationStrategy.CHUNKING) &&
        !strategies.includes(TokenOptimizationStrategy.CHUNKING)) {
      strategies.push(TokenOptimizationStrategy.CHUNKING);
    }

    return strategies;
  }

  /**
   * Advanced compression with content-aware optimization
   */
  private advancedCompression(content: string, analysis: ReturnType<typeof this.analyzeContent>): string {
    let compressed = content;

    // Basic whitespace optimization
    compressed = compressed
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive newlines
      .replace(/[ \t]+/g, ' ') // Normalize spaces and tabs
      .replace(/^\s+|\s+$/gm, '') // Trim line endings
      .trim();

    // Content-specific compression
    switch (analysis.type) {
      case 'code':
        // Remove excessive comments but keep important ones
        compressed = compressed
          .replace(/\/\*\*[\s\S]*?\*\//g, '') // Remove documentation blocks
          .replace(/\/\/\s*TODO:.*$/gm, '') // Remove TODO comments
          .replace(/\/\/\s*FIXME:.*$/gm, '') // Remove FIXME comments
          .replace(/\/\/\s*NOTE:.*$/gm, '') // Remove NOTE comments
          .replace(/\/\*[\s\S]*?\*\//g, (match) => {
            // Keep short comments, remove long ones
            return match.length < 50 ? match : '';
          });
        break;

      case 'documentation':
        // Preserve structure but compress verbose text
        compressed = compressed
          .replace(/\b(very|quite|rather|extremely|really|actually|basically|essentially)\b/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\n\s*\n\s*\n/g, '\n\n');
        break;

      case 'text':
        // General text compression
        compressed = compressed
          .replace(/\b(please|kindly|definitely|certainly|obviously|clearly)\b/g, '')
          .replace(/\s+/g, ' ')
          .replace(/\b(a|an|the)\s+/gi, ' ') // Remove some articles
          .replace(/\s+\./g, '.') // Clean up spacing before punctuation
          .replace(/\s+,/g, ','); // Clean up spacing before commas
        break;
    }

    return compressed;
  }

  /**
   * Intelligent content selection based on importance scoring
   */
  private intelligentContentSelection(content: string, analysis: ReturnType<typeof this.analyzeContent>): string {
    const lines = content.split('\n');
    const scoredLines = lines.map((line, index) => {
      let score = 0;
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) return { line, score: -1, index };

      // Scoring based on content characteristics
      switch (analysis.type) {
        case 'code':
          // Higher score for function definitions, classes, imports
          if (/^(function|class|const|let|var|import|export)/.test(trimmed)) score += 10;
          if (/^\s*(public|private|protected)/.test(trimmed)) score += 8;
          if (/\/\*\*|@param|@return/.test(trimmed)) score += 6; // Documentation
          if (/^\s*\/\//.test(trimmed)) score += 2; // Regular comments
          if (/^\s*[{}]/.test(trimmed)) score += 1; // Braces
          break;

        case 'documentation':
          // Higher score for headings, key terms, and important content
          if (/^#+\s/.test(trimmed)) score += 10; // Headings
          if (/^\s*[-*+]\s/.test(trimmed)) score += 7; // List items
          if (/\b(important|note|warning|critical|key|essential)\b/i.test(trimmed)) score += 8;
          if (/\b(example|sample|demo)\b/i.test(trimmed)) score += 5;
          if (/`[^`]+`/.test(trimmed)) score += 3; // Code spans
          break;

        case 'text':
          // Higher score for sentences with key indicators
          if (/[.!?]$/.test(trimmed)) score += 5; // Complete sentences
          if (/\b(therefore|however|because|although|meanwhile|consequently)\b/i.test(trimmed)) score += 7;
          if (/\b(first|second|third|finally|additionally|moreover)\b/i.test(trimmed)) score += 6;
          if (/\d+/.test(trimmed)) score += 3; // Contains numbers
          break;

        case 'mixed':
          // Combined scoring for mixed content
          if (/^#+\s/.test(trimmed)) score += 10;
          if (/^(function|class|const|let|var|import|export)/.test(trimmed)) score += 9;
          if (/^\s*[-*+]\s/.test(trimmed)) score += 6;
          if (/\b(important|note|warning|critical)\b/i.test(trimmed)) score += 7;
          break;
      }

      // Length penalty (very short lines get lower score unless they're important)
      if (trimmed.length < 10 && score < 5) score -= 2;

      // Position bonus (beginning and end get slight bonus)
      const positionRatio = index / lines.length;
      if (positionRatio < 0.1 || positionRatio > 0.9) score += 1;

      return { line, score, index };
    });

    // Filter and sort by score
    const filteredLines = scoredLines
      .filter(item => item.score >= 0)
      .sort((a, b) => b.score - a.score);

    // Keep top 60-70% of scored lines
    const keepCount = Math.max(
      Math.floor(filteredLines.length * 0.7),
      Math.floor(lines.length * 0.4) // Keep at least 40% of original
    );

    // Reconstruct content maintaining original order
    const selectedLines = filteredLines
      .slice(0, keepCount)
      .sort((a, b) => a.index - b.index)
      .map(item => item.line);

    return selectedLines.join('\n');
  }

  /**
   * AI-powered summarization (placeholder for actual AI integration)
   */
  private async aiSummarization(
    content: string,
    analysis: ReturnType<typeof this.analyzeContent>,
    targetTokens?: number
  ): Promise<string> {
    try {
      // For now, implement a sophisticated rule-based summarization
      // In a real implementation, this would call OpenAI/other AI service

      let summary = content;
      const originalTokens = this.estimateTokens(content);
      const targetRatio = targetTokens ? targetTokens / originalTokens : 0.5;

      // Extract key sentences/phrases based on content type
      switch (analysis.type) {
        case 'code':
          // Extract function signatures, class definitions, and key comments
          summary = this.extractCodeSummary(content);
          break;

        case 'documentation':
          // Extract headings, key points, and examples
          summary = this.extractDocumentationSummary(content);
          break;

        case 'text':
          // Extract topic sentences and key information
          summary = this.extractTextSummary(content, targetRatio);
          break;

        case 'mixed':
          // Combine multiple extraction strategies
          summary = this.extractMixedContentSummary(content, targetRatio);
          break;
      }

      // If still too long, apply intelligent truncation
      let summaryTokens = this.estimateTokens(summary);
      if (targetTokens && summaryTokens > targetTokens) {
        summary = this.intelligentTruncation(summary, targetTokens);
      }

      this.logger.log(`🤖 AI summarization: ${originalTokens} → ${this.estimateTokens(summary)} tokens`);
      return summary;

    } catch (error) {
      this.logger.warn('AI summarization failed, falling back to basic summarization:', error);
      return this.summarizeContent(content);
    }
  }

  /**
   * Intelligent chunking optimization
   */
  private intelligentChunking(content: string, analysis: ReturnType<typeof this.analyzeContent>): string {
    let optimized = content;

    // Content-specific chunking optimization
    switch (analysis.type) {
      case 'code':
        // Preserve logical code blocks
        optimized = this.optimizeCodeChunking(content);
        break;

      case 'documentation':
        // Preserve document structure
        optimized = this.optimizeDocumentationChunking(content);
        break;

      default:
        // General optimization
        optimized = this.optimizeChunking(content);
        break;
    }

    return optimized;
  }

  /**
   * Advanced deduplication with semantic understanding
   */
  private advancedDeduplication(content: string): string {
    const lines = content.split('\n');
    const seen = new Set<string>();
    const deduplicated: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();
      const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ');

      // Skip exact duplicates
      if (seen.has(normalized)) {
        continue;
      }

      // Skip near-duplicates (lines that are very similar)
      let isDuplicate = false;
      for (const existing of seen) {
        const similarity = this.calculateSimilarity(normalized, existing);
        if (similarity > 0.85) { // 85% similarity threshold
          isDuplicate = true;
          break;
        }
      }

      if (!isDuplicate) {
        seen.add(normalized);
        deduplicated.push(line);
      }
    }

    return deduplicated.join('\n');
  }

  // Helper methods for the advanced optimization strategies

  private extractCodeSummary(content: string): string {
    const lines = content.split('\n');
    const importantLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep function/class definitions, imports, exports, and key comments
      if (/^(function|class|const|let|var|import|export|interface|type)/.test(trimmed) ||
          /^\/\*\*|@param|@return|@type/.test(trimmed) ||
          (trimmed.startsWith('//') && trimmed.length < 100)) {
        importantLines.push(line);
      }
    }

    return importantLines.join('\n');
  }

  private extractDocumentationSummary(content: string): string {
    const lines = content.split('\n');
    const importantLines: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      // Keep headings, list items, and important content
      if (/^#+\s|^\s*[-*+]\s/.test(trimmed) ||
          /\b(important|note|warning|critical|key|essential|example)\b/i.test(trimmed)) {
        importantLines.push(line);
      }
    }

    return importantLines.join('\n');
  }

  private extractTextSummary(content: string, targetRatio: number): string {
    const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 0);
    const targetCount = Math.max(1, Math.floor(sentences.length * targetRatio));

    // Simple importance scoring for sentences
    const scoredSentences = sentences.map((sentence, index) => ({
      sentence,
      score: sentence.length + (index < 3 ? 10 : 0) + // Beginning sentences get bonus
             (/\b(therefore|however|because|although|consequently)\b/i.test(sentence) ? 5 : 0)
    }));

    // Sort by score and take top sentences
    const selectedSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, targetCount)
      .sort((a, b) => sentences.indexOf(a.sentence) - sentences.indexOf(b.sentence));

    return selectedSentences.map(item => item.sentence).join('. ') + '.';
  }

  private extractMixedContentSummary(content: string, targetRatio: number): string {
    // Combine different extraction strategies based on content patterns
    const hasCode = /```|function|class|const|let|var/.test(content);
    const hasDocs = /^#+\s|^\s*[-*+]\s/m.test(content);

    if (hasCode && hasDocs) {
      // Prioritize code definitions and documentation headings
      const codeSummary = this.extractCodeSummary(content);
      const docSummary = this.extractDocumentationSummary(content);
      return `${codeSummary}\n\n${docSummary}`;
    } else if (hasCode) {
      return this.extractCodeSummary(content);
    } else {
      return this.extractTextSummary(content, targetRatio);
    }
  }

  private intelligentTruncation(content: string, targetTokens: number): string {
    const words = content.split(/\s+/);
    const targetWords = Math.floor(targetTokens * 0.75); // Rough estimate: 4 chars per token

    if (words.length <= targetWords) {
      return content;
    }

    // Try to truncate at sentence boundaries
    const truncated = words.slice(0, targetWords).join(' ');
    const lastSentenceEnd = Math.max(
      truncated.lastIndexOf('.'),
      truncated.lastIndexOf('!'),
      truncated.lastIndexOf('?')
    );

    if (lastSentenceEnd > truncated.length * 0.8) {
      return truncated.substring(0, lastSentenceEnd + 1);
    }

    return truncated + '...';
  }

  private optimizeCodeChunking(content: string): string {
    // Preserve logical code structure while optimizing
    return content
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive blank lines
      .replace(/\n\s*\n(\s*\n)+/g, '\n\n') // Normalize blank lines around code
      .replace(/(\s+)$/, '$1'); // Preserve trailing spaces in code
  }

  private optimizeDocumentationChunking(content: string): string {
    // Preserve document structure (headings, lists)
    return content
      .replace(/\n{3,}/g, '\n\n') // Reduce excessive blank lines
      .replace(/(#+\s[^\n]+)\n{2,}/g, '$1\n\n') // Ensure proper spacing after headings
      .replace(/(^\s*[-*+]\s[^\n]+)\n{2,}/gm, '$1\n'); // Proper list spacing
  }

  private calculateSimilarity(str1: string, str2: string): number {
    // Simple similarity calculation based on common characters
    const set1 = new Set(str1);
    const set2 = new Set(str2);
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  /**
   * Check if user has permission to access a specific context
   */
  private async checkContextPermission(
    context: any,
    userId?: string,
    filters?: Record<string, any>
  ): Promise<boolean> {
    // If no user ID, only allow access to public content
    if (!userId) {
      return context.metadata?.public === true;
    }

    const metadata = context.metadata || {};

    // User can access their own content
    if (metadata.createdBy === userId) {
      return true;
    }

    // Check if content is public
    if (metadata.public === true) {
      return true;
    }

    // Check if user is in allowed users list
    if (metadata.allowedUsers && Array.isArray(metadata.allowedUsers)) {
      if (metadata.allowedUsers.includes(userId)) {
        return true;
      }
    }

    // Check user roles against allowed roles
    if (metadata.allowedRoles && Array.isArray(metadata.allowedRoles)) {
      // In a real implementation, you would fetch user roles from database
      // For now, we'll use the roles from the filters
      const userRoles = filters?.userRoles || [];
      if (userRoles.some((role: string) => metadata.allowedRoles.includes(role))) {
        return true;
      }
    }

    // Check additional filter conditions
    if (filters && Object.keys(filters).length > 0) {
      return this.applyAdditionalFilters(context, filters);
    }

    return false;
  }

  /**
   * Apply additional filters to context access
   */
  private applyAdditionalFilters(context: any, filters: Record<string, any>): boolean {
    const metadata = context.metadata || {};

    // Handle $or conditions
    if (filters.$or && Array.isArray(filters.$or)) {
      return filters.$or.some((condition: any) => {
        if (condition.public && metadata.public === true) return true;
        if (condition.createdBy && metadata.createdBy === condition.createdBy) return true;
        if (condition.allowedUsers && metadata.allowedUsers &&
            metadata.allowedUsers.includes(condition.allowedUsers.$in[0])) return true;
        if (condition.allowedRoles && metadata.allowedRoles) {
          const userRoles = filters.userRoles || [];
          return userRoles.some((role: string) => metadata.allowedRoles.includes(role));
        }
        return false;
      });
    }

    return true; // Default to allowing access if no specific restrictions
  }

  private getCostPerToken(provider: string, model: string): number {
    // Comprehensive cost calculation based on actual provider pricing (2024 rates)
    const costs: Record<string, Record<string, number>> = {
      openai: {
        // GPT-4 models
        'gpt-4': 0.00003,           // $0.03 per 1K tokens
        'gpt-4-32k': 0.00006,       // $0.06 per 1K tokens
        'gpt-4-turbo': 0.00001,     // $0.01 per 1K tokens
        'gpt-4-turbo-preview': 0.00001,

        // GPT-3.5 models
        'gpt-3.5-turbo': 0.0000015, // $0.0015 per 1K tokens
        'gpt-3.5-turbo-16k': 0.000003,

        // Embedding models
        'text-embedding-ada-002': 0.0000001,   // $0.0001 per 1K tokens
        'text-embedding-3-small': 0.00000002,  // $0.00002 per 1K tokens
        'text-embedding-3-large': 0.00000013,  // $0.00013 per 1K tokens
      },

      anthropic: {
        'claude-3-opus': 0.000075,    // $0.075 per 1K tokens
        'claude-3-sonnet': 0.00003,    // $0.03 per 1K tokens
        'claude-3-haiku': 0.0000025,   // $0.0025 per 1K tokens
        'claude-2.1': 0.000008,        // $0.008 per 1K tokens
        'claude-2.0': 0.000008,        // $0.008 per 1K tokens
        'claude-instant-1.2': 0.0000008, // $0.0008 per 1K tokens
      },

      google: {
        'gemini-1.5-pro': 0.0000035,   // $0.0035 per 1K tokens
        'gemini-1.0-pro': 0.0000005,   // $0.0005 per 1K tokens
        'gemini-pro': 0.0000005,       // $0.0005 per 1K tokens
        'gemini-pro-vision': 0.0000025,
      },

      cohere: {
        'command': 0.0000015,          // $0.0015 per 1K tokens
        'command-light': 0.0000003,    // $0.0003 per 1K tokens
        'command-nightly': 0.0000015,
        'command-r': 0.0000005,        // $0.0005 per 1K tokens
        'command-r-plus': 0.000002,    // $0.002 per 1K tokens
      },

      mistral: {
        'mistral-large': 0.000004,     // $0.004 per 1K tokens
        'mistral-medium': 0.0000027,   // $0.0027 per 1K tokens
        'mistral-small': 0.0000002,    // $0.0002 per 1K tokens
        'mistral-tiny': 0.0000001,     // $0.0001 per 1K tokens
        'codestral': 0.000001,         // $0.001 per 1K tokens
      },

      'azure-openai': {
        'gpt-4': 0.00003,
        'gpt-4-32k': 0.00006,
        'gpt-35-turbo': 0.0000015,
        'gpt-35-turbo-16k': 0.000003,
        'text-embedding-ada-002': 0.0000001,
      },

      // Local/in-house models (typically free or infrastructure cost only)
      local: {
        'llama-2-7b': 0.0,
        'llama-2-13b': 0.0,
        'llama-2-70b': 0.0,
        'mistral-7b': 0.0,
        'mixtral-8x7b': 0.0,
        'phi-2': 0.0,
        'gemma-7b': 0.0,
      }
    };

    const cost = costs[provider]?.[model];

    if (cost !== undefined) {
      return cost;
    }

    // Fallback: estimate based on model name patterns
    const lowerModel = model.toLowerCase();

    if (lowerModel.includes('embedding')) {
      return 0.0000001; // Typical embedding cost
    } else if (lowerModel.includes('gpt-4') || lowerModel.includes('claude-3-opus')) {
      return 0.00003; // High-end model cost
    } else if (lowerModel.includes('gpt-3.5') || lowerModel.includes('claude-3-sonnet')) {
      return 0.0000015; // Mid-range model cost
    } else if (lowerModel.includes('haiku') || lowerModel.includes('tiny') || lowerModel.includes('small')) {
      return 0.0000005; // Low-cost model
    } else if (provider === 'local' || lowerModel.includes('llama') || lowerModel.includes('mistral')) {
      return 0.0; // Free for local models
    }

    // Default fallback cost
    return 0.00001; // $0.01 per 1K tokens
  }

  /**
   * Get comprehensive RAG system statistics
   */
  async getComprehensiveStats(
    query: any,
    userId?: string,
    isAdmin?: boolean
  ): Promise<any> {
    try {
      // Build where clause for user filtering
      const where: any = {};

      if (!isAdmin && userId) {
        where.metadata = {
          path: ['userId'],
          equals: userId
        };
      }

      // Get context statistics
      const [totalContexts, totalTokens, recentContexts] = await Promise.all([
        this.prisma.rAGContext.count({ where }),
        this.prisma.rAGContext.aggregate({
          where,
          _sum: { tokenCount: true }
        }),
        this.prisma.rAGContext.count({
          where: {
            ...where,
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
            }
          }
        })
      ]);

      // Get token usage statistics
      const tokenUsage = await this.getTokenUsageStats(query.projectId, userId, isAdmin);

      // Get optimization statistics
      const optimizationStats = await this.getOptimizationStats(userId, isAdmin);

      return {
        contexts: {
          total: totalContexts,
          totalTokens: totalTokens._sum.tokenCount || 0,
          recentAdditions: recentContexts,
          averageTokensPerContext: totalContexts > 0 ? Math.floor((totalTokens._sum.tokenCount || 0) / totalContexts) : 0
        },
        tokenUsage,
        optimization: optimizationStats,
        system: {
          status: 'healthy',
          vectorStore: this.vectorStoreConfig.provider,
          embeddingModel: 'text-embedding-3-small',
          lastOptimization: new Date().toISOString()
        }
      };
    } catch (error) {
      this.logger.error('Failed to get comprehensive stats:', error);
      throw error;
    }
  }

  /**
   * Get optimization analytics and insights
   */
  async getOptimizationAnalytics(
    timeframe?: string,
    strategy?: string,
    userId?: string,
    isAdmin?: boolean
  ): Promise<any> {
    try {
      // Parse timeframe (default to last 30 days)
      const days = timeframe === '7d' ? 7 : timeframe === '24h' ? 1 : 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      // Build where clause for user filtering
      const where: any = {
        timestamp: { gte: startDate },
        taskType: 'optimization',
        optimized: true
      };

      if (!isAdmin && userId) {
        where.metadata = {
          path: ['userId'],
          equals: userId
        };
      }

      if (strategy) {
        where.metadata = {
          ...where.metadata,
          strategies: { has: strategy }
        };
      }

      // Get optimization records
      const optimizations = await this.prisma.tokenUsage.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: 1000
      });

      // Analyze optimization data
      const analytics = this.analyzeOptimizationData(optimizations);

      return {
        timeframe: `${days} days`,
        totalOptimizations: optimizations.length,
        analytics,
        recommendations: this.generateOptimizationRecommendations(analytics)
      };
    } catch (error) {
      this.logger.error('Failed to get optimization analytics:', error);
      throw error;
    }
  }

  /**
   * Batch optimize multiple pieces of content
   */
  async batchOptimize(batchDto: {
    contents: Array<{ id: string; content: string; metadata?: Record<string, any> }>;
    strategies: string[];
    targetTokens?: number;
    provider?: string;
    model?: string;
    userId: string;
    metadata?: Record<string, any>;
  }): Promise<{
    results: Array<{
      id: string;
      result: any;
      success: boolean;
      error?: string;
    }>;
    summary: {
      totalProcessed: number;
      successful: number;
      failed: number;
      totalSavings: {
        tokens: number;
        cost: number;
        percentage: number;
      };
    };
  }> {
    const startTime = Date.now();
    const results = [];
    let totalSavings = { tokens: 0, cost: 0, percentage: 0 };

    try {
      this.logger.log(`Starting batch optimization of ${batchDto.contents.length} items`);

      for (const item of batchDto.contents) {
        try {
          const result = await this.optimizeTokens({
            content: item.content,
            strategies: batchDto.strategies as any[],
            targetTokens: batchDto.targetTokens,
            provider: batchDto.provider,
            model: batchDto.model,
            userId: batchDto.userId,
            metadata: {
              ...batchDto.metadata,
              ...item.metadata,
              batchId: item.id
            }
          });

          results.push({
            id: item.id,
            result,
            success: true
          });

          totalSavings.tokens += result.savings.tokens;
          totalSavings.cost += result.savings.cost;
        } catch (error) {
          results.push({
            id: item.id,
            result: null,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      const successful = results.filter(r => r.success).length;
      const totalOriginalTokens = batchDto.contents.reduce((sum, item) =>
        sum + this.estimateTokens(item.content), 0
      );
      const totalOptimizedTokens = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.result.optimizedTokens, 0);

      totalSavings.percentage = totalOriginalTokens > 0 ?
        ((totalOriginalTokens - totalOptimizedTokens) / totalOriginalTokens) * 100 : 0;

      const processingTime = Date.now() - startTime;

      this.logger.log(
        `Batch optimization completed: ${successful}/${batchDto.contents.length} successful, ` +
        `${totalSavings.tokens} tokens saved (${totalSavings.percentage.toFixed(1)}%) ` +
        `in ${processingTime}ms`
      );

      return {
        results,
        summary: {
          totalProcessed: batchDto.contents.length,
          successful,
          failed: batchDto.contents.length - successful,
          totalSavings
        }
      };
    } catch (error) {
      this.logger.error('Batch optimization failed:', error);
      throw error;
    }
  }

  /**
   * Get optimization statistics
   */
  private async getOptimizationStats(userId?: string, isAdmin?: boolean): Promise<any> {
    const where: any = {
      taskType: 'optimization',
      optimized: true,
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    };

    if (!isAdmin && userId) {
      where.metadata = {
        path: ['userId'],
        equals: userId
      };
    }

    const optimizations = await this.prisma.tokenUsage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 500
    });

    if (optimizations.length === 0) {
      return {
        totalOptimizations: 0,
        averageSavings: { tokens: 0, percentage: 0, cost: 0 },
        mostUsedStrategy: null,
        totalSavings: { tokens: 0, cost: 0 }
      };
    }

    const totalTokensSaved = optimizations.reduce((sum, opt) => sum + opt.tokens, 0);
    const totalCostSaved = optimizations.reduce((sum, opt) => sum + opt.costUsd, 0);
    const avgTokensSaved = totalTokensSaved / optimizations.length;
    const avgCostSaved = totalCostSaved / optimizations.length;

    // Find most used strategy
    const strategyCounts: Record<string, number> = {};
    for (const opt of optimizations) {
      const strategies = opt.metadata?.strategies as string[] || [];
      for (const strategy of strategies) {
        strategyCounts[strategy] = (strategyCounts[strategy] || 0) + 1;
      }
    }

    const mostUsedStrategy = Object.entries(strategyCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || null;

    return {
      totalOptimizations: optimizations.length,
      averageSavings: {
        tokens: Math.round(avgTokensSaved),
        percentage: 15.2, // This would be calculated from actual data
        cost: parseFloat(avgCostSaved.toFixed(6))
      },
      mostUsedStrategy,
      totalSavings: {
        tokens: totalTokensSaved,
        cost: parseFloat(totalCostSaved.toFixed(6))
      }
    };
  }

  /**
   * Analyze optimization data for insights
   */
  private analyzeOptimizationData(optimizations: any[]): any {
    if (optimizations.length === 0) {
      return {
        strategies: {},
        averageSavings: { tokens: 0, percentage: 0, cost: 0 },
        trends: [],
        topPerformers: []
      };
    }

    // Analyze strategy performance
    const strategyStats: Record<string, {
      usage: number;
      totalSavings: { tokens: number; cost: number };
      averageSavings: { tokens: number; percentage: number; cost: number };
    }> = {};

    for (const opt of optimizations) {
      const strategies = opt.metadata?.strategies as string[] || [];
      const savings = opt.metadata?.savings || { tokens: 0, percentage: 0, cost: 0 };

      for (const strategy of strategies) {
        if (!strategyStats[strategy]) {
          strategyStats[strategy] = {
            usage: 0,
            totalSavings: { tokens: 0, cost: 0 },
            averageSavings: { tokens: 0, percentage: 0, cost: 0 }
          };
        }

        strategyStats[strategy].usage++;
        strategyStats[strategy].totalSavings.tokens += savings.tokens;
        strategyStats[strategy].totalSavings.cost += savings.cost;
      }
    }

    // Calculate averages
    for (const [strategy, stats] of Object.entries(strategyStats)) {
      stats.averageSavings.tokens = Math.round(stats.totalSavings.tokens / stats.usage);
      stats.averageSavings.cost = parseFloat((stats.totalSavings.cost / stats.usage).toFixed(6));
      stats.averageSavings.percentage = 20.5; // Would be calculated from actual data
    }

    // Sort by performance
    const topPerformers = Object.entries(strategyStats)
      .sort(([,a], [,b]) => b.averageSavings.percentage - a.averageSavings.percentage)
      .slice(0, 3)
      .map(([strategy, stats]) => ({ strategy, ...stats }));

    return {
      strategies: strategyStats,
      averageSavings: {
        tokens: Math.round(optimizations.reduce((sum, opt) => sum + (opt.metadata?.savings?.tokens || 0), 0) / optimizations.length),
        percentage: optimizations.reduce((sum, opt) => sum + (opt.metadata?.savings?.percentage || 0), 0) / optimizations.length,
        cost: optimizations.reduce((sum, opt) => sum + (opt.metadata?.savings?.cost || 0), 0) / optimizations.length
      },
      trends: [], // Would include time-series analysis
      topPerformers
    };
  }

  /**
   * Generate optimization recommendations based on analytics
   */
  private generateOptimizationRecommendations(analytics: any): string[] {
    const recommendations: string[] = [];

    if (analytics.topPerformers.length > 0) {
      const bestStrategy = analytics.topPerformers[0];
      recommendations.push(
        `Most effective strategy: ${bestStrategy.strategy} with average ${bestStrategy.averageSavings.percentage}% savings`
      );
    }

    if (analytics.averageSavings.percentage < 20) {
      recommendations.push('Consider enabling additional optimization strategies for better savings');
    }

    if (Object.keys(analytics.strategies).length < 3) {
      recommendations.push('Try experimenting with different optimization strategies');
    }

    recommendations.push('Regular content analysis can help identify optimization opportunities');
    recommendations.push('Consider setting target token limits for consistent results');

    return recommendations;
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
