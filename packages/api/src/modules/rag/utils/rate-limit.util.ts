import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Redis from 'ioredis';

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  keyGenerator?: (identifier: string) => string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter?: number;
}

@Injectable()
export class RateLimitUtil {
  private readonly logger = new Logger(RateLimitUtil.name);
  private readonly redis: Redis.Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      host: this.configService.get('REDIS_HOST', 'localhost'),
      port: parseInt(this.configService.get('REDIS_PORT', '6379')),
      password: this.configService.get('REDIS_PASSWORD'),
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });
  }

  /**
   * Check if request is allowed based on rate limit
   */
  async checkRateLimit(
    identifier: string,
    config: RateLimitConfig
  ): Promise<RateLimitResult> {
    const key = config.keyGenerator
      ? config.keyGenerator(identifier)
      : `rate_limit:${identifier}`;

    const now = Date.now();
    const windowStart = now - config.windowMs;

    try {
      // Use Redis pipeline for atomic operations
      const pipeline = this.redis.pipeline();

      // Remove old entries outside the window
      pipeline.zremrangebyscore(key, 0, windowStart);

      // Count current requests in window
      pipeline.zcard(key);

      // Get TTL for cleanup
      pipeline.ttl(key);

      const results = await pipeline.exec();
      const currentRequests = results?.[1]?.[1] as number || 0;

      if (currentRequests >= config.maxRequests) {
        // Rate limit exceeded
        const oldestRequest = await this.redis.zrange(key, 0, 0, 'WITHSCORES');
        const resetTime = oldestRequest?.[0]?.[1] ? parseInt(oldestRequest[0][1]) + config.windowMs : now + config.windowMs;

        return {
          allowed: false,
          remaining: 0,
          resetTime,
          retryAfter: Math.ceil((resetTime - now) / 1000),
        };
      }

      // Add current request
      await this.redis.zadd(key, now, `${now}-${Math.random()}`);

      // Set expiration for cleanup
      await this.redis.expire(key, Math.ceil(config.windowMs / 1000) + 1);

      return {
        allowed: true,
        remaining: Math.max(0, config.maxRequests - currentRequests - 1),
        resetTime: now + config.windowMs,
      };

    } catch (error) {
      this.logger.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis is down
      return {
        allowed: true,
        remaining: config.maxRequests,
        resetTime: now + config.windowMs,
      };
    }
  }

  /**
   * Rate limit configurations for different operations
   */
  static readonly RATE_LIMITS = {
    // API endpoints
    API_GENERAL: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 1000, // 1000 requests per 15 minutes
    },

    API_OPTIMIZATION: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // 100 optimizations per 15 minutes
    },

    API_GITHUB_CONNECT: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 10, // 10 GitHub connections per hour
    },

    API_GITHUB_API: {
      windowMs: 60 * 1000, // 1 minute
      maxRequests: 60, // 60 GitHub API calls per minute
    },

    // Authentication endpoints
    AUTH_LOGIN: {
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 20, // 20 login attempts per 15 minutes
    },

    AUTH_REGISTER: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 5, // 5 registrations per hour
    },

    // Data operations
    DATA_UPLOAD: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 50, // 50 uploads per hour
    },

    DATA_EXPORT: {
      windowMs: 60 * 60 * 1000, // 1 hour
      maxRequests: 20, // 20 exports per hour
    },
  };

  /**
   * Get rate limit configuration for a specific operation
   */
  static getRateLimitConfig(operation: keyof typeof RateLimitUtil.RATE_LIMITS): RateLimitConfig {
    return RateLimitUtil.RATE_LIMITS[operation];
  }

  /**
   * Generate rate limit key for user
   */
  static generateUserKey(userId: string, operation: string): string {
    return `user:${userId}:${operation}`;
  }

  /**
   * Generate rate limit key for IP
   */
  static generateIpKey(ip: string, operation: string): string {
    return `ip:${ip}:${operation}`;
  }

  /**
   * Generate rate limit key for global operation
   */
  static generateGlobalKey(operation: string): string {
    return `global:${operation}`;
  }

  /**
   * Clean up old rate limit data
   */
  async cleanup(): Promise<void> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.logger.log(`Cleaned up ${keys.length} rate limit keys`);
      }
    } catch (error) {
      this.logger.error('Rate limit cleanup failed:', error);
    }
  }

  /**
   * Get current rate limit status
   */
  async getRateLimitStatus(identifier: string): Promise<{
    current: number;
    limit: number;
    resetTime: number;
  }> {
    const key = `rate_limit:${identifier}`;
    const now = Date.now();
    const windowMs = 15 * 60 * 1000; // Default 15 minutes
    const windowStart = now - windowMs;

    try {
      // Remove old entries
      await this.redis.zremrangebyscore(key, 0, windowStart);

      // Count current requests
      const current = await this.redis.zcard(key);

      // Get TTL
      const ttl = await this.redis.ttl(key);
      const resetTime = ttl > 0 ? now + (ttl * 1000) : now + windowMs;

      return {
        current,
        limit: 1000, // Default limit
        resetTime,
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit status:', error);
      return {
        current: 0,
        limit: 1000,
        resetTime: now + windowMs,
      };
    }
  }

  /**
   * Reset rate limit for identifier (admin function)
   */
  async resetRateLimit(identifier: string): Promise<void> {
    try {
      await this.redis.del(`rate_limit:${identifier}`);
      this.logger.log(`Rate limit reset for: ${identifier}`);
    } catch (error) {
      this.logger.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Check if identifier is currently rate limited
   */
  async isRateLimited(identifier: string, config: RateLimitConfig): Promise<boolean> {
    const result = await this.checkRateLimit(identifier, config);
    return !result.allowed;
  }

  /**
   * Get rate limit statistics
   */
  async getStats(): Promise<{
    totalKeys: number;
    activeLimits: number;
    memoryUsage?: string;
  }> {
    try {
      const keys = await this.redis.keys('rate_limit:*');
      const activeLimits = await this.redis.eval(`
        local count = 0
        local keys = redis.call('keys', 'rate_limit:*')
        for i = 1, #keys do
          local ttl = redis.call('ttl', keys[i])
          if ttl > 0 then
            count = count + 1
          end
        end
        return count
      `, 0) as number;

      const info = await this.redis.info('memory');
      const memoryMatch = info.match(/used_memory_human:([^\r\n]+)/);
      const memoryUsage = memoryMatch ? memoryMatch[1] : undefined;

      return {
        totalKeys: keys.length,
        activeLimits,
        memoryUsage,
      };
    } catch (error) {
      this.logger.error('Failed to get rate limit stats:', error);
      return {
        totalKeys: 0,
        activeLimits: 0,
      };
    }
  }

  /**
   * Close Redis connection
   */
  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
    }
  }
}
