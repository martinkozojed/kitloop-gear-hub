import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Sparkles, Trash2, X } from 'lucide-react';
import { track } from '@/lib/telemetry';

interface DemoBannerProps {
    providerId: string;
    onDemoDeleted?: () => void;
}

/**
 * DemoBanner - Shows when provider has demo data loaded
 * Allows one-click deletion of all demo data
 */
export const DemoBanner: React.FC<DemoBannerProps> = ({
    providerId,
    onDemoDeleted,
}) => {
    const { t } = useTranslation();
    const [isDeleting, setIsDeleting] = useState(false);
    const [isDismissed, setIsDismissed] = useState(false);

    const handleDeleteDemo = async () => {
        if (!confirm('Opravdu chcete smazat všechna demo data? Tato akce je nevratná.')) {
            return;
        }

        setIsDeleting(true);
        try {
            // Delete all assets for this provider (soft delete)
            const { error: assetError } = await supabase
                .from('assets')
                .update({ deleted_at: new Date().toISOString() })
                .eq('provider_id', providerId);

            if (assetError) throw assetError;

            // Delete all products for this provider
            const { error: productError } = await supabase
                .from('products')
                .delete()
                .eq('provider_id', providerId);

            // Note: products might have FK constraints, so we'll ignore errors here

            track('onboarding.demo_deleted', { provider_id: providerId });
            toast.success('Demo data byla úspěšně smazána');

            onDemoDeleted?.();
            setIsDismissed(true);
        } catch (error) {
            console.error('Error deleting demo data:', error);
            toast.error('Nepodařilo se smazat demo data');
        } finally {
            setIsDeleting(false);
        }
    };

    if (isDismissed) return null;

    return (
        <Alert className="bg-amber-50 border-amber-200 mb-4">
            <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <AlertDescription className="text-amber-800">
                        <strong>Demo režim</strong> — Pracujete s ukázkovými daty.
                    </AlertDescription>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDeleteDemo}
                        disabled={isDeleting}
                        className="border-amber-300 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                    >
                        {isDeleting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-1" />
                        ) : (
                            <Trash2 className="w-4 h-4 mr-1" />
                        )}
                        Smazat demo
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsDismissed(true)}
                        className="text-amber-600 hover:text-amber-800 hover:bg-amber-100 px-2"
                    >
                        <X className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </Alert>
    );
};

export default DemoBanner;
