import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, X, RefreshCw, AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScannerModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onScan: (decodedText: string) => void;
    title?: string;
    description?: string;
}

export function ScannerModal({ open, onOpenChange, onScan, title, description }: ScannerModalProps) {
    const { t } = useTranslation();
    const scannerRegionId = "html5qr-code-full-region";
    const [error, setError] = useState<string | null>(null);
    const [hasCameras, setHasCameras] = useState<boolean>(true);
    const [isScannerReady, setIsScannerReady] = useState(false);
    const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

    useEffect(() => {
        let isMounted = true;

        const startScanning = async () => {
            if (!open) return;
            setError(null);

            try {
                // Determine if device has cameras
                const devices = await Html5Qrcode.getCameras();
                if (devices && devices.length > 0) {
                    setHasCameras(true);
                } else {
                    setHasCameras(false);
                    setError(t('components.scanner.noCameras', { defaultValue: 'Byly nenalezeny žádné kamery.' }));
                    return;
                }

                // Initialize scanner instance
                if (!html5QrCodeRef.current) {
                    html5QrCodeRef.current = new Html5Qrcode(scannerRegionId);
                }

                const qrCodeSuccessCallback = (decodedText: string) => {
                    // Stop scanning on success and trigger callback
                    if (html5QrCodeRef.current?.isScanning) {
                        html5QrCodeRef.current.stop().then(() => {
                            onScan(decodedText);
                            onOpenChange(false);
                        }).catch(err => console.error("Error stopping scanner", err));
                    }
                };

                const qrCodeErrorCallback = (errorMessage: string) => {
                    // Only log errors, don't show to user as it's noisy (triggers on every frame without a QR code)
                    // console.log("QR Error:", errorMessage);
                };

                // Start scanner
                await html5QrCodeRef.current.start(
                    { facingMode: "environment" }, // Prefer back camera
                    {
                        fps: 10,
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0
                    },
                    qrCodeSuccessCallback,
                    qrCodeErrorCallback
                );

                if (isMounted) setIsScannerReady(true);

            } catch (err: unknown) {
                console.error("Camera access failed", err);
                if (isMounted) {
                    setError(t('components.scanner.cameraError', { defaultValue: 'Povolte přístup ke kameře v prohlížeči.' }));
                }
            }
        };

        if (open) {
            // Slight delay to ensure DOM element is ready
            setTimeout(() => {
                startScanning();
            }, 100);
        }

        return () => {
            isMounted = false;
            // Cleanup when closed
            if (html5QrCodeRef.current?.isScanning) {
                html5QrCodeRef.current.stop().catch(console.error);
            }
            setIsScannerReady(false);
        };
    }, [open, onOpenChange, onScan, t]);

    const handleClose = () => {
        if (html5QrCodeRef.current?.isScanning) {
            html5QrCodeRef.current.stop().catch(console.error);
        }
        setIsScannerReady(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        {title || t('components.scanner.title', { defaultValue: 'Naskenovat QR kód' })}
                    </DialogTitle>
                    {description && <DialogDescription>{description}</DialogDescription>}
                </DialogHeader>

                <div className="flex flex-col items-center justify-center p-4">
                    {/* The element where the scanner stream will be injected */}
                    <div
                        id={scannerRegionId}
                        className="w-full max-w-sm rounded-lg overflow-hidden border-2 border-dashed border-primary/50 relative"
                        style={{ minHeight: '300px' }}
                    >
                        {/* Placeholder text if not ready or error */}
                        {!isScannerReady && !error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground bg-muted/20">
                                <RefreshCw className="w-8 h-8 animate-spin mb-2 opacity-50" />
                                <span className="text-sm">{t('components.scanner.initializing', { defaultValue: 'Spouštím kameru...' })}</span>
                            </div>
                        )}

                        {error && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive bg-destructive/10 p-6 text-center">
                                <AlertCircle className="w-8 h-8 mb-2" />
                                <span className="font-semibold text-sm">{error}</span>
                            </div>
                        )}
                    </div>

                    <p className="text-xs text-muted-foreground mt-4 text-center">
                        {t('components.scanner.hint', { defaultValue: 'Zamiřte kameru na QR kód nebo čárový kód na vybavení. Naskenuje se automaticky.' })}
                    </p>
                </div>

                <div className="flex justify-end pt-4">
                    <Button variant="outline" onClick={handleClose}>
                        <X className="w-4 h-4 mr-2" /> Zrušit
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
