/**
 * Onboarding Validation Schemas
 * 
 * Zod schemas for the 3-step provider onboarding wizard.
 * Used in ProviderSetup.tsx for form validation.
 */
import { z } from 'zod';

/**
 * Step 1: Workspace
 * Basic rental business information
 */
export const workspaceSchema = z.object({
    rental_name: z
        .string()
        .min(3, 'Název musí mít alespoň 3 znaky')
        .max(100, 'Název může mít maximálně 100 znaků'),
    contact_phone: z
        .string()
        .regex(/^\+?[\d\s()-]{7,15}$/, 'Neplatné telefonní číslo'),
    contact_email: z
        .string()
        .email('Neplatná emailová adresa'),
    currency: z
        .enum(['CZK', 'EUR', 'USD'])
        .default('CZK'),
    time_zone: z
        .string()
        .default('Europe/Prague'),
});

/**
 * Step 2: Location
 * Pickup location and business hours
 */
export const locationSchema = z.object({
    location: z
        .string()
        .min(2, 'Město je povinné')
        .max(100),
    address: z
        .string()
        .max(200)
        .optional(),
    business_hours_display: z
        .string()
        .max(50)
        .optional(),
    pickup_instructions: z
        .string()
        .max(500)
        .optional(),
});

/**
 * Step 3: Inventory path choice
 */
export const inventoryPathSchema = z.object({
    path: z.enum(['csv_import', 'manual', 'demo']),
});

/**
 * Combined schema for the full onboarding form
 */
export const onboardingFormSchema = workspaceSchema.merge(locationSchema);

/**
 * Type exports for TypeScript
 */
export type WorkspaceFormData = z.infer<typeof workspaceSchema>;
export type LocationFormData = z.infer<typeof locationSchema>;
export type InventoryPath = z.infer<typeof inventoryPathSchema>;
export type OnboardingFormData = z.infer<typeof onboardingFormSchema>;
