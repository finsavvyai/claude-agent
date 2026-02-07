import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient } from 'redis';
import { PrismaClient } from '@prisma/client';

export interface HealthCheckResult {
  status: 'healthy' | 'unhealthy';
  timestamp: Date;
  services: {
    database: ServiceHealth;
    redis: ServiceHealth;
    api: ServiceHealth;
    memory: ServiceHealth;
    disk: ServiceHealth;
  };
  uptime: number;
  version: string;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy';
  responseTime?: number;
  error?: string;
  details?: any;
}

@Injectable()
export class HealthService {
  private readonly prisma: PrismaClient;
  private readonly redisClient: ReturnType<typeof createClient>;
  private readonly startTime = Date.now();

  constructor(private readonly configService: ConfigService) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });

    this.redisClient = createClient({
      socket: {
        host: this.configService.get('redis.host'),
        port: this.configService.get('redis.port'),
      },
      password: this.configService.get('redis.password'),
      database: this.configService.get('redis.db'),
    });
  }

  async checkHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    const services = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      api: this.checkAPI(),
      memory: this.checkMemory(),
      disk: this.checkDisk(),
    };

    const overallStatus = Object.values(services).every(
      (service) => service.status === 'healthy'
    )
      ? 'healthy'
      : 'unhealthy';

    return {
      status: overallStatus,
      timestamp: new Date(),
      services,
      uptime: Date.now() - this.startTime,
      version: process.env.npm_package_version || '1.0.0',
    };
  }

  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          connection: 'postgresql',
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private async checkRedis(): Promise<ServiceHealth> {
    const startTime = Date.now();
    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }

      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'healthy',
        responseTime,
        details: {
          connected: this.redisClient.isOpen,
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        responseTime: Date.now() - startTime,
        error: error.message,
      };
    }
  }

  private checkAPI(): ServiceHealth {
    return {
      status: 'healthy',
      details: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
      },
    };
  }

  private checkMemory(): ServiceHealth {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const usedMemory = usage.heapUsed;
    const memoryUsagePercent = (usedMemory / totalMemory) * 100;

    return {
      status: memoryUsagePercent < 90 ? 'healthy' : 'unhealthy',
      details: {
        rss: Math.round(usage.rss / 1024 / 1024), // MB
        heapTotal: Math.round(totalMemory / 1024 / 1024), // MB
        heapUsed: Math.round(usedMemory / 1024 / 1024), // MB
        external: Math.round(usage.external / 1024 / 1024), // MB
        usagePercent: Math.round(memoryUsagePercent),
      },
    };
  }

  private checkDisk(): ServiceHealth {
    // In a real implementation, you'd check actual disk usage
    // For now, return a healthy status
    return {
      status: 'healthy',
      details: {
        note: 'Disk health check not implemented',
      },
    };
  }

  async onModuleDestroy() {
    if (this.redisClient.isOpen) {
      await this.redisClient.quit();
    }
    await this.prisma.$disconnect();
  }
}
