/**
 * Authentication utilities for RAG service
 * Handles user context and authentication integration
 */

import { Injectable } from '@nestjs/common';
import { Context } from '@nestjs/graphql';
import { GqlExecutionContext } from '@nestjs/graphql';
import { ExecutionContext } from '@nestjs/common';

export interface AuthContext {
  userId: string;
  username?: string;
  email?: string;
  roles?: string[];
  permissions?: string[];
  sessionId?: string;
  clientIp?: string;
  userAgent?: string;
}

/**
 * Extract authentication context from various request sources
 */
export function extractAuthContext(context: ExecutionContext): AuthContext | null {
  try {
    // Handle GraphQL context
    if (context.getType() === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext();

      if (gqlContext.req?.user) {
        return {
          userId: gqlContext.req.user.id || gqlContext.req.user.sub,
          username: gqlContext.req.user.username,
          email: gqlContext.req.user.email,
          roles: gqlContext.req.user.roles,
          permissions: gqlContext.req.user.permissions,
          sessionId: gqlContext.req.sessionId,
          clientIp: gqlContext.req.ip,
          userAgent: gqlContext.req.get('user-agent')
        };
      }

      // GraphQL context might have user directly
      if (gqlContext.user) {
        return {
          userId: gqlContext.user.id || gqlContext.user.sub,
          username: gqlContext.user.username,
          email: gqlContext.user.email,
          roles: gqlContext.user.roles,
          permissions: gqlContext.user.permissions,
          sessionId: gqlContext.sessionId,
          clientIp: gqlContext.ip,
          userAgent: gqlContext.userAgent
        };
      }
    }

    // Handle REST context
    const request = context.switchToHttp().getRequest();
    if (request?.user) {
      return {
        userId: request.user.id || request.user.sub,
        username: request.user.username,
        email: request.user.email,
        roles: request.user.roles,
        permissions: request.user.permissions,
        sessionId: request.sessionId,
        clientIp: request.ip,
        userAgent: request.get('user-agent')
      };
    }

    // No user found
    return null;
  } catch (error) {
    console.warn('Failed to extract auth context:', error);
    return null;
  }
}

/**
 * Generate metadata with authenticated user information
 */
export function createUserMetadata(
  authContext: AuthContext | null,
  additionalMetadata: Record<string, any> = {}
): Record<string, any> {
  if (!authContext) {
    return {
      ...additionalMetadata,
      // Keep some placeholders for backward compatibility
      createdBy: 'system',
      updatedBy: 'system',
      deletedBy: 'system',
      authType: 'unauthenticated'
    };
  }

  return {
    ...additionalMetadata,
    createdBy: authContext.userId,
    updatedBy: authContext.userId,
    deletedBy: authContext.userId,
    authType: 'authenticated',
    userId: authContext.userId,
    username: authContext.username,
    email: authContext.email,
    roles: authContext.roles,
    permissions: authContext.permissions,
    sessionId: authContext.sessionId,
    clientIp: authContext.clientIp,
    userAgent: authContext.userAgent,
    timestamp: new Date().toISOString()
  };
}

/**
 * Decorator to automatically inject user context
 */
export function AuthContext() {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const executionContext = this.getContext?.() || args.find(arg =>
        arg && typeof arg === 'object' && arg.constructor?.name === 'ExecutionContext'
      );

      if (executionContext) {
        const authContext = extractAuthContext(executionContext);

        // Inject auth context as first parameter if method signature supports it
        if (originalMethod.length > 0 && typeof args[0] !== 'object') {
          return originalMethod.apply(this, [authContext, ...args]);
        }
      }

      return originalMethod.apply(this, args);
    };

    return descriptor;
  };
}

/**
 * Middleware to enrich RAG operations with user context
 */
@Injectable()
export class RAGAuthMiddleware {
  private readonly defaultAuthContext: AuthContext = {
    userId: 'system',
    username: 'System User',
    roles: ['system'],
    permissions: ['read', 'write'],
    sessionId: 'system-session',
    clientIp: '127.0.0.1',
    userAgent: 'Claude Agent Platform'
  };

  /**
   * Enrich RAG operation with user context
   */
  enrichOperation<T>(
    operation: T,
    authContext: AuthContext | null = null
  ): T & { authContext: AuthContext } {
    const context = authContext || this.defaultAuthContext;

    return {
      ...operation,
      authContext: context
    };
  }

  /**
   * Create user-specific filters for RAG queries
   */
  createUserFilters(authContext: AuthContext | null): Record<string, any> {
    if (!authContext) {
      return { public: true };
    }

    return {
      $or: [
        { public: true },
        { createdBy: authContext.userId },
        { allowedUsers: { $in: [authContext.userId] } },
        { allowedRoles: { $in: authContext.roles || [] } }
      ]
    };
  }

  /**
   * Check if user has permission for RAG operation
   */
  hasPermission(
    authContext: AuthContext | null,
    requiredPermission: string
  ): boolean {
    if (!authContext) {
      return requiredPermission === 'read'; // Allow read for unauthenticated
    }

    const userPermissions = authContext.permissions || [];
    const userRoles = authContext.roles || [];

    // System user has all permissions
    if (authContext.userId === 'system' || userRoles.includes('admin')) {
      return true;
    }

    return userPermissions.includes(requiredPermission) ||
           userRoles.includes('admin') ||
           userRoles.includes('rag-admin');
  }

  /**
   * Add audit logging for RAG operations
   */
  async auditLog(
    operation: string,
    authContext: AuthContext | null,
    details: Record<string, any> = {}
  ): Promise<void> {
    const auditEntry = {
      timestamp: new Date().toISOString(),
      operation,
      userId: authContext?.userId || 'anonymous',
      username: authContext?.username || 'Anonymous User',
      roles: authContext?.roles || [],
      permissions: authContext?.permissions || [],
      sessionId: authContext?.sessionId,
      clientIp: authContext?.clientIp,
      userAgent: authContext?.userAgent,
      details,
      success: true
    };

    // In production, this would be sent to a logging service
    console.log('RAG Audit:', JSON.stringify(auditEntry, null, 2));

    // TODO: Implement proper audit logging to database or external service
  }

  /**
   * Get rate limit key for user
   */
  getRateLimitKey(authContext: AuthContext | null, operation: string): string {
    const userId = authContext?.userId || 'anonymous';
    return `rag:${operation}:${userId}`;
  }
}
