/**
 * Telemetry Module - Lightweight event tracking for Kitloop
 * 
 * Features:
 * - No external dependencies
 * - OFF by default in production (enable with VITE_TELEMETRY_DEBUG=true)
 * - Debug mode: logs to console + localStorage ring buffer (max 200 events)
 * - No PII: only anonymous session_id, event names, and safe props
 * 
 * Usage:
 * ```ts
 * import { track, trackError } from '@/lib/telemetry';
 * 
 * track('reservation_created', { count: 1 });
 * trackError('reservation_create', error);
 * ```
 */

/**
 * Event Taxonomy - prefixed by domain
 * 
 * INSTRUMENTED (currently measured):
 * - reservations.create_started, .created, .open_detail, .status_change_*
 * - inventory.scan_opened, .scan_success, .scan_failed, .asset_created
 * - import.csv_started, .csv_completed
 * - error.shown
 * 
 * PLANNED (not instrumented yet):
 * - returns.flow_started, .completed (UI not implemented)
 */
export type TelemetryEventName =
    // Reservations domain (INSTRUMENTED)
    | 'reservations.create_started'
    | 'reservations.created'
    | 'reservations.open_detail'
    | 'reservations.status_change_started'
    | 'reservations.status_change_succeeded'
    | 'reservations.status_change_failed'
    // Inventory domain (INSTRUMENTED)
    | 'inventory.scan_opened'
    | 'inventory.scan_success'
    | 'inventory.scan_failed'
    | 'inventory.asset_created'
    // Import domain (INSTRUMENTED)
    | 'import.csv_started'
    | 'import.csv_completed'
    // Returns domain (PLANNED - UI not implemented)
    | 'returns.flow_started'
    | 'returns.completed'
    // Onboarding domain (INSTRUMENTED)
    | 'onboarding.started'
    | 'onboarding.workspace_completed'
    | 'onboarding.location_completed'
    | 'onboarding.inventory_completed'
    | 'onboarding.first_reservation'
    | 'onboarding.checklist_dismissed'
    | 'onboarding.completed'
    | 'onboarding.demo_deleted'
    // Errors domain (INSTRUMENTED)
    | 'error.shown';

export interface TelemetryEvent {
    name: TelemetryEventName;
    timestamp: string;
    source: string;
    session_id: string;
    version: number;
    props?: Record<string, string | number | boolean | undefined>;
}

// Configuration
const STORAGE_KEY = 'kitloop_telemetry_events';
const SESSION_KEY = 'kitloop_session_id';
const MAX_EVENTS = 200;
const EVENT_VERSION = 1;

// Error debounce cache: context+message -> last timestamp
const errorDebounceCache = new Map<string, number>();
const ERROR_DEBOUNCE_MS = 5000; // 5 seconds

/**
 * Telemetry is OFF by default in production.
 * Enable explicitly with VITE_TELEMETRY_DEBUG=true|TRUE|1
 */
const isEnabled = (): boolean => {
    // Always enabled in development
    if (import.meta.env.DEV) return true;
    // In production: only if explicitly enabled (support true/TRUE/1)
    const flag = String(import.meta.env.VITE_TELEMETRY_DEBUG || '').toLowerCase().trim();
    return flag === 'true' || flag === '1';
};

/**
 * Get or create anonymous session ID (persists across page loads)
 */
function getSessionId(): string {
    if (typeof window === 'undefined') return 'server';

    let sessionId = localStorage.getItem(SESSION_KEY);
    if (!sessionId) {
        sessionId = crypto.randomUUID();
        localStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
}

/**
 * Get ring buffer from localStorage
 */
function getEventBuffer(): TelemetryEvent[] {
    if (typeof window === 'undefined') return [];
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch {
        return [];
    }
}

/**
 * Save event to ring buffer (keeps last MAX_EVENTS)
 */
function saveToBuffer(event: TelemetryEvent): void {
    if (typeof window === 'undefined') return;
    try {
        const buffer = getEventBuffer();
        buffer.push(event);
        // Keep only last MAX_EVENTS (ring buffer)
        const trimmed = buffer.slice(-MAX_EVENTS);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
    } catch {
        // Ignore storage errors (quota exceeded, etc.)
    }
}

/**
 * Sanitize props to prevent PII leakage
 * Only allows: UUIDs, numbers, booleans, short strings (no emails, phones, names)
 */
function sanitizeProps(
    props?: Record<string, string | number | boolean | undefined>
): Record<string, string | number | boolean | undefined> | undefined {
    if (!props) return undefined;

    const sanitized: Record<string, string | number | boolean | undefined> = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phoneRegex = /^\+?[\d\s()-]{7,}$/;

    for (const [key, value] of Object.entries(props)) {
        // Skip undefined
        if (value === undefined) continue;

        // Allow numbers and booleans
        if (typeof value === 'number' || typeof value === 'boolean') {
            sanitized[key] = value;
            continue;
        }

        // For strings: check for PII patterns
        if (typeof value === 'string') {
            // Block emails
            if (emailRegex.test(value)) {
                sanitized[key] = '[REDACTED_EMAIL]';
                continue;
            }
            // Block phone numbers (but allow short identifiers like AB-123)
            if (phoneRegex.test(value) && value.length > 10) {
                sanitized[key] = '[REDACTED_PHONE]';
                continue;
            }
            // Truncate long strings (might be notes/free text)
            if (value.length > 100) {
                sanitized[key] = value.slice(0, 100) + '…';
                sanitized[`${key}_truncated`] = true;
                continue;
            }
            sanitized[key] = value;
        }
    }

    return Object.keys(sanitized).length > 0 ? sanitized : undefined;
}

/**
 * Track an event
 * 
 * @param name - Event name from TelemetryEventName union
 * @param props - Optional properties (no PII - only UUIDs/numbers/booleans)
 * @param source - Component/page source (auto-detected if not provided)
 */
export function track(
    name: TelemetryEventName,
    props?: Record<string, string | number | boolean | undefined>,
    source?: string
): void {
    if (!isEnabled()) return;

    const event: TelemetryEvent = {
        name,
        timestamp: new Date().toISOString(),
        source: source || detectSource(),
        session_id: getSessionId(),
        version: EVENT_VERSION,
        props: sanitizeProps(props),
    };

    // Console log with styling (debug only)
    // eslint-disable-next-line no-console
    console.log(
        `%c[Telemetry] %c${name}`,
        'color: #888; font-weight: normal',
        'color: #10b981; font-weight: bold',
        event.props || ''
    );

    // Save to localStorage ring buffer
    saveToBuffer(event);
}

/**
 * Track an error event (sanitized)
 * 
 * @param context - Where the error occurred
 * @param error - Optional error object (will be sanitized)
 */
export function trackError(
    context: string,
    error?: Error | unknown
): void {
    // Sanitize error - only safe properties
    let errorName = 'UnknownError';
    let errorMessage = 'Unknown error';

    if (error instanceof Error) {
        errorName = error.name || 'Error';
        // Truncate message, remove potential URLs/paths
        errorMessage = error.message
            .replace(/https?:\/\/[^\s]+/g, '[URL]')
            .replace(/\/[^\s]+\.[a-z]+/gi, '[PATH]')
            .slice(0, 200);
    } else if (typeof error === 'string') {
        errorMessage = error.slice(0, 200);
    }

    // Debounce: same context+message max 1x per 5s
    const debounceKey = `${context}:${errorMessage}`;
    const lastTime = errorDebounceCache.get(debounceKey);
    const now = Date.now();
    if (lastTime && now - lastTime < ERROR_DEBOUNCE_MS) {
        return; // Skip duplicate error within debounce window
    }
    errorDebounceCache.set(debounceKey, now);

    // Cleanup old entries (keep cache small)
    if (errorDebounceCache.size > 50) {
        const oldestAllowed = now - ERROR_DEBOUNCE_MS;
        for (const [key, time] of errorDebounceCache) {
            if (time < oldestAllowed) errorDebounceCache.delete(key);
        }
    }

    track('error.shown', {
        context: context.slice(0, 50),
        error_name: errorName,
        error_message: errorMessage,
    });
}

/**
 * Detect source from current URL/component
 */
function detectSource(): string {
    if (typeof window === 'undefined') return 'server';
    const path = window.location.pathname;
    // Extract page name from path
    const segments = path.split('/').filter(Boolean);
    return segments.slice(-2).join('/') || 'home';
}

/**
 * Get all events from buffer (for debugging)
 */
export function getEvents(): TelemetryEvent[] {
    return getEventBuffer();
}

/**
 * Clear event buffer (for debugging)
 */
export function clearEvents(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEY);
}

/**
 * Log summary of events to console (for smoke testing)
 */
export function logEventSummary(): void {
    const events = getEventBuffer();
    const counts = events.reduce((acc, e) => {
        acc[e.name] = (acc[e.name] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    // eslint-disable-next-line no-console
    console.table(counts);
    // eslint-disable-next-line no-console
    console.log(`Total events: ${events.length} (max: ${MAX_EVENTS})`);
    // eslint-disable-next-line no-console
    console.log(`Session ID: ${getSessionId()}`);
    // eslint-disable-next-line no-console
    console.log(`Telemetry enabled: ${isEnabled()}`);
}
