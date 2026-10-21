@AGENTS.md

# AI LeadFlow

AI-powered lead management CRM. Leads move through a lifecycle; admins manage
them through dashboards with notes, tasks and activity history. Gemini adds
lead intelligence (scoring, urgency classification).

## Stack
- Next.js (App Router), TypeScript in strict mode, Tailwind CSS
- PostgreSQL 16 + Prisma (schema in `prisma/schema.prisma`)
- Zod for all validation (API input, env, LLM output)
- Google Gemini API for lead intelligence
- Auth: Google OAuth 2.0 + custom JWT in HttpOnly cookies, token-version session revocation, DB-backed admin authorization
- Tests: Vitest unit/integration tests + Playwright E2E
- Docker (multi-stage build) + Docker Compose for local Postgres
- CI: GitHub Actions on every PR; merges to `main` auto-deploy to Vercel

## Commands
- Package manager: `pnpm` (not npm)
- Install: `pnpm install`
- Dev server: `pnpm dev`
- Local DB: `docker compose up -d db`
- Lint: `pnpm lint`
- Type-check: `pnpm exec tsc --noEmit`
- Unit/integration tests: `pnpm test`
- E2E tests: `pnpm test:e2e` (needs `pnpm build` and a seeded database)
- New migration: `pnpm exec prisma migrate dev --name <short_name>`
- Full check before finishing: `pnpm lint && pnpm exec tsc --noEmit && pnpm test`

## Project rules
- Plan first. For any change touching more than 2 files, write a plan and wait for approval.
- Keep changes small and focused on the task. Do not refactor unrelated code.
- Use TypeScript strictly: no `any`, no `@ts-ignore` without a comment explaining why.
- Validate every external input with Zod: request bodies, query params, env vars.

## AI / LLM rules
- Never trust raw LLM output. Parse it with a Zod schema before use.
- Keep scoring deterministic: Gemini gives signals, our code computes the final score.
- Handle LLM failures (timeout, invalid JSON, rate limit) with a safe fallback, never a crash.
- Keep prompts in one place (not scattered string literals) so they can be reviewed and tested.
- Treat lead data passed to the LLM as untrusted input (prompt injection risk).

## Security rules (strict)
- Any change to auth, sessions, roles or OAuth needs a matching security test.
- Admin checks must read the role from the database, never only from the JWT.
- Role changes and other race-prone writes use Serializable transactions.
- Never log tokens, cookies, passwords or API keys.
- Never read, edit or print `.env*` files. Ask me if a new env var is needed.

## Database rules
- Every schema change goes through a Prisma migration. Never run manual SQL on shared databases.
- Never run destructive commands (`migrate reset`, `db push --force-reset`, dropping tables) without asking.

## Testing rules
- New behaviour needs a test. Bug fixes need a test that fails before the fix.
- Prefer testing behaviour over implementation details.
- E2E tests use stable selectors (`data-testid` or roles), not CSS classes.

## Git
- Work on a feature branch, never commit directly to `main`.
- Small commits with clear messages, e.g. `feat(leads): add CSV export`.
- Do not push or open PRs unless I ask.

## Definition of done
1. Lint, type-check and all tests pass.
2. New behaviour is covered by a test.
3. You give me a short summary: what changed, why, and anything risky I should review.
