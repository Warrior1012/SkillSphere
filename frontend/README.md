# SkillSphere Web App

React frontend for SkillSphere. Vite, Tailwind CSS v4, Redux Toolkit, and
TanStack Query.

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Build tool | Vite | |
| UI library | React 19 | |
| Routing | React Router 6 | Pinned deliberately — v7 changed to a "framework mode" with different conventions; 6's declarative API is what this app is built on |
| Styling | Tailwind CSS v4 | CSS-first configuration via `@theme` in `src/index.css` — no `tailwind.config.js` |
| Client-side auth/session state | Redux Toolkit | |
| Server state (API data) | TanStack Query | Caching, refetching, invalidation |
| HTTP client | Axios | Configured with an interceptor that silently refreshes an expired access token once before failing |
| Real-time | socket.io-client | Authenticated with the same JWT as REST calls |
| Forms | React Hook Form + Zod | |
| Charts | Recharts | Freelancer earnings chart |

## Getting started

```bash
cp .env.example .env
npm install
npm run dev
```

Runs on `http://localhost:5173` by default. Requires the backend API running
(see `../backend/README.md`).

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `VITE_API_URL` | No (default `http://localhost:5000/api`) | Backend REST API base URL |
| `VITE_SOCKET_URL` | No (default `http://localhost:5000`) | Backend Socket.IO URL |

## Project structure

```
src/
├── app/            # Redux store configuration
├── features/auth/  # auth slice
├── services/       # API clients (one file per resource) + axios instance +
│                    # socket client singleton
├── components/     # shared UI primitives (Button, Input, Card, Badge, …),
│                    # route guards, NotificationBell
├── layouts/         # AuthLayout (split-screen auth pages), DashboardLayout
│                    # (sidebar shell, role-aware navigation)
├── pages/
│   ├── auth/        # login, register, password reset, email verification,
│   │                # OAuth callback
│   ├── dashboard/   # role-specific dashboards (client / freelancer / admin)
│   ├── profile/     # profile view + edit
│   ├── settings/    # security settings (2FA)
│   ├── gigs/        # marketplace, gig detail, create gig, my gigs/proposals
│   ├── messages/    # conversation list + chat window
│   ├── payments/    # transaction history
│   ├── bookings/    # scheduled calls
│   └── admin/       # user management, flagged reviews, disputes
├── App.jsx          # route tree + session bootstrap
└── main.jsx         # entry point — providers (Redux, React Query, Router)
```

## Authentication flow

The access token is kept in memory only (never `localStorage`, to limit
exposure if a script injection vulnerability were ever present) and is
re-established on every page load via a silent call to the refresh endpoint,
which relies on the httpOnly refresh cookie the backend sets. There is
therefore no client-side "logged in" state that persists page reloads by
itself — session restoration always round-trips through the backend.

## Design system

Token-based, defined as CSS custom properties in `src/index.css`:

| Token | Value | Use |
|---|---|---|
| `ink` | `#12151c` | Primary text, dark surfaces |
| `paper` | `#eef0ea` | App background |
| `brass` | `#a9782f` | Signature accent — verification and credential moments |
| `pine` | `#1f5c4f` | Freelancer-side accent, success states |
| `clay` | `#8c3b2e` | Client-side accent, warnings |
| `slate` | `#5b6472` | Borders, muted text |

Typography: Zilla Slab (display), IBM Plex Sans (body), IBM Plex Mono
(numeric/tabular data — reputation scores, prices, stats).

## Building for production

```bash
npm run build
```

Output goes to `dist/`. The build currently produces a single JS bundle over
500KB (flagged by Vite's own build warning); splitting routes with
`React.lazy` would address this and is a reasonable next step before a
production deploy, not yet done.

## Known limitations

- No automated frontend test suite (unit or E2E) — the backend has Jest
  coverage; the frontend does not yet.
- Avatar upload is wired end-to-end; resume and portfolio-image upload use
  the same backend endpoint but don't have a dedicated UI control yet.
- Booking date/time entry uses a plain text prompt, not a calendar picker.
- Bundle is not code-split.
