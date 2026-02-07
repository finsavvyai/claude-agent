import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RAGService } from './rag.service';

describe('RAGService', () => {
  let service: RAGService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getStatus', () => {
    it('should return RAG service status', async () => {
      // Mock config values
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          OPENAI_API_KEY: 'test-key',
          RAG_EMBEDDING_MODEL: 'text-embedding-3-small',
          PINECONE_API_KEY: 'test-pinecone-key',
          PINECONE_ENVIRONMENT: 'test-env',
          PINECONE_INDEX_NAME: 'test-index',
        };
        return config[key];
      });

      // Since we can't actually initialize without real API keys,
      // we expect the service to return an error status
      const status = await service.getStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('message');
      expect(status).toHaveProperty('capabilities');

      // Should either be active or error depending on initialization
      expect(['active', 'error']).toContain(status.status);
    });
  });

  describe('indexFile', () => {
    it('should handle file indexing errors gracefully', async () => {
      // Test with non-existent file
      const fileData = {
        filePath: '/non-existent/file.ts',
        content: 'console.log("Hello, World!");',
        metadata: {
          type: 'code',
          language: 'TypeScript'
        }
      };

      await expect(service.indexFile(fileData)).rejects.toThrow();
    });
  });

  describe('indexRepository', () => {
    it('should handle repository indexing errors gracefully', async () => {
      // Test with non-existent repository
      const repoData = {
        repositoryPath: '/non-existent-repo',
        filePatterns: ['**/*.ts'],
        excludePatterns: ['**/node_modules/**'],
        metadata: {
          name: 'Test Repository'
        }
      };

      const result = await service.indexRepository(repoData);

      expect(result).toHaveProperty('indexedFiles');
      expect(result).toHaveProperty('errors');
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('search', () => {
    it('should handle search queries gracefully', async () => {
      const searchData = {
        query: 'test query',
        maxResults: 5
      };

      // Should not crash even if RAG engine is not initialized
      await expect(service.search(searchData)).rejects.toThrow();
    });
  });

  describe('conversation history', () => {
    it('should handle conversation history operations', () => {
      // These operations should not crash even if RAG engine is not initialized
      expect(() => service.getConversationHistory()).not.toThrow();
      expect(() => service.clearConversationHistory()).not.toThrow();
    });
  });

  describe('deleteDocuments', () => {
    it('should handle document deletion gracefully', async () => {
      const documentIds = ['test-id-1', 'test-id-2'];

      await expect(service.deleteDocuments(documentIds)).rejects.toThrow();
    });
  });
});

// Integration tests (these would require real API keys and services)
describe('RAGService Integration', () => {
  let service: RAGService;

  beforeAll(async () => {
    // Skip integration tests if no API keys are available
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      console.log('Skipping RAG integration tests - missing API keys');
      return;
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RAGService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => process.env[key]),
          },
        },
      ],
    }).compile();

    service = module.get<RAGService>(RAGService);
  });

  it('should initialize with real API keys', async () => {
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return;
    }

    // This test would verify that the service initializes correctly
    // with real API keys and external services
    const status = await service.getStatus();
    expect(status.status).toBe('active');
  });

  it('should index and search documents', async () => {
    if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY) {
      return;
    }

    // Test file indexing
    await service.indexFile({
      filePath: 'test.ts',
      content: `
export interface User {
  id: string;
  name: string;
  email: string;
}

export class UserService {
  async getUser(id: string): Promise<User | null> {
    // Implementation here
    return null;
  }
}
      `,
      metadata: {
        type: 'code',
        language: 'TypeScript'
      }
    });

    // Test search
    const results = await service.search({
      query: 'UserService',
      maxResults: 5
    });

    expect(results.length).toBeGreaterThan(0);
    expect(results[0]).toHaveProperty('content');
    expect(results[0]).toHaveProperty('relevanceScore');
  });
});
