import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsNumber, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AIProvider {
  OPENAI = 'openai',
  ANTHROPIC = 'anthropic',
  DEEPSEEK = 'deepseek',
  GEMINI = 'gemini',
  LOCAL = 'local',
}

export enum AIMode {
  CHAT = 'chat',
  COMPLETION = 'completion',
  EMBEDDING = 'embedding',
  VISION = 'vision',
  FUNCTION_CALLING = 'function_calling',
}

export interface AIPrompt {
  role: 'system' | 'user' | 'assistant';
  content: string;
  name?: string;
}

export interface AIResponse {
  content: string;
  role: 'assistant';
  metadata?: {
    provider: AIProvider;
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    cost?: number;
    latency?: number;
  };
}

export class GenerateTextDto {
  @ApiProperty({
    description: 'Input text or prompt for AI generation',
    example: 'Write a React component for a user profile card'
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    description: 'System prompt or context',
    example: 'You are a helpful assistant. Generate clean, modern React code.'
  })
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @ApiProperty({
    enum: AIProvider,
    description: 'AI provider to use (auto for best fit)',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiProperty({
    description: 'Specific model name',
    example: 'gpt-4'
  })
  @IsOptional()
  @IsString()
  model?: string;

  @ApiPropertyOptional({
    description: 'Max tokens for response',
    example: 2000
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100000)
  maxTokens?: number;

  @ApiPropertyOptional({
    description: 'Temperature for response randomness',
    example: 0.7
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @ApiPropertyOptional({
    description: 'Response formatting instructions',
    example: 'Return only valid JSON code'
  })
  @IsOptional()
  @IsString()
  format?: string;

  @ApiPropertyOptional({
    description: 'Stop sequences to prevent early termination',
    example: ['\\\\n', 'Human:', 'USER:']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  stop?: string[];

  @ApiPropertyOptional({
    description: 'Include function calling capabilities',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  enableFunctions?: boolean;

  @ApiPropertyOptional({
    description: 'Task or project context',
    example: { projectId: 'project-123', taskType: 'code-generation' }
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class GenerateImageDto {
  @ApiProperty({
    description: 'Text prompt for image generation',
    example: 'A modern, clean user profile card with blue gradient background'
  })
  @IsString()
  prompt: string;

  @ApiPropertyOptional({
    enum: AIProvider,
    description: 'AI provider to use',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Image size',
    enum: ['256x256', '512x512', '1024x1024'],
    example: '512x512'
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiPropertyOptional({
    description: 'Image style or quality',
    example: 'vivid'
  })
  @IsOptional()
  @IsString()
  style?: string;

  @ApiPropertyOptional({
    description: 'Number of images to generate',
    example: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4)
  count?: number;
}

export class AnalyzeCodeDto {
  @ApiProperty({
    description: 'Source code to analyze',
    example: 'function processData(data) { return data.filter(x => x.active); }'
  })
  @IsString()
  code: string;

  @ApiProperty({
    description: 'Analysis type',
    enum: ['security', 'performance', 'quality', 'best-practices', 'complexity'],
    example: 'security'
  })
  @IsString()
  analysisType: string;

  @ApiPropertyOptional({
    enum: AIProvider,
    description: 'AI provider to use',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Programming language',
    example: 'javascript'
  })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({
    description: 'Analysis context or requirements',
    example: { standards: 'OWASP', focus: ['injection', 'authentication'] }
  })
  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class GenerateFunctionDto {
  @ApiProperty({
    description: 'Task description for function generation',
    example: 'Create a function to validate email addresses'
  })
  @IsString()
  taskDescription: string;

  @ApiProperty({
    description: 'Example input/output',
    example: '{"email": "test@example.com"}'
  })
  @IsOptional()
  @IsString()
  example?: string;

  @ApiPropertyOptional({
    description: 'Required parameters',
    example: '{"email": {"type": "string", "format": "email"}}'
  })
  @IsOptional()
  @IsString()
  parameters?: string;

  @ApiPropertyOptional({
    enum: AIProvider,
    description: 'AI provider to use',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Expected output format',
    example: 'validation-result-object'
  })
  @IsOptional()
  @IsString()
  outputFormat?: string;
}

export class ChatMessageDto {
  @ApiProperty({
    description: 'User message',
    example: 'What\'s the weather today?'
  })
  @IsString()
  content: string;

  @ApiPropertyOptional({
    description: 'Message role (auto-determined)',
    enum: ['user', 'assistant', 'system']
  })
  @IsOptional()
  @IsEnum(['user', 'assistant', 'system'])
  role?: string;

  @ApiPropertyOptional({
    description: 'Attachments or files',
    example: ['user-profile-image.jpg']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  attachments?: string[];

  @ApiPropertyOptional({
    description: 'Conversation or session ID',
    example: 'session-abc-123'
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class AIBulkRequestDto {
  @ApiProperty({
    description: 'Array of AI requests to process',
    example: [
      { type: 'text', prompt: 'Summarize this document' },
      { type: 'code-analysis', code: 'console.log("Hello");' }
    ]
  })
  @IsArray()
  @IsObject()
  requests: BulkAIPayload[];

  @ApiPropertyOptional({
    description: 'Global provider for all requests',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  globalProvider?: AIProvider;

  @ApiPropertyOptional({
    description: 'Priority queue (high, normal, low)',
    example: 'normal'
  })
  @IsOptional()
  @IsEnum(['high', 'normal', 'low'])
  priority?: 'high' | 'normal' | 'low';
}

export type BulkAIPayload =
  | { type: 'text'; prompt: string; } & GenerateTextDto
  | { type: 'image'; prompt: string; } & GenerateImageDto
  | { type: 'code-analysis'; code: string; } & AnalyzeCodeDto
  | { type: 'function-generation'; taskDescription: string; } & GenerateFunctionDto
  | { type: 'chat'; } & ChatMessageDto;

export class ProviderConfigDto {
  @ApiProperty({
    enum: AIProvider,
    description: 'AI provider to configure',
    example: AIProvider.OPENAI
  })
  @IsEnum(AIProvider)
  provider: AIProvider;

  @ApiProperty({
    description: 'API key for the provider',
    example: 'sk-abc123...'
  })
  @IsString()
  apiKey: string;

  @ApiProperty({
    description: 'Base URL (for self-hosted or custom endpoints)',
    example: 'https://api.openai.com/v1'
  })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiPropertyOptional({
    description: 'Request timeout in milliseconds',
    example: 30000
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  @Max(300000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Maximum retries',
    example: 3
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10)
  maxRetries?: number;

  @ApiPropertyOptional({
    description: 'Rate limit requests per minute',
    example: 60
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rateLimitPerMinute?: number;

  @ApiPropertyOptional({
    description: 'Default model for this provider',
    example: 'gpt-4'
  })
  @IsOptional()
  @IsString()
  defaultModel?: string;

  @ApiPropertyOptional({
    description: 'Supported models and capabilities',
    example: ['gpt-4', 'gpt-3.5-turbo', 'text-embedding-3-small']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  supportedModels?: string[];

  @ApiPropertyOptional({
    description: 'Provider-specific configuration',
    example: { region: 'us-east-1', version: 'v2' }
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class AIProviderStatsDto {
  @ApiProperty({
    description: 'Filter by provider',
    example: AIProvider.OPENAI
  })
  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @ApiProperty({
    description: 'Filter by model',
    example: 'gpt-4'
  })
  @IsOptional()
  @IsString()
  model?: string;

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

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    description: 'Items per page',
    example: 50
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  limit?: number;
}

export class ProviderFallbackConfigDto {
  @ApiProperty({
    description: 'Fallback provider configuration',
    example: [
      { provider: AIProvider.ANTHROPIC, priority: 1 },
      { provider: AIProvider.DEEPSEEK, priority: 2 },
      { provider: AIProvider.GEMINI, priority: 3 }
    ]
  })
  @IsOptional()
  @IsArray()
  @IsObject()
  providers?: ProviderPriority[];

  @ApiPropertyOptional({
    description: 'Automatic failover settings',
    example: { enabled: true, healthCheckInterval: 60000 }
  })
  @IsOptional()
  @IsObject()
  failover?: {
    enabled?: boolean;
    healthCheckInterval?: number;
    maxFailures?: number;
  };
}

export interface ProviderPriority {
  provider: AIProvider;
  priority: number; // Lower number = higher priority
  weight?: number; // For load balancing
  enabled?: boolean;
  region?: string; // For regional routing
}

export class ModelComparisonDto {
  @ApiProperty({
    description: 'Prompt or input to compare across providers',
    example: 'Generate a React component for a user profile'
  })
  @IsString()
  prompt: string;

  @ApiProperty({
    description: 'Providers to compare',
    example: ['openai', 'anthropic', 'deepseek']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AIProvider, { each: true })
  providers?: AIProvider[];

  @ApiPropertyOptional({
    description: 'Models to include in comparison',
    example: ['gpt-4', 'claude-3-sonnet', 'deepseek-coder']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  models?: string[];

  @ApiPropertyOptional({
    description: 'Maximum cost limit per response',
    example: 0.10
  })
  @IsOptional()
  @IsNumber()
  @Min(0.001)
  maxCostPerResponse?: number;

  @ApiPropertyOptional({
    description: 'Include performance metrics',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  includeMetrics?: boolean;
}

export class CostAnalysisDto {
  @ApiProperty({
    description: 'Text or prompt to analyze for cost',
    example: 'Write a comprehensive blog post about AI'
  })
  @IsString()
  text: string;

  @ApiProperty({
    description: 'Providers to analyze costs for',
    example: ['openai', 'anthropic', 'deepseek', 'gemini']
  })
  @IsOptional()
  @IsArray()
  @IsEnum(AIProvider, { each: true })
  providers?: AIProvider[];

  @ApiPropertyOptional({
    description: 'Models to analyze costs for',
    example: ['gpt-4', 'claude-3-sonnet', 'deepseek-coder', 'gemini-pro']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  models?: string[];

  @ApiPropertyOptional({
    description: 'Include optimization suggestions',
    example: true
  })
  @IsOptional()
  @IsBoolean()
  includeOptimizations?: boolean;
}
