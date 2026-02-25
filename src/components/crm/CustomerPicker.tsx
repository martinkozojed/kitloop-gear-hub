import React, { useState } from "react";
import { Check, ChevronsUpDown, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { useTranslation } from "react-i18next";

export interface CustomerOption {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
}

interface CustomerPickerProps {
    value?: string; // CRM Customer ID
    onSelect: (customer: CustomerOption | null) => void;
}

export function CustomerPicker({ value, onSelect }: CustomerPickerProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const { provider } = useAuth();
    const { t } = useTranslation();

    const { data: customers = [], isLoading } = useQuery({
        queryKey: ['crm-search', provider?.id, search],
        queryFn: async () => {
            if (!provider?.id) return [];

            let query = supabase
                .from('customers')
                .select('id, full_name, email, phone')
                .eq('provider_id', provider.id)
                .limit(20);

            if (search) {
                query = query.ilike('full_name', `%${search}%`);
            } else {
                query = query.order('created_at', { ascending: false });
            }

            const { data, error } = await query;
            if (error) throw error;
            return data as CustomerOption[];
        },
        enabled: !!provider?.id,
        placeholderData: (previousData) => previousData
    });

    const selectedCustomer = customers.find((c) => c.id === value);

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between"
                >
                    {selectedCustomer ? (
                        <span className="flex items-center gap-2">
                            <User className="w-4 h-4 text-muted-foreground" />
                            <span className="font-semibold">{selectedCustomer.full_name}</span>
                            <span className="text-muted-foreground text-xs font-normal">
                                {selectedCustomer.email || selectedCustomer.phone}
                            </span>
                        </span>
                    ) : (
                        <span className="text-muted-foreground">{t('provider.reservationForm.crm.searchPlaceholder')}</span>
                    )}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[320px] p-0 bg-popover shadow-elevated border border-border rounded-xl" align="start">
                <Command shouldFilter={false}>
                    <CommandInput placeholder={t('provider.reservationForm.crm.inputPlaceholder')} onValueChange={setSearch} />
                    <CommandList>
                        {isLoading && <div className="p-2 text-xs text-muted-foreground text-center">{t('provider.reservationForm.crm.searching')}</div>}
                        {!isLoading && customers.length === 0 && (
                            <CommandEmpty>{t('provider.reservationForm.crm.empty')}</CommandEmpty>
                        )}
                        <CommandGroup>
                            {!isLoading && customers.map((customer) => (
                                <CommandItem
                                    key={customer.id}
                                    value={customer.id} // Not used for filtering since we do server-side
                                    onSelect={(currentValue) => {
                                        onSelect(customer);
                                        setOpen(false);
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === customer.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{customer.full_name}</span>
                                        <span className="text-xs text-muted-foreground">{customer.email}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
