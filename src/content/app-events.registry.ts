/**
 * SSOT: App event name constants for the pilot message engine.
 * Use these constants instead of raw strings to avoid typos.
 * These are internal events only — no external analytics vendor dependency.
 */
export const APP_EVENTS = {
    // Inventory
    INVENTORY_ITEM_CREATED: 'inventory_item_created',
    INVENTORY_IMPORT_COMPLETED: 'inventory_import_completed',

    // Reservations
    RESERVATION_CREATED: 'reservation_created',

    // Operations
    ISSUE_COMPLETED: 'issue_completed',
    RETURN_COMPLETED: 'return_completed',

    // Exports / Prints
    EXPORT_GENERATED: 'export_generated',
    PRINT_GENERATED: 'print_generated',

    // Conflict resolution
    COLLISION_RESOLVED: 'collision_resolved',

    // Tip interactions
    TIP_DISMISSED: 'tip_dismissed',
    TIP_CLICKED: 'tip_clicked',
    TOAST_SHOWN: 'toast_shown',
} as const;

export type AppEventName = (typeof APP_EVENTS)[keyof typeof APP_EVENTS];
