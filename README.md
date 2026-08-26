# ReachInbox Email Scheduler

A production-minded email scheduling service and dashboard built as a hiring assignment. Development is intentionally organized into reviewable milestones.

## Current status

Milestones 1–14 — core backend, Google OAuth, and the React scheduling dashboard are implemented. End-to-end delivery verification and final documentation remain.

The application endpoints, database schema, worker, authentication, and UI will be added in later milestones. They are not claimed as implemented yet.

## Planned architecture

```text
React + Vite dashboard
        |
        | REST with authenticated session
        v
Express API ---- PostgreSQL (application source of truth)
        |
        +-------- Redis ---- BullMQ delayed jobs ---- Email worker ---- Ethereal SMTP
```

## Repository layout

```text
reachinbox-email-scheduler/
├── backend/          # Express API, Prisma, queue, and worker
├── frontend/         # React, Vite, and Tailwind dashboard
├── docker-compose.yml
├── package.json      # npm workspaces and shared commands
└── README.md
```

## Prerequisites

- Node.js 20 or newer
- npm 10 or newer
- Docker Desktop with Docker Compose

## Initial setup

```bash
npm install
docker compose up -d
```

Copy the example environment files before running future milestones:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Do not commit either `.env` file.

## Local infrastructure

- PostgreSQL 16 is exposed on `localhost:5432`.
- Redis 7 is exposed on `localhost:6379`.
- Both services use named volumes, so data survives container recreation unless the volumes are explicitly deleted.
- Redis AOF persistence is enabled to improve durability of BullMQ data during local development.

Check service health with:

```bash
docker compose ps
```

## Milestones

1. Repository/project setup — complete
2. Express + TypeScript health endpoint — complete
3. PostgreSQL + Prisma — complete
4. Redis connection — complete
5. BullMQ queue + worker — complete
6. Basic email scheduling
7. Ethereal SMTP
8. Concurrency + minimum delay
9. Redis-backed hourly rate limiting
10. Idempotency + restart persistence
11. Google OAuth — complete
12. React dashboard — complete
13. CSV upload — complete
14. Scheduled/Sent views — complete
15. Testing + error handling
16. Optional Campaign Assistant
17. Final README + demo preparation

## Milestone 1 notes

The root uses npm workspaces so backend and frontend dependencies can be installed together while each application keeps its own scripts and dependency list. PostgreSQL and Redis run in Docker; Node processes remain local for a fast edit/reload loop.

For an interview, be ready to explain why PostgreSQL will be the application source of truth, why Redis is appropriate for BullMQ and distributed counters, and why secrets belong in ignored `.env` files rather than source control.
