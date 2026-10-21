---
description: Review the current changes for bugs, security issues and missing tests
argument-hint: [optional: branch or files to focus on]
---

Review the current changes in AI LeadFlow as a strict senior engineer.
Focus: $ARGUMENTS (if empty, review all uncommitted changes and commits on this branch vs main).

Use `git diff main...HEAD` and `git diff` to see the changes. Read CLAUDE.md for project rules.

Check for:
1. Bugs: wrong logic, missing edge cases, unhandled errors, async/race issues.
2. Security: auth bypass, missing admin checks (role must come from DB), data leaks,
   secrets in code or logs, unvalidated input, prompt injection through lead data.
3. LLM handling: output parsed with Zod, failures handled with a fallback.
4. Database: migration present for schema changes, no N+1 queries, transactions where needed.
5. Tests: is new behaviour covered? Name the specific tests that are missing.
6. Code quality: `any` types, dead code, unclear names, changes unrelated to the task.

Output format:
- **Must fix** (bugs, security): file:line, problem, suggested fix
- **Should fix** (quality, missing tests)
- **Looks good**: what is done well
- **Verdict**: ready to merge / not ready, in one sentence

Do not edit any files. Only report.
