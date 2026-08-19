# RepoGuide

> Understand any codebase in minutes — connect a GitHub repository and get an AI-powered map of its architecture, important files, documentation, and codebase Q&A.

## What This Is

RepoGuide is a developer SaaS that helps engineers understand unfamiliar codebases. **Phase 4 is live**: after Phase 3's analysis, RepoGuide sends a small, prioritized slice of the repository to NVIDIA Nemotron (via NVIDIA NIM) and generates a validated, structured onboarding guide — project overview, technology stack, architecture, important files, application flows, getting started, environment variable names, and a recommended reading order — all backed by real files you can click to open.

## How Sign-In Works

1. A visitor clicks **Connect GitHub** (or **Sign in**).
2. GitHub asks them to authorize RepoGuide.
3. They pick which repositories the RepoGuide app can access (read-only).
4. They land in the app — their real GitHub repositories are listed and searchable.
5. Clicking **Analyze** on a repository downloads it, analyzes it, and shows a live progress view followed by a project overview. From there, **Generate** produces the AI onboarding guide.

## Pages

- **Home** (`/`) — Landing page with hero, how-it-works, features, an example architecture diagram, codebase Q&A preview, pricing, FAQ, and call-to-action. Sign-in buttons are real.
- **Dashboard** (`/dashboard`) — Real projects you've created, with status badges (Analyzed / In progress / Repositories).
- **Repositories** (`/repositories`) — Your real GitHub repositories (from the app installation). Search, filter by language, or install the app for more.
- **Project detail** (`/projects/[id]`) — Live analysis progress while a repo is being analyzed, a project overview when done (languages, frameworks, package manager, entry points, important files, dependencies, directory tree), and a panel to generate the AI onboarding guide.
- **Onboarding guide** (`/projects/[id]/documentation`) — The AI-generated guide: overview, stack, architecture, directory guide, important files, application flows, getting started, environment variable names, and recommended reading order. File references open a viewer.

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
| `project/project-overview.tsx` | The finished analysis: languages, frameworks, entry points, dependencies, directory tree + guide panel |
| `project/documentation-panel.tsx` | "Generate / View / Regenerate onboarding guide" card on the project page |
| `project/documentation-view.tsx` | Guide page: progress steps, errors, and the rendered guide |
| `project/onboarding-guide-content.tsx` | Renders each guide section with clickable file references |
| `project/file-viewer-dialog.tsx` | Opens a file's content (fetched from GitHub) when you click a path |
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
- `lib/ai/` — The AI onboarding system (server-side only, never reaches the browser):
  - `ai-provider.ts` — Provider abstraction (`AIProvider`) + factory. The rest of the app never calls NVIDIA directly.
  - `nvidia-provider.ts` — NVIDIA NIM via its OpenAI-compatible API (configurable base URL + model).
  - `onboarding-schema.ts` — Zod schema for the guide + sanitizers (only real file paths survive, env vars are names only).
  - `context.ts` — Deterministic context selection: priorities README/manifests/entry points, skips sensitive files, redacts secrets, and caps files/tokens.
  - `onboarding-generator.ts` — Downloads the analyzed commit, builds context, calls the provider, validates (with one safe retry), sanitizes, and stores the guide.
- `lib/auth.ts` — Signed session cookies (safe, can't be forged).
- `lib/db.ts` — Database connection (PostgreSQL via Supabase).
- `lib/workspace.ts` — Turns the database into what the pages show.
- `app/api/auth/*` — Sign in, callback, sign out, "who am I" endpoints.
- `app/api/projects` — Creates a project from a real GitHub repository and starts analysis.
- `app/api/projects/[id]` — Project detail used by the progress view.
- `app/api/projects/[id]/analyze` — Re-runs analysis for a failed project.
- `app/api/projects/[id]/documentation` — Starts / fetches the onboarding guide (commit-based caching).
- `app/api/projects/[id]/files` — Serves a file's content (authorized, fetched from GitHub) for the viewer.
- `prisma/schema.prisma` — The data model: users, GitHub accounts, installations, repositories, projects, source files, dependencies, analyses, onboarding guides.

## Data

Stored in a PostgreSQL database (Supabase). A project records the repository the user picked, the analysis results (files found, dependencies, languages, directory tree), and the onboarding guide (only after it's generated — tied to the analyzed commit so it's reused until the code changes). The repository's raw code is only ever downloaded into a temporary folder for analysis and then deleted — RepoGuide does **not** store repository code. All GitHub access is read-only. The NVIDIA API key is stored only in the server environment, never in the database or the browser.

## How to Customize

- **Colors**: edit the `:root` and `.dark` color variables at the top of `app/globals.css`. The brand accent is `--brand`.
- **Fonts**: swap `Space_Grotesk` / `DM_Sans` in `app/layout.tsx`.
- **Navigation**: sidebar links are in `components/app-shell/app-sidebar.tsx`.
- **GitHub credentials**: in the `.env.local` file (kept out of git). See `.env.example` for the list.

## Recent Changes

- 2026-08-19: **Phase 4 — AI onboarding guides are live.** After analysis, clicking **Generate** on a project downloads the analyzed commit, selects a small prioritized set of files (README, manifests, entry points, auth/database/API files), redacts secrets, and asks NVIDIA Nemotron (via NVIDIA NIM, OpenAI-compatible) for a structured guide. The reply is validated with Zod (one safe retry), sanitized so only real file paths survive, and stored. The guide page shows live progress steps and clickable file references that open a file viewer. Guides are cached per commit — unchanged repos reuse the guide; changed repos mark it outdated. Provider + model + limits are configurable (`NVIDIA_API_KEY`, `NVIDIA_BASE_URL`, `NVIDIA_MODEL`, `AI_MAX_FILES`, `AI_MAX_CONTEXT_TOKENS`, `AI_MAX_FILE_SIZE`). Security: the API key stays server-side, repository content is treated as untrusted data (prompt-injection guard), `.env`/key files are never sent, and env var values are redacted. Verified: typecheck, lint, build pass; context selection, secret exclusion, redaction, schema validation, and file-reference sanitizing tested against three real repositories (Next.js/TypeScript, Python, Java).
- 2026-08-19: **Phase 3 — codebase analysis is live.** Clicking **Analyze** now downloads the repository and runs a real, deterministic analysis with no AI: it detects languages, frameworks, package managers, entry points, important files, and dependencies, and builds a directory tree. The project page shows live progress (Queued → Downloading → Parsing → Analyzing → Complete) and then a project overview. Failed analyses show the reason and a **Retry** button. Tested end-to-end against two very different repositories (a Next.js app and a Python library). Verdict: typecheck, lint, and production build all pass.
- 2026-08-19: **Fixed a crash on the Dashboard and project pages.** The "no projects yet" and "not analyzed yet" empty states used a button action that didn't work from the server-rendered pages, causing a runtime error. They now use a normal link instead, so the buttons work again.
- 2026-08-19: **Fixed first-time sign-in.** Previously, the very first time someone connected their GitHub account the app wasn't installed yet, so GitHub came back without an authorization code and the person was never signed in (just bounced back to the home page). Now, when that happens, the app automatically starts the GitHub sign-in again — and since the app is now installed, the second round completes and signs the person in.
- 2026-08-18: **Phase 2 live.** Real GitHub sign-in, real repository listing, project creation with "Not analyzed yet" status, PostgreSQL data layer, session-based auth. Removed the mock data layer and the placeholder project workspace. Verified: GitHub App JWT works, app permissions are read-only, database tables created and reachable from the app, build/lint/typecheck pass.

## Coming in Phase 5

- Grounded codebase Q&A chat
- Semantic search / embeddings
- Team plans and billing