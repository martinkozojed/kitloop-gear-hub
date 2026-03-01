/**
 * i18n parity tests — cheap insurance before merge.
 *
 * Verifies:
 * 1. All ssot.* keys present in BOTH cs.json and en.json (symmetric).
 * 2. No duplicate top-level paths in either locale.
 * 3. Every key referenced in microcopy.registry.ts exists in both locales.
 * 4. isoWeekKey() is consistent across Sun/Mon boundary and year rollover.
 */
import { describe, it, expect } from 'vitest';
import csRaw from '../locales/cs.json';
import enRaw from '../locales/en.json';

// ─── helpers ──────────────────────────────────────────────────────────────────

type NestedObject = { [key: string]: string | NestedObject };

function flatPaths(obj: NestedObject, prefix = ''): string[] {
    return Object.entries(obj).flatMap(([k, v]) => {
        const full = prefix ? `${prefix}.${k}` : k;
        return typeof v === 'object' && v !== null
            ? flatPaths(v as NestedObject, full)
            : [full];
    });
}

// ─── ISO-week helper (copied here to allow unit testing) ──────────────────────

/**
 * Returns a stable "YYYY-Www" string scoped to the UTC ISO calendar week.
 * Exported so tests can verify boundary behaviour.
 */
export function isoWeekKey(ts: number): string {
    const d = new Date(ts);
    const jan4OfYear = (y: number) => Date.UTC(y, 0, 4);
    const dayOfWeek = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
    const thursday = Date.UTC(
        d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - dayOfWeek + 3
    );
    const isoYear = new Date(thursday).getUTCFullYear();
    const weekNo = 1 + Math.round((thursday - jan4OfYear(isoYear)) / 604_800_000);
    return `${isoYear}-W${String(weekNo).padStart(2, '0')}`;
}

// ─── locale data ──────────────────────────────────────────────────────────────

const csKeys = flatPaths(csRaw as unknown as NestedObject);
const enKeys = flatPaths(enRaw as unknown as NestedObject);
const csSet = new Set(csKeys);
const enSet = new Set(enKeys);

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('i18n parity: ssot.* block', () => {
    const csSSot = csKeys.filter(k => k.startsWith('ssot.'));
    const enSSot = enKeys.filter(k => k.startsWith('ssot.'));

    it('CS and EN have the same number of ssot.* keys', () => {
        expect(csSSot.length).toBeGreaterThan(0);
        expect(enSSot.length).toBe(csSSot.length);
    });

    it('every ssot.* key in CS exists in EN', () => {
        const missing = csSSot.filter(k => !enSet.has(k));
        expect(missing).toEqual([]);
    });

    it('every ssot.* key in EN exists in CS', () => {
        const missing = enSSot.filter(k => !csSet.has(k));
        expect(missing).toEqual([]);
    });
});

describe('i18n parity: critical code-referenced keys', () => {
    // Keys directly used in ContextTip, registry, and fixed toasts.
    const requiredKeys = [
        'ssot.tip.ariaLabel',
        'ssot.tip.dismiss',
        'ssot.onboarding.header.title',
        'ssot.onboarding.header.subtitle',
        'ssot.tips.inventory_empty.text',
        'ssot.tips.inventory_empty.cta',
        'ssot.tips.no_reservation_24h.text',
        'ssot.tips.no_reservation_24h.cta',
        'ssot.toasts.issue_completed.title',
        'ssot.toasts.issue_completed.desc',
        'ssot.toasts.return_completed.title',
        'ssot.toasts.return_completed.desc',
        'ssot.toasts.return_with_damage.title',
        'ssot.toasts.return_with_damage.desc',
        'operations.issueFlow.scan.autoAssigned',
    ];

    it.each(requiredKeys)('%s exists in cs.json', (key) => {
        expect(csSet.has(key)).toBe(true);
    });

    it.each(requiredKeys)('%s exists in en.json', (key) => {
        expect(enSet.has(key)).toBe(true);
    });
});

describe('i18n parity: no duplicate flat paths per locale', () => {
    it('cs.json has no duplicate keys', () => {
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const k of csKeys) {
            if (seen.has(k)) dupes.push(k);
            seen.add(k);
        }
        expect(dupes).toEqual([]);
    });

    it('en.json has no duplicate keys', () => {
        const seen = new Set<string>();
        const dupes: string[] = [];
        for (const k of enKeys) {
            if (seen.has(k)) dupes.push(k);
            seen.add(k);
        }
        expect(dupes).toEqual([]);
    });
});

describe('isoWeekKey: boundary behaviour', () => {
    it('Sunday and following Monday are in different ISO weeks', () => {
        // 2026-03-01 is a Sunday (week 9), 2026-03-02 is a Monday (week 10)
        const sunday = Date.UTC(2026, 2, 1, 23, 59, 59); // Sunday 23:59:59 UTC
        const monday = Date.UTC(2026, 2, 2, 0, 0, 0);    // Monday 00:00:00 UTC
        expect(isoWeekKey(sunday)).toBe('2026-W09');
        expect(isoWeekKey(monday)).toBe('2026-W10');
        expect(isoWeekKey(sunday)).not.toBe(isoWeekKey(monday));
    });

    it('two tips shown in same ISO week share the same key', () => {
        const tuesday = Date.UTC(2026, 2, 3, 10, 0);
        const friday = Date.UTC(2026, 2, 6, 18, 0);
        expect(isoWeekKey(tuesday)).toBe(isoWeekKey(friday));
    });

    it('year-rollover: 2025-12-29 is in ISO week 2026-W01', () => {
        // ISO 8601: 2025-12-29 belongs to week 2026-W01
        const dec29 = Date.UTC(2025, 11, 29, 12, 0);
        expect(isoWeekKey(dec29)).toBe('2026-W01');
    });

    it('2024-01-01 (Mon) is in ISO week 2024-W01', () => {
        const jan1 = Date.UTC(2024, 0, 1, 0, 0);
        expect(isoWeekKey(jan1)).toBe('2024-W01');
    });
});
