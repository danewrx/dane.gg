import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	server: {
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
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
