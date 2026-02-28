import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatPrice } from '@/lib/availability';
import { Plus, Trash2, Tag, AlertTriangle, FileText, DollarSign, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/context/AuthContext';
import { useTranslation } from 'react-i18next';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function ReservationLineItems({ reservationId, items, onItemsChange, isEditable = true }: { reservationId: string, items: any[], onItemsChange: () => void, isEditable?: boolean }) {
    const { user } = useAuth();
    const { t } = useTranslation();
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const [type, setType] = useState('fee');
    const [description, setDescription] = useState('');
    const [amount, setAmount] = useState('');

    const getTypeIcon = (itemType: string) => {
        switch (itemType) {
            case 'discount': return <Tag className="w-4 h-4 text-emerald-500" />;
            case 'damage': return <AlertTriangle className="w-4 h-4 text-destructive" />;
            case 'fee': return <DollarSign className="w-4 h-4 text-amber-500" />;
            default: return <FileText className="w-4 h-4 text-muted-foreground" />;
        }
    };

    const getTypeLabel = (itemType: string) => {
        switch (itemType) {
            case 'discount': return 'Sleva';
            case 'damage': return 'Poškození';
            case 'fee': return 'Poplatek';
            default: return 'Jiné';
        }
    };

    const handleAdd = async () => {
        if (!description.trim() || !amount) {
            toast.error('Vyplňte prosím popis a částku.');
            return;
        }

        let numAmount = parseFloat(amount);
        if (isNaN(numAmount)) {
            toast.error('Neplatná částka.');
            return;
        }

        // Discounts should be negative
        if (type === 'discount' && numAmount > 0) {
            numAmount = -numAmount;
        } else if (type !== 'discount' && numAmount < 0) {
            // Fees and damage should be positive
            numAmount = Math.abs(numAmount);
        }

        setLoading(true);
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase.from('reservation_line_items' as any).insert({
                reservation_id: reservationId,
                type,
                description: description.trim(),
                amount: numAmount,
                created_by: user?.id
            });

            if (error) throw error;

            toast.success('Položka přidána');
            setIsAdding(false);
            setDescription('');
            setAmount('');
            setType('fee');
            onItemsChange();
        } catch (error) {
            console.error('Error adding line item:', error);
            toast.error('Nepodařilo se přidat položku');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (itemId: string) => {
        if (!confirm('Opravdu smazat tuto položku?')) return;

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await supabase.from('reservation_line_items' as any).delete().eq('id', itemId);
            if (error) throw error;

            toast.success('Položka smazána');
            onItemsChange();
        } catch (error) {
            console.error('Error deleting line item:', error);
            toast.error('Nepodařilo se smazat položku');
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Manuální položky (Ad-hoc)</h3>
                {isEditable && (
                    <Dialog open={isAdding} onOpenChange={setIsAdding}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="h-8">
                                <Plus className="w-4 h-4 mr-1" /> Přidat
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Přidat manuální položku</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Typ položky</label>
                                    <Select value={type} onValueChange={setType}>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="fee">Poplatek (např. pozdní vrácení)</SelectItem>
                                            <SelectItem value="damage">Poškození (např. chybějící díl)</SelectItem>
                                            <SelectItem value="discount">Sleva (např. omluva za zdržení)</SelectItem>
                                            <SelectItem value="custom">Jiné</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Popis</label>
                                    <Input
                                        placeholder="Např. Ztracený zámek"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={255}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Částka (Kč) {type === 'discount' && '(bude odečtena)'}</label>
                                    <Input
                                        type="number"
                                        placeholder="0"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min={type === 'discount' ? undefined : 0}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="ghost" onClick={() => setIsAdding(false)}>Zrušit</Button>
                                <Button onClick={handleAdd} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Přidat'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {items && items.length > 0 ? (
                <div className="space-y-2">
                    {items.map((item) => (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 border rounded-md bg-background">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-muted rounded-full">
                                    {getTypeIcon(item.type)}
                                </div>
                                <div>
                                    <div className="font-medium text-sm">{item.description}</div>
                                    <div className="text-xs text-muted-foreground flex gap-2">
                                        <span>{getTypeLabel(item.type)}</span>
                                        <span>•</span>
                                        <span>{new Date(item.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-4 mt-2 sm:mt-0">
                                <span className={`font-semibold ${item.amount < 0 ? 'text-emerald-600' : ''}`}>
                                    {formatPrice(item.amount)}
                                </span>
                                {isEditable && (
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="text-center py-6 border border-dashed rounded-md bg-muted/30">
                    <p className="text-sm text-muted-foreground">K rezervaci nejsou přiřazeny žádné další položky.</p>
                </div>
            )}
        </div>
    );
}
