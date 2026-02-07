'use client';

import { useState } from 'react';
import {
    User,
    Mail,
    Lock,
    Key,
    Bell,
    Shield,
    CreditCard,
    Users,
    Palette,
    Globe,
    LogOut,
    Save,
    Eye,
    EyeOff,
    Copy,
    RefreshCw,
    Check,
} from 'lucide-react';
import { Button, Card, Input, Badge } from '@/components/ui';
import { useAuthStore, useNotificationStore } from '@/store';
import { cn } from '@/lib/utils';

type SettingsTab = 'profile' | 'security' | 'notifications' | 'billing' | 'team' | 'api';

const tabs = [
    { id: 'profile' as const, label: 'Profile', icon: User },
    { id: 'security' as const, label: 'Security', icon: Shield },
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'billing' as const, label: 'Billing', icon: CreditCard },
    { id: 'team' as const, label: 'Team', icon: Users },
    { id: 'api' as const, label: 'API Keys', icon: Key },
];

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState<SettingsTab>('profile');
    const { user } = useAuthStore();
    const { addNotification } = useNotificationStore();
    const [showApiKey, setShowApiKey] = useState(false);
    const [copied, setCopied] = useState(false);

    const handleCopyApiKey = () => {
        navigator.clipboard.writeText('cap_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx');
        setCopied(true);
        addNotification({ type: 'success', title: 'Copied!', message: 'API key copied to clipboard.' });
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSave = () => {
        addNotification({ type: 'success', title: 'Settings saved', message: 'Your changes have been saved.' });
    };

    return (
        <div className="p-6 md:p-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-2">Settings</h1>
                <p className="text-neutral-400">
                    Manage your account settings and preferences
                </p>
            </div>

            <div className="flex flex-col md:flex-row gap-6">
                {/* Sidebar */}
                <nav className="md:w-48 flex-shrink-0">
                    <div className="flex md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                                    activeTab === tab.id
                                        ? 'bg-primary-500/10 text-primary-400'
                                        : 'text-neutral-400 hover:text-white hover:bg-neutral-800'
                                )}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </nav>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    {/* Profile Tab */}
                    {activeTab === 'profile' && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-6">Profile Information</h2>

                            {/* Avatar */}
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-2xl font-bold">
                                    {user?.name?.slice(0, 2).toUpperCase() || 'U'}
                                </div>
                                <div>
                                    <Button variant="secondary" size="sm">
                                        Change avatar
                                    </Button>
                                    <p className="text-xs text-neutral-500 mt-1">
                                        JPG, PNG or GIF. Max 2MB.
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <Input
                                    label="Full name"
                                    defaultValue={user?.name || ''}
                                    leftIcon={<User className="w-4 h-4" />}
                                />
                                <Input
                                    label="Email address"
                                    type="email"
                                    defaultValue={user?.email || ''}
                                    leftIcon={<Mail className="w-4 h-4" />}
                                />
                                <div>
                                    <label className="block text-sm font-medium text-neutral-300 mb-1.5">
                                        Bio
                                    </label>
                                    <textarea
                                        className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder:text-neutral-500 focus:outline-none focus:border-primary-500 resize-none"
                                        rows={3}
                                        placeholder="Tell us about yourself..."
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end mt-6 pt-6 border-t border-neutral-800">
                                <Button onClick={handleSave}>
                                    <Save className="w-4 h-4" />
                                    Save changes
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Security Tab */}
                    {activeTab === 'security' && (
                        <div className="space-y-6">
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-6">Change Password</h2>
                                <div className="space-y-4">
                                    <Input
                                        label="Current password"
                                        type="password"
                                        leftIcon={<Lock className="w-4 h-4" />}
                                    />
                                    <Input
                                        label="New password"
                                        type="password"
                                        leftIcon={<Lock className="w-4 h-4" />}
                                    />
                                    <Input
                                        label="Confirm new password"
                                        type="password"
                                        leftIcon={<Lock className="w-4 h-4" />}
                                    />
                                </div>
                                <div className="flex justify-end mt-6">
                                    <Button>Update password</Button>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">Two-Factor Authentication</h2>
                                <p className="text-neutral-400 text-sm mb-4">
                                    Add an extra layer of security to your account by enabling two-factor authentication.
                                </p>
                                <Button variant="secondary">Enable 2FA</Button>
                            </Card>

                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">Active Sessions</h2>
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between p-3 rounded-lg bg-neutral-800/50">
                                        <div>
                                            <p className="text-sm font-medium">Current session</p>
                                            <p className="text-xs text-neutral-500">macOS • Chrome • San Francisco, US</p>
                                        </div>
                                        <Badge variant="success">Active</Badge>
                                    </div>
                                </div>
                                <Button variant="ghost" className="mt-4 text-red-400 hover:text-red-300">
                                    <LogOut className="w-4 h-4" />
                                    Sign out all other sessions
                                </Button>
                            </Card>
                        </div>
                    )}

                    {/* Notifications Tab */}
                    {activeTab === 'notifications' && (
                        <Card className="p-6">
                            <h2 className="text-lg font-semibold mb-6">Notification Preferences</h2>

                            <div className="space-y-6">
                                {[
                                    {
                                        title: 'Agent Activity',
                                        description: 'Get notified when agents complete tasks or encounter errors',
                                        enabled: true,
                                    },
                                    {
                                        title: 'Security Alerts',
                                        description: 'Important security notifications about your account',
                                        enabled: true,
                                    },
                                    {
                                        title: 'Usage Reports',
                                        description: 'Weekly summary of your platform usage',
                                        enabled: false,
                                    },
                                    {
                                        title: 'Product Updates',
                                        description: 'News about new features and improvements',
                                        enabled: true,
                                    },
                                    {
                                        title: 'Marketing',
                                        description: 'Tips, offers, and promotional content',
                                        enabled: false,
                                    },
                                ].map((setting) => (
                                    <div key={setting.title} className="flex items-start justify-between">
                                        <div>
                                            <p className="font-medium mb-1">{setting.title}</p>
                                            <p className="text-sm text-neutral-500">{setting.description}</p>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input
                                                type="checkbox"
                                                defaultChecked={setting.enabled}
                                                className="sr-only peer"
                                            />
                                            <div className="w-11 h-6 bg-neutral-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-500"></div>
                                        </label>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end mt-6 pt-6 border-t border-neutral-800">
                                <Button onClick={handleSave}>
                                    <Save className="w-4 h-4" />
                                    Save preferences
                                </Button>
                            </div>
                        </Card>
                    )}

                    {/* Billing Tab */}
                    {activeTab === 'billing' && (
                        <div className="space-y-6">
                            <Card className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h2 className="text-lg font-semibold">Current Plan</h2>
                                        <p className="text-neutral-400 text-sm">You are on the Pro plan</p>
                                    </div>
                                    <Badge variant="primary" className="text-sm">Pro</Badge>
                                </div>

                                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-neutral-800/50 mb-6">
                                    <div>
                                        <p className="text-sm text-neutral-500">Monthly cost</p>
                                        <p className="text-2xl font-bold">$29</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-neutral-500">Next billing date</p>
                                        <p className="text-lg font-medium">Feb 27, 2026</p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <Button variant="secondary">Change plan</Button>
                                    <Button variant="ghost" className="text-red-400 hover:text-red-300">
                                        Cancel subscription
                                    </Button>
                                </div>
                            </Card>

                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">Payment Method</h2>
                                <div className="flex items-center gap-4 p-4 rounded-lg bg-neutral-800/50">
                                    <div className="w-12 h-8 rounded bg-gradient-to-r from-blue-500 to-blue-600 flex items-center justify-center text-xs font-bold">
                                        VISA
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-medium">•••• •••• •••• 4242</p>
                                        <p className="text-sm text-neutral-500">Expires 12/2027</p>
                                    </div>
                                    <Button variant="ghost" size="sm">Edit</Button>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* Team Tab */}
                    {activeTab === 'team' && (
                        <Card className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <div>
                                    <h2 className="text-lg font-semibold">Team Members</h2>
                                    <p className="text-neutral-400 text-sm">Manage your team access</p>
                                </div>
                                <Button>
                                    <Users className="w-4 h-4" />
                                    Invite member
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {[
                                    { name: user?.name || 'You', email: user?.email || '', role: 'Owner', avatar: user?.name?.slice(0, 2).toUpperCase() },
                                    { name: 'Alex Rivera', email: 'alex@company.com', role: 'Admin', avatar: 'AR' },
                                    { name: 'Sarah Chen', email: 'sarah@company.com', role: 'Member', avatar: 'SC' },
                                ].map((member) => (
                                    <div key={member.email} className="flex items-center justify-between p-4 rounded-lg bg-neutral-800/50">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-sm font-medium">
                                                {member.avatar}
                                            </div>
                                            <div>
                                                <p className="font-medium">{member.name}</p>
                                                <p className="text-sm text-neutral-500">{member.email}</p>
                                            </div>
                                        </div>
                                        <Badge variant={member.role === 'Owner' ? 'primary' : 'default'}>
                                            {member.role}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    )}

                    {/* API Keys Tab */}
                    {activeTab === 'api' && (
                        <div className="space-y-6">
                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">API Keys</h2>
                                <p className="text-neutral-400 text-sm mb-6">
                                    Use these keys to authenticate API requests. Keep them secret!
                                </p>

                                <div className="p-4 rounded-lg bg-neutral-800/50 mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">Live API Key</span>
                                        <Badge variant="success">Active</Badge>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <code className="flex-1 px-3 py-2 rounded bg-neutral-900 text-sm font-mono text-neutral-300">
                                            {showApiKey ? 'cap_demo_xxxxxxxxxxxxxxxxxxxxxxxxxxxx' : 'cap_demo_••••••••••••••••••••••••••••'}
                                        </code>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setShowApiKey(!showApiKey)}
                                        >
                                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={handleCopyApiKey}
                                        >
                                            {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                                        </Button>
                                    </div>
                                </div>

                                <Button variant="secondary">
                                    <RefreshCw className="w-4 h-4" />
                                    Regenerate key
                                </Button>
                            </Card>

                            <Card className="p-6">
                                <h2 className="text-lg font-semibold mb-4">Quick Start</h2>
                                <pre className="p-4 rounded-lg bg-neutral-900 text-sm font-mono text-neutral-300 overflow-x-auto">
                                    {`curl -X POST https://api.claude-agent.dev/query \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{"message": "Review my code"}'`}
                                </pre>
                            </Card>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
