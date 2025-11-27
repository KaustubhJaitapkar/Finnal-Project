import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
                port: '',
                pathname: '**',
            },
        ],
    },
    eslint: {
    ignoreDuringBuilds: true,
  },
    // Improve dev performance by ignoring known frequently-written folders
    // (uploads in `public/`, TS buildinfo, .next, etc.) so Next's dev watcher
    // doesn't trigger full rebuilds on those file changes.
    webpackDevMiddleware: (config) => {
        config.watchOptions = {
            ignored: [
                '**/public/uploads/**',
                '**/uploads/**',
                '**/tsconfig.tsbuildinfo',
                '**/.git/**',
                '**/.next/**',
            ],
        };
        return config;
    },
};

export default withSentryConfig(nextConfig, {
    org: process.env.SENTRY_ORG,
    project: process.env.SENTRY_PROJECT,
    silent: !process.env.CI,
    widenClientFileUpload: true,
    hideSourceMaps: true,
    disableLogger: true,
    automaticVercelMonitors: true,
});