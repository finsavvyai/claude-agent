import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { Request as ExpressRequest, Response as ExpressResponse, NextFunction } from 'express';
import { firstValueFrom } from 'rxjs';
import { AxiosRequestConfig, AxiosResponse } from 'axios';

import { RoutingService } from './services/routing.service';
import { CircuitBreakerService } from './services/circuit-breaker.service';
import { TransformationService } from './services/transformation.service';
import { VersioningService } from './services/versioning.service';
import { RouteConfig } from './interfaces/route-config.interface';
import { GatewayMetrics } from './interfaces/gateway-metrics.interface';

@Injectable()
export class GatewayService {
  private readonly logger = new Logger(GatewayService.name);
  private metrics: GatewayMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    requestsPerMinute: 0,
    activeConnections: 0,
    circuitBreakerTrips: 0,
  };

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly routingService: RoutingService,
    private readonly circuitBreakerService: CircuitBreakerService,
    private readonly transformationService: TransformationService,
    private readonly versioningService: VersioningService,
  ) {}

  async handleRequest(
    req: ExpressRequest,
    res: ExpressResponse,
    next: NextFunction,
  ): Promise<void> {
    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.activeConnections++;

    try {
      // Extract route information
      const route = await this.routingService.resolveRoute(req);

      if (!route) {
        res.status(404).json({
          error: 'Not Found',
          message: `No route found for ${req.method} ${req.path}`,
          timestamp: new Date().toISOString(),
        });
        this.metrics.failedRequests++;
        return;
      }

      // Apply versioning if required
      const versionedRequest = await this.versioningService.applyVersioning(req, route);

      // Transform request if needed
      const transformedRequest = await this.transformationService.transformRequest(versionedRequest, route);

      // Check circuit breaker status
      const circuitState = await this.circuitBreakerService.getState(route.service);
      if (circuitState.isOpen) {
        res.status(503).json({
          error: 'Service Unavailable',
          message: `Circuit breaker is open for service: ${route.service}`,
          timestamp: new Date().toISOString(),
        });
        this.metrics.failedRequests++;
        this.metrics.circuitBreakerTrips++;
        return;
      }

      // Make the downstream request
      const response = await this.makeDownstreamRequest(transformedRequest, route);

      // Transform response if needed
      const transformedResponse = await this.transformationService.transformResponse(response, route);

      // Set response headers
      this.setResponseHeaders(res, transformedResponse, route);

      // Send response
      res.status(transformedResponse.status).json(transformedResponse.data);

      // Update metrics
      this.updateMetrics(startTime, true, route);

    } catch (error) {
      this.logger.error(`Error handling request: ${error.message}`, error.stack);

      // Record circuit breaker failure if applicable
      const route = await this.routingService.resolveRoute(req);
      if (route) {
        await this.circuitBreakerService.recordFailure(route.service);
      }

      // Send error response
      res.status(500).json({
        error: 'Internal Server Error',
        message: this.configService.get('NODE_ENV') === 'production'
          ? 'An unexpected error occurred'
          : error.message,
        timestamp: new Date().toISOString(),
      });

      this.updateMetrics(startTime, false, route);
    } finally {
      this.metrics.activeConnections--;
    }
  }

  private async makeDownstreamRequest(
    req: ExpressRequest,
    route: RouteConfig,
  ): Promise<AxiosResponse> {
    const config: AxiosRequestConfig = {
      method: req.method as any,
      url: this.buildTargetUrl(req, route),
      headers: this.buildHeaders(req, route),
      data: req.body,
      params: req.query,
      timeout: route.timeout || 30000,
      validateStatus: () => true, // Don't throw on HTTP error status
    };

    const response = await firstValueFrom(this.httpService.request(config));

    // Record success for circuit breaker
    await this.circuitBreakerService.recordSuccess(route.service);

    return response;
  }

  private buildTargetUrl(req: ExpressRequest, route: RouteConfig): string {
    const baseUrl = route.serviceUrl;
    const pathRewrite = route.pathRewrite || {};
    let path = req.path;

    // Apply path rewriting
    for (const [pattern, replacement] of Object.entries(pathRewrite)) {
      path = path.replace(new RegExp(pattern), replacement);
    }

    return `${baseUrl}${path}`;
  }

  private buildHeaders(req: ExpressRequest, route: RouteConfig): Record<string, string> {
    const headers: Record<string, string> = {};

    // Copy allowed headers
    const allowedHeaders = route.allowedHeaders || [
      'accept',
      'authorization',
      'content-type',
      'user-agent',
    ];

    for (const header of allowedHeaders) {
      if (req.headers[header]) {
        headers[header] = req.headers[header] as string;
      }
    }

    // Add custom headers
    if (route.customHeaders) {
      Object.assign(headers, route.customHeaders);
    }

    // Add gateway tracking headers
    headers['X-Gateway-Request-Id'] = this.generateRequestId();
    headers['X-Gateway-Service'] = route.service;
    headers['X-Gateway-Timestamp'] = new Date().toISOString();

    return headers;
  }

  private setResponseHeaders(
    res: ExpressResponse,
    response: AxiosResponse,
    route: RouteConfig,
  ): void {
    // Copy allowed response headers
    const allowedHeaders = route.allowedResponseHeaders || [
      'content-type',
      'cache-control',
      'etag',
      'last-modified',
    ];

    for (const header of allowedHeaders) {
      if (response.headers[header]) {
        res.setHeader(header, response.headers[header]);
      }
    }

    // Add gateway response headers
    res.setHeader('X-Gateway-Response-Time', `${Date.now() - parseInt(response.headers['x-gateway-timestamp'] || Date.now().toString())}ms`);
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private updateMetrics(startTime: number, success: boolean, route?: RouteConfig): void {
    const responseTime = Date.now() - startTime;

    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }

    // Update average response time
    const totalRequests = this.metrics.totalRequests;
    this.metrics.averageResponseTime =
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;

    // Log route-specific metrics
    if (route) {
      this.logger.debug(`Route ${route.path}: ${responseTime}ms - ${success ? 'SUCCESS' : 'FAILURE'}`);
    }
  }

  async getHealth(): Promise<any> {
    const services = await this.routingService.getAllServices();
    const serviceHealth = [];

    for (const service of services) {
      const circuitState = await this.circuitBreakerService.getState(service.name);
      serviceHealth.push({
        service: service.name,
        url: service.url,
        status: circuitState.isOpen ? 'DOWN' : 'UP',
        circuitBreakerState: circuitState,
      });
    }

    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      services: serviceHealth,
    };
  }

  async getRoutes(): Promise<any> {
    return this.routingService.getAllRoutes();
  }

  async getMetrics(): Promise<GatewayMetrics> {
    return {
      ...this.metrics,
      requestsPerMinute: await this.calculateRequestsPerMinute(),
    };
  }

  private async calculateRequestsPerMinute(): Promise<number> {
    // This would typically be calculated from a time-series database
    // For now, return a simple approximation
    return Math.floor(this.metrics.totalRequests / 60); // Simplified calculation
  }
}
