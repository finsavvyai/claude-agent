import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Patch,
  Options,
  Head,
  All,
  Request,
  Response,
  Next,
  Headers,
  Query,
  Param,
  Body,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeController } from '@nestjs/swagger';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';

import { GatewayService } from './gateway.service';
import { AuthenticationMiddleware } from './middleware/authentication.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { TransformationMiddleware } from './middleware/transformation.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';

@ApiTags('gateway')
@ApiExcludeController() // Exclude from Swagger as this is a proxy controller
@Controller()
export class GatewayController {
  constructor(private readonly gatewayService: GatewayService) {}

  @All('*')
  @UseGuards(
    RequestLoggingMiddleware,
    AuthenticationMiddleware,
    RateLimitMiddleware,
    TransformationMiddleware,
  )
  async proxyRequest(
    @Request() req: ExpressRequest,
    @Response() res: ExpressResponse,
    @Next() next: NextFunction,
  ) {
    return this.gatewayService.handleRequest(req, res, next);
  }

  @Get('health')
  @ApiOperation({ summary: 'Gateway health check' })
  async getHealth() {
    return this.gatewayService.getHealth();
  }

  @Get('routes')
  @ApiOperation({ summary: 'Get available routes' })
  async getRoutes() {
    return this.gatewayService.getRoutes();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get gateway metrics' })
  async getMetrics() {
    return this.gatewayService.getMetrics();
  }
}
