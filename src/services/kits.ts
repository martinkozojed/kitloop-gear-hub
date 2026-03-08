/**
 * Kit Bundles service — "Sety pro rychlost, komponenty pro pravdu"
 *
 * Kits are UX aggregations. A kit reservation creates N standard reservations
 * with a shared group_id. Truth stays per-asset / per-reservation.
 */
import { supabase } from "@/lib/supabase";
import { logger } from "@/lib/logger";
import { getErrorMessage } from "@/lib/error-utils";
import { createReservationHold, type ReservationCustomerPayload, type ReservationHoldResult } from "./reservations";

// ═══════════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════════

export interface Kit {
    id: string;
    provider_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface KitItem {
    id: string;
    kit_id: string;
    variant_id: string;
    quantity: number;
    is_required: boolean;
    sort_order: number;
    // Joined fields (from product_variants → products)
    variant_name?: string;
    product_name?: string;
    price_override_cents?: number | null;
    base_price_cents?: number | null;
}

export interface KitWithItems extends Kit {
    kit_items: KitItem[];
}

export interface CreateKitReservationInput {
    providerId: string;
    kitId: string;
    startDate: Date;
    endDate: Date;
    customer: ReservationCustomerPayload;
    notes?: string | null;
    depositPaid: boolean;
}

export interface KitReservationResult {
    groupId: string;
    reservations: ReservationHoldResult[];
    warnings: string[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// Kit CRUD
// ═══════════════════════════════════════════════════════════════════════════════

export const fetchKits = async (providerId: string): Promise<KitWithItems[]> => {
    const { data, error } = await supabase
        .from('kits')
        .select(`
      id, provider_id, name, description, is_active, created_at, updated_at,
      kit_items (
        id, kit_id, variant_id, quantity, is_required, sort_order,
        product_variants:variant_id (
          id, name, price_override_cents,
          products:product_id ( name, base_price_cents )
        )
      )
    `)
        .eq('provider_id', providerId)
        .eq('is_active', true)
        .order('name');

    if (error) throw error;

    // Flatten joined variant data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data || []).map((kit: any) => ({
        ...kit,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        kit_items: (kit.kit_items || []).map((item: any) => ({
            id: item.id,
            kit_id: item.kit_id,
            variant_id: item.variant_id,
            quantity: item.quantity,
            is_required: item.is_required,
            sort_order: item.sort_order,
            variant_name: item.product_variants?.name || '',
            product_name: item.product_variants?.products?.name || '',
            price_override_cents: item.product_variants?.price_override_cents ?? null,
            base_price_cents: item.product_variants?.products?.base_price_cents ?? null,
        })).sort((a: KitItem, b: KitItem) => a.sort_order - b.sort_order),
    }));
};

export interface CreateKitInput {
    providerId: string;
    name: string;
    description?: string;
    items: { variantId: string; quantity: number; isRequired?: boolean }[];
}

export const createKit = async (input: CreateKitInput): Promise<Kit> => {
    const { data: kit, error: kitError } = await supabase
        .from('kits')
        .insert({
            provider_id: input.providerId,
            name: input.name,
            description: input.description || null,
        })
        .select()
        .single();

    if (kitError) throw kitError;

    const kitItems = input.items.map((item, idx) => ({
        kit_id: kit.id,
        variant_id: item.variantId,
        quantity: item.quantity,
        is_required: item.isRequired ?? true,
        sort_order: idx,
    }));

    const { error: itemsError } = await supabase
        .from('kit_items')
        .insert(kitItems);

    if (itemsError) {
        // Rollback kit if items fail
        await supabase.from('kits').delete().eq('id', kit.id);
        throw itemsError;
    }

    return kit;
};

export const updateKit = async (
    kitId: string,
    updates: { name?: string; description?: string; is_active?: boolean },
    newItems?: { variantId: string; quantity: number; isRequired?: boolean }[]
): Promise<void> => {
    const { error: updateError } = await supabase
        .from('kits')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', kitId);

    if (updateError) throw updateError;

    if (newItems) {
        // Replace all items
        await supabase.from('kit_items').delete().eq('kit_id', kitId);
        const kitItems = newItems.map((item, idx) => ({
            kit_id: kitId,
            variant_id: item.variantId,
            quantity: item.quantity,
            is_required: item.isRequired ?? true,
            sort_order: idx,
        }));
        const { error: itemsError } = await supabase.from('kit_items').insert(kitItems);
        if (itemsError) throw itemsError;
    }
};

export const deleteKit = async (kitId: string): Promise<void> => {
    const { error } = await supabase
        .from('kits')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', kitId);
    if (error) throw error;
};

// ═══════════════════════════════════════════════════════════════════════════════
// Kit Reservation — creates N standard reservations with shared group_id
// ═══════════════════════════════════════════════════════════════════════════════

export const createKitReservation = async (
    input: CreateKitReservationInput
): Promise<KitReservationResult> => {
    // 1) Fetch kit items
    const { data: kitItems, error: kitError } = await supabase
        .from('kit_items')
        .select('variant_id, quantity')
        .eq('kit_id', input.kitId)
        .order('sort_order');

    if (kitError) throw kitError;
    if (!kitItems || kitItems.length === 0) {
        throw new Error('Kit has no items');
    }

    // 2) Expand kit items (respect quantity — e.g. 2× carabiner = 2 reservations)
    const expandedItems: { variantId: string }[] = [];
    for (const item of kitItems) {
        for (let i = 0; i < item.quantity; i++) {
            expandedItems.push({ variantId: item.variant_id });
        }
    }

    // 3) Generate shared group_id
    const groupId = crypto.randomUUID();

    // 4) Check availability (warning only, no hard block)
    const warnings: string[] = [];
    for (const item of expandedItems) {
        try {
            const { data: isAvailable } = await supabase.rpc('check_variant_availability', {
                p_variant_id: item.variantId,
                p_start_date: input.startDate.toISOString(),
                p_end_date: input.endDate.toISOString(),
            });
            if (isAvailable === false) {
                // Fetch variant name for warning
                const { data: variant } = await supabase
                    .from('product_variants')
                    .select('name, products:product_id(name)')
                    .eq('id', item.variantId)
                    .single();
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const vName = variant ? `${(variant as any).products?.name} / ${variant.name}` : item.variantId;
                warnings.push(`Dostupnost: ${vName} nemusí být volné v tomto termínu.`);
            }
        } catch (e) {
            logger.warn('Kit availability check failed for variant', { variantId: item.variantId, error: e });
        }
    }

    // 5) Fetch variant pricing info for each unique variant
    const uniqueVariantIds = [...new Set(expandedItems.map(i => i.variantId))];
    const { data: variantPrices } = await supabase
        .from('product_variants')
        .select('id, price_override_cents, products:product_id(base_price_cents)')
        .in('id', uniqueVariantIds);

    const priceMap = new Map<string, number>();
    for (const v of variantPrices || []) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const baseCents = (v as any).products?.base_price_cents || 0;
        const cents = v.price_override_cents ?? baseCents;
        priceMap.set(v.id, cents / 100);
    }

    // 6) Create N reservations with same group_id
    const reservations: ReservationHoldResult[] = [];
    const rentalDays = Math.max(1, Math.ceil(
        (input.endDate.getTime() - input.startDate.getTime()) / (1000 * 60 * 60 * 24)
    ));

    try {
        for (const item of expandedItems) {
            const pricePerDay = priceMap.get(item.variantId) || 0;
            const totalPrice = pricePerDay * rentalDays;

            const result = await createReservationHold({
                providerId: input.providerId,
                productVariantId: item.variantId,
                startDate: input.startDate,
                endDate: input.endDate,
                totalPrice,
                depositPaid: input.depositPaid,
                notes: input.notes || null,
                customer: input.customer,
                rentalDays,
                pricePerDay,
                customerUserId: null,
            });

            // Patch group_id and kit_template_id onto the created reservation
            await supabase
                .from('reservations')
                .update({ group_id: groupId, kit_template_id: input.kitId })
                .eq('id', result.reservation_id);

            reservations.push(result);
        }

        return { groupId, reservations, warnings };
    } catch (e: unknown) {
        logger.error('createKitReservation transaction failed. Rolling back.', { groupId, error: e });
        for (const res of reservations) {
            await supabase.from('reservations').delete().eq('id', res.reservation_id);
        }
        throw new Error(`Kit reservation failed; no items created. Reason: ${getErrorMessage(e)}`);
    }
};

// ═══════════════════════════════════════════════════════════════════════════════
// Group operations (issue/return batch)
// ═══════════════════════════════════════════════════════════════════════════════

export interface GroupReservation {
    id: string;
    status: string;
    product_variant_id: string | null;
    gear_id: string | null;
    customer_name: string;
    start_date: string;
    end_date: string;
    kit_template_id: string | null;
}

/**
 * Fetch all reservations in a group
 */
export const fetchGroupReservations = async (
    groupId: string,
    providerId: string
): Promise<GroupReservation[]> => {
    const { data, error } = await supabase
        .from('reservations')
        .select('id, status, product_variant_id, gear_id, customer_name, start_date, end_date, kit_template_id')
        .eq('provider_id', providerId)
        .eq('group_id', groupId)
        .order('created_at');

    if (error) throw error;
    return data || [];
};

/**
 * Issue all reservations in a group — all-or-nothing.
 * If any reservation fails the hard gate, entire group fails.
 * Uses the same status transition as single-item issue.
 */
export const issueGroup = async (
    groupId: string,
    providerId: string
): Promise<{ success: boolean; error?: string }> => {
    const reservations = await fetchGroupReservations(groupId, providerId);

    // Pre-check: all must be in issuable state (confirmed or hold)
    const nonIssuable = reservations.filter(r => !['confirmed', 'hold', 'pending'].includes(r.status));
    if (nonIssuable.length > 0) {
        return {
            success: false,
            error: `${nonIssuable.length} položek nelze vydat (status: ${nonIssuable.map(r => r.status).join(', ')})`,
        };
    }

    // Hard gate: check all assets are available for each reservation
    for (const res of reservations) {
        const variantId = res.product_variant_id || res.gear_id;
        if (!variantId) continue;

        const { data: assignments } = await supabase
            .from('asset_assignments')
            .select('asset_id, assets!inner(status)')
            .eq('reservation_id', res.id)
            .is('returned_at', null);

        // If there are assignments, check asset status
        if (assignments && assignments.length > 0) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const unavailable = assignments.filter((a: any) => a.assets?.status !== 'available' && a.assets?.status !== 'active');
            if (unavailable.length > 0) {
                return {
                    success: false,
                    error: `Asset není dostupný pro rezervaci ${res.id.slice(0, 8)}`,
                };
            }
        }
    }

    // All clear — issue all reservations
    try {
        for (const res of reservations) {
            const { error } = await supabase
                .from('reservations')
                .update({
                    status: 'active',
                    actual_pickup_time: new Date().toISOString(),
                })
                .eq('id', res.id);

            if (error) {
                throw new Error(`Issue failed for reservation ${res.id}: ${getErrorMessage(error)}`);
            }
        }
        return { success: true };
    } catch (error) {
        // On failure, attempt to rollback any already-issued
        logger.error('issueGroup partial failure, attempting rollback', { groupId, error });
        for (const res of reservations) {
            await supabase
                .from('reservations')
                .update({ status: 'confirmed', actual_pickup_time: null })
                .eq('id', res.id)
                .eq('status', 'active');
        }
        return {
            success: false,
            error: getErrorMessage(error) || 'Issue skupiny se nezdařil',
        };
    }
};

/**
 * Return all reservations in a group — batch return.
 * Per-asset condition is handled by existing asset condition flow.
 */
export const returnGroup = async (
    groupId: string,
    providerId: string
): Promise<{ success: boolean; error?: string }> => {
    const reservations = await fetchGroupReservations(groupId, providerId);

    // Pre-check: all must be in returnable state (active)
    const nonReturnable = reservations.filter(r => r.status !== 'active');
    if (nonReturnable.length > 0) {
        return {
            success: false,
            error: `${nonReturnable.length} položek nelze vrátit (status: ${nonReturnable.map(r => r.status).join(', ')})`,
        };
    }

    try {
        for (const res of reservations) {
            const { error } = await supabase
                .from('reservations')
                .update({
                    status: 'completed',
                    actual_return_time: new Date().toISOString(),
                })
                .eq('id', res.id);

            if (error) {
                throw new Error(`Return failed for reservation ${res.id}: ${getErrorMessage(error)}`);
            }

            // Release assigned assets back to available
            const { data: assignments } = await supabase
                .from('asset_assignments')
                .select('asset_id')
                .eq('reservation_id', res.id)
                .is('returned_at', null);

            if (assignments) {
                for (const assignment of assignments) {
                    await supabase
                        .from('assets')
                        .update({ status: 'available' })
                        .eq('id', assignment.asset_id);
                    await supabase
                        .from('asset_assignments')
                        .update({ returned_at: new Date().toISOString() })
                        .eq('reservation_id', res.id)
                        .eq('asset_id', assignment.asset_id)
                        .is('returned_at', null);
                }
            }
        }
        return { success: true };
    } catch (error) {
        logger.error('returnGroup partial failure', { groupId, error });
        return {
            success: false,
            error: getErrorMessage(error) || 'Return skupiny se nezdařil',
        };
    }
};
