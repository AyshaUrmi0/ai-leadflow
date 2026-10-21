---
description: Turn a feature spec into a reviewed plan before writing any code
argument-hint: <feature description>
---

Plan this feature for AI LeadFlow. Do NOT write or edit any code yet.

Feature: $ARGUMENTS

1. Read CLAUDE.md and the files relevant to this feature.
2. Restate the goal in 2–3 sentences, in simple English, so I can confirm you understood.
3. List any questions or unclear points. If something is ambiguous, ask instead of guessing.
4. Give the plan:
   - Files to create or change, with one line on what changes in each
   - Database changes (Prisma schema + migration), if any
   - API changes (routes, inputs validated with Zod, outputs)
   - LLM changes (prompt, Zod schema for output, fallback on failure), if any
   - Auth/permission impact: who can use this, and how it is enforced
5. Risks: what could break, security concerns, edge cases.
6. Tests to add: unit, integration, E2E — one line each.
7. Split the work into small steps I can approve one at a time.

Stop after the plan and wait for my approval.
