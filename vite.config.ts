import tailwindcss from '@tailwindcss/vite';
import bunAdapter from '@sveltejs/adapter-bun';
import vercelAdapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	// sanitize-html require()s the ESM-only htmlparser2; Vercel's Node loader rejects that
	// (ERR_REQUIRE_ESM), so bundle it into the server output instead of loading it at runtime.
	ssr: {
		noExternal: [
			'sanitize-html',
			'htmlparser2',
			'domhandler',
			'domutils',
			'dom-serializer',
			'domelementtype',
			'entities',
			// CJS deps too: left external, they are require()d at runtime and Vercel's file
			// tracer misses them ("Cannot find module").
			'escape-string-regexp',
			'is-plain-object',
			'parse-srcset',
			'postcss',
			'launder',
			'dayjs',
			'nanoid',
			'picocolors',
			'source-map-js'
		]
	},
	plugins: [
		tailwindcss(),
		sveltekit({
			compilerOptions: {
				// Force runes mode for the project, except for libraries. Can be removed in svelte 6.
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			// Vercel sets VERCEL=1 during its builds; everywhere else we build the Bun server.
			adapter: process.env.VERCEL ? vercelAdapter({ runtime: 'nodejs22.x' }) : bunAdapter(),
			// Nonce-based CSP for scripts. Inline style attributes are allowed because Svelte and our
			// motion components set CSS variables via `style=`. Turnstile is the only third party.
			csp: {
				mode: 'auto',
				directives: {
					'default-src': ['self'],
					'script-src': ['self', 'https://challenges.cloudflare.com'],
					'style-src': ['self', 'unsafe-inline'],
					'img-src': ['self', 'data:', 'blob:'],
					'font-src': ['self'],
					'connect-src': ['self'],
					'frame-src': ['https://challenges.cloudflare.com'],
					'frame-ancestors': ['none'],
					'form-action': ['self'],
					'base-uri': ['self'],
					'object-src': ['none']
				}
			}
		})
	]
});
