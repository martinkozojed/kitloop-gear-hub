/**
 * DELIBERATE CI FAILURE - Testing branch protection gates
 * This file intentionally contains a TypeScript error to force CI checks to fail.
 * Expected: Smoke Tests workflow's typecheck step should FAIL
 * Expected: Merge button should be BLOCKED due to required check failure
 */

// TypeScript error: assigning string to number type
export const __ci_fail: number = "This is a deliberate type error for testing";
