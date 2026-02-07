import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { RouteConfig, HttpMethod } from '../interfaces/route-config.interface';

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private routes: Map<string, RouteConfig[]> = new Map();
  private services: Map<string, ServiceInfo> = new Map();

  constructor(private readonly configService: ConfigService) {
    this.initializeRoutes();
    this.initializeServices();
  }

  async resolveRoute(req: Request): Promise<RouteConfig | null> {
    const path = req.path;
    const method = req.method as HttpMethod;

    // Get routes for this path
    const pathRoutes = this.routes.get(path) || [];

    // Find matching route by method
    let matchingRoute = pathRoutes.find(route =>
      Array.isArray(route.method)
        ? route.method.includes(method)
        : route.method === method
    );

    // If no exact match, try pattern matching
    if (!matchingRoute) {
      matchingRoute = await this.findPatternMatch(path, method);
    }

    return matchingRoute || null;
  }

  private async findPatternMatch(path: string, method: HttpMethod): Promise<RouteConfig | null> {
    const paths = Array.from(this.routes.keys()).sort((a, b) => b.length - a.length);

    for (const routePath of paths) {
      if (this.pathMatches(path, routePath)) {
        const pathRoutes = this.routes.get(routePath) || [];
        const matchingRoute = pathRoutes.find(route =>
          Array.isArray(route.method)
            ? route.method.includes(method)
            : route.method === method
        );

        if (matchingRoute) {
          // Apply path parameters substitution
          const resolvedRoute = {
            ...matchingRoute,
            resolvedPath: path,
            pathParams: this.extractPathParams(path, routePath),
          };
          return resolvedRoute;
        }
      }
    }

    return null;
  }

  private pathMatches(requestPath: string, routePath: string): boolean {
    // Simple pattern matching - can be enhanced with regex
    const routeSegments = routePath.split('/');
    const requestSegments = requestPath.split('/');

    if (routeSegments.length !== requestSegments.length) {
      return false;
    }

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      const requestSegment = requestSegments[i];

      if (routeSegment.startsWith(':')) {
        // Path parameter - matches anything
        continue;
      }

      if (routeSegment.includes('*')) {
        // Wildcard matching
        const pattern = routeSegment.replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (!regex.test(requestSegment)) {
          return false;
        }
        continue;
      }

      if (routeSegment !== requestSegment) {
        return false;
      }
    }

    return true;
  }

  private extractPathParams(requestPath: string, routePath: string): Record<string, string> {
    const routeSegments = routePath.split('/');
    const requestSegments = requestPath.split('/');
    const params: Record<string, string> = {};

    for (let i = 0; i < routeSegments.length; i++) {
      const routeSegment = routeSegments[i];
      if (routeSegment.startsWith(':')) {
        const paramName = routeSegment.substring(1);
        params[paramName] = requestSegments[i];
      }
    }

    return params;
  }

  async getAllRoutes(): Promise<RouteConfig[]> {
    const allRoutes: RouteConfig[] = [];
    for (const routes of this.routes.values()) {
      allRoutes.push(...routes);
    }
    return allRoutes;
  }

  async getAllServices(): Promise<ServiceInfo[]> {
    return Array.from(this.services.values());
  }

  addRoute(route: RouteConfig): void {
    if (!this.routes.has(route.path)) {
      this.routes.set(route.path, []);
    }

    const existingRoutes = this.routes.get(route.path)!;
    existingRoutes.push(route);

    // Sort by priority (higher priority first)
    existingRoutes.sort((a, b) => (b.priority || 0) - (a.priority || 0));

    this.logger.log(`Added route: ${route.method} ${route.path} -> ${route.serviceUrl}`);
  }

  removeRoute(path: string, method?: HttpMethod): void {
    if (method) {
      const routes = this.routes.get(path);
      if (routes) {
        const index = routes.findIndex(route =>
          Array.isArray(route.method)
            ? route.method.includes(method)
            : route.method === method
        );
        if (index !== -1) {
          routes.splice(index, 1);
          this.logger.log(`Removed route: ${method} ${path}`);
        }
      }
    } else {
      this.routes.delete(path);
      this.logger.log(`Removed all routes for path: ${path}`);
    }
  }

  updateRoute(path: string, method: HttpMethod, updates: Partial<RouteConfig>): void {
    const routes = this.routes.get(path);
    if (routes) {
      const route = routes.find(r =>
        Array.isArray(r.method)
          ? r.method.includes(method)
          : r.method === method
      );

      if (route) {
        Object.assign(route, updates);
        this.logger.log(`Updated route: ${method} ${path}`);
      }
    }
  }

  private initializeRoutes(): void {
    // Load routes from configuration
    const routesConfig = this.configService.get<RouteConfig[]>('gateway.routes', []);

    for (const route of routesConfig) {
      this.addRoute(route);
    }

    // Add default routes based on the microservices architecture
    this.addDefaultRoutes();
  }

  private addDefaultRoutes(): void {
    const defaultRoutes: RouteConfig[] = [
      {
        path: '/api/v1/auth/*',
        method: [HttpMethod.POST, HttpMethod.PUT, HttpMethod.DELETE],
        service: 'auth-service',
        serviceUrl: 'http://localhost:3001',
        auth: { required: false },
        rateLimit: { windowMs: 60000, max: 50 },
        timeout: 10000,
        priority: 100,
      },
      {
        path: '/api/v1/users/*',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
        auth: { required: true, permissions: ['users:read'] },
        rateLimit: { windowMs: 60000, max: 100 },
        timeout: 5000,
        priority: 90,
      },
      {
        path: '/api/v1/projects/*',
        method: HttpMethod.ALL,
        service: 'project-service',
        serviceUrl: 'http://localhost:3003',
        auth: { required: true, permissions: ['projects:*'] },
        rateLimit: { windowMs: 60000, max: 75 },
        timeout: 15000,
        priority: 80,
      },
      {
        path: '/api/v1/agents/*',
        method: HttpMethod.ALL,
        service: 'agent-service',
        serviceUrl: 'http://localhost:3004',
        auth: { required: true, permissions: ['agents:*'] },
        rateLimit: { windowMs: 60000, max: 50 },
        timeout: 30000,
        priority: 70,
      },
      {
        path: '/api/v1/tasks/*',
        method: HttpMethod.ALL,
        service: 'task-service',
        serviceUrl: 'http://localhost:3005',
        auth: { required: true, permissions: ['tasks:*'] },
        rateLimit: { windowMs: 60000, max: 100 },
        timeout: 25000,
        priority: 60,
      },
      {
        path: '/api/v1/rag/*',
        method: HttpMethod.ALL,
        service: 'rag-service',
        serviceUrl: 'http://localhost:3006',
        auth: { required: true, permissions: ['rag:*'] },
        rateLimit: { windowMs: 60000, max: 150 },
        timeout: 20000,
        priority: 50,
      },
      {
        path: '/api/v1/tokens/*',
        method: HttpMethod.ALL,
        service: 'token-service',
        serviceUrl: 'http://localhost:3007',
        auth: { required: true, permissions: ['tokens:*'] },
        rateLimit: { windowMs: 60000, max: 200 },
        timeout: 10000,
        priority: 40,
      },
      {
        path: '/api/v1/health',
        method: HttpMethod.GET,
        service: 'gateway',
        serviceUrl: 'http://localhost:3000',
        auth: { required: false },
        rateLimit: { windowMs: 60000, max: 10 },
        timeout: 1000,
        priority: 1000,
      },
    ];

    for (const route of defaultRoutes) {
      this.addRoute(route);
    }

    this.logger.log(`Initialized ${defaultRoutes.length} default routes`);
  }

  private initializeServices(): void {
    const servicesConfig = this.configService.get<ServiceInfo[]>('gateway.services', []);

    for (const service of servicesConfig) {
      this.services.set(service.name, service);
    }

    // Add default services
    const defaultServices: ServiceInfo[] = [
      { name: 'auth-service', url: 'http://localhost:3001', description: 'Authentication and authorization service' },
      { name: 'user-service', url: 'http://localhost:3002', description: 'User management service' },
      { name: 'project-service', url: 'http://localhost:3003', description: 'Project management service' },
      { name: 'agent-service', url: 'http://localhost:3004', description: 'Luna agents execution service' },
      { name: 'task-service', url: 'http://localhost:3005', description: 'Task management and execution service' },
      { name: 'rag-service', url: 'http://localhost:3006', description: 'RAG and semantic search service' },
      { name: 'token-service', url: 'http://localhost:3007', description: 'Token usage and optimization service' },
    ];

    for (const service of defaultServices) {
      if (!this.services.has(service.name)) {
        this.services.set(service.name, service);
      }
    }

    this.logger.log(`Initialized ${this.services.size} services`);
  }
}

interface ServiceInfo {
  name: string;
  url: string;
  description?: string;
  version?: string;
  healthEndpoint?: string;
  tags?: string[];
}
