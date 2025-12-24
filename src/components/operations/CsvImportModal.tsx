import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Upload, AlertCircle, CheckCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

interface CsvImportModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface CsvRow {
    asset_tag: string;
    product_name: string;
    variant_name: string;
    condition_score: string;
    location: string;
    serial_number?: string; // Added optional field
    status?: string;
}

type ImportStatus = 'pending' | 'matched' | 'error';

interface PreviewRow extends CsvRow {
    importStatus: ImportStatus;
    message?: string;
    variantId?: string;
}

export function CsvImportModal({ open, onOpenChange, onSuccess }: CsvImportModalProps) {
    const { provider } = useAuth();
    const [loading, setLoading] = useState(false);
    const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Analyze CSV data against database to find matching variants
    const analyzeData = async (rows: CsvRow[]) => {
        if (!provider?.id) return;
        setIsAnalyzing(true);

        try {
            // 1. Fetch all variants for this provider to match against
            const { data: variants, error } = await supabase
                .from('product_variants')
                .select(`
          id,
          name,
          sku,
          products!inner (
            name,
            provider_id
          )
        `)
                .eq('products.provider_id', provider.id);

            if (error) throw error;

            // Create lookup map: "ProductName:VariantName" -> VariantID
            const variantMap = new Map<string, string>();
            variants?.forEach((v: any) => {
                // Handle array or object response for products
                const paramProduct = Array.isArray(v.products) ? v.products[0] : v.products;
                const productName = paramProduct?.name || '';

                // Normalize keys to lowercase for better matching
                const key = `${productName.toLowerCase().trim()}:${v.name.toLowerCase().trim()}`;
                variantMap.set(key, v.id);
            });

            // 2. Process rows
            const processed: PreviewRow[] = rows.map(row => {
                const key = `${row.product_name?.toLowerCase().trim()}:${row.variant_name?.toLowerCase().trim()}`;
                const variantId = variantMap.get(key);

                if (variantId) {
                    return { ...row, importStatus: 'matched', variantId };
                } else {
                    return { ...row, importStatus: 'error', message: 'Product/Variant not found' };
                }
            });

            setPreviewData(processed);
        } catch (err: any) {
            toast.error('Failed to analyze CSV', { description: err.message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        Papa.parse<CsvRow>(file, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    analyzeData(results.data);
                } else {
                    toast.error('CSV File appears to be empty or invalid');
                }
            },
            error: (error) => {
                toast.error('Error parsing CSV', { description: error.message });
            }
        });

        // Reset input
        event.target.value = '';
    };

    const handleImport = async () => {
        if (!provider?.id) return;

        const validRows = previewData.filter(r => r.importStatus === 'matched');
        if (validRows.length === 0) {
            toast.error('No valid rows to import');
            return;
        }

        setLoading(true);
        try {
            const payload = validRows.map(row => {
                // Map legacy 'rented' to 'active' or accept valid statuses
                const rawStatus = row.status?.toLowerCase().trim();
                let status = 'available';
                if (rawStatus === 'maintenance') status = 'maintenance';
                if (rawStatus === 'active' || rawStatus === 'rented') status = 'active';

                return {
                    provider_id: provider.id,
                    variant_id: row.variantId,
                    asset_tag: row.asset_tag,
                    serial_number: row.serial_number || '',
                    location: row.location,
                    condition_score: parseInt(row.condition_score) || 100,
                    status: status,
                };
            });

            const { error } = await supabase.from('assets').insert(payload);
            if (error) throw error;

            toast.success(`Successfully imported ${validRows.length} assets`);
            onSuccess();
            onOpenChange(false);
            setPreviewData([]);
        } catch (err: any) {
            toast.error('Import failed', { description: err.message });
        } finally {
            setLoading(false);
        }
    };

    const matchedCount = previewData.filter(r => r.importStatus === 'matched').length;
    const errorCount = previewData.filter(r => r.importStatus === 'error').length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[800px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Import Inventory (CSV)</DialogTitle>
                    <DialogDescription>
                        Upload a CSV file with columns: <code>asset_tag, product_name, variant_name, condition_score, location</code>
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-hidden flex flex-col gap-4">
                    <div className="flex items-center gap-4 p-4 border rounded-md bg-muted/20 border-dashed">
                        <Upload className="w-8 h-8 text-muted-foreground" />
                        <div className="flex-1">
                            <label className="cursor-pointer">
                                <span className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium transition-colors">
                                    Choose CSV File
                                </span>
                                <input
                                    type="file"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleFileUpload}
                                    disabled={loading || isAnalyzing}
                                />
                            </label>
                            <p className="text-xs text-muted-foreground mt-2">
                                Supported format: CSV. First row must be headers.
                            </p>
                        </div>
                        {isAnalyzing && (
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                Analyzing...
                            </div>
                        )}
                    </div>

                    {previewData.length > 0 && (
                        <div className="flex-1 flex flex-col border rounded-md overflow-hidden">
                            <div className="bg-muted px-4 py-2 text-xs font-medium flex justify-between items-center">
                                <span>Preview: {previewData.length} rows found</span>
                                <div className="flex gap-3">
                                    <span className="text-green-600 flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> {matchedCount} Valid
                                    </span>
                                    <span className="text-destructive flex items-center gap-1">
                                        <AlertCircle className="w-3 h-3" /> {errorCount} Errors
                                    </span>
                                </div>
                            </div>

                            <ScrollArea className="flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Asset Tag</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead>Variant</TableHead>
                                            <TableHead>Condition</TableHead>
                                            <TableHead>Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.map((row, idx) => (
                                            <TableRow key={idx} className={row.importStatus === 'error' ? 'bg-destructive/5' : ''}>
                                                <TableCell className="font-mono text-xs">{row.asset_tag}</TableCell>
                                                <TableCell className="text-xs truncate max-w-[150px]">{row.product_name}</TableCell>
                                                <TableCell className="text-xs">{row.variant_name}</TableCell>
                                                <TableCell className="text-xs">{row.condition_score}</TableCell>
                                                <TableCell>
                                                    {row.importStatus === 'matched' ? (
                                                        <span className="text-green-600 text-xs flex items-center gap-1">
                                                            <CheckCircle className="w-3 h-3" /> OK
                                                        </span>
                                                    ) : (
                                                        <span className="text-destructive text-xs flex items-center gap-1" title={row.message}>
                                                            <AlertCircle className="w-3 h-3" /> {row.message || 'Invalid'}
                                                        </span>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </ScrollArea>

                            {errorCount > 0 && (
                                <div className="p-3 bg-destructive/10 text-destructive text-xs border-t border-destructive/20">
                                    Warning: {errorCount} rows have errors and will be skipped. Ensure Product and Variant names match exactly.
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleImport}
                        disabled={loading || matchedCount === 0}
                        className="w-32"
                    >
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Import ${matchedCount} Items`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
