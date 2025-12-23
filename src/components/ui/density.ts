export const DENSITY = {
    desktop: {
        rowHeight: '44px', // Optimized for visual scanning
        buttonHeight: '36px',
        fontSize: '0.875rem', // 14px
        iconSize: '1.25rem', // 20px
        paddingX: '0.75rem', // 12px
        gap: '0.5rem',
    },
    mobile: {
        rowHeight: '56px', // Standard comfortable touch target
        buttonHeight: '48px', // >44px Rule
        fontSize: '1rem', // 16px to prevent zoom
        iconSize: '1.5rem', // 24px
        paddingX: '1rem', // 16px
        gap: '0.75rem',
    },
} as const;

export type DensityMode = keyof typeof DENSITY;
