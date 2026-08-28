# SkillSphere

An intelligent hyperlocal freelance marketplace — clients post work, verified
local freelancers apply, and the platform handles matching, real-time
communication, milestone-based payments, scheduling, and dispute resolution
end to end.

Full-stack MERN application: React frontend, Node/Express API, MongoDB,
Socket.IO for real-time features.

## What's here

| Area | Covers |
|---|---|
| **Accounts & roles** | Client, freelancer, and admin roles with JWT auth, 2FA, Google OAuth, email verification, password reset |
| **Profiles** | Freelancer skills/portfolio/experience/pricing/availability; client company info; public profile pages with reviews |
| **Marketplace** | Gig posting with milestones and budgets, search and filtering, proposal/bidding, freelancer recommendations ranked by skill overlap, reputation, and location |
| **Collaboration** | Real-time chat with typing indicators and read receipts; scheduled calls with automatic conflict-checked booking |
| **Payments** | Milestone-based fund → hold → release/refund flow, with a working mock provider by default and real Stripe/Razorpay adapters available |
| **Trust & safety** | Weighted reputation scoring, automated fraud-signal flagging on reviews, a dispute system that actually freezes payments until resolved |
| **Admin** | User management, freelancer verification, moderation queues, and platform analytics computed from live data |

## Quick start

Two services, run separately.

**Backend** — see [`backend/README.md`](./backend/README.md) for full details:
```bash
cd backend
cp .env.example .env   # set MONGO_URI at minimum
npm install
npm run dev             # http://localhost:5000
```

**Frontend** — see [`frontend/README.md`](./frontend/README.md) for full details:
```bash
cd frontend
cp .env.example .env
npm install
npm run dev              # http://localhost:5173
```

You'll need a MongoDB connection string (a free [MongoDB Atlas](https://mongodb.com/cloud/atlas)
cluster works — it must be a replica set, which Atlas provides by default,
since a couple of operations use multi-document transactions).

Everything else — SMTP, Google OAuth, Stripe/Razorpay, Cloudinary — is
optional. The application runs fully without any of it configured; the
affected features degrade to a clear, explicit response (email verification
logs to the console instead of sending, payments use a working mock provider,
uploads return a plain "not configured" error) rather than failing silently or
crashing.

## Repository layout

```
skillsphere/
├── backend/     # Express API + Socket.IO server — see backend/README.md
├── frontend/    # React app — see frontend/README.md
└── README.md    # this file
```

## Architecture at a glance

- REST API for all persistent state; Socket.IO layered on top for anything
  that needs to be pushed live (new messages, typing indicators, in-app
  notifications) — not a replacement for the REST API, a complement to it
- A single `User` model with a `role` field is the hub every other collection
  references; role-based access control is enforced server-side on every
  protected route
- A payment-provider abstraction picks between a mock implementation and real
  Stripe/Razorpay adapters based on which credentials are configured, so the
  same application code runs identically in a fully-offline dev setup and a
  real-payments deployment
- 55 automated backend tests (Jest + Supertest) covering authentication,
  authorization boundaries, business-rule gates (who can transition what,
  when), and the payment/dispute lifecycle

## Honest limitations

Documented in detail in each subproject's README, summarized here:

- Payments implement a short-term authorize/capture hold, not true escrow —
  no payment provider offers indefinite fund-holding as a simple integration;
  see `backend/README.md` for the specifics and what a production version
  would require.
- The freelancer-matching feature is a deterministic scoring algorithm
  (skill overlap, reputation, distance), not a machine-learning model.
- Search uses MongoDB text/regex matching rather than a dedicated search
  service.
- No live database, payment gateway, or file-storage account was used during
  development — all tested against mocks. Verify against your own live
  credentials before deploying.
- No automated frontend tests yet; no email digest for notifications; resume
  and portfolio file uploads share a working backend endpoint that doesn't
  yet have dedicated frontend controls beyond avatar upload.

## License

Not yet specified — add a `LICENSE` file before treating this as open source
or accepting external contributions.
