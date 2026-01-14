import { request } from '@playwright/test';
import { getHarnessConfig } from './env';

export const callHarness = async (action: string, runId: string, extra?: Record<string, unknown>) => {
  const { baseUrl, seedToken } = getHarnessConfig();
  const context = await request.newContext({
    baseURL: baseUrl,
    extraHTTPHeaders: { 'x-e2e-token': seedToken, 'Content-Type': 'application/json' },
  });

  const res = await context.post('/functions/v1/e2e_harness', {
    data: { action, run_id: runId, ...extra },
  });

  if (!res.ok()) {
    const text = await res.text();
    throw new Error(`Harness ${action} failed (${res.status()}): ${text}`);
  }

  return res.json();
};
