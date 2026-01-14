export const getEnv = (name: string, optional = false): string | undefined => {
  const value = process.env[name];
  if (!value && !optional) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
};

export const getProviderCreds = () => ({
  email: getEnv('E2E_PROVIDER_EMAIL')!,
  password: getEnv('E2E_PROVIDER_PASSWORD')!,
});

export const getAdminCreds = () => ({
  email: getEnv('E2E_ADMIN_EMAIL')!,
  password: getEnv('E2E_ADMIN_PASSWORD')!,
});

export const getPendingProviderCreds = () => ({
  email: getEnv('E2E_PENDING_PROVIDER_EMAIL'),
  password: getEnv('E2E_PENDING_PROVIDER_PASSWORD'),
});

export const getHarnessConfig = () => ({
  baseUrl: getEnv('E2E_BASE_URL')!,
  seedToken: getEnv('E2E_SEED_TOKEN')!,
});
