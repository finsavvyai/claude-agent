import Link from 'next/link';
import {
    Sparkles,
    Zap,
    Shield,
    Code2,
    Cpu,
    Users,
    ArrowRight,
    Check,
    Star,
    ChevronRight,
    Play,
    Terminal,
    GitBranch,
    Bot,
    Layers,
    BarChart3,
    Lock,
    Cloud
} from 'lucide-react';

// ========================================
// NAVIGATION COMPONENT
// ========================================
function Navigation() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/5">
            <div className="container">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <Bot className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-lg">Claude Agent</span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="hidden md:flex items-center gap-1">
                        <Link href="#features" className="nav-link">Features</Link>
                        <Link href="#pricing" className="nav-link">Pricing</Link>
                        <Link href="#docs" className="nav-link">Docs</Link>
                        <Link href="#api" className="nav-link">API</Link>
                    </div>

                    {/* CTA Buttons */}
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
                            Sign in
                        </Link>
                        <Link href="/signup" className="btn btn-primary btn-sm">
                            Get Started
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>
                </div>
            </div>
        </nav>
    );
}

// ========================================
// HERO SECTION
// ========================================
function HeroSection() {
    return (
        <section className="relative pt-32 pb-20 overflow-hidden">
            <div className="container">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className="inline-flex items-center gap-2 badge badge-primary mb-6 animate-fade-in-down">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Now with Luna Agents 2.0</span>
                    </div>

                    {/* Main Heading */}
                    <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold mb-6 animate-fade-in-up opacity-0"
                        style={{ animationDelay: '100ms', animationFillMode: 'forwards' }}>
                        AI-Powered Development
                        <br />
                        <span className="text-gradient">At Your Fingertips</span>
                    </h1>

                    {/* Subheading */}
                    <p className="text-xl md:text-2xl text-neutral-400 mb-10 max-w-2xl mx-auto animate-fade-in-up opacity-0 text-balance"
                        style={{ animationDelay: '200ms', animationFillMode: 'forwards' }}>
                        Transform your workflow with 27 specialized AI agents. Automate code reviews,
                        testing, deployment, and more—all running on-device or in the cloud.
                    </p>

                    {/* CTA Buttons */}
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4 animate-fade-in-up opacity-0"
                        style={{ animationDelay: '300ms', animationFillMode: 'forwards' }}>
                        <Link href="/signup" className="btn btn-primary btn-lg">
                            Start Free Trial
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href="#demo" className="btn btn-secondary btn-lg">
                            <Play className="w-5 h-5" />
                            Watch Demo
                        </Link>
                    </div>

                    {/* Social Proof */}
                    <div className="mt-16 animate-fade-in opacity-0"
                        style={{ animationDelay: '500ms', animationFillMode: 'forwards' }}>
                        <div className="flex items-center justify-center gap-8 text-sm text-neutral-500">
                            <div className="flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-400 to-accent-400 border-2 border-neutral-950"
                                        />
                                    ))}
                                </div>
                                <span>10,000+ developers</span>
                            </div>
                            <div className="hidden sm:flex items-center gap-1">
                                {[1, 2, 3, 4, 5].map((i) => (
                                    <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                                ))}
                                <span className="ml-2">4.9/5 rating</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Hero Visual - Code Preview */}
                <div className="mt-20 max-w-5xl mx-auto animate-scale-in opacity-0"
                    style={{ animationDelay: '400ms', animationFillMode: 'forwards' }}>
                    <div className="glass-card p-1 overflow-hidden">
                        <div className="bg-neutral-950 rounded-lg overflow-hidden">
                            {/* Terminal header */}
                            <div className="flex items-center gap-2 px-4 py-3 bg-neutral-900 border-b border-neutral-800">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                                </div>
                                <span className="text-sm text-neutral-500 ml-2 font-mono">luna-agents</span>
                            </div>

                            {/* Terminal content */}
                            <div className="p-6 font-mono text-sm">
                                <div className="text-neutral-500 mb-2"># Initialize Luna Agents</div>
                                <div className="flex items-center gap-2 text-green-400 mb-4">
                                    <span className="text-primary-400">$</span>
                                    <span>npx luna-agents init my-project</span>
                                </div>

                                <div className="text-neutral-500 mb-2"># Run AI-powered code review</div>
                                <div className="flex items-center gap-2 text-green-400 mb-4">
                                    <span className="text-primary-400">$</span>
                                    <span>luna review --ai-powered</span>
                                </div>

                                <div className="space-y-1 text-neutral-400">
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Analyzing 247 files...</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Found 12 potential improvements</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Check className="w-4 h-4 text-green-400" />
                                        <span>Security scan: <span className="text-green-400">Passed</span></span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Zap className="w-4 h-4 text-amber-400" />
                                        <span className="text-amber-400">Report generated in 3.2s</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ========================================
// FEATURES SECTION
// ========================================
function FeaturesSection() {
    const features = [
        {
            icon: Code2,
            title: 'AI Code Review',
            description: 'Automated code reviews with intelligent suggestions for improving quality, security, and performance.',
        },
        {
            icon: Terminal,
            title: 'Smart Testing',
            description: 'Generate comprehensive test suites automatically. Unit tests, integration tests, and E2E coverage.',
        },
        {
            icon: GitBranch,
            title: 'CI/CD Automation',
            description: 'Zero-downtime deployments with intelligent rollback and canary releases.',
        },
        {
            icon: Cpu,
            title: 'On-Device AI',
            description: 'Run models locally with Nexa SDK. CUDA, Metal, Vulkan, and NPU support.',
        },
        {
            icon: Layers,
            title: 'RAG Integration',
            description: 'Advanced context retrieval and token optimization for better AI responses.',
        },
        {
            icon: Users,
            title: 'Team Collaboration',
            description: 'Shared workspaces, team analytics, and collaborative knowledge bases.',
        },
        {
            icon: Shield,
            title: 'Enterprise Security',
            description: 'SOC 2 compliant. RBAC, SSO, and audit logs. Your code never leaves your infrastructure.',
        },
        {
            icon: Cloud,
            title: 'Edge Deployment',
            description: 'Deploy to Cloudflare Workers for global distribution with automatic scaling.',
        },
    ];

    return (
        <section id="features" className="section">
            <div className="container">
                <div className="section-header">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Everything You Need to
                        <br />
                        <span className="text-gradient">Ship Faster</span>
                    </h2>
                    <p className="text-xl text-neutral-400">
                        27 specialized agents working together to automate your entire development lifecycle.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {features.map((feature, index) => (
                        <div
                            key={feature.title}
                            className="glass-card feature-card"
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="feature-icon">
                                <feature.icon className="w-6 h-6 text-white" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">{feature.title}</h3>
                            <p className="text-neutral-400 text-sm">{feature.description}</p>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ========================================
// AGENTS SHOWCASE
// ========================================
function AgentsSection() {
    const agents = [
        { name: 'luna-code-review', description: 'Automated code reviews with security checks', icon: '🔍' },
        { name: 'luna-testing', description: 'Generate and run comprehensive test suites', icon: '🧪' },
        { name: 'luna-deployment', description: 'Zero-downtime deployment automation', icon: '🚀' },
        { name: 'luna-rag', description: 'Advanced RAG with token optimization', icon: '🧠' },
        { name: 'luna-cloudflare', description: 'Edge deployment and migration', icon: '☁️' },
        { name: 'luna-docker', description: 'Container orchestration and optimization', icon: '🐳' },
    ];

    return (
        <section className="section bg-neutral-950/50">
            <div className="container">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    {/* Left side - Content */}
                    <div className="flex-1">
                        <h2 className="text-4xl md:text-5xl font-bold mb-6">
                            27 Specialized
                            <br />
                            <span className="text-gradient">AI Agents</span>
                        </h2>
                        <p className="text-xl text-neutral-400 mb-8">
                            Each agent is an expert in its domain, trained on millions of lines of code
                            and best practices. They work together seamlessly to automate your workflow.
                        </p>

                        <div className="space-y-4">
                            {agents.map((agent) => (
                                <div
                                    key={agent.name}
                                    className="flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors cursor-pointer group"
                                >
                                    <span className="text-2xl">{agent.icon}</span>
                                    <div className="flex-1">
                                        <code className="text-sm text-primary-400">{agent.name}</code>
                                        <p className="text-sm text-neutral-400">{agent.description}</p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-neutral-600 group-hover:text-primary-400 transition-colors" />
                                </div>
                            ))}
                        </div>

                        <Link href="/docs/agents" className="btn btn-secondary mt-8">
                            View all 27 agents
                            <ArrowRight className="w-4 h-4" />
                        </Link>
                    </div>

                    {/* Right side - Visual */}
                    <div className="flex-1 w-full">
                        <div className="glass-card p-8">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <h4 className="font-semibold">luna-code-review</h4>
                                    <p className="text-sm text-neutral-500">Agent Active</p>
                                </div>
                                <div className="ml-auto flex items-center gap-2 text-sm text-green-400">
                                    <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                                    Running
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-900/50">
                                    <div className="w-2 h-2 rounded-full bg-amber-400 mt-2" />
                                    <div>
                                        <p className="text-sm font-medium">Performance Issue</p>
                                        <p className="text-sm text-neutral-400">
                                            Consider using <code className="text-primary-400">useMemo</code> for expensive computation in line 42
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-900/50">
                                    <div className="w-2 h-2 rounded-full bg-green-400 mt-2" />
                                    <div>
                                        <p className="text-sm font-medium">Best Practice</p>
                                        <p className="text-sm text-neutral-400">
                                            Good use of TypeScript generics for type safety
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 p-4 rounded-lg bg-neutral-900/50">
                                    <div className="w-2 h-2 rounded-full bg-red-400 mt-2" />
                                    <div>
                                        <p className="text-sm font-medium">Security Alert</p>
                                        <p className="text-sm text-neutral-400">
                                            Potential SQL injection vulnerability detected
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-neutral-800 flex items-center justify-between">
                                <div className="text-sm text-neutral-400">
                                    <span className="text-white font-medium">247</span> files analyzed
                                </div>
                                <div className="text-sm text-neutral-400">
                                    <span className="text-green-400 font-medium">98%</span> passing
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ========================================
// PRICING SECTION
// ========================================
function PricingSection() {
    const plans = [
        {
            name: 'Free',
            price: '$0',
            period: 'forever',
            description: 'Perfect for trying out Luna Agents',
            features: [
                '100 AI queries per day',
                '1 active agent',
                'Community support',
                'Basic analytics',
                'Public repositories only',
            ],
            cta: 'Get Started',
            ctaStyle: 'btn-secondary',
        },
        {
            name: 'Pro',
            price: '$29',
            period: '/month',
            description: 'For individual developers and small teams',
            features: [
                'Unlimited AI queries',
                'All 27 agents',
                'Priority support',
                'Advanced analytics',
                'Private repositories',
                'Team collaboration',
                'API access',
            ],
            cta: 'Start Free Trial',
            ctaStyle: 'btn-primary',
            popular: true,
        },
        {
            name: 'Enterprise',
            price: 'Custom',
            period: '',
            description: 'For large organizations with advanced needs',
            features: [
                'Everything in Pro',
                'Dedicated support',
                'Custom integrations',
                'SLA guarantee',
                'On-premise deployment',
                'SSO & SAML',
                'Audit logs',
                'Custom agents',
            ],
            cta: 'Contact Sales',
            ctaStyle: 'btn-secondary',
        },
    ];

    return (
        <section id="pricing" className="section">
            <div className="container">
                <div className="section-header">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4">
                        Simple, Transparent
                        <br />
                        <span className="text-gradient">Pricing</span>
                    </h2>
                    <p className="text-xl text-neutral-400">
                        Start free, scale as you grow. No hidden fees.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                    {plans.map((plan) => (
                        <div
                            key={plan.name}
                            className={`glass-card pricing-card ${plan.popular ? 'popular ring-2 ring-primary-500/50' : ''}`}
                        >
                            <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
                            <div className="mb-4">
                                <span className="text-4xl font-bold">{plan.price}</span>
                                <span className="text-neutral-400">{plan.period}</span>
                            </div>
                            <p className="text-neutral-400 text-sm mb-6">{plan.description}</p>

                            <ul className="space-y-3 mb-8 text-left">
                                {plan.features.map((feature) => (
                                    <li key={feature} className="flex items-center gap-2 text-sm">
                                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                                        <span className="text-neutral-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>

                            <button className={`btn ${plan.ctaStyle} w-full`}>
                                {plan.cta}
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ========================================
// STATS SECTION
// ========================================
function StatsSection() {
    const stats = [
        { value: '10K+', label: 'Developers' },
        { value: '1M+', label: 'Code Reviews' },
        { value: '99.9%', label: 'Uptime' },
        { value: '< 50ms', label: 'Response Time' },
    ];

    return (
        <section className="py-20 border-y border-white/5">
            <div className="container">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                    {stats.map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-4xl md:text-5xl font-bold text-gradient mb-2">
                                {stat.value}
                            </div>
                            <div className="text-neutral-400">{stat.label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}

// ========================================
// CTA SECTION
// ========================================
function CTASection() {
    return (
        <section className="section">
            <div className="container">
                <div className="glass-card p-12 md:p-16 text-center max-w-4xl mx-auto">
                    <h2 className="text-4xl md:text-5xl font-bold mb-6">
                        Ready to Transform Your
                        <br />
                        <span className="text-gradient">Development Workflow?</span>
                    </h2>
                    <p className="text-xl text-neutral-400 mb-10 max-w-2xl mx-auto">
                        Join 10,000+ developers who are shipping faster with AI-powered agents.
                        Start your free trial today—no credit card required.
                    </p>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/signup" className="btn btn-primary btn-lg">
                            Start Free Trial
                            <ArrowRight className="w-5 h-5" />
                        </Link>
                        <Link href="/docs" className="btn btn-secondary btn-lg">
                            Read the Docs
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}

// ========================================
// FOOTER
// ========================================
function Footer() {
    const footerLinks = [
        {
            title: 'Product',
            links: [
                { label: 'Features', href: '#features' },
                { label: 'Pricing', href: '#pricing' },
                { label: 'Agents', href: '/agents' },
                { label: 'Enterprise', href: '/enterprise' },
            ],
        },
        {
            title: 'Resources',
            links: [
                { label: 'Documentation', href: '/docs' },
                { label: 'API Reference', href: '/api' },
                { label: 'Blog', href: '/blog' },
                { label: 'Changelog', href: '/changelog' },
            ],
        },
        {
            title: 'Company',
            links: [
                { label: 'About', href: '/about' },
                { label: 'Careers', href: '/careers' },
                { label: 'Contact', href: '/contact' },
                { label: 'Press Kit', href: '/press' },
            ],
        },
        {
            title: 'Legal',
            links: [
                { label: 'Privacy Policy', href: '/privacy' },
                { label: 'Terms of Service', href: '/terms' },
                { label: 'Cookie Policy', href: '/cookies' },
                { label: 'Security', href: '/security' },
            ],
        },
    ];

    return (
        <footer className="border-t border-white/5 pt-16 pb-8">
            <div className="container">
                <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-16">
                    {/* Brand */}
                    <div className="col-span-2 md:col-span-1">
                        <Link href="/" className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-lg">Claude Agent</span>
                        </Link>
                        <p className="text-sm text-neutral-500">
                            AI-powered development lifecycle management.
                        </p>
                    </div>

                    {/* Links */}
                    {footerLinks.map((section) => (
                        <div key={section.title}>
                            <h4 className="font-semibold text-sm mb-4">{section.title}</h4>
                            <ul className="space-y-2">
                                {section.links.map((link) => (
                                    <li key={link.label}>
                                        <Link
                                            href={link.href}
                                            className="text-sm text-neutral-500 hover:text-white transition-colors"
                                        >
                                            {link.label}
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                {/* Bottom */}
                <div className="flex flex-col md:flex-row items-center justify-between pt-8 border-t border-white/5">
                    <p className="text-sm text-neutral-500">
                        © {new Date().getFullYear()} Claude Agent Platform. All rights reserved.
                    </p>
                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                        <Link href="https://twitter.com" className="text-neutral-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                            </svg>
                        </Link>
                        <Link href="https://github.com" className="text-neutral-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
                            </svg>
                        </Link>
                        <Link href="https://discord.com" className="text-neutral-500 hover:text-white transition-colors">
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189z" />
                            </svg>
                        </Link>
                    </div>
                </div>
            </div>
        </footer>
    );
}

// ========================================
// MAIN PAGE
// ========================================
export default function HomePage() {
    return (
        <main>
            <Navigation />
            <HeroSection />
            <FeaturesSection />
            <AgentsSection />
            <StatsSection />
            <PricingSection />
            <CTASection />
            <Footer />
        </main>
    );
}
