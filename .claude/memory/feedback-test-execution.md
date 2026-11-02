---
name: feedback-test-execution
description: Test rules - hand the user the exact command; run only changed test files; never chain suites with &&
metadata:
  type: feedback
---

Hand Saeed the exact test command and say what is unverified until he runs it. Fast checks are fine to run (`tsc`, `eslint`, one changed test file). Run only changed test files plus the guardrail that polices the change. Give one command per line; never chain suites with `&&`.

**Why:** suites are slow, and the first red in a chain hides the others.

**How to apply:** see `hand-the-user-the-test-command-do-not-run-it` in the user-level memory.
