import { Injectable, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { OpenAI } from 'openai';

import {
  AIClient,
  AIResponse,
  GenerateTextDto,
  GenerateImageDto,
  AnalyzeCodeDto,
  GenerateFunctionDto,
  ChatMessageDto,
} from '../dto/ai.dto';

@Injectable()
export class OpenAIClient implements AIClient {
  readonly name: string = 'openai';
  private readonly logger = new Logger(OpenAIClient.name);

  constructor(
    private readonly openai: OpenAI,
    private readonly prisma: PrismaClient
  ) {}

  async generateText(dto: GenerateTextDto): Promise<AIResponse> {
    const startTime = Date.now();

    try {
      // Prepare messages
      const messages = this.prepareMessages(dto);

      // Make API call
      const response = await this.openai.chat.completions.create({
        model: dto.model || 'gpt-4',
        messages,
        max_tokens: dto.maxTokens || 2000,
        temperature: dto.temperature || 0.7,
        stop: dto.stop,
        functions: dto.enableFunctions ? this.getFunctions(dto) : undefined,
        function_call: dto.enableFunctions ? 'auto' : undefined,
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Calculate cost
      const cost = this.calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        dto.model || 'gpt-4'
      );

      // Track usage
      await this.trackUsage({
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost,
        latency,
        taskType: 'text-generation',
      });

      const aiResponse: AIResponse = {
        content: response.choices[0]?.message?.content || '',
        role: 'assistant',
        metadata: {
          provider: 'openai',
          model: dto.model || 'gpt-4',
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          cost,
          latency,
        },
      };

      // Handle function calling
      if (response.choices[0]?.message?.function_call) {
        aiResponse.metadata.functionCall =
          response.choices[0].message.function_call;
      }

      this.logger.log(
        `✅ Generated text with OpenAI: ${response.usage?.total_tokens || 0} tokens, $${cost.toFixed(4)}, ${latency}ms`
      );

      return aiResponse;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('❌ OpenAI text generation failed:', error);

      throw this.handleOpenAIError(error, 'text-generation');
    }
  }

  async generateImage(dto: GenerateImageDto): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await this.openai.images.generate({
        model: 'dall-e-3',
        prompt: dto.prompt,
        n: dto.count || 1,
        size: (dto.size as any) || '1024x1024',
        quality: dto.style || 'standard',
        response_format: 'url',
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Calculate cost (approximate)
      const cost = this.calculateImageCost(
        dto.size || '1024x1024',
        dto.count || 1
      );

      // Track usage
      await this.trackUsage({
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost,
        latency,
        taskType: 'image-generation',
      });

      this.logger.log(
        `✅ Generated image with OpenAI: ${response.data.length} images, $${cost.toFixed(4)}, ${latency}ms`
      );

      return {
        images: response.data,
        metadata: {
          provider: 'openai',
          model: 'dall-e-3',
          cost,
          latency,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('❌ OpenAI image generation failed:', error);

      throw this.handleOpenAIError(error, 'image-generation');
    }
  }

  async analyzeCode(dto: AnalyzeCodeDto): Promise<any> {
    const startTime = Date.now();

    try {
      // Prepare specialized prompt for code analysis
      const systemPrompt = this.getAnalysisSystemPrompt(dto.analysisType);
      const userPrompt = `Analyze the following ${dto.language || 'code'} for ${dto.analysisType}:

\`\`\`code
${dto.code}
\`\`\`

Provide a detailed analysis including findings, recommendations, and code examples where applicable.`;

      const messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ];

      if (dto.systemPrompt) {
        messages[0].content = `${systemPrompt}\n\n${dto.systemPrompt}`;
      }

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4', // Best for code analysis
        messages,
        max_tokens: dto.maxTokens || 3000,
        temperature: 0.3, // Lower temperature for more consistent analysis
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Calculate cost
      const cost = this.calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        'gpt-4'
      );

      // Track usage
      await this.trackUsage({
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost,
        latency,
        taskType: 'code-analysis',
      });

      const result = {
        analysis: response.choices[0]?.message?.content || '',
        metadata: {
          provider: 'openai',
          model: 'gpt-4',
          analysisType: dto.analysisType,
          language: dto.language,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          cost,
          latency,
        },
      };

      this.logger.log(
        `✅ Analyzed code with OpenAI: ${dto.analysisType}, ${response.usage?.totalTokens || 0} tokens, $${cost.toFixed(4)}, ${latency}ms`
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('❌ OpenAI code analysis failed:', error);

      throw this.handleOpenAIError(error, 'code-analysis');
    }
  }

  async generateFunction(dto: GenerateFunctionDto): Promise<any> {
    const startTime = Date.now();

    try {
      const systemPrompt = `You are a helpful assistant that generates functions with clear, well-documented code.

For the following task: "${dto.taskDescription}"

${
  dto.example
    ? `Example usage:
${dto.example}`
    : ''
}

${
  dto.parameters
    ? `Parameters format:
${dto.parameters}`
    : ''
}

Generate a complete function with proper error handling, input validation, and documentation. Return only the function code in valid JSON format.`;

      const messages = [{ role: 'system', content: systemPrompt }];

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages,
        max_tokens: dto.maxTokens || 2000,
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });

      const endTime = Date.now();
      const latency = endTime - startTime;

      // Calculate cost
      const cost = this.calculateCost(
        response.usage?.prompt_tokens || 0,
        response.usage?.completion_tokens || 0,
        'gpt-4'
      );

      // Track usage
      await this.trackUsage({
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
        cost,
        latency,
        taskType: 'function-generation',
      });

      const result = {
        function: JSON.parse(response.choices[0]?.message?.content || '{}'),
        metadata: {
          provider: 'openai',
          model: 'gpt-4',
          taskDescription: dto.taskDescription,
          outputFormat: dto.outputFormat,
          usage: {
            promptTokens: response.usage?.prompt_tokens || 0,
            completionTokens: response.usage?.completion_tokens || 0,
            totalTokens: response.usage?.total_tokens || 0,
          },
          cost,
          latency,
        },
      };

      this.logger.log(
        `✅ Generated function with OpenAI: ${dto.taskDescription}, ${response.usage?.totalTokens || 0} tokens, $${cost.toFixed(4)}, ${latency}ms`
      );

      return result;
    } catch (error) {
      const endTime = Date.now();
      this.logger.error('❌ OpenAI function generation failed:', error);

      throw this.handleOpenAIError(error, 'function-generation');
    }
  }

  async getModels(): Promise<
    Array<{
      id: string;
      name: string;
      description: string;
      capabilities: string[];
      contextWindow: number;
      maxTokens: number;
      inputCostPer1k: number;
      outputCostPer1k: number;
    }>
  > {
    return [
      {
        id: 'gpt-4',
        name: 'GPT-4',
        description: 'Most capable model, complex instructions, multi-modal',
        capabilities: [
          'chat',
          'completion',
          'vision',
          'function_calling',
          'code-generation',
        ],
        contextWindow: 128000,
        maxTokens: 8192,
        inputCostPer1k: 0.03,
        outputCostPer1k: 0.06,
      },
      {
        id: 'gpt-4-turbo',
        name: 'GPT-4 Turbo',
        description: 'Faster, cheaper version of GPT-4',
        capabilities: [
          'chat',
          'completion',
          'function_calling',
          'code-generation',
        ],
        contextWindow: 128000,
        maxTokens: 4096,
        inputCostPer1k: 0.01,
        outputCostPer1k: 0.03,
      },
      {
        id: 'gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        description: 'Fastest, cheapest model for simple tasks',
        capabilities: ['chat', 'completion', 'function_calling'],
        contextWindow: 16385,
        maxTokens: 4096,
        inputCostPer1k: 0.0005,
        outputCostPer1k: 0.0015,
      },
      {
        id: 'text-embedding-ada-002',
        name: 'Text Embedding Ada v2',
        description: 'Fast and cost-effective text embeddings',
        capabilities: ['embedding'],
        contextWindow: 8192,
        maxTokens: 8192,
        inputCostPer1k: 0.0001,
        outputCostPer1k: 0,
      },
      {
        id: 'dall-e-3',
        name: 'DALL·E 3',
        description: 'Image generation model',
        capabilities: ['image-generation'],
        contextWindow: 0,
        maxTokens: 0,
        inputCostPer1k: 0.04, // Per image
        outputCostPer1k: 0,
      },
    ];
  }

  async getStats(): Promise<any> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const usage = await this.prisma.aIUsage.findMany({
      where: {
        provider: 'openai',
        timestamp: { gte: oneHourAgo },
      },
    });

    return {
      provider: 'openai',
      timeRange: '1h',
      totalRequests: usage.length,
      totalTokens: usage.reduce((sum, u) => sum + (u.totalTokens || 0), 0),
      totalCost: usage.reduce(
        (sum, u) => sum + parseFloat(u.costUsd as any),
        0
      ),
      averageLatency:
        usage.length > 0
          ? usage.reduce((sum, u) => sum + (u.metadata?.latency || 0), 0) /
            usage.length
          : 0,
      errorRate:
        (usage.filter(u => u.status === 'failed').length / usage.length) * 100,
      modelBreakdown: usage.reduce((acc, u) => {
        if (!acc[u.model || 'unknown'])
          acc[u.model || 'unknown'] = { tokens: 0, cost: 0, requests: 0 };
        acc[u.model || 'unknown'].tokens += u.totalTokens || 0;
        acc[u.model || 'unknown'].cost += parseFloat(u.costUsd as any);
        acc[u.model || 'unknown'].requests += 1;
        return acc;
      }, {}),
      recentRequests: usage.slice(0, 10).map(u => ({
        timestamp: u.timestamp,
        taskType: u.taskType,
        tokens: u.totalTokens,
        cost: parseFloat(u.costUsd as any),
        latency: u.metadata?.latency,
        status: u.status,
      })),
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Simple health check - list models
      await this.openai.models.list();
      return true;
    } catch (error) {
      this.logger.error('OpenAI health check failed:', error);
      return false;
    }
  }

  private prepareMessages(dto: GenerateTextDto): any[] {
    const messages: any[] = [];

    // Add system prompt
    if (dto.systemPrompt) {
      messages.push({ role: 'system', content: dto.systemPrompt });
    }

    // Add user prompt
    messages.push({ role: 'user', content: dto.prompt });

    // Add context if provided
    if (dto.context) {
      const contextStr = `Context: ${JSON.stringify(dto.context, null, 2)}`;
      messages.push({ role: 'system', content: contextStr });
    }

    return messages;
  }

  private getFunctions(dto: GenerateTextDto): any[] {
    // Define available functions based on context
    const functions = [];

    if (dto.context?.projectId) {
      // Project-related functions
      functions.push({
        name: 'get_project_info',
        description: 'Get information about the current project',
        parameters: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
          },
          required: ['projectId'],
        },
      });

      functions.push({
        name: 'list_project_files',
        description: 'List files in the project',
        parameters: {
          type: 'object',
          properties: {
            projectId: {
              type: 'string',
              description: 'Project ID',
            },
            fileType: {
              type: 'string',
              description: 'File type filter (optional)',
              enum: ['ts', 'js', 'md', 'json'],
            },
          },
          required: ['projectId'],
        },
      });
    }

    return functions;
  }

  private getAnalysisSystemPrompt(analysisType: string): string {
    const prompts = {
      security: `You are a security expert. Analyze code for security vulnerabilities, authentication flaws, authorization issues, input validation problems, and other security concerns. Provide specific recommendations with examples.`,
      performance: `You are a performance optimization expert. Analyze code for performance bottlenecks, inefficient algorithms, memory leaks, database query issues, and other performance concerns. Provide specific optimization suggestions with examples.`,
      quality: `You are a code quality expert. Analyze code for best practices violations, code smells, maintainability issues, naming conventions, and overall code quality. Provide specific improvement suggestions with examples.`,
      'best-practices': `You are a software architecture expert. Analyze code for architectural best practices, design patterns, SOLID principles, and structural issues. Provide specific recommendations with examples.`,
      complexity: `You are a code complexity expert. Analyze code for complexity metrics, cyclomatic complexity, cognitive load, and maintenance difficulty. Provide specific simplification suggestions with examples.`,
    };

    return prompts[analysisType] || prompts['quality'];
  }

  private calculateCost(
    promptTokens: number,
    completionTokens: number,
    model: string
  ): number {
    const costs: Record<
      string,
      { inputCostPer1k: number; outputCostPer1k: number }
    > = {
      'gpt-4': { inputCostPer1k: 0.03, outputCostPer1k: 0.06 },
      'gpt-4-turbo': { inputCostPer1k: 0.01, outputCostPer1k: 0.03 },
      'gpt-3.5-turbo': { inputCostPer1k: 0.0005, outputCostPer1k: 0.0015 },
    };

    const modelCost = costs[model] || costs['gpt-4'];
    const inputCost = (promptTokens / 1000) * modelCost.inputCostPer1k;
    const outputCost = (completionTokens / 1000) * modelCost.outputCostPer1k;

    return inputCost + outputCost;
  }

  private calculateImageCost(size: string, count: number): number {
    const costs = {
      '256x256': 0.02,
      '512x512': 0.018,
      '1024x1024': 0.04,
    };

    const sizeCost = costs[size] || costs['1024x1024'];
    return sizeCost * count;
  }

  private async trackUsage(usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost: number;
    latency: number;
    taskType: string;
  }): Promise<void> {
    try {
      await this.prisma.aIUsage.create({
        data: {
          timestamp: new Date(),
          provider: 'openai',
          taskType: usage.taskType,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          costUsd: usage.cost.toString(),
          status: 'success',
          metadata: {
            latency: usage.latency,
            processingTime: usage.latency,
          },
        },
      });
    } catch (error) {
      this.logger.error('Failed to track OpenAI usage:', error);
    }
  }

  private handleOpenAIError(error: any, operation: string): Error {
    // OpenAI errors have specific structure
    if (error.status) {
      const message =
        error.error?.message || error.message || 'Unknown OpenAI error';
      const status = error.status;

      this.logger.error(
        `OpenAI ${operation} error (${status}): ${message}`,
        error
      );

      if (status === 429) {
        return new Error(`Rate limit exceeded for OpenAI: ${message}`);
      } else if (status === 401) {
        return new Error(`Authentication failed for OpenAI: ${message}`);
      } else if (status === 403) {
        return new Error(`Insufficient quota for OpenAI: ${message}`);
      } else if (status === 400) {
        return new Error(`Invalid request for OpenAI: ${message}`);
      } else {
        return new Error(`OpenAI API error (${status}): ${message}`);
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return new Error('Cannot connect to OpenAI service');
    } else {
      this.logger.error(`Unknown OpenAI error in ${operation}:`, error);
      return new Error(`OpenAI operation failed: ${error.message}`);
    }
  }
}
