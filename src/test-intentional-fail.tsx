// INTENTIONAL CI FAILURE TEST
// This file should trigger ESLint no-console rule violation

console.log("TEST: This should fail CI and block merge!");
console.info("TEST: This should also fail!");

export function TestFailComponent() {
  console.debug("TEST: And this too!");
  return <div>This PR should be blocked by release-gate check</div>;
}
