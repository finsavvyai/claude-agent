/**
 * Agent fixtures for testing
 */

import { test as base, expect } from '@playwright/test';
import { AgentFactory } from '../factories/agent.factory';
import { UserFactory } from '../factories/user.factory';

// Define custom fixture types
type AgentFixtures = {
  testUser: any;
  testAgent: any;
  testAgents: any[];
  agentService: any;
  mockAgentService: any;
};

// Extend base test with custom fixtures
export const test = base.extend<AgentFixtures>({
  // Test user
  testUser: [
    async ({}, use) => {
      const user = UserFactory.createForAPI();
      await use(user);
    },
    { scope: 'test' },
  ],

  // Single test agent
  testAgent: [
    async ({ testUser }, use) => {
      const agent = AgentFactory.createForAPI({
        userId: testUser.id,
      });
      await use(agent);
    },
    { scope: 'test' },
  ],

  // Multiple test agents
  testAgents: [
    async ({ testUser }, use) => {
      const agents = AgentFactory.createMany(3, {
        userId: testUser.id,
      });
      await use(agents);
    },
    { scope: 'test' },
  ],

  // Mock agent service
  mockAgentService: [
    async ({}, use) => {
      const service = {
        getAgent: jest.fn(),
        createAgent: jest.fn(),
        updateAgent: jest.fn(),
        deleteAgent: jest.fn(),
        listAgents: jest.fn(),
        executeAgent: jest.fn(),
        startAgent: jest.fn(),
        stopAgent: jest.fn(),
      };

      // Setup default mock implementations
      service.getAgent.mockResolvedValue(AgentFactory.createForAPI());
      service.createAgent.mockResolvedValue(AgentFactory.createForAPI());
      service.updateAgent.mockResolvedValue(AgentFactory.createForAPI());
      service.listAgents.mockResolvedValue(AgentFactory.createMany(3));
      service.executeAgent.mockResolvedValue({
        success: true,
        result: 'Test execution result',
      });

      await use(service);
    },
    { scope: 'test' },
  ],
});

// Export expect from extended test
export { expect };

// Helper functions for agent testing
export class AgentTestHelper {
  /**
   * Wait for agent to reach specific status
   */
  static async waitForAgentStatus(
    agentId: string,
    expectedStatus: string,
    service: any,
    timeout = 10000
  ): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const agent = await service.getAgent(agentId);
      if (agent.status === expectedStatus) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Agent ${agentId} did not reach status ${expectedStatus} within ${timeout}ms`);
  }

  /**
   * Create agent with specific type
   */
  static createAgentWithType(type: string, overrides: any = {}): any {
    return AgentFactory.create({
      type,
      ...overrides,
    });
  }

  /**
   * Verify agent capabilities
   */
  static verifyCapabilities(agent: any, requiredCapabilities: string[]): boolean {
    return requiredCapabilities.every(capability =>
      agent.capabilities.includes(capability)
    );
  }

  /**
   * Create mock execution request
   */
  static createMockExecutionRequest(overrides: any = {}): any {
    return {
      input: 'Test input',
      parameters: {
        temperature: 0.7,
        maxTokens: 1000,
      },
      context: {},
      timeout: 30000,
      ...overrides,
    };
  }
}
