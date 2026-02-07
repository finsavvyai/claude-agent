import { BadRequestException } from '@nestjs/common';
import * as sanitizeHtml from 'sanitize-html';
import * as validator from 'validator';

export class ValidationUtil {
  /**
   * Sanitize string input to prevent XSS and injection attacks
   */
  static sanitizeString(input: string, maxLength?: number): string {
    if (!input || typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/[\0\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // HTML sanitization to prevent XSS
    sanitized = sanitizeHtml(sanitized, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'discard',
    });

    // Apply length limit if specified
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  }

  /**
   * Validate and sanitize user ID
   */
  static validateUserId(userId: string): string {
    if (!userId || typeof userId !== 'string') {
      throw new BadRequestException('Valid user ID is required');
    }

    const sanitized = this.sanitizeString(userId, 255);

    if (!validator.isUUID(sanitized) && !validator.isAlphanumeric(sanitized)) {
      throw new BadRequestException('Invalid user ID format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize GitHub repository parameters
   */
  static validateRepoParams(owner: string, repo: string): { owner: string; repo: string } {
    if (!owner || typeof owner !== 'string') {
      throw new BadRequestException('Repository owner is required');
    }

    if (!repo || typeof repo !== 'string') {
      throw new BadRequestException('Repository name is required');
    }

    const sanitizedOwner = this.sanitizeString(owner, 39);
    const sanitizedRepo = this.sanitizeString(repo, 100);

    // GitHub username/repo validation
    const usernameRegex = /^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/;
    const repoRegex = /^[a-zA-Z0-9._-]+$/;

    if (!usernameRegex.test(sanitizedOwner)) {
      throw new BadRequestException('Invalid repository owner format');
    }

    if (!repoRegex.test(sanitizedRepo)) {
      throw new BadRequestException('Invalid repository name format');
    }

    return { owner: sanitizedOwner, repo: sanitizedRepo };
  }

  /**
   * Validate and sanitize file path
   */
  static validateFilePath(filePath: string): string {
    if (!filePath || typeof filePath !== 'string') {
      throw new BadRequestException('File path is required');
    }

    const sanitized = this.sanitizeString(filePath, 1000);

    // Prevent path traversal attacks
    if (sanitized.includes('..') || sanitized.includes('~') || sanitized.startsWith('/')) {
      throw new BadRequestException('Invalid file path format');
    }

    // Check for dangerous file extensions
    const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const extension = sanitized.substring(sanitized.lastIndexOf('.')).toLowerCase();

    if (dangerousExtensions.includes(extension)) {
      throw new BadRequestException('Dangerous file type not allowed');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize content for optimization
   */
  static validateContent(content: string, maxContentLength: number = 1000000): string {
    if (!content || typeof content !== 'string') {
      throw new BadRequestException('Content is required');
    }

    const sanitized = this.sanitizeString(content, maxContentLength);

    if (sanitized.length === 0) {
      throw new BadRequestException('Content cannot be empty');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize pagination parameters
   */
  static validatePaginationParams(page?: string, limit?: string): { page: number; limit: number } {
    const validatedPage = Math.max(1, parseInt(page || '1', 10) || 1);
    const validatedLimit = Math.min(100, Math.max(1, parseInt(limit || '20', 10) || 20));

    return {
      page: validatedPage,
      limit: validatedLimit,
    };
  }

  /**
   * Validate and sanitize search query
   */
  static validateSearchQuery(query: string): string {
    if (!query || typeof query !== 'string') {
      throw new BadRequestException('Search query is required');
    }

    const sanitized = this.sanitizeString(query, 500);

    if (sanitized.length < 2) {
      throw new BadRequestException('Search query must be at least 2 characters');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize array of strings
   */
  static validateStringArray(input: any, maxLength: number = 100, maxItems: number = 50): string[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .filter(item => typeof item === 'string')
      .map(item => this.sanitizeString(item, maxLength))
      .filter(item => item.length > 0)
      .slice(0, maxItems);
  }

  /**
   * Validate and sanitize optimization options
   */
  static validateOptimizationOptions(options: any): any {
    if (!options || typeof options !== 'object') {
      return {};
    }

    const sanitized: any = {};

    // Validate include patterns
    if (options.includePatterns && Array.isArray(options.includePatterns)) {
      sanitized.includePatterns = this.validateStringArray(options.includePatterns, 200, 20);
    }

    // Validate exclude patterns
    if (options.excludePatterns && Array.isArray(options.excludePatterns)) {
      sanitized.excludePatterns = this.validateStringArray(options.excludePatterns, 200, 20);
    }

    // Validate max files
    if (options.maxFiles !== undefined) {
      const maxFiles = parseInt(options.maxFiles, 10);
      if (!isNaN(maxFiles) && maxFiles > 0 && maxFiles <= 1000) {
        sanitized.maxFiles = maxFiles;
      }
    }

    // Validate target tokens
    if (options.targetTokens !== undefined) {
      const targetTokens = parseInt(options.targetTokens, 10);
      if (!isNaN(targetTokens) && targetTokens > 0 && targetTokens <= 100000) {
        sanitized.targetTokens = targetTokens;
      }
    }

    return sanitized;
  }

  /**
   * Validate and sanitize GitHub OAuth code
   */
  static validateOAuthCode(code: string): string {
    if (!code || typeof code !== 'string') {
      throw new BadRequestException('OAuth code is required');
    }

    const sanitized = this.sanitizeString(code, 255);

    // GitHub OAuth codes are typically 20-30 characters of alphanumeric and some special chars
    if (!/^[a-zA-Z0-9_-]+$/.test(sanitized) || sanitized.length < 10 || sanitized.length > 50) {
      throw new BadRequestException('Invalid OAuth code format');
    }

    return sanitized;
  }

  /**
   * Validate and sanitize access token (for validation only, not storage)
   */
  static validateAccessToken(token: string): string {
    if (!token || typeof token !== 'string') {
      throw new BadRequestException('Access token is required');
    }

    const sanitized = this.sanitizeString(token, 500);

    // GitHub access tokens are typically 40 characters hex
    if (!/^[a-f0-9]+$/.test(sanitized) || sanitized.length !== 40) {
      throw new BadRequestException('Invalid access token format');
    }

    return sanitized;
  }

  /**
   * Create a safe database query parameter object
   */
  static createSafeQueryParams(params: Record<string, any>): Record<string, any> {
    const safeParams: Record<string, any> = {};

    for (const [key, value] of Object.entries(params)) {
      if (value === null || value === undefined) {
        safeParams[key] = null;
        continue;
      }

      switch (typeof value) {
        case 'string':
          safeParams[key] = this.sanitizeString(value, 1000);
          break;
        case 'number':
          safeParams[key] = isNaN(value) ? null : value;
          break;
        case 'boolean':
          safeParams[key] = value;
          break;
        case 'object':
          if (Array.isArray(value)) {
            safeParams[key] = this.validateStringArray(value);
          } else {
            // Convert complex objects to JSON string for storage
            safeParams[key] = JSON.stringify(value);
          }
          break;
        default:
          safeParams[key] = null;
      }
    }

    return safeParams;
  }

  /**
   * Validate HTTP headers for security
   */
  static validateHttpHeaders(headers: Record<string, string>): Record<string, string> {
    const safeHeaders: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      // Only allow safe header names
      if (/^[a-zA-Z0-9-]+$/.test(key)) {
        safeHeaders[key] = this.sanitizeString(value, 1000);
      }
    }

    return safeHeaders;
  }
}
