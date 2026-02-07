import { IsString, IsEnum, IsOptional, IsObject, IsArray, IsNumber, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskType, TaskStatus, TaskPriority } from '@claude-agent/database';

export class CreateTaskDto {
  @ApiProperty({
    enum: TaskType,
    description: 'Type of task to execute',
    example: TaskType.CODE_ANALYSIS
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiProperty({
    enum: TaskPriority,
    description: 'Task priority level',
    example: TaskPriority.NORMAL
  })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiProperty({
    description: 'Task payload data',
    example: {
      repository: 'https://github.com/user/repo.git',
      files: ['src/**/*.ts'],
      analysisType: 'security'
    }
  })
  @IsObject()
  payload: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Target agent ID (optional - auto-routing if not specified)',
    example: 'agent-uuid-123'
  })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({
    description: 'Project ID this task belongs to',
    example: 'project-uuid-456'
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Task dependencies (task IDs that must complete first)',
    example: ['task-uuid-789']
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  dependencies?: string[];

  @ApiPropertyOptional({
    description: 'Task timeout in milliseconds',
    example: 300000
  })
  @IsOptional()
  @IsNumber()
  @Min(1000)
  timeout?: number;

  @ApiPropertyOptional({
    description: 'Custom metadata for the task',
    example: {
      requestedBy: 'user-123',
      tags: ['security', 'performance']
    }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class UpdateTaskDto {
  @ApiPropertyOptional({
    enum: TaskPriority,
    description: 'Update task priority'
  })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Update task payload',
    example: { additionalFiles: ['tests/**/*.spec.ts'] }
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'Update task metadata',
    example: { tags: ['security', 'performance', 'compliance'] }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TaskQueryDto {
  @ApiPropertyOptional({ description: 'Filter by task type' })
  @IsOptional()
  @IsEnum(TaskType)
  type?: TaskType;

  @ApiPropertyOptional({ description: 'Filter by task status' })
  @IsOptional()
  @IsEnum(TaskStatus)
  status?: TaskStatus;

  @ApiPropertyOptional({ description: 'Filter by priority' })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ description: 'Filter by agent ID' })
  @IsOptional()
  @IsString()
  agentId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by created date range (ISO format)' })
  @IsOptional()
  @IsString()
  dateFrom?: string;

  @ApiPropertyOptional({ description: 'Filter by created date range (ISO format)' })
  @IsOptional()
  @IsString()
  dateTo?: string;

  @ApiPropertyOptional({ description: 'Search in task metadata' })
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

  @ApiPropertyOptional({ description: 'Sort field', default: 'createdAt' })
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ description: 'Sort direction', default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc';
}

export class TaskProgressDto {
  @ApiProperty({
    description: 'Current execution stage',
    example: 'Analyzing repository structure'
  })
  @IsString()
  stage: string;

  @ApiProperty({
    description: 'Completion percentage (0-100)',
    example: 45
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  percentage: number;

  @ApiPropertyOptional({
    description: 'Estimated time remaining in seconds',
    example: 120
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  eta?: number;

  @ApiPropertyOptional({
    description: 'Status message',
    example: 'Processing source files...'
  })
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional({
    description: 'Detailed step breakdown',
    example: [
      { name: 'Clone repository', status: 'completed', duration: 5 },
      { name: 'Analyze code', status: 'running', startedAt: '2024-01-15T10:30:00Z' }
    ]
  })
  @IsOptional()
  @IsArray()
  steps?: ProgressStepDto[];
}

export class ProgressStepDto {
  @ApiProperty({ example: 'Clone repository' })
  @IsString()
  name: string;

  @ApiProperty({
    enum: ['pending', 'running', 'completed', 'failed'],
    example: 'completed'
  })
  @IsEnum(['pending', 'running', 'completed', 'failed'] as const)
  status: 'pending' | 'running' | 'completed' | 'failed';

  @ApiPropertyOptional({
    description: 'Step start timestamp',
    example: '2024-01-15T10:25:00Z'
  })
  @IsOptional()
  startedAt?: Date;

  @ApiPropertyOptional({
    description: 'Step completion timestamp',
    example: '2024-01-15T10:30:00Z'
  })
  @IsOptional()
  completedAt?: Date;

  @ApiPropertyOptional({
    description: 'Error message if step failed',
    example: 'Repository not found'
  })
  @IsOptional()
  @IsString()
  error?: string;

  @ApiPropertyOptional({
    description: 'Step duration in seconds',
    example: 300
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;
}

export class BulkTaskDto {
  @ApiProperty({
    description: 'Array of tasks to create',
    example: [
      { type: TaskType.CODE_ANALYSIS, priority: TaskPriority.HIGH, payload: {} },
      { type: TaskType.DESIGN_ARCHITECTURE, priority: TaskPriority.NORMAL, payload: {} }
    ]
  })
  @IsArray()
  tasks: CreateTaskDto[];

  @ApiPropertyOptional({
    description: 'Common project ID for all tasks',
    example: 'project-uuid-456'
  })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({
    description: 'Common metadata for all tasks',
    example: { batchId: 'batch-123', requestedBy: 'user-456' }
  })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class TaskDependencyDto {
  @ApiProperty({ description: 'Task ID that depends on another' })
  @IsString()
  taskId: string;

  @ApiProperty({ description: 'Task ID that must complete first' })
  @IsString()
  dependsOnTaskId: string;

  @ApiPropertyOptional({
    description: 'Dependency type',
    enum: ['finish_to_start', 'start_to_start', 'finish_to_finish'],
    example: 'finish_to_start'
  })
  @IsOptional()
  @IsEnum(['finish_to_start', 'start_to_start', 'finish_to_finish'] as const)
  type?: 'finish_to_start' | 'start_to_start' | 'finish_to_finish';
}

export class QueuePriorityDto {
  @ApiProperty({ description: 'Task ID to prioritize' })
  @IsString()
  taskId: string;

  @ApiProperty({
    enum: TaskPriority,
    description: 'New priority level'
  })
  @IsEnum(TaskPriority)
  priority: TaskPriority;

  @ApiPropertyOptional({
    description: 'Reason for priority change',
    example: 'Critical security issue detected'
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
