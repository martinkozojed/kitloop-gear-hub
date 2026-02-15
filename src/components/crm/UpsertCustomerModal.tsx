import React, { useEffect, useState, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { toast } from "sonner";
import { logger } from '@/lib/logger';

interface UpsertCustomerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface AccountOption {
    id: string;
    name: string;
}

export function UpsertCustomerModal({ open, onOpenChange, onSuccess }: UpsertCustomerModalProps) {
    const { provider } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [accountId, setAccountId] = useState<string | null>(null);
    const [notes, setNotes] = useState('');
    const [status, setStatus] = useState('active');
    const [accounts, setAccounts] = useState<AccountOption[]>([]);

    const fetchAccounts = useCallback(async () => {
        if (!provider?.id) return;
        const { data, error } = await supabase
            .from('accounts')
            .select('id, name')
            .eq('provider_id', provider.id)
            .order('name');

        if (error) {
            logger.error('Failed to fetch accounts', error);
            return;
        }
        setAccounts(data || []);
    }, [provider?.id]);

    useEffect(() => {
        if (open) {
            setFullName('');
            setEmail('');
            setPhone('');
            setAccountId(null);
            setNotes('');
            setStatus('active');
            fetchAccounts();
        }
    }, [open, fetchAccounts]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!provider?.id) {
            toast.error("No provider profile");
            return;
        }
        if (!fullName.trim()) {
            toast.error("Jméno je povinné");
            return;
        }

        setLoading(true);
        try {
            const { error } = await supabase.from('customers').insert({
                provider_id: provider.id,
                full_name: fullName.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                account_id: accountId,
                status,
                notes: notes.trim() || null,
            });

            if (error) throw error;
            toast.success("Customer created");
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            logger.error('Failed to save customer', err);
            toast.error("Failed to save customer", { description: message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>New Customer</DialogTitle>
                    <DialogDescription>Vytvořte záznam zákazníka pro rychlé použití v CRM a rezervacích.</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="fullName">Jméno *</Label>
                        <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">E-mail</Label>
                            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefon</Label>
                            <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+420 ..." />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Organizace (volitelné)</Label>
                            <Select value={accountId || ''} onValueChange={(v) => setAccountId(v || null)}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Nepřiřazeno" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">Nepřiřazeno</SelectItem>
                                    {accounts.map(acc => (
                                        <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">Active</SelectItem>
                                    <SelectItem value="vip">VIP</SelectItem>
                                    <SelectItem value="inactive">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Poznámky</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Preferovaný typ vybavení, slevy, interní poznámka..." />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Zrušit</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Ukládám...' : 'Vytvořit'}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
