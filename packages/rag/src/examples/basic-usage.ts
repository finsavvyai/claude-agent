/**
 * Basic RAG Usage Examples
 *
 * This file demonstrates how to use the RAG system for common use cases.
 */

import { RAGFactory, QuickRAG } from '../factory';
import { RAGEngineConfig, ProcessedDocument } from '../interfaces';

// Example 1: Quick setup with OpenAI + Pinecone
export async function quickSetupExample() {
  console.log('🚀 Quick Setup Example');

  try {
    // Initialize RAG engine with OpenAI and Pinecone
    const ragEngine = await QuickRAG.openaiPinecone({
      openaiApiKey: process.env.OPENAI_API_KEY!,
      pineconeApiKey: process.env.PINECONE_API_KEY!,
      pineconeEnvironment: 'us-west1-gcp',
      pineconeIndex: 'my-rag-index'
    });

    // Add some documents
    const documents = [
      {
        content: `Artificial Intelligence (AI) is a branch of computer science that aims to create intelligent machines that can perform tasks that typically require human intelligence. These tasks include learning, reasoning, problem-solving, perception, and language understanding.`,
        title: 'Introduction to AI',
        source: 'ai-textbook.pdf'
      },
      {
        content: `Machine Learning is a subset of AI that focuses on the development of computer programs that can access data and use it to learn for themselves. The process of learning begins with observations or data, such as examples, direct experience, or instruction.`,
        title: 'Machine Learning Fundamentals',
        source: 'ml-guide.pdf'
      }
    ];

    // Process and add documents
    const processedDocs: ProcessedDocument[] = [];
    for (const doc of documents) {
      const processed = await ragEngine.query({ text: doc.content });
      processedDocs.push(processed as any); // Simplified for example
    }

    // Query the RAG system
    const query = 'What is the difference between AI and Machine Learning?';
    const response = await ragEngine.query({ text: query });

    console.log('Query:', query);
    console.log('Response:', response.response);
    console.log('Sources:', response.sources.length);
    console.log('Confidence:', response.confidence);

  } catch (error) {
    console.error('Error in quick setup example:', error);
  }
}

// Example 2: Advanced configuration
export async function advancedConfigurationExample() {
  console.log('⚙️ Advanced Configuration Example');

  // Create a custom RAG configuration
  const config: RAGEngineConfig = {
    embeddingService: {
      provider: 'openai',
      apiKey: process.env.OPENAI_API_KEY!,
      model: 'text-embedding-ada-002',
      dimensions: 1536,
      batchSize: 100,
      cacheSettings: {
        enabled: true,
        maxSize: 1000,
        ttl: 3600000 // 1 hour
      }
    },
    vectorDatabase: {
      provider: 'pinecone',
      apiKey: process.env.PINECONE_API_KEY!,
      environment: 'us-west1-gcp',
      indexName: 'advanced-rag',
      namespace: 'production',
      dimensions: 1536,
      metric: 'cosine'
    },
    documentProcessing: {
      chunkSize: 1000,
      chunkOverlap: 200,
      minChunkSize: 200,
      maxChunkSize: 2000,
      supportedLanguages: ['en', 'es', 'fr', 'de']
    },
    contextBuilding: {
      maxTokens: 4000,
      defaultStrategy: 'semantic_relevance',
      defaultCompression: 'none',
      optimizeLayout: true
    },
    responseGeneration: {
      llmProvider: 'openai',
      model: 'gpt-3.5-turbo',
      temperature: 0.7,
      maxTokens: 1000
    },
    maxRetrievedDocuments: 15,
    maxContextLength: 4000,
    defaultRankingAlgorithm: 'semantic',
    maxConversationHistory: 10
  };

  try {
    const ragEngine = await RAGFactory.createRAGEngine(config);

    // Advanced query with options
    const response = await ragEngine.query({
      text: 'Explain the applications of AI in healthcare',
      options: {
        maxResults: 5,
        rankingAlgorithm: 'bm25',
        diversifyResults: true,
        minRelevanceScore: 0.7,
        skipCache: false
      },
      filters: {
        documentTypes: ['academic', 'research'],
        dateRange: {
          start: new Date('2023-01-01'),
          end: new Date()
        },
        language: 'en'
      }
    });

    console.log('Advanced Query Response:', response.response);
    console.log('Metrics:', response.metrics);

  } catch (error) {
    console.error('Error in advanced configuration example:', error);
  }
}

// Example 3: Document management
export async function documentManagementExample() {
  console.log('📚 Document Management Example');

  const ragEngine = await QuickRAG.openaiPinecone({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    pineconeApiKey: process.env.PINECONE_API_KEY!
  });

  try {
    // Prepare documents with metadata
    const documents = [
      {
        content: `The transformer architecture, introduced in the paper "Attention Is All You Need" by Vaswani et al. in 2017, revolutionized natural language processing. It uses self-attention mechanisms to process input data in parallel, making it highly efficient and scalable.`,
        title: 'Transformer Architecture',
        source: 'deep-learning-book.pdf',
        metadata: {
          authors: ['Vaswani, A.', 'Shazeer, N.', 'Parmar, N.'],
          publicationYear: 2017,
          documentType: 'academic',
          language: 'en',
          tags: ['transformers', 'attention', 'nlp', 'deep-learning']
        }
      },
      {
        content: `BERT (Bidirectional Encoder Representations from Transformers) is a language representation model developed by Google in 2018. It is designed to pre-train deep bidirectional representations from unlabeled text by jointly conditioning on both left and right context in all layers.`,
        title: 'BERT: Bidirectional Transformers',
        source: 'google-ai-blog.pdf',
        metadata: {
          authors: ['Devlin, J.', 'Chang, M.', 'Lee, K.'],
          publicationYear: 2018,
          documentType: 'research',
          language: 'en',
          tags: ['bert', 'transformers', 'nlp', 'pretraining']
        }
      }
    ];

    // Process documents
    const processedDocs = [];
    for (const doc of documents) {
      const processed = await ragEngine.query({ text: doc.content });
      processedDocs.push(processed as any);
    }

    // Add documents to the RAG system
    await ragEngine.addDocuments(processedDocs);

    // Query with conversation history
    const conversation = [
      'What are transformer models?',
      'How does BERT use transformers?'
    ];

    let response1 = await ragEngine.query({ text: conversation[0] });
    console.log('Q1:', conversation[0]);
    console.log('A1:', response1.response);

    let response2 = await ragEngine.query({ text: conversation[1] });
    console.log('Q2:', conversation[1]);
    console.log('A2:', response2.response);

    // Get conversation history
    const history = ragEngine.getConversationHistory();
    console.log('Conversation History:', history.length, 'exchanges');

    // Get system statistics
    const stats = await ragEngine.getStatistics();
    console.log('System Statistics:', stats);

  } catch (error) {
    console.error('Error in document management example:', error);
  }
}

// Example 4: Contextual and multi-query search
export async function advancedSearchExample() {
  console.log('🔍 Advanced Search Example');

  const ragEngine = await QuickRAG.openaiPinecone({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    pineconeApiKey: process.env.PINECONE_API_KEY!
  });

  try {
    // Multi-query search
    const queries = [
      { text: 'transformer architecture' },
      { text: 'self-attention mechanism' },
      { text: 'neural network attention' }
    ];

    // Create a mock search engine for demonstration
    const searchResults = await Promise.all(
      queries.map(query => ragEngine.query(query))
    );

    console.log('Multi-query Results:');
    searchResults.forEach((result, index) => {
      console.log(`Query ${index + 1}: ${queries[index].text}`);
      console.log(`Response: ${result.response.substring(0, 100)}...`);
      console.log(`Sources: ${result.sources.length}`);
      console.log('---');
    });

    // Contextual search with conversation history
    const conversationHistory = [
      'I want to learn about deep learning',
      'What are neural networks?',
      'How do transformers work?'
    ];

    const contextualResponse = await ragEngine.query({
      text: 'What are the practical applications of transformers?',
      options: {
        useConversationHistory: true,
        maxResults: 3
      }
    });

    console.log('Contextual Search Response:', contextualResponse.response);

    // Find similar documents
    if (searchResults[0].sources.length > 0) {
      const similarDocs = await ragEngine.query({
        text: 'Find similar documents',
        options: {
          similarTo: searchResults[0].sources[0].id
        }
      });

      console.log('Similar Documents:', similarDocs.sources.length);
    }

  } catch (error) {
    console.error('Error in advanced search example:', error);
  }
}

// Example 5: Performance evaluation
export async function performanceEvaluationExample() {
  console.log('📊 Performance Evaluation Example');

  const ragEngine = await QuickRAG.openaiPinecone({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    pineconeApiKey: process.env.PINECONE_API_KEY!
  });

  try {
    // Define test queries with expected outcomes
    const testQueries = [
      {
        query: 'What is artificial intelligence?',
        expectedAnswer: 'Should mention intelligent machines and human-like tasks',
        relevantDocuments: ['ai-intro', 'computer-science']
      },
      {
        query: 'How do transformers work?',
        expectedAnswer: 'Should mention attention mechanisms and parallel processing',
        relevantDocuments: ['transformers', 'attention', 'nlp']
      },
      {
        query: 'What are the applications of machine learning?',
        expectedAnswer: 'Should mention various ML applications and use cases',
        relevantDocuments: ['ml-applications', 'ai-uses']
      }
    ];

    // Evaluate performance
    const evaluation = await ragEngine.evaluatePerformance(testQueries);

    console.log('Performance Evaluation Results:');
    console.log(`Total Queries: ${evaluation.totalQueries}`);
    console.log(`Average Confidence: ${(evaluation.averageConfidence * 100).toFixed(1)}%`);
    console.log(`Average Response Time: ${evaluation.averageResponseTime.toFixed(0)}ms`);
    console.log(`Average Relevance Score: ${(evaluation.averageRelevanceScore * 100).toFixed(1)}%`);
    console.log(`Success Rate: ${(evaluation.successRate * 100).toFixed(1)}%`);
    console.log(`Hallucination Rate: ${(evaluation.hallucinationRate * 100).toFixed(1)}%`);

    // Detailed results
    console.log('\nDetailed Results:');
    evaluation.queryResults.forEach((result, index) => {
      console.log(`\nQuery ${index + 1}: ${result.query}`);
      console.log(`Response Length: ${result.response.length} characters`);
      console.log(`Confidence: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`Processing Time: ${result.processingTime}ms`);
      console.log(`Retrieved Documents: ${result.retrievedDocuments}`);
    });

  } catch (error) {
    console.error('Error in performance evaluation example:', error);
  }
}

// Example 6: Streaming responses
export async function streamingResponseExample() {
  console.log('🌊 Streaming Response Example');

  const ragEngine = await QuickRAG.openaiPinecone({
    openaiApiKey: process.env.OPENAI_API_KEY!,
    pineconeApiKey: process.env.PINECONE_API_KEY!
  });

  try {
    const query = 'Explain the evolution of artificial intelligence from its beginnings to modern times';

    console.log('Query:', query);
    console.log('Streaming Response:');

    // Note: This would require implementing streaming in the response generator
    // For now, we'll simulate it with a regular response
    const response = await ragEngine.query({ text: query });

    // Simulate streaming by printing chunks
    const chunks = response.response.match(/[^.!?]+[.!?]+/g) || [response.response];

    for (const chunk of chunks) {
      process.stdout.write(chunk);
      await new Promise(resolve => setTimeout(resolve, 200)); // Simulate streaming delay
    }

    console.log('\n\nComplete Response Stats:');
    console.log(`Total Characters: ${response.response.length}`);
    console.log(`Confidence: ${(response.confidence * 100).toFixed(1)}%`);
    console.log(`Sources Used: ${response.sources.length}`);
    console.log(`Processing Time: ${response.metadata.processingTime}ms`);

  } catch (error) {
    console.error('Error in streaming response example:', error);
  }
}

// Example runner
export async function runAllExamples() {
  console.log('🎯 Running All RAG Examples\n');

  const examples = [
    { name: 'Quick Setup', fn: quickSetupExample },
    { name: 'Advanced Configuration', fn: advancedConfigurationExample },
    { name: 'Document Management', fn: documentManagementExample },
    { name: 'Advanced Search', fn: advancedSearchExample },
    { name: 'Performance Evaluation', fn: performanceEvaluationExample },
    { name: 'Streaming Response', fn: streamingResponseExample }
  ];

  for (const example of examples) {
    try {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Running: ${example.name}`);
      console.log('='.repeat(50));

      await example.fn();

      console.log(`✅ ${example.name} completed successfully`);
    } catch (error) {
      console.error(`❌ ${example.name} failed:`, error);
    }

    // Add delay between examples
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n🎉 All examples completed!');
}

// Run examples if this file is executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
