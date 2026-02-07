import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';

import { VersioningConfig } from '../interfaces/route-config.interface';

@Injectable()
export class VersioningService {
  private readonly logger = new Logger(VersioningService.name);
  private defaultConfig: Partial<VersioningConfig> = {
    enabled: true,
    type: 'header',
    headerName: 'X-API-Version',
    queryParam: 'version',
    defaultVersion: 'v1',
    versions: ['v1', 'v2'],
  };

  constructor(private readonly configService: ConfigService) {}

  async applyVersioning(req: Request, route?: { versioning?: VersioningConfig }): Promise<Request> {
    const config = { ...this.defaultConfig, ...route?.versioning };

    if (!config.enabled) {
      return req;
    }

    const version = this.extractVersion(req, config);

    if (!version) {
      throw new Error(`API version is required. Supported versions: ${config.versions?.join(', ')}`);
    }

    if (config.versions && !config.versions.includes(version)) {
      throw new Error(`Unsupported API version: ${version}. Supported versions: ${config.versions?.join(', ')}`);
    }

    // Add version to request object
    const versionedReq = { ...req };
    versionedReq.apiVersion = version;
    versionedReq.headers = {
      ...req.headers,
      'X-API-Version': version,
    };

    // Add version to query parameters for downstream services
    versionedReq.query = {
      ...req.query,
      version,
    };

    this.logger.debug(`Applied version ${version} to request`);
    return versionedReq;
  }

  private extractVersion(req: Request, config: Partial<VersioningConfig>): string | null {
    const version = this.getVersionFromRequest(req, config);
    return version || config.defaultVersion || null;
  }

  private getVersionFromRequest(req: Request, config: Partial<VersioningConfig>): string | null {
    const type = config.type;

    switch (type) {
      case 'header':
        return this.getVersionFromHeader(req, config.headerName);
      case 'query':
        return this.getVersionFromQuery(req, config.queryParam);
      case 'path':
        return this.getVersionFromPath(req.path);
      default:
        return null;
    }
  }

  private getVersionFromHeader(req: Request, headerName?: string): string | null {
    const name = headerName || 'X-API-Version';
    const version = req.headers[name.toLowerCase()];
    return typeof version === 'string' ? version : null;
  }

  private getVersionFromQuery(req: Request, queryParam?: string): string | null {
    const param = queryParam || 'version';
    const version = req.query[param];
    return typeof version === 'string' ? version : null;
  }

  private getVersionFromPath(path: string): string | null {
    // Extract version from path like /api/v1/users -> v1
    const match = path.match(/\/api\/(v\d+)\//);
    return match ? match[1] : null;
  }

  getCurrentVersion(req: Request): string | null {
    return (req as any).apiVersion || null;
  }

  isVersionSupported(version: string, config?: Partial<VersioningConfig>): boolean {
    const versions = config?.versions || this.defaultConfig.versions || ['v1'];
    return versions.includes(version);
  }

  getLatestVersion(config?: Partial<VersioningConfig>): string {
    const versions = config?.versions || this.defaultConfig.versions || ['v1'];

    // Sort versions to get the latest (v2 > v1 > v10)
    return versions.sort((a, b) => {
      const aNum = parseInt(a.replace('v', ''), 10);
      const bNum = parseInt(b.replace('v', ''), 10);
      return bNum - aNum;
    })[0];
  }

  getDeprecatedVersions(config?: Partial<VersioningConfig>): string[] {
    // Logic to determine deprecated versions
    const versions = config?.versions || this.defaultConfig.versions || ['v1'];
    const latest = this.getLatestVersion(config);

    // All versions except the latest are considered deprecated
    return versions.filter(v => v !== latest);
  }

  createVersionedPath(path: string, version: string): string {
    // Replace or add version in path
    if (path.includes('/api/v')) {
      return path.replace(/\/api\/v\d+\//, `/api/${version}/`);
    }

    // Add version after /api if not present
    return path.replace('/api/', `/api/${version}/`);
  }

  createVersionedUrl(baseUrl: string, path: string, version: string): string {
    const versionedPath = this.createVersionedPath(path, version);
    return `${baseUrl}${versionedPath}`;
  }

  validateVersionTransition(fromVersion: string, toVersion: string): boolean {
    // Define allowed version transitions
    const allowedTransitions: Record<string, string[]> = {
      'v1': ['v2'],
      'v2': ['v3'],
      // Add more as needed
    };

    return allowedTransitions[fromVersion]?.includes(toVersion) || false;
  }

  getVersionMetadata(version: string): any {
    return {
      version,
      isLatest: version === this.getLatestVersion(),
      isDeprecated: this.getDeprecatedVersions().includes(version),
      deprecationDate: this.getDeprecationDate(version),
      sunsetDate: this.getSunsetDate(version),
      supportedMethods: this.getSupportedMethods(version),
    };
  }

  private getDeprecationDate(version: string): Date | null {
    // Logic to determine deprecation date
    // This could be stored in configuration or database
    const deprecationDates: Record<string, Date> = {
      'v1': new Date('2024-12-31'),
      // Add more as needed
    };

    return deprecationDates[version] || null;
  }

  private getSunsetDate(version: string): Date | null {
    // Logic to determine sunset date (when version will be discontinued)
    const sunsetDates: Record<string, Date> = {
      'v1': new Date('2025-06-30'),
      // Add more as needed
    };

    return sunsetDates[version] || null;
  }

  private getSupportedMethods(version: string): string[] {
    // Define supported methods for each version
    const supportedMethods: Record<string, string[]> = {
      'v1': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      'v2': ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
      // Add more as needed
    };

    return supportedMethods[version] || ['GET', 'POST', 'PUT', 'DELETE'];
  }

  async migrateToVersion(
    currentData: any,
    fromVersion: string,
    toVersion: string,
  ): Promise<any> {
    // Data migration logic between versions
    this.logger.debug(`Migrating data from ${fromVersion} to ${toVersion}`);

    switch (`${fromVersion}->${toVersion}`) {
      case 'v1->v2':
        return this.migrateV1ToV2(currentData);
      // Add more migration cases as needed
      default:
        return currentData;
    }
  }

  private async migrateV1ToV2(data: any): Promise<any> {
    // Example migration from v1 to v2
    const migrated = {
      ...data,
      // Add new fields or transform existing ones
      api_version: 'v2',
      created_at: data.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Remove deprecated fields
    delete migrated.old_field;

    return migrated;
  }
}
