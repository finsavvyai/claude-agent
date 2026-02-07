import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Request,
  Res,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Response } from 'express';
import { GitHubIntegrationService } from './services/github-integration.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@claude-agent/database';

interface GitHubAuthRequest {
  code: string;
  state?: string;
}

interface GitHubRepoIndexRequest {
  owner: string;
  repo: string;
  ref?: string;
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
  strategies?: string[];
  targetTokens?: number;
}

interface GitHubSearchRequest {
  query: string;
  sort?: 'stars' | 'forks' | 'updated';
  order?: 'asc' | 'desc';
  page?: number;
  perPage?: number;
}

@ApiTags('github')
@Controller('github')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GitHubController {
  constructor(private readonly githubService: GitHubIntegrationService) {}

  @Post('auth/callback')
  @ApiOperation({ summary: 'Handle GitHub OAuth callback' })
  @ApiResponse({ status: 200, description: 'GitHub authentication successful' })
  @ApiResponse({ status: 400, description: 'Invalid authorization code' })
  @HttpCode(HttpStatus.OK)
  async handleGitHubCallback(
    @Body() authData: GitHubAuthRequest,
    @CurrentUser() user: User
  ) {
    try {
      // Exchange code for access token
      const tokenData = await this.githubService.exchangeCodeForToken(authData.code);

      // Get GitHub user information
      const githubUser = await this.githubService.getGitHubUser(tokenData.access_token);

      // Save GitHub connection
      await this.githubService.saveGitHubConnection(user.id, {
        accessToken: tokenData.access_token,
        user: githubUser,
        scopes: tokenData.scope.split(','),
      });

      return {
        success: true,
        message: 'GitHub connected successfully',
        user: {
          login: githubUser.login,
          name: githubUser.name,
          avatar_url: githubUser.avatar_url,
        },
        scopes: tokenData.scope.split(','),
      };
    } catch (error) {
      throw error;
    }
  }

  @Get('auth/status')
  @ApiOperation({ summary: 'Check GitHub connection status' })
  @ApiResponse({ status: 200, description: 'GitHub connection status' })
  @ApiResponse({ status: 404, description: 'No GitHub connection found' })
  async getGitHubStatus(@CurrentUser() user: User) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        connected: false,
        message: 'No GitHub connection found',
      };
    }

    return {
      connected: true,
      user: {
        login: connection.user.login,
        name: connection.user.name,
        avatar_url: connection.user.avatar_url,
      },
      scopes: connection.scopes,
      lastUsed: new Date().toISOString(),
    };
  }

  @Post('auth/disconnect')
  @ApiOperation({ summary: 'Disconnect GitHub account' })
  @ApiResponse({ status: 200, description: 'GitHub disconnected successfully' })
  async disconnectGitHub(@CurrentUser() user: User) {
    await this.githubService.removeGitHubConnection(user.id);

    return {
      success: true,
      message: 'GitHub disconnected successfully',
    };
  }

  @Get('repositories')
  @ApiOperation({ summary: 'Get user GitHub repositories' })
  @ApiResponse({ status: 200, description: 'User repositories retrieved successfully' })
  @ApiResponse({ status: 404, description: 'No GitHub connection found' })
  async getUserRepositories(
    @CurrentUser() user: User,
    @Query('type') type?: 'owner' | 'member' | 'all',
    @Query('sort') sort?: 'created' | 'updated' | 'pushed' | 'full_name',
    @Query('direction') direction?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('per_page') perPage?: string
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        repositories: [],
        message: 'Please connect your GitHub account first',
      };
    }

    const repositories = await this.githubService.getUserRepositories(
      connection.accessToken,
      {
        type,
        sort,
        direction,
        page: page ? parseInt(page) : 1,
        per_page: perPage ? parseInt(perPage) : 30,
      }
    );

    return {
      repositories,
      pagination: {
        page: page ? parseInt(page) : 1,
        perPage: perPage ? parseInt(perPage) : 30,
        total: repositories.length,
      },
    };
  }

  @Get('repositories/:owner/:repo')
  @ApiOperation({ summary: 'Get specific repository details' })
  @ApiResponse({ status: 200, description: 'Repository details retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Repository not found or no access' })
  async getRepository(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        error: 'GitHub connection required',
        message: 'Please connect your GitHub account first',
      };
    }

    try {
      const repository = await this.githubService.getRepository(
        connection.accessToken,
        owner,
        repo
      );

      // Check if user has access to this repository
      const userRepos = await this.githubService.getUserRepositories(
        connection.accessToken,
        { type: 'all' }
      );

      const hasAccess = userRepos.some(
        (repo) => repo.id === repository.id && (repo.permissions.pull || repo.permissions.push)
      );

      if (!hasAccess) {
        return {
          error: 'Access denied',
          message: 'You do not have access to this repository',
        };
      }

      return {
        repository,
        hasAccess: true,
        permissions: repository.permissions,
      };
    } catch (error) {
      return {
        error: 'Repository not found',
        message: 'The repository does not exist or you do not have access to it',
      };
    }
  }

  @Get('repositories/:owner/:repo/branches')
  @ApiOperation({ summary: 'Get repository branches' })
  @ApiResponse({ status: 200, description: 'Repository branches retrieved successfully' })
  async getRepositoryBranches(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('protected_only') protectedOnly?: string
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        branches: [],
        message: 'GitHub connection required',
      };
    }

    try {
      const branches = await this.githubService.getRepositoryBranches(
        connection.accessToken,
        owner,
        repo,
        protectedOnly === 'true'
      );

      return {
        branches,
        total: branches.length,
      };
    } catch (error) {
      return {
        branches: [],
        error: 'Failed to fetch branches',
        message: error.message,
      };
    }
  }

  @Get('repositories/:owner/:repo/contents')
  @ApiOperation({ summary: 'Get repository file tree' })
  @ApiResponse({ status: 200, description: 'Repository file tree retrieved successfully' })
  async getRepositoryContents(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Query('path') path?: string,
    @Query('ref') ref?: string
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        contents: [],
        message: 'GitHub connection required',
      };
    }

    try {
      const fileTree = await this.githubService.getRepositoryFileTree(
        connection.accessToken,
        owner,
        repo,
        ref
      );

      // Filter by path if provided
      let filteredContents = fileTree;
      if (path) {
        filteredContents = fileTree.filter(file =>
          file.path.startsWith(path)
        );
      }

      return {
        contents: filteredContents,
        total: filteredContents.length,
        path: path || '',
        ref: ref || 'default',
      };
    } catch (error) {
      return {
        contents: [],
        error: 'Failed to fetch repository contents',
        message: error.message,
      };
    }
  }

  @Get('search/repositories')
  @ApiOperation({ summary: 'Search GitHub repositories' })
  @ApiResponse({ status: 200, description: 'Repository search completed successfully' })
  async searchRepositories(
    @CurrentUser() user: User,
    @Query('q') query: string,
    @Query('sort') sort?: 'stars' | 'forks' | 'updated',
    @Query('order') order?: 'asc' | 'desc',
    @Query('page') page?: string,
    @Query('per_page') perPage?: string
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        repositories: [],
        message: 'GitHub connection required',
      };
    }

    try {
      const searchResult = await this.githubService.searchRepositories(
        connection.accessToken,
        query,
        {
          sort,
          order,
          page: page ? parseInt(page) : 1,
          per_page: perPage ? parseInt(perPage) : 30,
        }
      );

      return {
        repositories: searchResult.items,
        total_count: searchResult.total_count,
        incomplete_results: searchResult.incomplete_results,
        pagination: {
          page: page ? parseInt(page) : 1,
          perPage: perPage ? parseInt(perPage) : 30,
        },
      };
    } catch (error) {
      return {
        repositories: [],
        error: 'Search failed',
        message: error.message,
      };
    }
  }

  @Post('repositories/:owner/:repo/index')
  @ApiOperation({ summary: 'Index GitHub repository for RAG optimization' })
  @ApiResponse({ status: 200, description: 'Repository indexing completed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request parameters' })
  @ApiResponse({ status: 403, description: 'No access to repository' })
  @ApiResponse({ status: 404, description: 'GitHub connection required' })
  async indexRepository(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() indexData: GitHubRepoIndexRequest
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        error: 'GitHub connection required',
        message: 'Please connect your GitHub account first',
      };
    }

    try {
      // Check repository access
      const repository = await this.githubService.getRepository(
        connection.accessToken,
        owner,
        repo
      );

      const userRepos = await this.githubService.getUserRepositories(
        connection.accessToken,
        { type: 'all' }
      );

      const hasAccess = userRepos.some(
        (repo) => repo.id === repository.id && (repo.permissions.pull || repo.permissions.push)
      );

      if (!hasAccess) {
        return {
          error: 'Access denied',
          message: 'You do not have access to this repository',
        };
      }

      // Get repository content for optimization
      const content = await this.githubService.getRepositoryContentForOptimization(
        connection.accessToken,
        owner,
        repo,
        {
          ref: indexData.ref,
          includePatterns: indexData.includePatterns,
          excludePatterns: indexData.excludePatterns,
          maxFiles: indexData.maxFiles || 100,
        }
      );

      // Import and use RAG service
      const { RAGService } = await import('./services/rag.service');
      const ragService = new RAGService(
        // Inject dependencies - you'll need to adjust this based on your setup
      );

      // Index the repository content
      const indexResult = await ragService.indexRepository({
        repositoryPath: `github://${owner}/${repo}`,
        filePatterns: indexData.includePatterns || [
          '**/*.ts', '**/*.tsx', '**/*.js', '**/*.jsx',
          '**/*.py', '**/*.md', '**/*.json'
        ],
        excludePatterns: indexData.excludePatterns || [
          '**/node_modules/**', '**/dist/**', '**/build/**',
          '**/*.test.*', '**/*.spec.*', '**/coverage/**'
        ],
        metadata: {
          source: 'github',
          owner,
          repo,
          ref: indexData.ref || repository.default_branch,
          indexedBy: user.id,
          indexedAt: new Date().toISOString(),
          totalFiles: content.length,
          strategies: indexData.strategies || ['compression', 'selection']
        }
      });

      return {
        success: true,
        message: 'Repository indexed successfully',
        repository: {
          owner,
          repo,
          name: repository.full_name,
          description: repository.description,
          defaultBranch: repository.default_branch,
        },
        indexing: {
          filesProcessed: content.length,
          ...indexResult,
        },
        content: {
          totalFiles: content.length,
          languages: [...new Set(content.map(f => f.language).filter(Boolean))],
          totalSize: content.reduce((sum, f) => sum + f.size, 0),
        }
      };
    } catch (error) {
      return {
        error: 'Indexing failed',
        message: error.message,
        repository: { owner, repo },
      };
    }
  }

  @Get('repositories/:owner/:repo/files/:path(*)')
  @ApiOperation({ summary: 'Get file content from repository' })
  @ApiResponse({ status: 200, description: 'File content retrieved successfully' })
  @ApiResponse({ status: 404, description: 'File not found or no access' })
  async getFileContent(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Param('path') path: string,
    @Query('ref') ref?: string,
    @Res() res: Response
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return res.status(400).json({
        error: 'GitHub connection required',
        message: 'Please connect your GitHub account first',
      });
    }

    try {
      // Check repository access
      const repository = await this.githubService.getRepository(
        connection.accessToken,
        owner,
        repo
      );

      const userRepos = await this.githubService.getUserRepositories(
        connection.accessToken,
        { type: 'all' }
      );

      const hasAccess = userRepos.some(
        (repo) => repo.id === repository.id && (repo.permissions.pull || repo.permissions.push)
      );

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Access denied',
          message: 'You do not have access to this repository',
        });
      }

      // Get file content
      const content = await this.githubService.getFileContent(
        connection.accessToken,
        owner,
        repo,
        path,
        ref
      );

      // Detect file type for proper response headers
      const language = this.githubService['detectLanguage'](path);

      return res
        .set('Content-Type', 'text/plain; charset=utf-8')
        .json({
          content,
          path,
          language,
          size: Buffer.byteLength(content, 'utf8'),
          repository: `${owner}/${repo}`,
          ref: ref || 'default',
        });
    } catch (error) {
      return res.status(404).json({
        error: 'File not found',
        message: error.message,
        path,
        repository: `${owner}/${repo}`,
      });
    }
  }

  @Post('repositories/:owner/:repo/optimize')
  @ApiOperation({ summary: 'Optimize file content from repository' })
  @ApiResponse({ status: 200, description: 'File content optimized successfully' })
  async optimizeFile(
    @CurrentUser() user: User,
    @Param('owner') owner: string,
    @Param('repo') repo: string,
    @Body() optimizeData: {
      path: string;
      content?: string;
      strategies?: string[];
      targetTokens?: number;
      ref?: string;
    }
  ) {
    const connection = await this.githubService.getGitHubConnection(user.id);

    if (!connection) {
      return {
        error: 'GitHub connection required',
        message: 'Please connect your GitHub account first',
      };
    }

    try {
      // Check repository access
      const repository = await this.githubService.getRepository(
        connection.accessToken,
        owner,
        repo
      );

      const userRepos = await this.githubService.getUserRepositories(
        connection.accessToken,
        { type: 'all' }
      );

      const hasAccess = userRepos.some(
        (repo) => repo.id === repository.id && (repo.permissions.pull || repo.permissions.push)
      );

      if (!hasAccess) {
        return {
          error: 'Access denied',
          message: 'You do not have access to this repository',
        };
      }

      // Get file content if not provided
      let content = optimizeData.content;
      if (!content) {
        content = await this.githubService.getFileContent(
          connection.accessToken,
          owner,
          repo,
          optimizeData.path,
          optimizeData.ref
        );
      }

      // Import and use RAG service for optimization
      const { RAGService } = await import('./services/rag.service');
      const ragService = new RAGService(
        // Inject dependencies as needed
      );

      // Optimize the content
      const optimizationResult = await ragService.optimizeTokens({
        content,
        strategies: optimizeData.strategies || ['compression', 'selection'],
        targetTokens: optimizeData.targetTokens,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        userId: user.id,
        metadata: {
          source: 'github',
          owner,
          repo,
          path: optimizeData.path,
          ref: optimizeData.ref || repository.default_branch,
          originalSize: Buffer.byteLength(content, 'utf8')
        }
      });

      return {
        success: true,
        file: {
          path: optimizeData.path,
          repository: `${owner}/${repo}`,
          ref: optimizeData.ref || repository.default_branch,
        },
        optimization: {
          originalTokens: optimizationResult.originalTokens,
          optimizedTokens: optimizationResult.optimizedTokens,
          savings: optimizationResult.savings,
          strategies: optimizationResult.strategies,
          processingTime: optimizationResult.processingTime,
        },
        content: {
          original: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          optimized: optimizationResult.optimizedContent.substring(0, 500) +
                   (optimizationResult.optimizedContent.length > 500 ? '...' : ''),
        }
      };
    } catch (error) {
      return {
        error: 'Optimization failed',
        message: error.message,
        file: {
          path: optimizeData.path,
          repository: `${owner}/${repo}`,
        },
      };
    }
  }
}
