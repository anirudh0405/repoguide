# RepoGuide

> Understand any codebase in minutes — connect a GitHub repository and get an AI-powered map of its architecture, important files, documentation, and codebase Q&A.

## What This Is

RepoGuide is a developer SaaS that helps engineers understand unfamiliar codebases. **Phase 2 is live**: users sign in with GitHub, connect the RepoGuide GitHub App to their account, browse their real repositories, and create projects ready for AI analysis. The actual AI analysis, embeddings, and codebase chat arrive in Phase 3.

## How Sign-In Works

1. A visitor clicks **Connect GitHub** (or **Sign in**).
2. GitHub asks them to authorize RepoGuide.
3. They pick which repositories the RepoGuide app can access (read-only).
4. They land in the app — their real GitHub repositories are listed and searchable.
5. Clicking **Analyze** on a repository creates a project with status "Not analyzed yet."

## Pages

- **Home** (`/`) — Landing page with hero, how-it-works, features, an example architecture diagram, codebase Q&A preview, pricing, FAQ, and call-to-action. Sign-in buttons are real.
- **Dashboard** (`/dashboard`) — Real projects you've created, with status badges.
- **Repositories** (`/repositories`) — Your real GitHub repositories (from the app installation). Search, filter by language, or install the app for more.
- **Project detail** (`/projects/[id]`) — Shows the connected repository and a "Ready for analysis" state until Phase 3 ships.

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
| `project/project-ready-view.tsx` | "Repository connected, ready for analysis" state |
| `auth/auth-cta.tsx` | Auth-aware sign-in buttons (landing page + navbar) |
| `auth/use-auth.ts` | Client-side hook that reads the signed-in user |
| `ui-states/` | Shared EmptyState, LoadingState, StatusBadge |
| `landing/` | The landing page section components |
| `theme-provider.tsx`, `theme-toggle.tsx` | Dark/light mode |

## Behind the Scenes (Server Code)

- `lib/github.ts` — Talks to GitHub: app JWT, OAuth exchange, installations, repositories.
- `lib/auth.ts` — Signed session cookies (safe, can't be forged).
- `lib/db.ts` — Database connection (PostgreSQL via Supabase).
- `lib/workspace.ts` — Turns the database into what the pages show.
- `app/api/auth/*` — Sign in, callback, sign out, "who am I" endpoints.
- `app/api/projects` — Creates a project from a real GitHub repository.
- `prisma/schema.prisma` — The data model: users, GitHub accounts, installations, repositories, projects.

## Data

Stored in a PostgreSQL database (Supabase). A project only records the repository the user picked — RepoGuide does **not** store repository code. All GitHub access is read-only.

## How to Customize

- **Colors**: edit the `:root` and `.dark` color variables at the top of `app/globals.css`. The brand accent is `--brand`.
- **Fonts**: swap `Space_Grotesk` / `DM_Sans` in `app/layout.tsx`.
- **Navigation**: sidebar links are in `components/app-shell/app-sidebar.tsx`.
- **GitHub credentials**: in the `.env.local` file (kept out of git). See `.env.example` for the list.

## Recent Changes

- 2026-08-19: **Fixed first-time sign-in.** Previously, the very first time someone connected their GitHub account the app wasn't installed yet, so GitHub came back without an authorization code and the person was never signed in (just bounced back to the home page). Now, when that happens, the app automatically starts the GitHub sign-in again — and since the app is now installed, the second round completes and signs the person in.
- 2026-08-18: **Phase 2 live.** Real GitHub sign-in, real repository listing, project creation with "Not analyzed yet" status, PostgreSQL data layer, session-based auth. Removed the mock data layer and the placeholder project workspace. Verified: GitHub App JWT works, app permissions are read-only, database tables created and reachable from the app, build/lint/typecheck pass.

## Coming in Phase 3

- Repository cloning + AI-powered analysis (architecture, docs, flows, issues)
- Grounded codebase Q&A chat
- Team plans and billing