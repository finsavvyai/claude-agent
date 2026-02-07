/**
 * API helper utilities for E2E tests
 */

import { Page, APIRequestContext } from '@playwright/test';

export class APIHelper {
  constructor(private page: Page) {}

  /**
   * Create authenticated API context
   */
  async createAuthenticatedContext(token: string): Promise<APIRequestContext> {
    return this.page.request.newContext({
      extraHTTPHeaders: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Register a new user
   */
  async registerUser(userData: {
    email: string;
    password: string;
    name: string;
  }): Promise<{ user: any; token: string }> {
    const response = await this.page.post('/api/auth/register', {
      data: userData,
    });

    if (!response.ok()) {
      throw new Error(`Registration failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Login user
   */
  async loginUser(credentials: {
    email: string;
    password: string;
  }): Promise<{ user: any; token: string }> {
    const response = await this.page.post('/api/auth/login', {
      data: credentials,
    });

    if (!response.ok()) {
      throw new Error(`Login failed: ${response.status()}`);
    }

    return await response.json();
  }

  /**
   * Create test agent
   */
  async createAgent(agentData: any, token: string): Promise<any> {
    const context = await this.createAuthenticatedContext(token);

    try {
      const response = await context.post('/api/agents', {
        data: agentData,
      });

      if (!response.ok()) {
        throw new Error(`Agent creation failed: ${response.status()}`);
      }

      return await response.json();
    } finally {
      await context.dispose();
    }
  }

  /**
   * Get agent by ID
   */
  async getAgent(agentId: string, token: string): Promise<any> {
    const context = await this.createAuthenticatedContext(token);

    try {
      const response = await context.get(`/api/agents/${agentId}`);

      if (!response.ok()) {
        throw new Error(`Failed to get agent: ${response.status()}`);
      }

      return await response.json();
    } finally {
      await context.dispose();
    }
  }

  /**
   * List agents
   */
  async listAgents(token: string, filters?: any): Promise<any[]> {
    const context = await this.createAuthenticatedContext(token);

    try {
      const url = filters
        ? `/api/agents?${new URLSearchParams(filters).toString()}`
        : '/api/agents';

      const response = await context.get(url);

      if (!response.ok()) {
        throw new Error(`Failed to list agents: ${response.status()}`);
      }

      const data = await response.json();
      return data.agents || [];
    } finally {
      await context.dispose();
    }
  }

  /**
   * Delete agent
   */
  async deleteAgent(agentId: string, token: string): Promise<void> {
    const context = await this.createAuthenticatedContext(token);

    try {
      const response = await context.delete(`/api/agents/${agentId}`);

      if (!response.ok()) {
        throw new Error(`Failed to delete agent: ${response.status()}`);
      }
    } finally {
      await context.dispose();
    }
  }

  /**
   * Execute agent
   */
  async executeAgent(agentId: string, requestData: any, token: string): Promise<any> {
    const context = await this.createAuthenticatedContext(token);

    try {
      const response = await context.post(`/api/agents/${agentId}/execute`, {
        data: requestData,
      });

      if (!response.ok()) {
        throw new Error(`Agent execution failed: ${response.status()}`);
      }

      return await response.json();
    } finally {
      await context.dispose();
    }
  }

  /**
   * Wait for agent status
   */
  async waitForAgentStatus(
    agentId: string,
    expectedStatus: string,
    token: string,
    timeout = 30000
  ): Promise<any> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const agent = await this.getAgent(agentId, token);

      if (agent.status === expectedStatus) {
        return agent;
      }

      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    throw new Error(`Agent ${agentId} did not reach status ${expectedStatus} within ${timeout}ms`);
  }

  /**
   * Clean up test data
   */
  async cleanupTestData(token: string): Promise<void> {
    const context = await this.createAuthenticatedContext(token);

    try {
      // Get all test agents and delete them
      const agents = await this.listAgents(token);

      for (const agent of agents) {
        if (agent.name.startsWith('test-')) {
          await this.deleteAgent(agent.id, token);
        }
      }
    } finally {
      await context.dispose();
    }
  }
}
