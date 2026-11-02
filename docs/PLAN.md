# Campusphere build plan

Anonymous campus community platform for Batangas State University – Mabini Campus.
Source of truth for visuals: `campusphere-app-ui-prototype.html` and `campusphere-landing-D-animated.html`
(design pack, not committed). Source of truth for behavior, security and data: the execution prompt.

## 1. What already exists (inspected 2026-11-02)

| Layer       | State                                                                                                            |
| ----------- | ---------------------------------------------------------------------------------------------------------------- |
| Framework   | SvelteKit 3.1 + Svelte 5.57 (runes forced on in `vite.config.ts`), TypeScript strict                             |
| Adapter     | `@sveltejs/adapter-bun` (long-running Bun server, not an edge runtime)                                           |
| Styling     | Tailwind CSS v4 via Vite plugin, `@tailwindcss/forms`, `typography`, `tw-animate-css`, shadcn token CSS          |
| UI libs     | No Svelte primitives library. `components.json`, `@base-ui/react`, `lucide-react` are React leftovers and unused |
| Svelte Bits | One component copied: `src/$lib/components/svelte-bits/Aurora.svelte` (WebGL, `ogl`). Outside `src/lib`, unused  |
| Database    | Neon Postgres (`pg` Pool in `src/lib/server/db.ts`), no ORM, no schema                                           |
| Storage     | Neon Object Storage (S3 client, private bucket `assets`)                                                         |
| Env         | SvelteKit 3 `defineEnvVars` in `src/env.ts`, read via `$app/env/private` / `$app/env/public`                     |
| Tests       | None                                                                                                             |
| Runtime     | Bun 1.3.14 locally. Note: `bun run start` (adapter-bun) wants Bun >= 1.4                                         |

## 2. Choices for missing layers

| Layer                 | Choice                                                                                                                                                  | Why                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| ORM / migrations      | **Drizzle ORM + drizzle-kit** on the existing `pg` Pool                                                                                                 | Typed SQL, parameterized by default, plain SQL migrations, works on Bun and Node                                                   |
| Database              | Existing **Neon Postgres**                                                                                                                              | Already provisioned; `tsvector` full-text search                                                                                   |
| Validation            | **Zod 4**                                                                                                                                               | Standard Schema (also usable in `defineEnvVars`), small API                                                                        |
| Forms                 | Plain SvelteKit **form actions + `use:enhance`** (no superforms)                                                                                        | Few forms, each simple; avoids another abstraction. Shared `parseForm(schema, formData)` helper returns field errors               |
| Primitives            | **Hand-rolled** accessible components (tabs, slide-over, select via native `<select>`)                                                                  | The prototypes only need tabs, a slide-over and a disclosure (native `<details>`). Bits UI would be extra weight for three widgets |
| Password hashing      | **`@node-rs/argon2`** (argon2id)                                                                                                                        | Adapter is Bun (not edge), and dev runs Vite under Node; the N-API build runs on both                                              |
| Markdown / sanitizing | **`marked`** + **`sanitize-html`** (server-side, strict allow-list)                                                                                     | Rendered HTML is sanitized on write and only then passed to `{@html}`                                                              |
| Images                | **`sharp`**: re-encode to WebP, which drops EXIF/GPS; 5 MB / JPEG-PNG-WebP limit; stored in the private bucket, served via `/media/[key]`               |                                                                                                                                    |
| Bot protection        | **Cloudflare Turnstile** (env keys), dev bypass when keys are unset; honeypot + min-time-to-submit always on                                            |                                                                                                                                    |
| Rate limiting         | Postgres `rate_limit` table (fixed window), keyed by hashed IP and by token hash                                                                        | No Redis on this host; volumes are campus-sized                                                                                    |
| Tests                 | **Vitest** (unit + DB integration), **Playwright** (E2E smoke, uses system Chromium)                                                                    |                                                                                                                                    |
| Fonts                 | **TeX Gyre Adventor** self-hosted WOFF2 (converted from the GUST OTF, GUST Font License) for display; **Inter** and **Lora** via `@fontsource-variable` | Adventor available, so no Poppins fallback needed                                                                                  |

## 3. Architecture

```
src/
  env.ts                     env var declarations (+ ANON_SECRET, TURNSTILE_*, SEED_ADMIN_*)
  hooks.server.ts            security headers, anon token cookie, staff session, admin guard
  lib/
    components/              UI (Svelte 5 runes)
      shell/                 AppShell, Sidebar, TopBar, Banner, Icon
      ui/                    StatusPill, SupportButton, Tabs, Pager, Card, SlideOver, Notice, Field …
      motion/                AnimatedHeading, Spotlight, Magnetic, CountUp, ScrollWords, CoreValuesCube
      svelte-bits/           vendored Svelte Bits sources (Magnet, CountUp)
    content/                 static copy (status labels, steps, office placeholders)
    status.ts                status set, order, colors, transition rules (shared client/server)
    server/
      db/                    pool, drizzle instance, schema.ts, seed.ts
      anon.ts                token cookie, HMAC hashing, per-thread anonymous labels
      ratelimit.ts           hashed-IP + token rate limits
      turnstile.ts           bot check
      safety.ts              honeypot, min time, link count, duplicate, word filter
      sanitize.ts            markdown -> sanitized HTML
      images.ts              sharp re-encode + S3 upload
      auth.ts                staff sessions, argon2, RBAC helpers
      audit.ts               audit log writer
      services/              concerns, proposals, posts, comments, reactions, reports, search, taxonomy, settings
  routes/
    +layout.svelte           global CSS, fonts
    (landing)/+page.svelte   `/` (no sidebar)
    (app)/+layout.svelte     public shell
      recommendations, concerns, concerns/new, concerns/[id], solutions, tracker,
      blog, blog/new, blog/[slug], search, about, guidelines, privacy
    admin/login              bare sign-in
    admin/(staff)/+layout    staff shell (guarded)
      +page (dashboard), moderation, concerns, content, taxonomy, users
    api/                     JSON: search, similar, reactions, support
    media/[...key]           image proxy from private bucket
```

## 4. Data model (Drizzle, Postgres)

- `category` (id, name, slug, type `blog|concern`, description, sort)
- `tag` (id, name, slug)
- `post` (id, slug, title, excerpt, body_md, body_html, cover_image, category_id, is_official, is_pinned, status `published|pending|hidden`, author_token_hash, staff_author_id, source, search tsvector, created_at, updated_at) + `post_tag`
- `concern` (id, kind `concern|recommendation`, title, description, category_id, location, images jsonb, current_status, is_sensitive, visibility, support_count, comment_count, author_token_hash, source, search tsvector, created_at, updated_at, status_changed_at) + `concern_tag`
- `concern_support` (concern_id, token_hash) unique — concern-level "Support" seen on cards and the detail rail
- `status_history` (id, concern_id, status, public_note, changed_by_id, created_at)
- `proposal` (id, concern_id, title, description, feasibility_notes, support_count, comment_count, visibility, author_token_hash, created_at)
- `proposal_support` (proposal_id, token_hash) unique
- `comment` (id, parent_type `post|concern|proposal`, parent_id, parent_comment_id, body, anon_label_seed, visibility, author_token_hash, created_at)
- `reaction` (target_type, target_id, type, token_hash) unique
- `report` (id, target_type, target_id, reason, details, status `open|actioned|dismissed`, reporter_token_hash, created_at, resolved_by_id, resolved_at), unique open report per reporter + target
- `staff_user` (id, email, password_hash, role `ADMIN|MODERATOR`, created_at, last_login_at, disabled_at) + `staff_session` (id = sha256(token), staff_id, expires_at)
- `audit_log` (id, staff_id, action, target_type, target_id, meta jsonb, created_at)
- `rate_limit` (key, window_start, count) PK(key, window_start)
- `setting` (key, value jsonb): `moderation_mode` (`post`|`pre`), `auto_hide_threshold` (default 3), `word_filter` list

Indexes: visibility+current_status, category_id, created_at, support_count; GIN on `search`.
Extensibility hooks (not built): `source` column on content, `verified` office accounts can be a staff role later.

## 5. Status flow

Submitted → Under Review → In Discussion → Action Planned → In Progress → Resolved, plus terminal Closed / Not Feasible.
Admins may move to any status (including back a step, e.g. reopened); every change writes `status_history`
and `audit_log`; note required for Closed / Not Feasible. Same rule enforced in `status.ts` (client hint) and the service (authority).

## 6. Route map and page patterns

| Route                               | Pattern              | Prototype            |
| ----------------------------------- | -------------------- | -------------------- |
| `/`                                 | Landing              | landing D            |
| `/recommendations`                  | List / Index (cards) | `s-recs`             |
| `/concerns`                         | List / Index (table) | `s-concerns`         |
| `/concerns/new`                     | Form                 | `s-new`              |
| `/concerns/[id]`                    | Detail               | `s-detail`           |
| `/solutions`                        | List / Index         | `s-hub`              |
| `/tracker`                          | Board (read-only)    | `s-tracker`          |
| `/blog`                             | List / Index         | `s-blog`             |
| `/blog/new`                         | Form                 | extends `s-new`      |
| `/blog/[slug]`                      | Article              | `s-post`             |
| `/search`                           | List / Index         | extends `s-concerns` |
| `/about`, `/guidelines`, `/privacy` | Content page         | `s-about`            |
| `/admin/login`                      | Form (auth)          | `s-login`            |
| `/admin`                            | Dashboard            | `s-dash`             |
| `/admin/moderation`                 | Split pane           | `s-admin`            |
| `/admin/concerns`                   | List + slide-over    | `s-acon`             |
| `/admin/content`                    | List (table)         | extends `s-acon`     |
| `/admin/taxonomy`                   | Settings             | `s-tax`              |
| `/admin/users`                      | List                 | `s-users`            |

## 7. Svelte Bits usage (verified against the sveltebits.xyz registry, `/r/<name>.json`)

| Effect                                                         | Decision                                                                                                            |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Magnetic buttons                                               | **Svelte Bits `Magnet`** (no deps), wrapped in `Magnetic.svelte`, disabled under reduced motion and on touch        |
| Count-up numbers                                               | **Svelte Bits `CountUp`** (`motion`), wrapped in `CountUp.svelte` with SSR text fallback and reduced-motion bypass  |
| Letter reveal                                                  | Svelte Bits `SplitText` exists but needs GSAP. **Custom CSS** version from the prototype (`AnimatedHeading.svelte`) |
| Words lighting on scroll                                       | Svelte Bits `ScrollReveal` exists but needs GSAP. **Custom** (`ScrollWords.svelte`)                                 |
| Spotlight + dot grid                                           | **Custom CSS vars** (`Spotlight.svelte` action), lighter than Dot Grid / Spotlight Card                             |
| Marquee, roll-over links, draggable notes, cube, progress line | **Custom** per prototype                                                                                            |
| Aurora (already in repo)                                       | Not used: WebGL background conflicts with "app stays calm" and the solid-surface rule                               |

## 8. Phases

1. Foundation: tokens, fonts, shell, wrappers, this plan, `.env.example`
2. Database: schema, migrations, seed (categories, tags, official post, concerns across all statuses, proposals)
3. Anonymous identity + safety layer
4. Concerns + Impact Tracker (incl. recommendations)
5. Solution Hub
6. Blog
7. Search, filters, taxonomy
8. Moderation + reporting
9. Staff auth + admin
10. Landing, About, Guidelines, Privacy, motion pass
11. Quality pass (a11y, reduced motion, responsive, security)
12. Docs + deployment

Each phase: `bun run check`, `bun run lint`, tests, commit on `feat/campusphere-v1`.

## 9. Open decisions / placeholders

- University office names and contacts: placeholders marked `[TO BE PROVIDED BY THE UNIVERSITY]` in `src/lib/content/offices.ts`.
- Database branch for migrations and seed data: confirm before writing to Neon `production`.
