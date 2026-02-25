
import React from 'react';
import { RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useIsFetching, useIsMutating } from '@tanstack/react-query';

export function SyncIndicator() {
    const isFetching = useIsFetching();
    const isMutating = useIsMutating();
    const isSyncing = isFetching > 0 || isMutating > 0;
    const isOffline = !navigator.onLine; // Basic check, ideally use a hook

    if (isOffline) {
        return (
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-muted px-3 py-1.5 rounded-full">
                <WifiOff className="w-3 h-3 text-status-danger" />
                <span>Offline</span>
            </div>
        );
    }

    return (
        <div className={cn(
            "flex items-center gap-2 text-xs font-medium transition-all duration-500 px-3 py-1.5 rounded-full",
            isSyncing ? "text-primary bg-primary/10 opacity-100" : "opacity-0"
        )}>
            <RefreshCw className={cn("w-3 h-3", isSyncing && "animate-spin")} />
            <span>Syncing...</span>
        </div>
    );
}
