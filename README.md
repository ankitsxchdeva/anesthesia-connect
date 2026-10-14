# Anesthesia Connect (MVP)

Community + clinical-learning platform for prospective SRNAs, current SRNAs,
and practicing CRNAs. Responsive Next.js web app backed by a Hono REST API
and Postgres.

MVP scope (from the product briefing): user profiles by role, curated
clinical resource directory (search/bookmarks/recently viewed), CRNA program
finder + application tracker, original flashcards + quizzes, educational
calculators with governance metadata, discussion board, group chats, and a
personal calendar.

## Stack

- `db/` — Postgres 16. `schema.sql` + `seed.sql` (applied on a fresh data
  volume); `Dockerfile` packages them for compose builds.
- `api/` — Node 22 + Hono + pg + zod + bcryptjs + hono/jwt. Routes under
  `/api/*`; JWT auth on everything except `/api/auth/{login,signup}`.
- `web/` — Next.js 15 (app router, standalone output) + Tailwind v3.
  `basePath` baked at build time via the `BASE_PATH` build arg (`/anesthesia`
  in compose, empty for `npm run dev`). The web server proxies `/api/*` to
  the api service via a Next.js rewrite (`API_URL` build arg).
- `SPEC.md` — the endpoint/UI contract the codebase was built against.

## Run locally

```
cp .env.example .env   # set real values
docker compose up -d --build
# → http://localhost:3100/anesthesia  (ports are localhost-only)
```

Or with hot reload:

```
docker compose up -d db
cd api && npm install && npm run dev   # :4100
cd web && npm install && npm run dev   # :3000, no basePath
```

Demo logins (password `password123`): `demo.prospective@example.com`,
`demo.srna@example.com`, `demo.crna@example.com`.

## Deployment

Deploy config lives in the [home-server](https://github.com/ankitsxchdeva/home-server)
repo (`anesthesia-connect/`): it builds the images straight from this repo's
`main` branch and exposes the app publicly via Tailscale Funnel → Caddy at
`/anesthesia`. App updates: push to `main`, then rebuild on the host with
`docker compose build --no-cache && docker compose up -d` (BuildKit caches
the git clone — plain `--build` can ship stale code).

## Pivot path (free at ~100 users → beyond)

- Postgres dumps restore into any managed Postgres (Supabase/Neon/RDS).
- `web` deploys to Vercel free tier (`BASE_PATH` empty, `API_URL` at the API).
- The compose file moves to any VPS unchanged.

## Notes

- Educational content only; calculators carry source/version/review metadata
  and a "not clinical decision support" disclaimer.
- Program data is illustrative — the UI directs users to verify with the COA
  directory and each program.
- Educational flashcards/quizzes are original content; the resource directory
  links out rather than republishing third-party content.
