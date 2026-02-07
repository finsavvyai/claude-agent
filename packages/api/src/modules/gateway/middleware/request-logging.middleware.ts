import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface RequestWithId extends Request {
  id?: string;
  startTime?: number;
}

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger(RequestLoggingMiddleware.name);

  use(req: RequestWithId, res: Response, next: NextFunction): void {
    // Generate unique request ID
    req.id = req.id || uuidv4();
    req.startTime = Date.now();

    // Add request ID to response headers
    res.setHeader('X-Request-ID', req.id);
    res.setHeader('X-Start-Time', req.startTime.toString());

    // Log incoming request
    this.logIncomingRequest(req);

    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(chunk?: any, encoding?: any) {
      logResponse(req, res);
      originalEnd.call(this, chunk, encoding);
    };

    next();
  }

  private logIncomingRequest(req: RequestWithId): void {
    const logData = {
      requestId: req.id,
      method: req.method,
      url: req.url,
      path: req.path,
      query: req.query,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
      timestamp: new Date().toISOString(),
      userId: (req as any).user?.userId,
      sessionId: (req as any).user?.sessionId,
    };

    // Remove sensitive data from query params
    if (logData.query) {
      const sensitiveFields = ['password', 'token', 'secret', 'key'];
      const sanitizedQuery = { ...logData.query };

      for (const field of sensitiveFields) {
        if (sanitizedQuery[field]) {
          sanitizedQuery[field] = '[REDACTED]';
        }
      }

      logData.query = sanitizedQuery;
    }

    this.logger.log(`📥 INCOMING ${req.method} ${req.path}`, logData);
  }

  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}

function logResponse(req: RequestWithId, res: Response): void {
  const duration = req.startTime ? Date.now() - req.startTime : 0;
  const logger = new Logger(RequestLoggingMiddleware.name);

  const logData = {
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration: `${duration}ms`,
    contentLength: res.get('Content-Length') || '0',
    contentType: res.get('Content-Type') || 'unknown',
    timestamp: new Date().toISOString(),
    userId: (req as any).user?.userId,
    success: res.statusCode >= 200 && res.statusCode < 400,
  };

  // Determine log level based on status code
  if (res.statusCode >= 500) {
    logger.error(`📤 OUTGOING ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, logData);
  } else if (res.statusCode >= 400) {
    logger.warn(`📤 OUTGOING ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, logData);
  } else if (duration > 5000) { // Slow requests
    logger.warn(`📤 OUTGOING ${req.method} ${req.path} ${res.statusCode} (${duration}ms) - SLOW`, logData);
  } else {
    logger.log(`📤 OUTGOING ${req.method} ${req.path} ${res.statusCode} (${duration}ms)`, logData);
  }
}
