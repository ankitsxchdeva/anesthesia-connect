# Anesthesia Connect MVP — Build Contract

This file is the **single source of truth** for all build agents. If it
conflicts with your instinct, the spec wins. If the spec is genuinely broken,
stop and report instead of improvising.

Product: community + clinical-learning platform for prospective SRNAs,
current SRNAs, and CRNAs. See the briefing: user profiles, curated resource
directory, program finder + application tracker, flashcards/quizzes,
educational calculators, discussion board, group chat, personal calendar.

## Architecture

Three services, one compose file (`anesthesia-connect/docker-compose.yml`):

- `db` — postgres:16-alpine. Schema + seed in `db/*.sql` (auto-applied on
  fresh volume). App user `anesthesia`, db `anesthesia`.
- `api` — Node 22 + Hono + pg + zod + bcryptjs + hono/jwt (ESM). Listens on
  4000. All routes under `/api`.
- `web` — Next.js 15 (app router, standalone output) + Tailwind v3.
  `basePath` is `''` in local dev and `/anesthesia` in compose/prod; Caddy
  proxies `/anesthesia*` → web **without** stripping (Next handles the
  prefix). Browser calls same-origin `${NEXT_PUBLIC_BASE_PATH}/api/...`,
  which Next rewrites to the api service.

Demo logins (seeded, password `password123`):
`demo.prospective@example.com`, `demo.srna@example.com`, `demo.crna@example.com`

## Hard rules (all agents)

1. Touch ONLY the files listed as yours in the ownership table. Never edit:
   `SPEC.md`, `db/schema.sql`, `db/seed.sql`, `api/src/{index,app,db,auth}.ts`,
   `web/lib/*`, `web/components/ui.tsx`, `web/app/layout.tsx`,
   `web/app/globals.css`, any config/compose/env file, the other repo.
2. No new npm dependencies. Everything needed is already in package.json.
3. API: validate every body with zod; parameterize every SQL query (`$1, $2`);
   errors as `{ "error": "message" }` with the right status (400 validation,
   401 unauthenticated, 403 forbidden, 404 missing, 409 conflict).
4. API router files: `export default` a `Hono` instance, routes **relative**
   to their mount point (e.g. `router.get('/:id')` in `resources.ts` serves
   `/api/resources/:id`). Get the caller via `getUserId(c)` from `../auth.js`.
   Import with `.js` extensions (`import { pool } from '../db.js'`).
5. Web: interactive pages are client components (`'use client'`). All data
   through `web/lib/api.ts` — never raw `fetch`. Wrap every authed page in
   `<AuthGate>`. Use components from `web/components/ui.tsx`. Links via
   next/link (basePath is automatic). Match the shell's visual style.
6. TypeScript strict. Acceptance: `npm run typecheck` exits 0 in the package
   you worked in. Do not weaken tsconfig to make it pass.
7. Clinical content is educational. Calculators/study UI must render the
   formula, source, version, review date, and the disclaimer constant shown
   below. No patient-specific dosing advice anywhere.

Disclaimer constant (render verbatim on calculator pages):

> Educational tool only — not clinical decision support. Verify against
> institutional protocols and primary sources before any clinical use.

## Auth

- `POST /api/auth/signup` `{email, password, display_name, role}` →
  `{token, user}`. role ∈ `prospective | srna | crna`. 409 on duplicate email.
- `POST /api/auth/login` `{email, password}` → `{token, user}`. 401 on bad
  credentials (generic message).
- `GET /api/auth/me` → `User`.
- Everything else under `/api/*` requires `Authorization: Bearer <jwt>`
  (middleware already wired in `api/src/app.ts`). Token payload: `{sub, role}`.
- Frontend: token in localStorage, handled inside `web/lib/api.ts`.

## Types (mirror `web/lib/types.ts` — api returns these shapes)

`User {id, email, display_name, role: 'prospective'|'srna'|'crna', school|null, grad_year|null, bio|null, created_at}`
`Program {id, name, city|null, state|null, degree|null, length_months|null, deadline|null(date), tuition|null, website|null, source_url|null, notes|null}`
`Application {id, program_id, status, deadline|null, notes|null, updated_at, program: Program}`
status ∈ `researching|preparing|submitted|interview|accepted|rejected|waitlisted`
`Resource {id, title, url, source, category, description|null, revision_date|null, bookmarked?}`
`Post {id, category, title, body, is_anonymous, author, user_id|null, created_at, comment_count?}`
`Comment {id, post_id, parent_id|null, author, body, helpful_count, created_at, voted?}`
`Group {id, name, description|null, kind: 'public'|'private'|'invite', category|null, member_count?, is_member?}`
`GroupMember {user_id, display_name, role}`
`Message {id, group_id, author, body, pinned, created_at}`
`CalendarEvent {id, title, category, starts_at, ends_at|null, all_day, recurrence|null, notes|null, group_id|null}`
`Deck {id, title, description|null, author, card_count?, saved?}`
`Card {id, deck_id, front, back, position}`
`Quiz {id, title, description|null, question_count?}`
`QuizQuestion {id, prompt, options: string[], correct_index, explanation|null, position}`
`QuizDetail = Quiz & {questions: QuizQuestion[]}`
`QuizAttempt {id, quiz_id, score, total, created_at}`
`Calculator {id, slug, name, description|null, formula, source|null, version, reviewed_by|null, review_date|null}`

Anonymity rule: for posts/comments with `is_anonymous`, return
`author: "Anonymous"` and `user_id: null`. Never leak the author identity.

## Endpoints (all mounted under `/api`, all authed except auth login/signup)

### auth.ts (mount `/auth`)
As above.

### resources.ts (mount `/resources`) + bookmarks
- `GET /` `?q&category&source` → `Resource[]` with `bookmarked` for caller.
  Case-insensitive ILIKE search on title/description/source.
- `GET /recent` → `Resource[]` caller's 20 most recently viewed (before `/:id`!).
- `GET /:id` → `Resource` + upserts into `resource_views` (viewed_at = now()).
- `POST /:id/bookmark` → 204 (idempotent). `DELETE /:id/bookmark` → 204.
- `GET /bookmarks/list` → caller's bookmarked `Resource[]`, newest first.

Route order matters: define `/recent` and `/bookmarks/list` **before** `/:id`.

### programs.ts (mount `/programs`) + applications.ts (mount `/applications`)
- `GET /` `?q&state` → `Program[]`, ordered by name.
- `GET /:id` → `Program`. 404 if missing.
- `GET /applications` → caller's `Application[]` (join programs, embed as
  `program`), ordered by deadline asc nulls last.
- `POST /applications` `{program_id, status, deadline?, notes?}` →
  `Application` (with embedded program). 409 if (user, program) exists.
- `PATCH /applications/:id` `{status?, deadline?, notes?}` → updated
  `Application`. Owner only, sets `updated_at = now()`.
- `DELETE /applications/:id` → 204. Owner only.

### posts.ts (mount `/posts`)
- `GET /` `?category&q` → `Post[]` newest first with `comment_count`.
  Categories: `admissions | study | practice | networking`.
- `GET /:id` → `{post: Post, comments: Comment[]}` (flat list; `voted` = did
  caller mark helpful).
- `POST /` `{category, title, body, is_anonymous?}` → `Post`.
- `POST /:id/comments` `{body, parent_id?}` → `Comment`. 404 on bad post/parent.
- `POST /comments/:id/helpful` → `{helpful_count}`. One vote per user
  (comment_votes); repeat call is a no-op returning current count.

### groups.ts (mount `/groups`)
- `GET /` → `Group[]` with `member_count`, `is_member`. Include invite groups
  the caller belongs to; hide invite groups otherwise. private = joinable on
  request? No — for MVP: `public` joinable, `private`/`invite` → 403 on join.
- `POST /` `{name, description?, kind, category?}` → `Group`; creator becomes
  member with role `admin`.
- `GET /:id` → `{group: Group, members: GroupMember[]}`. Members only for
  `private`/`invite`; public visible to all.
- `POST /:id/join` → 204 (public only, idempotent). `POST /:id/leave` → 204
  (admin leaving keeps membership if sole admin? MVP: allow, no check).
- `GET /:id/messages?after=<iso>` → `Message[]` ascending, limit 100. Members only.
- `POST /:id/messages` `{body}` → `Message` (201). Members only.
- `POST /messages/:id/pin` `{pinned: boolean}` → 204. Group admin only.

### events.ts (mount `/events`)
- `GET /?from&to` (ISO dates) → caller's own events plus events of groups the
  caller belongs to, ordered by starts_at.
- `POST /` `{title, category, starts_at, ends_at?, all_day?, recurrence?,
  notes?, group_id?}` → `CalendarEvent`. group_id requires membership.
  categories: `shift|class|clinical|exam|shadowing|interview|deadline|study|other`.
- `PATCH /:id` / `DELETE /:id` → owner only (events.user_id = caller).

### study.ts (mount: split) + calculators.ts (mount `/calculators`)
File `study.ts` default-exported twice is impossible → **two files**:
- `decks.ts` (mount `/decks`): `GET /` → `Deck[]` with `card_count`, `saved`;
  `GET /:id` → `{deck: Deck, cards: Card[]}` (ordered by position);
  `POST /:id/save` → 204 idempotent; `DELETE /:id/save` → 204.
- `quizzes.ts` (mount `/quizzes`): `GET /` → `Quiz[]` with `question_count`;
  `GET /:id` → `QuizDetail` (correct_index included — client grades);
  `POST /:id/attempts` `{score, total}` → `QuizAttempt`;
  `GET /attempts/mine` → caller's `QuizAttempt[]` newest first (define before `/:id`).
- `calculators.ts`: `GET /` → `Calculator[]`; `GET /:slug` → `Calculator`
  (404 unknown slug). Content lives in DB; computation is client-side.

## Calculator formulas (frontend implements exactly these; slug-keyed)

- `ibw` (Devine): height in inches h. Men: 50 + 2.3·(h−60); women:
  45.5 + 2.3·(h−60). If h < 60, subtract 2.3·(60−h) instead. Result kg.
- `dosing-weight`: inputs actual body weight ABW kg + IBW (recompute from
  height/sex). If ABW ≤ 1.3·IBW → use ABW; else IBW + 0.4·(ABW−IBW). kg.
- `bsa` (Mosteller): √(height_cm · weight_kg / 3600). Result m², 2 decimals.

Input validation ranges: height 120–230 cm, weight 30–300 kg. Show unit
toggle (cm/kg primary; in/lb secondary) — convert internally, compute in metric.

## Web pages (ownership below)

Shell (already built): top nav (Dashboard, Resources, Programs, Tracker,
Study, Calculators, Community, Calendar), user menu w/ logout, login/signup
pages, `components/ui.tsx` (Card, Button, Input, Select, Textarea, Badge,
Spinner, EmptyState, ErrorBanner, PageHeader), `lib/api.ts`, `lib/auth.tsx`
(AuthGate, useUser), `lib/format.ts` (date helpers).

- `app/page.tsx` — Dashboard: greeting (display_name + role badge), 4 cards:
  next-7-days events, application-status counts, recently viewed resources,
  saved decks + latest quiz attempt. Quick links to each section.
- `app/resources/page.tsx` — search box, category + source filters, result
  list (title, source badge, description, revision date, bookmark toggle,
  outbound link icon, opens new tab). Recently-viewed strip on top.
  Bookmark toggle calls POST/DELETE bookmark.
- `app/programs/page.tsx` — search + state filter, table/cards of programs
  (name, city/state, degree, length, deadline, website link, "Add to
  tracker"). `app/programs/[id]/page.tsx` — full detail + notes + source +
  add-to-tracker. `app/tracker/page.tsx` — applications grouped by status
  (columns or sections), status select, deadline, notes editor, delete.
- `app/study/page.tsx` — decks (save/unsave, card count) + quizzes (question
  count, last attempt score). `app/study/decks/[id]/page.tsx` — flashcard
  runner: flip on click, prev/next, keyboard arrows, progress. 
  `app/study/quizzes/[id]/page.tsx` — quiz runner: one question at a time,
  answer reveal w/ explanation, final score screen, POST attempt.
- `app/calculators/page.tsx` — list w/ name, description, version, review
  date. `app/calculators/[slug]/page.tsx` — interactive form per FORMULAS
  section, live validation, result panel, formula/source/version/reviewed_by
  block, disclaimer verbatim.
- `app/community/page.tsx` — board: category tabs + search, post list
  (title, author, category badge, comment count, time). "New post" button.
  `app/community/new/page.tsx` — form w/ anonymous toggle.
  `app/community/posts/[id]/page.tsx` — post + threaded comments (indent by
  parent), reply boxes, helpful vote button.
  `app/community/groups/page.tsx` — group list (kind badge, member count,
  join/leave), create-group form.
  `app/community/groups/[id]/page.tsx` — chat: messages asc, pinned on top,
  composer, 5s polling via listMessages(after=lastTimestamp), member list
  sidebar, pin button for admins.
- `app/calendar/page.tsx` — month grid + upcoming list; create/edit/delete
  events w/ category colors; categories from spec; group events shown with
  group badge.

## Ownership

Wave 1 (api/): each agent replaces stub files. Run `cd api && npm run typecheck`.
| agent | files |
|---|---|
| api-1 | `src/routes/auth.ts`, `src/routes/events.ts` |
| api-2 | `src/routes/resources.ts` |
| api-3 | `src/routes/programs.ts`, `src/routes/applications.ts` |
| api-4 | `src/routes/posts.ts`, `src/routes/groups.ts` |
| api-5 | `src/routes/decks.ts`, `src/routes/quizzes.ts`, `src/routes/calculators.ts` |

Wave 2 (web/): run `cd web && npm run typecheck`.
| agent | files |
|---|---|
| web-1 | `app/page.tsx` |
| web-2 | `app/resources/page.tsx` |
| web-3 | `app/programs/page.tsx`, `app/programs/[id]/page.tsx`, `app/tracker/page.tsx` |
| web-4 | `app/study/page.tsx`, `app/study/decks/[id]/page.tsx`, `app/study/quizzes/[id]/page.tsx` |
| web-5 | `app/calculators/page.tsx`, `app/calculators/[slug]/page.tsx` |
| web-6 | `app/community/page.tsx`, `app/community/new/page.tsx`, `app/community/posts/[id]/page.tsx`, `app/community/groups/page.tsx`, `app/community/groups/[id]/page.tsx` |
| web-7 | `app/calendar/page.tsx` |
