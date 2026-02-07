import { IsString, IsOptional, IsArray, IsObject, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VectorStoreProvider {
  QDRANT = 'qdrant',
  PINECONE = 'pinecone',
  WEAVIATE = 'weaviate',
  CHROMA = 'chroma',
}

export enum EmbeddingModel {
  OPENAI_ADA002 = 'text-embedding-ada-002',
  OPENAI_SMALL3 = 'text-embedding-3-small',
  OPENAI_LARGE3 = 'text-embedding-3-large',
  LOCAL_SENTENCE_TRANSFORMERS = 'sentence-transformers',
  NEXA_EMBEDDING = 'nexa-embedding',
}

export enum TokenOptimizationStrategy {
  SUMMARIZATION = 'summarization',
  COMPRESSION = 'compression',
  SELECTION = 'selection',
  CHUNKING = 'chunking',
  DEDUPLICATION = 'deduplication',
}

export class IndexProjectDto {
  @ApiProperty({ example: 'project-uuid-123', description: 'Project ID to index' })
  @IsString()
  projectId: string;

  @ApiPropertyOptional({
    description: 'Specific file patterns to index',
    example: ['src/**/*.ts', 'docs/**/*.md']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  filePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Files and directories to exclude',
    example: ['node_modules/**', 'dist/**', '*.test.*']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({
    enum: EmbeddingModel,
    description: 'Embedding model to use',
    example: EmbeddingModel.OPENAI_ADA002
  })
  @IsOptional()
  @IsEnum(EmbeddingModel)
  embeddingModel?: EmbeddingModel;

  @ApiPropertyOptional({
    description: 'Chunk size for text processing',
    example: 1000
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(10000)
  chunkSize?: number;

  @ApiPropertyOptional({
    description: 'Chunk overlap for context preservation',
    example: 200
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1000)
  chunkOverlap?: number;

  @ApiPropertyOptional({
    description: 'Force re-indexing even if already indexed',
    example: false
  })
  @IsOptional()
  force?: boolean;

  @ApiPropertyOptional({
    description: 'User ID performing the indexing',
    example: 'user-uuid-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the indexing operation',
    example: { tags: ['backend', 'auth'], priority: 'high' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class QueryRAGDto {
  @ApiProperty({ example: 'What is the authentication system architecture?', description: 'Query for RAG context retrieval' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ example: 'project-uuid-123', description: 'Project ID to search within' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Maximum number of context chunks to retrieve',
    example: 5
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(20)
  maxResults?: number;

  @ApiPropertyOptional({
    description: 'Minimum relevance score threshold',
    example: 0.7
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minScore?: number;

  @ApiPropertyOptional({
    description: 'Include file paths in results',
    example: true
  })
  @IsOptional()
  includeMetadata?: boolean;

  @ApiPropertyOptional({
    description: 'Context types to include',
    example: ['code', 'documentation', 'comments']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  contextTypes?: string[];

  @ApiPropertyOptional({
    description: 'Filter by file extensions',
    example: ['.ts', '.js', '.md']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  fileExtensions?: string[];

  @ApiPropertyOptional({
    description: 'User ID making the query',
    example: 'user-uuid-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional filters for the query',
    example: { public: true, tags: ['backend'] }
  })
  @IsOptional()
  @IsObject()
  filters?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Additional metadata for the query',
    example: { sessionId: 'session-123', source: 'api' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateContextDto {
  @ApiProperty({ example: 'context-uuid-456', description: 'Context ID to update' })
  @IsString()
  contextId: string;

  @ApiPropertyOptional({
    description: 'Updated context content',
    example: 'Updated function implementation with error handling'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Updated metadata',
    example: { lastModified: '2024-01-15T10:30:00Z', version: '1.2.0' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Force re-embedding of content',
    example: true
  })
  @IsOptional()
  reEmbed?: boolean;
}

export class TokenUsageDto {
  @ApiProperty({
    description: 'Provider name',
    example: 'openai'
  })
  @IsString()
  provider: string;

  @ApiProperty({
    description: 'Model used',
    example: 'gpt-4'
  })
  @IsString()
  model: string;

  @ApiProperty({
    description: 'Number of tokens used',
    example: 1500
  })
  @IsNumber()
  @Min(0)
  tokens: number;

  @ApiProperty({
    description: 'Cost in USD',
    example: 0.045
  })
  @IsNumber()
  @Min(0)
  cost: number;

  @ApiPropertyOptional({
    description: 'Task type that used tokens',
    example: 'code-analysis'
  })
  @IsOptional()
  @IsString()
  taskType?: string;

  @ApiPropertyOptional({
    description: 'Whether usage was optimized',
    example: true
  })
  @IsOptional()
  optimized?: boolean;

  @ApiPropertyOptional({
    description: 'Optimization details',
    example: { strategies: ['summarization', 'compression'], savings: 0.015 }
  })
  @IsOptional()
  @IsObject()
  optimizationDetails?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'User ID who generated the token usage',
    example: 'user-uuid-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for token usage tracking',
    example: { sessionId: 'session-123', endpoint: '/rag/query' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TokenBudgetDto {
  @ApiProperty({
    description: 'Monthly budget in USD',
    example: 100.0
  })
  @IsNumber()
  @Min(0)
  monthlyLimit: number;

  @ApiPropertyOptional({
    description: 'Alert threshold (percentage of budget)',
    example: 0.8
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  alertThreshold?: number;

  @ApiPropertyOptional({
    description: 'Optimization strategies to apply',
    example: ['summarization', 'compression', 'selection']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TokenOptimizationStrategy, { each: true })
  optimizationStrategies?: TokenOptimizationStrategy[];

  @ApiPropertyOptional({
    description: 'User ID setting the budget',
    example: 'user-uuid-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the budget setting',
    example: { department: 'engineering', project: 'claude-agent' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class OptimizeTokensDto {
  @ApiProperty({
    description: 'Text or context to optimize',
    example: 'Long code snippet or documentation...'
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Optimization strategies to apply',
    example: ['summarization', 'compression']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(TokenOptimizationStrategy, { each: true })
  strategies?: TokenOptimizationStrategy[];

  @ApiPropertyOptional({
    description: 'Target token limit',
    example: 2000
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  targetTokens?: number;

  @ApiPropertyOptional({
    description: 'Provider for cost calculation',
    example: 'openai'
  })
  @IsOptional()
  @IsString()
  provider?: string;

  @ApiPropertyOptional({
    description: 'Model for cost calculation',
    example: 'gpt-4'
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'User ID requesting optimization',
    example: 'user-uuid-123'
  })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({
    description: 'Additional metadata for the optimization request',
    example: { context: 'code-review', priority: 'high' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class RAGQueryDto {
  @ApiProperty({ example: 'How does the authentication system work?' })
  @IsString()
  query: string;

  @ApiPropertyOptional({ example: 'project-uuid-123' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 10 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}

export class ContextStatsDto {
  @ApiPropertyOptional({
    description: 'Filter by project ID',
    example: 'project-uuid-123'
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range (ISO format)',
    example: '2024-01-01'
  })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({
    description: 'Filter by date range (ISO format)',
    example: '2024-01-31'
  })
  @IsOptional()
  @IsString()
  dateTo?: string;
}

export class VectorStoreConfigDto {
  @ApiProperty({
    enum: VectorStoreProvider,
    example: VectorStoreProvider.QDRANT
  })
  @IsEnum(VectorStoreProvider)
  provider: VectorStoreProvider;

  @ApiProperty({ example: 'http://localhost:6333', description: 'Vector store URL' })
  @IsString()
  url: string;

  @ApiPropertyOptional({ example: 'your-api-key', description: 'API key for cloud providers' })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiPropertyOptional({ example: 'claude-agent-contexts', description: 'Collection/namespace name' })
  @IsOptional()
  @IsString()
  collectionName?: string;

  @ApiPropertyOptional({
    description: 'Embedding dimension',
    example: 1536
  })
  @IsOptional()
  @IsNumber()
  @Min(128)
  @Max(4096)
  dimension?: number;

  @ApiPropertyOptional({
    description: 'Additional configuration',
    example: { indexType: 'HNSW', M: 16, efConstruction: 200 }
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}
