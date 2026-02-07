-- Claude Agent Platform - Development Seed Data
-- Create initial admin user and basic data

-- Insert default admin user
INSERT INTO auth.users (
    id,
    email,
    username,
    password_hash,
    email_verified,
    role,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'admin@claude-agent.com',
    'admin',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtgtx6gK9m', -- password: admin123
    true,
    'admin',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Insert default system user for automated operations
INSERT INTO auth.users (
    id,
    email,
    username,
    password_hash,
    email_verified,
    role,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'system@claude-agent.com',
    'system',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBdXwtgtx6gK9m', -- system user
    true,
    'system',
    NOW(),
    NOW()
) ON CONFLICT (email) DO NOTHING;

-- Create demo project
INSERT INTO platform.projects (
    id,
    name,
    description,
    owner_id,
    settings,
    created_at,
    updated_at
) VALUES (
    uuid_generate_v4(),
    'Claude Agent Platform',
    'Multi-purpose AI agent platform for development lifecycle management',
    (SELECT id FROM auth.users WHERE username = 'admin'),
    jsonb_build_object(
        'defaultBranch', 'main',
        'codingStandards', jsonb_build_object('linting', true, 'testing', true),
        'cicdConfig', jsonb_build_object('enabled', true, 'environment', 'development'),
        'securityPolicies', jsonb_build_array('code-review', 'security-scan')
    ),
    NOW(),
    NOW()
) ON CONFLICT (name) DO NOTHING;

-- Insert agent configurations
INSERT INTO agents.agent_types (
    id,
    name,
    type,
    description,
    capabilities,
    configuration,
    created_at,
    updated_at
) VALUES
    (
        uuid_generate_v4(),
        'Requirements Analyzer',
        'requirements-analyzer',
        'Analyzes existing codebases and generates comprehensive requirements specifications',
        ARRAY['code-analysis', 'requirement-generation', 'stakeholder-elicitation'],
        jsonb_build_object('maxFileSize', '100MB', 'supportedLanguages', ARRAY['javascript', 'typescript', 'python', 'java', 'go']),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(),
        'Design Architect',
        'design-architect',
        'Creates detailed architecture specifications and component designs',
        ARRAY['architecture-design', 'component-specification', 'api-design'],
        jsonb_build_object('diagramFormats', ARRAY['plantuml', 'mermaid'], 'designPatterns', ARRAY['mvc', 'microservices', 'serverless']),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(),
        'Task Planner',
        'task-planner',
        'Breaks down designs into actionable implementation tasks with dependency tracking',
        ARRAY['task-decomposition', 'dependency-analysis', 'time-estimation'],
        jsonb_build_object('estimationMethod', 'story-points', 'maxTaskDuration', '40h'),
        NOW(),
        NOW()
    )
ON CONFLICT (type) DO NOTHING;

-- Insert monitoring configurations
INSERT INTO monitoring.metrics (
    id,
    name,
    type,
    description,
    query,
    thresholds,
    enabled,
    created_at,
    updated_at
) VALUES
    (
        uuid_generate_v4(),
        'API Response Time',
        'histogram',
        'API response time percentiles',
        'histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))',
        jsonb_build_object('warning', 1.0, 'critical', 2.0),
        true,
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(),
        'Error Rate',
        'counter',
        'Rate of HTTP 5xx errors',
        'sum(rate(http_requests_total{status=~"5.."}[5m]))',
        jsonb_build_object('warning', 0.05, 'critical', 0.1),
        true,
        NOW(),
        NOW()
    )
ON CONFLICT (name) DO NOTHING;

-- Create sample agent workflow templates
INSERT INTO agents.workflow_templates (
    id,
    name,
    description,
    agent_types,
    configuration,
    created_at,
    updated_at
) VALUES
    (
        uuid_generate_v4(),
        'Full Development Lifecycle',
        'Complete AI-powered development workflow from requirements to deployment',
        ARRAY['requirements-analyzer', 'design-architect', 'task-planner', 'task-executor', 'code-review', 'testing-validation', 'deployment', 'documentation', 'monitoring-observability'],
        jsonb_build_object(
            'timeout', '72h',
            'parallelAgents', 2,
            'autoRetry', true,
            'maxRetries', 3
        ),
        NOW(),
        NOW()
    ),
    (
        uuid_generate_v4(),
        'Code Review Workflow',
        'Automated code quality assessment and security checks',
        ARRAY['code-review', 'testing-validation'],
        jsonb_build_object(
            'timeout', '4h',
            'parallelAgents', 1,
            'securityScan', true,
            'performanceAnalysis', true
        ),
        NOW(),
        NOW()
    )
ON CONFLICT (name) DO NOTHING;

COMMIT;
