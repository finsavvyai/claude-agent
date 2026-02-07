import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { RoutingService } from '../services/routing.service';
import { TransformationService } from '../services/transformation.service';

@Injectable()
export class TransformationMiddleware implements NestMiddleware {
  private readonly logger = new Logger(TransformationMiddleware.name);

  constructor(
    private readonly routingService: RoutingService,
    private readonly transformationService: TransformationService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Get route configuration to determine transformation requirements
      const route = await this.routingService.resolveRoute(req);

      if (!route?.transformation) {
        // No transformation required for this route
        return next();
      }

      // Apply request transformations
      if (route.transformation.request) {
        req = await this.transformationService.transformRequest(req, route);
        this.logger.debug(`Applied request transformations for route: ${route.path}`);
      }

      // Intercept response to apply response transformations
      if (route.transformation.response) {
        this.interceptResponse(res, route);
      }

      next();

    } catch (error) {
      this.logger.error(`Transformation middleware error: ${error.message}`, error.stack);
      next(error);
    }
  }

  private interceptResponse(res: Response, route: any): void {
    const originalJson = res.json;
    const originalSend = res.send;

    // Intercept res.json
    res.json = function(data: any) {
      try {
        const transformedData = applyResponseTransformations(data, route);
        return originalJson.call(this, transformedData);
      } catch (error) {
        Logger.error('Error transforming response JSON:', error);
        return originalJson.call(this, data);
      }
    };

    // Intercept res.send
    res.send = function(data: any) {
      try {
        if (typeof data === 'object' && data !== null) {
          const transformedData = applyResponseTransformations(data, route);
          return originalSend.call(this, transformedData);
        }
        return originalSend.call(this, data);
      } catch (error) {
        Logger.error('Error transforming response data:', error);
        return originalSend.call(this, data);
      }
    };
  }
}

function applyResponseTransformations(data: any, route: any): any {
  const transformation = route.transformation.response;
  let transformedData = data;

  // Apply body transformation
  if (transformation.body && typeof transformation.body === 'function') {
    transformedData = transformation.body(data, {}, { status: 200 });
  }

  // Apply common transformations based on route metadata
  if (route.metadata?.addTimestamp) {
    transformedData = {
      ...transformedData,
      processed_at: new Date().toISOString(),
    };
  }

  if (route.metadata?.wrapResponse) {
    transformedData = {
      data: transformedData,
      meta: {
        timestamp: new Date().toISOString(),
        version: 'v1',
      },
    };
  }

  return transformedData;
}
