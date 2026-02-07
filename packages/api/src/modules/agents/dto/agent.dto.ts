import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AgentType, AgentStatus } from '@claude-agent/database';

export class CreateAgentDto {
  @ApiProperty({ example: 'code-analyzer-pro', description: 'Unique agent name' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: AgentType,
    description: 'Type of agent',
    example: AgentType.TASK_EXECUTOR
  })
  @IsEnum(AgentType)
  type: AgentType;

  @ApiProperty({ example: '1.0.0', description: 'Agent version using semantic versioning' })
  @IsString()
  version: string;

  @ApiProperty({
    description: 'Agent configuration including runtime settings',
    example: { timeout: 300000, retryPolicy: { maxRetries: 3 } }
  })
  @IsObject()
  config: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Agent capabilities and features',
    example: ['code-analysis', 'requirements-generation']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional({
    description: 'Agent description and purpose',
    example: 'Advanced code analysis agent for security and performance reviews'
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Required dependencies and tools',
    example: ['python', 'nodejs', 'git']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class UpdateAgentDto {
  @ApiPropertyOptional({ example: 'code-analyzer-v2' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: '1.1.0' })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  capabilities?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];
}

export class AgentConfigDto {
  @ApiProperty({ example: 'nodejs', description: 'Runtime environment' })
  @IsString()
  runtime: string;

  @ApiProperty({ example: 300000, description: 'Max execution time in milliseconds' })
  @IsNumber()
  @Min(1000)
  timeout: number;

  @ApiPropertyOptional({
    description: 'Retry policy configuration',
    example: { maxRetries: 3, backoffMs: 1000 }
  })
  @IsOptional()
  @IsObject()
  retryPolicy?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Environment variables',
    example: { NODE_ENV: 'production', DEBUG: 'false' }
  })
  @IsOptional()
  @IsObject()
  environment?: Record<string, string>;
}

export class ResourceQuotaDto {
  @ApiProperty({ example: 2, description: 'Number of CPU cores allocated' })
  @IsNumber()
  @Min(0.1)
  @Max(32)
  cpu: number;

  @ApiProperty({ example: 4096, description: 'Memory in MB' })
  @IsNumber()
  @Min(128)
  @Max(32768)
  memory: number;

  @ApiPropertyOptional({
    example: 10000,
    description: 'Monthly token limit for AI providers'
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  tokenLimit?: number;

  @ApiPropertyOptional({
    example: 100,
    description: 'Max concurrent tasks'
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  maxConcurrentTasks?: number;
}

export class AgentHealthDto {
  @ApiProperty({
    enum: AgentStatus,
    description: 'Current health status',
    example: AgentStatus.HEALTHY
  })
  @IsEnum(AgentStatus)
  status: AgentStatus;

  @ApiProperty({
    description: 'Last health check timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  lastCheck: Date;

  @ApiProperty({
    description: 'Performance metrics',
    example: {
      cpu: 45.2,
      memory: 2048,
      uptime: 3600,
      tasksCompleted: 150,
      errorRate: 0.02
    }
  })
  @IsObject()
  metrics: {
    cpu: number;           // CPU usage percentage
    memory: number;        // Memory usage in MB
    uptime: number;        // Uptime in seconds
    tasksCompleted: number; // Tasks processed
    errorRate: number;      // Error percentage
  };

  @ApiPropertyOptional({
    description: 'Health check details or warnings',
    example: 'All systems operational'
  })
  @IsOptional()
  @IsString()
  details?: string;
}

export class StartAgentDto {
  @ApiPropertyOptional({
    description: 'Environment variables for this session',
    example: { DEBUG: 'true', LOG_LEVEL: 'verbose' }
  })
  @IsOptional()
  @IsObject()
  environment?: Record<string, string>;

  @ApiPropertyOptional({
    description: 'Custom configuration overrides',
    example: { timeout: 600000 }
  })
  @IsOptional()
  @IsObject()
  config?: Record<string, any>;
}

export class AgentQueryDto {
  @ApiPropertyOptional({ description: 'Filter by agent type' })
  @IsOptional()
  @IsEnum(AgentType)
  type?: AgentType;

  @ApiPropertyOptional({ description: 'Filter by health status' })
  @IsOptional()
  @IsEnum(AgentStatus)
  status?: AgentStatus;

  @ApiPropertyOptional({ description: 'Filter by capabilities' })
  @IsOptional()
  @IsString()
  capability?: string;

  @ApiPropertyOptional({ description: 'Search in name and description' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Page number', default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ description: 'Items per page', default: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Sort field',
    example: 'createdAt'
  })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({
    description: 'Sort direction',
    example: 'desc'
  })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}
