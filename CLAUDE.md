# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Stack

SvelteKit 3 + Svelte 5 (runes forced on for all project files via `vite.config.ts`) + TypeScript (strict) + Tailwind CSS v4 (Vite plugin, no `tailwind.config`). Deployed with `@sveltejs/adapter-bun`. Package manager is **bun** (`bun.lock`; `.npmrc` sets `engine-strict=true`). Project scaffolded with `sv` (minimal template).

## Commands

```sh
bun install
bun run dev            # vite dev server (add `-- --open` to open browser)
bun run build          # production build (runs vite under Bun; adapter-bun refuses Node)
bun run start          # serve ./build (adapter-bun needs Bun >= 1.4)
bun run preview        # preview production build
bun run check          # svelte-kit sync + svelte-check (type checking)
bun run lint           # prettier --check + eslint
bun run format         # prettier --write
```

No test runner is configured.

## Conventions

- Import alias is `#lib` (Node subpath imports in `package.json`), not `$lib`: `#lib` → `src/lib/index.js`, `#lib/*` → `src/lib/*`.
- Use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`); typed props via `./$types` (e.g. `LayoutProps`).
- Prettier: tabs, single quotes, no trailing commas, printWidth 100, Tailwind class sorting (uses `src/routes/layout.css` as stylesheet).
- `cn` helper re-exported from the `cn` package in `src/lib/utils.ts`.

## Styling / theming

- All global CSS lives in `src/routes/layout.css` (imported by `src/routes/+layout.svelte`): Tailwind, `tw-animate-css`, `shadcn/tailwind.css`, Geist variable font, `@tailwindcss/forms` + `typography` plugins.
- shadcn-style design tokens: CSS variables (oklch) on `:root` and `.dark`, mapped to Tailwind colors via `@theme inline`. Dark mode is class-based (`@custom-variant dark (&:is(.dark *))`). Use semantic classes (`bg-background`, `text-muted-foreground`, etc.) rather than raw colors.

## Neon backend

Linked to Neon project `round-scene-22235664`, branch `production` (`.neon`, gitignored). `neon.ts` is infrastructure-as-code: declares bucket `assets` (private) and function `hello` (`hello.ts`). `neon deploy` applies it and pulls env vars into `.env.local`; `neon env pull` refreshes them.

- Env vars are declared in `src/env.ts` via `defineEnvVars` (SvelteKit 3 API) and imported from `$app/env/private` (not `$env/...`). Add new vars there.
- Postgres: `src/lib/server/db.ts`, `pg` Pool on pooled `DATABASE_URL` (long-running Bun server, per Neon skill). Use `DATABASE_URL_UNPOOLED` for migrations.
- Object Storage: `src/lib/server/storage.ts`, AWS S3 client, explicit creds, `forcePathStyle: true` (required).
- Functions: `src/lib/server/functions.ts`, fetch `NEON_FUNCTION_HELLO_BASE_URL`.
- Smoke-test routes: `GET /api/neon/{db,storage,function}`. The db one creates/inserts into a `healthchecks` table.
- Neon agent skills (`neon`, `neon-postgres`, `neon-object-storage`, `neon-functions`) are installed as a Claude Code plugin; consult them for Neon work.

## Known inconsistencies (check before relying on them)

- `components.json` (shadcn) is configured for **React** (`tsx: true`, `@base-ui/react`, `lucide-react` in deps), which does not match this Svelte project. Its `utils` alias (`#lib/lib/utils`) also doesn't match the real path (`#lib/utils`). Don't run `shadcn add` expecting Svelte output.
- `tw-animate-css` is imported by file path in `layout.css` because its package exports only a `style` condition, which Tailwind 4.3's resolver ignores (bare `@import "tw-animate-css"` breaks the build).
- `src/$lib/components/svelte-bits/Aurora.svelte` sits in a literal `src/$lib/` directory, outside `src/lib/`, so it is not reachable via `#lib`. It's a WebGL (`ogl`) aurora background component.
