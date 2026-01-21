import React, { useState, useEffect } from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Search, Building2, User, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar, SearchInput } from '@/components/ui/filter-bar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';
import { formatDistanceToNow } from 'date-fns';
import { UpsertCustomerModal } from '@/components/crm/UpsertCustomerModal';
import { useTranslation } from 'react-i18next';

interface Customer {
    id: string;
    full_name: string;
    email: string | null;
    phone: string | null;
    status: string | null;
    updated_at: string | null;
    accounts: {
        name: string;
    } | null;
}

const ProviderCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { provider } = useAuth();
    const { t } = useTranslation();
    const [createOpen, setCreateOpen] = useState(false);

    // Sheet State
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    const fetchCustomers = React.useCallback(async () => {
        if (!provider?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*, accounts(name)') // Join with accounts to show org name
            .eq('provider_id', provider?.id || '')
            .order('updated_at', { ascending: false });

        if (data) setCustomers(data);
        if (error) console.error('Failed to fetch customers', error);
        setLoading(false);
    }, [provider?.id]);

    useEffect(() => {
        if (provider?.id) {
            fetchCustomers();
        } else {
            setCustomers([]);
            setLoading(false);
        }
    }, [provider?.id, fetchCustomers]);

    const handleRowClick = (id: string) => {
        setSelectedCustomerId(id);
        setIsSheetOpen(true);
    };

    const filteredCustomers = customers.filter(c =>
        c.full_name.toLowerCase().includes(search.toLowerCase()) ||
        c.email?.toLowerCase().includes(search.toLowerCase()) ||
        c.accounts?.name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProviderLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <PageHeader
                    title={t('operations.crm.title')}
                    description={t('operations.crm.subtitle')}
                    actions={
                        <Button onClick={() => setCreateOpen(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('operations.crm.cta.add')}
                        </Button>
                    }
                />

                <FilterBar>
                    <SearchInput
                        placeholder={t('operations.crm.search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                </FilterBar>

                <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>{t('operations.crm.table.name')}</TableHead>
                                <TableHead>{t('operations.crm.table.status')}</TableHead>
                                <TableHead>{t('operations.crm.table.organization')}</TableHead>
                                <TableHead>{t('operations.crm.table.lastActive')}</TableHead>
                                <TableHead className="text-right">{t('operations.crm.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={Users}
                                            title={t('operations.crm.empty')}
                                            description={t('operations.crm.emptyDesc')}
                                            action={{
                                                label: t('operations.crm.cta.add'),
                                                onClick: () => setCreateOpen(true),
                                            }}
                                            variant="subtle"
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <TableRow
                                        key={customer.id}
                                        className="cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                                        onClick={() => handleRowClick(customer.id)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleRowClick(customer.id);
                                            }
                                        }}
                                        tabIndex={0}
                                        role="button"
                                        aria-label={t('operations.crm.openCustomerDetail', { name: customer.full_name })}
                                    >
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-9 w-9">
                                                    <AvatarFallback className="bg-primary/10 text-primary">
                                                        {customer.full_name.substring(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{customer.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{customer.email || customer.phone}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={customer.status === 'vip' ? 'default' : 'outline'} className="capitalize">
                                                {customer.status || 'Active'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {customer.accounts ? (
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>{customer.accounts.name}</span>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {customer.updated_at ? formatDistanceToNow(new Date(customer.updated_at), { addSuffix: true }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">{t('operations.crm.view')}</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <CustomerDetailSheet
                    customerId={selectedCustomerId}
                    open={isSheetOpen}
                    onOpenChange={setIsSheetOpen}
                    onUpdate={fetchCustomers}
                />

                <UpsertCustomerModal
                    open={createOpen}
                    onOpenChange={setCreateOpen}
                    onSuccess={fetchCustomers}
                />
            </div>
        </ProviderLayout>
    );
};

export default ProviderCustomers;

