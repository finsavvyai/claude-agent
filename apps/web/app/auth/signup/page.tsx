'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Mail, Lock, User, ArrowRight, Eye, EyeOff, Check, Github } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';

const signupSchema = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
        .regex(/[0-9]/, 'Password must contain at least one number'),
    terms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
});

type SignupFormData = z.infer<typeof signupSchema>;

const passwordRequirements = [
    { label: 'At least 8 characters', regex: /.{8,}/ },
    { label: 'One uppercase letter', regex: /[A-Z]/ },
    { label: 'One number', regex: /[0-9]/ },
];

export default function SignupPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SignupFormData>({
        resolver: zodResolver(signupSchema),
    });

    const password = watch('password', '');

    const onSubmit = async (data: SignupFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await authApi.signup(data.email, data.password, data.name);

            if (response.success && response.data) {
                setUser(response.data.user);
                router.push('/dashboard');
            } else {
                setError(response.error || 'Signup failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="w-full max-w-md">
                {/* Logo */}
                <div className="text-center mb-8">
                    <Link href="/" className="inline-flex items-center gap-2">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
                            <Bot className="w-6 h-6 text-white" />
                        </div>
                        <span className="font-bold text-xl">Claude Agent</span>
                    </Link>
                </div>

                <Card className="p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold mb-2">Create your account</h1>
                        <p className="text-neutral-400">Start your 14-day free trial</p>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3 mb-6">
                        <Button variant="secondary" className="w-full" type="button">
                            <Github className="w-5 h-5" />
                            Continue with GitHub
                        </Button>
                    </div>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-neutral-800" />
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-4 bg-neutral-900 text-neutral-500">or continue with email</span>
                        </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Signup Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            {...register('name')}
                            label="Full name"
                            type="text"
                            placeholder="John Doe"
                            leftIcon={<User className="w-4 h-4" />}
                            error={errors.name?.message}
                            autoComplete="name"
                        />

                        <Input
                            {...register('email')}
                            label="Work email"
                            type="email"
                            placeholder="you@company.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            error={errors.email?.message}
                            autoComplete="email"
                        />

                        <div className="relative">
                            <Input
                                {...register('password')}
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="Create a strong password"
                                leftIcon={<Lock className="w-4 h-4" />}
                                error={errors.password?.message}
                                autoComplete="new-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-neutral-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        {/* Password requirements */}
                        <div className="space-y-2">
                            {passwordRequirements.map(({ label, regex }) => {
                                const met = regex.test(password);
                                return (
                                    <div
                                        key={label}
                                        className={`flex items-center gap-2 text-sm ${met ? 'text-green-400' : 'text-neutral-500'
                                            }`}
                                    >
                                        <Check className={`w-4 h-4 ${met ? 'opacity-100' : 'opacity-30'}`} />
                                        {label}
                                    </div>
                                );
                            })}
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer">
                            <input
                                type="checkbox"
                                {...register('terms')}
                                className="mt-1 w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-primary-500 focus:ring-primary-500"
                            />
                            <span className="text-sm text-neutral-400">
                                I agree to the{' '}
                                <Link href="/terms" className="text-primary-400 hover:underline">
                                    Terms of Service
                                </Link>{' '}
                                and{' '}
                                <Link href="/privacy" className="text-primary-400 hover:underline">
                                    Privacy Policy
                                </Link>
                            </span>
                        </label>
                        {errors.terms && (
                            <p className="text-sm text-red-400">{errors.terms.message}</p>
                        )}

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Create account
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>

                    {/* Features list */}
                    <div className="mt-6 pt-6 border-t border-neutral-800">
                        <p className="text-sm text-neutral-400 mb-3">Included in your free trial:</p>
                        <ul className="space-y-2 text-sm">
                            {[
                                'Access to all 27 AI agents',
                                'Unlimited code reviews',
                                'Team collaboration',
                                'No credit card required',
                            ].map((feature) => (
                                <li key={feature} className="flex items-center gap-2 text-neutral-300">
                                    <Check className="w-4 h-4 text-green-400" />
                                    {feature}
                                </li>
                            ))}
                        </ul>
                    </div>
                </Card>

                {/* Sign in link */}
                <p className="text-center mt-6 text-neutral-400">
                    Already have an account?{' '}
                    <Link href="/auth/login" className="text-primary-400 hover:text-primary-300 font-medium">
                        Sign in
                    </Link>
                </p>
            </div>
        </div>
    );
}
