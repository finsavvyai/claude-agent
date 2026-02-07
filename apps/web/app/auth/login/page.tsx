'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Bot, Mail, Lock, ArrowRight, Eye, EyeOff, Github } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store';

const loginSchema = z.object({
    email: z.string().email('Please enter a valid email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
    const router = useRouter();
    const { setUser } = useAuthStore();
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema),
    });

    const onSubmit = async (data: LoginFormData) => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await authApi.login(data.email, data.password);

            if (response.success && response.data) {
                setUser(response.data.user);
                router.push('/dashboard');
            } else {
                setError(response.error || 'Login failed');
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
                        <h1 className="text-2xl font-bold mb-2">Welcome back</h1>
                        <p className="text-neutral-400">Sign in to your account to continue</p>
                    </div>

                    {/* Social Login */}
                    <div className="space-y-3 mb-6">
                        <Button variant="secondary" className="w-full" type="button">
                            <Github className="w-5 h-5" />
                            Continue with GitHub
                        </Button>
                        <Button variant="secondary" className="w-full" type="button">
                            <svg className="w-5 h-5" viewBox="0 0 24 24">
                                <path
                                    fill="currentColor"
                                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                />
                                <path
                                    fill="currentColor"
                                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                />
                            </svg>
                            Continue with Google
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

                    {/* Login Form */}
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <Input
                            {...register('email')}
                            label="Email"
                            type="email"
                            placeholder="you@example.com"
                            leftIcon={<Mail className="w-4 h-4" />}
                            error={errors.email?.message}
                            autoComplete="email"
                        />

                        <div className="relative">
                            <Input
                                {...register('password')}
                                label="Password"
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                leftIcon={<Lock className="w-4 h-4" />}
                                error={errors.password?.message}
                                autoComplete="current-password"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-9 text-neutral-500 hover:text-white transition-colors"
                            >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 rounded border-neutral-700 bg-neutral-800 text-primary-500 focus:ring-primary-500"
                                />
                                <span className="text-neutral-400">Remember me</span>
                            </label>
                            <Link href="/auth/forgot-password" className="text-primary-400 hover:text-primary-300">
                                Forgot password?
                            </Link>
                        </div>

                        <Button type="submit" className="w-full" isLoading={isLoading}>
                            Sign in
                            <ArrowRight className="w-4 h-4" />
                        </Button>
                    </form>
                </Card>

                {/* Sign up link */}
                <p className="text-center mt-6 text-neutral-400">
                    Don&apos;t have an account?{' '}
                    <Link href="/auth/signup" className="text-primary-400 hover:text-primary-300 font-medium">
                        Sign up for free
                    </Link>
                </p>
            </div>
        </div>
    );
}
