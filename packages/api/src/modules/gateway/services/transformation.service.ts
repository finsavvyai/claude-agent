import { Injectable, Logger } from '@nestjs/common';
import { Request as ExpressRequest, Response as ExpressResponse } from 'express';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

import { RouteConfig } from '../interfaces/route-config.interface';

@Injectable()
export class TransformationService {
  private readonly logger = new Logger(TransformationService.name);

  async transformRequest(
    req: ExpressRequest,
    route: RouteConfig,
  ): Promise<ExpressRequest> {
    if (!route.transformation?.request) {
      return req;
    }

    const transformation = route.transformation.request;
    let transformedReq = { ...req };

    try {
      // Transform body
      if (transformation.body && req.body) {
        transformedReq.body = transformation.body(req.body, req);
        this.logger.debug(`Applied body transformation for route ${route.path}`);
      }

      // Transform headers
      if (transformation.headers && req.headers) {
        transformedReq.headers = transformation.headers(req.headers, req);
        this.logger.debug(`Applied header transformation for route ${route.path}`);
      }

      // Transform query parameters
      if (transformation.query && req.query) {
        transformedReq.query = transformation.query(req.query, req);
        this.logger.debug(`Applied query transformation for route ${route.path}`);
      }

      return transformedReq;
    } catch (error) {
      this.logger.error(`Error transforming request for route ${route.path}:`, error);
      throw new Error(`Request transformation failed: ${error.message}`);
    }
  }

  async transformResponse(
    response: AxiosResponse,
    route: RouteConfig,
  ): Promise<AxiosResponse> {
    if (!route.transformation?.response) {
      return response;
    }

    const transformation = route.transformation.response;
    let transformedResponse = { ...response };

    try {
      // Transform response body
      if (transformation.body && response.data) {
        transformedResponse.data = transformation.body(response.data, response.config, response);
        this.logger.debug(`Applied response body transformation for route ${route.path}`);
      }

      // Transform response headers
      if (transformation.headers && response.headers) {
        transformedResponse.headers = transformation.headers(response.headers, response.config, response);
        this.logger.debug(`Applied response header transformation for route ${route.path}`);
      }

      // Transform response status
      if (transformation.status) {
        const newStatus = transformation.status(response.status, response.config, response);
        if (newStatus !== response.status) {
          transformedResponse.status = newStatus;
          this.logger.debug(`Transformed response status from ${response.status} to ${newStatus} for route ${route.path}`);
        }
      }

      return transformedResponse;
    } catch (error) {
      this.logger.error(`Error transforming response for route ${route.path}:`, error);
      throw new Error(`Response transformation failed: ${error.message}`);
    }
  }

  // Common transformation utilities
  static transformCamelCaseToSnakeCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => TransformationService.transformCamelCaseToSnakeCase(item));
    }

    const transformed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        transformed[snakeKey] = TransformationService.transformCamelCaseToSnakeCase(obj[key]);
      }
    }
    return transformed;
  }

  static transformSnakeCaseToCamelCase(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (obj instanceof Date) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => TransformationService.transformSnakeCaseToCamelCase(item));
    }

    const transformed: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
        transformed[camelKey] = TransformationService.transformSnakeCaseToCamelCase(obj[key]);
      }
    }
    return transformed;
  }

  static transformToSnakeCaseString(str: string): string {
    return str.replace(/([A-Z])/g, '_$1').toLowerCase();
  }

  static transformToCamelCaseString(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }

  static addTimestamp(data: any): any {
    return {
      ...data,
      processed_at: new Date().toISOString(),
    };
  }

  static removeNullFields(obj: any): any {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map(item => TransformationService.removeNullFields(item)).filter(item => item !== null);
    }

    const cleaned: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
        cleaned[key] = TransformationService.removeNullFields(obj[key]);
      }
    }
    return cleaned;
  }

  static sanitizeInput(data: any): any {
    if (typeof data === 'string') {
      // Basic XSS prevention
      return data
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<[^>]*>/g, '')
        .trim();
    }

    if (Array.isArray(data)) {
      return data.map(item => TransformationService.sanitizeInput(item));
    }

    if (typeof data === 'object' && data !== null) {
      const sanitized: any = {};
      for (const key in data) {
        if (data.hasOwnProperty(key)) {
          sanitized[key] = TransformationService.sanitizeInput(data[key]);
        }
      }
      return sanitized;
    }

    return data;
  }

  static formatPaginationParams(query: any): any {
    const { page, limit, offset } = query;
    const params: any = {};

    if (page) {
      const pageNum = parseInt(page, 10);
      if (!isNaN(pageNum) && pageNum > 0) {
        params.page = pageNum;
      }
    }

    if (limit) {
      const limitNum = parseInt(limit, 10);
      if (!isNaN(limitNum) && limitNum > 0 && limitNum <= 100) {
        params.limit = limitNum;
      }
    }

    if (offset) {
      const offsetNum = parseInt(offset, 10);
      if (!isNaN(offsetNum) && offsetNum >= 0) {
        params.offset = offsetNum;
      }
    }

    return params;
  }

  static formatSortParams(query: any, allowedFields: string[] = []): any {
    const { sort, order } = query;
    const sortParams: any = {};

    if (sort) {
      const sortField = allowedFields.includes(sort) ? sort : 'created_at';
      sortParams.sort = sortField;

      if (order && ['asc', 'desc'].includes(order.toLowerCase())) {
        sortParams.order = order.toLowerCase();
      } else {
        sortParams.order = 'desc';
      }
    }

    return sortParams;
  }

  static addApiVersion(response: any, version: string): any {
    return {
      ...response,
      api_version: version,
    };
  }

  static wrapResponse(data: any, metadata: any = {}): any {
    return {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        ...metadata,
      },
    };
  }

  static extractErrorDetails(error: any): any {
    return {
      message: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR',
      details: error.details || null,
      timestamp: new Date().toISOString(),
    };
  }
}
