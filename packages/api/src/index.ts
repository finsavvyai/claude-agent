import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import * as compression from 'compression';

import { AppModule } from './app.module';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { ExceptionFilter } from './filters/http-exception.filter';
import { LoggingService } from './utils/logging.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  const logger = new LoggingService('Bootstrap');

  // Security middleware
  app.use(helmet());
  app.use(compression());

  // CORS configuration
  app.enableCors({
    origin: configService.get('CORS_ORIGINS', '*'),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    credentials: true,
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters and interceptors
  app.useGlobalFilters(new ExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  // API prefix
  app.setGlobalPrefix('api/v1');

  // Swagger documentation
  if (configService.get('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Claude Agent Platform API')
      .setDescription('Comprehensive API for AI agent management and task execution')
      .setVersion('1.0.0')
      .addBearerAuth()
      .addTag('agents', 'Agent lifecycle management')
      .addTag('tasks', 'Task execution and monitoring')
      .addTag('projects', 'Project management')
      .addTag('users', 'User management and authentication')
      .addTag('rag', 'RAG context management')
      .addTag('tokens', 'Token usage and optimization')
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);

    logger.log('Swagger documentation available at /api/docs');
  }

  const port = configService.get('PORT', 3000);
  await app.listen(port);

  logger.log(`🚀 Claude Agent Platform API is running on port ${port}`);
  logger.log(`📖 Environment: ${configService.get('NODE_ENV', 'development')}`);

  if (configService.get('NODE_ENV') !== 'production') {
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  }
}

bootstrap().catch((error) => {
  console.error('Failed to start application:', error);
  process.exit(1);
});
