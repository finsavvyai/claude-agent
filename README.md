# Claude Agent Platform

[![CI Pipeline](https://github.com/claude-agent/platform/actions/workflows/ci.yml/badge.svg)](https://github.com/claude-agent/platform/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/claude-agent/platform/branch/main/graph/badge.svg)](https://codecov.io/gh/claude-agent/platform)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20+-green.svg)](https://nodejs.org/)

A comprehensive multi-purpose AI agent platform that combines **Luna Agents** for development lifecycle management with **Nexa Backend** for on-device AI inference. This platform enables intelligent automation across the entire software development lifecycle with advanced features including RAG integration, multi-platform app generation, and cloud-native deployment.

## ✨ Features

### 🤖 Luna Agents - AI-Powered Development Lifecycle
- **Requirements Analysis Agent**: Automatically analyze codebases and generate comprehensive requirements
- **Design Architecture Agent**: Create technical designs and architecture diagrams
- **Code Review Agent**: Perform automated code reviews with quality and security checks
- **Testing Agent**: Generate and execute comprehensive test suites
- **Deployment Agent**: Automate deployment processes with zero-downtime strategies

### 🧠 Nexa Backend - On-Device AI Inference
- **Multi-Backend Support**: CUDA, Metal, Vulkan, NPU, and CPU backends
- **Model Format Compatibility**: GGUF, MLX, and native .nexa format support
- **OpenAI-Compatible API**: Drop-in replacement for OpenAI API
- **RAG Integration**: Advanced context retrieval and token optimization
- **Edge Computing**: Cloudflare Workers deployment for global distribution

### 📱 Multi-Platform Generation
- **OpenAI App Generator**: Create ChatGPT applications from existing codebases
- **Google Agent Generator**: Build Google Assistant actions and voice interfaces
- **React Native Generator**: Generate cross-platform mobile apps with Expo
- **Swift Native Generator**: Create native iOS/iPadOS/macOS applications

### 🎨 Modern UI Design System
- **Apple HIG Compliance**: Complete adherence to Apple Human Interface Guidelines
- **Floating Components**: Advanced floating panels and filter systems
- **Accessibility**: Full WCAG 2.1 AA compliance with VoiceOver support
- **Dark/Light Mode**: Automatic theme switching with system preferences

### ☁️ Cloud-Native Infrastructure
- **Cloudflare Workers**: Global edge deployment with automatic scaling
- **Complete Migration**: One-command migration to Cloudflare ecosystem
- **Multi-Environment**: Development, staging, and production environments
- **Monitoring**: Comprehensive observability with Prometheus and Grafana

## 🚀 Quick Start

### Prerequisites

- **Node.js** 20+ and **pnpm** 8+
- **Docker** and **Docker Compose**
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/claude-agent/platform.git
   cd platform
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Start development environment**
   ```bash
   # Start all services with Docker Compose
   pnpm run docker:up
   
   # Or start development servers
   pnpm run dev
   ```

4. **Setup environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys and configuration
   ```

5. **Run database migrations**
   ```bash
   pnpm run migrate
   pnpm run seed
   ```

### Development URLs

- **Web Application**: http://localhost:3000
- **API Server**: http://localhost:3001
- **Luna Agents**: http://localhost:3002
- **API Documentation**: http://localhost:3001/docs
- **Database Studio**: http://localhost:5555
- **RabbitMQ Management**: http://localhost:15672

## 🏗️ Project Structure

```
claude-agent-platform/
├── packages/                    # Core packages
│   ├── api/                    # NestJS API server
│   ├── database/               # Prisma database schema
│   ├── cache/                  # Redis caching layer
│   ├── monitoring/             # Observability and metrics
│   ├── shared/                 # Shared utilities and types
│   ├── testing/                # Testing utilities
│   └── types/                  # TypeScript type definitions
├── apps/                       # Applications
│   ├── web/                    # Next.js web application
│   ├── cli/                    # Command-line interface
│   └── deployment/             # Deployment tools
├── tools/                      # Development tools
│   ├── cli/                    # CLI tooling
│   ├── web/                    # Web-based tools
│   └── deployment/             # Deployment automation
├── luna-agents/                # Luna agents ecosystem
│   ├── .claude-plugin/         # Claude Code plugin
│   ├── mcp-servers/           # MCP server implementations
│   └── agents/                # Individual agent implementations
├── infrastructure/             # Infrastructure as code
├── docs/                      # Documentation
└── tests/                     # End-to-end and integration tests
```

## 📚 Available Scripts

### Development
```bash
pnpm run dev              # Start all development services
pnpm run dev:api          # Start API server only
pnpm run dev:agents       # Start Luna agents only
pnpm run dev:web          # Start web application only
```

### Building
```bash
pnpm run build            # Build all packages and applications
pnpm run build:packages   # Build packages only
pnpm run build:apps       # Build applications only
pnpm run build:web        # Build web application only
```

### Testing
```bash
pnpm run test             # Run all tests
pnpm run test:unit        # Run unit tests
pnpm run test:integration # Run integration tests
pnpm run test:e2e         # Run end-to-end tests
pnpm run test:coverage    # Run tests with coverage
```

### Database
```bash
pnpm run migrate          # Run database migrations
pnpm run migrate:dev      # Run migrations in development
pnpm run db:studio        # Open Prisma Studio
pnpm run seed             # Seed database with sample data
```

### Docker
```bash
pnpm run docker:up        # Start all services with Docker
pnpm run docker:down      # Stop all Docker services
pnpm run docker:logs      # View Docker logs
```

### Code Quality
```bash
pnpm run lint             # Run ESLint
pnpm run lint:fix         # Fix ESLint issues
pnpm run format           # Format code with Prettier
pnpm run format:check     # Check code formatting
pnpm run type-check       # Run TypeScript type checking
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL="postgresql://claude_user:claude_password@localhost:5432/claude_agent"

# Redis
REDIS_URL="redis://:redis_password@localhost:6379"

# Message Queue
RABBITMQ_URL="amqp://claude_user:claude_password@localhost:5672/claude_vhost"

# AI Services
OPENAI_API_KEY="your-openai-api-key"
ANTHROPIC_API_KEY="your-anthropic-api-key"
HUGGINGFACE_API_KEY="your-huggingface-api-key"

# JWT
JWT_SECRET="your-jwt-secret"
JWT_REFRESH_SECRET="your-jwt-refresh-secret"

# Application
NODE_ENV="development"
PORT="3001"
HOST="0.0.0.0"

# External Services
ELASTICSEARCH_URL="http://localhost:9200"
QDRANT_URL="http://localhost:6333"
MINIO_URL="http://localhost:9000"
```

### Package Manager

This project uses **pnpm** for package management with workspace configuration. The `pnpm-workspace.yaml` file includes a package catalog for consistent dependency management across all packages.

## 🧪 Testing

### Test Structure

- **Unit Tests**: Jest-based unit tests for individual components
- **Integration Tests**: API and database integration testing
- **End-to-End Tests**: Playwright-based UI automation tests
- **Performance Tests**: Load testing and performance benchmarking

### Running Tests

```bash
# Run all tests
pnpm run test

# Run specific test types
pnpm run test:unit
pnpm run test:integration
pnpm run test:e2e

# Run tests with coverage
pnpm run test:coverage

# Watch mode for development
pnpm run test:unit -- --watch
```

### Coverage Requirements

- **Minimum Coverage**: 80% across all packages
- **Critical Paths**: 95% coverage for core functionality
- **Integration Coverage**: 90% for API endpoints

## 🚀 Deployment

### Development Deployment

```bash
# Using Docker Compose
docker-compose -f docker-compose.yml -f docker-compose.dev.yml up -d

# Or using pnpm scripts
pnpm run docker:up
```

### Production Deployment

#### Cloudflare Workers (Recommended)

```bash
# Deploy to Cloudflare Workers
pnpm run deploy:production

# Or migrate entire infrastructure
pnpm run luna-cloudflare
```

#### Traditional Deployment

```bash
# Build for production
pnpm run build

# Start production server
pnpm run start
```

### Environment-Specific Configurations

- **Development**: Hot reload, debug logging, local services
- **Staging**: Production-like environment for testing
- **Production**: Optimized for performance and security

## 📊 Monitoring and Observability

### Health Checks

- **API Health**: `/api/health` endpoint
- **Database Health**: Connection and query performance
- **Cache Health**: Redis connectivity and performance
- **Message Queue Health**: RabbitMQ status and queue depth

### Metrics

- **Application Metrics**: Request latency, error rates, throughput
- **Infrastructure Metrics**: CPU, memory, disk, network usage
- **Business Metrics**: User engagement, feature usage, conversion rates

### Logging

- **Structured Logging**: JSON format with correlation IDs
- **Log Levels**: Debug, Info, Warn, Error, Fatal
- **Log Aggregation**: Centralized logging with Elasticsearch
- **Log Retention**: Configurable retention policies

## 🔒 Security

### Authentication & Authorization

- **JWT Tokens**: Access and refresh token rotation
- **Multi-Factor Authentication**: Optional 2FA support
- **Role-Based Access Control**: Granular permissions
- **API Keys**: For external integrations

### Data Protection

- **Encryption at Rest**: AES-256 encryption
- **Encryption in Transit**: TLS 1.3
- **Data Anonymization**: PII protection and GDPR compliance
- **Secure Storage**: HashiCorp Vault integration

### Security Best Practices

- **Input Validation**: Comprehensive input sanitization
- **SQL Injection Prevention**: Parameterized queries
- **XSS Protection**: Content Security Policy
- **Rate Limiting**: DDoS protection
- **Security Headers**: OWASP recommended headers

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- **TypeScript**: Strict mode with comprehensive type coverage
- **ESLint**: Enforced code quality and style rules
- **Prettier**: Consistent code formatting
- **Husky**: Pre-commit hooks for quality gates
- **Conventional Commits**: Standardized commit messages

### Pull Request Process

- **Tests**: All tests must pass
- **Coverage**: Maintain 80%+ test coverage
- **Documentation**: Update relevant documentation
- **Review**: At least one maintainer approval required

## 📖 Documentation

- **[API Documentation](docs/api.md)**: Complete API reference
- **[Architecture Guide](docs/architecture.md)**: System architecture and design
- **[Agent Development](docs/agents.md)**: Building custom agents
- **[Deployment Guide](docs/deployment.md)**: Production deployment
- **[Troubleshooting](docs/troubleshooting.md)**: Common issues and solutions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Claude](https://claude.ai)**: AI assistant for development assistance
- **[NestJS](https://nestjs.com/)**: Progressive Node.js framework
- **[Prisma](https://www.prisma.io/)**: Next-generation ORM
- **[Cloudflare](https://www.cloudflare.com/)**: Edge computing platform
- **[OpenAI](https://openai.com/)**: AI model provider
- **[Anthropic](https://anthropic.com/)**: AI research company

## 📞 Support

- **GitHub Issues**: [Report bugs and request features](https://github.com/claude-agent/platform/issues)
- **Discussions**: [Community discussions and Q&A](https://github.com/claude-agent/platform/discussions)
- **Documentation**: [Complete documentation](https://claude-agent.dev/docs)
- **Email**: support@claude-agent.dev

## 🗺️ Roadmap

### Version 1.0 (Current)
- [x] Core agent management system
- [x] Basic task execution framework
- [x] Multi-platform app generation
- [x] Cloudflare Workers integration
- [x] Apple HIG design system

### Version 1.1 (Q1 2025)
- [ ] Advanced RAG integration
- [ ] Token optimization engine
- [ ] Enhanced monitoring dashboard
- [ ] Mobile app generators
- [ ] Google agent generator

### Version 1.2 (Q2 2025)
- [ ] AI provider abstraction
- [ ] Advanced security features
- [ ] Performance optimization
- [ ] Multi-tenant support
- [ ] Advanced analytics

### Version 2.0 (Q3 2025)
- [ ] Distributed agent network
- [ ] Advanced workflow automation
- [ ] Enterprise features
- [ ] Advanced AI capabilities
- [ ] Global marketplace

---

**Built with ❤️ by the Claude Agent Platform team**# claude-agent
