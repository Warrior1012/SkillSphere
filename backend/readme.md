# SkillSphere API

REST API and real-time server for SkillSphere, a hyperlocal freelance
marketplace. Node.js, Express, MongoDB, and Socket.IO.

## Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Runtime | Node.js 18+ | |
| Framework | Express 4 | Pinned deliberately — Express 5 changes async error handling and route-pattern syntax; 4 is the mature, stable target for this codebase's patterns |
| Database | MongoDB via Mongoose | Requires a replica set (register and payment-acceptance use multi-document transactions) — any MongoDB Atlas cluster, including the free tier, satisfies this |
| Real-time | Socket.IO | JWT-authenticated handshake; shares the same HTTP server as the REST API |
| Auth | JWT (access + refresh) | Access token short-lived, refresh token in an httpOnly cookie |
| Validation | Zod | Every mutating route validates input before touching the database |
| Payments | Provider abstraction (mock / Stripe / Razorpay) | Auto-selects based on which environment variables are set; defaults to a fully functional mock provider if none are configured |
| File storage | Cloudinary | Optional — returns a clear `501` on the upload endpoint if unconfigured |
| Testing | Jest + Supertest | Mocked database layer |

## Getting started

```bash
cp .env.example .env
# fill in MONGO_URI at minimum — see "Environment variables" below
npm install
npm run dev
```

Server listens on `PORT` (default `5000`). Health check: `GET /api/health`.

## Environment variables

Everything except `MONGO_URI` and the JWT secrets degrades gracefully when
unset — the server still boots, and only the routes that need the missing
config return a `501` or `503` with a clear message explaining what to set.

| Variable | Required | Purpose |
|---|---|---|
| `NODE_ENV` | No (default `development`) | |
| `PORT` | No (default `5000`) | |
| `CLIENT_URL` | Yes | Frontend origin — used for CORS and links in emails |
| `MONGO_URI` | **Yes** | MongoDB connection string. Must point to a replica set. |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | Yes in production | Falls back to an insecure dev value locally; the server refuses to boot in production without these set |
| `JWT_ACCESS_EXPIRES` / `JWT_REFRESH_EXPIRES` | No | Defaults: `15m` / `7d` |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `EMAIL_FROM` | No | Without these, outgoing email is logged to the console instead of sent — the full auth flow (register, verify, reset) is still testable |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_CALLBACK_URL` | No | Google OAuth login. `/api/auth/google` returns `501` until set |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | No | Used only by `npm run seed:admin` |
| `STRIPE_SECRET_KEY` | No | If set, payments route through Stripe (PaymentIntents, manual capture) |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | No | If set (and Stripe isn't), payments route through Razorpay (Orders API) |
| `PAYMENT_CURRENCY` | No (default `usd`) | |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | No | File uploads. `/api/uploads` returns `501` until set |

Generate real JWT secrets with:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## Project structure

```
src/
├── config/        # env parsing, DB connection, Passport (Google OAuth), Cloudinary
├── models/        # Mongoose schemas
├── controllers/   # request handlers / business logic
├── routes/        # Express routers
├── middleware/    # auth, RBAC, validation, rate limiting, file upload, error handling
├── validators/    # Zod schemas
├── services/
│   └── payments/  # provider abstraction — mock, Stripe, Razorpay adapters
├── utils/         # JWT, email, matching algorithm, fraud heuristics, reputation
│                  # scoring, scheduling logic, notifications, response helpers
├── sockets/       # Socket.IO server
├── scripts/       # seedAdmin.js
├── app.js         # Express app assembly (exported separately for tests)
└── server.js      # entry point — connects the DB, attaches Socket.IO, starts listening
```

## Data model

Nine top-level collections, all referencing a single `User` document with a
`role` field (`client` / `freelancer` / `admin`) that drives access control
throughout: `User`, `FreelancerProfile`, `ClientProfile`, `Gig`, `Proposal`,
`Conversation`, `Message`, `Review`, `Notification`, `Payment`, `Dispute`,
`Booking`.

## Authentication

- Passwords hashed with bcrypt (cost factor 12), never returned in any API
  response
- Access tokens are short-lived JWTs; refresh tokens live in an httpOnly
  cookie and are rotated on every use
- Two-factor authentication via TOTP (`speakeasy` + `qrcode`)
- Google OAuth via Passport, optional
- Role-based access control enforced server-side on every protected route —
  never assumed from the frontend alone
- Admin accounts are not publicly self-registerable; create one with
  `npm run seed:admin`

## Payments

Payments use an authorize-then-capture pattern: funds are held, then either
released to the freelancer or refunded to the client. **This is not the same
as true escrow** — neither Stripe nor Razorpay offers that as a product; both
say so in their own documentation. What's implemented here holds funds for a
limited window (days, governed by the provider), which is appropriate for
short-turnaround work. Production use with longer milestone timelines would
need Stripe Connect or Razorpay Route (delayed payouts to connected
sub-accounts), which is a separate, larger integration and is not implemented.

With no payment provider configured, a fully functional **mock provider**
handles the entire fund → hold → release/refund lifecycle instantly and
locally, so the payment flow is testable without any external account setup.

An open dispute on a payment blocks release and refund until an admin
resolves it.

## Matching algorithm

Freelancer recommendations are ranked by a weighted score: skill overlap
(Jaccard similarity), reputation, and — for on-site gigs — geographic distance
(haversine formula). This is a deterministic algorithm, not a machine-learning
model. It's built behind a single function (`utils/matching.js`) so the
skill-similarity scoring specifically could be swapped for an embeddings-based
approach later without changing anything else.

## Testing

```bash
npm test
```

Tests run against the real Express app via Supertest with the Mongoose model
layer mocked — this exercises routing, middleware ordering, validation, JWT
handling, and controller logic without requiring a live database.

`tests/manual/socket-smoke-test.mjs` is a standalone script (not part of the
Jest suite) that opens real Socket.IO client connections against a running
server to verify the authentication handshake:
```bash
npm run dev &
node tests/manual/socket-smoke-test.mjs
```

## Known limitations

- No integration tests against a live MongoDB instance — only mocked-model
  tests. Run the app against a real database yourself before deploying.
- Stripe and Razorpay adapters are implemented against current provider
  documentation but have not been exercised against live or test-mode
  accounts.
- Search uses MongoDB text indexes and regex matching, not a dedicated search
  service (Atlas Search / Elasticsearch).
- Rate limiting and input validation cover the endpoints most exposed to
  abuse (auth, payments); this is not an exhaustively hardened API.
- No email digest for notifications — in-app and Socket.IO delivery only.
