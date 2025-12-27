import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Assuming you have this or use standard textarea
import { supabase } from '@/lib/supabase';
import { toast } from "sonner";

interface UpsertAccountModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    accountToEdit?: any | null; // If provided, we are in Edit mode
    onSuccess: () => void;
}

export function UpsertAccountModal({ open, onOpenChange, accountToEdit, onSuccess }: UpsertAccountModalProps) {
    const [loading, setLoading] = useState(false);
    const [name, setName] = useState('');
    const [taxId, setTaxId] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [notes, setNotes] = useState('');

    useEffect(() => {
        if (open) {
            if (accountToEdit) {
                setName(accountToEdit.name || '');
                setTaxId(accountToEdit.tax_id || '');
                setContactEmail(accountToEdit.contact_email || '');
                setNotes(accountToEdit.notes || '');
            } else {
                // Reset for create mode
                setName('');
                setTaxId('');
                setContactEmail('');
                setNotes('');
            }
        }
    }, [open, accountToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No user");

            // Look up provider
            const { data: provider } = await supabase.from('providers').select('id').eq('user_id', user.id).single();
            if (!provider) throw new Error("No provider profile");

            const payload = {
                provider_id: provider.id,
                name,
                tax_id: taxId || null,
                contact_email: contactEmail || null,
                notes: notes || null,
                updated_at: new Date().toISOString()
            };

            let error;
            if (accountToEdit) {
                const { error: updateError } = await supabase
                    .from('accounts')
                    .update(payload)
                    .eq('id', accountToEdit.id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from('accounts')
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success(accountToEdit ? "Account updated" : "Organization created");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error("Failed to save account", { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{accountToEdit ? 'Edit Organization' : 'New Organization'}</DialogTitle>
                    <DialogDescription>
                        Create a B2B account for companies, schools, or clubs.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="name">Organization Name</Label>
                        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ski School A..." required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="taxId">Tax ID / IČO</Label>
                            <Input id="taxId" value={taxId} onChange={(e) => setTaxId(e.target.value)} placeholder="12345678" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Contact Email</Label>
                            <Input id="email" type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="billing@..." />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="notes">Notes</Label>
                        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Default discount, contact person..." />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Organization'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
