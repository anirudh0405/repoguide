# RepoGuide

> Understand any codebase in minutes — connect a GitHub repository and get an AI-powered map of its architecture, important files, documentation, and codebase Q&A.

## What This Is

RepoGuide is a developer SaaS that helps engineers understand unfamiliar codebases. **Phase 3 is live**: users sign in with GitHub, connect the RepoGuide GitHub App, pick a repository, and RepoGuide downloads it and builds a real, deterministic map of its codebase — languages, frameworks, dependencies, entry points, and a directory tree — all with no AI. AI-powered architecture explanations and codebase chat are next.

## How Sign-In Works

1. A visitor clicks **Connect GitHub** (or **Sign in**).
2. GitHub asks them to authorize RepoGuide.
3. They pick which repositories the RepoGuide app can access (read-only).
4. They land in the app — their real GitHub repositories are listed and searchable.
5. Clicking **Analyze** on a repository downloads it, analyzes it, and shows a live progress view followed by a project overview.

## Pages

- **Home** (`/`) — Landing page with hero, how-it-works, features, an example architecture diagram, codebase Q&A preview, pricing, FAQ, and call-to-action. Sign-in buttons are real.
- **Dashboard** (`/dashboard`) — Real projects you've created, with status badges (Analyzed / In progress / Repositories).
- **Repositories** (`/repositories`) — Your real GitHub repositories (from the app installation). Search, filter by language, or install the app for more.
- **Project detail** (`/projects/[id]`) — Live analysis progress while a repo is being analyzed, and a project overview when done: languages, frameworks, package manager, entry points, important files, dependencies, and a directory tree.

## Design

- **Personality**: serious, professional developer tool — the feel of GitHub, Linear, or a modern IDE, but not a copy.
- **Colors**: neutral warm base (stone/zinc) with a violet brand accent. Uses CSS variables so dark/light themes swap automatically.
- **Fonts**: Space Grotesk (headings) + DM Sans (body).
- **Dark/light mode**: a toggle in the top bars and an option in the page footer. Follows system by default.

## Components

Reusable pieces in `components/`:

| Component | Purpose |
|---|---|
| `ui/` | shadcn-style base: button, badge, card, input, tabs, dialog, sheet, dropdown, avatar, progress, skeleton, tooltip, separator |
| `app-shell/` | Left sidebar, top bar with real user menu + sign out |
| `dashboard/project-card.tsx` | Project summary card with status badge |
| `dashboard/stat-card.tsx` | Number/icon stat tile |
| `repositories/` | Real repository cards + searchable list |
| `project/analysis-view.tsx` | Client view that live-updates while analysis runs |
| `project/analysis-progress.tsx` | Steps/stage indicator during analysis |
| `project/project-overview.tsx` | The finished analysis: languages, frameworks, entry points, dependencies, directory tree |
| `auth/auth-cta.tsx` | Auth-aware sign-in buttons (landing page + navbar) |
| `auth/use-auth.ts` | Client-side hook that reads the signed-in user |
| `ui-states/` | Shared EmptyState, LoadingState, StatusBadge |
| `landing/` | The landing page section components |
| `theme-provider.tsx`, `theme-toggle.tsx` | Dark/light mode |

## Behind the Scenes (Server Code)

- `lib/github.ts` — Talks to GitHub: app JWT, OAuth exchange, installations, repositories.
- `lib/analyzer/` — The codebase analyzer (no AI):
  - `ingest.ts` — Downloads the repo tarball, extracts it safely, walks the tree applying `.gitignore` rules, size limits, and binary detection.
  - `languages.ts` — File extension → language, binary detection, line counting.
  - `detection.ts` — Detects package managers, frameworks, entry points, important files, and dependencies from manifests.
  - `ignore.ts` — Built-in ignore rules + each folder's `.gitignore`.
  - `tree.ts` — Builds the directory tree diagram.
  - `index.ts` — The orchestrator that runs the whole pipeline and saves results.
- `lib/auth.ts` — Signed session cookies (safe, can't be forged).
- `lib/db.ts` — Database connection (PostgreSQL via Supabase).
- `lib/workspace.ts` — Turns the database into what the pages show.
- `app/api/auth/*` — Sign in, callback, sign out, "who am I" endpoints.
- `app/api/projects` — Creates a project from a real GitHub repository and starts analysis.
- `app/api/projects/[id]` — Project detail used by the progress view.
- `app/api/projects/[id]/analyze` — Re-runs analysis for a failed project.
- `prisma/schema.prisma` — The data model: users, GitHub accounts, installations, repositories, projects, source files, dependencies, analyses.

## Data

Stored in a PostgreSQL database (Supabase). A project records the repository the user picked plus the analysis results: the files found (path, language, size, line count, hash), the dependencies detected, and a summary of languages, frameworks, entry points, and the directory tree. The repository's raw code is only ever downloaded into a temporary folder for analysis and then deleted — RepoGuide does **not** store repository code. All GitHub access is read-only.

## How to Customize

- **Colors**: edit the `:root` and `.dark` color variables at the top of `app/globals.css`. The brand accent is `--brand`.
- **Fonts**: swap `Space_Grotesk` / `DM_Sans` in `app/layout.tsx`.
- **Navigation**: sidebar links are in `components/app-shell/app-sidebar.tsx`.
- **GitHub credentials**: in the `.env.local` file (kept out of git). See `.env.example` for the list.

## Recent Changes

- 2026-08-19: **Phase 3 — codebase analysis is live.** Clicking **Analyze** now downloads the repository and runs a real, deterministic analysis with no AI: it detects languages, frameworks, package managers, entry points, important files, and dependencies, and builds a directory tree. The project page shows live progress (Queued → Downloading → Parsing → Analyzing → Complete) and then a project overview. Failed analyses show the reason and a **Retry** button. Tested end-to-end against two very different repositories (a Next.js app and a Python library). Verdict: typecheck, lint, and production build all pass.
- 2026-08-19: **Fixed a crash on the Dashboard and project pages.** The "no projects yet" and "not analyzed yet" empty states used a button action that didn't work from the server-rendered pages, causing a runtime error. They now use a normal link instead, so the buttons work again.
- 2026-08-19: **Fixed first-time sign-in.** Previously, the very first time someone connected their GitHub account the app wasn't installed yet, so GitHub came back without an authorization code and the person was never signed in (just bounced back to the home page). Now, when that happens, the app automatically starts the GitHub sign-in again — and since the app is now installed, the second round completes and signs the person in.
- 2026-08-18: **Phase 2 live.** Real GitHub sign-in, real repository listing, project creation with "Not analyzed yet" status, PostgreSQL data layer, session-based auth. Removed the mock data layer and the placeholder project workspace. Verified: GitHub App JWT works, app permissions are read-only, database tables created and reachable from the app, build/lint/typecheck pass.

## Coming in Phase 4

- AI-powered architecture explanations, documentation, and codebase Q&A chat
- Team plans and billing