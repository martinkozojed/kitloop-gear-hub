import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface LogMaintenanceModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    assetIds: string[]; // Supports bulk
    onSuccess?: () => void;
}

export function LogMaintenanceModal({ open, onOpenChange, assetIds, onSuccess }: LogMaintenanceModalProps) {
    const { provider, user } = useAuth();
    const [loading, setLoading] = useState(false);

    const [type, setType] = useState<string>('inspection');
    const [priority, setPriority] = useState<string>('normal');
    const [notes, setNotes] = useState('');
    const [markMaintenance, setMarkMaintenance] = useState(true);

    const handleSubmit = async () => {
        if (!provider?.id || assetIds.length === 0) return;
        setLoading(true);

        try {
            // 1. Create Log Entries
            const logs = assetIds.map(id => ({
                asset_id: id,
                provider_id: provider.id,
                type,
                priority,
                status: 'open',
                notes: notes || null,
                created_by: user?.id
            }));

            const { error: logError } = await supabase
                .from('maintenance_log')
                .insert(logs);

            if (logError) throw logError;

            // 2. Update Asset Status (Optional)
            if (markMaintenance) {
                const { error: assetError } = await supabase
                    .from('assets')
                    .update({ status: 'maintenance' })
                    .in('id', assetIds);

                if (assetError) throw assetError;
            }

            toast.success(`Logged maintenance for ${assetIds.length} items`);
            onSuccess?.();
            onOpenChange(false);

            // Reset form
            setNotes('');
            setType('inspection');
        } catch (err: any) {
            toast.error('Failed to log maintenance', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Log Maintenance</DialogTitle>
                    <DialogDescription>
                        Record service history for {assetIds.length} item{assetIds.length !== 1 ? 's' : ''}.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select value={type} onValueChange={setType}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="inspection">Inspection</SelectItem>
                                    <SelectItem value="cleaning">Cleaning</SelectItem>
                                    <SelectItem value="repair">Repair</SelectItem>
                                    <SelectItem value="quality_hold">Quality Hold</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Priority</Label>
                            <Select value={priority} onValueChange={setPriority}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="low">Low</SelectItem>
                                    <SelectItem value="normal">Normal</SelectItem>
                                    <SelectItem value="high">High</SelectItem>
                                    <SelectItem value="critical">Critical</SelectItem>
                                    <SelectItem value="cosmetic">Cosmetic</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Notes</Label>
                        <Textarea
                            placeholder="Describe the issue or service performed..."
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="resize-none"
                            rows={3}
                        />
                    </div>

                    <div className="flex items-center space-x-2 pt-2">
                        <Switch
                            id="mark-maintenance"
                            checked={markMaintenance}
                            onCheckedChange={setMarkMaintenance}
                        />
                        <Label htmlFor="mark-maintenance" className="cursor-pointer">
                            Mark asset{assetIds.length !== 1 ? 's' : ''} as "Maintenance" status
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSubmit} disabled={loading}>
                        {loading ? 'Saving...' : 'Log & Save'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
