import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PrismaClient,
  Task,
  TaskType,
  TaskStatus,
  TaskPriority,
  Agent,
} from '@prisma/client';
import * as amqp from 'amqplib';
import { WebSocket } from 'ws';

import {
  CreateTaskDto,
  UpdateTaskDto,
  TaskQueryDto,
  TaskProgressDto,
  BulkTaskDto,
  TaskDependencyDto,
  QueuePriorityDto,
  ProgressStepDto,
} from './dto/task.dto';

interface TaskExecution {
  taskId: string;
  agentId: string;
  startTime: Date;
  timeout?: NodeJS.Timeout;
  progress?: TaskProgressDto;
  wsConnections?: Set<WebSocket>;
}

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly prisma: PrismaClient;
  private readonly rabbitmqConnection: any;
  private readonly channel: any;
  private readonly runningTasks = new Map<string, TaskExecution>();
  private readonly taskQueue: Task[] = [];
  private readonly wsConnections = new Map<string, Set<WebSocket>>();

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
    try {
      this.rabbitmqConnection = await amqp.connect(
        this.configService.get('rabbitmq.url')
      );
      this.channel = await this.rabbitmqConnection.createChannel();

      // Declare exchanges
      await this.channel.assertExchange(
        this.configService.get('rabbitmq.exchanges.tasks'),
        'topic',
        { durable: true }
      );

      // Declare task queue
      await this.channel.assertQueue('claude-agent.tasks.high', {
        durable: true,
        arguments: { 'x-max-priority': 10 },
      });
      await this.channel.assertQueue('claude-agent.tasks.normal', {
        durable: true,
        arguments: { 'x-max-priority': 5 },
      });
      await this.channel.assertQueue('claude-agent.tasks.low', {
        durable: true,
        arguments: { 'x-max-priority': 1 },
      });

      // Bind queues to exchange with routing keys
      await this.channel.bindQueue(
        'claude-agent.tasks.high',
        'claude-agent.tasks',
        'task.high'
      );
      await this.channel.bindQueue(
        'claude-agent.tasks.normal',
        'claude-agent.tasks',
        'task.normal'
      );
      await this.channel.bindQueue(
        'claude-agent.tasks.low',
        'claude-agent.tasks',
        'task.low'
      );

      // Start consuming tasks
      await this.startTaskConsumers();

      this.logger.log('✅ Connected to RabbitMQ for task processing');
    } catch (error) {
      this.logger.error('❌ Failed to connect to RabbitMQ:', error);
    }

    // Start task scheduler
    this.startTaskScheduler();
  }

  async create(createTaskDto: CreateTaskDto): Promise<Task> {
    // Validate dependencies if provided
    if (createTaskDto.dependencies?.length > 0) {
      await this.validateDependencies(createTaskDto.dependencies);
    }

    // Auto-route to appropriate agent if not specified
    let agentId = createTaskDto.agentId;
    if (!agentId) {
      agentId = await this.findBestAgent(createTaskDto.type);
    }

    const task = await this.prisma.task.create({
      data: {
        type: createTaskDto.type,
        priority: createTaskDto.priority,
        payload: createTaskDto.payload,
        agentId,
        projectId: createTaskDto.projectId,
        status: TaskStatus.PENDING,
        progress: {
          stage: 'Queued',
          percentage: 0,
          message: 'Task is waiting to be processed',
        },
        metadata: {
          ...createTaskDto.metadata,
          createdAt: new Date().toISOString(),
          timeout: createTaskDto.timeout || 300000, // Default 5 minutes
        },
      },
      include: {
        agent: true,
        project: true,
      },
    });

    // Create task dependencies
    if (createTaskDto.dependencies?.length > 0) {
      await this.createTaskDependencies(task.id, createTaskDto.dependencies);
    }

    // Publish task creation event
    await this.publishTaskEvent('task.created', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      agentId: task.agentId,
      timestamp: new Date().toISOString(),
    });

    // Queue task for execution
    await this.queueTask(task);

    this.logger.log(`📝 Created task: ${task.id} (${task.type})`);
    return task;
  }

  async createBulk(
    bulkTaskDto: BulkTaskDto
  ): Promise<{ tasks: Task[]; batchId: string }> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const createdTasks: Task[] = [];

    for (const taskData of bulkTaskDto.tasks) {
      const task = await this.create({
        ...taskData,
        projectId: taskData.projectId || bulkTaskDto.projectId,
        metadata: {
          ...taskData.metadata,
          ...bulkTaskDto.metadata,
          batchId,
        },
      });
      createdTasks.push(task);
    }

    this.logger.log(
      `📦 Created bulk task batch: ${batchId} with ${createdTasks.length} tasks`
    );
    return { tasks: createdTasks, batchId };
  }

  async findAll(query: TaskQueryDto): Promise<{
    tasks: Task[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      priority,
      agentId,
      projectId,
      dateFrom,
      dateTo,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {};

    if (type) where.type = type;
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (agentId) where.agentId = agentId;
    if (projectId) where.projectId = projectId;

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo);
    }

    if (search) {
      where.OR = [
        { metadata: { path: ['description'], string_contains: search } },
        { metadata: { path: ['requestedBy'], string_contains: search } },
      ];
    }

    const [tasks, total] = await Promise.all([
      this.prisma.task.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          agent: true,
          project: true,
          dependencies: {
            include: { dependsOnTask: true },
          },
          dependents: {
            include: { task: true },
          },
        },
      }),
      this.prisma.task.count({ where }),
    ]);

    return {
      tasks,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Task | null> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        agent: true,
        project: true,
        dependencies: {
          include: { dependsOnTask: true },
        },
        dependents: {
          include: { task: true },
        },
        executions: {
          orderBy: { startedAt: 'desc' },
          take: 5,
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    return task;
  }

  async update(id: string, updateTaskDto: UpdateTaskDto): Promise<Task> {
    const existingTask = await this.findOne(id);

    if (existingTask.status === TaskStatus.RUNNING) {
      throw new ConflictException('Cannot update a running task');
    }

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        ...updateTaskDto,
        metadata: {
          ...existingTask.metadata,
          ...updateTaskDto.metadata,
          updatedAt: new Date().toISOString(),
        },
      },
      include: {
        agent: true,
        project: true,
      },
    });

    // Publish task update event
    await this.publishTaskEvent('task.updated', {
      taskId: task.id,
      changes: Object.keys(updateTaskDto),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🔄 Updated task: ${task.id}`);
    return task;
  }

  async cancel(id: string): Promise<Task> {
    const task = await this.findOne(id);

    if (task.status === TaskStatus.COMPLETED) {
      throw new ConflictException('Cannot cancel a completed task');
    }

    // Stop execution if running
    if (task.status === TaskStatus.RUNNING) {
      const execution = this.runningTasks.get(id);
      if (execution?.timeout) {
        clearTimeout(execution.timeout);
      }
      this.runningTasks.delete(id);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.CANCELLED,
        progress: {
          ...task.progress,
          stage: 'Cancelled',
          percentage: 100,
          message: 'Task was cancelled by user',
        },
        completedAt: new Date(),
      },
    });

    // Publish task cancellation event
    await this.publishTaskEvent('task.cancelled', {
      taskId: task.id,
      agentId: task.agentId,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`❌ Cancelled task: ${task.id}`);
    return updatedTask;
  }

  async retry(id: string): Promise<Task> {
    const task = await this.findOne(id);

    if (
      task.status !== TaskStatus.FAILED &&
      task.status !== TaskStatus.CANCELLED
    ) {
      throw new ConflictException('Can only retry failed or cancelled tasks');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.PENDING,
        progress: {
          stage: 'Queued for retry',
          percentage: 0,
          message: 'Task is queued for retry',
        },
        completedAt: null,
        result: null,
        error: null,
        metadata: {
          ...task.metadata,
          retriedAt: new Date().toISOString(),
          retryCount: (task.metadata?.retryCount || 0) + 1,
        },
      },
    });

    // Re-queue task for execution
    await this.queueTask(updatedTask);

    this.logger.log(`🔄 Retrying task: ${task.id}`);
    return updatedTask;
  }

  async updateProgress(id: string, progress: TaskProgressDto): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      select: { status: true, progress: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID '${id}' not found`);
    }

    if (task.status !== TaskStatus.RUNNING) {
      return; // Don't update progress for non-running tasks
    }

    await this.prisma.task.update({
      where: { id },
      data: {
        progress: {
          ...task.progress,
          ...progress,
          lastUpdated: new Date().toISOString(),
        },
      },
    });

    // Broadcast progress update via WebSocket
    await this.broadcastProgressUpdate(id, progress);

    // Log significant milestones
    if (
      progress.percentage === 25 ||
      progress.percentage === 50 ||
      progress.percentage === 75 ||
      progress.percentage === 100
    ) {
      this.logger.log(
        `📊 Task ${id} progress: ${progress.percentage}% - ${progress.stage}`
      );
    }
  }

  async completeTask(id: string, result: any): Promise<Task> {
    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.COMPLETED,
        progress: {
          stage: 'Completed',
          percentage: 100,
          message: 'Task completed successfully',
        },
        result,
        completedAt: new Date(),
      },
      include: {
        agent: true,
        project: true,
      },
    });

    // Clean up running task
    this.runningTasks.delete(id);

    // Publish task completion event
    await this.publishTaskEvent('task.completed', {
      taskId: task.id,
      agentId: task.agentId,
      result,
      duration: task.completedAt.getTime() - new Date(task.createdAt).getTime(),
      timestamp: new Date().toISOString(),
    });

    // Check and start dependent tasks
    await this.checkDependentTasks(id);

    this.logger.log(`✅ Completed task: ${task.id}`);
    return task;
  }

  async failTask(id: string, error: string | Error): Promise<Task> {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorStack = error instanceof Error ? error.stack : undefined;

    const task = await this.prisma.task.update({
      where: { id },
      data: {
        status: TaskStatus.FAILED,
        progress: {
          stage: 'Failed',
          percentage: 0,
          message: `Task failed: ${errorMessage}`,
          error: errorMessage,
        },
        error: {
          message: errorMessage,
          stack: errorStack,
          timestamp: new Date().toISOString(),
        },
        completedAt: new Date(),
      },
      include: {
        agent: true,
        project: true,
      },
    });

    // Clean up running task
    this.runningTasks.delete(id);

    // Publish task failure event
    await this.publishTaskEvent('task.failed', {
      taskId: task.id,
      agentId: task.agentId,
      error: errorMessage,
      timestamp: new Date().toISOString(),
    });

    this.logger.error(`❌ Failed task: ${task.id} - ${errorMessage}`);
    return task;
  }

  async prioritizeQueue(queuePriorityDto: QueuePriorityDto): Promise<void> {
    const task = await this.prisma.task.findUnique({
      where: { id: queuePriorityDto.taskId },
    });

    if (!task) {
      throw new NotFoundException(
        `Task with ID '${queuePriorityDto.taskId}' not found`
      );
    }

    if (task.status !== TaskStatus.PENDING) {
      throw new ConflictException('Can only prioritize pending tasks');
    }

    await this.prisma.task.update({
      where: { id: queuePriorityDto.taskId },
      data: {
        priority: queuePriorityDto.priority,
        metadata: {
          ...task.metadata,
          prioritizedAt: new Date().toISOString(),
          priorityReason: queuePriorityDto.reason,
        },
      },
    });

    // Re-queue task with new priority
    await this.queueTask({ ...task, priority: queuePriorityDto.priority });

    this.logger.log(
      `⚡ Prioritized task: ${queuePriorityDto.taskId} to ${queuePriorityDto.priority}`
    );
  }

  async getQueueStats(): Promise<{
    pending: number;
    running: number;
    completed: number;
    failed: number;
    avgExecutionTime: number;
    throughputPerHour: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      pending,
      running,
      completed,
      failed,
      recentCompleted,
      totalExecutionTime,
    ] = await Promise.all([
      this.prisma.task.count({ where: { status: TaskStatus.PENDING } }),
      this.prisma.task.count({ where: { status: TaskStatus.RUNNING } }),
      this.prisma.task.count({ where: { status: TaskStatus.COMPLETED } }),
      this.prisma.task.count({ where: { status: TaskStatus.FAILED } }),
      this.prisma.task.count({
        where: {
          status: TaskStatus.COMPLETED,
          completedAt: { gte: oneHourAgo },
        },
      }),
      this.prisma.task.aggregate({
        where: {
          status: TaskStatus.COMPLETED,
          completedAt: { not: null },
          createdAt: { not: null },
        },
        _avg: {
          // Note: This is a simplified calculation
          // In a real implementation, you'd use proper date arithmetic
        },
      }),
    ]);

    return {
      pending,
      running,
      completed,
      failed,
      avgExecutionTime: 0, // Calculate from actual execution data
      throughputPerHour: recentCompleted,
    };
  }

  private async validateDependencies(dependencies: string[]): Promise<void> {
    const existingTasks = await this.prisma.task.findMany({
      where: { id: { in: dependencies } },
      select: { id: true, status: true },
    });

    if (existingTasks.length !== dependencies.length) {
      const foundIds = existingTasks.map(t => t.id);
      const missingIds = dependencies.filter(id => !foundIds.includes(id));
      throw new NotFoundException(
        `Dependency tasks not found: ${missingIds.join(', ')}`
      );
    }
  }

  private async createTaskDependencies(
    taskId: string,
    dependencies: string[]
  ): Promise<void> {
    await this.prisma.taskDependency.createMany({
      data: dependencies.map(dependsOnTaskId => ({
        taskId,
        dependsOnTaskId,
      })),
    });
  }

  private async findBestAgent(taskType: TaskType): Promise<string> {
    // Find available agents that can handle this task type
    const availableAgents = await this.prisma.agent.findMany({
      where: {
        isActive: true,
        healthStatus: 'RUNNING', // Agent types would need to be updated
        capabilities: { has: taskType },
      },
      include: {
        _count: {
          select: { tasks: { where: { status: TaskStatus.RUNNING } } },
        },
      },
    });

    if (availableAgents.length === 0) {
      throw new NotFoundException(
        `No available agents found for task type: ${taskType}`
      );
    }

    // Select agent with least current workload
    const bestAgent = availableAgents.reduce((best, current) =>
      current._count.tasks < best._count.tasks ? current : best
    );

    return bestAgent.id;
  }

  private async queueTask(task: Task): Promise<void> {
    const priorityQueue = this.getPriorityQueue(task.priority);
    const routingKey = `task.${task.priority.toString().toLowerCase()}`;

    await this.channel.sendToQueue(
      priorityQueue,
      Buffer.from(JSON.stringify(task)),
      {
        persistent: true,
        priority: this.getQueuePriority(task.priority),
        headers: {
          taskId: task.id,
          type: task.type,
          createdAt: task.createdAt.toISOString(),
        },
      }
    );

    await this.publishTaskEvent('task.queued', {
      taskId: task.id,
      type: task.type,
      priority: task.priority,
      queue: priorityQueue,
      timestamp: new Date().toISOString(),
    });
  }

  private getPriorityQueue(priority: TaskPriority): string {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 'claude-agent.tasks.high';
      case TaskPriority.HIGH:
        return 'claude-agent.tasks.high';
      case TaskPriority.NORMAL:
        return 'claude-agent.tasks.normal';
      case TaskPriority.LOW:
        return 'claude-agent.tasks.low';
      case TaskPriority.BACKGROUND:
        return 'claude-agent.tasks.low';
      default:
        return 'claude-agent.tasks.normal';
    }
  }

  private getQueuePriority(priority: TaskPriority): number {
    switch (priority) {
      case TaskPriority.CRITICAL:
        return 10;
      case TaskPriority.HIGH:
        return 8;
      case TaskPriority.NORMAL:
        return 5;
      case TaskPriority.LOW:
        return 3;
      case TaskPriority.BACKGROUND:
        return 1;
      default:
        return 5;
    }
  }

  private async startTaskConsumers(): Promise<void> {
    // High priority consumer
    this.channel.consume(
      'claude-agent.tasks.high',
      async msg => {
        if (msg) {
          await this.processTask(msg, 'high');
        }
      },
      { noAck: false }
    );

    // Normal priority consumer
    this.channel.consume(
      'claude-agent.tasks.normal',
      async msg => {
        if (msg) {
          await this.processTask(msg, 'normal');
        }
      },
      { noAck: false }
    );

    // Low priority consumer
    this.channel.consume(
      'claude-agent.tasks.low',
      async msg => {
        if (msg) {
          await this.processTask(msg, 'low');
        }
      },
      { noAck: false }
    );
  }

  private async processTask(msg: any, priority: string): Promise<void> {
    try {
      const task: Task = JSON.parse(msg.content.toString());

      // Check if dependencies are satisfied
      const dependenciesSatisfied = await this.checkDependenciesSatisfied(
        task.id
      );
      if (!dependenciesSatisfied) {
        // Re-queue task for later processing
        setTimeout(() => this.channel.nack(msg, false, true), 5000);
        return;
      }

      // Update task status to running
      await this.prisma.task.update({
        where: { id: task.id },
        data: {
          status: TaskStatus.RUNNING,
          startedAt: new Date(),
          progress: {
            stage: 'Starting execution',
            percentage: 0,
            message: 'Task is being processed',
          },
        },
      });

      // Set up execution tracking
      const execution: TaskExecution = {
        taskId: task.id,
        agentId: task.agentId,
        startTime: new Date(),
        wsConnections: new Set(),
      };

      this.runningTasks.set(task.id, execution);

      // Set timeout
      const timeout = task.metadata?.timeout || 300000; // Default 5 minutes
      execution.timeout = setTimeout(async () => {
        await this.failTask(task.id, 'Task execution timeout');
      }, timeout);

      // Publish task start event
      await this.publishTaskEvent('task.started', {
        taskId: task.id,
        agentId: task.agentId,
        priority,
        timestamp: new Date().toISOString(),
      });

      // Acknowledge message
      this.channel.ack(msg);

      // In a real implementation, you would delegate to the actual agent here
      // For now, simulate task execution
      await this.simulateTaskExecution(task);

      this.logger.log(
        `🚀 Started processing task: ${task.id} (${priority} priority)`
      );
    } catch (error) {
      this.logger.error('Error processing task:', error);
      this.channel.nack(msg, false, false);
    }
  }

  private async simulateTaskExecution(task: Task): Promise<void> {
    const steps = [
      { name: 'Initializing', duration: 1000 },
      { name: 'Processing', duration: 3000 },
      { name: 'Finalizing', duration: 1000 },
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];

      await this.updateProgress(task.id, {
        stage: step.name,
        percentage: Math.round(((i + 1) / steps.length) * 100),
        message: `${step.name}...`,
        steps: [
          {
            name: step.name,
            status: i === steps.length - 1 ? 'completed' : 'running',
            startedAt: new Date(),
          },
        ],
      });

      await new Promise(resolve => setTimeout(resolve, step.duration));
    }

    // Simulate successful completion
    const result = {
      status: 'success',
      output: 'Task completed successfully',
      metrics: {
        executionTime: Date.now() - new Date(task.startedAt).getTime(),
        processedItems: 42,
      },
    };

    await this.completeTask(task.id, result);
  }

  private async checkDependenciesSatisfied(taskId: string): Promise<boolean> {
    const dependencies = await this.prisma.taskDependency.findMany({
      where: { taskId },
      include: {
        dependsOnTask: {
          select: { status: true },
        },
      },
    });

    return dependencies.every(
      dep => dep.dependsOnTask.status === TaskStatus.COMPLETED
    );
  }

  private async checkDependentTasks(completedTaskId: string): Promise<void> {
    const dependentTasks = await this.prisma.taskDependency.findMany({
      where: { dependsOnTaskId: completedTaskId },
      include: {
        task: {
          select: {
            id: true,
            status: true,
            priority: true,
            agentId: true,
            type: true,
            payload: true,
            projectId: true,
            metadata: true,
          },
        },
      },
    });

    for (const { task } of dependentTasks) {
      if (task.status === TaskStatus.PENDING) {
        const dependenciesSatisfied = await this.checkDependenciesSatisfied(
          task.id
        );
        if (dependenciesSatisfied) {
          await this.queueTask(task);
        }
      }
    }
  }

  private startTaskScheduler(): void {
    // Check for tasks that need to be scheduled
    setInterval(async () => {
      try {
        // This would handle periodic task scheduling, cleanup, etc.
        // For now, it's a placeholder for future enhancements
      } catch (error) {
        this.logger.error('Error in task scheduler:', error);
      }
    }, 30000); // Run every 30 seconds
  }

  private async broadcastProgressUpdate(
    taskId: string,
    progress: TaskProgressDto
  ): Promise<void> {
    // Broadcast to WebSocket connections
    const connections = this.wsConnections.get(taskId);
    if (connections) {
      const message = JSON.stringify({
        type: 'progress',
        taskId,
        progress,
        timestamp: new Date().toISOString(),
      });

      connections.forEach(ws => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(message);
        }
      });
    }
  }

  private async publishTaskEvent(
    routingKey: string,
    event: any
  ): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.publish(
          this.configService.get('rabbitmq.exchanges.tasks'),
          routingKey,
          Buffer.from(JSON.stringify(event)),
          { persistent: true }
        );
      } catch (error) {
        this.logger.error('Failed to publish task event:', error);
      }
    }
  }

  async onModuleDestroy() {
    // Clear all running tasks
    this.runningTasks.forEach((execution, taskId) => {
      if (execution.timeout) {
        clearTimeout(execution.timeout);
      }
    });
    this.runningTasks.clear();

    if (this.channel) {
      await this.channel.close();
    }
    if (this.rabbitmqConnection) {
      await this.rabbitmqConnection.close();
    }
    await this.prisma.$disconnect();
  }
}
