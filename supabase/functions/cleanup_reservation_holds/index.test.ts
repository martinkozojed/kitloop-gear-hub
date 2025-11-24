import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { summarizeCleanupResult } from "./index.ts";

Deno.test("summarizeCleanupResult returns removed count", () => {
  const result = summarizeCleanupResult(5);
  assertEquals(result, { deleted_count: 5 });
});
