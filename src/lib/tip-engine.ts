/**
 * Tip Engine – minimal message engine for pilot behavior-based tips.
 *
 * Storage: localStorage keyed by `tipEngine:${userId}:${tipId}`
 * Caps (from SSOT):
 *   - Max 1 onboarding message / day / user (tracked via globalOnboardingShownToday)
 *   - Max 2 tips / week / user (ISO calendar week, resets on week boundary)
 *   - Cooldown: 24h between same tip
 *   - Dismiss >= 3 → permanent suppress
 *   - TTL: 7 days from firstSeenAt
 *   - Suppress when isTyping = true
 *
 * SSR / edge safe: all localStorage access is guarded by `typeof window !== 'undefined'`.
 * userId null/undefined is normalised to 'anonymous' (consistent key, no crashes).
 */

import type { TipCopy } from '@/content/microcopy.registry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TipState {
    lastShownAt: number | null;
    shownCount: number;
    dismissedCount: number;
    lastClickedAt: number | null;
    lastDismissedAt: number | null;
}

export interface TipContext {
    /** True when user focus is inside an input/textarea/select element */
    isTyping?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const MS_PER_HOUR = 60 * 60 * 1000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const TTL_DAYS = 7;
const MAX_TIPS_PER_WEEK = 2;
const MAX_DISMISS_BEFORE_STOP = 3;

// ─── SSR guard ────────────────────────────────────────────────────────────────

function isBrowser(): boolean {
    return typeof window !== 'undefined';
}

// ─── userId normalisation ─────────────────────────────────────────────────────

/**
 * Normalise null/undefined userId to a stable fallback key.
 * Prevents crashes and keeps tip state consistent across renders.
 */
function safeUserId(userId: string | null | undefined): string {
    return userId?.trim() || 'anonymous';
}

// ─── ISO-week helper ──────────────────────────────────────────────────────────

/**
 * Returns a stable "YYYY-Www" string for the given timestamp.
 * Used to scope the weekly tip cap to a real calendar week (Mon–Sun),
 * preventing the rolling-7d window from running over week boundaries.
 */
function isoWeekKey(ts: number): string {
    const d = new Date(ts);
    // ISO 8601: week 1 is the week containing the first Thursday of the year.
    // Shift to Thursday of the same week (Mon=0 reference), then read year+weekNo.
    const jan4OfYear = (y: number) => Date.UTC(y, 0, 4); // Jan 4 is always in W01
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    const thursday = Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek + 3
    );
    const isoYear = new Date(thursday).getUTCFullYear();
    const weekNo = 1 + Math.round((thursday - jan4OfYear(isoYear)) / 604_800_000); // 7*24*3600*1000
    return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── localStorage helpers ─────────────────────────────────────────────────────

function storageKey(userId: string, tipId: string): string {
    return `tipEngine:${userId}:${tipId}`;
}

function globalKey(userId: string): string {
    return `tipEngine:${userId}:__global`;
}

function firstSeenKey(userId: string): string {
    return `tipEngine:${userId}:__firstSeen`;
}

function getTipState(userId: string, tipId: string): TipState {
    if (!isBrowser()) return { lastShownAt: null, shownCount: 0, dismissedCount: 0, lastClickedAt: null, lastDismissedAt: null };
    try {
        const raw = localStorage.getItem(storageKey(userId, tipId));
        if (raw) return JSON.parse(raw) as TipState;
    } catch {
        // ignore parse errors
    }
    return {
        lastShownAt: null,
        shownCount: 0,
        dismissedCount: 0,
        lastClickedAt: null,
        lastDismissedAt: null,
    };
}

function saveTipState(userId: string, tipId: string, state: TipState): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(storageKey(userId, tipId), JSON.stringify(state));
    } catch {
        // ignore quota errors
    }
}

// ─── Global per-user counters ─────────────────────────────────────────────────

interface GlobalState {
    weeklyShownAt: number[]; // timestamps of tips shown this week
    dailyOnboardingShownAt: number | null; // timestamp of last onboarding msg
}

function getGlobalState(userId: string): GlobalState {
    if (!isBrowser()) return { weeklyShownAt: [], dailyOnboardingShownAt: null };
    try {
        const raw = localStorage.getItem(globalKey(userId));
        if (raw) return JSON.parse(raw) as GlobalState;
    } catch { /* ignore */ }
    return { weeklyShownAt: [], dailyOnboardingShownAt: null };
}

function saveGlobalState(userId: string, state: GlobalState): void {
    if (!isBrowser()) return;
    try {
        localStorage.setItem(globalKey(userId), JSON.stringify(state));
    } catch { /* ignore */ }
}

// ─── Public: firstSeenAt ──────────────────────────────────────────────────────

/**
 * Returns the timestamp (ms) when the user was first seen.
 * Sets it on first call and persists to localStorage.
 */
export function getFirstSeenAt(userId: string | null | undefined): number {
    const uid = safeUserId(userId);
    if (!isBrowser()) return Date.now();
    try {
        const raw = localStorage.getItem(firstSeenKey(uid));
        if (raw) {
            const ts = parseInt(raw, 10);
            if (!isNaN(ts)) return ts;
        }
        const now = Date.now();
        localStorage.setItem(firstSeenKey(uid), String(now));
        return now;
    } catch {
        return Date.now();
    }
}

// ─── Core logic ───────────────────────────────────────────────────────────────

/**
 * Determines whether a tip should be rendered.
 *
 * Returns false if ANY of the following:
 * - tip.featureFlag is false (not enabled)
 * - user has dismissed this tip >= MAX_DISMISS_BEFORE_STOP times
 * - cooldown window has not elapsed (< cooldownHours)
 * - tip has been shown >= maxShows times
 * - TTL (7d from firstSeenAt) has elapsed
 * - global weekly cap (2 tips/week) is exceeded
 * - isTyping is true
 */
export function shouldShowTip(tip: TipCopy, userId: string | null | undefined, context: TipContext = {}): boolean {
    // 1. Feature flag gate
    if (tip.featureFlag === false) return false;

    // 2. Suppress-on-typing
    if (context.isTyping === true) return false;

    if (!isBrowser()) return false;

    const uid = safeUserId(userId);
    const now = Date.now();
    const firstSeen = getFirstSeenAt(uid);

    // 3. TTL check
    if (now - firstSeen > TTL_DAYS * MS_PER_DAY) return false;

    const state = getTipState(uid, tip.id);

    // 4. Dismiss threshold
    if (state.dismissedCount >= MAX_DISMISS_BEFORE_STOP) return false;

    // 5. Max shows
    if (state.shownCount >= tip.maxShows) return false;

    // 6. Cooldown (same tip)
    if (state.lastShownAt !== null) {
        const elapsed = now - state.lastShownAt;
        if (elapsed < tip.cooldownHours * MS_PER_HOUR) return false;
    }

    // 7. Global weekly cap — scoped to ISO calendar week (Mon–Sun)
    //    Prevents tips shown on Sunday from bleeding into Monday of the next week.
    const global = getGlobalState(uid);
    const currentWeek = isoWeekKey(now);
    const shownThisWeek = global.weeklyShownAt.filter(ts => isoWeekKey(ts) === currentWeek);
    if (shownThisWeek.length >= MAX_TIPS_PER_WEEK) return false;

    return true;
}

// ─── Mutation helpers ─────────────────────────────────────────────────────────

/** Call when a tip becomes visible on screen. */
export function recordTipShown(tipId: string, userId: string | null | undefined): void {
    if (!isBrowser()) return;
    const uid = safeUserId(userId);
    const now = Date.now();
    const state = getTipState(uid, tipId);
    state.lastShownAt = now;
    state.shownCount += 1;
    saveTipState(uid, tipId, state);

    // Update global weekly counter — keep only entries from the current ISO week
    const global = getGlobalState(uid);
    const currentWeek = isoWeekKey(now);
    global.weeklyShownAt = [
        ...global.weeklyShownAt.filter(ts => isoWeekKey(ts) === currentWeek),
        now,
    ];
    saveGlobalState(uid, global);
}

/** Call when user clicks the dismiss (X) button. */
export function recordTipDismissed(tipId: string, userId: string | null | undefined): void {
    if (!isBrowser()) return;
    const uid = safeUserId(userId);
    const state = getTipState(uid, tipId);
    state.dismissedCount += 1;
    state.lastDismissedAt = Date.now();
    saveTipState(uid, tipId, state);
}

/** Call when user clicks the CTA button. */
export function recordTipClicked(tipId: string, userId: string | null | undefined): void {
    if (!isBrowser()) return;
    const uid = safeUserId(userId);
    const state = getTipState(uid, tipId);
    state.lastClickedAt = Date.now();
    // Clicking CTA counts as a successful engagement — suppress further shows
    state.shownCount = 999;
    saveTipState(uid, tipId, state);
}

/** Reset all tip state for a user (useful for testing / demo resets). */
export function resetTipEngineForUser(userId: string | null | undefined): void {
    if (!isBrowser()) return;
    const uid = safeUserId(userId);
    try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k?.startsWith(`tipEngine:${uid}:`)) keysToRemove.push(k);
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch { /* ignore */ }
}
