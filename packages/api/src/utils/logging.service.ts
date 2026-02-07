import { Injectable, LoggerService } from '@nestjs/common';
import * as winston from 'winston';

@Injectable()
export class LoggingService implements LoggerService {
  private readonly logger: winston.Logger;

  constructor(context?: string) {
    this.logger = winston.createLogger({
      level: process.env.LOG_LEVEL || 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json(),
        winston.format.printf(({ timestamp, level, message, context, stack, ...meta }) => {
          return JSON.stringify({
            timestamp,
            level,
            context: context || 'Application',
            message,
            stack,
            ...meta,
          });
        }),
      ),
      defaultMeta: { service: 'claude-agent-api' },
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple(),
            winston.format.printf(({ timestamp, level, message, context }) => {
              return `${timestamp} [${context || 'App'}] ${level}: ${message}`;
            }),
          ),
        }),
      ],
    });

    // Add Elasticsearch transport in production
    if (process.env.NODE_ENV === 'production' && process.env.ELASTICSEARCH_URL) {
      try {
        const { ElasticsearchTransport } = require('winston-elasticsearch');

        this.logger.add(
          new ElasticsearchTransport({
            level: 'info',
            clientOpts: {
              node: process.env.ELASTICSEARCH_URL,
            },
            index: process.env.ELASTICSEARCH_INDEX || 'claude-agent-logs',
          }),
        );
      } catch (error) {
        this.logger.warn('Failed to initialize Elasticsearch transport:', error);
      }
    }
  }

  log(message: any, context?: string) {
    this.logger.info(message, { context });
  }

  error(message: any, stack?: string, context?: string) {
    this.logger.error(message, { context, stack });
  }

  warn(message: any, context?: string) {
    this.logger.warning(message, { context });
  }

  debug(message: any, context?: string) {
    this.logger.debug(message, { context });
  }

  verbose(message: any, context?: string) {
    this.logger.verbose(message, { context });
  }
}
