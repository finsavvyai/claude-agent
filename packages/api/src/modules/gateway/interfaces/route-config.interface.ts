export interface RouteConfig {
  path: string;
  method: HttpMethod | HttpMethod[];
  service: string;
  serviceUrl: string;
  auth?: AuthConfig;
  rateLimit?: RateLimitConfig;
  cache?: CacheConfig;
  timeout?: number;
  retries?: number;
  pathRewrite?: Record<string, string>;
  allowedHeaders?: string[];
  allowedResponseHeaders?: string[];
  customHeaders?: Record<string, string>;
  transformation?: TransformationConfig;
  circuitBreaker?: CircuitBreakerConfig;
  versioning?: VersioningConfig;
  priority?: number;
  metadata?: Record<string, any>;
}

export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS',
}

export interface AuthConfig {
  required: boolean;
  strategies?: string[];
  permissions?: string[];
  roles?: string[];
  bypassPaths?: string[];
}

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  keyGenerator?: (req: any) => string;
}

export interface CacheConfig {
  enabled: boolean;
  ttl: number;
  keyGenerator?: (req: any) => string;
  skipCache?: (req: any) => boolean;
  condition?: (req: any) => boolean;
}

export interface TransformationConfig {
  request?: RequestTransformation;
  response?: ResponseTransformation;
}

export interface RequestTransformation {
  body?: (body: any, req: any) => any;
  headers?: (headers: any, req: any) => any;
  query?: (query: any, req: any) => any;
}

export interface ResponseTransformation {
  body?: (body: any, req: any, res: any) => any;
  headers?: (headers: any, req: any, res: any) => any;
  status?: (status: number, req: any, res: any) => number;
}

export interface CircuitBreakerConfig {
  threshold: number;
  timeout: number;
  resetTimeout: number;
  monitoring?: boolean;
}

export interface VersioningConfig {
  enabled: boolean;
  type: 'header' | 'query' | 'path';
  headerName?: string;
  queryParam?: string;
  defaultVersion?: string;
  versions?: string[];
}
