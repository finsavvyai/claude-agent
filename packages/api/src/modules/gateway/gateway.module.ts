import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';

import { GatewayService } from './gateway.service';
import { GatewayController } from './gateway.controller';
import { RoutingService } from './services/routing.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { TransformationService } from './services/transformation.service';
import { VersioningService } from './services/versioning.service';
import { AuthenticationMiddleware } from './middleware/authentication.middleware';
import { RateLimitMiddleware } from './middleware/rate-limit.middleware';
import { RequestLoggingMiddleware } from './middleware/request-logging.middleware';
import { TransformationMiddleware } from './middleware/transformation.middleware';

@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000,
      maxRedirects: 5,
    }),
  ],
  controllers: [GatewayController],
  providers: [
    GatewayService,
    RoutingService,
    CircuitBreakerService,
    TransformationService,
    VersioningService,
  ],
  exports: [
    GatewayService,
    RoutingService,
    CircuitBreakerService,
    TransformationService,
    VersioningService,
  ],
})
export class GatewayModule {}
