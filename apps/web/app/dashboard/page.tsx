'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
    Cpu,
    Activity,
    TrendingUp,
    Clock,
    FileCode2,
    GitPullRequest,
    Terminal,
    ArrowRight,
    Play,
    BarChart3,
    CheckCircle2,
    AlertCircle,
    Zap,
} from 'lucide-react';
import { Button, Card, Badge } from '@/components/ui';
import { useAuthStore } from '@/store';
import { cn } from '@/lib/utils';

// Stats data
const stats = [
    {
        name: 'Total Queries',
        value: '2,847',
        change: '+12.5%',
        trend: 'up',
        icon: Activity,
    },
    {
        name: 'Active Agents',
        value: '8',
        change: '+2',
        trend: 'up',
        icon: Cpu,
    },
    {
        name: 'Files Indexed',
        value: '12,456',
        change: '+543',
        trend: 'up',
        icon: FileCode2,
    },
    {
        name: 'Avg Response Time',
        value: '142ms',
        change: '-18ms',
        trend: 'down',
        icon: Clock,
    },
];

// Recent activity
const recentActivity = [
    {
        id: 1,
        type: 'code-review',
        title: 'Code review completed',
        description: 'luna-code-review analyzed 47 files in src/components',
        time: '2 minutes ago',
        status: 'success',
    },
    {
        id: 2,
        type: 'test',
        title: 'Test suite generated',
        description: 'luna-testing created 23 new test cases for UserService',
        time: '15 minutes ago',
        status: 'success',
    },
    {
        id: 3,
        type: 'security',
        title: 'Security vulnerability found',
        description: 'Potential SQL injection in api/users/[id]/route.ts',
        time: '1 hour ago',
        status: 'warning',
    },
    {
        id: 4,
        type: 'deployment',
        title: 'Deployment successful',
        description: 'Deployed to production via luna-cloudflare',
        time: '2 hours ago',
        status: 'success',
    },
];

// Active agents
const activeAgents = [
    {
        name: 'luna-code-review',
        status: 'running',
        lastRun: 'Just now',
        tasks: 3,
    },
    {
        name: 'luna-testing',
        status: 'idle',
        lastRun: '15 min ago',
        tasks: 0,
    },
    {
        name: 'luna-rag',
        status: 'running',
        lastRun: 'Just now',
        tasks: 1,
    },
    {
        name: 'luna-cloudflare',
        status: 'idle',
        lastRun: '2 hours ago',
        tasks: 0,
    },
];

export default function DashboardPage() {
    const { user } = useAuthStore();
    const [queryInput, setQueryInput] = useState('');

    const handleQuery = (e: React.FormEvent) => {
        e.preventDefault();
        // Handle query submission
        console.log('Query:', queryInput);
        setQueryInput('');
    };

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Welcome section */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">
                    Welcome back, {user?.name?.split(' ')[0] || 'Developer'}! 👋
                </h1>
                <p className="text-neutral-400">
                    Here&apos;s what&apos;s happening with your AI agents today.
                </p>
            </div>

            {/* Quick Query */}
            <Card className="mb-8 p-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-primary-500/10">
                        <Terminal className="w-5 h-5 text-primary-400" />
                    </div>
                    <div>
                        <h2 className="font-semibold">Quick Query</h2>
                        <p className="text-sm text-neutral-400">Ask Luna anything about your codebase</p>
                    </div>
                </div>
                <form onSubmit={handleQuery} className="flex gap-3">
                    <input
                        type="text"
                        value={queryInput}
                        onChange={(e) => setQueryInput(e.target.value)}
                        placeholder="e.g., Review the authentication module for security issues..."
                        className="flex-1 px-4 py-3 rounded-lg bg-neutral-800 border border-neutral-700 text-white placeholder:text-neutral-500 focus:outline-none focus:border-primary-500"
                    />
                    <Button type="submit">
                        <Zap className="w-4 h-4" />
                        Query
                    </Button>
                </form>
            </Card>

            {/* Stats grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats.map((stat) => (
                    <Card key={stat.name} className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800">
                                <stat.icon className="w-5 h-5 text-primary-400" />
                            </div>
                            <Badge
                                variant={stat.trend === 'up' ? 'success' : 'primary'}
                                className="text-xs"
                            >
                                {stat.change}
                            </Badge>
                        </div>
                        <p className="text-2xl font-bold mb-1">{stat.value}</p>
                        <p className="text-sm text-neutral-400">{stat.name}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <div className="lg:col-span-2">
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Recent Activity</h2>
                            <Link href="/dashboard/analytics" className="text-sm text-primary-400 hover:text-primary-300">
                                View all
                            </Link>
                        </div>
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-4 p-4 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors"
                                >
                                    <div
                                        className={cn(
                                            'p-2 rounded-lg',
                                            activity.status === 'success' && 'bg-green-500/10',
                                            activity.status === 'warning' && 'bg-amber-500/10'
                                        )}
                                    >
                                        {activity.status === 'success' ? (
                                            <CheckCircle2 className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <AlertCircle className="w-5 h-5 text-amber-400" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium mb-1">{activity.title}</p>
                                        <p className="text-sm text-neutral-400 truncate">
                                            {activity.description}
                                        </p>
                                    </div>
                                    <span className="text-xs text-neutral-500 whitespace-nowrap">
                                        {activity.time}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </Card>
                </div>

                {/* Active Agents */}
                <div>
                    <Card className="p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-semibold">Active Agents</h2>
                            <Link href="/dashboard/agents" className="text-sm text-primary-400 hover:text-primary-300">
                                Manage
                            </Link>
                        </div>
                        <div className="space-y-3">
                            {activeAgents.map((agent) => (
                                <div
                                    key={agent.name}
                                    className="flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50"
                                >
                                    <div className="relative">
                                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                            <Cpu className="w-5 h-5 text-white" />
                                        </div>
                                        <div
                                            className={cn(
                                                'absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-neutral-900',
                                                agent.status === 'running' ? 'bg-green-400' : 'bg-neutral-500'
                                            )}
                                        />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{agent.name}</p>
                                        <p className="text-xs text-neutral-500">{agent.lastRun}</p>
                                    </div>
                                    {agent.status === 'running' && agent.tasks > 0 && (
                                        <Badge variant="primary" className="text-xs">
                                            {agent.tasks} tasks
                                        </Badge>
                                    )}
                                </div>
                            ))}
                        </div>
                        <Button variant="secondary" className="w-full mt-4">
                            <Play className="w-4 h-4" />
                            Run All Agents
                        </Button>
                    </Card>

                    {/* Quick Actions */}
                    <Card className="p-6 mt-6">
                        <h2 className="text-lg font-semibold mb-4">Quick Actions</h2>
                        <div className="space-y-2">
                            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-left">
                                <GitPullRequest className="w-5 h-5 text-primary-400" />
                                <span className="text-sm">Review latest PR</span>
                                <ArrowRight className="w-4 h-4 text-neutral-600 ml-auto" />
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-left">
                                <FileCode2 className="w-5 h-5 text-primary-400" />
                                <span className="text-sm">Index new project</span>
                                <ArrowRight className="w-4 h-4 text-neutral-600 ml-auto" />
                            </button>
                            <button className="w-full flex items-center gap-3 p-3 rounded-lg bg-neutral-800/50 hover:bg-neutral-800 transition-colors text-left">
                                <BarChart3 className="w-5 h-5 text-primary-400" />
                                <span className="text-sm">View analytics</span>
                                <ArrowRight className="w-4 h-4 text-neutral-600 ml-auto" />
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}
