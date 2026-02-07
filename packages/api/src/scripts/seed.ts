import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

async function seed() {
  const configService = new ConfigService();
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: configService.get('database.url'),
      },
    },
  });

  console.log('🌱 Starting database seeding...');

  try {
    // Create admin user
    const adminUser = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {},
      create: {
        email: 'admin@example.com',
        name: 'Administrator',
        password: '$2b$10$example.hash.change-this', // Change this
        role: 'ADMIN',
        isActive: true,
        emailVerified: true,
      },
    });

    console.log(`✅ Created admin user: ${adminUser.email}`);

    // Create sample project
    const sampleProject = await prisma.project.upsert({
      where: { name: 'Sample Project' },
      update: {},
      create: {
        name: 'Sample Project',
        description: 'A sample project for testing the Claude Agent Platform',
        settings: {
          theme: 'dark',
          notifications: true,
        },
        createdById: adminUser.id,
      },
    });

    console.log(`✅ Created sample project: ${sampleProject.name}`);

    // Create sample agent
    const sampleAgent = await prisma.agent.upsert({
      where: { name: 'code-analyzer' },
      update: {},
      create: {
        name: 'code-analyzer',
        type: 'TASK_EXECUTOR',
        version: '1.0.0',
        config: {
          timeout: 300000,
          capabilities: ['code-analysis', 'requirements-generation'],
          environment: {
            NODE_ENV: 'production',
          },
        },
        resourceQuota: {
          maxMemory: 512,
          maxCpu: 100,
          maxTokens: 10000,
        },
        healthStatus: 'HEALTHY',
      },
    });

    console.log(`✅ Created sample agent: ${sampleAgent.name}`);

    // Create sample API key
    const sampleApiKey = await prisma.apiKey.upsert({
      where: { name: 'Default API Key' },
      update: {},
      create: {
        name: 'Default API Key',
        keyHash: 'sample.key.hash.change.this', // Change this
        permissions: ['agents:read', 'tasks:write', 'projects:read'],
        rateLimitPerMinute: 1000,
        isActive: true,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        createdById: adminUser.id,
      },
    });

    console.log(`✅ Created sample API key: ${sampleApiKey.name}`);

    // Create sample token budget
    await prisma.tokenBudget.upsert({
      where: { userId: adminUser.id },
      update: {},
      create: {
        userId: adminUser.id,
        monthlyLimit: 100.0,
        currentUsage: 0.0,
        alertThreshold: 0.8,
        alertEmails: ['admin@example.com'],
        optimizations: {
          strategies: ['summarization', 'compression'],
          enabled: true,
        },
      },
    });

    console.log(`✅ Created token budget for admin user`);

    console.log('🎉 Database seeding completed successfully!');
  } catch (error) {
    console.error('❌ Error during seeding:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seed()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    process.exit(0);
  });
