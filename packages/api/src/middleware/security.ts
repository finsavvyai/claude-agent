/**
 * Security Middleware for Cloudflare Workers (Hono)
 * Implements the 365-security.md checklist:
 *   §3 Security Headers
 *   §4 CSRF Protection
 *   §5 Rate Limiting
 *   §6 Proxy / API Route Security
 */

import { Context, Next, MiddlewareHandler } from 'hono';

// ─── §3 Security Headers ──────────────────────────────────────────────────────

export const securityHeaders = (): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        await next();

        // Core headers from 365-security.md §3
        c.header('X-Content-Type-Options', 'nosniff');
        c.header('X-Frame-Options', 'DENY');
        c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
        c.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        c.header('X-XSS-Protection', '0'); // Disabled in favor of CSP
        c.header(
            'Content-Security-Policy',
            "default-src 'self'; script-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none';"
        );
        c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    };
};

// ─── §4 CSRF Protection ──────────────────────────────────────────────────────

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const csrfProtection = (allowedOrigins: string[]): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        if (!MUTATING_METHODS.has(c.req.method)) {
            return next();
        }

        const origin = c.req.header('Origin');
        const referer = c.req.header('Referer');

        // Allow requests with no origin (e.g. same-origin, server-to-server)
        if (!origin && !referer) {
            return next();
        }

        if (origin && !allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
            return c.json({ error: 'Origin not allowed' }, 403);
        }

        return next();
    };
};

// ─── §5 Rate Limiting ─────────────────────────────────────────────────────────

interface RateLimitBucket {
    count: number;
    windowStart: number;
}

const rateLimitStore = new Map<string, RateLimitBucket>();

// Periodic cleanup of stale buckets (365-security.md §5)
const CLEANUP_INTERVAL_MS = 5 * 60_000; // 5 minutes
let lastCleanup = Date.now();

function cleanupStaleBuckets(windowMs: number): void {
    const now = Date.now();
    if (now - lastCleanup < CLEANUP_INTERVAL_MS) return;
    lastCleanup = now;

    for (const [key, bucket] of rateLimitStore) {
        if (now - bucket.windowStart > windowMs * 2) {
            rateLimitStore.delete(key);
        }
    }
}

export const rateLimit = (opts: {
    windowMs: number;
    max: number;
    keyPrefix?: string;
}): MiddlewareHandler => {
    const { windowMs, max, keyPrefix = 'rl' } = opts;

    return async (c: Context, next: Next) => {
        const ip = c.req.header('CF-Connecting-IP') || c.req.header('X-Forwarded-For') || 'unknown';
        const key = `${keyPrefix}:${ip}`;
        const now = Date.now();

        cleanupStaleBuckets(windowMs);

        let bucket = rateLimitStore.get(key);

        if (!bucket || now - bucket.windowStart > windowMs) {
            bucket = { count: 0, windowStart: now };
        }

        bucket.count++;
        rateLimitStore.set(key, bucket);

        // Set rate limit headers
        c.header('X-RateLimit-Limit', String(max));
        c.header('X-RateLimit-Remaining', String(Math.max(0, max - bucket.count)));
        c.header('X-RateLimit-Reset', String(Math.ceil((bucket.windowStart + windowMs) / 1000)));

        if (bucket.count > max) {
            return c.json(
                { error: 'Too many requests. Please try again later.' },
                429
            );
        }

        return next();
    };
};

// Pre-configured rate limiters from 365-security.md §5
export const generalRateLimit = rateLimit({
    windowMs: 60_000,  // 1 minute
    max: 100,          // 100 req/min per IP
    keyPrefix: 'general',
});

export const authRateLimit = rateLimit({
    windowMs: 60_000,  // 1 minute
    max: 10,           // 10 req/min per IP — strict for auth endpoints
    keyPrefix: 'auth',
});

// ─── §6 Proxy / API Route Security ───────────────────────────────────────────

const MAX_BODY_SIZE = 1 * 1024 * 1024; // 1MB (365-security.md §6)

export const bodySizeLimit = (): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        const contentLength = c.req.header('Content-Length');

        if (contentLength && parseInt(contentLength, 10) > MAX_BODY_SIZE) {
            return c.json({ error: 'Request body too large. Max 1MB.' }, 413);
        }

        return next();
    };
};

// Path allowlisting: only permit known API paths (365-security.md §6)
export const pathAllowlist = (allowedPrefixes: string[]): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        const path = new URL(c.req.url).pathname;

        const isAllowed = allowedPrefixes.some((prefix) => path.startsWith(prefix));
        if (!isAllowed) {
            return c.json({ error: 'Not found' }, 404);
        }

        return next();
    };
};

// Sanitize error responses — never expose internal error details (365-security.md §6)
export const sanitizeErrors = (): MiddlewareHandler => {
    return async (c: Context, next: Next) => {
        try {
            await next();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            console.error('[SecurityMiddleware] Unhandled error:', message);

            // Never expose stack traces or internal details to clients
            return c.json(
                { error: 'An internal error occurred. Please try again later.' },
                500
            );
        }
    };
};

// ─── Convenience: Apply all security middleware at once ────────────────────────

export function applySecurityMiddleware(
    app: { use: (path: string, ...handlers: MiddlewareHandler[]) => void },
    opts?: { allowedOrigins?: string[] }
): void {
    const origins = opts?.allowedOrigins || ['https://agent.finsavvyai.com'];

    app.use('*', sanitizeErrors());
    app.use('*', securityHeaders());
    app.use('*', bodySizeLimit());
    app.use('*', csrfProtection(origins));
    app.use('*', generalRateLimit);
}
