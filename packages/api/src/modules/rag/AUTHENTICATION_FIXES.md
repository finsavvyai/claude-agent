# Authentication Integration Fixes for RAG Service

## Current Issue

The RAG service currently uses placeholder user IDs instead of actual authenticated users:

```typescript
// TODO: Get from authenticated user
createdBy: 'system',
updatedBy: 'system', 
deletedBy: 'system'
```

## Required Changes

### 1. Import Auth Service
```typescript
import { AuthService } from '../auth/auth.service';
```

### 2. Inject Auth Service
```typescript
constructor(
  private configService: ConfigService,
  private authService: AuthService
) {}
```

### 3. Create Authenticated Metadata Method
```typescript
private async createAuthenticatedMetadata(additionalMetadata: Record<string, any> = {}): Promise<Record<string, any>> {
  try {
    const user = await this.authService.getCurrentUser();
    return {
      ...additionalMetadata,
      createdBy: user.id,
      updatedBy: user.id,
      deletedBy: user.id,
      userId: user.id,
      userRole: user.role,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    this.logger.warn('Could not get authenticated user, using system fallback', error);
    return {
      ...additionalMetadata,
      createdBy: 'system',
      updatedBy: 'system',
      deletedBy: 'system',
      timestamp: new Date().toISOString()
    };
  }
}
```

### 4. Update RAG Service Methods

#### indexRepository method:
```typescript
async indexRepository(repoData: {
  repositoryPath: string;
  filePatterns?: string[];
  excludePatterns?: string[];
  metadata?: Record<string, any>;
}): Promise<{ indexedFiles: number; errors: string[] }> {
  try {
    this.logger.log(`Indexing repository: ${repoData.repositoryPath}`);

    // Create authenticated metadata
    const authenticatedMetadata = await this.createAuthenticatedMetadata({
      ...repoData.metadata,
      operation: 'repository_index',
      repositoryPath: repoData.repositoryPath
    });

    const documents = await this.processRepository({
      ...repoData,
      metadata: authenticatedMetadata
    });
    
    await this.ragEngine.addDocuments(documents);

    this.logger.log(`Successfully indexed ${documents.length} documents`);
    return {
      indexedFiles: documents.length,
      errors: [],
    };
  } catch (error) {
    this.logger.error('Repository indexing failed', error);
    return {
      indexedFiles: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}
```

#### indexFile method:
```typescript
async indexFile(fileData: {
  filePath: string;
  content?: string;
  metadata?: Record<string, any>;
}): Promise<void> {
  try {
    // Create authenticated metadata
    const authenticatedMetadata = await this.createAuthenticatedMetadata({
      ...fileData.metadata,
      operation: 'file_index',
      filePath: fileData.filePath
    });

    const document = await this.processFile({
      ...fileData,
      metadata: authenticatedMetadata
    });
    
    await this.ragEngine.addDocuments([document]);

    this.logger.log(`Successfully indexed file: ${fileData.filePath}`);
  } catch (error) {
    this.logger.error(`Failed to index file: ${fileData.filePath}`, error);
    throw error;
  }
}
```

#### deleteDocuments method:
```typescript
async deleteDocuments(documentIds: string[]): Promise<void> {
  try {
    // Log deletion with authenticated user
    const user = await this.authService.getCurrentUser();
    
    await this.ragEngine.deleteDocuments(documentIds);
    
    this.logger.log(`User ${user.id} deleted ${documentIds.length} documents`);
  } catch (error) {
    this.logger.error('Document deletion failed', error);
    throw error;
  }
}
```

## Security Considerations

1. **Authorization**: Ensure users can only delete/index documents they have access to
2. **Audit Trail**: Log all operations with user context for audit purposes
3. **Rate Limiting**: Apply per-user rate limits for indexing operations
4. **Data Isolation**: Ensure users can only search documents they have access to

## Implementation Priority

1. **High Priority**: Basic user authentication integration
2. **Medium Priority**: Authorization checks for document operations
3. **Low Priority**: Advanced audit and isolation features

## Testing

Add tests for authenticated operations:

```typescript
describe('RAG Service Authentication', () => {
  it('should include authenticated user metadata', async () => {
    // Mock auth service
    const mockUser = { id: 'user123', role: 'developer' };
    jest.spyOn(authService, 'getCurrentUser').mockResolvedValue(mockUser);
    
    const result = await service.indexFile({
      filePath: 'test.ts',
      content: 'test content'
    });
    
    // Verify user metadata is included
    expect(result.metadata.createdBy).toBe('user123');
  });
});
```