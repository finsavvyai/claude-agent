import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { RoutingService } from './routing.service';
import { RouteConfig, HttpMethod } from '../interfaces/route-config.interface';

describe('RoutingService', () => {
  let service: RoutingService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutingService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<RoutingService>(RoutingService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('resolveRoute', () => {
    it('should resolve exact path match', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const req = {
        path: '/api/v1/users',
        method: 'GET',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toEqual(route);
    });

    it('should resolve pattern match with path parameters', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users/:id',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const req = {
        path: '/api/v1/users/123',
        method: 'GET',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toBeDefined();
      expect(resolved!.path).toBe(route.path);
      expect(resolved!.pathParams).toEqual({ id: '123' });
    });

    it('should resolve wildcard match', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users/*',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const req = {
        path: '/api/v1/users/123/profile',
        method: 'GET',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toBeDefined();
      expect(resolved!.path).toBe(route.path);
    });

    it('should return null for non-matching path', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const req = {
        path: '/api/v1/projects',
        method: 'GET',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toBeNull();
    });

    it('should return null for non-matching method', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const req = {
        path: '/api/v1/users',
        method: 'POST',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toBeNull();
    });

    it('should handle multiple methods', async () => {
      const route: RouteConfig = {
        path: '/api/v1/users',
        method: [HttpMethod.GET, HttpMethod.POST],
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
      };

      service.addRoute(route);

      const getReq = {
        path: '/api/v1/users',
        method: 'GET',
      } as Request;

      const postReq = {
        path: '/api/v1/users',
        method: 'POST',
      } as Request;

      const getResolved = await service.resolveRoute(getReq);
      const postResolved = await service.resolveRoute(postReq);

      expect(getResolved).toEqual(route);
      expect(postResolved).toEqual(route);
    });

    it('should prioritize routes by priority', async () => {
      const lowPriorityRoute: RouteConfig = {
        path: '/api/v1/users/*',
        method: HttpMethod.GET,
        service: 'user-service',
        serviceUrl: 'http://localhost:3002',
        priority: 1,
      };

      const highPriorityRoute: RouteConfig = {
        path: '/api/v1/users/special',
        method: HttpMethod.GET,
        service: 'special-service',
        serviceUrl: 'http://localhost:3003',
        priority: 100,
      };

      service.addRoute(lowPriorityRoute);
      service.addRoute(highPriorityRoute);

      const req = {
        path: '/api/v1/users/special',
        method: 'GET',
      } as Request;

      const resolved = await service.resolveRoute(req);
      expect(resolved).toEqual(highPriorityRoute);
    });
  });

  describe('pathMatches', () => {
    it('should match exact paths', () => {
      const result = (service as any).pathMatches('/api/v1/users', '/api/v1/users');
      expect(result).toBe(true);
    });

    it('should match path parameters', () => {
      const result = (service as any).pathMatches('/api/v1/users/123', '/api/v1/users/:id');
      expect(result).toBe(true);
    });

    it('should match wildcards', () => {
      const result = (service as any).pathMatches('/api/v1/users/123/profile', '/api/v1/users/*');
      expect(result).toBe(true);
    });

    it('should not match different paths', () => {
      const result = (service as any).pathMatches('/api/v1/projects', '/api/v1/users');
      expect(result).toBe(false);
    });

    it('should not match different segment counts', () => {
      const result = (service as any).pathMatches('/api/v1/users/123/profile', '/api/v1/users/:id');
      expect(result).toBe(false);
    });
  });

  describe('extractPathParams', () => {
    it('should extract path parameters correctly', () => {
      const params = (service as any).extractPathParams('/api/v1/users/123/posts/456', '/api/v1/users/:userId/posts/:postId');
      expect(params).toEqual({
        userId: '123',
        postId: '456',
      });
    });

    it('should return empty object for no parameters', () => {
      const params = (service as any).extractPathParams('/api/v1/users', '/api/v1/users');
      expect(params).toEqual({});
    });
  });

  describe('addRoute', () => {
    it('should add route to routes map', () => {
      const route: RouteConfig = {
        path: '/api/v1/test',
        method: HttpMethod.GET,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      service.addRoute(route);

      const routes = service.getAllRoutes();
      expect(routes).toContainEqual(route);
    });
  });

  describe('removeRoute', () => {
    it('should remove specific method route', () => {
      const route: RouteConfig = {
        path: '/api/v1/test',
        method: HttpMethod.GET,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      service.addRoute(route);
      service.removeRoute('/api/v1/test', HttpMethod.GET);

      const routes = service.getAllRoutes();
      expect(routes).not.toContainEqual(route);
    });

    it('should remove all routes for path', () => {
      const getRoute: RouteConfig = {
        path: '/api/v1/test',
        method: HttpMethod.GET,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      const postRoute: RouteConfig = {
        path: '/api/v1/test',
        method: HttpMethod.POST,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      service.addRoute(getRoute);
      service.addRoute(postRoute);
      service.removeRoute('/api/v1/test');

      const routes = service.getAllRoutes();
      expect(routes).not.toContainEqual(getRoute);
      expect(routes).not.toContainEqual(postRoute);
    });
  });

  describe('updateRoute', () => {
    it('should update existing route', () => {
      const route: RouteConfig = {
        path: '/api/v1/test',
        method: HttpMethod.GET,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      service.addRoute(route);
      service.updateRoute('/api/v1/test', HttpMethod.GET, { priority: 200 });

      const routes = service.getAllRoutes();
      const updatedRoute = routes.find(r => r.path === '/api/v1/test' && r.method === HttpMethod.GET);
      expect(updatedRoute?.priority).toBe(200);
    });
  });

  describe('getAllRoutes', () => {
    it('should return all routes', async () => {
      const route1: RouteConfig = {
        path: '/api/v1/test1',
        method: HttpMethod.GET,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      const route2: RouteConfig = {
        path: '/api/v1/test2',
        method: HttpMethod.POST,
        service: 'test-service',
        serviceUrl: 'http://localhost:9999',
      };

      service.addRoute(route1);
      service.addRoute(route2);

      const routes = await service.getAllRoutes();
      expect(routes).toHaveLength(expect.any(Number));
      expect(routes).toContainEqual(route1);
      expect(routes).toContainEqual(route2);
    });
  });

  describe('getAllServices', () => {
    it('should return all services', async () => {
      const services = await service.getAllServices();
      expect(Array.isArray(services)).toBe(true);

      // Check for default services
      const serviceNames = services.map(s => s.name);
      expect(serviceNames).toContain('auth-service');
      expect(serviceNames).toContain('user-service');
      expect(serviceNames).toContain('project-service');
    });
  });
});
