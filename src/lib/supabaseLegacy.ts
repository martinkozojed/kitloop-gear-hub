/**
 * Legacy Table Operations Wrapper
 * 
 * This module provides type-safe wrappers for legacy Supabase tables (gear_items, gear_images)
 * that have overly strict generated types. All type casting is centralized here to keep
 * UI components clean and maintain a single source of truth for legacy table interactions.
 * 
 * @module supabaseLegacy
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';

type SupabaseClientType = SupabaseClient<Database>;

/**
 * Insert a single gear item into the legacy gear_items table
 * 
 * @param supabase - Supabase client instance
 * @param itemData - Gear item data to insert
 * @returns Supabase query builder for chaining (e.g., .select())
 */
export function insertGearItem(
    supabase: SupabaseClientType,
    itemData: Record<string, unknown>
) {
    return supabase
        .from('gear_items')
        .insert(itemData as unknown as never);
}

/**
 * Update a gear item in the legacy gear_items table
 * 
 * @param supabase - Supabase client instance
 * @param id - ID of the gear item to update
 * @param itemData - Updated gear item data
 * @returns Supabase query builder for chaining (e.g., .select())
 */
export function updateGearItem(
    supabase: SupabaseClientType,
    id: string,
    itemData: Record<string, unknown>
) {
    return supabase
        .from('gear_items')
        .update(itemData as unknown as never)
        .eq('id', id);
}

/**
 * Batch insert multiple gear items into the legacy gear_items table
 * 
 * @param supabase - Supabase client instance
 * @param items - Array of gear items to insert
 * @returns Supabase query builder for chaining (e.g., .select())
 */
export function insertGearItems(
    supabase: SupabaseClientType,
    items: Record<string, unknown>[]
) {
    return supabase
        .from('gear_items')
        .insert(items as unknown as never);
}

/**
 * Insert gear images into the legacy gear_images table
 * 
 * @param supabase - Supabase client instance
 * @param images - Array of image records to insert
 * @returns Supabase query builder for chaining (e.g., .select())
 */
export function insertGearImages(
    supabase: SupabaseClientType,
    images: Record<string, unknown>[]
) {
    return supabase
        .from('gear_images')
        .insert(images as unknown as never);
}
