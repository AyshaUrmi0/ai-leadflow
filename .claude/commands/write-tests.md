---
description: Write unit, integration and Playwright tests for a feature or file
argument-hint: <feature or file to test>
---

Write tests for this part of AI LeadFlow: $ARGUMENTS

1. Read CLAUDE.md, the code under test, and existing tests to match their style and helpers.
2. First list the test cases you plan to write (one line each), grouped as:
   - Happy path
   - Edge cases (empty input, limits, invalid data)
   - Errors (DB failure, LLM timeout or invalid output)
   - Security (unauthenticated user, non-admin user, stale or revoked JWT), if the code is protected
3. Then write the tests:
   - Unit/integration tests for logic, validation and API routes
   - Playwright E2E tests only for user-facing flows; use `data-testid` or roles as selectors
   - Mock the Gemini API; never call the real API in tests
4. Run the tests. If any fail, decide whether the test or the code is wrong and tell me which.
   Do not change application code without asking me first.
5. Finish with a short summary: tests added, what they cover, and any gaps left.
