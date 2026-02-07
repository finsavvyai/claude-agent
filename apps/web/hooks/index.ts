'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery, useMutation, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { authApi, agentsApi, ragApi, teamsApi, billingApi, healthApi, type User, type Agent, type Team, type UsageStats, type RAGQueryResult, type ApiResponse } from '@/lib/api';
import { useAuthStore, useNotificationStore } from '@/store';
import { parseErrorMessage } from '@/lib/utils';

// ============================================================================
// AUTH HOOKS
// ============================================================================

/**
 * Hook for authentication state and actions
 */
export function useAuth() {
    const queryClient = useQueryClient();
    const { user, setUser, setLoading, logout: storeLogout, isAuthenticated, isLoading } = useAuthStore();
    const { addNotification } = useNotificationStore();

    // Fetch current user profile
    const profileQuery = useQuery({
        queryKey: ['auth', 'profile'],
        queryFn: async () => {
            const response = await authApi.getProfile();
            if (response.success && response.data) {
                setUser(response.data);
                return response.data;
            }
            throw new Error(response.error || 'Failed to get profile');
        },
        enabled: isAuthenticated,
        staleTime: 5 * 60 * 1000, // 5 minutes
        retry: false,
    });

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: ({ email, password }: { email: string; password: string }) =>
            authApi.login(email, password),
        onSuccess: (response) => {
            if (response.success && response.data) {
                setUser(response.data.user);
                addNotification({ type: 'success', title: 'Welcome back!', message: 'Successfully logged in.' });
                queryClient.invalidateQueries({ queryKey: ['auth'] });
            }
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Login failed', message: parseErrorMessage(error) });
        },
    });

    // Signup mutation
    const signupMutation = useMutation({
        mutationFn: ({ email, password, name }: { email: string; password: string; name: string }) =>
            authApi.signup(email, password, name),
        onSuccess: (response) => {
            if (response.success && response.data) {
                setUser(response.data.user);
                addNotification({ type: 'success', title: 'Account created!', message: 'Welcome to Claude Agent Platform.' });
                queryClient.invalidateQueries({ queryKey: ['auth'] });
            }
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Signup failed', message: parseErrorMessage(error) });
        },
    });

    // Logout
    const logout = useCallback(async () => {
        try {
            await authApi.logout();
        } finally {
            storeLogout();
            queryClient.clear();
            addNotification({ type: 'info', title: 'Signed out', message: 'You have been logged out.' });
        }
    }, [storeLogout, queryClient, addNotification]);

    return {
        user,
        isAuthenticated,
        isLoading: isLoading || profileQuery.isLoading,
        login: loginMutation.mutate,
        loginAsync: loginMutation.mutateAsync,
        loginLoading: loginMutation.isPending,
        signup: signupMutation.mutate,
        signupAsync: signupMutation.mutateAsync,
        signupLoading: signupMutation.isPending,
        logout,
        refetchProfile: profileQuery.refetch,
    };
}

// ============================================================================
// AGENTS HOOKS
// ============================================================================

/**
 * Hook for fetching and managing agents
 */
export function useAgents() {
    const queryClient = useQueryClient();
    const { addNotification } = useNotificationStore();

    // List all agents
    const agentsQuery = useQuery({
        queryKey: ['agents'],
        queryFn: async () => {
            const response = await agentsApi.list();
            if (response.success) {
                return response.data;
            }
            throw new Error(response.error || 'Failed to fetch agents');
        },
        staleTime: 30 * 1000, // 30 seconds
    });

    // Start agent mutation
    const startMutation = useMutation({
        mutationFn: (id: string) => agentsApi.start(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            addNotification({ type: 'success', title: 'Agent Started', message: `${id} is now running.` });
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Failed to start agent', message: parseErrorMessage(error) });
        },
    });

    // Stop agent mutation
    const stopMutation = useMutation({
        mutationFn: (id: string) => agentsApi.stop(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: ['agents'] });
            addNotification({ type: 'info', title: 'Agent Stopped', message: `${id} has been stopped.` });
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Failed to stop agent', message: parseErrorMessage(error) });
        },
    });

    return {
        agents: agentsQuery.data ?? [],
        isLoading: agentsQuery.isLoading,
        error: agentsQuery.error,
        refetch: agentsQuery.refetch,
        startAgent: startMutation.mutate,
        stopAgent: stopMutation.mutate,
        isStarting: startMutation.isPending,
        isStopping: stopMutation.isPending,
    };
}

/**
 * Hook for fetching a single agent
 */
export function useAgent(id: string) {
    return useQuery({
        queryKey: ['agents', id],
        queryFn: async () => {
            const response = await agentsApi.get(id);
            if (response.success) {
                return response.data;
            }
            throw new Error(response.error || 'Agent not found');
        },
        enabled: !!id,
        staleTime: 30 * 1000,
    });
}

// ============================================================================
// RAG QUERY HOOKS
// ============================================================================

/**
 * Hook for RAG queries
 */
export function useRAGQuery() {
    const [sessionId, setSessionId] = useState<string>();
    const { addNotification } = useNotificationStore();

    const queryMutation = useMutation({
        mutationFn: (message: string) => ragApi.query(message, { sessionId }),
        onSuccess: (response) => {
            if (response.success && response.data) {
                // Session ID is implicitly managed
            }
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Query failed', message: parseErrorMessage(error) });
        },
    });

    const resetSession = useCallback(() => {
        setSessionId(undefined);
    }, []);

    return {
        query: queryMutation.mutate,
        queryAsync: queryMutation.mutateAsync,
        isQuerying: queryMutation.isPending,
        result: queryMutation.data?.data,
        error: queryMutation.error,
        sessionId,
        resetSession,
    };
}

/**
 * Hook for usage stats
 */
export function useUsageStats() {
    return useQuery({
        queryKey: ['usage-stats'],
        queryFn: async () => {
            const response = await ragApi.getStatus();
            if (response.success) {
                return response.data;
            }
            throw new Error(response.error || 'Failed to fetch usage stats');
        },
        staleTime: 60 * 1000, // 1 minute
        refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
    });
}

// ============================================================================
// TEAM HOOKS
// ============================================================================

/**
 * Hook for managing teams
 */
export function useTeams() {
    const queryClient = useQueryClient();
    const { addNotification } = useNotificationStore();

    // List teams
    const teamsQuery = useQuery({
        queryKey: ['teams'],
        queryFn: async () => {
            const response = await teamsApi.list();
            if (response.success) {
                return response.data;
            }
            throw new Error(response.error || 'Failed to fetch teams');
        },
    });

    // Create team mutation
    const createMutation = useMutation({
        mutationFn: (data: { name: string; description?: string }) => teamsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            addNotification({ type: 'success', title: 'Team created', message: 'Your new team is ready.' });
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Failed to create team', message: parseErrorMessage(error) });
        },
    });

    // Invite member mutation
    const inviteMutation = useMutation({
        mutationFn: ({ teamId, email, role }: { teamId: string; email: string; role: string }) =>
            teamsApi.invite(teamId, email, role),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['teams'] });
            addNotification({ type: 'success', title: 'Invitation sent', message: 'Team member has been invited.' });
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Failed to invite member', message: parseErrorMessage(error) });
        },
    });

    return {
        teams: teamsQuery.data ?? [],
        isLoading: teamsQuery.isLoading,
        error: teamsQuery.error,
        createTeam: createMutation.mutate,
        inviteMember: inviteMutation.mutate,
        isCreating: createMutation.isPending,
        isInviting: inviteMutation.isPending,
    };
}

// ============================================================================
// UTILITY HOOKS
// ============================================================================

/**
 * Hook for debounced values
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(timer);
    }, [value, delay]);

    return debouncedValue;
}

/**
 * Hook for local storage with SSR support
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        if (typeof window === 'undefined') {
            return initialValue;
        }
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch {
            return initialValue;
        }
    });

    const setValue = useCallback(
        (value: T | ((prev: T) => T)) => {
            try {
                const valueToStore = value instanceof Function ? value(storedValue) : value;
                setStoredValue(valueToStore);
                if (typeof window !== 'undefined') {
                    window.localStorage.setItem(key, JSON.stringify(valueToStore));
                }
            } catch (error) {
                console.error('Error saving to localStorage:', error);
            }
        },
        [key, storedValue]
    );

    return [storedValue, setValue];
}

/**
 * Hook for keyboard shortcuts
 */
export function useKeyboardShortcut(keys: string[], callback: () => void, options?: { ctrl?: boolean; meta?: boolean; shift?: boolean }) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const keyMatch = keys.some((key) => e.key.toLowerCase() === key.toLowerCase());
            const ctrlMatch = !options?.ctrl || (e.ctrlKey || e.metaKey);
            const metaMatch = !options?.meta || e.metaKey;
            const shiftMatch = !options?.shift || e.shiftKey;

            if (keyMatch && ctrlMatch && metaMatch && shiftMatch) {
                e.preventDefault();
                callback();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [keys, callback, options]);
}

/**
 * Hook for click outside detection
 */
export function useClickOutside<T extends HTMLElement>(callback: () => void) {
    const ref = useRef<T>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (ref.current && !ref.current.contains(event.target as Node)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [callback]);

    return ref;
}

/**
 * Hook for media queries
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const mediaQuery = window.matchMedia(query);
        setMatches(mediaQuery.matches);

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
        mediaQuery.addEventListener('change', handler);
        return () => mediaQuery.removeEventListener('change', handler);
    }, [query]);

    return matches;
}

/**
 * Hook for copy to clipboard
 */
export function useCopyToClipboard() {
    const [copied, setCopied] = useState(false);
    const { addNotification } = useNotificationStore();

    const copy = useCallback(
        async (text: string) => {
            try {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                addNotification({ type: 'success', title: 'Copied!', message: 'Text copied to clipboard.' });
                setTimeout(() => setCopied(false), 2000);
            } catch {
                addNotification({ type: 'error', title: 'Copy failed', message: 'Failed to copy to clipboard.' });
            }
        },
        [addNotification]
    );

    return { copy, copied };
}

/**
 * Hook for polling data
 */
export function usePolling<T>(
    fetchFn: () => Promise<T>,
    interval: number,
    options?: { enabled?: boolean }
) {
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState<Error | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (options?.enabled === false) return;

        const fetchData = async () => {
            try {
                const result = await fetchFn();
                setData(result);
                setError(null);
            } catch (err) {
                setError(err instanceof Error ? err : new Error('Unknown error'));
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
        const timer = setInterval(fetchData, interval);
        return () => clearInterval(timer);
    }, [fetchFn, interval, options?.enabled]);

    return { data, error, isLoading };
}
