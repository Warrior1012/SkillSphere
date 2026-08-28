# SkillSphere

Intelligent hyperlocal freelance ecosystem — MERN stack. Built against the Nayoda
internship project spec.

**Status**: Weeks 1-4 essentially complete — auth, profiles, gig marketplace,
matching, chat, reviews/reputation, payments, admin dashboard, progress tracking,
dispute resolution. See [`PROGRESS.md`](./PROGRESS.md) for the exact checklist and
[`IMPLEMENTATION_REPORT.md`](./IMPLEMENTATION_REPORT.md) for architectural decisions
— **read §11 before your review**, it explains an important limitation in the
payment system you should be able to speak to if asked.

## Stack

- **Backend**: Node.js, Express 4, MongoDB (Mongoose), JWT auth, Socket.IO, Zod
  validation, Stripe/Razorpay (with a working mock provider as default), Cloudinary
- **Frontend**: React 19, Vite, Tailwind CSS v4, Redux Toolkit, TanStack Query,
  React Router 6, Socket.IO client

## Quick start

```bash
# 1. Backend
cd backend
cp .env.example .env
# Fill in MONGO_URI at minimum — get a free cluster at mongodb.com/cloud/atlas
npm install
npm run dev          # → http://localhost:5000 (REST API + Socket.IO, same port)

# 2. Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev           # → http://localhost:5173
```

**Full end-to-end walkthrough** (do this before the 22nd): register a client account
and a freelancer account → client posts a gig → freelancer submits a proposal →
client accepts → either side messages the other → client funds a milestone (works
instantly, no payment keys needed — mock provider) → freelancer marks it in
progress, then submitted → client approves it, watch the progress bar move → client
releases payment → try raising a dispute on a payment and confirm release/refund is
blocked until resolved → client marks the gig complete → both sides leave a review
→ `npm run seed:admin`, log in as admin → check Users, Flagged Reviews, Disputes,
and Analytics all reflect everything that just happened.

## Project structure

```
skillsphere/
├── backend/
│   ├── src/
│   │   ├── config/        # env, db, passport, cloudinary
│   │   ├── models/        # User, FreelancerProfile, ClientProfile, Gig, Proposal,
│   │   │                  # Conversation, Message, Review, Notification, Payment
│   │   ├── controllers/   # business logic
│   │   ├── routes/        # Express routers
│   │   ├── middleware/    # auth, rbac, validation, rate limits, upload, errors
│   │   ├── validators/    # Zod schemas
│   │   ├── services/
│   │   │   └── payments/  # provider abstraction: mock / stripe / razorpay
│   │   ├── utils/         # jwt, email, matching, fraudSignals, reputationScoring,
│   │   │                  # notify, ApiError/ApiResponse
│   │   ├── sockets/        # Socket.IO server (JWT-authenticated)
│   │   └── scripts/       # seedAdmin.js
│   └── tests/
│       ├── *.test.js      # Jest/Supertest, mocked DB layer
│       └── manual/        # socket-smoke-test.mjs — real connections, run by hand
├── frontend/
│   └── src/
│       ├── app/            # Redux store
│       ├── services/       # API clients (axios) + socket client singleton
│       ├── components/     # design system, route guards, NotificationBell
│       ├── layouts/        # AuthLayout, DashboardLayout
│       └── pages/          # auth/, dashboard/, profile/, settings/, gigs/,
│                            # messages/, payments/, admin/
├── PROGRESS.md
└── IMPLEMENTATION_REPORT.md
```

## Testing

```bash
cd backend && npm test    # 35 tests, mocked database layer
```

This build environment cannot reach MongoDB Atlas, Stripe, Razorpay, or Cloudinary —
everything is tested against mocks. **You need to do one real end-to-end pass with a
live `MONGO_URI` yourself** before relying on this for a live demo.

## Admin accounts

Not publicly self-registerable. Set `ADMIN_EMAIL`/`ADMIN_PASSWORD` in
`backend/.env`, then `cd backend && npm run seed:admin`.

## What's next

Availability Scheduler is the one genuinely unbuilt module left — see `PROGRESS.md`
for why it was the correct thing to deprioritize. Smaller gaps: resume/portfolio
upload UI (backend supports it), message attachments UI, frontend code-splitting.

## Known trade-offs (read before your review)

- Security/hardening was deliberately kept at "correct but not gold-plated" from Week
  2 onward (explicit direction, not an oversight) — ownership/RBAC checks are
  enforced everywhere; extra rate-limiting and exhaustive edge-case validation were
  not layered on past what Week 1's auth system has.
- Payments are real, working code against verified-current API docs — but genuinely
  untested against live Stripe/Razorpay accounts, and implement a short-term hold
  (days), not indefinite escrow. See IMPLEMENTATION_REPORT.md §11.
- Disputes actually freeze the underlying payment (release/refund are blocked while
  one is open) — this was a deliberate correctness decision, not just a data model.
- The "AI matching" (Module 2) is a real, working, non-ML algorithm, not a
  HuggingFace call — see IMPLEMENTATION_REPORT.md §4.
- Availability Scheduler (Module 12) has no real implementation — see §13.
- No live MongoDB was ever connected during this build.
