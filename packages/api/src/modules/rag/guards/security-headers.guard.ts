import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Request, Response } from 'express';

@Injectable()
export class SecurityHeadersGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const response = context.switchToHttp().getResponse<Response>();

    // Set comprehensive security headers
    response.set({
      // Content Security Policy
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ].join('; '),

      // Strict Transport Security (HTTPS only)
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',

      // X-Frame-Options
      'X-Frame-Options': 'DENY',

      // X-Content-Type-Options
      'X-Content-Type-Options': 'nosniff',

      // X-XSS-Protection
      'X-XSS-Protection': '1; mode=block',

      // Referrer Policy
      'Referrer-Policy': 'strict-origin-when-cross-origin',

      // Permissions Policy (Feature Policy)
      'Permissions-Policy': [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=()',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', '),

      // Cache control for sensitive responses
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',

      // Server information hiding
      'Server': '',

      // Remove powered by header
      'X-Powered-By': '',
    });

    return true;
  }
}
