import { request } from '@playwright/test';
import { getHarnessConfig } from './env';

export const callHarness = async (action: string, runId: string, extra?: Record<string, unknown>) => {
  const { baseUrl, seedToken } = getHarnessConfig();
  const supabaseUrl = (process.env.E2E_SUPABASE_URL ?? '').trim();
  if (!supabaseUrl) {
    throw new Error('E2E_SUPABASE_URL is required for harness calls');
  }

  const token = seedToken.trim();
  // Use absolute URL to guarantee we hit Supabase, not frontend (Netlify)
  const url = new URL('/functions/v1/e2e_harness', supabaseUrl).toString();

  const context = await request.newContext({
    // baseURL intentionally omitted to force absolute URL usage below
    extraHTTPHeaders: { 'x-e2e-token': token, 'Content-Type': 'application/json' },
  });

  const res = await context.post(url, {
    data: { action, run_id: runId, ...extra },
  });

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`Harness ${action} failed (${res.status()}) at ${supabaseUrl}: ${text}`);
  }

  return res.json();
};
