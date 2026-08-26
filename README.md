# ReachInbox Email Scheduler

This project is an email scheduling system built for the ReachInbox software development internship assignment. A user can sign in with Google, upload a recipient list, schedule a campaign, and follow each email from scheduled to sent.

The main engineering focus is reliable background processing: PostgreSQL stores application state, BullMQ stores delayed jobs in Redis, and a separate worker sends messages through Ethereal SMTP while enforcing distributed sending limits.

## Features

- Google OAuth with Redis-backed server sessions
- Campaign creation from CSV or text recipient lists
- BullMQ delayed jobs without cron or polling
- PostgreSQL records for every campaign and recipient
- Separate API and worker processes
- Configurable worker concurrency
- Sender-specific minimum spacing and hourly limits
- Atomic Redis rate-limit reservations across workers
- Rescheduling instead of dropping rate-limited jobs
- Retry handling and idempotent sent-status checks
- Recovery check for missing jobs after API startup
- Scheduled and Sent dashboards scoped to the authenticated user
- Loading, empty, validation, and error states
- Ethereal preview URL logging

## Architecture

```text
React + Vite dashboard (localhost:5173)
        |
        | REST + HTTP-only session cookie
        v
Express API (localhost:5000)
        |
        +---------------- PostgreSQL
        |                  Users, senders, campaigns,
        |                  scheduled-email state
        |
        +---------------- Redis
                           Sessions, BullMQ delayed jobs,
                           distributed rate-limit state
                                  |
                                  v
                           BullMQ email worker
                                  |
                                  v
                           Ethereal SMTP
```

PostgreSQL is the application source of truth. Redis is infrastructure for sessions, BullMQ, and atomic rate-limit state. The frontend never connects directly to either data store.

## Tech stack

**Backend:** Node.js, TypeScript, Express 5, Prisma, PostgreSQL, BullMQ, Redis, Nodemailer, Passport, Zod, Vitest.

**Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, Axios, React Hot Toast.

**Infrastructure:** Docker Compose, PostgreSQL 16, Redis 7 with append-only persistence.

## Project structure

```text
reachinbox-email-scheduler/
├── backend/
│   ├── prisma/             # schema and migrations
│   └── src/
│       ├── config/         # environment and Passport
│       ├── controllers/    # HTTP handlers
│       ├── db/             # Prisma client
│       ├── middleware/     # authentication and errors
│       ├── queues/         # BullMQ queue
│       ├── redis/          # queue and session clients
│       ├── routes/         # auth and email routes
│       ├── services/       # scheduling, SMTP, limits, recovery
│       ├── validation/     # Zod schemas
│       └── workers/        # email worker
├── frontend/src/
│   ├── components/
│   ├── lib/
│   ├── pages/
│   └── types/
├── examples/recipients.csv
└── docker-compose.yml
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop with Docker Compose
- A Google Cloud OAuth web client
- An Ethereal Email test account

The project was verified with Node.js 24, npm 11, PostgreSQL 16, and Redis 7.

## Local setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create environment files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

PowerShell equivalent:

```powershell
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
```

Both real `.env` files are ignored by Git.

### 3. Start PostgreSQL and Redis

```bash
docker compose up -d
docker compose ps
```

Wait until both services report `healthy`.

### 4. Prepare the database

```bash
npm run db:generate
npm run db:migrate
```

### 5. Start the application

Use three terminals from the repository root.

```bash
# Terminal 1: Express API
npm run dev:backend

# Terminal 2: BullMQ worker
npm run worker

# Terminal 3: React frontend
npm run dev:frontend
```

Open [http://localhost:5173](http://localhost:5173).

## Environment variables

### Backend

| Variable | Purpose | Local example |
|---|---|---|
| `NODE_ENV` | Runtime mode | `development` |
| `PORT` | Express port | `5000` |
| `FRONTEND_URL` | CORS origin and OAuth redirect target | `http://localhost:5173` |
| `DATABASE_URL` | PostgreSQL connection | `postgresql://reachinbox:reachinbox@localhost:5432/reachinbox?schema=public` |
| `REDIS_URL` | Queue, limits, and session Redis | `redis://localhost:6379` |
| `WORKER_CONCURRENCY` | Parallel jobs in one worker | `5` |
| `MIN_EMAIL_DELAY_MS` | Global minimum spacing per sender | `2000` |
| `MAX_EMAILS_PER_HOUR` | Global maximum per sender | `200` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | secret value |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | secret value |
| `GOOGLE_CALLBACK_URL` | Exact OAuth callback | `http://localhost:5000/auth/google/callback` |
| `SESSION_SECRET` | Signs the session cookie | long random value |
| `ETHEREAL_HOST` | SMTP host | `smtp.ethereal.email` |
| `ETHEREAL_PORT` | SMTP port | `587` |
| `ETHEREAL_USER` | Ethereal username | secret value |
| `ETHEREAL_PASSWORD` | Ethereal password | secret value |

### Frontend

| Variable | Purpose | Local example |
|---|---|---|
| `VITE_API_URL` | Express API origin | `http://localhost:5000` |

Never commit OAuth credentials, SMTP credentials, or session secrets.

## Google OAuth setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Configure Google Auth Platform with an External audience in Testing mode.
3. Add the Google account used for the demo as a test user.
4. Create an OAuth client with type **Web application**.
5. Add these authorized JavaScript origins:

```text
http://localhost:5173
http://localhost:5000
```

6. Add this exact redirect URI:

```text
http://localhost:5000/auth/google/callback
```

7. Put the generated client ID and secret in `backend/.env`.

The callback creates or updates the user, establishes a Redis-backed session, and redirects to `/dashboard`. Authentication uses an HTTP-only cookie rather than local storage.

## Ethereal setup

1. Create a test account at [ethereal.email](https://ethereal.email/create).
2. Copy its SMTP details into `backend/.env`.
3. Start the worker.

Ethereal accepts messages but does not deliver them to real recipients. The worker logs a preview URL after every successful send.

## API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | No | Checks API, PostgreSQL, and Redis |
| `GET` | `/auth/google` | No | Begins Google OAuth |
| `GET` | `/auth/google/callback` | Google | Completes OAuth |
| `GET` | `/auth/me` | Yes | Returns the current user |
| `POST` | `/auth/logout` | Yes | Destroys the session |
| `POST` | `/api/emails/schedule` | Yes | Creates a campaign and delayed jobs |
| `GET` | `/api/emails/scheduled` | Yes | Lists pending emails |
| `GET` | `/api/emails/sent` | Yes | Lists sent/failed emails |

Schedule request example:

```json
{
  "senderEmail": "sender@example.com",
  "senderDisplayName": "Example Sender",
  "subject": "Product update",
  "body": "Hello from ReachInbox",
  "recipients": ["alice@example.com", "bob@example.com"],
  "startTime": "2026-08-26T12:00:00.000Z",
  "delaySeconds": 2,
  "hourlyLimit": 200
}
```

The client never submits a user ID. The authenticated session determines ownership.

## Scheduling flow

1. Zod validates the request on the backend.
2. Duplicate recipients are removed.
3. A PostgreSQL transaction creates the sender, campaign, and one `ScheduledEmail` per recipient.
4. Each email receives a unique idempotency key and deterministic BullMQ job ID.
5. Initial times use `startTime + recipientIndex × delaySeconds`.
6. `addBulk` writes delayed jobs to BullMQ.
7. At the due time, a worker loads authoritative data from PostgreSQL.
8. Redis atomically reserves sender capacity.
9. The worker sends through Ethereal and records `SENT`, or records retry/failure state.

Example for a two-second delay:

```text
jai@example.com      10:00:00
anzi@example.com     10:00:02
vihu@example.com     10:00:04
```

## Concurrency and minimum delay

`WORKER_CONCURRENCY` controls how many jobs one worker may process concurrently. Concurrency improves throughput, but cannot guarantee provider-safe spacing by itself.

Before SMTP, every worker calls the same Redis Lua script. It checks and updates a sender-specific next-allowed timestamp atomically. The effective delay is:

```text
max(campaign delay, MIN_EMAIL_DELAY_MS)
```

If a parallel worker arrives early, its job moves back to BullMQ's delayed set. No process-local counter or `setTimeout` coordinates workers.

## Hourly rate limiting

The effective limit is:

```text
min(campaign hourly limit, MAX_EMAILS_PER_HOUR)
```

Redis keys are scoped by sender and UTC hour:

```text
email-rate:{senderId}:{YYYY-MM-DDTHH}
email-spacing:{senderId}
```

One Lua script checks hourly capacity, checks spacing, reserves the slot, increments the counter, and sets expirations. The atomic operation prevents multiple workers or instances from claiming the same final slot.

When the limit is reached, the script returns the next UTC hour. The worker updates `scheduledAt`, moves the job back to the delayed set, and keeps status `SCHEDULED`. It does not drop the email or consume a normal retry.

Capacity is counted when reserved. A later SMTP failure still consumes that slot. This is conservative: failures may under-use capacity, but workers do not exceed the provider limit.

## Restart persistence

- PostgreSQL stores application state in a persistent Docker volume.
- BullMQ stores delayed jobs in Redis.
- Redis append-only persistence is enabled.
- Node processes hold no authoritative timers in memory.

At API startup, a one-time reconciliation reads pending rows and checks whether each deterministic BullMQ job exists. Only missing jobs are restored; existing delayed jobs remain untouched.

Verified scenario:

1. Three emails were scheduled several minutes ahead.
2. The API and worker stopped while PostgreSQL and Redis stayed running.
3. PostgreSQL retained three rows and BullMQ retained three delayed jobs.
4. On restart, reconciliation logged `pending: 3, restored: 0`.
5. The original jobs fired at their original timestamps.
6. Exactly three Ethereal messages were accepted without duplicates.

## Idempotency

- Every ScheduledEmail has a unique `idempotencyKey`.
- BullMQ uses the ScheduledEmail ID as its deterministic `jobId`.
- The worker skips a record already marked `SENT`.
- The final update changes only rows not already marked `SENT`.

This is effectively-once application behavior, not guaranteed exactly-once SMTP delivery. A process can theoretically crash after SMTP accepts a message but before PostgreSQL records `SENT`. SMTP and PostgreSQL cannot share one transaction. A production provider supporting idempotency keys or delivery-event reconciliation would reduce this risk.

## Multiple senders

`Sender` is a separate model. Sender uniqueness is scoped to the authenticated user, every email references its sender, and rate-limit keys are sender-specific.

The dashboard uses the signed-in user as its initial sender. The backend accepts other sender identities for that user. All local senders share the configured Ethereal account because Ethereal is the assignment's fake provider; real provider credentials would use encrypted per-sender references.

## Behavior with 1,000+ recipients

The API creates one campaign and 1,000 persistent ScheduledEmail rows, then uses BullMQ `addBulk` with deterministic IDs. Configurable workers process jobs while the Redis Lua script limits their collective send rate.

If the limit is 200/hour, overflow remains delayed for later UTC windows. Pending rows stay in PostgreSQL and survive Node restarts. The design does not create 1,000 in-memory timers.

Trade-offs:

- `addBulk` still creates work proportional to recipient count; larger production imports should be chunked.
- Startup reconciliation checks jobs individually; a larger system should batch or paginate it.
- Fixed UTC windows can create a boundary burst; a sliding window would be smoother.

## Frontend

- Google login redirects to the dashboard.
- The sidebar shows name, email, avatar/fallback, and logout.
- CSV/text parsing happens in the browser; only extracted addresses reach the API.
- Invalid values are reported and ignored; duplicates are normalized and removed.
- Scheduled and Sent views include search, loading, empty, and error states.
- Styling follows the supplied Figma's white, grey, and green visual language.

Password login, rich-text editing, arbitrary attachments, starring, deletion, and the email-reading screen were omitted because the official assignment does not require them.

## Testing

Start PostgreSQL and Redis before the suite because one rate-limit test exercises real Redis using an isolated sender key.

```bash
npm run test
npm run typecheck
npm run build
```

The nine verified tests cover:

- Recipient parsing, normalization, invalid values, and deduplication
- Initial scheduling and nonnegative BullMQ delay calculations
- Schedule-request validation
- Already-sent idempotency behavior
- Redis hourly overflow to the next UTC hour

## Assumptions and limitations

- One Ethereal SMTP credential set is used locally; sender identity is still modeled separately.
- Hourly limiting uses fixed UTC windows.
- Reserved capacity counts even when SMTP later fails.
- The SMTP/database boundary cannot guarantee exactly-once delivery.
- PostgreSQL and queue writes cannot share one transaction; startup reconciliation repairs missing jobs.
- Additional sender-management UI is out of scope.
- The project is demonstrated locally rather than publicly deployed.
- The optional Campaign Assistant is not implemented; the official assignment does not require AI.

## Requirement checklist

### Backend

- [x] TypeScript and Express
- [x] PostgreSQL relational persistence
- [x] Redis-backed BullMQ delayed jobs
- [x] No cron jobs
- [x] Ethereal SMTP
- [x] Multiple-sender architecture
- [x] Configurable worker concurrency
- [x] Distributed minimum delay
- [x] Configurable sender-specific hourly limiting
- [x] Atomic multi-worker rate-limit state
- [x] Overflow rescheduling without permanent failure
- [x] Idempotent job handling
- [x] Node restart persistence
- [x] Behavior defined for 1,000+ recipients

### Frontend

- [x] React, TypeScript, and Tailwind CSS
- [x] Real Google OAuth
- [x] User name, email, avatar, and logout
- [x] Scheduled and Sent sections
- [x] Compose page
- [x] CSV/text upload and recipient count
- [x] Start time, delay, and hourly limit
- [x] Scheduled and Sent tables
- [x] Loading, empty, and error states
- [x] Reusable typed components

## Demo plan (under five minutes)

1. **0:00–0:30** — Show Docker services and explain API, worker, PostgreSQL, and Redis.
2. **0:30–0:55** — Sign in with Google and show the authenticated profile.
3. **0:55–1:40** — Compose, upload `examples/recipients.csv`, and configure timing/limits.
4. **1:40–2:20** — Schedule and show three rows with two-second offsets.
5. **2:20–2:55** — Show worker logs/Ethereal preview, then refresh Sent.
6. **2:55–3:55** — Schedule ahead, stop API/worker, show Docker remains running, restart, and point out `restored: 0`.
7. **3:55–4:25** — Show the Redis limit test and explain overflow rescheduling.
8. **4:25–4:55** — Show tests and summarize trade-offs.

