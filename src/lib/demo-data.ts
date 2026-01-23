import { supabase } from "@/lib/supabase";

const demoEnabled = import.meta.env.VITE_ENABLE_DEMO === "true";

export async function generateDemoData(providerId: string) {
    if (!demoEnabled) {
        throw new Error("Demo data generation is disabled");
    }

    if (!providerId) throw new Error("Provider ID is required");

    // 1. Create Product
    const { data: prod, error: pErr } = await supabase.from('products').insert({
        provider_id: providerId,
        name: 'Demo Atomic Skis',
        category: 'skis',
        base_price_cents: 45000,
        image_url: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256'
    }).select().single();
    if (pErr) throw pErr;

    // 2. Create Variant
    const { data: variant, error: vErr } = await supabase.from('product_variants').insert({
        product_id: prod.id,
        name: '176cm',
        sku: 'DEMO-001'
    }).select().single();
    if (vErr) throw vErr;

    // 3. Create Assets
    const assetsToCreate = Array.from({ length: 5 }).map((_, i) => ({
        provider_id: providerId,
        variant_id: variant.id,
        asset_tag: `TAG-${2000 + i}`,
        status: (['available', 'maintenance', 'active'] as const)[i % 3],
        condition_score: Math.floor(Math.random() * 30) + 70, // 70-100
        location: 'Warehouse A'
    }));

    const { error: aErr } = await supabase.from('assets').insert(assetsToCreate);
    if (aErr) throw aErr;

    return { product: prod, variant: variant, count: assetsToCreate.length };
}
