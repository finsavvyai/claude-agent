/**
 * Plugin factory for generating test plugin data
 */

import { faker } from '@faker-js/faker';

export interface PluginFactoryOptions {
  name?: string;
  version?: string;
  description?: string;
  author?: string;
  type?: 'task' | 'event' | 'tool' | 'middleware';
  category?: string;
  tags?: string[];
  entryPoint?: string;
  dependencies?: string[];
  permissions?: string[];
  config?: Record<string, any>;
  status?: 'registered' | 'running' | 'stopped' | 'error';
  metadata?: Record<string, any>;
}

export class PluginFactory {
  /**
   * Create a single test plugin
   */
  static create(overrides: PluginFactoryOptions = {}): any {
    const name = overrides.name || faker.helpers.fake('{{word}}-plugin').toLowerCase();
    const version = overrides.version || '1.0.0';

    return {
      name,
      version,
      description: overrides.description || faker.lorem.sentence(),
      author: overrides.author || faker.person.fullName(),
      type: overrides.type || 'task',
      category: overrides.category || faker.helpers.arrayElement([
        'utility', 'productivity', 'development', 'analysis', 'communication'
      ]),
      tags: overrides.tags || [faker.lorem.word(), faker.lorem.word()],
      entryPoint: overrides.entryPoint || 'index.js',
      dependencies: overrides.dependencies || [],
      permissions: overrides.permissions || ['read'],
      config: overrides.config || {
        enabled: true,
        priority: 'normal',
        timeout: 30000,
      },
      status: overrides.status || 'registered',
      workingDirectory: `/tmp/plugins/${name}`,
      manifest: {
        name,
        version,
        description: overrides.description || faker.lorem.sentence(),
        author: overrides.author || faker.person.fullName(),
        license: 'MIT',
        keywords: [faker.lorem.word(), faker.lorem.word()],
        homepage: faker.internet.url(),
        repository: faker.internet.url(),
        type: overrides.type || 'task',
        category: overrides.category || 'utility',
        tags: overrides.tags || [faker.lorem.word(), faker.lorem.word()],
        entryPoint: overrides.entryPoint || 'index.js',
        dependencies: overrides.dependencies || [],
        permissions: overrides.permissions || ['read'],
        config: overrides.config || {},
        engines: {
          node: '>=14.0.0',
        },
      },
      metadata: {
        installedAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        ...overrides.metadata,
      },
      lastError: null,
      createdAt: faker.date.past(),
      updatedAt: faker.date.recent(),
    };
  }

  /**
   * Create multiple test plugins
   */
  static createMany(count: number, overrides: PluginFactoryOptions = {}): any[] {
    return Array.from({ length: count }, (_, index) =>
      this.create({
        ...overrides,
        ...(overrides.name ? {} : {
          name: `${overrides.name || 'plugin'}-${index + 1}`
        })
      })
    );
  }

  /**
   * Create a task plugin
   */
  static createTaskPlugin(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'task',
      category: 'productivity',
      permissions: ['read', 'write', 'execute'],
    });
  }

  /**
   * Create an event plugin
   */
  static createEventPlugin(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'event',
      category: 'utility',
      permissions: ['read', 'publish'],
    });
  }

  /**
   * Create a tool plugin
   */
  static createToolPlugin(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'tool',
      category: 'development',
      permissions: ['read', 'write'],
    });
  }

  /**
   * Create a middleware plugin
   */
  static createMiddlewarePlugin(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      type: 'middleware',
      category: 'utility',
      permissions: ['read', 'intercept'],
    });
  }

  /**
   * Create a running plugin
   */
  static createRunning(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      status: 'running',
    });
  }

  /**
   * Create a stopped plugin
   */
  static createStopped(overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      status: 'stopped',
    });
  }

  /**
   * Create a plugin with error
   */
  static createWithError(overrides: PluginFactoryOptions = {}): any {
    const plugin = this.create({
      ...overrides,
      status: 'error',
    });

    plugin.lastError = new Error('Test error message');
    return plugin;
  }

  /**
   * Create plugin with dependencies
   */
  static createWithDependencies(dependencies: string[], overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      dependencies,
    });
  }

  /**
   * Create plugin with specific permissions
   */
  static createWithPermissions(permissions: string[], overrides: PluginFactoryOptions = {}): any {
    return this.create({
      ...overrides,
      permissions,
    });
  }

  /**
   * Create plugin for API testing (minimal data)
   */
  static createForAPI(overrides: PluginFactoryOptions = {}): any {
    return {
      name: overrides.name || faker.helpers.fake('{{word}}-plugin').toLowerCase(),
      version: overrides.version || '1.0.0',
      type: overrides.type || 'task',
      category: overrides.category || 'utility',
      status: overrides.status || 'registered',
      config: overrides.config || {},
    };
  }

  /**
   * Create plugin installation payload
   */
  static createInstallationPayload(overrides: PluginFactoryOptions = {}): any {
    const plugin = this.create(overrides);
    return {
      source: `https://github.com/example/${plugin.name}.git`,
      force: false,
      autoStart: true,
      config: plugin.config,
    };
  }

  /**
   * Create plugin configuration payload
   */
  static createConfigurationPayload(overrides: PluginFactoryOptions = {}): any {
    return {
      config: overrides.config || {
        enabled: faker.datatype.boolean(),
        priority: faker.helpers.arrayElement(['low', 'normal', 'high']),
        timeout: faker.datatype.number({ min: 5000, max: 120000 }),
        retries: faker.datatype.number({ min: 0, max: 5 }),
      },
    };
  }

  /**
   * Create plugin manifest
   */
  static createManifest(overrides: PluginFactoryOptions = {}): any {
    const name = overrides.name || faker.helpers.fake('{{word}}-plugin').toLowerCase();
    const version = overrides.version || '1.0.0';

    return {
      name,
      version,
      description: overrides.description || faker.lorem.sentence(),
      author: overrides.author || faker.person.fullName(),
      license: 'MIT',
      keywords: [faker.lorem.word(), faker.lorem.word()],
      homepage: faker.internet.url(),
      repository: faker.internet.url(),
      type: overrides.type || 'task',
      category: overrides.category || 'utility',
      tags: overrides.tags || [faker.lorem.word(), faker.lorem.word()],
      entryPoint: overrides.entryPoint || 'index.js',
      dependencies: overrides.dependencies || [],
      permissions: overrides.permissions || ['read'],
      config: overrides.config || {},
      engines: {
        node: '>=14.0.0',
      },
      autoStart: faker.datatype.boolean(),
    };
  }

  /**
   * Create plugin execution result
   */
  static createExecutionResult(overrides: any = {}): any {
    return {
      success: overrides.success !== false,
      result: overrides.result || faker.lorem.paragraph(),
      error: overrides.error || null,
      executionTime: overrides.executionTime || faker.datatype.number({ min: 100, max: 5000 }),
      timestamp: new Date(),
      metadata: overrides.metadata || {
        pluginVersion: '1.0.0',
        nodeId: faker.datatype.uuid(),
      },
    };
  }
}
