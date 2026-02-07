import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponse {
  message: string;
  error?: string;
  statusCode: number;
  timestamp: string;
  path: string;
  requestId?: string;
  details?: any;
}

@Catch()
export class SecurityErrorFilter implements ExceptionFilter {
  private readonly logger = new Logger(SecurityErrorFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';
    let details: any = undefined;

    // Handle different types of exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || responseObj.error || message;
        error = responseObj.error || error;

        // Include details only for specific status codes
        if (status < 500 && responseObj.details) {
          details = responseObj.details;
        }
      }
    } else if (exception instanceof Error) {
      // Log the full error for debugging
      this.logger.error('Unhandled exception:', {
        error: exception.message,
        stack: exception.stack,
        url: request.url,
        method: request.method,
        ip: request.ip,
        userAgent: request.headers['user-agent'],
      });

      // Don't expose internal error details to client
      if (process.env.NODE_ENV === 'development') {
        message = exception.message;
        details = {
          stack: exception.stack,
        };
      }
    } else {
      this.logger.error('Unknown exception type:', {
        exception: String(exception),
        url: request.url,
        method: request.method,
      });
    }

    // Create secure error response
    const errorResponse: ErrorResponse = {
      message: this.sanitizeMessage(message),
      error: this.sanitizeError(error),
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      requestId: (request as any).requestId || request.headers['x-request-id'],
    };

    // Add details only for development or specific safe cases
    if (details && (process.env.NODE_ENV === 'development' || status < 400)) {
      errorResponse.details = this.sanitizeDetails(details);
    }

    // Add security headers for error responses
    this.setSecurityHeaders(response);

    response.status(status).json(errorResponse);

    // Log security-relevant errors
    this.logSecurityError(exception, request, status);
  }

  /**
   * Sanitize error message to prevent information disclosure
   */
  private sanitizeMessage(message: string): string {
    if (!message || typeof message !== 'string') {
      return 'An error occurred';
    }

    // Remove sensitive information patterns
    const sanitized = message
      // Remove database error details
      .replace(/SQL\[.*?\]/gi, '[SQL Query]')
      .replace(/Table.*?doesn't exist/gi, 'Database table error')
      .replace(/Column.*?not found/gi, 'Database column error')
      .replace(/Duplicate entry.*?for key/gi, 'Duplicate entry error')

      // Remove file path information
      .replace(/\/[a-zA-Z0-9\/_-]+\.(js|ts|json|sql)/gi, '[file path]')
      .replace(/[a-zA-Z]:\\[a-zA-Z0-9\\_\-\.]+/gi, '[file path]')

      // Remove internal stack traces
      .replace(/at.*?\(.*?\)/gi, '[internal call]')
      .replace(/\\n[\\s\\t]*/gi, ' ')

      // Remove sensitive configuration
      .replace(/[a-zA-Z0-9]{20,}/gi, '[sensitive data]')
      .replace(/password[s]?[=:]\s*[^\s]+/gi, 'password=[hidden]')
      .replace(/token[s]?[=:]\s*[^\s]+/gi, 'token=[hidden]')
      .replace(/key[s]?[=:]\s*[^\s]+/gi, 'key=[hidden]')
      .replace(/secret[s]?[=:]\s*[^\s]+/gi, 'secret=[hidden]')

      // Limit length
      .substring(0, 200);

    return sanitized.trim() || 'An error occurred';
  }

  /**
   * Sanitize error type
   */
  private sanitizeError(error: string): string {
    if (!error || typeof error !== 'string') {
      return 'Error';
    }

    // Map internal errors to generic messages
    const errorMap: Record<string, string> = {
      'QueryFailedError': 'Database Error',
      'ValidationError': 'Validation Error',
      'UnauthorizedError': 'Unauthorized',
      'ForbiddenError': 'Forbidden',
      'NotFoundError': 'Not Found',
      'BadRequestError': 'Bad Request',
      'InternalServerError': 'Internal Server Error',
    };

    return errorMap[error] || error;
  }

  /**
   * Sanitize error details
   */
  private sanitizeDetails(details: any): any {
    if (!details || typeof details !== 'object') {
      return undefined;
    }

    try {
      const detailsStr = JSON.stringify(details);

      // Remove sensitive patterns
      const sanitized = detailsStr
        .replace(/password[":=]\s*"[^"]*"/gi, 'password="[hidden]"')
        .replace(/token[":=]\s*"[^"]*"/gi, 'token="[hidden]"')
        .replace(/secret[":=]\s*"[^"]*"/gi, 'secret="[hidden]"')
        .replace(/key[":=]\s*"[^"]*"/gi, 'key="[hidden]"')
        .replace(/authorization[":=]\s*"[^"]*"/gi, 'authorization="[hidden]"');

      return JSON.parse(sanitized);
    } catch {
      return undefined;
    }
  }

  /**
   * Set security headers for error responses
   */
  private setSecurityHeaders(response: Response): void {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Remove server information
    response.removeHeader('X-Powered-By');

    // Cache control for error responses
    response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    response.setHeader('Pragma', 'no-cache');
  }

  /**
   * Log security-relevant errors
   */
  private logSecurityError(exception: unknown, request: Request, status: number): void {
    const logData = {
      exception: exception instanceof Error ? exception.message : String(exception),
      stack: exception instanceof Error ? exception.stack : undefined,
      url: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      status,
      timestamp: new Date().toISOString(),
    };

    // Log different severity levels based on status
    if (status >= 500) {
      this.logger.error('Server error', logData);
    } else if (status >= 400) {
      if (status === 401 || status === 403) {
        this.logger.warn('Authentication/Authorization error', logData);
      } else {
        this.logger.warn('Client error', logData);
      }
    }

    // Log suspicious patterns
    const suspiciousPatterns = [
      /sql|injection|union|select|drop|delete|insert/i,
      /script|javascript|onload|onerror/i,
      /\.\./i,
      /<[^>]*>/i,
    ];

    const requestStr = `${request.method} ${request.url}`;
    if (suspiciousPatterns.some(pattern => pattern.test(requestStr))) {
      this.logger.warn('Suspicious request pattern', logData);
    }
  }
}
