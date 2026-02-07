/**
 * Error Tracking Service
 * 
 * Provides comprehensive error tracking with Sentry integration,
 * structured logging, and error reporting for production environments.
 */

import * as Sentry from '@sentry/node';

// ============================================================================
// TYPES
// ============================================================================

export interface ErrorContext {
    userId?: string;
    requestId?: string;
    path?: string;
    method?: string;
    userAgent?: string;
    ip?: string;
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
}

export interface LogEntry {
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
    message: string;
    timestamp: string;
    requestId?: string;
    userId?: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, unknown>;
}

// ============================================================================
// ERROR TYPES
// ============================================================================

export class AppError extends Error {
    public readonly statusCode: number;
    public readonly errorCode: string;
    public readonly isOperational: boolean;
    public readonly context?: ErrorContext;

    constructor(
        message: string,
        statusCode: number = 500,
        errorCode: string = 'INTERNAL_ERROR',
        isOperational: boolean = true,
        context?: ErrorContext
    ) {
        super(message);
        this.name = 'AppError';
        this.statusCode = statusCode;
        this.errorCode = errorCode;
        this.isOperational = isOperational;
        this.context = context;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class ValidationError extends AppError {
    public readonly fields: Record<string, string>;

    constructor(message: string, fields: Record<string, string> = {}) {
        super(message, 400, 'VALIDATION_ERROR', true);
        this.name = 'ValidationError';
        this.fields = fields;
    }
}

export class AuthenticationError extends AppError {
    constructor(message: string = 'Authentication required') {
        super(message, 401, 'AUTHENTICATION_ERROR', true);
        this.name = 'AuthenticationError';
    }
}

export class AuthorizationError extends AppError {
    constructor(message: string = 'Permission denied') {
        super(message, 403, 'AUTHORIZATION_ERROR', true);
        this.name = 'AuthorizationError';
    }
}

export class NotFoundError extends AppError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404, 'NOT_FOUND', true);
        this.name = 'NotFoundError';
    }
}

export class ConflictError extends AppError {
    constructor(message: string) {
        super(message, 409, 'CONFLICT', true);
        this.name = 'ConflictError';
    }
}

export class RateLimitError extends AppError {
    constructor(retryAfter: number = 60) {
        super(`Rate limit exceeded. Try again in ${retryAfter} seconds`, 429, 'RATE_LIMITED', true);
        this.name = 'RateLimitError';
    }
}

// ============================================================================
// ERROR TRACKING SERVICE
// ============================================================================

class ErrorTrackingService {
    private initialized = false;
    private environment: string;
    private serviceName: string;

    constructor() {
        this.environment = process.env.NODE_ENV || 'development';
        this.serviceName = process.env.SERVICE_NAME || 'claude-agent-api';
    }

    /**
     * Initialize Sentry and error tracking
     */
    init(dsn?: string): void {
        if (this.initialized) {
            return;
        }

        const sentryDsn = dsn || process.env.SENTRY_DSN;

        if (sentryDsn && this.environment === 'production') {
            Sentry.init({
                dsn: sentryDsn,
                environment: this.environment,
                release: process.env.RELEASE_VERSION || '1.0.0',

                // Performance monitoring
                tracesSampleRate: 0.1,
                profilesSampleRate: 0.1,

                // Error filtering
                beforeSend: (event, hint) => {
                    // Don't send expected operational errors
                    const error = hint.originalException as AppError;
                    if (error?.isOperational) {
                        return null;
                    }
                    return event;
                },

                // Integrations
                integrations: [
                    // Add custom integrations as needed
                ],

                // Context
                initialScope: {
                    tags: {
                        service: this.serviceName,
                    },
                },
            });
        }

        this.initialized = true;
        this.log('info', 'Error tracking service initialized');
    }

    /**
     * Capture and report an exception
     */
    captureException(error: Error, context?: ErrorContext): string | undefined {
        this.log('error', error.message, {
            error: {
                name: error.name,
                message: error.message,
                stack: error.stack,
            },
            metadata: context,
        });

        if (this.environment === 'production' && this.initialized) {
            Sentry.withScope((scope) => {
                if (context) {
                    if (context.userId) scope.setUser({ id: context.userId });
                    if (context.requestId) scope.setTag('requestId', context.requestId);
                    if (context.path) scope.setTag('path', context.path);
                    if (context.method) scope.setTag('method', context.method);
                    if (context.tags) {
                        Object.entries(context.tags).forEach(([key, value]) => {
                            scope.setTag(key, value);
                        });
                    }
                    if (context.extra) {
                        Object.entries(context.extra).forEach(([key, value]) => {
                            scope.setExtra(key, value);
                        });
                    }
                }
                Sentry.captureException(error);
            });
        }

        return undefined;
    }

    /**
     * Capture a message
     */
    captureMessage(message: string, level: Sentry.SeverityLevel = 'info', context?: ErrorContext): void {
        this.log(level, message, { metadata: context });

        if (this.environment === 'production' && this.initialized) {
            Sentry.withScope((scope) => {
                if (context) {
                    if (context.userId) scope.setUser({ id: context.userId });
                    if (context.tags) {
                        Object.entries(context.tags).forEach(([key, value]) => {
                            scope.setTag(key, value);
                        });
                    }
                }
                Sentry.captureMessage(message, level);
            });
        }
    }

    /**
     * Set user context for error tracking
     */
    setUser(user: { id: string; email?: string; tier?: string }): void {
        if (this.environment === 'production' && this.initialized) {
            Sentry.setUser({
                id: user.id,
                email: user.email,
                subscription: user.tier,
            });
        }
    }

    /**
     * Clear user context
     */
    clearUser(): void {
        if (this.environment === 'production' && this.initialized) {
            Sentry.setUser(null);
        }
    }

    /**
     * Add breadcrumb for debugging
     */
    addBreadcrumb(breadcrumb: {
        category: string;
        message: string;
        level?: Sentry.SeverityLevel;
        data?: Record<string, unknown>;
    }): void {
        if (this.environment === 'production' && this.initialized) {
            Sentry.addBreadcrumb({
                category: breadcrumb.category,
                message: breadcrumb.message,
                level: breadcrumb.level || 'info',
                data: breadcrumb.data,
                timestamp: Date.now() / 1000,
            });
        }
    }

    /**
     * Start a performance transaction
     */
    startTransaction(name: string, op: string): unknown {
        if (this.environment === 'production' && this.initialized) {
            return Sentry.startSpan({ name, op }, () => { });
        }
        return null;
    }

    /**
     * Structured logging
     */
    log(
        level: LogEntry['level'],
        message: string,
        data?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp'>>
    ): void {
        const entry: LogEntry = {
            level,
            message,
            timestamp: new Date().toISOString(),
            ...data,
        };

        // In development, use console
        if (this.environment !== 'production') {
            const logMethod = level === 'fatal' ? 'error' : level;
            console[logMethod](`[${entry.timestamp}] [${level.toUpperCase()}] ${message}`, data || '');
            return;
        }

        // In production, output structured JSON
        console.log(JSON.stringify(entry));
    }

    /**
     * Flush pending events before shutdown
     */
    async flush(timeout: number = 2000): Promise<boolean> {
        if (this.environment === 'production' && this.initialized) {
            return Sentry.close(timeout);
        }
        return true;
    }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const errorTracker = new ErrorTrackingService();

// ============================================================================
// MIDDLEWARE HELPER
// ============================================================================

export function createErrorHandler() {
    return async (
        error: Error,
        request: { path: string; method: string; headers: Record<string, string> },
        env: { USER_ID?: string; REQUEST_ID?: string }
    ) => {
        const context: ErrorContext = {
            userId: env.USER_ID,
            requestId: env.REQUEST_ID,
            path: request.path,
            method: request.method,
            userAgent: request.headers['user-agent'],
        };

        // Handle known application errors
        if (error instanceof AppError) {
            errorTracker.log(error.isOperational ? 'warn' : 'error', error.message, {
                requestId: context.requestId,
                userId: context.userId,
                error: {
                    name: error.name,
                    message: error.message,
                    stack: error.stack,
                },
                metadata: {
                    statusCode: error.statusCode,
                    errorCode: error.errorCode,
                },
            });

            return {
                success: false,
                error: error.message,
                error_code: error.errorCode,
                ...(error instanceof ValidationError && { fields: error.fields }),
            };
        }

        // Handle unknown errors
        errorTracker.captureException(error, context);

        return {
            success: false,
            error: 'An unexpected error occurred',
            error_code: 'INTERNAL_ERROR',
        };
    };
}

// ============================================================================
// EXPORTS
// ============================================================================

export default errorTracker;
