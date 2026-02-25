import React, { useState, useEffect } from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Building2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/ui/page-header';
import { FilterBar, SearchInput } from '@/components/ui/filter-bar';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { UpsertAccountModal } from '@/components/crm/UpsertAccountModal';
import { formatDistanceToNow } from 'date-fns';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useTranslation } from 'react-i18next';


interface Account {
    id: string;
    name: string;
    tax_id: string | null;
    contact_email: string | null;
    updated_at: string | null;
    provider_id: string;
}

const ProviderAccounts = () => {
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { provider } = useAuth();
    const { t } = useTranslation();

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<Account | null>(null);

    // Delete Confirmation State
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
    const providerId = provider?.id;

    const fetchAccounts = React.useCallback(async () => {
        if (!providerId) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('provider_id', providerId)
            .order('name', { ascending: true });

        if (data) setAccounts(data as Account[]);
        if (error) console.error('Failed to fetch accounts', error);
        setLoading(false);
    }, [providerId]);

    useEffect(() => {
        const timer = setTimeout(() => {
            if (providerId) {
                fetchAccounts();
            } else {
                setAccounts([]);
                setLoading(false);
            }
        }, 0);
        return () => clearTimeout(timer);
    }, [providerId, fetchAccounts]);

    const handleCreate = () => {
        setEditingAccount(null);
        setModalOpen(true);
    };

    const handleEdit = (account: Account) => {
        setEditingAccount(account);
        setModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setAccountToDelete(id);
        setDeleteDialogOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!accountToDelete) return;

        const { error } = await supabase.from('accounts').delete().eq('id', accountToDelete).eq('provider_id', provider?.id || '');
        if (error) {
            toast.error(t('operations.accounts.toasts.deleteError'));
        } else {
            toast.success(t('operations.accounts.toasts.deleted'));
            fetchAccounts();
        }
        setDeleteDialogOpen(false);
        setAccountToDelete(null);
    };

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.contact_email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProviderLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <PageHeader
                    title={t('operations.accounts.title')}
                    description={t('operations.accounts.subtitle')}
                    actions={
                        <Button onClick={handleCreate}>
                            <Plus className="w-4 h-4 mr-2" />
                            {t('operations.accounts.cta.new')}
                        </Button>
                    }
                />

                <FilterBar>
                    <SearchInput
                        placeholder={t('operations.accounts.search')}
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        icon={<Search className="w-4 h-4" />}
                    />
                </FilterBar>

                <div className="rounded-md border border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t('operations.accounts.table.name')}</TableHead>
                                <TableHead>{t('operations.accounts.table.taxId')}</TableHead>
                                <TableHead>{t('operations.accounts.table.contact')}</TableHead>
                                <TableHead>{t('operations.accounts.table.updated')}</TableHead>
                                <TableHead className="text-right">{t('operations.accounts.table.actions')}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredAccounts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="p-0">
                                        <EmptyState
                                            icon={Building2}
                                            title={t('operations.accounts.empty')}
                                            description={t('operations.accounts.emptyDesc')}
                                            action={{
                                                label: t('operations.accounts.cta.new'),
                                                onClick: handleCreate,
                                            }}
                                            variant="subtle"
                                        />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredAccounts.map((account) => (
                                    <TableRow key={account.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <Building2 className="w-4 h-4 text-blue-500" />
                                                {account.name}
                                            </div>
                                        </TableCell>
                                        <TableCell>{account.tax_id || '-'}</TableCell>
                                        <TableCell>{account.contact_email || '-'}</TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {account.updated_at ? formatDistanceToNow(new Date(account.updated_at), { addSuffix: true }) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm"><MoreHorizontal className="w-4 h-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleEdit(account)}>
                                                        <Pencil className="w-4 h-4 mr-2" /> {t('operations.accounts.menu.edit')}
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-status-danger" onClick={() => handleDeleteClick(account.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> {t('operations.accounts.menu.delete')}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                <UpsertAccountModal
                    open={modalOpen}
                    onOpenChange={setModalOpen}
                    accountToEdit={editingAccount}
                    onSuccess={fetchAccounts}
                />

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>{t('operations.accounts.confirm.title')}</AlertDialogTitle>
                            <AlertDialogDescription>
                                {t('operations.accounts.confirm.delete')}
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>{t('operations.accounts.confirm.cancel')}</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConfirm}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                {t('operations.accounts.confirm.confirmDelete')}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ProviderLayout>
    );
};

export default ProviderAccounts;

