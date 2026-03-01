/**
 * SSOT: Single source of truth for pilot in-app microcopy.
 *
 * Registry version must be bumped when copy changes.
 * All text keys reference i18n paths resolved via `t()`.
 * DO NOT add UI strings to component files — update this registry + cs.json/en.json.
 *
 * pilot scope: onboarding checklist, empty states, behavior-based tips, success toasts.
 * NO marketing, NO upsell, NO emails, NO product news.
 */

// ─── Version ──────────────────────────────────────────────────────────────────

/** Bump when registry content changes materially. */
export const REGISTRY_VERSION = '1.0-pilot' as const;

// ─── Feature Flags (tip-level) ────────────────────────────────────────────────

/**
 * Tips behind feature flags default OFF.
 * Set to true only when the underlying signal/feature is verified to exist.
 */
export const FEATURE_FLAGS = {
    /** Requires scanner_used tracking to be implemented. */
    tip_scanner: false,
    /** Requires collision fail count signal in state. */
    tip_collision: false,
    /** Requires feedback UI to be present in app. */
    tip_feedback: false,
    /** Requires return condition_state to be tracked. */
    tip_condition: false,
} as const;

export type FeatureFlagKey = keyof typeof FEATURE_FLAGS;

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * A single step in the onboarding checklist.
 * `ctaHref` uses real app routes (no 404 / dead CTA).
 * `completeWhen` is a logical signal identifier — wired in OnboardingChecklist.
 */
export interface OnboardingStep {
    /** Stable ID — used for localStorage state. */
    id: string;
    /** i18n key for the step title. */
    titleKey: string;
    /** i18n key for the body copy (brief instruction). */
    bodyKey: string;
    /** i18n key for the CTA button. */
    ctaLabelKey: string;
    /** Real app route for the CTA. */
    ctaHref: string;
    /**
     * Signal name used to determine completion.
     * Mapped in OnboardingChecklist to concrete boolean props.
     */
    completeWhen:
    | 'workspace_completed'
    | 'location_completed'
    | 'inventory_min_items'
    | 'reservation_created'
    | 'issue_completed'
    | 'dashboard_viewed';
    /** i18n key for the toast fired when step completes. */
    successToastKey?: string;
}

/**
 * Empty state copy for a page with no data.
 */
export interface EmptyStateCopy {
    /** i18n key for the main heading. */
    titleKey: string;
    /** i18n key for the description. */
    bodyKey: string;
    /** i18n key for the primary CTA button. */
    primaryCtaLabelKey: string;
    /** Real app route for the CTA. */
    primaryCtaHref: string;
    /** Optional secondary CTA. */
    secondaryCtaLabelKey?: string;
    secondaryCtaHref?: string;
}

/**
 * A behavior-based context tip.
 */
export interface TipCopy {
    /** Stable ID. */
    id: string;
    /** i18n key for tip body text. */
    textKey: string;
    /** i18n key for CTA label (optional). */
    ctaLabelKey?: string;
    /**
     * Target href for CTA.
     * Must be a real route — never a dead link.
     */
    ctaHref?: string;
    /**
     * Logical trigger name for the tip.
     * Checked externally; tip is only rendered when trigger condition is met.
     */
    trigger: string;
    /** How many days the tip stays active from firstSeenAt. */
    ttlDays: number;
    /** Max number of times this tip can be shown. */
    maxShows: number;
    /** Minimum hours between two shows of the same tip. */
    cooldownHours: number;
    /**
     * Feature flag: if false, this tip is never rendered.
     * Defaults to true for stable tips.
     */
    featureFlag: boolean;
}

/** Success toast copy keyed by event name. */
export type ToastCopy = {
    /** i18n key for the toast title. */
    titleKey: string;
    /** Optional i18n key for the toast description. */
    descriptionKey?: string;
};

// ─── Onboarding Header ────────────────────────────────────────────────────────

export const onboardingHeader = {
    titleKey: 'ssot.onboarding.header.title',
    subtitleKey: 'ssot.onboarding.header.subtitle',
} as const;

// ─── Onboarding Steps (6) ─────────────────────────────────────────────────────

/**
 * 6 checklist steps.
 * complete_when=inventory_min_items: satisfied when inventory_count >= 3 OR import completed.
 * complete_when=dashboard_viewed: satisfied by the fact the user opened the dashboard (always true once mounted).
 */
export const onboardingSteps: OnboardingStep[] = [
    {
        id: 'workspace',
        titleKey: 'ssot.onboarding.steps.workspace.title',
        bodyKey: 'ssot.onboarding.steps.workspace.body',
        ctaLabelKey: 'ssot.onboarding.steps.workspace.cta',
        ctaHref: '/provider/settings',
        completeWhen: 'workspace_completed',
        successToastKey: 'ssot.toasts.workspace_completed',
    },
    {
        id: 'location',
        titleKey: 'ssot.onboarding.steps.location.title',
        bodyKey: 'ssot.onboarding.steps.location.body',
        ctaLabelKey: 'ssot.onboarding.steps.location.cta',
        ctaHref: '/provider/settings',
        completeWhen: 'location_completed',
        successToastKey: 'ssot.toasts.location_completed',
    },
    {
        id: 'inventory',
        titleKey: 'ssot.onboarding.steps.inventory.title',
        bodyKey: 'ssot.onboarding.steps.inventory.body',
        ctaLabelKey: 'ssot.onboarding.steps.inventory.cta',
        ctaHref: '/provider/inventory',
        completeWhen: 'inventory_min_items',
        successToastKey: 'ssot.toasts.inventory_ready',
    },
    {
        id: 'reservation',
        titleKey: 'ssot.onboarding.steps.reservation.title',
        bodyKey: 'ssot.onboarding.steps.reservation.body',
        ctaLabelKey: 'ssot.onboarding.steps.reservation.cta',
        ctaHref: '/provider/reservations/new',
        completeWhen: 'reservation_created',
        successToastKey: 'ssot.toasts.reservation_created',
    },
    {
        id: 'issue',
        titleKey: 'ssot.onboarding.steps.issue.title',
        bodyKey: 'ssot.onboarding.steps.issue.body',
        ctaLabelKey: 'ssot.onboarding.steps.issue.cta',
        ctaHref: '/provider/dashboard',
        completeWhen: 'issue_completed',
        successToastKey: 'ssot.toasts.issue_completed',
    },
    {
        id: 'overview',
        titleKey: 'ssot.onboarding.steps.overview.title',
        bodyKey: 'ssot.onboarding.steps.overview.body',
        ctaLabelKey: 'ssot.onboarding.steps.overview.cta',
        ctaHref: '/provider/dashboard',
        // Deviation: ops_digest_seen signal does not exist.
        // Using dashboard_viewed (always true once checklist renders) as nearest signal.
        // Logged in: docs/ssot/in_app_microcopy_v1_pilot.md
        completeWhen: 'dashboard_viewed',
    },
];

// ─── Empty States ─────────────────────────────────────────────────────────────

/**
 * Empty state copy for pilot-scope pages.
 * All primary CTA hrefs are verified real routes.
 */
export const emptyStates: Record<string, EmptyStateCopy> = {
    inventory: {
        titleKey: 'ssot.emptyStates.inventory.title',
        bodyKey: 'ssot.emptyStates.inventory.body',
        primaryCtaLabelKey: 'ssot.emptyStates.inventory.primaryCta',
        primaryCtaHref: '/provider/inventory',
        secondaryCtaLabelKey: 'ssot.emptyStates.inventory.secondaryCta',
        secondaryCtaHref: '/provider/inventory?import=true',
    },
    reservations: {
        titleKey: 'ssot.emptyStates.reservations.title',
        bodyKey: 'ssot.emptyStates.reservations.body',
        primaryCtaLabelKey: 'ssot.emptyStates.reservations.primaryCta',
        primaryCtaHref: '/provider/reservations/new',
    },
    maintenance: {
        titleKey: 'ssot.emptyStates.maintenance.title',
        bodyKey: 'ssot.emptyStates.maintenance.body',
        primaryCtaLabelKey: 'ssot.emptyStates.maintenance.primaryCta',
        primaryCtaHref: '/provider/inventory',
    },
    exports: {
        titleKey: 'ssot.emptyStates.exports.title',
        bodyKey: 'ssot.emptyStates.exports.body',
        primaryCtaLabelKey: 'ssot.emptyStates.exports.primaryCta',
        primaryCtaHref: '/provider/reservations',
        secondaryCtaLabelKey: 'ssot.emptyStates.exports.secondaryCta',
        secondaryCtaHref: '/provider/inventory',
    },
};

// ─── Behavior-Based Tips (8) ──────────────────────────────────────────────────

/**
 * Triggered tips shown as ContextTip components on relevant pages.
 * Max 1 tip per page — caller picks the relevant tip.
 * Tips with featureFlag=false are never shown regardless of trigger.
 */
export const tips: TipCopy[] = [
    {
        id: 'tip_inventory_empty',
        textKey: 'ssot.tips.inventory_empty.text',
        ctaLabelKey: 'ssot.tips.inventory_empty.cta',
        ctaHref: '/provider/inventory',
        trigger: 'inventory_count_zero_90s',
        ttlDays: 7,
        maxShows: 3,
        cooldownHours: 24,
        featureFlag: true,
    },
    {
        id: 'tip_no_reservation_24h',
        textKey: 'ssot.tips.no_reservation_24h.text',
        ctaLabelKey: 'ssot.tips.no_reservation_24h.cta',
        ctaHref: '/provider/reservations/new',
        trigger: 'no_reservation_after_24h',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 48,
        featureFlag: true,
    },
    {
        id: 'tip_unassigned_assets',
        textKey: 'ssot.tips.unassigned_assets.text',
        ctaLabelKey: 'ssot.tips.unassigned_assets.cta',
        ctaHref: '/provider/reservations',
        trigger: 'reservation_detail_opened_2x_assigned_zero',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 24,
        featureFlag: true,
    },
    {
        id: 'tip_export_after_48h',
        textKey: 'ssot.tips.export_after_48h.text',
        ctaLabelKey: 'ssot.tips.export_after_48h.cta',
        ctaHref: '/provider/reservations',
        trigger: 'first_operation_48h_no_export',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 48,
        featureFlag: true,
    },
    // ── Feature-flagged tips (default OFF) ─────────────────────────────────────
    {
        id: 'tip_scanner',
        textKey: 'ssot.tips.scanner.text',
        ctaLabelKey: 'ssot.tips.scanner.cta',
        ctaHref: '/provider/inventory',
        trigger: 'scanner_flow_3x_scanner_unused',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 48,
        // OFF: scanner usage signal not yet tracked
        featureFlag: FEATURE_FLAGS.tip_scanner,
    },
    {
        id: 'tip_collision',
        textKey: 'ssot.tips.collision.text',
        ctaLabelKey: 'ssot.tips.collision.cta',
        ctaHref: '/provider/reservations',
        trigger: 'collision_fail_2x_24h',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 24,
        // OFF: collision fail count signal not available
        featureFlag: FEATURE_FLAGS.tip_collision,
    },
    {
        id: 'tip_condition',
        textKey: 'ssot.tips.condition.text',
        ctaLabelKey: 'ssot.tips.condition.cta',
        ctaHref: '/provider/dashboard',
        trigger: 'return_missing_condition_2x',
        ttlDays: 7,
        maxShows: 2,
        cooldownHours: 24,
        // OFF: condition_state tracking not implemented
        featureFlag: FEATURE_FLAGS.tip_condition,
    },
    {
        id: 'tip_feedback',
        textKey: 'ssot.tips.feedback.text',
        ctaHref: undefined,
        trigger: 'feedback_nudge',
        ttlDays: 7,
        maxShows: 1,
        cooldownHours: 168,
        // OFF: no feedback UI in app
        featureFlag: FEATURE_FLAGS.tip_feedback,
    },
];

/**
 * Returns a tip by its stable ID. Throws if not found (prevents silent silencing).
 * Usage: `getTip('tip_inventory_empty')`
 */
export function getTip(id: string): TipCopy {
    const tip = tips.find(t => t.id === id);
    if (!tip) throw new Error(`[microcopy.registry] Unknown tip id: "${id}"`);
    return tip;
}

// ─── Success Toasts ───────────────────────────────────────────────────────────

/**
 * Success toast copy keyed by lifecycle event name.
 * Used by relevant components instead of hardcoded strings.
 */
export const toasts: Record<string, ToastCopy> = {
    inventory_item_created: {
        titleKey: 'ssot.toasts.inventory_item_created.title',
        descriptionKey: 'ssot.toasts.inventory_item_created.desc',
    },
    inventory_import_completed: {
        titleKey: 'ssot.toasts.inventory_import_completed.title',
        descriptionKey: 'ssot.toasts.inventory_import_completed.desc',
    },
    reservation_created: {
        titleKey: 'ssot.toasts.reservation_created.title',
        descriptionKey: 'ssot.toasts.reservation_created.desc',
    },
    issue_completed: {
        titleKey: 'ssot.toasts.issue_completed.title',
        descriptionKey: 'ssot.toasts.issue_completed.desc',
    },
    return_completed: {
        titleKey: 'ssot.toasts.return_completed.title',
        descriptionKey: 'ssot.toasts.return_completed.desc',
    },
    return_with_damage: {
        titleKey: 'ssot.toasts.return_with_damage.title',
        descriptionKey: 'ssot.toasts.return_with_damage.desc',
    },
    export_generated: {
        titleKey: 'ssot.toasts.export_generated.title',
        descriptionKey: 'ssot.toasts.export_generated.desc',
    },
    print_generated: {
        titleKey: 'ssot.toasts.print_generated.title',
        descriptionKey: 'ssot.toasts.print_generated.desc',
    },
};
