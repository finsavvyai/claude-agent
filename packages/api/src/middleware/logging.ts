/**
 * Structured Logging Service for Cloudflare Workers
 * Implements Phase 1.1: Enhanced Error Tracking & Observability
 *
 * Features:
 *  - JSON structured logs with requestId, userId, duration
 *  - Log levels: debug, info, warn, error, fatal
 *  - Request/response lifecycle logging
 *  - Security event logging (auth failures, rate limit hits)
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
    level: LogLevel;
    message: string;
    timestamp: string;
    requestId: string;
    service: string;
    environment?: string;
    userId?: string;
    duration?: number;
    statusCode?: number;
    method?: string;
    path?: string;
    ip?: string;
    userAgent?: string;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
    metadata?: Record<string, unknown>;
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
    fatal: 4,
};

export class StructuredLogger {
    private service: string;
    private environment: string;
    private minLevel: LogLevel;

    constructor(opts: { service: string; environment?: string; minLevel?: LogLevel }) {
        this.service = opts.service;
        this.environment = opts.environment || 'development';
        this.minLevel = opts.minLevel || (this.environment === 'production' ? 'info' : 'debug');
    }

    private shouldLog(level: LogLevel): boolean {
        return LOG_LEVELS[level] >= LOG_LEVELS[this.minLevel];
    }

    private emit(entry: LogEntry): void {
        if (!this.shouldLog(entry.level)) return;

        const output = JSON.stringify(entry);

        switch (entry.level) {
            case 'error':
            case 'fatal':
                console.error(output);
                break;
            case 'warn':
                console.warn(output);
                break;
            default:
                console.log(output);
        }
    }

    /** Create a child logger scoped to a specific request */
    forRequest(requestId: string, opts?: { userId?: string; method?: string; path?: string; ip?: string }): RequestLogger {
        return new RequestLogger(this, requestId, opts);
    }

    log(level: LogLevel, message: string, extra?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>>): void {
        this.emit({
            level,
            message,
            timestamp: new Date().toISOString(),
            service: this.service,
            environment: this.environment,
            requestId: extra?.requestId || 'system',
            ...extra,
        });
    }

    info(message: string, extra?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>>): void {
        this.log('info', message, extra);
    }

    warn(message: string, extra?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>>): void {
        this.log('warn', message, extra);
    }

    error(message: string, err?: Error, extra?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>>): void {
        this.log('error', message, {
            ...extra,
            error: err
                ? { name: err.name, message: err.message, stack: err.stack }
                : undefined,
        });
    }

    /** Log a security-relevant event (auth failure, rate limit, fingerprint mismatch) */
    security(event: string, extra?: Partial<Omit<LogEntry, 'level' | 'message' | 'timestamp' | 'service'>>): void {
        this.log('warn', `[SECURITY] ${event}`, {
            ...extra,
            metadata: { ...(extra?.metadata || {}), securityEvent: true },
        });
    }
}

/** Request-scoped logger — carries requestId + user context throughout the request lifecycle */
export class RequestLogger {
    private logger: StructuredLogger;
    private requestId: string;
    private userId?: string;
    private method?: string;
    private path?: string;
    private ip?: string;
    private startTime: number;

    constructor(
        logger: StructuredLogger,
        requestId: string,
        opts?: { userId?: string; method?: string; path?: string; ip?: string }
    ) {
        this.logger = logger;
        this.requestId = requestId;
        this.userId = opts?.userId;
        this.method = opts?.method;
        this.path = opts?.path;
        this.ip = opts?.ip;
        this.startTime = Date.now();
    }

    private defaults(): Partial<LogEntry> {
        return {
            requestId: this.requestId,
            userId: this.userId,
            method: this.method,
            path: this.path,
            ip: this.ip,
        };
    }

    info(message: string, metadata?: Record<string, unknown>): void {
        this.logger.info(message, { ...this.defaults(), metadata });
    }

    warn(message: string, metadata?: Record<string, unknown>): void {
        this.logger.warn(message, { ...this.defaults(), metadata });
    }

    error(message: string, err?: Error, metadata?: Record<string, unknown>): void {
        this.logger.error(message, err, { ...this.defaults(), metadata });
    }

    /** Log the completion of a request with status + duration */
    complete(statusCode: number, metadata?: Record<string, unknown>): void {
        const duration = Date.now() - this.startTime;
        this.logger.info(`${this.method} ${this.path} → ${statusCode} (${duration}ms)`, {
            ...this.defaults(),
            statusCode,
            duration,
            metadata,
        });
    }

    /** Log a security event tied to this request */
    security(event: string, metadata?: Record<string, unknown>): void {
        this.logger.security(event, { ...this.defaults(), metadata });
    }
}

// ─── Singleton for the API service ────────────────────────────────────────────

export const apiLogger = new StructuredLogger({
    service: 'claude-agent-api',
    environment: typeof globalThis !== 'undefined' ? (globalThis as any).ENVIRONMENT : 'development',
});
