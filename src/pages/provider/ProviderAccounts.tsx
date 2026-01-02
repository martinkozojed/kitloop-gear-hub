import React, { useState, useEffect } from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, Plus, Search, Building2, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
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
import { toast } from "sonner";

const ProviderAccounts = () => {
    const [accounts, setAccounts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const { provider } = useAuth();

    // Modal State
    const [modalOpen, setModalOpen] = useState(false);
    const [editingAccount, setEditingAccount] = useState<any | null>(null);

    useEffect(() => {
        if (provider?.id) {
            fetchAccounts();
        } else {
            setAccounts([]);
            setLoading(false);
        }
    }, [provider?.id]);

    const fetchAccounts = async () => {
        if (!provider?.id) return;
        setLoading(true);
        const { data, error } = await supabase
            .from('accounts')
            .select('*')
            .eq('provider_id', provider.id)
            .order('name', { ascending: true });

        if (data) setAccounts(data);
        if (error) console.error('Failed to fetch accounts', error);
        setLoading(false);
    };

    const handleCreate = () => {
        setEditingAccount(null);
        setModalOpen(true);
    };

    const handleEdit = (account: any) => {
        setEditingAccount(account);
        setModalOpen(true);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure? This will unlink all customers from this organization.')) return;

        const { error } = await supabase.from('accounts').delete().eq('id', id).eq('provider_id', provider?.id || '');
        if (error) {
            toast.error("Failed to delete");
        } else {
            toast.success("Account deleted");
            fetchAccounts();
        }
    };

    const filteredAccounts = accounts.filter(a =>
        a.name.toLowerCase().includes(search.toLowerCase()) ||
        a.contact_email?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <ProviderLayout>
            <div className="max-w-6xl mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Organizations (B2B)</h1>
                        <p className="text-muted-foreground">Manage schools, clubs, and corporate partners.</p>
                    </div>
                    <Button onClick={handleCreate}>
                        <Plus className="w-4 h-4 mr-2" />
                        New Organization
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search organizations..."
                            className="pl-9"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                </div>

                <div className="border rounded-md bg-white shadow-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Tax ID</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Updated</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
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
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No organizations found.
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
                                                        <Pencil className="w-4 h-4 mr-2" /> Edit Details
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(account.id)}>
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
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
            </div>
        </ProviderLayout>
    );
};

export default ProviderAccounts;
