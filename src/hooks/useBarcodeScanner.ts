import { useCallback, useRef } from 'react';

interface UseBarcodeScannerOptions {
    onScan: (barcode: string) => void;
    enabled?: boolean;
    timeoutMs?: number;
}

/**
 * A hook to handle HID barcode scanners. 
 * It expects to be attached to a specific DOM element's `onKeyDown` handler
 * rather than the global `window` to prevent unintended captures.
 */
export function useBarcodeScanner({ onScan, enabled = true, timeoutMs = 50 }: UseBarcodeScannerOptions) {
    const bufferRef = useRef('');
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
        if (!enabled) return;

        // If the user is typing into a text area, we don't want to swallow their input
        // However, if it's a fast scanner, it might still build up. 
        // We'll trust the timeout to differentiate a human from a scanner.
        const target = e.target as HTMLElement;
        const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

        // Ignore modifier keys
        if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') {
            return;
        }

        // If 'Enter' is pressed and we have a buffer, trigger the scan
        if (e.key === 'Enter' && bufferRef.current.length > 0) {
            // Only prevent default if we're fairly confident it's a barcode (e.g. > 3 chars)
            if (bufferRef.current.length > 3) {
                e.preventDefault();
                onScan(bufferRef.current);
                bufferRef.current = '';
                if (timerRef.current) clearTimeout(timerRef.current);
                return;
            }
        }

        // Only accept single character keys to build the barcode
        if (e.key.length === 1) {
            // Start building the buffer
            bufferRef.current += e.key;

            // Reset the buffer if typing is too slow (human vs scanner)
            if (timerRef.current) clearTimeout(timerRef.current);
            timerRef.current = setTimeout(() => {
                // If it's just human typing, let it clear.
                bufferRef.current = '';
            }, timeoutMs);
        }
    }, [enabled, onScan, timeoutMs]);

    return {
        handleKeyDown
    };
}
