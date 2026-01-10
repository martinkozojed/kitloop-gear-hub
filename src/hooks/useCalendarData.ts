import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { addDays } from "date-fns";
import { useAuth } from "@/context/AuthContext";

export interface CalendarAsset {
    id: string;
    asset_tag: string;
    status: string;
    variant_id: string;
}

export interface CalendarVariant {
    id: string;
    name: string;
    product_id: string;
    product: {
        name: string;
        category: string;
    };
    assets: CalendarAsset[];
}

export interface CalendarReservation {
    id: string;
    start_date: string;
    end_date: string;
    status: string;
    customer_name: string;
    customer_email?: string;
    customer_phone?: string;
    product_variant_id: string | null;
    assignments: {
        asset_id: string;
        assets?: {
            asset_tag: string;
            product_variants?: {
                name: string;
            } | null;
        } | null;
    }[];
    deposit_paid: boolean;
    total_price: number;
}

export const useCalendarData = (
    providerId: string | undefined,
    dateRange: { start: Date; days: number }
) => {
    // 1. Fetch Inventory Structure (Products -> Variants -> Assets)
    // This rarely changes, so we cache it aggressively.
    const inventoryQuery = useQuery({
        queryKey: ['calendar', 'inventory', providerId],
        queryFn: async (): Promise<CalendarVariant[]> => {
            if (!providerId) throw new Error("No provider ID");

            interface FetchedVariant {
                id: string;
                name: string;
                assets: { id: string; asset_tag: string; status: string; variant_id: string }[];
            }

            interface FetchedProduct {
                id: string;
                name: string;
                category: string;
                product_variants: FetchedVariant[];
            }

            const { data, error } = await supabase
                .from('products')
                .select(`
                    id, name, category,
                    product_variants (
                        id, name,
                        assets (id, asset_tag, status, variant_id)
                    )
                `)
                .eq('provider_id', providerId)
                .order('name') // Order products alphabetically
                .returns<FetchedProduct[]>();

            if (error) throw error;

            // Flatten logic
            const flatVariants: CalendarVariant[] = [];
            data?.forEach(prod => {
                prod.product_variants.forEach(v => {
                    flatVariants.push({
                        id: v.id,
                        name: v.name,
                        product_id: prod.id,
                        product: { name: prod.name, category: prod.category },
                        assets: v.assets || []
                    });
                });
            });

            return flatVariants;
        },
        enabled: !!providerId,
        staleTime: 1000 * 60 * 10, // 10 minutes (Inventory doesn't change often)
    });

    // 2. Fetch Reservations (Windowed)
    const reservationsQuery = useQuery({
        queryKey: ['calendar', 'reservations', providerId, dateRange.start.toISOString(), dateRange.days],
        queryFn: async (): Promise<CalendarReservation[]> => {
            if (!providerId) throw new Error("No provider ID");

            const rangeStart = dateRange.start;
            const rangeEnd = addDays(rangeStart, dateRange.days);

            // Fetch reservations that OVERLAP with the window
            // (start < window_end) AND (end > window_start)
            const { data, error } = await supabase
                .from('reservations')
                .select(`
                    id, start_date, end_date, status, customer_name, customer_email, customer_phone, product_variant_id,
                    deposit_paid, total_price,
                    reservation_assignments (
                        asset_id,
                        assets (
                            asset_tag,
                            product_variants ( name )
                        )
                    )
                `)
                .eq('provider_id', providerId)
                .in('status', ['confirmed', 'active', 'hold', 'completed']) // Including completed/returned for history
                .lt('start_date', rangeEnd.toISOString())
                .gt('end_date', rangeStart.toISOString());

            if (error) throw error;

            return (data || []).map(r => ({
                ...r,
                assignments: r.reservation_assignments || []
            })) as CalendarReservation[];
        },
        enabled: !!providerId,
        placeholderData: (previousData) => previousData, // Keep previous data while fetching new window (No flickers)
        staleTime: 1000 * 60 * 1, // 1 minute (Reservations change often)
    });

    return {
        variants: inventoryQuery.data || [],
        reservations: reservationsQuery.data || [],
        isLoading: inventoryQuery.isLoading || reservationsQuery.isLoading,
        isError: inventoryQuery.isError || reservationsQuery.isError,
        error: inventoryQuery.error || reservationsQuery.error,
        refetchReservations: reservationsQuery.refetch
    };
};
