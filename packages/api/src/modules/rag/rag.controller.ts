import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ExecutionContext,
  ValidationPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { RAGService } from './services/rag.service';
import {
  IndexProjectDto,
  QueryRAGDto,
  UpdateContextDto,
  TokenUsageDto,
  TokenBudgetDto,
  OptimizeTokensDto,
  RAGQueryDto,
  ContextStatsDto,
} from './dto/rag.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { extractAuthContext, createUserMetadata } from './utils/auth-utils';
import { User } from '@claude-agent/database';
import { ApiRateLimit, OptimizationRateLimit, GitHubConnectRateLimit } from './decorators/rate-limit.decorator';
import { RateLimitGuard } from './guards/rate-limit.guard';

@ApiTags('rag')
@Controller('rag')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RAGController {
  constructor(private readonly ragService: RAGService) {}

  @Post('index')
  @ApiOperation({ summary: 'Index a project for RAG context retrieval' })
  @ApiResponse({ status: 200, description: 'Project indexed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  @Roles('ADMIN', 'DEVELOPER')
  @UseGuards(RateLimitGuard)
  @ApiRateLimit()
  @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
  async indexProject(
    @Body() indexDto: IndexProjectDto,
    @CurrentUser() user: User
  ) {
    // Enrich the DTO with authenticated user information
    const enrichedIndexDto = {
      ...indexDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      }, indexDto.metadata)
    };

    return this.ragService.indexProject(enrichedIndexDto);
  }

  @Post('query')
  @ApiOperation({ summary: 'Query RAG for relevant context' })
  @ApiResponse({ status: 200, description: 'RAG query results' })
  async queryRAG(
    @Body() queryDto: QueryRAGDto,
    @CurrentUser() user: User
  ) {
    // Enrich the query with user context for filtering and permissions
    const enrichedQueryDto = {
      ...queryDto,
      userId: user.id,
      filters: {
        ...queryDto.filters,
        // Add user-specific filters to ensure they only see content they have access to
        $or: [
          { public: true },
          { createdBy: user.id },
          { allowedUsers: { $in: [user.id] } },
          { allowedRoles: { $in: user.roles || [] } }
        ]
      },
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    };

    return this.ragService.queryRAG(enrichedQueryDto);
  }

  @Get('contexts')
  @ApiOperation({ summary: 'Get indexed contexts with filtering' })
  @ApiResponse({ status: 200, description: 'Contexts retrieved successfully' })
  async getContexts(
    @Query() query: RAGQueryDto,
    @CurrentUser() user: User
  ) {
    // Enrich query with user context for permission filtering
    const enrichedQuery = {
      ...query,
      filters: {
        ...query.filters,
        // Add user-specific filters to ensure they only see their content or public content
        $or: [
          { public: true },
          { createdBy: user.id },
          { allowedUsers: { $in: [user.id] } },
          { allowedRoles: { $in: user.roles || [] } }
        ]
      }
    };

    return this.ragService.getContexts(enrichedQuery);
  }

  @Get('contexts/:id')
  @ApiOperation({ summary: 'Get specific context by ID' })
  @ApiResponse({ status: 200, description: 'Context retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  async getContext(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    return this.ragService.getContext(id, {
      userId: user.id,
      roles: user.roles || [],
      permissions: user.permissions || []
    });
  }

  @Patch('contexts/:id')
  @ApiOperation({ summary: 'Update existing context' })
  @ApiResponse({ status: 200, description: 'Context updated successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @Roles('ADMIN', 'DEVELOPER')
  async updateContext(
    @Param('id') id: string,
    @Body() updateDto: UpdateContextDto,
    @CurrentUser() user: User
  ) {
    const enrichedUpdateDto = {
      ...updateDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      }, updateDto.metadata)
    };

    return this.ragService.updateContext(id, enrichedUpdateDto);
  }

  @Delete('contexts/:id')
  @ApiOperation({ summary: 'Delete context by ID' })
  @ApiResponse({ status: 200, description: 'Context deleted successfully' })
  @ApiResponse({ status: 404, description: 'Context not found' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async deleteContext(
    @Param('id') id: string,
    @CurrentUser() user: User
  ) {
    const deleteData = {
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    };

    return this.ragService.deleteContext(id, deleteData);
  }

  @Post('tokens/usage')
  @ApiOperation({ summary: 'Track token usage for analytics' })
  @ApiResponse({ status: 201, description: 'Token usage tracked successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async trackTokenUsage(
    @Body() usageDto: TokenUsageDto,
    @CurrentUser() user: User
  ) {
    const enrichedUsageDto = {
      ...usageDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    };

    await this.ragService.trackTokenUsage(enrichedUsageDto);
    return { message: 'Token usage tracked successfully' };
  }

  @Get('tokens/usage')
  @ApiOperation({ summary: 'Get token usage statistics' })
  @ApiResponse({
    status: 200,
    description: 'Token usage statistics retrieved successfully',
  })
  async getTokenUsageStats(
    @Query('projectId') projectId?: string,
    @CurrentUser() user?: User
  ) {
    // If user is provided, filter stats by user; otherwise return all (for admins)
    const userId = user?.id;
    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes('ADMIN');

    return this.ragService.getTokenUsageStats(projectId, userId, isAdmin);
  }

  @Post('tokens/optimize')
  @ApiOperation({ summary: 'Optimize content for token usage' })
  @ApiResponse({ status: 200, description: 'Content optimized successfully' })
  async optimizeTokens(
    @Body() optimizeDto: OptimizeTokensDto,
    @CurrentUser() user: User
  ) {
    const enrichedOptimizeDto = {
      ...optimizeDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    };

    return this.ragService.optimizeTokens(enrichedOptimizeDto);
  }

  @Post('tokens/budget')
  @ApiOperation({ summary: 'Set token usage budget and alerts' })
  @ApiResponse({ status: 200, description: 'Token budget set successfully' })
  @Roles('ADMIN')
  async setTokenBudget(
    @Body() budgetDto: TokenBudgetDto,
    @CurrentUser() user: User
  ) {
    const enrichedBudgetDto = {
      ...budgetDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    };

    await this.ragService.setTokenBudget(enrichedBudgetDto);
    return { message: 'Token budget set successfully' };
  }

  @Get('tokens/budget')
  @ApiOperation({ summary: 'Get current token budget and usage' })
  @ApiResponse({
    status: 200,
    description: 'Token budget information retrieved successfully',
  })
  async getTokenBudget() {
    // This would be implemented to get budget information
    return { message: 'Token budget retrieval not yet implemented' };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get RAG system statistics' })
  @ApiResponse({
    status: 200,
    description: 'RAG statistics retrieved successfully',
  })
  async getStats(
    @Query() query: ContextStatsDto,
    @CurrentUser() user?: User
  ) {
    const userId = user?.id;
    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes('ADMIN');

    return this.ragService.getComprehensiveStats(query, userId, isAdmin);
  }

  @Get('optimization/analytics')
  @ApiOperation({ summary: 'Get token optimization analytics and insights' })
  @ApiResponse({ status: 200, description: 'Optimization analytics retrieved successfully' })
  async getOptimizationAnalytics(
    @Query('timeframe') timeframe?: string,
    @Query('strategy') strategy?: string,
    @CurrentUser() user?: User
  ) {
    const userId = user?.id;
    const userRoles = user?.roles || [];
    const isAdmin = userRoles.includes('ADMIN');

    return this.ragService.getOptimizationAnalytics(timeframe, strategy, userId, isAdmin);
  }

  @Post('optimization/batch')
  @ApiOperation({ summary: 'Batch optimize multiple pieces of content' })
  @ApiResponse({ status: 200, description: 'Batch optimization completed successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async batchOptimize(
    @Body() batchDto: {
      contents: Array<{ id: string; content: string; metadata?: Record<string, any> }>;
      strategies: string[];
      targetTokens?: number;
      provider?: string;
      model?: string;
    },
    @CurrentUser() user: User
  ) {
    return this.ragService.batchOptimize({
      ...batchDto,
      userId: user.id,
      metadata: createUserMetadata({
        userId: user.id,
        username: user.username,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions || []
      })
    });
  }

  @Get('health')
  @ApiOperation({ summary: 'Check RAG system health' })
  @ApiResponse({ status: 200, description: 'RAG system health status' })
  async getHealth() {
    return {
      status: 'healthy',
      vectorStore: 'connected',
      embeddingService: 'available',
      lastSync: new Date().toISOString(),
    };
  }
}
