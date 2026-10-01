import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
// https://vitejs.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    build: {
        chunkSizeWarningLimit: 600,
        rollupOptions: {
            output: {
                manualChunks: {
                    'vendor-react': ['react', 'react-dom', 'react-router-dom'],
                    'vendor-query': ['@tanstack/react-query', '@tanstack/react-table'],
                    'vendor-ui': ['framer-motion', 'lucide-react', 'clsx', 'tailwind-merge', 'class-variance-authority'],
                    'vendor-charts': ['recharts'],
                    'vendor-forms': ['react-hook-form', '@hookform/resolvers', 'zod'],
                    'vendor-radix': [
                        '@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu',
                        '@radix-ui/react-tooltip', '@radix-ui/react-avatar',
                        '@radix-ui/react-checkbox', '@radix-ui/react-label',
                        '@radix-ui/react-separator', '@radix-ui/react-switch',
                        '@radix-ui/react-select', '@radix-ui/react-scroll-area',
                    ],
                    'vendor-misc': ['cmdk', 'sonner', 'date-fns', 'axios'],
                },
            },
        },
    },
});
