import { Injectable, NestMiddleware, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

import { RateLimitConfig } from '../interfaces/route-config.interface';
import { RoutingService } from '../services/routing.service';

interface RateLimitInfo {
  count: number;
  resetTime: number;
  windowMs: number;
  max: number;
}

@Injectable()
export class RateLimitMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RateLimitMiddleware.name);
  private redis: Redis;

  constructor(
    private readonly configService: ConfigService,
    private readonly routingService: RoutingService,
  ) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: this.configService.get('REDIS_PORT', 6379),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get route configuration to determine rate limiting requirements
      const route = await this.routingService.resolveRoute(req);

      if (!route?.rateLimit) {
        // No rate limiting required for this route
        return next();
      }

      const rateLimitConfig = route.rateLimit;
      const key = this.generateKey(req, rateLimitConfig);

      // Check current rate limit status
      const rateLimitInfo = await this.checkRateLimit(key, rateLimitConfig);

      // Add rate limit headers to response
      this.addRateLimitHeaders(res, rateLimitInfo);

      // Check if limit exceeded
      if (rateLimitInfo.count >= rateLimitConfig.max) {
        const waitTime = Math.ceil((rateLimitInfo.resetTime - Date.now()) / 1000);

        this.logger.warn(`Rate limit exceeded for key: ${key}, count: ${rateLimitInfo.count}, max: ${rateLimitConfig.max}`);

        throw new HttpException({
          error: 'Too Many Requests',
          message: rateLimitConfig.message || `Rate limit exceeded. Try again in ${waitTime} seconds.`,
          retryAfter: waitTime,
          timestamp: new Date().toISOString(),
        }, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Increment the counter
      await this.incrementCounter(key, rateLimitConfig);

      this.logger.debug(`Rate limit check passed for key: ${key}, count: ${rateLimitInfo.count}/${rateLimitConfig.max}`);
      next();

    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      this.logger.error(`Rate limiting error: ${error.message}`, error.stack);
      // If Redis fails, allow the request to proceed (fail open)
      next();
    }
  }

  private generateKey(req: Request, config: RateLimitConfig): string {
    // Use custom key generator if provided
    if (config.keyGenerator) {
      return config.keyGenerator(req);
    }

    // Default key generation strategy
    const parts = ['rate_limit'];

    // Include IP address
    const ip = this.getClientIP(req);
    parts.push(ip);

    // Include user ID if authenticated
    const user = (req as any).user;
    if (user?.userId) {
      parts.push(user.userId);
    }

    // Include endpoint
    parts.push(`${req.method}:${req.path}`);

    return parts.join(':');
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  private async checkRateLimit(key: string, config: RateLimitConfig): Promise<RateLimitInfo> {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Get current count and reset time from Redis
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.get(`${key}:reset_time`);

      const results = await pipeline.exec();

      const count = parseInt(results?.[0]?.[1] as string || '0', 10);
      let resetTime = parseInt(results?.[1]?.[1] as string || '0', 10);

      // Reset if window has expired
      if (now >= resetTime) {
        await this.redis.del(key);
        await this.redis.del(`${key}:reset_time`);
        return { count: 0, resetTime: now + config.windowMs, windowMs: config.windowMs, max: config.max };
      }

      return { count, resetTime, windowMs: config.windowMs, max: config.max };

    } catch (error) {
      this.logger.error(`Error checking rate limit: ${error.message}`);
      // Return default values on Redis error
      return { count: 0, resetTime: now + config.windowMs, windowMs: config.windowMs, max: config.max };
    }
  }

  private async incrementCounter(key: string, config: RateLimitConfig): Promise<void> {
    const now = Date.now();
    const resetTime = now + config.windowMs;

    try {
      const pipeline = this.redis.pipeline();

      // Increment counter with expiration
      pipeline.incr(key);
      pipeline.expire(key, Math.ceil(config.windowMs / 1000));

      // Set reset time
      pipeline.set(`${key}:reset_time`, resetTime.toString());
      pipeline.expire(`${key}:reset_time`, Math.ceil(config.windowMs / 1000));

      await pipeline.exec();

    } catch (error) {
      this.logger.error(`Error incrementing rate limit counter: ${error.message}`);
    }
  }

  private addRateLimitHeaders(res: Response, rateLimitInfo: RateLimitInfo): void {
    res.setHeader('X-RateLimit-Limit', rateLimitInfo.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, rateLimitInfo.max - rateLimitInfo.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimitInfo.resetTime / 1000));
  }

  async resetRateLimit(key: string): Promise<void> {
    try {
      await this.redis.del(key);
      await this.redis.del(`${key}:reset_time`);
      this.logger.debug(`Rate limit reset for key: ${key}`);
    } catch (error) {
      this.logger.error(`Error resetting rate limit: ${error.message}`);
    }
  }

  async getRateLimitInfo(key: string, config: RateLimitConfig): Promise<RateLimitInfo | null> {
    try {
      return await this.checkRateLimit(key, config);
    } catch (error) {
      this.logger.error(`Error getting rate limit info: ${error.message}`);
      return null;
    }
  }

  async getGlobalStats(): Promise<any> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      const stats = {
        totalKeys: keys.length,
        activeLimits: 0,
        averageUsage: 0,
      };

      if (keys.length === 0) {
        return stats;
      }

      let totalUsage = 0;
      let activeCount = 0;

      for (const key of keys.slice(0, 100)) { // Limit to 100 keys to avoid overwhelming Redis
        const value = await this.redis.get(key);
        if (value) {
          const count = parseInt(value, 10);
          totalUsage += count;
          if (count > 0) {
            activeCount++;
          }
        }
      }

      stats.activeLimits = activeCount;
      stats.averageUsage = activeCount > 0 ? totalUsage / activeCount : 0;

      return stats;

    } catch (error) {
      this.logger.error(`Error getting global rate limit stats: ${error.message}`);
      return null;
    }
  }

  // Cleanup expired rate limit entries
  async cleanupExpiredEntries(): Promise<number> {
    try {
      const pattern = 'rate_limit:*';
      const keys = await this.redis.keys(pattern);

      let deletedCount = 0;
      const now = Date.now();

      for (const key of keys) {
        const resetTime = await this.redis.get(`${key}:reset_time`);
        if (resetTime && parseInt(resetTime, 10) < now) {
          await this.redis.del(key);
          await this.redis.del(`${key}:reset_time`);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        this.logger.debug(`Cleaned up ${deletedCount} expired rate limit entries`);
      }

      return deletedCount;

    } catch (error) {
      this.logger.error(`Error cleaning up expired rate limit entries: ${error.message}`);
      return 0;
    }
  }

  onModuleDestroy() {
    if (this.redis) {
      this.redis.disconnect();
    }
  }
}
