# Campusphere

**The Campus Community Sphere**

_Connect. Share. Collaborate. Improve._

Campusphere is an anonymous, campus-centered digital platform designed for **Batangas State University – Mabini Campus**.

It provides a shared online space where students and faculty members can publish articles, share experiences, report campus concerns, discuss inconveniences, and collaboratively propose solutions without requiring user registration or login.

Rather than simply collecting complaints, Campusphere encourages community participation and turns individual concerns into opportunities for collective improvement.

## The Problem

Students and faculty members experience different inconveniences throughout their daily campus activities.

However, these concerns may remain unnoticed, unreported, or unresolved due to the absence of a centralized platform where campus members can communicate, discuss, and collaboratively develop solutions.

Traditional feedback channels often focus on collecting complaints rather than encouraging active participation in finding solutions.

## Our Solution

Campusphere introduces a centralized, anonymous digital platform that connects campus members through publishing, discussions, problem reporting, and collaborative solution proposals.

Anyone can participate without creating an account, making it easier for individuals to express concerns and contribute ideas.

**Our philosophy:**

> A better campus is not built by one person. It is built by a community willing to contribute.

## Objectives

1. Establish a centralized platform for campus communication and collaboration.
2. Encourage students and faculty members to actively participate in improving campus services.
3. Provide an anonymous space for reporting and discussing campus-related problems.
4. Enable collaborative solution proposals and constructive discussions.
5. Promote transparency through concern and resolution tracking.
6. Encourage a culture of service, responsibility, and continuous improvement.

## Target Users

| User                   | Description                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Anonymous Visitors     | Browse campus articles, concerns, and discussions.                                   |
| Anonymous Contributors | Publish posts, report concerns, comment, and propose solutions without registration. |
| Administrators         | Manage platform content and update concern statuses.                                 |
| Moderators             | Review submissions and maintain platform safety.                                     |

## Core Modules

### 1. Campus Blog

A publishing space for campus-related content.

- Student experiences and stories
- Campus-related articles
- Educational content
- Announcements and updates

### 2. Campus Concerns

A dedicated space for reporting inconveniences and problems within the campus.

- Facility-related concerns
- Service inefficiencies
- Academic process difficulties
- Accessibility concerns
- Other campus-related issues

### 3. Solution Hub

A collaborative environment where campus members can propose and discuss possible solutions.

- Submit solution proposals
- Comment and discuss suggestions
- Support useful proposals
- Collaborate on possible improvements

### 4. Impact Tracker

A tracking system that provides visibility into the progress of reported concerns.

Proposed concern statuses:

- Submitted
- Under Review
- In Discussion
- Action Planned
- In Progress
- Resolved
- Closed / Not Feasible

## How It Works

Campusphere follows a continuous improvement cycle:

1. **Identify** – A campus member experiences a problem or inconvenience.
2. **Report** – The member anonymously submits the concern.
3. **Collaborate** – Other members discuss the issue and suggest solutions.
4. **Take Action** – Relevant people or university offices evaluate and implement feasible solutions.
5. **Improve** – Progress and outcomes are documented for the campus community.

## Core Features

- Anonymous access without registration
- Anonymous post and concern publishing
- Campus blog and discussion publishing
- Campus concern reporting
- Categories and tags
- Comments and discussions
- Reactions and proposal support
- Collaborative solution proposals
- Concern status tracking
- Search and filtering
- Moderation and content reporting
- Administrative dashboard
- Rate limiting and spam prevention

## Privacy and Moderation

Campusphere is designed around anonymous participation.

- Ordinary users do not need accounts.
- Public posts and comments do not display personal identities.
- Administrators and moderators use protected accounts.
- Inappropriate content can be reported and reviewed.
- Rate limiting and spam protection help prevent abuse.

Anonymous participation does not guarantee absolute technical anonymity. The platform should avoid collecting unnecessary personal information and clearly communicate its privacy practices.

## Advocacy and University Values

Campusphere primarily promotes the core value of **SERVICE**.

It encourages campus members to go beyond identifying problems by actively participating in finding solutions.

It also supports the university's other core values:

| Core Value | Application                                                    |
| ---------- | -------------------------------------------------------------- |
| Patriotism | Encouraging responsibility toward the university community.    |
| Service    | Promoting collaboration and assistance among campus members.   |
| Integrity  | Encouraging honest reporting and transparent progress updates. |
| Resilience | Developing solutions to overcome campus challenges.            |
| Excellence | Supporting continuous improvement of campus services.          |
| Faith      | Promoting compassion, respect, and responsibility.             |

## Expected Impact

Campusphere aims to establish a more collaborative and responsive campus environment.

Expected outcomes include:

- Increased participation in campus improvement initiatives.
- Better visibility of recurring campus concerns.
- More opportunities for students and faculty members to collaborate.
- Improved communication between campus stakeholders.
- Documented solutions and measurable community contributions.
- A stronger culture of service and shared responsibility.

## Project Scope

Campusphere initially focuses exclusively on **Batangas State University – Mabini Campus**.

Its initial implementation prioritizes:

- Anonymous campus participation.
- Blog and discussion publishing.
- Concern reporting.
- Collaborative solution proposals.
- Concern progress tracking.
- Content moderation.

The platform does not independently authorize changes to university policies, facilities, or official services. Concerns requiring institutional action must be reviewed and coordinated with the appropriate university offices.

## Future Enhancements

- Anonymous voting and proposal ranking.
- Verified official campus office accounts.
- Advanced analytics for recurring concerns.
- In-platform notifications.
- Campus improvement statistics.
- AI-assisted concern categorization and duplicate detection.
- Progressive Web App support.

## Development

### Stack

SvelteKit 3 + Svelte 5 (runes), TypeScript, Tailwind CSS 4, `@sveltejs/adapter-bun`, Bun.
Neon Postgres via Drizzle ORM, Neon Object Storage (S3) for photos, Zod validation,
`@node-rs/argon2` for staff passwords, `marked` + `sanitize-html` for Markdown, `sharp` for images.
Animations: two vendored [Svelte Bits](https://sveltebits.xyz) components (Magnet, CountUp) plus
lightweight custom CSS/JS effects. See [`docs/PLAN.md`](docs/PLAN.md) for the architecture and data model.

### Setup

```sh
bun install
cp .env.example .env.local       # or: neon env pull (writes the Neon values)
# set ANON_SECRET (openssl rand -base64 48) and the SEED_ADMIN_* values in .env.local
bun run db:migrate               # apply migrations (uses DATABASE_URL_UNPOOLED)
bun run db:seed                  # categories, tags, settings, official post, sample content
bun run db:seed-admin            # first administrator from SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD
bun run dev
```

Use a Neon **development branch** locally (`neon checkout dev --create --env .env.local`).
The seed script and the database tests refuse to run on the `production` branch.

### Environment variables

| Variable                                                                          | Required     | Purpose                                                                                                              |
| --------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------------------------------------------- |
| `DATABASE_URL`                                                                    | yes          | Neon pooled connection (app traffic)                                                                                 |
| `DATABASE_URL_UNPOOLED`                                                           | yes          | Neon direct connection (migrations, scripts)                                                                         |
| `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINT_URL_S3`, `AWS_REGION` | yes          | Neon Object Storage (photo uploads)                                                                                  |
| `ANON_SECRET`                                                                     | yes          | ≥ 32 random characters. Keys the HMAC of anonymous tokens and client addresses. Rotating it unlinks existing tokens. |
| `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`                                      | production   | Cloudflare Turnstile bot check. Leave empty in development to bypass.                                                |
| `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`                                         | scripts only | First administrator (`bun run db:seed-admin`). Password ≥ 12 characters.                                             |
| `NEON_FUNCTION_HELLO_BASE_URL`                                                    | no           | Neon Function smoke test (development only)                                                                          |

Production server variables (`BODY_SIZE_LIMIT`, proxy headers) are in [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

### Scripts

| Command                              | What it does                                                                                       |
| ------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `bun run dev`                        | Development server                                                                                 |
| `bun run build` / `bun run start`    | Production build / serve (`start` needs Bun ≥ 1.4)                                                 |
| `bun run check`                      | `svelte-check` type checking                                                                       |
| `bun run lint` / `bun run format`    | Prettier + ESLint / format                                                                         |
| `bun run test`                       | Unit tests (Vitest)                                                                                |
| `bun run test:db`                    | Database integration tests against a dev branch                                                    |
| `bun run test:e2e`                   | Playwright smoke + accessibility tests (`CHROMIUM_PATH=/usr/bin/chromium` to use a system browser) |
| `bun run db:generate` / `db:migrate` | Create / apply Drizzle migrations                                                                  |
| `bun run db:seed [--reset\|--base]`  | Seed data (`--base`: no sample content)                                                            |
| `bun run db:seed-admin`              | Create or reset the first administrator                                                            |

### Where things live

- `src/routes/(landing)` landing page, `src/routes/(app)` public pages, `src/routes/admin` staff area
- `src/lib/server/services/*` all data access and business rules (concerns, proposals, posts, comments, moderation, admin, search)
- `src/lib/server/{anon,safety,ratelimit,turnstile,sanitize,images,auth}.ts` the anonymity and safety layer
- `src/lib/components/{shell,ui,motion,svelte-bits}` UI; Svelte Bits components are only used through `motion/` wrappers
- `src/lib/content/site.ts` copy and **placeholders for university office names and contacts**

### Placeholders to fill in

All marked `[To be provided by the university]` in `src/lib/content/site.ts`:
the urgent/safety office and contact (report form, About, Guidelines), the coordinating office and
contact (About, Privacy), and a data protection contact (Privacy).

---

**Campusphere — Connect. Share. Collaborate. Improve.**

_Building a better campus through collective participation and service._
