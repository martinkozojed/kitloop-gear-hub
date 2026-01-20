import { request } from '@playwright/test';
import { getHarnessConfig } from './env';
import { rulesForUseCase, type UploadUseCase } from '../../shared/upload/validation';

type UploadRulesResponse = {
  rules: Record<string, { maxBytes: number; allowedMime: string[]; bucket: string; allowedPrefix: string } | null>;
};

export type SeedPreflightParams = {
  provider_email: string;
  provider_status?: 'approved' | 'pending';
  provider_name?: string;
  product_name?: string;
  variant_name?: string;
  asset_count?: number;
  reservation_status?: string;
  password?: string;
  external_key_base?: string;
};

export type SeedPreflightResponse = {
  success: boolean;
  external_key_base: string;
  provider_id: string;
  product_id: string;
  variant_id: string;
  asset_ids: string[];
  reservation_id: string;
  reservation_status: string;
};

let cachedUploadRules: UploadRulesResponse | null = null;

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

export const runSeedPreflight = async (runId: string, params: SeedPreflightParams) => {
  const res = await callHarness('seed_preflight', runId, params);
  return res as SeedPreflightResponse;
};

export const getUploadRules = async (): Promise<UploadRulesResponse> => {
  if (cachedUploadRules) return cachedUploadRules;
  try {
    const res = await callHarness('get_upload_rules', `rules_${Date.now()}`);
    cachedUploadRules = res as UploadRulesResponse;
    return cachedUploadRules;
  } catch (error) {
    // Some environments may run an older harness without get_upload_rules; fall back to local rules.
    const useCases: UploadUseCase[] = ['gear_image', 'damage_photo', 'provider_logo'];
    const rules: UploadRulesResponse['rules'] = {};
    for (const useCase of useCases) {
      rules[useCase] = rulesForUseCase(useCase);
    }
    cachedUploadRules = { rules };
    console.warn('Harness get_upload_rules unavailable, using local upload rules', error);
    return cachedUploadRules;
  }
};
