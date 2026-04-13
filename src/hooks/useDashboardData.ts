import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useProvider } from '@/context/ProviderContext';
import { getProviderTodayDates } from "@/lib/provider-dates";
import type { AgendaItemProps } from "@/types/dashboard";
import { toast } from "sonner";
import {
    fetchDashboardKpi,
    fetchAgendaItems,
    fetchExceptions,
    issueReservation,
    processReturn,
} from "@/services/dashboard";

export const useDashboardData = () => {
    const { provider } = useProvider();
    const queryClient = useQueryClient();

    // DATE columns in reservations are Postgres DATE type.
    // Use provider timezone to compute correct "today" boundary.
    // Fallback: operator's local clock (F1 pilot default).
    const { todayDate, tomorrowDate } = getProviderTodayDates(provider?.time_zone);

    // --- QUERIES ---

    const kpiQuery = useQuery({
        queryKey: ['dashboard', 'kpi', provider?.id],
        queryFn: () => fetchDashboardKpi(provider!.id, todayDate, tomorrowDate),
        enabled: !!provider?.id,
        staleTime: 1000 * 60 * 1,
    });

    const agendaQuery = useQuery({
        queryKey: ['dashboard', 'agenda', provider?.id, todayDate],
        queryFn: () => fetchAgendaItems(provider!.id, todayDate, tomorrowDate),
        enabled: !!provider?.id,
        staleTime: 1000 * 60 * 5,
    });

    const exceptionsQuery = useQuery({
        queryKey: ['dashboard', 'exceptions', provider?.id, todayDate],
        queryFn: () => fetchExceptions(provider!.id, todayDate, tomorrowDate),
        enabled: !!provider?.id,
    });

    // --- MUTATIONS (Optimistic UI) ---

    const issueMutation = useMutation({
        mutationFn: async ({ id, isOverride, groupId }: { id: string; isOverride: boolean; groupId?: string }) => {
            if (!provider?.id) throw new Error("Missing provider ID");
            await issueReservation(id, provider.id, isOverride, groupId);
        },
        onMutate: async ({ id, groupId }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id, todayDate]);

            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                if (groupId) {
                    return old.filter(item => item.groupId !== groupId);
                }
                return old.filter(item => item.reservationId !== id);
            });

            return { previousAgenda };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], context?.previousAgenda);
            toast.error("Issue failed - reverting");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    const returnMutation = useMutation({
        mutationFn: async ({ id, damage, groupId }: { id: string; damage: boolean; groupId?: string }) => {
            if (!provider?.id) throw new Error("Missing provider ID");
            await processReturn(id, provider.id, damage, groupId);
        },
        onMutate: async ({ id, groupId }) => {
            await queryClient.cancelQueries({ queryKey: ['dashboard', 'agenda', provider?.id] });
            const previousAgenda = queryClient.getQueryData<AgendaItemProps[]>(['dashboard', 'agenda', provider?.id, todayDate]);

            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], (old: AgendaItemProps[] | undefined) => {
                if (!old) return [];
                return old.map(item => {
                    if (groupId && item.groupId === groupId) return { ...item, status: 'completed' };
                    if (!groupId && item.reservationId === id) return { ...item, status: 'completed' };
                    return item;
                });
            });

            return { previousAgenda };
        },
        onError: (_err, _vars, context) => {
            queryClient.setQueryData(['dashboard', 'agenda', provider?.id, todayDate], context?.previousAgenda);
            toast.error("Return failed");
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
        },
    });

    return {
        // Data
        kpiData: kpiQuery.data || { activeRentals: 0, returnsToday: 0, dailyRevenue: 0 },
        agendaItems: agendaQuery.data || [],
        exceptions: exceptionsQuery.data || [],
        isLoading: kpiQuery.isLoading || agendaQuery.isLoading,
        isError: kpiQuery.isError || agendaQuery.isError,

        // Actions
        issueReservation: issueMutation.mutateAsync,
        returnReservation: returnMutation.mutateAsync,
        refresh: () => queryClient.invalidateQueries({ queryKey: ['dashboard'] }),
        isSyncing: queryClient.isFetching() > 0 || queryClient.isMutating() > 0,
    };
};
