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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  BulkTaskDto,
  QueuePriorityDto,
} from './dto/task.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('tasks')
@Controller('tasks')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, description: 'Task created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @Roles('ADMIN', 'DEVELOPER')
  async create(@Body() createTaskDto: CreateTaskDto) {
    return this.tasksService.create(createTaskDto);
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Create multiple tasks in bulk' })
  @ApiResponse({ status: 201, description: 'Bulk tasks created successfully' })
  @Roles('ADMIN', 'DEVELOPER')
  async createBulk(@Body() bulkTaskDto: BulkTaskDto) {
    return this.tasksService.createBulk(bulkTaskDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all tasks with filtering and pagination' })
  @ApiResponse({ status: 200, description: 'Tasks retrieved successfully' })
  async findAll(@Query() query: TaskQueryDto) {
    return this.tasksService.findAll(query);
  }

  @Get('queue/stats')
  @ApiOperation({ summary: 'Get task queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Queue statistics retrieved successfully',
  })
  @Roles('ADMIN')
  async getQueueStats() {
    return this.tasksService.getQueueStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  @ApiResponse({ status: 200, description: 'Task retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update task by ID' })
  @ApiResponse({ status: 200, description: 'Task updated successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'Cannot update running task' })
  @Roles('ADMIN', 'DEVELOPER')
  async update(@Param('id') id: string, @Body() updateTaskDto: UpdateTaskDto) {
    return this.tasksService.update(id, updateTaskDto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel a task' })
  @ApiResponse({ status: 200, description: 'Task cancelled successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({ status: 409, description: 'Cannot cancel completed task' })
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN', 'DEVELOPER')
  async cancel(@Param('id') id: string) {
    return this.tasksService.cancel(id);
  }

  @Post(':id/retry')
  @ApiOperation({ summary: 'Retry a failed or cancelled task' })
  @ApiResponse({ status: 200, description: 'Task queued for retry' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({
    status: 409,
    description: 'Can only retry failed or cancelled tasks',
  })
  @Roles('ADMIN', 'DEVELOPER')
  async retry(@Param('id') id: string) {
    return this.tasksService.retry(id);
  }

  @Post('queue/prioritize')
  @ApiOperation({ summary: 'Prioritize a task in the queue' })
  @ApiResponse({ status: 200, description: 'Task prioritized successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @ApiResponse({
    status: 409,
    description: 'Can only prioritize pending tasks',
  })
  @HttpCode(HttpStatus.OK)
  @Roles('ADMIN')
  async prioritizeQueue(@Body() queuePriorityDto: QueuePriorityDto) {
    return this.tasksService.prioritizeQueue(queuePriorityDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete task by ID' })
  @ApiResponse({ status: 200, description: 'Task deleted successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  @Roles('ADMIN')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id') id: string) {
    return this.tasksService.cancel(id); // Use cancel instead of delete for audit trail
  }
}
