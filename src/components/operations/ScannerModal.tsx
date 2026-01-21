import React, { useEffect, useRef, useState } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, ScanLine, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { track } from '@/lib/telemetry';

interface ScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (decodedText: string) => void;
}

export function ScannerModal({ open, onOpenChange, onScan }: ScannerModalProps) {
    const { t } = useTranslation();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [manualCode, setManualCode] = useState('');
    const [scannerError, setScannerError] = useState<string | null>(null);

    useEffect(() => {
        if (open) {
            // Track modal opened
            track('inventory.scan_opened', undefined, 'ScannerModal');
            setScannerError(null);

            // Small timeout to allow Dialog transition to finish roughly
            const timer = setTimeout(() => {
                const element = document.getElementById('reader');
                if (!element) return;

                // Cleanup existing if any
                if (scannerRef.current) {
                    try { scannerRef.current.clear(); } catch (e) { /* ignore */ }
                }

                // Initialize Scanner
                const scanner = new Html5QrcodeScanner(
                    "reader",
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                        disableFlip: false,
                    },
                    /* verbose= */ false
                );

                scanner.render((decodedText) => {
                    scanner.clear();
                    track('inventory.scan_success', { method: 'camera' }, 'ScannerModal');
                    onScan(decodedText);
                    onOpenChange(false);
                }, (errorMessage) => {
                    // Camera permission denied or not available
                    if (errorMessage.includes('NotAllowedError') || errorMessage.includes('NotFoundError')) {
                        setScannerError(t('scanner.errors.cameraNotAvailable'));
                        track('inventory.scan_failed', { reason: 'camera_denied' }, 'ScannerModal');
                    }
                    // Other scan errors are normal (no QR in frame) - ignore
                });

                scannerRef.current = scanner;
            }, 300);

            return () => {
                clearTimeout(timer);
                if (scannerRef.current) {
                    scannerRef.current.clear().catch(err => console.error("Failed to clear scanner", err));
                    scannerRef.current = null;
                }
            };
        }
    }, [open, t]);

    const handleManualSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualCode.trim()) return;

        track('inventory.scan_success', { method: 'manual' }, 'ScannerModal');
        onScan(manualCode.trim());
        onOpenChange(false);
        setManualCode('');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ScanLine className="w-5 h-5" />
                        {t('scanner.title')}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex flex-col gap-6">
                    {/* Scanner Viewport */}
                    <div className="relative rounded-lg overflow-hidden bg-black/5 aspect-square flex flex-col items-center justify-center border-2 border-dashed border-gray-200">
                        {scannerError ? (
                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                                <AlertCircle className="w-8 h-8 text-amber-500" />
                                <p className="text-sm text-muted-foreground">{scannerError}</p>
                                <p className="text-xs text-muted-foreground">{t('scanner.useManualEntry')}</p>
                            </div>
                        ) : (
                            <>
                                <div id="reader" className="w-full h-full"></div>
                                <p className="absolute bottom-4 text-xs text-muted-foreground bg-white/80 px-2 py-1 rounded-full pointer-events-none">
                                    {t('scanner.pointCamera')}
                                </p>
                            </>
                        )}
                    </div>

                    {/* Manual Entry Divider */}
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-background px-2 text-muted-foreground">{t('scanner.orEnterManually')}</span>
                        </div>
                    </div>

                    {/* Manual Entry Form */}
                    <form onSubmit={handleManualSubmit} className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="text"
                                placeholder={t('scanner.placeholder')}
                                aria-label={t('scanner.manualEntryLabel')}
                                value={manualCode}
                                onChange={(e) => setManualCode(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <Button type="submit" disabled={!manualCode.trim()}>
                            {t('scanner.check')}
                        </Button>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
