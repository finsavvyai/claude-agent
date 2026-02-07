/** @type {import('next').NextConfig} */
const nextConfig = {
    // Enable React strict mode for better development experience
    reactStrictMode: true,

    // Optimize images with Next.js Image component
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.cloudflare.com',
            },
            {
                protocol: 'https',
                hostname: 'avatars.githubusercontent.com',
            },
            {
                protocol: 'https',
                hostname: 'images.unsplash.com',
            },
        ],
        dangerouslyAllowSVG: true,
        contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    },

    // Enable experimental features
    experimental: {
        // Enable server actions
        serverActions: {
            allowedOrigins: ['localhost:3000', 'claude-agent.dev'],
        },
        // Optimize package imports
        optimizePackageImports: ['lucide-react', '@tanstack/react-query'],
    },

    // Environment variables available on the client
    env: {
        NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://api.claude-agent.dev',
        NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'https://claude-agent.dev',
    },

    // Headers for security
    async headers() {
        return [
            {
                source: '/:path*',
                headers: [
                    {
                        key: 'X-DNS-Prefetch-Control',
                        value: 'on',
                    },
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=63072000; includeSubDomains; preload',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                    {
                        key: 'Permissions-Policy',
                        value: 'camera=(), microphone=(), geolocation=()',
                    },
                ],
            },
        ];
    },

    // Redirects for old URLs
    async redirects() {
        return [
            {
                source: '/home',
                destination: '/',
                permanent: true,
            },
            {
                source: '/documentation',
                destination: '/docs',
                permanent: true,
            },
        ];
    },

    // Webpack configuration
    webpack: (config, { isServer }) => {
        // Optimize bundle size
        if (!isServer) {
            config.resolve.fallback = {
                ...config.resolve.fallback,
                fs: false,
                net: false,
                tls: false,
            };
        }

        return config;
    },

    // Output configuration for deployment
    output: 'standalone',

    // Compress responses
    compress: true,

    // Disable powered by header
    poweredByHeader: false,

    // Generate ETags for caching
    generateEtags: true,
};

export default nextConfig;
