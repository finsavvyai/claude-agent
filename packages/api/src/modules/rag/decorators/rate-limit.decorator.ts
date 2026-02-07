import { SetMetadata } from '@nestjs/common';
import { RateLimitUtil } from '../utils/rate-limit.util';

export const RATE_LIMIT_KEY = 'rateLimit';

/**
 * Decorator to apply rate limiting to a route
 *
 * @param config Rate limit configuration
 */
export const RateLimit = (config: any) => SetMetadata(RATE_LIMIT_KEY, config);

/**
 * Convenience decorators for common rate limiting scenarios
 */
export const ApiRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('API_GENERAL'));
export const OptimizationRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('API_OPTIMIZATION'));
export const GitHubConnectRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('API_GITHUB_CONNECT'));
export const GitHubApiRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('API_GITHUB_API'));
export const AuthRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('AUTH_LOGIN'));
export const DataUploadRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('DATA_UPLOAD'));
export const DataExportRateLimit = () => RateLimit(RateLimitUtil.getRateLimitConfig('DATA_EXPORT'));
