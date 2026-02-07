import { Injectable, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient, Agent, AgentType, AgentStatus } from '@prisma/client';
import * as amqp from 'amqplib';

import {
  CreateAgentDto,
  UpdateAgentDto,
  AgentQueryDto,
  AgentHealthDto,
  StartAgentDto
} from './dto/agent.dto';

@Injectable()
export class AgentsService {
  private readonly logger = new Logger(AgentsService.name);
  private readonly prisma: PrismaClient;
  private readonly rabbitmqConnection: any;
  private readonly channel: any;

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
        this.configService.get('rabbitmq.exchanges.agents'),
        'topic',
        { durable: true }
      );

      this.logger.log('✅ Connected to RabbitMQ');
    } catch (error) {
      this.logger.error('❌ Failed to connect to RabbitMQ:', error);
    }
  }

  async create(createAgentDto: CreateAgentDto): Promise<Agent> {
    // Check if agent with same name already exists
    const existingAgent = await this.prisma.agent.findFirst({
      where: { name: createAgentDto.name },
    });

    if (existingAgent) {
      throw new ConflictException(`Agent with name '${createAgentDto.name}' already exists`);
    }

    const agent = await this.prisma.agent.create({
      data: {
        name: createAgentDto.name,
        type: createAgentDto.type,
        version: createAgentDto.version,
        config: createAgentDto.config,
        capabilities: createAgentDto.capabilities || [],
        description: createAgentDto.description,
        dependencies: createAgentDto.dependencies || [],
        healthStatus: AgentStatus.IDLE,
        isActive: true,
        metadata: {
          createdAt: new Date().toISOString(),
          createdBy: 'system', // TODO: Get from authenticated user
        },
      },
    });

    // Publish agent creation event
    await this.publishAgentEvent('agent.created', {
      agentId: agent.id,
      name: agent.name,
      type: agent.type,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🤖 Created agent: ${agent.name} (${agent.type})`);
    return agent;
  }

  async findAll(query: AgentQueryDto): Promise<{
    agents: Agent[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      capability,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = query;

    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (type) where.type = type;
    if (status) where.healthStatus = status;
    if (capability) where.capabilities = { has: capability };
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [agents, total] = await Promise.all([
      this.prisma.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          resourceQuota: true,
          _count: {
            select: { tasks: true },
          },
        },
      }),
      this.prisma.agent.count({ where }),
    ]);

    return {
      agents,
      total,
      page,
      limit,
    };
  }

  async findOne(id: string): Promise<Agent | null> {
    const agent = await this.prisma.agent.findUnique({
      where: { id },
      include: {
        resourceQuota: true,
        _count: {
          select: { tasks: true },
        },
      },
    });

    if (!agent) {
      throw new NotFoundException(`Agent with ID '${id}' not found`);
    }

    return agent;
  }

  async findByName(name: string): Promise<Agent | null> {
    return this.prisma.agent.findUnique({
      where: { name },
      include: {
        resourceQuota: true,
      },
    });
  }

  async update(id: string, updateAgentDto: UpdateAgentDto): Promise<Agent> {
    const existingAgent = await this.findOne(id);

    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        ...updateAgentDto,
        metadata: {
          ...existingAgent.metadata,
          updatedAt: new Date().toISOString(),
          updatedBy: 'system', // TODO: Get from authenticated user
        },
      },
      include: {
        resourceQuota: true,
      },
    });

    // Publish agent update event
    await this.publishAgentEvent('agent.updated', {
      agentId: agent.id,
      name: agent.name,
      changes: Object.keys(updateAgentDto),
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🔄 Updated agent: ${agent.name}`);
    return agent;
  }

  async remove(id: string): Promise<void> {
    const agent = await this.findOne(id);

    // Stop agent if it's running
    if (agent.healthStatus === AgentStatus.RUNNING) {
      await this.stop(id);
    }

    await this.prisma.agent.update({
      where: { id },
      data: {
        isActive: false,
        healthStatus: AgentStatus.STOPPED,
        metadata: {
          ...agent.metadata,
          deletedAt: new Date().toISOString(),
          deletedBy: 'system', // TODO: Get from authenticated user
        },
      },
    });

    // Publish agent deletion event
    await this.publishAgentEvent('agent.deleted', {
      agentId: agent.id,
      name: agent.name,
      timestamp: new Date().toISOString(),
    });

    this.logger.log(`🗑️ Deleted agent: ${agent.name}`);
  }

  async start(id: string, options?: StartAgentDto): Promise<Agent> {
    const agent = await this.findOne(id);

    if (agent.healthStatus === AgentStatus.RUNNING) {
      throw new ConflictException(`Agent '${agent.name}' is already running`);
    }

    if (agent.healthStatus === AgentStatus.UNHEALTHY) {
      throw new ConflictException(`Agent '${agent.name}' is unhealthy and cannot be started`);
    }

    // Update agent status
    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: {
        healthStatus: AgentStatus.STARTING,
        metadata: {
          ...agent.metadata,
          startedAt: new Date().toISOString(),
          sessionConfig: options,
        },
      },
    });

    // Publish agent start event
    await this.publishAgentEvent('agent.starting', {
      agentId: agent.id,
      name: agent.name,
      config: options,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would start the actual agent process here
    // For now, we'll simulate the start and update the status
    setTimeout(async () => {
      await this.updateHealthStatus(id, AgentStatus.RUNNING, {
        cpu: 0,
        memory: 0,
        uptime: 0,
        tasksCompleted: 0,
        errorRate: 0,
      });
    }, 2000);

    this.logger.log(`▶️ Starting agent: ${agent.name}`);
    return updatedAgent;
  }

  async stop(id: string): Promise<Agent> {
    const agent = await this.findOne(id);

    if (agent.healthStatus === AgentStatus.IDLE || agent.healthStatus === AgentStatus.STOPPED) {
      throw new ConflictException(`Agent '${agent.name}' is not running`);
    }

    // Update agent status
    const updatedAgent = await this.prisma.agent.update({
      where: { id },
      data: {
        healthStatus: AgentStatus.STOPPING,
        metadata: {
          ...agent.metadata,
          stoppedAt: new Date().toISOString(),
        },
      },
    });

    // Publish agent stop event
    await this.publishAgentEvent('agent.stopping', {
      agentId: agent.id,
      name: agent.name,
      timestamp: new Date().toISOString(),
    });

    // In a real implementation, you would stop the actual agent process here
    // For now, we'll simulate the stop and update the status
    setTimeout(async () => {
      await this.updateHealthStatus(id, AgentStatus.IDLE, {
        cpu: 0,
        memory: 0,
        uptime: 0,
        tasksCompleted: 0,
        errorRate: 0,
      });
    }, 1000);

    this.logger.log(`⏹️ Stopping agent: ${agent.name}`);
    return updatedAgent;
  }

  async restart(id: string): Promise<Agent> {
    await this.stop(id);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for stop to complete
    return this.start(id);
  }

  async updateHealthStatus(
    id: string,
    status: AgentStatus,
    metrics?: AgentHealthDto['metrics']
  ): Promise<Agent> {
    const agent = await this.prisma.agent.update({
      where: { id },
      data: {
        healthStatus: status,
        metadata: {
          lastHealthCheck: new Date().toISOString(),
          healthMetrics: metrics,
        },
      },
    });

    // Publish health status update
    await this.publishAgentEvent('agent.health.updated', {
      agentId: agent.id,
      name: agent.name,
      status,
      metrics,
      timestamp: new Date().toISOString(),
    });

    return agent;
  }

  async getHealthStatus(id: string): Promise<AgentHealthDto | null> {
    const agent = await this.findOne(id);

    return {
      status: agent.healthStatus,
      lastCheck: new Date(agent.metadata?.lastHealthCheck || agent.updatedAt),
      metrics: agent.metadata?.healthMetrics || {
        cpu: 0,
        memory: 0,
        uptime: 0,
        tasksCompleted: 0,
        errorRate: 0,
      },
      details: agent.metadata?.healthDetails,
    };
  }

  async getAllHealthStatuses(): Promise<Record<string, AgentHealthDto>> {
    const agents = await this.prisma.agent.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        healthStatus: true,
        metadata: true,
        updatedAt: true,
      },
    });

    const healthStatuses: Record<string, AgentHealthDto> = {};

    agents.forEach(agent => {
      healthStatuses[agent.id] = {
        status: agent.healthStatus,
        lastCheck: new Date(agent.metadata?.lastHealthCheck || agent.updatedAt),
        metrics: agent.metadata?.healthMetrics || {
          cpu: 0,
          memory: 0,
          uptime: 0,
          tasksCompleted: 0,
          errorRate: 0,
        },
        details: agent.metadata?.healthDetails,
      };
    });

    return healthStatuses;
  }

  async getAgentTypes(): Promise<AgentType[]> {
    return Object.values(AgentType);
  }

  async getAgentCapabilities(): Promise<string[]> {
    const capabilities = await this.prisma.agent.findMany({
      where: { isActive: true },
      select: { capabilities: true },
    });

    const uniqueCapabilities = new Set<string>();
    capabilities.forEach(agent => {
      agent.capabilities.forEach(cap => uniqueCapabilities.add(cap));
    });

    return Array.from(uniqueCapabilities).sort();
  }

  async getStats(): Promise<{
    total: number;
    byType: Record<AgentType, number>;
    byStatus: Record<AgentStatus, number>;
    runningTasks: number;
  }> {
    const [total, byType, byStatus, runningTasks] = await Promise.all([
      this.prisma.agent.count({ where: { isActive: true } }),
      this.prisma.agent.groupBy({
        by: ['type'],
        where: { isActive: true },
        _count: true,
      }),
      this.prisma.agent.groupBy({
        by: ['healthStatus'],
        where: { isActive: true },
        _count: true,
      }),
      this.prisma.task.count({
        where: {
          agentId: { not: null },
          status: 'RUNNING',
        },
      }),
    ]);

    const typeStats = byType.reduce((acc, item) => {
      acc[item.type] = item._count;
      return acc;
    }, {} as Record<AgentType, number>);

    const statusStats = byStatus.reduce((acc, item) => {
      acc[item.healthStatus] = item._count;
      return acc;
    }, {} as Record<AgentStatus, number>);

    return {
      total,
      byType: typeStats,
      byStatus: statusStats,
      runningTasks,
    };
  }

  private async publishAgentEvent(routingKey: string, event: any): Promise<void> {
    if (this.channel) {
      try {
        await this.channel.publish(
          this.configService.get('rabbitmq.exchanges.agents'),
          routingKey,
          Buffer.from(JSON.stringify(event)),
          { persistent: true }
        );
      } catch (error) {
        this.logger.error('Failed to publish agent event:', error);
      }
    }
  }

  async onModuleDestroy() {
    if (this.channel) {
      await this.channel.close();
    }
    if (this.rabbitmqConnection) {
      await this.rabbitmqConnection.close();
    }
    await this.prisma.$disconnect();
  }
}
