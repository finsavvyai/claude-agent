import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AIPortalService } from './services/ai-portal.service';
import {
  GenerateTextDto,
  GenerateImageDto,
  AnalyzeCodeDto,
  GenerateFunctionDto,
  ChatMessageDto,
  AIBulkRequestDto,
  ProviderConfigDto,
  ModelComparisonDto,
  CostAnalysisDto,
  AIProviderStatsDto
} from './dto/ai.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('ai')
@Controller('ai')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AIController {
  constructor(private readonly aiPortalService: AIPortalService) {}

  @Post('generate/text')
  @ApiOperation({ summary: 'Generate text using AI' })
  @ApiResponse({ status: 200, description: 'Text generated successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async generateText(@Body() generateTextDto: GenerateTextDto) {
    return this.aiPortalService.generateText(generateTextDto);
  }

  @Post('generate/image')
  @ApiOperation({ summary: 'Generate images using AI' })
  @ApiResponse({ status: 200, description: 'Images generated successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async generateImage(@Body() generateImageDto: GenerateImageDto) {
    return this.aiPortalService.generateImage(generateImageDto);
  }

  @Post('analyze/code')
  @ApiOperation({ summary: 'Analyze code using AI' })
  @ApiResponse({ status: 200, description: 'Code analyzed successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async analyzeCode(@Body() analyzeCodeDto: AnalyzeCodeDto) {
    return this.aiPortalService.analyzeCode(analyzeCodeDto);
  }

  @Post('generate/function')
  @ApiOperation({ summary: 'Generate functions using AI' })
  @ApiResponse({ status: 200, description: 'Function generated successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async generateFunction(@Body() generateFunctionDto: GenerateFunctionDto) {
    return this.aiPortalService.generateFunction(generateFunctionDto);
  }

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant' })
  @ApiResponse({ status: 200, description: 'Chat response generated successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async chat(@Body() chatDto: ChatMessageDto) {
    return this.aiPortalService.generateText({
      prompt: chatDto.content,
      provider: chatDto.provider,
      context: {
        sessionId: chatDto.sessionId,
        attachments: chatDto.attachments,
      },
    });
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Process multiple AI requests in bulk' })
  @ApiResponse({ status: 200, description: 'Bulk processing completed' })
  @Roles('ADMIN', 'DEVELOPER')
  async processBulkRequest(@Body() bulkDto: AIBulkRequestDto) {
    return this.aiPortalService.processBulkRequest({
      ...bulkDto,
      startTime: Date.now(),
    });
  }

  @Post('compare')
  @ApiOperation({ summary: 'Compare AI providers for a given task' })
  @ApiResponse({ status: 200, description: 'Provider comparison completed' })
  @Roles('ADMIN', 'DEVELOPER')
  async compareProviders(@Body() comparisonDto: ModelComparisonDto) {
    return this.aiPortalService.compareProviders(comparisonDto);
  }

  @Post('analyze/cost')
  @ApiOperation({ summary: 'Analyze costs across different providers' })
  @ApiResponse({ status: 200, description: 'Cost analysis completed' })
  @Roles('ADMIN', 'DEVELOPER')
  async analyzeCosts(@Body() analysisDto: CostAnalysisDto) {
    return this.aiPortalService.compareProviders({
      ...analysisDto,
      includeOptimizations: true,
    });
  }

  @Post('providers/:provider/configure')
  @ApiOperation({ summary: 'Configure AI provider settings' })
  @ApiResponse({ status: 200, description: 'Provider configured successfully' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @Roles('ADMIN')
  async configureProvider(
    @Param('provider') provider: string,
    @Body() configDto: ProviderConfigDto,
  ) {
    return this.aiPortalService.configureProvider({
      provider,
      ...configDto,
    });
  }

  @Get('providers/:provider/test')
  @ApiOperation({ summary: 'Test AI provider connectivity' })
  @ApiResponse({ status: 200, description: 'Provider test completed' })
  @ApiResponse({ status: 404, description: 'Provider not found' })
  @Roles('ADMIN', 'DEVELOPER')
  async testProvider(@Param('provider') provider: string) {
    return this.aiPortalService.testProvider(provider as any);
  }

  @Get('providers/:provider/models')
  @ApiOperation({ summary: 'Get available models for a provider' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async getProviderModels(@Param('provider') provider: string) {
    // This would be implemented to get models for a specific provider
    return { message: 'Provider models retrieval not yet implemented' };
  }

  @Get('providers')
  @ApiOperation({ summary: 'Get list of configured AI providers' })
  @ApiResponse({ status: 200, description: 'Providers retrieved successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async getProviders() {
    // This would be implemented to list all configured providers
    return {
      providers: ['openai', 'anthropic', 'deepseek', 'gemini'],
      configured: ['openai'], // Actually configured
      available: ['openai'], // Currently available
    };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get AI usage statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getStats(@Query() statsDto: AIProviderStatsDto) {
    return this.aiPortalService.getProviderStats(statsDto);
  }

  @Get('stats/summary')
  @ApiOperation({ summary: 'Get AI usage summary (last 24 hours)' })
  @ApiResponse({ status: 200, description: 'Summary retrieved successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async getStatsSummary() {
    return this.aiPortalService.getProviderStats({
      dateFrom: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      dateTo: new Date().toISOString(),
    });
  }

  @Get('cost-optimization')
  @ApiOperation({ summary: 'Get cost optimization recommendations' })
  @ApiResponse({ status: 200, description: 'Optimization recommendations retrieved' })
  @Roles('ADMIN', 'DEVELOPER')
  async getCostOptimizations() {
    // This would be implemented to provide optimization recommendations
    return {
      message: 'Cost optimization recommendations not yet implemented',
      suggestions: [
        'Use gpt-3.5-turbo for simple text generation',
        'Enable response streaming for long generations',
        'Use smaller context windows when possible',
      ],
    };
  }

  @Get('health')
  @ApiOperation({ summary: 'Check AI portal health status' })
  @ApiResponse({ status: 200, description: 'Health status retrieved' })
  async getHealth() {
    // This would be implemented to check health of all providers
    return {
      status: 'healthy',
      providers: {
        openai: { status: 'available', latency: 234 },
        anthropic: { status: 'not_configured' },
        deepseek: { status: 'not_configured' },
        gemini: { status: 'not_configured' },
      },
      lastCheck: new Date().toISOString(),
    };
  }

  @Get('models')
  @ApiOperation({ summary: 'Get all available models across providers' })
  @ApiResponse({ status: 200, description: 'Models retrieved successfully' })
  async getModels() {
    // This would be implemented to get all available models
    return {
      message: 'All models retrieval not yet implemented',
      providers: {
        openai: ['gpt-4', 'gpt-4-turbo', 'gpt-3.5-turbo'],
        anthropic: ['claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
        deepseek: ['deepseek-coder', 'deepseek-chat'],
        gemini: ['gemini-pro', 'gemini-pro-vision'],
      },
    };
  }

  @Get('capabilities')
  @ApiOperation({ summary: 'Get AI capabilities matrix' })
  @ApiResponse({ status: 200, description: 'Capabilities retrieved successfully' })
  async getCapabilities() {
    return {
      capabilities: {
        'text-generation': ['openai', 'anthropic', 'deepseek', 'gemini'],
        'image-generation': ['openai'],
        'code-analysis': ['openai', 'deepseek'],
        'function-calling': ['openai', 'anthropic'],
        'vision': ['openai', 'gemini'],
        'long-context': ['anthropic', 'openai'],
        'streaming': ['openai', 'anthropic', 'deepseek'],
      },
      recommendations: {
        'text-generation': 'openai (gpt-4-turbo)',
        'image-generation': 'openai (dall-e-3)',
        'code-analysis': 'openai (gpt-4)',
        'cost-optimized': 'deepseek (deepseek-coder)',
        'fast-response': 'anthropic (claude-3-haiku)',
      },
    };
  }
}
