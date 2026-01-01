import React, { useState, useEffect } from 'react';
import ProviderLayout from "@/components/provider/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Loader2, Plus, Search, Building2, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { CustomerDetailSheet } from '@/components/crm/CustomerDetailSheet';
import { formatDistanceToNow } from 'date-fns';

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

    // Sheet State
    const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
    const [isSheetOpen, setIsSheetOpen] = useState(false);

    useEffect(() => {
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('customers')
            .select('*, accounts(name)') // Join with accounts to show org name
            .order('updated_at', { ascending: false });

        if (data) setCustomers(data);
        setLoading(false);
    };

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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
                        <p className="text-muted-foreground">Manage operational contacts and organizations.</p>
                    </div>
                    <Button onClick={() => { /* Open create modal - TODO */ }}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Customer
                    </Button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search names, emails, or companies..."
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
                                <TableHead>Status</TableHead>
                                <TableHead>Organization</TableHead>
                                <TableHead>Last Active</TableHead>
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
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <TableRow
                                        key={customer.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => handleRowClick(customer.id)}
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
                                            <Button variant="ghost" size="sm">View</Button>
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
            </div>
        </ProviderLayout>
    );
};

export default ProviderCustomers;
