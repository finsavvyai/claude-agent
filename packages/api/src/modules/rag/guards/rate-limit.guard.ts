import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RateLimitUtil } from '../utils/rate-limit.util';
import { Request } from 'express';

export const RATE_LIMIT_KEY = 'rateLimit';

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitUtil: RateLimitUtil
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const rateLimitConfig = this.reflector.get(RATE_LIMIT_KEY, context.getHandler());

    if (!rateLimitConfig) {
      return true; // No rate limit configured
    }

    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse();

    // Get identifier for rate limiting
    const identifier = this.getIdentifier(request);

    // Check rate limit
    const result = await this.rateLimitUtil.checkRateLimit(identifier, rateLimitConfig);

    if (!result.allowed) {
      // Set rate limit headers
      response.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests);
      response.setHeader('X-RateLimit-Remaining', result.remaining);
      response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

      if (result.retryAfter) {
        response.setHeader('Retry-After', result.retryAfter);
      }

      throw new ForbiddenException({
        message: 'Rate limit exceeded',
        retryAfter: result.retryAfter,
        resetTime: result.resetTime,
      });
    }

    // Set rate limit headers for successful requests
    response.setHeader('X-RateLimit-Limit', rateLimitConfig.maxRequests);
    response.setHeader('X-RateLimit-Remaining', result.remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(result.resetTime / 1000));

    return true;
  }

  /**
   * Get identifier for rate limiting
   * Priority: User ID > IP Address
   */
  private getIdentifier(request: Request): string {
    // Try to get user ID first (if authenticated)
    const user = (request as any).user;
    if (user?.id) {
      return RateLimitUtil.generateUserKey(user.id, this.getOperationName(request));
    }

    // Fall back to IP address
    const ip = this.getClientIp(request);
    return RateLimitUtil.generateIpKey(ip, this.getOperationName(request));
  }

  /**
   * Get client IP address from request
   */
  private getClientIp(request: Request): string {
    const xForwardedFor = request.headers['x-forwarded-for'] as string;
    const xRealIp = request.headers['x-real-ip'] as string;

    if (xForwardedFor) {
      return xForwardedFor.split(',')[0].trim();
    }

    if (xRealIp) {
      return xRealIp;
    }

    return request.connection.remoteAddress ||
           request.socket.remoteAddress ||
           (request.connection as any)?.socket?.remoteAddress ||
           '127.0.0.1';
  }

  /**
   * Get operation name from request route
   */
  private getOperationName(request: Request): string {
    const route = request.route;
    if (route?.path) {
      return route.path.replace(/[\/:]/g, '_');
    }

    // Fallback to URL path
    return request.path.replace(/[\/:]/g, '_');
  }
}
