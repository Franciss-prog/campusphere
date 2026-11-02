# Deploying Campusphere

Campusphere builds with `@sveltejs/adapter-bun` into `./build` and runs as a long-lived Bun
server (Bun ≥ 1.4). Data lives in Neon (Postgres + Object Storage).

## 1. Prepare the production database

Run these against the Neon `production` branch (point `DATABASE_URL_UNPOOLED` at it):

```sh
bun run db:migrate
bun run db:seed --base --allow-production      # categories, tags, settings, official post only
SEED_ADMIN_EMAIL=… SEED_ADMIN_PASSWORD=… bun run db:seed-admin
```

Never run the full seed (sample content) or `test:db` / `test:e2e` against production.

Maintenance, safe on production (for example from a daily cron):

```sh
bun run db:reconcile --check     # exits 1 if cached counters drifted; drop --check to fix
bun run db:prune-media           # dry run; add --apply to delete unused uploads
```

## 2. Build

```sh
bun install --frozen-lockfile
bun run build
```

If the app sits behind a reverse proxy and you know its public URL, set `kit.paths.origin` (or use the
proxy headers below) so SvelteKit's CSRF origin check matches the URL users see.

## 3. Run

```sh
bun ./build/index.js
```

### Required environment

All variables from `.env.example` (Neon, `ANON_SECRET`, Turnstile keys), plus:

| Variable                          | Recommended value                        | Why                                                                                          |
| --------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `BODY_SIZE_LIMIT`                 | `6M`                                     | Photos may be up to 5 MB; the adapter default is 512 KB.                                     |
| `PORT` / `HOST`                   | e.g. `3000` / `0.0.0.0`                  | Listen address.                                                                              |
| `ADDRESS_HEADER` + `XFF_DEPTH`    | e.g. `X-Forwarded-For` + `1`             | Behind a proxy, so rate limits see the real client (only its daily-rotating hash is stored). |
| `PROTOCOL_HEADER` / `HOST_HEADER` | `X-Forwarded-Proto` / `X-Forwarded-Host` | Behind a proxy, so the request origin is correct.                                            |

Set `TURNSTILE_SITE_KEY` and `TURNSTILE_SECRET_KEY` in production; without them the bot check is skipped.

## 4. Checklist

- [ ] HTTPS terminates in front of the app (the app sends HSTS outside development).
- [ ] `ANON_SECRET` is unique to production and stored as a secret.
- [ ] Turnstile keys are set.
- [ ] `BODY_SIZE_LIMIT=6M`.
- [ ] The first administrator signed in and changed the temporary password (Account page).
- [ ] Office placeholders in `src/lib/content/site.ts` are filled in.
- [ ] Moderation settings reviewed (Moderation → Moderation settings).

## Notes

- `/api/neon/*` smoke-test routes return 404 outside development.
- Photos are served through `/media/…` from the private bucket with long-lived cache headers. Hiding a
  post does not delete its photo object; delete it from the bucket if needed.
- Rate-limit rows older than two days are pruned automatically.
