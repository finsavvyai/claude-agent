import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';

import {
  AIProvider,
  GenerateTextDto,
  GenerateImageDto,
  AnalyzeCodeDto,
  GenerateFunctionDto,
  ChatMessageDto,
  AIBulkRequestDto,
  ProviderConfigDto,
  ProviderFallbackConfigDto,
  ModelComparisonDto,
  CostAnalysisDto,
  AIResponse,
  BulkAIPayload
} from '../dto/ai.dto';

export interface AIProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout: number;
  maxRetries: number;
  rateLimitPerMinute: number;
  defaultModel: string;
  supportedModels: string[];
  config?: Record<string, any>;
}

export interface ProviderMetrics {
  provider: AIProvider;
  model: string;
  requestCount: number;
  successRate: number;
  averageLatency: number;
  averageCost: number;
  totalCost: number;
  lastUsed: Date;
  healthStatus: 'healthy' | 'degraded' | 'unhealthy';
}

export interface ModelCostAnalysis {
  provider: AIProvider;
  model: string;
  promptTokens: number;
  completionTokens: number;
  estimatedCost: number;
  costPerToken: number;
  optimizationSuggestions: string[];
}

@Injectable()
export class MultiProviderAIService {
  private readonly logger = new Logger(MultiProviderAIService.name);
  private readonly prisma: PrismaClient;
  private readonly providers = new Map<AIProvider, any>();
  private readonly providerConfigs = new Map<AIProvider, AIProviderConfig>();
  private readonly providerMetrics = new Map<AIProvider, ProviderMetrics>();
  private readonly fallbackConfig: ProviderFallbackConfigDto;

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });

    // Initialize fallback configuration
    this.fallbackConfig = {
      providers: [
        { provider: AIProvider.OPENAI, priority: 1, weight: 0.4 },
        { provider: AIProvider.ANTHROPIC, priority: 2, weight: 0.3 },
        { provider: AIProvider.DEEPSEEK, priority: 3, weight: 0.2 },
        { provider: AIProvider.GEMINI, priority: 4, weight: 0.1 },
      ],
      failover: {
        enabled: true,
        healthCheckInterval: 60000,
        maxFailures: 3,
      },
    };
  }

  async onModuleInit() {
    await this.initializeProviders();
    await this.startHealthMonitoring();
    this.logger.log('✅ Multi-Provider AI Service initialized');
  }

  async generateText(dto: GenerateTextDto): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Select best provider and model
      const { provider, model } = await this.selectBestProvider(dto.provider, 'text-generation');

      // Generate response
      const response = await this.generateTextWithProvider(provider, model, dto);

      // Track usage and metrics
      const latency = Date.now() - startTime;
      await this.trackUsage(provider, model, 'text-generation', response.metadata?.usage || {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }, latency);

      return response;

    } catch (error) {
      this.logger.error('❌ Text generation failed:', error);

      // Try fallback providers
      if (this.fallbackConfig.failover?.enabled) {
        return this.generateTextWithFallback(dto);
      }

      throw error;
    }
  }

  async generateImage(dto: GenerateImageDto): Promise<{
    images: string[];
    metadata: any;
  }> {
    try {
      // Select best provider for image generation
      const { provider, model } = await this.selectBestProvider(dto.provider || AIProvider.OPENAI, 'image-generation');

      // Generate image
      const result = await this.generateImageWithProvider(provider, model, dto);

      // Track usage
      await this.trackUsage(provider, model, 'image-generation', {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }, 0);

      return result;

    } catch (error) {
      this.logger.error('❌ Image generation failed:', error);
      throw error;
    }
  }

  async analyzeCode(dto: AnalyzeCodeDto): Promise<{
    analysis: any;
    suggestions: string[];
    confidence: number;
  }> {
    try {
      // Select provider with best code analysis capabilities
      const { provider, model } = await this.selectBestProvider(dto.provider || AIProvider.DEEPSEEK, 'code-analysis');

      // Analyze code
      const result = await this.analyzeCodeWithProvider(provider, model, dto);

      // Track usage
      await this.trackUsage(provider, model, 'code-analysis', {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }, 0);

      return result;

    } catch (error) {
      this.logger.error('❌ Code analysis failed:', error);
      throw error;
    }
  }

  async generateFunction(dto: GenerateFunctionDto): Promise<{
    code: string;
    explanation: string;
    examples: any[];
  }> {
    try {
      // Select best provider for function generation
      const { provider, model } = await this.selectBestProvider(dto.provider || AIProvider.OPENAI, 'function-generation');

      // Generate function
      const result = await this.generateFunctionWithProvider(provider, model, dto);

      // Track usage
      await this.trackUsage(provider, model, 'function-generation', {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }, 0);

      return result;

    } catch (error) {
      this.logger.error('❌ Function generation failed:', error);
      throw error;
    }
  }

  async processBulkRequest(dto: AIBulkRequestDto): Promise<{
    results: any[];
    summary: {
      totalRequests: number;
      successful: number;
      failed: number;
      totalTime: number;
      totalCost: number;
    };
  }> {
    const startTime = Date.now();
    const results: any[] = [];
    let successful = 0;
    let failed = 0;
    let totalCost = 0;

    this.logger.log(`🔄 Processing bulk request: ${dto.requests.length} items`);

    // Process requests in parallel with concurrency control
    const concurrency = 5; // Limit concurrent requests
    for (let i = 0; i < dto.requests.length; i += concurrency) {
      const batch = dto.requests.slice(i, i + concurrency);

      const batchPromises = batch.map(async (request, index) => {
        try {
          let result;
          const provider = dto.globalProvider || await this.selectBestProvider(undefined, this.inferTaskType(request));

          switch (request.type) {
            case 'text':
              result = await this.generateText({ ...request, provider });
              break;
            case 'image':
              result = await this.generateImage({ ...request, provider });
              break;
            case 'code-analysis':
              result = await this.analyzeCode({ ...request, provider });
              break;
            case 'function-generation':
              result = await this.generateFunction({ ...request, provider });
              break;
            case 'chat':
              result = await this.chatWithProvider({ ...request, provider });
              break;
            default:
              throw new Error(`Unsupported request type: ${request.type}`);
          }

          successful++;
          if (result.metadata?.cost) {
            totalCost += result.metadata.cost;
          }

          return { index, success: true, result };
        } catch (error) {
          failed++;
          this.logger.error(`❌ Bulk request ${i + index} failed:`, error);
          return { index, success: false, error: error.message };
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }

    const totalTime = Date.now() - startTime;

    this.logger.log(`✅ Bulk processing completed: ${successful}/${dto.requests.length} successful in ${totalTime}ms`);

    return {
      results,
      summary: {
        totalRequests: dto.requests.length,
        successful,
        failed,
        totalTime,
        totalCost,
      },
    };
  }

  async compareModels(dto: ModelComparisonDto): Promise<{
    comparison: Array<{
      provider: AIProvider;
      model: string;
      response: string;
      latency: number;
      cost: number;
      quality?: number;
    }>;
    winner: {
      provider: AIProvider;
      model: string;
      reason: string;
    };
  }> {
    const providers = dto.providers || [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.DEEPSEEK];
    const comparison = [];

    this.logger.log(`🔍 Comparing models across ${providers.length} providers`);

    for (const provider of providers) {
      try {
        const models = dto.models || await this.getAvailableModels(provider);

        for (const model of models) {
          const startTime = Date.now();

          // Generate response
          const response = await this.generateTextWithProvider(
            provider,
            model,
            { prompt: dto.prompt, maxTokens: 500 }
          );

          const latency = Date.now() - startTime;
          const cost = await this.calculateCost(provider, model, {
            promptTokens: 100,
            completionTokens: response.content.length / 4, // Rough estimate
          });

          comparison.push({
            provider,
            model,
            response: response.content,
            latency,
            cost,
            quality: dto.includeMetrics ? await this.assessResponseQuality(response.content) : undefined,
          });
        }
      } catch (error) {
        this.logger.warn(`⚠️ Failed to get responses from ${provider}:`, error.message);
      }
    }

    // Determine winner based on cost, latency, and quality
    const winner = this.determineComparisonWinner(comparison);

    return {
      comparison,
      winner,
    };
  }

  async analyzeCosts(dto: CostAnalysisDto): Promise<{
    analyses: ModelCostAnalysis[];
    recommendations: {
      bestValue: { provider: AIProvider; model: string };
      bestQuality: { provider: AIProvider; model: string };
      optimizations: string[];
    };
    totalTokens: number;
  }> {
    const providers = dto.providers || [AIProvider.OPENAI, AIProvider.ANTHROPIC, AIProvider.DEEPSEEK, AIProvider.GEMINI];
    const analyses: ModelCostAnalysis[] = [];

    // Estimate tokens in the text
    const totalTokens = this.estimateTokens(dto.text);

    for (const provider of providers) {
      const models = dto.models || await this.getAvailableModels(provider);

      for (const model of models) {
        const costPerToken = this.getCostPerToken(provider, model);
        const estimatedCost = totalTokens * costPerToken;

        const optimizations: string[] = [];

        if (dto.includeOptimizations) {
          // Generate optimization suggestions
          if (totalTokens > 8000) {
            optimizations.push('Consider splitting into smaller requests');
          }
          if (costPerToken > 0.00002) {
            optimizations.push('Consider using a more cost-effective model');
          }
          if (provider !== AIProvider.DEEPSEEK && totalTokens > 4000) {
            optimizations.push('DeepSeek offers better value for large prompts');
          }
        }

        analyses.push({
          provider,
          model,
          promptTokens: Math.floor(totalTokens * 0.8),
          completionTokens: Math.floor(totalTokens * 0.2),
          estimatedCost,
          costPerToken,
          optimizationSuggestions: optimizations,
        });
      }
    }

    // Generate recommendations
    const bestValue = analyses.reduce((best, current) =>
      current.estimatedCost < best.estimatedCost ? current : best
    );

    const bestQuality = analyses.reduce((best, current) => {
      // Prioritize OpenAI and Anthropic for quality
      if (current.provider === AIProvider.OPENAI || current.provider === AIProvider.ANTHROPIC) {
        return current.estimatedCost < best.estimatedCost * 1.5 ? current : best;
      }
      return best;
    });

    const optimizations = [
      'Use context optimization to reduce prompt size',
      'Consider caching frequently used prompts',
      'Implement request batching for efficiency',
      'Monitor usage patterns to optimize provider selection',
    ];

    return {
      analyses,
      recommendations: {
        bestValue: { provider: bestValue.provider, model: bestValue.model },
        bestQuality: { provider: bestQuality.provider, model: bestQuality.model },
        optimizations,
      },
      totalTokens,
    };
  }

  async getProviderStats(): Promise<ProviderMetrics[]> {
    return Array.from(this.providerMetrics.values());
  }

  async updateProviderConfig(dto: ProviderConfigDto): Promise<void> {
    const config: AIProviderConfig = {
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl,
      timeout: dto.timeout || 30000,
      maxRetries: dto.maxRetries || 3,
      rateLimitPerMinute: dto.rateLimitPerMinute || 60,
      defaultModel: dto.defaultModel,
      supportedModels: dto.supportedModels || [],
      config: dto.config || {},
    };

    this.providerConfigs.set(dto.provider, config);
    await this.initializeProvider(dto.provider, config);

    this.logger.log(`✅ Updated configuration for provider: ${dto.provider}`);
  }

  private async initializeProviders(): Promise<void> {
    // Initialize OpenAI
    if (this.configService.get('ai.openai.apiKey')) {
      const openaiConfig: AIProviderConfig = {
        apiKey: this.configService.get('ai.openai.apiKey'),
        timeout: this.configService.get('ai.openai.timeout') || 30000,
        maxRetries: this.configService.get('ai.openai.maxRetries') || 3,
        rateLimitPerMinute: 60,
        defaultModel: 'gpt-4',
        supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
      };

      await this.initializeProvider(AIProvider.OPENAI, openaiConfig);
    }

    // Initialize Anthropic
    if (this.configService.get('ai.anthropic.apiKey')) {
      const anthropicConfig: AIProviderConfig = {
        apiKey: this.configService.get('ai.anthropic.apiKey'),
        timeout: this.configService.get('ai.anthropic.timeout') || 30000,
        maxRetries: this.configService.get('ai.anthropic.maxRetries') || 3,
        rateLimitPerMinute: 50,
        defaultModel: 'claude-3-sonnet-20240229',
        supportedModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
      };

      await this.initializeProvider(AIProvider.ANTHROPIC, anthropicConfig);
    }

    // Initialize DeepSeek
    if (this.configService.get('ai.deepseek.apiKey')) {
      const deepseekConfig: AIProviderConfig = {
        apiKey: this.configService.get('ai.deepseek.apiKey'),
        baseUrl: 'https://api.deepseek.com/v1',
        timeout: this.configService.get('ai.deepseek.timeout') || 30000,
        maxRetries: this.configService.get('ai.deepseek.maxRetries') || 3,
        rateLimitPerMinute: 60,
        defaultModel: 'deepseek-coder',
        supportedModels: ['deepseek-coder', 'deepseek-chat'],
      };

      await this.initializeProvider(AIProvider.DEEPSEEK, deepseekConfig);
    }

    // Initialize metrics for all providers
    for (const provider of Object.values(AIProvider)) {
      this.initializeProviderMetrics(provider);
    }
  }

  private async initializeProvider(provider: AIProvider, config: AIProviderConfig): Promise<void> {
    try {
      switch (provider) {
        case AIProvider.OPENAI:
          this.providers.set(provider, new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            timeout: config.timeout,
            maxRetries: config.maxRetries,
          }));
          break;

        case AIProvider.ANTHROPIC:
          this.providers.set(provider, new Anthropic({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
            timeout: config.timeout,
            maxRetries: config.maxRetries,
          }));
          break;

        case AIProvider.DEEPSEEK:
          this.providers.set(provider, new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl || 'https://api.deepseek.com/v1',
            timeout: config.timeout,
            maxRetries: config.maxRetries,
          }));
          break;

        // Add other providers as needed
      }

      this.providerConfigs.set(provider, config);
      this.logger.log(`✅ Initialized provider: ${provider}`);

    } catch (error) {
      this.logger.error(`❌ Failed to initialize provider ${provider}:`, error);
    }
  }

  private initializeProviderMetrics(provider: AIProvider): void {
    const metrics: ProviderMetrics = {
      provider,
      model: '',
      requestCount: 0,
      successRate: 1.0,
      averageLatency: 0,
      averageCost: 0,
      totalCost: 0,
      lastUsed: new Date(),
      healthStatus: 'healthy',
    };

    this.providerMetrics.set(provider, metrics);
  }

  private async selectBestProvider(preferredProvider?: AIProvider, taskType?: string): Promise<{ provider: AIProvider; model: string }> {
    // If provider is specified and available, use it
    if (preferredProvider && this.providers.has(preferredProvider)) {
      const config = this.providerConfigs.get(preferredProvider);
      return {
        provider: preferredProvider,
        model: config?.defaultModel || 'default',
      };
    }

    // Select best provider based on task type and performance metrics
    const availableProviders = Array.from(this.providers.keys());

    if (availableProviders.length === 0) {
      throw new Error('No AI providers are available');
    }

    // Provider selection logic based on task type and metrics
    let selectedProvider = availableProviders[0];
    let bestScore = -1;

    for (const provider of availableProviders) {
      const metrics = this.providerMetrics.get(provider);
      const config = this.providerConfigs.get(provider);

      if (!metrics || !config) continue;

      // Calculate score based on health, performance, and cost
      let score = 0;

      // Health factor (40% weight)
      if (metrics.healthStatus === 'healthy') score += 40;
      else if (metrics.healthStatus === 'degraded') score += 20;

      // Success rate factor (30% weight)
      score += metrics.successRate * 30;

      // Cost factor (20% weight) - lower cost is better
      if (metrics.averageCost > 0) {
        score += Math.max(0, 20 - (metrics.averageCost * 1000)); // Normalize to 0-20
      } else {
        score += 10; // Default for new providers
      }

      // Latency factor (10% weight) - lower latency is better
      if (metrics.averageLatency > 0) {
        score += Math.max(0, 10 - (metrics.averageLatency / 1000)); // Normalize to 0-10
      } else {
        score += 5; // Default for new providers
      }

      // Task type specific adjustments
      if (taskType === 'code-analysis' && provider === AIProvider.DEEPSEEK) {
        score += 10; // DeepSeek is good for code
      }
      if (taskType === 'text-generation' && provider === AIProvider.ANTHROPIC) {
        score += 5; // Anthropic has good text quality
      }

      if (score > bestScore) {
        bestScore = score;
        selectedProvider = provider;
      }
    }

    const config = this.providerConfigs.get(selectedProvider);
    return {
      provider: selectedProvider,
      model: config?.defaultModel || 'default',
    };
  }

  private async generateTextWithProvider(provider: AIProvider, model: string, dto: GenerateTextDto): Promise<AIResponse> {
    const startTime = Date.now();

    switch (provider) {
      case AIProvider.OPENAI:
        return await this.generateWithOpenAI(model, dto);
      case AIProvider.ANTHROPIC:
        return await this.generateWithAnthropic(model, dto);
      case AIProvider.DEEPSEEK:
        return await this.generateWithDeepSeek(model, dto);
      default:
        throw new Error(`Provider ${provider} not implemented`);
    }
  }

  private async generateWithOpenAI(model: string, dto: GenerateTextDto): Promise<AIResponse> {
    const openai = this.providers.get(AIProvider.OPENAI) as OpenAI;

    const messages: any[] = [];
    if (dto.systemPrompt) {
      messages.push({ role: 'system', content: dto.systemPrompt });
    }
    messages.push({ role: 'user', content: dto.prompt });

    const response = await openai.chat.completions.create({
      model,
      messages,
      max_tokens: dto.maxTokens,
      temperature: dto.temperature,
      stop: dto.stop,
    });

    return {
      content: response.choices[0].message.content,
      role: 'assistant',
      metadata: {
        provider: AIProvider.OPENAI,
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        cost: await this.calculateCost(AIProvider.OPENAI, model, response.usage),
        latency: 0, // Will be set by caller
      },
    };
  }

  private async generateWithAnthropic(model: string, dto: GenerateTextDto): Promise<AIResponse> {
    const anthropic = this.providers.get(AIProvider.ANTHROPIC) as Anthropic;

    const messages: any[] = [];
    if (dto.systemPrompt) {
      // Anthropic handles system messages differently
      messages.push({ role: 'user', content: `${dto.systemPrompt}\n\n${dto.prompt}` });
    } else {
      messages.push({ role: 'user', content: dto.prompt });
    }

    const response = await anthropic.messages.create({
      model,
      messages,
      max_tokens: dto.maxTokens,
      temperature: dto.temperature,
    });

    return {
      content: response.content[0].text,
      role: 'assistant',
      metadata: {
        provider: AIProvider.ANTHROPIC,
        model,
        usage: {
          promptTokens: response.usage.input_tokens,
          completionTokens: response.usage.output_tokens,
          totalTokens: response.usage.input_tokens + response.usage.output_tokens,
        },
        cost: await this.calculateCost(AIProvider.ANTHROPIC, model, response.usage),
        latency: 0,
      },
    };
  }

  private async generateWithDeepSeek(model: string, dto: GenerateTextDto): Promise<AIResponse> {
    // DeepSeek uses OpenAI-compatible API
    const deepseek = this.providers.get(AIProvider.DEEPSEEK) as OpenAI;

    const messages: any[] = [];
    if (dto.systemPrompt) {
      messages.push({ role: 'system', content: dto.systemPrompt });
    }
    messages.push({ role: 'user', content: dto.prompt });

    const response = await deepseek.chat.completions.create({
      model,
      messages,
      max_tokens: dto.maxTokens,
      temperature: dto.temperature,
    });

    return {
      content: response.choices[0].message.content,
      role: 'assistant',
      metadata: {
        provider: AIProvider.DEEPSEEK,
        model,
        usage: {
          promptTokens: response.usage?.prompt_tokens || 0,
          completionTokens: response.usage?.completion_tokens || 0,
          totalTokens: response.usage?.total_tokens || 0,
        },
        cost: await this.calculateCost(AIProvider.DEEPSEEK, model, response.usage),
        latency: 0,
      },
    };
  }

  private async generateImageWithProvider(provider: AIProvider, model: string, dto: GenerateImageDto): Promise<any> {
    // Placeholder for image generation
    return {
      images: ['data:image/png;base64,mock-image-data'],
      metadata: {
        provider,
        model,
        size: dto.size,
        style: dto.style,
      },
    };
  }

  private async analyzeCodeWithProvider(provider: AIProvider, model: string, dto: AnalyzeCodeDto): Promise<any> {
    // Placeholder for code analysis
    return {
      analysis: {
        security: ['No obvious vulnerabilities'],
        performance: ['Consider optimizing loops'],
        quality: ['Code follows best practices'],
      },
      suggestions: ['Add input validation', 'Implement error handling'],
      confidence: 0.85,
    };
  }

  private async generateFunctionWithProvider(provider: AIProvider, model: string, dto: GenerateFunctionDto): Promise<any> {
    // Placeholder for function generation
    return {
      code: `function generatedFunction(input) {\n  // Generated code\n  return processedInput;\n}`,
      explanation: 'This function processes the input according to the specified requirements.',
      examples: [
        { input: 'test', output: 'processed-test' },
      ],
    };
  }

  private async chatWithProvider(dto: ChatMessageDto): Promise<AIResponse> {
    // Placeholder for chat functionality
    return {
      content: 'This is a mock chat response.',
      role: 'assistant',
      metadata: {
        provider: AIProvider.OPENAI,
        model: 'gpt-3.5-turbo',
        usage: { promptTokens: 50, completionTokens: 100, totalTokens: 150 },
        cost: 0.003,
        latency: 500,
      },
    };
  }

  private async trackUsage(provider: AIProvider, model: string, taskType: string, usage: any, latency: number): Promise<void> {
    try {
      const cost = await this.calculateCost(provider, model, usage);

      await this.prisma.tokenUsage.create({
        data: {
          timestamp: new Date(),
          provider: provider,
          model: model,
          tokens: usage.totalTokens,
          costUsd: cost,
          taskType: taskType,
          optimized: false,
          metadata: {
            latency,
            taskType,
          },
        },
      });

      // Update provider metrics
      const metrics = this.providerMetrics.get(provider);
      if (metrics) {
        metrics.requestCount++;
        metrics.averageLatency = (metrics.averageLatency + latency) / 2;
        metrics.totalCost += cost;
        metrics.lastUsed = new Date();
        metrics.model = model;
      }

    } catch (error) {
      this.logger.error('❌ Failed to track usage:', error);
    }
  }

  private async calculateCost(provider: AIProvider, model: string, usage: any): Promise<number> {
    const costPerToken = this.getCostPerToken(provider, model);
    return (usage.totalTokens || 0) * costPerToken;
  }

  private getCostPerToken(provider: AIProvider, model: string): number {
    const costs: Record<string, Record<string, number>> = {
      [AIProvider.OPENAI]: {
        'gpt-4': 0.00003,
        'gpt-4-turbo': 0.00001,
        'gpt-3.5-turbo': 0.0000015,
      },
      [AIProvider.ANTHROPIC]: {
        'claude-3-opus-20240229': 0.000075,
        'claude-3-sonnet-20240229': 0.000015,
        'claude-3-haiku-20240307': 0.00000125,
      },
      [AIProvider.DEEPSEEK]: {
        'deepseek-coder': 0.0000028,
        'deepseek-chat': 0.0000028,
      },
    };

    return costs[provider]?.[model] || 0.00001; // Default cost
  }

  private estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token for English text
    return Math.ceil(text.length / 4);
  }

  private inferTaskType(request: BulkAIPayload): string {
    return request.type.replace('-', '-');
  }

  private async startHealthMonitoring(): Promise<void> {
    if (!this.fallbackConfig.failover?.enabled) return;

    setInterval(async () => {
      for (const [provider, client] of this.providers.entries()) {
        try {
          // Health check - simple ping to provider
          await this.pingProvider(provider);

          const metrics = this.providerMetrics.get(provider);
          if (metrics) {
            metrics.healthStatus = 'healthy';
          }
        } catch (error) {
          this.logger.warn(`⚠️ Health check failed for ${provider}:`, error.message);

          const metrics = this.providerMetrics.get(provider);
          if (metrics) {
            metrics.healthStatus = 'unhealthy';
          }
        }
      }
    }, this.fallbackConfig.failover.healthCheckInterval);
  }

  private async pingProvider(provider: AIProvider): Promise<void> {
    // Simple health check - could be enhanced
    const config = this.providerConfigs.get(provider);
    if (!config?.apiKey) {
      throw new Error('No API key configured');
    }
  }

  private async generateTextWithFallback(dto: GenerateTextDto): Promise<AIResponse> {
    const fallbackProviders = this.fallbackConfig.providers
      .filter(p => this.providers.has(p.provider))
      .sort((a, b) => a.priority - b.priority);

    for (const { provider } of fallbackProviders) {
      try {
        const { provider: selectedProvider, model } = await this.selectBestProvider(provider);
        return await this.generateTextWithProvider(selectedProvider, model, dto);
      } catch (error) {
        this.logger.warn(`⚠️ Fallback provider ${provider} failed:`, error.message);
        continue;
      }
    }

    throw new Error('All AI providers failed');
  }

  private determineComparisonWinner(comparison: any[]): { provider: AIProvider; model: string; reason: string } {
    if (comparison.length === 0) {
      throw new Error('No comparison data available');
    }

    // Weighted scoring for winner selection
    let bestScore = -1;
    let winner = comparison[0];

    for (const item of comparison) {
      // Score based on cost (40%), latency (30%), and quality (30%)
      let score = 0;

      // Cost score (lower is better)
      const costScore = Math.max(0, 40 - (item.cost * 1000));
      score += costScore;

      // Latency score (lower is better)
      const latencyScore = Math.max(0, 30 - (item.latency / 100));
      score += latencyScore;

      // Quality score (higher is better)
      const qualityScore = item.quality ? item.quality * 30 : 15; // Default if no quality score
      score += qualityScore;

      if (score > bestScore) {
        bestScore = score;
        winner = item;
      }
    }

    return {
      provider: winner.provider,
      model: winner.model,
      reason: `Best overall performance with cost $${winner.cost.toFixed(4)}, ${winner.latency}ms latency${winner.quality ? `, quality score ${winner.quality}` : ''}`,
    };
  }

  private async assessResponseQuality(response: string): Promise<number> {
    // Simple quality assessment - could be enhanced with NLP
    const length = response.length;
    const hasStructure = response.includes('\n') || response.includes('.');
    const isComplete = response.trim().endsWith('.') || response.trim().endsWith('}');

    let score = 0.5; // Base score

    if (length > 50 && length < 2000) score += 0.2; // Good length
    if (hasStructure) score += 0.2; // Has structure
    if (isComplete) score += 0.1; // Complete sentence

    return Math.min(score, 1.0);
  }

  private async getAvailableModels(provider: AIProvider): Promise<string[]> {
    const config = this.providerConfigs.get(provider);
    return config?.supportedModels || [config?.defaultModel || 'default'];
  }

  async onModuleDestroy() {
    await this.prisma.$disconnect();
  }
}
