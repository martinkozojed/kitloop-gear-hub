/**
 * Production-Safe Logger
 * 
 * P0 Security Fix: Prevents PII leakage in production logs
 * 
 * Usage:
 *   logger.info('User logged in')           // OK in dev, silent in prod
 *   logger.error('Auth failed', error)      // Sanitized in prod
 *   logger.sensitive('Email:', email)       // Only in dev with explicit flag
 * 
 * Environment:
 *   - DEV: Full logging enabled
 *   - PROD: Only errors (sanitized), no PII
 */

const isDev = import.meta.env.DEV;
const debugSensitive = import.meta.env.VITE_DEBUG_SENSITIVE === 'true';

/**
 * Sanitize error for production logging
 * Removes stack traces, SQL details, and internal paths
 */
function sanitizeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    const errorWithCode = error as Error & { code?: string };
    return {
      message: error.message,
      name: error.name,
      // Include code if present (e.g., Postgres error codes)
      ...(('code' in error) && { code: errorWithCode.code }),
    };
  }

  if (typeof error === 'object' && error !== null) {
    const errorObj = error as Record<string, unknown>;
    if ('message' in error && typeof errorObj.message === 'string') {
      return {
        message: errorObj.message,
        ...(('code' in error) && { code: errorObj.code }),
      };
    }
  }

  return { error: 'Unknown error' };
}

/**
 * Scrub PII from log data
 * Redacts: email, phone, password, token, key, secret
 */
function scrubPII(data: unknown): unknown {
  if (typeof data !== 'object' || data === null) {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(scrubPII);
  }

  const scrubbed: Record<string, unknown> = {};
  const piiKeys = ['email', 'phone', 'password', 'token', 'key', 'secret', 'apiKey', 'accessToken'];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    
    if (piiKeys.some(pii => lowerKey.includes(pii))) {
      scrubbed[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      scrubbed[key] = scrubPII(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Production-safe logger interface
 */
export const logger = {
  /**
   * Info logs - only in development
   * Use for general debugging and flow tracking
   */
  info(message: string, data?: unknown) {
    if (isDev) {
      console.log(`ℹ️ ${message}`, data ?? '');
    }
  },

  /**
   * Debug logs - only in development
   * Use for detailed debugging
   */
  debug(message: string, data?: unknown) {
    if (isDev) {
      console.debug(`🔍 ${message}`, data ?? '');
    }
  },

  /**
   * Warning logs - always logged
   * Sanitized in production
   */
  warn(message: string, data?: unknown) {
    if (isDev) {
      console.warn(`⚠️ ${message}`, data ?? '');
    } else {
      console.warn(`⚠️ ${message}`, data ? scrubPII(data) : '');
    }
  },

  /**
   * Error logs - always logged
   * Sanitized in production (no stack traces, no DB details)
   */
  error(message: string, error?: unknown) {
    if (isDev) {
      console.error(`❌ ${message}`, error ?? '');
    } else {
      const sanitized = error ? sanitizeError(error) : {};
      console.error(`❌ ${message}`, sanitized);
    }
  },

  /**
   * Sensitive data logs - ONLY in dev with explicit flag
   * NEVER logged in production
   * Use for: emails, phone numbers, user IDs during debugging
   */
  sensitive(message: string, data?: unknown) {
    if (isDev && debugSensitive) {
      console.log(`🔐 [SENSITIVE] ${message}`, data ?? '');
    }
  },

  /**
   * Success logs - only in development
   * Use for positive flow confirmations
   */
  success(message: string, data?: unknown) {
    if (isDev) {
      console.log(`✅ ${message}`, data ?? '');
    }
  },
};

/**
 * Legacy console wrapper (for gradual migration)
 * @deprecated Use logger.info, logger.error, etc. instead
 */
export const safeConsole = {
  log: logger.info,
  error: logger.error,
  warn: logger.warn,
  debug: logger.debug,
};
