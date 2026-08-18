# RepoGuide

> Understand any codebase in minutes — connect a GitHub repository and get an AI-powered map of its architecture, important files, documentation, and codebase Q&A.

## What This Is

RepoGuide is a developer SaaS that helps engineers understand unfamiliar codebases. This is **Phase 1**: the full application shell and UI built with realistic mock data. GitHub integration, AI analysis, embeddings, and codebase chat are intentionally **not implemented yet** — every button that needs them says "Coming in the next phase."

## Pages

- **Home** (`/`) — Landing page with an animated-style hero, how-it-works, features, an example architecture diagram, codebase Q&A preview, pricing, FAQ, and call-to-action sections.
- **Dashboard** (`/dashboard`) — Overview with repository stats (projects, analyzed, currently analyzing, files indexed), recent project cards, analysis status, activity feed, and quick actions.
- **Repositories** (`/repositories`) — Browse and search mock GitHub repositories. Cards show language, visibility, stars, forks, and last-updated. "Analyze" explains that live integration arrives in Phase 2.
- **Project detail** (`/projects/[id]`) — Full analysis workspace with 7 tabs: Overview, Architecture, Files, Documentation, Flows, AI Chat, and Analysis. Uses mock data for three analyzed projects and one in-progress analysis.

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
| `app-shell/app-sidebar.tsx` | Left sidebar (plus bottom nav on phones) |
| `app-shell/app-topbar.tsx` | Top bar with user menu, theme, notifications |
| `dashboard/project-card.tsx` | Project summary card with status + progress |
| `dashboard/stat-card.tsx` | Number/icon stat tile |
| `repositories/repository-card.tsx` | GitHub-style repository card |
| `repositories/repository-list.tsx` | Search + filter list of repositories |
| `project/architecture-card.tsx` | Visual architecture tree |
| `project/file-tree.tsx` | Expandable file explorer |
| `project/chat-interface.tsx` | Simulated codebase Q&A chat |
| `project/project-detail-view.tsx` | The 7-tab project workspace |
| `ui-states/` | Shared EmptyState, LoadingState, StatusBadge |
| `landing/` | The landing page section components |
| `theme-provider.tsx`, `theme-toggle.tsx` | Dark/light mode |

## Mock Data

Realistic data lives in `lib/mock-data.ts` (types in `lib/types.ts`):

- 8 mock repositories across TypeScript, Java, Go, Python, and HCL
- 4 projects — `ecommerce-platform` (Next.js/Prisma/Stripe), `payment-service` (Java/Spring Boot), `mobile-api` (NestJS), and `data-analytics-ingestor` (Go, "currently analyzing")
- Per-project architecture maps, file trees, generated docs, flows, chat history, and analysis issues

## How to Customize

- **Colors**: edit the `:root` and `.dark` color variables at the top of `app/globals.css`. The brand accent is `--brand`.
- **Fonts**: swap `Space_Grotesk` / `DM_Sans` in `app/layout.tsx`.
- **Add a mock project**: add an entry to `mockProjects`, a `ProjectDetail` in `mockProjectDetails`, and a repository if needed (all in `lib/mock-data.ts`).
- **Navigation**: sidebar links are in `components/app-shell/app-sidebar.tsx`.

## Recent Changes

- 2026-08-18: Built Phase 1 application shell — landing page, dashboard, repository browser, and project workspace with 7 tabs, all on mock data. Added dark/light mode, responsive layout, loading/empty/error states, and reusable component library.

## Coming in Phase 2

- GitHub OAuth + real repository listing
- Repository cloning + AI-powered analysis (architecture, docs, flows, issues)
- Grounded codebase Q&A chat
- Team plans and billing