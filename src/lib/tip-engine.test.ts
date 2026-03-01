/**
 * Unit tests for tip-engine throttle/suppression logic.
 * Uses vitest + happy-dom (no real localStorage, uses in-memory mock).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
    shouldShowTip,
    recordTipShown,
    recordTipDismissed,
    recordTipClicked,
    getFirstSeenAt,
    resetTipEngineForUser,
} from './tip-engine';
import type { TipCopy } from '@/content/microcopy.registry';

// ─── localStorage mock ────────────────────────────────────────────────────────

const store: Record<string, string> = {};

beforeEach(() => {
    // Clear store and reset mocks
    Object.keys(store).forEach(k => delete store[k]);
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation((key: string) => store[key] ?? null);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation((key: string, value: string) => {
        store[key] = value;
    });
    vi.spyOn(Storage.prototype, 'removeItem').mockImplementation((key: string) => {
        delete store[key];
    });
    vi.spyOn(Storage.prototype, 'key').mockImplementation((index: number) => Object.keys(store)[index] ?? null);
    Object.defineProperty(Storage.prototype, 'length', {
        get: () => Object.keys(store).length,
        configurable: true,
    });
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const userId = 'test-user-1';

const baseTip: TipCopy = {
    id: 'tip_test',
    textKey: 'ssot.tips.test.text',
    ctaLabelKey: 'ssot.tips.test.cta',
    ctaHref: '/provider/inventory',
    trigger: 'test_trigger',
    ttlDays: 7,
    maxShows: 3,
    cooldownHours: 24,
    featureFlag: true,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('shouldShowTip', () => {
    it('returns true for a fresh tip and fresh user', () => {
        expect(shouldShowTip(baseTip, userId, {})).toBe(true);
    });

    it('returns false when featureFlag is false', () => {
        const tip = { ...baseTip, featureFlag: false };
        expect(shouldShowTip(tip, userId, {})).toBe(false);
    });

    it('returns false when isTyping is true', () => {
        expect(shouldShowTip(baseTip, userId, { isTyping: true })).toBe(false);
    });

    it('returns false when dismissed >= 3 times', () => {
        recordTipDismissed(baseTip.id, userId);
        recordTipDismissed(baseTip.id, userId);
        recordTipDismissed(baseTip.id, userId);
        expect(shouldShowTip(baseTip, userId, {})).toBe(false);
    });

    it('returns false when maxShows reached', () => {
        const tip = { ...baseTip, maxShows: 2 };
        recordTipShown(tip.id, userId);
        recordTipShown(tip.id, userId);
        expect(shouldShowTip(tip, userId, {})).toBe(false);
    });

    it('returns false within cooldown window', () => {
        // Record a show "just now"
        recordTipShown(baseTip.id, userId);
        // shouldShow should be false immediately after (< 24h cooldown)
        expect(shouldShowTip(baseTip, userId, {})).toBe(false);
    });

    it('returns false when TTL has expired (> 7 days)', () => {
        // Set firstSeenAt to 8 days ago
        const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
        store[`tipEngine:${userId}:__firstSeen`] = String(eightDaysAgo);
        expect(shouldShowTip(baseTip, userId, {})).toBe(false);
    });

    it('returns false when weekly cap (2 tips/week) is exceeded', () => {
        const anotherTip1: TipCopy = { ...baseTip, id: 'tip_a' };
        const anotherTip2: TipCopy = { ...baseTip, id: 'tip_b' };
        // Show 2 different tips (bumps global weekly counter)
        recordTipShown(anotherTip1.id, userId);
        recordTipShown(anotherTip2.id, userId);
        // Now a third tip should be blocked
        const thirdTip: TipCopy = { ...baseTip, id: 'tip_c' };
        expect(shouldShowTip(thirdTip, userId, {})).toBe(false);
    });

    it('returns true again after cooldown elapsed', () => {
        const oneDayAndABitAgo = Date.now() - (25 * 60 * 60 * 1000);
        // Manually inject a lastShownAt in the past
        store[`tipEngine:${userId}:${baseTip.id}`] = JSON.stringify({
            lastShownAt: oneDayAndABitAgo,
            shownCount: 1,
            dismissedCount: 0,
            lastClickedAt: null,
            lastDismissedAt: null,
        });
        expect(shouldShowTip(baseTip, userId, {})).toBe(true);
    });

    it('returns false after CTA click (shownCount set to 999)', () => {
        recordTipClicked(baseTip.id, userId);
        expect(shouldShowTip(baseTip, userId, {})).toBe(false);
    });
});

describe('getFirstSeenAt', () => {
    it('returns a timestamp and persists it across calls', () => {
        const ts1 = getFirstSeenAt(userId);
        const ts2 = getFirstSeenAt(userId);
        expect(ts1).toBe(ts2);
        expect(typeof ts1).toBe('number');
    });
});

describe('resetTipEngineForUser', () => {
    it('clears all tipEngine keys for a user', () => {
        recordTipShown(baseTip.id, userId);
        resetTipEngineForUser(userId);
        // After reset, fresh user → should show tip
        // Need to re-create firstSeen
        expect(shouldShowTip(baseTip, userId, {})).toBe(true);
    });
});
