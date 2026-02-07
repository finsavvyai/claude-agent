/**
 * Agent factory for generating test agent data
 */

import { faker } from '@faker-js/faker';

export interface AgentFactoryOptions {
  id?: string;
  name?: string;
  type?: 'task' | 'conversation' | 'analysis' | 'automation';
  status?: 'active' | 'inactive' | 'suspended' | 'error';
  config?: Record<string, any>;
  capabilities?: string[];
  userId?: string;
  version?: string;
  metadata?: Record<string, any>;
}

export class AgentFactory {
  /**
   * Create a single test agent
   */
  static create(overrides: AgentFactoryOptions = {}): any {
    const id = overrides.id || faker.datatype.uuid();
    const name = overrides.name || faker.helpers.fake('{{word}}-agent').toLowerCase();

    return {
      id,
      name,
      type: overrides.type || 'task',
      status: overrides.status || 'active',
      config: {
        temperature: faker.datatype.number({ min: 0, max: 100 }) / 100,
        maxTokens: faker.datatype.number({ min: 100, max: 4000 }),
        timeout: faker.datatype.number({ min: 5, max: 60 }) * 1000,
        ...overrides.config,
      },
      capabilities: overrides.capabilities || [
        'text-generation',
        'code-execution',
        'file-analysis',
      ],
      userId: overrides.userId || faker.datatype.uuid(),
      version: overrides.version || '1.0.0',
      metadata: {
        description: faker.lorem.sentence(),
        tags: [faker.lorem.word(), faker.lorem.word()],
        createdAt: new Date().toISOString(),
        ...overrides.metadata,
      },
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
      lastUsedAt: faker.date.recent(),
    };
  }

  /**
   * Create multiple test agents
   */
  static createMany(count: number, overrides: AgentFactoryOptions = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        ...(overrides.id ? {} : {
          id: `${overrides.id || 'agent'}-${index + 1}`
        })
      })
    );
  }

  /**
   * Create a task agent
   */
  static createTaskAgent(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'task',
      capabilities: [
        'task-execution',
        'workflow-automation',
        'deadline-tracking',
        ...(overrides.capabilities || []),
      ],
    });
  }

  /**
   * Create a conversation agent
   */
  static createConversationAgent(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'conversation',
      capabilities: [
        'natural-language-processing',
        'context-memory',
        'multi-turn-dialogue',
        ...(overrides.capabilities || []),
      ],
    });
  }

  /**
   * Create an analysis agent
   */
  static createAnalysisAgent(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'analysis',
      capabilities: [
        'data-analysis',
        'pattern-recognition',
        'statistical-modeling',
        ...(overrides.capabilities || []),
      ],
    });
  }

  /**
   * Create an automation agent
   */
  static createAutomationAgent(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'automation',
      capabilities: [
        'script-execution',
        'api-integration',
        'scheduled-tasks',
        ...(overrides.capabilities || []),
      ],
    });
  }

  /**
   * Create inactive agent
   */
  static createInactive(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      status: 'inactive',
    });
  }

  /**
   * Create suspended agent
   */
  static createSuspended(overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      status: 'suspended',
    });
  }

  /**
   * Create agent with specific user
   */
  static createForUser(userId: string, overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      userId,
    });
  }

  /**
   * Create agent for API testing (minimal data)
   */
  static createForAPI(overrides: AgentFactoryOptions = {}): any {
    return {
      id: overrides.id || faker.datatype.uuid(),
      name: overrides.name || faker.helpers.fake('{{word}}-agent').toLowerCase(),
      type: overrides.type || 'task',
      status: overrides.status || 'active',
      config: overrides.config || {},
      userId: overrides.userId || faker.datatype.uuid(),
    };
  }

  /**
   * Create agent creation payload
   */
  static createCreationPayload(overrides: AgentFactoryOptions = {}): any {
    const agent = this.create(overrides);
    return {
      name: agent.name,
      type: agent.type,
      config: agent.config,
      capabilities: agent.capabilities,
    };
  }

  /**
   * Create agent update payload
   */
  static createUpdatePayload(overrides: AgentFactoryOptions = {}): any {
    return {
      name: overrides.name || faker.helpers.fake('{{word}}-agent').toLowerCase(),
      config: overrides.config || {
        temperature: faker.datatype.number({ min: 0, max: 100 }) / 100,
        maxTokens: faker.datatype.number({ min: 100, max: 4000 }),
      },
      capabilities: overrides.capabilities || faker.helpers.arrayElements([
        'text-generation',
        'code-execution',
        'file-analysis',
        'data-analysis',
        'workflow-automation',
      ], { min: 1, max: 3 }),
    };
  }

  /**
   * Create agent execution payload
   */
  static createExecutionPayload(overrides: any = {}): any {
    return {
      input: overrides.input || faker.lorem.paragraph(),
      parameters: overrides.parameters || {
        temperature: faker.datatype.number({ min: 0, max: 100 }) / 100,
        maxTokens: faker.datatype.number({ min: 100, max: 2000 }),
      },
      context: overrides.context || {},
      timeout: overrides.timeout || faker.datatype.number({ min: 5, max: 30 }) * 1000,
    };
  }

  /**
   * Create agent with specific configuration
   */
  static createWithConfig(config: Record<string, any>, overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      config,
    });
  }

  /**
   * Create agent with specific capabilities
   */
  static createWithCapabilities(capabilities: string[], overrides: AgentFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      capabilities,
    });
  }
}
