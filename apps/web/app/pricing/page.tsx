import { Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Separator } from '@/components/ui';
import { Check } from 'lucide-react';
import Link from 'next/link';
import React from 'react';

const TIERS = [
    {
        name: 'Starter',
        id: 'starter',
        price: '$0',
        description: 'Perfect for hobbyists and learning.',
        features: [
            '100 operations / day',
            '1 Active Agent',
            'Community Support',
            'Basic Analytics',
        ],
        cta: 'Get Started',
        href: '/auth/signup?plan=starter',
        popular: false,
    },
    {
        name: 'Growth',
        id: 'growth',
        price: '$29',
        description: 'For power users and small teams.',
        features: [
            'Unlimited operations',
            '10 Active Agents',
            'Email Support (24h SLA)',
            'Advanced GLM Visualizer',
            '30-day Retention',
        ],
        cta: 'Start Free Trial',
        href: '/auth/signup?plan=growth',
        popular: true,
    },
    {
        name: 'Scale',
        id: 'scale',
        price: '$79',
        description: 'Everything you need to grow.',
        features: [
            'Unlimited Agents',
            'Team Workspaces',
            'SSO & SAML Login',
            'Priority Support (4h SLA)',
            '90-day Retention',
            'Custom Domain',
        ],
        cta: 'Upgrade to Scale',
        href: '/auth/signup?plan=scale',
        popular: false,
    },
    {
        name: 'Enterprise',
        id: 'enterprise',
        price: 'Custom',
        description: 'Dedicated support and infrastructure.',
        features: [
            'VPC Deployment',
            'Dedicated Success Manager',
            'Custom SLA',
            'Audit Logs',
            'Unlimited Retention',
            'On-premise Option',
        ],
        cta: 'Contact Sales',
        href: '/contact',
        popular: false,
    },
];

export default function PricingPage() {
    return (
        <div className="py-24 sm:py-32">
            <div className="mx-auto max-w-7xl px-6 lg:px-8">
                <div className="mx-auto max-w-4xl text-center">
                    <h2 className="text-base font-semibold leading-7 text-primary-400">Pricing</h2>
                    <p className="mt-2 text-4xl font-bold tracking-tight text-white sm:text-5xl">
                        Choose the right plan for your journey
                    </p>
                    <p className="mt-6 text-lg leading-8 text-neutral-300">
                        Start building sophisticated AI agents today. Upgrade as you scale.
                    </p>
                </div>
                <div className="isolate mx-auto mt-16 grid max-w-md grid-cols-1 gap-y-8 sm:mt-20 lg:mx-0 lg:max-w-none lg:grid-cols-4">
                    {TIERS.map((tier) => (
                        <Card
                            key={tier.id}
                            variant={tier.popular ? 'glass' : 'default'}
                            className={`flex flex-col justify-between ${tier.popular ? 'ring-2 ring-primary-500 shadow-glow' : ''}`}
                        >
                            <CardHeader>
                                <div className="flex items-center justify-between gap-x-4">
                                    <h3
                                        id={tier.id}
                                        className={`text-lg font-semibold leading-8 ${tier.popular ? 'text-primary-400' : 'text-white'}`}
                                    >
                                        {tier.name}
                                    </h3>
                                    {tier.popular && (
                                        <Badge variant="primary" className="rounded-full">
                                            Most Popular
                                        </Badge>
                                    )}
                                </div>
                                <p className="mt-4 text-sm leading-6 text-neutral-300">{tier.description}</p>
                                <p className="mt-6 flex items-baseline gap-x-1">
                                    <span className="text-4xl font-bold tracking-tight text-white">{tier.price}</span>
                                    {tier.price !== 'Custom' && (
                                        <span className="text-sm font-semibold leading-6 text-neutral-400">/month</span>
                                    )}
                                </p>
                            </CardHeader>
                            <CardContent>
                                <ul role="list" className="mt-8 space-y-3 text-sm leading-6 text-neutral-300">
                                    {tier.features.map((feature) => (
                                        <li key={feature} className="flex gap-x-3">
                                            <Check className="h-6 w-5 flex-none text-primary-400" aria-hidden="true" />
                                            {feature}
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                            <div className="p-6 pt-0 mt-auto">
                                <Link href={tier.href} className="w-full">
                                    <Button
                                        variant={tier.popular ? 'primary' : 'secondary'}
                                        className="w-full"
                                        aria-describedby={tier.id}
                                    >
                                        {tier.cta}
                                    </Button>
                                </Link>
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        </div>
    );
}
