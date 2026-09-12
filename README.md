# Family Communicator

Family Communicator is a private family home base for shared plans, household tasks, family updates, check-ins, and safety alerts. It is designed to reduce coordination stress without turning care into surveillance.

## What works in this first build

- Create a new family account or join with an invite code
- Secure password login with temporary lockout after repeated failures
- Mobile-first family dashboard
- Shared calendar and household tasks
- Family announcement board
- Quick safety check-ins and household SOS alerts
- Role-aware experiences for admins, parents, children, and guests
- Privacy settings that default location sharing to off

## Technology

- Next.js App Router, React, and TypeScript
- Server Actions for validated writes
- Neon Postgres with transaction-scoped family context
- PostgreSQL row-level security and least-privilege runtime roles
- Signed, HTTP-only, 12-hour session cookies
- Drizzle schema definitions and versioned SQL migrations

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Add a pooled Neon connection for the `thuis_runtime` role.
3. Generate `SESSION_SECRET` with `openssl rand -base64 32`.
4. Run `npm install` and `npm run dev -- -H 127.0.0.1`.

Useful checks:

```bash
npm run typecheck
npm run lint
npm test
npm run build
npm run test:db
```

`test:db` creates a temporary family inside a transaction, verifies auth, RLS context, and core writes, and then rolls the transaction back.

## Database workflow

Development currently targets the isolated Neon branch `dev-thuis-rebuild` (`br-purple-art-b11r8ekb`) in project `family-db-security`. The production `main` branch has not been changed.

Apply migrations in numeric order. Do not use `drizzle-kit push` against a shared or production branch; review and apply SQL migrations explicitly.

## Privacy model

Every request enters a transaction, assumes one family tier role, and calls `app.set_context(member_id)`. PostgreSQL then enforces household isolation and record visibility. Location sharing is opt-in, safety data is audited with sensitive values redacted, and the web process cannot query authentication tables directly.
