import { IsString, IsOptional, IsArray, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum GitHubRepoType {
  OWNER = 'owner',
  MEMBER = 'member',
  ALL = 'all',
}

export enum GitHubSortType {
  CREATED = 'created',
  UPDATED = 'updated',
  PUSHED = 'pushed',
  FULL_NAME = 'full_name',
  STARS = 'stars',
  FORKS = 'forks',
}

export enum GitHubSortOrder {
  ASC = 'asc',
  DESC = 'desc',
}

export class GitHubAuthCallbackDto {
  @ApiProperty({ example: 'gh_123abc456def789ghi', description: 'GitHub authorization code' })
  @IsString()
  code: string;

  @ApiPropertyOptional({
    example: 'random-state-string',
    description: 'State parameter for CSRF protection'
  })
  @IsOptional()
  @IsString()
  state?: string;
}

export class GitHubRepoIndexDto {
  @ApiProperty({ example: 'owner', description: 'Repository owner username' })
  @IsString()
  owner: string;

  @ApiProperty({ example: 'repository-name', description: 'Repository name' })
  @IsString()
  repo: string;

  @ApiPropertyOptional({
    example: 'main',
    description: 'Git branch, tag, or commit SHA'
  })
  @IsOptional()
  @IsString()
  ref?: string;

  @ApiPropertyOptional({
    description: 'File patterns to include (glob patterns)',
    example: ['**/*.ts', '**/*.js', 'docs/**/*.md']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  includePatterns?: string[];

  @ApiPropertyOptional({
    description: 'File patterns to exclude (glob patterns)',
    example: ['**/node_modules/**', '**/dist/**', '**/*.test.*']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  excludePatterns?: string[];

  @ApiPropertyOptional({
    description: 'Maximum number of files to process',
    example: 100,
    minimum: 1,
    maximum: 1000
  })
  @IsOptional()
  @IsNumber()
  @IsNumber()
  maxFiles?: number;

  @ApiPropertyOptional({
    description: 'Optimization strategies to apply',
    example: ['compression', 'selection', 'deduplication']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strategies?: string[];

  @ApiPropertyOptional({
    description: 'Target number of tokens after optimization',
    example: 1000,
    minimum: 100,
    maximum: 10000
  })
  @IsOptional()
  @IsNumber()
  @IsNumber()
  targetTokens?: number;
}

export class GitHubSearchDto {
  @ApiProperty({
    example: 'react typescript',
    description: 'Search query for repositories'
  })
  @IsString()
  query: string;

  @ApiPropertyOptional({
    enum: GitHubSortType,
    description: 'Sort field',
    example: GitHubSortType.STARS
  })
  @IsOptional()
  @IsEnum(GitHubSortType)
  sort?: GitHubSortType;

  @ApiPropertyOptional({
    enum: GitHubSortOrder,
    description: 'Sort order',
    example: GitHubSortOrder.DESC
  })
  @IsOptional()
  @IsEnum(GitHubSortOrder)
  order?: GitHubSortOrder;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Results per page',
    example: 30,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  @IsNumber()
  perPage?: number;
}

export class GitHubOptimizeFileDto {
  @ApiProperty({
    example: 'src/components/Button.tsx',
    description: 'File path within repository'
  })
  @IsString()
  path: string;

  @ApiPropertyOptional({
    description: 'File content (if not provided, will be fetched from GitHub)',
    example: 'import React from "react";\n\nexport function Button() { ... }'
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiPropertyOptional({
    description: 'Optimization strategies to apply',
    example: ['compression', 'selection'],
    enum: ['compression', 'selection', 'summarization', 'chunking', 'deduplication']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  strategies?: string[];

  @ApiPropertyOptional({
    description: 'Target number of tokens',
    example: 1000,
    minimum: 100,
    maximum: 10000
  })
  @IsOptional()
  @IsNumber()
  @IsNumber()
  targetTokens?: number;

  @ApiPropertyOptional({
    description: 'Git branch, tag, or commit SHA',
    example: 'main'
  })
  @IsOptional()
  @IsString()
  ref?: string;
}

export class GitHubReposQueryDto {
  @ApiPropertyOptional({
    enum: GitHubRepoType,
    description: 'Repository types to return',
    example: GitHubRepoType.ALL
  })
  @IsOptional()
  @IsEnum(GitHubRepoType)
  type?: GitHubRepoType;

  @ApiPropertyOptional({
    enum: GitHubSortType,
    description: 'Sort field',
    example: GitHubSortType.UPDATED
  })
  @IsOptional()
  @IsEnum(GitHubSortType)
  sort?: GitHubSortType;

  @ApiPropertyOptional({
    enum: GitHubSortOrder,
    description: 'Sort order',
    example: GitHubSortOrder.DESC
  })
  @IsOptional()
  @IsEnum(GitHubSortOrder)
  direction?: GitHubSortOrder;

  @ApiPropertyOptional({
    description: 'Page number',
    example: 1,
    minimum: 1
  })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({
    description: 'Results per page',
    example: 30,
    minimum: 1,
    maximum: 100
  })
  @IsOptional()
  @IsNumber()
  per_page?: number;
}

export class GitHubContentsQueryDto {
  @ApiPropertyOptional({
    description: 'Path within repository',
    example: 'src/components'
  })
  @IsOptional()
  @IsString()
  path?: string;

  @ApiPropertyOptional({
    description: 'Git branch, tag, or commit SHA',
    example: 'main'
  })
  @IsOptional()
  @IsString()
  ref?: string;
}

export class GitHubBranchesQueryDto {
  @ApiPropertyOptional({
    description: 'Show only protected branches',
    example: false
  })
  @IsOptional()
  @IsBoolean()
  protected_only?: boolean;
}

// Response DTOs

export class GitHubAuthResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'GitHub connected successfully', description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'GitHub user information',
    example: {
      login: 'developer-jane',
      name: 'Jane Developer',
      avatar_url: 'https://avatars.githubusercontent.com/u/123456?v=4'
    }
  })
  user: {
    login: string;
    name: string;
    avatar_url: string;
  };

  @ApiProperty({
    description: 'Granted OAuth scopes',
    example: ['repo', 'read:org']
  })
  scopes: string[];
}

export class GitHubRepoDetailsDto {
  @ApiProperty({
    description: 'Repository information',
    example: {
      id: 123456789,
      name: 'my-repo',
      full_name: 'developer-jane/my-repo',
      private: false,
      html_url: 'https://github.com/developer-jane/my-repo',
      description: 'A sample repository',
      language: 'TypeScript',
      stargazers_count: 42,
      forks_count: 8
    }
  })
  repository: any;

  @ApiProperty({ example: true, description: 'Whether user has access to repository' })
  hasAccess: boolean;

  @ApiProperty({
    description: 'Repository permissions',
    example: {
      admin: false,
      push: true,
      pull: true
    }
  })
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export class GitHubIndexResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({ example: 'Repository indexed successfully', description: 'Response message' })
  message: string;

  @ApiProperty({
    description: 'Repository information',
    example: {
      owner: 'developer-jane',
      repo: 'my-repo',
      name: 'developer-jane/my-repo',
      defaultBranch: 'main'
    }
  })
  repository: {
    owner: string;
    repo: string;
    name: string;
    defaultBranch: string;
  };

  @ApiProperty({
    description: 'Indexing results',
    example: {
      indexedFiles: 45,
      totalChunks: 120,
      processingTime: 2500,
      errors: []
    }
  })
  indexing: {
    indexedFiles: number;
    totalChunks: number;
    processingTime: number;
    errors: string[];
  };

  @ApiProperty({
    description: 'Content statistics',
    example: {
      totalFiles: 45,
      languages: ['TypeScript', 'JavaScript', 'Markdown'],
      totalSize: 1024000
    }
  })
  content: {
    totalFiles: number;
    languages: string[];
    totalSize: number;
  };
}

export class GitHubOptimizeResponseDto {
  @ApiProperty({ example: true, description: 'Success status' })
  success: boolean;

  @ApiProperty({
    description: 'File information',
    example: {
      path: 'src/components/Button.tsx',
      repository: 'developer-jane/my-repo',
      ref: 'main'
    }
  })
  file: {
    path: string;
    repository: string;
    ref: string;
  };

  @ApiProperty({
    description: 'Optimization results',
    example: {
      originalTokens: 850,
      optimizedTokens: 420,
      savings: {
        tokens: 430,
        percentage: 50.6,
        cost: 0.0129
      },
      strategies: ['compression', 'selection'],
      processingTime: 245
    }
  })
  optimization: {
    originalTokens: number;
    optimizedTokens: number;
    savings: {
      tokens: number;
      percentage: number;
      cost: number;
    };
    strategies: string[];
    processingTime: number;
  };

  @ApiProperty({
    description: 'Content comparison',
    example: {
      original: 'import React from "react";\n\nexport function Button() { ... }',
      optimized: 'import React from "react";export function Button(){...}'
    }
  })
  content: {
    original: string;
    optimized: string;
  };
}
