import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

// ========================================
// BUTTON COMPONENT
// ========================================

const buttonVariants = cva(
    'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-950 disabled:pointer-events-none disabled:opacity-50',
    {
        variants: {
            variant: {
                primary:
                    'bg-gradient-to-r from-primary-600 to-accent-500 text-white shadow-lg shadow-primary-500/25 hover:shadow-xl hover:shadow-primary-500/30 hover:-translate-y-0.5',
                secondary:
                    'bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/30',
                ghost: 'text-neutral-400 hover:text-white hover:bg-white/5',
                danger:
                    'bg-red-600 text-white hover:bg-red-700 shadow-lg shadow-red-500/25',
                outline:
                    'border border-primary-500/50 text-primary-400 hover:bg-primary-500/10 hover:border-primary-500',
                link: 'text-primary-400 underline-offset-4 hover:underline',
            },
            size: {
                sm: 'h-9 px-3 text-sm',
                md: 'h-10 px-4 text-sm',
                lg: 'h-12 px-6 text-base',
                xl: 'h-14 px-8 text-lg',
                icon: 'h-10 w-10',
            },
        },
        defaultVariants: {
            variant: 'primary',
            size: 'md',
        },
    }
);

export interface ButtonProps
    extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ className, variant, size, isLoading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
        return (
            <button
                className={cn(buttonVariants({ variant, size, className }))}
                ref={ref}
                disabled={disabled || isLoading}
                {...props}
            >
                {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                ) : leftIcon ? (
                    leftIcon
                ) : null}
                {children}
                {!isLoading && rightIcon}
            </button>
        );
    }
);
Button.displayName = 'Button';

// ========================================
// INPUT COMPONENT
// ========================================

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    hint?: string;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
    ({ className, type, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
        const inputId = id || React.useId();

        return (
            <div className="w-full">
                {label && (
                    <label
                        htmlFor={inputId}
                        className="block text-sm font-medium text-neutral-300 mb-1.5"
                    >
                        {label}
                    </label>
                )}
                <div className="relative">
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">
                            {leftIcon}
                        </div>
                    )}
                    <input
                        type={type}
                        id={inputId}
                        className={cn(
                            'flex h-10 w-full rounded-lg bg-white/5 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-neutral-500 transition-all',
                            'focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20',
                            'disabled:cursor-not-allowed disabled:opacity-50',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',
                            error && 'border-red-500 focus:border-red-500 focus:ring-red-500/20',
                            className
                        )}
                        ref={ref}
                        {...props}
                    />
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500">
                            {rightIcon}
                        </div>
                    )}
                </div>
                {error && <p className="mt-1.5 text-sm text-red-400">{error}</p>}
                {hint && !error && <p className="mt-1.5 text-sm text-neutral-500">{hint}</p>}
            </div>
        );
    }
);
Input.displayName = 'Input';

// ========================================
// CARD COMPONENT
// ========================================

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: 'default' | 'glass' | 'solid';
    hover?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
    ({ className, variant = 'glass', hover = false, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'rounded-xl p-6',
                    {
                        glass: 'glass-card',
                        default: 'bg-neutral-900 border border-neutral-800',
                        solid: 'bg-neutral-800',
                    }[variant],
                    hover && 'transition-all hover:-translate-y-1 hover:shadow-glow cursor-pointer',
                    className
                )}
                {...props}
            />
        );
    }
);
Card.displayName = 'Card';

export const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex flex-col space-y-1.5 mb-4', className)} {...props} />
    )
);
CardHeader.displayName = 'CardHeader';

export const CardTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
    ({ className, ...props }, ref) => (
        <h3 ref={ref} className={cn('text-lg font-semibold text-white', className)} {...props} />
    )
);
CardTitle.displayName = 'CardTitle';

export const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
    ({ className, ...props }, ref) => (
        <p ref={ref} className={cn('text-sm text-neutral-400', className)} {...props} />
    )
);
CardDescription.displayName = 'CardDescription';

export const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => <div ref={ref} className={cn('', className)} {...props} />
);
CardContent.displayName = 'CardContent';

export const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({ className, ...props }, ref) => (
        <div ref={ref} className={cn('flex items-center mt-4 pt-4 border-t border-neutral-800', className)} {...props} />
    )
);
CardFooter.displayName = 'CardFooter';

// ========================================
// BADGE COMPONENT
// ========================================

const badgeVariants = cva(
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors',
    {
        variants: {
            variant: {
                default: 'bg-white/10 text-neutral-300 border border-white/10',
                primary: 'bg-primary-500/10 text-primary-400 border border-primary-500/20',
                secondary: 'bg-neutral-800 text-neutral-300',
                success: 'bg-green-500/10 text-green-400 border border-green-500/20',
                warning: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
                danger: 'bg-red-500/10 text-red-400 border border-red-500/20',
                outline: 'border border-neutral-700 text-neutral-300',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface BadgeProps
    extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> { }

export const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
    ({ className, variant, ...props }, ref) => {
        return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
    }
);
Badge.displayName = 'Badge';

// ========================================
// AVATAR COMPONENT
// ========================================

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
    src?: string;
    alt?: string;
    fallback?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
    ({ className, src, alt, fallback, size = 'md', ...props }, ref) => {
        const [hasError, setHasError] = React.useState(false);

        const sizeClasses = {
            sm: 'h-8 w-8 text-xs',
            md: 'h-10 w-10 text-sm',
            lg: 'h-12 w-12 text-base',
            xl: 'h-16 w-16 text-lg',
        };

        return (
            <div
                ref={ref}
                className={cn(
                    'relative flex shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-primary-500 to-accent-500',
                    sizeClasses[size],
                    className
                )}
                {...props}
            >
                {src && !hasError ? (
                    <img
                        src={src}
                        alt={alt}
                        className="aspect-square h-full w-full object-cover"
                        onError={() => setHasError(true)}
                    />
                ) : (
                    <span className="flex h-full w-full items-center justify-center font-medium text-white">
                        {fallback || '?'}
                    </span>
                )}
            </div>
        );
    }
);
Avatar.displayName = 'Avatar';

// ========================================
// SKELETON COMPONENT
// ========================================

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> { }

export const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
    ({ className, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'animate-pulse rounded-md bg-white/10',
                    className
                )}
                {...props}
            />
        );
    }
);
Skeleton.displayName = 'Skeleton';

// ========================================
// SEPARATOR COMPONENT
// ========================================

export interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
    orientation?: 'horizontal' | 'vertical';
}

export const Separator = React.forwardRef<HTMLHRElement, SeparatorProps>(
    ({ className, orientation = 'horizontal', ...props }, ref) => {
        return (
            <hr
                ref={ref}
                className={cn(
                    'border-0 bg-white/10',
                    orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
                    className
                )}
                {...props}
            />
        );
    }
);
Separator.displayName = 'Separator';

// ========================================
// SPINNER COMPONENT
// ========================================

export interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 'md', className }) => {
    const sizeClasses = {
        sm: 'h-4 w-4',
        md: 'h-6 w-6',
        lg: 'h-8 w-8',
    };

    return (
        <Loader2 className={cn('animate-spin text-primary-500', sizeClasses[size], className)} />
    );
};
