import { Module } from '@nestjs/common';
import { AIController } from './ai.controller';
import { AIPortalService } from './services/ai-portal.service';
import { OpenAIClient } from './providers/openai.client';

@Module({
  controllers: [AIController],
  providers: [AIPortalService, OpenAIClient],
  exports: [AIPortalService],
})
export class TokensModule {}
