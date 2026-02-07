import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';

import { DatabaseModule } from '@claude-agent/database';

import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { AgentsModule } from './modules/agents/agents.module';
import { TasksModule } from './modules/tasks/tasks.module';
import { TaskSocketModule } from './modules/tasks/task.socket.module';
import { RAGModule } from './modules/rag/rag.module';
import { TokensModule } from './modules/tokens/tokens.module';
import { HealthModule } from './modules/health/health.module';
import { GatewayModule } from './modules/gateway/gateway.module';

import configuration from './config/configuration';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Database
    DatabaseModule,

    // Gateway and Feature modules
    GatewayModule,
    AuthModule,
    UsersModule,
    ProjectsModule,
    AgentsModule,
    TasksModule,
    TaskSocketModule,
    RAGModule,
    TokensModule,
    HealthModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
