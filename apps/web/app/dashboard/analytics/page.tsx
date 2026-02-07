'use client';

import { useState } from 'react';
import {
    BarChart3,
    LineChart,
    TrendingUp,
    TrendingDown,
    Activity,
    Clock,
    Zap,
    Users,
    FileCode2,
    Cpu,
    Calendar,
    Download,
    ArrowUpRight,
    ArrowDownRight,
} from 'lucide-react';
import { Card, Badge, Button } from '@/components/ui';
import { cn } from '@/lib/utils';

// Time range options
type TimeRange = '24h' | '7d' | '30d' | '90d';

// Mock data
const overviewStats = [
    {
        name: 'Total Queries',
        value: '12,847',
        change: '+23.5%',
        trend: 'up' as const,
        icon: Activity,
        description: 'vs. previous period',
    },
    {
        name: 'Avg Response Time',
        value: '142ms',
        change: '-18%',
        trend: 'down' as const, // Down is good for response time
        icon: Clock,
        description: 'faster than avg',
    },
    {
        name: 'Success Rate',
        value: '99.2%',
        change: '+0.3%',
        trend: 'up' as const,
        icon: Zap,
        description: 'all agent tasks',
    },
    {
        name: 'Active Users',
        value: '234',
        change: '+12',
        trend: 'up' as const,
        icon: Users,
        description: 'this period',
    },
];

const usageByAgent = [
    { name: 'luna-code-review', queries: 4521, percentage: 35.2 },
    { name: 'luna-rag', queries: 3842, percentage: 29.9 },
    { name: 'luna-testing', queries: 2156, percentage: 16.8 },
    { name: 'luna-security', queries: 1245, percentage: 9.7 },
    { name: 'luna-cloudflare', queries: 683, percentage: 5.3 },
    { name: 'Others', queries: 400, percentage: 3.1 },
];

const recentQueries = [
    {
        query: 'Review authentication module for security vulnerabilities',
        agent: 'luna-security',
        time: '2 min ago',
        tokens: 2847,
        status: 'completed',
    },
    {
        query: 'Generate unit tests for UserService class',
        agent: 'luna-testing',
        time: '5 min ago',
        tokens: 1523,
        status: 'completed',
    },
    {
        query: 'Explain the caching implementation',
        agent: 'luna-rag',
        time: '12 min ago',
        tokens: 987,
        status: 'completed',
    },
    {
        query: 'Check deployment configuration',
        agent: 'luna-cloudflare',
        time: '18 min ago',
        tokens: 654,
        status: 'completed',
    },
    {
        query: 'Review PR #234 for code quality',
        agent: 'luna-code-review',
        time: '25 min ago',
        tokens: 3210,
        status: 'completed',
    },
];

// Chart data (simplified for display)
const chartData = {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    queries: [1823, 2145, 1956, 2534, 2312, 1245, 1832],
    tokens: [45632, 52341, 48756, 61234, 58432, 32156, 44521],
};

export default function AnalyticsPage() {
    const [timeRange, setTimeRange] = useState<TimeRange>('7d');

    const timeRanges: { value: TimeRange; label: string }[] = [
        { value: '24h', label: 'Last 24 hours' },
        { value: '7d', label: 'Last 7 days' },
        { value: '30d', label: 'Last 30 days' },
        { value: '90d', label: 'Last 90 days' },
    ];

    const maxQueries = Math.max(...chartData.queries);

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">Analytics</h1>
                    <p className="text-neutral-400">
                        Monitor your platform usage and performance
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Time Range Selector */}
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-neutral-800/50">
                        {timeRanges.map((range) => (
                            <button
                                key={range.value}
                                onClick={() => setTimeRange(range.value)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                                    timeRange === range.value
                                        ? 'bg-primary-500/20 text-primary-400'
                                        : 'text-neutral-400 hover:text-white'
                                )}
                            >
                                {range.value}
                            </button>
                        ))}
                    </div>
                    <Button variant="secondary">
                        <Download className="w-4 h-4" />
                        Export
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {overviewStats.map((stat) => (
                    <Card key={stat.name} className="p-5">
                        <div className="flex items-center justify-between mb-3">
                            <div className="p-2 rounded-lg bg-neutral-800">
                                <stat.icon className="w-5 h-5 text-primary-400" />
                            </div>
                            <div
                                className={cn(
                                    'flex items-center gap-1 text-sm font-medium',
                                    stat.trend === 'up' ? 'text-green-400' : 'text-green-400'
                                )}
                            >
                                {stat.trend === 'up' ? (
                                    <ArrowUpRight className="w-4 h-4" />
                                ) : (
                                    <ArrowDownRight className="w-4 h-4" />
                                )}
                                {stat.change}
                            </div>
                        </div>
                        <p className="text-2xl font-bold mb-1">{stat.value}</p>
                        <p className="text-sm text-neutral-500">{stat.name}</p>
                    </Card>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                {/* Query Volume Chart */}
                <Card className="lg:col-span-2 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h2 className="text-lg font-semibold">Query Volume</h2>
                            <p className="text-sm text-neutral-400">Queries per day</p>
                        </div>
                        <Badge variant="success">+23.5% vs last week</Badge>
                    </div>

                    {/* Simple Bar Chart */}
                    <div className="flex items-end justify-between h-48 gap-2">
                        {chartData.labels.map((label, index) => {
                            const height = (chartData.queries[index] / maxQueries) * 100;
                            return (
                                <div key={label} className="flex-1 flex flex-col items-center gap-2">
                                    <div className="relative w-full flex justify-center">
                                        <div
                                            className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-primary-600 to-accent-500 transition-all hover:opacity-80"
                                            style={{ height: `${height * 1.8}px` }}
                                        />
                                    </div>
                                    <span className="text-xs text-neutral-500">{label}</span>
                                </div>
                            );
                        })}
                    </div>

                    {/* Chart Legend */}
                    <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t border-neutral-800">
                        <div className="flex items-center gap-2 text-sm text-neutral-400">
                            <div className="w-3 h-3 rounded bg-gradient-to-r from-primary-500 to-accent-500" />
                            Queries
                        </div>
                        <div className="text-sm text-neutral-500">
                            Total: <span className="text-white font-medium">12,847</span> queries
                        </div>
                    </div>
                </Card>

                {/* Usage by Agent */}
                <Card className="p-6">
                    <h2 className="text-lg font-semibold mb-6">Usage by Agent</h2>
                    <div className="space-y-4">
                        {usageByAgent.map((agent) => (
                            <div key={agent.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-sm font-medium truncate">{agent.name}</span>
                                    <span className="text-sm text-neutral-400">{agent.percentage}%</span>
                                </div>
                                <div className="w-full h-2 rounded-full bg-neutral-800 overflow-hidden">
                                    <div
                                        className="h-full rounded-full bg-gradient-to-r from-primary-500 to-accent-500"
                                        style={{ width: `${agent.percentage}%` }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>

            {/* Recent Queries */}
            <Card className="p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold">Recent Queries</h2>
                    <Button variant="ghost" size="sm">
                        View all
                    </Button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-neutral-800">
                                <th className="text-left text-sm font-medium text-neutral-400 pb-3">Query</th>
                                <th className="text-left text-sm font-medium text-neutral-400 pb-3">Agent</th>
                                <th className="text-left text-sm font-medium text-neutral-400 pb-3">Time</th>
                                <th className="text-right text-sm font-medium text-neutral-400 pb-3">Tokens</th>
                                <th className="text-right text-sm font-medium text-neutral-400 pb-3">Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recentQueries.map((query, index) => (
                                <tr
                                    key={index}
                                    className="border-b border-neutral-800/50 last:border-0"
                                >
                                    <td className="py-4">
                                        <p className="text-sm font-medium truncate max-w-xs">{query.query}</p>
                                    </td>
                                    <td className="py-4">
                                        <code className="text-xs text-primary-400 bg-primary-500/10 px-2 py-1 rounded">
                                            {query.agent}
                                        </code>
                                    </td>
                                    <td className="py-4 text-sm text-neutral-400">{query.time}</td>
                                    <td className="py-4 text-right text-sm text-neutral-400">
                                        {query.tokens.toLocaleString()}
                                    </td>
                                    <td className="py-4 text-right">
                                        <Badge variant="success" className="text-xs">
                                            {query.status}
                                        </Badge>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>
        </div>
    );
}
