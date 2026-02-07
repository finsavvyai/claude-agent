import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService, HealthCheckResult } from './health.service';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Check API health status' })
  @ApiResponse({
    status: 200,
    description: 'API health check results',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['healthy', 'unhealthy'] },
        timestamp: { type: 'string', format: 'date-time' },
        services: {
          type: 'object',
          properties: {
            database: { type: 'object' },
            redis: { type: 'object' },
            api: { type: 'object' },
            memory: { type: 'object' },
            disk: { type: 'object' },
          },
        },
        uptime: { type: 'number' },
        version: { type: 'string' },
      },
    },
  })
  async check(): Promise<HealthCheckResult> {
    return this.healthService.checkHealth();
  }

  @Get('ready')
  @ApiOperation({ summary: 'Check if API is ready to accept traffic' })
  @ApiResponse({
    status: 200,
    description: 'API is ready',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['ready'] },
        timestamp: { type: 'string', format: 'date-time' },
      },
    },
  })
  @ApiResponse({ status: 503, description: 'API not ready' })
  async ready(): Promise<{ status: string; timestamp: Date }> {
    const health = await this.healthService.checkHealth();

    if (health.status === 'healthy') {
      return {
        status: 'ready',
        timestamp: new Date(),
      };
    }

    throw new Error('Service not ready');
  }

  @Get('live')
  @ApiOperation({ summary: 'Check if API is alive (liveness probe)' })
  @ApiResponse({
    status: 200,
    description: 'API is alive',
    schema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['alive'] },
        timestamp: { type: 'string', format: 'date-time' },
        uptime: { type: 'number' },
      },
    },
  })
  async live(): Promise<{ status: string; timestamp: Date; uptime: number }> {
    return {
      status: 'alive',
      timestamp: new Date(),
      uptime: Date.now() - (this.healthService as any).startTime,
    };
  }
}
