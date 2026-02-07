import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaClient } from '@prisma/client';
import { EncryptionUtil } from '../utils/encryption.util';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  description?: string;
  language?: string;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  owner: {
    login: string;
    id: number;
    avatar_url: string;
    type: string;
  };
  permissions: {
    admin: boolean;
    push: boolean;
    pull: boolean;
  };
}

export interface GitHubFile {
  name: string;
  path: string;
  sha: string;
  size: number;
  url: string;
  html_url: string;
  git_url: string;
  download_url: string;
  type: string;
  content?: string;
  encoding?: string;
}

export interface GitHubBranch {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
}

export interface GitHubUser {
  login: string;
  id: number;
  avatar_url: string;
  html_url: string;
  name: string;
  email?: string;
  bio?: string;
  location?: string;
  company?: string;
  blog?: string;
}

@Injectable()
export class GitHubIntegrationService {
  private readonly logger = new Logger(GitHubIntegrationService.name);
  private readonly prisma: PrismaClient;
  private readonly githubApiUrl = 'https://api.github.com';

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly encryptionUtil: EncryptionUtil
  ) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.configService.get('database.url'),
        },
      },
    });
  }

  /**
   * Exchange GitHub authorization code for access token
   */
  async exchangeCodeForToken(code: string): Promise<{
    access_token: string;
    token_type: string;
    scope: string;
  }> {
    try {
      const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
      const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');

      const response = await this.httpService.axios.post(
        'https://github.com/login/oauth/access_token',
        {
          client_id: clientId,
          client_secret: clientSecret,
          code: code,
        },
        {
          headers: {
            Accept: 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to exchange GitHub code for token:', error);
      throw new Error('GitHub authentication failed');
    }
  }

  /**
   * Get authenticated GitHub user information
   */
  async getGitHubUser(accessToken: string): Promise<GitHubUser> {
    try {
      const response = await this.httpService.axios.get<GitHubUser>(
        `${this.githubApiUrl}/user`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch GitHub user:', error);
      throw new Error('Failed to fetch GitHub user information');
    }
  }

  /**
   * Get user's repositories with permissions
   */
  async getUserRepositories(accessToken: string, options: {
    type?: 'owner' | 'member' | 'all';
    sort?: 'created' | 'updated' | 'pushed' | 'full_name';
    direction?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<GitHubRepository[]> {
    try {
      const response = await this.httpService.axios.get<GitHubRepository[]>(
        `${this.githubApiUrl}/user/repos`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            type: options.type || 'all',
            sort: options.sort || 'updated',
            direction: options.direction || 'desc',
            per_page: options.per_page || 100,
            page: options.page || 1,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to fetch user repositories:', error);
      throw new Error('Failed to fetch GitHub repositories');
    }
  }

  /**
   * Get repository details
   */
  async getRepository(accessToken: string, owner: string, repo: string): Promise<GitHubRepository> {
    try {
      const response = await this.httpService.axios.get<GitHubRepository>(
        `${this.githubApiUrl}/repos/${owner}/${repo}`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch repository ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository ${owner}/${repo}`);
    }
  }

  /**
   * Get repository contents (file tree)
   */
  async getRepositoryContents(
    accessToken: string,
    owner: string,
    repo: string,
    path: string = '',
    ref?: string
  ): Promise<GitHubFile | GitHubFile[]> {
    try {
      const response = await this.httpService.axios.get(
        `${this.githubApiUrl}/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            ref: ref,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch repository contents ${owner}/${repo}/${path}:`, error);
      throw new Error(`Failed to fetch repository contents ${owner}/${repo}/${path}`);
    }
  }

  /**
   * Download file content
   */
  async getFileContent(
    accessToken: string,
    owner: string,
    repo: string,
    path: string,
    ref?: string
  ): Promise<string> {
    try {
      const fileData = await this.getRepositoryContents(accessToken, owner, repo, path, ref);

      if (Array.isArray(fileData)) {
        throw new Error('Path points to a directory, not a file');
      }

      if (fileData.encoding === 'base64') {
        return Buffer.from(fileData.content, 'base64').toString('utf-8');
      }

      if (fileData.download_url) {
        const response = await this.httpService.axios.get(fileData.download_url);
        return response.data;
      }

      return fileData.content || '';
    } catch (error) {
      this.logger.error(`Failed to download file ${owner}/${repo}/${path}:`, error);
      throw new Error(`Failed to download file ${owner}/${repo}/${path}`);
    }
  }

  /**
   * Get repository branches
   */
  async getRepositoryBranches(
    accessToken: string,
    owner: string,
    repo: string,
    protectedOnly = false
  ): Promise<GitHubBranch[]> {
    try {
      const response = await this.httpService.axios.get<GitHubBranch[]>(
        `${this.githubApiUrl}/repos/${owner}/${repo}/branches`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            protected: protectedOnly,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch repository branches ${owner}/${repo}:`, error);
      throw new Error(`Failed to fetch repository branches ${owner}/${repo}`);
    }
  }

  /**
   * Search repositories
   */
  async searchRepositories(accessToken: string, query: string, options: {
    sort?: 'stars' | 'forks' | 'updated';
    order?: 'asc' | 'desc';
    per_page?: number;
    page?: number;
  } = {}): Promise<{
    total_count: number;
    incomplete_results: boolean;
    items: GitHubRepository[];
  }> {
    try {
      const response = await this.httpService.axios.get(
        `${this.githubApiUrl}/search/repositories`,
        {
          headers: {
            Authorization: `token ${accessToken}`,
            Accept: 'application/vnd.github.v3+json',
          },
          params: {
            q: query,
            sort: options.sort || 'updated',
            order: options.order || 'desc',
            per_page: options.per_page || 30,
            page: options.page || 1,
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error('Failed to search repositories:', error);
      throw new Error('Failed to search repositories');
    }
  }

  /**
   * Save GitHub connection for user
   */
  async saveGitHubConnection(
    userId: string,
    githubData: {
      accessToken: string;
      user: GitHubUser;
      scopes: string[];
    }
  ): Promise<void> {
    try {
      await this.prisma.githubConnection.upsert({
        where: { userId },
        update: {
          githubUserId: githubData.user.id.toString(),
          githubUsername: githubData.user.login,
          accessToken: this.encryptionUtil.encrypt(githubData.accessToken),
          scopes: githubData.scopes,
          userData: githubData.user,
          lastUsedAt: new Date(),
        },
        create: {
          userId,
          githubUserId: githubData.user.id.toString(),
          githubUsername: githubData.user.login,
          accessToken: this.encryptionUtil.encrypt(githubData.accessToken),
          scopes: githubData.scopes,
          userData: githubData.user,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
      });

      this.logger.log(`GitHub connection saved for user: ${githubData.user.login}`);
    } catch (error) {
      this.logger.error('Failed to save GitHub connection:', error);
      throw new Error('Failed to save GitHub connection');
    }
  }

  /**
   * Get user's GitHub connection
   */
  async getGitHubConnection(userId: string): Promise<{
    accessToken: string;
    user: GitHubUser;
    scopes: string[];
  } | null> {
    try {
      const connection = await this.prisma.githubConnection.findUnique({
        where: { userId },
      });

      if (!connection) {
        return null;
      }

      // Update last used time
      await this.prisma.githubConnection.update({
        where: { userId },
        data: { lastUsedAt: new Date() },
      });

      return {
        accessToken: this.encryptionUtil.decrypt(connection.accessToken),
        user: connection.userData as GitHubUser,
        scopes: connection.scopes as string[],
      };
    } catch (error) {
      this.logger.error('Failed to get GitHub connection:', error);
      return null;
    }
  }

  /**
   * Remove GitHub connection
   */
  async removeGitHubConnection(userId: string): Promise<void> {
    try {
      await this.prisma.githubConnection.delete({
        where: { userId },
      });

      this.logger.log(`GitHub connection removed for user: ${userId}`);
    } catch (error) {
      this.logger.error('Failed to remove GitHub connection:', error);
      throw new Error('Failed to remove GitHub connection');
    }
  }

  /**
   * Validate GitHub access token
   */
  async validateToken(accessToken: string): Promise<boolean> {
    try {
      await this.httpService.axios.get(`${this.githubApiUrl}/user`, {
        headers: {
          Authorization: `token ${accessToken}`,
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file extensions to include for optimization
   */
  private getOptimizableExtensions(): string[] {
    return [
      '.ts', '.tsx', '.js', '.jsx',  // TypeScript/JavaScript
      '.py', '.pyx',                 // Python
      '.java', '.kt', '.scala',      // JVM languages
      '.go', '.rs', '.cpp', '.c',    // Systems languages
      '.php', '.rb', '.swift',       // Web/mobile languages
      '.md', '.rst', '.txt',         // Documentation
      '.json', '.yaml', '.yml',     // Configuration
      '.sql', '.graphql',            // Query languages
      '.sh', '.bash', '.ps1',        // Shell scripts
      '.html', '.css', '.scss',     // Web files
      '.xml', '.toml', '.ini'        // Config files
    ];
  }

  /**
   * Check if file should be optimized
   */
  private shouldOptimizeFile(filePath: string): boolean {
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    return this.getOptimizableExtensions().includes(extension);
  }

  /**
   * Get repository file tree for optimization
   */
  async getRepositoryFileTree(
    accessToken: string,
    owner: string,
    repo: string,
    ref?: string
  ): Promise<Array<{ path: string; type: string; size: number }>> {
    try {
      const files = [];

      // Get repository contents recursively
      const contents = await this.getRepositoryContents(accessToken, owner, repo, '', ref);

      const processContents = async (items: any, currentPath = '') => {
        for (const item of items) {
          const itemPath = currentPath ? `${currentPath}/${item.name}` : item.name;

          if (item.type === 'dir') {
            // Recursively process directory
            const dirContents = await this.getRepositoryContents(
              accessToken,
              owner,
              repo,
              itemPath,
              ref
            );
            if (Array.isArray(dirContents)) {
              await processContents(dirContents, itemPath);
            }
          } else if (this.shouldOptimizeFile(itemPath)) {
            // Add optimizable file
            files.push({
              path: itemPath,
              type: item.type,
              size: item.size,
              sha: item.sha
            });
          }
        }
      };

      if (Array.isArray(contents)) {
        await processContents(contents);
      } else if (contents.type === 'dir') {
        const dirContents = await this.getRepositoryContents(accessToken, owner, repo, contents.name, ref);
        if (Array.isArray(dirContents)) {
          await processContents(dirContents);
        }
      }

      return files;
    } catch (error) {
      this.logger.error(`Failed to get repository file tree ${owner}/${repo}:`, error);
      throw new Error(`Failed to get repository file tree ${owner}/${repo}`);
    }
  }

  /**
   * Get repository content for optimization
   */
  async getRepositoryContentForOptimization(
    accessToken: string,
    owner: string,
    repo: string,
    options: {
      ref?: string;
      includePatterns?: string[];
      excludePatterns?: string[];
      maxFiles?: number;
    } = {}
  ): Promise<Array<{
    path: string;
    content: string;
    size: number;
    language?: string;
  }>> {
    try {
      const fileTree = await this.getRepositoryFileTree(
        accessToken,
        owner,
        repo,
        options.ref
      );

      // Apply file filters
      let filteredFiles = fileTree.filter(file => {
        const path = file.path;

        // Check include patterns
        if (options.includePatterns && options.includePatterns.length > 0) {
          const included = options.includePatterns.some(pattern =>
            this.matchPattern(path, pattern)
          );
          if (!included) return false;
        }

        // Check exclude patterns
        if (options.excludePatterns && options.excludePatterns.length > 0) {
          const excluded = options.excludePatterns.some(pattern =>
            this.matchPattern(path, pattern)
          );
          if (excluded) return false;
        }

        return true;
      });

      // Limit number of files
      if (options.maxFiles && filteredFiles.length > options.maxFiles) {
        filteredFiles = filteredFiles.slice(0, options.maxFiles);
      }

      // Download file contents
      const contents = [];

      for (const file of filteredFiles) {
        try {
          const content = await this.getFileContent(
            accessToken,
            owner,
            repo,
            file.path,
            options.ref
          );

          const language = this.detectLanguage(file.path);

          contents.push({
            path: file.path,
            content,
            size: file.size,
            language
          });
        } catch (error) {
          this.logger.warn(`Failed to download file ${file.path}:`, error.message);
        }
      }

      return contents;
    } catch (error) {
      this.logger.error(`Failed to get repository content for optimization ${owner}/${repo}:`, error);
      throw new Error(`Failed to get repository content for optimization ${owner}/${repo}`);
    }
  }

  /**
   * Simple pattern matching (glob-like)
   */
  private matchPattern(path: string, pattern: string): boolean {
    // Convert glob pattern to regex
    const regexPattern = pattern
      .replace(/\*\*/g, '.*')
      .replace(/\?/g, '.')
      .replace(/\./g, '\\.');

    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(path);
  }

  /**
   * Detect programming language from file path
   */
  private detectLanguage(filePath: string): string {
    const extension = filePath.substring(filePath.lastIndexOf('.'));

    const languageMap: Record<string, string> = {
      '.ts': 'typescript',
      '.tsx': 'typescript',
      '.js': 'javascript',
      '.jsx': 'javascript',
      '.py': 'python',
      '.java': 'java',
      '.go': 'go',
      '.rs': 'rust',
      '.cpp': 'cpp',
      '.c': 'c',
      '.cs': 'csharp',
      '.php': 'php',
      '.rb': 'ruby',
      '.swift': 'swift',
      '.kt': 'kotlin',
      '.scala': 'scala',
      '.md': 'markdown',
      '.json': 'json',
      '.yaml': 'yaml',
      '.yml': 'yaml',
      '.sql': 'sql',
      '.sh': 'shell',
      '.bash': 'shell',
      '.ps1': 'powershell',
      '.html': 'html',
      '.css': 'css',
      '.scss': 'scss',
      '.xml': 'xml',
      '.toml': 'toml'
    };

    return languageMap[extension] || 'text';
  }
}
