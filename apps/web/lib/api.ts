import axios, { AxiosInstance, AxiosError, AxiosRequestConfig } from 'axios';

// ========================================
// API CLIENT CONFIGURATION
// ========================================

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.claude-agent.dev';

// Create axios instance with default config
const createApiClient = (): AxiosInstance => {
    const client = axios.create({
        baseURL: API_URL,
        timeout: 30000,
        headers: {
            'Content-Type': 'application/json',
        },
    });

    // Request interceptor - add auth token
    client.interceptors.request.use(
        (config) => {
            const token = getAuthToken();
            if (token) {
                config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
        },
        (error) => Promise.reject(error)
    );

    // Response interceptor - handle errors
    client.interceptors.response.use(
        (response) => response,
        async (error: AxiosError) => {
            if (error.response?.status === 401) {
                // Token expired - try to refresh
                const refreshed = await refreshToken();
                if (refreshed && error.config) {
                    // Retry the request with new token
                    const token = getAuthToken();
                    error.config.headers.Authorization = `Bearer ${token}`;
                    return client.request(error.config);
                }
                // Refresh failed - redirect to login
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
            return Promise.reject(error);
        }
    );

    return client;
};

const api = createApiClient();

// ========================================
// AUTH HELPERS
// ========================================

function getAuthToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('auth_token');
}

function setAuthToken(token: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem('auth_token', token);
    }
}

function removeAuthToken(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('refresh_token');
    }
}

async function refreshToken(): Promise<boolean> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) return false;

    try {
        const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
        });

        if (response.data.success) {
            setAuthToken(response.data.data.access_token);
            localStorage.setItem('refresh_token', response.data.data.refresh_token);
            return true;
        }
        return false;
    } catch {
        removeAuthToken();
        return false;
    }
}

// ========================================
// API TYPES
// ========================================

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    error_code?: string;
}

export interface User {
    id: string;
    email: string;
    name: string;
    tier: 'free' | 'pro' | 'team' | 'enterprise';
    api_key: string;
    subscription_status: 'active' | 'inactive' | 'cancelled';
    created_at: string;
}

export interface Agent {
    id: string;
    name: string;
    description: string;
    status: 'active' | 'inactive' | 'running';
    type: string;
    config: Record<string, unknown>;
    created_at: string;
}

export interface Team {
    id: string;
    name: string;
    description?: string;
    owner_id: string;
    members: TeamMember[];
    created_at: string;
}

export interface TeamMember {
    id: string;
    user_id: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    joined_at: string;
}

export interface UsageStats {
    queries_today: number;
    queries_limit: number;
    files_indexed: number;
    agents_active: number;
    last_query_at: string;
}

export interface RAGQueryResult {
    response: string;
    sources: Array<{
        file: string;
        relevance: number;
        snippet: string;
    }>;
    tokens_used: number;
    processing_time: number;
}

// ========================================
// AUTH API
// ========================================

export const authApi = {
    login: async (email: string, password: string): Promise<ApiResponse<{ user: User; token: string }>> => {
        const response = await api.post('/auth/login', { email, password });
        if (response.data.success) {
            setAuthToken(response.data.data.token);
            if (response.data.data.refresh_token) {
                localStorage.setItem('refresh_token', response.data.data.refresh_token);
            }
        }
        return response.data;
    },

    signup: async (email: string, password: string, name: string): Promise<ApiResponse<{ user: User; token: string }>> => {
        const response = await api.post('/auth/signup', { email, password, name });
        if (response.data.success) {
            setAuthToken(response.data.data.token);
        }
        return response.data;
    },

    logout: async (): Promise<void> => {
        try {
            await api.post('/auth/logout');
        } finally {
            removeAuthToken();
        }
    },

    getProfile: async (): Promise<ApiResponse<User>> => {
        const response = await api.get('/auth/profile');
        return response.data;
    },

    updateProfile: async (updates: Partial<User>): Promise<ApiResponse<User>> => {
        const response = await api.patch('/auth/profile', updates);
        return response.data;
    },
};

// ========================================
// AGENTS API
// ========================================

export const agentsApi = {
    list: async (): Promise<ApiResponse<Agent[]>> => {
        const response = await api.get('/agents');
        return response.data;
    },

    get: async (id: string): Promise<ApiResponse<Agent>> => {
        const response = await api.get(`/agents/${id}`);
        return response.data;
    },

    create: async (data: Partial<Agent>): Promise<ApiResponse<Agent>> => {
        const response = await api.post('/agents', data);
        return response.data;
    },

    update: async (id: string, data: Partial<Agent>): Promise<ApiResponse<Agent>> => {
        const response = await api.patch(`/agents/${id}`, data);
        return response.data;
    },

    delete: async (id: string): Promise<ApiResponse<void>> => {
        const response = await api.delete(`/agents/${id}`);
        return response.data;
    },

    start: async (id: string): Promise<ApiResponse<Agent>> => {
        const response = await api.post(`/agents/${id}/start`);
        return response.data;
    },

    stop: async (id: string): Promise<ApiResponse<Agent>> => {
        const response = await api.post(`/agents/${id}/stop`);
        return response.data;
    },
};

// ========================================
// RAG API
// ========================================

export const ragApi = {
    query: async (message: string, options?: { sessionId?: string }): Promise<ApiResponse<RAGQueryResult>> => {
        const response = await api.post('/query', { message, ...options });
        return response.data;
    },

    getStatus: async (): Promise<ApiResponse<UsageStats>> => {
        const response = await api.get('/status');
        return response.data;
    },

    indexProject: async (repositoryUrl: string, options?: { name?: string; description?: string }): Promise<ApiResponse<{ job_id: string }>> => {
        const response = await api.post('/workspace/index-project', { repository_url: repositoryUrl, ...options });
        return response.data;
    },
};

// ========================================
// TEAMS API
// ========================================

export const teamsApi = {
    list: async (): Promise<ApiResponse<Team[]>> => {
        const response = await api.get('/teams');
        return response.data;
    },

    get: async (id: string): Promise<ApiResponse<Team>> => {
        const response = await api.get(`/teams/${id}`);
        return response.data;
    },

    create: async (data: { name: string; description?: string }): Promise<ApiResponse<Team>> => {
        const response = await api.post('/teams/create', data);
        return response.data;
    },

    invite: async (teamId: string, email: string, role: string): Promise<ApiResponse<void>> => {
        const response = await api.post('/teams/invite', { teamId, email, role });
        return response.data;
    },

    leave: async (teamId: string): Promise<ApiResponse<void>> => {
        const response = await api.post('/teams/leave', { teamId });
        return response.data;
    },
};

// ========================================
// BILLING API
// ========================================

export const billingApi = {
    getPricing: async (): Promise<ApiResponse<Record<string, unknown>>> => {
        const response = await api.get('/pricing');
        return response.data;
    },

    upgrade: async (email: string): Promise<ApiResponse<{ checkout_url: string }>> => {
        const response = await api.post('/upgrade', { email });
        return response.data;
    },

    getSubscription: async (): Promise<ApiResponse<Record<string, unknown>>> => {
        const response = await api.get('/billing/subscription');
        return response.data;
    },

    cancelSubscription: async (): Promise<ApiResponse<void>> => {
        const response = await api.post('/billing/cancel');
        return response.data;
    },
};

// ========================================
// HEALTH API
// ========================================

export const healthApi = {
    check: async (): Promise<ApiResponse<{ status: string; timestamp: string }>> => {
        const response = await api.get('/health');
        return response.data;
    },
};

// Export the api instance for custom requests
export { api };
export default api;
