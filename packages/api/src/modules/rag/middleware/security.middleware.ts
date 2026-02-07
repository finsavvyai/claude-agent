import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class SecurityMiddleware implements NestMiddleware {
  private readonly logger = new Logger(SecurityMiddleware.name);

  use(req: Request, res: Response, next: NextFunction): void {
    try {
      // Set security headers
      this.setSecurityHeaders(res);

      // Validate request for security issues
      this.validateRequest(req);

      // Log security-relevant information
      this.logSecurityInfo(req);

      next();
    } catch (error) {
      this.logger.error('Security middleware error:', error);
      res.status(400).json({
        message: 'Bad request',
        error: 'Invalid request format',
      });
    }
  }

  /**
   * Set comprehensive security headers
   */
  private setSecurityHeaders(res: Response): void {
    // Content Security Policy
    res.setHeader(
      'Content-Security-Policy',
      [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "font-src 'self' data:",
        "connect-src 'self' https://api.github.com",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; ')
    );

    // Strict Transport Security (HTTPS only)
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );

    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');

    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');

    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    // Permissions Policy
    res.setHeader(
      'Permissions-Policy',
      [
        'camera=()',
        'microphone=()',
        'geolocation=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', ')
    );

    // Remove server information
    res.removeHeader('X-Powered-By');

    // Custom server header
    res.setHeader('Server', 'RAG-System');

    // Cache control for API responses
    res.setHeader(
      'Cache-Control',
      'no-store, no-cache, must-revalidate, proxy-revalidate'
    );
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }

  /**
   * Validate request for potential security issues
   */
  private validateRequest(req: Request): void {
    const url = req.url;
    const method = req.method;
    const headers = req.headers;
    const body = req.body;

    // Check for suspicious URL patterns
    const suspiciousPatterns = [
      /\.\./,  // Path traversal
      /<script/i,  // XSS attempt
      /javascript:/i,  // XSS attempt
      /data:/i,  // Data URI injection
      /vbscript:/i,  // VBScript injection
      /onload=/i,  // Event handler injection
      /onerror=/i,  // Event handler injection
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        throw new Error(`Suspicious URL pattern detected: ${url}`);
      }
    }

    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      const contentType = headers['content-type'];

      if (contentType && typeof contentType === 'string') {
        // Only allow specific content types
        const allowedContentTypes = [
          'application/json',
          'application/x-www-form-urlencoded',
          'multipart/form-data',
          'text/plain',
        ];

        const isAllowed = allowedContentTypes.some(allowed =>
          contentType.toLowerCase().includes(allowed)
        );

        if (!isAllowed) {
          throw new Error(`Invalid content type: ${contentType}`);
        }
      }
    }

    // Check request body for XSS patterns
    if (body && typeof body === 'object') {
      this.validateObjectForXSS(body);
    }

    // Validate header size
    const headerSize = JSON.stringify(headers).length;
    if (headerSize > 8192) { // 8KB limit
      throw new Error('Headers too large');
    }

    // Check for too many cookies
    const cookies = headers.cookie;
    if (cookies && typeof cookies === 'string') {
      const cookieCount = cookies.split(';').length;
      if (cookieCount > 50) {
        throw new Error('Too many cookies');
      }
    }
  }

  /**
   * Recursively validate object for XSS patterns
   */
  private validateObjectForXSS(obj: any, depth = 0): void {
    if (depth > 10) { // Prevent deep recursion attacks
      throw new Error('Object nesting too deep');
    }

    if (typeof obj === 'string') {
      const xssPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
        /<iframe/i,
        /<object/i,
        /<embed/i,
        /<link/i,
        /<meta/i,
        /@import/i,
      ];

      for (const pattern of xssPatterns) {
        if (pattern.test(obj)) {
          throw new Error(`XSS pattern detected in string: ${obj.substring(0, 50)}...`);
        }
      }
    } else if (Array.isArray(obj)) {
      for (const item of obj) {
        this.validateObjectForXSS(item, depth + 1);
      }
    } else if (obj && typeof obj === 'object') {
      for (const [key, value] of Object.entries(obj)) {
        // Validate key name
        if (/__proto__|constructor|prototype/i.test(key)) {
          throw new Error(`Suspicious property name: ${key}`);
        }

        this.validateObjectForXSS(value, depth + 1);
      }
    }
  }

  /**
   * Log security-relevant information
   */
  private logSecurityInfo(req: Request): void {
    const logData = {
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: this.getClientIP(req),
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    };

    // Log suspicious activities
    if (this.isSuspiciousRequest(req)) {
      this.logger.warn('Suspicious request detected', logData);
    }

    // Log API calls (with rate limiting to avoid log spam)
    if (Math.random() < 0.01) { // Log 1% of requests
      this.logger.debug('API request', logData);
    }
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }

  /**
   * Check if request appears suspicious
   */
  private isSuspiciousRequest(req: Request): boolean {
    const suspiciousIndicators = [
      // Missing user agent
      !req.headers['user-agent'],

      // Known bot patterns
      /bot|crawler|spider|scraper/i.test(req.headers['user-agent'] || ''),

      // Suspicious URL patterns
      /\.\./.test(req.url),
      /<script/i.test(req.url),

      // Unusual methods
      !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'].includes(req.method),

      // Very large requests
      parseInt(req.headers['content-length'] || '0') > 10 * 1024 * 1024, // 10MB
    ];

    return suspiciousIndicators.some(Boolean);
  }
}
