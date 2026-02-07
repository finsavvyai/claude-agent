import { Injectable, Logger, ConflictException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

import { AIProvider } from '../dto/ai.dto';

// Import AI provider libraries (these would be added as npm dependencies)
// import Anthropic from '@anthropic-ai';
// import DeepSeek from 'deepseek-ai';
// import { GoogleGenerativeAI } from '@google/generative-ai';

interface AIClient {
  name: AIProvider;
  generateText(dto: any): Promise<any>;
  generateImage(dto: any): Promise<any>;
  analyzeCode(dto: any): Promise<any>;
  getModels(): Promise<any[]>;
  getStats(): Promise<any>;
  isAvailable(): Promise<boolean>;
}

export interface ProviderConfig {
  apiKey: string;
  baseUrl?: string;
  timeout: number;
  maxRetries: number;
  rateLimitPerMinute?: number;
  defaultModel?: string;
  supportedModels: string[];
}

@Injectable()
export class AIPortalService {
  private readonly logger = new Logger(AIPortalService.name);
  private readonly prisma: PrismaClient;
  private readonly clients: Map<AIProvider, AIClient> = new Map();
  private readonly configs: Map<AIProvider, ProviderConfig> = new Map();
  private readonly failoverConfigs: Map<AIProvider, ProviderFallbackConfig[]> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  async onModuleInit() {
    await this.initializeProviders();
    this.logger.log('✅ AI Portal Service initialized');
  }

  async initializeProviders(): Promise<void> {
    try {
      // Initialize provider configurations
      await this.loadProviderConfigs();

      // Initialize AI clients
      await this.initializeClients();

      // Setup health monitoring
      this.startHealthMonitoring();

    } catch (error) {
      this.logger.error('❌ Failed to initialize AI providers:', error);
      throw new InternalServerErrorException('Failed to initialize AI providers');
    }
  }

  private async loadProviderConfigs(): Promise<void> {
    // Load configurations from database or environment
    const savedConfigs = await this.prisma.aIProviderConfig.findMany();

    for (const config of savedConfigs) {
      this.configs.set(config.provider, {
        apiKey: config.apiKey,
        baseUrl: config.baseUrl,
        timeout: config.timeout,
        maxRetries: config.maxRetries,
        rateLimitPerMinute: config.rateLimitPerMinute,
        defaultModel: config.defaultModel,
        supportedModels: config.supportedModels as string[],
      });
    }

    // Set default configurations from environment if not in database
    await this.setDefaultConfigs();
  }

  private async setDefaultConfigs(): Promise<void> {
    const defaultProviders = [AIProvider.OPENAI, AIProvider.ANTHROPIC];

    for (const provider of defaultProviders) {
      if (!this.configs.has(provider)) {
        const envKey = `AI_${provider.toUpperCase()}_API_KEY`;
        const apiKey = this.configService.get(envKey);

        if (apiKey) {
          this.configs.set(provider, this.getDefaultConfig(provider, apiKey));
        }
      }
    }
  }

  private getDefaultConfig(provider: AIProvider, apiKey: string): ProviderConfig {
    switch (provider) {
      case AIProvider.OPENAI:
        return {
          apiKey,
          timeout: 30000,
          maxRetries: 3,
          rateLimitPerMinute: 60,
          defaultModel: 'gpt-4',
          supportedModels: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo', 'text-embedding-ada-002'],
        };

      case AIProvider.ANTHROPIC:
        return {
          apiKey,
          timeout: 30000,
          maxRetries: 3,
          rateLimitPerMinute: 60,
          defaultModel: 'claude-3-sonnet-20240229',
          supportedModels: ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
        };

      case AIProvider.DEEPSEEK:
        return {
          apiKey,
          timeout: 30000,
          maxRetries: 3,
          rateLimitPerMinute: 60,
          defaultModel: 'deepseek-coder',
          supportedModels: ['deepseek-coder', 'deepseek-chat'],
        };

      case AIProvider.GEMINI:
        return {
          apiKey,
          timeout: 30000,
          maxRetries: 3,
          rateLimitPerMinute: 60,
          defaultModel: 'gemini-pro',
          supportedModels: ['gemini-pro', 'gemini-pro-vision'],
        };

      default:
        return {
          apiKey,
          timeout: 30000,
          maxRetries: 3,
          rateLimitPerMinute: 30,
          defaultModel: 'default',
          supportedModels: ['default'],
        };
    }
  }

  private async initializeClients(): Promise<void> {
    // Initialize OpenAI client
    if (this.configs.has(AIProvider.OPENAI)) {
      const openAIConfig = this.configs.get(AIProvider.OPENAI);

      const openai = new OpenAI({
        apiKey: openAIConfig.apiKey,
        baseURL: openAIConfig.baseUrl,
        timeout: openAIConfig.timeout,
        maxRetries: openAIConfig.maxRetries,
      });

      this.clients.set(AIProvider.OPENAI, new OpenAIClient(openai, this.prisma));
    }

    // Initialize Anthropic client (mock for now)
    if (this.configs.has(AIProvider.ANTHROPIC)) {
      // const anthropicConfig = this.configs.get(AIProvider.ANTHROPIC);
      // const anthropic = new Anthropic({ apiKey: anthropicConfig.apiKey });
      // this.clients.set(AIProvider.ANTHROPIC, new AnthropicClient(anthropic, this.prisma));

      // For now, use OpenAI as fallback
      this.logger.warn('Anthropic client not yet implemented, using OpenAI fallback');
    }

    // Initialize other providers similarly
    // This is a simplified implementation - in production you'd have full client implementations
  }

  private startHealthMonitoring(): void {
    // Check provider health every 30 seconds
    setInterval(async () => {
      await this.checkProviderHealth();
    }, 30000);
  }

  private async checkProviderHealth(): Promise<void> {
    for (const [provider, client] of this.clients) {
      try {
        const isHealthy = await client.isAvailable();
        this.logger.log(`Provider ${provider} health: ${isHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        this.logger.error(`Provider ${provider} health check failed:`, error);
      }
    }
  }

  async generateText(dto: any): Promise<any> {
    const { provider, ...rest } = dto;

    // If provider specified, use that provider
    if (provider && this.clients.has(provider)) {
      const client = this.clients.get(provider);
      try {
        const result = await client.generateText(rest);

        // Track usage
        await this.trackUsage(provider, result, 'text-generation');

        this.logger.log(`Generated text using ${provider}`);
        return result;

      } catch (error) {
        this.logger.error(`Failed to generate text with ${provider}:`, error);

        // Try failover providers
        const fallbackResult = await this.tryFailoverProviders('generateText', rest, provider);
        if (fallbackResult) {
          return fallbackResult;
        }

        throw new ConflictException(`Failed to generate text with ${provider} and failover providers`);
      }
    }

    // Auto-select best provider
    const selectedProvider = await this.selectBestProvider('text-generation', rest);
    const selectedClient = this.clients.get(selectedProvider);

    const result = await selectedClient.generateText(rest);
    await this.trackUsage(selectedProvider, result, 'text-generation');

    this.logger.log(`Auto-selected ${selectedProvider} for text generation`);
    return {
      ...result,
      metadata: {
        selectedProvider,
        reasoning: `Selected based on cost and performance`,
      },
    };
  }

  async generateImage(dto: any): Promise<any> {
    const { provider, ...rest } = dto;

    if (provider && this.clients.has(provider)) {
      const client = this.clients.get(provider);
      try {
        const result = await client.generateImage(rest);
        await this.trackUsage(provider, result, 'image-generation');
        this.logger.log(`Generated image using ${provider}`);
        return result;
      } catch (error) {
        this.logger.error(`Failed to generate image with ${provider}:`, error);
        const fallbackResult = await this.tryFailoverProviders('generateImage', rest, provider);
        if (fallbackResult) {
          return fallbackResult;
        }
        throw new ConflictException(`Failed to generate image with ${provider} and failover providers`);
      }
    }

    // Auto-select best provider for image generation
    const selectedProvider = await this.selectBestProvider('image-generation', rest);
    const selectedClient = this.clients.get(selectedProvider);

    const result = await selectedClient.generateImage(rest);
    await this.trackUsage(selectedProvider, result, 'image-generation');

    this.logger.log(`Auto-selected ${selectedProvider} for image generation`);
    return {
      ...result,
      metadata: {
        selectedProvider,
        reasoning: `Selected based on cost and capability`,
      },
    };
  }

  async analyzeCode(dto: any): Promise<any> {
    const { provider, code, analysisType, ...rest } = dto;

    if (provider && this.clients.has(provider)) {
      const client = this.clients.get(provider);
      try {
        const result = await client.analyzeCode({ code, analysisType, ...rest });
        await this.trackUsage(provider, result, 'code-analysis');
        this.logger.log(`Analyzed code using ${provider}`);
        return result;
      } catch (error) {
        this.logger.error(`Failed to analyze code with ${provider}:`, error);
        const fallbackResult = await this.tryFailoverProviders('analyzeCode', { code, analysisType, ...rest }, provider);
        if (fallbackResult) {
          return fallbackResult;
        }
        throw new ConflictException(`Failed to analyze code with ${provider} and failover providers`);
      }
    }

    // Auto-select best provider for code analysis
    const selectedProvider = await this.selectBestProvider('code-analysis', { code, analysisType, ...rest });
    const selectedClient = this.clients.get(selectedProvider);

    const result = await selectedClient.analyzeCode({ code, analysisType, ...rest });
    await this.trackUsage(selectedProvider, result, 'code-analysis');

    this.logger.log(`Auto-selected ${selectedProvider} for code analysis`);
    return {
      ...result,
      metadata: {
        selectedProvider,
        reasoning: `Selected based on analysis capability and cost`,
      },
    };
  }

  async processBulkRequest(bulkDto: any): Promise<any[]> {
    const { requests, globalProvider, priority } = bulkDto;

    const results: any[] = [];
    const errors: string[] = [];

    // Sort requests by priority if specified
    const sortedRequests = priority === 'high'
      ? requests.sort((a, b) => (b.priority || 5) - (a.priority || 5))
      : requests;

    for (const request of sortedRequests) {
      try {
        let result;

        if (globalProvider && this.clients.has(globalProvider)) {
          // Use specified global provider
          const client = this.clients.get(globalProvider);
          result = await this.processSingleRequest(client, request);
        } else {
          // Auto-select best provider for each request
          const selectedProvider = await this.selectBestProvider('bulk-request', request);
          const selectedClient = this.clients.get(selectedProvider);
          result = await this.processSingleRequest(selectedClient, request);
          result.metadata.selectedProvider = selectedProvider;
        }

        results.push(result);

      } catch (error) {
        const errorInfo = {
          requestId: request.id || 'unknown',
          error: error.message,
          provider: request.provider || 'auto-selected',
          timestamp: new Date().toISOString(),
        };
        errors.push(JSON.stringify(errorInfo));
        this.logger.error(`Failed to process request:`, error);
      }
    }

    const summary = {
      totalRequests: requests.length,
      successful: results.length,
      failed: errors.length,
      processingTime: Date.now() - bulkDto.startTime,
      errors,
    };

    this.logger.log(`Bulk processing completed: ${results.length}/${requests.length} successful`);
    return { results, summary };
  }

  async compareProviders(comparisonDto: any): Promise<any> {
    const { prompt, providers: comparisonProviders, models, maxCostPerResponse } = comparisonDto;

    const comparisonResults: any[] = [];

    for (const provider of providers) {
      if (this.clients.has(provider)) {
        try {
          const client = this.clients.get(provider);
          const result = await client.generateText({ prompt, ...comparisonDto });

          comparisonResults.push({
            provider,
            result: result.content,
            metadata: result.metadata,
            cost: result.metadata.cost || 0,
            latency: result.metadata.latency || 0,
          });
        } catch (error) {
          comparisonResults.push({
            provider,
            error: error.message,
            cost: 0,
            latency: 0,
          });
        }
      }
    }

    // Sort results by cost (lowest first)
    comparisonResults.sort((a, b) => (a.cost || 0) - (b.cost || 0));

    // Filter by max cost if specified
    const filteredResults = maxCostPerResponse
      ? comparisonResults.filter(r => (r.cost || 0) <= maxCostPerResponse)
      : comparisonResults;

    this.logger.log(`Provider comparison completed for ${filteredResults.length} providers`);
    return {
      prompt,
      results: filteredResults,
      comparison: {
        cheapest: filteredResults[0],
        fastest: filteredResults.reduce((fastest, current) =>
          (current.latency || Infinity) < (fastest.latency || Infinity) ? current : fastest
        ),
        bestValue: filteredResults.reduce((best, current) => {
          const currentValue = (current.cost || 0) / (current.latency || 1) || 1;
          const bestValue = (best.cost || 0) / (best.latency || 1) || 1;
          return currentValue < bestValue ? current : best;
        }),
      },
    };
  }

  async getProviderStats(statsDto: any): Promise<any> {
    const { provider, model, dateFrom, dateTo } = statsDto;

    const where: any = {};
    if (provider) where.provider = provider;
    if (model) where.model = model;
    if (dateFrom || dateTo) {
      where.timestamp = {};
      if (dateFrom) where.timestamp.gte = new Date(dateFrom);
      if (dateTo) where.timestamp.lte = new Date(dateTo);
    }

    const usage = await this.prisma.aIUsage.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      take: 1000,
    });

    const stats = {
      totalRequests: usage.length,
      totalCost: usage.reduce((sum, u) => sum + parseFloat(u.costUsd), 0),
      averageCost: usage.length > 0 ? usage.reduce((sum, u) => sum + parseFloat(u.costUsd), 0) / usage.length : 0,
      providerBreakdown: {},
      modelBreakdown: {},
      timeSeries: [],
      errorRate: usage.filter(u => u.status === 'failed').length / usage.length * 100,
    };

    // Calculate breakdowns
    for (const record of usage) {
      if (!stats.providerBreakdown[record.provider]) {
        stats.providerBreakdown[record.provider] = { requests: 0, cost: 0, errors: 0 };
      }
      if (!stats.modelBreakdown[record.model]) {
        stats.modelBreakdown[record.model] = { requests: 0, cost: 0, errors: 0 };
      }

      stats.providerBreakdown[record.provider].requests++;
      stats.providerBreakdown[record.provider].cost += parseFloat(record.costUsd);
      stats.providerBreakdown[record.provider].errors += record.status === 'failed' ? 1 : 0;

      stats.modelBreakdown[record.model].requests++;
      stats.modelBreakdown[record.model].cost += parseFloat(record.costUsd);
      stats.modelBreakdown[record.model].errors += record.status === 'failed' ? 1 : 0;
    }

    // Generate time series data (grouped by hour)
    const hourlyStats = new Map<string, { requests: number; cost: number }>();
    for (const record of usage) {
      const hour = new Date(record.timestamp).toISOString().slice(0, 13); // YYYY-MM-DDTHH
      if (!hourlyStats.has(hour)) {
        hourlyStats.set(hour, { requests: 0, cost: 0 });
      }
      hourlyStats.get(hour)!.requests++;
      hourlyStats.get(hour)!.cost += parseFloat(record.costUsd);
    }

    stats.timeSeries = Array.from(hourlyStats.entries()).map(([hour, data]) => ({
      hour,
      ...data,
    }));

    return stats;
  }

  async configureProvider(configDto: any): Promise<void> {
    const { provider, ...config } = configDto;

    // Validate configuration
    if (!this.validateProviderConfig(config)) {
      throw new ConflictException('Invalid provider configuration');
    }

    // Update in database
    await this.prisma.aIProviderConfig.upsert({
      where: { provider },
      create: config,
      update: config,
    });

    // Update in-memory config
    this.configs.set(provider, config);

    // Re-initialize client
    await this.initializeClients();

    this.logger.log(`✅ Configured provider: ${provider}`);
  }

  async testProvider(provider: AIProvider): Promise<any> {
    const client = this.clients.get(provider);
    if (!client) {
      throw new NotFoundException(`Provider ${provider} not configured`);
    }

    const isHealthy = await client.isAvailable();
    const models = await client.getModels();

    return {
      provider,
      status: isHealthy ? 'available' : 'unavailable',
      models: models,
      lastChecked: new Date().toISOString(),
    };
  }

  private async selectBestProvider(taskType: string, request: any): Promise<AIProvider> {
    const availableProviders = Array.from(this.clients.keys());

    // In a real implementation, you would use sophisticated selection logic
    // For now, use a simple priority-based selection

    // Priority 1: Check if any provider has specific expertise for task type
    const specializedProvider = this.getSpecializedProvider(taskType);
    if (specializedProvider && availableProviders.includes(specializedProvider)) {
      return specializedProvider;
    }

    // Priority 2: Select based on recent performance and cost
    const recentStats = await this.getRecentProviderStats();
    const bestProvider = this.selectProviderByStats(recentStats, availableProviders);
    if (bestProvider) {
      return bestProvider;
    }

    // Priority 3: Default to first available provider
    return availableProviders[0] || AIProvider.OPENAI;
  }

  private getSpecializedProvider(taskType: string): AIProvider | null {
    const specializations: Record<string, AIProvider> = {
      'text-generation': AIProvider.OPENAI,
      'code-analysis': AIProvider.OPENAI,
      'image-generation': AIProvider.OPENAI,
      'function-calling': AIProvider.OPENAI,
      'long-context': AIProvider.ANTHROPIC,
      'fast-response': AIProvider.DEEPSEEK,
      'multimodal': AIProvider.GEMINI,
    };

    return specializations[taskType] || null;
  }

  private async getRecentProviderStats(): Promise<Record<string, any>> {
    // Get usage stats for the last 24 hours
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const recentUsage = await this.prisma.aIUsage.findMany({
      where: {
        timestamp: { gte: yesterday },
      },
    });

    const stats: Record<string, any> = {};

    for (const record of recentUsage) {
      if (!stats[record.provider]) {
        stats[record.provider] = {
          totalCost: 0,
          avgLatency: 0,
          errorRate: 0,
          requestCount: 0,
        };
      }

      stats[record.provider].totalCost += parseFloat(record.costUsd);
      stats[record.provider].avgLatency = (stats[record.provider].avgLatency + (record.metadata?.latency || 0)) / 2;
      stats[record.provider].errorRate = (stats[record.provider].errorRate + (record.status === 'failed' ? 1 : 0)) / 2;
      stats[record.provider].requestCount++;
    }

    return stats;
  }

  private selectProviderByStats(stats: Record<string, any>, availableProviders: AIProvider[]): AIProvider | null {
    let bestProvider: AIProvider | null = null;
    let bestScore = -Infinity;

    for (const provider of availableProviders) {
      const providerStats = stats[provider];
      if (!providerStats) continue;

      // Calculate score based on cost, latency, and error rate
      const cost = providerStats.totalCost;
      const latency = providerStats.avgLatency;
      const errorRate = providerStats.errorRate;

      // Lower scores are better
      const score = (cost * 0.1) + (latency * 0.01) + (errorRate * 100);

      if (score < bestScore) {
        bestScore = score;
        bestProvider = provider;
      }
    }

    return bestProvider;
  }

  private async tryFailoverProviders(method: string, request: any, failedProvider: AIProvider): Promise<any> {
    const failoverProviders = this.failoverConfigs.get(failedProvider) || [];

    for (const failover of failoverProviders) {
      if (this.clients.has(failover.provider) && failover.provider !== failedProvider) {
        try {
          const client = this.clients.get(failover.provider);
          const result = await client[method](request);

          this.logger.log(`✅ Failover successful: ${failedProvider} -> ${failover.provider}`);
          return result;
        } catch (error) {
          this.logger.warn(`Failover attempt failed: ${failedProvider} -> ${failover.provider}: ${error.message}`);
        }
      }
    }

    return null;
  }

  private async processSingleRequest(client: AIClient, request: any): Promise<any> {
    switch (request.type) {
      case 'text':
        return client.generateText(request);
      case 'image':
        return client.generateImage(request);
      case 'code-analysis':
        return client.analyzeCode(request);
      case 'function-generation':
        return client.generateFunction(request);
      default:
        return client.generateText(request);
    }
  }

  private async trackUsage(provider: AIProvider, result: any, taskType: string): Promise<void> {
    try {
      await this.prisma.aIUsage.create({
        data: {
          timestamp: new Date(),
          provider,
          model: result.metadata?.model || 'unknown',
          taskType,
          promptTokens: result.metadata?.usage?.promptTokens || 0,
          completionTokens: result.metadata?.usage?.completionTokens || 0,
          totalTokens: result.metadata?.usage?.totalTokens || 0,
          costUsd: result.metadata?.cost?.toString() || '0',
          status: 'success',
          metadata: {
            ...result.metadata,
            processingTime: result.metadata?.latency || 0,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to track AI usage:', error);
    }
  }

  private validateProviderConfig(config: any): boolean {
    return (
      config.apiKey &&
      typeof config.apiKey === 'string' &&
      config.apiKey.length > 0
    );
  }

  async onModuleDestroy() {
    this.clients.clear();
    this.configs.clear();
    await this.prisma.$disconnect();
  }
}
