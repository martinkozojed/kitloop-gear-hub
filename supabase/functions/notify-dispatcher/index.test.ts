import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { isEmailEnabledForUser } from "./index.ts";

// ── Helpers: mock Supabase client ──
function mockSupabase(returnData: unknown, returnError: unknown = null) {
    return {
        from: () => ({
            select: () => ({
                eq: () => ({
                    eq: () => ({
                        maybeSingle: () =>
                            Promise.resolve({ data: returnData, error: returnError }),
                    }),
                }),
            }),
        }),
    };
}

// ── Tests ──

Deno.test("isEmailEnabledForUser: returns false when email_enabled is false", async () => {
    const sb = mockSupabase({ email_enabled: false });
    const result = await isEmailEnabledForUser(sb, "user-1", "provider-1");
    assertEquals(result, false);
});

Deno.test("isEmailEnabledForUser: returns true when email_enabled is true", async () => {
    const sb = mockSupabase({ email_enabled: true });
    const result = await isEmailEnabledForUser(sb, "user-1", "provider-1");
    assertEquals(result, true);
});

Deno.test("isEmailEnabledForUser: returns false when no preference row exists", async () => {
    const sb = mockSupabase(null); // no row
    const result = await isEmailEnabledForUser(sb, "user-1", "provider-1");
    assertEquals(result, false);
});

Deno.test("isEmailEnabledForUser: returns false on query error (safe default)", async () => {
    const sb = mockSupabase(null, new Error("DB connection failed"));
    const result = await isEmailEnabledForUser(sb, "user-1", "provider-1");
    assertEquals(result, false);
});
