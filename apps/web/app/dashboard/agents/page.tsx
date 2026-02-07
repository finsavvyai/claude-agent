'use client';

import { useState } from 'react';
import {
    Cpu,
    Search,
    Filter,
    Play,
    Pause,
    Settings,
    MoreVertical,
    Code2,
    TestTube,
    Cloud,
    Database,
    Shield,
    FileText,
    Rocket,
    Eye,
    GitBranch,
    Terminal,
    Package,
    Layers,
    CheckCircle2,
    Clock,
    Zap,
} from 'lucide-react';
import { Button, Card, Badge, Input } from '@/components/ui';
import { cn } from '@/lib/utils';

// Agent data
const agents = [
    {
        id: 'luna-code-review',
        name: 'luna-code-review',
        description: 'Automated code reviews with security and performance analysis',
        status: 'running',
        category: 'Development',
        icon: Code2,
        lastRun: 'Just now',
        totalRuns: 2847,
        successRate: 98.5,
    },
    {
        id: 'luna-testing',
        name: 'luna-testing',
        description: 'Generate and run comprehensive test suites automatically',
        status: 'idle',
        category: 'Testing',
        icon: TestTube,
        lastRun: '15 min ago',
        totalRuns: 1523,
        successRate: 99.2,
    },
    {
        id: 'luna-rag',
        name: 'luna-rag',
        description: 'Advanced RAG with token optimization for codebase queries',
        status: 'running',
        category: 'AI',
        icon: Layers,
        lastRun: 'Just now',
        totalRuns: 5621,
        successRate: 97.8,
    },
    {
        id: 'luna-cloudflare',
        name: 'luna-cloudflare',
        description: 'Edge deployment and Cloudflare Workers migration',
        status: 'idle',
        category: 'Deployment',
        icon: Cloud,
        lastRun: '2 hours ago',
        totalRuns: 342,
        successRate: 99.7,
    },
    {
        id: 'luna-database',
        name: 'luna-database',
        description: 'Database schema optimization and migration management',
        status: 'idle',
        category: 'Database',
        icon: Database,
        lastRun: '1 day ago',
        totalRuns: 156,
        successRate: 100,
    },
    {
        id: 'luna-security',
        name: 'luna-security',
        description: 'Security vulnerability scanning and penetration testing',
        status: 'running',
        category: 'Security',
        icon: Shield,
        lastRun: 'Just now',
        totalRuns: 892,
        successRate: 96.4,
    },
    {
        id: 'luna-documentation',
        name: 'luna-documentation',
        description: 'Auto-generate and maintain project documentation',
        status: 'idle',
        category: 'Documentation',
        icon: FileText,
        lastRun: '3 hours ago',
        totalRuns: 421,
        successRate: 99.1,
    },
    {
        id: 'luna-deployment',
        name: 'luna-deployment',
        description: 'Zero-downtime deployment automation with rollback',
        status: 'idle',
        category: 'Deployment',
        icon: Rocket,
        lastRun: '5 hours ago',
        totalRuns: 287,
        successRate: 99.8,
    },
    {
        id: 'luna-monitoring',
        name: 'luna-monitoring',
        description: 'Real-time performance monitoring and alerting',
        status: 'running',
        category: 'Operations',
        icon: Eye,
        lastRun: 'Always on',
        totalRuns: 12456,
        successRate: 99.9,
    },
    {
        id: 'luna-git',
        name: 'luna-git',
        description: 'Git workflow automation and conflict resolution',
        status: 'idle',
        category: 'Development',
        icon: GitBranch,
        lastRun: '30 min ago',
        totalRuns: 1892,
        successRate: 98.9,
    },
    {
        id: 'luna-cli',
        name: 'luna-cli',
        description: 'Command-line interface tools and automation',
        status: 'idle',
        category: 'Tools',
        icon: Terminal,
        lastRun: '1 hour ago',
        totalRuns: 3421,
        successRate: 99.4,
    },
    {
        id: 'luna-docker',
        name: 'luna-docker',
        description: 'Container orchestration and Docker optimization',
        status: 'idle',
        category: 'DevOps',
        icon: Package,
        lastRun: '4 hours ago',
        totalRuns: 567,
        successRate: 98.7,
    },
];

const categories = ['All', 'Development', 'Testing', 'AI', 'Deployment', 'Security', 'DevOps'];

export default function AgentsPage() {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

    const filteredAgents = agents.filter((agent) => {
        const matchesSearch = agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            agent.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || agent.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    const runningAgents = agents.filter((a) => a.status === 'running').length;

    return (
        <div className="p-6 md:p-8 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold mb-2">AI Agents</h1>
                    <p className="text-neutral-400">
                        Manage and monitor your {agents.length} specialized agents
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="success" className="gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        {runningAgents} Running
                    </Badge>
                    <Button>
                        <Play className="w-4 h-4" />
                        Run All
                    </Button>
                </div>
            </div>

            {/* Filters */}
            <Card className="p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1">
                        <Input
                            placeholder="Search agents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            leftIcon={<Search className="w-4 h-4" />}
                        />
                    </div>

                    {/* Category filter */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
                        {categories.map((category) => (
                            <button
                                key={category}
                                onClick={() => setSelectedCategory(category)}
                                className={cn(
                                    'px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                                    selectedCategory === category
                                        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                )}
                            >
                                {category}
                            </button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Agents Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredAgents.map((agent) => (
                    <Card
                        key={agent.id}
                        className={cn(
                            'p-5 cursor-pointer transition-all',
                            selectedAgent === agent.id && 'ring-2 ring-primary-500'
                        )}
                        onClick={() => setSelectedAgent(agent.id === selectedAgent ? null : agent.id)}
                    >
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="relative">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                        <agent.icon className="w-6 h-6 text-white" />
                                    </div>
                                    <div
                                        className={cn(
                                            'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-neutral-900',
                                            agent.status === 'running' ? 'bg-green-400' : 'bg-neutral-500'
                                        )}
                                    />
                                </div>
                                <div>
                                    <h3 className="font-semibold text-sm">{agent.name}</h3>
                                    <span className="text-xs text-neutral-500">{agent.category}</span>
                                </div>
                            </div>
                            <button className="p-1 rounded hover:bg-neutral-800 transition-colors">
                                <MoreVertical className="w-4 h-4 text-neutral-500" />
                            </button>
                        </div>

                        {/* Description */}
                        <p className="text-sm text-neutral-400 mb-4 line-clamp-2">
                            {agent.description}
                        </p>

                        {/* Stats */}
                        <div className="flex items-center gap-4 text-xs text-neutral-500 mb-4">
                            <div className="flex items-center gap-1.5">
                                <Zap className="w-3.5 h-3.5" />
                                <span>{agent.totalRuns.toLocaleString()} runs</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                                <span>{agent.successRate}% success</span>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                            <div className="flex items-center gap-1.5 text-xs text-neutral-500">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{agent.lastRun}</span>
                            </div>
                            <div className="flex items-center gap-2">
                                {agent.status === 'running' ? (
                                    <Button variant="ghost" size="sm">
                                        <Pause className="w-4 h-4" />
                                        Stop
                                    </Button>
                                ) : (
                                    <Button variant="ghost" size="sm">
                                        <Play className="w-4 h-4" />
                                        Run
                                    </Button>
                                )}
                                <Button variant="ghost" size="icon">
                                    <Settings className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Empty state */}
            {filteredAgents.length === 0 && (
                <div className="text-center py-16">
                    <Cpu className="w-12 h-12 text-neutral-600 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No agents found</h3>
                    <p className="text-neutral-400 mb-6">
                        Try adjusting your search or filter criteria
                    </p>
                    <Button variant="secondary" onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('All');
                    }}>
                        Clear filters
                    </Button>
                </div>
            )}
        </div>
    );
}
