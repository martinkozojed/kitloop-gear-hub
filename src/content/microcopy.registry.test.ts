/**
 * Smoke tests for the microcopy registry.
 * Validates structural integrity of the SSOT contract — catches breaking changes.
 */
import { describe, it, expect } from 'vitest';
import {
    REGISTRY_VERSION,
    onboardingSteps,
    onboardingHeader,
    emptyStates,
    tips,
    toasts,
    FEATURE_FLAGS,
} from './microcopy.registry';

describe('REGISTRY_VERSION', () => {
    it('exports a non-empty version string', () => {
        expect(REGISTRY_VERSION).toBeTruthy();
        expect(typeof REGISTRY_VERSION).toBe('string');
    });
});

describe('onboardingHeader', () => {
    it('has titleKey and subtitleKey', () => {
        expect(onboardingHeader.titleKey).toBeTruthy();
        expect(onboardingHeader.subtitleKey).toBeTruthy();
    });
});

describe('onboardingSteps', () => {
    it('has exactly 6 steps', () => {
        expect(onboardingSteps).toHaveLength(6);
    });

    it('each step has required fields', () => {
        onboardingSteps.forEach(step => {
            expect(step.id, `step.id missing`).toBeTruthy();
            expect(step.titleKey, `${step.id}: titleKey missing`).toBeTruthy();
            expect(step.bodyKey, `${step.id}: bodyKey missing`).toBeTruthy();
            expect(step.ctaLabelKey, `${step.id}: ctaLabelKey missing`).toBeTruthy();
            expect(step.ctaHref, `${step.id}: ctaHref missing`).toBeTruthy();
            expect(step.completeWhen, `${step.id}: completeWhen missing`).toBeTruthy();
        });
    });

    it('all ctaHref point to real provider routes (start with /provider)', () => {
        onboardingSteps.forEach(step => {
            expect(
                step.ctaHref.startsWith('/provider'),
                `${step.id}: ctaHref "${step.ctaHref}" is not a provider route`
            ).toBe(true);
        });
    });

    it('step IDs are unique', () => {
        const ids = onboardingSteps.map(s => s.id);
        expect(new Set(ids).size).toBe(ids.length);
    });
});

describe('emptyStates', () => {
    const requiredKeys = ['inventory', 'reservations', 'maintenance', 'exports'];

    it('contains all required pages', () => {
        requiredKeys.forEach(key => {
            expect(emptyStates[key], `emptyStates.${key} missing`).toBeDefined();
        });
    });

    it('each empty state has title + body + primaryCta', () => {
        Object.entries(emptyStates).forEach(([key, es]) => {
            expect(es.titleKey, `${key}: titleKey missing`).toBeTruthy();
            expect(es.bodyKey, `${key}: bodyKey missing`).toBeTruthy();
            expect(es.primaryCtaLabelKey, `${key}: primaryCtaLabelKey missing`).toBeTruthy();
            expect(es.primaryCtaHref, `${key}: primaryCtaHref missing`).toBeTruthy();
        });
    });
});

describe('tips', () => {
    it('has exactly 8 tips', () => {
        expect(tips).toHaveLength(8);
    });

    it('each tip has required fields', () => {
        tips.forEach(tip => {
            expect(tip.id, `tip.id missing`).toBeTruthy();
            expect(tip.textKey, `${tip.id}: textKey missing`).toBeTruthy();
            expect(typeof tip.maxShows, `${tip.id}: maxShows type`).toBe('number');
            expect(typeof tip.cooldownHours, `${tip.id}: cooldownHours type`).toBe('number');
            expect(typeof tip.featureFlag, `${tip.id}: featureFlag type`).toBe('boolean');
            expect(tip.maxShows).toBeGreaterThan(0);
        });
    });

    it('tip IDs are unique', () => {
        const ids = tips.map(t => t.id);
        expect(new Set(ids).size).toBe(ids.length);
    });

    it('feature-flagged tips (scanner/collision/feedback/condition) are OFF by default', () => {
        const flaggedIds = ['tip_scanner', 'tip_collision', 'tip_condition', 'tip_feedback'];
        flaggedIds.forEach(id => {
            const tip = tips.find(t => t.id === id);
            expect(tip, `${id} not found`).toBeDefined();
            expect(tip!.featureFlag, `${id} should have featureFlag=false`).toBe(false);
        });
    });
});

describe('toasts', () => {
    const requiredToastKeys = [
        'inventory_item_created',
        'reservation_created',
        'issue_completed',
        'return_completed',
        'export_generated',
    ];

    it('contains all required toast entries', () => {
        requiredToastKeys.forEach(key => {
            expect(toasts[key], `toasts.${key} missing`).toBeDefined();
            expect(toasts[key].titleKey, `toasts.${key}.titleKey missing`).toBeTruthy();
        });
    });
});

describe('FEATURE_FLAGS', () => {
    it('all pilot tip flags are false by default', () => {
        Object.entries(FEATURE_FLAGS).forEach(([key, val]) => {
            expect(val, `FEATURE_FLAGS.${key} should be false`).toBe(false);
        });
    });
});
