import React, { useRef, useState } from 'react';
import { useReactToPrint } from 'react-to-print';
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { ContractTemplate } from './ContractTemplate';
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

interface PrintContractButtonProps {
    reservationId: string;
    variant?: "primary" | "primarySolid" | "outline" | "ghost" | "destructive" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
    className?: string;
    label?: string;
}

interface PrintItem {
    name: string;
    price_cents: number;
    quantity: number;
}

interface PrintDataState {
    reservation: Record<string, unknown>;
    provider: Record<string, unknown>;
    customer: Record<string, unknown>;
    items: PrintItem[];
}

export function PrintContractButton({ reservationId, variant = "outline", size = "sm", className, label = "Tisk smlouvy" }: PrintContractButtonProps) {
    const componentRef = useRef<HTMLDivElement>(null);
    const [loading, setLoading] = useState(false);
    const [printData, setPrintData] = useState<PrintDataState | null>(null);

    const fetchPrintData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Reservation + Provider
            const { data: res, error: resError } = await supabase
                .from('reservations')
                .select(`
                    *,
                    provider:providers ( * ),
                    customer:customers ( * ),
                    lines:reservation_lines (
                        quantity,
                        price_per_item_cents,
                        product_variant:product_variants ( name )
                    )
                `)
                .eq('id', reservationId)
                .single();

            if (resError) throw resError;

            // 2. Format Data
            interface ReservationLine {
                quantity: number;
                price_per_item_cents: number;
                product_variant: { name: string } | null;
            }
            const items = (res.lines as ReservationLine[] | undefined)?.map((line) => ({
                name: line.product_variant?.name || 'Item',
                price_cents: line.price_per_item_cents,
                quantity: line.quantity
            })) || [];

            setPrintData({
                reservation: res,
                provider: res.provider,
                customer: res.customer || { full_name: res.customer_name, email: res.customer_email, phone: res.customer_phone }, // Fallback to reservation snapshot
                items
            });

            return true;
        } catch (error: unknown) {
            console.error(error);
            toast.error("Failed to load contract data");
            return false;
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = useReactToPrint({
        // content: () => componentRef.current, // Updated for v7 compatibility, but let's check standard
        contentRef: componentRef, // v7 API, or check docs. Standard is content: () => ref.current
        documentTitle: `Contract_${reservationId.slice(0, 8)}`,
    });

    const triggerPrint = async () => {
        const success = await fetchPrintData();
        if (success) {
            // Give React a moment to render the template with new data
            setTimeout(() => {
                handlePrint();
            }, 100);
        }
    };

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={className}
                onClick={triggerPrint}
                disabled={loading}
            >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
                {label}
            </Button>

            {/* Hidden Printable Area */}
            <div style={{ display: 'none' }}>
                {printData && (
                    <ContractTemplate
                        ref={componentRef}
                        reservation={printData.reservation}
                        provider={printData.provider}
                        customer={printData.customer}
                        items={printData.items}
                    />
                )}
            </div>
        </>
    );
}
