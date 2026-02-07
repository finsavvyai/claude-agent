/**
 * Weaviate Vector Database Provider
 * Implementation for Weaviate vector database service
 */

import { VectorDatabase, Document, VectorQuery, SearchResult, IndexOptions, SearchOptions, IndexStats, IndexInfo, FilterExpression } from '../interfaces';
import { WeaviateClient, ApiKey } from 'weaviate-ts-client';
import { logger } from '../utils/logger';

export class WeaviateProvider implements VectorDatabase {
  private client: WeaviateClient | null = null;
  private config: any;
  private isConnected = false;

  constructor(config: any) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      this.client = new WeaviateClient({
        scheme: this.config.scheme || 'https',
        host: this.config.host,
        apiKey: new ApiKey(this.config.apiKey),
        headers: this.config.headers,
      });

      // Test connection
      await this.client.misc.getMeta();

      this.isConnected = true;
      logger.info('Successfully connected to Weaviate');
    } catch (error) {
      logger.error('Failed to connect to Weaviate:', error);
      throw new Error(`Weaviate connection failed: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.client = null;
    this.isConnected = false;
    logger.info('Disconnected from Weaviate');
  }

  async createIndex(indexName: string, dimension: number, options: IndexOptions = {}): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      // In Weaviate, we create a class instead of an index
      const classConfig = {
        class: indexName,
        description: `Vector index for ${indexName}`,
        vectorizer: options.vectorizer || 'none',
        moduleConfig: options.moduleConfig || {},
        properties: this.generateProperties(options.metadataConfig),
      };

      await this.client.schema.classCreator().withClass(classConfig).do();

      logger.info(`Successfully created Weaviate class: ${indexName}`);
    } catch (error) {
      logger.error(`Failed to create Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async indexDocuments(indexName: string, documents: Document[]): Promise<string[]> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      const batchSize = this.config.batchSize || 100;
      const documentIds: string[] = [];

      for (let i = 0; i < documents.length; i += batchSize) {
        const batch = documents.slice(i, i + batchSize);
        const objects = batch.map(doc => this.createWeaviateObject(doc, indexName));

        const result = await this.client.batch.objectsBatcher().withObjects(objects).do();

        if (result.errors) {
          logger.warn('Some objects failed to index:', result.errors);
        }

        const batchIds = batch.map(doc => doc.id);
        documentIds.push(...batchIds);
      }

      logger.info(`Successfully indexed ${documents.length} documents in Weaviate class: ${indexName}`);
      return documentIds;
    } catch (error) {
      logger.error(`Failed to index documents in Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async search(indexName: string, query: VectorQuery, options: SearchOptions = {}): Promise<SearchResult[]> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      let builder = this.client.graphql
        .get()
        .withClassName(indexName)
        .withFields(this.generateQueryFields(options.includeMetadata))
        .withNearVector({
          vector: query.vector,
          certainty: options.minScore || 0.7,
        });

      // Add filter if provided
      if (options.filter || query.filter) {
        builder = builder.withWhere(this.buildWeaviateFilter(options.filter || query.filter));
      }

      // Add limit
      const limit = query.topK || 10;
      builder = builder.withLimit(limit);

      const response = await builder.do();

      const results: SearchResult[] = response.data.Get[indexName].map((item: any, index: number) => ({
        document: {
          id: item._additional.id,
          content: item.content || '',
          metadata: this.extractMetadata(item),
          embedding: item._additional?.vector,
          source: item.source || 'unknown',
          createdAt: new Date(item.createdAt || Date.now()),
          updatedAt: new Date(item.updatedAt || Date.now()),
        },
        score: item._additional?.certainty || 0,
        rank: index + 1,
        metadata: item._additional,
      }));

      return results;
    } catch (error) {
      logger.error(`Failed to search Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async deleteDocument(indexName: string, documentId: string): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      await this.client.data
        .deleter()
        .withClassName(indexName)
        .withId(documentId)
        .do();

      logger.info(`Successfully deleted document ${documentId} from Weaviate class: ${indexName}`);
    } catch (error) {
      logger.error(`Failed to delete document ${documentId} from Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async updateDocument(indexName: string, document: Document): Promise<void> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      const weaviateObject = this.createWeaviateObject(document, indexName);

      await this.client.data
        .updater()
        .withClassName(indexName)
        .withId(document.id)
        .withProperties(weaviateObject.properties)
        .do();

      logger.info(`Successfully updated document ${document.id} in Weaviate class: ${indexName}`);
    } catch (error) {
      logger.error(`Failed to update document ${document.id} in Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async getIndexStats(indexName: string): Promise<IndexStats> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      const response = await this.client.graphql
        .aggregate()
        .withClassName(indexName)
        .withFields('meta { count }')
        .do();

      const documentCount = response.data.Aggregate[indexName][0]?.meta?.count || 0;

      return {
        documentCount,
        vectorCount: documentCount,
        indexSize: documentCount * 1000, // Rough estimate
        status: 'ready',
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error(`Failed to get stats for Weaviate class ${indexName}:`, error);
      throw error;
    }
  }

  async listIndices(): Promise<IndexInfo[]> {
    if (!this.client) {
      throw new Error('Weaviate client not connected');
    }

    try {
      const response = await this.client.schema.getter().do();

      return response.classes.map((cls: any) => ({
        name: cls.class,
        dimension: cls.moduleConfig?.['text2vec-openai']?.vectorizer?.model || cls.moduleConfig?.['generative-openai']?.model?.dimensions || 1536,
        documentCount: 0, // Would need separate query to get this
        status: 'ready',
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
    } catch (error) {
      logger.error('Failed to list Weaviate classes:', error);
      throw error;
    }
  }

  private createWeaviateObject(document: Document, className: string): any {
    const properties: any = {
      content: document.content,
      title: document.metadata.title,
      author: document.metadata.author,
      source: document.metadata.source,
      type: document.metadata.type,
      url: document.metadata.url,
      tags: document.metadata.tags || [],
      language: document.metadata.language,
      wordCount: document.metadata.wordCount,
      readingTime: document.metadata.readingTime,
      difficulty: document.metadata.difficulty,
      accessCount: document.metadata.accessCount || 0,
      lastAccessed: document.metadata.lastAccessed?.toISOString(),
      chunkIndex: document.chunkIndex,
      totalChunks: document.totalChunks,
      parentDocumentId: document.parentDocumentId,
      createdAt: document.createdAt.toISOString(),
      updatedAt: document.updatedAt.toISOString(),
    };

    // Add custom metadata
    if (document.metadata.custom) {
      Object.assign(properties, document.metadata.custom);
    }

    return {
      class: className,
      id: document.id,
      properties,
      vector: document.embedding,
    };
  }

  private generateQueryFields(includeMetadata?: boolean): string[] {
    const fields = [
      '_additional { id, vector, certainty }',
      'content',
      'title',
      'author',
      'source',
      'type',
      'url',
      'tags',
      'language',
      'wordCount',
      'readingTime',
      'difficulty',
      'accessCount',
      'lastAccessed',
      'createdAt',
      'updatedAt',
      'chunkIndex',
      'totalChunks',
      'parentDocumentId',
    ];

    if (includeMetadata !== false) {
      fields.push('...customMetadata');
    }

    return fields;
  }

  private generateProperties(metadataConfig?: Record<string, string>): any[] {
    const properties = [
      {
        name: 'content',
        dataType: ['text'],
        description: 'Document content',
      },
      {
        name: 'title',
        dataType: ['text'],
        description: 'Document title',
      },
      {
        name: 'author',
        dataType: ['text'],
        description: 'Document author',
      },
      {
        name: 'source',
        dataType: ['text'],
        description: 'Document source',
      },
      {
        name: 'type',
        dataType: ['text'],
        description: 'Document type',
      },
      {
        name: 'url',
        dataType: ['text'],
        description: 'Document URL',
      },
      {
        name: 'tags',
        dataType: ['text[]'],
        description: 'Document tags',
      },
      {
        name: 'language',
        dataType: ['text'],
        description: 'Document language',
      },
      {
        name: 'wordCount',
        dataType: ['int'],
        description: 'Word count',
      },
      {
        name: 'readingTime',
        dataType: ['int'],
        description: 'Reading time in minutes',
      },
      {
        name: 'difficulty',
        dataType: ['text'],
        description: 'Reading difficulty',
      },
      {
        name: 'accessCount',
        dataType: ['int'],
        description: 'Access count',
      },
      {
        name: 'lastAccessed',
        dataType: ['date'],
        description: 'Last access date',
      },
      {
        name: 'chunkIndex',
        dataType: ['int'],
        description: 'Chunk index',
      },
      {
        name: 'totalChunks',
        dataType: ['int'],
        description: 'Total chunks',
      },
      {
        name: 'parentDocumentId',
        dataType: ['text'],
        description: 'Parent document ID',
      },
      {
        name: 'createdAt',
        dataType: ['date'],
        description: 'Creation date',
      },
      {
        name: 'updatedAt',
        dataType: ['date'],
        description: 'Update date',
      },
    ];

    // Add custom metadata fields
    if (metadataConfig) {
      for (const [field, dataType] of Object.entries(metadataConfig)) {
        properties.push({
          name: field,
          dataType: Array.isArray(dataType) ? dataType : [dataType],
          description: `Custom field: ${field}`,
        });
      }
    }

    return properties;
  }

  private buildWeaviateFilter(filter: FilterExpression): any {
    if (!filter) return undefined;

    switch (filter.operator) {
      case 'AND':
        return {
          operator: 'And',
          operands: [
            ...filter.conditions.map(condition => this.buildConditionFilter(condition)),
            ...filter.filters?.map(f => this.buildWeaviateFilter(f)) || [],
          ],
        };

      case 'OR':
        return {
          operator: 'Or',
          operands: [
            ...filter.conditions.map(condition => this.buildConditionFilter(condition)),
            ...filter.filters?.map(f => this.buildWeaviateFilter(f)) || [],
          ],
        };

      case 'NOT':
        return {
          operator: 'Not',
          operands: [
            ...filter.conditions.map(condition => this.buildConditionFilter(condition)),
            ...filter.filters?.map(f => this.buildWeaviateFilter(f)) || [],
          ],
        };

      default:
        throw new Error(`Unsupported filter operator: ${filter.operator}`);
    }
  }

  private buildConditionFilter(condition: any): any {
    const filter: any = {
      path: [condition.field],
      operator: this.mapOperator(condition.operator),
    };

    if (condition.operator === 'in' || condition.operator === 'nin') {
      filter.valueText = Array.isArray(condition.value) ? condition.value : [condition.value];
    } else {
      filter.valueText = String(condition.value);
    }

    return filter;
  }

  private mapOperator(operator: string): string {
    const operatorMap: Record<string, string> = {
      'eq': 'Equal',
      'ne': 'NotEqual',
      'gt': 'GreaterThan',
      'gte': 'GreaterThanEqual',
      'lt': 'LessThan',
      'lte': 'LessThanEqual',
      'in': 'ContainsAny',
      'nin': 'NotContainsAny',
      'contains': 'Like',
      'regex': 'Like',
    };

    return operatorMap[operator] || 'Equal';
  }

  private extractMetadata(item: any): any {
    return {
      title: item.title,
      author: item.author,
      source: item.source,
      type: item.type,
      url: item.url,
      tags: item.tags,
      language: item.language,
      wordCount: item.wordCount,
      readingTime: item.readingTime,
      difficulty: item.difficulty,
      lastAccessed: item.lastAccessed ? new Date(item.lastAccessed) : undefined,
      custom: this.extractCustomMetadata(item),
    };
  }

  private extractCustomMetadata(item: any): Record<string, any> {
    const custom: Record<string, any> = {};

    const standardFields = [
      '_additional', 'content', 'title', 'author', 'source', 'type', 'url', 'tags',
      'language', 'wordCount', 'readingTime', 'difficulty', 'createdAt', 'updatedAt',
      'chunkIndex', 'totalChunks', 'parentDocumentId', 'accessCount', 'lastAccessed'
    ];

    for (const [key, value] of Object.entries(item)) {
      if (!standardFields.includes(key)) {
        custom[key] = value;
      }
    }

    return custom;
  }
}
