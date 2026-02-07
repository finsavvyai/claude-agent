'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Bot,
    LayoutDashboard,
    Cpu,
    BarChart3,
    Settings,
    HelpCircle,
    LogOut,
    Menu,
    X,
    Bell,
    Search,
    Command,
    ChevronDown,
    CreditCard,
    Users,
    Sparkles,
} from 'lucide-react';
import { Button, Avatar, Badge } from '@/components/ui';
import { useAuthStore, useUIStore } from '@/store';
import { cn } from '@/lib/utils';

const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Analysis Engine', href: '/dashboard/visualizer', icon: Sparkles },
    { name: 'Agents', href: '/dashboard/agents', icon: Cpu },
    { name: 'Analytics', href: '/dashboard/analytics', icon: BarChart3 },
    { name: 'Team', href: '/dashboard/team', icon: Users },
    { name: 'Billing', href: '/dashboard/billing', icon: CreditCard },
    { name: 'Settings', href: '/dashboard/settings', icon: Settings },
];

const secondaryNav = [
    { name: 'Documentation', href: '/docs', icon: HelpCircle },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout } = useAuthStore();
    const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUIStore();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isAuthenticated && typeof window !== 'undefined') {
            router.push('/auth/login');
        }
    }, [isAuthenticated, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    return (
        <div className="flex h-screen bg-neutral-950">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-40 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-neutral-900 border-r border-neutral-800 transform transition-transform duration-200 ease-in-out lg:static lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-16 px-4 border-b border-neutral-800">
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <span className="font-bold text-lg">Claude Agent</span>
                        </Link>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden p-1 rounded hover:bg-neutral-800"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Upgrade Banner */}
                    {user?.tier === 'free' && (
                        <div className="p-4 m-4 rounded-lg bg-gradient-to-r from-primary-600/20 to-accent-500/20 border border-primary-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <Sparkles className="w-4 h-4 text-primary-400" />
                                <span className="text-sm font-semibold">Upgrade to Pro</span>
                            </div>
                            <p className="text-xs text-neutral-400 mb-3">
                                Get unlimited queries and all 27 agents.
                            </p>
                            <Button size="sm" className="w-full">
                                Upgrade Now
                            </Button>
                        </div>
                    )}

                    {/* Navigation */}
                    <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                                        isActive
                                            ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20'
                                            : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                    )}
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                    {item.name === 'Agents' && (
                                        <Badge variant="primary" className="ml-auto">
                                            27
                                        </Badge>
                                    )}
                                </Link>
                            );
                        })}

                        <div className="pt-4 mt-4 border-t border-neutral-800">
                            {secondaryNav.map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                >
                                    <item.icon className="w-5 h-5" />
                                    {item.name}
                                </Link>
                            ))}
                        </div>
                    </nav>

                    {/* User menu */}
                    <div className="p-4 border-t border-neutral-800">
                        <div className="flex items-center gap-3">
                            <Avatar
                                src={undefined}
                                fallback={user?.name?.slice(0, 2).toUpperCase() || 'U'}
                                size="sm"
                            />
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                                <p className="text-xs text-neutral-500 truncate">{user?.email}</p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
                                title="Sign out"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-neutral-800 bg-neutral-950">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={toggleSidebar}
                            className="lg:hidden p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800"
                        >
                            <Menu className="w-5 h-5" />
                        </button>

                        {/* Search */}
                        <div className="hidden md:flex items-center gap-2 px-3 py-2 rounded-lg bg-neutral-900 border border-neutral-800 w-80">
                            <Search className="w-4 h-4 text-neutral-500" />
                            <input
                                type="text"
                                placeholder="Search agents, docs..."
                                className="flex-1 bg-transparent text-sm text-white placeholder:text-neutral-500 focus:outline-none"
                            />
                            <kbd className="hidden lg:inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-neutral-800 text-xs text-neutral-400">
                                <Command className="w-3 h-3" />K
                            </kbd>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Usage indicator */}
                        <div className="hidden md:flex items-center gap-2 text-sm">
                            <div className="flex items-center gap-1.5">
                                <div className="w-2 h-2 rounded-full bg-green-400" />
                                <span className="text-neutral-400">
                                    {user?.tier === 'free' ? '73/100' : 'Unlimited'} queries
                                </span>
                            </div>
                        </div>

                        {/* Notifications */}
                        <button className="relative p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-primary-500" />
                        </button>

                        {/* User dropdown (desktop) */}
                        <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-neutral-800">
                            <Avatar
                                src={undefined}
                                fallback={user?.name?.slice(0, 2).toUpperCase() || 'U'}
                                size="sm"
                            />
                            <button className="flex items-center gap-1 text-sm text-neutral-400 hover:text-white">
                                {user?.name?.split(' ')[0] || 'User'}
                                <ChevronDown className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
