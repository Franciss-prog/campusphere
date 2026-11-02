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

```sh
bun run test           # vitest unit tests (src/**/*.test.ts)
bun run test:db        # DB integration tests (*.db.test.ts, Neon dev branch only)
bun run test:e2e       # Playwright smoke + axe a11y (CHROMIUM_PATH=/usr/bin/chromium)
```

See `docs/PLAN.md` for architecture, data model, route map and phases, and `docs/DEPLOYMENT.md` for production.

## Conventions

- Import alias is `#lib` (Node subpath imports in `package.json`), not `$lib`: `#lib` → `src/lib/index.js`, `#lib/*` → `src/lib/*`. Subpath imports do not add extensions: write `#lib/status.ts`, `#lib/components/ui/Icon.svelte`.
- SvelteKit 3 module names: `$app/env` (browser, dev), `$app/state`, `$app/env/private|public`. There is no `$app/environment`.
- Use Svelte 5 runes (`$props`, `$state`, `$derived`, `$effect`); typed props via `./$types` (e.g. `LayoutProps`).
- Prettier: tabs, single quotes, no trailing commas, printWidth 100, Tailwind class sorting (uses `src/routes/layout.css` as stylesheet).
- `cn` helper re-exported from the `cn` package in `src/lib/utils.ts`.

## Styling / theming

- All global CSS lives in `src/routes/layout.css`: Tailwind, `tw-animate-css`, `shadcn/tailwind.css`, Inter + Lora (`@fontsource-variable`), self-hosted TeX Gyre Adventor (`static/fonts`, display only), `@tailwindcss/forms` (class strategy) + `typography`.
- Campusphere tokens (`--red`, `--deep`, `--rose`, `--line`, `--ink`, `--muted`, `--faint`, status `--s-*`) on `:root`, exposed as Tailwind colors (`bg-red`, `text-ink`, ...). shadcn semantic tokens are mapped onto them. Light theme only (no dark mode in the design).
- Shared component classes ported from the design prototype live in `@layer components` (`.btn .btn-p/-o/-w`, `.st[data-s]`, `.sup`, `.card`, `.panel`, `.tabs`, `.t`, `.f`, `.input`, `.notice`, `.empty`, `.disp`). Page-specific styles go in component `<style>`.
- Svelte Bits components are vendored in `src/lib/components/svelte-bits/` (Magnet, CountUp) and used only through wrappers in `src/lib/components/motion/`. Every effect must respect `prefers-reduced-motion`.

## Neon backend

Linked to Neon project `round-scene-22235664`. Local dev is pinned to branch `dev` (created from `neon.ts`, 7-day TTL; recreate with `neon checkout dev --create --env .env.local`); `production` holds no sample data (`.neon`, gitignored). `neon.ts` is infrastructure-as-code: declares bucket `assets` (private) and function `hello` (`hello.ts`). `neon deploy` applies it and pulls env vars into `.env.local`; `neon env pull` refreshes them.

- Env vars are declared in `src/env.ts` via `defineEnvVars` (SvelteKit 3 API) and imported from `$app/env/private` (not `$env/...`). Add new vars there.
- Postgres: Drizzle ORM. Schema `src/lib/server/db/schema.ts` (camelCase keys, `casing: 'snake_case'`). App access: `db()` / `pool()` from `#lib/server/db/index.ts` (pooled `DATABASE_URL`). Scripts and tests use the framework-free `createDb()` in `db/client.ts`.
- Migrations: edit schema, then `bun run db:generate` (writes `drizzle/`) and `bun run db:migrate` (uses `DATABASE_URL_UNPOOLED`). Seed: `bun run db:seed [--reset|--base]` (sample rows have `source = 'seed'`; refuses on `production` without `--allow-production`). First admin: `bun run db:seed-admin` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
- Smoke-test routes under `/api/neon/*` return 404 outside `dev`.
- Object Storage: `src/lib/server/storage.ts`, AWS S3 client, explicit creds, `forcePathStyle: true` (required).
- Functions: `src/lib/server/functions.ts`, fetch `NEON_FUNCTION_HELLO_BASE_URL`.
- Neon agent skills (`neon`, `neon-postgres`, `neon-object-storage`, `neon-functions`) are installed as a Claude Code plugin; consult them for Neon work.

## Known inconsistencies (check before relying on them)

- `components.json` (shadcn) is configured for **React** (`tsx: true`, `@base-ui/react`, `lucide-react` in deps), which does not match this Svelte project. Its `utils` alias (`#lib/lib/utils`) also doesn't match the real path (`#lib/utils`). Don't run `shadcn add` expecting Svelte output.
- `tw-animate-css` is imported by file path in `layout.css` because its package exports only a `style` condition, which Tailwind 4.3's resolver ignores (bare `@import "tw-animate-css"` breaks the build).
- `src/$lib/components/svelte-bits/Aurora.svelte` sits in a literal `src/$lib/` directory, outside `src/lib/`, so it is not reachable via `#lib`. It's a WebGL (`ogl`) aurora background component.
