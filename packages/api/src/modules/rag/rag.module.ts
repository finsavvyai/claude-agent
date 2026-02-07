import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { RAGController } from './rag.controller';
import { RAGService } from './services/rag.service';
import { GitHubController } from './github.controller';
import { GitHubIntegrationService } from './services/github-integration.service';
import { HttpModule } from '@nestjs/axios';
import { EncryptionUtil } from './utils/encryption.util';
import { RateLimitUtil } from './utils/rate-limit.util';
import { SecurityMiddleware } from './middleware/security.middleware';
import { SecurityErrorFilter } from './filters/security-error.filter';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';

@Module({
  imports: [HttpModule],
  controllers: [RAGController, GitHubController],
  providers: [
    RAGService,
    GitHubIntegrationService,
    EncryptionUtil,
    RateLimitUtil,
    {
      provide: APP_FILTER,
      useClass: SecurityErrorFilter,
    },
    {
      provide: APP_GUARD,
      useClass: RateLimitGuard,
    },
  ],
  exports: [RAGService, GitHubIntegrationService, EncryptionUtil, RateLimitUtil],
})
export class RAGModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(SecurityMiddleware)
      .forRoutes('*');
  }
}
