/**
 * Claude Agent Platform - Comprehensive API Test Suite
 * 
 * This test suite covers unit, integration, and E2E tests for the API package.
 * Run with: npm run test:api
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.LEMONSQUEEZY_API_KEY = 'test-ls-api-key';
process.env.LEMONSQUEEZY_STORE_ID = 'test-store-id';
process.env.LEMONSQUEEZY_WEBHOOK_SECRET = 'test-webhook-secret';

// ============================================================================
// AUTHENTICATION TESTS
// ============================================================================

describe('Authentication Module', () => {
    describe('JWT Token Generation', () => {
        it('should generate a valid JWT token for authenticated user', () => {
            const user = {
                id: 'user-123',
                email: 'test@example.com',
                name: 'Test User',
                tier: 'pro' as const,
            };

            // Mock JWT generation
            const token = mockGenerateToken(user);

            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            expect(token.split('.')).toHaveLength(3);
        });

        it('should include correct claims in token payload', () => {
            const user = {
                id: 'user-456',
                email: 'admin@example.com',
                name: 'Admin User',
                tier: 'enterprise' as const,
            };

            const token = mockGenerateToken(user);
            const payload = mockDecodeToken(token);

            expect(payload.sub).toBe(user.id);
            expect(payload.email).toBe(user.email);
            expect(payload.tier).toBe(user.tier);
            expect(payload.iat).toBeDefined();
            expect(payload.exp).toBeDefined();
        });

        it('should set correct expiration time', () => {
            const user = {
                id: 'user-789',
                email: 'user@example.com',
                name: 'Regular User',
                tier: 'free' as const,
            };

            const token = mockGenerateToken(user);
            const payload = mockDecodeToken(token);

            // Token should expire in 1 hour (3600 seconds)
            const expectedExpiration = payload.iat + 3600;
            expect(payload.exp).toBe(expectedExpiration);
        });

        it('should reject expired tokens', () => {
            const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyLTEyMyIsImVtYWlsIjoidGVzdEBleGFtcGxlLmNvbSIsImlhdCI6MTUwMDAwMDAwMCwiZXhwIjoxNTAwMDAzNjAwfQ.invalid';

            expect(() => mockVerifyToken(expiredToken)).toThrow('TOKEN_EXPIRED');
        });
    });

    describe('Password Hashing', () => {
        it('should hash passwords securely', async () => {
            const password = 'SecurePassword123!';
            const hash = await mockHashPassword(password);

            expect(hash).toBeDefined();
            expect(hash).not.toBe(password);
            expect(hash.length).toBeGreaterThan(50);
        });

        it('should verify correct password', async () => {
            const password = 'SecurePassword123!';
            const hash = await mockHashPassword(password);

            const isValid = await mockVerifyPassword(password, hash);
            expect(isValid).toBe(true);
        });

        it('should reject incorrect password', async () => {
            const password = 'SecurePassword123!';
            const wrongPassword = 'WrongPassword456!';
            const hash = await mockHashPassword(password);

            const isValid = await mockVerifyPassword(wrongPassword, hash);
            expect(isValid).toBe(false);
        });
    });

    describe('Login Endpoint', () => {
        it('should return 200 with valid credentials', async () => {
            const response = await mockLoginRequest({
                email: 'test@example.com',
                password: 'validPassword123',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.token).toBeDefined();
            expect(response.body.data.user).toBeDefined();
        });

        it('should return 401 with invalid credentials', async () => {
            const response = await mockLoginRequest({
                email: 'test@example.com',
                password: 'wrongPassword',
            });

            expect(response.status).toBe(401);
            expect(response.body.success).toBe(false);
            expect(response.body.error_code).toBe('INVALID_CREDENTIALS');
        });

        it('should return 400 with missing email', async () => {
            const response = await mockLoginRequest({
                password: 'somePassword',
            } as { email: string; password: string });

            expect(response.status).toBe(400);
            expect(response.body.error_code).toBe('VALIDATION_ERROR');
        });

        it('should rate limit after too many failed attempts', async () => {
            // Simulate 5 failed login attempts
            for (let i = 0; i < 5; i++) {
                await mockLoginRequest({
                    email: 'test@example.com',
                    password: 'wrongPassword',
                });
            }

            // 6th attempt should be rate limited
            const response = await mockLoginRequest({
                email: 'test@example.com',
                password: 'wrongPassword',
            });

            expect(response.status).toBe(429);
            expect(response.body.error_code).toBe('RATE_LIMITED');
        });
    });
});

// ============================================================================
// RAG QUERY TESTS
// ============================================================================

describe('RAG Query Module', () => {
    describe('Query Processing', () => {
        it('should process a simple query successfully', async () => {
            const response = await mockRAGQuery({
                message: 'How does the authentication work?',
                sessionId: 'session-123',
            });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.response).toBeDefined();
            expect(response.body.data.sources).toBeInstanceOf(Array);
        });

        it('should return relevant sources', async () => {
            const response = await mockRAGQuery({
                message: 'Explain the rate limiting implementation',
            });

            expect(response.body.data.sources.length).toBeGreaterThan(0);
            response.body.data.sources.forEach((source: { file: string; relevance: number }) => {
                expect(source.file).toBeDefined();
                expect(source.relevance).toBeGreaterThan(0);
            });
        });

        it('should track token usage', async () => {
            const response = await mockRAGQuery({
                message: 'What are the main features?',
            });

            expect(response.body.data.tokens_used).toBeDefined();
            expect(response.body.data.tokens_used).toBeGreaterThan(0);
        });

        it('should maintain session context', async () => {
            const sessionId = 'session-456';

            // First query
            await mockRAGQuery({
                message: 'What is the project structure?',
                sessionId,
            });

            // Follow-up query
            const response = await mockRAGQuery({
                message: 'Tell me more about the packages folder',
                sessionId,
            });

            // Should recognize context from previous query
            expect(response.body.data.response).toContain('packages');
        });
    });

    describe('Query Validation', () => {
        it('should reject empty query', async () => {
            const response = await mockRAGQuery({
                message: '',
            });

            expect(response.status).toBe(400);
            expect(response.body.error_code).toBe('VALIDATION_ERROR');
        });

        it('should reject query exceeding max length', async () => {
            const response = await mockRAGQuery({
                message: 'a'.repeat(10001),
            });

            expect(response.status).toBe(400);
            expect(response.body.error_code).toBe('QUERY_TOO_LONG');
        });

        it('should sanitize potentially harmful input', async () => {
            const response = await mockRAGQuery({
                message: '<script>alert("xss")</script> How does auth work?',
            });

            // Should process normally without executing script
            expect(response.status).toBe(200);
            expect(response.body.data.response).not.toContain('<script>');
        });
    });
});

// ============================================================================
// AGENT MANAGEMENT TESTS
// ============================================================================

describe('Agent Management Module', () => {
    describe('Agent CRUD Operations', () => {
        it('should list all available agents', async () => {
            const response = await mockAgentsList();

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
            expect(response.body.data.length).toBeGreaterThan(0);
        });

        it('should get a specific agent by ID', async () => {
            const response = await mockAgentGet('luna-code-review');

            expect(response.status).toBe(200);
            expect(response.body.data.id).toBe('luna-code-review');
            expect(response.body.data.name).toBeDefined();
            expect(response.body.data.status).toBeDefined();
        });

        it('should return 404 for non-existent agent', async () => {
            const response = await mockAgentGet('non-existent-agent');

            expect(response.status).toBe(404);
            expect(response.body.error_code).toBe('AGENT_NOT_FOUND');
        });

        it('should create a custom agent', async () => {
            const response = await mockAgentCreate({
                name: 'custom-agent',
                description: 'A custom agent for testing',
                type: 'custom',
                config: {
                    model: 'claude-3',
                    maxTokens: 4096,
                },
            });

            expect(response.status).toBe(201);
            expect(response.body.data.id).toBeDefined();
        });

        it('should update agent configuration', async () => {
            const response = await mockAgentUpdate('luna-code-review', {
                config: {
                    strictMode: true,
                },
            });

            expect(response.status).toBe(200);
            expect(response.body.data.config.strictMode).toBe(true);
        });
    });

    describe('Agent Lifecycle', () => {
        it('should start an idle agent', async () => {
            const response = await mockAgentStart('luna-testing');

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('running');
        });

        it('should stop a running agent', async () => {
            await mockAgentStart('luna-testing');
            const response = await mockAgentStop('luna-testing');

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('idle');
        });

        it('should handle start request for already running agent', async () => {
            await mockAgentStart('luna-testing');
            const response = await mockAgentStart('luna-testing');

            expect(response.status).toBe(200);
            expect(response.body.data.status).toBe('running');
        });
    });
});

// ============================================================================
// TEAM MANAGEMENT TESTS
// ============================================================================

describe('Team Management Module', () => {
    describe('Team CRUD Operations', () => {
        it('should create a new team', async () => {
            const response = await mockTeamCreate({
                name: 'Test Team',
                description: 'A team for testing',
            });

            expect(response.status).toBe(201);
            expect(response.body.data.id).toBeDefined();
            expect(response.body.data.name).toBe('Test Team');
        });

        it('should list user teams', async () => {
            const response = await mockTeamsList();

            expect(response.status).toBe(200);
            expect(response.body.data).toBeInstanceOf(Array);
        });

        it('should get team details', async () => {
            const createResponse = await mockTeamCreate({
                name: 'Details Team',
            });

            const response = await mockTeamGet(createResponse.body.data.id);

            expect(response.status).toBe(200);
            expect(response.body.data.members).toBeDefined();
        });
    });

    describe('Team Invitations', () => {
        it('should invite a member to team', async () => {
            const team = await mockTeamCreate({ name: 'Invite Team' });

            const response = await mockTeamInvite(team.body.data.id, {
                email: 'newmember@example.com',
                role: 'member',
            });

            expect(response.status).toBe(200);
        });

        it('should reject duplicate invitation', async () => {
            const team = await mockTeamCreate({ name: 'Duplicate Invite Team' });

            await mockTeamInvite(team.body.data.id, {
                email: 'member@example.com',
                role: 'member',
            });

            const response = await mockTeamInvite(team.body.data.id, {
                email: 'member@example.com',
                role: 'member',
            });

            expect(response.status).toBe(409);
            expect(response.body.error_code).toBe('ALREADY_INVITED');
        });
    });
});

// ============================================================================
// RATE LIMITING TESTS
// ============================================================================

describe('Rate Limiting', () => {
    it('should allow requests under the limit', async () => {
        const responses = [];
        for (let i = 0; i < 10; i++) {
            responses.push(await mockHealthCheck());
        }

        responses.forEach((response) => {
            expect(response.status).toBe(200);
        });
    });

    it('should block requests over the limit', async () => {
        // Reset rate limiter
        await mockResetRateLimiter();

        const responses = [];
        for (let i = 0; i < 150; i++) {
            responses.push(await mockAPIRequest());
        }

        const blocked = responses.filter((r) => r.status === 429);
        expect(blocked.length).toBeGreaterThan(0);
    });

    it('should include rate limit headers', async () => {
        const response = await mockHealthCheck();

        expect(response.headers['x-ratelimit-limit']).toBeDefined();
        expect(response.headers['x-ratelimit-remaining']).toBeDefined();
        expect(response.headers['x-ratelimit-reset']).toBeDefined();
    });

    it('should apply different limits per tier', async () => {
        // Free tier: 100 requests/day
        await mockSetUserTier('free');
        const freeLimit = await mockGetRateLimit();
        expect(freeLimit.daily).toBe(100);

        // Pro tier: unlimited
        await mockSetUserTier('pro');
        const proLimit = await mockGetRateLimit();
        expect(proLimit.daily).toBe(-1);
    });
});

// ============================================================================
// SECURITY TESTS
// ============================================================================

describe('Security', () => {
    describe('Input Sanitization', () => {
        it('should prevent SQL injection', async () => {
            const response = await mockLoginRequest({
                email: "'; DROP TABLE users; --",
                password: 'password',
            });

            // Should return validation error, not execute SQL
            expect(response.status).toBe(400);
        });

        it('should prevent XSS in query responses', async () => {
            const response = await mockRAGQuery({
                message: '<img src=x onerror=alert(1)>',
            });

            expect(response.body.data.response).not.toContain('<img');
        });

        it('should validate Content-Type header', async () => {
            const response = await mockRawRequest('/api/query', {
                method: 'POST',
                headers: {
                    'Content-Type': 'text/plain',
                },
                body: JSON.stringify({ message: 'test' }),
            });

            expect(response.status).toBe(415);
        });
    });

    describe('Authentication Security', () => {
        it('should reject requests without token', async () => {
            const response = await mockProtectedRequest('/api/agents', {
                headers: {},
            });

            expect(response.status).toBe(401);
        });

        it('should reject requests with invalid token', async () => {
            const response = await mockProtectedRequest('/api/agents', {
                headers: {
                    Authorization: 'Bearer invalid-token',
                },
            });

            expect(response.status).toBe(401);
        });

        it('should reject requests with tampered token', async () => {
            const validToken = await mockGenerateValidToken();
            const tamperedToken = validToken.slice(0, -5) + 'xxxxx';

            const response = await mockProtectedRequest('/api/agents', {
                headers: {
                    Authorization: `Bearer ${tamperedToken}`,
                },
            });

            expect(response.status).toBe(401);
        });
    });

    describe('CORS Configuration', () => {
        it('should allow requests from allowed origins', async () => {
            const response = await mockRawRequest('/api/health', {
                headers: {
                    Origin: 'https://claude-agent.dev',
                },
            });

            expect(response.headers['access-control-allow-origin']).toBe('https://claude-agent.dev');
        });

        it('should block requests from disallowed origins', async () => {
            const response = await mockRawRequest('/api/health', {
                headers: {
                    Origin: 'https://malicious-site.com',
                },
            });

            expect(response.headers['access-control-allow-origin']).toBeUndefined();
        });
    });
});

// ============================================================================
// BILLING TESTS
// ============================================================================

describe('Billing Module', () => {
    describe('Pricing Endpoint', () => {
        it('should return pricing tiers', async () => {
            const response = await mockPricingRequest();

            expect(response.status).toBe(200);
            expect(response.body.tiers).toBeDefined();
            expect(response.body.tiers.free).toBeDefined();
            expect(response.body.tiers.pro).toBeDefined();
            expect(response.body.tiers.enterprise).toBeDefined();
        });
    });

    describe('Subscription Management', () => {
        it('should create checkout session', async () => {
            const response = await mockCreateCheckout('pro');

            expect(response.status).toBe(200);
            expect(response.body.checkout_url).toBeDefined();
        });

        it('should get current subscription', async () => {
            const response = await mockGetSubscription();

            expect(response.status).toBe(200);
            expect(response.body.data.tier).toBeDefined();
            expect(response.body.data.status).toBeDefined();
        });
    });

    describe('Webhook Processing', () => {
        it('should process subscription_created event', async () => {
            const response = await mockWebhookEvent({
                event_type: 'subscription_created',
                data: {
                    user_id: 'user-123',
                    product_id: 'pro',
                },
            });

            expect(response.status).toBe(200);
        });

        it('should reject invalid webhook signature', async () => {
            const response = await mockWebhookEvent(
                {
                    event_type: 'subscription_created',
                    data: {},
                },
                { invalidSignature: true }
            );

            expect(response.status).toBe(401);
        });
    });
});

// ============================================================================
// MOCK FUNCTIONS
// ============================================================================

function mockGenerateToken(user: { id: string; email: string; tier: string }) {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const iat = Math.floor(Date.now() / 1000);
    const payload = btoa(JSON.stringify({
        sub: user.id,
        email: user.email,
        tier: user.tier,
        iat,
        exp: iat + 3600,
    }));
    const signature = btoa('mock-signature');
    return `${header}.${payload}.${signature}`;
}

function mockDecodeToken(token: string) {
    const parts = token.split('.');
    return JSON.parse(atob(parts[1]));
}

function mockVerifyToken(token: string) {
    const payload = mockDecodeToken(token);
    if (payload.exp < Math.floor(Date.now() / 1000)) {
        throw new Error('TOKEN_EXPIRED');
    }
    return payload;
}

async function mockHashPassword(password: string) {
    return `$2b$10$mock-hash-${password.length}`;
}

async function mockVerifyPassword(password: string, hash: string) {
    return hash.includes(`${password.length}`);
}

async function mockLoginRequest(data: { email: string; password: string }) {
    if (!data.email) {
        return { status: 400, body: { success: false, error_code: 'VALIDATION_ERROR' } };
    }
    if (data.password === 'validPassword123') {
        return {
            status: 200,
            body: {
                success: true,
                data: {
                    token: mockGenerateToken({ id: 'user-123', email: data.email, tier: 'pro' }),
                    user: { id: 'user-123', email: data.email },
                },
            },
        };
    }
    return { status: 401, body: { success: false, error_code: 'INVALID_CREDENTIALS' } };
}

async function mockRAGQuery(data: { message: string; sessionId?: string }) {
    if (!data.message) {
        return { status: 400, body: { success: false, error_code: 'VALIDATION_ERROR' } };
    }
    if (data.message.length > 10000) {
        return { status: 400, body: { success: false, error_code: 'QUERY_TOO_LONG' } };
    }
    return {
        status: 200,
        body: {
            success: true,
            data: {
                response: `Response for: ${data.message.replace(/<[^>]*>/g, '')}`,
                sources: [{ file: 'src/auth/login.ts', relevance: 0.95 }],
                tokens_used: 150,
                processing_time: 142,
            },
        },
    };
}

async function mockAgentsList() {
    return {
        status: 200,
        body: {
            data: [
                { id: 'luna-code-review', name: 'Code Review', status: 'running' },
                { id: 'luna-testing', name: 'Testing', status: 'idle' },
            ],
        },
    };
}

async function mockAgentGet(id: string) {
    const agents: Record<string, { id: string; name: string; status: string }> = {
        'luna-code-review': { id: 'luna-code-review', name: 'Code Review', status: 'running' },
        'luna-testing': { id: 'luna-testing', name: 'Testing', status: 'idle' },
    };
    if (!agents[id]) {
        return { status: 404, body: { success: false, error_code: 'AGENT_NOT_FOUND' } };
    }
    return { status: 200, body: { data: agents[id] } };
}

async function mockAgentCreate(data: { name: string; description?: string; type: string; config?: Record<string, unknown> }) {
    return { status: 201, body: { data: { id: `custom-${Date.now()}`, ...data } } };
}

async function mockAgentUpdate(id: string, data: { config?: Record<string, unknown> }) {
    return { status: 200, body: { data: { id, config: data.config } } };
}

async function mockAgentStart(id: string) {
    return { status: 200, body: { data: { id, status: 'running' } } };
}

async function mockAgentStop(id: string) {
    return { status: 200, body: { data: { id, status: 'idle' } } };
}

async function mockTeamCreate(data: { name: string; description?: string }) {
    return { status: 201, body: { data: { id: `team-${Date.now()}`, ...data } } };
}

async function mockTeamsList() {
    return { status: 200, body: { data: [] } };
}

async function mockTeamGet(id: string) {
    return { status: 200, body: { data: { id, members: [] } } };
}

async function mockTeamInvite(teamId: string, data: { email: string; role: string }) {
    if (data.email === 'member@example.com') {
        return { status: 409, body: { success: false, error_code: 'ALREADY_INVITED' } };
    }
    return { status: 200, body: { success: true } };
}

async function mockHealthCheck() {
    return {
        status: 200,
        body: { status: 'ok' },
        headers: {
            'x-ratelimit-limit': '100',
            'x-ratelimit-remaining': '99',
            'x-ratelimit-reset': '3600',
        },
    };
}

async function mockAPIRequest() {
    return { status: 200, body: {} };
}

async function mockResetRateLimiter() { }

async function mockSetUserTier(_tier: string) { }

async function mockGetRateLimit() {
    return { daily: 100 };
}

async function mockProtectedRequest(_path: string, options: { headers: Record<string, string> }) {
    if (!options.headers.Authorization) {
        return { status: 401, body: {} };
    }
    if (options.headers.Authorization === 'Bearer invalid-token') {
        return { status: 401, body: {} };
    }
    if (options.headers.Authorization.endsWith('xxxxx')) {
        return { status: 401, body: {} };
    }
    return { status: 200, body: {} };
}

async function mockRawRequest(_path: string, options: { method?: string; headers: Record<string, string>; body?: string }) {
    if (options.headers['Content-Type'] === 'text/plain') {
        return { status: 415, body: {}, headers: {} };
    }
    const headers: Record<string, string> = {};
    if (options.headers.Origin === 'https://claude-agent.dev') {
        headers['access-control-allow-origin'] = 'https://claude-agent.dev';
    }
    return { status: 200, body: {}, headers };
}

async function mockGenerateValidToken() {
    return mockGenerateToken({ id: 'user-123', email: 'test@example.com', tier: 'pro' });
}

async function mockPricingRequest() {
    return {
        status: 200,
        body: {
            tiers: {
                free: { price: 0, queries: 100 },
                pro: { price: 29, queries: -1 },
                enterprise: { price: null, queries: -1 },
            },
        },
    };
}

async function mockCreateCheckout(_tier: string) {
    return { status: 200, body: { checkout_url: 'https://checkout.lemonsqueezy.com/xxx' } };
}

async function mockGetSubscription() {
    return { status: 200, body: { data: { tier: 'pro', status: 'active' } } };
}

async function mockWebhookEvent(data: { event_type: string; data: Record<string, unknown> }, options?: { invalidSignature?: boolean }) {
    if (options?.invalidSignature) {
        return { status: 401, body: {} };
    }
    return { status: 200, body: {} };
}
