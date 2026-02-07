import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    const startTime = Date.now();

    const message = `${method} ${url} - ${ip} - ${userAgent}`;
    this.logger.log(`➡️  ${message}`);

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          const { statusCode } = context.switchToHttp().getResponse();

          this.logger.log(
            `⬅️  ${method} ${url} - ${statusCode} - ${duration}ms`,
          );

          if (process.env.NODE_ENV === 'development' && data) {
            this.logger.debug(`Response data: ${JSON.stringify(data, null, 2)}`);
          }
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          this.logger.error(
            `❌ ${method} ${url} - ${duration}ms - ${error.message}`,
            error.stack,
          );
        },
      }),
    );
  }
}
