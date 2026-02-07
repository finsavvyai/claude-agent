import { Injectable, NestMiddleware, Logger, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

import { RouteConfig } from '../interfaces/route-config.interface';
import { RoutingService } from '../services/routing.service';

export interface AuthenticatedRequest extends Request {
  user?: any;
  authContext?: AuthContext;
}

export interface AuthContext {
  userId: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  token: string;
}

@Injectable()
export class AuthenticationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthenticationMiddleware.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    private readonly routingService: RoutingService,
  ) {}

  async use(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get route configuration to determine auth requirements
      const route = await this.routingService.resolveRoute(req);

      if (!route || !route.auth?.required) {
        // No authentication required for this route
        return next();
      }

      // Check if this path should bypass authentication
      if (route.auth.bypassPaths?.some(path => req.path.includes(path))) {
        return next();
      }

      // Extract and validate token
      const token = this.extractToken(req);
      if (!token) {
        throw new UnauthorizedException('Authentication token is required');
      }

      // Verify JWT token
      const payload = await this.verifyToken(token);

      // Create auth context
      const authContext = await this.createAuthContext(payload, token);

      // Validate permissions and roles if required
      await this.validateAuthorization(authContext, route);

      // Attach auth context to request
      req.user = authContext;
      req.authContext = authContext;

      this.logger.debug(`Authenticated user: ${authContext.username} (${authContext.userId})`);
      next();

    } catch (error) {
      this.logger.error(`Authentication failed: ${error.message}`, error.stack);

      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }

      throw new UnauthorizedException('Invalid authentication token');
    }
  }

  private extractToken(req: Request): string | null {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return null;
    }

    // Extract Bearer token
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // For backward compatibility, also support token in other headers
    const token = req.headers['x-api-token'] as string;
    return token || null;
  }

  private async verifyToken(token: string): Promise<any> {
    try {
      return await this.jwtService.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
        algorithms: ['HS256'],
      });
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private async createAuthContext(payload: any, token: string): Promise<AuthContext> {
    return {
      userId: payload.sub || payload.userId,
      username: payload.username,
      email: payload.email,
      roles: payload.roles || [],
      permissions: payload.permissions || [],
      sessionId: payload.sessionId || this.generateSessionId(),
      token,
    };
  }

  private async validateAuthorization(authContext: AuthContext, route: RouteConfig): Promise<void> {
    const auth = route.auth!;

    // Validate roles if required
    if (auth.roles && auth.roles.length > 0) {
      const hasRequiredRole = auth.roles.some(role => authContext.roles.includes(role));
      if (!hasRequiredRole) {
        throw new ForbiddenException(`Required role not found. Required roles: ${auth.roles.join(', ')}`);
      }
    }

    // Validate permissions if required
    if (auth.permissions && auth.permissions.length > 0) {
      const hasRequiredPermission = auth.permissions.some(permission =>
        this.hasPermission(authContext.permissions, permission)
      );

      if (!hasRequiredPermission) {
        throw new ForbiddenException(`Required permission not found. Required permissions: ${auth.permissions.join(', ')}`);
      }
    }

    // Additional authorization strategies can be added here
    if (auth.strategies) {
      for (const strategy of auth.strategies) {
        await this.executeAuthorizationStrategy(strategy, authContext, route);
      }
    }
  }

  private hasPermission(userPermissions: string[], requiredPermission: string): boolean {
    // Support wildcard permissions
    if (userPermissions.includes('*') || userPermissions.includes('*:*')) {
      return true;
    }

    // Exact match
    if (userPermissions.includes(requiredPermission)) {
      return true;
    }

    // Wildcard matching (e.g., users:* matches users:read)
    const [resource, action] = requiredPermission.split(':');
    const wildcardPermission = `${resource}:*`;

    return userPermissions.includes(wildcardPermission);
  }

  private async executeAuthorizationStrategy(
    strategy: string,
    authContext: AuthContext,
    route: RouteConfig,
  ): Promise<void> {
    switch (strategy) {
      case 'owner_only':
        await this.validateOwnerOnly(authContext, route);
        break;
      case 'team_member':
        await this.validateTeamMember(authContext, route);
        break;
      case 'admin_only':
        await this.validateAdminOnly(authContext);
        break;
      default:
        this.logger.warn(`Unknown authorization strategy: ${strategy}`);
    }
  }

  private async validateOwnerOnly(authContext: AuthContext, route: RouteConfig): Promise<void> {
    // Extract resource ID from request
    const resourceId = this.extractResourceId(req);
    if (!resourceId) {
      return; // No resource ID, skip validation
    }

    // Here you would typically check if the user owns the resource
    // This is a placeholder implementation
    const isOwner = await this.checkResourceOwnership(authContext.userId, resourceId, route.service);

    if (!isOwner) {
      throw new ForbiddenException('Only resource owners can perform this action');
    }
  }

  private async validateTeamMember(authContext: AuthContext, route: RouteConfig): Promise<void> {
    // Extract project/team ID from request
    const projectId = this.extractProjectId(req);
    if (!projectId) {
      return; // No project ID, skip validation
    }

    // Check if user is a member of the team
    const isTeamMember = await this.checkTeamMembership(authContext.userId, projectId);

    if (!isTeamMember) {
      throw new ForbiddenException('Only team members can perform this action');
    }
  }

  private async validateAdminOnly(authContext: AuthContext): Promise<void> {
    if (!authContext.roles.includes('admin') && !authContext.roles.includes('super_admin')) {
      throw new ForbiddenException('Only administrators can perform this action');
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private extractResourceId(req: Request): string | null {
    // Extract resource ID from URL path
    const match = req.path.match(/\/([^\/]+)$/);
    return match ? match[1] : null;
  }

  private extractProjectId(req: Request): string | null {
    // Extract project ID from URL path
    const match = req.path.match(/\/projects\/([^\/]+)/);
    return match ? match[1] : null;
  }

  // These methods would typically interact with your database or other services
  private async checkResourceOwnership(
    userId: string,
    resourceId: string,
    service: string,
  ): Promise<boolean> {
    // Placeholder implementation
    // In a real application, you would query your database
    return true;
  }

  private async checkTeamMembership(userId: string, projectId: string): Promise<boolean> {
    // Placeholder implementation
    // In a real application, you would query your database
    return true;
  }
}
