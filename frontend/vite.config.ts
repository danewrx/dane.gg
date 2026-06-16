import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	plugins: [sveltekit()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		environment: 'node',
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov'],
			reportsDirectory: './coverage',
			include: ['src/**/*.{ts,svelte}'],
			exclude: [
				'**/*.test.{ts,tsx}',
				'**/*.spec.{ts,tsx}',
				'**/node_modules/**',
				'.svelte-kit/**'
			]
		}
	},
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false
			},
			'/ws': {
				target: 'http://localhost:3001',
				ws: true,
				changeOrigin: true,
				secure: false
			},
			'/emojis': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false
			},
			'/chat-sounds': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false
			},
			'/uploads': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false
			},
			'/webhooks': {
				target: 'http://localhost:3001',
				changeOrigin: true,
				secure: false
			}
		}
	},
	optimizeDeps: {
		include: ['svelte-sonner']
	},
	ssr: {
		noExternal: ['svelte-sonner']
	}
});
