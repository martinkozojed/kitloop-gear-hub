import { supabase } from "@/lib/supabase";

export async function createInventoryItem(data: {
    provider_id: string;
    name: string;
    category: string;
    description: string;
    price_per_day: number;
    condition: string;
    quantity_total: number;
    image_url: string | null;
    sku: string | null;
}) {
    const { data: id, error } = await supabase.rpc('create_inventory_item', {
        p_provider_id: data.provider_id,
        p_name: data.name,
        p_category: data.category,
        p_description: data.description || '',
        p_price_cents: Math.round(data.price_per_day * 100),
        p_image_url: data.image_url ?? '',
        p_condition: data.condition,
        p_quantity_total: data.quantity_total,
        p_sku: data.sku ?? undefined,
    });
    return { data: id, error };
}

export async function updateInventoryItem(
    itemId: string,
    data: {
        name: string;
        category: string;
        description: string;
        price_per_day: number;
        condition: string;
        quantity_total: number;
        image_url: string | null;
        sku: string | null;
    }
) {
    const { error } = await supabase.rpc('update_inventory_item', {
        p_item_id: itemId,
        p_name: data.name,
        p_category: data.category,
        p_description: data.description || '',
        p_price_cents: Math.round(data.price_per_day * 100),
        p_image_url: data.image_url ?? '',
        p_condition: data.condition,
        p_quantity_total: data.quantity_total,
        p_sku: data.sku ?? '',
    });
    return { error };
}

export async function softDeleteInventoryItem(itemId: string) {
    const { error } = await supabase.rpc('soft_delete_inventory_item', {
        p_item_id: itemId
    });
    return { error };
}
