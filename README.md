# AI LeadFlow

**Live Demo:** [https://ai-leadflow.vercel.app/](https://ai-leadflow.vercel.app/)

An open-source lead management and intelligence platform for service-based businesses, demonstrated through **Nova Dental** (a dental clinic practice reference implementation).

AI LeadFlow combines an authoritative, deterministic qualification engine with an on-demand, advisory AI intelligence layer (Google Gemini). Front-desk coordinators can triage inbound inquiries, manage consultation pipelines, and coordinate follow-up tasks—without delegating critical business decisions or database mutations to an unconstrained LLM.

---

## Core Architectural Principles

- **Deterministic Scoring is Authoritative:** Lead scores (0–100) and temperature bands (`COLD`, `WARM`, `HOT`) are computed strictly by deterministic rules (`scoring.ts`) based on contact completeness, service intent, inquiry depth, team engagement, and recency. The AI model never computes, overrides, or alters scores.
- **On-Demand Advisory AI:** AI analysis is triggered exclusively when staff click **"Generate AI Insight"** in the lead drawer. It never executes on page load, background cron jobs, or automated pipelines.
- **Strict Data & PII Boundaries:** Prompts receive only sanitized operational context (first name, requested service, message content, score factors). Direct contact info (email, phone), passwords, and tokens are omitted. User-provided text is wrapped in XML delimiters (`<lead_message>`, `<internal_notes>`, `<tasks>`) to mitigate prompt injection.
- **Zero Direct Database Mutations:** AI responses must satisfy a strict Zod contract (`leadIntelligenceSchema`) and remain in transient UI component state. The LLM has zero write access to application state or database records.

---

## Architecture & Data Flow

```mermaid
flowchart TD
    A[Visitor / Prospective Patient] -->|Register or Sign In| B[HttpOnly JWT Session Cookie]
    B --> C[Consultation Form POST /api/leads]
    C -->|Server derives Lead.userId from session| D[(PostgreSQL Database)]
    D --> E[Patient Portal /portal\nReal-time Milestones]
    D --> F[Admin CRM /admin/*\nLead Triage & Pipeline]
    F --> G[Deterministic Scoring Engine\nAuthoritative 0-100 & Temp Bands]
    F -->|Explicit User Trigger| H[Sanitized AI Context\nPII Stripped + XML Delimiters]
    H --> I[Google Gemini API\ngemini-3.5-flash-lite]
    I -->|Zod Schema Validation| J[Advisory Insights in UI Drawer\nTransient State / Zero DB Writes]
```

---

## Product Features

### Patient Experience (`Role.USER`)
* **Nova Dental Landing Page:** Responsive presentation of clinic services, clinician credentials, FAQs, and consultation booking.
* **Dynamic Authentication Navigation:** Navbar automatically adapts to session state (`Sign In`, `My Portal →`, or `Admin Dashboard →`).
* **Self-Service Registration & Booking:** Real-time form validation, bcrypt password hashing, and consultation requests automatically attributed to the user session.
* **Patient Portal (`/portal`):** User-isolated consultation tracking with real-time status milestones (`In Review`, `Team Contacted You`, `Confirmed & Scheduled`, `Archived / Inactive`).

### Clinic Operations & CRM (`Role.ADMIN`)
* **Lead Intelligence Dashboard (`/admin/dashboard`):** High-level metrics for total volume, pipeline distribution, task completion, and recent activity.
* **Searchable Leads Management (`/admin/leads`):** Paginated leads table with real-time search, status filtering, and inline status updates.
* **Lead Details Drawer:** Slide-over panel containing contact details, consultation history, deterministic score breakdown, and advisory AI insights.
* **Team & Role Management:** Administration of clinic team accounts with last-admin demotion safeguards, concurrent role protection under Serializable transactions, and instant session revocation via database `tokenVersion` tracking.
* **Unified Activity Timeline:** Chronological event feed auditing status changes, notes, tasks, and administrative updates.

---

## Tech Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Framework** | [Next.js 16](https://nextjs.org/) (App Router) | React Server Components, Server Actions, Route Handlers |
| **Frontend** | [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/) | Modern UI components, design tokens, responsive layouts |
| **Language** | [TypeScript 5](https://www.typescriptlang.org/) | Strict static typing across schemas, actions, and tests |
| **Database & ORM** | [PostgreSQL](https://www.postgresql.org/), [Prisma ORM](https://www.prisma.io/) | Relational models, 7 schema migrations, foreign key integrity |
| **Validation** | [Zod](https://zod.dev/) | Runtime validation for inputs, API payloads, and AI outputs |
| **Authentication** | [Jose](https://github.com/panva/jose), [bcryptjs](https://github.com/dcodeIO/bcrypt.js) | HttpOnly SameSite JWT cookies (HS256) with database `tokenVersion` session revocation, live DAL role authority, and salted password hashing |
| **AI Integration** | [Google Gemini](https://ai.google.dev/) via `@google/genai` | Structured advisory analysis (`gemini-3.5-flash-lite`) |
| **Isolation** | `server-only` | Compile-time barrier preventing server logic in client bundles |
| **Testing & CI** | [tsx](https://github.com/privatenumber/tsx), GitHub Actions | Automated verification suites run in PostgreSQL 16 container |

---

## Local Setup

### Prerequisites
* **Node.js:** v20+ or v22+
* **Package Manager:** `pnpm` (v11+ recommended)
* **Database:** Running PostgreSQL instance (local or hosted e.g., Neon, Supabase)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/AyshaUrmi0/ai-leadflow.git
cd ai-leadflow
pnpm install
```

### 2. Configure Environment Variables
```bash
cp .env.example .env
```
Configure your database URL and a 32-character session secret in `.env`:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/ai_leadflow"
SESSION_SECRET="your-secure-random-32-character-secret-key"

# Seed account credentials (defaults):
ADMIN_INITIAL_EMAIL="admin@novadental.com"
ADMIN_INITIAL_PASSWORD="SecureAdminPassword123!"
USER_INITIAL_EMAIL="user@novadental.com"
USER_INITIAL_PASSWORD="DemoUserPassword123!"

# Optional: Required for live AI insights
GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Initialize Database & Seed Demo Data
```bash
pnpm exec prisma generate
pnpm exec prisma migrate deploy
pnpm exec prisma db seed
```

### 4. Run Development Server
```bash
pnpm dev
```
Open [http://localhost:3000](http://localhost:3000) for the public landing page (or access the live deployment directly at [ai-leadflow.vercel.app](https://ai-leadflow.vercel.app/)).

Visit [https://ai-leadflow.vercel.app/login](https://ai-leadflow.vercel.app/login) (or local `/login`) to evaluate demo accounts with one-click access:
* **Admin Demo** (`admin@novadental.com`): Full CRM access, lead scoring, notes, tasks, and AI insights.
* **Patient Demo** (`user@novadental.com`): Patient portal with live consultation tracking (attempting to access `/admin/*` is blocked by route proxy policies).

---

## Run with Docker

Run the complete production stack (Next.js standalone container + PostgreSQL 16 database) locally with zero host dependencies other than Docker.

### Prerequisites
* [Docker Desktop](https://www.docker.com/products/docker-desktop/) or Docker Engine with Docker Compose v2.

### 1. Configure Environment
Copy the example environment file if not already present:
```bash
cp .env.example .env
```
*(Optional: Add your `GEMINI_API_KEY` in `.env` to enable on-demand Google Gemini lead intelligence).*

### 2. Build & Launch the Containers
```bash
docker compose up --build
```
This single command:
1. Compiles the multi-stage Docker build with pnpm, Node 22, and Next.js standalone optimization.
2. Starts the PostgreSQL 16 container (`ai_leadflow_db`) and verifies readiness via the `pg_isready` healthcheck.
3. Automatically runs a one-shot migration service (`ai_leadflow_migrate`) executing `prisma migrate deploy`.
4. Starts the production application (`ai_leadflow_app`) as an unprivileged non-root user (`nextjs`, UID 1001) on [http://localhost:3000](http://localhost:3000) only after migrations complete successfully.

> [!NOTE]
> **Browser Cookie Behavior:** In production mode (`NODE_ENV=production`), session cookies are set with `Secure: true`. Modern browsers (Chrome, Firefox) allow `Secure` cookies over `http://localhost:3000`. If testing in Safari or across a LAN/custom host without HTTPS, ensure an HTTPS proxy is configured.

### 3. Seed Demo Data (First Run)
Populate demo leads, admin credentials, and initial consultation tasks inside the container environment:
```bash
docker compose run --rm migrate pnpm exec prisma db seed
```

> [!NOTE]
> **Demo Account Requirements:** The one-click demo login buttons on `/login` authenticate seeded users against PostgreSQL using credentials configured in `.env` (`ADMIN_INITIAL_PASSWORD` and `USER_INITIAL_PASSWORD`). If you modify these passwords in `.env`, re-run the seed command so the database password hashes match. Seeding requires these variables to be configured in `.env`.

### 4. Stop Containers
To stop the services while preserving database data:
```bash
docker compose down
```

> [!CAUTION]
> **Destructive Data Loss:** Running `docker compose down -v` removes the named volume `postgres_data`. This permanently deletes all persisted PostgreSQL records—including registered users, consultation requests, activity logs, and seeded accounts. Only use `-v` if you intend to execute a full database wipe.

---

## Testing & Quality Assurance

Run the automated test suite executing **281 checks** across 5 verification domains:

```bash
# Run all automated test suites
pnpm test

# Static analysis and type checking
pnpm lint
pnpm exec tsc --noEmit

# Production build check
pnpm build
```

### Test Suite Overview
* `tests/ai-infrastructure.test.ts` (56 checks): Schema compliance, string length bounds, XML delimiter construction, missing key handling, in-memory sliding window rate limiting, and `server-only` isolation.
* `tests/ai-lead-intelligence.test.ts` (37 checks): Safe context assembly, PII scrubbing (no email/phone in prompt), deterministic score inclusion, and database immutability.
* `tests/authentication.test.ts` (84 checks): Bcrypt hashing, JWT issuance and validation, Data Access Layer (DAL) role checks, route proxy policies, and relational `userId` data isolation.
* `tests/admin-management.test.ts` (84 checks): Lead status transitions, internal notes, task lifecycle, team member management, self-demotion prevention, and concurrent last-admin protection.
* `tests/verify-stale-authorization.test.ts` (20 checks): Empirical verification of database `tokenVersion` tracking, stale role revocation across DAL/actions/routes, immediate session invalidation (`revokeUserSessions`), and deleted user rejection.
* `tests/google-oauth.test.ts` (43 checks): Google OAuth 2.0 flow verification, CSRF state protection, open-redirect defense, automatic account linking, and user provisioning.

---

## Environment Variables

| Variable | Required | Description |
| :--- | :---: | :--- |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes (Prod) | 32+ character random secret for signing JWT session cookies |
| `ADMIN_INITIAL_PASSWORD` | Seed | Initial password for seeded administrator account |
| `USER_INITIAL_PASSWORD` | Seed | Initial password for seeded patient demo account |
| `ADMIN_INITIAL_EMAIL` | Optional | Initial admin email (default: `admin@novadental.com`) |
| `USER_INITIAL_EMAIL` | Optional | Initial patient email (default: `user@novadental.com`) |
| `GOOGLE_CLIENT_ID` | Optional | Google OAuth 2.0 Client ID for Google Sign-In |
| `GOOGLE_CLIENT_SECRET` | Optional | Google OAuth 2.0 Client Secret for Google Sign-In |
| `APP_URL` | Optional | Canonical application URL override (defaults to host/origin or `http://localhost:3000`) |
| `GEMINI_API_KEY` | Optional | Google Gemini API key for on-demand AI lead intelligence |
| `GEMINI_MODEL` | Optional | Model identifier (default: `gemini-3.5-flash-lite`) |

---

## License

This project is open-source under the MIT License.
