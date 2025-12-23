import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import ProviderLayout from '@/components/provider/ProviderLayout';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Download, Upload, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Papa, { ParseError, ParseResult } from 'papaparse';
import {
  getErrorCode,
  getErrorMessage,
  isFetchError,
  isSupabaseConstraintError,
} from '@/lib/error-utils';

interface CsvRow {
  name?: string;
  category?: string;
  description?: string;
  price_per_day?: string | number;
  quantity_total?: string | number;
  condition?: string;
  sku?: string;
  location?: string;
  notes?: string;
}

interface ImportProgress {
  current: number;
  total: number;
}

const InventoryImport = () => {
  const { provider } = useAuth();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<CsvRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<ImportProgress>({ current: 0, total: 0 });

  const downloadTemplate = () => {
    const template = [
      'name,category,description,price_per_day,quantity_total,condition,sku,location,notes'
    ].join('\n');

    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kitloop_inventory_template.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Template downloaded');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    // Reset state
    setParsedData([]);
    setValidationErrors([]);

    // Validate file type
    if (!uploadedFile.name.endsWith('.csv')) {
      toast.error('Neplatný formát souboru', {
        description: 'Nahrajte prosím CSV soubor (.csv)'
      });
      return;
    }

    // Validate file size (max 5MB)
    if (uploadedFile.size > 5 * 1024 * 1024) {
      toast.error('Soubor je příliš velký', {
        description: 'Maximální velikost je 5MB'
      });
      return;
    }

    console.log('📤 Parsing CSV file:', uploadedFile.name);
    setFile(uploadedFile);

    Papa.parse<CsvRow>(uploadedFile, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      encoding: 'UTF-8', // Support Czech characters
      complete: (results: ParseResult<CsvRow>) => {
        console.log('✅ Parsed CSV:', results.data.length, 'rows');

        if (results.data.length === 0) {
          toast.error('Prázdný soubor', {
            description: 'CSV soubor neobsahuje žádná data'
          });
          return;
        }

        // Check for required columns
        const firstRow = results.data[0] ?? {};
        const requiredColumns = ['name', 'category', 'price_per_day'];
        const missingColumns = requiredColumns.filter((col) => !(col in firstRow));

        if (missingColumns.length > 0) {
          toast.error('Chybí sloupce v CSV', {
            description: `Povinné sloupce: ${missingColumns.join(', ')}`
          });
          setValidationErrors([
            `Chybí povinné sloupce: ${missingColumns.join(', ')}`,
            'Stáhněte si šablonu a zkontrolujte formát CSV'
          ]);
          return;
        }

        setParsedData(results.data);
        validateData(results.data);
      },
      error: (error: Error) => {
        console.error('❌ CSV parse error:', error);
        const message = getErrorMessage(error);

        if (message.includes('encoding')) {
          toast.error('Chyba kódování', {
            description: 'Soubor musí být v UTF-8 kódování. Uložte CSV jako UTF-8.'
          });
        } else {
          toast.error('Chyba při čtení CSV', {
            description: message || 'Zkontrolujte formát souboru'
          });
        }
      },
    });
  };

  const validateData = (data: CsvRow[]) => {
    console.log('🔍 Validating data...');
    const errors: string[] = [];
    const skuSet = new Set<string>();

    // Valid categories from our constants
    const validCategories = ['ferraty', 'lezeni', 'zimni', 'skialpinismus', 'camping', 'cyklo', 'horolezectvi', 'bezky'];
    const validConditions = ['new', 'good', 'fair', 'poor'];

    data.forEach((row, index) => {
      const rowNum = index + 2; // +2 because row 1 is header, and index starts at 0
      const priceValue =
        typeof row.price_per_day === 'number'
          ? row.price_per_day
          : parseFloat((row.price_per_day ?? '').toString());
      const quantityValue =
        typeof row.quantity_total === 'number'
          ? row.quantity_total
          : parseInt((row.quantity_total ?? '').toString(), 10);

      // Required fields
      if (!row.name || typeof row.name !== 'string' || !row.name.trim()) {
        errors.push(`Řádek ${rowNum}: Název je povinný`);
      }

      if (!row.category) {
        errors.push(`Řádek ${rowNum}: Kategorie je povinná`);
      } else if (!validCategories.includes(row.category)) {
        errors.push(`Řádek ${rowNum}: Neplatná kategorie "${row.category}". Povolené: ${validCategories.join(', ')}`);
      }

      if (!row.price_per_day || Number.isNaN(priceValue) || priceValue <= 0) {
        errors.push(`Řádek ${rowNum}: Cena musí být číslo větší než 0`);
      }

      // Optional but validated fields
      if (
        row.quantity_total &&
        (Number.isNaN(quantityValue) || quantityValue < 1)
      ) {
        errors.push(`Řádek ${rowNum}: Množství musí být číslo minimálně 1`);
      }

      if (row.condition && !validConditions.includes(row.condition)) {
        errors.push(`Řádek ${rowNum}: Neplatný stav "${row.condition}". Povolené: ${validConditions.join(', ')}`);
      }

      // Check for duplicate SKUs in CSV
      if (row.sku) {
        if (skuSet.has(row.sku)) {
          errors.push(`Řádek ${rowNum}: Duplikátní SKU "${row.sku}" v CSV`);
        } else {
          skuSet.add(row.sku);
        }
      }

      // Check for very long strings
      if (row.name && row.name.length > 200) {
        errors.push(`Řádek ${rowNum}: Název je příliš dlouhý (max 200 znaků)`);
      }

      if (row.description && row.description.length > 2000) {
        errors.push(`Řádek ${rowNum}: Popis je příliš dlouhý (max 2000 znaků)`);
      }
    });

    console.log(errors.length === 0 ? '✅ Validation passed' : `⚠️ ${errors.length} validation errors`);
    setValidationErrors(errors);
  };

  const handleImport = async () => {
    if (validationErrors.length > 0) {
      toast.error('Opravte chyby validace', {
        description: 'Před importem opravte všechny chyby uvedené níže.'
      });
      return;
    }

    if (!provider?.id) {
      toast.error('Chyba', {
        description: 'Nenalezen profil poskytovatele.'
      });
      return;
    }

    setImporting(true);
    setImportProgress({ current: 0, total: parsedData.length });
    console.log('📥 Importing', parsedData.length, 'items...');

    try {
      const itemsToInsert = parsedData.map((row) => {
        const price =
          typeof row.price_per_day === 'number'
            ? row.price_per_day
            : parseFloat((row.price_per_day ?? '').toString());

        const rawQuantity =
          typeof row.quantity_total === 'number'
            ? row.quantity_total
            : parseInt((row.quantity_total ?? '').toString(), 10);

        const safeQuantity =
          Number.isFinite(rawQuantity) && rawQuantity > 0 ? rawQuantity : 1;

        return {
          provider_id: provider.id,
          name: row.name?.trim() || null,
          category: row.category || null,
          description: row.description?.trim() || null,
          price_per_day: Number.isFinite(price) ? price : 0,
          quantity_total: safeQuantity,
          quantity_available: safeQuantity,
          condition: row.condition || 'good',
          sku: row.sku?.trim() || null,
          location: row.location?.trim() || provider.location || null,
          notes: row.notes?.trim() || null,
          active: true,
          item_state: 'available',
        };
      });

      console.log('Inserting', itemsToInsert.length, 'items');

      // Import in batches of 10 for progress feedback
      const batchSize = 10;
      const batches = [];
      for (let i = 0; i < itemsToInsert.length; i += batchSize) {
        batches.push(itemsToInsert.slice(i, i + batchSize));
      }

      let successCount = 0;
      const failedItems: string[] = [];

      for (let i = 0; i < batches.length; i++) {
        const batch = batches[i];

        const { data, error } = await supabase
          .from('gear_items')
          .insert(batch)
          .select();

        if (error) {
          console.error(`❌ Batch ${i + 1} error:`, error);
          batch.forEach((item) => failedItems.push(item.name ?? 'Neznámá položka'));
        } else {
          successCount += data?.length || 0;
        }

        const processed = Math.min((i + 1) * batchSize, parsedData.length);
        setImportProgress({ current: processed, total: parsedData.length });
      }

      setImportProgress({ current: parsedData.length, total: parsedData.length });

      if (failedItems.length > 0) {
        toast.warning(`Import částečně úspěšný`, {
          description: `${successCount} úspěšných, ${failedItems.length} selhalo`
        });
      } else {
        console.log('✅ Import successful:', successCount, 'items created');
        toast.success(`Import dokončen`, {
          description: `Úspěšně naimportováno ${successCount} položek.`
        });
      }

      // Wait a moment to show 100% progress
      await new Promise(resolve => setTimeout(resolve, 500));
      navigate('/provider/inventory');
    } catch (error) {
      console.error('💥 Unexpected import error:', error);

      const errorCode = getErrorCode(error);

      if (!errorCode && !isSupabaseConstraintError(error)) {
        if (isFetchError(error)) {
          toast.error('Chyba sítě', {
            description: 'Nelze se připojit k serveru.'
          });
        } else {
          toast.error('Neočekávaná chyba', {
            description: 'Zkuste to znovu nebo kontaktujte podporu.'
          });
        }
      }
    } finally {
      setImporting(false);
      setImportProgress({ current: 0, total: 0 });
    }
  };

  return (
    <ProviderLayout>
      <div className="max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-4">
          <Link to="/provider/inventory">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inventory
          </Link>
        </Button>

        <h1 className="text-2xl font-bold mb-6">Bulk Import from CSV</h1>

        <div className="space-y-6">
          {/* Step 1: Download Template */}
          <Card>
            <CardHeader>
              <CardTitle>Step 1: Download Template</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Download the CSV template, fill it with your inventory data, and upload it back.
              </p>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download CSV Template
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Upload File */}
          <Card>
            <CardHeader>
              <CardTitle>Step 2: Upload CSV</CardTitle>
            </CardHeader>
            <CardContent>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
              />
              {file && (
                <p className="text-sm text-muted-foreground mt-2">
                  Selected: {file.name}
                </p>
              )}
            </CardContent>
          </Card>

          {/* Step 3: Preview & Validation */}
          {parsedData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Preview ({parsedData.length} items)</CardTitle>
              </CardHeader>
              <CardContent>
                {validationErrors.length > 0 && (
                  <div className="bg-red-50 p-4 rounded-lg mb-4">
                    <h3 className="font-semibold text-red-800 mb-2">Validation Errors:</h3>
                    <ul className="list-disc list-inside text-red-600 text-sm space-y-1">
                      {validationErrors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left p-2 border-b">Name</th>
                        <th className="text-left p-2 border-b">Category</th>
                        <th className="text-left p-2 border-b">Price</th>
                        <th className="text-left p-2 border-b">Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedData.slice(0, 5).map((row, i) => (
                        <tr key={i} className="border-b">
                          <td className="p-2">{row.name}</td>
                          <td className="p-2">{row.category}</td>
                          <td className="p-2">{row.price_per_day} Kč</td>
                          <td className="p-2">{row.quantity_total}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {parsedData.length > 5 && (
                    <p className="text-gray-500 mt-2 text-sm">
                      ...and {parsedData.length - 5} more items
                    </p>
                  )}
                </div>

                <div className="mt-4 space-y-3">
                  {importing && importProgress.total > 0 && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Importování...</span>
                        <span>{importProgress.current} / {importProgress.total}</span>
                      </div>
                      <Progress
                        value={(importProgress.current / importProgress.total) * 100}
                        className="h-2"
                      />
                    </div>
                  )}
                  <Button
                    onClick={handleImport}
                    disabled={importing || validationErrors.length > 0}
                    className="w-full"
                  >
                    {importing ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importování... ({importProgress.current}/{importProgress.total})
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Importovat {parsedData.length} položek
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
};

export default InventoryImport;
